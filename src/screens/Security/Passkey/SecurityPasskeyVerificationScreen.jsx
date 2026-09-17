import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../../hooks/useTheme';
import {
  AppSafeAreaView,
  AppText,
  EIGHTEEN,
  SEMI_BOLD,
  FOURTEEN,
  MEDIUM,
  SIXTEEN,
  TWELVE,
} from '../../../shared';
import FastImage from 'react-native-fast-image';
import { back_ic, enablepasskey } from '../../../helper/ImageAssets';
import { colors } from '../../../theme/colors';
import { Button } from '../../../common/Button';
import * as routes from '../../../navigation/routes';

export default function SecurityPasskeyVerificationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors: themeColors, isDark } = useTheme();

  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null); // 'success' | null

  useEffect(() => {
    if (!scanning) return;
    const t = setTimeout(() => {
      setScanning(false);
      setScanResult('success');
    }, 2000);
    return () => clearTimeout(t);
  }, [scanning]);

  const handleComplete = () => {
    navigation.navigate(routes.SECURITY_VERIFICATION_UNAVAILABLE_SCREEN, {
      verifiedMethod: 'passkeys',
    });
  };

  const textColor = themeColors.text;
  const subTextColor = isDark ? '#8A8A93' : '#8E8E93';

  return (
    <AppSafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121214' : colors.white }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <FastImage
            source={back_ic}
            resizeMode="contain"
            tintColor={isDark ? colors.white : colors.black}
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={[styles.headerTitle, { color: textColor }]}>
          Verify Passkey
        </AppText>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {scanResult === 'success' ? (
          <View style={styles.cardCenter}>
            <View style={[styles.scannerRing, { borderColor: '#34C759' }]}>
              <FastImage
                source={enablepasskey}
                style={[styles.scannerIcon, { tintColor: '#34C759' }]}
                resizeMode="contain"
              />
            </View>
            <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: textColor, marginTop: 24, textAlign: 'center' }}>
              Passkey Verified
            </AppText>
            <AppText type={TWELVE} style={{ color: subTextColor, marginTop: 8, textAlign: 'center', lineHeight: 18 }}>
              Your device biometric has been verified successfully. Click Continue to update your checklist.
            </AppText>

            <Button containerStyle={{ width: '100%', marginTop: 32 }} onPress={handleComplete}>
              <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: colors.white }}>
                Continue
              </AppText>
            </Button>
          </View>
        ) : (
          <View style={styles.cardCenter}>
            <View style={[styles.scannerRing, scanning && { borderColor: colors.cyanTheme }]}>
              <FastImage
                source={enablepasskey}
                style={[styles.scannerIcon, scanning && { tintColor: colors.cyanTheme }]}
                resizeMode="contain"
              />
            </View>

            <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: textColor, marginTop: 24, textAlign: 'center' }}>
              {scanning ? 'Scanning Biometrics...' : 'Touch to Verify'}
            </AppText>
            <AppText type={TWELVE} style={{ color: subTextColor, marginTop: 8, textAlign: 'center', lineHeight: 18, paddingHorizontal: 20 }}>
              {scanning ? 'Please hold your finger on the sensor or face your camera for authentication.' : 'Use your fingerprint or facial profile stored on this device to complete verification.'}
            </AppText>

            {!scanning && (
              <Button containerStyle={{ width: '100%', marginTop: 32 }} onPress={() => setScanning(true)}>
                <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: colors.white }}>
                  Start Verification
                </AppText>
              </Button>
            )}
          </View>
        )}
      </View>
    </AppSafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: Platform.OS === 'ios' ? 44 : 56,
  },
  backButton: {
    padding: 6,
    marginLeft: -4,
  },
  backIcon: {
    width: 18,
    height: 18,
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
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  cardCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  scannerIcon: {
    width: 70,
    height: 70,
    tintColor: '#8E8E93',
  },
});
