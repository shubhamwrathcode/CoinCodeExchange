import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Keyboard } from 'react-native';
import { AppText, BOLD, FOURTEEN, SIXTEEN, SEMI_BOLD, TWELVE, MEDIUM, EIGHTEEN, THIRTEEN } from '../../../shared';
import { useTheme } from '../../../hooks/useTheme';
import NavigationService from '../../../navigation/NavigationService';
import * as routes from '../../../navigation/routes';
import FastImage from 'react-native-fast-image';
import CountryPicker from 'react-native-country-picker-modal';
import { back_ic, downIcon } from '../../../helper/ImageAssets';
import { colors } from '../../../theme/colors';
import { useAppDispatch } from '../../../store/hooks';
import { sendSecurityOtp, addMobileToAccount } from '../../../actions/accountActions';
import { showError } from '../../../helper/logger';
import { isValidPhoneNumber } from 'libphonenumber-js';

const PasskeyAddPhone = ({ route }) => {
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();

  // Gather upfront verified codes passed from SecurityVerification screen
  const routeParams = route?.params || {};
  const emailOtp = routeParams.emailOtp || '';
  const tofaCode = routeParams.tofaCode || '';

  // Country Picker State
  const [country, setCountry] = useState('IN');
  const [countryCode, setCountryCode] = useState(['91']);
  const [selectedCountry, setSelectedCountry] = useState({
    cca2: 'IN',
    callingCode: ['91'],
    name: 'India',
  });
  const [pickerVisible, setPickerVisible] = useState(false);

  // Form inputs
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');

  // States
  const [smsCountdown, setSmsCountdown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Countdown timer effect
  useEffect(() => {
    if (smsCountdown <= 0) return undefined;
    const t = setTimeout(() => setSmsCountdown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [smsCountdown]);

  // Loader and Keyboard state subscriptions
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardActive(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardActive(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Request SMS OTP to new phone number
  const handleSendSms = async () => {
    const rawPhone = String(phone || '').trim();
    if (!rawPhone || rawPhone.length < 6) {
      showError('Please enter your mobile number first.');
      return;
    }
    const fullPhone = `+${countryCode[0]}${rawPhone}`;
    if (!isValidPhoneNumber(fullPhone)) {
      showError('Please enter a valid phone number.');
      return;
    }
    if (smsCountdown > 0 || isSendingSms) return;

    setIsSendingSms(true);
    try {
      const ok = await dispatch(sendSecurityOtp('new_mobile', 'add_mobile', fullPhone));
      if (ok) {
        setSmsCountdown(60);
      }
    } finally {
      setIsSendingSms(false);
    }
  };

  // Submit / Complete Phone Link
  const handleConfirm = async () => {
    Keyboard.dismiss();

    const rawPhone = String(phone || '').trim();
    if (!rawPhone || rawPhone.length < 6) {
      showError('Please enter your mobile number first.');
      return;
    }
    const cCode = `+${countryCode[0]}`;
    const fullPhone = `${cCode}${rawPhone}`;
    if (!isValidPhoneNumber(fullPhone)) {
      showError('Please enter a valid phone number.');
      return;
    }
    if (!smsCode || smsCode.length !== 6) {
      showError('Please enter the 6-digit SMS code.');
      return;
    }

    setIsSubmitting(true);
    const identityPayload = {
      emailOtp,
      tofaCode,
      newMobileIdentifier: fullPhone,
    };

    const success = await dispatch(addMobileToAccount(rawPhone, cCode, smsCode, identityPayload));
    setIsSubmitting(false);

    if (success) {
      // Redirect to Passkey Management screen
      NavigationService.navigate(routes.PASSKEY_SCREEN);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#121214' : colors.white }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : '#F0F0F0' }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => NavigationService.goBack()}>
          <FastImage source={back_ic} tintColor={isDark ? colors.white : colors.black} style={{ width: 18, height: 18 }} resizeMode='contain' />
        </TouchableOpacity>

        <AppText type={EIGHTEEN} weight={BOLD} style={[styles.headerTitle, { color: themeColors.text }]}>
          Link Mobile
        </AppText>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Country Code Selection */}
        <View style={styles.inputGroup}>
          <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.label, { color: themeColors.text }]}>Country Code</AppText>
          <TouchableOpacity
            style={[styles.inputContainer, { backgroundColor: isDark ? '#2A2A2E' : '#F7F7F7', justifyContent: 'space-between' }]}
            activeOpacity={0.8}
            onPress={() => setPickerVisible(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 }}>
              {selectedCountry ? (
                <>
                  <AppText type={FOURTEEN} style={{ marginRight: 8 }}>
                    {selectedCountry.cca2.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397))}
                  </AppText>
                  <AppText type={FOURTEEN} style={{ color: themeColors.text }} numberOfLines={1}>
                    {selectedCountry.name} (+{countryCode[0]})
                  </AppText>
                </>
              ) : (
                <AppText type={FOURTEEN} style={{ color: '#999' }}>
                  Select country/region code
                </AppText>
              )}
            </View>
            <FastImage source={downIcon} style={styles.downArrow} tintColor="#999" resizeMode="contain" />
          </TouchableOpacity>
          <CountryPicker
            onSelect={(countryItem) => {
              setCountry(countryItem.cca2);
              setCountryCode([countryItem.callingCode[0]]);
              setSelectedCountry({
                cca2: countryItem.cca2,
                callingCode: [countryItem.callingCode[0]],
                name: typeof countryItem.name === 'string' ? countryItem.name : countryItem.name?.common || '',
              });
              setPickerVisible(false);
            }}
            withFilter
            withCallingCode={true}
            withEmoji
            countryCode={country}
            visible={pickerVisible}
            onClose={() => setPickerVisible(false)}
            containerButtonStyle={{ display: 'none' }}
            theme={{
              backgroundColor: isDark ? '#1E1E22' : colors.white,
              onBackgroundTextColor: themeColors.text,
              fontSize: 14,
              itemHeight: 50,
            }}
          />
        </View>

        {/* Phone Field */}
        <View style={styles.inputGroup}>
          <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.label, { color: themeColors.text }]}>Phone Number</AppText>
          <View style={[styles.inputContainer, { backgroundColor: isDark ? '#2A2A2E' : '#F7F7F7' }]}>
            <TextInput
              style={[styles.input, { color: themeColors.text }]}
              placeholder="Enter phone number"
              placeholderTextColor="#999"
              value={phone}
              onChangeText={(v) => setPhone(v.replace(/\D/g, ''))}
              keyboardType="phone-pad"
              cursorColor={isDark ? colors.white : colors.black}
            />
          </View>
        </View>

        {/* SMS Code Field */}
        <View style={styles.inputGroup}>
          <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.label, { color: themeColors.text }]}>SMS Verification Code</AppText>
          <View style={[styles.inputContainer, { backgroundColor: isDark ? '#2A2A2E' : '#F7F7F7' }]}>
            <TextInput
              style={[styles.input, { color: themeColors.text }]}
              placeholder="Enter SMS code"
              placeholderTextColor="#999"
              value={smsCode}
              onChangeText={(v) => setSmsCode(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              cursorColor={isDark ? colors.white : colors.black}
            />
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleSendSms}
              disabled={smsCountdown > 0 || isSendingSms}
            >
              {isSendingSms ? (
                <ActivityIndicator size="small" color={colors.cyanTheme} />
              ) : (
                <AppText type={THIRTEEN} weight={SEMI_BOLD} style={{ color: smsCountdown > 0 ? '#999' : colors.cyanTheme }}>
                  {smsCountdown > 0 ? `Resend (${smsCountdown}s)` : 'Get SMS'}
                </AppText>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit Button */}
        {!isKeyboardActive && (
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: isDark ? '#FFFFFF' : '#2A2A2E' }]}
            activeOpacity={0.8}
            onPress={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={isDark ? '#000' : '#FFF'} />
            ) : (
              <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: isDark ? '#000000' : '#FFFFFF' }}>
                Confirm
              </AppText>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  downArrow: {
    width: 12,
    height: 12,
    marginLeft: 10,
  },
  actionBtn: {
    paddingLeft: 10,
    justifyContent: 'center',
  },
  submitBtn: {
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
});

export default PasskeyAddPhone;
