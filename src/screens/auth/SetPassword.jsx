import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import FastImage from "react-native-fast-image";
import { useRoute } from "@react-navigation/native";

import {
  AppSafeAreaView,
  AppText,
  Button,
  FOURTEEN,
  FIFTEEN,
  Input,
  MEDIUM,
  BOLD,
  TWELVE,
} from "../../shared";
import TouchableOpacityView from "../../shared/components/TouchableOpacityView";
import NavigationService from "../../navigation/NavigationService";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { register, registerWithPhone } from "../../actions/authActions";
import { validatePasswordStrict } from "../../helper/utility";
import { useTheme } from "../../hooks/useTheme";
import {
  authBackIcon,
  authBellImg,
  setPasswordImg,
  arrowRightIcon,
  checkIc,
  closeIcon,
  minus,
} from "../../helper/ImageAssets";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";

const RuleItem = ({ state, label, doneColor, isDark }) => {
  const isOk = state === "ok";
  const isBad = state === "bad";
  const isPending = state === "pending";

  const textColor = isOk
    ? isDark
      ? colors.white
      : "#11142D"
    : isBad
      ? colors.red
      : "#9AA3AF";

  return (
    <View style={styles.ruleItem}>
      <View
        style={[
          styles.ruleDot,
          {
            borderColor: isOk ? null : isDark ? "#3A3D45" : "#B8BDC7",
            backgroundColor: isOk ? doneColor : "transparent",
          },
        ]}
      >
        {isOk ? (
          <FastImage
            source={checkIc}
            style={styles.ruleIconCheck}
            tintColor="#FFFFFF"
            resizeMode="contain"
          />
        ) : null}
        {isBad ? (
          <FastImage
            source={closeIcon}
            style={styles.ruleIconClose}
            tintColor={colors.red}
            resizeMode="contain"
          />
        ) : null}
        {isPending ? (
          <FastImage
            source={minus}
            style={styles.ruleIconMinus}
            tintColor="#9AA3AF"
            resizeMode="contain"
          />
        ) : null}
      </View>
      <AppText style={[styles.ruleText, { color: textColor }]}>
        {label}
      </AppText>
    </View>
  );
};

const SetPassword = () => {
  const route = useRoute();
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const showButtonLoading = useAppSelector(
    (state) => state.auth.isLoading && state.auth.loadingFor !== "otp"
  );
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(true);
  const [passwordError, setPasswordError] = useState(false);

  const params = route?.params || {};
  const {
    signupType = "email",
    signUpId = "",
    countryCode = ["91"],
    referCode = "",
  } = params;

  const usernamePart = useMemo(() => {
    if (signupType === "email") {
      const id = String(signUpId || "");
      return id.includes("@") ? id.split("@")[0] : id;
    }
    return String(signUpId || "");
  }, [signupType, signUpId]);

  const up = String(usernamePart || "").trim();

  const signupPasswordRules = useMemo(
    () => [
      {
        id: "notAllNumbers",
        label: "Cannot be all numbers",
        passes: (p) => p.length > 0 && !/^\d+$/.test(p),
        error: "Password cannot be only numbers.",
      },
      {
        id: "notAllLetters",
        label: "Cannot be all letters (case-sensitive)",
        passes: (p) => p.length > 0 && !/^[a-zA-Z]+$/.test(p),
        error: "Password cannot be only letters.",
      },
      {
        id: "minLength",
        label: "Minimum 8 characters required",
        passes: (p) => p.length >= 8,
        error: "Password must be at least 8 characters.",
      },
      {
        id: "notContainsUsername",
        label: "Cannot contain username",
        passes: (p) =>
          !up || up.length < 2 || !p.toLowerCase().includes(up.toLowerCase()),
        error: "Password cannot contain your email username or phone number.",
      },
      {
        id: "complexity",
        label: "Uppercase, lowercase, number, and a special character (#?!@$%^&*-)",
        passes: (p) => validatePasswordStrict(p),
        error:
          "Use at least 8 characters with uppercase, lowercase, a number, and a special character (#?!@$%^&*-).",
      },
    ],
    [up]
  );

  const passwordRuleRowStates = useMemo(() => {
    const p = String(password || "");
    if (!p.trim()) return signupPasswordRules.map(() => "idle");
    const results = signupPasswordRules.map((r) => r.passes(p));
    const firstFail = results.findIndex((ok) => !ok);
    if (firstFail === -1) return signupPasswordRules.map(() => "ok");
    return signupPasswordRules.map((_, i) => {
      if (i < firstFail) return "ok";
      if (i === firstFail) return "bad";
      return "pending";
    });
  }, [password, signupPasswordRules]);

  const isReady = useMemo(() => {
    const p = String(password || "");
    if (!p.trim()) return false;
    return signupPasswordRules.every((r) => r.passes(p));
  }, [password, signupPasswordRules]);

  const onSubmit = () => {
    if (!isReady) {
      return;
    }

    setPasswordError(false);

    if (signupType === "email") {
      dispatch(
        register(
          {
            email: String(signUpId).trim(),
            password,
            referral_code: referCode || "",
            token: "",
          },
          () => { },
          () => { },
          () => { }
        )
      );
      return;
    }

    dispatch(
      registerWithPhone(
        {
          country_code: countryCode?.[0] ? `+${countryCode[0]}` : "+91",
          phone: +signUpId,
          password,
          referral_code: referCode || "",
          token: "",
        },
        () => { },
        () => { },
        () => { }
      )
    );
  };

  const openSupport = () => {
    Linking.openURL("https://arabglobal.ae/help_center").catch(() => { });
  };

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

          {/* Illustration Shield Hero */}
          <View style={styles.illustrationContainer}>
            <FastImage
              source={setPasswordImg}
              style={styles.illustrationImage}
              resizeMode={FastImage.resizeMode.contain}
            />
          </View>

          {/* Title and Subtitle */}
          <View style={styles.textContainer}>
            <AppText style={styles.title}>Set Your Password</AppText>
            <AppText style={styles.subtitle}>
              Set the password to complete the signup
            </AppText>
          </View>

          {/* Password Input Section */}
          <View style={styles.inputContainer}>
            <AppText style={styles.inputLabel}>Password</AppText>
            <Input
              placeholder="Enter a password"
              value={password}
              onChangeText={(v) => {
                if (passwordError) setPasswordError(false);
                setPassword(v);
              }}
              secureTextEntry={isPasswordVisible}
              isSecure
              onPressVisible={() => setIsPasswordVisible(!isPasswordVisible)}
              autoCapitalize="none"
              hasError={passwordError}
              containerStyle={styles.inputField}
            />
          </View>

          {/* Password Rules */}
          <View style={styles.rulesContainer}>
            {signupPasswordRules.map((rule, idx) => (
              <RuleItem
                key={rule.id}
                state={passwordRuleRowStates[idx]}
                label={rule.label}
                doneColor={colors.cyan}
                isDark={isDark}
              />
            ))}
          </View>

          {/* Confirm Button */}
          <View style={styles.buttonWrapper}>
            <Button
              title="Confirm"
              disabled={!isReady || showButtonLoading}
              onPress={onSubmit}
              loading={showButtonLoading}
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
              containerStyle={styles.confirmButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingTop: 10,
  },
  headerIcon: {
    width: 38,
    height: 38,
  },
  illustrationContainer: {
    alignItems: "center",
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
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.darkShadeColorText || "#6A7282",
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  inputContainer: {
    marginTop: 20,
  },
  inputLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.white,
    marginBottom: 8,
  },
  inputField: {
    width: "100%",
  },
  rulesContainer: {
    marginTop: 14,
    marginBottom: 10,
    gap: 8,
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  ruleDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  ruleIconCheck: {
    width: 8,
    height: 8,
  },
  ruleIconClose: {
    width: 7,
    height: 7,
  },
  ruleIconMinus: {
    width: 10,
    height: 10,
  },
  ruleText: {
    marginLeft: 10,
    fontFamily: fonts.medium,
    fontSize: 12,
    flex: 1,
  },
  buttonWrapper: {
    alignItems: "center",
    width: "100%",
    marginTop: 18,
  },
  confirmButton: {
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
});

export default SetPassword;
