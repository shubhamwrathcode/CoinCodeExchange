import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import FastImage from "react-native-fast-image";
import { AppText } from "..";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { stakingHomeIcon } from "../../helper/ImageAssets";
import NavigationService from "../../navigation/NavigationService";
import { EARNING_SCREEN } from "../../navigation/routes";

const MINI_CARDS = [
  {
    id: "1",
    symbol: "BYUSDT",
    label: "Easy Earn",
    apy: "1.69%",
    color: "#00C076",
    initial: "T",
  },
  {
    id: "2",
    symbol: "OPG",
    label: "Easy Earn",
    apy: "1.69%",
    color: "#FF4B4B",
    initial: "M",
  },
  {
    id: "3",
    symbol: "XAUT",
    label: "Easy Earn",
    apy: "1.69%",
    color: "#F4B731",
    initial: "Z",
  },
];

export const EarnSection = () => {
  const { colors: themeColors, isDark } = useTheme();

  const handleEarnPress = () => {
    NavigationService.navigate(EARNING_SCREEN);
  };

  return (
    <View style={styles.container}>
      {/* Left Main Card */}
      <TouchableOpacity
        style={[
          styles.leftCard,
          {
            backgroundColor: isDark ? colors.lightBlackLatest : "#F9FAFB",
            borderColor: isDark
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.06)",
          },
        ]}
        activeOpacity={0.8}
        onPress={handleEarnPress}
      >
        <AppText
          style={{
            color: colors.darkShadeColorText || "#9CA3AF",
            fontSize: 12,
            fontFamily: fonts.medium,
          }}
        >
          Easy Earn
        </AppText>

        <View style={{ marginTop: 6 }}>
          <AppText
            style={{
              color: isDark ? colors.white : themeColors.text,
              fontSize: 10,
              fontFamily: fonts.semiBold,
              marginBottom: 2,
            }}
          >
            UP TO
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <AppText
              style={{
                color: colors.cyan,
                fontSize: 20,
                fontFamily: fonts.bold,
              }}
            >
              12.5%
            </AppText>
            <AppText
              style={{
                color: colors.cyan,
                fontSize: 12,
                fontFamily: fonts.semiBold,
                marginLeft: 4,
              }}
            >
              APY
            </AppText>
          </View>
        </View>

        <AppText
          style={{
            color: colors.darkShadeColorText || "#9CA3AF",
            fontSize: 10,
            fontFamily: fonts.regular,
            marginTop: 6,
            lineHeight: 14,
            width: "55%",
          }}
        >
          Stable Returns on Your Crypto
        </AppText>

        <FastImage
          source={stakingHomeIcon}
          style={styles.safeImage}
          resizeMode={FastImage.resizeMode.contain}
        />
      </TouchableOpacity>

      {/* Right Mini Cards Column */}
      <View style={styles.rightColumn}>
        {MINI_CARDS.map((card) => (
          <TouchableOpacity
            key={card.id}
            style={[
              styles.miniCard,
              {
                backgroundColor: isDark ? colors.lightBlackLatest : "#F9FAFB",
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.05)"
                  : "rgba(0, 0, 0, 0.06)",
              },
            ]}
            activeOpacity={0.8}
            onPress={handleEarnPress}
          >
            <View
              style={[
                styles.miniCardIcon,
                { backgroundColor: card.color },
              ]}
            >
              <AppText
                style={{
                  color: colors.white,
                  fontSize: 11,
                  fontFamily: fonts.bold,
                }}
              >
                {card.initial}
              </AppText>
            </View>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <AppText
                style={{
                  color: isDark ? colors.white : themeColors.text,
                  fontSize: 11,
                  fontFamily: fonts.bold,
                }}
                numberOfLines={1}
              >
                {card.symbol}
              </AppText>
              <AppText
                style={{
                  color: colors.darkShadeColorText || "#9CA3AF",
                  fontSize: 9,
                  fontFamily: fonts.regular,
                  marginTop: 1,
                }}
              >
                {card.label}
              </AppText>
            </View>
            <AppText
              style={{
                color: colors.green,
                fontSize: 10,
                fontFamily: fonts.semiBold,
                marginLeft: 2,
              }}
            >
              {card.apy} &gt;
            </AppText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default EarnSection;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  leftCard: {
    flex: 1.05,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    minHeight: 135,
    overflow: "hidden",
  },
  safeImage: {
    position: "absolute",
    right: -2,
    top: 25,
    width: 90,
    height: 148,
    zIndex: 1,
  },
  rightColumn: {
    flex: 1,
    gap: 8,
    justifyContent: "space-between",
  },
  miniCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
  },
  miniCardIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
});
