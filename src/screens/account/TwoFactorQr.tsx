/**
 * App equivalent of web TwofactorPage (index.js) – Google Authenticator setup flow only.
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Keyboard, Platform } from 'react-native';
import {
  AppSafeAreaView,
  AppText,
  Button,
  Toolbar,
  BOLD,
  FOURTEEN,
  THIRTEEN,
  SEMI_BOLD,
  EIGHTEEN,
  TEN,
} from '../../shared';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import KeyBoardAware from '../../shared/components/KeyboardAware';
import FastImage from 'react-native-fast-image';
import Clipboard from '@react-native-community/clipboard';
import { copyIcon } from '../../helper/ImageAssets';
import { showError, showSuccess } from '../../helper/logger';
import { confirm2fa } from '../../actions/accountActions';
import { SpinnerSecond } from '../../shared/components/SpinnerSecond';
import OTPInputView from '@twotalltotems/react-native-otp-input';
import NavigationService from '../../navigation/NavigationService';
import { useTheme } from "../../hooks/useTheme";
import TouchableOpacityView from '../../common/TouchableOpacityView';

const CODE_LENGTH = 6;

const TwoFactorQr = () => {
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const twoFaQrData = useAppSelector(state => state.home.twoFaQrData);
  const isLoading = useAppSelector(state => state.auth.isLoading);

  const data = twoFaQrData ?? {};
  const googleQr = data?.qr_code ?? '';
  const googleCode = data?.secret?.base32 ?? '';

  const [authenticatorCode, setAuthenticatorCode] = useState('');

  useEffect(() => {
    if (!twoFaQrData && !googleQr && !googleCode) {
      const t = setTimeout(() => {
        showError('Setup data missing. Please start from Two-Factor Authentication.');
        NavigationService.goBack();
      }, 300);
      return () => clearTimeout(t);
    }
  }, [twoFaQrData, googleQr, googleCode]);

  const copyCode = () => {
    if (googleCode) {
      Clipboard.setString(googleCode);
      showSuccess('Code copied to clipboard!');
    }
  };

  const handleGoogleAuthConfirm = async () => {
    if (!authenticatorCode || authenticatorCode.length !== CODE_LENGTH) {
      showError('Please enter a valid 6-digit code');
      return;
    }
    Keyboard.dismiss();
    const success = await dispatch(confirm2fa(authenticatorCode));
    if (success) NavigationService.goBack();
  };

  const canSubmit =
    authenticatorCode.length === CODE_LENGTH && !isLoading && !!googleCode;

  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background }}>
      <Toolbar
        isSecond
        title="Scan QR Code"
        style={{ width: '100%' }}
        isCommit={false}
        isStake={false}
        isLogin={false}
      />
      <KeyBoardAware>
        <View style={styles.scrollContent}>
          <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <AppText weight={BOLD} type={FOURTEEN} style={{ color: themeColors.text }}>
              Step 2: Scan with Google Authenticator
            </AppText>
            <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, marginTop: 4 }}>
              Scan this QR code with your authenticator app to get the verification codes.
            </AppText>

            <View style={[styles.qrCodeWrapper, { backgroundColor: '#FFF' }]}>
              {googleQr ? (
                <FastImage
                  source={{ uri: googleQr }}
                  resizeMode="contain"
                  style={styles.qrImage}
                />
              ) : null}
            </View>

            <AppText weight={SEMI_BOLD} type={THIRTEEN} style={{ color: themeColors.text, marginTop: 24 }}>
              Or enter this code manually:
            </AppText>

            <View style={[styles.addressContainer, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)", borderColor: themeColors.border }]}>
              <AppText
                ellipsizeMode="middle"
                numberOfLines={1}
                weight={SEMI_BOLD}
                style={{ flex: 1, color: themeColors.text }}
              >
                {googleCode || 'Loading...'}
              </AppText>
              <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
              <TouchableOpacityView
                onPress={copyCode}
                style={styles.copyIconContainer}
                disabled={!googleCode}
              >
                <FastImage
                  source={copyIcon}
                  resizeMode="contain"
                  style={styles.copyIcon}
                  tintColor={themeColors.button}
                />
              </TouchableOpacityView>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border, marginTop: 20 }]}>
            <AppText weight={BOLD} type={FOURTEEN} style={{ color: themeColors.text }}>
              Step 3: Verify Setup
            </AppText>
            <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, marginTop: 4 }}>
              Enter the 6-digit code displayed in your authenticator app
            </AppText>

            <View style={styles.otpSection}>
              <AppText weight={SEMI_BOLD} type={THIRTEEN} style={{ color: themeColors.text, marginBottom: 12 }}>
                Authenticator Code
              </AppText>
              <OTPInputView
                style={styles.otpContainer}
                pinCount={CODE_LENGTH}
                codeInputFieldStyle={[
                  styles.otpInput,
                  { borderColor: themeColors.border, color: themeColors.text }
                ]}
                codeInputHighlightStyle={{ borderColor: themeColors.button }}
                onCodeChanged={setAuthenticatorCode}
                onCodeFilled={setAuthenticatorCode}
              />
            </View>
          </View>

          <Button
            children={isLoading ? 'Enabling...' : 'Enable Google Authenticator'}
            onPress={handleGoogleAuthConfirm}
            containerStyle={styles.button}
            disabled={!canSubmit}
            loading={isLoading}
          />
        </View>
      </KeyBoardAware>
      <SpinnerSecond />
    </AppSafeAreaView>
  );
};

export default TwoFactorQr;

const styles = StyleSheet.create({
  scrollContent: { padding: 20, paddingBottom: 40 },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 1.5 },
    }),
  },
  qrCodeWrapper: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    alignSelf: 'center',
  },
  qrImage: {
    height: 180,
    width: 180,
  },
  addressContainer: {
    marginTop: 12,
    height: 54,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 12,
  },
  copyIcon: {
    height: 20,
    width: 20,
  },
  copyIconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpSection: { marginTop: 24 },
  otpContainer: {
    width: '100%',
    height: 50,
  },
  otpInput: {
    width: 44,
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    fontSize: 20,
    fontWeight: '600',
  },
  button: {
    marginTop: 30,
  },
});
