import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  AppSafeAreaView,
  AppText,
  Button,
  Input,
  SEMI_BOLD,
  FOURTEEN,
  TEN,
  TWELVE,
  MEDIUM,
  FIFTEEN,
  SIXTEEN,
  THIRTEEN,
  BOLD,
  EIGHTEEN,
} from '../../shared';
import { colors } from '../../theme/colors';
import FastImage from 'react-native-fast-image';
import TouchableOpacityView from '../../shared/components/TouchableOpacityView';
import {
  back_ic,
  SHARE_NEW_ICON,
  checkIc,
  closeIcon,
  minus,
  SECURITY_SHEIELD
} from '../../helper/ImageAssets';
import {
  sendSecurityOtp,
  securityChangePasswordAction,
  verifySecurityAllMethods,
  verifySecurityPasskey,
  securityAddFundPasswordAction,
} from '../../actions/accountActions';
import { RESET_PASSWORD_FROM_CHANGE } from '../../navigation/routes';
import { showError } from '../../helper/logger';
import { VerificationOptionsSheet } from '../../shared/components/VerificationOptionsSheet';
import { SpinnerSecond } from '../../shared/components/SpinnerSecond';
import { validatePasswordStrict } from '../../helper/utility';
import { useTheme } from '../../hooks/useTheme';

const maskEmail = (email: string) => {
  if (!email) return '';
  const [username, domain] = email.split('@');
  if (!domain) return email;
  const masked = username.substring(0, 2) + '***' + username.slice(-1);
  return `${masked}@${domain}`;
};

const maskPhone = (phone: string | number) => {
  if (!phone) return '';
  const str = String(phone).replace(/\s/g, '');
  if (str.length < 7) return str;
  return str.substring(0, 3) + '****' + str.slice(-4);
};

const PHASE = {
  VERIFY: 'verify',
  CHANGE: 'change',
};

const ChangePassword = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();

  const userData = useAppSelector((state: any) => state.auth.userData);
  const isLoading = useAppSelector((state: any) => state.auth.isLoading);

  const isFund = route?.params?.type === 'fund';
  const hasExisting = useMemo(() => {
    if (isFund) return !!(userData?.fundPassword || userData?.isFundPasswordSet || userData?.payPin);
    return true; // Login password always exists
  }, [isFund, userData]);

  const emailId = userData?.emailId ?? userData?.email_id ?? '';
  const profileMobile = userData?.mobileNumber ?? userData?.mobile_number ?? '';
  const profileCountryCode = userData?.country_code ?? userData?.countryCode ?? '';
  const mobileNumber = profileCountryCode && profileMobile ? `${profileCountryCode} ${profileMobile}`.trim() : profileMobile || '';

  const [otp, setOtp] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [verifyMethod, setVerifyMethod] = useState('');
  const [availableMethods, setAvailableMethods] = useState<any[]>([]);
  const [phase, setPhase] = useState(PHASE.VERIFY);
  const optionsSheetRef = useRef<any>(null);

  useEffect(() => {
    const methods: any[] = [];
    // Web excludes passkey for setFundPassword flow
    if (!isFund && userData?.hasPasskey) {
      methods.push({ value: 'passkey', label: 'Passkey', description: 'Use fingerprint or Face ID' });
    }
    if ((userData?.['2fa'] ?? 0) === 2) methods.push({ value: 'totp', label: 'Google Authenticator', description: 'Use your authenticator app' });
    if (emailId) methods.push({ value: 'email', label: 'Email OTP', description: `Send code to ${maskEmail(emailId)}` });
    if (profileMobile) methods.push({ value: 'mobile', label: 'Mobile OTP', description: `Send code to ${maskPhone(mobileNumber)}` });
    setAvailableMethods(methods);

    if (methods.length > 0 && !verifyMethod) {
      // Pick first in order: Passkey (if login), TOTP, Email, Mobile
      setVerifyMethod(methods[0].value);
    }
  }, [userData, emailId, profileMobile, mobileNumber, isFund]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleSendOtp = useCallback(async () => {
    const target = verifyMethod === 'email' ? 'email' : 'mobile';
    const purpose = isFund ? 'fund_password' : 'change_password';
    const ok = await dispatch(sendSecurityOtp(target, purpose));
    if (ok) setResendTimer(60);
  }, [dispatch, verifyMethod, isFund]);

  const handleSubmit = async () => {
    if (hasExisting && !oldPassword) {
      showError('Please enter your current password');
      return;
    }
    if (!newPassword || !confirmPassword) {
      showError('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    const isOk = validatePasswordStrict(newPassword);
    if (!isOk) {
      showError('Password must be 8+ chars with upper, lower, number, and special character');
      return;
    }

    setChangeSubmitBusy(true);
    try {
      // Step 2: Change Login Password
      const loginPayload = {
        oldPassword,
        newPassword,
        confirmNewPassword: confirmPassword
      };
      console.log("Changing Login Password with payload:", loginPayload);
      const success = await dispatch(securityChangePasswordAction(loginPayload));
      if (success) {
        navigation.goBack();
      }
    } finally {
      setChangeSubmitBusy(false);
    }
  };

  const [changeSubmitBusy, setChangeSubmitBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);

  const handleVerifySubmit = async () => {
    if (verifyMethod !== 'totp' && verifyMethod !== 'passkey' && !otp) {
      showError('Please enter verification code');
      return;
    }

    setVerifyBusy(true);
    try {
      let verifyRes: any = null;
      if (verifyMethod === 'passkey') {
        const signId = emailId || profileMobile;
        const uid = await dispatch(verifySecurityPasskey(signId));
        if (!uid) {
          console.log("Passkey verification failed or cancelled");
          return;
        }
        verifyRes = { success: true, data: { userId: uid } };
      } else {
        verifyRes = await dispatch(verifySecurityAllMethods({
          type: verifyMethod,
          code: otp
        }));
      }

      console.log("Verification Response:", verifyRes);
      if (verifyRes?.success) {
        if (isFund) {
          // Fund password remains single flow if it doesn't have existing, 
          // but here we follow the web's phased approach for change.
          setPhase(PHASE.CHANGE);
        } else {
          setPhase(PHASE.CHANGE);
        }
      }
    } finally {
      setVerifyBusy(false);
    }
  };

  const handleFundSubmitDirect = async () => {
    if (!newPassword || !confirmPassword) {
      showError('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }
    if (verifyMethod !== 'totp' && verifyMethod !== 'passkey' && !otp) {
      showError('Please enter verification code');
      return;
    }

    const fundPayload = {
      fund_password: newPassword,
      confirm_fund_password: confirmPassword,
      code: otp,
      type: verifyMethod
    };
    console.log("Setting Fund Password (Direct Call) with payload:", fundPayload);
    const success = await dispatch(securityAddFundPasswordAction(fundPayload));
    if (success) {
      navigation.goBack();
    }
  };

  const handleOptionsSelect = (value: string) => {
    setVerifyMethod(value);
    setOtp('');
    setResendTimer(0);
    optionsSheetRef.current?.close();
  };

  const getVerifyTitle = () => {
    if (verifyMethod === 'totp') return 'Google Authenticator Code';
    if (verifyMethod === 'email') return 'Email Verification Code';
    if (verifyMethod === 'mobile') return 'Mobile Verification Code';
    if (verifyMethod === 'passkey') return 'Passkey Verification';
    return 'Verification';
  };

  const getVerifyDesc = () => {
    if (verifyMethod === 'totp') return 'Enter the 6-digit code from your authenticator app.';
    if (verifyMethod === 'email') return `Verification code sent to ${maskEmail(emailId)}.`;
    if (verifyMethod === 'mobile') return `Verification code sent to ${maskPhone(mobileNumber)}.`;
    if (verifyMethod === 'passkey') return 'Use your device passkey to verify.';
    return '';
  };

  const renderVerify = () => (
    <View style={styles.verifyContainer}>
      <AppText weight={BOLD} type={EIGHTEEN} style={[styles.verifyMainTitle, { color: themeColors.text }]}>
        {verifyMethod === 'totp' ? 'Authenticator App Verification' : 'Identity Verification'}
      </AppText>
      <AppText type={FOURTEEN} style={[styles.verifySubtitle, { color: themeColors.secondaryText }]}>
        {verifyMethod === 'totp' 
          ? 'Enter the 6-digit code generated by the Authenticator App.'
          : getVerifyDesc()}
      </AppText>

      <Input
        title={verifyMethod === 'totp' ? "Authenticator App" : getVerifyTitle()}
        value={otp}
        onChangeText={setOtp}
        placeholder="Please Enter"
        keyboardType="number-pad"
        maxLength={6}
        isOtp={verifyMethod !== 'totp' && verifyMethod !== 'passkey'}
        otpText={resendTimer > 0 ? `Resend (${resendTimer}s)` : 'Get OTP'}
        onSendOtp={handleSendOtp}
        mainContainer={{ marginTop: 25 }}
        disabled={verifyMethod === 'passkey'}
      />

      <Button
        children="Submit"
        onPress={handleVerifySubmit}
        loading={verifyBusy}
        containerStyle={[styles.confirmBtnFull, { backgroundColor: colors.buttonBg, marginTop: 40 }]}
        titleStyle={{ color: '#FFFFFF' }}
      />

      <View style={styles.verifyLinks}>
        {availableMethods.length > 1 && (
          <TouchableOpacityView onPress={() => optionsSheetRef.current?.open()} style={styles.verifyLinkItem}>
            <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: colors.buttonBg }}>
              Switch to Another Verification Method
            </AppText>
          </TouchableOpacityView>
        )}
        <TouchableOpacityView 
          onPress={() => navigation.navigate('SecurityVerificationUnavailable')} 
          style={styles.verifyLinkItem}
        >
          <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: colors.buttonBg }}>
            Security verification unavailable?
          </AppText>
        </TouchableOpacityView>
      </View>

      <View style={styles.protectedFooter}>
        <FastImage source={SECURITY_SHEIELD} style={styles.protectedIcon} resizeMode="contain" />
        <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>Protected by Balance Risk</AppText>
      </View>
    </View>
  );

  const renderChange = () => (
    <View style={styles.unifiedContainer}>
      <AppText weight={BOLD} type={EIGHTEEN} style={[styles.mainTitle, { color: themeColors.text }]}>
        {hasExisting ? (isFund ? 'Change Fund Password' : 'Change Login Password') : 'Set Fund Password'}
      </AppText>

      {hasExisting && (
        <Input
          title={isFund ? "Current Fund Password" : "Current Login Password"}
          value={oldPassword}
          onChangeText={setOldPassword}
          placeholder="Please Enter"
          secureTextEntry={!showOldPassword}
          isSecure
          onPressVisible={() => setShowOldPassword(!showOldPassword)}
          mainContainer={{ marginTop: 20 }}
        />
      )}

      <Input
        title={isFund ? "New Fund Password" : "New Login Password"}
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="Please Enter"
        secureTextEntry={!showNewPassword}
        isSecure
        onPressVisible={() => setShowNewPassword(!showNewPassword)}
        mainContainer={{ marginTop: 20 }}
      />
      <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 8 }}>
        Choose a strong {isFund ? 'fund ' : ''}password and keep it private.
      </AppText>

      <Input
        title={isFund ? "Confirm Fund Password" : "Confirm Login Password"}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Please Enter"
        secureTextEntry={!showConfirmPassword}
        isSecure
        onPressVisible={() => setShowConfirmPassword(!showConfirmPassword)}
        mainContainer={{ marginTop: 20 }}
      />

      <Button
        children="Confirm"
        onPress={isFund && !hasExisting ? handleFundSubmitDirect : handleSubmit}
        loading={isLoading || changeSubmitBusy}
        containerStyle={[styles.confirmBtnFull, { backgroundColor: colors.buttonBg, marginTop: 40 }]}
        titleStyle={{ color: '#FFFFFF' }}
      />

      {(!isFund && hasExisting) && (
        <TouchableOpacity
          onPress={() => navigation.navigate(RESET_PASSWORD_FROM_CHANGE)}
          style={styles.forgotBtn}
        >
          <AppText weight={MEDIUM} type={FOURTEEN} style={{ color: colors.buttonBg, textDecorationLine: 'underline' }}>Forgot password?</AppText>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <AppSafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <FastImage source={back_ic} style={styles.backIcon} tintColor={themeColors.text} />
        </TouchableOpacity>
        <AppText weight={BOLD} type={SIXTEEN} style={{ color: themeColors.text }}>
          {isFund ? 'Fund Password' : 'Login Password'}
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {phase === PHASE.VERIFY ? renderVerify() : renderChange()}
      </ScrollView>

      <VerificationOptionsSheet
        sheetRef={optionsSheetRef}
        options={availableMethods}
        onSelect={handleOptionsSelect}
        borderClr={isDark ? colors.dividerColor : colors.secondBorder}
      />
      <SpinnerSecond />
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  backIcon: { width: 18, height: 18, resizeMode: "contain" },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 60 },

  unifiedContainer: { paddingVertical: 5 },
  mainTitle: { fontSize: 22, },
  verificationSection: { paddingTop: 10, borderTopWidth: 1 },
  sectionHeading: { marginBottom: 8 },
  switchMethodBtn: { marginTop: 12, alignSelf: 'flex-start' },
  confirmBtnFull: { height: 52, borderRadius: 26 },
  forgotBtn: { marginTop: 20, alignItems: 'center' },

  verifyContainer: { paddingVertical: 5 },
  verifyMainTitle: { fontSize: 24, marginBottom: 12 },
  verifySubtitle: { lineHeight: 20, marginBottom: 10 },
  verifyLinks: { marginTop: 30, alignItems: 'center', gap: 15 },
  verifyLinkItem: {},
  protectedFooter: { 
    marginTop: 50, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    opacity: 0.7
  },
  protectedIcon: { width: 14, height: 14, marginRight: 6, tintColor: colors.secondaryText },
});

export default ChangePassword;
