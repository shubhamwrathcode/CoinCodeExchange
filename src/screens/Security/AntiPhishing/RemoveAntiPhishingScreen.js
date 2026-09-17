import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Keyboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { useTheme } from "../../../hooks/useTheme";
import {
  back_ic,
  warningImg,
  lock_ic,
} from '../../../helper/ImageAssets';
import { AppSafeAreaView, AppText, SEMI_BOLD, EIGHTEEN, FOURTEEN, SIXTEEN, TWELVE, BOLD } from '../../../shared';
import {
  getAntiPhishingStatus,
  sendAntiPhishingOtp,
  removeAntiPhishingCode,
  getPasskeyList,
  verifySecurityPasskey,
} from '../../../actions/accountActions';
import { showError, showSuccess } from '../../../helper/logger';
import { VerificationOptionsSheet } from '../../../shared/components/VerificationOptionsSheet';

const RemoveAntiPhishingScreen = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const userData = useAppSelector(state => state.auth.userData);

  // Form State
  const [availableMethods, setAvailableMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [hasPasskey, setHasPasskey] = useState(false);

  const sheetRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    fetchMethods();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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

  const fetchMethods = async () => {
    try {
      const [data, passkeyRes] = await Promise.all([
        dispatch(getAntiPhishingStatus()),
        dispatch(getPasskeyList())
      ]);

      const hasPasskeyVal = passkeyRes?.success && passkeyRes?.data?.passkeys?.length > 0;
      setHasPasskey(hasPasskeyVal);

      let methods = data?.methods || [];
      if (methods.length === 0 && userData) {
        if (hasPasskeyVal) {
          methods.push({ value: 'passkey', label: 'Passkey', target: 'passkey', description: 'Use passkey to verify' });
        }
        if (userData?.isTwoFactorEnabled) {
          methods.push({ value: 'totp', label: 'Authenticator App', target: 'totp', description: 'Enter code from Google Authenticator' });
        }
        if (userData?.emailId) {
          const email = userData.emailId;
          const [name, domain] = email.split('@');
          const maskedEmail = `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
          methods.push({ value: 'email', label: 'Email OTP', target: 'email', description: `Send code to ${maskedEmail}` });
        }
        if (userData?.mobileNumber) {
          const mobile = String(userData.mobileNumber);
          methods.push({ value: 'mobile', label: 'SMS OTP', target: 'mobile', description: `Send code to ****${mobile.slice(-4)}` });
        }
      }
      setAvailableMethods(methods);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMethodSelect = (methodValue) => {
    const method = availableMethods.find(m => m.value === methodValue);
    setSelectedMethod(method);
    setIsOtpSent(false);
    setOtp('');
    setResendTimer(0);

    if (methodValue === 'passkey') {
      handlePasskeyVerify();
    }
  };

  const handlePasskeyVerify = async () => {
    const signId = userData?.emailId || (userData?.country_code ? `${userData.country_code} ${userData.mobileNumber || ''}`.trim() : userData?.mobileNumber);
    if (!signId) {
      showError('No identifier found for passkey verification.');
      return;
    }
    try {
      const passkeyUserId = await dispatch(verifySecurityPasskey(signId));
      if (passkeyUserId) {
        const payload = {
          verifyMethod: 'passkey',
          passkeyUserId: passkeyUserId,
        };
        const success = await dispatch(removeAntiPhishingCode(payload));
        if (success) {
          showSuccess('Anti-phishing code removed successfully!');
          navigation.goBack();
        }
      }
    } catch (err) {
      showError(err?.message || 'Passkey verification failed');
    }
  };

  const handleSendOtp = async () => {
    if (!selectedMethod || isOtpLoading) return;
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

  const handleSubmit = async () => {
    // Dismiss keyboard
    Keyboard.dismiss();

    if (!selectedMethod) {
      sheetRef.current?.open();
      return;
    }

    if (selectedMethod.value === 'passkey') {
      handlePasskeyVerify();
      return;
    }

    if (!otp || otp.length < 6) {
      showError('Please enter the 6-digit OTP verification code');
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
        showSuccess('Anti-phishing code removed successfully!');
        navigation.goBack();
      }
    } catch (err) {
      showError(err?.message || 'Failed to remove code');
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
              tintColor={isDark ? '#FFFFFF' : '#000000'}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <AppText weight={SEMI_BOLD} type={EIGHTEEN} style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              Remove Anti-Phishing Code
            </AppText>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Warning Box */}
          <View style={[styles.warningBox, { backgroundColor: isDark ? '#1C1C1E' : '#F5F5F7' }]}>
            <FastImage source={warningImg} style={styles.warningIcon} resizeMode="contain" />
            <AppText type={TWELVE} style={[styles.warningPoint, { color: isDark ? '#D1D1D6' : '#4E4E54' }]}>
              Once removed, your anti-phishing code will no longer appear in official emails sent to you by our exchange. You will lose this additional layer of protection.
            </AppText>
          </View>

          {selectedMethod && selectedMethod.value !== 'passkey' && (
            <>
              {/* OTP Field */}
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.fieldLabel, { color: isDark ? '#FFFFFF' : '#1C1C1E', marginTop: 12 }]}>
                {selectedMethod.label} Verification Code
              </AppText>
              <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1C1C1E' : '#F5F5F7', flexDirection: 'row', alignItems: 'center' }]}>
                <TextInput
                  style={[styles.textInput, { color: isDark ? '#FFFFFF' : '#1C1C1E', flex: 1 }]}
                  placeholder="Enter the verification code"
                  placeholderTextColor={isDark ? '#8A8A93' : '#9E9EAE'}
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleSendOtp}
                  disabled={resendTimer > 0 || isOtpLoading}
                  style={styles.sendBtn}
                >
                  <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: '#D1AA67' }}>
                    {resendTimer > 0 ? `${resendTimer}s` : 'Send'}
                  </AppText>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>

        {/* Remove Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={[styles.confirmBtn, { backgroundColor: '#EB4D4B' }]}
        >
          <AppText
            type={SIXTEEN}
            weight={BOLD}
            style={{ color: '#FFFFFF' }}
          >
            {isSubmitting ? 'Removing...' : 'Remove'}
          </AppText>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      <VerificationOptionsSheet
        sheetRef={sheetRef}
        options={availableMethods}
        onSelect={handleMethodSelect}
      />
    </AppSafeAreaView>
  );
};

export default RemoveAntiPhishingScreen;

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
    paddingTop: 16,
    paddingBottom: 100,
  },
  warningBox: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  warningIcon: {
    width: 18,
    height: 18,
    marginTop: 2,
  },
  warningPoint: {
    flex: 1,
    lineHeight: 16,
    marginLeft: 10,
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
  },
  textInput: {
    fontSize: 14,
    padding: 0,
    flex: 1,
  },
  sendBtn: {
    paddingLeft: 12,
    justifyContent: 'center',
  },
  confirmBtn: {
    height: 50,
    borderRadius: 25,
    marginHorizontal: 16,
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
