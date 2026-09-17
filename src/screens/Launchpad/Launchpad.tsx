import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import FastImage from 'react-native-fast-image';
import { AppSafeAreaView, AppText, SEMI_BOLD } from '../../shared';
import { useTheme } from '../../hooks/useTheme';
import {
  back_ic,
  usdtIcon,
  bitcoinIcon,
  INFO,
  upIcon,
  downIcon,
  launchpad_acge
} from '../../helper/ImageAssets';
import NavigationService from '../../navigation/NavigationService';
import Toast from 'react-native-simple-toast';
import {
  LAUNCHPAD_DETAIL_SCREEN
} from '../../navigation/routes';
import { colors } from '../../theme/colors';
import { fontFamilyMedium, fontFamilySemiBold } from '../../theme/typography';
import { appOperation } from '../../appOperation';
import { IMAGE_BASE_URL } from '../../helper/Constants';
import RBSheet from 'react-native-raw-bottom-sheet';

const { width } = Dimensions.get('window');

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

const Launchpad = () => {
  const { colors: themeColors, isDark } = useTheme();
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
    <AppSafeAreaView style={{ backgroundColor: themeColors.background }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => NavigationService.goBack()} style={{ padding: 8 }}>
          <FastImage source={back_ic} style={styles.backIcon} tintColor={themeColors.text} resizeMode="contain" />
        </TouchableOpacity>
        <AppText style={[styles.headerTitle, { color: themeColors.text }]} weight={SEMI_BOLD}>Launchpad</AppText>
        <TouchableOpacity style={{ padding: 8 }}>
          <View style={{ width: 24 }} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <View style={styles.heroLeft}>
            <AppText style={[styles.heroTitle, { color: themeColors.text }]}>Launchpad</AppText>
            <AppText style={[styles.heroSubtitle, { color: themeColors.secondaryText }]}>Be Early to the Next Big Token Project</AppText>

            <View style={styles.heroBtnRow}>
              <TouchableOpacity style={styles.aboutBtn} onPress={() => faqSheetRef.current?.open()}>
                <AppText style={styles.aboutBtnText}>About Launchpad</AppText>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.heroRight}>
            <FastImage source={launchpad_acge} style={styles.heroImage} resizeMode="contain" />
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity onPress={() => setActiveTab('Ongoing')} style={styles.tabButton}>
            <AppText style={[styles.tabText, { color: activeTab === 'Ongoing' ? themeColors.text : themeColors.secondaryText, fontFamily: activeTab === 'Ongoing' ? fontFamilySemiBold : fontFamilyMedium }]}>Ongoing ({ongoingCount})</AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('Upcoming')} style={styles.tabButton}>
            <AppText style={[styles.tabText, { color: activeTab === 'Upcoming' ? themeColors.text : themeColors.secondaryText, fontFamily: activeTab === 'Upcoming' ? fontFamilySemiBold : fontFamilyMedium }]}>Upcoming ({upcomingCount})</AppText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('Ended')} style={styles.tabButton}>
            <AppText style={[styles.tabText, { color: activeTab === 'Ended' ? themeColors.text : themeColors.secondaryText, fontFamily: activeTab === 'Ended' ? fontFamilySemiBold : fontFamilyMedium }]}>Ended ({endedCount})</AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.projectsContainer}>
          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={themeColors.text} />
            </View>
          ) : currentProjects.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <AppText style={{ color: themeColors.secondaryText }}>No projects found for {activeTab}.</AppText>
            </View>
          ) : (
            currentProjects.map((project, idx) => (
              <TouchableOpacity
                key={project.id || idx}
                style={[styles.projectCard, { backgroundColor: isDark ? themeColors.background : '#F9F9F9', borderColor: isDark ? themeColors.border : '#EAEAEA' }]}
                onPress={() => NavigationService.navigate(LAUNCHPAD_DETAIL_SCREEN, { projectId: project.id })}
                activeOpacity={0.8}
              >
                {/* Status Badge */}
                <View style={[styles.projectStatusBadge, { backgroundColor: isDark ? themeColors.card : '#EAEAEA' }]}>
                  <AppText style={[styles.projectStatusText, { color: isDark ? themeColors.secondaryText : '#888' }]}>{project.status}</AppText>
                </View>

                {/* Project Header */}
                <View style={styles.projectHeader}>
                  <FastImage source={getIconForCoin(project.logo, project.iconPath)} style={styles.projectLogo} resizeMode="contain" />
                  <View>
                    <AppText style={[styles.projectName, { color: themeColors.text }]}>{project.name}</AppText>
                  </View>
                </View>

                {/* Project Info */}
                <View style={styles.projectInfoRow}>
                  <View style={styles.projectInfoCol}>
                    <AppText style={styles.infoLabel}>Subscription Price</AppText>
                    {project.subscriptionPrice.map((price: string, i: number) => (
                      <AppText key={i} style={[styles.infoValue, { color: themeColors.text }]}>{price}</AppText>
                    ))}
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
                {project.pools.map((pool: any, pIdx: number) => (
                  <View key={pIdx} style={[styles.poolCard, { backgroundColor: isDark ? 'transparent' : colors.white, borderColor: isDark ? themeColors.border : '#EAEAEA' }]}>
                    <View style={styles.poolHeader}>
                      <FastImage source={getIconForCoin(pool.coinIcon, pool.iconPath)} style={styles.poolIcon} resizeMode="contain" />
                      <AppText style={[styles.poolName, { color: themeColors.text }]}>{pool.name}</AppText>
                    </View>

                    <View style={styles.poolStatsRow}>
                      <View style={styles.poolStatCol}>
                        <AppText style={styles.infoLabel}>Allocation</AppText>
                        <AppText style={[styles.poolValue, { color: themeColors.text }]}>
                          {pool.allocation} <AppText style={[styles.poolCoin, { color: themeColors.text }]}>{pool.allocationCoin}</AppText>
                        </AppText>
                      </View>
                      <View style={[styles.poolStatCol, { alignItems: 'flex-end' }]}>
                        <AppText style={styles.infoLabel}>Commitment</AppText>
                        <AppText style={[styles.poolValue, { color: themeColors.text }]}>
                          {pool.commitment} <AppText style={[styles.poolCoin, { color: themeColors.text }]}>{pool.commitmentCoin}</AppText>
                        </AppText>
                      </View>
                    </View>

                    <View style={styles.poolStatsRow}>
                      <View style={styles.poolStatCol}>
                        <AppText style={styles.infoLabel}>Cap per Subscriber</AppText>
                        <AppText style={[styles.poolValue, { color: themeColors.text }]}>
                          {pool.cap} <AppText style={[styles.poolCoin, { color: themeColors.text }]}>{pool.capCoin}</AppText>
                        </AppText>
                      </View>
                    </View>

                    <View style={[styles.poolDivider, { backgroundColor: isDark ? '#303744' : '#EAEAEA' }]} />

                    <View style={styles.poolSummaryRow}>
                      <AppText style={styles.infoLabel}>Subscription Price</AppText>
                      <AppText style={[styles.poolSummaryValue, { color: themeColors.text }]}>{pool.subPrice}</AppText>
                    </View>
                    <View style={styles.poolSummaryRow}>
                      <AppText style={styles.infoLabel}>Number of Participants</AppText>
                      <AppText style={[styles.poolSummaryValue, { color: themeColors.text }]}>{pool.poolParticipants}</AppText>
                    </View>

                    <TouchableOpacity style={[styles.tradeBtn, { backgroundColor: isDark ? '#303237' : '#F0F0F0' }]}
                      onPress={() => NavigationService.navigate(LAUNCHPAD_DETAIL_SCREEN, { projectId: project.id })}
                    >
                      <AppText style={[styles.tradeBtnText, { color: themeColors.text }]}>Trade</AppText>
                    </TouchableOpacity>
                  </View>
                ))}
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* FAQ Sheet */}
      <RBSheet
        ref={faqSheetRef}
        keyboardAvoidingViewEnabled={false}
        {...({ customModalProps: { statusBarTranslucent: true } } as any)}
        closeOnDragDown={true}
        closeOnPressMask={true}
        height={500}
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
          <AppText style={[styles.modalTitle, { color: themeColors.text }]}>About Launchpad</AppText>
          <TouchableOpacity onPress={() => faqSheetRef.current?.close()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <AppText style={[styles.modalCloseText, { color: themeColors.text }]}>×</AppText>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {LAUNCHPAD_FAQ_ITEMS.map((item, index) => (
            <View key={String(index)} style={[styles.faqItemInner, { borderBottomColor: isDark ? themeColors.border : '#F0F0F5' }, index === LAUNCHPAD_FAQ_ITEMS.length - 1 && styles.faqItemInnerLast]}>
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
    </AppSafeAreaView>
  );
};

const getStyles = (themeColors: any, isDark: boolean) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 56,
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  headerTitle: {
    fontSize: 18,
  },
  heroContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroLeft: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: fontFamilySemiBold,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: fontFamilyMedium,
    marginBottom: 16,
    lineHeight: 20,
  },
  heroBtnRow: {
    flexDirection: 'row',
  },
  aboutBtn: {
    backgroundColor: isDark ? colors.themeElevationColor : '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  aboutBtnText: {
    color: isDark ? themeColors.text : '#333',
    fontSize: 14,
    fontFamily: fontFamilySemiBold,
  },
  heroRight: {
    width: 120,
    height: 120,
    marginLeft: 10,
  },
  heroImage: {
    width: '100%',
    height: '100%',
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
  },
  tabText: {
    fontSize: 16,
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
    color: isDark ? themeColors.secondaryText : '#888',
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
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  tradeBtnText: {
    fontSize: 16,
    fontFamily: fontFamilySemiBold,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? themeColors.border : '#F0F0F5',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fontFamilySemiBold,
  },
  modalCloseText: {
    fontSize: 28,
    lineHeight: 32,
    color: isDark ? themeColors.secondaryText : '#999',
  },
  modalList: {
    paddingHorizontal: 20,
  },
  faqItemInner: {
    borderBottomWidth: 1,
    paddingVertical: 16,
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
    fontSize: 16,
    flex: 1,
    fontFamily: fontFamilySemiBold,
  },
  faqArrow: {
    width: 12,
    height: 12,
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
});

export default Launchpad;
