/**
 * Skeleton for Memex tab. Shown while meme list is loading.
 */
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useTheme } from "../../hooks/useTheme";

const { width } = Dimensions.get("window");
const PAD = 16;
const GAP = 6;
const CARD_WIDTH = (width - PAD * 2 - GAP * 2) / 3;
const SHIMMER_STRIP_WIDTH = 80;

const ShimmerBox = ({ width: w, height, borderRadius = 6, style }) => {
  const { isDark, colors: themeColors } = useTheme();
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

  const boneColor = themeColors.card;
  const shimmerColors = isDark 
    ? ["transparent", "rgba(255,255,255,0.08)", "transparent"]
    : ["transparent", "rgba(0,0,0,0.05)", "transparent"];

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

const MemexCardSkeleton = () => {
  const { colors: themeColors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: themeColors.card }]}>
      <ShimmerBox width={CARD_WIDTH - 12} height={110} borderRadius={10} />
      <ShimmerBox width={CARD_WIDTH * 0.6} height={11} borderRadius={4} style={{ marginTop: 8, marginHorizontal: 4 }} />
      <ShimmerBox width={40} height={10} borderRadius={4} style={{ marginTop: 6, marginHorizontal: 4 }} />
      <ShimmerBox width={36} height={10} borderRadius={4} style={{ marginTop: 6, marginHorizontal: 4 }} />
    </View>
  );
};

const MemexSkeleton = () => {
  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <ShimmerBox width={22} height={22} borderRadius={6} />
        <ShimmerBox width={80} height={18} borderRadius={4} />
      </View>
      <ShimmerBox width={width - 40} height={12} borderRadius={4} style={styles.subtitle} />
      <View style={styles.grid}>
        {[1, 2, 3].map((row) => (
          <View key={row} style={styles.row}>
            <MemexCardSkeleton />
            <MemexCardSkeleton />
            <MemexCardSkeleton />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {},
  headerRow: {
    marginVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: PAD,
  },
  subtitle: {
    marginHorizontal: 20,
    marginBottom: 10,
  },
  grid: {
    marginVertical: 10,
    marginHorizontal: PAD,
  },
  row: {
    flexDirection: "row",
    marginTop: 10,
    gap: GAP,
  },
  card: {
    width: CARD_WIDTH,
    paddingVertical: 6,
    borderRadius: 8,
    paddingHorizontal: 6,
  },
});

export default MemexSkeleton;
