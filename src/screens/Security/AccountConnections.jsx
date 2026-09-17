import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import NavigationService from '../../navigation/NavigationService';
import FastImage from 'react-native-fast-image';
import {
  AppSafeAreaView,
  AppText,
  BOLD,
  FOURTEEN,
  SIXTEEN,
  SEMI_BOLD,
  TWELVE,
  EIGHTEEN,
  THIRTEEN,
  MEDIUM,
  TWENTY,
  FIFTEEN,
} from '../../shared';
import { back_ic, googleIcon, apple } from '../../helper/ImageAssets';
import { colors } from '../../theme/colors';

const AccountConnections = () => {
  const { colors: themeColors, isDark } = useTheme();

  // Local UI states to toggle connection state for testing
  const [googleConnected, setGoogleConnected] = useState(true);
  const [appleConnected, setAppleConnected] = useState(false);

  const toggleGoogle = () => {
    setGoogleConnected(!googleConnected);
  };

  const toggleApple = () => {
    setAppleConnected(!appleConnected);
  };

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
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <AppText
          type={TWENTY}
          weight={SEMI_BOLD}
          style={[styles.mainTitle, { color: themeColors.text }]}
        >
          Account Connections
        </AppText>

        <AppText
          type={THIRTEEN}
          weight={MEDIUM}
          style={[styles.mainSubtitle, { color: themeColors.secondaryText }]}
        >
          Connect your AGCE account with trusted third-party platforms for faster login and enhanced account access.
        </AppText>

        {/* Connection List */}
        <View style={styles.listContainer}>

          {/* Google Row */}
          <View style={styles.rowItem}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrapper, { backgroundColor: themeColors.input }]}>
                <FastImage
                  source={googleIcon}
                  style={styles.platformIcon}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.textContainer}>
                <AppText type={FIFTEEN} weight={MEDIUM} style={{ color: themeColors.text }}>
                  Sign in with Google
                </AppText>
                <AppText
                  type={TWELVE}
                  weight={MEDIUM}
                  style={{ color: themeColors.secondaryText, marginTop: 2 }}
                >
                  {googleConnected ? 'jl*****@gmail.com' : 'Not Connected'}
                </AppText>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={toggleGoogle}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: appleConnected
                    ? (isDark ? '#2A2A2E' : '#F5F5F7')
                    : (isDark ? colors.white : colors.black)
                }
              ]}
            >
              <AppText
                type={FOURTEEN}
                weight={MEDIUM}
                style={{
                  color: googleConnected
                    ? (isDark ? '#FFFFFF' : '#000000')
                    : 'white'
                }}
              >
                {googleConnected ? 'Disconnect' : 'Connect'}
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Apple Row */}
          <View style={styles.rowItem}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrapper, { backgroundColor: themeColors.input }]}>
                <FastImage
                  source={apple}
                  style={styles.platformIcon}
                  tintColor={isDark ? colors.white : colors.black}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.textContainer}>
                <AppText type={FIFTEEN} weight={MEDIUM} style={{ color: themeColors.text }}>
                  Sign in with Apple
                </AppText>
                <AppText
                  type={TWELVE}
                  weight={MEDIUM}
                  style={{ color: themeColors.secondaryText, marginTop: 2 }}
                >
                  {appleConnected ? 'Apple Connected' : 'Not Connected'}
                </AppText>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={toggleApple}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: appleConnected
                    ? (isDark ? '#2A2A2E' : '#F5F5F7')
                    : (isDark ? colors.white : colors.black)
                }
              ]}
            >
              <AppText
                type={FOURTEEN}
                weight={MEDIUM}
                style={{
                  color: appleConnected
                    ? (isDark ? '#FFFFFF' : '#000000')
                    : '#fff'
                }}
              >
                {appleConnected ? 'Disconnect' : 'Connect'}
              </AppText>
            </TouchableOpacity>
          </View>

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
    paddingHorizontal: 15,
    height: Platform.OS === 'ios' ? 44 : 56,
  },
  headerBtn: {
    padding: 6,
    marginLeft: -4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 14,
  },
  mainTitle: {
    textAlign: 'left',
    lineHeight: 30,
    marginBottom: 12,
  },
  mainSubtitle: {
    textAlign: 'left',
    lineHeight: 20,
    marginBottom: 12,
  },
  listContainer: {
    marginTop: 8,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  rowLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  platformIcon: {
    width: 25,
    height: 25,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 98,
  },
});

export default AccountConnections;
