import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Keyboard,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { useNavigation } from '@react-navigation/native';
import { isValidPhoneNumber } from 'libphonenumber-js';
import {
  AppSafeAreaView,
  AppText,
  Button,
  BOLD,
  ELEVEN,
  FOURTEEN,
  Input,
  MEDIUM,
  SEMI_BOLD,
  SIXTEEN,
  TEN,
  TWENTY,
} from '../../shared';
import KeyBoardAware from '../../shared/components/KeyboardAware';
import TouchableOpacityView from '../../shared/components/TouchableOpacityView';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { forgotOtp, forgotPassword } from '../../actions/authActions';
import { showError, showSuccess } from '../../helper/logger';
import { SpinnerSecond } from '../../shared/components/SpinnerSecond';
import { checkValue, validateEmail, validatePasswordStrict } from '../../helper/utility';
import { colors } from '../../theme/colors';
import { back_ic, eye_open_icon, eye_close_icon, checkIc, closeIcon, minus } from '../../helper/ImageAssets';
import { AuthPhoneInput } from '../../shared/components';
import NavigationService from '../../navigation/NavigationService';

// ─── Password Rules (same as ChangePassword / SetPassword) ─────────
const signupPasswordRules = (usernamePart: string) => [
  { id: 'len',      label: 'At least 8 characters',               passes: (p: string) => p.length >= 8 },
  { id: 'upper',    label: 'At least one uppercase letter (A-Z)',  passes: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower',    label: 'At least one lowercase letter (a-z)',  passes: (p: string) => /[a-z]/.test(p) },
  { id: 'digit',    label: 'At least one number (0-9)',            passes: (p: string) => /[0-9]/.test(p) },
  { id: 'special',  label: 'At least one special character',       passes: (p: string) => /[^A-Za-z0-9]/.test(p) },
  { id: 'nouser',   label: 'Must not contain your username',       passes: (p: string) => !usernamePart || !p.toLowerCase().includes(usernamePart.toLowerCase()) },
];

const getRuleRowStates = (password: string, rules: ReturnType<typeof signupPasswordRules>) => {
  if (!password.trim()) return rules.map(() => 'idle' as const);
  let hitFirstFail = false;
  return rules.map((r) => {
    if (hitFirstFail) return 'pending' as const;
    if (r.passes(password)) return 'ok' as const;
    hitFirstFail = true;
    return 'bad' as const;
  });
};

const RuleItem = ({ state, label, doneColor }: { state: string; label: string; doneColor: string }) => {
  const iconSource = state === 'ok' ? checkIc : state === 'bad' ? closeIcon : minus;
  const tint = state === 'ok' ? doneColor : state === 'bad' ? '#e74c3c' : '#999';
  const textColor = state === 'ok' ? doneColor : state === 'bad' ? '#e74c3c' : '#aaa';
  return (
    <View style={ruleStyles.row}>
      <FastImage source={iconSource} style={ruleStyles.icon} tintColor={tint} resizeMode="contain" />
      <AppText type={ELEVEN} style={{ color: textColor, flex: 1 }}>{label}</AppText>
    </View>
  );
};

const ruleStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 2, paddingLeft: 4 },
  icon: { width: 14, height: 14 },
});

// ─── Phases ────────────────────────────────────────────────────────
const PHASE = {
  RESET_TABS: 'reset_tabs',
  VERIFY_OTP: 'verify_otp',
  RESET_NEW: 'reset_new',
} as const;

// ─── Main Component ────────────────────────────────────────────────
const ResetPassword = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const userData = useAppSelector((state: any) => state.auth.userData);
  const isLoading = useAppSelector((state: any) => state.auth.isLoading);
  const theme = useAppSelector((state: any) => state.auth.theme);

  const emailId = userData?.emailId ?? userData?.email_id ?? '';
  const profileMobile = userData?.mobileNumber ?? userData?.mobile_number ?? '';
  const profileCountryCode = userData?.country_code ?? userData?.countryCode ?? '';

  const isDark = theme === 'Dark';
  const textColor = isDark ? '#fff' : '#222';
  const cardBg = isDark ? '#1a1a2e' : '#fff';
  const inputBg = isDark ? '#16213e' : '#f5f6fa';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  // ── Phase State ──────────────────────────────────
  const [phase, setPhase] = useState<string>(PHASE.RESET_TABS);

  // ── RESET_TABS State ─────────────────────────────
  const [resetTab, setResetTab] = useState<'email' | 'phone'>(emailId ? 'email' : 'phone');
  const [resetEmail, setResetEmail] = useState(emailId || '');
  const [resetPhone, setResetPhone] = useState(profileMobile || '');
  const [resetCountryCode, setResetCountryCode] = useState(profileCountryCode ? [profileCountryCode.replace('+', '')] : ['91']);
  const [resetCountry, setResetCountry] = useState('IN');

  // ── VERIFY_OTP State ─────────────────────────────
  const [otp, setOtp] = useState('');

  // ── RESET_NEW State ──────────────────────────────
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const usernamePart = useMemo(() => {
    if (resetTab === 'email' && resetEmail.includes('@')) return resetEmail.split('@')[0];
    return String(resetPhone || '').replace(/\D/g, '');
  }, [resetTab, resetEmail, resetPhone]);

  const rules = useMemo(() => signupPasswordRules(usernamePart), [usernamePart]);
  const ruleStates = useMemo(() => getRuleRowStates(newPassword.trim(), rules), [newPassword, rules]);
  const allRulesPass = useMemo(() => rules.every(r => r.passes(newPassword.trim())), [newPassword, rules]);

  const resetNextEnabled = resetTab === 'email'
    ? resetEmail.trim().includes('@') && validateEmail(resetEmail.trim())
    : resetPhone.replace(/\D/g, '').length >= 8;

  const resetSubmitEnabled = allRulesPass && newPassword.trim().length > 0
    && confirmPassword.trim().length > 0 && newPassword.trim() === confirmPassword.trim();

  // ── Handlers ─────────────────────────────────────
  const handleSendOtp = () => {
    Keyboard.dismiss();
    let data: any;
    if (resetTab === 'phone') {
      const digits = resetPhone.replace(/\D/g, '').replace(/^0+/, '');
      data = {
        email_or_phone: `+${resetCountryCode[0] || '91'} ${digits}`,
        resend: true,
        type: 'forgot',
      };
    } else {
      data = {
        email_or_phone: resetEmail.trim(),
        resend: true,
        type: 'forgot',
      };
    }
    dispatch(forgotOtp(data, true));
    setPhase(PHASE.VERIFY_OTP);
  };

  const handleResendOtp = () => {
    handleSendOtp();
  };

  const handleResetSubmit = () => {
    if (!otp.trim()) {
      showError('Please enter verification code');
      return;
    }
    const pw = newPassword.trim();
    if (!pw) {
      showError('Please enter new password');
      return;
    }
    if (!allRulesPass) {
      showError('Password does not meet all requirements');
      return;
    }
    if (pw !== confirmPassword.trim()) {
      showError('Confirm password does not match');
      return;
    }

    let identifier: string;
    if (resetTab === 'phone') {
      const digits = resetPhone.replace(/\D/g, '').replace(/^0+/, '');
      identifier = `+${resetCountryCode[0] || '91'} ${digits}`;
    } else {
      identifier = resetEmail.trim();
    }

    const data = {
      email_or_phone: identifier,
      new_password: pw,
      verification_code: +otp.trim(),
    };

    dispatch(forgotPassword(data)).then((res: any) => {
      // forgotPassword action should handle success/error toasts
      // Navigate back to Security on success
      if (res) {
        navigation.goBack();
      }
    }).catch(() => {});
  };

  // ── Render ───────────────────────────────────────
  return (
    <AppSafeAreaView style={{ backgroundColor: isDark ? '#0a0a23' : '#f5f6fa' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <FastImage source={back_ic} style={styles.backIcon} tintColor={textColor} resizeMode="contain" />
        </TouchableOpacity>
        <AppText weight={BOLD} type={TWENTY} style={{ color: textColor, flex: 1, textAlign: 'center' }}>
          Reset Password
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <KeyBoardAware>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── PHASE: RESET_TABS ─────────────────────────── */}
          {phase === PHASE.RESET_TABS && (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
              <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: textColor, marginBottom: 16 }}>
                Reset Your Password
              </AppText>

              {/* Tab Bar */}
              <View style={styles.tabBar}>
                <TouchableOpacity
                  style={[styles.tab, resetTab === 'email' && styles.tabActive]}
                  onPress={() => setResetTab('email')}
                >
                  <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: resetTab === 'email' ? colors.buttonBg : (isDark ? '#aaa' : '#888') }}>
                    Email
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, resetTab === 'phone' && styles.tabActive]}
                  onPress={() => setResetTab('phone')}
                >
                  <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: resetTab === 'phone' ? colors.buttonBg : (isDark ? '#aaa' : '#888') }}>
                    Phone
                  </AppText>
                </TouchableOpacity>
              </View>

              {/* Input */}
              {resetTab === 'email' ? (
                <Input
                  placeholder="Enter email address"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="done"
                  containerStyle={{ marginTop: 12 }}
                />
              ) : (
                <View style={{ marginTop: 12 }}>
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
                    onFocus={() => {}}
                    onBlur={() => {}}
                    onSubmitEditing={() => {}}
                    onEndEditing={() => {}}
                  />
                </View>
              )}

              <Button
                children="Next"
                onPress={handleSendOtp}
                disabled={!resetNextEnabled}
                containerStyle={{ marginTop: 20, backgroundColor: resetNextEnabled ? colors.buttonBg : '#888' }}
                titleStyle={{ color: colors.white, fontWeight: '700' }}
              />
            </View>
          )}

          {/* ─── PHASE: VERIFY_OTP ─────────────────────────── */}
          {phase === PHASE.VERIFY_OTP && (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
              <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: textColor, marginBottom: 8 }}>
                Verify Your Identity
              </AppText>
              <AppText type={ELEVEN} style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#666', marginBottom: 16 }}>
                Enter the verification code sent to your {resetTab === 'email' ? 'email' : 'phone'}
              </AppText>

              <Input
                placeholder="Enter OTP"
                value={otp}
                onChangeText={setOtp}
                keyboardType="numeric"
                maxLength={6}
                isOtp
                onSendOtp={handleResendOtp}
                otpText="Resend"
              />

              <Button
                children="Verify & Continue"
                onPress={() => {
                  if (!otp.trim() || otp.trim().length < 4) {
                    showError('Please enter a valid verification code');
                    return;
                  }
                  setPhase(PHASE.RESET_NEW);
                }}
                disabled={!otp.trim() || otp.trim().length < 4}
                containerStyle={{ marginTop: 20, backgroundColor: otp.trim().length >= 4 ? colors.buttonBg : '#888' }}
                titleStyle={{ color: colors.white, fontWeight: '700' }}
              />

              <TouchableOpacity onPress={() => setPhase(PHASE.RESET_TABS)} style={{ marginTop: 14, alignSelf: 'center' }}>
                <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: colors.buttonBg, textDecorationLine: 'underline' }}>
                  Change {resetTab === 'email' ? 'email' : 'phone number'}
                </AppText>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── PHASE: RESET_NEW ──────────────────────────── */}
          {phase === PHASE.RESET_NEW && (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
              <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: textColor, marginBottom: 16 }}>
                Set New Password
              </AppText>

              {/* New Password */}
              <AppText color={textColor} type={FOURTEEN} weight={SEMI_BOLD}>New Password</AppText>
              <Input
                placeholder="Enter New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                isSecure
                onPressVisible={() => setShowNewPassword(!showNewPassword)}
                autoCapitalize="none"
                containerStyle={styles.passwordInput}
              />

              {/* Rules */}
              {newPassword.trim().length > 0 && (
                <View style={{ marginTop: 4, marginBottom: 8 }}>
                  {rules.map((rule, idx) => (
                    <RuleItem
                      key={rule.id}
                      state={ruleStates[idx]}
                      label={rule.label}
                      doneColor={colors.buttonBg}
                    />
                  ))}
                </View>
              )}

              {/* Confirm Password */}
              <AppText color={textColor} type={FOURTEEN} weight={SEMI_BOLD} style={{ marginTop: 12 }}>Confirm Password</AppText>
              <Input
                placeholder="Re-Enter your New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                isSecure
                onPressVisible={() => setShowConfirmPassword(!showConfirmPassword)}
                autoCapitalize="none"
                containerStyle={styles.passwordInput}
              />

              {/* Match error */}
              {confirmPassword.trim().length > 0 && newPassword.trim() !== confirmPassword.trim() && (
                <AppText type={ELEVEN} style={{ color: '#e74c3c', marginTop: 4, paddingLeft: 4 }}>
                  Confirm password does not match.
                </AppText>
              )}

              <Button
                children="Reset Password"
                onPress={handleResetSubmit}
                loading={isLoading}
                disabled={!resetSubmitEnabled}
                containerStyle={{ marginTop: 24, backgroundColor: resetSubmitEnabled ? colors.buttonBg : '#888' }}
                titleStyle={{ color: colors.white, fontWeight: '700' }}
              />
            </View>
          )}
        </ScrollView>
      </KeyBoardAware>
      <SpinnerSecond />
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: { width: 20, height: 20 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.buttonBg,
  },
  passwordInput: {
    marginTop: 8,
  },
});

export default ResetPassword;
