import React, { useCallback, useContext, useState, useMemo, useRef, useEffect } from "react";
import {
  SectionList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Platform,
  Vibration,
  PanResponder,
  Dimensions,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RBSheet from "react-native-raw-bottom-sheet";
import LinearGradient from "react-native-linear-gradient";
import {
  AppSafeAreaView,
  AppText,
  FOURTEEN,
  SEMI_BOLD,
  MEDIUM,
  TWELVE,
  TEN,
  NINE,
  BOLD,
  THIRTEEN,
  ELEVEN,
  SIXTEEN,
  EIGHTEEN,
  TWENTY_TWO,
  RED,
} from "../../../shared";
import FastImage from "react-native-fast-image";
import { back_ic, INFO, historyIcon, upIcon, downIcon } from "../../../helper/ImageAssets";
import { WITHDRAW_HISTORY_SCREEN, WITHDRAW_FIAT_SCREEN } from "../../../navigation/routes";
import { buildMarketIconIndex, withMarketCoinIcon } from "../../../helper/walletCoinIcon";
import DepositCoinIcon, { buildDepositCoinIconUri } from "../DepositCoinIcon";
import { BlurSheetBackground, blurSheetRbCustomStyles, blurSheetTheme } from "../sheets/BlurSheetChrome";
import { Search, X, Star } from "lucide-react-native";
import MiniSparkline from "../../../shared/components/MiniSparkline";
import ShimmerBone from "../../../shared/components/ShimmerBone";
import { SocketContext } from "../../../SocketProvider";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import NavigationService from "../../../navigation/NavigationService";
import { useAppSelector } from "../../../store/hooks";
import { useDispatch } from "react-redux";
import { getDepositFiatCoins, getWithdrawActiveCoins, getUserMainWallet } from "../../../actions/walletActions";
import { getFavoriteArray, addToFavorites } from "../../../actions/homeActions";
import { colors } from "../../../theme/colors";
import { useTheme } from "../../../hooks/useTheme";
import {
  isWithdrawCoinDisabled,
  networkKeysFromChain,
} from "../../../helper/walletChainHelpers";
import { showError } from "../../../helper/logger";

const TRENDING_COIN_SYMBOLS = [
  "BTC", "ETH", "BNB", "USDT", "USDC", "XRP", "SOL", "DOGE", "MATIC", "DOT", "LTC", "TRX", "SHIB", "ADA", "BUSD",
];

const COIN_LIST_ROW_INNER = 56;
const ACCENT_CYAN = colors.cyanTheme;
const MARKET_QUOTE = "USDT";
const WITHDRAW_RECENT_SHORT_NAMES_KEY = "withdraw_recent_short_names_v1";

const LETTER_KEYS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const RAIL_KEYS = ["#", ...LETTER_KEYS];

/** Brand tint for recent chips (same palette as the deposit coin list). */
const BRAND_ACCENTS = {
  BTC: "#F7931A",
  ETH: "#627EEA",
  USDT: "#26A17B",
  USDC: "#2775CA",
  BNB: "#F3BA2F",
  TRX: "#FF0013",
  SOL: "#9945FF",
  DOGE: "#C2A633",
  ADA: "#0033AD",
  MATIC: "#8247E5",
  POL: "#8247E5",
  DOT: "#E6007A",
  LTC: "#345D9D",
  SHIB: "#E42C21",
  AVAX: "#E84142",
  ARB: "#28A0F0",
  OP: "#FF0420",
  TON: "#0098EA",
};
const FALLBACK_ACCENTS = ["#0AA8C5", "#8247E5", "#26A17B", "#F7931A", "#E6007A", "#2775CA"];

const accentForSymbol = (symbol) => {
  const key = String(symbol || "").trim().toUpperCase();
  if (BRAND_ACCENTS[key]) return BRAND_ACCENTS[key];
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return FALLBACK_ACCENTS[hash % FALLBACK_ACCENTS.length];
};

const hexToRgba = (hex, alpha) => {
  let h = String(hex || "").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return `rgba(10, 168, 197, ${alpha})`;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

const formatUsdPrice = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1) {
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  const decimals = Math.min(10, Math.max(4, -Math.floor(Math.log10(n)) + 1));
  return `$${n.toFixed(decimals).replace(/0+$/, "").replace(/\.$/, "")}`;
};

const triggerRailHaptic = () => {
  if (Platform.OS === "android") {
    try {
      Vibration.vibrate(1);
    } catch { /* ignore */ }
  }
};

const sectionLetterFromCoin = (item) => {
  const ch = String(item?.short_name || "").charAt(0);
  return /[A-Za-z]/.test(ch) ? ch.toUpperCase() : "#";
};

const buildCoinSections = (list) => {
  const byLetter = {};
  (list || []).forEach((item) => {
    const title = sectionLetterFromCoin(item);
    if (!byLetter[title]) byLetter[title] = [];
    byLetter[title].push(item);
  });
  return RAIL_KEYS.filter((L) => byLetter[L]?.length).map((title) => ({ title, data: byLetter[title] }));
};

/** Jump to section: exact rail key, else next with rows, else previous. */
const resolveScrollSectionIndex = (letter, sections) => {
  const idx = sections.findIndex((s) => s.title === letter);
  if (idx >= 0) return idx;
  const start = RAIL_KEYS.indexOf(letter);
  if (start < 0) return -1;
  for (let i = start; i < RAIL_KEYS.length; i++) {
    const j = sections.findIndex((s) => s.title === RAIL_KEYS[i]);
    if (j >= 0) return j;
  }
  for (let i = start - 1; i >= 0; i--) {
    const j = sections.findIndex((s) => s.title === RAIL_KEYS[i]);
    if (j >= 0) return j;
  }
  return -1;
};

const yToRailLetter = (locationY, railHeight) => {
  const h = Math.max(1, railHeight);
  const y = Math.max(0, Math.min(locationY, h));
  const idx = Math.min(RAIL_KEYS.length - 1, Math.floor((y / h) * RAIL_KEYS.length));
  return RAIL_KEYS[idx];
};

const SelectCoinListSkeleton = () => (
  <View style={styles.selectCoinPhase}>
    <View style={styles.searchSection}>
      <ShimmerBone width="100%" height={48} borderRadius={24} />
    </View>
    <View style={styles.selectCoinListRow}>
      <View style={[styles.sectionListFlex, { paddingTop: 4 }]}>
        <View style={[styles.sectionHeaderRow, { marginBottom: 10 }]}>
          <ShimmerBone width={110} height={16} borderRadius={4} />
        </View>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", minHeight: COIN_LIST_ROW_INNER }}>
            <ShimmerBone width={36} height={36} borderRadius={18} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <ShimmerBone width={72} height={14} borderRadius={4} style={{ marginBottom: 6 }} />
              <ShimmerBone width={36} height={11} borderRadius={4} />
            </View>
            <ShimmerBone width={72} height={18} borderRadius={6} style={{ marginRight: 16 }} />
            <ShimmerBone width={70} height={14} borderRadius={4} style={{ marginRight: 10 }} />
            <ShimmerBone width={16} height={16} borderRadius={8} />
          </View>
        ))}
      </View>
    </View>
  </View>
);

const SelectCoin = () => {
  const dispatch = useDispatch();
  const route = useRoute();
  const { colors: themeColors, isDark } = useTheme();
  const withdrawActiveCoins = useAppSelector((state) => state.wallet.withdrawActiveCoins);
  const depositFiatCoins = useAppSelector((state) => state.wallet.depositFiatCoins);
  const coinData = useAppSelector((state) => state.home.coinData);
  const coinPairs = useAppSelector((state) => state.home.coinPairs);
  const hotPairsChart = useAppSelector((state) => state.home.hotPairsChart);
  const favoriteArray = useAppSelector((state) => state.home.favoriteArray);
  const { subscribeToMarket, unsubscribeFromMarket } = useContext(SocketContext) || {};

  const marketIconBySymbol = useMemo(() => buildMarketIconIndex(coinData), [coinData]);
  const sheetTheme = useMemo(() => blurSheetTheme(isDark), [isDark]);
  const faqSheetStyles = useMemo(
    () =>
      blurSheetRbCustomStyles({
        isDark,
        height: Math.round(Dimensions.get("window").height * 0.55),
        borderRadius: 24,
      }),
    [isDark]
  );
  const ui = useMemo(
    () => ({
      cardBg: isDark ? "rgba(255, 255, 255, 0.03)" : "#F8F9FA",
      border: isDark ? "rgba(255, 255, 255, 0.1)" : "#ECECEC",
    }),
    [isDark]
  );
  const isFrom = route?.params?.data;

  const [activeTab] = useState(isFrom || "Crypto");
  const withdrawFaqSheetRef = useRef(null);
  const [faqActiveIndex, setFaqActiveIndex] = useState(null);

  const faqData = [
    {
      title: "How to Withdraw Crypto?",
      content: "To withdraw crypto, go to the withdrawal section, select your cryptocurrency, enter the recipient wallet address, choose the correct network, and specify the amount. Review the details carefully before confirming the withdrawal. Processing time may vary based on network congestion and withdrawal policies."
    },
    {
      title: "How to Withdraw Crypto Step-by-step Guide",
      content: "• Go to the Withdrawal Section – Navigate to the withdrawal page.\n• Select Your Crypto – Choose the cryptocurrency you want to withdraw.\n• Enter the Wallet Address – Make sure the address is correct and belongs to the selected blockchain network.\n• Choose the Network – Select the correct blockchain network (e.g., BEP20, ERC20, TRC20, Polygon).\n• Enter the Amount – Specify the amount you want to withdraw, ensuring it meets the minimum withdrawal limit.\n• Confirm & Submit – Review all details carefully and confirm the withdrawal.\n• Wait for Processing – Withdrawals are processed based on network congestion and request approval."
    },
    {
      title: "Withdrawal hasn't arrived?",
      content: "• Check Transaction Status – Use a blockchain explorer to track the transaction.\n• Verify the Wallet Address – Ensure the recipient address is correct.\n• Confirm Network Selection – The chosen network should match the recipient's wallet.\n• Check for Pending Processing – Some withdrawals require manual approval."
    }
  ];
  const [searchResult, setSearchResult] = useState("");
  const [listScreenLoading, setListScreenLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [railScrollLetter, setRailScrollLetter] = useState(null);
  const [bubbleLetter, setBubbleLetter] = useState(null);
  const [recentShortNames, setRecentShortNames] = useState([]);

  const coinSectionListRef = useRef(null);
  const sectionsRef = useRef([]);
  const railLayoutHeightRef = useRef(1);
  const railDragActiveRef = useRef(false);
  const lastRailHapticLetterRef = useRef(null);
  const bubbleHideTimeoutRef = useRef(null);
  const scrollToLetterRef = useRef(() => { });
  const onViewableItemsChangedRef = useRef(null);

  const fetchSelectCoinData = useCallback(
    () =>
      Promise.all([
        dispatch(getWithdrawActiveCoins()),
        dispatch(getDepositFiatCoins()),
        dispatch(getUserMainWallet()),
      ]),
    [dispatch]
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setListScreenLoading(true);
      (async () => {
        await fetchSelectCoinData();
        if (!cancelled) setListScreenLoading(false);
      })();
      return () => { cancelled = true; };
    }, [fetchSelectCoinData])
  );

  useFocusEffect(
    useCallback(() => {
      subscribeToMarket?.("withdrawSelectCoin");
      return () => {
        unsubscribeFromMarket?.("withdrawSelectCoin");
      };
    }, [subscribeToMarket, unsubscribeFromMarket])
  );

  useEffect(() => {
    dispatch(getFavoriteArray());
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(WITHDRAW_RECENT_SHORT_NAMES_KEY);
        if (raw) setRecentShortNames(JSON.parse(raw));
      } catch { /* ignore */ }
    })();
    return () => {
      if (bubbleHideTimeoutRef.current) clearTimeout(bubbleHideTimeoutRef.current);
    };
  }, [dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSelectCoinData();
    setRefreshing(false);
  }, [fetchSelectCoinData]);

  /** Live USDT pair per coin symbol → price, 24h change, sparkline, favourite pair id. */
  const marketBySymbol = useMemo(() => {
    const map = new Map();
    const charts = hotPairsChart || {};
    (Array.isArray(coinPairs) ? coinPairs : []).forEach((p) => {
      const base = String(p?.base_currency || "").toUpperCase();
      const quote = String(p?.quote_currency || "").toUpperCase();
      if (!base || quote !== MARKET_QUOTE) return;
      map.set(base, {
        pairId: p?._id ? String(p._id) : null,
        price: Number(p?.last_price ?? p?.buy_price ?? p?.price) || 0,
        change: Number(p?.change_percentage ?? p?.changePercentage ?? p?.change) || 0,
        chart: Array.isArray(charts[base]) ? charts[base] : [],
      });
    });
    if (!map.has(MARKET_QUOTE)) {
      map.set(MARKET_QUOTE, { pairId: null, price: 1, change: 0, chart: charts[MARKET_QUOTE] || [] });
    }
    return map;
  }, [coinPairs, hotPairsChart]);

  const favoriteSet = useMemo(
    () => new Set((Array.isArray(favoriteArray) ? favoriteArray : []).map((id) => String(id))),
    [favoriteArray]
  );

  const handleToggleFavorite = useCallback(
    (pairId) => {
      if (!pairId) return;
      dispatch(addToFavorites({ pair_id: pairId }));
    },
    [dispatch]
  );

  const coinList = useMemo(
    () => (activeTab === "Fiat" ? (depositFiatCoins || []) : (withdrawActiveCoins || [])),
    [activeTab, depositFiatCoins, withdrawActiveCoins]
  );
  const isSearching = Boolean(searchResult.trim());

  const sortedCoins = useMemo(() => {
    const list = coinList;
    const q = searchResult.trim().toLowerCase();

    if (q) {
      const filtered = list.filter(
        (c) =>
          String(c?.short_name || "").toLowerCase().includes(q) ||
          String(c?.name || "").toLowerCase().includes(q)
      );
      const ranked = filtered.sort((a, b) => {
        const sA = String(a?.short_name || "").toUpperCase();
        const sB = String(b?.short_name || "").toUpperCase();
        const qU = q.toUpperCase();
        if (sA === qU && sB !== qU) return -1;
        if (sB === qU && sA !== qU) return 1;
        const aS = sA.startsWith(qU);
        const bS = sB.startsWith(qU);
        if (aS && !bS) return -1;
        if (!aS && bS) return 1;
        const nA = String(a?.name || "").toUpperCase();
        const nB = String(b?.name || "").toUpperCase();
        const aNS = nA.startsWith(qU);
        const bNS = nB.startsWith(qU);
        if (aNS && !bNS) return -1;
        if (!aNS && bNS) return 1;
        return sA.localeCompare(sB);
      });
      return { trending: [], rest: ranked };
    }

    const trending = [];
    const rest = [];
    const bySym = new Map();
    list.forEach(c => {
      const sym = String(c?.short_name || "").toUpperCase();
      if (sym) bySym.set(sym, c);
    });
    TRENDING_COIN_SYMBOLS.forEach(sym => {
      if (bySym.has(sym)) trending.push(bySym.get(sym));
    });
    const trendingIdSet = new Set(trending.map(c => c._id || c.short_name));
    list.forEach(c => {
      if (!trendingIdSet.has(c._id || c.short_name)) rest.push(c);
    });
    rest.sort((a, b) => String(a?.short_name || "").toUpperCase().localeCompare(String(b?.short_name || "").toUpperCase()));
    return { trending, rest };
  }, [coinList, searchResult]);

  const trendingCoins = sortedCoins.trending;
  const coinSections = useMemo(() => {
    if (isSearching) return sortedCoins.rest.length ? [{ title: "", data: sortedCoins.rest }] : [];
    return buildCoinSections(sortedCoins.rest);
  }, [isSearching, sortedCoins]);

  useEffect(() => {
    sectionsRef.current = coinSections;
  }, [coinSections]);

  const recentCoins = useMemo(
    () =>
      recentShortNames
        .map((sn) => coinList.find((c) => String(c?.short_name) === String(sn)))
        .filter(Boolean),
    [recentShortNames, coinList]
  );

  const saveRecentCoin = useCallback(async (shortName) => {
    if (!shortName) return;
    try {
      const raw = await AsyncStorage.getItem(WITHDRAW_RECENT_SHORT_NAMES_KEY);
      let arr = raw ? JSON.parse(raw) : [];
      arr = [String(shortName), ...arr.filter((s) => s !== shortName)].slice(0, 12);
      await AsyncStorage.setItem(WITHDRAW_RECENT_SHORT_NAMES_KEY, JSON.stringify(arr));
      setRecentShortNames(arr);
    } catch { /* ignore */ }
  }, []);

  const clearRecentCoins = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(WITHDRAW_RECENT_SHORT_NAMES_KEY);
      setRecentShortNames([]);
    } catch { /* ignore */ }
  }, []);

  const removeRecentCoin = useCallback(async (shortName) => {
    const next = recentShortNames.filter((s) => String(s) !== String(shortName));
    setRecentShortNames(next);
    try {
      await AsyncStorage.setItem(WITHDRAW_RECENT_SHORT_NAMES_KEY, JSON.stringify(next));
    } catch { /* ignore */ }
  }, [recentShortNames]);

  const handleCoinPress = (item) => {
    if (activeTab === "Crypto" && isWithdrawCoinDisabled(item)) {
      if (networkKeysFromChain(item?.chain).length === 0) showError("No withdrawal network available for this coin");
      else showError("No active withdrawal network for this coin");
      return;
    }
    saveRecentCoin(item?.short_name);
    NavigationService.navigate("WITHDRAW_FORM_SCREEN", { data: item });
  };

  scrollToLetterRef.current = (letter, animated) => {
    const sections = sectionsRef.current;
    if (!sections.length) return;
    const sectionIndex = resolveScrollSectionIndex(letter, sections);
    if (sectionIndex < 0) return;
    try {
      coinSectionListRef.current?.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        animated,
        viewPosition: 0,
        viewOffset: 0,
      });
    } catch { /* layout not ready */ }
  };

  onViewableItemsChangedRef.current = ({ viewableItems }) => {
    if (railDragActiveRef.current) return;
    const top = viewableItems.find((v) => v?.isViewable && v?.item?.short_name != null);
    if (!top?.item) return;
    setRailScrollLetter(sectionLetterFromCoin(top.item));
  };

  const onViewableItemsChanged = useCallback((info) => {
    onViewableItemsChangedRef.current?.(info);
  }, []);

  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 18, minimumViewTime: 48 }), []);

  const alphabetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: (evt) => {
          if (bubbleHideTimeoutRef.current) {
            clearTimeout(bubbleHideTimeoutRef.current);
            bubbleHideTimeoutRef.current = null;
          }
          railDragActiveRef.current = true;
          const letter = yToRailLetter(evt.nativeEvent.locationY, railLayoutHeightRef.current);
          setBubbleLetter(letter);
          setRailScrollLetter(letter);
          lastRailHapticLetterRef.current = letter;
          scrollToLetterRef.current(letter, false);
          triggerRailHaptic();
        },
        onPanResponderMove: (evt) => {
          const letter = yToRailLetter(evt.nativeEvent.locationY, railLayoutHeightRef.current);
          if (lastRailHapticLetterRef.current !== letter) {
            setBubbleLetter(letter);
            setRailScrollLetter(letter);
            lastRailHapticLetterRef.current = letter;
            scrollToLetterRef.current(letter, false);
            triggerRailHaptic();
          }
        },
        onPanResponderRelease: () => {
          railDragActiveRef.current = false;
          lastRailHapticLetterRef.current = null;
          bubbleHideTimeoutRef.current = setTimeout(() => setBubbleLetter(null), 160);
        },
        onPanResponderTerminate: () => {
          railDragActiveRef.current = false;
          lastRailHapticLetterRef.current = null;
          setBubbleLetter(null);
        },
      }),
    []
  );

  const highlightedRailLetter = bubbleLetter ?? railScrollLetter;

  const listExtraData = useMemo(
    () => ({ isDark, marketBySymbol, favoriteSet, marketIconBySymbol }),
    [isDark, marketBySymbol, favoriteSet, marketIconBySymbol]
  );

  const renderCoinLogo = (item, size) => (
    <View style={{ borderRadius: 999, overflow: "hidden" }}>
      <DepositCoinIcon uri={buildDepositCoinIconUri(withMarketCoinIcon(item, marketIconBySymbol))} size={size} />
    </View>
  );

  const renderCoinListItem = ({ item }) => {
    const disabled = activeTab === "Crypto" && isWithdrawCoinDisabled(item);
    const symbol = String(item?.short_name || "").toUpperCase();
    const market = marketBySymbol.get(symbol);
    const isUp = (market?.change ?? 0) >= 0;
    const isFavorite = !!market?.pairId && favoriteSet.has(market.pairId);
    return (
      <TouchableOpacity
        style={[
          styles.coinItem,
          styles.coinListRow,
          { borderBottomColor: ui.border },
          disabled && styles.coinItemDisabled,
        ]}
        onPress={() => handleCoinPress(item)}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <View style={styles.coinLeft}>
          {renderCoinLogo(item, 36)}
          <View style={styles.coinInfo}>
            <AppText weight={SEMI_BOLD} type={FOURTEEN} numberOfLines={1} style={{ color: themeColors.text }}>
              {item?.name || item?.short_name}
            </AppText>
            {disabled ? (
              <AppText type={TEN} color={RED} weight={SEMI_BOLD} style={{ marginTop: 2 }}>
                {symbol ? `${symbol} · ` : ""}Suspended
              </AppText>
            ) : (
              <AppText type={ELEVEN} numberOfLines={1} style={{ color: themeColors.secondaryText, marginTop: 2 }}>
                {symbol}
              </AppText>
            )}
          </View>
        </View>

        <View style={styles.coinSpark}>
          <MiniSparkline
            chartData={market?.chart}
            isPositive={isUp}
            width={84}
            height={30}
            chartId={`withdraw-spark-${symbol}`}
            fallbackPrice={market?.price || 100}
            glow
          />
        </View>

        <View style={styles.coinRight}>
          <AppText
            weight={SEMI_BOLD}
            type={FOURTEEN}
            numberOfLines={1}
            style={{ color: themeColors.text, flexShrink: 1, textAlign: "right" }}
          >
            {formatUsdPrice(market?.price)}
          </AppText>
          <TouchableOpacity
            onPress={() => handleToggleFavorite(market?.pairId ?? null)}
            disabled={!market?.pairId}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            style={[styles.starBtn, !market?.pairId && { opacity: 0.35 }]}
          >
            <Star
              color={isFavorite ? colors.starColor : themeColors.secondaryText}
              fill={isFavorite ? colors.starColor : "transparent"}
              size={16}
              strokeWidth={1.6}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }) => {
    if (!section?.title) return null;
    return (
      <View style={[styles.coinSectionHeader, { backgroundColor: themeColors.background }]}>
        <AppText weight={SEMI_BOLD} type={TWELVE} style={{ color: ACCENT_CYAN }}>
          {section.title}
        </AppText>
      </View>
    );
  };

  const renderListHeader = () => {
    if (isSearching) return null;
    return (
      <View style={{ paddingBottom: 4 }}>
        {recentCoins.length > 0 && (
          <View style={styles.recentChipsSection}>
            <View style={styles.sectionHeaderRow}>
              <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: themeColors.text }}>
                Recent
              </AppText>
              <TouchableOpacity onPress={clearRecentCoins} hitSlop={12}>
                <AppText weight={MEDIUM} type={TWELVE} style={{ color: ACCENT_CYAN }}>
                  Clear All
                </AppText>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentChipsScroll}
              keyboardShouldPersistTaps="handled"
            >
              {recentCoins.map((item) => {
                const accent = accentForSymbol(item?.short_name);
                return (
                  <TouchableOpacity
                    key={String(item?._id || item?.short_name)}
                    style={[
                      styles.recentChip,
                      { backgroundColor: ui.cardBg, borderColor: hexToRgba(accent, 0.4) },
                    ]}
                    onPress={() => handleCoinPress(item)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={[hexToRgba(accent, 0.15), hexToRgba(accent, 0)]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={StyleSheet.absoluteFill}
                    />
                    {renderCoinLogo(item, 32)}
                    <View style={styles.recentTextWrapper}>
                      <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
                        {item.short_name}
                      </AppText>
                      {item?.name ? (
                        <AppText type={TEN} numberOfLines={1} style={{ color: themeColors.secondaryText, maxWidth: 90 }}>
                          {item.name}
                        </AppText>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      onPress={() => removeRecentCoin(item.short_name)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.recentRemoveBtn}
                    >
                      <X color={themeColors.secondaryText} size={14} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
        {trendingCoins.length > 0 && (
          <View style={styles.trendingBlock}>
            <View style={styles.sectionHeaderRow}>
              <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: themeColors.text }}>
                Trending Coins
              </AppText>
            </View>
            {trendingCoins.map((item) => (
              <View key={String(item?._id || item?.short_name)}>{renderCoinListItem({ item })}</View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const showSkeleton = listScreenLoading && coinList.length === 0;

  return (
    <AppSafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
      <View style={styles.headerView}>
        <TouchableOpacity onPress={() => NavigationService.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <FastImage source={back_ic} resizeMode="contain" style={{ width: 35, height: 35 }} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => {
              setFaqActiveIndex(null);
              withdrawFaqSheetRef.current?.open();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.headerIconBtn}
          >
            <FastImage source={INFO} resizeMode="contain" style={{ width: 18, height: 18 }} tintColor={themeColors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => NavigationService.navigate(WITHDRAW_HISTORY_SCREEN)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.headerIconBtn}
          >
            <FastImage source={historyIcon} resizeMode="contain" style={{ width: 22, height: 22 }} tintColor={themeColors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.titleSection}>
        <AppText weight={SEMI_BOLD} type={TWENTY_TWO} style={{ color: themeColors.text }}>
          Select Coins
        </AppText>
        <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, marginTop: 4 }}>
          Choose the coin you want to withdraw
        </AppText>
      </View>

      {showSkeleton ? (
        <SelectCoinListSkeleton />
      ) : (
        <View style={styles.selectCoinPhase}>
          <View style={styles.searchSection}>
            <View style={[styles.searchInputWrapper, { backgroundColor: ui.cardBg, borderColor: ui.border }]}>
              <Search color={themeColors.secondaryText} size={18} style={styles.searchInputIcon} />
              <TextInput
                style={[styles.searchInput, { color: themeColors.text }]}
                placeholder="Search coins"
                placeholderTextColor={themeColors.secondaryText}
                cursorColor={isDark ? colors.white : colors.black}
                value={searchResult}
                onChangeText={setSearchResult}
              />
              {searchResult ? (
                <TouchableOpacity
                  onPress={() => setSearchResult("")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.searchClearBtn}
                >
                  <X color={themeColors.secondaryText} size={16} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={styles.selectCoinListRow}>
            <SectionList
              ref={coinSectionListRef}
              sections={coinSections}
              keyExtractor={(item, index) => (item?._id ? String(item._id) : `row-${index}`)}
              renderItem={renderCoinListItem}
              renderSectionHeader={renderSectionHeader}
              stickySectionHeadersEnabled={false}
              ListHeaderComponent={renderListHeader()}
              showsVerticalScrollIndicator={false}
              style={styles.sectionListFlex}
              contentContainerStyle={[styles.sectionListContent, !isSearching && styles.sectionListContentWithIndex]}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={24}
              maxToRenderPerBatch={20}
              windowSize={9}
              updateCellsBatchingPeriod={50}
              removeClippedSubviews={Platform.OS === "android"}
              viewabilityConfig={viewabilityConfig}
              onViewableItemsChanged={onViewableItemsChanged}
              extraData={listExtraData}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.text} />}
              ListEmptyComponent={
                !listScreenLoading && trendingCoins.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <AppText type={THIRTEEN} color={colors.textGray}>
                      No coins found
                    </AppText>
                  </View>
                ) : null
              }
            />
            {!isSearching && coinSections.length > 0 && (
              <>
                {bubbleLetter != null && (
                  <View style={[styles.alphabetBubbleWrap, styles.alphabetBubbleZ]} pointerEvents="none">
                    <View style={[styles.alphabetBubble, isDark ? styles.alphabetBubbleDark : styles.alphabetBubbleLight]}>
                      <AppText weight={SEMI_BOLD} type={SIXTEEN} style={styles.alphabetBubbleText}>
                        {bubbleLetter}
                      </AppText>
                    </View>
                  </View>
                )}
                <View
                  style={[styles.alphabetIndexRail, styles.alphabetIndexRailZ]}
                  onLayout={(e) => { railLayoutHeightRef.current = e.nativeEvent.layout.height; }}
                  collapsable={false}
                >
                  <View style={styles.alphabetIndexLettersColumn} pointerEvents="none">
                    {RAIL_KEYS.map((label) => (
                      <View key={label} style={styles.alphabetIndexLetterCell}>
                        <AppText
                          type={NINE}
                          style={{
                            ...styles.alphabetIndexLetter,
                            color: highlightedRailLetter === label ? ACCENT_CYAN : themeColors.secondaryText,
                          }}
                        >
                          {label}
                        </AppText>
                      </View>
                    ))}
                  </View>
                  <View style={StyleSheet.absoluteFill} {...alphabetPanResponder.panHandlers} />
                </View>
              </>
            )}
          </View>
        </View>
      )}

      <RBSheet customModalProps={{ statusBarTranslucent: true }}
        ref={withdrawFaqSheetRef}
        height={Math.round(Dimensions.get("window").height * 0.55)}
        closeOnDragDown
        closeOnPressMask
        keyboardAvoidingViewEnabled={false}
        customStyles={faqSheetStyles}
      >
        <BlurSheetBackground isDark={isDark} tint="cyan" />
        <View style={styles.sheetBody}>
          <View style={styles.modalHeader}>
            <AppText weight={BOLD} type={EIGHTEEN} style={{ color: sheetTheme.textColor, letterSpacing: -0.2 }}>
              Withdraw help
            </AppText>
            <TouchableOpacity
              onPress={() => withdrawFaqSheetRef.current?.close()}
              style={[styles.sheetCloseCircle, { backgroundColor: sheetTheme.closeCircleBg }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.75}
            >
              <X color={sheetTheme.iconTint} size={14} strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.modalList}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {faqData.map((item, index) => (
              <View
                key={String(index)}
                style={[
                  styles.faqItemInner,
                  index === faqData.length - 1 && styles.faqItemInnerLast,
                  { borderBottomColor: sheetTheme.rowBorderColor },
                ]}
              >
                <TouchableOpacity
                  style={styles.faqQuestionRow}
                  onPress={() => setFaqActiveIndex(faqActiveIndex === index ? null : index)}
                  activeOpacity={0.7}
                >
                  <AppText
                    type={THIRTEEN}
                    weight={SEMI_BOLD}
                    style={[
                      styles.faqQuestion,
                      { color: faqActiveIndex === index ? colors.cyanTheme : sheetTheme.textColor },
                    ]}
                  >
                    {item.title}
                  </AppText>
                  <FastImage
                    source={faqActiveIndex === index ? upIcon : downIcon}
                    resizeMode="contain"
                    style={styles.faqArrow}
                    tintColor={faqActiveIndex === index ? colors.cyanTheme : sheetTheme.subTextColor}
                  />
                </TouchableOpacity>
                {faqActiveIndex === index && (
                  <View style={[styles.faqAnswer, { borderTopColor: sheetTheme.rowBorderColor }]}>
                    {item.content.split("\n").map((line, lineIndex) => (
                      <AppText key={lineIndex} type={TWELVE} style={{ color: sheetTheme.subTextColor, lineHeight: 18 }}>
                        {line}
                      </AppText>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Bottom Note & Withdraw Fiat Link */}
          <View style={{ borderTopWidth: 1, borderTopColor: sheetTheme.rowBorderColor, paddingTop: 14, marginTop: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-start", flexWrap: "wrap" }}>
              <AppText type={TWELVE} style={{ color: sheetTheme.subTextColor }}>
                Looking to withdraw local currency (AED) instead?{" "}
              </AppText>
              <TouchableOpacity
                onPress={() => {
                  withdrawFaqSheetRef.current?.close();
                  NavigationService.navigate(WITHDRAW_FIAT_SCREEN);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <AppText type={TWELVE} weight={BOLD} color={colors.cyanTheme}>
                  Withdraw Fiat ›
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </RBSheet>
    </AppSafeAreaView>
  );
};

export default SelectCoin;

const styles = StyleSheet.create({
  headerView: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  headerRight: { flexDirection: "row", alignItems: "center" },
  headerIconBtn: { padding: 4, marginLeft: 12 },
  titleSection: { paddingHorizontal: 16, marginTop: 6, marginBottom: 12 },
  selectCoinPhase: { flex: 1, paddingHorizontal: 16 },
  searchSection: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
  },
  searchInputIcon: { marginLeft: 14, marginRight: 8 },
  searchInput: { flex: 1, height: "100%", paddingVertical: 0, fontSize: 14 },
  searchClearBtn: { paddingHorizontal: 14 },
  selectCoinListRow: { flex: 1, flexDirection: "row", position: "relative", minHeight: 0 },
  sectionListFlex: { flex: 1 },
  sectionListContent: { paddingTop: 2, paddingBottom: 24 },
  sectionListContentWithIndex: { paddingRight: 22 },
  coinSectionHeader: { paddingTop: 14, paddingBottom: 2 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  recentChipsSection: { marginBottom: 20 },
  recentChipsScroll: { flexDirection: "row", alignItems: "center", gap: 12, paddingRight: 8 },
  recentChip: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    paddingRight: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  recentTextWrapper: { marginLeft: 8, marginRight: 4, justifyContent: "center" },
  recentRemoveBtn: { padding: 4 },
  trendingBlock: { marginBottom: 6 },
  coinItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 2,
    gap: 8,
    borderBottomWidth: 1,
  },
  coinListRow: { minHeight: COIN_LIST_ROW_INNER },
  coinItemDisabled: { opacity: 0.45 },
  coinLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 },
  coinInfo: { flex: 1 },
  coinSpark: { width: 84, alignItems: "center", justifyContent: "center" },
  coinRight: { width: 100, flexDirection: "row", alignItems: "center", justifyContent: "flex-end" },
  starBtn: { marginLeft: 10 },
  emptyContainer: { paddingVertical: 16, alignItems: "center" },
  alphabetBubbleWrap: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  alphabetBubbleZ: { zIndex: 5 },
  alphabetIndexRailZ: { zIndex: 10 },
  alphabetBubble: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center" },
  alphabetBubbleLight: { backgroundColor: "rgba(10, 168, 197, 0.85)" },
  alphabetBubbleDark: { backgroundColor: "rgba(10, 168, 197, 0.35)" },
  alphabetBubbleText: { color: "#FFFFFF" },
  alphabetIndexRail: { position: "absolute", right: 0, top: 0, bottom: 0, width: 20, maxHeight: "100%" },
  alphabetIndexLettersColumn: { flex: 1, flexDirection: "column", paddingVertical: 4 },
  alphabetIndexLetterCell: { flex: 1, justifyContent: "center", alignItems: "center", minHeight: 0 },
  alphabetIndexLetter: { lineHeight: 11, fontWeight: "600" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sheetBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  sheetCloseCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  modalList: {
    flex: 1,
  },
  faqItemInner: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(128,128,128,0.15)",
  },
  faqItemInnerLast: { borderBottomWidth: 0 },
  faqQuestionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQuestion: { flex: 1 },
  faqArrow: { width: 10, height: 10, marginLeft: 8 },
  faqAnswer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.2)",
  },
});
