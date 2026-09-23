import React from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import RBSheet from "react-native-raw-bottom-sheet";
import { AppText, FOURTEEN, SEMI_BOLD, TWELVE } from "../../../shared";
import { BlurSheetBackground, blurSheetRbCustomStyles, blurSheetTheme } from "./BlurSheetChrome";

const AccountDetailSheet = ({
  sheetRef,
  themeColors,
  theme,
  selectedAccount,
  showBalance,
  safeRound,
}) => {
  const isDark = theme === "Dark";
  const sheetTheme = blurSheetTheme(isDark);

  return (
    <RBSheet
      ref={sheetRef}
      keyboardAvoidingViewEnabled={false}
      customModalProps={{ statusBarTranslucent: true }}
      closeOnDragDown={true}
      closeOnPressMask={true}
      height={280}
      animationType="fade"
      customStyles={blurSheetRbCustomStyles({
        isDark,
        height: 280,
        borderRadius: 26,
        paddingHorizontal: 16,
        paddingTop: 12,
      })}
    >
      <BlurSheetBackground isDark={isDark} />
      {selectedAccount ? (
        <View style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 12 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: sheetTheme.cardBg,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: sheetTheme.borderColor,
                  }}
                >
                  <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: sheetTheme.textColor }}>
                    {String(selectedAccount?.label || "—").charAt(0)}
                  </AppText>
                </View>
                <View>
                  <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: sheetTheme.textColor }}>
                    {selectedAccount?.label}
                  </AppText>
                  <AppText type={TWELVE} style={{ color: sheetTheme.subTextColor }}>Account</AppText>
                </View>
              </View>
              <TouchableOpacity onPress={() => sheetRef.current?.close?.()} style={{ padding: 6 }}>
                <AppText type={FOURTEEN} style={{ color: sheetTheme.subTextColor }}>✕</AppText>
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 12 }}>
              <AppText weight={SEMI_BOLD} style={{ fontSize: 26, color: sheetTheme.textColor }}>
                {showBalance ? `$${safeRound(selectedAccount?.usd, 2)}` : "****"}
              </AppText>
              <AppText type={TWELVE} style={{ marginTop: 4, color: sheetTheme.subTextColor }}>
                {showBalance ? `${safeRound(selectedAccount?.pref, 8)} ${selectedAccount?.cur}` : "****"}
              </AppText>
            </View>

            <View style={{ marginTop: 14, gap: 12 }}>
              <View style={styles.sheetRow}>
                <AppText type={TWELVE} style={{ color: sheetTheme.subTextColor }}>Amount</AppText>
                <AppText weight={SEMI_BOLD} style={{ color: sheetTheme.textColor }}>
                  {showBalance ? `${safeRound(selectedAccount?.pref, 8)} ${selectedAccount?.cur}` : "****"}
                </AppText>
              </View>
              <View style={styles.sheetRow}>
                <AppText type={TWELVE} style={{ color: sheetTheme.subTextColor }}>Estimated (USD)</AppText>
                <AppText weight={SEMI_BOLD} style={{ color: sheetTheme.textColor }}>
                  {showBalance ? `$${safeRound(selectedAccount?.usd, 2)}` : "****"}
                </AppText>
              </View>
              <View style={styles.sheetRow}>
                <AppText type={TWELVE} style={{ color: sheetTheme.subTextColor }}>Ratio</AppText>
                <AppText weight={SEMI_BOLD} style={{ color: sheetTheme.textColor }}>
                  {showBalance ? `${selectedAccount?.ratio}%` : "****"}
                </AppText>
              </View>
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
};

export default AccountDetailSheet;
