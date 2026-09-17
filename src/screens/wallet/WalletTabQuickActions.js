import React from "react";
import { Platform, TouchableOpacity, View } from "react-native";
import FastImage from "react-native-fast-image";
import { AppText, MEDIUM, SEMI_BOLD, TWELVE } from "../../shared";
import { colors, darkTheme } from "../../theme/colors";
import {
  buyCrypto,
  earningAsset1,
  earningMenuDarkIcon,
  earningMenuIcon,
  futuresActiveIcon,
  futuresIcon,
  history,
  historyIcon,
  newDepositDarkIcon,
  newDepositIcon,
  newReferalIcon,
  newReferImage,
  newWidthrawDarkIcon,
  newWidthrawIcon,
  p2pIcon,
  referWallet,
  swap_line,
  swapHistory,
  swap as swapIconDark,
  swapLight as swapIconLight,
} from "../../helper/ImageAssets";

/**
 * Resolve icon for wallet tab quick actions (ProfileDrawer-style assets).
 * `variant` can be explicit or falls back to `key` when it matches a known name.
 */
function iconSourceForVariant(variant, theme) {
  const isDark = theme === "Dark";
  switch (variant) {
    case "deposit":
      return isDark ? newDepositDarkIcon : newDepositIcon;
    case "withdraw":
      return isDark ? newWidthrawDarkIcon : newWidthrawIcon;
    case "transfer":
      return theme !== "Dark" ? swapIconLight : swapIconLight;
    case "history":
      return history;
    case "buyCrypto":
      return buyCrypto;
    case "p2p":
      return p2pIcon;
    case "swap":
      return swap_line;
    case "earning":
      return referWallet;
    case "futures":
      return futuresActiveIcon;
    default:
      return null;
  }
}

/**
 * Icon + label row (left-aligned), same layout as Wallet Overview quick actions.
 * @param {{ theme: string, themeColors: object, items: Array<{ key: string, label: string, onPress: () => void, variant?: string }> }} props
 */
const WalletTabQuickActions = ({ theme, themeColors, items }) => {
  if (!Array.isArray(items) || items.length === 0) return null;
  const isDark = theme === "Dark";
  // console.log(items,'==items');



  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: items.length === 4 ? "space-between" : "flex-start",
        alignItems: "flex-start",
        flexWrap: "wrap",
        marginTop: 12,
        gap: items.length === 4 ? 0 : 20,
      }}
    >
      {items.map((item) => {
        const variant = item.variant || item.key;
        const src = iconSourceForVariant(variant, theme);
        if (!src) return null;
        return (
          <TouchableOpacity
            key={item.key}
            onPress={item.onPress}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            style={{ alignItems: "center", width: 64, paddingHorizontal: 2, }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: isDark ? colors.themeElevationColor : colors.iconBgColor,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FastImage
                source={src}
                style={{ width: 26, height: 26 }}
                resizeMode="contain"
                tintColor={variant === "futures" ? "#787878" : isDark ? colors.white : colors.black}
              />
            </View>
            <AppText
              type={TWELVE}
              weight={MEDIUM}
              numberOfLines={2}
              style={{
                marginTop: 6,
                textAlign: "center",
                color: themeColors.text,
                width: "100%",
              }}
            >
              {item.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default WalletTabQuickActions;
