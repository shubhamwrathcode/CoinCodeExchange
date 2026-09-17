import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, TextInput, ScrollView, Keyboard } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import NavigationService from '../../../navigation/NavigationService';
import FastImage from 'react-native-fast-image';
import {
  AppSafeAreaView,
  AppText,
  SIXTEEN,
  SEMI_BOLD,
  EIGHTEEN,
  MEDIUM,
  FOURTEEN,
  TWELVE,
} from '../../../shared';
import { back_ic, eye_open_icon, eye_close_icon } from '../../../helper/ImageAssets';
import { colors } from '../../../theme/colors';
import * as routes from '../../../navigation/routes';

const ResetFundPassword = () => {
  const { colors: themeColors, isDark } = useTheme();

  const [newPassword, setNewPassword] = useState('');
  const [newPasswordAgain, setNewPasswordAgain] = useState('');

  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

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
            tintColor={isDark ? colors.white : colors.black}
            style={{ width: 18, height: 18 }}
            resizeMode='contain'
          />
        </TouchableOpacity>

        <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={[styles.headerTitle, { color: themeColors.text }]}>
          Reset Fund Password
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
            New password
          </AppText>
          <View style={[styles.inputContainer, { backgroundColor: themeColors.input }]}>
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
          <AppText type={TWELVE} style={[styles.hintText, { color: isDark ? '#8A8A93' : '#A9A9B2' }]}>
            Fund password 6 characters minimum
          </AppText>
        </View>

        {/* New Password Again field */}
        <View style={styles.inputGroup}>
          <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.label, { color: themeColors.text }]}>
            New password again
          </AppText>
          <View style={[styles.inputContainer, { backgroundColor: themeColors.input }]}>
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
      </ScrollView>

      {/* Bottom Confirm Button - Hidden when keyboard is open */}
      {!isKeyboardVisible && (
        <View style={[styles.bottomContainer, { backgroundColor: themeColors.background }]}>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: isDark ? '#FFFFFF' : '#2A2A2E' }]}
            activeOpacity={0.8}
            onPress={() => NavigationService.navigate(routes.PASSKEY_SECURITY_VERIFICATION_SCREEN, { targetScreen: routes.FUND_PASSWORD_RESET_SUCCESS_SCREEN })}
          >
            <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: isDark ? '#000000' : '#FFFFFF' }}>
              Confirm
            </AppText>
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
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: -1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
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
  hintText: {
    marginTop: 6,
    marginLeft: 4,
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
  },
});

export default ResetFundPassword;
