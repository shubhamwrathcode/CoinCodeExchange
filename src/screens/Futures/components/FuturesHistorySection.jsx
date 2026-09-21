import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Platform, ToastAndroid, Alert } from 'react-native';
import FastImage from 'react-native-fast-image';
import moment from 'moment';
import { useNavigation } from '@react-navigation/native';
import SimpleToast from 'react-native-simple-toast';

import { BOLD, fontFamilyMedium, fontFamilySemiBold, MEDIUM, SEMI_BOLD } from '../../../theme/typography';
import { colors } from '../../../theme/colors';
import { decNum, capDecStr, computePosition, computeClosedPosition, snapAndCapCloseQty, snapToIncrementInput, formatLiqFee, formatFuturesTs, pickOpenedTs, pickClosedTs, openFuturesHistoryDetail, fmtFuturesQty, fmtFuturesPrice, fmtFuturesUsdt, fmtFuturesPct, computeTradeHistoryItem, formatFuturesOrderType, getFuturesOrderDisplayPrice, getFuturesOrderTriggerText } from '../../../helper/futuresUtils';
import { right_ic, NO_NOTIFICATION_ICON, filterIcon, editnew } from '../../../helper/ImageAssets';
import { AppText, FOURTEEN, TEN, THIRTEEN, TWELVE } from '../../../common';
import HistorySectionLoader, { LOADER_MIN_HEIGHT } from '../../../common/HistorySectionLoader/HistorySectionLoader';
import { SwipeListView } from 'react-native-swipe-list-view';
import FuturesCancelModal from './FuturesCancelModal';
import FuturesClosePositionModal from './FuturesClosePositionModal';
import FuturesAdjustMarginModal from './FuturesAdjustMarginModal';
import FuturesHistoryFilterSheet from './FuturesHistoryFilterSheet';
import { appOperation } from '../../../appOperation';
import { useAppSelector } from '../../../store/hooks';
import { LOGIN_SCREEN } from '../../../navigation/routes';

const getStatusColor = (statusText, themeColors) => {
  if (!statusText) return themeColors.text;
  const normalized = statusText.toString().toLowerCase();
  if (normalized.includes("filled") || normalized.includes("success") || normalized.includes("completed") || normalized.includes("closed")) {
    return colors.green;
  }
  if (normalized.includes("cancel") || normalized.includes("reject") || normalized.includes("fail") || normalized.includes("liquidated")) {
    return colors.red;
  }
  if (normalized.includes("pending")) {
    return colors.orange || "#FFA500";
  }
  return themeColors.text;
};

const FuturesHistorySection = ({
  activeHistoryTab,
  futuresPositions,
  loadingPositions,
  futuresPositionHistory,
  loadingPositionHistory,
  futuresOpenOrders,
  loadingOpenOrders,
  futuresOrderHistory,
  loadingOrderHistory,
  futuresTradeHistory = [],
  loadingTradeHistory = false,
  futuresTransactionHistory,
  loadingTransactionHistory,
  themeColors,
  isDark,
  futuresPrice,
  selectedCoin,
  limit,
  onViewMore,
  onRefresh,
  onPositionClosed,
}) => {
  const navigation = useNavigation();
  const userData = useAppSelector((state) => state.auth.userData);
  const [cancelModalVisible, setCancelModalVisible] = React.useState(false);
  const [orderToCancel, setOrderToCancel] = React.useState(null);
  const [cancelLoading, setCancelLoading] = React.useState(false);

  const [closeModalVisible, setCloseModalVisible] = React.useState(false);
  const [posToClose, setPosToClose] = React.useState(null);
  const [closeLoading, setCloseLoading] = React.useState(false);
  const closeInFlightRef = useRef(false);
  const posToCloseRef = useRef(null);
  const [closingIds, setClosingIds] = React.useState({});
  const closingIdsRef = useRef({});
  const closingTimersRef = useRef({});

  const [adjustMarginModalVisible, setAdjustMarginModalVisible] = React.useState(false);
  const [posToAdjustMargin, setPosToAdjustMargin] = React.useState(null);
  const [adjustMarginLoading, setAdjustMarginLoading] = React.useState(false);

  const userFuturesWallet = useAppSelector((state) => state.wallet.userFuturesWallet);
  const futuresData = useAppSelector((state) => state.home.futuresData);

  const availableBalance = React.useMemo(() => {
    if (futuresData?.balance?.available_balance != null) {
      return Number(futuresData.balance.available_balance) || 0;
    }
    if (Array.isArray(userFuturesWallet)) {
      const w = userFuturesWallet.find(w => w?.short_name === 'USDT' || w?.currency === 'USDT');
      return Number(w?.balance ?? w?.available_balance ?? 0) || 0;
    }
    return 0;
  }, [futuresData, userFuturesWallet]);

  const executeAdjustMargin = async (payload) => {
    console.log("👉 [UI] EXECUTE ADJUST MARGIN CALLED WITH PAYLOAD:", payload);
    setAdjustMarginLoading(true);
    try {
      const result = await appOperation.customer.adjustPositionMargin(payload);
      console.log("📥 [UI] ADJUST MARGIN RESULT RECEIVED:", result);
      if (result?.success || result?.code === 200 || result?.status === 'success') {
        const isAdd = payload?.type === 'ADD' || result?.data?.added === true;
        const defaultSuccessMsg = isAdd ? 'Margin added successfully' : 'Margin removed successfully';
        const msg = result?.message || result?.data?.message || defaultSuccessMsg;
        SimpleToast.show(msg);
        setAdjustMarginModalVisible(false);
        setPosToAdjustMargin(null);
        if (onRefresh) onRefresh({ silent: true });
      } else {
        const errMsg = result?.error?.message || result?.message || 'Failed to adjust margin';
        console.warn("⚠️ [UI] ADJUST MARGIN FAILURE:", errMsg, result);
        SimpleToast.show(errMsg.includes('HTML') ? 'Backend endpoint not found for adjust margin.' : errMsg);
      }
    } catch (e) {
      const errMsg = e?.error?.message || e?.message || 'Something went wrong';
      console.error("🔥 [UI] ADJUST MARGIN EXCEPTION:", e);
      SimpleToast.show(errMsg.includes('HTML') ? 'Backend endpoint not found for adjust margin.' : errMsg);
    } finally {
      setAdjustMarginLoading(false);
    }
  };

  const [orderKindFilter, setOrderKindFilter] = React.useState('all');
  const [orderSideFilter, setOrderSideFilter] = React.useState('All Sides');

  React.useEffect(() => {
    posToCloseRef.current = posToClose;
  }, [posToClose]);

  React.useEffect(() => () => {
    Object.values(closingTimersRef.current).forEach(clearTimeout);
    closingTimersRef.current = {};
    closingIdsRef.current = {};
  }, []);

  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [walletHistoryFilters, setWalletHistoryFilters] = useState({
    type: "", asset: "", contract: "", from: "", to: ""
  });

  const executeCancelOrder = async () => {
    if (!orderToCancel) return;
    setCancelLoading(true);
    try {
      const result = await appOperation.customer?.cancelFutureOrder({ orderId: orderToCancel._id || orderToCancel.id });
      if (result?.success) {
        ToastAndroid.show(result?.message || 'Order Cancelled', ToastAndroid.SHORT);
        setCancelModalVisible(false);
        setOrderToCancel(null);
        setTimeout(() => {
          if (onRefresh) onRefresh();
        }, 1000);
      } else {
        ToastAndroid.show(result?.message || 'Failed to cancel', ToastAndroid.SHORT);
      }
    } catch (e) {
      ToastAndroid.show('Something went wrong', ToastAndroid.SHORT);
    } finally {
      setCancelLoading(false);
    }
  };

  const executeClosePosition = async ({ orderType, price, quantity, closePosition } = {}) => {
    if (closeInFlightRef.current) return;
    closeInFlightRef.current = true;

    const pos = posToCloseRef.current;
    const posKey = String(pos?._id || pos?.symbol || '');
    if (!pos || (posKey && closingIdsRef.current[posKey])) {
      closeInFlightRef.current = false;
      return;
    }
    setCloseLoading(true);

    const unlock = () => {
      closeInFlightRef.current = false;
      setCloseLoading(false);
    };

    const fullQty = decNum(pos.quantity ?? pos.computedQty);
    if (!Number.isFinite(fullQty) || fullQty <= 0) {
      SimpleToast.show('Invalid position size');
      unlock();
      return;
    }

    const stepSize = Number(selectedCoin?.step_size) || 0.001;
    const tickSize = Number(selectedCoin?.tick_size) || 0.01;
    const snappedQtyStr =
      snapAndCapCloseQty(String(quantity ?? ''), stepSize, fullQty) ||
      snapAndCapCloseQty(String(fullQty), stepSize, fullQty);
    const qty = decNum(snappedQtyStr);
    if (!Number.isFinite(qty) || qty <= 0) {
      SimpleToast.show('Please enter a valid quantity');
      unlock();
      return;
    }

    const posSide = String(pos.side ?? '').toUpperCase();
    const closeSide = posSide === 'SHORT' ? 'BUY' : 'SELL';
    const isFullClose =
      closePosition === true || qty >= fullQty - Math.max(stepSize, 1e-8);
    const payload = {
      symbol: pos.symbol,
      side: closeSide,
      order_type: orderType,
      leverage: Number(pos.leverage) || 1,
      client_order_id: `app_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      ...(isFullClose
        ? { close_position: true, quantity: String(qty) }
        : { reduce_only: true, quantity: String(qty) }),
    };

    if (orderType === 'LIMIT') {
      const snappedPrice = snapToIncrementInput(String(price ?? ''), tickSize);
      const priceVal = decNum(snappedPrice);
      if (!Number.isFinite(priceVal) || priceVal <= 0) {
        SimpleToast.show('Please enter a valid price');
        unlock();
        return;
      }
      payload.price = String(priceVal);
    }

    try {
      const result = await appOperation.customer?.futuresPlaceOrder(payload);
      if (result?.success) {
        if (posKey) {
          closingIdsRef.current[posKey] = true;
          setClosingIds((prev) => ({ ...prev, [posKey]: true }));
          if (closingTimersRef.current[posKey]) clearTimeout(closingTimersRef.current[posKey]);
          closingTimersRef.current[posKey] = setTimeout(() => {
            delete closingIdsRef.current[posKey];
            setClosingIds((prev) => {
              if (!prev[posKey]) return prev;
              const next = { ...prev };
              delete next[posKey];
              return next;
            });
            delete closingTimersRef.current[posKey];
          }, 10000);
        }
        SimpleToast.show(
          result?.message || (orderType === 'MARKET' ? 'Position close order placed' : 'Limit close order placed')
        );
        setCloseModalVisible(false);
        setPosToClose(null);
        posToCloseRef.current = null;
        if (typeof onPositionClosed === 'function' && posKey) {
          onPositionClosed(posKey);
        }
        setTimeout(() => {
          if (onRefresh) onRefresh({ silent: true });
        }, 800);
      } else {
        SimpleToast.show(result?.error?.message || result?.message || 'Failed to close position');
      }
    } catch (e) {
      SimpleToast.show(e?.error?.message || e?.message || 'Something went wrong');
    } finally {
      unlock();
    }
  };

  const EmptyState = () => (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 35, minHeight: LOADER_MIN_HEIGHT }}>
      <FastImage source={NO_NOTIFICATION_ICON} style={{ width: 75, height: 75, marginBottom: 12, opacity: 0.8 }} />
      {!userData && (
        <>
          <AppText style={{ color: themeColors?.secondaryText || "#888", fontSize: 13, marginBottom: 12 }}>
            Please login to view your futures orders & history
          </AppText>
          <TouchableOpacity
            style={{
              backgroundColor: colors.cyanTheme || colors.buttonDarkBg || '#0AA8C5',
              paddingHorizontal: 22,
              paddingVertical: 8,
              borderRadius: 6,
              alignItems: "center",
            }}
            onPress={() => navigation.navigate(LOGIN_SCREEN)}
          >
            <AppText weight={SEMI_BOLD} style={{ color: "#fff", fontSize: 13 }}>
              Login / Register
            </AppText>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const activeLoading = React.useMemo(() => {
    switch (activeHistoryTab) {
      case 'Positions':
        return loadingPositions;
      case 'Position History':
        return loadingPositionHistory;
      case 'Open Orders':
        return loadingOpenOrders;
      case 'Order History':
        return loadingOrderHistory;
      case 'Trade History':
        return loadingTradeHistory;
      case 'Transaction History':
        return loadingTransactionHistory;
      default:
        return false;
    }
  }, [
    activeHistoryTab,
    loadingPositions,
    loadingPositionHistory,
    loadingOpenOrders,
    loadingOrderHistory,
    loadingTradeHistory,
    loadingTransactionHistory,
  ]);

  if (activeLoading && !closeModalVisible && !closeLoading) {
    return <HistorySectionLoader color={themeColors.text} />;
  }

  const renderFuturesPositionItem = ({ item: pos, isLast }) => {
    const { qty, entry, mark, pnl, margin, roe, marginRatio } = computePosition(pos, futuresPrice?.mark_price, selectedCoin);

    const isLong = String(pos.side ?? "").toUpperCase() === "LONG";
    const sideColor = isLong ? colors.green : colors.red;
    const pnlColor = pnl >= 0 ? colors.green : colors.red;

    return (
      <TouchableOpacity
        onPress={() => openFuturesHistoryDetail(navigation, {
          pos,
          selectedCoin,
          title: activeHistoryTab,
          markPrice: futuresPrice?.mark_price,
        })}
        activeOpacity={0.7}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 0,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: themeColors.themeBorderColor || "#e0e0e0",
        }}
      >
        <View style={{ marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>
                {pos.symbol || "—"}
              </AppText>
              <FastImage
                source={right_ic}
                style={{ width: 10, height: 10, marginLeft: 6 }}
                tintColor={themeColors.secondaryText}
                resizeMode="contain"
              />
            </View>
            <AppText type={TWELVE} style={{ color: themeColors.text, fontFamily: fontFamilyMedium }}>
              <AppText type={TWELVE} style={{ color: sideColor, fontFamily: fontFamilySemiBold }}>
                {isLong ? "LONG" : "SHORT"}
              </AppText>
              {" · "}{pos.leverage || 1}x{" · "}{String(pos.margin_type ?? pos.margin_mode ?? "ISOLATED").toUpperCase() === "CROSS" ? "Cross" : "Isolated"}
            </AppText>
          </View>
          <TouchableOpacity
            onPress={() => {
              const posKey = String(pos._id || pos.symbol || '');
              if (closeInFlightRef.current || closeLoading || closingIdsRef.current[posKey] || closingIds[posKey]) return;
              const nextPos = {
                ...pos,
                computedMark: mark,
                computedQty: qty,
                computedEntry: entry
              };
              posToCloseRef.current = nextPos;
              setPosToClose(nextPos);
              setCloseModalVisible(true);
            }}
            disabled={closeLoading || !!closingIds[String(pos._id || pos.symbol || '')]}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 6,
              borderRadius: 4,
              backgroundColor: isDark ? "rgba(255,255,255,0.15)" : colors.black,
              alignItems: "center",
              justifyContent: "center",
              opacity: (closeLoading || closingIds[String(pos._id || pos.symbol || '')]) ? 0.5 : 1,
            }}
          >
            <AppText type={THIRTEEN} style={{ color: colors.white, fontFamily: fontFamilySemiBold }}>
              {(closeLoading && posToClose?._id === pos?._id) || closingIds[String(pos._id || pos.symbol || '')]
                ? "Closing…"
                : "Close Position"}
            </AppText>
          </TouchableOpacity>
        </View>

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Size</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>
              {fmtFuturesQty(qty)}
            </AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Entry Price</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>
              {fmtFuturesPrice(entry)}
            </AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Mark Price</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>
              {fmtFuturesPrice(mark)}
            </AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Liq. Price</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>
              {fmtFuturesPrice(pos.liquidation_price)}
            </AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Margin Ratio</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>
              {Number(marginRatio) > 0 ? fmtFuturesPct(marginRatio, { dp: 4 }) : "—"}
            </AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Margin</AppText>
            <View style={{ alignItems: "flex-end" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>
                  {fmtFuturesUsdt(margin)}
                </AppText>
                {String(pos.margin_type ?? pos.margin_mode ?? "ISOLATED").toUpperCase() !== "CROSS" && (
                  <TouchableOpacity
                    onPress={() => {
                      setPosToAdjustMargin(pos);
                      setAdjustMarginModalVisible(true);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <FastImage
                      source={editnew}
                      style={{ width: 14, height: 14 }}
                      resizeMode="contain"
                      tintColor={themeColors.text}
                    />
                  </TouchableOpacity>
                )}
              </View>
              <AppText type={TEN} style={{ color: themeColors.secondaryText, marginTop: 1 }}>
                ({String(pos.margin_type ?? pos.margin_mode ?? "ISOLATED").toUpperCase() === "CROSS" ? "Cross" : "Isolated"})
              </AppText>
            </View>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>PNL (ROE%)</AppText>
            <AppText type={FOURTEEN} style={{ color: pnlColor, fontFamily: fontFamilySemiBold }}>
              {fmtFuturesUsdt(pnl, { signed: true })} ({fmtFuturesPct(roe, { signed: true, dp: 4 })})
            </AppText>
          </View>

        </View>
      </TouchableOpacity>
    );
  };

  const renderFuturesPositionHistoryItem = ({ item: pos, isLast }) => {
    const { entry, exit, qty, pnl, fees, funding, reason } = computeClosedPosition(pos);
    const safePnl = Number.isFinite(Number(pnl)) ? Number(pnl) : 0;
    const safeFunding = Number.isFinite(Number(funding)) ? Number(funding) : 0;
    const safeQty = Number.isFinite(Number(qty)) ? Number(qty) : 0;
    const safeEntry = Number.isFinite(Number(entry)) ? Number(entry) : 0;
    const safeExit = Number.isFinite(Number(exit)) ? Number(exit) : 0;
    const isLong = String(pos.side ?? "").toUpperCase() === "LONG" || String(pos.side ?? "").toUpperCase() === "BUY";
    const sideColor = isLong ? colors.green : colors.red;
    const pnlColor = safePnl >= 0 ? colors.green : colors.red;
    const fundingColor = safeFunding >= 0 ? colors.green : colors.red;

    const closedDateFormatted = formatFuturesTs(pickClosedTs(pos));
    const openedDateFormatted = formatFuturesTs(pickOpenedTs(pos));
    const liqFee = formatLiqFee(pos, "USDT");
    const liqFeeDisplay = liqFee?.display || "—";

    const baseCoin = pos.symbol ? String(pos.symbol).replace(/USDT.*/i, "").replace(/-PERP/i, "").replace(/\/.*/, "") : (selectedCoin?.base_currency || "USDT");

    return (
      <TouchableOpacity
        onPress={() => openFuturesHistoryDetail(navigation, {
          pos: {
            ...pos,
            liq_fee: liqFee ? Number(liqFee.value) : pos.liq_fee,
            liq_fee_asset: liqFee?.asset || pos.liq_fee_asset,
          },
          selectedCoin,
          title: activeHistoryTab,
          liqFeeDisplay,
          closedTimeDisplay: closedDateFormatted,
          openedTimeDisplay: openedDateFormatted,
        })}
        activeOpacity={0.7}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 0,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: themeColors.themeBorderColor || "#e0e0e0",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>
            {pos.symbol || "—"}
          </AppText>
          <FastImage
            source={right_ic}
            style={{ width: 11, height: 11, marginLeft: 4, }}
            resizeMode="contain"
            tintColor={isDark ? colors.white : colors.black}
          />
        </View>
        <AppText type={TWELVE} style={{ color: themeColors.text, marginBottom: 12, fontFamily: fontFamilySemiBold }}>
          {isLong ? "LONG" : "SHORT"} · {pos.leverage}x · {String(pos.margin_type ?? "ISOLATED").toUpperCase()}
        </AppText>

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Closed Time</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>{closedDateFormatted}</AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Opened Time</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>{openedDateFormatted}</AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Size</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>{fmtFuturesQty(safeQty)} {baseCoin}</AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Entry Price</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>{fmtFuturesPrice(safeEntry)}</AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Exit Price</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>{fmtFuturesPrice(safeExit)}</AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Realized PNL</AppText>
            <AppText type={FOURTEEN} style={{ color: pnlColor, fontFamily: fontFamilySemiBold }}>
              {fmtFuturesUsdt(safePnl, { signed: true })}
            </AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Liq. Fee</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>
              {liqFeeDisplay}
            </AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Funding</AppText>
            <AppText type={FOURTEEN} style={{ color: fundingColor, fontFamily: fontFamilySemiBold }}>
              {fmtFuturesUsdt(safeFunding, { signed: true })}
            </AppText>
          </View>
          {(pos.close_reason || pos.status) && (
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Status</AppText>
              <AppText type={FOURTEEN} style={{ color: getStatusColor(reason || pos.status, themeColors), fontFamily: fontFamilySemiBold }}>
                {reason || pos.status}
              </AppText>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderFuturesOpenOrderItem = ({ item: order, isLast }) => {
    const isBuy = String(order.side ?? "").toUpperCase() === "BUY";
    const sideColor = isBuy ? colors.green : colors.red;
    const filledQty = decNum(order.executed_quantity ?? order.filledQty ?? 0);
    const totalQty = decNum(order.quantity ?? order.origQty ?? 0);

    const orderType = formatFuturesOrderType(order.order_type ?? order.type);
    const leverage = order.leverage ? `${order.leverage}x` : "1x";

    const createdTime = order.created_at || order.createdAt || order.updatedAt;
    const dateFormatted = createdTime ? moment(createdTime).format("YYYY-MM-DD") : "—";
    const timeFormatted = createdTime ? moment(createdTime).format("HH:mm:ss") : "—";

    const unfilledQty = totalQty - filledQty;
    const baseCoin = order.symbol ? String(order.symbol).replace(/USDT.*/i, "").replace(/-PERP/i, "").replace(/\/.*/, "") : (selectedCoin?.base_currency || "BTC");

    const tif = order.timeInForce || order.time_in_force || "GTC";
    const reduceOnly = order.reduceOnly || order.reduce_only ? "Yes" : "No";

    const displayPrice = getFuturesOrderDisplayPrice(order);
    const triggerText = getFuturesOrderTriggerText(order);

    return (
      <TouchableOpacity
        onPress={() => openFuturesHistoryDetail(navigation, { pos: order, selectedCoin, title: activeHistoryTab })}
        activeOpacity={0.7}
        style={{
          paddingVertical: 16,
          paddingHorizontal: 0,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: themeColors.themeBorderColor || "#e0e0e0",
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>
                {order.symbol || "—"}
              </AppText>
              <FastImage source={right_ic} style={{ width: 10, height: 10, marginLeft: 6, marginTop: 2 }} resizeMode="contain" tintColor={themeColors.secondaryText} />
            </View>
            <AppText type={TWELVE} style={{ color: themeColors.text, fontFamily: fontFamilyMedium }}>
              <AppText style={{ color: sideColor }}>{isBuy ? "BUY" : "SELL"}</AppText>
              {` · ${orderType} · ${leverage}`}
            </AppText>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Price</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>{displayPrice}</AppText>
          </View>
          {triggerText && (
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Trigger</AppText>
              <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>{triggerText}</AppText>
            </View>
          )}
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Date</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>{dateFormatted}</AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Time</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>{timeFormatted}</AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Qty / Filled</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>{fmtFuturesQty(totalQty, "0")} / {fmtFuturesQty(filledQty, "0")} {baseCoin}</AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Unfilled</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>{fmtFuturesQty(unfilledQty, "0")} {baseCoin}</AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>TIF</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>{tif}</AppText>
          </View>
          {/* <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Reduce Only</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>{reduceOnly}</AppText>
          </View> */}
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Status</AppText>
            <AppText type={FOURTEEN} style={{ color: getStatusColor(order.status || "OPEN", themeColors), fontFamily: fontFamilySemiBold }}>{String(order.status || "OPEN").toUpperCase()}</AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 12, }}>
            {/* <View style={{ gap: 4 }}>
              <AppText type={TWELVE} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Reduce Only</AppText>
              <AppText type={TWELVE} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>{reduceOnly}</AppText>
            </View> */}
            <TouchableOpacity
              onPress={() => { setOrderToCancel(order); setCancelModalVisible(true); }}
              style={{
                paddingHorizontal: 30,
                paddingVertical: 10,
                borderRadius: 4,
                backgroundColor: isDark ? "rgba(255,255,255,0.15)" : colors.black,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AppText type={TWELVE} style={{ color: colors.white, fontFamily: fontFamilySemiBold }}>Cancel</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFuturesTransactionHistoryItem = ({ item: tx, isLast }) => {
    const dir = String(tx.direction ?? "").toUpperCase();
    const isCredit = dir === "CREDIT";
    const isDebit = dir === "DEBIT";
    const n = Number(tx.amount);
    const amountVal = isDebit ? -Math.abs(n) : n;

    let amountColor = themeColors.text;
    if (isCredit) amountColor = colors.green;
    if (isDebit) amountColor = colors.red;

    const prefix = amountVal >= 0 ? "+" : "-";
    const absVal = fmtFuturesQty(Math.abs(amountVal), "0");

    // Support web properties: tx.transaction_type and tx.created_at
    const txType = tx.transaction_type || tx.type || "Transfer In";
    const createdTime = tx.created_at || tx.createdAt || tx.updatedAt;

    return (
      <View style={{
        paddingVertical: 16,
        paddingHorizontal: 0,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: themeColors.themeBorderColor || "#e0e0e0",
      }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>
              {txType}
            </AppText>
            {/* <FastImage source={right_ic} style={{ width: 10, height: 10, marginLeft: 6 }} resizeMode="contain" tintColor={themeColors.secondaryText} /> */}
          </View>
        </View>

        <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, marginBottom: 12, fontFamily: fontFamilySemiBold }}>
          {createdTime ? moment(createdTime).format("YYYY-MM-DD HH:mm:ss") : "—"}
        </AppText>

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Amount</AppText>
            <AppText type={FOURTEEN} style={{ color: amountColor, fontFamily: fontFamilySemiBold }}>
              {prefix}{absVal} {tx.asset || "USDT"}
            </AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Symbol</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>
              {tx.symbol || "—"}
            </AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold, marginRight: 16 }}>Description</AppText>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold, textAlign: "right" }}>
                {tx.description || "—"}
              </AppText>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderFuturesOrderHistoryItem = ({ item: order, isLast }) => {
    const isBuy = String(order.side ?? "").toUpperCase() === "BUY";
    const orderType = formatFuturesOrderType(order.order_type ?? order.type);
    const sideColor = isBuy ? colors.green : colors.red;
    const filledQty = decNum(order.filled_quantity ?? order.executed_quantity ?? 0);
    const totalQty = decNum(order.quantity ?? 0);
    const baseCoin = order.symbol ? String(order.symbol).replace(/USDT.*/i, "").replace(/-PERP/i, "").replace(/\/.*/, "") : (selectedCoin?.base_currency || "BTC");

    const createdTime = order.created_at || order.createdAt || order.updatedAt;
    const dateFormatted = createdTime ? moment(createdTime).format("YYYY-MM-DD") : "—";
    const timeFormatted = createdTime ? moment(createdTime).format("HH:mm:ss") : "—";

    const avgFillVal = decNum(order.average_execution_price ?? order.avg_price);
    const displayPrice = getFuturesOrderDisplayPrice(order);
    const triggerText = getFuturesOrderTriggerText(order);

    return (
      <TouchableOpacity
        onPress={() => openFuturesHistoryDetail(navigation, { pos: order, selectedCoin, title: activeHistoryTab })}
        activeOpacity={0.7}
        style={{
          paddingVertical: 12,
          paddingHorizontal: 0,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: themeColors.themeBorderColor || "#e0e0e0",
        }}
      >
        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>
              {order.symbol || "—"}
            </AppText>
            <FastImage
              source={right_ic}
              style={{ width: 10, height: 10, marginLeft: 6 }}
              tintColor={themeColors.secondaryText}
              resizeMode="contain"
            />
          </View>
          <AppText type={TWELVE} style={{ color: themeColors.text, fontFamily: fontFamilyMedium }}>
            <AppText type={TWELVE} style={{ color: sideColor, fontFamily: fontFamilySemiBold }}>
              {isBuy ? "BUY" : "SELL"}
            </AppText>
            {" · "}{orderType}{" · "}{order.leverage || 1}x
          </AppText>
        </View>

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Price</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>
              {displayPrice}
            </AppText>
          </View>
          {triggerText && (
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Trigger</AppText>
              <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>{triggerText}</AppText>
            </View>
          )}
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Avg Fill</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>
              {avgFillVal > 0 ? fmtFuturesPrice(avgFillVal) : "0"}
            </AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Date</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>{dateFormatted}</AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Time</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>{timeFormatted}</AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Qty / Filled</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>{fmtFuturesQty(totalQty, "0")} / {fmtFuturesQty(filledQty, "0")} {baseCoin}</AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>TIF</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>{order.time_in_force || "GTC"}</AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Reduce Only</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>{order.reduce_only ? "Yes" : "No"}</AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Status</AppText>
            <AppText type={FOURTEEN} style={{ color: getStatusColor(order.status, themeColors), fontFamily: fontFamilySemiBold }}>
              {String(order.status || "—").toUpperCase()}
            </AppText>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFuturesTradeHistoryItem = ({ item: trade, isLast }) => {
    const userId = userData?._id || userData?.id;
    const t = computeTradeHistoryItem(trade, selectedCoin, userId);
    const sideColor = t.isBuy ? colors.green : colors.red;
    const pnlColor = t.realizedPnl > 0 ? colors.green : t.realizedPnl < 0 ? colors.red : themeColors.text;

    return (
      <TouchableOpacity
        onPress={() => openFuturesHistoryDetail(navigation, {
          pos: trade,
          selectedCoin,
          title: 'Trade History',
          userId,
        })}
        activeOpacity={0.7}
        style={{
          paddingVertical: 14,
          paddingHorizontal: 0,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: themeColors.themeBorderColor || "#e0e0e0",
        }}
      >
        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>
              {t.symbol}
            </AppText>
            <FastImage
              source={right_ic}
              style={{ width: 10, height: 10, marginLeft: 6 }}
              tintColor={themeColors.secondaryText}
              resizeMode="contain"
            />
          </View>
          <AppText type={TWELVE} style={{ color: themeColors.text, fontFamily: fontFamilyMedium }}>
            <AppText type={TWELVE} style={{ color: sideColor, fontFamily: fontFamilySemiBold }}>
              {t.sideText}
            </AppText>
            {` · ${t.roleText}`}
          </AppText>
        </View>

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Price</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>
              {t.price > 0 ? fmtFuturesPrice(t.price) : "Market"}
            </AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Qty</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>
              {fmtFuturesQty(t.qty, "0")} {t.baseCoin}
            </AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Date</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>{t.dateFormatted}</AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Time</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>{t.timeFormatted}</AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Fee</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>
              {capDecStr(t.fee, 8) ?? "0"} {t.feeAsset}
            </AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Realized PNL</AppText>
            <AppText type={FOURTEEN} style={{ color: pnlColor, fontFamily: fontFamilySemiBold }}>
              {t.realizedPnl > 0 ? `+${capDecStr(t.realizedPnl, 8)}` : (capDecStr(t.realizedPnl, 8) ?? "0")} USDT
            </AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Total</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>
              {capDecStr(t.total, 8) ?? "0"} USDT
            </AppText>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (activeHistoryTab === 'Positions') {
    if (futuresPositions.length === 0) {
      return <EmptyState />;
    }
    const data = limit ? futuresPositions.slice(0, limit) : futuresPositions;
    const hasMore = limit && futuresPositions.length > limit;
    return (
      <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
        {data.map((pos, index) => (
          <React.Fragment key={pos._id || index}>
            {renderFuturesPositionItem({ item: pos, isLast: index === data.length - 1 && !hasMore })}
          </React.Fragment>
        ))}
        {hasMore && (
          <TouchableOpacity onPress={onViewMore} style={{ marginTop: 16, alignItems: 'center' }}>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, textDecorationLine: 'underline', fontFamily: fontFamilySemiBold }}>View More</AppText>
          </TouchableOpacity>
        )}
        <View style={{ height: 80 }} />

        <FuturesClosePositionModal
          visible={closeModalVisible}
          isDark={isDark}
          themeColors={themeColors}
          loading={closeLoading}
          pos={posToClose}
          selectedCoin={selectedCoin}
          onClose={() => {
            if (closeLoading) return;
            setCloseModalVisible(false);
            setPosToClose(null);
          }}
          onConfirm={executeClosePosition}
        />

        <FuturesAdjustMarginModal
          visible={adjustMarginModalVisible}
          isDark={isDark}
          themeColors={themeColors}
          loading={adjustMarginLoading}
          pos={posToAdjustMargin}
          availableBalance={availableBalance}
          onClose={() => {
            if (adjustMarginLoading) return;
            setAdjustMarginModalVisible(false);
            setPosToAdjustMargin(null);
          }}
          onConfirm={executeAdjustMargin}
        />
      </View>
    );
  }

  if (activeHistoryTab === 'Position History') {
    if (futuresPositionHistory.length === 0) {
      return <EmptyState />;
    }
    const data = limit ? futuresPositionHistory.slice(0, limit) : futuresPositionHistory;
    const hasMore = limit && futuresPositionHistory.length > limit;
    return (
      <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
        {data.map((pos, index) => (
          <React.Fragment key={pos._id || index}>
            {renderFuturesPositionHistoryItem({ item: pos, isLast: index === data.length - 1 && !hasMore })}
          </React.Fragment>
        ))}
        {hasMore && (
          <TouchableOpacity onPress={onViewMore} style={{ marginTop: 16, alignItems: 'center' }}>
            <AppText type={FOURTEEN} style={{ color: themeColors.text, textDecorationLine: 'underline' }}>View More</AppText>
          </TouchableOpacity>
        )}
        <View style={{ height: 80 }} />
      </View>
    );
  }

  if (activeHistoryTab === 'Open Orders') {
    const filteredOrders = futuresOpenOrders.filter((o) => {
      if (orderSideFilter !== 'All Sides') {
        const orderSide = String(o.side ?? "").toUpperCase();
        if (orderSideFilter === 'Buy' && orderSide !== 'BUY') return false;
        if (orderSideFilter === 'Sell' && orderSide !== 'SELL') return false;
      }
      if (orderKindFilter !== 'all') {
        const orderType = String(o.order_type ?? o.type ?? "").toUpperCase();
        if (orderKindFilter === 'limit' && orderType !== 'LIMIT') return false;
        if (orderKindFilter === 'market' && orderType !== 'MARKET') return false;
      }
      return true;
    });

    return (
      <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>

        {filteredOrders.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {filteredOrders.slice(0, limit ? limit : filteredOrders.length).map((order, index) => (
              <React.Fragment key={order._id || index}>
                {renderFuturesOpenOrderItem({ item: order, isLast: index === filteredOrders.length - 1 && (!limit || filteredOrders.length <= limit) })}
              </React.Fragment>
            ))}
            {limit && filteredOrders.length > limit && (
              <TouchableOpacity onPress={onViewMore} style={{ marginTop: 16, alignItems: 'center' }}>
                <AppText type={FOURTEEN} style={{ color: themeColors.text, textDecorationLine: 'underline' }}>View More</AppText>
              </TouchableOpacity>
            )}
          </>
        )}
        <View style={{ height: 80 }} />

        <FuturesCancelModal
          visible={cancelModalVisible}
          isDark={isDark}
          themeColors={themeColors}
          loading={cancelLoading}
          onClose={() => setCancelModalVisible(false)}
          onConfirm={executeCancelOrder}
        />
      </View>
    );
  }

  if (activeHistoryTab === 'Order History') {
    const filteredOrders = futuresOrderHistory.filter((o) => {
      if (orderSideFilter !== 'All Sides') {
        const orderSide = String(o.side ?? "").toUpperCase();
        if (orderSideFilter === 'Buy' && orderSide !== 'BUY') return false;
        if (orderSideFilter === 'Sell' && orderSide !== 'SELL') return false;
      }
      if (orderKindFilter !== 'all') {
        const orderType = String(o.order_type ?? o.type ?? "").toUpperCase();
        if (orderKindFilter === 'limit' && orderType !== 'LIMIT') return false;
        if (orderKindFilter === 'market' && orderType !== 'MARKET') return false;
      }
      return true;
    });

    return (
      <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>

        {filteredOrders.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {filteredOrders.slice(0, limit ? limit : filteredOrders.length).map((order, index) => (
              <React.Fragment key={order._id || index}>
                {renderFuturesOrderHistoryItem({ item: order, isLast: index === filteredOrders.length - 1 && (!limit || filteredOrders.length <= limit) })}
              </React.Fragment>
            ))}
            {limit && filteredOrders.length > limit && (
              <TouchableOpacity onPress={onViewMore} style={{ marginTop: 16, alignItems: 'center' }}>
                <AppText type={FOURTEEN} style={{ color: themeColors.text, textDecorationLine: 'underline' }}>View More</AppText>
              </TouchableOpacity>
            )}
          </>
        )}
        <View style={{ height: 80 }} />
      </View>
    );
  }

  if (activeHistoryTab === 'Trade History') {
    const list = futuresTradeHistory || [];
    const data = limit ? list.slice(0, limit) : list;
    const hasMore = limit && list.length > limit;

    return (
      <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
        {list.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {data.map((trade, index) => (
              <React.Fragment key={trade._id || trade.id || index}>
                {renderFuturesTradeHistoryItem({ item: trade, isLast: index === data.length - 1 && !hasMore })}
              </React.Fragment>
            ))}
            {hasMore && (
              <TouchableOpacity onPress={onViewMore} style={{ marginTop: 16, alignItems: 'center' }}>
                <AppText type={FOURTEEN} style={{ color: themeColors.text, textDecorationLine: 'underline', fontFamily: fontFamilySemiBold }}>View More</AppText>
              </TouchableOpacity>
            )}
          </>
        )}
        <View style={{ height: 80 }} />
      </View>
    );
  }

  if (activeHistoryTab === 'Transaction History') {
    let filteredTx = futuresTransactionHistory || [];

    if (walletHistoryFilters) {
      if (walletHistoryFilters.type) {
        filteredTx = filteredTx.filter(tx => {
          const type = tx.transaction_type || tx.type || "";
          return type.toUpperCase() === walletHistoryFilters.type.toUpperCase();
        });
      }
      if (walletHistoryFilters.asset) {
        filteredTx = filteredTx.filter(tx => {
          const asset = tx.asset || "";
          return asset.toUpperCase().includes(walletHistoryFilters.asset.toUpperCase());
        });
      }
      if (walletHistoryFilters.contract) {
        filteredTx = filteredTx.filter(tx => {
          const sym = tx.symbol || "";
          return sym.toUpperCase().includes(walletHistoryFilters.contract.toUpperCase());
        });
      }
      if (walletHistoryFilters.from && walletHistoryFilters.to) {
        const fromDateStr = walletHistoryFilters.from;
        const toDateStr = walletHistoryFilters.to;
        const fromUnix = moment(fromDateStr).startOf('day').unix();
        const toUnix = moment(toDateStr).endOf('day').unix();
        filteredTx = filteredTx.filter(tx => {
          const txTime = tx.created_at || tx.createdAt || tx.updatedAt;
          if (!txTime) return true;
          const timeUnix = moment(txTime).unix();
          return timeUnix >= fromUnix && timeUnix <= toUnix;
        });
      }
    }

    const data = limit ? filteredTx.slice(0, limit) : filteredTx;
    const hasMore = limit && filteredTx.length > limit;

    return (
      <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 12 }}>
          <TouchableOpacity onPress={() => setFilterSheetVisible(true)}>
            <FastImage source={filterIcon} style={{ width: 24, height: 24 }} tintColor={themeColors.text} resizeMode="contain" />
          </TouchableOpacity>
        </View>

        {filteredTx.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {data.map((tx, index) => (
              <React.Fragment key={tx._id || index}>
                {renderFuturesTransactionHistoryItem({ item: tx, isLast: index === data.length - 1 && !hasMore })}
              </React.Fragment>
            ))}
            {hasMore && (
              <TouchableOpacity onPress={onViewMore} style={{ marginTop: 16, alignItems: 'center' }}>
                <AppText type={FOURTEEN} style={{ color: themeColors.text, textDecorationLine: 'underline' }}>View More</AppText>
              </TouchableOpacity>
            )}
          </>
        )}

        <FuturesHistoryFilterSheet
          visible={filterSheetVisible}
          onClose={() => setFilterSheetVisible(false)}
          themeColors={themeColors}
          isDark={isDark}
          initialFilters={walletHistoryFilters}
          applyFilters={(filters) => setWalletHistoryFilters(filters)}
          selectedCoin={selectedCoin}
          futuresPositions={futuresPositions}
        />

        <View style={{ height: 80 }} />
      </View>
    );
  }

  return <EmptyState />;
};

export default FuturesHistorySection;
