import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, TextInput, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from '@codler/react-native-keyboard-aware-scroll-view';
import { AppText, BOLD, FOURTEEN, SIXTEEN, SEMI_BOLD, TWELVE, MEDIUM, EIGHTEEN, THIRTEEN } from '../../../shared';
import { useTheme } from '../../../hooks/useTheme';
import NavigationService from '../../../navigation/NavigationService';
import FastImage from 'react-native-fast-image';
import { back_ic, copyIcon, paste1, qrCodeIcon } from '../../../helper/ImageAssets';
import { colors } from '../../../theme/colors';
import Clipboard from '@react-native-community/clipboard';
import { showSuccess } from '../../../helper/logger';
import { fontFamilyMedium } from '../../../theme/typography';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { generateTwoFactorQr, confirm2fa } from '../../../actions/accountActions';
import * as routes from '../../../navigation/routes';

const SetupAuthenticator = ({ route }) => {
  const { colors: themeColors, isDark } = useTheme();
  const dispatch = useAppDispatch();

  // Fetch dynamic QR details from Redux state
  const twoFaQrData = useAppSelector((state) => state.home.twoFaQrData);
  const qrImage = twoFaQrData?.qr_code || '';
  const setupKey = twoFaQrData?.secret?.base32 || '';

  // Verification codes received from the previous gate screen
  const params = route?.params || {};
  const emailOtp = params.emailOtp;
  const smsOtp = params.smsOtp;

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(generateTwoFactorQr());
  }, [dispatch]);

  const copyToClipboard = () => {
    if (!setupKey) return;
    Clipboard.setString(setupKey);
    showSuccess('Setup key copied!');
  };

  const pasteFromClipboard = async () => {
    const text = await Clipboard.getString();
    if (text) {
      setCode(text.replace(/\D/g, '').slice(0, 6));
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : '#F0F0F0' }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => NavigationService.goBack()}>
          <FastImage source={back_ic} style={{ width: 35, height: 35 }} resizeMode='contain' />
        </TouchableOpacity>

        <AppText type={EIGHTEEN} weight={BOLD} style={[styles.headerTitle, { color: themeColors.text }]}>
          Google Authenticator
        </AppText>
      </View>

      <KeyboardAwareScrollView
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={Platform.OS === 'ios' ? 24 : 60}
        keyboardOpeningTime={0}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepsContainer}>
          {/* Step 1 */}
          <View style={[styles.stepRow, { alignItems: 'stretch' }]}>
            <View style={styles.leftColumn}>
              <View style={[styles.stepCircle, { borderColor: '#000000', backgroundColor: colors.white }]}>
                <View style={[styles.stepCircleInner, { backgroundColor: '#000000' }]}>
                  <AppText type={TWELVE} weight={BOLD} style={{ color: '#FFFFFF', fontSize: 10, lineHeight: 12 }}>1</AppText>
                </View>
              </View>
              <View style={[styles.stepLine, {
                backgroundColor: isDark ? colors.white : colors.black,
              }]} />
            </View>
            <View style={styles.stepContent}>
              <AppText type={THIRTEEN} weight={MEDIUM} style={[styles.stepText, { color: themeColors.text }]}>
                Open Google Authenticator and scan the QR code below or manually enter the setup key to add your verification account securely.
              </AppText>

              <View style={styles.qrContainer}>
                {qrImage ? (
                  <FastImage source={{ uri: qrImage }} style={styles.qrImage} resizeMode="contain" />
                ) : (
                  <ActivityIndicator size="small" color="#999" />
                )}
              </View>

              <View style={[styles.keyContainer, { backgroundColor: isDark ? '#2A2A2E' : '#F7F7F7' }]}>
                <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: themeColors.text, flex: 1, paddingRight: 10 }} numberOfLines={1}>
                  {setupKey}
                </AppText>
                <TouchableOpacity onPress={copyToClipboard} style={styles.copyBtn}>
                  <FastImage source={paste1} style={styles.copyIcon} tintColor="#999" resizeMode="contain" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Step 2 */}
          <View style={[styles.stepRow, { marginTop: 12 }]}>
            <View style={styles.leftColumn}>
              <View style={[styles.stepCircle, { borderColor: '#000000', backgroundColor: colors.white }]}>
                <View style={[styles.stepCircleInner, { backgroundColor: '#000000' }]}>
                  <AppText type={TWELVE} weight={BOLD} style={{ color: '#FFFFFF', fontSize: 10, lineHeight: 12 }}>2</AppText>
                </View>
              </View>
            </View>
            <View style={[styles.stepContent]}>
              <AppText type={THIRTEEN} weight={MEDIUM} style={[styles.stepText, { color: themeColors.text }]}>
                Return to Coincode and enter the 6-digit verification code generated in your authenticator app.
              </AppText>

              <View style={[styles.inputContainer, { backgroundColor: isDark ? '#2A2A2E' : '#F7F7F7' }]}>
                <TextInput
                  style={[styles.input, { color: themeColors.text, }]}
                  placeholder="Authenticator verification code"
                  placeholderTextColor="#999"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  cursorColor={colors.black}
                />
                <TouchableOpacity onPress={pasteFromClipboard} style={styles.pasteBtn}>
                  <FastImage source={paste1} style={styles.pasteIcon} tintColor="#999" resizeMode="contain" />
                </TouchableOpacity>
              </View>
              <AppText type={TWELVE} style={{ color: '#999', marginTop: 8, marginLeft: 2 }}>
                Enter the 6-digit code from Google Authenticator
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: isDark ? '#FFFFFF' : '#2A2A2E' }]}
            activeOpacity={0.8}
            onPress={async () => {
              if (!code || code.length !== 6) {
                const { showError } = require('../../../helper/logger');
                showError('Please enter the 6-digit verification code');
                return;
              }

              let identityProof = undefined;
              if (emailOtp) {
                identityProof = { otpCode: emailOtp, verifyMethod: 'email' };
              } else if (smsOtp) {
                identityProof = { otpCode: smsOtp, verifyMethod: 'phone' };
              }

              try {
                setSubmitting(true);
                const ok = await dispatch(confirm2fa(code, identityProof));
                if (ok) {
                  if (route.params?.fromScreen) {
                    NavigationService.navigate(route.params.fromScreen);
                  } else {
                    NavigationService.navigate(routes.ACCOUNT_SCREEN);
                  }
                }
              } catch (error) {
                console.warn('[SetupAuthenticator] Failed to confirm 2FA:', error);
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={isDark ? '#000000' : '#FFFFFF'} size="small" />
            ) : (
              <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: isDark ? '#000000' : '#FFFFFF' }}>
                Confirm
              </AppText>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
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
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: -1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    justifyContent: 'space-between',
  },
  stepsContainer: {
    position: 'relative',
  },
  stepLine: {
    width: 1.5,
    flex: 1,

    marginTop: 0,
    marginBottom: -12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftColumn: {
    position: 'relative',
    alignItems: 'center',
    marginRight: 16,
  },
  stepCircleInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContent: {
    flex: 1,
  },
  stepText: {
    lineHeight: 20,
    marginBottom: 16,
  },
  qrContainer: {
    width: 150,
    height: 150,
    backgroundColor: '#FFFFFF',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  keyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  copyBtn: {
    padding: 4,
  },
  copyIcon: {
    width: 16,
    height: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
    fontFamily: fontFamilyMedium
  },
  pasteBtn: {
    padding: 4,
  },
  pasteIcon: {
    width: 16,
    height: 16,
  },
  bottomSection: {
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    marginTop: 40,
  },
  submitBtn: {
    height: 54,
    borderRadius: 27,
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

export default SetupAuthenticator;
