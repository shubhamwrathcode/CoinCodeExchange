/**
 * Skeleton for RefferalReward screen. Shown while refer code / referral list is loading.
 */
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions, ScrollView } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { colors } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";

const { width } = Dimensions.get("window");
const CONTENT_PADDING = 16;
const CONTENT_WIDTH = width - CONTENT_PADDING * 2;
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

  const { colors: themeColors, isDark } = useTheme();
  const boneColor = isDark ? "#2A2A2A" : "#E1E9EE";
  const shimmerColors = isDark
    ? ["transparent", "rgba(255,255,255,0.08)", "transparent"]
    : ["transparent", "rgba(255,255,255,0.6)", "transparent"];

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

const RefferalRewardSkeleton = () => {
  const { colors: themeColors, isDark } = useTheme();
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.contentBlock}>
        <ShimmerBox width={CONTENT_WIDTH * 0.5} height={16} borderRadius={4} style={{ marginBottom: 8 }} />
        <ShimmerBox width={CONTENT_WIDTH * 0.75} height={14} borderRadius={4} style={{ marginBottom: 6 }} />
        <ShimmerBox width={CONTENT_WIDTH} height={12} borderRadius={4} />
      </View>

      <View style={[styles.card, { backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF", borderColor: isDark ? "#2A2A2A" : "#EEE", borderWidth: 1 }]}>
        <View style={styles.refRow}>
          <ShimmerBox width={80} height={12} borderRadius={4} />
          <ShimmerBox width={CONTENT_WIDTH * 0.45} height={12} borderRadius={4} />
        </View>
        <View style={styles.refRow}>
          <ShimmerBox width={90} height={12} borderRadius={4} />
          <ShimmerBox width={60} height={12} borderRadius={4} />
        </View>
        <View style={styles.copyFieldWrap}>
          <ShimmerBox width={CONTENT_WIDTH * 0.5} height={40} borderRadius={10} style={{ flex: 1 }} />
          <ShimmerBox width={56} height={36} borderRadius={6} style={{ marginLeft: 8 }} />
        </View>
      </View>

      <View style={styles.eventsSection}>
        <View style={[styles.eventCard, { width: CONTENT_WIDTH, backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF", borderColor: isDark ? "#2A2A2A" : "#EEE", borderWidth: 1 }]}>
          <ShimmerBox width={CONTENT_WIDTH - 32} height={100} borderRadius={12} style={{ marginBottom: 12 }} />
          <ShimmerBox width={140} height={14} borderRadius={4} style={{ marginBottom: 8 }} />
          <ShimmerBox width={CONTENT_WIDTH * 0.7} height={12} borderRadius={4} style={{ marginBottom: 12 }} />
          <ShimmerBox width={90} height={36} borderRadius={8} />
        </View>
        <View style={styles.dotsRow}>
          {[0, 1, 2].map((i) => (
            <ShimmerBox key={i} width={8} height={8} borderRadius={4} style={styles.dot} />
          ))}
        </View>
      </View>

      <View style={styles.howToSection}>
        <ShimmerBox width={220} height={14} borderRadius={4} style={{ marginBottom: 12 }} />
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.howToItem}>
            <ShimmerBox width={20} height={20} borderRadius={4} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <ShimmerBox width={160} height={12} borderRadius={4} style={{ marginBottom: 6 }} />
              <ShimmerBox width={CONTENT_WIDTH * 0.8} height={10} borderRadius={4} />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <ShimmerBox width={140} height={14} borderRadius={4} />
          <ShimmerBox width={140} height={40} borderRadius={8} />
        </View>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.historyCard, { backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF", borderColor: isDark ? "#2A2A2A" : "#EEE", borderWidth: 1 }]}>
            <View style={styles.historyRow}>
              <ShimmerBox width={40} height={10} borderRadius={4} />
              <ShimmerBox width={80} height={10} borderRadius={4} />
            </View>
            <View style={styles.historyRow}>
              <ShimmerBox width={70} height={10} borderRadius={4} />
              <ShimmerBox width={90} height={10} borderRadius={4} />
            </View>
            <View style={styles.historyRow}>
              <ShimmerBox width={60} height={10} borderRadius={4} />
              <ShimmerBox width={56} height={10} borderRadius={4} />
            </View>
            <View style={styles.historyRow}>
              <ShimmerBox width={60} height={10} borderRadius={4} />
              <ShimmerBox width={100} height={10} borderRadius={4} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  contentBlock: {
    marginHorizontal: CONTENT_PADDING,
    paddingTop: 4,
    marginTop: 10,
  },
  card: {
    marginHorizontal: CONTENT_PADDING,
    marginTop: 4,
    padding: 16,
    backgroundColor: "transparent",
    borderRadius: 12,
  },
  refRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  copyFieldWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  eventsSection: { marginTop: 24, marginHorizontal: CONTENT_PADDING },
  eventCard: {
    backgroundColor: "transparent",
    borderRadius: 12,
    padding: 16,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
    gap: 8,
  },
  dot: { marginHorizontal: 4 },
  howToSection: {
    marginHorizontal: CONTENT_PADDING,
    marginTop: 24,
  },
  howToItem: {
    flexDirection: "row",
    marginBottom: 14,
  },
  historySection: {
    marginHorizontal: CONTENT_PADDING,
    marginTop: 24,
    paddingBottom: 24,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  historyCard: {
    backgroundColor: "transparent",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
});

export default RefferalRewardSkeleton;
