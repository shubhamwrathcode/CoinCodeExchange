import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity,  Platform, ActivityIndicator, Linking } from 'react-native';
import { AppText, BOLD, FOURTEEN, SIXTEEN, SEMI_BOLD, TWENTY_TWO, MEDIUM, FIFTEEN, THIRTEEN } from '../../../shared';
import { useTheme } from '../../../hooks/useTheme';
import NavigationService from '../../../navigation/NavigationService';
import FastImage from 'react-native-fast-image';
import { back_ic, download, INFO, googleAuthApp } from '../../../helper/ImageAssets';
import { colors } from '../../../theme/colors';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { Passkey } from 'react-native-passkey';
import { getPasskeyList, verifySecurityPasskey } from '../../../actions/accountActions';
import { showError } from '../../../helper/logger';
import * as routes from '../../../navigation/routes';

const DownloadAuthenticator = ({ route }) => {
  const { colors: themeColors, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const userData = useAppSelector((state) => state.auth.userData);

  const [passkeys, setPasskeys] = useState([]);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [loading, setLoading] = useState(false);

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
        console.warn('[DownloadAuthenticator] Error fetching passkeys:', err);
      }
    };
    fetchPasskeys();
  }, [dispatch]);

  const handleSetUp = async () => {
    const emailId = userData?.emailId || userData?.email || '';
    const mobileNumber = userData?.mobileNumber || userData?.mobile_number || '';
    const hasPasskeys = passkeys.length > 0;

    // Prerequisite: email must be verified/exist to enable Google Authenticator (matches web page)
    if (!emailId) {
      showError('Please verify your email first before enabling Google Authenticator.');
      return;
    }

    const { emailOtp, smsOtp, fromScreen } = route?.params || {};

    if (emailOtp || smsOtp) {
      NavigationService.navigate(routes.PASSKEY_SETUP_AUTHENTICATOR_SCREEN, {
        emailOtp,
        smsOtp,
        fromScreen,
      });
      return;
    }

    // 2. Go directly to Email/SMS/Passkey OTP Verification (starts with email by default, matches web)
    const availableFallbackMethods = [];
    if (emailId) availableFallbackMethods.push('email');
    if (mobileNumber) availableFallbackMethods.push('mobile');
    if (passkeySupported && hasPasskeys) availableFallbackMethods.push('passkey');

    if (availableFallbackMethods.length > 0) {
      NavigationService.navigate(routes.PASSKEY_SECURITY_VERIFICATION_SCREEN, {
        purpose: '2fa_setup',
        verifyMethods: availableFallbackMethods,
        targetScreen: routes.PASSKEY_SETUP_AUTHENTICATOR_SCREEN,
        skipDirectVerification: false,
      });
    } else {
      showError('No active security method available for verification.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor:themeColors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => NavigationService.goBack()}>
          <FastImage source={back_ic} tintColor={isDark? colors.white: colors.black} style={{ width: 18, height: 18 }} resizeMode='contain' />
        </TouchableOpacity>

        {/* <TouchableOpacity style={styles.iconBtn}>
          <FastImage source={INFO} tintColor={isDark? colors.white: colors.black} style={{ width: 18, height: 18 }} resizeMode='contain' />
        </TouchableOpacity> */}
      </View>

      <View style={styles.content}>
        <View style={styles.topSection}>
          <FastImage source={googleAuthApp} style={styles.illustration} resizeMode="contain" />

          <AppText type={TWENTY_TWO} weight={BOLD} style={[styles.mainTitle, { color: themeColors.text }]}>
            Download{'\n'}Google Authenticator
          </AppText>
          <AppText type={THIRTEEN} weight={MEDIUM} style={[styles.subtitle, { color: '#999' }]}>
            Use Google Authenticator to scan the QR code and securely generate verification codes.
          </AppText>

          <View style={styles.pillsContainer}>
            <TouchableOpacity
              style={[styles.downloadPill, { backgroundColor: isDark ? '#2A2A2E' : '#F7F7F7' }]}
              activeOpacity={0.8}
              onPress={() => {
                const url = Platform.OS === 'android'
                  ? 'https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2'
                  : 'https://apps.apple.com/app/google-authenticator/id388497605';
                Linking.openURL(url).catch((err) => console.warn('Failed to open link:', err));
              }}
            >
              <FastImage source={download} tintColor={themeColors.text} style={styles.downloadIcon} resizeMode="contain" />
              <AppText type={FIFTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>Google Authenticator</AppText>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: isDark ? '#FFFFFF' : '#2A2A2E' }]}
            activeOpacity={0.8}
            onPress={handleSetUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={isDark ? '#000000' : '#FFFFFF'} size="small" />
            ) : (
              <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: isDark ? '#000000' : '#FFFFFF' }}>
                Set Up Authenticator
              </AppText>
            )}
          </TouchableOpacity>
        </View>
      </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: Platform.OS === 'ios' ? 44 : 56,
  },
  headerBtn: {
    padding: 4,
    marginLeft: -8,
  },
  iconBtn: {
    padding: 4,
    marginRight: -8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  topSection: {
    alignItems: 'center',
    paddingTop: 30,
  },
  illustration: {
    width: 180,
    height: 180,
    marginBottom: 24,
  },
  mainTitle: {
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 30,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
    paddingHorizontal: 0,
  },
  pillsContainer: {
    alignItems: 'center',
    gap: 16,
  },
  downloadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  downloadIcon: {
    width: 16,
    height: 16,
    marginRight: 10,
  },
  bottomSection: {
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  submitBtn: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DownloadAuthenticator;
