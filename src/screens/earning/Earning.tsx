import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Dimensions, TextInput, FlatList } from 'react-native';
import FastImage from 'react-native-fast-image';
import { AppSafeAreaView, AppText, SEMI_BOLD } from '../../shared';
import { useTheme } from '../../hooks/useTheme';
import {
  back_ic, searchIcon, historyIcon, eye_open_icon, eye_close_icon,
  launchpad, referAndEarn, vip, simpleEarn, stakingNew,
  upDown, NO_NOTIFICATION_ICON, closeIcon, usdtIcon,
  infoNewIc,
  INFO
} from '../../helper/ImageAssets';
import NavigationService from '../../navigation/NavigationService';
import {
  LAUNCHPAD_SCREEN,
  SOFT_STAKING_SCREEN,
  STAKING_DASHBOARD_SCREEN,
  VIP_SERVICES_SCREEN,
  REFER_AND_EARN_SCREEN,
} from '../../navigation/routes';
import Toast from 'react-native-simple-toast';
import { colors } from '../../theme/colors';
import { fontFamilyMedium, fontFamilySemiBold } from '../../theme/typography';
import RBSheet from 'react-native-raw-bottom-sheet';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { getStaking } from '../../actions/homeActions';
import { IMAGE_BASE_URL } from '../../helper/Constants';
import { appOperation } from '../../appOperation';

const { width } = Dimensions.get('window');

const gridItems = [
  { id: 1, title: 'Launchpad', icon: launchpad, route: LAUNCHPAD_SCREEN },
  { id: 2, title: 'Refer & Earn', icon: referAndEarn, route: REFER_AND_EARN_SCREEN },
  { id: 3, title: 'VIP', icon: vip, route: VIP_SERVICES_SCREEN },
  { id: 5, title: 'Staking', icon: stakingNew, route: STAKING_DASHBOARD_SCREEN },
  { id: 6, title: 'Soft Staking', icon: stakingNew, route: SOFT_STAKING_SCREEN },
  // { id: 4, title: 'Simple Earn', icon: simpleEarn },
];

const STAKING_TYPE_LABELS: any = {
  LOCKED: "Locked Staking",
  FLEXIBLE: "Flexible Staking",
  TOKENIZED: "Tokenized Staking",
};

const STAKING_FAQ_ITEMS = [
  {
    question: "What is Staking?",
    answer: "Staking is the process of locking up cryptocurrency assets to participate in transaction validation on a Proof-of-Stake (PoS) blockchain. In return for securing the network, participants earn staking rewards."
  },
  {
    question: "What is Proof of Stake (PoS)?",
    answer: "Proof of Stake (PoS) is a consensus mechanism used by blockchains to agree on the validity of transactions. Instead of using computing power like Proof of Work (mining), PoS relies on users who 'stake' their tokens to secure the network."
  },
  {
    question: "When will I receive my staking return?",
    answer: "Staking returns are typically calculated daily and distributed according to the rules of the specific product. Depending on the asset, rewards may be credited to your account daily or at the end of a fixed staking period."
  },
  {
    question: "Why choose AGCE Staking?",
    answer: "AGCE Staking offers a safe and seamless experience with competitive yields across a wide pool of top PoS products. We provide a low threshold for entry, 100% Proof of Reserve security, and a flexible redemption process."
  },
  {
    question: "How is the Est. APR calculated?",
    answer: "The Estimated Annual Percentage Rate (APR) is dynamically calculated based on the underlying blockchain's on-chain reward rates, total network participation, and platform conditions. The actual rate may fluctuate over time."
  }
];

const formatApr = (pkg: any) => {
  const min = pkg?.aprMin;
  const max = pkg?.aprMax ?? pkg?.returnPercentage;
  if (min != null && max != null && min !== max) {
    return `${min}% - ${max}%`;
  }
  if (max != null) return `${max}%`;
  return "—";
};

const Earning = () => {
  const { colors: themeColors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(themeColors, isDark), [themeColors, isDark]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHide, setIsHide] = useState(false);

  // Staking logic
  const sheetRef = useRef<any>(null);
  const planSheetRef = useRef<any>(null);
  const faqSheetRef = useRef<any>(null);
  const dispatch = useDispatch<any>();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [planPackages, setPlanPackages] = useState<any[]>([]);
  const [planLoading, setPlanLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(true);
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setExpandedFaqIndex(expandedFaqIndex === index ? null : index);
  };

  const { stakingHome, coinBalance } = useSelector((state: any) => state.home);

  useFocusEffect(
    useCallback(() => {
      setIsListLoading(true);
      Promise.resolve(dispatch(getStaking())).finally(() => {
        setIsListLoading(false);
      });
    }, [dispatch])
  );

  const packages = Array.isArray(stakingHome?.data) ? stakingHome.data : (Array.isArray(stakingHome) ? stakingHome : []);

  const filteredPackages = useMemo(() => {
    let filtered = packages.filter((pkg: any) =>
      String(pkg?.stakingType || "").toUpperCase() === "LOCKED" && pkg?.status === "ACTIVE"
    );

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((pkg: any) => {
        const currency = String(pkg?.currency || "").toLowerCase();
        const fullName = String(pkg?.currencyFullName || "").toLowerCase();
        return currency.includes(q) || fullName.includes(q);
      });
    }

    const seen = new Set();
    return filtered.filter((pkg: any) => {
      const key = String(pkg?.currency || "").toUpperCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [packages, searchQuery, coinBalance]);

  const openSheet = (pkg: any) => {
    setSelectedPackage(pkg);
    sheetRef.current?.open();
  };

  const openPlanSheet = async () => {
    if (!selectedPackage?.currency) return;
    sheetRef.current?.close();
    setPlanPackages([]);
    setPlanLoading(true);

    setTimeout(() => {
      planSheetRef.current?.open();
    }, 400);

    try {
      const res: any = await appOperation.customer.Staking_GetPackagesForCoin(selectedPackage.currency);
      if (res?.success && Array.isArray(res.data)) {
        const lockedPackages = res.data.filter(
          (pkg: any) => String(pkg?.stakingType || "").toUpperCase() === "LOCKED" && pkg?.status === "ACTIVE"
        );
        setPlanPackages(lockedPackages);
      } else {
        setPlanPackages([]);
      }
    } catch (error) {
      setPlanPackages([]);
    } finally {
      setPlanLoading(false);
    }
  };

  const openStakeSheet = (plan: any) => {
    planSheetRef.current?.close();
    setTimeout(() => {
      NavigationService.navigate('StakingPurchase', { plan });
    }, 400);
  };

  const handleGridPress = (item: any) => {
    if (item.route) {
      NavigationService.navigate(item.route);
    } else {
      Toast.showWithGravity('Coming soon', Toast.SHORT, Toast.BOTTOM);
    }
  };

  return (
    <>
      <AppSafeAreaView style={{ backgroundColor: themeColors.background }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => NavigationService.goBack()} style={{ paddingRight: 12 }}>
              <FastImage source={back_ic} style={styles.backIcon} tintColor={themeColors.text} resizeMode="contain" />
            </TouchableOpacity>
            <AppText style={[styles.title, { color: themeColors.text }]} weight={SEMI_BOLD}>Earn</AppText>
          </View>

        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Top Assets Area */}
          <View style={styles.assetsContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <AppText style={{ color: themeColors.secondaryText, fontSize: 16, marginRight: 6 }}>Total Assets</AppText>
                  <TouchableOpacity onPress={() => setIsHide(!isHide)} style={{ padding: 4 }}>
                    <FastImage source={isHide ? eye_close_icon : eye_open_icon} style={{ width: 16, height: 16 }} tintColor={themeColors.secondaryText} resizeMode="contain" />
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8 }}>
                  <AppText style={{ color: themeColors.text, fontSize: 28, fontFamily: fontFamilySemiBold, marginRight: 6 }}>
                    {isHide ? '******' : '0.00'}
                  </AppText>
                  <AppText style={{ color: themeColors.text, fontSize: 16, marginBottom: 4 }}>USD</AppText>
                </View>
                <AppText style={{ color: themeColors.secondaryText, fontSize: 12, borderBottomWidth: 1, borderBottomColor: themeColors.secondaryText, borderStyle: 'dotted', alignSelf: 'flex-start' }}>
                  Yesterday's PnL {isHide ? '******' : '+0.00 USD'}
                </AppText>
              </View>
              {/* <TouchableOpacity
                style={{ padding: 4 }}
                onPress={() => faqSheetRef.current?.open()}
              >
                <FastImage source={INFO} style={{ width: 20, height: 20 }} tintColor={themeColors.text} resizeMode="contain" />
              </TouchableOpacity> */}
            </View>
          </View>

          {/* Grid Menu */}
          <View style={styles.gridContainer}>
            {(isExpanded ? gridItems : gridItems.slice(0, 4)).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.gridItem}
                onPress={() => handleGridPress(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                  <FastImage source={item.icon} style={styles.gridIcon} resizeMode="contain" {...(isDark ? { tintColor: '#FFFFFF' } : {})} />
                </View>
                <AppText style={[styles.gridText, { color: themeColors.text }]} numberOfLines={2}>
                  {item.title}
                </AppText>
              </TouchableOpacity>
            ))}
            {gridItems.length > 4 && (
              <TouchableOpacity style={styles.gridExpander} onPress={() => setIsExpanded(!isExpanded)}>
                <FastImage
                  source={back_ic}
                  style={{ width: 12, height: 12, transform: [{ rotate: isExpanded ? '90deg' : '-90deg' }] }}
                  tintColor={themeColors.secondaryText}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Staking Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <AppText style={[styles.sectionTitle, { color: themeColors.text }]}>Staking</AppText>
            </View>

            <View style={styles.tableHeader}>
              <AppText style={styles.tableHeaderText}>Coin</AppText>
              <View style={styles.aprHeader}>
                <AppText style={styles.tableHeaderText}>Est. APR</AppText>
                <FastImage source={upDown} style={styles.upDownIcon} resizeMode="contain" tintColor={themeColors.secondaryText} />
              </View>
            </View>

            {isListLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <View key={i} style={styles.tableRow}>
                  <View style={styles.coinInfo}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isDark ? themeColors.card : '#EEE', marginRight: 10 }} />
                    <View style={{ width: 60, height: 16, borderRadius: 4, backgroundColor: isDark ? themeColors.card : '#EEE' }} />
                  </View>
                  <View style={{ width: 50, height: 16, borderRadius: 4, backgroundColor: isDark ? themeColors.card : '#EEE' }} />
                </View>
              ))
            ) : (
              <FlatList
                data={filteredPackages}
                keyExtractor={(item, index) => String(item._id || item.id || index)}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.tableRow} onPress={() => openSheet(item)}>
                    <View style={styles.coinInfo}>
                      <FastImage source={{ uri: `${IMAGE_BASE_URL}${item.iconPath}` }} style={styles.coinIcon} resizeMode="contain" />
                      <AppText style={[styles.coinName, { color: themeColors.text }]}>{item?.currency || item?.coin || 'Unknown'}</AppText>
                      {!!item?.tag && (
                        <View style={[
                          styles.newBadge,
                          {
                            backgroundColor: String(item.tag).toLowerCase() === 'vip' ? 'rgba(240, 185, 11, 0.15)' :
                              String(item.tag).toLowerCase() === 'new' ? 'rgba(3, 166, 109, 0.15)' :
                                'rgba(240, 185, 11, 0.15)',
                          }
                        ]}>
                          <AppText style={[
                            styles.newBadgeText,
                            {
                              color: String(item.tag).toLowerCase() === 'vip' ? '#f0b90b' :
                                String(item.tag).toLowerCase() === 'new' ? '#03a66d' :
                                  '#f0b90b',
                            }
                          ]}>{item.tag}</AppText>
                        </View>
                      )}
                    </View>
                    <AppText style={[styles.aprText, { color: themeColors.text }]}>{formatApr(item)}</AppText>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={() => (
                  <View style={styles.emptyContainer}>
                    <FastImage source={NO_NOTIFICATION_ICON} style={styles.emptyIcon} resizeMode="contain" />
                    <AppText style={styles.emptyText}>No Products Found</AppText>
                  </View>
                )}
              />
            )}
          </View>
        </ScrollView>
      </AppSafeAreaView>

      <RBSheet
        ref={sheetRef}
        keyboardAvoidingViewEnabled={false}
        {...({ customModalProps: { statusBarTranslucent: true } } as any)}
        closeOnDragDown={true}
        closeOnPressMask={true}
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
            height: 340,
            paddingHorizontal: 20,
            paddingBottom: 30,
            backgroundColor: isDark ? themeColors.background : colors.white
          }
        }}
      >
        <View style={styles.sheetHeader}>
          <AppText style={[styles.sheetTitle, { color: themeColors.text }]}>{selectedPackage?.currency || "Coin"}</AppText>
        </View>

        <View style={styles.sheetRow}>
          <AppText style={styles.sheetLabel}>Est. APR</AppText>
          <AppText style={[styles.sheetValue, { color: themeColors.text }]}>{formatApr(selectedPackage)}</AppText>
        </View>

        <View style={styles.sheetRow}>
          <AppText style={styles.sheetLabel}>Reward Coin</AppText>
          <FastImage source={{ uri: `${IMAGE_BASE_URL}${selectedPackage?.iconPath || ''}` }} style={styles.sheetCoinIcon} resizeMode="contain" />
        </View>

        <View style={styles.sheetRow}>
          <AppText style={styles.sheetLabel}>Type</AppText>
          <AppText style={[styles.sheetValue, { color: themeColors.text }]}>
            {selectedPackage?.stakingType ? (STAKING_TYPE_LABELS[selectedPackage.stakingType] || selectedPackage.stakingType) : "Locked Staking"}
          </AppText>
        </View>

        <TouchableOpacity style={styles.stakeBtn} onPress={openPlanSheet}>
          <AppText style={styles.stakeBtnText}>Stake</AppText>
        </TouchableOpacity>
      </RBSheet>

      <RBSheet
        ref={planSheetRef}
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
        <View style={[styles.planHeader, { borderBottomColor: themeColors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <FastImage
              source={selectedPackage?.iconPath ? { uri: `${IMAGE_BASE_URL}${selectedPackage.iconPath}` } : usdtIcon}
              style={styles.planHeaderIcon}
              resizeMode="contain"
            />
            <AppText style={[styles.planHeaderTitle, { color: themeColors.text }]}>{selectedPackage?.currency || "Coin"} Staking</AppText>
          </View>
          <TouchableOpacity onPress={() => planSheetRef.current?.close()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <FastImage source={closeIcon} style={{ width: 16, height: 16 }} resizeMode="contain" tintColor={themeColors.secondaryText} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          {planLoading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <AppText style={{ color: themeColors.secondaryText }}>Loading plans...</AppText>
            </View>
          ) : planPackages.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <AppText style={{ color: themeColors.secondaryText }}>No plans available.</AppText>
            </View>
          ) : (
            planPackages.map((plan: any) => (
              <TouchableOpacity key={plan._id || plan.id} style={[styles.planCard, { borderColor: themeColors.border }]} onPress={() => openStakeSheet(plan)}>
                <View style={styles.planRowTop}>
                  <AppText style={[styles.planDuration, { color: themeColors.text }]}>{plan.duration} {plan.durationType || 'DAYS'}</AppText>
                  <AppText style={styles.planApr}>{plan.returnPercentage}%</AppText>
                </View>
                <View style={styles.planRowBottom}>
                  <AppText style={styles.planLimits}>
                    Min: {Number(plan.minAmount || 0).toLocaleString()} — Max: {Number(plan.maxAmount || 0).toLocaleString()} {plan.currency}
                  </AppText>
                  <AppText style={styles.planEstAprLabel}>Est. APR</AppText>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </RBSheet>

      <RBSheet
        ref={faqSheetRef}
        keyboardAvoidingViewEnabled={false}
        {...({ customModalProps: { statusBarTranslucent: true } } as any)}
        closeOnDragDown={true}
        closeOnPressMask={true}
        height={480}
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
        <View style={[styles.planHeader, { borderBottomColor: themeColors.border }]}>
          <AppText style={[styles.planHeaderTitle, { color: themeColors.text }]}>FAQ</AppText>
          <TouchableOpacity onPress={() => faqSheetRef.current?.close()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <FastImage source={closeIcon} style={{ width: 16, height: 16 }} resizeMode="contain" tintColor={themeColors.secondaryText} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          {STAKING_FAQ_ITEMS.map((faq, index) => (
            <View key={index} style={[styles.faqItem, { borderBottomColor: themeColors.border }]}>
              <TouchableOpacity
                style={styles.faqQuestionRow}
                onPress={() => toggleFaq(index)}
                activeOpacity={0.7}
              >
                <AppText style={[styles.faqQuestionText, { color: themeColors.text }]}>{faq.question}</AppText>
                <FastImage
                  source={back_ic}
                  style={{ width: 12, height: 12, transform: [{ rotate: expandedFaqIndex === index ? '90deg' : '-90deg' }] }}
                  tintColor={themeColors.secondaryText}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              {expandedFaqIndex === index && (
                <AppText style={[styles.faqAnswerText, { color: themeColors.secondaryText }]}>{faq.answer}</AppText>
              )}
            </View>
          ))}
        </ScrollView>
      </RBSheet>
    </>
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
    width: 20,
    height: 20,
  },
  title: {
    fontSize: 20,
    marginRight: 12,
  },
  subTitle: {
    fontSize: 18,
  },
  searchIcon: {
    width: 20,
    height: 20,
  },
  assetsContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  gridItem: {
    width: (width - 20) / 4,
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridIcon: {
    width: 22,
    height: 22,
  },
  gridText: {
    fontSize: 12,
    textAlign: 'center',
    fontFamily: fontFamilyMedium,
  },
  gridExpander: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 4,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 0,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontFamilySemiBold,
  },
  filterRow: {
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    width: '100%',
  },
  searchIconSmall: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    padding: 0,
    fontFamily: fontFamilyMedium,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tableHeaderText: {
    fontSize: 12,
    color: isDark ? themeColors.secondaryText : '#888',
    fontFamily: fontFamilyMedium,
  },
  aprHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upDownIcon: {
    width: 10,
    height: 14,
    marginLeft: 4,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  coinInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinIcon: {
    width: 28,
    height: 28,
    marginRight: 10,
  },
  coinName: {
    fontSize: 14,
    fontFamily: fontFamilySemiBold,
    marginRight: 8,
  },
  newBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 10,
    fontFamily: fontFamilySemiBold,
  },
  aprText: {
    fontSize: 14,
    fontFamily: fontFamilySemiBold,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: isDark ? themeColors.secondaryText : '#888',
    fontFamily: fontFamilyMedium,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: fontFamilySemiBold,
  },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetLabel: {
    fontSize: 14,
    color: isDark ? themeColors.secondaryText : '#888',
    fontFamily: fontFamilyMedium,
  },
  sheetValue: {
    fontSize: 14,
    fontFamily: fontFamilySemiBold,
  },
  sheetCoinIcon: {
    width: 24,
    height: 24,
  },
  stakeBtn: {
    backgroundColor: isDark ? themeColors.button : colors.black,
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  stakeBtnText: {
    fontSize: 16,
    color: isDark ? themeColors.buttonText : colors.white,
    fontFamily: fontFamilySemiBold,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  planHeaderIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  planHeaderTitle: {
    fontSize: 16,
    fontFamily: fontFamilySemiBold,
  },
  planCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    backgroundColor: isDark ? themeColors.card : '#F9F9F9',
  },
  planRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planDuration: {
    fontSize: 16,
    fontFamily: fontFamilySemiBold,
  },
  planApr: {
    fontSize: 18,
    color: '#03a66d',
    fontFamily: fontFamilySemiBold,
  },
  planRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planLimits: {
    fontSize: 12,
    color: isDark ? themeColors.secondaryText : '#888',
    fontFamily: fontFamilyMedium,
  },
  planEstAprLabel: {
    fontSize: 12,
    color: isDark ? themeColors.secondaryText : '#888',
    fontFamily: fontFamilyMedium,
  },
  faqItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    backgroundColor: isDark ? themeColors.background : colors.white,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestionText: {
    fontSize: 14,
    fontFamily: fontFamilySemiBold,
    flex: 1,
    marginRight: 16,
  },
  faqAnswerText: {
    fontSize: 13,
    fontFamily: fontFamilyMedium,
    marginTop: 12,
    lineHeight: 20,
  }
});

export default Earning;
