import React, { useRef, useState } from "react";
import {
  AppSafeAreaView,
  AppText,
  Button,
  EIGHTEEN,
  FOURTEEN,
  SEMI_BOLD,
  SIXTEEN,
  THIRTEEN,
} from "../../shared";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  useWindowDimensions,
} from "react-native";
import RBSheet from "react-native-raw-bottom-sheet";
import FastImage from "react-native-fast-image";
import { colors } from "../../theme/colors";
import { useKycForm } from "../../context/KycFormContext";
import NavigationService from "../../navigation/NavigationService";
import { KYC_STEP_SIX_SCREEN, KYC_STATUS_SCREEN } from "../../navigation/routes";
import { appBg, back_ic, closeIcon, EMAIL, KEY_ICON, PHONE, SHARE_NEW_ICON } from "../../helper/ImageAssets";
import { OtpInput6Digit } from "../../shared";
import TouchableOpacityView from "../../shared/components/TouchableOpacityView";
import { SpinnerSecond } from "../../shared/components/SpinnerSecond";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { getUserProfile } from "../../actions/accountActions";
import { kyc_completed } from "../../helper/ImageAssets";

import { useTheme } from "../../hooks/useTheme";

const getMethodIcon = (type) => {
  switch (type) {
    case 1: return EMAIL;
    case 2: return KEY_ICON;
    case 3: return PHONE;
    default: return EMAIL;
  }
};

const getMethodDescription = (type) => {
  switch (type) {
    case 1: return "Receive verification codes via email";
    case 2: return "Use Google Authenticator app";
    case 3: return "Receive verification codes via SMS";
    default: return "";
  }
};

const KycVerificationScreen = () => {
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const isSubmittingKyc = useAppSelector((state) => state.auth.isLoading);
  const optionsSheetRef = useRef(null);
  const { height: winHeight } = useWindowDimensions();
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const {
    userData,
    selectedAuthMethod,
    setSelectedAuthMethod,
    emailOtp,
    setemailOtp,
    modalOtpTimer,
    availableVerifyMethods,
    handleGetOtp,
    handleKycSubmit,
  } = useKycForm();

  const accentColor = themeColors.button;
  const bgClr = themeColors.background;
  const textClr = themeColors.text;
  const mutedClr = themeColors.secondaryText;

  const alternativeMethods = (availableVerifyMethods || []).filter((m) => m.type !== selectedAuthMethod);
  const hasAlternative = alternativeMethods.length > 0;
  const optionsSheetHeight = Math.min(Math.max(180, 124 + 56 * alternativeMethods.length), winHeight * 0.6);

  const getTitle = () => {
    if (selectedAuthMethod === 1) return "Email OTP Verification";
    if (selectedAuthMethod === 2) return "Google Authenticator Verification";
    return "Mobile OTP Verification";
  };

  const getDescription = () => {
    if (selectedAuthMethod === 1) return `Enter the 6-digit code sent to ${userData?.emailId || "your email"}.`;
    if (selectedAuthMethod === 2) return "Enter the 6-digit code from your Google Authenticator app.";
    return `Enter the 6-digit code sent to ${userData?.mobileNumber || "your phone"}.`;
  };

  const getInputLabel = () => {
    if (selectedAuthMethod === 1) return "Email Verification Code";
    if (selectedAuthMethod === 2) return "Authenticator Code";
    return "Phone Verification Code";
  };

  const onBack = () => {
    NavigationService.goBack();
  };

  const onSuccess = () => {
    setSubmitSuccess(true);
  };

  const onDone = () => {
    dispatch(getUserProfile());
    NavigationService.navigate(KYC_STATUS_SCREEN);
  };

  const handleSubmit = () => {
    if (emailOtp?.length < 6) return;
    Keyboard.dismiss();
    handleKycSubmit(onSuccess);
  };

  const sheetCustomStyles = {
    container: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      backgroundColor: themeColors.card,
    },
    wrapper: { backgroundColor: "rgba(0,0,0,0.5)" },
    draggableIcon: { backgroundColor: "transparent" },
  };

  if (submitSuccess) {
    return (
      <AppSafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <ScrollView contentContainerStyle={styles.successScroll} showsVerticalScrollIndicator={false}>
          <FastImage source={kyc_completed} resizeMode="contain" style={styles.successIcon} />
          <AppText type={SIXTEEN} weight={SEMI_BOLD} style={[styles.successTitle, { color: textClr }]}>Verification submitted</AppText>
          <AppText type={FOURTEEN} style={[styles.successSubtitle, { color: mutedClr }]}>
            Your review will be completed within 48 hours. We'll notify you once verification is complete.
          </AppText>
          <TouchableOpacity style={[styles.doneBtn, { backgroundColor: accentColor }]} onPress={onDone} activeOpacity={0.85}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.buttonText }}>Done</AppText>
          </TouchableOpacity>
        </ScrollView>
      </AppSafeAreaView>
    );
  }

  return (
    <AppSafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.navRow}>
            <TouchableOpacity onPress={onBack} style={styles.navBtn}>
              <FastImage source={back_ic} resizeMode="contain" style={[styles.navIcon, { tintColor: textClr }]} />
            </TouchableOpacity>
          </View>

          <AppText weight={SEMI_BOLD} type={EIGHTEEN} style={[styles.title, { color: textClr }]}>{getTitle()}</AppText>
          <AppText type={THIRTEEN} style={[styles.description, { color: mutedClr }]}>{getDescription()}</AppText>

          <OtpInput6Digit
            label={getInputLabel()}
            value={emailOtp}
            onChangeText={setemailOtp}
            isDark={isDark}
          />

          {selectedAuthMethod !== 2 && (
            <View style={styles.resendRow}>
              {modalOtpTimer > 0 ? (
                <View style={{ alignItems: "flex-end", width: "100%" }}>
                  <AppText type={THIRTEEN} style={{ color: mutedClr }}>Resend ({modalOtpTimer}s)</AppText>
                </View>
              ) : (
                <TouchableOpacityView onPress={handleGetOtp} style={{ alignItems: "flex-end", width: "100%" }}>
                  <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: accentColor }}>Get OTP</AppText>
                </TouchableOpacityView>
              )}
            </View>
          )}

          <Button
            children="Verify & Submit KYC"
            disabled={!emailOtp || emailOtp.length < 6}
            loading={isSubmittingKyc}
            onPress={handleSubmit}
            containerStyle={[styles.submitBtn, { backgroundColor: accentColor }]}
          />

          {hasAlternative && (
            <TouchableOpacityView onPress={() => optionsSheetRef.current?.open()} style={styles.linkRow}>
              <AppText type={FOURTEEN} style={{ color: accentColor }}>Switch to Another Verification Method{' '}</AppText>
              <FastImage source={SHARE_NEW_ICON} style={{ width: 15, height: 15 }} tintColor={accentColor} resizeMode="contain" />
            </TouchableOpacityView>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <SpinnerSecond />
      <RBSheet ref={optionsSheetRef} height={optionsSheetHeight} closeOnDragDown={false} closeOnPressMask={false} customStyles={sheetCustomStyles}>
        <View style={[styles.sheetWrap, { backgroundColor: themeColors.card }]}>
          <View style={styles.sheetHeader}>
            <View>
              <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: textClr }}>Select a Verification Option</AppText>
              <AppText type={THIRTEEN} style={{ marginTop: 4, color: mutedClr }}>Choose how you want to verify your identity</AppText>
            </View>
            <TouchableOpacity onPress={() => optionsSheetRef.current?.close()} style={[styles.sheetCloseBtn, { borderColor: themeColors.border }]}>
              <FastImage source={closeIcon} resizeMode="contain" tintColor={textClr} style={{ width: 14, height: 14 }} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetScroll}>
            {alternativeMethods.map((m) => (
              <TouchableOpacityView
                key={m.type}
                onPress={() => {
                  setSelectedAuthMethod(m.type);
                  setemailOtp("");
                  optionsSheetRef.current?.close();
                }}
                style={[styles.sheetOptionRow, { borderBottomColor: themeColors.border }]}
              >
                <View style={styles.sheetOptionLeft}>
                  <FastImage
                    source={getMethodIcon(m.type)}
                    style={{ width: 20, height: 20 }}
                    resizeMode="contain"
                    tintColor={textClr}
                  />
                  <View style={{ marginLeft: 10 }}>
                    <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: textClr }}>
                      {m.label || (m.type === 1 ? "Email OTP" : m.type === 2 ? "Authenticator" : m.type === 3 ? "Mobile OTP" : "OTP")}
                    </AppText>
                    <AppText type={THIRTEEN} style={{ marginTop: 2, color: mutedClr }}>
                      {m.description || getMethodDescription(m.type)}
                    </AppText>
                  </View>
                </View>
              </TouchableOpacityView>
            ))}
          </ScrollView>
        </View>
      </RBSheet>
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  navRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  navBtn: { padding: 5 },
  navIcon: { width: 24, height: 24 },
  title: { marginBottom: 8 },
  description: { marginBottom: 24 },
  resendRow: { marginTop: 12, marginBottom: 4 },
  submitBtn: { marginTop: 16, marginBottom: 24 },
  linkRow: { marginBottom: 12, alignSelf: "flex-start", flexDirection: "row", alignItems: "center" },
  successScroll: { flex: 1, paddingHorizontal: 24, paddingTop: 60, alignItems: "center" },
  successIcon: { width: 80, height: 80, alignSelf: "center" },
  successTitle: { marginTop: 24, textAlign: "center" },
  successSubtitle: { textAlign: "center", marginTop: 12, lineHeight: 22 },
  doneBtn: { borderRadius: 28, paddingVertical: 16, paddingHorizontal: 48, marginTop: 32 },
  sheetWrap: { flex: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, marginVertical: 10 },
  sheetCloseBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  sheetScroll: { flex: 1 },
  sheetOptionRow: { paddingVertical: 14, borderBottomWidth: 1 },
  sheetOptionLeft: { flexDirection: "row" },
});

export default KycVerificationScreen;
