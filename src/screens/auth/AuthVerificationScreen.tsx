import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  useWindowDimensions,
  Linking,
  Alert,
} from "react-native";
import RBSheet from "react-native-raw-bottom-sheet";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { clearPending2FA, updatePending2FA } from "../../slices/authSlice";
import { sendLoginOtp, verifyUser, verifyPasskeyLogin, startLoginMethodRecovery, verifyLoginMethodRecovery } from "../../actions/authActions";
import NavigationService from "../../navigation/NavigationService";
import { LOGIN_SCREEN } from "../../navigation/routes";
import { AppText, AppSafeAreaView, Button, BOLD, FOURTEEN as FOURTEEN_CONST, SEMI_BOLD, THIRTEEN, EIGHTEEN, SIXTEEN, MEDIUM, TWENTY_SIX, TWELVE, FOURTEEN } from "../../shared";
import { colors } from "../../theme/colors";
import FastImage from "react-native-fast-image";
import { closeIcon, EMAIL, PHONE, KEY_ICON, pasteImg, SHARE_NEW_ICON, passkey_login, right_ic, checkIc } from "../../helper/ImageAssets";
import TouchableOpacityView from "../../shared/components/TouchableOpacityView";
import { OtpInput6Digit } from "../../shared";
import { showError, showSuccess } from "../../helper/logger";
import { SpinnerSecond } from "../../shared/components/SpinnerSecond";
import { useTheme } from "../../hooks/useTheme";
import Clipboard from "@react-native-community/clipboard";
import { AuthHeader } from "../../shared/components";
import LoginMethodRecoveryOverlays from "./LoginMethodRecoveryOverlays";
import {
  isRecoveryVerifyComplete,
  methodTypeToRecoveryKey,
  normalizeRecoverableMethodKeys,
  normalizeRecoveryMethodKey,
  recoveryKeyToMethodType,
  recoveryLostMethodTitle,
  recoveryRestrictionHours,
  recoveryVerifyErrorMessage,
} from "../../helper/loginRecoveryHelpers";

const getMethodIcon = (type: number) => {
  switch (type) {
    case 1: return EMAIL;
    case 2: return KEY_ICON;
    case 3: return PHONE;
    case 4: return passkey_login;
    default: return "";
  }
};

export interface AuthVerificationContentProps {
  onClose: () => void;
}

export const AuthVerificationContent = ({ onClose }: AuthVerificationContentProps) => {
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const pending2FA = useAppSelector((state) => state.auth.pending2FA);
  const isLoading = useAppSelector((state) => state.auth.isLoading);
  const loadingFor = useAppSelector((state) => state.auth.loadingFor);
  const showButtonLoading = isLoading && loadingFor === 'otp';
  const passkeyCancelled = useAppSelector((state) => state.auth.passkeyCancelled);

  const getFirstMethod = () => {
    if (!pending2FA) return 1;
    const baseMethods = pending2FA.availableMethods ?? [];
    const completed = pending2FA.completedMethods ?? [];
    const uncompletedMethods = baseMethods.filter((m: any) => !completed.includes(Number(m.type)));
    const methodsToSearch = uncompletedMethods.length > 0 ? uncompletedMethods : baseMethods;
    const has = (t: number) => methodsToSearch.some((m: any) => m.type === t);

    // Always honour the method the user explicitly chose (e.g. Email vs Authenticator).
    const active = Number(pending2FA.activeMethod);
    if (active && has(active)) return active;

    const has4 = has(4);
    if (has4 && !passkeyCancelled) return 4;
    if (has(2)) return 2;

    const signIdStr = String(pending2FA?.loginSignId || '').trim();
    if (signIdStr) {
      if (signIdStr.includes('@')) {
        if (has(1)) return 1;
      } else if (/^[\+\d\s\-\(\)]+$/.test(signIdStr)) {
        if (has(3)) return 3;
      }
    }

    if (pending2FA?.defaultMethod && has(pending2FA.defaultMethod)) {
      return pending2FA.defaultMethod;
    }
    if (has(1)) return 1;
    if (has(3)) return 3;

    return methodsToSearch[0]?.type ?? 1;
  };

  const initialMethod = getFirstMethod();
  const [selectedAuthMethod, setSelectedAuthMethod] = useState(initialMethod);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [resendTimer, setResendTimer] = useState((initialMethod === 1 || initialMethod === 3) ? 60 : 0);
  const optionsSheetRef = useRef<any>(null);
  const otpInputRef = useRef<any>(null);

  const recoverableMethods = normalizeRecoverableMethodKeys(pending2FA?.recoverableMethods);
  const [recoveryUiStep, setRecoveryUiStep] = useState<null | "select" | "warn" | "requirements" | "verify">(null);
  const [recoverySelectLost, setRecoverySelectLost] = useState("");
  const [recoveryLostMethod, setRecoveryLostMethod] = useState("");
  const [recoveryRemainingKeys, setRecoveryRemainingKeys] = useState<string[]>([]);
  const [recoveryVerifiedKeys, setRecoveryVerifiedKeys] = useState<string[]>([]);
  const [recoveryResetAck, setRecoveryResetAck] = useState(false);
  const [recoveryRestrictionHrs, setRecoveryRestrictionHrs] = useState(24);
  const [recoveryStartBusy, setRecoveryStartBusy] = useState(false);
  const [recoveryVerifyBusy, setRecoveryVerifyBusy] = useState(false);
  const [recoveryOtp, setRecoveryOtp] = useState("");
  const [recoveryOtpError, setRecoveryOtpError] = useState(false);
  const [recoveryVerifyKey, setRecoveryVerifyKey] = useState("");
  const recoveryVerifyInFlight = useRef(false);
  const recoveryLeftRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => {
      otpInputRef.current?.focus();
    }, 500);
    return () => clearTimeout(t);
  }, []);

  const isVerifyingRef = useRef(false);
  const prevSelectedMethod = useRef<number>(initialMethod);
  const autoSubmitEnabled = useRef<boolean>(true);
  const { height: winHeight } = useWindowDimensions();

  const sheetCustomStyles = {
    container: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      backgroundColor: themeColors.card,
    },
    wrapper: { backgroundColor: "rgba(0,0,0,0.5)" },
    draggableIcon: { backgroundColor: "transparent" as const },
  };



  useEffect(() => {
    if (!pending2FA) return;

    if (pending2FA.verifySubStep === 'methods') {
      Keyboard.dismiss();
      setOtpCode("");
      setOtpError(false);
      return; // Wait for user to select a method
    }

    const firstMethod = getFirstMethod();

    setSelectedAuthMethod(firstMethod);
    setOtpCode("");
    setOtpError(false);
    // Keep in sync so Hook 2 does not re-send OTP after a methods-list tap.
    prevSelectedMethod.current = firstMethod;
    autoSubmitEnabled.current = true;
    if (firstMethod === 1 || firstMethod === 3) {
      setResendTimer(60);
    } else {
      setResendTimer(0);
    }
  }, [pending2FA?.verifySubStep, pending2FA?.loginSignId, pending2FA?.availableMethods, pending2FA?.activeMethod, pending2FA?.completedMethods]);

  // Auto-send OTP when user switches between Email/Phone methods on code step.
  useEffect(() => {
    if (!pending2FA) return;
    if (pending2FA.verifySubStep === 'methods') return;
    if (prevSelectedMethod.current === selectedAuthMethod) {
      return;
    }

    // Reset input when switching methods
    setOtpCode("");
    setOtpError(false);

    // Re-enable auto-submit on a fresh method switch
    autoSubmitEnabled.current = true;

    if (selectedAuthMethod === 1 || selectedAuthMethod === 3) {
      prevSelectedMethod.current = selectedAuthMethod;
      handleGetOtp();
      return;
    }

    prevSelectedMethod.current = selectedAuthMethod;
    if (selectedAuthMethod === 1 || selectedAuthMethod === 2 || selectedAuthMethod === 3) {
      setTimeout(() => otpInputRef.current?.focus(), 300);
    }
  }, [pending2FA, selectedAuthMethod]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer((r) => r - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  useEffect(() => {
    if (selectedAuthMethod === 4 && pending2FA?.loginSignId) {
      const triggerPasskey = async () => {
        await dispatch(verifyPasskeyLogin(pending2FA.loginSignId, false));
      };
      triggerPasskey();
    }
  }, [selectedAuthMethod, pending2FA]);

  const getVerifySignId = (methodType?: number): string => {
    if (!pending2FA) return "";
    const { loginSignId: signId, availableMethods: methods } = pending2FA;
    const targetMethod = methodType !== undefined ? methodType : selectedAuthMethod;
    if (targetMethod === 3) {
      const m = methods?.find((x: any) => x.type === 3);
      return m?.value ?? signId;
    }
    if (targetMethod === 1) {
      const m = methods?.find((x: any) => x.type === 1);
      return m?.value ?? signId;
    }
    return signId;
  };

  const handleGetOtp = (methodType?: number) => {
    const targetMethod = methodType !== undefined ? methodType : selectedAuthMethod;
    const isPhone = pending2FA?.loginSignId && !String(pending2FA.loginSignId).includes('@') && /^[\+\d\s\-\(\)]+$/.test(String(pending2FA.loginSignId));
    const sendTo = (targetMethod === 3 || isPhone) ? "mobile" : "email";

    setResendTimer(60);
    autoSubmitEnabled.current = true;
    dispatch(sendLoginOtp(getVerifySignId(targetMethod), sendTo, setResendTimer));
  };

  const resetRecoveryUi = () => {
    setRecoveryUiStep(null);
    setRecoveryResetAck(false);
    setRecoveryLostMethod("");
    setRecoveryRemainingKeys([]);
    setRecoveryVerifiedKeys([]);
    setRecoveryOtp("");
    setRecoveryOtpError(false);
    setRecoveryVerifyKey("");
  };

  const goToLoginAfterRecovery = () => {
    if (recoveryLeftRef.current) return;
    recoveryLeftRef.current = true;
    resetRecoveryUi();
    dispatch(clearPending2FA());
    NavigationService.navigate(LOGIN_SCREEN);
  };

  const applyRecoveryProgress = async (data: any, opts: { fromStart?: boolean; forceStep?: any } = {}) => {
    const remaining = normalizeRecoverableMethodKeys(data?.remaining_methods);
    const verified = normalizeRecoverableMethodKeys(data?.verified_methods);
    const lost = normalizeRecoveryMethodKey(data?.lost_method) || recoveryLostMethod;
    const next = normalizeRecoveryMethodKey(data?.next_method) || remaining[0];
    const nextType = recoveryKeyToMethodType(next);
    const fromStart = opts.fromStart === true;

    setRecoveryLostMethod(lost);
    setRecoveryRemainingKeys(remaining);
    setRecoveryVerifiedKeys(verified);
    setRecoveryOtp("");
    setRecoveryOtpError(false);
    if (nextType) {
      setSelectedAuthMethod(nextType);
      setRecoveryVerifyKey(next);
    }
    const nextStep =
      opts.forceStep ||
      (!fromStart && remaining.length > 0 ? "requirements" : nextType ? "verify" : "requirements");
    setRecoveryUiStep(nextStep);
    if (nextStep === "verify" && (next === "email" || next === "phone") && nextType) {
      handleGetOtp(nextType);
    }
  };

  const handleStartMethodRecovery = async (lostMethod: string) => {
    const lost = normalizeRecoveryMethodKey(lostMethod);
    if (!lost || recoveryStartBusy) return;
    setRecoveryStartBusy(true);
    try {
      const result: any = await dispatch(startLoginMethodRecovery(lost) as any);
      if (result?.expired || !result?.success) return;
      setRecoveryRestrictionHrs(recoveryRestrictionHours(result?.data));
      await applyRecoveryProgress(result.data || {}, { fromStart: true });
    } finally {
      setRecoveryStartBusy(false);
    }
  };

  const handleRecoveryVerify = async (otpCode: string) => {
    if (recoveryVerifyInFlight.current || recoveryLeftRef.current) return;
    const method = recoveryVerifyKey || methodTypeToRecoveryKey(selectedAuthMethod) || recoveryRemainingKeys[0] || "";
    if (!method) {
      showError("Select a remaining method to verify.");
      return;
    }
    recoveryVerifyInFlight.current = true;
    setRecoveryVerifyBusy(true);
    try {
      const result: any = await dispatch(verifyLoginMethodRecovery(method, otpCode) as any);
      if (result?.expired) return;
      if (!result?.success) {
        setRecoveryOtp("");
        setRecoveryOtpError(true);
        showError(recoveryVerifyErrorMessage(result));
        return;
      }
      const remaining = normalizeRecoverableMethodKeys(result?.data?.remaining_methods);
      if (!isRecoveryVerifyComplete(result) || remaining.length > 0) {
        if (remaining.length > 0) {
          await applyRecoveryProgress(result.data || {}, { forceStep: remaining.length > 1 ? "requirements" : "verify" });
          return;
        }
      }
      const lostTitle = recoveryLostMethodTitle(recoveryLostMethod || recoverySelectLost);
      showSuccess(result?.message || `${lostTitle} has been removed. Please sign in again.`);
      goToLoginAfterRecovery();
    } finally {
      recoveryVerifyInFlight.current = false;
      setRecoveryVerifyBusy(false);
    }
  };

  const openRecoveryChooser = () => {
    const first = recoverableMethods[0] || "";
    const nextLost = recoverySelectLost || (recoverableMethods.length === 1 ? first : "");
    setRecoverySelectLost(nextLost);
    setRecoveryResetAck(false);
    setRecoveryOtp("");
    setRecoveryUiStep("select");
  };

  const closeRecoveryChooser = () => {
    resetRecoveryUi();
  };

  const openRecoveryMethodVerify = async (methodKey: string) => {
    const key = normalizeRecoveryMethodKey(methodKey);
    const type = recoveryKeyToMethodType(key);
    if (!key || !type) return;
    setSelectedAuthMethod(type);
    setRecoveryVerifyKey(key);
    setRecoveryOtp("");
    setRecoveryOtpError(false);
    setRecoveryUiStep("verify");
    if (key === "email" || key === "phone") {
      handleGetOtp(type);
    }
  };

  const showUnableToVerify = recoverableMethods.length > 0 && !recoveryUiStep;

  const handlePasteOtp = async () => {
    try {
      const text = await Clipboard.getString();
      const digits = String(text || "").replace(/\D/g, "").slice(0, 6);
      if (digits.length) {
        setOtpError(false);
        setOtpCode(digits);
      }
    } catch {
      // ignore
    }
  };

  const handlePasteOtpForRecovery = async () => {
    try {
      const text = await Clipboard.getString();
      const digits = String(text || "").replace(/\D/g, "").slice(0, 6);
      if (digits.length) {
        setRecoveryOtpError(false);
        setRecoveryOtp(digits);
      }
    } catch {
      // ignore
    }
  };

  const handleSubmit = async () => {
    if (isVerifyingRef.current) return false;
    if (otpCode.length < 6) {
      setOtpError(true);
      showError("Please enter a valid 6-digit code");
      return false;
    }
    setOtpError(false);
    Keyboard.dismiss();
    isVerifyingRef.current = true;
    try {
      const res: any = await dispatch(
        verifyUser({ email_or_phone: getVerifySignId(), otp: otpCode, type: selectedAuthMethod }) as any
      );
      if (res && res.success === false) {
        setOtpError(true);
        // After a wrong OTP once, require user to press Next for subsequent attempts
        autoSubmitEnabled.current = false;
        return false;
      }
      if (res && res.success === true) {
        setOtpError(false);
        setOtpCode("");
        autoSubmitEnabled.current = true;
      }
      return true;
    } finally {
      isVerifyingRef.current = false;
    }
  };

  // Auto-submit on 6th digit for first attempt only.
  useEffect(() => {
    if (!pending2FA) return;
    if (!autoSubmitEnabled.current) return;
    if (showButtonLoading || isVerifyingRef.current) return;
    if (otpCode.length !== 6) return;

    (async () => {
      await handleSubmit();
    })();
  }, [otpCode, selectedAuthMethod, pending2FA, showButtonLoading]);

  const getMaskedEmail = (): string => {
    const signId = getVerifySignId() || "";
    if (!signId) return "";
    if (signId.includes("@")) {
      const [local, domain] = signId.split("@");
      if (!local?.length) return signId;
      return `${local[0]}****@${domain || ""}`;
    }
    if (signId.length >= 4) return `${signId.slice(0, 2)}****${signId.slice(-2)}`;
    return "****";
  };

  // All methods for the options sheet (including the currently selected one)
  const methodsForOptions = pending2FA?.availableMethods ?? [];

  // Show all methods, but we still need a flag if there are others besides the selected
  const hasAlternative = methodsForOptions.length > 1;

  const optionsSheetHeight = Math.min(
    Math.max(180, 124 + 56 * methodsForOptions.length),
    winHeight * 0.6
  );

  const isMethodsStep = pending2FA?.verifySubStep === "methods";
  const completedMethods = pending2FA?.completedMethods || [];

  if (!pending2FA) return null;

  return (
    <AppSafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AuthHeader
            onSupportPress={() => Linking.openURL("https://arabglobal.ae/TermsofUse").catch(() => { })}
            onClosePress={onClose}
            title={""}
          />

          <>
            <AppText weight={SEMI_BOLD} type={TWENTY_SIX} style={[styles.title, { color: themeColors.text }]}>
              {isMethodsStep
                ? "Verify your identity"
                : selectedAuthMethod === 4 ? "Passkey Authentication"
                  : selectedAuthMethod === 2 ? "Verify with authenticator"
                    : selectedAuthMethod === 3 ? "Verify Your Phone"
                      : "Verify Your Email"}
            </AppText>
            <AppText type={TWELVE} style={[styles.description, { color: themeColors.secondaryText }]}>
              {isMethodsStep
                ? (pending2FA.verificationMode === "ALL_REQUIRED" ? "New device: verify every method below to finish sign-in." : "Choose any one method to verify your identity.")
                : selectedAuthMethod === 4
                  ? "Click the button below to authenticate with your passkey."
                  : selectedAuthMethod === 2
                    ? "Enter the 6-digit code from your authenticator app."
                    : `The verification code has been sent to your ${selectedAuthMethod === 3 ? "phone" : "email"} ${getMaskedEmail()}, valid for 10 minutes.`}
            </AppText>
          </>

          {isMethodsStep ? (
            <View style={{ marginTop: 24, gap: 14 }}>
              {methodsForOptions.map((method: any) => {
                const isDone = completedMethods.includes(Number(method.type));
                return (
                  <TouchableOpacityView
                    key={method.type}
                    activeOpacity={isDone ? 1 : 0.7}
                    onPress={() => {
                      if (isDone) return;
                      const next = Number(method.type);
                      prevSelectedMethod.current = next;
                      setSelectedAuthMethod(next);
                      setOtpCode("");
                      setOtpError(false);
                      autoSubmitEnabled.current = true;
                      dispatch(updatePending2FA({ verifySubStep: 'code', activeMethod: next }));
                      if (next === 1 || next === 3) {
                        handleGetOtp(next);
                      } else {
                        setResendTimer(0);
                      }
                    }}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: isDone ? "#00C087" : (isDark ? "#262A35" : "#E5E7EB"),
                      backgroundColor: isDone ? (isDark ? "rgba(0, 192, 135, 0.04)" : "#F0FDF4") : "transparent",
                      borderRadius: 14,
                      paddingHorizontal: 16,
                      paddingVertical: 16,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 12 }}>
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        {method.type === 2 ? (
                          <FastImage source={KEY_ICON} style={{ width: 22, height: 22 }} tintColor={colors.cyanTheme} resizeMode="contain" />
                        ) : typeof getMethodIcon(method.type) === "string" && getMethodIcon(method.type) !== "" ? (
                          <FastImage source={getMethodIcon(method.type) as any} style={{ width: 22, height: 22 }} resizeMode="contain" />
                        ) : (
                          <FastImage source={getMethodIcon(method.type)} resizeMode="contain" style={{ width: 22, height: 22 }} tintColor={colors.cyanTheme} />
                        )}
                      </View>
                      <View style={{ marginLeft: 14, flex: 1 }}>
                        <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: themeColors.text }}>
                          {method.label || (method.type === 1 ? "Email OTP" : method.type === 2 ? "Google Authenticator" : method.type === 3 ? "Mobile OTP" : "Passkey")}
                        </AppText>
                        <AppText type={THIRTEEN} style={{ marginTop: 4, color: themeColors.secondaryText }} numberOfLines={1}>
                          {method.maskedValue || method.description || (method.type === 1 ? (getMaskedEmail() || "Receive verification codes via email") : method.type === 2 ? "Use your authenticator app" : method.type === 3 ? "Receive verification codes via SMS" : "Use Face ID, Touch ID, or Windows Hello")}
                        </AppText>
                      </View>
                    </View>

                    {isDone ? (
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: isDark ? "rgba(0, 192, 135, 0.15)" : "#DCFCE7",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <FastImage source={checkIc} style={{ width: 16, height: 16 }} tintColor="#00C087" resizeMode="contain" />
                      </View>
                    ) : (
                      <View
                        style={{
                          borderWidth: 1,
                          borderColor: colors.cyanTheme,
                          borderRadius: 20,
                          paddingHorizontal: 16,
                          paddingVertical: 7,
                          minWidth: 70,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <AppText type={FOURTEEN_CONST} weight={MEDIUM} style={{ color: colors.cyanTheme }}>
                          Verify
                        </AppText>
                      </View>
                    )}
                  </TouchableOpacityView>
                );
              })}
              {showUnableToVerify ? (
                <TouchableOpacityView onPress={openRecoveryChooser} style={{ marginTop: 8, alignSelf: "center" }}>
                  <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: colors.cyanTheme, textDecorationLine: "underline" }}>
                    Unable to verify?
                  </AppText>
                </TouchableOpacityView>
              ) : null}
            </View>
          ) : selectedAuthMethod === 4 ? (
            <View style={styles.passkeyContainer}>
              <FastImage
                source={passkey_login}
                style={styles.passkeyIcon}
                resizeMode="contain"
                tintColor={themeColors.text}
              />
              <AppText type={FOURTEEN} style={[styles.passkeyHint, { color: themeColors.secondaryText }]}>
                Use your registered biometrics (Face ID, Touch ID, or fingerprint) to authenticate.
              </AppText>
              <Button
                children="Authenticate with Passkey"
                disabled={isLoading}
                onPress={() => dispatch(verifyPasskeyLogin(pending2FA.loginSignId, false))}
                loading={isLoading}
                containerStyle={styles.submitBtn}
              />
            </View>
          ) : (
            <>
              {methodsForOptions.length > 1 && !isMethodsStep ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ flexDirection: "row", gap: 8, marginTop: 4, marginBottom: 20 }}
                >
                  {methodsForOptions.map((m: any) => {
                    const t = Number(m.type);
                    const isDone = completedMethods.includes(t);
                    const isActive = t === selectedAuthMethod;
                    const label = m.label || (t === 1 ? "Email" : t === 2 ? "Authenticator" : t === 3 ? "Phone" : "Passkey");
                    return (
                      <TouchableOpacityView
                        key={t}
                        disabled={isDone && pending2FA?.verificationMode === "ALL_REQUIRED"}
                        onPress={() => {
                          if (isDone && pending2FA?.verificationMode === "ALL_REQUIRED") return;
                          if (t !== selectedAuthMethod) {
                            setSelectedAuthMethod(t);
                            setOtpCode("");
                            setOtpError(false);
                            prevSelectedMethod.current = t;
                            dispatch(updatePending2FA({ activeMethod: t }));
                            if (t === 1 || t === 3) {
                              handleGetOtp(t);
                            } else {
                              setResendTimer(0);
                            }
                          }
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: isActive ? colors.cyanTheme : isDone ? colors.buyBtnGreen : (isDark ? "rgba(255,255,255,0.15)" : "#E5E7EB"),
                          backgroundColor: isActive ? (isDark ? "rgba(243, 147, 44, 0.15)" : "#FFF7ED") : "transparent",
                        }}
                      >
                        <AppText
                          type={THIRTEEN}
                          weight={isActive ? SEMI_BOLD : MEDIUM}
                          style={{
                            color: isDone ? colors.buyBtnGreen : isActive ? colors.cyanTheme : themeColors.secondaryText,
                          }}
                        >
                          {label} {isDone ? "✓" : isActive ? "(now)" : ""}
                        </AppText>
                      </TouchableOpacityView>
                    );
                  })}
                </ScrollView>
              ) : null}

              <OtpInput6Digit
                ref={otpInputRef}
                value={otpCode}
                onChangeText={(v: string) => {
                  if (otpError) setOtpError(false);
                  setOtpCode(v);
                }}
                isDark={isDark}
                hasError={otpError}
              />
              {selectedAuthMethod === 1 || selectedAuthMethod === 2 || selectedAuthMethod === 3 ? (
                <View
                  style={[
                    styles.otpLinksRow,
                    selectedAuthMethod === 2 && { justifyContent: "flex-end" },
                  ]}
                >
                  {(selectedAuthMethod === 1 || selectedAuthMethod === 3) && (
                    <TouchableOpacityView
                      onPress={resendTimer > 0 ? undefined : () => handleGetOtp()}
                      disabled={resendTimer > 0}
                    >
                      <AppText
                        type={FOURTEEN}
                        weight={MEDIUM}
                        style={[
                          { color: resendTimer > 0 ? themeColors.secondaryText : themeColors.text },
                        ]}
                      >
                        {resendTimer > 0 ? `Resend (${resendTimer}s)` : "Resend"}
                      </AppText>
                    </TouchableOpacityView>
                  )}

                  <TouchableOpacityView onPress={handlePasteOtp} style={styles.pasteBtn}>
                    <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: themeColors.text }}>
                      Paste
                    </AppText>
                    <FastImage
                      source={pasteImg}
                      resizeMode="contain"
                      style={{ width: 16, height: 16 }}
                      tintColor={isDark ? colors.white : themeColors.text}
                    />
                  </TouchableOpacityView>
                </View>
              ) : null}
              <Button
                children="Next"
                disabled={false}
                onPress={handleSubmit}
                loading={showButtonLoading}
                containerStyle={styles.submitBtn}
              />
              {showUnableToVerify ? (
                <TouchableOpacityView onPress={openRecoveryChooser} style={{ marginTop: 16, alignSelf: "center" }}>
                  <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: colors.cyanTheme, textDecorationLine: "underline" }}>
                    Unable to verify?
                  </AppText>
                </TouchableOpacityView>
              ) : null}
            </>
          )}

          {!isMethodsStep ? (
            <TouchableOpacityView
              onPress={() => {
                dispatch(updatePending2FA({ verifySubStep: 'methods', activeMethod: undefined }));
              }}
              style={styles.switchRow}
            >
              <AppText type={FOURTEEN_CONST} weight={SEMI_BOLD} style={[styles.underlineText, { color: themeColors.text }]}>
                ← Back to methods
              </AppText>
            </TouchableOpacityView>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <RBSheet
        ref={optionsSheetRef}
        height={optionsSheetHeight}
        closeOnDragDown={false}
        closeOnPressMask={true}
        customStyles={sheetCustomStyles}
      >
        <View style={sheetStyles.wrap}>
          <View style={sheetStyles.header}>
            <View>
              <AppText weight={BOLD} type={SIXTEEN} style={{ color: themeColors.text }}>
                Select a Verification Option
              </AppText>
              <AppText type={THIRTEEN} style={{ marginTop: 4, color: themeColors.secondaryText }}>
                Choose how you want to verify your identity
              </AppText>
            </View>
            <TouchableOpacity onPress={() => optionsSheetRef.current?.close()} style={[sheetStyles.closeBtn, { borderColor: themeColors.border }]}>
              <FastImage source={closeIcon} resizeMode="contain" tintColor={themeColors.text} style={{ width: 10, height: 10 }} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={sheetStyles.scroll}>
            {methodsForOptions?.map((method: any) => {
              const isDone = completedMethods.includes(Number(method?.type));
              return (
                <TouchableOpacityView
                  key={method?.type}
                  onPress={() => {
                    if (isDone) return;
                    const next = Number(method.type);
                    // If the user selects the already active method, just close the sheet
                    if (next !== selectedAuthMethod) {
                      setSelectedAuthMethod(next);
                      setOtpCode("");
                      setResendTimer(0);
                      dispatch(updatePending2FA({ activeMethod: next }));
                    }
                    optionsSheetRef.current?.close();
                  }}
                  style={[sheetStyles.optionRow, { borderBottomColor: themeColors.border, opacity: isDone ? 0.6 : 1 }]}
                >
                  <View style={{ flexDirection: "row", justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={[sheetStyles.optionLeft, { flex: 1 }]}>
                      {method.type === 2 ? (
                        <FastImage source={KEY_ICON} style={{ width: 20, height: 20 }}
                          tintColor={themeColors.text}
                          resizeMode="contain" />
                      ) : typeof getMethodIcon(method.type) === "string" && getMethodIcon(method.type) !== "" ? (
                        <FastImage source={getMethodIcon(method.type) as any} style={{ width: 20, height: 20 }} resizeMode="contain" />
                      ) : (
                        <FastImage source={getMethodIcon(method.type)} resizeMode="contain" style={{ width: 20, height: 20 }} tintColor={themeColors.text} />
                      )}
                      <View style={{ marginLeft: 10 }}>
                        <AppText weight={SEMI_BOLD} type={FOURTEEN_CONST} style={{ color: themeColors.text }}>
                          {method.label || (method.type === 1 ? "Email OTP" : method.type === 2 ? "Authenticator" : method.type === 3 ? "Mobile OTP" : "Passkey")}
                        </AppText>
                        <AppText type={THIRTEEN} style={{ marginTop: 2, color: themeColors.secondaryText }}>
                          {method.description || (method.type === 1 ? "Receive verification codes via email" : method.type === 2 ? "Use Google Authenticator app" : method.type === 3 ? "Receive verification codes via SMS" : "Use Face ID, Touch ID, or Windows Hello")}
                        </AppText>
                      </View>
                    </View>
                    {isDone ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, right: 10 }}>
                        <AppText type={TWELVE} weight={MEDIUM} style={{ color: colors.buyBtnGreen }}>
                          Verified
                        </AppText>
                        <FastImage source={checkIc} style={{ width: 14, height: 14 }} tintColor={colors.buyBtnGreen} resizeMode="contain" />
                      </View>
                    ) : method.type === selectedAuthMethod ? (
                      <FastImage source={checkIc} style={{ width: 16, height: 16, right: 10 }} tintColor={themeColors.text} resizeMode="contain" />
                    ) : null}
                  </View>
                </TouchableOpacityView>
              );
            })}

          </ScrollView>
        </View>
      </RBSheet>

      <LoginMethodRecoveryOverlays
        step={recoveryUiStep}
        recoverableMethods={recoverableMethods}
        selectedLost={recoverySelectLost}
        availableMethods={pending2FA?.availableMethods || []}
        remainingKeys={recoveryRemainingKeys}
        verifiedKeys={recoveryVerifiedKeys}
        verifyKey={recoveryVerifyKey || methodTypeToRecoveryKey(selectedAuthMethod) || recoveryRemainingKeys[0] || ""}
        otpValue={recoveryOtp}
        otpError={recoveryOtpError}
        resendTimer={resendTimer}
        verifyBusy={recoveryVerifyBusy}
        startBusy={recoveryStartBusy}
        resetAck={recoveryResetAck}
        restrictionHours={recoveryRestrictionHrs}
        isDark={isDark}
        themeColors={themeColors}
        onSelectLost={setRecoverySelectLost}
        onResetAck={setRecoveryResetAck}
        onClose={closeRecoveryChooser}
        onSelectConfirm={() => {
          if (!recoverySelectLost) return;
          setRecoveryUiStep("warn");
        }}
        onWarnCancel={() => setRecoveryUiStep("select")}
        onWarnConfirm={() => { void handleStartMethodRecovery(recoverySelectLost); }}
        onPickRemaining={(key: string) => { void openRecoveryMethodVerify(key); }}
        onRequirementsBack={() => setRecoveryUiStep("warn")}
        onBackToMethods={() => {
          setRecoveryResetAck(false);
          setRecoveryUiStep("select");
        }}
        onVerifySubmit={(code: string) => { void handleRecoveryVerify(code); }}
        onGetCode={() => {
          const key = recoveryVerifyKey || methodTypeToRecoveryKey(selectedAuthMethod) || recoveryRemainingKeys[0];
          const type = recoveryKeyToMethodType(key);
          if (key === "email" || key === "phone") handleGetOtp(type);
        }}
        onPaste={handlePasteOtpForRecovery}
        onOtpChange={(v: string) => {
          setRecoveryOtpError(false);
          setRecoveryOtp(v);
        }}
      />

      <SpinnerSecond />
    </AppSafeAreaView>
  );
};

const AuthVerificationScreen = () => {
  const { colors: themeColors } = useTheme();
  const dispatch = useAppDispatch();
  const pending2FA = useAppSelector((state) => state.auth.pending2FA);

  useEffect(() => {
    if (!pending2FA) {
      NavigationService.navigate(LOGIN_SCREEN);
    }
  }, []);

  if (!pending2FA) return null;

  const handleClose = () => {
    dispatch(clearPending2FA());
    NavigationService.navigate(LOGIN_SCREEN);
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <AuthVerificationContent onClose={handleClose} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  title: {
    marginBottom: 8,
    marginTop: 10,
  },
  description: {
    marginBottom: 24,
  },
  submitBtn: {
    marginTop: 26,
    marginBottom: 0,
    width: "100%",
  },
  otpLinksRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  underlineText: {
    textDecorationLine: "underline",
  },
  pasteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  didntReceiveWrap: {
    alignSelf: "center",
    marginTop: 22,
  },
  switchRow: {
    marginTop: 26,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
  },
  passkeyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    width: "100%",
  },
  passkeyIcon: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  passkeyHint: {
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
});

const sheetStyles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    marginVertical: 10
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  scroll: { flex: 1 },
  optionRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  optionLeft: {
    flexDirection: "row",
  },
});

export default AuthVerificationScreen;
