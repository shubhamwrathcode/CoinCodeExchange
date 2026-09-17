import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Keyboard } from 'react-native';
import { AppText, BOLD, FOURTEEN, SIXTEEN, SEMI_BOLD, TWELVE, MEDIUM, TWENTY_TWO, THIRTEEN } from '../../../shared';
import { useTheme } from '../../../hooks/useTheme';
import NavigationService from '../../../navigation/NavigationService';
import FastImage from 'react-native-fast-image';
import { back_ic, pasteImg } from '../../../helper/ImageAssets';
import { colors } from '../../../theme/colors';
import * as routes from '../../../navigation/routes';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { sendSecurityOtp, verifySecurityOtp, verifySecurityTotp, getPasskeyList, verifySecurityPasskey, getPasskeyAuthCredential } from '../../../actions/accountActions';
import { logoutAction } from '../../../actions/authActions';
import { appOperation } from '../../../appOperation';
import { showError, showSuccess } from '../../../helper/logger';
import { VerificationOptionsSheet } from '../../../common/VerificationOptionsSheet';
import { Passkey } from 'react-native-passkey';

const SecurityVerification = ({ route }) => {
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();

  // Route Parameters for Reusability
  const params = route?.params || {};
  const targetScreen = params.targetScreen || routes.CHANGE_PHONE_NUMBER_SCREEN;
  const targetParams = params.targetParams || {};
  const purpose = params.purpose || 'security_verification';
  const skipDirectVerification = params.skipDirectVerification || false; // true if next screen handles final combined verification
  const returnRawCredential = params.returnRawCredential || false;

  const [passkeySupported, setPasskeySupported] = useState(false);
  const [passkeys, setPasskeys] = useState([]);

  useEffect(() => {
    try {
      const supported = Passkey.isSupported();
      setPasskeySupported(!!supported);
    } catch {
      setPasskeySupported(false);
    }

    const fetchPasskeys = async () => {
      try {
        const res = await dispatch(getPasskeyList());
        if (res?.success) {
          setPasskeys(res.data?.passkeys || []);
        }
      } catch (err) {
        console.warn('[SecurityVerification] Error fetching passkeys:', err);
      }
    };
    fetchPasskeys();
  }, [dispatch]);

  const userData = useAppSelector((state) => state.auth.userData);
  const emailId = userData?.emailId || userData?.email || '';
  const profileMobile = userData?.mobileNumber || userData?.mobile_number || '';
  const hasEmail = !!emailId;
  const hasMobile = !!profileMobile;
  const hasGoogleAuth = useMemo(() => {
    const twoFaVal = userData?.['2fa'];
    return Number(twoFaVal) === 2 || userData?.twoFaEnabled === true;
  }, [userData]);

  // Dynamic Verification Methods Initialization
  const initialVerifyMethods = useMemo(() => {
    if (params.verifyMethods && Array.isArray(params.verifyMethods) && params.verifyMethods.length > 0) {
      return params.verifyMethods;
    }
    const list = [];
    if (hasGoogleAuth) list.push('totp');
    if (hasEmail) list.push('email');
    if (hasMobile) list.push('mobile');
    return list.length > 0 ? list : ['email'];
  }, [hasEmail, hasMobile, hasGoogleAuth, params.verifyMethods]);

  // Active methods in state so it can be changed dynamically by the user (only one active method is verified at a time)
  const [activeMethods, setActiveMethods] = useState([initialVerifyMethods[0]]);

  // Sync state when dynamic initialVerifyMethods changes on mount
  useEffect(() => {
    if (initialVerifyMethods && initialVerifyMethods.length > 0) {
      setActiveMethods([initialVerifyMethods[0]]);
    }
  }, [initialVerifyMethods]);

  const fallbackToOtpMethod = () => {
    const list = [];
    if (hasGoogleAuth) list.push('totp');
    if (hasEmail) list.push('email');
    if (hasMobile) list.push('mobile');
    const fallback = list[0] || 'email';
    setActiveMethods([fallback]);
  };

  // Track keyboard active state to toggle justifyContent
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardActive(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardActive(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Input states
  const [smsCode, setSmsCode] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [totpCode, setTotpCode] = useState('');

  // Countdowns and loaders
  const [smsCountdown, setSmsCountdown] = useState(0);
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingSmsOtp, setIsSendingSmsOtp] = useState(false);
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);

  // RBSheet reference for switching methods
  const sheetRef = useRef(null);
  const sentOtpRef = useRef(new Set());

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

  const displayEmail = maskEmail(emailId);
  const displayPhone = maskPhone(profileMobile);

  // Calculate dynamic available methods that the user has enabled (always includes all active methods)
  const availableOptions = useMemo(() => {
    const list = [];

    if (hasEmail) {
      list.push({
        value: 'email',
        label: 'Email Verification',
        description: `Verify using code sent to ${displayEmail}`,
      });
    }
    if (hasMobile) {
      list.push({
        value: 'mobile',
        label: 'Phone Verification',
        description: `Verify using code sent to ${displayPhone}`,
      });
    }
    if (hasGoogleAuth) {
      list.push({
        value: 'totp',
        label: 'Google Authenticator',
        description: 'Verify using your Google Authenticator 2FA code',
      });
    }
    if (passkeySupported && passkeys && passkeys.length > 0) {
      list.push({
        value: 'passkey',
        label: 'Passkey Verification',
        description: 'Verify using your device biometric authentication',
      });
    }
    return list;
  }, [hasEmail, hasMobile, hasGoogleAuth, displayEmail, displayPhone, passkeySupported, passkeys]);

  // Auto-send OTP when active methods change
  useEffect(() => {
    if (activeMethods.includes('email') && emailId) {
      const key = `email-${purpose}`;
      if (!sentOtpRef.current.has(key)) {
        sentOtpRef.current.add(key);
        setIsSendingEmailOtp(true);
        void dispatch(sendSecurityOtp('email', purpose)).then((ok) => {
          setIsSendingEmailOtp(false);
          if (ok) setEmailCountdown(60);
          else sentOtpRef.current.delete(key);
        });
      }
    }
    if (activeMethods.includes('mobile') && profileMobile) {
      const key = `mobile-${purpose}`;
      if (!sentOtpRef.current.has(key)) {
        sentOtpRef.current.add(key);
        setIsSendingSmsOtp(true);
        void dispatch(sendSecurityOtp('mobile', purpose)).then((ok) => {
          setIsSendingSmsOtp(false);
          if (ok) setSmsCountdown(60);
          else sentOtpRef.current.delete(key);
        });
      }
    }
  }, [activeMethods, emailId, profileMobile, purpose]);

  // Timers countdown
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

  // Action handlers for resending OTPs
  const handleSendEmailOtp = async () => {
    if (emailCountdown > 0 || isSendingEmailOtp) return;
    setIsSendingEmailOtp(true);
    const ok = await dispatch(sendSecurityOtp('email', purpose));
    setIsSendingEmailOtp(false);
    if (ok) {
      setEmailCountdown(60);
    }
  };

  const handleSendSmsOtp = async () => {
    if (smsCountdown > 0 || isSendingSmsOtp) return;
    setIsSendingSmsOtp(true);
    const ok = await dispatch(sendSecurityOtp('mobile', purpose));
    setIsSendingSmsOtp(false);
    if (ok) {
      setSmsCountdown(60);
    }
  };

  // Paste handlers
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

  const handlePasskeyVerificationDirect = async (silent = false) => {
    const signId = emailId || profileMobile;
    if (!signId) {
      showError('No verification identifier found');
      fallbackToOtpMethod();
      return;
    }
    try {
      setIsSubmitting(true);
      if (returnRawCredential) {
        const credential = await dispatch(getPasskeyAuthCredential(signId, silent));
        if (credential) {
          showSuccess('Verification successful');
          NavigationService.navigate(targetScreen, {
            ...targetParams,
            passkeyVerified: true,
            passkeyCredential: credential,
          });
        } else {
          fallbackToOtpMethod();
        }
      } else {
        const result = await dispatch(verifySecurityPasskey(signId, true, silent));
        if (result) {
          showSuccess('Verification successful');
          NavigationService.navigate(targetScreen, {
            ...targetParams,
            passkeyVerified: true,
            passkeyUserId: result,
          });
        } else {
          fallbackToOtpMethod();
        }
      }
    } catch (err) {
      console.warn('[SecurityVerification] Passkey verification failed:', err);
      fallbackToOtpMethod();
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (activeMethods.includes('passkey')) {
      const t = setTimeout(() => {
        void handlePasskeyVerificationDirect(true);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [activeMethods]);

  // Submit flow
  const handleConfirm = async () => {
    Keyboard.dismiss();

    if (activeMethods.includes('passkey')) {
      await handlePasskeyVerificationDirect(false);
      return;
    }

    // 1. Validation
    if (activeMethods.includes('email') && (!emailCode || emailCode.length !== 6)) {
      showError('Please enter the 6-digit email code');
      return;
    }
    if (activeMethods.includes('mobile') && (!smsCode || smsCode.length !== 6)) {
      showError('Please enter the 6-digit SMS code');
      return;
    }
    if (activeMethods.includes('totp') && (!totpCode || totpCode.length !== 6)) {
      showError('Please enter the 6-digit Google Authenticator code');
      return;
    }

    // 2. Direct Verification (if not skipped)
    if (!skipDirectVerification) {
      setIsSubmitting(true);
      try {
        if (purpose === 'delete_account') {
          const type = activeMethods[0];
          const submitType = type === 'mobile' ? 'phone' : type;
          const code = type === 'totp' ? totpCode : (type === 'email' ? emailCode : smsCode);

          const res = await appOperation.customer.securityClosedAccount({
            type: submitType,
            code,
          });

          if (res?.success) {
            showSuccess(res?.message || 'Account successfully closed');
            dispatch(logoutAction());
            return;
          } else {
            showError(res?.message || 'Verification failed');
            setIsSubmitting(false);
            return;
          }
        }

        if (purpose === 'disable_account') {
          const type = activeMethods[0];
          const submitType = type === 'mobile' ? 'phone' : type;
          const code = type === 'totp' ? totpCode : (type === 'email' ? emailCode : smsCode);

          const res = await appOperation.customer.securityDisableAccount({
            type: submitType,
            code,
          });

          if (res?.success) {
            showSuccess(res?.message || 'Account successfully disabled');
            dispatch(logoutAction());
            return;
          } else {
            showError(res?.message || 'Verification failed');
            setIsSubmitting(false);
            return;
          }
        }

        if (purpose === 'login_2step_verification') {
          const actionData = targetParams?.pendingAction;
          if (actionData) {
            const type = activeMethods[0];
            const code = type === 'totp' ? totpCode : (type === 'email' ? emailCode : smsCode);
            const payload = {
              security_methods: actionData.method,
              code: code,
              action: actionData.action,
            };
            const res = await appOperation.customer.securityUpdateTwoLogin2Step(payload);
            if (res?.success) {
              showSuccess(res?.message || 'Setting updated successfully');
              setIsSubmitting(false);
              NavigationService.navigate(targetScreen);
              return;
            } else {
              showError(res?.message || 'Verification failed');
              setIsSubmitting(false);
              return;
            }
          }
        }

        if (activeMethods.includes('email')) {
          const ok = await dispatch(verifySecurityOtp('email', emailCode, purpose));
          if (!ok) {
            setIsSubmitting(false);
            return;
          }
        }
        if (activeMethods.includes('mobile')) {
          const ok = await dispatch(verifySecurityOtp('mobile', smsCode, purpose));
          if (!ok) {
            setIsSubmitting(false);
            return;
          }
        }
        if (activeMethods.includes('totp')) {
          const ok = await dispatch(verifySecurityTotp(totpCode, purpose));
          if (!ok) {
            setIsSubmitting(false);
            return;
          }
        }
      } catch (err) {
        setIsSubmitting(false);
        showError(err?.message || 'Verification failed');
        return;
      }
      setIsSubmitting(false);
    }

    // 3. Navigation to targetScreen with gathered codes
    if (!skipDirectVerification) {
      showSuccess('Verification successful');
    }
    NavigationService.navigate(targetScreen, {
      ...targetParams,
      emailOtp: activeMethods.includes('email') ? emailCode : undefined,
      smsOtp: activeMethods.includes('mobile') ? smsCode : undefined,
      tofaCode: activeMethods.includes('totp') ? totpCode : undefined,
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => NavigationService.goBack()}>
          <FastImage source={back_ic} tintColor={isDark ? '#FFFFFF' : '#000000'} style={{ width: 18, height: 18 }} resizeMode='contain' />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={[
          styles.contentContainer,
          { justifyContent: isKeyboardActive ? 'flex-start' : 'space-between' }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topSection}>
          <AppText type={TWENTY_TWO} weight={SEMI_BOLD} style={[styles.mainTitle, { color: themeColors.text }]}>
            Security Verification
          </AppText>
          <AppText type={THIRTEEN} weight={MEDIUM} style={[styles.subtitle, { color: '#999' }]}>
            To ensure the security of your account, please complete the following verification operations.
          </AppText>

          {/* Dynamic SMS Code Group */}
          {activeMethods.includes('mobile') && (
            <View style={styles.inputGroup}>
              <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.label, { color: themeColors.text }]}>
                Code sent to: {displayPhone || 'your registered phone'}
              </AppText>
              <View style={[styles.inputContainer, { backgroundColor: isDark ? '#2A2A2E' : '#F7F7F7' }]}>
                <TextInput
                  style={[styles.input, { color: themeColors.text }]}
                  placeholder="Please enter SMS Code"
                  placeholderTextColor="#999"
                  value={smsCode}
                  onChangeText={(v) => setSmsCode(v.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  cursorColor={colors.cyanTheme}
                />
                <TouchableOpacity onPress={handleSendSmsOtp} disabled={smsCountdown > 0 || isSendingSmsOtp} style={styles.actionBtn}>
                  {isSendingSmsOtp ? (
                    <ActivityIndicator size="small" color={isDark ? colors.white : colors.black} />
                  ) : (
                    <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: smsCountdown > 0 ? '#999' : colors.cyanTheme }}>
                      {smsCountdown > 0 ? `${smsCountdown}s` : 'Send'}
                    </AppText>
                  )}
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

          {/* Dynamic Email Code Group */}
          {activeMethods.includes('email') && (
            <View style={styles.inputGroup}>
              <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.label, { color: themeColors.text }]}>
                Code sent to: {displayEmail || 'your registered email'}
              </AppText>
              <View style={[styles.inputContainer, { backgroundColor: isDark ? '#2A2A2E' : '#F7F7F7' }]}>
                <TextInput
                  style={[styles.input, { color: themeColors.text }]}
                  placeholder="Please enter Email Code"
                  placeholderTextColor="#999"
                  value={emailCode}
                  onChangeText={(v) => setEmailCode(v.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  cursorColor={colors.cyanTheme}
                />
                <TouchableOpacity onPress={handleSendEmailOtp} disabled={emailCountdown > 0 || isSendingEmailOtp} style={styles.actionBtn}>
                  {isSendingEmailOtp ? (
                    <ActivityIndicator size={'large'} color={isDark ? colors.white : colors.black} />
                  ) : (
                    <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: emailCountdown > 0 ? '#999' : colors.cyanTheme }}>
                      {emailCountdown > 0 ? `${emailCountdown}s` : 'Send'}
                    </AppText>
                  )}
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

          {/* Dynamic Google Authenticator (TOTP) Group */}
          {activeMethods.includes('totp') && (
            <View style={styles.inputGroup}>
              <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.label, { color: themeColors.text }]}>
                Google Authenticator Code
              </AppText>
              <View style={[styles.inputContainer, { backgroundColor: isDark ? '#2A2A2E' : '#F7F7F7' }]}>
                <TextInput
                  style={[styles.input, { color: themeColors.text }]}
                  placeholder="Please enter 6-digit OTP Code"
                  placeholderTextColor="#999"
                  value={totpCode}
                  onChangeText={(v) => setTotpCode(v.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  cursorColor={colors.cyanTheme}
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

          {/* Dynamic Passkey Group */}
          {activeMethods.includes('passkey') && (
            <View style={[styles.inputGroup, { alignItems: 'center', marginVertical: 40 }]}>
              {isSubmitting ? (
                <ActivityIndicator size={'large'} color={isDark ? colors.white : colors.black} />
              ) : null}
              <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: '#999', marginTop: 15, textAlign: 'center', lineHeight: 20 }}>
                Please use your device's biometric prompt (Face ID, Touch ID, or PIN) to verify your identity.
              </AppText>
            </View>
          )}
        </View>

        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: isDark ? '#FFFFFF' : '#2A2A2E' }]}
            activeOpacity={0.8}
            onPress={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size={'large'} color={isDark ? colors.white : colors.black} />
            ) : (
              <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: isDark ? '#000000' : '#FFFFFF' }}>
                Confirm
              </AppText>
            )}
          </TouchableOpacity>

          {!params.hideChooseOther && (
            <TouchableOpacity style={styles.linkContainer} onPress={() => sheetRef.current?.open()}>
              <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.linkText, { color: themeColors.text }]}>
                Choose other verification method
              </AppText>
            </TouchableOpacity>
          )}

          {/* <TouchableOpacity
            style={[styles.linkContainer, { marginTop: 12 }]}
            onPress={() => NavigationService.navigate(routes.SECURITY_VERIFICATION_UNAVAILABLE_SCREEN)}
          >
            <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.linkText, { color: colors.cyanTheme }]}>
              Security verification unavailable?
            </AppText>
          </TouchableOpacity> */}
        </View>
      </ScrollView>


      {/* Reusable Verification Options RBSheet */}
      <VerificationOptionsSheet
        sheetRef={sheetRef}
        options={availableOptions}
        selectedValue={activeMethods[0]}
        onSelect={async (val) => {
          if (val === 'passkey') {
            sheetRef.current?.close();
            const signId = emailId || profileMobile;
            if (!signId) {
              showError('No verification identifier found');
              fallbackToOtpMethod();
              return;
            }
            try {
              setIsSubmitting(true);
              if (returnRawCredential) {
                const credential = await dispatch(getPasskeyAuthCredential(signId, false));
                if (credential) {
                  showSuccess('Verification successful');
                  NavigationService.navigate(targetScreen, {
                    ...targetParams,
                    passkeyVerified: true,
                    passkeyCredential: credential,
                  });
                } else {
                  fallbackToOtpMethod();
                }
              } else {
                const result = await dispatch(verifySecurityPasskey(signId, true, false));
                if (result) {
                  showSuccess('Verification successful');
                  NavigationService.navigate(targetScreen, {
                    ...targetParams,
                    passkeyVerified: true,
                    passkeyUserId: result,
                  });
                } else {
                  fallbackToOtpMethod();
                }
              }
            } catch (err) {
              console.warn('[SecurityVerification] Passkey verification failed:', err);
              fallbackToOtpMethod();
            } finally {
              setIsSubmitting(false);
            }
            return;
          }

          // Switch active verification method
          setActiveMethods([val]);
          // Reset entered input fields
          setSmsCode('');
          setEmailCode('');
          setTotpCode('');
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: Platform.OS === 'ios' ? 44 : 56,
  },
  headerBtn: {
    padding: 4,
    marginLeft: -8,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  topSection: {
    paddingTop: 10,
  },
  mainTitle: {
    marginBottom: 6,
  },
  subtitle: {
    lineHeight: 20,
    marginBottom: 22,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    marginBottom: 8,
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
  bottomSection: {
    marginTop: 32,
  },
  submitBtn: {
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  linkText: {
    textDecorationLine: 'underline',
  },
});

export default SecurityVerification;
