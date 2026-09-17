/**
 * Skeleton for Market screen. Shown while market/coin data is loading.
 */
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { colors } from "../../theme/colors";

const { width } = Dimensions.get("window");
const SIDE_SPACE = 20;
const CONTENT_WIDTH = width - SIDE_SPACE * 2;
const ITEM_WIDTH = width / 2 - 22;
const SHIMMER_STRIP_WIDTH = 80;

const ShimmerBox = ({ width: w, height, borderRadius = 6, style }) => {
  const shimmerX = useRef(new Animated.Value(-SHIMMER_STRIP_WIDTH)).current;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    shimmerX.setValue(-SHIMMER_STRIP_WIDTH);
    const run = () => {
      if (!mounted.current) return;
      shimmerX.setValue(-SHIMMER_STRIP_WIDTH);
      const toVal = Math.max(w, 1) + SHIMMER_STRIP_WIDTH;
      Animated.timing(shimmerX, {
        toValue: toVal,
        duration: 1100,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (mounted.current && finished) run();
      });
    };
    const t = setTimeout(run, 50);
    return () => {
      mounted.current = false;
      clearTimeout(t);
      shimmerX.stopAnimation();
    };
  }, [shimmerX, w]);

  const boneColor = colors.themeElevationColor;
  const shimmerColors = ["transparent", "rgba(255,255,255,0.16)", "transparent"];

  return (
    <View
      style={[
        { width: w, height, borderRadius, overflow: "hidden", backgroundColor: boneColor },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          { position: "absolute", top: 0, bottom: 0, width: SHIMMER_STRIP_WIDTH, left: 0 },
          { transform: [{ translateX: shimmerX }] },
        ]}
      >
        <LinearGradient
          colors={shimmerColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, width: SHIMMER_STRIP_WIDTH }}
        />
      </Animated.View>
    </View>
  );
};

const MarketSkeleton = () => {
  return (
    <View style={styles.wrap}>
      {/* Carousel area - featured cards */}
      <View style={styles.carouselWrap}>
        <View style={styles.carouselRow}>
          {[1, 2].map((i) => (
            <View key={i} style={[styles.cardWrapper, { width: ITEM_WIDTH }]}>
              <View style={styles.featuredCard}>
                <ShimmerBox width={ITEM_WIDTH - 24} height={100} borderRadius={12} style={{ marginBottom: 10 }} />
                <ShimmerBox width={60} height={14} borderRadius={4} />
                <ShimmerBox width={80} height={12} borderRadius={4} style={{ marginTop: 6 }} />
                <ShimmerBox width={ITEM_WIDTH * 0.5} height={40} borderRadius={8} style={{ marginTop: 10 }} />
              </View>
            </View>
          ))}
        </View>
        <View style={styles.dotContainer}>
          {[0, 1, 2].map((i) => (
            <ShimmerBox key={i} width={8} height={8} borderRadius={4} style={styles.dot} />
          ))}
        </View>
      </View>

      {/* Filter chips row */}
      <View style={styles.filterRow}>
        {[1, 2, 3, 4].map((i) => (
          <ShimmerBox key={i} width={72} height={32} borderRadius={8} style={styles.chip} />
        ))}
      </View>

      {/* Table header + rows */}
      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <ShimmerBox width={60} height={11} borderRadius={4} />
          <ShimmerBox width={70} height={11} borderRadius={4} />
          <ShimmerBox width={56} height={11} borderRadius={4} />
        </View>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={styles.tableRow}>
            <View style={styles.nameCol}>
              <ShimmerBox width={28} height={28} borderRadius={14} />
              <View style={styles.nameBlock}>
                <ShimmerBox width={52} height={12} borderRadius={4} />
                <ShimmerBox width={40} height={10} borderRadius={4} style={{ marginTop: 4 }} />
              </View>
            </View>
            <ShimmerBox width={48} height={12} borderRadius={4} />
            <ShimmerBox width={64} height={22} borderRadius={6} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: SIDE_SPACE,
    paddingBottom: 24,
  },
  carouselWrap: {
    marginTop: 10,
    marginBottom: 4,
  },
  carouselRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardWrapper: { marginHorizontal: 5 },
  featuredCard: {
    backgroundColor: colors.themeElevationColor,
    borderRadius: 12,
    padding: 12,
    height: 230,
  },
  dotContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
    gap: 6,
  },
  dot: { marginHorizontal: 2 },
  filterRow: {
    flexDirection: "row",
    marginTop: 14,
    gap: 8,
    marginBottom: 12,
  },
  chip: {},
  tableCard: {
    backgroundColor: colors.themeElevationColor,
    borderRadius: 12,
    padding: 10,
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.dividerColor || "rgba(255,255,255,0.08)",
    gap: 8,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.dividerColor || "rgba(255,255,255,0.06)",
  },
  nameCol: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  nameBlock: { marginLeft: 8 },
});

export default MarketSkeleton;
