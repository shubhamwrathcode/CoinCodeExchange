import React, { useEffect, useRef } from "react";
import { Animated, View, Dimensions } from "react-native";
import { useTheme } from "../../hooks/useTheme";

const SHIMMER_STRIP = 72;

/**
 * Animated placeholder bar (shimmer). `width` may be a number or a percentage string e.g. "70%".
 */
const ShimmerBone = ({ width, height, borderRadius = 6, style = {} }) => {
  const { colors: themeColors, isDark } = useTheme();
  const screenW = Dimensions.get("window").width;
  const wNum =
    typeof width === "number"
      ? width
      : screenW * (parseFloat(String(width), 10) / 100);
  const shimmerX = useRef(new Animated.Value(-SHIMMER_STRIP)).current;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const run = () => {
      if (!mounted.current) return;
      shimmerX.setValue(-SHIMMER_STRIP);
      Animated.timing(shimmerX, {
        toValue: Math.max(wNum, 1) + SHIMMER_STRIP,
        duration: 1200,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (mounted.current && finished) run();
      });
    };
    const t = setTimeout(run, 40);
    return () => {
      mounted.current = false;
      clearTimeout(t);
      shimmerX.stopAnimation();
    };
  }, [shimmerX, wNum]);

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          overflow: "hidden",
          backgroundColor: themeColors.themeElevationColor,
        },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: SHIMMER_STRIP,
          transform: [{ translateX: shimmerX }],
          backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
        }}
      />
    </View>
  );
};

export default ShimmerBone;
