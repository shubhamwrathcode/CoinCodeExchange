import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { useTheme } from "../../../hooks/useTheme";
import { back_ic } from '../../../helper/ImageAssets';
import { AppSafeAreaView, AppText, SEMI_BOLD, EIGHTEEN, FOURTEEN, SIXTEEN, TWELVE, BOLD, THIRTEEN, MEDIUM } from '../../../shared';
import AgceGoldCard from './AgceGoldCard';
import { showError, showSuccess } from '../../../helper/logger';
import { colors } from '../../../theme/colors';
import {
  getAntiPhishingStatus,
  removeAntiPhishingCode,
  sendAntiPhishingOtp,
  getPasskeyList,
  verifySecurityPasskey,
} from '../../../actions/accountActions';
import * as routes from '../../../navigation/routes';
import { VerificationOptionsSheet } from '../../../shared/components/VerificationOptionsSheet';

const DisableAntiPhishingScreen = ({ route }) => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const userData = useAppSelector(state => state.auth.userData);

  // States
  const [currentCode, setCurrentCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verification States
  const [availableMethods, setAvailableMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const sheetRef = useRef(null);
  const timerRef = useRef(null);

  /** Fetch current anti-phishing status and available verification methods */
  const fetchInitialData = useCallback(async () => {
    try {
      const [statusData, passkeyRes] = await Promise.all([
        dispatch(getAntiPhishingStatus()),
        dispatch(getPasskeyList())
      ]);

      if (statusData) {
        setCurrentCode(statusData.antiPhishingCode || '');
      }

      const hasPasskeyVal = passkeyRes?.success && passkeyRes?.data?.passkeys?.length > 0;

      let methods = statusData?.methods || [];
      if (methods.length === 0 && userData) {
        if (hasPasskeyVal) {
          methods.push({ value: 'passkey', label: 'Passkey', target: 'passkey', description: 'Use passkey to verify' });
        }
        if (userData?.['2fa'] == 2 || userData?.twoFaEnabled || userData?.isTwoFactorEnabled) {
          methods.push({ value: 'totp', label: 'Authenticator App', target: 'totp', description: 'Enter code from Google Authenticator' });
        }
        if (userData?.emailId || userData?.email) {
          const email = userData.emailId || userData.email;
          const [name, domain] = email.split('@');
          const maskedEmail = `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
          methods.push({ value: 'email', label: 'Email OTP', target: 'email', description: `Send code to ${maskedEmail}` });
        }
        if (userData?.mobileNumber || userData?.mobile_number) {
          const mobile = String(userData.mobileNumber || userData.mobile_number);
          methods.push({ value: 'mobile', label: 'SMS OTP', target: 'mobile', description: `Send code to ****${mobile.slice(-4)}` });
        }
      }
      setAvailableMethods(methods);

      // Auto-select preferred method based on web priority
      if (methods.length > 0) {
        const priority = ['passkey', 'totp', 'email', 'mobile'];
        let selected = null;
        for (const p of priority) {
          selected = methods.find(m => m.value === p);
          if (selected) break;
        }
        if (!selected) selected = methods[0];
        setSelectedMethod(selected);
      }
    } catch (e) {
      console.log('Error fetching initial data:', e);
    }
  }, [dispatch, userData]);

  useEffect(() => {
    fetchInitialData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchInitialData]);

  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [resendTimer]);

  const maskCode = (code) => {
    if (!code) return 'X X X X X X';
    if (code.length <= 2) return code.split('').join(' ');
    const head = code.slice(0, 2);
    const masked = '* '.repeat(Math.min(code.length - 2, 6)).trim();
    return `${head.split('').join(' ')} ${masked}`;
  };

  const handleMethodSelect = (methodValue) => {
    const method = availableMethods.find(m => m.value === methodValue);
    setSelectedMethod(method);
    setIsOtpSent(false);
    setOtp('');
    setResendTimer(0);
  };

  const handleSendOtp = async () => {
    if (!selectedMethod || isOtpLoading || selectedMethod.value === 'totp' || selectedMethod.value === 'passkey') return;
    setIsOtpLoading(true);
    try {
      const success = await dispatch(sendAntiPhishingOtp(selectedMethod.value));
      if (success) {
        setIsOtpSent(true);
        setResendTimer(60);
        showSuccess('Verification code sent successfully!');
      }
    } catch (err) {
      showError(err?.message || 'Failed to send verification code');
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handlePasskeyVerify = async () => {
    const signId = userData?.emailId || userData?.email || (userData?.country_code ? `${userData.country_code} ${userData.mobileNumber || userData.mobile_number || ''}`.trim() : (userData?.mobileNumber || userData?.mobile_number));
    if (!signId) {
      showError('No identifier found for passkey verification.');
      return;
    }
    try {
      setIsSubmitting(true);
      const passkeyUserId = await dispatch(verifySecurityPasskey(signId));
      if (passkeyUserId) {
        const payload = {
          verifyMethod: 'passkey',
          passkeyUserId: passkeyUserId,
        };
        const success = await dispatch(removeAntiPhishingCode(payload));
        if (success) {
          showSuccess('Anti-phishing code disabled successfully!');
          navigation.navigate(routes.ANTI_PHISHING_CODE_SCREEN);
        }
      }
    } catch (err) {
      showError(err?.message || 'Passkey verification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    Keyboard.dismiss();

    if (!selectedMethod) {
      showError('Please select a verification method');
      return;
    }

    if (selectedMethod.value === 'passkey') {
      handlePasskeyVerify();
      return;
    }

    if (!otp || otp.length < 6) {
      showError('Please enter the 6-digit verification code');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        verifyMethod: selectedMethod.value,
        code: otp,
      };
      const success = await dispatch(removeAntiPhishingCode(payload));
      if (success) {
        showSuccess('Anti-phishing code disabled successfully!');
        navigation.navigate(routes.ANTI_PHISHING_CODE_SCREEN);
      }
    } catch (error) {
      showError(error?.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppSafeAreaView style={{ backgroundColor: isDark ? '#121214' : '#FFFFFF', flex: 1 }}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: isDark ? '#1E1E22' : '#F0F0F0' }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <FastImage
              source={back_ic}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <AppText weight={SEMI_BOLD} type={EIGHTEEN} style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              Disable Anti-Phishing Code
            </AppText>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {isSubmitting ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={isDark ? '#D1AA67' : '#2A2A2E'} />
            <AppText type={FOURTEEN} style={{ color: isDark ? '#8A8A93' : '#8E8E93', marginTop: 16 }}>
              Removing anti-phishing code...
            </AppText>
          </View>
        ) : (
          <>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Reusable AGCE Gold Card */}
              <AgceGoldCard code={maskCode(currentCode)} isDark={isDark} />

              <AppText type={TWELVE} style={[styles.validText, { color: isDark ? '#8A8A93' : '#9E9EAE', marginTop: 10, marginBottom: 10 }]}>
                This code identifies official Coincode emails.
              </AppText>

              {/* Current Code */}
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.fieldLabel, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>
                Current Anti-phishing Code
              </AppText>
              <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1C1C1E' : '#F5F5F7', opacity: 0.7 }]}>
                <TextInput
                  style={[styles.textInput, { color: isDark ? '#8A8A93' : '#8E8E93' }]}
                  value={maskCode(currentCode)}
                  editable={false}
                />
              </View>

              {/* Security Verification Fields */}
              {selectedMethod && (
                <View style={styles.verificationSection}>
                  <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.fieldLabel, { color: isDark ? '#FFFFFF' : '#1C1C1E', marginTop: 16 }]}>
                    {selectedMethod.value === 'passkey' ? 'Verify with Passkey' : `${selectedMethod.label} Code`}
                  </AppText>

                  {selectedMethod.value !== 'passkey' ? (
                    <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1C1C1E' : '#F5F5F7', flexDirection: 'row', alignItems: 'center' }]}>
                      <TextInput
                        style={[styles.textInput, { color: isDark ? '#FFFFFF' : '#1C1C1E', flex: 1 }]}
                        placeholder="6-digit code"
                        placeholderTextColor={isDark ? '#8A8A93' : '#9E9EAE'}
                        value={otp}
                        onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                      {selectedMethod.value !== 'totp' && (
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={handleSendOtp}
                          disabled={resendTimer > 0 || isOtpLoading}
                          style={styles.sendBtn}
                        >
                          {isOtpLoading ? (
                            <ActivityIndicator size="small" color="#D1AA67" />
                          ) : (
                            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: '#D1AA67' }}>
                              {resendTimer > 0 ? `${resendTimer}s` : 'Get Code'}
                            </AppText>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <AppText type={TWELVE} style={[styles.fieldLabel, { color: isDark ? '#8A8A93' : '#9E9EAE', marginTop: 4, fontWeight: 'normal' }]}>
                      You will be prompted to use your passkey when you confirm.
                    </AppText>
                  )}

                  {availableMethods.length > 1 && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={{ marginTop: 12, marginHorizontal: 16, alignSelf: 'flex-start' }}
                      onPress={() => sheetRef.current?.open()}
                    >
                      <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: '#D1AA67' }}>
                        Switch verification method
                      </AppText>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Action button */}
            <View style={styles.bottomSection}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleConfirm}
                style={[
                  styles.confirmBtn,
                  { backgroundColor: isDark ? '#2E2E32' : '#22252A' },
                  (!selectedMethod || (selectedMethod.value !== 'passkey' && otp.length < 6)) && { opacity: 0.5 }
                ]}
                disabled={!selectedMethod || (selectedMethod.value !== 'passkey' && otp.length < 6)}
              >
                <AppText type={SIXTEEN} weight={BOLD} style={{ color: '#FFFFFF' }}>
                  Confirm
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.unableLink} activeOpacity={0.7}>
                <AppText weight={MEDIUM} type={THIRTEEN} style={[styles.unableText, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>
                  Unable to Verify?
                </AppText>
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>

      <VerificationOptionsSheet
        sheetRef={sheetRef}
        options={availableMethods}
        onSelect={handleMethodSelect}
      />
    </AppSafeAreaView>
  );
};

export default DisableAntiPhishingScreen;

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
    width: 35,
    height: 35,
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
    paddingBottom: 140,
  },
  fieldLabel: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  inputContainer: {
    borderRadius: 12,
    height: 52,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    justifyContent: 'center',
    marginBottom: 4,
  },
  textInput: {
    fontSize: 14,
    padding: 0,
    flex: 1,
  },
  validText: {
    textAlign: 'center',
  },
  verificationSection: {
    marginTop: 8,
  },
  sendBtn: {
    paddingLeft: 12,
    justifyContent: 'center',
    height: '100%',
  },
  bottomSection: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  confirmBtn: {
    height: 50,
    borderRadius: 25,
    marginHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '92%',
    marginBottom: 12,
  },
  unableLink: {
    padding: 4,
  },
  unableText: {
    textDecorationLine: 'underline',
  },
});

