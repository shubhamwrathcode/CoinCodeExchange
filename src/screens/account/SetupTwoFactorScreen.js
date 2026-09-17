import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
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
  SIXTEEN,
  TWELVE,
} from '../../shared';
import FastImage from 'react-native-fast-image';
import { back_ic, copyIcon, GOOGLE_VERIFY, EMAIL_VERIFY, qrCodeIcon, apple, playstore } from '../../helper/ImageAssets';
import * as routes from '../../navigation/routes';
import TouchableOpacityView from '../../shared/components/TouchableOpacityView';
import {
  generateTwoFactorQr,
  confirm2fa,
} from '../../actions/accountActions';
import { setTwoFaData } from '../../slices/homeSlice';
import { showSuccess, showError } from '../../helper/logger';
import Clipboard from '@react-native-community/clipboard';
import { SpinnerSecond } from '../../shared/components/SpinnerSecond';
import { useTheme } from "../../hooks/useTheme";

const CODE_LENGTH = 6;

const SetupTwoFactorScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const userData = useAppSelector((state) => state.auth.userData);
  const isLoading = useAppSelector((state) => state.auth.isLoading);
  const twoFaQrData = useAppSelector((state) => state.home.twoFaQrData);

  const identityProof = route?.params?.identityProof;

  const [step, setStep] = useState(0); // 0: Install, 1: Setup, 2: Verify
  const [gaCode, setGaCode] = useState('');
  const [serverTime, setServerTime] = useState(new Date().toISOString().replace('T', ' ').split('.')[0]);

  useEffect(() => {
    const timer = setInterval(() => {
      setServerTime(new Date().toISOString().replace('T', ' ').split('.')[0]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (step === 1 && !twoFaQrData) {
      dispatch(generateTwoFactorQr());
    }
  }, [step, twoFaQrData, dispatch]);

  useEffect(() => {
    return () => {
      dispatch(setTwoFaData(undefined));
    };
  }, [dispatch]);

  const copyQrSecretCode = () => {
    const code = twoFaQrData?.secret?.base32;
    if (code) {
      Clipboard.setString(code);
      showSuccess('Code copied to clipboard!');
    }
  };

  const handleFinalSubmit = async () => {
    if (gaCode.length !== CODE_LENGTH) {
      showError('Please enter a valid 6-digit code');
      return;
    }
    const ok = await dispatch(confirm2fa(gaCode, identityProof));
    if (ok) {
      navigation.navigate(routes.ACCOUNT_SCREEN);
    }
  };

  const renderStepHeader = (num, title) => (
    <View style={styles.stepHeaderRow}>
      <View style={[styles.stepCircle, { backgroundColor: isDark ? '#262626' : '#F0F0F0' }]}>
        <AppText weight={BOLD} type={FOURTEEN} style={{ color: themeColors.text }}>{num}</AppText>
      </View>
      <AppText weight={BOLD} type={SIXTEEN} style={{ color: themeColors.text, flex: 1, marginLeft: 12 }}>{title}</AppText>
    </View>
  );

  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background }}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (step > 0) setStep(step - 1);
              else navigation.goBack();
            }}
            style={styles.backBtn}
          >
            <FastImage source={back_ic} style={styles.backIcon} tintColor={themeColors.text} resizeMode="contain" />
          </TouchableOpacity>
          <AppText weight={BOLD} type={EIGHTEEN} style={{ color: themeColors.text, marginLeft: 12 }}>
            Bind Google Authenticator
          </AppText>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {step === 0 && (
              <View>
                {renderStepHeader(1, 'Install Google Authenticator on your smartphone')}

                <View style={styles.storeRow}>
                  <TouchableOpacityView
                    onPress={() => Linking.openURL('https://apps.apple.com/app/google-authenticator/id388497605')}
                    style={[styles.storeBtn, { borderColor: themeColors.border, }]}
                  >
                    <View style={styles.storeBtnTop}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <FastImage source={apple} style={{ width: 18, height: 18, marginRight: 8 }} />
                        <AppText weight={BOLD} type={FOURTEEN} style={{ color: themeColors.text }}>App Store</AppText>
                      </View>
                      <FastImage source={qrCodeIcon} style={{ width: 18, height: 18 }} />
                    </View>

                    <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>Download from</AppText>
                  </TouchableOpacityView>

                  <TouchableOpacityView
                    onPress={() => Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2')}
                    style={[styles.storeBtn, { borderColor: themeColors.border, marginLeft: 12 }]}
                  >
                    <View style={styles.storeBtnTop}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <FastImage source={playstore} style={{ width: 18, height: 18, marginRight: 8 }} />
                        <AppText weight={BOLD} type={FOURTEEN} style={{ color: themeColors.text }}>Play Store</AppText>
                      </View>
                      <FastImage source={qrCodeIcon} style={{ width: 18, height: 18 }} />
                    </View>
                    <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>Download from</AppText>
                  </TouchableOpacityView>
                </View>

                <Button
                  children="Next"
                  onPress={() => setStep(1)}
                  containerStyle={{ marginTop: 40, backgroundColor: themeColors.button }}
                />
              </View>
            )}

            {step === 1 && (
              <View>
                {renderStepHeader(2, 'Setup Google Authenticator')}
                <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText, marginBottom: 24, marginLeft: 44, lineHeight: 20 }}>
                  Note: Please properly keep the Google verification key.
                </AppText>

                <View style={[styles.qrBox, { borderColor: themeColors.border }]}>
                  <View style={styles.qrInner}>
                    {!twoFaQrData ? (
                      <View style={[styles.qrPlaceholder, { backgroundColor: isDark ? '#262626' : '#EEE' }]} />
                    ) : (
                      <FastImage source={{ uri: twoFaQrData?.qr_code }} style={styles.qrImage} resizeMode="contain" />
                    )}
                  </View>
                  <View style={styles.keyContent}>
                    <AppText type={TWELVE} weight={BOLD} style={{ color: themeColors.text, marginBottom: 8 }}>
                      Key: {!twoFaQrData ? (
                        <View style={[styles.skeletonText, { backgroundColor: isDark ? '#262626' : '#EEE' }]} />
                      ) : (
                        <AppText type={TWELVE} style={{ color: themeColors.text }}>{twoFaQrData?.secret?.base32}</AppText>
                      )}
                    </AppText>
                    <TouchableOpacity onPress={copyQrSecretCode} style={styles.copyBtn} disabled={!twoFaQrData}>
                      <FastImage source={copyIcon} style={{ width: 18, height: 18 }} tintColor={twoFaQrData ? themeColors.text : themeColors.secondaryText} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Button
                  children="Next"
                  onPress={() => setStep(2)}
                  containerStyle={{ marginTop: 40, backgroundColor: themeColors.button }}
                  disabled={!twoFaQrData}
                />
              </View>
            )}

            {step === 2 && (
              <View>
                {renderStepHeader(3, 'Input the 6-digits dynamic code from your Google Authenticator')}
                <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText, marginBottom: 32, marginLeft: 44, lineHeight: 20 }}>
                  In the Google Authenticator, Click + to add new account. You may scan the QR code or enter provided key to add your account on Google Authenticator.
                </AppText>

                <View style={{ marginLeft: 44 }}>
                  <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 12 }}>
                    Google Authenticator Code
                  </AppText>
                  <OtpInput6Digit
                    placeholder="Please Enter"
                    value={gaCode}
                    onChangeText={setGaCode}
                    isDark={isDark}
                  />
                  <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 12 }}>
                    6 digits code on your Google Authenticator
                  </AppText>
                </View>

                <Button
                  children="Confirm"
                  onPress={handleFinalSubmit}
                  loading={isLoading}
                  containerStyle={{ marginTop: 40, backgroundColor: themeColors.button }}
                  disabled={gaCode.length !== CODE_LENGTH || isLoading}
                />
              </View>
            )}

            <View style={[styles.notesContainer, { borderTopColor: themeColors.border }]}>
              <AppText weight={BOLD} type={FOURTEEN} style={{ color: themeColors.text, marginBottom: 12 }}>Notes:</AppText>
              <AppText type={TWELVE} style={styles.noteItem}>
                1. Do not delete the Google verification code account in the Google Authenticator app, otherwise you will be restricted from account operations. If you are unable to enter the Google verification code due to phone loss, software uninstallation, etc., please contact the customer support via Email: <AppText type={TWELVE} style={{ color: '#AC8A51' }}>support@agce.com</AppText>
              </AppText>
              <AppText type={TWELVE} style={styles.noteItem}>
                2. If it keeps prompting wrong Google verification code, please check and calibrate the phone time. The current time: <AppText weight={BOLD} type={TWELVE} style={{ color: themeColors.text }}>{serverTime}</AppText>
              </AppText>
              <AppText type={TWELVE} style={styles.noteItem}>
                3. Google authentication adds a second layer of protection to your fund's safety. After enabling this feature, you will be required to enter the Google verification code every time you log in, or withdraw assets. This feature is currently available for iOS and Android devices.
              </AppText>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <SpinnerSecond />
    </AppSafeAreaView>
  );
};

export default SetupTwoFactorScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  backIcon: { width: 22, height: 22 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  stepHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  storeRow: { flexDirection: 'row', marginTop: 10, marginLeft: 44 },
  storeBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  storeBtnTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qrIconMini: { width: 14, height: 14, backgroundColor: '#888', borderRadius: 2, opacity: 0.3 },
  qrBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 44,
  },
  qrInner: { padding: 8, backgroundColor: '#fff', borderRadius: 8 },
  qrImage: { width: 100, height: 100 },
  qrPlaceholder: { width: 100, height: 100, borderRadius: 4 },
  skeletonText: { width: 120, height: 14, borderRadius: 4, marginTop: 4 },
  keyContent: { flex: 1, marginLeft: 16 },
  copyBtn: { marginTop: 8 },
  notesContainer: { marginTop: 48, paddingTop: 24, borderTopWidth: 1 },
  noteItem: { color: '#888', marginBottom: 16, lineHeight: 18 }
});
