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
import {
  AppSafeAreaView,
  AppText,
  BOLD,
  EIGHTEEN,
  SIXTEEN,
  SEMI_BOLD,
  TWENTY,
} from '../../../shared';
import FastImage from 'react-native-fast-image';
import { back_ic, succescelebrate } from '../../../helper/ImageAssets';
import * as routes from '../../../navigation/routes';

const UnlinkSuccessScreen = () => {
  const navigation = useNavigation();
  const { colors: themeColors, isDark } = useTheme();

  const handleConfirm = () => {
    // Navigate back to AddPhoneNumberScreen
    navigation.navigate(routes.ADD_PHONE_NUMBER_SCREEN);
  };

  return (
    <AppSafeAreaView style={{ backgroundColor: isDark ? '#121214' : '#FFFFFF', flex: 1 }}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header (Back button only as per mockup) */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.navigate(routes.ADD_PHONE_NUMBER_SCREEN)}
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
          {/* Success Celebrate Checkmark */}
          <View style={styles.imageContainer}>
            <FastImage
              source={succescelebrate}
              style={styles.successImage}
              resizeMode="contain"
            />
          </View>

          {/* Bold Success Title */}
          <AppText
            type={TWENTY}
            weight={SEMI_BOLD}
            style={[styles.successTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}
          >
            Device Removed
          </AppText>
        </View>

        {/* Bottom anchored Confirm Button */}
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
        </View>

      </KeyboardAvoidingView>
    </AppSafeAreaView>
  );
};

export default UnlinkSuccessScreen;

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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    marginTop: -100
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  successImage: {
    width: 180,
    height: 180,
  },
  successTitle: {
    textAlign: 'center',
    marginTop: -20
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
