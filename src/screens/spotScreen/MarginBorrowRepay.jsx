import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useCallback, useMemo, useState, useRef, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Platform,
  Modal,
  ActivityIndicator,
  Dimensions,
  Animated
} from "react-native";
import FastImage from "react-native-fast-image";
import RBSheet from "react-native-raw-bottom-sheet";
import { BlurView } from "@react-native-community/blur";
import LinearGradient from "react-native-linear-gradient";
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
import { ArrowLeftRight, Percent, ArrowUp, AlertTriangle, ChevronRight, Search, X, Check } from "lucide-react-native";
import NavigationService from "../../navigation/NavigationService";
import SimpleToast from "react-native-simple-toast";
import { useRoute, useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { appOperation } from "../../appOperation";
import { CUSTOMER_TYPE } from "../../appOperation/types";
import { MARGIN_BORROW_REPAY_HISTORY_SCREEN } from "../../navigation/routes";

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
  const currencyData = useSelector((state) => state.home.currencyData);
  const coinPairs = useSelector((state) => state.home.coinPairs);
  const spotSelectedPair = useSelector((state) => state.home.spotSelectedPair);
  const coinBalance = useSelector((state) => state.home.coinBalance);

  const initialPair = route?.params?.pair ||
    (currencyData?.base_currency && currencyData?.quote_currency ? `${currencyData.base_currency}/${currencyData.quote_currency}` : null) ||
    (spotSelectedPair?.base_currency && spotSelectedPair?.quote_currency ? `${spotSelectedPair.base_currency}/${spotSelectedPair.quote_currency}` : null) ||
    "BTC/USDT";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedPairStr, setSelectedPairStr] = useState(initialPair);
  const [baseSymbol, quoteSymbol] = (selectedPairStr || "BTC/USDT").split("/");

  const initialAsset = route?.params?.coin || baseSymbol || "BTC";
  const [selectedAsset, setSelectedAsset] = useState(initialAsset);

  // Sync selectedAsset when pair or route params change
  useEffect(() => {
    if (!isCross) {
      if (route?.params?.coin && (route.params.coin === baseSymbol || route.params.coin === quoteSymbol)) {
        setSelectedAsset(route.params.coin);
      } else if (!selectedAsset || (selectedAsset !== baseSymbol && selectedAsset !== quoteSymbol)) {
        if (baseSymbol) setSelectedAsset(baseSymbol);
      }
    } else {
      if (route?.params?.coin) {
        setSelectedAsset(route.params.coin);
      } else if (!selectedAsset && baseSymbol) {
        setSelectedAsset(baseSymbol);
      }
    }
  }, [baseSymbol, quoteSymbol, route?.params?.coin, isCross]);

  const [amount, setAmount] = useState("");
  const [isAmountFocused, setIsAmountFocused] = useState(false);
  const [repayFull, setRepayFull] = useState(false);

  const [liveData, setLiveData] = useState(null);
  const [crossBorrowableData, setCrossBorrowableData] = useState(null);
  const [crossDebts, setCrossDebts] = useState([]);
  const [marginAccounts, setMarginAccounts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [isPairModalVisible, setIsPairModalVisible] = useState(false);
  const [isAssetModalVisible, setIsAssetModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPairSearchFocused, setIsPairSearchFocused] = useState(false);
  const [isAssetSearchFocused, setIsAssetSearchFocused] = useState(false);
  const [marginBalances, setMarginBalances] = useState([]);

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
                weight={BOLD}
                style={{
                  fontSize: 18,
                  color: activeTab === "Borrow" ? (colors.cyanTheme || "#0AA8C5") : themeColors.secondaryText,
                }}
              >
                Borrow
              </AppText>
              <View style={[styles.activeTabIndicator, { backgroundColor: activeTab === "Borrow" ? (colors.cyanTheme || "#0AA8C5") : "transparent" }]} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setActiveTab("Repay"); setAmount(""); }} style={styles.headerTabBtn}>
              <AppText
                weight={BOLD}
                style={{
                  fontSize: 18,
                  color: activeTab === "Repay" ? (colors.cyanTheme || "#0AA8C5") : themeColors.secondaryText,
                }}
              >
                Repay
              </AppText>
              <View style={[styles.activeTabIndicator, { backgroundColor: activeTab === "Repay" ? (colors.cyanTheme || "#0AA8C5") : "transparent" }]} />
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
              <AppText weight={SEMI_BOLD} style={{ fontSize: 14, color: themeColors.text, marginBottom: 8 }}>Cross Margin Asset</AppText>
              <TouchableOpacity
                onPress={() => { setSearchQuery(""); setIsAssetModalVisible(true); }}
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: isDark ? (darkTheme.darkThemeInputColor || "#111214") : "#F7F8FA",
                    borderWidth: 1,
                    borderColor: isDark ? "#2A2C33" : "#E5E7EB",
                    borderRadius: 12,
                    marginBottom: 16,
                    justifyContent: "space-between",
                  }
                ]}
              >
                <AppText weight={BOLD} style={{ color: themeColors.text, fontSize: 15 }}>{selectedAsset}</AppText>
                <AppText weight={SEMI_BOLD} style={{ color: themeColors.secondaryText, transform: [{ rotate: '90deg' }], fontSize: 18 }}>›</AppText>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Pair Selection (Isolated) */}
              <AppText weight={SEMI_BOLD} style={{ fontSize: 14, color: themeColors.text, marginBottom: 8 }}>Isolated Margin Pair</AppText>
              <TouchableOpacity
                onPress={() => { setSearchQuery(""); setIsPairModalVisible(true); }}
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: isDark ? (darkTheme.darkThemeInputColor || "#111214") : "#F7F8FA",
                    borderWidth: 1,
                    borderColor: isDark ? "#2A2C33" : "#E5E7EB",
                    borderRadius: 12,
                    marginBottom: 16,
                    justifyContent: "space-between",
                  }
                ]}
              >
                <AppText weight={BOLD} style={{ color: themeColors.text, fontSize: 15 }}>{selectedPairStr}</AppText>
                <AppText weight={SEMI_BOLD} style={{ color: themeColors.secondaryText, transform: [{ rotate: '90deg' }], fontSize: 18 }}>›</AppText>
              </TouchableOpacity>

              {/* Coin Selection (Pairs) */}
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {[baseSymbol, quoteSymbol].map((symbol) => {
                    if (!symbol) return null;
                    const isSelected = selectedAsset === symbol;
                    const isBase = symbol === baseSymbol;

                    const getCoinBadge = (sym) => {
                      switch (sym?.toUpperCase()) {
                        case "BTC":
                          return { name: "Bitcoin", iconBg: "#F7931A", symbolChar: "₿" };
                        case "USDT":
                          return { name: "Tether", iconBg: "#26A17B", symbolChar: "₮" };
                        case "ETH":
                          return { name: "Ethereum", iconBg: "#627EEA", symbolChar: "Ξ" };
                        case "BNB":
                          return { name: "BNB", iconBg: "#F3BA2F", symbolChar: "🔶" };
                        case "SOL":
                          return { name: "Solana", iconBg: "#14F195", symbolChar: "S" };
                        case "XRP":
                          return { name: "XRP", iconBg: "#23292F", symbolChar: "✕" };
                        case "ADA":
                          return { name: "Cardano", iconBg: "#0033AD", symbolChar: "₳" };
                        case "DOGE":
                          return { name: "Dogecoin", iconBg: "#C2A633", symbolChar: "Ð" };
                        default:
                          return { name: sym, iconBg: "#3B82F6", symbolChar: sym?.charAt(0) || "•" };
                      }
                    };

                    const badgeInfo = getCoinBadge(symbol);
                    const fullName = (isBase
                      ? (currencyData?.base_currency_fullname || currencyData?.base_currency_name)
                      : (currencyData?.quote_currency_fullname || currencyData?.quote_currency_name)) || badgeInfo.name;

                    return (
                      <TouchableOpacity
                        key={symbol}
                        onPress={() => { setSelectedAsset(symbol); setAmount(""); }}
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingVertical: 14,
                          paddingHorizontal: 14,
                          borderRadius: 12,
                          borderWidth: 1.5,
                          borderColor: isSelected ? (colors.cyanTheme || "#0AA8C5") : (isDark ? "#2A2C33" : "#E5E7EB"),
                          backgroundColor: isSelected
                            ? (isDark ? "rgba(10, 168, 197, 0.12)" : "rgba(10, 168, 197, 0.08)")
                            : (isDark ? (darkTheme.darkThemeInputColor || "#111214") : "#F7F8FA"),
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                          {/* Coin Icon Circle */}
                          <View
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 17,
                              backgroundColor: badgeInfo.iconBg,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <AppText weight={BOLD} style={{ color: "#FFFFFF", fontSize: 16 }}>
                              {badgeInfo.symbolChar}
                            </AppText>
                          </View>

                          {/* Coin Text */}
                          <View style={{ flex: 1 }}>
                            <AppText weight={BOLD} style={{ fontSize: 15, color: themeColors.text }} numberOfLines={1}>
                              {symbol}
                            </AppText>
                            <AppText style={{ fontSize: 12, color: themeColors.secondaryText, marginTop: 2 }} numberOfLines={1}>
                              {fullName}
                            </AppText>
                          </View>
                        </View>

                        {/* Bullseye Radio Indicator */}
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            borderWidth: 2,
                            borderColor: isSelected ? (colors.cyanTheme || "#0AA8C5") : (isDark ? "#3A3D46" : "#D1D5DB"),
                            alignItems: "center",
                            justifyContent: "center",
                            marginLeft: 4,
                          }}
                        >
                          {isSelected && (
                            <View
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: 5,
                                backgroundColor: colors.cyanTheme || "#0AA8C5",
                              }}
                            />
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
              backgroundColor: isDark ? (darkTheme.darkThemeInputColor || "#111214") : "#F7F8FA",
              borderWidth: 1,
              borderColor: isDark ? "#2A2C33" : "#E5E7EB",
              padding: 16,
              borderRadius: 12,
              marginTop: 12,
              marginBottom: 24,
              alignItems: "center",
              gap: 12
            }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.cyanTheme || "#0AA8C5", alignItems: "center", justifyContent: "center" }}>
                <AppText weight={BOLD} style={{ color: colors.white, fontSize: 12 }}>!</AppText>
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
                        <AppText weight={SEMI_BOLD} style={{ fontSize: 14, color: themeColors.text }}>
                          {parseFloat(borrowed || 0).toFixed(8).replace(/\.?0+$/, "")} {selectedAsset}
                        </AppText>
                      </View>
                      <View style={styles.detailRow}>
                        <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Accrued Interest</AppText>
                        <AppText weight={SEMI_BOLD} style={{ fontSize: 14, color: parseFloat(interestAccrued) > 0 ? (colors.red || "#e45561") : themeColors.text }}>
                          {parseFloat(interestAccrued || 0).toFixed(8).replace(/\.?0+$/, "")} {selectedAsset}
                        </AppText>
                      </View>
                      <View style={[styles.detailRow, { borderTopWidth: 1, borderTopColor: isDark ? "#2A2C33" : themeColors.border, paddingTop: 10, marginTop: 4 }]}>
                        <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Total Owed</AppText>
                        <AppText weight={BOLD} style={{ fontSize: 14, color: themeColors.text }}>
                          {parseFloat(outstandingTotal || 0).toFixed(8).replace(/\.?0+$/, "")} {selectedAsset}
                        </AppText>
                      </View>
                      <View style={styles.detailRow}>
                        <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Free Balance</AppText>
                        <AppText weight={SEMI_BOLD} style={{ fontSize: 14, color: themeColors.text }}>
                          {parseFloat(available || 0).toFixed(8).replace(/\.?0+$/, "")} {selectedAsset}
                        </AppText>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.detailRow}>
                        <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Outstanding Loan</AppText>
                        <AppText weight={SEMI_BOLD} style={{ fontSize: 14, color: themeColors.text }}>
                          {parseFloat(borrowed || 0).toFixed(8).replace(/\.?0+$/, "")} {selectedAsset}
                        </AppText>
                      </View>
                      <View style={styles.detailRow}>
                        <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Available Balance</AppText>
                        <AppText weight={SEMI_BOLD} style={{ fontSize: 14, color: themeColors.text }}>
                          {parseFloat(available || 0).toFixed(8).replace(/\.?0+$/, "")} {selectedAsset}
                        </AppText>
                      </View>
                    </>
                  )}

                  <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }} onPress={() => { setRepayFull(!repayFull); setAmount(""); }}>
                    <View style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      borderWidth: 1.5,
                      borderColor: repayFull ? (colors.cyanTheme || "#0AA8C5") : themeColors.secondaryText,
                      backgroundColor: repayFull ? (colors.cyanTheme || "#0AA8C5") : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 8
                    }}>
                      {repayFull && <FastImage source={checkIc} style={{ width: 11, height: 11 }} tintColor={colors.white} />}
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
                    <AppText weight={SEMI_BOLD} style={{ fontSize: 14, color: themeColors.text }}>
                      {parseFloat(finalBorrowable || 0).toFixed(8).replace(/\.?0+$/, "")} {selectedAsset}
                    </AppText>
                  </View>
                  {crossBorrowableData?.binding && (
                    <View style={styles.detailRow}>
                      <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Limited by</AppText>
                      <AppText weight={MEDIUM} style={{ fontSize: 14, color: themeColors.secondaryText }}>
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
                  {/* Borrow / Repay Amount Label */}
                  <AppText weight={SEMI_BOLD} style={{ fontSize: 14, color: themeColors.text, marginBottom: 8 }}>
                    {isBorrow ? "Borrow Amount" : "Repayment Amount"}
                  </AppText>

                  {/* Input Container styled like Login & CoinCode Theme */}
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        backgroundColor: isDark ? (darkTheme.darkThemeInputColor || "#111214") : "#F7F8FA",
                        borderWidth: 1,
                        borderColor: isAmountFocused
                          ? (colors.cyanTheme || "#0AA8C5")
                          : (isDark ? "#2A2C33" : "#E5E7EB"),
                        borderRadius: 12,
                        height: 52,
                        paddingHorizontal: 16,
                        marginBottom: 8,
                      },
                    ]}
                  >
                    <TextInput
                      placeholder={`Enter amount to ${isBorrow ? "borrow" : "repay"}`}
                      placeholderTextColor={isDark ? (colors.darkShadeColorText || "#6A7282") : "#84888C"}
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="numeric"
                      cursorColor={themeColors.text}
                      selectionColor={themeColors.text + "40"}
                      onFocus={() => setIsAmountFocused(true)}
                      onBlur={() => setIsAmountFocused(false)}
                      style={{
                        flex: 1,
                        color: isDark ? colors.white : themeColors.text,
                        fontSize: 15,
                        fontFamily: fontFamilyMedium,
                        paddingVertical: Platform.OS === "ios" ? 12 : 8,
                      }}
                    />
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <AppText weight={SEMI_BOLD} style={{ color: themeColors.text, fontSize: 14 }}>{selectedAsset}</AppText>
                      <AppText style={{ color: themeColors.secondaryText, marginHorizontal: 8, opacity: 0.6 }}>|</AppText>
                      <TouchableOpacity
                        onPress={() => {
                          const maxBorrowAmt = parseFloat(finalBorrowable || 0).toFixed(8).replace(/\.?0+$/, "");
                          setAmount(String(isBorrow ? maxBorrowAmt : maxRepay));
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                      >
                        <AppText weight={BOLD} style={{ color: colors.cyanTheme || "#0AA8C5", fontSize: 13 }}>Max</AppText>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Info Note for Cross Borrow */}
                  {isCross && isBorrow && (
                    <View style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      backgroundColor: isDark ? "rgba(10, 168, 197, 0.08)" : "#F0F9FF",
                      borderWidth: 1,
                      borderColor: isDark ? "rgba(10, 168, 197, 0.2)" : "rgba(10, 168, 197, 0.15)",
                      padding: 12,
                      borderRadius: 10,
                      marginBottom: 20
                    }}>
                      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colors.cyanTheme || "#0AA8C5", alignItems: "center", justifyContent: "center", marginRight: 8, marginTop: 2 }}>
                        <AppText weight={BOLD} style={{ color: colors.white, fontSize: 10 }}>i</AppText>
                      </View>
                      <AppText style={{ flex: 1, fontSize: 13, color: isDark ? "#A0C4D8" : "#2B6CB0", lineHeight: 18 }}>
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
                <View style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  backgroundColor: isDark ? "rgba(10, 168, 197, 0.08)" : "#F0F9FF",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(10, 168, 197, 0.2)" : "rgba(10, 168, 197, 0.15)",
                  padding: 12,
                  borderRadius: 10,
                  marginBottom: 20
                }}>
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colors.cyanTheme || "#0AA8C5", alignItems: "center", justifyContent: "center", marginRight: 8, marginTop: 2 }}>
                    <AppText weight={BOLD} style={{ color: colors.white, fontSize: 10 }}>i</AppText>
                  </View>
                  <AppText style={{ flex: 1, fontSize: 13, color: isDark ? "#A0C4D8" : "#2B6CB0", lineHeight: 18 }}>
                    Interest is settled first, then principal. Partial repayment is allowed at any time.
                  </AppText>
                </View>
              )}

              {/* Borrow Overview (Isolated Margin / Borrow) */}
              {isBorrow && !isCross && (
                <>
                  <AppText weight={BOLD} style={{ fontSize: 16, color: themeColors.text, marginBottom: 12 }}>
                    Borrow Overview
                  </AppText>

                  <View
                    style={{
                      backgroundColor: isDark ? (darkTheme.darkThemeInputColor || "#111214") : "#F7F8FA",
                      borderWidth: 1,
                      borderColor: isDark ? "#2A2C33" : "#E5E7EB",
                      borderRadius: 14,
                      paddingHorizontal: 16,
                      paddingVertical: 4,
                    }}
                  >
                    {/* Maximum Borrow Amount */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13 }}>
                      <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Maximum Borrow Amount</AppText>
                      <AppText weight={SEMI_BOLD} style={{ fontSize: 14, color: themeColors.text }}>
                        {parseFloat(finalBorrowable || 0).toFixed(8)} {selectedAsset}
                      </AppText>
                    </View>

                    {/* Est. Liq Price */}
                    {liqPrice && liqPrice !== "—" && (
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13, borderTopWidth: 1, borderTopColor: isDark ? "#1F2228" : "#EDEFF2" }}>
                        <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Est. Liq Price</AppText>
                        <AppText weight={SEMI_BOLD} style={{ fontSize: 14, color: themeColors.text }}>
                          {liqPrice} {quoteSymbol}
                        </AppText>
                      </View>
                    )}

                    {/* Hourly Interest Rate */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13, borderTopWidth: 1, borderTopColor: isDark ? "#1F2228" : "#EDEFF2" }}>
                      <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Hourly Interest Rate</AppText>
                      <AppText weight={SEMI_BOLD} style={{ fontSize: 14, color: themeColors.text }}>
                        {hourlyRate}
                      </AppText>
                    </View>

                    {/* Annualized Interest Rate */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13, borderTopWidth: 1, borderTopColor: isDark ? "#1F2228" : "#EDEFF2" }}>
                      <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Annualized Interest Rate</AppText>
                      <AppText weight={SEMI_BOLD} style={{ fontSize: 14, color: themeColors.text }}>
                        {annualRate}
                      </AppText>
                    </View>

                    {/* Borrowed */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13, borderTopWidth: 1, borderTopColor: isDark ? "#1F2228" : "#EDEFF2" }}>
                      <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Borrowed</AppText>
                      <AppText weight={SEMI_BOLD} style={{ fontSize: 14, color: themeColors.text }}>
                        {parseFloat(borrowed || 0).toFixed(8)} {selectedAsset}
                      </AppText>
                    </View>

                    {/* Borrow Margin Level */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13, borderTopWidth: 1, borderTopColor: isDark ? "#1F2228" : "#EDEFF2" }}>
                      <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Borrow Margin Level</AppText>
                      <AppText weight={SEMI_BOLD} style={{ fontSize: 14, color: themeColors.text }}>
                        {marginLevelDisplay}
                      </AppText>
                    </View>

                    {/* Current Margin Tier */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13, borderTopWidth: 1, borderTopColor: isDark ? "#1F2228" : "#EDEFF2" }}>
                      <AppText style={{ fontSize: 14, color: themeColors.secondaryText }}>Current Margin Tier</AppText>
                      <AppText weight={SEMI_BOLD} style={{ fontSize: 14, color: themeColors.text }}>Tier 1</AppText>
                    </View>
                  </View>

                  {/* Warning Notice Box */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      backgroundColor: isDark ? "rgba(234, 179, 8, 0.08)" : "#FEFCE8",
                      borderWidth: 1,
                      borderColor: isDark ? "rgba(234, 179, 8, 0.35)" : "#FDE047",
                      padding: 14,
                      borderRadius: 12,
                      marginTop: 16,
                      marginBottom: 24,
                      gap: 12,
                    }}
                  >
                    <AlertTriangle size={18} color={isDark ? "#EAB308" : "#CA8A04"} style={{ marginTop: 2 }} />
                    <AppText style={{ flex: 1, fontSize: 13, color: isDark ? "#EAB308" : "#854D0E", lineHeight: 18 }} weight={MEDIUM}>
                      Borrowed funds are subject to hourly interest charges starting immediately. If your margin level falls below the maintenance threshold, your position may be automatically liquidated. Only borrow what you can afford to repay.
                    </AppText>
                  </View>
                </>
              )}

              {/* Confirm Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleConfirm}
                disabled={busy}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: colors.cyanTheme || "#0AA8C5",
                    height: 48,
                    borderRadius: 24,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                    flexDirection: "row",
                    gap: 8,
                    opacity: busy ? 0.7 : 1,
                  },
                ]}
              >
                {busy && <ActivityIndicator color={colors.white} size="small" />}
                <AppText weight={BOLD} style={{ color: colors.white, fontSize: 16 }}>
                  {busy ? "Confirming..." : "Confirm"}
                </AppText>
              </TouchableOpacity>
            </>
          )}

        </ScrollView>
      )}

      {/* Pair Selection Modal (Exact Margin Mode Glass Styling) */}
      <Modal
        visible={isPairModalVisible}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setIsPairModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsPairModalVisible(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "flex-end",
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e?.stopPropagation?.()}
            style={{
              backgroundColor: "transparent",
              height: Math.min(620, Dimensions.get("window").height * 0.78),
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: Platform.OS === 'ios' ? 34 : 16,
              overflow: "hidden",
            }}
          >
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="light"
              blurAmount={20}
              reducedTransparencyFallbackColor="#111214"
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "rgba(10, 12, 16, 0.68)" : "rgba(255, 255, 255, 0.85)" }]} />
            {isDark && (
              <>
                <LinearGradient
                  colors={[
                    "rgba(16, 185, 129, 0.10)",
                    "rgba(6, 182, 212, 0.04)",
                    "rgba(16, 185, 129, 0.02)",
                    "rgba(16, 185, 129, 0.07)",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                <LinearGradient
                  colors={["transparent", "rgba(16, 185, 129, 0.04)", "transparent"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
              </>
            )}

            {/* Top Pill Handle */}
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255, 255, 255, 0.2)" }} />
            </View>

            <View style={{ flex: 1, paddingHorizontal: 4 }}>
              {/* Header */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 4, paddingBottom: 16 }}>
                <AppText weight={BOLD} style={{ fontSize: 18, color: themeColors.text }}>
                  Select Pair
                </AppText>
                <TouchableOpacity onPress={() => setIsPairModalVisible(false)} style={{ padding: 4 }}>
                  <X size={18} color={themeColors.secondaryText} />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View
                style={{
                  height: 46,
                  borderRadius: 12,
                  backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#F7F8FA",
                  borderWidth: 1,
                  borderColor: isPairSearchFocused
                    ? (colors.cyanTheme || "#0AA8C5")
                    : (isDark ? "rgba(255, 255, 255, 0.12)" : "#E5E7EB"),
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 14,
                  marginBottom: 16,
                  gap: 10,
                }}
              >
                <Search size={18} color={isPairSearchFocused ? (colors.cyanTheme || "#0AA8C5") : "rgba(255, 255, 255, 0.5)"} />
                <TextInput
                  placeholder="Search pair..."
                  placeholderTextColor={isDark ? "rgba(255, 255, 255, 0.4)" : "#84888C"}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onFocus={() => setIsPairSearchFocused(true)}
                  onBlur={() => setIsPairSearchFocused(false)}
                  cursorColor={themeColors.text}
                  selectionColor={themeColors.text + "40"}
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontFamily: fontFamilyMedium,
                    color: isDark ? colors.white : themeColors.text,
                    paddingVertical: Platform.OS === "ios" ? 8 : 4,
                  }}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <X size={16} color={themeColors.secondaryText} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* List Cards */}
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                {filteredPairs.map((p) => {
                  const pStr = `${p.base_currency}/${p.quote_currency}`;
                  const pStrFormatted = pStr.replace("/", "");
                  const accountMatch = marginBalances.find(a => a.pair === pStrFormatted && a.asset_type === "base");
                  const availableBase = accountMatch ? parseFloat(accountMatch.available || 0) : 0;
                  const isSelected = selectedPairStr === pStr;

                  return (
                    <TouchableOpacity
                      key={pStr}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedPairStr(pStr);
                        setSelectedAsset(p.base_currency);
                        setAmount("");
                        setIsPairModalVisible(false);
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: isSelected
                          ? "rgba(10, 168, 197, 0.12)"
                          : isDark
                            ? "rgba(255, 255, 255, 0.04)"
                            : "rgba(0, 0, 0, 0.03)",
                        borderRadius: 14,
                        padding: 14,
                        marginBottom: 10,
                        borderWidth: 1.2,
                        borderColor: isSelected
                          ? (colors.cyanTheme || "#0AA8C5")
                          : isDark
                            ? "rgba(255, 255, 255, 0.10)"
                            : "#E5E5EA",
                      }}
                    >
                      <View>
                        <AppText weight={BOLD} style={{ fontSize: 16, color: isSelected ? (colors.cyanTheme || "#0AA8C5") : themeColors.text }}>
                          {pStr}
                        </AppText>
                        <AppText style={{ fontSize: 13, color: themeColors.secondaryText, marginTop: 2 }}>
                          Available: {availableBase > 0 ? availableBase.toFixed(6) : "0"} {p.base_currency}
                        </AppText>
                      </View>

                      {/* Bullseye Radio Indicator */}
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          borderWidth: 2,
                          borderColor: isSelected ? (colors.cyanTheme || "#0AA8C5") : (isDark ? "rgba(255, 255, 255, 0.25)" : "#D1D5DB"),
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {isSelected && (
                          <View
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 5,
                              backgroundColor: colors.cyanTheme || "#0AA8C5",
                            }}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Asset Selection Modal (Exact Margin Mode Glass Styling) */}
      <Modal
        visible={isAssetModalVisible}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setIsAssetModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsAssetModalVisible(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "flex-end",
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e?.stopPropagation?.()}
            style={{
              backgroundColor: "transparent",
              height: Math.min(580, Dimensions.get("window").height * 0.75),
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: Platform.OS === 'ios' ? 34 : 16,
              overflow: "hidden",
            }}
          >
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="light"
              blurAmount={20}
              reducedTransparencyFallbackColor="#111214"
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "rgba(10, 12, 16, 0.68)" : "rgba(255, 255, 255, 0.85)" }]} />
            {isDark && (
              <>
                <LinearGradient
                  colors={[
                    "rgba(16, 185, 129, 0.10)",
                    "rgba(6, 182, 212, 0.04)",
                    "rgba(16, 185, 129, 0.02)",
                    "rgba(16, 185, 129, 0.07)",
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                <LinearGradient
                  colors={["transparent", "rgba(16, 185, 129, 0.04)", "transparent"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
              </>
            )}

            {/* Top Pill Handle */}
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255, 255, 255, 0.2)" }} />
            </View>

            <View style={{ flex: 1, paddingHorizontal: 4 }}>
              {/* Header */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 4, paddingBottom: 16 }}>
                <AppText weight={BOLD} style={{ fontSize: 18, color: themeColors.text }}>
                  Select Asset
                </AppText>
                <TouchableOpacity onPress={() => setIsAssetModalVisible(false)} style={{ padding: 4 }}>
                  <X size={18} color={themeColors.secondaryText} />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View
                style={{
                  height: 46,
                  borderRadius: 12,
                  backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#F7F8FA",
                  borderWidth: 1,
                  borderColor: isAssetSearchFocused
                    ? (colors.cyanTheme || "#0AA8C5")
                    : (isDark ? "rgba(255, 255, 255, 0.12)" : "#E5E7EB"),
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 14,
                  marginBottom: 16,
                  gap: 10,
                }}
              >
                <Search size={18} color={isAssetSearchFocused ? (colors.cyanTheme || "#0AA8C5") : "rgba(255, 255, 255, 0.5)"} />
                <TextInput
                  placeholder="Search asset..."
                  placeholderTextColor={isDark ? "rgba(255, 255, 255, 0.4)" : "#84888C"}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onFocus={() => setIsAssetSearchFocused(true)}
                  onBlur={() => setIsAssetSearchFocused(false)}
                  cursorColor={themeColors.text}
                  selectionColor={themeColors.text + "40"}
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontFamily: fontFamilyMedium,
                    color: isDark ? colors.white : themeColors.text,
                    paddingVertical: Platform.OS === "ios" ? 8 : 4,
                  }}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <X size={16} color={themeColors.secondaryText} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* List Cards */}
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                {filteredCrossAssets.map((a) => {
                  const isSelected = selectedAsset === a.currency;
                  return (
                    <TouchableOpacity
                      key={a.currency}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedAsset(a.currency);
                        setAmount("");
                        setIsAssetModalVisible(false);
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: isSelected
                          ? "rgba(10, 168, 197, 0.12)"
                          : isDark
                            ? "rgba(255, 255, 255, 0.04)"
                            : "rgba(0, 0, 0, 0.03)",
                        borderRadius: 14,
                        padding: 14,
                        marginBottom: 10,
                        borderWidth: 1.2,
                        borderColor: isSelected
                          ? (colors.cyanTheme || "#0AA8C5")
                          : isDark
                            ? "rgba(255, 255, 255, 0.10)"
                            : "#E5E5EA",
                      }}
                    >
                      <AppText weight={BOLD} style={{ fontSize: 16, color: isSelected ? (colors.cyanTheme || "#0AA8C5") : themeColors.text }}>
                        {a.currency}
                      </AppText>

                      {/* Bullseye Radio Indicator */}
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          borderWidth: 2,
                          borderColor: isSelected ? (colors.cyanTheme || "#0AA8C5") : (isDark ? "rgba(255, 255, 255, 0.25)" : "#D1D5DB"),
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {isSelected && (
                          <View
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 5,
                              backgroundColor: colors.cyanTheme || "#0AA8C5",
                            }}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
    gap: 20,
    alignItems: "center",
  },
  headerTabBtn: {
    alignItems: "center",
    paddingVertical: 4,
  },
  activeTabIndicator: {
    width: 20,
    height: 3,
    borderRadius: 2,
    marginTop: 4,
  },
  inputContainer: {
    height: 52,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  actionBtn: {
    width: "100%",
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
