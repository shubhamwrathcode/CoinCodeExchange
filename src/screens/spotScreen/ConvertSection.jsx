import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
  ScrollView,
} from "react-native";
import FastImage from "react-native-fast-image";
import { AppText, SEMI_BOLD, MEDIUM, Button } from "../../shared";
import { colors, lightTheme } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";
import {
  downIcon,
  bitcoinIcon,
  usdtIcon,
  add,
  transferNew,
  Polygon,
  REMOVE,
  historyIcon,
  INFO,
  bnbIcon,
  trxIcon,
  onchain_ic,
  p2p_ic,
  fiat_ic,
  infoNewIc
} from "../../helper/ImageAssets";
import NavigationService from "../../navigation/NavigationService";
import SimpleToast from "react-native-simple-toast";
import { fontFamilyMedium } from "../../theme/typography";
import { useAppSelector } from "../../store/hooks";
import RBSheet from "react-native-raw-bottom-sheet";
import Ionicons from "react-native-vector-icons/Ionicons";

const ConvertSection = () => {
  const { colors: themeColors, isDark } = useTheme();

  // Refs
  const rbSheetCoinSelect = useRef();
  const rbSheetPreview = useRef();
  const rbSheetAddFunds = useRef();

  // State variables
  const [isConvertActive, setIsConvertActive] = useState(true);
  const [spendCoin, setSpendCoin] = useState("USDT");
  const [receiveCoin, setReceiveCoin] = useState("BTC");
  const [spendAmount, setSpendAmount] = useState("");
  const [receiveAmount, setReceiveAmount] = useState("");
  const [isSelectingSpend, setIsSelectingSpend] = useState(true);
  const [previewTimer, setPreviewTimer] = useState(5);
  const [previewFromAmount, setPreviewFromAmount] = useState("");
  const [previewToAmount, setPreviewToAmount] = useState("");

  // Available coins list
  const availableCoins = [
    { symbol: "USDT", fullName: "Tether", icon: usdtIcon, color: "#26A17B" },
    { symbol: "BTC", fullName: "Bitcoin", icon: bitcoinIcon, color: "#F7931A" },
    { symbol: "OG", fullName: "Zero A...", icon: Polygon, color: "#8247E5", isAlpha: true },
    { symbol: "BNB", fullName: "BNB", icon: bnbIcon, color: "#F0B90B" },
    { symbol: "TRX", fullName: "TRON", icon: trxIcon, color: "#EC0928" },
  ];

  // Add Funds Options
  const addFundsOptions = [
    {
      id: "deposit",
      label: "Onchain Deposit",
      description: "Securely transfer crypto from external wallets or exchanges.",
      icon: onchain_ic,
      action: () => {
        rbSheetAddFunds.current?.close();
        SimpleToast.show("Deposit screen coming soon");
      }
    },
    {
      id: "p2p",
      label: "P2P Trading",
      description: "Trade crypto with zero fees and flexible payment options.",
      icon: p2p_ic,
      action: () => {
        rbSheetAddFunds.current?.close();
        SimpleToast.show("P2P trading coming soon");
      }
    },
    {
      id: "fiat",
      label: "Buy with Fiat",
      description: "Instantly buy crypto using cards, bank transfers, and more.",
      icon: fiat_ic,
      action: () => {
        rbSheetAddFunds.current?.close();
        SimpleToast.show("Buy with Fiat coming soon");
      }
    }
  ];

  // Dynamic balances from Redux
  const coinBalance = useAppSelector((state) => state.home.coinBalance);

  const getBalance = (symbol) => {
    if (coinBalance) {
      if (symbol === coinBalance.base_currency) {
        return coinBalance.base_currency_balance || 0;
      }
      if (symbol === coinBalance.quote_currency) {
        return coinBalance.quote_currency_balance || 0;
      }
    }
    // Fallback mock balances
    const mockBalances = {
      USDT: 1540.25,
      BTC: 0.1254,
      OG: 0,
      BNB: 2.5,
      TRX: 850.0,
    };
    return mockBalances[symbol] !== undefined ? mockBalances[symbol] : 0;
  };

  // Mock exchange rates relative to USDT
  const ratesInUSDT = {
    USDT: 1.0,
    BTC: 68000.0,
    OG: 0.5,
    BNB: 600.0,
    TRX: 0.12,
  };

  const getExchangeRate = () => {
    const rateFrom = ratesInUSDT[spendCoin] || 1.0;
    const rateTo = ratesInUSDT[receiveCoin] || 1.0;
    return rateFrom / rateTo;
  };

  const handleSpendAmountChange = (val) => {
    setSpendAmount(val);
    if (!val || isNaN(parseFloat(val))) {
      setReceiveAmount("");
      return;
    }
    const rate = getExchangeRate();
    const converted = parseFloat(val) * rate;
    setReceiveAmount(converted < 0.000001 ? converted.toFixed(8) : converted.toFixed(6));
  };

  const handleReceiveAmountChange = (val) => {
    setReceiveAmount(val);
    if (!val) {
      setSpendAmount("");
    }
  };

  const handleSwapCoins = () => {
    const temp = spendCoin;
    setSpendCoin(receiveCoin);
    setReceiveCoin(temp);
    setSpendAmount("");
    setReceiveAmount("");
  };

  const handleSelectCoin = (symbol) => {
    if (isSelectingSpend) {
      if (symbol === receiveCoin) {
        // Swap if same coin is chosen
        setReceiveCoin(spendCoin);
      }
      setSpendCoin(symbol);
    } else {
      if (symbol === spendCoin) {
        // Swap if same coin is chosen
        setSpendCoin(receiveCoin);
      }
      setReceiveCoin(symbol);
    }
    setSpendAmount("");
    setReceiveAmount("");
    rbSheetCoinSelect.current?.close();
  };

  const handleMax = () => {
    const maxVal = getBalance(spendCoin);
    setSpendAmount(maxVal.toString());
    const rate = getExchangeRate();
    const converted = maxVal * rate;
    setReceiveAmount(converted < 0.000001 ? converted.toFixed(8) : converted.toFixed(6));
  };

  const handlePreview = () => {
    SimpleToast.show("Coming Soon");
    return
    let activeSpend = spendAmount;
    let activeReceive = receiveAmount;

    // If spendAmount is empty but receiveAmount is filled, calculate spendAmount for preview
    if ((!activeSpend || parseFloat(activeSpend) <= 0) && (activeReceive && parseFloat(activeReceive) > 0)) {
      const rate = getExchangeRate();
      const calculatedSpend = parseFloat(activeReceive) / rate;
      activeSpend = calculatedSpend < 0.000001 ? calculatedSpend.toFixed(8) : calculatedSpend.toFixed(6);
    }

    if (!activeSpend || parseFloat(activeSpend) <= 0 || !activeReceive || parseFloat(activeReceive) <= 0) {
      SimpleToast.show("Please enter a valid amount");
      return;
    }

    setPreviewFromAmount(activeSpend);
    setPreviewToAmount(activeReceive);
    setPreviewTimer(5);
    rbSheetPreview.current?.open();
  };

  // Preview countdown effect
  useEffect(() => {
    let interval = null;
    if (previewTimer > 0) {
      interval = setInterval(() => {
        setPreviewTimer((prev) => prev - 1);
      }, 1000);
    } else if (previewTimer === 0) {
      // Reset countdown to 5 automatically (real price refresh simulator)
      setPreviewTimer(5);
    }
    return () => clearInterval(interval);
  }, [previewTimer]);

  const handleConfirmConvert = () => {
    rbSheetPreview.current?.close();
    SimpleToast.show(`Successfully converted ${previewFromAmount} ${spendCoin} to ${previewToAmount} ${receiveCoin}!`);
    setSpendAmount("");
    setReceiveAmount("");
    setPreviewFromAmount("");
    setPreviewToAmount("");
  };

  const handleIncreaseFunds = () => {
    rbSheetPreview.current?.close();
    setTimeout(() => {
      rbSheetAddFunds.current?.open();
    }, 350);
  };

  const getCoinIcon = (symbol) => {
    const coin = availableCoins.find((c) => c.symbol === symbol);
    return coin ? coin.icon : undefined;
  };

  const getCoinColor = (symbol) => {
    const coin = availableCoins.find((c) => c.symbol === symbol);
    return coin ? coin.color : "#99A6AF";
  };

  const getCoinFullName = (symbol) => {
    const coin = availableCoins.find((c) => c.symbol === symbol);
    return coin ? coin.fullName : symbol;
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#171a20" : colors.white }}>
      {/* Tab Row (Convert / Auto-Invest) */}
      <View style={styles.tabRow}>
        <View style={styles.leftChips}>
          <TouchableOpacity
            onPress={() => setIsConvertActive(true)}
            style={[
              styles.chipButton,
              isConvertActive && { backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7" }
            ]}
          >
            <AppText
              weight={SEMI_BOLD}
              style={{
                fontSize: 14,
                color: isConvertActive ? themeColors.text : themeColors.secondaryText
              }}
            >
              Convert
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setIsConvertActive(false);
              SimpleToast.show("Auto-Invest coming soon");
              setIsConvertActive(true);
            }}
            style={styles.chipButton}
          >
            <AppText
              style={{
                fontSize: 14,
                color: themeColors.secondaryText
              }}
            >
              Auto-Invest 🔥
            </AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.rightIcons}>
          <TouchableOpacity
            onPress={() => NavigationService.navigate("CONVERT_HISTORY_SCREEN")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <FastImage
              source={historyIcon}
              style={{ width: 20, height: 20 }}
              resizeMode="contain"
              tintColor={themeColors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => SimpleToast.show("Convert guide coming soon")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <FastImage
              source={infoNewIc}
              style={{ width: 20, height: 20 }}
              resizeMode="contain"
              tintColor={themeColors.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
      >
        {/* Spend Card */}
        <View style={[styles.cardContainer, { backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7" }]}>
          <View style={styles.cardHeader}>
            <AppText style={{ fontSize: 13, color: themeColors.secondaryText }}>Spend</AppText>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <AppText style={{ fontSize: 13, color: themeColors.secondaryText }}>
                Available: {getBalance(spendCoin)} {spendCoin}
              </AppText>
              <TouchableOpacity onPress={() => NavigationService.navigate("DEPOSIT_COIN_SCREEN")}>
                <FastImage
                  source={add}
                  style={{ width: 14, height: 14 }}
                  resizeMode="contain"
                  tintColor={themeColors.secondaryText}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.cardBody}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setIsSelectingSpend(true);
                rbSheetCoinSelect.current?.open();
              }}
              style={styles.coinSelector}
            >
              {getCoinIcon(spendCoin) ? (
                <FastImage source={getCoinIcon(spendCoin)} style={styles.coinIcon} resizeMode="contain" />
              ) : (
                <View style={[styles.coinFallback, { backgroundColor: getCoinColor(spendCoin) }]}>
                  <AppText weight={SEMI_BOLD} style={{ color: colors.white, fontSize: 13 }}>
                    {spendCoin.charAt(0)}
                  </AppText>
                </View>
              )}
              <AppText weight={SEMI_BOLD} style={{ fontSize: 16, color: themeColors.text, marginLeft: 8 }}>
                {spendCoin}
              </AppText>
              <FastImage source={downIcon} style={{ width: 10, height: 10, marginLeft: 6 }} tintColor={themeColors.secondaryText} resizeMode="contain" />
            </TouchableOpacity>

            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <TextInput
                placeholder="1-10,000,000"
                placeholderTextColor={isDark ? "#5A5A5C" : "#C7C7CC"}
                keyboardType="numeric"
                value={spendAmount}
                onChangeText={handleSpendAmountChange}
                cursorColor={colors.black}
                style={[styles.amountInput, { color: themeColors.text }]}
              />
              <TouchableOpacity onPress={handleMax} style={[styles.maxBadge, { backgroundColor: isDark ? "#2C2C2E" : "#E5E5EA" }]}>
                <AppText weight={SEMI_BOLD} style={{ fontSize: 11, color: themeColors.text }}>Max</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Swap Button Circle */}
        <View style={styles.swapWrapper}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleSwapCoins}
            style={[
              styles.swapCircle,
              {
                backgroundColor: colors.iconBgColor,
                borderColor: colors.white,
              },
            ]}
          >
            <FastImage
              source={transferNew}
              style={{ width: 18, height: 18 }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* Receive Card */}
        <View style={[styles.cardContainer, { backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7", marginTop: 4 }]}>
          <View style={styles.cardHeader}>
            <AppText style={{ fontSize: 13, color: themeColors.secondaryText }}>Receive</AppText>
            <AppText style={{ fontSize: 13, color: themeColors.secondaryText }}>
              Available: {getBalance(receiveCoin)} {receiveCoin}
            </AppText>
          </View>

          <View style={styles.cardBody}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setIsSelectingSpend(false);
                rbSheetCoinSelect.current?.open();
              }}
              style={styles.coinSelector}
            >
              {getCoinIcon(receiveCoin) ? (
                <FastImage source={getCoinIcon(receiveCoin)} style={styles.coinIcon} resizeMode="contain" />
              ) : (
                <View style={[styles.coinFallback, { backgroundColor: getCoinColor(receiveCoin) }]}>
                  <AppText weight={SEMI_BOLD} style={{ color: colors.white, fontSize: 13 }}>
                    {receiveCoin.charAt(0)}
                  </AppText>
                </View>
              )}
              <AppText weight={SEMI_BOLD} style={{ fontSize: 16, color: themeColors.text, marginLeft: 8 }}>
                {receiveCoin}
              </AppText>
              <FastImage source={downIcon} style={{ width: 10, height: 10, marginLeft: 6 }} tintColor={themeColors.secondaryText} resizeMode="contain" />
            </TouchableOpacity>

            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <TextInput
                placeholder="0.000013-123"
                placeholderTextColor={isDark ? "#5A5A5C" : "#C7C7CC"}
                keyboardType="numeric"
                value={receiveAmount}
                onChangeText={handleReceiveAmountChange}
                cursorColor={colors.black}
                style={[styles.amountInput, { color: themeColors.text }]}
              />
            </View>
          </View>
        </View>

        {/* Preview Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handlePreview}
          style={[styles.previewBtn, { backgroundColor: isDark ? "#2C2C2E" : "#1A1C1E", marginTop: 24 }]}
        >
          <AppText weight={SEMI_BOLD} style={{ color: colors.white, fontSize: 16 }}>Preview</AppText>
        </TouchableOpacity>
      </ScrollView>

      {/* Coin Selector RBSheet */}
      <RBSheet
        ref={rbSheetCoinSelect}
        closeOnDragDown={true}
        closeOnPressMask={true}
        height={600}
        animationType="slide"
        customStyles={{
          container: {
            backgroundColor: isDark ? "#171a20" : colors.white,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 24,
          },
          wrapper: {
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          },
          draggableIcon: {
            backgroundColor: isDark ? "#3A3A3C" : "#E5E5EA",
            width: 40,
          },
        }}
      >
        <View style={{ flex: 1 }}>
          {/* Active Spend / Receive selectors in sheet (Segmented style) */}
          <View style={[styles.sheetHeaderPanel, { backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7" }]}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsSelectingSpend(true)}
              style={[
                styles.sheetHeaderCard,
                isSelectingSpend ? [styles.sheetHeaderCardActive, { backgroundColor: isDark ? "#2C2C2E" : colors.white }] : { backgroundColor: "transparent" }
              ]}
            >
              <AppText style={[styles.sheetHeaderCardLabel, { color: themeColors.secondaryText }]}>Spend</AppText>
              <View style={styles.sheetHeaderCardCoin}>
                {getCoinIcon(spendCoin) ? (
                  <FastImage source={getCoinIcon(spendCoin)} style={styles.sheetCoinIcon} resizeMode="contain" />
                ) : (
                  <View style={[styles.coinFallback, { backgroundColor: getCoinColor(spendCoin), width: 16, height: 16, borderRadius: 8 }]}>
                    <AppText weight={SEMI_BOLD} style={{ color: colors.white, fontSize: 8 }}>
                      {spendCoin.charAt(0)}
                    </AppText>
                  </View>
                )}
                <AppText weight={SEMI_BOLD} style={[styles.sheetHeaderCardValue, { color: themeColors.text }]}>
                  {spendCoin}
                </AppText>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsSelectingSpend(false)}
              style={[
                styles.sheetHeaderCard,
                !isSelectingSpend ? [styles.sheetHeaderCardActive, { backgroundColor: isDark ? "#2C2C2E" : colors.white }] : { backgroundColor: "transparent" }
              ]}
            >
              <AppText style={[styles.sheetHeaderCardLabel, { color: themeColors.secondaryText }]}>Receive</AppText>
              <View style={styles.sheetHeaderCardCoin}>
                {getCoinIcon(receiveCoin) ? (
                  <FastImage source={getCoinIcon(receiveCoin)} style={styles.sheetCoinIcon} resizeMode="contain" />
                ) : (
                  <View style={[styles.coinFallback, { backgroundColor: getCoinColor(receiveCoin), width: 16, height: 16, borderRadius: 8 }]}>
                    <AppText weight={SEMI_BOLD} style={{ color: colors.white, fontSize: 8 }}>
                      {receiveCoin.charAt(0)}
                    </AppText>
                  </View>
                )}
                <AppText weight={SEMI_BOLD} style={[styles.sheetHeaderCardValue, { color: themeColors.text }]}>
                  {receiveCoin}
                </AppText>
              </View>
            </TouchableOpacity>
          </View>

          {/* Tabs: Single Coin / Multi Coins */}
          <View style={styles.sheetTabsRow}>
            <TouchableOpacity style={styles.sheetTabActive}>
              <AppText weight={SEMI_BOLD} style={[styles.sheetTabText, { color: themeColors.text }]}>Single Coin</AppText>
              <View style={[styles.sheetTabIndicator, { backgroundColor: themeColors.text }]} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetTabInactive} onPress={() => SimpleToast.show("Multi Coins coming soon")}>
              <AppText style={[styles.sheetTabText, { color: themeColors.secondaryText }]}>Multi Coins</AppText>
            </TouchableOpacity>
          </View>

          {/* Filter Pills */}
          <View style={styles.filterPillsRow}>
            <TouchableOpacity style={[styles.filterPill, { backgroundColor: isDark ? "#2C2C2E" : "#E5E5EA" }]}>
              <AppText weight={SEMI_BOLD} style={{ fontSize: 13, color: themeColors.text }}>All</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterPill} onPress={() => SimpleToast.show("Alpha filter coming soon")}>
              <AppText style={{ fontSize: 13, color: themeColors.secondaryText }}>Alpha</AppText>
            </TouchableOpacity>
          </View>

          {/* Coin List */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {availableCoins.map((item) => {
              const isSelected = isSelectingSpend ? spendCoin === item.symbol : receiveCoin === item.symbol;
              return (
                <TouchableOpacity
                  key={item.symbol}
                  activeOpacity={0.8}
                  onPress={() => handleSelectCoin(item.symbol)}
                  style={styles.sheetCoinRow}
                >
                  {item.icon ? (
                    <FastImage source={item.icon} style={{ width: 32, height: 32 }} resizeMode="contain" />
                  ) : (
                    <View style={[styles.coinFallback, { backgroundColor: item.color, width: 32, height: 32, borderRadius: 16 }]}>
                      <AppText weight={SEMI_BOLD} style={{ color: colors.white, fontSize: 12 }}>
                        {item.symbol.charAt(0)}
                      </AppText>
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <AppText weight={SEMI_BOLD} style={{ fontSize: 15, color: themeColors.text }}>
                        {item.symbol}
                      </AppText>
                      {item.isAlpha && (
                        <View style={styles.alphaBadge}>
                          <AppText weight={SEMI_BOLD} style={{ fontSize: 10, color: "#FC9803" }}>Alpha</AppText>
                        </View>
                      )}
                    </View>
                    <AppText style={{ fontSize: 12, color: themeColors.secondaryText, marginTop: 2 }}>
                      {item.fullName}
                    </AppText>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </RBSheet>

      {/* Preview Confirmation Dialog RBSheet */}
      <RBSheet
        ref={rbSheetPreview}
        closeOnDragDown={true}
        closeOnPressMask={true}
        height={380}
        animationType="slide"
        customStyles={{
          container: {
            backgroundColor: isDark ? "#171a20" : colors.white,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 24,
          },
          wrapper: {
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          },
          draggableIcon: {
            backgroundColor: isDark ? "#3A3A3C" : "#E5E5EA",
            width: 40,
          },
        }}
      >
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 14 }}>
            <AppText weight={SEMI_BOLD} style={{ fontSize: 18, color: themeColors.text }}>
              Confirm Order
            </AppText>
            <TouchableOpacity
              onPress={() => rbSheetPreview?.current?.close()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <FastImage source={REMOVE} style={{ width: 25, height: 25 }} resizeMode="contain" tintColor={themeColors.text} />
            </TouchableOpacity>
          </View>

          {/* Spend Section */}
          <View style={{ marginTop: 8 }}>
            <AppText style={{ fontSize: 13, color: themeColors.secondaryText }}>Spend</AppText>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {getCoinIcon(spendCoin) ? (
                  <FastImage source={getCoinIcon(spendCoin)} style={{ width: 24, height: 24 }} resizeMode="contain" />
                ) : (
                  <View style={[styles.coinFallback, { backgroundColor: getCoinColor(spendCoin), width: 24, height: 24, borderRadius: 12 }]}>
                    <AppText weight={SEMI_BOLD} style={{ color: colors.white, fontSize: 11 }}>
                      {spendCoin.charAt(0)}
                    </AppText>
                  </View>
                )}
                <AppText weight={SEMI_BOLD} style={{ fontSize: 16, color: themeColors.text }}>{spendCoin}</AppText>
              </View>
              <AppText weight={SEMI_BOLD} style={{ fontSize: 20, color: themeColors.text }}>{previewFromAmount}</AppText>
            </View>
            <View style={{ alignItems: "flex-end", marginTop: 4 }}>
              <AppText style={{ fontSize: 12, color: themeColors.secondaryText }}>
                1 {spendCoin} = {getExchangeRate().toFixed(8)} {receiveCoin} ⇄
              </AppText>
            </View>
          </View>

          {/* Receive Section */}
          <View style={{ marginTop: 12 }}>
            <AppText style={{ fontSize: 13, color: themeColors.secondaryText }}>Receive</AppText>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {getCoinIcon(receiveCoin) ? (
                  <FastImage source={getCoinIcon(receiveCoin)} style={{ width: 24, height: 24 }} resizeMode="contain" />
                ) : (
                  <View style={[styles.coinFallback, { backgroundColor: getCoinColor(receiveCoin), width: 24, height: 24, borderRadius: 12 }]}>
                    <AppText weight={SEMI_BOLD} style={{ color: colors.white, fontSize: 11 }}>
                      {receiveCoin.charAt(0)}
                    </AppText>
                  </View>
                )}
                <AppText weight={SEMI_BOLD} style={{ fontSize: 16, color: themeColors.text }}>{receiveCoin}</AppText>
              </View>
              <AppText weight={SEMI_BOLD} style={{ fontSize: 20, color: themeColors.text }}>{previewToAmount}</AppText>
            </View>
          </View>

          {/* Transaction Fees */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, marginBottom: 20 }}>
            <AppText style={{ fontSize: 13, color: themeColors.secondaryText }}>Transaction Fees</AppText>
            <AppText style={{ fontSize: 13, color: themeColors.secondaryText }}>0 {receiveCoin}</AppText>
          </View>

          {/* Action Button */}
          <View>
            {parseFloat(previewFromAmount || "0") > getBalance(spendCoin) ? (
              <Button
                onPress={handleIncreaseFunds}
                containerStyle={{ backgroundColor: isDark ? "#FFFFFF" : "#1A1C1E" }}
                textStyle={{ color: isDark ? "#000000" : "#FFFFFF" }}
              >
                {`Increase ${spendCoin}`}
              </Button>
            ) : (
              <Button
                onPress={handleConfirmConvert}
                containerStyle={{ backgroundColor: isDark ? "#FFFFFF" : "#1A1C1E" }}
                textStyle={{ color: isDark ? "#000000" : "#FFFFFF" }}
              >
                {`Confirm (${previewTimer}s)`}
              </Button>
            )}
          </View>
        </View>
      </RBSheet>

      {/* Add Funds RBSheet */}
      <RBSheet
        ref={rbSheetAddFunds}
        closeOnDragDown={true}
        closeOnPressMask={true}
        height={400}
        animationType="slide"
        customStyles={{
          container: {
            backgroundColor: isDark ? "#171a20" : colors.white,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 24,
          },
          wrapper: {
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          },
          draggableIcon: {
            backgroundColor: isDark ? "#3A3A3C" : "#E5E5EA",
            width: 40,
          },
        }}
      >
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 14 }}>
            <AppText weight={SEMI_BOLD} style={{ fontSize: 18, color: themeColors.text }}>
              Add Funds
            </AppText>
            <TouchableOpacity
              onPress={() => rbSheetAddFunds?.current?.close()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <FastImage source={REMOVE} style={{ width: 25, height: 25 }} resizeMode="contain" tintColor={themeColors.text} />
            </TouchableOpacity>
          </View>

          {/* Options */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 8 }}>
            {addFundsOptions.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                onPress={item.action}
                style={[
                  styles.coinCard,
                  {
                    borderColor: lightTheme.input,
                    backgroundColor: isDark ? "#1C1C1E" : colors.white,
                  },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <FastImage
                    source={item.icon}
                    style={{ width: 28, height: 28 }}
                    resizeMode="contain"
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <AppText weight={SEMI_BOLD} style={{ fontSize: 15, color: themeColors.text }}>
                      {item.label}
                    </AppText>
                    <AppText style={{ fontSize: 12, color: themeColors.secondaryText, marginTop: 4 }}>
                      {item.description}
                    </AppText>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </RBSheet>
    </View>
  );
};

export default ConvertSection;

const styles = StyleSheet.create({
  tabRow: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    // borderBottomWidth: StyleSheet.hairlineWidth,
    // borderBottomColor: "#E5E5EA",
  },
  leftChips: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  rightIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  cardContainer: {
    borderRadius: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  coinSelector: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  coinIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  coinFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  amountInput: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "right",
    paddingVertical: 0,
    width: 170,
  },
  maxBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 4,
  },
  swapWrapper: {
    height: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  swapCircle: {
    width: 35,
    height: 35,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: -17.5,
  },
  previewBtn: {
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  coinCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sheetHeaderPanel: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 0,
    marginBottom: 12,
    padding: 3,
    borderRadius: 12,
  },
  sheetHeaderCard: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetHeaderCardActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  sheetHeaderCardLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  sheetHeaderCardCoin: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sheetCoinIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  sheetHeaderCardValue: {
    fontSize: 14,
  },
  sheetTabsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 16,
  },
  sheetTabActive: {
    paddingBottom: 4,
    alignItems: "center",
  },
  sheetTabInactive: {
    paddingBottom: 4,
    alignItems: "center",
  },
  sheetTabText: {
    fontSize: 16,
  },
  sheetTabIndicator: {
    height: 3,
    width: 28,
    borderRadius: 1.5,
    marginTop: 4,
  },
  filterPillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  sheetCoinRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  alphaBadge: {
    backgroundColor: "#FEF3E2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
});
