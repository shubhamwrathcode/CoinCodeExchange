import React, { useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useDispatch } from "react-redux";
import { AppText, MEDIUM, BOLD, FOURTEEN, FIFTEEN } from "../../shared";
import { colors } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";
import FastImage from "react-native-fast-image";
import { back_ic, right_ic } from "../../helper/ImageAssets";
import NavigationService from "../../navigation/NavigationService";
import moment from "moment";
import { toFixedEight, spotOpenOrderMarketLabel } from "../../helper/utility";
import { fontFamilyBold, fontFamilySemiBold } from "../../theme/typography";
import { cancelOrder } from "../../actions/homeActions";
import { AppSafeAreaView } from "../../common/AppSafeAreaView";

const SpotOrderHistoryDetail = () => {
  const route = useRoute();
  const dispatch = useDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const order = route?.params?.order ?? route?.params?.item ?? {};

  const pair = spotOpenOrderMarketLabel(order);
  const quoteCurrency =
    order?.pay_currency ||
    order?.quote_currency ||
    order?.quote_currency_short_name ||
    order?.quote_asset ||
    (typeof pair === "string" && pair.includes("/") ? pair.split("/")[1]?.trim() : "") ||
    "";

  const isMargin = route?.params?.isMargin === true;

  const parseNum = (val) => {
    if (val && val.$numberDecimal != null) return parseFloat(val.$numberDecimal);
    return parseFloat(val);
  };

  const price = parseNum(order?.price) || 0;
  const qty = parseNum(order?.quantity) || 0;
  const filled = parseNum(order?.filled_quantity ?? order?.filled) || 0;
  const remaining = parseNum(order?.remaining_quantity ?? order?.remaining) || 0;
  const avgPrice = parseNum(order?.avg_execution_price ?? order?.avgPrice ?? order?.average_price) || price;
  const value = parseNum(order?.executed_value ?? order?.executedValue) || (avgPrice * filled);
  const fee = parseNum(order?.total_fee ?? order?.fee) || 0;
  const tds = parseNum(order?.total_tds ?? order?.tds) || 0;
  const rawStatus = String(order?.status || order?.user_status || order?.order_status || order?.orderStatus || order?.state || "").toUpperCase().trim();
  let statusLabel = rawStatus || "---";
  let statusColor = themeColors?.text ?? "#fff";

  if (["FILLED", "COMPLETE", "COMPLETED", "EXECUTED"].includes(rawStatus)) {
    statusLabel = "EXECUTED";
    statusColor = "#00c087";
  } else if (["CANCELLED", "CANCELED"].includes(rawStatus)) {
    statusLabel = "Cancelled";
    statusColor = "#ff4b5c";
  } else if (rawStatus === "REJECTED") {
    statusLabel = "Rejected";
    statusColor = "#ff4b5c";
  } else if (rawStatus === "EXPIRED") {
    statusLabel = "Expired";
    statusColor = "#ff4b5c";
  } else if (["OPEN", "PENDING"].includes(rawStatus)) {
    statusLabel = "Open";
    statusColor = "#f3ba2f";
  } else if (["PARTIAL", "PARTIALLY_FILLED", "PARTIAL_FILLED"].includes(rawStatus)) {
    statusLabel = "Partial";
    statusColor = "#f3ba2f";
  }

  const side = String(order?.side || "").toUpperCase();
  const type = String(order?.order_type || order?.type || "LIMIT").toUpperCase();
  const role = order?.is_maker === true ? "Maker" : order?.is_maker === false ? "Taker" : "—";

  const isTradeFill =
    (order?.trade_id != null || order?.executed_at != null || order?.executedAt != null) &&
    (order?.order_type == null && order?.type == null) &&
    (order?.status == null && order?.user_status == null);

  const d = isTradeFill
    ? (order?.executed_at || order?.executedAt || order?.created_at || order?.createdAt)
    : (order?.updatedAt || order?.updated_at || order?.createdAt || order?.created_at);
  const dateStr = d ? moment(d).format("DD/MM/YYYY") : "---";
  const timeStr = d ? moment(d).format("HH:mm:ss") : "---";

  const getSideColor = (s) => (s === "BUY" ? themeColors.green : themeColors.red);

  const orderIdForCancel = order?._id || order?.id;
  const statusUpperCancel = String(order?.status || order?.user_status || "").toUpperCase();
  const canCancel =
    !isTradeFill &&
    !!orderIdForCancel &&
    !["FILLED", "CANCELLED", "CANCELED", "COMPLETED", "EXECUTED", "REJECTED"].includes(statusUpperCancel);

  const [cancelLoading, setCancelLoading] = useState(false);

  const rawTif = order?.time_in_force ?? order?.tif ?? order?.timeInForce;
  const tifDisplay =
    rawTif != null && String(rawTif).trim() !== "" ? String(rawTif).trim().toUpperCase() : "—";

  const textColor = themeColors.text;

  const Row = ({ label, value, valueColor }) => (
    <View style={styles.row}>
      <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.label, { color: isDark ? "#8E8E93" : "#666666" }]}>{label}</AppText>
      <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.value, { color: valueColor || textColor }]} numberOfLines={3}>{value}</AppText>
    </View>
  );

  return (
    <AppSafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header Bar */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={() => NavigationService.goBack()} style={styles.headerBtn}>
          <FastImage source={back_ic} style={styles.backIcon} resizeMode="contain" tintColor={themeColors.text} />
        </TouchableOpacity>
        <AppText style={[styles.headerTitle, { color: themeColors.text }]}>
          {isTradeFill ? "Trade Details" : "Order Details"}
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Summary Header */}
        <View style={styles.topSection}>
          <View style={styles.pairHeaderRow}>
            <AppText type={FIFTEEN} weight={BOLD} style={{ color: textColor }}>{pair}</AppText>
          </View>
          <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: isDark ? "#8E8E93" : "#666666", marginTop: 4 }}>{dateStr} {timeStr}</AppText>
          <AppText style={{ color: getSideColor(side), marginTop: 4 }} weight={BOLD} type={FOURTEEN}>
            {side} · {isTradeFill ? role : type}
          </AppText>
        </View>

        {/* List of Details (Matches Screenshot) */}
        <View style={styles.listSection}>
          {isMargin ? (
            <>
              <Row label="Creation Time" value={`${dateStr} ${timeStr}`} />
              <Row label="Fill Price" value={order?.avg_execution_price ? `${toFixedEight(avgPrice)} ${quoteCurrency}` : "—"} />
              <Row label="Price" value={type === "MARKET" ? "Smart Market" : `${toFixedEight(price)} ${quoteCurrency}`} />
              <Row label="Filled/Amount" value={`${toFixedEight(filled)}/${toFixedEight(qty)} · ${qty > 0 ? ((filled / qty) * 100).toFixed(2) : "0.00"}%`} />
              <Row label="Status" value={statusLabel.toUpperCase()} valueColor={statusColor} />
            </>
          ) : (
            <>
              <Row label="Date" value={dateStr} />
              <Row label="Time" value={timeStr} />
              <Row label="Market" value={pair} />
              <Row label="Side" value={side} valueColor={getSideColor(side)} />
              {isTradeFill ? (
                <>
                  <Row label="Role" value={role} />
                  <Row label="Price" value={toFixedEight(price)} />
                  <Row label="Quantity" value={toFixedEight(qty)} />
                  <Row label="Fee" value={`${toFixedEight(fee)} ${quoteCurrency}`.trim()} />
                  <Row label="TDS" value={toFixedEight(tds)} />
                  <Row label="Total" value={toFixedEight(price * qty)} />
                  {order?.trade_id != null ? <Row label="Trade ID" value={String(order.trade_id)} /> : null}
                  {order?.order_id != null ? <Row label="Order ID" value={String(order.order_id)} /> : null}
                </>
              ) : (
                <>
                  <Row label="Type" value={type} />
                  <Row label="TIF" value={tifDisplay} />
                  <Row label="Price" value={type === "MARKET" ? "Market" : toFixedEight(price)} />
                  <Row label="Avg" value={toFixedEight(avgPrice)} />
                  <Row label="Quantity" value={toFixedEight(qty)} />
                  <Row label="Filled" value={toFixedEight(filled)} />
                  <Row label="Remaining" value={toFixedEight(remaining)} />
                  <Row label="Fill %" value={order?.fill_percent || (qty > 0 ? `${Math.round((filled / qty) * 100)}%` : "0%")} />
                  <Row label="Value" value={toFixedEight(value)} />
                  <Row label="Fee" value={`${toFixedEight(fee)} ${quoteCurrency}`.trim()} />
                  <Row label="Status" value={statusLabel.toUpperCase()} valueColor={statusColor} />
                </>
              )}
            </>
          )}
        </View>

        {canCancel ? (
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={cancelLoading}
            onPress={async () => {
              const oid = order?._id || order?.id;
              if (!oid) return;
              setCancelLoading(true);
              try {
                const res = await dispatch(cancelOrder({ order_id: oid, tradeType: isMargin ? "margin" : undefined }));
                if (res?.success) {
                  NavigationService.goBack();
                }
              } finally {
                setCancelLoading(false);
              }
            }}
            style={styles.cancelOrderBtn}
          >
            {cancelLoading ? (
              <ActivityIndicator size="small" color={colors.red} />
            ) : (
              <AppText style={[styles.cancelOrderText, { color: colors.red }]} weight={MEDIUM}>
                Cancel order
              </AppText>
            )}
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: 8,
  },
  backIcon: {
    width: 18,
    height: 18,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fontFamilySemiBold,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  topSection: {
    marginBottom: 12,
  },
  pairHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  pairTitle: {
    fontSize: 18,
    marginRight: 6,
  },
  chevron: {
    width: 12,
    height: 12,
  },
  dateTime: {
    fontSize: 13,
    marginBottom: 2,
  },
  sideType: {
    fontSize: 14,
    marginTop: 2,
  },
  listSection: {
    marginTop: 4,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  label: {
    flex: 1,
  },
  value: {
    flex: 2,
    textAlign: "right",
  },
  cancelOrderBtn: {
    marginTop: 18,
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  cancelOrderText: {
    fontSize: 17,
    fontWeight: "600",
  },
});

export default SpotOrderHistoryDetail;
