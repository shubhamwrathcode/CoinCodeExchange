import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useContext } from "react";
import {
  
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput} from "react-native";
import FastImage from "react-native-fast-image";
import { BACK_ICON, folder } from "../../helper/ImageAssets";
import NavigationService from "../../navigation/NavigationService";
import { colors } from "../../theme/colors";
import { OptionsContext } from "./OptionsContext";
import { useDispatch } from "react-redux";
import { setLoading } from "../../slices/authSlice";
import { showError } from "../../helper/logger";
import { appOperation } from "../../appOperation";

const formatNumber = (value, digits = 5) => {
  if (value === null || value === undefined) return "--";
  if (typeof value === "string" && value.trim() === "") return "--";
  const num = Number(value);
  if (Number.isFinite(num)) {
    return digits > 0 ? num.toFixed(digits) : `${Math.round(num)}`;
  }
  return String(value);
};

const formatDate = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : "--";
  }
  return date.toLocaleString("en-GB", { hour12: false });
};

const getSideColor = (side) => {
  if (!side) return colors.white;
  const normalized = side.toString().toLowerCase();
  if (normalized.includes("buy") || normalized.includes("long")) {
    return colors.green;
  }
  if (normalized.includes("CALL") || normalized.includes("call")) {
    return colors.green;
  }
  if (normalized.includes("sell") || normalized.includes("short")) {
    return colors.red;
  }
  if (normalized.includes("PUT") || normalized.includes("put")) {
    return colors.red;
  }
  return colors.white;
};

const getStatusColor = (status, fallback = colors.white) => {
  if (!status) return fallback;
  const normalized = status.toString().toLowerCase();
  if (
    normalized.includes("filled") ||
    normalized.includes("success") ||
    normalized.includes("completed")
  ) {
    return colors.green;
  }
  if (
    normalized.includes("cancel") ||
    normalized.includes("reject") ||
    normalized.includes("fail")
  ) {
    return colors.red;
  }
  return fallback;
};

const getItemKey = (item, index) =>
  item?._id ??
  item?.id ??
  item?.orderId ??
  item?.order_id ??
  `${index}`;

const renderOrderHistoryCard = (order) => {
  const updatedAt = order?.updatedAt ? new Date(order.updatedAt) : null;
  const time = updatedAt
    ? `${updatedAt.toLocaleDateString()} ${updatedAt.toLocaleTimeString()}`
    : "--";

  const symbol = order?.symbol || "--";
  const side = order?.side || "--";
  const orderType = order?.type || "--";
  const quantity = order?.quantity ? formatNumber(order.quantity, 4) : "--";
  const filled = order?.filledQty ? formatNumber(order.filledQty, 4) : "--";
  const avgPrice = order?.avgFillPrice
    ? formatNumber(order.avgFillPrice, 2)
    : order?.price
    ? formatNumber(order.price, 2)
    : "---";
  const feePaid = order?.feePaid ? formatNumber(order.feePaid, 5) : "--";
  const totalValue = order?.price && order?.filledQty
    ? formatNumber(order.price * order.filledQty, 5)
    : "--";
  const totalCost = order?.price && order?.filledQty && order?.feePaid
    ? formatNumber(order.price * order.filledQty + order.feePaid, 5)
    : "--";
  const indexPrice = order?.spotPrice ? formatNumber(order.spotPrice, 2) : "--";
  const status = order?.status || "--";

  return (
    <>
      {/* Header */}
      <View style={styles.orderHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.symbolText}>{symbol}</Text>
          {/* <View style={styles.optionsBadge}>
            <Text style={styles.badgeText}>Options</Text>
          </View> */}
        </View>
        <Text style={styles.timeText}>{time}</Text>
      </View>

      {/* Type + Side */}
      <View style={styles.typeRow}>
        <Text style={[styles.typeText, { color: getSideColor(side) }]}>
          {side} / {orderType}
        </Text>
      </View>

      {/* Data Rows */}
      <View style={styles.infoRow}>
        <View style={styles.labels}>
          <Text style={styles.label}>Side</Text>
          <Text style={styles.label}>Order Type</Text>
          <Text style={styles.label}>Size (Cont)</Text>
          <Text style={styles.label}>Filled (Cont)</Text>
          <Text style={styles.label}>Avg. Price</Text>
          <Text style={styles.label}>Fee (USDT)</Text>
          <Text style={styles.label}>Total Value</Text>
          <Text style={styles.label}>Total Cost</Text>
          <Text style={styles.label}>Index Price</Text>
          <Text style={styles.label}>Status</Text>
        </View>

        <View style={styles.values}>
          <Text style={[styles.value, { color: getSideColor(side) }]}>
            {side}
          </Text>
          <Text style={styles.value}>{orderType}</Text>
          <Text style={styles.value}>{quantity}</Text>
          <Text style={styles.value}>{filled}</Text>
          <Text style={styles.value}>{avgPrice}</Text>
          <Text style={styles.value}>{feePaid}</Text>
          <Text style={styles.value}>{totalValue}</Text>
          <Text style={styles.value}>{totalCost}</Text>
          <Text style={styles.value}>{indexPrice}</Text>
          <Text
            style={[
              styles.value,
              { color: getStatusColor(status, colors.white) },
            ]}
          >
            {status}
          </Text>
        </View>
      </View>
    </>
  );
};

const renderExerciseHistoryCard = (exercise) => {
  const exercisedAt = exercise?.exercisedAt ? new Date(exercise.exercisedAt) : null;
  const time = exercisedAt
    ? `${exercisedAt.toLocaleDateString()} ${exercisedAt.toLocaleTimeString()}`
    : "--";

  const symbol = exercise?.symbol || "--";
  const side = exercise?.optionType || "--";
  const strikePrice = exercise?.strikePrice
    ? formatNumber(exercise.strikePrice, 2)
    : "---";
  const settlementPrice = exercise?.settlementPrice
    ? formatNumber(exercise.settlementPrice, 2)
    : "---";
  const amount = exercise?.amount ? formatNumber(exercise.amount, 4) : "--";
  const exerciseProfit = exercise?.exerciseProfit
    ? formatNumber(exercise.exerciseProfit, 2)
    : "--";
  const exerciseFee = exercise?.exerciseFee
    ? formatNumber(exercise.exerciseFee, 2)
    : "--";
  const netProfit = exercise?.netProfit
    ? formatNumber(exercise.netProfit, 2)
    : "--";

  const exerciseProfitNum = Number(exercise?.exerciseProfit || 0);
  const netProfitNum = Number(exercise?.netProfit || 0);

  return (
    <>
      {/* Header */}
      <View style={styles.orderHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.symbolText}>{symbol}</Text>
          {/* <View style={styles.optionsBadge}>
            <Text style={styles.badgeText}>Options</Text>
          </View> */}
        </View>
        <Text style={styles.timeText}>{time}</Text>
      </View>

      {/* Type + Side */}
      <View style={styles.typeRow}>
        <Text style={[styles.typeText, { color: getSideColor(side) }]}>
          {side}
        </Text>
      </View>

      {/* Data Rows */}
      <View style={styles.infoRow}>
        <View style={styles.labels}>
          {/* <Text style={styles.label}>Side</Text> */}
          <Text style={styles.label}>Strike</Text>
          <Text style={styles.label}>Settlement</Text>
          <Text style={styles.label}>Size</Text>
          <Text style={styles.label}>Exercise Profit</Text>
          <Text style={styles.label}>Fee</Text>
          <Text style={styles.label}>Net PnL</Text>
        </View>

        <View style={styles.values}>
          {/* <Text style={[styles.value, { color: getSideColor(side) }]}>
            {side}
          </Text> */}
          <Text style={styles.value}>{strikePrice}</Text>
          <Text style={styles.value}>{settlementPrice}</Text>
          <Text style={styles.value}>{amount}</Text>
          <Text
            style={[
              styles.value,
              {
                color:
                  exerciseProfitNum >= 0 ? colors.green : colors.red,
              },
            ]}
          >
            {formatNumber(exercise?.exerciseProfit, 2)}
          </Text>
          <Text style={styles.value}>{formatNumber(exercise?.exerciseFee, 2)}</Text>
          <Text
            style={[
              styles.value,
              {
                color: netProfitNum >= 0 ? colors.green : colors.red,
              },
            ]}
          >
            {formatNumber(exercise?.netProfit, 2)}
          </Text>
        </View>
      </View>
    </>
  );
};

const renderOpenOrderCard = (order, onCancel) => {
  const createdAt = order?.createdAt ? new Date(order.createdAt) : null;
  const time = createdAt
    ? `${createdAt.toLocaleDateString()} ${createdAt.toLocaleTimeString()}`
    : "--";

  const symbol = order?.symbol || "--";
  const side = order?.side || "--";
  const orderId = order?.orderId || order?._id || order?.id;
  const price = order?.price ? formatNumber(order.price, 2) : "---";
  const quantity = order?.quantity ? formatNumber(order?.quantity, 4) : "--";
  const filled = order?.filledQty ? formatNumber(order?.filledQty, 4) : "--";
  const avgPrice = order?.avgFillPrice
    ? formatNumber(order?.avgFillPrice, 2)
    : "---";
  const status = order?.status || "--";
  
  // Check if order can be cancelled (WORKING status)
  const canCancel = status === "WORKING" && orderId && onCancel;

  return (
    <>
      {/* Header */}
      <View style={styles.orderHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.symbolText}>{symbol}</Text>
          {/* <View style={styles.optionsBadge}>
            <Text style={styles.badgeText}>Options</Text>
          </View> */}
        </View>
        <Text style={styles.timeText}>{time}</Text>
      </View>

      {/* Type + Side */}
      <View style={styles.typeRow}>
        <Text style={[styles.typeText, { color: getSideColor(side) }]}>
          {side}
        </Text>
      </View>

      {/* Data Rows */}
      <View style={styles.infoRow}>
        <View style={styles.labels}>
          <Text style={styles.label}>Price</Text>
          <Text style={styles.label}>Size</Text>
          <Text style={styles.label}>Filled</Text>
          <Text style={styles.label}>Avg. Price</Text>
          <Text style={styles.label}>Status</Text>
        </View>

        <View style={styles.values}>
          <Text style={styles.value}>{price}</Text>
          <Text style={styles.value}>{quantity}</Text>
          <Text style={styles.value}>{formatNumber(order?.filledQty || 0, 4)}</Text>
          <Text style={styles.value}>{formatNumber(order?.avgFillPrice || 0, 4)}</Text>
          <Text
            style={[
              styles.value,
              status === "WORKING"
                ? { color: colors.yellow }
                : status === "FILLED"
                ? { color: colors.green }
                : { color: colors.secondaryText },
            ]}
          >
            {status}
          </Text>
        </View>
      </View>

      {/* Cancel Button */}
      {canCancel && (
        <View
          style={{
            marginTop: 12,
            flexDirection: "row",
            justifyContent: "flex-end",
          }}
        >
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => onCancel(orderId)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};

const renderOpenPositionCard = (pos, contractList, positionInput, updatePositionInput, handleClosePosition) => {
  const createdAt = pos?.createdAt ? new Date(pos.createdAt) : null;
  const time = createdAt
    ? `${createdAt.toLocaleDateString()} ${createdAt.toLocaleTimeString()}`
    : "--";

  const symbol = pos?.symbol || "--";
  const side = pos?.side || "--";
  
  const matchedContract = contractList?.find(
    (item) =>
      item?.call?.symbol === pos?.symbol ||
      item?.put?.symbol === pos?.symbol
  );
  const filteredContract =
    matchedContract?.call?.symbol === pos?.symbol
      ? matchedContract?.call
      : matchedContract?.put;
  const currentPrice =
    filteredContract?.lastPrice ??
    pos?.currentPrice ??
    pos?.lastPrice ??
    null;

  let unrealizedPnL = null;
  let unrealizedPercent = null;

  if (currentPrice && pos.entryPrice && pos.quantity) {
    unrealizedPnL =
      (Number(currentPrice) - Number(pos.entryPrice)) *
      Number(pos.quantity);
    unrealizedPercent =
      ((Number(currentPrice) - Number(pos.entryPrice)) /
        Number(pos.entryPrice)) *
      100;
  }

  const pnlPositive = unrealizedPnL > 0;
  const pnlNegative = unrealizedPnL < 0;

  return (
    <>
      {/* Header */}
      <View style={styles.orderHeader}>
        <View style={styles.headerLeft}>
          <Text
            style={[styles.symbolText, { color: getSideColor(side) }]}
          >
            {symbol}
          </Text>
          {/* <View style={styles.optionsBadge}>
            <Text style={styles.badgeText}>Options</Text>
          </View> */}
        </View>
        <Text style={styles.timeText}>{time}</Text>
      </View>

      {/* Type + Side */}
      <View style={styles.typeRow}>
        <Text style={[styles.typeText, { color: getSideColor(side) }]}>
          {side}
        </Text>
      </View>

      {/* Data Rows */}
      <View style={styles.infoRow}>
        <View style={styles.labels}>
          <Text style={styles.label}>Entry Price</Text>
          <Text style={styles.label}>Current Price</Text>
          <Text style={styles.label}>Size</Text>
          <Text style={styles.label}>Unreal. PnL</Text>
          <Text style={styles.label}>Realized PnL</Text>
        </View>

        <View style={styles.values}>
          <Text style={styles.value}>
            {formatNumber(pos.entryPrice, 2)}
          </Text>
          <Text
            style={[
              styles.value,
              currentPrice > pos.entryPrice
                ? { color: colors.green }
                : currentPrice < pos.entryPrice
                ? { color: colors.red }
                : { color: colors.white },
            ]}
          >
            {currentPrice != null
              ? formatNumber(currentPrice, 2)
              : "---"}
          </Text>
          <Text style={styles.value}>
            {formatNumber(pos.quantity, 4)}
          </Text>
          <Text
            style={[
              styles.value,
              pnlPositive
                ? { color: colors.green }
                : pnlNegative
                ? { color: colors.red }
                : { color: colors.white },
            ]}
          >
            {unrealizedPnL != null
              ? `${formatNumber(unrealizedPnL, 2)} (${formatNumber(
                  unrealizedPercent,
                  2
                )}%)`
              : "---"}
          </Text>
          <Text
            style={[
              styles.value,
              Number(pos.realizedPnl) > 0
                ? { color: colors.green }
                : Number(pos.realizedPnl) < 0
                ? { color: colors.red }
                : { color: colors.white },
            ]}
          >
            {formatNumber(pos.realizedPnl || 0, 2)}
          </Text>
        </View>
      </View>

      {/* Close Position Section */}
      <View style={styles.closePositionSection}>
        <View style={styles.closeInputRow}>
          <View style={styles.closeInputContainer}>
            <Text style={styles.closeInputLabel}>Price</Text>
            <TextInput
              style={styles.closeInput}
              placeholder="Price"
              placeholderTextColor={colors.secondaryText}
              value={
                positionInput[pos._id]?.price ??
                String(pos.entryPrice)
              }
              onChangeText={(text) =>
                updatePositionInput(pos._id, "price", text)
              }
              keyboardType="numeric"
            />
          </View>
          <View style={styles.closeInputContainer}>
            <Text style={styles.closeInputLabel}>Size</Text>
            <TextInput
              style={styles.closeInput}
              placeholder="Size"
              placeholderTextColor={colors.secondaryText}
              value={
                positionInput[pos._id]?.size ??
                String(pos.quantity)
              }
              onChangeText={(text) =>
                updatePositionInput(pos._id, "size", text)
              }
              keyboardType="numeric"
            />
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.closeButton,
            (() => {
              const price =
                positionInput[pos._id]?.price ?? pos.entryPrice;
              const size =
                positionInput[pos._id]?.size ?? pos.quantity;
              if (
                !price ||
                !size ||
                Number(size) <= 0 ||
                Number(size) > Number(pos.quantity)
              ) {
                return styles.closeButtonDisabled;
              }
              return null;
            })(),
          ]}
          onPress={() => handleClosePosition(pos)}
          disabled={(() => {
            const price =
              positionInput[pos._id]?.price ?? pos.entryPrice;
            const size =
              positionInput[pos._id]?.size ?? pos.quantity;
            if (
              !price ||
              !size ||
              Number(size) <= 0 ||
              Number(size) > Number(pos.quantity)
            )
              return true;
            return false;
          })()}
        >
          <Text style={styles.closeButtonText}>Close Position</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

const OptionsHistory = () => {
  const dispatch = useDispatch();
  const {
    orderHistory,
    exerciseHistory,
    openOrder,
    openPositions,
    contractList,
    setOpenOrder,
    setOpenPositions,
  } = useContext(OptionsContext);
  const [activeTab, setActiveTab] = useState(0);
  const [positionInput, setPositionInput] = useState({});

  // Update position input
  const updatePositionInput = (id, field, value) => {
    setPositionInput((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  // Handle close position
  const handleClosePosition = async (pos) => {
    try {
      dispatch(setLoading(true));

      const closeSide = "SELL";
      const priceInput = positionInput[pos._id]?.price;
      const sizeInput = positionInput[pos._id]?.size;

      const price = Number(priceInput ?? pos.entryPrice);
      const quantity = Number(sizeInput ?? pos.quantity);

      if (!price || isNaN(price) || price <= 0) {
        showError("Please enter a valid price greater than 0.");
        return;
      }

      if (!quantity || isNaN(quantity) || quantity <= 0) {
        showError("Please enter a valid size greater than 0.");
        return;
      }

      if (quantity > Number(pos.quantity)) {
        showError(
          "Close size cannot be greater than your open position size"
        );
        return;
      }

      const matchedContract = contractList?.find(
        (item) =>
          item?.call?.symbol === pos.symbol || item?.put?.symbol === pos.symbol
      );

      if (!matchedContract) {
        showError("Unable to match contract details.");
        return;
      }

      const contract =
        matchedContract?.call?.symbol === pos.symbol
          ? matchedContract.call
          : matchedContract.put;

      const { tickSize } = contract;

      if (tickSize && Number(tickSize) > 0) {
        const step = Number(tickSize);
        const remainder = (price / step) % 1;

        if (remainder !== 0) {
          const nearestValid = Math.round(price / step) * step;
          showError(
            `Invalid price step. Must be in multiples of ${step}. Try ${nearestValid.toFixed(
              4
            )}.`
          );
          return;
        }
      }

      const result = await appOperation.customer.placeOptionOrder({
        symbol: pos.symbol,
        side: closeSide,
        price: price,
        quantity: quantity,
      });

      if (result?.success) {
        showError(
          result?.message || "Position close order placed successfully!"
        );
        // Clear input
        setPositionInput((prev) => {
          const updated = { ...prev };
          delete updated[pos._id];
          return updated;
        });
      } else {
        showError(result?.message || "Failed to close position.");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Unexpected error occurred while closing the position.";
      showError(msg);
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Cancel order handler
  const handleCancelOrder = async (orderId) => {
    try {
      dispatch(setLoading(true));
      if (!orderId) {
        showError("Invalid order id");
        return;
      }

      const result = await appOperation.customer.close_option_order({
        orderId: orderId,
      });

      if (!result?.success) {
        showError(result?.message || "Failed to cancel order.");
        return;
      }

      showError("Order cancelled successfully");
      
      // Remove cancelled order from local state
      if (setOpenOrder) {
        setOpenOrder((prev) =>
          prev.filter((order) => {
            const id = order?.orderId ?? order?._id ?? order?.id;
            return id !== orderId;
          })
        );
      }
    } catch (err) {
      showError(
        err?.message || "Something went wrong while cancelling the order."
      );
    } finally {
      dispatch(setLoading(false));
    }
  };

  const tabs = [
    {
      id: "openOrders",
      title: `Open Orders (${openOrder?.length ?? 0})`,
    },
    {
      id: "openPositions",
      title: `Positions (${openPositions?.length ?? 0})`,
    },
    {
      id: "orderHistory",
      title: `Order History (${orderHistory?.length ?? 0})`,
    },
    {
      id: "exerciseHistory",
      title: `Exercise History (${exerciseHistory?.length ?? 0})`,
    },
  ];

  const datasets = [
    openOrder ?? [],
    openPositions ?? [],
    orderHistory ?? [],
    exerciseHistory ?? [],
  ];
  const renderers = [
    (item) => renderOpenOrderCard(item, handleCancelOrder),
    (item) =>
      renderOpenPositionCard(
        item,
        contractList,
        positionInput,
        updatePositionInput,
        handleClosePosition
      ),
    renderOrderHistoryCard,
    renderExerciseHistoryCard,
  ];

  const activeData = datasets[activeTab] ?? [];
  const renderItem = renderers[activeTab] ?? (() => null);
  const emptyMessages = [
    "No open orders found",
    "No open positions found",
    "No order history found",
    "No exercise history found",
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent={false}
        backgroundColor={colors.newThemeColor}
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
            tintColor={"#FFFFFF"}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Options History</Text>
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
              style={[
                styles.tabItem,
                activeTab === index && styles.tabItemActive,
              ]}
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
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.separator} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.listContainer,
          activeData.length === 0 && { flexGrow: 0 },
        ]}
      >
        {activeData.length === 0 ? (
          <View style={styles.emptyState}>
            <FastImage
              source={folder}
              resizeMode="contain"
              style={{ width: 80, height: 80, marginBottom: 16 }}
            />
            <Text style={styles.emptyText}>{emptyMessages[activeTab]}</Text>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0b0b",
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#0b0b0b",
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  tabsRow: {
    paddingHorizontal: 14,
    backgroundColor: "#0b0b0b",
    flexDirection: "row",
    alignItems: "center",
  },
  tabItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.buttonBg,
  },
  tabTextInactive: {
    fontSize: 14,
    color: colors.secondaryText,
    fontWeight: "500",
  },
  tabTextActive: {
    fontSize: 14,
    color: colors.buttonBg,
    fontWeight: "600",
  },
  separator: {
    height: 1,
    backgroundColor: "#1a1a1a",
  },
  listContainer: {
    padding: 14,
    flexGrow: 1,
  },
  orderCard: {
    backgroundColor: "#0f0f0f",
    borderRadius: 6,
    padding: 14,
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
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
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginRight: 8,
  },
  optionsBadge: {
    backgroundColor: "#2b2b2b",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    color: "#c7c7c7",
    fontSize: 11,
  },
  timeText: {
    color: "#77797a",
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
    color: "#5c5c5c",
    fontSize: 14,
    marginBottom: 10,
  },
  value: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    color: "#9aa0a6",
    fontSize: 15,
  },
  cancelButton: {
    backgroundColor: colors.red + "20",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.red,
  },
  cancelButtonText: {
    color: colors.red,
    fontSize: 12,
    fontWeight: "600",
  },
  closePositionSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
  },
  closeInputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  closeInputContainer: {
    flex: 1,
  },
  closeInputLabel: {
    marginBottom: 6,
    fontSize: 12,
    color: colors.secondaryText,
  },
  closeInput: {
    backgroundColor: "#151515",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.white,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  closeButton: {
    backgroundColor: colors.buttonBg,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonDisabled: {
    backgroundColor: "#2A2A2A",
    opacity: 0.5,
  },
  closeButtonText: {
    color: colors.black,
    fontSize: 12,
    fontWeight: "600",
  },
});

export default OptionsHistory;
