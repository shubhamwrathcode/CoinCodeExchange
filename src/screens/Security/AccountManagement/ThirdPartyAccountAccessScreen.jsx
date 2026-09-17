import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, ScrollView, Dimensions } from 'react-native';
import { AppSafeAreaView, AppText, SEMI_BOLD, EIGHTEEN, MEDIUM, FOURTEEN, THIRTEEN, SIXTEEN } from '../../../shared';
import { useTheme } from '../../../hooks/useTheme';
import NavigationService from '../../../navigation/NavigationService';
import FastImage from 'react-native-fast-image';
import { back_ic, NO_NOTIFICATION_ICON, NO_NOTIFICATION_ICON_LIGHT } from '../../../helper/ImageAssets';
import { colors } from '../../../theme/colors';
import { appOperation } from '../../../appOperation';
import { SpinnerSecond } from '../../../shared/components/SpinnerSecond';

const { width } = Dimensions.get('window');

const normalizeLogsPayload = (raw) => {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object' && raw.logs && Array.isArray(raw.logs)) return raw.logs;
  if (typeof raw === 'object' && raw.items && Array.isArray(raw.items)) return raw.items;
  if (typeof raw === 'object' && raw.data && Array.isArray(raw.data)) return raw.data;
  return [raw];
};

const ThirdPartyAccountAccessScreen = () => {
  const { colors: themeColors, isDark } = useTheme();

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const result = await appOperation.customer.securityGetLogs();
      if (result?.success) {
        const list = normalizeLogsPayload(result?.data);
        const sorted = [...list].sort((a, b) => {
          const ta = new Date(a?.createdAt || 0).getTime();
          const tb = new Date(b?.createdAt || 0).getTime();
          return tb - ta;
        });

        const mapped = sorted.map((item, idx) => {
          const thirdParty = item?.metadata?.registeredBy || '--';
          const account = item?.IP || '--';
          const addedAt = item?.createdAt
            ? new Date(item.createdAt).toLocaleString()
            : '--';
          const operation = item?.Activity || '--';

          return {
            id: item?._id || idx,
            thirdParty,
            account,
            addedAt,
            operation,
          };
        });
        setRows(mapped);
      } else {
        setRows([]);
      }
    } catch (error) {
      console.log('Error fetching third party access logs:', error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const cardBg = isDark ? colors.newThemeColor : colors.white;
  const borderCol = isDark ? '#8A8A93' : '#E5E5EA';
  const labelCol = isDark ? '#8A8A93' : '#8E8E93';
  const valCol = themeColors.text;

  return (
    <AppSafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={styles.header}>
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

        <AppText type={SIXTEEN} weight={SEMI_BOLD} style={[styles.headerTitle, { color: valCol }]}>
          Third Party Account Access
        </AppText>
        <View style={{ width: 24 }} />
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

          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {rows.map((row, idx) => (
              <View key={row.id ?? idx} style={[styles.logCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={[styles.cardRow, { borderBottomColor: borderCol }]}>
                  <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: labelCol }}>Third Party</AppText>
                  <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: valCol }}>{row.thirdParty}</AppText>
                </View>
                <View style={[styles.cardRow, { borderBottomColor: borderCol }]}>
                  <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: labelCol }}>Account</AppText>
                  <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: valCol }}>{row.account}</AppText>
                </View>
                <View style={[styles.cardRow, { borderBottomColor: borderCol }]}>
                  <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: labelCol }}>Added at</AppText>
                  <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: valCol }}>{row.addedAt}</AppText>
                </View>
                <View style={[styles.cardRow, { borderBottomWidth: 0, paddingBottom: 4 }]}>
                  <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: labelCol }}>Operation</AppText>
                  <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: valCol }}>{row.operation}</AppText>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Loader */}
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
    // paddingHorizontal: 40,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
});

export default ThirdPartyAccountAccessScreen;
