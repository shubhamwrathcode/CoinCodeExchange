import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { AppSafeAreaView, AppText, Toolbar, SEMI_BOLD, MEDIUM } from '../../shared';
import { colors } from '../../theme/colors';
import { universalPaddingHorizontalHigh, universalPaddingTop } from '../../theme/dimens';
import { appOperation } from '../../appOperation';
import Toast from 'react-native-simple-toast';
import { useTheme } from '../../hooks/useTheme';

const CHANNEL_VALUES = ["always", "offline_only", "never"];
const DISPLAY_VALUES = ["until_finished", "closed_once", "important_only"];

const DEFAULT_NOTIFICATION_SETTINGS = {
  email_notification: "offline_only",
  short_message: "offline_only",
  notification_display: "closed_once",
};

const CHANNEL_OPTIONS = [
  {
    value: "always",
    label: "Notify regardless if I was online or not",
    tag: "(Recommended)",
    tagClass: { color: colors.green },
  },
  {
    value: "offline_only",
    label: "Only notify when I'm offline",
    tag: null,
  },
  {
    value: "never",
    label: "Do not notify, neither online or offline",
    tag: null,
  },
];

const NOTIFICATION_DISPLAY_OPTIONS = [
  {
    value: "until_finished",
    label: "Display until the task is finished",
    tag: "(Recommended)",
    tagClass: { color: colors.green },
  },
  {
    value: "closed_once",
    label: "Notices closed by you will not be displayed again",
    tag: null,
  },
  {
    value: "important_only",
    label: "Never display notices of less importance",
    tag: "(Warning: you may miss notices)",
    tagClass: { color: colors.red },
  },
];

const RadioGroup = ({ options, value, onChange, disabled, themeColors }: any) => {
  return (
    <View style={styles.radioGroup}>
      {options.map((opt: any) => {
        const isSelected = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.radioOption, disabled && styles.disabledOption]}
            onPress={() => !disabled && onChange(opt.value)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <View style={[styles.radioOuterCircle, { borderColor: themeColors.secondaryText }, isSelected && { borderColor: themeColors.text }]}>
              {isSelected && <View style={[styles.radioInnerCircle, { backgroundColor: themeColors.text }]} />}
            </View>
            <View style={styles.radioTextContainer}>
              <AppText weight={MEDIUM} style={[styles.radioLabel, { color: themeColors.text }]}>{opt.label}</AppText>
              {opt.tag ? (
                <AppText style={[styles.radioTag, opt.tagClass || {}]}>
                  {` ${opt.tag}`}
                </AppText>
              ) : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const NotificationSettings = () => {
  const { colors: themeColors, isDark } = useTheme();
  const [settings, setSettings] = useState({ ...DEFAULT_NOTIFICATION_SETTINGS });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchSettings = async () => {
      try {
        const res: any = await appOperation.customer.get_notification_settings_setting();
        if (cancelled) return;

        let raw = res?.data;
        // In case the response wraps data
        if (res?.data?.data && typeof res.data.data === 'object') {
          raw = res.data.data;
        }

        const d = raw && typeof raw === "object" ? raw : {};
        const email = CHANNEL_VALUES.includes(d.email_notification)
          ? d.email_notification
          : DEFAULT_NOTIFICATION_SETTINGS.email_notification;
        const shortMsg = CHANNEL_VALUES.includes(d.short_message)
          ? d.short_message
          : DEFAULT_NOTIFICATION_SETTINGS.short_message;
        const display = DISPLAY_VALUES.includes(d.notification_display)
          ? d.notification_display
          : DEFAULT_NOTIFICATION_SETTINGS.notification_display;

        setSettings({
          email_notification: email,
          short_message: shortMsg,
          notification_display: display,
        });
      } catch (err) {
        if (!cancelled) setSettings({ ...DEFAULT_NOTIFICATION_SETTINGS });
      } finally {
        if (!cancelled) setHydrated(true);
      }
    };
    fetchSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = useCallback((field: string, value: string) => {
    setSettings((prev) => {
      const next = { ...prev, [field]: value };

      appOperation.customer.update_notification_settings_setting(next)
        .then((res: any) => {
          if (res?.success === true) {
            Toast.showWithGravity(res?.message || "Notification settings saved.", Toast.SHORT, Toast.BOTTOM);
          } else if (res?.success === false) {
            Toast.showWithGravity(res?.message || "Could not save notification settings.", Toast.LONG, Toast.BOTTOM);
          }
        })
        .catch(() => {
          Toast.showWithGravity("Failed to save settings. Please try again.", Toast.LONG, Toast.BOTTOM);
        });

      return next;
    });
  }, []);

  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background }}>
      <Toolbar isSecond title="Notification Settings" style={{ width: "72%", backgroundColor: "transparent" }} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {!hydrated ? (
          <ActivityIndicator size="large" color={themeColors.text} style={styles.loader} />
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: isDark ? colors.newThemeColor : colors.white, borderColor: isDark ? colors.themeElevationColor : colors.iconBgColor }]}>
              <AppText weight={SEMI_BOLD} style={[styles.cardTitle, { color: themeColors.text }]}>Asset change notice</AppText>
              <AppText style={[styles.infoText, { color: themeColors.secondaryText }]}>
                We will notify you through email or short message when there is a deposit.
              </AppText>
            </View>

            <View style={[styles.card, { backgroundColor: isDark ? colors.newThemeColor : colors.white, borderColor: isDark ? colors.themeElevationColor : colors.iconBgColor }]}>
              <AppText weight={SEMI_BOLD} style={[styles.cardTitle, { color: themeColors.text }]}>Email notification</AppText>
              <RadioGroup
                options={CHANNEL_OPTIONS}
                value={settings.email_notification}
                onChange={(v: string) => handleChange("email_notification", v)}
                disabled={!hydrated}
                themeColors={themeColors}
              />
            </View>

            <View style={[styles.card, { backgroundColor: isDark ? colors.newThemeColor : colors.white, borderColor: isDark ? colors.themeElevationColor : colors.iconBgColor }]}>
              <AppText weight={SEMI_BOLD} style={[styles.cardTitle, { color: themeColors.text }]}>Short message</AppText>
              <RadioGroup
                options={CHANNEL_OPTIONS}
                value={settings.short_message}
                onChange={(v: string) => handleChange("short_message", v)}
                disabled={!hydrated}
                themeColors={themeColors}
              />
            </View>

            <View style={[styles.card, { backgroundColor: isDark ? colors.newThemeColor : colors.white, borderColor: isDark ? colors.themeElevationColor : colors.iconBgColor }]}>
              <AppText weight={SEMI_BOLD} style={[styles.cardTitle, { color: themeColors.text }]}>Notification</AppText>
              <RadioGroup
                options={NOTIFICATION_DISPLAY_OPTIONS}
                value={settings.notification_display}
                onChange={(v: string) => handleChange("notification_display", v)}
                disabled={!hydrated}
                themeColors={themeColors}
              />
            </View>
          </>
        )}
      </ScrollView>
    </AppSafeAreaView>
  );
};

export default NotificationSettings;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: universalPaddingHorizontalHigh,
    paddingTop: universalPaddingTop,
    paddingBottom: 40,
  },
  loader: {
    marginTop: 40,
  },
  card: {

    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1.5,
    borderColor: colors.iconBgColor
  },
  cardTitle: {
    fontSize: 16,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
  },
  radioGroup: {
    marginTop: 5,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  disabledOption: {
    opacity: 0.5,
  },
  radioOuterCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  radioOuterCircleSelected: {

  },
  radioInnerCircle: {
    height: 10,
    width: 10,
    borderRadius: 15,

  },
  radioTextContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  radioLabel: {
    fontSize: 14,
  },
  radioTag: {
    fontSize: 14,
  },
});
