import { AppSafeAreaView } from '../../../shared';
import React, { useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import FastImage from 'react-native-fast-image';
import moment from 'moment';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useTheme } from '../../../hooks/useTheme';
import { AppText, FOURTEEN, SIXTEEN, SEMI_BOLD } from '../../../common';
import { fontFamilyMedium, fontFamilySemiBold } from '../../../theme/typography';
import { colors } from '../../../theme/colors';
import { back_ic } from '../../../helper/ImageAssets';
import { appOperation } from '../../../appOperation';
import { showError, showSuccess } from '../../../helper/logger';

// --- Formatters (duplicated from OptionHistory for brevity) ---
function safeToFixed(val, p = 2) {
  if (val == null || val === "" || isNaN(Number(val))) return "—";
  return Number(val).toFixed(p);
}

function formatUSDT(val, p = 2) {
  if (val == null || val === "" || isNaN(Number(val))) return "—";
  const num = Number(val);
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

// -----------------------------------------------------------

const OptionHistoryCardDetailPage = () => {
  const { colors: themeColors, isDark } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const [cancelling, setCancelling] = useState(false);

  const { item, tabKey, title, userId } = route.params || {};

  if (!item) {
    return (
      <View style={{ flex: 1, backgroundColor: themeColors.background, alignItems: 'center', justifyContent: 'center' }}>
        <AppText type={FOURTEEN} style={{ color: themeColors.text }}>No Data Available</AppText>
      </View>
    );
  }

  const textColor = themeColors.text ?? "#000";
  const labelColor = isDark ? "#8E8E93" : "#666666";

  const getSideColor = (sideVal) => {
    if (sideVal === 'LONG' || sideVal === 'BUY') return '#00c087';
    if (sideVal === 'SHORT' || sideVal === 'SELL') return '#ff4b5c';
    return textColor;
  };

  const getPnlColor = (pnl) => {
    const num = Number(pnl);
    if (num > 0) return '#00c087';
    if (num < 0) return '#ff4b5c';
    return textColor;
  };

  const symDisplay = formatSymbolDisplay(item.symbol || item.currency_pair || item.asset);

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

  const sideColor = getSideColor(side);
  const ts = item.updated_at || item.created_at || item.timestamp || item.time || item.date || item.closed_at;
  const headerDateTime = ts ? moment(ts).format("DD/MM/YYYY HH:mm:ss") : "—";

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

  const filledQty = Number(item.filled || item.executed_qty || 0);
  const unfilledQty = Number(amount) - filledQty;

  let intent = "—";
  if (side === 'BUY') intent = "OPEN LONG";
  else if (side === 'SELL') intent = "OPEN SHORT";
  const intentStr = String(item.intent || intent).toUpperCase();
  const orderId = item.order_id || item.orderId || item.id || item._id;

  const handleCancelOrder = useCallback(async () => {
    if (!orderId || cancelling) return;
    setCancelling(true);
    try {
      const result = await appOperation.customer.close_option_order({ order_id: String(orderId) });
      if (!result?.success) {
        showError(result?.message || "Failed to cancel order.");
        return;
      }
      showSuccess("Order cancelled successfully");
      navigation.goBack();
    } catch (err) {
      showError(err?.message || "Failed to cancel order.");
    } finally {
      setCancelling(false);
    }
  }, [orderId, cancelling, navigation]);

  const renderDetailRow = (label, value, valueColor = themeColors.text, valueFont = fontFamilyMedium) => (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
      <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilyMedium }}>{label}</AppText>
      <AppText type={FOURTEEN} style={{ color: valueColor, fontFamily: valueFont, textAlign: "right", flexShrink: 1, marginLeft: 16 }}>
        {value}
      </AppText>
    </View>
  );

  return (
    <AppSafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: Platform.OS === 'ios' ? 10 : 16,
        borderBottomWidth: 1,
        borderBottomColor: themeColors.themeBorderColor || "#e0e0e0",
        justifyContent: 'space-between'
      }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ padding: 4 }}
        >
          <FastImage
            source={back_ic}
            style={{ width: 20, height: 20 }}
            tintColor={themeColors.text}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <AppText type={SIXTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold, marginRight: 20 }}>
          {title} Detail
        </AppText>
        <View></View>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 20 }}>
        {/* Header block with Symbol */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
            <AppText type={SIXTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>
              {isTransTab ? transType : (isOrderTab || isTradeTab) ? (item.symbol || item.currency_pair || item.asset || "—") : symDisplay.primary}
            </AppText>
          </View>
          <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilyMedium }}>
            {isOrderTab
              ? `${sideDisplay} · ${orderType} · ${orderStatus}`
              : isTradeTab
                ? `${sideDisplay} · ${tradeRoleCased}`
                : isTransTab
                  ? `${dirLabel} · ${transFormattedAmt}`
                  : <>{symDisplay.secondary} {sideDisplay && `· `}<AppText type={FOURTEEN} style={{ color: sideColor, fontFamily: fontFamilySemiBold }}>{sideDisplay}</AppText></>
            }
          </AppText>
        </View>

        <View style={{ gap: 4 }}>
          {tabKey === 'positions' && (
            <>
              {renderDetailRow("Expiry Date", expiryDate)}
              {renderDetailRow("Long/Short", side, sideColor)}
              {renderDetailRow("Amount", amount)}
              {renderDetailRow("Strike Price", strikePrice)}
              {renderDetailRow("Entry Price", safeToFixed(item.entry_price || item.entryPrice))}
              {renderDetailRow("Mark Price", safeToFixed(item.mark_price || item.markPrice))}
              {renderDetailRow("Unrealized PnL", formatPnl(item.unrealized_pnl || item.unrealizedPnl), getPnlColor(item.unrealized_pnl || item.unrealizedPnl))}
              {renderDetailRow("Market Value", formatUSDT(item.market_value || item.marketValue))}
            </>
          )}

          {tabKey === 'positionHistory' && (
            <>
              {renderDetailRow("Expiry Date", expiryDate)}
              {renderDetailRow("Long/Short", side, sideColor)}
              {renderDetailRow("Amount", amount)}
              {renderDetailRow("Strike Price", strikePrice)}
              {renderDetailRow("Avg Price", safeToFixed(item.avg_price || item.avgPrice))}
              {renderDetailRow("Open Notional", formatUSDT(item.open_notional || item.openNotional))}
              {renderDetailRow("Realized PnL", formatPnl(item.realized_pnl || item.realizedPnl), getPnlColor(item.realized_pnl || item.realizedPnl))}
              {renderDetailRow("Status", String(item.status || "—").toUpperCase())}
            </>
          )}

          {tabKey === 'openOrders' && (
            <>
              {renderDetailRow("Created", headerDateTime)}
              {renderDetailRow("Price", safeToFixed(item.price || item.orderPrice))}
              {renderDetailRow("Amount", amount)}
              {renderDetailRow("Filled", safeToFixed(filledQty))}
              {renderDetailRow("Unfilled", safeToFixed(unfilledQty > 0 ? unfilledQty : 0))}
              {renderDetailRow("Intent", intentStr)}
              {renderDetailRow("TIF", String(item.time_in_force || item.timeInForce || "GTC").toUpperCase())}
              {renderDetailRow("Reduce Only", item.reduce_only ? "Yes" : "No")}

              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, alignItems: 'center' }}>
                <AppText type={FOURTEEN} style={{ color: labelColor, fontFamily: fontFamilySemiBold }}>Action</AppText>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: "#000000",
                    paddingHorizontal: 20,
                    paddingVertical: 6,
                    borderRadius: 16,
                    minWidth: 80,
                    alignItems: "center",
                    opacity: cancelling ? 0.6 : 1,
                  }}
                  onPress={handleCancelOrder}
                  disabled={cancelling || !orderId}
                >
                  {cancelling ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: "#FFFFFF" }}>Cancel</AppText>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {tabKey === 'orderHistory' && (
            <>
              {renderDetailRow("Time", headerDateTime)}
              {renderDetailRow("Price", safeToFixed(item.price || item.orderPrice))}
              {renderDetailRow("Avg Fill", safeToFixed(item.avg_price || item.avgPrice))}
              {renderDetailRow("Qty", amount)}
              {renderDetailRow("Filled", safeToFixed(filledQty))}
              {renderDetailRow("Total", safeToFixed(item.executed_value || item.total))}
              {renderDetailRow("Reduce Only", item.reduce_only ? "Yes" : "No")}
            </>
          )}

          {tabKey === 'tradeHistory' && (
            <>
              {renderDetailRow("Time", headerDateTime)}
              {renderDetailRow("Price", safeToFixed(item.price))}
              {renderDetailRow("Qty", amount)}
              {renderDetailRow("Fee", formatUSDT(feeVal, 6))}
              {renderDetailRow("Total", formatUSDT(item.trade_value || (Number(item.price || 0) * Number(amount || 0))))}
              {renderDetailRow("Trade ID", `#${String(item.trade_id || item.id || item.tradeId || "").trim().slice(-6).toUpperCase()}`)}
            </>
          )}

          {tabKey === 'transactionHistory' && (
            <>
              {renderDetailRow("Time", headerDateTime)}
              {renderDetailRow("Direction", dirLabel)}
              {renderDetailRow("Amount", transFormattedAmt)}
              {renderDetailRow("Symbol", item.symbol || "—")}
              {renderDetailRow("Description", item.description || "—")}
            </>
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </AppSafeAreaView>
  );
};

export default OptionHistoryCardDetailPage;
