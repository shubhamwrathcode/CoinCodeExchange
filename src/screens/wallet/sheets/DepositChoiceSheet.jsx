import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import FastImage from "react-native-fast-image";
import AnimatedBottomSheet from "../../../common/AnimatedBottomSheet/AnimatedBottomSheet";
import {
  AppText,
  BOLD,
  SEMI_BOLD,
  TWENTY,
  FIFTEEN,
  TWELVE,
} from "../../../shared";
import {
  closeIcon,
  depositFiatWhite,
  depositFiatBlack,
  newDepositIcon,
  newDepositDarkIcon,
  depositCryptoWhite,
  depositCryptoBlack,
} from "../../../helper/ImageAssets";
import NavigationService from "../../../navigation/NavigationService";
import { DEPOSIT_COIN_SCREEN, DEPOSIT_FIAT_SCREEN } from "../../../navigation/routes";

const DepositChoiceSheet = ({ sheetRef, isDark, onSelectFiat }) => {
  const handleDepositCrypto = () => {
    sheetRef.current?.close?.();
    NavigationService.navigate(DEPOSIT_COIN_SCREEN);
  };

  const handleDepositFiat = () => {
    sheetRef.current?.close?.();
    if (typeof onSelectFiat === "function") {
      onSelectFiat();
    } else {
      NavigationService.navigate(DEPOSIT_FIAT_SCREEN);
    }
  };

  const textColor = isDark ? "#FFFFFF" : "#000000";
  const subTextColor = isDark ? "rgba(255,255,255,0.55)" : "#8A94A6";
  const cardBg = isDark ? "rgba(255,255,255,0.06)" : "#F9FAFB";
  const borderColor = isDark ? "rgba(255,255,255,0.10)" : "#E5E7EB";
  const iconBadgeBg = isDark ? "rgba(255,255,255,0.10)" : "#EDF2F7";
  const closeCircleBg = isDark ? "rgba(255,255,255,0.12)" : "#E8E8E8";
  const closeIconTint = isDark ? "#FFFFFF" : "#000000";

  return (
    <AnimatedBottomSheet
      ref={sheetRef}
      sheetHeight={280}
      isDark={isDark}
    >
      <View style={styles.sheetInner}>
        {/* Header */}
        <View style={styles.sheetHead}>
          <AppText
            type={TWENTY}
            weight={BOLD}
            style={styles.sheetTitle}
            color={textColor}
          >
            Deposit
          </AppText>
          <TouchableOpacity
            onPress={() => sheetRef.current?.close?.()}
            style={[styles.closeCircle, { backgroundColor: closeCircleBg }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.75}
          >
            <FastImage
              source={closeIcon}
              style={styles.closeIcon}
              resizeMode={FastImage.resizeMode.contain}
              tintColor={closeIconTint}
            />
          </TouchableOpacity>
        </View>

        {/* Options List */}
        <View style={styles.optionsList}>
          {/* Deposit Crypto */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleDepositCrypto}
            style={[
              styles.optionCard,
              {
                backgroundColor: cardBg,
                borderColor: borderColor,
              },
            ]}
          >
            <View style={styles.optionLeft}>
              <View
                style={[
                  styles.iconBadge,
                  { backgroundColor: iconBadgeBg },
                ]}
              >
                <FastImage
                  source={isDark ? depositCryptoWhite : depositCryptoBlack}
                  style={styles.actionIcon}
                  resizeMode={FastImage.resizeMode.contain}
                />
              </View>
              <View style={styles.textWrap}>
                <AppText
                  type={FIFTEEN}
                  weight={BOLD}
                  style={styles.optionTitle}
                  color={textColor}
                >
                  Deposit Crypto
                </AppText>
                <AppText
                  type={TWELVE}
                  style={styles.optionSubtitle}
                  color={subTextColor}
                >
                  Deposit crypto assets via the blockchain
                </AppText>
              </View>
            </View>
            <AppText
              type={TWENTY}
              weight={SEMI_BOLD}
              color={subTextColor}
            >
              ›
            </AppText>
          </TouchableOpacity>

          {/* Deposit Fiat */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleDepositFiat}
            style={[
              styles.optionCard,
              {
                backgroundColor: cardBg,
                borderColor: borderColor,
              },
            ]}
          >
            <View style={styles.optionLeft}>
              <View
                style={[
                  styles.iconBadge,
                  { backgroundColor: iconBadgeBg },
                ]}
              >
                <FastImage
                  source={isDark ? depositFiatWhite : depositFiatBlack}
                  style={styles.actionIcon}
                  resizeMode={FastImage.resizeMode.contain}
                />
              </View>
              <View style={styles.textWrap}>
                <AppText
                  type={FIFTEEN}
                  weight={BOLD}
                  style={styles.optionTitle}
                  color={textColor}
                >
                  Deposit Fiat
                </AppText>
                <AppText
                  type={TWELVE}
                  style={styles.optionSubtitle}
                  color={subTextColor}
                >
                  Deposit funds via bank transfer
                </AppText>
              </View>
            </View>
            <AppText
              type={TWENTY}
              weight={SEMI_BOLD}
              color={subTextColor}
            >
              ›
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </AnimatedBottomSheet>
  );
};

const styles = StyleSheet.create({
  sheetInner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  sheetHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    letterSpacing: -0.2,
  },
  closeCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: {
    width: 14,
    height: 14,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  actionIcon: {
    width: 24,
    height: 24,
  },
  textWrap: {
    flex: 1,
  },
  optionTitle: {
    marginBottom: 3,
  },
  optionSubtitle: {
    lineHeight: 16,
  },
});

export default DepositChoiceSheet;
