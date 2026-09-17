import React, { useMemo, useState, useCallback, useRef } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
  FadeIn,
} from "react-native-reanimated";
import FastImage from "react-native-fast-image";
import { ChevronRight, ChevronsUpDown } from "lucide-react-native";
import { AppText } from "../../shared";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { setBuyOrders, setSellOrders, setSpotSelectedPair } from "../../slices/homeSlice";
import NavigationService from "../../navigation/NavigationService";
import { MARKET_SCREEN, TRADE_SCREEN } from "../../navigation/routes";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

const TABS = [
  { key: 0, label: "Spot" },
  { key: 1, label: "Trending" },
  { key: 2, label: "Hot" },
  { key: 3, label: "New Listing" },
  { key: 4, label: "Top Gainers" },
];

const formatPrice = (val) => {
  if (val == null || val === "") return "0.00";
  const num = Number(val);
  if (!Number.isFinite(num)) return String(val);
  if (num < 0.0001) return num.toFixed(6);
  if (num < 1) return num.toFixed(4);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const TabItem = ({ tab, isActive, onPress, isDark }) => {
  const animatedBgStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(isActive ? colors.cyan : "transparent", {
      duration: 250,
    }),
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    color: withTiming(
      isActive
        ? isDark
          ? colors.white
          : "#000000"
        : colors.darkShadeColorText || "#9CA3AF",
      { duration: 250 }
    ),
  }));

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View style={[styles.tabItem, animatedBgStyle]}>
        <Animated.Text
          style={[
            styles.tabItemText,
            animatedTextStyle,
            { fontFamily: fonts.medium },
          ]}
        >
          {tab.label}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const CoinRowItem = React.memo(({ item, onPress, isDark, themeColors }) => {
  const ticker =
    String(
      item?.base_currency || item?.base_currency_short_name || ""
    ).toUpperCase() || "—";
  const fullName =
    item?.base_currency_fullname ||
    item?.base_currency_name ||
    item?.base_currency ||
    ticker;
  const iconUri = item?.icon_path ? item.icon_path : null;

  const chg =
    Number(item?.change_percentage ?? item?.changePercentage ?? item?.change) ||
    0;
  const isPositive = chg >= 0;
  const changeColor = isPositive ? "#00C076" : "#FF4B4B";
  const chgText = `${isPositive ? "+" : ""}${chg.toFixed(2)}%`;

  const lastPrice = item?.buy_price ?? item?.last_price ?? item?.price ?? 0;
  const usdPrice =
    item?.usd_price ?? item?.sell_price ?? item?.usdt_price ?? lastPrice;

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={() => onPress(item)}
    >
      {/* Left: Icon + Symbol & Name */}
      <View style={styles.colLeft}>
        {iconUri ? (
          <FastImage
            source={{ uri: iconUri }}
            style={styles.coinIcon}
            resizeMode={FastImage.resizeMode.contain}
          />
        ) : (
          <View
            style={[
              styles.coinIcon,
              styles.coinIconFallback,
              { backgroundColor: isDark ? "#1E2024" : "#E5E7EB" },
            ]}
          >
            <AppText
              style={{
                color: isDark ? colors.white : themeColors.text,
                fontSize: 12,
                fontFamily: fonts.bold,
              }}
            >
              {ticker.charAt(0)}
            </AppText>
          </View>
        )}
        <View style={styles.symbolBlock}>
          <AppText
            style={[
              styles.symbolText,
              { color: isDark ? colors.white : themeColors.text },
            ]}
            numberOfLines={1}
          >
            {ticker}
          </AppText>
          <AppText
            style={[
              styles.nameText,
              { color: colors.darkShadeColorText || "#9CA3AF" },
            ]}
            numberOfLines={1}
          >
            {fullName}
          </AppText>
        </View>
      </View>

      {/* Center: Price + USD Price */}
      <View style={styles.colCenter}>
        <AppText
          style={[
            styles.priceText,
            { color: isDark ? colors.white : themeColors.text },
          ]}
          numberOfLines={1}
        >
          {formatPrice(lastPrice)}
        </AppText>
        <AppText
          style={[
            styles.usdPriceText,
            { color: colors.darkShadeColorText || "#9CA3AF" },
          ]}
          numberOfLines={1}
        >
          ${formatPrice(usdPrice)}
        </AppText>
      </View>

      {/* Right: 24h Change badge */}
      <View style={styles.colRight}>
        <View style={[styles.changeBadge, { backgroundColor: changeColor }]}>
          <AppText style={styles.changeBadgeText}>{chgText}</AppText>
        </View>
      </View>
    </TouchableOpacity>
  );
});

CoinRowItem.displayName = "CoinRowItem";

const CoinList = React.memo(() => {
  const { colors: themeColors, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const coinPairs = useAppSelector((state) => state.home.coinPairs);
  const favoriteArray = useAppSelector((state) => state.home.favoriteArray);
  const [activeTabList, setActiveTabList] = useState(0);

  const normSym = useCallback((s) => String(s || "").trim().toUpperCase(), []);
  const toNum = useCallback((v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }, []);

  const pairVolumeNumber = useCallback(
    (p) =>
      toNum(p?.volume_24h) ||
      toNum(p?.volume) ||
      toNum(p?.quote_volume) ||
      0,
    [toNum]
  );

  const pairListingTimeMs = useCallback((p) => {
    const dt = p?.createdAt || p?.created_at || p?.listing_time || p?.listedAt;
    const ms = dt ? Date.parse(dt) : NaN;
    if (Number.isFinite(ms)) return ms;
    const id = String(p?._id || p?.id || "");
    return id ? id.length : 0;
  }, []);

  const spotChangeNumber = useCallback(
    (p) => toNum(p?.change_percentage ?? p?.changePercentage ?? p?.change),
    [toNum]
  );

  const HOT_BASE_ORDER = useMemo(
    () => ["BTC", "ETH", "BNB", "SOL", "XRP", "DOGE", "MATIC"],
    []
  );

  const pickPairForBase = useCallback(
    (pairs, base) => {
      const b = normSym(base);
      const usdt = pairs.find(
        (p) =>
          normSym(p?.base_currency) === b &&
          normSym(p?.quote_currency) === "USDT"
      );
      if (usdt) return usdt;
      return pairs.find((p) => normSym(p?.base_currency) === b);
    },
    [normSym]
  );

  const spotUsdtPairs = useMemo(() => {
    if (!coinPairs || coinPairs.length === 0) return [];
    const usdt = coinPairs.filter((p) => normSym(p?.quote_currency) === "USDT");
    return usdt.length >= 6 ? usdt : coinPairs;
  }, [coinPairs, normSym]);

  const filterData = useMemo(() => {
    if (!spotUsdtPairs || spotUsdtPairs.length === 0) return [];

    if (activeTabList === 0) {
      return [...spotUsdtPairs];
    }
    if (activeTabList === 1) {
      return [...spotUsdtPairs].sort(
        (a, b) => pairVolumeNumber(b) - pairVolumeNumber(a)
      );
    }
    if (activeTabList === 2) {
      const seen = new Set();
      const out = [];
      for (const base of HOT_BASE_ORDER) {
        const p = pickPairForBase(spotUsdtPairs, base);
        if (p && p?._id && !seen.has(p._id)) {
          seen.add(p._id);
          out.push(p);
        } else if (p && !p?._id) {
          out.push(p);
        }
      }
      for (const p of [...spotUsdtPairs].sort(
        (a, b) => pairVolumeNumber(b) - pairVolumeNumber(a)
      )) {
        if (out.length >= spotUsdtPairs.length) break;
        if (p?._id && seen.has(p._id)) continue;
        if (p?._id) seen.add(p._id);
        out.push(p);
        if (out.length >= 50) break;
      }
      return out;
    }
    if (activeTabList === 3) {
      return [...spotUsdtPairs].sort(
        (a, b) => pairListingTimeMs(b) - pairListingTimeMs(a)
      );
    }
    if (activeTabList === 4) {
      return [...spotUsdtPairs].sort(
        (a, b) => spotChangeNumber(b) - spotChangeNumber(a)
      );
    }

    return [...spotUsdtPairs];
  }, [
    spotUsdtPairs,
    activeTabList,
    pairVolumeNumber,
    HOT_BASE_ORDER,
    pickPairForBase,
    pairListingTimeMs,
    spotChangeNumber,
  ]);

  const displayItems = useMemo(
    () => (Array.isArray(filterData) ? filterData.slice(0, 10) : []),
    [filterData]
  );

  const handleNavigate = useCallback(
    (item) => {
      dispatch(setSpotSelectedPair(item));
      dispatch(setBuyOrders([]));
      dispatch(setSellOrders([]));
      NavigationService.navigate(TRADE_SCREEN, { coinDetail: item });
    },
    [dispatch]
  );

  const handleViewMore = useCallback(() => {
    const tab =
      activeTabList === 0
        ? "Spot"
        : activeTabList === 1
          ? "Trending"
          : activeTabList === 2
            ? "Hot"
            : activeTabList === 3
              ? "New Listing"
              : activeTabList === 4
                ? "Top Gainers"
                : "Spot";
    NavigationService.navigate(MARKET_SCREEN, { tab });
  }, [activeTabList]);

  const mutedColor = colors.darkShadeColorText || "#9CA3AF";

  return (
    <Animated.View
      entering={FadeIn.duration(500)}
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.lightBlackLatest : "#F9FAFB",
          borderColor: isDark
            ? "rgba(255, 255, 255, 0.05)"
            : "rgba(0, 0, 0, 0.06)",
        },
      ]}
    >
      {/* Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {TABS.map((t) => (
            <TabItem
              key={t.key}
              tab={t}
              isActive={activeTabList === t.key}
              onPress={() => setActiveTabList(t.key)}
              isDark={isDark}
            />
          ))}
        </ScrollView>
        <View style={styles.tabArrow}>
          <ChevronRight color={mutedColor} size={16} />
        </View>
      </View>

      {/* Table Header */}
      <View style={styles.headerRow}>
        <AppText style={[styles.colLeftHeader, styles.headerLabel, { color: mutedColor }]}>
          Symbol
        </AppText>
        <AppText style={[styles.colCenterHeader, styles.headerLabel, { color: mutedColor }]}>
          Last Price
        </AppText>
        <View style={styles.colRightHeaderWrapper}>
          <AppText style={[styles.headerLabel, { color: mutedColor, marginRight: 4 }]}>
            24H Change
          </AppText>
          <ChevronsUpDown color={mutedColor} size={12} />
        </View>
      </View>

      {/* Coin Rows List */}
      <View style={styles.listContainer}>
        {displayItems.map((item) => (
          <CoinRowItem
            key={item?._id || `${item?.base_currency}_${item?.quote_currency}`}
            item={item}
            onPress={handleNavigate}
            isDark={isDark}
            themeColors={themeColors}
          />
        ))}
      </View>

      {/* Footer */}
      <TouchableOpacity
        style={styles.footer}
        activeOpacity={0.7}
        onPress={handleViewMore}
      >
        <AppText style={[styles.viewMoreStyle, { color: colors.cyan }]}>
          View More &gt;
        </AppText>
      </TouchableOpacity>
    </Animated.View>
  );
});

CoinList.displayName = "CoinList";

export default CoinList;

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    marginHorizontal: 16,
    borderWidth: 1,
    paddingTop: 16,
    paddingBottom: 16,
    marginBottom: 24,
  },
  tabsWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
    marginBottom: 12,
  },
  tabsScroll: {
    paddingHorizontal: 10,
    alignItems: "center",
  },
  tabItem: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 5,
    // marginHorizontal: 3,
  },
  tabItemText: {
    fontSize: 12,
  },
  tabArrow: {
    paddingLeft: 6,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  colLeftHeader: {
    width: "40%",
  },
  colCenterHeader: {
    width: "30%",
    textAlign: "left",
  },
  colRightHeaderWrapper: {
    width: "30%",
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  headerLabel: {
    fontSize: 10,
    fontFamily: fonts.regular,
  },
  listContainer: {
    minHeight: 100,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
  },
  colLeft: {
    width: "40%",
    flexDirection: "row",
    alignItems: "center",
  },
  coinIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 10,
  },
  coinIconFallback: {
    justifyContent: "center",
    alignItems: "center",
  },
  symbolBlock: {
    flex: 1,
  },
  symbolText: {
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  nameText: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  colCenter: {
    width: "30%",
    alignItems: "flex-start",
  },
  priceText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  usdPriceText: {
    fontSize: 11,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  colRight: {
    width: "30%",
    alignItems: "flex-end",
  },
  changeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 70,
    alignItems: "center",
  },
  changeBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  footer: {
    alignItems: "center",
    marginTop: 8,
  },
  viewMoreStyle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textDecorationLine: "underline",
  },
});
