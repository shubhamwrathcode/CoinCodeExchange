import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  TouchableOpacity,
  FlatList,
  StyleSheet,

  ScrollView
} from "react-native";
import FastImage from "react-native-fast-image";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import {
  AppText,
  SEMI_BOLD,
  BOLD,
  FOURTEEN,
} from "../../shared";
import { useTheme } from "../../hooks/useTheme";
import { colors, lightTheme } from "../../theme/colors";
import { back_ic, NO_NOTIFICATION_ICON, NO_NOTIFICATION_ICON_LIGHT, filterIcon, REMOVE, calendarIcon } from "../../helper/ImageAssets";
import { appOperation } from "../../appOperation";
import { CUSTOMER_TYPE } from "../../appOperation/types";
import moment from "moment";
import RBSheet from "react-native-raw-bottom-sheet";
import TradeHistorySkeleton from "../account/TradeHistorySkeleton";
import { useAppSelector } from "../../store/hooks";
import CustomDropdown from "../../common/CustomDropdown";

// ─── Constants ────────────────────────────────────────────────────────────────

const WALLET_OPTIONS = ["All", "Main Wallet", "Spot Wallet", "Futures Wallet", "Margin Wallet"];

function mapWalletLabelToKey(label) {
  if (label === "All") return "all";
  if (label === "Main Wallet") return "main";
  if (label === "Spot Wallet") return "spot";
  if (label === "Futures Wallet") return "futures";
  if (label === "Margin Wallet") return "margin";
  return "all";
}

const LIMIT = 20;

function fmtWallet(val) {
  const s = String(val || "").toLowerCase();
  if (s.includes("spot")) return "Spot Wallet";
  if (s.includes("main")) return "Main Wallet";
  if (s.includes("p2p")) return "P2P Wallet";
  if (s.includes("future")) return "Futures Wallet";
  if (s.includes("cross")) return "Cross Margin";
  if (s.includes("margin") || s.includes("isolated")) return "Margin Account";
  return val ? String(val).charAt(0).toUpperCase() + String(val).slice(1) : "—";
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

function mapAllRow(raw, idx) {
  const from = raw.from_wallet ?? raw.fromWallet ?? "";
  const to = raw.to_wallet ?? raw.toWallet ?? "";
  const coin = String(raw.short_name ?? raw.coin ?? raw.asset ?? "").toUpperCase();
  const created = raw.createdAt ?? raw.created_at ?? "";
  return {
    id: raw.id ?? raw._id ?? `r-${idx}-${created}`,
    date: fmtDate(created),
    coin,
    amount: fmtAmount(raw.amount),
    from: fmtWallet(from),
    to: fmtWallet(to),
    direction: null,
    pair: "—",
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const TradeKvRow = React.memo(({ label, value, color, secColor }) => {
  if (!value) return null;
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
  const textColor = themeColors.text ?? "#000000";
  const secColor = isDark ? "#8E8E93" : "#666666";

  return (
    <View style={[styles.historyCard, { backgroundColor: "transparent", borderColor: isDark ? themeColors.border : lightTheme.input }]}>
      {/* Pair / Coin Header */}
      <View style={styles.headerRow}>
        <AppText weight={BOLD} style={{ fontSize: 15, color: textColor }}>
          {item.coin || "—"}
        </AppText>
      </View>

      {/* Detail rows */}
      <View style={styles.detailsContainer}>
        <TradeKvRow label="Time" value={item.date} color={textColor} secColor={secColor} />
        <TradeKvRow label="Coin" value={item.coin} color={textColor} secColor={secColor} />
        <TradeKvRow label="Amount" value={item.amount} color={textColor} secColor={secColor} />
        <TradeKvRow label="From" value={item.from} color={secColor} secColor={secColor} />
        <TradeKvRow label="To" value={item.to} color={secColor} secColor={secColor} />
      </View>
    </View>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const TransferHistoryScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { colors: themeColors, isDark } = useTheme();

  const userWallet = useAppSelector((state) => state.wallet?.userWallet || []);

  const coinOptions = React.useMemo(() => {
    const options = ["All"];
    if (Array.isArray(userWallet)) {
      const uniqueCoins = new Set();
      userWallet.forEach(item => {
        if (item?.short_name) {
          uniqueCoins.add(item.short_name.toUpperCase());
        }
      });
      options.push(...Array.from(uniqueCoins).sort());
    }
    return options;
  }, [userWallet]);

  // Applied Filters
  const [fromWallet, setFromWallet] = useState("All");
  const [toWallet, setToWallet] = useState("All");
  const [coin, setCoin] = useState("All");

  // Temporary Filters for Bottom Sheet
  const filterSheetRef = useRef(null);
  const [tempFromWallet, setTempFromWallet] = useState(fromWallet);
  const [tempToWallet, setTempToWallet] = useState(toWallet);
  const [tempCoin, setTempCoin] = useState(coin);
  const [openDropdown, setOpenDropdown] = useState(null);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
  }, [fromWallet, toWallet, coin]);

  const fetchData = useCallback(async (pageNum = 1, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const skip = (pageNum - 1) * LIMIT;
      let url = `wallet/wallet-transfer-history?skip=${skip}&limit=${LIMIT}`;

      const fromKey = mapWalletLabelToKey(fromWallet);
      const toKey = mapWalletLabelToKey(toWallet);

      if (fromKey !== "all") url += `&from_wallet=${fromKey}`;
      if (toKey !== "all") url += `&to_wallet=${toKey}`;
      if (coin !== "All") url += `&currency=${coin}`;

      const res = await appOperation.get(url, undefined, undefined, CUSTOMER_TYPE);
      const raw = res?.data?.data || res?.data?.items || res?.data?.rows || (Array.isArray(res?.data) ? res.data : []);
      const items = raw.map(mapAllRow);

      if (append) setData(prev => [...prev, ...items]); else setData(items);
      setHasMore(items.length >= LIMIT);
    } catch {
      if (!append) setData([]);
      setHasMore(false);
    } finally {
      if (append) setLoadingMore(false); else setLoading(false);
    }
  }, [fromWallet, toWallet, coin]);

  useEffect(() => {
    if (isFocused) { setPage(1); fetchData(1, false); }
  }, [fromWallet, toWallet, coin, isFocused]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loading) {
      const next = page + 1;
      setPage(next);
      fetchData(next, true);
    }
  }, [hasMore, loadingMore, loading, page, fetchData]);

  const openFilterSheet = () => {
    setOpenDropdown(null);
    setTempFromWallet(fromWallet);
    setTempToWallet(toWallet);
    setTempCoin(coin);
    filterSheetRef.current?.open();
  };

  const closeFilterSheet = () => {
    setOpenDropdown(null);
    filterSheetRef.current?.close();
  };

  const handleApplyFilters = () => {
    setFromWallet(tempFromWallet);
    setToWallet(tempToWallet);
    setCoin(tempCoin);
    closeFilterSheet();
  };

  const handleResetFilters = () => {
    setTempFromWallet("All");
    setTempToWallet("All");
    setTempCoin("All");
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
        <AppText weight={SEMI_BOLD} style={{ fontSize: 18, color: themeColors.text }}>Transfer History</AppText>
        <TouchableOpacity onPress={openFilterSheet} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <FastImage source={filterIcon} style={{ width: 18, height: 18 }} resizeMode="contain" tintColor={themeColors.text} />
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
        height={550}
        openDuration={250}
        customModalProps={{ statusBarTranslucent: true }}
        closeOnDragDown
        closeOnPressMask
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
          {/* From */}
          <View style={[styles.filterSection, { zIndex: 3000 }]}>
            <AppText style={[styles.filterLabel, { color: themeColors.secondaryText }]}>From</AppText>
            <CustomDropdown
              data={WALLET_OPTIONS}
              selected={tempFromWallet}
              onSelect={setTempFromWallet}
              isOpen={openDropdown === 'from'}
              onToggle={(val) => setOpenDropdown(val ? 'from' : null)}
            />
          </View>

          {/* To */}
          <View style={[styles.filterSection, { zIndex: 2000 }]}>
            <AppText style={[styles.filterLabel, { color: themeColors.secondaryText }]}>To</AppText>
            <CustomDropdown
              data={WALLET_OPTIONS}
              selected={tempToWallet}
              onSelect={setTempToWallet}
              isOpen={openDropdown === 'to'}
              onToggle={(val) => setOpenDropdown(val ? 'to' : null)}
            />
          </View>

          {/* Coin */}
          <View style={[styles.filterSection, { zIndex: 1000 }]}>
            <AppText style={[styles.filterLabel, { color: themeColors.secondaryText }]}>Coin</AppText>
            <CustomDropdown
              data={coinOptions}
              selected={tempCoin}
              onSelect={setTempCoin}
              isOpen={openDropdown === 'coin'}
              onToggle={(val) => setOpenDropdown(val ? 'coin' : null)}
            />
          </View>

        </ScrollView>

        <View style={[styles.sheetFooter, { borderTopColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]}>
          <TouchableOpacity style={[styles.footerBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]} onPress={handleResetFilters}>
            <AppText weight={SEMI_BOLD} style={{ color: themeColors.text }}>Reset</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.footerBtn, { backgroundColor: themeColors.button }]} onPress={handleApplyFilters}>
            <AppText weight={SEMI_BOLD} style={{ color: "#FFF" }}>Search</AppText>
          </TouchableOpacity>
        </View>
      </RBSheet>


    </SafeAreaView>
  );
};

export default TransferHistoryScreen;

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
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    borderBottomWidth: 1,
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
