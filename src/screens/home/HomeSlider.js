import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Carousel from "react-native-reanimated-carousel";
import { Easing } from "react-native-reanimated";
import { useAppSelector } from "../../store/hooks";
import { Screen } from "../../theme/dimens";
import {
  connectwallet,
  connectwallet1,
  connectwallet2,
  connectwallet3,
  connectwallet4,
  connectwallet5,
} from "../../helper/ImageAssets";
import FastImage from "react-native-fast-image";
import { AppText, ELEVEN, FOURTEEN, MEDIUM, NINE, SEMI_BOLD } from "../../shared";
import { colors, darkTheme } from "../../theme/colors";
import NavigationService from "../../navigation/NavigationService";
import {
  DEPOSIT_COIN_SCREEN,
  KYC_STEP_ONE_SCREEN,
  WALLET_SCREEN,
} from "../../navigation/routes";
import { useTheme } from "../../hooks/useTheme";

const SLIDER_HEIGHT = 84;
const AUTO_PLAY_MS = 3600;
const SCROLL_MS = 420;

const HomeSlider = ({ theme: themeProp }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef(null);
  const { isDark: isDarkFromHook } = useTheme();
  const isDark = themeProp === "Light" ? false : themeProp === "Dark" ? true : isDarkFromHook;
  const userData = useAppSelector((state) => state.auth.userData);
  const kycVerified = userData?.kycVerified != null ? Number(userData.kycVerified) : 0;

  const carouselWidth = useMemo(() => Screen.Width - 30, []);

  const baseOptions = useMemo(
    () => ({
      vertical: false,
      width: carouselWidth,
      height: SLIDER_HEIGHT,
    }),
    [carouselWidth]
  );

  const bannerList = useMemo(() => {
    const banners = [
      {
        index: 0,
        banner_path: connectwallet,
        title: `Connect Wallet & Unlock Crypto Trading`,
        onPress: () => NavigationService.navigate(KYC_STEP_ONE_SCREEN),
        isKyc: true,
      },
      {
        index: 1,
        banner_path: connectwallet1,
        title: `Trade Smarter on the Next-Gen Crypto Exchange.`,
        onPress: () => NavigationService.navigate(WALLET_SCREEN),
      },
      {
        index: 2,
        banner_path: connectwallet2,
        title: `Secure Crypto Exchange for Modern Traders.`,
        onPress: () => NavigationService.navigate(DEPOSIT_COIN_SCREEN),
      },
      {
        index: 3,
        banner_path: connectwallet3,
        title: `Your Trusted Gateway to Cryptocurrency Trading.`,
        onPress: () => NavigationService.navigate("Support"),
      },
      {
        index: 4,
        banner_path: connectwallet4,
        title: `Global Crypto Exchange Built for Everyone.`,
        onPress: () => NavigationService.navigate("Support"),
      },
      {
        index: 5,
        banner_path: connectwallet5,
        title: `Powering the Next Generation of Crypto Traders.`,
        onPress: () => NavigationService.navigate("Support"),
      },
    ];
    return banners.filter((banner) => {
      if (banner.isKyc) {
        return kycVerified === 0 || kycVerified === 3;
      }
      return true;
    });
  }, [kycVerified]);

  const slideCount = bannerList.length;
  const dataKey = useMemo(() => bannerList.map((b) => b.index).join("-"), [bannerList]);
  const themeKey = isDark ? "dark" : "light";

  const windowSize = useMemo(() => {
    if (slideCount <= 1) return 3;
    return Math.min(7, Math.max(5, slideCount));
  }, [slideCount]);

  useEffect(() => {
    if (slideCount <= 1) return undefined;
    const id = setInterval(() => {
      try {
        carouselRef.current?.next?.({ animated: true });
      } catch {
        /* ignore */
      }
    }, AUTO_PLAY_MS);
    return () => clearInterval(id);
  }, [slideCount, themeKey]);

  const slideBg = isDark ? darkTheme.darkThemeInputColor : "#F7F7F7";
  const cardBg = isDark ? "#2C2C2E" : "#F0F0F0";
  const titleColor = isDark ? colors.white : "#111827";
  const mutedColor = isDark ? "#8A8A93" : "#9ca3af";
  const counterBg = isDark ? darkTheme.darkThemeInputColor : "#E5E7EB";
  const counterColor = isDark ? colors.white : "#000";

  const renderItem = useCallback(
    ({ item }) => {
      const total = slideCount || 1;
      const current = Math.min(activeIndex + 1, total);
      const totalColor = current === total ? counterColor : "#9CA3AF";

      return (
        <View style={[styles.slideOuter, { backgroundColor: slideBg }]}>
          <TouchableOpacity
            style={styles.slideInner}
            onPress={item?.onPress}
            activeOpacity={0.9}
          >
            <FastImage
              source={item?.banner_path}
              style={styles.bannerImage}
              resizeMode="contain"
            />

            <View style={styles.textBlock}>
              <AppText type={ELEVEN} weight={MEDIUM} style={{ color: mutedColor }} numberOfLines={1}>
                Events
              </AppText>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} numberOfLines={2} style={[styles.titleText, { color: titleColor }]}>
                {item?.title}
              </AppText>
              <AppText type={NINE} numberOfLines={1} style={{ color: titleColor }}>
                Explore now →
              </AppText>
            </View>

            <View style={[styles.counterBadge, { backgroundColor: counterBg }]}>
              <Text numberOfLines={1}>
                <Text style={[styles.counterCurrent, { color: counterColor }]}>{current}</Text>
                <Text style={[styles.counterTotal, { color: totalColor }]}>{`/${total}`}</Text>
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      );
    },
    [slideCount, activeIndex, slideBg, mutedColor, titleColor, counterBg, counterColor]
  );

  if (slideCount === 0) {
    return null;
  }

  return (
    <>
      <View
        style={[
          styles.card,
          {
            width: carouselWidth,
            height: SLIDER_HEIGHT,
            backgroundColor: cardBg,
          },
        ]}
      >
        <View style={styles.carouselHost}>
          <Carousel
            key={`${dataKey}-${themeKey}`}
            ref={carouselRef}
            {...baseOptions}
            data={bannerList}
            defaultIndex={Math.min(activeIndex, Math.max(0, slideCount - 1))}
            renderItem={renderItem}
            onSnapToItem={setActiveIndex}
            loop={slideCount > 1}
            enabled
            pagingEnabled
            autoPlay={false}
            scrollAnimationDuration={SCROLL_MS}
            windowSize={windowSize}
            panGestureHandlerProps={{ activeOffsetX: [-12, 12] }}
            withAnimation={{
              type: "timing",
              config: {
                duration: SCROLL_MS,
                easing: Easing.out(Easing.cubic),
              },
            }}
          />
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    alignSelf: "center",
    marginBottom: 5,

    borderRadius: 12,
    overflow: "hidden",
  },
  carouselHost: {
    width: "100%",
    alignSelf: "center",
    justifyContent: "center",
  },
  slideOuter: {
    flex: 1,
    paddingRight: 10,
  },
  slideInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    overflow: "hidden",
    position: "relative",
  },
  bannerImage: {
    width: 77,
    height: 77,
  },
  textBlock: {
    flex: 1,
    paddingHorizontal: 10,
    minWidth: 0,
  },
  titleText: {
    flexShrink: 1,
  },
  counterBadge: {
    position: "absolute",
    right: 0,
    bottom: 6,
    minWidth: 40,
    borderRadius: 5,

    paddingVertical: 2,
    paddingHorizontal: 5,
    alignItems: "center",
    flexShrink: 0,
  },
  counterCurrent: {
    fontSize: 11,

    fontWeight: "600",
  },
  counterTotal: {
    fontSize: 11,
    fontWeight: "600",
  },
});

export default HomeSlider;
