/* eslint-disable react-native/no-inline-styles */
import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { View, StyleSheet, Platform, ScrollView } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { universalPaddingHorizontal } from "../../theme/dimens";
import { useAppSelector } from "../../store/hooks";
import Favourites from "../other/Favourites";
import MarketList from "../other/MarketList";
import { FuturesList } from "../other/FuturesMarket";
import HomeCoinList from "./HomeCoinList";
import NavigationService from "../../navigation/NavigationService";
import { WALLET_SCREEN, MARKET_SCREEN, FUTURES_SCREEN, ADD_FAVOURITE_SCREEN, TRADE_SCREEN } from "../../navigation/routes";
import TouchableOpacityView from "../../shared/components/TouchableOpacityView";
import FastImage from "react-native-fast-image";
import { AppText, Button, MEDIUM, SEMI_BOLD } from "../../shared";
import { back_ic } from "../../helper/ImageAssets";
import { useDispatch } from "react-redux";
import { setBuyOrders, setSellOrders, setSpotSelectedPair, setFuturesSelectedPair } from "../../slices/homeSlice";
import { useTheme } from "../../hooks/useTheme";

const CoinList = React.memo(() => {
  const { colors: themeColors, isDark } = useTheme();
  const coinPairs = useAppSelector((state) => state.home.coinPairs);
  const futuresPairs = useAppSelector((state) => state.home.futuresPairs ?? []);
  const favoriteArray = useAppSelector((state) => state.home.favoriteArray);
  const theme = useAppSelector((state) => state.auth.theme);
  const dispatch = useDispatch();
  // Web parity tabs: 0=Favorite, 1=Trending, 2=Hot, 3=New Listing, 4=Top Gainers
  const [activeTabList, setActiveTabList] = useState(0);
  const prevTabRef = useRef(activeTabList);
  const tabScrollRef = useRef(null);

  const listAnimX = useSharedValue(0);
  const listAnimOpacity = useSharedValue(1);
  const [btnLoading, setBtnLoading] = useState(false);

  const tabLayoutsRef = useRef({});

  const tabs = useMemo(
    () => [
      { key: 0, label: "Spot" },
      { key: 1, label: "Trending" },
      { key: 2, label: "Hot" },
      { key: 3, label: "New Listing" },
      { key: 4, label: "Top Gainers" },
    ],
    []
  );

  const handleTabChange = useCallback((tab) => {
    setActiveTabList(tab);
  }, []);

  const normSym = useCallback((s) => String(s || "").trim().toUpperCase(), []);
  const toNum = useCallback((v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }, []);

  const pairVolumeNumber = useCallback((p) => {
    return (
      toNum(p?.volume_24h) ||
      toNum(p?.volume) ||
      toNum(p?.quote_volume) ||
      0
    );
  }, [toNum]);

  const pairListingTimeMs = useCallback((p) => {
    const dt = p?.createdAt || p?.created_at || p?.listing_time || p?.listedAt;
    const ms = dt ? Date.parse(dt) : NaN;
    if (Number.isFinite(ms)) return ms;
    // fallback: ObjectId-ish ordering or numeric id
    const id = String(p?._id || p?.id || "");
    return id ? id.length : 0;
  }, []);

  const spotChangeNumber = useCallback((p) => {
    return toNum(p?.change_percentage ?? p?.changePercentage ?? p?.change);
  }, [toNum]);

  // Web: curated majors for Hot tab (fallback to volume list)
  const HOT_BASE_ORDER = useMemo(() => ["BTC", "ETH", "BNB", "SOL", "XRP", "DOGE", "MATIC"], []);
  const pickPairForBase = useCallback(
    (pairs, base) => {
      const b = normSym(base);
      // prefer USDT quote
      const usdt = pairs.find(
        (p) => normSym(p?.base_currency) === b && normSym(p?.quote_currency) === "USDT"
      );
      if (usdt) return usdt;
      return pairs.find((p) => normSym(p?.base_currency) === b);
    },
    [normSym]
  );

  // Web: use USDT-quoted universe (fallback to all if none)
  const spotUsdtPairs = useMemo(() => {
    if (!coinPairs || coinPairs.length === 0) return [];
    const usdt = coinPairs.filter((p) => normSym(p?.quote_currency) === "USDT");
    return usdt.length >= 6 ? usdt : coinPairs;
  }, [coinPairs, normSym]);

  // 0=Favourite, 1=Trending, 2=Hot, 3=New Listing, 4=Top Gainers
  const filterData = useMemo(() => {
    if (!spotUsdtPairs || spotUsdtPairs.length === 0) return [];

    // Spot tab: all USDT pairs
    if (activeTabList === 0) {
      return [...spotUsdtPairs];
    }

    // Trending: highest 24h volume
    if (activeTabList === 1) {
      return [...spotUsdtPairs].sort((a, b) => pairVolumeNumber(b) - pairVolumeNumber(a));
    }

    // Hot: curated majors, fill remainder by trending
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
      for (const p of [...spotUsdtPairs].sort((a, b) => pairVolumeNumber(b) - pairVolumeNumber(a))) {
        if (out.length >= spotUsdtPairs.length) break;
        if (p?._id && seen.has(p._id)) continue;
        if (p?._id) seen.add(p._id);
        out.push(p);
        if (out.length >= 50) break;
      }
      return out;
    }

    // New Listing: newest createdAt/listing time
    if (activeTabList === 3) {
      return [...spotUsdtPairs].sort((a, b) => pairListingTimeMs(b) - pairListingTimeMs(a));
    }

    // Top Gainers: highest positive change
    if (activeTabList === 4) {
      return [...spotUsdtPairs].sort((a, b) => spotChangeNumber(b) - spotChangeNumber(a));
    }

    return [...spotUsdtPairs];
  }, [spotUsdtPairs, activeTabList, pairVolumeNumber, HOT_BASE_ORDER, pickPairForBase, pairListingTimeMs, spotChangeNumber, favoriteArray]);

  const fourItems = useMemo(
    () => (Array.isArray(filterData) ? filterData.slice(0, 10) : []),
    [filterData]
  );

  const futuresFive = useMemo(
    () => (Array.isArray(futuresPairs) ? futuresPairs.slice(0, 10) : []),
    [futuresPairs]
  );

  const handleNavigate = useCallback((item) => {
    // Pre-set the selected pair and clear old order book in Redux BEFORE navigating.
    // This prevents the race condition where Spot's useFocusEffect re-subscribes
    // to the old pair's socket during the async gap before route.params takes effect.
    dispatch(setSpotSelectedPair(item));
    dispatch(setBuyOrders([]));
    dispatch(setSellOrders([]));
    NavigationService.navigate(TRADE_SCREEN, { coinDetail: item });
  }, [dispatch]);

  const handleViewMore = useCallback(() => {
    const tab =
      activeTabList === 0
        ? "Favourite"
        : activeTabList === 1
          ? "Trending"
          : activeTabList === 2
            ? "Hot"
            : activeTabList === 3
              ? "New Listing"
              : activeTabList === 4
                ? "Top Gainers"
                : "";
    NavigationService.navigate(MARKET_SCREEN, { tab });
  }, [activeTabList]);



  // animate list swipe + move selected indicator
  useEffect(() => {
    const prev = prevTabRef.current;
    const dir = activeTabList > prev ? 1 : -1; // right -> left swipe feel
    prevTabRef.current = activeTabList;

    // list swipe
    listAnimOpacity.value = 0.5;
    listAnimX.value = dir * 24;
    listAnimOpacity.value = withTiming(1, { duration: 180 });
    listAnimX.value = withTiming(0, { duration: 220 });

    const layout = tabLayoutsRef.current?.[String(activeTabList)];
    if (layout) {
      tabScrollRef.current?.scrollTo?.({
        x: Math.max(0, layout.x - 60),
        animated: true,
      });
    }
  }, [activeTabList, listAnimOpacity, listAnimX]);

  const listAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: listAnimX.value }],
      opacity: listAnimOpacity.value,
    };
  });

  return (
    <Animated.View
      entering={FadeIn.duration(600)}
      style={[styles.container, { marginBottom: 28 }]}
    >

      {/* Single elevated card: Tabs + 4 items list (no scroll) + View More */}
      <View style={[styles.elevatedCard, {}]}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <ScrollView
            ref={tabScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabRow}
          >
            {tabs.map((t) => {
              const active = activeTabList === t.key;
              return (
                <TouchableOpacityView
                  key={String(t.key)}
                  style={styles.tabPill}
                  onPress={() => handleTabChange(t.key)}
                  activeOpacity={0.8}
                  onLayout={(e) => {
                    const { x, width } = e.nativeEvent.layout;
                    tabLayoutsRef.current[String(t.key)] = { x, w: width };
                  }}
                >
                  <AppText
                    weight={MEDIUM}
                    style={[
                      {
                        fontSize: 16,
                        color: active
                          ? isDark
                            ? themeColors.text
                            : "#070808"
                          : '#84888C',
                      },
                    ]}
                  >
                    {t.label}
                  </AppText>
                </TouchableOpacityView>
              );
            })}
            <View style={{ width: 6 }} />
          </ScrollView>
        </Animated.View>

        <View style={[styles.listWrap, activeTabList === 0 && (!favoriteArray || favoriteArray?.length === 0) ? { minHeight: 300 } : { minHeight: 0 }]}>
          {activeTabList === 0 ? null : null}

          <Animated.View style={listAnimatedStyle}>
            <MarketList
              filterData={fourItems}
              onPress={handleNavigate}
              scrollEnabled={false}
              pairTypography="homeTab"
              hideStar={true}
              style={styles.marketListFixed}
            />
          </Animated.View>
        </View>

        {activeTabList !== 0 && (
          <TouchableOpacityView
            style={styles.viewMoreRow}
            onPress={handleViewMore}
            activeOpacity={0.7}
          >
            <AppText style={[styles.viewMoreText, { color: themeColors.text }]}>
              More →
            </AppText>
          </TouchableOpacityView>
        )}
      </View>
      {activeTabList === 0 && <View style={{ height: 20 }} />}

      <Animated.View entering={FadeIn.duration(600).delay(200)}>
        <HomeCoinList activeTabList={activeTabList} hideViewMore />
      </Animated.View>
    </Animated.View>
  );
});

CoinList.displayName = "CoinList";


const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: universalPaddingHorizontal,
  },
  elevatedCard: {
    padding: 2,
    paddingTop: 4,
    overflow: "visible",

  },
  listWrap: {
    marginTop: 0,
  },
  marketListFixed: {
    width: "100%",
    padding: 0,
  },
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    position: "relative",
  },
  tabPill: {
    paddingHorizontal: 5,
    paddingVertical: 6,
    borderRadius: 5,
  },

  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingTop: 5,
  },
  // tableHeaderText: {
  //   fontSize: 11,
  //   color: themeColors.secondaryText,
  // },
  row: {
    flexDirection: "row",
    alignItems: "center",
    // paddingVertical: 4,
    paddingHorizontal: 4,
  },
  colSymbol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  // iconCircle: {
  //   width: 38,
  //   height: 38,
  //   borderRadius: 19,
  //   alignItems: "center",
  //   justifyContent: "center",
  //   backgroundColor: themeColors.input,
  //   overflow: "hidden",
  // },
  // coinName: {
  //   fontSize: 13,
  //   fontWeight: "700",
  //   color: themeColors.text,
  // },
  // coinSym: {
  //   marginTop: 0,
  //   fontSize: 10,
  //   color: themeColors.secondaryText,
  // },
  // priceMain: {
  //   fontSize: 13,
  //   fontWeight: "700",
  //   color: themeColors.text,
  // },
  // priceSub: {
  //   marginTop: 2,
  //   fontSize: 10,
  //   color: themeColors.secondaryText,
  // },
  changePill: {
    minWidth: 70,
    paddingHorizontal: 8,
    height: 26,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  changeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  viewMoreRow: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    paddingVertical: 10,
    bottom: 10
  },
  viewMoreText: {
    fontSize: 13,
  },
  mainBtn: {
    width: "100%",
    height: 45,
  },
});

export default CoinList;
