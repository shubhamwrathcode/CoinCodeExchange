import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Text,
  Dimensions,
} from "react-native";
import FastImage from "react-native-fast-image";
import Clipboard from "@react-native-clipboard/clipboard";
import { AppSafeAreaView, AppText, SEMI_BOLD, MEDIUM, BOLD } from "../../shared";
import { colors } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";
import {
  back_ic,
  bitcoinIcon,
  tetherIcon,
  bnbIcon,
  trxIcon,
  Polygon,
  closeIcon,
  NO_NOTIFICATION_ICON_LIGHT,
  NO_NOTIFICATION_ICON,
} from "../../helper/ImageAssets";
import NavigationService from "../../navigation/NavigationService";
import { useAppSelector } from "../../store/hooks";
import { appOperation } from "../../appOperation";
import {
  NAVIGATION_AUTH_STACK,
  LOGIN_SCREEN,
  BUY_CRYPTO_SCREEN,
} from "../../navigation/routes";
import { showSuccess, showError } from "../../helper/logger";
import AnimatedBottomSheet from "../../common/AnimatedBottomSheet/AnimatedBottomSheet";
import { formatQuoteAmount, formatAedAmount } from "./convertHelpers";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const PAGE_SIZE = 20;

const TIME_FILTER_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "BUY", label: "Buy" },
  { value: "SELL", label: "Sell" },
  { value: "EXECUTED", label: "Executed" },
  { value: "FAILED", label: "Failed" },
];

const CRYPTO_ICON_MAP = {
  USDT: tetherIcon,
  BTC: bitcoinIcon,
  ETH: Polygon,
  BNB: bnbIcon,
  TRX: trxIcon,
  SOL: Polygon,
  XRP: tetherIcon,
  DOGE: tetherIcon,
  USDC: tetherIcon,
};

function formatHistDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function rowWithinTimeFilter(row, timeFilter) {
  if (!timeFilter || timeFilter === "all") return true;
  const rawDate = row.executed_at || row.created_at;
  if (!rawDate) return true;
  const d = new Date(rawDate);
  if (Number.isNaN(d.getTime())) return true;
  const days = { "7d": 7, "30d": 30, "90d": 90 }[timeFilter];
  if (!days) return true;
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - days);
  return d >= cutoff;
}

const ConvertHistoryScreen = ({ navigation }) => {
  const { colors: themeColors, isDark } = useTheme();
  const userData = useAppSelector((state) => state.auth.userData);
  const loggedIn = !!(userData?.id || userData?._id);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  // Filter States
  const [timeFilter, setTimeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Detail Modal State
  const detailSheetRef = useRef(null);
  const [selectedTrade, setSelectedTrade] = useState(null);

  const fetchTrades = useCallback(
    async (nextPage = 1, replace = false) => {
      if (!loggedIn) {
        setItems([]);
        return;
      }

      if (replace) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const sideParam =
          statusFilter === "BUY" || statusFilter === "SELL" ? `&side=${statusFilter}` : "";
        const statusParam =
          statusFilter === "EXECUTED" || statusFilter === "FAILED"
            ? `&status=${statusFilter}`
            : "";

        const query = `page=${nextPage}&limit=${PAGE_SIZE}${sideParam}${statusParam}`;
        const res = await appOperation.customer.fiat_convert_trades(query).catch(() => null);

        if (res?.success && Array.isArray(res?.data?.items)) {
          const newItems = res.data.items;
          setItems((prev) => (replace ? newItems : [...prev, ...newItems]));
          setHasMore(!!res.data?.meta?.has_more);
          setPage(nextPage);
        } else if (replace) {
          setItems([]);
          setHasMore(false);
        }
      } catch {
        if (replace) setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [loggedIn, statusFilter]
  );

  useEffect(() => {
    fetchTrades(1, true);
  }, [fetchTrades]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrades(1, true);
  };

  const onEndReached = () => {
    if (!loading && !loadingMore && hasMore) {
      fetchTrades(page + 1, false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((row) => rowWithinTimeFilter(row, timeFilter));
  }, [items, timeFilter]);

  const handleOpenDetail = (trade) => {
    setSelectedTrade(trade);
    detailSheetRef.current?.open();
  };

  const handleCopy = (text) => {
    if (!text) return;
    Clipboard.setString(String(text));
    showSuccess("Copied to clipboard");
  };

  const renderTradeItem = ({ item }) => {
    const isBuySide = String(item?.side || "").toUpperCase() === "BUY";
    const status = String(item?.status || "EXECUTED").toUpperCase();
    const isSuccess = status === "EXECUTED" || status === "COMPLETED";
    const isFailed = status === "FAILED";
    const baseAsset = item?.base_asset || "USDT";
    const quoteAsset = item?.quote_asset || "AED";
    const spentAmount = item?.you_spend || (isBuySide ? item?.amount_aed : item?.amount_crypto) || "0";
    const receiveAmount = item?.you_receive || (isBuySide ? item?.amount_crypto : item?.amount_aed) || "0";
    const dateText = formatHistDate(item?.executed_at || item?.created_at);

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => handleOpenDetail(item)}
        style={[
          styles.tradeCard,
          {
            backgroundColor: isDark ? "#181A20" : "#FFFFFF",
            borderColor: isDark ? "#282D3B" : "#DFE0E2",
          },
        ]}
      >
        {/* Top Header Row */}
        <View style={styles.cardHeaderRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={[
                styles.sideBadge,
                { backgroundColor: isBuySide ? "rgba(0, 192, 135, 0.15)" : "rgba(255, 77, 79, 0.15)" },
              ]}
            >
              <Text style={[styles.sideBadgeText, { color: isBuySide ? "#00C087" : "#FF4D4F" }]}>
                {isBuySide ? "Buy" : "Sell"}
              </Text>
            </View>
            <Text style={[styles.pairTitle, { color: isDark ? "#FFFFFF" : "#111827" }]}>
              {baseAsset} / {quoteAsset}
            </Text>
          </View>

          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isSuccess
                  ? "rgba(0, 192, 135, 0.12)"
                  : isFailed
                    ? "rgba(255, 77, 79, 0.12)"
                    : "rgba(245, 158, 11, 0.12)",
              },
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                { color: isSuccess ? "#00C087" : isFailed ? "#FF4D4F" : "#F59E0B" },
              ]}
            >
              {status}
            </Text>
          </View>
        </View>

        {/* Amount & Details Row */}
        <View style={styles.cardDetailGrid}>
          <View style={styles.detailCol}>
            <Text style={[styles.detailLabel, { color: isDark ? "#7E8B9E" : "#8A94A6" }]}>
              You Spent
            </Text>
            <Text style={[styles.detailValue, { color: isDark ? "#E6EDF6" : "#1A202C" }]}>
              {spentAmount} {isBuySide ? quoteAsset : baseAsset}
            </Text>
          </View>

          <View style={[styles.detailCol, { alignItems: "flex-end" }]}>
            <Text style={[styles.detailLabel, { color: isDark ? "#7E8B9E" : "#8A94A6" }]}>
              You Received
            </Text>
            <Text style={[styles.detailValueHighlight, { color: "#00C087" }]}>
              {receiveAmount} {isBuySide ? baseAsset : quoteAsset}
            </Text>
          </View>
        </View>

        {/* Footer Row */}
        <View style={[styles.cardFooter, { borderTopColor: isDark ? "#232836" : "#F0F2F5" }]}>
          <Text style={[styles.dateText, { color: isDark ? "#7E8B9E" : "#8A94A6" }]}>
            {dateText}
          </Text>
          <Text style={[styles.viewDetailText, { color: colors.cyanTheme }]}>
            Details ›
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const handleBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }
    NavigationService.navigate(BUY_CRYPTO_SCREEN);
  };

  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background, flex: 1 }}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? themeColors.border : "#EEEEEE" }]}>
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.headerBtn}
        >
          <FastImage
            source={back_ic}
            style={{ width: 18, height: 18 }}
            resizeMode={FastImage.resizeMode.contain}
            tintColor={themeColors.text}
          />
        </TouchableOpacity>

        <AppText weight={BOLD} style={[styles.headerTitle, { color: themeColors.text }]}>
          Convert History
        </AppText>

        <View style={{ width: 32 }} />
      </View>

      {/* Filter Tabs Container */}
      <View style={styles.filtersWrapper}>
        {/* Status / Side Filter Pills (Equal Width) */}
        <View style={styles.statusFiltersRow}>
          {STATUS_FILTER_OPTIONS.map((item) => {
            const isSelected = statusFilter === item.value;
            return (
              <TouchableOpacity
                key={item.value}
                activeOpacity={0.75}
                onPress={() => setStatusFilter(item.value)}
                style={[
                  styles.statusFilterBtn,
                  {
                    backgroundColor: "transparent",
                    borderColor: isSelected
                      ? colors.cyanTheme
                      : isDark
                        ? "#282D3B"
                        : "#E2E4E8",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusFilterBtnText,
                    {
                      color: isSelected
                        ? colors.cyanTheme
                        : isDark
                          ? "#7E8B9E"
                          : "#8A94A6",
                      fontWeight: isSelected ? "700" : "500",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Time Filter Pills */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={TIME_FILTER_OPTIONS}
          keyExtractor={(item) => item.value}
          contentContainerStyle={[styles.filterPillsScroll, { marginTop: 10 }]}
          renderItem={({ item }) => {
            const isSelected = timeFilter === item.value;
            return (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setTimeFilter(item.value)}
                style={[
                  styles.filterPillSmall,
                  {
                    backgroundColor: "transparent",
                    borderColor: isSelected
                      ? colors.cyanTheme
                      : isDark
                        ? "#282D3B"
                        : "#E2E4E8",
                    borderWidth: 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillSmallText,
                    {
                      color: isSelected
                        ? colors.cyanTheme
                        : isDark
                          ? "#7E8B9E"
                          : "#8A94A6",
                      fontWeight: isSelected ? "700" : "500",
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Main Trade History List */}
      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.buttonBg} size="large" />
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FastImage source={isDark ? NO_NOTIFICATION_ICON_LIGHT : NO_NOTIFICATION_ICON}
            resizeMode="contain"
            style={{ width: 100, height: 100 }} />

        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item, idx) => item?._id || item?.id || String(idx)}
          renderItem={renderTradeItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.buttonBg}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                color={colors.buttonBg}
                size="small"
                style={{ marginVertical: 16 }}
              />
            ) : null
          }
        />
      )}

      {/* Convert Detail Bottom Sheet Modal */}
      <AnimatedBottomSheet
        ref={detailSheetRef}
        sheetHeight={Math.min(SCREEN_HEIGHT * 0.76, 580)}
        isDark={isDark}
      >
        <View style={styles.sheetInner}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: isDark ? "#E6EDF6" : "#1A202C" }]}>
              Convert Details
            </Text>
            <TouchableOpacity
              onPress={() => detailSheetRef.current?.close()}
              style={[styles.closeCircle, { backgroundColor: isDark ? "#1C2430" : "#F0F3F8" }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.75}
            >
              <FastImage
                source={closeIcon}
                style={styles.closeIcon}
                resizeMode={FastImage.resizeMode.contain}
                tintColor={isDark ? "#C5D1E0" : "#4A5568"}
              />
            </TouchableOpacity>
          </View>

          {selectedTrade && (
            <View style={styles.detailSheetContent}>
              {/* Stepper Progress */}
              <View style={[styles.stepperBox, { backgroundColor: isDark ? "#12151D" : "#F9FAFB", borderColor: isDark ? "#232836" : "#E5E7EB" }]}>
                <View style={styles.stepperStep}>
                  <View style={[styles.stepDot, { backgroundColor: "#00C087" }]} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.stepTitle, { color: isDark ? "#E6EDF6" : "#1A202C" }]}>
                      Convert requested
                    </Text>
                    <Text style={[styles.stepTime, { color: isDark ? "#7E8B9E" : "#8A94A6" }]}>
                      {formatHistDate(selectedTrade.created_at || selectedTrade.executed_at)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.stepLine, { backgroundColor: isDark ? "#282D3B" : "#DFE0E2" }]} />

                <View style={styles.stepperStep}>
                  <View
                    style={[
                      styles.stepDot,
                      {
                        backgroundColor:
                          selectedTrade.status === "FAILED" ? "#FF4D4F" : "#00C087",
                      },
                    ]}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.stepTitle, { color: isDark ? "#E6EDF6" : "#1A202C" }]}>
                      {selectedTrade.status || "Executed"}
                    </Text>
                    <Text style={[styles.stepTime, { color: isDark ? "#7E8B9E" : "#8A94A6" }]}>
                      {formatHistDate(selectedTrade.executed_at || selectedTrade.created_at)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Rows List */}
              <View style={styles.sheetRowsList}>
                <View style={styles.sheetRow}>
                  <Text style={[styles.sheetRowLabel, { color: isDark ? "#7E8B9E" : "#8A94A6" }]}>Side</Text>
                  <Text style={[styles.sheetRowValue, { color: selectedTrade.side === "BUY" ? "#00C087" : "#FF4D4F" }]}>
                    {selectedTrade.side === "BUY" ? "Buy" : "Sell"}
                  </Text>
                </View>

                <View style={styles.sheetRow}>
                  <Text style={[styles.sheetRowLabel, { color: isDark ? "#7E8B9E" : "#8A94A6" }]}>You Spend</Text>
                  <Text style={[styles.sheetRowValue, { color: isDark ? "#E6EDF6" : "#1A202C" }]}>
                    {selectedTrade.you_spend || selectedTrade.amount_aed || selectedTrade.amount_crypto}{" "}
                    {selectedTrade.side === "BUY" ? selectedTrade.quote_asset || "AED" : selectedTrade.base_asset || "USDT"}
                  </Text>
                </View>

                <View style={styles.sheetRow}>
                  <Text style={[styles.sheetRowLabel, { color: isDark ? "#7E8B9E" : "#8A94A6" }]}>You Receive</Text>
                  <Text style={[styles.sheetRowValue, { color: "#00C087", fontWeight: "700" }]}>
                    {selectedTrade.you_receive || selectedTrade.amount_crypto || selectedTrade.amount_aed}{" "}
                    {selectedTrade.side === "BUY" ? selectedTrade.base_asset || "USDT" : selectedTrade.quote_asset || "AED"}
                  </Text>
                </View>

                <View style={styles.sheetRow}>
                  <Text style={[styles.sheetRowLabel, { color: isDark ? "#7E8B9E" : "#8A94A6" }]}>Reference Rate</Text>
                  <Text style={[styles.sheetRowValue, { color: isDark ? "#E6EDF6" : "#1A202C" }]}>
                    1 {selectedTrade.base_asset || "USDT"} ≈ {selectedTrade.cmc_rate || selectedTrade.user_rate || "3.672"} {selectedTrade.quote_asset || "AED"}
                  </Text>
                </View>

                <View style={styles.sheetRow}>
                  <Text style={[styles.sheetRowLabel, { color: isDark ? "#7E8B9E" : "#8A94A6" }]}>Transaction Fee</Text>
                  <Text style={[styles.sheetRowValue, { color: "#00C087" }]}>Zero Fees (0.00 AED)</Text>
                </View>

                <View style={styles.sheetRow}>
                  <Text style={[styles.sheetRowLabel, { color: isDark ? "#7E8B9E" : "#8A94A6" }]}>Payment Account</Text>
                  <Text style={[styles.sheetRowValue, { color: isDark ? "#E6EDF6" : "#1A202C" }]}>Spot Wallet</Text>
                </View>

                {selectedTrade.id || selectedTrade._id ? (
                  <View style={styles.sheetRow}>
                    <Text style={[styles.sheetRowLabel, { color: isDark ? "#7E8B9E" : "#8A94A6" }]}>Reference ID</Text>
                    <TouchableOpacity
                      onPress={() => handleCopy(selectedTrade.id || selectedTrade._id)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                    >
                      <Text style={[styles.sheetRowValue, { color: colors.cyanTheme, fontSize: 13 }]}>
                        {String(selectedTrade.id || selectedTrade._id).slice(0, 16)}...
                      </Text>
                      <Text style={{ color: colors.cyanTheme, fontSize: 12 }}>Copy</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>

              {/* Action Button: Convert Again */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  detailSheetRef.current?.close();
                  handleBack();
                }}
                style={[styles.reconvertBtn, { backgroundColor: colors.buttonBg }]}
              >
                <Text style={styles.reconvertBtnText}>
                  {selectedTrade.side === "SELL" ? `Sell ${selectedTrade.base_asset || "USDT"} again` : `Buy ${selectedTrade.base_asset || "USDT"} again`}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </AnimatedBottomSheet>
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
  },
  filtersWrapper: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statusFiltersRow: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "space-between",
  },
  statusFilterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statusFilterBtnText: {
    fontSize: 12,
    textAlign: "center",
  },
  filterPillsScroll: {
    gap: 8,
  },
  filterPillSmall: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  filterPillSmallText: {
    fontSize: 12,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 12,
  },
  tradeCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sideBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sideBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  pairTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardDetailGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  detailValueHighlight: {
    fontSize: 14,
    fontWeight: "700",
  },
  cardFooter: {
    borderTopWidth: 1,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    fontSize: 12,
  },
  viewDetailText: {
    fontSize: 12,
    fontWeight: "700",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  sheetInner: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  closeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: {
    width: 14,
    height: 14,
  },
  detailSheetContent: {
    gap: 16,
  },
  stepperBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  stepperStep: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepLine: {
    width: 2,
    height: 18,
    marginLeft: 4,
    marginVertical: 2,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  stepTime: {
    fontSize: 11,
    marginTop: 2,
  },
  sheetRowsList: {
    gap: 12,
  },
  sheetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sheetRowLabel: {
    fontSize: 13,
  },
  sheetRowValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  reconvertBtn: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  reconvertBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

export default ConvertHistoryScreen;
