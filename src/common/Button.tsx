import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleProp,
  StyleSheet,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewStyle,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { AppText, BOLD, SEMI_BOLD, SIXTEEN } from "./AppText";
import { colors } from "../theme/colors";
import { fontFamilySemiBold } from "../theme/typography";
import { useTheme } from "../hooks/useTheme";

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export interface ButtonProps extends Omit<TouchableOpacityProps, "onPress"> {
  title?: string;
  children?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  variant?: "primary" | "secondary" | "danger" | "success" | "outline";
  disabled?: boolean;
  isSecond?: boolean;
  loading?: boolean;
  shrinkOnLoad?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  gradientColors?: string[];
  onPress?: (event: any) => void | Promise<any>;
}

const Button: React.FC<ButtonProps> = ({
  title,
  children,
  containerStyle,
  titleStyle,
  variant = "primary",
  disabled = false,
  isSecond = false,
  loading: externalLoading = false,
  shrinkOnLoad = false,
  leftIcon,
  rightIcon,
  gradientColors,
  onPress,
  style,
  ...rest
}) => {
  const { colors: themeColors, isDark } = useTheme();
  const animationValue = useRef(new Animated.Value(0)).current;
  const [internalLoading, setInternalLoading] = useState(false);

  const isLoading = externalLoading || internalLoading;

  useEffect(() => {
    if (shrinkOnLoad) {
      Animated.timing(animationValue, {
        toValue: isLoading ? 1 : 0,
        duration: 500,
        easing: Easing.bezier(0.55, 0.1, 0.55, 1),
        useNativeDriver: false,
      }).start();
    }
  }, [isLoading, shrinkOnLoad]);

  const handlePress = async (e: any) => {
    if (!onPress) return;
    const result = onPress(e);
    if (result instanceof Promise) {
      try {
        setInternalLoading(true);
        await result;
      } finally {
        setInternalLoading(false);
      }
    }
  };

  const getBackgroundColor = () => {
    if (disabled) return "#6A728240";
    if (isSecond) return colors.buttonBg;
    switch (variant) {
      case "primary":
        return colors.cyan;
      case "secondary":
        return colors.buttonBg;
      case "outline":
        return "transparent";
      case "danger":
        return colors.red;
      case "success":
        return colors.green;
      default:
        return colors.cyan;
    }
  };

  const getTextColor = () => {
    if (disabled) return "#FFFFFF80";
    return colors.white;
  };

  const animatedWidth = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["100%", "18%"],
  });

  const animatedPadding = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const displayTitle = title || (typeof children === "string" ? children : "");

  return (
    <AnimatedTouchableOpacity
      disabled={disabled || isLoading}
      onPress={handlePress}
      activeOpacity={0.8}
      style={[
        styles.button,
        !gradientColors && { backgroundColor: getBackgroundColor() },
        (variant === "secondary" || variant === "outline") && {
          borderWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.15)" : "#E5E7EB",
        },
        shrinkOnLoad && { width: animatedWidth, paddingHorizontal: animatedPadding },
        disabled || isLoading ? { opacity: 0.6 } : {},
        containerStyle,
        style,
      ]}
      {...rest}
    >
      {gradientColors && gradientColors.length > 0 && (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      {isLoading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <View style={styles.contentRow}>
          {leftIcon && <View style={styles.leftIconWrapper}>{leftIcon}</View>}
          {displayTitle ? (
            <AppText
              type={SIXTEEN}
              weight={SEMI_BOLD}
              style={StyleSheet.flatten([
                styles.title,
                { color: getTextColor() },
                titleStyle,
              ])}
            >
              {displayTitle}
            </AppText>
          ) : (
            children
          )}
          {rightIcon && <View style={styles.rightIconWrapper}>{rightIcon}</View>}
        </View>
      )}
    </AnimatedTouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontFamily: fontFamilySemiBold,
    textAlign: "center",
  },
  leftIconWrapper: {
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rightIconWrapper: {
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});

export { Button };
