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
}) => {
  const [trackWidth, setTrackWidth] = useState(0);

  const palette = useMemo(
    () => (theme === "Light" ? lightTheme : darkTheme),
    [theme]
  );

  const handleTrackLayout = (e) => {
    const { width } = e.nativeEvent.layout;
    setTrackWidth(width);
  };

  const trackBg = palette.themeElevationColor;
  const trackBorder = palette.themeBorderColor;
  const activeFill = colors.spotTradeBuy;
  const markerEmptyFill = palette.input;
  const markerEmptyBorder = palette.themeBorderColor;
  const markerFilledFill = colors.spotTradeBuy;
  const markerFilledBorder = colors.spotTradeBuy;
  const labelDefault = palette.secondaryText;
  const labelActive = palette.text;

  const effectiveActive =
    activeValue !== undefined && activeValue !== null && activeValue !== ""
      ? Number(activeValue)
      : 0;

  const barLength = Math.max(0, (trackWidth || 0) - 2 * BAR_INSET);
  const fillWidth =
    trackWidth &&
      !Number.isNaN(effectiveActive) &&
      effectiveActive >= 0 &&
      effectiveActive <= 100
      ? (effectiveActive / 100) * barLength
      : 0;

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.trackWrapper} onLayout={handleTrackLayout}>
        <View
          style={[
            styles.track,
            {
              top: TRACK_TOP,
              left: BAR_INSET,
              right: BAR_INSET,
              backgroundColor: trackBg,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: trackBorder,
            },
          ]}
        />
        <View
          style={[
            styles.activeTrack,
            {
              top: TRACK_TOP,
              left: BAR_INSET,
              width: Math.max(fillWidth, 0),
              backgroundColor: activeFill,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: activeFill,
            },
          ]}
        />
        <View style={styles.markersAndLabelsRow}>
          {options.map((value) => {
            const isSelected = effectiveActive === value;
            const isInFilledRange = effectiveActive >= value;
            const size = MARKER_SIZE;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => onSelect(value)}
                activeOpacity={0.8}
                style={styles.column}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <View
                  style={[
                    styles.rhombusOuter,
                    { width: size, height: size },
                  ]}
                >
                  <View
                    style={[
                      styles.rhombus,
                      {
                        width: size - 1,
                        height: size - 1,
                        backgroundColor: isInFilledRange
                          ? markerFilledFill
                          : markerEmptyFill,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: isInFilledRange
                          ? markerFilledBorder
                          : markerEmptyBorder,
                      },
                    ]}
                  />
                </View>
                <AppText
                  type={TEN}
                  style={[
                    styles.labelText,
                    { color: isSelected ? labelActive : labelDefault },
                    isSelected && styles.labelTextActive,
                  ]}
                >
                  {value}%
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sliderContainer: {
    width: "100%",
    marginTop: 0,
    marginBottom: 0,
  },
  trackWrapper: {
    minHeight: TRACK_WRAPPER_HEIGHT,
    paddingHorizontal: Math.max(4, Math.ceil(MARKER_SIZE / 2)),
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    position: "absolute",
  },
  activeTrack: {
    position: "absolute",
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  markersAndLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: MARKER_ROW_PADDING_TOP,
  },
  column: {
    alignItems: "center",
    justifyContent: "flex-start",
  },
  rhombusOuter: {
    alignItems: "center",
    justifyContent: "center",
  },
  rhombus: {
    transform: [{ rotate: "45deg" }],
  },
  labelText: {
    marginTop: 2,
    fontSize: 9,
  },
  labelTextActive: {
    fontWeight: "600",
  },
});

export default PercentQuickSelect;
