/**
 * Skeleton for NewSwapHistory (Swap History). Shown while swap history is loading.
 */
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { colors } from "../../theme/colors";
import ShimmerBone from "../../shared/components/ShimmerBone";
import { useTheme } from "../../hooks/useTheme";

const SHIMMER_STRIP_WIDTH = 80;

// Reusing generic ShimmerBone

const SwapCardSkeleton = ({ themeColors }) => (
  <View style={[styles.card, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
    <View style={[styles.cardHeader, { borderBottomColor: themeColors.border }]}>
      <View style={styles.cardHeaderLeft}>
        <ShimmerBone width={160} height={16} borderRadius={4} style={{ marginBottom: 6 }} />
        <ShimmerBone width={120} height={12} borderRadius={4} />
      </View>
      <ShimmerBone width={56} height={20} borderRadius={4} />
    </View>
    <View style={styles.cardBody}>
      <View style={styles.cardRow}>
        <ShimmerBone width={48} height={12} borderRadius={4} />
        <ShimmerBone width={32} height={12} borderRadius={4} />
      </View>
      <View style={styles.cardRow}>
        <ShimmerBone width={90} height={12} borderRadius={4} />
        <ShimmerBone width={100} height={12} borderRadius={4} />
      </View>
      <View style={styles.cardRow}>
        <ShimmerBone width={110} height={12} borderRadius={4} />
        <ShimmerBone width={100} height={12} borderRadius={4} />
      </View>
      <View style={styles.cardRow}>
        <ShimmerBone width={95} height={12} borderRadius={4} />
        <ShimmerBone width={80} height={12} borderRadius={4} />
      </View>
      <View style={styles.cardRow}>
        <ShimmerBone width={28} height={12} borderRadius={4} />
        <ShimmerBone width={60} height={12} borderRadius={4} />
      </View>
    </View>
  </View>
);

const NewSwapHistorySkeleton = () => {
  const { colors: themeColors } = useTheme();
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {[1, 2, 3, 4].map((i) => (
        <SwapCardSkeleton key={i} themeColors={themeColors} />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 20,
  },
  card: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
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
  cardBody: { gap: 6 },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 20,
  },
});

export default NewSwapHistorySkeleton;
