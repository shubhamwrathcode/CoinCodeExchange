import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  
  ScrollView,
  Platform} from "react-native";
import FastImage from "react-native-fast-image";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import {
  AppText,
  SEMI_BOLD,
  MEDIUM,
  BOLD,
  FOURTEEN,
  FIFTEEN,
  TWELVE,
} from "../../shared";
import { useTheme } from "../../hooks/useTheme";
import { colors, darkTheme } from "../../theme/colors";
import { back_ic, NO_NOTIFICATION_ICON, NO_NOTIFICATION_ICON_LIGHT, filterIcon, REMOVE, calendarIcon } from "../../helper/ImageAssets";
import { appOperation } from "../../appOperation";
import { CUSTOMER_TYPE } from "../../appOperation/types";
import moment from "moment";
import RBSheet from "react-native-raw-bottom-sheet";
import TradeHistorySkeleton from "../account/TradeHistorySkeleton";
import CustomDropdown from "../../common/CustomDropdown";
import DateTimePickerModal from "react-native-modal-datetime-picker";

// ─── Constants ────────────────────────────────────────────────────────────────

const DIRECTION_LABELS = {
  TO_MARGIN: "To Isolated Margin",
  FROM_MARGIN: "From Isolated Margin",
  TO_CROSS: "To Cross Margin",
  FROM_CROSS: "From Cross Margin",
};

const ACCOUNT_OPTIONS = ["Isolated Margin", "Cross Margin"];
const DIRECTION_OPTIONS = ["All", "To Margin", "From Margin"];

const LIMIT = 20;

function formatPair(raw) {
  if (!raw) return "—";
  if (raw.includes("/")) return raw;
  if (raw.length >= 6) {
    const known = ["USDT", "BTC", "ETH", "BNB", "USDC"];
    for (const q of known) {
      if (raw.endsWith(q)) return `${raw.slice(0, raw.length - q.length)}/${q}`;
    }
  }
  return raw;
}

function fmtWallet(val) {
  const s = String(val || "").toLowerCase();
  if (s.includes("spot")) return "Spot Wallet";
  if (s.includes("main")) return "Main Wallet";
  if (s.includes("cross")) return "Cross Margin";
  if (s.includes("margin") || s.includes("isolated")) return "Margin Account";
  return val ? String(val).charAt(0).toUpperCase() + String(val).slice(1) : "—";
}

function fmtDirection(v) {
  if (!v) return "—";
  return DIRECTION_LABELS[v] ?? String(v);
}

function fmtAmount(amount) {
  if (amount == null || amount === "") return "—";
  const n = parseFloat(amount);
  if (!Number.isFinite(n)) return String(amount);
  return parseFloat(n.toFixed(8)).toString();
}

function fmtDate(iso) {
  if (!iso) return "—";
  const m = moment(iso);
  return m.isValid() ? m.format("DD/MM/YYYY, HH:mm:ss") : String(iso);
}

function mapMarginRow(raw, idx) {
  const direction = raw.direction ?? raw.type;
  let from = raw.from_wallet ?? raw.from ?? "";
  let to = raw.to_wallet ?? raw.to ?? "";

  if (!from && !to && direction) {
    if (String(direction).startsWith("TO_")) { from = "spot"; to = "margin"; }
    else if (String(direction).startsWith("FROM_")) { from = "margin"; to = "spot"; }
  }

  const coin = String(raw.asset ?? raw.coin ?? "").toUpperCase();
  return {
    id: raw.transfer_id ?? raw.id ?? raw._id ?? `m-${idx}`,
    date: fmtDate(raw.created_at ?? raw.time),
    coin,
    amount: fmtAmount(raw.amount),
    from: fmtWallet(from),
    to: fmtWallet(to),
    direction: fmtDirection(direction),
    pair: formatPair(raw.contract ?? raw.pair ?? ""),
  };
}

function mapCrossRow(raw, idx) {
  const direction = raw.direction ?? raw.type;
  let from = raw.from_wallet ?? raw.from ?? "";
  let to = raw.to_wallet ?? raw.to ?? "";

  if (!from && !to && direction) {
    if (String(direction).startsWith("TO_")) { from = "spot"; to = "cross_margin"; }
    else if (String(direction).startsWith("FROM_")) { from = "cross_margin"; to = "spot"; }
  }

  const coin = String(raw.asset ?? raw.coin ?? "").toUpperCase();
  return {
    id: raw.transfer_id ?? raw.id ?? raw._id ?? `c-${idx}`,
    date: fmtDate(raw.created_at ?? raw.time),
    coin,
    amount: fmtAmount(raw.amount),
    from: fmtWallet(from),
    to: fmtWallet(to),
    direction: fmtDirection(direction),
    pair: formatPair(raw.asset ?? raw.pair ?? raw.contract ?? ""),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const TradeKvRow = React.memo(({ label, value, color, secColor }) => {
  return (
    <View style={styles.tradeKvRow}>
      <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: secColor }}>{label}</AppText>
      <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: color }} numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
});

const HistoryCard = React.memo(({ item, themeColors, isDark }) => {
  const textColor = themeColors.text;
  const secColor = themeColors.secondaryText;

  const isTo = item.direction?.startsWith("To");
  const directionColor = item.direction && item.direction !== "—"
    ? (isTo ? (themeColors.green ?? colors.green) : (themeColors.red ?? colors.red))
    : textColor;

  return (
    <View style={[styles.historyCard, { backgroundColor: "transparent" }]}>
      {/* Pair Header */}
      <View style={styles.headerRow}>
        <AppText weight={BOLD} style={{ fontSize: 15, color: textColor }}>
          {(item.pair && item.pair !== "—") ? item.pair : item.coin}
        </AppText>
      </View>

      {/* Detail rows */}
      <View style={styles.detailsContainer}>
        <TradeKvRow label="Time" value={item.date} color={textColor} secColor={secColor} />
        <TradeKvRow label="Coin" value={item.coin} color={textColor} secColor={secColor} />
        <TradeKvRow label="Amount" value={item.amount} color={textColor} secColor={secColor} />
        <TradeKvRow label="Direction" value={item.direction} color={directionColor} secColor={secColor} />
        <TradeKvRow label="From" value={item.from} color={secColor} secColor={secColor} />
        <TradeKvRow label="To" value={item.to} color={secColor} secColor={secColor} />
      </View>
      <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
    </View>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const MarginTransferHistoryScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { colors: themeColors, isDark } = useTheme();
  const inputBgColor = isDark ? darkTheme.darkThemeInputColor : "#F2F2F7";
  const dropdownTriggerStyle = {
    backgroundColor: inputBgColor,
    borderColor: themeColors.themeBorderColor,
  };

  // Applied Filters
  const [accountType, setAccountType] = useState("Isolated Margin");
  const [direction, setDirection] = useState("All");
  const [contract, setContract] = useState("All");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // Temporary Filters for Bottom Sheet
  const filterSheetRef = useRef(null);
  const [tempAccountType, setTempAccountType] = useState(accountType);
  const [tempDirection, setTempDirection] = useState(direction);
  const [tempContract, setTempContract] = useState(contract);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);
  const [openDropdown, setOpenDropdown] = useState(null);

  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState("start");

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [rawAccounts, setRawAccounts] = useState([]);
  const [contractOptions, setContractOptions] = useState(["All"]);

  useEffect(() => {
    appOperation.customer.margin_accounts()
      .then((res) => {
        const data = res?.data || [];
        setRawAccounts(data);
        const opts = data
          .filter(a => a.base_asset && a.quote_asset)
          .map(a => `${a.base_asset}/${a.quote_asset}`);
        opts.sort((a, b) => a.localeCompare(b));
        setContractOptions(["All", ...opts]);
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
  }, [accountType, direction, startDate, endDate]);

  const fetchData = useCallback(async (pageNum = 1, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      let res;
      let items = [];

      const resolvedPairId = contract === "All"
        ? undefined
        : rawAccounts.find(a => `${a.base_asset}/${a.quote_asset}` === contract)?.pair_id;

      if (accountType === "Isolated Margin") {
        let dir = "all";
        if (direction === "To Margin") dir = "TO_MARGIN";
        if (direction === "From Margin") dir = "FROM_MARGIN";

        const fromQuery = startDate ? `&from=${moment(startDate).format("YYYY-MM-DD")}T00:00:00.000Z` : "";
        const toQuery = endDate ? `&to=${moment(endDate).format("YYYY-MM-DD")}T23:59:59.999Z` : "";
        const pairQuery = resolvedPairId ? `&pairId=${resolvedPairId}` : "";

        res = await appOperation.get(
          `margin/history/transfer?page=${pageNum}&limit=${LIMIT}${dir !== "all" ? `&direction=${dir}` : ""}${pairQuery}${fromQuery}${toQuery}`,
          undefined, undefined, CUSTOMER_TYPE
        );
        const raw = res?.data?.transfers ?? (Array.isArray(res?.data) ? res.data : []);
        items = raw.map(mapMarginRow);
      } else {
        let dir = "all";
        if (direction === "To Margin") dir = "TO_CROSS";
        if (direction === "From Margin") dir = "FROM_CROSS";

        res = await appOperation.customer.crossTransferHistory({
          page: pageNum,
          limit: LIMIT,
          direction: dir !== "all" ? dir : undefined,
        });
        const raw = res?.data?.transfers ?? (Array.isArray(res?.data) ? res.data : []);
        items = raw.map(mapCrossRow);
      }

      if (append) setData(prev => [...prev, ...items]); else setData(items);
      setHasMore(items.length >= LIMIT);

    } catch (e) {
      console.log(e);
      if (!append) setData([]);
      setHasMore(false);
    } finally {
      if (append) setLoadingMore(false); else setLoading(false);
    }
  }, [accountType, direction, startDate, endDate, contract, rawAccounts]);

  useEffect(() => {
    if (isFocused) { setPage(1); fetchData(1, false); }
  }, [accountType, direction, startDate, endDate, contract, isFocused]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loading) {
      const next = page + 1;
      setPage(next);
      fetchData(next, true);
    }
  }, [hasMore, loadingMore, loading, page, fetchData]);

  const openFilterSheet = () => {
    setOpenDropdown(null);
    setTempAccountType(accountType);
    setTempDirection(direction);
    setTempContract(contract);
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    filterSheetRef.current?.open();
  };

  const closeFilterSheet = () => {
    setOpenDropdown(null);
    filterSheetRef.current?.close();
  };

  const handleApplyFilters = () => {
    setAccountType(tempAccountType);
    setDirection(tempDirection);
    setContract(tempContract);
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    closeFilterSheet();
  };

  const handleResetFilters = () => {
    setTempAccountType("Isolated Margin");
    setTempDirection("All");
    setTempContract("All");
    setTempStartDate(null);
    setTempEndDate(null);
  };

  const handleDateConfirm = (date) => {
    if (datePickerTarget === "start") setTempStartDate(date);
    else setTempEndDate(date);
    setDatePickerVisible(false);
  };

  const keyExtractor = useCallback((item, idx) => item?.id != null ? String(item.id) : `row_${idx}`, []);

  const renderItem = useCallback(({ item }) => (
    <HistoryCard item={item} themeColors={themeColors} isDark={isDark} />
  ), [themeColors, isDark]);

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.noDataRow}>
        <FastImage
          source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT}
          style={{ width: 100, height: 100, marginBottom: 12 }}
          resizeMode="contain"
        />
        {/* <AppText style={{ color: themeColors.secondaryText, fontSize: 14 }}>No transfer records found</AppText> */}
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return <View style={{ height: 40 }} />;
    return <TradeHistorySkeleton />;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background ?? "#FFFFFF" }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <FastImage source={back_ic} style={{ width: 20, height: 20 }} resizeMode="contain" tintColor={themeColors.text} />
        </TouchableOpacity>
        <AppText weight={SEMI_BOLD} style={{ fontSize: 18, color: themeColors.text }}>Margin Transfer History</AppText>
        <TouchableOpacity onPress={openFilterSheet} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <FastImage source={filterIcon} style={{ width: 20, height: 20 }} resizeMode="contain" tintColor={themeColors.text} />
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <TradeHistorySkeleton />
      ) : (
        <FlatList
          data={data}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Filter Bottom Sheet */}
      <RBSheet
        ref={filterSheetRef}
        height={650}
        openDuration={250}
        closeOnDragDown
        closeOnPressMask
        customModalProps={{ statusBarTranslucent: true }}
        customStyles={{
          container: {
            backgroundColor: themeColors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 16,
          },
          draggableIcon: { backgroundColor: isDark ? "#374151" : "#E5E7EB", width: 40 },
        }}
      >
        <View style={styles.sheetHeader}>
          <AppText weight={SEMI_BOLD} style={{ fontSize: 18, color: themeColors.text }}>Filters</AppText>

        </View>

        <ScrollView style={{ paddingHorizontal: 20 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 250 }}>
          {/* Account */}
          <View style={[styles.filterSection, { zIndex: 4000 }]}>
            <AppText style={[styles.filterLabel, { color: themeColors.secondaryText }]}>Account</AppText>
            <CustomDropdown
              data={ACCOUNT_OPTIONS}
              selected={tempAccountType}
              onSelect={setTempAccountType}
              triggerStyle={dropdownTriggerStyle}
              isOpen={openDropdown === "account"}
              onToggle={(val) => setOpenDropdown(val ? "account" : null)}
            />
          </View>

          {/* Direction */}
          <View style={[styles.filterSection, { zIndex: 3000 }]}>
            <AppText style={[styles.filterLabel, { color: themeColors.secondaryText }]}>Direction</AppText>
            <CustomDropdown
              data={DIRECTION_OPTIONS}
              selected={tempDirection}
              onSelect={setTempDirection}
              triggerStyle={dropdownTriggerStyle}
              isOpen={openDropdown === "direction"}
              onToggle={(val) => setOpenDropdown(val ? "direction" : null)}
            />
          </View>

          {/* Contract */}
          <View style={[styles.filterSection, { zIndex: 2000 }]}>
            <AppText style={[styles.filterLabel, { color: themeColors.secondaryText }]}>Contract</AppText>
            <CustomDropdown
              data={contractOptions}
              selected={tempContract}
              onSelect={setTempContract}
              triggerStyle={dropdownTriggerStyle}
              isOpen={openDropdown === "contract"}
              onToggle={(val) => setOpenDropdown(val ? "contract" : null)}
            />
          </View>

          {/* Date */}
          <View style={[styles.filterSection, { zIndex: 1000 }]}>
            <AppText style={[styles.filterLabel, { color: themeColors.secondaryText }]}>Date</AppText>
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={[styles.dateInput, { borderColor: themeColors.themeBorderColor, backgroundColor: inputBgColor }]}
                onPress={() => { setDatePickerTarget("start"); setDatePickerVisible(true); }}
              >
                <AppText style={{ color: tempStartDate ? themeColors.text : themeColors.secondaryText, fontSize: 13 }}>
                  {tempStartDate ? moment(tempStartDate).format("YYYY-MM-DD") : "YYYY-MM-DD"}
                </AppText>
              </TouchableOpacity>
              <AppText style={{ color: themeColors.secondaryText, marginHorizontal: 8 }}>→</AppText>
              <TouchableOpacity
                style={[styles.dateInput, { borderColor: themeColors.themeBorderColor, backgroundColor: inputBgColor }]}
                onPress={() => { setDatePickerTarget("end"); setDatePickerVisible(true); }}
              >
                <AppText style={{ color: tempEndDate ? themeColors.text : themeColors.secondaryText, fontSize: 13 }}>
                  {tempEndDate ? moment(tempEndDate).format("YYYY-MM-DD") : "YYYY-MM-DD"}
                </AppText>
              </TouchableOpacity>
              {/* <TouchableOpacity
                style={[styles.calendarBtn, { borderColor: themeColors.border }]}
                onPress={() => { setDatePickerTarget("start"); setDatePickerVisible(true); }}
              >
                <FastImage source={calendarIcon} style={{ width: 16, height: 16 }} tintColor={themeColors.secondaryText} resizeMode="contain" />
              </TouchableOpacity> */}
            </View>
          </View>
        </ScrollView>

        <View style={[styles.sheetFooter, { borderTopColor: themeColors.border }]}>
          <TouchableOpacity style={[styles.footerBtn, { backgroundColor: isDark ? darkTheme.darkThemeInputColor : "rgba(0,0,0,0.05)" }]} onPress={handleResetFilters}>
            <AppText weight={SEMI_BOLD} style={{ color: themeColors.text }}>Reset</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.footerBtn, { backgroundColor: themeColors.button }]} onPress={handleApplyFilters}>
            <AppText weight={SEMI_BOLD} style={{ color: "#FFF" }}>Search</AppText>
          </TouchableOpacity>
        </View>
      </RBSheet>

      <DateTimePickerModal
        isVisible={datePickerVisible}
        mode="date"
        display="spinner"
        {...(Platform.OS === "ios" && {
          themeVariant: isDark ? "dark" : "light",
          textColor: isDark ? "#FFFFFF" : "#000000",
        })}
        onConfirm={handleDateConfirm}
        onCancel={() => setDatePickerVisible(false)}
        date={datePickerTarget === "start" ? (tempStartDate || new Date()) : (tempEndDate || new Date())}
      />
    </SafeAreaView>
  );
};

export default MarginTransferHistoryScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  listContent: { paddingHorizontal: 16, paddingVertical: 4, paddingBottom: 100, flexGrow: 1 },
  historyCard: {
    paddingTop: 16,
  },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  detailsContainer: { gap: 14 },
  tradeKvRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  divider: { height: 1, marginTop: 16, width: "100%" },
  noDataRow: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 100 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 20 },
  filterSection: { marginBottom: 24 },
  filterLabel: { fontSize: 13, marginBottom: 8 },
  dateRow: { flexDirection: "row", alignItems: "center" },
  dateInput: { flex: 1, height: 44, borderWidth: 1, borderRadius: 8, justifyContent: "center", paddingHorizontal: 12 },
  calendarBtn: { width: 44, height: 44, borderWidth: 1, borderRadius: 8, justifyContent: "center", alignItems: "center", marginLeft: 8 },
  sheetFooter: { flexDirection: "row", padding: 20, paddingTop: 16, borderTopWidth: 1, gap: 12 },
  footerBtn: { flex: 1, height: 48, borderRadius: 8, justifyContent: "center", alignItems: "center" },
});
