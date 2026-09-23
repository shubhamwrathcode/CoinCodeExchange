import React from "react";
import { StyleSheet, View } from "react-native";
import { BlurView } from "@react-native-community/blur";
import LinearGradient from "react-native-linear-gradient";

/**
 * Shared blur chrome matching TradingDataModal / AnimatedBottomSheet.
 */
export function blurSheetTheme(isDark) {
  return {
    textColor: isDark ? "#FFFFFF" : "#000000",
    subTextColor: isDark ? "rgba(255,255,255,0.55)" : "#9D9D9D",
    borderColor: isDark ? "rgba(255,255,255,0.12)" : "#E8E8E8",
    rowBorderColor: isDark ? "rgba(255,255,255,0.08)" : "#EEEEEE",
    cardBg: isDark ? "rgba(255,255,255,0.06)" : "#F5F5F5",
    buttonBg: isDark ? "rgba(255,255,255,0.10)" : "#E8E8E8",
    closeCircleBg: isDark ? "rgba(255,255,255,0.12)" : "#E8E8E8",
    dragHandleColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
    iconTint: isDark ? "#FFFFFF" : "#000000",
  };
}

export function blurSheetRbCustomStyles({
  isDark,
  height,
  borderRadius = 24,
  paddingHorizontal = 0,
  paddingTop = 0,
} = {}) {
  return {
    container: {
      backgroundColor: "transparent",
      ...(height != null ? { height } : null),
      borderTopLeftRadius: borderRadius,
      borderTopRightRadius: borderRadius,
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
      overflow: "hidden",
      paddingHorizontal,
      paddingTop,
    },
    wrapper: {
      backgroundColor: isDark ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.35)",
    },
    draggableIcon: {
      backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
      width: 40,
    },
  };
}

/**
 * Must be wrapped in an absoluteFill View (not a Fragment) so BlurView +
 * overlays fill the RBSheet — Fragments can collapse to 0 height.
 * Gradient alphas match TradingDataModal (subtle, not muddy green).
 */
export function BlurSheetBackground({ isDark }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" collapsable={false}>
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType="light"
        blurAmount={20}
        reducedTransparencyFallbackColor="#111214"
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark
              ? "rgba(10, 12, 16, 0.68)"
              : "rgba(255, 255, 255, 0.85)",
          },
        ]}
      />
      {isDark ? (
        <>
          <LinearGradient
            colors={[
              "rgba(16, 185, 129, 0.10)",
              "rgba(6, 182, 212, 0.04)",
              "rgba(16, 185, 129, 0.02)",
              "rgba(16, 185, 129, 0.07)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={["transparent", "rgba(16, 185, 129, 0.04)", "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : null}
    </View>
  );
}

export default BlurSheetBackground;
