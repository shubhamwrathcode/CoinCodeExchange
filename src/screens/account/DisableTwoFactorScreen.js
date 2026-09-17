import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  AppSafeAreaView,
  AppText,
  Button,
  OtpInput6Digit,
  BOLD,
  FOURTEEN,
  EIGHTEEN,
  SEMI_BOLD,
  TWELVE,
} from '../../shared';
import FastImage from 'react-native-fast-image';
import { back_ic, GOOGLE_VERIFY, copyIcon } from '../../helper/ImageAssets';
import { disable2fa } from '../../actions/accountActions';
import { SpinnerSecond } from '../../shared/components/SpinnerSecond';
import { useTheme } from "../../hooks/useTheme";
import { colors } from '../../theme/colors';

const CODE_LENGTH = 6;

const DisableTwoFactorScreen = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const isLoading = useAppSelector((state) => state.auth.isLoading);

  const [gaCode, setGaCode] = useState('');

  const handleDisableSubmit = async () => {
    if (gaCode.length !== CODE_LENGTH) {
      return;
    }
    const ok = await dispatch(disable2fa(gaCode));
    if (ok) {
      navigation.goBack();
    }
  };

  const handlePaste = async () => {
    const text = await Clipboard.getString();
    if (text && text.length === CODE_LENGTH && /^\d+$/.test(text)) {
      setGaCode(text);
    }
  };

  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background }}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <FastImage source={back_ic} style={styles.backIcon} tintColor={themeColors.text} resizeMode="contain" />
          </TouchableOpacity>
          <AppText weight={SEMI_BOLD} type={EIGHTEEN} style={{ color: themeColors.text, marginLeft: 12 }}>
            Disable Google Authenticator
          </AppText>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText, marginBottom: 10, lineHeight: 20 }}>
            Enter the 6-digit code from your Google Authenticator app to disable it.
          </AppText>

          <View style={styles.otpWrapper}>
            <View style={styles.otpHeader}>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
                Authenticator Code
              </AppText>

            </View>
            <OtpInput6Digit
              placeholder="Please Enter"
              value={gaCode}
              onChangeText={setGaCode}
              isDark={isDark}
            />
            <TouchableOpacity onPress={handlePaste} style={styles.pasteBtn}>
              <AppText type={TWELVE} weight={BOLD} style={{ color: colors.buttonBg, marginRight: 4 }}>Paste</AppText>
              <FastImage source={copyIcon} style={{ width: 14, height: 14 }} tintColor={themeColors.button} />
            </TouchableOpacity>
          </View>

          <Button
            children="Confirm"
            onPress={handleDisableSubmit}
            loading={isLoading}
            containerStyle={{ marginTop: 32, backgroundColor: themeColors.button }}
            disabled={gaCode.length !== CODE_LENGTH || isLoading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      <SpinnerSecond />
    </AppSafeAreaView>
  );
};

export default DisableTwoFactorScreen;

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
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  iconContainer: { alignItems: 'center', marginBottom: 32 },
  mainIcon: { width: 80, height: 80 },
  otpWrapper: { marginTop: 10 },
  otpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    alignSelf: 'flex-end',
    marginTop: 10
  }
});
