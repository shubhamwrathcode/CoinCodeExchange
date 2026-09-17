import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useContext,
} from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  Dimensions,
  TouchableOpacity,
  TextInput,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import FastImage from "react-native-fast-image";
import {
  AppSafeAreaView,
  AppText,
  EIGHTEEN,
  FOURTEEN,
  FIFTEEN,
  THIRTEEN,
  TWELVE,
  BOLD,
  SEMI_BOLD,
  SECOND,
  WHITE,
} from "../../shared";
import TouchableOpacityView from "../../shared/components/TouchableOpacityView";
import { Button, Input } from "../../shared";
import { colors } from "../../theme/colors";
import { back_ic, download, folder } from "../../helper/ImageAssets";
import NavigationService from "../../navigation/NavigationService";
import { useRoute } from "@react-navigation/native";
import { OptionsContext } from "./OptionsContext";
import { useDispatch, useSelector } from "react-redux";
import { showError } from "../../helper/logger";
import { appOperation } from "../../appOperation";
import { setLoading } from "../../slices/authSlice";
import { SpinnerSecond } from "../../shared/components/SpinnerSecond";
import KeyBoardAware from "../../shared/components/KeyboardAware";
import { OPTIONS_HISTORY_SCREEN } from "../../navigation/routes";

const BuyOptions = () => {
  const router = useRoute();
  const dispatch = useDispatch();
  // const { setLoading } = useSelector((state) => state.home);
  const data = router?.params;
  const selectedContract = data?.item;
  // console.log("data", data);
  const {
    orderBook,
    selectedPair: contextSelectedPair,
    balance,
    fees,
    openOrder,
    openPositions,
    orderHistory,
    exerciseHistory,
    contractList,
  } = useContext(OptionsContext);
  // Use context selectedPair if available, otherwise fallback to route params
  const selectedPair = contextSelectedPair?.base_currency
    ? contextSelectedPair
    : data?.selectedPair || {};
  const [sideTab, setSideTab] = useState("Buy");
  const [bottomTab, setBottomTab] = useState("positions"); // "orders" | "positions"
  const [price, setPrice] = useState(selectedContract?.lastPrice || 0);
  const [quantity, setQuantity] = useState(0);
  const [positionInput, setPositionInput] = useState({});

  // Helper functions for order book display
  const toFinite = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  const toFixedFive = (data) => {
    if (typeof data === "number") {
      return parseFloat(data.toFixed(5));
    } else {
      return data;
    }
  };

  // Date formatting helper
  const formatDate = (value) => {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return typeof value === "string" ? value : "--";
    }
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get side color
  const getSideColor = (side) => {
    if (side === "BUY" || side === "LONG") return colors.green;
    if (side === "SELL" || side === "SHORT") return colors.red;
    return colors.white;
  };

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

      if (!price || isNaN(price) || price <= 0)
        return showError("Please enter a valid price greater than 0.");

      if (!quantity || isNaN(quantity) || quantity <= 0)
        return showError("Please enter a valid size greater than 0.");

      if (quantity > Number(pos.quantity))
        return showError(
          "Close size cannot be greater than your open position size"
        );

      const matchedContract = contractList?.find(
        (item) =>
          item?.call?.symbol === pos.symbol || item?.put?.symbol === pos.symbol
      );

      if (!matchedContract)
        return showError("Unable to match contract details.");

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
          return showError(
            `Invalid price step. Must be in multiples of ${step}. Try ${nearestValid.toFixed(
              4
            )}.`
          );
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

  // Cancel order
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
    } catch (err) {
      showError(
        err?.message || "Something went wrong while cancelling the order."
      );
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Calculate max volumes for gradient visualization
  const maxAskVolume = useMemo(() => {
    if (!orderBook.asks || orderBook.asks.length === 0) return 1;
    return Math.max(...orderBook.asks.map((order) => toFinite(order.size)), 1);
  }, [orderBook.asks]);

  const maxBidVolume = useMemo(() => {
    if (!orderBook.bids || orderBook.bids.length === 0) return 1;
    return Math.max(...orderBook.bids.map((order) => toFinite(order.size)), 1);
  }, [orderBook.bids]);

  const handleOrderBookPrice = (price) => {
    setPrice(String(toFixedFive(price)));
  };

  const formatNumber = (data, decimal = 1) => {
    const num = typeof data === "string" ? Number(data) : data;
    if (typeof num === "number" && !isNaN(num)) {
      return parseFloat(num.toFixed(decimal));
    }
    return "0.00";
  };

  const finalCost =
    calcOrderFee(
      Number(price),
      Number(selectedPair?.buy_price),
      Number(quantity)
    ) +
    price * quantity;
  function calcOrderFee(optionPrice = 0, indexPrice = 0, quantity = 1) {
    try {
      if (
        typeof optionPrice !== "number" ||
        typeof indexPrice !== "number" ||
        typeof quantity !== "number" ||
        optionPrice <= 0 ||
        indexPrice <= 0 ||
        quantity <= 0 ||
        !fees
      ) {
        return 0;
      }

      const feeBasedOnIndex =
        (fees?.transactionFee / 100) * indexPrice * fees?.CONTRACT_UNIT;
      const feeCap = fees?.FEE_CAP_RATE * optionPrice;

      const perContractFee = Math.min(feeBasedOnIndex, feeCap);

      const totalFee = perContractFee * quantity;

      return Number(totalFee.toFixed(5));
    } catch (error) {
      return 0;
    }
  }

  const renderOrderRow = ({ item, index, type }) => {
    const isBid = type === "bid";
    const size = toFinite(item?.size);
    const maxVolume = isBid ? maxBidVolume : maxAskVolume;
    const ratio = clamp01(size / maxVolume);

    // Ensure locations are strictly non-decreasing and finite
    const a = ratio;
    const b = Math.min(1, a + 1e-6);

    // console.log(data?.item?.symbol, "data");

    return (
      <TouchableOpacity
        key={`${type}-${index}`}
        onPress={() => handleOrderBookPrice(item?.price)}
        activeOpacity={0.7}
      >
        <LinearGradient
          style={styles.orderRow}
          colors={
            isBid
              ? ["#1c2a2b", "#1c2a2b", "transparent", "transparent"]
              : ["#301e27", "#301e27", "transparent", "transparent"]
          }
          start={{ x: isBid ? 0 : 1, y: 0 }}
          end={{ x: isBid ? 1 : 0, y: 0 }}
          locations={[0, a, b, 1]}
        >
          <AppText
            type={TWELVE}
            style={[
              styles.orderPrice,
              isBid ? styles.bidPriceText : styles.askPriceText,
            ]}
          >
            {toFixedFive(item?.price)}
          </AppText>
          <AppText type={TWELVE} style={styles.orderSize}>
            {toFixedFive(item?.size)}
          </AppText>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const handleplaceOrder = async () => {
    try {
      // 🌀 Prevent duplicate requests

      // LoaderHelper.loaderStatus(true);
      dispatch(setLoading(true));

      // --- Validate selected contract ---
      if (!selectedContract) {
        return showError(
          "Please select an option contract before placing an order."
        );
      }

      const { symbol, tickSize, minQty, maxQty } = selectedContract;

      if (!symbol) {
        return showError(
          "Invalid contract. Please refresh the page and try again."
        );
      }

      // --- Validate Side ---
      if (!sideTab || !["BUY", "SELL"].includes(sideTab?.toUpperCase())) {
        return showError("Invalid order side. Please select BUY or SELL.");
      }

      // --- Validate Price ---
      if (!price || isNaN(price) || Number(price) <= 0) {
        return showError("Please enter a valid price greater than 0.");
      }

      // --- Validate Quantity ---
      if (!quantity || isNaN(quantity) || Number(quantity) <= 0) {
        return showError("Please enter a valid quantity greater than 0.");
      }

      // --- Enforce minQty and maxQty from contract ---
      const numQty = Number(quantity);
      const min = Number(minQty) || 0;
      const max = Number(maxQty) || Infinity;

      if (numQty < min) {
        return showError(
          `Minimum order quantity is ${min}. Please increase your quantity.`
        );
      }

      if (numQty > max) {
        return showError(
          `Maximum order quantity is ${max}. Please reduce your quantity.`
        );
      }

      // --- Validate Tick Size ---
      if (tickSize && Number(tickSize) > 0) {
        const validStep = Number(tickSize);
        const remainder = (Number(price) / validStep) % 1;

        if (remainder !== 0) {
          const nearestValid =
            Math.round(Number(price) / validStep) * validStep;
          return showError(
            `Invalid price step. Price must be in multiples of ${validStep}. Try ${nearestValid.toFixed(
              2
            )} instead.`
          );
        }
      }

      console.log("payload", {
        symbol: symbol,
        side: sideTab?.toUpperCase(),
        price: Number(price),
        quantity: Number(quantity),
      });

      // --- Execute API call ---
      const result = await appOperation.customer.placeOptionOrder({
        symbol: symbol,
        side: sideTab?.toUpperCase(),
        price: Number(price),
        quantity: Number(quantity),
      });

      // --- Handle result ---
      if (result?.success) {
        showError(
          result?.message || "Your order has been placed successfully!"
        );
      } else {
        showError(
          result?.message || "Failed to place order. Please try again later."
        );
      }
    } catch (error) {
      console.error("⚠️ handlePlaceOrder error:", error);

      // --- Graceful error display ---
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Unexpected error occurred while placing the order. Please try again.";
      showError(msg);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const formattedDate = selectedPair?.selectedExpiry
    ? new Date(selectedPair?.selectedExpiry).toISOString().split("T")[0]
    : "---";

  return (
    <AppSafeAreaView style={styles.safeArea} backgroundColor={colors.black}>
      <KeyBoardAware>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacityView
                onPress={() => NavigationService.goBack()}
                style={styles.backButton}
                activeOpacity={0.8}
              >
                <FastImage
                  source={back_ic}
                  style={styles.backIcon}
                  resizeMode="contain"
                />
              </TouchableOpacityView>
              <AppText
                type={EIGHTEEN}
                weight={SEMI_BOLD}
                style={styles.pairText}
              >
                {data?.item?.symbol}
              </AppText>
            </View>
            <TouchableOpacityView
              style={styles.iconButton}
              activeOpacity={0.8}
              onPress={() => NavigationService.navigate(OPTIONS_HISTORY_SCREEN)}
            >
              <FastImage
                source={download}
                style={styles.headerIcon}
                resizeMode="contain"
                tintColor={colors.white}
              />
            </TouchableOpacityView>
          </View>

          {/* Top stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <AppText type={TWELVE} color={SECOND} style={styles.statLabel}>
                Price
              </AppText>
              <AppText
                type={FOURTEEN}
                weight={SEMI_BOLD}
                style={[
                  styles.statValue,
                  {
                    color:
                      selectedPair?.change_percentage > 0
                        ? colors.green
                        : colors.red,
                  },
                ]}
              >
                {formatNumber(selectedPair?.buy_price)}
              </AppText>
            </View>
            <View style={styles.statItem}>
              <AppText type={TWELVE} color={SECOND} style={styles.statLabel}>
                24h chg
              </AppText>
              <AppText
                type={FOURTEEN}
                weight={SEMI_BOLD}
                style={[
                  styles.statValue,
                  {
                    color:
                      selectedPair?.change_percentage > 0
                        ? colors.green
                        : colors.red,
                  },
                ]}
              >
                {formatNumber(selectedPair?.change_percentage)}%
              </AppText>
            </View>
            <View style={styles.statItem}>
              <AppText type={TWELVE} color={SECOND} style={styles.statLabel}>
                24h High
              </AppText>
              <AppText
                type={FOURTEEN}
                weight={SEMI_BOLD}
                style={styles.statValue}
              >
                {formatNumber(selectedPair?.high)}
              </AppText>
            </View>
            <View style={styles.statItem}>
              <AppText type={TWELVE} color={SECOND} style={styles.statLabel}>
                24h Low
              </AppText>
              <AppText
                type={FOURTEEN}
                weight={SEMI_BOLD}
                style={styles.statValue}
              >
                {formatNumber(selectedPair?.low)}
              </AppText>
            </View>
            <View style={styles.statItem}>
              <AppText type={TWELVE} color={SECOND} style={styles.statLabel}>
                Open Spot
              </AppText>
              <AppText
                type={FOURTEEN}
                weight={SEMI_BOLD}
                style={styles.statValue}
              >
                {formatNumber(selectedPair?.open)}
              </AppText>
            </View>
          </View>

          {/* Main layout */}
          <View style={styles.mainRow}>
            {/* Order book */}
            <View style={styles.orderBookPanel}>
              <View style={styles.orderBookCard}>
                <View style={styles.orderBookHeader}>
                  <View style={styles.orderBookHeaderCol}>
                    <AppText type={TWELVE} color={SECOND}>
                      Price
                    </AppText>
                    <AppText type={TWELVE} color={SECOND}>
                      ({selectedPair?.quote_currency})
                    </AppText>
                  </View>
                  <View style={styles.orderBookHeaderCol}>
                    <AppText type={TWELVE} color={SECOND}>
                      Size
                    </AppText>
                    <AppText type={TWELVE} color={SECOND}>
                      ({selectedPair?.base_currency})
                    </AppText>
                  </View>
                </View>

                <View style={styles.orderBookListContainer}>
                  <FlatList
                    data={orderBook.bids}
                    keyExtractor={(item, idx) => `bid-${idx}-${item.price}`}
                    renderItem={(info) =>
                      renderOrderRow({ ...info, type: "bid" })
                    }
                    scrollEnabled={false}
                    contentContainerStyle={
                      orderBook.bids?.length === 0
                        ? styles.emptyListContainer
                        : undefined
                    }
                    ListEmptyComponent={
                      <View style={styles.emptyOrderBook}>
                        <AppText type={TWELVE} color={SECOND}>
                          No bid data
                        </AppText>
                      </View>
                    }
                  />
                </View>

                <View style={styles.midPriceBox}>
                  <AppText
                    type={FIFTEEN}
                    weight={BOLD}
                    style={[
                      {
                        color:
                          data?.item?.lastPrice > data?.item?.lastMarkPrice
                            ? colors.green
                            : colors.red,
                      },
                    ]}
                  >
                    {/* {orderBook.asks.length > 0 && orderBook.bids.length > 0
                    ? toFixedFive((orderBook.asks[0]?.price + orderBook.bids[0]?.price) / 2)
                    : data?.selectedPair?.buy_price || "---"} */}
                    {data?.item?.lastPrice || "---"}
                  </AppText>
                  <AppText
                    type={TWELVE}
                    style={[
                      styles.midPriceSubText,
                      {
                        color:
                          selectedPair?.change_percentage > 0
                            ? colors.green
                            : colors.red,
                      },
                    ]}
                  >
                    {/* {selectedPair?.change_percentage
                    ? `~${selectedPair.change_percentage}%`
                    : orderBook.asks.length > 0 && orderBook.bids.length > 0
                    ? `≈ $${toFixedFive((orderBook.asks[0]?.price + orderBook.bids[0]?.price) / 2)}`
                    : "---"} */}
                    {selectedPair?.change_percentage}%
                  </AppText>
                </View>

                <View style={styles.orderBookListContainer}>
                  <FlatList
                    data={orderBook.asks}
                    keyExtractor={(item, idx) => `ask-${idx}-${item.price}`}
                    renderItem={(info) =>
                      renderOrderRow({ ...info, type: "ask" })
                    }
                    scrollEnabled={false}
                    contentContainerStyle={
                      orderBook.asks?.length === 0
                        ? styles.emptyListContainer
                        : undefined
                    }
                    ListEmptyComponent={
                      <View style={styles.emptyOrderBook}>
                        <AppText type={TWELVE} color={SECOND}>
                          No ask data
                        </AppText>
                      </View>
                    }
                  />
                </View>
              </View>
            </View>

            {/* Form panel */}
            <View style={styles.formPanel}>
              {/* BUY / SELL tabs (as in reference) */}
              <View style={styles.buySellTabs}>
                <TouchableOpacityView
                  style={[
                    styles.buyTab,
                    sideTab === "Buy" ? styles.buyTabActive : {},
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSideTab("Buy")}
                >
                  <AppText
                    type={FOURTEEN}
                    weight={SEMI_BOLD}
                    style={styles.buyTabTextActive}
                  >
                    Buy
                  </AppText>
                </TouchableOpacityView>
                <TouchableOpacityView
                  style={[
                    styles.sellTab,
                    sideTab === "Sell" ? styles.sellTabActive : {},
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSideTab("Sell")}
                >
                  <AppText type={FOURTEEN} style={styles.sellTabText}>
                    Sell
                  </AppText>
                </TouchableOpacityView>
              </View>

              {/* Price field */}
              <Input
                title="Price"
                value={String(price)}
                onChangeText={(text) => setPrice(text)}
                keyboardType="decimal-pad"
                currency={selectedPair?.quote_currency}
                mainContainer={styles.fieldBlock}
              />

              {/* Size field */}
              <Input
                title={`Size (${selectedPair?.base_currency})`}
                value={String(quantity)}
                onChangeText={(text) => setQuantity(text)}
                keyboardType="decimal-pad"
                currency={selectedPair?.base_currency}
                mainContainer={styles.fieldBlock}
              />

              {/* Cost / Avail / Symbol / Expiry */}
              <View style={styles.infoList}>
                <View style={styles.infoRow}>
                  <AppText type={TWELVE} color={SECOND}>
                    Cost
                  </AppText>
                  <AppText type={TWELVE} style={styles.infoValue}>
                    {formatNumber(finalCost, 3) || "---"}
                  </AppText>
                </View>
                <View style={styles.infoRow}>
                  <AppText type={TWELVE} color={SECOND}>
                    Avail.
                  </AppText>
                  <AppText type={TWELVE} style={styles.infoValue}>
                    {formatNumber(balance)} {selectedPair?.quote_currency}
                  </AppText>
                </View>
                <View style={styles.infoRow}>
                  <AppText type={TWELVE} color={SECOND}>
                    Symbol
                  </AppText>
                  <AppText type={TWELVE} style={styles.infoValue}>
                    {data?.item?.symbol}
                  </AppText>
                </View>
                <View style={styles.infoRow}>
                  <AppText type={TWELVE} color={SECOND}>
                    Expiry
                  </AppText>
                  <AppText type={TWELVE} style={styles.infoValue}>
                    {formattedDate}
                  </AppText>
                </View>
              </View>

              {/* Buy button */}
              <Button
                containerStyle={[
                  styles.buyButton,
                  {
                    backgroundColor:
                      sideTab === "Buy" ? colors.green : colors.red,
                  },
                ]}
                onPress={handleplaceOrder}
              >
                {sideTab === "Buy" ? "Buy" : "Sell"}
              </Button>

              {/* Bottom metrics rows */}
              <View style={styles.metricsRow}>
                <View style={styles.metricsItem}>
                  <AppText type={TWELVE} color={SECOND}>
                    Min Size
                  </AppText>
                  <AppText type={TWELVE} style={styles.infoValue}>
                    {formatNumber(data?.item?.minQty)}
                  </AppText>
                </View>
                <View style={styles.metricsItemRight}>
                  <AppText type={TWELVE} color={SECOND}>
                    Max Size
                  </AppText>
                  <AppText type={TWELVE} style={styles.infoValue}>
                    {formatNumber(data?.item?.maxQty)}
                  </AppText>
                </View>
              </View>
              <View style={styles.metricsRow}>
                <View style={styles.metricsItem}>
                  <AppText type={TWELVE} color={SECOND}>
                    Delta
                  </AppText>
                  <AppText type={TWELVE} style={styles.infoValue}>
                    {formatNumber(data?.item?.delta)}
                  </AppText>
                </View>
                <View style={styles.metricsItemRight}>
                  <AppText type={TWELVE} color={SECOND}>
                    Gamma
                  </AppText>
                  <AppText type={TWELVE} style={styles.infoValue}>
                    {formatNumber(data?.item?.gamma)}
                  </AppText>
                </View>
              </View>
              <View style={styles.metricsRow}>
                <View style={styles.metricsItem}>
                  <AppText type={TWELVE} color={SECOND}>
                    Strike
                  </AppText>
                  <AppText type={TWELVE} style={styles.infoValue}>
                    {formatNumber(data?.item?.strikePrice)}
                  </AppText>
                </View>
                <View style={styles.metricsItemRight}>
                  <AppText type={TWELVE} color={SECOND}>
                    Mark
                  </AppText>
                  <AppText type={TWELVE} style={styles.infoValue}>
                    {formatNumber(data?.item?.lastMarkPrice)}
                  </AppText>
                </View>
              </View>
              <View style={styles.metricsRowSingle}>
                <AppText type={TWELVE} color={SECOND}>
                  Fees
                </AppText>
                <AppText type={TWELVE} style={styles.infoValue}>
                  T: {formatNumber(fees?.transactionFee)}% / E:{" "}
                  {formatNumber(fees?.exerciseFee)}%
                </AppText>
              </View>
            </View>
          </View>

          <View style={styles.bottomSection}>
            {/* Tabs */}
            <View style={styles.bottomTabsRow}>
              <TouchableOpacityView
                style={
                  bottomTab === "positions"
                    ? styles.bottomTabActive
                    : styles.bottomTab
                }
                onPress={() => setBottomTab("positions")}
                activeOpacity={0.8}
              >
                <AppText
                  type={FOURTEEN}
                  weight={SEMI_BOLD}
                  style={
                    bottomTab === "positions"
                      ? styles.bottomTabTextActive
                      : styles.bottomTabText
                  }
                >
                  Positions ({openPositions?.length ?? 0})
                </AppText>
              </TouchableOpacityView>
              <TouchableOpacityView
                style={
                  bottomTab === "orders"
                    ? styles.bottomTabActive
                    : styles.bottomTab
                }
                onPress={() => setBottomTab("orders")}
                activeOpacity={0.8}
              >
                <AppText
                  type={FOURTEEN}
                  weight={SEMI_BOLD}
                  style={
                    bottomTab === "orders"
                      ? styles.bottomTabTextActive
                      : styles.bottomTabText
                  }
                >
                  Open Orders ({openOrder?.length ?? 0})
                </AppText>
              </TouchableOpacityView>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.bottomScrollView}
              showsVerticalScrollIndicator={false}
            >
              {bottomTab === "orders" ? (
                openOrder && openOrder.length > 0 ? (
                  openOrder.map((order) => {
                    const orderId = order?.orderId;
                    return (
                      <View key={orderId} style={styles.orderCard}>
                        {/* Header */}
                        <View style={styles.orderHeader}>
                          <View style={styles.headerLeft}>
                            <AppText style={styles.symbolText}>
                              {order.symbol || "--"}
                            </AppText>
                            {/* <View style={styles.optionsBadge}>
                              <AppText style={styles.badgeText}>
                                Options
                              </AppText>
                            </View> */}
                          </View>
                          <AppText style={styles.timeText}>
                            {formatDate(order.createdAt)}
                          </AppText>
                        </View>

                        {/* Type + Side */}
                        <View style={styles.typeRow}>
                          <AppText
                            style={[
                              styles.typeText,
                              { color: getSideColor(order.side) },
                            ]}
                          >
                            {order.side || "--"}
                          </AppText>
                        </View>

                        {/* Data Rows */}
                        <View style={styles.infoRow}>
                          <View style={styles.labels}>
                            <AppText style={styles.label}>Price</AppText>
                            <AppText style={styles.label}>Size</AppText>
                            <AppText style={styles.label}>Filled</AppText>
                            <AppText style={styles.label}>Avg. Price</AppText>
                            <AppText style={styles.label}>Status</AppText>
                            <AppText style={styles.label}>Close</AppText>
                          </View>

                          <View style={styles.values}>
                            <AppText style={styles.value}>
                              {formatNumber(order.price, 2)}
                            </AppText>
                            <AppText style={styles.value}>
                              {formatNumber(order.quantity, 4)}
                            </AppText>
                            <AppText style={styles.value}>
                              {formatNumber(order.filledQty || 0, 4)}
                            </AppText>
                            <AppText style={styles.value}>
                              {formatNumber(order.avgFillPrice || 0, 4)}
                            </AppText>
                            <AppText
                              style={[
                                styles.value,
                                order.status === "WORKING"
                                  ? { color: colors.yellow }
                                  : order.status === "FILLED"
                                  ? { color: colors.green }
                                  : { color: colors.secondaryText },
                              ]}
                            >
                              {order.status || "--"}
                            </AppText>
                            <View
                              style={{
                                marginTop: 12,
                                flexDirection: "row",
                                justifyContent: "flex-end",
                              }}
                            >
                              <TouchableOpacity
                                style={{
                                  backgroundColor: colors.red + "20",
                                  paddingHorizontal: 16,
                                  paddingVertical: 8,
                                  borderRadius: 6,
                                  borderWidth: 1,
                                  borderColor: colors.red,
                                }}
                                onPress={() =>
                                  // orderId && cancelFutureOrder(orderId)
                                  handleCancelOrder(orderId)
                                }
                              >
                                <AppText
                                  type={TWELVE}
                                  weight={SEMI_BOLD}
                                  style={{ color: colors.red }}
                                >
                                  Close
                                </AppText>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>

                        {/* Cancel Button */}
                        {/* {orderId && order.status === "WORKING" && (
                          <View
                            style={{
                              marginTop: 12,
                              flexDirection: "row",
                              justifyContent: "flex-end",
                            }}
                          >
                            <TouchableOpacity
                              style={styles.cancelButton}
                              onPress={() => handleCancelOrder(orderId)}
                            >
                              <AppText
                                type={TWELVE}
                                style={styles.cancelButtonText}
                              >
                                Cancel
                              </AppText>
                            </TouchableOpacity>
                          </View>
                        )} */}
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.bottomEmpty}>
                    <View style={styles.emptyState}>
                      <FastImage
                        source={folder}
                        resizeMode="contain"
                        style={{ width: 80, height: 80, marginBottom: 16 }}
                      />
                    </View>
                    <AppText type={TWELVE} color={SECOND}>
                      No open orders
                    </AppText>
                  </View>
                )
              ) : openPositions && openPositions.length > 0 ? (
                openPositions.map((pos) => {
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
                    <View key={pos._id} style={styles.orderCard}>
                      {/* Header */}
                      <View style={styles.orderHeader}>
                        <View style={styles.headerLeft}>
                          <AppText
                            style={[
                              styles.symbolText,
                              { color: getSideColor(pos.side) },
                            ]}
                          >
                            {pos.symbol || "--"}
                          </AppText>
                          {/* <View style={styles.optionsBadge}>
                            <AppText style={styles.badgeText}>Options</AppText>
                          </View> */}
                          {/* <AppText style={styles.badgeText}>{pos.side}</AppText> */}
                        </View>
                        <AppText style={styles.timeText}>
                          {formatDate(pos.createdAt)}
                        </AppText>
                      </View>

                      {/* Data Rows */}
                      <View style={styles.infoRow}>
                        <View style={styles.labels}>
                          <AppText style={styles.label}>Entry Price</AppText>
                          <AppText style={styles.label}>Current Price</AppText>
                          <AppText style={styles.label}>Size</AppText>
                          <AppText style={styles.label}>Unreal. PnL</AppText>
                          <AppText style={styles.label}>Realized PnL</AppText>
                        </View>

                        <View style={styles.values}>
                          <AppText style={styles.value}>
                            {formatNumber(pos.entryPrice, 2)}
                          </AppText>
                          <AppText
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
                          </AppText>
                          <AppText style={styles.value}>
                            {formatNumber(pos.quantity, 4)}
                          </AppText>
                          <AppText
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
                              ? `${formatNumber(
                                  unrealizedPnL,
                                  2
                                )} (${formatNumber(unrealizedPercent, 2)}%)`
                              : "---"}
                          </AppText>
                          <AppText
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
                          </AppText>
                        </View>
                      </View>

                      {/* Close Position Section */}
                      <View style={styles.closePositionSection}>
                        <View style={styles.closeInputRow}>
                          <View style={styles.closeInputContainer}>
                            <AppText
                              type={TWELVE}
                              color={SECOND}
                              style={styles.closeInputLabel}
                            >
                              Price
                            </AppText>
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
                            <AppText
                              type={TWELVE}
                              color={SECOND}
                              style={styles.closeInputLabel}
                            >
                              Size
                            </AppText>
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
                        {/* <TouchableOpacity
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
                          <AppText
                            type={TWELVE}
                            color={WHITE}
                            weight={SEMI_BOLD}
                          >
                            Close Position
                          </AppText>
                        </TouchableOpacity> */}
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
                          onPress={() => handleClosePosition(pos)}
                        >
                          <AppText type={TWELVE}>Close Position</AppText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.bottomEmpty}>
                  <FastImage
                    source={folder}
                    resizeMode="contain"
                    style={{ width: 80, height: 80, marginBottom: 16 }}
                  />
                  <AppText type={TWELVE} color={SECOND}>
                    No open positions
                  </AppText>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyBoardAware>
      <SpinnerSecond />
    </AppSafeAreaView>
  );
};

export default BuyOptions;

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#000000",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    paddingRight: 8,
    paddingVertical: 4,
  },
  backIcon: {
    width: 18,
    height: 18,
  },
  pairText: {
    color: colors.white,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1A1A",
  },
  headerIcon: {
    width: 22,
    height: 22,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statItem: {
    flexDirection: "column",
    marginRight: 8,
  },
  statLabel: {
    marginBottom: 2,
  },
  statValue: {
    color: colors.white,
  },
  topTabsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  segmentLeft: {
    flexDirection: "row",
    backgroundColor: "#141414",
    borderRadius: 8,
    padding: 2,
  },
  segmentTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  segmentTabActive: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.buttonBg,
  },
  segmentText: {
    color: colors.secondaryText,
  },
  segmentTextActive: {
    color: colors.black,
  },
  segmentRight: {
    flexDirection: "row",
    backgroundColor: "#141414",
    borderRadius: 8,
    padding: 2,
  },
  sideTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  sideTabActive: {
    backgroundColor: "#333333",
  },
  sideTabText: {
    color: colors.secondaryText,
  },
  sideTabTextActive: {
    color: colors.white,
  },
  mainRow: {
    flexDirection: "row",
    // flex: 1,
    marginTop: 4,
  },
  orderBookPanel: {
    flex: 1,
    paddingRight: 8,
  },
  orderBookCard: {
    backgroundColor: "#151515",
    borderRadius: 12,
    // paddingHorizontal: 10,
    paddingVertical: 8,
  },
  formPanel: {
    flex: 1,
    paddingLeft: 8,
  },
  orderBookHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  orderBookHeaderCol: {
    flexDirection: "column",
    alignItems: "center",
  },
  orderBookListContainer: {
    height: 204, // Fixed height for 6 rows (34px each)
    overflow: "hidden",
    paddingHorizontal: 10,
  },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    minHeight: 34,
  },
  orderPrice: {
    fontSize: 12,
  },
  orderSize: {
    fontSize: 12,
    color: colors.white,
  },
  askPriceText: {
    color: colors.red,
  },
  bidPriceText: {
    color: colors.green,
  },
  midPriceBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    marginVertical: 6,
    backgroundColor: colors.white_fifteen,
  },
  midPriceText: {
    // color: colors.green,
  },
  midPriceSubText: {
    color: colors.white,
  },
  // BUY / SELL card
  buySellTabs: {
    flexDirection: "row",
    borderRadius: 8,
    overflow: "hidden",
    // marginBottom: 12,
  },
  buyTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e1e1e",
  },
  buyTabActive: {
    backgroundColor: colors.green,
  },
  buyTabTextActive: {
    color: colors.black,
  },
  sellTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#222222",
  },
  sellTabActive: {
    backgroundColor: colors.red,
  },
  sellTabText: {
    color: colors.white,
  },
  fieldBlock: {
    // marginBottom: 10,
  },
  fieldLabel: {
    marginBottom: 4,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepButton: {
    width: 34,
    height: 40,
    borderRadius: 4,
    backgroundColor: "#151515",
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    color: colors.white,
  },
  fieldInputBox: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 4,
    backgroundColor: "#151515",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fieldValue: {
    color: colors.white,
  },
  fieldSuffix: {
    color: colors.secondaryText,
  },
  infoList: {
    marginTop: 6,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  infoValue: {
    color: colors.white,
  },
  buyButton: {
    marginVertical: 4,
    // backgroundColor: colors.green,
    borderRadius: 6,
    height: 42,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  metricsItem: {
    flex: 1,
  },
  metricsItemRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  metricsRowSingle: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  bottomSection: {
    marginTop: 15,
    backgroundColor: "#151515",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  pnlBox: {
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  bottomTabsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bottomTab: {
    marginRight: 16,
  },
  bottomTabActive: {
    marginRight: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.buttonBg,
    paddingBottom: 2,
  },
  bottomTabText: {
    color: colors.secondaryText,
  },
  bottomTabTextActive: {
    color: colors.buttonBg,
  },
  bottomScrollView: {
    marginTop: 10,
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
    marginRight: 6,
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
  },
  closeInput: {
    backgroundColor: "#151515",
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 36,
    color: colors.white,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  closeButton: {
    // backgroundColor: colors.buttonBg,
    // paddingVertical: 10,
    // paddingHorizontal: 16,
    // borderRadius: 6,
    // alignItems: "center",
    // justifyContent: "center",
    flex: 1,
    backgroundColor: "#FFFFFF0A",
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#23262F",
    marginLeft: 6,
  },
  closeButtonDisabled: {
    backgroundColor: "#2A2A2A",
    opacity: 0.5,
  },
  bottomEmpty: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 204,
  },
  emptyOrderBook: {
    alignItems: "center",
    justifyContent: "center",
  },
});
