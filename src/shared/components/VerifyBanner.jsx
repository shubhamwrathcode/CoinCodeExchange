import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import FastImage from "react-native-fast-image";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { AppText } from "..";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { verifyIdentity } from "../../helper/ImageAssets";

export const VerifyBanner = ({ onVerifyPress }) => {
  const { colors: themeColors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.banner,
        {
          borderWidth: 1,
          borderColor: isDark
            ? "rgba(255, 255, 255, 0.1)"
            : "rgba(0, 0, 0, 0.08)",
          backgroundColor: isDark ? "#111214" : "#F9FAFB",
        },
      ]}
    >
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 180,
          height: 200,
          overflow: "hidden",
          borderTopLeftRadius: 20,
        }}
      >
        <Svg height="100%" width="100%">
          <Defs>
            <RadialGradient id="glow" cx="0%" cy="0%" rx="100%" ry="100%">
              <Stop
                offset="0%"
                stopColor={isDark ? "#ffffff" : "#000000"}
                stopOpacity="0.15"
              />
              <Stop
                offset="100%"
                stopColor={isDark ? "#ffffff" : "#000000"}
                stopOpacity="0"
              />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#glow)" />
        </Svg>
      </View>

      <View style={styles.bannerLeft}>
        <AppText
          style={{
            color: colors.cyan,
            fontSize: 11,
            fontFamily: fonts.medium,
            textShadowColor: colors.cyan,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 10,
          }}
        >
          Unlock Full Access
        </AppText>
        <AppText
          style={{
            color: isDark ? colors.white : themeColors.text,
            fontSize: 15,
            fontFamily: fonts.semiBold,
            marginTop: 5,
            lineHeight: 22,
          }}
        >
          Verify your identity{"\n"}to unlock full features
        </AppText>
        <AppText
          style={{
            color: colors.darkShadeColorText || "#9CA3AF",
            fontSize: 11,
            fontFamily: fonts.medium,
            marginTop: 5,
            lineHeight: 16,
          }}
        >
          Complete verification to enjoy{"\n"}all features and higher limits.
        </AppText>
        <TouchableOpacity
          onPress={onVerifyPress || (() => { })}
          activeOpacity={0.8}
          style={styles.verifyBtn}
        >
          <AppText style={styles.verifyBtnText}>Verify Now →</AppText>
        </TouchableOpacity>
      </View>

      <FastImage
        source={verifyIdentity}
        style={styles.heroImage}
        resizeMode={FastImage.resizeMode.contain}
      />
    </View>
  );
};

export default VerifyBanner;

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    overflow: "hidden",
    position: "relative",
    marginVertical: 10,
  },
  bannerLeft: {
    flex: 1,
    zIndex: 2,
  },
  heroImage: {
    width: 185,
    height: 200,
    position: "absolute",
    right: 0,
    top: -30,
  },
  verifyBtn: {
    backgroundColor: colors.cyan,
    width: 130,
    height: 34,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  verifyBtnText: {
    color: colors.white,
    fontSize: 13,
    fontFamily: fonts.medium,
  },
});
