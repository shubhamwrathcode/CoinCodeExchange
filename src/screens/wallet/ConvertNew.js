import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  StatusBar,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import {
  AppText,
  Button,
  FOURTEEN,
  MEDIUM,
  NINE,
  RED,
  SEMI_BOLD,
  SIXTEEN,
  TEN,
  WHITE,
} from "../../shared";
import KeyBoardAware from "../../shared/components/KeyboardAware";
import FastImage from "react-native-fast-image";
import {
  back_ic,
  disclaimerIcon,
  downIcon,
  printIcon,
  swap,
  arrowRightIcon,
  DOWN_ARROW,
  Down_Imgs,
} from "../../helper/ImageAssets";
import NavigationService from "../../navigation/NavigationService";
import { colors } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";
import { useAppSelector } from "../../store/hooks";
import { useDispatch } from "react-redux";
import { useEffect, useRef, useState } from "react";
import {
  getConversionRate,
  getSwapCurrencyList,
  swapCurrency,
} from "../../actions/walletActions";
import CoinListModal from "../../shared/components/CoinListModal";
import { BASE_URL } from "../../helper/Constants";
import { toFixedEight } from "../../helper/utility";
import { showError } from "../../helper/logger";
import TransferModal from "../../shared/components/TransferModal";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SHIMMER_STRIP = 160;
const SIDE_PAD = 20;
const CONTENT_W = SCREEN_WIDTH - SIDE_PAD * 2;
const HEADER_BOTTOM_OFFSET = 30;
const HEADER_CONTENT_PADDING = 12;

// ─── Shimmer cell ────────────────────────────────────────────────────────────
function ShimmerCell({ width: w, height, borderRadius = 6, style }) {
  const shimmerX = useRef(new Animated.Value(-SHIMMER_STRIP)).current;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const run = () => {
      if (!mounted.current) return;
      shimmerX.setValue(-SHIMMER_STRIP);
      Animated.timing(shimmerX, {
        toValue: Math.max(w, 1) + SHIMMER_STRIP,
        duration: 1100,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (mounted.current && finished) run();
      });
    };
    const t = setTimeout(run, 50);
    return () => {
      mounted.current = false;
      clearTimeout(t);
      shimmerX.stopAnimation();
    };
  }, [shimmerX, w]);
  const { colors: themeColors, isDark } = useTheme();
  const boneColor = isDark ? "#2A2A2A" : "#E1E9EE";
  const shimmerColors = isDark
    ? ["transparent", "rgba(255,255,255,0.08)", "transparent"]
    : ["transparent", "rgba(255,255,255,0.6)", "transparent"];

  return (
    <View
      style={[
        { width: w, height, borderRadius, overflow: "hidden", backgroundColor: boneColor },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: SHIMMER_STRIP,
          transform: [{ translateX: shimmerX }],
        }}
      >
        <LinearGradient
          colors={shimmerColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, width: SHIMMER_STRIP }}
        />
      </Animated.View>
    </View>
  );
}

const skStyles = StyleSheet.create({
  sectionWrap: { paddingHorizontal: SIDE_PAD, marginTop: -24, marginBottom: 16, zIndex: 10 },
  fromToCard: {
    flexDirection: "row",
    backgroundColor: "transparent",
    borderRadius: 12,
    overflow: "hidden",
    ...Platform.select({
      android: { elevation: 8 },
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
    }),
  },
  fieldRow: { padding: 16 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginHorizontal: 16 },
  arrowCol: { alignSelf: "stretch", justifyContent: "center", alignItems: "center", paddingHorizontal: 12 },
  amountBox: {
    backgroundColor: "transparent",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 8,
  },
  detailCard: {
    backgroundColor: "transparent",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  disclaimerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    backgroundColor: "transparent",
    borderRadius: 12,
  },
});

function ConvertSkeleton() {
  const { colors: themeColors, isDark } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      {/* From / To card */}
      <View style={skStyles.sectionWrap}>
        <View style={[skStyles.fromToCard, { backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF", borderColor: isDark ? "#2A2A2A" : "#EEE", borderWidth: 1 }]}>
          <View style={{ flex: 1 }}>
            {/* From row */}
            <View style={skStyles.fieldRow}>
              <View style={{ gap: 6 }}>
                <ShimmerCell width={28} height={10} borderRadius={4} />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <ShimmerCell width={24} height={24} borderRadius={12} />
                  <ShimmerCell width={60} height={14} borderRadius={4} />
                  <ShimmerCell width={12} height={12} borderRadius={3} />
                </View>
              </View>
            </View>
            <View style={[skStyles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#EEE" }]} />
            {/* To row */}
            <View style={skStyles.fieldRow}>
              <View style={{ gap: 6 }}>
                <ShimmerCell width={20} height={10} borderRadius={4} />
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <ShimmerCell width={24} height={24} borderRadius={12} />
                  <ShimmerCell width={60} height={14} borderRadius={4} />
                  <ShimmerCell width={12} height={12} borderRadius={3} />
                </View>
              </View>
            </View>
          </View>
          {/* Swap arrow */}
          <View style={skStyles.arrowCol}>
            <ShimmerCell width={22} height={22} borderRadius={5} />
          </View>
        </View>
      </View>

      {/* Amount field */}
      <View style={{ paddingHorizontal: SIDE_PAD }}>
        <ShimmerCell width={50} height={11} borderRadius={4} style={{ marginBottom: 8 }} />
        <View style={[skStyles.amountBox, { backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF", borderColor: isDark ? "#2A2A2A" : "#EEE", borderWidth: 1 }]}>
          <ShimmerCell width={CONTENT_W * 0.5} height={16} borderRadius={4} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <ShimmerCell width={38} height={14} borderRadius={4} />
            <ShimmerCell width={28} height={14} borderRadius={4} />
          </View>
        </View>
        <ShimmerCell width={150} height={10} borderRadius={4} style={{ marginTop: 8, marginBottom: 20 }} />

        {/* Detail card – 5 rows */}
        <View style={[skStyles.detailCard, { backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF", borderColor: isDark ? "#2A2A2A" : "#EEE", borderWidth: 1 }]}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={skStyles.detailRow}>
              <ShimmerCell width={90} height={11} borderRadius={4} />
              <ShimmerCell width={110} height={11} borderRadius={4} />
            </View>
          ))}
        </View>

        {/* Disclaimer box */}
        <View style={[skStyles.disclaimerBox, { backgroundColor: isDark ? "#1A1A1A" : "#FFF9E6", borderColor: isDark ? "#2A2A2A" : "#F3BB2B", borderWidth: 1 }]}>
          <ShimmerCell width={20} height={20} borderRadius={5} />
          <View style={{ flex: 1, gap: 6 }}>
            <ShimmerCell width={CONTENT_W - 52} height={10} borderRadius={4} />
            <ShimmerCell width={CONTENT_W * 0.7} height={10} borderRadius={4} />
          </View>
        </View>
      </View>
    </View>
  );
}

function ConvertNew() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { colors: themeColors, isDark } = useTheme();

  const swapCurrencyList = useAppSelector((state) => state.wallet.swapCurrencyList);
  const swapConversionRate = useAppSelector((state) => state.wallet.swapConversionRate);

  const [coinModal, setCoinModal] = useState(false);
  const [fromCoin, setFromCoin] = useState(null);
  const [toCoin, setToCoin] = useState(null);
  const [visible, setVisible] = useState(false);
  const [type, setType] = useState("");
  const [amount, setAmount] = useState("");
  // Skeleton shows until swapCurrencyList arrives for the first time
  const [contentLoading, setContentLoading] = useState(true);

  useEffect(() => {
    dispatch(getSwapCurrencyList());
  }, []);

  useEffect(() => {
    if (swapCurrencyList && swapCurrencyList.length > 1) {
      if (fromCoin) {
        const data = swapCurrencyList?.filter((item) => item?.currency === fromCoin?.currency)[0] || {};
        setFromCoin(data);
      } else {
        setFromCoin(swapCurrencyList[0]);
      }
      setToCoin(!toCoin ? swapCurrencyList[1] : toCoin);
      setContentLoading(false); // data arrived → hide skeleton
    }
  }, [swapCurrencyList]);

  const openCoinModal = (type) => {
    setType(type);
    setCoinModal(true);
  };

  useEffect(() => {
    dispatch(getConversionRate(fromCoin?.short_name, toCoin?.short_name));
  }, [fromCoin, toCoin]);

  const handleSwapCoins = () => {
    const temp = fromCoin;
    setFromCoin(toCoin);
    setToCoin(temp);
  };

  const handleConfirmSwap = () => {
    let data = {
      fromWallet: fromCoin?.currency_id,
      toWallet: toCoin?.currency_id,
      amount: +amount,
    };
    dispatch(swapCurrency(data, setVisible, setAmount));
  };

  const handleSelectCoin = (item) => {
    type === "from" ? setFromCoin(item) : setToCoin(item);
    setCoinModal(false);
  };

  const handlePopup = () => {
    setVisible(false);
  };

  const labelColor = themeColors.secondaryText;
  const arrowTint = isDark ? colors.white : colors.black;

  return (
    <View style={[styles.screen, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.buttonBg} />

      {/* Header — always visible */}
      <View style={[styles.header, { paddingTop: insets.top + HEADER_CONTENT_PADDING }]}>
        <TouchableOpacity onPress={() => NavigationService.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <FastImage source={back_ic} resizeMode="contain" tintColor={colors.white} style={styles.headerIcon} />
        </TouchableOpacity>
        <AppText color={isDark ? colors.black : colors.white} weight={SEMI_BOLD} style={styles.headerTitle}>
          Convert
        </AppText>
        <TouchableOpacity onPress={() => NavigationService.navigate("Swap_History")} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <FastImage source={printIcon} resizeMode="contain" tintColor={colors.white} style={styles.headerIcon} />
        </TouchableOpacity>
      </View>

      {/* Middle content: skeleton while loading, real UI once data arrives */}
      {contentLoading ? (
        <ConvertSkeleton />
      ) : (
        <>
          {/* From / To card - overlaps header */}
          <View style={styles.fromToSectionWrap}>
            <View style={[styles.fromToSection, { backgroundColor: isDark ? colors.newThemeColor : "#FFFFFF", borderColor: isDark ? themeColors.border : "#EEE", borderWidth: 1, elevation: 0, shadowOpacity: 0 }]}>
              <View style={styles.fromToLeft}>
                <TouchableOpacity style={styles.fieldRow} onPress={() => openCoinModal("from")} activeOpacity={0.7}>
                  <View>
                    <AppText type={TEN} style={{ color: labelColor, marginBottom: 2 }}>From</AppText>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      {fromCoin?.icon_path && (
                        <FastImage source={{ uri: BASE_URL + fromCoin.icon_path }} style={styles.coinIconSmall} resizeMode="contain" />
                      )}
                      <AppText color={themeColors.text} weight={MEDIUM} type={FOURTEEN}>{fromCoin?.short_name || "Select"}</AppText>
                      <FastImage source={Down_Imgs} resizeMode="contain" tintColor={colors.secondaryText} style={styles.dropdownArrow} />
                    </View>
                  </View>
                </TouchableOpacity>
                <View style={styles.fieldDivider} />
                <TouchableOpacity style={styles.fieldRow} onPress={() => openCoinModal("to")} activeOpacity={0.7}>
                  <View>
                    <AppText type={TEN} style={{ color: labelColor, marginBottom: 2 }}>To</AppText>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      {toCoin?.icon_path && (
                        <FastImage source={{ uri: BASE_URL + toCoin.icon_path }} style={styles.coinIconSmall} resizeMode="contain" />
                      )}
                      <AppText color={themeColors.text} weight={MEDIUM} type={FOURTEEN}>{toCoin?.short_name || "Select"}</AppText>
                      <FastImage source={Down_Imgs} resizeMode="contain" tintColor={colors.secondaryText} style={styles.dropdownArrow} />
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.fromToRight}
                onPress={handleSwapCoins}
                activeOpacity={0.7}
              >
                <FastImage source={swap} resizeMode="contain" tintColor={themeColors.text} style={[styles.swapIcon, { transform: [{ rotate: "90deg" }] }]} />
              </TouchableOpacity>
            </View>
          </View>

          <KeyBoardAware style={{ flex: 1, paddingHorizontal: 20, backgroundColor: themeColors.background }}>
            <AppText type={TEN} style={[styles.sectionLabel, { color: labelColor }]}>Amount</AppText>
            <View style={[styles.amountField, { backgroundColor: isDark ? "transparent" : "#FFFFFF", borderColor: isDark ? themeColors.border : "#EEE", borderWidth: 1 }]}>
              <TextInput
                placeholder="Enter the amount"
                placeholderTextColor={themeColors.secondaryText}
                style={[styles.amountInput, { color: themeColors.text }]}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
              <View style={styles.amountRight}>
                <AppText style={{ color: labelColor }} type={FOURTEEN}>{fromCoin?.short_name}</AppText>
                <TouchableOpacity onPress={() => setAmount(String(fromCoin?.balance || 0))}>
                  <AppText style={{ color: colors.buttonBg }} type={FOURTEEN} weight={SEMI_BOLD}>Max</AppText>
                </TouchableOpacity>
              </View>
            </View>
            <AppText type={TEN} style={[styles.availableText, { color: labelColor }]}>
              Available {toFixedEight(fromCoin?.balance || 0)} {fromCoin?.short_name}
            </AppText>

            {(swapConversionRate?.rate || 0) <= 0 && (
              <AppText color={RED} type={TEN} style={styles.errorText}>
                Conversion rate not found for this pair
              </AppText>
            )}
            {Number(amount) > Number(fromCoin?.balance || 0) && amount !== "" && (
              <AppText color={RED} type={TEN} style={styles.errorText}>
                Insufficient balance
              </AppText>
            )}

            <View style={[styles.detailCard, { backgroundColor: isDark ? "transparent" : "#FFFFFF", borderColor: isDark ? themeColors.border : "#EEE", borderWidth: 1 }]}>
              <View style={styles.detailRow}>
                <AppText type={TEN} style={{ color: labelColor }}>Conversion rate</AppText>
                <AppText type={TEN} style={{ color: labelColor }}>
                  1 {swapConversionRate?.from} {toFixedEight(swapConversionRate?.rate || 0)} {toCoin?.short_name}
                </AppText>
              </View>
              <View style={styles.detailRow}>
                <AppText type={TEN} style={{ color: labelColor }}>Will get</AppText>
                <AppText type={TEN} style={{ color: labelColor }}>
                  {toFixedEight(amount * (swapConversionRate?.rate || 0))} {toCoin?.short_name}
                </AppText>
              </View>
              <View style={styles.detailRow}>
                <AppText type={TEN} style={{ color: labelColor }}>Maximum Amount</AppText>
                <AppText type={TEN} style={{ color: labelColor }}>{fromCoin?.maxSwapping} {fromCoin?.short_name}</AppText>
              </View>
              <View style={styles.detailRow}>
                <AppText type={TEN} style={{ color: labelColor }}>Minimum Amount</AppText>
                <AppText type={TEN} style={{ color: labelColor }}>{fromCoin?.minSwapping} {fromCoin?.short_name}</AppText>
              </View>
              <View style={styles.detailRow}>
                <AppText type={TEN} style={{ color: labelColor }}>Swapping fee</AppText>
                <AppText type={TEN} style={{ color: labelColor }}>{fromCoin?.swappingFee} {fromCoin?.short_name}</AppText>
              </View>
            </View>

            <View style={[styles.disclaimerBox, { backgroundColor: isDark ? "transparent" : "#FFF9E6", borderColor: isDark ? themeColors.border : "#F3BB2B", borderWidth: 1 }]}>
              <FastImage source={disclaimerIcon} style={styles.disclaimerIcon} resizeMode="contain" />
              <AppText type={NINE} style={[styles.disclaimerText, { color: labelColor }]}>
                The final conversion amount will be calculated at the current available market rate at the time of execution. The actual value may differ slightly from the rate displayed here due to market fluctuations.
              </AppText>
            </View>
          </KeyBoardAware>
        </>
      )}

      {/* Confirm button — always visible, disabled while loading */}
      <Button
        children={Number(amount) > Number(fromCoin?.balance || 0) && amount ? "Insufficient Balance" : "Confirm Convert"}
        containerStyle={styles.confirmBtn}
        disabled={
          contentLoading ||
          Number(amount) > Number(fromCoin?.balance || 0) ||
          amount * (swapConversionRate?.rate || 0) <= 0 ||
          !amount
        }
        onPress={handleConfirmSwap}
      />

      <CoinListModal
        visible={coinModal}
        onClose={() => setCoinModal(false)}
        data={swapCurrencyList?.filter(item => item?.currency_id !== (type === "from" ? toCoin?.currency_id : fromCoin?.currency_id))}
        onSelect={handleSelectCoin}
        isDark={isDark}
        disabledCoinId={type === "from" ? toCoin?.currency_id : fromCoin?.currency_id}
        selectedCoinId={type === "from" ? fromCoin?.currency_id : toCoin?.currency_id}
      />
      <TransferModal
        visible={visible}
        handleVisiblity={handlePopup}
        type={"swap"}
      />
    </View>
  );
};

export default ConvertNew;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: HEADER_BOTTOM_OFFSET,
    backgroundColor: colors.buttonBg,
  },
  headerTitle: {
    fontSize: 20,
    color: colors.white,
  },
  headerIcon: {
    width: 22,
    height: 22,
  },
  fromToSectionWrap: {
    paddingHorizontal: 20,
    marginTop: -24,
    marginBottom: 16,
    zIndex: 10,
  },
  fromToSection: {
    flexDirection: "row",
    backgroundColor: "transparent",
    borderRadius: 12,
    overflow: "hidden",
    ...Platform.select({
      android: { elevation: 8 },
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
    }),
  },
  fromToLeft: {
    flex: 1,
  },
  fromToRight: {
    alignSelf: "stretch",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  iconBtn: {
    padding: 4,
  },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: colors.lightGrey || "rgba(255,255,255,0.08)",
    marginHorizontal: 16,
  },
  coinIconSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  dropdownArrow: {
    width: 12,
    height: 12,
  },
  swapIconWrap: {
    padding: 4,
  },
  swapIcon: {
    width: 22,
    height: 22,
  },
  arrowIcon: {
    width: 16,
    height: 16,
  },
  sectionLabel: {
    marginBottom: 8,
  },
  amountField: {
    backgroundColor: "transparent",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  amountRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  availableText: {
    marginBottom: 20,
  },
  errorText: {
    marginBottom: 12,
  },
  detailCard: {
    backgroundColor: "transparent",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  disclaimerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    backgroundColor: "transparent",
    borderRadius: 12,
  },
  disclaimerIcon: {
    width: 20,
    height: 20,
    marginTop: 2,
  },
  disclaimerText: {
    flex: 1,
  },
  confirmBtn: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
});
