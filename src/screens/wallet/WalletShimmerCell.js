import React, { useEffect, useRef } from "react";
import { View, Animated } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useTheme } from "../../hooks/useTheme";
import { darkTheme } from "../../theme/colors";

const SHIMMER_STRIP = 160;

/** Shared wallet shimmer bar — light/dark tuned for WalletNew tabs & skeletons. */
export function WalletShimmerCell({ width: w, height, borderRadius = 6, style }) {
  const { isDark } = useTheme();
  const shimmerX = useRef(new Animated.Value(-SHIMMER_STRIP)).current;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const run = () => {
      if (!mounted.current) return;
      shimmerX.setValue(-SHIMMER_STRIP);
      Animated.timing(shimmerX, {
        toValue: Math.max(w, 1) + SHIMMER_STRIP,
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

  const boneColor = isDark ? darkTheme.darkThemeInputColor : "#E1E9EE";
  const shimmerColors = isDark
    ? ["transparent", "rgba(255,255,255,0.16)", "transparent"]
    : ["transparent", "rgba(255,255,255,0.65)", "transparent"];

  return (
    <View
      style={[
        { width: w, height, borderRadius, overflow: "hidden", backgroundColor: boneColor },
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
        }}
      >
        <LinearGradient
          colors={shimmerColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, width: SHIMMER_STRIP }}
        />
      </Animated.View>
    </View>
  );
}

export default WalletShimmerCell;
