import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Share,
  Platform,
  NativeModules,
} from "react-native";
import FastImage from "react-native-fast-image";
import Clipboard from "@react-native-clipboard/clipboard";
import Toast from "react-native-simple-toast";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import { appOperation } from "../../appOperation";
import NavigationService from "../../navigation/NavigationService";
import { CREATE_TICKET_SCREEN } from "../../navigation/routes";
import {
  back_ic,
  closeIcon,
  copyIcon,
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
  FIFTEEN,
  FOURTEEN,
  THIRTEEN,
  TWELVE,
  SIXTEEN,
} from "../../shared";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const TIME_FILTER_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All status" },
  { value: "AWAITING_ADMIN", label: "Under review" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "INITIATED", label: "Sent to bank" },
  { value: "COMPLETED", label: "Completed" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "FAILED", label: "Failed" },
  { value: "REVERSED", label: "Reversed" },
];

const STATUS_CONFIG = {
  COMPLETED: {
    label: "Completed",
    darkText: "#10B981",
    darkBg: "rgba(16,185,129,0.15)",
    lightText: "#059669",
    lightBg: "#D1FAE5",
  },
  PROCESSED: {
    label: "Completed",
    darkText: "#10B981",
    darkBg: "rgba(16,185,129,0.15)",
    lightText: "#059669",
    lightBg: "#D1FAE5",
  },
  AWAITING_ADMIN: {
    label: "Under review",
    darkText: "#F59E0B",
    darkBg: "rgba(245,158,11,0.15)",
    lightText: "#D97706",
    lightBg: "#FEF3C7",
  },
  SUBMITTED: {
    label: "Submitted",
    darkText: "#F59E0B",
    darkBg: "rgba(245,158,11,0.15)",
    lightText: "#D97706",
    lightBg: "#FEF3C7",
  },
  INITIATED: {
    label: "Sent to bank",
    darkText: "#3B82F6",
    darkBg: "rgba(59,130,246,0.15)",
    lightText: "#2563EB",
    lightBg: "#DBEAFE",
  },
  REJECTED: {
    label: "Rejected",
    darkText: "#EF4444",
    darkBg: "rgba(239,68,68,0.15)",
    lightText: "#DC2626",
    lightBg: "#FEE2E2",
  },
  CANCELLED: {
    label: "Cancelled",
    darkText: "#A1A1AA",
    darkBg: "rgba(255,255,255,0.08)",
    lightText: "#64748B",
    lightBg: "#F1F5F9",
  },
  FAILED: {
    label: "Failed",
    darkText: "#EF4444",
    darkBg: "rgba(239,68,68,0.15)",
    lightText: "#DC2626",
    lightBg: "#FEE2E2",
  },
  REVERSED: {
    label: "Reversed",
    darkText: "#EF4444",
    darkBg: "rgba(239,68,68,0.15)",
    lightText: "#DC2626",
    lightBg: "#FEE2E2",
  },
};

function isUserCancelled(item, status) {
  if (String(status || item?.status || "").toUpperCase() !== "REJECTED") return false;
  if (String(item?.status_label || "") === "Cancelled") return true;
  const reason = String(item?.reject_reason || item?.status_reason || "").trim();
  return reason === "Cancelled by user" || /^you cancelled this withdrawal/i.test(reason);
}

function mapFiatWithdrawRow(item) {
  const status = String(item?.status || "").toUpperCase();
  const cancelled = isUserCancelled(item, status);
  let statusLabel = item?.status_label || status || "—";
  if (cancelled) statusLabel = "Cancelled";
  else if (status === "REJECTED" && (statusLabel === "Declined" || !item?.status_label)) {
    statusLabel = "Rejected";
  }
  return {
    ...item,
    status,
    statusLabel,
    cancelled,
  };
}

function formatHistDateHeader(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = d.getDate();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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

function formatBankLabel(item) {
  const ben = item?.whitelist || item?.beneficiary || null;
  const iban = String(item?.creditor_iban || ben?.iban || "").trim();
  if (iban && iban.length > 8) {
    return `${iban.slice(0, 4)}****${iban.slice(-4)}`;
  }
  const last4 = String(item?.creditor_iban_last4 || item?.iban_last4 || ben?.iban_last4 || "").trim();
  if (last4) return `AE80****${last4}`;
  return item?.bank_name || ben?.bank_name || "—";
}

function buildWithdrawSteps(row) {
  if (!row) return [];
  const requested = { title: "Withdrawal requested", time: formatHistDateHeader(row.created_at), emphasized: false };
  if (row.cancelled) {
    return [
      requested,
      { title: "Cancelled", time: formatHistDateHeader(row.finalized_at || row.updated_at || row.created_at), emphasized: true },
    ];
  }
  if (row.status === "REJECTED") {
    return [
      requested,
      { title: "Rejected", time: formatHistDateHeader(row.finalized_at || row.updated_at || row.created_at), emphasized: true },
    ];
  }
  if (row.status === "FAILED") {
    return [
      requested,
      { title: "Failed", time: formatHistDateHeader(row.finalized_at || row.updated_at || row.created_at), emphasized: true },
    ];
  }
  if (row.status === "REVERSED") {
    return [
      requested,
      { title: "Reversed", time: formatHistDateHeader(row.finalized_at || row.updated_at || row.created_at), emphasized: true },
    ];
  }
  if (row.status === "COMPLETED" || row.status === "PROCESSED") {
    return [
      requested,
      { title: "Sent to bank", time: formatHistDateHeader(row.initiated_at || row.created_at), emphasized: false },
      { title: "Completed", time: formatHistDateHeader(row.finalized_at || row.updated_at || row.created_at), emphasized: true },
    ];
  }
  if (row.status === "INITIATED") {
    return [
      requested,
      { title: "Sent to bank", time: formatHistDateHeader(row.initiated_at || row.created_at), emphasized: true },
    ];
  }
  if (row.status === "SUBMITTED") {
    return [
      requested,
      { title: "Submitted to bank", time: formatHistDateHeader(row.created_at), emphasized: true },
    ];
  }
  return [
    requested,
    { title: row.statusLabel || "Under review", time: formatHistDateHeader(row.created_at), emphasized: true },
  ];
}

function getStepColors(stepIndex, totalSteps, outcome) {
  const isLast = stepIndex === totalSteps - 1;
  if (isLast) {
    if (outcome === "danger") {
      return {
        core: "#EF4444",
        halo: "rgba(239, 68, 68, 0.22)",
      };
    }
    if (outcome === "pending") {
      return {
        core: "#F59E0B",
        halo: "rgba(245, 158, 11, 0.28)",
      };
    }
    return {
      core: "#00C087",
      halo: "rgba(0, 192, 135, 0.18)",
    };
  }

  // Initial / Intermediate steps (Green)
  return {
    core: "#00C087",
    halo: "rgba(0, 192, 135, 0.18)",
  };
}

function getLineColor(stepIndex, totalSteps, outcome) {
  if (outcome === "danger") return "rgba(239, 68, 68, 0.5)";
  if (outcome === "pending") return "rgba(245, 158, 11, 0.55)";
  return "rgba(0, 192, 135, 0.4)";
}

const WithdrawFiatHistoryScreen = () => {
  const { colors: themeColors, isDark } = useTheme();

  // History State
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTx, setSelectedTx] = useState(null);
  const [copiedField, setCopiedField] = useState("");
  const [cancellingId, setCancellingId] = useState("");
  const [exporting, setExporting] = useState(false);

  const txDetailSheetRef = useRef(null);
  const cancelConfirmSheetRef = useRef(null);
  const timePickerSheetRef = useRef(null);
  const statusPickerSheetRef = useRef(null);
  const [targetCancelItem, setTargetCancelItem] = useState(null);

  // Fetch Withdrawal History (Exact Web API Mapping)
  const fetchWithdrawalsHistory = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setHistoryLoading(true);

    try {
      const apiStatus =
        statusFilter === "all"
          ? ""
          : statusFilter === "CANCELLED"
            ? "REJECTED"
            : statusFilter;
      const query = apiStatus ? `status=${encodeURIComponent(apiStatus)}` : "";
      const res = await appOperation.customer.fiat_withdrawals_list(query).catch(() => null);
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
    fetchWithdrawalsHistory();
  }, [fetchWithdrawalsHistory]);

  const onRefresh = () => {
    fetchWithdrawalsHistory(true);
  };

  // Copy to clipboard helper
  const handleCopy = (text, fieldName, label) => {
    if (!text) return;
    Clipboard.setString(String(text));
    setCopiedField(fieldName);
    Toast.showWithGravity(`${label} copied`, Toast.SHORT, Toast.BOTTOM);
    setTimeout(() => {
      setCopiedField((cur) => (cur === fieldName ? "" : cur));
    }, 2000);
  };

  // Handle Export Excel / CSV
  const handleExportExcel = async () => {
    console.log("[ExportExcel] Button pressed. Filtered records count:", filteredHistory?.length);

    if (!filteredHistory || filteredHistory.length === 0) {
      console.warn("[ExportExcel] No records to export.");
      Toast.showWithGravity("No withdrawals history to export.", Toast.SHORT, Toast.BOTTOM);
      return;
    }

    setExporting(true);
    try {
      const timeLabel = TIME_FILTER_OPTIONS.find((t) => t.value === timeFilter)?.label || "All time";
      const statusLabel = STATUS_FILTER_OPTIONS.find((s) => s.value === statusFilter)?.label || "All status";

      const headers = ["Date", "Amount", "Fee", "Net Sent", "Bank", "Status", "Reason", "Wallet", "Reference"];
      const rows = filteredHistory.map((item) => {
        const ben = item.whitelist || item.beneficiary || null;
        const bankLine = [formatBankLabel(item), ben?.bank_name || item.bank_name].filter(Boolean).join(" · ");
        const statusText = item.statusLabel || (item.cancelled ? "Cancelled" : item.status || "—");
        const reason = item.status_reason || item.reject_reason || "";
        const netAmount = `${formatAedAmount(item.net_aed || item.amount || 0)} ${item.currency || "AED"}`;
        const grossAmount = `${formatAedAmount(item.amount || 0)} ${item.currency || "AED"}`;
        const feeAmount = `${formatAedAmount(item.fee_aed || item.fee || 0)} ${item.currency || "AED"}`;
        const ref = item.id || item._id || "";

        return [
          `"${formatHistDateHeader(item.created_at)}"`,
          `"${grossAmount}"`,
          `"${feeAmount}"`,
          `"${netAmount}"`,
          `"${bankLine.replace(/"/g, '""')}"`,
          `"${statusText}"`,
          `"${reason.replace(/"/g, '""')}"`,
          `"${item.wallet_type || "Spot"}"`,
          `"${ref}"`,
        ].join(",");
      });

      const csvContent = [
        `AGCE Fiat Withdrawals History Statement`,
        `Exported: ${new Date().toLocaleString()} | Filter: Time: ${timeLabel}, Status: ${statusLabel} | Records: ${filteredHistory.length}`,
        "",
        headers.join(","),
        ...rows,
      ].join("\n");

      const fileName = `AGCE_Fiat_Withdrawals_History_${new Date().toISOString().slice(0, 10)}.csv`;
      console.log("[ExportExcel] Generated file content. Target fileName:", fileName);
      console.log("[ExportExcel] NativeModules.FileDownloadModule:", NativeModules.FileDownloadModule);

      if (NativeModules.FileDownloadModule?.saveToDownloads) {
        const savedPath = await NativeModules.FileDownloadModule.saveToDownloads(fileName, csvContent, "text/csv");
        console.log("[ExportExcel] File successfully saved to Downloads at:", savedPath);
        Toast.showWithGravity(`Downloaded ${fileName} to Downloads folder`, Toast.LONG, Toast.BOTTOM);
      } else {
        console.warn("[ExportExcel] FileDownloadModule not found on native side. Please ensure app is reinstalled.");
        Toast.showWithGravity(`File prepared: ${fileName}`, Toast.LONG, Toast.BOTTOM);
      }
    } catch (err) {
      console.error("[ExportExcel] Error saving file:", err);
      Toast.showWithGravity("Could not download withdrawals history.", Toast.SHORT, Toast.BOTTOM);
    } finally {
      setExporting(false);
    }
  };

  // Handle Cancel Withdrawal Click
  const handleCancelClick = (item) => {
    const status = String(item.status || "").toUpperCase();
    if (status === "AWAITING_ADMIN" || status === "SUBMITTED") {
      setTargetCancelItem(item);
      cancelConfirmSheetRef.current?.open?.();
    } else {
      Toast.showWithGravity(`Cannot cancel withdrawal with status: ${status}`, Toast.SHORT, Toast.BOTTOM);
    }
  };

  // Confirm Cancel API Call
  const handleConfirmCancelWithdrawal = async () => {
    if (!targetCancelItem) return;
    const targetId = targetCancelItem.id || targetCancelItem._id;
    setCancellingId(targetId);
    try {
      const res = await appOperation.customer.fiat_withdrawals_cancel(targetId).catch((e) => e);
      if (res?.success) {
        cancelConfirmSheetRef.current?.close?.();
        txDetailSheetRef.current?.close?.();
        Toast.showWithGravity(res?.withdrawal?.status_label || "Withdrawal cancelled successfully", Toast.LONG, Toast.BOTTOM);
        setTargetCancelItem(null);
        await fetchWithdrawalsHistory(true);
      } else {
        Toast.showWithGravity(res?.message || "Could not cancel withdrawal", Toast.SHORT, Toast.BOTTOM);
      }
    } catch {
      Toast.showWithGravity("Could not cancel withdrawal", Toast.SHORT, Toast.BOTTOM);
    } finally {
      setCancellingId("");
    }
  };

  // Filtered History (Exact Web Filtering Parity)
  const filteredHistory = useMemo(() => {
    return historyList.map(mapFiatWithdrawRow).filter((row) => {
      if (timeFilter !== "all") {
        const iso = row?.created_at;
        if (iso) {
          const d = new Date(iso);
          if (!Number.isNaN(d.getTime())) {
            const days = { "7d": 7, "30d": 30, "90d": 90 }[timeFilter];
            if (days) {
              const cutoff = new Date();
              cutoff.setHours(0, 0, 0, 0);
              cutoff.setDate(cutoff.getDate() - days);
              if (d < cutoff) return false;
            }
          }
        }
      }
      if (statusFilter === "CANCELLED") return row.cancelled;
      if (statusFilter === "REJECTED") return row.status === "REJECTED" && !row.cancelled;
      return true;
    });
  }, [historyList, timeFilter, statusFilter]);

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
          Withdrawal History
        </AppText>
        <View style={styles.headerRightSpacer} />
      </View>

      {/* Filter Dropdowns & Export Button Row (Matching Web Screenshot) */}
      <View style={[styles.filtersRowContainer, { borderBottomColor: headerBorderColor }]}>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyanTheme} />}
      >
        {historyLoading && !refreshing ? (
          <View style={[styles.historyEmptyCard, { borderColor: itemBorderColor }]}>
            <ActivityIndicator size="small" color={colors.cyanTheme} />
            <AppText type={THIRTEEN} style={styles.loadingText} color={subTextColor}>
              Loading withdrawal history…
            </AppText>
          </View>
        ) : filteredHistory.length === 0 ? (
          <View style={[styles.historyEmptyCard, { borderColor: itemBorderColor }]}>
            <FastImage source={isDark ? NO_NOTIFICATION_ICON_LIGHT : NO_NOTIFICATION_ICON} style={styles.emptyIcon} resizeMode="contain" />
            <AppText type={FIFTEEN} weight={BOLD} style={styles.emptyTitle} color={textColor}>
              No withdrawal records found
            </AppText>
            <AppText type={TWELVE} style={styles.emptyDesc} color={subTextColor}>
              Your fiat AED withdrawal transactions will appear here after request.
            </AppText>
          </View>
        ) : (
          <View style={styles.historyListWrap}>
            {filteredHistory.map((item, idx) => {
              const statusKey = String(item.status || "COMPLETED").toUpperCase();
              const isCancelled = item.cancelled;
              const cfg = isCancelled
                ? STATUS_CONFIG.CANCELLED
                : STATUS_CONFIG[statusKey] || {
                  label: item.statusLabel || item.status || "—",
                  darkText: "#A1A1AA",
                  darkBg: "rgba(255,255,255,0.08)",
                  lightText: "#64748B",
                  lightBg: "#F1F5F9",
                };

              const statusBadgeText = isDark ? cfg.darkText : cfg.lightText;
              const statusBadgeBg = isDark ? cfg.darkBg : cfg.lightBg;
              const statusDisplayName = item.statusLabel || cfg.label;

              const amountFormatted = `${formatAedAmount(item.amount || item.net_aed || 0)} ${item.currency || "AED"}`;
              const feeFormatted = `${formatAedAmount(item.fee_aed || item.fee || 0)} ${item.currency || "AED"}`;
              const walletLabel = item.wallet_type === "spot" || !item.wallet_type ? "Spot" : String(item.wallet_type);
              const bankLabel = formatBankLabel(item);
              const canCancel = !isCancelled && (statusKey === "AWAITING_ADMIN" || statusKey === "SUBMITTED");

              return (
                <View
                  key={item.id || item._id || String(idx)}
                  style={[styles.historyItemCard, { borderBottomColor: itemBorderColor }]}
                >
                  {/* Top Header: Date/Time + Status Badge */}
                  <View style={styles.cardHeaderRow}>
                    <AppText type={FIFTEEN} weight={BOLD} color={textColor}>
                      {formatHistDateHeader(item.created_at)}
                    </AppText>

                    <View style={[styles.statusBadgePill, { backgroundColor: statusBadgeBg }]}>
                      <AppText type={TWELVE} weight={MEDIUM} color={statusBadgeText}>
                        {statusDisplayName}
                      </AppText>
                    </View>
                  </View>

                  {/* Key-Value Data Rows */}
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

                    {/* Fee */}
                    <View style={styles.kvRow}>
                      <AppText type={FOURTEEN} color={subTextColor}>
                        Fee
                      </AppText>
                      <AppText type={FOURTEEN} weight={BOLD} color={textColor}>
                        {feeFormatted}
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

                    {/* Bank */}
                    <View style={styles.kvRow}>
                      <AppText type={FOURTEEN} color={subTextColor}>
                        Bank
                      </AppText>
                      <AppText type={FOURTEEN} weight={BOLD} color={textColor}>
                        {bankLabel}
                      </AppText>
                    </View>

                    {/* Action Row */}
                    <View style={styles.actionRow}>
                      <AppText type={FOURTEEN} color={subTextColor}>
                        Action
                      </AppText>

                      <View style={styles.actionButtonsWrap}>
                        {/* Review / Details Button */}
                        <TouchableOpacity
                          activeOpacity={0.75}
                          onPress={() => {
                            setSelectedTx(item);
                            txDetailSheetRef.current?.open?.();
                          }}
                          style={[
                            styles.actionBtn,
                            {
                              borderColor: colors.cyanTheme,
                              backgroundColor: isDark ? "rgba(209,170,103,0.06)" : "#FFFDF5",
                            },
                          ]}
                        >
                          <AppText type={TWELVE} weight={SEMI_BOLD} color={colors.cyanTheme}>
                            Review
                          </AppText>
                        </TouchableOpacity>

                        {/* Cancel Button (Active when awaiting admin) */}
                        {canCancel ? (
                          <TouchableOpacity
                            activeOpacity={0.75}
                            onPress={() => handleCancelClick(item)}
                            style={[
                              styles.actionBtn,
                              {
                                borderColor: isDark ? "rgba(239,68,68,0.7)" : "#DC2626",
                                backgroundColor: isDark ? "rgba(239,68,68,0.06)" : "#FEF2F2",
                              },
                            ]}
                          >
                            <AppText type={TWELVE} weight={SEMI_BOLD} color={isDark ? "#F87171" : "#DC2626"}>
                              Cancel
                            </AppText>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Transaction Detail Bottom Sheet */}
      <AnimatedBottomSheet
        ref={txDetailSheetRef}
        sheetHeight={Math.min(SCREEN_HEIGHT * 0.88, 620)}
        isDark={isDark}
      >
        <View style={styles.txSheetInner}>
          <View style={styles.txSheetHeader}>
            <AppText type={EIGHTEEN} weight={BOLD} color={textColor}>
              Withdrawal details
            </AppText>
            <TouchableOpacity
              onPress={() => txDetailSheetRef.current?.close?.()}
              style={styles.txCloseBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <FastImage source={closeIcon} style={styles.closeIconSmall} resizeMode="contain" tintColor={subTextColor} />
            </TouchableOpacity>
          </View>

          {selectedTx ? (() => {
            const steps = buildWithdrawSteps(selectedTx);
            const statusKey = String(selectedTx.status || "").toUpperCase();
            const isCancelled = selectedTx.cancelled;
            const isSuccess = statusKey === "COMPLETED" || statusKey === "PROCESSED";
            const isDanger = statusKey === "REJECTED" || statusKey === "FAILED" || statusKey === "REVERSED";

            const stepperOutcome = isSuccess ? "success" : isDanger ? "danger" : "pending";

            const ben = selectedTx.whitelist || selectedTx.beneficiary || null;
            const bankLine = [formatBankLabel(selectedTx), ben?.bank_name || selectedTx.bank_name].filter((v) => v && v !== "—").join(" · ");
            const accountNameVal = ben?.account_name_masked || selectedTx.account_name_masked || "";

            const fields = [
              { label: "Status", value: selectedTx.statusLabel || (isCancelled ? "Cancelled" : STATUS_CONFIG[statusKey]?.label || selectedTx.status) },
              { label: "Date", value: formatHistDateHeader(selectedTx.created_at) },
              { label: "Withdraw amount", value: `${formatAedAmount(selectedTx.amount)} ${selectedTx.currency || "AED"}` },
              { label: "Fee", value: `${formatAedAmount(selectedTx.fee_aed || selectedTx.fee || 0)} ${selectedTx.currency || "AED"}` },
              { label: "Sent to bank", value: `${formatAedAmount(selectedTx.net_aed || selectedTx.amount || 0)} ${selectedTx.currency || "AED"}` },
              { label: "Wallet", value: selectedTx.wallet_type === "spot" || !selectedTx.wallet_type ? "Spot" : String(selectedTx.wallet_type) },
              { label: "Bank account", value: bankLine },
              { label: "Account name", value: accountNameVal },
              { label: "Approval", value: selectedTx.approval_mode === "AUTO" ? "Auto" : "Manual" },
              { label: "Reference", value: selectedTx.id || selectedTx._id, copy: true, fieldName: "ref_id" },
              { label: "Bank reference", value: selectedTx.channel_ref_id, copy: true, fieldName: "bank_ref" },
              { label: "Sent at", value: formatHistDateHeader(selectedTx.initiated_at) },
              { label: "Finalized", value: formatHistDateHeader(selectedTx.finalized_at) },
            ].filter((f) => f.value && f.value !== "—");

            const canCancelTx = !isCancelled && (statusKey === "AWAITING_ADMIN" || statusKey === "SUBMITTED");

            return (
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Stepper Progress */}
                <View style={styles.stepperContainer}>
                  {steps.map((s, i, arr) => {
                    const isLast = i === arr.length - 1;
                    const stepColors = getStepColors(i, arr.length, stepperOutcome);
                    const lineColor = getLineColor(i, arr.length, stepperOutcome);
                    return (
                      <View key={`step-${i}`} style={styles.stepRow}>
                        <View style={styles.stepIndicatorCol}>
                          <View style={[styles.stepDotHalo, { backgroundColor: stepColors.halo }]}>
                            <View style={[styles.stepDotCore, { backgroundColor: stepColors.core }]} />
                          </View>
                          {!isLast ? (
                            <View style={[styles.stepLine, { backgroundColor: lineColor }]} />
                          ) : null}
                        </View>
                        <View style={[styles.stepTextCol, !isLast && { paddingBottom: 16 }]}>
                          <AppText type={FOURTEEN} weight={BOLD} color={textColor}>
                            {s.title}
                          </AppText>
                          {s.time && s.time !== "—" ? (
                            <AppText type={TWELVE} color={subTextColor} style={{ marginTop: 2 }}>
                              {s.time}
                            </AppText>
                          ) : null}
                          {isLast && (selectedTx.status_reason || selectedTx.reject_reason || (isSuccess ? "AED was sent to your bank" : "")) ? (
                            <AppText
                              type={TWELVE}
                              color={isDanger ? "#EF4444" : subTextColor}
                              style={{ marginTop: 4 }}
                            >
                              {selectedTx.status_reason || selectedTx.reject_reason || (isSuccess ? "AED was sent to your bank" : "")}
                            </AppText>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Table of Details */}
                <View style={styles.txDetailList}>
                  {fields.map((f) => (
                    <View key={f.label} style={styles.txDetailRow}>
                      <AppText type={THIRTEEN} color={subTextColor} style={styles.txDetailLabel}>
                        {f.label}
                      </AppText>
                      <View style={styles.copyableValueRow}>
                        <AppText
                          type={THIRTEEN}
                          weight={BOLD}
                          color={textColor}
                          numberOfLines={1}
                          ellipsizeMode={f.copy ? "middle" : "tail"}
                          style={styles.copyableText}
                        >
                          {f.value}
                        </AppText>
                        {f.copy ? (
                          <TouchableOpacity
                            onPress={() => handleCopy(f.value, f.fieldName, f.label)}
                            style={[
                              styles.copyIconBtn,
                              {
                                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6",
                                borderColor: itemBorderColor,
                              },
                            ]}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            activeOpacity={0.7}
                          >
                            <FastImage
                              source={copyIcon}
                              style={styles.copyIconImage}
                              resizeMode="contain"
                              tintColor={subTextColor}
                            />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>

                {/* Cancel Button if eligible */}
                {canCancelTx ? (
                  <TouchableOpacity
                    onPress={() => {
                      txDetailSheetRef.current?.close?.();
                      handleCancelClick(selectedTx);
                    }}
                    style={[styles.modalCancelFullBtn, { backgroundColor: colors.cyanTheme }]}
                    activeOpacity={0.85}
                  >
                    <AppText type={FOURTEEN} weight={BOLD} color="#000000">
                      Cancel withdrawal
                    </AppText>
                  </TouchableOpacity>
                ) : null}

                {/* Need Help Link */}
                <TouchableOpacity
                  style={styles.helpLinkContainer}
                  activeOpacity={0.7}
                  onPress={() => {
                    txDetailSheetRef.current?.close?.();
                    NavigationService.navigate(CREATE_TICKET_SCREEN);
                  }}
                >
                  <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: colors.cyanTheme }}>
                    Need help? Chat with us
                  </AppText>
                </TouchableOpacity>
              </ScrollView>
            );
          })() : null}
        </View>
      </AnimatedBottomSheet>

      {/* Cancel Confirmation Sheet */}
      <AnimatedBottomSheet
        ref={cancelConfirmSheetRef}
        sheetHeight={260}
        isDark={isDark}
      >
        <View style={styles.txSheetInner}>
          <AppText type={EIGHTEEN} weight={BOLD} style={{ marginBottom: 8 }} color={textColor}>
            Cancel withdrawal?
          </AppText>
          <AppText type={THIRTEEN} style={{ marginBottom: 20 }} color={subTextColor}>
            Are you sure you want to cancel withdrawal of {formatAedAmount(targetCancelItem?.amount)} AED? Funds will return to your Spot AED wallet.
          </AppText>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              onPress={() => cancelConfirmSheetRef.current?.close?.()}
              style={[styles.modalSecondaryBtn, { borderColor: itemBorderColor }]}
              activeOpacity={0.7}
            >
              <AppText type={FOURTEEN} weight={SEMI_BOLD} color={textColor}>Back</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirmCancelWithdrawal}
              disabled={!!cancellingId}
              style={[styles.modalDangerBtn, { backgroundColor: "#EF4444" }]}
              activeOpacity={0.85}
            >
              {cancellingId ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <AppText type={FOURTEEN} weight={BOLD} color="#FFFFFF">Cancel Withdrawal</AppText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedBottomSheet>
      {/* Time Filter Picker Bottom Sheet */}
      <AnimatedBottomSheet
        ref={timePickerSheetRef}
        sheetHeight={280}
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
  filtersRowContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  dropdownBtnText: {
    flex: 1,
    marginRight: 4,
  },
  dropdownChevronIcon: {
    width: 10,
    height: 10,
  },
  exportBtnCol: {
    justifyContent: "flex-end",
  },
  exportExcelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: 14,
  },
  pickerCloseBtn: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerOptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    width: 48,
    height: 48,
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
  txCloseBtn: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIconSmall: {
    width: 14,
    height: 14,
  },
  stepperContainer: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
    marginBottom: 8,
  },
  stepRow: {
    flexDirection: "row",
  },
  stepIndicatorCol: {
    width: 20,
    alignItems: "center",
  },
  stepDotHalo: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepDotCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
    marginVertical: 2,
    borderRadius: 1,
  },
  stepTextCol: {
    flex: 1,
    paddingLeft: 12,
  },
  txDetailList: {
    marginTop: 4,
  },
  txDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    gap: 12,
  },
  txDetailLabel: {
    flexShrink: 0,
  },
  copyableValueRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    maxWidth: "70%",
  },
  copyableText: {
    flexShrink: 1,
    textAlign: "right",
  },
  copyIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  copyIconImage: {
    width: 13,
    height: 13,
  },
  modalCancelFullBtn: {
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    marginBottom: 8,
  },
  helpLinkContainer: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryBtn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalDangerBtn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default WithdrawFiatHistoryScreen;
