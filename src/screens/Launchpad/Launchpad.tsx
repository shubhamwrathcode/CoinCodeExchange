import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import FastImage from 'react-native-fast-image';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../shared';
import { useTheme } from '../../hooks/useTheme';
import {
  back_ic,
  usdtIcon,
  bitcoinIcon,
  INFO,
  downIcon,
  launchpadBanner,
  closeIcon,
} from '../../helper/ImageAssets';
import NavigationService from '../../navigation/NavigationService';
import {
  LAUNCHPAD_DETAIL_SCREEN
} from '../../navigation/routes';
import { colors } from '../../theme/colors';
import { fontFamilyBold, fontFamilyMedium, fontFamilySemiBold } from '../../theme/typography';
import { appOperation } from '../../appOperation';
import { IMAGE_BASE_URL } from '../../helper/Constants';
import RBSheet from 'react-native-raw-bottom-sheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CYAN = colors.cyanTheme || colors.cyan || '#0AA8C5';
const BANNER_IMAGE_HEIGHT = Math.round(SCREEN_WIDTH * 0.72);

const LAUNCHPAD_FAQ_ITEMS = [
  { question: "1. What is Launchpad?", answer: "Launchpad is a platform where users can stake their assets or provide liquidity to earn rewards in new project tokens. Users can lock specified tokens in the Launchpad pool to receive corresponding project token rewards." },
  { question: "2. How can I participate in Launchpad?", answer: "Log in to your account. Enter the 'Launchpad' page and choose the project you want to participate in. Note that you will not receive airdrop bonuses until the minimum trading volume requirement is met." },
  { question: "3. Why are there staking caps in Launchpad? How to increase them?", answer: "To ensure the fairness and engagement of Launchpad, different staking caps have been set for users based on their trading volumes. The system will automatically match you to the appropriate trading volume tier according to your total trading volume (denominated in USD) over the past 60 days. The higher your trading volume, the higher your staking cap. 60-Day Total Trading Volume = 60-Day Spot Trading Volume + 60-Day Futures Trading Volume × 40%. The data is updated in real-time. In case of a delay in the update, please check again one hour later." },
  { question: "4. Which coins can I stake in Launchpad pool?", answer: "The tokens eligible for participation will be announced on the mining page of each project. Please visit the corresponding page of Launchpad to view more details." },
  { question: "5. How to get airdrop bonuses?", answer: "When you stake BTC, GT, ETH, and USDT in Launchpad, you'll get a bonus, which is still subject to the individual reward cap." },
  { question: "6. How many tokens will be rewarded?", answer: "Hourly staking reward = (Individual latest 1-hour valid staking amount / Total pool staking amount) × Hourly reward pool.\n* System will take snapshots of individual staking amounts each hour and take the average as the valid staking amount." },
  { question: "7. Why didn't I receive a bonus after subscribing to Simple Earn Fixed Term when staking?", answer: "If you've reached the reward cap per hour, no more bonuses will be distributed." },
  { question: "8. How are rewards distributed?", answer: "System will take snapshots of individual staking amounts and distribute token rewards to eligible users. Hourly earnings will be distributed into users' spot accounts." },
  { question: "9. When will the staked assets be redeemed?", answer: "After the user redeems in advance or the staking is completed, the staked assets will be transferred to Simple Earn by default. If this option is unchecked, the staked assets will be redeemed into spot assets.\n* If the amount of redeemed assets is too small and does not meet the minimum subscription amount of Simple Earn, the assets will be automatically transferred to spot assets.\n* If Simple Earn does not support the subscription of the redeemed token, the assets will also be automatically transferred to spot assets." },
  { question: "10. Can I redeem my staked assets at any time?", answer: "The system will take multiple snapshots of personal staking amounts each hour and calculate the valid staking amount. However, early redemption may result in the loss of accrued rewards. Please maintain stable staking amounts to ensure maximum rewards." },
];

const mapLaunchpadStatus = (status: string) => {
  switch (String(status || '').toUpperCase()) {
    case 'LIVE': return 'Ongoing';
    case 'UPCOMING': return 'Upcoming';
    case 'ENDED': return 'Ended';
    default: return 'Ended';
  }
};

const formatLaunchpadTime = (value: any) => {
  if (!value) return '--';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const normalizeLaunchpad = (item: any) => {
  const tokenSymbol = item?.tokenSymbol || item?.baseCurrency?.short_name || 'Token';
  const acceptedCurrency = item?.acceptedCurrency || item?.quoteCurrency?.short_name || 'USDT';
  const tokenPrice = item?.tokenPrice ?? 0;
  const participants = (item?.totalParticipants ?? 0).toLocaleString();
  const subPrice = `1 ${tokenSymbol} = ${tokenPrice} ${acceptedCurrency}`;

  const logoPath =
    item?.logo ||
    item?.icon_path ||
    item?.iconPath ||
    item?.icon_url ||
    item?.baseCurrency?.icon_path ||
    item?.baseCurrency?.icon_url ||
    item?.baseCurrency?.icon ||
    '';

  return {
    id: item?._id,
    logo: tokenSymbol,
    iconPath: logoPath,
    name: tokenSymbol,
    status: mapLaunchpadStatus(item?.status),
    subscriptionPrice: [subPrice],
    participants,
    eventTime: formatLaunchpadTime(item?.startTime),
    totalRaised: Number(item?.totalRaised ?? 0) || 0,
    totalParticipants: Number(item?.totalParticipants ?? 0) || 0,
    pools: [
      {
        name: acceptedCurrency,
        coinIcon: acceptedCurrency,
        iconPath: item?.quoteCurrency?.icon_path || item?.quoteCurrency?.icon_url || item?.quoteCurrency || '',
        allocation: (item?.totalSupply ?? 0).toLocaleString(),
        allocationCoin: tokenSymbol,
        commitment: (item?.totalRaised ?? 0).toLocaleString(),
        commitmentCoin: acceptedCurrency,
        cap: (item?.maxBuy ?? 0).toLocaleString(),
        capCoin: acceptedCurrency,
        subPrice,
        poolParticipants: participants
      }
    ]
  };
};

const formatCompact = (n: number) => {
  if (!n || n <= 0) return '0';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n}`;
};

const formatParticipants = (n: number) => {
  if (!n || n <= 0) return '0';
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return String(n);
};

const Launchpad = () => {
  const { colors: themeColors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles(themeColors, isDark), [themeColors, isDark]);
  const [activeTab, setActiveTab] = useState<'Ongoing' | 'Upcoming' | 'Ended'>('Ongoing');
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const faqSheetRef = useRef<any>(null);
  const [faqActiveIndex, setFaqActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchLaunchpads();
  }, []);

  const fetchLaunchpads = async () => {
    setLoading(true);
    try {
      const res: any = await appOperation.customer.Launchpad_Projects();

      if (res?.success && Array.isArray(res?.data)) {
        setProjects(res.data.map(normalizeLaunchpad));
      } else {
        setProjects([]);
      }
    } catch (e) {
      console.log('Launchpad error', e);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const ongoingCount = projects.filter(p => p.status === 'Ongoing').length;
  const upcomingCount = projects.filter(p => p.status === 'Upcoming').length;
  const endedCount = projects.filter(p => p.status === 'Ended').length;

  const currentProjects = projects.filter(p => p.status === activeTab);

  const bannerStats = useMemo(() => {
    const totalRaised = projects.reduce((sum, p) => sum + (Number(p.totalRaised) || 0), 0);
    const totalParticipants = projects.reduce((sum, p) => sum + (Number(p.totalParticipants) || 0), 0);
    return {
      raised: totalRaised > 0 ? formatCompact(totalRaised) : '$2.6B',
      participants: totalParticipants > 0 ? formatParticipants(totalParticipants) : '110.09K',
    };
  }, [projects]);

  const muted = isDark ? themeColors.secondaryText : '#888';
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : '#F9F9F9';
  const cardBorder = isDark ? 'rgba(255,255,255,0.15)' : '#EAEAEA';

  // Match TradingDataModal / ReferAndEarn sheet theme
  const sheetTextColor = isDark ? '#FFFFFF' : '#000000';
  const sheetSubTextColor = isDark ? 'rgba(255,255,255,0.55)' : '#9D9D9D';
  const sheetRowBorderColor = isDark ? 'rgba(255,255,255,0.08)' : '#EEEEEE';
  const sheetCloseCircleBg = isDark ? 'rgba(255,255,255,0.12)' : '#E8E8E8';
  const sheetIconTint = isDark ? colors.white : colors.black;
  const sheetHandleColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)';

  const getIconForCoin = (symbol: string, path: any) => {
    const sym = String(symbol || '').toUpperCase();
    const base = String(IMAGE_BASE_URL || 'https://backend.arabglobal.ae/').replace(/\/+$/, '');

    if (path) {
      if (typeof path === 'object' && path !== null) {
        const raw = path.icon_url || path.icon_path || path.icon || path.logo;
        if (raw) {
          const str = String(raw).trim();
          if (/^https?:\/\//i.test(str) || str.startsWith('data:')) return { uri: str };
          if (str.startsWith('//')) return { uri: `https:${str}` };
          const rel = str.replace(/^\/+/, '');
          if (rel) return { uri: `${base}/${rel}` };
        }
      } else {
        const t = String(path).trim();
        if (t && t !== 'undefined' && t !== 'null' && t !== '[object Object]') {
          if (/^https?:\/\//i.test(t) || t.startsWith('data:')) return { uri: t };
          if (t.startsWith('//')) return { uri: `https:${t}` };
          const rel = t.replace(/^\/+/, '');
          if (rel) return { uri: `${base}/${rel}` };
        }
      }
    }
    if (sym === 'BTC') return bitcoinIcon;
    if (sym === 'USDT') return usdtIcon;
    return usdtIcon;
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Absolute header — same pattern as CoinCode LaunchpadScreen */}
      <View style={[styles.headerAbsolute, { top: Math.max(insets.top, 10) }]}>
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
          <FastImage source={INFO} style={styles.infoIcon} tintColor={themeColors.text} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Banner — matches CoinCode LaunchpadScreen layout */}
        <View style={[styles.bannerContainer, { paddingTop: Math.max(insets.top, 10) + 44 }]}>
          <View style={styles.bannerTextContainer}>
            <AppText style={[styles.bannerTitle, { color: themeColors.text }]}>Launchpad</AppText>
            <AppText style={[styles.bannerSubtitle, { color: muted }]}>
              Participate in token sales, support innovative projects and earn exclusive rewards.
            </AppText>

            {/* <View style={styles.bannerStatsRow}>
              <View style={styles.bannerStatItem}>
                <AppText style={[styles.bannerStatValue, { color: themeColors.text }]}>{bannerStats.raised}</AppText>
                <AppText style={[styles.bannerStatLabel, { color: muted }]}>Total Raised</AppText>
              </View>
              <View style={styles.bannerStatItem}>
                <AppText style={[styles.bannerStatValue, { color: themeColors.text }]}>{bannerStats.participants}</AppText>
                <AppText style={[styles.bannerStatLabel, { color: muted }]}>Total Participants</AppText>
              </View>
            </View> */}
          </View>

          <View style={styles.bannerImageWrap}>
            <FastImage
              source={launchpadBanner}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity onPress={() => setActiveTab('Ongoing')} style={styles.tabButton}>
            <AppText style={[styles.tabText, { color: activeTab === 'Ongoing' ? themeColors.text : muted, fontFamily: activeTab === 'Ongoing' ? fontFamilySemiBold : fontFamilyMedium }]}>Ongoing ({ongoingCount})</AppText>
            {activeTab === 'Ongoing' && <View style={[styles.tabUnderline, { backgroundColor: CYAN }]} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('Upcoming')} style={styles.tabButton}>
            <AppText style={[styles.tabText, { color: activeTab === 'Upcoming' ? themeColors.text : muted, fontFamily: activeTab === 'Upcoming' ? fontFamilySemiBold : fontFamilyMedium }]}>Upcoming ({upcomingCount})</AppText>
            {activeTab === 'Upcoming' && <View style={[styles.tabUnderline, { backgroundColor: CYAN }]} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('Ended')} style={styles.tabButton}>
            <AppText style={[styles.tabText, { color: activeTab === 'Ended' ? themeColors.text : muted, fontFamily: activeTab === 'Ended' ? fontFamilySemiBold : fontFamilyMedium }]}>Ended ({endedCount})</AppText>
            {activeTab === 'Ended' && <View style={[styles.tabUnderline, { backgroundColor: CYAN }]} />}
          </TouchableOpacity>
        </View>

        <View style={styles.projectsContainer}>
          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={CYAN} />
            </View>
          ) : currentProjects.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <AppText style={{ color: muted }}>No projects found for {activeTab}.</AppText>
            </View>
          ) : (
            currentProjects.map((project, idx) => (
              <TouchableOpacity
                key={project.id || idx}
                style={[styles.projectCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
                onPress={() => NavigationService.navigate(LAUNCHPAD_DETAIL_SCREEN, { projectId: project.id })}
                activeOpacity={0.8}
              >
                <View style={[styles.projectStatusBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#EAEAEA' }]}>
                  <AppText style={[styles.projectStatusText, { color: muted }]}>{project.status}</AppText>
                </View>

                <View style={styles.projectHeader}>
                  <FastImage source={getIconForCoin(project.logo, project.iconPath)} style={styles.projectLogo} resizeMode="contain" />
                  <View>
                    <AppText style={[styles.projectName, { color: themeColors.text }]}>{project.name}</AppText>
                  </View>
                </View>

                <View style={styles.projectInfoRow}>
                  <View style={styles.projectInfoCol}>
                    <AppText style={[styles.infoLabel, { color: muted }]}>Subscription Price</AppText>
                    {project.subscriptionPrice.map((price: string, i: number) => (
                      <AppText key={i} style={[styles.infoValue, { color: themeColors.text }]}>{price}</AppText>
                    ))}
                  </View>
                </View>
                <View style={styles.projectInfoRow}>
                  <View style={styles.projectInfoCol}>
                    <AppText style={[styles.infoLabel, { color: muted }]}>Number of Participants</AppText>
                    <AppText style={[styles.infoValue, { color: themeColors.text }]}>{project.participants}</AppText>
                  </View>
                </View>
                <View style={[styles.projectInfoRow, { marginBottom: 20 }]}>
                  <View style={styles.projectInfoCol}>
                    <AppText style={[styles.infoLabel, { color: muted }]}>Event Time</AppText>
                    <AppText style={[styles.infoValue, { color: themeColors.text }]}>{project.eventTime}</AppText>
                  </View>
                </View>

                {project.pools.map((pool: any, pIdx: number) => (
                  <View key={pIdx} style={[styles.poolCard, { backgroundColor: isDark ? 'transparent' : colors.white, borderColor: cardBorder }]}>
                    <View style={styles.poolHeader}>
                      <FastImage source={getIconForCoin(pool.coinIcon, pool.iconPath)} style={styles.poolIcon} resizeMode="contain" />
                      <AppText style={[styles.poolName, { color: themeColors.text }]}>{pool.name}</AppText>
                    </View>

                    <View style={styles.poolStatsRow}>
                      <View style={styles.poolStatCol}>
                        <AppText style={[styles.infoLabel, { color: muted }]}>Allocation</AppText>
                        <AppText style={[styles.poolValue, { color: themeColors.text }]}>
                          {pool.allocation} <AppText style={[styles.poolCoin, { color: themeColors.text }]}>{pool.allocationCoin}</AppText>
                        </AppText>
                      </View>
                      <View style={[styles.poolStatCol, { alignItems: 'flex-end' }]}>
                        <AppText style={[styles.infoLabel, { color: muted }]}>Commitment</AppText>
                        <AppText style={[styles.poolValue, { color: themeColors.text }]}>
                          {pool.commitment} <AppText style={[styles.poolCoin, { color: themeColors.text }]}>{pool.commitmentCoin}</AppText>
                        </AppText>
                      </View>
                    </View>

                    <View style={styles.poolStatsRow}>
                      <View style={styles.poolStatCol}>
                        <AppText style={[styles.infoLabel, { color: muted }]}>Cap per Subscriber</AppText>
                        <AppText style={[styles.poolValue, { color: themeColors.text }]}>
                          {pool.cap} <AppText style={[styles.poolCoin, { color: themeColors.text }]}>{pool.capCoin}</AppText>
                        </AppText>
                      </View>
                    </View>

                    <View style={[styles.poolDivider, { backgroundColor: isDark ? themeColors.border : '#EAEAEA' }]} />

                    <View style={styles.poolSummaryRow}>
                      <AppText style={[styles.infoLabel, { color: muted }]}>Subscription Price</AppText>
                      <AppText style={[styles.poolSummaryValue, { color: themeColors.text }]}>{pool.subPrice}</AppText>
                    </View>
                    <View style={styles.poolSummaryRow}>
                      <AppText style={[styles.infoLabel, { color: muted }]}>Number of Participants</AppText>
                      <AppText style={[styles.poolSummaryValue, { color: themeColors.text }]}>{pool.poolParticipants}</AppText>
                    </View>

                    <TouchableOpacity
                      style={[styles.tradeBtn, { backgroundColor: CYAN }]}
                      onPress={() => NavigationService.navigate(LAUNCHPAD_DETAIL_SCREEN, { projectId: project.id })}
                    >
                      <AppText style={styles.tradeBtnText}>Trade</AppText>
                    </TouchableOpacity>
                  </View>
                ))}
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* FAQ Sheet — theme matches TradingDataModal */}
      <RBSheet
        ref={faqSheetRef}
        height={500}
        openDuration={250}
        closeOnDragDown={true}
        closeOnPressMask={true}
        {...({ customModalProps: { statusBarTranslucent: true, navigationBarTranslucent: true } } as any)}
        customStyles={{
          wrapper: {
            backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)',
          },
          draggableIcon: {
            backgroundColor: 'transparent',
            height: 0,
          },
          container: {
            backgroundColor: 'transparent',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
            paddingHorizontal: 14,
            paddingTop: 8,
            paddingBottom: 10,
          },
        }}
      >
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

        <View style={{ alignItems: 'center', marginBottom: 8, marginTop: 2 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: sheetHandleColor }} />
        </View>

        <View style={styles.sheetHeader}>
          <AppText style={[styles.sheetTitle, { color: sheetTextColor }]}>About Launchpad</AppText>
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

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          {LAUNCHPAD_FAQ_ITEMS.map((item, index) => (
            <View
              key={String(index)}
              style={[
                styles.faqItemInner,
                { borderBottomColor: sheetRowBorderColor },
                index === LAUNCHPAD_FAQ_ITEMS.length - 1 && styles.faqItemInnerLast,
              ]}
            >
              <TouchableOpacity
                style={styles.faqQuestionRow}
                onPress={() => setFaqActiveIndex(faqActiveIndex === index ? null : index)}
                activeOpacity={0.7}
              >
                <AppText style={[styles.faqQuestion, { color: sheetTextColor }]}>{item.question}</AppText>
                <FastImage
                  source={downIcon}
                  resizeMode="contain"
                  style={[
                    styles.faqArrow,
                    { transform: [{ rotate: faqActiveIndex === index ? '180deg' : '0deg' }] },
                  ]}
                  tintColor={sheetSubTextColor}
                />
              </TouchableOpacity>
              {faqActiveIndex === index && (
                <View style={styles.faqAnswer}>
                  <AppText style={[styles.faqAnswerText, { color: sheetSubTextColor }]}>{item.answer}</AppText>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </RBSheet>
    </View>
  );
};

const getStyles = (themeColors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  headerAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backIcon: {
    width: 35,
    height: 35,
  },
  infoIcon: {
    width: 25,
    height: 25,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  bannerContainer: {
    width: '100%',
    position: 'relative',
  },
  bannerTextContainer: {
    alignItems: 'center',
    zIndex: 2,
    paddingHorizontal: 20,
  },
  bannerTitle: {
    fontSize: 24,
    fontFamily: fontFamilyBold,
    textAlign: 'center',
  },
  bannerSubtitle: {
    fontSize: 12,
    fontFamily: fontFamilyMedium,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
    lineHeight: 18,
  },
  bannerStatsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  bannerStatItem: {
    alignItems: 'center',
    marginHorizontal: 16,
  },
  bannerStatValue: {
    fontSize: 18,
    fontFamily: fontFamilyBold,
  },
  bannerStatLabel: {
    fontSize: 10,
    fontFamily: fontFamilyMedium,
    marginTop: 4,
  },
  bannerImageWrap: {
    width: SCREEN_WIDTH,
    height: BANNER_IMAGE_HEIGHT,
    marginTop: 10,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  bannerImage: {
    width: SCREEN_WIDTH,
    height: BANNER_IMAGE_HEIGHT,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? themeColors.border : '#EAEAEA',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  tabButton: {
    paddingVertical: 12,
    marginRight: 24,
    position: 'relative',
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
  projectsContainer: {
    paddingHorizontal: 20,
  },
  projectCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  projectStatusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  projectStatusText: {
    fontSize: 12,
    fontFamily: fontFamilySemiBold,
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  projectLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  projectName: {
    fontSize: 20,
    fontFamily: fontFamilySemiBold,
  },
  projectInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  projectInfoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: fontFamilyMedium,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: fontFamilySemiBold,
  },
  poolCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  poolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  poolIcon: {
    width: 28,
    height: 28,
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
  poolValue: {
    fontSize: 16,
    fontFamily: fontFamilySemiBold,
  },
  poolCoin: {
    fontSize: 12,
    fontFamily: fontFamilyMedium,
  },
  poolDivider: {
    height: 1,
    marginBottom: 16,
  },
  poolSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  poolSummaryValue: {
    fontSize: 14,
    fontFamily: fontFamilyMedium,
  },
  tradeBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  tradeBtnText: {
    fontSize: 16,
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
    fontSize: 14,
    flex: 1,
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
});

export default Launchpad;
