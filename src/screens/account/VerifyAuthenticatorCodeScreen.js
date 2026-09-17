import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
} from '../../shared';
import FastImage from 'react-native-fast-image';
import { back_ic } from '../../helper/ImageAssets';
import { confirm2fa, getUserProfile } from '../../actions/accountActions';
import { showError } from '../../helper/logger';
import { SpinnerSecond } from '../../shared/components/SpinnerSecond';
import { useTheme } from "../../hooks/useTheme";

const CODE_LENGTH = 6;

const VerifyAuthenticatorCodeScreen = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const isLoading = useAppSelector((state) => state.auth.isLoading);
  const showButtonLoading = useAppSelector((state) => state.auth.isLoading && state.auth.loadingFor !== 'otp');

  const [authenticatorCode, setAuthenticatorCode] = useState('');

  const handleEnable = async () => {
    if (!authenticatorCode || authenticatorCode.length !== CODE_LENGTH) {
      showError('Please enter a valid 6-digit code from your authenticator app');
      return;
    }
    const success = await dispatch(confirm2fa(authenticatorCode));
    if (success) {
      await dispatch(getUserProfile());
      navigation.pop(2);
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
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <FastImage source={back_ic} style={styles.backIcon} tintColor={themeColors.text} resizeMode="contain" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <AppText weight={BOLD} type={EIGHTEEN} style={[styles.title, { color: themeColors.text }]}>Verify Setup</AppText>
            <AppText type={THIRTEEN} style={[styles.subtitle, { color: themeColors.secondaryText }]}>
              Step 3: Enter the 6-digit code from your Google Authenticator app to complete setup.
            </AppText>
            <View style={{ marginTop: 24 }}>
                <OtpInput6Digit
                label="Authenticator Code"
                value={authenticatorCode}
                onChangeText={setAuthenticatorCode}
                isDark={isDark}
                />
            </View>
            <Button
              children="Enable Google Authenticator"
              onPress={handleEnable}
              loading={showButtonLoading}
              containerStyle={styles.btn}
              disabled={isLoading || authenticatorCode.length !== CODE_LENGTH}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <SpinnerSecond />
    </AppSafeAreaView>
  );
};

export default VerifyAuthenticatorCodeScreen;

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
  scrollContent: { padding: 20, paddingBottom: 40 },
  content: { borderRadius: 16, overflow: 'hidden' },
  title: { fontSize: 18 },
  subtitle: { marginTop: 6, lineHeight: 20 },
  btn: { marginTop: 30 },
});
