import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useCallback, useMemo, useState, useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Platform,
  
  ActivityIndicator,
  Dimensions,
  Animated
} from "react-native";
import FastImage from "react-native-fast-image";
import RBSheet from "react-native-raw-bottom-sheet";
import {
  AppText,
  SEMI_BOLD,
  MEDIUM,
  fontFamilyMedium,
  BOLD
} from "../../shared";
import { useTheme } from "../../hooks/useTheme";
import { colors, darkTheme } from "../../theme/colors";
import {
  back_ic,
  historyIcon,
  tick,
  checkIc,
} from "../../helper/ImageAssets";
import NavigationService from "../../navigation/NavigationService";
import SimpleToast from "react-native-simple-toast";
import { useRoute, useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { appOperation } from "../../appOperation";
import { CUSTOMER_TYPE } from "../../appOperation/types";
import { MARGIN_BORROW_REPAY_HISTORY_SCREEN } from "../../navigation/routes";

import LinearGradient from "react-native-linear-gradient";

const SHIMMER_STRIP = 160;
function ShimmerCell({ width: w, height, borderRadius = 6, style, isDark }) {
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

  const boneColor = isDark ? darkTheme.darkThemeInputColor : "#E1E9EE";
  const shimmerColors = isDark
    ? ["transparent", "rgba(255,255,255,0.08)", "transparent"]
    : ["transparent", "rgba(255,255,255,0.6)", "transparent"];

  return (
    <View style={[{ width: w, height, borderRadius, overflow: "hidden", backgroundColor: boneColor }, style]}>
      <Animated.View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, bottom: 0, width: SHIMMER_STRIP, transform: [{ translateX: shimmerX }] }}
      >
        <LinearGradient colors={shimmerColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, width: SHIMMER_STRIP }} />
      </Animated.View>
    </View>
  );
}

function BorrowRepaySkeleton({ isDark }) {
  const screenWidth = Dimensions.get("window").width;
  const contentWidth = screenWidth - 40;
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>
      {/* Asset / Pair selector */}
      <ShimmerCell isDark={isDark} width={140} height={18} borderRadius={4} style={{ marginBottom: 10 }} />
      <ShimmerCell isDark={isDark} width={contentWidth} height={44} borderRadius={8} style={{ marginBottom: 20 }} />

      {/* Info rows */}
      <View style={{ gap: 14, marginBottom: 24 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <ShimmerCell isDark={isDark} width={100} height={16} borderRadius={4} />
          <ShimmerCell isDark={isDark} width={140} height={16} borderRadius={4} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <ShimmerCell isDark={isDark} width={80} height={16} borderRadius={4} />
          <ShimmerCell isDark={isDark} width={120} height={16} borderRadius={4} />
        </View>
      </View>

      {/* Amount label */}
      <ShimmerCell isDark={isDark} width={120} height={18} borderRadius={4} style={{ marginBottom: 10 }} />
      {/* Input field */}
      <ShimmerCell isDark={isDark} width={contentWidth} height={44} borderRadius={8} style={{ marginBottom: 20 }} />

      {/* Info note box */}
      <ShimmerCell isDark={isDark} width={contentWidth} height={60} borderRadius={8} style={{ marginBottom: 24 }} />

      {/* Detail rows */}
      <View style={{ gap: 14, marginBottom: 24 }}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <ShimmerCell isDark={isDark} width={90 + i * 10} height={16} borderRadius={4} />
            <ShimmerCell isDark={isDark} width={100 + i * 5} height={16} borderRadius={4} />
          </View>
        ))}
      </View>

      {/* Confirm button */}
      <ShimmerCell isDark={isDark} width={contentWidth} height={48} borderRadius={24} />
    </View>
  );
}

const MarginBorrowRepay = () => {
  const { colors: themeColors, isDark } = useTheme();
  const inputBgColor = isDark ? darkTheme.darkThemeInputColor : "#F7F7F9";
  const chipBgColor = isDark ? darkTheme.darkThemeInputColor : colors.white;
  const route = useRoute();

  const marginMode = route?.params?.marginMode || "Isolated";
  const isCross = marginMode === "Cross";

  const initialTab = route?.params?.activeTab || "Borrow";
  const loan = route?.params?.loan;

  const [activeTab, setActiveTab] = useState(initialTab); // "Borrow" or "Repay"

  const [selectedPairStr, setSelectedPairStr] = useState(route?.params?.pair || "BTC/USDT");
  const [baseSymbol, quoteSymbol] = selectedPairStr.split("/");

  const [selectedAsset, setSelectedAsset] = useState(route?.params?.coin || baseSymbol || "BTC");
  const [amount, setAmount] = useState("");
  const [repayFull, setRepayFull] = useState(false);

  const [liveData, setLiveData] = useState(null);
  const [crossBorrowableData, setCrossBorrowableData] = useState(null);
  const [crossDebts, setCrossDebts] = useState([]);
  const [marginAccounts, setMarginAccounts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const pairSheetRef = useRef(null);
  const assetSheetRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [marginBalances, setMarginBalances] = useState([]);

  const currencyData = useSelector((state) => state.home.currencyData);
  const coinPairs = useSelector((state) => state.home.coinPairs);
  const spotSelectedPair = useSelector((state) => state.home.spotSelectedPair);

  const coinBalance = useSelector((state) => state.home.coinBalance);

  const currentPairItem = useMemo(() => {
    if (!coinPairs || !Array.isArray(coinPairs)) return null;
    return coinPairs.find(p => p.base_currency === baseSymbol && p.quote_currency === quoteSymbol) || null;
  }, [coinPairs, baseSymbol, quoteSymbol]);

  const pairId = route?.params?.pairId || currentPairItem?._id || currencyData?._id || spotSelectedPair?._id || loan?.pair_id || "";

  const isBorrow = activeTab === "Borrow";
  const isCoinBase = selectedAsset === baseSymbol;

  const crossAssetsList = useMemo(() => {
    if (!isCross) return [];
    const set = new Set();
    if (liveData?.assets) liveData.assets.forEach(a => set.add(a.asset || a.currency));
    if (route?.params?.coin) set.add(route.params.coin);
    return Array.from(set).filter(Boolean).map(c => ({ currency: c }));
  }, [liveData, isCross, route?.params?.coin]);

  const filteredPairs = useMemo(() => {
    if (!coinPairs) return [];
    return coinPairs.filter(p => `${p?.base_currency}/${p?.quote_currency}`.toLowerCase().includes((searchQuery || "").toLowerCase()));
  }, [coinPairs, searchQuery]);

  const filteredCrossAssets = useMemo(() => {
    return crossAssetsList.filter(a => a?.currency?.toLowerCase()?.includes((searchQuery || "").toLowerCase()));
  }, [crossAssetsList, searchQuery]);

  const activePairId = useMemo(() => {
    if (isCross || !coinPairs) return null;
    const match = coinPairs.find(p => `${p.base_currency}/${p.quote_currency}` === selectedPairStr);
    return match?._id;
  }, [coinPairs, selectedPairStr, isCross]);

  const fetchLive = useCallback(() => {
    if (isCross) {
      appOperation.get(`cross/account`, undefined, undefined, CUSTOMER_TYPE)
        .then((res) => { if (res?.success) { setLiveData(res.data); setInitialLoading(false); } })
        .catch(() => { setInitialLoading(false); });
      if (!isBorrow) {
        appOperation.get(`cross/debts`, undefined, undefined, CUSTOMER_TYPE)
          .then((res) => { if (res?.success) setCrossDebts(res.data?.debts || []); })
          .catch(() => { });
      }
    } else {
      if (activePairId) {
        appOperation.get(`margin/account/${activePairId}`, undefined, undefined, CUSTOMER_TYPE)
          .then((res) => { if (res?.success) { setLiveData(res.data); setInitialLoading(false); } })
          .catch(() => { setInitialLoading(false); });
      } else {
        setInitialLoading(false);
      }
      appOperation.get(`margin/wallet-balances`, undefined, undefined, CUSTOMER_TYPE)
        .then((res) => { if (res?.success) setMarginBalances(res.data || []); })
        .catch(() => { });
      appOperation.get(`margin/accounts`, undefined, undefined, CUSTOMER_TYPE)
        .then((res) => { if (res?.success) setMarginAccounts(res.data || []); })
        .catch(() => { });
    }
  }, [isCross, isBorrow, activePairId]);

  useFocusEffect(
    useCallback(() => {
      fetchLive();
      // Poll every 5s for cross repay tab (same as web)
      if (isCross && !isBorrow) {
        const poll = setInterval(() => { fetchLive(); }, 5000);
        return () => clearInterval(poll);
      }
    }, [fetchLive, isCross, isBorrow])
  );

  const selectedAssetId = useMemo(() => {
    // Try to get currency_id directly from the cross account assets first
    if (isCross && liveData?.assets) {
      const assetObj = liveData.assets.find(a => (a.asset || a.currency) === selectedAsset);
      if (assetObj?.currency_id) return assetObj.currency_id;
    }
    // Fallback to spot coinPairs
    if (!coinPairs) return null;
    const matchBase = coinPairs.find(p => p.base_currency === selectedAsset);
    if (matchBase) return matchBase.base_currency_id;
    const matchQuote = coinPairs.find(p => p.quote_currency === selectedAsset);
    if (matchQuote) return matchQuote.quote_currency_id;
    return null;
  }, [coinPairs, selectedAsset, isCross, liveData]);

  useEffect(() => {
    if (isCross && isBorrow && selectedAssetId) {
      appOperation.customer.crossBorrowable(selectedAssetId)
        .then(res => {
          if (res?.success) {

            setCrossBorrowableData(res.data);
          } else {
            console.warn("Cross borrowable failed:", res);
          }
        })
        .catch((e) => { console.warn("Cross borrowable error:", e); });
    }
  }, [isCross, isBorrow, selectedAssetId]);

  const marginAccountMatch = useMemo(() => {
    if (isCross || !marginAccounts || !selectedPairStr) return null;
    const pStrFormatted = selectedPairStr.replace("/", "");
    return marginAccounts.find(a => a.pair === pStrFormatted);
  }, [marginAccounts, selectedPairStr, isCross]);

  const pStrFormatted = (selectedPairStr || "").replace("/", "");
  const pairMapMatchBase = useMemo(() => marginBalances.find(a => a.pair === pStrFormatted && a.asset_type === "base"), [marginBalances, pStrFormatted]);
  const pairMapMatchQuote = useMemo(() => marginBalances.find(a => a.pair === pStrFormatted && a.asset_type === "quote"), [marginBalances, pStrFormatted]);

  const borrowableFallbackBase = pairMapMatchBase?.borrowable ?? marginAccountMatch?.base_borrowable ?? "0";
  const borrowableFallbackQuote = pairMapMatchQuote?.borrowable ?? marginAccountMatch?.quote_borrowable ?? "0";
  const availableFallbackBase = pairMapMatchBase?.available ?? marginAccountMatch?.base_balance ?? "0";
  const availableFallbackQuote = pairMapMatchQuote?.available ?? marginAccountMatch?.quote_balance ?? "0";
  const borrowedFallbackBase = pairMapMatchBase?.borrowed ?? marginAccountMatch?.base_borrowed ?? "0";
  const borrowedFallbackQuote = pairMapMatchQuote?.borrowed ?? marginAccountMatch?.quote_borrowed ?? "0";

  const borrowable = isCross
    ? "0"
    : (isCoinBase
      ? (liveData?.borrowable?.base ?? borrowableFallbackBase)
      : (liveData?.borrowable?.quote ?? borrowableFallbackQuote));

  const cBorrowable = crossBorrowableData?.borrowable ?? crossBorrowableData?.max_borrow ?? "0";
  const finalBorrowable = isCross ? cBorrowable : borrowable;

  const getCrossAsset = (symbol) => {
    if (!liveData?.assets) return null;
    return liveData.assets.find(a => (a.asset || a.currency) === symbol) || null;
  };

  const getCrossDebt = (symbol) => {
    return crossDebts.find(d => (d.asset || d.currency) === symbol) || null;
  };

  const outstandingTotal = isCross
    ? (!isBorrow && getCrossDebt(selectedAsset) 
        ? (parseFloat(getCrossDebt(selectedAsset)?.principal || 0) + parseFloat(getCrossDebt(selectedAsset)?.interest_accrued || 0)).toFixed(8)
        : (parseFloat(getCrossAsset(selectedAsset)?.borrowed || 0) + parseFloat(getCrossAsset(selectedAsset)?.interest_accrued || 0)).toFixed(8))
    : (isCoinBase ? loan?.outstanding ?? liveData?.balances?.base_borrowed ?? "0" : loan?.outstanding ?? liveData?.balances?.quote_borrowed ?? "0"); // Note: isolated might have interest accrued separately if fetched

  const interestAccrued = isCross
    ? (!isBorrow && getCrossDebt(selectedAsset) ? (getCrossDebt(selectedAsset)?.interest_accrued || "0") : (getCrossAsset(selectedAsset)?.interest_accrued || "0"))
    : "0"; // Isolated margin web logic handles this similarly

  const borrowed = isCross
    ? (!isBorrow && getCrossDebt(selectedAsset) ? (getCrossDebt(selectedAsset)?.principal || "0") : (getCrossAsset(selectedAsset)?.borrowed || "0"))
    : (isCoinBase ? (liveData?.balances?.base_borrowed ?? borrowedFallbackBase) : (liveData?.balances?.quote_borrowed ?? borrowedFallbackQuote));

  const available = isCross
    ? (getCrossAsset(selectedAsset)?.available || getCrossAsset(selectedAsset)?.balance || "0")
    : (isCoinBase ? (liveData?.balances?.base_available ?? availableFallbackBase) : (liveData?.balances?.quote_available ?? availableFallbackQuote));

  const ml = isCross ? (liveData?.summary?.margin_level != null ? parseFloat(liveData.summary.margin_level) : null) : (liveData?.margin_level != null ? parseFloat(liveData.margin_level) : null);
  const marginLevelDisplay = ml === null ? "—" : ml >= 999 ? "∞" : ml.toFixed(2);
  const liqPriceFallback = (isCoinBase ? pairMapMatchBase : pairMapMatchQuote)?.est_liquidation_price ?? marginAccountMatch?.est_liquidation_price ?? "";
  const liqPriceRaw = isCross ? (liveData?.summary?.est_liq_price ?? "") : (liveData?.est_liq_price ?? liqPriceFallback);
  const liqPrice = liqPriceRaw ? parseFloat(liqPriceRaw).toFixed(2) : "—";

  const crossInterest = getCrossAsset(selectedAsset);

  const formatRate = (rate, fallback) => {
    if (rate == null) return fallback;
    return `${String(rate).replace(/%/g, "")}%`;
  };

  const COIN_RATES = {
    BNB: { hourly: "0.00034929", annual: "3.05977500" },
    USDT: { hourly: "0.00038596", annual: "3.38099500" },
    BTC: { hourly: "0.00004663", annual: "0.40843500" },
    ETH: { hourly: "0.00008219", annual: "0.71998440" },
    "0G": { hourly: "0.00050000", annual: "4.38000000" },
    "1INCH": { hourly: "0.00037917", annual: "3.32150000" },
    "2Z": { hourly: "0.00062500", annual: "5.47500000" },
  };

  const hourlyRate = isCross
    ? formatRate(crossInterest?.hourly_interest_rate_pct, "0.00200000%")
    : formatRate(
      liveData?.interest?.hourly_pct ?? COIN_RATES[selectedAsset]?.hourly ?? loan?.hourly_rate_pct,
      "—"
    );

  const annualRate = isCross
    ? formatRate(crossInterest?.annual_interest_rate_pct, "17.520000%")
    : formatRate(
      liveData?.interest?.annualized_pct ?? COIN_RATES[selectedAsset]?.annual ?? loan?.apr_pct,
      "—"
    );



  const maxRepay = Math.min(parseFloat(available || 0), parseFloat(outstandingTotal)).toFixed(8).replace(/\.?0+$/, "");

  const hasLoan = isCross
    ? parseFloat(outstandingTotal || 0) > 0
    : parseFloat(borrowed || 0) > 0;

  const handleConfirm = async () => {
    if (!isBorrow && !repayFull && (!amount || parseFloat(amount) <= 0)) {
      SimpleToast.show(`Please enter a valid repayment amount`);
      return;
    }
    if (isBorrow && (!amount || parseFloat(amount) <= 0)) {
      SimpleToast.show(`Please enter a valid loan amount`);
      return;
    }
    if (isBorrow && parseFloat(amount) > parseFloat(finalBorrowable || 0)) {
      SimpleToast.show("Amount exceeds borrowable limit");
      return;
    }
    if (!isBorrow && !repayFull && parseFloat(amount) > parseFloat(maxRepay || 0)) {
      SimpleToast.show("Amount exceeds repayable limit");
      return;
    }
    setBusy(true);
    try {
      let res;
      if (isCross) {
        if (!selectedAssetId) throw new Error("Currency ID not found");
        if (isBorrow) {
          res = await appOperation.customer.crossBorrow({ currency_id: selectedAssetId, amount });
        } else {
          res = await appOperation.customer.crossRepay({ currency_id: selectedAssetId, amount: repayFull ? undefined : amount });
        }
      } else {
        const assetType = isCoinBase ? "base" : "quote";
        const endpoint = isBorrow ? "margin/borrow" : "margin/repay";
        const pairIdToUse = loan?.pair_id || pairId;
        const payload = { pairId: pairIdToUse, assetType, amount: repayFull ? maxRepay : String(amount) };
        console.log("[MarginBorrowRepay] Payload:", payload);
        res = await appOperation.post(endpoint, payload, CUSTOMER_TYPE);
      }

      if (res?.success) {
        SimpleToast.show(res.message || `${isBorrow ? "Borrowed" : "Repaid"} ${amount} ${selectedAsset} successfully`);
        setAmount("");
        fetchLive();
        NavigationService.navigate("WALLET_SCREEN");
      } else {
        SimpleToast.show(res?.message || "Operation failed");
      }
    } catch (err) {
      SimpleToast.show(err?.message || "Operation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
      {/* Header */}
      <View style={[styles.header]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
          <TouchableOpacity
            onPress={() => NavigationService.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <FastImage
              source={back_ic}
              style={{ width: 20, height: 20 }}
              resizeMode="contain"
              tintColor={themeColors.text}
            />
          </TouchableOpacity>

          <View style={styles.headerTabsContainer}>
            <TouchableOpacity onPress={() => { setActiveTab("Borrow"); setAmount(""); }} style={styles.headerTabBtn}>
              <AppText
                weight={SEMI_BOLD}
                style={{
                  fontSize: 18,
                  color: activeTab === "Borrow" ? themeColors.text : themeColors.secondaryText,
                }}
              >
                Borrow
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setActiveTab("Repay"); setAmount(""); }} style={styles.headerTabBtn}>
              <AppText
                weight={SEMI_BOLD}
                style={{
                  fontSize: 18,
                  color: activeTab === "Repay" ? themeColors.text : themeColors.secondaryText,
                }}
              >
                Repay
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => NavigationService.navigate("MARGIN_BORROW_REPAY_HISTORY_SCREEN", { isCross, pairId })}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <FastImage
            source={historyIcon}
            style={{ width: 22, height: 22 }}
            resizeMode="contain"
            tintColor={themeColors.text}
          />
        </TouchableOpacity>
      </View>

      {initialLoading ? (
        <BorrowRepaySkeleton isDark={isDark} />
      ) : (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
      >
        {isCross ? (
          <>
            <AppText weight={SEMI_BOLD} style={{ fontSize: 16, color: themeColors.text, marginBottom: 8 }}>Cross Margin Asset</AppText>
            <TouchableOpacity
              onPress={() => { setSearchQuery(""); assetSheetRef.current?.open(); }}
              style={[styles.inputContainer, { backgroundColor: inputBgColor, marginBottom: 16, justifyContent: "space-between" }]}
            >
              <AppText weight={SEMI_BOLD} style={{ color: themeColors.text, fontSize: 15 }}>{selectedAsset}</AppText>
              <AppText weight={SEMI_BOLD} style={{ color: themeColors.secondaryText, transform: [{ rotate: '90deg' }] }}>›</AppText>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Pair Selection (Isolated) */}
            <AppText weight={SEMI_BOLD} style={{ fontSize: 16, color: themeColors.text, marginBottom: 8 }}>Isolated Margin Pair</AppText>
            <TouchableOpacity
              onPress={() => pairSheetRef.current?.open()}
              style={[styles.inputContainer, { backgroundColor: inputBgColor, marginBottom: 16, justifyContent: "space-between" }]}
            >
              <AppText weight={SEMI_BOLD} style={{ color: themeColors.text, fontSize: 15 }}>{selectedPairStr}</AppText>
              <AppText weight={SEMI_BOLD} style={{ color: themeColors.secondaryText, transform: [{ rotate: '90deg' }] }}>›</AppText>
            </TouchableOpacity>

            {/* Coin Selection (Pairs) */}
            <View style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                {[baseSymbol, quoteSymbol].map((symbol) => {
                  if (!symbol) return null;
                  const isSelected = selectedAsset === symbol;
                  const isBase = symbol === baseSymbol;

                  const getFullName = (sym) => {
                    if (isBase) {
                      const baseName = currencyData?.base_currency_fullname || currencyData?.base_currency_name;
                      if (baseName) return baseName;
                    } else {
                      const quoteName = currencyData?.quote_currency_fullname || currencyData?.quote_currency_name;
                      if (quoteName) return quoteName;
                    }

                    // Static fallbacks in case API data is missing full name
                    if (sym === "BTC") return "Bitcoin";
                    if (sym === "USDT") return "Tether";
                    if (sym === "ETH") return "Ethereum";
                    if (sym === "USDC") return "USD Coin";
                    if (sym === "BNB") return "BNB";
                    if (sym === "SOL") return "Solana";
                    if (sym === "XRP") return "XRP";
                    if (sym === "ADA") return "Cardano";
                    if (sym === "DOGE") return "Dogecoin";
                    return sym;
                  };
                  const fullName = getFullName(symbol);

                  return (
                    <TouchableOpacity
                      key={symbol}
                      onPress={() => { setSelectedAsset(symbol); setAmount(""); }}
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingVertical: 12,
                        paddingHorizontal: 10,
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: isSelected ? "#D9B37E" : themeColors.themeBorderColor,
                        backgroundColor: isSelected ? (isDark ? "#2A241C" : "#FDF6ED") : chipBgColor,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                        elevation: 1,
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        {/* Coin Text */}
                        <View>
                          <AppText weight={BOLD} style={{ fontSize: 14, color: themeColors.text }}>
                            {symbol}
                          </AppText>
                          <AppText style={{ fontSize: 11, color: themeColors.secondaryText, marginTop: 1 }}>
                            {fullName}
                          </AppText>
                        </View>
                      </View>

                      {/* Radio Indicator */}
                      <View style={{
                        width: 18, height: 18, borderRadius: 9,
                        borderWidth: isSelected ? 0 : 1.5,
                        borderColor: isDark ? "#4A4A4C" : "#E5E7EB",
                        backgroundColor: isSelected ? "#C69C6D" : "transparent",
                        alignItems: "center", justifyContent: "center"
                      }}>
                        {isSelected && (
                          <FastImage source={tick} style={{ width: 10, height: 10 }} tintColor={colors.white} resizeMode="contain" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {!isBorrow && !hasLoan && (
          <View style={{
            flexDirection: "row",
            backgroundColor: inputBgColor,
            padding: 16,
            borderRadius: 8,
            marginTop: 12,
            marginBottom: 24,
            alignItems: "center",
            gap: 12
          }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: themeColors.text, alignItems: "center", justifyContent: "center" }}>
              <AppText weight={SEMI_BOLD} style={{ color: themeColors.text, fontSize: 11, marginTop: Platform.OS === 'ios' ? 0 : -2 }}>!</AppText>
            </View>
            <AppText style={{ fontSize: 14, color: themeColors.text }}>
              You haven't borrowed any {selectedAsset} yet.
            </AppText>
          </View>
        )}

        {(isBorrow || hasLoan) && (
          <>
            {!isBorrow && (
              <View style={{ gap: 12, marginBottom: 20 }}>
                {isCross ? (
                  <>
                    <View style={styles.detailRow}>
                      <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Principal</AppText>
                      <AppText style={{ fontSize: 14, color: themeColors.text }}>
                        {parseFloat(borrowed || 0).toFixed(8).replace(/\.?0+$/, "")} {selectedAsset}
                      </AppText>
                    </View>
                    <View style={styles.detailRow}>
                      <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Accrued Interest</AppText>
                      <AppText style={{ fontSize: 14, color: parseFloat(interestAccrued) > 0 ? "#e45561" : themeColors.text }}>
                        {parseFloat(interestAccrued || 0).toFixed(8).replace(/\.?0+$/, "")} {selectedAsset}
                      </AppText>
                    </View>
                    <View style={[styles.detailRow, { borderTopWidth: 1, borderTopColor: themeColors.border, paddingTop: 10, marginTop: 4 }]}>
                      <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Total Owed</AppText>
                      <AppText weight={SEMI_BOLD} style={{ fontSize: 14, color: themeColors.text }}>
                        {parseFloat(outstandingTotal || 0).toFixed(8).replace(/\.?0+$/, "")} {selectedAsset}
                      </AppText>
                    </View>
                    <View style={styles.detailRow}>
                      <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Free Balance</AppText>
                      <AppText style={{ fontSize: 14, color: themeColors.text }}>
                        {parseFloat(available || 0).toFixed(8).replace(/\.?0+$/, "")} {selectedAsset}
                      </AppText>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.detailRow}>
                      <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Outstanding Loan</AppText>
                      <AppText style={{ fontSize: 14, color: themeColors.text }}>
                        {parseFloat(borrowed || 0).toFixed(8).replace(/\.?0+$/, "")} {selectedAsset}
                      </AppText>
                    </View>
                    <View style={styles.detailRow}>
                      <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Available Balance</AppText>
                      <AppText style={{ fontSize: 14, color: themeColors.text }}>
                        {parseFloat(available || 0).toFixed(8).replace(/\.?0+$/, "")} {selectedAsset}
                      </AppText>
                    </View>
                  </>
                )}

                <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }} onPress={() => { setRepayFull(!repayFull); setAmount(""); }}>
                  <View style={{ width: 16, height: 16, borderRadius: 2, borderWidth: 1, borderColor: repayFull ? colors.buttonBg : themeColors.secondaryText, backgroundColor: repayFull ? colors.buttonBg : "transparent", alignItems: "center", justifyContent: "center", marginRight: 8 }}>
                    {repayFull && <FastImage source={checkIc} style={{ width: 10, height: 10 }} tintColor={colors.white} />}
                  </View>
                  <AppText style={{ flex: 1, fontSize: 13, color: themeColors.secondaryText }}>
                    {isCross ? "Repay All (clears full debt including accrued interest)" : "Repay All"}
                  </AppText>
                </TouchableOpacity>
              </View>
            )}

            {/* Cross Margin Borrow Info (Above Input) */}
            {isCross && isBorrow && (
              <View style={{ gap: 12, marginBottom: 20 }}>
                <View style={styles.detailRow}>
                  <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Borrowable</AppText>
                  <AppText style={{ fontSize: 14, color: themeColors.text }}>
                    {parseFloat(finalBorrowable || 0).toFixed(8).replace(/\.?0+$/, "")} {selectedAsset}
                  </AppText>
                </View>
                {crossBorrowableData?.binding && (
                  <View style={styles.detailRow}>
                    <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Limited by</AppText>
                    <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>
                      {crossBorrowableData.binding === "equity" ? "Your margin capacity"
                        : crossBorrowableData.binding === "pool" ? "Lending pool liquidity"
                        : crossBorrowableData.binding === "user_cap" ? "Per-user limit"
                        : crossBorrowableData.binding}
                    </AppText>
                  </View>
                )}
              </View>
            )}

            {!repayFull && (
              <>
                {/* Loan Amount Label */}
                <AppText weight={SEMI_BOLD} style={{ fontSize: 16, color: themeColors.text, marginBottom: 8 }}>
                  {isBorrow ? "Loan Amount" : "Repayment Amount"}
                </AppText>

                {/* Input */}
                <View style={[styles.inputContainer, { backgroundColor: inputBgColor, marginBottom: 8 }]}>
                  <TextInput
                    placeholder={`Enter amount to ${isBorrow ? "borrow" : "repay"}`}
                    placeholderTextColor={themeColors.secondaryText}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    cursorColor={themeColors.text}
                    style={{ flex: 1, color: themeColors.text, fontSize: 14, fontFamily: fontFamilyMedium, paddingVertical: Platform.OS === "ios" ? 12 : 8 }}
                  />
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <AppText style={{ color: themeColors.text, fontSize: 14 }}>{selectedAsset}</AppText>
                    <TouchableOpacity onPress={() => {
                      const maxBorrowAmt = parseFloat(finalBorrowable || 0).toFixed(8).replace(/\.?0+$/, "");
                      setAmount(String(isBorrow ? maxBorrowAmt : maxRepay));
                    }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ backgroundColor: isDark ? themeColors.themeElevationColor : "#EEEEEE", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                      <AppText style={{ color: themeColors.text, fontSize: 12 }}>Max</AppText>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Info Note for Cross Borrow */}
                {isCross && isBorrow && (
                  <View style={{ flexDirection: "row", alignItems: "flex-start", backgroundColor: isDark ? "#1C2533" : "#F0F5FF", padding: 12, borderRadius: 8, marginBottom: 20 }}>
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colors.buttonBg, alignItems: "center", justifyContent: "center", marginRight: 8, marginTop: 2 }}>
                      <AppText weight={BOLD} style={{ color: colors.white, fontSize: 10 }}>i</AppText>
                    </View>
                    <AppText style={{ flex: 1, fontSize: 13, color: isDark ? "#93B2F0" : "#4A5568", lineHeight: 18 }}>
                      Borrowed funds are available immediately. Interest accrues against your shared collateral.
                    </AppText>
                  </View>
                )}

                {!isBorrow && (
                  <View style={{ marginTop: 4, marginBottom: 20 }}>
                    {isCross ? (
                      <AppText style={{ fontSize: 13, color: themeColors.secondaryText }}>
                        Max repayable: <AppText weight={SEMI_BOLD} style={{ color: themeColors.text }}>{maxRepay} {selectedAsset}</AppText>
                      </AppText>
                    ) : (
                      <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>
                        Available: <AppText weight={SEMI_BOLD} style={{ color: themeColors.text }}>{parseFloat(available || 0).toString()} {selectedAsset}</AppText>
                      </AppText>
                    )}
                  </View>
                )}
                {isBorrow && !isCross && <View style={{ height: 12 }} />}
              </>
            )}

            {/* Info Note for Cross Repay */}
            {isCross && !isBorrow && hasLoan && (
              <View style={{ flexDirection: "row", alignItems: "flex-start", backgroundColor: isDark ? "#1C2533" : "#F0F5FF", padding: 12, borderRadius: 8, marginBottom: 20 }}>
                <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colors.buttonBg, alignItems: "center", justifyContent: "center", marginRight: 8, marginTop: 2 }}>
                  <AppText weight={BOLD} style={{ color: colors.white, fontSize: 10 }}>i</AppText>
                </View>
                <AppText style={{ flex: 1, fontSize: 13, color: isDark ? "#93B2F0" : "#4A5568", lineHeight: 18 }}>
                  Interest is settled first, then principal. Partial repayment is allowed at any time.
                </AppText>
              </View>
            )}

            {/* Detail Rows (Borrow Only, Isolated Margin) */}
            {isBorrow && !isCross && (
              <View style={{ gap: 12, marginBottom: 20 }}>
                <View style={styles.detailRow}>
                  <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Maximum Borrow Amount</AppText>
                  <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>
                    {parseFloat(finalBorrowable || 0).toFixed(8)} {selectedAsset}
                  </AppText>
                </View>
                {liqPrice && liqPrice !== "—" && (
                  <View style={styles.detailRow}>
                    <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Est. Liq Price</AppText>
                    <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>
                      {liqPrice} {quoteSymbol}
                    </AppText>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Hourly Interest Rate</AppText>
                  <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>
                    {hourlyRate}
                  </AppText>
                </View>
                <View style={styles.detailRow}>
                  <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Annualized Interest Rate</AppText>
                  <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>
                    {annualRate}
                  </AppText>
                </View>
                <View style={styles.detailRow}>
                  <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Borrowed</AppText>
                  <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>
                    {parseFloat(borrowed || 0).toFixed(8)} {selectedAsset}
                  </AppText>
                </View>
                <View style={styles.detailRow}>
                  <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Borrow Margin Level</AppText>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>
                      {marginLevelDisplay}
                    </AppText>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Current Margin Tier</AppText>
                  <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Tier 1</AppText>
                </View>
              </View>
            )}

            {/* Blue Info Box */}
            {!isCross && (
              <View style={{
                flexDirection: "row",
                backgroundColor: isDark ? "#1C273D" : "#EEF4FF",
                padding: 12,
                borderRadius: 8,
                marginBottom: 24,
                alignItems: "flex-start",
                gap: 10
              }}>
                <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "#3375E0", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                  <AppText weight={MEDIUM} style={{ color: colors.white, fontSize: 10, }}>i</AppText>
                </View>
                <AppText style={{ flex: 1, fontSize: 13, color: isDark ? "#A0B5D8" : "#4A5A7B", lineHeight: 18 }} weight={MEDIUM}>
                  {isBorrow
                    ? "Borrowed funds are subject to hourly interest charges starting immediately. If your margin level falls below the maintenance threshold, your position may be automatically liquidated. Only borrow what you can afford to repay."
                    : "Interest is settled first from your repayment amount, with the remainder applied to the principal. You may repay partially or in full at any time. After repayment, your margin level and liquidation price will update accordingly."}
                </AppText>
              </View>
            )}

            {/* Confirm Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleConfirm}
              disabled={busy}
              style={[styles.actionBtn, { backgroundColor: isDark ? themeColors.button : "#11141D", marginBottom: 16, flexDirection: "row", gap: 8 }]}
            >
              {busy && <ActivityIndicator color={colors.white} size="small" />}
              <AppText weight={SEMI_BOLD} style={{ color: colors.white, fontSize: 16 }}>
                {busy ? "Confirming..." : "Confirm"}
              </AppText>
            </TouchableOpacity>
          </>
        )}

      </ScrollView>
      )}

      <RBSheet
        ref={pairSheetRef}
        height={Dimensions.get("window").height * 0.7}
        openDuration={250}
        customStyles={{
          container: {
            backgroundColor: themeColors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          },
          draggableIcon: { backgroundColor: isDark ? "#374151" : "#E5E7EB", width: 40 },
        }}
      >
        <View style={{ flex: 1, padding: 16, backgroundColor: themeColors.background }}>
          <AppText weight={SEMI_BOLD} style={{ fontSize: 18, marginBottom: 16, color: themeColors.text }}>Select Pair</AppText>
          <TextInput
            placeholder="Search pair..."
            placeholderTextColor={themeColors.secondaryText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.inputContainer, { backgroundColor: inputBgColor, color: themeColors.text, marginBottom: 16 }]}
          />
          <ScrollView showsVerticalScrollIndicator={false}>
            {filteredPairs.map((p) => {
              const pStr = `${p.base_currency}/${p.quote_currency}`;
              const pStrFormatted = pStr.replace("/", "");
              const accountMatch = marginBalances.find(a => a.pair === pStrFormatted && a.asset_type === "base");
              const availableBase = accountMatch ? parseFloat(accountMatch.available || 0) : 0;

              return (
                <TouchableOpacity
                  key={pStr}
                  style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: themeColors.border }}
                  onPress={() => {
                    setSelectedPairStr(pStr);
                    setSelectedAsset(p.base_currency);
                    setAmount("");
                    pairSheetRef.current?.close();
                  }}
                >
                  <AppText weight={MEDIUM} style={{ fontSize: 16, color: themeColors.text }}>{pStr}</AppText>
                  <View style={{ alignItems: "flex-end" }}>
                    <AppText weight={MEDIUM} style={{ fontSize: 14, color: themeColors.text }}>
                      {availableBase > 0 ? availableBase.toFixed(6) : "0"}
                    </AppText>
                    <AppText style={{ fontSize: 12, color: themeColors.secondaryText }}>$0.00</AppText>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </RBSheet>

      <RBSheet
        ref={assetSheetRef}
        height={Dimensions.get("window").height * 0.7 - 50}
        openDuration={250}
        customStyles={{
          container: {
            backgroundColor: themeColors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          },
          draggableIcon: { backgroundColor: isDark ? "#374151" : "#E5E7EB", width: 40 },
        }}
      >
        <View style={{ flex: 1, padding: 16, backgroundColor: themeColors.background }}>
          <AppText weight={SEMI_BOLD} style={{ fontSize: 18, marginBottom: 16, color: themeColors.text }}>Select Asset</AppText>
          <TextInput
            placeholder="Search asset..."
            placeholderTextColor={themeColors.secondaryText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.inputContainer, { backgroundColor: inputBgColor, color: themeColors.text, marginBottom: 16 }]}
          />
          <ScrollView showsVerticalScrollIndicator={false}>
            {filteredCrossAssets.map((a) => (
              <TouchableOpacity
                key={a.currency}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: themeColors.border }}
                onPress={() => {
                  setSelectedAsset(a.currency);
                  setAmount("");
                  assetSheetRef.current?.close();
                }}
              >
                <AppText weight={MEDIUM} style={{ fontSize: 16, color: themeColors.text }}>{a.currency}</AppText>
                {selectedAsset === a.currency && (
                  <FastImage source={checkIc} style={{ width: 14, height: 14 }} tintColor={isDark ? colors.white : themeColors.button} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </RBSheet>

    </SafeAreaView>
  );
};

export default MarginBorrowRepay;

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerTabsContainer: {
    flexDirection: "row",
    gap: 15,
  },
  headerTabBtn: {
    paddingVertical: 8,
  },
  inputContainer: {
    height: 50,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
});
