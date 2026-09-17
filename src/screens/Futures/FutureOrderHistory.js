import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from "react-native";
import { AppSafeAreaView } from "../../shared";
import { useTheme } from "../../hooks/useTheme";
import FastImage from "react-native-fast-image";
import { BACK_ICON, folder, NO_NOTIFICATION_ICON, NO_NOTIFICATION_ICON_LIGHT } from "../../helper/ImageAssets";
import NavigationService from "../../navigation/NavigationService";
import { useAppSelector } from "../../store/hooks";
import { useDispatch } from "react-redux";
import { colors } from "../../theme/colors";
import { appOperation } from "../../appOperation";
import { setLoading } from "../../slices/authSlice";
import { showError } from "../../helper/logger";
import { setFutureOrders } from "../../slices/homeSlice";
import { toFixedFive } from "../../helper/utility";
import { formatLiqFee } from "../../helper/futuresUtils";
import { useRoute } from "@react-navigation/native";

const formatNumber = (value, digits = 5) => {
  if (value === null || value === undefined) return "--";
  if (typeof value === "string" && value.trim() === "") return "--";
  const num = Number(value);
  if (Number.isFinite(num)) {
    return digits > 0 ? num.toFixed(digits) : `${Math.round(num)}`;
  }
  return String(value);
};

const formatFilledAmount = (filled, total) => {
  if (filled === null || filled === undefined) {
    return formatNumber(total);
  }
  if (total === null || total === undefined) {
    return formatNumber(filled);
  }
  return `${formatNumber(filled)} / ${formatNumber(total)}`;
};

const formatDate = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : "--";
  }
  return date.toLocaleString("en-GB", { hour12: false });
};

const formatPair = (item) => {
  if (item?.symbol) return item.symbol;
  if (item?.pair) return item.pair;
  const base =
    item?.baseCurrency ??
    item?.base_currency ??
    item?.coin ??
    item?.instrument ??
    "";
  const quote =
    item?.marginAsset ??
    item?.quoteCurrency ??
    item?.quote_currency ??
    item?.settleAsset ??
    "";
  const combined = [base, quote].filter(Boolean).join("/");
  if (combined) return combined;
  if (item?.name) return item.name;
  return "--";
};

const getSideColor = (side, themeColors) => {
  if (!side) return themeColors.text;
  const normalized = side.toString().toLowerCase();
  if (normalized.includes("buy") || normalized.includes("long")) {
    return themeColors.green;
  }
  if (normalized.includes("sell") || normalized.includes("short")) {
    return themeColors.red;
  }
  return themeColors.text;
};

const getStatusColor = (status, themeColors) => {
  if (!status) return themeColors.text;
  const normalized = status.toString().toLowerCase();
  if (
    normalized.includes("filled") ||
    normalized.includes("success") ||
    normalized.includes("completed")
  ) {
    return themeColors.green;
  }
  if (
    normalized.includes("cancel") ||
    normalized.includes("reject") ||
    normalized.includes("fail")
  ) {
    return themeColors.red;
  }
  return themeColors.text;
};

const getItemKey = (item, index) =>
  item?._id ??
  item?.id ??
  item?.orderId ??
  item?.order_id ??
  item?.position_id ??
  `${index}`;

const renderOpenOrderCard = (order, onCancel, selectedCoin, themeColors, styles) => {
  const pricePrecision = (data) => {
    if (typeof (data) === "number") {
      return parseFloat(data?.toFixed(selectedCoin?.price_precision));
    } else {
      return data;
    }
  };
  const side = order.side;
  const type = order.type;

  const quantity = order.quantity;
  const filled = order.filledQty ?? 0;
  const price = order.price;

  const avgPrice = order.avgFillPrice || "---";

  const reduceOnly = order.reduceOnly ? "Yes" : "No";
  const postOnly = order.postOnly ? "Yes" : "No";

  // Trigger Condition Logic (same as website)
  let triggerCondition = "---";
  if (order.isSL && order.positionSide) {
    triggerCondition =
      order.positionSide === "LONG"
        ? `<= ${pricePrecision(order.price)}`
        : `>= ${pricePrecision(order.price)}`;
  } else if (order.isTP && order.positionSide) {
    triggerCondition =
      order.positionSide === "LONG"
        ? `>= ${pricePrecision(order.price)}`
        : `<= ${pricePrecision(order.price)}`;
  }

  // TP/SL
  const tpSl =
    order.isTP
      ? pricePrecision(order.takeProfitPnl)
      : order.isSL
        ? pricePrecision(order.stopLossPnl)
        : "---";

  const tif = order.timeInForce || "GTC";
  const orderId = order.orderId;
  const time = order.createdAt;

  return (
    <>
      {/* Header */}
      <View style={styles.orderHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.symbolText}>{order.symbol}</Text>
          <View style={styles.perpBadge}>
            <Text style={styles.perpText}>Perp</Text>
          </View>
        </View>
        <Text style={styles.timeText}>{formatDate(time)}</Text>
      </View>

      {/* Type + Side */}
      <View style={styles.typeRow}>
        <Text style={[styles.typeText, { color: getSideColor(side, themeColors) }]}>
          {`${type} / ${side}`}
        </Text>
      </View>

      {/* Data Rows — website fields */}
      <View style={styles.infoRow}>
        <View style={styles.labels}>
          <Text style={styles.label}>Price</Text>
          <Text style={styles.label}>Average</Text>
          <Text style={styles.label}>Amount</Text>
          <Text style={styles.label}>Filled</Text>
          <Text style={styles.label}>Reduce Only</Text>
          <Text style={styles.label}>Post Only</Text>
          <Text style={styles.label}>Trigger</Text>
          <Text style={styles.label}>TP/SL</Text>
          <Text style={styles.label}>TIF</Text>
        </View>

        <View style={styles.values}>
          <Text style={styles.value}>
            {order.isTP || order.isSL ? "---" : pricePrecision(price)}
          </Text>

          <Text style={styles.value}>{avgPrice}</Text>

          <Text style={styles.value}>
            {quantity} {order.baseCurrency}
          </Text>

          <Text style={styles.value}>
            {filled} {order.baseCurrency}
          </Text>

          <Text style={styles.value}>{reduceOnly}</Text>

          <Text style={styles.value}>{postOnly}</Text>

          <Text style={styles.value}>{triggerCondition}</Text>

          <Text
            style={[
              styles.value,
              {
                color: order.isTP
                  ? themeColors.green
                  : order.isSL
                    ? themeColors.red
                    : themeColors.text,
              },
            ]}
          >
            {tpSl}
          </Text>

          <Text style={styles.value}>{tif}</Text>
        </View>
      </View>

      {/* Cancel Button */}
      {onCancel && orderId && (
        <View
          style={{
            marginTop: 12,
            flexDirection: "row",
            justifyContent: "flex-end",
          }}
        >
          <TouchableOpacity
            style={{
              backgroundColor: themeColors.red + "20",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: themeColors.red,
            }}
            onPress={() => onCancel(orderId)}
          >
            <Text
              style={{
                color: themeColors.red,
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};


const renderOrderHistoryCard = (order, themeColors, styles) => {
  // WEBSITE EXACT FIELD MAPPING
  const createdAt = order?.createdAt
    ? new Date(order.createdAt)
    : null;

  const time = createdAt
    ? `${createdAt.toLocaleDateString()} ${createdAt.toLocaleTimeString()}`
    : "--";

  const symbol = order?.symbol || "--";

  const type = order?.type || "--";

  const side =
    order?.side === "LONG"
      ? "Buy"
      : order?.side === "SHORT"
        ? "Sell"
        : order?.side || "--";

  const price = order?.price ? toFixedFive(order.price) : "---";

  const avgPrice = order?.avgFillPrice
    ? toFixedFive(order.avgFillPrice)
    : "-";

  const amount = order?.quantity
    ? `${toFixedFive(order.quantity)} ${order?.baseCurrency || ""}`
    : "--";

  const filled = order?.filledQty
    ? `${toFixedFive(order.filledQty)} ${order?.baseCurrency || ""}`
    : "--";

  const reduceOnly = order?.reduceOnly ? "Yes" : "No";

  const tp_sl =
    order?.isTP ? "TP" : order?.isSL ? "SL" : "--";

  const status = order?.status || "--";

  const description = order?.error || "---";

  return (
    <>
      {/* HEADER */}
      <View style={styles.orderHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.symbolText}>{symbol}</Text>

          <View style={styles.perpBadge}>
            <Text style={styles.perpText}>Perp</Text>
          </View>
        </View>

        <Text style={styles.timeText}>{time}</Text>
      </View>

      {/* TYPE / SIDE */}
      <View style={styles.typeRow}>
        <Text
          style={[
            styles.typeText,
            { color: getSideColor(side === "Buy" ? "buy" : "sell", themeColors) },
          ]}
        >
          {`${type} / ${side}`}
        </Text>
      </View>

      {/* VALUES */}
      <View style={styles.infoRow}>
        <View style={styles.labels}>
          <Text style={styles.label}>Amount</Text>
          <Text style={styles.label}>Filled</Text>
          <Text style={styles.label}>Price</Text>
          <Text style={styles.label}>Average</Text>
          <Text style={styles.label}>Reduce Only</Text>
          <Text style={styles.label}>TP/SL</Text>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.label}>Description</Text>
        </View>

        <View style={styles.values}>
          <Text style={styles.value}>{amount}</Text>
          <Text style={styles.value}>{filled}</Text>
          <Text style={styles.value}>{price}</Text>
          <Text style={styles.value}>{avgPrice}</Text>
          <Text style={styles.value}>{reduceOnly}</Text>
          <Text style={styles.value}>{tp_sl}</Text>
          <Text
            style={[
              styles.value,
              { color: getStatusColor(status, themeColors) },
            ]}
          >
            {status}
          </Text>
          <Text style={[styles.value, { color: "#FFD700" }]}>
            {description}
          </Text>
        </View>
      </View>
    </>
  );
};


const renderPositionCard = (pos, themeColors, styles) => {
  const side = pos?.side;
  const leverage = pos?.leverage;
  const size =
    side === "LONG"
      ? toFixedFive(pos.totalLongQty)
      : toFixedFive(pos.totalShortQty);

  const entryPrice = pos?.entryPrice;
  const exitPrice = pos?.exit_price;
  const pnl = pos?.realizedPnl;

  const openTime = pos?.createdAt;
  const closeTime = pos?.updatedAt;

  const isLiquidated = pos?.liquidated ? "YES" : "NO";

  return (
    <>
      {/* Header */}
      <View style={styles.orderHeader}>
        <View style={styles.headerLeft}>
          <Text style={[styles.symbolText, { color: getSideColor(side, themeColors) }]}>
            {pos.symbol}
          </Text>
          <View style={styles.perpBadge}>
            <Text style={styles.perpText}>Perp</Text>
          </View>
          <Text style={styles.perpText}>{side}</Text>
          <Text style={styles.perpText}>{leverage}x</Text>
        </View>
      </View>

      {/* Info Rows */}
      <View style={styles.infoRow}>
        <View style={styles.labels}>
          <Text style={styles.label}>Size</Text>
          <Text style={styles.label}>Entry Price</Text>
          <Text style={styles.label}>Exit Price</Text>
          <Text style={styles.label}>PNL</Text>
          <Text style={styles.label}>Liq. Fee</Text>
          <Text style={styles.label}>Open</Text>
          <Text style={styles.label}>Closed</Text>
          <Text style={styles.label}>Liquidated?</Text>
        </View>

        <View style={styles.values}>
          <Text style={styles.value}>{size} {pos.baseCurrency}</Text>
          <Text style={styles.value}>{toFixedFive(entryPrice)}</Text>
          <Text style={styles.value}>{toFixedFive(exitPrice)}</Text>

          <Text
            style={[
              styles.value,
              { color: pnl >= 0 ? themeColors.green : themeColors.red },
            ]}
          >
            {toFixedFive(pnl)}
          </Text>

          <Text style={styles.value}>{formatLiqFee(pos, pos.quoteCurrency || "USDT")?.display || "—"}</Text>

          <Text style={styles.value}>
            {formatDate(openTime)}
          </Text>

          <Text style={styles.value}>
            {formatDate(closeTime)}
          </Text>

          <Text style={styles.value}>{isLiquidated}</Text>
        </View>
      </View>
    </>
  );
};


const renderTradeCard = (trade, themeColors, styles) => {
  // EXACT WEBSITE DATA MAPPING
  const createdAt = trade?.createdAt;
  const dateObj = createdAt ? new Date(createdAt) : null;

  const timeValue = dateObj
    ? `${dateObj.toISOString().split("T")[0]} ${dateObj
      .toTimeString()
      .split(" ")[0]}`
    : "--";

  const symbol = trade?.symbol || "--";

  const type = trade?.role === "TAKER" ? "Market" : "Limit";

  const side =
    trade?.side === "LONG"
      ? "BUY"
      : trade?.side === "SHORT"
        ? "SELL"
        : trade?.side;

  const price = trade?.price ?? "--";
  const quantity = trade?.quantity ?? "--";
  const fee = trade?.fee ?? "--";

  return (
    <>
      {/* HEADER */}
      <View style={styles.orderHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.symbolText}>{symbol}</Text>

          <View style={styles.perpBadge}>
            <Text style={styles.perpText}>Perp</Text>
          </View>
        </View>

        <Text style={styles.timeText}>{timeValue}</Text>
      </View>

      {/* TYPE / SIDE */}
      <View style={styles.typeRow}>
        <Text
          style={[
            styles.typeText,
            { color: getSideColor(side === "BUY" ? "buy" : "sell", themeColors) },
          ]}
        >
          {`${type} / ${side}`}
        </Text>
      </View>

      {/* VALUES */}
      <View style={styles.infoRow}>
        <View style={styles.labels}>
          <Text style={styles.label}>Amount</Text>
          <Text style={styles.label}>Price</Text>
          <Text style={styles.label}>Fee</Text>
        </View>

        <View style={styles.values}>
          <Text style={styles.value}>{toFixedFive(quantity)}</Text>
          <Text style={styles.value}>{toFixedFive(price)}</Text>
          <Text style={styles.value}>{toFixedFive(fee)}</Text>
        </View>
      </View>
    </>
  );
};


export default function FutureOrderHistory() {
  const { colors: themeColors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const { selectedCoin } = useRoute().params;
  const dispatch = useDispatch();
  const { futureOrders, futurePositions } = useAppSelector(
    (state) => state.home
  );
  const [activeTab, setActiveTab] = useState(0);
  const [openOrders, setOpenOrders] = useState(futureOrders?.openOrders ?? []);

  // Update local state when Redux state changes
  useEffect(() => {
    setOpenOrders(futureOrders?.openOrders ?? []);
  }, [futureOrders?.openOrders]);

  const orderHistory = futureOrders?.ordersHistory ?? [];
  const positionHistory =
    (futureOrders?.closePositions?.length
      ? futureOrders?.closePositions
      : futurePositions) ?? [];
  const tradeHistory = futureOrders?.tradeHistory ?? [];

  const cancelFutureOrder = async (orderId) => {
    try {
      dispatch(setLoading(true));
      if (!orderId) {
        showError("Invalid order id");
        return;
      }

      // ====== API call ======
      const result = await appOperation.customer?.cancelFutureOrder({ orderId: orderId });

      if (!result?.success) {
        showError(result?.message || "Failed to cancel order.");
        return;
      }

      showError("Order cancelled successfully");
      // Remove cancelled order from local state
      const updatedOrders = openOrders.filter((order) => {
        const id = order?.orderId;
        return id !== orderId;
      });
      setOpenOrders(updatedOrders);

      // Update Redux store
      dispatch(
        setFutureOrders({
          openOrders: updatedOrders,
          ordersHistory: futureOrders?.ordersHistory || [],
          closePositions: futureOrders?.closePositions || [],
          tradeHistory: futureOrders?.tradeHistory || [],
        })
      );
    } catch (err) {
      showError(err?.message || "Something went wrong while cancelling the order.");
    } finally {
      dispatch(setLoading(false));
    }
  };

  const tabs = [
    { id: "openOrders", title: `Open Orders (${openOrders.length})` },
    { id: "orderHistory", title: `Order History (${orderHistory.length})` },
    {
      id: "positionHistory",
      title: `Position History (${positionHistory.length})`,
    },
    { id: "tradeHistory", title: `Trade History (${tradeHistory.length})` },
  ];

  const datasets = [openOrders, orderHistory, positionHistory, tradeHistory];
  const renderers = [
    (item) => renderOpenOrderCard(item, cancelFutureOrder, selectedCoin, themeColors, styles),
    (item) => renderOrderHistoryCard(item, themeColors, styles),
    (item) => renderPositionCard(item, themeColors, styles),
    (item) => renderTradeCard(item, themeColors, styles),
  ];

  const activeData = datasets[activeTab] ?? [];
  const renderItem = renderers[activeTab] ?? (() => null);
  const emptyMessages = [
    "No open orders found",
    "No order history found",
    "No positions found",
    "No trade history found",
  ];

  return (
    <AppSafeAreaView style={styles.container}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        translucent={false}
        backgroundColor={themeColors.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => NavigationService.goBack()}
        >
          <FastImage
            source={BACK_ICON}
            style={{ width: 22, height: 22 }}
            tintColor={themeColors.text}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order History</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs row */}
      <View style={{ flexShrink: 0 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {tabs.map((tab, index) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabItem, activeTab === index && styles.tabItemActive]}
              onPress={() => setActiveTab(index)}
            >
              <Text
                style={[
                  styles.tabTextInactive,
                  activeTab === index && styles.tabTextActive,
                ]}
              >
                {tab.title}
              </Text>
              {/* <View style={[activeTab === index && styles.underline]} /> */}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.separator} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.listContainer,
          activeData.length === 0 && { flexGrow: 0 }
        ]}
      >
        {activeData.length === 0 ? (
          <View style={styles.emptyState}>
            <FastImage
              source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT}
              resizeMode="contain"
              style={{ width: 80, height: 80, marginTop: 50 }}
            />
            {/* <Text style={styles.emptyText}>{emptyMessages[activeTab]}</Text> */}
          </View>
        ) : (
          activeData.map((item, index) => (
            <View key={getItemKey(item, index)} style={styles.orderCard}>
              {renderItem(item)}
            </View>
          ))
        )}
        {activeData.length > 0 && <View style={{ height: 32 }} />}
      </ScrollView>
    </AppSafeAreaView>
  );
}

const createStyles = (themeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: themeColors.background,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    color: themeColors.text,
    fontWeight: "700",
  },
  tabsRow: {
    paddingHorizontal: 14,
    backgroundColor: themeColors.background,
    flexDirection: "row",
    alignItems: "center",
  },
  tabItem: {
    paddingVertical: 12,
    marginRight: 12,
  },
  tabItemActive: {
    paddingVertical: 12,
    marginRight: 12,
  },
  tabTextActive: {
    color: colors.buttonBg,
    fontWeight: "700",
    fontSize: 16,
  },
  tabTextInactive: {
    color: themeColors.secondaryText,
    fontSize: 15,
  },
  underline: {
    height: 3,
    backgroundColor: colors.buttonDarkBg,
    width: "100%",
    marginTop: 6,
    borderRadius: 2,
  },
  separator: {
    height: 1,
    backgroundColor: themeColors.border,
    marginTop: 6,
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 16,
  },
  orderCard: {
    backgroundColor: themeColors.themeElevationColor,
    borderRadius: 6,
    padding: 14,
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: themeColors.border,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  symbolText: {
    color: themeColors.text,
    fontSize: 18,
    fontWeight: "700",
    marginRight: 8,
  },
  perpBadge: {
    backgroundColor: themeColors.themeSelection,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  perpText: {
    color: themeColors.secondaryText,
    fontSize: 11,
  },
  timeText: {
    color: themeColors.secondaryText,
    fontSize: 13,
  },
  typeRow: {
    marginVertical: 6,
  },
  typeText: {
    fontSize: 15,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 6,
    gap: 16,
  },
  labels: {
    flex: 1,
  },
  values: {
    alignItems: "flex-end",
    minWidth: 140,
  },
  label: {
    color: themeColors.secondaryText,
    fontSize: 14,
    marginBottom: 10,
  },
  value: {
    color: themeColors.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  emptyState: {
    // flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  emptyText: {
    color: themeColors.secondaryText,
    fontSize: 15,
  },
});
