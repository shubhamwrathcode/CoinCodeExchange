import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import NavigationService from '../../../navigation/NavigationService';
import FastImage from 'react-native-fast-image';
import {
  AppSafeAreaView,
  AppText,
  SIXTEEN,
  SEMI_BOLD,
  TWENTY_TWO,
  TWENTY,
} from '../../../shared';
import { back_ic, succescelebrate } from '../../../helper/ImageAssets';
import { colors } from '../../../theme/colors';
import * as routes from '../../../navigation/routes';

const ResetSuccess = () => {
  const { colors: themeColors, isDark } = useTheme();

  const handleConfirm = () => {
    NavigationService.navigate(routes.FUND_PASSWORD_MAIN_SCREEN);
  };

  return (
    <AppSafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#121214' : colors.white }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => NavigationService.navigate(routes.FUND_PASSWORD_MAIN_SCREEN)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <FastImage
            source={back_ic}
            tintColor={isDark ? colors.white : colors.black}
            style={{ width: 18, height: 18 }}
            resizeMode='contain'
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.centerContainer}>
          <FastImage
            source={succescelebrate}
            style={styles.successIcon}
            resizeMode='contain'
          />
          <AppText
            type={TWENTY}
            weight={SEMI_BOLD}
            style={[styles.successText, { color: themeColors.text }]}
          >
            Fund Password Reset{"\n"}Successfully
          </AppText>
        </View>
      </View>

      {/* Bottom Confirm Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: isDark ? '#FFFFFF' : '#2A2A2E' }]}
          activeOpacity={0.8}
          onPress={handleConfirm}
        >
          <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: isDark ? '#000000' : '#FFFFFF' }}>
            Confirm
          </AppText>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 15,
    height: Platform.OS === 'ios' ? 44 : 56,
  },
  headerBtn: {
    padding: 6,
    marginLeft: -4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  centerContainer: {
    alignItems: 'center',
    marginTop: -80, // slightly offset up for optical centering
  },
  successIcon: {
    width: 180,
    height: 180,
  },
  successText: {
    textAlign: 'center',
    lineHeight: 30,
  },
  bottomContainer: {
    paddingHorizontal: 15,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingTop: 16,
  },
  confirmBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});

export default ResetSuccess;
