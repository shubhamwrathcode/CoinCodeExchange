import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Platform,
  ActivityIndicator,
  Animated,

  Dimensions,
} from "react-native";
import FastImage from "react-native-fast-image";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useRoute, useNavigation } from "@react-navigation/native";

import { AppText, SEMI_BOLD, Button, MEDIUM } from "../../shared";
import { colors, darkTheme, lightTheme } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";
import {
  back_ic,
  bitcoin_ic,
  checkIc,
  downIcon,
  historyIcon,
  transferNew,
  REMOVE,
  marginIc,
  p2p_ic,
  fiat_ic,
  onchain_ic,
  deliveryFuture,
  tradeFi,
  usdtPerp,
  btcPerp,
  optionIc,
  add
} from "../../helper/ImageAssets";
import SimpleToast from "react-native-simple-toast";
import { fontFamilyMedium } from "../../theme/typography";
import RBSheet from "react-native-raw-bottom-sheet";
import { appOperation } from "../../appOperation";
import { MARGIN_BORROW_REPAY_HISTORY_SCREEN } from "../../navigation/routes";
import { MARGIN_TRANSFER_HISTORY_SCREEN, TRANSFER_HISTORY_SCREEN } from "../../navigation/routes";
import { IMAGE_BASE_URL } from "../../helper/Constants";
import LinearGradient from "react-native-linear-gradient";

const SHIMMER_STRIP = 160;
function ShimmerCell({ width: w, height, borderRadius = 6, style }) {
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
      }).start(({ finished }) => {
        if (mounted.current && finished) run();
      });
    };
    const t = setTimeout(run, 50);
    return () => {
      mounted.current = false;
      clearTimeout(t);
      shimmerX.stopAnimation();
    };
  }, [shimmerX, w]);
  const { isDark } = useTheme();
  const boneColor = isDark ? "#2A2A2A" : "#E1E9EE";
  const shimmerColors = isDark
    ? ["transparent", "rgba(255,255,255,0.08)", "transparent"]
    : ["transparent", "rgba(255,255,255,0.6)", "transparent"];

  return (
    <View
      style={[
        { width: w, height, borderRadius, overflow: "hidden", backgroundColor: boneColor },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: SHIMMER_STRIP,
          transform: [{ translateX: shimmerX }],
        }}
      >
        <LinearGradient
          colors={shimmerColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, width: SHIMMER_STRIP }}
        />
      </Animated.View>
    </View>
  );
}

function MarginTransferSkeleton() {
  const { isDark } = useTheme();
  const screenWidth = Dimensions.get("window").width;
  const cardWidth = (screenWidth - 40 - 36) / 2;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <ShimmerCell width={cardWidth} height={80} borderRadius={12} />
        <ShimmerCell width={36} height={36} borderRadius={18} />
        <ShimmerCell width={cardWidth} height={80} borderRadius={12} />
      </View>

      <ShimmerCell width={80} height={14} borderRadius={4} style={{ marginBottom: 10 }} />
      <ShimmerCell width={screenWidth - 40} height={52} borderRadius={10} style={{ marginBottom: 16 }} />

      <ShimmerCell width={80} height={14} borderRadius={4} style={{ marginBottom: 10 }} />
      <ShimmerCell width={screenWidth - 40} height={52} borderRadius={10} style={{ marginBottom: 10 }} />

      <ShimmerCell width={120} height={12} borderRadius={4} />
    </View>
  );
}

const WALLET_ICONS = {
  main: tradeFi,
  spot: onchain_ic,
  p2p: p2p_ic,
  futures: deliveryFuture,
  swap: fiat_ic,
  earning: btcPerp,
  margin: marginIc,
  cross_margin: usdtPerp,
  options: optionIc,
  option: optionIc,
  Options: optionIc,
  options_wallet: optionIc,
  option_wallet: optionIc,
};

const MarginTransfer = () => {
  const { colors: themeColors, isDark } = useTheme();
  const inputBgColor = isDark ? darkTheme.darkThemeInputColor : "#F2F2F7";
  const route = useRoute();
  const navigation = useNavigation();

  const [fromWalletType, setFromWalletType] = useState(route?.params?.fromWalletType || "spot");
  const [toWalletType, setToWalletType] = useState(route?.params?.toWalletType || "main");

  const [transferAmount, setTransferAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isScreenLoading, setIsScreenLoading] = useState(true);

  const [transferableBalance, setTransferableBalance] = useState("0.00");

  const buildCoinIconUri = useCallback((iconPath) => {
    const raw = iconPath === undefined || iconPath === null ? "" : String(iconPath).trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    const base = String(IMAGE_BASE_URL || "").replace(/\/+$/, "");
    const path = raw.startsWith("/") ? raw : `/${raw}`;
    return `${base}${path}`;
  }, []);

  // Coins / Pairs State
  const [currencyData, setCurrencyData] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [coinSearch, setCoinSearch] = useState("");
  const [availableWallets, setAvailableWallets] = useState([]);

  const [marginPairs, setMarginPairs] = useState([]);
  const [selectedMarginPair, setSelectedMarginPair] = useState(null);
  const [marginAssetType, setMarginAssetType] = useState("base"); // 'base' | 'quote'


  // Bottom Sheets
  const rbSheetWallet = useRef();
  const rbSheetCoins = useRef();
  const rbSheetMarginPairs = useRef();

  const [selectingWalletFor, setSelectingWalletFor] = useState("from"); // "from" | "to"

  const isMarginTransfer = fromWalletType === "margin" || toWalletType === "margin";
  const isCrossMarginTransfer = fromWalletType === "cross_margin" || toWalletType === "cross_margin";

  // Fetch Available Wallets
  useEffect(() => {
    appOperation.customer.get_wallet_type().then((res) => {
      if (res?.success && Array.isArray(res.data)) {
        const mapped = res.data.map(w => {
          if (typeof w === "string") return { key: w, label: w };
          return { key: w.type || w.key, label: w.label || w.name || w.type || w.key };
        }).filter(w => w.key);
        setAvailableWallets(mapped);
      }
      setIsScreenLoading(false);
    }).catch((e) => {
      console.log(e);
      setIsScreenLoading(false);
    });
  }, []);

  // Fetch specific coin list based on fromWalletType
  useEffect(() => {
    if (fromWalletType) {
      const wt = (fromWalletType === "margin" || fromWalletType === "cross_margin") ? "spot" : fromWalletType;
      appOperation.customer.user_main_wallet(wt).then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          setCurrencyData(res.data);
        } else {
          setCurrencyData([]);
        }
      }).catch((e) => {
        console.log(e);
        setCurrencyData([]);
      });
    }
  }, [fromWalletType]);

  // Pre-select coin
  useEffect(() => {
    if (currencyData.length > 0 && !selectedCurrency) {
      const defaultCoin = route?.params?.coin;
      const found = defaultCoin
        ? currencyData.find(c => String(c.short_name).toUpperCase() === String(defaultCoin).toUpperCase() || String(c.currency).toUpperCase() === String(defaultCoin).toUpperCase())
        : currencyData.find(c => String(c.short_name).toUpperCase() === "USDT");
      setSelectedCurrency(found || currencyData.find(c => String(c.short_name).toUpperCase() === "BTC") || currencyData[0]);
    }
  }, [currencyData, selectedCurrency, route?.params?.coin]);

  // Fetch Margin Pairs if dealing with isolated margin
  useEffect(() => {
    if (isMarginTransfer && marginPairs.length === 0) {
      appOperation.customer.margin_accounts().then((res) => {
        if (res?.success) {
          setMarginPairs(res.data);
          if (res.data.length > 0 && !selectedMarginPair) {
            const defaultCoin = route?.params?.coin;
            if (defaultCoin) {
              const pairWithCoin = res.data.find(p => String(p.base_asset).toUpperCase() === String(defaultCoin).toUpperCase() || String(p.quote_asset).toUpperCase() === String(defaultCoin).toUpperCase());
              if (pairWithCoin) {
                setSelectedMarginPair(pairWithCoin);
                setMarginAssetType(String(pairWithCoin.base_asset).toUpperCase() === String(defaultCoin).toUpperCase() ? "base" : "quote");
              } else {
                setSelectedMarginPair(res.data[0]);
              }
            } else {
              setSelectedMarginPair(res.data[0]);
            }
          }
        }
      }).catch(console.log);
    }
  }, [isMarginTransfer, marginPairs.length, selectedMarginPair]);

  // Fetch Unified Transfer Balance
  useEffect(() => {
    if (!fromWalletType || !toWalletType) return;

    // Determine effective currency ID
    let effCurrencyId = selectedCurrency?.currency_id;
    if (isMarginTransfer && selectedMarginPair) {
      const assetName = marginAssetType === "base" ? selectedMarginPair.base_asset : selectedMarginPair.quote_asset;
      const coinInfo = currencyData.find(c => c.short_name === assetName);
      if (coinInfo) effCurrencyId = coinInfo.currency_id;
    }

    if (!effCurrencyId && !isMarginTransfer) return;

    appOperation.customer.get_transfer_balance({
      from_wallet: fromWalletType,
      to_wallet: toWalletType,
      currency_id: effCurrencyId,
      pair_id: isMarginTransfer ? selectedMarginPair?.pair_id : undefined,
      asset_type: isMarginTransfer ? marginAssetType : undefined,
    }).then((res) => {
      if (res?.success && res.data) {
        setTransferableBalance(res.data.transferable ?? "0.00");
      } else {
        setTransferableBalance("0.00");
      }
    }).catch((e) => {
      console.log(e);
      setTransferableBalance("0.00");
    });
  }, [fromWalletType, toWalletType, selectedCurrency, isMarginTransfer, selectedMarginPair, marginAssetType, currencyData]);

  const transferable = transferableBalance;

  // Get selected coin for margin display
  const marginSelectedCoinName = useMemo(() => {
    if (!isMarginTransfer || !selectedMarginPair) return "";
    return marginAssetType === "base" ? selectedMarginPair.base_asset : selectedMarginPair.quote_asset;
  }, [isMarginTransfer, selectedMarginPair, marginAssetType]);



  const filteredCoins = useMemo(() => {
    if (!coinSearch) return currencyData;
    const s = coinSearch.toLowerCase();
    return currencyData.filter(
      (c) =>
        (c?.short_name || "").toLowerCase().includes(s) ||
        (c?.currency || "").toLowerCase().includes(s)
    );
  }, [currencyData, coinSearch]);

  const handleSwapDirection = () => {
    const temp = fromWalletType;
    setFromWalletType(toWalletType);
    setToWalletType(temp);
    setTransferAmount("");
  };

  const handleAll = () => {
    setTransferAmount(String(transferable));
  };

  const handleConfirmTransfer = async () => {
    if (!transferAmount || Number(transferAmount) <= 0) {
      SimpleToast.show("Please enter a valid amount");
      return;
    }

    if (isMarginTransfer && !selectedMarginPair?.pair_id) {
      SimpleToast.show("Please select a margin pair");
      return;
    }

    let effCurrencyId = selectedCurrency?.currency_id;
    if (isMarginTransfer && selectedMarginPair) {
      const assetName = marginAssetType === "base" ? selectedMarginPair.base_asset : selectedMarginPair.quote_asset;
      const coinInfo = currencyData.find(c => c.short_name === assetName);
      if (coinInfo) effCurrencyId = coinInfo.currency_id;
    }

    if (!effCurrencyId) {
      SimpleToast.show(isMarginTransfer ? "Please select pair and asset" : "Please select a coin");
      return;
    }

    setIsLoading(true);
    try {
      const result = await appOperation.customer.wallet_transfer_unified({
        from_wallet: fromWalletType,
        to_wallet: toWalletType,
        currency_id: effCurrencyId,
        amount: transferAmount,
        pair_id: isMarginTransfer ? selectedMarginPair?.pair_id : undefined,
        asset_type: isMarginTransfer ? marginAssetType : undefined,
      });

      if (result?.success) {
        SimpleToast.show(result?.message || "Transfer successful");
        navigation.goBack();
      } else {
        SimpleToast.show(result?.message || "Transfer failed");
      }
    } catch (e) {
      SimpleToast.show(e?.message || "Transfer failed");
    } finally {
      setIsLoading(false);
    }
  };
  const getWalletLabel = (key) => {
    const found = availableWallets.find(w => w.key === key);
    if (found && found.label) return found.label;
    const fallbacks = { main: "Main Wallet", spot: "Spot Wallet", margin: "Isolated Margin Wallet", cross_margin: "Cross Margin Wallet", p2p: "P2P Wallet", futures: "Futures Wallet", options: "Options Wallet", swap: "Swap Wallet", earning: "Earning Wallet" };
    return fallbacks[key] || "Wallet";
  };

  const renderWalletCard = (type, labelText, onPress) => {
    return (
      <View style={[styles.directionCard, { backgroundColor: inputBgColor }]}>
        <AppText style={styles.directionLabel}>{labelText}</AppText>
        <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.selectRow}>
          <AppText weight={SEMI_BOLD} style={[styles.directionValue, { color: themeColors.text }]}>
            {getWalletLabel(type)}
          </AppText>
          <FastImage source={downIcon} style={{ width: 10, height: 10 }} resizeMode="contain" tintColor={themeColors.secondaryText} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={styles.headerLeft}>
          <FastImage source={back_ic} style={{ width: 20, height: 20 }} resizeMode="contain" tintColor={themeColors.text} />
        </TouchableOpacity>
        <AppText weight={SEMI_BOLD} style={{ fontSize: 18, color: themeColors.text }}>Transfer</AppText>
        <TouchableOpacity onPress={() => navigation.navigate((isMarginTransfer || isCrossMarginTransfer) ? MARGIN_TRANSFER_HISTORY_SCREEN : TRANSFER_HISTORY_SCREEN)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={styles.headerRight}>
          <FastImage source={historyIcon} style={{ width: 22, height: 22 }} resizeMode="contain" tintColor={themeColors.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, flexGrow: 1 }}
        enableOnAndroid={true}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
      >
        {isScreenLoading ? (
          <MarginTransferSkeleton />
        ) : (
          <>
            {/* Direction Cards */}
            <View style={styles.directionContainer}>
              {renderWalletCard(fromWalletType, "From", () => { setSelectingWalletFor("from"); rbSheetWallet.current?.open(); })}
              <View style={styles.swapBtnWrapper}>
                <TouchableOpacity activeOpacity={0.9} onPress={handleSwapDirection} style={[styles.swapCircle,
                { backgroundColor: isDark ? colors.white : colors.iconBgColor, borderColor: isDark ? colors.white : themeColors.background }]}>
                  <FastImage source={transferNew} style={{ width: 18, height: 18 }} resizeMode="contain" />
                </TouchableOpacity>
              </View>
              {renderWalletCard(toWalletType, "To", () => { setSelectingWalletFor("to"); rbSheetWallet.current?.open(); })}
            </View>

            {/* Dynamic Selection: Margin Pair or Currency */}
            {isMarginTransfer ? (
              <>
                <AppText weight={SEMI_BOLD} style={[styles.sectionTitle, { color: themeColors.text }]}>Margin Pair</AppText>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => rbSheetMarginPairs.current?.open()}
                  style={[styles.inputContainer, { backgroundColor: inputBgColor, marginBottom: 16 }]}
                >
                  {selectedMarginPair?.icon_path && (
                    <FastImage
                      source={{ uri: buildCoinIconUri(selectedMarginPair.icon_path) }}
                      style={{ width: 24, height: 24, marginRight: 8, borderRadius: 12 }}
                      resizeMode="contain"
                    />
                  )}
                  <AppText weight={MEDIUM} style={{ flex: 1, color: themeColors.text, fontSize: 15 }}>
                    {selectedMarginPair ? `${selectedMarginPair.base_asset}/${selectedMarginPair.quote_asset}` : "Select Pair"}
                  </AppText>
                  <FastImage source={downIcon} style={{ width: 12, height: 12 }} resizeMode="contain" tintColor={themeColors.secondaryText} />
                </TouchableOpacity>

                {selectedMarginPair && (
                  <>
                    <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                      {["base", "quote"].map((assetType) => {
                        const isSelected = marginAssetType === assetType;
                        const assetName = assetType === "base" ? selectedMarginPair.base_asset : selectedMarginPair.quote_asset;
                        const coinInfo = currencyData.find(c => c.short_name === assetName);
                        const coinFullName = coinInfo?.currency || assetName;
                        const coinIcon = coinInfo?.icon_path;

                        return (
                          <TouchableOpacity
                            key={assetType}
                            onPress={() => setMarginAssetType(assetType)}
                            style={[
                              styles.coinBox,
                              {
                                flex: 1,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "flex-start",
                                paddingHorizontal: 12,
                                paddingVertical: 12,
                                borderColor: isSelected ? "#D1AA67" : themeColors.themeBorderColor,
                                backgroundColor: isSelected ? (isDark ? "#2A241C" : "#FCF2E1") : (isDark ? darkTheme.darkThemeInputColor : colors.white),
                              }
                            ]}
                          >
                            {coinIcon ? (
                              <FastImage
                                source={{ uri: buildCoinIconUri(coinIcon) }}
                                style={{ width: 26, height: 26, borderRadius: 13 }}
                                resizeMode="contain"
                              />
                            ) : (
                              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#E5E5E5" }} />
                            )}
                            <View style={{ marginLeft: 8, flex: 1, alignItems: "flex-start" }}>
                              <AppText weight={SEMI_BOLD} style={{ color: themeColors.text, fontSize: 14 }}>
                                {assetName}
                              </AppText>
                              {coinFullName !== assetName && (
                                <AppText style={{ color: themeColors.secondaryText, fontSize: 11, marginTop: 1 }}>
                                  {coinFullName}
                                </AppText>
                              )}
                            </View>
                            {isSelected ? (
                              <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "#D1AA67", alignItems: "center", justifyContent: "center" }}>
                                <FastImage source={checkIc} style={{ width: 10, height: 10 }} resizeMode="contain" tintColor="#FFF" />
                              </View>
                            ) : (
                              <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: "#E5E5EA" }} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}
              </>
            ) : (
              <>
                <AppText weight={SEMI_BOLD} style={[styles.sectionTitle, { color: themeColors.text }]}>Coin</AppText>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => rbSheetCoins.current?.open()}
                  style={[styles.inputContainer, { backgroundColor: inputBgColor, marginBottom: 16 }]}
                >
                  {selectedCurrency ? (
                    <FastImage
                      source={buildCoinIconUri(selectedCurrency?.icon_path) ? { uri: buildCoinIconUri(selectedCurrency?.icon_path) } : bitcoin_ic}
                      style={{ width: 24, height: 24, marginRight: 10 }}
                      resizeMode="contain"
                    />
                  ) : null}
                  <AppText weight={MEDIUM} style={{ flex: 1, color: themeColors.text, fontSize: 15 }}>
                    {selectedCurrency?.short_name || "Select Coin"}
                  </AppText>
                  <FastImage source={downIcon} style={{ width: 12, height: 12 }} resizeMode="contain" tintColor={themeColors.secondaryText} />
                </TouchableOpacity>
              </>
            )}

            {/* Amount Input Section */}
            <AppText weight={SEMI_BOLD} style={[styles.sectionTitle, { color: themeColors.text }]}>Amount</AppText>
            <View style={[styles.inputContainer, { backgroundColor: inputBgColor }]}>
              <TextInput
                placeholder="0.00"
                placeholderTextColor={isDark ? "#5A5A5C" : "#C7C7CC"}
                value={transferAmount}
                onChangeText={setTransferAmount}
                keyboardType="numeric"
                cursorColor={isDark ? colors.white : colors.black}
                style={{
                  flex: 1,
                  color: themeColors.text,
                  fontSize: 15,
                  fontFamily: fontFamilyMedium,
                  paddingVertical: Platform.OS === "ios" ? 8 : 4,
                }}
              />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <AppText weight={SEMI_BOLD} style={{ color: themeColors.text, fontSize: 14 }}>
                  {isMarginTransfer ? marginSelectedCoinName : selectedCurrency?.short_name || ""}
                </AppText>
                <View style={{ width: 1, height: 16, backgroundColor: themeColors.themeBorderColor }} />
                <TouchableOpacity onPress={handleAll}>
                  <AppText weight={SEMI_BOLD} style={{ color: "#D1AA67", fontSize: 14 }}>All</AppText>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
              <AppText style={{ fontSize: 12, color: themeColors.secondaryText }}>
                Balance: {transferable} {isMarginTransfer ? marginSelectedCoinName : selectedCurrency?.short_name || ""}
              </AppText>
            </View>
          </>
        )}
      </KeyboardAwareScrollView>

      {/* Confirm Button */}
      <View style={[styles.bottomBtnWrap, { borderTopColor: themeColors.themeBorderColor }]}>
        <Button
          onPress={handleConfirmTransfer}
          disabled={
            isLoading ||
            !transferAmount ||
            Number(transferAmount) <= 0 ||
            Number(transferAmount) > parseFloat(transferable || 0)
          }
        >
          {isLoading ? <ActivityIndicator color="#FFF" /> : "Confirm"}
        </Button>
      </View>

      {/* Wallet Selector Sheet */}
      <RBSheet
        ref={rbSheetWallet}
        closeOnDragDown={true}
        height={600}
        customStyles={{
          container: { backgroundColor: themeColors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16 },
          draggableIcon: { backgroundColor: isDark ? "#3A3A3C" : "#E5E5EA", width: 40 },
        }}
      >
        <AppText weight={SEMI_BOLD} style={{ fontSize: 18, color: themeColors.text, marginBottom: 16, textAlign: "center", marginTop: 10 }}>
          Select Wallet
        </AppText>
        <ScrollView showsVerticalScrollIndicator={false}>
          {availableWallets.filter(w => w.key !== (selectingWalletFor === "from" ? toWalletType : fromWalletType)).map((item) => {
            const isSelected = item.key === (selectingWalletFor === "from" ? fromWalletType : toWalletType);
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.accountCard,
                  {
                    borderColor: isDark ? themeColors.border : lightTheme.input,
                    backgroundColor: isDark ? darkTheme.darkThemeInputColor : colors.white,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }
                ]}
                onPress={() => {
                  if (selectingWalletFor === "from") setFromWalletType(item.key);
                  else setToWalletType(item.key);
                  rbSheetWallet.current?.close();
                  setTransferAmount("");
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {WALLET_ICONS[item.key] || WALLET_ICONS[String(item.key).toLowerCase()] ? (
                    <FastImage
                      source={WALLET_ICONS[item.key] || WALLET_ICONS[String(item.key).toLowerCase()]}
                      style={{ width: 24, height: 24 }}
                      resizeMode="contain"
                      tintColor={isDark ? "#FFF" : undefined}
                    />
                  ) : (
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#E5E5E5" }} />
                  )}
                  <AppText weight={SEMI_BOLD} style={{ fontSize: 15, color: themeColors.text, marginLeft: 12 }}>{item.label}</AppText>
                </View>
                {isSelected && (
                  <View style={{ width: 18, height: 18, borderRadius: 10, backgroundColor: isDark ? colors.white : "#000", alignItems: "center", justifyContent: "center" }}>
                    <FastImage source={checkIc} style={{ width: 10, height: 10 }} resizeMode="contain" tintColor={isDark ? "#000" : "#FFF"} />
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </RBSheet>

      {/* Coin Selector Sheet */}
      <RBSheet
        ref={rbSheetCoins}
        closeOnDragDown={true}
        height={600}
        customStyles={{
          container: { backgroundColor: themeColors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16 },
          draggableIcon: { backgroundColor: isDark ? "#3A3A3C" : "#E5E5EA", width: 40 },
        }}
      >
        <AppText weight={SEMI_BOLD} style={{ fontSize: 18, color: themeColors.text, marginBottom: 12, textAlign: "center", marginTop: 10 }}>Select Coin</AppText>
        <TextInput
          placeholder="Search coin"
          placeholderTextColor={themeColors.secondaryText}
          value={coinSearch}

          onChangeText={setCoinSearch}
          style={{
            backgroundColor: isDark ? darkTheme.darkThemeInputColor : inputBgColor, color: themeColors.text,
            borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16,
            fontFamily: fontFamilyMedium
          }}
        />
        <ScrollView showsVerticalScrollIndicator={false}>
          {filteredCoins.map((item, idx) => (
            <TouchableOpacity
              key={item?.currency_id || idx}
              style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.themeBorderColor }}
              onPress={() => {
                setSelectedCurrency(item);
                rbSheetCoins.current?.close();
                setTransferAmount("");
              }}
            >
              <FastImage
                source={buildCoinIconUri(item?.icon_path) ? { uri: buildCoinIconUri(item?.icon_path) } : bitcoin_ic}
                style={{ width: 26, height: 26 }}
                resizeMode="contain"
              />
              <AppText weight={SEMI_BOLD} style={{ fontSize: 15, color: themeColors.text, marginLeft: 12 }}>{item?.short_name}</AppText>
              {item?.currency && item.currency !== item.short_name && (
                <AppText style={{ fontSize: 13, color: themeColors.secondaryText, marginLeft: "auto" }}>
                  {item.currency}
                </AppText>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </RBSheet>

      {/* Margin Pair Selector Sheet */}
      <RBSheet
        ref={rbSheetMarginPairs}
        closeOnDragDown={true}
        height={600}
        customStyles={{
          container: { backgroundColor: themeColors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16 },
          draggableIcon: { backgroundColor: isDark ? "#3A3A3C" : "#E5E5EA", width: 40 },
        }}
      >
        <AppText weight={SEMI_BOLD} style={{ fontSize: 18, color: themeColors.text, marginBottom: 16, marginTop: 10 }}>Select Margin Pair</AppText>
        <ScrollView showsVerticalScrollIndicator={false}>
          {marginPairs.map((p) => (
            <TouchableOpacity
              key={p.pair_id}
              style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.themeBorderColor }}
              onPress={() => {
                setSelectedMarginPair(p);
                rbSheetMarginPairs.current?.close();
                setTransferAmount("");
              }}
            >
              {p.icon_path ? (
                <FastImage
                  source={{ uri: buildCoinIconUri(p.icon_path) }}
                  style={{ width: 24, height: 24, borderRadius: 12 }}
                  resizeMode="contain"
                />
              ) : (
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#E5E5E5" }} />
              )}
              <AppText weight={SEMI_BOLD} style={{ flex: 1, fontSize: 15, color: themeColors.text, marginLeft: 12 }}>
                {p.base_asset}/{p.quote_asset}
              </AppText>
              {selectedMarginPair?.pair_id === p.pair_id && (
                <FastImage source={checkIc} style={{ width: 18, height: 18 }} resizeMode="contain" tintColor={isDark ? colors.white : colors.black} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </RBSheet>

    </SafeAreaView>
  );
};

export default MarginTransfer;

const styles = StyleSheet.create({
  header: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  headerLeft: { width: 32, height: 32, alignItems: "flex-start", justifyContent: "center" },
  headerRight: { width: 32, height: 32, alignItems: "flex-end", justifyContent: "center" },
  directionContainer: { position: "relative", marginBottom: 24, gap: 8 },
  directionCard: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  directionLabel: { fontSize: 13, color: "#8E8E93", marginBottom: 4 },
  directionValue: { fontSize: 16 },
  selectRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  swapBtnWrapper: { height: 0, alignItems: "center", justifyContent: "center", zIndex: 10 },
  swapCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, alignItems: "center", justifyContent: "center", position: "absolute", top: -18 },
  sectionTitle: { fontSize: 14, marginBottom: 12, marginTop: 4 },
  inputContainer: { height: 50, borderRadius: 12, flexDirection: "row", alignItems: "center", paddingHorizontal: 14 },
  bottomBtnWrap: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, backgroundColor: "transparent" },
  accountCard: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 12 },
  coinBox: { flex: 1, height: 50, borderRadius: 10, justifyContent: "center", borderWidth: 1 },
});
