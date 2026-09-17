import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  TextInput,
  Keyboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from "../../../hooks/useTheme";
import { useAppSelector } from "../../../store/hooks";
import {
  AppSafeAreaView,
  AppText,
  BOLD,
  EIGHTEEN,
  SIXTEEN,
  MEDIUM,
  SEMI_BOLD,
  FOURTEEN,
  TWELVE,
  THIRTEEN,
} from '../../../shared';
import FastImage from 'react-native-fast-image';
import { back_ic, copy_ic, pasteImg } from '../../../helper/ImageAssets';
import * as routes from '../../../navigation/routes';

const WithdrawalVerifyEmailScreen = () => {
  const navigation = useNavigation();
  const { colors: themeColors, isDark } = useTheme();
  const userData = useAppSelector((state) => state.auth.userData);

  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const textInputRef = useRef(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const userEmail = userData?.emailId || 'sp*@gmail.com';

  const handleConfirm = () => {
    // Validation commented out for UI testing
    // if (otp.length < 6) {
    //   return;
    // }
    Keyboard.dismiss();
    // Navigate back to WithdrawalSettingsScreen on success
    navigation.navigate(routes.WITHDRAWAL_SETTINGS_SCREEN);
  };

  const handlePaste = () => {
    // Mock pasting a code
    setOtp('123456');
  };

  const handleResend = () => {
    setResendTimer(60);
    // Start interval or mock countdown
  };

  const renderOtpBoxes = () => {
    const boxes = [];
    for (let i = 0; i < 6; i++) {
      const char = otp[i] || '';
      const isFocused = otp.length === i;
      boxes.push(
        <TouchableOpacity
          key={i}
          activeOpacity={1}
          onPress={() => textInputRef.current?.focus()}
          style={[
            styles.otpBox,
            {
              backgroundColor: isDark ? '#1C1C1E' : '#F5F5F7',
              borderColor: isFocused ? (isDark ? '#FFFFFF' : '#000000') : (isDark ? '#2C2C2E' : '#E5E5EA'),
            },
          ]}
        >
          <AppText
            type={EIGHTEEN}
            weight={SEMI_BOLD}
            style={{ color: isDark ? '#FFFFFF' : '#000000', textAlign: 'center' }}
          >
            {char}
          </AppText>
        </TouchableOpacity>
      );
    }
    return boxes;
  };

  return (
    <AppSafeAreaView style={{ backgroundColor: isDark ? '#121214' : '#FFFFFF', flex: 1 }}>
      <View style={styles.flex}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <FastImage
              source={back_ic}
              style={styles.backIcon}
              tintColor={isDark ? '#FFFFFF' : '#000000'}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <View style={styles.titleContainer} />
          <View style={{ width: 24 }} />
        </View>

        {/* Content Area */}
        <View style={styles.content}>
          <AppText
            type={TWELVE}
            weight={SEMI_BOLD}
            style={[styles.mainTitle, { color: isDark ? '#FFFFFF' : '#000000', fontSize: 24, lineHeight: 30 }]}
          >
            Verify Your Email
          </AppText>

          <AppText
            type={THIRTEEN}
            weight={MEDIUM}
            style={[styles.subtitle, { color: isDark ? '#8A8A93' : '#8E8E93' }]}
          >
            The verification code has been sent to your email {userEmail}, valid for 10 minutes.
          </AppText>

          {/* Pin/OTP Boxes Row */}
          <View style={styles.otpRow}>
            {renderOtpBoxes()}
          </View>

          {/* Hidden TextInput to capture keyboard inputs */}
          <TextInput
            ref={textInputRef}
            style={styles.hiddenInput}
            value={otp}
            onChangeText={(text) => setOtp(text.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus={true}
            onFocus={() => setIsKeyboardVisible(true)}
            onBlur={() => setIsKeyboardVisible(false)}
          />

          {/* Resend and Paste Links Row */}
          <View style={styles.linksRow}>
            <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
              <AppText
                type={FOURTEEN}
                weight={MEDIUM}
                style={[styles.linkText, { color: isDark ? '#FFFFFF' : '#000000' }]}
              >
                Resend
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePaste}
              activeOpacity={0.7}
              style={styles.pasteContainer}
            >
              <FastImage
                source={pasteImg}
                style={[styles.copyIcon, { marginRight: 4 }]}
                tintColor={isDark ? '#FFFFFF' : '#000000'}
                resizeMode="contain"
              />
              <AppText
                type={FOURTEEN}
                weight={MEDIUM}
                style={[styles.linkText, { color: isDark ? '#FFFFFF' : '#000000' }]}
              >
                Paste
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom anchored Confirm Button & Help link */}
        {!isKeyboardVisible && (
          <View style={styles.bottomWrapper}>
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: isDark ? '#2E2E32' : '#2A2A2E' }]}
              activeOpacity={0.8}
              onPress={handleConfirm}
            >
              <AppText type={SIXTEEN} weight={BOLD} style={{ color: '#FFFFFF' }}>
                Confirm
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.unableLink} activeOpacity={0.7}>
              <AppText
                type={FOURTEEN}
                weight={MEDIUM}
                style={[styles.unableText, { color: isDark ? '#FFFFFF' : '#000000' }]}
              >
                Unable to Verify?
              </AppText>
            </TouchableOpacity>
          </View>
        )}

      </View>
    </AppSafeAreaView>
  );
};

export default WithdrawalVerifyEmailScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    padding: 6,
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  titleContainer: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  mainTitle: {
    marginBottom: 12,
  },
  subtitle: {
    lineHeight: 20,
    marginBottom: 32,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkText: {
  },
  pasteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copyIcon: {
    width: 14,
    height: 14,
  },
  bottomWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  confirmButton: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 20,
  },
  unableLink: {
    paddingVertical: 4,
  },
  unableText: {
    textDecorationLine: 'underline',
  },
});
