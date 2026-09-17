/**
 * Skeleton for HomeSlider. Shown while slider is loading.
 */
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { colors } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";

const { width } = Dimensions.get("window");
const SLIDER_HEIGHT = 110;
const MARGIN_H = 20;
const SHIMMER_STRIP_WIDTH = 80;

const ShimmerBox = ({ width: w, height, borderRadius = 6, style }) => {
  const { colors: themeColors, isDark } = useTheme();
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

  const boneColor = themeColors.themeElevationColor;
  const shimmerColors = isDark 
    ? ["transparent", "rgba(255,255,255,0.16)", "transparent"]
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

const HomeSliderSkeleton = () => {
  const { colors: themeColors } = useTheme();
  const contentWidth = width - MARGIN_H * 2;
  return (
    <>
      <View style={[styles.sliderWrap, { borderTopColor: themeColors.border, borderBottomColor: themeColors.border }]}>
        <View style={styles.sliderInner}>
          <View style={styles.bannerRow}>
            <ShimmerBox width={70} height={70} borderRadius={12} />
            <ShimmerBox width={contentWidth * 0.5} height={14} borderRadius={6} style={styles.textLine} />
            <ShimmerBox width={16} height={16} borderRadius={4} />
          </View>
        </View>
      </View>
      <View style={styles.dotContainer}>
        {[0, 1, 2, 3].map((i) => (
          <ShimmerBox key={i} width={8} height={8} borderRadius={4} style={styles.dot} />
        ))}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  sliderWrap: {
    flex: 1,
    borderTopWidth: 0.5,
    borderTopColor: "#302F2F",
    borderBottomWidth: 1,
    borderBottomColor: "#302F2F",
    marginBottom: 5,
    height: SLIDER_HEIGHT,
  },
  sliderInner: {
    width: "100%",
    alignSelf: "center",
    justifyContent: "center",
    marginHorizontal: MARGIN_H,
    flex: 1,
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  textLine: {
    marginHorizontal: 12,
  },
  dotContainer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
  },
  dot: {
    marginHorizontal: 3,
  },
});

export default HomeSliderSkeleton;
