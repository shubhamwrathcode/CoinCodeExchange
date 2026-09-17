import React, { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, TouchableOpacity, View } from "react-native";
import {
  AppText,
  BOLD,
  Button,
  EIGHT,
  EIGHTEEN,
  FIFTEEN,
  FOURTEEN,
  SEMI_BOLD,
  TEN,
  TWELVE,
} from "../../shared";
import { closeIcon } from "../../helper/ImageAssets";
import FastImage from "react-native-fast-image";
import { colors } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";

const MIN_LEVERAGE = 1;
const MAX_LEVERAGE = 100;
const STEP = 1;
const TRACK_HEIGHT = 4;
const KNOB_SIZE = 18;
const KNOB_TOUCH_SIZE = KNOB_SIZE + 16;
const TRACK_WRAPPER_HEIGHT = 36;
const LEVERAGE_MARKERS = [1, 20, 40, 60, 80, 100];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const sanitizeLeverage = (value, fallback = MIN_LEVERAGE) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return clamp(numeric, MIN_LEVERAGE, MAX_LEVERAGE);
};

const AdjustLeverage = ({ onSelectLeverage, leverage, onClose }) => {
  const { isDark, colors: themeColors } = useTheme();
  const [leverageState, setLeverageState] = useState(() =>
    sanitizeLeverage(leverage)
  );
  const [trackWidth, setTrackWidth] = useState(0);
  const [knobPosition, setKnobPosition] = useState(0);

  const knobPositionRef = useRef(0);
  const panStartX = useRef(0);

  const derivedPosition = useMemo(() => {
    if (!trackWidth) {
      return 0;
    }
    const ratio =
      (clamp(leverageState, MIN_LEVERAGE, MAX_LEVERAGE) - MIN_LEVERAGE) /
      (MAX_LEVERAGE - MIN_LEVERAGE);
    return ratio * trackWidth;
  }, [leverageState, trackWidth]);

  useEffect(() => {
    setLeverageState((prev) => sanitizeLeverage(leverage, prev));
  }, [leverage]);

  useEffect(() => {
    setKnobPosition(derivedPosition);
  }, [derivedPosition]);

  useEffect(() => {
    knobPositionRef.current = knobPosition;
  }, [knobPosition]);

  const updateLeverage = (nextValue) => {
    const normalized = sanitizeLeverage(
      Math.round(Number(nextValue) / STEP) * STEP,
      leverageState
    );
    setLeverageState(normalized);
    onSelectLeverage(normalized);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          panStartX.current = knobPositionRef.current;
        },
        onPanResponderMove: (_, gestureState) => {
          if (!trackWidth) {
            return;
          }
          const nextPos = clamp(
            panStartX.current + gestureState.dx,
            0,
            trackWidth
          );
          const rawValue =
            MIN_LEVERAGE +
            (nextPos / trackWidth) * (MAX_LEVERAGE - MIN_LEVERAGE);
          setKnobPosition(nextPos);
          updateLeverage(rawValue);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!trackWidth) {
            return;
          }
          const nextPos = clamp(
            panStartX.current + gestureState.dx,
            0,
            trackWidth
          );
          const rawValue =
            MIN_LEVERAGE +
            (nextPos / trackWidth) * (MAX_LEVERAGE - MIN_LEVERAGE);
          updateLeverage(rawValue);
        },
      }),
    [trackWidth]
  );

  const handleTrackLayout = (event) => {
    const { width } = event.nativeEvent.layout;
    setTrackWidth(width);
  };

  const handleDecrease = () => {
    updateLeverage(leverageState - STEP);
  };

  const handleIncrease = () => {
    updateLeverage(leverageState + STEP);
  };

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <AppText type={EIGHTEEN} weight={BOLD} style={{ color: themeColors.text }}>
            Adjust Leverage
          </AppText>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={{
            borderWidth: 1,
            borderColor: isDark ? "#FFFFFF30" : "#EEE",
            borderRadius: 15,
            padding: 5,
          }}
        >
          <FastImage
            source={closeIcon}
            style={{ width: 12, height: 12 }}
            tintColor={isDark ? "#FFFFFF80" : "#777"}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      <View style={[styles.stepContainer, { backgroundColor: isDark ? "#FFFFFF1A" : "#F8F8F8", borderColor: isDark ? "#3F3F3F" : "#EEE" }]}>
        <TouchableOpacity
          onPress={handleDecrease}
          style={[styles.stepButton, { backgroundColor: isDark ? "#FFFFFF12" : "#EEE" }]}
          activeOpacity={0.7}
        >
          <AppText style={[styles.stepButtonLabel, { color: isDark ? "#FFFFFF80" : "#555" }]}>-</AppText>
        </TouchableOpacity>
        <AppText style={{ color: themeColors.text }} type={FIFTEEN}>
          {`${leverageState}x`}
        </AppText>
        <TouchableOpacity
          onPress={handleIncrease}
          style={[styles.stepButton, { backgroundColor: isDark ? "#FFFFFF12" : "#EEE" }]}
          activeOpacity={0.7}
        >
          <AppText style={[styles.stepButtonLabel, { color: isDark ? "#FFFFFF80" : "#555" }]}>+</AppText>
        </TouchableOpacity>
      </View>

      <View style={styles.sliderContainer}>
        <View
          style={styles.trackWrapper}
          onLayout={handleTrackLayout}
        >
          <View style={[styles.track, { backgroundColor: isDark ? "#3F3F3F" : "#EEE" }]} />
          <View
            style={[
              styles.activeTrack,
              { width: Math.max(knobPosition, 0), backgroundColor: colors.buttonBg },
            ]}
          />
          <View style={styles.tickRow}>
            {LEVERAGE_MARKERS.map((marker) => {
              const isActive = leverageState >= marker;
              return (
                <View
                  key={marker}
                  style={[
                    styles.tick,
                    { backgroundColor: isDark ? "#3F3F3F" : "#BBB" },
                    isActive && styles.tickActive,
                  ]}
                />
              );
            })}
          </View>
          <View
            {...panResponder.panHandlers}
            style={[
              styles.knobTouchArea,
              {
                left: knobPosition,
                top: (TRACK_WRAPPER_HEIGHT - KNOB_TOUCH_SIZE) / 2,
              },
            ]}
          >
            <View style={[styles.knob, { borderColor: isDark ? "#1D1D1D" : "#FFF", backgroundColor: colors.buttonBg }]} />
          </View>
        </View>

        <View style={styles.labelRow}>
          {LEVERAGE_MARKERS.map((marker) => {
            const isActive = leverageState >= marker;
            return (
              <TouchableOpacity
                key={marker}
                onPress={() => updateLeverage(marker)}
                activeOpacity={0.7}
                style={styles.labelHitSlop}
              >
                <AppText
                  type={TEN}
                  style={[
                    styles.labelText,
                    { color: isDark ? "#FFFFFF66" : "#888" },
                    isActive && styles.labelTextActive,
                  ]}
                >
                  {`${marker}x`}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Button
        children="Confirm"
        containerStyle={{ marginHorizontal: 20, marginTop: 20 }}
        onPress={onClose}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  stepContainer: {
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 20,
    height: 40,
    marginVertical: 15,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "90%",
  },
  stepButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  stepButtonLabel: {
    fontSize: 16,
  },
  sliderContainer: {
    width: "90%",
    alignSelf: "center",
    marginTop: 10,
  },
  trackWrapper: {
    height: TRACK_WRAPPER_HEIGHT,
    justifyContent: "center",
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  activeTrack: {
    position: "absolute",
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    left: 0,
    top: (TRACK_WRAPPER_HEIGHT - TRACK_HEIGHT) / 2,
  },
  tickRow: {
    position: "absolute",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    left: 0,
    right: 0,
    paddingHorizontal: 1,
  },
  tick: {
    width: 10,
    height: 10,
    borderRadius: 5,
    transform: [{ rotate: "45deg" }],
  },
  tickActive: {
    backgroundColor: colors.buttonBg,
  },
  knobTouchArea: {
    position: "absolute",
    width: KNOB_TOUCH_SIZE,
    height: KNOB_TOUCH_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -KNOB_TOUCH_SIZE / 2,
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: 6,
    borderWidth: 2,
    transform: [{ rotate: "45deg" }],
  },
  labelRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  labelText: {
  },
  labelTextActive: {
    color: colors.buttonBg,
    fontWeight: "bold",
  },
  labelHitSlop: {
    paddingVertical: 4,
  },
});

export default AdjustLeverage;
