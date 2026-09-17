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
import { AppText, DISCLAIMTEXT, FOURTEEN, SEMI_BOLD, SIXTEEN, TWELVE } from "../../shared";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import { back_ic, eye_close_icon, eye_open_icon } from "../../helper/ImageAssets";
import useOptionsPnlAnalysis from "../Futures/OptionsTrade/hooks/useOptionsPnlAnalysis";
import { formatOptionsPnlUpdatedAt } from "../Futures/OptionsTrade/helpers/optionsPnlQuery";
import { OptionsCumulativePnlChart, OptionsDailyPnlChart } from "./OptionsPnlCharts";

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
  if (n > 0) return colors.green;
  if (n < 0) return colors.red;
  return isDark ? colors.white : colors.disclaimText;
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

function SummaryCard({ label, card, updatedAt, showValues, cardStyle, isDark, themeColors }) {
  const pnl = num(card?.pnl_usdt);
  const pct = num(card?.pnl_pct);
  const secondaryTextColor = isDark ? colors.white : themeColors.secondaryText;
  return (
    <View style={[styles.metricCard, cardStyle]}>
      <AppText type={TWELVE} style={{ color: secondaryTextColor }}>{label}</AppText>
      <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: pnlColor(pnl, isDark), marginTop: 6 }}>
        {showValues ? `${fmtSigned(pct, 2)}%` : "****"}
      </AppText>
      <AppText type={TWELVE} style={{ color: pnlColor(pnl, isDark), marginTop: 4 }}>
        {showValues ? `${fmtSigned(pnl, 4)} USDT` : "****"}
      </AppText>
      {label === "Daily PNL" && updatedAt ? (
        <AppText type={TWELVE} style={{ color: isDark ? colors.white : themeColors.secondaryText, marginTop: 8 }}>
          Update Time: {formatOptionsPnlUpdatedAt(updatedAt)}
        </AppText>
      ) : null}
    </View>
  );
}

const OptionsPnlAnalysisScreen = () => {
  const navigation = useNavigation();
  const { colors: themeColors, isDark } = useTheme();
  const [showBalance, setShowBalance] = useState(true);
  const [viewTab, setViewTab] = useState("overview");
  const [datePicker, setDatePicker] = useState(null);
  const [pickerDraft, setPickerDraft] = useState(new Date());

  const defaultTextColor = isDark ? colors.white : themeColors.text;
  const secondaryTextColor = isDark ? colors.white : themeColors.secondaryText;

  const {
    period,
    dateFrom,
    dateTo,
    analysis,
    detailsRows,
    detailsPagination,
    detailsPage,
    loading,
    error,
    applyPeriod,
    setCustomRange,
    setDetailsPage,
  } = useOptionsPnlAnalysis({ enabled: true });

  const summary = analysis?.range_summary;
  const cards = analysis?.summary_cards;
  const chart = analysis?.chart;
  const detailsPages = detailsPagination?.total_pages ?? 1;

  const pageBg = themeColors.background;
  const cardBorder = themeColors.border;
  const cardBg = isDark ? "transparent" : themeColors.themeElevationColor;
  const cardSurfaceStyle = {
    backgroundColor: cardBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: cardBorder,
  };
  const metricCardStyle = {
    ...cardSurfaceStyle,
    borderRadius: 5,
  };
  const panelStyle = {
    ...cardSurfaceStyle,
    borderRadius: 12,
  };
  const chipBg = isDark ? themeColors.background : colors.iconBgColor;
  const periodActiveBg = isDark ? themeColors.button : colors.buttonBg;
  const tabLineColor = isDark ? colors.white : colors.black;

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

  const renderDetailRow = ({ item }) => {
    const daily = num(item.daily_pnl);
    const cum = num(item.cumulative_pnl);
    return (
      <View style={[styles.detailRow, { borderBottomColor: themeColors.border }]}>
        <AppText type={TWELVE} weight={SEMI_BOLD} style={{ flex: 1, color: defaultTextColor }}>{item.date}</AppText>
        <AppText type={TWELVE} style={{ width: 72, textAlign: "right", color: defaultTextColor }}>
          {showBalance ? fmt(item.total_equity, 2) : "****"}
        </AppText>
        <AppText type={TWELVE} style={{ width: 72, textAlign: "right", color: showBalance ? pnlColor(daily, isDark) : defaultTextColor }}>
          {showBalance ? fmtSigned(daily, 2) : "****"}
        </AppText>
        <AppText type={TWELVE} style={{ width: 88, textAlign: "right", color: showBalance ? pnlColor(cum, isDark) : defaultTextColor }}>
          {showBalance ? `${fmtSigned(cum, 2)}` : "****"}
        </AppText>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: pageBg }]}>
      <View style={[styles.header, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: cardBorder }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <FastImage source={back_ic} style={styles.backIcon} resizeMode="contain" tintColor={defaultTextColor} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: defaultTextColor }}>
            Options PNL Analysis
          </AppText>
        </View>
        <TouchableOpacity onPress={() => setShowBalance((v) => !v)} style={styles.backBtn}>
          <FastImage
            source={showBalance ? eye_close_icon : eye_open_icon}
            style={{ width: 18, height: 18 }}
            resizeMode="contain"
            tintColor={defaultTextColor}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: isDark ? "rgba(237,78,78,0.15)" : "#FEE2E2" }]}>
            <AppText type={TWELVE} style={{ color: colors.red }}>{error}</AppText>
          </View>
        ) : null}

        <View style={styles.cardsRow}>
          <SummaryCard label="Daily PNL" card={cards?.daily} updatedAt={analysis?.updated_at} showValues={showBalance} cardStyle={metricCardStyle} isDark={isDark} themeColors={themeColors} />
          <SummaryCard label="7D PNL" card={cards?.["7d"]} showValues={showBalance} cardStyle={metricCardStyle} isDark={isDark} themeColors={themeColors} />
          <SummaryCard label="30D PNL" card={cards?.["30d"]} showValues={showBalance} cardStyle={metricCardStyle} isDark={isDark} themeColors={themeColors} />
        </View>

        <View style={[styles.panel, panelStyle]}>
          <View style={styles.toolbar}>
            <View style={styles.periodRow}>
              {["7d", "30d", "90d"].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.periodBtn,
                    { backgroundColor: period === p ? periodActiveBg : chipBg },
                  ]}
                  onPress={() => applyPeriod(p)}
                >
                  <AppText
                    type={TWELVE}
                    weight={SEMI_BOLD}
                    style={{ color: period === p ? colors.white : secondaryTextColor }}
                  >
                    {p.toUpperCase()}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.dateRow}>
              <TouchableOpacity onPress={() => openDatePicker("from")} style={[styles.dateCell, { backgroundColor: chipBg, borderWidth: StyleSheet.hairlineWidth, borderColor: cardBorder }]}>
                <AppText type={TWELVE} style={{ color: defaultTextColor }}>{dateFrom || "—"}</AppText>
              </TouchableOpacity>
              <AppText type={TWELVE} style={{ color: secondaryTextColor }}> → </AppText>
              <TouchableOpacity onPress={() => openDatePicker("to")} style={[styles.dateCell, { backgroundColor: chipBg, borderWidth: StyleSheet.hairlineWidth, borderColor: cardBorder }]}>
                <AppText type={TWELVE} style={{ color: defaultTextColor }}>{dateTo || "—"}</AppText>
              </TouchableOpacity>
            </View>
          </View>

          <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ marginTop: 16, color: defaultTextColor }}>
            Profit and Loss Summary
          </AppText>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color={defaultTextColor} />
          ) : (
            <View style={styles.summaryGrid}>
              <View style={{ flex: 1, gap: 10 }}>
                {[
                  ["Total Profit", summary?.total_profit],
                  ["Total Loss", summary?.total_loss],
                  ["Net PNL", summary?.net_pnl],
                ].map(([label, value]) => (
                  <View key={label} style={styles.summaryRow}>
                    <AppText type={TWELVE} style={{ color: secondaryTextColor }}>{label}</AppText>
                    <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: showBalance ? pnlColor(value, isDark) : defaultTextColor }}>
                      {showBalance ? `${fmtSigned(value, 4)} USDT` : "****"}
                    </AppText>
                  </View>
                ))}
              </View>
              <View style={{ flex: 1, gap: 10 }}>
                {[
                  ["Win Rate", summary?.win_rate_pct, true],
                  ["Winning Days", summary?.winning_days, false],
                  ["Losing Days", summary?.losing_days, false],
                  ["Breakeven Days", summary?.breakeven_days, false],
                ].map(([label, value, isPct]) => (
                  <View key={label} style={styles.summaryRow}>
                    <AppText type={TWELVE} style={{ color: secondaryTextColor }}>{label}</AppText>
                    <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: defaultTextColor }}>
                      {showBalance ? (isPct ? `${fmt(value, 2)}%` : String(value ?? 0)) : "****"}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.viewTabs}>
            {["overview", "details"].map((tab) => (
              <TouchableOpacity key={tab} onPress={() => setViewTab(tab)} style={styles.viewTabBtn}>
                <AppText
                  type={FOURTEEN}
                  weight={SEMI_BOLD}
                  style={{ color: viewTab === tab ? defaultTextColor : (isDark ? "rgba(255,255,255,0.6)" : themeColors.secondaryText) }}
                >
                  {tab === "overview" ? "Overview" : "Details"}
                </AppText>
                {viewTab === tab ? <View style={[styles.tabLine, { backgroundColor: tabLineColor }]} /> : null}
              </TouchableOpacity>
            ))}
          </View>

          {viewTab === "overview" && !loading && (
            <View>
              <OptionsDailyPnlChart data={chart?.daily_account_pnl} themeColors={themeColors} isDark={isDark} />
              <OptionsCumulativePnlChart
                usdtData={chart?.cumulative_pnl_usdt}
                pctData={chart?.cumulative_pnl_pct}
                themeColors={themeColors}
                isDark={isDark}
              />
            </View>
          )}

          {viewTab === "details" && (
            <View style={{ marginTop: 12 }}>
              <View style={[styles.detailHeader, { borderBottomColor: themeColors.border }]}>
                <AppText type={TWELVE} weight={SEMI_BOLD} style={{ flex: 1, color: defaultTextColor }}>Date</AppText>
                <AppText type={TWELVE} weight={SEMI_BOLD} style={{ width: 72, textAlign: "right", color: defaultTextColor }}>Equity</AppText>
                <AppText type={TWELVE} weight={SEMI_BOLD} style={{ width: 72, textAlign: "right", color: defaultTextColor }}>Daily</AppText>
                <AppText type={TWELVE} weight={SEMI_BOLD} style={{ width: 88, textAlign: "right", color: defaultTextColor }}>Cum. PNL</AppText>
              </View>
              {loading ? (
                <ActivityIndicator style={{ marginTop: 20 }} color={defaultTextColor} />
              ) : (
                <FlatList
                  data={detailsRows}
                  keyExtractor={(item) => item.date}
                  renderItem={renderDetailRow}
                  scrollEnabled={false}
                  ListEmptyComponent={
                    <AppText type={TWELVE} style={{ textAlign: "center", marginTop: 24, color: secondaryTextColor }}>
                      No data
                    </AppText>
                  }
                />
              )}
              {detailsPages > 1 && (
                <View style={styles.pagination}>
                  <TouchableOpacity
                    disabled={detailsPage <= 1}
                    style={[
                      styles.pageBtn,
                      { backgroundColor: chipBg, borderWidth: StyleSheet.hairlineWidth, borderColor: cardBorder },
                      detailsPage <= 1 && styles.pageBtnDisabled,
                    ]}
                    onPress={() => setDetailsPage((p) => Math.max(1, p - 1))}
                  >
                    <AppText type={FOURTEEN} style={{ color: defaultTextColor }}>‹</AppText>
                  </TouchableOpacity>
                  <AppText type={TWELVE} style={{ color: secondaryTextColor }}>Page {detailsPage} / {detailsPages}</AppText>
                  <TouchableOpacity
                    disabled={detailsPage >= detailsPages}
                    style={[
                      styles.pageBtn,
                      { backgroundColor: chipBg, borderWidth: StyleSheet.hairlineWidth, borderColor: cardBorder },
                      detailsPage >= detailsPages && styles.pageBtnDisabled,
                    ]}
                    onPress={() => setDetailsPage((p) => p + 1)}
                  >
                    <AppText type={FOURTEEN} style={{ color: defaultTextColor }}>›</AppText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

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

export default OptionsPnlAnalysisScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  backIcon: { width: 20, height: 20 },
  errorBox: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
  },
  cardsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  metricCard: {
    flex: 1,
    padding: 12,
  },
  panel: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
  },
  toolbar: { gap: 12 },
  periodRow: { flexDirection: "row", gap: 8 },
  periodBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  dateRow: { flexDirection: "row", alignItems: "center" },
  dateCell: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  summaryGrid: { flexDirection: "row", gap: 16, marginTop: 14 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  viewTabs: { flexDirection: "row", gap: 20, marginTop: 20 },
  viewTabBtn: { alignItems: "center", paddingBottom: 6 },
  tabLine: { marginTop: 6, height: 3, width: 24, borderRadius: 2 },
  detailHeader: {
    flexDirection: "row",
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 12,
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  pageBtnDisabled: { opacity: 0.4 },
});
