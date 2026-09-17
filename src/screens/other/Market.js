import { StyleSheet, View, Dimensions, Animated, RefreshControl } from "react-native";
import { AppSafeAreaView, AppText, Button } from "../../shared";
import KeyBoardAware from "../../shared/components/KeyboardAware";
import MarketHeader from "./MarketHeader";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Favourites from "./Favourites";
import SpotMarket from "./SpotMarket";
import FuturesMarket from "./FuturesMarket";
import CryptosMarket from "./CryptosMarket";
import AlphaMarket from "./AlphaMarket";
import OptionsMarket from "./OptionsMarket";
import MarketList from "./MarketList";
import MarketPlaceholder from "./MarketPlaceholder";
import { useAppSelector } from "../../store/hooks";
import { useDispatch } from "react-redux";
import { universalPaddingHorizontal } from "../../theme/dimens";
import { useRoute, useIsFocused } from "@react-navigation/native";
import { SocketContext } from "../../SocketProvider";
import { getFavoriteArray, addToFavorites } from "../../actions/homeActions";
import NavigationService from "../../navigation/NavigationService";
import { TRADE_SCREEN, WALLET_SCREEN, NAVIGATION_AUTH_STACK, LOGIN_SCREEN } from "../../navigation/routes";
import MarketSkeleton from "./MarketSkeleton";
import { futureSocketService } from "../../services/socket/FutureSocketService";
import { setFuturesPairs } from "../../slices/homeSlice";
import { colors } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";
import { NO_NOTIFICATION_ICON, NO_NOTIFICATION_ICON_LIGHT } from "../../helper/ImageAssets";
import FastImage from "react-native-fast-image";
import { showError } from "../../helper/logger";

const SIDE_SPACE = 20;
const HOT_BASE_ORDER = ["BTC", "ETH", "BNB", "SOL", "XRP", "DOGE", "MATIC"];
const SHIMMER_STRIP = 120;

// Reusable shimmer box shared by TabListSkeleton
const ShimmerCell = ({ width: w, height, borderRadius = 5, style }) => {
  const { colors: themeColors, isDark } = useTheme();
  const shimmerX = useRef(new Animated.Value(-SHIMMER_STRIP)).current;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const run = () => {
      if (!mounted.current) return;
      shimmerX.setValue(-SHIMMER_STRIP);
      Animated.timing(shimmerX, {
        toValue: Math.max(w, 1) + SHIMMER_STRIP,
        duration: 1100,
        useNativeDriver: true,
      }).start(({ finished }) => { if (mounted.current && finished) run(); });
    };
    const t = setTimeout(run, 50);
    return () => { mounted.current = false; clearTimeout(t); shimmerX.stopAnimation(); };
  }, [shimmerX, w]);
  return (
    <Animated.View
      style={[{
        width: w, height, borderRadius, overflow: "hidden",
        backgroundColor: themeColors.card,
      }, style]}
    >
      <Animated.View
        pointerEvents="none"
        style={[{
          position: "absolute", top: 0, bottom: 0,
          width: SHIMMER_STRIP, left: 0,
          transform: [{ translateX: shimmerX }],
          backgroundColor: "transparent",
        }]}
      />
    </Animated.View>
  );
};

// Skeleton that mimics MarketList row layout (icon + name/vol + price + pill)
const TabListSkeleton = ({ rows = 8 }) => {
  const { colors: themeColors } = useTheme();
  return (
    <Animated.View style={{ paddingHorizontal: SIDE_SPACE, paddingTop: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Animated.View
          key={i}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 12,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: themeColors.border,
          }}
        >
          {/* left: icon + name/vol */}
          <Animated.View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 8 }}>
            <ShimmerCell width={28} height={28} borderRadius={14} />
            <Animated.View style={{ gap: 4 }}>
              <ShimmerCell width={52} height={12} />
              <ShimmerCell width={38} height={10} />
            </Animated.View>
          </Animated.View>
          {/* centre: price */}
          <ShimmerCell width={56} height={12} style={{ marginHorizontal: 8 }} />
          {/* right: % pill */}
          <ShimmerCell width={64} height={24} borderRadius={6} />
        </Animated.View>
      ))}
    </Animated.View>
  );
};

const Market = () => {
  const { colors: themeColors, isDark } = useTheme();
  const route = useRoute();
  const isFocused = useIsFocused();
  const socketContextVars = useContext(SocketContext) || {};
  const { subscribeToMarket, unsubscribeFromMarket } = socketContextVars;
  const coinPairs = useAppSelector((state) => state.home.coinPairs);
  const hotPairsChart = useAppSelector((state) => state.home.hotPairsChart) ?? {};
  const futuresPairs = useAppSelector((state) => state.home.futuresPairs ?? []);
  const userData = useAppSelector((state) => state.auth.userData);
  const isLoggedIn = Boolean(userData && (userData._id || userData.id || userData.emailId || userData.email || userData.mobileNumber || userData.token));
  const favoriteArray = useAppSelector((state) => state.home.favoriteArray);
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState("Spot");
  const [spotSubCategory, setSpotSubCategory] = useState("All");
  const [alphaSubTab, setAlphaSubTab] = useState("ALL_CHAIN");
  const TAB_KEYS = useMemo(
    () => ["Favorites", "Spot", "Cryptos", "USD_M_FUTURES",
      // "COIN_M_FUTURES",
      "OPTIONS", /* "ALPHA" */],
    []
  );
  const activeTabIndex = useMemo(() => Math.max(0, TAB_KEYS.indexOf(activeTab)), [TAB_KEYS, activeTab]);
  const prevTabIndexRef = useRef(activeTabIndex);

  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);


  useEffect(() => {
    if (route?.params?.tab) {
      const t = route.params.tab;
      if (["Favorites", "Spot", "Cryptos", "USD_M_FUTURES", /* "COIN_M_FUTURES", */ "OPTIONS", /* "ALPHA" */].includes(t)) setActiveTab(t);
      else if (t === "Favourite") setActiveTab("Favorites");
      else if (t === "Futures") setActiveTab("USD_M_FUTURES");
      // else if (t === "Alpha") setActiveTab("ALPHA");
    }
  }, [route?.params?.tab]);

  useEffect(() => {
    if (isLoggedIn) dispatch(getFavoriteArray());
  }, [isLoggedIn, dispatch]);

  // Subscribe to market data only when Market screen is focused
  useEffect(() => {
    if (isFocused) {
      if (subscribeToMarket) subscribeToMarket("market");
    } else {
      if (unsubscribeFromMarket) unsubscribeFromMarket("market");
    }
  }, [isFocused, subscribeToMarket, unsubscribeFromMarket]);

  // Fallback: if market:update didn't send futures_pairs, request from futures socket (same as Futures trading screen)
  useEffect(() => {
    if (activeTab !== "USD_M_FUTURES" || (futuresPairs && futuresPairs.length > 0)) return;

    futureSocketService.connect();
    const payload = { message: "futures", userId: userData?._id ?? "" };

    const requestFutures = () => {
      futureSocketService.emit("message", payload);
    };
    if (futureSocketService.getIsConnected()) {
      requestFutures();
    } else {
      futureSocketService.onConnect(requestFutures);
    }

    const handleMessage = (data) => {
      const list = data?.pairs ?? data?.futures_pairs ?? data?.futuresPairs;
      if (Array.isArray(list) && list.length > 0) {
        dispatch(setFuturesPairs(list));
      }
    };
    futureSocketService.on("message", handleMessage);

    return () => {
      futureSocketService.off("message", handleMessage);
      futureSocketService.offConnect(requestFutures);
    };
  }, [activeTab, dispatch, userData?._id, futuresPairs?.length]);

  const showSearch = true;

  const showSubTabs = activeTab === "Spot" || activeTab === "Cryptos" || activeTab === "ALPHA";

  const alphaSubTabs = useMemo(
    () => [
      { key: "ALL_CHAIN", label: "All Chain" },
      { key: "PUMP", label: "Pump" },
      { key: "TOP_SEARCHES", label: "Top Searches" },
      { key: "NEW", label: "New" },
      { key: "THEMES", label: "Themes" },
    ],
    []
  );

  const spotSubCategories = useMemo(() => {
    const list = Array.isArray(coinPairs) ? coinPairs : [];
    if (!list.length) return [];
    const s = new Set();
    for (const p of list) {
      const sc = p?.sub_category;
      if (sc != null && String(sc).trim() !== "") s.add(String(sc).trim());
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [coinPairs]);

  useEffect(() => {
    if (spotSubCategory !== "All" && !spotSubCategories.includes(spotSubCategory)) {
      setSpotSubCategory("All");
    }
  }, [spotSubCategory, spotSubCategories]);

  const [carouselIndex, setCarouselIndex] = useState(0);
  const [initialLoaded, setInitialLoaded] = useState(false);

  useEffect(() => {
    if (coinPairs && coinPairs.length > 0) {
      setInitialLoaded(true);
    }
  }, [coinPairs]);

  const hasMarketData = (coinPairs?.length ?? 0) > 0;
  const contentLoading = !initialLoaded;

  // Preferred coins only: BTC, ETH, BNB (3 cards)
  const featuredCoins = useMemo(() => {
    if (!coinPairs || coinPairs.length === 0) return [];
    const preferred = ["BTC", "ETH", "BNB"];
    const out = [];
    for (const sym of preferred) {
      const found = coinPairs.find(
        (p) => p?.base_currency?.toUpperCase() === sym && p?.quote_currency?.toUpperCase() === "USDT"
      );
      if (found) {
        out.push({
          ...found,
          chart_data: hotPairsChart[sym] ?? [],
        });
      }
    }
    return out;
  }, [coinPairs, hotPairsChart]);

  const handleToggleFavorite = (id) => {
    if (!userData) {
      showError("Please login first to add favorites");
      NavigationService.navigate(NAVIGATION_AUTH_STACK, { screen: LOGIN_SCREEN });
      return;
    }
    dispatch(addToFavorites({ pair_id: id }));
  };



  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background }}>
      <MarketHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        search={search}
        onSearchChange={setSearch}
        showSearch={showSearch}
        showSubTabs={showSubTabs}
        subTabItems={activeTab === "ALPHA" ? alphaSubTabs : undefined}
        subCategories={activeTab === "ALPHA" ? [] : spotSubCategories}
        activeSubCategory={activeTab === "ALPHA" ? alphaSubTab : spotSubCategory}
        onSubCategoryChange={activeTab === "ALPHA" ? setAlphaSubTab : setSpotSubCategory}
      />
      <View style={{ flex: 1 }}>
        {activeTab === "OPTIONS" ? (
          <View style={styles.tabContent}>
            <OptionsMarket search={search} isActive={isFocused} />
          </View>
        ) : contentLoading ? (
          <MarketSkeleton />
        ) : (
          <>
            <View style={{ flex: 1 }}>
              {activeTab === "Favorites" && (
                <View style={styles.tabContent}>
                  {!initialLoaded ? (
                    <TabListSkeleton rows={7} />
                  ) : !userData ? (
                    <View style={styles.emptyContainer}>
                      <FastImage
                        source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT}
                        style={styles.emptyIcon}
                        resizeMode="contain"
                      />
                      <AppText style={[styles.emptyText, { color: themeColors.secondaryText }]}>
                        Log in to view and manage your favorites.
                      </AppText>
                      <Button
                        children="Log In / Sign Up"
                        containerStyle={styles.emptyBtn}
                        onPress={() => NavigationService.navigate(NAVIGATION_AUTH_STACK, { screen: LOGIN_SCREEN })}
                      />
                    </View>
                  ) : favoriteArray?.length > 0 ? (
                    <MarketList
                      filterData={coinPairs.filter(p => favoriteArray.includes(p._id))}
                      onPress={(item) => NavigationService.navigate(TRADE_SCREEN, { coinDetail: item })}
                      onToggleFavorite={handleToggleFavorite}
                      favoriteArray={favoriteArray}
                      hideStar={false}
                    />
                  ) : (
                    <Favourites
                      coinPairs={coinPairs}
                      onPress={(item) => NavigationService.navigate(TRADE_SCREEN, { coinDetail: item })}
                      from="home"
                    />
                  )}
                </View>
              )}
              {activeTab === "Spot" && (
                <View style={styles.tabContent}>
                  {!initialLoaded ? <TabListSkeleton rows={8} /> : <SpotMarket coinPairs={coinPairs} search={search} subCategory={spotSubCategory} hideStar={false} favoriteArray={favoriteArray} onToggleFavorite={handleToggleFavorite} />}
                </View>
              )}
              {activeTab === "Cryptos" && (
                <View style={styles.tabContent}>
                  {!initialLoaded ? <TabListSkeleton rows={8} /> : <CryptosMarket coinPairs={coinPairs} search={search} subCategory={spotSubCategory} hideStar={false} favoriteArray={favoriteArray} onToggleFavorite={handleToggleFavorite} />}
                </View>
              )}
              {activeTab === "USD_M_FUTURES" && (
                <View style={styles.tabContent}>
                  {futuresPairs.length === 0 ? (
                    <MarketPlaceholder message="No futures data at the moment." />
                  ) : (
                    <FuturesMarket search={search} />
                  )}
                </View>
              )}

              {/* {activeTab === "COIN_M_FUTURES" && (
                <View style={styles.tabContent}>
                  <MarketPlaceholder message="COIN-M futures markets are not available yet." />
                </View>
              )} */}

              {/* {activeTab === "ALPHA" && (
                <View style={styles.tabContent}>
                  {!initialLoaded ? <TabListSkeleton rows={8} /> : <AlphaMarket coinPairs={coinPairs} search={search} hideStar={false} favoriteArray={favoriteArray} onToggleFavorite={(id) => dispatch(addToFavorites({ pair_id: id }))} />}
                </View>
              )} */}
            </View>
          </>
        )}
      </View>
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  carouselWrap: {
    paddingHorizontal: SIDE_SPACE,
    marginTop: 10,
    marginBottom: 4,
  },
  carousel: { width: "100%" },
  cardWrapper: { marginHorizontal: 5 },
  dotContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: universalPaddingHorizontal,
    marginTop: 4,
    minHeight: 0,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  emptyBtn: {
    width: 170,
    height: 42,
  },
});

export default Market;
