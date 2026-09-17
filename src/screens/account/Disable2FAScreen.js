import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  AppSafeAreaView,
  AppText,
  Button,
  OtpInput6Digit,
  BOLD,
  FOURTEEN,
  THIRTEEN,
  SEMI_BOLD,
  EIGHTEEN,
} from '../../shared';
import FastImage from 'react-native-fast-image';
import TouchableOpacityView from '../../shared/components/TouchableOpacityView';
import { back_ic, EMAIL, PHONE, KEY_ICON } from '../../helper/ImageAssets';
import { disable2fa, sendSecurityOtp } from '../../actions/accountActions';
import { showError } from '../../helper/logger';
import { SpinnerSecond } from '../../shared/components/SpinnerSecond';
import { useTheme } from "../../hooks/useTheme";

const CODE_LENGTH = 6;
const maskEmail = (email) => {
  if (!email) return '';
  const [username, domain] = email.split('@');
  if (!domain) return email;
  return `${(username || '').substring(0, 2)}***${(username || '').slice(-1)}@${domain}`;
};
const maskPhone = (phone) => {
  if (!phone) return '';
  const cleaned = String(phone).replace(/\s/g, '');
  if (cleaned.length < 4) return phone;
  return '****' + cleaned.slice(-4);
};

const Disable2FAScreen = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const userData = useAppSelector((state) => state.auth.userData);
  const isLoading = useAppSelector((state) => state.auth.isLoading);
  const showButtonLoading = useAppSelector((state) => state.auth.isLoading && state.auth.loadingFor !== 'otp');

  const emailId = userData?.emailId ?? userData?.email_id ?? '';
  const profileMobile = userData?.mobileNumber ?? userData?.mobile_number ?? '';
  const profileCountryCode = userData?.country_code ?? userData?.countryCode ?? '';
  const mobileNumber = profileCountryCode && profileMobile ? `${profileCountryCode} ${profileMobile}`.trim() : profileMobile || '';
  const hasEmail = !!emailId;
  const hasMobile = !!profileMobile;

  const [authMethod, setAuthMethod] = useState(null); // 1=email, 2=totp, 3=mobile
  const [code, setCode] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const getTitle = () => {
    if (authMethod === 2) return 'Authenticator Code';
    if (authMethod === 1) return 'Email verification';
    if (authMethod === 3) return 'Mobile verification';
    return 'Disable Google Auth';
  };
  const getDesc = () => {
    if (authMethod === 2) return 'Enter the 6-digit code from your authenticator app';
    if (authMethod === 1) return `Enter verification code sent to ${maskEmail(emailId)}`;
    if (authMethod === 3) return `Enter verification code sent to ${maskPhone(mobileNumber)}`;
    return 'Choose how you want to verify your identity';
  };

  const handleSendOtp = async () => {
    if (authMethod !== 1 && authMethod !== 3) return;
    const target = authMethod === 1 ? 'email' : 'mobile';
    const ok = await dispatch(sendSecurityOtp(target, '2fa_disable'));
    if (ok) setResendTimer(60);
  };

  const handleDisable = async () => {
    if (!code || code.length !== CODE_LENGTH) {
      showError('Please enter a valid 6-digit code');
      return;
    }
    if (authMethod === 2) {
      const success = await dispatch(disable2fa(code));
      if (success) navigation.goBack();
    } else if (authMethod === 1 || authMethod === 3) {
      const verifyMethod = authMethod === 1 ? 'email' : 'mobile';
      const success = await dispatch(disable2fa(null, code, verifyMethod));
      if (success) navigation.goBack();
    }
  };

  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
          <TouchableOpacity
            onPress={() => (authMethod ? setAuthMethod(null) : navigation.goBack())}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <FastImage source={back_ic} style={styles.backIcon} tintColor={themeColors.text} resizeMode="contain" />
          </TouchableOpacity>
          <AppText weight={BOLD} type={EIGHTEEN} style={[styles.headerTitle, { color: themeColors.text }]}>{getTitle()}</AppText>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!authMethod ? (
            <View style={styles.formContent}>
              <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, marginBottom: 24 }}>{getDesc()}</AppText>
              
              {hasEmail && (
                <TouchableOpacityView
                  activeOpacity={0.8}
                  onPress={() => { setAuthMethod(1); setCode(''); setResendTimer(0); }}
                  style={[styles.methodRow, { borderColor: themeColors.border, backgroundColor: themeColors.card }]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}>
                    <FastImage source={EMAIL} style={styles.methodIcon} tintColor={themeColors.button} resizeMode="contain" />
                  </View>
                  <View style={styles.methodTextWrap}>
                    <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.text }}>Email Verification</AppText>
                    <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, marginTop: 2 }}>{`Send code to ${maskEmail(emailId)}`}</AppText>
                  </View>
                </TouchableOpacityView>
              )}
              {hasMobile && (
                <TouchableOpacityView
                   activeOpacity={0.8}
                  onPress={() => { setAuthMethod(3); setCode(''); setResendTimer(0); }}
                  style={[styles.methodRow, { borderColor: themeColors.border, backgroundColor: themeColors.card }]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}>
                    <FastImage source={PHONE} style={styles.methodIcon} tintColor={themeColors.button} resizeMode="contain" />
                  </View>
                  <View style={styles.methodTextWrap}>
                    <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.text }}>Mobile Verification</AppText>
                    <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, marginTop: 2 }}>{`Send code to ${maskPhone(mobileNumber)}`}</AppText>
                  </View>
                </TouchableOpacityView>
              )}
              <TouchableOpacityView
                 activeOpacity={0.8}
                onPress={() => { setAuthMethod(2); setCode(''); }}
                style={[styles.methodRow, { borderColor: themeColors.border, backgroundColor: themeColors.card }]}
              >
                <View style={[styles.iconWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}>
                  <FastImage source={KEY_ICON} style={styles.methodIcon} tintColor={themeColors.button} resizeMode="contain" />
                </View>
                <View style={styles.methodTextWrap}>
                  <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.text }}>Authenticator App</AppText>
                  <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, marginTop: 2 }}>Use your authenticator app</AppText>
                </View>
              </TouchableOpacityView>
            </View>
          ) : (
            <View style={styles.formContent}>
              <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, marginBottom: 24 }}>{getDesc()}</AppText>
              
              <View style={{ marginTop: 12 }}>
                <OtpInput6Digit
                  label={authMethod === 2 ? 'Authenticator Code' : 'Verification Code'}
                  value={code}
                  onChangeText={setCode}
                  isDark={isDark}
                />
              </View>

              {(authMethod === 1 || authMethod === 3) && (
                <View style={styles.resendRow}>
                  {resendTimer > 0 ? (
                    <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText }}>Resend ({resendTimer}s)</AppText>
                  ) : (
                    <TouchableOpacityView onPress={handleSendOtp} disabled={isLoading}>
                      <AppText weight={SEMI_BOLD} style={{ color: themeColors.button, fontSize: 13 }}>Send OTP</AppText>
                    </TouchableOpacityView>
                  )}
                </View>
              )}

              <Button
                children="Disable"
                onPress={handleDisable}
                loading={showButtonLoading}
                containerStyle={styles.btn}
                disabled={isLoading || code.length !== CODE_LENGTH}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <SpinnerSecond />
    </AppSafeAreaView>
  );
};

export default Disable2FAScreen;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  backIcon: { width: 22, height: 22 },
  headerTitle: { fontSize: 18, marginLeft: 12 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  formContent: { paddingTop: 8 },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 1.5 },
    }),
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIcon: { width: 22, height: 22 },
  methodTextWrap: { marginLeft: 16, flex: 1 },
  resendRow: { marginTop: 14, alignItems: 'flex-end' },
  btn: { marginTop: 30 },
});
