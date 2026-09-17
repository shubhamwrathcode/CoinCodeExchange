import React, { useEffect, useState } from "react";
import {
  AppSafeAreaView,
  AppText,
  BOLD,
  Button,
  FOURTEEN,
  Input,
  MEDIUM,
  SEMI_BOLD,
  TWENTY_FOUR,
  TWENTY_SIX,
} from "../../shared";
import KeyBoardAware from "../../shared/components/KeyboardAware";
import { Keyboard, Linking, View, ScrollView, StyleSheet } from "react-native";
import { authStyles } from "./authStyles";
import { getEmailDomainSuggestions } from "../../helper/emailDomainSuggest";
import { showError } from "../../helper/logger";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { forgotOtp, forgotPassword } from "../../actions/authActions";
import { SpinnerSecond } from "../../shared/components/SpinnerSecond";
import {
  checkValue,
  validateEmail,
  validatePassword,
} from "../../helper/utility";
import NavigationService from "../../navigation/NavigationService";
import { LOGIN_SCREEN } from "../../navigation/routes";
import TouchableOpacityView from "../../shared/components/TouchableOpacityView";
import { isValidPhoneNumber } from "libphonenumber-js";
import { colors } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";
import {
  AuthEmailPhoneTabBar,
  AuthHeader,
  AuthPhoneInput,
} from "../../shared/components";

const ForgotPassword = () => {
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const languages = useAppSelector((state) => {
    return state.account.languages;
  });

  const [userName, setUserName] = useState("");
  const [index, setIndex] = useState(0);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(true);
  const [otpText, setOtpText] = useState(checkValue(languages?.register_nine));
  const [countryCode, setCountryCode] = useState(["91"]);
  const [country, setCountry] = useState("IN");
  const [userNameError, setUserNameError] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [timer, setTimer] = useState(0);

  const [emailSuggestListVisible, setEmailSuggestListVisible] = useState(false);
  const emailSuggestBlurTimer = React.useRef(null);

  const clearEmailSuggestBlurTimer = () => {
    if (emailSuggestBlurTimer.current) {
      clearTimeout(emailSuggestBlurTimer.current);
      emailSuggestBlurTimer.current = null;
    }
  };

  const emailDomainSuggestions = React.useMemo(
    () => (index === 0 ? getEmailDomainSuggestions(userName) : []),
    [index, userName]
  );

  const applyEmailDomain = (domain) => {
    setUserName(userName.split("@")[0] + "@" + domain);
    setEmailSuggestListVisible(false);
  };

  useEffect(() => {
    return () => clearEmailSuggestBlurTimer();
  }, []);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const safeText = (value, fallback) =>
    value != null && value !== "" ? checkValue(value) : fallback;

  useEffect(() => {
    setUserName("");
    setUserNameError(false);
    setOtpError(false);
    setPasswordError(false);
  }, [index]);

  const onGetOtp = () => {
    if (timer > 0) return;
    const rawUser = String(userName || "").trim();
    if (!rawUser) {
      setUserNameError(true);
      showError(index === 0 ? checkValue(languages?.error_email) : checkValue(languages?.error_userName));
      return;
    }
    setUserNameError(false);

    let data;
    // index: 0 = Email, 1 = Mobile
    if (index === 1) {
      data = {
        email_or_phone: `+${countryCode} ${userName}`,
        resend: true,
        type: "forgot",
      };
    } else {
      data = {
        email_or_phone: userName,
        resend: true,
        type: "forgot",
      };
    }

    Keyboard.dismiss();
    dispatch(forgotOtp(data, true));
    setTimer(60);
  };

  const onLogin = () => {
    NavigationService.navigate(LOGIN_SCREEN);
  };

  const onSubmit = () => {
    const rawUser = String(userName || "").trim();
    const rawOtp = String(otp || "").trim();
    const rawPass = String(password || "").trim();

    // Required fields
    if (!rawUser) {
      setUserNameError(true);
      showError(index === 0 ? checkValue(languages?.error_email) : checkValue(languages?.error_userName));
      return;
    }
    if (!rawOtp) {
      setOtpError(true);
      showError(safeText(languages?.error_otp, "Please enter verification code"));
      return;
    }
    if (!rawPass) {
      setPasswordError(true);
      showError(safeText(languages?.error_password, "Please enter password"));
      return;
    }

    // index: 0 = Email, 1 = Mobile
    if (index === 0) {
      if (!validateEmail(rawUser)) {
        showError(checkValue(languages?.error_email));
        setUserNameError(true);
        return;
      }
    } else if (index === 1) {
      const digits = rawUser.replace(/\D/g, "").replace(/^0+/, "") || "";
      const fullPhone = `${countryCode?.[0] ? `+${countryCode[0]}` : "+91"}${digits}`;
      if (!isValidPhoneNumber(fullPhone)) {
        showError(checkValue(languages?.error_userName));
        setUserNameError(true);
        return;
      }
    }
    if (!validatePassword(password)) {
      showError(checkValue(languages?.error_passwordRegex));
      setPasswordError(true);
      return;
    }
    let data;
    if (index === 1) {
      const digits = rawUser.replace(/\D/g, "").replace(/^0+/, "") || "";
      data = {
        email_or_phone: `+${countryCode} ${digits}`,
        new_password: rawPass,
        verification_code: +rawOtp,
      };
    } else {
      data = {
        email_or_phone: rawUser,
        new_password: rawPass,
        verification_code: +rawOtp,
      };
    }
    dispatch(forgotPassword(data));
  };

  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background }}>
      <KeyBoardAware>
        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          <AuthHeader
            onSupportPress={() =>
              Linking.openURL("https://arabglobal.ae/TermsofUse").catch(() => { })
            }
            onClosePress={() => NavigationService.navigate(LOGIN_SCREEN)}
            title={""}
          />
        </View>
        <AppText
          weight={BOLD}
          type={TWENTY_FOUR}
          style={{ marginHorizontal: 20, marginTop: 16, color: themeColors.text }}
        >
          Forgot Password
        </AppText>
        <View style={{ marginTop: 16 }}>
          <AuthEmailPhoneTabBar
            tabs={["Email", "Phone"]}
            index={index}
            onChange={(i) => {
              setIndex(i);
              setUserName("");
              setOtp("");
              setPassword("");
              setUserNameError(false);
              setOtpError(false);
              setPasswordError(false);
              setEmailSuggestListVisible(false);
            }}
          />
        </View>
        <View style={authStyles.forgotContainer}>
          <View style={[authStyles.card, { marginTop: 16 }]}>
            <View style={authStyles.mobileContainer}>
              {index === 1 ? (
                <AuthPhoneInput
                  value={userName}
                  onChangeText={(text) => {
                    if (userNameError) setUserNameError(false);
                    setUserName(text);
                  }}
                  placeholder={checkValue(languages?.place_userName) || "Enter phone number"}
                  hasError={userNameError}
                  onSelectCountry={setCountryCode}
                  onCountry={setCountry}
                  country={country}
                  countryCode={countryCode}
                  maxLength={15}
                  onFocus={() => { }}
                  onBlur={() => { }}
                  onSubmitEditing={() => onGetOtp()}
                  onEndEditing={() => { }}

                />
              ) : (
                <View style={[authStyles.mobileContainer, styles.emailSuggestWrap]}>
                  <Input
                    placeholder={checkValue(languages?.place_email)}
                    value={userName}
                    onChangeText={(text) => {
                      if (userNameError) setUserNameError(false);
                      setUserName(text);
                    }}
                    keyboardType={"email-address"}
                    autoCapitalize="none"
                    returnKeyType="done"
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
                    onSubmitEditing={() => onGetOtp()}
                    hasError={userNameError}
                    mainContainer={[authStyles.mobileInput, styles.emailFieldMain]}
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
                            <AppText type={FOURTEEN} style={{ color: themeColors.text }}>
                              @{domain}
                            </AppText>
                          </TouchableOpacityView>
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>
              )}
            </View>
            <Input
              placeholder={checkValue(languages?.place_otp)}
              value={otp}
              onChangeText={(text) => {
                if (otpError) setOtpError(false);
                setOtp(text);
              }}
              keyboardType="numeric"
              autoCapitalize="none"
              returnKeyType="next"
              isOtp
              onSendOtp={onGetOtp}
              otpText={timer > 0 ? `Resend (${timer}s)` : "Get OTP"}
              isOtpDisabled={timer > 0}
              hasError={otpError}
            />
            <Input
              placeholder={checkValue(languages?.place_signUpPassword)}
              value={password}
              onChangeText={(text) => {
                if (passwordError) setPasswordError(false);
                setPassword(text);
              }}
              autoCapitalize="none"
              secureTextEntry={isPasswordVisible}
              returnKeyType="next"
              isSecure
              onPressVisible={() => setIsPasswordVisible(!isPasswordVisible)}
              hasError={passwordError}
            />

            <Button
              children={"Forgot Password"}
              onPress={() => onSubmit()}
              disabled={false}
              containerStyle={{ marginTop: 20 }}
            />
            <AppText
              weight={MEDIUM}
              style={[authStyles.bottomTextLogin, { color: themeColors.text, marginTop: 15, fontSize: 14 }]}
            >
              {"Back to "}
              <AppText
                weight={MEDIUM}
                type={FOURTEEN}
                style={[authStyles.termsText, { color: isDark ? colors.cyan : colors.cyan }]}
                onPress={() => onLogin()}
              >
                {checkValue(languages?.register_eight)}
              </AppText>
            </AppText>
          </View>
        </View>
      </KeyBoardAware>
      <SpinnerSecond />
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
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

export default ForgotPassword;
