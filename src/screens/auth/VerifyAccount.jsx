import React, { useEffect, useRef, useState } from "react";
import Clipboard from "@react-native-community/clipboard";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import FastImage from "react-native-fast-image";
import Svg, { Path, Rect } from "react-native-svg";

import {
  AppSafeAreaView,
  AppText,
  Button,
  FOURTEEN,
  FIFTEEN,
  MEDIUM,
  BOLD,
} from "../../shared";
import { showError } from "../../helper/logger";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { sendOtp, verifyOtp } from "../../actions/authActions";
import { registerVerifyToken } from "../../actions/accountActions";
import NavigationService from "../../navigation/NavigationService";
import {
  ACCOUNT_ACTIVATED_SCREEN,
  NAVIGATION_AUTH_STACK,
} from "../../navigation/routes";
import OtpInput6Digit from "../../shared/components/OtpInput6Digit";
import TouchableOpacityView from "../../shared/components/TouchableOpacityView";
import { useTheme } from "../../hooks/useTheme";
import {
  authBackIcon,
  authBellImg,
  verifyEmailImg,
  arrowRightIcon,
} from "../../helper/ImageAssets";
import { SpinnerSecond } from "../../shared/components/SpinnerSecond";
import { colors } from "../../theme/colors";
import { RefreshCw, Clipboard as ClipboardIcon } from "lucide-react-native";
import { fonts } from "../../theme/fonts";

const VerifyAccount = () => {
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const showButtonLoading = useAppSelector(
    (state) => state.auth.isLoading && state.auth.loadingFor === "otp"
  );

  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [disableBtn, setDisbaleBtn] = useState(false);
  const [timer, setTimer] = useState(0);
  const [attemptLeft, setAttemptLeft] = useState("10");
  const [userData, setUserData] = useState({ signId: "", registeredBy: "" });
  const [resendLoading, setResendLoading] = useState(false);
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const hasAutoSent = useRef(false);
  const isVerifyingRef = useRef(false);
  const otpInputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => {
      otpInputRef.current?.focus();
    }, 500);
    return () => clearTimeout(t);
  }, []);

  const isNoOtpAttemptsLeft = (msg = "") =>
    String(msg).toLowerCase().includes("no otp attempt left");

  useEffect(() => {
    dispatch(registerVerifyToken(setUserData));
  }, [dispatch]);

  useEffect(() => {
    if (!userData?.signId || hasAutoSent.current) return;
    hasAutoSent.current = true;
    onGetOtp(false);
  }, [userData?.signId]);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else if (timer === 0) {
      setDisbaleBtn(false);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Auto-submit when OTP reaches 6 digits
  useEffect(() => {
    const cleanOtp = String(otp || "").replace(/\D/g, "");
    if (cleanOtp.length === 6 && !otpSubmitting && !isVerifyingRef.current) {
      handleVerifyOtp();
    }
  }, [otp]);

  const handleVerifyOtp = async () => {
    if (isVerifyingRef.current) return;
    const raw = otp || "";
    const codeStr = String(raw ?? "")
      .replace(/\D/g, "")
      .slice(0, 6);
    const verificationCode = parseInt(codeStr, 10);

    if (codeStr.length !== 6) {
      setOtpError(true);
      showError("Please Enter The 6-Digit Verification Code.");
      return;
    }

    const data = {
      signId: userData?.signId,
      verification_code: verificationCode,
      registeredBy: userData?.registeredBy,
      token: "",
    };
    setOtpSubmitting(true);
    isVerifyingRef.current = true;
    try {
      await dispatch(
        verifyOtp(data, setOtp, setOtpError, () =>
          NavigationService.navigate(NAVIGATION_AUTH_STACK, {
            screen: ACCOUNT_ACTIVATED_SCREEN,
            params: { mode: "blocked" },
          })
        )
      );
    } finally {
      setOtpSubmitting(false);
      isVerifyingRef.current = false;
    }
  };

  const onGetOtp = async (showLoader = true) => {
    if (!userData?.signId) return;
    const data = {
      signId: userData.signId,
      registeredBy: userData?.registeredBy,
    };
    if (showLoader) setResendLoading(true);
    try {
      const result = await dispatch(
        sendOtp(data, setDisbaleBtn, setTimer, setAttemptLeft)
      );
      if (isNoOtpAttemptsLeft(result?.message)) {
        NavigationService.navigate(NAVIGATION_AUTH_STACK, {
          screen: ACCOUNT_ACTIVATED_SCREEN,
          params: { mode: "blocked" },
        });
      }
    } finally {
      if (showLoader) setResendLoading(false);
    }
  };

  const onPasteOtp = async () => {
    try {
      const text = await Clipboard.getString();
      const parsed = String(text || "")
        .replace(/\D/g, "")
        .slice(0, 6);
      if (!parsed) {
        showError("Clipboard does not contain a valid code.");
        return;
      }
      setOtp(parsed);
    } catch {
      showError("Unable to read clipboard.");
    }
  };

  const getMaskedSignId = () => {
    const signId = String(userData?.signId || "").trim();
    if (!signId) return "";
    if (userData?.registeredBy === "email" && signId.includes("@")) {
      const [local, domain] = signId.split("@");
      if (!local?.length) return signId;
      return `${local[0]}***@${domain || ""}`;
    }
    // Mobile format: +91 78***87
    let countryPrefix = "+91";
    let mobilePart = signId;
    const prefixMatch = signId.match(/^(\+\d{1,4})\s*(.*)$/);
    if (prefixMatch) {
      countryPrefix = prefixMatch[1];
      mobilePart = prefixMatch[2] || "";
    }
    const digits = mobilePart.replace(/\D/g, "");
    if (!digits) return `${countryPrefix} `;
    if (digits.length <= 4) return `${countryPrefix} ${digits}`;
    return `${countryPrefix} ${digits.slice(0, 2)}***${digits.slice(-2)}`;
  };

  const openSupport = () => {
    Linking.openURL("https://arabglobal.ae/help_center").catch(() => { });
  };

  const verifyType =
    userData?.registeredBy === "email" ? "Email" : "Phone";

  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background, flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <TouchableOpacityView
              onPress={() => NavigationService.goBack()}
              activeOpacity={0.7}
            >
              <FastImage
                source={authBackIcon}
                style={styles.headerIcon}
                resizeMode={FastImage.resizeMode.contain}
              />
            </TouchableOpacityView>

            <TouchableOpacityView onPress={openSupport} activeOpacity={0.7}>
              <FastImage
                source={authBellImg}
                style={styles.headerIcon}
                resizeMode={FastImage.resizeMode.contain}
              />
            </TouchableOpacityView>
          </View>

          {/* Hero Illustration */}
          <View style={styles.illustrationContainer}>
            <FastImage
              source={verifyEmailImg}
              style={styles.illustrationImage}
              resizeMode={FastImage.resizeMode.contain}
            />
          </View>

          {/* Title & Subtitle */}
          <View style={styles.textContainer}>
            <AppText style={styles.title}>
              Verify Your{" "}
              <AppText style={[styles.title, { color: colors.cyan }]}>
                {verifyType}
              </AppText>
            </AppText>

            <AppText style={styles.subtitle}>
              The verification code has been sent to your{" "}
              {userData?.registeredBy === "email" ? "email " : "phone "}
              <AppText style={[styles.boldText, { color: colors.white }]}>
                {getMaskedSignId()}
              </AppText>
              , valid for{" "}
              <AppText style={[styles.boldText, { color: colors.cyan }]}>
                10 minutes.
              </AppText>
            </AppText>
          </View>

          {/* 6-Digit OTP Input */}
          <View style={styles.otpContainer}>
            <OtpInput6Digit
              ref={otpInputRef}
              value={otp}
              onChangeText={(val) => {
                if (otpError) setOtpError(false);
                setOtp(val);
              }}
              hasError={otpError}
            />
          </View>

          {/* Action Links Row (Resend / Paste) */}
          <View style={styles.actionLinksContainer}>
            {disableBtn ? (
              <View style={styles.actionLinkButton}>
                <AppText style={styles.resendCooldownText}>
                  Resend in{" "}
                  <AppText style={{ color: colors.cyan, fontFamily: fonts.medium }}>
                    {String(timer).padStart(2, "0")}s
                  </AppText>
                </AppText>
              </View>
            ) : (
              <TouchableOpacityView
                style={styles.actionLinkButton}
                onPress={() => onGetOtp(true)}
                disabled={disableBtn}
                activeOpacity={0.7}
              >
                <RefreshCw color={colors.cyan} size={16} />
                <AppText
                  style={[styles.actionLinkText, { color: colors.cyan }]}
                >
                  Resend Code
                </AppText>
              </TouchableOpacityView>
            )}

            <TouchableOpacityView
              style={styles.actionLinkButton}
              onPress={onPasteOtp}
              activeOpacity={0.7}
            >
              <ClipboardIcon
                color={colors.darkShadeColorText || "#6A7282"}
                size={16}
              />
              <AppText
                style={[
                  styles.actionLinkText,
                  { color: colors.darkShadeColorText || "#6A7282" },
                ]}
              >
                Paste
              </AppText>
            </TouchableOpacityView>
          </View>

          {/* Next Button */}
          <View style={styles.buttonWrapper}>
            <Button
              title="Next"
              disabled={otpSubmitting || showButtonLoading}
              onPress={handleVerifyOtp}
              loading={showButtonLoading || otpSubmitting}
              shrinkOnLoad
              rightIcon={
                <View style={styles.nextIconWrapper}>
                  <FastImage
                    source={arrowRightIcon}
                    style={styles.nextIcon}
                    tintColor={colors.white}
                    resizeMode="contain"
                  />
                </View>
              }
              containerStyle={styles.nextButton}
            />
          </View>

          {/* Didn't receive the code? */}
          <TouchableOpacityView
            style={styles.bottomHelpLink}
            onPress={() => onGetOtp(true)}
            disabled={disableBtn}
            activeOpacity={0.7}
          >
            <AppText style={styles.bottomHelpText}>
              Didn't receive the code?
            </AppText>
          </TouchableOpacityView>
        </ScrollView>
      </KeyboardAvoidingView>

      <SpinnerSecond loading={resendLoading} localOnly />
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 30,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    marginBottom: 10,
  },
  headerIcon: {
    width: 38,
    height: 38,
  },
  illustrationContainer: {
    alignItems: "center",
    marginTop: 14,
  },
  illustrationImage: {
    width: 150,
    height: 150,
  },
  textContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 25,
    color: colors.white,
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.darkShadeColorText || "#6A7282",
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  boldText: {
    fontFamily: fonts.medium,
  },
  otpContainer: {
    marginTop: 24,
    width: "100%",
  },
  actionLinksContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  actionLinkButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionLinkText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    marginLeft: 8,
  },
  resendCooldownText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.darkShadeColorText || "#6A7282",
  },
  buttonWrapper: {
    alignItems: "center",
    width: "100%",
    marginTop: 24,
  },
  nextButton: {
    width: "100%",
  },
  nextIconWrapper: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  nextIcon: {
    width: 12,
    height: 12,
  },
  bottomHelpLink: {
    alignSelf: "center",
    marginTop: 24,
  },
  bottomHelpText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.cyan,
    textDecorationLine: "none",
  },
});

export default VerifyAccount;
