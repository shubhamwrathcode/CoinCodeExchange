import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, StatusBar, FlatList, ScrollView, ActivityIndicator } from 'react-native';
import FastImage from 'react-native-fast-image';
import moment from 'moment';
import { AppText } from '../../../common';
import { useTheme } from '../../../hooks/useTheme';
import { fontFamilyMedium, fontFamilySemiBold, fontFamilyBold } from '../../../theme/typography';
import { back_ic, filterIcon, NO_NOTIFICATION_ICON, NO_NOTIFICATION_ICON_LIGHT, right_ic } from '../../../helper/ImageAssets';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { appOperation } from '../../../appOperation';
import { useSelector } from 'react-redux';
import { FOURTEEN, FIFTEEN, MEDIUM, SEMI_BOLD, BOLD } from '../../../shared';
import { colors } from '../../../theme/colors';
import { showError, showSuccess } from '../../../helper/logger';

const TABS = [
  { key: 'positions', label: 'Positions', endpoint: 'optionsOpenPositions' },
  { key: 'positionHistory', label: 'Position History', endpoint: 'optionsPositionHistory' },
  { key: 'openOrders', label: 'Open Orders', endpoint: 'optionsOpenOrders' },
  { key: 'orderHistory', label: 'Order History', endpoint: 'optionsOrderHistory' },
  { key: 'tradeHistory', label: 'Trade History', endpoint: 'optionsTradeHistory' },
  { key: 'transactionHistory', label: 'Transaction History', endpoint: 'optionsTransactionHistory' },
];

function safeToFixed(val, p = 2) {
  if (val == null || val === "" || isNaN(Number(val))) return "—";
  return Number(val).toFixed(p);
}

function formatUSDT(val, p = 2) {
  if (val == null || val === "" || isNaN(Number(val))) return "—";
  const num = Number(val);
  // Avoid trailing zeros if it's an integer, but toFixed is fine
  return `${Number.isInteger(num) ? num : parseFloat(num.toFixed(p))} USDT`;
}

function formatPnl(val, p = 2) {
  if (val == null || val === "" || isNaN(Number(val))) return "—";
  const num = Number(val);
  if (num === 0) return "0 USDT";
  const sign = num > 0 ? "+" : "";
  return `${sign}${parseFloat(num.toFixed(p))} USDT`;
}

function formatDate(ts) {
  if (!ts) return "—";
  return moment(ts).format("DD/MM/YYYY");
}

function formatTime(ts) {
  if (!ts) return "—";
  return moment(ts).format("HH:mm:ss");
}

// -----------------------------------------------------
// Reusable Trade Kv Row from TradeHistory.js
// -----------------------------------------------------
const TradeKvRow = React.memo(({ label, value, color, textColor, isDark }) => (
  <View style={styles.tradeKvRow}>
    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.tradeKvK, { color: isDark ? "#8E8E93" : "#666666" }]}>{label}</AppText>
    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.tradeKvV, { color: color ?? textColor, flexShrink: 1, marginLeft: 16 }]} numberOfLines={1} ellipsizeMode="tail">
      {value}
    </AppText>
  </View>
));

// -----------------------------------------------------
// Symbol Formatting
// -----------------------------------------------------
function formatSymbolDisplay(symbol) {
  const sym = String(symbol || "").trim();
  const m = sym.match(/^([A-Z0-9]+)-(\d{6})-(\d+)-([CP])$/i);
  if (m) {
    const [, base, expiryCode, strikeRaw, cp] = m;
    const typeLabel = cp.toUpperCase() === "C" ? "Call" : "Put";
    const strikeNum = Number(strikeRaw);
    const strikeLabel = strikeNum > 0
      ? strikeNum.toLocaleString(undefined, { maximumFractionDigits: 3 })
      : strikeRaw;
    return {
      primary: `${base}-${expiryCode}`,
      secondary: `${strikeLabel}-${typeLabel}`,
    };
  }
  return { primary: sym, secondary: "" };
}

const OptionsHistoryCard = React.memo(({ item, tabKey, userId, onPress, onCancel, cancellingOrderId }) => {
  const { colors: themeColors, isDark } = useTheme();
  const textColor = themeColors.text ?? "#000";
  const labelColor = isDark ? "#8E8E93" : "#666666";

  const ts = item.updated_at || item.created_at || item.timestamp || item.time || item.date || item.closed_at || item.createdAt || item.updateTime;
  const headerDateTime = ts ? moment(ts).format("DD/MM/YYYY HH:mm:ss") : "—";

  const symDisplay = formatSymbolDisplay(item.symbol || item.currency_pair || item.asset);
  const symbolStr = item.symbol || item.currency_pair || item.asset || "—";

  let side = String(item.side || item.position_side || item.type || "").toUpperCase();
  let feeVal = Number(item.fee || 0);

  const uid = String(userId || "");
  const buyerId = String(item.buyer_id || "");
  const sellerId = String(item.seller_id || "");

  if (uid && buyerId && buyerId === uid) {
    side = "BUY";
    feeVal = Number(item.buyer_fee || 0);
  } else if (uid && sellerId && sellerId === uid) {
    side = "SELL";
    feeVal = Number(item.seller_fee || 0);
  }

  const getSideColor = (s) => {
    if (s === 'LONG' || s === 'BUY') return '#00c087';
    if (s === 'SHORT' || s === 'SELL') return '#ff4b5c';
    return textColor;
  };
  const getPnlColor = (pnl) => {
    const num = Number(pnl);
    if (num > 0) return '#00c087';
    if (num < 0) return '#ff4b5c';
    return textColor;
  };

  const sideColor = getSideColor(side);
  const expiryDate = item.expiry_time ? moment(item.expiry_time).format("DD/MM/YYYY HH:mm:ss") : (item.expiry_date || item.expiryDate || "—");
  const strikePrice = item.strike_price || item.strikePrice || item.strike || "—";
  const amount = item.amount || item.size || item.quantity || item.qty || "—";

  const isOrderTab = tabKey === 'openOrders' || tabKey === 'orderHistory';
  const isTradeTab = tabKey === 'tradeHistory';
  const isTransTab = tabKey === 'transactionHistory';
  const orderType = String(item.order_type || item.orderType || item.type || "LIMIT").toUpperCase();
  const orderStatus = String(item.status || item.state || "NEW").toUpperCase();

  const formatOptionsTransactionType = (type) => {
    const s = String(type || "").toUpperCase();
    const labels = {
      TRANSFER_IN: "Transfer In", TRANSFER_OUT: "Transfer Out", TRADING_FEE: "Trading Fee",
      PREMIUM: "Premium", SETTLEMENT: "Settlement", EXERCISE: "Exercise",
      LIQUIDATION: "Liquidation", TRANSFER: "Transfer", TRADE: "Trade", FEE: "Fee",
    };
    return labels[s] || (s ? s.replace(/_/g, " ") : "—");
  };

  const transType = formatOptionsTransactionType(item.transaction_type || item.type);
  const transDir = String(item.direction || "").toUpperCase();
  const dirLabel = transDir === "CREDIT" ? "Credit" : transDir === "DEBIT" ? "Debit" : transDir ? (transDir.charAt(0).toUpperCase() + transDir.slice(1).toLowerCase()) : "—";
  const transAmt = Number(item.amount || 0);
  const isCredit = transDir === "CREDIT";
  const isDebit = transDir === "DEBIT";
  const transSign = isCredit ? "+" : isDebit ? "-" : (transAmt >= 0 ? "+" : "-");
  const transFormattedAmt = `${transSign}${Math.abs(transAmt).toString()} ${item.asset || "USDT"}`;

  let tradeRole = String(item.role || "");
  if (!tradeRole) {
    const buyerRate = Number(item.buyer_fee_rate || 0);
    const sellerRate = Number(item.seller_fee_rate || 0);
    if (side && (buyerRate > 0 || sellerRate > 0)) {
      if (buyerRate < sellerRate) tradeRole = side === "BUY" ? "Maker" : "Taker";
      else if (sellerRate < buyerRate) tradeRole = side === "SELL" ? "Maker" : "Taker";
      else tradeRole = "Taker";
    } else {
      tradeRole = "Taker";
    }
  }
  const tradeRoleCased = tradeRole.charAt(0).toUpperCase() + tradeRole.slice(1).toLowerCase();
  const sideDisplay = side && side !== '—' ? (side.charAt(0).toUpperCase() + side.slice(1).toLowerCase()) : "";

  const filledQty = Number(item.filled || item.executed_qty || item.filled_quantity || item.filledQty || 0);
  const unfilledQty = Number(amount) - filledQty;
  const orderId = item.order_id || item.orderId || item.id || item._id;
  const isCancelling = cancellingOrderId != null && String(cancellingOrderId) === String(orderId);
  const canCancel = tabKey === 'openOrders' && Boolean(orderId) && typeof onCancel === 'function';

  let intent = "—";
  if (side === 'BUY') intent = "OPEN LONG";
  else if (side === 'SELL') intent = "OPEN SHORT";
  const intentStr = String(item.intent || intent).toUpperCase();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.orderSpotCard, { backgroundColor: "transparent", borderColor: themeColors.themeBorderColor || '#EAEAEA' }]}>
      <View style={styles.orderSpotHeaderRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <AppText type={FIFTEEN} weight={BOLD} style={{ color: textColor }}>
              {isTransTab ? transType : (isOrderTab || isTradeTab) ? symbolStr : symDisplay.primary}
            </AppText>
            <FastImage source={right_ic} style={{ width: 12, height: 12, marginLeft: 4 }} resizeMode="contain" tintColor={labelColor} />
          </View>
          <AppText style={{ color: textColor, marginTop: 4 }} type={FOURTEEN}>
            {isOrderTab
              ? `${sideDisplay} · ${orderType} · ${orderStatus}`
              : isTradeTab
                ? `${sideDisplay} · ${tradeRoleCased}`
                : isTransTab
                  ? `${dirLabel} · ${transFormattedAmt}`
                  : `${symDisplay.secondary} ${sideDisplay ? `· ${sideDisplay}` : ""}`
            }
          </AppText>
        </View>
      </View>

      <View style={styles.detailsContainer}>
        {tabKey === 'positions' && (
          <>
            <TradeKvRow label="Expiry Date" value={expiryDate} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Side" value={side} color={sideColor} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Amount" value={amount} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Strike Price" value={strikePrice} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Entry Price" value={safeToFixed(item.entry_price || item.entryPrice)} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Mark Price" value={safeToFixed(item.mark_price || item.markPrice)} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Unrealized PnL" value={formatPnl(item.unrealized_pnl || item.unrealizedPnl)} color={getPnlColor(item.unrealized_pnl || item.unrealizedPnl)} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Market Value" value={formatUSDT(item.market_value || item.marketValue)} textColor={textColor} isDark={isDark} />
          </>
        )}

        {tabKey === 'positionHistory' && (
          <>
            <TradeKvRow label="Expiry Date" value={expiryDate} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Side" value={side} color={sideColor} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Amount" value={amount} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Strike Price" value={strikePrice} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Avg Price" value={safeToFixed(item.avg_price || item.avgPrice)} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Open Notional" value={formatUSDT(item.open_notional || item.openNotional)} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Realized PnL" value={formatPnl(item.realized_pnl || item.realizedPnl)} color={getPnlColor(item.realized_pnl || item.realizedPnl)} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Status" value={String(item.status || "—").toUpperCase()} textColor={textColor} isDark={isDark} />
          </>
        )}

        {tabKey === 'openOrders' && (
          <>
            <TradeKvRow label="Created" value={headerDateTime} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Price" value={safeToFixed(item.price || item.orderPrice)} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Amount" value={amount} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Filled" value={safeToFixed(filledQty)} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Unfilled" value={safeToFixed(unfilledQty > 0 ? unfilledQty : 0)} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Intent" value={intentStr} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="TIF" value={String(item.time_in_force || item.timeInForce || "GTC").toUpperCase()} textColor={textColor} isDark={isDark} />
            <View style={styles.tradeKvRow}>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.tradeKvK, { color: isDark ? "#8E8E93" : "#666666" }]}>Action</AppText>
              {canCancel ? (
                <TouchableOpacity
                  style={[
                    styles.cancelBtn,
                    {
                      backgroundColor: isDark ? 'transparent' : "#FEE2E2",
                      borderColor: isDark ? colors.white : colors.black,
                    },
                    isCancelling && styles.cancelBtnDisabled,
                  ]}
                  onPress={() => onCancel(orderId)}
                  disabled={isCancelling}
                  activeOpacity={0.7}
                >
                  {isCancelling ? (
                    <ActivityIndicator size="small" color={isDark ? colors.white : colors.black} />
                  ) : (
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.cancelBtnText, { color: isDark ? colors.white : colors.black }]}>Cancel</AppText>
                  )}
                </TouchableOpacity>
              ) : (
                <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.tradeKvV, { color: textColor }]}>—</AppText>
              )}
            </View>
          </>
        )}

        {tabKey === 'orderHistory' && (
          <>
            <TradeKvRow label="Time" value={headerDateTime} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Price" value={safeToFixed(item.price || item.orderPrice)} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Avg Fill" value={safeToFixed(item.avg_price || item.avgPrice)} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Qty" value={amount} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Filled" value={safeToFixed(filledQty)} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Total" value={safeToFixed(item.executed_value || item.total)} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Reduce Only" value={item.reduce_only ? "Yes" : "No"} textColor={textColor} isDark={isDark} />
          </>
        )}

        {tabKey === 'tradeHistory' && (
          <>
            <TradeKvRow label="Time" value={headerDateTime} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Price" value={safeToFixed(item.price)} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Qty" value={amount} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Fee" value={formatUSDT(feeVal, 6)} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Total" value={formatUSDT(item.trade_value || (Number(item.price || 0) * Number(amount || 0)))} textColor={textColor} isDark={isDark} />
            <TradeKvRow
              label="Trade ID"
              value={`#${String(item.trade_id || item.id || item.tradeId || "").trim().slice(-6).toUpperCase()}`}
              textColor={textColor}
              isDark={isDark}
            />
          </>
        )}

        {tabKey === 'transactionHistory' && (
          <>
            <TradeKvRow label="Time" value={headerDateTime} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Direction" value={dirLabel} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Amount" value={transFormattedAmt} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Symbol" value={item.symbol || "—"} textColor={textColor} isDark={isDark} />
            <TradeKvRow label="Description" value={item.description || "—"} textColor={textColor} isDark={isDark} />
          </>
        )}
      </View>
    </TouchableOpacity>
  );
});

const OptionHistory = () => {
  const { colors: themeColors, isDark } = useTheme();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState(0);
  const userData = useSelector(state => state.auth.userData);
  const userId = userData?._id || userData?.user_id || "";

  const [dataCache, setDataCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);

  const currentTab = TABS[activeTab];
  const listData = dataCache[currentTab.key] || [];
  const openOrdersTabIndex = useMemo(() => TABS.findIndex((t) => t.key === 'openOrders'), []);

  const fetchData = useCallback(async (tabIndex) => {
    const tabObj = TABS[tabIndex];
    if (!tabObj.endpoint) return;

    setLoading(true);
    try {
      let params = { limit: 50, page: 1, skip: 0 };
      if (tabObj.key === 'positionHistory') params.status = "CLOSED,LIQUIDATED,EXPIRED";
      if (tabObj.key === 'orderHistory') params.status = "FILLED,CANCELLED,REJECTED,EXPIRED";
      if (tabObj.key === 'transactionHistory') params.asset = "USDT";

      const res = await appOperation.customer[tabObj.endpoint](params);

      if (res?.success || res?.status === 200 || res?.data) {
        let payload = res.data?.data || res.data || [];
        if (Array.isArray(res.data?.positions)) payload = res.data.positions;
        else if (Array.isArray(res.positions)) payload = res.positions;
        else if (Array.isArray(res.data?.transactions)) payload = res.data.transactions;
        else if (Array.isArray(res.transactions)) payload = res.transactions;
        else if (Array.isArray(res.data?.orders)) payload = res.data.orders;
        else if (Array.isArray(res.orders)) payload = res.orders;
        else if (Array.isArray(res.data?.trades)) payload = res.data.trades;
        else if (Array.isArray(res.trades)) payload = res.trades;
        else if (!Array.isArray(payload)) payload = [];

        setDataCache(prev => ({ ...prev, [tabObj.key]: payload }));
      }
    } catch (e) {
      console.log('Error fetching options history:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCancelOrder = useCallback(async (orderId) => {
    if (!orderId || cancellingOrderId) return;
    setCancellingOrderId(orderId);
    try {
      const result = await appOperation.customer.close_option_order({ order_id: String(orderId) });
      if (!result?.success) {
        showError(result?.message || "Failed to cancel order.");
        return;
      }
      showSuccess("Order cancelled successfully");
      setDataCache((prev) => ({
        ...prev,
        openOrders: (prev.openOrders || []).filter((order) => {
          const id = order.order_id || order.orderId || order.id || order._id;
          return String(id) !== String(orderId);
        }),
      }));
      if (openOrdersTabIndex >= 0) fetchData(openOrdersTabIndex);
    } catch (err) {
      showError(err?.message || "Failed to cancel order.");
    } finally {
      setCancellingOrderId(null);
    }
  }, [cancellingOrderId, fetchData, openOrdersTabIndex]);

  useEffect(() => {
    if (!dataCache[currentTab.key]) {
      fetchData(activeTab);
    }
  }, [activeTab]);

  useFocusEffect(
    useCallback(() => {
      if (currentTab.key === 'openOrders') {
        fetchData(openOrdersTabIndex);
      }
    }, [currentTab.key, fetchData, openOrdersTabIndex])
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <FastImage source={back_ic} style={styles.backIcon} tintColor={themeColors.text} resizeMode="contain" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <AppText style={[styles.headerTitle, { color: themeColors.text }]}>Trade</AppText>
          <AppText style={[styles.headerSubtitle, { color: themeColors.secondaryText }]}>Options</AppText>
        </View>

        <View style={styles.backBtn} />
      </View>

      <View style={[styles.tabsRow, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.leftTabs}>
          {TABS.map((tab, index) => {
            const isActive = activeTab === index;

            return (
              <TouchableOpacity key={index} style={styles.tabBtn} onPress={() => setActiveTab(index)}>
                <AppText style={[styles.tabText, {
                  color: isActive ? themeColors.text : themeColors.secondaryText,
                  fontFamily: isActive ? fontFamilyBold : fontFamilyMedium
                }]}>
                  {tab.label}
                </AppText>
                {isActive && <View style={[styles.activeUnderline, { backgroundColor: themeColors.text }]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>


      </View>

      {loading && listData.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="small" color={themeColors.text} />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item, index }) => (
            <OptionsHistoryCard
              key={index.toString()}
              item={item}
              tabKey={currentTab.key}
              userId={userId}
              onCancel={currentTab.key === 'openOrders' ? handleCancelOrder : undefined}
              cancellingOrderId={cancellingOrderId}
              onPress={() => navigation.navigate('OptionHistoryCardDetailPage', { item, tabKey: currentTab.key, title: currentTab.label, userId })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.bodyContainer}>
              <FastImage
                source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT}
                style={styles.emptyIcon}
                resizeMode="contain"
              />
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default OptionHistory;

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backIcon: { width: 20, height: 20 },
  headerTitleContainer: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontFamily: fontFamilyBold },
  headerSubtitle: { fontSize: 12, fontFamily: fontFamilyMedium, marginTop: 2 },
  tabsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  leftTabs: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingHorizontal: 16 },
  tabBtn: { paddingVertical: 12, position: 'relative' },
  tabText: { fontSize: 14, whiteSpace: 'nowrap' },
  activeUnderline: { position: 'absolute', bottom: -1, left: '50%', marginLeft: -15, width: 30, height: 3, borderRadius: 2 },
  filterBtn: { padding: 12, borderLeftWidth: 1, borderLeftColor: 'transparent' },
  filterIcon: { width: 18, height: 18 },
  bodyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyIcon: { width: 100, height: 100, marginBottom: 16 },
  emptyText: { fontSize: 15, fontFamily: fontFamilyMedium },

  // Card Styles from TradeHistory.js
  tradeKvRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginTop: 12 },
  tradeKvK: { fontSize: 13 },
  tradeKvV: { flex: 1, textAlign: "right", fontSize: 13 },
  orderSpotCard: { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1 },
  orderSpotHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  detailsContainer: { marginTop: 4 },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnDisabled: { opacity: 0.5 },
  cancelBtnText: { fontSize: 13, fontWeight: "600" },
});
