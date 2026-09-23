import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
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
import {
  back_ic,
  enablepasskey,
  succescelebrate,
  warningImg,
  Polygon,
  security_vector2,
} from '../../../helper/ImageAssets';
import { colors } from '../../../theme/colors';
import { Button } from '../../../common/Button';
import * as routes from '../../../navigation/routes';

export default function SecurityFacialVerificationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors: themeColors, isDark } = useTheme();

  // step: 'intro' | 'loading' | 'camera' | 'success' | 'timeout'
  const [step, setStep] = useState('intro');

  // Trigger loading configuration spinner, then auto navigate to scanning camera simulation
  useEffect(() => {
    if (step !== 'loading') return;
    const t = setTimeout(() => {
      setStep('camera');
    }, 1800);
    return () => clearTimeout(t);
  }, [step]);

  const handleComplete = () => {
    navigation.navigate(routes.SECURITY_VERIFICATION_UNAVAILABLE_SCREEN, {
      verifiedMethod: 'facial',
    });
  };

  const cardBg = isDark ? '#1C1C1E' : '#F2F2F7';
  const borderCol = isDark ? '#2C2C2E' : '#E5E5EA';
  const textColor = themeColors.text;
  const subTextColor = isDark ? '#8A8A93' : '#8E8E93';

  return (
    <AppSafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121214' : colors.white }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (step === 'loading' || step === 'camera') setStep('intro');
            else navigation.goBack();
          }}
          style={styles.backButton}
        >
          <FastImage
            source={back_ic}
            resizeMode="contain"
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={[styles.headerTitle, { color: textColor }]}>
          Facial Verification
        </AppText>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* STEP 1: INTRO CHECKLIST */}
        {step === 'intro' && (
          <View style={styles.stepContainer}>
            <AppText type={SIXTEEN} weight={SEMI_BOLD} style={[styles.title, { color: textColor }]}>
              Identity Liveness Check
            </AppText>
            <AppText type={TWELVE} style={{ color: subTextColor, lineHeight: 18, marginBottom: 20 }}>
              Verify your authenticity as the account owner. Please ensure the following guidelines are followed for accurate results.
            </AppText>

            <View style={styles.guidelinesGrid}>
              <View style={[styles.guidelineGridItem, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: textColor }}>No Hats</AppText>
              </View>
              <View style={[styles.guidelineGridItem, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: textColor }}>No Glasses</AppText>
              </View>
              <View style={[styles.guidelineGridItem, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: textColor }}>No Filters</AppText>
              </View>
              <View style={[styles.guidelineGridItem, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: textColor }}>Well Lit Room</AppText>
              </View>
            </View>

            <View style={[styles.warningBox, { backgroundColor: isDark ? '#2C2C2E' : '#FFEBEB', borderColor: '#E53E3E' }]}>
              <View style={styles.warningRow}>
                <FastImage source={Polygon} style={styles.bulletDot} />
                <AppText type={TWELVE} style={{ color: isDark ? colors.white : '#A00', flex: 1, lineHeight: 18 }}>
                  Do not cover your face with frames, masks, or high exposure lights.
                </AppText>
              </View>
            </View>

            <Button containerStyle={{ marginTop: 24 }} onPress={() => setStep('loading')}>
              <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: colors.white }}>
                Begin Verification
              </AppText>
            </Button>
          </View>
        )}

        {/* STEP 2: CAMERA SENSORS LOADING SCREEN */}
        {step === 'loading' && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.cyanTheme} />
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor, marginTop: 20 }}>
              Configuring Camera Sensors...
            </AppText>
            <AppText type={TWELVE} style={{ color: subTextColor, marginTop: 4 }}>
              Please look straight into your front device lens.
            </AppText>
          </View>
        )}

        {/* STEP 3: circular dynamic scanning simulation */}
        {step === 'camera' && (
          <View style={styles.stepContainer}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: colors.cyanTheme, textAlign: 'center', marginBottom: 12 }}>
              Please NOD your head slowly
            </AppText>

            <View style={styles.cameraOutlineContainer}>
              <View style={styles.circularFaceCamera}>
                <FastImage source={enablepasskey} style={styles.cameraIconBg} resizeMode="contain" />
              </View>
            </View>

            <View style={styles.actionRow}>
              <Button
                containerStyle={{ flex: 1, marginRight: 12, height: 44, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: borderCol }}
                onPress={() => setStep('timeout')}
              >
                <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: textColor }}>
                  Simulate Timeout
                </AppText>
              </Button>

              <Button
                containerStyle={{ flex: 1, height: 44 }}
                onPress={() => setStep('success')}
              >
                <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: colors.white }}>
                  Continue Success
                </AppText>
              </Button>
            </View>
          </View>
        )}

        {/* STEP 4: SCAN SUCCESS */}
        {step === 'success' && (
          <View style={[styles.stepContainer, { alignItems: 'center', justifyContent: 'center' }]}>
            <View style={styles.successRing}>
              <FastImage source={succescelebrate} style={styles.illustrationSuccess} resizeMode="contain" />
            </View>

            <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: textColor, textAlign: 'center', marginTop: 24 }}>
              Liveness Verification Complete
            </AppText>
            <AppText type={TWELVE} style={{ color: subTextColor, textAlign: 'center', marginTop: 8, lineHeight: 18, paddingHorizontal: 16 }}>
              Success: Biometric face analysis completely matched against registered profile documentation.
            </AppText>

            <Button containerStyle={{ width: '100%', marginTop: 32 }} onPress={handleComplete}>
              <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: colors.white }}>
                Confirm and Complete
              </AppText>
            </Button>
          </View>
        )}

        {/* STEP 5: SCAN TIMEOUT FAIL */}
        {step === 'timeout' && (
          <View style={[styles.stepContainer, { alignItems: 'center', justifyContent: 'center' }]}>
            <FastImage source={warningImg} style={{ width: 64, height: 64 }} resizeMode="contain" />

            <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: textColor, textAlign: 'center', marginTop: 20 }}>
              Verification Timeout
            </AppText>
            <AppText type={TWELVE} style={{ color: subTextColor, textAlign: 'center', marginTop: 8, lineHeight: 18, paddingHorizontal: 20 }}>
              Sensor tracking failed because camera nodding could not be completed within the security duration. Please try again.
            </AppText>

            <Button containerStyle={{ width: '100%', marginTop: 32 }} onPress={() => setStep('intro')}>
              <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: colors.white }}>
                Verify Again
              </AppText>
            </Button>
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
    width: 35,
    height: 35,
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    marginBottom: 6,
  },
  guidelinesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  guidelineGridItem: {
    width: '48%',
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  warningBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletDot: {
    width: 8,
    height: 8,
    marginTop: 5,
    marginRight: 10,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraOutlineContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    marginVertical: 20,
  },
  circularFaceCamera: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: colors.cyanTheme,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cameraIconBg: {
    width: 70,
    height: 70,
    tintColor: '#8E8E93',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  successRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationSuccess: {
    width: 80,
    height: 80,
  },
});
