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
import { useDispatch } from "react-redux";
import { getInteralWalletHistory } from "../../actions/walletActions";
import moment from "moment";
import InternalWalletHistorySkeleton from "./InternalWalletHistorySkeleton";

const InternalWalletHistory = ({
  investments = [],
  totalSelfInvestment = 0,
  totalDownlineInvestment = 0,
  totalAllInvestment = 0,
}) => {
  const dispatch = useDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const interalWalletHistoryRedux = useAppSelector(
    (state) => state.wallet.interalWalletHistory
  );
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [interalWalletHistory, setInteralWalletHistory] = useState([]);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const limit = 10;

  useEffect(() => {
    setSkip(0);
    setHasMore(true);
    setInteralWalletHistory([]);
    setIsInitialLoad(true);
    loadMoreData(0, true);
  }, []);

  useEffect(() => {
    if (interalWalletHistoryRedux == null) return;
    if (isInitialLoad) {
      setInteralWalletHistory(interalWalletHistoryRedux);
      setIsInitialLoad(false);
    } else {
      setInteralWalletHistory(prev => [...prev, ...interalWalletHistoryRedux]);
    }
    if (interalWalletHistoryRedux.length < limit) setHasMore(false);
    setLoading(false);
  }, [interalWalletHistoryRedux]);

  const loadMoreData = (currentSkip, isInitial = false) => {
    if (loading || (!hasMore && !isInitial)) return;
    
    setLoading(true);
    setSkip(currentSkip);
    dispatch(getInteralWalletHistory(currentSkip, limit));
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
    if (status === "COMPLETE" || status === "Completed") return "#4CAF50";
    if (status === "PENDING" || status === "CANCELLED") return "#FF9800";
    return "#F44336";
  };

  const renderCard = (inv, idx) => {
    const isExpanded = expandedCards.has(idx);
    const walletTransfer = `${inv?.from_wallet.charAt(0).toUpperCase() + inv?.from_wallet.slice(1)} Wallet >> ${inv?.to_wallet.charAt(0).toUpperCase() + inv?.to_wallet.slice(1)} Wallet`;

    return (
      <View
        key={idx}
        style={[
          styles.card,
          {
            backgroundColor: themeColors.background,
            borderColor: themeColors.border,
            borderWidth: 1,
          },
        ]}
      >
        <View style={[styles.cardHeader, { borderBottomColor: themeColors.border }]}>
          <View style={styles.cardHeaderLeft}>
           
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
              Amount:
            </AppText>
            <AppText style={[styles.cardValue, { color: themeColors.text, fontWeight: "bold" }]}>
              {inv?.amount} {inv?.short_name}
            </AppText>
          </View>

          <View style={styles.cardRow}>
            <AppText style={[styles.cardLabel, { color: themeColors.secondaryText }]}>
              Currency:
            </AppText>
            <AppText style={[styles.cardValue, { color: themeColors.text }]}>
              {inv?.short_name || "---"}
            </AppText>
          </View>

          <View style={styles.cardRow}>
            <AppText style={[styles.cardLabel, { color: themeColors.secondaryText }]}>
              Transfer:
            </AppText>
            <AppText style={[styles.cardValue, { color: themeColors.text }]}>
              {walletTransfer}
            </AppText>
          </View>
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
        title={"Internal Wallet Transfer History"}
        style={{ width: "80%", backgroundColor: "transparent" }}
      />

      {(interalWalletHistoryRedux == null || isInitialLoad) ? (
        <InternalWalletHistorySkeleton />
      ) : interalWalletHistory?.length > 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={400}
        >
          {interalWalletHistory.map((inv, idx) => renderCard(inv, idx))}
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
    borderColor: "rgba(0,0,0,0.05)",
    width: "95%",
    alignSelf: "center"
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

export default InternalWalletHistory;
