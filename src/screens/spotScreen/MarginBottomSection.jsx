import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, Keyboard } from "react-native";
import FastImage from "react-native-fast-image";
import { AppText, Button } from "../../shared";
import { colors } from "../../theme/colors";
import { add } from "../../helper/ImageAssets";
import { ShimmerBox } from "./Spot";
import NavigationService from "../../navigation/NavigationService";
import { NAVIGATION_AUTH_STACK, LOGIN_SCREEN } from "../../navigation/routes";

const MarginBottomSection = ({
  quote_currency,
  base_currency,
  coinBalance,
  marginMode,
  isBuy,
  onSubmit,
  themeColors,
  isDark,
  userData,
  styles,
  onBorrowPress,
  marginLeverage,
  price,
  amount,
  buy_price,
  amountIsQuote,
  formatTotal,
  loading,
  currencyData,
  aboveButton = null,
}) => {
  const [isSwitching, setIsSwitching] = useState(true);

  useEffect(() => {
    setIsSwitching(true);
    const timer = setTimeout(() => {
      setIsSwitching(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [marginMode, base_currency, quote_currency]);

  const leverage = parseInt(marginLeverage, 10) || 5;

  const isCross = marginMode === "Cross";

  const Qf = Number(coinBalance?.quote_currency_balance) || 0;
  const Bf = Number(coinBalance?.base_currency_balance) || 0;
  const Qb = Number(coinBalance?.quote_currency_borrowed) || 0;
  const Bb = Number(coinBalance?.base_currency_borrowed) || 0;

  const socketNetEquity = coinBalance?.net_equity != null ? Number(coinBalance.net_equity) : null;
  const refPrice = parseFloat(buy_price) || parseFloat(price) || 0;

  const netEquity = (socketNetEquity != null && Number.isFinite(socketNetEquity) && socketNetEquity >= 0)
    ? socketNetEquity
    : Math.max(0, (Qf - Qb) + (Bf - Bb) * refPrice);

  const baseEquity = Math.max(0, Bf - Bb);

  const qCap = coinBalance?.quote_remaining_capacity != null ? Number(coinBalance.quote_remaining_capacity) : null;
  const bCap = coinBalance?.base_remaining_capacity != null ? Number(coinBalance.base_remaining_capacity) : null;

  const quoteAvailable = isCross
    ? ((coinBalance?.buy?.available != null || coinBalance?.buy_available != null)
      ? Number(coinBalance?.buy?.available ?? coinBalance?.buy_available)
      : netEquity)
    : Math.max(0, Qf);
      
  const baseAvailable = isCross
    ? ((coinBalance?.sell?.available != null || coinBalance?.sell_available != null)
      ? Number(coinBalance?.sell?.available ?? coinBalance?.sell_available)
      : baseEquity)
    : Math.max(0, Bf);

  const grossQuoteMax = netEquity * leverage;
  const localQuoteMax = qCap != null && Number.isFinite(qCap) ? Math.min(grossQuoteMax, qCap + Qf) : grossQuoteMax;
  
  const quoteMax = isCross
    ? ((coinBalance?.buy?.max != null || coinBalance?.buy_max != null)
      ? Number(coinBalance?.buy?.max ?? coinBalance?.buy_max)
      : localQuoteMax)
    : Math.max(0, Qf * leverage);

  const fmt = (val) => {
    if (val == null || !Number.isFinite(Number(val))) return "0";
    const num = Number(val);
    const truncated = Math.trunc(num * 100000) / 100000;
    const res = parseFloat(truncated.toFixed(5)).toString();
    return res === "NaN" ? "0" : res;
  };

  const inputQty = parseFloat(amount) || 0;
  const inputPx = parseFloat(price) || parseFloat(buy_price) || 0;

  const grossSellMax = inputPx > 0 ? grossQuoteMax / inputPx : 0;
  const localBaseMax = bCap != null && Number.isFinite(bCap) ? Math.min(grossSellMax, bCap) : grossSellMax;

  const baseMax = isCross
    ? ((coinBalance?.sell?.max != null || coinBalance?.sell_max != null)
      ? Number(coinBalance?.sell?.max ?? coinBalance?.sell_max)
      : localBaseMax)
    : Math.max(0, Bf * leverage);

  let borrowingVal = 0;
  const L = parseInt(marginLeverage, 10) || 1;

  if (isBuy) {
    const parsedTotal = parseFloat(formatTotal) || 0;
    const V = parsedTotal > 0 ? parsedTotal : (amountIsQuote ? inputQty : inputQty * inputPx);
    if (isCross) {
      borrowingVal = V > 0 ? Math.max(0, V - quoteAvailable) : 0;
    } else {
      borrowingVal = V > 0 ? Math.max(0, V * (1 - 1 / L)) : 0;
    }
  } else {
    const parsedTotal = parseFloat(formatTotal) || 0;
    const baseQty = parsedTotal > 0 && inputPx > 0 ? parsedTotal / inputPx : (amountIsQuote ? (inputPx > 0 ? inputQty / inputPx : 0) : inputQty);
    if (isCross) {
      borrowingVal = baseQty > 0 ? Math.max(0, baseQty - baseAvailable) : 0;
    } else {
      borrowingVal = baseQty > 0 ? Math.max(0, baseQty * (1 - 1 / L)) : 0;
    }
  }

  const availValue = isBuy ? quoteAvailable : baseAvailable;
  const availSymbol = isBuy ? quote_currency : base_currency;

  const maxVal = isBuy ? Math.max(0, quoteMax) : Math.max(0, baseMax);
  const maxSymbol = isBuy ? quote_currency : base_currency;

  const borrowingSymbol = isBuy ? quote_currency : base_currency;

  return (
    <View style={{ marginTop: 8 }}>
      {/* Available / Max / Borrowable */}
      <View style={{ marginBottom: aboveButton ? 8 : 16, gap: 6 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <AppText style={{ fontSize: 13, color: colors.placeholderColor }}>Available</AppText>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {isSwitching ? (
              <ShimmerBox width={80} height={14} borderRadius={4} />
            ) : (
              <AppText style={{ fontSize: 13, color: themeColors.text, fontWeight: "600" }}>
                {`${fmt(availValue)} ${availSymbol}`}
              </AppText>
            )}
            <TouchableOpacity
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPress={onBorrowPress}
              style={{ marginLeft: 6, padding: 4 }}
            >
              <FastImage source={add} style={{ width: 14, height: 14 }} tintColor={themeColors.text} resizeMode="contain" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <AppText style={{ fontSize: 13, color: colors.placeholderColor }}>Max</AppText>
          {isSwitching ? (
            <ShimmerBox width={80} height={14} borderRadius={4} />
          ) : (
            <AppText style={{ fontSize: 13, color: themeColors.text, fontWeight: "600" }}>
              {`${fmt(maxVal)} ${maxSymbol}`}
            </AppText>
          )}
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <AppText style={{ fontSize: 13, color: colors.placeholderColor }}>Borrowable</AppText>
          {isSwitching ? (
            <ShimmerBox width={80} height={14} borderRadius={4} />
          ) : (
            <AppText style={{ fontSize: 13, color: themeColors.text, fontWeight: "600" }}>
              {`${fmt(borrowingVal)} ${borrowingSymbol}`}
            </AppText>
          )}
        </View>
      </View>

      {aboveButton}

      {/* Submit Button */}
      <View style={styles.spotOrderSubmitWrap}>
        <Button
          children={
            !userData
              ? "Login"
              : isBuy
                ? `Buy ${base_currency}`
                : `Sell ${base_currency}`
          }
          disabled={!userData ? false : loading}
          loading={loading}
          activeOpacity={!userData ? 0.75 : (amount && parseFloat(amount) > 0) ? 0.75 : 1}
          containerStyle={[
            styles.spotOrderSubmitBtn,
            {
              backgroundColor: !userData
                ? (themeColors.spotTradeBuy ?? colors.spotTradeBuy)
                : (amount && parseFloat(amount) > 0)
                  ? (isBuy
                    ? (themeColors.spotTradeBuy ?? colors.spotTradeBuy)
                    : (themeColors.spotTradeSell ?? colors.spotTradeSell))
                  : (isBuy
                    ? (isDark ? "#19402E" : "#A7E2C6")
                    : (isDark ? "#4A1D20" : "#F2B2B4")),
            },
          ]}
          onPress={() => {
            if (!userData) {
              NavigationService.reset(NAVIGATION_AUTH_STACK);
              return;
            }
            if (amount && parseFloat(amount) > 0) {
              Keyboard.dismiss();
              onSubmit();
            }
          }}
          titleStyle={styles.spotOrderSubmitTitle}
        />
      </View>
    </View>
  );
};

export default React.memo(MarginBottomSection);
