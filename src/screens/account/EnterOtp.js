import React, { useState, useEffect } from "react";
import {
  AppSafeAreaView,
  AppText,
  Button,
  SEMI_BOLD,
  SIXTEEN,
  FOURTEEN,
  BOLD,
  THIRTEEN,
  EIGHTEEN,
} from "../../shared";
import { useRoute } from "@react-navigation/native";
import KeyBoardAware from "../../shared/components/KeyboardAware";
import { Keyboard, StyleSheet, View, TouchableOpacity, Platform } from "react-native";
import { colors } from "../../theme/colors";
import { errorText } from "../../helper/Constants";
import { showError } from "../../helper/logger";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { enableTwoFa } from "../../actions/accountActions";
import { verifyUser, sendLoginOtp } from "../../actions/authActions";
import NavigationService from "../../navigation/NavigationService";
import { back_ic } from "../../helper/ImageAssets";
import FastImage from "react-native-fast-image";
import OTPInputView from "@twotalltotems/react-native-otp-input";
import TouchableOpacityView from "../../shared/components/TouchableOpacityView";
import { SpinnerSecond } from "../../shared/components/SpinnerSecond";
import { useTheme } from "../../hooks/useTheme";

const EnterOtp = () => {
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const userData = useAppSelector((state) => state.auth.userData);
  const { emailId, mobileNumber, country_code } = userData ?? {};
  const route = useRoute();
  const params = route?.params ?? {};
  const isLogin = params?.isLogin ?? false;
  const authType = params?.authType ?? 1;
  const loginSignId = params?.loginSignId ?? "";
  const availableMethods = params?.availableMethods ?? [];
  const defaultMethod = params?.defaultMethod ?? 1;

  const [code, setCode] = useState("");
  const [selectedAuthMethod, setSelectedAuthMethod] = useState(defaultMethod || authType);
  const [resendTimer, setResendTimer] = useState(0);
  const isLoading = useAppSelector((state) => state.auth.isLoading);
  const showButtonLoading = useAppSelector((state) => state.auth.isLoading && state.auth.loadingFor !== 'otp');

  const email_or_phone = params?.data?.email_or_phone ?? emailId ?? mobileNumber ?? loginSignId ?? "";

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer((r) => r - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const getVerifySignId = () => {
    if (!isLogin) return (emailId || `${country_code || ""} ${mobileNumber || ""}`.trim()) || email_or_phone;
    if (selectedAuthMethod === 3) {
      const m = availableMethods.find((x) => x.type === 3);
      return m?.value ?? loginSignId;
    }
    if (selectedAuthMethod === 1) {
      const m = availableMethods.find((x) => x.type === 1);
      return m?.value ?? loginSignId;
    }
    return loginSignId;
  };

  const handleGetOtp = () => {
    const sendTo = selectedAuthMethod === 3 ? "mobile" : "email";
    setResendTimer(60);
    dispatch(sendLoginOtp(getVerifySignId(), sendTo, setResendTimer));
  };

  const onSubmit = () => {
    if (!code) {
      showError(errorText.otp);
      return;
    }
    if (code.length < 6) {
      showError("Please enter a valid 6-digit code");
      return;
    }
    Keyboard.dismiss();
    if (isLogin) {
      dispatch(verifyUser({ email_or_phone: getVerifySignId(), otp: code, type: selectedAuthMethod }));
    } else {
      const data = {
        email_or_phone:
          authType === 1
            ? emailId
            : authType === 3
            ? `${country_code || ""} ${mobileNumber || ""}`.trim()
            : authType === 0 && userData?.["2fa"] === 1
            ? emailId
            : `${country_code || ""} ${mobileNumber || ""}`.trim(),
        type: authType,
        verification_code: code,
      };
      dispatch(enableTwoFa(data));
    }
    setCode("");
  };

  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background }}>
      <KeyBoardAware containerStyle={{justifyContent: "space-between"}}>
        <View style={styles.scrollContent}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => NavigationService.goBack()} style={styles.backBtn}>
                    <FastImage
                    source={back_ic}
                    resizeMode="contain"
                    style={styles.backIcon}
                    tintColor={themeColors.text}
                    />
                </TouchableOpacity>
                <AppText weight={BOLD} type={EIGHTEEN} style={{ color: themeColors.text, marginLeft: 12 }}>
                    Verification
                </AppText>
            </View>

            <View style={styles.infoBox}>
                 <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, textAlign: 'center' }}>
                    {selectedAuthMethod === 2
                        ? "Enter the code from your Google Authenticator app"
                        : `Enter the code sent to your ${selectedAuthMethod === 1 ? "email" : "mobile number"}`}
                </AppText>
            </View>

            <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.text, marginBottom: 12 }}>
                    Verification Code
                </AppText>
                <OTPInputView
                    style={styles.otpInputView}
                    pinCount={6}
                    codeInputFieldStyle={[
                        styles.otpField,
                        { borderColor: themeColors.border, color: themeColors.text }
                    ]}
                    codeInputHighlightStyle={{ borderColor: themeColors.button }}
                    onCodeChanged={setCode}
                    onCodeFilled={(otp) => {
                        if (otp?.length === 6) {
                            setCode(otp);
                        }
                    }}
                />

                {isLogin && selectedAuthMethod !== 2 && (
                    <View style={styles.resendRow}>
                    {resendTimer > 0 ? (
                        <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText }}>
                        Resend ({resendTimer}s)
                        </AppText>
                    ) : (
                        <TouchableOpacityView onPress={handleGetOtp}>
                        <AppText weight={SEMI_BOLD} type={THIRTEEN} style={{ color: themeColors.button }}>
                            Get OTP
                        </AppText>
                        </TouchableOpacityView>
                    )}
                    </View>
                )}
            </View>

            {isLogin && availableMethods?.length > 1 && (
                <View style={styles.altFlow}>
                    <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, marginBottom: 16 }}>
                        Prefer another method?
                    </AppText>
                    {availableMethods
                        .filter((m) => m.type !== selectedAuthMethod && m.type !== 4)
                        .map((method) => (
                        <TouchableOpacityView
                            key={method.type}
                            onPress={() => {
                            setSelectedAuthMethod(method.type);
                            setCode("");
                            setResendTimer(0);
                            }}
                            style={[styles.altBtn, { borderColor: themeColors.border, backgroundColor: themeColors.card }]}
                        >
                            <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.text }}>
                                Use {method.label || (method.type === 1 ? "Email" : method.type === 2 ? "Authenticator" : "Mobile")}
                            </AppText>
                        </TouchableOpacityView>
                    ))}
                </View>
            )}
        </View>
        
        <View style={styles.bottomSection}>
            <Button
                children="Submit"
                disabled={code.length !== 6}
                onPress={onSubmit}
                loading={showButtonLoading}
                containerStyle={styles.submitBtn}
            />
        </View>
      </KeyBoardAware>

      <SpinnerSecond />
    </AppSafeAreaView>
  );
};

export default EnterOtp;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  backIcon: { width: 22, height: 22 },
  scrollContent: { paddingHorizontal: 20 },
  infoBox: { marginTop: 16, marginBottom: 30 },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 1.5 },
    }),
  },
  otpInputView: {
    width: "100%",
    height: 50,
  },
  otpField: {
    width: 44,
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    fontSize: 20,
    fontWeight: '600',
  },
  resendRow: {
    marginTop: 20,
    alignItems: "flex-end",
  },
  altFlow: { marginTop: 40 },
  altBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
  },
  bottomSection: { padding: 20, paddingBottom: 40 },
  submitBtn: { width: "100%" },
});
