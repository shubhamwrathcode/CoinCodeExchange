import React, { useState, useRef, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput, Dimensions, FlatList, StatusBar } from 'react-native';
import FastImage from 'react-native-fast-image';
import { AppSafeAreaView, AppText, MEDIUM, NORMAL, SEMI_BOLD } from '../../shared';
import { useTheme } from '../../hooks/useTheme';
import {
  back_ic,
  eye_open_icon,
  eye_close_icon,
  historyIcon,
  searchIcon,
  downIcon,
  upIcon,
  usdtIcon,
  bitcoinIcon,
  INFO,
  NO_NOTIFICATION_ICON
} from '../../helper/ImageAssets';
import NavigationService from '../../navigation/NavigationService';
import { TRADE_SCREEN } from '../../navigation/routes';
import Toast from 'react-native-simple-toast';
import { colors } from '../../theme/colors';
import { fontFamilyMedium, fontFamilySemiBold, } from '../../theme/typography';
import { appOperation } from '../../appOperation';
import { IMAGE_BASE_URL } from '../../helper/Constants';
import RBSheet from 'react-native-raw-bottom-sheet';

const STAKING_FAQ_ITEMS = [
  {
    question: "What is Soft Staking?",
    answer: "Soft Staking allows users to earn passive rewards on their crypto holdings while maintaining full access to their assets. Unlike traditional staking, your funds remain flexible and can be used or withdrawn at any time."
  },
  {
    question: "How does Soft Staking work?",
    answer: "Once eligible assets are deposited into your account, they automatically participate in the Soft Staking program. Rewards are generated based on your holdings and are credited according to the platform's reward schedule."
  },
  {
    question: "Do I need to lock my assets?",
    answer: "No. Soft Staking does not require a lock-up period. You can access, trade, or withdraw your assets whenever needed without waiting for an unstaking process."
  },
  {
    question: "Which cryptocurrencies are supported?",
    answer: "Supported cryptocurrencies may vary depending on the platform. You can view the latest list of eligible assets directly from the Soft Staking dashboard."
  },
  {
    question: "How are staking rewards calculated?",
    answer: "Rewards are typically calculated based on your average daily balance of eligible assets and the current annual percentage yield (APY) offered for each cryptocurrency."
  },
  {
    question: "When will I receive my rewards?",
    answer: "Rewards are typically distributed on a daily, weekly, or monthly basis, depending on the specific program terms. Please refer to the program rules for exact distribution schedules."
  },
  {
    question: "Are there any fees for Soft Staking?",
    answer: "Usually, there are no direct fees for participating in Soft Staking. However, standard network or withdrawal fees may apply when transferring your assets out of the platform."
  },
  {
    question: "Is Soft Staking safe?",
    answer: "Soft Staking is designed to provide a secure and convenient way to earn rewards. However, cryptocurrency investments involve market risks, and users should always conduct their own research before participating."
  },
  {
    question: "Can I stop Soft Staking at any time?",
    answer: "Yes. Since assets are not locked, you can stop participating simply by withdrawing or transferring your eligible assets from the staking account."
  },
  {
    question: "Why choose Soft Staking?",
    answer: "Soft Staking offers a simple way to generate passive income while maintaining liquidity, flexibility, and easy access to your crypto assets without long-term commitments."
  }
];



const MOCK_ONGOING_PROJECTS = [
  {
    id: 0,
    logo: 'USDT',
    name: 'USDT Soft Staking',
    status: 'Ongoing',
    badge: 'Flexible',
    minAmount: '10 USDT',
    participants: '12,543',
    eventTime: 'Daily Snapshot: 00:00 UTC',
    pools: [
      {
        name: 'Hold USDT to Earn',
        coinIcon: 'USDT',
        allocation: '6.5%',
        allocationCoin: 'Est. APR',
        commitment: '1,452,240',
        commitmentCoin: 'USDT',
        cap: '100,000',
        capCoin: 'USDT',
        subPrice: 'Flexible Staking',
        poolParticipants: '9,543'
      },
      {
        name: 'Hold GUSD to Earn',
        coinIcon: 'USDT',
        allocation: '8.0%',
        allocationCoin: 'Est. APR',
        commitment: '645,120',
        commitmentCoin: 'GUSD',
        cap: '50,000',
        capCoin: 'GUSD',
        subPrice: 'Flexible Staking',
        poolParticipants: '3,000'
      }
    ]
  },
  {
    id: 1,
    logo: 'BTC',
    name: 'BTC Soft Staking',
    status: 'Ongoing',
    badge: 'Flexible',
    minAmount: '0.001 BTC',
    participants: '8,432',
    eventTime: 'Daily Snapshot: 00:00 UTC',
    pools: [
      {
        name: 'Hold BTC to Earn',
        coinIcon: 'BTC',
        allocation: '3.8%',
        allocationCoin: 'Est. APR',
        commitment: '14.52',
        commitmentCoin: 'BTC',
        cap: '5',
        capCoin: 'BTC',
        subPrice: 'Flexible Staking',
        poolParticipants: '8,432'
      }
    ]
  }
];

const SoftStaking = () => {
  const { colors: themeColors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(themeColors, isDark), [themeColors, isDark]);
  const [isHide, setIsHide] = useState(false);
  const [isSoftStakingEnabled, setIsSoftStakingEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState<'All Products' | 'Ongoing'>('All Products');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [packages, setPackages] = useState<any[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);

  const faqSheetRef = useRef<any>(null);
  const statusSheetRef = useRef<any>(null);
  const [faqActiveIndex, setFaqActiveIndex] = useState<number | null>(null);

  React.useEffect(() => {
    fetchPackages();
    fetchStatus();
  }, []);

  const fetchPackages = async () => {
    setPackagesLoading(true);
    try {
      const res: any = await appOperation.customer.SoftStaking_Packages(1, 100);
      if (res?.success && Array.isArray(res.data)) {
        setPackages(res.data);
      }
    } catch (e) {
      console.log('SoftStaking Packages error', e);
    } finally {
      setPackagesLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const res: any = await appOperation.customer.SoftStaking_Status();
      if (res?.success) {
        setIsSoftStakingEnabled(res.data?.softStakingStaus === true);
      }
    } catch (e) {
      console.log('SoftStaking Status error', e);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getIconForCoin = (symbol: string) => {
    const pkg = packages.find(p => p.currency === symbol);
    if (pkg && pkg.iconPath) {
      return { uri: `${IMAGE_BASE_URL}${pkg.iconPath}` };
    }
    if (symbol === 'BTC') return bitcoinIcon;
    return usdtIcon;
  };

  const formatApr = (pkg: any) => {
    const min = pkg?.aprMin;
    const max = pkg?.aprMax;
    if (min != null && max != null && min !== max) return `${min}% - ${max}%`;
    if (max != null) return `${max}%`;
    return "—";
  };

  const filteredCoins = packages.filter(item =>
    String(item?.currency || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => NavigationService.goBack()} style={{ padding: 8 }}>
          <FastImage source={back_ic} style={styles.backIcon} tintColor={themeColors.text} resizeMode="contain" />
        </TouchableOpacity>
        <AppText style={[styles.headerTitle, { color: themeColors.text }]} weight={SEMI_BOLD}>Soft Staking</AppText>
        <TouchableOpacity style={{ padding: 8 }} onPress={() => faqSheetRef.current?.open()}>
          <FastImage source={INFO} style={styles.backIcon} tintColor={themeColors.text} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Holdings Section */}
        <View style={styles.holdingsContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <AppText style={{ color: themeColors.secondaryText, fontSize: 14, marginRight: 6, borderBottomWidth: 1, borderBottomColor: themeColors.secondaryText, borderStyle: 'dotted' }}>Yesterday's Holdings</AppText>
                <TouchableOpacity onPress={() => setIsHide(!isHide)} style={{ padding: 4 }}>
                  <FastImage source={isHide ? eye_close_icon : eye_open_icon} style={{ width: 14, height: 14 }} tintColor={themeColors.secondaryText} resizeMode="contain" />
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6 }}>
                <AppText style={{ color: themeColors.text, fontSize: 32, fontFamily: fontFamilySemiBold, marginRight: 6 }}>
                  {isHide ? '******' : '0.00'}
                </AppText>
                <AppText style={{ color: themeColors.text, fontSize: 16, marginBottom: 6 }}>USD</AppText>
              </View>
              <AppText style={{ color: themeColors.secondaryText, fontSize: 13 }}>
                Cumulative Rewards {isHide ? '******' : '0.00 USD'}
              </AppText>
            </View>
            {/* <TouchableOpacity
              style={{ padding: 4 }}
              onPress={() => Toast.showWithGravity('Coming soon', Toast.SHORT, Toast.BOTTOM)}
            >
              <FastImage source={historyIcon} style={{ width: 20, height: 20 }} tintColor={themeColors.text} resizeMode="contain" />
            </TouchableOpacity> */}
          </View>

          {/* Enabled Pill */}
          {isSoftStakingEnabled ? (
            <TouchableOpacity
              style={[styles.statusPill, { backgroundColor: isDark ? '#303237' : '#F0F0F0' }]}
              onPress={() => statusSheetRef.current?.open()}
            >
              <AppText style={{ color: themeColors.text, fontSize: 14, fontFamily: fontFamilyMedium, marginRight: 8 }}>Soft Staking</AppText>
              <AppText style={{ color: '#03A66D', fontSize: 12, fontFamily: fontFamilyMedium }}>Enabled</AppText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.statusPill, { backgroundColor: isDark ? themeColors.button : colors.black, justifyContent: 'center' }]}
              onPress={() => statusSheetRef.current?.open()}
            >
              <AppText style={{ color: isDark ? themeColors.buttonText : colors.white, fontSize: 14, fontFamily: fontFamilyMedium }}>Start Earning</AppText>
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity onPress={() => setActiveTab('All Products')} style={styles.tabButton}>
            <AppText style={[styles.tabText, { color: activeTab === 'All Products' ? themeColors.text : themeColors.secondaryText, fontFamily: activeTab === 'All Products' ? fontFamilySemiBold : fontFamilyMedium }]}>All Products</AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('Ongoing')} style={styles.tabButton}>
            <AppText style={[styles.tabText, { color: activeTab === 'Ongoing' ? themeColors.text : themeColors.secondaryText, fontFamily: activeTab === 'Ongoing' ? fontFamilySemiBold : fontFamilyMedium }]}>Ongoing ({MOCK_ONGOING_PROJECTS.length})</AppText>
          </TouchableOpacity>
        </View>

        {activeTab === 'All Products' ? (
          <View style={styles.productsContainer}>
            {/* Search */}
            <View style={[styles.searchContainer, { backgroundColor: isDark ? themeColors.card : '#F0F0F0' }]}>
              <FastImage source={searchIcon} style={styles.searchIconSmall} resizeMode="contain" tintColor={themeColors.secondaryText} />
              <TextInput
                style={[styles.searchInput, { color: themeColors.text }]}
                placeholder="Search"
                placeholderTextColor={themeColors.secondaryText}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Table Header */}
            <View style={[styles.tableHeader, { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: isDark ? themeColors.border : '#F0F0F0', paddingHorizontal: 4 }]}>
              <View style={{ flex: 1.2 }}><AppText style={styles.tableHeaderText}>Coin</AppText></View>
              <View style={{ flex: 1, alignItems: 'center' }}><AppText style={styles.tableHeaderText}>Min Holding</AppText></View>
              <View style={{ flex: 0.8, alignItems: 'flex-end' }}><AppText style={styles.tableHeaderText}>Type</AppText></View>
            </View>

            {/* Coin List */}
            {packagesLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <AppText style={{ color: themeColors.secondaryText }}>Loading...</AppText>
              </View>
            ) : filteredCoins.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <FastImage source={NO_NOTIFICATION_ICON} style={{ width: 100, height: 100, marginBottom: 16 }} resizeMode="contain" />
              </View>
            ) : filteredCoins.map((item) => {
              return (
                <View key={item._id} style={[styles.coinRowContainer, { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: isDark ? themeColors.border : '#F0F0F0', paddingHorizontal: 4 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1.2, flexDirection: 'row', alignItems: 'center' }}>
                      <FastImage source={{ uri: `${IMAGE_BASE_URL}${item.iconPath}` }} style={styles.coinIcon} resizeMode="contain" />
                      <View>
                        <AppText style={[styles.coinName, { color: themeColors.text, marginBottom: 0 }]}>{item.currency}</AppText>
                        <AppText style={{ color: themeColors.secondaryText, fontSize: 13, marginTop: 2, fontFamily: fontFamilyMedium }}>{item.currencyFullName || item.currency}</AppText>
                      </View>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <AppText style={{ color: themeColors.text, fontSize: 14, fontFamily: fontFamilyMedium }}>{item.minAmount != null ? `${item.minAmount} ${item.currency}` : '—'}</AppText>
                    </View>
                    <View style={{ flex: 0.8, alignItems: 'flex-end' }}>
                      <AppText style={{ color: themeColors.text, fontSize: 14, fontFamily: fontFamilyMedium }}>{item.type || 'SPOT'}</AppText>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.ongoingContainer}>
            {MOCK_ONGOING_PROJECTS.map((project) => (
              <View key={project.id} style={[styles.projectCard, { backgroundColor: isDark ? themeColors.background : '#F9F9F9', borderColor: isDark ? themeColors.border : '#EAEAEA' }]}>
                {/* Status Badge Top Right */}
                <View style={[styles.projectStatusBadge, { backgroundColor: isDark ? themeColors.card : '#EAEAEA' }]}>
                  <AppText style={[styles.projectStatusText, { color: isDark ? themeColors.secondaryText : '#888' }]}>{project.status}</AppText>
                </View>

                {/* Project Header */}
                <View style={styles.projectHeader}>
                  <FastImage source={getIconForCoin(project.logo)} style={styles.projectLogo} resizeMode="contain" />
                  <View>
                    <AppText style={[styles.projectName, { color: themeColors.text }]}>{project.name}</AppText>
                    {project.badge && (
                      <View style={styles.projectFlexibleBadge}>
                        <AppText style={styles.projectFlexibleText}>{project.badge}</AppText>
                      </View>
                    )}
                  </View>
                </View>

                {/* Project Info */}
                <View style={styles.projectInfoRow}>
                  <View style={styles.projectInfoCol}>
                    <AppText style={styles.infoLabel}>Min Holding</AppText>
                    <AppText style={[styles.infoValue, { color: themeColors.text }]}>{project.minAmount}</AppText>
                  </View>
                </View>
                <View style={styles.projectInfoRow}>
                  <View style={styles.projectInfoCol}>
                    <AppText style={styles.infoLabel}>Number of Participants</AppText>
                    <AppText style={[styles.infoValue, { color: themeColors.text }]}>{project.participants}</AppText>
                  </View>
                </View>
                <View style={[styles.projectInfoRow, { marginBottom: 20 }]}>
                  <View style={styles.projectInfoCol}>
                    <AppText style={styles.infoLabel}>Event Time</AppText>
                    <AppText style={[styles.infoValue, { color: themeColors.text }]}>{project.eventTime}</AppText>
                  </View>
                </View>

                {/* Pools */}
                {project.pools.map((pool, pIdx) => (
                  <View key={pIdx} style={[styles.poolCard, { backgroundColor: isDark ? 'transparent' : colors.white, borderColor: isDark ? themeColors.border : '#EAEAEA' }]}>
                    <View style={styles.poolHeader}>
                      <FastImage source={getIconForCoin(pool.coinIcon)} style={styles.poolIcon} resizeMode="contain" />
                      <AppText style={[styles.poolName, { color: themeColors.text }]}>{pool.name}</AppText>
                    </View>

                    <View style={styles.poolStatsRow}>
                      <View style={styles.poolStatCol}>
                        <AppText style={styles.infoLabel}>{pool.allocationCoin}</AppText>
                        <AppText style={styles.aprValue}>{pool.allocation}</AppText>
                      </View>
                      <View style={[styles.poolStatCol, { alignItems: 'flex-end' }]}>
                        <AppText style={styles.infoLabel}>Cumulative Rewards</AppText>
                        <AppText style={[styles.poolValue, { color: themeColors.text }]}>
                          {pool.commitment} <AppText style={[styles.poolCoin, { color: themeColors.text }]}>{pool.commitmentCoin}</AppText>
                        </AppText>
                      </View>
                    </View>

                    <View style={styles.poolStatsRow}>
                      <View style={styles.poolStatCol}>
                        <AppText style={styles.infoLabel}>Staking Cap Limit</AppText>
                        <AppText style={[styles.poolValue, { color: themeColors.text }]}>
                          {pool.cap} <AppText style={[styles.poolCoin, { color: themeColors.text }]}>{pool.capCoin}</AppText>
                        </AppText>
                      </View>
                    </View>

                    <View style={[styles.poolDivider, { backgroundColor: isDark ? '#303744' : '#EAEAEA' }]} />

                    <View style={styles.poolSummaryRow}>
                      <AppText style={styles.infoLabel}>Staking Type</AppText>
                      <AppText style={[styles.poolSummaryValue, { color: themeColors.text }]}>{pool.subPrice}</AppText>
                    </View>
                    <View style={styles.poolSummaryRow}>
                      <AppText style={styles.infoLabel}>Number of Participants</AppText>
                      <AppText style={[styles.poolSummaryValue, { color: themeColors.text }]}>{pool.poolParticipants}</AppText>
                    </View>

                    <TouchableOpacity style={[styles.tradeBtn, { backgroundColor: isDark ? '#303237' : '#F0F0F0' }]} onPress={() => NavigationService.navigate(TRADE_SCREEN)}>
                      <AppText style={[styles.tradeBtnText, { color: themeColors.text }]}>Trade</AppText>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <RBSheet
        ref={faqSheetRef}
        keyboardAvoidingViewEnabled={false}
        {...({ customModalProps: { statusBarTranslucent: true } } as any)}
        closeOnDragDown={true}
        closeOnPressMask={true}
        height={450}
        customStyles={{
          wrapper: {
            backgroundColor: "rgba(0,0,0,0.5)"
          },
          draggableIcon: {
            backgroundColor: "transparent",
          },
          container: {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: 20,
            backgroundColor: isDark ? themeColors.background : colors.white
          }
        }}
      >
        <View style={styles.modalHeader}>
          <AppText style={[styles.modalTitle, { color: themeColors.text }]}>FAQ</AppText>
          <TouchableOpacity onPress={() => faqSheetRef.current?.close()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <AppText style={[styles.modalCloseText, { color: themeColors.text }]}>×</AppText>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {STAKING_FAQ_ITEMS.map((item, index) => (
            <View key={String(index)} style={[styles.faqItemInner, { borderBottomColor: isDark ? themeColors.border : '#F0F0F5' }, index === STAKING_FAQ_ITEMS.length - 1 && styles.faqItemInnerLast]}>
              <TouchableOpacity
                style={styles.faqQuestionRow}
                onPress={() => setFaqActiveIndex(faqActiveIndex === index ? null : index)}
                activeOpacity={0.7}
              >
                <AppText style={[styles.faqQuestion, { color: themeColors.text }]}>{item.question}</AppText>
                <FastImage
                  source={faqActiveIndex === index ? upIcon : downIcon}
                  resizeMode="contain"
                  style={styles.faqArrow}
                  tintColor={themeColors.text}
                />
              </TouchableOpacity>
              {faqActiveIndex === index && (
                <View style={styles.faqAnswer}>
                  <AppText style={[styles.faqAnswerText, { color: themeColors.secondaryText }]}>{item.answer}</AppText>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </RBSheet>

      <RBSheet
        ref={statusSheetRef}
        keyboardAvoidingViewEnabled={false}
        {...({ customModalProps: { statusBarTranslucent: true } } as any)}
        closeOnDragDown={true}
        closeOnPressMask={true}
        height={380}
        customStyles={{
          wrapper: {
            backgroundColor: "rgba(0,0,0,0.5)"
          },
          draggableIcon: {
            backgroundColor: "transparent",
          },
          container: {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: 20,
            backgroundColor: isDark ? themeColors.background : colors.white
          }
        }}
      >
        <View style={styles.modalHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <FastImage source={usdtIcon} style={{ width: 24, height: 24, marginRight: 8 }} resizeMode="contain" />
            <AppText style={[styles.modalTitle, { color: themeColors.text }]}>Soft Staking</AppText>
          </View>
          <TouchableOpacity onPress={() => statusSheetRef.current?.close()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <AppText style={[styles.modalCloseText, { color: themeColors.text }]}>×</AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.statusSheetContent}>
          <View style={styles.statusRow}>
            <AppText style={[styles.statusLabel, { color: themeColors.text }]}>Current Status</AppText>
            <View style={isSoftStakingEnabled ? styles.statusBadgeEnabled : [styles.statusBadgeDisabled, { backgroundColor: isDark ? '#303744' : '#EAEAEA' }]}>
              <AppText style={isSoftStakingEnabled ? styles.statusBadgeTextEnabled : styles.statusBadgeTextDisabled}>
                {isSoftStakingEnabled ? 'Enabled' : 'Disabled'}
              </AppText>
            </View>
          </View>

          <AppText style={styles.statusDesc}>
            {isSoftStakingEnabled
              ? "Disabling soft staking will stop your eligible assets from earning rewards. You can re-enable it anytime."
              : "Enable soft staking to automatically earn rewards on your eligible holdings. Rewards become eligible from the next day (00:00 UTC)."}
          </AppText>

          <TouchableOpacity
            style={[styles.statusCancelBtn, { backgroundColor: isDark ? themeColors.background : '#F7F7F7' }]}
            onPress={() => statusSheetRef.current?.close()}
          >
            <AppText style={{ color: themeColors.text, fontSize: 16, fontFamily: fontFamilySemiBold }}>Cancel</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusActionBtn, isSoftStakingEnabled ? styles.statusDisableBtn : styles.statusEnableBtn]}
            onPress={() => {
              const nextStatus = !isSoftStakingEnabled;
              setIsSoftStakingEnabled(nextStatus);
              statusSheetRef.current?.close();
              Toast.showWithGravity(nextStatus ? 'Soft staking enabled' : 'Soft staking disabled', Toast.SHORT, Toast.BOTTOM);
            }}
          >
            <AppText style={{ color: isDark ? themeColors.buttonText : colors.white, fontSize: 16, fontFamily: fontFamilySemiBold }}>
              {isSoftStakingEnabled ? 'Disable' : 'Enable'}
            </AppText>
          </TouchableOpacity>
        </View>
      </RBSheet>
    </AppSafeAreaView>
  );
};

const getStyles = (themeColors: any, isDark: boolean) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  headerTitle: {
    fontSize: 18,
  },
  holdingsContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tabButton: {
    marginRight: 24,
  },
  tabText: {
    fontSize: 16,
  },
  productsContainer: {
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 20,
  },
  searchIconSmall: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
    fontFamily: fontFamilyMedium,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  tableHeaderText: {
    fontSize: 12,
    color: isDark ? themeColors.secondaryText : '#888',
    fontFamily: fontFamilyMedium,
  },
  coinRowContainer: {
    marginBottom: 8,
  },
  coinRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  coinInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  coinName: {
    fontSize: 16,
    fontFamily: fontFamilyMedium,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: fontFamilyMedium,
  },
  aprSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aprText: {
    fontSize: 16,
    fontFamily: fontFamilyMedium,
    marginRight: 10,
  },
  arrowIcon: {
    width: 12,
    height: 12,
  },
  expandedDetails: {
    paddingLeft: 34,
    paddingRight: 22,
    paddingBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: NORMAL,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: fontFamilyMedium,
  },
  ongoingContainer: {
    paddingHorizontal: 16,
  },
  projectCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    paddingTop: 24,
    marginBottom: 20,
    position: 'relative',
  },
  projectStatusBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopRightRadius: 15,
    borderBottomLeftRadius: 10,
  },
  projectStatusText: {
    fontSize: 12,
    fontFamily: fontFamilyMedium,
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  projectLogo: {
    width: 36,
    height: 36,
    marginRight: 12,
  },
  projectName: {
    fontSize: 18,
    fontFamily: fontFamilySemiBold,
    marginBottom: 4,
  },
  projectFlexibleBadge: {
    backgroundColor: isDark ? 'rgba(0,131,158, 0.2)' : '#E0F7FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  projectFlexibleText: {
    color: isDark ? '#00A8CC' : '#00839e',
    fontSize: 10,
    fontFamily: fontFamilyMedium,
  },
  projectInfoRow: {
    marginBottom: 12,
  },
  projectInfoCol: {
    flexDirection: 'column',
  },
  infoLabel: {
    fontSize: 12,
    color: isDark ? themeColors.secondaryText : '#888',
    fontFamily: NORMAL,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: fontFamilySemiBold,
  },
  poolCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginTop: 10,
  },
  poolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  poolIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  poolName: {
    fontSize: 16,
    fontFamily: fontFamilySemiBold,
  },
  poolStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  poolStatCol: {
    flex: 1,
  },
  aprValue: {
    fontSize: 18,
    color: '#03A66D',
    fontFamily: fontFamilySemiBold,
  },
  poolValue: {
    fontSize: 14,
    fontFamily: fontFamilySemiBold,
  },
  poolCoin: {
    fontSize: 13,
    fontFamily: fontFamilyMedium,
  },
  poolDivider: {
    height: 1,
    width: '100%',
    marginBottom: 16,
  },
  poolSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  poolSummaryValue: {
    fontSize: 12,
    fontFamily: fontFamilySemiBold,
  },
  tradeBtn: {
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  tradeBtnText: {
    fontSize: 14,
    fontFamily: fontFamilySemiBold,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fontFamilySemiBold,
  },
  modalCloseText: {
    fontSize: 24,
  },
  modalList: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  faqItemInner: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  faqItemInnerLast: {
    borderBottomWidth: 0,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontFamilySemiBold,
  },
  faqArrow: {
    width: 14,
    height: 14,
    marginLeft: 10,
  },
  faqAnswer: {
    marginTop: 12,
  },
  faqAnswerText: {
    fontSize: 14,
    fontFamily: fontFamilyMedium,
    lineHeight: 22,
  },
  statusSheetContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 16,
    fontFamily: fontFamilySemiBold,
  },
  statusBadgeEnabled: {
    backgroundColor: isDark ? 'rgba(3,166,109, 0.2)' : '#D1F0E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusBadgeDisabled: {
    backgroundColor: isDark ? '#303744' : '#EAEAEA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusBadgeTextEnabled: {
    color: '#03A66D',
    fontSize: 14,
    fontFamily: fontFamilySemiBold,
  },
  statusBadgeTextDisabled: {
    color: isDark ? themeColors.secondaryText : '#888',
    fontSize: 14,
    fontFamily: fontFamilySemiBold,
  },
  statusDesc: {
    fontSize: 14,
    fontFamily: fontFamilyMedium,
    color: isDark ? themeColors.secondaryText : '#888',
    lineHeight: 20,
    marginBottom: 30,
  },
  statusActionBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  statusCancelBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: isDark ? themeColors.border : '#F7F7F7',
    marginBottom: 12,
  },
  statusEnableBtn: {
    backgroundColor: '#202225',
  },
  statusDisableBtn: {
    backgroundColor: '#FF4D4F',
  },
});

export default SoftStaking;
