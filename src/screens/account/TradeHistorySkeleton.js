/**
 * Skeleton for TradeHistory (Spot Orders History). Shown while trade history is loading.
 */
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { colors } from "../../theme/colors";
import ShimmerBone from "../../shared/components/ShimmerBone";
import { useTheme } from "../../hooks/useTheme";

const CARD_PAD = 14;
const SHIMMER_STRIP_WIDTH = 80;

// Reusing generic ShimmerBone

const OrderCardSkeleton = ({ themeColors }) => (
  <View style={styles.card}>
    <View style={styles.topRow}>
      <ShimmerBone width={140} height={14} borderRadius={4} />
      <ShimmerBone width={100} height={11} borderRadius={4} />
    </View>
    <ShimmerBone width={80} height={12} borderRadius={4} style={{ marginBottom: 8 }} />
    <View style={styles.cardRow}>
      <ShimmerBone width={56} height={12} borderRadius={4} />
      <ShimmerBone width={100} height={12} borderRadius={4} />
    </View>
    <View style={styles.cardRow}>
      <ShimmerBone width={80} height={12} borderRadius={4} />
      <ShimmerBone width={120} height={12} borderRadius={4} />
    </View>
    <View style={styles.cardRow}>
      <ShimmerBone width={50} height={12} borderRadius={4} />
      <ShimmerBone width={44} height={12} borderRadius={4} />
    </View>
    <View style={[styles.cardDivider, { backgroundColor: themeColors.border }]} />
  </View>
);

const TradeHistorySkeleton = () => {
  const { colors: themeColors } = useTheme();
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {[1, 2, 3, 4].map((i) => (
        <OrderCardSkeleton key={i} themeColors={themeColors} />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 5,
    paddingBottom: 20,
  },
  card: {
    padding: CARD_PAD,
    paddingBottom: 0,
    width: "100%",
    alignSelf: "center",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardDivider: {
    height: 1,
    marginTop: 14,
  },
});

export default TradeHistorySkeleton;
