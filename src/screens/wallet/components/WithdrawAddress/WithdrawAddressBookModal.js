import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
  RefreshControl,
  Animated,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { AppSafeAreaView, AppText, BOLD, FOURTEEN, MEDIUM, SEMI_BOLD, SIXTEEN, TEN, TWELVE } from '../../../../common';
import { buildCoinImageUri } from '../../../../helper/coinIconUrl';
import { back_ic, add, Refresh, REMOVE, moreOption } from '../../../../helper/ImageAssets';
import { useTheme } from '../../../../hooks/useTheme';
import { colors } from '../../../../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WithdrawAddressBookModal({
  visible,
  onClose,
  selectedCurrency,
  addressBookList = [],
  withdrawalAddressHistory = [],
  onSelect,
  onDelete,
  onRefresh,
  onAddAddress,
  refreshing,
  isPendingSatoshiDeposit,
  isPendingMetaMaskSign,
  onResumeSatoshi,
  onResumeMetaMask,
  isDark
}) {
  const { colors: themeColors } = useTheme();
  const [activeTab, setActiveTab] = useState('saved'); // 'saved' or 'recent'
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const [shouldRender, setShouldRender] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible]);

  const coinSymbol = useMemo(() => {
    return String(
      selectedCurrency?.short_name || selectedCurrency?.symbol || ""
    ).trim().toUpperCase() || "—";
  }, [selectedCurrency]);

  const coinIcon = useMemo(() => {
    const uri = buildCoinImageUri(selectedCurrency);
    if (!uri) return null;
    return { uri };
  }, [selectedCurrency]);

  const renderAddressCard = (item, isHistory = false) => {
    const addr = String(item.address || "").trim();
    const label = isHistory ? (item.coin || coinSymbol) : (item.label || "Saved");
    const network = String(item.chain || item.network || "").toUpperCase();
    const statusRaw = String(item.last_status || item.status || "").toUpperCase();
    const isApproved = statusRaw === "APPROVED" || statusRaw === "TRUSTED" || statusRaw === "COMPLETED" || statusRaw === "SUCCESS";
    const isPending = statusRaw.includes("PENDING") || statusRaw === "PROCESSING" || statusRaw === "WAITING";
    const isRejected = statusRaw === "REJECTED" || statusRaw === "FAILED" || statusRaw === "EXPIRED";

    const statusLabel = statusRaw.replace(/_/g, " ");

    return (
      <TouchableOpacity
        key={`${addr}-${network}-${isHistory}`}
        activeOpacity={0.7}
        onPress={() => {
          onSelect(item);
          onClose();
        }}
        style={[
          styles.card,
          {
            backgroundColor: 'transparent',
            borderColor: isDark ? "#2A2E39" : "#E5E7EB",
          }
        ]}
      >
        <View style={styles.cardTop}>
          <View>
            <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.text }}>
              {label}
            </AppText>
            <View style={styles.badgeRow}>
              <AppText weight={MEDIUM} type={TEN} style={{ color: themeColors.secondaryText }}>
                {network}
              </AppText>
              {!!statusRaw && (
                <View style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isApproved ? (isDark ? "#1B3224" : "#E1F2E8") :
                      isPending ? (isDark ? "#332B1B" : "#FFF8E6") :
                        isRejected ? (isDark ? "#3D1A1A" : "#FEE2E2") :
                          (isDark ? "#2A2E39" : "#F3F4F6")
                  }
                ]}>
                  <AppText weight={SEMI_BOLD} type={TEN} style={{
                    color: isApproved ? "#228B22" :
                      isPending ? "#D97706" :
                        isRejected ? "#DC2626" :
                          themeColors.secondaryText
                  }}>
                    {statusLabel}
                  </AppText>
                </View>
              )}
            </View>
          </View>

          {!isHistory && (
            <TouchableOpacity
              onPress={() => onDelete && onDelete(item)}
              style={styles.removeBtn}
            >
              <FastImage source={moreOption} style={{ width: 15, height: 15 }} tintColor={isDark ? colors.white : colors.black} resizeMode='contain' />
            </TouchableOpacity>
          )}
        </View>

        <AppText type={TWELVE} style={[styles.addressText, { color: themeColors.secondaryText }]}>
          {addr}
        </AppText>

        {isPendingSatoshiDeposit && isPendingSatoshiDeposit(item) && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation && e.stopPropagation();
              onResumeSatoshi && onResumeSatoshi(item);
            }}
            style={[styles.resumeBtn, { backgroundColor: isDark ? "#1E222D" : "#F9FAFB", borderColor: isDark ? "#2A2E39" : "#E5E7EB" }]}
          >
            <AppText type={TEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>Show deposit QR & amount</AppText>
          </TouchableOpacity>
        )}

        {isPendingMetaMaskSign && isPendingMetaMaskSign(item) && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation && e.stopPropagation();
              onResumeMetaMask && onResumeMetaMask(item);
            }}
            style={[styles.resumeBtn, { backgroundColor: isDark ? "#1E222D" : "#F9FAFB", borderColor: isDark ? "#2A2E39" : "#E5E7EB" }]}
          >
            <AppText type={TEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>Sign with MetaMask to complete</AppText>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (!shouldRender) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.background,
          transform: [{ translateX: slideAnim }]
        }
      ]}
    >
      <AppSafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: isDark ? "#2A2E39" : "#E5E7EB" }]}>
          <TouchableOpacity onPress={onClose} style={{ width: 40 }}>
            <FastImage source={back_ic} resizeMode='contain' style={{ width: 20, height: 20 }} tintColor={isDark ? colors.white : colors.black} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <AppText weight={BOLD} type={SIXTEEN} style={{ color: themeColors.text, marginLeft: 8 }}>
              Address Book
            </AppText>
          </View>

          <TouchableOpacity onPress={onAddAddress} style={{ width: 40, alignItems: 'flex-end' }}>
            <FastImage source={add} style={{ width: 20, height: 20 }} tintColor={themeColors.text} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {[
            { key: 'saved', label: 'My Address' },
            { key: 'recent', label: 'Recent' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.tab,
                activeTab === tab.key && { borderBottomColor: themeColors.text, borderBottomWidth: 2 }
              ]}
            >
              <AppText
                weight={activeTab === tab.key ? SEMI_BOLD : MEDIUM}
                type={FOURTEEN}
                style={{ color: activeTab === tab.key ? themeColors.text : themeColors.secondaryText }}
              >
                {tab.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={themeColors.text}
            />
          }
        >
          {activeTab === 'saved' ? (
            addressBookList.length > 0 ? (
              addressBookList.map(item => renderAddressCard(item, false))
            ) : (
              <View style={styles.emptyContainer}>
                <AppText style={{ color: themeColors.secondaryText }}>No saved addresses found.</AppText>
              </View>
            )
          ) : (
            withdrawalAddressHistory.length > 0 ? (
              withdrawalAddressHistory.map(item => renderAddressCard(item, true))
            ) : (
              <View style={styles.emptyContainer}>
                <AppText style={{ color: themeColors.secondaryText }}>No recent addresses found.</AppText>
              </View>
            )
          )}
        </ScrollView>
      </AppSafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 10,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  tab: {
    paddingVertical: 12,
    marginRight: 24,
  },
  card: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    backgroundColor: "transparent"
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  removeBtn: {
    padding: 4,
  },
  addressText: {
    lineHeight: 18,
  },
  emptyContainer: {
    paddingTop: 100,
    alignItems: 'center',
  },
  resumeBtn: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  }
});
