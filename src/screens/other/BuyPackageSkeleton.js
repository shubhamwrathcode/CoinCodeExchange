/**
 * Skeleton loader for BuyPackage screen.
 * Mirrors layout: header, coin row, duration tabs, payment method, amount input, details, button.
 */
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { colors } from "../../theme/colors";

const { width } = Dimensions.get("window");
const SHIMMER_STRIP_WIDTH = 80;

const ShimmerBox = ({ width: w, height, borderRadius = 6, style }) => {
  const shimmerX = useRef(new Animated.Value(-SHIMMER_STRIP_WIDTH)).current;

  useEffect(() => {
    shimmerX.setValue(-SHIMMER_STRIP_WIDTH);
    const run = () => {
      shimmerX.setValue(-SHIMMER_STRIP_WIDTH);
      Animated.timing(shimmerX, {
        toValue: w + SHIMMER_STRIP_WIDTH,
        duration: 1100,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) run();
      });
    };
    run();
    return () => shimmerX.stopAnimation();
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

const BuyPackageSkeleton = () => {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <ShimmerBox width={20} height={20} borderRadius={4} />
        <ShimmerBox width={140} height={18} borderRadius={6} />
      </View>

      <View style={styles.coinRow}>
        <ShimmerBox width={30} height={30} borderRadius={15} />
        <ShimmerBox width={80} height={18} borderRadius={6} />
      </View>

      <View style={styles.tabsRow}>
        {[1, 2, 3, 4].map((i) => (
          <ShimmerBox key={i} width={44} height={28} borderRadius={4} style={styles.tab} />
        ))}
      </View>

      <View style={styles.estRow}>
        <ShimmerBox width={60} height={12} borderRadius={4} />
        <ShimmerBox width={40} height={12} borderRadius={4} />
      </View>

      <ShimmerBox width={120} height={14} borderRadius={4} style={styles.label} />
      <ShimmerBox width={width - 40} height={48} borderRadius={8} style={styles.dropdown} />

      <ShimmerBox width={160} height={14} borderRadius={4} style={styles.label} />
      <View style={styles.inputRow}>
        <ShimmerBox width={width - 40 - 56} height={44} borderRadius={8} style={styles.input} />
        <ShimmerBox width={40} height={22} borderRadius={6} style={styles.maxInInput} />
      </View>

      <View style={styles.balanceRow}>
        <ShimmerBox width={100} height={12} borderRadius={4} />
        <ShimmerBox width={80} height={12} borderRadius={4} />
      </View>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.detailRow}>
          <ShimmerBox width={140} height={12} borderRadius={4} />
          <ShimmerBox width={80} height={12} borderRadius={4} />
        </View>
      ))}

      <ShimmerBox width={100} height={16} borderRadius={4} style={styles.sectionTitle} />
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.detailRow}>
          <ShimmerBox width={120} height={12} borderRadius={4} />
          <ShimmerBox width={90} height={12} borderRadius={4} />
        </View>
      ))}

      <ShimmerBox width={width - 40} height={48} borderRadius={10} style={styles.button} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
    width: "65%",
    justifyContent: "space-between",
  },
  coinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginVertical: 20,
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  tab: { marginRight: 4 },
  estRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginVertical: 5,
    paddingHorizontal: 10,
  },
  label: { marginBottom: 8, marginTop: 15 },
  dropdown: { marginTop: 5 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#23262F",
    borderRadius: 8,
    marginBottom: 20,
    paddingRight: 10,
    backgroundColor: colors.themeElevationColor,
  },
  input: { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
  maxInInput: { marginLeft: 8 },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 6,
  },
  sectionTitle: { marginVertical: 20 },
  button: { marginTop: 50 },
});

export default BuyPackageSkeleton;
