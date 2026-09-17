import React, { useRef, useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import FastImage from 'react-native-fast-image';
import RBSheet from 'react-native-raw-bottom-sheet';
import { AppSafeAreaView, AppText } from '../../shared';
import { colors, darkTheme, lightTheme } from '../../theme/colors';
import { back_ic, closeIcon, checkIc, usdtIcon } from '../../helper/ImageAssets';
import { fontFamilyMedium, fontFamilySemiBold } from '../../theme/typography';
import NavigationService from '../../navigation/NavigationService';
import { IMAGE_BASE_URL } from '../../helper/Constants';
import { appOperation } from '../../appOperation';
import { useDispatch } from 'react-redux';
import { getStaking } from '../../actions/homeActions';
import { showError, showSuccess } from '../../helper/logger';
import { useTheme } from '../../hooks/useTheme';

const StakingPurchase = ({ route, navigation }: any) => {
  const { plan: stakeSelectedPlan, positionId, isTopUp, currentStakingAmount: passedCurrentStaking } = route.params || {};

  const confirmOverviewSheetRef = useRef<any>(null);
  const dispatch = useDispatch<any>();

  const [stakeAmount, setStakeAmount] = useState("");
  const [stakeChecked, setStakeChecked] = useState(false);
  const [stakeLoading, setStakeLoading] = useState(false);
  const [stakeWalletBalance, setStakeWalletBalance] = useState("0");
  const [currentStaking, setCurrentStaking] = useState(passedCurrentStaking || "0");
  const [stakeBalanceLoading, setStakeBalanceLoading] = useState(false);
  const [currentStakingLoading, setCurrentStakingLoading] = useState(false);

  const formatStakeBalance = (balance: any) => {
    const n = parseFloat(balance);
    if (!Number.isFinite(n) || n === 0) return "0.00";
    return n >= 1 ? n.toFixed(2) : n.toFixed(6);
  };

  const getReturnAccruesLabel = (interestStartsAfterDays: any) => {
    if (interestStartsAfterDays === 0) return "Time Subscribed";
    return `D+${interestStartsAfterDays || 1}`;
  };

  useEffect(() => {
    if (stakeSelectedPlan) {
      if (passedCurrentStaking) {
        setCurrentStaking(String(passedCurrentStaking));
      } else {
        fetchCurrentStaking();
      }
      fetchBalances();
    }
  }, [stakeSelectedPlan, passedCurrentStaking]);

  const fetchCurrentStaking = async () => {
    setCurrentStakingLoading(true);
    try {
      const res: any = await appOperation.customer.Staking_MyPositions(1, 100);
      if (res?.success && Array.isArray(res.data)) {
        const selectedId = stakeSelectedPlan?._id || stakeSelectedPlan?.packageId;
        const currency = String(stakeSelectedPlan?.currency || "").toUpperCase();

        const activeMatches = res.data.filter((position: any) => {
          if (String(position?.status || "").toUpperCase() !== "ACTIVE") return false;
          const posPkgId = position?.packageId?._id || position?.packageId?.packageId || position?.packageId;
          if (selectedId && posPkgId && String(posPkgId) === String(selectedId)) return true;
          return String(position.currency || "").toUpperCase() === currency;
        });

        if (activeMatches.length === 0) {
          setCurrentStaking("0");
        } else {
          const total = activeMatches.reduce((sum: number, position: any) => {
            const raw = position?.totalInvestedAmount ?? position?.investedAmount ?? "0";
            const val = raw?.["$numberDecimal"] || raw;
            const n = parseFloat(val) || 0;
            return sum + n;
          }, 0);
          setCurrentStaking(String(total));
        }
      } else {
        setCurrentStaking("0");
      }
    } catch {
      setCurrentStaking("0");
    } finally {
      setCurrentStakingLoading(false);
    }
  };

  const fetchBalances = async () => {
    setStakeBalanceLoading(true);
    try {
      let currencyId = stakeSelectedPlan?.currencyId || stakeSelectedPlan?.currency_id;

      if (!currencyId) {
        const walletRes: any = await appOperation.customer.user_main_wallet("earning");
        if (walletRes?.success && Array.isArray(walletRes.data)) {
          const row = walletRes.data.find((item: any) =>
            String(item?.short_name || item?.currency || item?.coin?.short_name || item?.coin?.currency || "").toUpperCase() === String(stakeSelectedPlan.currency).toUpperCase()
          );
          if (row) {
            currencyId = row?.coin?.currency_id || row?.currency_id || row?.coin?._id || row?._id;
          }
        }
      }

      if (currencyId) {
        const balRes: any = await appOperation.customer.Staking_UserBalance(currencyId, "earning");
        if (balRes?.success && balRes.data) {
          const raw = balRes.data.balance ?? balRes.data.available ?? balRes.data.Balance ?? "0";
          setStakeWalletBalance(String(raw?.["$numberDecimal"] || raw));
        } else {
          setStakeWalletBalance("0");
        }
      } else {
        setStakeWalletBalance("0");
      }
    } catch (e) {
      setStakeWalletBalance("0");
    } finally {
      setStakeBalanceLoading(false);
    }

    if (!passedCurrentStaking) {
      setCurrentStakingLoading(true);
      try {
        const posRes: any = await appOperation.customer.Staking_MyPositions(1, 100);
        if (posRes?.success && Array.isArray(posRes.data)) {
          const activeMatches = posRes.data.filter((pos: any) =>
            String(pos?.status || "").toUpperCase() === "ACTIVE" &&
            (String(pos.packageId?._id || pos.packageId || "") === String(stakeSelectedPlan._id || stakeSelectedPlan.id) ||
              String(pos.currency || "").toUpperCase() === String(stakeSelectedPlan.currency).toUpperCase())
          );

          const total = activeMatches.reduce((sum: number, pos: any) => sum + (parseFloat(pos.investAmount) || 0), 0);
          setCurrentStaking(String(total));
        }
      } catch (e) {
        setCurrentStaking("0");
      } finally {
        setCurrentStakingLoading(false);
      }
    }
  };

  const submitStake = () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      showError("Please enter a valid amount");
      return;
    }

    const amountNum = parseFloat(stakeAmount);
    const minAmount = stakeSelectedPlan?.minimumAmount || 0;
    const maxAmount = stakeSelectedPlan?.maximumAmount || Infinity;

    if (amountNum < minAmount) {
      showError(`Minimum staking amount is ${minAmount} ${stakeSelectedPlan?.currency}`);
      return;
    }

    if (amountNum > maxAmount) {
      showError(`Maximum staking amount is ${maxAmount} ${stakeSelectedPlan?.currency}`);
      return;
    }

    if (amountNum > parseFloat(stakeWalletBalance)) {
      showError(`Insufficient balance. Available: ${stakeWalletBalance} ${stakeSelectedPlan?.currency}`);
      return;
    }

    confirmOverviewSheetRef.current?.open();
  };

  const finalSubmitStake = async () => {
    setStakeLoading(true);
    try {
      const amountNum = parseFloat(stakeAmount);
      let res: any;

      if (isTopUp && positionId) {

        res = await appOperation.customer.Staking_TopUp(positionId, amountNum, "earning");
      } else {
        const payload = {
          packageId: stakeSelectedPlan?._id || stakeSelectedPlan?.packageId || stakeSelectedPlan?.id,
          investAmount: amountNum,
          walletType: "earning"
        };
        res = await appOperation.customer.Staking_Subscribe(payload);
      }

      if (res?.success) {
        showSuccess(res?.message || (isTopUp ? "Top up successful." : "Staking subscription successful."));
        confirmOverviewSheetRef.current?.close();
        dispatch(getStaking());
        NavigationService.goBack();
      } else {
        showError(res?.message || "Staking failed. Please try again.");
      }
    } catch (e: any) {
      showError(e?.message || "Staking failed. Please try again.");
    } finally {
      setStakeLoading(false);
    }
  };
  const { colors: themeColors, theme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(themeColors, isDark), [themeColors, isDark]);

  const estDailyReturn = useMemo(() => {
    if (!stakeAmount || !stakeSelectedPlan?.returnPercentage) return "0";
    const amountNum = parseFloat(stakeAmount) || 0;
    const apr = parseFloat(stakeSelectedPlan.returnPercentage) || 0;
    const dailyReturn = (amountNum * apr / 100) / 365;
    if (dailyReturn >= 0.01) return dailyReturn.toFixed(4);
    if (dailyReturn >= 0.0001) return dailyReturn.toFixed(6);
    return dailyReturn.toFixed(8);
  }, [stakeAmount, stakeSelectedPlan]);

  if (!stakeSelectedPlan) return null;

  return (
    <AppSafeAreaView style={{ ...styles.container, backgroundColor: themeColors.background }}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => NavigationService.goBack()}>
          <FastImage source={back_ic} style={styles.icon} resizeMode="contain" tintColor={themeColors.text} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>{stakeSelectedPlan.currency} {isTopUp ? "Top Up" : "Staking"}</AppText>
        <View style={styles.iconBtn} />
      </View>

      <View style={{ flex: 1, paddingTop: 10 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>


          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
            <View>
              <AppText style={{ fontSize: 13, color: isDark ? themeColors.secondaryText : '#888', marginBottom: 4 }}>Protocol</AppText>
              <AppText style={{ fontSize: 15, fontFamily: fontFamilySemiBold, color: themeColors.text }}>{stakeSelectedPlan.currency}</AppText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <AppText style={{ fontSize: 13, color: isDark ? themeColors.secondaryText : '#888', marginBottom: 4 }}>Est. APR</AppText>
              <AppText style={{ fontSize: 15, fontFamily: fontFamilySemiBold, color: '#03a66d' }}>{stakeSelectedPlan.returnPercentage}%</AppText>
            </View>
          </View>

          <View style={{ marginBottom: 20 }}>
            <AppText style={{ fontSize: 13, color: isDark ? themeColors.secondaryText : '#888', marginBottom: 8 }}>Amount</AppText>
            <View style={{
              flexDirection: 'row', alignItems: 'center', borderWidth: 1,
              borderColor: isDark ? darkTheme.darkThemeInputColor : '#eee',
              borderRadius: 8, height: 48, paddingHorizontal: 12, backgroundColor: isDark ? darkTheme.darkThemeInputColor : darkTheme.lightthemeinputcolor
            }}>
              <TextInput
                style={{ flex: 1, fontSize: 14, color: themeColors.text, height: '100%' }}
                placeholder={`Min. ${stakeSelectedPlan.minAmount ?? stakeSelectedPlan.minimumAmount ?? 0}`}
                placeholderTextColor="#888"
                keyboardType="numeric"
                value={stakeAmount}
                onChangeText={setStakeAmount}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppText style={{ fontSize: 14, fontFamily: fontFamilySemiBold, color: themeColors.text, marginRight: 10 }}>{stakeSelectedPlan.currency}</AppText>
                <View style={{ width: 1, height: 14, backgroundColor: isDark ? themeColors.border : '#eee', marginRight: 10 }} />
                <TouchableOpacity onPress={() => setStakeAmount(stakeWalletBalance)}>
                  <AppText style={{ fontSize: 14, color: '#f0b90b', fontFamily: fontFamilyMedium }}>Max</AppText>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginTop: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <AppText style={{ fontSize: 12, color: isDark ? themeColors.secondaryText : '#888' }}>Available</AppText>
                <AppText style={{ fontSize: 12, fontFamily: fontFamilySemiBold, color: themeColors.text }}>
                  {stakeBalanceLoading ? "Loading..." : `${formatStakeBalance(stakeWalletBalance)} ${stakeSelectedPlan.currency}`}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText style={{ fontSize: 12, color: isDark ? themeColors.secondaryText : '#888' }}>Your current staking</AppText>
                <AppText style={{ fontSize: 12, fontFamily: fontFamilySemiBold, color: themeColors.text }}>
                  {currentStakingLoading ? "Loading..." : `${formatStakeBalance(currentStaking)} ${stakeSelectedPlan.currency}`}
                </AppText>
              </View>
            </View>
          </View>

          {/* Est APR */}
          <View style={{ marginBottom: 20 }}>
            <AppText style={{ fontSize: 13, color: isDark ? themeColors.secondaryText : '#888', marginBottom: 8 }}>Est. APR</AppText>
            <View style={{
              borderWidth: 1,
              borderColor: isDark ? darkTheme.darkThemeInputColor : '#eee',
              borderRadius: 8,
              padding: 12,
              backgroundColor: isDark ? darkTheme.darkThemeInputColor : darkTheme.lightthemeinputcolor
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText style={{ fontSize: 14, color: isDark ? themeColors.secondaryText : '#888' }}>Standard APR</AppText>
                <AppText style={{ fontSize: 14, fontFamily: fontFamilySemiBold, color: themeColors.text }}>{stakeSelectedPlan.returnPercentage}%</AppText>
              </View>
              {Array.isArray(stakeSelectedPlan.bonusAprTiers) && stakeSelectedPlan.bonusAprTiers.length > 0 && (
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: isDark ? "rgba(255,255,255,0.08)" : '#eee' }}>
                  <AppText style={{ fontSize: 13, color: isDark ? themeColors.secondaryText : '#888', marginBottom: 8 }}>Bonus APR</AppText>
                  {stakeSelectedPlan.bonusAprTiers.map((tier: any, index: number) => (
                    <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <AppText style={{ fontSize: 13, color: isDark ? themeColors.secondaryText : '#444' }}>{tier.tierName}: {tier.minAmount}{tier.maxAmount ? ` - ${tier.maxAmount}` : '+'}</AppText>
                      <AppText style={{ fontSize: 13, fontFamily: fontFamilySemiBold, color: themeColors.text }}>{Number(tier.bonusApr || 0).toFixed(2)}%</AppText>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Est Daily Return */}
          <View style={{ marginBottom: 24 }}>
            <AppText style={{ fontSize: 13, color: themeColors.text, fontFamily: fontFamilySemiBold, marginBottom: 8 }}>Est. Daily Return</AppText>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: isDark ? darkTheme.darkThemeInputColor : '#eee',
              borderRadius: 8,
              padding: 12,
              backgroundColor: isDark ? darkTheme.darkThemeInputColor : darkTheme.lightthemeinputcolor
            }}>
              <FastImage source={{ uri: `${IMAGE_BASE_URL}${stakeSelectedPlan.iconPath || stakeSelectedPlan.image || ''}` }} style={{ width: 24, height: 24, marginRight: 10 }} resizeMode="contain" />
              <AppText style={{ fontSize: 14, fontFamily: fontFamilySemiBold, color: '#03a66d' }}>{estDailyReturn} {stakeSelectedPlan.currency}</AppText>
            </View>
          </View>

          {/* Trading Rules */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ alignSelf: 'flex-start', paddingBottom: 4, marginBottom: 16 }}>
              <AppText style={{ fontSize: 14, fontFamily: fontFamilySemiBold, color: themeColors.text }}>Trading Rules</AppText>
            </View>

            <View style={{ paddingLeft: 4 }}>
              {/* Vertical Line Background */}
              <View style={{ position: 'absolute', left: 7.5, top: 4, bottom: 24, width: 1, backgroundColor: isDark ? themeColors.border : '#ddd' }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: themeColors.text, marginRight: 12 }} />
                  <AppText style={{ fontSize: 13, color: isDark ? themeColors.secondaryText : '#888' }}>Staking Time</AppText>
                </View>
                <AppText style={{ fontSize: 13, color: isDark ? themeColors.secondaryText : '#888' }}>Now</AppText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isDark ? themeColors.border : '#ddd', marginRight: 12 }} />
                  <AppText style={{ fontSize: 13, color: isDark ? themeColors.secondaryText : '#888' }}>Return Accrues</AppText>
                </View>
                <AppText style={{ fontSize: 13, color: isDark ? themeColors.secondaryText : '#888' }}>{getReturnAccruesLabel(stakeSelectedPlan?.interestStartsAfterDays)}</AppText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isDark ? themeColors.border : '#ddd', marginRight: 12 }} />
                  <AppText style={{ fontSize: 13, color: isDark ? themeColors.secondaryText : '#888' }}>{stakeSelectedPlan.currency} Distributes</AppText>
                </View>
                <AppText style={{ fontSize: 13, color: isDark ? themeColors.secondaryText : '#888' }}>Daily</AppText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isDark ? themeColors.border : '#ddd', marginRight: 12 }} />
                  <AppText style={{ fontSize: 13, color: isDark ? themeColors.secondaryText : '#888' }}>Unbonding Period</AppText>
                </View>
                <AppText style={{ fontSize: 13, color: isDark ? themeColors.secondaryText : '#888' }}>About {stakeSelectedPlan.unbondingPeriodDays ?? stakeSelectedPlan.unbondingPeriod ?? 1} day(s)</AppText>
              </View>
            </View>

            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              backgroundColor: isDark ? darkTheme.darkThemeInputColor : darkTheme.lightthemeinputcolor,
              borderWidth: 1,
              borderColor: isDark ? darkTheme.darkThemeInputColor : '#eee',
              padding: 12,
              borderRadius: 8,
              marginTop: 8
            }}>
              <AppText style={{ fontSize: 13, color: isDark ? themeColors.secondaryText : '#888' }}>Early Withdrawal Penalty</AppText>
              <AppText style={{ fontSize: 13, fontFamily: fontFamilySemiBold, color: themeColors.text }}>{stakeSelectedPlan.earlyWithdrawalPenalty || 10}%</AppText>
            </View>
          </View>

          {/* Agreement & Footer */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <TouchableOpacity onPress={() => setStakeChecked(!stakeChecked)} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: themeColors.text, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center', marginRight: 8 }}>
                {stakeChecked && <FastImage source={checkIc} style={{ width: 10, height: 10 }} resizeMode="contain"
                  tintColor={isDark ? colors.white : colors.black} />}
              </View>
              <AppText style={{ fontSize: 12, color: themeColors.text }}>I have read and accepted the </AppText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => NavigationService.navigate('StakingUserAgreement')} activeOpacity={0.7}>
              <AppText style={{ fontSize: 12, color: '#f0b90b', textDecorationLine: 'underline' }}>Staking User Agreement</AppText>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 20 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: (!stakeAmount || !stakeChecked || stakeLoading) ? '#f0f0f5' : colors.cyanTheme, paddingVertical: 14, borderRadius: 8, alignItems: 'center' }}
              onPress={submitStake}
              disabled={!stakeAmount || !stakeChecked || stakeLoading}
            >
              <AppText style={{ fontSize: 14, fontFamily: fontFamilySemiBold, color: (!stakeAmount || !stakeChecked || stakeLoading) ? '#b7b7b7' : colors.black }}>
                {stakeLoading ? "Processing..." : "Confirm"}
              </AppText>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </View>

      <RBSheet
        ref={confirmOverviewSheetRef}
        keyboardAvoidingViewEnabled={false}
        dragFromTopOnly={true}
        {...({ customModalProps: { statusBarTranslucent: true } } as any)}
        closeOnDragDown={true}
        closeOnPressMask={true}
        height={730}
        customStyles={{
          wrapper: { backgroundColor: "rgba(0,0,0,0.5)" },
          draggableIcon: { backgroundColor: isDark ? themeColors.border : "#ccc" },
          container: { borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: isDark ? themeColors.background : colors.white }
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: isDark ? themeColors.border : '#eee' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <FastImage source={stakeSelectedPlan?.iconPath ? { uri: `${IMAGE_BASE_URL}${stakeSelectedPlan.iconPath}` } : usdtIcon} style={{ width: 24, height: 24, marginRight: 8 }} resizeMode="contain" />
            <AppText style={{ fontSize: 18, fontFamily: fontFamilySemiBold, color: themeColors.text }}>Staking Overview</AppText>
          </View>
          <TouchableOpacity onPress={() => confirmOverviewSheetRef.current?.close()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <FastImage source={closeIcon} style={{ width: 16, height: 16 }} resizeMode="contain" tintColor="#888" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
          <AppText style={{ fontSize: 14, color: isDark ? themeColors.secondaryText : '#888', marginBottom: 20 }}>
            You are about to stake the following package. Please review the details.
          </AppText>

          <View style={{
            backgroundColor: isDark ? darkTheme.darkThemeInputColor : darkTheme.lightthemeinputcolor,
            borderWidth: 1,
            borderColor: isDark ? darkTheme.darkThemeInputColor : '#eee',
            padding: 16,
            borderRadius: 12,
            marginBottom: 20
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <AppText style={{ fontSize: 14, color: isDark ? themeColors.secondaryText : '#888', fontFamily: fontFamilyMedium }}>Currency</AppText>
              <AppText style={{ fontSize: 14, color: themeColors.text, fontFamily: fontFamilyMedium }}>{stakeSelectedPlan?.currency || "—"}</AppText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <AppText style={{ fontSize: 14, color: isDark ? themeColors.secondaryText : '#888', fontFamily: fontFamilyMedium }}>Currency Name</AppText>
              <AppText style={{ fontSize: 14, color: themeColors.text, fontFamily: fontFamilyMedium }}>{stakeSelectedPlan?.currencyFullName || stakeSelectedPlan?.currency || "—"}</AppText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <AppText style={{ fontSize: 14, color: isDark ? themeColors.secondaryText : '#888', fontFamily: fontFamilyMedium }}>Staking Type</AppText>
              <AppText style={{ fontSize: 14, color: themeColors.text, fontFamily: fontFamilyMedium }}>Locked Staking</AppText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <AppText style={{ fontSize: 14, color: isDark ? themeColors.secondaryText : '#888', fontFamily: fontFamilyMedium }}>Staking Amount</AppText>
              <AppText style={{ fontSize: 14, color: '#03a66d', fontFamily: fontFamilyMedium }}>{formatStakeBalance(stakeAmount)} {stakeSelectedPlan?.currency}</AppText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <AppText style={{ fontSize: 14, color: isDark ? themeColors.secondaryText : '#888', fontFamily: fontFamilyMedium }}>Est. APR</AppText>
              <AppText style={{ fontSize: 14, color: '#03a66d', fontFamily: fontFamilyMedium }}>{stakeSelectedPlan?.returnPercentage ?? "—"}%</AppText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <AppText style={{ fontSize: 14, color: isDark ? themeColors.secondaryText : '#888', fontFamily: fontFamilyMedium }}>Duration</AppText>
              <AppText style={{ fontSize: 14, color: themeColors.text, fontFamily: fontFamilyMedium }}>{stakeSelectedPlan?.duration ?? stakeSelectedPlan?.durationDays} Days</AppText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <AppText style={{ fontSize: 14, color: isDark ? themeColors.secondaryText : '#888', fontFamily: fontFamilyMedium }}>Est. Daily Return</AppText>
              <AppText style={{ fontSize: 14, color: '#03a66d', fontFamily: fontFamilyMedium }}>{estDailyReturn} {stakeSelectedPlan?.currency}</AppText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <AppText style={{ fontSize: 14, color: isDark ? themeColors.secondaryText : '#888', fontFamily: fontFamilyMedium }}>Your current staking</AppText>
              <AppText style={{ fontSize: 14, color: themeColors.text, fontFamily: fontFamilyMedium }}>{formatStakeBalance(currentStaking)} {stakeSelectedPlan?.currency}</AppText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <AppText style={{ fontSize: 14, color: isDark ? themeColors.secondaryText : '#888', fontFamily: fontFamilyMedium }}>Return Accrues</AppText>
              <AppText style={{ fontSize: 14, color: themeColors.text, fontFamily: fontFamilyMedium }}>{getReturnAccruesLabel(stakeSelectedPlan?.interestStartsAfterDays)}</AppText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <AppText style={{ fontSize: 14, color: isDark ? themeColors.secondaryText : '#888', fontFamily: fontFamilyMedium }}>Reward Distributes</AppText>
              <AppText style={{ fontSize: 14, color: themeColors.text, fontFamily: fontFamilyMedium }}>Daily</AppText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <AppText style={{ fontSize: 14, color: isDark ? themeColors.secondaryText : '#888', fontFamily: fontFamilyMedium }}>Unbonding Period</AppText>
              <AppText style={{ fontSize: 14, color: themeColors.text, fontFamily: fontFamilyMedium }}>About {stakeSelectedPlan?.unbondingPeriodDays ?? stakeSelectedPlan?.unbondingPeriod ?? 1} day(s)</AppText>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <AppText style={{ fontSize: 14, color: isDark ? themeColors.secondaryText : '#888', fontFamily: fontFamilyMedium }}>Wallet</AppText>
              <AppText style={{ fontSize: 14, color: themeColors.text, fontFamily: fontFamilyMedium }}>Earning Wallet</AppText>
            </View>
            {stakeSelectedPlan?.earlyWithdrawalPenalty > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                <AppText style={{ fontSize: 14, color: isDark ? themeColors.secondaryText : '#888', fontFamily: fontFamilyMedium }}>Early Withdrawal Penalty</AppText>
                <AppText style={{ fontSize: 14, color: themeColors.text, fontFamily: fontFamilyMedium }}>{stakeSelectedPlan.earlyWithdrawalPenalty}%</AppText>
              </View>
            )}
          </View>


          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 20 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: stakeLoading ? '#f0f0f5' : colors.cyanTheme, paddingVertical: 14, borderRadius: 8, alignItems: 'center' }}
              onPress={finalSubmitStake}
              disabled={stakeLoading}
            >
              <AppText style={{ fontSize: 14, fontFamily: fontFamilySemiBold, color: stakeLoading ? '#b7b7b7' : colors.black }}>
                {stakeLoading ? "Processing..." : "Confirm"}
              </AppText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </RBSheet>
    </AppSafeAreaView>
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
    width: 36,
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
});

export default StakingPurchase;
