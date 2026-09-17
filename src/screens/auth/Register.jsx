import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import FastImage from "react-native-fast-image";
import { useRoute } from "@react-navigation/native";
import { isValidPhoneNumber } from "libphonenumber-js";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import {
  AppSafeAreaView,
  AppText,
  Button,
  FIFTEEN,
  FOURTEEN,
  Input,
  MEDIUM,
} from "../../shared";
import KeyBoardAware from "../../shared/components/KeyboardAware";
import { AuthEmailPhoneTabBar, AuthPhoneInput } from "../../shared/components";
import TouchableOpacityView from "../../shared/components/TouchableOpacityView";

import { BASE_URL } from "../../helper/Constants";
import { showError } from "../../helper/logger";
import {
  isAppleSignInCancelled,
  performAppleSignIn,
  buildAppleThirdPartyBody,
} from "../../helper/appleSignIn";
import { appOperation } from "../../appOperation";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { googleRegister } from "../../actions/authActions";
import {
  authBackIcon,
  authBellImg,
  loginPromoImg,
  downIcon,
  googleIcon,
  apple,
  passkeyIcon,
  arrowRightIcon,
} from "../../helper/ImageAssets";
import { checkValue, validateEmail } from "../../helper/utility";
import { getEmailDomainSuggestions } from "../../helper/emailDomainSuggest";
import NavigationService from "../../navigation/NavigationService";
import { LOGIN_SCREEN, SET_PASSWORD_SCREEN } from "../../navigation/routes";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { setLoading } from "../../slices/authSlice";
import { useTheme } from "../../hooks/useTheme";
import { prepareGoogleSignIn } from "../../helper/googleSignIn";

/** Matches AppOperation.send(): only `api/*` skips the `v1/` prefix. */
const guestPostUrl = (path) => {
  if (path.startsWith("api/")) {
    return `${BASE_URL}${path}`;
  }
  return `${BASE_URL}v1/${path}`;
};

const logRegisterPayload = (label, path, data) => {
  const safe =
    data && typeof data === "object"
      ? {
        ...data,
        password: data.password != null ? "[redacted]" : undefined,
        Token: data.Token != null ? "[redacted]" : undefined,
      }
      : data;
};

const isSkippablePrecheckError = (err) => {
  const code = Number(err?.code ?? err?.status ?? 0);
  const message = String(err?.message || "").toLowerCase();
  return (
    code === 404 ||
    message.includes("html error page") ||
    message.includes("html instead of json")
  );
};

const Register = () => {
  const route = useRoute();
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.auth.theme);
  const languages = useAppSelector((state) => state.account.languages);
  const isLoading = useAppSelector((state) => state.auth.isLoading);
  const showButtonLoading = useAppSelector(
    (state) => state.auth.isLoading && state.auth.loadingFor !== "otp"
  );
  const [signUpId, setSignUpId] = useState("");
  const [showRefer, setShowRefer] = useState(false);
  const refFromParams =
    route?.params?.reffcode ||
    route?.params?.referCode ||
    route?.params?.emailId ||
    "";
  const [referCode, setReferCode] = useState(refFromParams);
  const [index, setIndex] = useState(0);
  const [countryCode, setCountryCode] = useState(["91"]);
  const [country, setCountry] = useState("IN");
  const [isGoogleSignInInProgress, setIsGoogleSignInInProgress] =
    useState(false);
  const [isAppleSignInInProgress, setIsAppleSignInInProgress] = useState(false);
  const [step1Submitting, setStep1Submitting] = useState(false);
  const [checkTermsEmail, setCheckTermsEmail] = useState(true);
  const [checkTermsPhone, setCheckTermsPhone] = useState(true);
  const [signUpIdError, setSignUpIdError] = useState(false);
  const [emailSuggestListVisible, setEmailSuggestListVisible] = useState(false);
  const emailSuggestBlurTimer = useRef(null);
  const { colors: themeColors, isDark } = useTheme();

  const clearEmailSuggestBlurTimer = () => {
    if (emailSuggestBlurTimer.current) {
      clearTimeout(emailSuggestBlurTimer.current);
      emailSuggestBlurTimer.current = null;
    }
  };

  const emailDomainSuggestions = useMemo(
    () => (index === 0 ? getEmailDomainSuggestions(signUpId) : []),
    [index, signUpId]
  );
  const tabTitle = (value, fallback) =>
    value != null && value !== "" ? checkValue(value) : fallback;
  const authTabs = [
    tabTitle(languages?.email, "Email"),
    tabTitle(languages?.phone, "Phone"),
  ];

  useEffect(() => {
    setSignUpId("");
    setReferCode(refFromParams || "");
    setSignUpIdError(false);
    setEmailSuggestListVisible(false);
  }, [index]);

  useEffect(() => {
    return () => clearEmailSuggestBlurTimer();
  }, []);

  const handleClearCaptcha = () => { };

  useEffect(() => {
    return () => {
      setIsGoogleSignInInProgress(false);
    };
  }, []);

  const onSubmit = async () => {
    console.log(
      "[Register] onSubmit triggered. Index:",
      index,
      "signUpId:",
      signUpId,
      "referCode:",
      referCode
    );
    if (index === 0) {
      if (!signUpId) {
        setSignUpIdError(true);
        showError("Please enter your email");
        return;
      }
      if (!validateEmail(signUpId)) {
        setSignUpIdError(true);
        showError(
          checkValue(languages?.error_email) ||
          "Please enter a valid email address"
        );
        return;
      }
      setSignUpIdError(false);
    } else if (index === 1) {
      const fullPhone = `${countryCode[0] ? `+${countryCode[0]}` : "+91"
        }${signUpId}`;
      if (!isValidPhoneNumber(fullPhone)) {
        setSignUpIdError(true);
        showError(
          checkValue(languages?.error_userName) ||
          "Please enter a valid phone number for the selected country"
        );
        return;
      }
      setSignUpIdError(false);
    }
    if (index === 0 && !checkTermsEmail) {
      showError("Please agree to Coincode Terms and Use");
      return;
    }
    if (index === 1 && !checkTermsPhone) {
      showError("Please agree to Coincode Terms and Use");
      return;
    }

    try {
      setStep1Submitting(true);
      const ref = String(referCode || "").trim();
      const payload = {
        identifier: signUpId.trim(),
        kind: index === 0 ? "email" : "phone",
        purpose: "signup",
        countryCode:
          index === 1
            ? countryCode[0]
              ? `+${countryCode[0]}`
              : "+91"
            : undefined,
        referralCode: ref,
      };

      console.log("====== REGISTER ON NEXT - checkIdentifier PAYLOAD ======");
      console.log(JSON.stringify(payload, null, 2));

      const signupCheck = await appOperation.guest.checkIdentifier(payload);

      console.log("====== REGISTER ON NEXT - checkIdentifier RESPONSE ======");
      console.log(JSON.stringify(signupCheck, null, 2));

      // Spec: On signup, if referral.success === false, show referral.message
      if (signupCheck?.referral?.success === false) {
        showError(signupCheck?.referral?.message || "Invalid referral code");
        setStep1Submitting(false);
        return;
      }

      if (signupCheck?.success !== true) {
        showError(signupCheck?.message || "Request failed");
        setStep1Submitting(false);
        return;
      }
    } catch (e) {
      console.log("[Register] checkIdentifier caught error object:", e);
      if (isSkippablePrecheckError(e)) {
        console.warn(
          "[Register] check-signup-email unavailable, skipping pre-check",
          e?.code || e?.message
        );
      } else {
        showError(e?.message || e?.data?.message || "Request failed");
        setStep1Submitting(false);
        return;
      }
    } finally {
      setStep1Submitting(false);
    }

    NavigationService.navigate(SET_PASSWORD_SCREEN, {
      signupType: index === 0 ? "email" : "phone",
      signUpId,
      countryCode,
      referCode,
    });
  };

  const signupWithGoogle = async () => {
    try {
      console.log("Starting Google Sign-In...");
      setIsGoogleSignInInProgress(true);
      dispatch(setLoading(true));
      await prepareGoogleSignIn();
      const account = await GoogleSignin.signIn();
      console.log("Native Google account:", account);

      // Fetch short-lived OAuth access token (Android only; iOS returns null)
      const tokens = await GoogleSignin.getTokens();
      console.log("Google tokens:", tokens);

      const uniqueSuffix =
        Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      let data = {
        Token: tokens?.accessToken || tokens?.idToken || account?.data?.idToken,
        type: "google",
        referral_code: referCode || "",
        userName: `user_${uniqueSuffix}`,
      };

      logRegisterPayload("Google signup", "user/third-party-signup", data);
      dispatch(googleRegister(data, () => { }, () => { }, handleClearCaptcha));
    } catch (error) {
      console.warn("Google Sign In Error:", error);

      // Handle specific error types
      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string" &&
        error.message.includes("User cancelled flow")
      ) {
        showError("Google Sign-In was cancelled");
      } else if (error.message && error.message.includes("Network error")) {
        showError("Network error. Please check your internet connection.");
      } else if (error.message && error.message.includes("Invalid client")) {
        showError(
          "Google Sign-In configuration error. Please contact support."
        );
      } else if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
        showError("Google Sign-In was cancelled");
      } else if (error?.code === statusCodes.IN_PROGRESS) {
        showError("Google Sign-In already in progress");
      } else if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE
      ) {
        showError("Google Play Services not available or outdated");
      } else {
        const fallbackMessage =
          (typeof error === "string" && error) ||
          error?.message ||
          error?.error ||
          error?.error_description ||
          "Google Sign-In failed. Please try again.";
        showError(fallbackMessage);
      }
    } finally {
      setIsGoogleSignInInProgress(false);
      dispatch(setLoading(false));
    }
  };

  const signupWithApple = async () => {
    if (isAppleSignInInProgress || isGoogleSignInInProgress) {
      return;
    }
    try {
      setIsAppleSignInInProgress(true);
      dispatch(setLoading(true));
      const appleResult = await performAppleSignIn();
      const data = buildAppleThirdPartyBody(appleResult, {
        referral_code: referCode || "",
      });
      logRegisterPayload("Apple signup", "user/third-party-signup", data);
      dispatch(googleRegister(data, () => { }, () => { }, handleClearCaptcha));
    } catch (error) {
      console.warn(
        "[Register] Apple Sign-In Error:",
        error?.code,
        error?.message,
        error
      );
      if (isAppleSignInCancelled(error)) {
        showError("Apple Sign-In was cancelled");
        return;
      }
      showError(error?.message || "Apple Sign-In failed. Please try again.");
    } finally {
      setIsAppleSignInInProgress(false);
      dispatch(setLoading(false));
    }
  };

  const openSupport = () => {
    Linking.openURL("https://arabglobal.ae/help_center").catch(() => { });
  };

  const changeEmailInput = (text) => {
    if (signUpIdError) setSignUpIdError(false);
    setSignUpId(text);
  };

  const applyEmailDomain = (domain) => {
    clearEmailSuggestBlurTimer();
    const s = String(signUpId || "");
    const at = s.indexOf("@");
    if (at < 0) return;
    changeEmailInput(`${s.slice(0, at)}@${domain}`);
    setEmailSuggestListVisible(false);
  };

  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background, flex: 1 }}>
      <KeyBoardAware
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Header */}
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

          <TouchableOpacityView
            // onPress={openSupport}
            activeOpacity={0.7}>
            <FastImage
              source={authBellImg}
              style={styles.headerIcon}
              resizeMode={FastImage.resizeMode.contain}
            />
          </TouchableOpacityView>
        </View>

        {/* Hero Welcome Row */}
        <View style={styles.welcomeContainer}>
          <View style={styles.welcomeTextContainer}>
            <AppText style={styles.welcomeTitle}>
              Create Account
            </AppText>
            <AppText style={styles.welcomeSubtitle}>
              {`Start your crypto journey in \nfew steps`}
            </AppText>
          </View>
          <View style={styles.promoImageContainer}>
            <FastImage
              source={loginPromoImg}
              style={styles.promoImage}
              resizeMode={FastImage.resizeMode.contain}
            />
          </View>
        </View>

        {/* Tab Bar: Email / Phone (Full-width baseline border across screen) */}
        <AuthEmailPhoneTabBar
          tabs={authTabs}
          index={index}
          onChange={setIndex}
        />

        {/* Form Inputs Container */}
        <View style={styles.formContainer}>
          {index === 1 ? (
            <AuthPhoneInput
              value={signUpId}
              onChangeText={(text) => {
                if (signUpIdError) setSignUpIdError(false);
                setSignUpId(text);
              }}
              placeholder={"Enter phone number"}
              hasError={signUpIdError}
              onSelectCountry={setCountryCode}
              onCountry={setCountry}
              country={country}
              countryCode={countryCode}
              maxLength={15}
            />
          ) : (
            <View style={styles.emailSuggestWrap}>
              <Input
                placeholder={"Enter email address"}
                value={signUpId}
                onChangeText={(text) => changeEmailInput(text)}
                keyboardType={"email-address"}
                autoCapitalize="none"
                returnKeyType="next"
                onfocus={() => {
                  clearEmailSuggestBlurTimer();
                  setEmailSuggestListVisible(true);
                }}
                onBlur={() => {
                  clearEmailSuggestBlurTimer();
                  emailSuggestBlurTimer.current = setTimeout(() => {
                    setEmailSuggestListVisible(false);
                    emailSuggestBlurTimer.current = null;
                  }, 200);
                }}
                mainContainer={styles.emailFieldMain}
                maxLength={100}
                hasError={signUpIdError}
              />
              {emailSuggestListVisible && emailDomainSuggestions.length > 0 ? (
                <View
                  style={[
                    styles.emailSuggestList,
                    {
                      backgroundColor: themeColors.input,
                      borderColor: themeColors.border,
                    },
                  ]}
                >
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled
                    style={styles.emailSuggestScroll}
                  >
                    {emailDomainSuggestions.map((domain) => (
                      <TouchableOpacityView
                        key={domain}
                        style={styles.emailSuggestRow}
                        onPress={() => applyEmailDomain(domain)}
                      >
                        <AppText
                          type={FOURTEEN}
                          style={{ color: themeColors.text }}
                        >
                          @{domain}
                        </AppText>
                      </TouchableOpacityView>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          )}

          {/* Referral Code Accordion Box */}
          {!showRefer && !refFromParams && !referCode ? (
            <TouchableOpacityView
              style={[
                styles.referralToggleBox,
                {
                  backgroundColor: isDark
                    ? colors.lightBlackLatest
                    : "#EDEDEE",
                  borderColor: isDark ? "#151619" : "#E5E7EB",
                },
              ]}
              onPress={() => setShowRefer(true)}
              activeOpacity={0.7}
            >
              <AppText style={styles.referralPlaceholder}>
                Referral code (optional)
              </AppText>
              <FastImage
                source={downIcon}
                resizeMode="contain"
                style={styles.chevronIcon}
                tintColor={colors.darkShadeColorText || "#6A7282"}
              />
            </TouchableOpacityView>
          ) : (
            <View style={styles.referralInputContainer}>
              <Input
                placeholder={"Referral code (optional)"}
                value={referCode}
                onChangeText={(text) => setReferCode(text)}
                autoCapitalize="none"
                returnKeyType="next"
                editable={!refFromParams}
                containerStyle={{ marginBottom: 0 }}
              />
            </View>
          )}

          {/* Next Button */}
          <Button
            title="Next"
            disabled={step1Submitting}
            onPress={onSubmit}
            loading={
              (showButtonLoading &&
                !isGoogleSignInInProgress &&
                !isAppleSignInInProgress) ||
              step1Submitting
            }
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

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View
              style={[
                styles.dividerLine,
                { backgroundColor: isDark ? "#151619" : themeColors.border },
              ]}
            />
            <AppText style={styles.dividerText}>Or log in with</AppText>
            <View
              style={[
                styles.dividerLine,
                { backgroundColor: isDark ? "#151619" : themeColors.border },
              ]}
            />
          </View>

          {/* Social Buttons */}
          <TouchableOpacityView
            style={[
              styles.socialButton,
              {
                borderColor: isDark ? "#151619" : themeColors.border,
                backgroundColor: isDark ? colors.lightBlackLatest : "#FFFFFF",
              },
            ]}
            onPress={signupWithGoogle}
            disabled={
              isGoogleSignInInProgress ||
              isAppleSignInInProgress ||
              isLoading
            }
            activeOpacity={0.8}
          >
            {isGoogleSignInInProgress ? (
              <ActivityIndicator size={"small"} color={themeColors.text} />
            ) : (
              <FastImage
                source={googleIcon}
                resizeMode="contain"
                style={styles.socialIcon}
              />
            )}
            <AppText
              type={FIFTEEN}
              weight={MEDIUM}
              style={styles.socialButtonText}
            >
              Continue with Google
            </AppText>
          </TouchableOpacityView>

          {Platform.OS === "ios" ? (
            <TouchableOpacityView
              style={[
                styles.socialButton,
                {
                  borderColor: isDark ? "#151619" : themeColors.border,
                  backgroundColor: isDark ? colors.lightBlackLatest : "#FFFFFF",
                },
              ]}
              onPress={signupWithApple}
              disabled={
                isGoogleSignInInProgress ||
                isAppleSignInInProgress ||
                isLoading
              }
              activeOpacity={0.8}
            >
              {isAppleSignInInProgress ? (
                <ActivityIndicator size={"small"} color={themeColors.text} />
              ) : (
                <FastImage
                  source={passkeyIcon || apple}
                  resizeMode="contain"
                  style={styles.socialIcon}
                  tintColor={isDark ? colors.white : colors.black}
                />
              )}
              <AppText
                type={FIFTEEN}
                weight={MEDIUM}
                style={styles.socialButtonText}
              >
                Continue with Apple
              </AppText>
            </TouchableOpacityView>
          ) : null}

          {/* Footer Link */}
          <View style={styles.footerLinkContainer}>
            <AppText style={styles.footerText}>
              Already have an account?{" "}
            </AppText>
            <TouchableOpacityView
              onPress={() => NavigationService.navigate(LOGIN_SCREEN)}
              style={styles.loginLinkHit}
              activeOpacity={0.7}
            >
              <AppText style={styles.footerLinkText}>Log In</AppText>
            </TouchableOpacityView>
          </View>
        </View>
      </KeyBoardAware>
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    // marginBottom: 20,
  },
  headerIcon: {
    width: 38,
    height: 38,
  },
  welcomeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 10,
    marginTop: 6,
  },
  welcomeTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  welcomeTitle: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: colors.white,
    marginBottom: 8,
    lineHeight: 32,
  },
  welcomeSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.darkShadeColorText || "#6A7282",
    lineHeight: 20,
  },
  promoImageContainer: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20
  },
  promoImage: {
    width: 200,
    height: 200,
    marginTop: 15,
    marginRight: 10,
  },
  tabContainer: {
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  emailFieldMain: {
    flex: 0,
    alignSelf: "stretch",
    width: "100%",
    marginBottom: 0,
  },
  emailSuggestWrap: {
    zIndex: 10,
    flexDirection: "column",
    alignItems: "stretch",
    alignSelf: "stretch",
    width: "100%",
    justifyContent: "flex-start",
    marginBottom: 14,
  },
  emailSuggestList: {
    marginTop: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    maxHeight: 220,
    overflow: "hidden",
  },
  emailSuggestScroll: {
    maxHeight: 220,
  },
  emailSuggestRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  referralToggleBox: {
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  referralPlaceholder: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.darkShadeColorText || "#6A7282",
  },
  chevronIcon: {
    width: 14,
    height: 14,
  },
  referralInputContainer: {
    marginBottom: 8,
  },
  nextButton: {
    marginTop: 4,
    marginBottom: 10,
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
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.darkShadeColorText || "#6A7282",
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    height: 50,
    marginBottom: 14,
    gap: 10,
  },
  socialIcon: {
    width: 20,
    height: 20,
  },
  socialButtonText: {
    fontFamily: fonts.medium,
    color: "#D1D5DC",
  },
  footerLinkContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  footerText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.darkShadeColorText || "#6A7282",
  },
  loginLinkHit: {
    bottom: 1,
  },
  footerLinkText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.cyan,
  },
});

export default Register;
