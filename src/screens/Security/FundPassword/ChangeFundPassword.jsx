import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, TextInput, ScrollView, Keyboard, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import NavigationService from '../../../navigation/NavigationService';
import FastImage from 'react-native-fast-image';
import {
  AppSafeAreaView,
  AppText,
  SIXTEEN,
  SEMI_BOLD,
  EIGHTEEN,
  THIRTEEN,
  MEDIUM,
  FOURTEEN,
} from '../../../shared';
import { back_ic, eye_open_icon, eye_close_icon } from '../../../helper/ImageAssets';
import { colors } from '../../../theme/colors';
import * as routes from '../../../navigation/routes';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { sendSecurityOtp, securityAddFundPasswordAction, getUserProfile, getFundPasswordStatusAction } from '../../../actions/accountActions';
import { showError, showSuccess } from '../../../helper/logger';

const ChangeFundPassword = () => {
  const { colors: themeColors, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const userData = useAppSelector((state) => state.auth.userData);
  const [fundPasswordStatus, setFundPasswordStatus] = useState(null);
  const hasFundPassword = fundPasswordStatus ?? !!(userData?.fundPassword || userData?.payPin || userData?.isFundPasswordSet);

  const maskedEmail = React.useMemo(() => {
    const email = String(userData?.emailId || userData?.email || '').trim();
    if (!email || !email.includes('@')) return 'your email';
    const [name, domain] = email.split('@');
    return `${name.slice(0, 2)}***@${domain}`;
  }, [userData]);

  const verifyType = React.useMemo(() => {
    if (userData?.['2fa'] === 2) return 'totp';
    if (userData?.emailId || userData?.email) return 'email';
    if (userData?.mobileNumber || userData?.mobile_number) return 'phone';
    return 'email';
  }, [userData]);

  const getVerifyLabel = () => {
    if (verifyType === 'totp') return 'Google Authenticator Code';
    if (verifyType === 'phone') return 'Mobile Code';
    return 'Email verification code';
  };

  const getVerifyHint = () => {
    if (verifyType === 'totp') return 'Enter the 6-digit code from your authenticator app.';
    if (verifyType === 'phone') return 'Send the verification code to your mobile, and the code will be valid for 10 minutes';
    return `Send the verification code to ${maskedEmail}, and the code will be valid for 10 minutes`;
  };

  const [newPassword, setNewPassword] = useState('');
  const [newPasswordAgain, setNewPasswordAgain] = useState('');
  const [emailCode, setEmailCode] = useState('');

  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [timerCount, setTimerCount] = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);

  useEffect(() => {
    let interval = null;
    if (timerCount > 0) {
      interval = setInterval(() => {
        setTimerCount((lastTimerCount) => {
          if (lastTimerCount <= 1) {
            clearInterval(interval);
            return 0;
          }
          return lastTimerCount - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerCount]);

  const handleSendOtp = async () => {
    if (timerCount > 0 || otpLoading) return;
    setOtpLoading(true);
    const channel = verifyType === 'phone' ? 'mobile' : 'email';
    const success = await dispatch(sendSecurityOtp(channel, 'fund_password'));
    setOtpLoading(false);
    if (success) {
      setTimerCount(60);
      showSuccess('Verification code sent successfully');
    }
  };

  const handleConfirm = async () => {
    if (!newPassword || !newPasswordAgain) {
      showError('Please fill in all password fields');
      return;
    }
    if (newPassword !== newPasswordAgain) {
      showError('Passwords do not match');
      return;
    }
    if (!emailCode) {
      showError('Please enter verification code');
      return;
    }

    setIsConfirming(true);
    const payload = {
      fund_password: newPassword,
      confirm_fund_password: newPasswordAgain,
      code: emailCode,
      type: verifyType,
    };

    const success = await dispatch(securityAddFundPasswordAction(payload));
    setIsConfirming(false);
    if (success) {
      NavigationService.navigate(routes.ACCOUNT_SCREEN);
    }
  };

  const loadStatus = async () => {
    dispatch(getUserProfile(false));
    const res = await dispatch(getFundPasswordStatusAction());
    setFundPasswordStatus(!!res);
  };

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <AppSafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => NavigationService.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <FastImage
            source={back_ic}
            style={{ width: 35, height: 35 }}
            resizeMode='contain'
          />
        </TouchableOpacity>

        <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={[styles.headerTitle, { color: themeColors.text }]}>
          {hasFundPassword ? "Change fund password" : "Set fund password"}
        </AppText>
        <View style={{ width: 24 }} />
      </View>

      {/* Content ScrollView */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* New Password field */}
        <View style={styles.inputGroup}>
          <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.label, { color: themeColors.text }]}>
            New Fund Password
          </AppText>
          <View style={[styles.inputContainer, { backgroundColor: isDark ? '#2A2A2E' : '#F7F7F7' }]}>
            <TextInput
              style={[styles.input, { color: themeColors.text }]}
              placeholder="Please enter"
              placeholderTextColor={isDark ? '#8A8A93' : '#A9A9B2'}
              secureTextEntry={!showPass1}
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TouchableOpacity onPress={() => setShowPass1(!showPass1)} style={styles.eyeBtn}>
              <FastImage
                source={showPass1 ? eye_open_icon : eye_close_icon}
                style={styles.eyeIcon}
                tintColor={isDark ? '#8A8A93' : '#8E8E93'}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
          <AppText type={THIRTEEN} style={{ color: isDark ? '#8A8A93' : '#8E8E93', marginTop: 6, lineHeight: 18 }}>
            Choose a strong fund password and keep it private.
          </AppText>
        </View>

        {/* New Password Again field */}
        <View style={styles.inputGroup}>
          <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.label, { color: themeColors.text }]}>
            Confirm Fund Password
          </AppText>
          <View style={[styles.inputContainer, { backgroundColor: isDark ? '#2A2A2E' : '#F7F7F7' }]}>
            <TextInput
              style={[styles.input, { color: themeColors.text }]}
              placeholder="Please enter"
              placeholderTextColor={isDark ? '#8A8A93' : '#A9A9B2'}
              secureTextEntry={!showPass2}
              value={newPasswordAgain}
              onChangeText={setNewPasswordAgain}
            />
            <TouchableOpacity onPress={() => setShowPass2(!showPass2)} style={styles.eyeBtn}>
              <FastImage
                source={showPass2 ? eye_open_icon : eye_close_icon}
                style={styles.eyeIcon}
                tintColor={isDark ? '#8A8A93' : '#8E8E93'}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Verification Code field */}
        <View style={styles.inputGroup}>
          <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.label, { color: themeColors.text }]}>
            {getVerifyLabel()}
          </AppText>
          <View style={[styles.inputContainer, { backgroundColor: isDark ? '#2A2A2E' : '#F7F7F7' }]}>
            <TextInput
              style={[styles.input, { color: themeColors.text }]}
              placeholder="Please enter"
              placeholderTextColor={isDark ? '#8A8A93' : '#A9A9B2'}
              keyboardType="number-pad"
              value={emailCode}
              onChangeText={(val) => setEmailCode(val.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
            />
            {(verifyType === 'email' || verifyType === 'phone') && (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.sendBtn, (timerCount > 0 || otpLoading) && { opacity: 0.6 }]}
                onPress={handleSendOtp}
                disabled={timerCount > 0 || otpLoading}
              >
                {otpLoading ? (
                  <ActivityIndicator size="small" color={colors.cyanTheme} />
                ) : (
                  <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: colors.cyanTheme }}>
                    {timerCount > 0 ? `${timerCount}s` : 'Send'}
                  </AppText>
                )}
              </TouchableOpacity>
            )}
          </View>
          <AppText type={THIRTEEN} style={{ color: isDark ? '#8A8A93' : '#8E8E93', marginTop: 6, lineHeight: 18 }}>
            {getVerifyHint()}
          </AppText>
        </View>
      </ScrollView>

      {/* Bottom Confirm Button & Unable to Verify Link - Hidden when keyboard is open */}
      {!isKeyboardVisible && (
        <View style={[styles.bottomContainer, { backgroundColor: isDark ? themeColors.background : colors.white }]}>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: isDark ? '#FFFFFF' : '#2A2A2E' }]}
            activeOpacity={0.8}
            onPress={handleConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? (
              <ActivityIndicator color={isDark ? '#000000' : '#FFFFFF'} size="small" />
            ) : (
              <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: isDark ? '#000000' : '#FFFFFF' }}>
                Confirm
              </AppText>
            )}
          </TouchableOpacity>

        </View>
      )}
    </AppSafeAreaView>
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
    paddingHorizontal: 13,
    height: Platform.OS === 'ios' ? 44 : 56,
  },
  headerBtn: {
    padding: 6,
    marginLeft: -4,
  },
  headerTitle: {
    // position: 'absolute',
    // left: 0,
    // right: 0,
    // textAlign: 'center',
    // zIndex: -1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 160,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
  },
  inputContainer: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 4,
  },
  eyeIcon: {
    width: 20,
    height: 20,
  },
  sendBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 15,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingTop: 16,
    alignItems: 'center',
  },
  confirmBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 16,
  },
  unableLink: {
    paddingVertical: 4,
  },
  unableText: {
    textDecorationLine: 'underline',
  },
});

export default ChangeFundPassword;
