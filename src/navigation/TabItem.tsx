import React from "react";
import { StyleSheet, TouchableOpacity, Platform, View } from "react-native";
import FastImage from "react-native-fast-image";
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing as REasing,
  interpolateColor,
  interpolate,
} from "react-native-reanimated";
import { AppText, BOLD, TWELVE } from "../shared";
import { colors } from "../theme/colors";

export const customTabBarStyles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 78 : 66,
    backgroundColor: colors.lightBlackLatest,
    overflow: "hidden",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    paddingBottom: Platform.OS === "ios" ? 12 : 5,
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    minWidth: "100%",
    paddingHorizontal: 8,
    height: "100%",
  },
  touchable: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    paddingHorizontal: 4,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: 22,
  },
});

export const TabItem = ({
  isFocused,
  routeName,
  onPress,
  onLongPress,
  icon,
  label,
  themeColors,
  isDark,
}: any) => {
  const progress = useSharedValue(isFocused ? 1 : 0);

  React.useEffect(() => {
    progress.value = withTiming(isFocused ? 1 : 0, {
      duration: 300,
      easing: REasing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: interpolate(progress.value, [0, 1], [45, 105]),
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        ["rgba(0,0,0,0)", colors.cyan]
      ),
    };
  });

  const textStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      width: interpolate(progress.value, [0, 1], [0, 50]),
      marginLeft: interpolate(progress.value, [0, 1], [0, 8]),
    };
  });

  const tint = isFocused ? colors.white : (themeColors?.inactiveTab || "#6A7282");

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      style={customTabBarStyles.touchable}
      activeOpacity={0.8}
    >
      <Animated.View style={[customTabBarStyles.pill, animatedStyle]}>
        <FastImage
          source={icon}
          style={{ width: 22, height: 22 }}
          tintColor={tint}
          resizeMode="contain"
        />
        <Animated.View
          style={[
            { overflow: "hidden", flexDirection: "row", alignItems: "center" },
            textStyle,
          ]}
        >
          <AppText
            weight={BOLD}
            type={TWELVE}
            style={{ color: colors.white }}
            numberOfLines={1}
          >
            {label}
          </AppText>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};
