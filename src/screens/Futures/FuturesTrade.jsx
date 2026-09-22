import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions, TextInput, Modal, Pressable, Animated, FlatList, Platform, ToastAndroid, Alert, Keyboard, ActivityIndicator, InteractionManager } from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import { setFuturesData } from "../../slices/homeSlice";
import FastImage from 'react-native-fast-image';
import Svg, { Path, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import { TrendingUp, ShoppingCart, Target, Check, Circle as LucideCircle, Gem, X, Info } from 'lucide-react-native';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import RBSheet from 'react-native-raw-bottom-sheet';
import AnimatedBottomSheet from '../../common/AnimatedBottomSheet/AnimatedBottomSheet';
import FuturePairList from './FuturePairList';
import FutureChartScreen from './FutureChartScreen';
import { useFuturesSocket } from './useFuturesSocket';
import { AppText, BOLD, MEDIUM, SEMI_BOLD, TWELVE, FOURTEEN, SIXTEEN, TEN, THIRTEEN, Button } from '../../shared';
import { useTheme } from '../../hooks/useTheme';
import { colors, darkTheme } from '../../theme/colors';
import ToggleSwitch from '../../common/ToggleSwitch';
import PercentQuickSelect from '../../shared/components/PercentQuickSelect';
import {
  back_ic,
  downIcon,
  printIcon,
  INFO,
  limitTrade,
  market_ic,
  spotLimitTrade,
  spotMarket,
  tick,
  REMOVE,
  closeIcon,
  candle,
  history_line,
  add,
  order_1,
  order_2,
  order_3,
  NO_NOTIFICATION_ICON,
  right_ic,
  defaultTrade,
  historyIcon
} from '../../helper/ImageAssets';
import { fontFamilyMedium, fontFamilySemiBold } from '../../theme/typography';
import {
  computeFuturesLeverageStats,
  formatPriceByTick,
  formatQtyByStep,
  getDecimalPlaces,
  getOrderBookAggOptionsForPair,
  aggregateOrderBookRows,
  normalizeOrderbookOrders,
  getTickSize,
  getStepSize,
  sanitizeIncrementInput,
  resolveTakerFeeRate,
  computeMaxOpenNotional,
  computePosition,
  computeClosedPosition
} from '../../helper/futuresUtils';
import moment from 'moment';
import FuturesHistorySection from './components/FuturesHistorySection';
import { LogBox } from 'react-native';
import { getUserFuturesWallet, getOpenOrders } from '../../actions/walletActions';
import { IMAGE_BASE_URL } from '../../helper/Constants';
import { buildCoinImageUri } from '../../helper/coinIconUrl';
import CoinIcon from '../../common/CoinIcon';
import { appOperation } from '../../appOperation';
import { CUSTOMER_TYPE } from '../../appOperation/types';
import SimpleToast from 'react-native-simple-toast';
import NavigationService from '../../navigation/NavigationService';
import { NAVIGATION_AUTH_STACK, KYC_STATUS_SCREEN, LOGIN_SCREEN } from '../../navigation/routes';
import { showError } from '../../helper/logger';
import {
  futuresErrSelectPair,
  futuresErrInvalidSize,
  futuresErrPriceForValue,
  futuresErrInvalidLimitPrice,
  futuresErrInvalidTrigger,
  futuresErrGeneric,
  formatFuturesApiError,
  futuresErrTpBuy,
  futuresErrTpSell,
  futuresErrSlBuy,
  futuresErrSlSell,
} from './futuresOrderMessages';

LogBox.ignoreLogs([
  'VirtualizedLists should never be nested inside plain ScrollViews',
  'useInsertionEffect must not schedule updates'
]);

const { width: Width, height: Height } = Dimensions.get('window');

function getLeverageOptions(maxLeverage) {
  const max = Math.max(1, Number(maxLeverage) || 125);
  let milestones = [];
  if (max <= 10) {
    milestones = [1, 2, 3, 5, 10];
  } else if (max <= 20) {
    milestones = [2, 3, 5, 10, 15, 20];
  } else if (max <= 50) {
    milestones = [5, 10, 15, 20, 25, 50];
  } else if (max <= 75) {
    milestones = [5, 10, 20, 25, 50, 75];
  } else if (max <= 100) {
    milestones = [5, 10, 20, 50, 75, 100];
  } else if (max <= 125) {
    milestones = [5, 10, 20, 50, 75, 100, 125];
  } else if (max <= 150) {
    milestones = [5, 10, 20, 50, 75, 100, 125, 150];
  } else {
    milestones = [5, 10, 20, 50, 75, 100, 125, 150, max];
  }

  const list = milestones.filter((x) => x <= max);
  if (!list.includes(max)) {
    list.push(max);
  }
  return Array.from(new Set(list)).sort((a, b) => a - b);
}

const SHIMMER_STRIP_WIDTH_DEFAULT = 240;

const ShimmerBox = ({
  width = "100%",
  height = 15,
  borderRadius = 4,
  style,
  shimmerDuration = 1800,
  shimmerStripWidth,
  shimmerToValue,
  shimmerColorsOverride
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
        toValue: shimmerToValue !== undefined ? shimmerToValue : (Width + stripW),
        duration: shimmerDuration,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) run();
      });
    };
    run();
    return () => shimmerX.stopAnimation();
  }, [shimmerX, stripW, isDark]);
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

const ORDER_BOOK_VISIBLE_ROWS = 6;
const ORDER_BOOK_ROW_LAYOUT_HEIGHT = 28;
const ORDER_BOOK_LIST_MAX_HEIGHT = ORDER_BOOK_VISIBLE_ROWS * ORDER_BOOK_ROW_LAYOUT_HEIGHT;

const OrderBookSkeleton = () => {
  const ROWS = ORDER_BOOK_VISIBLE_ROWS;
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

const OrderBookAskRow = React.memo(({ item: ask, maxVolume, themeColors, isDark, selectedCoin, precision, styles }) => {
  if (ask.isPlaceholder) {
    return (
      <View style={styles.obRow}>
        <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.secondaryText, opacity: 0.15 }}>—</AppText>
        <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.secondaryText, opacity: 0.15 }}>—</AppText>
      </View>
    );
  }
  const ratio = Math.min(100, ((Number(ask.remaining) || 0) / (maxVolume || 1)) * 100);
  const priceDecimals = Math.max(getDecimalPlaces(precision || getTickSize(selectedCoin)), 0);
  const qtyDecimals = Math.max(getDecimalPlaces(getStepSize(selectedCoin)), 0);
  const formattedPrice = Number.isFinite(Number(ask.price)) ? Number(ask.price).toFixed(priceDecimals) : '—';
  const formattedQty = Number.isFinite(Number(ask.remaining)) ? Number(ask.remaining).toFixed(qtyDecimals) : '—';

  return (
    <View style={[styles.obRow, { position: 'relative', overflow: 'hidden' }]}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: `${ratio > 0 ? Math.max(2, ratio) : 0}%`,
          backgroundColor: isDark ? "rgba(232, 97, 97, 0.18)" : "rgba(255, 77, 79, 0.14)",
        }}
      />
      <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: colors.red }}>
        {formattedPrice}
      </AppText>
      <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
        {formattedQty}
      </AppText>
    </View>
  );
}, (prev, next) => prev.item.price === next.item.price && prev.item.remaining === next.item.remaining && prev.maxVolume === next.maxVolume && prev.precision === next.precision && prev.isDark === next.isDark);

const OrderBookBidRow = React.memo(({ item: bid, maxVolume, themeColors, isDark, selectedCoin, precision, styles }) => {
  if (bid.isPlaceholder) {
    return (
      <View style={styles.obRow}>
        <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.secondaryText, opacity: 0.15 }}>—</AppText>
        <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.secondaryText, opacity: 0.15 }}>—</AppText>
      </View>
    );
  }
  const ratio = Math.min(100, ((Number(bid.remaining) || 0) / (maxVolume || 1)) * 100);
  const priceDecimals = Math.max(getDecimalPlaces(precision || getTickSize(selectedCoin)), 0);
  const qtyDecimals = Math.max(getDecimalPlaces(getStepSize(selectedCoin)), 0);
  const formattedPrice = Number.isFinite(Number(bid.price)) ? Number(bid.price).toFixed(priceDecimals) : '—';
  const formattedQty = Number.isFinite(Number(bid.remaining)) ? Number(bid.remaining).toFixed(qtyDecimals) : '—';

  return (
    <View style={[styles.obRow, { position: 'relative', overflow: 'hidden' }]}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: `${ratio > 0 ? Math.max(2, ratio) : 0}%`,
          backgroundColor: isDark ? "rgba(38, 166, 154, 0.18)" : "rgba(38, 166, 154, 0.14)",
        }}
      />
      <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: colors.green }}>
        {formattedPrice}
      </AppText>
      <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
        {formattedQty}
      </AppText>
    </View>
  );
}, (prev, next) => prev.item.price === next.item.price && prev.item.remaining === next.item.remaining && prev.maxVolume === next.maxVolume && prev.precision === next.precision && prev.isDark === next.isDark);

const SPOT_OB_VIEW_ICONS = [order_1, order_2, order_3];

// Moving HISTORY_TABS inside FuturesUI to allow dynamic counts

const FuturesUI = () => {
  const themeObj = useTheme();
  const dispatch = useDispatch();
  const { colors: themeColors, isDark, theme } = themeObj;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const routeCoin = route.params?.coin || route.params?.pair || route.params?.coinDetail;
  const futuresPairs = useSelector((state) => state.home.futuresPairs);
  const userData = useSelector((state) => state.auth.userData);

  const [pairData, setPairData] = useState(() => {
    return futuresPairs && futuresPairs.length > 0 ? futuresPairs : [];
  });

  const [selectedCoin, setSelectedCoin] = useState(() => {
    if (routeCoin) return routeCoin;
    if (futuresPairs && futuresPairs.length > 0) {
      const btcPair = futuresPairs.find((pair) => pair.symbol === "BTCUSDT-PERP");
      return btcPair || futuresPairs[0];
    }
    return null;
  });

  const [viewMode, setViewMode] = useState('trade');
  const [activeTab, setActiveTab] = useState('Buy');
  const [sliderValue, setSliderValue] = useState(0);
  const [price, setPrice] = useState(() => {
    if (routeCoin) {
      const p = routeCoin.buy_price ?? routeCoin.last_price ?? routeCoin.mark_price;
      if (p) return String(formatPriceByTick(parseFloat(p), routeCoin));
    }
    if (futuresPairs && futuresPairs.length > 0) {
      const btcPair = futuresPairs.find((pair) => pair.symbol === "BTCUSDT-PERP");
      const initPair = btcPair || futuresPairs[0];
      if (initPair) {
        const p = initPair.buy_price ?? initPair.last_price ?? initPair.mark_price;
        if (p) return String(formatPriceByTick(parseFloat(p), initPair));
      }
    }
    return "";
  });
  const [amount, setAmount] = useState("");

  const [showTpSl, setShowTpSl] = useState(false);
  const [buyTpPrice, setBuyTpPrice] = useState("");
  const [buySlPrice, setBuySlPrice] = useState("");
  const [sellTpPrice, setSellTpPrice] = useState("");
  const [sellSlPrice, setSellSlPrice] = useState("");
  const [postOnly, setPostOnly] = useState(false);
  const [tif, setTif] = useState('GTC');

  // Market specific
  const [showSlippage, setShowSlippage] = useState(false);
  const [slippagePct, setSlippagePct] = useState('');

  // Conditional specific
  const [triggerPrice, setTriggerPrice] = useState("");
  const triggerAnim = useRef(new Animated.Value(0)).current;
  const [isTriggerFocused, setIsTriggerFocused] = useState(false);

  const [conditionalPrice, setConditionalPrice] = useState("");
  const conditionalPriceAnim = useRef(new Animated.Value(0)).current;
  const [isConditionalPriceFocused, setIsConditionalPriceFocused] = useState(false);

  const [activeHistoryTab, setActiveHistoryTab] = useState("Positions");

  // History Data States
  const [futuresPositionHistory, setFuturesPositionHistory] = useState([]);
  const [loadingPositionHistory, setLoadingPositionHistory] = useState(false);

  const [futuresOpenOrders, setFuturesOpenOrders] = useState([]);
  const [loadingOpenOrders, setLoadingOpenOrders] = useState(false);

  const [futuresOrderHistory, setFuturesOrderHistory] = useState([]);
  const [loadingOrderHistory, setLoadingOrderHistory] = useState(false);

  const [futuresTransactionHistory, setFuturesTransactionHistory] = useState([]);
  const [loadingTransactionHistory, setLoadingTransactionHistory] = useState(false);

  const [futuresTradeHistory, setFuturesTradeHistory] = useState([]);
  const [loadingTradeHistory, setLoadingTradeHistory] = useState(false);

  const [futuresPositions, setFuturesPositions] = useState([]);
  const [loadingPositions, setLoadingPositions] = useState(false);

  const historyFetchGenRef = React.useRef({
    positions: 0,
    positionHistory: 0,
    openOrders: 0,
    orderHistory: 0,
    tradeHistory: 0,
    transactionHistory: 0,
  });

  const setHistoryTabLoading = React.useCallback((tabId) => {
    switch (tabId) {
      case 'Positions':
        setLoadingPositions(true);
        break;
      case 'Position History':
        setLoadingPositionHistory(true);
        break;
      case 'Open Orders':
        setLoadingOpenOrders(true);
        break;
      case 'Order History':
        setLoadingOrderHistory(true);
        break;
      case 'Trade History':
        setLoadingTradeHistory(true);
        break;
      case 'Transaction History':
        setLoadingTransactionHistory(true);
        break;
      default:
        break;
    }
  }, []);

  const handleHistoryTabChange = React.useCallback((tabId) => {
    if (tabId === activeHistoryTab) return;
    setHistoryTabLoading(tabId);
    setActiveHistoryTab(tabId);
  }, [activeHistoryTab, setHistoryTabLoading]);

  const tpAnim = useRef(new Animated.Value(0)).current;
  const slAnim = useRef(new Animated.Value(0)).current;
  const [isTpFocused, setIsTpFocused] = useState(false);
  const [isSlFocused, setIsSlFocused] = useState(false);
  const isBuyForm = activeTab === 'Buy';
  const formTp = isBuyForm ? buyTpPrice : sellTpPrice;
  const formSl = isBuyForm ? buySlPrice : sellSlPrice;
  const setFormTp = isBuyForm ? setBuyTpPrice : setSellTpPrice;
  const setFormSl = isBuyForm ? setBuySlPrice : setSellSlPrice;

  useEffect(() => {
    Animated.timing(triggerAnim, {
      toValue: isTriggerFocused || String(triggerPrice ?? "").trim() !== "" ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isTriggerFocused, triggerPrice]);

  useEffect(() => {
    Animated.timing(conditionalPriceAnim, {
      toValue: isConditionalPriceFocused || String(conditionalPrice ?? "").trim() !== "" ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isConditionalPriceFocused, conditionalPrice]);

  useEffect(() => {
    Animated.timing(tpAnim, {
      toValue: isTpFocused || String(formTp ?? "").trim() !== "" ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isTpFocused, formTp]);

  useEffect(() => {
    Animated.timing(slAnim, {
      toValue: isSlFocused || String(formSl ?? "").trim() !== "" ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isSlFocused, formSl]);

  const priceAnim = useRef(new Animated.Value(0)).current;
  const amountAnim = useRef(new Animated.Value(0)).current;
  const [isPriceFocused, setIsPriceFocused] = useState(false);
  const [isAmountFocused, setIsAmountFocused] = useState(false);

  useEffect(() => {
    Animated.timing(priceAnim, {
      toValue: isPriceFocused || String(price ?? "").trim() !== "" ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isPriceFocused, price]);

  useEffect(() => {
    Animated.timing(amountAnim, {
      toValue: isAmountFocused || String(amount ?? "").trim() !== "" ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [isAmountFocused, amount]);

  const pairSheetRef = useRef(null);
  const pairOpenLockRef = useRef(false);

  const {
    futuresData,
    futuresPrice,
    subscribeToFutures,
    unsubscribeFromFutures,
    subscribeToMarket,
    unsubscribeFromMarket
  } = useFuturesSocket();
  const isFocused = useIsFocused();
  const userFuturesWallet = useSelector((state) => state.wallet.userFuturesWallet);

  const usdtFuturesWallet = React.useMemo(() => {
    if (!Array.isArray(userFuturesWallet)) return null;
    return userFuturesWallet.find(w => w?.short_name === 'USDT' || w?.currency === 'USDT');
  }, [userFuturesWallet]);

  const lastRouteCoinId = useRef(null);

  useEffect(() => {
    const activeCoin = route.params?.coin || route.params?.pair || route.params?.coinDetail;
    if (activeCoin) {
      const activeId = activeCoin._id || activeCoin.symbol || activeCoin.short_name || activeCoin.base_asset;
      if (activeId && activeId !== lastRouteCoinId.current) {
        lastRouteCoinId.current = activeId;
        setSelectedCoin(activeCoin);
        const p = activeCoin.buy_price ?? activeCoin.last_price ?? activeCoin.mark_price;
        if (p) {
          setPrice(String(formatPriceByTick(parseFloat(p), activeCoin)));
        }
      }
    }
  }, [route.params?.coin, route.params?.pair, route.params?.coinDetail]);

  const fetchFuturesPositions = React.useCallback(async (opts = {}) => {
    const silent = opts?.silent === true;
    const gen = ++historyFetchGenRef.current.positions;
    if (!silent) setLoadingPositions(true);
    try {
      const params = { skip: 0, limit: 50 };
      const result = await appOperation.customer.futuresOpenPositions(params);
      if (gen !== historyFetchGenRef.current.positions) return;
      if (result?.success) {
        setFuturesPositions(result.data?.positions ?? []);
      }
    } catch (e) {
      if (gen !== historyFetchGenRef.current.positions) return;
      console.warn("fetchFuturesPositions err:", e);
    } finally {
      if (gen === historyFetchGenRef.current.positions) {
        setLoadingPositions(false);
      }
    }
  }, []);

  const fetchFuturesPositionHistory = React.useCallback(async () => {
    const gen = ++historyFetchGenRef.current.positionHistory;
    setLoadingPositionHistory(true);
    try {
      const params = { skip: 0, limit: 50 };
      const result = await appOperation.customer.futuresPositionHistory(params);
      if (gen !== historyFetchGenRef.current.positionHistory) return;
      if (result?.success) {
        setFuturesPositionHistory(result.data?.positions ?? []);
      } else {
        console.log("[PositionHistory] API failed or success=false", result);
      }
    } catch (e) {
      if (gen !== historyFetchGenRef.current.positionHistory) return;
      console.warn("[PositionHistory] fetchFuturesPositionHistory err:", e);
    } finally {
      if (gen === historyFetchGenRef.current.positionHistory) {
        setLoadingPositionHistory(false);
      }
    }
  }, []);

  const fetchFuturesOpenOrders = React.useCallback(async () => {
    const gen = ++historyFetchGenRef.current.openOrders;
    setLoadingOpenOrders(true);
    try {
      const params = { skip: 0, limit: 50 };
      const result = await appOperation.customer.futuresOpenOrders(params);
      if (gen !== historyFetchGenRef.current.openOrders) return;
      if (result?.success) {
        setFuturesOpenOrders(result.data?.orders ?? []);
      }
    } catch (e) {
      if (gen !== historyFetchGenRef.current.openOrders) return;
      console.warn("fetchFuturesOpenOrders err:", e);
    } finally {
      if (gen === historyFetchGenRef.current.openOrders) {
        setLoadingOpenOrders(false);
      }
    }
  }, []);

  const fetchFuturesOrderHistory = React.useCallback(async () => {
    const gen = ++historyFetchGenRef.current.orderHistory;
    setLoadingOrderHistory(true);
    try {
      const params = { skip: 0, limit: 50 };
      const result = await appOperation.customer.futuresOrderHistory(params);
      if (gen !== historyFetchGenRef.current.orderHistory) return;
      if (result?.success) {
        setFuturesOrderHistory(result.data?.orders ?? []);
      }
    } catch (e) {
      if (gen !== historyFetchGenRef.current.orderHistory) return;
      console.warn("fetchFuturesOrderHistory err:", e);
    } finally {
      if (gen === historyFetchGenRef.current.orderHistory) {
        setLoadingOrderHistory(false);
      }
    }
  }, []);

  const fetchFuturesTradeHistory = React.useCallback(async () => {
    const gen = ++historyFetchGenRef.current.tradeHistory;
    setLoadingTradeHistory(true);
    try {
      const params = { skip: 0, limit: 50 };
      const res = await appOperation.customer.futuresExecutions(params);
      if (gen !== historyFetchGenRef.current.tradeHistory) return;
      if (res?.success) {
        const list = Array.isArray(res?.data?.trades)
          ? res.data.trades
          : Array.isArray(res?.trades)
            ? res.trades
            : Array.isArray(res?.data?.data)
              ? res.data.data
              : Array.isArray(res?.data?.executions)
                ? res.data.executions
                : Array.isArray(res?.data)
                  ? res.data
                  : [];
        setFuturesTradeHistory(list);
      }
    } catch (e) {
      if (gen !== historyFetchGenRef.current.tradeHistory) return;
      console.warn("fetchFuturesTradeHistory err:", e);
    } finally {
      if (gen === historyFetchGenRef.current.tradeHistory) {
        setLoadingTradeHistory(false);
      }
    }
  }, []);

  const fetchFuturesTransactionHistory = React.useCallback(async () => {
    const gen = ++historyFetchGenRef.current.transactionHistory;
    setLoadingTransactionHistory(true);
    try {
      const params = { page: 1, limit: 50 };
      const result = await appOperation.customer.futuresWalletHistory(params);
      if (gen !== historyFetchGenRef.current.transactionHistory) return;
      if (result?.success) {
        setFuturesTransactionHistory(result.data?.transactions ?? []);
      }
    } catch (e) {
      if (gen !== historyFetchGenRef.current.transactionHistory) return;
      console.warn("fetchFuturesTransactionHistory err:", e);
    } finally {
      if (gen === historyFetchGenRef.current.transactionHistory) {
        setLoadingTransactionHistory(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isFocused) return undefined;

    const task = InteractionManager.runAfterInteractions(() => {
      fetchFuturesPositions();
      fetchFuturesOpenOrders();

      if (activeHistoryTab === 'Position History') {
        fetchFuturesPositionHistory();
      } else if (activeHistoryTab === 'Order History') {
        fetchFuturesOrderHistory();
      } else if (activeHistoryTab === 'Trade History') {
        fetchFuturesTradeHistory();
        fetchFuturesOrderHistory();
        fetchFuturesPositionHistory();
      } else if (activeHistoryTab === 'Transaction History') {
        fetchFuturesTransactionHistory();
      }
    });

    return () => task.cancel();
  }, [isFocused, activeHistoryTab, fetchFuturesPositions, fetchFuturesPositionHistory, fetchFuturesOpenOrders, fetchFuturesOrderHistory, fetchFuturesTradeHistory, fetchFuturesTransactionHistory]);

  const liveCoin = React.useMemo(() => {
    return pairData?.find((p) => p._id === selectedCoin?._id) || selectedCoin;
  }, [pairData, selectedCoin]);

  const [livePriceState, setLivePriceState] = useState("");
  const lastStreamBidRef = useRef(null);
  const limitPriceSeededPairRef = useRef(null);



  const calculateAmountForSlider = (val, currentUnit, currentPrice) => {
    if (val === 0) return '';

    const balanceToUse = Number(futuresData?.balance?.available_balance ?? usdtFuturesWallet?.balance ?? 0) || 0;
    const takerFeeRate = resolveTakerFeeRate(selectedCoin);
    const stats = computeFuturesLeverageStats({
      availableBalance: balanceToUse,
      leverage: marginLeverage,
      maxLeverage: selectedCoin?.max_leverage || 125,
      leverageTiers: selectedCoin?.leverage_tiers || [],
      takerFeeRate,
    });

    const maxNotional = stats.allowToOpen || 0;
    if (!Number.isFinite(maxNotional) || maxNotional < 0 || maxNotional === Infinity) {
      return '';
    }

    const isValueUnit = currentUnit.includes('Value');
    if (isValueUnit) {
      const dec = selectedCoin?.quote_decimal ?? 2;
      const valAmount = (maxNotional * val) / 100;
      return parseFloat(valAmount.toFixed(dec)).toString();
    } else {
      let p = Number(currentPrice);
      if (!Number.isFinite(p) || p <= 0) {
        p = Number(liveCoin?.mark_price);
      }
      if (!Number.isFinite(p) || p <= 0) return '';

      let maxQty = maxNotional / p;
      const orderCap = Number(selectedCoin?.max_order_qty);
      if (Number.isFinite(orderCap) && orderCap > 0) {
        maxQty = Math.min(maxQty, orderCap);
      }

      const step = Number(selectedCoin?.step_size) || 0.001;
      const stepDec = (() => {
        const s = String(step);
        if (s.includes("e-")) {
          return parseInt(s.split("e-")[1], 10) || 0;
        }
        const dot = s.indexOf(".");
        return dot === -1 ? 0 : s.length - dot - 1;
      })();

      const maxSteps = Math.floor(maxQty / step + 1e-12);
      const flooredMaxQty = parseFloat((maxSteps * step).toFixed(stepDec));

      if (flooredMaxQty <= 0) return '';

      const targetQty = (flooredMaxQty * val) / 100;

      const multiplier = Math.pow(10, stepDec);
      const flooredTargetQty = Math.floor(targetQty * multiplier) / multiplier;

      return flooredTargetQty > 0 ? String(flooredTargetQty) : '';
    }
  };

  const handleSliderChange = (val) => {
    setSliderValue(val);
  };

  const [placingOrderSide, setPlacingOrderSide] = useState("");

  const handlePlaceOrder = async (uiSide, formSideArg) => {
    const formSide = String(formSideArg || (activeTab === 'Buy' ? 'BUY' : 'SELL')).toUpperCase();
    setPlacingOrderSide(String(uiSide).toUpperCase() === "BUY" ? "BUY" : "SELL");
    try {
      if (!selectedCoin?.symbol) {
        SimpleToast.show(futuresErrSelectPair(), SimpleToast.SHORT);
        setPlacingOrderSide("");
        return;
      }

      const isBuy = String(uiSide).toUpperCase() === "BUY";
      const apiSide = isBuy ? "BUY" : "SELL";
      const order_type = orderType.toUpperCase();
      // console.log("=== Order Basics ===", { isBuy, apiSide, order_type, amount, price });

      const tickSize = Number(selectedCoin?.tick_size) || 0.01;
      const stepSize = Number(selectedCoin?.step_size) || 0.001;
      const minQty = Number(selectedCoin?.min_order_qty) || stepSize;

      // Quantity validation
      const rawQty = parseFloat(String(amount).replace(/,/g, ''));
      // console.log("=== trace 1 rawQty ===", rawQty);
      if (!Number.isFinite(rawQty) || rawQty <= 0) {
        // console.log("=== trace 1 return early ===");
        SimpleToast.show(futuresErrInvalidSize(), SimpleToast.SHORT);
        return;
      }

      // Convert from Amount/Value to Base Qty logic
      const isQuoteSize = contractUnit.includes('Value');
      let baseQty = rawQty;

      const refPrice = Number(liveCoin?.mark_price) || 0;
      let priceForConversion = refPrice;
      if (orderType === 'Limit') {
        priceForConversion = parseFloat(String(price).replace(/,/g, '')) || refPrice;
      } else if (orderType === 'Conditional') {
        const orderPriceVal = parseFloat(String(conditionalPrice).replace(/,/g, ''));
        const triggerPriceVal = parseFloat(String(triggerPrice).replace(/,/g, ''));
        priceForConversion = orderPriceVal || triggerPriceVal || refPrice;
      }
      if (isQuoteSize && priceForConversion > 0) {
        baseQty = rawQty / priceForConversion;
      }

      // console.log("=== trace 2 baseQty calculation ===", { isQuoteSize, refPrice, priceForConversion, baseQty });

      if (!Number.isFinite(baseQty) || baseQty <= 0) {
        // console.log("=== trace 2 return early ===");
        SimpleToast.show(futuresErrPriceForValue(), SimpleToast.SHORT);
        return;
      }

      // Leverage validation
      const leverage = Number(marginLeverage) || 1;

      // Removing reduceOnly logic as tabs are now Buy/Sell. Can be added as checkbox later if needed.
      const reduceOnly = false;
      const closePosition = false;

      const effectiveTif = postOnly ? "GTX" : tif;
      // console.log("=== trace 3 tif ===", { effectiveTif, tif });

      const getDecimalPlacesLocal = (value) => {
        if (!value || value >= 1) return 0;
        const str = String(value);
        if (str.includes("e-")) {
          return parseInt(str.split("e-")[1], 10) || 0;
        }
        const decimalPart = str.split(".")[1];
        return decimalPart ? decimalPart.length : 0;
      };

      const qtyPrec = getDecimalPlacesLocal(stepSize);
      // console.log("=== trace 4 qtyPrec ===", qtyPrec, "stepSize", stepSize, "baseQty", baseQty);
      const finalQtyStr = Number(formatQtyByStep(baseQty, selectedCoin)).toFixed(qtyPrec);
      // console.log("=== trace 5 finalQtyStr ===", finalQtyStr);

      const payload = {
        symbol: selectedCoin.symbol,
        side: apiSide,
        order_type,
        quantity: finalQtyStr,
        leverage,
      };

      // console.log("=== trace 6 checking limits ===", orderType);
      if (orderType === 'Limit') {
        const priceVal = parseFloat(String(price).replace(/,/g, ''));
        // console.log("=== trace 7 priceVal ===", priceVal);
        if (!Number.isFinite(priceVal) || priceVal <= 0) {
          // console.log("=== trace 7 return early ===");
          SimpleToast.show(futuresErrInvalidLimitPrice(), SimpleToast.SHORT);
          return;
        }
        payload.price = String(priceVal);
        if (effectiveTif && effectiveTif !== "GTC") {
          payload.time_in_force = effectiveTif;
        }
      } else if (orderType === 'Conditional') {
        const triggerVal = parseFloat(String(triggerPrice).replace(/,/g, ''));
        if (!Number.isFinite(triggerVal) || triggerVal <= 0) {
          SimpleToast.show(futuresErrInvalidTrigger(), SimpleToast.SHORT);
          return;
        }
        payload.trigger_price = String(triggerVal);

        const orderPriceVal = parseFloat(String(conditionalPrice).replace(/,/g, ''));
        if (Number.isFinite(orderPriceVal) && orderPriceVal > 0) {
          payload.order_price = String(orderPriceVal);
        }
      } else if (orderType === 'Market') {
        if (showSlippage && slippagePct) {
          const sp = parseFloat(slippagePct);
          if (Number.isFinite(sp) && sp > 0 && sp <= 100) {
            payload.slippage = sp;
          }
        }
      }

      if (showTpSl) {
        // TP/SL from the form the user is using (buy vs sell tab), not only from Long/Short.
        // If that panel is empty, fall back to the other panel — same as web callPlaceOrder.
        const preferredTp = formSide === "BUY" ? buyTpPrice : sellTpPrice;
        const preferredSl = formSide === "BUY" ? buySlPrice : sellSlPrice;
        const otherTp = formSide === "BUY" ? sellTpPrice : buyTpPrice;
        const otherSl = formSide === "BUY" ? sellSlPrice : buySlPrice;
        const takeProfit = String(preferredTp || "").trim() || String(otherTp || "").trim();
        const stopLoss = String(preferredSl || "").trim() || String(otherSl || "").trim();
        const markPriceForTpSl = Number(futuresPrice?.mark_price) || 0;
        if (takeProfit && String(takeProfit).trim() !== "") {
          const tpVal = parseFloat(takeProfit);
          if (Number.isFinite(tpVal) && tpVal > 0) {
            if (markPriceForTpSl > 0) {
              if (apiSide === "BUY" && tpVal <= markPriceForTpSl) { console.log("=== trace 9 TP return early ==="); SimpleToast.show(futuresErrTpBuy(), SimpleToast.SHORT); setPlacingOrderSide(""); return; }
              if (apiSide === "SELL" && tpVal >= markPriceForTpSl) { console.log("=== trace 9 TP return early ==="); SimpleToast.show(futuresErrTpSell(), SimpleToast.SHORT); setPlacingOrderSide(""); return; }
            }
            payload.take_profit = String(tpVal);
          }
        }
        if (stopLoss && String(stopLoss).trim() !== "") {
          const slVal = parseFloat(stopLoss);
          if (Number.isFinite(slVal) && slVal > 0) {
            if (markPriceForTpSl > 0) {
              if (apiSide === "BUY" && slVal >= markPriceForTpSl) { console.log("=== trace 10 SL return early ==="); SimpleToast.show(futuresErrSlBuy(), SimpleToast.SHORT); setPlacingOrderSide(""); return; }
              if (apiSide === "SELL" && slVal <= markPriceForTpSl) { console.log("=== trace 10 SL return early ==="); SimpleToast.show(futuresErrSlSell(), SimpleToast.SHORT); setPlacingOrderSide(""); return; }
            }
            payload.stop_loss = String(slVal);
          }
        }
      }

      if (reduceOnly) payload.reduce_only = true;
      if (closePosition) payload.close_position = true;

      // Local Margin Validation (matches Web App)
      let orderPriceForCap = 0;
      if (orderType === "Limit" && payload.price) {
        orderPriceForCap = parseFloat(payload.price);
      } else if (orderType === "Market") {
        orderPriceForCap = Number(selectedCoin?.mark_price) || Number(price) || 0;
      } else if (orderType === "Conditional") {
        orderPriceForCap = payload.order_price ? parseFloat(payload.order_price) : parseFloat(payload.trigger_price) || 0;
      }

      if (Number.isFinite(orderPriceForCap) && orderPriceForCap > 0) {
        const orderQty = parseFloat(finalQtyStr) || 0;
        const orderNotional = orderQty * orderPriceForCap;

        if (!reduceOnly && !closePosition) {
          const feeRate = Number(selectedCoin?.taker_fee_rate);
          const takerFee = Number.isFinite(feeRate) && feeRate >= 0 ? feeRate : 0;
          const effAvail = Number(futuresData?.balance?.available_balance ?? usdtFuturesWallet?.balance ?? 0);

          const lev = Math.max(1, Number(leverage) || 1);
          const requiredMargin = (orderNotional / lev) + (orderNotional * takerFee);

          if (requiredMargin > effAvail + 1e-8) {
            SimpleToast.show("Insufficient margin. Add funds or reduce your order size.", SimpleToast.SHORT);
            setPlacingOrderSide("");
            return;
          }
        }
      }

      const client_order_id = "app_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const finalPayload = {
        ...payload,
        client_order_id,
      };

      const result = await appOperation.customer.futuresPlaceOrder(finalPayload);
      if (result?.success) {
        SimpleToast.show(result?.message || 'Order Placed Successfully!', SimpleToast.SHORT);
        const orderData = result?.data?.order ?? result?.data;
        const orderId = orderData?._id ?? orderData?.order_id;
        if (orderData && orderId) {
          setFuturesOpenOrders((prev) => {
            if (prev.some((o) => String(o._id ?? o.order_id) === String(orderId))) return prev;
            return [orderData, ...prev];
          });
        }

        // clear form
        setAmount("");
        setSliderValue(0);
        if (orderType === 'Conditional') {
          setTriggerPrice("");
          setConditionalPrice("");
        }
        if (showTpSl) {
          setBuyTpPrice("");
          setBuySlPrice("");
          setSellTpPrice("");
          setSellSlPrice("");
        }

        fetchFuturesPositions();
        fetchFuturesOpenOrders();
        fetchFuturesTransactionHistory();
      } else {
        const msg = result?.error?.message || result?.message || "Failed to place order";
        SimpleToast.show(formatFuturesApiError(msg), SimpleToast.SHORT);
      }
    } catch (e) {
      let errMsg = futuresErrGeneric();
      if (e?.error?.message) {
        errMsg = e.error.message;
      } else if (typeof e?.error === 'string') {
        errMsg = e.error;
      } else if (e?.message) {
        errMsg = e.message;
      }
      SimpleToast.show(formatFuturesApiError(errMsg), SimpleToast.SHORT);
    } finally {
      setPlacingOrderSide("");
    }
  };

  useEffect(() => {
    // 2. Normal slider recalculation
    if (sliderValue > 0) {
      let currentRefPrice = price;
      if (orderType === 'Conditional') {
        currentRefPrice = conditionalPrice || triggerPrice;
      }
      setAmount(calculateAmountForSlider(sliderValue, contractUnit, currentRefPrice));
    }
  }, [sliderValue, contractUnit, marginLeverage, price, orderType, conditionalPrice, triggerPrice]);

  useEffect(() => {
    if (!futuresPrice) return;
    if (selectedCoin?.symbol && futuresPrice.symbol && futuresPrice.symbol !== selectedCoin.symbol) return;

    const p = futuresPrice.mark_price ?? futuresPrice.last_price;
    if (p == null) return;

    const priceNum = parseFloat(p);
    if (!Number.isFinite(priceNum) || priceNum <= 0) return;

    const pairId = selectedCoin?._id;
    if (pairId && limitPriceSeededPairRef.current !== pairId) {
      limitPriceSeededPairRef.current = pairId;
      setPrice(String(formatPriceByTick(priceNum, selectedCoin)));
    }

    if (lastStreamBidRef.current != null) {
      const prev = Number(lastStreamBidRef.current);
      if (priceNum > prev) setIsPricePositive(true);
      else if (priceNum < prev) setIsPricePositive(false);
    }
    lastStreamBidRef.current = priceNum;
    setLivePriceState(p);
  }, [futuresPrice, selectedCoin?.symbol, selectedCoin?._id]);

  const livePrice = React.useMemo(() => {
    if (livePriceState) return parseFloat(livePriceState) || 0;

    let p = futuresData?.last_price || futuresData?.buy_price || futuresData?.price;
    if (!p && futuresData?.contract) {
      p = futuresData.contract.mark_price || futuresData.contract.last_price;
    }
    if (!p) p = liveCoin?.last_price || liveCoin?.buy_price;
    if (!p) {
      const allAsks = futuresData?.sell_order || [];
      const allBids = futuresData?.buy_order || [];
      p = allAsks[0]?.price || allBids[0]?.price;
    }
    return parseFloat(p) || 0;
  }, [livePriceState, futuresData, liveCoin]);

  const [isPricePositive, setIsPricePositive] = useState(true);
  const prevPriceRef = useRef(0);

  useEffect(() => {
    if (livePrice > prevPriceRef.current && prevPriceRef.current !== 0) {
      setIsPricePositive(true);
    } else if (livePrice < prevPriceRef.current && prevPriceRef.current !== 0) {
      setIsPricePositive(false);
    }
    if (livePrice > 0) {
      prevPriceRef.current = livePrice;
    }
  }, [livePrice]);

  const [searchTerm, setSearchTerm] = useState("");
  const [orderType, setOrderType] = useState('Limit');
  const [isOrderTypeModalVisible, setIsOrderTypeModalVisible] = useState(false);
  const orderTypeSheetRef = useRef(null);
  const [marginMode, setMarginMode] = useState('Isolated');
  const [marginModeDraft, setMarginModeDraft] = useState('Isolated');
  const [isMarginModeModalVisible, setIsMarginModeModalVisible] = useState(false);
  const marginModeSheetRef = useRef(null);
  const [isTifModalVisible, setIsTifModalVisible] = useState(false);
  const [tifDraft, setTifDraft] = useState('GTC');
  const [batchAdjustMarginMode, setBatchAdjustMarginMode] = useState(false);
  const [contractUnit, setContractUnit] = useState('Amount (BTC)');
  const [contractUnitDraft, setContractUnitDraft] = useState('Amount (BTC)');
  const [isContractUnitModalVisible, setIsContractUnitModalVisible] = useState(false);
  const contractUnitSheetRef = useRef(null);

  const currentBaseAsset = selectedCoin?.short_name || selectedCoin?.base_asset || selectedCoin?.base_currency || (selectedCoin?.symbol ? selectedCoin.symbol.split('USDT')[0].replace(/[^A-Za-z0-9]/g, '') : '') || 'BTC';
  const currentQuoteAsset = selectedCoin?.margin_asset || selectedCoin?.quote_asset || selectedCoin?.quote_currency || 'USDT';

  useEffect(() => {
    if (selectedCoin) {
      const isValueUnit = (contractUnit || '').includes('Value');
      const nextUnit = isValueUnit ? `Value (${currentQuoteAsset})` : `Amount (${currentBaseAsset})`;
      setContractUnit(prev => (prev === nextUnit ? prev : nextUnit));
      setContractUnitDraft(prev => (prev === nextUnit ? prev : nextUnit));
    }
  }, [selectedCoin?.symbol, selectedCoin?._id, currentBaseAsset, currentQuoteAsset]);

  // Precision Dropdown State
  const obPrecisionOptions = React.useMemo(() => {
    return getOrderBookAggOptionsForPair(getTickSize(selectedCoin));
  }, [selectedCoin]);

  const [precision, setPrecision] = useState(null);

  useEffect(() => {
    if (selectedCoin) {
      const tick = getTickSize(selectedCoin);
      setPrecision(tick);
    }
  }, [selectedCoin?.symbol, selectedCoin?._id]);
  const [obPrecisionOpen, setObPrecisionOpen] = useState(false);
  const [obPrecisionLayout, setObPrecisionLayout] = useState(null);
  const precisionTriggerRef = useRef(null);

  // Order Book Layout Switcher State
  const [viewModeIndex, setViewModeIndex] = useState(0);

  const cycleViewMode = () => {
    setViewModeIndex((i) => (i + 1) % 3);
  };

  const openObPrecisionMenu = () => {
    precisionTriggerRef.current?.measure((x, y, w, h, pageX, pageY) => {
      setObPrecisionLayout({ x: pageX, y: pageY, w, h });
      setObPrecisionOpen(true);
    });
  };

  const closeObPrecisionMenu = () => {
    setObPrecisionOpen(false);
    setObPrecisionLayout(null);
  };
  const [marginLeverage, setMarginLeverage] = useState(1);
  const [leverageDraft, setLeverageDraft] = useState(1);
  const [isLeverageModalVisible, setIsLeverageModalVisible] = useState(false);
  const rbSheetMarginLeverage = useRef(null);

  const triggerPriceInputRef = useRef(null);
  const priceInputRef = useRef(null);
  const amountInputRef = useRef(null);
  const tpInputRef = useRef(null);
  const slInputRef = useRef(null);

  useEffect(() => {
    if (selectedCoin?.max_leverage) {
      const maxL = Number(selectedCoin.max_leverage);
      if (maxL > 0 && marginLeverage > maxL) {
        setMarginLeverage(maxL);
      }
    }
  }, [selectedCoin?.max_leverage, marginLeverage]);

  const ORDER_TYPE_SHEET_BASIC = [
    {
      name: "Limit",
      description: "Buy or sell at your chosen price or better.",
      icon: TrendingUp,
      gradient: ["#4F1D96", "#7C3AED"],
    },
    {
      name: "Market",
      description: "Instantly trade at the current market price.",
      icon: ShoppingCart,
      gradient: ["#064E3B", "#059669"],
    },
  ];

  const ORDER_TYPE_SHEET_CONDITIONAL = [
    {
      name: "Conditional",
      description: "Your order will be placed automatically when the target price is reached.",
      icon: Target,
      gradient: ["#78350F", "#D97706"],
    },
  ];

  const renderOrderTypeRow = (item) => {
    const selected = orderType === item.name;
    const IconComponent = item.icon;
    const glowColor = item.gradient?.[1] || "#7C3AED";
    return (
      <TouchableOpacity
        key={item.name}
        activeOpacity={0.75}
        onPress={() => {
          setOrderType(item.name);
          setIsOrderTypeModalVisible(false);
          orderTypeSheetRef.current?.close();
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: selected
            ? "rgba(6, 182, 212, 0.08)"
            : isDark
              ? "rgba(30, 31, 36, 0.75)"
              : "#F9FAFB",
          borderRadius: 16,
          padding: 12,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: selected
            ? "#06B6D4"
            : isDark
              ? "rgba(255, 255, 255, 0.08)"
              : "#E5E7EB",
        }}
      >
        <LinearGradient
          colors={item.gradient || ["#4F1D96", "#7C3AED"]}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
            shadowColor: glowColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.45,
            shadowRadius: 8,
            elevation: 5,
          }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {IconComponent && <IconComponent color="#FFF" size={20} strokeWidth={2} />}
        </LinearGradient>
        <View style={{ flex: 1, marginRight: 12 }}>
          <AppText weight={SEMI_BOLD} style={{ fontSize: 14, color: themeColors.text }}>
            {item.name}
          </AppText>
          <AppText
            weight={MEDIUM}
            style={{
              fontSize: 12,
              color: isDark ? "#8E95A3" : "#6B7280",
              marginTop: 4,
              lineHeight: 16,
            }}
          >
            {item.description}
          </AppText>
        </View>
        <View style={{ width: 24, alignItems: "center", justifyContent: "center" }}>
          {selected ? (
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: "#A855F7",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Check color="#FFF" size={14} strokeWidth={3} />
            </View>
          ) : (
            <LucideCircle color={isDark ? "#4B5563" : "#D1D5DB"} size={22} strokeWidth={1.5} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  useEffect(() => {
    const pairsArray = (futuresPairs && futuresPairs.length > 0)
      ? futuresPairs
      : (futuresData?.contracts || futuresData?.pairs || []);

    if (pairsArray && pairsArray.length > 0) {
      setPairData(prev => (prev?.length === pairsArray.length && prev === pairsArray ? prev : pairsArray));

      setPrice(prevPrice => {
        if (prevPrice && prevPrice !== "") return prevPrice;
        const btcPair = pairsArray.find((pair) => pair.symbol === "BTCUSDT-PERP");
        const initPair = btcPair || pairsArray[0];
        if (initPair) {
          const p = initPair.buy_price ?? initPair.last_price ?? initPair.mark_price;
          if (p) return String(formatPriceByTick(parseFloat(p), initPair));
        }
        return prevPrice;
      });

      setSelectedCoin(prev => {
        if (prev) return prev;
        const btcPair = pairsArray.find((pair) => pair.symbol === "BTCUSDT-PERP");
        const initPair = btcPair || pairsArray[0];
        if (initPair) {
          limitPriceSeededPairRef.current = initPair?._id;
        }
        return initPair;
      });
    }
  }, [futuresPairs]);

  useEffect(() => {
    if (!isFocused) return undefined;

    const task = InteractionManager.runAfterInteractions(() => {
      dispatch(getOpenOrders(0, 10, "cross", selectedCoin?.symbol));
      dispatch(getUserFuturesWallet("futures"));
    });

    return () => task.cancel();
  }, [isFocused, dispatch, selectedCoin?.symbol]);

  useEffect(() => {
    if (isFocused && selectedCoin?.symbol) {
      subscribeToFutures({ symbol: selectedCoin.symbol });
      return () => {
        unsubscribeFromFutures({ symbol: selectedCoin.symbol, base_currency_id: selectedCoin._id });
      };
    }
  }, [isFocused, selectedCoin?.symbol, selectedCoin?._id, subscribeToFutures, unsubscribeFromFutures]);

  useEffect(() => {
    if (isFocused) {
      subscribeToMarket?.("futures");
    } else {
      unsubscribeFromMarket?.("futures");
    }
  }, [isFocused, subscribeToMarket, unsubscribeFromMarket]);

  const openPairSheet = React.useCallback(() => {
    if (!liveCoin) return;
    if (pairOpenLockRef.current) return;
    pairOpenLockRef.current = true;
    pairSheetRef.current?.open();
    setTimeout(() => {
      pairOpenLockRef.current = false;
    }, 400);
  }, [liveCoin]);

  const handleSelectCoin = (pair) => {
    dispatch(setFuturesData(null));
    setSelectedCoin(pair);
    pairSheetRef.current?.close();
    setSearchTerm("");
    const p = pair?.buy_price ?? pair?.last_price ?? pair?.mark_price;
    if (p) {
      setPrice(String(formatPriceByTick(parseFloat(p), pair)));
    }
    subscribeToFutures({ symbol: pair.symbol });
  };


  const renderHeader = React.useCallback(() => {
    const isChangePositive = (Number(liveCoin?.change_percentage) || 0) >= 0;
    const formattedChange = `${isChangePositive ? '+' : ''}${Number(liveCoin?.change_percentage || 0).toFixed(2)}%`;
    const changeColor = isChangePositive ? (colors.green || "#00C853") : (colors.red || "#FF3B30");

    return (
      <View style={{ paddingTop: 6, paddingBottom: 8, paddingHorizontal: 14, backgroundColor: themeColors.background }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Left: Pair title + 24h change percentage */}
          <TouchableOpacity
            style={styles.pairTouchTarget}
            onPress={openPairSheet}
            activeOpacity={0.75}
            disabled={!liveCoin}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Select trading pair"
          >
            {liveCoin ? (
              <View style={styles.pairBlock}>
                <View style={styles.pairRow}>
                  <AppText weight={BOLD} style={[styles.pairTitle, { color: themeColors.text }]}>
                    {`${liveCoin.short_name || liveCoin.base_asset}/${liveCoin.margin_asset}`}
                  </AppText>
                  <FastImage source={downIcon} style={{ width: 12, height: 12, marginLeft: 6, marginTop: 2 }} resizeMode="contain" tintColor={themeColors.text} />
                </View>
                <AppText weight={MEDIUM} style={[styles.changeText, { color: changeColor }]}>
                  {formattedChange}
                </AppText>
              </View>
            ) : (
              <>
                <ShimmerBox width={150} height={24} borderRadius={4} />
                <View style={{ marginTop: 4 }}>
                  <ShimmerBox width={60} height={18} borderRadius={4} />
                </View>
              </>
            )}
          </TouchableOpacity>

          {/* Right: MM badge + Candle / Trade segmented pills */}
          <View style={styles.rightGroup}>
            <View style={styles.badgeContainer}>
              <View style={[styles.mmBadge, { backgroundColor: isDark ? "#002E15" : "#E8F8F0" }]}>
                <AppText weight={MEDIUM} style={{ color: colors.green || "#00C853", fontSize: 10 }}>MM</AppText>
              </View>
              <AppText weight={MEDIUM} style={{ color: colors.green || "#00C853", fontSize: 11, marginTop: 3 }}>0.00%</AppText>
            </View>

            <View style={[styles.iconGroup, { backgroundColor: isDark ? "#111214" : "#F3F4F6" }]}>
              <TouchableOpacity
                style={[
                  styles.iconWrapper,
                  viewMode === "candles" && { backgroundColor: isDark ? "#35373F" : "#E5E7EB" },
                ]}
                onPress={() => setViewMode("candles")}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Open chart"
              >
                <FastImage
                  source={candle}
                  style={{ width: 18, height: 18 }}
                  resizeMode="contain"
                  tintColor={viewMode === "candles" ? (isDark ? colors.white : colors.black) : (isDark ? "#8E8E93" : "#6A7282")}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.iconWrapper,
                  viewMode === "trade" && { backgroundColor: isDark ? "#35373F" : "#E5E7EB" },
                ]}
                onPress={() => setViewMode("trade")}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Open trade"
              >
                <FastImage
                  source={defaultTrade}
                  style={{ width: 18, height: 18 }}
                  resizeMode="contain"
                  tintColor={viewMode === "trade" ? (isDark ? colors.white : colors.black) : (isDark ? "#8E8E93" : "#6A7282")}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }, [activeHistoryTab, liveCoin, navigation, openPairSheet, themeColors.text, themeColors.background, isDark, viewMode]);

  const visibleRowCount = viewModeIndex === 0 ? 6 : 12;

  const obAsks = React.useMemo(() => {
    if (viewModeIndex === 1) return [];
    const allAsks = normalizeOrderbookOrders(futuresData?.sell_order || []);
    const aggregated = aggregateOrderBookRows(allAsks, precision);
    const sorted = [...aggregated].sort((a, b) => Number(a.price) - Number(b.price));
    const sliced = sorted.slice(0, visibleRowCount);
    const data = [...sliced];
    while (data.length < visibleRowCount) {
      data.push({ isPlaceholder: true, _id: `placeholder-ask-${data.length}` });
    }
    return data;
  }, [futuresData?.sell_order, viewModeIndex, precision, visibleRowCount]);

  const obBids = React.useMemo(() => {
    if (viewModeIndex === 2) return [];
    const allBids = normalizeOrderbookOrders(futuresData?.buy_order || []);
    const aggregated = aggregateOrderBookRows(allBids, precision);
    const sorted = [...aggregated].sort((a, b) => Number(b.price) - Number(a.price));
    const sliced = sorted.slice(0, visibleRowCount);
    const data = [...sliced];
    while (data.length < visibleRowCount) {
      data.push({ isPlaceholder: true, _id: `placeholder-bid-${data.length}` });
    }
    return data;
  }, [futuresData?.buy_order, viewModeIndex, precision, visibleRowCount]);

  const maxVolume = React.useMemo(() => {
    const askVols = obAsks.filter(a => !a.isPlaceholder).map(a => Number(a.remaining) || 0);
    const bidVols = obBids.filter(b => !b.isPlaceholder).map(b => Number(b.remaining) || 0);
    const maxAsk = askVols.length > 0 ? Math.max(...askVols) : 0;
    const maxBid = bidVols.length > 0 ? Math.max(...bidVols) : 0;
    return Math.max(maxAsk, maxBid) || 1;
  }, [obAsks, obBids]);

  const orderBookBidAskRatio = React.useMemo(() => {
    const bid = obBids.filter(b => !b?.isPlaceholder).reduce((s, o) => s + (Number(o?.remaining) || 0), 0);
    const ask = obAsks.filter(a => !a?.isPlaceholder).reduce((s, o) => s + (Number(o?.remaining) || 0), 0);
    const t = bid + ask;
    if (t <= 0) return { bidPct: 50, askPct: 50 };
    return { bidPct: (bid / t) * 100, askPct: (ask / t) * 100 };
  }, [obBids, obAsks]);

  const renderAskItem = React.useCallback(({ item }) => (
    <TouchableOpacity onPress={() => {
      if (item.isPlaceholder) return;
      const priceDecimals = Math.max(getDecimalPlaces(precision || getTickSize(selectedCoin)), 0);
      setPrice(String(Number(item.price).toFixed(priceDecimals)));
    }}>
      <OrderBookAskRow
        item={item}
        maxVolume={maxVolume}
        themeColors={themeColors}
        isDark={isDark}
        selectedCoin={selectedCoin}
        precision={precision}
        styles={styles}
      />
    </TouchableOpacity>
  ), [maxVolume, themeColors, isDark, selectedCoin, precision]);

  const renderBidItem = React.useCallback(({ item }) => (
    <TouchableOpacity onPress={() => {
      if (item.isPlaceholder) return;
      const priceDecimals = Math.max(getDecimalPlaces(precision || getTickSize(selectedCoin)), 0);
      setPrice(String(Number(item.price).toFixed(priceDecimals)));
    }}>
      <OrderBookBidRow
        item={item}
        maxVolume={maxVolume}
        themeColors={themeColors}
        isDark={isDark}
        selectedCoin={selectedCoin}
        precision={precision}
        styles={styles}
      />
    </TouchableOpacity>
  ), [maxVolume, themeColors, isDark, selectedCoin, precision]);

  const getLayout = React.useCallback((_, index) => ({
    length: 26, offset: 26 * index, index
  }), []);

  const renderOrderBook = () => (
    <View style={styles.rightColumn}>
      <View style={styles.obHeader}>
        <AppText type={TEN} color={themeColors.secondaryText}>
          Price{"\n"}({selectedCoin?.margin_asset || selectedCoin?.quote_asset || 'USDT'})
        </AppText>
        <AppText type={TEN} color={themeColors.secondaryText} style={{ textAlign: 'right' }}>
          Size{"\n"}({selectedCoin?.short_name || selectedCoin?.base_asset || 'BTC'})
        </AppText>
      </View>

      {(!futuresData?.sell_order && !futuresData?.buy_order) ? (
        <View>
          <OrderBookSkeleton />
          <View style={[styles.currentPrice, { alignItems: 'flex-start', justifyContent: 'center' }]}>
            <ShimmerBox width="100%" height={20} borderRadius={4} />
            <ShimmerBox width="80%" height={14} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
          <OrderBookSkeleton />
        </View>
      ) : (
        <View>
          {/* Asks */}
          {obAsks.length > 0 && (
            <View style={{ height: viewModeIndex === 0 ? 168 : 336, width: '100%' }}>
              <FlatList
                data={obAsks}
                inverted={true}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={false}
                scrollEnabled={false}
                removeClippedSubviews={true}
                initialNumToRender={visibleRowCount}
                maxToRenderPerBatch={visibleRowCount}
                windowSize={3}
                getItemLayout={getLayout}
                keyExtractor={(item, i) => item._id ? `ask-${item._id}` : `ask-idx-${i}`}
                renderItem={renderAskItem}
              />
            </View>
          )}

          {/* Current Price */}
          <View style={[styles.currentPrice, { alignItems: 'flex-start' }]}>
            <AppText style={{ color: isPricePositive ? colors.green : colors.red, fontWeight: "bold", fontSize: 19 }}>
              {livePrice ? Number(livePrice).toFixed(selectedCoin?.quote_decimal || 2) : "0.00"}
            </AppText>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
              <AppText style={{ fontSize: 11, color: "#8E8E93", fontWeight: "500" }}>
                ≈ ${livePrice ? Number(livePrice).toFixed(selectedCoin?.quote_decimal || 2) : "0.00"}
              </AppText>
            </View>
          </View>

          {/* Bids */}
          {obBids.length > 0 && (
            <View style={{ height: viewModeIndex === 0 ? 168 : 336, width: '100%' }}>
              <FlatList
                data={obBids}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={false}
                scrollEnabled={false}
                removeClippedSubviews={true}
                initialNumToRender={visibleRowCount}
                maxToRenderPerBatch={visibleRowCount}
                windowSize={3}
                getItemLayout={getLayout}
                keyExtractor={(item, i) => item._id ? `bid-${item._id}` : `bid-idx-${i}`}
                renderItem={renderBidItem}
              />
            </View>
          )}
        </View>
      )}

      {/* Ratio Indicator */}
      <View style={[styles.ratioIndicatorBar, { marginVertical: 8, gap: 4 }]}>
        <View style={{ justifyContent: "flex-start", flexShrink: 0 }}>
          <AppText numberOfLines={1} weight={SEMI_BOLD} style={{ color: "#38B781", fontSize: 10 }}>
            {orderBookBidAskRatio.bidPct.toFixed(2)}%
          </AppText>
        </View>
        <View style={[styles.ratioIndicatorTrack, { flex: 1, height: 3 }]}>
          <View style={[styles.ratioIndicatorFill, { width: `${orderBookBidAskRatio.bidPct}%`, backgroundColor: "#38B781", borderTopLeftRadius: 2, borderBottomLeftRadius: 2 }]} />
          <View style={[styles.ratioIndicatorFill, { flex: 1, backgroundColor: "#ED4E4E", borderTopRightRadius: 2, borderBottomRightRadius: 2 }]} />
        </View>
        <View style={{ justifyContent: "flex-end", flexShrink: 0 }}>
          <AppText numberOfLines={1} weight={SEMI_BOLD} style={{ color: "#ED4E4E", fontSize: 10 }}>
            {orderBookBidAskRatio.askPct.toFixed(2)}%
          </AppText>
        </View>
      </View>

      {/* Precision Dropdown */}
      <View style={styles.spotObToolbarRow}>
        <TouchableOpacity
          ref={precisionTriggerRef}
          onPress={openObPrecisionMenu}
          style={[styles.spotObAggTrigger, { backgroundColor: isDark ? darkTheme.darkThemeInputColor : themeColors.input, borderColor: themeColors.themeBorderColor, borderRadius: 5 }]}
          activeOpacity={0.75}
        >
          <AppText type={TEN} weight={SEMI_BOLD} style={{ color: themeColors.text, fontSize: 11, lineHeight: 14 }}>{precision}</AppText>
          <FastImage source={downIcon} style={styles.spotObAggCaret} resizeMode='contain' tintColor={themeColors.secondaryText} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={cycleViewMode}
          style={[styles.spotObViewCycleBtn, { backgroundColor: isDark ? darkTheme.darkThemeInputColor : themeColors.input, borderColor: themeColors.themeBorderColor }]}
          activeOpacity={0.75}
        >
          <FastImage source={SPOT_OB_VIEW_ICONS[viewModeIndex]} style={styles.layoutIcon} resizeMode='contain' />
        </TouchableOpacity>
      </View>

      <Modal visible={obPrecisionOpen} transparent animationType="fade" onRequestClose={closeObPrecisionMenu}>
        <Pressable style={styles.spotObAggBackdrop} onPress={closeObPrecisionMenu} />
        {obPrecisionLayout ? (
          <View
            style={[
              styles.spotObAggPopover,
              {
                top: obPrecisionLayout.y + obPrecisionLayout.h + 4,
                left: Math.max(8, Math.min(obPrecisionLayout.x + obPrecisionLayout.w - 144, Width - 8 - 144)),
                backgroundColor: isDark ? darkTheme.darkThemeInputColor : themeColors.card,
                borderColor: themeColors.themeBorderColor,
              },
            ]}
          >
            {obPrecisionOptions.map((opt) => {
              const selected = precision === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.spotObAggRow,
                    selected && { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setPrecision(opt);
                    closeObPrecisionMenu();
                  }}
                >
                  <AppText
                    type={TEN}
                    weight={selected ? SEMI_BOLD : undefined}
                    style={{ color: themeColors.text, fontSize: 11, lineHeight: 14 }}
                  >
                    {opt}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </Modal>
    </View>
  );

  const renderOrderForm = () => {
    const resolveMaxAndCost = () => {
      if (!selectedCoin) {
        return { costText: '0.00 USDT', maxText: '0.0000 BTC' };
      }

      const balanceToUse = Number(futuresData?.balance?.available_balance ?? usdtFuturesWallet?.balance ?? 0) || 0;
      const takerFeeRate = resolveTakerFeeRate(selectedCoin);

      const stats = computeFuturesLeverageStats({
        availableBalance: balanceToUse,
        leverage: marginLeverage,
        maxLeverage: selectedCoin?.max_leverage || 125,
        leverageTiers: selectedCoin?.leverage_tiers || [],
        takerFeeRate,
      });

      const maxNotional = stats.allowToOpen || 0;

      let px = Number(price) || 0;
      if (!px || px <= 0) {
        px = Number(liveCoin?.mark_price) || 0;
      }

      let maxQty = px > 0 ? maxNotional / px : 0;
      const orderCap = Number(selectedCoin?.max_order_qty);
      if (Number.isFinite(orderCap) && orderCap > 0) {
        maxQty = Math.min(maxQty, orderCap);
      }

      const step = Number(selectedCoin?.step_size) || 0.0001;
      const stepDec = (() => {
        const s = String(step);
        const dot = s.indexOf(".");
        return dot === -1 ? 0 : s.length - dot - 1;
      })();
      const steps = Math.floor(maxQty / step + 1e-12);
      const roundedMaxQty = parseFloat((steps * step).toFixed(stepDec));

      const isValueUnit = contractUnit && contractUnit.includes('Value');
      const baseAsset = selectedCoin?.base_asset || selectedCoin?.short_name || 'BTC';
      const marginAsset = selectedCoin?.margin_asset || 'USDT';

      let maxText = '';
      if (isValueUnit) {
        const quoteDec = selectedCoin?.quote_decimal ?? 2;
        maxText = `${maxNotional.toFixed(quoteDec)} ${marginAsset}`;
      } else {
        maxText = `${roundedMaxQty} ${baseAsset}`;
      }

      const qty = Number(amount) || 0;
      const lev = Math.max(1, Number(marginLeverage) || 1);
      const currentNotional = isValueUnit ? qty : qty * px;
      const orderCost = qty > 0 && lev > 0 ? currentNotional / lev : 0;
      const quoteDec = selectedCoin?.quote_decimal ?? 2;
      const costText = `${orderCost.toFixed(quoteDec)} ${marginAsset}`;

      return {
        costText,
        maxText,
      };
    };

    const handlePriceStep = (direction) => {
      const tick = getTickSize(selectedCoin);
      const targetPrice = orderType === 'Conditional' ? conditionalPrice : price;
      const current = Number(targetPrice) || Number(livePrice) || 0;
      const nextVal = Math.max(0, current + direction * tick);
      const dp = getDecimalPlaces(tick);
      const formatted = nextVal.toFixed(dp);
      if (orderType === 'Conditional') {
        setConditionalPrice(formatted);
      } else {
        setPrice(formatted);
      }
    };

    const handleAmountStep = (direction) => {
      const isValueUnit = (contractUnit || '').includes('Value');
      const step = isValueUnit ? Math.pow(10, -(selectedCoin?.quote_decimal ?? 2)) : getStepSize(selectedCoin);
      const current = Number(amount) || 0;
      const nextVal = Math.max(0, current + direction * step);
      const dp = getDecimalPlaces(step);
      setAmount(nextVal > 0 ? nextVal.toFixed(dp) : '');
      setSliderValue(0);
    };

    return (
      <View style={styles.leftColumn}>
        {/* Buy / Sell Toggle */}
        <View style={[styles.toggleContainer, { backgroundColor: isDark ? '#2a2d35' : '#F7F7F7', marginBottom: 10 }]}>
          <TouchableOpacity style={[styles.toggleBtn, activeTab === 'Buy' && styles.toggleActive]} onPress={() => setActiveTab('Buy')}>
            <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: activeTab === 'Buy' ? colors.white : themeColors.secondaryText }}>Buy</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, activeTab === 'Sell' && { backgroundColor: colors.red }]} onPress={() => setActiveTab('Sell')}>
            <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: activeTab === 'Sell' ? colors.white : themeColors.secondaryText }}>Sell</AppText>
          </TouchableOpacity>
        </View>

        {/* Margin / Leverage Row */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: isDark ? darkTheme.darkThemeInputColor : '#F7F7F7',
              borderColor: isDark ? darkTheme.inputBorder : themeColors.border,
              borderWidth: 0.8,
              borderRadius: 8,
              height: 36,
              paddingHorizontal: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
            onPress={() => {
              setMarginModeDraft(marginMode);
              setIsMarginModeModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <AppText weight={MEDIUM} style={{ color: themeColors.text, fontSize: 13 }}>
              {marginMode === 'Cross' ? 'Cross' : 'Isolated'}
            </AppText>
            <FastImage source={downIcon} style={{ width: 10, height: 10 }} resizeMode='contain' tintColor="#8E8E93" />
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flex: 0.8,
              backgroundColor: isDark ? darkTheme.darkThemeInputColor : '#F7F7F7',
              borderColor: isDark ? darkTheme.inputBorder : themeColors.border,
              borderWidth: 0.8,
              borderRadius: 8,
              height: 36,
              paddingHorizontal: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
            onPress={() => {
              setLeverageDraft(marginLeverage);
              setIsLeverageModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <AppText weight={SEMI_BOLD} style={{ color: themeColors.text, fontSize: 13 }}>
              {marginLeverage}x
            </AppText>
            <FastImage source={downIcon} style={{ width: 10, height: 10 }} resizeMode='contain' tintColor="#8E8E93" />
          </TouchableOpacity>
        </View>

        {/* Order Type Dropdown */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsOrderTypeModalVisible(true)}
          style={{
            backgroundColor: isDark ? darkTheme.darkThemeInputColor : '#F7F7F7',
            borderColor: isDark ? darkTheme.inputBorder : themeColors.border,
            borderWidth: 0.8,
            borderRadius: 8,
            height: 36,
            marginBottom: 10,
            paddingHorizontal: 12,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <AppText weight={MEDIUM} style={{ color: themeColors.text, fontSize: 13 }}>
              {orderType}
            </AppText>
            <FastImage
              source={INFO}
              style={{ height: 13, width: 13, marginLeft: 6 }}
              resizeMode="contain"
              tintColor="#8E8E93"
            />
          </View>
          <FastImage
            source={downIcon}
            resizeMode="contain"
            style={{ width: 10, height: 10 }}
            tintColor="#8E8E93"
          />
        </TouchableOpacity>

        {/* Trigger Price Input (Only for Conditional) */}
        {orderType === 'Conditional' && (
          <View style={{ marginBottom: 10 }}>
            <AppText style={{ fontSize: 11, color: "#8E8E93", marginBottom: 4 }}>Trigger Price ({currentQuoteAsset})</AppText>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#F7F7F7",
                borderColor: isDark ? darkTheme.inputBorder : themeColors.border,
                borderWidth: 0.8,
                borderRadius: 8,
                height: 36,
              }}
            >
              <TextInput
                ref={triggerPriceInputRef}
                placeholder="Trigger Price"
                placeholderTextColor="#8E8E93"
                selectionColor={colors.cyanTheme || "#0AA8C5"}
                value={triggerPrice}
                maxLength={(() => {
                  const tick = getTickSize(selectedCoin);
                  const maxDp = getDecimalPlaces(tick);
                  const dotIdx = (triggerPrice || '').indexOf('.');
                  return dotIdx >= 0 ? dotIdx + 1 + maxDp : undefined;
                })()}
                onChangeText={(text) => {
                  const tick = getTickSize(selectedCoin);
                  const sanitized = sanitizeIncrementInput(text, tick);
                  setTriggerPrice(sanitized);
                }}
                onFocus={() => setIsTriggerFocused(true)}
                onBlur={() => setIsTriggerFocused(false)}
                keyboardType="numeric"
                textAlign="center"
                style={{
                  flex: 1,
                  color: isDark ? "#FFFFFF" : "#000000",
                  fontSize: 12,
                  fontFamily: fontFamilyMedium,
                  paddingVertical: 0,
                  ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                }}
              />
            </View>
          </View>
        )}

        {/* Price Input */}
        <View style={{ marginBottom: 10 }}>
          <AppText style={{ fontSize: 11, color: "#8E8E93", marginBottom: 4 }}>
            {orderType === 'Conditional' ? `Order Price (${currentQuoteAsset})` : `Price (${currentQuoteAsset})`}
          </AppText>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#F7F7F7",
              borderColor: isDark ? darkTheme.inputBorder : themeColors.border,
              borderWidth: 0.8,
              borderRadius: 8,
              height: 36,
            }}
          >
            {orderType !== 'Market' ? (
              <>
                <TouchableOpacity
                  onPress={() => handlePriceStep(-1)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ paddingHorizontal: 10, paddingVertical: 8 }}
                >
                  <AppText style={{ fontSize: 18, color: "#8E8E93", fontWeight: "600", lineHeight: 20 }}>-</AppText>
                </TouchableOpacity>
                <TextInput
                  ref={priceInputRef}
                  placeholder="Price"
                  placeholderTextColor="#8E8E93"
                  selectionColor={colors.cyanTheme || "#0AA8C5"}
                  value={orderType === 'Conditional' ? conditionalPrice : price}
                  maxLength={(() => {
                    const tick = getTickSize(selectedCoin);
                    const maxDp = getDecimalPlaces(tick);
                    const currentVal = orderType === 'Conditional' ? (conditionalPrice || '') : (price || '');
                    const dotIdx = currentVal.indexOf('.');
                    return dotIdx >= 0 ? dotIdx + 1 + maxDp : undefined;
                  })()}
                  onChangeText={(text) => {
                    const tick = getTickSize(selectedCoin);
                    const sanitized = sanitizeIncrementInput(text, tick);
                    if (orderType === 'Conditional') {
                      setConditionalPrice(sanitized);
                    } else {
                      setPrice(sanitized);
                    }
                  }}
                  onFocus={() => orderType === 'Conditional' ? setIsConditionalPriceFocused(true) : setIsPriceFocused(true)}
                  onBlur={() => orderType === 'Conditional' ? setIsConditionalPriceFocused(false) : setIsPriceFocused(false)}
                  keyboardType="numeric"
                  textAlign="center"
                  style={{
                    flex: 1,
                    color: isDark ? "#FFFFFF" : "#000000",
                    fontSize: 12,
                    fontFamily: fontFamilyMedium,
                    paddingVertical: 0,
                    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                  }}
                />
                <TouchableOpacity
                  onPress={() => handlePriceStep(1)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ paddingHorizontal: 10, paddingVertical: 8 }}
                >
                  <AppText style={{ fontSize: 18, color: "#8E8E93", fontWeight: "600", lineHeight: 20 }}>+</AppText>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <AppText style={{ color: "#8E8E93", fontSize: 12, fontWeight: "500" }}>
                  Best Market Price
                </AppText>
              </View>
            )}
          </View>
        </View>

        {/* Amount Input */}
        <View style={{ marginBottom: 10 }}>
          <AppText style={{ fontSize: 11, color: "#8E8E93", marginBottom: 4 }}>
            Amount ({currentBaseAsset})
          </AppText>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#F7F7F7",
              borderColor: isDark ? darkTheme.inputBorder : themeColors.border,
              borderWidth: 0.8,
              borderRadius: 8,
              height: 36,
            }}
          >
            <TouchableOpacity
              onPress={() => handleAmountStep(-1)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ paddingHorizontal: 10, paddingVertical: 8 }}
            >
              <AppText style={{ fontSize: 18, color: "#8E8E93", fontWeight: "600", lineHeight: 20 }}>-</AppText>
            </TouchableOpacity>
            <TextInput
              ref={amountInputRef}
              placeholder="Amount"
              placeholderTextColor="#8E8E93"
              selectionColor={colors.cyanTheme || "#0AA8C5"}
              value={amount}
              maxLength={(() => {
                const isValueUnit = (contractUnit || '').includes('Value');
                const increment = isValueUnit
                  ? Math.pow(10, -(selectedCoin?.quote_decimal ?? 2))
                  : getStepSize(selectedCoin);
                const maxDp = getDecimalPlaces(increment);
                const dotIdx = (amount || '').indexOf('.');
                return dotIdx >= 0 ? dotIdx + 1 + maxDp : undefined;
              })()}
              onChangeText={(text) => {
                const isValueUnit = (contractUnit || '').includes('Value');
                const increment = isValueUnit
                  ? Math.pow(10, -(selectedCoin?.quote_decimal ?? 2))
                  : getStepSize(selectedCoin);
                const sanitized = sanitizeIncrementInput(text, increment);
                setAmount(sanitized);
                setSliderValue(0);
              }}
              onFocus={() => {
                setIsAmountFocused(true);
                setSliderValue(0);
              }}
              onBlur={() => setIsAmountFocused(false)}
              keyboardType="numeric"
              textAlign="center"
              style={{
                flex: 1,
                color: isDark ? "#FFFFFF" : "#000000",
                fontSize: 12,
                fontFamily: fontFamilyMedium,
                paddingVertical: 0,
                ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
              }}
            />
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 10, paddingLeft: 4 }}
              onPress={() => {
                Keyboard.dismiss();
                setIsAmountFocused(false);
                setContractUnitDraft(contractUnit);
                setIsContractUnitModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.secondaryText }}>
                {(() => {
                  const match = contractUnit.match(/\(([^)]+)\)/);
                  const label = match ? match[1] : 'Cont.';
                  return label === 'Contracts' ? 'Cont.' : label;
                })()}
              </AppText>
              <FastImage source={downIcon} style={{ width: 8, height: 8 }} resizeMode='contain' tintColor={themeColors.secondaryText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Slider */}
        {orderType !== 'Conditional' && (
          <View style={{ marginVertical: 10 }}>
            <PercentQuickSelect
              activeValue={sliderValue}
              onSelect={(val) => {
                Keyboard.dismiss();
                setIsAmountFocused(false);
                handleSliderChange(val);
                if (val === 0) {
                  setAmount('');
                }
              }}
              theme={themeObj.theme}
            />
          </View>
        )}

        {/* Available */}
        <View style={[styles.availableRow, { marginBottom: 2, marginTop: orderType == 'Conditional' ? 10 : 0 }]}>
          <AppText type={TWELVE} color={themeColors.secondaryText} style={{ marginRight: 8, paddingVertical: 2 }}>Available</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
            {(!futuresData || futuresData?.contract?.short_name !== selectedCoin?.short_name) ? (
              <ShimmerBox width={60} height={16} borderRadius={4} />
            ) : (
              <>
                <AppText type={TWELVE}
                  style={{ fontFamily: fontFamilyMedium }}>{parseFloat((Math.trunc(Number(futuresData?.balance?.available_balance ?? usdtFuturesWallet?.balance ?? 0) * 100000) / 100000).toFixed(5))} USDT</AppText>
                <TouchableOpacity
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={{ padding: 4 }}
                  onPress={() => {
                    if (!userData) {
                      showError("Please login first to view futures wallet");
                      navigation.navigate(LOGIN_SCREEN);
                      return;
                    }
                    navigation.navigate('WALLET_SCREEN', { activeTab: 'Futures' });
                  }}
                >
                  <FastImage source={add} tintColor={isDark ? colors.white : colors.black} style={{ width: 15, height: 15, marginLeft: 2 }} resizeMode='contain' />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Margin */}
        <View style={[styles.availableRow, { marginBottom: 10, flexWrap: 'wrap' }]}>
          <AppText type={TWELVE} color={themeColors.secondaryText} style={[styles.dashedUnderline, {
            marginRight: 8, paddingVertical: 2,
            color: isDark ? colors.white : colors.black,
            borderBottomColor: isDark ? colors.white : colors.black,
          }]}>Margin</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
            {(!futuresData || futuresData?.contract?.short_name !== selectedCoin?.short_name) ? (
              <ShimmerBox width={80} height={16} borderRadius={4} />
            ) : (
              <>
                <AppText type={TWELVE} style={{ color: colors.green, fontFamily: fontFamilyMedium }}>0.00</AppText>
                <AppText type={TWELVE} style={{ marginHorizontal: 4, fontFamily: fontFamilyMedium }}>/</AppText>
                <AppText type={TWELVE} style={{ color: colors.red, marginRight: 4, fontFamily: fontFamilyMedium }}>0.00</AppText>
                <AppText type={TWELVE} style={{ fontFamily: fontFamilyMedium }}>USDT</AppText>
              </>
            )}
          </View>
        </View>

        {/* TP/SL */}
        <TouchableOpacity
          style={[styles.tpslRow, { justifyContent: 'space-between', marginBottom: showTpSl ? 12 : 8 }]}
          onPress={() => setShowTpSl(!showTpSl)}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[styles.checkbox, showTpSl && { backgroundColor: themeColors.text, borderColor: themeColors.text, alignItems: 'center', justifyContent: 'center' }]}>
              {showTpSl && <FastImage source={tick} style={{ width: 10, height: 10 }} tintColor={isDark ? colors.black : colors.white} resizeMode="contain" />}
            </View>
            <AppText type={TWELVE} style={[styles.dashedUnderline, {
              color: isDark ? colors.white : colors.black,
              borderBottomColor: isDark ? colors.white : colors.black,
            }]}>TP/SL</AppText>
          </View>
          {showTpSl && <AppText type={TWELVE}>Advanced</AppText>}
        </TouchableOpacity>

        {showTpSl && (
          <View style={{ marginBottom: 10 }}>
            {/* TP Input */}
            <View style={{ marginBottom: 10 }}>
              <AppText style={{ fontSize: 11, color: "#8E8E93", marginBottom: 4 }}>Take Profit ({currentQuoteAsset})</AppText>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#F7F7F7",
                  borderColor: isDark ? darkTheme.inputBorder : themeColors.border,
                  borderWidth: 0.8,
                  borderRadius: 8,
                  height: 36,
                }}
              >
                <TextInput
                  ref={tpInputRef}
                  placeholder="TP Price"
                  placeholderTextColor="#8E8E93"
                  selectionColor={colors.cyanTheme || "#0AA8C5"}
                  value={formTp}
                  maxLength={(() => {
                    const tick = getTickSize(selectedCoin);
                    const maxDp = getDecimalPlaces(tick);
                    const dotIdx = (formTp || '').indexOf('.');
                    return dotIdx >= 0 ? dotIdx + 1 + maxDp : undefined;
                  })()}
                  onChangeText={(text) => {
                    const tick = getTickSize(selectedCoin);
                    const sanitized = sanitizeIncrementInput(text, tick);
                    setFormTp(sanitized);
                  }}
                  onFocus={() => setIsTpFocused(true)}
                  onBlur={() => setIsTpFocused(false)}
                  keyboardType="numeric"
                  textAlign="center"
                  style={{
                    flex: 1,
                    color: isDark ? "#FFFFFF" : "#000000",
                    fontSize: 12,
                    fontFamily: fontFamilyMedium,
                    paddingVertical: 0,
                    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                  }}
                />
              </View>
            </View>

            {/* SL Input */}
            <View style={{ marginBottom: 10 }}>
              <AppText style={{ fontSize: 11, color: "#8E8E93", marginBottom: 4 }}>Stop Loss ({currentQuoteAsset})</AppText>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#F7F7F7",
                  borderColor: isDark ? darkTheme.inputBorder : themeColors.border,
                  borderWidth: 0.8,
                  borderRadius: 8,
                  height: 36,
                }}
              >
                <TextInput
                  ref={slInputRef}
                  placeholder="SL Price"
                  placeholderTextColor="#8E8E93"
                  selectionColor={colors.cyanTheme || "#0AA8C5"}
                  value={formSl}
                  maxLength={(() => {
                    const tick = getTickSize(selectedCoin);
                    const maxDp = getDecimalPlaces(tick);
                    const dotIdx = (formSl || '').indexOf('.');
                    return dotIdx >= 0 ? dotIdx + 1 + maxDp : undefined;
                  })()}
                  onChangeText={(text) => {
                    const tick = getTickSize(selectedCoin);
                    const sanitized = sanitizeIncrementInput(text, tick);
                    setFormSl(sanitized);
                  }}
                  onFocus={() => setIsSlFocused(true)}
                  onBlur={() => setIsSlFocused(false)}
                  keyboardType="numeric"
                  textAlign="center"
                  style={{
                    flex: 1,
                    color: isDark ? "#FFFFFF" : "#000000",
                    fontSize: 12,
                    fontFamily: fontFamilyMedium,
                    paddingVertical: 0,
                    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                  }}
                />
              </View>
            </View>
          </View>
        )}

        {/* Slippage (Only for Market) */}
        {orderType === 'Market' && (
          <View style={{ marginBottom: 12 }}>
            <TouchableOpacity
              style={[styles.tpslRow, { justifyContent: 'space-between', marginBottom: showSlippage ? 12 : 0 }]}
              onPress={() => setShowSlippage(!showSlippage)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.checkbox, showSlippage && {
                  backgroundColor: themeColors.text,
                  borderColor: themeColors.text, alignItems: 'center', justifyContent: 'center'
                }]}>
                  {showSlippage && <FastImage source={tick} style={{ width: 10, height: 10 }} tintColor={isDark ? colors.black : colors.white} resizeMode="contain" />}
                </View>
                <AppText type={TWELVE} style={[styles.dashedUnderline, {
                  color: isDark ? colors.white : colors.black
                }]}>Slippage</AppText>
              </View>
            </TouchableOpacity>

            {showSlippage && (
              <View style={{ marginBottom: 10 }}>
                <AppText style={{ fontSize: 11, color: "#8E8E93", marginBottom: 4 }}>Slippage Tolerance (%)</AppText>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#F7F7F7",
                    borderColor: isDark ? darkTheme.inputBorder : themeColors.border,
                    borderWidth: 0.8,
                    borderRadius: 8,
                    height: 36,
                    paddingHorizontal: 12,
                  }}
                >
                  <TextInput
                    cursorColor={isDark ? colors.white : colors.black}
                    value={slippagePct}
                    onChangeText={setSlippagePct}
                    placeholder="0.01~2"
                    placeholderTextColor="#8E8E93"
                    selectionColor={colors.cyanTheme || "#0AA8C5"}
                    keyboardType="numeric"
                    textAlign="center"
                    style={{
                      flex: 1,
                      color: isDark ? "#FFFFFF" : "#000000",
                      fontSize: 12,
                      fontFamily: fontFamilyMedium,
                      paddingVertical: 0,
                      ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                    }}
                  />
                  <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.secondaryText }}>%</AppText>
                </View>
              </View>
            )}
          </View>
        )}

        {/* TIF */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <AppText type={TWELVE} color={themeColors.secondaryText}>TIF</AppText>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            onPress={() => {
              setTifDraft(tif);
              setIsTifModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <AppText type={TWELVE} weight={SEMI_BOLD}>{postOnly ? 'GTX' : tif}</AppText>
            <FastImage source={downIcon} style={{ width: 8, height: 8 }} resizeMode="contain" tintColor={themeColors.text} />
          </TouchableOpacity>
        </View>

        {/* Buttons */}
        {(() => {
          const { maxText, costText } = resolveMaxAndCost();
          const isKycVerified = userData?.kycVerified ?? userData?.kyc_verified ?? (String(userData?.kyc_status ?? userData?.kycStatus ?? "").toLowerCase() === "approved");
          return (
            <View style={{ width: '100%', marginBottom: 12 }}>
              {(!userData) ? (
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: activeTab === 'Buy' ? colors.green : colors.red }
                  ]}
                  onPress={() => NavigationService.reset(NAVIGATION_AUTH_STACK)}
                >
                  <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: colors.white }}>
                    Login
                  </AppText>
                </TouchableOpacity>
              ) : (!isKycVerified) ? (
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: activeTab === 'Buy' ? colors.green : colors.red }
                  ]}
                  onPress={() => NavigationService.navigate(KYC_STATUS_SCREEN)}
                >
                  <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: colors.white }}>
                    Submit Kyc
                  </AppText>
                </TouchableOpacity>
              ) : isBuyForm ? (
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: colors.green, opacity: (!amount || Number(amount) <= 0) ? 0.5 : 1 }
                  ]}
                  disabled={placingOrderSide === "BUY" || !amount || Number(amount) <= 0}
                  onPress={() => handlePlaceOrder("BUY", "BUY")}
                >
                  {placingOrderSide === "BUY" ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: colors.white }}>
                      Buy {currentBaseAsset}
                    </AppText>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: colors.red, opacity: (!amount || Number(amount) <= 0) ? 0.5 : 1 }
                  ]}
                  disabled={placingOrderSide === "SELL" || !amount || Number(amount) <= 0}
                  onPress={() => handlePlaceOrder("SELL", "SELL")}
                >
                  {placingOrderSide === "SELL" ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: colors.white }}>
                      Sell {currentBaseAsset}
                    </AppText>
                  )}
                </TouchableOpacity>
              )}

              <View style={{ marginTop: 12, gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText type={TWELVE} color={themeColors.secondaryText}>Cost</AppText>
                  {(!futuresData || futuresData?.contract?.short_name !== selectedCoin?.short_name) ? (
                    <ShimmerBox width={60} height={14} borderRadius={4} />
                  ) : (
                    <AppText type={TWELVE} weight={SEMI_BOLD}>{costText}</AppText>
                  )}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText type={TWELVE} color={themeColors.secondaryText}>Max</AppText>
                  {(!futuresData || futuresData?.contract?.short_name !== selectedCoin?.short_name) ? (
                    <ShimmerBox width={60} height={14} borderRadius={4} />
                  ) : (
                    <AppText type={TWELVE} weight={SEMI_BOLD}>{maxText}</AppText>
                  )}
                </View>
              </View>
            </View>
          );
        })()}
      </View>
    );
  };

  const dynamicHistoryTabs = React.useMemo(() => [
    { id: 'Positions', label: 'Positions', count: futuresPositions?.length || 0 },
    { id: 'Position History', label: 'Position History' },
    { id: 'Open Orders', label: 'Open Orders', count: futuresOpenOrders?.length || 0 },
    { id: 'Order History', label: 'Order History' },
    { id: 'Trade History', label: 'Trade History' },
    { id: 'Transaction History', label: 'Transaction History' },
  ], [futuresPositions, futuresOpenOrders]);

  const renderBottomTabs = () => (
    <View style={[styles.bottomTabsContainer, { flexDirection: "row", marginTop: 6, alignItems: "center", height: 40, paddingHorizontal: 14 }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: "row", alignItems: "center", gap: 16, paddingRight: 8 }}
        style={{ flex: 1 }}
      >
        {dynamicHistoryTabs.map((t) => (
          <TouchableOpacity
            key={t.id}
            activeOpacity={0.8}
            onPress={() => handleHistoryTabChange(t.id)}
            style={{ alignItems: "center", minHeight: 28, justifyContent: "center", paddingHorizontal: 2 }}
          >
            <AppText
              numberOfLines={1}
              weight={SEMI_BOLD}
              style={{
                color: activeHistoryTab === t.id ? themeColors.text : themeColors.secondaryText,
                fontSize: 14,
              }}
            >
              {t.label} {t.count != null ? `(${t.count})` : ""}
            </AppText>
            <View
              style={{
                width: 24,
                height: 3.5,
                marginTop: 4,
                backgroundColor: activeHistoryTab === t.id ? (colors.cyanTheme || "#0AA8C5") : "transparent",
                borderRadius: 2,
              }}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          if (!userData) {
            showError("Please login first to view futures history");
            navigation.navigate(LOGIN_SCREEN);
            return;
          }
          if (liveCoin) {
            navigation.navigate('FutureHistoryScreen', { selectedCoin: liveCoin, initialTab: activeHistoryTab });
          }
        }}
        style={{
          paddingLeft: 10,
          paddingRight: 4,
          paddingVertical: 4,
          justifyContent: "center",
          alignItems: "center",
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Futures History"
      >
        <FastImage
          source={historyIcon}
          style={{ width: 18, height: 18 }}
          tintColor={isDark ? colors.white : colors.black}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );

  const renderHistoryContent = () => {
    return (
      <View style={{ minHeight: 400 }}>
        <FuturesHistorySection
          activeHistoryTab={activeHistoryTab}
          futuresPositions={futuresPositions}
          loadingPositions={loadingPositions}
          futuresPositionHistory={futuresPositionHistory}
          loadingPositionHistory={loadingPositionHistory}
          futuresOpenOrders={futuresOpenOrders}
          loadingOpenOrders={loadingOpenOrders}
          futuresOrderHistory={futuresOrderHistory}
          loadingOrderHistory={loadingOrderHistory}
          futuresTransactionHistory={futuresTransactionHistory}
          loadingTransactionHistory={loadingTransactionHistory}
          futuresTradeHistory={futuresTradeHistory}
          loadingTradeHistory={loadingTradeHistory}
          themeColors={themeColors}
          isDark={isDark}
          futuresPrice={futuresPrice}
          selectedCoin={selectedCoin}
          limit={5}
          onViewMore={() => {
            if (!userData) {
              showError("Please login first to view futures history");
              navigation.navigate(LOGIN_SCREEN);
              return;
            }
            navigation.navigate('FutureHistoryScreen', { selectedCoin, initialTab: activeHistoryTab });
          }}
          onRefresh={(opts) => {
            fetchFuturesPositions(opts);
            fetchFuturesOpenOrders();
            fetchFuturesPositionHistory();
            fetchFuturesOrderHistory();
            fetchFuturesTradeHistory();
            fetchFuturesTransactionHistory();
          }}
          onPositionClosed={(posId) => {
            setFuturesPositions((prev) =>
              prev.filter((p) => String(p._id || p.symbol || '') !== String(posId))
            );
          }}
        />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {renderHeader()}
      {viewMode === "candles" ? (
        <FutureChartScreen
          isEmbedded={true}
          route={{
            params: {
              coin: liveCoin,
              tradeType: 'Future',
            },
          }}
          navigation={navigation}
          onTradePress={(action) => {
            setViewMode("trade");
            if (action) {
              setActiveTab(action === "sell" || action === "Sell" ? "Sell" : "Buy");
            }
          }}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.mainContent}>
            {renderOrderForm()}
            {renderOrderBook()}
          </View>
          <View style={styles.divider} />
          {renderBottomTabs()}
          {renderHistoryContent()}
        </ScrollView>
      )}

      {/* Margin Mode Modal */}
        <Modal
          visible={isMarginModeModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsMarginModeModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setIsMarginModeModalVisible(false)}
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
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                borderTopWidth: 1,
                borderLeftWidth: 1,
                borderRightWidth: 1,
                borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: Platform.OS === 'ios' ? 34 : 20,
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
              <View style={{ alignItems: "center", marginBottom: 8 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255, 255, 255, 0.2)" }} />
              </View>
              <View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: 6,
                    paddingBottom: 2,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <AppText weight={BOLD} style={{ fontSize: 20, color: themeColors.text }}>
                      Margin Mode
                    </AppText>
                    <AppText
                      weight={MEDIUM}
                      style={{
                        fontSize: 13,
                        color: isDark ? "#8E95A3" : "#6B7280",
                        marginTop: 4,
                      }}
                    >
                      Select the margin mode you want to use for placing your order.
                    </AppText>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsMarginModeModalVisible(false)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={{
                      padding: 4,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <X color={isDark ? "#9CA3AF" : themeColors.text} size={20} strokeWidth={2} />
                  </TouchableOpacity>
                </View>

                <View style={{ marginTop: 12 }}>
                  {[
                    {
                      name: "Isolated",
                      description:
                        "In isolated margin mode, the position margin is the allocated amount, and your loss is limited to it upon liquidation. You can also adjust the margin for positions in this mode.",
                      type: "isolated",
                      gradientColors: ["rgba(124, 58, 237, 0.2)", "rgba(99, 102, 241, 0.2)"],
                      iconColor: "#A78BFA",
                    },
                    {
                      name: "Cross",
                      description:
                        "In cross margin mode, the entire account balance is used as margin, and you may lose it all upon liquidation.",
                      type: "cross",
                      gradientColors: ["rgba(6, 182, 212, 0.2)", "rgba(14, 165, 233, 0.2)"],
                      iconColor: "#06B6D4",
                    },
                  ].map((item) => {
                    const isSelected = marginModeDraft === item.name;
                    const activeColor = colors.cyanTheme || "#0AA8C5";
                    return (
                      <TouchableOpacity
                        key={item.name}
                        activeOpacity={0.8}
                        onPress={() => setMarginModeDraft(item.name)}
                        style={{
                          backgroundColor: isSelected
                            ? (isDark ? "rgba(6, 182, 212, 0.08)" : "rgba(6, 182, 212, 0.06)")
                            : (isDark ? "rgba(255, 255, 255, 0.03)" : "#F8FAFC"),
                          borderWidth: isSelected ? 1.5 : 1,
                          borderColor: isSelected
                            ? activeColor
                            : (isDark ? "rgba(255, 255, 255, 0.08)" : "#E2E8F0"),
                          borderRadius: 14,
                          padding: 14,
                          marginBottom: 12,
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        {/* Left Icon Badge with Subtle Gradient */}
                        <LinearGradient
                          colors={isSelected ? ["rgba(6, 182, 212, 0.25)", "rgba(14, 165, 233, 0.15)"] : item.gradientColors}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            justifyContent: "center",
                            alignItems: "center",
                            marginRight: 12,
                            borderWidth: 1,
                            borderColor: isSelected ? "rgba(6, 182, 212, 0.4)" : "rgba(255, 255, 255, 0.08)",
                          }}
                        >
                          {item.type === "isolated" ? (
                            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                              <Path
                                d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                                stroke={isSelected ? activeColor : (isDark ? "#A0AEC0" : "#64748B")}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <Circle
                                cx={9}
                                cy={7}
                                r={4}
                                stroke={isSelected ? activeColor : (isDark ? "#A0AEC0" : "#64748B")}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <Path
                                d="M19 8v6M22 11h-6"
                                stroke={isSelected ? activeColor : (isDark ? "#A0AEC0" : "#64748B")}
                                strokeWidth={2}
                                strokeLinecap="round"
                              />
                            </Svg>
                          ) : (
                            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                              <Path
                                d="M17 21v-2a4 4 0 0 0-3-3.87M9 20H4a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v2"
                                stroke={isSelected ? activeColor : (isDark ? "#A0AEC0" : "#64748B")}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <Circle
                                cx={9}
                                cy={7}
                                r={4}
                                stroke={isSelected ? activeColor : (isDark ? "#A0AEC0" : "#64748B")}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <Path
                                d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"
                                stroke={isSelected ? activeColor : (isDark ? "#A0AEC0" : "#64748B")}
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </Svg>
                          )}
                        </LinearGradient>

                        {/* Middle Content */}
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <AppText
                            weight={BOLD}
                            style={{
                              color: isSelected ? (isDark ? "#FFFFFF" : "#0F172A") : themeColors.text,
                              fontSize: 15,
                              marginBottom: 4,
                            }}
                          >
                            {item.name}
                          </AppText>
                          <AppText
                            style={{
                              color: isDark ? "#8E95A3" : "#64748B",
                              fontSize: 12,
                              lineHeight: 17,
                            }}
                          >
                            {item.description}
                          </AppText>
                        </View>

                        {/* Right Radio Indicator */}
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            borderWidth: 2,
                            borderColor: isSelected
                              ? activeColor
                              : (isDark ? "rgba(255, 255, 255, 0.2)" : "#CBD5E1"),
                            justifyContent: "center",
                            alignItems: "center",
                            backgroundColor: "transparent",
                          }}
                        >
                          {isSelected && (
                            <View
                              style={{
                                width: 11,
                                height: 11,
                                borderRadius: 5.5,
                                backgroundColor: activeColor,
                              }}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Info Note Row */}
                  <View
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255, 255, 255, 0.04)"
                        : "rgba(0, 0, 0, 0.03)",
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.05)",
                      padding: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 16,
                      marginTop: 4,
                    }}
                  >
                    <Info size={16} color={isDark ? "#8E95A3" : "#64748B"} strokeWidth={2} />
                    <AppText
                      style={{
                        color: isDark ? "#8E95A3" : "#64748B",
                        fontSize: 12,
                        lineHeight: 16,
                        marginLeft: 8,
                        flex: 1,
                      }}
                    >
                      Switching margin modes only applies to the current contract.
                    </AppText>
                  </View>

                  {/* Batch Adjust Margin Mode Row */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setBatchAdjustMarginMode(prev => !prev)}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 20,
                      paddingHorizontal: 2,
                    }}
                  >
                    <AppText weight={MEDIUM} style={{ fontSize: 14, color: themeColors.text }}>
                      Batch Adjust Margin Mode
                    </AppText>
                    <View pointerEvents="none">
                      <ToggleSwitch
                        value={batchAdjustMarginMode}
                        onValueChange={setBatchAdjustMarginMode}
                        isDark={isDark}
                        activeColor={colors.cyanTheme || "#0AA8C5"}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Continue Button */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      setMarginMode(marginModeDraft);
                      setIsMarginModeModalVisible(false);
                      marginModeSheetRef?.current?.close?.();
                    }}
                    style={{
                      backgroundColor: colors.cyanTheme || "#0AA8C5",
                      borderRadius: 24,
                      paddingVertical: 14,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 6,
                    }}
                  >
                    <AppText weight={BOLD} style={{ color: "#FFFFFF", fontSize: 16 }}>
                      Continue
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Contract Unit Preferences Modal */}
        <Modal
          visible={isContractUnitModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsContractUnitModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setIsContractUnitModalVisible(false)}
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
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                borderTopWidth: 1,
                borderLeftWidth: 1,
                borderRightWidth: 1,
                borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: Platform.OS === 'ios' ? 34 : 20,
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
              <View style={{ alignItems: "center", marginBottom: 8 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255, 255, 255, 0.2)" }} />
              </View>
              <View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: 6,
                    paddingBottom: 2,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <AppText weight={BOLD} style={{ fontSize: 20, color: themeColors.text }}>
                      Contract Unit Settings
                    </AppText>
                    <AppText
                      weight={MEDIUM}
                      style={{
                        fontSize: 13,
                        color: isDark ? "#8E95A3" : "#6B7280",
                        marginTop: 4,
                      }}
                    >
                      Choose your preferred unit for entering order size.
                    </AppText>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsContractUnitModalVisible(false)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={{
                      padding: 4,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <X color={isDark ? "#9CA3AF" : themeColors.text} size={20} strokeWidth={2} />
                  </TouchableOpacity>
                </View>

                <View style={{ marginTop: 12 }}>
                  {[
                    {
                      name: `Amount (${currentBaseAsset})`,
                      description: `Order size is entered in ${currentBaseAsset} (base asset).`,
                    },
                    {
                      name: `Value (${currentQuoteAsset})`,
                      description: `Order size is entered in ${currentQuoteAsset} (notional / margin asset).`,
                    },
                  ].map((item) => {
                    const isSelected = contractUnitDraft === item.name;
                    const activeColor = colors.cyanTheme || "#0AA8C5";
                    return (
                      <TouchableOpacity
                        key={item.name}
                        activeOpacity={0.8}
                        onPress={() => setContractUnitDraft(item.name)}
                        style={{
                          backgroundColor: isSelected
                            ? (isDark ? "rgba(6, 182, 212, 0.08)" : "rgba(6, 182, 212, 0.06)")
                            : (isDark ? "rgba(255, 255, 255, 0.03)" : "#F8FAFC"),
                          borderWidth: isSelected ? 1.5 : 1,
                          borderColor: isSelected
                            ? activeColor
                            : (isDark ? "rgba(255, 255, 255, 0.08)" : "#E2E8F0"),
                          borderRadius: 14,
                          padding: 14,
                          marginBottom: 12,
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <AppText
                            weight={BOLD}
                            style={{
                              color: isSelected ? (isDark ? "#FFFFFF" : "#0F172A") : themeColors.text,
                              fontSize: 15,
                              marginBottom: 4,
                            }}
                          >
                            {item.name}
                          </AppText>
                          <AppText
                            style={{
                              color: isDark ? "#8E95A3" : "#64748B",
                              fontSize: 12,
                              lineHeight: 17,
                            }}
                          >
                            {item.description}
                          </AppText>
                        </View>

                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            borderWidth: 2,
                            borderColor: isSelected
                              ? activeColor
                              : (isDark ? "rgba(255, 255, 255, 0.2)" : "#CBD5E1"),
                            justifyContent: "center",
                            alignItems: "center",
                            backgroundColor: "transparent",
                          }}
                        >
                          {isSelected && (
                            <View
                              style={{
                                width: 11,
                                height: 11,
                                borderRadius: 5.5,
                                backgroundColor: activeColor,
                              }}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    if (contractUnit !== contractUnitDraft) {
                      setSliderValue(0);
                      setAmount('');
                    }
                    setContractUnit(contractUnitDraft);
                    setIsContractUnitModalVisible(false);
                  }}
                  style={{
                    height: 48,
                    backgroundColor: colors.cyanTheme || "#0AA8C5",
                    borderRadius: 24,
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 8,
                    marginBottom: 8,
                  }}
                >
                  <AppText weight={BOLD} style={{ color: "#FFFFFF", fontSize: 16 }}>
                    Confirm
                  </AppText>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* TIF Modal */}
        <Modal
          visible={isTifModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsTifModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setIsTifModalVisible(false)}
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
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                borderTopWidth: 1,
                borderLeftWidth: 1,
                borderRightWidth: 1,
                borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: Platform.OS === 'ios' ? 34 : 20,
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
              <View style={{ alignItems: "center", marginBottom: 8 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255, 255, 255, 0.2)" }} />
              </View>
              <View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: 6,
                    paddingBottom: 2,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <AppText weight={BOLD} style={{ fontSize: 20, color: themeColors.text }}>
                      Time in Force (TIF)
                    </AppText>
                    <AppText
                      weight={MEDIUM}
                      style={{
                        fontSize: 13,
                        color: isDark ? "#8E95A3" : "#6B7280",
                        marginTop: 4,
                      }}
                    >
                      Select order validity duration and execution rule.
                    </AppText>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsTifModalVisible(false)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={{
                      padding: 4,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <X color={isDark ? "#9CA3AF" : themeColors.text} size={20} strokeWidth={2} />
                  </TouchableOpacity>
                </View>

                <View style={{ marginTop: 12 }}>
                  {[
                    { id: 'GTC', label: 'GTC (Good Till Cancelled)', desc: 'Remain in effect until fully filled or cancelled' },
                    { id: 'IOC', label: 'IOC (Immediate or Cancel)', desc: 'Fill all or part of the order immediately and cancel the remaining unfilled part' },
                    { id: 'FOK', label: 'FOK (Fill or Kill)', desc: 'Must be filled immediately, otherwise it will be cancelled' },
                  ].map((item) => {
                    const isSelected = (tifDraft || tif) === item.id;
                    const activeColor = colors.cyanTheme || "#0AA8C5";
                    return (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.8}
                        onPress={() => setTifDraft(item.id)}
                        style={{
                          backgroundColor: isSelected
                            ? (isDark ? "rgba(6, 182, 212, 0.08)" : "rgba(6, 182, 212, 0.06)")
                            : (isDark ? "rgba(255, 255, 255, 0.03)" : "#F8FAFC"),
                          borderWidth: isSelected ? 1.5 : 1,
                          borderColor: isSelected
                            ? activeColor
                            : (isDark ? "rgba(255, 255, 255, 0.08)" : "#E2E8F0"),
                          borderRadius: 14,
                          padding: 14,
                          marginBottom: 12,
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          <AppText
                            weight={BOLD}
                            style={{
                              color: isSelected ? (isDark ? "#FFFFFF" : "#0F172A") : themeColors.text,
                              fontSize: 15,
                              marginBottom: 4,
                            }}
                          >
                            {item.label}
                          </AppText>
                          <AppText
                            style={{
                              color: isDark ? "#8E95A3" : "#64748B",
                              fontSize: 12,
                              lineHeight: 17,
                            }}
                          >
                            {item.desc}
                          </AppText>
                        </View>

                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            borderWidth: 2,
                            borderColor: isSelected
                              ? activeColor
                              : (isDark ? "rgba(255, 255, 255, 0.2)" : "#CBD5E1"),
                            justifyContent: "center",
                            alignItems: "center",
                            backgroundColor: "transparent",
                          }}
                        >
                          {isSelected && (
                            <View
                              style={{
                                width: 11,
                                height: 11,
                                borderRadius: 5.5,
                                backgroundColor: activeColor,
                              }}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    setTif(tifDraft || tif);
                    setIsTifModalVisible(false);
                  }}
                  style={{
                    height: 48,
                    backgroundColor: colors.cyanTheme || "#0AA8C5",
                    borderRadius: 24,
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 8,
                    marginBottom: 8,
                  }}
                >
                  <AppText weight={BOLD} style={{ color: "#FFFFFF", fontSize: 16 }}>
                    Confirm
                  </AppText>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

      {/* Adjust Leverage Modal (Native 0-lag slide) */}
      <Modal
        visible={isLeverageModalVisible}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setIsLeverageModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsLeverageModalVisible(false)}
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
              height: 640,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 16,
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
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255, 255, 255, 0.2)" }} />
            </View>
            <View style={{ flex: 1, paddingHorizontal: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4, paddingBottom: 20 }}>
                <AppText weight={BOLD} style={{ fontSize: 18, color: themeColors.text }}>
                  Adjust Leverage
                </AppText>
                <TouchableOpacity onPress={() => setIsLeverageModalVisible(false)} style={{ padding: 4 }}>
                  <FastImage
                    source={closeIcon}
                    resizeMode="contain"
                    style={{ width: 15, height: 15 }}
                    tintColor={themeColors.secondaryText}
                  />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Pair Row */}
                <AppText style={{ color: themeColors.secondaryText, fontSize: 13, marginBottom: 8 }}>Pair</AppText>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
                  <CoinIcon
                    coin={selectedCoin}
                    style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }}
                  />
                  <AppText weight={BOLD} style={{ fontSize: 16, color: themeColors.text }}>
                    {(selectedCoin?.short_name || selectedCoin?.base_asset) ? `${selectedCoin.short_name || selectedCoin.base_asset}/${selectedCoin.margin_asset || selectedCoin.quote_asset || '—'}` : '—/—'}
                  </AppText>
                </View>

                {/* Leverage Input with - / + and direct input */}
                <AppText style={{ color: themeColors.secondaryText, fontSize: 14, marginBottom: 8 }}>Leverage</AppText>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)",
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "#E5E5EA",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 12,
                    marginBottom: 20,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      const current = Number(leverageDraft) || 1;
                      setLeverageDraft(Math.max(1, current - 1));
                    }}
                    style={{ padding: 8, paddingHorizontal: 12 }}
                  >
                    <AppText weight={BOLD} style={{ fontSize: 20, color: themeColors.secondaryText }}>−</AppText>
                  </TouchableOpacity>

                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                    <TextInput
                      value={String(leverageDraft)}
                      onChangeText={(text) => {
                        const clean = text.replace(/[^0-9]/g, "");
                        if (!clean) {
                          setLeverageDraft("");
                          return;
                        }
                        const num = Number(clean);
                        const maxL = Number(selectedCoin?.max_leverage) || 125;
                        if (num > maxL) {
                          setLeverageDraft(maxL);
                        } else {
                          setLeverageDraft(num);
                        }
                      }}
                      onBlur={() => {
                        if (!leverageDraft || Number(leverageDraft) < 1) {
                          setLeverageDraft(1);
                        }
                      }}
                      keyboardType="number-pad"
                      style={{
                        fontSize: 18,
                        fontWeight: "600",
                        color: themeColors.text,
                        textAlign: "center",
                        padding: 0,
                        margin: 0,
                        includeFontPadding: false,
                      }}
                    />
                    <AppText weight={SEMI_BOLD} style={{ fontSize: 18, color: themeColors.text, marginLeft: 0 }}>x</AppText>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      const maxL = Number(selectedCoin?.max_leverage) || 125;
                      const current = Number(leverageDraft) || 1;
                      setLeverageDraft(Math.min(maxL, current + 1));
                    }}
                    style={{ padding: 8, paddingHorizontal: 12 }}
                  >
                    <AppText weight={BOLD} style={{ fontSize: 20, color: themeColors.secondaryText }}>+</AppText>
                  </TouchableOpacity>
                </View>

                {/* Quick selector pills */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 28 }}>
                  {getLeverageOptions(selectedCoin?.max_leverage || 125).map((x) => {
                    const isSelected = Number(leverageDraft) === x;
                    return (
                      <TouchableOpacity
                        key={`lev-${x}`}
                        onPress={() => setLeverageDraft(x)}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 24,
                          borderWidth: 1,
                          borderColor: isSelected ? (colors.cyanTheme || '#0AA8C5') : (isDark ? "rgba(255,255,255,0.12)" : "#E5E5EA"),
                          backgroundColor: isSelected ? 'rgba(10, 168, 197, 0.18)' : (isDark ? "rgba(255,255,255,0.05)" : "#F9F9FB"),
                          alignItems: "center",
                          minWidth: 54,
                        }}
                      >
                        <AppText weight={isSelected ? BOLD : MEDIUM} style={{ color: isSelected ? (colors.cyanTheme || '#0AA8C5') : themeColors.text, fontSize: 14 }}>
                          {x}x
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Info Rows */}
                <View style={{ marginBottom: 20 }}>
                  {(() => {
                    const balanceToUse = Number(futuresData?.balance?.available_balance ?? usdtFuturesWallet?.balance ?? 0) || 0;
                    const maxL = Number(selectedCoin?.max_leverage) || 125;
                    const currentLev = Math.min(Math.max(1, Number(leverageDraft) || 1), maxL);
                    const stats = computeFuturesLeverageStats({
                      availableBalance: balanceToUse,
                      leverage: currentLev,
                      maxLeverage: maxL,
                      leverageTiers: selectedCoin?.leverage_tiers || [],
                    });

                    const fmt = (n, dp = 2) => {
                      const x = Number(n);
                      return Number.isFinite(x) ? x.toLocaleString("en-US", { maximumFractionDigits: dp, minimumFractionDigits: 0 }) : "0";
                    };

                    const maxNotional = stats.maxNotionalAtLev;
                    const markPriceNum = Number(liveCoin?.mark_price) || 0;
                    let maxPosLabel = "—";

                    if (Number.isFinite(maxNotional) && maxNotional === Infinity) {
                      maxPosLabel = "No cap";
                    } else if (Number.isFinite(maxNotional) && maxNotional === 0) {
                      maxPosLabel = "—";
                    } else if (Number.isFinite(markPriceNum) && markPriceNum > 0) {
                      const maxQty = maxNotional / markPriceNum;
                      maxPosLabel = `${fmt(maxQty, 8)} ${selectedCoin?.base_asset || 'BTC'} (≈ ${fmt(maxNotional)} ${selectedCoin?.margin_asset || 'USDT'})`;
                    } else if (Number.isFinite(maxNotional) && maxNotional !== Infinity) {
                      maxPosLabel = `≈ ${fmt(maxNotional)} ${selectedCoin?.margin_asset || 'USDT'}`;
                    }

                    const quoteSymbol = selectedCoin?.margin_asset || 'USDT';

                    return [
                      { label: "Allow to Open", value: `${fmt(stats.allowToOpen)} ${quoteSymbol}` },
                      { label: "Maximum Borrowable", value: `${fmt(stats.maximumBorrowable)} ${quoteSymbol}` },
                      { label: "Maximum Leverage", value: `${stats.maxLeverage}x >` },
                      { label: "Current Loan Limit", value: stats.currentLoanLimit != null ? `${fmt(stats.currentLoanLimit)} ${quoteSymbol}` : `0 ${quoteSymbol}` },
                      { label: `Max position at ${currentLev}x`, value: maxPosLabel },
                    ].map((row, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
                        <AppText style={{ color: themeColors.secondaryText, fontSize: 14 }}>{row.label}</AppText>
                        <AppText weight={SEMI_BOLD} style={{ color: themeColors.text, fontSize: 14 }}>{row.value}</AppText>
                      </View>
                    ));
                  })()}
                </View>

                {/* Warning Text */}
                <View style={{ marginBottom: 10 }}>
                  <AppText style={{ color: '#FF7A00', fontSize: 14, marginTop: 4, marginBottom: 20, lineHeight: 20 }}>
                    The current available margin ≤ 0. You can increase the leverage or add margin.
                  </AppText>
                </View>
              </ScrollView>

              {/* Confirm Button */}
              <Button
                title="Confirm"
                onPress={() => {
                  const maxL = Number(selectedCoin?.max_leverage) || 125;
                  const finalLev = Math.min(Math.max(1, Number(leverageDraft) || 1), maxL);
                  setMarginLeverage(finalLev);
                  setIsLeverageModalVisible(false);
                  rbSheetMarginLeverage.current?.close();
                }}
                containerStyle={{
                  marginTop: 12,
                  marginBottom: 8,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.cyanTheme || '#0AA8C5',
                }}
                titleStyle={{
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: 16,
                }}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Order Type Modal (Native 0-lag slide) */}
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
              backgroundColor: "transparent",
              height: Math.min(540, Dimensions.get("window").height * 0.58),
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 8,
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
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255, 255, 255, 0.2)" }} />
            </View>
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: 14,
                  paddingBottom: 4,
                }}
              >
                <View style={{ flex: 1 }}>
                  <AppText weight={BOLD} style={{ fontSize: 20, color: themeColors.text }}>
                    Order Type
                  </AppText>
                  <AppText
                    weight={MEDIUM}
                    style={{
                      fontSize: 13,
                      color: isDark ? "#8E95A3" : "#6B7280",
                      marginTop: 4,
                    }}
                  >
                    Choose how you want to place your order
                  </AppText>
                </View>
                <TouchableOpacity
                  onPress={() => setIsOrderTypeModalVisible(false)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={{
                    padding: 4,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X color={isDark ? "#9CA3AF" : themeColors.text} size={20} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
              >
                {/* BASIC SECTION */}
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, marginTop: 4 }}>
                  <Gem color="#F59E0B" size={14} strokeWidth={2.5} />
                  <AppText
                    weight={SEMI_BOLD}
                    style={{
                      fontSize: 13,
                      color: "#F59E0B",
                      marginLeft: 8,
                      letterSpacing: 1,
                    }}
                  >
                    BASIC
                  </AppText>
                </View>
                {ORDER_TYPE_SHEET_BASIC.map(renderOrderTypeRow)}

                {/* CONDITIONAL SECTION */}
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, marginTop: 12 }}>
                  <Gem color="#3B82F6" size={14} strokeWidth={2.5} />
                  <AppText
                    weight={SEMI_BOLD}
                    style={{
                      fontSize: 13,
                      color: "#3B82F6",
                      marginLeft: 8,
                      letterSpacing: 1,
                    }}
                  >
                    CONDITIONAL
                  </AppText>
                </View>
                {ORDER_TYPE_SHEET_CONDITIONAL.map(renderOrderTypeRow)}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <AnimatedBottomSheet ref={pairSheetRef} isDark={isDark} theme={theme}>
        <FuturePairList
          pairs={pairData}
          onSelectPair={handleSelectCoin}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onClose={() => pairSheetRef.current?.close()}
        />
      </AnimatedBottomSheet>
    </View >
  );
};

export default FuturesUI;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pairTouchTarget: {
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingVertical: 4,
    paddingRight: 12,
    justifyContent: 'center',
  },
  headerIconBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  smallIcon: {
    width: 12,
    height: 12,
    marginLeft: 6,
  },
  changeBadge: {
    backgroundColor: colors.green,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    marginLeft: 16,
  },
  dummyIconLine: {
    width: 20, height: 16, borderWidth: 1, borderColor: '#333', borderRadius: 4,
  },
  dummyIconCandle: {
    width: 16, height: 16, borderLeftWidth: 2, borderRightWidth: 2, borderColor: '#333',
  },
  mainContent: {
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  leftColumn: {
    flex: 1.05,
    paddingRight: 6,
  },
  rightColumn: {
    flex: 0.95,
    paddingLeft: 6,
  },
  pairBlock: {
    justifyContent: "center",
  },
  pairTitle: {
    fontSize: 22,
    letterSpacing: -0.2,
  },
  changeText: {
    fontSize: 13,
    marginTop: 3,
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  badgeContainer: {
    alignItems: "center",
    marginRight: 14,
  },
  mmBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  iconGroup: {
    flexDirection: "row",
    borderRadius: 22,
    padding: 3,
    alignItems: "center",
  },
  iconWrapper: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  dashedUnderline: {
    borderBottomWidth: 1,

    borderStyle: 'dashed',

  },
  fundingRow: {
    marginBottom: 16,
  },
  obHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  obRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4.5,
    minHeight: 26,
    width: '100%',
  },
  obFillRed: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(235, 77, 92, 0.15)',
  },
  obFillGreen: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 192, 118, 0.15)',
  },
  currentPrice: {
    marginVertical: 12,
  },
  ratioIndicatorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratioIndicatorTrack: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: 2,
  },
  ratioIndicatorFill: {
    height: '100%',
  },
  spotObToolbarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 0,
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
  layoutIcon: {
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
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 20,
    padding: 2,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 18,
  },
  toggleActive: {
    backgroundColor: colors.green,
  },
  marginRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  marginBox: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
  },
  orderTypeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  infoIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputBox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 42,
    justifyContent: 'center',
  },
  textInput: {
    padding: 0,
    margin: 0,
    fontSize: 14,
    fontFamily: fontFamilySemiBold
  },
  bboBtn: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 10,
    borderRadius: 6,
    height: 42,
    justifyContent: 'center',
  },
  sliderContainer: {
    marginVertical: 20,
    paddingHorizontal: 4,
  },
  sliderTrack: {
    height: 2,
    backgroundColor: '#eee',
    width: '100%',
    position: 'absolute',
    top: 6,
    left: 4,
  },
  sliderKnob: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#666',
    position: 'absolute',
    left: '25%', // Adjust based on sliderValue
    top: 0,
    zIndex: 1,
  },
  sliderMarks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  sliderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ccc',
    marginBottom: 4,
  },
  tpslRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  checkbox: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 2,
  },
  availableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonWrapper: {
    marginBottom: 12,
  },
  maxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  actionBtn: {
    paddingVertical: 8,
    borderRadius: 24,
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 8,
  },
  bottomTabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bottomTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  bottomTabActive: {
    alignItems: 'center',
  },
  activeTabIndicator: {
    width: 20,
    height: 3,
    backgroundColor: colors.black,
    marginTop: 4,
    borderRadius: 2,
  },
  bottomTab: {
    alignItems: 'center',
  },
  historyIconBtn: {
    marginLeft: 'auto',
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  telescopeIcon: {
    width: 60,
    height: 60,
    backgroundColor: '#f5f5f5', // Placeholder
    borderRadius: 30,
    marginBottom: 12,
  }
});