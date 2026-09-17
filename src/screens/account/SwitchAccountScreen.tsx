import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions } from 'react-native';
import FastImage from 'react-native-fast-image';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../../store/hooks';
import { getAllWalletsPortfolio } from '../../actions/walletActions';
import { useTheme } from '../../hooks/useTheme';
import { AppSafeAreaView, AppText, SEMI_BOLD, MEDIUM, BOLD, FOURTEEN, FIFTEEN, TWELVE, SIXTEEN, TEN, TWENTY, EIGHTEEN } from '../../shared';
import NavigationService from '../../navigation/NavigationService';
import { back_ic, historyIcon, about_us_ic, eye_open_icon, eye_close_icon, NO_NOTIFICATION_ICON_LIGHT } from '../../helper/ImageAssets';
import Toast from 'react-native-simple-toast';
import { BASE_URL } from '../../helper/Constants';
import LinearGradient from 'react-native-linear-gradient';
import { colors, lightTheme } from '../../theme/colors';

const { width } = Dimensions.get('window');

const KYC_AVATAR_GRADIENT = ["#a684ff", "#ad46ff", "#4f39f6"];
const KYC_AVATAR_GRADIENT_LOCATIONS = [0, 0.5, 1];

const SwitchAccountScreen = ({ route }: any) => {
  const { colors: themeColors, isDark } = useTheme();

  // Params passed from AccountDetails
  const { userData, serverAvatar, serverNickname, maskedEmail, maskedPhone, displayName, initials } = route?.params || {};

  const [activeTab, setActiveTab] = useState<'Subaccount' | 'Other Accounts'>('Subaccount');
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

  const walletBalance = useAppSelector((state: any) => state.wallet.walletBalance);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getAllWalletsPortfolio({ useGlobalLoader: false }) as any);
  }, [dispatch]);

  const portfolioUsdtEstimate = useCallback((p: any) => {
    if (!p || typeof p !== 'object') return undefined;
    return (
      p.estimated_total_usdt ??
      p.dollarPrice ??
      p.estimatedTotalUsdt ??
      p.estimated_total ??
      p.total_usdt
    );
  }, []);

  const portfolioPreferredCurrency = useCallback((p: any) => {
    if (!p || typeof p !== 'object') return 'USD';
    return (
      p.currency_prefrence ??
      p.currency_preference ??
      p.preferred_currency ??
      p.Currency ??
      'USD'
    );
  }, []);

  const portfolioPreferredAmount = useCallback((p: any) => {
    if (!p || typeof p !== 'object') return undefined;
    const cur = portfolioPreferredCurrency(p);
    const byKey = cur && Object.prototype.hasOwnProperty.call(p, cur) ? p[cur] : undefined;
    const pref =
      p.estimated_total_preferred ??
      p.estimatedTotalPreferred ??
      p.currencyPrice ??
      byKey;
    return pref != null && pref !== '' ? pref : portfolioUsdtEstimate(p);
  }, [portfolioPreferredCurrency, portfolioUsdtEstimate]);

  const formatEstimateHeader = useCallback((value: any, decimals = 2) => {
    if (value === undefined || value === null || value === '') return '—';
    const num = Number(value);
    if (!Number.isFinite(num)) return '—';
    return String(parseFloat(num.toFixed(decimals)));
  }, []);

  // Helper to determine the final avatar URL
  const getFullAvatarUrl = (avatarUrl: string) => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl;
    return `${BASE_URL}${avatarUrl.startsWith('/') ? '' : '/'}${avatarUrl}`;
  };

  const finalAvatarUri = getFullAvatarUrl(serverAvatar || userData?.profilepicture);

  const showComingSoonToast = () => {
    Toast.showWithGravity("Coming soon", Toast.SHORT, Toast.BOTTOM);
  };

  return (
    <AppSafeAreaView>
      {/* Custom Header */}
      <View style={[styles.headerContainer,]}>
        <TouchableOpacity style={styles.backButton} onPress={() => NavigationService.goBack()}>
          <FastImage source={back_ic} style={{ width: 18, height: 18 }} tintColor={themeColors.text} resizeMode="contain" />
        </TouchableOpacity>

        <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
          Switch Account
        </AppText>

        <View style={styles.headerRightIcons}>
          <TouchableOpacity onPress={showComingSoonToast} style={{ marginRight: 16 }}>
            <FastImage source={historyIcon} style={{ width: 22, height: 22 }} tintColor={themeColors.text} resizeMode="contain" />
          </TouchableOpacity>
          <TouchableOpacity onPress={showComingSoonToast}>
            <FastImage source={about_us_ic} style={{ width: 22, height: 22 }} tintColor={themeColors.text} resizeMode="contain" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.container}>

        {/* Current Account Card */}
        <View style={[styles.accountCard, { backgroundColor: lightTheme.input }]}>

          {/* Current Pill */}
          <View style={styles.currentBadgeContainer}>
            <AppText type={TEN} style={{ color: '#2EBD85' }}>Current</AppText>
          </View>

          <View style={styles.accountCardContent}>
            {/* Avatar */}
            <View style={styles.avatarWrapper}>
              {finalAvatarUri ? (
                <FastImage
                  source={{ uri: finalAvatarUri }}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={KYC_AVATAR_GRADIENT}
                  locations={KYC_AVATAR_GRADIENT_LOCATIONS}
                  style={[styles.avatar, { justifyContent: 'center', alignItems: 'center' }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <AppText weight={BOLD} style={{ color: "#FFFFFF", fontSize: 20 }}>
                    {initials || "U"}
                  </AppText>
                </LinearGradient>
              )}
            </View>

            {/* Account Details */}
            <View style={styles.accountInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppText type={SIXTEEN} style={{ color: themeColors.text, marginRight: 8 }} numberOfLines={1}>
                  {maskedEmail || maskedPhone || "User"}
                </AppText>
                <View style={[styles.vipBadge, { backgroundColor: isDark ? '#333333' : '#EAECEF' }]}>
                  <AppText type={TEN} style={{ color: themeColors.secondaryText, fontSize: 9 }}>
                    VIP {userData?.vipLevel || 0}
                  </AppText>
                </View>
              </View>
              <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 4 }}>
                UID: {userData?.uuid || "—"}
              </AppText>
            </View>

            {/* Balance */}
            <View style={styles.balanceSection}>
              <AppText type={FIFTEEN} weight={MEDIUM} style={{ color: themeColors.text }}>
                {isBalanceVisible
                  ? `${formatEstimateHeader(portfolioPreferredAmount(walletBalance), 2)} ${portfolioPreferredCurrency(walletBalance)}`
                  : "*****"}
              </AppText>
              <TouchableOpacity onPress={() => setIsBalanceVisible(!isBalanceVisible)} style={{ marginLeft: 6 }}>
                <FastImage
                  source={isBalanceVisible ? eye_open_icon : eye_close_icon}
                  style={{ width: 14, height: 14 }}
                  tintColor={themeColors.secondaryText}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('Subaccount')}
            activeOpacity={0.7}
          >
            <AppText
              type={FOURTEEN}
              weight={activeTab === 'Subaccount' ? SEMI_BOLD : MEDIUM}
              style={{ color: activeTab === 'Subaccount' ? themeColors.text : themeColors.secondaryText }}
            >
              Subaccount
            </AppText>
            {activeTab === 'Subaccount' && <View style={[styles.tabIndicator, { backgroundColor: themeColors.text }]} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('Other Accounts')}
            activeOpacity={0.7}
          >
            <AppText
              type={FOURTEEN}
              weight={activeTab === 'Other Accounts' ? SEMI_BOLD : MEDIUM}
              style={{ color: activeTab === 'Other Accounts' ? themeColors.text : themeColors.secondaryText }}
            >
              Other Accounts
            </AppText>
            {activeTab === 'Other Accounts' && <View style={[styles.tabIndicator, { backgroundColor: themeColors.text }]} />}
          </TouchableOpacity>
        </View>

        {/* Empty State */}
        <View style={styles.emptyStateContainer}>
          <FastImage
            source={NO_NOTIFICATION_ICON_LIGHT}
            style={{ width: 120, height: 120, opacity: 0.5 }}
            resizeMode="contain"
          />
          <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText, marginTop: 16 }}>
            No data
          </AppText>
        </View>

      </View>

      {/* Bottom Button */}
      <View style={[styles.bottomContainer, { borderTopColor: isDark ? '#2C2C2E' : 'transparent', borderTopWidth: isDark ? 1 : 0 }]}>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: isDark ? '#333333' : '#2A2A2E' }]}
          onPress={showComingSoonToast}
          activeOpacity={0.8}
        >
          <AppText type={SIXTEEN} weight={MEDIUM} style={{ color: '#FFFFFF' }}>
            Create Subaccount
          </AppText>
        </TouchableOpacity>
      </View>

    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  accountCard: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  currentBadgeContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(46, 189, 133, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
  },
  accountCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 12,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  accountInfo: {
    flex: 1,
  },
  vipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  balanceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginLeft: 8,
    marginTop: 10
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
    marginBottom: 20,
  },
  tabButton: {
    marginRight: 24,
    paddingVertical: 8,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: '10%',
    right: '10%',
    height: 2,
    borderRadius: 1,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  bottomContainer: {
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 24 : 16,
  },
  createButton: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SwitchAccountScreen;
