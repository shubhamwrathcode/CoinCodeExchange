import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Circle } from "react-native-svg";
import { AppText, TWELVE, MEDIUM, SEMI_BOLD } from "..";
import { useTheme } from "../../hooks/useTheme";
import { useAppSelector } from "../../store/hooks";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

const STEPS = ["Sign up", "Identification", "Deposit"];
const TRACK_FILL_WIDTHS = ["40%", "75%"];

const KYC_VERIFIED_TIER = 2;

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const isUserKycVerified = (userData) => {
  const tier = userData?.kycVerified ?? userData?.kyc_verified;
  if (toNumber(tier) === KYC_VERIFIED_TIER) return true;
  const status = String(userData?.kyc_status ?? userData?.kycStatus ?? "").toLowerCase();
  return status === "approved" || status === "verified";
};

const getPortfolioTotal = (portfolio) => {
  if (!portfolio || typeof portfolio !== "object") return 0;
  return toNumber(
    portfolio.estimated_total_usdt ??
      portfolio.dollarPrice ??
      portfolio.estimatedTotalUsdt ??
      portfolio.estimated_total ??
      portfolio.total_usdt ??
      portfolio.currencyPrice
  );
};

const walletHasFunds = (wallet) => {
  const coins = Array.isArray(wallet)
    ? wallet
    : Array.isArray(wallet?.items)
    ? wallet.items
    : [];
  return coins.some(
    (coin) => toNumber(coin?.balance) + toNumber(coin?.locked_balance) > 0
  );
};

export const AccountSetupProgress = () => {
  const { colors: themeColors, isDark } = useTheme();
  const userData = useAppSelector((state) => state.auth.userData);
  const walletBalance = useAppSelector((state) => state.wallet.walletBalance);
  const hasWalletFunds = useAppSelector((state) => {
    const w = state.wallet;
    return [
      w.userWallet,
      w.userMainWallet,
      w.userSpotWallet,
      w.userSwapWallet,
      w.userEarningWallet,
      w.userArbitrageWallet,
      w.userFuturesWallet,
      w.userOptionsWallet,
    ].some(walletHasFunds);
  });

  const isKycVerified = isUserKycVerified(userData);
  const hasDeposited = hasWalletFunds || getPortfolioTotal(walletBalance) > 0;

  let completedSteps = 1;
  if (isKycVerified) completedSteps = hasDeposited ? 3 : 2;
  const currentStepIndex = completedSteps - 1;
  const isAllCompleted = completedSteps === STEPS.length;

  return (
    <View style={styles.container}>
      <View style={styles.dotsRow}>
        <View
          style={[
            styles.trackBackground,
            { backgroundColor: isDark ? "#2A2B2F" : "#E5E7EB" },
          ]}
        />
        <View
          style={[
            styles.trackFill,
            { backgroundColor: colors.cyan },
            isAllCompleted
              ? { right: 5 }
              : { width: TRACK_FILL_WIDTHS[currentStepIndex] },
          ]}
        />
        {STEPS.map((step, index) => {
          const isActive = index < completedSteps;
          const isCurrent = index === currentStepIndex;
          return (
            <View key={step} style={styles.dotContainer}>
              {isCurrent && (
                <View style={styles.glowContainer}>
                  <Svg height="40" width="40" viewBox="0 0 40 40">
                    <Defs>
                      <RadialGradient
                        id={`glow-${index}`}
                        cx="50%"
                        cy="50%"
                        rx="50%"
                        ry="50%"
                      >
                        <Stop
                          offset="0%"
                          stopColor={colors.cyan}
                          stopOpacity="0.6"
                        />
                        <Stop
                          offset="40%"
                          stopColor={colors.cyan}
                          stopOpacity="0.2"
                        />
                        <Stop
                          offset="100%"
                          stopColor={colors.cyan}
                          stopOpacity="0"
                        />
                      </RadialGradient>
                    </Defs>
                    <Circle
                      cx="20"
                      cy="20"
                      r="20"
                      fill={`url(#glow-${index})`}
                    />
                  </Svg>
                </View>
              )}
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isActive
                      ? colors.cyan
                      : isDark
                      ? "#2A2B2F"
                      : "#E5E7EB",
                  },
                ]}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.textsRow}>
        {STEPS.map((step, index) => {
          const isActive = index < completedSteps;
          let alignStyle = styles.textCenter;
          if (index === 0) alignStyle = styles.textLeft;
          if (index === STEPS.length - 1) alignStyle = styles.textRight;

          return (
            <View key={step} style={alignStyle}>
              <AppText
                type={TWELVE}
                weight={isActive ? SEMI_BOLD : MEDIUM}
                style={{
                  color: isActive
                    ? isDark
                      ? colors.white
                      : themeColors.text
                    : colors.darkShadeColorText || "#6A7282",
                  fontFamily: isActive ? fonts.semiBold : fonts.medium,
                }}
              >
                {step}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default AccountSetupProgress;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 8,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
    zIndex: 2,
  },
  trackBackground: {
    position: "absolute",
    top: "50%",
    marginTop: -1.5,
    left: 5,
    right: 5,
    height: 3,
    backgroundColor: "#2A2B2F",
  },
  trackFill: {
    position: "absolute",
    top: "50%",
    marginTop: -1.5,
    left: 5,
    height: 3,
    zIndex: 1,
  },
  dotContainer: {
    width: 10,
    height: 10,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    zIndex: 2,
  },
  glowContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
    top: -15,
    left: -15,
    width: 40,
    height: 40,
  },
  textsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  textLeft: {
    flex: 1,
    alignItems: "flex-start",
  },
  textCenter: {
    flex: 1,
    alignItems: "center",
  },
  textRight: {
    flex: 1,
    alignItems: "flex-end",
  },
});
