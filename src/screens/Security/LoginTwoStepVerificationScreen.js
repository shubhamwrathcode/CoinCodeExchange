import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useTheme } from "../../hooks/useTheme";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { updateTwoLogin2StepStatus } from "../../actions/accountActions";
import {
  AppSafeAreaView,
  AppText,
  SEMI_BOLD,
  BOLD,
  EIGHTEEN,
  SIXTEEN,
  FOURTEEN,
  MEDIUM,
} from '../../shared';
import FastImage from 'react-native-fast-image';
import { back_ic } from '../../helper/ImageAssets';
import { appOperation } from '../../appOperation';
import * as routes from '../../navigation/routes';
import Toast from "react-native-simple-toast";

// --- Normalization Helpers to align with Web TwofactorPage/index.js ---
const truthyFlag = (v) => {
  if (v === true || v === 1) return true;
  if (v === false || v === 0 || v == null) return false;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes" || s === "on") return true;
    if (s === "false" || s === "0" || s === "no" || s === "off" || s === "") return false;
  }
  return Boolean(v);
};

const firstTruthyKey = (obj, keys) => {
  if (!obj || typeof obj !== "object") return false;
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined && obj[k] !== null) {
      if (truthyFlag(obj[k])) return true;
    }
  }
  return false;
};

const normMethodToken = (x) => String(x ?? "").toLowerCase().replace(/[-_\s]+/g, "");

const parseEnabledMethodsArray = (arr) => {
  if (!Array.isArray(arr) || !arr.length) return null;
  const tokens = arr.map((x) => (typeof x === "string" ? normMethodToken(x) : normMethodToken(x?.method || x?.name || x)));
  return {
    totp: tokens.some((a) => a === "totp" || a === "topt" || a === "ga" || a.includes("google") || a.includes("authenticator")),
    email: tokens.some((a) => a === "email" || a === "mail" || a.includes("email") || a === "e-mail"),
    mobile: tokens.some((a) => a === "mobile" || a === "sms" || a === "phone" || a.includes("sms") || a.includes("phone")),
  };
};

const flattenOneLevelLogin2Step = (d) => {
  if (!d || typeof d !== "object") return {};
  const nestKeys = [
    "data",
    "login2Step",
    "login2_step",
    "loginTwoStep",
    "login_two_step",
    "loginStep",
    "settings",
    "two_fa",
    "twoFA",
  ];
  let out = { ...d };
  for (const nk of nestKeys) {
    const inner = d[nk];
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      out = { ...out, ...inner };
    }
  }
  return out;
};

const normalizeCheckTwoLogin2StepPayload = (raw) => {
  if (!raw) return { totp: false, email: false, mobile: false };
  let d = raw;
  if (d && typeof d === "object" && d.data && typeof d.data === "object") {
    const inner = d.data;
    if (
      Object.prototype.hasOwnProperty.call(inner, "totp") ||
      Object.prototype.hasOwnProperty.call(inner, "TOTP") ||
      Object.prototype.hasOwnProperty.call(inner, "email") ||
      Object.prototype.hasOwnProperty.call(inner, "mobile")
    ) {
      d = inner;
    }
  }
  const dPreFlatten = d;
  d = flattenOneLevelLogin2Step(d);

  const reapplyTop = [
    ["totp", "totp"],
    ["TOTP", "totp"],
    ["email", "email"],
    ["mobile", "mobile"],
    ["sms", "mobile"],
    ["phone", "mobile"],
  ];
  for (const [from, to] of reapplyTop) {
    if (dPreFlatten && typeof dPreFlatten === "object" && Object.prototype.hasOwnProperty.call(dPreFlatten, from)) {
      d[to] = dPreFlatten[from];
    }
  }
  if (!d || typeof d !== "object") return { totp: false, email: false, mobile: false };

  const fromArrayKeys = [
    "enabledMethods",
    "methods",
    "activeMethods",
    "loginMethods",
    "twoFactorMethods",
    "two_step_methods",
    "enabled_2fa",
  ];
  let fromArr = null;
  for (const k of fromArrayKeys) {
    if (d[k] != null) {
      fromArr = parseEnabledMethodsArray(d[k]);
      if (fromArr) break;
    }
  }

  const fromKeys = {
    totp: firstTruthyKey(d, ["totp", "TOTP", "google_authenticator", "googleAuthenticator", "isTotp", "totp_enabled"]),
    email: firstTruthyKey(d, ["email", "emailVerification", "isEmail", "email_enabled", "is_email"]),
    mobile: firstTruthyKey(d, ["mobile", "sms", "phone", "smsVerification", "isPhone", "phone_verification", "is_phone"]),
  };
  if (!fromArr) {
    return {
      totp: !!fromKeys.totp,
      email: !!fromKeys.email,
      mobile: !!fromKeys.mobile,
    };
  }

  const explicit = {
    totp: Object.prototype.hasOwnProperty.call(dPreFlatten, "totp") || Object.prototype.hasOwnProperty.call(dPreFlatten, "TOTP"),
    email: Object.prototype.hasOwnProperty.call(dPreFlatten, "email"),
    mobile: ["mobile", "sms", "phone"].some((k) => Object.prototype.hasOwnProperty.call(dPreFlatten, k)),
  };
  return {
    totp: explicit.totp ? !!fromKeys.totp : !!fromKeys.totp || fromArr.totp,
    email: explicit.email ? !!fromKeys.email : !!fromKeys.email || fromArr.email,
    mobile: explicit.mobile ? !!fromKeys.mobile : !!fromKeys.mobile || fromArr.mobile,
  };
};

const ToggleSwitch = ({ value, onValueChange, isDark }) => {
  const animatedValue = React.useRef(new Animated.Value(value ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [value]);

  const thumbPosition = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onValueChange(!value)}
      style={[
        styles.customSwitchTrack,
        {
          backgroundColor: value
            ? (isDark ? '#FFFFFF' : '#2A2A2E')
            : (isDark ? '#2A2A2E' : '#E5E5EA'),
        }
      ]}
    >
      <Animated.View
        style={[
          styles.customSwitchThumb,
          {
            left: thumbPosition,
            backgroundColor: value
              ? (isDark ? '#000000' : '#FFFFFF')
              : (isDark ? '#8A8A93' : '#FFFFFF'),
          }
        ]}
      />
    </TouchableOpacity>
  );
};

const LoginTwoStepVerificationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const userData = useAppSelector((state) => state.auth.userData);

  // Settings states normalized
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [googleAuth, setGoogleAuth] = useState(false);
  const [smsVerification, setSmsVerification] = useState(false);
  const [emailVerification, setEmailVerification] = useState(false);

  // Bind prompt state
  const [bindPrompt, setBindPrompt] = useState({
    visible: false,
    title: '',
    description: '',
    onBind: null
  });



  // Theme-aware styles
  const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const subTextColor = isDark ? '#8A8A93' : '#8E8E93';
  const primaryColor = themeColors.button || '#F0B90B';

  const syncSettings = async () => {
    try {
      setLoadingSettings(true);
      const res = await appOperation.customer.securityCheckTwoLogin2Step();
      if (res?.success) {
        const n = normalizeCheckTwoLogin2StepPayload(res);
        setGoogleAuth(n.totp);
        setSmsVerification(n.mobile);
        setEmailVerification(n.email);
      }
    } catch (e) {
      console.error('[Login2Step] syncSettings error:', e);
      // silent fallback
    } finally {
      setLoadingSettings(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      syncSettings();
    }, [])
  );

  useEffect(() => {
    const processPendingAction = async () => {
      const params = route?.params || {};
      const { pendingAction, emailOtp, smsOtp, tofaCode, passkeyUserId } = params;

      if (pendingAction && (emailOtp || smsOtp || tofaCode || passkeyUserId)) {
        // Find which OTP was provided
        let code = '';
        if (passkeyUserId) code = passkeyUserId;
        else if (tofaCode) code = tofaCode;
        else if (smsOtp) code = smsOtp;
        else if (emailOtp) code = emailOtp;

        if (code) {
          const payload = {
            security_methods: pendingAction.method,
            action: pendingAction.action,
          };
          if (passkeyUserId) {
            payload.passkeyUserId = code;
          } else {
            payload.code = code;
          }

          const success = await dispatch(updateTwoLogin2StepStatus(payload));
          if (success) {
            // refresh
            syncSettings();
          }

          // clear params to avoid infinite loop
          navigation.setParams({
            pendingAction: undefined,
            emailOtp: undefined,
            smsOtp: undefined,
            tofaCode: undefined,
            passkeyUserId: undefined,
          });
        }
      }
    };
    processPendingAction();
  }, [route?.params]);

  const handleToggleSwitch = async (method, enable) => {
    // 1. Lockout protection and Signup Method restriction
    if (!enable) {
      if (method === 'email' && (userData?.registeredBy === 'email' || userData?.registeredBy === 'google')) {
        Toast.showWithGravity("you cannot modify email as it is your signup method", Toast.LONG, Toast.BOTTOM);
        return;
      }
      if (method === 'phone' && (userData?.registeredBy === 'phone' || userData?.registeredBy === 'mobile')) {
        Toast.showWithGravity("you cannot modify phone as it is your signup method", Toast.LONG, Toast.BOTTOM);
        return;
      }
      const activeCount = [
        method !== 'totp' && googleAuth,
        method !== 'phone' && smsVerification,
        method !== 'email' && emailVerification
      ].filter(Boolean).length;

      if (activeCount === 0) {
        Toast.showWithGravity(
          "At least one verification method must remain enabled for login protection.",
          Toast.LONG,
          Toast.BOTTOM
        );
        return;
      }
    }

    // 2. Unbound state redirects (with Bind Prompt):
    if (method === 'phone' && enable) {
      const isPhoneBound = !!(userData?.mobileNumber || userData?.mobile_number);
      if (!isPhoneBound) {
        setBindPrompt({
          visible: true,
          title: 'Phone Unbound',
          description: 'Phone verification is available only after the phone is bound.',
          onBind: () => {
            setBindPrompt(prev => ({ ...prev, visible: false }));
            const hasGA = Number(userData?.['2fa'] || 0) === 2 || userData?.twoFaEnabled === true;
            const hasEmail = !!(userData?.emailId || userData?.email);
            const methods = [];
            if (hasEmail) methods.push('email');
            if (hasGA) methods.push('totp');
            if (methods.length === 0) methods.push('email');

            navigation.navigate(routes.PASSKEY_SECURITY_VERIFICATION_SCREEN, {
              targetScreen: routes.CHANGE_PHONE_NUMBER_SCREEN,
              purpose: 'change_mobile',
              verifyMethods: methods,
              skipDirectVerification: true,
              hideChooseOther: true,
              targetParams: {
                fromScreen: routes.LOGIN_TWO_STEP_VERIFICATION_SCREEN,
              }
            });
          }
        });
        return;
      }
    }

    if (method === 'totp' && enable) {
      const hasGA = Number(userData?.['2fa'] || 0) === 2 || userData?.twoFaEnabled === true;
      if (!hasGA) {
        setBindPrompt({
          visible: true,
          title: 'Bind Google Authenticator',
          description: 'Please bind Google Authenticator first to enable this verification method.',
          onBind: () => {
            setBindPrompt(prev => ({ ...prev, visible: false }));
            const hasEmail = !!(userData?.emailId || userData?.email);
            const hasMobile = !!(userData?.mobileNumber || userData?.mobile_number);
            const methods = [];
            if (hasEmail) methods.push('email');
            if (hasMobile) methods.push('mobile');
            if (methods.length === 0) methods.push('email');

            navigation.navigate(routes.PASSKEY_SECURITY_VERIFICATION_SCREEN, {
              targetScreen: routes.PASSKEY_SETUP_AUTHENTICATOR_SCREEN,
              purpose: '2fa_setup',
              verifyMethods: methods,
              skipDirectVerification: false,
              hideChooseOther: true,
              targetParams: {
                fromScreen: routes.LOGIN_TWO_STEP_VERIFICATION_SCREEN,
              }
            });
          }
        });
        return;
      }
    }

    if (method === 'email' && enable) {
      const isEmailBound = !!(userData?.emailId || userData?.email);
      if (!isEmailBound) {
        setBindPrompt({
          visible: true,
          title: 'Email Unbound',
          description: 'Email verification is available only after the email is bound.',
          onBind: () => {
            setBindPrompt(prev => ({ ...prev, visible: false }));
            // Normally routes to change email flow
            navigation.navigate(routes.PASSKEY_SECURITY_VERIFICATION_SCREEN, {
              targetScreen: routes.CHANGE_EMAIL_SCREEN,
              purpose: 'change_email',
              verifyMethods: ['mobile', 'totp'],
              skipDirectVerification: true,
              hideChooseOther: true,
              targetParams: {
                fromScreen: routes.LOGIN_TWO_STEP_VERIFICATION_SCREEN,
              }
            });
          }
        });
        return;
      }
    }

    // 3. Navigate to verification screen with target codes skipping direct verification
    const verifyMethods =
      method === 'email' ? ['email'] :
        method === 'phone' ? ['mobile'] :
          method === 'totp' ? ['totp'] : [];

    if (verifyMethods.length > 0) {
      navigation.navigate(routes.PASSKEY_SECURITY_VERIFICATION_SCREEN, {
        targetScreen: routes.LOGIN_TWO_STEP_VERIFICATION_SCREEN,
        purpose: 'login_2step_verification',
        verifyMethods: verifyMethods,
        skipDirectVerification: false,
        hideChooseOther: true,
        targetParams: {
          pendingAction: { method, action: enable ? 'enable' : 'disable' }
        }
      });
    }
  };



  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background, flex: 1 }}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <FastImage
              source={back_ic}
              style={styles.backIcon}
              tintColor={textColor}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <AppText weight={SEMI_BOLD} type={EIGHTEEN} style={[styles.headerTitle, { color: textColor }]}>
              Login 2-Step Verification
            </AppText>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {loadingSettings ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={primaryColor} />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Google Authenticator Switch Row */}
            <View style={styles.switchRow}>
              <AppText type={SIXTEEN} weight={MEDIUM} style={{ color: textColor }}>
                Google Authenticator
              </AppText>
              <ToggleSwitch
                value={googleAuth}
                onValueChange={(val) => handleToggleSwitch('totp', val)}
                isDark={isDark}
              />
            </View>

            {/* SMS Verification Switch Row */}
            <View style={styles.switchRow}>
              <AppText type={SIXTEEN} weight={MEDIUM} style={{ color: textColor }}>
                SMS verification
              </AppText>
              <ToggleSwitch
                value={smsVerification}
                onValueChange={(val) => handleToggleSwitch('phone', val)}
                isDark={isDark}
              />
            </View>

            {/* Email Verification Switch Row */}
            <View style={styles.switchRow}>
              <AppText type={SIXTEEN} weight={MEDIUM} style={{ color: textColor }}>
                Email verification
              </AppText>
              <ToggleSwitch
                value={emailVerification}
                onValueChange={(val) => handleToggleSwitch('email', val)}
                isDark={isDark}
              />
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* Bind Prompt Modal */}
      <Modal
        visible={bindPrompt.visible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setBindPrompt(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setBindPrompt(prev => ({ ...prev, visible: false }))}
          />
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            <AppText type={EIGHTEEN} weight={BOLD} style={{ color: textColor, marginBottom: 12, textAlign: 'center' }}>
              {bindPrompt.title}
            </AppText>
            <AppText type={FOURTEEN} style={{ color: subTextColor, marginBottom: 24, textAlign: 'center', lineHeight: 20 }}>
              {bindPrompt.description}
            </AppText>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: isDark ? '#2A2A2E' : '#F5F5F5' }]}
                onPress={() => setBindPrompt(prev => ({ ...prev, visible: false }))}
              >
                <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: textColor }}>
                  Cancel
                </AppText>
              </TouchableOpacity>
              <View style={{ width: 12 }} />
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: primaryColor }]}
                onPress={bindPrompt.onBind}
              >
                <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: '#FFFFFF' }}>
                  Bind Now
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </AppSafeAreaView>
  );
};

export default LoginTwoStepVerificationScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 48,
    marginVertical: 4,
  },
  customSwitchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    position: 'relative',
    justifyContent: 'center',
  },
  customSwitchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1.5,
    elevation: 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center',
  },
  modalBtnRow: {
    flexDirection: 'row',
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

});

