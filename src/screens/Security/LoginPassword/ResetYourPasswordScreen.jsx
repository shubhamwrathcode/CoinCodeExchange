import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  Keyboard,
} from 'react-native';
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
  Input,
} from '../../../shared';
import {
  AuthEmailPhoneTabBar,
  AuthPhoneInput,
} from '../../../shared/components';
import { back_ic } from '../../../helper/ImageAssets';
import { colors } from '../../../theme/colors';
import Toast from 'react-native-simple-toast';

const ResetYourPasswordScreen = () => {
  const { colors: themeColors, isDark } = useTheme();

  const [step, setStep] = useState(1); // 1 = Email/Phone input, 2 = New password input
  const [activeTab, setActiveTab] = useState(1); // 0 = email, 1 = phone
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');

  // Step 2 States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Country Picker State
  const [countryCode, setCountryCode] = useState(['91']);
  const [country, setCountry] = useState('IN');

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

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      NavigationService.goBack();
    }
  };

  const handleNext = () => {
    if (activeTab === 1) {
      if (!phoneNumber) {
        Toast.showWithGravity("Please enter phone number", Toast.SHORT, Toast.BOTTOM);
        return;
      }
    } else {
      if (!emailAddress) {
        Toast.showWithGravity("Please enter email address", Toast.SHORT, Toast.BOTTOM);
        return;
      }
    }
    setStep(2);
  };

  const handleReset = () => {
    if (!newPassword) {
      Toast.showWithGravity("Please enter password", Toast.SHORT, Toast.BOTTOM);
      return;
    }
    if (newPassword !== confirmPassword) {
      Toast.showWithGravity("Passwords do not match", Toast.SHORT, Toast.BOTTOM);
      return;
    }

    Keyboard.dismiss();
    Toast.showWithGravity("Password reset successfully", Toast.SHORT, Toast.BOTTOM);
    NavigationService.goBack();
  };

  return (
    <AppSafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#121214' : colors.white }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleBack}
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
          Reset Your Password
        </AppText>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs - Only shown in Step 1 */}
      {step === 1 && (
        <View style={styles.tabWrapper}>
          <AuthEmailPhoneTabBar
            tabs={['Email', 'Phone']}
            index={activeTab}
            onChange={setActiveTab}
          />
        </View>
      )}

      {/* Content ScrollView */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 ? (
          activeTab === 1 ? (
            <View style={styles.inputGroup}>
              <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.label, { color: themeColors.text }]}>
                Phone Number
              </AppText>
              <AuthPhoneInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter your new phone number"
                onSelectCountry={setCountryCode}
                onCountry={setCountry}
                country={country}
                countryCode={countryCode}
                maxLength={15}
              />
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.label, { color: themeColors.text }]}>
                Email Address
              </AppText>
              <Input
                placeholder="Enter your email address"
                placeholderTextColor={isDark ? '#8A8A93' : '#A9A9B2'}
                keyboardType="email-address"
                autoCapitalize="none"
                value={emailAddress}
                onChangeText={setEmailAddress}
                containerStyle={{ backgroundColor: isDark ? '#1C1C1E' : '#F5F5F7' }}
              />
            </View>
          )
        ) : (
          // Step 2: Password Inputs
          <View>
            {/* New Password field */}
            <View style={styles.inputGroup}>
              <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.label, { color: themeColors.text }]}>
                New password
              </AppText>
              <Input
                placeholder="Please enter password"
                placeholderTextColor={isDark ? '#8A8A93' : '#A9A9B2'}
                secureTextEntry={!showNewPass}
                isSecure={true}
                onPressVisible={() => setShowNewPass(!showNewPass)}
                value={newPassword}
                onChangeText={setNewPassword}
                importantForAutofill="no"
                autoComplete="off"
                cursorColor={themeColors.text}
                containerStyle={{ backgroundColor: isDark ? '#1C1C1E' : '#F5F5F7' }}
              />
            </View>

            {/* Confirm Password field */}
            <View style={styles.inputGroup}>
              <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.label, { color: themeColors.text }]}>
                Enter password again
              </AppText>
              <Input
                placeholder="Confirm password"
                placeholderTextColor={isDark ? '#8A8A93' : '#A9A9B2'}
                secureTextEntry={!showConfirmPass}
                isSecure={true}
                onPressVisible={() => setShowConfirmPass(!showConfirmPass)}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                importantForAutofill="no"
                autoComplete="off"
                cursorColor={themeColors.text}
                containerStyle={{ backgroundColor: isDark ? '#1C1C1E' : '#F5F5F7' }}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Button - Hidden when keyboard is open */}
      {!isKeyboardVisible && (
        <View style={[styles.bottomContainer, { backgroundColor: isDark ? '#121214' : colors.white }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: isDark ? '#2E2E32' : '#2A2A2E' }]}
            activeOpacity={0.8}
            onPress={step === 1 ? handleNext : handleReset}
          >
            <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: '#FFFFFF' }}>
              {step === 1 ? 'Next' : 'Reset'}
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
  tabWrapper: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 160,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
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
  actionBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});

export default ResetYourPasswordScreen;
