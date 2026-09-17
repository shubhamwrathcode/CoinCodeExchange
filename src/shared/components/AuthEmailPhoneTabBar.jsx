import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  View,
} from "react-native";
import { AppText, FIFTEEN, FOURTEEN, MEDIUM } from "..";
import TouchableOpacityView from "./TouchableOpacityView";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

const AuthEmailPhoneTabBar = ({ tabs, index, onChange, containerStyle }) => {
  const { colors: themeColors, isDark } = useTheme();
  const [layouts, setLayouts] = useState({});
  const indicatorPosition = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;
  const hasAnimatedOnce = useRef(false);

  const handleTabLayout = (i) => (e) => {
    const { x, width } = e.nativeEvent.layout;
    setLayouts((prev) => ({
      ...prev,
      [i]: { x, width },
    }));
  };

  useEffect(() => {
    const activeMeasurement = layouts[index];
    if (activeMeasurement) {
      if (!hasAnimatedOnce.current) {
        indicatorPosition.setValue(activeMeasurement.x);
        indicatorWidth.setValue(activeMeasurement.width);
        hasAnimatedOnce.current = true;
        return;
      }

      Animated.parallel([
        Animated.spring(indicatorPosition, {
          toValue: activeMeasurement.x,
          useNativeDriver: false,
          friction: 8,
          tension: 50,
        }),
        Animated.spring(indicatorWidth, {
          toValue: activeMeasurement.width,
          useNativeDriver: false,
          friction: 8,
          tension: 50,
        }),
      ]).start();
    }
  }, [index, layouts, indicatorPosition, indicatorWidth]);

  return (
    <View
      style={[
        styles.tabsContainer,
        {
          borderBottomColor: isDark ? "#151619" : "#E5E7EB",
        },
        containerStyle,
      ]}
    >
      {tabs.map((tab, i) => {
        const isActive = index === i;
        return (
          <TouchableOpacityView
            key={`${tab}-${i}`}
            onLayout={handleTabLayout(i)}
            onPress={() => onChange(i)}
            style={[
              styles.tabButton,
              i < tabs.length - 1 ? styles.tabButtonMargin : null,
            ]}
            activeOpacity={0.7}
          >
            <AppText
              type={FIFTEEN}
              weight={MEDIUM}
              style={[
                styles.tabText,
                {
                  color: isActive
                    ? isDark
                      ? colors.white
                      : themeColors.text
                    : colors.darkShadeColorText || "#6A7282",
                },
              ]}
            >
              {tab}
            </AppText>
          </TouchableOpacityView>
        );
      })}

      {/* Animated Sliding Cyan Indicator on Top of Border */}
      {layouts[index]?.width != null && (
        <Animated.View
          style={[
            styles.indicator,
            {
              backgroundColor: colors.cyan,
              width: indicatorWidth,
              transform: [{ translateX: indicatorPosition }],
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    marginBottom: 20,
    position: "relative",
    width: "100%",
  },
  tabButton: {
    paddingBottom: 12,
  },
  tabButtonMargin: {
    marginRight: 32,
  },
  tabText: {
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  indicator: {
    position: "absolute",
    bottom: -1,
    height: 2,
    left: 0,
    borderRadius: 1,
  },
});

export default AuthEmailPhoneTabBar;
