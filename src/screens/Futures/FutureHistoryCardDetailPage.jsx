import { AppSafeAreaView } from '../../shared';
import React from 'react';
import { View, ScrollView, TouchableOpacity, Platform, Alert, ToastAndroid } from 'react-native';
import FastImage from 'react-native-fast-image';
import moment from 'moment';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useTheme } from '../../hooks/useTheme';
import { AppText, FOURTEEN, THIRTEEN, TWELVE, SIXTEEN } from '../../common';
import { BOLD, MEDIUM, SEMI_BOLD, fontFamilyMedium, fontFamilySemiBold } from '../../theme/typography';
import { colors } from '../../theme/colors';
import { computeClosedPosition, computePosition, formatLiqFee, formatFuturesTs, pickOpenedTs, pickClosedTs, getFuturesHistoryDetail, fmtFuturesQty, fmtFuturesPrice, fmtFuturesUsdt, fmtFuturesPct } from '../../helper/futuresUtils';
import { back_ic } from '../../helper/ImageAssets';
import { appOperation } from '../../appOperation';
import FuturesCancelModal from './components/FuturesCancelModal';

const FutureHistoryCardDetailPage = () => {
  const { colors: themeColors, isDark } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const stored = getFuturesHistoryDetail() || {};
  const routeParams = route.params || {};
  const pos = stored.pos ?? routeParams.pos;
  const selectedCoin = stored.selectedCoin ?? routeParams.selectedCoin;
  const title = stored.title ?? routeParams.title;
  const liqFeeDisplay = stored.liqFeeDisplay ?? routeParams.liqFeeDisplay;
  const closedTimeDisplay = stored.closedTimeDisplay ?? routeParams.closedTimeDisplay;
  const openedTimeDisplay = stored.openedTimeDisplay ?? routeParams.openedTimeDisplay;
  const markPrice = stored.markPrice ?? routeParams.markPrice;

  if (!pos) {
    return (
      <View style={{ flex: 1, backgroundColor: themeColors.background, alignItems: 'center', justifyContent: 'center' }}>
        <AppText type={FOURTEEN} style={{ color: themeColors.text }}>No Data Available</AppText>
      </View>
    );
  }

  const isOrderTab = title === 'Order History' || title === 'Open Orders';
  const isOpenPosition = title === 'Positions' || String(pos.status ?? "").toUpperCase() === "OPEN";

  const closed = computeClosedPosition(pos);
  const openLive = computePosition(pos, markPrice, selectedCoin);
  const { entry, exit, qty, pnl, fees, funding, reason } = isOpenPosition && !isOrderTab
    ? { entry: openLive.entry, exit: openLive.mark, qty: openLive.qty, pnl: openLive.pnl, fees: 0, funding: 0, reason: pos.status || "OPEN" }
    : closed;
  const safePnl = Number.isFinite(Number(pnl)) ? Number(pnl) : 0;
  const safeFunding = Number.isFinite(Number(funding)) ? Number(funding) : 0;
  const safeFees = Number.isFinite(Number(fees)) ? Number(fees) : 0;
  const safeQty = Number.isFinite(Number(qty)) ? Number(qty) : 0;
  const safeEntry = Number.isFinite(Number(entry)) ? Number(entry) : 0;
  const safeExit = Number.isFinite(Number(exit)) ? Number(exit) : 0;
  const isLong = String(pos.side ?? "").toUpperCase() === "LONG" || String(pos.side ?? "").toUpperCase() === "BUY";
  const pnlColor = safePnl >= 0 ? colors.green : colors.red;
  const fundingColor = safeFunding >= 0 ? colors.green : colors.red;
  const baseAsset = selectedCoin?.base_currency || (pos.symbol ? String(pos.symbol).replace(/USDT.*/i, "") : "BTC");

  const getStatusColor = (statusText) => {
    if (!statusText) return themeColors.text;
    const normalized = statusText.toString().toLowerCase();
    if (normalized.includes("filled") || normalized.includes("success") || normalized.includes("completed")) {
      return colors.green;
    }
    if (normalized.includes("cancel") || normalized.includes("reject") || normalized.includes("fail")) {
      return colors.red;
    }
    if (normalized.includes("pending")) {
      return colors.orange || "#FFA500";
    }
    return themeColors.text;
  };

  const closedDateFormatted = closedTimeDisplay || formatFuturesTs(pickClosedTs(pos));
  const openedDateFormatted = openedTimeDisplay || formatFuturesTs(pickOpenedTs(pos));
  const liqFeeText = liqFeeDisplay || formatLiqFee(pos, "USDT")?.display || "—";

  const renderDetailRow = (label, value, valueColor = themeColors.text, valueFont = fontFamilyMedium) => (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, gap: 12 }}>
      <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>{label}</AppText>
      <AppText type={FOURTEEN} style={{ color: valueColor, fontFamily: valueFont, flexShrink: 1, textAlign: "right" }}>{value}</AppText>
    </View>
  );

  const [cancelModalVisible, setCancelModalVisible] = React.useState(false);
  const [cancelLoading, setCancelLoading] = React.useState(false);

  const handleCancelOrder = () => {
    setCancelModalVisible(true);
  };

  const executeCancelOrder = async () => {
    setCancelLoading(true);
    try {
      const result = await appOperation.customer?.cancelFutureOrder({ orderId: pos._id || pos.id });
      if (result?.success) {
        ToastAndroid.show(result?.message || 'Order Cancelled', ToastAndroid.SHORT);
        setCancelModalVisible(false);
        navigation.goBack();
      } else {
        ToastAndroid.show(result?.message || 'Failed to cancel', ToastAndroid.SHORT);
      }
    } catch (e) {
      console.warn("Cancel error", e);
      ToastAndroid.show('Something went wrong', ToastAndroid.SHORT);
    } finally {
      setCancelLoading(false);
    }
  };

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
              {pos.symbol || "—"}
            </AppText>
          </View>
          {isOrderTab ? (
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilyMedium }}>
              <AppText type={FOURTEEN} style={{ color: String(pos.side ?? "").toUpperCase() === "BUY" ? colors.green : colors.red, fontFamily: fontFamilySemiBold }}>
                {String(pos.side ?? "").toUpperCase() === "BUY" ? "BUY" : "SELL"}
              </AppText>
              {" · "}{String(pos.order_type ?? pos.type ?? "").toUpperCase() === "MARKET" ? "Market" : "Limit"}{" · "}{pos.leverage || 1}x
            </AppText>
          ) : (
            <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilyMedium }}>
              {isLong ? "LONG" : "SHORT"} · {pos.leverage}x · {String(pos.margin_type ?? "ISOLATED").toUpperCase()}
            </AppText>
          )}
        </View>

        <View style={{ gap: 4 }}>
          {isOrderTab ? (
            <>
              {renderDetailRow("Price", String(pos.order_type ?? pos.type ?? "").toUpperCase() === "MARKET" ? "Market" : fmtFuturesPrice(pos.order_price ?? pos.price))}
              {renderDetailRow("Avg Fill", fmtFuturesPrice(pos.average_execution_price ?? pos.avg_price))}
              {renderDetailRow("Date", moment(pos.created_at || pos.createdAt).format("YYYY-MM-DD"))}
              {renderDetailRow("Time", moment(pos.created_at || pos.createdAt).format("HH:mm:ss"))}
              {renderDetailRow("Qty / Filled", `${fmtFuturesQty(pos.quantity, "0")} / ${fmtFuturesQty(pos.filled_quantity ?? pos.executed_quantity ?? pos.filledQty ?? 0, "0")} ${selectedCoin?.base_currency || "USDT"}`)}
              {renderDetailRow("TIF", pos.time_in_force || pos.timeInForce || "GTC")}
              {renderDetailRow("Reduce Only", pos.reduce_only || pos.reduceOnly ? "Yes" : "No")}
              {title === 'Order History' && renderDetailRow("Fee", fmtFuturesUsdt(pos.total_fees_paid ?? 0))}
              {renderDetailRow("Status", String(pos.status || "OPEN").toUpperCase(), getStatusColor(pos.status || "OPEN"))}
              {title === 'Open Orders' && (
                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, alignItems: 'center' }}>
                  <AppText type={FOURTEEN} style={{ color: isDark ? "#8E8E93" : "#666666", fontFamily: fontFamilySemiBold }}>Action</AppText>
                  <TouchableOpacity onPress={handleCancelOrder} style={{ paddingHorizontal: 16, paddingVertical: 6, backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "#333333", borderRadius: 16 }}>
                    <AppText type={FOURTEEN} style={{ color: isDark ? colors.white : colors.white, fontFamily: fontFamilyMedium }}>Cancel</AppText>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : isOpenPosition ? (
            <>
              {renderDetailRow("Size", `${fmtFuturesQty(openLive.qty)} ${baseAsset}`)}
              {renderDetailRow("Entry Price", fmtFuturesPrice(openLive.entry))}
              {renderDetailRow("Mark Price", fmtFuturesPrice(openLive.mark))}
              {renderDetailRow("Liq. Price", fmtFuturesPrice(pos.liquidation_price))}
              {renderDetailRow("Margin Ratio", Number(openLive.marginRatio) > 0 ? fmtFuturesPct(openLive.marginRatio) : "—")}
              {renderDetailRow("Margin", fmtFuturesUsdt(openLive.margin))}
              {renderDetailRow("PNL (ROE%)", `${fmtFuturesUsdt(openLive.pnl, { signed: true })} (${fmtFuturesPct(openLive.roe, { signed: true })})`, openLive.pnl >= 0 ? colors.green : colors.red)}
              {renderDetailRow("Opened Time", openedTimeDisplay || formatFuturesTs(pickOpenedTs(pos)))}
              {renderDetailRow("Status", String(pos.status || "OPEN").toUpperCase(), getStatusColor(pos.status || "OPEN"))}
            </>
          ) : (
            <>
              {renderDetailRow("Closed Time", closedDateFormatted)}
              {renderDetailRow("Opened Time", openedDateFormatted)}
              {renderDetailRow("Size", `${fmtFuturesQty(safeQty)} ${baseAsset}`)}
              {renderDetailRow("Entry Price", fmtFuturesPrice(safeEntry))}
              {renderDetailRow("Exit Price", fmtFuturesPrice(safeExit))}
              {renderDetailRow("Realized PNL", fmtFuturesUsdt(safePnl, { signed: true }), pnlColor)}
              {renderDetailRow("Liq. Fee", liqFeeText)}
              {renderDetailRow("Funding", fmtFuturesUsdt(safeFunding, { signed: true }), fundingColor)}
              {renderDetailRow("Fee", fmtFuturesUsdt(safeFees))}
              {pos.close_reason || pos.status ? renderDetailRow("Status", reason || pos.status, getStatusColor(reason || pos.status)) : null}
            </>
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      <FuturesCancelModal
        visible={cancelModalVisible}
        isDark={isDark}
        themeColors={themeColors}
        loading={cancelLoading}
        onClose={() => setCancelModalVisible(false)}
        onConfirm={executeCancelOrder}
      />
    </AppSafeAreaView>
  );
};

export default FutureHistoryCardDetailPage;
