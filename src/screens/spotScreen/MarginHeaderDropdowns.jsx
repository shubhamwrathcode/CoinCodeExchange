import React, { useRef, useState, useEffect } from "react";
import { View, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import FastImage from "react-native-fast-image";
import RBSheet from "react-native-raw-bottom-sheet";
import { AppText, SEMI_BOLD, MEDIUM, Button } from "../../shared";
import { colors, darkTheme, lightTheme } from "../../theme/colors";
import { checkIc, downIcon, tick, closeIcon, add, minus, right_ic } from "../../helper/ImageAssets";
import { IMAGE_BASE_URL } from "../../helper/Constants";
import { buildCoinIconUri } from "../../helper/utility";

const MarginHeaderDropdowns = ({
  marginMode,
  setMarginMode,
  marginLeverage,
  setMarginLeverage,
  themeColors,
  isDark,
  universalPaddingHorizontal,
  styles,
  coinBalance = {},
  crossAccount,
  crossBorrowable,
  currencyData = {},
  formatTotal,
  price,
  buy_price,
}) => {
  const rbSheetMarginMode = useRef();
  const rbSheetMarginLeverage = useRef();
  const isCross = marginMode === "Cross";
  const quoteSymbol = currencyData?.quote_currency || "USDT";
  const baseSymbol = currencyData?.base_currency || "BTC";
  const coinLabel = `${baseSymbol}/${quoteSymbol}`;
  const coinIconSrc = buildCoinIconUri(
    currencyData?.icon_path ||
    currencyData?.icon ||
    currencyData?.base_currency_icon ||
    currencyData?.currency_icon ||
    currencyData?.icon_url ||
    currencyData?.image ||
    currencyData?.logo
  );

  const minLeverage = currencyData?.margin_config?.min_leverage ?? 1;
  const maxLeverage = (isCross ? crossAccount?.max_leverage : null) ?? currencyData?.margin_config?.max_leverage ?? 10;

  const allowedLeveragesRaw = isCross
    ? currencyData?.margin_config?.cross_allowed_leverages
    : currencyData?.margin_config?.isolated_allowed_leverages;
  const allowedLeverages = Array.isArray(allowedLeveragesRaw) ? allowedLeveragesRaw : [];
  const hasAllowed = allowedLeverages.length > 0;

  const DEFAULT_QUICK_LEVERAGE = [1, 2, 3, 5, 10, 20];
  const quickLeverages = hasAllowed
    ? allowedLeverages
    : DEFAULT_QUICK_LEVERAGE.filter((x) => x >= minLeverage && x <= maxLeverage);

  const snapToAllowed = (n) => {
    if (!hasAllowed) return n;
    return allowedLeverages.reduce((prev, cur) =>
      Math.abs(cur - n) < Math.abs(prev - n) ? cur : prev
    );
  };

  const getInitialLeverage = (val) => {
    let curr = parseInt(val, 10);
    if (!Number.isFinite(curr) || curr <= 0) return hasAllowed ? allowedLeverages[0] : minLeverage;
    if (hasAllowed) return allowedLeverages.includes(curr) ? curr : snapToAllowed(curr);
    return Math.min(Math.max(Math.round(curr), minLeverage), maxLeverage);
  };

  const [leverageDraft, setLeverageDraft] = useState(getInitialLeverage(marginLeverage));

  const Qf = Number(coinBalance?.quote_currency_balance) || 0;
  const Bf = Number(coinBalance?.base_currency_balance) || 0;
  const Qb = Number(coinBalance?.quote_currency_borrowed) || 0;
  const Bb = Number(coinBalance?.base_currency_borrowed) || 0;

  const socketNetEquity = coinBalance?.net_equity != null ? Number(coinBalance.net_equity) : null;
  const refPrice = parseFloat(buy_price) || parseFloat(price) || 0;

  const computedNetEquity = (socketNetEquity != null && Number.isFinite(socketNetEquity) && socketNetEquity >= 0)
    ? socketNetEquity
    : Math.max(0, (Qf - Qb) + (Bf - Bb) * refPrice);

  // Cross Margin Data
  const crossSummary = crossAccount?.summary || crossAccount || {};
  const crossNetEquity = crossSummary?.net_equity != null ? Number(crossSummary.net_equity) : computedNetEquity;
  const crossCurrentLoan = crossSummary?.total_liability != null ? Number(crossSummary.total_liability) : Qb;

  const netEquity = isCross ? crossNetEquity : computedNetEquity;
  const currentLoan = isCross ? crossCurrentLoan : Qb;

  const fmt = (n) => {
    const val = Number(n) || 0;
    if (formatTotal) {
      const res = formatTotal(val);
      if (res === "" || res == null) return "0";
      return res;
    }
    return val.toFixed(2).replace(/\.?0+$/, "") || "0";
  };

  const safeSet = (n) => {
    const x = Number(n);
    if (!Number.isFinite(x) || x <= 0) return;
    if (hasAllowed) {
      if (allowedLeverages.includes(x)) setLeverageDraft(x);
    } else {
      setLeverageDraft(Math.min(Math.max(Math.round(x), minLeverage), maxLeverage));
    }
  };

  const clamp = (n) => {
    const x = Number(n);
    if (!Number.isFinite(x)) return hasAllowed ? allowedLeverages[0] : minLeverage;
    if (hasAllowed) return snapToAllowed(x);
    if (x < minLeverage) return minLeverage;
    return Math.min(Math.round(x), maxLeverage);
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => rbSheetMarginMode.current.open()}
        style={[
          styles.dropdown,
          {
            backgroundColor: isDark ? colors.lightBlackLatest : lightTheme.input,
            flex: 1,
            borderRadius: 10,
            borderWidth: 0.8,
            paddingVertical: 6,
            paddingHorizontal: 12,
            marginBottom: 0,
            flexDirection: "row",
            alignItems: "center",
            borderColor: isDark ? darkTheme.inputBorder : themeColors.border,
          },
        ]}
      >
        <AppText weight={MEDIUM} style={{ color: themeColors.text, fontSize: 14 }}>
          {marginMode}
        </AppText>
        <FastImage
          source={downIcon}
          resizeMode="contain"
          style={{ width: 10, height: 10 }}
          tintColor={themeColors.secondaryText}
        />
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => rbSheetMarginLeverage.current.open()}
        style={[
          styles.dropdown,
          {
            backgroundColor: isDark ? colors.lightBlackLatest : lightTheme.input,
            width: 75,
            borderRadius: 10,
            borderWidth: 0.8,
            paddingVertical: 6,
            paddingHorizontal: 12,
            marginBottom: 0,
            flexDirection: "row",
            alignItems: "center",
            borderColor: isDark ? darkTheme.inputBorder : themeColors.border,
          },
        ]}
      >
        <AppText weight={MEDIUM} style={{ color: themeColors.text, fontSize: 14 }}>
          {marginLeverage}
        </AppText>
        <FastImage
          source={downIcon}
          resizeMode="contain"
          style={{ width: 10, height: 10 }}
          tintColor={themeColors.secondaryText}
        />
      </TouchableOpacity>

      {/* Margin Mode Sheet */}
      <RBSheet
        ref={rbSheetMarginMode}
        closeOnDragDown={true}
        closeOnPressMask={true}
        height={330}
        animationType="slide"
        customModalProps={{ statusBarTranslucent: true }}
        customStyles={{
          container: {
            backgroundColor: isDark ? colors.newThemeColor : themeColors.themeElevationColor,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: universalPaddingHorizontal,
          },
          wrapper: {
            backgroundColor: "#0006",
          },
          draggableIcon: {
            backgroundColor: themeColors.themeBorderColor,
            width: 40,
          },
        }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ paddingVertical: 15 }}>
            <AppText weight={SEMI_BOLD} style={{ fontSize: 18, color: themeColors.text, marginLeft: 5 }}>
              Margin Trading
            </AppText>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {[
              {
                name: "Isolated",
                description:
                  "Margin and PnL of different trading pairs are calculated separately. Liquidation in one market will not affect positions in other markets.",
              },
              {
                name: "Cross",
                description:
                  "All positions share margin and PnL are offset. In the event of liquidation, all margin could be sold and all positions liquidated.",
              },
            ].map((item) => {
              const isSelected = marginMode === item.name;
              return (
                <TouchableOpacity
                  key={item.name}
                  activeOpacity={0.8}
                  onPress={() => {
                    setMarginMode(item.name);
                    rbSheetMarginMode?.current?.close();
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: isSelected
                      ? themeColors.text
                      : themeColors.themeBorderColor,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                  }}
                >
                  <AppText
                    weight={MEDIUM}
                    style={{
                      color: themeColors.text,
                      fontSize: 16,
                      marginBottom: 2,
                    }}
                  >
                    {item.name}
                  </AppText>
                  <AppText
                    style={{
                      color: themeColors.secondaryText,
                      fontSize: 13,
                    }}
                  >
                    {item.description}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </RBSheet>

      {/* Margin Leverage Sheet */}
      <RBSheet
        ref={rbSheetMarginLeverage}
        closeOnDragDown={false}
        closeOnPressMask={true}
        height={500}
        animationType="slide"
        onOpen={() => {
          setLeverageDraft(getInitialLeverage(marginLeverage));
        }}
        customModalProps={{ statusBarTranslucent: true }}
        customStyles={{
          container: {
            backgroundColor: isDark ? colors.newThemeColor : themeColors.themeElevationColor,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: universalPaddingHorizontal,
            paddingTop: 8,
            paddingBottom: 16,
          },
          wrapper: {
            backgroundColor: "#0006",
          },
        }}
      >
        <View style={{ flex: 1, paddingHorizontal: 10 }}>
          <View style={{
            flexDirection: "row", alignItems: "center", justifyContent: "space-between",
            paddingTop: 4, paddingBottom: 20
          }}>
            <AppText weight={SEMI_BOLD} style={{ fontSize: 18, color: themeColors.text, marginTop: 10 }}>
              Adjust Leverage
            </AppText>
            <TouchableOpacity onPress={() => rbSheetMarginLeverage?.current?.close()} style={{ padding: 4 }}>
              <FastImage
                source={closeIcon}
                resizeMode="contain"
                style={{ width: 15, height: 15 }}
                tintColor={themeColors.secondaryText}
              />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>

            {/* Coin Row */}
            <AppText style={{ color: themeColors.secondaryText, fontSize: 13, marginBottom: 8 }}>Coin</AppText>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#F2F2F7", padding: 12, borderRadius: 10, marginBottom: 16 }}>
              {!!coinIconSrc && (
                <FastImage source={{ uri: coinIconSrc }} style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }} />
              )}
              <AppText weight={SEMI_BOLD} style={{ fontSize: 15, color: themeColors.text }}>{coinLabel}</AppText>
            </View>

            {/* Leverage Input */}
            <AppText style={{ color: themeColors.secondaryText, fontSize: 13, marginBottom: 8 }}>Leverage</AppText>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#F2F2F7", padding: 12, borderRadius: 10, marginBottom: 16 }}>
              <AppText weight={SEMI_BOLD} style={{ fontSize: 15, color: themeColors.text }}>{leverageDraft}x</AppText>
            </View>

            {/* Quick selector row */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {quickLeverages.map((x) => {
                const levStr = `${x}x`;
                const isSelected = leverageDraft === x;
                return (
                  <TouchableOpacity
                    key={levStr}
                    onPress={() => safeSet(x)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: isSelected ? themeColors.text : "transparent",
                      backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#F2F2F7",
                    }}
                  >
                    <AppText weight={SEMI_BOLD} style={{ color: themeColors.text, fontSize: 13 }}>
                      {levStr}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Details List */}
            <View style={{ marginBottom: 8, marginTop: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 }}>
                <AppText style={{ color: themeColors.secondaryText, fontSize: 12 }}>Allow to Open</AppText>
                <AppText weight={MEDIUM} style={{ color: themeColors.text, fontSize: 12 }}>{fmt(netEquity * leverageDraft)} {quoteSymbol}</AppText>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 }}>
                <AppText style={{ color: themeColors.secondaryText, fontSize: 12 }}>Maximum Borrowable</AppText>
                <AppText weight={MEDIUM} style={{ color: themeColors.text, fontSize: 12 }}>{fmt(Math.max(0, netEquity * (maxLeverage - 1) - currentLoan))} {quoteSymbol}</AppText>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 }}>
                <AppText style={{ color: themeColors.secondaryText, fontSize: 12 }}>Leverage Range</AppText>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <AppText weight={MEDIUM} style={{ color: themeColors.text, fontSize: 12 }}>{minLeverage}x – {maxLeverage}x</AppText>
                </View>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 }}>
                <AppText style={{ color: themeColors.secondaryText, fontSize: 12 }}>Current Loan</AppText>
                <AppText weight={MEDIUM} style={{ color: themeColors.text, fontSize: 12 }}>{fmt(currentLoan)} {quoteSymbol}</AppText>
              </View>
            </View>

            {/* Warning Message */}
            {netEquity <= 0 && (
              <AppText weight={MEDIUM} style={{ color: colors.cyanTheme, fontSize: 11, marginTop: 4, lineHeight: 14 }}>
                The current available margin ≤ 0. You can increase the leverage or add margin.
              </AppText>
            )}
          </ScrollView>

          {/* Confirm Button */}
          <Button
            onPress={() => {
              const final = hasAllowed ? snapToAllowed(leverageDraft) : clamp(leverageDraft);
              setMarginLeverage(`${final}x`);
              rbSheetMarginLeverage?.current?.close();
            }}
            containerStyle={{
              marginTop: 12,
              marginBottom: 8,
            }}
          >
            Confirm
          </Button>
        </View>
      </RBSheet>
    </View>
  );
};

export default MarginHeaderDropdowns;
