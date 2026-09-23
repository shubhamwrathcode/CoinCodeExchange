import React from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import FastImage from "react-native-fast-image";
import RBSheet from "react-native-raw-bottom-sheet";
import Toast from "react-native-simple-toast";
import { AppText, FOURTEEN, SEMI_BOLD, TWELVE } from "../../../shared";
import CoinIcon from "../../../common/CoinIcon";
import { BlurSheetBackground, blurSheetRbCustomStyles, blurSheetTheme } from "./BlurSheetChrome";

const CoinDetailSheet = ({
  sheetRef,
  theme,
  themeColors,
  walletType,
  selectedCoin,
  failedIconMap,
  buildCoinIconUri,
  safeRound,
  totalWalletQty,
  approxUsdLine,
  usdApproxFromPrice,
  spotUsdPriceLabel,
  onTrade,
  onTransfer,
  onDeposit,
  onWithdraw,
  onP2PTrade,
  onSwap,
  onEarning,
  onFutures,
}) => {
  const isDark = theme === "Dark";
  const sheetTheme = blurSheetTheme(isDark);

  const actionButtons = React.useMemo(() => {
    switch (String(walletType || "").toLowerCase()) {
      case "main":
        return [
          { key: "transfer", label: "Transfer", onPress: () => onTransfer?.(selectedCoin) },
          { key: "deposit", label: "Deposit", onPress: () => onDeposit?.() },
          { key: "withdraw", label: "Withdraw", onPress: () => onWithdraw?.() },
        ];
      case "p2p":
        return [
          { key: "transfer", label: "Transfer", onPress: () => onTransfer?.(selectedCoin) },
          { key: "p2p", label: "P2P Trade", onPress: () => onP2PTrade?.() },
        ];
      case "swap":
        return [
          { key: "transfer", label: "Transfer", onPress: () => onTransfer?.(selectedCoin) },
          { key: "swap", label: "Swap", onPress: () => onSwap?.() },
        ];
      case "earning":
        return [
          { key: "transfer", label: "Transfer", onPress: () => onTransfer?.(selectedCoin) },
          { key: "earning", label: "Earning", onPress: () => onEarning?.() },
        ];
      case "futures":
        return [
          { key: "transfer", label: "Transfer", onPress: () => onTransfer?.(selectedCoin) },
          { key: "futures", label: "Futures", onPress: () => onFutures?.() },
        ];
      case "spot":
      default:
        return [
          { key: "trade", label: "Trade", onPress: () => onTrade?.(selectedCoin) },
          { key: "transfer", label: "Transfer", onPress: () => onTransfer?.(selectedCoin) },
        ];
    }
  }, [walletType, onTransfer, selectedCoin, onDeposit, onWithdraw, onP2PTrade, onSwap, onEarning, onFutures, onTrade]);

  return (
    <RBSheet
      ref={sheetRef}
      keyboardAvoidingViewEnabled={false}
      customModalProps={{ statusBarTranslucent: true }}
      closeOnDragDown={true}
      closeOnPressMask={true}
      height={390}
      animationType="fade"
      customStyles={blurSheetRbCustomStyles({
        isDark,
        height: 390,
        borderRadius: 26,
        paddingHorizontal: 18,
        paddingTop: 14,
      })}
    >
      <BlurSheetBackground isDark={isDark} />
      {selectedCoin ? (
        <View style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ borderRadius: 20, overflow: "hidden" }}>
                  <CoinIcon
                    coin={selectedCoin}
                    style={{ width: 40, height: 40, borderRadius: 20 }}
                    resizeMode="cover"
                  />
                </View>
                <View>
                  <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: sheetTheme.textColor }}>
                    {selectedCoin?.short_name}
                  </AppText>
                  <AppText type={TWELVE} style={{ color: sheetTheme.subTextColor }}>
                    {selectedCoin?.currency}
                  </AppText>
                </View>
              </View>
            </View>

            <View style={{ marginTop: 14 }}>
              <AppText weight={SEMI_BOLD} style={{ fontSize: 22, color: sheetTheme.textColor }}>
                {safeRound(totalWalletQty(selectedCoin), 8)}
              </AppText>
              <AppText type={TWELVE} style={{ marginTop: 2, color: sheetTheme.subTextColor }}>
                {approxUsdLine(selectedCoin)}
              </AppText>
            </View>

            <View style={{ marginTop: 16, gap: 14 }}>
              <View style={styles.sheetRow}>
                <AppText type={TWELVE} style={{ color: sheetTheme.subTextColor }}>Available</AppText>
                <View style={{ alignItems: "flex-end" }}>
                  <AppText weight={SEMI_BOLD} style={{ color: sheetTheme.textColor }}>
                    {safeRound(selectedCoin?.balance, 8)}
                  </AppText>
                  <AppText type={TWELVE} style={{ color: sheetTheme.subTextColor }}>
                    {usdApproxFromPrice(selectedCoin?.balance, selectedCoin)}
                  </AppText>
                </View>
              </View>
              <View style={styles.sheetRow}>
                <AppText type={TWELVE} style={{ color: sheetTheme.subTextColor }}>In-Order</AppText>
                <View style={{ alignItems: "flex-end" }}>
                  <AppText weight={SEMI_BOLD} style={{ color: sheetTheme.textColor }}>
                    {safeRound(selectedCoin?.locked_balance, 8)}
                  </AppText>
                  <AppText type={TWELVE} style={{ color: sheetTheme.subTextColor }}>
                    {usdApproxFromPrice(selectedCoin?.locked_balance, selectedCoin)}
                  </AppText>
                </View>
              </View>
              <View style={styles.sheetRow}>
                <AppText type={TWELVE} style={{ color: sheetTheme.subTextColor }}>Avg. Cost Price (USD)</AppText>
                <AppText weight={SEMI_BOLD} style={{ color: sheetTheme.textColor }}>
                  {spotUsdPriceLabel(selectedCoin)}
                </AppText>
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: sheetTheme.rowBorderColor, marginTop: 12 }} />

            <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
              {actionButtons.map((b) => (
                <TouchableOpacity
                  key={b.key}
                  onPress={() => {
                    sheetRef.current?.close?.();
                    b.onPress?.();
                  }}
                  style={[styles.sheetBtn, { backgroundColor: sheetTheme.buttonBg }]}
                >
                  <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: sheetTheme.textColor }}>
                    {b.label}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      ) : (
        <View />
      )}
    </RBSheet>
  );
};

const styles = {
  sheetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sheetBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
};

export default CoinDetailSheet;
