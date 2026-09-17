import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions, TextInput, Modal, Pressable, Animated, FlatList, Platform, ToastAndroid, Alert, Keyboard, ActivityIndicator, InteractionManager } from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import { setFuturesData } from "../../slices/homeSlice";
import FastImage from 'react-native-fast-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import RBSheet from 'react-native-raw-bottom-sheet';
import AnimatedBottomSheet from '../../common/AnimatedBottomSheet/AnimatedBottomSheet';
import FuturePairList from './FuturePairList';
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
  right_ic
} from '../../helper/ImageAssets';
import { fontFamilyMedium, fontFamilySemiBold } from '../../theme/typography';
import {
  computeFuturesLeverageStats,
  formatPriceByTick,
  formatQtyByStep,
  getDecimalPlaces,
  getOrderBookAggOptionsForPair,
  aggregateOrderBookRows,
  getTickSize,
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

LogBox.ignoreLogs(['VirtualizedLists should never be nested inside plain ScrollViews']);

const { width: Width, height: Height } = Dimensions.get('window');

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

const OrderBookAskRow = React.memo(({ item: ask, maxVolume, themeColors, isDark, selectedCoin, styles }) => {
  if (ask.isPlaceholder) {
    return (
      <View style={styles.obRow}>
        <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.secondaryText, opacity: 0.15 }}>—</AppText>
        <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.secondaryText, opacity: 0.15 }}>—</AppText>
      </View>
    );
  }
  const ratio = Math.min(100, (ask.remaining / maxVolume) * 100);
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
        {formatPriceByTick(ask.price, selectedCoin)}
      </AppText>
      <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
        {formatQtyByStep(ask.remaining, selectedCoin)}
      </AppText>
    </View>
  );
}, (prev, next) => prev.item.price === next.item.price && prev.item.remaining === next.item.remaining && prev.maxVolume === next.maxVolume);

const OrderBookBidRow = React.memo(({ item: bid, maxVolume, themeColors, isDark, selectedCoin, styles }) => {
  if (bid.isPlaceholder) {
    return (
      <View style={styles.obRow}>
        <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.secondaryText, opacity: 0.15 }}>—</AppText>
        <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.secondaryText, opacity: 0.15 }}>—</AppText>
      </View>
    );
  }
  const ratio = Math.min(100, (bid.remaining / maxVolume) * 100);
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
        {formatPriceByTick(bid.price, selectedCoin)}
      </AppText>
      <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
        {formatQtyByStep(bid.remaining, selectedCoin)}
      </AppText>
    </View>
  );
}, (prev, next) => prev.item.price === next.item.price && prev.item.remaining === next.item.remaining && prev.maxVolume === next.maxVolume);

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

  const [futuresPositions, setFuturesPositions] = useState([]);
  const [loadingPositions, setLoadingPositions] = useState(false);

  const historyFetchGenRef = React.useRef({
    positions: 0,
    positionHistory: 0,
    openOrders: 0,
    orderHistory: 0,
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
        dispatch(setFuturesData(null));
        setSelectedCoin(activeCoin);
        const p = activeCoin.buy_price ?? activeCoin.last_price ?? activeCoin.mark_price;
        if (p) {
          setPrice(String(formatPriceByTick(parseFloat(p), activeCoin)));
        }
        if (subscribeToFutures && activeCoin.symbol) {
          subscribeToFutures({ symbol: activeCoin.symbol });
        }
      }
    }
  }, [route.params?.coin, route.params?.pair, route.params?.coinDetail, subscribeToFutures, dispatch]);

  const fetchFuturesPositions = React.useCallback(async (opts = {}) => {
    if (!selectedCoin?.symbol) {
      setLoadingPositions(false);
      return;
    }
    const silent = opts?.silent === true;
    const gen = ++historyFetchGenRef.current.positions;
    if (!silent) setLoadingPositions(true);
    try {
      const params = { symbol: selectedCoin.symbol, skip: 0, limit: 50 };
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
  }, [selectedCoin?.symbol]);

  const fetchFuturesPositionHistory = React.useCallback(async () => {
    if (!selectedCoin?.symbol) {
      setLoadingPositionHistory(false);
      return;
    }
    const gen = ++historyFetchGenRef.current.positionHistory;
    setLoadingPositionHistory(true);
    try {
      const params = { symbol: selectedCoin.symbol, skip: 0, limit: 50 };
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
  }, [selectedCoin?.symbol]);

  const fetchFuturesOpenOrders = React.useCallback(async () => {
    if (!selectedCoin?.symbol) {
      setLoadingOpenOrders(false);
      return;
    }
    const gen = ++historyFetchGenRef.current.openOrders;
    setLoadingOpenOrders(true);
    try {
      const params = { symbol: selectedCoin.symbol, skip: 0, limit: 50 };
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
  }, [selectedCoin?.symbol]);

  const fetchFuturesOrderHistory = React.useCallback(async () => {
    if (!selectedCoin?.symbol) {
      setLoadingOrderHistory(false);
      return;
    }
    const gen = ++historyFetchGenRef.current.orderHistory;
    setLoadingOrderHistory(true);
    try {
      const params = { symbol: selectedCoin.symbol, skip: 0, limit: 50 };
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
  }, [selectedCoin?.symbol]);

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
      } else if (activeHistoryTab === 'Transaction History') {
        fetchFuturesTransactionHistory();
      }
    });

    return () => task.cancel();
  }, [isFocused, activeHistoryTab, fetchFuturesPositions, fetchFuturesPositionHistory, fetchFuturesOpenOrders, fetchFuturesOrderHistory, fetchFuturesTransactionHistory]);

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
  }, [futuresPrice, selectedCoin]);

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
  const [marginMode, setMarginMode] = useState('Cross');
  const marginModeSheetRef = useRef(null);
  const tifSheetRef = useRef(null);
  const [batchAdjustMarginMode, setBatchAdjustMarginMode] = useState(false);
  const [contractUnit, setContractUnit] = useState('Amount (BTC)');
  const [contractUnitDraft, setContractUnitDraft] = useState('Amount (BTC)');
  const contractUnitSheetRef = useRef(null);

  useEffect(() => {
    if (selectedCoin?.short_name) {
      setContractUnit(`Amount (${selectedCoin.short_name})`);
      setContractUnitDraft(`Amount (${selectedCoin.short_name})`);
    }
  }, [selectedCoin]);

  // Precision Dropdown State
  const obPrecisionOptions = React.useMemo(() => {
    return getOrderBookAggOptionsForPair(getTickSize(selectedCoin));
  }, [selectedCoin]);

  const [precision, setPrecision] = useState(null);

  useEffect(() => {
    if (obPrecisionOptions.length > 0 && (!precision || !obPrecisionOptions.includes(precision))) {
      setPrecision(obPrecisionOptions[0]);
    }
  }, [obPrecisionOptions, selectedCoin]);
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
    {
      name: "Conditional",
      description: "Your order will be placed automatically when the target price is reached.",
      icon: spotLimitTrade,
    },
  ];

  const renderOrderTypeRow = (item, index) => {
    const selected = orderType === item.name;
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
          paddingVertical: 14,
          paddingHorizontal: 4,
          borderBottomWidth: index - 1 ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: index - 1 ? 'transparent' : themeColors.themeBorderColor,
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
          <AppText type={TWELVE} style={{ color: themeColors.secondaryText, fontSize: 11, lineHeight: 15 }}>
            {item.description}
          </AppText>
        </View>
        {selected ? (
          <View style={{ width: 16, height: 16, borderRadius: 10, backgroundColor: isDark ? colors.white : colors.black, alignItems: "center", justifyContent: "center" }}>
            <FastImage source={tick} tintColor={isDark ? colors.black : colors.white} style={{ width: 8, height: 8 }} resizeMode="contain" />
          </View>
        ) : (
          <View style={{ width: 26 }} />
        )}
      </TouchableOpacity>
    );
  };

  useEffect(() => {
    const pairsArray = (futuresPairs && futuresPairs.length > 0)
      ? futuresPairs
      : (futuresData?.contracts || futuresData?.pairs || []);

    if (pairsArray && pairsArray.length > 0) {
      setPairData(pairsArray);

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
  }, [futuresPairs, futuresData]);

  useEffect(() => {
    if (!isFocused) return undefined;

    const task = InteractionManager.runAfterInteractions(() => {
      dispatch(getOpenOrders(0, 10, "cross", selectedCoin?.symbol));
      dispatch(getUserFuturesWallet("futures"));
    });

    return () => task.cancel();
  }, [isFocused, pairData.length, subscribeToFutures, unsubscribeFromFutures, dispatch, selectedCoin?.symbol]);

  useEffect(() => {
    if (isFocused && selectedCoin) {
      subscribeToFutures({ symbol: selectedCoin.symbol });
      return () => {
        dispatch(setFuturesData(null));
        unsubscribeFromFutures({ symbol: selectedCoin.symbol, base_currency_id: selectedCoin._id });
      };
    }
  }, [isFocused, selectedCoin, subscribeToFutures, unsubscribeFromFutures, dispatch]);

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


  const renderHeader = React.useCallback(() => (
    <View style={{ paddingTop: 10, paddingBottom: 10, paddingHorizontal: 16, backgroundColor: themeColors.background }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
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
            <>
              <View style={styles.pairRow}>
                <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ fontSize: 20 }}>
                  {`${liveCoin.short_name || liveCoin.base_asset}/${liveCoin.margin_asset}`}
                </AppText>
                <FastImage source={downIcon} style={styles.smallIcon} resizeMode="contain" tintColor={themeColors.text} />
              </View>
              <View style={styles.changeBadge}>
                <AppText type={TWELVE} weight={MEDIUM} style={{ color: colors.white }}>
                  {`${liveCoin.change_percentage >= 0 ? '+' : ''}${liveCoin.change_percentage || 0}%`}
                </AppText>
              </View>
            </>
          ) : (
            <>
              <ShimmerBox width={150} height={24} borderRadius={4} />
              <View style={{ marginTop: 4 }}>
                <ShimmerBox width={60} height={18} borderRadius={4} />
              </View>
            </>
          )}
        </TouchableOpacity>

        <View style={[styles.headerIcons, { flexDirection: 'row', gap: 4 }]}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            activeOpacity={0.7}
            onPress={() => {
              if (liveCoin) {
                NavigationService.navigate('FutureChartScreen', { coin: liveCoin, tradeType: 'Future' });
              }
            }}
          >
            <FastImage
              source={candle}
              style={{ width: 22, height: 22 }}
              resizeMode="contain"
              tintColor={themeColors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
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
          >
            <FastImage
              source={history_line}
              style={{ width: 22, height: 22 }}
              resizeMode="contain"
              tintColor={themeColors.text}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ), [activeHistoryTab, liveCoin, navigation, openPairSheet, themeColors.text, userData]);

  const obAsks = React.useMemo(() => {
    const allAsks = futuresData?.sell_order || [];
    const aggregated = aggregateOrderBookRows(allAsks, precision);
    const sorted = [...aggregated].sort((a, b) => Number(a.price) - Number(b.price));
    let data = viewModeIndex === 1 ? [] : sorted.slice(0, 50);

    if (viewModeIndex !== 1) {
      const minRows = viewModeIndex === 0 ? 6 : 12;
      data = [...data];
      while (data.length < minRows) {
        data.push({ isPlaceholder: true, _id: `placeholder-ask-${data.length}` });
      }
    }
    return data;
  }, [futuresData?.sell_order, viewModeIndex, precision]);

  const obBids = React.useMemo(() => {
    const allBids = futuresData?.buy_order || [];
    const aggregated = aggregateOrderBookRows(allBids, precision);
    const sorted = [...aggregated].sort((a, b) => Number(b.price) - Number(a.price));
    let data = viewModeIndex === 2 ? [] : sorted.slice(0, 50);

    if (viewModeIndex !== 2) {
      const minRows = viewModeIndex === 0 ? 6 : 12;
      data = [...data];
      while (data.length < minRows) {
        data.push({ isPlaceholder: true, _id: `placeholder-bid-${data.length}` });
      }
    }
    return data;
  }, [futuresData?.buy_order, viewModeIndex, precision]);

  const maxVolume = React.useMemo(() => {
    const maxAsk = obAsks.reduce((max, a) => Math.max(max, a.remaining || 0), 0);
    const maxBid = obBids.reduce((max, b) => Math.max(max, b.remaining || 0), 0);
    return Math.max(maxAsk, maxBid) || 1;
  }, [obAsks, obBids]);

  const orderBookBidAskRatio = React.useMemo(() => {
    const bid = obBids.reduce((s, o) => s + (Number(o.remaining ?? o.quantity) || 0), 0);
    const ask = obAsks.reduce((s, o) => s + (Number(o.remaining ?? o.quantity) || 0), 0);
    const t = bid + ask;
    if (t <= 0) return { bidPct: 50, askPct: 50 };
    return { bidPct: (bid / t) * 100, askPct: (ask / t) * 100 };
  }, [obBids, obAsks]);

  const renderAskItem = React.useCallback(({ item }) => (
    <TouchableOpacity onPress={() => {
      if (item.isPlaceholder) return;
      setPrice(String(formatPriceByTick(item.price, selectedCoin)));
    }}>
      <OrderBookAskRow
        item={item}
        maxVolume={maxVolume}
        themeColors={themeColors}
        isDark={isDark}
        selectedCoin={selectedCoin}
        styles={styles}
      />
    </TouchableOpacity>
  ), [maxVolume, themeColors, isDark, selectedCoin]);

  const renderBidItem = React.useCallback(({ item }) => (
    <TouchableOpacity onPress={() => {
      if (item.isPlaceholder) return;
      setPrice(String(formatPriceByTick(item.price, selectedCoin)));
    }}>
      <OrderBookBidRow
        item={item}
        maxVolume={maxVolume}
        themeColors={themeColors}
        isDark={isDark}
        selectedCoin={selectedCoin}
        styles={styles}
      />
    </TouchableOpacity>
  ), [maxVolume, themeColors, isDark, selectedCoin]);

  const getLayout = React.useCallback((_, index) => ({
    length: 26, offset: 26 * index, index
  }), []);

  const renderOrderBook = () => (
    <View style={styles.leftColumn}>


      <View style={styles.obHeader}>
        <AppText type={TEN} color={themeColors.secondaryText}>Price{"\n"}(USDT)</AppText>
        <AppText type={TEN} color={themeColors.secondaryText} style={{ textAlign: 'right' }}>Size{"\n"}(USDT)</AppText>
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
                nestedScrollEnabled={true}
                removeClippedSubviews={true}
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={5}
                updateCellsBatchingPeriod={100}
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
                nestedScrollEnabled={true}
                removeClippedSubviews={true}
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={5}
                updateCellsBatchingPeriod={100}
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

    return (
      <View style={styles.rightColumn}>
        {/* Buy / Sell Toggle */}
        <View style={[styles.toggleContainer, { backgroundColor: isDark ? '#2a2d35' : '#F7F7F7' }]}>
          <TouchableOpacity style={[styles.toggleBtn, activeTab === 'Buy' && styles.toggleActive]} onPress={() => setActiveTab('Buy')}>
            <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: activeTab === 'Buy' ? colors.white : themeColors.secondaryText }}>Buy</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, activeTab === 'Sell' && { backgroundColor: colors.red }]} onPress={() => setActiveTab('Sell')}>
            <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: activeTab === 'Sell' ? colors.white : themeColors.secondaryText }}>Sell</AppText>
          </TouchableOpacity>
        </View>

        {/* Margin / Leverage */}
        <View style={[styles.marginRow, { marginBottom: 8 }]}>
          <TouchableOpacity
            style={[styles.marginBox, { paddingVertical: 8, borderRadius: 6, backgroundColor: isDark ? darkTheme.darkThemeInputColor : '#F7F7F7' }]}
            onPress={() => setIsOrderTypeModalVisible(true)}
            activeOpacity={0.7}
          >
            <View pointerEvents="none" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1, width: '100%' }}>
              <AppText type={THIRTEEN} weight={SEMI_BOLD}>{orderType}</AppText>
              <FastImage source={downIcon} style={{ width: 10, height: 10 }} resizeMode='contain' tintColor={themeColors.secondaryText} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.marginBox, { flex: 0.6, paddingVertical: 8, borderRadius: 6, backgroundColor: isDark ? darkTheme.darkThemeInputColor : '#F7F7F7' }]}
            onPress={() => {
              setLeverageDraft(marginLeverage);
              setIsLeverageModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <View pointerEvents="none" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1, width: '100%' }}>
              <AppText type={THIRTEEN} weight={SEMI_BOLD}>{marginLeverage}x</AppText>
              <FastImage source={downIcon} style={{ width: 10, height: 10 }} resizeMode='contain' tintColor={themeColors.secondaryText} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Trigger Price Input (Only for Conditional) */}
        {orderType === 'Conditional' && (
          <View style={[styles.inputRow, { marginBottom: 12 }]}>
            <View style={[styles.inputBox, { backgroundColor: isDark ? darkTheme.darkThemeInputColor : '#F7F7F7', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: "relative" }]}>
              <View style={{ justifyContent: 'center', flex: 1 }}>
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: 0,
                    top: triggerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 4],
                    }),
                  }}
                >
                  <Animated.Text
                    style={{
                      color: themeColors.secondaryText,
                      fontFamily: fontFamilyMedium,
                      fontSize: triggerAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [13, 11],
                      }),
                    }}
                  >
                    Trigger Price
                  </Animated.Text>
                </Animated.View>
                <TextInput
                  cursorColor={isDark ? colors.white : colors.black}
                  value={triggerPrice}
                  onChangeText={setTriggerPrice}
                  onFocus={() => setIsTriggerFocused(true)}
                  onBlur={() => setIsTriggerFocused(false)}
                  placeholder=""
                  keyboardType="numeric"
                  style={[styles.textInput, { color: themeColors.text, fontFamily: fontFamilySemiBold, paddingTop: 14, paddingBottom: 0, paddingLeft: 0, marginTop: 4 }]}
                />
              </View>
              <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.secondaryText }}>USDT</AppText>
            </View>
          </View>
        )}

        {/* Price Input */}
        <View style={styles.inputRow}>
          <View style={[styles.inputBox, { backgroundColor: isDark ? darkTheme.darkThemeInputColor : '#F7F7F7', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: "relative" }]}>
            <View style={{ justifyContent: 'center', flex: 1 }}>
              <Animated.View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: 0,
                  top: (orderType === 'Conditional' ? conditionalPriceAnim : priceAnim).interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 4],
                  }),
                }}
              >
                <Animated.Text
                  style={{
                    color: themeColors.secondaryText,
                    fontFamily: fontFamilyMedium,
                    fontSize: (orderType === 'Market' ? new Animated.Value(1) : (orderType === 'Conditional' ? conditionalPriceAnim : priceAnim)).interpolate({
                      inputRange: [0, 1],
                      outputRange: [13, 11],
                    }),
                  }}
                >
                  {orderType === 'Conditional' ? 'Order Price' : 'Price'}
                </Animated.Text>
              </Animated.View>
              <TextInput
                cursorColor={isDark ? colors.white : colors.black}
                value={orderType === 'Market' ? '---Best Market Price---' : (orderType === 'Conditional' ? conditionalPrice : price)}
                onChangeText={orderType === 'Conditional' ? setConditionalPrice : setPrice}
                onFocus={() => orderType === 'Conditional' ? setIsConditionalPriceFocused(true) : setIsPriceFocused(true)}
                onBlur={() => orderType === 'Conditional' ? setIsConditionalPriceFocused(false) : setIsPriceFocused(false)}
                placeholder=""
                placeholderTextColor={themeColors.secondaryText}
                keyboardType="numeric"
                editable={orderType !== 'Market'}
                style={[
                  styles.textInput,
                  {
                    color: orderType === 'Market' ? themeColors.secondaryText : themeColors.text,
                    fontFamily: fontFamilySemiBold,
                    paddingTop: 14,
                    paddingBottom: 0,
                    paddingLeft: 0,
                    marginTop: 4,
                    opacity: orderType === 'Market' ? 0.5 : 1
                  }
                ]}
              />
            </View>
            <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.secondaryText }}>USDT</AppText>
          </View>
        </View>

        {/* Amount Input */}
        <View style={[styles.inputBox, { backgroundColor: isDark ? darkTheme.darkThemeInputColor : '#F7F7F7', flex: 0, marginTop: 12, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: "relative" }]}>
          <View style={{ justifyContent: 'center', flex: 1 }}>
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 0,
                top: amountAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 4],
                }),
              }}
            >
              <Animated.Text
                style={{
                  color: themeColors.secondaryText,
                  fontFamily: fontFamilyMedium,
                  fontSize: amountAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [13, 11],
                  }),
                }}
              >
                Amount
              </Animated.Text>
            </Animated.View>
            <TextInput
              cursorColor={isDark ? colors.white : colors.black}
              value={amount}
              onChangeText={(text) => {
                if (isAmountFocused) {
                  setAmount(text);
                  setSliderValue(0);
                }
              }}
              onFocus={() => {
                setIsAmountFocused(true);
                setSliderValue(0);
              }}
              onBlur={() => setIsAmountFocused(false)}
              placeholder=""
              keyboardType="numeric"
              style={[styles.textInput, { color: themeColors.text, fontFamily: fontFamilySemiBold, paddingTop: 14, paddingBottom: 0, paddingLeft: 0, marginTop: 4 }]}
            />
          </View>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 10 }}
            onPress={() => {
              Keyboard.dismiss();
              setIsAmountFocused(false);
              setContractUnitDraft(contractUnit);
              contractUnitSheetRef.current?.open();
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
          <View style={{ marginBottom: 12 }}>
            {/* TP Input */}
            <AppText type={TWELVE} color={themeColors.secondaryText} style={{ marginBottom: 6 }}>TP</AppText>
            <View style={[styles.inputBox, { backgroundColor: isDark ? darkTheme.darkThemeInputColor : '#F7F7F7', flex: 0, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: "relative", marginBottom: 12 }]}>
              <View style={{ justifyContent: 'center', flex: 1 }}>
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: 0,
                    top: tpAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 4],
                    }),
                  }}
                >
                  <Animated.Text
                    style={{
                      color: themeColors.secondaryText,
                      fontFamily: fontFamilyMedium,
                      fontSize: tpAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [13, 11],
                      }),
                    }}
                  >
                    Take Profit
                  </Animated.Text>
                </Animated.View>
                <TextInput
                  cursorColor={isDark ? colors.white : colors.black}
                  value={formTp}
                  onChangeText={setFormTp}
                  onFocus={() => setIsTpFocused(true)}
                  onBlur={() => setIsTpFocused(false)}
                  placeholder=""
                  keyboardType="numeric"
                  style={[styles.textInput, { color: themeColors.text, fontFamily: fontFamilySemiBold, paddingTop: 14, paddingBottom: 0, paddingLeft: 0, marginTop: 4 }]}
                />
              </View>
              <AppText type={TWELVE} weight={SEMI_BOLD}>Price</AppText>
            </View>

            {/* SL Input */}
            <AppText type={TWELVE} color={themeColors.secondaryText} style={{ marginBottom: 6 }}>SL</AppText>
            <View style={[styles.inputBox, { backgroundColor: isDark ? darkTheme.darkThemeInputColor : '#F7F7F7', flex: 0, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: "relative" }]}>
              <View style={{ justifyContent: 'center', flex: 1 }}>
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: 0,
                    top: slAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 4],
                    }),
                  }}
                >
                  <Animated.Text
                    style={{
                      color: themeColors.secondaryText,
                      fontFamily: fontFamilyMedium,
                      fontSize: slAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [13, 11],
                      }),
                    }}
                  >
                    Stop Loss
                  </Animated.Text>
                </Animated.View>
                <TextInput
                  cursorColor={isDark ? colors.white : colors.black}
                  value={formSl}
                  onChangeText={setFormSl}
                  onFocus={() => setIsSlFocused(true)}
                  onBlur={() => setIsSlFocused(false)}
                  placeholder=""
                  keyboardType="numeric"
                  style={[styles.textInput, { color: themeColors.text, fontFamily: fontFamilySemiBold, paddingTop: 14, paddingBottom: 0, paddingLeft: 0, marginTop: 4 }]}
                />
              </View>
              <AppText type={TWELVE} weight={SEMI_BOLD}>Price</AppText>
            </View>
          </View>
        )}

        {/* Post Only (Only for Limit) */}
        {/* {orderType === 'Limit' && (
          <TouchableOpacity
            style={[styles.tpslRow, { marginBottom: 12 }]}
            onPress={() => setPostOnly(!postOnly)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.checkbox, postOnly && { backgroundColor: themeColors.text, borderColor: themeColors.text, alignItems: 'center', justifyContent: 'center' }]}>
                {postOnly && <FastImage source={tick} style={{ width: 10, height: 10 }} tintColor={isDark ? colors.black : colors.white} resizeMode="contain" />}
              </View>
              <AppText type={TWELVE} style={[styles.dashedUnderline]}>Post Only</AppText>
            </View>
          </TouchableOpacity>
        )} */}

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
              <View style={[styles.inputBox, { backgroundColor: isDark ? darkTheme.darkThemeInputColor : '#F7F7F7', flex: 0, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: "relative" }]}>
                <View style={{ justifyContent: 'center', flex: 1 }}>
                  <Animated.View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 4,
                    }}
                  >
                    <Animated.Text style={{ color: themeColors.secondaryText, fontFamily: fontFamilyMedium, fontSize: 11 }}>
                      Percentage
                    </Animated.Text>
                  </Animated.View>
                  <TextInput
                    cursorColor={isDark ? colors.white : colors.black}
                    value={slippagePct}
                    onChangeText={setSlippagePct}
                    placeholder="0.01~2"
                    placeholderTextColor={themeColors.secondaryText}
                    keyboardType="numeric"
                    style={[styles.textInput, { color: themeColors.text, fontFamily: fontFamilyMedium, paddingTop: 14, paddingBottom: 0, paddingLeft: 0, marginTop: 4 }]}
                  />
                </View>
                <AppText type={TWELVE} weight={SEMI_BOLD}>%</AppText>
              </View>
            )}
          </View>
        )}

        {/* TIF */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <AppText type={TWELVE} color={themeColors.secondaryText}>TIF</AppText>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            onPress={() => tifSheetRef.current?.open()}
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
                      Buy {selectedCoin?.short_name || 'BTC'}
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
                      Sell {selectedCoin?.short_name || 'BTC'}
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
    <View style={[styles.bottomTabsContainer, { flexDirection: "row", marginTop: 6, alignItems: "center", height: 40 }]}>
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
                width: 20,
                height: 10,
                marginTop: 2,
                backgroundColor: activeHistoryTab === t.id ? isDark ? colors.white : colors.black : "transparent",
                borderRadius: 2,
              }}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

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
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.mainContent}>
          {renderOrderBook()}
          {renderOrderForm()}
        </View>
        <View style={styles.divider} />
        {renderBottomTabs()}
        {renderHistoryContent()}

        {/* Margin Mode Sheet */}
        <RBSheet
          ref={marginModeSheetRef}
          keyboardAvoidingViewEnabled={false}
          customModalProps={{ statusBarTranslucent: true }}
          closeOnDragDown={true}
          closeOnPressMask={true}
          height={480}
          animationType="slide"
          customStyles={{
            container: {
              backgroundColor: themeColors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 20,
            },
            wrapper: {
              backgroundColor: "#0006",
            },
            draggableIcon: {
              backgroundColor: themeColors.themeBorderColor || "#ccc",
              width: 40,
            },
          }}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8, paddingBottom: 4 }}>
              <AppText weight={BOLD} style={{ fontSize: 18, color: themeColors.text }}>
                Margin Mode
              </AppText>

            </View>
            <AppText style={{ color: themeColors.secondaryText, fontSize: 13, marginBottom: 20 }}>
              Select the unit type you want to use for placing your order.
            </AppText>

            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                {
                  name: "Isolated",
                  description:
                    "In isolated margin mode, the position margin is the allocated amount, and your loss is limited to it upon liquidation. You can also adjust the margin for positions in this mode.",
                },
                {
                  name: "Cross",
                  description:
                    "In cross margin mode, the entire account balance is used as margin, and you may lose it all upon liquidation.",
                },
              ].map((item) => {
                const isSelected = marginMode === item.name;
                return (
                  <TouchableOpacity
                    key={item.name}
                    activeOpacity={0.8}
                    onPress={() => {
                      setMarginMode(item.name);
                    }}
                    style={{
                      backgroundColor: 'transparent',
                      borderWidth: 1,
                      borderColor: isSelected
                        ? themeColors.text
                        : (themeColors.themeBorderColor || "#e0e0e0"),
                      borderRadius: 6,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      marginBottom: 16,
                    }}
                  >
                    <AppText
                      weight={SEMI_BOLD}
                      style={{
                        color: themeColors.text,
                        fontSize: 15,
                        marginBottom: 6,
                      }}
                    >
                      {item.name}
                    </AppText>
                    <AppText
                      style={{
                        color: themeColors.secondaryText,
                        fontSize: 12,
                        lineHeight: 18,
                      }}
                    >
                      {item.description}
                    </AppText>
                  </TouchableOpacity>
                );
              })}

              <AppText style={{ color: themeColors.secondaryText, fontSize: 12, marginBottom: 20, marginTop: 4 }}>
                Switching margin modes only applies to the current contract.
              </AppText>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
                <AppText weight={MEDIUM} style={{ fontSize: 15, color: themeColors.text }}>
                  Batch Adjust Margin Mode
                </AppText>
                <ToggleSwitch
                  value={batchAdjustMarginMode}
                  onValueChange={setBatchAdjustMarginMode}
                  isDark={isDark}
                />
              </View>
            </ScrollView>
          </View>
        </RBSheet>

        {/* Contract Unit Preferences Sheet */}
        <RBSheet
          ref={contractUnitSheetRef}
          keyboardAvoidingViewEnabled={false}
          customModalProps={{ statusBarTranslucent: true }}
          closeOnDragDown={true}
          closeOnPressMask={true}
          height={450}
          animationType="slide"
          customStyles={{
            container: {
              backgroundColor: themeColors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 20,
            },
            wrapper: {
              backgroundColor: "#0006",
            },
            draggableIcon: {
              backgroundColor: themeColors.themeBorderColor || "#ccc",
              width: 40,
            },
          }}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 8, paddingBottom: 20 }}>
              <AppText weight={BOLD} style={{ fontSize: 18, color: themeColors.text }}>
                Contract Unit Settings
              </AppText>
              <TouchableOpacity onPress={() => contractUnitSheetRef.current?.close()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <FastImage source={REMOVE} style={{ width: 16, height: 16 }} tintColor={themeColors.text} resizeMode="contain" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                {
                  name: `Amount (${selectedCoin?.base_currency || 'BTC'})`,
                  description: `Order size is entered in ${selectedCoin?.base_currency || 'BTC'} (base asset).`,
                },
                {
                  name: `Value (${selectedCoin?.quote_currency || 'USDT'})`,
                  description: `Order size is entered in ${selectedCoin?.quote_currency || 'USDT'} (notional / margin asset).`,
                },
              ].map((item) => {
                const isSelected = contractUnitDraft === item.name;
                return (
                  <TouchableOpacity
                    key={item.name}
                    activeOpacity={0.8}
                    onPress={() => {
                      setContractUnitDraft(item.name);
                    }}
                    style={{
                      backgroundColor: 'transparent',
                      borderWidth: 1,
                      borderColor: isSelected
                        ? themeColors.text
                        : (themeColors.themeBorderColor || "#e0e0e0"),
                      borderRadius: 6,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      marginBottom: 16,
                    }}
                  >
                    <AppText
                      weight={SEMI_BOLD}
                      style={{
                        color: themeColors.text,
                        fontSize: 15,
                        marginBottom: 6,
                      }}
                    >
                      {item.name}
                    </AppText>
                    <AppText
                      style={{
                        color: themeColors.secondaryText,
                        fontSize: 12,
                        lineHeight: 18,
                      }}
                    >
                      {item.description}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Button
              children='Confirm'
              onPress={() => {
                if (contractUnit !== contractUnitDraft) {
                  setSliderValue(0);
                  setAmount('');
                }
                setContractUnit(contractUnitDraft);
                contractUnitSheetRef.current?.close();
              }}
              containerStyle={{
                height: 50,
                justifyContent: 'center',
                borderRadius: 25,
                marginTop: 20,
                marginBottom: 20,
              }}
              textStyle={{
                fontSize: 15,
                fontFamily: fontFamilySemiBold,
              }}
            />

          </View>
        </RBSheet>



        <RBSheet
          ref={tifSheetRef}
          height={400}
          animationType="slide"
          keyboardAvoidingViewEnabled={false}
          customModalProps={{ statusBarTranslucent: true }}
          closeOnDragDown={true}
          closeOnPressMask={true}
          customStyles={{
            container: {
              backgroundColor: themeColors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 20,
            },
            wrapper: {
              backgroundColor: "#0006",
            },
            draggableIcon: {
              backgroundColor: themeColors.themeBorderColor || "#ccc",
              width: 40,
            },
          }}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingBottom: 16 }}>
              <AppText weight={SEMI_BOLD} style={{ fontSize: 18, color: themeColors.text }}>
                TIF
              </AppText>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {[
                { id: 'GTC', label: 'GTC (Good Till Cancelled)', desc: 'Remain in effect until fully filled or cancelled' },
                { id: 'IOC', label: 'IOC (Immediate or Cancel)', desc: 'Fill all or part of the order immediately and cancel the remaining unfilled part' },
                { id: 'FOK', label: 'FOK (Fill or Kill)', desc: 'Must be filled immediately, otherwise it will be cancelled' },
              ].map(item => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    setTif(item.id);
                    tifSheetRef.current?.close();
                  }}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isDark ? colors.themeElevationColor : themeColors.bg || (isDark ? '#1a1a1a' : '#f5f5f5'),
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: tif === item.id ? isDark ? colors.themeElevationColor : (themeColors.primary || '#000') : 'transparent'
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ marginBottom: 4 }}>{item.label}</AppText>
                    <AppText type={TWELVE} color={themeColors.secondaryText}>{item.desc}</AppText>
                  </View>
                  <View style={[styles.checkbox, tif === item.id && { backgroundColor: themeColors.text, borderColor: themeColors.text, alignItems: 'center', justifyContent: 'center' }]}>
                    {tif === item.id && <FastImage source={tick} style={{ width: 10, height: 10 }} tintColor={isDark ? colors.black : colors.white} resizeMode="contain" />}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </RBSheet>

      </ScrollView>

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
              backgroundColor: themeColors.background,
              height: 640,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 16,
            }}
          >
            <View style={{ flex: 1, paddingHorizontal: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4, paddingBottom: 20 }}>
                <AppText weight={BOLD} style={{ fontSize: 18, color: themeColors.text, marginTop: 10 }}>
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
                  {selectedCoin?.icon_path ? (
                    <FastImage
                      source={{ uri: IMAGE_BASE_URL + selectedCoin.icon_path.replace(/^\//, '') }}
                      style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }}
                    />
                  ) : null}
                  <AppText weight={BOLD} style={{ fontSize: 16, color: themeColors.text }}>
                    {(selectedCoin?.short_name || selectedCoin?.base_asset) ? `${selectedCoin.short_name || selectedCoin.base_asset}/${selectedCoin.margin_asset || selectedCoin.quote_asset || '—'}` : '—/—'}
                  </AppText>
                </View>

                {/* Leverage Input */}
                <AppText style={{ color: themeColors.secondaryText, fontSize: 14, marginBottom: 8 }}>Leverage</AppText>
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: 'transparent', borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.1)" : "#E5E5EA", paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, marginBottom: 24 }}>
                  <AppText weight={SEMI_BOLD} style={{ fontSize: 16, color: themeColors.text }}>{leverageDraft}x</AppText>
                </View>

                {/* Quick selector pills */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
                  {[5, 10, 20, 50, 100, 125].filter(x => x <= (selectedCoin?.max_leverage || 125)).map((x) => {
                    const isSelected = leverageDraft === x;
                    return (
                      <TouchableOpacity
                        key={`lev-${x}`}
                        onPress={() => setLeverageDraft(x)}
                        style={{
                          paddingHorizontal: 18,
                          paddingVertical: 10,
                          borderRadius: 24,
                          borderWidth: 1,
                          borderColor: isSelected ? themeColors.text : (isDark ? "rgba(255,255,255,0.1)" : "#E5E5EA"),
                          backgroundColor: isSelected ? 'transparent' : (isDark ? "rgba(255,255,255,0.05)" : "#F9F9FB"),
                          alignItems: "center"
                        }}
                      >
                        <AppText weight={MEDIUM} style={{ color: themeColors.text, fontSize: 14 }}>
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
                    const stats = computeFuturesLeverageStats({
                      availableBalance: balanceToUse,
                      leverage: leverageDraft,
                      maxLeverage: selectedCoin?.max_leverage || 125,
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
                      { label: `Max position at ${leverageDraft}x`, value: maxPosLabel },
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
                onPress={() => {
                  setMarginLeverage(leverageDraft);
                  setIsLeverageModalVisible(false);
                  rbSheetMarginLeverage.current?.close();
                }}
                containerStyle={{
                  marginTop: 12,
                  marginBottom: 8,
                  backgroundColor: isDark ? "#FFFFFF" : "#1C1C1E",
                }}
                textStyle={{
                  color: isDark ? "#000000" : "#FFFFFF"
                }}
              >
                Confirm
              </Button>
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
              backgroundColor: themeColors.background,
              height: Math.min(540, Dimensions.get("window").height * 0.6),
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 8,
            }}
          >
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: themeColors.themeBorderColor || (isDark ? colors.white_opacity : colors.black_opacity) }} />
            </View>
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
                  onPress={() => setIsOrderTypeModalVisible(false)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: isDark ? colors.themeElevationColor : themeColors.background,
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
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ marginLeft: 4, top: 2 }}
                  >
                    <FastImage source={INFO} style={{ width: 12, height: 12 }} resizeMode="contain" tintColor={themeColors.secondaryText} />
                  </TouchableOpacity>
                </View>
                {ORDER_TYPE_SHEET_BASIC.map(renderOrderTypeRow)}
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
    paddingHorizontal: 16,
  },
  leftColumn: {
    flex: 0.4,
    paddingRight: 10,
  },
  rightColumn: {
    flex: 0.7,
    paddingLeft: 10,
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