import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from "../../../hooks/useTheme";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  AppSafeAreaView,
  AppText,
  SEMI_BOLD,
  EIGHTEEN,
  SIXTEEN,
  FOURTEEN,
  THIRTEEN,
  TWELVE,
  BOLD,
  MEDIUM,
  NORMAL,
} from '../../../shared';
import FastImage from 'react-native-fast-image';
import { antiphisinglock, back_ic, right_ic } from '../../../helper/ImageAssets';
import * as routes from '../../../navigation/routes';
import AgceGoldCard from './AgceGoldCard';
import { getAntiPhishingStatus, removeAntiPhishingCode, getPasskeyList } from '../../../actions/accountActions';
import { showError, showSuccess } from '../../../helper/logger';
import { Passkey } from 'react-native-passkey';
import { colors } from '../../../theme/colors';

const AntiPhishingStatus = ({ route }) => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const userData = useAppSelector(state => state.auth.userData);
  const { colors: themeColors, isDark } = useTheme();

  const [hasCode, setHasCode] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [isProcessingRemove, setIsProcessingRemove] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const [passkeySupported, setPasskeySupported] = useState(false);
  const [hasPasskey, setHasPasskey] = useState(false);

  React.useEffect(() => {
    let active = true;
    try {
      setPasskeySupported(Passkey.isSupported());
    } catch {
      setPasskeySupported(false);
    }

    const fetchPasskeys = async () => {
      try {
        const res = await dispatch(getPasskeyList());
        if (res?.success && active) {
          const list = res.data?.passkeys || [];
          setHasPasskey(list.length > 0);
        }
      } catch (err) {
        console.warn('[AntiPhishingStatus] Error fetching passkeys:', err);
      }
    };
    void fetchPasskeys();

    return () => {
      active = false;
    };
  }, [dispatch]);

  const isDisableFlowRef = React.useRef(false);
  isDisableFlowRef.current = !!route?.params?.isDisableFlow;

  /** Fetch anti-phishing status from API — same as web's fetchStatus */
  const fetchStatus = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await dispatch(getAntiPhishingStatus());
      if (data) {
        setHasCode(!!data.hasAntiPhishingCode);
        setCurrentCode(data.antiPhishingCode || '');
        if (typeof data.message === 'string') setStatusMessage(data.message);
      } else {
        setHasCode(false);
        setCurrentCode('');
      }
    } catch (error) {
      showError(error?.message || 'Failed to load anti-phishing status');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [dispatch]);

  /** Re-fetch every time the screen gets focus (same as web useEffect on mount) */
  useFocusEffect(
    useCallback(() => {
      // Skip fetching if we are actively processing a remove flow payload
      if (isDisableFlowRef.current) return;
      fetchStatus();
    }, [fetchStatus])
  );

  /** Mask the anti-phishing code for display: show first 2 chars + asterisks */
  const maskCode = (code) => {
    if (!code) return 'X X X X X X';
    if (code.length <= 2) return code.split('').join(' ');
    const head = code.slice(0, 2);
    const masked = '* '.repeat(Math.min(code.length - 2, 6)).trim();
    return `${head.split('').join(' ')} ${masked}`;
  };

  const handleDisablePress = () => {
    const hasGA = Number(userData?.['2fa'] || 0) === 2 || userData?.twoFaEnabled === true || userData?.isTwoFactorEnabled === true;
    const hasEmail = !!(userData?.emailId || userData?.email);
    const hasMobile = !!(userData?.mobileNumber || userData?.mobile_number);
    const methods = [];
    if (hasPasskey && passkeySupported) {
      methods.push('passkey');
    }
    if (hasEmail) methods.push('email');
    if (hasMobile) methods.push('mobile');
    if (hasGA) methods.push('totp');
    if (methods.length === 0) methods.push('email');

    navigation.navigate(routes.PASSKEY_SECURITY_VERIFICATION_SCREEN, {
      targetScreen: routes.ANTI_PHISHING_CODE_SCREEN,
      purpose: 'anti_phishing_remove',
      verifyMethods: methods,
      skipDirectVerification: true,
      targetParams: {
        isDisableFlow: true,
      },
    });
  };

  React.useEffect(() => {
    const params = route?.params || {};
    const emailOtp = params.emailOtp;
    const smsOtp = params.smsOtp;
    const tofaCode = params.tofaCode;
    const passkeyUserId = params.passkeyUserId;
    const isDisableFlow = params.isDisableFlow;

    if (!isDisableFlow) return;

    let verifyMethod = '';
    let verifyCode = '';

    if (passkeyUserId) {
      verifyMethod = 'passkey';
      verifyCode = passkeyUserId;
    } else if (tofaCode) {
      verifyMethod = 'totp';
      verifyCode = tofaCode;
    } else if (smsOtp) {
      verifyMethod = 'mobile';
      verifyCode = smsOtp;
    } else if (emailOtp) {
      verifyMethod = 'email';
      verifyCode = emailOtp;
    }

    if (!verifyMethod) return;

    const submitRemove = async () => {
      setIsProcessingRemove(true);
      try {
        const payload = { verifyMethod };
        if (verifyMethod === 'passkey') {
          payload.passkeyUserId = verifyCode;
        } else {
          payload.code = verifyCode;
        }

        const success = await dispatch(removeAntiPhishingCode(payload));
        if (success) {
          // Optimistically update the UI to prevent any blink
          setHasCode(false);
          setCurrentCode('');
          setStatusMessage('');
          // Silently sync the latest status from server
          await fetchStatus(true);
        }
      } catch (error) {
        showError(error?.message || 'Something went wrong');
      } finally {
        setIsProcessingRemove(false);
        navigation.setParams({
          isDisableFlow: undefined,
          emailOtp: undefined,
          smsOtp: undefined,
          tofaCode: undefined,
          passkeyUserId: undefined,
        });
      }
    };

    submitRemove();
  }, [route?.params, dispatch, fetchStatus, navigation]);

  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background, flex: 1 }}>
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
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
          <AppText weight={SEMI_BOLD} type={EIGHTEEN} style={[styles.headerTitle, { color: themeColors.text }]}>
            {hasCode ? 'Anti-Phishing Code Setting' : 'Anti-Phishing Code'}
          </AppText>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {loading || isProcessingRemove ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={isDark ? '#D1AA67' : '#2A2A2E'} />
          {isProcessingRemove && (
            <AppText type={FOURTEEN} style={{ color: isDark ? '#8A8A93' : '#8E8E93', marginTop: 16 }}>
              Removing anti-phishing code...
            </AppText>
          )}
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {hasCode ? (
              <View style={styles.flex}>
                {/* Reusable AGCE Gold Card showing the masked code */}
                <AgceGoldCard code={maskCode(currentCode)} isDark={isDark} />

                {statusMessage ? (
                  <AppText type={TWELVE} style={[styles.validText, { color: themeColors.secondaryText, marginTop: 10, marginBottom: 10 }]}>
                    {statusMessage}
                  </AppText>
                ) : (
                  <AppText type={TWELVE} style={[styles.validText, { color: themeColors.secondaryText, marginTop: 10, marginBottom: 10 }]}>
                    This code identifies official Coincode emails.
                  </AppText>
                )}

                {/* Edit Anti-Phishing Code Option Row */}
                <TouchableOpacity
                  style={styles.row}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate(routes.EDIT_ANTI_PHISHING_SCREEN)}
                >
                  <AppText type={SIXTEEN} weight={NORMAL} style={{ color: themeColors.text }}>
                    Change Anti-Phishing Code
                  </AppText>
                  <FastImage
                    source={right_ic}
                    style={styles.chevronIcon}
                    tintColor={isDark ? '#8A8A93' : '#9E9EAE'}
                    resizeMode="contain"
                  />
                </TouchableOpacity>

                <View style={[styles.divider, { backgroundColor: isDark ? '#1E1E22' : '#F5F5FA' }]} />

                {/* Disable Anti-Phishing Code Option Row */}
                <TouchableOpacity
                  style={styles.row}
                  activeOpacity={0.7}
                  onPress={handleDisablePress}
                >
                  <AppText type={SIXTEEN} weight={NORMAL} style={{ color: themeColors.text }}>
                    Disable Anti-Phishing Code
                  </AppText>
                  <FastImage
                    source={right_ic}
                    style={styles.chevronIcon}
                    tintColor={isDark ? '#8A8A93' : '#9E9EAE'}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.flex}>
                {/* Anti-Phishing Illustration (padlock + asterisks dialog bubble) */}
                <View style={styles.illustrationWrapper}>
                  <FastImage
                    source={antiphisinglock}
                    resizeMode="contain"
                    style={{ width: 150, height: 150 }}
                  />
                </View>

                <View style={styles.content}>
                  {/* Title */}
                  <AppText
                    type={SIXTEEN}
                    weight={SEMI_BOLD}
                    style={[styles.mainTitle, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}
                  >
                    How Does the Anti-Phishing Code Work?
                  </AppText>

                  {/* Description */}
                  <AppText
                    type={THIRTEEN}
                    weight={NORMAL}
                    style={[styles.description, { color: isDark ? '#8A8A93' : '#8E8E93' }]}
                  >
                    You can create your own anti-phishing code to appear in official Coincode emails and SMS messages. This feature helps you verify the authenticity of communications from Coincode.
                  </AppText>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Button at the bottom (only when no code is set) */}
          {!hasCode && (
            <View style={styles.bottomWrapper}>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: isDark ? '#2E2E32' : '#2A2A2E' }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate(routes.CREATE_ANTI_PHISHING_SCREEN)}
              >
                <AppText type={SIXTEEN} weight={BOLD} style={{ color: '#FFFFFF' }}>
                  Create
                </AppText>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </AppSafeAreaView>
  );
};

export default AntiPhishingStatus;

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
    paddingTop: 24,
    paddingBottom: 100,
  },
  illustrationWrapper: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40,
  },
  bubbleContainer: {
    width: 160,
    height: 80,
    borderRadius: 20,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  asterisks: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D1AA67',
    letterSpacing: 4,
  },
  lockBadge: {
    position: 'absolute',
    top: -15,
    right: -15,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lockIcon: {
    width: 22,
    height: 22,
  },
  content: {
    paddingHorizontal: 20,
  },
  mainTitle: {
    textAlign: 'left',
    marginBottom: 12,
    lineHeight: 24,
  },
  description: {
    lineHeight: 20,
  },
  validText: {
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 52,
  },
  chevronIcon: {
    width: 14,
    height: 14,
  },
  divider: {
    height: 1,
    width: '92%',
    alignSelf: 'center',
    marginVertical: 4,
  },
  bottomWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  confirmButton: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});
