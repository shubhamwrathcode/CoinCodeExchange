import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  TextInput,
} from 'react-native';
import { KeyboardAwareScrollView } from '@codler/react-native-keyboard-aware-scroll-view';
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
import { ColorSpace } from 'react-native-reanimated';

const ChangePhoneNumberScreen = () => {
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
      showError('Please enter your new phone number first');
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
      console.log('[ChangePhone] securitySendOtp request -> purpose: change_mobile fullPhone:', fullPhone);
      const result = await appOperation.customer.securitySendOtp('new_mobile', 'change_mobile', fullPhone);
      console.log('[ChangePhone] securitySendOtp response ->', result);
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
      showError('Please enter your new phone number');
      return;
    }
    if (!smsToUse || smsToUse.length !== 6) {
      showError('Please enter the 6-digit verification code');
      return;
    }

    try {
      setIsLoading(true);


      const initData = {
        newCountryCode: '+91', // Static for now as per UI
        newMobileNumber: phoneToUse,
      };

      if (passkeyVerified) {
        initData.passkeyVerified = true;
        initData.passkeyUserId = passkeyUserId;
      } else if (tofaCode) {
        initData.tofaCode = tofaCode;
      } else if (emailOtp) {
        initData.currentEmailOtp = emailOtp;
      }

      console.log('[ChangePhone] securityMobileChangeInitiate request -> initData:', initData);
      const initResult = await appOperation.customer.securityMobileChangeInitiate(initData);
      console.log('[ChangePhone] securityMobileChangeInitiate response ->', initResult);
      if (!initResult?.success) {
        showError(initResult?.message || 'Failed to initiate mobile change');
        return;
      }

      console.log('[ChangePhone] securityMobileChangeComplete request -> newMobileOtp:', smsToUse);
      const completeResult = await appOperation.customer.securityMobileChangeComplete({ newMobileOtp: smsToUse });
      console.log('[ChangePhone] securityMobileChangeComplete response ->', completeResult);
      if (completeResult?.success) {
        showSuccess(completeResult?.message || 'Mobile number updated successfully');
        dispatch(getUserProfile());
        if (route.params?.fromScreen) {
          navigation.navigate(route.params.fromScreen);
        } else {
          navigation.navigate(routes.ACCOUNT_SCREEN);
        }
      } else {
        showError(completeResult?.message || 'Failed to complete mobile change');
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
      <View style={styles.flex}>
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
              resizeMode="contain"
            />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <AppText weight={SEMI_BOLD} type={EIGHTEEN} style={[styles.headerTitle, { color: themeColors.text }]}>
              Change Phone Number
            </AppText>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          extraScrollHeight={Platform.OS === 'ios' ? 24 : 60}
        >
          {/* Warnings Box */}
          <View style={[styles.warningBox, { backgroundColor: themeColors.input }]}>
            <FastImage source={warningImg} style={{ width: 18, height: 18, marginTop: 2 }} resizeMode="contain" tintColor={isDark ? colors.white : colors.black} />
            <View style={styles.warningList}>
              <AppText type={ELEVEN} style={[styles.warningPoint, { color: themeColors.secondaryText }]}>
                1. To protect your account, withdrawals will be restricted for 24 hours after updating your phone number.
              </AppText>
              <AppText type={ELEVEN} style={[styles.warningPoint, { color: themeColors.secondaryText }]}>
                2. If your phone number is currently used as your username, it will automatically be replaced with the updated number.
              </AppText>
              <AppText type={ELEVEN} style={[styles.warningPoint, { color: themeColors.secondaryText }]}>
                3. Phone number updates on the primary account will also sync across linked subaccounts. Separate subaccounts with independent settings will remain unchanged.
              </AppText>
            </View>
          </View>

          {/* New Phone Number Section */}
          <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.fieldLabel, { color: themeColors.text }]}>
            New Phone Number
          </AppText>
          <View style={[styles.phoneInputContainer, { backgroundColor: isDark ? 'transparent' : '#EDEDEE', borderColor: isDark ? themeColors.border : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
            <TouchableOpacity style={styles.countryPicker} activeOpacity={0.8}>
              <AppText style={{ fontSize: 18 }}>🇮🇳</AppText>
              <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.countryCode, { color: themeColors.text }]}>
                +91
              </AppText>
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
            <TextInput
              style={[styles.textInput, { color: themeColors.text, flex: 1 }]}
              placeholder="Enter your new phone number"
              placeholderTextColor={themeColors.secondaryText}
              keyboardType="number-pad"
              value={newPhone}
              onChangeText={(val) => setNewPhone(val.replace(/\D/g, ''))}
              cursorColor={colors.cyanTheme}
            />
          </View>

          {/* SMS Verification Code Section */}
          <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.fieldLabel, { color: themeColors.text }]}>
            New SMS Verification Code
          </AppText>
          <View style={[styles.inputContainer, { backgroundColor: isDark ? 'transparent' : '#EDEDEE', borderColor: isDark ? themeColors.border : 'transparent', borderWidth: isDark ? 1 : 0, flexDirection: 'row', alignItems: 'center' }]}>
            <TextInput
              style={[styles.textInput, { color: themeColors.text, flex: 1 }]}
              placeholder="Enter the verification code"
              placeholderTextColor={themeColors.secondaryText}
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="number-pad"
              cursorColor={colors.cyanTheme}
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
                style={{ color: (countdown > 0 || isLoading) ? themeColors.secondaryText : colors.cyanTheme }}
              >
                {countdown > 0 ? `${countdown}s` : 'Send'}
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Valid for 10 minutes */}
          <AppText type={TWELVE} style={[styles.validText, { color: themeColors.secondaryText }]}>
            Valid for 10 minutes
          </AppText>
        </KeyboardAwareScrollView>

        {/* Bottom anchored Confirm Button */}
        <View style={styles.bottomWrapper}>
          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: isDark ? colors.white : colors.black }]}
            activeOpacity={0.8}
            onPress={handleConfirm}
            disabled={isLoading}
          >
            <AppText type={SIXTEEN} weight={BOLD} style={{ color: !isDark ? colors.white : ColorSpace.black }}>
              {isLoading ? 'Processing...' : 'Confirm'}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </AppSafeAreaView>
  );
};

export default ChangePhoneNumberScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  backBtn: { padding: 6 },
  backIcon: { width: 35, height: 35 },
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
