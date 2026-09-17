import React from "react";
import { StyleSheet, View } from "react-native";
import FastImage from "react-native-fast-image";
import TouchableOpacityView from "../../shared/components/TouchableOpacityView";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { AppText } from "../../shared";
import { useTheme } from "../../hooks/useTheme";
import {
  spotIcon,
  marginIcon,
  walletIcon,
  swapIcon,
  moreIcon,
} from "../../helper/ImageAssets";
import NavigationService from "../../navigation/NavigationService";
import {
  ACCOUNT_SCREEN,
  TRADE_SCREEN,
  WALLET_SCREEN,
} from "../../navigation/routes";
import { useAppSelector } from "../../store/hooks";
import { checkValue } from "../../helper/utility";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

const MenuItem = React.memo(({ item }: { item: any }) => {
  const { colors: themeColors, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacityView
        onPress={item?.onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.quickLinkItem}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.quickLinkIconCircle,
            {
              backgroundColor: isDark ? "#0F1012" : "#F3F4F6",
              borderColor: isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.06)",
            },
          ]}
        >
          <FastImage
            source={item.icon}
            style={styles.icon}
            resizeMode={FastImage.resizeMode.contain}
          />
        </View>
        <AppText
          style={[
            styles.linkTitle,
            {
              color: isDark ? colors.white : themeColors.text,
            },
          ]}
        >
          {item?.title}
        </AppText>
      </TouchableOpacityView>
    </Animated.View>
  );
});

const HomeMenuBar = () => {
  const languages = useAppSelector((state) => state.account.languages);

  const data = [
    {
      id: "1",
      title: checkValue(languages?.spot) || "Spot",
      icon: spotIcon,
      onPress: () =>
        NavigationService.navigate(TRADE_SCREEN, { activeTab: "Spot" }),
    },
    {
      id: "2",
      title: "Margin",
      icon: marginIcon,
      onPress: () =>
        NavigationService.navigate(TRADE_SCREEN, { activeTab: "Margin" }),
    },
    {
      id: "3",
      title: "Wallet",
      icon: walletIcon,
      onPress: () => NavigationService.navigate(WALLET_SCREEN),
    },
    {
      id: "4",
      title: "Swap",
      icon: swapIcon,
      onPress: () =>
        NavigationService.navigate(TRADE_SCREEN, { activeTab: "Buy Crypto" }),
    },
    {
      id: "5",
      title: "More",
      icon: moreIcon,
      onPress: () => NavigationService.navigate(ACCOUNT_SCREEN),
    },
  ];

  return (
    <View style={styles.quickLinksContainer}>
      {data.map((item) => (
        <MenuItem key={item.id} item={item} />
      ))}
    </View>
  );
};

export default HomeMenuBar;

const styles = StyleSheet.create({
  quickLinksContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 6,
  },
  quickLinkItem: {
    alignItems: "center",
  },
  quickLinkIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  icon: {
    width: 24,
    height: 24,
  },
  linkTitle: {
    fontSize: 14,
    fontFamily: fonts.medium,
    marginTop: 8,
  },
});
