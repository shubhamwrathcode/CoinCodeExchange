import React from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import FastImage from "react-native-fast-image";
import RBSheet from "react-native-raw-bottom-sheet";
import Toast from "react-native-simple-toast";
import { AppText, DISCLAIMTEXT, FOURTEEN, SEMI_BOLD, TWELVE } from "../../../shared";
import { bitcoin_ic } from "../../../helper/ImageAssets";
import { colors } from "../../../theme/colors";

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
          // {
          //   key: "convert",
          //   label: "Convert",
          //   onPress: () => Toast.showWithGravity("Coming soon", Toast.LONG, Toast.BOTTOM),
          // },
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
      customStyles={{
        container: {
          backgroundColor: themeColors.background,
          height: 390,
          borderTopRightRadius: 26,
          borderTopLeftRadius: 26,
          paddingHorizontal: 18,
          paddingTop: 14,
        },
        wrapper: {
          backgroundColor: "#0006",
        },
        draggableIcon: {
          backgroundColor: "transparent",
        },
      }}
    >
      {selectedCoin ? (
        <View style={{ flex: 1, backgroundColor: themeColors.background }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ borderRadius: 20, overflow: "hidden" }}>
                  <FastImage
                    source={
                      failedIconMap?.[String(selectedCoin?.currency_id)]
                        ? bitcoin_ic
                        : (buildCoinIconUri(selectedCoin?.icon_path)
                          ? { uri: buildCoinIconUri(selectedCoin?.icon_path) }
                          : bitcoin_ic)
                    }
                    style={{ width: 40, height: 40 }}
                    resizeMode="cover"
                  />
                </View>
                <View>
                  <AppText weight={SEMI_BOLD} type={FOURTEEN}>{selectedCoin?.short_name}</AppText>
                  <AppText type={TWELVE} color={DISCLAIMTEXT}>{selectedCoin?.currency}</AppText>
                </View>
              </View>
              {/* <TouchableOpacity onPress={() => sheetRef.current?.close?.()} style={{ padding: 6 }}>
                <AppText type={FOURTEEN} color={DISCLAIMTEXT}>✕</AppText>
              </TouchableOpacity> */}
            </View>

            <View style={{ marginTop: 14 }}>
              <AppText weight={SEMI_BOLD} style={{ fontSize: 22 }}>
                {safeRound(totalWalletQty(selectedCoin), 8)}
              </AppText>
              <AppText type={TWELVE} color={DISCLAIMTEXT} style={{ marginTop: 2 }}>
                {approxUsdLine(selectedCoin)}
              </AppText>
            </View>

            <View style={{ marginTop: 16, gap: 14 }}>
              <View style={styles.sheetRow}>
                <AppText type={TWELVE} color={DISCLAIMTEXT}>Available</AppText>
                <View style={{ alignItems: "flex-end" }}>
                  <AppText weight={SEMI_BOLD}>{safeRound(selectedCoin?.balance, 8)}</AppText>
                  <AppText type={TWELVE} color={DISCLAIMTEXT}>{usdApproxFromPrice(selectedCoin?.balance, selectedCoin)}</AppText>
                </View>
              </View>
              <View style={styles.sheetRow}>
                <AppText type={TWELVE} color={DISCLAIMTEXT}>In-Order</AppText>
                <View style={{ alignItems: "flex-end" }}>
                  <AppText weight={SEMI_BOLD}>{safeRound(selectedCoin?.locked_balance, 8)}</AppText>
                  <AppText type={TWELVE} color={DISCLAIMTEXT}>{usdApproxFromPrice(selectedCoin?.locked_balance, selectedCoin)}</AppText>
                </View>
              </View>
              <View style={styles.sheetRow}>
                <AppText type={TWELVE} color={DISCLAIMTEXT}>Avg. Cost Price (USD)</AppText>
                <AppText weight={SEMI_BOLD}>{spotUsdPriceLabel(selectedCoin)}</AppText>
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: themeColors.border, marginTop: 12 }} />

            <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
              {actionButtons.map((b) => (
                <TouchableOpacity
                  key={b.key}
                  onPress={() => {
                    sheetRef.current?.close?.();
                    b.onPress?.();
                  }}
                  style={[styles.sheetBtn, { backgroundColor: theme === 'Dark' ? themeColors.themeElevationColor : colors.iconBgColor, borderColor: 'transparent' }]}
                >
                  <AppText weight={SEMI_BOLD} type={FOURTEEN}>{b.label}</AppText>
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

