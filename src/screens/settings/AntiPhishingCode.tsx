import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { colors } from '../../theme/colors';
import {
  INFO,
  mailIcon,
  Reminder,
  lock_ic,
  right_ic,
  tick,
} from '../../helper/ImageAssets';
import { AppSafeAreaView, AppText, BOLD, FOURTEEN, TWELVE, WHITE } from '../../shared';
import { Button } from '../../common/Button';
import { Input } from '../../common/Input';
import { fontFamilyBold } from '../../theme/typography';
import {
  getAntiPhishingStatus,
  sendAntiPhishingOtp,
  addAntiPhishingCode,
  removeAntiPhishingCode,
  getPasskeyList,
  verifySecurityPasskey,
} from '../../actions/accountActions';
import { showError, showSuccess } from '../../helper/logger';
import { VerificationOptionsSheet } from '../../shared/components/VerificationOptionsSheet';

const SCREEN_W = Dimensions.get('window').width;
const SCROLL_PAD = 20;
const BONE_MAX_W = SCREEN_W - SCROLL_PAD * 2;
const SHIMMER_STRIP = 72;

const ShimmerBone = ({
  width,
  height,
  borderRadius = 6,
  style,
}: {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: object;
}) => {
  const wNum = typeof width === 'number' ? width : BONE_MAX_W * (parseFloat(String(width)) / 100);
  const shimmerX = useRef(new Animated.Value(-SHIMMER_STRIP)).current;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const run = () => {
      if (!mounted.current) return;
      shimmerX.setValue(-SHIMMER_STRIP);
      Animated.timing(shimmerX, {
        toValue: Math.max(wNum, 1) + SHIMMER_STRIP,
        duration: 1200,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (mounted.current && finished) run();
      });
    };
    const t = setTimeout(run, 40);
    return () => {
      mounted.current = false;
      clearTimeout(t);
      shimmerX.stopAnimation();
    };
  }, [shimmerX, wNum]);

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          overflow: 'hidden',
          backgroundColor: colors.themeElevationColor,
        },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: SHIMMER_STRIP,
          transform: [{ translateX: shimmerX }],
          backgroundColor: 'rgba(255,255,255,0.08)',
        }}
      />
    </View>
  );
};

const AntiPhishingSkeleton = () => (
  <ScrollView
    style={styles.scroll}
    contentContainerStyle={styles.scrollContent}
    showsVerticalScrollIndicator={false}
  >
    <View style={styles.header}>
      <ShimmerBone width={200} height={22} borderRadius={8} style={{ marginBottom: 10 }} />
      <ShimmerBone width={BONE_MAX_W * 0.85} height={14} borderRadius={5} />
    </View>

    <View style={[styles.statusCard, { borderColor: 'rgba(255,255,255,0.06)' }]}>
      <ShimmerBone width={100} height={14} borderRadius={5} />
      <ShimmerBone width={88} height={18} borderRadius={6} />
    </View>

    {[1, 2, 3].map(i => (
      <View key={i} style={[styles.infoItem, { marginBottom: 22 }]}>
        <ShimmerBone width={24} height={24} borderRadius={6} />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <ShimmerBone width="70%" height={15} borderRadius={5} style={{ marginBottom: 8 }} />
          <ShimmerBone width="100%" height={12} borderRadius={4} style={{ marginBottom: 5 }} />
          <ShimmerBone width="92%" height={12} borderRadius={4} />
        </View>
      </View>
    ))}

    <View style={styles.actionSection}>
      <ShimmerBone width="100%" height={50} borderRadius={12} />
      <ShimmerBone width={140} height={20} borderRadius={6} style={{ alignSelf: 'center', marginTop: 20 }} />
    </View>
  </ScrollView>
);

const AntiPhishingCode = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(state => state.auth.isLoading);
  const userData = useAppSelector(state => state.auth.userData) as any;

  const [step, setStep] = useState(0); // 0: Explainer, 1: Set/Update, 2: Remove
  const [hasCode, setHasCode] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  const [availableMethods, setAvailableMethods] = useState<any[]>([]);
  const [hasPasskey, setHasPasskey] = useState(false);

  // Form State
  const [newCodeField, setNewCodeField] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [statusReady, setStatusReady] = useState(false);

  const sheetRef = useRef<any>(null);
  const isVerifyMode = isOtpSent || (selectedMethod && selectedMethod.value !== 'passkey');

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (!statusReady) return;
    if (route.params?.initialStep === 2 && hasCode) {
      resetFormState();
      setStep(2);
      navigation.setParams({ initialStep: undefined });
    }
  }, [hasCode, route.params?.initialStep, navigation, statusReady]);

  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const fetchStatus = async () => {
    try {
      const [data, passkeyRes] = await Promise.all([
        dispatch(getAntiPhishingStatus()),
        dispatch(getPasskeyList())
      ]);
      const hasPasskeyVal = passkeyRes?.success && passkeyRes?.data?.passkeys?.length > 0;
      setHasPasskey(hasPasskeyVal);
      if (data) {
        setHasCode(data.hasAntiPhishingCode);
        setCurrentCode(data.antiPhishingCode);

        let methods = data.methods || [];
        if (methods.length === 0 && userData) {
          // Passkey Check (Parity with web buildAntiPhishingVerifyMethods)
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
      }
    } catch (e) {
      console.error('Error fetching anti-phishing status:', e);
    } finally {
      setStatusReady(true);
    }
  };

  const resetFormState = () => {
    setNewCodeField('');
    setSelectedMethod(null);
    setOtp('');
    setIsOtpSent(false);
    setResendTimer(0);
  };

  const handleMethodSelect = (methodValue: any) => {
    const method = availableMethods.find(m => m.value === methodValue);
    setSelectedMethod(method);
    setIsOtpSent(false);
    setOtp('');
    setResendTimer(0);
  };

  const handleSendOtp = async () => {
    if (!selectedMethod || isOtpLoading) return;
    setIsOtpLoading(true);
    try {
      const success = await dispatch(sendAntiPhishingOtp(selectedMethod.value));
      if (success) {
        setIsOtpSent(true);
        setResendTimer(60);
      }
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (step === 1) {
        if (!newCodeField || newCodeField.length < 5 || newCodeField.length > 8) {
          showError('Anti-phishing code must be between 5 and 8 characters');
          return;
        }
        if (!selectedMethod) {
          if (hasPasskey) {
            const signId = userData?.emailId || (userData?.country_code ? `${userData.country_code} ${userData.mobileNumber || ''}`.trim() : userData?.mobileNumber);
            if (signId) {
              const passkeyUserId = await dispatch(verifySecurityPasskey(signId));
              if (passkeyUserId) {
                const payload = {
                  antiPhishingCode: newCodeField,
                  verifyMethod: 'passkey',
                  passkeyUserId: passkeyUserId,
                };
                const success = await dispatch(addAntiPhishingCode(payload));
                if (success) {
                  await fetchStatus();
                  navigation.goBack();
                }
                return;
              }
            }
          }
          sheetRef.current?.open();
          return;
        }
      } else if (step === 2) {
        if (!selectedMethod) {
          if (hasPasskey) {
            const signId = userData?.emailId || (userData?.country_code ? `${userData.country_code} ${userData.mobileNumber || ''}`.trim() : userData?.mobileNumber);
            if (signId) {
              const passkeyUserId = await dispatch(verifySecurityPasskey(signId));
              if (passkeyUserId) {
                const success = await dispatch(removeAntiPhishingCode({
                  verifyMethod: 'passkey',
                  passkeyUserId: passkeyUserId,
                }));
                if (success) {
                  await fetchStatus();
                  navigation.goBack();
                }
                return;
              }
            }
          }
          sheetRef.current?.open();
          return;
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!selectedMethod || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (step === 1) {
        const payload: any = {
          antiPhishingCode: newCodeField,
          verifyMethod: selectedMethod.value,
        };
        if (selectedMethod.value !== 'passkey') {
          payload.code = otp;
        }
        const success = await dispatch(addAntiPhishingCode(payload));
        if (success) {
          await fetchStatus();
          navigation.goBack();
        }
      } else if (step === 2) {
        const payload: any = {
          verifyMethod: selectedMethod.value,
        };
        if (selectedMethod.value !== 'passkey') {
          payload.code = otp;
        }
        const success = await dispatch(removeAntiPhishingCode(payload));
        if (success) {
          await fetchStatus();
          navigation.goBack();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderExplainer = () => (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <AppText style={styles.title} weight={BOLD}>
          Anti-phishing Code
        </AppText>
        <AppText style={styles.subtitle}>
          Ensure the emails you receive are from us.
        </AppText>
      </View>

      {/* <View style={styles.statusCard}>
        <AppText style={styles.codeLabel}>Current Status</AppText>
        <AppText style={styles.codeValue}>
          {hasCode ? 'Enabled' : 'Disabled'}
        </AppText>
      </View> */}

      <View style={styles.infoSection}>
        <View style={styles.infoItem}>
          <FastImage source={INFO} resizeMode='contain' style={styles.itemIcon} tintColor={colors.buttonBg} />
          <View style={styles.itemTextContent}>
            <AppText style={styles.itemTitle}>What is anti-phishing code?</AppText>
            <AppText style={styles.itemDesc}>It's a private code that adds an extra layer of security. Once set, it will be included in all official emails sent to you by the platform.</AppText>
          </View>
        </View>

        <View style={styles.infoItem}>
          <FastImage source={mailIcon} style={styles.itemIcon} tintColor={colors.buttonBg} />
          <View style={styles.itemTextContent}>
            <AppText style={styles.itemTitle}>How does it work?</AppText>
            <AppText style={styles.itemDesc}>When you receive an email, check if it contains your code. If the code is missing or incorrect, the email is likely a phishing attempt.</AppText>
          </View>
        </View>

        <View style={styles.infoItem}>
          <FastImage source={Reminder} style={styles.itemIcon} tintColor={colors.buttonBg} />
          <View style={styles.itemTextContent}>
            <AppText style={styles.itemTitle}>Safety First</AppText>
            <AppText style={styles.itemDesc}>Never share your anti-phishing code with anyone, including our Customer Support.</AppText>
          </View>
        </View>
      </View>

      <View style={styles.actionSection}>
        <Button
          onPress={() => {
            resetFormState();
            setStep(hasCode ? 2 : 1);
          }}
          containerStyle={{
            ...styles.primaryBtn,
            ...(hasCode ? { backgroundColor: '#EB4D4B' } : {}),
          }}
        >
          <AppText weight={BOLD} type={FOURTEEN} color={WHITE}>{hasCode ? 'Remove' : 'Get Started'}</AppText>
        </Button>
      </View>
    </ScrollView>
  );

  const renderForm = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {step === 1 ? (
          <>
            <AppText style={styles.formViewTitle}>
              {hasCode ? 'Update Anti-phishing Code' : 'Enable Anti-phishing Code'}
            </AppText>
            <AppText style={styles.formViewSubtitle}>
              Enhance your account security by setting a personal code to identify official emails.
            </AppText>

            <View style={styles.warningContainer}>
              <FastImage source={Reminder} style={styles.warningIcon} tintColor={colors.white} />
              <AppText style={styles.warningMessage}>
                After successfully setting your code, all official emails sent to your secure email address by our exchange will include this security identifier. Keep it safe and never share it.
              </AppText>
            </View>

            <View style={styles.enableTitleSection}>
              <FastImage source={lock_ic} style={styles.lockIcon} tintColor={colors.white} />
              <AppText style={styles.enableTitleText}>
                {hasCode ? 'New Anti-Phishing Code' : 'Anti-Phishing Code'}
              </AppText>
            </View>
            <AppText style={styles.enableSubtitleText}>
              Please enter 5 to 8 digits. Do not use commonly used passwords.
            </AppText>

            <Input
              placeholder="Enter digits"
              value={newCodeField}
              onChangeText={(val) => setNewCodeField(val.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              maxLength={8}
              style={styles.formInput}
            />
          </>
        ) : (
          <>
            <AppText style={styles.formViewTitle}>Remove Anti-phishing Code</AppText>
            <AppText style={styles.formViewSubtitle}>Verify your identity to remove the anti-phishing code</AppText>

            <View style={styles.removeInfoBox}>
              <View style={styles.removeInfoTitleRow}>
                <FastImage source={lock_ic} style={[styles.warningIcon, { marginTop: 0 }]} tintColor={colors.white} />
                <AppText style={styles.removeInfoTitle}>What happens when you remove?</AppText>
              </View>
              <AppText style={styles.removeInfoDesc}>
                Once removed, your anti-phishing code will no longer appear in official emails sent to you by our exchange. You will lose this additional layer of protection that helps you verify authentic communications and identify phishing attempts.
              </AppText>
            </View>

            <View style={[styles.warningContainer, { padding: 14, marginBottom: 30 }]}>
              <FastImage source={Reminder} style={styles.warningIcon} tintColor={colors.descText} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText style={{ fontSize: 14, color: colors.white, fontWeight: '600', marginBottom: 4 }}>Reminder:</AppText>
                <AppText style={styles.warningMessage}>
                  You can set a new anti-phishing code anytime from Security Settings. We recommend keeping this feature enabled to protect your account.
                </AppText>
              </View>
            </View>
          </>
        )}

        {selectedMethod && selectedMethod.value !== 'passkey' && (
          <View style={styles.otpSection}>
            <Input
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChangeText={setOtp}
              isOtp={true}
              onSendOtp={handleSendOtp}
              otpText={resendTimer > 0 ? `Resend ${resendTimer}s` : (isOtpSent ? 'Resend' : 'Get Code')}
              isOtpDisabled={resendTimer > 0 || isOtpLoading}
            />
          </View>
        )}

        <Button
          onPress={isOtpSent || (selectedMethod && selectedMethod.value === 'passkey') ? handleFinalSubmit : handleSubmit}
          containerStyle={[styles.formSubmitBtn, step === 2 && !selectedMethod && { backgroundColor: '#EB4D4B' }]}
          loading={isSubmitting}
          disabled={isVerifyMode && otp.length < 6}
        >
          {isOtpSent || (selectedMethod && selectedMethod.value !== 'passkey') ? (
            <>
              <AppText weight={BOLD} type={FOURTEEN} color={WHITE}>Verify & {step === 1 ? 'Submit' : 'Remove'}</AppText>
            </>
          ) : (
            <>
              <AppText weight={BOLD} type={FOURTEEN} color={WHITE}>{step === 1 ? 'Submit' : 'Remove'}</AppText>
            </>
          )}
        </Button>

        <TouchableOpacity
          style={[styles.secondaryBtn, { marginTop: 12 }]}
          onPress={() => navigation.goBack()}
        >
          <AppText style={styles.secondaryBtnText}>
            Cancel
          </AppText>
        </TouchableOpacity>
      </ScrollView>

      <VerificationOptionsSheet
        sheetRef={sheetRef}
        options={availableMethods as any}
        onSelect={handleMethodSelect}
      />
    </KeyboardAvoidingView>
  );

  return (
    <AppSafeAreaView style={{ backgroundColor: colors.newThemeColor }}>
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <FastImage source={right_ic} style={{ width: 22, height: 22, transform: [{ rotate: '180deg' }] }} resizeMode='contain' tintColor={colors.white} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle} weight={BOLD}>
          Security Settings
        </AppText>
        <View style={{ width: 32 }} />
      </View>

      {!statusReady ? (
        <AntiPhishingSkeleton />
      ) : step === 0 ? (
        renderExplainer()
      ) : (
        renderForm()
      )}
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, color: colors.white },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

  header: { marginBottom: 24 },
  title: { fontSize: 22, color: colors.white, marginBottom: 8 },
  subtitle: { fontSize: 13, color: colors.descText, lineHeight: 20 },

  statusCard: {
    backgroundColor: colors.themeElevationColor,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  codeLabel: { fontSize: 13, color: colors.descText },
  codeValue: { fontSize: 16, color: colors.buttonBg },

  infoSection: { marginTop: 12 },
  infoItem: { flexDirection: 'row', marginBottom: 20 },
  itemIcon: { width: 24, height: 24, marginTop: 2 },
  itemTextContent: { flex: 1, marginLeft: 16 },
  itemTitle: { fontSize: 15, color: colors.white, marginBottom: 6 },
  itemDesc: { fontSize: 13, color: colors.descText, lineHeight: 19 },

  actionSection: { marginTop: 8 },
  primaryBtn: { height: 50 },
  secondaryBtn: { height: 50, marginTop: 16, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { color: colors.amber, fontSize: 15, fontWeight: '500' },

  formViewTitle: { fontSize: 18, color: colors.white, marginTop: 12, marginBottom: 8, fontFamily: fontFamilyBold },
  formViewSubtitle: { fontSize: 13, color: colors.descText, marginBottom: 20, lineHeight: 20 },
  formInput: { marginBottom: 16 },

  pickerTrigger: {
    backgroundColor: colors.themeElevationColor,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pickerLabel: { fontSize: 12, color: colors.descText, marginBottom: 4 },
  pickerValue: { fontSize: 15, color: colors.white },
  pickerArrow: { width: 14, height: 14 },

  otpSection: { marginBottom: 16 },

  warningContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 165, 0, 0.03)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.2)',
  },
  warningIcon: { width: 16, height: 16, marginTop: 2 },
  warningMessage: { flex: 1, marginLeft: 12, fontSize: 12, color: colors.descText, lineHeight: 18 },
  formSubmitBtn: { height: 50 },

  enableTitleSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  lockIcon: { width: 16, height: 16, marginRight: 10 },
  enableTitleText: { fontSize: 16, color: colors.white },
  enableSubtitleText: { fontSize: 12, color: colors.descText, marginBottom: 16, lineHeight: 18 },

  // Removal specific styles
  removeInfoBox: {
    backgroundColor: colors.themeElevationColor,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
  },
  removeInfoTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  removeInfoTitle: { fontSize: 15, fontWeight: '600', color: colors.white, marginLeft: 10 },
  removeInfoDesc: { fontSize: 13, color: colors.descText, lineHeight: 20 }
});

export default AntiPhishingCode;
