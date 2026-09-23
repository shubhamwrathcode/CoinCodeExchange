import React from "react";
import { TouchableOpacity, View } from "react-native";
import FastImage from "react-native-fast-image";
import { AppText, MEDIUM, TWELVE } from "../../shared";
import { colors } from "../../theme/colors";
import {
  buyCrypto,
  depositWallet,
  earnWallet,
  futuresActiveIcon,
  historyIcon,
  p2pIcon,
  swap_line,
  transferWallet,
  withdrawWallet,
} from "../../helper/ImageAssets";

/**
 * CoinCode-style wallet action icons (deposit/withdraw/transfer/earn already include
 * the dark rounded container in the PNG). History is a line icon + matching box.
 */
function iconSourceForVariant(variant) {
  switch (variant) {
    case "deposit":
      return depositWallet;
    case "withdraw":
      return withdrawWallet;
    case "transfer":
      return transferWallet;
    case "history":
      return historyIcon;
    case "buyCrypto":
      return buyCrypto;
    case "p2p":
      return p2pIcon;
    case "swap":
      return swap_line;
    case "earning":
      return earnWallet;
    case "futures":
      return futuresActiveIcon;
    default:
      return null;
  }
}

const COINCODE_WALLET_ICONS = new Set(["deposit", "withdraw", "transfer", "earning"]);

const WalletTabQuickActions = ({ theme, themeColors, items }) => {
  if (!Array.isArray(items) || items.length === 0) return null;
  const isDark = theme === "Dark";

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
        const src = iconSourceForVariant(variant);
        if (!src) return null;

        const isCoinCodeWalletIcon = COINCODE_WALLET_ICONS.has(variant);
        const isHistory = variant === "history";

        return (
          <TouchableOpacity
            key={item.key}
            onPress={item.onPress}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            style={{ alignItems: "center", width: 64, paddingHorizontal: 2 }}
          >
            {isCoinCodeWalletIcon ? (
              <FastImage source={src} style={{ width: 48, height: 48 }} resizeMode="contain" />
            ) : isHistory ? (
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: "#0A0A0A",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FastImage
                  source={src}
                  style={{ width: 24, height: 24 }}
                  resizeMode="contain"
                  tintColor={colors.white}
                />
              </View>
            ) : (
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
            )}
            <AppText
              type={TWELVE}
              weight={MEDIUM}
              numberOfLines={2}
              style={{
                marginTop: 8,
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
