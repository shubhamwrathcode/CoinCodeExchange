import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, FlatList, Alert } from 'react-native';
import FastImage from 'react-native-fast-image';
import RBSheet from 'react-native-raw-bottom-sheet';
import { AppSafeAreaView, AppText } from '../../shared';
import { colors } from '../../theme/colors';
import { staking_bnr_img, back_ic, INFO, searchIcon, upDown, usdtIcon, checkIcon, closeIcon, checkIc, wallet_ic, SECURITY_SHEIELD, earningIcon, secure_icon, crypto_staking_icon, crypto_staking_icon2, crypto_staking_icon3, stake_crypto, stake_acge_icon, stake_acge_icon2, stake_acge_icon3, deposit_icon2, withdrawal_icon2, upIcon, downIcon, NO_NOTIFICATION_ICON, stakingBannerDark } from '../../helper/ImageAssets';
import { fontFamilyMedium, fontFamilySemiBold } from '../../theme/typography';
import NavigationService from '../../navigation/NavigationService';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { getStaking } from '../../actions/homeActions';
import { IMAGE_BASE_URL } from '../../helper/Constants';
import { appOperation } from '../../appOperation';
import { useTheme } from '../../hooks/useTheme';

const faqData = [
  {
    title: "What is Staking?",
    content: "Staking is the process of locking up cryptocurrency assets to participate in transaction validation on a Proof-of-Stake (PoS) blockchain. In return for securing the network, participants earn staking rewards."
  },
  {
    title: "What is Proof of Stake (PoS)?",
    content: "Proof of Stake (PoS) is a consensus mechanism used by blockchains to agree on the validity of transactions. Instead of using computing power like Proof of Work (mining), PoS relies on users who 'stake' their tokens to secure the network."
  },
  {
    title: "When will I receive my staking return?",
    content: "Staking returns are typically calculated daily and distributed according to the rules of the specific product. Depending on the asset, rewards may be credited to your account daily or at the end of a fixed staking period."
  },
  {
    title: "Why choose Coincode Staking?",
    content: "Coincode Staking offers a safe and seamless experience with competitive yields across a wide pool of top PoS products. We provide a low threshold for entry, 100% Proof of Reserve security, and a flexible redemption process."
  },
  {
    title: "How is the Est. APR calculated?",
    content: "The Estimated Annual Percentage Rate (APR) is dynamically calculated based on the underlying blockchain's on-chain reward rates, total network participation, and platform conditions. The actual rate may fluctuate over time."
  }
];

const StakingDashboard = () => {
  const sheetRef = useRef<any>(null);
  const planSheetRef = useRef<any>(null);
  const faqSheetRef = useRef<any>(null);
  const dispatch = useDispatch<any>();
  const [faqActiveIndex, setFaqActiveIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [planPackages, setPlanPackages] = useState<any[]>([]);
  const [planLoading, setPlanLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(true);


  const { stakingHome, coinBalance } = useSelector((state: any) => state.home);

  useFocusEffect(
    useCallback(() => {
      setIsListLoading(true);
      Promise.resolve(dispatch(getStaking())).finally(() => {
        setIsListLoading(false);
      });
    }, [dispatch])
  );

  const STAKING_TYPE_LABELS: any = {
    LOCKED: "Locked Staking",
    FLEXIBLE: "Flexible Staking",
    TOKENIZED: "Tokenized Staking",
  };

  const formatApr = (pkg: any) => {
    const min = pkg?.aprMin;
    const max = pkg?.aprMax ?? pkg?.returnPercentage;
    if (min != null && max != null && min !== max) {
      return `${min}% - ${max}%`;
    }
    if (max != null) return `${max}%`;
    return "—";
  };

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

    // deduplicate by currency — one row per coin
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
  const { colors: themeColors, theme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(themeColors, isDark), [themeColors, isDark]);

  return (
    <>
      <AppSafeAreaView style={{ ...styles.container, backgroundColor: themeColors.background }} forceBarStyle="dark-content">
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => NavigationService.goBack()}>
            <FastImage source={back_ic} style={styles.icon} resizeMode="contain" />
          </TouchableOpacity>
          <AppText style={styles.headerTitle}>Staking</AppText>
          <TouchableOpacity style={styles.iconBtn} onPress={() => faqSheetRef.current?.open()}>
            <FastImage source={INFO} style={styles.icon} resizeMode="contain" tintColor={themeColors.text} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.bannerContainer}>
            <View style={styles.bannerTextContainer}>
              <AppText style={styles.bannerTitle}>Staking</AppText>
              <AppText style={styles.bannerSubtitle}>
                Stake cryptos to earn in{"\n"}PoS products
              </AppText>

            </View>
            <View style={styles.bannerImgContainer}>
              <FastImage source={isDark ? stakingBannerDark : staking_bnr_img} style={styles.bannerImg} resizeMode="contain" />
            </View>
          </View>

          <View style={[styles.sectionContainer, {
            backgroundColor: isDark ? colors.newThemeColor : colors.white,
          }]}>
            <View style={styles.sectionHeaderRow}>
              <AppText style={styles.sectionTitle}>All Products</AppText>
            </View>

            <View style={styles.filterRow}>
              <View style={styles.searchContainer}>
                <FastImage source={searchIcon} style={styles.searchIcon} resizeMode="contain" tintColor="#888" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search"
                  placeholderTextColor="#888"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            <View style={styles.tableHeader}>
              <AppText style={styles.tableHeaderText}>Coin</AppText>
              <View style={styles.aprHeader}>
                <AppText style={styles.tableHeaderText}>Est. APR</AppText>
                <FastImage source={upDown} style={styles.upDownIcon} resizeMode="contain" />
              </View>
            </View>

            {isListLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <View key={i} style={styles.tableRow}>
                  <View style={styles.coinInfo}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isDark ? themeColors.border : '#EEE', marginRight: 10 }} />
                    <View style={{ width: 60, height: 16, borderRadius: 4, backgroundColor: isDark ? themeColors.border : '#EEE' }} />
                  </View>
                  <View style={{ width: 50, height: 16, borderRadius: 4, backgroundColor: isDark ? themeColors.border : '#EEE' }} />
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
                      <AppText style={styles.coinName}>{item?.currency || item?.coin || 'Unknown'}</AppText>
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
                    <AppText style={styles.aprText}>{formatApr(item)}</AppText>
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

          <View style={styles.infoSection}>
            <AppText style={styles.infoSectionTitle}>What is crypto staking?</AppText>

            <View style={styles.stepContainer}>
              <View style={styles.stepIconContainer}>
                <View style={styles.stepIconBg}>
                  <FastImage source={crypto_staking_icon} style={styles.stepIcon} resizeMode="contain" tintColor="#A07246" />
                </View>
                <View style={styles.stepLine} />
              </View>
              <View style={styles.stepContent}>
                <AppText style={styles.stepTitle}>Deposit Your Assets</AppText>
                <AppText style={styles.stepDesc}>Choose your asset and stake with just a few clicks.</AppText>
              </View>
            </View>

            <View style={styles.stepContainer}>
              <View style={styles.stepIconContainer}>
                <View style={styles.stepIconBg}>
                  <FastImage source={crypto_staking_icon2} style={styles.stepIcon} resizeMode="contain" tintColor="#A07246" />
                </View>
                <View style={styles.stepLine} />
              </View>
              <View style={styles.stepContent}>
                <AppText style={styles.stepTitle}>Secure The Network</AppText>
                <AppText style={styles.stepDesc}>Your stake helps validate transactions and keep the network secure.</AppText>
              </View>
            </View>

            <View style={styles.stepContainer}>
              <View style={styles.stepIconContainer}>
                <View style={styles.stepIconBg}>
                  <FastImage source={crypto_staking_icon3} style={styles.stepIcon} resizeMode="contain" tintColor="#A07246" />
                </View>
              </View>
              <View style={styles.stepContent}>
                <AppText style={styles.stepTitle}>Earn Rewards</AppText>
                <AppText style={styles.stepDesc}>Get rewarded in real-time proportional to your contribution.</AppText>
              </View>
            </View>
          </View>


          <View style={styles.howToStakeSection}>
            <AppText style={styles.whyStakeTitle}>How to stake on Coincode ?</AppText>

            <View style={styles.gridContainer}>
              <View style={styles.gridItem}>
                <View style={styles.gridIconWrapper}>
                  <View style={styles.gridIconCircle}>
                    <FastImage source={wallet_ic} style={styles.gridIcon} resizeMode="contain" tintColor={themeColors.text} />
                  </View>
                  <View style={styles.badgeContainer}>
                    <AppText style={styles.badgeText}>1</AppText>
                  </View>
                </View>
                <AppText style={styles.gridTitle}>Connect Wallet</AppText>
                <AppText style={styles.gridDesc}>Securely connect wallet to get started.</AppText>
              </View>

              <View style={styles.gridItem}>
                <View style={styles.gridIconWrapper}>
                  <View style={styles.gridIconCircle}>
                    <FastImage source={deposit_icon2} style={styles.gridIcon} resizeMode="contain" tintColor={themeColors.text} />
                  </View>
                  <View style={styles.badgeContainer}>
                    <AppText style={styles.badgeText}>2</AppText>
                  </View>
                </View>
                <AppText style={styles.gridTitle}>Choose Asset</AppText>
                <AppText style={styles.gridDesc}>Select the asset you want to stake.</AppText>
              </View>

              <View style={styles.gridItem}>
                <View style={styles.gridIconWrapper}>
                  <View style={styles.gridIconCircle}>
                    <FastImage source={crypto_staking_icon} style={styles.gridIcon} resizeMode="contain" tintColor={themeColors.text} />
                  </View>
                  <View style={styles.badgeContainer}>
                    <AppText style={styles.badgeText}>3</AppText>
                  </View>
                </View>
                <AppText style={styles.gridTitle}>Start Staking</AppText>
                <AppText style={styles.gridDesc}>Enter amount and confirm your staking.</AppText>
              </View>

              <View style={styles.gridItem}>
                <View style={styles.gridIconWrapper}>
                  <View style={styles.gridIconCircle}>
                    <FastImage source={earningIcon} style={styles.gridIcon} resizeMode="contain" tintColor={themeColors.text} />
                  </View>
                  <View style={styles.badgeContainer}>
                    <AppText style={styles.badgeText}>4</AppText>
                  </View>
                </View>
                <AppText style={styles.gridTitle}>Earn Rewards</AppText>
                <AppText style={styles.gridDesc}>Watch your rewards grow in real-time.</AppText>
              </View>

              <View style={styles.gridItem}>
                <View style={styles.gridIconWrapper}>
                  <View style={styles.gridIconCircle}>
                    <FastImage source={withdrawal_icon2} style={styles.gridIcon} resizeMode="contain" tintColor={themeColors.text} />
                  </View>
                  <View style={styles.badgeContainer}>
                    <AppText style={styles.badgeText}>5</AppText>
                  </View>
                </View>
                <AppText style={styles.gridTitle}>Withdraw Anytime</AppText>
                <AppText style={styles.gridDesc}>Claim rewards or unstake whenever you want.</AppText>
              </View>
            </View>
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
          <AppText style={styles.sheetTitle}>{selectedPackage?.currency || "Coin"}</AppText>
        </View>

        <View style={styles.sheetRow}>
          <AppText style={styles.sheetLabel}>Est. APR</AppText>
          <AppText style={styles.sheetValue}>{formatApr(selectedPackage)}</AppText>
        </View>

        <View style={styles.sheetRow}>
          <AppText style={styles.sheetLabel}>Reward Coin</AppText>
          <FastImage source={{ uri: `${IMAGE_BASE_URL}${selectedPackage?.iconPath || ''}` }} style={styles.sheetCoinIcon} resizeMode="contain" />
        </View>

        <View style={styles.sheetRow}>
          <AppText style={styles.sheetLabel}>Type</AppText>
          <AppText style={styles.sheetValue}>
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
        <View style={styles.planHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <FastImage
              source={selectedPackage?.iconPath ? { uri: `${IMAGE_BASE_URL}${selectedPackage.iconPath}` } : usdtIcon}
              style={styles.planHeaderIcon}
              resizeMode="contain"
            />
            <AppText style={styles.planHeaderTitle}>{selectedPackage?.currency || "Coin"} Staking</AppText>
          </View>
          <TouchableOpacity onPress={() => planSheetRef.current?.close()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <FastImage source={closeIcon} style={{ width: 16, height: 16 }} resizeMode="contain" tintColor="#888" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          {planLoading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <AppText style={{ color: isDark ? themeColors.secondaryText : '#848e9c' }}>Loading plans...</AppText>
            </View>
          ) : planPackages.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <AppText style={{ color: isDark ? themeColors.secondaryText : '#848e9c' }}>No plans available.</AppText>
            </View>
          ) : (
            planPackages.map((plan: any) => (
              <TouchableOpacity key={plan._id || plan.id} style={styles.planCard} onPress={() => openStakeSheet(plan)}>
                <View style={styles.planRowTop}>
                  <AppText style={styles.planDuration}>{plan.duration} {plan.durationType || 'DAYS'}</AppText>
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
          <AppText style={styles.modalTitle}>FAQ</AppText>
          <TouchableOpacity onPress={() => faqSheetRef.current?.close()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <AppText style={styles.modalCloseText}>×</AppText>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {faqData.map((item, index) => (
            <View key={String(index)} style={[styles.faqItemInner, index === faqData.length - 1 && styles.faqItemInnerLast]}>
              <TouchableOpacity
                style={styles.faqQuestionRow}
                onPress={() => setFaqActiveIndex(faqActiveIndex === index ? null : index)}
                activeOpacity={0.7}
              >
                <AppText style={styles.faqQuestion}>{item.title}</AppText>
                <FastImage
                  source={faqActiveIndex === index ? upIcon : downIcon}
                  resizeMode="contain"
                  style={styles.faqArrow}
                  tintColor={isDark ? colors.white : "#333"}
                />
              </TouchableOpacity>
              {faqActiveIndex === index && (
                <View style={styles.faqAnswer}>
                  <AppText style={styles.faqAnswerText}>{item.content}</AppText>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </RBSheet>

    </>
  );
};

const getStyles = (themeColors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,

  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 56,
  },
  iconBtn: {
    padding: 8,
  },
  icon: {
    width: 20,
    height: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fontFamilySemiBold,
    color: themeColors.text,
  },
  bannerContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 5,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 22,
    color: themeColors.text,
    marginBottom: 8,
    fontFamily: fontFamilySemiBold
  },
  bannerSubtitle: {
    fontSize: 14,
    color: isDark ? themeColors.secondaryText : '#333333',
    marginBottom: 20,
    lineHeight: 18,
  },
  aboutBtn: {
    backgroundColor: isDark ? themeColors.themeSelection : '#F0F0F5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  aboutBtnText: {
    fontSize: 14,
    color: themeColors.text,
    fontFamily: fontFamilyMedium
  },
  bannerImgContainer: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  bannerImg: {
    width: '100%',
    height: '100%',
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 10,

  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fontFamilySemiBold,
    color: themeColors.text,
  },
  filterRow: {
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? themeColors.card : '#F7F7F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    width: '100%',
  },
  searchIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: themeColors.text,
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
  // tableRow: {
  //   flexDirection: 'row',
  //   justifyContent: 'space-between',
  //   alignItems: 'center',
  //   marginBottom: 12,
  // },
  coinInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinIcon: {
    width: 32,
    height: 32,
    marginRight: 10,
  },
  coinName: {
    fontSize: 14,
    fontFamily: fontFamilySemiBold,
    color: themeColors.text,
    marginRight: 8,
  },
  newBadge: {
    backgroundColor: '#4EFC99',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 10,
    fontFamily: fontFamilySemiBold,
    color: themeColors.text,
  },
  aprText: {
    fontSize: 14,
    fontFamily: fontFamilySemiBold,
    color: themeColors.text,
  },
  infoSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  infoSectionTitle: {
    fontSize: 18,
    fontFamily: fontFamilySemiBold,
    color: themeColors.text,
    marginBottom: 20,
  },
  stepContainer: {
    flexDirection: 'row',
  },
  stepIconContainer: {
    alignItems: 'center',
    marginRight: 16,
    width: 48,
  },
  stepIconBg: {
    width: 44,
    height: 44,
    borderRadius: 24,
    backgroundColor: isDark ? 'rgba(209,170,103,0.15)' : '#F3E5D8',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  stepIcon: {
    width: 20,
    height: 20,
  },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: isDark ? 'rgba(209,170,103,0.3)' : '#E6D2C0',
    marginTop: -8,
    marginBottom: -8,
    zIndex: 1,
  },
  stepContent: {
    flex: 1,
    paddingTop: 4,
    paddingBottom: 24,
  },
  stepTitle: {
    fontSize: 14,
    fontFamily: fontFamilySemiBold,
    color: themeColors.text,
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 12,
    color: isDark ? themeColors.secondaryText : '#666',
    lineHeight: 16,
    fontFamily: fontFamilyMedium,
  },
  whyStakeSection: {
    paddingHorizontal: 20,
    marginTop: 5,
    marginBottom: 20,
  },
  whyStakeTitle: {
    fontSize: 18,
    fontFamily: fontFamilySemiBold,
    color: themeColors.text,
    marginBottom: 20,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: isDark ? themeColors.card : '#F9F9F9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: isDark ? themeColors.card : '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureIcon: {
    width: 24,
    height: 24,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontFamily: fontFamilySemiBold,
    color: themeColors.text,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    color: isDark ? themeColors.secondaryText : '#666',
    lineHeight: 16,
    fontFamily: fontFamilyMedium,
  },
  howToStakeSection: {
    paddingHorizontal: 20,
    marginTop: 0,
    marginBottom: 40,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 24,
  },
  gridIconWrapper: {
    position: 'relative',
    marginBottom: 16,
    marginTop: 10,
  },
  gridIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: isDark ? themeColors.card : '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  gridIcon: {
    width: 28,
    height: 28,
  },
  badgeContainer: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: isDark ? 'rgba(209,170,103,0.15)' : '#F3E5D8',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: fontFamilySemiBold,
    color: themeColors.text,
  },
  gridTitle: {
    fontSize: 15,
    fontFamily: fontFamilySemiBold,
    color: themeColors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  gridDesc: {
    fontSize: 12,
    color: isDark ? themeColors.secondaryText : '#666',
    lineHeight: 16,
    fontFamily: fontFamilyMedium,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: fontFamilySemiBold,
    color: themeColors.text,
  },
  closeIcon: {
    width: 20,
    height: 20,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? themeColors.border : '#f0f0f0'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    marginBottom: 10,
    opacity: 0.8,
  },
  emptyText: {
    fontSize: 14,
    color: isDark ? themeColors.secondaryText : '#888',
    fontFamily: fontFamilyMedium,
  },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? themeColors.border : '#F0F0F5',
  },
  sheetLabel: {
    fontSize: 14,
    color: isDark ? themeColors.secondaryText : '#888',
    fontFamily: fontFamilyMedium,
  },
  sheetValue: {
    fontSize: 14,
    color: themeColors.text,
    fontFamily: fontFamilySemiBold,
  },
  sheetCoinIcon: {
    width: 24,
    height: 24,
  },
  stakeBtn: {
    backgroundColor: isDark ? themeColors.button : '#2b2f36',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  stakeBtnText: {
    fontSize: 14,
    color: isDark ? themeColors.buttonText : colors.white,
    fontFamily: fontFamilyMedium,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? themeColors.border : '#f0f0f5',
    marginBottom: 10,
  },
  planHeaderIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  planHeaderTitle: {
    fontSize: 18,
    fontFamily: fontFamilySemiBold,
    color: themeColors.text,
  },
  planCard: {
    borderWidth: 1,
    borderColor: isDark ? themeColors.border : '#eaecef',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    backgroundColor: isDark ? themeColors.card : colors.white,
  },
  planRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planDuration: {
    fontSize: 15,
    fontFamily: fontFamilySemiBold,
    color: isDark ? themeColors.text : '#1e2329',
  },
  planApr: {
    fontSize: 16,
    fontFamily: fontFamilySemiBold,
    color: '#03a66d',
  },
  planRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planLimits: {
    fontSize: 12,
    color: isDark ? themeColors.secondaryText : '#848e9c',
    fontFamily: fontFamilyMedium,
  },
  planEstAprLabel: {
    fontSize: 11,
    color: isDark ? themeColors.secondaryText : '#848e9c',
    fontFamily: fontFamilyMedium,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? themeColors.border : '#F0F0F5',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fontFamilySemiBold,
    color: themeColors.text,
  },
  modalCloseText: {
    fontSize: 24,
    color: themeColors.text,
  },
  modalList: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  faqItemInner: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? themeColors.border : '#F0F0F5',
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
    color: themeColors.text,
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
    fontSize: 13,
    color: isDark ? themeColors.secondaryText : '#666',
    lineHeight: 20,
    fontFamily: fontFamilyMedium,
  },
});

export default StakingDashboard;
