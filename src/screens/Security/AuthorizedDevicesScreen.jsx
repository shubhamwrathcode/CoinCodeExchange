import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { AppSafeAreaView, AppText, SEMI_BOLD, EIGHTEEN, MEDIUM, FOURTEEN, THIRTEEN, TWELVE } from '../../shared';
import { useTheme } from '../../hooks/useTheme';
import NavigationService from '../../navigation/NavigationService';
import FastImage from 'react-native-fast-image';
import { back_ic, NO_NOTIFICATION_ICON, NO_NOTIFICATION_ICON_LIGHT } from '../../helper/ImageAssets';
import { colors } from '../../theme/colors';
import { appOperation } from '../../appOperation';
import DeviceInfo from 'react-native-device-info';
import { showError, showSuccess } from '../../helper/logger';
import RBSheet from 'react-native-raw-bottom-sheet';

const { width, height } = Dimensions.get('window');

const pad2 = (n) => String(n).padStart(2, "0");

function formatAbsoluteTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function formatRelativeTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  let diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 0) diffSec = 0;
  if (diffSec < 60) return "just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24) {
    return remMins > 0 ? `${hours} hours ${remMins} min ago` : `${hours} hours ago`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days} days ${remHours} hours ago` : `${days} days ago`;
}

function formatLocation(item) {
  const loc = item?.location || {};
  if (typeof loc === "string" && loc.trim()) return loc;
  if (loc.country) return loc.country;
  if (loc.city && loc.region) return `${loc.city}, ${loc.region}`;
  if (loc.city) return loc.city;
  if (loc.region) return loc.region;
  return "—";
}

function statusLabel(status) {
  const s = String(status || "").toUpperCase();
  if (s === "TRUSTED") return "Trusted";
  if (s === "NEW") return "New / untrusted";
  if (s === "BLOCKED_TEMP") return "Blocked (temp)";
  if (s === "BLOCKED_PERM") return "Blocked";
  if (s === "ACTIVE") return "Active";
  return s || "—";
}

const isBlockedStatus = (status) => {
  const s = String(status || "").toUpperCase();
  return s === "BLOCKED_TEMP" || s === "BLOCKED_PERM";
};

function deviceLabel(d) {
  const name = d.device_name || [d.browser, d.os].filter(Boolean).join(" on ") || d.platform;
  return name || d.device_id || "Device";
}

function sessionLabel(s) {
  const parts = [s.device_name, s.browser, s.os, s.client_type, s.platform].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  return s.device_id || s.session_id || "Session";
}

const AuthorizedDevicesScreen = () => {
  const { colors: themeColors, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState('devices'); // 'devices' | 'sessions'
  const [devices, setDevices] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentDeviceId, setCurrentDeviceId] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const otherSessionCount = sessions.filter(
    (s) => !(s.is_current || String(s.session_id) === currentSessionId)
  ).length;

  const actionSheetRef = useRef(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const cardBg = 'transparent';
  const sheetBg = isDark ? '#1C1C1E' : colors.white;
  const borderCol = isDark ? '#2C2C2E' : '#E5E5EA';
  const labelCol = isDark ? '#8A8A93' : '#8E8E93';
  const valCol = themeColors.text;

  const btnBorderColor = isDark ? colors.white : colors.black;
  const btnTextColor = isDark ? colors.white : colors.black;

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      // Fallback device ID if backend doesn't send it
      let localDeviceId = '';
      try { localDeviceId = DeviceInfo.getUniqueId(); } catch (e) { }

      const [devRes, sessRes] = await Promise.all([
        appOperation.customer.listDevices(),
        appOperation.customer.listSessions()
      ]);

      if (devRes?.success) {
        setDevices(Array.isArray(devRes?.data?.devices) ? devRes.data.devices : []);
        if (devRes?.data?.current_device_id) {
          setCurrentDeviceId(String(devRes.data.current_device_id));
        } else if (localDeviceId) {
          setCurrentDeviceId(localDeviceId);
        }
      } else if (devRes?.message) {
        showError(devRes.message);
      }

      if (sessRes?.success) {
        setSessions(Array.isArray(sessRes?.data?.sessions) ? sessRes.data.sessions : []);
        if (sessRes?.data?.current_session_id) {
          setCurrentSessionId(String(sessRes.data.current_session_id));
        }
      } else if (sessRes?.message) {
        showError(sessRes.message);
      }
    } catch (e) {
      showError(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const runAction = async (id, successMsg, apiFn) => {
    setBusyId(id);
    actionSheetRef.current?.close();
    try {
      const res = await apiFn();
      if (res?.success) {
        showSuccess(res.message || successMsg);
        await loadAll();
      } else {
        showError(res?.message || "Action failed");
      }
    } catch (e) {
      showError(e?.message || "Action failed");
    } finally {
      setBusyId('');
    }
  };

  const handleActionPress = (item) => {
    setSelectedItem(item);
    actionSheetRef.current?.open();
  };

  const renderTabs = () => {
    return (
      <View style={[styles.tabBar, { borderBottomColor: borderCol }]}>
        {['Trusted Devices', 'Active Sessions'].map((tab) => {
          const tabKey = tab === 'Trusted Devices' ? 'devices' : 'sessions';
          const isActive = activeTab === tabKey;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tabKey)}
              style={[
                styles.tab,
                isActive && { borderBottomWidth: 2, borderBottomColor: themeColors.button }
              ]}
            >
              <AppText
                type={FOURTEEN}
                weight={isActive ? SEMI_BOLD : MEDIUM}
                style={{ color: isActive ? valCol : labelCol }}
              >
                {tab}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderCardRow = (label, value, isHighlight = false) => (
    <View style={[styles.cardRow, { borderBottomColor: borderCol }]}>
      <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: labelCol }}>{label}</AppText>
      <View style={{ flex: 1, alignItems: 'flex-end', paddingLeft: 16 }}>
        {typeof value === 'string' || typeof value === 'number' ? (
          <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: isHighlight ? themeColors.buyButton : valCol, textAlign: 'right' }}>
            {value}
          </AppText>
        ) : (
          value
        )}
      </View>
    </View>
  );

  const renderStatusBadge = (statusText, type = 'default') => {
    let bgColor = isDark ? '#2C2C2E' : '#F2F2F7';
    let textColor = valCol;

    if (type === 'ok') {
      bgColor = isDark ? 'rgba(240, 185, 11, 0.15)' : 'rgba(240, 185, 11, 0.2)';
      textColor = isDark ? '#F0B90B' : '#CFA00A';
    } else if (type === 'danger') {
      bgColor = isDark ? 'rgba(246, 70, 93, 0.15)' : 'rgba(246, 70, 93, 0.1)';
      textColor = themeColors.sellButton;
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
        <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: textColor }}>
          {statusText}
        </AppText>
      </View>
    );
  };

  const renderActionSheet = () => {
    if (!selectedItem) return null;

    const isDevice = activeTab === 'devices';
    const id = isDevice ? selectedItem.device_id : selectedItem.session_id;
    const isCurrent = isDevice
      ? (String(id) === currentDeviceId)
      : (selectedItem.is_current || String(id) === currentSessionId);

    const isBusy = busyId === id;

    const renderBtn = (text, onPress, type = 'default', disabled = false) => {
      let bgColor = 'transparent';
      let borderColor = type === 'danger' ? '#F6465D' : btnBorderColor;
      let textColor = type === 'danger' ? '#F6465D' : btnTextColor;

      return (
        <TouchableOpacity
          key={text}
          style={[
            styles.sheetActionBtn,
            {
              backgroundColor: bgColor,
              borderColor: borderColor,
              opacity: disabled ? 0.4 : 1
            }
          ]}
          onPress={onPress}
          disabled={disabled || isBusy}
        >
          <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: textColor }}>
            {text}
          </AppText>
        </TouchableOpacity>
      );
    };

    let buttons = null;

    if (isDevice) {
      const trusted = String(selectedItem.status || "").toUpperCase() === "TRUSTED";
      const blocked = isBlockedStatus(selectedItem.status);

      buttons = (
        <>
          {!blocked && trusted && renderBtn("Untrust", () => runAction(id, "Device trust removed", () => appOperation.customer.untrustDevice(id)))}
          {!blocked && !trusted && renderBtn("Trust", () => runAction(id, "Device trusted", () => appOperation.customer.trustDevice(id)), 'primary')}

          {/* selectedItem.ip_bound
            ? renderBtn("Unbind IP", () => runAction(id, "Device IP unbound", () => appOperation.customer.unbindDeviceIp(id)))
            : renderBtn("Bind IP", () => runAction(id, "Device bound to this IP", () => appOperation.customer.bindDeviceIp(id)), 'default', blocked)
          */}

          {blocked
            ? renderBtn("Unblock", () => runAction(id, "Device unblocked", () => appOperation.customer.unblockDevice(id)), 'primary')
            : !isCurrent && (
              <>
                {renderBtn("Block 24h", () => runAction(id, "Device blocked for 24 hours", () => appOperation.customer.blockDevice(id, { duration_hours: 24 })))}
                {renderBtn("Block", () => runAction(id, "Device blocked", () => appOperation.customer.blockDevice(id, { permanent: true })), 'danger')}
              </>
            )
          }

          {!isCurrent && renderBtn("Remove", () => runAction(id, "Device removed", () => appOperation.customer.removeDevice(id)), 'danger')}
        </>
      );
    } else {
      if (isCurrent) {
        buttons = (
          <>
            {/* selectedItem.ip_bound
              ? renderBtn("Unbind IP", () => runAction(id, "Session IP unbound", () => appOperation.customer.unbindSessionIp(id)))
              : renderBtn("Bind IP", () => runAction(id, "Session bound to this IP", () => appOperation.customer.bindSessionIp(id)))
            */}
          </>
        );
      } else {
        buttons = renderBtn("End session", () => runAction(id, "Session ended", () => appOperation.customer.revokeSession(id)), 'danger');
      }
    }

    return (
      <View style={{ padding: 20 }}>
        <AppText weight={SEMI_BOLD} type={EIGHTEEN} style={{ color: valCol, marginBottom: 15 }}>
          Actions for {isDevice ? deviceLabel(selectedItem) : sessionLabel(selectedItem)}
        </AppText>
        <View style={styles.sheetActionWrap}>
          {buttons}
        </View>
      </View>
    );
  };

  const renderList = () => {
    const list = activeTab === 'devices' ? devices : sessions;

    if (loading) {
      return (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={themeColors.button} />
        </View>
      );
    }

    if (list.length === 0) {
      return (
        <View style={styles.emptyState}>
          <FastImage
            source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT}
            style={{ width: 100, height: 100 }}
            resizeMode="contain"
          />
          <AppText type={FOURTEEN} weight={MEDIUM} style={{ marginTop: 16, color: valCol }}>
            No data found
          </AppText>
        </View>
      );
    }

    return list.map((item, idx) => {
      const isDevice = activeTab === 'devices';
      const id = isDevice ? item.device_id : item.session_id;
      const isCurrent = isDevice
        ? (String(id) === currentDeviceId)
        : (item.is_current || String(id) === currentSessionId);

      const title = isDevice ? deviceLabel(item) : sessionLabel(item);
      const isBusy = busyId === id;

      const lastActiveTs = item.last_seen_at || item.updated_at || item.created_at;
      const ipAddress = item.last_ip || item.ip || item.ip_address || "—";

      const isCurrentStatus = !isDevice && isCurrent;
      
      let statusText = "";
      let badgeType = "default";
      if (isDevice) {
        statusText = statusLabel(item.status);
        const trusted = String(item.status || "").toUpperCase() === "TRUSTED";
        const blocked = isBlockedStatus(item.status);
        if (trusted) badgeType = 'ok';
        else if (blocked) badgeType = 'danger';
      } else {
        statusText = isCurrentStatus ? "Current" : statusLabel(item.status || "ACTIVE");
        if (isCurrentStatus) badgeType = 'ok';
      }

      return (
        <View key={id || idx} style={[styles.logCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
          {renderCardRow(isDevice ? "Device" : "Device / client", (
            <View style={{ alignItems: 'flex-end' }}>
              <AppText type={THIRTEEN} weight={SEMI_BOLD} style={{ color: valCol, textAlign: 'right' }}>
                {title} {isCurrent ? "(this device)" : ""}
              </AppText>
              {isDevice && (
                <AppText type={TWELVE} style={{ color: labelCol, marginTop: 2, textAlign: 'right' }}>
                  {[item.os, item.browser, item.platform].filter(Boolean).join(" · ") || id}
                </AppText>
              )}
              {!isDevice && (
                <AppText type={TWELVE} style={{ color: labelCol, marginTop: 2, textAlign: 'right' }}>
                  {item.device_id || id}
                </AppText>
              )}
            </View>
          ))}
          {renderCardRow("Status", renderStatusBadge(statusText, badgeType))}
          {renderCardRow("Last active", (
            <View style={{ alignItems: 'flex-end' }}>
              <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: valCol }}>{formatAbsoluteTime(lastActiveTs)}</AppText>
              <AppText type={TWELVE} style={{ color: labelCol, marginTop: 2 }}>{formatRelativeTime(lastActiveTs)}</AppText>
            </View>
          ))}
          {renderCardRow("IP", ipAddress)}
          {renderCardRow("Location", formatLocation(item))}

          <View style={[styles.cardRow, { borderBottomWidth: 0, justifyContent: 'space-between', alignItems: 'center' }]}>
            <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: labelCol }}>Actions</AppText>
            <TouchableOpacity
              style={[styles.manageBtn, { borderColor: btnBorderColor, backgroundColor: 'transparent' }]}
              onPress={() => handleActionPress(item)}
              disabled={isBusy}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color={btnTextColor} />
              ) : (
                <AppText type={TWELVE} weight={MEDIUM} style={{ color: btnTextColor }}>Manage</AppText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
    });
  };

  return (
    <AppSafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => NavigationService.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <FastImage source={back_ic} tintColor={isDark ? colors.white : colors.black} style={{ width: 18, height: 18 }} resizeMode='contain' />
        </TouchableOpacity>
        <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={{ color: valCol }}>Authorized Devices</AppText>
        <View style={{ width: 24 }} />
      </View>

      {renderTabs()}

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={[styles.controlCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
          {activeTab === 'devices' ? (
            <>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: valCol, marginBottom: 8 }}>Device controls</AppText>
              <AppText type={THIRTEEN} style={{ color: labelCol, marginBottom: 16 }}>
                Trust, block, or bind IP on recognized devices. Bound IP changes require sign-in again.
              </AppText>
              <TouchableOpacity
                style={[styles.refreshBtn, { borderColor: btnBorderColor, opacity: (loading || !!busyId) ? 0.4 : 1 }]}
                onPress={loadAll}
                disabled={loading || !!busyId}
              >
                {loading && !busyId ? (
                  <ActivityIndicator size="small" color={btnTextColor} style={{ marginRight: 8 }} />
                ) : null}
                <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: btnTextColor }}>Refresh</AppText>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: valCol, marginBottom: 8 }}>Session controls</AppText>
              <AppText type={THIRTEEN} style={{ color: labelCol, marginBottom: 16 }}>
                End remote logins, keep only this device, or force logout everywhere.
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <TouchableOpacity
                  style={[styles.refreshBtn, { borderColor: btnBorderColor, marginBottom: 10, opacity: (loading || !!busyId || otherSessionCount === 0) ? 0.4 : 1 }]}
                  onPress={() => runAction('revoke-others', "Other sessions ended", () => appOperation.customer.revokeOtherSessions())}
                  disabled={loading || !!busyId || otherSessionCount === 0}
                >
                  <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: btnTextColor }}>Log out other sessions{otherSessionCount > 0 ? ` (${otherSessionCount})` : ''}</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.refreshBtn, { borderColor: '#F6465D', marginBottom: 10, opacity: (loading || !!busyId) ? 0.4 : 1 }]}
                  onPress={() => {
                    runAction('revoke-all', "Logged out everywhere", async () => {
                      const res = await appOperation.customer.revokeAllSessions();
                      if (res?.success) {
                        NavigationService.resetAndGoTo('AuthLogin');
                      }
                      return res;
                    });
                  }}
                  disabled={loading || !!busyId}
                >
                  <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: '#F6465D' }}>Log out all</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.refreshBtn, { borderColor: btnBorderColor, marginBottom: 10, opacity: (loading || !!busyId) ? 0.4 : 1 }]}
                  onPress={loadAll}
                  disabled={loading || !!busyId}
                >
                  {loading && !busyId ? (
                    <ActivityIndicator size="small" color={btnTextColor} style={{ marginRight: 8 }} />
                  ) : null}
                  <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: btnTextColor }}>Refresh</AppText>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {renderList()}
      </ScrollView>

      <RBSheet
        ref={actionSheetRef}
        customModalProps={{ statusBarTranslucent: true }}
        height={activeTab === 'devices' ? (selectedItem && String(selectedItem.device_id) !== currentDeviceId ? 300 : 200) : 180}
        openDuration={250}
        customStyles={{
          container: {
            backgroundColor: sheetBg,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }
        }}
      >
        {renderActionSheet()}
      </RBSheet>
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, height: Platform.OS === 'ios' ? 44 : 56,
  },
  headerBtn: { padding: 6, marginLeft: -4 },
  tabBar: {
    flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1,
    marginTop: 10, marginBottom: 15,
  },
  tab: {
    paddingVertical: 12, marginRight: 24,
  },
  scrollContainer: {
    paddingHorizontal: 16, paddingBottom: 40,
  },
  controlCard: {
    borderRadius: 10, borderWidth: 1, padding: 16, marginBottom: 20,
  },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, borderWidth: 1,
    alignSelf: 'flex-start'
  },
  logCard: {
    borderRadius: 10, borderWidth: 1, paddingVertical: 5, marginBottom: 15,
  },
  cardRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1,
  },
  emptyState: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60,
  },
  statusBadge: {
    paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12,
  },
  manageBtn: {
    paddingVertical: 6, paddingHorizontal: 16, borderRadius: 6, borderWidth: 1,
  },
  sheetActionWrap: {
    flexDirection: 'row', flexWrap: 'wrap',
    alignItems: 'flex-start'
  },
  sheetActionBtn: {
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1,
    marginRight: 10, marginBottom: 12,
  }
});

export default AuthorizedDevicesScreen;
