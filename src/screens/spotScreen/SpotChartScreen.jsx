import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  useWindowDimensions,
  TouchableOpacity,
  StatusBar,
  Platform,
  ScrollView,
  Animated,
  AppState,
  ActivityIndicator,
  Modal,
  Pressable,
  ImageBackground,
} from "react-native";
import Toast from "react-native-simple-toast";
import WebView from "react-native-webview";
import LinearGradient from "react-native-linear-gradient";
import { useRoute, useNavigation, useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import moment from "moment";
import { useDispatch } from "react-redux";
import { useTheme } from "../../hooks/useTheme";
import { showError } from "../../helper/logger";
import { AppText, SEMI_BOLD, ELEVEN, TEN, BOLD, MEDIUM, FOURTEEN, TWELVE } from "../../shared";
import FastImage from "react-native-fast-image";
import {
  back_ic,
  downIcon,
  upIcon,
  Refresh,
  starFillIcon,
  order_1,
  order_2,
  order_3,
  bell_ic,
  margin_ic,
  future_ic,
  bots_ic,
  buyImage,
  selImage,
  arrowRightIcon,
  favUnCheck,
  favCheck,
  NO_NOTIFICATION_ICON,
  RectangleGreen,
  RectangleRed,
} from "../../helper/ImageAssets";
import { toFixedFive, toFixedThree, twoFixedTwo } from "../../helper/utility";
import { useAppSelector } from "../../store/hooks";
import { SocketContext } from "../../SocketProvider";
import { CHART_WEB_BASE_URL } from "../../helper/Constants";
import TradingDataModal from "../../common/TradingDataModal/TradingDataModal";
import { addToFavorites, getFavoriteArray } from "../../actions/homeActions";
import { setBuyOrders, setRecentTrades, setSellOrders, setSpotSelectedPair } from "../../slices/homeSlice";
import { getUserSpotWallet } from "../../actions/walletActions";
import { IMAGE_BASE_URL } from "../../helper/Constants";
import { colors, lightTheme } from "../../theme/colors";
import * as routes from "../../navigation/routes";
import NavigationService from "../../navigation/NavigationService";
import { colors as themePalette } from "../../theme/colors";

const { width: Width, height: Height } = Dimensions.get("window");
const CHART_BLOCK_HEIGHT = Math.round(Height * 0.48);
// Render full order book list on this screen (web-like).
// (Binance shows many rows; we avoid slicing here.)
const ORDER_BOOK_ROWS = 12;
/** Tail padding below tab pager + clearance for fixed Buy/Sell bar */
const TAB_SCROLL_BOTTOM_GAP = 12;
const TAB_SCROLL_BAR_CLEARANCE = 72;

/** Pager + chip labels (stable reference for scroll sync callbacks). */
const CHART_BOTTOM_TABS = ["Order Book", "Market Trades", "Assets"];
const TOP_TABS = ["Chart", "Info"];

const CHART_BOTTOM_TAB_ICON = {
  "Order Book": "book-outline",
  "Market Trades": "stats-chart-outline",
  Assets: "wallet-outline",
};

const DEFAULT_ORDER_BOOK_AGG_OPTIONS = [0.1, 0.5, 1, 10, 100];
const SPOT_OB_VIEW_ICONS = [order_1, order_2, order_3];

const INJECTED_CHART_JS = `
  (function() {
    var meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      document.getElementsByTagName('head')[0].appendChild(meta);
    }
    var style = document.createElement('style');
    style.innerHTML = 'html, body, #root, #__next, .tradingview-widget-container, iframe { height: 100% !important; width: 100% !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; }';
    document.head.appendChild(style);
    document.documentElement.style.height = '100%';
    document.body.style.height = '100%';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
  })();
  true;
`;

/** Same idea as web `TradePage/index.js`: steps = tick × 1, 10, 100, … */
function getOrderBookAggOptionsForPair(tickSize) {
  const tick = Number(tickSize);
  if (!Number.isFinite(tick) || tick <= 0) {
    return DEFAULT_ORDER_BOOK_AGG_OPTIONS.slice();
  }
  const mults = [1, 10, 100, 1000, 10000];
  const out = [];
  for (const m of mults) {
    const v = tick * m;
    if (!Number.isFinite(v) || v <= 0) continue;
    out.push(parseFloat(Number(v).toPrecision(12)));
  }
  const unique = Array.from(new Set(out)).sort((a, b) => a - b);
  return unique.length ? unique : DEFAULT_ORDER_BOOK_AGG_OPTIONS.slice();
}

function roundPriceToAgg(price, agg) {
  const n = Number(price);
  const a = Number(agg);
  if (!Number.isFinite(n) || !Number.isFinite(a) || a <= 0) return n;
  return Math.round(n / a) * a;
}

function aggregateOrderBookRows(orders, agg) {
  if (!orders?.length) return [];
  const map = new Map();
  for (const o of orders) {
    const rem = Number(o?.remaining ?? o?.quantity ?? o?.qty ?? o?.amount ?? 0) || 0;
    const bucket = roundPriceToAgg(o.price, agg);
    const prev = map.get(bucket);
    if (prev) {
      prev.quantity = (Number(prev.quantity) || 0) + (Number(o.quantity) || 0);
      prev.remaining = (Number(prev.remaining) || 0) + rem;
    } else {
      map.set(bucket, { ...o, price: bucket, remaining: rem });
    }
  }
  return Array.from(map.values());
}

/** Show only the numeric step (no quote currency suffix). */
function formatAggStepLabel(step) {
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

const orderBookDataEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i],
      y = b[i];
    if (String(x?.price) !== String(y?.price) || String(x?.remaining) !== String(y?.remaining)) return false;
  }
  return true;
};

const SHIMMER_STRIP_WIDTH_DEFAULT = 100;
const ShimmerBox = React.memo(({
  width,
  height,
  borderRadius = 8,
  style,
  shimmerStripWidth = SHIMMER_STRIP_WIDTH_DEFAULT,
  shimmerDuration = 700,
  shimmerToValue,
  shimmerColorsOverride,
}) => {
  const { colors: themeColors, isDark } = useTheme();
  const stripW = typeof shimmerStripWidth === "number" ? shimmerStripWidth : SHIMMER_STRIP_WIDTH_DEFAULT;
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
  useEffect(() => {
    shimmerX.setValue(-stripW);
    const run = () => {
      shimmerX.setValue(-stripW);
      Animated.timing(shimmerX, {
        toValue: shimmerToValue !== undefined ? shimmerToValue : Width + stripW,
        duration: shimmerDuration,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) run();
      });
    };
    run();
    return () => shimmerX.stopAnimation();
  }, [shimmerX, stripW, isDark, shimmerDuration, shimmerToValue]);
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
});

const CHART_BG_FALLBACK = "transparent";

const SKELETON_CANDLES = [
  { bodyH: 15, bodyBot: 30, wickH: 25, wickBot: 25 },
  { bodyH: 20, bodyBot: 35, wickH: 30, wickBot: 30 },
  { bodyH: 30, bodyBot: 40, wickH: 45, wickBot: 35 },
  { bodyH: 20, bodyBot: 65, wickH: 35, wickBot: 60 },
  { bodyH: 40, bodyBot: 50, wickH: 55, wickBot: 45 },
  { bodyH: 25, bodyBot: 25, wickH: 45, wickBot: 15 },
  { bodyH: 50, bodyBot: 45, wickH: 70, wickBot: 35 },
  { bodyH: 35, bodyBot: 80, wickH: 50, wickBot: 75 },
  { bodyH: 15, bodyBot: 100, wickH: 30, wickBot: 95 },
  { bodyH: 25, bodyBot: 105, wickH: 40, wickBot: 95 },
  { bodyH: 35, bodyBot: 85, wickH: 50, wickBot: 75 },
  { bodyH: 45, bodyBot: 50, wickH: 60, wickBot: 40 },
  { bodyH: 20, bodyBot: 60, wickH: 40, wickBot: 50 },
  { bodyH: 45, bodyBot: 20, wickH: 60, wickBot: 10 },
  { bodyH: 30, bodyBot: 10, wickH: 45, wickBot: 5 },
  { bodyH: 15, bodyBot: 35, wickH: 30, wickBot: 30 },
  { bodyH: 35, bodyBot: 30, wickH: 50, wickBot: 20 },
  { bodyH: 25, bodyBot: 60, wickH: 40, wickBot: 50 },
  { bodyH: 45, bodyBot: 20, wickH: 65, wickBot: 15 },
  { bodyH: 20, bodyBot: 50, wickH: 35, wickBot: 40 },
  { bodyH: 10, bodyBot: 65, wickH: 20, wickBot: 60 },
  { bodyH: 25, bodyBot: 45, wickH: 35, wickBot: 40 },
  { bodyH: 40, bodyBot: 55, wickH: 50, wickBot: 50 },
  { bodyH: 15, bodyBot: 80, wickH: 25, wickBot: 75 },
  { bodyH: 30, bodyBot: 70, wickH: 50, wickBot: 60 },
  { bodyH: 25, bodyBot: 55, wickH: 40, wickBot: 45 },
];

const ChartSkeleton = React.memo(({ height = CHART_BLOCK_HEIGHT, width = Width }) => {
  const { colors: themeColors, isDark } = useTheme();
  const bg = themeColors.background ?? CHART_BG_FALLBACK;
  return (
    <View style={{ width, height, backgroundColor: bg, paddingTop: 12, paddingHorizontal: 12, paddingBottom: 15, justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
        <ShimmerBox width={24} height={24} borderRadius={4} style={{ marginRight: 15 }} />
        {['1min', '5min', '15min', '1H', '1D'].map((v, i) => (
          <ShimmerBox key={i} width={50} height={24} borderRadius={4} style={{ marginRight: 10 }} />
        ))}
      </View>

      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={{ flex: 1, paddingRight: 15 }}>
          <ShimmerBox width={140} height={16} borderRadius={4} style={{ marginBottom: 8 }} />
          <ShimmerBox width={180} height={12} borderRadius={4} style={{ marginBottom: 16 }} />

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', flex: 1, paddingBottom: 15, marginTop: 10 }}>
            {SKELETON_CANDLES.map((candle, i) => {
              return (
                <View key={i} style={{ alignItems: 'center', width: 8, height: '100%', justifyContent: 'flex-end' }}>
                  <ShimmerBox
                    width={1.5} height={candle.wickH} borderRadius={1}
                    style={{ position: 'absolute', bottom: candle.wickBot }}
                    shimmerDuration={1500} shimmerToValue={60} shimmerStripWidth={60} shimmerColorsOverride={["transparent", isDark ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.8)", "transparent"]}
                  />
                  <ShimmerBox
                    width={6} height={candle.bodyH} borderRadius={2}
                    style={{ position: 'absolute', bottom: candle.bodyBot }}
                    shimmerDuration={1500} shimmerToValue={60} shimmerStripWidth={60} shimmerColorsOverride={["transparent", isDark ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.8)", "transparent"]}
                  />
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ width: 45, justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 25 }}>
          <ShimmerBox width={40} height={12} borderRadius={4} />
          <ShimmerBox width={40} height={12} borderRadius={4} />
          <ShimmerBox width={40} height={12} borderRadius={4} />
          <ShimmerBox width={40} height={12} borderRadius={4} />
        </View>
      </View>
    </View>
  );
});

const OrderBookSkeleton = React.memo(({ rows = 12 }) => {
  const ROW_HEIGHT = 19;
  const BONE_HEIGHT = 14;
  const BONE_RADIUS = 4;
  return (
    <View style={{ flex: 1, paddingVertical: 0, gap: 1 }}>
      {[...Array(rows)].map((_, i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            height: ROW_HEIGHT,
          }}
        >
          <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingRight: 4 }}>
            <ShimmerBox width="40%" height={BONE_HEIGHT} borderRadius={BONE_RADIUS} />
            <ShimmerBox width="50%" height={BONE_HEIGHT} borderRadius={BONE_RADIUS} />
          </View>
          <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingLeft: 4 }}>
            <ShimmerBox width="50%" height={BONE_HEIGHT} borderRadius={BONE_RADIUS} />
            <ShimmerBox width="40%" height={BONE_HEIGHT} borderRadius={BONE_RADIUS} />
          </View>
        </View>
      ))}
    </View>
  );
});

/** One row: bid (qty | price + green depth) + ask (price + red depth | qty) — theme colors from app. */
const toFinite = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const orderBookRemaining = (row) =>
  toFinite(row?.remaining ?? row?.quantity ?? row?.qty ?? row?.amount ?? 0);

const DepthRow = React.memo(({ bid, ask, bidFillPct, askFillPct, themeColors, isDark, formatPrice, formatQty }) => {
  const depthGreen = isDark ? "rgba(0, 192, 118, 0.16)" : "rgba(0, 192, 118, 0.12)";
  const depthRed = isDark ? "rgba(232, 97, 97, 0.18)" : "rgba(255, 77, 79, 0.14)";
  const bidRem = bid ? orderBookRemaining(bid) : 0;
  const askRem = ask ? orderBookRemaining(ask) : 0;
  const br = clamp01(Number(bidFillPct ?? 0) / 100);
  const ar = clamp01(Number(askFillPct ?? 0) / 100);

  return (
    <View style={styles.depthRow}>
      {/* Bid Side */}
      <View style={styles.depthBidSide}>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            width: `${br > 0 ? Math.max(1, br * 100) : 0}%`,
            backgroundColor: depthGreen,
          }}
        />
        <AppText type={TWELVE} weight={SEMI_BOLD} style={[styles.depthQty, { color: bid ? themeColors.text : "#9D9D9D", opacity: bid ? 1 : 0.15, zIndex: 1, position: 'absolute', left: 0, textAlign: 'left' }]} numberOfLines={1}>
          {bid ? formatQty(bidRem) : "—"}
        </AppText>
        <AppText type={TWELVE} weight={SEMI_BOLD} style={[styles.depthBidPrice, { color: bid ? themeColors.green : "#9D9D9D", opacity: bid ? 1 : 0.15, zIndex: 1, paddingRight: 4 }]}>
          {bid ? formatPrice(bid.price) : "—"}
        </AppText>
      </View>

      {/* Ask Side */}
      <View style={styles.depthAskSide}>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: `${ar > 0 ? Math.max(1, ar * 100) : 0}%`,
            backgroundColor: depthRed,
          }}
        />
        <AppText type={TWELVE} weight={SEMI_BOLD} style={[styles.depthAskPrice, { color: ask ? themeColors.red : "#9D9D9D", opacity: ask ? 1 : 0.15, zIndex: 1, paddingLeft: 4 }]}>
          {ask ? formatPrice(ask.price) : "—"}
        </AppText>
        <AppText type={TWELVE} weight={SEMI_BOLD} style={[styles.depthQty, { color: ask ? themeColors.text : "#9D9D9D", opacity: ask ? 1 : 0.15, textAlign: "right", zIndex: 1, position: 'absolute', right: 0 }]} numberOfLines={1}>
          {ask ? formatQty(askRem) : "—"}
        </AppText>
      </View>
    </View>
  );
});

// Web/Binance-like order book row (Price | Amount | Total) with depth behind the Total column.
const WebObRow = React.memo(
  ({ side, price, total, amount, fillPct, themeColors, isDark, formatPrice, formatQty, formatTotal }) => {
    const depthGreen = isDark ? "rgba(0, 192, 118, 0.22)" : "rgba(0, 192, 118, 0.14)";
    const depthRed = isDark ? "rgba(232, 97, 97, 0.24)" : "rgba(255, 77, 79, 0.16)";
    const pct = clamp01(Number(fillPct ?? 0) / 100);
    const depthColor = side === "ask" ? depthRed : depthGreen;
    const priceColor = side === "ask" ? themeColors.red : themeColors.green;

    return (
      <View style={styles.webObRow}>
        <AppText type={ELEVEN} style={[styles.webObCellPrice, { color: priceColor }]} numberOfLines={1}>
          {Number.isFinite(Number(price)) ? formatPrice(price) : "—"}
        </AppText>

        <AppText type={ELEVEN} style={[styles.webObCellAmt, { color: themeColors.text }]} numberOfLines={1}>
          {Number.isFinite(Number(amount)) ? formatQty(amount) : "—"}
        </AppText>

        <View style={styles.webObCellTotalWrap}>
          <View style={[styles.webObCellTotalInner, { position: "relative", overflow: "hidden" }]}>
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: `${pct > 0 ? Math.max(2, pct * 100) : 0}%`,
                backgroundColor: depthColor,
              }}
            />
            <AppText type={ELEVEN} style={[styles.webObCellTotal, { color: themeColors.text }]} numberOfLines={1}>
              {Number.isFinite(Number(total)) ? formatTotal(total) : "—"}
            </AppText>
          </View>
        </View>
      </View>
    );
  }
);

const SpotChartScreen = ({ route: routeProp, isEmbedded = false, onTradePress } = {}) => {
  const dispatch = useDispatch();
  const { colors: themeColors, theme, isDark } = useTheme();
  const navigation = useNavigation();
  const routeHook = useRoute();
  const route = routeProp || routeHook || { params: {} };
  const tradeType = route.params?.tradeType || "Spot";
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const chartHeight = 400;
  const tabScrollBottomPadding =
    TAB_SCROLL_BOTTOM_GAP + TAB_SCROLL_BAR_CLEARANCE + Math.max(insets.bottom, 8);
  const { subscribeToExchange, unsubscribeFromExchange, subscribeToMarket, unsubscribeFromMarket, exchangeData } = useContext(SocketContext) || {};

  const spotSelectedPair = useAppSelector((state) => state.home.spotSelectedPair);
  const coinData = useAppSelector((state) => state.home.coinData);
  const buyOrders = useAppSelector((state) => state.home.buyOrders);
  const sellOrders = useAppSelector((state) => state.home.sellOrders);
  const userData = useAppSelector((state) => state.auth.userData);
  const loading = useAppSelector((state) => state.auth.loading);
  const userSpotWallet = useAppSelector((state) => state.wallet.userSpotWallet);
  const recentTrades = useAppSelector((state) => state.home.recentTrades);
  const favoriteArray = useAppSelector((state) => state.home.favoriteArray);
  const favoriteArrayLoaded = useAppSelector((state) => state.home.favoriteArrayLoaded);
  const coinBalance = useAppSelector((state) => state.home.coinBalance);

  const params = route.params || {};
  /** Redux pair wins over stale navigation params after user changes pair in `TradingDataModal`. */
  const mergedPair = useMemo(() => {
    const raw = {
      ...spotSelectedPair,
      ...params,
    };
    const fromList = Array.isArray(coinData)
      ? coinData.find((c) => {
        if (raw._id && (c._id === raw._id || c.pair_id === raw._id)) return true;
        if (
          raw.base_currency_id != null &&
          raw.quote_currency_id != null &&
          c.base_currency_id === raw.base_currency_id &&
          c.quote_currency_id === raw.quote_currency_id
        ) {
          return true;
        }
        if (
          raw.base_currency &&
          raw.quote_currency &&
          c.base_currency === raw.base_currency &&
          c.quote_currency === raw.quote_currency
        ) {
          return true;
        }
        return false;
      })
      : null;

    let baseCur =
      raw.base_currency ||
      raw.base_currency_short_name ||
      raw.baseCurrency ||
      raw.base_symbol ||
      raw.base ||
      fromList?.base_currency ||
      fromList?.base_currency_short_name ||
      fromList?.base;

    let quoteCur =
      raw.quote_currency ||
      raw.quote_currency_short_name ||
      raw.quoteCurrency ||
      raw.quote_symbol ||
      raw.quote ||
      fromList?.quote_currency ||
      fromList?.quote_currency_short_name ||
      fromList?.quote;

    if ((!baseCur || !quoteCur) && (raw.symbol || raw.pair || raw.pair_name)) {
      const parts = String(raw.symbol || raw.pair || raw.pair_name).split(/[/_-]/);
      if (parts.length >= 2) {
        if (!baseCur) baseCur = parts[0];
        if (!quoteCur) quoteCur = parts[1];
      }
    }

    return {
      ...raw,
      ...fromList,
      base_currency: baseCur || "",
      quote_currency: quoteCur || "",
      base_currency_id: fromList?.base_currency_id ?? raw.base_currency_id,
      quote_currency_id: fromList?.quote_currency_id ?? raw.quote_currency_id,
      high: fromList?.high ?? fromList?.high_24h ?? raw.high ?? raw.high_24h,
      low: fromList?.low ?? fromList?.low_24h ?? raw.low ?? raw.low_24h,
      volume:
        fromList?.volume ??
        fromList?.volume_24h ??
        fromList?.base_volume ??
        raw.volume ??
        raw.volume_24h ??
        raw.base_volume,
      change:
        fromList?.change ??
        fromList?.price_change_24h ??
        fromList?.change_24hour ??
        raw.change ??
        raw.price_change_24h ??
        raw.change_24hour,
      volume_quote:
        fromList?.volumeQuote ??
        fromList?.volume_quote ??
        fromList?.quote_volume ??
        fromList?.volume_24h_quote ??
        fromList?.quoteVolume ??
        raw.volumeQuote ??
        raw.volume_quote ??
        raw.quote_volume ??
        raw.volume_24h_quote ??
        raw.quoteVolume,
      buy_price:
        fromList?.buy_price ??
        fromList?.last_price ??
        fromList?.price ??
        fromList?.last ??
        raw.buy_price ??
        raw.last_price ??
        raw.price ??
        raw.last,
      change_percentage:
        fromList?.change_percentage ??
        fromList?.changePercentage ??
        fromList?.change_24h ??
        raw.change_percentage ??
        raw.changePercentage ??
        raw.change_24h,
      _id: fromList?._id ?? raw._id ?? raw.pair_id,
      step_size: fromList?.step_size ?? raw.step_size,
      tick_size: fromList?.tick_size ?? raw.tick_size ?? 0.01,
    };
  }, [spotSelectedPair, params, coinData]);

  const pairRef = useRef(mergedPair);
  pairRef.current = mergedPair;

  const isFav = useMemo(() => {
    if (!favoriteArray || !mergedPair?._id) return false;
    return favoriteArray.includes(mergedPair._id);
  }, [favoriteArray, mergedPair?._id]);


  useEffect(() => {
    if (userData && !favoriteArrayLoaded) {
      dispatch(getFavoriteArray());
    }
  }, [userData, favoriteArrayLoaded, dispatch]);

  const [favLoading, setFavLoading] = useState(false);

  const toggleFavorite = useCallback(async () => {
    if (!userData) {
      showError("Please login first to add favorites");
      NavigationService.navigate(routes.LOGIN_SCREEN);
      return;
    }
    if (!mergedPair?._id || favLoading) {
      return;
    }
    setFavLoading(true);
    try {
      await dispatch(addToFavorites({ pair_id: mergedPair._id }));
    } catch (e) {
      console.log("Favorite toggle error", e);
    } finally {
      setFavLoading(false);
    }
  }, [dispatch, mergedPair?._id, favLoading, userData]);

  const onNotificationPress = useCallback(() => {
    if (!userData) {
      showError("Please login first to view notifications");
      NavigationService.navigate(routes.LOGIN_SCREEN);
      return;
    }
    NavigationService.navigate(routes.NOTIFICATION_SCREEN);
  }, [userData]);

  const [pairSheetVisible, setPairSheetVisible] = useState(false);

  const pairBase = mergedPair?.base_currency || "—";
  const pairQuote = mergedPair?.quote_currency || "—";
  const pairChange = mergedPair?.change_percentage ?? 0;
  const pairPrice = mergedPair?.buy_price ?? "—";
  const high = mergedPair?.high;
  const low = mergedPair?.low;
  const volume = mergedPair?.volume;

  // Derive decimal places implied by a tick/step size (matching web TradeCenterSection parity)
  const decimalsFromIncrement = useCallback((increment, fallback = 2) => {
    const n = Number(increment);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    if (Math.floor(n) === n) return 0;
    const s = n.toString();
    if (s.includes("e-")) return parseInt(s.split("e-")[1], 10) || fallback;
    return s.split(".")[1]?.length ?? fallback;
  }, []);

  const baseVolumeDecimals = useMemo(
    () => decimalsFromIncrement(mergedPair?.step_size),
    [decimalsFromIncrement, mergedPair?.step_size]
  );
  const quoteVolumeDecimals = useMemo(
    () => decimalsFromIncrement(mergedPair?.tick_size),
    [decimalsFromIncrement, mergedPair?.tick_size]
  );

  const [topTab, setTopTab] = useState("Chart");
  const topTabX = useRef(new Animated.Value(0)).current;

  const animateTopTab = useCallback(
    (next) => {
      const toValue = next === "Info" ? -Width : 0;
      Animated.timing(topTabX, {
        toValue,
        duration: 220,
        useNativeDriver: true,
      }).start();
    },
    [topTabX]
  );

  const onPressTopTab = useCallback(
    (next) => {
      if (next === topTab) return;
      setTopTab(next);
      animateTopTab(next);
    },
    [topTab, animateTopTab]
  );

  /** `activeTab` drives header highlight & controls; `mountedTab` drives rendered body to avoid height issues. */
  const [activeTab, setActiveTab] = useState("Order Book");
  const [mountedTab, setMountedTab] = useState("Order Book");
  /** Tab press slide animation (mount 1–2 panels only; avoids tallest-tab height issue). */
  const bottomSlideX = useRef(new Animated.Value(0)).current;
  const [bottomSlidePair, setBottomSlidePair] = useState(null); // { from:string, to:string, dir:1|-1 } | null
  const pairTickSize = mergedPair?.tick_size ?? 0.01;
  const orderBookAggOptions = useMemo(
    () => getOrderBookAggOptionsForPair(pairTickSize),
    [pairTickSize]
  );
  const [orderBookAggStep, setOrderBookAggStep] = useState(DEFAULT_ORDER_BOOK_AGG_OPTIONS[0]);
  const [orderBookAggOpen, setOrderBookAggOpen] = useState(false);
  const [aggMenuLayout, setAggMenuLayout] = useState(null);
  const aggTriggerRef = useRef(null);

  const openAggMenu = useCallback(() => {
    if (!aggTriggerRef.current) return;
    aggTriggerRef.current?.measureInWindow?.((x, y, w, h) => {
      setAggMenuLayout({ x, y, w, h });
      setOrderBookAggOpen(true);
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

  const [viewModeIndex, setViewModeIndex] = useState(0); // 0 both, 1 bids, 2 asks
  const orderBookViewMode = viewModeIndex === 0 ? "both" : viewModeIndex === 1 ? "bids" : "asks";

  const cycleViewMode = useCallback(() => {
    setViewModeIndex((v) => (v + 1) % 3);
  }, []);

  useEffect(() => {
    if (!orderBookAggOptions.length) return;
    setOrderBookAggStep(orderBookAggOptions[0]);
  }, [orderBookAggOptions, mergedPair?.base_currency_id, mergedPair?.quote_currency_id]);

  const formatRecentTradeTime = (item) => {
    const ts = item?.executed_at || item?.executedAt || item?.time || item?.created_at;
    if (!ts) return "—";
    const m = moment(ts);
    return m.isValid() ? m.format("HH:mm:ss") : "—";
  };

  const getFilteredWallets = () => {
    if (!userSpotWallet) return [];
    return [...userSpotWallet]
      .filter((w) => parseFloat(w.balance) > 0)
      .sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));
  };

  const filteredWallets = getFilteredWallets();

  const renderAssetsTabContent = () => {
    if (tradeType === "Margin") {
      const mb = coinBalance || {};
      const fmtVal = (v) => {
        if (v == null || !Number.isFinite(Number(v))) return "0";
        const res = parseFloat(Number(v).toFixed(8)).toString();
        return res === "NaN" ? "0" : res;
      };

      const quoteBal = fmtVal(mb.quote_currency_balance);
      const baseBal = fmtVal(mb.base_currency_balance);
      const quoteLocked = fmtVal(mb.quote_currency_locked);
      const baseLocked = fmtVal(mb.base_currency_locked);
      const quoteBorrowed = fmtVal(mb.quote_currency_borrowed);
      const baseBorrowed = fmtVal(mb.base_currency_borrowed);

      return (
        <View style={{ flex: 1, paddingBottom: 20 }}>
          <View style={styles.assetsHeader}>
            <View style={styles.assetsHeaderTitleRow}>
              <View>
                <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
                  Assets
                </AppText>
                <AppText type={TEN} style={{ color: colors.placeholderColor, marginTop: 2 }}>
                  Isolated · {pairBase}/{pairQuote}
                </AppText>
              </View>
              <TouchableOpacity onPress={() => dispatch(getUserSpotWallet("spot"))}>
                <FastImage source={Refresh} style={{ width: 35, height: 35 }} resizeMode="contain" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <AppText type={ELEVEN} style={{ color: colors.placeholderColor }}>{pairQuote} Balance</AppText>
              <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
                {quoteBal} {pairQuote}
              </AppText>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
              <AppText type={ELEVEN} style={{ color: colors.placeholderColor }}>{pairBase} Balance</AppText>
              <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
                {baseBal} {pairBase}
              </AppText>
            </View>
          </View>

          <View style={[styles.assetsActionRow, {}]}>
            <TouchableOpacity
              style={[styles.assetActionBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}
              onPress={() => {
                if (!userData) {
                  showError("Please login first to deposit funds");
                  NavigationService.navigate(routes.LOGIN_SCREEN);
                  return;
                }
                NavigationService.navigate(routes.DEPOSIT_COIN_SCREEN);
              }}
            >
              <AppText type={TEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>Deposit</AppText>
            </TouchableOpacity>
            {/* Convert button commented out */}
            {/* <TouchableOpacity style={[styles.assetActionBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]} onPress={() => NavigationService.navigate(routes.SWAP_SCREEN)}>
              <AppText type={TEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>Convert</AppText>
            </TouchableOpacity> */}
            <TouchableOpacity
              style={[styles.assetActionBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}
              onPress={() => {
                if (!userData) {
                  showError("Please login first to transfer funds");
                  NavigationService.navigate(routes.LOGIN_SCREEN);
                  return;
                }
                NavigationService.navigate(routes.MARGIN_TRANSFER_SCREEN);
              }}
            >
              <AppText type={TEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>Transfer</AppText>
            </TouchableOpacity>
          </View>

          <View style={{ marginHorizontal: 0, marginTop: 16, marginBottom: 24, padding: 15, borderRadius: 8, backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", marginBottom: 12 }}>
              <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{pairBase}/{pairQuote}</AppText>
              <View style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <AppText type={TEN} style={{ color: colors.placeholderColor }}>Isolated</AppText>
              </View>
            </View>

            <View style={{ marginBottom: 16 }}>
              <AppText type={ELEVEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 8 }}>{pairQuote}</AppText>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <AppText type={TEN} style={{ color: colors.placeholderColor }}>Available</AppText>
                <AppText type={TEN} style={{ color: themeColors.text }}>{quoteBal}</AppText>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <AppText type={TEN} style={{ color: colors.placeholderColor }}>In Order</AppText>
                <AppText type={TEN} style={{ color: themeColors.text }}>{quoteLocked}</AppText>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <AppText type={TEN} style={{ color: colors.placeholderColor }}>Borrowed</AppText>
                <AppText type={TEN} style={{ color: themeColors.red }}>{quoteBorrowed}</AppText>
              </View>
            </View>

            <View>
              <AppText type={ELEVEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 8 }}>{pairBase}</AppText>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <AppText type={TEN} style={{ color: colors.placeholderColor }}>Available</AppText>
                <AppText type={TEN} style={{ color: themeColors.text }}>{baseBal}</AppText>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <AppText type={TEN} style={{ color: colors.placeholderColor }}>In Order</AppText>
                <AppText type={TEN} style={{ color: themeColors.text }}>{baseLocked}</AppText>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <AppText type={TEN} style={{ color: colors.placeholderColor }}>Borrowed</AppText>
                <AppText type={TEN} style={{ color: themeColors.red }}>{baseBorrowed}</AppText>
              </View>
            </View>
          </View>
        </View>
      );
    }

    return (
      <>
        <View style={styles.assetsHeader}>
          <View style={styles.assetsHeaderTitleRow}>
            <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
              Spot Wallets
            </AppText>
            <TouchableOpacity onPress={() => dispatch(getUserSpotWallet("spot"))}>
              <FastImage
                source={Refresh}
                style={{ width: 35, height: 35 }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.assetsActionRow}>
          <TouchableOpacity
            style={[styles.assetActionBtn, { backgroundColor: themeColors.green }]}
            onPress={() => {
              if (!userData) {
                showError("Please login first to deposit funds");
                NavigationService.navigate(routes.LOGIN_SCREEN);
                return;
              }
              NavigationService.navigate(routes.DEPOSIT_COIN_SCREEN);
            }}
          >
            <AppText type={TEN} weight={SEMI_BOLD} style={{ color: "#fff" }}>
              Deposit
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.assetActionBtn, { backgroundColor: themeColors.red }]}
            onPress={() => {
              if (!userData) {
                showError("Please login first to withdraw funds");
                NavigationService.navigate(routes.LOGIN_SCREEN);
                return;
              }
              NavigationService.navigate(routes.SELECT_COIN_SCREEN);
            }}
          >
            <AppText type={TEN} weight={SEMI_BOLD} style={{ color: "#fff" }}>
              Withdraw
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.assetActionBtn, { backgroundColor: themeColors.button }]}
            onPress={() => {
              if (!userData) {
                showError("Please login first to transfer funds");
                NavigationService.navigate(routes.LOGIN_SCREEN);
                return;
              }
              NavigationService.navigate(routes.MARGIN_TRANSFER_SCREEN);
            }}
          >
            <AppText type={TEN} weight={SEMI_BOLD} style={{ color: "#fff" }}>
              Transfer
            </AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.assetsListHeader}>
          <AppText type={TWELVE} style={[styles.mtCell, { color: themeColors.secondaryText }]}>
            Asset
          </AppText>
          <AppText
            type={TWELVE}
            style={[
              styles.mtCell,
              { color: themeColors.secondaryText, textAlign: "right" },
            ]}
          >
            Balance
          </AppText>
        </View>

        {filteredWallets.length > 0 ? (
          filteredWallets.map((wallet, index) => (
            <View key={wallet?._id || index} style={styles.assetRow}>
              <View style={styles.assetInfo}>
                <FastImage
                  source={{ uri: `${IMAGE_BASE_URL}${wallet?.icon_path}` }}
                  style={styles.assetIcon}
                  resizeMode="contain"
                />
                <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
                  {wallet?.short_name}
                </AppText>
              </View>
              <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.text, textAlign: "right" }}>
                {parseFloat(Number(wallet?.balance || 0).toFixed(8))}
              </AppText>
            </View>
          ))
        ) : (
          <View style={styles.noDataContainer}>
            <FastImage source={NO_NOTIFICATION_ICON} resizeMode="contain" style={{ width: 80, height: 80 }} />
          </View>
        )}
      </>
    );
  };

  const handleTabChange = (tab) => {
    if (!CHART_BOTTOM_TABS.includes(tab)) return;
    if (bottomSlidePair) return;
    if (activeTab === tab) return;
    const from = mountedTab;
    const to = tab;
    const fromIdx = CHART_BOTTOM_TABS.indexOf(from);
    const toIdx = CHART_BOTTOM_TABS.indexOf(to);
    const dir = toIdx > fromIdx ? 1 : -1;
    setActiveTab(to); // update highlight + dropdown immediately
    setBottomSlidePair({ from, to, dir });
    bottomSlideX.setValue(0);
    Animated.timing(bottomSlideX, {
      toValue: -dir * Width,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setMountedTab(to);
      setBottomSlidePair(null);
      bottomSlideX.setValue(0);
    });
  };

  useEffect(() => {
    if (activeTab === "Assets" && userData) {
      dispatch(getUserSpotWallet("spot"));
    }
  }, [activeTab, userData, dispatch]);

  const [lastSocketData, setLastSocketData] = useState(null);
  const socket = useAppSelector((state) => state.home.socket);
  const isFocused = useIsFocused();
  const isFocusedRef = useRef(true);

  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, []);

  const socketThrottleTimerRef = useRef(null);
  const socketLastFlushRef = useRef(0);
  const pendingSocketFlushRef = useRef(null);
  const lastFlushedBuyRef = useRef(null);
  const lastFlushedSellRef = useRef(null);
  const SOCKET_UI_THROTTLE_MS = 300;

  useEffect(() => {
    if (pairSheetVisible) {
      if (socketThrottleTimerRef.current) {
        clearTimeout(socketThrottleTimerRef.current);
        socketThrottleTimerRef.current = null;
      }
      pendingSocketFlushRef.current = null;
    }
  }, [pairSheetVisible]);

  const flushSocketToState = useCallback((payload) => {
    if (!payload || !isFocusedRef.current) return;
    setLastSocketData(payload.data);
    if (payload.sellOrders) {
      if (!orderBookDataEqual(lastFlushedSellRef.current, payload.sellOrders)) {
        lastFlushedSellRef.current = payload.sellOrders;
        dispatch(setSellOrders(payload.sellOrders));
      }
    }
    if (payload.buyOrders) {
      if (!orderBookDataEqual(lastFlushedBuyRef.current, payload.buyOrders)) {
        lastFlushedBuyRef.current = payload.buyOrders;
        dispatch(setBuyOrders(payload.buyOrders));
      }
    }
    if (payload.recentTrades) {
      dispatch(setRecentTrades(payload.recentTrades));
    }
  }, [dispatch]);



  const lastSubscribedExchangeRef = useRef(null);
  const prevChartPairKeyRef = useRef(null);

  useEffect(() => {
    const base = mergedPair?.base_currency_id;
    const quote = mergedPair?.quote_currency_id;
    if (!base || !quote) return;
    const key = `${base}-${quote}`;

    if (prevChartPairKeyRef.current !== key) {
      // Clear stale order book data for the new pair immediately
      dispatch(setBuyOrders([]));
      dispatch(setSellOrders([]));
      dispatch(setRecentTrades([]));
      setLastSocketData(null);
      prevChartPairKeyRef.current = key;
    }

    if (!isFocused) return;

    // Manage exchange socket subscriptions reactively on pair change
    const extraParams = tradeType === "Margin" ? { tradeType: "margin" } : {};
    const last = lastSubscribedExchangeRef.current;
    if (last && (last.base_currency_id !== base || last.quote_currency_id !== quote || last.tradeType !== tradeType)) {
      unsubscribeFromExchange?.(last.base_currency_id, last.quote_currency_id, last.extraParams);
    }

    subscribeToExchange?.(base, quote, extraParams);
    lastSubscribedExchangeRef.current = { base_currency_id: base, quote_currency_id: quote, tradeType, extraParams };

  }, [isFocused, mergedPair?.base_currency_id, mergedPair?.quote_currency_id, subscribeToExchange, unsubscribeFromExchange, dispatch, tradeType]);

  useEffect(() => {
    if (!isFocused) return;
    subscribeToMarket?.("spot_chart");
    return () => {
      unsubscribeFromMarket?.("spot_chart");
    };
  }, [isFocused, subscribeToMarket, unsubscribeFromMarket]);

  useEffect(() => {
    return () => {
      const last = lastSubscribedExchangeRef.current;
      if (last?.base_currency_id != null && last?.quote_currency_id != null) {
        unsubscribeFromExchange?.(last.base_currency_id, last.quote_currency_id, last.extraParams);
        lastSubscribedExchangeRef.current = null;
      }
    };
  }, [unsubscribeFromExchange]);

  useEffect(() => {
    if (!socket || !isFocused) return;

    const normalizeObRow = (o) => {
      if (!o) return o;
      const rem = toFinite(o?.remaining ?? o?.quantity ?? o?.qty ?? o?.amount ?? 0);
      return { ...o, remaining: rem };
    };

    const handleMessage = (data) => {
      if (!isFocusedRef.current || appStateRef.current !== "active") return;

      if (data?.buy_order || data?.sell_order || data?.recent_trades) {
        const buy = data?.buy_order ? (data.buy_order || []).map(normalizeObRow) : null;
        const sell = data?.sell_order ? (data.sell_order || []).map(normalizeObRow) : null;
        const payload = {
          data,
          buyOrders: buy,
          sellOrders: sell,
          recentTrades: data?.recent_trades || null,
        };

        pendingSocketFlushRef.current = payload;
        const now = Date.now();
        const elapsed = now - socketLastFlushRef.current;
        if (elapsed >= SOCKET_UI_THROTTLE_MS || socketLastFlushRef.current === 0) {
          socketLastFlushRef.current = now;
          flushSocketToState(payload);
          pendingSocketFlushRef.current = null;
          if (socketThrottleTimerRef.current) {
            clearTimeout(socketThrottleTimerRef.current);
            socketThrottleTimerRef.current = null;
          }
        } else if (!socketThrottleTimerRef.current) {
          socketThrottleTimerRef.current = setTimeout(() => {
            socketThrottleTimerRef.current = null;
            socketLastFlushRef.current = Date.now();
            const pending = pendingSocketFlushRef.current;
            pendingSocketFlushRef.current = null;
            if (pending) flushSocketToState(pending);
          }, SOCKET_UI_THROTTLE_MS - elapsed);
        }
      }
    };

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
  }, [socket, isFocused, flushSocketToState]);

  const chartUri = useMemo(() => {
    const themeSlug = theme === "Dark" ? "dark" : "light";
    const symbol = `${pairBase}_${pairQuote}`;
    return `${CHART_WEB_BASE_URL}chart/${themeSlug}/${symbol}`;
  }, [theme, pairBase, pairQuote]);
  console.log(chartUri, '===chart uri====');


  const handleCurrencyChange = useCallback(
    (coin) => {
      dispatch(setSpotSelectedPair(coin));
      dispatch(setBuyOrders([]));
      dispatch(setSellOrders([]));
      setLastSocketData(null);
    },
    [dispatch]
  );
  // Cleaned up legacy effect as its logic is now merged into the unified subscription hook above.

  const [webViewReady, setWebViewReady] = useState(false);
  const [chartRevealed, setChartRevealed] = useState(false);
  const chartRevealDelayRef = useRef(null);
  const webViewReadyFallbackRef = useRef(null);

  const onChartLoaded = useCallback(() => {
    if (webViewReadyFallbackRef.current) {
      clearTimeout(webViewReadyFallbackRef.current);
      webViewReadyFallbackRef.current = null;
    }
    setWebViewReady(true);
  }, []);

  useEffect(() => {
    setWebViewReady(false);
    setChartRevealed(false);
  }, [chartUri]);

  useEffect(() => {
    if (!chartUri || webViewReady) return;
    if (webViewReadyFallbackRef.current) clearTimeout(webViewReadyFallbackRef.current);
    webViewReadyFallbackRef.current = setTimeout(() => {
      webViewReadyFallbackRef.current = null;
      setWebViewReady(true);
    }, 4000);
    return () => {
      if (webViewReadyFallbackRef.current) {
        clearTimeout(webViewReadyFallbackRef.current);
        webViewReadyFallbackRef.current = null;
      }
    };
  }, [chartUri, webViewReady]);

  useEffect(() => {
    if (!webViewReady) {
      setChartRevealed(false);
      if (chartRevealDelayRef.current) {
        clearTimeout(chartRevealDelayRef.current);
        chartRevealDelayRef.current = null;
      }
      return;
    }
    chartRevealDelayRef.current = setTimeout(() => {
      chartRevealDelayRef.current = null;
      setChartRevealed(true);
    }, 250);
    return () => {
      if (chartRevealDelayRef.current) {
        clearTimeout(chartRevealDelayRef.current);
        chartRevealDelayRef.current = null;
      }
    };
  }, [webViewReady]);

  const showSkeleton = !chartRevealed;
  const bg = themeColors.background ?? "transparent";
  const isNeg = Number(pairChange) < 0;
  const changeColor = isNeg ? themeColors.red : themeColors.green;

  const bidsAggregated = useMemo(() => {
    if (!buyOrders?.length) return [];
    const agg = aggregateOrderBookRows(buyOrders, orderBookAggStep);
    return agg.sort((a, b) => toFinite(b.price) - toFinite(a.price));
  }, [buyOrders, orderBookAggStep]);

  const asksAggregated = useMemo(() => {
    if (!sellOrders?.length) return [];
    const agg = aggregateOrderBookRows(sellOrders, orderBookAggStep);
    return agg.sort((a, b) => toFinite(a.price) - toFinite(b.price));
  }, [sellOrders, orderBookAggStep]);

  const bidsDisplay = useMemo(() => bidsAggregated, [bidsAggregated]);
  const asksDisplay = useMemo(() => asksAggregated, [asksAggregated]);

  // Binance-style depth heatmap uses cumulative volume (staircase look).
  const bidCum = useMemo(() => {
    let acc = 0;
    return bidsDisplay.map((o) => {
      acc += orderBookRemaining(o);
      return acc;
    });
  }, [bidsDisplay]);
  const askCum = useMemo(() => {
    let acc = 0;
    return asksDisplay.map((o) => {
      acc += orderBookRemaining(o);
      return acc;
    });
  }, [asksDisplay]);
  const maxBidCum = useMemo(() => (bidCum.length ? bidCum[bidCum.length - 1] : 0), [bidCum]);
  const maxAskCum = useMemo(() => (askCum.length ? askCum[askCum.length - 1] : 0), [askCum]);

  const formatPrice = useCallback((p) => {
    const n = Number(p);
    if (!Number.isFinite(n)) return "—";
    return String(toFixedFive(n));
  }, []);

  const formatWithCommas = useCallback((s) => {
    const str = String(s ?? "");
    if (!str || str === "—") return str;
    const [intPartRaw, decPart] = str.split(".");
    const sign = intPartRaw.startsWith("-") ? "-" : "";
    const intPart = sign ? intPartRaw.slice(1) : intPartRaw;
    const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${sign}${withSep}${decPart != null && decPart !== "" ? `.${decPart}` : ""}`;
  }, []);

  const formatPriceComma = useCallback(
    (p) => {
      const base = formatPrice(p);
      return formatWithCommas(base);
    },
    [formatPrice, formatWithCommas]
  );

  /** Merge REST pair snapshot with optional socket ticker (web TradeCenterSection parity). */
  const liveMarketStats = useMemo(() => {
    const base = {
      high: mergedPair?.high_24h ?? mergedPair?.high,
      low: mergedPair?.low_24h ?? mergedPair?.low,
      volume: mergedPair?.volume_24h ?? mergedPair?.volume ?? mergedPair?.base_volume,
      changeAbs: mergedPair?.change ?? mergedPair?.price_change_24h ?? mergedPair?.change_24hour,
      volQuote: mergedPair?.volumeQuote ?? mergedPair?.volume_quote ?? mergedPair?.quote_volume ?? mergedPair?.volume_24h_quote ?? mergedPair?.quoteVolume,
      last: mergedPair?.buy_price ?? mergedPair?.last_price ?? mergedPair?.price,
    };
    const d = exchangeData || lastSocketData;
    if (!d) return base;
    const t = d.ticker != null && typeof d.ticker === "object" ? d.ticker : null;
    const src = t || d;
    return {
      high: src.high_24h ?? src.high ?? src.h ?? base.high,
      low: src.low_24h ?? src.low ?? src.l ?? base.low,
      volume: src.volume_24h ?? src.volume ?? src.base_volume ?? src.v ?? base.volume,
      changeAbs: src.change ?? src.price_change_24h ?? src.change_24hour ?? src.changePercentage ?? base.changeAbs,
      volQuote: src.volumeQuote ?? src.volume_24h_quote ?? src.quote_volume ?? src.volume_quote ?? src.quoteVolume ?? src.q ?? base.volQuote,
      last: src.last ?? src.buy_price ?? src.last_price ?? src.price ?? src.c ?? base.last,
    };
  }, [exchangeData, lastSocketData, mergedPair]);

  const formatChangeAbsDisplay = useCallback(
    (raw) => {
      const n = Number(raw);
      if (!Number.isFinite(n)) return "—";
      const dec = Math.abs(n) >= 1000 ? 2 : Math.abs(n) >= 1 ? 4 : 6;
      const sign = n >= 0 ? "" : "-";
      const body = formatWithCommas(String(Math.abs(n).toFixed(dec)).replace(/\.?0+$/, ""));
      return `${sign}${body}`;
    },
    [formatWithCommas]
  );

  /** Volume formatter matching web TradeCenterSection: fallback to 0.00 instead of dash */
  const formatVolDisplay = useCallback(
    (val, decimals = 2) => {
      if (val == null || val === "" || isNaN(Number(val))) return "0.00";
      const num = Number(val);
      if (num === 0) return "0.00";
      return formatWithCommas(num.toFixed(decimals));
    },
    [formatWithCommas]
  );

  const stripDisplayPrice = liveMarketStats.last ?? pairPrice;

  // Web-style: never abbreviate Amount/Total (no K/M). Keep it readable with commas.
  const formatObQty = useCallback(
    (q) => {
      const n = Number(q);
      if (!Number.isFinite(n)) return "—";
      const fixed = n >= 1 ? n.toFixed(5) : n.toFixed(8);
      return formatWithCommas(fixed.replace(/\.?0+$/, ""));
    },
    [formatWithCommas]
  );

  const formatObTotal = useCallback(
    (v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return "—";
      const fixed = n.toFixed(2).replace(/\.?0+$/, "");
      return formatWithCommas(fixed);
    },
    [formatWithCommas]
  );

  const formatQty = useCallback((q) => {
    const n = Number(q);
    if (!Number.isFinite(n)) return "—";
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
    return n >= 1 ? n.toFixed(4) : n.toFixed(6);
  }, []);

  const formatTotal = useCallback((v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return "—";
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
    return n >= 1 ? n.toFixed(2) : n.toFixed(6);
  }, []);

  const depthRows = useMemo(() => {
    const rows = [];
    const hasAnyData = bidsDisplay.length > 0 || asksDisplay.length > 0;
    const maxLen = hasAnyData ? Math.max(bidsDisplay.length, asksDisplay.length, 20) : 5;
    for (let i = 0; i < maxLen; i++) {
      const bid = bidsDisplay[i] || null;
      const ask = asksDisplay[i] || null;
      const bidFillPct = maxBidCum > 0 ? Math.min(100, (Number(bidCum[i] || 0) / maxBidCum) * 100) : 0;
      const askFillPct = maxAskCum > 0 ? Math.min(100, (Number(askCum[i] || 0) / maxAskCum) * 100) : 0;
      if (orderBookViewMode === "both") {
        rows.push({ bid, ask, bidFillPct, askFillPct });
      } else if (orderBookViewMode === "bids") {
        rows.push({ bid, ask: null, bidFillPct, askFillPct: 0 });
      } else {
        rows.push({ bid: null, ask, bidFillPct: 0, askFillPct });
      }
    }
    return rows;
  }, [bidsDisplay, asksDisplay, orderBookViewMode, bidCum, askCum, maxBidCum, maxAskCum]);

  // Web "Total" column is per-row quote (price * amount), NOT cumulative.
  const rowQuoteTotal = useCallback((o) => orderBookRemaining(o) * toFinite(o?.price), []);

  // Ask rows: display in descending price order (web-like).
  const asksDisplayDesc = useMemo(() => {
    if (!asksDisplay?.length) return [];
    return [...asksDisplay].reverse();
  }, [asksDisplay]);

  // Prefer live best bid/ask from current order book; fallback to pair snapshot.
  const bestAsk = asksAggregated?.[0]?.price;
  const bestBid = bidsAggregated?.[0]?.price;
  const liveMid = Number.isFinite(Number(bestAsk)) && Number.isFinite(Number(bestBid)) ? (Number(bestAsk) + Number(bestBid)) / 2 : null;
  const midPrice = liveMid ?? mergedPair?.buy_price ?? mergedPair?.last ?? mergedPair?.price ?? null;

  const bidVolSum = useMemo(
    () => bidsDisplay.reduce((s, o) => s + orderBookRemaining(o), 0),
    [bidsDisplay]
  );
  const askVolSum = useMemo(
    () => asksDisplay.reduce((s, o) => s + orderBookRemaining(o), 0),
    [asksDisplay]
  );
  const totalVolBar = bidVolSum + askVolSum || 1;
  const bidPct = (bidVolSum / totalVolBar) * 100;

  const orderBookWebNode = useMemo(() => {
    const hasData = lastSocketData || buyOrders?.length > 0 || sellOrders?.length > 0;
    if (!hasData) return <OrderBookSkeleton rows={ORDER_BOOK_ROWS} />;

    return (
      <View style={{ paddingHorizontal: 12 }}>
        {/* Spread / Ratio Bar with RectangleGreen and RectangleRed */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6, marginTop: 4 }}>
          <AppText weight={SEMI_BOLD} style={{ color: "#38B781", fontSize: 13, marginRight: 8 }}>
            {`B ${bidPct.toFixed(2)}%`}
          </AppText>
          <View style={{ flex: 1, flexDirection: "row", height: 10, gap: 5, alignItems: "center" }}>
            <FastImage
              source={RectangleGreen}
              style={{ flex: Math.max(0.05, bidPct / 100), height: 10 }}
              resizeMode="stretch"
            />
            <FastImage
              source={RectangleRed}
              style={{ flex: Math.max(0.05, (100 - bidPct) / 100), height: 10 }}
              resizeMode="stretch"
            />
          </View>
          <AppText weight={SEMI_BOLD} style={{ color: "#ED4E4E", fontSize: 13, marginLeft: 8 }}>
            {`${(100 - bidPct).toFixed(2)}% S`}
          </AppText>
        </View>

        {/* Column Headers */}
        <View style={[styles.splitObHeader, { paddingHorizontal: 0, paddingVertical: 8, marginTop: 10 }]}>
          {orderBookViewMode === "both" ? (
            <>
              <View style={[styles.splitObHeaderCol, { justifyContent: "flex-start" }]}>
                <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.secondaryText }}>Buy Price</AppText>
              </View>
              <View style={[styles.splitObHeaderColMid, { justifyContent: "center" }]}>
                <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.secondaryText }}>Sell Price</AppText>
              </View>
            </>
          ) : (
            <View style={[styles.splitObHeaderCol, { justifyContent: "flex-start", flex: 1 }]}>
              <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.secondaryText }}>
                {orderBookViewMode === "bids" ? "Buy Price" : "Sell Price"}
              </AppText>
            </View>
          )}
          <View style={[styles.splitObHeaderCol, { justifyContent: "flex-end", flexDirection: "row", gap: 6, alignItems: "center", flex: orderBookViewMode === "both" ? 1 : 0 }]}>
            <TouchableOpacity onPress={cycleViewMode} activeOpacity={0.7} style={{ padding: 4, backgroundColor: isDark ? "#2A2A2A" : "#F3F4F6", borderRadius: 4 }}>
              <FastImage source={SPOT_OB_VIEW_ICONS[viewModeIndex]} style={{ width: 35, height: 35 }} resizeMode="contain" />
            </TouchableOpacity>
            <TouchableOpacity ref={aggTriggerRef} onPress={openAggMenu} activeOpacity={0.7} style={{ flexDirection: "row", alignItems: "center", backgroundColor: isDark ? "#2A2A2A" : "#F3F4F6", paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4, gap: 4 }}>
              <AppText type={ELEVEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{formatAggStepLabel(orderBookAggStep)}</AppText>
              <FastImage source={downIcon} style={{ width: 8, height: 8 }} resizeMode="contain" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Split Order Book Rows */}
        {orderBookViewMode === "both" ? (
          depthRows.map((row, i) => (
            <DepthRow
              key={i}
              bid={row.bid}
              ask={row.ask}
              bidFillPct={row.bidFillPct}
              askFillPct={row.askFillPct}
              themeColors={themeColors}
              isDark={isDark}
              formatPrice={formatPrice}
              formatQty={formatObQty}
            />
          ))
        ) : (
          ((orderBookViewMode === "bids" ? bidsDisplay : asksDisplay).length > 0
            ? (orderBookViewMode === "bids" ? bidsDisplay : asksDisplay)
            : Array(5).fill(null))
            .map((item, i) => {
              const rem = item ? orderBookRemaining(item) : 0;
              const maxCum = orderBookViewMode === "bids" ? maxBidCum : maxAskCum;
              const cumArr = orderBookViewMode === "bids" ? bidCum : askCum;
              const fillPct = maxCum > 0 ? Math.min(100, (Number(cumArr[i] || 0) / maxCum) * 100) : 0;
              const isAsk = orderBookViewMode === "asks";
              const depthColor = isAsk
                ? (isDark ? "rgba(232, 97, 97, 0.18)" : "rgba(255, 77, 79, 0.14)")
                : (isDark ? "rgba(0, 192, 118, 0.16)" : "rgba(0, 192, 118, 0.12)");
              const priceColor = isAsk ? themeColors.red : themeColors.green;

              return (
                <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 27, marginBottom: 0, position: "relative" }}>
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      right: 0,
                      width: `${fillPct > 0 ? Math.max(1, fillPct) : 0}%`,
                      backgroundColor: depthColor,
                    }}
                  />
                  <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.text, zIndex: 1, paddingLeft: 4 }}>
                    {item ? formatObQty(rem) : ""}
                  </AppText>
                  <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: priceColor, zIndex: 1, paddingRight: 4 }}>
                    {item ? formatPrice(item.price) : ""}
                  </AppText>
                </View>
              );
            })
        )}
      </View>
    );
  }, [
    asksDisplayDesc,
    asksDisplay,
    bidsDisplay,
    bidCum,
    askCum,
    maxBidCum,
    maxAskCum,
    rowQuoteTotal,
    formatPrice,
    formatQty,
    formatTotal,
    isDark,
    lastSocketData,
    buyOrders?.length,
    sellOrders?.length,
    midPrice,
    orderBookViewMode,
    pairBase,
    pairQuote,
    themeColors,
  ]);

  // (openAggMenu/closeAggMenu/selectAggStep removed)

  const goToSpotTradeSide = useCallback(
    (side) => {
      if (isEmbedded && onTradePress) {
        onTradePress(side === "SELL" ? "sell" : "buy");
        return;
      }
      navigation.navigate({
        name: routes.NAVIGATION_BOTTOM_TAB_STACK,
        params: {
          screen: routes.TRADE_SCREEN,
          params: { spotTradeSide: side, activeTab: tradeType },
        },
      });
    },
    [isEmbedded, navigation, onTradePress, tradeType]
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background, paddingTop: isEmbedded ? 0 : insets.top }]}>
      {!isEmbedded && <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={bg} />}

      {!isEmbedded && (
        <View style={[styles.header, { backgroundColor: themeColors.background }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
              <FastImage
                source={back_ic}
                style={styles.backIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerPairRow}
              onPress={() => setPairSheetVisible(true)}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <AppText
                weight={SEMI_BOLD}
                numberOfLines={1}
                style={[styles.headerTitle, { color: themeColors.text }]}
              >
                {pairBase}/{pairQuote}
              </AppText>
              <FastImage
                source={downIcon}
                style={styles.headerChevron}
                resizeMode="contain"
                tintColor={themeColors.text}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={toggleFavorite}
              style={styles.headerIconBtn}
              activeOpacity={0.7}
              disabled={favLoading}
            >
              {favLoading ? (
                <ActivityIndicator size="small" color={isFav ? "#FFD700" : themeColors.text} />
              ) : (
                isFav ? (
                  <FastImage
                    source={starFillIcon}
                    style={styles.headerIcon}
                    resizeMode="contain"
                  />
                ) : (
                  <FastImage
                    source={favUnCheck}
                    style={styles.headerIcon}
                    resizeMode="contain"
                    tintColor={'#EAEDF0'}
                  />
                )
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={onNotificationPress} style={styles.headerIconBtn} activeOpacity={0.7}>
              <FastImage
                source={bell_ic}
                style={styles.headerIcon}
                resizeMode="contain"
                tintColor={themeColors.text}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.body}>
        <ScrollView
          style={styles.scrollMain}
          contentContainerStyle={[
            styles.scrollMainContent,
            { paddingBottom: tabScrollBottomPadding },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {/* 24h stats summary header */}
          <View style={[styles.statsStrip, { borderBottomColor: themeColors.themeBorderColor }]}>
            <View style={styles.statsMainRow}>
              {/* Left Column: Big Price, Subtitle (USD + change%), and Badges */}
              <View style={styles.statsLeftCol}>
                <AppText weight={BOLD} style={{ fontSize: 28, color: changeColor, letterSpacing: -0.5 }} numberOfLines={1}>
                  {stripDisplayPrice != null && stripDisplayPrice !== "" ? formatPriceComma(stripDisplayPrice) : "—"}
                </AppText>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <AppText weight={MEDIUM} style={{ fontSize: 13, color: isDark ? "#FFFFFF" : themeColors.text }}>
                    {stripDisplayPrice != null && stripDisplayPrice !== "" ? `≈ $${formatPriceComma(stripDisplayPrice)}` : "—"}
                  </AppText>
                  <AppText weight={SEMI_BOLD} style={{ fontSize: 13, color: changeColor }}>
                    {mergedPair?.change_percentage != null
                      ? `${Number(mergedPair.change_percentage) >= 0 ? "+" : ""}${toFixedThree(Number(mergedPair.change_percentage))}%`
                      : "—"}
                  </AppText>
                </View>

                {/* <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }}>
                  <AppText weight={MEDIUM} style={{ fontSize: 11, color: colors.cyanTheme || "#0AA8C5" }}>
                    {`Rank #${mergedPair?.rank ?? 1}`}
                  </AppText>
                  <AppText weight={MEDIUM} style={{ fontSize: 11, color: colors.cyanTheme || "#0AA8C5" }}>
                    Top Volume
                  </AppText>
                  <AppText weight={MEDIUM} style={{ fontSize: 11, color: colors.cyanTheme || "#0AA8C5" }}>
                    Layer 1
                  </AppText>
                </View> */}
              </View>

              {/* Right Column: 4 stacked key-value rows */}
              <View style={styles.statsRightColsStack}>
                <View style={styles.statListRow}>
                  <AppText style={styles.statListLabel}>24h High</AppText>
                  <AppText weight={MEDIUM} style={[styles.statListValue, { color: themeColors.text }]}>
                    {liveMarketStats.high != null ? formatPriceComma(liveMarketStats.high) : "—"}
                  </AppText>
                </View>
                <View style={styles.statListRow}>
                  <AppText style={styles.statListLabel}>24h Low</AppText>
                  <AppText weight={MEDIUM} style={[styles.statListValue, { color: themeColors.text }]}>
                    {liveMarketStats.low != null && liveMarketStats.low !== "" ? formatPriceComma(liveMarketStats.low) : "—"}
                  </AppText>
                </View>
                <View style={styles.statListRow}>
                  <AppText style={styles.statListLabel}>{`24h Volume (${pairBase})`}</AppText>
                  <AppText weight={MEDIUM} style={[styles.statListValue, { color: themeColors.text }]} numberOfLines={1}>
                    {formatVolDisplay(liveMarketStats.volume, baseVolumeDecimals)}
                  </AppText>
                </View>
                <View style={styles.statListRow}>
                  <AppText style={styles.statListLabel}>{`24h Turnover (${pairQuote})`}</AppText>
                  <AppText weight={MEDIUM} style={[styles.statListValue, { color: themeColors.text }]} numberOfLines={1}>
                    {formatVolDisplay(liveMarketStats.volQuote, quoteVolumeDecimals)}
                  </AppText>
                </View>
              </View>
            </View>
          </View>


          <View style={{ width: windowWidth, overflow: "hidden" }}>
            <Animated.View
              style={{
                flexDirection: "row",
                width: windowWidth * 2,
                transform: [{ translateX: topTabX }],
              }}
            >
              <View style={{ width: windowWidth }}>
                <View style={[styles.chartWrap, { width: windowWidth, height: chartHeight, backgroundColor: themeColors.background }]}>
                  <View
                    style={[
                      styles.chartWebWrap,
                      {
                        width: windowWidth,
                        height: chartHeight,
                        opacity: showSkeleton ? 0 : 1,
                        backgroundColor: themeColors.background,
                      },
                    ]}
                    pointerEvents={showSkeleton ? "none" : "auto"}
                  >
                    {chartUri ? (
                      <WebView
                        key={chartUri}
                        source={{ uri: chartUri }}
                        style={{ width: windowWidth, height: chartHeight, backgroundColor: themeColors.background }}
                        containerStyle={{ backgroundColor: "transparent" }}
                        opaque={false}
                        androidLayerType="hardware"
                        cacheEnabled
                        cacheMode="LOAD_CACHE_ELSE_NETWORK"
                        mixedContentMode="compatibility"
                        allowsInlineMediaPlayback
                        mediaPlaybackRequiresUserAction={false}
                        javaScriptEnabled
                        domStorageEnabled
                        scrollEnabled={false}
                        bounces={false}
                        sharedCookiesEnabled
                        javaScriptEnabledAndroid
                        scalesPageToFit={false}
                        automaticallyAdjustContentInsets={false}
                        setSupportMultipleWindows={false}
                        overScrollMode="never"
                        onLoadEnd={onChartLoaded}
                      />
                    ) : null}
                  </View>
                  {showSkeleton ? (
                    <View style={styles.chartSkeletonOverlay} pointerEvents="none">
                      <ChartSkeleton height={chartHeight} width={windowWidth} />
                    </View>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.obTabsRow,
                    {
                      paddingHorizontal: 12,
                      paddingVertical: 0,
                      marginBottom: 0,
                      marginTop: 0,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: themeColors.themeBorderColor,
                    },
                  ]}
                >
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.obTabsLeft}
                    style={styles.obTabsLeftScroll}
                    keyboardShouldPersistTaps="handled"
                  >
                    {CHART_BOTTOM_TABS?.map((tab) => (
                      <TouchableOpacity
                        key={tab}
                        activeOpacity={0.7}
                        onPress={() => handleTabChange(tab)}
                        style={[
                          styles.obTab,
                          { paddingHorizontal: 6, paddingVertical: 8, backgroundColor: "transparent" }
                        ]}
                      >
                        <AppText
                          type={FOURTEEN}
                          weight={activeTab === tab ? BOLD : SEMI_BOLD}
                          style={{ color: activeTab === tab ? themeColors.text : themeColors.secondaryText }}
                        >
                          {tab}
                        </AppText>
                        {activeTab === tab && (
                          <View style={{ position: "absolute", bottom: 0, width: 22, height: 3, backgroundColor: isDark ? "#FFFFFF" : "#000000", }} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <Modal visible={orderBookAggOpen} transparent animationType="fade" onRequestClose={closeAggMenu}>
                  <Pressable style={styles.aggModalBackdrop} onPress={closeAggMenu} />
                  {aggMenuLayout ? (
                    <View
                      style={[
                        styles.aggMenuPopover,
                        {
                          top: aggMenuLayout.y + aggMenuLayout.h + 4,
                          left: Math.max(8, Math.min(aggMenuLayout.x + aggMenuLayout.w - 160, Width - 8 - 160)),
                          backgroundColor: isDark ? colors.newThemeColor : "rgba(0,0,0,0.05)",
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
                              styles.aggMenuRow,
                              selected && { backgroundColor: isDark ? colors.themeElevationColor : "rgba(0,0,0,0.02)" },
                            ]}
                            activeOpacity={0.7}
                            onPress={() => selectAggStep(opt)}
                          >
                            <AppText type={TEN} style={{ color: themeColors.text, fontSize: 11, lineHeight: 14 }}>
                              {formatAggStepLabel(opt)}
                            </AppText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : null}
                </Modal>

                {/* Slide-in animation on tab press (renders 2 panels only during animation). */}
                {bottomSlidePair ? (
                  <View style={{ width: Width, overflow: "hidden" }}>
                    <Animated.View
                      style={{
                        flexDirection: "row",
                        width: Width * 2,
                        transform: [{ translateX: bottomSlideX }],
                      }}
                    >
                      <View style={{ width: Width }}>
                        {bottomSlidePair.from === "Order Book" ? (
                          <View style={{ width: Width, paddingHorizontal: 12 }}>
                            {orderBookWebNode}
                          </View>
                        ) : bottomSlidePair.from === "Market Trades" ? (
                          <View style={{ width: Width, paddingHorizontal: 12 }}>
                            <View style={styles.mtContainer}>
                              <View style={styles.mtHeader}>
                                <AppText
                                  type={TWELVE}
                                  style={[styles.mtCell, { color: themeColors.secondaryText, textAlign: "left" }]}
                                >
                                  Price({pairQuote})
                                </AppText>
                                <AppText
                                  type={TWELVE}
                                  style={[styles.mtCell, { color: themeColors.secondaryText, textAlign: "center" }]}
                                >
                                  Quantity({pairBase})
                                </AppText>
                                <AppText
                                  type={TWELVE}
                                  style={[styles.mtCell, { color: themeColors.secondaryText, textAlign: "right" }]}
                                >
                                  Time
                                </AppText>
                              </View>
                              <View>
                                {recentTrades?.length > 0 ? (
                                  recentTrades?.slice(0, 50)?.map((item, index) => (
                                    <View key={item?._id || index} style={styles.mtRow}>
                                      <AppText
                                        type={TWELVE}
                                        weight={SEMI_BOLD}
                                        style={[
                                          styles.mtCell,
                                          {
                                            color:
                                              item?.side === "BUY"
                                                ? themeColors.green || "#00c076"
                                                : themeColors.red || "#ff3b30",
                                            textAlign: "left",
                                          },
                                        ]}
                                      >
                                        {String(item?.price || 0)}
                                      </AppText>
                                      <AppText
                                        type={TWELVE}
                                        weight={SEMI_BOLD}
                                        style={[styles.mtCell, { color: themeColors.text || "#000", textAlign: "center" }]}
                                      >
                                        {String(item?.quantity || 0)}
                                      </AppText>
                                      <AppText
                                        type={TWELVE}
                                        weight={SEMI_BOLD}
                                        style={[
                                          styles.mtCell,
                                          { color: themeColors.secondaryText || "#888", textAlign: "right" },
                                        ]}
                                      >
                                        {formatRecentTradeTime(item)}
                                      </AppText>
                                    </View>
                                  ))
                                ) : (
                                  <View style={styles.noDataContainer}>
                                    <AppText type={TEN} style={{ color: themeColors.secondaryText }}>
                                      No market trades yet
                                    </AppText>
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>
                        ) : (
                          <View style={{ width: Width, paddingHorizontal: 12 }}>
                            <View style={styles.assetsContainer}>
                              {!userData ? (
                                <View style={styles.noDataContainer}>
                                  <AppText
                                    type={TEN}
                                    style={{ color: themeColors.secondaryText, marginBottom: 10 }}
                                  >
                                    Please login to view your wallets
                                  </AppText>
                                  <TouchableOpacity
                                    style={[styles.loginBtn, {
                                      backgroundColor: colors.cyanTheme,
                                    }]}
                                    onPress={() => NavigationService.navigate(routes.LOGIN_SCREEN)}
                                  >
                                    <AppText type={TEN} weight={SEMI_BOLD} style={{ color: "#fff" }}>
                                      Login
                                    </AppText>
                                  </TouchableOpacity>
                                </View>
                              ) : renderAssetsTabContent()}
                            </View>
                          </View>
                        )}
                      </View>

                      <View style={{ width: Width }}>
                        {bottomSlidePair.to === "Order Book" ? (
                          <View style={{ width: Width, paddingHorizontal: 12 }}>
                            {orderBookWebNode}
                          </View>
                        ) : bottomSlidePair.to === "Market Trades" ? (
                          <View style={{ width: Width, paddingHorizontal: 12 }}>
                            <View style={styles.mtContainer}>
                              <View style={styles.mtHeader}>
                                <AppText type={TWELVE} style={[styles.mtCell, { color: themeColors.secondaryText, textAlign: "left" }]}>
                                  Price({pairQuote})
                                </AppText>
                                <AppText type={TWELVE} style={[styles.mtCell, { color: themeColors.secondaryText, textAlign: "center" }]}>
                                  Quantity({pairBase})
                                </AppText>
                                <AppText type={TWELVE} style={[styles.mtCell, { color: themeColors.secondaryText, textAlign: "right" }]}>
                                  Time
                                </AppText>
                              </View>
                              <View>
                                {recentTrades?.length > 0 ? (
                                  recentTrades?.slice(0, 50)?.map((item, index) => (
                                    <View key={item?._id || index} style={styles.mtRow}>
                                      <AppText
                                        type={TWELVE}
                                        weight={SEMI_BOLD}
                                        style={[
                                          styles.mtCell,
                                          {
                                            color:
                                              item?.side === "BUY"
                                                ? themeColors.green || "#00c076"
                                                : themeColors.red || "#ff3b30",
                                            textAlign: "left",
                                          },
                                        ]}
                                      >
                                        {String(item?.price || 0)}
                                      </AppText>
                                      <AppText type={TWELVE} weight={SEMI_BOLD} style={[styles.mtCell, { color: themeColors.text || "#000", textAlign: "center" }]}>
                                        {String(item?.quantity || 0)}
                                      </AppText>
                                      <AppText
                                        type={TWELVE}
                                        weight={SEMI_BOLD}
                                        style={[styles.mtCell, { color: themeColors.secondaryText || "#888", textAlign: "right" }]}
                                      >
                                        {formatRecentTradeTime(item)}
                                      </AppText>
                                    </View>
                                  ))
                                ) : (
                                  <View style={styles.noDataContainer}>
                                    <FastImage source={NO_NOTIFICATION_ICON} resizeMode="contain" style={{ width: 80, height: 80 }} />
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>
                        ) : (
                          <View style={{ width: Width, paddingHorizontal: 12 }}>
                            <View style={styles.assetsContainer}>
                              {!userData ? (
                                <View style={styles.noDataContainer}>
                                  <AppText type={TEN} style={{ color: themeColors.secondaryText, marginBottom: 10 }}>
                                    Please login to view your wallets
                                  </AppText>
                                  <TouchableOpacity style={[styles.loginBtn, {
                                    backgroundColor: colors.cyanTheme,
                                  }]} onPress={() => NavigationService.navigate(routes.LOGIN_SCREEN)}>
                                    <AppText type={TEN} weight={SEMI_BOLD} style={{ color: "#fff" }}>
                                      Login
                                    </AppText>
                                  </TouchableOpacity>
                                </View>
                              ) : renderAssetsTabContent()}
                            </View>
                          </View>
                        )}
                      </View>
                    </Animated.View>
                  </View>
                ) : (
                  /* One panel mounted at a time — avoids tallest-tab stretching. */
                  <View style={styles.chartBottomTabBody}>
                    {mountedTab === "Order Book" ? (
                      <View style={{ width: Width, paddingHorizontal: 12 }}>
                        {orderBookWebNode}
                      </View>
                    ) : null}
                    {mountedTab === "Market Trades" ? (
                      <View style={{ width: Width, paddingHorizontal: 12 }}>
                        <View style={styles.mtContainer}>
                          <View style={styles.mtHeader}>
                            <AppText type={TWELVE} weight={SEMI_BOLD} style={[styles.mtCell, { color: themeColors.secondaryText, textAlign: "left" }]}>
                              Price({pairQuote})
                            </AppText>
                            <AppText type={TWELVE} weight={SEMI_BOLD} style={[styles.mtCell, { color: themeColors.secondaryText, textAlign: "center" }]}>
                              Quantity({pairBase})
                            </AppText>
                            <AppText type={TWELVE} weight={SEMI_BOLD} style={[styles.mtCell, { color: themeColors.secondaryText, textAlign: "right" }]}>
                              Time
                            </AppText>
                          </View>
                          <View>
                            {recentTrades?.length > 0 ? (
                              recentTrades?.slice(0, 50)?.map((item, index) => (
                                <View key={item?._id || index} style={styles.mtRow}>
                                  <AppText
                                    type={TWELVE}
                                    weight={SEMI_BOLD}
                                    style={[
                                      styles.mtCell,
                                      {
                                        color:
                                          item?.side === "BUY"
                                            ? themeColors.green || "#00c076"
                                            : themeColors.red || "#ff3b30",
                                        textAlign: "left",
                                      },
                                    ]}
                                  >
                                    {String(item?.price || 0)}
                                  </AppText>
                                  <AppText type={TWELVE} weight={SEMI_BOLD} style={[styles.mtCell, { color: themeColors.text || "#000", textAlign: "center" }]}>
                                    {String(item?.quantity || 0)}
                                  </AppText>
                                  <AppText
                                    type={TWELVE}
                                    weight={SEMI_BOLD}
                                    style={[styles.mtCell, { color: themeColors.secondaryText || "#888", textAlign: "right" }]}
                                  >
                                    {formatRecentTradeTime(item)}
                                  </AppText>
                                </View>
                              ))
                            ) : (
                              <View style={styles.noDataContainer}>
                                <AppText type={TEN} style={{ color: themeColors.secondaryText }}>
                                  No market trades yet
                                </AppText>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    ) : null}
                    {mountedTab === "Assets" ? (
                      <View style={{ width: Width, paddingHorizontal: 12 }}>
                        <View style={styles.assetsContainer}>
                          {!userData ? (
                            <View style={styles.noDataContainer}>
                              <AppText type={TEN} style={{ color: themeColors.secondaryText, marginBottom: 10 }}>
                                Please login to view your wallets
                              </AppText>
                              <TouchableOpacity style={[styles.loginBtn, {
                                backgroundColor: colors.cyanTheme,
                              }]} onPress={() => NavigationService.navigate(routes.LOGIN_SCREEN)}>
                                <AppText type={TEN} weight={SEMI_BOLD} style={{ color: "#fff" }}>
                                  Login
                                </AppText>
                              </TouchableOpacity>
                            </View>
                          ) : renderAssetsTabContent()}
                        </View>
                      </View>
                    ) : null}
                  </View>
                )}
              </View>
              <View style={{ width: Width, paddingHorizontal: 12, paddingVertical: 14 }}>
                <View style={styles.infoTopRow}>
                  <View style={styles.infoCoinRow}>
                    <View style={styles.infoCoinIconWrap}>
                      {mergedPair?.icon_path ? (
                        <FastImage
                          source={{ uri: `${IMAGE_BASE_URL}${mergedPair.icon_path}` }}
                          style={styles.infoCoinIcon}
                          resizeMode="contain"
                        />
                      ) : (
                        <AppText style={{ color: themeColors.text, fontWeight: "800" }}>
                          {String(pairBase || "?").slice(0, 1).toUpperCase()}
                        </AppText>
                      )}
                    </View>
                    <AppText style={[styles.infoCoinName, { color: themeColors.text }]} numberOfLines={1}>
                      {pairBase || "—"}
                    </AppText>
                  </View>
                </View>

                <View style={styles.infoList}>
                  <View style={styles.infoListRow}>
                    <AppText style={[styles.infoKey, { color: themeColors.secondaryText }]}>Total Supply</AppText>
                    <AppText style={[styles.infoVal, { color: themeColors.text }]}>N/A</AppText>
                  </View>
                  <View style={styles.infoListRow}>
                    <AppText style={[styles.infoKey, { color: themeColors.secondaryText }]}>Circulating Supply</AppText>
                    <AppText style={[styles.infoVal, { color: themeColors.text }]}>N/A</AppText>
                  </View>
                  <View style={styles.infoListRow}>
                    <AppText style={[styles.infoKey, { color: themeColors.secondaryText }]}>Volume</AppText>
                    <AppText style={[styles.infoVal, { color: themeColors.text }]}>
                      {mergedPair?.volume_quote != null
                        ? `${formatWithCommas(twoFixedTwo(mergedPair.volume_quote))} ${pairQuote}`
                        : volume != null
                          ? `${formatWithCommas(twoFixedTwo(volume))} ${pairQuote}`
                          : "N/A"}
                    </AppText>
                  </View>
                  <View style={styles.infoListRow}>
                    <AppText style={[styles.infoKey, { color: themeColors.secondaryText }]}>Issue Date</AppText>
                    <AppText style={[styles.infoVal, { color: themeColors.text }]}>N/A</AppText>
                  </View>
                </View>

                <AppText style={[styles.infoSectionTitle, { color: themeColors.secondaryText }]}>Information</AppText>
              </View>
            </Animated.View>
          </View>

          {/* //// */}
        </ScrollView>
      </View >
      {/* 
      <View
        style={[
          styles.chartBottomBar,
          {
            backgroundColor: themeColors.background,
            paddingBottom: Math.max(insets.bottom, 10),
            paddingHorizontal: 14,
          },
        ]}
      >
        <View style={styles.chartBottomBtnsWrap}>
          <TouchableOpacity
            style={[
              styles.chartBottomBtn,
              styles.chartBottomBtnBuySell,
              { backgroundColor: themeColors.spotTradeBuy ?? themeColors.green },
            ]}
            onPress={() => goToSpotTradeSide("BUY")}
            activeOpacity={0.88}
          >
            <AppText weight={SEMI_BOLD} style={{ color: themePalette.white, fontSize: 15 }}>
              {tradeType === "Margin" ? "Margin Buy" : "Buy"}
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.chartBottomBtn,
              styles.chartBottomBtnBuySell,
              { backgroundColor: themeColors.spotTradeSell ?? themeColors.red },
            ]}
            onPress={() => goToSpotTradeSide("SELL")}
            activeOpacity={0.88}
          >
            <AppText weight={SEMI_BOLD} style={{ color: themePalette.white, fontSize: 15 }}>
              {tradeType === "Margin" ? "Margin Sell" : "Sell"}
            </AppText>
          </TouchableOpacity>
        </View>
      </View> */}

      <TradingDataModal
        visible={pairSheetVisible}
        onClose={() => setPairSheetVisible(false)}
        setCurrency={handleCurrencyChange}
        isDark={isDark}
        theme={theme}
      />
    </View >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,

  },
  body: {
    flex: 1,
  },
  chartBottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingTop: 12,
  },
  chartBottomLeftIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingRight: 5,
    flexShrink: 0,
  },
  chartBottomIconItem: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 42,
    paddingHorizontal: 2,
  },
  chartBottomIconImageWrap: {
    opacity: 0.72,
  },
  chartBottomIcon: {
    width: 16,
    height: 16,
  },
  chartBottomIconLabel: {
    fontSize: 10,
    marginTop: 3,
    fontWeight: "600",
  },
  chartBottomBtnsWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  chartBottomBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 999,
  },
  chartBottomBtnBuySell: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 96,
  },
  scrollMain: {
    flex: 1,
  },
  scrollMainContent: {
    flexGrow: 1,
  },
  chartBottomTabBody: {
    width: Width,
    alignSelf: "center",
    marginTop: 10
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 18,
    paddingBottom: 10,
    // borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    width: 35,
    height: 35,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    minWidth: 0,
    paddingRight: 8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIcon: {
    width: 20,
    height: 20,
  },
  headerPairRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    marginLeft: 2,
    paddingRight: 4,
  },
  headerTitle: {
    fontSize: 18,
    letterSpacing: 0.15,
    flexShrink: 1,
  },
  headerChevron: {
    width: 11,
    height: 11,
    marginLeft: 5,
    marginTop: 1,
  },
  topTabsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 0,
    gap: 10,
  },
  topTabBtn: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  topTabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  topTabUnderline: {
    height: 3,
    width: 16,
    borderRadius: 999,
    marginTop: 8,
    alignSelf: "center",
  },
  topTabUnderlineSpacer: {
    height: 3,
    width: 16,
    marginTop: 8,
    backgroundColor: "transparent",
    alignSelf: "center",
  },
  statsStrip: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statsMainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  statsLeftCol: {
    flex: 1.1,
    minWidth: 0,
    paddingRight: 6,
  },
  statsRightColsStack: {
    flex: 1,
    justifyContent: "space-between",
    paddingLeft: 6,
    minWidth: 0,
  },
  statListRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  statListLabel: {
    fontSize: 12,
    color: "#8E8E93",
  },
  statListValue: {
    fontSize: 12,
    textAlign: "right",
  },
  statsCol: {
    flex: 1,
    minWidth: 0,
  },
  statKV: {
    minWidth: 0,
  },
  statKVGap: {
    marginTop: 10,
  },
  statKVLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  statKVValue: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 16,
  },
  statKVValueMuted: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "500",
  },
  statChangeSectionTitle: {
    marginTop: 8,
    lineHeight: 14,
    fontSize: 13,
  },
  statChangeRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  statChangePct: {
    fontSize: 14,
    fontWeight: "700",
  },
  statChangeAbs: {
    fontSize: 14,
    fontWeight: "600",
  },
  infoCard: {
    borderRadius: 12,
    padding: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  infoTopRow: {
    paddingTop: 2,
    paddingBottom: 14,
  },
  infoCoinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoCoinIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(128,128,128,0.12)",
  },
  infoCoinIcon: {
    width: 28,
    height: 28,
  },
  infoCoinName: {
    fontSize: 16,
    flexShrink: 1,
  },
  infoList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.18)",
    paddingTop: 14,
  },
  infoListRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 7,
  },
  infoKey: {
    fontSize: 11,
  },
  infoVal: {
    fontSize: 12,
  },
  infoSectionTitle: {
    marginTop: 26,
    fontSize: 14,
  },
  statMainPrice: {
    fontSize: 17,
    fontFamily: SEMI_BOLD,
  },
  statTrendIcon: {
    width: 9,
    height: 9,
  },
  chartWrap: {
    width: Width,
    position: "relative",
    overflow: "hidden",
  },
  chartSkeletonOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    backgroundColor: "transparent",
  },
  chartWebWrap: {
    width: Width,
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  obTabsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingVertical: 8,
  },
  obTabsLeftScroll: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  obTabsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  obAggTrigger: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
    flexShrink: 0,
  },
  obAggCaret: {
    width: 10,
    height: 10,
  },
  aggModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  aggMenuPopover: {
    position: "absolute",
    width: 160,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  aggMenuRow: {
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  obTab: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    minWidth: 50,
    borderRadius: 10,
  },
  obTabActive: {
    // backgroundColor overridden inline to match theme
  },
  obRatioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  obRatioPill: {
    flex: 1,
    height: 24,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  obColHeader: {
    flexDirection: "row",
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  obColH: {
    fontWeight: "600",


  },
  precisionContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",

    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  precisionIcon: {
    width: 7,
    height: 7,
  },
  depthRow: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 27,
    marginBottom: 0,
    gap: 0,
  },
  depthBidSide: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 0,
  },
  depthAskSide: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingLeft: 0,
  },
  depthQty: {
    width: 60,
  },
  depthBidGradWrap: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 2,
  },
  depthAskGradWrap: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 2,
  },
  depthGradInner: {
    flex: 1,
    minHeight: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 2,
    paddingVertical: 2,
  },
  depthAskInner: {
    justifyContent: "flex-start",
    paddingRight: 0,
    paddingLeft: 2,
  },
  depthBidPrice: {
    paddingRight: 0,
    marginRight: 0,
    textAlign: "right",
    flex: 1,
  },
  depthAskPrice: {
    paddingLeft: 0,
    marginLeft: 0,
    textAlign: "left",
    flex: 1,
  },
  depthMidRule: {
    width: 0,
    backgroundColor: "transparent",
    marginHorizontal: 2, // Slight gap for clarity
  },
  webObHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.12)",
    marginBottom: 4,
  },
  webObHeaderCell: {
    flex: 1,
    fontWeight: "600",
  },
  webObRow: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 19,
    marginBottom: 1,
  },
  webObCellPrice: {
    flex: 1,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "left",
    paddingRight: 6,
  },
  webObCellTotalWrap: {
    flex: 1,
  },
  webObCellTotalInner: {
    flex: 1,
    minHeight: 18,
    justifyContent: "center",
    borderRadius: 2,
  },
  webObCellTotal: {
    fontSize: 10,
    fontWeight: "600",
    textAlign: "right",
    paddingHorizontal: 4,
  },
  webObCellAmt: {
    flex: 1,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
    paddingLeft: 6,
  },
  webObMidRow: {
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  webObMidLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  webObMidPrice: {
    fontSize: 16,
    letterSpacing: 0.15,
  },
  webObMidArrow: {
    width: 12,
    height: 12,
    marginTop: 2,
  },
  webObMidSubRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15,
    gap: 5
  },
  webObMidSub: {
    fontWeight: "600",
  },
  webObMidChevron: {
    width: 14,
    height: 14,
  },
  mtContainer: {
    marginTop: 4,
  },
  mtHeader: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.1)",
    marginBottom: 4,
  },
  mtRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 27,
  },
  mtCell: {
    flex: 1,
  },
  noDataContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  assetsContainer: {
    marginTop: 4,
  },
  assetsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  assetsHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  transferBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(0,192,118,0.3)",
  },
  assetsActionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  assetActionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  assetsListHeader: {
    flexDirection: "row",
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.1)",
    marginBottom: 8,
  },
  assetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  assetInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  assetIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  loginBtn: {

    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  spreadInfo: {
    marginTop: 8,
    marginBottom: 6,
  },
  ratioBar: {
    flexDirection: "row",
    height: 16,
    borderRadius: 2,
    overflow: "hidden",
    gap: 1,
  },
  ratioLeft: {
    justifyContent: "center",
    alignItems: "center",
    height: 16,
  },
  ratioRight: {
    justifyContent: "center",
    alignItems: "center",
    height: 16,
  },
  splitObHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    marginBottom: 6,
    borderBottomWidth: 0,
    borderBottomColor: "#FFFFFF", // Clear white divider
  },
  splitObHeaderCol: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    fontSize: 12,
    color: "#000",
  },
  splitObHeaderColMid: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    fontSize: 12,
    color: "#000",
    paddingHorizontal: 0, // Sync with price column spacing
  },
  headerChevronSmall: {
    width: 7,
    height: 7,
    marginLeft: 1,
    marginTop: 1,
  },
});

export default SpotChartScreen;
