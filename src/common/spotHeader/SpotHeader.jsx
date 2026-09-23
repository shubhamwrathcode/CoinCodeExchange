import {
  StyleSheet,
  TouchableOpacity,
  View,
  Animated,
  Dimensions,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import FastImage from "react-native-fast-image";
import LinearGradient from "react-native-linear-gradient";
import { back_ic, candle, downIcon, history_line, modes, moreImg, defaultTrade } from "../../helper/ImageAssets";
import { AppText, SEMI_BOLD, BOLD, MEDIUM } from "../AppText";
import { toFixedThree } from "../../helper/utility";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import { Alert, Platform, ToastAndroid } from "react-native";
import NavigationService from "../../navigation/NavigationService";
import { useAppSelector } from "../../store/hooks";
import { showError } from "../../helper/logger";
import { LOGIN_SCREEN, BUY_CRYPTO_SCREEN, FUTURES_SCREEN } from "../../navigation/routes";

const { width: SCREEN_W } = Dimensions.get("window");
const HEADER_SHIMMER_STRIP = 140;

/** Same surface + shimmer language as Spot order book `ShimmerBox` (input bg). */
const HeaderShimmerBar = ({ width: w, height, borderRadius = 6, style }) => {
  const { colors: themeColors, isDark } = useTheme();
  const boneColor =
    themeColors?.input ??
    themeColors?.card ??
    (isDark ? "rgba(100, 130, 180, 0.22)" : "rgba(160, 185, 220, 0.35)");
  const shimmerColors = isDark
    ? ["transparent", "rgba(255,255,255,0.26)", "transparent"]
    : ["transparent", "rgba(255,255,255,0.72)", "transparent"];
  const stripW = HEADER_SHIMMER_STRIP;
  const shimmerX = useRef(new Animated.Value(-stripW)).current;

  useEffect(() => {
    shimmerX.setValue(-stripW);
    const run = () => {
      shimmerX.setValue(-stripW);
      Animated.timing(shimmerX, {
        toValue: SCREEN_W,
        duration: 900,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) run();
      });
    };
    run();
    return () => shimmerX.stopAnimation();
  }, [shimmerX]);

  return (
    <View
      style={[
        {
          width: w,
          height,
          borderRadius,
          backgroundColor: boneColor,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          width: stripW,
          height: "100%",
          transform: [{ translateX: shimmerX }],
        }}
      >
        <LinearGradient
          colors={shimmerColors}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

/**
 * Spot header: pair + chevron opens pair sheet; change % below; right = trend / candle / more.
 * @param {boolean} [pairLoading] — show input-style skeleton in left block until pair metadata is ready.
 */
const SpotHeader = ({
  title = "BTC/USDT",
  change = "",
  onBackPress = () => NavigationService.goBack(),
  onCandlePress = () => NavigationService.navigate("SpotChartScreen", { pair: title, change }),
  onTradePress,
  viewMode = "trade",
  openPairSheet,
  pairSheetRef,
  rightContent = null,
  activeHeaderTab = "Spot",
  setActiveHeaderTab,
  currencyData,
  userData,
  pairLoading = false,
}) => {
  const { colors: themeColors, isDark } = useTheme();
  const darkMode = isDark;
  const isPositive = Number(change) >= 0;
  const changeColor = change != null && change !== ""
    ? (isPositive ? (colors.green || "#0B9C3C") : (colors.red || "#E03934"))
    : themeColors.secondaryText;
  const formattedChange = change != null && change !== ""
    ? `${isPositive ? "+" : ""}${toFixedThree(change)}%`
    : "—";

  const titleColor = themeColors.text;
  const iconTint = themeColors.text;

  const handleOpenPairSheet = () => {
    if (typeof openPairSheet === "function") {
      openPairSheet();
    } else if (pairSheetRef?.current?.open) {
      pairSheetRef.current.open();
    }
  };

  const leftContent = (
    <TouchableOpacity
      onPress={handleOpenPairSheet}
      activeOpacity={0.75}
      hitSlop={{ top: 8, bottom: 8, right: 8 }}
      style={styles.pairBlock}
    >
      {pairLoading ? (
        <View accessibilityState={{ busy: true }}>
          <View style={styles.pairRow}>
            <HeaderShimmerBar width={140} height={22} borderRadius={6} />
            <View style={{ width: 12, height: 12, marginLeft: 8 }} />
          </View>
          <HeaderShimmerBar width={60} height={14} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
      ) : (
        <>
          <View style={styles.pairRow}>
            <AppText weight={BOLD} style={[styles.pairTitle, { color: titleColor }]} numberOfLines={1}>
              {title}
            </AppText>
            <FastImage
              source={downIcon}
              style={{ width: 35, height: 35, marginLeft: 6, marginTop: 2 }}
              resizeMode="contain"
            />
          </View>
          <AppText weight={MEDIUM} style={[styles.changeText, { color: changeColor }]}>
            {formattedChange}
          </AppText>
        </>
      )}
    </TouchableOpacity>
  );

  return (
    <>
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={onBackPress}
            activeOpacity={0.75}
            style={styles.backBtn}
            disabled={!onBackPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FastImage source={back_ic} style={{ width: 35, height: 35 }} resizeMode="contain" />
          </TouchableOpacity>
          <View style={styles.topTabs}>
            {["Spot", "Margin", /* "Buy Crypto", */ "Futures"].map((t, idx, arr) => {
              const active = t === activeHeaderTab;
              return (
                <TouchableOpacity
                  key={t}
                  activeOpacity={0.75}
                  disabled={active}
                  onPress={() => {
                    if (setActiveHeaderTab) {
                      setActiveHeaderTab(t);
                    }
                  }}
                  style={[
                    styles.topTabItem,
                    idx !== arr.length - 1 && { marginRight: 6 },
                  ]}
                >
                  <AppText weight={SEMI_BOLD} style={{ fontSize: 16, color: active ? (colors.cyanTheme || "#0AA8C5") : themeColors.secondaryText }}>
                    {t}
                  </AppText>
                  <View style={[styles.topTabUnderline, { backgroundColor: active ? (colors.cyanTheme || "#0AA8C5") : "transparent" }]} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {activeHeaderTab !== "Convert" && activeHeaderTab !== "Buy Crypto" && activeHeaderTab !== "Futures" && (
          <View style={styles.pairRowMain}>
            <View style={{ flex: 1 }}>
              {leftContent}
            </View>

            <View style={styles.rightGroup}>
              <View style={styles.badgeContainer}>
                <View style={[styles.mmBadge, { backgroundColor: isDark ? "#002E15" : "#E8F8F0" }]}>
                  <AppText weight={MEDIUM} style={{ color: colors.green || "#00C853", fontSize: 10 }}>MM</AppText>
                </View>
                <AppText weight={MEDIUM} style={{ color: colors.green || "#00C853", fontSize: 11, marginTop: 3 }}>0.00%</AppText>
              </View>

              <View style={[styles.iconGroup, { backgroundColor: isDark ? "#111214" : "#F3F4F6" }]}>
                <TouchableOpacity
                  style={[
                    styles.iconWrapper,
                    viewMode === "candles" && { backgroundColor: isDark ? "#35373F" : "#E5E7EB" },
                  ]}
                  onPress={onCandlePress}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Open chart"
                >
                  <FastImage
                    source={candle}
                    style={{ width: 18, height: 18 }}
                    resizeMode="contain"
                    tintColor={viewMode === "candles" ? (isDark ? colors.white : colors.black) : (isDark ? "#8E8E93" : "#6A7282")}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.iconWrapper,
                    viewMode === "trade" && { backgroundColor: isDark ? "#35373F" : "#E5E7EB" },
                  ]}
                  onPress={onTradePress}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Open trade"
                >
                  <FastImage
                    source={defaultTrade}
                    style={{ width: 18, height: 18 }}
                    resizeMode="contain"
                    tintColor={viewMode === "trade" ? (isDark ? colors.white : colors.black) : (isDark ? "#8E8E93" : "#6A7282")}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </>
  );
};

export default SpotHeader;

const styles = StyleSheet.create({
  container: {
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  topTabs: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
    paddingLeft: 5,
  },
  topTabItem: {
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  topTabUnderline: {
    height: 3,
    width: 18,
    borderRadius: 2,
  },
  pairRowMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingHorizontal: 4,
  },
  pairBlock: {
    justifyContent: "center",
  },
  pairRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  pairTitle: {
    fontSize: 22,
    letterSpacing: -0.2,
  },
  changeText: {
    fontSize: 13,
    marginTop: 3,
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  badgeContainer: {
    alignItems: "center",
    marginRight: 14,
  },
  mmBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  iconGroup: {
    flexDirection: "row",
    borderRadius: 22,
    padding: 3,
    alignItems: "center",
  },
  iconWrapper: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  activeIconWrapper: {
  },
});
