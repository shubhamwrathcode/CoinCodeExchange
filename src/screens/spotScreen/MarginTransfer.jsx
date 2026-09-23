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
import LinearGradient from "react-native-linear-gradient";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useRoute, useNavigation } from "@react-navigation/native";

import { AppText, SEMI_BOLD, Button, MEDIUM } from "../../shared";
import { colors, darkTheme } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";
import {
  back_ic,
  checkIc,
  downIcon,
  historyIcon,
  activities_icon,
} from "../../helper/ImageAssets";
import SimpleToast from "react-native-simple-toast";
import { fontFamilyMedium } from "../../theme/typography";
import { appOperation } from "../../appOperation";
import { MARGIN_BORROW_REPAY_HISTORY_SCREEN, MARGIN_TRANSFER_HISTORY_SCREEN, TRANSFER_HISTORY_SCREEN } from "../../navigation/routes";
import { IMAGE_BASE_URL } from "../../helper/Constants";
import {
  ArrowDownUp,
  ArrowLeftRight,
  ChartCandlestick,
  ChevronDown,
  ChevronRight,
  Coins,
  GitBranch,
  HandCoins,
  Landmark,
  Layers,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react-native";
import CoinIcon from "../../common/CoinIcon";
import { blurSheetTheme } from "../wallet/sheets/BlurSheetChrome";
import AnimatedBottomSheet from "../../common/AnimatedBottomSheet/AnimatedBottomSheet";

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

const getWalletMeta = (key) => {
  const k = String(key || "").toLowerCase();
  const map = {
    spot: {
      title: "Spot",
      subtitle: "Spot Account",
      iconBg: "rgba(139, 92, 246, 0.22)",
      iconTint: "#C4B5FD",
      Icon: Coins,
    },
    main: {
      title: "Main",
      subtitle: "Main Account",
      iconBg: "rgba(10, 168, 197, 0.18)",
      iconTint: colors.cyanTheme,
      Icon: Landmark,
    },
    funding: {
      title: "Funding",
      subtitle: "Funding Account",
      iconBg: "rgba(10, 168, 197, 0.18)",
      iconTint: colors.cyanTheme,
      Icon: Wallet,
    },
    earning: {
      title: "Earning",
      subtitle: "Earning Account",
      iconBg: "rgba(245, 158, 11, 0.18)",
      iconTint: "#F59E0B",
      Icon: HandCoins,
    },
    futures: {
      title: "Futures",
      subtitle: "Futures Account",
      iconBg: "rgba(59, 130, 246, 0.18)",
      iconTint: "#60A5FA",
      Icon: TrendingUp,
    },
    options: {
      title: "Options",
      subtitle: "Options Account",
      iconBg: "rgba(236, 72, 153, 0.18)",
      iconTint: "#F472B6",
      Icon: ChartCandlestick,
    },
    option: {
      title: "Options",
      subtitle: "Options Account",
      iconBg: "rgba(236, 72, 153, 0.18)",
      iconTint: "#F472B6",
      Icon: ChartCandlestick,
    },
    margin: {
      title: "Margin",
      subtitle: "Margin Account",
      iconBg: "rgba(34, 197, 94, 0.18)",
      iconTint: "#4ADE80",
      Icon: Layers,
    },
    cross_margin: {
      title: "Cross",
      subtitle: "Cross Margin Account",
      iconBg: "rgba(52, 211, 153, 0.18)",
      iconTint: "#34D399",
      Icon: GitBranch,
    },
    p2p: {
      title: "P2P",
      subtitle: "P2P Account",
      iconBg: "rgba(168, 85, 247, 0.18)",
      iconTint: "#C084FC",
      Icon: Users,
    },
    swap: {
      title: "Swap",
      subtitle: "Swap Account",
      iconBg: "rgba(14, 165, 233, 0.18)",
      iconTint: "#38BDF8",
      Icon: ArrowLeftRight,
    },
  };
  if (map[k]) return map[k];
  const title = k ? k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, " ") : "Wallet";
  return {
    title,
    subtitle: `${title} Account`,
    iconBg: "rgba(255,255,255,0.08)",
    iconTint: "#FFFFFF",
    Icon: Wallet,
  };
};

const WalletTypeIcon = ({ meta, size = 40 }) => {
  const IconCmp = meta?.Icon || Wallet;
  const iconSize = Math.round(size * 0.45);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        backgroundColor: meta?.iconBg || "rgba(255,255,255,0.08)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <IconCmp size={iconSize} color={meta?.iconTint || "#FFF"} strokeWidth={2} />
    </View>
  );
};

const MarginTransfer = () => {
  const { colors: themeColors, isDark } = useTheme();
  const inputBgColor = isDark ? colors.lightBlackLatest : "#EDEDEE";
  const inputBorderColor = isDark ? "#151619" : "#E5E7EB";
  const themedInputStyle = {
    backgroundColor: inputBgColor,
    borderColor: inputBorderColor,
    borderWidth: 1,
  };
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
    const list = Array.isArray(currencyData) ? currencyData : [];
    if (!coinSearch) return list;
    const s = coinSearch.toLowerCase();
    return list.filter(
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
  const muted = themeColors.secondaryText || "#8E8E93";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const sheetTheme = blurSheetTheme(isDark);

  const renderWalletRow = (walletKey, sideLabel, onPressWallet, showPairPicker = false) => {
    const meta = getWalletMeta(walletKey);
    const pairLabel = selectedMarginPair
      ? `${selectedMarginPair.base_asset} / ${selectedMarginPair.quote_asset}`
      : "Select Pair";

    return (
      <View style={styles.walletRow}>
        <TouchableOpacity
          style={styles.walletRowMain}
          onPress={onPressWallet}
          activeOpacity={0.75}
        >
          <View style={{ marginRight: 12 }}>
            <WalletTypeIcon meta={meta} size={40} />
          </View>
          <View style={styles.walletTextCol}>
            <AppText style={{ color: muted, fontSize: 12, marginBottom: 2 }}>{sideLabel}</AppText>
            <AppText weight={SEMI_BOLD} style={{ color: themeColors.text, fontSize: 16 }}>
              {meta.title}
            </AppText>
            <AppText style={{ color: muted, fontSize: 12, marginTop: 2 }}>{meta.subtitle}</AppText>
          </View>
          {!showPairPicker ? <ChevronRight size={18} color={muted} strokeWidth={2} /> : null}
        </TouchableOpacity>

        {showPairPicker ? (
          <TouchableOpacity
            style={styles.pairPicker}
            activeOpacity={0.75}
            onPress={() => rbSheetMarginPairs.current?.open()}
          >
            <AppText
              numberOfLines={1}
              style={{ color: muted, fontSize: 13, maxWidth: 100, textAlign: "right" }}
            >
              {pairLabel}
            </AppText>
            <ChevronDown size={16} color={muted} strokeWidth={2} />
          </TouchableOpacity>
        ) : null}
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
            {/* Direction Cards — new stacked From/To design */}
            <View style={[styles.fromToCard, { backgroundColor: inputBgColor, borderColor: cardBorder }]}>
              {renderWalletRow(
                fromWalletType,
                "From",
                () => {
                  setSelectingWalletFor("from");
                  rbSheetWallet.current?.open();
                },
                fromWalletType === "margin"
              )}

              <View style={styles.dividerWrap}>
                <View style={[styles.dividerLine, { backgroundColor: cardBorder }]} />
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleSwapDirection}
                  style={[
                    styles.swapCircle,
                    {
                      backgroundColor: isDark ? "#121316" : "#FFF",
                      borderColor: isDark ? "rgba(10, 168, 197, 0.45)" : "rgba(10, 168, 197, 0.3)",
                    },
                  ]}
                >
                  <ArrowDownUp size={16} color={colors.cyanTheme} strokeWidth={2.2} />
                </TouchableOpacity>
              </View>

              {renderWalletRow(
                toWalletType,
                "To",
                () => {
                  setSelectingWalletFor("to");
                  rbSheetWallet.current?.open();
                },
                toWalletType === "margin" || (isMarginTransfer && fromWalletType !== "margin")
              )}
            </View>

            {/* Dynamic Selection: base/quote (margin) or Currency */}
            {isMarginTransfer ? (
              selectedMarginPair ? (
                <View style={{ flexDirection: "row", gap: 12, marginBottom: 16, marginTop: 4 }}>
                  {["base", "quote"].map((assetType) => {
                    const isSelected = marginAssetType === assetType;
                    const assetName = assetType === "base" ? selectedMarginPair.base_asset : selectedMarginPair.quote_asset;
                    const coinInfo = currencyData.find((c) => c.short_name === assetName);
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
                            backgroundColor: isSelected
                              ? isDark
                                ? "#2A241C"
                                : "#FCF2E1"
                              : isDark
                                ? darkTheme.darkThemeInputColor
                                : colors.white,
                          },
                        ]}
                      >
                        <CoinIcon
                          coin={coinInfo || { short_name: assetName, icon_path: coinIcon }}
                          style={{ width: 26, height: 26, borderRadius: 13 }}
                          resizeMode="contain"
                          fallback={activities_icon}
                        />
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
                          <View
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 8,
                              backgroundColor: "#D1AA67",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <FastImage source={checkIc} style={{ width: 10, height: 10 }} resizeMode="contain" tintColor="#FFF" />
                          </View>
                        ) : (
                          <View
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: "#E5E5EA",
                            }}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null
            ) : (
              <>
                <AppText weight={SEMI_BOLD} style={[styles.sectionTitle, { color: themeColors.text }]}>
                  Coin
                </AppText>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setCoinSearch("");
                    rbSheetCoins.current?.open();
                  }}
                  style={[styles.inputContainer, themedInputStyle, { marginBottom: 16 }]}
                >
                  {selectedCurrency ? (
                    <CoinIcon
                      coin={selectedCurrency}
                      style={{ width: 24, height: 24, marginRight: 10, borderRadius: 12 }}
                      resizeMode="contain"
                      fallback={activities_icon}
                    />
                  ) : null}
                  <AppText weight={MEDIUM} style={{ flex: 1, color: themeColors.text, fontSize: 15 }}>
                    {selectedCurrency?.short_name || "Select Coin"}
                  </AppText>
                  <FastImage
                    source={downIcon}
                    style={{ width: 12, height: 12 }}
                    resizeMode="contain"
                    tintColor={themeColors.secondaryText}
                  />
                </TouchableOpacity>
              </>
            )}

            {/* Amount Input Section */}
            <AppText weight={SEMI_BOLD} style={[styles.sectionTitle, { color: themeColors.text }]}>Amount</AppText>
            <View style={[styles.inputContainer, themedInputStyle]}>
              <TextInput
                placeholder="0.00"
                placeholderTextColor={isDark ? (colors.darkShadeColorText || "#6A7282") : "#84888C"}
                value={transferAmount}
                onChangeText={setTransferAmount}
                keyboardType="numeric"
                cursorColor={isDark ? colors.white : colors.black}
                style={{
                  flex: 1,
                  color: themeColors.text,
                  fontSize: 14,
                  fontFamily: fontFamilyMedium,
                  paddingVertical: Platform.OS === "ios" ? 8 : 4,
                }}
              />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <AppText weight={SEMI_BOLD} style={{ color: themeColors.text, fontSize: 14 }}>
                  {isMarginTransfer ? marginSelectedCoinName : selectedCurrency?.short_name || ""}
                </AppText>
                <View style={{ width: 1, height: 16, backgroundColor: inputBorderColor }} />
                <TouchableOpacity onPress={handleAll}>
                  <AppText weight={SEMI_BOLD} style={{ color: colors.cyanTheme, fontSize: 14 }}>All</AppText>
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

      {/* Wallet Selector Sheet — same chrome as TradingDataModal */}
      <AnimatedBottomSheet ref={rbSheetWallet} sheetHeight={Math.min(Dimensions.get("window").height * 0.82, 640)} isDark={isDark}>
        <View style={styles.sheetInner}>
          <View style={styles.sheetDragHandleWrap}>
            <View style={[styles.sheetDragHandle, { backgroundColor: sheetTheme.dragHandleColor }]} />
          </View>
          <AppText
            weight={SEMI_BOLD}
            style={{
              fontSize: 17,
              color: sheetTheme.textColor,
              marginBottom: 12,
              marginTop: 2,
            }}
          >
            Select Wallet
          </AppText>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {availableWallets
              .filter((w) => w.key !== (selectingWalletFor === "from" ? toWalletType : fromWalletType))
              .map((item) => {
                const isSelected =
                  item.key === (selectingWalletFor === "from" ? fromWalletType : toWalletType);
                const meta = getWalletMeta(item.key);
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 14,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: sheetTheme.rowBorderColor,
                    }}
                    onPress={() => {
                      if (selectingWalletFor === "from") setFromWalletType(item.key);
                      else setToWalletType(item.key);
                      rbSheetWallet.current?.close();
                      setTransferAmount("");
                    }}
                  >
                    <View style={{ marginRight: 12 }}>
                      <WalletTypeIcon meta={meta} size={40} />
                    </View>
                    <AppText
                      weight={SEMI_BOLD}
                      style={{ flex: 1, fontSize: 15, color: sheetTheme.textColor }}
                    >
                      {item.label}
                    </AppText>
                    {isSelected ? (
                      <FastImage
                        source={checkIc}
                        style={{ width: 18, height: 18 }}
                        resizeMode="contain"
                        tintColor={sheetTheme.iconTint}
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
          </ScrollView>
        </View>
      </AnimatedBottomSheet>

      {/* Coin Selector Sheet — same chrome as TradingDataModal */}
      <AnimatedBottomSheet ref={rbSheetCoins} sheetHeight={Math.min(Dimensions.get("window").height * 0.82, 640)} isDark={isDark}>
        <View style={styles.sheetInner}>
          <View style={styles.sheetDragHandleWrap}>
            <View style={[styles.sheetDragHandle, { backgroundColor: sheetTheme.dragHandleColor }]} />
          </View>
          <AppText
            weight={SEMI_BOLD}
            style={{
              fontSize: 17,
              color: sheetTheme.textColor,
              marginBottom: 10,
              marginTop: 2,
            }}
          >
            Select Coin
          </AppText>
          <View
            style={[
              styles.sheetSearchRow,
              {
                backgroundColor: sheetTheme.cardBg,
                borderColor: sheetTheme.borderColor,
              },
            ]}
          >
            <TextInput
              placeholder="Search coin"
              placeholderTextColor={sheetTheme.subTextColor}
              value={coinSearch}
              onChangeText={setCoinSearch}
              cursorColor={sheetTheme.textColor}
              style={{
                flex: 1,
                color: sheetTheme.textColor,
                fontSize: 14,
                fontFamily: fontFamilyMedium,
                paddingVertical: Platform.OS === "ios" ? 8 : 4,
              }}
            />
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {filteredCoins.map((item, idx) => (
              <TouchableOpacity
                key={item?.currency_id || idx}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: sheetTheme.rowBorderColor,
                }}
                onPress={() => {
                  setSelectedCurrency(item);
                  rbSheetCoins.current?.close();
                  setTransferAmount("");
                }}
              >
                <CoinIcon
                  coin={item}
                  style={{ width: 26, height: 26, borderRadius: 13 }}
                  resizeMode="contain"
                  fallback={activities_icon}
                />
                <AppText
                  weight={SEMI_BOLD}
                  style={{ fontSize: 15, color: sheetTheme.textColor, marginLeft: 12 }}
                >
                  {item?.short_name}
                </AppText>
                {item?.currency && item.currency !== item.short_name && (
                  <AppText
                    style={{ fontSize: 13, color: sheetTheme.subTextColor, marginLeft: "auto" }}
                  >
                    {item.currency}
                  </AppText>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </AnimatedBottomSheet>

      {/* Margin Pair Selector Sheet — same chrome as TradingDataModal */}
      <AnimatedBottomSheet ref={rbSheetMarginPairs} sheetHeight={Math.min(Dimensions.get("window").height * 0.82, 640)} isDark={isDark}>
        <View style={styles.sheetInner}>
          <View style={styles.sheetDragHandleWrap}>
            <View style={[styles.sheetDragHandle, { backgroundColor: sheetTheme.dragHandleColor }]} />
          </View>
          <AppText
            weight={SEMI_BOLD}
            style={{
              fontSize: 17,
              color: sheetTheme.textColor,
              marginBottom: 12,
              marginTop: 2,
            }}
          >
            Select Margin Pair
          </AppText>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {marginPairs.map((p) => (
              <TouchableOpacity
                key={p.pair_id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: sheetTheme.rowBorderColor,
                }}
                onPress={() => {
                  setSelectedMarginPair(p);
                  rbSheetMarginPairs.current?.close();
                  setTransferAmount("");
                }}
              >
                <CoinIcon
                  coin={p}
                  style={{ width: 24, height: 24, borderRadius: 12 }}
                  resizeMode="contain"
                  fallback={activities_icon}
                />
                <AppText
                  weight={SEMI_BOLD}
                  style={{ flex: 1, fontSize: 15, color: sheetTheme.textColor, marginLeft: 12 }}
                >
                  {p.base_asset}/{p.quote_asset}
                </AppText>
                {selectedMarginPair?.pair_id === p.pair_id && (
                  <FastImage
                    source={checkIc}
                    style={{ width: 18, height: 18 }}
                    resizeMode="contain"
                    tintColor={sheetTheme.iconTint}
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </AnimatedBottomSheet>

    </SafeAreaView>
  );
};

export default MarginTransfer;

const styles = StyleSheet.create({
  header: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  headerLeft: { width: 32, height: 32, alignItems: "flex-start", justifyContent: "center" },
  headerRight: { width: 32, height: 32, alignItems: "flex-end", justifyContent: "center" },
  fromToCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 6,
    marginBottom: 20,
  },
  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 72,
  },
  walletRowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  walletTextCol: {
    flex: 1,
  },
  pairPicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingLeft: 8,
    paddingVertical: 8,
  },
  dividerWrap: {
    height: 1,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 2,
  },
  dividerLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  swapCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  sectionTitle: { fontSize: 14, marginBottom: 12, marginTop: 4 },
  inputContainer: {
    height: 50,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  bottomBtnWrap: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, backgroundColor: "transparent" },
  coinBox: { flex: 1, height: 50, borderRadius: 10, justifyContent: "center", borderWidth: 1 },
  sheetInner: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
  },
  sheetDragHandleWrap: {
    alignItems: "center",
    marginBottom: 8,
    marginTop: 2,
  },
  sheetDragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  sheetSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    marginBottom: 10,
    height: 42,
  },
});
