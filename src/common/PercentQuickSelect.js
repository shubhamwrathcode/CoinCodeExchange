import React, { useState, useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { AppText, TEN } from "./AppText";
import { colors, lightTheme, darkTheme } from "../theme/colors";

const DEFAULT_OPTIONS = [0, 25, 50, 75, 100];
const TRACK_HEIGHT = 2;
const MARKER_SIZE = 9;
/** Top padding of the markers row — track Y is derived from this + marker height (must stay in sync). */
const MARKER_ROW_PADDING_TOP = 1;
// Inset so bar stays inside first/last rhombus (rotated square extends past width/2)
const BAR_INSET = Math.ceil(MARKER_SIZE / 2 + (MARKER_SIZE - 1) / Math.sqrt(2));
/** Vertical center of the diamond row = paddingTop + half marker outer height */
const TRACK_TOP = MARKER_ROW_PADDING_TOP + MARKER_SIZE / 2 - TRACK_HEIGHT / 2;
/** Space for diamond + label under the track line */
const TRACK_WRAPPER_HEIGHT = Math.ceil(
  MARKER_ROW_PADDING_TOP + MARKER_SIZE + 2 + 12 + 2
);

/**
 * Percentage quick-select: thin bar + rhombus markers + labels.
 * Colors follow app light/dark theme; filled range uses spot accent (spotTradeBuy).
 */
const PercentQuickSelect = ({
  options = DEFAULT_OPTIONS,
  activeValue,
  onSelect,
  theme = "Dark",
  color = "#00C853",
}) => {
  const [trackWidth, setTrackWidth] = useState(0);

  const effectiveActive =
    activeValue !== undefined && activeValue !== null && activeValue !== ""
      ? Number(activeValue)
      : 0;

  const handleTrackLayout = (e) => {
    const { width } = e.nativeEvent.layout;
    setTrackWidth(width);
  };

  const activeColor = color || "#00C853";
  const inactiveColor = "#8E8E93";
  const trackBg = "#2C2C2E";

  const fillPercentage = Math.max(0, Math.min(100, effectiveActive));

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.trackWrapper} onLayout={handleTrackLayout}>
        <View style={[styles.track, { backgroundColor: trackBg }]}>
          <View
            style={[
              styles.fill,
              {
                backgroundColor: activeColor,
                width: `${fillPercentage}%`,
              },
            ]}
          />
        </View>
        <View style={styles.dots}>
          {options.map((p) => (
            <TouchableOpacity
              key={p}
              activeOpacity={0.8}
              style={[
                styles.dot,
                { backgroundColor: p <= effectiveActive ? activeColor : inactiveColor },
              ]}
              onPress={() => onSelect && onSelect(p)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            />
          ))}
        </View>
        <View style={styles.labels}>
          {options.map((p) => (
            <AppText
              key={p}
              style={{
                fontSize: 10,
                color: p <= effectiveActive ? activeColor : inactiveColor,
                fontWeight: p === effectiveActive ? "600" : "400",
              }}
            >
              {p}%
            </AppText>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sliderContainer: {
    width: "100%",
    marginVertical: 4,
  },
  trackWrapper: {
    width: "100%",
    position: "relative",
  },
  track: {
    height: 2,
    width: "100%",
    position: "absolute",
    top: 3,
    borderRadius: 1,
  },
  fill: {
    height: "100%",
    borderRadius: 1,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
});

export default PercentQuickSelect;
