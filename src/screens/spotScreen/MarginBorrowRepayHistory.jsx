import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
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
import { colors, darkTheme } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";
import FastImage from "react-native-fast-image";
import { NO_NOTIFICATION_ICON, NO_NOTIFICATION_ICON_LIGHT, right_ic } from "../../helper/ImageAssets";
import { appOperation } from "../../appOperation";
import moment from "moment";
import TradeHistorySkeleton from "../account/TradeHistorySkeleton";

const { width: screenW } = Dimensions.get("window");

function dec(v) {
  if (v == null) return null;
  if (typeof v === "object" && v.$numberDecimal != null) return v.$numberDecimal;
  return v;
}

function safeToFixed8(val, fallback = "0", decimals = 8) {
  const n = parseFloat(dec(val));
  if (!Number.isFinite(n)) return fallback;
  return parseFloat(n.toFixed(decimals)).toString();
}

function formatPair(raw) {
  if (!raw) return "—";
  const str = String(raw).toUpperCase();
  if (str.includes("/")) return str;
  if (str.includes("_")) return str.replace("_", "/");
  if (str.length >= 6) {
    const known = ["USDT", "USDC", "BTC", "ETH", "BNB"];
    for (const q of known) {
      if (str.endsWith(q)) return `${str.slice(0, str.length - q.length)}/${q}`;
    }
  }
  return str;
}

const TradeKvRow = React.memo(({ label, value, color, textColor, secColor }) => (
  <View style={styles.tradeKvRow}>
    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.tradeKvK, { color: secColor }]}>{label}</AppText>
    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.tradeKvV, { color: color ?? textColor }]} numberOfLines={3}>
      {value}
    </AppText>
  </View>
));

const HistoryCard = React.memo(({ item, tabType, themeColors }) => {
  const textColor = themeColors.text;
  const secColor = themeColors.secondaryText;

  // Try to parse the time
  const timeRaw = item?.created_at || item?.time || item?.updated_at;
  const eventM = timeRaw ? moment(timeRaw) : null;
  const dateStr = eventM?.isValid() ? eventM.format("DD/MM/YYYY") : "—";
  const timeStr = eventM?.isValid() ? eventM.format("HH:mm:ss") : "—";
  const headerDateTime = eventM?.isValid() ? eventM.format("DD/MM/YYYY HH:mm:ss") : "—";

  const rawPair = item?.pair || item?.contract || item?.asset || "—";
  const pair = formatPair(rawPair);
  const coin = item?.asset || item?.coin || "—";
  const status = item?.metadata?.fully_repaid === false ? "Partial" : "Completed";

  return (
    <View style={[styles.historyCard, { backgroundColor: themeColors.background }]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <AppText type={FIFTEEN} weight={BOLD} style={{ color: textColor }}>
              {pair}
            </AppText>
            {/* <FastImage source={right_ic} style={{ width: 12, height: 12, marginLeft: 4 }} resizeMode="contain" tintColor={isDark ? "#8E8E93" : "#666666"} /> */}
          </View>
          <AppText type={FIFTEEN} weight={MEDIUM} style={{ color: secColor, marginTop: 4 }}>{headerDateTime}</AppText>
        </View>
        <AppText style={{ color: themeColors.green ?? colors.green, fontWeight: "600" }}>{status}</AppText>
      </View>

      <View style={styles.detailsContainer}>
        <TradeKvRow label="Coin" value={coin} textColor={textColor} secColor={secColor} />

        {tabType === "interest" ? (
          <>
            <TradeKvRow label="Loan Amount" value={safeToFixed8(item?.loan_amount || item?.debt_outstanding)} textColor={textColor} secColor={secColor} />
            <TradeKvRow label="Amount Charged" value={safeToFixed8(item?.amount_charged || item?.amount || item?.interest_amount)} textColor={textColor} secColor={secColor} />
            <TradeKvRow
              label="Hourly Rate"
              value={item?.interest_rate_daily != null ? `${((item.interest_rate_daily / 24) * 100).toFixed(7)}%` : "—"}
              textColor={textColor}
              secColor={secColor}
            />
            <TradeKvRow
              label="APR"
              value={item?.interest_rate_daily != null ? `${(item.interest_rate_daily * 100).toFixed(4)}%` : "—"}
              textColor={textColor}
              secColor={secColor}
            />
          </>
        ) : (
          <TradeKvRow label="Amount" value={safeToFixed8(Math.abs(parseFloat(item?.amount) || 0))} textColor={textColor} secColor={secColor} />
        )}
      </View>
      <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
    </View>
  );
});

const MarginBorrowRepayHistory = ({ route }) => {
  const { isDark, colors: themeColors } = useTheme();
  const memoizedTheme = themeColors;
  const inputBgColor = isDark ? darkTheme.darkThemeInputColor : "#F7F7F9";
  const isFocused = useIsFocused();

  // Route params could specify if it's cross margin or isolated
  const isCross = route?.params?.isCross ?? false;
  const pairId = route?.params?.pairId; // For isolated margin filtering

  const [activeTab, setActiveTab] = useState("borrow"); // borrow, repay, interest, date
  const [startDate, setStartDate] = useState(moment().subtract(1, "months")); // moment object
  const [endDate, setEndDate] = useState(moment()); // moment object
  const [datePickerTarget, setDatePickerTarget] = useState(null); // 'start' | 'end' | null

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const limit = 20;

  const fetchData = useCallback(async (pageNum = 1, isLoadMore = false) => {
    if (loading || (isLoadMore && loadingMore)) return;
    if (isLoadMore) setLoadingMore(true); else setLoading(true);

    try {
      let from, to;
      if (startDate) {
        from = startDate.startOf('day').toISOString();
      }
      if (endDate) {
        to = endDate.endOf('day').toISOString();
      }

      const opts = { page: pageNum, limit, from, to, start_date: from, end_date: to };
      if (!isCross && pairId) opts.pairId = pairId;

      console.log(`[MarginHistory] Fetching: tab=${activeTab}, isCross=${isCross}, opts=`, opts);

      let res;
      const apiTab = activeTab === "date" ? "borrow" : activeTab;

      if (isCross) {
        if (apiTab === "borrow") {
          res = await appOperation.customer.crossBorrowHistory(opts);
        } else if (apiTab === "repay") {
          res = await appOperation.customer.crossRepayHistory(opts);
        } else {
          res = await appOperation.customer.crossInterestHistory(opts);
        }
      } else {
        if (apiTab === "borrow") {
          res = await appOperation.customer.marginBorrowHistory(opts);
        } else if (apiTab === "repay") {
          res = await appOperation.customer.marginRepayHistory(opts);
        } else {
          res = await appOperation.customer.marginInterestHistory(opts);
        }
      }

      console.log(`[MarginHistory] Response:`, res?.success, res?.data?.length);

      if (res?.success) {
        const items = res.data || [];
        if (isLoadMore) {
          setData(prev => [...prev, ...items]);
        } else {
          setData(items);
        }
        setHasMore(items.length >= limit);
      } else {
        if (!isLoadMore) setData([]);
        setHasMore(false);
      }
    } catch (e) {
      console.log(`[MarginHistory] Error:`, e);
      if (!isLoadMore) setData([]);
      setHasMore(false);
    } finally {
      if (isLoadMore) setLoadingMore(false); else setLoading(false);
    }
  }, [activeTab, startDate, endDate, isCross, pairId, loading, loadingMore]);

  useEffect(() => {
    if (isFocused) {
      setPage(1);
      fetchData(1);
    }
  }, [activeTab, startDate, endDate, isFocused]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loading) {
      const next = page + 1;
      setPage(next);
      fetchData(next, true);
    }
  }, [hasMore, loadingMore, loading, page, fetchData]);

  const listKeyExtractor = useCallback((item, index) => {
    const id = item?._id ?? item?.id ?? item?.created_at;
    return id != null ? String(id) : `row_${index}`;
  }, []);

  const renderItem = useCallback(({ item }) => (
    <HistoryCard item={item} tabType={activeTab} themeColors={memoizedTheme} />
  ), [activeTab, memoizedTheme]);

  return (
    <AppSafeAreaView style={[styles.container, { backgroundColor: memoizedTheme.background }]}>
      <Toolbar isSecond title={isCross ? "Cross Margin History" : "Isolated Margin History"} style={{ width: '75%', backgroundColor: "transparent" }} />

      <View style={[styles.tabBar, { borderBottomColor: memoizedTheme.themeBorderColor }]}>
        <TouchableOpacity onPress={() => { if (activeTab === "date") { setStartDate(moment().subtract(1, "months")); setEndDate(moment()); } setActiveTab("borrow"); }} style={styles.tab}>
          <AppText weight={SEMI_BOLD} style={[styles.tabText, { color: activeTab === "borrow" ? memoizedTheme.text : memoizedTheme.secondaryText }]}>Borrow</AppText>
          {activeTab === "borrow" && <View style={[styles.activeTabIndicator, { backgroundColor: memoizedTheme.button }]} />}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { if (activeTab === "date") { setStartDate(moment().subtract(1, "months")); setEndDate(moment()); } setActiveTab("repay"); }} style={styles.tab}>
          <AppText weight={SEMI_BOLD} style={[styles.tabText, { color: activeTab === "repay" ? memoizedTheme.text : memoizedTheme.secondaryText }]}>Repay</AppText>
          {activeTab === "repay" && <View style={[styles.activeTabIndicator, { backgroundColor: memoizedTheme.button }]} />}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { if (activeTab === "date") { setStartDate(moment().subtract(1, "months")); setEndDate(moment()); } setActiveTab("interest"); }} style={styles.tab}>
          <AppText weight={SEMI_BOLD} style={[styles.tabText, { color: activeTab === "interest" ? memoizedTheme.text : memoizedTheme.secondaryText }]}>Interest</AppText>
          {activeTab === "interest" && <View style={[styles.activeTabIndicator, { backgroundColor: memoizedTheme.button }]} />}
        </TouchableOpacity>
        {/* <TouchableOpacity onPress={() => setActiveTab("date")} style={styles.tab}>
          <AppText weight={SEMI_BOLD} style={[styles.tabText, { color: activeTab === "date" ? (memoizedTheme?.text ?? "#000000") : (memoizedTheme?.secondaryText ?? "#8E8E93") }]}>Date</AppText>
          {activeTab === "date" && <View style={styles.activeTabIndicator} />}
        </TouchableOpacity> */}
      </View>

      {activeTab === "date" && (
        <View style={styles.dateFilterContainer}>
          <TouchableOpacity onPress={() => setDatePickerTarget("start")} style={[styles.dateFilterBtn, { backgroundColor: inputBgColor }]}>
            <AppText weight={MEDIUM} style={{ color: memoizedTheme.text }}>
              {startDate ? startDate.format("YYYY-MM-DD") : "From Date"}
            </AppText>
          </TouchableOpacity>
          <AppText style={{ color: memoizedTheme.secondaryText, marginHorizontal: 8 }}>—</AppText>
          <TouchableOpacity onPress={() => setDatePickerTarget("end")} style={[styles.dateFilterBtn, { backgroundColor: inputBgColor }]}>
            <AppText weight={MEDIUM} style={{ color: memoizedTheme.text }}>
              {endDate ? endDate.format("YYYY-MM-DD") : "To Date"}
            </AppText>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ flex: 1 }}>
        {loading && data.length === 0 ? <TradeHistorySkeleton /> : (
          <FlatList
            showsVerticalScrollIndicator={false}
            data={data}
            renderItem={renderItem}
            keyExtractor={listKeyExtractor}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            initialNumToRender={8}
            windowSize={5}
            removeClippedSubviews={true}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.noDataRow}>
                <FastImage source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT} style={{ width: 80, height: 80 }} resizeMode="contain" />
                <AppText style={{ marginTop: 10, color: memoizedTheme.secondaryText }}>No data found</AppText>
              </View>
            }
          />
        )}
      </View>

      <DateTimePickerModal
        isVisible={!!datePickerTarget}
        mode="date"
        date={
          datePickerTarget === "start" && startDate ? startDate.toDate() :
            datePickerTarget === "end" && endDate ? endDate.toDate() :
              new Date()
        }
        onConfirm={(date) => {
          if (datePickerTarget === "start") setStartDate(moment(date));
          if (datePickerTarget === "end") setEndDate(moment(date));
          setDatePickerTarget(null);
        }}
        onCancel={() => setDatePickerTarget(null)}
        maximumDate={new Date()}
        buttonTextColorIOS={memoizedTheme.text}
        accentColor={memoizedTheme.button}
        isDarkModeEnabled={isDark}
        themeVariant={isDark ? "dark" : "light"}
      />
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 8, paddingVertical: 12, paddingBottom: 100 },
  historyCard: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "transparent",
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  divider: { height: 1.5, marginTop: 12, marginBottom: 4 },
  detailsContainer: { gap: 5 },
  tradeKvRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8, paddingVertical: 2 },
  tradeKvK: { flex: 1 },
  tradeKvV: { flex: 2, textAlign: "right" },
  tabBar: { flexDirection: "row", height: 48, borderBottomWidth: 1 },
  tab: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabText: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  activeTabIndicator: {
    height: 3,
    width: 24,
    borderRadius: 2,
    position: "absolute",
    bottom: -1,
  },
  dateFilterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  dateFilterBtn: {
    flex: 1,
    height: 36,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  noDataRow: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 100 },
});

export default MarginBorrowRepayHistory;
