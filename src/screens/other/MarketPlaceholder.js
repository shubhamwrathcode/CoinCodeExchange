import React from "react";
import { StyleSheet, View } from "react-native";
import FastImage from "react-native-fast-image";
import { AppText, TWELVE } from "../../shared";
import { NO_NOTIFICATION_ICON, NO_NOTIFICATION_ICON_LIGHT } from "../../helper/ImageAssets";
import { useTheme } from "../../hooks/useTheme";

const MarketPlaceholder = ({ message }) => {
  const { colors: themeColors, isDark } = useTheme();

  return (
    <View style={styles.wrap}>
      <FastImage
        source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT}
        resizeMode="contain"
        style={styles.icon}
      />
      <AppText type={TWELVE} style={{ color: themeColors.secondaryText, textAlign: "center" }}>
        {message}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  icon: {
    width: 100,
    height: 100,
    marginBottom: 12,
    opacity: 0.8,
  },
});

export default MarketPlaceholder;

