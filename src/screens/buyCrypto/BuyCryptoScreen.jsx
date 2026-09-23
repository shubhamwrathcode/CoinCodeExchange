import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Keyboard,
  Dimensions,
  Text,
} from "react-native";
import FastImage from "react-native-fast-image";
import { AppSafeAreaView, AppText, SEMI_BOLD, MEDIUM, BOLD } from "../../shared";
import { colors } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";
import {
  back_ic,
  downIcon,
  bitcoinIcon,
  tetherIcon,
  bnbIcon,
  trxIcon,
  Polygon,
  transferNew,
  historyIcon,
  closeIcon,
  searchIcon,
} from "../../helper/ImageAssets";
import NavigationService from "../../navigation/NavigationService";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import AnimatedBottomSheet from "../../common/AnimatedBottomSheet/AnimatedBottomSheet";
import { blurSheetTheme } from "../wallet/sheets/BlurSheetChrome";
import { appOperation } from "../../appOperation";
import { NAVIGATION_AUTH_STACK, LOGIN_SCREEN, CONVERT_HISTORY_SCREEN, NAVIGATION_BOTTOM_TAB_STACK, HOME_SCREEN } from "../../navigation/routes";
import { showError, showSuccess } from "../../helper/logger";
import {
  FALLBACK_CATALOG,
  normalizeCatalog,
  cryptosForFiat,
  fiatsForCrypto,
  computeConvertPreview,
  formatLiveRateLine,
  formatQuoteAmount,
  formatAedAmount,
  quoteMidLine,
  quoteFeeLabel,
  isPositiveMoneyString,
  moneyGreaterThan,
  sanitizeAmountInput,
  newIdempotencyKey,
  assetName,
} from "./convertHelpers";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const GOLD = "#D1AA67";

const CRYPTO_ICON_MAP = {
  USDT: tetherIcon,
  BTC: bitcoinIcon,
  ETH: Polygon,
  BNB: bnbIcon,
  TRX: trxIcon,
  SOL: Polygon,
  XRP: tetherIcon,
  DOGE: tetherIcon,
  USDC: tetherIcon,
};

const BuyCryptoScreen = ({ navigation, isEmbedded = false }) => {
  const { colors: themeColors, isDark } = useTheme();
  const sheetTheme = blurSheetTheme(isDark);
  const inputBg = isDark ? colors.lightBlackLatest : "#EDEDEE";
  const inputBorder = isDark ? "#151619" : "#E5E7EB";
  const cardBorder = isDark ? themeColors.border || "#151619" : "#DFE0E2";
  const mutedText = isDark ? (colors.darkShadeColorText || "#6A7282") : "#8A94A6";
  const tabIdleBg = isDark ? colors.lightBlackLatest : "#F2F3F4";
  const tabActiveBg = isDark ? "#151619" : "#FFFFFF";
  const dispatch = useAppDispatch();
  const userData = useAppSelector((state) => state.auth.userData);
  const loggedIn = !!(userData?.id || userData?._id);

  // Bottom Sheet Refs
  const rbSheetAssetPicker = useRef(null);
  const rbSheetConfirm = useRef(null);
  const rbSheetHistory = useRef(null);

  // States
  const [side, setSide] = useState("buy"); // "buy" | "sell"
  const isBuy = side === "buy";

  const [catalog, setCatalog] = useState(FALLBACK_CATALOG);
  const [fiatCode, setFiatCode] = useState("AED");
  const [cryptoCode, setCryptoCode] = useState("USDT");
  const [amount, setAmount] = useState("");
  const [inputField, setInputField] = useState("spend"); // "spend" | "receive"
  const [rates, setRates] = useState(null);
  const [spotBalance, setSpotBalance] = useState("0");
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Picker modal state
  const [pickerType, setPickerType] = useState("spend"); // "spend" | "receive"
  const [pickerSearch, setPickerSearch] = useState("");

  // Convert Quote & Execution
  const [quoting, setQuoting] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [confirmQuote, setConfirmQuote] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fiatOptions = useMemo(() => fiatsForCrypto(catalog, cryptoCode), [catalog, cryptoCode]);
  const cryptoOptions = useMemo(() => cryptosForFiat(catalog, fiatCode), [catalog, fiatCode]);

  const fiat = useMemo(
    () => fiatOptions.find((f) => f.code === fiatCode) || catalog.fiat[0] || FALLBACK_CATALOG.fiat[0],
    [fiatOptions, fiatCode, catalog]
  );
  const crypto = useMemo(
    () => cryptoOptions.find((c) => c.code === cryptoCode) || catalog.crypto[0] || FALLBACK_CATALOG.crypto[0],
    [cryptoOptions, cryptoCode, catalog]
  );

  const spendAsset = isBuy ? fiat : crypto;
  const receiveAsset = isBuy ? crypto : fiat;

  // Compute live preview calculation
  const preview = useMemo(() => {
    return computeConvertPreview({
      side: isBuy ? "BUY" : "SELL",
      amount,
      rates,
      baseAsset: crypto?.code || "USDT",
      quoteAsset: fiat?.code || "AED",
      qtyDecimals: crypto?.qty_decimals || 6,
      inputField,
    });
  }, [isBuy, amount, rates, crypto?.code, crypto?.qty_decimals, fiat?.code, inputField]);

  const liveRateText = useMemo(() => {
    return formatLiveRateLine(rates, crypto?.code || "USDT", fiat?.code || "AED");
  }, [rates, crypto?.code, fiat?.code]);

  // Load Catalog & Rates
  const loadInitialData = useCallback(async () => {
    try {
      const [assetsRes, ratesRes] = await Promise.all([
        appOperation.customer.fiat_convert_assets().catch(() => null),
        appOperation.customer.fiat_convert_rates().catch(() => null),
      ]);
      if (assetsRes?.success && assetsRes?.data) {
        setCatalog(normalizeCatalog(assetsRes.data));
      }
      if (ratesRes?.success && ratesRes?.data) {
        setRates(ratesRes.data);
      }
    } catch {
      setCatalog(FALLBACK_CATALOG);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Fetch Wallet Spot Balance
  const fetchBalance = useCallback(async () => {
    if (!loggedIn) {
      setSpotBalance("0");
      return;
    }
    const assetToFetch = isBuy ? fiat?.code : crypto?.code;
    if (!assetToFetch) return;
    setLoadingBalance(true);
    try {
      let list = [];
      const res = await appOperation.customer.user_wallet("spot").catch(() => null);
      if (res?.success && Array.isArray(res?.data)) {
        list = res.data;
      } else {
        const res2 = await appOperation.customer.user_wallet().catch(() => null);
        if (res2?.success && Array.isArray(res2?.data)) {
          list = res2.data;
        }
      }

      const want = String(assetToFetch).trim().toUpperCase();
      const row = list.find(
        (r) =>
          String(r?.short_name || "").trim().toUpperCase() === want ||
          String(r?.currency || "").trim().toUpperCase() === want ||
          String(r?.currency_symbol || "").trim().toUpperCase() === want ||
          String(r?.symbol || "").trim().toUpperCase() === want ||
          String(r?.coin || "").trim().toUpperCase() === want
      );

      setSpotBalance(row?.balance != null ? String(row.balance) : "0");
    } catch {
      setSpotBalance("0");
    } finally {
      setLoadingBalance(false);
    }
  }, [loggedIn, isBuy, fiat?.code, crypto?.code]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Spend & Receive values
  const spendAmountValue =
    inputField === "spend" ? amount : preview?.you_spend ? String(preview.you_spend) : "";
  const receiveAmountValue =
    inputField === "receive" ? amount : preview?.you_receive ? String(preview.you_receive) : "";

  const insufficientBalance =
    loggedIn &&
    isPositiveMoneyString(spendAmountValue) &&
    moneyGreaterThan(spendAmountValue, spotBalance);

  // Handle Side Toggle (Buy / Sell)
  const handleToggleSide = (newSide) => {
    if (side === newSide) return;
    setSide(newSide);
    setAmount("");
    setInputField("spend");
  };

  const handleSetMax = () => {
    if (!loggedIn || !spotBalance || parseFloat(spotBalance) <= 0) return;
    setInputField("spend");
    setAmount(String(spotBalance));
  };

  // Open Asset Picker
  const handleOpenAssetPicker = (type) => {
    setPickerType(type);
    setPickerSearch("");
    rbSheetAssetPicker.current?.open();
  };

  const pickerOptions = useMemo(() => {
    const isSpendFiat = isBuy ? pickerType === "spend" : pickerType === "receive";
    const opts = isSpendFiat ? fiatOptions : cryptoOptions;
    const q = String(pickerSearch || "").trim().toLowerCase();
    if (!q) return opts;
    return opts.filter(
      (o) => o.code.toLowerCase().includes(q) || String(o.name || "").toLowerCase().includes(q)
    );
  }, [isBuy, pickerType, fiatOptions, cryptoOptions, pickerSearch]);

  const handleSelectAsset = (item) => {
    rbSheetAssetPicker.current?.close();
    const isSpendFiat = isBuy ? pickerType === "spend" : pickerType === "receive";
    if (isSpendFiat) {
      setFiatCode(item.code);
    } else {
      setCryptoCode(item.code);
    }
    setAmount("");
  };

  // Confirm Order Flow
  const handleReviewOrder = async () => {
    Keyboard.dismiss();
    if (!loggedIn) {
      NavigationService.navigate(NAVIGATION_AUTH_STACK, { screen: LOGIN_SCREEN });
      return;
    }
    if (!isPositiveMoneyString(spendAmountValue)) {
      showError("Please enter a valid amount");
      return;
    }
    if (insufficientBalance) {
      showError(`Insufficient ${spendAsset?.code} balance`);
      return;
    }

    setQuoting(true);
    try {
      const payload = isBuy
        ? {
          side: "BUY",
          base_asset: crypto.code,
          quote_asset: fiat.code,
          amount_aed: spendAmountValue,
        }
        : {
          side: "SELL",
          base_asset: crypto.code,
          quote_asset: fiat.code,
          amount_crypto: spendAmountValue,
        };

      console.log("➡️ [BUY_CRYPTO] QUOTE API REQUEST payload:", JSON.stringify(payload, null, 2));
      const res = await appOperation.customer.fiat_convert_quotes(payload).catch((err) => {
        console.error("❌ [BUY_CRYPTO] QUOTE API CATCH ERROR:", err);
        return null;
      });
      console.log("⬅️ [BUY_CRYPTO] QUOTE API RESPONSE:", JSON.stringify(res, null, 2));

      if (res?.success && res?.data) {
        setConfirmQuote(res.data);
      } else {
        console.warn("⚠️ [BUY_CRYPTO] QUOTE API unsuccessful or missing data, falling back to client preview");
        setConfirmQuote({
          ...preview,
          id: newIdempotencyKey("mock_qt"),
        });
      }
      rbSheetConfirm.current?.open();
    } catch (e) {
      console.error("❌ [BUY_CRYPTO] handleReviewOrder EXCEPTION:", e);
      setConfirmQuote({
        ...preview,
        id: newIdempotencyKey("mock_qt"),
      });
      rbSheetConfirm.current?.open();
    } finally {
      setQuoting(false);
    }
  };

  // Execute Order
  const handleExecuteConvert = async () => {
    if (!confirmQuote || executing) return;
    setExecuting(true);
    try {
      const quoteId = String(confirmQuote.id || confirmQuote._id || confirmQuote.quote_id || "");
      const key = newIdempotencyKey("cv");
      const executePayload = { quote_id: quoteId };
      const headers = { "Idempotency-Key": key };

      console.log("➡️ [BUY_CRYPTO] EXECUTE API REQUEST payload:", JSON.stringify(executePayload), "headers:", JSON.stringify(headers));

      const res = await appOperation.customer
        .fiat_convert_execute(executePayload, headers)
        .catch((err) => {
          console.error("❌ [BUY_CRYPTO] EXECUTE API CATCH ERROR:", err);
          return err;
        });

      console.log("⬅️ [BUY_CRYPTO] EXECUTE API RESPONSE:", JSON.stringify(res, null, 2));

      if (res?.success || res?.code === 200 || (!res?.error && res?.data)) {
        console.log("✅ [BUY_CRYPTO] CONVERT EXECUTION SUCCESS");
        showSuccess("Conversion executed successfully!");
        rbSheetConfirm.current?.close();
        setAmount("");
        fetchBalance();
      } else {
        const msg = res?.message || res?.error?.message || "Convert failed. Please try again.";
        console.warn("⚠️ [BUY_CRYPTO] CONVERT EXECUTION FAILED with message:", msg);
        showError(msg);
      }
    } catch (err) {
      console.error("❌ [BUY_CRYPTO] handleExecuteConvert EXCEPTION:", err);
      showError("Order execution failed. Please try again.");
    } finally {
      setExecuting(false);
    }
  };

  // History Flow
  const handleOpenHistory = () => {
    if (!loggedIn) {
      NavigationService.navigate(NAVIGATION_AUTH_STACK, { screen: LOGIN_SCREEN });
      return;
    }
    NavigationService.navigate(CONVERT_HISTORY_SCREEN);
  };

  const RootContainer = isEmbedded ? View : AppSafeAreaView;
  const ScrollWrap = isEmbedded ? View : ScrollView;

  return (
    <RootContainer style={{ backgroundColor: themeColors.background, flex: 1 }}>
      {/* Top Header only when standalone screen */}
      {!isEmbedded && (
        <View style={[styles.header, { borderBottomColor: isDark ? themeColors.border : "#EEEEEE" }]}>
          <TouchableOpacity
            onPress={() => {
              if (navigation?.canGoBack?.()) {
                navigation.goBack();
                return;
              }
              NavigationService.navigate(NAVIGATION_BOTTOM_TAB_STACK, {
                screen: HOME_SCREEN,
              });
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.headerBtn}
          >
            <FastImage
              source={back_ic}
              style={{ width: 18, height: 18 }}
              resizeMode={FastImage.resizeMode.contain}
              tintColor={themeColors.text}
            />
          </TouchableOpacity>

          <AppText weight={SEMI_BOLD} style={[styles.headerTitle, { color: themeColors.text }]}>
            Swap
          </AppText>

          <TouchableOpacity onPress={handleOpenHistory} style={styles.headerBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <FastImage
              source={historyIcon}
              style={{ width: 20, height: 20 }}
              resizeMode={FastImage.resizeMode.contain}
              tintColor={themeColors.text}
            />
          </TouchableOpacity>
        </View>
      )}

      <ScrollWrap
        contentContainerStyle={!isEmbedded ? styles.scrollContent : undefined}
        style={isEmbedded ? styles.embeddedContent : undefined}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Page Title with History Icon */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={[styles.pageTitle, { color: isDark ? "#FFFFFF" : "#111827", marginBottom: 0 }]}>
            {isBuy ? `Buy ${crypto?.code || "USDT"} with ${fiat?.code || "AED"}` : `Sell ${crypto?.code || "USDT"} for ${fiat?.code || "AED"}`}
          </Text>
          {isEmbedded && (
            <TouchableOpacity
              onPress={handleOpenHistory}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{ padding: 4 }}
            >
              <FastImage
                source={historyIcon}
                style={{ width: 20, height: 20 }}
                resizeMode={FastImage.resizeMode.contain}
                tintColor={themeColors.text}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Main Card Wrapper */}
        <View
          style={[
            styles.tradeCard,
            {
              backgroundColor: isDark ? "transparent" : "#FFFFFF",
              borderColor: cardBorder,
            },
          ]}
        >
          {/* Buy / Sell Tabs */}
          <View
            style={[
              styles.tabsRow,
              {
                backgroundColor: tabIdleBg,
                borderBottomColor: cardBorder,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleToggleSide("buy")}
              style={[
                styles.tabBtn,
                styles.tabBtnLeft,
                {
                  backgroundColor: isBuy ? tabActiveBg : tabIdleBg,
                  borderBottomWidth: isBuy ? 0 : 1,
                  borderBottomColor: cardBorder,
                },
              ]}
            >
              {isBuy && (
                <View
                  style={[
                    styles.activeIndicatorBar,
                    { backgroundColor: "#00C087" },
                  ]}
                />
              )}
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isBuy
                      ? "#00C087"
                      : mutedText,
                    fontWeight: isBuy ? "800" : "600",
                    fontSize: isBuy ? 17 : 15,
                  },
                ]}
              >
                Buy
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleToggleSide("sell")}
              style={[
                styles.tabBtn,
                styles.tabBtnRight,
                {
                  backgroundColor: !isBuy ? tabActiveBg : tabIdleBg,
                  borderBottomWidth: !isBuy ? 0 : 1,
                  borderBottomColor: cardBorder,
                },
              ]}
            >
              {!isBuy && (
                <View
                  style={[
                    styles.activeIndicatorBar,
                    { backgroundColor: "#FF4D4F" },
                  ]}
                />
              )}
              <Text
                style={[
                  styles.tabText,
                  {
                    color: !isBuy
                      ? "#FF4D4F"
                      : mutedText,
                    fontWeight: !isBuy ? "800" : "600",
                    fontSize: !isBuy ? 17 : 15,
                  },
                ]}
              >
                Sell
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardInnerContent}>
            {/* Spend Box */}
            <View
              style={[
                styles.fieldBox,
                {
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                },
              ]}
            >
              <Text style={[styles.fieldLabel, { color: mutedText }]}>
                {isBuy ? "Spend" : "Sell"}
              </Text>
              <View style={styles.fieldRow}>
                <TextInput
                  style={[styles.fieldInput, { color: themeColors.text }]}
                  placeholder={isBuy ? "0.00 min" : "0.00"}
                  placeholderTextColor={mutedText}
                  cursorColor={themeColors.text}
                  keyboardType="decimal-pad"
                  value={spendAmountValue}
                  onChangeText={(text) => {
                    setInputField("spend");
                    setAmount(sanitizeAmountInput(text));
                  }}
                />

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => handleOpenAssetPicker("spend")}
                  style={styles.fieldPill}
                >
                  {isBuy ? (
                    <View style={styles.fiatCircle}>
                      <Text style={styles.fiatCircleText}>Dh</Text>
                    </View>
                  ) : (
                    <FastImage
                      source={CRYPTO_ICON_MAP[spendAsset?.code] || tetherIcon}
                      style={styles.cryptoIcon}
                      resizeMode={FastImage.resizeMode.contain}
                    />
                  )}
                  <Text style={[styles.pillCodeText, { color: isDark ? "#FFFFFF" : "#111827" }]}>
                    {spendAsset?.code || "—"}
                  </Text>
                  <FastImage
                    source={downIcon}
                    style={styles.pillCaret}
                    tintColor={isDark ? "#9CA3AF" : "#6B7280"}
                    resizeMode={FastImage.resizeMode.contain}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Receive Box */}
            <View
              style={[
                styles.fieldBox,
                {
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  marginTop: 12,
                },
              ]}
            >
              <Text style={[styles.fieldLabel, { color: mutedText }]}>
                Receive
              </Text>
              <View style={styles.fieldRow}>
                <TextInput
                  style={[styles.fieldInput, { color: themeColors.text }]}
                  placeholder="0"
                  placeholderTextColor={mutedText}
                  cursorColor={themeColors.text}
                  keyboardType="decimal-pad"
                  value={receiveAmountValue}
                  onChangeText={(text) => {
                    setInputField("receive");
                    setAmount(sanitizeAmountInput(text));
                  }}
                />

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => handleOpenAssetPicker("receive")}
                  style={styles.fieldPill}
                >
                  {!isBuy ? (
                    <View style={styles.fiatCircle}>
                      <Text style={styles.fiatCircleText}>Dh</Text>
                    </View>
                  ) : (
                    <FastImage
                      source={CRYPTO_ICON_MAP[receiveAsset?.code] || tetherIcon}
                      style={styles.cryptoIcon}
                      resizeMode={FastImage.resizeMode.contain}
                    />
                  )}
                  <Text style={[styles.pillCodeText, { color: isDark ? "#FFFFFF" : "#111827" }]}>
                    {receiveAsset?.code || "—"}
                  </Text>
                  <FastImage
                    source={downIcon}
                    style={styles.pillCaret}
                    tintColor={isDark ? "#9CA3AF" : "#6B7280"}
                    resizeMode={FastImage.resizeMode.contain}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Balance & Ticket Hint Rows */}
            <View style={styles.hintsWrap}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text
                  style={[
                    styles.hintText,
                    {
                      color: insufficientBalance
                        ? "#FF4D4F"
                        : mutedText,
                    },
                  ]}
                >
                  {loggedIn
                    ? `Spot available: ${formatQuoteAmount(spotBalance, spendAsset?.qty_decimals)} ${spendAsset?.code || ""}${insufficientBalance ? " · Not enough balance" : ""}`
                    : "Log in to see spot balance"}
                </Text>
                {loggedIn && (
                  <TouchableOpacity onPress={handleSetMax} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Text style={{ color: "#D1AA67", fontSize: 12, fontWeight: "700" }}>MAX</Text>
                  </TouchableOpacity>
                )}
              </View>
              {isBuy && (
                <Text style={[styles.hintText, { color: mutedText, marginTop: 4 }]}>
                  Ticket 0.00 min {fiat?.code || "AED"}
                </Text>
              )}
            </View>

            {/* Summary Details Box */}
            <View
              style={[
                styles.quotePanel,
                {
                  backgroundColor: isDark ? "transparent" : "#F9FAFB",
                  borderColor: cardBorder,
                },
              ]}
            >
              <View style={styles.quoteRow}>
                <Text style={[styles.quoteLabel, { color: mutedText }]}>Mid</Text>
                <Text style={[styles.quoteVal, { color: isDark ? "#D1D5DB" : "#374151" }]}>
                  {preview ? `${preview.cmc_rate} ${fiat?.code || "AED"}` : "—"}
                </Text>
              </View>

              <View style={styles.quoteRow}>
                <Text style={[styles.quoteLabel, { color: mutedText }]}>Fee</Text>
                <Text style={[styles.quoteVal, { color: isDark ? "#D1D5DB" : "#374151" }]}>
                  {preview ? "0.00 AED" : "—"}
                </Text>
              </View>

              <View style={styles.quoteRow}>
                <Text style={[styles.quoteLabel, { color: mutedText }]}>You receive</Text>
                <Text style={[styles.quoteVal, { color: isDark ? "#D1D5DB" : "#374151" }]}>
                  {preview ? `${formatQuoteAmount(preview.you_receive, receiveAsset?.qty_decimals)} ${receiveAsset?.code}` : "—"}
                </Text>
              </View>

              <View style={styles.quoteRow}>
                <Text style={[styles.quoteLabel, { color: mutedText }]}>You spend</Text>
                <Text style={[styles.quoteVal, { color: isDark ? "#D1D5DB" : "#374151" }]}>
                  {preview ? `${formatQuoteAmount(preview.you_spend, spendAsset?.qty_decimals)} ${spendAsset?.code}` : "—"}
                </Text>
              </View>

              <View style={styles.quoteRow}>
                <Text style={[styles.quoteLabel, { color: mutedText }]}>Rate</Text>
                <Text style={[styles.quoteValRate, { color: isDark ? "#E5E7EB" : "#111827" }]}>
                  {liveRateText}
                </Text>
              </View>

              <Text style={styles.quoteCountdown}>
                {preview?.stale
                  ? "Price may be delayed"
                  : preview
                    ? "Live price updates automatically"
                    : "Enter AED or crypto — either field calculates the other"}
              </Text>
            </View>

            {/* CTA Button */}
            <View style={{ marginTop: 22 }}>
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={quoting || (loggedIn && (!isPositiveMoneyString(spendAmountValue) || insufficientBalance))}
                onPress={handleReviewOrder}
                style={[
                  styles.ctaPillBtn,
                  {
                    backgroundColor: !loggedIn
                      ? colors.buttonBg
                      : !isPositiveMoneyString(spendAmountValue) || insufficientBalance
                        ? isDark
                          ? colors.buttonBg
                          : "#DFE2E8"
                        : isBuy
                          ? "#01bc8d"
                          : "#e45561",
                  },
                ]}
              >
                {quoting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text
                    style={[
                      styles.ctaPillText,
                      {
                        color: !loggedIn || (isPositiveMoneyString(spendAmountValue) && !insufficientBalance)
                          ? "#FFFFFF"
                          : isDark
                            ? "#6B7280"
                            : "#8A94A6",
                      },
                    ]}
                  >
                    {!loggedIn
                      ? "Log In to Continue"
                      : !isPositiveMoneyString(spendAmountValue)
                        ? "Enter amount"
                        : insufficientBalance
                          ? `Insufficient ${spendAsset?.code} Balance`
                          : "Confirm"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollWrap>

      {/* Asset Picker Bottom Sheet */}
      <AnimatedBottomSheet
        ref={rbSheetAssetPicker}
        sheetHeight={Math.min(SCREEN_HEIGHT * 0.74, 560)}
        isDark={isDark}
      >
        <View style={styles.sheetInner}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: sheetTheme.textColor }]}>
              Select Currency
            </Text>
            <TouchableOpacity
              onPress={() => rbSheetAssetPicker.current?.close()}
              style={[styles.closeCircle, { backgroundColor: sheetTheme.closeCircleBg }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.75}
            >
              <FastImage
                source={closeIcon}
                style={styles.closeIcon}
                resizeMode={FastImage.resizeMode.contain}
                tintColor={sheetTheme.iconTint}
              />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.searchRow,
              {
                backgroundColor: sheetTheme.cardBg,
                borderColor: sheetTheme.borderColor,
              },
            ]}
          >
            <FastImage
              source={searchIcon}
              style={styles.searchGlyph}
              resizeMode={FastImage.resizeMode.contain}
              tintColor={isDark ? "rgba(255,255,255,0.65)" : "#595757"}
            />
            <TextInput
              placeholder="Search token"
              placeholderTextColor={sheetTheme.subTextColor}
              style={[styles.searchInput, { color: sheetTheme.textColor }]}
              value={pickerSearch}
              onChangeText={setPickerSearch}
              cursorColor={sheetTheme.textColor}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
          </View>

          <FlatList
            data={pickerOptions}
            keyExtractor={(item) => item.code}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => {
              const isFiat = item.kind === "FIAT";
              const isSelected =
                (pickerType === "spend" && spendAsset?.code === item.code) ||
                (pickerType === "receive" && receiveAsset?.code === item.code);

              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleSelectAsset(item)}
                  style={[
                    styles.assetListItem,
                    {
                      borderBottomColor: sheetTheme.rowBorderColor,
                    },
                    isSelected && {
                      backgroundColor: isDark ? "rgba(209, 170, 103, 0.1)" : "rgba(209, 170, 103, 0.08)",
                    },
                  ]}
                >
                  {isFiat ? (
                    <View style={[styles.fiatCircle, { width: 32, height: 32, borderRadius: 16 }]}>
                      <AppText weight={BOLD} style={{ color: "#FFFFFF", fontSize: 13 }}>
                        {item.code === "AED" ? "Dh" : item.code?.slice(0, 2)}
                      </AppText>
                    </View>
                  ) : (
                    <FastImage
                      source={CRYPTO_ICON_MAP[item.code] || tetherIcon}
                      style={{ width: 32, height: 32, borderRadius: 16 }}
                      resizeMode={FastImage.resizeMode.contain}
                    />
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.assetCodeText, { color: sheetTheme.textColor }]}>
                      {item.code}
                    </Text>
                    <Text style={[styles.assetNameText, { color: sheetTheme.subTextColor }]}>
                      {item.name}
                    </Text>
                  </View>
                  {isSelected && (
                    <Text style={{ color: GOLD, fontSize: 15, fontWeight: "700" }}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </AnimatedBottomSheet>

      {/* Review Order Bottom Sheet Modal */}
      <AnimatedBottomSheet
        ref={rbSheetConfirm}
        sheetHeight={Math.min(SCREEN_HEIGHT * 0.84, 550)}
        isDark={isDark}
      >
        <View style={styles.confirmSheetInner}>
          <View style={styles.confirmSheetHead}>
            <Text style={[styles.confirmSheetTitle, { color: isDark ? "#FFFFFF" : "#111827" }]}>
              Confirm convert
            </Text>
            <TouchableOpacity
              onPress={() => rbSheetConfirm.current?.close()}
              disabled={executing}
              style={styles.confirmCloseBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <FastImage
                source={closeIcon}
                style={styles.closeIconSmall}
                resizeMode={FastImage.resizeMode.contain}
                tintColor={isDark ? "#8E9BAE" : "#8A94A6"}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.confirmBodyScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.confirmQuoteList}>
              <View style={styles.confirmItem}>
                <Text style={[styles.confirmItemLabel, { color: isDark ? "#8E9BAE" : "#8A94A6" }]}>Mid</Text>
                <Text style={[styles.confirmItemValue, { color: isDark ? "#FFFFFF" : "#111827" }]}>
                  {quoteMidLine(confirmQuote, fiat?.code, crypto?.code) || `${confirmQuote?.you_spend || "1.00"} ${isBuy ? fiat?.code : crypto?.code} = ${confirmQuote?.you_receive || "3.67"} ${isBuy ? crypto?.code : fiat?.code}`}
                </Text>
              </View>

              <View style={styles.confirmItem}>
                <Text style={[styles.confirmItemLabel, { color: isDark ? "#8E9BAE" : "#8A94A6" }]}>Fee</Text>
                <Text style={[styles.confirmItemValue, { color: isDark ? "#FFFFFF" : "#111827" }]}>
                  {quoteFeeLabel(confirmQuote, formatAedAmount)}
                </Text>
              </View>

              <View style={styles.confirmItem}>
                <Text style={[styles.confirmItemLabel, { color: isDark ? "#8E9BAE" : "#8A94A6" }]}>You receive</Text>
                <Text style={[styles.confirmItemValue, { color: isDark ? "#FFFFFF" : "#111827" }]}>
                  {formatQuoteAmount(confirmQuote?.you_receive, isBuy ? crypto?.qty_decimals : fiat?.qty_decimals)}{" "}
                  {isBuy ? crypto?.code : fiat?.code}
                </Text>
              </View>

              <View style={styles.confirmItem}>
                <Text style={[styles.confirmItemLabel, { color: isDark ? "#8E9BAE" : "#8A94A6" }]}>You spend</Text>
                <Text style={[styles.confirmItemValue, { color: isDark ? "#FFFFFF" : "#111827" }]}>
                  {formatQuoteAmount(confirmQuote?.you_spend, isBuy ? fiat?.qty_decimals : crypto?.qty_decimals)}{" "}
                  {isBuy ? fiat?.code : crypto?.code}
                </Text>
              </View>

              <View style={styles.confirmItem}>
                <Text style={[styles.confirmItemLabel, { color: isDark ? "#8E9BAE" : "#8A94A6" }]}>Rate</Text>
                <Text style={[styles.confirmItemValue, { color: isDark ? "#FFFFFF" : "#111827" }]}>
                  1 {crypto?.code} ≈ {confirmQuote?.cmc_rate || confirmQuote?.user_rate || "3.673"} {fiat?.code}
                </Text>
              </View>
            </View>

            <Text style={[styles.confirmQuoteHint, { color: isDark ? "#8E9BAE" : "#8A94A6" }]}>
              Confirm spends from your spot wallet immediately. Only this confirm creates a history row.
            </Text>

            <View style={styles.confirmBtnWrap}>
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={executing}
                onPress={handleExecuteConvert}
                style={[
                  styles.confirmFullBtn,
                  {
                    backgroundColor: isBuy ? "#01bc8d" : "#e45561",
                    opacity: executing ? 0.7 : 1,
                  },
                ]}
              >
                {executing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmFullBtnText}>
                    Confirm
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </AnimatedBottomSheet>
    </RootContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  embeddedContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },
  tradeCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  tabsRow: {
    flexDirection: "row",
    height: 52,
    borderBottomWidth: 1,
    position: "relative",
  },
  tabBtn: {
    flex: 1,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  tabBtnLeft: {
    borderTopLeftRadius: 16,
  },
  tabBtnRight: {
    borderTopRightRadius: 16,
  },
  activeIndicatorBar: {
    position: "absolute",
    top: 0,
    left: 28,
    right: 28,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  tabText: {
    fontSize: 16,
  },
  cardInnerContent: {
    padding: 16,
  },
  fieldBox: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  fieldPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 8,
  },
  fiatCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#C9A227",
    alignItems: "center",
    justifyContent: "center",
  },
  fiatCircleText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  cryptoIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  pillCodeText: {
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 2,
  },
  pillCaret: {
    width: 10,
    height: 10,
    marginLeft: 2,
  },
  hintsWrap: {
    marginTop: 12,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  hintText: {
    fontSize: 13,
  },
  quotePanel: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  quoteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quoteLabel: {
    fontSize: 13,
  },
  quoteVal: {
    fontSize: 13,
    fontWeight: "500",
  },
  quoteValRate: {
    fontSize: 13,
    fontWeight: "600",
  },
  quoteCountdown: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
  ctaPillBtn: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaBtn: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaPillText: {
    fontSize: 15,
    fontWeight: "700",
  },
  sheetInner: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  closeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: {
    width: 14,
    height: 14,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 4,
    marginBottom: 12,
    minHeight: 42,
  },
  searchGlyph: {
    width: 14,
    height: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
    paddingHorizontal: 0,
    minHeight: 36,
  },
  assetListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  assetCodeText: {
    fontSize: 15,
    fontWeight: "700",
  },
  assetNameText: {
    fontSize: 12,
    marginTop: 2,
  },
  confirmSheetInner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  confirmSheetHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },
  confirmSheetTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  confirmCloseBtn: {
    padding: 4,
  },
  closeIconSmall: {
    width: 16,
    height: 16,
  },
  confirmBodyScroll: {
    flex: 1,
  },
  confirmQuoteList: {
    gap: 18,
  },
  confirmItem: {
    gap: 5,
  },
  confirmItemLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  confirmItemValue: {
    fontSize: 17,
    fontWeight: "700",
  },
  confirmQuoteHint: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  confirmBtnWrap: {
    marginTop: 14,
    paddingBottom: 20,
  },
  confirmFullBtn: {
    width: "100%",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmFullBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  historyCard: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export default BuyCryptoScreen;
