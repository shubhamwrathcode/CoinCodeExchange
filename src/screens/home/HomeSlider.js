import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, TouchableOpacity, FlatList, Dimensions } from "react-native";
import FastImage from "react-native-fast-image";
import { AppText } from "../../shared";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import {
  event1,
  verifyIdentity,
  landingpagedemo,
} from "../../helper/ImageAssets";
import NavigationService from "../../navigation/NavigationService";
import {
  KYC_STATUS_SCREEN,
  KYC_STEP_ONE_SCREEN,
  WALLET_SCREEN,
  FUTURES_SCREEN,
  REFER_AND_EARN_SCREEN,
} from "../../navigation/routes";

const { width: screenWidth } = Dimensions.get("window");

const MOCK_EVENTS = [
  {
    id: "1",
    title: "Connect Wallet & Unlock Crypto Trading",
    image: event1,
    screen: KYC_STEP_ONE_SCREEN,
  },
  {
    id: "2",
    title: "Complete KYC & Get Bonus Rewards",
    image: event1,
    screen: KYC_STATUS_SCREEN,
  },
  {
    id: "3",
    title: "Deposit Crypto & Earn 10% APY",
    image: event1,
    screen: WALLET_SCREEN,
  },
  {
    id: "4",
    title: "Invite Friends & Share Prize Pool",
    image: event1,
    screen: REFER_AND_EARN_SCREEN,
  },
  {
    id: "5",
    title: "Trade Futures & Win BTC",
    image: event1,
    screen: FUTURES_SCREEN,
  },
  {
    id: "6",
    title: "Exclusive Airdrop For New Users",
    image: event1,
    screen: "Support",
  },
];

const MULTIPLIER = 100;
const INFINITE_EVENTS = Array(MULTIPLIER).fill(MOCK_EVENTS).flat();
const START_INDEX = Math.floor(MULTIPLIER / 2) * MOCK_EVENTS.length;

const HomeSlider = () => {
  const { colors: themeColors, isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(START_INDEX);
  const flatListRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = prev + 1;
        if (nextIndex >= INFINITE_EVENTS.length) return prev;
        flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        return nextIndex;
      });
    }, 3500);

    return () => clearInterval(timer);
  }, []);

  const handleScrollEnd = (e) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    setCurrentIndex(newIndex);
  };

  const getItemLayout = (_data, index) => ({
    length: screenWidth,
    offset: screenWidth * index,
    index,
  });

  const renderItem = ({ item, index }) => {
    const realIndex = index % MOCK_EVENTS.length;
    return (
      <View style={{ width: screenWidth }}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: isDark ? "#0F1012" : "#F9FAFB",
              borderColor: isDark
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.06)",
            },
          ]}
        >
          <View style={styles.imageContainer}>
            <FastImage
              source={item.image}
              style={styles.image}
              resizeMode={FastImage.resizeMode.contain}
            />
          </View>
          <View style={styles.contentContainer}>
            <View style={styles.headerRow}>
              <AppText
                style={{
                  color: colors.cyan,
                  fontSize: 14,
                  fontFamily: fonts.semiBold,
                }}
              >
                Events
              </AppText>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: isDark ? "#1E2024" : "#E5E7EB" },
                ]}
              >
                <AppText
                  style={{
                    color: isDark ? colors.white : themeColors.text,
                    fontSize: 12,
                    fontFamily: fonts.medium,
                  }}
                >
                  {realIndex + 1}/{MOCK_EVENTS.length}
                </AppText>
              </View>
            </View>

            <AppText
              style={{
                color: isDark ? colors.white : themeColors.text,
                fontSize: 14,
                fontFamily: fonts.bold,
                marginTop: 6,
                lineHeight: 19,
                minHeight: 38,
              }}
              numberOfLines={2}
            >
              {item.title}
            </AppText>

            <View style={styles.footerRow}>
              <View style={styles.pagination}>
                {MOCK_EVENTS.map((_, dotIndex) => (
                  <View
                    key={dotIndex}
                    style={[
                      styles.dot,
                      realIndex === dotIndex
                        ? [styles.activeDot, { backgroundColor: colors.cyan }]
                        : [
                          styles.inactiveDot,
                          {
                            backgroundColor: isDark
                              ? "#2A2C31"
                              : "#D1D5DB",
                          },
                        ],
                    ]}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.joinButton, { borderColor: colors.cyan }]}
                activeOpacity={0.8}
                onPress={() => {
                  if (item.screen) {
                    NavigationService.navigate(item.screen);
                  }
                }}
              >
                <AppText
                  style={{
                    color: colors.cyan,
                    fontSize: 11,
                    fontFamily: fonts.semiBold,
                  }}
                >
                  Join Now
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      <FlatList
        ref={flatListRef}
        data={INFINITE_EVENTS}
        renderItem={renderItem}
        keyExtractor={(_, index) => index.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        initialScrollIndex={START_INDEX}
        getItemLayout={getItemLayout}
        onScrollBeginDrag={() => { }}
      />
    </View>
  );
};

export default HomeSlider;

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 4,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F1012",
    borderRadius: 20,
    marginHorizontal: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  imageContainer: {
    width: 105,
    height: 105,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginLeft: -4,
  },
  image: {
    width: 115,
    height: 115,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    backgroundColor: "#1E2024",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 18,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: "#2A2C31",
  },
  joinButton: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
});
