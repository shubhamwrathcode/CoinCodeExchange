import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RBSheet from "react-native-raw-bottom-sheet";
import { useIsFocused } from "@react-navigation/native";
import {
  AppText,
  MEDIUM,
  SEMI_BOLD,
  BOLD,
  FOURTEEN,
  FIFTEEN,
  TWELVE,
} from "../../../shared";
import { colors } from "../../../theme/colors";
import { appOperation } from "../../../appOperation";
import moment from "moment";
import FastImage from "react-native-fast-image";
import { right_ic, NO_NOTIFICATION_ICON, NO_NOTIFICATION_ICON_LIGHT, eye_open_icon, closeDark_ic, filterNew, filterIcon, } from "../../../helper/ImageAssets";
import NavigationService from "../../../navigation/NavigationService";

import { showError, showSuccess } from "../../../helper/logger";
import { IMAGE_BASE_URL } from "../../../helper/Constants";
import CustomDropdown from '../../../common/CustomDropdown';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { fontFamilyMedium } from "../../../theme/typography";

const parseDec = (val) => {
  if (val == null) return "0";
  if (typeof val === "object" && val.$numberDecimal != null) return val.$numberDecimal;
  return String(val);
};

const safeToFixed = (val) => {
  const n = parseFloat(parseDec(val));
  if (!Number.isFinite(n) || n === 0) return "0.00";
  return n >= 1 ? n.toFixed(2) : n.toFixed(6);
};

const StatusBadge = ({ status }) => {
  const s = String(status || "").toUpperCase();
  let color = "#848e9c";
  if (s === "ACTIVE") color = "#03a66d";
  if (s === "COMPLETED") color = "#2b3139";
  if (s === "CANCELLED" || s === "CANCELED") color = "#ff4b5c";
  return (
    <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color }}>
      {s === "ACTIVE" ? "Active" : s === "COMPLETED" ? "Completed" : s === "CANCELLED" ? "Cancelled" : s}
    </AppText>
  );
};

const TradeKvRow = React.memo(({ label, value, color, textColor, isDark }) => (
  <View style={styles.tradeKvRow}>
    <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.tradeKvK, { color: isDark ? "#8E8E93" : "#666666" }]}>
      {label}
    </AppText>
    <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.tradeKvV, { color: color ?? textColor }]} numberOfLines={3}>
      {value}
    </AppText>
  </View>
));

const StakingCard = React.memo(({ item, themeColors, isDark, onView, onStake, onRedeem, onCancel, isLast }) => {
  const currency = item?.currency || "USDT";
  const pkg = item?.packageId || {};
  const apr = pkg?.returnPercentage || item?.returnPercentage || "0";

  const canAct = String(item?.status || "").toUpperCase() === "ACTIVE";
  const pkgStatus = pkg?.status ?? pkg?.packageStatus ?? "";
  const canStake = canAct && (pkgStatus === "" || String(pkgStatus).toUpperCase() === "ACTIVE");

  const textColor = themeColors.text ?? "#000000";
  const labelColor = themeColors.secondaryText ?? "#8E8E93";

  return (
    <View style={[styles.cardContainer, { borderBottomColor: themeColors.themeBorderColor, borderBottomWidth: isLast ? 0 : 1.5 }]}>
      <View style={styles.cardHeaderRow}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <FastImage
            source={{ uri: `${IMAGE_BASE_URL}${item?.iconPath}` }}
            style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }}
            resizeMode="cover"
            onError={(e) => {
              // Fallback handles gracefully in FastImage usually
            }}
          />
          <AppText type={FIFTEEN} weight={BOLD} style={{ color: textColor }}>
            {currency}
          </AppText>
        </View>
        <StatusBadge status={item?.status} />
      </View>

      <View style={styles.detailsContainer}>
        <TradeKvRow label="Start Date" value={moment(item?.startDate).format("DD MMM YYYY")} textColor={textColor} isDark={isDark} />
        <TradeKvRow label="End Date" value={moment(item?.endDate).format("DD MMM YYYY")} textColor={textColor} isDark={isDark} />
        <TradeKvRow label="Invested" value={`${safeToFixed(item?.totalInvestedAmount)} ${currency}`} textColor={textColor} isDark={isDark} />
        <TradeKvRow label="Cumulative Return" value={`+${safeToFixed(item?.totalClaimed)} ${currency}`} color="#03a66d" isDark={isDark} />
        <TradeKvRow label="APR" value={`${apr}% APR`} textColor={textColor} isDark={isDark} />
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionBtn, { borderColor: textColor }]} onPress={() => onView(item)}>
          <FastImage source={eye_open_icon} style={{ width: 14, height: 14, marginRight: 4 }} tintColor={textColor} resizeMode="contain" />
          <AppText style={{ color: textColor, fontSize: 13, fontWeight: "600" }}>View</AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: canStake ? colors.buttonBg : themeColors.themeBorderColor }]}
          onPress={() => onStake(item)}
          disabled={!canStake}
        >
          <AppText style={{ color: canStake ? colors.buttonBg : labelColor, fontSize: 13, fontWeight: "600" }}>Staking</AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: canAct ? colors.red : themeColors.themeBorderColor }]}
          onPress={() => onRedeem(item)}
          disabled={!canAct}
        >
          <AppText style={{ color: canAct ? colors.red : labelColor, fontSize: 13, fontWeight: "600" }}>Redeem</AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: canAct ? colors.cyanTheme : themeColors.themeBorderColor }]}
          onPress={() => onCancel(item)}
          disabled={!canAct}
        >
          <AppText style={{ color: canAct ? colors.cyanTheme : labelColor, fontSize: 13, fontWeight: "600" }}>Cancel</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const StakingWalletTab = ({ theme, themeColors }) => {
  const isDark = theme === "Dark";
  const isFocused = useIsFocused();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = 10;

  const viewSheetRef = React.useRef(null);
  const cancelSheetRef = React.useRef(null);
  const confirmCancelSheetRef = React.useRef(null);
  const redeemSheetRef = React.useRef(null);
  const confirmRedeemSheetRef = React.useRef(null);
  const filterSheetRef = React.useRef(null);

  const [selectedPosition, setSelectedPosition] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const [cancelReason, setCancelReason] = useState("");
  const [redeemAmount, setRedeemAmount] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const today = new Date();
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const fmtDate = (d) => d.toISOString().slice(0, 10);

  const [filterCoin, setFilterCoin] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterDateFrom, setFilterDateFrom] = useState(fmtDate(threeMonthsAgo));
  const [filterDateTo, setFilterDateTo] = useState(fmtDate(today));

  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState("from"); // "from" | "to"

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const coinOptions = useMemo(() => {
    const coins = [...new Set(positions.map((p) => p.currency).filter(Boolean))];
    return ["All", ...coins];
  }, [positions]);

  const stakingTypeOptions = ["All", "LOCKED", "FLEXIBLE"];
  const statusOptions = ["All", "ACTIVE", "COMPLETED", "CANCELLED"];

  const rowBetweenDateInputs = (rowDate, dateFromStr, dateToStr) => {
    if (!rowDate) return false;
    const d = new Date(rowDate);
    if (isNaN(d.valueOf())) return true;
    const f = dateFromStr ? new Date(dateFromStr) : null;
    const t = dateToStr ? new Date(dateToStr) : null;
    if (f && d < f) return false;
    if (t) {
      const endOfDay = new Date(t);
      endOfDay.setHours(23, 59, 59, 999);
      if (d > endOfDay) return false;
    }
    return true;
  };

  const filteredPositions = useMemo(() => {
    return positions.filter((r) => {
      if (filterCoin !== "All" && String(r.currency || "").toUpperCase() !== String(filterCoin).toUpperCase()) return false;
      if (filterType !== "All" && String(r.stakingType || "LOCKED").toUpperCase() !== String(filterType).toUpperCase()) return false;
      if (filterStatus !== "All" && String(r.status || "").toUpperCase() !== String(filterStatus).toUpperCase()) return false;
      if (!rowBetweenDateInputs(r.startDate || r.createdAt, filterDateFrom, filterDateTo)) return false;
      return true;
    });
  }, [positions, filterCoin, filterType, filterStatus, filterDateFrom, filterDateTo]);

  const resetFilters = () => {
    setFilterCoin("All");
    setFilterType("All");
    setFilterStatus("All");
    setFilterDateFrom(fmtDate(threeMonthsAgo));
    setFilterDateTo(fmtDate(today));
  };

  const fetchPositions = useCallback(async (pageNum = 1, isLoadMore = false) => {
    if (loading || (isLoadMore && loadingMore)) return;
    if (isLoadMore) setLoadingMore(true); else setLoading(true);

    try {
      const res = await appOperation.customer.Staking_MyPositions(pageNum, limit);
      if (res?.success) {
        let newData = [];
        const d = res.data;
        if (Array.isArray(d?.items)) newData = d.items;
        else if (Array.isArray(res.items)) newData = res.items;
        else if (Array.isArray(d)) newData = d;

        if (isLoadMore) {
          setPositions(prev => {
            const merged = [...prev, ...newData];
            return merged.filter((item, index, self) => index === self.findIndex((t) => (t._id || t.id) === (item._id || item.id)));
          });
        } else {
          setPositions(newData);
        }
        setHasMore(newData.length >= limit);
      }
    } finally {
      if (isLoadMore) setLoadingMore(false); else setLoading(false);
    }
  }, [loading, loadingMore]);

  useEffect(() => {
    if (isFocused) {
      setPage(1);
      fetchPositions(1);
    }
  }, [isFocused]);

  const handleLoadMore = () => {
    if (hasMore && !loadingMore && !loading) {
      const next = page + 1;
      setPage(next);
      fetchPositions(next, true);
    }
  };

  const handleView = (item) => {
    setSelectedPosition(item);
    viewSheetRef.current?.open();
  };

  const handleStake = (item) => {
    if (!item?.packageId) {
      showError("Package details not found.");
      return;
    }
    NavigationService.navigate('StakingPurchase', {
      plan: item.packageId,
      positionId: item._id,
      isTopUp: true,
      currentStakingAmount: parseDec(item.totalInvestedAmount) || "0"
    });
  };

  const submitCancel = async () => {
    if (!selectedPosition?._id) return;
    setActionLoading(true);
    try {
      const res = await appOperation.customer.Staking_CancelPosition(selectedPosition._id, cancelReason);
      if (res?.success) {
        showSuccess(res?.message);
        confirmCancelSheetRef.current?.close();
        cancelSheetRef.current?.close();
        setPage(1);
        fetchPositions(1);
      } else {
        showError(res?.message);
      }
    } catch (e) {
      showError(e?.response?.data?.message || e?.message);
    } finally {
      setActionLoading(false);
    }
  };

  const submitRedeem = async () => {
    if (!selectedPosition?._id || !redeemAmount) {
      showError("Please enter an amount");
      return;
    }

    const availableAmount = parseFloat(parseDec(selectedPosition?.totalInvestedAmount)) || 0;
    const minAmount = Number(selectedPosition?.packageId?.minAmount) > 0 ? Number(selectedPosition?.packageId?.minAmount) : 1;
    const num = Number(redeemAmount);
    if (num < minAmount) {
      showError(`Minimum redemption amount is ${minAmount} ${selectedPosition?.currency}`);
      return;
    }
    if (!selectedPosition?._id || !redeemAmount) return;
    setActionLoading(true);
    try {
      const res = await appOperation.customer.Staking_Redeem(selectedPosition._id, Number(redeemAmount));
      if (res?.success) {
        showSuccess(res?.message);
        confirmRedeemSheetRef.current?.close();
        redeemSheetRef.current?.close();
        setRedeemAmount("");
        setPage(1);
        fetchPositions(1);
      } else {
        showError(res?.message);
      }
    } catch (e) {
      showError(e?.response?.data?.message || e?.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenConfirmRedeem = () => {
    confirmRedeemSheetRef.current?.open();
  };

  const handleBackToRedeem = () => {
    confirmRedeemSheetRef.current?.close();
  };

  const handleOpenConfirmCancel = () => {
    cancelSheetRef.current?.close();
    setTimeout(() => {
      confirmCancelSheetRef.current?.open();
    }, 400);
  };

  const handleBackToCancel = () => {
    confirmCancelSheetRef.current?.close();
    setTimeout(() => {
      cancelSheetRef.current?.open();
    }, 400);
  };

  return (
    <View style={styles.container}>
      {loading && positions.length === 0 ? (
        <View style={{ padding: 40, alignItems: "center" }}>
          <ActivityIndicator color={colors.buttonBg} />
        </View>
      ) : (
        <FlatList
          data={filteredPositions}
          keyExtractor={(item, index) => item?._id || item?.id || String(index)}
          contentContainerStyle={{ paddingBottom: 40 }}
          scrollEnabled={false}
          ListHeaderComponent={
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 }}>
              <TouchableOpacity onPress={() => filterSheetRef.current?.open()} style={{ padding: 6 }}>
                <FastImage source={filterIcon} style={{ width: 18, height: 18 }} tintColor={themeColors.text} resizeMode="contain" />
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item, index }) => (
            <StakingCard
              item={item}
              isLast={index === filteredPositions.length - 1}
              themeColors={themeColors}
              isDark={isDark}
              onView={handleView}
              onStake={handleStake}
              onRedeem={(pos) => {
                setSelectedPosition(pos);
                setRedeemAmount("");
                redeemSheetRef.current?.open();
              }}
              onCancel={(pos) => {
                setSelectedPosition(pos);
                setCancelReason("");
                cancelSheetRef.current?.open();
              }}
            />
          )}
          ListFooterComponent={
            hasMore && positions.length > 0 ? (
              <TouchableOpacity style={{ padding: 16, alignItems: "center" }} onPress={handleLoadMore}>
                {loadingMore ? <ActivityIndicator color={colors.buttonBg} /> : <AppText style={{ color: colors.buttonBg, fontWeight: "600" }}>Load More</AppText>}
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 60, gap: 10 }}>
              <FastImage source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT} style={{ width: 80, height: 80 }} resizeMode="contain" />
              <AppText style={{ marginTop: 10, color: themeColors?.secondaryText }}>No Staking Positions Found</AppText>
            </View>
          }
        />
      )}

      {/* View Details Modal */}
      <RBSheet
        ref={viewSheetRef}
        closeOnDragDown={true}
        dragFromTopOnly={true}
        closeOnPressMask={true}
        {...({ customModalProps: { statusBarTranslucent: true } })}
        customStyles={{
          wrapper: { backgroundColor: "rgba(0,0,0,0.5)" },
          draggableIcon: { backgroundColor: themeColors.text || "#000" },
          container: {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: themeColors?.background || "#FFF",
            height: 640
          }
        }}
      >
        <View style={[styles.modalContent, { backgroundColor: themeColors?.background || "#FFF", flex: 1, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderBottomWidth: 1, borderBottomColor: themeColors?.themeBorderColor || "#EEE", paddingBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <FastImage source={{ uri: `${IMAGE_BASE_URL}${selectedPosition?.iconPath}` }} style={{ width: 32, height: 32, borderRadius: 16, marginRight: 10 }} />
                <View>
                  <AppText type={FIFTEEN} weight={BOLD} style={{ color: themeColors?.text }}>{selectedPosition?.currency} <AppText style={{ color: themeColors?.secondaryText, fontWeight: '400', fontSize: 13 }}>{selectedPosition?.currencyFullName}</AppText></AppText>
                  <AppText style={{ color: themeColors?.secondaryText, fontSize: 12 }}>Staking Position Details</AppText>
                </View>
              </View>
              <TouchableOpacity onPress={() => viewSheetRef.current?.close()} style={{ padding: 4 }}>
                <FastImage source={closeDark_ic} style={{ width: 16, height: 16 }} tintColor={themeColors?.secondaryText} resizeMode="contain" />
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 15 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <StatusBadge status={selectedPosition?.status} />
                <AppText style={{ color: themeColors?.text, marginLeft: 8 }} weight={SEMI_BOLD}>LOCKED</AppText>
              </View>

              <View style={[styles.detailSection, { backgroundColor: colors.iconBgColor }]}>
                <TradeKvRow label="Invested Amount" value={`${safeToFixed(selectedPosition?.totalInvestedAmount)} ${selectedPosition?.currency || ""}`} textColor={themeColors?.text} isDark={isDark} />
                <TradeKvRow label="Profit" value={`+${safeToFixed(selectedPosition?.totalClaimed)} ${selectedPosition?.currency || ""}`} color="#03a66d" isDark={isDark} />
              </View>

              <View style={[styles.detailSection, { backgroundColor: colors.iconBgColor }]}>
                <TradeKvRow label="APR" value={`${selectedPosition?.packageId?.returnPercentage || selectedPosition?.returnPercentage || "0"}%`} color="#03a66d" isDark={isDark} />
                <TradeKvRow label="Duration" value={`${selectedPosition?.durationDays ?? selectedPosition?.packageId?.duration ?? "—"} Days`} textColor={themeColors?.text} isDark={isDark} />
                <TradeKvRow label="Wallet Type" value={selectedPosition?.walletType ?? "earning"} textColor={themeColors?.text} isDark={isDark} />
                <TradeKvRow label="Credited To" value={selectedPosition?.creditedWalletType ?? "earning"} textColor={themeColors?.text} isDark={isDark} />
              </View>

              <View style={[styles.detailSection, { backgroundColor: colors.iconBgColor }]}>
                <TradeKvRow label="Start Date" value={selectedPosition?.startDate ? moment(selectedPosition.startDate).format("DD MMM YYYY") : "—"} textColor={themeColors?.text} isDark={isDark} />
                <TradeKvRow label="End Date" value={selectedPosition?.endDate ? moment(selectedPosition.endDate).format("DD MMM YYYY") : "—"} textColor={themeColors?.text} isDark={isDark} />
                <TradeKvRow label="Next Payout Date" value={selectedPosition?.nextPayoutDate ? moment(selectedPosition.nextPayoutDate).format("DD MMM YYYY") : "—"} textColor={themeColors?.text} isDark={isDark} />
                <TradeKvRow label="Created At" value={selectedPosition?.createdAt ? moment(selectedPosition.createdAt).format("DD MMM YYYY") : "—"} textColor={themeColors?.text} isDark={isDark} />
              </View>

              {(selectedPosition?.penaltyPercent > 0 || Number(selectedPosition?.penaltyAmount) > 0) && (
                <View style={[styles.detailSection, { backgroundColor: isDark ? "#3A1A1E" : "#efdadaff" }]}>
                  <TradeKvRow label="Penalty %" value={`${selectedPosition?.penaltyPercent ?? 0}%`} textColor={themeColors?.text} isDark={isDark} />
                  <TradeKvRow label="Penalty Amount" value={`${safeToFixed(selectedPosition?.penaltyAmount)} ${selectedPosition?.currency || ""}`} textColor={themeColors?.text} isDark={isDark} />
                  <TradeKvRow label="Refund Amount" value={`${safeToFixed(selectedPosition?.refundAmount)} ${selectedPosition?.currency || ""}`} textColor={themeColors?.text} isDark={isDark} />
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </RBSheet>

      {/* Cancel Modal */}
      <RBSheet
        ref={cancelSheetRef}
        closeOnDragDown={true}
        dragFromTopOnly={true}
        closeOnPressMask={true}
        keyboardAvoidingViewEnabled={false}
        {...({ customModalProps: { statusBarTranslucent: true } })}
        customStyles={{
          wrapper: { backgroundColor: "rgba(0,0,0,0.5)" },
          draggableIcon: { backgroundColor: themeColors.text || "#000" },
          container: {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: themeColors?.background || "#FFF",
            height: 640,
            marginBottom: keyboardHeight > 0 ? keyboardHeight - Math.max(insets.bottom, 0) : 0
          }
        }}
      >
        <View style={[styles.modalContent, { backgroundColor: themeColors?.background || "#FFF", flex: 1, paddingBottom: Math.max(insets.bottom, 16) }]}>
          {selectedPosition && (() => {
            const currency = selectedPosition?.currency || "";
            const invested = parseFloat(parseDec(selectedPosition?.totalInvestedAmount)) || 0;
            const penaltyPercent = parseFloat(parseDec(selectedPosition?.packageId?.earlyWithdrawalPenalty)) || 0;
            const penaltyAmount = (invested * penaltyPercent) / 100;
            const refundAmount = Math.max(invested - penaltyAmount, 0);

            return (
              <ScrollView showsVerticalScrollIndicator={false} bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}>

                {/* Header */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <FastImage source={{ uri: `${IMAGE_BASE_URL}${selectedPosition?.iconPath}` }} style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }} />
                    <AppText style={{ fontSize: 18, color: themeColors?.text }} weight={SEMI_BOLD}>Cancel {currency} Staking</AppText>
                  </View>
                  <TouchableOpacity onPress={() => cancelSheetRef.current?.close()} style={{ padding: 4 }}>
                    <FastImage source={closeDark_ic} style={{ width: 14, height: 14 }} tintColor={themeColors?.secondaryText} resizeMode="contain" />
                  </TouchableOpacity>
                </View>

                {/* Warning Banner */}
                <View style={{ backgroundColor: isDark ? "#3b2a1a" : "#fff8e6", padding: 12, borderRadius: 8, flexDirection: "row", marginBottom: 20 }}>
                  <AppText style={{ color: isDark ? "#f59e0b" : "#b45309", marginRight: 8, fontSize: 14, marginTop: 2 }}>⚠️</AppText>
                  <AppText style={{ color: isDark ? "#f59e0b" : "#b45309", fontSize: 13, flex: 1, lineHeight: 18 }}>
                    Cancelling will stop earning rewards and may apply an early penalty.
                  </AppText>
                </View>

                {/* Reason Input */}
                <View style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <AppText style={{ color: themeColors?.secondaryText, fontSize: 14 }} weight={SEMI_BOLD}>Cancel Reason </AppText>
                    <AppText style={{ color: themeColors?.secondaryText, fontSize: 12 }}>(Optional)</AppText>
                  </View>
                  <TextInput
                    value={cancelReason}
                    onChangeText={setCancelReason}
                    placeholder="e.g. Need funds urgently"
                    placeholderTextColor={themeColors?.secondaryText}
                    cursorColor={isDark ? colors.white : colors.black}
                    style={{
                      borderWidth: 1,
                      borderColor: themeColors?.themeBorderColor || "#EEE",
                      borderRadius: 8,
                      padding: 12,
                      minHeight: 80,
                      color: themeColors?.text,
                      textAlignVertical: "top",
                      fontSize: 14,
                      backgroundColor: isDark ? '#2A2A2E' : '#F7F7F7'
                    }}
                    multiline
                  />
                </View>

                {/* Details Box */}
                <View style={{ backgroundColor: isDark ? '#2A2A2E' : colors.inputBackground, padding: 16, borderRadius: 12, marginBottom: 24 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: isDark ? "#3f4650" : "#eaecef" }}>
                    <AppText style={{ color: themeColors?.secondaryText, fontSize: 14 }}>Total Invested</AppText>
                    <AppText style={{ color: themeColors?.text, fontSize: 14, fontWeight: '600' }}>{safeToFixed(invested)} {currency}</AppText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: isDark ? "#3f4650" : "#eaecef" }}>
                    <AppText style={{ color: themeColors?.secondaryText, fontSize: 14 }}>Penalty</AppText>
                    <AppText style={{ color: "#ff4b5c", fontSize: 14, fontWeight: '500' }}>{penaltyPercent}%</AppText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: isDark ? "#3f4650" : "#eaecef" }}>
                    <AppText style={{ color: themeColors?.secondaryText, fontSize: 14 }}>Penalty Amount</AppText>
                    <AppText style={{ color: "#ff4b5c", fontSize: 14, fontWeight: '500' }}>{safeToFixed(penaltyAmount)} {currency}</AppText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                    <AppText style={{ color: themeColors?.secondaryText, fontSize: 14 }}>Refund Amount</AppText>
                    <AppText style={{ color: "#03a66d", fontSize: 14, fontWeight: '600' }}>{safeToFixed(refundAmount)} {currency}</AppText>
                  </View>
                </View>

                {/* Buttons */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <TouchableOpacity style={[styles.modalBtn, { flex: 1, height: 48, backgroundColor: isDark ? "#2b3139" : "#f2f2f2", borderWidth: 0 }]} onPress={() => cancelSheetRef.current?.close()}>
                    <AppText style={{ color: themeColors?.text, fontWeight: '600', fontSize: 15 }}>Close</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, { flex: 1, height: 48, backgroundColor: colors.cyanTheme, borderWidth: 0 }]} onPress={handleOpenConfirmCancel}>
                    <AppText style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>Confirm</AppText>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            );
          })()}
        </View>
      </RBSheet>

      {/* Redeem Modal */}
      <RBSheet
        ref={redeemSheetRef}
        closeOnDragDown={true}
        dragFromTopOnly={true}
        closeOnPressMask={true}
        keyboardAvoidingViewEnabled={false}
        {...({ customModalProps: { statusBarTranslucent: true } })}
        customStyles={{
          wrapper: { backgroundColor: "rgba(0,0,0,0.5)" },
          draggableIcon: { backgroundColor: themeColors.text || "#000" },
          container: {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: themeColors?.background || "#FFF",
            height: 460,
            marginBottom: keyboardHeight > 0 ? keyboardHeight - Math.max(insets.bottom, 0) : 0
          }
        }}
      >
        <View style={[styles.modalContent, { backgroundColor: themeColors?.background || "#FFF", flex: 1, paddingBottom: Math.max(insets.bottom, 16) }]}>
          {selectedPosition && (() => {
            const rawUnbonding = selectedPosition?.unbondingPeriodDays ?? selectedPosition?.unbondingPeriod ?? selectedPosition?.packageId?.unbondingPeriodDays ?? selectedPosition?.packageId?.unbondingPeriod;
            const unbondingDays = Number.isFinite(Number(rawUnbonding)) ? Number(rawUnbonding) : 0;
            const timeReceived = moment(currentTime).add(unbondingDays, 'days').format("YYYY-MM-DD HH:mm");
            const minAmount = Number(selectedPosition?.packageId?.minAmount) > 0 ? Number(selectedPosition?.packageId?.minAmount) : 1;

            return (
              <ScrollView showsVerticalScrollIndicator={false} bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <FastImage source={{ uri: `${IMAGE_BASE_URL}${selectedPosition?.iconPath}` }} style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }} />
                    <AppText style={{ fontSize: 18, color: themeColors?.text }} weight={SEMI_BOLD}>Redeem {selectedPosition?.currency}</AppText>
                  </View>
                  <TouchableOpacity onPress={() => redeemSheetRef.current?.close()} style={{ padding: 4 }}>
                    <FastImage source={closeDark_ic} style={{ width: 14, height: 14 }} tintColor={themeColors?.secondaryText} resizeMode="contain" />
                  </TouchableOpacity>
                </View>

                <AppText style={{ color: themeColors?.secondaryText, marginBottom: 8, fontSize: 14 }} weight={SEMI_BOLD}>Amount</AppText>

                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: themeColors?.themeBorderColor || "#EEE", borderRadius: 8, paddingHorizontal: 12, height: 50, marginBottom: 8, backgroundColor: isDark ? '#2A2A2E' : '#F7F7F7' }}>
                  <TextInput
                    value={redeemAmount}
                    onChangeText={setRedeemAmount}
                    placeholder={`Min. ${minAmount}`}
                    placeholderTextColor={themeColors?.secondaryText}
                    cursorColor={isDark ? colors.white : colors.black}
                    keyboardType="numeric"
                    style={{ flex: 1, color: themeColors?.text, fontSize: 15 }}
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <AppText style={{ color: themeColors?.text, fontWeight: '600', fontSize: 14 }}>{selectedPosition?.currency}</AppText>
                    <View style={{ width: 1, height: 14, backgroundColor: themeColors?.themeBorderColor || "#EEE", marginHorizontal: 10 }} />
                    <TouchableOpacity onPress={() => setRedeemAmount(String(Number(parseDec(selectedPosition?.totalInvestedAmount))))}>
                      <AppText style={{ color: colors.cyanTheme, fontSize: 14, fontWeight: '500' }}>Max</AppText>
                    </TouchableOpacity>
                  </View>
                </View>

                {(() => {
                  const num = Number(redeemAmount);
                  let errorMsg = null;
                  const availableAmount = parseFloat(parseDec(selectedPosition?.totalInvestedAmount)) || 0;
                  if (redeemAmount && Number.isFinite(num) && num > 0) {
                    if (num < minAmount) errorMsg = `Minimum redemption amount is ${minAmount} ${selectedPosition?.currency}`;
                    else if (num > availableAmount) errorMsg = `Insufficient balance. Available: ${safeToFixed(selectedPosition?.totalInvestedAmount)} ${selectedPosition?.currency}`;
                  }
                  const isRedeemDisabled = actionLoading || !redeemAmount || errorMsg !== null;

                  return (
                    <>
                      {errorMsg ? (
                        <AppText style={{ color: "#ff4b5c", fontSize: 12, marginTop: -4, marginBottom: 8 }}>{errorMsg}</AppText>
                      ) : null}

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 }}>
                        <AppText style={{ color: themeColors?.secondaryText, fontSize: 13 }}>Available</AppText>
                        <AppText style={{ color: themeColors?.text, fontSize: 13, fontWeight: '600' }}>{safeToFixed(selectedPosition?.totalInvestedAmount)} {selectedPosition?.currency}</AppText>
                      </View>

                      {/* Timeline View */}
                      <View style={{ marginBottom: 30, paddingLeft: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: themeColors?.text, marginRight: 16, zIndex: 2 }} />
                          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <AppText style={{ color: themeColors?.text, fontSize: 14 }}>Time Redeemed</AppText>
                            <AppText style={{ color: themeColors?.secondaryText, fontSize: 14 }}>Now</AppText>
                          </View>
                          <View style={{ position: 'absolute', left: 3.5, top: 8, bottom: -28, width: 1, backgroundColor: themeColors?.themeBorderColor || "#EEE", zIndex: 1 }} />
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: themeColors?.themeBorderColor || "#EEE", marginRight: 16, zIndex: 2 }} />
                          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <AppText style={{ color: themeColors?.text, fontSize: 14 }}>Time Received</AppText>
                            <AppText style={{ color: themeColors?.secondaryText, fontSize: 14 }}>{timeReceived}</AppText>
                          </View>
                        </View>
                      </View>

                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 10 }}>
                        <TouchableOpacity style={[styles.modalBtn, { flex: 1, height: 48, backgroundColor: isDark ? "#2b3139" : "#EAECEF", borderWidth: 0 }]} onPress={() => redeemSheetRef.current?.close()}>
                          <AppText style={{ color: themeColors?.text, fontWeight: '600', fontSize: 15 }}>Cancel</AppText>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.modalBtn, { flex: 1, height: 48, backgroundColor: isRedeemDisabled ? (isDark ? "#2b3139" : "#EAECEF") : colors.cyanTheme, borderWidth: 0 }]}
                          onPress={handleOpenConfirmRedeem}
                          disabled={isRedeemDisabled}
                        >
                          {actionLoading ? <ActivityIndicator color="#FFF" size="small" /> : <AppText style={{ color: isRedeemDisabled ? themeColors?.secondaryText : "#FFF", fontWeight: "600", fontSize: 15 }}>Redemption</AppText>}
                        </TouchableOpacity>
                      </View>
                    </>
                  );
                })()}
              </ScrollView>
            );
          })()}
        </View>
      </RBSheet>

      {/* Confirm Redeem Modal */}
      <RBSheet
        ref={confirmRedeemSheetRef}
        closeOnDragDown={true}
        dragFromTopOnly={true}
        closeOnPressMask={true}
        keyboardAvoidingViewEnabled={false}
        {...({ customModalProps: { statusBarTranslucent: true } })}
        customStyles={{
          wrapper: { backgroundColor: "rgba(0,0,0,0.5)" },
          draggableIcon: { backgroundColor: themeColors.text || "#000" },
          container: {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: themeColors?.background || "#FFF",
            height: 640,
          }
        }}
      >
        <View style={[styles.modalContent, { backgroundColor: themeColors?.background || "#FFF", flex: 1, paddingBottom: Math.max(insets.bottom, 16) }]}>
          {selectedPosition && (() => {
            const rawUnbonding = selectedPosition?.unbondingPeriodDays ?? selectedPosition?.unbondingPeriod ?? selectedPosition?.packageId?.unbondingPeriodDays ?? selectedPosition?.packageId?.unbondingPeriod;
            const unbondingDays = Number.isFinite(Number(rawUnbonding)) ? Number(rawUnbonding) : 0;
            const timeReceived = moment(currentTime).add(unbondingDays, 'days').format("YYYY-MM-DD HH:mm");
            const availableAmount = parseFloat(parseDec(selectedPosition?.totalInvestedAmount)) || 0;
            const afterRedeem = availableAmount - Number(redeemAmount);

            return (
              <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ paddingBottom: 24 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <FastImage source={{ uri: `${IMAGE_BASE_URL}${selectedPosition?.iconPath}` }} style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }} />
                    <AppText style={{ fontSize: 18, color: themeColors?.text }} weight={SEMI_BOLD}>{selectedPosition?.currency} Redeem Overview</AppText>
                  </View>
                  <TouchableOpacity onPress={() => confirmRedeemSheetRef.current?.close()} style={{ padding: 4 }}>
                    <FastImage source={closeDark_ic} style={{ width: 14, height: 14 }} tintColor={themeColors?.secondaryText} resizeMode="contain" />
                  </TouchableOpacity>
                </View>

                <AppText style={{ color: themeColors?.secondaryText, fontSize: 14, marginBottom: 20 }}>
                  Please review your redemption details before confirming.
                </AppText>

                <View style={{ padding: 16, borderRadius: 12, marginBottom: 24 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                    <AppText style={{ color: themeColors?.secondaryText, fontSize: 14 }}>Currency</AppText>
                    <AppText style={{ color: themeColors?.text, fontSize: 14, fontWeight: '500' }}>{selectedPosition?.currency}</AppText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                    <AppText style={{ color: themeColors?.secondaryText, fontSize: 14 }}>Currency Name</AppText>
                    <AppText style={{ color: themeColors?.text, fontSize: 14, fontWeight: '500' }}>{selectedPosition?.packageId?.currencyFullName || selectedPosition?.currency}</AppText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, }}>
                    <AppText style={{ color: themeColors?.secondaryText, fontSize: 14 }}>Staking Type</AppText>
                    <AppText style={{ color: themeColors?.text, fontSize: 14, fontWeight: '500' }}>Locked Staking</AppText>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, paddingTop: 16 }}>
                    <AppText style={{ color: themeColors?.secondaryText, fontSize: 14 }}>Redeem Amount</AppText>
                    <AppText style={{ color: "#03a66d", fontSize: 14, fontWeight: '500' }}>{safeToFixed(redeemAmount)} {selectedPosition?.currency}</AppText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                    <AppText style={{ color: themeColors?.secondaryText, fontSize: 14 }}>Available</AppText>
                    <AppText style={{ color: themeColors?.text, fontSize: 14, fontWeight: '500' }}>{safeToFixed(selectedPosition?.totalInvestedAmount)} {selectedPosition?.currency}</AppText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, }}>
                    <AppText style={{ color: themeColors?.secondaryText, fontSize: 14 }}>After Redeem</AppText>
                    <AppText style={{ color: "#03a66d", fontSize: 14, fontWeight: '500' }}>{safeToFixed(afterRedeem)} {selectedPosition?.currency}</AppText>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, paddingTop: 16 }}>
                    <AppText style={{ color: themeColors?.secondaryText, fontSize: 14 }}>Time Redeemed</AppText>
                    <AppText style={{ color: themeColors?.text, fontSize: 14, fontWeight: '500' }}>Now</AppText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                    <AppText style={{ color: themeColors?.secondaryText, fontSize: 14 }}>Time Received</AppText>
                    <AppText style={{ color: "#03a66d", fontSize: 14, fontWeight: '500' }}>{timeReceived}</AppText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                    <AppText style={{ color: themeColors?.secondaryText, fontSize: 14 }}>Unbonding Period</AppText>
                    <AppText style={{ color: themeColors?.text, fontSize: 14, fontWeight: '500' }}>About {unbondingDays} day(s)</AppText>
                  </View>
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <TouchableOpacity style={[styles.modalBtn, { flex: 1, height: 48, backgroundColor: isDark ? "#2b3139" : "#EAECEF", borderWidth: 0 }]} onPress={handleBackToRedeem}>
                    <AppText style={{ color: themeColors?.text, fontWeight: '600', fontSize: 15 }}>Back</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, { flex: 1, height: 48, backgroundColor: colors.cyanTheme, borderWidth: 0 }]}
                    onPress={submitRedeem}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <ActivityIndicator color="#FFF" size="small" /> : <AppText style={{ color: "#FFF", fontWeight: "600", fontSize: 15 }}>Confirm</AppText>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            );
          })()}
        </View>
      </RBSheet>

      {/* Confirm Cancel Modal */}
      <RBSheet
        ref={confirmCancelSheetRef}
        closeOnDragDown={true}
        dragFromTopOnly={true}
        closeOnPressMask={true}
        keyboardAvoidingViewEnabled={false}
        {...({ customModalProps: { statusBarTranslucent: true } })}
        customStyles={{
          wrapper: { backgroundColor: "rgba(0,0,0,0.5)" },
          draggableIcon: { backgroundColor: themeColors.text || "#000" },
          container: {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: themeColors?.background || "#FFF",
            height: 580,
          }
        }}
      >
        <View style={[styles.modalContent, { backgroundColor: themeColors?.background || "#FFF", flex: 1, paddingBottom: Math.max(insets.bottom, 16) }]}>
          {selectedPosition && (() => {
            const currency = selectedPosition?.currency || "";
            const invested = parseFloat(parseDec(selectedPosition?.totalInvestedAmount)) || 0;
            const penaltyPercent = parseFloat(parseDec(selectedPosition?.packageId?.earlyWithdrawalPenalty)) || 0;
            const penaltyAmount = (invested * penaltyPercent) / 100;
            const refundAmount = Math.max(invested - penaltyAmount, 0);
            const rewardEarned = parseFloat(parseDec(selectedPosition?.totalRewardEarned)) || 0;

            return (
              <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ paddingBottom: 24 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <FastImage source={{ uri: `${IMAGE_BASE_URL}${selectedPosition?.iconPath}` }} style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }} />
                    <AppText style={{ fontSize: 18, color: themeColors?.text }} weight={SEMI_BOLD}>{currency} Cancel Overview</AppText>
                  </View>
                  <TouchableOpacity onPress={() => confirmCancelSheetRef.current?.close()} style={{ padding: 4 }}>
                    <FastImage source={closeDark_ic} style={{ width: 14, height: 14 }} tintColor={themeColors?.secondaryText} resizeMode="contain" />
                  </TouchableOpacity>
                </View>

                <AppText style={{ color: themeColors?.secondaryText, fontSize: 14, marginBottom: 20 }}>
                  Please review the cancellation details before confirming. This action cannot be undone.
                </AppText>

                <View style={{ backgroundColor: colors.inputBackground, padding: 16, borderRadius: 12, marginBottom: 24 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: isDark ? "#3f4650" : "#eaecef" }}>
                    <AppText style={{ color: themeColors?.secondaryText, fontSize: 14 }}>Currency</AppText>
                    <AppText style={{ color: themeColors?.text, fontSize: 14, fontWeight: '500' }}>{currency}</AppText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: isDark ? "#3f4650" : "#eaecef" }}>
                    <AppText style={{ color: themeColors?.secondaryText, fontSize: 14 }}>Total Invested</AppText>
                    <AppText style={{ color: themeColors?.text, fontSize: 14, fontWeight: '600' }}>{safeToFixed(invested)} {currency}</AppText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: isDark ? "#3f4650" : "#eaecef" }}>
                    <AppText style={{ color: themeColors?.secondaryText, fontSize: 14 }}>Penalty</AppText>
                    <AppText style={{ color: "#ff4b5c", fontSize: 14, fontWeight: '500' }}>{penaltyPercent}%</AppText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: isDark ? "#3f4650" : "#eaecef" }}>
                    <AppText style={{ color: themeColors?.secondaryText, fontSize: 14 }}>Penalty Amount</AppText>
                    <AppText style={{ color: "#ff4b5c", fontSize: 14, fontWeight: '500' }}>{safeToFixed(penaltyAmount)} {currency}</AppText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: isDark ? "#3f4650" : "#eaecef" }}>
                    <AppText style={{ color: themeColors?.secondaryText, fontSize: 14 }}>Refund Amount</AppText>
                    <AppText style={{ color: "#03a66d", fontSize: 14, fontWeight: '600' }}>{safeToFixed(refundAmount)} {currency}</AppText>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: cancelReason.trim() ? 1 : 0, borderBottomColor: isDark ? "#3f4650" : "#eaecef" }}>
                    <AppText style={{ color: themeColors?.secondaryText, fontSize: 14 }}>Reward Earned</AppText>
                    <AppText style={{ color: themeColors?.text, fontSize: 14, fontWeight: '500' }}>{safeToFixed(rewardEarned)} {currency}</AppText>
                  </View>
                  {cancelReason.trim() ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
                      <AppText style={{ color: themeColors?.secondaryText, fontSize: 14 }}>Cancel Reason</AppText>
                      <AppText style={{ color: themeColors?.text, fontSize: 14, fontWeight: '500' }}>{cancelReason.trim()}</AppText>
                    </View>
                  ) : null}
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <TouchableOpacity style={[styles.modalBtn, { flex: 1, height: 48, backgroundColor: isDark ? "#2b3139" : "#EAECEF", borderWidth: 0 }]} onPress={handleBackToCancel}>
                    <AppText style={{ color: themeColors?.text, fontWeight: '600', fontSize: 15 }}>Back</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, { flex: 1, height: 48, backgroundColor: colors.cyanTheme, borderWidth: 0 }]}
                    onPress={submitCancel}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <ActivityIndicator color="#FFF" size="small" /> : <AppText style={{ color: "#FFF", fontWeight: "600", fontSize: 15 }}>Confirm Cancel</AppText>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            );
          })()}
        </View>
      </RBSheet>

      {/* Filter Modal */}
      <RBSheet
        ref={filterSheetRef}
        closeOnDragDown={true}
        dragFromTopOnly={true}
        closeOnPressMask={true}
        keyboardAvoidingViewEnabled={false}
        {...({ customModalProps: { statusBarTranslucent: true } })}
        customStyles={{
          wrapper: { backgroundColor: "rgba(0,0,0,0.5)" },
          draggableIcon: { backgroundColor: themeColors.text || "#000" },
          container: {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: themeColors?.background || "#FFF",
            height: 600,
          }
        }}
      >
        <View style={[styles.modalContent, { backgroundColor: themeColors?.background || "#FFF", flex: 1, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <AppText style={{ fontSize: 18, color: themeColors?.text }} weight={SEMI_BOLD}>Filters</AppText>
              <TouchableOpacity onPress={() => filterSheetRef.current?.close()} style={{ padding: 4 }}>
                <FastImage source={closeDark_ic} style={{ width: 14, height: 14 }} tintColor={themeColors?.secondaryText} resizeMode="contain" />
              </TouchableOpacity>
            </View>

            <AppText style={{ color: themeColors?.text, marginBottom: 8, fontSize: 14 }} weight={SEMI_BOLD}>Coin</AppText>
            <CustomDropdown
              data={coinOptions}
              selected={filterCoin}
              onSelect={setFilterCoin}
              triggerStyle={{ marginBottom: 16, borderColor: themeColors?.themeBorderColor || "#EEE" }}
            />

            <AppText style={{ color: themeColors?.text, marginBottom: 8, fontSize: 14 }} weight={SEMI_BOLD}>Type</AppText>
            <CustomDropdown
              data={stakingTypeOptions}
              selected={filterType}
              onSelect={setFilterType}
              triggerStyle={{ marginBottom: 16, borderColor: themeColors?.themeBorderColor || "#EEE" }}
            />

            <AppText style={{ color: themeColors?.text, marginBottom: 8, fontSize: 14 }} weight={SEMI_BOLD}>Status</AppText>
            <CustomDropdown
              data={statusOptions}
              selected={filterStatus}
              onSelect={setFilterStatus}
              triggerStyle={{ marginBottom: 16, borderColor: themeColors?.themeBorderColor || "#EEE" }}
            />

            <AppText style={{ color: themeColors?.text, marginBottom: 8, fontSize: 14 }} weight={SEMI_BOLD}>Date</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <TouchableOpacity
                style={{ flex: 1, borderWidth: 1, borderColor: themeColors?.themeBorderColor || "#EEE", borderRadius: 8, padding: 12, alignItems: 'center' }}
                onPress={() => { setDatePickerMode("from"); setDatePickerVisibility(true); }}
              >
                <AppText style={{ color: themeColors?.text, fontFamily: fontFamilyMedium, fontSize: 14 }}>{filterDateFrom}</AppText>
              </TouchableOpacity>
              <AppText style={{ marginHorizontal: 8, color: themeColors?.secondaryText }}>→</AppText>
              <TouchableOpacity
                style={{ flex: 1, borderWidth: 1, borderColor: themeColors?.themeBorderColor || "#EEE", borderRadius: 8, padding: 12, alignItems: 'center' }}
                onPress={() => { setDatePickerMode("to"); setDatePickerVisibility(true); }}
              >
                <AppText style={{ color: themeColors?.text, fontFamily: fontFamilyMedium, fontSize: 14 }}>{filterDateTo}</AppText>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, height: 48, borderRadius: 10, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: themeColors?.secondaryText }}
                onPress={resetFilters}
              >
                <AppText style={{ color: themeColors?.text, fontWeight: "600", fontSize: 15 }}>Reset</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, height: 48, borderRadius: 10, justifyContent: "center", alignItems: "center", backgroundColor: colors.buttonBg }}
                onPress={() => filterSheetRef.current?.close()}
              >
                <AppText style={{ color: "#FFF", fontWeight: "600", fontSize: 15 }}>Search</AppText>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </RBSheet>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        display={Platform.OS === 'ios' ? 'inline' : 'spinner'}
        themeVariant={isDark ? "dark" : "light"}
        isDarkModeEnabled={isDark}
        textColor={isDark ? "#FFFFFF" : "#000000"}
        maximumDate={today}
        date={datePickerMode === "from" && !isNaN(new Date(filterDateFrom).getTime()) ? new Date(filterDateFrom) : (!isNaN(new Date(filterDateTo).getTime()) ? new Date(filterDateTo) : today)}
        onConfirm={(date) => {
          if (datePickerMode === "from") setFilterDateFrom(fmtDate(date));
          else setFilterDateTo(fmtDate(date));
          setDatePickerVisibility(false);
        }}
        onCancel={() => setDatePickerVisibility(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 100 },
  cardContainer: {
    paddingVertical: 14,
    borderBottomWidth: 1.5,
  },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  detailsContainer: { gap: 6, marginBottom: 14 },
  tradeKvRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  tradeKvK: { flex: 1 },
  tradeKvV: { flex: 2, textAlign: "right" },
  actionRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 6,
  },
  modalContent: { padding: 16, paddingBottom: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { fontSize: 17, marginBottom: 12 },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, height: 48, borderRadius: 10, justifyContent: "center", alignItems: "center", borderWidth: 1 },
  inputBox: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: "top" },
  detailSection: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginBottom: 8 }
});

export default StakingWalletTab;
