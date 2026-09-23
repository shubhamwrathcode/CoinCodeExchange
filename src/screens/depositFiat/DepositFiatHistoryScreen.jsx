import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  NativeModules,
} from "react-native";
import FastImage from "react-native-fast-image";
import Clipboard from "@react-native-clipboard/clipboard";
import Toast from "react-native-simple-toast";
import { useTheme } from "../../hooks/useTheme";
import { appOperation } from "../../appOperation";
import NavigationService from "../../navigation/NavigationService";
import {
  back_ic,
  closeIcon,
  downIcon,
  NO_NOTIFICATION_ICON,
  NO_NOTIFICATION_ICON_LIGHT,
} from "../../helper/ImageAssets";
import AnimatedBottomSheet from "../../common/AnimatedBottomSheet/AnimatedBottomSheet";
import {
  AppSafeAreaView,
  AppText,
  BOLD,
  SEMI_BOLD,
  MEDIUM,
  TWENTY_FOUR,
  EIGHTEEN,
  SIXTEEN,
  FIFTEEN,
  FOURTEEN,
  THIRTEEN,
  TWELVE,
  ELEVEN,
} from "../../shared";
import { colors } from "../../theme/colors";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const TIME_FILTER_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All status" },
  { value: "COMPLETED", label: "Completed" },
  { value: "LIMIT_HOLD", label: "In review" },
  { value: "REJECTED_HOLD", label: "Not accepted" },
  { value: "REFUND_PENDING", label: "Refund pending" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "REVERSED", label: "Reversed" },
  { value: "FAILED", label: "Failed" },
];

const STATUS_CONFIG = {
  COMPLETED: {
    label: "Completed",
    darkText: "#10B981",
    darkBg: "rgba(16,185,129,0.15)",
    lightText: "#059669",
    lightBg: "#D1FAE5",
  },
  LIMIT_HOLD: {
    label: "Under review",
    darkText: "#F59E0B",
    darkBg: "rgba(245,158,11,0.15)",
    lightText: "#D97706",
    lightBg: "#FEF3C7",
  },
  REJECTED_HOLD: {
    label: "Not accepted",
    darkText: "#EF4444",
    darkBg: "rgba(239,68,68,0.15)",
    lightText: "#DC2626",
    lightBg: "#FEE2E2",
  },
  REFUND_PENDING: {
    label: "Refund pending",
    darkText: "#F59E0B",
    darkBg: "rgba(245,158,11,0.15)",
    lightText: "#D97706",
    lightBg: "#FEF3C7",
  },
  REFUNDED: {
    label: "Refunded",
    darkText: "#60A5FA",
    darkBg: "rgba(96,165,250,0.15)",
    lightText: "#2563EB",
    lightBg: "#DBEAFE",
  },
  REVERSED: {
    label: "Reversed",
    darkText: "#EF4444",
    darkBg: "rgba(239,68,68,0.15)",
    lightText: "#DC2626",
    lightBg: "#FEE2E2",
  },
  FAILED: {
    label: "Failed",
    darkText: "#EF4444",
    darkBg: "rgba(239,68,68,0.15)",
    lightText: "#DC2626",
    lightBg: "#FEE2E2",
  },
};

function formatHistDateHeader(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = d.getDate();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

function formatAedAmount(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return String(val || "0.00");
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatFromLast4(item) {
  const last4 = String(item?.debtor_iban_last4 || item?.last4 || "").trim();
  if (last4) return `•••• ${last4}`;
  const iban = String(item?.debtor_iban || item?.iban || "").trim();
  if (iban && iban.length >= 4) return `•••• ${iban.slice(-4)}`;
  return "•••• 0001";
}

function formatBankLabel(item) {
  const iban = String(item?.debtor_iban || "").trim();
  if (iban && iban.length > 8) {
    return `${iban.slice(0, 4)}****${iban.slice(-4)}`;
  }
  const last4 = String(item?.debtor_iban_last4 || "").trim();
  if (last4) return `AE80****${last4}`;
  return item?.debtor_bank_name || "—";
}

const DepositFiatHistoryScreen = () => {
  const { colors: themeColors, isDark } = useTheme();

  // History State
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [timeFilter, setTimeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTx, setSelectedTx] = useState(null);
  const [copiedField, setCopiedField] = useState("");

  const txDetailSheetRef = useRef(null);
  const timePickerSheetRef = useRef(null);
  const statusPickerSheetRef = useRef(null);

  // Fetch Deposit History
  const fetchDepositsHistory = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setHistoryLoading(true);

    try {
      const query = statusFilter === "all" ? "" : `status=${encodeURIComponent(statusFilter)}`;
      const res = await appOperation.customer.fiat_deposits_list(query).catch(() => null);
      if (res?.success && res?.data) {
        const items = Array.isArray(res.data) ? res.data : res.data.items || [];
        setHistoryList(items);
      } else {
        setHistoryList([]);
      }
    } catch {
      setHistoryList([]);
    } finally {
      setHistoryLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchDepositsHistory();
  }, [fetchDepositsHistory]);

  const onRefresh = () => {
    fetchDepositsHistory(true);
  };

  // Handle Export Excel / CSV
  const handleExportExcel = async () => {
    if (!filteredHistory || filteredHistory.length === 0) {
      Toast.showWithGravity("No deposit history to export.", Toast.SHORT, Toast.BOTTOM);
      return;
    }

    setExporting(true);
    try {
      const timeLabel = TIME_FILTER_OPTIONS.find((t) => t.value === timeFilter)?.label || "All time";
      const statusLabel = STATUS_FILTER_OPTIONS.find((s) => s.value === statusFilter)?.label || "All status";

      const headers = ["Date", "Amount", "From", "Wallet", "Status", "Reference"];
      const rows = filteredHistory.map((item) => {
        const statusText = STATUS_CONFIG[String(item.status || "").toUpperCase()]?.label || item.status || "—";
        const amountStr = `${formatAedAmount(item.amount || item.net_credited || 0)} ${item.currency || "AED"}`;
        const fromStr = formatFromLast4(item);
        const walletStr = item.wallet_type === "spot" || !item.wallet_type ? "Spot" : String(item.wallet_type);
        const ref = item.channel_ref_id || item.id || item._id || "";

        return [
          `"${formatHistDateHeader(item.created_at || item.credited_at)}"`,
          `"${amountStr}"`,
          `"${fromStr}"`,
          `"${walletStr}"`,
          `"${statusText}"`,
          `"${ref}"`,
        ].join(",");
      });

      const csvContent = [
        `AGCE Fiat Deposits History Statement`,
        `Exported: ${new Date().toLocaleString()} | Filter: Time: ${timeLabel}, Status: ${statusLabel} | Records: ${filteredHistory.length}`,
        "",
        headers.join(","),
        ...rows,
      ].join("\n");

      const fileName = `AGCE_Fiat_Deposits_History_${new Date().toISOString().slice(0, 10)}.csv`;

      if (NativeModules.FileDownloadModule?.saveToDownloads) {
        await NativeModules.FileDownloadModule.saveToDownloads(fileName, csvContent, "text/csv");
        Toast.showWithGravity(`Downloaded ${fileName} to Downloads folder`, Toast.LONG, Toast.BOTTOM);
      } else {
        Toast.showWithGravity(`File prepared: ${fileName}`, Toast.LONG, Toast.BOTTOM);
      }
    } catch (err) {
      console.error("[ExportExcel] Error saving file:", err);
      Toast.showWithGravity("Could not download deposit history.", Toast.SHORT, Toast.BOTTOM);
    } finally {
      setExporting(false);
    }
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return historyList.filter((item) => {
      if (timeFilter !== "all") {
        const iso = item?.created_at || item?.credited_at;
        if (iso) {
          const d = new Date(iso);
          if (!Number.isNaN(d.getTime())) {
            const days = { "7d": 7, "30d": 30, "90d": 90 }[timeFilter];
            if (days) {
              const cutoff = new Date();
              cutoff.setDate(cutoff.getDate() - days);
              if (d < cutoff) return false;
            }
          }
        }
      }
      return true;
    });
  }, [historyList, timeFilter]);

  // Color tokens
  const bgColor = themeColors.background;
  const itemBorderColor = isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0";
  const headerBorderColor = isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0";
  const textColor = isDark ? "#FFFFFF" : "#0F172A";
  const subTextColor = isDark ? "rgba(255,255,255,0.55)" : "#64748B";
  const badgePillBg = isDark ? "rgba(255,255,255,0.06)" : "#EDF2F7";

  return (
    <AppSafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: headerBorderColor }]}>
        <TouchableOpacity
          onPress={() => NavigationService.goBack()}
          style={styles.headerBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <FastImage
            source={back_ic}
            style={styles.backIcon}
            resizeMode={FastImage.resizeMode.contain}
          />
        </TouchableOpacity>
        <AppText type={EIGHTEEN} weight={BOLD} color={textColor}>
          Deposit History
        </AppText>
        <View style={styles.headerRightSpacer} />
      </View>

      {/* Top Filter & Export Bar (Parity with Web & Screenshot) */}
      <View style={[styles.filterBarContainer, { borderBottomColor: headerBorderColor }]}>
        {/* Time Dropdown Column */}
        <View style={styles.filterDropdownCol}>
          <AppText type={TWELVE} color={subTextColor} style={styles.filterFieldLabel}>
            Time
          </AppText>
          <TouchableOpacity
            style={[styles.filterDropdownBtn, { backgroundColor: badgePillBg, borderColor: itemBorderColor }]}
            onPress={() => timePickerSheetRef.current?.open?.()}
            activeOpacity={0.75}
          >
            <AppText type={THIRTEEN} weight={MEDIUM} color={textColor} numberOfLines={1} style={styles.dropdownBtnText}>
              {TIME_FILTER_OPTIONS.find((t) => t.value === timeFilter)?.label || "All time"}
            </AppText>
            <FastImage
              source={downIcon}
              style={styles.dropdownChevronIcon}
              resizeMode="contain"
              tintColor={subTextColor}
            />
          </TouchableOpacity>
        </View>

        {/* Status Dropdown Column */}
        <View style={styles.filterDropdownCol}>
          <AppText type={TWELVE} color={subTextColor} style={styles.filterFieldLabel}>
            Status
          </AppText>
          <TouchableOpacity
            style={[styles.filterDropdownBtn, { backgroundColor: badgePillBg, borderColor: itemBorderColor }]}
            onPress={() => statusPickerSheetRef.current?.open?.()}
            activeOpacity={0.75}
          >
            <AppText type={THIRTEEN} weight={MEDIUM} color={textColor} numberOfLines={1} style={styles.dropdownBtnText}>
              {STATUS_FILTER_OPTIONS.find((s) => s.value === statusFilter)?.label || "All status"}
            </AppText>
            <FastImage
              source={downIcon}
              style={styles.dropdownChevronIcon}
              resizeMode="contain"
              tintColor={subTextColor}
            />
          </TouchableOpacity>
        </View>

        {/* Export Excel Button Column */}
        {(() => {
          const isExportDisabled = exporting || historyLoading || filteredHistory.length === 0;
          return (
            <View style={styles.exportBtnCol}>
              <TouchableOpacity
                style={[
                  styles.exportExcelBtn,
                  {
                    borderColor: isExportDisabled ? itemBorderColor : colors.cyanTheme,
                    opacity: isExportDisabled ? 0.45 : 1,
                  },
                ]}
                onPress={handleExportExcel}
                disabled={isExportDisabled}
                activeOpacity={0.75}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color={colors.cyanTheme} />
                ) : (
                  <AppText
                    type={THIRTEEN}
                    weight={SEMI_BOLD}
                    color={isExportDisabled ? subTextColor : colors.cyanTheme}
                  >
                    Export Excel
                  </AppText>
                )}
              </TouchableOpacity>
            </View>
          );
        })()}
      </View>

      {/* Main List ScrollView */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} color={colors.cyanTheme} />}
      >
        {historyLoading && !refreshing ? (
          <View style={[styles.historyEmptyCard, { borderColor: itemBorderColor }]}>
            <ActivityIndicator size="small" color={colors.cyanTheme} />
            <AppText type={THIRTEEN} style={styles.loadingText} color={subTextColor}>
              Loading deposit history…
            </AppText>
          </View>
        ) : filteredHistory.length === 0 ? (
          <View style={[styles.historyEmptyCard, { borderColor: itemBorderColor }]}>
            <FastImage source={isDark ? NO_NOTIFICATION_ICON_LIGHT : NO_NOTIFICATION_ICON} style={styles.emptyIcon} resizeMode="contain" />
            <AppText type={FIFTEEN} weight={BOLD} style={styles.emptyTitle} color={textColor}>
              No deposit records found
            </AppText>
            <AppText type={TWELVE} style={styles.emptyDesc} color={subTextColor}>
              Your fiat deposit transactions will appear here after transfer.
            </AppText>
          </View>
        ) : (
          <View style={styles.historyListWrap}>
            {filteredHistory.map((item, idx) => {
              const statusKey = String(item.status || "COMPLETED").toUpperCase();
              const cfg = STATUS_CONFIG[statusKey] || {
                label: item.status || "—",
                darkText: "#A1A1AA",
                darkBg: "rgba(255,255,255,0.08)",
                lightText: "#64748B",
                lightBg: "#F1F5F9",
              };

              const statusBadgeText = isDark ? cfg.darkText : cfg.lightText;
              const statusBadgeBg = isDark ? cfg.darkBg : cfg.lightBg;

              const amountFormatted = `${formatAedAmount(item.amount || item.net_credited || 0)} ${item.currency || "AED"}`;
              const walletLabel = item.wallet_type === "spot" || !item.wallet_type ? "Spot" : String(item.wallet_type);
              const fromLabel = formatFromLast4(item);

              return (
                <TouchableOpacity
                  key={item.id || item._id || String(idx)}
                  style={[styles.historyItemCard, { borderBottomColor: itemBorderColor }]}
                  onPress={() => {
                    setSelectedTx(item);
                    txDetailSheetRef.current?.open?.();
                  }}
                  activeOpacity={0.7}
                >
                  {/* Top Header: Date/Time + Status Badge */}
                  <View style={styles.cardHeaderRow}>
                    <AppText type={FIFTEEN} weight={BOLD} color={textColor}>
                      {formatHistDateHeader(item.created_at || item.credited_at)}
                    </AppText>

                    <View style={[styles.statusBadgePill, { backgroundColor: statusBadgeBg }]}>
                      <AppText type={TWELVE} weight={MEDIUM} color={statusBadgeText}>
                        {cfg.label}
                      </AppText>
                    </View>
                  </View>

                  {/* Key-Value Data Rows (3 Clean rows matching Web Screenshot) */}
                  <View style={styles.kvList}>
                    {/* Amount */}
                    <View style={styles.kvRow}>
                      <AppText type={FOURTEEN} color={subTextColor}>
                        Amount
                      </AppText>
                      <AppText type={FOURTEEN} weight={BOLD} color={textColor}>
                        {amountFormatted}
                      </AppText>
                    </View>

                    {/* From */}
                    <View style={styles.kvRow}>
                      <AppText type={FOURTEEN} color={subTextColor}>
                        From
                      </AppText>
                      <AppText type={FOURTEEN} weight={BOLD} color={textColor}>
                        {fromLabel}
                      </AppText>
                    </View>

                    {/* Wallet */}
                    <View style={styles.kvRow}>
                      <AppText type={FOURTEEN} color={subTextColor}>
                        Wallet
                      </AppText>
                      <AppText type={FOURTEEN} weight={BOLD} color={textColor}>
                        {walletLabel}
                      </AppText>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Transaction Detail Bottom Sheet */}
      <AnimatedBottomSheet
        ref={txDetailSheetRef}
        sheetHeight={Math.min(SCREEN_HEIGHT * 0.72, 540)}
        isDark={isDark}
      >
        <View style={styles.txSheetInner}>
          <View style={styles.txSheetHeader}>
            <AppText type={EIGHTEEN} weight={BOLD} color={textColor}>
              Deposit Details
            </AppText>
            <TouchableOpacity
              onPress={() => txDetailSheetRef.current?.close?.()}
              style={[styles.closeCircle, { backgroundColor: badgePillBg }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <FastImage source={closeIcon} style={styles.closeIconSmall} resizeMode="contain" tintColor={subTextColor} />
            </TouchableOpacity>
          </View>

          {selectedTx ? (
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <View style={styles.txAmountHero}>
                <AppText type={TWENTY_FOUR} weight={BOLD} color={textColor}>
                  + {formatAedAmount(selectedTx.net_credited || selectedTx.amount || 0)} {selectedTx.currency || "AED"}
                </AppText>
                <View style={[styles.statusBadgePill, { marginTop: 8, alignSelf: "center", backgroundColor: isDark ? "rgba(16,185,129,0.15)" : "#D1FAE5" }]}>
                  <AppText type={TWELVE} weight={BOLD} color={isDark ? "#10B981" : "#059669"}>
                    {STATUS_CONFIG[String(selectedTx.status || "").toUpperCase()]?.label || selectedTx.status}
                  </AppText>
                </View>
                {selectedTx.status_reason ? (
                  <AppText type={TWELVE} color="#EF4444" style={{ marginTop: 6, textAlign: "center" }}>
                    {selectedTx.status_reason}
                  </AppText>
                ) : null}
              </View>

              <View style={[styles.txDetailList, { borderColor: itemBorderColor }]}>
                {selectedTx.id || selectedTx._id ? (
                  <View style={styles.txDetailRow}>
                    <AppText type={THIRTEEN} weight={MEDIUM} color={subTextColor}>Transaction ID</AppText>
                    <View style={styles.copyableValueRow}>
                      <AppText type={FOURTEEN} weight={BOLD} color={textColor} numberOfLines={1}>
                        {selectedTx.id || selectedTx._id}
                      </AppText>
                      <TouchableOpacity
                        onPress={() => handleCopy(selectedTx.id || selectedTx._id, "tx_id", "ID")}
                        style={[styles.copyBtn, { backgroundColor: badgePillBg }]}
                      >
                        <AppText type={TWELVE} weight={BOLD} color={colors.cyanTheme}>
                          {copiedField === "tx_id" ? "Copied" : "Copy"}
                        </AppText>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                {selectedTx.channel_ref_id ? (
                  <View style={styles.txDetailRow}>
                    <AppText type={THIRTEEN} weight={MEDIUM} color={subTextColor}>Channel Ref</AppText>
                    <View style={styles.copyableValueRow}>
                      <AppText type={FOURTEEN} weight={BOLD} color={textColor} numberOfLines={1}>
                        {selectedTx.channel_ref_id}
                      </AppText>
                      <TouchableOpacity
                        onPress={() => handleCopy(selectedTx.channel_ref_id, "channel_ref", "Channel Ref")}
                        style={[styles.copyBtn, { backgroundColor: badgePillBg }]}
                      >
                        <AppText type={TWELVE} weight={BOLD} color={colors.cyanTheme}>
                          {copiedField === "channel_ref" ? "Copied" : "Copy"}
                        </AppText>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                <View style={styles.txDetailRow}>
                  <AppText type={THIRTEEN} weight={MEDIUM} color={subTextColor}>Amount</AppText>
                  <AppText type={FOURTEEN} weight={BOLD} color={textColor}>
                    {formatAedAmount(selectedTx.amount || selectedTx.net_credited || 0)} {selectedTx.currency || "AED"}
                  </AppText>
                </View>

                {selectedTx.fee_amount ? (
                  <View style={styles.txDetailRow}>
                    <AppText type={THIRTEEN} weight={MEDIUM} color={subTextColor}>Fee</AppText>
                    <AppText type={FOURTEEN} weight={BOLD} color={textColor}>
                      {formatAedAmount(selectedTx.fee_amount)} {selectedTx.currency || "AED"}
                    </AppText>
                  </View>
                ) : null}

                {selectedTx.debtor_iban || selectedTx.debtor_iban_last4 ? (
                  <View style={styles.txDetailRow}>
                    <AppText type={THIRTEEN} weight={MEDIUM} color={subTextColor}>Sender Bank</AppText>
                    <AppText type={FOURTEEN} weight={BOLD} color={textColor}>
                      {formatBankLabel(selectedTx)}
                    </AppText>
                  </View>
                ) : null}

                <View style={styles.txDetailRow}>
                  <AppText type={THIRTEEN} weight={MEDIUM} color={subTextColor}>Wallet</AppText>
                  <AppText type={FOURTEEN} weight={BOLD} color={textColor}>
                    {selectedTx.wallet_type === "spot" || !selectedTx.wallet_type ? "Spot" : String(selectedTx.wallet_type)}
                  </AppText>
                </View>

                <View style={styles.txDetailRow}>
                  <AppText type={THIRTEEN} weight={MEDIUM} color={subTextColor}>Date & Time</AppText>
                  <AppText type={FOURTEEN} weight={BOLD} color={textColor}>
                    {formatHistDateHeader(selectedTx.credited_at || selectedTx.created_at)}
                  </AppText>
                </View>
              </View>
            </ScrollView>
          ) : null}
        </View>
      </AnimatedBottomSheet>

      {/* Time Filter Picker Bottom Sheet */}
      <AnimatedBottomSheet
        ref={timePickerSheetRef}
        sheetHeight={Math.min(SCREEN_HEIGHT * 0.5, 360)}
        isDark={isDark}
      >
        <View style={styles.pickerSheetInner}>
          <View style={styles.pickerSheetHeader}>
            <AppText type={SIXTEEN} weight={BOLD} color={textColor}>
              Select Time Range
            </AppText>
            <TouchableOpacity
              onPress={() => timePickerSheetRef.current?.close?.()}
              style={styles.pickerCloseBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <FastImage source={closeIcon} style={styles.closeIconSmall} resizeMode="contain" tintColor={subTextColor} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {TIME_FILTER_OPTIONS.map((tf) => {
              const active = timeFilter === tf.value;
              return (
                <TouchableOpacity
                  key={tf.value}
                  onPress={() => {
                    setTimeFilter(tf.value);
                    timePickerSheetRef.current?.close?.();
                  }}
                  style={[
                    styles.pickerOptionRow,
                    { borderBottomColor: itemBorderColor },
                    active && { backgroundColor: isDark ? "rgba(209,170,103,0.1)" : "#FFFDF5" },
                  ]}
                  activeOpacity={0.7}
                >
                  <AppText
                    type={FOURTEEN}
                    weight={active ? BOLD : MEDIUM}
                    color={active ? colors.cyanTheme : textColor}
                  >
                    {tf.label}
                  </AppText>
                  {active ? (
                    <AppText type={FOURTEEN} weight={BOLD} color={colors.cyanTheme}>
                      ✓
                    </AppText>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </AnimatedBottomSheet>

      {/* Status Filter Picker Bottom Sheet */}
      <AnimatedBottomSheet
        ref={statusPickerSheetRef}
        sheetHeight={Math.min(SCREEN_HEIGHT * 0.72, 480)}
        isDark={isDark}
      >
        <View style={styles.pickerSheetInner}>
          <View style={styles.pickerSheetHeader}>
            <AppText type={SIXTEEN} weight={BOLD} color={textColor}>
              Select Status
            </AppText>
            <TouchableOpacity
              onPress={() => statusPickerSheetRef.current?.close?.()}
              style={styles.pickerCloseBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <FastImage source={closeIcon} style={styles.closeIconSmall} resizeMode="contain" tintColor={subTextColor} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {STATUS_FILTER_OPTIONS.map((sf) => {
              const active = statusFilter === sf.value;
              return (
                <TouchableOpacity
                  key={sf.value}
                  onPress={() => {
                    setStatusFilter(sf.value);
                    statusPickerSheetRef.current?.close?.();
                  }}
                  style={[
                    styles.pickerOptionRow,
                    { borderBottomColor: itemBorderColor },
                    active && { backgroundColor: isDark ? "rgba(209,170,103,0.1)" : "#FFFDF5" },
                  ]}
                  activeOpacity={0.7}
                >
                  <AppText
                    type={FOURTEEN}
                    weight={active ? BOLD : MEDIUM}
                    color={active ? colors.cyanTheme : textColor}
                  >
                    {sf.label}
                  </AppText>
                  {active ? (
                    <AppText type={FOURTEEN} weight={BOLD} color={colors.cyanTheme}>
                      ✓
                    </AppText>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    padding: 6,
  },
  backIcon: {
    width: 35,
    height: 35,
  },
  headerRightSpacer: {
    width: 30,
  },
  filterBarContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  filterDropdownCol: {
    flex: 1,
  },
  filterFieldLabel: {
    marginBottom: 6,
    paddingLeft: 2,
  },
  filterDropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  dropdownBtnText: {
    flex: 1,
    marginRight: 4,
  },
  dropdownChevronIcon: {
    width: 12,
    height: 12,
  },
  exportBtnCol: {
    flex: 1.15,
  },
  exportExcelBtn: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  pickerSheetInner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  pickerSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  pickerCloseBtn: {
    padding: 6,
  },
  pickerOptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  historyListWrap: {
    paddingTop: 8,
  },
  historyItemCard: {
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  statusBadgePill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  kvList: {
    gap: 12,
  },
  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  actionButtonsWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  historyEmptyCard: {
    padding: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
  },
  loadingText: {
    marginTop: 10,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    marginBottom: 12,
  },
  emptyTitle: {
    marginBottom: 4,
  },
  emptyDesc: {
    textAlign: "center",
  },
  txSheetInner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  txSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  closeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIconSmall: {
    width: 14,
    height: 14,
  },
  txAmountHero: {
    alignItems: "center",
    paddingVertical: 14,
  },
  txDetailList: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  txDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  copyableValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  copyBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
});

export default DepositFiatHistoryScreen;
