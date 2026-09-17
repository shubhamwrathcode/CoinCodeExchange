import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import {
  AppSafeAreaView,
  AppText,
  BLACK,
  Toolbar,
  WHITE,
} from "../../shared";
import { colors } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";
import { useAppSelector } from "../../store/hooks";
import FastImage from "react-native-fast-image";
import { folder, NO_NOTIFICATION_ICON, NO_NOTIFICATION_ICON_LIGHT } from "../../helper/ImageAssets";
import { getqbsHistory } from "../../actions/walletActions";
import { useDispatch } from "react-redux";
import NewSwapHistorySkeleton from "./NewSwapHistorySkeleton";
import moment from "moment";
import { toFixedSix } from "../../helper/utility";

const NewSwapHistory = ({
  investments = [],
  totalSelfInvestment = 0,
  totalDownlineInvestment = 0,
  totalAllInvestment = 0,
}) => {
  const dispatch = useDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const swapHistoryListRedux = useAppSelector(
    (state) => state.wallet.swapHistoryList
  );
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [swapHistoryList, setSwapHistoryList] = useState([]);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const limit = 10;

  useEffect(() => {
    setSkip(0);
    setHasMore(true);
    setSwapHistoryList([]);
    setIsInitialLoad(true);
    loadMoreData(0, true);
  }, []);

  useEffect(() => {
    if (swapHistoryListRedux == null) return;
    if (isInitialLoad) {
      setSwapHistoryList(swapHistoryListRedux);
      setIsInitialLoad(false);
    } else {
      setSwapHistoryList(prev => [...prev, ...swapHistoryListRedux]);
    }
    if (swapHistoryListRedux.length < limit) setHasMore(false);
    setLoading(false);
  }, [swapHistoryListRedux]);

  const loadMoreData = (currentSkip, isInitial = false) => {
    if (loading || (!hasMore && !isInitial)) return;

    setLoading(true);
    setSkip(currentSkip);
    dispatch(getqbsHistory(currentSkip, limit));
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

  const toggleCardExpansion = (index) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedCards(newExpanded);
  };

  const getStatusColor = (status) => {
    if (status === "Completed") return "#4CAF50";
    return "#F44336";
  };

  const renderCard = (inv, idx) => {
    const isExpanded = expandedCards.has(idx);

    return (
      <View
        key={idx}
        style={[
          styles.card,
          {
            backgroundColor: themeColors.background,
            borderColor: themeColors.border,
          },
        ]}
      >
        <View style={[styles.cardHeader, { borderBottomColor: themeColors.border }]}>
          <View style={styles.cardHeaderLeft}>
            <AppText style={[styles.cardTitle, { color: themeColors.text }]}>
              Swap: {inv?.from} → {inv?.to}
            </AppText>
            <AppText style={[styles.cardDate, { color: themeColors.secondaryText }]}>
              {moment(inv?.createdAt).format("MMM DD, YYYY • hh:mm A")}
            </AppText>
          </View>
          <View style={styles.statusBadge}>
            <AppText
              style={[
                styles.statusText,
                { color: getStatusColor(inv?.status) },
              ]}
            >
              {inv?.status}
            </AppText>
          </View>
        </View>

        <View style={styles.cardBody}>
          {/* Always show first 5 fields */}
          <View style={styles.cardRow}>
            <AppText style={[styles.cardLabel, { color: themeColors.secondaryText }]}>
              Sr no.:
            </AppText>
            <AppText style={[styles.cardValue, { color: themeColors.text }]}>
              {idx + 1}
            </AppText>
          </View>

          <View style={styles.cardRow}>
            <AppText style={[styles.cardLabel, { color: themeColors.secondaryText }]}>
              Paid Amount:
            </AppText>
            <AppText style={[styles.cardValue, { color: themeColors.text, fontWeight: "bold" }]}>
              {toFixedSix(inv?.pay_amount)} {inv?.from}
            </AppText>
          </View>

          <View style={styles.cardRow}>
            <AppText style={[styles.cardLabel, { color: themeColors.secondaryText }]}>
              Received Amount:
            </AppText>
            <AppText style={[styles.cardValue, { color: themeColors.text, fontWeight: "bold" }]}>
              {toFixedSix(inv?.get_amount)} {inv?.to}
            </AppText>
          </View>

          <View style={styles.cardRow}>
            <AppText style={[styles.cardLabel, { color: themeColors.secondaryText }]}>
              Conversion Rate:
            </AppText>
            <AppText style={[styles.cardValue, { color: themeColors.text }]}>
              1 {inv?.from} = {toFixedSix(inv?.conversion_rate)} {inv?.to}
            </AppText>
          </View>

          <View style={styles.cardRow}>
            <AppText style={[styles.cardLabel, { color: themeColors.secondaryText }]}>
              Fee:
            </AppText>
            <AppText style={[styles.cardValue, { color: themeColors.text }]}>
              {toFixedSix(inv?.fee)} {inv?.from}
            </AppText>
          </View>

          {/* View More / Hide Button */}
          {/* <View style={styles.viewMoreContainer}>
            <TouchableOpacity
              onPress={() => toggleCardExpansion(idx)}
              style={styles.viewMoreButton}
              activeOpacity={0.7}
            >
              <AppText style={[styles.viewMoreText, { color: colors.lightOrange || "#C99A1F" }]}>
                {isExpanded ? "Hide" : "View More"}
              </AppText>
            </TouchableOpacity>
          </View> */}
        </View>
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
        title={"Swap History"}
        style={{ width: "62%", backgroundColor: "transparent" }}
      />

      {(swapHistoryListRedux == null || isInitialLoad) ? (
        <NewSwapHistorySkeleton />
      ) : swapHistoryList?.length > 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={400}
        >
          {swapHistoryList.map((inv, idx) => renderCard(inv, idx))}
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
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingBottom: 20,
  },

  card: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    width: "95%",
    alignSelf: "center",
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },

  cardHeaderLeft: {
    flex: 1,
    marginRight: 10,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
  },

  cardDate: {
    fontSize: 12,
  },

  statusBadge: {
    paddingHorizontal: 0,
    paddingVertical: 4,
    backgroundColor: "transparent",
  },

  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },

  cardBody: {
    gap: 6,
  },

  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 20,
  },

  cardLabel: {
    fontSize: 13,
    flex: 1,
  },

  cardValue: {
    fontSize: 13,
    flex: 1,
    textAlign: "right",
  },

  viewMoreContainer: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.overlayColor,
    alignItems: "flex-end",
  },

  viewMoreButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },

  viewMoreText: {
    fontSize: 13,
    fontWeight: "600",
    textDecorationLine: "underline",
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
});

export default NewSwapHistory;
