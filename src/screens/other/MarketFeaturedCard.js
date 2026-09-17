import React from "react";
import { View, StyleSheet, Platform, Dimensions } from "react-native";
import FastImage from "react-native-fast-image";
import { AppText, SEMI_BOLD, TEN, FOURTEEN, FIFTEEN } from "../../shared";
import { colors, lightTheme } from "../../theme/colors";
import TouchableOpacityView from "../../shared/components/TouchableOpacityView";
import { BASE_URL, IMAGE_BASE_URL } from "../../helper/Constants";
import { toFixedFive, toFixedThree } from "../../helper/utility";
import MiniSparkline from "../../shared/components/MiniSparkline";
import { useTheme } from "../../hooks/useTheme";

const COIN_NAMES = { BTC: "Bitcoin", ETH: "Ethereum", BNB: "BNB" };

const formatVolume = (vol) => {
  const n = Number(vol);
  if (!n || isNaN(n)) return "0";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return toFixedThree(n);
};

const MarketFeaturedCard = ({ data, chartData, chartId, onPress }) => {
  const { colors: themeColors } = useTheme();
  const change = Number(data?.change_percentage) ?? 0;
  const isPositive = change >= 0;
  const ticker = data?.base_currency || "---";
  const coinName = COIN_NAMES[ticker] || ticker;
  const textColor = themeColors.text;
  const subTextColor = themeColors.secondaryText;
  const priceStr = toFixedFive(data?.buy_price);
  const volumeStr = formatVolume(data?.volume);
  const cardContentWidth = (Dimensions.get("window").width / 2 - 22) - 28;
  const [chartWidth, setChartWidth] = React.useState(cardContentWidth);
  const priceNum = Number(data?.buy_price) || 0;
  const absoluteChange = (priceNum * Math.abs(change)) / 100;

  return (
    <TouchableOpacityView
      style={[
        styles.container,
        {
          backgroundColor: colors.iconBgColor,
          borderColor: lightTheme.input
        }
      ]}
      activeOpacity={0.7}
      onPress={() => onPress?.(data)}
    >
      <View style={styles.topRow}>
        <View style={styles.nameBlock}>
          <AppText type={FOURTEEN} weight={SEMI_BOLD} color={textColor} numberOfLines={1}>
            {coinName}
          </AppText>
          <AppText type={TEN} style={[styles.symbolText, { color: subTextColor }]} numberOfLines={1}>
            {ticker}
          </AppText>
        </View>
        <View style={styles.iconWrap}>
          <FastImage
            resizeMode="contain"
            style={styles.coinLogo}
            source={{ uri: data?.icon_path ? IMAGE_BASE_URL + data.icon_path : null }}
          />
        </View>
      </View>

      <View style={styles.priceSection}>
        <AppText type={FIFTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }} numberOfLines={1}>
          ${priceStr}
        </AppText>
      </View>

      <View
        style={styles.graphWrap}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) setChartWidth(w);
        }}
      >
        <MiniSparkline
          chartData={chartData}
          isPositive={isPositive}
          width={chartWidth}
          height={38}
          chartId={chartId}
          fallbackPrice={Number(data?.buy_price) || 100}
        />
      </View>

      {/* <AppText type={TEN} style={[styles.volumeText, { color: subTextColor }]} numberOfLines={1}>
        24H Volume：{volumeStr} (USD)
      </AppText> */}

      {/* <View style={[styles.todayPill, isPositive ? styles.todayPillPositive : styles.todayPillNegative]}>
        <AppText type={TEN} weight={SEMI_BOLD} style={[styles.todayPillText, { color: textColor }]}>
          {isPositive ? "▲ " : "▼ "}{absoluteStr} ({isPositive ? "+" : ""}{toFixedThree(change)}%) Today
        </AppText>
      </View> */}
    </TouchableOpacityView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    paddingBottom: 10,
    width: "100%",
    overflow: "hidden",
    borderWidth: 0.5,
    borderRadius: 10,
    ...(Platform.OS === "ios"
      ? { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 }
      : { elevation: 0.5 }),
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  nameBlock: {},
  symbolText: { marginTop: 2, fontSize: 11 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  coinLogo: {
    width: 36,
    height: 36,
  },
  priceSection: {
    marginBottom: 6,
  },
  graphWrap: {
    width: "100%",
    alignSelf: "stretch",
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    overflow: "hidden",
  },
  volumeText: {
    fontSize: 11,
  },
  todayPill: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    marginHorizontal: -14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  todayPillPositive: {
    backgroundColor: "rgba(100, 180, 155, 0.08)",
  },
  todayPillNegative: {
    backgroundColor: "rgba(255, 140, 130, 0.10)",
  },
  todayPillText: {
    textAlign: "left",
  },
});

export default MarketFeaturedCard;
