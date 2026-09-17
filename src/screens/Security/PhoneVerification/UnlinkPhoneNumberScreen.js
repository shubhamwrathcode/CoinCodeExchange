import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
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
} from '../../../shared';
import FastImage from 'react-native-fast-image';
import { back_ic, antiphisinglock, securityrisk } from '../../../helper/ImageAssets';
import { showSuccess } from '../../../helper/logger';
import * as routes from '../../../navigation/routes';

const UnlinkPhoneNumberScreen = () => {
  const navigation = useNavigation();
  const { colors: themeColors, isDark } = useTheme();
  const userData = useAppSelector((state) => state.auth.userData);

  const profileMobile = userData?.mobileNumber ?? userData?.mobile_number ?? '';

  const maskPhoneForUnlink = (phone) => {
    if (!phone) return '+91 ****0';
    const cleaned = String(phone).replace(/\s/g, '');
    const isIndia = cleaned.startsWith("+91") || cleaned.startsWith("91");
    const prefix = isIndia ? "+91" : "";
    const digitsOnly = cleaned.replace(/^\+91|^91/, '');
    if (digitsOnly.length < 2) return '+91 ****0';
    return `${prefix} ****${digitsOnly.slice(-1)}`;
  };

  const displayPhone = maskPhoneForUnlink(profileMobile);

  const handleConfirmUnlink = () => {
    navigation.navigate(routes.UNLINK_SUCCESS_SCREEN);
  };

  return (
    <AppSafeAreaView style={{ backgroundColor: isDark ? '#121214' : '#FFFFFF', flex: 1 }}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: isDark ? '#1E1E22' : '#F0F0F0' }]}>
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
          <View style={styles.titleContainer}>
            <AppText weight={SEMI_BOLD} type={EIGHTEEN} style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              Unlink Phone Number
            </AppText>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Content container */}
        <View style={styles.content}>
          {/* Bot/Lock Illustration */}
          <View style={styles.illustrationContainer}>
            <FastImage
              source={securityrisk}
              style={styles.botImage}
              resizeMode="contain"
            />
          </View>

          {/* Main Question Text */}
          <AppText
            type={EIGHTEEN}
            weight={SEMI_BOLD}
            style={[styles.questionText, { color: isDark ? '#FFFFFF' : '#000000' }]}
          >
            Are you sure you want to unlink the phone number?
          </AppText>

          {/* Masked Phone Subtext */}
          <AppText
            type={FOURTEEN}
            weight={MEDIUM}
            style={[styles.phoneSubtext, { color: isDark ? '#8A8A93' : '#9E9EAE' }]}
          >
            {displayPhone}
          </AppText>
        </View>

        {/* Confirm Button anchored at bottom */}
        <View style={styles.bottomWrapper}>
          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: isDark ? '#2E2E32' : '#2A2A2E' }]}
            activeOpacity={0.8}
            onPress={handleConfirmUnlink}
          >
            <AppText type={SIXTEEN} weight={BOLD} style={{ color: '#FFFFFF' }}>
              Confirm to Unlink
            </AppText>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </AppSafeAreaView>
  );
};

export default UnlinkPhoneNumberScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
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
    alignItems: 'center',
  },
  headerTitle: {
    textAlign: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  illustrationContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botImage: {
    width: 150,
    height: 150,
  },
  questionText: {
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  phoneSubtext: {
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  bottomWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  confirmButton: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});
