import React, { useEffect, useMemo, useRef, useState } from "react";
import FastImage from "react-native-fast-image";
import {
  ActivityIndicator,
  Keyboard,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { isValidPhoneNumber } from "libphonenumber-js";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { prepareGoogleSignIn } from "../../helper/googleSignIn";
import {
  FORGOT_PASSWORD_SCREEN,
  REGISTER_SCREEN,
  WELCOME_SCREEN,
} from "../../navigation/routes";
import {
  AppSafeAreaView,
  AppText,
  Button,
  FOURTEEN,
  Input,
  MEDIUM,
  BOLD,
} from "../../shared";
import KeyBoardAware from "../../shared/components/KeyboardAware";
import { authStyles } from "./authStyles";
import { showError } from "../../helper/logger";
import {
  isAppleSignInCancelled,
  performAppleSignIn,
  buildAppleThirdPartyBody,
} from "../../helper/appleSignIn";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  googleLogin,
  login,
  passkeyDiscoverableLogin,
  verifyPasskeyLogin,
  type LoginThunkResult,
} from "../../actions/authActions";
import { Passkey } from "react-native-passkey";
import TouchableOpacityView from "../../shared/components/TouchableOpacityView";
import { getEmailDomainSuggestions } from "../../helper/emailDomainSuggest";
import { checkValue, validateEmail } from "../../helper/utility";
import { useTheme } from "../../hooks/useTheme";
import { setLoading, setPasskeyCancelled } from "../../slices/authSlice";
import {
  apple,
  arrowRightIcon,
  authUserImg,
  googleIcon,
  loginPromoImg,
  passkeyIcon,
  passkey_login,
} from "../../helper/ImageAssets";
import {
  AuthEmailPhoneTabBar,
  AuthPhoneInput,
} from "../../shared/components";
import NavigationService from "../../navigation/NavigationService";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { appOperation } from "../../appOperation";

const Login = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const isLoading = useAppSelector((state) => state.auth.isLoading);
  const showButtonLoading = useAppSelector(
    (state) => state.auth.isLoading && state.auth.loadingFor !== "otp"
  );
  const passwordInput = useRef<any>(null);
  const [signUpId, setSignUpId] = useState("");
  const [password, setPassword] = useState<string>("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(true);
  const [index, setIndex] = useState(0); // 0 = Email, 1 = Phone
  const [showPassField, setShowPassField] = useState(false);
  const [countryCode, setCountryCode] = useState(["91"]);
  const [country, setCountry] = useState("IN");
  const [isValid, setIsValid] = useState(false);
  const [identifierError, setIdentifierError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [isGoogleSignInInProgress, setIsGoogleSignInInProgress] =
    useState(false);
  const [isAppleSignInInProgress, setIsAppleSignInInProgress] = useState(false);
  const [isPasskeySignInInProgress, setIsPasskeySignInInProgress] =
    useState(false);
  const [emailSuggestListVisible, setEmailSuggestListVisible] = useState(false);
  const emailSuggestBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => clearEmailSuggestBlurTimer();
  }, []);

  useEffect(() => {
    setSignUpId("");
    setPassword("");
    setIdentifierError(false);
    setPasswordError(false);
    setShowPassField(false);
    setEmailSuggestListVisible(false);
  }, [index]);

  useEffect(() => {
    return () => {
      setIsGoogleSignInInProgress(false);
      setIsPasskeySignInInProgress(false);
    };
  }, []);

  const signInWithPasskey = async () => {
    if (
      isPasskeySignInInProgress ||
      isGoogleSignInInProgress ||
      isAppleSignInInProgress
    ) {
      return;
    }

    if (!Passkey.isSupported()) {
      showError("Passkeys are not supported on this device");
      return;
    }

    try {
      setIsPasskeySignInInProgress(true);
      await dispatch(passkeyDiscoverableLogin());
    } catch (error: any) {
      showError(error?.message || "Passkey authentication failed");
    } finally {
      setIsPasskeySignInInProgress(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setIsGoogleSignInInProgress(true);
      dispatch(setLoading(true));
      await prepareGoogleSignIn();
      const account = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();

      const data = {
        Token: tokens?.accessToken || tokens?.idToken || account?.data?.idToken,
        type: "google",
      };

      dispatch(googleLogin(data));
    } catch (error: any) {
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
        (error as { code?: string })?.code ===
        statusCodes.PLAY_SERVICES_NOT_AVAILABLE
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

  const signInWithApple = async () => {
    if (
      isAppleSignInInProgress ||
      isGoogleSignInInProgress ||
      isPasskeySignInInProgress
    ) {
      return;
    }
    try {
      setIsAppleSignInInProgress(true);
      dispatch(setLoading(true));
      const appleResult = await performAppleSignIn();
      const data = buildAppleThirdPartyBody(appleResult);
      dispatch(googleLogin(data));
    } catch (error: any) {
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

  const onSubmit = () => {
    if (!password) {
      setPasswordError(true);
      showError(checkValue("Please Enter Password"));
      return;
    }
    setPasswordError(false);
    Keyboard.dismiss();
    onLogin();
  };

  const getNormalizedLoginId = () => {
    if (index === 0) {
      return String(signUpId || "").trim();
    }
    return String(signUpId || "").replace(/\D/g, "").replace(/^0+/, "") || "";
  };

  const onLogin = async () => {
    const normalizedId = getNormalizedLoginId();
    const result = (await dispatch(
      login({
        email_or_phone: normalizedId,
        password,
        token: "",
      })
    )) as LoginThunkResult;
    setPasswordError(false);
    setIdentifierError(false);
    if (!result?.success) {
      if (result.highlightPasswordField) setPasswordError(true);
      if (result.highlightIdentifierField) setIdentifierError(true);
      if (result?.message) {
        showError(result.message);
      }
    }
  };

  const validateEmailOrUsername = (raw: string) => {
    const id = String(raw || "").trim();
    if (!id) {
      setIdentifierError(true);
      showError("Please enter your email or username");
      return false;
    }
    setIdentifierError(false);
    if (id.includes("@")) {
      if (!validateEmail(id)) {
        setIdentifierError(true);
        showError("Please enter a valid email address");
        return false;
      }
      return true;
    }
    if (id.length < 3) {
      setIdentifierError(true);
      showError("Username must be at least 3 characters");
      return false;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(id)) {
      setIdentifierError(true);
      showError("Username contains invalid characters");
      return false;
    }
    return true;
  };

  const parseIdentifierCheckResponse = (
    res: any,
    purpose: string = "signup"
  ) => {
    const isLogin =
      String(purpose || "signup").trim().toLowerCase() === "login";

    if (res == null) {
      return {
        ok: false,
        exists: null,
        code: null,
        message: "No response from server.",
      };
    }

    const referral = res.referral;
    if (
      referral &&
      typeof referral === "object" &&
      referral.success === false
    ) {
      return {
        ok: false,
        exists: null,
        code: referral.code || "INVALID_REFERRAL_CODE",
        message: referral.message || "Referral code is invalid.",
      };
    }

    if (res.success === true) {
      return {
        ok: true,
        exists: isLogin,
        code: null,
        message: res.message || null,
      };
    }

    return {
      ok: false,
      exists: isLogin ? false : true,
      code: res.code || null,
      message:
        res.message || (isLogin ? "User not found" : "Email already exists"),
    };
  };

  const changeInput = (val: any) => {
    setSignUpId(val);
    setShowPassField(false);
    if (identifierError) setIdentifierError(false);
    if (index === 0) {
      const raw = String(val || "").trim();
      if (!raw) {
        setIsValid(false);
        return;
      }
      if (raw.includes("@")) {
        setIsValid(validateEmail(raw));
      } else {
        setIsValid(raw.length >= 3 && /^[a-zA-Z0-9._-]+$/.test(raw));
      }
    } else if (index === 1) {
      const digits = String(val || "").replace(/\D/g, "").replace(/^0+/, "");
      const fullPhone = `${countryCode?.[0] ? `+${countryCode[0]}` : "+91"
        }${digits}`;
      const valid = isValidPhoneNumber(fullPhone);
      setIsValid(valid);
    }
  };

  const applyEmailDomain = (domain: string) => {
    clearEmailSuggestBlurTimer();
    const s = String(signUpId || "");
    const at = s.indexOf("@");
    if (at < 0) return;
    changeInput(`${s.slice(0, at)}@${domain}`);
    setEmailSuggestListVisible(false);
  };

  const onNext = async () => {
    if (index === 0) {
      if (!validateEmailOrUsername(signUpId)) return;
    } else {
      const digits = String(signUpId || "").replace(/\D/g, "").replace(/^0+/, "");
      if (!digits) {
        setIdentifierError(true);
        showError("Please enter your phone number");
        return;
      }
      setIdentifierError(false);
      const fullPhone = `${countryCode?.[0] ? `+${countryCode[0]}` : "+91"
        }${digits}`;
      if (!isValidPhoneNumber(fullPhone)) {
        setIdentifierError(true);
        showError(
          "Please enter a valid phone number for the selected country"
        );
        return;
      }
      if (digits !== signUpId) {
        setSignUpId(digits);
      }
    }
    const normalizedId = getNormalizedLoginId();
    const identifierKind =
      index === 1 ? "phone" : normalizedId.includes("@") ? "email" : "username";

    const payload = {
      identifier: normalizedId,
      kind: identifierKind,
      purpose: "login",
      countryCode:
        index === 1
          ? countryCode?.[0]
            ? `+${countryCode[0]}`
            : "+91"
          : undefined,
    };

    dispatch(setLoading(true));
    try {
      const loginCheck: any = await appOperation.guest.checkIdentifier(payload);

      const accountCheck = parseIdentifierCheckResponse(loginCheck, "login");
      if (!accountCheck.ok) {
        setIdentifierError(true);
        showError(accountCheck.message || "User not found");
        dispatch(setLoading(false));
        return;
      }
      if (!accountCheck.exists) {
        setIdentifierError(true);
        showError(accountCheck.message || "User not found");
        dispatch(setLoading(false));
        return;
      }
      setIdentifierError(false);
    } catch (e: any) {
      const errorObj = {
        success: false,
        code: e?.code || null,
        message:
          e?.message ||
          e?.data?.message ||
          "Could not verify account. Please try again.",
      };

      const accountCheck = parseIdentifierCheckResponse(errorObj, "login");
      if (!accountCheck.ok) {
        setIdentifierError(true);
        showError(accountCheck.message || "User not found");
        dispatch(setLoading(false));
        return;
      }
      if (!accountCheck.exists) {
        setIdentifierError(true);
        showError(accountCheck.message || "User not found");
        dispatch(setLoading(false));
        return;
      }
      setIdentifierError(true);
      showError(accountCheck.message);
      dispatch(setLoading(false));
      return;
    }
    dispatch(setLoading(false));

    // Web Parity: If Passkey is supported, attempt silent passkey login before showing password
    if (Passkey.isSupported()) {
      setIsPasskeySignInInProgress(true);
      const passkeyResult = await dispatch(
        verifyPasskeyLogin(normalizedId, true)
      );
      setIsPasskeySignInInProgress(false);
      if (passkeyResult) {
        dispatch(setPasskeyCancelled(false));
        return;
      }
      dispatch(setPasskeyCancelled(true));
    }

    setShowPassField(true);
  };

  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background, flex: 1 }}>
      <KeyBoardAware
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContainer}
      >
        {/* Top Circular Header Icon */}
        <View style={styles.headerContainer}>
          <TouchableOpacityView
            onPress={() => NavigationService.navigate(WELCOME_SCREEN)}
            activeOpacity={0.7}
          >
            <FastImage
              source={authUserImg}
              style={styles.headerIcon}
              resizeMode={FastImage.resizeMode.contain}
            />
          </TouchableOpacityView>
        </View>

        {/* Welcome Row with 3D Cyberpunk Illustration */}
        <View style={styles.welcomeContainer}>
          <View style={styles.welcomeTextContainer}>
            <AppText style={styles.welcomeTitle}>Welcome Back</AppText>
            <AppText style={styles.welcomeSubtitle}>
              {`Log in to continue your \njourney`}
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

        {/* Tab Bar with Baseline Underline */}
        <AuthEmailPhoneTabBar
          tabs={["Email", "Phone"]}
          index={index}
          onChange={(i: number) => {
            setIndex(i);
            setShowPassField(false);
          }}
          containerStyle={{}}
        />

        {/* Form Inputs */}
        <View style={styles.formContainer}>
          {index === 1 ? (
            <AuthPhoneInput
              value={signUpId}
              onChangeText={(text: string) => changeInput(text)}
              placeholder={"Enter Phone number"}
              hasError={identifierError}
              onSelectCountry={setCountryCode}
              onCountry={setCountry}
              country={country}
              countryCode={countryCode}
              maxLength={15}
              onFocus={() => { }}
              onBlur={() => { }}
              onSubmitEditing={() => { }}
              onEndEditing={() => { }}
            />
          ) : (
            <View style={[authStyles.mobileContainer, styles.emailSuggestWrap]}>
              <Input
                placeholder={"Enter email address"}
                value={signUpId}
                onChangeText={(text) => changeInput(text)}
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
                onSubmitEditing={() => { }}
                onEndEditing={() => { }}
                hasError={identifierError}
                mainContainer={[authStyles.mobileInput, styles.emailFieldMain]}
                maxLength={100}
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

          {/* Next Button (Step 1) */}
          {!showPassField && (
            <View style={styles.buttonWrapper}>
              <Button
                title={"Next"}
                disabled={false}
                onPress={onNext}
                loading={showButtonLoading && !isGoogleSignInInProgress}
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
                containerStyle={styles.actionButton}
              />
            </View>
          )}

          {/* Password Step (Step 2) */}
          {showPassField && (
            <>
              <Input
                placeholder={"Enter password"}
                value={password}
                onChangeText={(text) => {
                  if (passwordError) setPasswordError(false);
                  setPassword(text);
                }}
                autoCapitalize="none"
                secureTextEntry={isPasswordVisible}
                assignRef={(input: any) => {
                  passwordInput.current = input;
                }}
                returnKeyType="next"
                isSecure
                hasError={passwordError}
                onPressVisible={() => setIsPasswordVisible(!isPasswordVisible)}
              />

              <TouchableOpacityView
                style={styles.forgotRow}
                onPress={() => NavigationService.navigate(FORGOT_PASSWORD_SCREEN)}
                activeOpacity={0.7}
              >
                <AppText style={styles.forgotText}>Forgot Password?</AppText>
              </TouchableOpacityView>

              <View style={styles.buttonWrapper}>
                <Button
                  title={"Login"}
                  disabled={false}
                  onPress={onSubmit}
                  loading={showButtonLoading && !isGoogleSignInInProgress}
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
                  containerStyle={styles.actionButton}
                />
              </View>
            </>
          )}

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View
              style={[
                styles.dividerLine,
                { backgroundColor: isDark ? "#1C1E22" : themeColors.border },
              ]}
            />
            <AppText style={styles.dividerText}>Or</AppText>
            <View
              style={[
                styles.dividerLine,
                { backgroundColor: isDark ? "#1C1E22" : themeColors.border },
              ]}
            />
          </View>

          {/* Continue with Google */}
          <TouchableOpacityView
            style={[
              styles.socialButton,
              {
                backgroundColor: isDark ? "#08090B" : themeColors.card,
                borderColor: isDark ? "#1C1E22" : themeColors.border,
              },
            ]}
            onPress={signInWithGoogle}
            disabled={
              isGoogleSignInInProgress ||
              isAppleSignInInProgress ||
              isPasskeySignInInProgress ||
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
            <AppText style={styles.socialButtonTitle}>
              Continue with Google
            </AppText>
          </TouchableOpacityView>

          {/* Continue with Passkey */}
          <TouchableOpacityView
            style={[
              styles.socialButton,
              {
                backgroundColor: isDark ? "#08090B" : themeColors.card,
                borderColor: isDark ? "#1C1E22" : themeColors.border,
              },
            ]}
            onPress={signInWithPasskey}
            disabled={
              isGoogleSignInInProgress ||
              isAppleSignInInProgress ||
              isPasskeySignInInProgress ||
              isLoading
            }
            activeOpacity={0.8}
          >
            {isPasskeySignInInProgress ? (
              <ActivityIndicator size={"small"} color={themeColors.text} />
            ) : (
              <FastImage
                source={passkeyIcon || passkey_login}
                resizeMode="contain"
                style={styles.socialIcon}
                tintColor={isDark ? colors.white : colors.black}
              />
            )}
            <AppText style={styles.socialButtonTitle}>
              Continue with Passkey
            </AppText>
          </TouchableOpacityView>

          {/* Continue with Apple (iOS only) */}
          {Platform.OS === "ios" ? (
            <TouchableOpacityView
              style={[
                styles.socialButton,
                {
                  backgroundColor: isDark ? "#08090B" : themeColors.card,
                  borderColor: isDark ? "#1C1E22" : themeColors.border,
                },
              ]}
              onPress={signInWithApple}
              disabled={
                isGoogleSignInInProgress ||
                isAppleSignInInProgress ||
                isPasskeySignInInProgress ||
                isLoading
              }
              activeOpacity={0.8}
            >
              {isAppleSignInInProgress ? (
                <ActivityIndicator size={"small"} color={themeColors.text} />
              ) : (
                <FastImage
                  source={apple}
                  tintColor={isDark ? colors.white : colors.black}
                  resizeMode="contain"
                  style={styles.socialIcon}
                />
              )}
              <AppText style={styles.socialButtonTitle}>
                Continue with Apple
              </AppText>
            </TouchableOpacityView>
          ) : null}

          {/* Footer Link */}
          <TouchableOpacityView
            style={styles.footerLinkContainer}
            onPress={() => NavigationService.navigate(REGISTER_SCREEN)}
            activeOpacity={0.7}
          >
            <AppText style={styles.footerLinkText}>
              Create a Coincode Account
            </AppText>
          </TouchableOpacityView>
        </View>
      </KeyBoardAware>
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
    marginBottom: 10,
  },
  headerIcon: {
    width: 38,
    height: 38,
  },
  welcomeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 20,
    marginTop: 6,
  },
  welcomeTextContainer: {
    flex: 1,
    paddingRight: 16,
    justifyContent: "center",
  },
  welcomeTitle: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: colors.white,
    marginBottom: 8,
    lineHeight: 30,
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
  },
  promoImage: {
    width: 200,
    height: 200,
    marginTop: 15,
    marginRight: 10,
  },
  formContainer: {
    paddingHorizontal: 24,
    marginTop: 16,
  },
  buttonWrapper: {
    alignItems: "center",
    width: "100%",
    marginTop: 10,
  },
  actionButton: {
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
  forgotRow: {
    alignSelf: "flex-end",
    marginBottom: 8,
    marginTop: 4,
  },
  forgotText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.white,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.darkShadeColorText || "#6A7282",
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    marginBottom: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  socialIcon: {
    width: 20,
    height: 20,
  },
  socialButtonTitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: "#D1D5DC",
  },
  footerLinkContainer: {
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 10,
  },
  footerLinkText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.cyan,
    textDecorationLine: "underline",
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
    marginBottom: 12,
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
});

export default Login;
