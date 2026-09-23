import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import FastImage from "react-native-fast-image";
import { Eye, EyeOff } from "lucide-react-native";
import LinearGradient from "react-native-linear-gradient";
import { AppText, SEMI_BOLD } from "../../shared";

// CoinCode reference colors
const GREY = "#848E9C";
const GREEN = "#06C168";
const WHITE = "#FFFFFF";

const normalizeAmount = (value) => {
  if (value === undefined || value === null || value === "") return "0.00";
  const raw = String(value).trim();
  const n = parseFloat(raw.replace(/,/g, ""));
  if (!Number.isFinite(n) || n === 0) return "0.00";
  return raw;
};

const TotalAssetsCard = ({
  title = "Total Assets",
  amount = "0.00",
  currency = "BTC",
  usdAmount = "0.00",
  pnlAmount = "0.00",
  pnlPercentage = "0.00%",
  imageSource,
  topRightBadge,
  belowPnl,
  showBalance,
  onToggleBalance,
  style,
}) => {
  const [internalVisible, setInternalVisible] = useState(true);
  const isVisible = typeof showBalance === "boolean" ? showBalance : internalVisible;

  const toggleVisibility = () => {
    if (onToggleBalance) {
      onToggleBalance();
      return;
    }
    setInternalVisible((value) => !value);
  };

  const displayAmount = normalizeAmount(amount);
  const displayUsd = normalizeAmount(usdAmount);
  const displayPnl = normalizeAmount(pnlAmount);
  const displayPnlPct =
    !pnlPercentage || pnlPercentage === "0" || pnlPercentage === "0%"
      ? "0.00%"
      : String(pnlPercentage);

  const mask = (value) => (isVisible ? value : "******");

  return (
    <View style={[styles.wrapper, style]}>
      <LinearGradient
        colors={["#1C1C1E", "#141518", "#0A0A0A"]}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {topRightBadge ? <View style={styles.topRightBadgeContainer}>{topRightBadge}</View> : null}

        <View style={styles.cardContent}>
          <AppText style={styles.title}>{title}</AppText>

          <View style={styles.balanceRow}>
            <AppText weight={SEMI_BOLD} style={styles.amount}>
              {mask(displayAmount)}
            </AppText>
            <AppText weight={SEMI_BOLD} style={styles.currency}>
              {currency || "BTC"}
            </AppText>
            <TouchableOpacity onPress={toggleVisibility} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              {isVisible ? <Eye color={GREY} size={18} /> : <EyeOff color={GREY} size={18} />}
            </TouchableOpacity>
          </View>

          <AppText style={styles.usdLine}>≈ ${mask(displayUsd)} USD</AppText>

          <View style={styles.pnlRow}>
            <AppText style={styles.pnlLabel}>Today's PnL</AppText>
            <TouchableOpacity
              onPress={toggleVisibility}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.pnlEye}
            >
              {isVisible ? <Eye color={GREY} size={14} /> : <EyeOff color={GREY} size={14} />}
            </TouchableOpacity>
            <AppText weight={SEMI_BOLD} style={styles.pnlAmount}>
              ${mask(displayPnl)}
            </AppText>
            <AppText weight={SEMI_BOLD} style={styles.pnlPercent}>
              {mask(displayPnlPct)}
            </AppText>
          </View>

          {belowPnl ? <View style={styles.belowPnl}>{belowPnl}</View> : null}
        </View>

        {imageSource ? (
          <FastImage source={imageSource} style={styles.walletImage} resizeMode="contain" />
        ) : null}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 20,
    overflow: "hidden",
  },
  card: {
    width: "100%",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 0,
    minHeight: 140,
    position: "relative",
    justifyContent: "center",
  },
  cardContent: {
    zIndex: 2,
    width: "65%",
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 16,
  },
  topRightBadgeContainer: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 3,
  },
  title: {
    color: GREY,
    fontSize: 14,
    marginBottom: 8,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  amount: {
    color: WHITE,
    fontSize: 28,
    lineHeight: 34,
    marginRight: 8,
  },
  currency: {
    color: GREY,
    fontSize: 16,
    lineHeight: 22,
    marginRight: 8,
    marginTop: 4,
  },
  usdLine: {
    color: GREY,
    fontSize: 14,
    marginBottom: 12,
  },
  pnlRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  pnlLabel: {
    color: GREY,
    fontSize: 13,
    marginRight: 8,
  },
  pnlEye: {
    marginRight: 8,
  },
  pnlAmount: {
    color: WHITE,
    fontSize: 13,
    marginRight: 8,
  },
  pnlPercent: {
    color: GREEN,
    fontSize: 13,
  },
  belowPnl: {
    marginTop: 8,
  },
  walletImage: {
    position: "absolute",
    right: -28,
    bottom: -30,
    width: 195,
    height: 195,
    zIndex: 1,
  },
});

export default TotalAssetsCard;
