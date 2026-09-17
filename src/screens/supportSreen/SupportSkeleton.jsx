/**
 * Skeleton for Support screen. Shown while tickets are loading.
 */
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { colors } from "../../theme/colors";

const { width } = Dimensions.get("window");
const H_PADDING = Math.max(14, width * 0.04);
const CONTENT_WIDTH = width - H_PADDING * 2;
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

const SupportSkeleton = () => {
  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <ShimmerBox width={CONTENT_WIDTH * 0.45} height={36} borderRadius={10} />
        <ShimmerBox width={CONTENT_WIDTH * 0.45} height={36} borderRadius={10} />
      </View>
      <View style={[styles.card, { backgroundColor: colors.themeElevationColor }]}>
        <View style={styles.headerRow}>
          <ShimmerBox width={50} height={11} borderRadius={4} />
          <ShimmerBox width={90} height={11} borderRadius={4} />
          <ShimmerBox width={100} height={11} borderRadius={4} />
          <ShimmerBox width={70} height={11} borderRadius={4} />
          <ShimmerBox width={60} height={11} borderRadius={4} />
        </View>
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={styles.dataRow}>
            <ShimmerBox width={40} height={10} borderRadius={4} />
            <ShimmerBox width={80} height={10} borderRadius={4} />
            <ShimmerBox width={90} height={10} borderRadius={4} />
            <ShimmerBox width={56} height={10} borderRadius={4} />
            <ShimmerBox width={44} height={22} borderRadius={6} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 12,
    paddingHorizontal: H_PADDING,
  },
  tabContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  card: {
    borderRadius: 12,
    padding: 12,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dividerColor,
    paddingVertical: 6,
    marginBottom: 4,
    gap: 8,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dividerColor || "rgba(255,255,255,0.06)",
    gap: 8,
  },
});

export default SupportSkeleton;
