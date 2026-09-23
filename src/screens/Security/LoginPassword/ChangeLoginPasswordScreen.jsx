import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  Keyboard,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import NavigationService from '../../../navigation/NavigationService';
import FastImage from 'react-native-fast-image';
import {
  AppSafeAreaView,
  AppText,
  SIXTEEN,
  SEMI_BOLD,
  EIGHTEEN,
  MEDIUM,
  FOURTEEN,
  TWELVE,
  Input,
  BOLD,
  TWENTY_TWO,
  THIRTEEN,
} from '../../../shared';
import { back_ic, checkIc, account_restrictions, pasteImg, closeIcon, minus, security_risk_vector_light } from '../../../helper/ImageAssets';
import { validatePasswordStrict } from '../../../helper/utility';
import { colors } from '../../../theme/colors';
import * as routes from '../../../navigation/routes';
import { appOperation } from '../../../appOperation';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { sendSecurityOtp, verifySecurityOtp, verifySecurityTotp, verifySecurityPasskey } from '../../../actions/accountActions';
import { showError, showSuccess } from '../../../helper/logger';
import { VerificationOptionsSheet } from '../../../common/VerificationOptionsSheet';
import { AuthEmailPhoneTabBar, AuthPhoneInput } from '../../../shared/components';

const RuleItem = ({ state, label, doneColor }) => {
  const isOk = state === "ok";
  const isBad = state === "bad";
  const isPending = state === "pending";
  return (
    <View style={styles.ruleRow}>
      <View
        style={[
          styles.ruleDot,
          {
            borderColor: isOk ? null : "#B8BDC7",
            backgroundColor: isOk ? doneColor : "transparent",
          },
        ]}
      >
        {isOk ? (
          <FastImage source={checkIc} style={{ width: 8, height: 8 }} tintColor="#FFFFFF" resizeMode="contain" />
        ) : null}
        {isBad ? <FastImage source={closeIcon} style={{ width: 7, height: 7 }} resizeMode="contain" /> : null}
        {isPending ? <FastImage source={minus} style={{ width: 35, height: 35 }} resizeMode="contain" /> : null}
      </View>
      <AppText type={TWELVE} style={{ color: "#9AA3AF" }}>
        {label}
      </AppText>
    </View>
  );
};

const ChangeLoginPasswordScreen = () => {
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();

  // Step state: 1 = Restrict warning, 2 = 2FA OTP/Totp Verify, 3 = Password Input Form
  const [step, setStep] = useState(1);

  // Redux & user states
  const userData = useAppSelector((state) => state.auth.userData);
  const emailId = userData?.emailId || userData?.email || '';
  const profileMobile = userData?.mobileNumber || userData?.mobile_number || '';
  const hasEmail = !!emailId;
  const hasMobile = !!profileMobile;
  const hasGoogleAuth = (userData?.['2fa'] || 0) === 2 || userData?.twoFaEnabled === true;

  // Resolved Verification methods
  const [availableMethods, setAvailableMethods] = useState([]);
  const [verifyMethod, setVerifyMethod] = useState(''); // 'totp' | 'email' | 'mobile'

  // Input states for verification code
  const [emailCode, setEmailCode] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [totpCode, setTotpCode] = useState('');

  // Password fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Inline Forgot Password / Reset states
  const [forgotIndex, setForgotIndex] = useState(0); // 0 = Email, 1 = Phone
  const [resetEmail, setResetEmail] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [resetCountryCode, setResetCountryCode] = useState(['91']);
  const [resetCountry, setResetCountry] = useState('IN');
  const [resetOtp, setResetOtp] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [showNewResetPass, setShowNewResetPass] = useState(false);
  const [showConfirmResetPass, setShowConfirmResetPass] = useState(false);
  const [resetOtpCountdown, setResetOtpCountdown] = useState(0);

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [smsCountdown, setSmsCountdown] = useState(0);
  const [emailCountdown, setEmailCountdown] = useState(0);

  const sheetRef = useRef(null);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Countdown timers
  useEffect(() => {
    if (smsCountdown <= 0) return undefined;
    const t = setTimeout(() => setSmsCountdown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [smsCountdown]);

  useEffect(() => {
    if (emailCountdown <= 0) return undefined;
    const t = setTimeout(() => setEmailCountdown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [emailCountdown]);

  useEffect(() => {
    if (resetOtpCountdown <= 0) return undefined;
    const t = setTimeout(() => setResetOtpCountdown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resetOtpCountdown]);

  // Masking helpers
  const maskEmail = (email) => {
    if (!email) return '';
    const [u, d] = String(email).split('@');
    if (!d) return email;
    if (u.length <= 2) return `${u[0]}***@${d}`;
    return `${u.slice(0, 2)}***${u.slice(-1)}@${d}`;
  };

  const maskPhone = (phone) => {
    if (!phone) return '';
    const cleaned = String(phone).replace(/\s/g, '');
    if (cleaned.length < 4) return '***';
    return `${cleaned.slice(0, 3)}*****${cleaned.slice(-2)}`;
  };

  const displayEmail = useMemo(() => maskEmail(emailId), [emailId]);
  const displayPhone = useMemo(() => maskPhone(profileMobile), [profileMobile]);

  // Available options for RBSheet selector
  const availableOptions = useMemo(() => {
    const list = [];
    if (availableMethods.includes('passkey')) {
      list.push({
        value: 'passkey',
        label: 'Passkey',
        description: 'Verify using Face ID, Touch ID, or device lock',
      });
    }
    if (availableMethods.includes('email') && emailId) {
      list.push({
        value: 'email',
        label: 'Email Verification',
        description: `Verify using code sent to ${displayEmail}`,
      });
    }
    if (availableMethods.includes('mobile') && profileMobile) {
      list.push({
        value: 'mobile',
        label: 'Phone Verification',
        description: `Verify using code sent to ${displayPhone}`,
      });
    }
    if (availableMethods.includes('totp') && hasGoogleAuth) {
      list.push({
        value: 'totp',
        label: 'Google Authenticator',
        description: 'Verify using your Google Authenticator 2FA code',
      });
    }
    return list;
  }, [availableMethods, emailId, profileMobile, hasGoogleAuth, displayEmail, displayPhone]);

  // Validation checks for password rule display (same as SetPassword / ChangePassword)
  const usernamePart = useMemo(() => {
    const id = String(emailId || profileMobile || "");
    return id.includes("@") ? id.split("@")[0] : id;
  }, [emailId, profileMobile]);

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
        passes: (p) => !up || up.length < 2 || !p.toLowerCase().includes(up.toLowerCase()),
        error: "Password cannot contain your email username or phone number.",
      },
      {
        id: "complexity",
        label: "Uppercase, lowercase, number, and a special character (#?!@$%^&*-)",
        passes: (p) => validatePasswordStrict(p),
        error: "Use at least 8 characters with uppercase, lowercase, a number, and a special character (#?!@$%^&*-).",
      },
    ],
    [up]
  );

  const passwordRuleRowStates = useMemo(() => {
    const p = String(newPassword || "");
    if (!p.trim()) return signupPasswordRules.map(() => "idle");
    const results = signupPasswordRules.map((r) => r.passes(p));
    const firstFail = results.findIndex((ok) => !ok);
    if (firstFail === -1) return signupPasswordRules.map(() => "ok");
    return signupPasswordRules.map((_, i) => {
      if (i < firstFail) return "ok";
      if (i === firstFail) return "bad";
      return "pending";
    });
  }, [newPassword, signupPasswordRules]);

  const allSatisfied = useMemo(() => {
    const p = String(newPassword || "");
    if (!p.trim()) return false;
    return signupPasswordRules.every((r) => r.passes(p));
  }, [newPassword, signupPasswordRules]);

  const resetPasswordRuleRowStates = useMemo(() => {
    const p = String(newResetPassword || "");
    if (!p.trim()) return signupPasswordRules.map(() => "idle");
    const results = signupPasswordRules.map((r) => r.passes(p));
    const firstFail = results.findIndex((ok) => !ok);
    if (firstFail === -1) return signupPasswordRules.map(() => "ok");
    return signupPasswordRules.map((_, i) => {
      if (i < firstFail) return "ok";
      if (i === firstFail) return "bad";
      return "pending";
    });
  }, [newResetPassword, signupPasswordRules]);

  const resetAllSatisfied = useMemo(() => {
    const p = String(newResetPassword || "");
    if (!p.trim()) return false;
    return signupPasswordRules.every((r) => r.passes(p));
  }, [newResetPassword, signupPasswordRules]);

  // Actions
  const handleRestrictConfirm = async () => {
    setIsSubmitting(true);
    try {
      const resMethods = await appOperation.customer.get_security_methods_list();
      if (resMethods?.success) {
        const raw =
          resMethods?.data?.security_methods ||
          resMethods?.data?.data?.security_methods ||
          resMethods?.security_methods ||
          resMethods?.data?.securityMethods ||
          {};
        const methodsObj = {
          email: !!raw.email,
          mobile: !!(raw.mobile ?? raw.phone ?? raw.sms),
          totp: !!raw.totp,
          passkey: !!raw.passkey,
        };

        const priority = ['passkey', 'totp', 'email', 'mobile'];
        const activeList = priority.filter(k => methodsObj[k]);

        if (activeList.length === 0) {
          showError("Please enable a verification method first.");
          setIsSubmitting(false);
          return;
        }

        setAvailableMethods(activeList);
        const firstMethod = activeList[0];
        setVerifyMethod(firstMethod);

        if (firstMethod === 'passkey') {
          const signId = emailId || profileMobile;
          if (!signId) {
            showError('Account identifier missing for passkey verification.');
            setIsSubmitting(false);
            return;
          }
          const passkeyUserId = await dispatch(verifySecurityPasskey(signId));
          if (passkeyUserId) {
            showSuccess('Passkey verified successfully');
            setStep(3);
          } else {
            // Fallback to next highest priority method
            const activeFallback = activeList.filter(k => k !== 'passkey');
            if (activeFallback.length === 0) {
              showError("No supported fallback verification method found.");
              setIsSubmitting(false);
              return;
            }
            const fallbackMethod = activeFallback[0];
            setVerifyMethod(fallbackMethod);
            if (fallbackMethod === 'email' || fallbackMethod === 'mobile') {
              const channel = fallbackMethod === 'mobile' ? 'mobile' : 'email';
              const ok = await dispatch(sendSecurityOtp(channel, 'change_password'));
              if (ok) {
                if (channel === 'mobile') setSmsCountdown(60);
                else setEmailCountdown(60);
                setStep(2);
              }
            } else {
              setStep(2);
            }
          }
        } else if (firstMethod === 'email' || firstMethod === 'mobile') {
          const channel = firstMethod === 'mobile' ? 'mobile' : 'email';
          const ok = await dispatch(sendSecurityOtp(channel, 'change_password'));
          if (ok) {
            if (channel === 'mobile') setSmsCountdown(60);
            else setEmailCountdown(60);
            setStep(2);
          }
        } else {
          setStep(2);
        }
      } else {
        showError(resMethods?.message || "Could not fetch verification methods");
      }
    } catch (err) {
      showError(err?.response?.data?.message || err?.message || "Error fetching verification methods");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (verifyMethod === 'email' && emailCountdown > 0) return;
    if (verifyMethod === 'mobile' && smsCountdown > 0) return;

    const channel = verifyMethod === 'mobile' ? 'mobile' : 'email';
    const ok = await dispatch(sendSecurityOtp(channel, 'change_password'));
    if (ok) {
      if (channel === 'mobile') setSmsCountdown(60);
      else setEmailCountdown(60);
      showSuccess('Verification code resent');
    }
  };

  const handlePasteCode = async (setter) => {
    try {
      const Clipboard = require('@react-native-clipboard/clipboard').default;
      const text = await Clipboard.getString();
      if (text) {
        setter(text.replace(/\D/g, '').slice(0, 6));
      }
    } catch (e) {
      // silent
    }
  };

  const handleVerifyCode = async () => {
    Keyboard.dismiss();
    if (verifyMethod === 'email' && (!emailCode || emailCode.length !== 6)) {
      showError('Please enter the 6-digit email code');
      return;
    }
    if (verifyMethod === 'mobile' && (!smsCode || smsCode.length !== 6)) {
      showError('Please enter the 6-digit SMS code');
      return;
    }
    if (verifyMethod === 'totp' && (!totpCode || totpCode.length !== 6)) {
      showError('Please enter the 6-digit Google Authenticator code');
      return;
    }

    setIsSubmitting(true);
    try {
      if (verifyMethod === 'email') {
        const ok = await dispatch(verifySecurityOtp('email', emailCode, 'change_password'));
        if (ok) {
          showSuccess('Verification successful');
          setStep(3);
        }
      } else if (verifyMethod === 'mobile') {
        const ok = await dispatch(verifySecurityOtp('mobile', smsCode, 'change_password'));
        if (ok) {
          showSuccess('Verification successful');
          setStep(3);
        }
      } else if (verifyMethod === 'totp') {
        const ok = await dispatch(verifySecurityTotp(totpCode, 'change_password'));
        if (ok) {
          showSuccess('Verification successful');
          setStep(3);
        }
      } else if (verifyMethod === 'passkey') {
        const signId = emailId || profileMobile;
        if (!signId) {
          showError('Account identifier missing for passkey verification.');
          setIsSubmitting(false);
          return;
        }
        const passkeyUserId = await dispatch(verifySecurityPasskey(signId));
        if (passkeyUserId) {
          showSuccess('Passkey verified successfully');
          setStep(3);
        }
      }
    } catch (err) {
      showError(err?.response?.data?.message || err?.message || 'Verification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetNext = async () => {
    Keyboard.dismiss();
    const isPhone = forgotIndex === 1;
    const rawVal = isPhone ? resetPhone.trim() : resetEmail.trim();

    if (!rawVal) {
      showError(isPhone ? 'Please enter phone number' : 'Please enter email address');
      return;
    }

    if (!isPhone && !rawVal.includes('@')) {
      showError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        email_or_phone: isPhone ? `${resetCountryCode[0] ? `+${resetCountryCode[0]}` : "+91"}${rawVal}` : rawVal,
        resend: true,
        type: 'forgot',
      };

      const response = await appOperation.guest.forgot_otp(payload);
      if (response?.success) {
        showSuccess(response?.message || 'Verification code sent');
        setResetOtpCountdown(60);
        setStep(5);
      } else {
        showError(response?.message || 'Could not send verification code');
      }
    } catch (err) {
      showError(err?.response?.data?.message || err?.message || 'Verification code failed to send');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetResendOtp = async () => {
    if (resetOtpCountdown > 0) return;
    const isPhone = forgotIndex === 1;
    const rawVal = isPhone ? resetPhone.trim() : resetEmail.trim();
    try {
      const payload = {
        email_or_phone: isPhone ? `${resetCountryCode[0] ? `+${resetCountryCode[0]}` : "+91"}${rawVal}` : rawVal,
        resend: true,
        type: 'forgot',
      };
      const response = await appOperation.guest.forgot_otp(payload);
      if (response?.success) {
        showSuccess(response?.message || 'Verification code resent');
        setResetOtpCountdown(60);
      } else {
        showError(response?.message || 'Could not send verification code');
      }
    } catch (err) {
      showError(err?.response?.data?.message || err?.message || 'Could not send verification code');
    }
  };

  const handleResetVerifyNext = () => {
    if (!resetOtp || resetOtp.length !== 6) {
      showError('Please enter a 6-digit verification code');
      return;
    }
    setStep(6);
  };

  const handleResetPasswordSubmit = async () => {
    Keyboard.dismiss();
    const isPhone = forgotIndex === 1;
    const rawVal = isPhone ? resetPhone.trim() : resetEmail.trim();

    if (!newResetPassword.trim()) {
      showError('Please enter your new password');
      return;
    }

    if (!resetAllSatisfied) {
      showError('New password does not meet requirements');
      return;
    }

    if (newResetPassword !== confirmResetPassword) {
      showError('Confirm password does not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        email_or_phone: isPhone ? `${resetCountryCode[0] ? `+${resetCountryCode[0]}` : "+91"}${rawVal}` : rawVal,
        new_password: newResetPassword.trim(),
        verification_code: parseInt(resetOtp, 10),
      };

      const response = await appOperation.guest.forgot(payload);
      if (response?.success) {
        showSuccess(response?.message || 'Password reset successfully');
        setResetEmail('');
        setResetPhone('');
        setResetOtp('');
        setNewResetPassword('');
        setConfirmResetPassword('');
        setStep(3);
      } else {
        showError(response?.message || 'Failed to reset password');
      }
    } catch (err) {
      showError(err?.response?.data?.message || err?.message || 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePasswordSubmit = async () => {
    Keyboard.dismiss();
    if (!oldPassword.trim()) {
      showError('Please enter old password');
      return;
    }
    if (!newPassword.trim()) {
      showError('Please enter new password');
      return;
    }
    if (!allSatisfied) {
      showError('Password does not meet validation criteria');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('Confirm password does not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await appOperation.customer.security_change_password({
        oldPassword: oldPassword.trim(),
        newPassword: newPassword.trim(),
        confirmNewPassword: confirmPassword.trim(),
      });
      if (res?.success) {
        showSuccess(res?.message || 'Password changed successfully');
        NavigationService.goBack();
      } else {
        showError(res?.message || 'Could not change password');
      }
    } catch (err) {
      showError(err?.response?.data?.message || err?.message || 'Could not change password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectMethod = async (val) => {
    sheetRef.current?.close();
    setEmailCode('');
    setSmsCode('');
    setTotpCode('');

    if (val === 'passkey') {
      const signId = emailId || profileMobile;
      if (!signId) {
        showError('Account identifier missing for passkey verification.');
        return;
      }
      setVerifyMethod('passkey');
      setIsSubmitting(true);
      try {
        const passkeyUserId = await dispatch(verifySecurityPasskey(signId));
        if (passkeyUserId) {
          showSuccess('Passkey verified successfully');
          setStep(3);
        }
      } catch (err) {
        showError('Passkey verification failed');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setVerifyMethod(val);

    if (val === 'email' || val === 'mobile') {
      const channel = val === 'mobile' ? 'mobile' : 'email';
      const ok = await dispatch(sendSecurityOtp(channel, 'change_password'));
      if (ok) {
        if (channel === 'mobile') setSmsCountdown(60);
        else setEmailCountdown(60);
      }
    }
  };

  const handleForgotPassword = () => {
    setStep(4);
  };


  return (
    <AppSafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => {
            if (step === 3) {
              setStep(2);
            } else if (step === 2) {
              setStep(1);
            } else if (step === 4) {
              setStep(3);
            } else if (step === 5) {
              setStep(4);
            } else if (step === 6) {
              setStep(5);
            } else {
              NavigationService.goBack();
            }
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <FastImage
            source={back_ic}
            style={{ width: 35, height: 35 }}
            resizeMode='contain'
          />
        </TouchableOpacity>

        <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={[styles.headerTitle, { color: themeColors.text }]}>
          {step >= 4 ? 'Reset Your Password' : 'Change Login Password'}
        </AppText>
        <View style={{ width: 24 }} />
      </View>

      {/* Content ScrollView */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <View style={styles.stepOneContainer}>
            <FastImage
              source={isDark ? security_risk_vector_light : account_restrictions}
              style={styles.illustration}
              resizeMode="contain"
            />
            <AppText
              type={EIGHTEEN}
              weight={BOLD}
              style={[styles.stepOneTitle, { color: themeColors.text }]}
            >
              Account Restrictions
            </AppText>
            <AppText
              type={FOURTEEN}
              weight={MEDIUM}
              style={[styles.stepOneDesc, { color: isDark ? '#A9A9B2' : '#6E6E73' }]}
            >
              For the security of your account, withdrawals will be temporarily locked for 24 hours after a password change.
            </AppText>
          </View>
        )}

        {step === 2 && (
          <View style={styles.verificationContainer}>
            <AppText type={TWENTY_TWO} weight={SEMI_BOLD} style={[styles.mainTitle, { color: themeColors.text }]}>
              Security Verification
            </AppText>
            <AppText type={THIRTEEN} weight={MEDIUM} style={[styles.subtitle, { color: '#999' }]}>
              To ensure the security of your account, please complete the following verification operation.
            </AppText>

            {/* Email Verification */}
            {verifyMethod === 'email' && (
              <View style={styles.inputGroup}>
                <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.label, { color: themeColors.text }]}>
                  Code sent to: {displayEmail || 'your registered email'}
                </AppText>
                <View style={[styles.inputContainer, { backgroundColor: isDark ? 'transparent' : '#EDEDEE', borderColor: isDark ? themeColors.border : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                  <TextInput
                    style={[styles.input, { color: themeColors.text }]}
                    placeholder="Please enter Email Code"
                    placeholderTextColor="#999"
                    value={emailCode}
                    onChangeText={(v) => setEmailCode(v.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <TouchableOpacity onPress={handleResendOtp} disabled={emailCountdown > 0} style={styles.actionBtn}>
                    <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: emailCountdown > 0 ? '#999' : colors.cyanTheme }}>
                      {emailCountdown > 0 ? `${emailCountdown}s` : 'Send'}
                    </AppText>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputFooter}>
                  <AppText type={TWELVE} style={{ color: '#999' }}>Valid for 10 minutes</AppText>
                  <TouchableOpacity onPress={() => handlePasteCode(setEmailCode)} style={styles.pasteWrap}>
                    <AppText type={TWELVE} weight={MEDIUM} style={{ color: themeColors.text, marginRight: 4 }}>Paste</AppText>
                    <FastImage source={pasteImg} style={{ width: 12, height: 12 }} tintColor={themeColors.text} resizeMode="contain" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Phone Verification */}
            {verifyMethod === 'mobile' && (
              <View style={styles.inputGroup}>
                <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.label, { color: themeColors.text }]}>
                  Code sent to: {displayPhone || 'your registered phone'}
                </AppText>
                <View style={[styles.inputContainer, { backgroundColor: isDark ? 'transparent' : '#EDEDEE', borderColor: isDark ? themeColors.border : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                  <TextInput
                    style={[styles.input, { color: themeColors.text }]}
                    placeholder="Please enter SMS Code"
                    placeholderTextColor="#999"
                    value={smsCode}
                    onChangeText={(v) => setSmsCode(v.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <TouchableOpacity onPress={handleResendOtp} disabled={smsCountdown > 0} style={styles.actionBtn}>
                    <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: smsCountdown > 0 ? '#999' : colors.cyanTheme }}>
                      {smsCountdown > 0 ? `${smsCountdown}s` : 'Send'}
                    </AppText>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputFooter}>
                  <AppText type={TWELVE} style={{ color: '#999' }}>Valid for 10 minutes</AppText>
                  <TouchableOpacity onPress={() => handlePasteCode(setSmsCode)} style={styles.pasteWrap}>
                    <AppText type={TWELVE} weight={MEDIUM} style={{ color: themeColors.text, marginRight: 4 }}>Paste</AppText>
                    <FastImage source={pasteImg} style={{ width: 12, height: 12 }} tintColor={themeColors.text} resizeMode="contain" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Google Authenticator */}
            {verifyMethod === 'totp' && (
              <View style={styles.inputGroup}>
                <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.label, { color: themeColors.text }]}>
                  Google Authenticator Code
                </AppText>
                <View style={[styles.inputContainer, { backgroundColor: isDark ? 'transparent' : '#EDEDEE', borderColor: isDark ? themeColors.border : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                  <TextInput
                    style={[styles.input, { color: themeColors.text }]}
                    placeholder="Please enter 6-digit TOTP Code"
                    placeholderTextColor="#999"
                    value={totpCode}
                    onChangeText={(v) => setTotpCode(v.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
                <View style={styles.inputFooter}>
                  <AppText type={TWELVE} style={{ color: '#999' }}>Enter code from Authenticator app</AppText>
                  <TouchableOpacity onPress={() => handlePasteCode(setTotpCode)} style={styles.pasteWrap}>
                    <AppText type={TWELVE} weight={MEDIUM} style={{ color: themeColors.text, marginRight: 4 }}>Paste</AppText>
                    <FastImage source={pasteImg} style={{ width: 12, height: 12 }} tintColor={themeColors.text} resizeMode="contain" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Passkey Verification */}
            {verifyMethod === 'passkey' && (
              <View style={styles.inputGroup}>
                <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.label, { color: themeColors.text }]}>
                  Passkey Verification
                </AppText>
                <AppText type={TWELVE} style={{ color: '#999', marginBottom: 16 }}>
                  Verify your identity using Face ID, Touch ID, or device lock.
                </AppText>

              </View>
            )}
          </View>
        )}

        {step === 3 && (
          <>
            {/* Old Password field */}
            <View style={styles.inputGroup}>
              <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.label, { color: themeColors.text }]}>
                Old password
              </AppText>
              <Input
                placeholder="Please enter old password"
                placeholderTextColor={isDark ? '#8A8A93' : '#A9A9B2'}
                secureTextEntry={!showOldPass}
                isSecure={true}
                onPressVisible={() => setShowOldPass(!showOldPass)}
                value={oldPassword}
                onChangeText={setOldPassword}
                textContentType="password"
                autoComplete="current-password"
                importantForAutofill="yes"

              />
            </View>

            {/* New Password field */}
            <View style={styles.inputGroup}>
              <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.label, { color: themeColors.text }]}>
                New password
              </AppText>
              <Input
                placeholder="Please enter new password"
                placeholderTextColor={isDark ? '#8A8A93' : '#A9A9B2'}
                secureTextEntry={!showNewPass}
                isSecure={true}
                onPressVisible={() => setShowNewPass(!showNewPass)}
                value={newPassword}
                onChangeText={setNewPassword}

              />

              {/* Validation Checklist */}
              <View style={styles.rulesBox}>
                {signupPasswordRules.map((rule, idx) => (
                  <RuleItem
                    key={rule.id}
                    state={passwordRuleRowStates[idx]}
                    label={rule.label}
                    doneColor={themeColors.button || colors.cyanTheme}
                  />
                ))}
              </View>
            </View>

            {/* Confirm Password field */}
            <View style={styles.inputGroup}>
              <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.label, { color: themeColors.text }]}>
                Confirm password
              </AppText>
              <Input
                placeholder="Please re-enter new password"
                placeholderTextColor={isDark ? '#8A8A93' : '#A9A9B2'}
                secureTextEntry={!showConfirmPass}
                isSecure={true}
                onPressVisible={() => setShowConfirmPass(!showConfirmPass)}
                value={confirmPassword}
                onChangeText={setConfirmPassword}

              />
            </View>
          </>
        )}

        {step === 4 && (
          <View style={styles.verificationContainer}>
            <AuthEmailPhoneTabBar
              tabs={["Email", "Phone"]}
              index={forgotIndex}
              onChange={setForgotIndex}
            />

            {forgotIndex === 0 ? (
              <View style={[styles.inputGroup, { marginTop: 16 }]}>
                <Input
                  placeholder="Enter email address"
                  placeholderTextColor={isDark ? '#8A8A93' : '#A9A9B2'}
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"

                />
              </View>
            ) : (
              <View style={{ marginTop: 16 }}>
                <AuthPhoneInput
                  value={resetPhone}
                  onChangeText={setResetPhone}
                  placeholder="Enter phone number"
                  hasError={false}
                  onSelectCountry={setResetCountryCode}
                  onCountry={setResetCountry}
                  country={resetCountry}
                  countryCode={resetCountryCode}
                  maxLength={15}
                  onFocus={() => { }}
                  onBlur={() => { }}
                  onSubmitEditing={() => { }}
                  onEndEditing={() => { }}
                />
              </View>
            )}
          </View>
        )}

        {step === 5 && (
          <View style={styles.verificationContainer}>
            <AppText type={TWENTY_TWO} weight={SEMI_BOLD} style={[styles.mainTitle, { color: themeColors.text }]}>
              Verify Your {forgotIndex === 0 ? "Email" : "Phone"}
            </AppText>
            <AppText type={THIRTEEN} weight={MEDIUM} style={[styles.subtitle, { color: '#999' }]}>
              The verification code has been sent to your {forgotIndex === 0 ? "email" : "phone"}: {forgotIndex === 0 ? resetEmail : `+${resetCountryCode[0] || '91'} ${resetPhone}`}
            </AppText>

            <View style={styles.inputGroup}>
              <View style={[styles.inputContainer, { backgroundColor: isDark ? 'transparent' : '#EDEDEE', borderColor: isDark ? themeColors.border : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
                <TextInput
                  style={[styles.input, { color: themeColors.text }]}
                  placeholder="Please enter Verification Code"
                  placeholderTextColor="#999"
                  value={resetOtp}
                  onChangeText={(v) => setResetOtp(v.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TouchableOpacity onPress={handleResetResendOtp} disabled={resetOtpCountdown > 0} style={styles.actionBtn}>
                  <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: resetOtpCountdown > 0 ? '#999' : colors.cyanTheme }}>
                    {resetOtpCountdown > 0 ? `${resetOtpCountdown}s` : 'Resend'}
                  </AppText>
                </TouchableOpacity>
              </View>
              <View style={styles.inputFooter}>
                <AppText type={TWELVE} style={{ color: '#999' }}>Valid for 10 minutes</AppText>
                <TouchableOpacity onPress={() => handlePasteCode(setResetOtp)} style={styles.pasteWrap}>
                  <AppText type={TWELVE} weight={MEDIUM} style={{ color: themeColors.text, marginRight: 4 }}>Paste</AppText>
                  <FastImage source={pasteImg} style={{ width: 12, height: 12 }} tintColor={themeColors.text} resizeMode="contain" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {step === 6 && (
          <View style={styles.verificationContainer}>
            <AppText type={TWENTY_TWO} weight={SEMI_BOLD} style={[styles.mainTitle, { color: themeColors.text }]}>
              Reset Your Password
            </AppText>
            <AppText type={THIRTEEN} weight={MEDIUM} style={[styles.subtitle, { color: '#999' }]}>
              Please set a new password that is secure and meets all requirements below.
            </AppText>

            {/* New Password */}
            <View style={styles.inputGroup}>
              <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.label, { color: themeColors.text }]}>
                New Password
              </AppText>
              <Input
                placeholder="Enter New Password"
                placeholderTextColor={isDark ? '#8A8A93' : '#A9A9B2'}
                secureTextEntry={!showNewResetPass}
                isSecure={true}
                onPressVisible={() => setShowNewResetPass(!showNewResetPass)}
                value={newResetPassword}
                onChangeText={setNewResetPassword}

              />

              {/* Checklist */}
              <View style={styles.rulesBox}>
                {signupPasswordRules.map((rule, idx) => (
                  <RuleItem
                    key={rule.id}
                    state={resetPasswordRuleRowStates[idx]}
                    label={rule.label}
                    doneColor={themeColors.button || colors.cyanTheme}
                  />
                ))}
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.label, { color: themeColors.text }]}>
                Enter Password Again
              </AppText>
              <Input
                placeholder="Confirm Password"
                placeholderTextColor={isDark ? '#8A8A93' : '#A9A9B2'}
                secureTextEntry={!showConfirmResetPass}
                isSecure={true}
                onPressVisible={() => setShowConfirmResetPass(!showConfirmResetPass)}
                value={confirmResetPassword}
                onChangeText={setConfirmResetPassword}

              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Confirm Button & Forgot Password Link */}
      {step === 1 ? (
        <View style={[styles.bottomContainer, { backgroundColor: themeColors.background }]}>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: isDark ? colors.white : '#2A2A2E' }]}
            activeOpacity={0.8}
            onPress={handleRestrictConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={isDark ? colors.black : "#FFFFFF"} />
            ) : (
              <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: isDark ? colors.black : '#FFFFFF' }}>
                Confirm
              </AppText>
            )}
          </TouchableOpacity>
        </View>
      ) : step === 2 ? (
        !isKeyboardVisible && (
          <View style={[styles.bottomContainer, { backgroundColor: themeColors.background }]}>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: isDark ? colors.white : '#2A2A2E' }]}
              activeOpacity={0.8}
              onPress={handleVerifyCode}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={isDark ? colors.black : "#FFFFFF"} />
              ) : (
                <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: isDark ? colors.black : '#FFFFFF' }}>
                  Confirm
                </AppText>
              )}
            </TouchableOpacity>

            {availableOptions.length > 0 && (
              <TouchableOpacity style={styles.forgotLink} activeOpacity={0.7} onPress={() => sheetRef.current?.open()}>
                <AppText
                  type={FOURTEEN}
                  weight={MEDIUM}
                  style={[styles.forgotText, { color: isDark ? '#FFFFFF' : '#000000' }]}
                >
                  Choose other verification method
                </AppText>
              </TouchableOpacity>
            )}
          </View>
        )
      ) : step === 3 ? (
        !isKeyboardVisible && (
          <View style={[styles.bottomContainer, { backgroundColor: themeColors.background }]}>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: allSatisfied ? (isDark ? colors.white : colors.black) : (isDark ? '#2E2E32' : '#EBEBEB') }
              ]}
              activeOpacity={allSatisfied ? 0.8 : 1}
              onPress={allSatisfied ? handleChangePasswordSubmit : undefined}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={isDark ? colors.black : "#FFFFFF"} />
              ) : (
                <AppText
                  type={SIXTEEN}
                  weight={SEMI_BOLD}
                  style={{ color: allSatisfied ? (isDark ? colors.black : '#FFFFFF') : (isDark ? '#6E6E73' : '#A9A9B2') }}
                >
                  Confirm
                </AppText>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotLink} activeOpacity={0.7} onPress={handleForgotPassword}>
              <AppText
                type={FOURTEEN}
                weight={MEDIUM}
                style={[styles.forgotText, { color: isDark ? '#FFFFFF' : '#000000' }]}
              >
                Forgot password
              </AppText>
            </TouchableOpacity>
          </View>
        )
      ) : step === 4 ? (
        !isKeyboardVisible && (
          <View style={[styles.bottomContainer, { backgroundColor: themeColors.background }]}>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: ((forgotIndex === 0 ? resetEmail.trim() : resetPhone.trim())) ? (isDark ? colors.white : colors.black) : (isDark ? '#2E2E32' : '#EBEBEB') }
              ]}
              activeOpacity={0.8}
              onPress={handleResetNext}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={isDark ? colors.black : "#FFFFFF"} />
              ) : (
                <AppText
                  type={SIXTEEN}
                  weight={SEMI_BOLD}
                  style={{ color: ((forgotIndex === 0 ? resetEmail.trim() : resetPhone.trim())) ? (isDark ? colors.black : '#FFFFFF') : (isDark ? '#6E6E73' : '#A9A9B2') }}
                >
                  Next
                </AppText>
              )}
            </TouchableOpacity>
          </View>
        )
      ) : step === 5 ? (
        !isKeyboardVisible && (
          <View style={[styles.bottomContainer, { backgroundColor: themeColors.background }]}>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: resetOtp.length === 6 ? (isDark ? colors.white : colors.black) : (isDark ? '#2E2E32' : '#EBEBEB') }
              ]}
              activeOpacity={0.8}
              onPress={handleResetVerifyNext}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={isDark ? colors.black : "#FFFFFF"} />
              ) : (
                <AppText
                  type={SIXTEEN}
                  weight={SEMI_BOLD}
                  style={{ color: resetOtp.length === 6 ? (isDark ? colors.black : '#FFFFFF') : (isDark ? '#6E6E73' : '#A9A9B2') }}
                >
                  Confirm
                </AppText>
              )}
            </TouchableOpacity>
          </View>
        )
      ) : (
        !isKeyboardVisible && (
          <View style={[styles.bottomContainer, { backgroundColor: isDark ? '#121214' : colors.white }]}>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: resetAllSatisfied && confirmResetPassword === newResetPassword ? (isDark ? colors.white : colors.black) : (isDark ? '#2E2E32' : '#EBEBEB') }
              ]}
              activeOpacity={0.8}
              onPress={handleResetPasswordSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={isDark ? colors.black : "#FFFFFF"} />
              ) : (
                <AppText
                  type={SIXTEEN}
                  weight={SEMI_BOLD}
                  style={{ color: resetAllSatisfied && confirmResetPassword === newResetPassword ? (isDark ? colors.black : '#FFFFFF') : (isDark ? '#6E6E73' : '#A9A9B2') }}
                >
                  Reset
                </AppText>
              )}
            </TouchableOpacity>
          </View>
        )
      )}

      {/* Reusable Verification Options RBSheet */}
      <VerificationOptionsSheet
        sheetRef={sheetRef}
        options={availableOptions}
        selectedValue={verifyMethod}
        onSelect={handleSelectMethod}
      />
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    height: Platform.OS === 'ios' ? 44 : 56,
  },
  headerBtn: {
    padding: 6,
    marginLeft: -4,
  },
  headerTitle: {
    // position: 'absolute',
    // left: 0,
    // right: 0,
    // textAlign: 'center',
    // zIndex: -1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 160,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
  },
  rulesBox: {
    marginTop: 12,
    gap: 8,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleDot: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 15,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingTop: 16,
    alignItems: 'center',
  },
  confirmBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 16,
  },
  forgotLink: {
    paddingVertical: 4,
  },
  forgotText: {
    textDecorationLine: 'underline',
  },
  stepOneContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  illustration: {
    width: 280,
    height: 200,
    marginBottom: 30,
  },
  stepOneTitle: {
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: 16,
  },
  stepOneDesc: {
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  verificationContainer: {
    paddingHorizontal: 4,
    paddingTop: 10,
  },
  mainTitle: {
    marginBottom: 6,
  },
  subtitle: {
    lineHeight: 20,
    marginBottom: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  actionBtn: {
    paddingLeft: 10,
    justifyContent: 'center',
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 3,
  },
  pasteWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchMethodLink: {
    alignItems: 'center',
    marginTop: 24,
  },
  switchMethodText: {
    textDecorationLine: 'underline',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
  },
  tabButton: {
    paddingVertical: 10,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActiveButton: {
    borderBottomColor: colors.cyanTheme,
  },
  tabText: {
    fontSize: 14,
  },
});

export default ChangeLoginPasswordScreen;
