import React from "react";
import { View, TextInput, TouchableOpacity, Clipboard, ScrollView } from "react-native";
import { AppText, FOURTEEN, SIXTEEN, SEMI_BOLD, TWENTY, BOLD, TWELVE, MEDIUM, TEN, THIRTEEN, ELEVEN } from "../../../../shared";
import { colors, lightTheme } from "../../../../theme/colors";
import FastImage from "react-native-fast-image";
import { pasteImg, bitcoinIcon } from "../../../../helper/ImageAssets";
import QRCode from "react-native-qrcode-svg";
import { showSuccess } from "../../../../helper/logger";
import moment from "moment";
import NavigationService from "../../../../navigation/NavigationService";

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
                    backgroundColor: isDark ? "transparent" : "#EDEDEE",
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: isFocused ? (isDark ? "#FFF" : "#000") : (isDark ? themeColors.border : "transparent"),
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
              <AppText type={FOURTEEN} weight={MEDIUM} style={{ textDecorationLine: saveAddrResendActive ? 'underline' : 'none', color: saveAddrResendActive ? (isDark ? "#FFF" : "#000") : themeColors.secondaryText }} >
                {saveAddrOtpTimer > 0 ? `Resend in ${saveAddrOtpTimer}s` : "Resend Code"}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity onPress={handlePaste} style={{ flexDirection: "row", alignItems: "center" }}>
              <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: themeColors.text, marginRight: 6 }}>Paste</AppText>
              <FastImage source={pasteImg} style={{ width: 16, height: 16 }} tintColor={isDark ? colors.white : undefined} resizeMode="contain" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {saveAddrStep === "satoshi" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          <View style={{ marginBottom: 20 }}>
            <AppText type={TWELVE} weight={MEDIUM} style={{ color: themeColors.secondaryText, marginBottom: 0 }}>
              To verify you own this address, please send exactly:
            </AppText>
            <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
              Send exactly {saveAddrWhitelistData?.proof_amount} {saveAddrWhitelistData?.proof_asset}.
            </AppText>
            <AppText type={TWELVE} weight={MEDIUM} style={{ color: themeColors.secondaryText, lineHeight: 18, marginTop: 5 }}>
              The deposit must come from the address you are whitelisting. Send this micro-amount to your Coincode deposit address for {saveAddrWhitelistData?.proof_asset} ({saveAddrWhitelistData?.proof_chain}). Scan the QR code below or copy the address.
            </AppText>
          </View>

          {satoshiDepositError ? (
            <View style={{ marginBottom: 20 }}>
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
            <View style={{
              backgroundColor: 'transparent',
              borderRadius: 16,
              padding: 20,
              alignItems: "center",
              borderWidth: isDark ? 1 : 0,
              borderColor: isDark ? themeColors.border : "transparent",
              marginBottom: 20,
              width: "100%"
            }}>
              <View style={{
                backgroundColor: "#FFF",
                padding: 12,
                borderRadius: 12,
                marginBottom: 12,
                elevation: 4,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4
              }}>
                <QRCode
                  value={saveAddrWhitelistData?.deposit_address || saveAddrWhitelistData?.address || "—"}
                  size={120}
                  color="#000"
                  backgroundColor="#FFF"
                />
              </View>
              <AppText type={TWELVE} weight={MEDIUM} style={{ color: colors.cyanTheme }}>Scan to Deposit</AppText>

              <View style={{ width: "100%", marginTop: 8 }}>
                <AppText type={TWELVE} weight={MEDIUM} style={{ color: themeColors.secondaryText, marginBottom: 8, textAlign: 'center' }}>
                  YOUR Coincode DEPOSIT ADDRESS
                </AppText>
                <View style={{
                  flexDirection: "row",
                  backgroundColor: isDark ? "transparent" : "#EDEDEE",
                  borderRadius: 9,
                  padding: 6,
                  alignItems: "center",
                  borderWidth: isDark ? 1 : 0,
                  borderColor: isDark ? themeColors.border : "transparent"
                }}>
                  <AppText type={TWELVE} style={{ color: themeColors.text, flex: 1, paddingHorizontal: 10 }} numberOfLines={1}>
                    {saveAddrWhitelistData?.deposit_address || saveAddrWhitelistData?.address || "—"}
                  </AppText>
                  <TouchableOpacity
                    onPress={handleCopyAddress}
                    style={{
                      backgroundColor: 'transparent',
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderColor: isDark ? themeColors.border : "#CCC",
                      borderWidth: 1
                    }}
                  >
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>Copy</AppText>
                  </TouchableOpacity>
                </View>
              </View>

              {saveAddrWhitelistData?.memo && (
                <View style={{ width: "100%", marginTop: 16 }}>
                  <AppText type={TWELVE} weight={BOLD} style={{ color: themeColors.secondaryText, marginBottom: 8, letterSpacing: 0.5 }}>
                    MEMO (TAG)
                  </AppText>
                  <View style={{
                    flexDirection: "row",
                    backgroundColor: isDark ? "transparent" : "#EDEDEE",
                    borderRadius: 9,
                    padding: 6,
                    alignItems: "center",
                    borderWidth: isDark ? 1 : 0,
                    borderColor: isDark ? themeColors.border : "transparent"
                  }}>
                    <AppText type={TWELVE} style={{ color: themeColors.text, flex: 1, paddingHorizontal: 10 }} numberOfLines={1}>
                      {saveAddrWhitelistData.memo}
                    </AppText>
                    <TouchableOpacity
                      onPress={() => {
                        Clipboard.setString(saveAddrWhitelistData.memo);
                        showSuccess("Memo copied");
                      }}
                      style={{
                        backgroundColor: 'transparent',
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderColor: isDark ? themeColors.border : "#CCC",
                        borderWidth: 1
                      }}
                    >
                      <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>Copy</AppText>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ) : null}

          {/* Expiry Bar */}
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 4,
            marginBottom: 20
          }}>
            <AppText type={TWELVE} weight={MEDIUM} style={{ color: themeColors.secondaryText }}>
              ⏱ You have 24 hours. Expires: {saveAddrWhitelistData?.expires_at ? moment(saveAddrWhitelistData.expires_at).format("DD MMM YYYY, HH:mm") : "—"}
            </AppText>
          </View>

          {saveAddrSatoshiPolling && (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F0F9FF", borderRadius: 12, marginBottom: 16 }}>
              <View style={{ width: 16, height: 16, borderRadius: 8, borderTopWidth: 2, borderColor: colors.cyanTheme, marginRight: 10 }} />
              <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: colors.cyanTheme }}>Checking with server…</AppText>
            </View>
          )}

          {satoshiWhitelistAwaitingProof && (
            <View style={{ backgroundColor: "transparent", borderRadius: 12, padding: 12, borderWidth: isDark ? 0 : 1, borderColor: isDark ? "transparent" : "#E5E7EB", marginBottom: 16 }}>
              <AppText type={THIRTEEN} weight={BOLD} style={{ color: isDark ? "#FFF" : "black", marginBottom: 6 }}>Deposit not confirmed yet</AppText>
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

export default AddWithdrawalAddressVerification;
