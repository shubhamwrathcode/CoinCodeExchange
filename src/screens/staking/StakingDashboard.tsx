import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, FlatList, Alert } from 'react-native';
import FastImage from 'react-native-fast-image';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import RBSheet from 'react-native-raw-bottom-sheet';
import { AppSafeAreaView, AppText } from '../../shared';
import { colors } from '../../theme/colors';
import { stakingPromo, back_ic, INFO, searchIcon, upDown, usdtIcon, checkIcon, closeIcon, checkIc, wallet_ic, SECURITY_SHEIELD, earningIcon, secure_icon, crypto_staking_icon, crypto_staking_icon2, crypto_staking_icon3, stake_crypto, stake_acge_icon, stake_acge_icon2, stake_acge_icon3, deposit_icon2, withdrawal_icon2, downIcon, NO_NOTIFICATION_ICON } from '../../helper/ImageAssets';
import { fontFamilyMedium, fontFamilySemiBold } from '../../theme/typography';
import NavigationService from '../../navigation/NavigationService';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { getStaking } from '../../actions/homeActions';
import { IMAGE_BASE_URL } from '../../helper/Constants';
import { appOperation } from '../../appOperation';
import { useTheme } from '../../hooks/useTheme';

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
    wrapper: { backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)' },
    draggableIcon: { backgroundColor: 'transparent' as const, height: 0 },
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
    <>
      <AppSafeAreaView style={{ ...styles.container, backgroundColor: themeColors.background }}>
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
            <FastImage source={INFO} style={styles.infoIcon} resizeMode="contain" tintColor={textColor} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Hero banner — SoftStaking layout, Staking content + promo */}
          <View style={styles.bannerContainer}>
            <View style={styles.heroLeft}>
              <AppText style={[styles.heroEyebrow, { color: CYAN }]}>Coincode Staking</AppText>
              <AppText style={[styles.heroTitle, { color: textColor }]}>Staking</AppText>
              <AppText style={[styles.heroDesc, { color: muted }]}>
                Stake cryptos to earn in{"\n"}PoS products
              </AppText>
            </View>
            <FastImage
              source={stakingPromo}
              style={styles.heroImage}
              resizeMode="contain"
            />
          </View>

          <View style={[styles.sectionContainer, { backgroundColor: 'transparent' }]}>
            <View style={styles.sectionHeaderRow}>
              <AppText style={[styles.sectionTitle, { color: textColor }]}>All Products</AppText>
            </View>

            <View style={styles.filterRow}>
              <View style={[styles.searchContainer, { backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder }]}>
                <FastImage source={searchIcon} style={styles.searchIcon} resizeMode="contain" tintColor={muted} />
                <TextInput
                  style={[styles.searchInput, { color: textColor }]}
                  placeholder="Search"
                  placeholderTextColor={muted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            <View style={styles.tableHeader}>
              <AppText style={[styles.tableHeaderText, { color: muted }]}>Coin</AppText>
              <View style={styles.aprHeader}>
                <AppText style={[styles.tableHeaderText, { color: muted }]}>Est. APR</AppText>
                <FastImage source={upDown} style={styles.upDownIcon} resizeMode="contain" tintColor={muted} />
              </View>
            </View>

            {isListLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <View key={i} style={[styles.tableRow, { borderBottomColor: rowBorder }]}>
                  <View style={styles.coinInfo}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: pillBg, marginRight: 10 }} />
                    <View style={{ width: 60, height: 16, borderRadius: 4, backgroundColor: inputBg }} />
                  </View>
                  <View style={{ width: 50, height: 16, borderRadius: 4, backgroundColor: inputBg }} />
                </View>
              ))
            ) : (
              <FlatList
                data={filteredPackages}
                keyExtractor={(item, index) => String(item._id || item.id || index)}
                scrollEnabled={false}
                renderItem={({ item }) => {
                  const tagLower = String(item.tag || '').toLowerCase();
                  const isNew = tagLower === 'new';
                  return (
                    <TouchableOpacity style={[styles.tableRow, { borderBottomColor: rowBorder }]} onPress={() => openSheet(item)}>
                      <View style={styles.coinInfo}>
                        <FastImage source={{ uri: `${IMAGE_BASE_URL}${item.iconPath}` }} style={styles.coinIcon} resizeMode="contain" />
                        <AppText style={[styles.coinName, { color: textColor }]}>{item?.currency || item?.coin || 'Unknown'}</AppText>
                        {!!item?.tag && (
                          <View style={[
                            styles.newBadge,
                            {
                              backgroundColor: isNew ? 'rgba(3, 166, 109, 0.15)' : `${CYAN}26`,
                            }
                          ]}>
                            <AppText style={[
                              styles.newBadgeText,
                              {
                                color: isNew ? '#03a66d' : CYAN,
                              }
                            ]}>{item.tag}</AppText>
                          </View>
                        )}
                      </View>
                      <AppText style={[styles.aprText, { color: textColor }]}>{formatApr(item)}</AppText>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={() => (
                  <View style={styles.emptyContainer}>
                    <FastImage source={NO_NOTIFICATION_ICON} style={styles.emptyIcon} resizeMode="contain" />
                    <AppText style={[styles.emptyText, { color: muted }]}>No Products Found</AppText>
                  </View>
                )}
              />
            )}

          </View>

          <View style={styles.infoSection}>
            <AppText style={[styles.infoSectionTitle, { color: textColor }]}>What is crypto staking?</AppText>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.whatIsRow}>
              <View style={[styles.whatIsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={[styles.whatIsIconWrap, { backgroundColor: `${CYAN}26` }]}>
                  <FastImage source={crypto_staking_icon} style={styles.whatIsIcon} resizeMode="contain" tintColor={CYAN} />
                </View>
                <AppText style={[styles.whatIsTitle, { color: textColor }]}>Deposit Your Assets</AppText>
                <AppText style={[styles.whatIsDesc, { color: muted }]}>
                  Choose your asset and stake with just a few clicks.
                </AppText>
              </View>

              <View style={[styles.whatIsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={[styles.whatIsIconWrap, { backgroundColor: `${CYAN}26` }]}>
                  <FastImage source={crypto_staking_icon2} style={styles.whatIsIcon} resizeMode="contain" tintColor={CYAN} />
                </View>
                <AppText style={[styles.whatIsTitle, { color: textColor }]}>Secure The Network</AppText>
                <AppText style={[styles.whatIsDesc, { color: muted }]}>
                  Your stake helps validate transactions and keep the network secure.
                </AppText>
              </View>

              <View style={[styles.whatIsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <View style={[styles.whatIsIconWrap, { backgroundColor: `${CYAN}26` }]}>
                  <FastImage source={crypto_staking_icon3} style={styles.whatIsIcon} resizeMode="contain" tintColor={CYAN} />
                </View>
                <AppText style={[styles.whatIsTitle, { color: textColor }]}>Earn Rewards</AppText>
                <AppText style={[styles.whatIsDesc, { color: muted }]}>
                  Get rewarded in real-time proportional to your contribution.
                </AppText>
              </View>
            </ScrollView>
          </View>


          <View style={styles.howToStakeSection}>
            <AppText style={[styles.whyStakeTitle, { color: textColor }]}>How to stake on Coincode ?</AppText>

            <View style={styles.gridContainer}>
              <View style={styles.gridItem}>
                <View style={styles.gridIconWrapper}>
                  <View style={[styles.gridIconCircle, { backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }]}>
                    <FastImage source={wallet_ic} style={styles.gridIcon} resizeMode="contain" tintColor={textColor} />
                  </View>
                  <View style={[styles.badgeContainer, { backgroundColor: CYAN }]}>
                    <AppText style={[styles.badgeText, { color: colors.white }]}>1</AppText>
                  </View>
                </View>
                <AppText style={[styles.gridTitle, { color: textColor }]}>Connect Wallet</AppText>
                <AppText style={[styles.gridDesc, { color: muted }]}>Securely connect wallet to get started.</AppText>
              </View>

              <View style={styles.gridItem}>
                <View style={styles.gridIconWrapper}>
                  <View style={[styles.gridIconCircle, { backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }]}>
                    <FastImage source={deposit_icon2} style={styles.gridIcon} resizeMode="contain" tintColor={textColor} />
                  </View>
                  <View style={[styles.badgeContainer, { backgroundColor: CYAN }]}>
                    <AppText style={[styles.badgeText, { color: colors.white }]}>2</AppText>
                  </View>
                </View>
                <AppText style={[styles.gridTitle, { color: textColor }]}>Choose Asset</AppText>
                <AppText style={[styles.gridDesc, { color: muted }]}>Select the asset you want to stake.</AppText>
              </View>

              <View style={styles.gridItem}>
                <View style={styles.gridIconWrapper}>
                  <View style={[styles.gridIconCircle, { backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }]}>
                    <FastImage source={crypto_staking_icon} style={styles.gridIcon} resizeMode="contain" tintColor={textColor} />
                  </View>
                  <View style={[styles.badgeContainer, { backgroundColor: CYAN }]}>
                    <AppText style={[styles.badgeText, { color: colors.white }]}>3</AppText>
                  </View>
                </View>
                <AppText style={[styles.gridTitle, { color: textColor }]}>Start Staking</AppText>
                <AppText style={[styles.gridDesc, { color: muted }]}>Enter amount and confirm your staking.</AppText>
              </View>

              <View style={styles.gridItem}>
                <View style={styles.gridIconWrapper}>
                  <View style={[styles.gridIconCircle, { backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }]}>
                    <FastImage source={earningIcon} style={styles.gridIcon} resizeMode="contain" tintColor={textColor} />
                  </View>
                  <View style={[styles.badgeContainer, { backgroundColor: CYAN }]}>
                    <AppText style={[styles.badgeText, { color: colors.white }]}>4</AppText>
                  </View>
                </View>
                <AppText style={[styles.gridTitle, { color: textColor }]}>Earn Rewards</AppText>
                <AppText style={[styles.gridDesc, { color: muted }]}>Watch your rewards grow in real-time.</AppText>
              </View>

              <View style={styles.gridItem}>
                <View style={styles.gridIconWrapper}>
                  <View style={[styles.gridIconCircle, { backgroundColor: cardBg, borderWidth: 1, borderColor: cardBorder }]}>
                    <FastImage source={withdrawal_icon2} style={styles.gridIcon} resizeMode="contain" tintColor={textColor} />
                  </View>
                  <View style={[styles.badgeContainer, { backgroundColor: CYAN }]}>
                    <AppText style={[styles.badgeText, { color: colors.white }]}>5</AppText>
                  </View>
                </View>
                <AppText style={[styles.gridTitle, { color: textColor }]}>Withdraw Anytime</AppText>
                <AppText style={[styles.gridDesc, { color: muted }]}>Claim rewards or unstake whenever you want.</AppText>
              </View>
            </View>
          </View>
        </ScrollView>
      </AppSafeAreaView>

      <RBSheet
        ref={sheetRef}
        height={340}
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
          <AppText style={[styles.sheetTitle, { color: textColor }]}>{selectedPackage?.currency || "Coin"}</AppText>
          <TouchableOpacity
            onPress={() => sheetRef.current?.close()}
            style={[styles.sheetCloseCircle, { backgroundColor: sheetCloseCircleBg }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.75}
          >
            <FastImage source={closeIcon} resizeMode="contain" style={styles.sheetCloseIcon} tintColor={sheetIconTint} />
          </TouchableOpacity>
        </View>

        <View style={[styles.sheetRow, { borderBottomColor: rowBorder }]}>
          <AppText style={[styles.sheetLabel, { color: muted }]}>Est. APR</AppText>
          <AppText style={[styles.sheetValue, { color: textColor }]}>{formatApr(selectedPackage)}</AppText>
        </View>

        <View style={[styles.sheetRow, { borderBottomColor: rowBorder }]}>
          <AppText style={[styles.sheetLabel, { color: muted }]}>Reward Coin</AppText>
          <FastImage source={{ uri: `${IMAGE_BASE_URL}${selectedPackage?.iconPath || ''}` }} style={styles.sheetCoinIcon} resizeMode="contain" />
        </View>

        <View style={[styles.sheetRow, { borderBottomColor: rowBorder }]}>
          <AppText style={[styles.sheetLabel, { color: muted }]}>Type</AppText>
          <AppText style={[styles.sheetValue, { color: textColor }]}>
            {selectedPackage?.stakingType ? (STAKING_TYPE_LABELS[selectedPackage.stakingType] || selectedPackage.stakingType) : "Locked Staking"}
          </AppText>
        </View>

        <TouchableOpacity style={[styles.stakeBtn, { backgroundColor: CYAN }]} onPress={openPlanSheet}>
          <AppText style={[styles.stakeBtnText, { color: colors.white }]}>Stake</AppText>
        </TouchableOpacity>
      </RBSheet>

      <RBSheet
        ref={planSheetRef}
        height={450}
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

        <View style={[styles.planHeader, { borderBottomColor: rowBorder }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <FastImage
              source={selectedPackage?.iconPath ? { uri: `${IMAGE_BASE_URL}${selectedPackage.iconPath}` } : usdtIcon}
              style={styles.planHeaderIcon}
              resizeMode="contain"
            />
            <AppText style={[styles.planHeaderTitle, { color: textColor }]}>{selectedPackage?.currency || "Coin"} Staking</AppText>
          </View>
          <TouchableOpacity
            onPress={() => planSheetRef.current?.close()}
            style={[styles.sheetCloseCircle, { backgroundColor: sheetCloseCircleBg }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.75}
          >
            <FastImage source={closeIcon} style={styles.sheetCloseIcon} resizeMode="contain" tintColor={sheetIconTint} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          {planLoading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <AppText style={{ color: muted }}>Loading plans...</AppText>
            </View>
          ) : planPackages.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <AppText style={{ color: muted }}>No plans available.</AppText>
            </View>
          ) : (
            planPackages.map((plan: any) => (
              <TouchableOpacity
                key={plan._id || plan.id}
                style={[styles.planCard, { borderColor: cardBorder, backgroundColor: cardBg }]}
                onPress={() => openStakeSheet(plan)}
              >
                <View style={styles.planRowTop}>
                  <AppText style={[styles.planDuration, { color: textColor }]}>{plan.duration} {plan.durationType || 'DAYS'}</AppText>
                  <AppText style={styles.planApr}>{plan.returnPercentage}%</AppText>
                </View>
                <View style={styles.planRowBottom}>
                  <AppText style={[styles.planLimits, { color: muted }]}>
                    Min: {Number(plan.minAmount || 0).toLocaleString()} — Max: {Number(plan.maxAmount || 0).toLocaleString()} {plan.currency}
                  </AppText>
                  <AppText style={[styles.planEstAprLabel, { color: muted }]}>Est. APR</AppText>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </RBSheet>

      <RBSheet
        ref={faqSheetRef}
        height={450}
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
            <FastImage source={closeIcon} resizeMode="contain" style={styles.sheetCloseIcon} tintColor={sheetIconTint} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
          {faqData.map((item, index) => (
            <View
              key={String(index)}
              style={[
                styles.faqItemInner,
                { borderBottomColor: rowBorder },
                index === faqData.length - 1 && styles.faqItemInnerLast,
              ]}
            >
              <TouchableOpacity
                style={styles.faqQuestionRow}
                onPress={() => setFaqActiveIndex(faqActiveIndex === index ? null : index)}
                activeOpacity={0.7}
              >
                <AppText style={[styles.faqQuestion, { color: textColor }]}>{item.title}</AppText>
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
                  <AppText style={[styles.faqAnswerText, { color: muted }]}>{item.content}</AppText>
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
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingRight: 4,
    paddingTop: 0,
  },
  heroLeft: {
    flex: 1,
    paddingRight: 10,
    paddingTop: 12,
  },
  heroEyebrow: {
    fontSize: 15,
    fontFamily: fontFamilySemiBold,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: fontFamilySemiBold,
    lineHeight: 28,
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  heroImage: {
    width: 160,
    height: 200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  backIcon: {
    width: 35,
    height: 35,
  },
  infoIcon: {
    width: 25,
    height: 25,
  },
  sectionContainer: {
    paddingHorizontal: 20,

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
    paddingLeft: 20,
    marginTop: 20,
  },
  infoSectionTitle: {
    fontSize: 18,
    fontFamily: fontFamilySemiBold,
    color: themeColors.text,
    marginBottom: 16,
    paddingRight: 20,
  },
  whatIsRow: {
    paddingRight: 20,
    paddingBottom: 8,
  },
  whatIsCard: {
    width: 140,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginRight: 12,
    minHeight: 150,
  },
  whatIsIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  whatIsIcon: {
    width: 22,
    height: 22,
  },
  whatIsTitle: {
    fontSize: 12,
    fontFamily: fontFamilySemiBold,
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 16,
  },
  whatIsDesc: {
    fontSize: 10,
    fontFamily: fontFamilyMedium,
    textAlign: 'center',
    lineHeight: 14,
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
    justifyContent: 'center',
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: fontFamilySemiBold,
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
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: fontFamilySemiBold,
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
  closeIcon: {
    width: 20,
    height: 20,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
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
  },
  sheetLabel: {
    fontSize: 14,
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
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  stakeBtnText: {
    fontSize: 14,
    fontFamily: fontFamilyMedium,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
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
  },
  planCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
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
    fontFamily: fontFamilyMedium,
  },
  planEstAprLabel: {
    fontSize: 11,
    fontFamily: fontFamilyMedium,
  },
  faqItemInner: {
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    fontSize: 13,
    lineHeight: 20,
    fontFamily: fontFamilyMedium,
  },
});

export default StakingDashboard;
