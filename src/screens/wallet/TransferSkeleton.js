import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { colors } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";

const { width, height } = Dimensions.get("window");
const H_PADDING = 20;
const CONTENT_WIDTH = width - H_PADDING * 2;
const SHIMMER_STRIP_WIDTH = 80;

const ShimmerBox = ({ width: w, height, borderRadius = 8, style }) => {
  const { colors: themeColors, isDark } = useTheme();
  const shimmerX = useRef(new Animated.Value(-SHIMMER_STRIP_WIDTH)).current;

  useEffect(() => {
    shimmerX.setValue(-SHIMMER_STRIP_WIDTH);
    const run = () => {
      shimmerX.setValue(-SHIMMER_STRIP_WIDTH);
      Animated.timing(shimmerX, {
        toValue: w + SHIMMER_STRIP_WIDTH,
        duration: 900,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) run();
      });
    };
    run();
    return () => shimmerX.stopAnimation();
  }, [shimmerX, w]);

  const boneColor = isDark ? "#2A2A2A" : "#E1E9EE";
  const shimmerColors = isDark 
    ? ["transparent", "rgba(255,255,255,0.06)", "transparent"]
    : ["transparent", "rgba(255,255,255,0.6)", "transparent"];

  return (
    <View
      style={[
        {
          width: w,
          height,
          borderRadius,
          overflow: "hidden",
          backgroundColor: boneColor,
        },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            top: 0,
            bottom: 0,
            width: SHIMMER_STRIP_WIDTH,
            left: 0,
          },
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

const TransferSkeleton = ({ contentOnly = false }) => {
  const { colors: themeColors, isDark } = useTheme();
  const content = (
    <>
      {/* From / To card */}
      <View style={[styles.card, { backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF", borderColor: isDark ? "#2A2A2A" : "#EEE", borderWidth: 1, marginTop: -35 }]}>
        <View style={styles.cardRows}>
          <View style={styles.rowLeft}>
            <ShimmerBox width={40} height={12} borderRadius={4} />
          </View>
          <ShimmerBox width={72} height={16} borderRadius={6} />
          <ShimmerBox width={16} height={16} borderRadius={8} />
        </View>
        <View style={[styles.cardRows, { marginTop: 20 }]}>
          <View style={styles.rowLeft}>
            <ShimmerBox width={36} height={12} borderRadius={4} />
          </View>
          <ShimmerBox width={72} height={16} borderRadius={6} />
          <ShimmerBox width={16} height={16} borderRadius={8} />
        </View>
      </View>

      {/* Coin row */}
      <View style={styles.coinRow}>
        <View style={styles.coinLeft}>
          <ShimmerBox width={32} height={32} borderRadius={16} />
          <ShimmerBox width={70} height={16} borderRadius={4} style={{ marginLeft: 10 }} />
        </View>
        <ShimmerBox width={16} height={16} borderRadius={8} />
      </View>

      {/* Amount label */}
      <View style={{ marginTop: 24, marginBottom: 8 }}>
        <ShimmerBox width={120} height={16} borderRadius={4} />
      </View>

      {/* Amount input */}
      <View style={[styles.amountRow, { backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF", borderColor: isDark ? "#2A2A2A" : "#EEE", borderWidth: 1 }]}>
        <ShimmerBox width={CONTENT_WIDTH * 0.45} height={26} borderRadius={6} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
          <ShimmerBox width={40} height={14} borderRadius={4} />
          <ShimmerBox width={40} height={18} borderRadius={10} />
        </View>
      </View>

      {/* Available balance */}
      <View style={styles.balanceRow}>
        <ShimmerBox width={120} height={12} borderRadius={4} />
        <ShimmerBox width={120} height={12} borderRadius={4} />
      </View>

      {!contentOnly && (
        <View style={{ marginTop: 32 }}>
          <ShimmerBox width={CONTENT_WIDTH} height={44} borderRadius={22} />
        </View>
      )}
    </>
  );

  if (contentOnly) {
    return <View style={styles.contentOnlyWrap}>{content}</View>;
  }

  return (
    <View style={[styles.wrap, { backgroundColor: themeColors.background }]}>
      <View style={styles.headerRow}>
        <ShimmerBox width={28} height={28} borderRadius={16} />
        <ShimmerBox width={90} height={22} borderRadius={6} />
        <ShimmerBox width={28} height={28} borderRadius={16} />
      </View>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: H_PADDING,
    paddingTop: 16,
    backgroundColor: "transparent",
  },
  contentOnlyWrap: {
    paddingHorizontal: H_PADDING,
    paddingTop: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  card: {
    width: CONTENT_WIDTH,
    borderRadius: 12,
    padding: 14,
    backgroundColor: "transparent",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
  },
  cardRows: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  coinRow: {
    marginTop: 28,
    paddingHorizontal: H_PADDING,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  coinLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  amountRow: {
    marginTop: 16,
    marginHorizontal: H_PADDING,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  balanceRow: {
    marginTop: 12,
    marginHorizontal: H_PADDING,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});

export default TransferSkeleton;

