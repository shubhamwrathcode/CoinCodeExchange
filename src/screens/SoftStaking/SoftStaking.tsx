import React, { useState, useRef, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import FastImage from 'react-native-fast-image';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { Database } from 'lucide-react-native';
import { AppSafeAreaView, AppText, NORMAL, SEMI_BOLD } from '../../shared';
import { useTheme } from '../../hooks/useTheme';
import {
  back_ic,
  eye_open_icon,
  eye_close_icon,
  searchIcon,
  downIcon,
  usdtIcon,
  bitcoinIcon,
  INFO,
  NO_NOTIFICATION_ICON,
  closeIcon,
  stakingPromo,
} from '../../helper/ImageAssets';
import NavigationService from '../../navigation/NavigationService';
import { TRADE_SCREEN } from '../../navigation/routes';
import Toast from 'react-native-simple-toast';
import { colors } from '../../theme/colors';
import { fontFamilyMedium, fontFamilySemiBold, fontFamilyBold } from '../../theme/typography';
import { appOperation } from '../../appOperation';
import { IMAGE_BASE_URL } from '../../helper/Constants';
import RBSheet from 'react-native-raw-bottom-sheet';

const CYAN = colors.cyanTheme || colors.cyan || '#0AA8C5';

/** Shared sheet chrome — matches TradingDataModal / CoinCode theme */
const ThemedSheetChrome = ({ isDark }: { isDark: boolean }) => (
  <>
    <BlurView
      style={StyleSheet.absoluteFill}
      blurType="light"
      blurAmount={20}
      reducedTransparencyFallbackColor="#111214"
    />
    <View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: isDark ? 'rgba(10, 12, 16, 0.68)' : 'rgba(255, 255, 255, 0.85)' },
      ]}
    />
    {isDark && (
      <>
        <LinearGradient
          colors={[
            'rgba(16, 185, 129, 0.10)',
            'rgba(6, 182, 212, 0.04)',
            'rgba(16, 185, 129, 0.02)',
            'rgba(16, 185, 129, 0.07)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['transparent', 'rgba(16, 185, 129, 0.04)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </>
    )}
  </>
);

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

  const textColor = isDark ? '#FFFFFF' : '#000000';
  const muted = isDark ? 'rgba(255,255,255,0.55)' : '#9D9D9D';
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : '#F5F5F5';
  const inputBorder = isDark ? 'rgba(255,255,255,0.12)' : '#E8E8E8';
  const rowBorder = isDark ? 'rgba(255,255,255,0.08)' : '#EEEEEE';
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : '#F9F9F9';
  const cardBorder = isDark ? 'rgba(255,255,255,0.15)' : '#E8E8E8';
  const pillBg = isDark ? 'rgba(255,255,255,0.08)' : '#F0F0F0';
  const sheetCloseCircleBg = isDark ? 'rgba(255,255,255,0.12)' : '#E8E8E8';
  const sheetIconTint = isDark ? colors.white : colors.black;
  const sheetHandleColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)';

  const sheetContainerStyles = {
    wrapper: {
      backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)',
    },
    draggableIcon: {
      backgroundColor: 'transparent' as const,
      height: 0,
    },
    container: {
      backgroundColor: 'transparent' as const,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
      overflow: 'hidden' as const,
      paddingHorizontal: 14,
      paddingTop: 8,
      paddingBottom: 10,
    },
  };

  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background }}>
      {/* Header — back + info only (title lives in hero as Coincode Soft Staking) */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => NavigationService.goBack()}
          activeOpacity={0.75}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FastImage source={back_ic} style={styles.backIcon} resizeMode="contain" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => faqSheetRef.current?.open()}
          activeOpacity={0.75}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FastImage source={INFO} style={styles.infoIcon} tintColor={textColor} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero banner — EarnScreen layout */}
        <View style={styles.bannerContainer}>
          <View style={styles.heroLeft}>
            <AppText style={[styles.heroEyebrow, { color: CYAN }]}>Coincode Soft Staking</AppText>
            <AppText style={[styles.heroTitle, { color: textColor }]}>
              Stake Today,{'\n'}Earn Tomorrow
            </AppText>
            <AppText style={[styles.heroDesc, { color: muted }]}>
              Stake your crypto assets and earn high rewards with top security and transparency.
            </AppText>
            <TouchableOpacity
              style={[styles.stakeNowBtn, { backgroundColor: CYAN }]}
              onPress={() => statusSheetRef.current?.open()}
              activeOpacity={0.85}
            >
              <Database color={colors.white} size={16} style={{ marginRight: 6 }} />
              <AppText style={{ color: colors.white, fontSize: 14, fontFamily: fontFamilyMedium }}>
                Stake Now
              </AppText>
            </TouchableOpacity>
          </View>
          <FastImage
            source={stakingPromo}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        {/* Holdings — Soft Staking content (unchanged) */}
        <View style={styles.holdingsContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <AppText style={{ color: muted, fontSize: 14, marginRight: 6, borderBottomWidth: 1, borderBottomColor: muted, borderStyle: 'dotted' }}>
              Yesterday's Holdings
            </AppText>
            <TouchableOpacity onPress={() => setIsHide(!isHide)} style={{ padding: 4 }}>
              <FastImage source={isHide ? eye_close_icon : eye_open_icon} style={{ width: 14, height: 14 }} tintColor={muted} resizeMode="contain" />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6 }}>
            <AppText style={{ color: textColor, fontSize: 32, fontFamily: fontFamilySemiBold, marginRight: 6 }}>
              {isHide ? '******' : '0.00'}
            </AppText>
            <AppText style={{ color: textColor, fontSize: 16, marginBottom: 6 }}>USD</AppText>
          </View>
          <AppText style={{ color: muted, fontSize: 13 }}>
            Cumulative Rewards {isHide ? '******' : '0.00 USD'}
          </AppText>

          {isSoftStakingEnabled ? (
            <TouchableOpacity
              style={[styles.statusPill, { backgroundColor: pillBg }]}
              onPress={() => statusSheetRef.current?.open()}
            >
              <AppText style={{ color: textColor, fontSize: 14, fontFamily: fontFamilyMedium, marginRight: 8 }}>Soft Staking</AppText>
              <AppText style={{ color: '#03A66D', fontSize: 12, fontFamily: fontFamilyMedium }}>Enabled</AppText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.statusPill, { backgroundColor: CYAN, justifyContent: 'center' }]}
              onPress={() => statusSheetRef.current?.open()}
            >
              <AppText style={{ color: colors.white, fontSize: 14, fontFamily: fontFamilyMedium }}>Start Earning</AppText>
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity onPress={() => setActiveTab('All Products')} style={styles.tabButton}>
            <AppText style={[styles.tabText, { color: activeTab === 'All Products' ? textColor : muted, fontFamily: activeTab === 'All Products' ? fontFamilySemiBold : fontFamilyMedium }]}>All Products</AppText>
            {activeTab === 'All Products' && <View style={[styles.tabUnderline, { backgroundColor: CYAN }]} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('Ongoing')} style={styles.tabButton}>
            <AppText style={[styles.tabText, { color: activeTab === 'Ongoing' ? textColor : muted, fontFamily: activeTab === 'Ongoing' ? fontFamilySemiBold : fontFamilyMedium }]}>Ongoing ({MOCK_ONGOING_PROJECTS.length})</AppText>
            {activeTab === 'Ongoing' && <View style={[styles.tabUnderline, { backgroundColor: CYAN }]} />}
          </TouchableOpacity>
        </View>

        {activeTab === 'All Products' ? (
          <View style={styles.productsContainer}>
            {/* Search */}
            <View style={[styles.searchContainer, { backgroundColor: inputBg, borderColor: inputBorder, borderWidth: 1 }]}>
              <FastImage source={searchIcon} style={styles.searchIconSmall} resizeMode="contain" tintColor={muted} />
              <TextInput
                style={[styles.searchInput, { color: textColor }]}
                placeholder="Search"
                placeholderTextColor={muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Table Header */}
            <View style={[styles.tableHeader, { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: rowBorder, paddingHorizontal: 4 }]}>
              <View style={{ flex: 1.2 }}><AppText style={styles.tableHeaderText}>Coin</AppText></View>
              <View style={{ flex: 1, alignItems: 'center' }}><AppText style={styles.tableHeaderText}>Min Holding</AppText></View>
              <View style={{ flex: 0.8, alignItems: 'flex-end' }}><AppText style={styles.tableHeaderText}>Type</AppText></View>
            </View>

            {/* Coin List */}
            {packagesLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <AppText style={{ color: muted }}>Loading...</AppText>
              </View>
            ) : filteredCoins.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <FastImage source={NO_NOTIFICATION_ICON} style={{ width: 100, height: 100, marginBottom: 16 }} resizeMode="contain" />
              </View>
            ) : filteredCoins.map((item) => {
              return (
                <View key={item._id} style={[styles.coinRowContainer, { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: rowBorder, paddingHorizontal: 4 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1.2, flexDirection: 'row', alignItems: 'center' }}>
                      <FastImage source={{ uri: `${IMAGE_BASE_URL}${item.iconPath}` }} style={styles.coinIcon} resizeMode="contain" />
                      <View>
                        <AppText style={[styles.coinName, { color: textColor, marginBottom: 0 }]}>{item.currency}</AppText>
                        <AppText style={{ color: muted, fontSize: 13, marginTop: 2, fontFamily: fontFamilyMedium }}>{item.currencyFullName || item.currency}</AppText>
                      </View>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <AppText style={{ color: textColor, fontSize: 14, fontFamily: fontFamilyMedium }}>{item.minAmount != null ? `${item.minAmount} ${item.currency}` : '—'}</AppText>
                    </View>
                    <View style={{ flex: 0.8, alignItems: 'flex-end' }}>
                      <AppText style={{ color: textColor, fontSize: 14, fontFamily: fontFamilyMedium }}>{item.type || 'SPOT'}</AppText>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.ongoingContainer}>
            {MOCK_ONGOING_PROJECTS.map((project) => (
              <View key={project.id} style={[styles.projectCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                {/* Status Badge Top Right */}
                <View style={[styles.projectStatusBadge, { backgroundColor: pillBg }]}>
                  <AppText style={[styles.projectStatusText, { color: muted }]}>{project.status}</AppText>
                </View>

                {/* Project Header */}
                <View style={styles.projectHeader}>
                  <FastImage source={getIconForCoin(project.logo)} style={styles.projectLogo} resizeMode="contain" />
                  <View>
                    <AppText style={[styles.projectName, { color: textColor }]}>{project.name}</AppText>
                    {project.badge && (
                      <View style={[styles.projectFlexibleBadge, { backgroundColor: isDark ? `${CYAN}33` : `${CYAN}1A` }]}>
                        <AppText style={[styles.projectFlexibleText, { color: CYAN }]}>{project.badge}</AppText>
                      </View>
                    )}
                  </View>
                </View>

                {/* Project Info */}
                <View style={styles.projectInfoRow}>
                  <View style={styles.projectInfoCol}>
                    <AppText style={[styles.infoLabel, { color: muted }]}>Min Holding</AppText>
                    <AppText style={[styles.infoValue, { color: textColor }]}>{project.minAmount}</AppText>
                  </View>
                </View>
                <View style={styles.projectInfoRow}>
                  <View style={styles.projectInfoCol}>
                    <AppText style={[styles.infoLabel, { color: muted }]}>Number of Participants</AppText>
                    <AppText style={[styles.infoValue, { color: textColor }]}>{project.participants}</AppText>
                  </View>
                </View>
                <View style={[styles.projectInfoRow, { marginBottom: 20 }]}>
                  <View style={styles.projectInfoCol}>
                    <AppText style={[styles.infoLabel, { color: muted }]}>Event Time</AppText>
                    <AppText style={[styles.infoValue, { color: textColor }]}>{project.eventTime}</AppText>
                  </View>
                </View>

                {/* Pools */}
                {project.pools.map((pool, pIdx) => (
                  <View key={pIdx} style={[styles.poolCard, { backgroundColor: isDark ? 'transparent' : colors.white, borderColor: cardBorder }]}>
                    <View style={styles.poolHeader}>
                      <FastImage source={getIconForCoin(pool.coinIcon)} style={styles.poolIcon} resizeMode="contain" />
                      <AppText style={[styles.poolName, { color: textColor }]}>{pool.name}</AppText>
                    </View>

                    <View style={styles.poolStatsRow}>
                      <View style={styles.poolStatCol}>
                        <AppText style={[styles.infoLabel, { color: muted }]}>{pool.allocationCoin}</AppText>
                        <AppText style={styles.aprValue}>{pool.allocation}</AppText>
                      </View>
                      <View style={[styles.poolStatCol, { alignItems: 'flex-end' }]}>
                        <AppText style={[styles.infoLabel, { color: muted }]}>Cumulative Rewards</AppText>
                        <AppText style={[styles.poolValue, { color: textColor }]}>
                          {pool.commitment} <AppText style={[styles.poolCoin, { color: textColor }]}>{pool.commitmentCoin}</AppText>
                        </AppText>
                      </View>
                    </View>

                    <View style={styles.poolStatsRow}>
                      <View style={styles.poolStatCol}>
                        <AppText style={[styles.infoLabel, { color: muted }]}>Staking Cap Limit</AppText>
                        <AppText style={[styles.poolValue, { color: textColor }]}>
                          {pool.cap} <AppText style={[styles.poolCoin, { color: textColor }]}>{pool.capCoin}</AppText>
                        </AppText>
                      </View>
                    </View>

                    <View style={[styles.poolDivider, { backgroundColor: rowBorder }]} />

                    <View style={styles.poolSummaryRow}>
                      <AppText style={[styles.infoLabel, { color: muted }]}>Staking Type</AppText>
                      <AppText style={[styles.poolSummaryValue, { color: textColor }]}>{pool.subPrice}</AppText>
                    </View>
                    <View style={styles.poolSummaryRow}>
                      <AppText style={[styles.infoLabel, { color: muted }]}>Number of Participants</AppText>
                      <AppText style={[styles.poolSummaryValue, { color: textColor }]}>{pool.poolParticipants}</AppText>
                    </View>

                    <TouchableOpacity style={[styles.tradeBtn, { backgroundColor: CYAN }]} onPress={() => NavigationService.navigate(TRADE_SCREEN)}>
                      <AppText style={styles.tradeBtnText}>Trade</AppText>
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
        height={500}
        openDuration={250}
        keyboardAvoidingViewEnabled={false}
        {...({ customModalProps: { statusBarTranslucent: true, navigationBarTranslucent: true } } as any)}
        closeOnDragDown={true}
        closeOnPressMask={true}
        customStyles={sheetContainerStyles}
      >
        <ThemedSheetChrome isDark={isDark} />

        <View style={{ alignItems: 'center', marginBottom: 8, marginTop: 2 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: sheetHandleColor }} />
        </View>

        <View style={styles.sheetHeader}>
          <AppText style={[styles.sheetTitle, { color: textColor }]}>FAQ</AppText>
          <TouchableOpacity
            onPress={() => faqSheetRef.current?.close()}
            style={[styles.sheetCloseCircle, { backgroundColor: sheetCloseCircleBg }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.75}
          >
            <FastImage
              source={closeIcon}
              resizeMode="contain"
              style={styles.sheetCloseIcon}
              tintColor={sheetIconTint}
            />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
          {STAKING_FAQ_ITEMS.map((item, index) => (
            <View
              key={String(index)}
              style={[
                styles.faqItemInner,
                { borderBottomColor: rowBorder },
                index === STAKING_FAQ_ITEMS.length - 1 && styles.faqItemInnerLast,
              ]}
            >
              <TouchableOpacity
                style={styles.faqQuestionRow}
                onPress={() => setFaqActiveIndex(faqActiveIndex === index ? null : index)}
                activeOpacity={0.7}
              >
                <AppText style={[styles.faqQuestion, { color: textColor }]}>{item.question}</AppText>
                <FastImage
                  source={downIcon}
                  resizeMode="contain"
                  style={[
                    styles.faqArrow,
                    { transform: [{ rotate: faqActiveIndex === index ? '180deg' : '0deg' }] },
                  ]}
                  tintColor={muted}
                />
              </TouchableOpacity>
              {faqActiveIndex === index && (
                <View style={styles.faqAnswer}>
                  <AppText style={[styles.faqAnswerText, { color: muted }]}>{item.answer}</AppText>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </RBSheet>

      <RBSheet
        ref={statusSheetRef}
        height={380}
        openDuration={250}
        keyboardAvoidingViewEnabled={false}
        {...({ customModalProps: { statusBarTranslucent: true, navigationBarTranslucent: true } } as any)}
        closeOnDragDown={true}
        closeOnPressMask={true}
        customStyles={sheetContainerStyles}
      >
        <ThemedSheetChrome isDark={isDark} />

        <View style={{ alignItems: 'center', marginBottom: 8, marginTop: 2 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: sheetHandleColor }} />
        </View>

        <View style={styles.sheetHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <FastImage source={usdtIcon} style={{ width: 24, height: 24, marginRight: 8 }} resizeMode="contain" />
            <AppText style={[styles.sheetTitle, { color: textColor }]}>Soft Staking</AppText>
          </View>
          <TouchableOpacity
            onPress={() => statusSheetRef.current?.close()}
            style={[styles.sheetCloseCircle, { backgroundColor: sheetCloseCircleBg }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.75}
          >
            <FastImage
              source={closeIcon}
              resizeMode="contain"
              style={styles.sheetCloseIcon}
              tintColor={sheetIconTint}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.statusSheetContent}>
          <View style={styles.statusRow}>
            <AppText style={[styles.statusLabel, { color: textColor }]}>Current Status</AppText>
            <View style={isSoftStakingEnabled ? styles.statusBadgeEnabled : [styles.statusBadgeDisabled, { backgroundColor: pillBg }]}>
              <AppText style={isSoftStakingEnabled ? styles.statusBadgeTextEnabled : [styles.statusBadgeTextDisabled, { color: muted }]}>
                {isSoftStakingEnabled ? 'Enabled' : 'Disabled'}
              </AppText>
            </View>
          </View>

          <AppText style={[styles.statusDesc, { color: muted }]}>
            {isSoftStakingEnabled
              ? "Disabling soft staking will stop your eligible assets from earning rewards. You can re-enable it anytime."
              : "Enable soft staking to automatically earn rewards on your eligible holdings. Rewards become eligible from the next day (00:00 UTC)."}
          </AppText>

          <TouchableOpacity
            style={[styles.statusCancelBtn, { backgroundColor: inputBg, borderColor: inputBorder, borderWidth: 1 }]}
            onPress={() => statusSheetRef.current?.close()}
          >
            <AppText style={{ color: textColor, fontSize: 16, fontFamily: fontFamilySemiBold }}>Cancel</AppText>
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
            <AppText style={{ color: colors.white, fontSize: 16, fontFamily: fontFamilySemiBold }}>
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
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backIcon: {
    width: 35,
    height: 35,
  },
  infoIcon: {
    width: 25,
    height: 25,
  },
  holdingsContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingRight: 4,
    paddingTop: 8,
    paddingBottom: 12,
  },
  heroLeft: {
    flex: 1,
    paddingRight: 10,
  },
  heroEyebrow: {
    fontSize: 15,
    fontFamily: fontFamilySemiBold,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: fontFamilySemiBold,
    lineHeight: 32,
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 20,
  },
  heroImage: {
    width: 180,
    height: 250,
  },
  stakeNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
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
    position: 'relative',
    paddingBottom: 8,
  },
  tabText: {
    fontSize: 16,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
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
    color: isDark ? 'rgba(255,255,255,0.55)' : '#9D9D9D',
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  projectFlexibleText: {
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
    color: colors.white,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: fontFamilyBold,
  },
  sheetCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCloseIcon: {
    width: 12,
    height: 12,
  },
  faqItemInner: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    paddingHorizontal: 4,
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
    fontFamily: fontFamilyMedium,
    marginRight: 12,
  },
  faqArrow: {
    width: 12,
    height: 12,
  },
  faqAnswer: {
    marginTop: 12,
  },
  faqAnswerText: {
    fontSize: 13,
    fontFamily: fontFamilyMedium,
    lineHeight: 20,
  },
  statusSheetContent: {
    paddingHorizontal: 4,
    paddingTop: 4,
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
    fontSize: 14,
    fontFamily: fontFamilySemiBold,
  },
  statusDesc: {
    fontSize: 14,
    fontFamily: fontFamilyMedium,
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
    marginBottom: 12,
  },
  statusEnableBtn: {
    backgroundColor: CYAN,
  },
  statusDisableBtn: {
    backgroundColor: '#FF4D4F',
  },
});

export default SoftStaking;
