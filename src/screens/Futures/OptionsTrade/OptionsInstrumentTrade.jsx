import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { appOperation } from '../../../appOperation';
import { LOGIN_SCREEN, KYC_STATUS_SCREEN } from '../../../navigation/routes';
import { decNum, decStr } from './helpers/optionsDataHelpers';
import {
  computeOrderReserveUsdt,
  estimateOptionsOrderCost,
  floorToIncrement,
  formatFeeRateDisplay,
  formatOrderDecimal,
  getOptionsPriceBandError,
  getIncrementDecimalPlaces,
  hasConfiguredIncrement,
  isValidIncrementInput,
  INSUFFICIENT_FUNDS_MSG,
  maxAffordableOptionsQuantity,
  resolveIncrementSize,
  resolveContractFeeRates,
  sanitizeIncrementInput,
  snapToIncrementInput,
  validateOptionsPlaceOrder,
  newOptionsIdempotencyKey,
  parseOptionsApiError
} from './helpers/optionsOrderValidation';
import { showError, showSuccess } from '../../../helper/logger';
import { ShimmerBox } from '../../spotScreen/Spot';
import { buildOrderbookDisplayRows } from './helpers/optionsDataHelpers';
import useOptionsWebSocket from './hooks/useOptionsWebSocket';
import { bumpOptionsWsStat, logOptionsWs } from './helpers/optionsWsDebug';


import { View, StyleSheet, TouchableOpacity, ScrollView, Dimensions, TextInput, Platform, Keyboard, Modal, Pressable, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from '@codler/react-native-keyboard-aware-scroll-view';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { useTheme } from '../../../hooks/useTheme';
import { AppText, BOLD, MEDIUM, SEMI_BOLD, TWELVE, FOURTEEN, SIXTEEN, TEN, THIRTEEN, AppSafeAreaView } from '../../../common';
import { colors } from '../../../theme/colors';
import FastImage from 'react-native-fast-image';
import {
  back_ic,
  candle,
  right_ic,
  downIcon,
  INFO,
  limitTrade,
  tick,
  order_1,
  order_2,
  order_3,
  NO_NOTIFICATION_ICON
} from '../../../helper/ImageAssets';
import { fontFamilyMedium, fontFamilySemiBold } from '../../../theme/typography';
import PercentQuickSelect from '../../../shared/components/PercentQuickSelect';

const { width: Width } = Dimensions.get('window');

const SPOT_OB_VIEW_ICONS = [order_1, order_2, order_3];
const obPrecisionOptions = ['0.1', '0.01', '0.001'];

function fmtNum(val, decimals = 2) {
  const n = decNum(val);
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

const OptionsInstrumentTrade = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const themeObj = useTheme();
  const { colors: themeColors, isDark } = themeObj;

  const { item, currentPrice, selectedAsset, isCall } = route.params || {};
  const symbol = item?.symbol;

  const renderCountRef = React.useRef(0);
  renderCountRef.current += 1;
  if (__DEV__) {
    bumpOptionsWsStat("screenRender");
    if (renderCountRef.current <= 3 || renderCountRef.current % 10 === 0) {
      logOptionsWs("OptionsInstrumentTrade render", {
        count: renderCountRef.current,
        symbol,
        selectedAsset,
      });
    }
  }

  // State
  const [tradeTab, setTradeTab] = useState('buy'); // 'buy' or 'sell'
  const [bottomTab, setBottomTab] = useState('positions'); // positions, orders, assets
  const [sliderValue, setSliderValue] = useState(0);
  const [reduceOnly, setReduceOnly] = useState(false);
  const [orderAmount, setOrderAmount] = useState('');
  const [isAmountFocused, setIsAmountFocused] = useState(false);

  const [orderPrice, setOrderPrice] = useState('');
  const [orderTif, setOrderTif] = useState("GTC");
  const [tifOpen, setTifOpen] = useState(false);
  const tifTriggerRef = React.useRef(null);
  const [tifMenuLayout, setTifMenuLayout] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showFeeTooltip, setShowFeeTooltip] = useState(false);

  const userData = useSelector((state) => state.auth?.userData);
  const isLoggedIn = Boolean(userData);
  const kycStatus = userData?.kycVerified;
  const needsKyc = kycStatus === 0 || kycStatus === 1 || kycStatus === 3;
  const kycButtonLabel = kycStatus === 1
    ? "Verification Pending"
    : kycStatus === 0
      ? "Submit Kyc"
      : "Kyc Rejected Verify Again";


  const [precision, setPrecision] = useState('0.01');
  const [obPrecisionOpen, setObPrecisionOpen] = useState(false);
  const [obPrecisionLayout, setObPrecisionLayout] = useState(null);
  const precisionTriggerRef = React.useRef(null);
  const [viewModeIndex, setViewModeIndex] = useState(0);

  const openObPrecisionMenu = () => {
    precisionTriggerRef.current?.measure((x, y, w, h, px, py) => {
      setObPrecisionLayout({ x: px, y: py, w, h });
      setObPrecisionOpen(true);
    });
  };

  const closeObPrecisionMenu = () => {
    setObPrecisionOpen(false);
  };

  const openTifMenu = () => {
    tifTriggerRef.current?.measure((x, y, w, h, px, py) => {
      setTifMenuLayout({ x: px, y: py, w, h });
      setTifOpen(true);
    });
  };

  const closeTifMenu = () => {
    setTifOpen(false);
  };

  const orderBookViewMode = viewModeIndex === 0 ? "both" : viewModeIndex === 1 ? "bids" : "asks";
  const showAskSide = orderBookViewMode !== "bids";
  const showBidSide = orderBookViewMode !== "asks";
  const obVisibleRows = showAskSide && showBidSide ? 5 : 10;
  const {
    orderbook,
    isOrderbookLoading,
    isAccountLoading,
    isMarketLoading,
    currentPrice: wsCurrentPrice,
    chains,
    recentTrades,
    marketOverview,
    accountUpdate,
    userOrders,
    userPositions,
    refreshLiveTradeChannels,
  } = useOptionsWebSocket(selectedAsset, symbol, isFocused);

  const avblUsdt = useMemo(() => {
    if (!isLoggedIn || !accountUpdate) return 0;
    return decNum(accountUpdate.available_balance);
  }, [isLoggedIn, accountUpdate]);

  const symbolPosition = useMemo(() => {
    if (!symbol) return null;
    return userPositions.find((p) => p.symbol === symbol) ?? null;
  }, [userPositions, symbol]);

  const symbolOpenOrders = useMemo(() => {
    if (!symbol) return [];
    return userOrders.filter((o) => o.symbol === symbol);
  }, [userOrders, symbol]);

  const underlyingPair = selectedAsset ? `${selectedAsset}USDT` : "BTCUSDT";
  const contractHint = `1 Cont = 1 ${underlyingPair}`;

  const feeRates = useMemo(
    () => marketOverview?.fee_rates ?? {
      transaction_fee_rate: 0.0003,
      taker_fee_rate: 0.0003,
      exercise_fee_rate: 0.00015,
      liquidation_fee_rate: 0.005,
    },
    [marketOverview?.fee_rates]
  );

  const rawAsks = React.useMemo(() => {
    if (!orderbook?.asks) return [];
    return [...orderbook.asks].reverse().slice(0, obVisibleRows);
  }, [orderbook, obVisibleRows]);

  const rawBids = React.useMemo(() => {
    if (!orderbook?.bids) return [];
    return orderbook.bids.slice(0, obVisibleRows);
  }, [orderbook, obVisibleRows]);

  const paddedAskDisplay = React.useMemo(() => {
    const display = buildOrderbookDisplayRows(rawAsks);
    if (display.length >= obVisibleRows) return display;
    return [...display, ...Array.from({ length: obVisibleRows - display.length }, () => null)];
  }, [rawAsks, obVisibleRows]);

  const paddedBidDisplay = React.useMemo(() => {
    const display = buildOrderbookDisplayRows(rawBids);
    if (display.length >= obVisibleRows) return display;
    return [...display, ...Array.from({ length: obVisibleRows - display.length }, () => null)];
  }, [rawBids, obVisibleRows]);

  const obRatio = React.useMemo(() => {
    const bidSum = rawBids.reduce((s, r) => s + Number(r.qty || 0), 0);
    const askSum = rawAsks.reduce((s, r) => s + Number(r.qty || 0), 0);
    const total = bidSum + askSum;
    if (!total) return { bidPct: 50, askPct: 50, total };
    const bidPct = (bidSum / total) * 100;
    return { bidPct, askPct: 100 - bidPct, total };
  }, [rawBids, rawAsks]);

  const paddedTrades = React.useMemo(() => {
    const list = [...(recentTrades || [])].slice(0, 10);
    if (list.length >= 5) return list.slice(0, 5);
    return [...list, ...Array.from({ length: 5 - list.length }, () => null)];
  }, [recentTrades]);

  const selectedContractRaw = React.useMemo(() => {
    if (!symbol) return item ?? null;
    if (chains) {
      for (const chain of chains) {
        for (const row of chain.data) {
          if (row.call?.symbol === symbol) return row.call;
          if (row.put?.symbol === symbol) return row.put;
        }
      }
    }
    if (item && String(item.symbol || "").toUpperCase() === String(symbol).toUpperCase()) {
      return item;
    }
    return null;
  }, [chains, symbol, item]);

  const isLiveDataLoading = Boolean(symbol) && isOrderbookLoading;
  const isFormMetaLoading = isLiveDataLoading || isMarketLoading;

  const activeCurrentPrice = wsCurrentPrice || currentPrice;
  const indexPriceStr = activeCurrentPrice ? activeCurrentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "--";
  const lastPriceStr = selectedContractRaw?.last != null ? Number(selectedContractRaw.last).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "--";

  const changeStr = "--";

  const delta = selectedContractRaw?.delta != null ? Number(selectedContractRaw.delta).toFixed(4) : "--";
  const theta = selectedContractRaw?.theta != null ? Number(selectedContractRaw.theta).toFixed(4) : "--";
  const gamma = selectedContractRaw?.gamma != null ? Number(selectedContractRaw.gamma).toFixed(6) : "--";
  const vegaStr = selectedContractRaw?.vega != null ? Number(selectedContractRaw.vega).toFixed(4) : "--";
  const ivStr = selectedContractRaw?.markIvPct != null ? `${Number(selectedContractRaw.markIvPct).toFixed(1)}%` : "--";

  const obIvPct = useMemo(() => {
    const iv = selectedContractRaw?.markIvPct;
    return iv > 0 ? iv : null;
  }, [selectedContractRaw?.markIvPct]);

  const ivDisplay = obIvPct != null && obIvPct > 0 ? `${obIvPct.toFixed(1)}%` : "--";

  const indexPrice = activeCurrentPrice;
  const AVAILABLE_W = Width - 32;
  const LEFT_W = AVAILABLE_W * 0.42;
  const RIGHT_W = AVAILABLE_W * 0.52;

  const tickSizeProp = item?.tick_size ?? selectedContractRaw?.tick_size;
  const stepSizeProp = item?.step_size ?? selectedContractRaw?.step_size;

  const tickSize = useMemo(() => resolveIncrementSize(tickSizeProp, selectedContractRaw, "tick_size"), [tickSizeProp, selectedContractRaw]);
  const stepSize = useMemo(() => resolveIncrementSize(stepSizeProp, selectedContractRaw, "step_size"), [stepSizeProp, selectedContractRaw]);
  const priceMaxDecimals = useMemo(() => getIncrementDecimalPlaces(tickSize), [tickSize]);
  const amountMaxDecimals = useMemo(() => getIncrementDecimalPlaces(stepSize), [stepSize]);
  const hasTickConfig = useMemo(() => hasConfiguredIncrement(tickSizeProp, selectedContractRaw, "tick_size"), [tickSizeProp, selectedContractRaw]);
  const hasStepConfig = useMemo(() => hasConfiguredIncrement(stepSizeProp, selectedContractRaw, "step_size"), [stepSizeProp, selectedContractRaw]);

  const priceUserEditedRef = React.useRef(false);
  const prefilledForSymbolRef = React.useRef(null);

  useEffect(() => {
    priceUserEditedRef.current = false;
    prefilledForSymbolRef.current = null;

    if (!symbol) {
      setOrderPrice('');
      return;
    }

    const routeContract = item && String(item.symbol || "").toUpperCase() === String(symbol).toUpperCase() ? item : null;
    const routeTick = resolveIncrementSize(routeContract?.tick_size, routeContract, "tick_size");
    const routeRef = decNum(routeContract?.last ?? routeContract?.mark_price);
    if (routeRef > 0 && hasConfiguredIncrement(routeContract?.tick_size, routeContract, "tick_size")) {
      const snapped = snapToIncrementInput(String(routeRef), routeTick);
      if (snapped) {
        setOrderPrice(snapped);
        prefilledForSymbolRef.current = symbol;
        return;
      }
    }

    setOrderPrice('');
  }, [symbol, item]);

  useEffect(() => {
    setSliderValue(0);
    setOrderAmount("");
    setReduceOnly(false);
  }, [symbol, tradeTab]);

  useEffect(() => {
    setOrderAmount((prev) => {
      if (!prev) return prev;
      return sanitizeIncrementInput(prev, stepSize);
    });
  }, [stepSize]);

  useEffect(() => {
    setOrderPrice((prev) => {
      if (!prev || priceUserEditedRef.current) return prev;
      return sanitizeIncrementInput(prev, tickSize);
    });
  }, [tickSize]);

  const getLatestTradePrice = useCallback((trades) => {
    if (!Array.isArray(trades) || trades.length === 0) return null;
    let bestPrice = null;
    let bestTs = -Infinity;
    for (const t of trades) {
      const price = decNum(t.price);
      if (price <= 0) continue;
      let ts = decNum(t.timestamp);
      if (!Number.isFinite(ts) || ts <= 0) {
        const d = new Date(t.timestamp);
        ts = Number.isNaN(d.getTime()) ? 0 : d.getTime();
      }
      if (ts >= bestTs) {
        bestTs = ts;
        bestPrice = price;
      }
    }
    return bestPrice;
  }, []);

  const obLastPrice = useMemo(() => {
    const fromTrade = getLatestTradePrice(recentTrades);
    if (fromTrade != null) return fromTrade;
    const legLast = selectedContractRaw?.last ?? selectedContractRaw?.markIv;
    return legLast > 0 ? legLast : null;
  }, [recentTrades, selectedContractRaw, getLatestTradePrice]);

  useEffect(() => {
    if (!symbol || priceUserEditedRef.current || !hasTickConfig) return;
    if (prefilledForSymbolRef.current === symbol) return;

    const mark = decNum(selectedContractRaw?.mark_price);
    const ref =
      obLastPrice != null && obLastPrice > 0
        ? obLastPrice
        : mark > 0
          ? mark
          : null;

    if (ref == null || ref <= 0) return;

    const snapped = snapToIncrementInput(String(ref), tickSize);
    if (snapped) {
      setOrderPrice(snapped);
      prefilledForSymbolRef.current = symbol;
    }
  }, [
    symbol,
    obLastPrice,
    selectedContractRaw?.mark_price,
    tickSize,
    hasTickConfig,
  ]);

  const effectiveFeeRates = useMemo(() => resolveContractFeeRates(selectedContractRaw, feeRates), [selectedContractRaw, feeRates]);

  const maxContracts = useMemo(
    () =>
      maxAffordableOptionsQuantity({
        availableBalance: avblUsdt,
        price: orderPrice,
        stepSize,
        side: tradeTab.toUpperCase(),
        orderType: "LIMIT",
        indexPrice,
        markPrice: selectedContractRaw?.mark_price ?? orderPrice,
        strike: selectedContractRaw?.strike,
        optionType: selectedContractRaw?.option_type,
        contractSize: selectedContractRaw?.contract_size ?? "1",
        feeRates: effectiveFeeRates,
        position: symbolPosition,
        openOrders: symbolOpenOrders,
        symbol: symbol,
      }),
    [avblUsdt, orderPrice, stepSize, tradeTab, indexPrice, selectedContractRaw, effectiveFeeRates, symbolPosition, symbolOpenOrders, symbol]
  );

  const applyPct = useCallback(
    (pct) => {
      setSliderValue(pct);
      if (pct === 0) {
        setOrderAmount("");
        return;
      }
      if (maxContracts <= 0) {
        setOrderAmount("");
        return;
      }
      const qty = floorToIncrement((maxContracts * pct) / 100, stepSize);
      setOrderAmount(qty > 0 ? formatOrderDecimal(qty, stepSize) : "");
    },
    [maxContracts, stepSize]
  );

  const handleSliderChange = (val) => {
    Keyboard.dismiss();
    setIsAmountFocused(false);
    applyPct(val);
  };

  const normalizedPreview = useMemo(() => {
    const p = floorToIncrement(orderPrice, tickSize);
    const qty = floorToIncrement(orderAmount, stepSize);
    const side = tradeTab.toUpperCase();
    const costEst = estimateOptionsOrderCost({
      side,
      price: p,
      quantity: qty,
      orderType: "LIMIT",
      indexPrice,
      markPrice: selectedContractRaw?.mark_price ?? p,
      strike: selectedContractRaw?.strike,
      optionType: selectedContractRaw?.option_type,
      contractSize: selectedContractRaw?.contract_size ?? "1",
      feeRates: effectiveFeeRates,
      position: symbolPosition,
      openOrders: symbolOpenOrders,
      symbol: symbol,
    });
    return {
      price: p,
      qty,
      side,
      costEst,
      reserve: costEst?.total_estimated_cost ?? computeOrderReserveUsdt(p, qty, "LIMIT"),
    };
  }, [orderPrice, orderAmount, tickSize, stepSize, tradeTab, selectedContractRaw, indexPrice, effectiveFeeRates, symbolPosition, symbolOpenOrders, symbol]);

  const costDisplay = useMemo(() => {
    if (normalizedPreview.qty <= 0 || normalizedPreview.price <= 0) return "--";
    return fmtNum(normalizedPreview.reserve, 4);
  }, [normalizedPreview]);

  const closeLongFeeHint = useMemo(() => {
    const est = normalizedPreview.costEst;
    if (est?.scenario !== "CLOSE_LONG") return null;
    const fee = decNum(est.estimated_transaction_fee);
    if (fee <= 0) return null;
    return `Est. fee on fill: ${fmtNum(fee, 4)} USDT`;
  }, [normalizedPreview.costEst]);

  const displayFeeRates = useMemo(() => {
    const rates = effectiveFeeRates || {};
    const tx = rates.transaction_fee_rate ?? rates.taker_fee_rate;
    return {
      transaction: formatFeeRateDisplay(tx, 4),
      exercise: formatFeeRateDisplay(rates.exercise_fee_rate, 3),
      liquidation: formatFeeRateDisplay(rates.liquidation_fee_rate, 2),
    };
  }, [effectiveFeeRates]);

  const priceBandError = useMemo(() => {
    const snapped = snapToIncrementInput(orderPrice, tickSize);
    const checkPrice = snapped || orderPrice;
    if (!checkPrice || decNum(checkPrice) <= 0) return null;
    return getOptionsPriceBandError(
      checkPrice,
      tradeTab.toUpperCase(),
      selectedContractRaw,
      tickSize
    );
  }, [orderPrice, tradeTab, selectedContractRaw, tickSize]);

  const formValidation = useMemo(() => {
    if (!symbol || !selectedContractRaw) {
      return { ok: false, insufficientFunds: false };
    }
    return validateOptionsPlaceOrder({
      symbol: symbol,
      side: tradeTab.toUpperCase(),
      orderType: "LIMIT",
      price: orderPrice,
      quantity: orderAmount,
      timeInForce: orderTif,
      reduceOnly,
      availableBalance: isLoggedIn ? avblUsdt : 0,
      contract: selectedContractRaw,
      tickSize,
      stepSize,
      indexPrice,
      feeRates: effectiveFeeRates,
      position: symbolPosition,
      openOrders: symbolOpenOrders,
    });
  }, [symbol, selectedContractRaw, tradeTab, orderPrice, orderAmount, orderTif, reduceOnly, isLoggedIn, avblUsdt, tickSize, stepSize, indexPrice, effectiveFeeRates, symbolPosition, symbolOpenOrders]);

  const isSubmitDisabled = submitting || !isLoggedIn || !symbol || !formValidation.ok;

  const snapPriceField = useCallback(
    (raw) => {
      const trimmed = String(raw ?? "").trim();
      if (!trimmed) return "";
      return snapToIncrementInput(trimmed, tickSize);
    },
    [tickSize]
  );

  const snapAmountField = useCallback(
    (raw) => {
      const trimmed = String(raw ?? "").trim();
      if (!trimmed) return "";
      return snapToIncrementInput(trimmed, stepSize);
    },
    [stepSize]
  );

  const handlePriceBlur = useCallback(() => {
    setOrderPrice((prev) => snapPriceField(prev));
  }, [snapPriceField]);

  const handleAmountBlur = useCallback(() => {
    setOrderAmount((prev) => snapAmountField(prev));
  }, [snapAmountField]);

  const handleSubmit = async () => {
    if (!isLoggedIn) {
      showError("Please log in to place an order.");
      return;
    }
    if (needsKyc) {
      if (kycStatus !== 1) {
        navigation.navigate(KYC_STATUS_SCREEN);
      }
      return;
    }

    const snappedPrice = snapPriceField(orderPrice);
    const snappedAmount = snapAmountField(orderAmount);
    if (snappedPrice !== orderPrice) setOrderPrice(snappedPrice);
    if (snappedAmount !== orderAmount) setOrderAmount(snappedAmount);

    const validation = validateOptionsPlaceOrder({
      symbol: symbol,
      side: tradeTab.toUpperCase(),
      orderType: "LIMIT",
      price: snappedPrice,
      quantity: snappedAmount,
      timeInForce: orderTif,
      reduceOnly,
      availableBalance: avblUsdt,
      contract: selectedContractRaw,
      tickSize,
      stepSize,
      indexPrice,
      feeRates: effectiveFeeRates,
      position: symbolPosition,
      openOrders: symbolOpenOrders,
    });

    if (!validation.ok) {
      if (validation.message !== INSUFFICIENT_FUNDS_MSG) {
        showError(validation.message);
      }
      return;
    }

    setSubmitting(true);
    try {
      const idempotencyKey = newOptionsIdempotencyKey();
      const res = await appOperation.customer.placeOptionOrder(validation.payload, idempotencyKey);
      if (res?.success) {
        showSuccess(`${tradeTab === "buy" ? "Buy" : "Sell"} order submitted.`);
        setOrderAmount("");
        setSliderValue(0);
        setReduceOnly(false);
        if (validation.normalized?.price > 0) {
          setOrderPrice(formatOrderDecimal(validation.normalized.price, tickSize));
        }
        refreshLiveTradeChannels?.();
      } else {
        showError(parseOptionsApiError(res));
      }
    } catch (e) {
      showError("Order failed.");
    } finally {
      setSubmitting(false);
    }
  };



  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 10, marginLeft: -10 }}>
        <FastImage source={back_ic} style={{ width: 18, height: 18 }} resizeMode="contain" tintColor={themeColors.text} />
      </TouchableOpacity>
      <TouchableOpacity disabled style={styles.symbolSelector}>
        <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{symbol}</AppText>

      </TouchableOpacity>

    </View>
  );

  const renderMetricValue = (value, loading = isFormMetaLoading, width = 52) => (
    loading && (value === "--" || value == null || value === "") ? (
      <ShimmerBox width={width} height={14} borderRadius={4} style={{ marginTop: 4 }} />
    ) : (
      <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginTop: 4 }}>{value}</AppText>
    )
  );

  const renderMetrics = () => (
    <View style={styles.metricsRow}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 24, paddingVertical: 4 }}>
        <View>
          <AppText type={TEN} style={{ color: themeColors.secondaryText }}>Index Price</AppText>
          {renderMetricValue(indexPriceStr, isMarketLoading && indexPriceStr === "--", 64)}
        </View>
        <View>
          <AppText type={TEN} style={{ color: themeColors.secondaryText }}>Delta</AppText>
          {renderMetricValue(delta)}
        </View>

        <View>
          <AppText type={TEN} style={{ color: themeColors.secondaryText }}>Theta</AppText>
          {renderMetricValue(theta)}
        </View>

        <View>
          <AppText type={TEN} style={{ color: themeColors.secondaryText }}>Gamma</AppText>
          {renderMetricValue(gamma)}
        </View>

        <View>
          <AppText type={TEN} style={{ color: themeColors.secondaryText }}>Vega</AppText>
          {renderMetricValue(vegaStr)}
        </View>

        <View>
          <AppText type={TEN} style={{ color: themeColors.secondaryText }}>Last Price</AppText>
          {renderMetricValue(lastPriceStr)}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <AppSafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        enableAutomaticScroll
        keyboardOpeningTime={0}
        extraScrollHeight={Platform.OS === 'ios' ? 48 : 100}
        extraHeight={Platform.OS === 'android' ? 160 : 0}
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 24 : 32 }}
      >
        <View style={{ paddingHorizontal: 16 }}>
          {renderHeader()}
          {renderMetrics()}

          <View style={{ flexDirection: 'row', marginTop: 24, justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {/* Orderbook Left */}
            <View style={{ width: LEFT_W, alignSelf: 'flex-start' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <AppText type={TEN} style={{ color: themeColors.secondaryText }}>Price{"\n"}(USDT)</AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppText type={TEN} style={{ color: themeColors.secondaryText, textAlign: 'right' }}>Amount{"\n"}(USDT)</AppText>
                </View>
              </View>

              {isOrderbookLoading ? (
                <View style={{ marginVertical: 8, gap: 2 }}>
                  {[1, 2, 3, 4, 5].map((_, i) => (
                    <View key={`skel-ask-${i}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 }}>
                      <ShimmerBox width={40} height={12} borderRadius={4} />
                      <ShimmerBox width={40} height={12} borderRadius={4} />
                    </View>
                  ))}
                  <View style={{ alignSelf: 'center', marginVertical: 8 }}>
                    <ShimmerBox width={60} height={16} borderRadius={4} />
                  </View>
                  {[1, 2, 3, 4, 5].map((_, i) => (
                    <View key={`skel-bid-${i}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 }}>
                      <ShimmerBox width={40} height={12} borderRadius={4} />
                      <ShimmerBox width={40} height={12} borderRadius={4} />
                    </View>
                  ))}
                </View>
              ) : (
                <>
                  {showAskSide ? (
                    <View style={{ gap: 2 }}>
                      {paddedAskDisplay.map((ask, i) => (
                        <View key={`ask-${i}`} style={[styles.obRow, { position: 'relative', overflow: 'hidden' }]}>
                          {ask && ask.depth > 0 && <View style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: `${ask.depth}%`, backgroundColor: isDark ? "rgba(232, 97, 97, 0.18)" : "rgba(255, 77, 79, 0.14)" }} />}
                          <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: ask ? colors.red : themeColors.secondaryText, fontFamily: fontFamilyMedium }}>{ask ? Number(ask.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "--"}</AppText>
                          <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: ask ? themeColors.text : themeColors.secondaryText, fontFamily: fontFamilyMedium }}>{ask ? Number(ask.qty).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : "--"}</AppText>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  <View style={{ marginVertical: 8, alignItems: 'flex-start' }}>
                    {lastPriceStr !== "--" ? (
                      <>
                        <AppText type={SIXTEEN} weight={BOLD} style={{ color: '#D4B57E' }}>{lastPriceStr}</AppText>
                        <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 2 }}>IV:{ivStr}</AppText>
                      </>
                    ) : (
                      <AppText type={SIXTEEN} weight={BOLD} style={{ color: themeColors.secondaryText }}>--</AppText>
                    )}
                  </View>

                  {showBidSide ? (
                    <View style={{ gap: 2 }}>
                      {paddedBidDisplay.map((bid, i) => (
                        <View key={`bid-${i}`} style={[styles.obRow, { position: 'relative', overflow: 'hidden' }]}>
                          {bid && bid.depth > 0 && <View style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: `${bid.depth}%`, backgroundColor: isDark ? "rgba(2, 192, 118, 0.15)" : "rgba(56, 183, 129, 0.18)" }} />}
                          <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: bid ? colors.green : themeColors.secondaryText, fontFamily: fontFamilyMedium }}>{bid ? Number(bid.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "--"}</AppText>
                          <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: bid ? themeColors.text : themeColors.secondaryText, fontFamily: fontFamilyMedium }}>{bid ? Number(bid.qty).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : "--"}</AppText>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </>
              )}

              {/* Ratio Bar */}
              <View style={{ marginTop: 12, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ flex: obRatio.total > 0 ? obRatio.bidPct : 1, height: 4, backgroundColor: colors.green, borderRadius: 2 }} />
                  <View style={{ flex: obRatio.total > 0 ? obRatio.askPct : 1, height: 4, backgroundColor: colors.red, borderRadius: 2 }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <AppText type={TEN} style={{ color: colors.green }}>B {obRatio.total > 0 ? `${obRatio.bidPct.toFixed(2)}%` : "--"}</AppText>
                  <AppText type={TEN} style={{ color: colors.red }}>{obRatio.total > 0 ? `${obRatio.askPct.toFixed(2)}%` : "--"} S</AppText>
                </View>
              </View>

              {/* Precision Dropdown */}
              <View style={styles.spotObToolbarRow}>
                {/* <TouchableOpacity
                  ref={precisionTriggerRef}
                  onPress={openObPrecisionMenu}
                  style={[styles.spotObAggTrigger, { backgroundColor: isDark ? '#2A2A2E' : '#F7F7F7', borderColor: themeColors.themeBorderColor, borderRadius: 5 }]}
                  activeOpacity={0.75}
                >
                  <AppText type={TEN} weight={SEMI_BOLD} style={{ color: themeColors.text, fontSize: 11, lineHeight: 14 }}>{precision}</AppText>
                  <FastImage source={downIcon} style={styles.spotObAggCaret} resizeMode='contain' tintColor={themeColors.secondaryText} />
                </TouchableOpacity> */}
                <View style={styles.spotObViewModeGroup}>
                  {SPOT_OB_VIEW_ICONS.map((icon, index) => {
                    const selected = viewModeIndex === index;
                    return (
                      <TouchableOpacity
                        key={`ob-view-${index}`}
                        onPress={() => setViewModeIndex(index)}
                        style={[
                          styles.spotObViewModeBtn,
                          selected && { backgroundColor: isDark ? '#2A2A2E' : '#F7F7F7' },
                        ]}
                        activeOpacity={0.75}
                      >
                        <FastImage source={icon} style={styles.spotObViewModeIcon} resizeMode='contain' />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Trades — full width below orderbook */}
              <View style={styles.tradesSection}>
                <AppText type={FOURTEEN} weight={BOLD} style={{ color: themeColors.text, marginBottom: 8 }}>Trades</AppText>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <AppText type={TEN} style={{ color: themeColors.secondaryText }}>Price</AppText>
                  <AppText type={TEN} style={{ color: themeColors.secondaryText }}>Amt.({selectedAsset || 'BTC'})</AppText>
                </View>
                <View style={{ gap: 4 }}>
                  {isLiveDataLoading ? (
                    [1, 2, 3, 4, 5].map((i) => (
                      <View key={`trade-skel-${i}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <ShimmerBox width={56} height={12} borderRadius={4} />
                        <ShimmerBox width={56} height={12} borderRadius={4} />
                      </View>
                    ))
                  ) : (
                    paddedTrades.map((trade, i) => (
                      <View key={`trade-${i}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: trade ? (trade.side?.toUpperCase() === 'BUY' ? colors.green : colors.red) : themeColors.secondaryText, fontFamily: fontFamilyMedium }}>
                          {trade ? Number(trade.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "--"}
                        </AppText>
                        <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: trade ? themeColors.text : themeColors.secondaryText, fontFamily: fontFamilyMedium }}>
                          {trade ? Number(trade.qty).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : "--"}
                        </AppText>
                      </View>
                    ))
                  )}
                </View>
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
                        backgroundColor: themeColors.card,
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

            {/* Order Entry Right */}
            <View style={{ width: RIGHT_W }}>
              {/* Buy / Sell Toggle */}
              <View style={[styles.toggleContainer, { backgroundColor: isDark ? '#2A2A2E' : '#F7F7F7' }]}>
                <TouchableOpacity style={[styles.toggleBtn, tradeTab === 'buy' && styles.toggleActive]} onPress={() => setTradeTab('buy')}>
                  <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: tradeTab === 'buy' ? colors.white : themeColors.secondaryText }}>Buy</AppText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toggleBtn, tradeTab === 'sell' && { backgroundColor: colors.red }]} onPress={() => setTradeTab('sell')}>
                  <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: tradeTab === 'sell' ? colors.white : themeColors.secondaryText }}>Sell</AppText>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppText type={TEN} style={{ color: themeColors.secondaryText }}>Avbl</AppText>
                </View>
                {isLoggedIn && isAccountLoading ? (
                  <ShimmerBox width={72} height={12} borderRadius={4} />
                ) : (
                  <AppText type={TEN} style={{ color: themeColors.text }}>
                    {`${isLoggedIn && accountUpdate ? fmtNum(avblUsdt, 2) : "0.00"} USDT`}
                  </AppText>
                )}
              </View>

              {/* Price Row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppText type={TEN} style={{ color: themeColors.secondaryText }}>Price</AppText>
                  <FastImage source={INFO} style={{ width: 10, height: 10, marginLeft: 4 }} tintColor={themeColors.secondaryText} />
                </View>
                <AppText type={TEN} style={{ color: '#b9b9b9', marginLeft: 8 }}>Tick {hasTickConfig ? decStr(tickSize) : "--"}</AppText>
              </View>

              <View style={[styles.inputContainer, { backgroundColor: isDark ? '#2A2A2E' : '#F7F7F7', flexDirection: 'row', alignItems: 'center' }, priceBandError && { borderColor: colors.red, borderWidth: 1 }]}>
                {isLiveDataLoading && !orderPrice ? (
                  <ShimmerBox width={120} height={18} borderRadius={4} style={{ flex: 1 }} />
                ) : (
                  <TextInput
                    cursorColor={isDark ? colors.white : colors.black}
                    value={orderPrice}
                    onChangeText={(val) => {
                      if (!isValidIncrementInput(val, tickSize)) return;
                      priceUserEditedRef.current = true;
                      setOrderPrice(sanitizeIncrementInput(val, tickSize));
                      setSliderValue(0);
                    }}
                    onBlur={handlePriceBlur}
                    onSubmitEditing={handlePriceBlur}
                    style={{ color: themeColors.text, fontSize: 12, fontFamily: fontFamilyMedium, padding: 0, flex: 1, paddingVertical: Platform.OS === 'android' ? 4 : 8 }}
                    placeholder="Price"
                    placeholderTextColor={themeColors.secondaryText}
                    keyboardType={priceMaxDecimals > 0 ? 'decimal-pad' : 'number-pad'}
                  />
                )}
                <AppText style={{ color: themeColors.text, fontFamily: fontFamilyMedium }}>USDT</AppText>
              </View>
              {priceBandError ? (
                <AppText type={TEN} style={{ color: colors.red, marginTop: 4 }}>{priceBandError}</AppText>
              ) : null}

              {/* IV Row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>IV</AppText>
                  <FastImage source={INFO} style={{ width: 10, height: 10, marginLeft: 4 }} tintColor={themeColors.secondaryText} />
                </View>
                {isFormMetaLoading && ivDisplay === "--" ? (
                  <ShimmerBox width={48} height={14} borderRadius={4} />
                ) : (
                  <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{ivDisplay}</AppText>
                )}
              </View>

              {/* Amount Row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 4 }}>
                <AppText type={TEN} style={{ color: themeColors.secondaryText }}>Amount</AppText>
                <AppText type={TEN} style={{ color: '#b9b9b9', marginLeft: 8 }}>Step {hasStepConfig ? decStr(stepSize) : "--"}</AppText>
              </View>

              <View style={[styles.inputContainer, { backgroundColor: isDark ? '#2A2A2E' : '#F7F7F7', flexDirection: 'row', alignItems: 'center' }]}>
                <TextInput
                  cursorColor={isDark ? colors.white : colors.black}
                  value={orderAmount}
                  onChangeText={(val) => {
                    if (!isValidIncrementInput(val, stepSize)) return;
                    setOrderAmount(sanitizeIncrementInput(val, stepSize));
                    setSliderValue(0);
                  }}
                  onBlur={handleAmountBlur}
                  onSubmitEditing={handleAmountBlur}
                  style={{ color: themeColors.text, fontSize: 12, fontFamily: fontFamilyMedium, padding: 0, flex: 1, paddingVertical: Platform.OS === 'android' ? 4 : 8 }}
                  placeholder="Enter Amount"
                  placeholderTextColor={themeColors.secondaryText}
                  keyboardType={amountMaxDecimals > 0 ? 'decimal-pad' : 'number-pad'}
                />
                <AppText style={{ color: themeColors.text, fontFamily: fontFamilyMedium }}>Contract</AppText>
              </View>
              <AppText type={TEN} style={{ color: themeColors.secondaryText, marginTop: 4, fontSize: 10, lineHeight: 14 }}>
                {contractHint}
              </AppText>



              {/* Slider */}
              <View style={{ marginVertical: 8 }}>
                <PercentQuickSelect
                  activeValue={sliderValue}
                  onSelect={handleSliderChange}
                  theme={themeObj.theme}
                />
              </View>

              {/* Reduce Only & TIF */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, zIndex: 10 }}>
                <TouchableOpacity onPress={() => setReduceOnly(!reduceOnly)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.checkbox, reduceOnly && { backgroundColor: themeColors.text, borderColor: themeColors.text, alignItems: 'center', justifyContent: 'center' }]}>
                    {reduceOnly && <FastImage source={tick} style={{ width: 10, height: 10 }} tintColor={isDark ? colors.black : colors.white} resizeMode="contain" />}
                  </View>
                  <AppText type={TWELVE} style={[{ color: themeColors.secondaryText }, styles.dashedUnderline]}>Reduce Only</AppText>
                </TouchableOpacity>
                <TouchableOpacity ref={tifTriggerRef} onPress={openTifMenu} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>TIF</AppText>
                  <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{orderTif}</AppText>
                  <FastImage source={downIcon} style={{ width: 8, height: 8 }} resizeMode='contain' tintColor={themeColors.secondaryText} />
                </TouchableOpacity>
              </View>

              {/* TIF Modal */}
              <Modal visible={tifOpen} transparent animationType="fade" onRequestClose={closeTifMenu}>
                <Pressable style={styles.spotObAggBackdrop} onPress={closeTifMenu} />
                {tifMenuLayout ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: tifMenuLayout.y + tifMenuLayout.h + 2,
                      right: Math.max(16, Width - tifMenuLayout.x - tifMenuLayout.w),
                      backgroundColor: isDark ? '#2A2A2E' : themeColors.card,
                      borderColor: themeColors.themeBorderColor,
                      borderWidth: isDark ? 0.5 : 1,
                      borderRadius: 5,
                      paddingVertical: 4,
                      minWidth: 88,
                    }}
                  >
                    {["GTC", "IOC", "FOK"].map(opt => (
                      <TouchableOpacity key={opt} style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: orderTif === opt ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)") : "transparent" }} onPress={() => { setOrderTif(opt); closeTifMenu(); }}>
                        <AppText type={TWELVE} style={{ color: themeColors.text }}>{opt}</AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </Modal>

              {/* Error Message */}
              {isLoggedIn && formValidation.insufficientFunds ? (
                <AppText type={TWELVE} style={{ color: colors.red, marginBottom: 8 }}>{INSUFFICIENT_FUNDS_MSG}</AppText>
              ) : null}

              {/* Action Button */}
              {!isLoggedIn ? (
                <TouchableOpacity
                  onPress={() => navigation.navigate(LOGIN_SCREEN)}
                  style={[
                    styles.actionBtn,
                    { backgroundColor: tradeTab === 'buy' ? colors.green : colors.red }
                  ]}>
                  <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: colors.white }}>Login</AppText>
                </TouchableOpacity>
              ) : needsKyc ? (
                <TouchableOpacity
                  onPress={() => {
                    if (kycStatus !== 1) {
                      navigation.navigate(KYC_STATUS_SCREEN);
                    }
                  }}
                  disabled={kycStatus === 1}
                  style={[
                    styles.actionBtn,
                    { backgroundColor: tradeTab === 'buy' ? colors.green : colors.red, opacity: kycStatus === 1 ? 0.5 : 1 }
                  ]}>
                  <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: colors.white }}>{kycButtonLabel}</AppText>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isSubmitDisabled || submitting}
                  style={[
                    styles.actionBtn,
                    { backgroundColor: tradeTab === 'buy' ? colors.green : colors.red, opacity: (isSubmitDisabled && !submitting) ? 0.5 : 1 }
                  ]}>
                  {submitting ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: colors.white }}>
                      {tradeTab === 'buy' ? `Buy ${selectedAsset || 'BTC'}` : `Sell ${selectedAsset || 'BTC'}`}
                    </AppText>
                  )}
                </TouchableOpacity>
              )}

              {/* Cost & Fee Rate */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  {isFormMetaLoading && costDisplay === "--" ? (
                    <ShimmerBox width={96} height={14} borderRadius={4} />
                  ) : (
                    <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>
                      {`Cost ${costDisplay === "--" ? "--" : costDisplay}${closeLongFeeHint ? ` · ${closeLongFeeHint}` : ""}`}
                    </AppText>
                  )}
                </View>
                <TouchableOpacity onPress={() => setShowFeeTooltip(true)} style={styles.dashedUnderline}>
                  <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>Fee Rate</AppText>
                </TouchableOpacity>
              </View>

              <Modal visible={showFeeTooltip} transparent animationType="fade" onRequestClose={() => setShowFeeTooltip(false)}>
                <Pressable style={styles.spotObAggBackdrop} onPress={() => setShowFeeTooltip(false)} />
                <View style={[styles.feeTooltipCard, { backgroundColor: themeColors.card, borderColor: themeColors.themeBorderColor }]}>
                  <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 12 }}>Fee Rate</AppText>
                  <View style={styles.feeTooltipRow}>
                    <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>Transaction Fee Rate</AppText>
                    <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{displayFeeRates.transaction}</AppText>
                  </View>
                  <View style={styles.feeTooltipRow}>
                    <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>Exercise Fee Rate</AppText>
                    <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{displayFeeRates.exercise}</AppText>
                  </View>
                  <View style={styles.feeTooltipRow}>
                    <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>Liquidation Fee Rate</AppText>
                    <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{displayFeeRates.liquidation}</AppText>
                  </View>
                </View>
              </Modal>
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
  },
  symbolSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  obRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 2,
    marginBottom: 4,
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
  orderTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 8,
    marginTop: 16,
  },
  inputContainer: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionBtn: {
    paddingVertical: 8,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 10,
  },
  checkbox: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: '#b9b9b9',
    borderRadius: 2,
  },
  dashedUnderline: {
    borderBottomWidth: 1,
    borderBottomColor: '#b9b9b9',
    borderStyle: 'dashed',
  },
  spotObToolbarRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    width: "100%",
    marginBottom: 0,
    marginTop: 8,
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
  spotObViewModeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    width: "100%",
  },
  spotObViewModeBtn: {
    flex: 1,
    height: 32,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  spotObViewModeIcon: {
    width: 20,
    height: 20,
  },
  tradesSection: {
    marginTop: 10,
    marginLeft: -16,
    width: Width,
    paddingHorizontal: 16,
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
  feeTooltipCard: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: '40%',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  feeTooltipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
});

export default OptionsInstrumentTrade;
