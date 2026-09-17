import React from "react";
import { Dimensions, Image, ScrollView, StyleSheet, View } from "react-native";
import TouchableOpacityView from "../../shared/components/TouchableOpacityView";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { AppText, THIRTEEN, } from "../../shared";
import { useTheme } from "../../hooks/useTheme";
const Width = Dimensions.get("window").width;
import Toast from "react-native-simple-toast";
import {
  swap,
  margin,
  wallet_ic,
  spotIcon,
  earningAsset1,
  lockLight,
  spotIconDarkTheme,
} from "../../helper/ImageAssets";
import NavigationService from "../../navigation/NavigationService";
import { ACCOUNT_SCREEN, EARNING_SCREEN, TRADE_SCREEN, WALLET_SCREEN } from "../../navigation/routes";
import { useAppSelector } from "../../store/hooks";
import { checkValue } from "../../helper/utility";
import { colors, darkTheme } from "../../theme/colors";

const showComingSoonToast = () =>
  Toast.showWithGravity("Coming soon", Toast.SHORT, Toast.BOTTOM);

// ✅ Separate component for menu item to use hooks properly
const MenuItem = React.memo(({ item, index }: any) => {
  const { colors: themeColors, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <Animated.View
      style={animatedStyle}
    >
      <TouchableOpacityView
        onPress={item?.onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.singleItem}
        key={item?.id}
        activeOpacity={0.8}
      >
        <View
          style={[
            item?.id === "6" ? styles.iconWrapMore : styles.iconWrap,
            {
              backgroundColor: isDark ? darkTheme.darkThemeInputColor : colors.iconBgColor,
              borderRadius: 20,
            },
          ]}
        >
          <Image
            key={`${item?.id}-${isDark ? "dark" : "light"}`}
            resizeMode="contain"
            source={item.icon}
            style={[
              item?.id === "6" ? styles.iconMore : styles.icon,
              item?.id === "1" && isDark && { width: 45, height: 45 },
              item?.id !== "1" && isDark ? { tintColor: colors.white } : null,
              item?.id === "6" && !isDark ? { tintColor: themeColors.text } : null,
            ]}
          />
        </View>
        <AppText style={{ color: themeColors.text }} type={THIRTEEN}>
          {item?.title}
        </AppText>
      </TouchableOpacityView>
    </Animated.View>
  );
});

const HomeMenuBar = () => {
  const { colors: themeColors, theme, isDark } = useTheme();

  const languages = useAppSelector((state) => {
    return state.account.languages;
  });
  const Data = [
    {
      id: "1",
      title: checkValue(languages?.spot),
      icon: isDark ? spotIconDarkTheme : spotIcon,
      onPress: () => NavigationService.navigate(TRADE_SCREEN),
    },
    {
      id: "2",
      title: "Margin",
      icon: margin,
      onPress: () => NavigationService.navigate(TRADE_SCREEN, { activeTab: "Margin" }),
    },
    {
      id: "3",
      title: "Wallet",
      icon: wallet_ic,
      onPress: () => NavigationService.navigate(WALLET_SCREEN),
    },
    // {
    //   id: "4",
    //   title: checkValue("Swap"),
    //   icon: swap,
    //   onPress: showComingSoonToast,
    // },
    {
      id: "5",
      title: "Earning",
      icon: earningAsset1,
      onPress: () => NavigationService.navigate(EARNING_SCREEN),
    },
    {
      id: "6",
      title: "Security",
      icon: lockLight,
      onPress: () => NavigationService.navigate(ACCOUNT_SCREEN),
    },

  ];

  const renderItem = ({ item, index }: any) => {
    return <MenuItem item={item} index={index} />;
  };

  return (
    <View style={styles.menuBarBackground}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {Data?.map((item, index) => (
          <React.Fragment key={item.id}>{renderItem({ item, index })}</React.Fragment>
        ))}
      </ScrollView>
    </View>
  );
};


const styles = StyleSheet.create({
  menuBarBackground: {
    width: "100%",
    borderRadius: 8,
    paddingTop: 8,
    paddingBottom: 4,
    marginBottom: 0,
    paddingHorizontal: 15
  },
  container: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  scrollContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  icon: {
    height: 25,
    width: 25
  },
  iconMore: {
    height: 25,
    width: 25,
  },
  iconWrap: {
    height: 42,
    width: 42,
    borderRadius: 5,
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",

  },
  iconWrapMore: {
    height: 42,
    width: 42,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",

  },
  singleItem: {
    alignItems: "center",
    width: (Width - 40) / 4.8,

  },
  itemSeparator: {
    width: 8,
  },
});
export default HomeMenuBar;
