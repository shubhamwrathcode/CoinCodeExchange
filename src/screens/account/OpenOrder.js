import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import {
  AppSafeAreaView,
  AppText,
  Toolbar,
  CommonModal,
} from "../../shared";
import { colors } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";
import { useAppSelector } from "../../store/hooks";
import FastImage from "react-native-fast-image";
import { NO_NOTIFICATION_ICON, NO_NOTIFICATION_ICON_LIGHT, right_ic } from "../../helper/ImageAssets";
import { useDispatch } from "react-redux";
import { getOpenOrders } from "../../actions/walletActions";
import moment from "moment";
import OpenOrderSkeleton from "./OpenOrderSkeleton";
import { toFixedSix, toFixedEight, spotOpenOrderMarketLabel } from "../../helper/utility";
import NavigationService from "../../navigation/NavigationService";
import { SPOT_ORDER_HISTORY_DETAIL } from "../../navigation/routes";
import { fontFamilySemiBold } from "../../theme/typography";
import { cancelOrder } from "../../actions/homeActions";
import ReactNativeModal from "react-native-modal";

const OpenOrder = ({
  investments = [],
  totalSelfInvestment = 0,
  totalDownlineInvestment = 0,
  totalAllInvestment = 0,
}) => {
  const dispatch = useDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const openOrdersRedux = useAppSelector((state) => state.home.openOrders);
  const [openOrders, setOpenOrders] = useState([]);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [isCancelLoading, setIsCancelLoading] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const limit = 10;

  useEffect(() => {
    setSkip(0);
    setHasMore(true);
    setOpenOrders([]);
    setIsInitialLoad(true);
    loadMoreData(0, true);
  }, []);

  useEffect(() => {
    if (openOrdersRedux == null) return; // still loading (skeleton visible)
    if (isInitialLoad) {
      setOpenOrders(openOrdersRedux);
      setIsInitialLoad(false);
    } else {
      setOpenOrders(prev => [...prev, ...openOrdersRedux]);
    }
    if (openOrdersRedux.length < limit) setHasMore(false);
    setLoading(false);
  }, [openOrdersRedux]);

  const loadMoreData = (currentSkip, isInitial = false) => {
    if (loading || (!hasMore && !isInitial)) return;

    setLoading(true);
    setSkip(currentSkip);
    dispatch(getOpenOrders(currentSkip, limit));
  };
  const handleScroll = (event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

    if (isCloseToBottom && hasMore && !loading) {
      const nextSkip = skip + limit;
      loadMoreData(nextSkip);
    }
  };

  const formatDateTimeCard = (dateString) => {
    if (!dateString) return "---";
    return moment(dateString).format("YYYY-MM-DD HH:mm:ss");
  };

  const getStatusColor = (status = "") => {
    const s = String(status).toUpperCase().trim();
    if (s === "FILLED" || s === "COMPLETED" || s === "EXECUTED") return colors.green;
    if (s === "REJECTED" || s === "CANCELLED" || s === "CANCELED") return colors.red;
    if (s === "PARTIAL") return colors.amber;
    if (s === "OPEN" || s === "PENDING") return colors.lightYellow;
    return themeColors.secondaryText;
  };

  const renderCard = (inv, idx) => {
    const currencyPair = spotOpenOrderMarketLabel(inv);
    const qty = Number(inv?.quantity ?? inv?.filled ?? 0) || 0;
    const remaining = Number(inv?.remaining) || 0;
    const filled = qty > 0 ? qty - remaining : (Number(inv?.filled) || 0);
    const totalQty = qty || filled || 0;
    const price = Number(inv?.price) || 0;
    const avgPrice = Number(inv?.avg_execution_price) || price;
    const status = inv?.status || "";
    const isFilled = String(status).toUpperCase().trim() === "FILLED";
    const orderTypeLabel = (inv?.order_type === "MARKET" ? "Market" : "Limit") + " / " + (inv?.side === "BUY" ? "Buy" : "Sell");

    const getStatusLabel = (s = "") => {
      const statusUpper = s.toUpperCase().trim();
      if (statusUpper === "FILLED") return "Filled";
      if (statusUpper === "CANCELLED" || statusUpper === "CANCELED") return "Cancelled";
      if (statusUpper === "REJECTED") return "Rejected";
      if (statusUpper === "PARTIAL") return "Partial";
      if (statusUpper === "OPEN") return "Open";
      if (statusUpper === "PENDING") return "Pending";
      return s || "---";
    };
    const statusLabel = getStatusLabel(status);

    const textColor = themeColors.text;
    const labelColor = themeColors.secondaryText;
    const orderId = inv?._id || inv?.id;
    const canCancel = !!orderId && !["FILLED", "CANCELLED", "CANCELED", "COMPLETED", "EXECUTED", "REJECTED"].includes(String(status).toUpperCase().trim());

    return (
      <View key={idx} style={styles.card}>
        <View style={styles.topRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => NavigationService.navigate(SPOT_ORDER_HISTORY_DETAIL, { item: inv })}
            style={styles.pairRow}
          >
            <AppText style={[styles.cardTitle, { color: textColor }]}>{currencyPair}</AppText>
            <FastImage
              source={right_ic}
              style={{ width: 12, height: 12, marginLeft: 2 }}
              resizeMode="contain"
              tintColor={labelColor}
            />
          </TouchableOpacity>
          <AppText style={[styles.cardDate, { color: labelColor }]}>
            {formatDateTimeCard(inv?.updatedAt || inv?.createdAt)}
          </AppText>
        </View>

        <AppText
          style={[
            styles.orderTypeLabel,
            { color: inv?.side === "BUY" ? colors.green : colors.red },
          ]}
        >
          {orderTypeLabel}
        </AppText>

        <View style={styles.cardRow}>
          <AppText style={[styles.cardLabel, { color: labelColor }]}>Amount:</AppText>
          <AppText style={[styles.cardValue, { color: textColor }]}>
            {toFixedEight(filled)} / {toFixedEight(totalQty)}
          </AppText>
        </View>

        <View style={styles.cardRow}>
          <AppText style={[styles.cardLabel, { color: labelColor }]}>Avg. / Price:</AppText>
          <AppText style={[styles.cardValue, { color: textColor }]}>
            {isFilled ? `${toFixedSix(avgPrice)} / ${toFixedSix(price)} (Counterparty 1)` : `0 / ${toFixedSix(price)}`}
          </AppText>
        </View>

        <View style={styles.cardRow}>
          <AppText style={[styles.cardLabel, { color: labelColor }]}>Status:</AppText>
          <AppText style={[styles.cardValue, { color: getStatusColor(status) }]}>{statusLabel}</AppText>
        </View>

        {canCancel && (
          <View style={[styles.cardRow, { marginTop: 8 }]}>
            <AppText style={[styles.cardLabel, { color: labelColor }]}>Action:</AppText>
            <TouchableOpacity
              style={styles.cancelActionBtn}
              onPress={() => {
                setOrderToCancel(inv);
                setIsCancelModalVisible(true);
              }}
            >
              <AppText style={{ color: colors.red, fontWeight: "600", fontSize: 13 }}>Cancel</AppText>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.cardDivider, { backgroundColor: themeColors.border }]} />
      </View>
    );
  };

  return (
    <AppSafeAreaView
      style={[
        styles.container,
        { backgroundColor: themeColors.background },
      ]}
    >
      <Toolbar
        isSecond
        title={"All Open Orders"}
        style={{ width: "62%", backgroundColor: "transparent" }}
      />

      {(openOrdersRedux == null || isInitialLoad) ? (
        <OpenOrderSkeleton />
      ) : openOrders?.length > 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={400}
        >
          {openOrders.map((inv, idx) => renderCard(inv, idx))}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.buttonBg || "#007AFF"} />
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.noDataRow}>
          <FastImage
            source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT}
            resizeMode="contain"
            style={{ width: 80, height: 80 }}
          />
        </View>
      )}

      <ReactNativeModal
        isVisible={isCancelModalVisible}
        animationIn="zoomIn"
        animationOut="zoomOut"
        backdropOpacity={0.5}
        onBackdropPress={() => setIsCancelModalVisible(false)}
        onBackButtonPress={() => setIsCancelModalVisible(false)}
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <View
          style={{
            backgroundColor: themeColors.themeElevationColor,
            borderRadius: 20,
            padding: 25,
            width: Dimensions.get("window").width * 0.85,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 10,
            borderWidth: 1,
            borderColor: themeColors.border,
          }}
        >
          <AppText
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: themeColors.text,
              textAlign: "center",
              marginBottom: 15,
            }}
          >
            Cancel Order
          </AppText>

          <AppText
            style={{
              fontSize: 15,
              color: themeColors.secondaryText,
              textAlign: "center",
              marginBottom: 25,
              lineHeight: 22,
            }}
          >
            Are you sure you want to cancel this order?
          </AppText>

          <View style={{ flexDirection: "row", width: "100%", gap: 10 }}>
            <TouchableOpacity
              onPress={() => setIsCancelModalVisible(false)}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: themeColors.themeElevationColor,
                borderWidth: 1,
                borderColor: themeColors.themeBorderColor,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AppText style={{ fontSize: 14, fontWeight: "600", color: themeColors.text }}>
                No, Keep
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={isCancelLoading}
              onPress={async () => {
                const orderId = orderToCancel?._id || orderToCancel?.id;
                if (orderId) {
                  setIsCancelLoading(true);
                  const res = await dispatch(cancelOrder({ order_id: orderId }));
                  setIsCancelLoading(false);
                  if (res?.success) {
                    setIsCancelModalVisible(false);
                    setOrderToCancel(null);
                  }
                } else {
                  setIsCancelModalVisible(false);
                  setOrderToCancel(null);
                }
              }}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: themeColors.red,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: themeColors.red,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 5,
                opacity: isCancelLoading ? 0.7 : 1,
              }}
            >
              {isCancelLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <AppText style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
                  Yes, Cancel
                </AppText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ReactNativeModal>
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 5,
    paddingBottom: 20,
  },

  card: {
    padding: 14,
    paddingBottom: 0,
    width: "100%",
    alignSelf: "center",
  },
  cardDivider: {
    height: 1,
    marginTop: 14,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },

  pairRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },

  cardTitle: {
    fontSize: 14,
    marginRight: 6,
    fontFamily: fontFamilySemiBold,
  },

  cardDate: {
    fontSize: 11,
  },

  orderTypeLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },

  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },

  cardLabel: {
    fontSize: 12,
    flex: 1,
  },

  cardValue: {
    fontSize: 12,
    flex: 1,
    textAlign: "right",
  },

  noDataRow: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
    paddingTop: 50,
  },
  noDataText: {
    color: "#888",
    fontStyle: "italic",
    marginTop: 10,
    fontSize: 14,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelActionBtn: {
    borderWidth: 1,
    borderColor: "#FF4F4F",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
});
export default OpenOrder;
