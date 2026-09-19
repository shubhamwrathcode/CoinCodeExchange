import React, { useRef, useState, useEffect } from "react";
import { View, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import FastImage from "react-native-fast-image";
import RBSheet from "react-native-raw-bottom-sheet";
import { BlurView } from "@react-native-community/blur";
import LinearGradient from "react-native-linear-gradient";
import { Users, Info, Circle } from "lucide-react-native";
import ToggleSwitch from "../../common/ToggleSwitch";
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
  const [marginModeDraft, setMarginModeDraft] = useState(marginMode || "Isolated");
  const [batchAdjustMarginMode, setBatchAdjustMarginMode] = useState(false);

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
            backgroundColor: isDark ? darkTheme.darkThemeInputColor : '#F7F7F7',
            flex: 1,
            borderRadius: 8,
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
            backgroundColor: isDark ? darkTheme.darkThemeInputColor : '#F7F7F7',
            width: 75,
            borderRadius: 8,
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
        height={600}
        animationType="slide"
        onOpen={() => {
          setMarginModeDraft(marginMode || "Isolated");
        }}
        customModalProps={{ statusBarTranslucent: true }}
        customStyles={{
          container: {
            backgroundColor: "transparent",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
            overflow: "hidden",
          },
          wrapper: {
            backgroundColor: "rgba(0, 0, 0, 0.7)",
          },
          draggableIcon: {
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            width: 40,
            marginTop: 10,
          },
        }}
      >
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={20}
          reducedTransparencyFallbackColor="#111214"
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "rgba(10, 12, 16, 0.68)" : "rgba(255, 255, 255, 0.85)" }]} />
        {isDark && (
          <>
            <LinearGradient
              colors={[
                "rgba(16, 185, 129, 0.10)",
                "rgba(6, 182, 212, 0.04)",
                "rgba(16, 185, 129, 0.02)",
                "rgba(16, 185, 129, 0.07)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <LinearGradient
              colors={["transparent", "rgba(16, 185, 129, 0.04)", "transparent"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          </>
        )}
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
            <AppText weight={SEMI_BOLD} style={{ fontSize: 20, color: themeColors.text }}>
              Margin Mode
            </AppText>
            <TouchableOpacity onPress={() => rbSheetMarginMode?.current?.close()} style={{ padding: 4 }}>
              <FastImage
                source={closeIcon}
                resizeMode="contain"
                style={{ width: 14, height: 14 }}
                tintColor={themeColors.secondaryText}
              />
            </TouchableOpacity>
          </View>
          <AppText style={{ fontSize: 12, color: themeColors.secondaryText, marginTop: 4, marginBottom: 16 }}>
            Select the unit type you want to use for placing your order.
          </AppText>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {[
              {
                name: "Isolated",
                description:
                  "In isolated margin mode, the position margin is the allocated amount, and your loss is limited to it upon liquidation. You can also adjust the margin for positions in this mode.",
              },
              {
                name: "Cross",
                description:
                  "In cross margin mode, the entire account balance is used as margin, and you may lose it all upon liquidation.",
              },
            ].map((item) => {
              const isSelected = marginModeDraft === item.name;
              return (
                <TouchableOpacity
                  key={item.name}
                  activeOpacity={0.8}
                  onPress={() => setMarginModeDraft(item.name)}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    backgroundColor: isSelected
                      ? "rgba(0, 188, 212, 0.08)"
                      : isDark
                        ? "rgba(255, 255, 255, 0.03)"
                        : "#F9FAFB",
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: isSelected
                      ? "#00BCD4"
                      : isDark
                        ? "#2A2C33"
                        : "#E5E7EB",
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "#F2F3F5",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Users color={isSelected ? "#00BCD4" : (isDark ? "#8E95A3" : "#6B7280")} size={20} />
                  </View>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <AppText weight={SEMI_BOLD} style={{ fontSize: 15, color: themeColors.text }}>
                      {item.name}
                    </AppText>
                    <AppText
                      style={{
                        fontSize: 12,
                        color: isDark ? "#9CA3AF" : "#6B7280",
                        marginTop: 4,
                        lineHeight: 17,
                      }}
                    >
                      {item.description}
                    </AppText>
                  </View>
                  <View style={{ width: 24, alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                    {isSelected ? (
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          borderWidth: 2,
                          borderColor: "#00BCD4",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#00BCD4" }} />
                      </View>
                    ) : (
                      <Circle color={isDark ? "#4B5563" : "#D1D5DB"} size={20} strokeWidth={1.5} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Info Card */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "#F2F3F5",
                borderRadius: 10,
                padding: 12,
                marginTop: 4,
                borderWidth: 1,
                borderColor: isDark ? "#2A2C33" : "rgba(0, 0, 0, 0.04)",
              }}
            >
              <Info color={isDark ? "#8E95A3" : "#6B7280"} size={16} />
              <AppText style={{ fontSize: 12, color: isDark ? "#9CA3AF" : "#6B7280", marginLeft: 8, flex: 1 }}>
                Switching margin modes only applies to the current trading pair.
              </AppText>
            </View>

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#E5E7EB",
                marginVertical: 14,
              }}
            />

            {/* Batch Adjust Leverage */}
            {/* <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <AppText weight={MEDIUM} style={{ fontSize: 14, color: themeColors.text }}>
                Batch Adjust Leverage
              </AppText>
              <ToggleSwitch
                value={batchAdjustMarginMode}
                onValueChange={setBatchAdjustMarginMode}
                isDark={isDark}
              />
            </View> */}

            {/* Continue Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setMarginMode(marginModeDraft);
                rbSheetMarginMode?.current?.close();
              }}
              style={{
                backgroundColor: "#00BCD4",
                paddingVertical: 14,
                borderRadius: 24,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 10,
              }}
            >
              <AppText weight={SEMI_BOLD} style={{ fontSize: 15, color: "#FFFFFF" }}>
                Continue
              </AppText>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </RBSheet>

      {/* Margin Leverage Sheet */}
      <RBSheet
        ref={rbSheetMarginLeverage}
        closeOnDragDown={true}
        closeOnPressMask={true}
        height={620}
        animationType="slide"
        onOpen={() => {
          setLeverageDraft(getInitialLeverage(marginLeverage));
        }}
        customModalProps={{ statusBarTranslucent: true }}
        customStyles={{
          container: {
            backgroundColor: "transparent",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
            overflow: "hidden",
          },
          wrapper: {
            backgroundColor: "rgba(0, 0, 0, 0.7)",
          },
          draggableIcon: {
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            width: 40,
            marginTop: 10,
          },
        }}
      >
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={20}
          reducedTransparencyFallbackColor="#111214"
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "rgba(10, 12, 16, 0.68)" : "rgba(255, 255, 255, 0.85)" }]} />
        {isDark && (
          <>
            <LinearGradient
              colors={[
                "rgba(16, 185, 129, 0.10)",
                "rgba(6, 182, 212, 0.04)",
                "rgba(16, 185, 129, 0.02)",
                "rgba(16, 185, 129, 0.07)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <LinearGradient
              colors={["transparent", "rgba(16, 185, 129, 0.04)", "transparent"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          </>
        )}
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          {/* Header */}
          <View style={{
            flexDirection: "row", alignItems: "center", justifyContent: "space-between",
            paddingTop: 4, paddingBottom: 16
          }}>
            <AppText weight={SEMI_BOLD} style={{ fontSize: 20, color: themeColors.text }}>
              Adjust Leverage
            </AppText>
            <TouchableOpacity onPress={() => rbSheetMarginLeverage?.current?.close()} style={{ padding: 4 }}>
              <FastImage
                source={closeIcon}
                resizeMode="contain"
                style={{ width: 14, height: 14 }}
                tintColor={themeColors.secondaryText}
              />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Coin Row */}
            <AppText style={{ color: themeColors.secondaryText, fontSize: 13, marginBottom: 8 }}>Coin</AppText>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#F2F3F5",
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#E5E7EB",
                marginBottom: 16,
              }}
            >
              {!!coinIconSrc && (
                <FastImage source={{ uri: coinIconSrc }} style={{ width: 24, height: 24, borderRadius: 12, marginRight: 10 }} />
              )}
              <AppText weight={SEMI_BOLD} style={{ fontSize: 15, color: themeColors.text }}>{coinLabel}</AppText>
            </View>

            {/* Leverage Box */}
            <AppText style={{ color: themeColors.secondaryText, fontSize: 13, marginBottom: 8 }}>Leverage</AppText>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#F2F3F5",
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#E5E7EB",
                marginBottom: 16,
              }}
            >
              <AppText weight={SEMI_BOLD} style={{ fontSize: 16, color: themeColors.text }}>{leverageDraft}x</AppText>
            </View>

            {/* Quick selector pills */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
              {quickLeverages.map((x) => {
                const levStr = `${x}x`;
                const isSelected = leverageDraft === x;
                return (
                  <TouchableOpacity
                    key={levStr}
                    activeOpacity={0.75}
                    onPress={() => safeSet(x)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: isSelected ? "#00BCD4" : (isDark ? "rgba(255, 255, 255, 0.08)" : "#E5E7EB"),
                      backgroundColor: isSelected
                        ? "rgba(0, 188, 212, 0.15)"
                        : (isDark ? "rgba(255, 255, 255, 0.05)" : "#F2F3F5"),
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <AppText
                      weight={SEMI_BOLD}
                      style={{
                        color: isSelected ? "#00BCD4" : themeColors.text,
                        fontSize: 13,
                      }}
                    >
                      {levStr}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Details Card */}
            <View
              style={{
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "#F9FAFB",
                borderWidth: 1,
                borderColor: isDark ? "rgba(255, 255, 255, 0.06)" : "#E5E7EB",
                borderRadius: 12,
                padding: 14,
                marginBottom: 16,
                gap: 8,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <AppText style={{ color: themeColors.secondaryText, fontSize: 13 }}>Allow to Open</AppText>
                <AppText weight={MEDIUM} style={{ color: themeColors.text, fontSize: 13 }}>
                  {fmt(netEquity * leverageDraft)} {quoteSymbol}
                </AppText>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <AppText style={{ color: themeColors.secondaryText, fontSize: 13 }}>Maximum Borrowable</AppText>
                <AppText weight={MEDIUM} style={{ color: themeColors.text, fontSize: 13 }}>
                  {fmt(Math.max(0, netEquity * (maxLeverage - 1) - currentLoan))} {quoteSymbol}
                </AppText>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <AppText style={{ color: themeColors.secondaryText, fontSize: 13 }}>Leverage Range</AppText>
                <AppText weight={MEDIUM} style={{ color: themeColors.text, fontSize: 13 }}>
                  {minLeverage}x – {maxLeverage}x
                </AppText>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <AppText style={{ color: themeColors.secondaryText, fontSize: 13 }}>Current Loan</AppText>
                <AppText weight={MEDIUM} style={{ color: themeColors.text, fontSize: 13 }}>
                  {fmt(currentLoan)} {quoteSymbol}
                </AppText>
              </View>
            </View>

            {/* Warning Message */}
            {netEquity <= 0 && (
              <AppText weight={MEDIUM} style={{ color: colors.cyanTheme, fontSize: 11, marginBottom: 12, lineHeight: 15 }}>
                The current available margin ≤ 0. You can increase the leverage or add margin.
              </AppText>
            )}

            {/* Confirm Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                const final = hasAllowed ? snapToAllowed(leverageDraft) : clamp(leverageDraft);
                setMarginLeverage(`${final}x`);
                rbSheetMarginLeverage?.current?.close();
              }}
              style={{
                backgroundColor: "#00BCD4",
                paddingVertical: 14,
                borderRadius: 24,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 6,
                marginBottom: Platform.OS === "ios" ? 20 : 12,
              }}
            >
              <AppText weight={SEMI_BOLD} style={{ fontSize: 15, color: "#FFFFFF" }}>
                Confirm
              </AppText>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </RBSheet>
    </View>
  );
};

export default MarginHeaderDropdowns;
