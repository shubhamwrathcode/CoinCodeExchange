import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import NavigationService from '../../../navigation/NavigationService';
import FastImage from 'react-native-fast-image';
import {
  AppSafeAreaView,
  AppText,
  BOLD,
  FOURTEEN,
  SIXTEEN,
  SEMI_BOLD,
  EIGHTEEN,
  THIRTEEN,
  MEDIUM,
  TWENTY,
} from '../../../shared';
import { back_ic, securityrisk } from '../../../helper/ImageAssets';
import { colors } from '../../../theme/colors';
import * as routes from '../../../navigation/routes';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { getUserProfile, getFundPasswordStatusAction } from '../../../actions/accountActions';

const FundPasswordMain = () => {
  const { colors: themeColors, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const userData = useAppSelector((state) => state.auth.userData);
  const [fundPasswordStatus, setFundPasswordStatus] = useState(null);
  const hasFundPassword = fundPasswordStatus ?? !!(userData?.fundPassword || userData?.payPin || userData?.isFundPasswordSet);

  const loadStatus = async () => {
    dispatch(getUserProfile(false));
    const res = await dispatch(getFundPasswordStatusAction());
    setFundPasswordStatus(!!res);
  };

  useEffect(() => {
    loadStatus();
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

      {/* Content */}
      <View style={styles.stepOneMain}>
        <ScrollView
          contentContainerStyle={styles.stepOneScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <FastImage
            source={securityrisk}
            style={styles.stepOneImage}
            resizeMode="contain"
          />

          <AppText
            type={TWENTY}
            weight={SEMI_BOLD}
            style={[styles.stepOneTitleText, { color: isDark ? '#FFFFFF' : '#121214' }]}
          >
            {hasFundPassword ? "Are you sure you want to change your fund password?" : "Are you sure you want to set your fund password?"}
          </AppText>

          <AppText
            type={THIRTEEN}
            weight={MEDIUM}
            style={[styles.stepOneDescText, { color: isDark ? '#8A8A93' : '#8E8E93' }]}
          >
            For the security of your assets, withdrawals will be temporarily locked for <AppText type={FOURTEEN} weight={BOLD} style={{ color: colors.cyanTheme }}>24</AppText> hours after you {hasFundPassword ? "change" : "set"} your fund password.
          </AppText>
        </ScrollView>

        <View style={styles.stepOneBottomContainer}>
          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: isDark ? '#FFFFFF' : '#2A2A2E' }]}
            onPress={() => {
              NavigationService.navigate(routes.CHANGE_FUND_PASSWORD_SCREEN);
            }}
            activeOpacity={0.8}
          >
            <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: isDark ? '#121214' : '#FFFFFF' }}>
              Confirm
            </AppText>
          </TouchableOpacity>
        </View>
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
  confirmButton: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 20,
  },
  stepOneMain: {
    flex: 1,
  },
  stepOneScrollContent: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  stepOneBottomContainer: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  stepOneImage: {
    width: 220,
    height: 150,
    marginBottom: 30,
  },
  stepOneTitleText: {
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  stepOneDescText: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    paddingHorizontal: 15,
  },
});

export default FundPasswordMain;
