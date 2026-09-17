import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from "../../../hooks/useTheme";
import {
  AppSafeAreaView,
  AppText,
  BOLD,
  EIGHTEEN,
  SIXTEEN,
  MEDIUM,
  ELEVEN,
  FOURTEEN,
  TWELVE,
  SEMI_BOLD,
} from '../../../shared';
import FastImage from 'react-native-fast-image';
import { back_ic, warningImg } from '../../../helper/ImageAssets';
import { colors } from '../../../theme/colors';
import { showSuccess, showError } from '../../../helper/logger';
import * as routes from '../../../navigation/routes';
import { useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { appOperation } from '../../../appOperation';
import { getUserProfile } from '../../../actions/accountActions';

const AddPhoneNumberScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();

  const userData = useAppSelector((state) => state.auth.userData);

  const [newPhone, setNewPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef(null);
  const autoSubmitDone = useRef(false);

  // Extract upfront identity proof from SecurityVerification
  const {
    passkeyVerified,
    passkeyUserId,
    emailOtp,
    tofaCode,
  } = route.params || {};

  const handleSendCode = async () => {
    if (!newPhone) {
      showError('Please enter your phone number first');
      return;
    }
    if (newPhone.length < 6) {
      showError('Please enter a valid phone number');
      return;
    }
    const fullPhone = `+91${newPhone}`; // Using static +91 for now as per UI
    if (countdown > 0) return;

    try {
      setIsLoading(true);
      console.log('[AddPhone] securitySendOtp request -> purpose: add_mobile fullPhone:', fullPhone);
      const result = await appOperation.customer.securitySendOtp('new_mobile', 'add_mobile', fullPhone);
      console.log('[AddPhone] securitySendOtp response ->', result);
      if (result?.success) {
        showSuccess(result?.message || 'SMS code sent');
        setCountdown(60);
        timerRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        showError(result?.message || 'Failed to send SMS code');
      }
    } catch (error) {
      showError(error?.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (overridePhone, overrideSmsOtp) => {
    const phoneToUse = typeof overridePhone === 'string' ? overridePhone : newPhone;
    const smsToUse = typeof overrideSmsOtp === 'string' ? overrideSmsOtp : verificationCode;

    if (!phoneToUse) {
      showError('Please enter your phone number');
      return;
    }
    if (!smsToUse || smsToUse.length !== 6) {
      showError('Please enter the 6-digit verification code');
      return;
    }

    try {
      setIsLoading(true);


      const payload = {
        mobileNumber: phoneToUse,
        countryCode: '+91',
        mobileOtp: smsToUse,
      };

      if (passkeyVerified) {
        payload.passkeyVerified = true;
        payload.passkeyUserId = passkeyUserId;
      } else if (tofaCode) {
        payload.tofaCode = tofaCode;
      } else if (emailOtp) {
        payload.emailOtp = emailOtp;
      }

      console.log('[AddPhone] securityMobileAdd request -> payload:', payload);
      const result = await appOperation.customer.securityMobileAdd(payload);
      console.log('[AddPhone] securityMobileAdd response ->', result);

      if (result?.success) {
        showSuccess(result?.message || 'Phone number added successfully');
        dispatch(getUserProfile());
        if (route.params?.fromScreen) {
          navigation.navigate(route.params.fromScreen);
        } else {
          navigation.navigate(routes.ACCOUNT_SCREEN);
        }
      } else {
        showError(result?.message || 'Failed to add mobile number');
      }
    } catch (error) {
      showError(error?.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (route.params?.savedPhone && route.params?.savedSmsOtp) {
      setNewPhone(route.params.savedPhone);
      setVerificationCode(route.params.savedSmsOtp);

      if (route.params?.autoSubmit && route.params?.tofaCode && !autoSubmitDone.current) {
        autoSubmitDone.current = true;
        navigation.setParams({ autoSubmit: false }); // Prevent duplicate triggers
        handleConfirm(route.params.savedPhone, route.params.savedSmsOtp);
      }
    }
  }, [route.params?.savedPhone, route.params?.savedSmsOtp, route.params?.autoSubmit, route.params?.tofaCode]);

  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background, flex: 1 }}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <FastImage
              source={back_ic}
              style={styles.backIcon}
              tintColor={isDark ? colors.white : colors.black}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <AppText weight={SEMI_BOLD} type={EIGHTEEN} style={[styles.headerTitle, { color: themeColors.text }]}>
              Add Phone Number
            </AppText>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Warnings Box */}
          <View style={[styles.warningBox, { backgroundColor: isDark ? colors.inputBorder : '#F5F5F7' }]}>
            <FastImage source={warningImg} tintColor={isDark ? colors.white : colors.black} style={{ width: 18, height: 18, marginTop: 2 }} resizeMode="contain" />
            <View style={styles.warningList}>
              <AppText type={ELEVEN} style={[styles.warningPoint, { color: themeColors.secondaryText }]}>
                1. To protect your account, withdrawals will be restricted for 24 hours after adding your phone number.
              </AppText>
              <AppText type={ELEVEN} style={[styles.warningPoint, { color: themeColors.secondaryText }]}>
                2. Phone number additions on the primary account will also sync across linked subaccounts.
              </AppText>
            </View>
          </View>

          {/* New Phone Number Section */}
          <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.fieldLabel, { color: themeColors.text }]}>
            Phone Number
          </AppText>
          <View style={[styles.phoneInputContainer, { backgroundColor: isDark ? 'transparent' : '#EDEDEE', borderColor: isDark ? themeColors.border : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
            <TouchableOpacity style={styles.countryPicker} activeOpacity={0.8}>
              <AppText style={{ fontSize: 18 }}>🇮🇳</AppText>
              <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.countryCode, { color: themeColors.text }]}>
                +91
              </AppText>
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: isDark ? '#2D2D30' : '#E5E5EA' }]} />
            <TextInput
              style={[styles.textInput, { color: themeColors.text, flex: 1 }]}
              placeholder="Enter your phone number"
              placeholderTextColor={themeColors.secondaryText}
              keyboardType="number-pad"
              value={newPhone}
              onChangeText={(val) => setNewPhone(val.replace(/\D/g, ''))}
              cursorColor={isDark ? colors.white : colors.black}
            />
          </View>

          {/* SMS Verification Code Section */}
          <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.fieldLabel, { color: themeColors.text }]}>
            SMS Verification Code
          </AppText>
          <View style={[styles.inputContainer, { backgroundColor: isDark ? 'transparent' : '#EDEDEE', borderColor: isDark ? themeColors.border : 'transparent', borderWidth: isDark ? 1 : 0, flexDirection: 'row', alignItems: 'center' }]}>
            <TextInput
              style={[styles.textInput, { color: themeColors.text, flex: 1 }]}
              placeholder="Enter the verification code"
              placeholderTextColor={themeColors.secondaryText}
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="number-pad"
              cursorColor={isDark ? colors.white : colors.black}
              maxLength={6}
            />
            <TouchableOpacity
              onPress={handleSendCode}
              disabled={countdown > 0 || isLoading}
              style={styles.sendButton}
            >
              <AppText
                type={FOURTEEN}
                weight={MEDIUM}
                style={{ color: (countdown > 0 || isLoading) ? (isDark ? '#4E4E54' : '#C7C7CC') : colors.cyanTheme }}
              >
                {countdown > 0 ? `${countdown}s` : 'Send'}
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Valid for 10 minutes */}
          <AppText type={TWELVE} style={[styles.validText, { color: themeColors.secondaryText }]}>
            Valid for 10 minutes
          </AppText>
        </ScrollView>

        {/* Bottom anchored Confirm Button */}
        <View style={styles.bottomWrapper}>
          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: isDark ? colors.white : '#2A2A2E' }]}
            activeOpacity={0.8}
            onPress={handleConfirm}
            disabled={isLoading}
          >
            <AppText type={SIXTEEN} weight={BOLD} style={{ color: isDark ? colors.black : '#FFFFFF' }}>
              {isLoading ? 'Processing...' : 'Confirm'}
            </AppText>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </AppSafeAreaView>
  );
};

export default AddPhoneNumberScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  backBtn: { padding: 6 },
  backIcon: { width: 20, height: 20 },
  titleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 16, paddingBottom: 100 },
  warningBox: { flexDirection: 'row', marginHorizontal: 16, padding: 12, borderRadius: 12, marginBottom: 20 },
  warningList: { flex: 1, marginLeft: 8 },
  warningPoint: { lineHeight: 16, marginBottom: 8 },
  fieldLabel: { marginHorizontal: 16, marginBottom: 8 },
  phoneInputContainer: { flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: 8, marginHorizontal: 16, marginBottom: 20, paddingHorizontal: 12 },
  countryPicker: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  countryCode: { marginLeft: 6 },
  divider: { width: 1, height: 20, marginHorizontal: 8 },
  inputContainer: { height: 48, borderRadius: 8, marginHorizontal: 16, paddingHorizontal: 12 },
  textInput: { fontSize: 14, fontFamily: 'Inter-Regular', paddingVertical: 0 },
  sendButton: { paddingLeft: 10, justifyContent: 'center' },
  bottomWrapper: { position: 'absolute', bottom: Platform.OS === 'ios' ? 24 : 16, left: 0, right: 0, paddingHorizontal: 16 },
  confirmButton: { height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', width: '100%' },
  validText: { marginHorizontal: 16, marginTop: 8 },
});
