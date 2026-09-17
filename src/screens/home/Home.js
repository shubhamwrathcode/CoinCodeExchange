import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import {
  AppSafeAreaView,
  AppText,
  BOLD,
  Button,
  DISCLAIMTEXT,
  EIGHTEEN,
  ELEVEN,
  FIFTEEN,
  FOURTEEN,
  Header,
  MEDIUM,
  SEMI_BOLD,
  SIXTEEN,
  TWELVE,
  TWENTY,
  TWENTY_FOUR,
  TWENTY_SIX,
  WHITE,
  YELLOW,
} from "../../shared";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  Linking,
  Alert,
  ImageBackground,
  View,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ScrollView,
  Platform,
  AppState,
} from "react-native";
import HomeSlider from "./HomeSlider";
import HomeSliderSkeleton from "./HomeSliderSkeleton";
import CoinSlider from "./CoinSlider";
import HomeMenuBar from "./HomeMenuBar";
import { commonStyles } from "../../theme/commonStyles";
import { authStyles } from "../auth/authStyles";
import CoinList from "./CoinList";
import CoinSliderSkeleton from "./CoinSliderSkeleton";
import CoinListSkeleton from "./CoinListSkeleton";
import {
  appBg,
  loginDarkBg,
  HomeBg,
  verificationImage,
  trade_btn,
  searchIcon,
  coinInActive,
  static_coin,
  static_coin1,
  static_coin2,
  eye_close_icon,
  eye_open_icon,
  verificationImageLight,
} from "../../helper/ImageAssets";
import {
  getBannerList,
  getCoinList,
  getFavoriteArray,
  getFavorites,
  getNotificationList,
} from "../../actions/homeActions";
import {
  getAdminBankDetails,
  getTradeHistory,
  getUserArbitrageWallet,
  getUserEarningWallet,
  getUserFuturesWallet,
  getUserMainWallet,
  getUserOptionsWallet,
  getUserSpotWallet,
  getUserSwapWallet,
  getUserWallet,
  getWalletHistory,
  getWalletType,
  getAllWalletsPortfolio,
} from "../../actions/walletActions";
import { getVersion } from "react-native-device-info";
import { setLoading } from "../../slices/authSlice";
import HeaderTop from "../../shared/components/HeaderTop";
import FastImage from "react-native-fast-image";
import { KYC_STATUS_SCREEN, SEARCH_SCREEN, WALLET_SCREEN, DEPOSIT_COIN_SCREEN, NAVIGATION_AUTH_STACK, LOGIN_SCREEN } from "../../navigation/routes";
import NavigationService from "../../navigation/NavigationService";
import { colors, darkTheme, lightTheme } from "../../theme/colors";
import { SocketContext } from "../../SocketProvider";
import { showError } from "../../helper/logger";
import { appOperation } from "../../appOperation";
import DepositChoiceSheet from "../wallet/sheets/DepositChoiceSheet";
import { useTheme } from "../../hooks/useTheme";

const Home = () => {
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const theme = useAppSelector((state) => state.auth.theme);
  const loading = useAppSelector((state) => state.auth.isLoading);
  const coinPairs = useAppSelector((state) => state.home.coinPairs);
  const userData = useAppSelector((state) => state.auth.userData);
  const { kycVerified } = userData ?? "";
  const [CheckCurrent, setCheckCurrent] = useState(getVersion());
  const [showBalance, setShowBalance] = useState(true);

  const depositChoiceSheetRef = useRef(null);
  const walletBalance = useAppSelector((state) => state.wallet.walletBalance);

  const formatEstimateHeader = useCallback((value, decimals = 2) => {
    if (value === undefined || value === null || value === "") return "—";
    const num = Number(value);
    if (!Number.isFinite(num)) return "—";
    return String(parseFloat(num.toFixed(decimals)));
  }, []);

  const portfolioUsdtEstimate = useCallback((p) => {
    if (!p || typeof p !== "object") return undefined;
    return (
      p.estimated_total_usdt ??
      p.dollarPrice ??
      p.estimatedTotalUsdt ??
      p.estimated_total ??
      p.total_usdt
    );
  }, []);

  const portfolioPreferredCurrency = useCallback((p) => {
    if (!p || typeof p !== "object") return "USD";
    return (
      p.currency_prefrence ??
      p.currency_preference ??
      p.preferred_currency ??
      p.Currency ??
      "USD"
    );
  }, []);

  const portfolioPreferredAmount = useCallback((p) => {
    if (!p || typeof p !== "object") return undefined;
    const cur = portfolioPreferredCurrency(p);
    const byKey = cur && Object.prototype.hasOwnProperty.call(p, cur) ? p[cur] : undefined;
    const pref =
      p.estimated_total_preferred ??
      p.estimatedTotalPreferred ??
      p.currencyPrice ??
      byKey;
    return pref != null && pref !== "" ? pref : portfolioUsdtEstimate(p);
  }, [portfolioPreferredCurrency, portfolioUsdtEstimate]);

  const socketContextVars = useContext(SocketContext) || {};
  const { subscribeToMarket, unsubscribeFromMarket, socketHandlersReady } = socketContextVars;
  const isFocused = useIsFocused();

  const requestMarketData = useCallback(() => {
    if (subscribeToMarket) subscribeToMarket("home", true);
  }, [subscribeToMarket]);

  useEffect(() => {
    if (!socketHandlersReady || !isFocused) return undefined;
    requestMarketData();
    const timers = [50, 300, 800, 2000].map((ms) =>
      setTimeout(() => requestMarketData(), ms)
    );
    return () => timers.forEach(clearTimeout);
  }, [socketHandlersReady, requestMarketData, isFocused]);

  useFocusEffect(
    useCallback(() => {
      const isAuth = !!(
        (userData && (userData._id || userData.id || userData.emailId || userData.email || userData.token)) ||
        appOperation.customerToken
      );
      if (!isAuth) {
        showError("Please login first to access Home");
        NavigationService.navigate(NAVIGATION_AUTH_STACK, { screen: LOGIN_SCREEN });
        return undefined;
      }
      dispatch(setLoading(false));
      requestMarketData();
      const sliderTimer = setTimeout(() => setSliderReady(true), 300);
      return () => {
        clearTimeout(sliderTimer);
        if (unsubscribeFromMarket) unsubscribeFromMarket("home");
      };
    }, [userData, dispatch, requestMarketData, unsubscribeFromMarket])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && isFocused) {
        requestMarketData();
      }
    });
    return () => subscription.remove();
  }, [requestMarketData, isFocused]);

  const [sliderReady, setSliderReady] = useState(false);
  const hasMarketData = (coinPairs?.length ?? 0) > 0;
  const showCoinSkeleton = !hasMarketData;

  const fetchHomeData = useCallback(() => {
    dispatch(getCoinList());
    dispatch(getWalletType());
    dispatch(getUserWallet(""));
    dispatch(getUserMainWallet("main"));
    dispatch(getUserSpotWallet("spot"));
    dispatch(getUserSwapWallet("swap"));
    dispatch(getUserEarningWallet("earning"));
    dispatch(getUserArbitrageWallet("arbitrage"));
    dispatch(getUserFuturesWallet("futures"));
    dispatch(getUserOptionsWallet("options"));
    dispatch(getFavoriteArray());
    dispatch(getNotificationList());
    dispatch(getAllWalletsPortfolio({ useGlobalLoader: false }));
  }, [dispatch]);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    console.log("Pull to refresh triggered! Fetching latest home data...");
    setRefreshing(true);
    requestMarketData();
    fetchHomeData();
    setTimeout(() => {
      setRefreshing(false);
      console.log("Refresh Complete.");
    }, 1000);
  }, [fetchHomeData, requestMarketData]);

  // useEffect(() => {
  //   console.log(CheckCurrent,userData?.version, "version");
  //   if(CheckCurrent != userData?.version) {
  //     // InstallAPK();
  //   }
  // }, [userData?.version]);


  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background }}>
      <ScrollView
        style={[authStyles.mainContainer, commonStyles.zeroPadding]}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: Platform.OS === "ios" ? 24 : 36,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.text} />
        }
      >
        <View>
          <HeaderTop />
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => NavigationService.navigate(SEARCH_SCREEN)}
            style={[
              styles.homeSearchBar,
              {
                backgroundColor: isDark ? darkTheme.darkThemeInputColor : themeColors.input,
                borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
                borderColor: themeColors.border,
              },
            ]}
          >
            <FastImage
              source={searchIcon}
              style={styles.homeSearchIcon}
              resizeMode="contain"
              tintColor={themeColors.secondaryText}
            />
            <AppText
              numberOfLines={1}
              type={TWELVE}
              weight={MEDIUM}
              style={[styles.homeSearchPlaceholder, { color: themeColors.secondaryText }]}
            >
              🔥 Trade Smart. Grow Faster.
            </AppText>
          </TouchableOpacity>
          <View
            style={{
              marginTop: 12,
              paddingHorizontal: 20,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <AppText type={SIXTEEN} color={isDark ? colors.white : DISCLAIMTEXT}>Estimated Balance</AppText>
                <TouchableOpacity onPress={() => setShowBalance(!showBalance)}>
                  <FastImage
                    source={!showBalance ? eye_close_icon : eye_open_icon}
                    resizeMode="contain"
                    style={{ width: 16, height: 16 }}
                    tintColor={theme !== "Dark" ? colors.disclaimText : colors.white}
                  />
                </TouchableOpacity>
              </View>

              <View style={{ marginTop: 5 }}>
                <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
                  <AppText type={TWENTY_SIX} weight={SEMI_BOLD} color={isDark ? colors.white : themeColors.text} >
                    {!showBalance ? "****" : formatEstimateHeader(portfolioPreferredAmount(walletBalance), 5)}{" "}
                  </AppText>
                  <AppText type={FIFTEEN} color={isDark ? colors.white : DISCLAIMTEXT} style={{ top: 5 }}>
                    {portfolioPreferredCurrency(walletBalance)}
                  </AppText>
                </View>
                <View style={{ marginTop: 6 }}>
                  <AppText type={FOURTEEN} color={isDark ? colors.white : DISCLAIMTEXT}>
                    ≈ {!showBalance ? "****" : formatEstimateHeader(portfolioUsdtEstimate(walletBalance), 5)} USD
                  </AppText>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => depositChoiceSheetRef.current?.open?.()}
              style={{
                backgroundColor: isDark ? darkTheme.darkThemeInputColor : '#303236',
                paddingHorizontal: 20,
                paddingVertical: 8,
                borderRadius: 20,
              }}
            >
              <AppText weight={SEMI_BOLD} style={{ color: colors.white }}>Deposit</AppText>
            </TouchableOpacity>
          </View>
        </View>

        {(kycVerified === 0 || kycVerified === 3) && (
          <View
            style={{
              backgroundColor: isDark ? darkTheme.darkThemeInputColor : themeColors.input,
              marginHorizontal: 12,
              height: 188,
              padding: 10,
              borderRadius: 6,
              marginVertical: 10,
              borderWidth: 0.5,
              borderColor: themeColors.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginVertical: 10,
              }}
            >
              <FastImage
                source={isDark ? verificationImageLight : verificationImage}
                style={{ width: 104, height: 104 }}
                resizeMode="contain"
              />
              <View style={{ width: "70%", bottom: 20, marginLeft: 3 }}>
                <AppText style={{ color: themeColors.button }} type={EIGHTEEN} weight={SEMI_BOLD}>
                  Verification
                </AppText>
                <AppText style={{ color: themeColors.secondaryText }} type={TWELVE}>
                  Verify your identity to secure your
                  account and unlock deposit/trading
                  access.
                </AppText>
              </View>
            </View>
            <Button
              onPress={() => NavigationService.navigate(KYC_STATUS_SCREEN)}
              children="Verify Now"
              containerStyle={{ width: "90%", height: 44, alignSelf: "center", backgroundColor: themeColors.button }}
            />
          </View>
        )}

        <View style={{ right: 10 }}>
          <HomeMenuBar />
        </View>

        <View style={{ marginTop: 12 }}>
          {sliderReady ? <HomeSlider theme={theme} /> : <HomeSliderSkeleton />}
        </View>

        <View style={{ marginTop: 12 }}>
          {showCoinSkeleton ? <CoinSliderSkeleton /> : <CoinSlider />}
        </View>
        <View style={{ marginTop: 12 }}>
          {showCoinSkeleton ? <CoinListSkeleton /> : <CoinList />}
        </View>


      </ScrollView>

      {/* Deposit Choice Sheet */}
      <DepositChoiceSheet sheetRef={depositChoiceSheetRef} isDark={isDark} />
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  homeSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    minHeight: 40
  },
  homeSearchIcon: {
    width: 16,
    height: 16,
    marginRight: 10,
  },
  homeSearchPlaceholder: {
    flex: 1,
  },
});

export default Home;
