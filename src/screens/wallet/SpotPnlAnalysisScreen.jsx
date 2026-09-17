import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Platform,
} from "react-native";
import FastImage from "react-native-fast-image";
import DateTimePicker from "@react-native-community/datetimepicker";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useNavigation } from "@react-navigation/native";
import { AppText, FOURTEEN, SEMI_BOLD, SIXTEEN, TWELVE } from "../../shared";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import { back_ic, calendarIcon, eye_close_icon, eye_open_icon } from "../../helper/ImageAssets";
import useSpotPnlAnalysis from "./hooks/useSpotPnlAnalysis";
import { formatSpotPnlUpdatedAt } from "./helpers/spotPnlQuery";
import {
  SpotAssetAllocationChart,
  SpotCumulativePnlChart,
  SpotDailyPnlChart,
} from "./SpotPnlCharts";

function num(v) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function fmt(val, decimals = 4) {
  return parseFloat(num(val).toFixed(decimals)).toString();
}

function fmtSigned(val, decimals = 4) {
  const n = num(val);
  const abs = fmt(Math.abs(n), decimals);
  if (n > 0) return `+${abs}`;
  if (n < 0) return `-${abs}`;
  return abs;
}

function pnlColor(val, isDark = false) {
  const n = num(val);
  if (n > 0) return "#01bc8d";
  if (n < 0) return "#e45561";
  return isDark ? "#FFFFFF" : "#1E2329";
}

function parseDateInput(str) {
  if (!str) return new Date();
  const d = new Date(`${str}T00:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function toDateInput(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const SpotPnlAnalysisScreen = () => {
  const navigation = useNavigation();
  const { colors: themeColors, isDark } = useTheme();
  const [showBalance, setShowBalance] = useState(true);
  const [viewTab, setViewTab] = useState("overview");
  const [datePicker, setDatePicker] = useState(null);
  const [pickerDraft, setPickerDraft] = useState(new Date());

  const defaultTextColor = isDark ? "#FFFFFF" : "#1E2329";
  const secondaryTextColor = isDark ? "#848E9C" : "#707A8A";
  const pageBg = isDark ? "#121418" : "#F5F6F8";
  const cardBg = "transparent";
  const cardBorder = isDark ? "#282e3a" : "#EAECEF";
  const chipBg = isDark ? "#222630" : "#F0F2F5";
  const chipActiveBg = isDark ? "#1a2233" : "#EAECEF";
  const chipActiveBorder = isDark ? "#2b3852" : "#D0D5DD";
  const tabLineColor = isDark ? colors.white : colors.black;

  const {
    period,
    dateFrom,
    dateTo,
    analysis,
    detailsRows,
    detailsPagination,
    detailsPage,
    loading,
    detailsLoading,
    error,
    applyPeriod,
    setCustomRange,
    setDetailsPage,
  } = useSpotPnlAnalysis({ enabled: true });

  const summary = analysis?.range_summary;
  const cards = analysis?.summary_cards;
  const chart = analysis?.chart;
  const assetAllocation = analysis?.asset_allocation ?? [];
  const balance = analysis?.estimated_balance;
  const detailsPages = detailsPagination?.total_pages ?? 1;

  const openDatePicker = (which) => {
    setPickerDraft(parseDateInput(which === "from" ? dateFrom : dateTo));
    setDatePicker(which);
  };

  const onDateConfirm = (selectedDate) => {
    const next = toDateInput(selectedDate);
    if (datePicker === "from") setCustomRange(next, null);
    else if (datePicker === "to") setCustomRange(null, next);
    setDatePicker(null);
  };

  const closeDatePicker = () => setDatePicker(null);

  const handleAndroidDateChange = (event, selectedDate) => {
    const which = datePicker;
    if (event?.type === "dismissed") {
      closeDatePicker();
      return;
    }
    if (selectedDate) {
      const next = toDateInput(selectedDate);
      if (which === "from") setCustomRange(next, null);
      else if (which === "to") setCustomRange(null, next);
    }
    closeDatePicker();
  };

  const todayPnl = num(cards?.today?.pnl_usdt ?? cards?.daily?.pnl_usdt);
  const todayPct = num(cards?.today?.pnl_pct ?? cards?.daily?.pnl_pct);

  const pnl30 = num(cards?.["30d"]?.pnl_usdt);
  const pct30 = num(cards?.["30d"]?.pnl_pct);

  const renderDetailRow = ({ item }) => {
    const daily = num(item.daily_pnl ?? item.daily_profit_and_loss);
    const cum = num(item.cumulative_pnl ?? item.cumulative_profit_and_loss);
    const cumPct = num(item.cumulative_pnl_pct ?? item.cumulative_profit_and_loss_pct);
    const netTransfer = num(item.net_transfer_usdt);
    return (
      <View style={[styles.detailRow, { borderBottomColor: cardBorder }]}>
        <AppText type={TWELVE} weight={SEMI_BOLD} style={{ width: 84, color: defaultTextColor }}>
          {item.date}
        </AppText>
        <AppText type={TWELVE} style={{ width: 76, textAlign: "right", color: defaultTextColor }}>
          {showBalance ? fmtSigned(daily, 2) : "****"}
        </AppText>
        <AppText type={TWELVE} style={{ width: 76, textAlign: "right", color: defaultTextColor }}>
          {showBalance ? fmtSigned(cum, 2) : "****"}
        </AppText>
        <AppText type={TWELVE} style={{ width: 72, textAlign: "right", color: defaultTextColor }}>
          {showBalance ? `${fmtSigned(cumPct, 2)}%` : "****"}
        </AppText>
        <AppText type={TWELVE} style={{ width: 76, textAlign: "right", color: defaultTextColor }}>
          {showBalance ? `${fmtSigned(netTransfer, 2)}` : "****"}
        </AppText>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: pageBg }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <FastImage
            source={back_ic}
            style={styles.backIcon}
            resizeMode="contain"
            tintColor={isDark ? colors.white : themeColors.text}
          />
        </TouchableOpacity>
        <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: defaultTextColor }}>
          Spot PNL Analysis
        </AppText>
        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowBalance(!showBalance)}>
          <FastImage
            source={showBalance ? eye_close_icon : eye_open_icon}
            style={styles.eyeIcon}
            resizeMode="contain"
            tintColor={isDark ? colors.white : themeColors.secondaryText}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top 3 Summary Cards in a Single Row */}
        <View style={styles.metricCardRow}>
          {/* Card 1: Estimated Balance */}
          <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <AppText type={TWELVE} numberOfLines={1} style={{ color: secondaryTextColor }}>
              Estimated Balance
            </AppText>
            <AppText
              type={FOURTEEN}
              weight={SEMI_BOLD}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={{ color: defaultTextColor, marginTop: 6 }}
            >
              {showBalance ? (balance?.btc ? `${fmt(balance.btc, 4)} BTC` : "0.00 BTC") : "****"}
            </AppText>
            <AppText
              type={TWELVE}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={{ color: secondaryTextColor, marginTop: 4 }}
            >
              {showBalance ? (balance?.usdt ? `$ ${fmt(balance.usdt, 2)}` : "$ 0.00") : "****"}
            </AppText>
          </View>

          {/* Card 2: Today's PNL */}
          <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <AppText type={TWELVE} numberOfLines={1} style={{ color: secondaryTextColor }}>
              Today's PNL
            </AppText>
            <AppText
              type={FOURTEEN}
              weight={SEMI_BOLD}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={{
                color: showBalance ? pnlColor(todayPct, isDark) : defaultTextColor,
                marginTop: 6,
              }}
            >
              {showBalance ? `${fmtSigned(todayPct, 2)}%` : "****"}
            </AppText>
            <AppText
              type={TWELVE}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={{
                color: showBalance ? pnlColor(todayPnl, isDark) : secondaryTextColor,
                marginTop: 4,
              }}
            >
              {showBalance ? `${fmtSigned(todayPnl, 2)} USDT` : "****"}
            </AppText>
          </View>

          {/* Card 3: 30D PNL */}
          <View style={[styles.metricCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <AppText type={TWELVE} numberOfLines={1} style={{ color: secondaryTextColor }}>
              30D PNL
            </AppText>
            <AppText
              type={FOURTEEN}
              weight={SEMI_BOLD}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={{
                color: showBalance ? pnlColor(pct30, isDark) : defaultTextColor,
                marginTop: 6,
              }}
            >
              {showBalance ? `${fmtSigned(pct30, 2)}%` : "****"}
            </AppText>
            <AppText
              type={TWELVE}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={{
                color: showBalance ? pnlColor(pnl30, isDark) : secondaryTextColor,
                marginTop: 4,
              }}
            >
              {showBalance ? `${fmtSigned(pnl30, 2)} USDT` : "****"}
            </AppText>
          </View>
        </View>

        {/* Main Card Panel (Screenshot 2 parity) */}
        <View style={[styles.mainPanelCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          {/* Top Filter Chips */}
          <View style={styles.periodRow}>
            {[
              { key: "7d", label: "Last 7 days" },
              { key: "30d", label: "Last 30 days" },
              { key: "90d", label: "Last 90 days" },
            ].map((p) => {
              const active = period === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[
                    styles.periodChip,
                    {
                      backgroundColor: active ? chipActiveBg : chipBg,
                      borderColor: active ? chipActiveBorder : "transparent",
                    },
                  ]}
                  onPress={() => applyPeriod(p.key)}
                >
                  <AppText
                    type={TWELVE}
                    weight={active ? SEMI_BOLD : undefined}
                    style={{
                      color: active ? defaultTextColor : secondaryTextColor,
                    }}
                  >
                    {p.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Date Picker Row */}
          <View style={styles.datePickerRow}>
            <TouchableOpacity
              style={[styles.dateInputBox, { borderColor: cardBorder, backgroundColor: chipBg }]}
              onPress={() => openDatePicker("from")}
            >
              <AppText type={TWELVE} style={{ color: defaultTextColor }}>
                {dateFrom || "Start Date"}
              </AppText>
            </TouchableOpacity>

            <AppText type={TWELVE} style={{ color: secondaryTextColor, marginHorizontal: 8 }}>
              →
            </AppText>

            <TouchableOpacity
              style={[styles.dateInputBox, { borderColor: cardBorder, backgroundColor: chipBg }]}
              onPress={() => openDatePicker("to")}
            >
              <AppText type={TWELVE} style={{ color: defaultTextColor }}>
                {dateTo || "End Date"}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.calBtn, { borderColor: cardBorder, backgroundColor: chipBg }]}
              onPress={() => openDatePicker("from")}
            >
              <FastImage
                source={calendarIcon}
                style={{ width: 14, height: 14 }}
                tintColor={isDark ? "#FFFFFF" : "#1E2329"}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          <View style={[styles.cardDivider, { backgroundColor: cardBorder }]} />

          {/* Profit and Loss Summary Title */}
          <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: defaultTextColor, marginVertical: 14 }}>
            Profit and Loss Summary
          </AppText>

          {/* Profit and Loss Full Width Items (Screenshot 2 parity) */}
          {loading ? (
            <ActivityIndicator style={{ marginVertical: 24 }} color={colors.buttonBg} />
          ) : (
            <View style={styles.summaryList}>
              {[
                { label: "Total Profit", value: summary?.total_profit, isPnl: true },
                { label: "Total Loss", value: summary?.total_loss, isPnl: true },
                { label: "Net PNL", value: summary?.net_pnl, isPnl: true },
              ].map((item) => (
                <View style={styles.summaryRow} key={item.label}>
                  <AppText type={FOURTEEN} style={{ color: defaultTextColor }}>
                    {item.label}
                  </AppText>
                  <AppText
                    type={FOURTEEN}
                    weight={SEMI_BOLD}
                    style={{
                      color: showBalance ? pnlColor(item.value, isDark) : defaultTextColor,
                    }}
                  >
                    {showBalance ? `${fmtSigned(item.value, 4)} USDT` : "****"}
                  </AppText>
                </View>
              ))}

              <View style={[styles.sectionDivider, { backgroundColor: cardBorder }]} />

              {[
                { label: "Win Rate", value: `${fmt(summary?.win_rate_pct, 2)}%` },
                { label: "Winning Days", value: String(summary?.winning_days ?? 0) },
                { label: "Losing Days", value: String(summary?.losing_days ?? 0) },
                { label: "Breakeven Days", value: String(summary?.breakeven_days ?? 0) },
              ].map((item) => (
                <View style={styles.summaryRow} key={item.label}>
                  <AppText type={FOURTEEN} style={{ color: defaultTextColor }}>
                    {item.label}
                  </AppText>
                  <AppText
                    type={FOURTEEN}
                    weight={SEMI_BOLD}
                    style={{ color: defaultTextColor }}
                  >
                    {showBalance ? item.value : "****"}
                  </AppText>
                </View>
              ))}
            </View>
          )}

          <View style={[styles.cardDivider, { backgroundColor: cardBorder, marginTop: 18 }]} />

          {/* Tabs: Overview & Details */}
          <View style={[styles.tabBar, { borderBottomColor: cardBorder }]}>
            {[
              { key: "overview", label: "Overview" },
              { key: "details", label: "Details" },
            ].map((tab) => {
              const active = viewTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tabItem,
                    active && { borderBottomColor: tabLineColor, borderBottomWidth: 2 },
                  ]}
                  onPress={() => setViewTab(tab.key)}
                >
                  <AppText
                    type={FOURTEEN}
                    weight={active ? SEMI_BOLD : undefined}
                    style={{ color: active ? defaultTextColor : secondaryTextColor }}
                  >
                    {tab.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tab 1: Overview Charts */}
          {viewTab === "overview" && (
            loading ? (
              <ActivityIndicator style={{ marginVertical: 30 }} color={colors.buttonBg} />
            ) : (
              <View style={styles.chartsContainer}>
                {/* 1. Cumulative PNL % */}
                <SpotCumulativePnlChart
                  usdtData={chart?.cumulative_pnl_usdt}
                  pctData={chart?.cumulative_pnl_pct}
                  title="Cumulative PNL %"
                  themeColors={themeColors}
                  isDark={isDark}
                />

                {/* 2. Asset Allocation Donut Chart */}
                <SpotAssetAllocationChart
                  data={assetAllocation}
                  title="Asset Allocation"
                  themeColors={themeColors}
                  isDark={isDark}
                />

                {/* 3. Daily PNL Bar Chart */}
                <SpotDailyPnlChart
                  data={chart?.daily_pnl ?? chart?.daily_account_pnl}
                  title="Daily PNL"
                  themeColors={themeColors}
                  isDark={isDark}
                />
              </View>
            )
          )}

          {/* Tab 2: Details Table */}
          {viewTab === "details" && (
            <View style={styles.detailsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View style={{ minWidth: 380 }}>
                  <View style={[styles.detailHeader, { borderBottomColor: cardBorder }]}>
                    <AppText type={TWELVE} weight={SEMI_BOLD} style={{ width: 84, color: defaultTextColor }}>
                      Date
                    </AppText>
                    <AppText type={TWELVE} weight={SEMI_BOLD} style={{ width: 76, textAlign: "right", color: defaultTextColor }}>
                      Daily PNL
                    </AppText>
                    <AppText type={TWELVE} weight={SEMI_BOLD} style={{ width: 76, textAlign: "right", color: defaultTextColor }}>
                      Cum. PNL
                    </AppText>
                    <AppText type={TWELVE} weight={SEMI_BOLD} style={{ width: 72, textAlign: "right", color: defaultTextColor }}>
                      Cum. %
                    </AppText>
                    <AppText type={TWELVE} weight={SEMI_BOLD} style={{ width: 76, textAlign: "right", color: defaultTextColor }}>
                      Transfer
                    </AppText>
                  </View>

                  <FlatList
                    data={detailsRows}
                    keyExtractor={(item, index) => item.date || String(index)}
                    renderItem={renderDetailRow}
                    scrollEnabled={false}
                    ListEmptyComponent={() => (
                      <View style={{ paddingVertical: 24, alignItems: "center" }}>
                        {detailsLoading ? (
                          <ActivityIndicator size="small" color={colors.buttonBg} />
                        ) : (
                          <AppText type={TWELVE} style={{ color: secondaryTextColor }}>
                            No records found
                          </AppText>
                        )}
                      </View>
                    )}
                  />
                </View>
              </ScrollView>

              {detailsPages > 1 && (
                <View style={styles.paginationRow}>
                  <TouchableOpacity
                    style={[styles.pageBtn, { borderColor: cardBorder }]}
                    disabled={detailsPage <= 1}
                    onPress={() => setDetailsPage(Math.max(1, detailsPage - 1))}
                  >
                    <AppText type={FOURTEEN} style={{ color: defaultTextColor }}>‹</AppText>
                  </TouchableOpacity>
                  <AppText type={TWELVE} style={{ color: defaultTextColor }}>
                    Page {detailsPage} / {detailsPages}
                  </AppText>
                  <TouchableOpacity
                    style={[styles.pageBtn, { borderColor: cardBorder }]}
                    disabled={detailsPage >= detailsPages}
                    onPress={() => setDetailsPage(Math.min(detailsPages, detailsPage + 1))}
                  >
                    <AppText type={FOURTEEN} style={{ color: defaultTextColor }}>›</AppText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Footnote */}
          <AppText type={TWELVE} style={[styles.footnote, { color: secondaryTextColor }]}>
            Data update time refers to UTC+0. Data maintenance occurs daily between 0:00 and 2:00 (UTC+0).
            {analysis?.meta?.note ? ` ${analysis.meta.note}` : " Data is for reference only due to the complexity of financial data."}
          </AppText>
        </View>
      </ScrollView>

      {/* Date Picker Modals */}
      {Platform.OS === "android" ? (
        datePicker ? (
          <DateTimePicker
            value={pickerDraft}
            mode="date"
            display="spinner"
            onChange={handleAndroidDateChange}
          />
        ) : null
      ) : (
        <DateTimePickerModal
          isVisible={!!datePicker}
          mode="date"
          display="spinner"
          themeVariant={isDark ? "dark" : "light"}
          isDarkModeEnabled={isDark}
          textColor={isDark ? "#FFFFFF" : "#000000"}
          date={pickerDraft}
          onConfirm={onDateConfirm}
          onCancel={closeDatePicker}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backBtn: {
    padding: 6,
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  eyeBtn: {
    padding: 6,
  },
  eyeIcon: {
    width: 18,
    height: 18,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  metricCardRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  mainPanelCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  periodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  periodChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
  },
  datePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  dateInputBox: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: "center",
  },
  calBtn: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cardDivider: {
    height: 1,
    marginVertical: 14,
    width: "100%",
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
    width: "100%",
  },
  summaryList: {
    gap: 14,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginTop: 10,
    gap: 24,
  },
  tabItem: {
    paddingBottom: 10,
  },
  chartsContainer: {
    marginTop: 14,
    gap: 20,
  },
  detailsContainer: {
    marginTop: 14,
  },
  detailHeader: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  detailRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    marginTop: 16,
  },
  pageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
  },
  footnote: {
    marginTop: 20,
    lineHeight: 18,
  },
});

export default SpotPnlAnalysisScreen;
