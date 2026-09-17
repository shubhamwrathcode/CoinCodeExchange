import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Circle } from "react-native-svg";
import { AppText, TWELVE, MEDIUM, SEMI_BOLD } from "..";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

const STEPS = ["Sign up", "Identification", "Deposit"];

export const AccountSetupProgress = () => {
  const { colors: themeColors, isDark } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.dotsRow}>
        <View
          style={[
            styles.trackBackground,
            { backgroundColor: isDark ? "#2A2B2F" : "#E5E7EB" },
          ]}
        />
        <View
          style={[
            styles.trackFill,
            { backgroundColor: colors.cyan, width: "40%" },
          ]}
        />
        {STEPS.map((step, index) => {
          const isActive = index === 0;
          return (
            <View key={step} style={styles.dotContainer}>
              {isActive && (
                <View style={styles.glowContainer}>
                  <Svg height="40" width="40" viewBox="0 0 40 40">
                    <Defs>
                      <RadialGradient
                        id={`glow-${index}`}
                        cx="50%"
                        cy="50%"
                        rx="50%"
                        ry="50%"
                      >
                        <Stop
                          offset="0%"
                          stopColor={colors.cyan}
                          stopOpacity="0.6"
                        />
                        <Stop
                          offset="40%"
                          stopColor={colors.cyan}
                          stopOpacity="0.2"
                        />
                        <Stop
                          offset="100%"
                          stopColor={colors.cyan}
                          stopOpacity="0"
                        />
                      </RadialGradient>
                    </Defs>
                    <Circle
                      cx="20"
                      cy="20"
                      r="20"
                      fill={`url(#glow-${index})`}
                    />
                  </Svg>
                </View>
              )}
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isActive
                      ? colors.cyan
                      : isDark
                      ? "#2A2B2F"
                      : "#E5E7EB",
                  },
                ]}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.textsRow}>
        {STEPS.map((step, index) => {
          const isActive = index === 0;
          let alignStyle = styles.textCenter;
          if (index === 0) alignStyle = styles.textLeft;
          if (index === STEPS.length - 1) alignStyle = styles.textRight;

          return (
            <View key={step} style={alignStyle}>
              <AppText
                type={TWELVE}
                weight={isActive ? SEMI_BOLD : MEDIUM}
                style={{
                  color: isActive
                    ? isDark
                      ? colors.white
                      : themeColors.text
                    : colors.darkShadeColorText || "#6A7282",
                  fontFamily: isActive ? fonts.semiBold : fonts.medium,
                }}
              >
                {step}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default AccountSetupProgress;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 8,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
    zIndex: 2,
  },
  trackBackground: {
    position: "absolute",
    top: "50%",
    marginTop: -1.5,
    left: 5,
    right: 5,
    height: 3,
    backgroundColor: "#2A2B2F",
  },
  trackFill: {
    position: "absolute",
    top: "50%",
    marginTop: -1.5,
    left: 5,
    height: 3,
    zIndex: 1,
  },
  dotContainer: {
    width: 10,
    height: 10,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    zIndex: 2,
  },
  glowContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
    top: -15,
    left: -15,
    width: 40,
    height: 40,
  },
  textsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  textLeft: {
    flex: 1,
    alignItems: "flex-start",
  },
  textCenter: {
    flex: 1,
    alignItems: "center",
  },
  textRight: {
    flex: 1,
    alignItems: "flex-end",
  },
});
