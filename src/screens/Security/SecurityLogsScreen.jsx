import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, ScrollView, Dimensions } from 'react-native';
import { AppSafeAreaView, AppText, SEMI_BOLD, EIGHTEEN, MEDIUM, FOURTEEN, TWELVE, FIFTEEN, THIRTEEN } from '../../shared';
import { useTheme } from '../../hooks/useTheme';
import NavigationService from '../../navigation/NavigationService';
import FastImage from 'react-native-fast-image';
import { back_ic, NO_NOTIFICATION_ICON, NO_NOTIFICATION_ICON_LIGHT } from '../../helper/ImageAssets';
import { colors } from '../../theme/colors';
import { appOperation } from '../../appOperation';
import { SpinnerSecond } from '../../shared/components/SpinnerSecond';

const TAB_LOGINS = 'Logins History';
const TAB_SETTINGS = 'Security Settings History';

const normalizeLogsPayload = (raw) => {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object' && raw.logs && Array.isArray(raw.logs)) return raw.logs;
  if (typeof raw === 'object' && raw.items && Array.isArray(raw.items)) return raw.items;
  if (typeof raw === 'object' && raw.data && Array.isArray(raw.data)) return raw.data;
  return [raw];
};

const pad2 = (n) => String(n).padStart(2, '0');

const formatAbsoluteTime = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};

const formatRelativeTime = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  let diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 0) diffSec = 0;
  if (diffSec < 60) return 'just now';
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
};

const formatType = (item) => {
  const platform = item?.metadata?.platform || item?.metadata?.client || item?.metadata?.source;
  if (platform && typeof platform === 'string') {
    const p = platform.trim().toUpperCase();
    if (p === 'WEB' || p === 'APP' || p === 'API') return p;
  }
  const device = String(item?.device?.device || '').toLowerCase();
  if (device.includes('mobile') || device.includes('tablet') || device.includes('phone')) {
    return 'APP';
  }
  return 'WEB';
};

const formatStatus = (s) => {
  if (s == null || s === '') return '—';
  const t = String(s).trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : '—';
};

const formatLoginLocation = (item) => {
  const loc = item?.location || {};
  if (loc.country) return loc.country;
  if (loc.city && loc.region) return `${loc.city}, ${loc.region}`;
  if (loc.city) return loc.city;
  if (loc.region) return loc.region;
  return '—';
};

const logTimestamp = (item) => item?.createdAt || item?.date || item?.updatedAt;

const mapLoginLogToRow = (item, idx) => {
  const ts = logTimestamp(item);
  return {
    id: item?._id || item?.id || idx,
    type: formatType(item),
    absTime: formatAbsoluteTime(ts),
    relTime: formatRelativeTime(ts),
    status: formatStatus(item?.status),
    ip: item?.IP || item?.ip || '—',
    location: formatLoginLocation(item),
  };
};

const mapSecuritySettingsLogToRow = (item, idx) => {
  const ts = logTimestamp(item);
  const actions = item?.Activity || item?.activity || '—';
  return {
    id: item?._id || item?.id || idx,
    type: formatType(item),
    absTime: formatAbsoluteTime(ts),
    relTime: '', // Web doesn't show relative time for settings logs
    ip: item?.IP || item?.ip || item?.metadata?.ip || '—',
    actions,
  };
};

const SecurityLogsScreen = () => {
  const { colors: themeColors, isDark } = useTheme();

  const [activeMainTab, setActiveMainTab] = useState(TAB_LOGINS);
  const [loading, setLoading] = useState(false);
  const [loginRows, setLoginRows] = useState([]);
  const [settingsRows, setSettingsRows] = useState([]);

  const fetchLoginLogs = useCallback(async () => {
    try {
      setLoading(true);
      const result = await appOperation.customer.securityGetLoginLogs();
      if (result?.success) {
        const list = normalizeLogsPayload(result?.data);
        const sorted = [...list].sort((a, b) => {
          const ta = new Date(a?.createdAt || a?.date || 0).getTime();
          const tb = new Date(b?.createdAt || b?.date || 0).getTime();
          return tb - ta;
        });
        setLoginRows(sorted.map(mapLoginLogToRow));
      } else {
        setLoginRows([]);
      }
    } catch (error) {
      console.log('Error fetching logins logs:', error);
      setLoginRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSecurityLogs = useCallback(async () => {
    try {
      setLoading(true);
      const result = await appOperation.customer.securityGetSecurityLogs();
      if (result?.success) {
        const list = normalizeLogsPayload(result?.data);
        const sorted = [...list].sort((a, b) => {
          const ta = new Date(a?.createdAt || a?.date || 0).getTime();
          const tb = new Date(b?.createdAt || b?.date || 0).getTime();
          return tb - ta;
        });
        setSettingsRows(sorted.map(mapSecuritySettingsLogToRow));
      } else {
        setSettingsRows([]);
      }
    } catch (error) {
      console.log('Error fetching security logs:', error);
      setSettingsRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeMainTab === TAB_LOGINS) {
      fetchLoginLogs();
    } else {
      fetchSecurityLogs();
    }
  }, [activeMainTab, fetchLoginLogs, fetchSecurityLogs]);

  const rows = activeMainTab === TAB_LOGINS ? loginRows : settingsRows;

  const cardBg = isDark ? colors.newThemeColor : colors.white;
  const borderCol = isDark ? '#8A8A93' : '#E5E5EA';
  const labelCol = isDark ? '#8A8A93' : '#8E8E93';
  const valCol = themeColors.text;

  return (
    <AppSafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, {}]}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => NavigationService.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <FastImage
            source={back_ic}
            tintColor={isDark ? colors.white : colors.black}
            style={{ width: 18, height: 18 }}
            resizeMode='contain'
          />
        </TouchableOpacity>

        <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={[styles.headerTitle, { color: valCol }]}>
          Security Logs
        </AppText>
        <View style={{ width: 24 }} />
      </View>

      {/* Main Tabs */}
      <View style={styles.mainTabsContainer}>
        <TouchableOpacity onPress={() => setActiveMainTab(TAB_LOGINS)} style={styles.mainTabBtn}>
          <AppText
            type={FIFTEEN}
            weight={activeMainTab === TAB_LOGINS ? SEMI_BOLD : MEDIUM}
            style={{ color: activeMainTab === TAB_LOGINS ? valCol : labelCol }}
          >
            Logins History
          </AppText>
          {activeMainTab === TAB_LOGINS && (
            <View style={[styles.activeTabIndicator, { backgroundColor: valCol }]} />
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setActiveMainTab(TAB_SETTINGS)} style={styles.mainTabBtn}>
          <AppText
            type={FIFTEEN}
            weight={activeMainTab === TAB_SETTINGS ? SEMI_BOLD : MEDIUM}
            style={{ color: activeMainTab === TAB_SETTINGS ? valCol : labelCol }}
          >
            Security Settings History
          </AppText>
          {activeMainTab === TAB_SETTINGS && (
            <View style={[styles.activeTabIndicator, { backgroundColor: valCol }]} />
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {rows.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <FastImage
              source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT}
              style={{ width: 100, height: 100 }}
              resizeMode="contain"
            />
            <AppText type={FOURTEEN} weight={MEDIUM} style={{ marginTop: 16, color: valCol }}>
              No data
            </AppText>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {rows?.map((row, idx) => (
              <View key={row.id ?? idx} style={[styles.logCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                {activeMainTab === TAB_LOGINS ? (
                  <>
                    <View style={[styles.cardRow, { borderBottomColor: borderCol }]}>
                      <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: labelCol }}>Type</AppText>
                      <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: valCol }}>{row.type}</AppText>
                    </View>
                    <View style={[styles.cardRow, { borderBottomColor: borderCol }]}>
                      <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: labelCol }}>Time</AppText>
                      <View style={{ alignItems: 'flex-end' }}>
                        <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: valCol }}>{row.absTime}</AppText>
                        {!!row.relTime && (
                          <AppText type={TWELVE} weight={MEDIUM} style={{ color: labelCol, marginTop: 2 }}>{row.relTime}</AppText>
                        )}
                      </View>
                    </View>
                    <View style={[styles.cardRow, { borderBottomColor: borderCol }]}>
                      <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: labelCol }}>Status</AppText>
                      <AppText
                        type={THIRTEEN}
                        weight={MEDIUM}
                        style={{ color: row.status?.toLowerCase() === 'success' ? '#34C759' : '#FF3B30' }}
                      >
                        {row.status}
                      </AppText>
                    </View>
                    <View style={[styles.cardRow, { borderBottomColor: borderCol }]}>
                      <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: labelCol }}>IP</AppText>
                      <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: valCol }}>{row.ip}</AppText>
                    </View>
                    <View style={[styles.cardRow, { borderBottomWidth: 0, paddingBottom: 10 }]}>
                      <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: labelCol }}>Login Location</AppText>
                      <AppText type={THIRTEEN} weight={MEDIUM} style={[styles.locationText, { color: valCol }]}>{row.location}</AppText>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={[styles.cardRow, { borderBottomColor: borderCol }]}>
                      <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: labelCol }}>Type</AppText>
                      <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: valCol }}>{row.type}</AppText>
                    </View>
                    <View style={[styles.cardRow, { borderBottomColor: borderCol }]}>
                      <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: labelCol }}>Time</AppText>
                      <View style={{ alignItems: 'flex-end' }}>
                        <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: valCol }}>{row.absTime}</AppText>
                        {!!row.relTime && (
                          <AppText type={TWELVE} weight={MEDIUM} style={{ color: labelCol, marginTop: 2 }}>{row.relTime}</AppText>
                        )}
                      </View>
                    </View>
                    <View style={[styles.cardRow, { borderBottomColor: borderCol }]}>
                      <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: labelCol }}>IP</AppText>
                      <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: valCol }}>{row.ip}</AppText>
                    </View>
                    <View style={[styles.cardRow, { borderBottomWidth: 0, paddingBottom: 4 }]}>
                      <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: labelCol }}>Actions</AppText>
                      <AppText type={THIRTEEN} weight={SEMI_BOLD} style={{ color: valCol }}>{row.actions}</AppText>
                    </View>
                  </>
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* SpinnerSecond Loader overlay */}
      {loading && <SpinnerSecond />}
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: Platform.OS === 'ios' ? 44 : 56,
  },
  headerBtn: {
    padding: 6,
    marginLeft: -4,
  },
  headerTitle: {
    // position: 'absolute',
    // left: 0,
    // right: 0,
    // textAlign: 'center',
    // zIndex: -1,
  },
  mainTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 16,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  mainTabBtn: {
    marginRight: 24,
    alignItems: 'center',
    paddingBottom: 4,
  },
  activeTabIndicator: {
    height: 2,
    width: '60%',
    position: 'absolute',
    bottom: -2,
    borderRadius: 1,
  },
  content: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  logCard: {
    borderRadius: 10,
    borderWidth: 0.7,
    paddingVertical: 5,
    marginBottom: 15,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  locationText: {
    maxWidth: '60%',
    textAlign: 'right',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
});

export default SecurityLogsScreen;
