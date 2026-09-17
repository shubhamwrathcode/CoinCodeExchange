import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import FastImage from "react-native-fast-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AppSafeAreaView,
  AppText,
  BOLD,
  ELEVEN,
  FIFTEEN,
  FOURTEEN,
  MEDIUM,
  SEMI_BOLD,
  SIXTEEN,
  TEN,
  THIRTEEN,
  TWELVE,
  TWENTY,
} from "../../shared";
import {
  APP_LOGO,
  apple,
  back_ic,
  googleIcon,
  welcome_banner,
  NO_NOTIFICATION_ICON,
  NO_NOTIFICATION_ICON_LIGHT,
  APP_LOGO_Black,
  searchIcon,
  avatarIcon,
  homeIcon,
  marketIcon,
  tradeImg,
  futuresActiveIcon,
  wallet_ic,
} from "../../helper/ImageAssets";
import NavigationService from "../../navigation/NavigationService";
import {
  LOGIN_SCREEN,
  REGISTER_SCREEN,
  HOME_SCREEN,
  MARKET_SCREEN,
  TRADE_SCREEN,
  FUTURES_SCREEN,
  WALLET_SCREEN,
  NAVIGATION_BOTTOM_TAB_STACK,
} from "../../navigation/routes";
import { TabItem, customTabBarStyles } from "../../navigation/TabItem";
import { useTheme } from "../../hooks/useTheme";
import { colors, darkTheme, lightTheme } from "../../theme/colors";
import Toast from "react-native-simple-toast";
import { useAppSelector } from "../../store/hooks";
import { useDispatch } from "react-redux";
import { IMAGE_BASE_URL } from "../../helper/Constants";
import { setFuturesPairs } from "../../slices/homeSlice";
import { fontFamilyMedium, fontFamilyBold, fontFamilySemiBold } from "../../theme/typography";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import WebView from "react-native-webview";
import { CHART_WEB_BASE_URL } from "../../helper/Constants";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { prepareGoogleSignIn } from "../../helper/googleSignIn";
import { googleLogin } from "../../actions/authActions";
import { setLoading } from "../../slices/authSlice";
import { showError } from "../../helper/logger";
import { isAppleSignInCancelled, performAppleSignIn, buildAppleThirdPartyBody } from "../../helper/appleSignIn";

const formatVol = (vol) => {
  const n = Number(vol);
  if (!n || isNaN(n)) return "0";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return n.toFixed(2);
};

const formatPriceWithTick = (p, tickSize) => {
  const n = Number(p);
  if (!Number.isFinite(n)) return "";
  const t = Number(tickSize);
  if (Number.isFinite(t) && t > 0) {
    let decs = 0;
    const tsStr = String(t);
    if (tsStr.includes("e-")) {
      decs = parseInt(tsStr.split("e-")[1], 10);
    } else if (tsStr.includes(".")) {
      decs = tsStr.split(".")[1].length;
    }
    return n.toFixed(decs);
  }
  return n.toFixed(5); // fallback
};

const formatWithCommas = (val) => {
  if (val == null || val === "") return "";
  const str = String(val);
  if (!str.includes(".")) {
    return str.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  const [intPart, decPart] = str.split(".");
  let sign = "";
  let iPart = intPart;
  if (iPart.startsWith("-")) {
    sign = "-";
    iPart = iPart.slice(1);
  }
  const withSep = iPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${withSep}${decPart != null && decPart !== "" ? `.${decPart}` : ""}`;
};

const formatDisplayPrice = (p, tickSize) => {
  if (p == null || p === "") return "—";
  return formatWithCommas(formatPriceWithTick(p, tickSize));
};
import { SocketContext } from "../../SocketProvider";

const WELCOME_TABS = [
  { key: 1, label: "Trending" },
  { key: 2, label: "Spot" },
  { key: 3, label: "Futures" },
  { key: 4, label: "Hot" },
  { key: 5, label: "New Listing" },
  { key: 6, label: "Top Gainers" },
];

const C = {
  lightBg: "#FFFFFF",
  lightCard: "#FFFFFF",
  lightBorder: "#E8E8E8",
  lightText: "#1A1A1A",
  lightMuted: "#8E8E93",
  lightBtn: "#2D2D2D",
  lightGreen: "#34C759",
  lightLogoBg: "#EFE6DC",
  lightStripe: "rgba(0,0,0,0.04)",
};

const Welcome = () => {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const chartHeight = 400;
  const { colors: themeColors, isDark } = useTheme();
  const coinPairs = useAppSelector((state) => state.home.coinPairs);
  const futuresPairs = useAppSelector((state) => state.home.futuresPairs ?? []);
  const socketLoading = useAppSelector((state) => state.home.socketLoading);
  const dispatch = useDispatch();
  const socketContextVars = useContext(SocketContext) || {};
  const { subscribeToMarket, unsubscribeFromMarket } = socketContextVars;
  const [isGoogleSignInInProgress, setIsGoogleSignInInProgress] = useState(false);

  useEffect(() => {
    return () => {
      setIsGoogleSignInInProgress(false);
    };
  }, []);

  useEffect(() => {
    if (subscribeToMarket) subscribeToMarket("welcome");
  }, [subscribeToMarket]);

  useFocusEffect(
    useCallback(() => {
      if (subscribeToMarket) subscribeToMarket("welcome");
      return () => {
        if (unsubscribeFromMarket) unsubscribeFromMarket("welcome");
      };
    }, [subscribeToMarket, unsubscribeFromMarket])
  );
  /** CoinList parity: 1=Trending, 2=Spot, 3=Futures, 4=Hot, 5=New Listing, 6=Top Gainers (no Favorite). */
  const [activeTabList, setActiveTabList] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);
  const userData = useAppSelector((state) => state.auth?.userData);

  const normSym = useCallback((s) => String(s || "").trim().toUpperCase(), []);
  const toNum = useCallback((v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }, []);

  const pairVolumeNumber = useCallback(
    (p) => toNum(p?.volume_24h) || toNum(p?.volume) || toNum(p?.quote_volume) || 0,
    [toNum]
  );

  const pairListingTimeMs = useCallback((p) => {
    const dt = p?.createdAt || p?.created_at || p?.listing_time || p?.listedAt;
    const ms = dt ? Date.parse(dt) : NaN;
    if (Number.isFinite(ms)) return ms;
    const id = String(p?._id || p?.id || "");
    return id ? id.length : 0;
  }, []);

  const spotChangeNumber = useCallback((p) => toNum(p?.change_percentage ?? p?.changePercentage ?? p?.change), [toNum]);

  const HOT_BASE_ORDER = useMemo(() => ["BTC", "ETH", "BNB", "SOL", "XRP", "DOGE", "MATIC"], []);
  const pickPairForBase = useCallback(
    (pairs, base) => {
      const b = normSym(base);
      const usdt = pairs.find(
        (p) => normSym(p?.base_currency) === b && normSym(p?.quote_currency) === "USDT"
      );
      if (usdt) return usdt;
      return pairs.find((p) => normSym(p?.base_currency) === b);
    },
    [normSym]
  );

  const spotUsdtPairs = useMemo(() => {
    if (!coinPairs || coinPairs.length === 0) return [];
    const usdt = coinPairs.filter((p) => normSym(p?.quote_currency) === "USDT");
    return usdt.length ? usdt : coinPairs;
  }, [coinPairs, normSym]);

  const filterData = useMemo(() => {
    if (activeTabList === 3) {
      if (!futuresPairs || futuresPairs.length === 0) return [];
      return [...futuresPairs].sort((a, b) => pairVolumeNumber(b) - pairVolumeNumber(a));
    }

    if (!spotUsdtPairs || spotUsdtPairs.length === 0) return [];

    if (activeTabList === 1) { // Trending
      return [...spotUsdtPairs].sort((a, b) => pairVolumeNumber(b) - pairVolumeNumber(a));
    }
    if (activeTabList === 2) { // Spot
      return [...spotUsdtPairs];
    }
    if (activeTabList === 4) { // Hot
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
    if (activeTabList === 5) { // New Listing
      return [...spotUsdtPairs].sort((a, b) => pairListingTimeMs(b) - pairListingTimeMs(a));
    }
    if (activeTabList === 6) { // Top Gainers
      return [...spotUsdtPairs].sort((a, b) => spotChangeNumber(b) - spotChangeNumber(a));
    }
    return [...spotUsdtPairs];
  }, [
    spotUsdtPairs,
    futuresPairs,
    activeTabList,
    pairVolumeNumber,
    HOT_BASE_ORDER,
    pickPairForBase,
    pairListingTimeMs,
    spotChangeNumber,
  ]);

  const sixItems = useMemo(
    () => (Array.isArray(filterData) ? filterData.slice(0, 6) : []),
    [filterData]
  );

  const palette = useMemo(
    () => ({
      bg: isDark ? themeColors.background : C.lightBg,
      card: isDark ? themeColors.card : C.lightCard,
      border: isDark ? themeColors.border : C.lightBorder,
      text: isDark ? themeColors.text : C.lightText,
      muted: isDark ? themeColors.secondaryText : C.lightMuted,
      btn: isDark ? themeColors.button : C.lightBtn,
      btnText: isDark ? themeColors.buttonText : "#FFFFFF",
      green: C.lightGreen,
      logoBg: isDark ? themeColors.themeElevationColor : C.lightLogoBg,
      stripe: isDark ? "rgba(255,255,255,0.06)" : C.lightStripe,
    }),
    [isDark, themeColors]
  );

  const onLogin = useCallback(() => {
    NavigationService.navigate(LOGIN_SCREEN);
  }, []);

  const onRowPress = useCallback((idx, isFutures) => {
    if (isFutures) {
      onLogin();
    } else {
      setExpandedRow(prev => (prev === idx ? null : idx));
    }
  }, [onLogin]);



  const onRegister = useCallback(() => {
    NavigationService.navigate(REGISTER_SCREEN);
  }, []);

  const onGoogle = async () => {
    if (isGoogleSignInInProgress) return;
    try {
      console.log("Starting Google Sign-In...");
      setIsGoogleSignInInProgress(true);
      dispatch(setLoading(true));

      await prepareGoogleSignIn();
      const account = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();

      let data = {
        Token: tokens?.accessToken || tokens?.idToken || account?.data?.idToken,
        type: 'google',
      };

      dispatch(googleLogin(data));
    } catch (error) {
      console.warn("Google Sign In Error:", error?.code, error?.message, error);
      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string" &&
        error.message.includes("User cancelled flow")
      ) {
        showError("Google Sign-In was cancelled");
      } else if (error?.message && error.message.includes("Network error")) {
        showError("Network error. Please check your internet connection.");
      } else if (error?.message && error.message.includes("Invalid client")) {
        showError("Google Sign-In configuration error. Please contact support.");
      } else if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
        showError("Google Sign-In was cancelled");
      } else if (error?.code === statusCodes.IN_PROGRESS) {
        showError("Google Sign-In already in progress");
      } else if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        showError("Google Play Services not available or outdated");
      } else {
        const fallbackMessage =
          (typeof error === "string" && error) ||
          error?.message ||
          error?.error ||
          error?.error_description ||
          "Google Sign-In failed. Please try again.";
        showError(fallbackMessage);
      }
    } finally {
      setIsGoogleSignInInProgress(false);
      dispatch(setLoading(false));
    }
  };

  const onApple = async () => {
    try {
      dispatch(setLoading(true));
      const apple = await performAppleSignIn();
      const data = buildAppleThirdPartyBody(apple);
      console.log("[Welcome] Apple third-party-login payload", {
        type: data.type,
        codeLength: data.code?.length,
        tokenLength: data.Token?.length,
      });
      dispatch(googleLogin(data));
    } catch (error) {
      console.warn("[Welcome] Apple Sign-In Error:", error?.code, error?.message, error);
      if (isAppleSignInCancelled(error)) {
        showError("Apple Sign-In was cancelled");
        return;
      }
      showError(error?.message || "Apple Sign-In failed. Please try again.");
    } finally {
      dispatch(setLoading(false));
    }
  };

  const footerPad = Math.max(insets.bottom, 12);

  return (
    <AppSafeAreaView style={[styles.root, { backgroundColor: palette.bg }]}>
      <View style={styles.flex}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: footerPad + 76 }]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header */}
          <View style={[styles.header, { paddingTop: 8 }]}>
            <View style={[styles.logoCircle,]}>
              <FastImage source={isDark ? APP_LOGO : APP_LOGO_Black} style={styles.logoImg}
                resizeMode="contain" />
            </View>
            <TouchableOpacity onPress={onLogin} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: palette.text }}>
                Log In
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Banner */}
          <View
            style={[
              styles.banner,
              {
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.1)",
                backgroundColor: "#111214",
                marginBottom: 16,
              },
            ]}
          >
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 180,
                height: 200,
                overflow: "hidden",
                borderTopLeftRadius: 20,
              }}
            >
              <Svg height="100%" width="100%">
                <Defs>
                  <RadialGradient id="glow" cx="0%" cy="0%" rx="100%" ry="100%">
                    <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
                    <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#glow)" />
              </Svg>
            </View>
            <View style={styles.bannerLeft}>
              <AppText
                type={TWELVE}
                weight={MEDIUM}
                style={{ color: colors.cyan, fontFamily: fontFamilyMedium }}
              >
                Trade 400+
              </AppText>
              <AppText
                weight={BOLD}
                style={{
                  color: colors.white,
                  fontSize: 25,
                  marginTop: 8,
                  fontFamily: fontFamilyBold,
                  lineHeight: 30,
                }}
              >
                Global
              </AppText>
              <AppText
                weight={BOLD}
                style={{
                  color: colors.cyan,
                  fontSize: 25,
                  fontFamily: fontFamilyBold,
                  lineHeight: 30,
                }}
              >
                Assets
              </AppText>
              <AppText
                type={TWELVE}
                style={{
                  color: colors.darkShadeColorText,
                  marginTop: 5,
                  lineHeight: 18,
                }}
              >
                Buy, sell and explore top{"\n"}crypto assets worldwide.
              </AppText>
              <TouchableOpacity
                style={styles.bannerBtn}
                onPress={onLogin}
                activeOpacity={0.85}
              >
                <AppText
                  type={THIRTEEN}
                  weight={SEMI_BOLD}
                  style={{ color: colors.white, fontFamily: fontFamilySemiBold, fontSize: 13 }}
                >
                  Log In to Trade
                </AppText>
              </TouchableOpacity>
            </View>
            <FastImage
              source={welcome_banner}
              style={styles.bannerImg}
              resizeMode={FastImage.resizeMode.contain}
            />
          </View>

          {/* Market Card Container */}
          <View style={styles.listCard}>
            {/* Tabs */}
            <View style={styles.tabsWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabRow}
                style={styles.tabsScroll}
              >
                {WELCOME_TABS.map((t) => {
                  const active = activeTabList === t.key;
                  return (
                    <TouchableOpacity
                      key={String(t.key)}
                      style={styles.tabPill}
                      onPress={() => {
                        setActiveTabList(t.key);
                        setExpandedRow(null);
                      }}
                      activeOpacity={0.8}
                    >
                      <AppText
                        weight={SEMI_BOLD}
                        type={FIFTEEN}
                        style={{
                          color: active ? "#FFFFFF" : "#6A7282",
                          fontFamily: active ? fontFamilyBold : fontFamilyMedium,
                        }}
                      >
                        {t.label}
                      </AppText>
                      {active && (
                        <View style={styles.tabIndicator} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Market list */}
            <View style={styles.listWrap}>
              {sixItems.length > 0
                ? sixItems.map((item, idx) => {
                  const isFutures = activeTabList === 3;
                  const sym = isFutures ? String(item?.base_asset || item?.base_currency || "").toUpperCase() : String(item?.base_currency || "").toUpperCase();
                  const q = isFutures ? (item?.margin_asset || "USDT") : (normSym(item?.quote_currency) || "USDT");
                  const fullSymbol = `${sym}${q}`;
                  const name = isFutures ? "Perpetual" : (item?.base_currency_name || item?.base_currency || "—");
                  const last = item?.buy_price ?? item?.last_price ?? item?.price ?? 0;
                  const sub = item?.sell_price ?? item?.usd_price ?? item?.usdt_price ?? last;
                  const chg = Number(item?.change_percentage ?? item?.changePercentage ?? item?.change) || 0;
                  const isUp = chg >= 0;
                  const chgText = `${Math.abs(chg).toFixed(2)}%`;
                  const formattedPrice = formatDisplayPrice(last, item?.tick_size);
                  const formattedSub = formatDisplayPrice(sub, item?.tick_size);
                  return (
                    <View key={`wrap-${idx}`}>
                      <TouchableOpacity
                        key={`live-${activeTabList}-${sym}-${idx}`}
                        style={[styles.row, expandedRow === idx && activeTabList !== 3 ? { borderBottomWidth: 0, paddingBottom: 8 } : {}]}
                        onPress={() => onRowPress(idx, isFutures)}
                        activeOpacity={0.85}
                      >
                        <View style={styles.colSymbol}>
                          <View style={styles.iconCircle}>
                            {item?.icon_path ? (
                              <FastImage
                                source={{ uri: item.icon_path }}
                                resizeMode="contain"
                                style={styles.coinImg}
                              />
                            ) : (
                              <View style={styles.coinFallback}>
                                <AppText style={styles.coinInitial} weight={BOLD}>
                                  {sym.slice(0, 1) || "•"}
                                </AppText>
                              </View>
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <AppText weight={SEMI_BOLD} style={styles.coinName} numberOfLines={1}>
                              {fullSymbol}
                            </AppText>
                            <AppText style={styles.coinSym} numberOfLines={1}>
                              {name}
                            </AppText>
                          </View>
                        </View>
                        <View style={styles.priceCol}>
                          <AppText weight={SEMI_BOLD} style={styles.priceMain} numberOfLines={1}>
                            {formattedPrice}
                          </AppText>
                          <AppText style={styles.priceSub} numberOfLines={1}>
                            ${formattedSub}
                          </AppText>
                        </View>
                        <View style={styles.changeCol}>
                          <View style={[styles.changePillCoin, { backgroundColor: isUp ? colors.green : colors.red }]}>
                            <AppText style={styles.changeText} weight={SEMI_BOLD} numberOfLines={1}>
                              {isUp ? "+" : "-"}{chgText}
                            </AppText>
                          </View>
                        </View>
                      </TouchableOpacity>

                      {expandedRow === idx && !isFutures && (
                        <View style={styles.expandedContainer}>
                          <View style={styles.expandedActionsRow}>
                            <TouchableOpacity
                              style={styles.expandedActionBtn}
                              onPress={() => NavigationService.navigate(NAVIGATION_BOTTOM_TAB_STACK, { screen: TRADE_SCREEN, params: { coinDetail: item } })}
                              activeOpacity={0.8}
                            >
                              <AppText type={TWELVE} weight={SEMI_BOLD} style={styles.expandedActionText}>Trade</AppText>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.expandedActionBtn}
                              onPress={() => {
                                const fPair = futuresPairs?.find(p => p.base_currency === item.base_currency);
                                NavigationService.navigate(NAVIGATION_BOTTOM_TAB_STACK, {
                                  screen: FUTURES_SCREEN,
                                  params: {
                                    screen: 'Futures',
                                    ...(fPair ? { params: { coin: fPair } } : {})
                                  }
                                });
                              }}
                              activeOpacity={0.8}
                            >
                              <AppText type={TWELVE} weight={SEMI_BOLD} style={styles.expandedActionText}>Futures</AppText>
                            </TouchableOpacity>
                          </View>

                          <View style={styles.statsRow}>
                            <View style={{ flex: 1 }}>
                              <AppText type={TEN} style={styles.statLabel}>24h High</AppText>
                              <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: '#06C168' }}>{item?.high ? formatDisplayPrice(item.high, item.tick_size) : "—"}</AppText>
                            </View>
                            <View style={{ flex: 1, alignItems: 'center' }}>
                              <AppText type={TEN} style={styles.statLabel}>24h Low</AppText>
                              <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: '#F6465D' }}>{item?.low ? formatDisplayPrice(item.low, item.tick_size) : "—"}</AppText>
                            </View>
                            <View style={{ flex: 1, alignItems: 'flex-end' }}>
                              <AppText type={TEN} style={styles.statLabel}>24h Vol</AppText>
                              <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: '#FFFFFF' }}>{item?.volume ? formatVol(item.volume) : "—"}</AppText>
                            </View>
                          </View>

                          {/* Grid Row 2: 24h Change, 24h Open, Vol(Quote) */}
                          <View style={styles.statsRow}>
                            <View style={{ flex: 1 }}>
                              <AppText type={TEN} style={styles.statLabel}>24h Change</AppText>
                              <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: isUp ? '#06C168' : '#F6465D' }}>{isUp ? '+' : '-'}{chgText}</AppText>
                            </View>
                            <View style={{ flex: 1, alignItems: 'center' }}>
                              <AppText type={TEN} style={styles.statLabel}>24h Open</AppText>
                              <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: '#FFFFFF' }}>{item?.open ? formatDisplayPrice(item.open, item.tick_size) : "—"}</AppText>
                            </View>
                            <View style={{ flex: 1, alignItems: 'flex-end' }}>
                              <AppText type={TEN} style={styles.statLabel}>Vol ({q})</AppText>
                              <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: '#FFFFFF' }}>{item?.volumeQuote || item?.quote_volume ? formatVol(item?.volumeQuote || item?.quote_volume) : "—"}</AppText>
                            </View>
                          </View>

                          {/* Chart WebView */}
                          <View style={styles.chartContainer}>
                            <WebView
                              key={`${CHART_WEB_BASE_URL}chart/dark/${sym}_${q}`}
                              source={{ uri: `${CHART_WEB_BASE_URL}chart/dark/${sym}_${q}` }}
                              style={styles.chartWebView}
                              containerStyle={{ backgroundColor: "#000000" }}
                              opaque={false}
                              androidLayerType="hardware"
                              cacheEnabled
                              cacheMode="LOAD_CACHE_ELSE_NETWORK"
                              mixedContentMode="compatibility"
                              allowsInlineMediaPlayback
                              mediaPlaybackRequiresUserAction={false}
                              javaScriptEnabled
                              domStorageEnabled
                              scrollEnabled={false}
                              showsHorizontalScrollIndicator={false}
                              showsVerticalScrollIndicator={false}
                              bounces={false}
                              sharedCookiesEnabled
                              javaScriptEnabledAndroid
                              scalesPageToFit={false}
                              automaticallyAdjustContentInsets={false}
                              setSupportMultipleWindows={false}
                              overScrollMode="never"
                              startInLoadingState={true}
                              renderLoading={() => (
                                <View style={styles.chartLoading}>
                                  <ActivityIndicator size="small" color="#0AA8C5" />
                                </View>
                              )}
                            />
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
                : (
                  <View style={styles.marketEmpty}>
                    {socketLoading ? (
                      <AppText style={[styles.coinSym, { color: "#6A7282", textAlign: "center" }]}>
                        Loading markets…
                      </AppText>
                    ) : (
                      <View style={{ alignItems: "center", justifyContent: "center" }}>
                        <FastImage
                          source={NO_NOTIFICATION_ICON}
                          resizeMode="contain"
                          style={{ width: 80, height: 80, marginBottom: 8 }}
                        />
                        <AppText style={[styles.coinSym, { color: "#6A7282", textAlign: "center", fontFamily: fontFamilyMedium }]}>
                          No market data available.
                        </AppText>
                      </View>
                    )}
                  </View>
                )}
            </View>

            {/* View More Footer */}
            <TouchableOpacity
              style={styles.footerLink}
              onPress={() => NavigationService.navigate(NAVIGATION_BOTTOM_TAB_STACK, { screen: MARKET_SCREEN })}
              activeOpacity={0.7}
            >
              <AppText style={styles.viewMoreText}>
                View More &gt;
              </AppText>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Custom Bottom Tab Bar from Navigator */}
        <View
          style={[
            customTabBarStyles.container,
            {
              backgroundColor: isDark ? colors.lightBlackLatest : "rgba(255, 255, 255, 0.95)",
              borderTopColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#E5E7EB",
            },
          ]}
        >
          <View style={customTabBarStyles.scrollContent}>
            {[
              {
                routeName: HOME_SCREEN,
                label: "Home",
                icon: homeIcon,
                isFocused: true,
                onPress: () => { },
              },
              {
                routeName: MARKET_SCREEN,
                label: "Market",
                icon: marketIcon,
                isFocused: false,
                onPress: () =>
                  NavigationService.navigate(NAVIGATION_BOTTOM_TAB_STACK, {
                    screen: MARKET_SCREEN,
                  }),
              },
              {
                routeName: TRADE_SCREEN,
                label: "Trade",
                icon: tradeImg,
                isFocused: false,
                onPress: () =>
                  NavigationService.navigate(NAVIGATION_BOTTOM_TAB_STACK, {
                    screen: TRADE_SCREEN,
                  }),
              },
              {
                routeName: FUTURES_SCREEN,
                label: "Future",
                icon: futuresActiveIcon,
                isFocused: false,
                onPress: () =>
                  NavigationService.navigate(NAVIGATION_BOTTOM_TAB_STACK, {
                    screen: FUTURES_SCREEN,
                  }),
              },
              {
                routeName: WALLET_SCREEN,
                label: "Wallet",
                icon: wallet_ic,
                isFocused: false,
                onPress: () =>
                  NavigationService.navigate(NAVIGATION_BOTTOM_TAB_STACK, {
                    screen: WALLET_SCREEN,
                  }),
              },
            ].map((tab) => (
              <TabItem
                key={tab.routeName}
                isFocused={tab.isFocused}
                routeName={tab.routeName}
                onPress={tab.onPress}
                onLongPress={tab.onPress}
                icon={tab.icon}
                label={tab.label}
                themeColors={themeColors}
                isDark={isDark}
              />
            ))}
          </View>
        </View>
      </View>
    </AppSafeAreaView>
  );
};

export default Welcome;

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImg: { width: 30, height: 30 },
  banner: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 20,
    minHeight: 200,
    overflow: "hidden",
    backgroundColor: "#111214",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 16,
    position: "relative",
  },
  bannerLeft: {
    flex: 1,
    zIndex: 2,
  },
  bannerBtn: {
    width: 140,
    height: 40,
    marginTop: 12,
    borderRadius: 100,
    backgroundColor: colors.cyan,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerImg: {
    width: 195,
    height: 250,
    position: "absolute",
    right: 0,
    bottom: -35,
  },
  listCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: colors.lightBlackLatest,
    overflow: "hidden",
    marginBottom: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  tabsWrapper: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tabsScroll: {},
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  tabPill: {
    position: "relative",
    paddingBottom: 8,
  },
  tabIndicator: {
    height: 2.5,
    borderRadius: 2,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0AA8C5",
  },
  listWrap: {
    paddingTop: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  colSymbol: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1.2,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 10,
  },
  coinImg: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  coinFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1F2228",
    alignItems: "center",
    justifyContent: "center",
  },
  coinInitial: {
    color: "#FFFFFF",
    fontSize: 13,
  },
  coinName: {
    color: "#FFFFFF",
    fontSize: 13,
    marginBottom: 2,
    fontFamily: fontFamilySemiBold,
  },
  coinSym: {
    color: "#6A7282",
    fontSize: 11,
    fontFamily: fontFamilyMedium,
  },
  priceCol: {
    flex: 1,
    alignItems: "flex-end",
    paddingRight: 14,
  },
  priceMain: {
    color: "#FFFFFF",
    fontSize: 13,
    marginBottom: 2,
    fontFamily: fontFamilySemiBold,
  },
  priceSub: {
    color: "#6A7282",
    fontSize: 11,
    fontFamily: fontFamilyMedium,
  },
  changeCol: {
    alignItems: "flex-end",
    width: 72,
  },
  changePillCoin: {
    borderRadius: 6,
    width: 68,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  changeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: fontFamilyBold,
  },
  footerLink: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  viewMoreText: {
    color: "#0AA8C5",
    fontSize: 13,
    fontFamily: fontFamilyMedium,
  },
  expandedContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#08090B",
  },
  expandedActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
    marginTop: 8,
  },
  expandedActionBtn: {
    flex: 1,
    paddingVertical: 7,
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  expandedActionText: {
    color: "#000000",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statLabel: {
    color: "#6A7282",
    marginBottom: 4,
  },
  chartContainer: {
    height: 380,
    backgroundColor: "#000000",
    overflow: "hidden",
    borderRadius: 12,
  },
  chartWebView: {
    width: "100%",
    height: 400,
    backgroundColor: "#000000",
  },
  chartLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  marketEmpty: {
    paddingVertical: 28,
    paddingHorizontal: 12,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  signUpBtn: {
    flex: 1,
    height: 42,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  socialBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  socialIcon: { width: 19, height: 19 },
});
