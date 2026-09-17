import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  Dimensions,
  AppState,
  Animated,
  ImageBackground,
  ActivityIndicator,
  Platform,
  UIManager,
  Alert,
  Modal,
  Pressable,
  Keyboard,
} from "react-native";
import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useMemo,
  memo,
} from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SpotHeader from "../../shared/components/spotHeader/SpotHeader";
import TradingDataModal from "../../common/TradingDataModal/TradingDataModal";
import FastImage from "react-native-fast-image";
import MarginHeaderDropdowns from "./MarginHeaderDropdowns";
import MarginBottomSection from "./MarginBottomSection";
import CrossMarginRiskModal, { parseCrossRisk } from "./crossMargin/CrossMarginRiskModal";
import CrossMarginLevelGauge from "./crossMargin/CrossMarginLevelGauge";
import IsolatedMarginRiskModal from "./isolatedMargin/IsolatedMarginRiskModal";
import {
  buildMarginRiskRow,
  formatMarginLevel,
  getMarginLevelStatus,
  parseMarginLevel,
  pairHasDebt,
  resolveMarginThresholds,
} from "./crossMargin/marginLevelUtils";
import ConvertSection from "./ConvertSection";
import BuyCryptoScreen from "../buyCrypto/BuyCryptoScreen";
import {
  add,
  checkIc,
  downIcon,
  INFO,
  limitTrade,
  market_ic,
  NO_NOTIFICATION_ICON,
  NO_NOTIFICATION_ICON_LIGHT,
  order_1,
  order_2,
  order_3,
  Refresh,
  REMOVE,
  right_ic,
  spotLimitTrade,
  spotMarket,
  tick,
  trade_btn,
} from "../../helper/ImageAssets";
import AddFundsSheet from "./AddFundsSheet";
import MarginHistorySection from "./MarginHistorySection";
import { useAppSelector } from "../../store/hooks";
import {
  multiply,
  percentCalculation,
  toFixedEight,
  spotOpenOrderMarketLabel,
  tradeHistoryBaseAsset,
} from "../../helper/utility";
import { colors, darkTheme, lightTheme } from "../../theme/colors";
import { fontFamily, fontFamilyMedium, fontFamilySemiBold } from "../../theme/typography";
import CustomDropdown from "../../shared/components/CustomDropdown";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import RBSheet from "react-native-raw-bottom-sheet";
import { universalPaddingHorizontal, borderWidth } from "../../theme/dimens";
import { IMAGE_BASE_URL } from "../../helper/Constants";
/** Same vertical space between Buy/Sell column sections (tabs → fields → slider → IOC → assets → CTA → footer). */
const SPOT_ORDER_V_GAP = 8;
import {
  AppText,
  BOLD,
  Button,
  MEDIUM,
  SEMI_BOLD,
  TEN,
  THIRTEEN,
  TWELVE,
  FOURTEEN,
  FIFTEEN,
} from "../../shared";
import PercentQuickSelect from "../../shared/components/PercentQuickSelect";
import ReactNativeModal from "react-native-modal";
import { getPastOrders } from "../../actions/homeActions";
import { getTradeHistory } from "../../actions/walletActions";
import HistorySectionLoader from "../../common/HistorySectionLoader/HistorySectionLoader";
import {
  setBuyOrders,
  setPastOrders,
  setRecentTrades,
  setSellOrders,
  setSpotSelectedPair,
  setOpenOrders,
  setCoinData,
} from "../../slices/homeSlice";
import { clearTradeHistory } from "../../slices/walletSlice";
import { setLoading } from "../../slices/authSlice";
import { useFocusEffect, useIsFocused, useRoute, useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import LinearGradient from "react-native-linear-gradient";
import {
  DEPOSIT_COIN_SCREEN,
  MARKET_SCREEN,
  OPEN_ORDER_SCREEN,
  SPOT_ORDER_HISTORY_DETAIL,
  SPOT_CHART_SCREEN,
  MARGIN_TRANSFER_SCREEN,
  SELECT_COIN_SCREEN,
  MARGIN_BORROW_REPAY_SCREEN,
  NAVIGATION_AUTH_STACK,
  LOGIN_SCREEN,
} from "../../navigation/routes";
import { cancelOrder, placeOrder, getCrossAccount, getCrossBorrowable } from "../../actions/homeActions";
import { addToFavorites, getFavoriteArray } from "../../actions/homeActions";
import NavigationService from "../../navigation/NavigationService";
import moment from "moment";
import { useTheme } from "../../hooks/useTheme";
import { SocketContext } from "../../SocketProvider";
import { showError } from "../../helper/logger";
import { appOperation } from "../../appOperation";
import { CUSTOMER_TYPE } from "../../appOperation/types";
const { width: Width, height: WindowHeight } = Dimensions.get("window");

export const DataLimit = [
  { id: "0.1", name: "Limit" },
  { id: "0.1", name: "Market" },
  { id: "0.1", name: "Spot Limit" },
  { id: "0.1", name: "Spot Market" },
];

/** Bottom sheet: Basic + Advanced (no separate “Conditional” step — Spot types listed here). */
const ORDER_TYPE_SHEET_BASIC = [
  {
    name: "Limit",
    description: "Buy or sell at your chosen price or better.",
    icon: limitTrade,
  },
  {
    name: "Market",
    description: "Instantly trade at the current market price.",
    icon: market_ic,
  },
];
const ORDER_TYPE_SHEET_ADVANCED = [
  {
    name: "Spot Limit",
    description: "Once the stop price is reached, a limit order is set at your selected price.",
    icon: spotLimitTrade,
  },
  {
    name: "Spot Market",
    description: "Once the stop price is reached, a market order is executed at the best price.",
    icon: spotMarket,
  },
];

/** Open orders filter chips (aligned with web TradeHistorySection / TradePage). */
const SPOT_OPEN_ORDER_KINDS = [
  { id: "all", label: "All" },
  { id: "limit", label: "Limit" },
  { id: "market", label: "Market" },
  { id: "stop_limit", label: "Spot Limit" },
  { id: "stop_market", label: "Spot Market" },
];

/** Web TradeHistorySection side filter: All Sides / Buy / Sell (native select labels). */
const SPOT_SIDE_DROPDOWN_LABELS = ["All Sides", "Buy", "Sell"];

function spotSideFilterFromDropdownLabel(label) {
  if (label === "Buy") return "BUY";
  if (label === "Sell") return "SELL";
  return "All";
}

function spotDropdownLabelFromSideFilter(filterVal) {
  if (filterVal === "BUY") return "Buy";
  if (filterVal === "SELL") return "Sell";
  return "All Sides";
}

function spotMeOpenOrdersItemsFromResponse(response) {
  const d = response?.data;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(d)) return d;
  return [];
}

function matchesOpenOrderKind(item, kind) {
  if (kind === "all") return true;
  const t = String(item?.type || item?.order_type || "").toUpperCase();
  if (kind === "limit") return t === "LIMIT";
  if (kind === "market") return t === "MARKET";
  if (kind === "stop_limit") return t === "STOP_LIMIT";
  if (kind === "stop_market") return t === "STOP_MARKET";
  return true;
}

function tradeHistoryMarketLabel(item, selectedBase, selectedQuote) {
  return spotOpenOrderMarketLabel(item, selectedBase, selectedQuote);
}

/**
 * Redux `pastOrders` may include orders from other pairs (e.g. History screen without pair filter).
 * Spot Order History tab must only render rows for the selected spot pair — avoids wrong list flash.
 */
function spotPastOrderMatchesScreenPair(order, baseSym, quoteSym) {
  if (!order || baseSym == null || quoteSym == null) return false;
  const b = String(baseSym).trim().toUpperCase();
  const q = String(quoteSym).trim().toUpperCase();
  if (!b || !q) return false;

  const ask = String(order?.ask_currency ?? "").trim().toUpperCase();
  const pay = String(order?.pay_currency ?? "").trim().toUpperCase();
  const ob = String(order?.base_currency ?? "").trim().toUpperCase();
  const oq = String(order?.quote_currency ?? "").trim().toUpperCase();
  if ((ask && pay && ask === b && pay === q) || (ob && oq && ob === b && oq === q)) return true;

  const raw = String(order?.pair ?? order?.symbol ?? order?.market ?? "")
    .trim()
    .toUpperCase()
    .replace(/\//g, "");
  const needle = `${b}${q}`;
  if (!raw) return false;
  if (raw === needle) return true;
  if (raw.endsWith(q)) {
    const prefix = raw.slice(0, raw.length - q.length);
    if (prefix === b) return true;
  }
  return false;
}

/** Collect every stable id for an order row (API vs socket may populate different fields). */
function spotOrderHistoryIds(item) {
  return [item?._id, item?.id, item?.order_id, item?.client_order_id]
    .filter((v) => v != null && String(v).trim() !== "")
    .map((v) => String(v).trim());
}

/** Dedupe order history — same order may appear with different id fields after socket + REST merge. */
function dedupeSpotOrderHistoryRows(rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows || []) {
    const ids = spotOrderHistoryIds(r);
    if (!ids.length) continue;
    if (ids.some((id) => seen.has(id))) continue;
    ids.forEach((id) => seen.add(id));
    out.push(r);
  }
  return out;
}

function getStableId(item) {
  if (!item) return "";
  const raw = item?._id?.$oid || item?._id || item?.order_id || item?.id || item?.client_order_id || item?.orderId;
  if (raw != null && typeof raw === "object" && typeof raw.toString === "function") {
    const s = raw.toString();
    if (s && s !== "[object Object]") return String(s);
  }
  if (raw != null && typeof raw !== "object") return String(raw);
  return "";
}

export const Data = [
  { label: "0.1", value: "0.1" },
  { label: "0.01", value: "0.01" },
  { label: "0.001", value: "0.001" },
  { label: "0.0001", value: "0.0001" },
  { label: "0.00001", value: "0.00001" },
  { label: "0.000001", value: "0.000001" },
];

// Compare order book rows by price and remaining to avoid re-renders when data unchanged
const orderBookDataEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (String(x?.price) !== String(y?.price) || String(x?.remaining) !== String(y?.remaining)) return false;
  }
  return true;
};

const toFiniteOB = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const clamp01OB = (v) => Math.max(0, Math.min(1, v));

const SPOT_ORDER_BOOK_AGG_DEFAULTS = [0.1, 0.5, 1, 10, 100];

function getSpotOrderBookAggOptionsForPair(tickSize) {
  const tick = Number(tickSize);
  if (!Number.isFinite(tick) || tick <= 0) {
    return SPOT_ORDER_BOOK_AGG_DEFAULTS.slice();
  }
  const mults = [1, 10, 100, 1000, 10000];
  const out = [];
  for (const m of mults) {
    const v = tick * m;
    if (!Number.isFinite(v) || v <= 0) continue;
    out.push(parseFloat(Number(v).toPrecision(12)));
  }
  const unique = Array.from(new Set(out)).sort((a, b) => a - b);
  return unique.length ? unique : SPOT_ORDER_BOOK_AGG_DEFAULTS.slice();
}

function roundSpotPriceToAgg(price, agg) {
  const n = Number(price);
  const a = Number(agg);
  if (!Number.isFinite(n) || !Number.isFinite(a) || a <= 0) return n;
  return Math.round(n / a) * a;
}

const safeToFixed8 = (value, fallback = "0") => {
  const parsed = parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  const s = parsed.toFixed(8).replace(/\.?0+$/, "");
  return s === "" ? "0" : s;
};

function aggregateSpotOrderBookRows(orders, agg) {
  if (!orders?.length) return [];
  const map = new Map();
  for (const o of orders) {
    const bucket = roundSpotPriceToAgg(o.price, agg);
    const prev = map.get(bucket);
    if (prev) {
      prev.quantity = (Number(prev.quantity) || 0) + (Number(o.quantity) || 0);
      prev.remaining = (Number(prev.remaining) || 0) + (Number(o.remaining) || 0);
    } else {
      map.set(bucket, { ...o, price: bucket });
    }
  }
  return Array.from(map.values());
}

/** Numeric step only (no quote suffix in UI). */
function formatSpotAggStepLabel(step) {
  if (step == null || step === "") return "—";
  if (typeof step === "number" && Number.isFinite(step)) {
    const s = step >= 1 ? step.toString() : step.toFixed(8).replace(/\.?0+$/, "");
    return s || String(step);
  }
  const raw = String(step).trim();
  const m = raw.match(/^-?\d*\.?\d+(?:e[+-]?\d+)?/i);
  if (m) {
    const n = Number(m[0]);
    if (Number.isFinite(n)) {
      const s = n >= 1 ? n.toString() : n.toFixed(8).replace(/\.?0+$/, "");
      return s || m[0];
    }
  }
  return raw;
}

const SPOT_OB_VIEW_ICONS = [order_1, order_2, order_3];

const orderBookSellRowAreEqual = (prev, next) =>
  prev.theme === next.theme &&
  prev.maxVolume === next.maxVolume &&
  String(prev.item?.price) === String(next.item?.price) &&
  String(prev.item?.remaining) === String(next.item?.remaining);

const OrderBookSellRow = memo(({ item, maxVolume, onPress, formatPrice, formatQuantity, styles }) => {
  const { colors: themeColors, isDark } = useTheme();
  const remaining = toFiniteOB(item?.remaining);
  const denom = maxVolume > 0 ? maxVolume : 1;
  const ratio = clamp01OB(remaining / denom);
  const handlePress = useCallback(() => { onPress(item?.price, item?.remaining); }, [onPress, item?.price, item?.remaining]);

  // Depth bar color (web-like). Use low opacity so text stays readable.
  // Slightly stronger than web so it's visible on mobile screens.
  const depthRed = isDark ? "rgba(232, 97, 97, 0.18)" : "rgba(255, 77, 79, 0.14)";

  return (
    <TouchableOpacity onPress={handlePress}>
      <View style={[styles.orderRow, { position: "relative", overflow: "hidden" }]}>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            width: `${ratio > 0 ? Math.max(2, ratio * 100) : 0}%`,
            backgroundColor: depthRed,
          }}
        />
        <AppText type={TWELVE} weight={SEMI_BOLD} style={[styles.orderPrice, { color: themeColors.red }]}>{formatPrice(item?.price)}</AppText>
        <AppText type={TWELVE} weight={SEMI_BOLD} style={[styles.orderSize, { color: themeColors.text }]}>{formatQuantity(item?.remaining)}</AppText>
      </View>
    </TouchableOpacity>
  );
}, orderBookSellRowAreEqual);
OrderBookSellRow.displayName = "OrderBookSellRow";

const orderBookBuyRowAreEqual = (prev, next) =>
  prev.theme === next.theme &&
  prev.maxVolume === next.maxVolume &&
  String(prev.item?.price) === String(next.item?.price) &&
  String(prev.item?.remaining) === String(next.item?.remaining);

const OrderBookBuyRow = memo(({ item, maxVolume, onPress, formatPrice, formatQuantity, styles }) => {
  const { colors: themeColors, isDark } = useTheme();
  const remaining = toFiniteOB(item?.remaining);
  const denom = maxVolume > 0 ? maxVolume : 1;
  const ratio = clamp01OB(remaining / denom);
  const handlePress = useCallback(() => { onPress(item?.price, item?.remaining); }, [onPress, item?.price, item?.remaining]);

  const depthGreen = isDark ? "rgba(0, 192, 118, 0.16)" : "rgba(0, 192, 118, 0.12)";

  return (
    <TouchableOpacity onPress={handlePress}>
      <View style={[styles.orderRow, { position: "relative", overflow: "hidden" }]}>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            width: `${ratio > 0 ? Math.max(2, ratio * 100) : 0}%`,
            backgroundColor: depthGreen,
          }}
        />
        <AppText type={TWELVE} weight={SEMI_BOLD} style={[styles.orderPrice, { color: themeColors.green }]}>{formatPrice(item?.price)}</AppText>
        <AppText type={TWELVE} weight={SEMI_BOLD} style={[styles.orderSize, { color: themeColors.text }]}>{formatQuantity(item?.remaining)}</AppText>
      </View>
    </TouchableOpacity>
  );
}, orderBookBuyRowAreEqual);
OrderBookBuyRow.displayName = "OrderBookBuyRow";

const orderBookPanelAreEqual = (prev, next) =>
  prev.theme === next.theme &&
  prev.buy_price === next.buy_price &&
  prev.change_percentage === next.change_percentage &&
  prev.quote_currency === next.quote_currency &&
  prev.base_currency === next.base_currency &&
  prev.orderBookReady === next.orderBookReady &&
  prev.showOrderBookSkeleton === next.showOrderBookSkeleton &&
  prev.showAskSide === next.showAskSide &&
  prev.showBidSide === next.showBidSide &&
  prev.quoteHourlyRate === next.quoteHourlyRate &&
  prev.isHourlyRateLoading === next.isHourlyRateLoading &&
  prev.headerTab === next.headerTab &&
  prev.marginMode === next.marginMode &&
  prev.visibleRows === next.visibleRows &&
  orderBookDataEqual(prev.sellData, next.sellData) &&
  orderBookDataEqual(prev.buyData, next.buyData);

export const SHIMMER_STRIP_WIDTH_DEFAULT = 100;
export const ShimmerBox = ({
  width, height, borderRadius = 8, style,
  shimmerStripWidth = SHIMMER_STRIP_WIDTH_DEFAULT,
  shimmerDuration = 700,
  shimmerToValue,
  shimmerColorsOverride
}) => {
  const { colors: themeColors, isDark } = useTheme();
  const stripW = typeof shimmerStripWidth === "number" ? shimmerStripWidth : SHIMMER_STRIP_WIDTH_DEFAULT;
  /** Match Spot order inputs (`theme.input`) so skeleton reads as the same surface; shimmer sits on top. */
  const boneColor =
    themeColors?.input ??
    themeColors?.card ??
    (isDark ? "rgba(100, 130, 180, 0.22)" : "rgba(160, 185, 220, 0.35)");
  const shimmerColors =
    shimmerColorsOverride ||
    (isDark
      ? ["transparent", "rgba(255,255,255,0.26)", "transparent"]
      : ["transparent", "rgba(255,255,255,0.72)", "transparent"]);
  const shimmerX = useRef(new Animated.Value(-stripW)).current;
  const travelTo =
    shimmerToValue !== undefined
      ? shimmerToValue
      : typeof width === "number"
        ? width + stripW * 2
        : Width + stripW;
  useEffect(() => {
    shimmerX.setValue(-stripW);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerX, {
          toValue: travelTo,
          duration: shimmerDuration,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerX, {
          toValue: -stripW,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerX, stripW, shimmerDuration, travelTo]);
  return (
    <View style={[{ width, height, borderRadius, overflow: "hidden", backgroundColor: boneColor }, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          { position: "absolute", top: 0, bottom: 0, width: stripW, left: 0 },
          { transform: [{ translateX: shimmerX }] },
        ]}
      >
        <LinearGradient
          colors={shimmerColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, width: stripW }}
        />
      </Animated.View>
    </View>
  );
};

/** ~6 visible rows per list; user scrolls for more. */
const ORDER_BOOK_VISIBLE_ROWS = 6;
/** Extra rows per side so Cross ML card + CTA line up with the order book. */
const ORDER_BOOK_CROSS_EXTRA_ROWS = 1;
const ORDER_BOOK_ROW_LAYOUT_HEIGHT = 28;
const ORDER_BOOK_LIST_MAX_HEIGHT =
  ORDER_BOOK_VISIBLE_ROWS * ORDER_BOOK_ROW_LAYOUT_HEIGHT;
/** Use fixed height (not maxHeight) so switching view modes never collapses the panel. */
const ORDER_BOOK_LIST_STYLE = { height: ORDER_BOOK_LIST_MAX_HEIGHT, flexGrow: 0 };

const getOrderBookVisibleRows = (headerTab, marginMode, hasUser) =>
  headerTab === "Margin" && (marginMode === "Cross" || marginMode === "Isolated") && hasUser
    ? ORDER_BOOK_VISIBLE_ROWS + ORDER_BOOK_CROSS_EXTRA_ROWS
    : ORDER_BOOK_VISIBLE_ROWS;
/** Tail inset after last row; inverted asks use paddingTop for the scroll end. */
const ORDER_BOOK_LIST_END_PAD = 10;
const ORDER_BOOK_HEADER_ROW_STYLE = { flexDirection: "row", justifyContent: "space-between" };
const ORDER_BOOK_HEADER_LABEL_STYLE = { color: "#9D9D9D" };
/** Keep order book area stable when toggling view (both/bids/asks). */
const ORDER_BOOK_PANEL_FIXED_HEIGHT = ORDER_BOOK_LIST_MAX_HEIGHT * 2 + 70;
const ORDER_BOOK_SHIMMER_STRIP_WIDTH = 240;

const OrderBookSkeleton = ({ rows = ORDER_BOOK_VISIBLE_ROWS }) => {
  const { colors: themeColors, isDark } = useTheme();
  const ROWS = rows;
  const ROW_HEIGHT = 22;
  const BONE_HEIGHT = 15;
  const BONE_RADIUS = 6;
  return (
    <View style={{ flex: 1, paddingVertical: 6, paddingHorizontal: 8, gap: 2 }}>
      {[...Array(ROWS)].map((_, i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            height: ROW_HEIGHT,
            paddingHorizontal: 4,
          }}
        >
          <ShimmerBox width="52%" height={BONE_HEIGHT} borderRadius={BONE_RADIUS} />
          <ShimmerBox width="52%" height={BONE_HEIGHT} borderRadius={BONE_RADIUS} style={{ marginLeft: 3 }} />
        </View>
      ))}
    </View>
  );
};

const OrderBookPanel = memo(({
  sellData,
  buyData,
  buy_price,
  change_percentage,
  quote_currency,
  base_currency,
  orderBookReady,
  showOrderBookSkeleton,
  showAskSide = true,
  showBidSide = true,
  styles,
  renderSellOrderItem,
  renderBuyOrderItem,
  sellKeyExtractor,
  buyKeyExtractor,
  getOrderItemLayout,
  headerTab,
  marginMode,
  visibleRows = ORDER_BOOK_VISIBLE_ROWS,
  quoteHourlyRate,
  isHourlyRateLoading,
}) => {
  const { colors: themeColors, theme, isDark } = useTheme();
  const navigation = useNavigation();
  const userData = useAppSelector((state) => state.auth?.userData);
  const isSingleSide = !(showAskSide && showBidSide);
  const listHeight = visibleRows * ORDER_BOOK_ROW_LAYOUT_HEIGHT;
  const extraListTotal = (visibleRows - ORDER_BOOK_VISIBLE_ROWS) * ORDER_BOOK_ROW_LAYOUT_HEIGHT * 2;
  const dualSideListStyle = useMemo(
    () => (visibleRows === ORDER_BOOK_VISIBLE_ROWS
      ? ORDER_BOOK_LIST_STYLE
      : { height: listHeight, flexGrow: 0 }),
    [visibleRows, listHeight]
  );
  const singleSideListStyle = useMemo(
    () => ({ height: listHeight * 2 + 10, flexGrow: 0 }),
    [listHeight]
  );
  const sellListStyle = isSingleSide ? singleSideListStyle : dualSideListStyle;
  const buyListStyle = isSingleSide ? singleSideListStyle : dualSideListStyle;
  const listEmptySell = useMemo(
    () => (
      <View style={styles.emptyOrderBook}>
        {showOrderBookSkeleton ? (
          <OrderBookSkeleton rows={visibleRows} />
        ) : (
          <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText }}>No ask data</AppText>
        )}
      </View>
    ),
    [showOrderBookSkeleton, themeColors.secondaryText, styles.emptyOrderBook, theme, visibleRows]
  );
  const listEmptyBuy = useMemo(
    () => (
      <View style={styles.emptyOrderBook}>
        {showOrderBookSkeleton ? (
          <OrderBookSkeleton rows={visibleRows} />
        ) : (
          <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText }}>No bid data</AppText>
        )}
      </View>
    ),
    [showOrderBookSkeleton, themeColors.secondaryText, styles.emptyOrderBook, theme, isDark, visibleRows]
  );
  const [isPricePositive, setIsPricePositive] = React.useState(true);
  const prevPriceRef = React.useRef(0);

  React.useEffect(() => {
    const currentNum = Number(buy_price);
    if (currentNum > prevPriceRef.current && prevPriceRef.current !== 0) {
      setIsPricePositive(true);
    } else if (currentNum < prevPriceRef.current && prevPriceRef.current !== 0) {
      setIsPricePositive(false);
    }
    if (currentNum > 0) {
      prevPriceRef.current = currentNum;
    }
  }, [buy_price]);

  const currentPriceColor = isPricePositive ? themeColors.green : themeColors.red;
  const renderCurrentPrice = () => (
    <View style={styles.currentPriceBox}>
      {showOrderBookSkeleton ? (
        <View style={{ flexDirection: "column", gap: 4, width: "100%" }}>
          <ShimmerBox width="60%" height={22} borderRadius={4} shimmerStripWidth={ORDER_BOOK_SHIMMER_STRIP_WIDTH} />
          <ShimmerBox width="45%" height={14} borderRadius={4} shimmerStripWidth={ORDER_BOOK_SHIMMER_STRIP_WIDTH} style={{ marginTop: 2 }} />
        </View>
      ) : (
        <>
          <AppText style={[styles.currentPrice, { color: currentPriceColor }]}>{buy_price}</AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
            <AppText style={styles.currentPriceUSD}>
              ≈ ${buy_price}
            </AppText>
            {/* <AppText style={{ fontSize: 11, fontWeight: "600", color: currentPriceColor }}>
              {Number(change_percentage) >= 0 ? "+" : ""}{Number(change_percentage || 0).toFixed(2)}%
            </AppText> */}
          </View>
        </>
      )}
    </View>
  );
  const containerHeight = (headerTab === "Margin"
    ? ORDER_BOOK_PANEL_FIXED_HEIGHT + 45
    : ORDER_BOOK_PANEL_FIXED_HEIGHT) + extraListTotal;

  return (
    <View style={{ height: containerHeight, flexGrow: 0 }}>
      {headerTab === "Margin" && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 6,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: themeColors.themeBorderColor,
            marginBottom: 6,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              if (!userData) {
                showError("Please login first to access Margin Borrow/Repay");
                NavigationService.navigate(NAVIGATION_AUTH_STACK, { screen: LOGIN_SCREEN });
                return;
              }
              navigation.navigate(MARGIN_BORROW_REPAY_SCREEN, { pair: `${base_currency}/${quote_currency}`, marginMode });
            }}
            style={{
              backgroundColor: isDark ? "#2C2C2E" : "#E5E5EA",
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
            }}
          >
            <AppText weight={SEMI_BOLD} style={{ fontSize: 10, color: themeColors.text }}>B/R</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              if (!userData) {
                showError("Please login first to view Margin details");
                NavigationService.navigate(NAVIGATION_AUTH_STACK, { screen: LOGIN_SCREEN });
                return;
              }
              navigation.navigate(MARGIN_BORROW_REPAY_SCREEN, { pair: `${base_currency}/${quote_currency}`, marginMode });
            }}
            style={{ alignItems: "flex-end" }}
          >
            <AppText style={{ fontSize: 9, color: themeColors.secondaryText, lineHeight: 11 }}>Hourly Rate ({quote_currency})...</AppText>
            {isHourlyRateLoading ? (
              <ShimmerBox width={40} height={12} borderRadius={2} shimmerStripWidth={ORDER_BOOK_SHIMMER_STRIP_WIDTH} style={{ marginTop: 2 }} />
            ) : (
              <AppText weight={SEMI_BOLD} style={{ fontSize: 10, color: themeColors.text, lineHeight: 12 }}>{quoteHourlyRate}</AppText>
            )}
          </TouchableOpacity>
        </View>
      )}
      <View style={ORDER_BOOK_HEADER_ROW_STYLE}>
        <View>
          <AppText weight={MEDIUM} style={ORDER_BOOK_HEADER_LABEL_STYLE}>Price</AppText>
          <AppText weight={MEDIUM} style={ORDER_BOOK_HEADER_LABEL_STYLE}>({quote_currency})</AppText>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <AppText weight={MEDIUM} style={ORDER_BOOK_HEADER_LABEL_STYLE}>Qty</AppText>
          <AppText weight={MEDIUM} style={ORDER_BOOK_HEADER_LABEL_STYLE}>({base_currency})</AppText>
        </View>
      </View>
      {/* Binance-like behavior: in single-side mode the visible list consumes full height. */}
      {showAskSide && showBidSide ? (
        <>
          <FlatList
            data={sellData}
            keyExtractor={sellKeyExtractor}
            renderItem={renderSellOrderItem}
            getItemLayout={getOrderItemLayout}
            removeClippedSubviews={true}
            initialNumToRender={visibleRows + 2}
            maxToRenderPerBatch={visibleRows + 2}
            windowSize={5}
            updateCellsBatchingPeriod={100}
            inverted={true}
            style={sellListStyle}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
            scrollEnabled={true}
            contentContainerStyle={
              sellData?.length === 0
                ? styles.orderBookEmptyList
                : styles.orderBookListContentAsks
            }
            ListEmptyComponent={listEmptySell}
          />
          {renderCurrentPrice()}
          <FlatList
            data={buyData}
            keyExtractor={buyKeyExtractor}
            renderItem={renderBuyOrderItem}
            inverted={false}
            getItemLayout={getOrderItemLayout}
            removeClippedSubviews={true}
            initialNumToRender={visibleRows + 2}
            maxToRenderPerBatch={visibleRows + 2}
            windowSize={5}
            updateCellsBatchingPeriod={100}
            style={buyListStyle}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
            scrollEnabled={true}
            contentContainerStyle={
              buyData?.length === 0
                ? styles.orderBookEmptyList
                : styles.orderBookListContentBids
            }
            ListEmptyComponent={listEmptyBuy}
          />
        </>
      ) : showBidSide ? (
        <>
          {renderCurrentPrice()}
          <FlatList
            data={buyData}
            keyExtractor={buyKeyExtractor}
            renderItem={renderBuyOrderItem}
            inverted={false}
            getItemLayout={getOrderItemLayout}
            removeClippedSubviews={true}
            initialNumToRender={visibleRows + 4}
            maxToRenderPerBatch={visibleRows + 4}
            windowSize={7}
            updateCellsBatchingPeriod={80}
            style={buyListStyle}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
            contentContainerStyle={
              buyData?.length === 0
                ? styles.orderBookEmptyList
                : styles.orderBookListContentBids
            }
            ListEmptyComponent={listEmptyBuy}
          />
        </>
      ) : (
        <>
          <FlatList
            data={sellData}
            keyExtractor={sellKeyExtractor}
            renderItem={renderSellOrderItem}
            getItemLayout={getOrderItemLayout}
            removeClippedSubviews={true}
            initialNumToRender={visibleRows + 4}
            maxToRenderPerBatch={visibleRows + 4}
            windowSize={7}
            updateCellsBatchingPeriod={80}
            inverted={true}
            style={sellListStyle}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
            contentContainerStyle={
              sellData?.length === 0
                ? styles.orderBookEmptyList
                : styles.orderBookListContentAsks
            }
            ListEmptyComponent={listEmptySell}
          />
          {renderCurrentPrice()}
        </>
      )}
    </View>
  );
}, orderBookPanelAreEqual);
OrderBookPanel.displayName = "OrderBookPanel";

const OrderBookSection = memo(({
  styles: sty,
  buy_price,
  change_percentage,
  quote_currency,
  base_currency,
  orderBookReady,
  showOrderBookSkeleton,
  onOrderBookPress,
  formatPrice,
  formatQuantity,
  tickSize,
  pairResetKey,
  headerTab,
  marginMode,
  quoteHourlyRate,
  isHourlyRateLoading,
}) => {
  const { theme, colors: themeColors, isDark } = useTheme();
  const userData = useAppSelector((state) => state.auth?.userData);
  const buyOrders = useAppSelector((state) => state.home.buyOrders);
  const sellOrders = useAppSelector((state) => state.home.sellOrders);
  const visibleRows = getOrderBookVisibleRows(headerTab, marginMode, !!userData);
  const orderBookAggOptions = useMemo(() => getSpotOrderBookAggOptionsForPair(tickSize), [tickSize]);
  const [orderBookAggStep, setOrderBookAggStep] = useState(SPOT_ORDER_BOOK_AGG_DEFAULTS[0]);
  const [orderBookAggOpen, setOrderBookAggOpen] = useState(false);
  const [aggMenuLayout, setAggMenuLayout] = useState(null);
  const aggTriggerRef = useRef(null);
  const [viewModeIndex, setViewModeIndex] = useState(0);
  const orderBookViewMode = viewModeIndex === 0 ? "both" : viewModeIndex === 1 ? "bids" : "asks";

  useEffect(() => {
    if (!orderBookAggOptions.length) return;
    setOrderBookAggStep(orderBookAggOptions[0]);
  }, [orderBookAggOptions, pairResetKey]);

  const openAggMenu = useCallback(() => {
    requestAnimationFrame(() => {
      aggTriggerRef.current?.measureInWindow((x, y, w, h) => {
        setAggMenuLayout({ x, y, w, h });
        setOrderBookAggOpen(true);
      });
    });
  }, []);

  const closeAggMenu = useCallback(() => {
    setOrderBookAggOpen(false);
    setAggMenuLayout(null);
  }, []);

  const selectAggStep = useCallback(
    (opt) => {
      setOrderBookAggStep(opt);
      closeAggMenu();
    },
    [closeAggMenu]
  );

  const cycleViewMode = useCallback(() => {
    setViewModeIndex((i) => (i + 1) % 3);
  }, []);

  const asksAggregated = useMemo(() => {
    if (!sellOrders?.length) return [];
    const agg = aggregateSpotOrderBookRows(sellOrders, orderBookAggStep);
    return [...agg].sort((a, b) => toFiniteOB(a.price) - toFiniteOB(b.price));
  }, [sellOrders, orderBookAggStep]);

  const bidsAggregated = useMemo(() => {
    if (!buyOrders?.length) return [];
    const agg = aggregateSpotOrderBookRows(buyOrders, orderBookAggStep);
    return [...agg].sort((a, b) => toFiniteOB(b.price) - toFiniteOB(a.price));
  }, [buyOrders, orderBookAggStep]);

  const showAskSide = orderBookViewMode !== "bids";
  const showBidSide = orderBookViewMode !== "asks";

  const sellOrdersForDisplay = useMemo(
    () => {
      if (showOrderBookSkeleton) return [];
      if (!orderBookReady || !showAskSide) return [];
      const isSingleSide = !(showAskSide && showBidSide);
      const minRows = isSingleSide ? visibleRows * 2 : visibleRows;
      const data = [...asksAggregated];
      while (data.length < minRows) {
        data.push({ isPlaceholder: true, price: `placeholder-ask-${data.length}`, remaining: 0 });
      }
      return data;
    },
    [showOrderBookSkeleton, orderBookReady, showAskSide, showBidSide, asksAggregated, visibleRows]
  );
  const buyOrdersForDisplay = useMemo(
    () => {
      if (showOrderBookSkeleton) return [];
      if (!orderBookReady || !showBidSide) return [];
      const isSingleSide = !(showAskSide && showBidSide);
      const minRows = isSingleSide ? visibleRows * 2 : visibleRows;
      const data = [...bidsAggregated];
      while (data.length < minRows) {
        data.push({ isPlaceholder: true, price: `placeholder-bid-${data.length}`, remaining: 0 });
      }
      return data;
    },
    [showOrderBookSkeleton, orderBookReady, showAskSide, showBidSide, bidsAggregated, visibleRows]
  );

  const maxBuyVolume = useMemo(
    () => {
      // Match web/mobile perception: scale depth by *visible* rows, so one huge order deep in book
      // doesn't make all shown bars look tiny.
      const vis = bidsAggregated.slice(0, visibleRows);
      // Do not force >= 1 (many pairs have < 1 quantities). Denom fallback handled in row component.
      return Math.max(0, ...vis.map((o) => toFiniteOB(o?.remaining)).filter(Number.isFinite));
    },
    [bidsAggregated, visibleRows]
  );
  const maxSellVolume = useMemo(
    () => {
      const vis = asksAggregated.slice(0, visibleRows);
      return Math.max(0, ...vis.map((o) => toFiniteOB(o?.remaining)).filter(Number.isFinite));
    },
    [asksAggregated, visibleRows]
  );

  /** Binance-like OB ratio bar uses visible rows volume sum. */
  const obRatio = useMemo(() => {
    const takeN = visibleRows;
    const bidSum = bidsAggregated.slice(0, takeN).reduce((s, o) => s + (toFiniteOB(o?.remaining) || 0), 0);
    const askSum = asksAggregated.slice(0, takeN).reduce((s, o) => s + (toFiniteOB(o?.remaining) || 0), 0);
    const total = bidSum + askSum;
    if (!total || !Number.isFinite(total)) return { bidPct: 50, askPct: 50 };
    const bidPct = (bidSum / total) * 100;
    return { bidPct, askPct: 100 - bidPct };
  }, [bidsAggregated, asksAggregated, visibleRows]);

  const renderSellOrderItem = useCallback(
    ({ item }) => {
      if (item.isPlaceholder) {
        return (
          <View style={[sty.orderRow, { height: 28, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
            <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: "#9D9D9D", opacity: 0.15 }}>—</AppText>
            <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: "#9D9D9D", opacity: 0.15 }}>—</AppText>
          </View>
        );
      }
      return (
        <OrderBookSellRow
          item={item}
          maxVolume={maxSellVolume}
          theme={theme}
          onPress={onOrderBookPress}
          formatPrice={formatPrice}
          formatQuantity={formatQuantity}
          styles={sty}
        />
      );
    },
    [maxSellVolume, theme, onOrderBookPress, formatPrice, formatQuantity, sty]
  );
  const renderBuyOrderItem = useCallback(
    ({ item }) => {
      if (item.isPlaceholder) {
        return (
          <View style={[sty.orderRow, { height: 28, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
            <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: "#9D9D9D", opacity: 0.15 }}>—</AppText>
            <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: "#9D9D9D", opacity: 0.15 }}>—</AppText>
          </View>
        );
      }
      return (
        <OrderBookBuyRow
          item={item}
          maxVolume={maxBuyVolume}
          theme={theme}
          onPress={onOrderBookPress}
          formatPrice={formatPrice}
          formatQuantity={formatQuantity}
          styles={sty}
        />
      );
    },
    [maxBuyVolume, theme, onOrderBookPress, formatPrice, formatQuantity, sty]
  );

  const sellKeyExtractor = useCallback((item) => {
    if (item.isPlaceholder) return item.price;
    const p = item?.price != null ? String(Number(item.price)) : "";
    return `sell_${p}`;
  }, []);
  const buyKeyExtractor = useCallback((item) => {
    if (item.isPlaceholder) return item.price;
    const p = item?.price != null ? String(Number(item.price)) : "";
    return `buy_${p}`;
  }, []);
  const getOrderItemLayout = useCallback((_, index) => ({
    length: ORDER_BOOK_ROW_LAYOUT_HEIGHT,
    offset: ORDER_BOOK_ROW_LAYOUT_HEIGHT * index,
    index,
  }), []);

  return (
    <View style={sty.rightPanel}>
      <OrderBookPanel
        sellData={sellOrdersForDisplay}
        buyData={buyOrdersForDisplay}
        buy_price={buy_price}
        change_percentage={change_percentage}
        quote_currency={quote_currency}
        base_currency={base_currency}
        orderBookReady={orderBookReady}
        showOrderBookSkeleton={showOrderBookSkeleton}
        showAskSide={showAskSide}
        showBidSide={showBidSide}
        styles={sty}
        renderSellOrderItem={renderSellOrderItem}
        renderBuyOrderItem={renderBuyOrderItem}
        sellKeyExtractor={sellKeyExtractor}
        buyKeyExtractor={buyKeyExtractor}
        getOrderItemLayout={getOrderItemLayout}
        headerTab={headerTab}
        marginMode={marginMode}
        visibleRows={visibleRows}
        quoteHourlyRate={quoteHourlyRate}
        isHourlyRateLoading={isHourlyRateLoading}
      />

      <View style={[sty.ratioIndicatorBar, { marginVertical: 3, gap: 4 }]}>
        <View style={{ justifyContent: "flex-start", flexShrink: 0 }}>
          <AppText numberOfLines={1} weight={SEMI_BOLD} style={{ color: "#38B781", fontSize: 10 }}>
            {obRatio.bidPct.toFixed(1)}%
          </AppText>
        </View>
        <View style={[sty.ratioIndicatorTrack, { flex: 1, height: 3 }]}>
          <View style={[sty.ratioIndicatorFill, { width: `${obRatio.bidPct}%`, backgroundColor: "#38B781", borderTopLeftRadius: 2, borderBottomLeftRadius: 2 }]} />
          <View style={[sty.ratioIndicatorFill, { flex: 1, backgroundColor: "#ED4E4E", borderTopRightRadius: 2, borderBottomRightRadius: 2 }]} />
        </View>
        <View style={{ justifyContent: "flex-end", flexShrink: 0 }}>
          <AppText numberOfLines={1} weight={SEMI_BOLD} style={{ color: "#ED4E4E", fontSize: 10 }}>
            {obRatio.askPct.toFixed(1)}%
          </AppText>
        </View>
      </View>

      <View style={sty.spotObToolbarRow}>
        <TouchableOpacity
          ref={aggTriggerRef}
          activeOpacity={0.75}
          onPress={openAggMenu}
          style={[
            sty.spotObAggTrigger,
            {
              backgroundColor: isDark ? darkTheme.darkThemeInputColor : themeColors.input,
              borderColor: themeColors.themeBorderColor,
              borderRadius: 5
            },
          ]}
        >
          <AppText
            type={TEN}
            weight={SEMI_BOLD}
            style={{ color: themeColors.text, fontSize: 11, lineHeight: 14 }}
          >
            {formatSpotAggStepLabel(orderBookAggStep)}
          </AppText>
          <FastImage source={downIcon} style={sty.spotObAggCaret} resizeMode="contain" tintColor={themeColors.secondaryText} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={cycleViewMode}
          activeOpacity={0.75}
          style={[
            sty.spotObViewCycleBtn,
            {
              backgroundColor: isDark ? darkTheme.darkThemeInputColor : themeColors.input,
              borderColor: themeColors.themeBorderColor,
            },
          ]}
          accessibilityLabel="Order book layout"
        >
          <FastImage source={SPOT_OB_VIEW_ICONS[viewModeIndex]} style={sty.spotObViewCycleIcon} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      <Modal visible={orderBookAggOpen} transparent animationType="fade" onRequestClose={closeAggMenu}>
        <Pressable style={sty.spotObAggBackdrop} onPress={closeAggMenu} />
        {aggMenuLayout ? (
          <View
            style={[
              sty.spotObAggPopover,
              {
                top: aggMenuLayout.y + aggMenuLayout.h + 4,
                left: Math.max(8, Math.min(aggMenuLayout.x + aggMenuLayout.w - 144, Width - 8 - 144)),
                backgroundColor: isDark ? themeColors.sheetDarkColor : themeColors.card,
                borderColor: themeColors.themeBorderColor,
              },
            ]}
          >
            {orderBookAggOptions.map((opt) => {
              const selected = Number(orderBookAggStep) === Number(opt);
              return (
                <TouchableOpacity
                  key={String(opt)}
                  style={[
                    sty.spotObAggRow,
                    selected && { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => selectAggStep(opt)}
                >
                  <AppText
                    type={TEN}
                    weight={selected ? SEMI_BOLD : undefined}
                    style={{ color: themeColors.text, fontSize: 11, lineHeight: 14 }}
                  >
                    {formatSpotAggStepLabel(opt)}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </Modal>
    </View>
  );
});
OrderBookSection.displayName = "OrderBookSection";

const OpenOrderItemCard = memo(function OpenOrderItemCard({
  inv,
  themeColors,
  isDark,
  base_currency,
  buildCurrencyPairText,
  getOrderStatusRaw,
  getSideColor,
  onCancelPress,
}) {
  const statusRaw = getOrderStatusRaw(inv);
  const statusUpper = String(statusRaw || "").toUpperCase().trim();
  const currencyPair = buildCurrencyPairText(inv);

  const orderId = inv?._id?.$oid || inv?._id || inv?.order_id || inv?.id;
  const canCancel =
    !!orderId &&
    !["FILLED", "CANCELLED", "CANCELED", "COMPLETED", "EXECUTED", "REJECTED"].includes(statusUpper);

  const priceNum = Number(inv?.price) || 0;
  const typeUpper = String(inv?.order_type || inv?.type || inv?.orderType || "MARKET").toUpperCase();
  const side = String(inv?.side || "").toUpperCase();

  const eventTs =
    inv?.updatedAt || inv?.updated_at || inv?.createdAt || inv?.created_at || inv?.date || inv?.timestamp;
  const eventM = eventTs ? moment(eventTs) : null;
  const headerDateTime = eventM?.isValid() ? eventM.format("DD/MM/YYYY HH:mm:ss") : "---";

  const priceDisplay =
    String(inv?.order_type || inv?.type || "").toUpperCase() === "MARKET" ? "Market" : toFixedEight(priceNum);

  const parseNum = (val) => {
    if (val && val.$numberDecimal != null) return parseFloat(val.$numberDecimal);
    return parseFloat(val);
  };

  const price = parseNum(inv?.price) || 0;
  const avgPrice = parseNum(inv?.avg_execution_price ?? inv?.avgPrice ?? inv?.average_price) || price;
  const avgPriceDisplay = toFixedEight(avgPrice);

  const baseSym = inv?.ask_currency || inv?.base_currency || base_currency || "";
  const textColor = themeColors.text;
  const labelColor = themeColors.secondaryText;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => NavigationService.navigate(SPOT_ORDER_HISTORY_DETAIL, { item: inv })}
      style={{
        paddingVertical: 12,
        paddingHorizontal: 0,
        borderBottomWidth: 1,
        borderBottomColor: themeColors.themeBorderColor,
      }}
    >
      <View>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
          <AppText style={{ color: textColor }} type={FIFTEEN} weight={BOLD}>
            {currencyPair}
          </AppText>
          <FastImage
            source={right_ic}
            style={{ width: 11, height: 11, marginLeft: 4 }}
            resizeMode="contain"
            tintColor={labelColor}
          />
        </View>
        <AppText weight={MEDIUM} type={FOURTEEN} style={{ color: labelColor, marginBottom: 2 }}>
          {headerDateTime}
        </AppText>
        <AppText style={{ color: getSideColor(inv?.side), marginBottom: 8 }} type={THIRTEEN} weight={SEMI_BOLD}>
          {side} <AppText style={{ color: isDark ? colors.white : colors.black, marginBottom: 8 }} type={THIRTEEN}>· {typeUpper}</AppText>
        </AppText>

        <View style={{ gap: 5 }}>
          <View style={styles.kvRow}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Market</AppText>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor, textAlign: "right", flex: 2 }} numberOfLines={3}>{currencyPair}</AppText>
          </View>
          <View style={styles.kvRow}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Type</AppText>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor, textAlign: "right", flex: 2 }} numberOfLines={3}>{typeUpper}</AppText>
          </View>
          <View style={styles.kvRow}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Price</AppText>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor, textAlign: "right", flex: 2 }} numberOfLines={3}>{priceDisplay}</AppText>
          </View>
          <View style={styles.kvRow}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Quantity</AppText>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor, textAlign: "right", flex: 2 }} numberOfLines={3}>
              {`${safeToFixed8(inv?.quantity ?? inv?.amount ?? inv?.origQty, "—")}${baseSym ? ` ${baseSym}` : ""}`}
            </AppText>
          </View>
          <View style={styles.kvRow}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Avg Price</AppText>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor, textAlign: "right", flex: 2 }} numberOfLines={3}>
              {String(avgPriceDisplay ?? "—")}
            </AppText>
          </View>
        </View>
      </View>

      {canCancel ? (
        <View style={[styles.openOrderCardRow, { marginTop: 8, marginBottom: 4 }]}>
          <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: isDark ? "#8E8E93" : "#666666" }}>Action:</AppText>
          <TouchableOpacity
            style={styles.cancelActionBtn}
            activeOpacity={0.8}
            onPress={() => onCancelPress(inv)}
          >
            <AppText style={{ color: themeColors.red, fontWeight: "600", fontSize: 12 }}>Cancel</AppText>
          </TouchableOpacity>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}, (prev, next) => {
  const pId = getStableId(prev.inv);
  const nId = getStableId(next.inv);
  return (
    pId === nId &&
    prev.inv?.status === next.inv?.status &&
    prev.inv?.filled_quantity === next.inv?.filled_quantity &&
    prev.inv?.quantity === next.inv?.quantity &&
    prev.inv?.price === next.inv?.price &&
    prev.isDark === next.isDark &&
    prev.base_currency === next.base_currency
  );
});
OpenOrderItemCard.displayName = "OpenOrderItemCard";

const PastOrderItemCard = memo(function PastOrderItemCard({
  inv,
  themeColors,
  isDark,
  base_currency,
  quote_currency,
  buildCurrencyPairText,
  getOrderStatusRaw,
  getOrderStatusLabel,
  getSideColor,
  normalizePairSymbol,
  showExecutedTrades,
  setShowExecutedTrades,
}) {
  const orderId = inv?._id?.$oid || inv?._id || inv?.order_id || inv?.id;
  const baseSym = inv?.ask_currency || inv?.base_currency || base_currency || "";
  const quoteSym = inv?.pay_currency || inv?.quote_currency || quote_currency || "";
  const currencyPair = (baseSym && quoteSym) ? `${baseSym}/${quoteSym}` : buildCurrencyPairText(inv);
  const quoteCc =
    normalizePairSymbol(inv?.pay_currency) ||
    normalizePairSymbol(inv?.fee_asset) ||
    normalizePairSymbol(quote_currency);

  const parseNum = (val) => {
    if (val && val.$numberDecimal != null) return parseFloat(val.$numberDecimal);
    return parseFloat(val);
  };

  const price = parseNum(inv?.price) || 0;
  const qty = parseNum(inv?.quantity) || 0;
  const filled = parseNum(inv?.filled_quantity ?? inv?.filled) || 0;
  const avgPrice = parseNum(inv?.avg_execution_price ?? inv?.avgPrice ?? inv?.average_price) || price;
  const value = parseNum(inv?.executed_value ?? inv?.executedValue) || (avgPrice * filled);
  const feeVal = parseNum(inv?.total_fee ?? inv?.fee) || 0;
  const quoteCurrency =
    inv?.pay_currency ||
    inv?.quote_currency ||
    inv?.quote_currency_short_name ||
    inv?.quote_asset ||
    (typeof currencyPair === "string" && currencyPair.includes("/") ? currencyPair.split("/")[1]?.trim() : "") ||
    "";
  const feeAsset = inv?.fee_asset || quoteCurrency;
  const totalVal = value;

  const statusRaw = getOrderStatusRaw(inv);
  const statusLabel = getOrderStatusLabel(inv);

  const hasExecutedTrades = Array.isArray(inv?.executed_prices) && inv.executed_prices.length > 0;
  const showTrades = !!showExecutedTrades?.[orderId];

  const textColor = themeColors.text;
  const labelColor = isDark ? "#8E8E93" : "#666666";

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => NavigationService.navigate(SPOT_ORDER_HISTORY_DETAIL, { item: inv })}
      style={{
        paddingVertical: 12,
        paddingHorizontal: 0,
        borderBottomWidth: 1,
        borderBottomColor: themeColors.themeBorderColor,
      }}
    >
      <View>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
          <AppText style={{ color: textColor }} type={FIFTEEN} weight={BOLD}>
            {currencyPair}
          </AppText>
          <FastImage
            source={right_ic}
            style={{ width: 11, height: 11, marginLeft: 4 }}
            resizeMode="contain"
            tintColor={labelColor}
          />
        </View>
        <AppText weight={MEDIUM} type={FOURTEEN} style={{ color: labelColor, marginBottom: 2 }}>
          {(() => {
            const d = inv?.updatedAt || inv?.updated_at || inv?.createdAt || inv?.created_at || inv?.date || inv?.timestamp || inv?.time;
            return d ? moment(d).format("DD/MM/YYYY HH:mm:ss") : "---";
          })()}
        </AppText>

        <AppText style={{ marginBottom: 8 }} type={THIRTEEN} weight={BOLD}>
          <AppText weight={MEDIUM} type={THIRTEEN} style={{ color: getSideColor(inv?.side) }}>
            {String(inv?.side || "").toUpperCase()}<AppText weight={MEDIUM} type={THIRTEEN} style={{ color: isDark ? "#8E8E93" : "#666666" }}> · </AppText> <AppText weight={MEDIUM} type={THIRTEEN} style={{ color: colors.white }}>{String(inv?.order_type || inv?.type || inv?.orderType || "").toUpperCase()}</AppText>
          </AppText>
          <AppText weight={MEDIUM} type={THIRTEEN} style={{ color: isDark ? "#8E8E93" : "#666666" }}> · </AppText>
          <AppText weight={MEDIUM} type={THIRTEEN} style={{ color: colors.white }}>
            {statusLabel.toUpperCase()}
          </AppText>
        </AppText>

        <View style={{ gap: 5 }}>
          <View style={styles.kvRow}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Price</AppText>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor, textAlign: "right", flex: 2 }} numberOfLines={3}>
              {String(inv?.order_type || inv?.type || "").toUpperCase() === "MARKET" ? "Market" : safeToFixed8(inv?.price, "—")}
            </AppText>
          </View>
          <View style={styles.kvRow}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Quantity</AppText>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor, textAlign: "right", flex: 2 }} numberOfLines={3}>
              {safeToFixed8(qty, "—")}{baseSym ? ` ${baseSym}` : ""}
            </AppText>
          </View>
          <View style={styles.kvRow}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Fee</AppText>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor, textAlign: "right", flex: 2 }} numberOfLines={3}>
              {`${safeToFixed8(feeVal)}${feeAsset ? ` ${feeAsset}` : ""}`.trim()}
            </AppText>
          </View>
          <View style={styles.kvRow}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Total</AppText>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor, textAlign: "right", flex: 2 }} numberOfLines={3}>
              {safeToFixed8(totalVal)}
            </AppText>
          </View>
        </View>
      </View>

      {hasExecutedTrades && (
        <View style={{ marginTop: 8 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.execTradesBtn, {
              borderWidth: 1,
              borderColor: isDark ? 'transparent' : lightTheme.inputBorder,
            }]}
            onPress={() => setShowExecutedTrades((p) => ({ ...p, [orderId]: !p?.[orderId] }))}
          >
            <View style={styles.execTradesBtnRow}>
              <FastImage
                source={downIcon}
                tintColor={isDark ? colors.white : colors.lightGrey}
                style={[
                  styles.orderHistoryChevron,
                  { transform: [{ rotate: showTrades ? "180deg" : "0deg" }] },
                ]}
                resizeMode="contain"
              />
              <AppText style={[styles.execTradesBtnText, { color: textColor }]}> {' '}Executed trades</AppText>
            </View>
          </TouchableOpacity>

          {showTrades && (
            <View style={styles.execTradesBox}>
              {inv.executed_prices.map((tr, i) => (
                <View
                  key={`${orderId}_${tr?.trade_id ?? i}`}
                  style={[
                    styles.execTradeItem,
                    i === inv.executed_prices.length - 1 ? { borderBottomWidth: 0, marginBottom: 0 } : null,
                  ]}
                >
                  <View style={styles.execTradeHeaderRow}>
                    <AppText style={[styles.execTradeHeaderText, { color: labelColor }]} weight={MEDIUM}>
                      Trade #{i + 1}
                    </AppText>
                  </View>

                  <View style={{ gap: 4, marginTop: 4 }}>
                    <View style={styles.execTradeKvRow}>
                      <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Price:</AppText>
                      <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: textColor, textAlign: "right", flex: 2 }} numberOfLines={3}>{toFixedEight(Number(tr?.price) || 0)} {quoteCc}</AppText>
                    </View>
                    <View style={styles.execTradeKvRow}>
                      <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Amount:</AppText>
                      <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: textColor, textAlign: "right", flex: 2 }} numberOfLines={3}>{toFixedEight(Number(tr?.volume) || 0)} {baseSym}</AppText>
                    </View>
                    <View style={styles.execTradeKvRow}>
                      <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Fee:</AppText>
                      <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: textColor, textAlign: "right", flex: 2 }} numberOfLines={3}>{toFixedEight(Number(tr?.fee) || 0)} {tr?.fee_currency || quoteCc}</AppText>
                    </View>
                    <View style={styles.execTradeKvRow}>
                      <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Time:</AppText>
                      <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: textColor, textAlign: "right", flex: 2 }} numberOfLines={3}>
                        {tr?.time ? moment(tr.time).format("DD/MM/YYYY HH:mm:ss") : "---"}
                      </AppText>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}, (prev, next) => {
  const pId = prev.inv?._id?.$oid || prev.inv?._id || prev.inv?.order_id || prev.inv?.id;
  const nId = next.inv?._id?.$oid || next.inv?._id || next.inv?.order_id || next.inv?.id;
  const pTrades = prev.showExecutedTrades?.[pId];
  const nTrades = next.showExecutedTrades?.[nId];
  return (
    pId === nId &&
    pTrades === nTrades &&
    prev.inv?.status === next.inv?.status &&
    prev.inv?.filled_quantity === next.inv?.filled_quantity &&
    prev.inv?.quantity === next.inv?.quantity &&
    prev.inv?.price === next.inv?.price &&
    prev.isDark === next.isDark &&
    prev.base_currency === next.base_currency
  );
});
PastOrderItemCard.displayName = "PastOrderItemCard";

/**
 * - Pair: persisted in Redux (spotSelectedPair).
 * - Order book: always in Redux (buyOrders/sellOrders). Socket flush updates Redux; never cleared on tab blur so return shows cached data instantly (no reload/skeleton).
 * - Chart: opened from header candle on SpotChartScreen (no WebView on this screen).
 * - Skeletons: order book only when no data (!orderBookReady).
 * - Focus: subscribe to exchange on focus; on blur unsubscribe but keep Redux cache. No getSpotOpenOrders on focus unless added elsewhere.
 */
const Spot = () => {
  const insets = useSafeAreaInsets();
  const { colors: themeColors, theme, isDark } = useTheme();
  const route = useRoute();
  const navigation = useNavigation();
  const { subscribeToExchange, unsubscribeFromExchange, unsubscribeFromMarket, unsubscribeFromFutures } = useContext(SocketContext);
  const dispatch = useDispatch();

  const coinData = useAppSelector((state) => state.home.coinData);
  const spotSelectedPair = useAppSelector((state) => state.home.spotSelectedPair);
  const coinBalance = useAppSelector((state) => state.home.coinBalance);
  const crossAccount = useAppSelector((state) => state.home.crossAccount);
  const crossBorrowable = useAppSelector((state) => state.home.crossBorrowable);
  const userData = useAppSelector((state) => state.auth.userData);
  const socket = useAppSelector((state) => state.home.socket);
  const openOrders = useAppSelector((state) => state.home.spotOpenOrders);
  const pastOrders = useAppSelector((state) => state.home.pastOrders);
  // Keep terminal readable: avoid logging whole arrays continuously
  // (use the rate-limited lens logs inside the socket handler instead)

  const favoriteArray = useAppSelector((state) => state.home.favoriteArray);
  const favoriteArrayLoaded = useAppSelector((state) => state.home.favoriteArrayLoaded);

  const [currency, setCurrency] = useState(null);
  const [currencyData, setCurrencyData] = useState(null);
  const [orderFilter, setOrderFilter] = useState("All");
  const [pastOrderFilter, setPastOrderFilter] = useState("All");
  const [expandedRowIndex, setExpandedRowIndex] = useState(null);
  const [showExecutedTrades, setShowExecutedTrades] = useState({});
  const [lastSocketData, setLastSocketData] = useState(null);
  /** Web parity: flip true once socket sends `buy_order`/`sell_order` key (empty array still counts). */
  const [orderBookSocketReady, setOrderBookSocketReady] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const appStateRef = useRef(AppState.currentState);
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [isOrderTypeModalVisible, setIsOrderTypeModalVisible] = useState(false);
  const [isCancelLoading, setIsCancelLoading] = useState(false);
  const [marginAccountData, setMarginAccountData] = useState(null);
  const [crossRisk, setCrossRisk] = useState(null);
  const coinDataRef = useRef(coinData);
  useEffect(() => {
    coinDataRef.current = coinData;
  }, [coinData]);


  const [orderToCancel, setOrderToCancel] = useState(null);
  const handleCancelOpenOrderPress = useCallback((inv) => {
    setOrderToCancel(inv);
    setIsCancelModalVisible(true);
  }, []);
  const isSpotFocused = useIsFocused();

  const [isPriceFocused, setIsPriceFocused] = useState(false);
  const [isAmountFocused, setIsAmountFocused] = useState(false);
  const [isStopFocused, setIsStopFocused] = useState(false);
  const [isTotalFocused, setIsTotalFocused] = useState(false);

  const priceAnim = useRef(new Animated.Value(1)).current;
  const amountAnim = useRef(new Animated.Value(0)).current;
  const stopAnim = useRef(new Animated.Value(0)).current;
  const totalAnim = useRef(new Animated.Value(0)).current;
  const slippageAnim = useRef(new Animated.Value(0)).current;
  const amountInputRef = useRef(null);
  const slippageInputRef = useRef(null);

  /** Must run before setAmount so next render’s Animated styles already see 1 (fixes +/− without focus overlap). */
  const syncAmountAnimForQuantityString = useCallback((qtyStr) => {
    if (String(qtyStr ?? "").trim() !== "") {
      amountAnim.setValue(1);
      totalAnim.setValue(1);
    }
  }, []);

  const syncStopAnimForPriceString = useCallback((priceStr) => {
    if (String(priceStr ?? "").trim() !== "") {
      stopAnim.setValue(1);
    }
  }, []);

  useLayoutEffect(() => {
    const displayValue = price || buy_price;
    const hasPrice = String(displayValue ?? "").trim() !== "";
    const isLoaded = !!buy_price;
    if (hasPrice || isPriceFocused || !isLoaded) {
      Animated.timing(priceAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
      return;
    }
    Animated.timing(priceAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isPriceFocused, price, buy_price]);

  useLayoutEffect(() => {
    const hasAmt = String(amount ?? "").trim() !== "";
    if (hasAmt || isTotalFocused) {
      Animated.timing(totalAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
      return;
    }
    Animated.timing(totalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [amount, isTotalFocused]);

  useLayoutEffect(() => {
    const hasAmt = String(amount ?? "").trim() !== "";

    // Amount label: value or focus based (original perfect logic)
    if (hasAmt || isAmountFocused) {
      Animated.timing(amountAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
      return;
    }
    Animated.timing(amountAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [amount, isAmountFocused]);

  useLayoutEffect(() => {
    const hasStop = String(stopPrice ?? "").trim() !== "";
    if (hasStop || isStopFocused) {
      Animated.timing(stopAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
      return;
    }
    Animated.timing(stopAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [stopPrice, isStopFocused]);

  useLayoutEffect(() => {
    const hasSlippage = String(slippagePct ?? "").trim() !== "";
    if (hasSlippage || isSlippageInputFocused) {
      Animated.timing(slippageAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }).start();
      return;
    }
    Animated.timing(slippageAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [slippagePct, isSlippageInputFocused]);

  // DEV helper: render only History tabs + lists (skip heavy orderbook/form)
  const historyOnly = __DEV__ && route?.params?.historyOnly === true;

  const pairSheetRef = useRef(null);
  const rbSheetNumber = useRef();
  const rbSheetlimit = useRef();
  const rbSheetAddFunds = useRef();
  const rbSheetMarginConfirm = useRef();
  const rbSheetCrossRisk = useRef();
  const rbSheetIsolatedRisk = useRef();
  const lastMarginFetchRef = useRef("");
  const [marginConfirmPayload, setMarginConfirmPayload] = useState(null);
  const [dontShowMarginConfirm, setDontShowMarginConfirm] = useState(false);
  const latestSocketDataRef = useRef(null);
  const latestLocalBuyOrdersRef = useRef([]);
  const latestLocalSellOrdersRef = useRef([]);
  const currentCurrencyRef = useRef(null);
  const SOCKET_UI_THROTTLE_MS = 50;
  /** Match web `TradePage`: poll spot history while the matching tab is visible (`SPOT_HIST_POLL_MS`). */
  const SPOT_HIST_POLL_MS = 3000;
  const socketThrottleTimerRef = useRef(null);
  const socketLastFlushRef = useRef(0);
  const pendingSocketFlushRef = useRef(null);
  const isSpotFocusedRef = useRef(true);
  const lastSubscribedExchangeRef = useRef(null);
  const lastSubscribedPairRef = useRef(null);
  const lastFlushedBuyRef = useRef(null);
  const lastFlushedSellRef = useRef(null);
  const pendingOrderBookOnBlurRef = useRef(null);
  const flushSocketToStateRef = useRef(null);
  const activeTabRef = useRef(1);

  // Get decimal places from step_size or tick_size
  const getDecimalPlaces = (value) => {
    if (!value || value >= 1) return 0;
    const str = value.toString();
    if (str.includes("e-")) return parseInt(str.split("e-")[1], 10);
    const decimalPart = str.split(".")[1];
    return decimalPart ? decimalPart.length : 0;
  };

  const getPricePrecision = () => {
    const tickSize = currencyData?.tick_size;
    if (tickSize === undefined || tickSize === null) return 8;
    return getDecimalPlaces(tickSize);
  };

  const getQuantityPrecision = () => {
    const stepSize = currencyData?.step_size;
    if (stepSize === undefined || stepSize === null) return 8;
    return getDecimalPlaces(stepSize);
  };

  const pricePrecision = useMemo(() => getPricePrecision(), [currencyData?.tick_size]);
  const quantityPrecision = useMemo(() => getQuantityPrecision(), [currencyData?.step_size]);

  const formatPrice = useCallback(
    (price) => {
      if (price === undefined || price === null || isNaN(price)) return "0";
      return parseFloat(Number(price).toFixed(pricePrecision));
    },
    [pricePrecision]
  );

  const formatPriceThousands = useCallback(
    (raw) => {
      const n = parseFloat(String(raw).replace(/,/g, ""));
      if (Number.isNaN(n)) return raw === undefined || raw === null ? "" : String(raw);
      return n.toLocaleString("en-US", { maximumFractionDigits: pricePrecision, minimumFractionDigits: 0 });
    },
    [pricePrecision]
  );

  const formatQuantity = useCallback(
    (qty) => {
      if (qty === undefined || qty === null || isNaN(qty)) return "0";
      return parseFloat(Number(qty).toFixed(quantityPrecision));
    },
    [quantityPrecision]
  );

  // effectiveCurrency: Redux first, then local, then route param, then coinData[0]
  const effectiveCurrency = spotSelectedPair ?? currency ?? route?.params?.coinDetail ?? coinData?.[0];

  // Scenario 1: Default to coinData[0] when nothing selected
  useEffect(() => {
    if (!spotSelectedPair && !route?.params?.coinDetail && coinData?.[0]) {
      dispatch(setSpotSelectedPair(coinData[0]));
    }
  }, [coinData, spotSelectedPair, route?.params?.coinDetail, dispatch]);

  // Scenario 2: Nav from Home with coinDetail
  useEffect(() => {
    const navCoin = route?.params?.coinDetail;
    if (navCoin) {
      const key = `${navCoin.base_currency}_${navCoin.quote_currency}`;
      const currentKey = spotSelectedPair ? `${spotSelectedPair.base_currency}_${spotSelectedPair.quote_currency}` : null;
      if (key !== currentKey) dispatch(setSpotSelectedPair(navCoin));
      navigation.setParams({ coinDetail: undefined });
    }
  }, [route?.params?.coinDetail, dispatch, navigation, spotSelectedPair]);

  /** SpotChartScreen bottom Buy/Sell → navigate here with `spotTradeSide` */
  useEffect(() => {
    const raw = route?.params?.spotTradeSide;
    if (raw == null || raw === "") return;
    const u = String(raw).toUpperCase();
    if (u === "BUY") {
      setTab("Buy");
      setIsBuy(true);
    } else if (u === "SELL") {
      setTab("Sell");
      setIsBuy(false);
    }
    navigation.setParams({ spotTradeSide: undefined });
  }, [route?.params?.spotTradeSide, navigation]);

  // Removed automatic restoration from Redux cache to ensure only fresh socket data is shown.
  // This satisfies the requirement: "if data comes from backend, show; otherwise don't".


  // When spotSelectedPair changes: sync local form + clear order book until new pair socket data arrives.
  useEffect(() => {
    if (!spotSelectedPair) return;

    if (currentCurrencyRef.current?.base_currency !== spotSelectedPair.base_currency ||
      currentCurrencyRef.current?.quote_currency !== spotSelectedPair.quote_currency) {
      setCurrency(spotSelectedPair);
      currentCurrencyRef.current = spotSelectedPair;
      const initialPrice = spotSelectedPair.buy_price ? formatPrice(spotSelectedPair.buy_price).toString() : "";
      setPrice(initialPrice);
      setStaticBuyPrice(initialPrice);
      setActivePercentage("");
      setLastSocketData(null);
      dispatch(setBuyOrders([]));
      dispatch(setSellOrders([]));
      dispatch(setRecentTrades([]));
      dispatch(setPastOrders([]));
      dispatch(clearTradeHistory());
      setSpotMyTrades([]);
      setOrderBookSocketReady(false);
      setStopPrice("");
      setTradeHistorySideFilter("All");
      setMarginLeverage("5x");
    }
  }, [spotSelectedPair?.base_currency, spotSelectedPair?.quote_currency, dispatch, formatPrice]);

  useEffect(() => {
    if (!staticBuyPrice && buy_price) {
      const p = formatPrice(buy_price).toString();
      setStaticBuyPrice(p);
      if (!price) setPrice(p);
    }
  }, [buy_price, staticBuyPrice, price, formatPrice]);

  useEffect(() => {
    // When switching between Spot and Margin tabs, reset price to capture the latest market price for the new mode.
    setStaticBuyPrice("");
    setPrice("");
    setStopPrice("");
  }, [headerTab]);

  // Manual change (TradingDataModal): dispatch to Redux - sync effect will handle rest
  // Clear order book so we don't show previous pair's data; new data will replace when socket responds
  const handleCurrencyChange = (coin) => {
    dispatch(setSpotSelectedPair(coin));
    setLastSocketData(null);
    dispatch(setBuyOrders([]));
    dispatch(setSellOrders([]));
    setOpenOrderKindTab("all");
    setOrderFilter("All");
  };

  // --- Keep selected currency updated with socket ---
  useEffect(() => {
    const curr = effectiveCurrency ?? currency;
    if (!curr || !coinData) return;

    currentCurrencyRef.current = curr;

    const updated = coinData.find(
      (c) => c.base_currency === curr.base_currency
    );

    if (updated) {
      setCurrencyData(updated);
    }
  }, [coinData, currency, effectiveCurrency]);

  // --- Safe destructuring ---
  const {
    base_currency,
    base_currency_id,
    quote_currency,
    quote_currency_id,
    change_percentage,
    _id,
    buy_price,
    high,
    low,
    volume,
  } = currencyData ?? {};
  const { skip_buy_sell, id, kycVerified } = userData ?? "";

  // Dynamic Margin Account Data for Hourly Rates
  useEffect(() => {
    if (headerTab === "Margin" && effectiveCurrency) {
      const base = effectiveCurrency.base_currency;
      const quote = effectiveCurrency.quote_currency;
      const isCross = marginMode === "Cross";

      let pairId = effectiveCurrency?._id;
      if (!isCross && !pairId && effectiveCurrency && Array.isArray(coinDataRef.current)) {
        const match = coinDataRef.current.find(p => p.base_currency === base && p.quote_currency === quote);
        pairId = match?._id;
      }

      const fetchKey = `${headerTab}_${marginMode}_${base}_${quote}_${isCross ? "cross" : pairId || "nopair"}`;

      if (lastMarginFetchRef.current !== fetchKey) {
        if (!isCross && !pairId) return;

        lastMarginFetchRef.current = fetchKey;
        setMarginAccountData(null);

        if (isCross) {
          appOperation.get(`cross/account`, undefined, undefined, CUSTOMER_TYPE)
            .then((res) => { if (res?.success) setMarginAccountData(res.data); })
            .catch(() => { });
          appOperation.get("cross/risk", undefined, undefined, CUSTOMER_TYPE)
            .then((res) => { if (res?.success) setCrossRisk(res.data); })
            .catch(() => { });
        } else {
          appOperation.get(`margin/account/${pairId}`, undefined, undefined, CUSTOMER_TYPE)
            .then((res) => { if (res?.success) setMarginAccountData(res.data); })
            .catch(() => { });
        }
      }
    } else {
      lastMarginFetchRef.current = "";
    }
  }, [headerTab, effectiveCurrency?.base_currency, effectiveCurrency?.quote_currency, effectiveCurrency?._id, marginMode]);

  const getCrossAsset = useCallback((symbol) => {
    if (!marginAccountData?.assets) return null;
    return marginAccountData.assets.find((a) => a.currency === symbol) || null;
  }, [marginAccountData]);

  const COIN_RATES = {
    BNB: { hourly: "0.00034929", annual: "3.05977500" },
    USDT: { hourly: "0.00038596", annual: "3.38099500" },
    BTC: { hourly: "0.00004663", annual: "0.40843500" },
    ETH: { hourly: "0.00008219", annual: "0.71998440" },
    "0G": { hourly: "0.00050000", annual: "4.38000000" },
    "1INCH": { hourly: "0.00037917", annual: "3.32150000" },
    "2Z": { hourly: "0.00062500", annual: "5.47500000" },
  };

  const getHourlyRate = useCallback((symbol) => {
    const isCross = marginMode === "Cross";
    let rawRate = null;
    let fallback = COIN_RATES[symbol]?.hourly || "0.00200000";

    if (isCross) {
      const crossInterest = getCrossAsset(symbol);
      rawRate = crossInterest?.hourly_interest_rate_pct;
    } else {
      rawRate = marginAccountData?.interest?.hourly_pct;
    }

    if (rawRate != null) {
      return `${String(rawRate).replace(/%/g, "")}%`;
    }
    return `${fallback}%`;
  }, [marginMode, marginAccountData, getCrossAsset]);

  const safeBaseCurrency = base_currency || effectiveCurrency?.base_currency || "BTC";
  const safeQuoteCurrency = quote_currency || effectiveCurrency?.quote_currency || "USDT";
  const baseHourlyRate = getHourlyRate(safeBaseCurrency);
  const quoteHourlyRate = getHourlyRate(safeQuoteCurrency);

  /** Chart opens immediately — do not wait for order book / socket; resolve symbols from pair, coin list, or row metadata. */
  const handleCandlePress = useCallback(() => {
    const pair = spotSelectedPair ?? currency ?? effectiveCurrency;
    if (!pair) return;
    const fromList =
      Array.isArray(coinData) && coinData.length > 0
        ? coinData.find(
          (c) =>
            (pair.base_currency_id != null &&
              pair.quote_currency_id != null &&
              c.base_currency_id === pair.base_currency_id &&
              c.quote_currency_id === pair.quote_currency_id) ||
            (pair.base_currency &&
              pair.quote_currency &&
              c.base_currency === pair.base_currency &&
              c.quote_currency === pair.quote_currency)
        )
        : null;
    const baseSym =
      pair.base_currency ??
      pair.base_currency_short_name ??
      fromList?.base_currency ??
      base_currency ??
      currencyData?.base_currency;
    const quoteSym =
      pair.quote_currency ??
      pair.quote_currency_short_name ??
      fromList?.quote_currency ??
      quote_currency ??
      currencyData?.quote_currency;
    if (!baseSym || !quoteSym) return;
    NavigationService.navigate(SPOT_CHART_SCREEN, {
      base_currency: baseSym,
      quote_currency: quoteSym,
      change_percentage: pair.change_percentage ?? change_percentage ?? 0,
      buy_price: pair.buy_price ?? buy_price,
      high: pair.high ?? high,
      low: pair.low ?? low,
      volume: pair.volume ?? volume,
      tradeType: headerTab,
    });
  }, [
    spotSelectedPair,
    currency,
    effectiveCurrency,
    coinData,
    base_currency,
    quote_currency,
    change_percentage,
    buy_price,
    high,
    low,
    volume,
    currencyData,
    headerTab,
  ]);

  /** Web TradePage: Maker / Taker % under CTA; fall back 0.2 when pair has no fee fields yet */
  const spotFooterMakerTakerPct = useMemo(() => {
    const parseFee = (v, fallback = 0.2) => {
      if (v === null || v === undefined || v === "") return fallback;
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    return {
      maker: parseFee(currencyData?.maker_fee),
      taker: parseFee(currencyData?.taker_fee),
    };
  }, [currencyData?.maker_fee, currencyData?.taker_fee]);



  /** `activeTab` + `mountedOrdersTab` stay in sync — single panel only (web-style API lists; no duplicate slide UI). */
  const [activeTab, setActiveTab] = useState(1);
  const [mountedOrdersTab, setMountedOrdersTab] = useState(1);
  const [loadingSpotOpenOrders, setLoadingSpotOpenOrders] = useState(false);
  const [loadingSpotOrderHistory, setLoadingSpotOrderHistory] = useState(false);
  const [loadingSpotTradeHistory, setLoadingSpotTradeHistory] = useState(false);
  const [cancelledOrderIds, setCancelledOrderIds] = useState(() => new Set());
  const spotHistoryFetchGenRef = useRef({ openOrders: 0, orderHistory: 0, tradeHistory: 0 });
  activeTabRef.current = activeTab;

  // Bottom tabs row: scroll so left tabs align left, right tab aligns right (narrow screens).
  const ordersBottomTabScrollRef = useRef(null);
  const ordersBottomTabBarWidthRef = useRef(0);
  const ordersBottomTabItemLayoutRef = useRef({});

  const scrollOrdersBottomTabBarIntoView = useCallback((tabId) => {
    const sv = ordersBottomTabScrollRef.current;
    if (!sv) return;
    const barW = ordersBottomTabBarWidthRef.current;
    const lay = ordersBottomTabItemLayoutRef.current[tabId];
    const pad = 10;
    if (!lay?.width || barW <= 0) {
      if (tabId === 1) sv.scrollTo({ x: 0, animated: true });
      else if (tabId === 3) sv.scrollToEnd({ animated: true });
      return;
    }
    let x = 0;
    if (tabId === 1) {
      x = Math.max(0, lay.x - pad);
    } else if (tabId === 3) {
      x = Math.max(0, lay.x + lay.width - barW + pad);
    } else {
      x = Math.max(0, lay.x + lay.width / 2 - barW / 2);
    }
    sv.scrollTo({ x, animated: true });
  }, []);

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => {
      scrollOrdersBottomTabBarIntoView(mountedOrdersTab);
    });
    return () => cancelAnimationFrame(id);
  }, [mountedOrdersTab, scrollOrdersBottomTabBarIntoView]);

  const handleSpotOrdersPrimaryTab = useCallback(
    (tabId) => {
      if (tabId < 1 || tabId > 3) return;
      if (activeTab === tabId) return;
      setExpandedRowIndex(null);
      if (tabId === 2) setLoadingSpotOrderHistory(true);
      else if (tabId === 3) setLoadingSpotTradeHistory(true);
      activeTabRef.current = tabId;
      setActiveTab(tabId);
      setMountedOrdersTab(tabId);
    },
    [activeTab],
  );

  const [tab, setTab] = useState("Buy");
  const [headerTab, setHeaderTab] = useState(route?.params?.activeTab || "Spot");
  useEffect(() => {
    if (route?.params?.activeTab) {
      setHeaderTab(route.params.activeTab);
      navigation.setParams({ activeTab: undefined });
    }
  }, [route?.params?.activeTab, navigation]);
  const [marginMode, setMarginMode] = useState("Isolated");
  const [marginLeverage, setMarginLeverage] = useState("5x");

  const fetchCrossRisk = useCallback(async () => {
    if (!userData) return;
    try {
      const res = await appOperation.get("cross/risk", undefined, undefined, CUSTOMER_TYPE);
      if (res?.success && res.data) setCrossRisk(res.data);
    } catch {
      /* keep previous risk */
    }
  }, [userData]);

  useEffect(() => {
    const onCrossTrade = headerTab === "Margin" && marginMode === "Cross" && !!userData;
    if (!onCrossTrade) {
      setCrossRisk(null);
      rbSheetCrossRisk.current?.close();
      return undefined;
    }
    if (!isSpotFocused) return undefined;
    fetchCrossRisk();
    const id = setInterval(() => { void fetchCrossRisk(); }, 5000);
    return () => clearInterval(id);
  }, [headerTab, marginMode, userData, isSpotFocused, fetchCrossRisk]);

  useEffect(() => {
    const onIsolatedTrade = headerTab === "Margin" && marginMode === "Isolated" && !!userData;
    if (!onIsolatedTrade) {
      rbSheetIsolatedRisk.current?.close();
      return undefined;
    }
    if (!isSpotFocused) return undefined;
    let pairId = effectiveCurrency?._id || currencyData?._id;
    if (!pairId && effectiveCurrency && Array.isArray(coinDataRef.current)) {
      const match = coinDataRef.current.find(
        (p) => p.base_currency === effectiveCurrency.base_currency && p.quote_currency === effectiveCurrency.quote_currency
      );
      pairId = match?._id;
    }
    if (!pairId) return undefined;
    const pull = () => {
      appOperation.get(`margin/account/${pairId}`, undefined, undefined, CUSTOMER_TYPE)
        .then((res) => { if (res?.success) setMarginAccountData(res.data); })
        .catch(() => { });
    };
    pull();
    const id = setInterval(pull, 5000);
    return () => clearInterval(id);
  }, [headerTab, marginMode, userData, isSpotFocused, effectiveCurrency?._id, effectiveCurrency?.base_currency, effectiveCurrency?.quote_currency, currencyData?._id]);

  const parsedCrossRisk = useMemo(() => parseCrossRisk(crossRisk || {}), [crossRisk]);

  const isolatedRiskRow = useMemo(() => {
    if (headerTab !== "Margin" || marginMode !== "Isolated") return null;
    const pairId = currencyData?._id || effectiveCurrency?._id || "";
    return buildMarginRiskRow({
      ...(marginAccountData || {}),
      pair: `${base_currency || ""}${quote_currency || ""}`,
      pairRaw: `${base_currency || ""}/${quote_currency || ""}`,
      pair_id: pairId,
      margin_level: coinBalance?.margin_level ?? marginAccountData?.margin_level,
      base_borrowed: coinBalance?.base_currency_borrowed ?? marginAccountData?.base_borrowed,
      quote_borrowed: coinBalance?.quote_currency_borrowed ?? marginAccountData?.quote_borrowed,
      leverage: parseInt(String(marginLeverage || "").replace(/x/i, ""), 10) || marginAccountData?.leverage,
    }, pairId);
  }, [
    headerTab,
    marginMode,
    marginAccountData,
    coinBalance?.margin_level,
    coinBalance?.base_currency_borrowed,
    coinBalance?.quote_currency_borrowed,
    base_currency,
    quote_currency,
    currencyData?._id,
    effectiveCurrency?._id,
    marginLeverage,
  ]);

  const isolatedMl = parseMarginLevel(isolatedRiskRow?.margin_level);
  const isolatedHasDebt = isolatedRiskRow ? pairHasDebt(isolatedRiskRow, isolatedMl) : false;
  const isolatedThresholds = isolatedRiskRow ? resolveMarginThresholds(isolatedRiskRow) : {};
  const isolatedMlStatus = getMarginLevelStatus(
    isolatedHasDebt ? isolatedMl : null,
    isolatedThresholds,
    { hasDebt: isolatedHasDebt },
  );
  const isolatedMlDisplay = isolatedHasDebt ? formatMarginLevel(isolatedMl) : "Safe";

  useEffect(() => {
    if (headerTab === "Margin" && marginMode === "Cross") {
      dispatch(getCrossAccount());
      fetchCrossRisk();

      const baseId = currencyData?.base_currency_id || currentCurrencyRef.current?.base_currency_id;
      const quoteId = currencyData?.quote_currency_id || currentCurrencyRef.current?.quote_currency_id;
      if (baseId) {
        dispatch(getCrossBorrowable(baseId));
      }
      if (quoteId) {
        dispatch(getCrossBorrowable(quoteId));
      }
    }
  }, [headerTab, marginMode, currencyData?.base_currency_id, currencyData?.quote_currency_id, dispatch, fetchCrossRisk]);
  const [tpPrice, setTpPrice] = useState("");
  const [slPrice, setSlPrice] = useState("");
  const [staticBuyPrice, setStaticBuyPrice] = useState("");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [amtDenom, setAmtDenom] = useState("BASE");
  const [stopPrice, setStopPrice] = useState("");
  const [limitIoc, setLimitIoc] = useState(false);
  const [limitFok, setLimitFok] = useState(false);
  const [slippageEnabled, setSlippageEnabled] = useState(false);
  const [slippagePct, setSlippagePct] = useState("");
  const [isSlippageInputFocused, setIsSlippageInputFocused] = useState(false);
  // Fixed pitch black selection highlight on long press copy/paste
  const inputSelectionColor = themeColors.spotTradeBuy ? `${themeColors.spotTradeBuy}40` : "rgba(0,0,0,0.2)";
  const [isBuy, setIsBuy] = useState(true);
  const [total, setTotal] = useState("");


  // const [chartLoading, setChartLoading] = useState(true);
  // const [preloadedUrl, setPreloadedUrl] = useState(null);
  // const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [numberSelectLimit, setNumberLimit] = useState("Limit");
  const spotOrderType = useMemo(() => {
    switch (numberSelectLimit) {
      case "Market":
        return "MARKET";
      case "Spot Limit":
        return "STOP_LIMIT";
      case "Spot Market":
        return "STOP_MARKET";
      default:
        return "LIMIT";
    }
  }, [numberSelectLimit]);
  // Web parity flags (see `arab_global_exchange/src/ui/Pages/TradePage/index.js`)
  const isStopOrder = spotOrderType === "STOP_LIMIT" || spotOrderType === "STOP_MARKET";
  const isLimit = spotOrderType === "LIMIT" || spotOrderType === "STOP_LIMIT";
  const isMarketLikeOrder = spotOrderType === "MARKET" || spotOrderType === "STOP_MARKET";
  const showStopPriceField = isStopOrder;
  const showAmtDenomSelect =
    spotOrderType === "MARKET" || spotOrderType === "STOP_MARKET" || spotOrderType === "STOP_LIMIT";

  const slippageBounds = useMemo(() => {
    const minRaw = Number(currencyData?.min_slippage_percent);
    const maxRaw = Number(currencyData?.max_slippage_percent);
    const min = Number.isFinite(minRaw) && minRaw > 0 ? minRaw : 0.1;
    const max = Number.isFinite(maxRaw) && maxRaw >= min ? maxRaw : Math.max(1, min);
    return { min, max };
  }, [currencyData?.min_slippage_percent, currencyData?.max_slippage_percent]);

  const slippagePlaceholder = useMemo(
    () => `Allowed ${slippageBounds.min}% - ${slippageBounds.max}%`,
    [slippageBounds.max, slippageBounds.min]
  );

  const slippageError = useMemo(() => {
    if (!slippageEnabled) return "";
    const text = String(slippagePct ?? "").trim();
    if (text === "") return "";
    const n = Number(text);
    if (!Number.isFinite(n)) return "Enter a valid slippage percent.";
    if (n < slippageBounds.min || n > slippageBounds.max) {
      return `Slippage must be between ${slippageBounds.min}% and ${slippageBounds.max}%.`;
    }
    return "";
  }, [slippageBounds.max, slippageBounds.min, slippageEnabled, slippagePct]);

  useEffect(() => {
    if (!slippageEnabled) setIsSlippageInputFocused(false);
  }, [slippageEnabled]);

  const [openOrderKindTab, setOpenOrderKindTab] = useState("all");
  // const [orderBookReady, setOrderBookReady] = useState(false);
  // const [showOrderBookSkeleton, setShowOrderBookSkeleton] = useState(true);
  const [spotMyTrades, setSpotMyTrades] = useState([]);
  /** Skip local state updates when REST poll returns identical rows (less re-render / jank). */
  const spotMyTradesDataSigRef = useRef("");
  const [tradeHistorySideFilter, setTradeHistorySideFilter] = useState("All");
  const [activePercentage, setActivePercentage] = useState(0);
  const [balance, setBalance] = useState(0);
  const [_balance, _setBalance] = useState(0);
  const [numberSelect, setNumberSelect] = useState("0.0001");
  const [isConfirm, setIsConfirm] = useState(false);
  const [visible, setVisible] = useState(false);
  const [focusSettling, setFocusSettling] = useState(false);
  const focusSettlingTimeoutRef = useRef(null);

  const [isSwitchingTab, setIsSwitchingTab] = useState(false);

  useEffect(() => {
    setIsSwitchingTab(true);
    const t = setTimeout(() => setIsSwitchingTab(false), 600);
    return () => clearTimeout(t);
  }, [headerTab, marginMode, quote_currency, base_currency]);

  useEffect(() => {
    setAmount("");
    setTotal("");
    setActivePercentage(0);
  }, [headerTab, marginMode]);

  const orderBookReady = orderBookSocketReady;
  const showOrderBookSkeleton = !orderBookSocketReady;
  /** Header shows skeleton until `coinData` row exists for the pair (LOCAL pairs skip list lookup). */
  const pairMetaReady =
    currencyData != null || effectiveCurrency?.available === "LOCAL";
  const pairHeaderLoading = !pairMetaReady;

  const pairIdForFav = useMemo(() => currencyData?._id ?? effectiveCurrency?._id ?? spotSelectedPair?._id, [currencyData?._id, effectiveCurrency?._id, spotSelectedPair?._id]);
  const isFav = useMemo(() => {
    if (!favoriteArray || !pairIdForFav) return false;
    return favoriteArray.includes(pairIdForFav);
  }, [favoriteArray, pairIdForFav]);
  const [favLoading, setFavLoading] = useState(false);

  useEffect(() => {
    if (userData && !favoriteArrayLoaded) {
      dispatch(getFavoriteArray());
    }
  }, [userData, favoriteArrayLoaded, dispatch]);

  const toggleFavorite = useCallback(async () => {
    if (!pairIdForFav || favLoading) return;
    setFavLoading(true);
    try {
      await dispatch(addToFavorites({ pair_id: pairIdForFav }));
    } catch (e) {
      console.log("Favorite toggle error", e);
    } finally {
      setFavLoading(false);
    }
  }, [dispatch, pairIdForFav, favLoading]);


  // Lifecycle: on focus subscribe and show content; on blur clear global loader first (no overlay), then all timers and unsubscribe
  useFocusEffect(
    useCallback(() => {
      if (route?.params?.activeTab) {
        setHeaderTab(route.params.activeTab);
        navigation.setParams({ activeTab: undefined });
      }
      unsubscribeFromMarket();
      unsubscribeFromFutures();
      dispatch(setLoading(false));
      isSpotFocusedRef.current = true;
      setFocusSettling(true);
      if (focusSettlingTimeoutRef.current) clearTimeout(focusSettlingTimeoutRef.current);
      focusSettlingTimeoutRef.current = setTimeout(() => {
        focusSettlingTimeoutRef.current = null;
        setFocusSettling(false);
      }, 550);
      const pending = pendingOrderBookOnBlurRef.current;
      if (pending) {
        pendingOrderBookOnBlurRef.current = null;
        flushSocketToStateRef.current?.(pending);
      }
      const currentPair = currentCurrencyRef.current || currency;
      if (currentPair?.base_currency_id && currentPair?.quote_currency_id) {
        const tradeType = headerTab === "Margin" ? (marginMode === "Cross" ? "cross" : "margin") : "spot";
        const newKey = `${currentPair.base_currency_id}-${currentPair.quote_currency_id}-${tradeType}`;
        const lastExchange = lastSubscribedExchangeRef.current;
        const alreadySubscribed =
          !!lastExchange &&
          `${lastExchange.base_currency_id}-${lastExchange.quote_currency_id}-${lastExchange.tradeType || "spot"}` === newKey;
        /** Only clear + resubscribe when the exchange pair actually changed (or first load).
         *  Returning from SpotChartScreen or switching Spot <-> Margin keeps Redux book — Binance-style (no full reload). */
        if (!alreadySubscribed) {
          const isSamePairDifferentTradeType =
            !!lastExchange &&
            lastExchange.base_currency_id === currentPair.base_currency_id &&
            lastExchange.quote_currency_id === currentPair.quote_currency_id;

          if (!isSamePairDifferentTradeType) {
            dispatch(setBuyOrders([]));
            dispatch(setSellOrders([]));
            setLastSocketData(null);
          }
          if (lastExchange?.base_currency_id != null && lastExchange?.quote_currency_id != null) {
            unsubscribeFromExchange(lastExchange.base_currency_id, lastExchange.quote_currency_id);
          }
          const extraParams = headerTab === "Margin" ? { tradeType, pairId: currentPair?._id } : {};
          subscribeToExchange(currentPair.base_currency_id, currentPair.quote_currency_id, extraParams);
          lastSubscribedExchangeRef.current = {
            base_currency_id: currentPair.base_currency_id,
            quote_currency_id: currentPair.quote_currency_id,
            tradeType,
          };
        }
      }
      // If pair has no ids, ensure we don't show stale data from a previous subscription.
      if (!currentPair?.base_currency_id || !currentPair?.quote_currency_id) {
        const lastExchange = lastSubscribedExchangeRef.current;
        if (lastExchange?.base_currency_id != null && lastExchange?.quote_currency_id != null) {
          unsubscribeFromExchange(lastExchange.base_currency_id, lastExchange.quote_currency_id);
          lastSubscribedExchangeRef.current = null;
        }
        dispatch(setBuyOrders([]));
        dispatch(setSellOrders([]));
        dispatch(setRecentTrades([]));
        setLastSocketData(null);
      }
      if (currentPair?.available === "LOCAL") {
        if (latestLocalBuyOrdersRef.current?.length > 0) {
          dispatch(setBuyOrders(latestLocalBuyOrdersRef.current));
        }
        if (latestLocalSellOrdersRef.current?.length > 0) {
          dispatch(setSellOrders(latestLocalSellOrdersRef.current));
        }
      }
      // Ensure loader hides after a timeout if data is stuck, but mainly rely on data
      const stopLoaderTimer = setTimeout(() => {
        dispatch(setLoading(false));
      }, 2000);

      return () => {
        dispatch(setLoading(false));
        isSpotFocusedRef.current = false;
        clearTimeout(stopLoaderTimer);

        // Clean up all timers and refs so no callbacks run after blur (prevents freeze and overlay)
        if (focusSettlingTimeoutRef.current) {
          clearTimeout(focusSettlingTimeoutRef.current);
          focusSettlingTimeoutRef.current = null;
        }

        if (socketThrottleTimerRef.current) {
          clearTimeout(socketThrottleTimerRef.current);
          socketThrottleTimerRef.current = null;
        }
        pendingSocketFlushRef.current = null;

        /** Do not unsubscribe or clear the order book on blur (e.g. opening SpotChartScreen).
         *  SocketProvider keeps one exchange subscription; Redux keeps last book until pair changes or Spot unmounts. */
      };
    }, [subscribeToExchange, unsubscribeFromExchange, currency, dispatch, headerTab, marginMode])
  );

  /** Tear down exchange subscription only when Spot screen unmounts (leave trading stack), not on blur. */
  useEffect(() => {
    return () => {
      const last = lastSubscribedExchangeRef.current;
      if (last?.base_currency_id != null && last?.quote_currency_id != null) {
        unsubscribeFromExchange(last.base_currency_id, last.quote_currency_id);
        lastSubscribedExchangeRef.current = null;
      }
    };
  }, [unsubscribeFromExchange]);

  // Keep ref in sync for callbacks (socket, flushSocketToState) so they see current focus without delay
  useEffect(() => {
    isSpotFocusedRef.current = isSpotFocused;
  }, [isSpotFocused]);

  // Removed redundant useEffects for exchange subscriptions to prevent duplicate Exchange subscribe logs.

  useEffect(() => {
    if (Object.keys(coinBalance || {}).length === 0) return;
    setBalance(coinBalance?.quote_currency_balance || 0);
    _setBalance(coinBalance?.base_currency_balance || 0);
  }, [coinBalance]);

  // AppState handling to prevent updates when app is in background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      appStateRef.current = nextAppState;
      setAppState(nextAppState);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  const flushSocketToState = useCallback((payload) => {
    if (!payload) return;
    if (!isSpotFocusedRef.current) {
      pendingOrderBookOnBlurRef.current = payload;
      return;
    }
    setLastSocketData(payload.data);
    if (historyOnly) {
      // In history-only mode, skip orderbook/recentTrades dispatches to keep UI ultra-light.
      return;
    }
    if (payload.recentTrades?.length !== undefined) {
      // already in Redux via setCoinData in SocketProvider
    }
    if (payload.sellOrders?.length !== undefined) {
      if (!orderBookDataEqual(lastFlushedSellRef.current, payload.sellOrders)) {
        lastFlushedSellRef.current = payload.sellOrders;
        dispatch(setSellOrders(payload.sellOrders));
      }
    }
    if (payload.buyOrders?.length !== undefined) {
      if (!orderBookDataEqual(lastFlushedBuyRef.current, payload.buyOrders)) {
        lastFlushedBuyRef.current = payload.buyOrders;
        dispatch(setBuyOrders(payload.buyOrders));
      }
    }
    if (payload.recentTrades?.length !== undefined) {
      dispatch(setRecentTrades(payload.recentTrades));
    }
  }, [dispatch]);

  flushSocketToStateRef.current = flushSocketToState;

  // Socket listener only when Spot is focused - when blurred we remove listeners so no work in background
  useEffect(() => {
    if (!socket || !isSpotFocused) return;

    const scheduleFlush = (payload) => {
      pendingSocketFlushRef.current = payload;
      const now = Date.now();
      const elapsed = now - socketLastFlushRef.current;
      const throttleMs = SOCKET_UI_THROTTLE_MS;
      if (elapsed >= throttleMs || socketLastFlushRef.current === 0) {
        socketLastFlushRef.current = now;
        flushSocketToState(payload);
        pendingSocketFlushRef.current = null;
        if (socketThrottleTimerRef.current) {
          clearTimeout(socketThrottleTimerRef.current);
          socketThrottleTimerRef.current = null;
        }
        return;
      }
      if (socketThrottleTimerRef.current == null) {
        socketThrottleTimerRef.current = setTimeout(() => {
          socketThrottleTimerRef.current = null;
          socketLastFlushRef.current = Date.now();
          const pending = pendingSocketFlushRef.current;
          pendingSocketFlushRef.current = null;
          if (pending) {
            flushSocketToState(pending);
          }
        }, throttleMs - elapsed);
      }
    };

    const handleMessage = (data) => {
      latestSocketDataRef.current = data;
      if (!isSpotFocusedRef.current || appStateRef.current !== "active") return;

      // Trade History UI is API-only (getTradeHistory → Redux → spotMyTrades). Do not hydrate from socket.

      const hasBuyArr = Array.isArray(data?.buy_order);
      const hasSellArr = Array.isArray(data?.sell_order);
      if (!historyOnly && (hasBuyArr || hasSellArr)) {
        setOrderBookSocketReady(true);
      }
      if (hasBuyArr) {
        latestLocalBuyOrdersRef.current = data.buy_order;
      }
      if (hasSellArr) {
        latestLocalSellOrdersRef.current = data.sell_order;
      }

      if (!historyOnly && (hasBuyArr || hasSellArr || Array.isArray(data?.recent_trades))) {
        scheduleFlush({
          data,
          buyOrders: hasBuyArr ? data.buy_order : undefined,
          sellOrders: hasSellArr ? data.sell_order : undefined,
          recentTrades: Array.isArray(data?.recent_trades) ? data.recent_trades : undefined,
        });
      }
    };

    // Web uses exchange:update; listen to both so open orders & order history update smoothly
    socket.on("message", handleMessage);
    socket.on("exchange:update", handleMessage);
    return () => {
      socket.off("message", handleMessage);
      socket.off("exchange:update", handleMessage);
      if (socketThrottleTimerRef.current) {
        clearTimeout(socketThrottleTimerRef.current);
        socketThrottleTimerRef.current = null;
      }
    };
  }, [socket, isSpotFocused, dispatch, flushSocketToState]);

  // Use local orders for LOCAL pairs when local lists update

  // Web parity: poll only while the mounted tab panel is Order History (2) — matches visible UI after slide animation (avoids Redux updating mid-slide + stale list flash).
  /**
   * Warm-switch prefetch:
   * When Spot is focused and a pair is selected, prefetch BOTH:
   * - Order History (executed orders)
   * - Trade History (fills)
   *
   * This makes switching tab 2 ↔ 3 feel instant (same as History screen warm-cache behavior),
   */
  const spotHistoryPrefetchRef = useRef({ pair: undefined, ts: 0 });
  const openOrdersRef = useRef(openOrders);
  openOrdersRef.current = openOrders;
  const lastOrderPlacedTimeRef = useRef(0);
  const pastOrdersRef = useRef(pastOrders);
  pastOrdersRef.current = pastOrders;
  const filteredMyTradesRef = useRef(filteredMyTrades);
  filteredMyTradesRef.current = filteredMyTrades;

  const userId = userData?.id || userData?._id;

  const fetchSpotOpenOrdersTab = useCallback(async (silent = true) => {
    if (!userId) return;
    const gen = ++spotHistoryFetchGenRef.current.openOrders;
    try {
      const response = await appOperation.customer.spot_me_orders_open({
        page: 1,
        page_size: 50,
      });
      if (gen !== spotHistoryFetchGenRef.current.openOrders) return;
      const items = spotMeOpenOrdersItemsFromResponse(response);
      if (response?.success && Array.isArray(items)) {
        // If an order was recently placed within 2.5s and DB read returns 0 items, retry shortly without clearing
        if (items.length === 0 && Date.now() - lastOrderPlacedTimeRef.current < 2500) {
          setTimeout(() => {
            fetchSpotOpenOrdersTab(true);
          }, 350);
          return;
        }
        dispatch(setOpenOrders(items));
      }
    } catch (e) {
      if (gen !== spotHistoryFetchGenRef.current.openOrders) return;
      console.warn("fetchSpotOpenOrdersTab err:", e);
    }
  }, [userId, dispatch]);

  const fetchSpotOrderHistoryTab = useCallback(async (silent = true) => {
    if (!base_currency || !quote_currency || !userId) {
      setLoadingSpotOrderHistory(false);
      return;
    }
    const gen = ++spotHistoryFetchGenRef.current.orderHistory;
    try {
      const pair = `${base_currency}${quote_currency}`.toUpperCase();
      const tt = headerTab === "Margin" ? (marginMode === "Cross" ? "cross" : "margin") : undefined;
      await dispatch(getPastOrders({ page: 1, page_size: 50, pair, tradeType: tt }, { useGlobalLoader: false }));
    } finally {
      if (gen === spotHistoryFetchGenRef.current.orderHistory) {
        setLoadingSpotOrderHistory(false);
      }
    }
  }, [base_currency, quote_currency, userId, dispatch, headerTab, marginMode]);

  const fetchSpotTradeHistoryTab = useCallback(async (silent = true) => {
    if (!base_currency || !quote_currency || !userId) {
      setLoadingSpotTradeHistory(false);
      return;
    }
    const gen = ++spotHistoryFetchGenRef.current.tradeHistory;
    try {
      const pair = `${base_currency}${quote_currency}`.toUpperCase();
      await dispatch(
        getTradeHistory(0, 50, pair, {
          useGlobalLoader: false,
          clearBeforeFetch: false,
        }),
      );
    } finally {
      if (gen === spotHistoryFetchGenRef.current.tradeHistory) {
        setLoadingSpotTradeHistory(false);
      }
    }
  }, [base_currency, quote_currency, userId, dispatch]);

  const spotHistoryActiveLoading = useMemo(() => {
    if (mountedOrdersTab === 2) return loadingSpotOrderHistory && (!pastOrders || pastOrders.length === 0);
    if (mountedOrdersTab === 3) return loadingSpotTradeHistory && (!filteredMyTrades || filteredMyTrades.length === 0);
    return false;
  }, [mountedOrdersTab, loadingSpotOrderHistory, loadingSpotTradeHistory, pastOrders, filteredMyTrades]);

  const showSpotHistoryLoader = spotHistoryActiveLoading;

  useEffect(() => {
    if (!base_currency || !quote_currency || !userId) return;
    if (!isSpotFocused) return;
    const pair = `${base_currency}${quote_currency}`.toUpperCase();
    const now = Date.now();
    // Debounce: avoid spam on rapid re-renders.
    if (spotHistoryPrefetchRef.current.pair === pair && now - (spotHistoryPrefetchRef.current.ts || 0) < 2500) return;
    spotHistoryPrefetchRef.current = { pair, ts: now };

    // Prefetch order history (tab 2)
    const tt = headerTab === "Margin" ? (marginMode === "Cross" ? "cross" : "margin") : undefined;
    dispatch(getPastOrders({ page: 1, page_size: 50, pair, tradeType: tt }, { useGlobalLoader: false }));

    // Prefetch trade fills (tab 3) — do NOT clear on focus return (avoids list flicker/reload when coming back from detail).
    dispatch(
      getTradeHistory(0, 50, pair, {
        useGlobalLoader: false,
        clearBeforeFetch: false,
      }),
    );
  }, [base_currency, quote_currency, userId, dispatch, isSpotFocused, headerTab, marginMode]);

  useEffect(() => {
    if (!base_currency || !quote_currency || !userId) return undefined;
    if (!isSpotFocused) return undefined;
    if (mountedOrdersTab !== 1) return undefined;
    fetchSpotOpenOrdersTab();
  }, [base_currency, quote_currency, userId, mountedOrdersTab, isSpotFocused, fetchSpotOpenOrdersTab]);

  useEffect(() => {
    if (!base_currency || !quote_currency || !userId) return undefined;
    if (!isSpotFocused) return undefined;
    if (mountedOrdersTab !== 2) return undefined;
    fetchSpotOrderHistoryTab();
  }, [base_currency, quote_currency, userId, mountedOrdersTab, isSpotFocused, fetchSpotOrderHistoryTab]);

  // Same for Trade History (3): poll only when that panel is actually mounted (not merely tab highlight mid-animation).
  useEffect(() => {
    if (!base_currency || !quote_currency || !userId) return undefined;
    if (!isSpotFocused) return undefined;
    if (mountedOrdersTab !== 3) return undefined;
    fetchSpotTradeHistoryTab();
  }, [base_currency, quote_currency, userId, mountedOrdersTab, isSpotFocused, fetchSpotTradeHistoryTab]);

  // Trade History list: mirror REST-only payload from getTradeHistory (no socket merge).
  const walletTradeHistory = useSelector((state) => state.wallet.tradeHistory);
  useEffect(() => {
    // Optimization: when leaving Trade History tab, ignore background Redux updates
    // to avoid heavy mapping + re-render during tab-switch animation.
    if (mountedOrdersTab !== 3) return;
    const list = walletTradeHistory == null
      ? []
      : (Array.isArray(walletTradeHistory) ? walletTradeHistory : []);
    const norm = list.map((t, idx) => ({
      ...t,
      _id: t._id || t.id || t.trade_id || `trade_row_${idx}`,
    }));
    const sig = norm
      .map(
        (t) =>
          `${t._id}:${String(t.executed_at ?? t.executedAt ?? t.created_at ?? "")}:${String(t.price ?? "")}:${String(t.quantity ?? "")}:${String(t.side ?? "")}`,
      )
      .join("|");
    if (sig === spotMyTradesDataSigRef.current) return;
    spotMyTradesDataSigRef.current = sig;
    setSpotMyTrades(norm);
  }, [walletTradeHistory, mountedOrdersTab]);

  useEffect(() => {
    spotMyTradesDataSigRef.current = "";
  }, [base_currency, quote_currency]);

  const handleAmount = (text) => {
    setPrice(text?.toString());
    setTotal(multiply(text, amount));
  };

  const handleOrderBookClick = useCallback((itemPrice, itemQuantity) => {
    if (isLimit) {
      setPrice(formatPrice(itemPrice).toString());
    }
    const q = formatQuantity(itemQuantity).toString();
    syncAmountAnimForQuantityString(q);
    setAmount(q);
    Animated.timing(totalAnim, {
      toValue: q.trim() !== "" ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isLimit, formatPrice, formatQuantity, syncAmountAnimForQuantityString]);

  const parseOrderQty = (s) => {
    const n = parseFloat(String(s ?? "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : NaN;
  };

  const parsePriceNum = (v) => {
    const n = parseFloat(String(v ?? "").replace(/,/g, ""));
    return Number.isFinite(n) ? n : NaN;
  };

  const getStepSize = () => Number(currencyData?.step_size) || 0.00001;

  /** Snap qty to step_size without float drift (e.g. 0.00007 must not floor to 0.00006). */
  const snapQtyToStep = (qty, mode = "floor") => {
    const step = getStepSize();
    if (!Number.isFinite(qty) || qty <= 0) return 0;
    const units = qty / step;
    const scaled = Math.round(units * 1e12) / 1e12;
    const steps = mode === "ceil"
      ? Math.ceil(scaled - 1e-12)
      : mode === "round"
        ? Math.round(scaled)
        : Math.floor(scaled + 1e-12);
    const precision = getDecimalPlaces(step);
    return parseFloat((steps * step).toFixed(precision));
  };

  const toFixed8 = (data) => snapQtyToStep(data, "floor");
  const ceilQuantityToStep = (qty) => snapQtyToStep(qty, "ceil");

  const parseMinNotional = () => {
    const raw = currencyData?.min_notional;
    const n = typeof raw === "object" && raw?.$numberDecimal != null
      ? Number(raw.$numberDecimal)
      : Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 5;
  };

  const roundQuoteNotional = (n) => {
    if (!Number.isFinite(n)) return NaN;
    const dp = currencyData?.quote_decimal ?? getPricePrecision();
    return parseFloat(n.toFixed(dp));
  };

  const validateOrder = (price, quantity, side, orderKind = "LIMIT", amountIsQuote = false) => {
    const tick_size = currencyData?.tick_size || 0.01;
    const step_size = currencyData?.step_size || 0.00001;
    const min_notional = parseMinNotional();
    const max_order_qty = currencyData?.max_order_qty || 9000;

    const skipPriceTick = orderKind === "MARKET" || orderKind === "STOP_MARKET";

    const numPrice = parsePriceNum(price);
    const numQuantity = parseOrderQty(quantity);

    if (!Number.isFinite(numPrice) || !Number.isFinite(numQuantity)) {
      showError("Invalid price or amount");
      return false;
    }

    if (amountIsQuote && numPrice <= 0) {
      showError("Price is required to size this order");
      return false;
    }

    const baseQty = amountIsQuote && numPrice > 0
      ? ceilQuantityToStep(numQuantity / numPrice)
      : snapQtyToStep(numQuantity, "floor");
    const minCheckTotal = amountIsQuote
      ? roundQuoteNotional(numQuantity)
      : roundQuoteNotional(numPrice * baseQty);

    if (!skipPriceTick) {
      const pricePrecisionVal = getDecimalPlaces(tick_size);
      const priceMultiplier = Math.pow(10, pricePrecisionVal);
      if (Math.round(numPrice * priceMultiplier) % Math.round(tick_size * priceMultiplier) !== 0) {
        showError(`Price must be a multiple of ${tick_size}`);
        return false;
      }
    }

    const qtyPrecision = getDecimalPlaces(step_size);
    const qtyMultiplier = Math.pow(10, qtyPrecision);
    if (Math.round(baseQty * qtyMultiplier) % Math.round(step_size * qtyMultiplier) !== 0) {
      showError(`Quantity must be a multiple of ${step_size}`);
      return false;
    }

    if (baseQty > max_order_qty) {
      showError(`Maximum order quantity is ${max_order_qty} ${currencyData?.base_currency}`);
      return false;
    }

    if (!Number.isFinite(minCheckTotal) || minCheckTotal < min_notional - 0.001) {
      showError(`Minimum order value is ${min_notional} ${currencyData?.quote_currency}`);
      return false;
    }

    if (headerTab !== "Margin") {
      if (side === "BUY") {
        const availableBalance = coinBalance?.quote_currency_balance || 0;
        let spend;
        if (amountIsQuote) {
          spend = numQuantity;
        } else if (orderKind === "MARKET" || orderKind === "STOP_MARKET") {
          spend = baseQty * numPrice * 1.02;
        } else {
          spend = baseQty * numPrice;
        }
        if (spend > availableBalance) {
          showError("Insufficient funds");
          return false;
        }
      } else if (side === "SELL") {
        const availableBalance = coinBalance?.base_currency_balance || 0;
        if (baseQty > availableBalance) {
          showError("Insufficient funds");
          return false;
        }
      }
    }

    return true;
  };

  const formatTotal = (value) => {
    const precision = getPricePrecision();
    const finalValue = value?.toFixed(precision)?.replace(/\.?0+$/, "");
    let formattedNum = finalValue?.toString();
    let result = formattedNum?.replace(/^0\.0*/, "");
    const decimalPart = finalValue?.toString()?.split(".")[1];
    if (!decimalPart) return finalValue;
    let zeroCount = 0;
    for (let char of decimalPart) {
      if (char === "0") zeroCount++;
      else break;
    }
    if (zeroCount > 4) return `0.0{${zeroCount}}${result}`;
    if (value < 1e-7) return `0.0{${zeroCount}}${result}`;
    return finalValue;
  };

  const isValidPriceInput = (value) => {
    const valueClean = String(value).replace(/,/g, "");
    if (valueClean === "" || valueClean === "0") return true;
    const tickSize = currencyData?.tick_size || 0.01;
    const pricePrec = getPricePrecision();
    const regex = new RegExp(`^\\d*\\.?\\d{0,${pricePrec}}$`);
    if (!regex.test(valueClean)) return false;
    if (valueClean.endsWith(".")) return true;
    const numValue = parsePriceNum(valueClean);
    if (isNaN(numValue)) return false;
    if (numValue === 0) return true;
    return numValue >= tickSize;
  };

  const handlePriceInput = (value, setter) => {
    if (isValidPriceInput(value)) setter(value);
  };

  const handlePriceBlur = (value, setter) => {
    if (value === "" || value === "0" || value === "0.") {
      setter("");
      return;
    }
    const tickSize = currencyData?.tick_size || 0.01;
    const numValue = parsePriceNum(value);
    if (isNaN(numValue) || numValue === 0) {
      setter("");
      return;
    }
    if (numValue < tickSize) {
      setter(tickSize.toString());
      return;
    }
    const rounded = Math.round(numValue / tickSize) * tickSize;
    const prec = getPricePrecision();
    setter(parseFloat(rounded.toFixed(prec)).toString());
  };

  const isValidQuantityInput = (value) => {
    if (value === "" || value === "0") return true;
    const qtyPrec = getQuantityPrecision();
    const regex = new RegExp(`^\\d*\\.?\\d{0,${qtyPrec}}$`);
    return regex.test(value);
  };

  const handleQuantityInput = (value, setter) => {
    if (isValidQuantityInput(value)) setter(value);
  };

  const handleQuantityBlur = (value, setter) => {
    if (value === "" || value === "0" || value === "0.") {
      setter("");
      return;
    }
    const stepSize = currencyData?.step_size || 0.00001;
    const numValue = parseOrderQty(value);
    if (isNaN(numValue) || numValue === 0) {
      setter("");
      return;
    }
    if (numValue < stepSize) {
      setter(stepSize.toString());
      return;
    }
    setter(String(snapQtyToStep(numValue, "round")));
  };

  const tickSize = currencyData?.tick_size || 0.01;
  const stepSize = currencyData?.step_size || 0.00001;
  const handlePriceStep = (delta) => {
    const current = parsePriceNum(price || buy_price || "0") || 0;
    const next = Math.max(0, current + delta * tickSize);
    const prec = getPricePrecision();
    const val = parseFloat(next.toFixed(prec)).toString();
    setPrice(val);
  };
  const handleAmountStep = (delta) => {
    const current = parseOrderQty(amount || "0") || 0;
    const next = Math.max(0, current + delta * stepSize);
    const val = String(snapQtyToStep(next, "round"));
    syncAmountAnimForQuantityString(val);
    setAmount(val);
  };

  const handleStopPriceStep = (delta) => {
    const current = parsePriceNum(stopPrice || buy_price || "0") || 0;
    const next = Math.max(0, current + delta * tickSize);
    const prec = getPricePrecision();
    const val = parseFloat(next.toFixed(prec)).toString();
    syncStopAnimForPriceString(val);
    setStopPrice(val);
  };

  const handleQty = (text) => {
    handleQuantityInput(text, setAmount);
    setActivePercentage(0);
    Animated.timing(totalAnim, {
      toValue: text.trim() !== "" ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    if (isBuy && _balance) {
      setBalance(_balance?.quote_currency_balance);
    } else {
      setBalance(_balance?.base_currency_balance);
    }
    setActivePercentage(0);
  }, [isBuy, _balance]);

  const handleTotalPercentage = (value) => {
    setActivePercentage(value);

    let balToUse = 0;
    const refPx = (!isMarketLikeOrder ? parsePriceNum(price) : parsePriceNum(buy_price)) || 0;

    if (headerTab === "Margin") {
      const leverage = parseInt(marginLeverage, 10) || 5;
      const Qf = Number(coinBalance?.quote_currency_balance) || 0;
      const Bf = Number(coinBalance?.base_currency_balance) || 0;
      const Qb = Number(coinBalance?.quote_currency_borrowed) || 0;
      const Bb = Number(coinBalance?.base_currency_borrowed) || 0;
      const socketNetEquity = coinBalance?.net_equity != null ? Number(coinBalance.net_equity) : null;
      const netEquity = (socketNetEquity != null && Number.isFinite(socketNetEquity) && socketNetEquity >= 0)
        ? socketNetEquity
        : Math.max(0, (Qf - Qb) + (Bf - Bb) * refPx);

      const qCap = coinBalance?.quote_remaining_capacity != null ? Number(coinBalance.quote_remaining_capacity) : null;
      const bCap = coinBalance?.base_remaining_capacity != null ? Number(coinBalance.base_remaining_capacity) : null;

      const maxLeverage = (marginMode === "Cross" ? crossAccount?.max_leverage : null) ?? currencyData?.margin_config?.max_leverage ?? 10;
      const L = leverage;
      const M = Number(maxLeverage);

      const crossMarginMaxAtLeverage = (available, maxAtMaxLeverage) => {
        const avail = Number(available);
        const maxAtMax = Number(maxAtMaxLeverage);
        if (!Number.isFinite(avail) || avail < 0) return 0;
        if (!Number.isFinite(maxAtMax) || maxAtMax <= 0) return Math.max(0, avail);
        if (!Number.isFinite(L) || L <= 0) return Math.max(0, avail);
        if (!Number.isFinite(M) || M <= 1) return Math.max(0, Math.min(maxAtMax, avail));
        if (L >= M) return Math.max(0, maxAtMax);
        if (L <= 1) return Math.max(0, avail);

        const borrowable = Math.max(0, maxAtMax - avail);
        return Math.max(0, avail + borrowable * ((L - 1) / (M - 1)));
      };

      const isCross = marginMode === "Cross";

      const quoteAvailable = isCross
        ? ((coinBalance?.buy?.available != null || coinBalance?.buy_available != null)
          ? Number(coinBalance?.buy?.available ?? coinBalance?.buy_available)
          : netEquity)
        : Math.max(0, Qf);

      const baseAvailable = isCross
        ? ((coinBalance?.sell?.available != null || coinBalance?.sell_available != null)
          ? Number(coinBalance?.sell?.available ?? coinBalance?.sell_available)
          : Math.max(0, Bf - Bb))
        : Math.max(0, Bf);

      const grossQuoteMax = netEquity * leverage;
      const localQuoteMax = qCap != null && Number.isFinite(qCap) ? Math.min(grossQuoteMax, qCap + Qf) : grossQuoteMax;

      const quoteMax = isCross
        ? ((coinBalance?.buy?.max != null || coinBalance?.buy_max != null)
          ? crossMarginMaxAtLeverage(quoteAvailable, Number(coinBalance?.buy?.max ?? coinBalance?.buy_max))
          : localQuoteMax)
        : Math.max(0, Qf * leverage);

      const grossSellMax = refPx > 0 ? grossQuoteMax / refPx : 0;
      const localBaseMax = bCap != null && Number.isFinite(bCap) ? Math.min(grossSellMax, bCap) : grossSellMax;

      const baseMax = isCross
        ? ((coinBalance?.sell?.max != null || coinBalance?.sell_max != null)
          ? crossMarginMaxAtLeverage(baseAvailable, Number(coinBalance?.sell?.max ?? coinBalance?.sell_max))
          : localBaseMax)
        : Math.max(0, Bf * leverage);

      if (isBuy) {
        balToUse = Math.max(0, quoteMax);
      } else {
        balToUse = Math.max(0, baseMax);
      }
    } else {
      balToUse = isBuy
        ? (coinBalance?.quote_currency_balance || 0)
        : (coinBalance?.base_currency_balance || 0);
    }

    const val = percentCalculation(balToUse, value);

    if (showAmtDenomSelect && amtDenom === "QUOTE") {
      if (isBuy) {
        const amtStr = val.toString();
        syncAmountAnimForQuantityString(amtStr);
        setAmount(amtStr);
        Animated.timing(totalAnim, {
          toValue: amtStr.trim() !== "" ? 1 : 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
      } else {
        const refPx = (!isMarketLikeOrder ? parsePriceNum(price) : parsePriceNum(buy_price)) || 0;
        const quoteAmt = toFixed8(val * refPx);
        const amtStr = quoteAmt.toString();
        syncAmountAnimForQuantityString(amtStr);
        setAmount(amtStr);
      }
    } else {
      if (isBuy) {
        const refPx = (!isMarketLikeOrder ? parsePriceNum(price) : parsePriceNum(buy_price)) || 0;
        const finalQuantity = refPx > 0 ? toFixed8(val / refPx) : 0;
        const amtStr = finalQuantity.toString() || "0";
        syncAmountAnimForQuantityString(amtStr);
        setAmount(amtStr);
        Animated.timing(totalAnim, {
          toValue: amtStr.trim() !== "" ? 1 : 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
      } else {
        const finalQuantity = toFixed8(val);
        const amtStr = finalQuantity.toString() || "0";
        syncAmountAnimForQuantityString(amtStr);
        setAmount(amtStr);
      }
    }
  };

  const handleTotal = (text) => {
    setTotal(text);
    const refPx = (!isMarketLikeOrder ? parsePriceNum(price) : parsePriceNum(buy_price)) || 0;
    if (refPx > 0) {
      const val = parseOrderQty(text);
      if (Number.isFinite(val) && val > 0) {
        const qty = ceilQuantityToStep(val / refPx);
        const qStr = String(qty);
        syncAmountAnimForQuantityString(qStr);
        setAmount(qStr);
      } else if (!text || text === "0") {
        syncAmountAnimForQuantityString("");
        setAmount("");
      }
    }
  };

  const selectNumberLimitOn = (item) => {
    setNumberLimit(item.name);
    setIsOrderTypeModalVisible(false);
    rbSheetlimit?.current?.close();
  };

  const orderTypeSheetHeight = Math.min(540, WindowHeight * 0.58);

  const renderOrderTypeSheet = () => {
    const lime = themeColors.spotTradeBuy ?? colors.spotTradeBuy ?? colors.buyBtnGreen;
    const renderRow = (item) => {
      const selected = numberSelectLimit === item.name;
      return (
        <TouchableOpacity
          key={item.name}
          activeOpacity={0.75}
          onPress={() => selectNumberLimitOn({ name: item.name })}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 14,
            paddingHorizontal: 4,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: themeColors.themeBorderColor,
          }}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: isDark ? colors.themeElevationColor : colors.newThemeColor,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FastImage source={item.icon} tintColor={colors.white} style={{ width: 16, height: 16 }} resizeMode="contain" />
          </View>
          <View style={{ flex: 1, marginLeft: 12, paddingRight: 8 }}>
            <AppText weight={SEMI_BOLD} style={{ color: themeColors.text, fontSize: 14, marginBottom: 3 }}>
              {item.name}
            </AppText>
            <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, fontSize: 11, lineHeight: 15 }}>
              {item.description}
            </AppText>
          </View>
          {selected ? (
            <View style={{ width: 16, height: 16, borderRadius: 10, backgroundColor: isDark ? colors.white : colors.black, alignItems: "center", justifyContent: "center" }}>
              <FastImage source={tick} style={{ width: 8, height: 8 }} tintColor={isDark ? colors.black : colors.white} resizeMode="contain" />
            </View>
          ) : (
            <View style={{ width: 26 }} />
          )}
        </TouchableOpacity>
      );
    };

    const sectionInfo = (title, body) => {
      Alert.alert(title, body);
    };

    return (
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 14,
            marginBottom: 4,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: themeColors.themeBorderColor,
          }}
        >
          <AppText weight={SEMI_BOLD} style={{ fontSize: 16, color: themeColors.text }}>
            Order Type
          </AppText>
          <TouchableOpacity
            onPress={() => {
              setIsOrderTypeModalVisible(false);
              rbSheetlimit?.current?.close();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: themeColors.themeElevationColor,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: themeColors.themeBorderColor,
            }}
          >
            <FastImage source={REMOVE} style={{ width: 18, height: 18 }} resizeMode="contain" tintColor={isDark ? colors.white : colors.black} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, marginBottom: 6 }}>
            <AppText weight={SEMI_BOLD} style={{ fontSize: 13, color: themeColors.text }}>
              Basic
            </AppText>
            <TouchableOpacity
              onPress={() =>
                sectionInfo(
                  "Basic order types",
                  "Limit: your order rests on the book at a set price.\n\nMarket: fill immediately at the best available prices."
                )
              }
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ marginLeft: 4, top: 2 }}
            >
              <FastImage source={INFO} style={{ width: 12, height: 12 }} resizeMode="contain" tintColor={isDark ? colors.white : colors.black} />
            </TouchableOpacity>
          </View>
          {ORDER_TYPE_SHEET_BASIC.map(renderRow)}

          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 18, marginBottom: 6 }}>
            <AppText weight={SEMI_BOLD} style={{ fontSize: 14, color: themeColors.text }}>
              Advanced
            </AppText>
            <TouchableOpacity
              onPress={() =>
                sectionInfo(
                  "Advanced (Spot)",
                  "Spot Limit: after your stop is hit, a limit order is placed.\n\nSpot Market: after your stop is hit, a market order runs at the best price."
                )
              }
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                marginLeft: 4, top: 2,
              }}
            >
              <FastImage source={INFO} style={{ width: 12, height: 12 }} tintColor={isDark ? colors.white : colors.black} resizeMode="contain" />
            </TouchableOpacity>
          </View>
          {ORDER_TYPE_SHEET_ADVANCED.map(renderRow)}
        </ScrollView>
      </View>
    );
  };



  const validateStopTriggerPrice = useCallback(
    (rawStop) => {
      const tick_size = currencyData?.tick_size || 0.01;
      const numPrice = parsePriceNum(rawStop);
      if (!Number.isFinite(numPrice) || numPrice <= 0) {
        showError("Enter a valid stop price");
        return false;
      }
      const pricePrecisionVal = getDecimalPlaces(tick_size);
      const priceMultiplier = Math.pow(10, pricePrecisionVal);
      if (Math.round(numPrice * priceMultiplier) % Math.round(tick_size * priceMultiplier) !== 0) {
        showError(`Stop price must be a multiple of ${tick_size}`);
        return false;
      }
      return true;
    },
    [currencyData?.tick_size]
  );

  const buildSpotOrderPayload = useCallback(() => {
    const refPrice = parsePriceNum(buy_price) || 0;
    const limitFromUi =
      price !== undefined && price !== null && String(price).trim() !== ""
        ? parsePriceNum(price)
        : refPrice;
    const orderPriceForValidation =
      spotOrderType === "MARKET" || spotOrderType === "STOP_MARKET" ? refPrice : limitFromUi;
    const orderPriceForApi = orderPriceForValidation;
    const stopPxRaw = stopPrice !== undefined && stopPrice !== null && String(stopPrice).trim() !== ""
      ? stopPrice
      : buy_price;
    const baseSym = String(base_currency ?? "").trim().toUpperCase();
    const quoteSym = String(quote_currency ?? "").trim().toUpperCase();
    const pair = baseSym && quoteSym ? `${baseSym}${quoteSym}` : "";

    const amtNum = parseOrderQty(amount);
    let baseQty = Number.isFinite(amtNum) && amtNum > 0 ? snapQtyToStep(amtNum, "floor") : 0;
    if (showAmtDenomSelect && amtDenom === "QUOTE") {
      const refPx = orderPriceForValidation || parsePriceNum(buy_price) || 0;
      if (refPx > 0 && Number.isFinite(amtNum) && amtNum > 0) {
        baseQty = ceilQuantityToStep(amtNum / refPx);
      } else {
        baseQty = 0;
      }
    }

    const data = {
      pair,
      type: spotOrderType,
      side: isBuy ? "BUY" : "SELL",
      quantity: String(baseQty),
    };
    if (spotOrderType === "LIMIT" || spotOrderType === "STOP_LIMIT") {
      data.price = String(orderPriceForApi);
    }
    if (spotOrderType === "STOP_LIMIT" || spotOrderType === "STOP_MARKET") {
      data.stop_price = String(stopPxRaw);
    }
    if ((spotOrderType === "LIMIT" || spotOrderType === "STOP_LIMIT") && (limitFok || limitIoc)) {
      data.time_in_force = limitFok ? "FOK" : "IOC";
    }
    if ((spotOrderType === "MARKET" || spotOrderType === "STOP_MARKET") && slippageEnabled && !slippageError) {
      const raw = String(slippagePct ?? "").trim();
      const n = parseFloat(raw);
      if (Number.isFinite(n) && n > 0) {
        data.max_slippage_percent = n;
      }
    }
    if (headerTab === "Margin") {
      data.tradeType = marginMode === "Cross" ? "cross" : "margin";
    }

    return { data, orderPriceForValidation };
  }, [
    amount,
    amtDenom,
    showAmtDenomSelect,
    base_currency,
    buy_price,
    isBuy,
    limitFok,
    limitIoc,
    price,
    quote_currency,
    slippageEnabled,
    slippageError,
    slippagePct,
    spotOrderType,
    stopPrice,
    headerTab,
    marginMode,
  ]);

  const onSubmit = async () => {
    if (userData && Number(userData?.kycVerified) !== 2) {
      showError("KYC not verified. Please complete KYC first.");
      return;
    }

    if ((spotOrderType === "MARKET" || spotOrderType === "STOP_MARKET") && slippageEnabled && slippageError) {
      showError(slippageError);
      return;
    }

    const { data, orderPriceForValidation } = buildSpotOrderPayload();
    if (!data.pair) {
      showError("Select a trading pair");
      return;
    }
    if (headerTab === "Margin" && !dontShowMarginConfirm) {
      setMarginConfirmPayload(data);
      rbSheetMarginConfirm.current?.open();
      return;
    }

    const amountIsQuote = showAmtDenomSelect && amtDenom === "QUOTE";

    if (spotOrderType === "STOP_LIMIT" || spotOrderType === "STOP_MARKET") {
      if (!validateStopTriggerPrice(stopPrice !== "" ? stopPrice : buy_price)) {
        return;
      }
    }
    if (!validateOrder(orderPriceForValidation, amount, isBuy ? "BUY" : "SELL", spotOrderType, amountIsQuote)) {
      return;
    }

    setIsPlacingOrder(true);
    try {
      const res = await dispatch(placeOrder(data));
      if (res?.success) {
        lastOrderPlacedTimeRef.current = Date.now();
        amountAnim.setValue(0);
        totalAnim.setValue(0);
        setAmount("");
        setTotal("");
        setActivePercentage(0);

        setTimeout(() => {
          fetchSpotOpenOrdersTab(true);
          if (mountedOrdersTab === 2) fetchSpotOrderHistoryTab(true);
          if (mountedOrdersTab === 3) fetchSpotTradeHistoryTab(true);
        }, 350);
      }
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleConfirmMarginOrder = async () => {
    rbSheetMarginConfirm.current?.close();
    if (!marginConfirmPayload) return;

    const { orderPriceForValidation } = buildSpotOrderPayload();
    const amountIsQuote = showAmtDenomSelect && amtDenom === "QUOTE";

    if (spotOrderType === "STOP_LIMIT" || spotOrderType === "STOP_MARKET") {
      if (!validateStopTriggerPrice(stopPrice !== "" ? stopPrice : buy_price)) {
        return;
      }
    }
    if (!validateOrder(orderPriceForValidation, amount, isBuy ? "BUY" : "SELL", spotOrderType, amountIsQuote)) {
      return;
    }

    setIsPlacingOrder(true);
    try {
      const res = await dispatch(placeOrder(marginConfirmPayload));
      if (res?.success) {
        lastOrderPlacedTimeRef.current = Date.now();
        amountAnim.setValue(0);
        totalAnim.setValue(0);
        setAmount("");
        setTotal("");
        setActivePercentage(0);

        setTimeout(() => {
          fetchSpotOpenOrdersTab(true);
          if (mountedOrdersTab === 2) fetchSpotOrderHistoryTab(true);
          if (mountedOrdersTab === 3) fetchSpotTradeHistoryTab(true);
        }, 350);
      }
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const renderMarginConfirmSheet = () => {
    if (!marginConfirmPayload) return null;
    const { side, type, price: orderPrice, quantity, stop_price } = marginConfirmPayload;

    // Derived display values
    const isBuyMode = side === "BUY";
    const orderTypeLabel = type === "MARKET" ? "MARKET" : type === "LIMIT" ? "LIMIT" : type === "STOP_LIMIT" ? "STOP LIMIT" : "STOP MARKET";
    const displayPrice = type === "MARKET" || type === "STOP_MARKET" ? "Market" : orderPrice;
    const baseAsset = currencyData?.base_currency || "BTC";

    return (
      <View style={{ flex: 1, paddingTop: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, }}>
          <AppText style={{ color: themeColors.text, fontSize: 18 }} weight={BOLD}>Order Confirmation</AppText>
          <TouchableOpacity onPress={() => rbSheetMarginConfirm.current?.close()}>
            <FastImage source={REMOVE} style={{ width: 20, height: 20 }} tintColor={themeColors.iconColor} />
          </TouchableOpacity>
        </View>

        <View style={{
          flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15,
          paddingHorizontal: 10
        }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {!!currencyData?.icon_path && (
              <FastImage
                source={{ uri: `${IMAGE_BASE_URL}${currencyData.icon_path}` }}
                style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }}
              />
            )}
            <AppText style={{ color: themeColors.text, fontSize: 18 }} weight={BOLD}>{currencyData?.base_currency}/{currencyData?.quote_currency}</AppText>
          </View>
          <View style={{ backgroundColor: isBuyMode ? themeColors.spotTradeBuy || colors.green : themeColors.spotTradeSell || colors.red, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4 }}>
            <AppText style={{ color: colors.white, fontSize: 12 }} weight={SEMI_BOLD}>{isBuyMode ? "Buy" : "Sell"}</AppText>
          </View>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15, paddingHorizontal: 10 }}>
          <AppText style={{ color: themeColors.secondaryText, fontSize: 14 }}>Order Type</AppText>
          <AppText style={{ color: themeColors.text, fontSize: 14 }} weight={SEMI_BOLD}>{orderTypeLabel}</AppText>
        </View>

        {type.startsWith("STOP_") && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15, paddingHorizontal: 10 }}>
            <AppText style={{ color: themeColors.secondaryText, fontSize: 14 }}>Stop Price</AppText>
            <AppText style={{ color: themeColors.text, fontSize: 14 }} weight={SEMI_BOLD}>{stop_price}</AppText>
          </View>
        )}

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15, paddingHorizontal: 10 }}>
          <AppText style={{ color: themeColors.secondaryText, fontSize: 14 }}>Price</AppText>
          <AppText style={{ color: themeColors.text, fontSize: 14 }} weight={SEMI_BOLD}>{displayPrice}</AppText>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15, paddingHorizontal: 10 }}>
          <AppText style={{ color: themeColors.secondaryText, fontSize: 14 }}>Amount</AppText>
          <AppText style={{ color: themeColors.text, fontSize: 14 }} weight={SEMI_BOLD}>{quantity} {baseAsset}</AppText>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 20, paddingHorizontal: 10 }}>
          <AppText style={{ color: themeColors.secondaryText, fontSize: 14 }}>Leverage</AppText>
          <AppText style={{ color: themeColors.text, fontSize: 14 }} weight={SEMI_BOLD}>
            {String(marginLeverage).endsWith("x") ? marginLeverage : `${marginLeverage}x`}
          </AppText>
        </View>

        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", marginBottom: 30, paddingHorizontal: 10 }}
          onPress={() => setDontShowMarginConfirm(!dontShowMarginConfirm)}
        >
          <View style={{ width: 18, height: 18, borderWidth: 1, borderColor: dontShowMarginConfirm ? (themeColors.spotTradeBuy || colors.green) : themeColors.secondaryText, borderRadius: 3, justifyContent: "center", alignItems: "center", marginRight: 10, backgroundColor: dontShowMarginConfirm ? (themeColors.spotTradeBuy || colors.green) : 'transparent' }}>
            {dontShowMarginConfirm && <FastImage source={checkIc} style={{ width: 12, height: 12 }} tintColor={colors.white} />}
          </View>
          <AppText style={{ color: themeColors.secondaryText, fontSize: 14 }}>Don't show confirmation for future orders</AppText>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: isDark ? "#2a2d35" : "#f3f4f6", paddingVertical: 14, borderRadius: 8, alignItems: "center", marginRight: 10 }}
            onPress={() => rbSheetMarginConfirm.current?.close()}
          >
            <AppText style={{ color: themeColors.text, fontSize: 16 }} weight={SEMI_BOLD}>Cancel</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: isBuyMode ? themeColors.spotTradeBuy || colors.green : themeColors.spotTradeSell || colors.red, paddingVertical: 14, borderRadius: 8, alignItems: "center", marginLeft: 10 }}
            onPress={handleConfirmMarginOrder}
          >
            <AppText style={{ color: colors.white, fontSize: 16 }} weight={SEMI_BOLD}>Confirm {isBuyMode ? "Buy" : "Sell"}</AppText>
          </TouchableOpacity>
        </View>

      </View>
    );
  };

  const selectNumber = (item) => {
    setNumberSelect(item.label);
  };
  const renderNumber = () => {
    return Data?.map((item) => {
      return (
        <TouchableOpacity
          activeOpacity={0.5}
          onPress={() => selectNumber(item)}
          style={[styles.selectContainer, { paddingVertical: 12, height: 'auto' }]}
        >
          <AppText style={{ color: themeColors.text, fontSize: 14 }}>{item.label}</AppText>
          {numberSelect == item.label ? (
            <FastImage
              source={checkIc}
              tintColor={themeColors.green}
              resizeMode="stretch"
              style={styles.checkImage}
            />
          ) : (
            <></>
          )}
        </TouchableOpacity>
      );
    });
  };

  const normalizePairSymbol = useCallback((v) => {
    if (v == null) return "";
    const s = String(v).trim();
    return s && s.toLowerCase() !== "undefined" && s.toLowerCase() !== "null" ? s : "";
  }, []);

  const getOrderStatusRaw = useCallback((inv) => {
    return (
      inv?.status ??
      inv?.order_status ??
      inv?.orderStatus ??
      inv?.state ??
      inv?.status_text ??
      inv?.statusText ??
      ""
    );
  }, []);

  const getOrderStatusLabel = useCallback((inv) => {
    const raw = getOrderStatusRaw(inv);
    const status = String(raw || "").toUpperCase().trim();
    if (!status) return "---";
    if (["FILLED", "COMPLETE", "COMPLETED", "EXECUTED"].includes(status)) return "EXECUTED";
    if (["CANCELLED", "CANCELED"].includes(status)) return "Cancelled";
    if (status === "REJECTED") return "Rejected";
    if (status === "EXPIRED") return "Expired";
    if (["OPEN", "PENDING"].includes(status)) return "Open";
    if (["PARTIAL", "PARTIALLY_FILLED", "PARTIAL_FILLED"].includes(status)) return "Partial";
    return String(raw);
  }, [getOrderStatusRaw]);

  const getBaseCoinIconUri = useCallback((inv) => {
    const uri =
      inv?.base_currency_image ??
      inv?.base_currency_icon ??
      inv?.base_currency_logo ??
      inv?.baseCurrencyImage ??
      inv?.baseCurrencyIcon ??
      currencyData?.base_currency_image ??
      currencyData?.base_currency_icon ??
      currencyData?.base_currency_logo ??
      null;
    return typeof uri === "string" && uri.length > 0 ? uri : null;
  }, [currencyData]);

  const buildCurrencyPairText = useCallback((inv) => {
    const base =
      normalizePairSymbol(inv?.base_currency_short_name) ||
      normalizePairSymbol(inv?.ask_currency) ||
      normalizePairSymbol(inv?.base_currency) ||
      normalizePairSymbol(inv?.base_currency_name) ||
      normalizePairSymbol(base_currency);
    const quote =
      normalizePairSymbol(inv?.quote_currency_short_name) ||
      normalizePairSymbol(inv?.pay_currency) ||
      normalizePairSymbol(inv?.quote_currency) ||
      normalizePairSymbol(inv?.quote_currency_name) ||
      normalizePairSymbol(quote_currency);
    if (!base || !quote) return `${base || "-"} / ${quote || "-"}`;
    return `${base}/${quote}`;
  }, [base_currency, quote_currency, normalizePairSymbol]);

  // Stable keyExtractors for order FlatLists (avoid inline functions)
  // Prefer stable keys (avoid index fallback -> remounts on sort/filter)
  const openOrderKeyExtractor = useCallback((item, idx) => {
    const id = getStableId(item);
    return id ? `open_${id}` : `open_idx_${idx}`;
  }, []);
  const pastOrderKeyExtractor = useCallback((item, idx) => {
    const id = getStableId(item);
    const t = item?.created_at ?? item?.createdAt ?? item?.updated_at ?? item?.updatedAt;
    return id ? `past_${id}` : `past_${t ?? "na"}_${idx}`;
  }, []);

  // Memoize filtered open orders for better performance
  const filteredOpenOrders = useMemo(() => {
    if (!openOrders?.length) return [];
    let filtered = openOrders.filter((item) => {
      const orderId = getStableId(item);
      if (orderId && cancelledOrderIds.has(orderId)) {
        return false;
      }
      const statusRaw = getOrderStatusRaw(item);
      const s = String(statusRaw || "").toUpperCase().trim();
      if (["FILLED", "CANCELLED", "CANCELED", "COMPLETED", "EXECUTED", "REJECTED", "EXPIRED"].includes(s)) {
        return false;
      }
      const type = String(item?.type || item?.order_type || item?.orderType || "").toUpperCase();
      const qty = parseFloat(item?.quantity ?? item?.amount ?? 0) || 0;
      const filled = parseFloat(item?.filled_quantity ?? item?.filled ?? item?.executedQty ?? 0) || 0;
      if (type === "MARKET" && (qty > 0 && filled >= qty)) {
        return false;
      }
      return matchesOpenOrderKind(item, openOrderKindTab);
    });
    if (orderFilter !== "All") {
      filtered = filtered.filter((item) => item?.side === orderFilter);
    }
    return [...filtered].sort((a, b) => {
      const tsA = new Date(a?.updatedAt || a?.updated_at || a?.createdAt || a?.created_at || a?.date || a?.timestamp || 0).getTime() || 0;
      const tsB = new Date(b?.updatedAt || b?.updated_at || b?.createdAt || b?.created_at || b?.date || b?.timestamp || 0).getTime() || 0;
      if (tsB !== tsA) return tsB - tsA;
      const idA = getStableId(a);
      const idB = getStableId(b);
      return idB.localeCompare(idA);
    });
  }, [openOrders, orderFilter, openOrderKindTab, getOrderStatusRaw, cancelledOrderIds]);

  const pastOrdersNormalized = useMemo(() => {
    if (!Array.isArray(pastOrders)) return [];

    // Web uses dedupeSpotHistoryById and normalizeSpotOrderHistoryApiItemForTrade
    const items = pastOrders.map(raw => {
      const id = raw._id || raw.id || raw.order_id || raw.client_order_id;
      if (!id) return null;

      const parseNumVal = (v) => {
        if (v != null && typeof v === 'object' && v.$numberDecimal != null) return parseFloat(v.$numberDecimal);
        return v !== undefined && v !== null ? parseFloat(v) : undefined;
      };

      // Ensure executions (executed_prices) are present
      const executions = Array.isArray(raw.executions) ? raw.executions : (Array.isArray(raw.executed_prices) ? raw.executed_prices : []);
      const executed_prices = executions.map((ex) => {
        const p = parseNumVal(ex?.price ?? ex?.execution_price);
        const q = parseNumVal(ex?.quantity ?? ex?.filled_quantity);
        const f = parseNumVal(ex?.fee ?? "0");
        return {
          price: p,
          quantity: q,
          fee: f,
        };
      });

      const qty = parseNumVal(raw.quantity) ?? 0;
      const filled = parseNumVal(raw.filled_quantity ?? raw.filled) ?? 0;
      const remaining = parseNumVal(raw.remaining_quantity ?? raw.remaining) ?? Math.max(0, qty - filled);

      const avgExecutionPrice = parseNumVal(raw.avg_execution_price ?? raw.avgPrice ?? raw.average_price);
      const executedValue = parseNumVal(raw.executed_value ?? raw.executedValue) ?? ((avgExecutionPrice || 0) * filled);

      return {
        ...raw,
        _id: id,
        side: String(raw.side || "").toUpperCase(),
        type: raw.type ?? raw.order_type ?? raw.orderType,
        order_type: raw.order_type ?? raw.type ?? raw.orderType,
        orderType: raw.orderType ?? raw.order_type ?? raw.type,
        user_status: raw.user_status ?? raw.status,
        status: raw.status,
        quantity: qty,
        remaining_quantity: remaining,
        filled_quantity: filled,
        avg_execution_price: avgExecutionPrice,
        executed_value: executedValue,
        price: parseNumVal(raw.price ?? raw.limit_price ?? raw.stop_price ?? raw.trigger_price),
        time_in_force: raw.time_in_force || raw.tif || raw.timeInForce,
        tif: raw.tif || raw.time_in_force || raw.timeInForce,
        fill_percent: raw.fill_percent ?? raw.fillPercent ?? (qty > 0 ? `${Math.round((filled / qty) * 100)}%` : "0%"),
        executed_prices: executed_prices.length > 0 ? executed_prices : undefined,
        pair: raw.pair,
        ask_currency: raw.ask_currency,
        pay_currency: raw.pay_currency,
        total_fee: parseNumVal(raw.total_fee ?? raw.fee),

        total_tds: raw.total_tds ?? raw.tds,
        updatedAt: raw.updatedAt || raw.updated_at || raw.created_at || raw.createdAt,
        createdAt: raw.createdAt || raw.created_at || raw.updatedAt || raw.updated_at,
      };
    }).filter(Boolean);

    return dedupeSpotOrderHistoryRows(items).sort((a, b) => {
      const dateA = new Date(a?.created_at || a?.createdAt || a?.updated_at || a?.updatedAt || 0).getTime();
      const dateB = new Date(b?.created_at || b?.createdAt || b?.updated_at || b?.updatedAt || 0).getTime();
      return dateB - dateA;
    });
  }, [pastOrders]);

  const filteredPastOrders = useMemo(() => {
    if (!pastOrdersNormalized?.length) return [];
    if (pastOrderFilter === "All") return pastOrdersNormalized;
    const filtered = pastOrdersNormalized.filter((item) => item?.side === pastOrderFilter);
    return filtered.sort((a, b) => {
      const dateA = new Date(a?.created_at || a?.createdAt || a?.updated_at || a?.updatedAt || 0).getTime();
      const dateB = new Date(b?.created_at || b?.createdAt || b?.updated_at || b?.updatedAt || 0).getTime();
      return dateB - dateA;
    });
  }, [pastOrdersNormalized, pastOrderFilter]);

  const pastOrdersForSpotPair = useMemo(() => {
    if (!base_currency || !quote_currency || !filteredPastOrders?.length) return [];
    const b = String(base_currency).toUpperCase();
    const q = String(quote_currency).toUpperCase();
    return filteredPastOrders.filter((item) => spotPastOrderMatchesScreenPair(item, b, q));
  }, [filteredPastOrders, base_currency, quote_currency]);

  const filteredMyTrades = useMemo(() => {
    if (!spotMyTrades?.length) return [];
    const list =
      tradeHistorySideFilter === "All"
        ? [...spotMyTrades]
        : spotMyTrades.filter((t) => String(t?.side || "").toUpperCase() === tradeHistorySideFilter);
    return list.sort((a, b) => {
      const ta = Date.parse(a?.executed_at || a?.executedAt || a?.created_at || "") || 0;
      const tb = Date.parse(b?.executed_at || b?.executedAt || b?.created_at || "") || 0;
      return tb - ta;
    });
  }, [spotMyTrades, tradeHistorySideFilter]);

  const tradeHistoryKeyExtractor = useCallback((item, idx) => {
    const id = item?._id ?? item?.trade_id ?? item?.id;
    const t = item?.executed_at ?? item?.executedAt ?? item?.created_at ?? item?.createdAt;
    const p = item?.price ?? item?.rate ?? item?.avg_price;
    return id ? `th_${id}` : `th_${t ?? "na"}_${p ?? "na"}_${idx}`;
  }, []);

  const tradeHistoryPreviewSlice = useMemo(
    () => filteredMyTrades.slice(0, 5),
    [filteredMyTrades],
  );

  const renderSpotOrdersEmptyState = useCallback((message = "Please login to view your orders & history") => {
    if (!userData) {
      return (
        <View style={[styles.noDataRow, { paddingVertical: 28, alignItems: "center", justifyContent: "center" }]}>
          <FastImage
            source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT}
            resizeMode="contain"
            style={{ width: 70, height: 70, marginBottom: 10 }}
          />
          <AppText style={{ color: themeColors.secondaryText, fontSize: 13, marginBottom: 12 }}>
            {message}
          </AppText>
          <TouchableOpacity
            style={{
              backgroundColor: colors.cyanTheme,
              paddingHorizontal: 22,
              paddingVertical: 8,
              borderRadius: 6,
              alignItems: "center",
            }}
            onPress={() => NavigationService.navigate(NAVIGATION_AUTH_STACK, { screen: LOGIN_SCREEN })}
          >
            <AppText weight={SEMI_BOLD} style={{ color: "#fff", fontSize: 13 }}>
              Login / Register
            </AppText>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.noDataRow}>
        <FastImage
          source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT}
          resizeMode="contain"
          style={{ width: 80, height: 80 }}
        />
      </View>
    );
  }, [userData, isDark, themeColors.secondaryText]);

  const tradeHistorySectionNode = useMemo(() => {
    if (!filteredMyTrades?.length) {
      return renderSpotOrdersEmptyState("Please login to view your trade history");
    }
    const baseHint = effectiveCurrency?.base_currency;
    const quoteHint = effectiveCurrency?.quote_currency;
    return (
      <>
        <View style={styles.scrollContent}>
          {tradeHistoryPreviewSlice.map((item, index) => {
            const mLabel = tradeHistoryMarketLabel(item, baseHint, quoteHint);
            const baseSym = tradeHistoryBaseAsset(item, baseHint, quoteHint);
            const quoteSym =
              item?.pay_currency ||
              item?.quote_currency ||
              quoteHint ||
              (mLabel.includes("/") ? mLabel.split("/")[1]?.trim() : "");
            const feeAsset = item?.fee_asset || quoteSym;
            const parseTradeNum = (val) => {
              if (val && val.$numberDecimal != null) return parseFloat(val.$numberDecimal);
              return parseFloat(val);
            };
            const priceNum = parseTradeNum(item?.price) || 0;
            const qtyNum = parseTradeNum(item?.quantity) || 0;
            const feeVal = parseTradeNum(item?.total_fee ?? item?.fee) || 0;
            const totalVal = parseTradeNum(item?.quote_quantity) || priceNum * qtyNum;
            const side = String(item?.side || "").toUpperCase();
            const role = item?.is_maker === true ? "Maker" : item?.is_maker === false ? "Taker" : "—";
            const sideColor = side === "BUY" ? themeColors.green : themeColors.red;
            const ts = item?.executed_at || item?.executedAt || item?.created_at;
            const m = moment(ts);
            const dateStr = m.isValid() ? m.format("DD/MM/YYYY") : "—";
            const timeStr = m.isValid() ? m.format("HH:mm:ss") : "—";

            return (
              <TouchableOpacity
                key={tradeHistoryKeyExtractor(item, index)}
                activeOpacity={0.85}
                onPress={() => NavigationService.navigate(SPOT_ORDER_HISTORY_DETAIL, { item })}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 0,
                  borderBottomWidth: 1,
                  borderBottomColor: themeColors.themeBorderColor,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                  <AppText style={{ color: themeColors.text }} type={FIFTEEN} weight={BOLD}>
                    {mLabel}
                  </AppText>
                  <FastImage
                    source={right_ic}
                    style={{ width: 11, height: 11, marginLeft: 4 }}
                    resizeMode="contain"
                    tintColor={themeColors.secondaryText}
                  />
                </View>
                <AppText weight={MEDIUM} type={FOURTEEN} style={{ color: themeColors.secondaryText, marginBottom: 2 }}>
                  {dateStr} {timeStr}
                </AppText>
                <AppText style={{ color: sideColor, marginBottom: 8 }} type={THIRTEEN} weight={SEMI_BOLD}>
                  {side} <AppText style={{ color: isDark ? colors.white : colors.black, marginBottom: 8 }} type={THIRTEEN} weight={SEMI_BOLD}>· {role}</AppText>
                </AppText>

                <View style={{ gap: 5 }}>
                  {/* <View style={styles.kvRow}>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Date</AppText>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, textAlign: "right", flex: 2 }} numberOfLines={3}>
                      {dateStr}
                    </AppText>
                  </View> */}
                  {/* <View style={styles.kvRow}>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Time</AppText>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, textAlign: "right", flex: 2 }} numberOfLines={3}>
                      {timeStr}
                    </AppText>
                  </View> */}
                  {/* <View style={styles.kvRow}>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Pair</AppText>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, textAlign: "right", flex: 2 }} numberOfLines={3}>
                      {mLabel}
                    </AppText>
                  </View> */}
                  {/* <View style={styles.kvRow}>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Side</AppText>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: sideColor, textAlign: "right", flex: 2 }} numberOfLines={3}>{side}</AppText>
                  </View> */}
                  {/* <View style={styles.kvRow}>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Role</AppText>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, textAlign: "right", flex: 2 }} numberOfLines={3}>
                      {role}
                    </AppText>
                  </View> */}
                  <View style={styles.kvRow}>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Price</AppText>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, textAlign: "right", flex: 2 }} numberOfLines={3}>
                      {safeToFixed8(item?.price, "—")}
                    </AppText>
                  </View>
                  <View style={styles.kvRow}>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Quantity</AppText>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, textAlign: "right", flex: 2 }} numberOfLines={3}>
                      {safeToFixed8(item?.quantity, "—")}{baseSym ? ` ${baseSym}` : ""}
                    </AppText>
                  </View>
                  <View style={styles.kvRow}>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Fee</AppText>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, textAlign: "right", flex: 2 }} numberOfLines={3}>
                      {`${safeToFixed8(feeVal)}${feeAsset ? ` ${feeAsset}` : ""}`.trim()}
                    </AppText>
                  </View>
                  <View style={styles.kvRow}>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Total</AppText>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, textAlign: "right", flex: 2 }} numberOfLines={3}>
                      {safeToFixed8(totalVal)}
                    </AppText>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        {filteredMyTrades?.length > 5 && (
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => NavigationService.navigate("Trade_History", { activeTab: 1 })}
          >
            <AppText style={[styles.viewAllText, { color: isDark ? colors.white : colors.buttonBg }]}>View More</AppText>
          </TouchableOpacity>
        )}
      </>
    );
  }, [
    filteredMyTrades,
    tradeHistoryPreviewSlice,
    tradeHistoryKeyExtractor,
    isDark,
    themeColors,
    effectiveCurrency?.base_currency,
    effectiveCurrency?.quote_currency,
    styles.scrollContent,
    styles.kvRow,
    styles.viewAllButton,
    styles.viewAllText,
    styles.noDataRow,
    colors.buttonBg,
  ]);



  // Total: when amount is 0/empty show same default price as Limit field; else amount * price
  const totalDisplayValue = useMemo(() => {
    const amt = (amount === "" || amount === undefined) ? 0 : (Number(amount) || 0);
    const effectivePrice = !isMarketLikeOrder
      ? (Number(price) || Number(buy_price) || 0)
      : (Number(buy_price) || 0);
    return amt * effectivePrice;
  }, [amount, price, buy_price, isMarketLikeOrder]);

  // Stable slice references for FlatList data (avoid new array on every render)
  const openOrdersSlice = useMemo(() => filteredOpenOrders.slice(0, 5), [filteredOpenOrders]);
  const pastOrdersSlice = useMemo(() => (pastOrdersForSpotPair ?? []).slice(0, 5), [pastOrdersForSpotPair]);

  // Get side color
  const getSideColor = useCallback((side) => {
    if (side === "BUY" || side === "buy") {
      return themeColors.green;
    }
    if (side === "SELL" || side === "sell") {
      return themeColors.red;
    }
    return themeColors.text;
  }, [themeColors]);
  /** Same UI as `tradeHistorySectionNode`; kept for any `{renderTradeHistorySection()}` call sites / bundles. */
  const renderTradeHistorySection = useCallback(
    () => tradeHistorySectionNode,
    [tradeHistorySectionNode],
  );
  /** Open orders preview — matches detail header + Date…Price only; pair row → full detail; Cancel unchanged. */
  const renderOpenOrderItem = useCallback(({ item: inv }) => {
    const currencyPair = buildCurrencyPairText(inv);
    const statusRaw = getOrderStatusRaw(inv);
    const statusUpper = String(statusRaw || "").toUpperCase().trim();
    const orderId = inv?._id || inv?.id;
    const canCancel =
      !!orderId &&
      !["FILLED", "CANCELLED", "CANCELED", "COMPLETED", "EXECUTED", "REJECTED"].includes(statusUpper);

    const priceNum = Number(inv?.price) || 0;
    const typeUpper = String(inv?.order_type || inv?.type || inv?.orderType || "MARKET").toUpperCase();
    const side = String(inv?.side || "").toUpperCase();

    const eventTs =
      inv?.updatedAt || inv?.updated_at || inv?.createdAt || inv?.created_at || inv?.date || inv?.timestamp;
    const eventM = eventTs ? moment(eventTs) : null;
    const dateStr = eventM?.isValid() ? eventM.format("DD/MM/YYYY") : "---";
    const timeStr = eventM?.isValid() ? eventM.format("HH:mm:ss") : "---";
    const headerDateTime = eventM?.isValid() ? eventM.format("DD/MM/YYYY HH:mm:ss") : "---";

    const rawTif = inv?.time_in_force ?? inv?.tif ?? inv?.timeInForce;
    const tifStr =
      rawTif != null && String(rawTif).trim() !== "" ? String(rawTif).trim().toUpperCase() : "—";

    const priceDisplay =
      String(inv?.order_type || inv?.type || "").toUpperCase() === "MARKET" ? "Market" : toFixedEight(priceNum);

    const parseNum = (val) => {
      if (val && val.$numberDecimal != null) return parseFloat(val.$numberDecimal);
      return parseFloat(val);
    };

    const price = parseNum(inv?.price) || 0;
    const avgPrice = parseNum(inv?.avg_execution_price ?? inv?.avgPrice ?? inv?.average_price) || price;
    const avgPriceDisplay = toFixedEight(avgPrice);

    const baseSym = inv?.ask_currency || inv?.base_currency || base_currency || "";
    const textColor = themeColors.text;
    const labelColor = themeColors.secondaryText;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => NavigationService.navigate(SPOT_ORDER_HISTORY_DETAIL, { item: inv })}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 0,
          borderBottomWidth: 1,
          borderBottomColor: themeColors.themeBorderColor,
        }}
      >
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
            <AppText style={{ color: textColor }} type={FIFTEEN} weight={BOLD}>
              {currencyPair}
            </AppText>
            <FastImage
              source={right_ic}
              style={{ width: 11, height: 11, marginLeft: 4 }}
              resizeMode="contain"
              tintColor={labelColor}
            />
          </View>
          <AppText weight={MEDIUM} type={FOURTEEN} style={{ color: labelColor, marginBottom: 2 }}>
            {headerDateTime}
          </AppText>
          <AppText style={{ color: getSideColor(inv?.side), marginBottom: 8 }} type={THIRTEEN} weight={SEMI_BOLD}>
            {side} · {typeUpper}
          </AppText>

          <View style={{ gap: 5 }}>
            <View style={styles.kvRow}>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Market</AppText>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor, textAlign: "right", flex: 2 }} numberOfLines={3}>{currencyPair}</AppText>
            </View>
            <View style={styles.kvRow}>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Type</AppText>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor, textAlign: "right", flex: 2 }} numberOfLines={3}>{typeUpper}</AppText>
            </View>
            <View style={styles.kvRow}>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Price</AppText>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor, textAlign: "right", flex: 2 }} numberOfLines={3}>{priceDisplay}</AppText>
            </View>
            <View style={styles.kvRow}>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Quantity</AppText>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor, textAlign: "right", flex: 2 }} numberOfLines={3}>
                {`${safeToFixed8(inv?.quantity ?? inv?.amount ?? inv?.origQty, "—")}${baseSym ? ` ${baseSym}` : ""}`}
              </AppText>
            </View>
            <View style={styles.kvRow}>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Avg Price</AppText>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor, textAlign: "right", flex: 2 }} numberOfLines={3}>
                {String(avgPriceDisplay ?? "—")}
              </AppText>
            </View>
          </View>
        </View>

        {canCancel ? (
          <View style={[styles.openOrderCardRow, { marginTop: 8, marginBottom: 4 }]}>
            <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: isDark ? "#8E8E93" : "#666666" }}>Action:</AppText>
            <TouchableOpacity
              style={styles.cancelActionBtn}
              activeOpacity={0.8}
              onPress={() => {
                setOrderToCancel(inv);
                setIsCancelModalVisible(true);
              }}
            >
              <AppText style={{ color: themeColors.red, fontWeight: "600", fontSize: 12 }}>Cancel</AppText>
            </TouchableOpacity>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  }, [themeColors, buildCurrencyPairText, getOrderStatusRaw, getSideColor, isDark, base_currency]);

  // Memoized render function for past orders - same card UI as Open Orders; tap → SPOT_ORDER_HISTORY_DETAIL with full order data
  const renderPastOrderItem = useCallback(({ item: inv, index: idx }) => {
    const orderId = inv?._id || inv?.order_id || inv?.id;
    const baseSym = inv?.ask_currency || inv?.base_currency || base_currency || "";
    const quoteSym = inv?.pay_currency || inv?.quote_currency || quote_currency || "";
    const currencyPair = (baseSym && quoteSym) ? `${baseSym}/${quoteSym}` : buildCurrencyPairText(inv);
    const quoteCc =
      normalizePairSymbol(inv?.pay_currency) ||
      normalizePairSymbol(inv?.fee_asset) ||
      normalizePairSymbol(quote_currency);


    const parseNum = (val) => {
      if (val && val.$numberDecimal != null) return parseFloat(val.$numberDecimal);
      return parseFloat(val);
    };

    const price = parseNum(inv?.price) || 0;
    const qty = parseNum(inv?.quantity) || 0;
    const filled = parseNum(inv?.filled_quantity ?? inv?.filled) || 0;
    const avgPrice = parseNum(inv?.avg_execution_price ?? inv?.avgPrice ?? inv?.average_price) || price;
    const value = parseNum(inv?.executed_value ?? inv?.executedValue) || (avgPrice * filled);
    const feeVal = parseNum(inv?.total_fee ?? inv?.fee) || 0;
    const quoteCurrency =
      inv?.pay_currency ||
      inv?.quote_currency ||
      inv?.quote_currency_short_name ||
      inv?.quote_asset ||
      (typeof currencyPair === "string" && currencyPair.includes("/") ? currencyPair.split("/")[1]?.trim() : "") ||
      "";
    const feeAsset = inv?.fee_asset || quoteCurrency;
    const totalVal = value;

    const statusRaw = getOrderStatusRaw(inv);
    const statusLabel = getOrderStatusLabel(inv);

    let statusColor = themeColors.text;
    const sStr = String(statusRaw || "").toUpperCase().trim();
    if (["FILLED", "COMPLETE", "COMPLETED", "EXECUTED"].includes(sStr)) {
      statusColor = "#00c087";
    } else if (["CANCELLED", "CANCELED", "REJECTED", "EXPIRED"].includes(sStr)) {
      statusColor = "#ff4b5c";
    } else {
      statusColor = "#f3ba2f";
    }

    const hasExecutedTrades = Array.isArray(inv?.executed_prices) && inv.executed_prices.length > 0;
    const showTrades = !!showExecutedTrades?.[orderId];

    const textColor = themeColors.text;
    const labelColor = isDark ? "#8E8E93" : "#666666";

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => NavigationService.navigate(SPOT_ORDER_HISTORY_DETAIL, { item: inv })}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 0,
          borderBottomWidth: 1,
          borderBottomColor: themeColors.themeBorderColor,
        }}
      >
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
            <AppText style={{ color: textColor }} type={FIFTEEN} weight={BOLD}>
              {currencyPair}
            </AppText>
            <FastImage
              source={right_ic}
              style={{ width: 11, height: 11, marginLeft: 4 }}
              resizeMode="contain"
              tintColor={labelColor}
            />
          </View>
          <AppText weight={MEDIUM} type={FOURTEEN} style={{ color: labelColor, marginBottom: 2 }}>
            {(() => {
              const d = inv?.updatedAt || inv?.updated_at || inv?.createdAt || inv?.created_at || inv?.date || inv?.timestamp || inv?.time;
              return d ? moment(d).format("DD/MM/YYYY HH:mm:ss") : "---";
            })()}
          </AppText>

          <AppText style={{ marginBottom: 8 }} type={THIRTEEN} weight={BOLD}>
            <AppText weight={MEDIUM} type={THIRTEEN} style={{ color: getSideColor(inv?.side) }}>
              {String(inv?.side || "").toUpperCase()}<AppText weight={MEDIUM} type={THIRTEEN} style={{ color: isDark ? "#8E8E93" : "#666666" }}> · </AppText> <AppText weight={MEDIUM} type={THIRTEEN} style={{ color: colors.white }}>{String(inv?.order_type || inv?.type || inv?.orderType || "").toUpperCase()}</AppText>
            </AppText>
            <AppText weight={MEDIUM} type={THIRTEEN} style={{ color: isDark ? "#8E8E93" : "#666666" }}> · </AppText>
            <AppText weight={MEDIUM} type={THIRTEEN} style={{ color: colors.white }}>
              {statusLabel.toUpperCase()}
            </AppText>
          </AppText>

          <View style={{ gap: 5 }}>
            <View style={styles.kvRow}>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Price</AppText>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor, textAlign: "right", flex: 2 }} numberOfLines={3}>
                {String(inv?.order_type || inv?.type || "").toUpperCase() === "MARKET" ? "Market" : safeToFixed8(inv?.price, "—")}
              </AppText>
            </View>
            <View style={styles.kvRow}>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Quantity</AppText>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor, textAlign: "right", flex: 2 }} numberOfLines={3}>
                {safeToFixed8(qty, "—")}{baseSym ? ` ${baseSym}` : ""}
              </AppText>
            </View>
            <View style={styles.kvRow}>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Fee</AppText>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor, textAlign: "right", flex: 2 }} numberOfLines={3}>
                {`${safeToFixed8(feeVal)}${feeAsset ? ` ${feeAsset}` : ""}`.trim()}
              </AppText>
            </View>
            <View style={styles.kvRow}>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Total</AppText>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor, textAlign: "right", flex: 2 }} numberOfLines={3}>
                {safeToFixed8(totalVal)}
              </AppText>
            </View>
          </View>
        </View>

        {hasExecutedTrades && (
          <View style={{ marginTop: 8 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.execTradesBtn, {
                borderWidth: 1,
                borderColor: isDark ? 'transparent' : lightTheme.inputBorder,
              }]}
              onPress={() => setShowExecutedTrades((p) => ({ ...p, [orderId]: !p?.[orderId] }))}
            >
              <View style={styles.execTradesBtnRow}>
                <FastImage
                  source={downIcon}
                  tintColor={isDark ? colors.white : colors.lightGrey}
                  style={[
                    styles.orderHistoryChevron,
                    { transform: [{ rotate: showTrades ? "180deg" : "0deg" }] },
                  ]}
                  resizeMode="contain"
                />
                <AppText style={[styles.execTradesBtnText, { color: textColor }]}> {' '}Executed trades</AppText>
              </View>
            </TouchableOpacity>

            {showTrades && (
              <View style={styles.execTradesBox}>
                {inv.executed_prices.map((tr, i) => (
                  <View
                    key={`${orderId}_${tr?.trade_id ?? i}`}
                    style={[
                      styles.execTradeItem,
                      i === inv.executed_prices.length - 1 ? { borderBottomWidth: 0, marginBottom: 0 } : null,
                    ]}
                  >
                    <View style={styles.execTradeHeaderRow}>
                      <AppText style={[styles.execTradeHeaderText, { color: labelColor }]} weight={MEDIUM}>
                        Trade #{i + 1}
                      </AppText>
                    </View>

                    <View style={{ gap: 4, marginTop: 4 }}>
                      <View style={styles.execTradeKvRow}>
                        <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Price:</AppText>
                        <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: textColor, textAlign: "right", flex: 2 }} numberOfLines={3}>{toFixedEight(Number(tr?.price) || 0)} {quoteCc}</AppText>
                      </View>
                      <View style={styles.execTradeKvRow}>
                        <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Executed:</AppText>
                        <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: textColor, textAlign: "right", flex: 2 }} numberOfLines={3}>{toFixedEight(Number(tr?.quantity) || 0)} {baseSym}</AppText>
                      </View>
                      <View style={styles.execTradeKvRow}>
                        <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Fee:</AppText>
                        <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: textColor, textAlign: "right", flex: 2 }} numberOfLines={3}>{toFixedEight(Number(tr?.fee) || 0)} {quoteCc}</AppText>
                      </View>
                      <View style={styles.execTradeKvRow}>
                        <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Total:</AppText>
                        <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: textColor, textAlign: "right", flex: 2 }} numberOfLines={3}>{toFixedEight((Number(tr?.price) || 0) * (Number(tr?.quantity) || 0))}</AppText>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }, [themeColors, buildCurrencyPairText, getBaseCoinIconUri, getOrderStatusRaw, showExecutedTrades, getSideColor, isDark]);

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background, paddingTop: insets.top }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.container,
          { backgroundColor: themeColors.background },
        ]}
      >
        <SpotHeader
          title={`${base_currency ?? effectiveCurrency?.base_currency ?? "-"}/${quote_currency ?? effectiveCurrency?.quote_currency ?? "-"}`}
          setCurrency={handleCurrencyChange}
          change={change_percentage}
          isDark={isDark}
          pairLoading={pairHeaderLoading}
          onCandlePress={handleCandlePress}
          onTrendPress={() => NavigationService.navigate(MARKET_SCREEN)}
          onBackPress={() => navigation.goBack()}
          activeHeaderTab={headerTab}
          setActiveHeaderTab={setHeaderTab}
          currencyData={currencyData}
          pairSheetRef={pairSheetRef}
        />

        {headerTab === "Buy Crypto" || headerTab === "Convert" ? (
          <BuyCryptoScreen isEmbedded={true} navigation={navigation} />
        ) : (
          <>
            <View style={styles.secondcontainer}>
              {/* Left: Order book (ratio + controls inside). */}
              <View style={styles.leftPanel}>
                <OrderBookSection
                  styles={styles}
                  buy_price={buy_price}
                  change_percentage={change_percentage}
                  quote_currency={quote_currency}
                  base_currency={base_currency}
                  orderBookReady={orderBookReady}
                  showOrderBookSkeleton={showOrderBookSkeleton}
                  onOrderBookPress={handleOrderBookClick}
                  formatPrice={formatPrice}
                  formatQuantity={formatQuantity}
                  tickSize={currencyData?.tick_size ?? spotSelectedPair?.tick_size ?? 0.01}
                  pairResetKey={`${base_currency_id ?? ""}_${quote_currency_id ?? ""}`}
                  headerTab={headerTab}
                  marginMode={marginMode}
                  quoteHourlyRate={quoteHourlyRate}
                  isHourlyRateLoading={marginAccountData === null}
                />
              </View>

              {/* Right: Buy/Sell + fields */}
              <View style={styles.rightPanel}>

                <View
                  style={[
                    styles.tabContainer,
                    {
                      borderWidth: 0.5,
                      borderColor: themeColors.themeBorderColor,
                      borderRadius: 8,
                      overflow: "hidden",
                      paddingVertical: 0,
                      paddingHorizontal: 0,
                    },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => { setTab("Buy"); setIsBuy(true); }}
                    style={{ flex: 1, overflow: "hidden", alignItems: "center", justifyContent: "center", paddingVertical: 15 }}
                  >
                    <ImageBackground
                      source={trade_btn}
                      tintColor={tab === "Buy" ? (themeColors.spotTradeBuy ?? colors.spotTradeBuy) : themeColors.background}
                      resizeMode="stretch"
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <AppText weight={SEMI_BOLD} style={[styles.tabText, { color: tab === "Buy" ? colors.white : themeColors.secondaryText }]}>Buy</AppText>
                    </ImageBackground>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => { setTab("Sell"); setIsBuy(false); }}
                    style={{ flex: 1, overflow: "hidden", alignItems: "center", justifyContent: "center", paddingVertical: 15 }}
                  >
                    <ImageBackground
                      source={trade_btn}
                      tintColor={tab === "Sell" ? (themeColors.spotTradeSell ?? colors.spotTradeSell) : themeColors.background}
                      resizeMode="stretch"
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        transform: [{ rotate: "180deg" }],
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <AppText weight={SEMI_BOLD} style={[styles.tabText, {
                        color: tab === "Sell" ? themeColors.textOnButton : themeColors.secondaryText,
                        transform: [{ rotate: '180deg' }]
                      }]}>Sell</AppText>
                    </ImageBackground>
                  </TouchableOpacity>
                </View>

                {headerTab === "Margin" && (
                  <MarginHeaderDropdowns
                    marginMode={marginMode}
                    setMarginMode={setMarginMode}
                    marginLeverage={marginLeverage}
                    setMarginLeverage={setMarginLeverage}
                    themeColors={themeColors}
                    isDark={isDark}
                    universalPaddingHorizontal={universalPaddingHorizontal}
                    styles={styles}
                    coinBalance={coinBalance}
                    crossAccount={crossAccount}
                    crossBorrowable={crossBorrowable}
                    currencyData={currencyData}
                    formatTotal={formatTotal}
                    loading={isPlacingOrder}
                    price={price}
                    buy_price={buy_price}
                    customModalProps={{ statusBarTranslucent: true }}
                  />
                )}

                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setIsOrderTypeModalVisible(true)}
                    style={[
                      styles.dropdown,
                      {
                        backgroundColor: isDark ? darkTheme.darkThemeInputColor : '#F7F7F7',
                        flex: 1,
                        borderRadius: 10,
                        borderWidth: 0,
                        marginBottom: 8,
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                      },
                    ]}
                  >
                    <AppText
                      weight={MEDIUM}
                      style={{ color: themeColors.text, fontSize: 14 }}
                    >
                      {numberSelectLimit}
                    </AppText>
                    <FastImage
                      source={INFO}
                      style={{ height: 14, width: 14, marginLeft: 6 }}
                      resizeMode="contain"
                      tintColor={themeColors.secondaryText}
                    />
                    <View style={{ flex: 1 }} />
                    <FastImage
                      source={downIcon}
                      resizeMode="contain"
                      style={{ width: 10, height: 10 }}
                      tintColor={themeColors.secondaryText}
                    />
                  </TouchableOpacity>
                </View>

                {/* Price field (web parity)
                    - LIMIT / STOP_LIMIT: editable + stepper
                    - MARKET / STOP_MARKET: readonly "Best Market Price" */}
                <View style={styles.spotOrderInputBlock}>
                  <View
                    style={[
                      styles.spotOrderFieldCard,
                      {
                        backgroundColor: isDark ? darkTheme.darkThemeInputColor : '#F7F7F7',
                        borderWidth: 0,
                      },
                    ]}
                  >
                    <View style={styles.spotOrderFieldStack}>
                      <Animated.View
                        pointerEvents="none"
                        style={{
                          // backgroundColor: "red",
                          position: "absolute",
                          left: 0,
                          right: 0,
                          alignItems: "center",
                          top: priceAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [12, 2],
                          }),
                        }}
                      >
                        <Animated.Text
                          style={{
                            color: "#8E8E93",
                            fontSize: priceAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [13, 10],
                            }),
                            fontWeight: "500",
                          }}
                        >
                          Price ({quote_currency})
                        </Animated.Text>
                      </Animated.View>

                      {isLimit ? (
                        <View
                          style={[
                            styles.spotOrderInputBox,
                            styles.spotOrderInputBoxDense,
                            {
                              backgroundColor: "transparent",
                              paddingHorizontal: 0,
                              paddingVertical: 0,
                              marginTop: 2,
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between"
                            },
                          ]}
                        >
                          <TouchableOpacity
                            onPress={() => handlePriceStep(-1)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={{ width: 34, alignItems: 'center', justifyContent: 'center' }}
                          >
                            <AppText style={{ fontSize: 20, color: themeColors.secondaryText, lineHeight: 22 }}>-</AppText>
                          </TouchableOpacity>
                          <TextInput
                            placeholder={""}
                            placeholderTextColor={themeColors.secondaryText}
                            selectionColor={inputSelectionColor}
                            value={
                              isPriceFocused
                                ? (price !== "" ? price : staticBuyPrice)
                                : formatPriceThousands(price !== "" ? price : staticBuyPrice)
                            }
                            onChangeText={(text) => handlePriceInput(text, setPrice)}
                            onBlur={() => {
                              setIsPriceFocused(false);
                              handlePriceBlur(price, setPrice);
                            }}
                            onFocus={() => setIsPriceFocused(true)}
                            keyboardType="numeric"
                            style={[
                              styles.spotOrderInputValue,
                              {
                                flex: 1,
                                color: themeColors.text,
                                textAlign: "center",
                                fontSize: 13,
                                fontWeight: "bold",
                                paddingVertical: 0,
                                marginTop: 8,
                                ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                              },
                            ]}
                            editable
                          />
                          <TouchableOpacity
                            onPress={() => handlePriceStep(1)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={{ width: 34, alignItems: 'center', justifyContent: 'center' }}
                          >
                            <AppText style={{ fontSize: 20, color: themeColors.secondaryText, lineHeight: 22 }}>+</AppText>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View
                          style={{
                            width: "100%",
                            minHeight: 23,
                            justifyContent: "center",
                            alignItems: "center",
                            marginTop: 0,
                          }}
                        >
                          <AppText
                            style={[
                              styles.spotOrderInputValue,
                              {
                                flex: 0,
                                color: "#8E8E93",
                                fontSize: 12,
                                textAlign: "center",
                                alignSelf: "center",
                                marginTop: 8,
                              },
                            ]}
                          >
                            Best Market Price
                          </AppText>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {showStopPriceField && (
                  <View style={styles.spotOrderInputBlock}>
                    <View
                      style={[
                        styles.spotOrderFieldCard,
                        {
                          backgroundColor: isDark ? darkTheme.darkThemeInputColor : '#F7F7F7',
                          borderWidth: 0,
                        },
                      ]}
                    >
                      <View style={styles.spotOrderFieldStack}>
                        <Animated.View
                          pointerEvents="none"
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            alignItems: "center",
                            top: stopAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [8, 2],
                            }),
                          }}
                        >
                          <Animated.Text
                            style={{
                              color: "#8E8E93",
                              fontSize: stopAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [13, 10],
                              }),
                              fontWeight: "500",
                            }}
                          >
                            Stop Price ({quote_currency})
                          </Animated.Text>
                        </Animated.View>
                        <View
                          style={[
                            styles.spotOrderInputBox,
                            styles.spotOrderInputBoxDense,
                            {
                              backgroundColor: "transparent",
                              paddingHorizontal: 0,
                              paddingVertical: 0,
                              marginTop: 2,
                            },
                          ]}
                        >
                          <TextInput
                            placeholder={""}
                            placeholderTextColor={themeColors.secondaryText}
                            selectionColor={inputSelectionColor}
                            value={stopPrice}
                            onChangeText={(text) => handlePriceInput(text, setStopPrice)}
                            onBlur={() => {
                              setIsStopFocused(false);
                              handlePriceBlur(stopPrice, setStopPrice);
                            }}
                            onFocus={() => setIsStopFocused(true)}
                            keyboardType="numeric"
                            style={[
                              styles.spotOrderInputValue,
                              {
                                color: themeColors.text,
                                textAlign: "center",
                                fontSize: 13,
                                fontWeight: "bold",
                                paddingVertical: 0,
                                marginTop: 8,
                                ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                <View style={[styles.spotOrderInputBlock, showAmtDenomSelect && { zIndex: 100, elevation: 100 }]}>
                  <View
                    style={[
                      styles.spotOrderFieldCard,
                      {
                        backgroundColor: isDark ? darkTheme.darkThemeInputColor : '#F7F7F7',
                        borderWidth: 0,
                        overflow: "visible",
                      },
                      showAmtDenomSelect && { zIndex: 100, elevation: 100 },
                    ]}
                  >
                    <View style={[styles.spotOrderFieldStack, showAmtDenomSelect && { zIndex: 100, elevation: 100, overflow: "visible" }]}>
                      <Animated.View
                        pointerEvents="none"
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          alignItems: "center",
                          top: amountAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [8, 2],
                          }),
                        }}
                      >
                        <Animated.Text
                          style={{
                            color: "#8E8E93",
                            fontSize: amountAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [13, 10],
                            }),
                            fontWeight: "500",
                          }}
                        >
                          {showAmtDenomSelect ? "Amount" : `Amount (${base_currency})`}
                        </Animated.Text>
                      </Animated.View>
                      <View
                        style={[
                          styles.spotOrderInputBox,
                          styles.spotOrderInputBoxDense,
                          {
                            backgroundColor: "transparent",
                            paddingHorizontal: 0,
                            paddingVertical: 0,
                            marginTop: 2,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between"
                          },
                        ]}
                      >
                        {(!showAmtDenomSelect) && (
                          <TouchableOpacity
                            onPress={() => handleAmountStep(-1)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={{ width: 34, alignItems: 'center', justifyContent: 'center', }}
                          >
                            <AppText style={{ fontSize: 20, color: themeColors.secondaryText, lineHeight: 22 }}>-</AppText>
                          </TouchableOpacity>
                        )}
                        <TextInput
                          ref={amountInputRef}
                          placeholder={""}
                          placeholderTextColor={themeColors.secondaryText}
                          selectionColor={inputSelectionColor}
                          value={amount}
                          onChangeText={(text) => handleQty(text)}
                          onBlur={() => {
                            setIsAmountFocused(false);
                            handleQuantityBlur(amount, setAmount);
                          }}
                          onFocus={() => setIsAmountFocused(true)}
                          keyboardType="numeric"
                          style={[
                            styles.spotOrderInputValue,
                            {
                              flex: 1,
                              color: themeColors.text,
                              textAlign: "center",
                              paddingLeft: 0,
                              fontSize: 13,
                              fontWeight: "bold",
                              paddingVertical: 0,
                              marginTop: 8,
                              ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                            },
                          ]}
                        />
                        {showAmtDenomSelect ? (
                          <View style={{ position: "absolute", right: -5, marginTop: 8, zIndex: 10, }}>
                            <CustomDropdown
                              data={[base_currency, quote_currency]}
                              selected={amtDenom === "BASE" ? base_currency : quote_currency}
                              onSelect={(item) => {
                                setAmtDenom(item === base_currency ? "BASE" : "QUOTE");
                              }}
                              icon={downIcon}
                              compact
                              align="right"
                              triggerStyle={{ backgroundColor: 'transparent', borderWidth: 0, minWidth: 60 }}
                              dropdownWidth={100}
                            />
                          </View>
                        ) : (
                          <TouchableOpacity
                            onPress={() => handleAmountStep(1)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={{ width: 34, alignItems: 'center', justifyContent: 'center', }}
                          >
                            <AppText style={{ fontSize: 20, color: themeColors.secondaryText, lineHeight: 22 }}>+</AppText>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
                <View style={styles.spotOrderSliderWrap}>
                  <PercentQuickSelect
                    activeValue={activePercentage}
                    onSelect={handleTotalPercentage}
                    theme={theme}
                  />
                </View>

                {spotOrderType === "LIMIT" ? (
                  <View style={styles.spotOrderInputBlock}>
                    <View
                      style={[
                        styles.spotOrderFieldCard,
                        {
                          backgroundColor: isDark ? darkTheme.darkThemeInputColor : '#F7F7F7',
                          borderWidth: 0,
                        },
                      ]}
                    >
                      <View style={styles.spotOrderFieldStack}>
                        <Animated.View
                          pointerEvents="none"
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            alignItems: "center",
                            top: totalAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [8, 2],
                            }),
                          }}
                        >
                          <Animated.Text
                            style={{
                              color: "#8E8E93",
                              fontSize: totalAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [13, 10],
                              }),
                              fontWeight: "500",
                            }}
                          >
                            Total ({quote_currency})
                          </Animated.Text>
                        </Animated.View>
                        <View
                          style={[
                            styles.spotOrderInputBox,
                            styles.spotOrderInputBoxDense,
                            {
                              backgroundColor: "transparent",
                              paddingHorizontal: 0,
                              paddingVertical: 0,
                              marginTop: 2,
                            },
                          ]}
                        >
                          <TextInput
                            placeholder={""}
                            placeholderTextColor={themeColors.secondaryText}
                            selectionColor={inputSelectionColor}
                            value={isTotalFocused ? total : (amount ? formatTotal(totalDisplayValue) : "")}
                            onChangeText={handleTotal}
                            onBlur={() => setIsTotalFocused(false)}
                            onFocus={() => setIsTotalFocused(true)}
                            keyboardType="numeric"
                            style={[
                              styles.spotOrderInputValue,
                              {
                                flex: 1,
                                color: themeColors.text,
                                textAlign: "center",
                                fontSize: 13,
                                fontWeight: "bold",
                                paddingVertical: 0,
                                marginTop: 8,
                                ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                              },
                            ]}
                            editable={true}
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                ) : null}

                {/* Web parity: IOC/FOK toggles are visible for Spot form footer.
                    API uses them only for LIMIT / STOP_LIMIT (we only send then), but UI stays consistent. */}
                {(headerTab !== "Margin" || isMarketLikeOrder) && (
                  <View style={styles.spotOrderTifRow}>
                    {headerTab !== "Margin" && (
                      <>
                        <TouchableOpacity
                          onPress={() => {
                            setLimitIoc((v) => {
                              const next = !v;
                              if (next) setLimitFok(false);
                              return next;
                            });
                          }}
                          style={styles.spotOrderTifChip}
                          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                        >
                          <View style={[styles.slippageCheckbox, { borderColor: themeColors.themeBorderColor }]}>
                            {limitIoc ? (
                              <FastImage source={checkIc} tintColor={isDark ? colors.white : colors.black} style={[styles.slippageCheckIcon, {
                              }]} resizeMode="contain" />
                            ) : null}
                          </View>
                          <AppText style={[styles.spotOrderTifText, { color: themeColors.text }]}>IOC</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setLimitFok((v) => {
                              const next = !v;
                              if (next) setLimitIoc(false);
                              return next;
                            });
                          }}
                          style={styles.spotOrderTifChip}
                          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                        >
                          <View style={[styles.slippageCheckbox, { borderColor: themeColors.themeBorderColor }]}>
                            {limitFok ? (
                              <FastImage source={checkIc} tintColor={isDark ? colors.white : colors.black} style={styles.slippageCheckIcon} resizeMode="contain" />
                            ) : null}
                          </View>
                          <AppText style={[styles.spotOrderTifText, { color: themeColors.text }]}>FOK</AppText>
                        </TouchableOpacity>
                      </>
                    )}
                    {isMarketLikeOrder && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setSlippageEnabled((v) => !v)}
                        style={styles.spotOrderTifChip}
                        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                      >
                        <View
                          style={[
                            styles.slippageCheckbox,
                            { borderColor: themeColors.themeBorderColor },
                          ]}
                        >
                          {slippageEnabled ? (
                            <FastImage source={checkIc} tintColor={isDark ? colors.white : colors.black} style={styles.slippageCheckIcon} resizeMode="contain" />
                          ) : null}
                        </View>
                        <AppText style={[styles.spotOrderTifText, { color: themeColors.text }]}>Slippage</AppText>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {isMarketLikeOrder && slippageEnabled ? (
                  <View style={{ marginBottom: SPOT_ORDER_V_GAP }}>
                    <View style={styles.spotOrderInputBlock}>
                      <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => slippageInputRef.current?.focus()}
                        style={[
                          styles.spotOrderFieldCard,
                          {
                            backgroundColor: isDark ? darkTheme.darkThemeInputColor : '#F7F7F7',
                            borderWidth: 0,
                          },
                        ]}
                      >
                        <View style={styles.spotOrderFieldStack}>
                          {!isSlippageInputFocused && String(slippagePct ?? "").trim() === "" ? (
                            <View
                              pointerEvents="none"
                              style={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                alignItems: "center",
                                top: 8,
                              }}
                            >
                              <AppText
                                style={{
                                  color: "#8E8E93",
                                  fontSize: 13,
                                  fontWeight: "500",
                                }}
                              >
                                {slippagePlaceholder}
                              </AppText>
                            </View>
                          ) : null}
                          <View
                            style={[
                              styles.spotOrderInputBox,
                              styles.spotOrderInputBoxDense,
                              {
                                backgroundColor: "transparent",
                                paddingHorizontal: 0,
                                paddingVertical: 0,
                                marginTop: 2,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                              },
                            ]}
                          >
                            <View style={styles.spotOrderTotalSideSpacer} />
                            <View style={styles.spotOrderSlippageInputShell}>
                              <TextInput
                                ref={slippageInputRef}
                                value={slippagePct}
                                onChangeText={(t) => setSlippagePct(String(t).replace(/[^0-9.]/g, ""))}
                                placeholder={""}
                                placeholderTextColor={themeColors.secondaryText}
                                selectionColor={inputSelectionColor}
                                keyboardType="numeric"
                                textAlign="center"
                                accessibilityLabel="Slippage tolerance percent"
                                onFocus={() => setIsSlippageInputFocused(true)}
                                onBlur={() => setIsSlippageInputFocused(false)}
                                style={[
                                  styles.spotOrderInputValue,
                                  {
                                    flex: 1,
                                    color: themeColors.text,
                                    fontSize: 13,
                                    fontWeight: "bold",
                                    paddingVertical: 0,
                                    marginTop: 0,
                                    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                                  },
                                ]}
                              />
                              {(isSlippageInputFocused || String(slippagePct ?? "").trim() !== "") ? (
                                <View pointerEvents="none" style={styles.spotOrderSlippagePctWrap}>
                                  <AppText style={[styles.spotOrderSlippagePctText, { color: themeColors.secondaryText, fontSize: 13, fontWeight: "bold" }]}>
                                    %
                                  </AppText>
                                </View>
                              ) : null}
                            </View>
                            <View style={styles.spotOrderTotalSideSpacer} />
                          </View>
                        </View>
                      </TouchableOpacity>
                    </View>
                    {slippageError ? (
                      <AppText style={[styles.spotOrderSlippageError, { color: themeColors.red }]}>
                        {slippageError}
                      </AppText>
                    ) : null}
                  </View>
                ) : null}

                {headerTab === "Margin" ? (
                  <MarginBottomSection
                    quote_currency={quote_currency}
                    base_currency={base_currency}
                    coinBalance={coinBalance}
                    marginMode={marginMode}
                    crossAccount={crossAccount}
                    crossBorrowable={crossBorrowable}
                    isBuy={isBuy}
                    onSubmit={onSubmit}
                    themeColors={themeColors}
                    isDark={isDark}
                    userData={userData}
                    inputSelectionColor={inputSelectionColor}
                    fontFamilySemiBold={fontFamilySemiBold}
                    onBorrowPress={() => {
                      if (!userData) {
                        showError("Please login first to manage margin funds");
                        NavigationService.navigate(NAVIGATION_AUTH_STACK, { screen: LOGIN_SCREEN });
                        return;
                      }
                      // rbSheetAddFunds?.current?.open();
                      NavigationService.navigate(DEPOSIT_COIN_SCREEN)

                    }}
                    marginLeverage={marginLeverage}
                    price={price}
                    amount={amount}
                    buy_price={buy_price}
                    amountIsQuote={showAmtDenomSelect && amtDenom === "QUOTE"}
                    formatTotal={formatTotal}
                    styles={styles}
                    currencyData={currencyData}
                    loading={isPlacingOrder}
                    aboveButton={
                      headerTab === "Margin" && userData && marginMode === "Cross" ? (
                        <View
                          style={{
                            width: "100%",
                            marginBottom: 8,
                            borderWidth: 1,
                            borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
                            borderRadius: 10,
                            paddingHorizontal: 10,
                            paddingTop: 8,
                            paddingBottom: 6,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              paddingBottom: 4,
                            }}
                          >
                            <AppText weight={BOLD} style={{ fontSize: 13, color: themeColors.text }}>
                              {`${base_currency || "BTC"}/${quote_currency || "USDT"}`}
                            </AppText>
                            <View
                              style={{
                                backgroundColor: isDark ? "rgba(142,148,158,0.18)" : "rgba(142,148,158,0.15)",
                                borderRadius: 3,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                              }}
                            >
                              <AppText style={{ fontSize: 10, color: themeColors.secondaryText }}>Cross</AppText>
                            </View>
                          </View>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => rbSheetCrossRisk.current?.open()}
                            style={{ alignItems: "center", paddingTop: 4 }}
                          >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 5 }}>
                              <AppText style={{ fontSize: 12, color: themeColors.secondaryText }}>
                                Margin Level
                              </AppText>
                              <FastImage
                                source={INFO}
                                style={{ height: 12, width: 12 }}
                                resizeMode="contain"
                                tintColor={themeColors.secondaryText}
                              />
                            </View>
                            <CrossMarginLevelGauge
                              level={parsedCrossRisk.margin_level}
                              mmr={parsedCrossRisk.liquidationMarginLevel ?? 1.1}
                              warningRate={parsedCrossRisk.marginCallLevel ?? 1.15}
                              isDark={isDark}
                            />
                          </TouchableOpacity>
                        </View>
                      ) : headerTab === "Margin" && userData && marginMode === "Isolated" ? (
                        <View
                          style={{
                            width: "100%",
                            marginBottom: 8,
                            paddingBottom: 10,
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: 8,
                            }}
                          >
                            <AppText weight={BOLD} style={{ fontSize: 13, color: themeColors.text }}>
                              {`${base_currency || "BTC"}/${quote_currency || "USDT"}`}
                            </AppText>
                            <View
                              style={{
                                backgroundColor: isDark ? "rgba(142,148,158,0.18)" : "rgba(142,148,158,0.15)",
                                borderRadius: 3,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                              }}
                            >
                              <AppText style={{ fontSize: 10, color: themeColors.secondaryText }}>Isolated</AppText>
                            </View>
                          </View>
                          <AppText style={{ fontSize: 12, color: themeColors.secondaryText, marginBottom: 6 }}>
                            Margin Level
                          </AppText>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => rbSheetIsolatedRisk.current?.open()}
                            style={{
                              alignSelf: "flex-start",
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 4,
                              backgroundColor: isolatedMlStatus.key === "margin_call"
                                ? (isDark ? "rgba(217,119,6,0.28)" : "#fff7ed")
                                : isolatedMlStatus.key === "liquidated"
                                  ? (isDark ? "rgba(220,38,38,0.28)" : "#fef2f2")
                                  : isolatedMlStatus.key === "unavailable"
                                    ? (isDark ? "rgba(156,163,175,0.18)" : "rgba(156,163,175,0.15)")
                                    : (isDark ? "rgba(22,163,74,0.28)" : "#e8f5e9"),
                            }}
                          >
                            <AppText
                              weight={SEMI_BOLD}
                              style={{
                                fontSize: 12,
                                color: isolatedMlStatus.key === "margin_call"
                                  ? (isDark ? "#ffffff" : "#d97706")
                                  : isolatedMlStatus.key === "liquidated"
                                    ? (isDark ? "#ffffff" : "#dc2626")
                                    : isolatedMlStatus.key === "unavailable"
                                      ? (isDark ? "#9ca3af" : "#9ca3af")
                                      : (isDark ? "#ffffff" : "#16a34a"),
                              }}
                            >
                              {isolatedMlDisplay}
                            </AppText>
                            <FastImage
                              source={INFO}
                              style={{ height: 11, width: 11 }}
                              resizeMode="contain"
                              tintColor={
                                isolatedMlStatus.key === "unavailable"
                                  ? "#9ca3af"
                                  : (isDark ? "#ffffff" : isolatedMlStatus.color)
                              }
                            />
                          </TouchableOpacity>
                        </View>
                      ) : null
                    }
                  />
                ) : (
                  <>
                    <View style={{ marginTop: 8 }}>
                      {/* Available / Max */}
                      <View style={{ marginBottom: 16, gap: 6 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <AppText style={{ fontSize: 13, color: colors.placeholderColor, flexShrink: 0, marginTop: 2 }}>Available</AppText>
                          <View style={{ flexDirection: "row", alignItems: "flex-end", flexShrink: 1, paddingLeft: 10 }}>
                            {isSwitchingTab ? (
                              <ShimmerBox width={80} height={14} borderRadius={4} />
                            ) : (
                              <AppText style={{ fontSize: 13, color: themeColors.text, fontWeight: "600", flexShrink: 1, textAlign: "right" }}>
                                {(() => {
                                  const val = isBuy ? (coinBalance?.quote_currency_balance || 0) : (coinBalance?.base_currency_balance || 0);
                                  const res = parseFloat(Number(val).toFixed(8)).toString();
                                  return (res === "NaN" ? "0" : res).replace('.', '.\u200B');
                                })()} {isBuy ? quote_currency : base_currency}
                              </AppText>
                            )}
                            <TouchableOpacity
                              activeOpacity={0.7}
                              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                              onPress={() => {
                                if (!userData) {
                                  showError("Please login first to deposit funds");
                                  NavigationService.navigate(NAVIGATION_AUTH_STACK, { screen: LOGIN_SCREEN });
                                  return;
                                }
                                navigation.navigate(DEPOSIT_COIN_SCREEN);
                              }}
                              style={{ marginLeft: 6, padding: 4, flexShrink: 0, marginBottom: 2 }}
                            >
                              <FastImage source={add} style={{ width: 14, height: 14 }} tintColor={themeColors.text} resizeMode="contain" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <AppText style={{ fontSize: 13, color: colors.placeholderColor, flexShrink: 0, marginTop: 2 }}>Max</AppText>
                          {isSwitchingTab ? (
                            <ShimmerBox width={80} height={14} borderRadius={4} />
                          ) : (
                            <AppText style={{ fontSize: 13, color: themeColors.text, fontWeight: "600", flexShrink: 1, paddingLeft: 10, textAlign: "right" }}>
                              {(() => {
                                const val = isBuy ? (coinBalance?.quote_currency_balance || 0) : (coinBalance?.base_currency_balance || 0);
                                const res = formatTotal(Number(val)) || "0";
                                return res.replace('.', '.\u200B');
                              })()} {isBuy ? quote_currency : base_currency}
                            </AppText>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Buy Button */}
                    <View style={styles.spotOrderSubmitWrap}>
                      <Button
                        children={
                          !userData
                            ? "Login"
                            : isBuy
                              ? `Buy ${base_currency}`
                              : `Sell ${base_currency}`
                        }
                        disabled={!userData ? false : isPlacingOrder}
                        loading={isPlacingOrder}
                        activeOpacity={!userData ? 0.75 : amount ? 0.75 : 1}
                        containerStyle={[
                          styles.spotOrderSubmitBtn,
                          {
                            backgroundColor: !userData
                              ? (themeColors.spotTradeBuy ?? colors.spotTradeBuy)
                              : amount
                                ? (isBuy
                                  ? (themeColors.spotTradeBuy ?? colors.spotTradeBuy)
                                  : (themeColors.spotTradeSell ?? colors.spotTradeSell))
                                : (isBuy
                                  ? (isDark ? "#19402E" : "#A7E2C6")
                                  : (isDark ? "#4A1D20" : "#F2B2B4")),
                          },
                        ]}
                        onPress={() => {
                          if (!userData) {
                            NavigationService.reset(NAVIGATION_AUTH_STACK);
                            return;
                          }
                          if (amount) {
                            Keyboard.dismiss();
                            onSubmit();
                          }
                        }}
                        titleStyle={styles.spotOrderSubmitTitle}
                      />
                    </View>
                  </>
                )}

                {/* Web TradeCenterSection: fees + staking row directly under Buy/Sell CTA */}
                <View style={styles.spotOrderFooterBelowCta}>
                  <View style={styles.spotOrderFooterFeesRow}>
                    <AppText weight={SEMI_BOLD} style={[styles.spotOrderFooterFeeText, { color: themeColors.text }]}>
                      Maker {spotFooterMakerTakerPct.maker}%
                    </AppText>
                    <AppText weight={SEMI_BOLD} style={[styles.spotOrderFooterFeeText, { color: themeColors.text }]}>
                      Taker {spotFooterMakerTakerPct.taker}%
                    </AppText>
                  </View>

                </View>
              </View>
            </View>

            {headerTab === "Margin" ? (
              <MarginHistorySection
                currencyData={currencyData}
                themeColors={themeColors}
                isDark={isDark}
                marginMode={marginMode}
                marginAccountData={marginAccountData}
              />
            ) : (
              <>
                {/* Bottom tabs: Open Orders / Order History / Trade History */}
                {(historyOnly || orderBookReady) && (
                  <View
                    style={{
                      flexDirection: "row",
                      marginTop: 6,
                      alignItems: "center",
                      marginHorizontal: 8,
                    }}
                  >
                    <ScrollView
                      ref={ordersBottomTabScrollRef}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ flexDirection: "row", alignItems: "center", gap: 8, paddingRight: 8 }}
                      style={{ flex: 1 }}
                      onLayout={(e) => {
                        ordersBottomTabBarWidthRef.current = e.nativeEvent.layout.width;
                      }}
                    >
                      {[
                        { id: 1, label: "Open Orders" },
                        { id: 2, label: "Order History" },
                        { id: 3, label: "Trade History" },
                      ].map((t) => (
                        <TouchableOpacity
                          key={t.id}
                          activeOpacity={0.8}
                          onLayout={(e) => {
                            const { x, width } = e.nativeEvent.layout;
                            ordersBottomTabItemLayoutRef.current[t.id] = { x, width };
                          }}
                          onPress={() => handleSpotOrdersPrimaryTab(t.id)}
                          style={{ alignItems: "center", minHeight: 28, justifyContent: "center", paddingHorizontal: 2 }}
                        >
                          <AppText
                            numberOfLines={1}
                            weight={SEMI_BOLD}
                            style={{
                              color: activeTab === t.id ? themeColors.text : themeColors.secondaryText,
                              fontSize: 14,
                            }}
                          >
                            {t.label}
                            {typeof t.count === "number" && t.count > 0 ? ` (${t.count})` : ""}
                          </AppText>
                          <View
                            style={{
                              minWidth: 24,
                              height: 2,
                              marginTop: 2,
                              backgroundColor: activeTab === t.id ? isDark ? colors.white : colors.buttonBg : "transparent",
                              borderRadius: 1,
                            }}
                          />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {(historyOnly || orderBookReady) && (
                  <View style={styles.ordersTabContentWrapper}>
                    {mountedOrdersTab === 1 ? (
                      <View style={[styles.ordersTabPanel, { zIndex: 100 }]}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6, paddingHorizontal: 2, zIndex: 100 }}>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                            style={{ flex: 1, marginRight: 6 }}
                            contentContainerStyle={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              paddingVertical: 2,
                            }}
                          >
                            {SPOT_OPEN_ORDER_KINDS.map((k) => {
                              const active = openOrderKindTab === k.id;
                              return (
                                <TouchableOpacity
                                  key={k.id}
                                  activeOpacity={0.85}
                                  onPress={() => setOpenOrderKindTab(k.id)}
                                  style={{
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 6,
                                    backgroundColor: active ? themeColors.input : "transparent",
                                  }}
                                >
                                  <AppText
                                    weight={MEDIUM}
                                    style={{
                                      fontSize: 12,
                                      color: active ? themeColors.text : themeColors.secondaryText,
                                    }}
                                  >
                                    {k.label}
                                  </AppText>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, zIndex: 100 }}>
                            <View style={{ width: 105, zIndex: 100 }}>
                              <CustomDropdown
                                compact
                                align="right"
                                data={SPOT_SIDE_DROPDOWN_LABELS}
                                selected={spotDropdownLabelFromSideFilter(orderFilter)}
                                onSelect={(label) => setOrderFilter(spotSideFilterFromDropdownLabel(label))}
                              />
                            </View>
                            <TouchableOpacity
                              onPress={() => {
                                setOpenOrderKindTab("all");
                                setOrderFilter("All");
                              }}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                                paddingVertical: 4,
                                paddingLeft: 4,
                              }}
                            >
                              <FastImage source={Refresh} tintColor={isDark ? colors.white : colors.black} style={{ width: 12, height: 12 }} resizeMode="contain" />
                              <AppText weight={MEDIUM} style={{ fontSize: 12, color: themeColors.secondaryText }}>Reset</AppText>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {filteredOpenOrders?.length > 0 ? (
                          <>
                            <View style={styles.scrollContent}>
                              {openOrdersSlice.map((item, index) => (
                                <OpenOrderItemCard
                                  key={openOrderKeyExtractor(item, index)}
                                  inv={item}
                                  themeColors={themeColors}
                                  isDark={isDark}
                                  base_currency={base_currency}
                                  buildCurrencyPairText={buildCurrencyPairText}
                                  getOrderStatusRaw={getOrderStatusRaw}
                                  getSideColor={getSideColor}
                                  onCancelPress={handleCancelOpenOrderPress}
                                />
                              ))}
                            </View>
                            {filteredOpenOrders?.length > 5 && (
                              <TouchableOpacity
                                style={styles.viewAllButton}
                                onPress={() => NavigationService.navigate(OPEN_ORDER_SCREEN)}
                              >
                                <AppText style={[styles.viewAllText, { color: colors.buttonBg }]}>View All</AppText>
                              </TouchableOpacity>
                            )}
                          </>
                        ) : (
                          renderSpotOrdersEmptyState("Please login to view your open orders")
                        )}
                      </View>
                    ) : null}

                    {mountedOrdersTab === 2 ? (
                      <View style={styles.ordersTabPanel}>
                        {pastOrdersForSpotPair?.length > 0 ? (
                          <>
                            <View style={styles.scrollContent}>
                              {(pastOrdersSlice ?? []).map((item, index) => (
                                <PastOrderItemCard
                                  key={pastOrderKeyExtractor(item, index)}
                                  inv={item}
                                  themeColors={themeColors}
                                  isDark={isDark}
                                  base_currency={base_currency}
                                  quote_currency={quote_currency}
                                  buildCurrencyPairText={buildCurrencyPairText}
                                  getOrderStatusRaw={getOrderStatusRaw}
                                  getOrderStatusLabel={getOrderStatusLabel}
                                  getSideColor={getSideColor}
                                  normalizePairSymbol={normalizePairSymbol}
                                  showExecutedTrades={showExecutedTrades}
                                  setShowExecutedTrades={setShowExecutedTrades}
                                />
                              ))}
                            </View>
                            {pastOrdersForSpotPair?.length > 5 && (
                              <TouchableOpacity
                                activeOpacity={0.8}
                                style={styles.viewAllButton}
                                onPress={() => NavigationService.navigate('Trade_History')}
                              >
                                <AppText style={[styles.viewAllText, { color: isDark ? colors.white : colors.buttonBg }]}>View More</AppText>
                              </TouchableOpacity>
                            )}
                          </>
                        ) : (
                          renderSpotOrdersEmptyState("Please login to view your order history")
                        )}
                      </View>
                    ) : null}

                    {mountedOrdersTab === 3 ? (
                      <View style={[styles.ordersTabPanel, { zIndex: 100 }]}>
                        <>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: 6,
                              marginBottom: 6,
                              paddingLeft: 2,
                              paddingRight: 14,
                              alignSelf: "flex-start",
                              zIndex: 100,
                            }}
                          >
                            <View style={{ width: 110, zIndex: 100 }}>
                              <CustomDropdown
                                compact
                                data={SPOT_SIDE_DROPDOWN_LABELS}
                                selected={spotDropdownLabelFromSideFilter(tradeHistorySideFilter)}
                                onSelect={(label) => setTradeHistorySideFilter(spotSideFilterFromDropdownLabel(label))}
                              />
                            </View>
                            <TouchableOpacity
                              onPress={() => setTradeHistorySideFilter("All")}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                                paddingVertical: 4,
                                paddingLeft: 4,
                              }}
                            >
                              <FastImage source={Refresh} tintColor={isDark ? colors.white : colors.black} style={{ width: 12, height: 12 }} resizeMode="contain" />
                              <AppText style={{ fontSize: 13, color: themeColors.secondaryText }}>Reset</AppText>
                            </TouchableOpacity>
                          </View>
                          {renderTradeHistorySection()}
                        </>
                      </View>
                    ) : null}
                  </View>
                )}
              </>
            )}
          </>
        )}
        {/* Sweet Alert Style Modal */}
        {/* <PopupModal visible={visible} handleVisiblity={handlePopup} /> */}
        <RBSheet
          ref={rbSheetNumber}
          closeOnDragDown={true}
          closeOnPressMask={true}
          height={300}
          animationType="none"
          customStyles={{
            container: {
              backgroundColor: isDark ? themeColors.sheetDarkColor : themeColors.themeElevationColor,
              height: 300,
              borderRadius: 10,
              paddingHorizontal: universalPaddingHorizontal,
            },
            wrapper: {
              backgroundColor: "#0006",
            },
            draggableIcon: {
              backgroundColor: "transparent",
            },
          }}
        >
          {renderNumber()}
        </RBSheet>
      </ScrollView>

      <CrossMarginRiskModal
        ref={rbSheetCrossRisk}
        risk={crossRisk}
      />
      <IsolatedMarginRiskModal
        ref={rbSheetIsolatedRisk}
        row={isolatedRiskRow}
      />

      {/* Order Type Modal (Native 0-lag) */}
      <Modal
        visible={isOrderTypeModalVisible}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setIsOrderTypeModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsOrderTypeModalVisible(false)}
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
              backgroundColor: isDark ? themeColors.sheetDarkColor : themeColors.themeElevationColor,
              height: orderTypeSheetHeight,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: universalPaddingHorizontal,
              paddingTop: 12,
              paddingBottom: 8,
            }}
          >
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: isDark ? colors.white_opacity : colors.black_opacity }} />
            </View>
            {renderOrderTypeSheet()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Add Funds Bottom Sheet */}
      <RBSheet
        ref={rbSheetAddFunds}
        closeOnDragDown={true}
        closeOnPressMask={true}
        height={500}
        animationType="fade"
        openDuration={250}
        closeDuration={200}
        customModalProps={{ statusBarTranslucent: true }}
        customStyles={{
          container: {
            backgroundColor: isDark ? themeColors.sheetDarkColor : themeColors.themeElevationColor,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: universalPaddingHorizontal,
            paddingTop: 12,
            paddingBottom: 8,
          },
          wrapper: {
            backgroundColor: "#0006",
          },
          draggableIcon: {
            backgroundColor: themeColors.themeBorderColor,
            width: 40,
          },
        }}
      >
        <AddFundsSheet
          coinBalance={coinBalance}
          currencyData={currencyData}
          themeColors={themeColors}
          isDark={isDark}
          marginMode={marginMode}
          onClose={() => rbSheetAddFunds?.current?.close()}
        />
      </RBSheet>

      {/* Margin Order Confirm Bottom Sheet */}
      <RBSheet
        ref={rbSheetMarginConfirm}
        closeOnDragDown={true}
        closeOnPressMask={true}
        height={460}
        animationType="fade"
        openDuration={250}
        closeDuration={200}
        customModalProps={{ statusBarTranslucent: true }}
        customStyles={{
          container: {
            backgroundColor: isDark ? themeColors.sheetDarkColor : themeColors.themeElevationColor,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: universalPaddingHorizontal,
            paddingTop: 12,
            paddingBottom: 8,
          },
          wrapper: {
            backgroundColor: "#0006",
          },
          draggableIcon: {
            backgroundColor: themeColors.themeBorderColor,
            width: 40,
          },
        }}
      >
        {renderMarginConfirmSheet()}
      </RBSheet>

      {/* Cancel Order Modal (In-Screen Root Overlay - Zero Android Dialog artifact) */}
      {isCancelModalVisible && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              zIndex: 99999,
              elevation: 99999,
              backgroundColor: "rgba(0,0,0,0.6)",
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setIsCancelModalVisible(false)}
            style={StyleSheet.absoluteFillObject}
          />
          <View
            style={{
              backgroundColor: isDark ? themeColors.sheetDarkColor : themeColors.themeElevationColor,
              borderRadius: 20,
              padding: 25,
              width: Width * 0.85,
              alignSelf: "center",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 10,
              borderWidth: 1,
              borderColor: themeColors.themeBorderColor,
            }}
          >
            <AppText
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: themeColors.text,
                textAlign: "center",
                marginBottom: 15,
              }}
            >
              Cancel Order
            </AppText>

            <AppText
              style={{
                fontSize: 15,
                color: themeColors.secondaryText,
                textAlign: "center",
                marginBottom: 25,
                lineHeight: 22,
              }}
            >
              Are you sure you want to cancel this order?
            </AppText>

            <View style={{ flexDirection: "row", width: "100%", gap: 10 }}>
              <TouchableOpacity
                onPress={() => setIsCancelModalVisible(false)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor: themeColors.themeElevationColor,
                  borderWidth: 1,
                  borderColor: themeColors.themeBorderColor,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AppText style={{ fontSize: 14, fontWeight: "600", color: themeColors.text }}>
                  No, Keep
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={isCancelLoading}
                onPress={async () => {
                  const orderId = orderToCancel?._id?.$oid || orderToCancel?._id || orderToCancel?.order_id || orderToCancel?.id;
                  if (orderId) {
                    setIsCancelLoading(true);
                    let tt = undefined;
                    if (headerTab === "Margin") tt = marginMode === "Cross" ? "cross" : "margin";
                    const res = await dispatch(cancelOrder({ order_id: orderId, tradeType: tt }));
                    setIsCancelLoading(false);
                    if (res?.success) {
                      lastOrderPlacedTimeRef.current = 0;
                      setCancelledOrderIds((prev) => new Set(prev).add(String(orderId)));
                      const currentOrders = openOrdersRef.current ?? [];
                      const updatedOrders = currentOrders.filter((o) => getStableId(o) !== String(orderId));
                      dispatch(setOpenOrders(updatedOrders));
                      setIsCancelModalVisible(false);
                      setOrderToCancel(null);
                      setTimeout(() => {
                        fetchSpotOpenOrdersTab(true);
                      }, 200);
                    }
                  } else {
                    setIsCancelModalVisible(false);
                    setOrderToCancel(null);
                  }
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor: themeColors.red,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: themeColors.red,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 5,
                  opacity: isCancelLoading ? 0.7 : 1,
                }}
              >
                {isCancelLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <AppText style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
                    Yes, Cancel
                  </AppText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <TradingDataModal
        ref={pairSheetRef}
        onClose={() => { }}
        setCurrency={handleCurrencyChange}
        isDark={isDark}
        theme={theme}
      />
    </View>
  );
};

export default Spot;
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingBottom: 60,
  },
  minicontainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: SPOT_ORDER_V_GAP,
  },
  contain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  barContainer: {
    padding: 16,
    backgroundColor: "#fff",
    // flex: 1,
    justifyContent: "center",
    height: 500,
  },
  // secondcontainer: {
  //   padding: 12,
  //   backgroundColor: '#fff',
  // },
  secondcontainer: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: SPOT_ORDER_V_GAP,
  },
  leftPanel: {
    flex: 4,
    paddingRight: 6,
  },
  rightPanel: {
    flex: 6,
    paddingLeft: 6,
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: SPOT_ORDER_V_GAP,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 4,
    marginRight: 6,
  },
  activeTab: {
    backgroundColor: "#00C076",
  },
  tabText: {
    color: "#000",
    fontSize: 12,
  },
  activeTabText: {
    color: "#fff",
  },
  ordersTabContentWrapper: {
    minHeight: 120,
    marginTop: 4,
    marginBottom: 8,
    marginHorizontal: 5,
    position: "relative",
    paddingBottom: 40,
  },
  ordersTabPanel: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderRadius: 10,
  },
  dropdown: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    justifyContent: "space-between",
    marginBottom: SPOT_ORDER_V_GAP,
    alignItems: "center",
  },
  dropdownText: {
    fontSize: 11,
  },
  spotOrderInputBlock: {
    marginBottom: SPOT_ORDER_V_GAP,
  },
  spotOrderSliderWrap: {
    marginBottom: SPOT_ORDER_V_GAP,
  },
  spotOrderTifRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 10,
    rowGap: 4,
    marginBottom: 6,
    alignItems: "center",
  },
  spotOrderTifChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  spotOrderTifBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1,
  },
  spotOrderTifText: {
    fontSize: 13,
    fontFamily: fontFamilyMedium
  },
  slippageCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  slippageCheckIcon: {
    width: 9,
    height: 9,
  },
  spotOrderSlippageError: {
    fontSize: 9,
    lineHeight: 12,
  },
  spotOrderSubmitWrap: {
    marginTop: SPOT_ORDER_V_GAP,
    width: "100%",
    alignSelf: "stretch",
  },
  spotOrderSubmitBtn: {
    height: 36,
    minHeight: 36,
    borderRadius: 8,
  },
  spotOrderSubmitTitle: {
    fontSize: 12,
    color: colors.white,
  },
  spotOrderFooterBelowCta: {
    width: "100%",
    alignSelf: "stretch",
    marginTop: SPOT_ORDER_V_GAP,
    marginBottom: SPOT_ORDER_V_GAP,
    marginLeft: 5
  },
  spotOrderFooterFeesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 16,
    rowGap: 4,
  },
  spotOrderFooterFeeText: {
    fontSize: 11,
  },
  spotOrderStakingCard: {
    marginTop: SPOT_ORDER_V_GAP,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  spotOrderStakingAprText: {
    fontSize: 11,
    color: "#f59e0b",
  },
  /** Outer: centers the label+value stack vertically when taller than content. */
  spotOrderFieldCard: {
    justifyContent: "center",
    alignItems: "stretch",
    paddingVertical: 2,
    paddingHorizontal: 12,
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 0,
    overflow: "visible",
  },
  /** Inner: label + row treated as one block (centered inside spotOrderFieldCard). */
  spotOrderFieldStack: {
    width: "100%",
    height: 36,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "stretch",
    position: "relative",
  },
  spotOrderInputLabel: {
    fontSize: 10,
    fontFamily: fontFamilySemiBold,
    fontWeight: "500",
    textAlign: "left",
    marginLeft: 0,
    marginBottom: 0,
    lineHeight: 14,
  },
  spotOrderInputBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 6,
    paddingHorizontal: 2,
    minHeight: 27,
  },
  spotOrderStepBtn: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    minWidth: 24,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  spotOrderStepBtnText: {
    fontSize: 14,
    fontFamily: fontFamily,
  },
  spotOrderInputValue: {
    flex: 1,
    fontSize: 14,
    textAlign: "center",
    textAlignVertical: "center",
    paddingVertical: 2,
    paddingHorizontal: 2,
    minHeight: 27,
    alignSelf: "center",
    fontFamily: fontFamily,
    lineHeight: 20,
  },
  spotOrderTotalValue: {
    flex: 1,
  },
  /** Price / Amount / Total only — shorter vertical footprint */
  spotOrderFieldCardDense: {
    minHeight: 44,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  /** Price row: extra min height so label ↔ value gap (marginTop) does not clip */
  spotOrderFieldCardPrice: {
    minHeight: 52,
  },
  /** Amount / Total when empty — Binance-like short row, label centered */
  spotOrderFieldCardTight: {
    minHeight: 32,
    paddingVertical: 0,
    paddingHorizontal: 2,
    justifyContent: "center",
  },
  spotOrderAmountEmptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  spotOrderTotalEmptyInner: {
    minHeight: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  spotOrderInputBoxDense: {
    minHeight: 23,
  },
  spotOrderInputValueDense: {
    minHeight: 23,
    paddingVertical: 0,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fontFamily,
    fontWeight: "600",
  },
  /** Slippage: slightly larger placeholder/value than dense amount; % overlay so caret stays centered */
  spotOrderSlippageInputShell: {
    flex: 1,
    position: "relative",
    minHeight: 20,
    justifyContent: "center",
    alignSelf: "stretch",
  },
  spotOrderSlippageInput: {
    width: "100%",
    fontSize: 10,
    lineHeight: 14,
    minHeight: 20,
    paddingVertical: 0,
    paddingLeft: 26,
    paddingRight: 26,
    fontFamily: fontFamilyMedium,
    textAlign: "center",
    textAlignVertical: "center",
  },
  spotOrderSlippagePctWrap: {
    position: "absolute",
    right: -10,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  spotOrderSlippagePctText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: fontFamilyMedium,
  },
  /** Price / Amount steppers (+/−) */
  spotOrderStepBtnSpotPair: {
    minWidth: 28,
  },
  /** Total row: same side width as ± so value centers like Price/Amount */
  spotOrderTotalSideSpacer: {
    minWidth: 28,
  },
  spotOrderStepBtnTextDense: {
    fontSize: 13,
    fontFamily: fontFamily,
  },
  input: {
    // borderWidth: 1,
    // borderColor: '#ccc',
    height: 40,
    borderRadius: 6,
    padding: 8,
    marginBottom: 10,
    backgroundColor: "#EBEAE7",
    fontWeight: "400",
    marginTop: 0,
  },
  percentButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 8,
  },
  percentBtn: {
    // borderWidth: 1,
    // borderColor: '#aaa',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  selectedPercentBtn: (theme) => ({
    backgroundColor: theme === "Dark" ? colors.buttonDarkBg : "#F3BB2B",
    // borderColor: '#00C076',
  }),
  assetBox: {
    borderRadius: 6,
    padding: 5,
  },
  assetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 3,
  },
  assetActionRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 6,
    marginTop: SPOT_ORDER_V_GAP,
  },
  assetLabel: {
    fontSize: 14,
    fontFamily: fontFamilySemiBold
  },
  assetValue: {
    fontSize: 13,
    fontFamily: fontFamilyMedium
  },
  assetActionBtn: {
    flex: 1,
    minHeight: 34,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  assetActionText: {
    fontSize: 11,
  },
  buyBtn: {
    backgroundColor: "#00C076",
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: "center",
  },
  buyBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4.5,
    minHeight: 26,
    width: "100%",
  },
  orderRowThreeCol: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  orderPrice: {
    color: "#E86161",
    fontSize: 12,
    flex: 1,
    textAlign: "left",
  },
  orderSize: {
    fontSize: 12,
    flex: 1,
    textAlign: "right",
  },
  orderTotal: {
    flex: 1,
    textAlign: "right",
  },
  orderBookTabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    marginBottom: 8,
  },
  orderBookTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
  },
  orderBookTabActive: {
    borderBottomWidth: 2,
  },
  orderBookTabText: {
    fontSize: 13,
    color: colors.secondaryText,
  },
  orderBookTabTextActive: {
    fontWeight: "600",
  },
  orderBookFilterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  orderBookFilterBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: 4,
    backgroundColor: colors.white_fifteen,
  },
  orderBookFilterBtnActive: {
    backgroundColor: colors.buttonDarkBg,
  },
  orderBookFilterText: {
    fontSize: 11,
    color: colors.secondaryText,
  },
  orderBookFilterTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  orderBookHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  orderBookHeaderText: {
    fontSize: 11,
    color: "#9D9D9D",
    flex: 1,
  },
  currentPriceBox: {
    marginVertical: 4,
    paddingVertical: 2,
    flexDirection: "column",
    alignItems: "flex-start",
  },
  spotObToolbarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 0,
  },
  spotObRatioRow: {
    width: "100%",
    flexDirection: "row",
  },
  spotObRatioPill: {
    flex: 1,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  ratioIndicatorBar: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 0,
    paddingVertical: 0,
    gap: 10,
  },
  ratioIndicatorHalf: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  ratioIndicatorTrack: {
    flex: 3,
    height: 3,
    backgroundColor: "rgba(128,128,128,0.12)",
    borderRadius: 2,
    flexDirection: "row",
    overflow: "hidden",
  },
  ratioIndicatorFill: {
    height: "100%",
  },
  spotObAggTrigger: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 32,
  },
  spotObAggCaret: {
    width: 10,
    height: 10,
  },
  spotObViewCycleBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  spotObViewCycleIcon: {
    width: 15,
    height: 15,
  },
  spotObAggBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  spotObAggPopover: {
    position: "absolute",
    width: 144,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  spotObAggRow: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  currentPrice: {
    color: "#00C076",
    fontWeight: "bold",
    fontSize: 19,
  },
  currentPriceUSD: {
    fontSize: 11,
    color: "#8E8E93",
    fontWeight: "500",
  },
  selectContainer: {
    height: 25,
    flexDirection: "row",
    alignItems: "center",
    // borderWidth: 1,
    // borderColor: colors.white,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
    justifyContent: "space-between",
  },
  checkImage: {
    height: 16,
    width: 16,
  },
  tableWrapper: {
    borderRadius: 10,
    overflow: "hidden",
    // backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
  },

  headerRow: {
    // backgroundColor: "#FFD700",
    borderBottomWidth: 2,
    borderBottomColor: "#b8860b",
  },
  //   evenRow: { backgroundColor: "#fff" },
  //   oddRow: { backgroundColor: "#f9f9f9" },
  //
  cell: {
    width: 100,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 12,
    textAlign: "center",
    // color:
  },
  headerCell: { fontWeight: "bold", fontSize: 13 },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
    backgroundColor: "transparent",
  },
  orderBookEmptyList: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: ORDER_BOOK_LIST_MAX_HEIGHT,
    backgroundColor: "transparent",
  },
  orderBookListContentAsks: {
    flexGrow: 0,
    paddingBottom: ORDER_BOOK_LIST_END_PAD,
  },
  orderBookListContentBids: {
    flexGrow: 0,
    paddingBottom: ORDER_BOOK_LIST_END_PAD,
  },
  emptyOrderBook: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    backgroundColor: "transparent",
  },
  filterBtn: {
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  // Card styles for orders – height content-driven (no fixed height)
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 5,
    paddingBottom: 8,
  },
  orderCard: {
    borderRadius: 10,
    padding: universalPaddingHorizontal,
    marginBottom: 10,
    marginTop: 10,
    borderWidth: borderWidth,
    borderColor: "#ccc",
    width: "100%",
    alignSelf: "center",
    backgroundColor: colors.themeElevationColor,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    flexWrap: "wrap",
  },
  currencyText: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 6,
  },
  cardLinkIcon: {
    width: 16,
    height: 16,
  },
  orderTypeLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  rightInfo: {
    alignItems: "flex-end",
    minWidth: 140,
  },
  dateText: {
    fontSize: 12,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  labelText: {
    fontSize: 12,
    marginRight: 8,
    minWidth: 110,
  },
  valueText: {
    fontSize: 12,
    flex: 1,
    flexShrink: 1,
    textAlign: "right",
  },
  actionRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.grey,
    alignItems: "flex-end",
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "#A65C5C",
  },
  binIcon: {
    width: 18,
    height: 18,
    marginRight: 6,
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: "500",
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  expandButtonText: {
    fontSize: 12,
    fontWeight: "500",
  },
  executedTradesContainer: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
  },
  executedTradeCard: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: borderWidth,
  },
  noDataRow: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  noDataText: {
    fontSize: 16,
    fontStyle: "italic",
    marginTop: 16,
  },
  viewAllButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  // Open Order card – same design as OpenOrder.js screen
  openOrderCard: {
    padding: 14,
    paddingBottom: 0,
    width: "100%",
    alignSelf: "center",
  },
  openOrderTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  orderHistoryChevron: {
    width: 10,
    height: 10,
    marginTop: 2,
  },
  pairRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  coinIconSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 6,
    backgroundColor: "transparent",
  },
  openOrderCardTitle: {
    fontSize: 15,
    marginRight: 6,
    fontWeight: "600",
  },
  openOrderCardDate: {
    fontSize: 12,
  },
  openOrderTypeLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  openOrderCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 1,
  },
  kvK: {
    fontSize: 12,
    flex: 1,
  },
  kvV: {
    fontSize: 12,
    flex: 1,
    textAlign: "right",
  },
  execTradesBtn: {
    alignSelf: "flex-end",
    paddingVertical: 4,
    paddingHorizontal: 5,

    borderRadius: 5,

  },
  execTradesBtnRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  execTradesBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  execTradesBox: {
    marginTop: 8,
    backgroundColor: "rgba(128, 128, 128, 0.08)",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  execTradeItem: {
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128, 128, 128, 0.15)",
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: 0,
  },
  execTradeHeaderRow: {
    marginBottom: 4,
  },
  execTradeHeaderText: {
    fontSize: 12,
  },
  execTradeKvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 1,
  },
  execTradeKvK: {
    fontSize: 12,
    flex: 1,
  },
  execTradeKvV: {
    fontSize: 12,
    flex: 1,
    textAlign: "right",
  },
  openOrderCardLabel: {
    fontSize: 13,
    flex: 1,
  },
  openOrderCardValue: {
    fontSize: 13,
    flex: 1,
    textAlign: "right",
  },
  openOrderCardDivider: {
    height: 1,
    backgroundColor: "#ccc",
    marginTop: 14,
  },
  cancelActionBtn: {
    borderWidth: 1,
    borderColor: "#FF4F4F",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
});