import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import ReactNativeModal from "react-native-modal";
import { useIsFocused } from "@react-navigation/native";
import {
  AppSafeAreaView,
  AppText,
  Toolbar,
  MEDIUM,
  SEMI_BOLD,
  BOLD,
  FOURTEEN,
  FIFTEEN,
} from "../../shared";
import { colors, lightTheme } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";
import { useAppSelector } from "../../store/hooks";
import FastImage from "react-native-fast-image";
import { NO_NOTIFICATION_ICON, NO_NOTIFICATION_ICON_LIGHT, right_ic, downIcon } from "../../helper/ImageAssets";
import { useDispatch } from "react-redux";
import { getPastOrders, cancelOrder } from "../../actions/homeActions";
import { appOperation } from "../../appOperation";
import moment from "moment";
import TradeHistorySkeleton from "./TradeHistorySkeleton";
import {
  spotOpenOrderMarketLabel,
  tradeHistoryBaseAsset,
} from "../../helper/utility";
import NavigationService from "../../navigation/NavigationService";
import { SPOT_ORDER_HISTORY_DETAIL } from "../../navigation/routes";

const { width: screenW } = Dimensions.get("window");

function orderHistoryEventTime(item) {
  return item?.updated_at || item?.updatedAt || item?.created_at || item?.createdAt || item?.date || item?.timestamp || item?.time;
}

function orderHistoryMarketLabel(item, base, quote) {
  return spotOpenOrderMarketLabel(item, base, quote);
}

function orderHistoryQuoteCurrency(item) {
  const lbl = orderHistoryMarketLabel(item);
  const parts = lbl.split("/");
  return parts.length > 1 ? parts[1] : "";
}

function orderHistoryExecutionsList(item) {
  if (Array.isArray(item?.executions)) return item.executions;
  if (Array.isArray(item?.trades)) return item.trades;
  return [];
}

function orderHistoryTifDisplay(item) {
  return item?.time_in_force || item?.timeInForce || "GTC";
}

function safeToFixed8(val, fallback = "0") {
  if (val == null || val === "" || isNaN(Number(val))) return fallback;
  return Number(val).toFixed(8);
}

/**
 * Optimized Key-Value Row for Cards
 */
const TradeKvRow = React.memo(({ label, value, color, textColor, isDark }) => (
  <View style={styles.tradeKvRow}>
    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.tradeKvK, { color: isDark ? "#8E8E93" : "#666666" }]}>{label}</AppText>
    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.tradeKvV, { color: color ?? textColor }]} numberOfLines={3}>
      {value}
    </AppText>
  </View>
));

/**
 * Memoized Order Card component
 */
const OrderCard = React.memo(({
  item,
  spotSelectedPair,
  themeColors,
  onCancel,
  showTrades,
  onToggleExpand,
  getSideColor,
  isDark
}) => {
  const orderId = item?._id || item?.id || item?.order_id;
  const baseHint = spotSelectedPair?.base_currency ?? spotSelectedPair?.base_currency_short_name;
  const quoteHint = spotSelectedPair?.quote_currency ?? spotSelectedPair?.quote_currency_short_name;

  const currencyPair = useMemo(() => spotOpenOrderMarketLabel(item, baseHint, quoteHint), [item, baseHint, quoteHint]);
  const side = useMemo(() => String(item?.side || "").toUpperCase(), [item?.side]);
  const sideColor = useMemo(() => getSideColor(side), [side, getSideColor]);
  const typeUpper = useMemo(() => String(item?.order_type || item?.type || item?.orderType || "Market").toUpperCase(), [item]);

  const canCancel = useMemo(() => {
    const status = String(item?.status || item?.user_status || "").toUpperCase();
    return !!orderId && !["FILLED", "CANCELLED", "CANCELED", "COMPLETED", "EXECUTED", "REJECTED"].includes(status);
  }, [item, orderId]);

  const statusDetails = useMemo(() => {
    const raw = String(item?.status || item?.user_status || item?.order_status || item?.orderStatus || item?.state || "").toUpperCase().trim();
    let label = raw || "---";
    let color = themeColors?.text ?? "#fff";

    if (["FILLED", "COMPLETE", "COMPLETED", "EXECUTED"].includes(raw)) {
      label = "EXECUTED";
      color = "#00c087";
    } else if (["CANCELLED", "CANCELED"].includes(raw)) {
      label = "Cancelled";
      color = "#ff4b5c";
    } else if (raw === "REJECTED") {
      label = "Rejected";
      color = "#ff4b5c";
    } else if (raw === "EXPIRED") {
      label = "Expired";
      color = "#ff4b5c";
    } else if (["OPEN", "PENDING"].includes(raw)) {
      label = "Open";
      color = "#f3ba2f";
    } else if (["PARTIAL", "PARTIALLY_FILLED", "PARTIAL_FILLED"].includes(raw)) {
      label = "Partial";
      color = "#f3ba2f";
    }
    return { label, color };
  }, [item, themeColors]);

  const eventM = useMemo(() => {
    const ts = orderHistoryEventTime(item);
    return ts ? moment(ts) : null;
  }, [item]);

  const dateStr = eventM?.isValid() ? eventM.format("DD/MM/YYYY") : "—";
  const timeStr = eventM?.isValid() ? eventM.format("HH:mm:ss") : "—";
  const headerDateTime = eventM?.isValid() ? eventM.format("DD/MM/YYYY HH:mm:ss") : "—";

  const executions = useMemo(() => orderHistoryExecutionsList(item), [item]);
  const hasExecutedTrades = executions.length > 0;
  const quoteCc = useMemo(() => orderHistoryQuoteCurrency(item), [item]);
  const baseSym = useMemo(() => item?.ask_currency || item?.base_currency || (currencyPair.includes("/") ? currencyPair.split("/")[0] : ""), [item, currencyPair]);

  const priceDisplay = useMemo(() => {
    return String(item?.order_type || item?.type || "").toUpperCase() === "MARKET"
      ? "Market"
      : safeToFixed8(item?.price ?? 0, "—");
  }, [item]);

  const labelColor = themeColors.secondaryText ?? "#8E8E93";
  const textColor = themeColors.text ?? "#000000";
  const execBorder = themeColors.themeBorderColor ?? themeColors.border ?? "#EEEEEE";

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => NavigationService.navigate(SPOT_ORDER_HISTORY_DETAIL, { item })}
      style={[styles.orderSpotCard, { backgroundColor: "transparent" }]}
    >
      <View>
        <View style={styles.orderSpotHeaderRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <AppText type={FIFTEEN} weight={BOLD} style={{ color: textColor }}>
                {currencyPair}
              </AppText>
              <FastImage source={right_ic} style={{ width: 12, height: 12, marginLeft: 4 }} resizeMode="contain" tintColor={labelColor} />
            </View>
            <AppText type={FIFTEEN} weight={MEDIUM} style={{ color: isDark ? "#8E8E93" : "#666666", marginTop: 4 }}>{headerDateTime}</AppText>
            <AppText style={{ color: sideColor, marginTop: 4 }} weight={BOLD} type={FOURTEEN}>
              {side} <AppText style={{ color: isDark? colors.white: colors.black, marginTop: 4 }} weight={BOLD} type={FOURTEEN}>· {typeUpper}</AppText>
            </AppText>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          {/* <TradeKvRow label="Date" value={dateStr} textColor={textColor} isDark={isDark} /> */}
          {/* <TradeKvRow label="Time" value={timeStr} textColor={textColor} isDark={isDark} /> */}
          <TradeKvRow label="Market" value={currencyPair} textColor={textColor} isDark={isDark} />
          {/* <TradeKvRow label="Side" value={side} color={sideColor} textColor={textColor} isDark={isDark} /> */}
          <TradeKvRow label="Type" value={typeUpper} textColor={textColor} isDark={isDark} />
          <TradeKvRow label="Price" value={priceDisplay} textColor={textColor} isDark={isDark} />
          <TradeKvRow label="Status" value={statusDetails.label.toUpperCase()} color={isDark? colors.white: colors.black} textColor={textColor} isDark={isDark} />
        </View>

        {hasExecutedTrades && (
          <View style={{ marginTop: 8 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.execTradesBtnSpot, { borderColor: isDark? 'transparent' : colors.secondBorder }]}
              onPress={() => onToggleExpand(item)}
            >
              <View style={styles.execTradesBtnRowSpot}>
                <FastImage
                  source={downIcon}
                  tintColor={'grey'}
                  style={[styles.orderHistoryChevronSpot, { transform: [{ rotate: showTrades ? "180deg" : "0deg" }] }]}
                  resizeMode="contain"
                />
                <AppText style={[styles.execTradesBtnTextSpot, { color: textColor }]}> Executed trades</AppText>
              </View>
            </TouchableOpacity>

            {showTrades && (
              <View style={styles.execTradesBoxSpot}>
                {executions.map((tr, i) => (
                  <View key={`${orderId}_${tr?.trade_id ?? i}`} style={[styles.execTradeItemSpot, i === executions.length - 1 && { borderBottomWidth: 0, marginBottom: 0 }]}>
                    <View style={styles.execTradeHeaderRowSpot}>
                      <AppText style={[styles.execTradeHeaderTextSpot, { color: labelColor }]} weight={MEDIUM}>Trade #{i + 1}</AppText>
                    </View>
                    <TradeKvRow label="Price:" value={`${safeToFixed8(tr?.price || 0, "0")} ${quoteCc}`} textColor={textColor} isDark={isDark} />
                    <TradeKvRow label="Executed:" value={`${safeToFixed8(tr?.quantity || 0, "0")} ${baseSym}`} textColor={textColor} isDark={isDark} />
                    <TradeKvRow label="Fee:" value={`${safeToFixed8(tr?.fee || 0, "0")} ${quoteCc}`} textColor={textColor} isDark={isDark} />
                    <TradeKvRow label="Total:" value={safeToFixed8((Number(tr?.price) || 0) * (Number(tr?.quantity) || 0), "0")} textColor={textColor} isDark={isDark} />
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      {canCancel && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.red }]} onPress={() => onCancel(item)}>
            <AppText style={{ color: colors.red, fontWeight: "600", fontSize: 12 }}>Cancel order</AppText>
          </TouchableOpacity>
        </View>
      )}
      <View style={[styles.orderSpotDivider, { backgroundColor: themeColors.themeBorderColor || "#EEEEEE" }]} />
    </TouchableOpacity>
  );
});

/**
 * Memoized Trade Fill Card component
 */
const TradeCard = React.memo(({ item, spotSelectedPair, themeColors, getSideColor, isDark }) => {
  const baseHint = spotSelectedPair?.base_currency ?? spotSelectedPair?.base_currency_short_name;
  const quoteHint = spotSelectedPair?.quote_currency ?? spotSelectedPair?.quote_currency_short_name;

  const mLabel = useMemo(() => orderHistoryMarketLabel(item, baseHint, quoteHint), [item, baseHint, quoteHint]);
  const baseSym = useMemo(() => tradeHistoryBaseAsset(item, baseHint, quoteHint), [item, baseHint, quoteHint]);
  const side = useMemo(() => String(item?.side || "").toUpperCase(), [item?.side]);
  const sideColor = useMemo(() => getSideColor(side), [side, getSideColor]);
  const role = useMemo(() => (item?.is_maker === true ? "Maker" : item?.is_maker === false ? "Taker" : "—"), [item?.is_maker]);

  const eventM = useMemo(() => {
    const ts = item?.executed_at || item?.executedAt || item?.created_at;
    return ts ? moment(ts) : null;
  }, [item]);

  const dateStr = eventM?.isValid() ? eventM.format("DD/MM/YYYY") : "—";
  const timeStr = eventM?.isValid() ? eventM.format("HH:mm:ss") : "—";
  const textColor = themeColors.text ?? "#000000";

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => NavigationService.navigate(SPOT_ORDER_HISTORY_DETAIL, { item })}
      style={[styles.tradeFillCard, { borderBottomColor: themeColors.themeBorderColor || "#EEEEEE", backgroundColor: "transparent" }]}
    >
      <View style={styles.pairRow}>
        <AppText type={FIFTEEN} weight={BOLD} style={{ color: textColor }}>{mLabel}</AppText>
        <FastImage source={right_ic} style={{ width: 11, height: 11, marginLeft: 4 }} resizeMode="contain" tintColor={isDark ? "#8E8E93" : "#666666"} />
      </View>
      <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: isDark ? "#8E8E93" : "#666666", marginTop: 4, marginBottom: 4 }}>{dateStr} {timeStr}</AppText>
      <AppText style={{ color: sideColor, marginBottom: 10 }} weight={BOLD} type={FOURTEEN}>{side}  <AppText style={{ color: isDark? colors.white:colors.black, marginBottom: 10 }} weight={BOLD} type={FOURTEEN} >· {role}</AppText> </AppText>

      <View style={styles.detailsContainer}>
        {/* <TradeKvRow label="Date" value={dateStr} textColor={textColor} isDark={isDark} /> */}
        {/* <TradeKvRow label="Time" value={timeStr} textColor={textColor} isDark={isDark} /> */}
        <TradeKvRow label="Pair" value={mLabel} textColor={textColor} isDark={isDark} />
        {/* <TradeKvRow label="Side" value={side} color={sideColor} textColor={textColor} isDark={isDark} /> */}
        {/* <TradeKvRow label="Role" value={role} textColor={textColor} isDark={isDark} /> */}
        <TradeKvRow label="Price" value={safeToFixed8(item?.price, "—")} textColor={textColor} isDark={isDark} />
        <TradeKvRow label="Quantity" value={`${safeToFixed8(item?.quantity, "—")}${baseSym ? ` ${baseSym}` : ""}`} textColor={textColor} isDark={isDark} />
      </View>
    </TouchableOpacity>
  );
});

const TradeHistory = ({ route }) => {
  const dispatch = useDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const memoizedTheme = useMemo(() => themeColors, [themeColors]);

  const pastOrdersRedux = useAppSelector((state) => state.home.pastOrders);
  const spotOpenOrders = useAppSelector((state) => state.home.spotOpenOrders || []);
  const spotSelectedPair = useAppSelector((state) => state.home.spotSelectedPair);

  const [activeTab, setActiveTab] = useState(route?.params?.activeTab ?? 0);
  const pagerX = useRef(new Animated.Value(-activeTab * screenW)).current;

  const [ordersData, setOrdersData] = useState([]);
  const [tradesData, setTradesData] = useState([]);
  const [ordersPage, setOrdersPage] = useState(1);
  const [tradesPage, setTradesPage] = useState(1);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreOrders, setHasMoreOrders] = useState(true);
  const [hasMoreTrades, setHasMoreTrades] = useState(true);

  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [isCancelLoading, setIsCancelLoading] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [showExecutedTrades, setShowExecutedTrades] = useState({});

  const ordersListRef = useRef(null);
  const tradesListRef = useRef(null);
  const limit = 20;



  // Removed Redux-syncing useEffects because they overwrite paginated data.

  const fetchOrders = useCallback(async (page = 1, isLoadMore = false) => {
    if (loadingOrders || (isLoadMore && loadingMore)) return;
    if (isLoadMore) setLoadingMore(true); else setLoadingOrders(true);
    try {
      const res = await appOperation.customer.past_orders({ page, page_size: limit });
      if (res?.success) {
        let newData = [];
        const d = res.data;
        if (Array.isArray(d?.items)) newData = d.items;
        else if (Array.isArray(res.items)) newData = res.items;
        else if (Array.isArray(d)) newData = d;
        else if (Array.isArray(d?.data)) newData = d.data;
        else if (Array.isArray(d?.records)) newData = d.records;

        if (isLoadMore) {
          setOrdersData(prev => {
            const merged = [...prev, ...newData];
            return merged.filter((item, index, self) => index === self.findIndex((t) => (t._id || t.id || t.order_id) === (item._id || item.id || item.order_id)));
          });
        } else {
          setOrdersData(newData);
        }
        setHasMoreOrders(newData.length >= limit);
      }
    } finally {
      if (isLoadMore) setLoadingMore(false); else setLoadingOrders(false);
    }
  }, [loadingOrders, loadingMore]);

  const fetchTrades = useCallback(async (page = 1, isLoadMore = false) => {
    if (loadingTrades || (isLoadMore && loadingMore)) return;
    if (isLoadMore) setLoadingMore(true); else setLoadingTrades(true);
    const skip = (page - 1) * limit;
    console.log("[TradeHistory] fetchTrades calling getTradeHistory skip:", skip);
    try {
      const res = await appOperation.customer.spot_me_trades({ page, page_size: limit });
      if (res?.success) {
        let newData = [];
        const d = res.data;
        if (Array.isArray(d?.items)) newData = d.items;
        else if (Array.isArray(res.items)) newData = res.items;
        else if (Array.isArray(d)) newData = d;
        else if (Array.isArray(d?.data)) newData = d.data;
        else if (Array.isArray(d?.records)) newData = d.records;

        console.log("[TradeHistory] getTradeHistory API Response Data:", JSON.stringify(res.data).substring(0, 300));
        console.log("[TradeHistory] getTradeHistory Extracted newData length:", newData.length);

        if (isLoadMore) {
          setTradesData(prev => {
            const merged = [...prev, ...newData];
            return merged.filter((item, index, self) => index === self.findIndex((t) => (t._id || t.id || t.trade_id) === (item._id || item.id || item.trade_id)));
          });
        } else {
          setTradesData(newData);
        }
        setHasMoreTrades(newData.length >= limit);
      }
    } finally {
      if (isLoadMore) setLoadingMore(false); else setLoadingTrades(false);
    }
  }, [loadingTrades, loadingMore]);
  const isFocused = useIsFocused()
  useEffect(() => {
    if (isFocused) {
      if (ordersData.length === 0) fetchOrders(1);
      if (tradesData.length === 0) fetchTrades(1);
    }
  }, [isFocused]);

  const handleLoadMore = useCallback(() => {
    if (activeTab === 1 && hasMoreOrders && !loadingMore && !loadingOrders) {
      const next = ordersPage + 1;
      setOrdersPage(next);
      fetchOrders(next, true);
    } else if (activeTab === 2 && hasMoreTrades && !loadingMore && !loadingTrades) {
      const next = tradesPage + 1;
      setTradesPage(next);
      fetchTrades(next, true);
    }
  }, [activeTab, hasMoreOrders, hasMoreTrades, loadingMore, loadingOrders, loadingTrades, ordersPage, tradesPage, fetchOrders, fetchTrades]);

  const toggleExpand = useCallback((item) => {
    const id = item._id || item.id || item.order_id;
    setShowExecutedTrades(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const getSideColor = useCallback((side) => {
    const s = String(side).toUpperCase();
    if (s === "BUY") return memoizedTheme?.green ?? "#00c087";
    if (s === "SELL") return memoizedTheme?.red ?? "#ff4b5c";
    return memoizedTheme?.text ?? "#000";
  }, [memoizedTheme]);

  const onCancelPress = useCallback((item) => {
    setOrderToCancel(item);
    setIsCancelModalVisible(true);
  }, []);

  const listKeyExtractor = useCallback((item, index) => {
    const id = item?._id ?? item?.id ?? item?.trade_id;
    return id != null ? String(id) : `row_${index}`;
  }, []);

  const renderOrder = useCallback(({ item }) => (
    <OrderCard
      item={item}
      spotSelectedPair={spotSelectedPair}
      themeColors={memoizedTheme}
      onCancel={onCancelPress}
      showTrades={!!showExecutedTrades?.[item?._id || item?.id || item?.order_id]}
      onToggleExpand={toggleExpand}
      getSideColor={getSideColor}
      isDark={isDark}
    />
  ), [spotSelectedPair, memoizedTheme, onCancelPress, showExecutedTrades, toggleExpand, getSideColor, isDark]);

  const renderTrade = useCallback(({ item }) => {
    return (
      <TradeCard
        item={item}
        spotSelectedPair={spotSelectedPair}
        themeColors={memoizedTheme}
        getSideColor={getSideColor}
        isDark={isDark}
      />
    );
  }, [spotSelectedPair, memoizedTheme, getSideColor, isDark]);

  useEffect(() => {
    Animated.timing(pagerX, {
      toValue: -activeTab * screenW,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  const flatListOptimizationProps = {
    initialNumToRender: 8,
    maxToRenderPerBatch: 10,
    windowSize: 5,
    updateCellsBatchingPeriod: 50,
    removeClippedSubviews: true,
  };

  return (
    <AppSafeAreaView style={[styles.container, { backgroundColor: memoizedTheme.background ?? "#FFFFFF" }]}>
      <Toolbar isSecond title={"History"} style={{ width: "58%", backgroundColor: "transparent" }} />

      <View style={[styles.tabBar, { borderBottomColor: memoizedTheme?.themeBorderColor ?? "#EEEEEE" }]}>
        <TouchableOpacity onPress={() => setActiveTab(0)} style={[styles.tab, activeTab === 0 && { borderBottomColor: isDark ? colors.white : colors.buttonBg, borderBottomWidth: 2 }]}>
          <AppText weight={SEMI_BOLD} style={[styles.tabText, { color: activeTab === 0 ? (memoizedTheme?.text ?? "#000000") : (memoizedTheme?.secondaryText ?? "#8E8E93"), fontSize: 15 }]}>Open Orders</AppText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab(1)} style={[styles.tab, activeTab === 1 && { borderBottomColor: isDark ? colors.white : colors.buttonBg, borderBottomWidth: 2 }]}>
          <AppText weight={SEMI_BOLD} style={[styles.tabText, { color: activeTab === 1 ? (memoizedTheme?.text ?? "#000000") : (memoizedTheme?.secondaryText ?? "#8E8E93"), fontSize: 15 }]}>Orders</AppText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab(2)} style={[styles.tab, activeTab === 2 && { borderBottomColor: isDark ? colors.white : colors.buttonBg, borderBottomWidth: 2 }]}>
          <AppText weight={SEMI_BOLD} style={[styles.tabText, { color: activeTab === 2 ? (memoizedTheme?.text ?? "#000000") : (memoizedTheme?.secondaryText ?? "#8E8E93"), fontSize: 15 }]}>Trades</AppText>
        </TouchableOpacity>
      </View>

      <Animated.View style={{ flex: 1, overflow: "hidden" }}>
        <Animated.View style={{ flex: 1, flexDirection: "row", width: screenW * 3, transform: [{ translateX: pagerX }] }}>
          <View style={{ width: screenW }}>
            <FlatList
              showsVerticalScrollIndicator={false}
              data={spotOpenOrders}
              renderItem={renderOrder}
              keyExtractor={listKeyExtractor}
              contentContainerStyle={styles.ordersListContent}
              {...flatListOptimizationProps}
              ListEmptyComponent={<View style={styles.noDataRow}><FastImage source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT} style={{ width: 80, height: 80 }} resizeMode="contain" /><AppText style={{ marginTop: 10, color: memoizedTheme?.secondaryText }}>No open orders</AppText></View>}
            />
          </View>
          <View style={{ width: screenW }}>
            {loadingOrders && ordersData.length === 0 ? <TradeHistorySkeleton /> : (
              <FlatList
                showsVerticalScrollIndicator={false}
                data={ordersData}
                renderItem={renderOrder}
                keyExtractor={listKeyExtractor}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                {...flatListOptimizationProps}
                contentContainerStyle={styles.ordersListContent}
                ListEmptyComponent={<View style={styles.noDataRow}><FastImage source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT} style={{ width: 80, height: 80 }} resizeMode="contain" /><AppText style={{ marginTop: 10, color: memoizedTheme?.secondaryText }}>No data found</AppText></View>}
              />
            )}
          </View>
          <View style={{ width: screenW }}>
            {loadingTrades && tradesData.length === 0 ? <TradeHistorySkeleton /> : (
              <FlatList
                data={tradesData}
                showsVerticalScrollIndicator={false}
                renderItem={renderTrade}
                keyExtractor={listKeyExtractor}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                {...flatListOptimizationProps}
                contentContainerStyle={styles.tradesListContent}
                ListEmptyComponent={<View style={styles.noDataRow}><FastImage source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT} style={{ width: 80, height: 80 }} resizeMode="contain" /><AppText style={{ marginTop: 10, color: memoizedTheme?.secondaryText }}>No data found</AppText></View>}
              />
            )}
          </View>
        </Animated.View>
      </Animated.View>

      <ReactNativeModal isVisible={isCancelModalVisible} onBackdropPress={() => setIsCancelModalVisible(false)} style={{ margin: 0, justifyContent: "flex-end" }}>
        <View style={[styles.modalContent, { backgroundColor: memoizedTheme?.background }]}>
          <AppText style={[styles.modalTitle, { color: memoizedTheme?.text }]} weight={SEMI_BOLD}>Cancel Order?</AppText>
          <AppText style={{ textAlign: "center", color: memoizedTheme?.secondaryText, marginBottom: 24 }}>Are you sure you want to cancel this order?</AppText>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setIsCancelModalVisible(false)}><AppText style={{ color: memoizedTheme?.text }}>No, Keep it</AppText></TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.red, borderColor: colors.red }]}
              onPress={async () => {
                const orderId = orderToCancel?._id || orderToCancel?.id;
                if (!orderId) return;
                setIsCancelLoading(true);
                const res = await dispatch(cancelOrder({ order_id: orderId }));
                setIsCancelLoading(false);
                if (res?.success) {
                  setOrdersData(prev => prev.filter(o => (o._id || o.id) !== orderId));
                  setIsCancelModalVisible(false);
                }
              }}
            >
              {isCancelLoading ? <ActivityIndicator color="#fff" size="small" /> : <AppText style={{ color: "#fff" }}>Yes, Cancel</AppText>}
            </TouchableOpacity>
          </View>
        </View>
      </ReactNativeModal>
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  ordersListContent: { paddingHorizontal: 8, paddingVertical: 12, paddingBottom: 100 },
  tradesListContent: { paddingHorizontal: 8, paddingVertical: 12, paddingBottom: 100 },
  orderSpotCard: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 0,
    backgroundColor: "transparent",
  },
  orderSpotHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  orderSpotTitle: { fontSize: 16, marginRight: 6, fontWeight: "600" },
  execTradesBtnSpot: { alignSelf: "flex-end", paddingVertical: 4, paddingHorizontal: 5, borderWidth: 0.7, borderRadius: 5 },
  execTradesBtnRowSpot: { flexDirection: "row", alignItems: "center" },
  orderHistoryChevronSpot: { width: 10, height: 10, marginTop: 2 },
  execTradesBtnTextSpot: { fontSize: 12, fontWeight: "600" },
  execTradesBoxSpot: { marginTop: 8, backgroundColor: "rgba(128, 128, 128, 0.08)", paddingVertical: 8, paddingHorizontal: 8, borderRadius: 8 },
  execTradeItemSpot: { backgroundColor: "transparent", borderBottomWidth: 1, borderBottomColor: "rgba(128, 128, 128, 0.15)", paddingVertical: 6, paddingHorizontal: 4, marginBottom: 0 },
  execTradeHeaderRowSpot: { marginBottom: 4 },
  execTradeHeaderTextSpot: { fontSize: 12 },
  execTradeKvRowSpot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 1 },
  execTradeKvKSpot: { fontSize: 15, flex: 1 },
  execTradeKvVSpot: { fontSize: 15, flex: 1, textAlign: "right" },
  orderSpotDivider: { height: 1.5, marginTop: 12, marginBottom: 0 },
  tradeFillCard: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 0,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.iconBgColor,
    backgroundColor: "transparent",
  },
  detailsContainer: { gap: 5 },
  tradeKvRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  tradeKvK: { flex: 1 },
  tradeKvV: { flex: 2, textAlign: "right" },
  tabBar: { flexDirection: "row", height: 44, borderBottomWidth: 1 },
  tab: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabText: { fontSize: 15, fontWeight: "600" },
  pairRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  actionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingBottom: 16 },
  cancelBtn: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 4, borderWidth: 1, borderColor: colors.red },
  noDataRow: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 100 },
  modalContent: { padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { fontSize: 17, textAlign: "center", marginBottom: 12 },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  modalBtn: { flex: 1, height: 48, borderRadius: 10, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#eee" },
});

export default TradeHistory;
