import React from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import RBSheet from "react-native-raw-bottom-sheet";
import Toast from "react-native-simple-toast";
import { AppText, DISCLAIMTEXT, FOURTEEN, SEMI_BOLD, TWELVE } from "../../../shared";
import { colors } from "../../../theme/colors";

const AccountDetailSheet = ({
  sheetRef,
  themeColors,
  theme,
  selectedAccount,
  showBalance,
  safeRound,
  onTransfer,
}) => {
  return (
    <RBSheet
      ref={sheetRef}
      keyboardAvoidingViewEnabled={false}
      customModalProps={{ statusBarTranslucent: true }}
      closeOnDragDown={true}
      closeOnPressMask={true}
      height={360}
      animationType="fade"
      customStyles={{
        container: {
          backgroundColor: themeColors.background,
          height: 360,
          borderTopRightRadius: 26,
          borderTopLeftRadius: 26,
          paddingHorizontal: 16,
          paddingTop: 12,
        },
        wrapper: {
          backgroundColor: "#0006",
        },
        draggableIcon: {
          backgroundColor: "transparent",
        },
      }}
    >
      {selectedAccount ? (
        <View style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: themeColors.themeElevationColor,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: themeColors.border,
                  }}
                >
                  <AppText weight={SEMI_BOLD} type={FOURTEEN}>
                    {String(selectedAccount?.label || "—").charAt(0)}
                  </AppText>
                </View>
                <View>
                  <AppText weight={SEMI_BOLD} type={FOURTEEN}>{selectedAccount?.label}</AppText>
                  <AppText type={TWELVE} color={DISCLAIMTEXT}>Account</AppText>
                </View>
              </View>
              <TouchableOpacity onPress={() => sheetRef.current?.close?.()} style={{ padding: 6 }}>
                <AppText type={FOURTEEN} color={DISCLAIMTEXT}>✕</AppText>
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 12 }}>
              <AppText weight={SEMI_BOLD} style={{ fontSize: 26 }}>
                {showBalance ? `$${safeRound(selectedAccount?.usd, 2)}` : "****"}
              </AppText>
              <AppText type={TWELVE} color={DISCLAIMTEXT} style={{ marginTop: 4 }}>
                {showBalance ? `${safeRound(selectedAccount?.pref, 8)} ${selectedAccount?.cur}` : "****"}
              </AppText>
            </View>

            <View style={{ marginTop: 14, gap: 12 }}>
              <View style={styles.sheetRow}>
                <AppText type={TWELVE} color={DISCLAIMTEXT}>Amount</AppText>
                <AppText weight={SEMI_BOLD}>
                  {showBalance ? `${safeRound(selectedAccount?.pref, 8)} ${selectedAccount?.cur}` : "****"}
                </AppText>
              </View>
              <View style={styles.sheetRow}>
                <AppText type={TWELVE} color={DISCLAIMTEXT}>Estimated (USD)</AppText>
                <AppText weight={SEMI_BOLD}>
                  {showBalance ? `$${safeRound(selectedAccount?.usd, 2)}` : "****"}
                </AppText>
              </View>
              <View style={styles.sheetRow}>
                <AppText type={TWELVE} color={DISCLAIMTEXT}>Ratio</AppText>
                <AppText weight={SEMI_BOLD}>
                  {showBalance ? `${selectedAccount?.ratio}%` : "****"}
                </AppText>
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: themeColors.border, marginTop: 14 }} />

            <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
              <TouchableOpacity
                onPress={() => {
                  sheetRef.current?.close?.();
                  onTransfer?.(selectedAccount);
                }}
                style={[styles.sheetBtn, { backgroundColor: theme === 'Dark' ? themeColors.themeElevationColor : colors.iconBgColor }]}
              >
                <AppText weight={SEMI_BOLD} type={FOURTEEN}>Transfer</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  sheetRef.current?.close?.();
                  Toast.showWithGravity("Coming soon", Toast.LONG, Toast.BOTTOM);
                }}
                style={[styles.sheetBtn, { backgroundColor: theme === 'Dark' ? themeColors.themeElevationColor : colors.iconBgColor }]}
              >
                <AppText weight={SEMI_BOLD} type={FOURTEEN}>History</AppText>
              </TouchableOpacity>
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

export default AccountDetailSheet;

