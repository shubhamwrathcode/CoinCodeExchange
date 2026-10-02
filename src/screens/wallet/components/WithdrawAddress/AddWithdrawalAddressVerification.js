import React from "react";
import { View, TextInput, TouchableOpacity, Clipboard, ScrollView, StyleSheet, Image } from "react-native";
import { Clock, Copy, Info } from "lucide-react-native";
import { AppText, FOURTEEN, SIXTEEN, SEMI_BOLD, TWENTY, BOLD, TWELVE, MEDIUM, TEN, THIRTEEN, ELEVEN } from "../../../../shared";
import { colors, lightTheme } from "../../../../theme/colors";
import FastImage from "react-native-fast-image";
import { pasteImg, bitcoinIcon, barcodeFrame } from "../../../../helper/ImageAssets";
import QRCode from "react-native-qrcode-svg";
import { showSuccess } from "../../../../helper/logger";
import moment from "moment";
import NavigationService from "../../../../navigation/NavigationService";
import { blurSheetTheme } from "../../sheets/BlurSheetChrome";

const AddWithdrawalAddressVerification = ({
  isDark,
  themeColors,
  saveAddrStep,
  selectedSaveAddrVerifyMethod,
  saveAddrOtp,
  setSaveAddrOtp,
  saveAddrWhitelistData,
  userData,
  saveAddrOtpTimer,
  saveAddrResendActive,
  handleResendSaveAddrOtp,
  saveAddrSatoshiPolling,
  satoshiWhitelistAwaitingProof,
  satoshiDepositLoading,
  satoshiDepositError,
  handleSatoshiWhitelistSent,
  setSatoshiDepositLoading,
  setSaveAddrStep
}) => {
  console.warn("[UI] Whitelist Data::", JSON.stringify(saveAddrWhitelistData, null, 2));
  if (saveAddrStep !== "otp" && saveAddrStep !== "satoshi" && saveAddrStep !== "metamask") return null;

  const sheet = blurSheetTheme(isDark);
  const accentBg = isDark ? "rgba(10, 168, 197, 0.10)" : "rgba(10, 168, 197, 0.08)";
  const accentBorder = isDark ? "rgba(10, 168, 197, 0.35)" : "rgba(10, 168, 197, 0.25)";
  const copyRowBg = isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF";

  const email = userData?.emailId || "";
  const [local, domain] = email.split("@");
  const maskedEmail = email ? `${local.slice(0, 2)}***@${domain}` : "";

  const handlePaste = async () => {
    try {
      const content = await Clipboard.getString();
      if (content && content.length <= 6 && /^\d+$/.test(content)) {
        setSaveAddrOtp(content);
      }
    } catch (e) {
      console.warn("Paste failed", e);
    }
  };
  const handleCopyAddress = () => {
    Clipboard.setString(saveAddrWhitelistData?.deposit_address || saveAddrWhitelistData?.address || "");
    showSuccess("Address copied to clipboard");
  };

  return (
    <View style={{ flex: 1 }}>
      {saveAddrStep === "otp" && (
        <View style={{ paddingVertical: 10 }}>
          <View style={{ marginBottom: 24 }}>

            <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: themeColors.secondaryText, lineHeight: 18 }}>
              {selectedSaveAddrVerifyMethod === "google_authenticator"
                ? "Enter the 6-digit code from your authenticator app."
                : selectedSaveAddrVerifyMethod === "mobile"
                  ? `The verification code has been sent to your phone, valid for 10 minutes.`
                  : `The verification code has been sent to your email ${maskedEmail}, valid for 10 minutes.`
              }
            </AppText>
          </View>

          {/* OTP Boxes Row */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 20 }}>
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const char = saveAddrOtp[index] || "";
              const isFocused = saveAddrOtp.length === index;
              return (
                <View
                  key={index}
                  style={{
                    width: 48,
                    height: 56,
                    borderRadius: 10,
                    backgroundColor: sheet.cardBg,
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: isFocused || char ? colors.cyanTheme : sheet.borderColor,
                  }}
                >
                  <AppText type={TWENTY} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
                    {char}
                  </AppText>
                </View>
              );
            })}
            <TextInput
              value={saveAddrOtp}
              onChangeText={setSaveAddrOtp}
              maxLength={6}
              keyboardType="number-pad"
              autoFocus
              style={{ position: "absolute", width: "100%", height: "100%", opacity: 0 }}
            />
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
            <TouchableOpacity onPress={handleResendSaveAddrOtp} disabled={!saveAddrResendActive}>
              <AppText type={FOURTEEN} weight={MEDIUM} style={{ textDecorationLine: saveAddrResendActive ? 'underline' : 'none', color: saveAddrResendActive ? colors.cyanTheme : themeColors.secondaryText }} >
                {saveAddrOtpTimer > 0 ? `Resend in ${saveAddrOtpTimer}s` : "Resend Code"}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity onPress={handlePaste} style={{ flexDirection: "row", alignItems: "center" }}>
              <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: colors.cyanTheme, marginRight: 6 }}>Paste</AppText>
              <FastImage source={pasteImg} style={{ width: 16, height: 16 }} tintColor={colors.cyanTheme} resizeMode="contain" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {saveAddrStep === "satoshi" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
          <View style={[styles.satoshiCard, { backgroundColor: sheet.cardBg, borderColor: sheet.borderColor }]}>
            <View style={styles.satoshiInfoRow}>
              <Info size={16} strokeWidth={2} color={themeColors.secondaryText} style={{ marginTop: 2 }} />
              <AppText type={TWELVE} style={{ color: themeColors.secondaryText, lineHeight: 20, flex: 1 }}>
                Send exactly{" "}
                <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
                  {saveAddrWhitelistData?.proof_amount} {saveAddrWhitelistData?.proof_asset}
                </AppText>
                . The deposit must come from the address you are whitelisting. Send this micro-amount to your Coincode deposit address for {saveAddrWhitelistData?.proof_asset} ({saveAddrWhitelistData?.proof_chain}). Scan the QR code below or copy the address.
              </AppText>
            </View>

            {satoshiDepositError ? (
              <View style={{ marginBottom: 16 }}>
                <AppText type={TWELVE} weight={MEDIUM} style={{ color: colors.red, lineHeight: 20 }}>
                  {satoshiDepositError}{"  "}
                  <AppText
                    type={TWELVE}
                    weight={MEDIUM}
                    style={{ color: colors.cyanTheme, textDecorationLine: "underline" }}
                    onPress={() => NavigationService.navigate("DEPOSIT_COIN_SCREEN")}
                  >
                    Open Deposit
                  </AppText>
                </AppText>
              </View>
            ) : null}

            {satoshiDepositLoading ? (
              <View style={{ alignItems: "center", paddingVertical: 30 }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, borderTopWidth: 2, borderColor: colors.cyanTheme, marginBottom: 12 }} />
                <AppText type={TWELVE} weight={MEDIUM} style={{ color: colors.cyanTheme }}>Loading your deposit address…</AppText>
              </View>
            ) : !satoshiDepositError && (saveAddrWhitelistData?.deposit_address || saveAddrWhitelistData?.address) ? (
              <View style={{ width: "100%" }}>
                <View style={styles.qrFrame}>
                  <Image source={barcodeFrame} style={styles.qrFrameImage} resizeMode="stretch" />
                  <View style={styles.qrPanel}>
                    <QRCode
                      value={saveAddrWhitelistData?.deposit_address || saveAddrWhitelistData?.address || "—"}
                      size={120}
                      color="#000000"
                      backgroundColor="#FFFFFF"
                      quietZone={4}
                    />
                  </View>
                </View>

                <View style={[styles.copyRow, { backgroundColor: copyRowBg, borderColor: sheet.borderColor }]}>
                  <AppText type={TWELVE} weight={MEDIUM} numberOfLines={1} ellipsizeMode="middle" style={{ color: themeColors.text, flex: 1 }}>
                    {saveAddrWhitelistData?.deposit_address || saveAddrWhitelistData?.address || "—"}
                  </AppText>
                  <TouchableOpacity onPress={handleCopyAddress} style={[styles.copyBtn, { backgroundColor: sheet.buttonBg }]} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Copy size={16} strokeWidth={2} color={themeColors.text} />
                  </TouchableOpacity>
                </View>

                {saveAddrWhitelistData?.memo && (
                  <View style={{ width: "100%", marginTop: 12 }}>
                    <AppText type={ELEVEN} weight={SEMI_BOLD} style={{ color: themeColors.secondaryText, marginBottom: 6, letterSpacing: 0.5 }}>
                      MEMO (TAG)
                    </AppText>
                    <View style={[styles.copyRow, { backgroundColor: copyRowBg, borderColor: sheet.borderColor }]}>
                      <AppText type={TWELVE} weight={MEDIUM} numberOfLines={1} style={{ color: themeColors.text, flex: 1 }}>
                        {saveAddrWhitelistData.memo}
                      </AppText>
                      <TouchableOpacity
                        onPress={() => {
                          Clipboard.setString(saveAddrWhitelistData.memo);
                          showSuccess("Memo copied");
                        }}
                        style={[styles.copyBtn, { backgroundColor: sheet.buttonBg }]}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Copy size={16} strokeWidth={2} color={themeColors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ) : null}

            <View style={styles.expiryRow}>
              <Clock size={14} strokeWidth={2} color={themeColors.secondaryText} />
              <AppText type={TWELVE} weight={MEDIUM} style={{ color: themeColors.secondaryText, flex: 1 }}>
                You have <AppText type={TWELVE} weight={MEDIUM} style={{ color: colors.cyanTheme }}>24 hours.</AppText>
                {" "}Expires:{" "}
                <AppText type={TWELVE} weight={MEDIUM} style={{ color: colors.cyanTheme }}>
                  {saveAddrWhitelistData?.expires_at ? moment(saveAddrWhitelistData.expires_at).format("DD MMM YYYY, HH:mm") : "—"}
                </AppText>
              </AppText>
            </View>
          </View>

          {saveAddrSatoshiPolling && (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, backgroundColor: accentBg, borderWidth: 1, borderColor: accentBorder, borderRadius: 12, marginBottom: 16 }}>
              <View style={{ width: 16, height: 16, borderRadius: 8, borderTopWidth: 2, borderColor: colors.cyanTheme, marginRight: 10 }} />
              <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: colors.cyanTheme }}>Checking with server…</AppText>
            </View>
          )}

          {satoshiWhitelistAwaitingProof && (
            <View style={{ backgroundColor: sheet.cardBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: sheet.borderColor, marginBottom: 16 }}>
              <AppText type={THIRTEEN} weight={BOLD} style={{ color: themeColors.text, marginBottom: 6 }}>Deposit not confirmed yet</AppText>
              <AppText type={ELEVEN} style={{ color: themeColors.secondaryText, lineHeight: 16 }}>
                Your micro-deposit can take time to arrive and for our systems to detect it. {"\n\n"}
                You may close this dialog and watch the entry under <AppText type={ELEVEN} weight={BOLD} style={{ color: themeColors.text }}>My Address</AppText> in your address book. When it is approved you can use it for withdrawals. Use <AppText type={ELEVEN} weight={BOLD} style={{ color: themeColors.text }}>Check again</AppText> below to ask the server once more.
              </AppText>
            </View>
          )}

        </ScrollView>
      )}

      {saveAddrStep === "metamask" && (
        <View style={{ gap: 20 }}>
          <View style={{ gap: 12 }}>
            <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: themeColors.secondaryText, lineHeight: 18 }}>
              Sign the verification message with MetaMask using the same wallet as the address above.
            </AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText, lineHeight: 18 }}>
              Use <AppText weight={BOLD} style={{ color: themeColors.text }}>Sign with MetaMask</AppText> to connect and sign. If the MetaMask app is not installed, you will be redirected to the app store.
            </AppText>

            {saveAddrWhitelistData?.expires_at && (
              <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 8 }}>
                Expires: {moment(saveAddrWhitelistData.expires_at).format("MMMM D, YYYY, h:mm A")}
              </AppText>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  satoshiCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  satoshiInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 20,
  },
  qrFrame: {
    width: 168,
    height: 168,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  qrFrameImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  qrPanel: {
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  copyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingLeft: 16,
    paddingRight: 10,
  },
  copyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  expiryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
});

export default AddWithdrawalAddressVerification;
