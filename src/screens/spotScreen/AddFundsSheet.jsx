import React from "react";
import { View, TouchableOpacity, ScrollView, Alert } from "react-native";
import FastImage from "react-native-fast-image";
import { AppText, SEMI_BOLD, MEDIUM } from "../../shared";
import { colors } from "../../theme/colors";
import NavigationService from "../../navigation/NavigationService";
import { MARGIN_TRANSFER_SCREEN, DEPOSIT_COIN_SCREEN } from "../../navigation/routes";
import Toast from "react-native-simple-toast";
import {
  convertIcon,
  onchain_ic,
  p2p_ic,
  right_ic,
} from "../../helper/ImageAssets";

const AddFundsSheet = ({
  coinBalance = {},
  currencyData = {},
  themeColors,
  isDark,
  marginMode = "Isolated",
  onClose,
}) => {
  const isCross = marginMode === "Cross";

  const items = [
    {
      id: "transfer",
      title: "Transfer",
      desc: "Transfer assets among different accounts",
      // meta: `Transferable: ${quoteAvailable} ${quoteSymbol}`,
      icon: convertIcon,
      onPress: () => {
        Toast.showWithGravity("Coming soon", Toast.SHORT, Toast.BOTTOM);
      },
    },
    {
      id: "onchain",
      title: "Onchain Deposit",
      desc: "Deposit crypto from other exchanges/wallets",
      icon: onchain_ic,
      onPress: () => {
        onClose?.();
        NavigationService.navigate(DEPOSIT_COIN_SCREEN);
      },
    },
    {
      id: "p2p",
      title: "P2P Trading",
      desc: "Zero fees, 400+ payment methods, and seamless trading",
      icon: p2p_ic,
      onPress: () => {
        Toast.showWithGravity("Coming soon", Toast.SHORT, Toast.BOTTOM);
      },
    },
    // {
    //   id: "buyusd",
    //   title: "Buy with USD",
    //   desc: "Buy and sell crypto via cards, bank transfers, and more",
    //   icon: buyCrypto,
    //   onPress: () => {
    //     Alert.alert("Coming soon");
    //   },
    // },
    // {
    //   id: "redeem",
    //   title: "Redeem AGCE Code",
    //   desc: "For asset transfer among AGCE accounts only",
    //   icon: printIcon,
    //   onPress: () => {
    //     Alert.alert("Coming soon");
    //   },
    // },
  ];

  return (
    <View style={{ flex: 1, paddingHorizontal: 10 }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 4,
          paddingBottom: 16,
        }}
      >
        <AppText weight={SEMI_BOLD} style={{ fontSize: 18, color: themeColors.text }}>
          Add Funds
        </AppText>
      </View>

      {/* List of items */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {items.map((it) => (
          <TouchableOpacity
            key={it.id}
            activeOpacity={0.8}
            onPress={it.onPress}
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 12,
              padding: 14,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: "rgba(0,0,0,0.03)",
            }}
          >
            {/* Icon Container */}
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <FastImage
                source={it.icon}
                resizeMode="contain"
                style={{ width: 24, height: 24 }}
                tintColor={themeColors.text}
              />
            </View>

            {/* Text Meta Column */}
            <View style={{ flex: 1 }}>
              <AppText weight={SEMI_BOLD} style={{ fontSize: 14, color: themeColors.text, marginBottom: 2 }}>
                {it.title}
              </AppText>
              <AppText style={{ fontSize: 11, color: themeColors.secondaryText, lineHeight: 14 }} numberOfLines={2}>
                {it.desc}
              </AppText>
              {it.meta ? (
                <AppText weight={MEDIUM} style={{ fontSize: 11, color: isDark ? colors.buttonDarkBg : "#F3BB2B", marginTop: 4 }}>
                  {it.meta}
                </AppText>
              ) : null}
            </View>

            {/* Chevron Right */}
            <FastImage
              source={right_ic}
              resizeMode="contain"
              style={{ width: 12, height: 12, marginLeft: 8 }}
              tintColor={themeColors.secondaryText}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default AddFundsSheet;
