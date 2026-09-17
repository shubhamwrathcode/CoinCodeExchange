import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import FastImage from "react-native-fast-image";
import Toast from "react-native-simple-toast";
import {
  AppSafeAreaView,
  AppText,
  BOLD,
  FOURTEEN,
  SEMI_BOLD,
  SIXTEEN,
  TWELVE,
  EIGHTEEN,
  FIFTEEN,
  MEDIUM,
} from "../../shared";
import { colors } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";
import NavigationService from "../../navigation/NavigationService";
import { back_ic, downIcon } from "../../helper/ImageAssets";
import { appOperation } from "../../appOperation";
import ToggleSwitch from "../../common/ToggleSwitch";
import { Toolbar } from "../../common";
import { fontFamilyMedium } from "../../theme/typography";

const ALERT_PREFS_KEY = "agce_alert_preferences";

const SYSTEM_TOGGLES = [
  { id: "account", label: "Account Notifications" },
  { id: "asset", label: "Asset Management" },
  { id: "trade", label: "Trade" },
  { id: "earn", label: "Earn" },
  { id: "copy", label: "Copy Trading" },
  { id: "other", label: "Other" },
];

const EXTRA_SECTIONS = [
  { id: "activities", title: "Activities", keys: [{ id: "a1", label: "Activity summary" }, { id: "a2", label: "Device alerts" }] },
  { id: "newlyListed", title: "Newly Listed", keys: [{ id: "n1", label: "New listings" }, { id: "n2", label: "Listing reminders" }] },
  { id: "agcePay", title: "AGCE Pay", keys: [{ id: "p1", label: "Payment updates" }, { id: "p2", label: "Security alerts" }] },
  { id: "market", title: "Market Alerts", keys: [{ id: "m1", label: "Price alerts" }, { id: "m2", label: "Volatility" }] },
  { id: "moments", title: "Moments", keys: [{ id: "mo1", label: "Mentions" }, { id: "mo2", label: "Replies" }] },
  { id: "prediction", title: "Prediction", keys: [{ id: "pr1", label: "Prediction outcomes" }, { id: "pr2", label: "Market events" }] },
];

const defaultAlertState = () => {
  const system = SYSTEM_TOGGLES.reduce((acc, { id }) => {
    acc[id] = true;
    return acc;
  }, {});
  const extras = {};
  EXTRA_SECTIONS.forEach((sec) => {
    extras[sec.id] = sec.keys.reduce((acc, k) => {
      acc[k.id] = true;
      return acc;
    }, {});
  });
  return { system, ...extras };
};

function mergeAlertChannel(patch) {
  const base = defaultAlertState();
  if (!patch || typeof patch !== "object") return base;
  const out = { ...base };
  Object.keys(base).forEach((k) => {
    if (typeof base[k] === "object" && base[k] !== null) {
      out[k] = { ...base[k], ...(patch[k] || {}) };
    }
  });
  return out;
}

const UI_SYSTEM_TO_API = {
  account: "accountNotifications",
  asset: "assetManagement",
  trade: "trade",
  earn: "earn",
  copy: "copyTrading",
  other: "other",
};

function truthyAlertFlag(v) {
  return v === true || v === 1 || v === "true" || v === "1";
}

function readApiAlertSubdoc(root, ...aliases) {
  if (!root || typeof root !== "object") return {};
  for (const a of aliases) {
    const o = root[a];
    if (o && typeof o === "object" && !Array.isArray(o)) return o;
  }
  return {};
}

function apiAlertChannelToUIPrefs(apiSlice) {
  const base = defaultAlertState();
  if (!apiSlice || typeof apiSlice !== "object") return base;

  const sn = apiSlice.systemNotifications;
  if (sn && typeof sn === "object") {
    SYSTEM_TOGGLES.forEach(({ id }) => {
      const ak = UI_SYSTEM_TO_API[id];
      base.system[id] = truthyAlertFlag(sn[ak]);
    });
  }

  const act = readApiAlertSubdoc(apiSlice, "activities");
  base.activities.a1 = truthyAlertFlag(act.activitySummary);
  base.activities.a2 = truthyAlertFlag(act.deviceAlert);

  const nl = readApiAlertSubdoc(apiSlice, "newListed", "newlyListed");
  base.newlyListed.n1 = truthyAlertFlag(nl.newListings);
  base.newlyListed.n2 = truthyAlertFlag(nl.listingReminder);

  const ag = readApiAlertSubdoc(apiSlice, "agcePlay", "agcePay");
  base.agcePay.p1 = truthyAlertFlag(ag.paymentUpdates);
  base.agcePay.p2 = truthyAlertFlag(ag.secirtyAlerts ?? ag.securityAlerts);

  const ma = readApiAlertSubdoc(apiSlice, "marketAlerts", "market");
  base.market.m1 = truthyAlertFlag(ma.priceAlerts);
  base.market.m2 = truthyAlertFlag(ma.volatility);

  const mom = readApiAlertSubdoc(apiSlice, "moments");
  base.moments.mo1 = truthyAlertFlag(mom.mentions);
  base.moments.mo2 = truthyAlertFlag(mom.replies);

  const pr = readApiAlertSubdoc(apiSlice, "prediction");
  base.prediction.pr1 = truthyAlertFlag(pr.predictionOutcomes);
  base.prediction.pr2 = truthyAlertFlag(pr.marketEvents);

  return base;
}

function uiPrefsToApiAlertChannel(ui) {
  const u = mergeAlertChannel(ui);
  const sn = {};
  SYSTEM_TOGGLES.forEach(({ id }) => {
    sn[UI_SYSTEM_TO_API[id]] = !!u.system[id];
  });
  return {
    systemNotifications: sn,
    activities: {
      activitySummary: !!u.activities.a1,
      deviceAlert: !!u.activities.a2,
    },
    newListed: {
      newListings: !!u.newlyListed.n1,
      listingReminder: !!u.newlyListed.n2,
    },
    agcePlay: {
      paymentUpdates: !!u.agcePay.p1,
      secirtyAlerts: !!u.agcePay.p2,
    },
    marketAlerts: {
      priceAlerts: !!u.market.m1,
      volatility: !!u.market.m2,
    },
    moments: {
      mentions: !!u.moments.mo1,
      replies: !!u.moments.mo2,
    },
    prediction: {
      predictionOutcomes: !!u.prediction.pr1,
      marketEvents: !!u.prediction.pr2,
    },
  };
}

function alertSettingsPickData(res) {
  if (!res || typeof res !== "object") return null;
  let inner = res.data;
  if (!inner || typeof inner !== "object") return null;
  if (
    inner.data &&
    typeof inner.data === "object" &&
    inner.data.messages &&
    typeof inner.data.messages === "object"
  ) {
    return inner.data;
  }
  if (
    inner.messages &&
    typeof inner.messages === "object" &&
    !Array.isArray(inner.messages) &&
    inner.email &&
    typeof inner.email === "object"
  ) {
    return { messages: inner.messages, email: inner.email };
  }
  return null;
}

const DirectMessageManagement = () => {
  const { colors: themeColors, isDark } = useTheme();
  const [tab, setTab] = useState("message");
  const [expanded, setExpanded] = useState("system");
  const [prefs, setPrefs] = useState({ message: defaultAlertState(), email: defaultAlertState() });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await appOperation.customer.get_alert_settings_setting();
        if (cancelled) return;
        if (res?.success === false && res?.message) {
          Toast.showWithGravity(res.message, Toast.SHORT, Toast.BOTTOM);
        }
        const pair = alertSettingsPickData(res);
        if (!pair) return;
        const merged = {
          message: mergeAlertChannel(apiAlertChannelToUIPrefs(pair.messages)),
          email: mergeAlertChannel(apiAlertChannelToUIPrefs(pair.email)),
        };
        setPrefs(merged);
      } catch (err) {
        console.log("Error fetching alert settings", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next) => {
    setPrefs(next);

    const body = {
      messages: uiPrefsToApiAlertChannel(next.message),
      email: uiPrefsToApiAlertChannel(next.email),
    };

    try {
      const res = await appOperation.customer.update_alert_settings_setting(body);
      const ok = res?.success === true || res?.success === 1;
      if (ok) {
        Toast.showWithGravity(res?.message || "Alert settings updated successfully.", Toast.SHORT, Toast.BOTTOM);
      } else {
        Toast.showWithGravity(res?.message || "Could not save alert settings.", Toast.SHORT, Toast.BOTTOM);
      }
    } catch (err) {
      console.log("Error updating alert settings", err);
      Toast.showWithGravity("Failed to save settings.", Toast.SHORT, Toast.BOTTOM);
    }
  }, []);

  const toggleSystem = (id) => {
    const channel = tab === "message" ? "message" : "email";
    const next = {
      ...prefs,
      [channel]: {
        ...prefs[channel],
        system: { ...prefs[channel].system, [id]: !prefs[channel].system[id] },
      },
    };
    persist(next);
  };

  const toggleExtra = (sectionId, keyId) => {
    const channel = tab === "message" ? "message" : "email";
    const next = {
      ...prefs,
      [channel]: {
        ...prefs[channel],
        [sectionId]: {
          ...prefs[channel][sectionId],
          [keyId]: !prefs[channel][sectionId][keyId],
        },
      },
    };
    persist(next);
  };

  const sections = useMemo(() => [{ id: "system", title: "System Notifications", keys: SYSTEM_TOGGLES }, ...EXTRA_SECTIONS], []);

  const channel = tab === "message" ? "message" : "email";

  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background, flex: 1 }}>
      {/* Header */}
      <Toolbar isSecond title="Direct Message Management" style={{ width: '85%', }} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={[styles.card, { backgroundColor: "transparent" }]}>
          {/* Tabs */}
          <View style={[styles.tabsWrapper]}>
            {["message", "email"].map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={styles.tab}
              >
                <AppText
                  weight={SEMI_BOLD}
                  type={SIXTEEN}
                  style={{ color: tab === t ? themeColors.text : themeColors.secondaryText, textTransform: "capitalize" }}
                >
                  {t === "message" ? "Messages" : "Email"}
                </AppText>
                {tab === t && <View style={[styles.activeIndicator, { backgroundColor: themeColors.button }]} />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Accordion */}
          <View style={{ gap: 10, marginTop: 10 }}>
            {sections.map((sec, index) => {
              const isOpen = expanded === sec.id;
              const isLast = index === sections.length - 1;
              return (
                <View key={sec.id} style={{ borderBottomWidth: isLast ? 0 : 1, borderBottomColor: themeColors.border }}>
                  <TouchableOpacity
                    style={styles.accHead}
                    onPress={() => setExpanded(isOpen ? "" : sec.id)}
                    activeOpacity={0.7}
                  >
                    <AppText type={FIFTEEN} weight={SEMI_BOLD}>{sec.title}</AppText>
                    <FastImage
                      source={downIcon}
                      style={{ width: 12, height: 12, transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }}
                      tintColor={themeColors.secondaryText}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>

                  {isOpen && (
                    <View style={styles.accBody}>
                      {sec.id === "system"
                        ? sec.keys.map((row) => (
                          <View key={row.id} style={styles.toggleRow}>
                            <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText, fontFamily: fontFamilyMedium }}>{row.label}</AppText>
                            <ToggleSwitch
                              value={!!prefs[channel]?.system?.[row.id]}
                              onValueChange={() => toggleSystem(row.id)}
                              isDark={isDark}
                            />
                          </View>
                        ))
                        : sec.keys.map((row) => (
                          <View key={row.id} style={styles.toggleRow}>
                            <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText, fontFamily: fontFamilyMedium }}>{row.label}</AppText>
                            <ToggleSwitch
                              value={!!prefs[channel]?.[sec.id]?.[row.id]}
                              onValueChange={() => toggleExtra(sec.id, row.id)}
                              isDark={isDark}
                            />
                          </View>
                        ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 10,
    paddingBottom: 10,
    overflow: "hidden",
  },
  tabsWrapper: {
    flexDirection: "row",
    paddingHorizontal: 10,
    gap: 24,
  },
  tab: {
    paddingVertical: 14,
    alignItems: "center",
  },
  activeIndicator: {
    height: 3,
    width: 24,
    borderRadius: 2,
    marginTop: 6,
    position: "absolute",
    bottom: 4,
  },
  accHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  accBody: {
    paddingHorizontal: 10,
    paddingBottom: 16,
    gap: 20,
    marginTop: 10
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});

export default DirectMessageManagement;
