import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
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
import { Button } from '../../../common/Button';
import FastImage from 'react-native-fast-image';
import {
  back_ic,
  enablepasskey,
  googleAuthenticator,
  PHONE,
  change_email_vector,
  succescelebrate,
  EMAIL,
  passkey_login,
  security_vector2,
} from '../../../helper/ImageAssets';
import { colors } from '../../../theme/colors';
import { useAppSelector } from '../../../store/hooks';
import * as routes from '../../../navigation/routes';

export default function SecurityVerificationUnavailableScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors: themeColors, isDark } = useTheme();
  const userData = useAppSelector((state) => state.auth.userData);

  const emailId = userData?.emailId || userData?.email || 'pa****@gmail.com';
  const profileMobile = userData?.mobileNumber || userData?.mobile_number || '998****1988';

  // step: 'select' | 'confirm' | 'requirements' | 'submitted' | 'success'
  const [step, setStep] = useState('select');

  // Checklist of unavailable methods
  const [secUnavailable, setSecUnavailable] = useState({
    email: true,
    phone: false,
    authApp: false,
    passkeys: false,
  });

  const selectedCount = useMemo(
    () => Object.values(secUnavailable).filter(Boolean).length,
    [secUnavailable]
  );

  const [secResetAck, setSecResetAck] = useState(true);

  // Requirements checklist completion state
  const [secReqDone, setSecReqDone] = useState({
    authApp: false,
    email: false,
    phone: false,
    passkeys: false,
    facial: false,
  });

  // Listen to returning verification dynamic route parameters to update our requirement states
  useEffect(() => {
    if (route.params?.verifiedMethod) {
      const method = route.params.verifiedMethod;
      setSecReqDone((prev) => ({
        ...prev,
        [method]: true,
      }));
    }
  }, [route.params?.verifiedMethod]);

  const requirementsMode = useMemo(() => {
    if (secUnavailable.passkeys && selectedCount === 1) return 'passkeys_only';
    return 'standard';
  }, [secUnavailable.passkeys, selectedCount]);

  const reqTotal = requirementsMode === 'passkeys_only' ? 2 : 3;

  const reqCompleted = useMemo(() => {
    if (requirementsMode === 'passkeys_only') {
      return (secReqDone.passkeys ? 1 : 0) + (secReqDone.facial ? 1 : 0);
    }
    const second =
      (secUnavailable.phone ? secReqDone.phone : false) ||
      (secUnavailable.email ? secReqDone.email : false);
    return (secReqDone.authApp ? 1 : 0) + (second ? 1 : 0) + (secReqDone.facial ? 1 : 0);
  }, [requirementsMode, secReqDone, secUnavailable.email, secUnavailable.phone]);

  const maskEmail = (email) => {
    if (!email) return '***@gmail.com';
    const [u, d] = String(email).split('@');
    if (!d) return email;
    if (u.length <= 2) return `${u[0]}***@${d}`;
    return `${u.slice(0, 2)}***${u.slice(-1)}@${d}`;
  };

  const maskPhone = (phone) => {
    if (!phone) return '***';
    const cleaned = String(phone).replace(/\s/g, '');
    if (cleaned.length < 4) return '***';
    return `${cleaned.slice(0, 3)}*****${cleaned.slice(-2)}`;
  };

  const displayEmail = maskEmail(emailId);
  const displayPhone = maskPhone(profileMobile);

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
            if (step === 'confirm') setStep('select');
            else if (step === 'requirements') setStep('confirm');
            else navigation.goBack();
          }}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <FastImage
            source={back_ic}
            resizeMode="contain"
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={[styles.headerTitle, { color: textColor }]}>
          Reset Security
        </AppText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* STEP 1: SELECT METHODS */}
        {step === 'select' && (
          <View style={styles.stepContainer}>
            <AppText type={SIXTEEN} weight={SEMI_BOLD} style={[styles.title, { color: textColor }]}>
              Select Unavailable Methods
            </AppText>
            <AppText type={TWELVE} weight={MEDIUM} style={[styles.subtitle, { color: subTextColor }]}>
              Please select all security methods you can no longer access and want to reset.
            </AppText>

            <View style={styles.listContainer}>
              {/* EMAIL SELECTION */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.itemCard, { backgroundColor: cardBg, borderColor: borderCol }]}
                onPress={() => setSecUnavailable((p) => ({ ...p, email: !p.email }))}
              >
                <View style={styles.itemInfo}>
                  <View style={[styles.iconBadge, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                    <FastImage source={EMAIL} style={styles.badgeImg} resizeMode="contain" />
                  </View>
                  <View style={styles.itemDetails}>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor }}>
                      Email Address
                    </AppText>
                    <AppText type={TWELVE} style={{ color: subTextColor, marginTop: 1 }}>
                      {displayEmail}
                    </AppText>
                  </View>
                </View>
                <View style={[
                  styles.checkbox,
                  { borderColor: secUnavailable.email ? colors.black : subTextColor },
                  secUnavailable.email && { backgroundColor: colors.black }
                ]}>
                  {secUnavailable.email && <AppText style={styles.checkmark}>✓</AppText>}
                </View>
              </TouchableOpacity>

              {/* PHONE SELECTION */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.itemCard, { backgroundColor: cardBg, borderColor: borderCol }]}
                onPress={() => setSecUnavailable((p) => ({ ...p, phone: !p.phone }))}
              >
                <View style={styles.itemInfo}>
                  <View style={[styles.iconBadge, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                    <FastImage source={PHONE} style={styles.badgeImg} resizeMode="contain" />
                  </View>
                  <View style={styles.itemDetails}>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor }}>
                      Phone Number
                    </AppText>
                    <AppText type={TWELVE} style={{ color: subTextColor, marginTop: 1 }}>
                      {displayPhone}
                    </AppText>
                  </View>
                </View>
                <View style={[
                  styles.checkbox,
                  { borderColor: secUnavailable.phone ? colors.black : subTextColor },
                  secUnavailable.phone && { backgroundColor: colors.black }
                ]}>
                  {secUnavailable.phone && <AppText style={styles.checkmark}>✓</AppText>}
                </View>
              </TouchableOpacity>

              {/* AUTHENTICATOR APP */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.itemCard, { backgroundColor: cardBg, borderColor: borderCol }]}
                onPress={() => setSecUnavailable((p) => ({ ...p, authApp: !p.authApp }))}
              >
                <View style={styles.itemInfo}>
                  <View style={[styles.iconBadge, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                    <FastImage source={googleAuthenticator} style={styles.badgeImg} resizeMode="contain" />
                  </View>
                  <View style={styles.itemDetails}>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor }}>
                      Authenticator App
                    </AppText>
                    <AppText type={TWELVE} style={{ color: subTextColor, marginTop: 1 }}>
                      Google Authenticator 2FA
                    </AppText>
                  </View>
                </View>
                <View style={[
                  styles.checkbox,
                  { borderColor: secUnavailable.authApp ? colors.black : subTextColor },
                  secUnavailable.authApp && { backgroundColor: colors.black }
                ]}>
                  {secUnavailable.authApp && <AppText style={styles.checkmark}>✓</AppText>}
                </View>
              </TouchableOpacity>

              {/* PASSKEYS */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.itemCard, { backgroundColor: cardBg, borderColor: borderCol }]}
                onPress={() => setSecUnavailable((p) => ({ ...p, passkeys: !p.passkeys }))}
              >
                <View style={styles.itemInfo}>
                  <View style={[styles.iconBadge, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                    <FastImage source={passkey_login} tintColor={isDark ? colors.white : colors.black} style={styles.badgeImg} resizeMode="contain" />
                  </View>
                  <View style={styles.itemDetails}>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor }}>
                      Passkeys
                    </AppText>
                    <AppText type={TWELVE} style={{ color: subTextColor, marginTop: 1 }}>
                      Biometrics or security keys
                    </AppText>
                  </View>
                </View>
                <View style={[
                  styles.checkbox,
                  { borderColor: secUnavailable.passkeys ? colors.black : subTextColor },
                  secUnavailable.passkeys && { backgroundColor: colors.black }
                ]}>
                  {secUnavailable.passkeys && <AppText style={styles.checkmark}>✓</AppText>}
                </View>
              </TouchableOpacity>
            </View>

            <Button
              disabled={selectedCount === 0}
              onPress={() => setStep('confirm')}
            >
              <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: colors.white }}>
                Confirm Reset
              </AppText>
            </Button>
          </View>
        )}

        {/* STEP 2: WARNING CONFIRMATION */}
        {step === 'confirm' && (
          <View style={styles.stepContainer}>
            <View style={styles.warningIllustrationContainer}>
              <FastImage
                source={security_vector2}
                style={styles.illustrationSmall}
                resizeMode="contain"
              />
            </View>

            <AppText type={SIXTEEN} weight={SEMI_BOLD} style={[styles.title, { color: textColor, textAlign: 'center' }]}>
              Are You Sure You Want to Reset Your Security Methods?
            </AppText>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.ackCard, { backgroundColor: cardBg, borderColor: borderCol }]}
              onPress={() => setSecResetAck(!secResetAck)}
            >
              <View style={[
                styles.checkbox,
                { borderColor: secResetAck ? colors.black : subTextColor, marginRight: 10 },
                secResetAck && { backgroundColor: colors.black }
              ]}>
                {secResetAck && <AppText style={styles.checkmark}>✓</AppText>}
              </View>
              <AppText type={TWELVE} weight={MEDIUM} style={{ color: textColor, flex: 1, lineHeight: 18 }}>
                In order to protect your account, withdrawals, P2P selling, and payment services may be disabled for 48 to 72 hours after you make this change.
              </AppText>
            </TouchableOpacity>

            <View style={styles.actionRow}>
              <Button
                containerStyle={{ flex: 1, marginRight: 10, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: borderCol }}
                onPress={() => setStep('select')}
              >
                <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: textColor }}>
                  Cancel
                </AppText>
              </Button>

              <Button
                containerStyle={{ flex: 1 }}
                disabled={!secResetAck}
                onPress={() => {
                  setSecReqDone({ authApp: false, email: false, phone: false, passkeys: false, facial: false });
                  setStep('requirements');
                }}
              >
                <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: colors.white }}>
                  Confirm
                </AppText>
              </Button>
            </View>
          </View>
        )}

        {/* STEP 3: SECURITY VERIFICATION REQUIREMENTS */}
        {step === 'requirements' && (
          <View style={styles.stepContainer}>
            <AppText type={SIXTEEN} weight={SEMI_BOLD} style={[styles.title, { color: textColor }]}>
              Security Verification Requirements
            </AppText>
            <AppText type={TWELVE} weight={MEDIUM} style={[styles.subtitle, { color: subTextColor }]}>
              You need to complete all of the following verifications to continue.
            </AppText>

            <View style={[styles.progressCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: colors.cyanTheme }}>
                {reqCompleted} / {reqTotal} Completed
              </AppText>
              <View style={styles.progressBarBg}>
                <View style={[
                  styles.progressBarFill,
                  { width: `${(reqCompleted / reqTotal) * 100}%` }
                ]} />
              </View>
            </View>

            <View style={styles.listContainer}>
              {requirementsMode === 'passkeys_only' ? (
                <>
                  {/* PASSKEYS REQUIREMENT */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.reqCard, { backgroundColor: cardBg, borderColor: borderCol }]}
                    onPress={() => navigation.navigate(routes.SECURITY_PASSKEY_VERIFICATION_SCREEN)}
                  >
                    <View style={styles.reqLeft}>
                      <FastImage source={enablepasskey} style={styles.badgeImgSmall} resizeMode="contain" />
                      <View>
                        <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor }}>
                          Passkeys
                        </AppText>
                        <AppText type={TWELVE} style={{ color: subTextColor, marginTop: 1 }}>
                          Verify with biometrics or security keys
                        </AppText>
                      </View>
                    </View>
                    <View style={styles.reqStatus}>
                      {secReqDone.passkeys ? (
                        <AppText style={styles.reqCheckGreen}>✓ Done</AppText>
                      ) : (
                        <AppText style={{ color: colors.black, fontWeight: 'bold', fontSize: 13 }}>Verify</AppText>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* FACIAL REQUIREMENT */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.reqCard, { backgroundColor: cardBg, borderColor: borderCol }]}
                    onPress={() => navigation.navigate(routes.SECURITY_FACIAL_VERIFICATION_SCREEN)}
                  >
                    <View style={styles.reqLeft}>
                      <FastImage source={enablepasskey} style={[styles.badgeImgSmall, { tintColor: colors.cyanTheme }]} resizeMode="contain" />
                      <View>
                        <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor }}>
                          Facial Verification
                        </AppText>
                        <AppText type={TWELVE} style={{ color: subTextColor, marginTop: 1 }}>
                          Verify identity using device camera
                        </AppText>
                      </View>
                    </View>
                    <View style={styles.reqStatus}>
                      {secReqDone.facial ? (
                        <AppText style={styles.reqCheckGreen}>✓ Done</AppText>
                      ) : (
                        <AppText style={{ color: colors.black, fontWeight: 'bold', fontSize: 13 }}>Verify</AppText>
                      )}
                    </View>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* AUTHENTICATOR APP */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.reqCard, { backgroundColor: cardBg, borderColor: borderCol }]}
                    onPress={() => {
                      navigation.navigate(routes.PASSKEY_SECURITY_VERIFICATION_SCREEN, {
                        verifyMethods: ['totp'],
                        targetScreen: routes.SECURITY_VERIFICATION_UNAVAILABLE_SCREEN,
                        targetParams: { verifiedMethod: 'authApp' },
                        purpose: 'reset_security_method',
                      });
                    }}
                  >
                    <View style={styles.reqLeft}>
                      <FastImage source={googleAuthenticator} style={styles.badgeImgSmall} resizeMode="contain" />
                      <View>
                        <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor }}>
                          Authenticator App
                        </AppText>
                        <AppText type={TWELVE} style={{ color: subTextColor, marginTop: 1 }}>
                          Enter code from Google Authenticator
                        </AppText>
                      </View>
                    </View>
                    <View style={styles.reqStatus}>
                      {secReqDone.authApp ? (
                        <AppText style={styles.reqCheckGreen}>✓ Done</AppText>
                      ) : (
                        <AppText style={{ color: colors.black, fontWeight: 'bold', fontSize: 13 }}>Verify</AppText>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* PHONE OR EMAIL */}
                  {secUnavailable.phone ? (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[styles.reqCard, { backgroundColor: cardBg, borderColor: borderCol }]}
                      onPress={() => {
                        navigation.navigate(routes.PASSKEY_SECURITY_VERIFICATION_SCREEN, {
                          verifyMethods: ['mobile'],
                          targetScreen: routes.SECURITY_VERIFICATION_UNAVAILABLE_SCREEN,
                          targetParams: { verifiedMethod: 'phone' },
                          purpose: 'reset_security_method',
                        });
                      }}
                    >
                      <View style={styles.reqLeft}>
                        <FastImage source={PHONE} style={styles.badgeImgSmall} resizeMode="contain" />
                        <View>
                          <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor }}>
                            Phone Verification
                          </AppText>
                          <AppText type={TWELVE} style={{ color: subTextColor, marginTop: 1 }}>
                            Verify using {displayPhone}
                          </AppText>
                        </View>
                      </View>
                      <View style={styles.reqStatus}>
                        {secReqDone.phone ? (
                          <AppText style={styles.reqCheckGreen}>✓ Done</AppText>
                        ) : (
                          <AppText style={{ color: colors.black, fontWeight: 'bold', fontSize: 13 }}>Verify</AppText>
                        )}
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[styles.reqCard, { backgroundColor: cardBg, borderColor: borderCol }]}
                      onPress={() => {
                        navigation.navigate(routes.PASSKEY_SECURITY_VERIFICATION_SCREEN, {
                          verifyMethods: ['email'],
                          targetScreen: routes.SECURITY_VERIFICATION_UNAVAILABLE_SCREEN,
                          targetParams: { verifiedMethod: 'email' },
                          purpose: 'reset_security_method',
                        });
                      }}
                    >
                      <View style={styles.reqLeft}>
                        <FastImage source={change_email_vector} style={styles.badgeImgSmall} resizeMode="contain" />
                        <View>
                          <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor }}>
                            Email Verification
                          </AppText>
                          <AppText type={TWELVE} style={{ color: subTextColor, marginTop: 1 }}>
                            Verify using {displayEmail}
                          </AppText>
                        </View>
                      </View>
                      <View style={styles.reqStatus}>
                        {secReqDone.email ? (
                          <AppText style={styles.reqCheckGreen}>✓ Done</AppText>
                        ) : (
                          <AppText style={{ color: colors.black, fontWeight: 'bold', fontSize: 13 }}>Verify</AppText>
                        )}
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* FACIAL REQUIREMENT */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.reqCard, { backgroundColor: cardBg, borderColor: borderCol }]}
                    onPress={() => navigation.navigate(routes.SECURITY_FACIAL_VERIFICATION_SCREEN)}
                  >
                    <View style={styles.reqLeft}>
                      <FastImage source={enablepasskey} style={[styles.badgeImgSmall, { tintColor: colors.cyanTheme }]} resizeMode="contain" />
                      <View>
                        <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor }}>
                          Facial Verification
                        </AppText>
                        <AppText type={TWELVE} style={{ color: subTextColor, marginTop: 1 }}>
                          Verify identity using device camera
                        </AppText>
                      </View>
                    </View>
                    <View style={styles.reqStatus}>
                      {secReqDone.facial ? (
                        <AppText style={styles.reqCheckGreen}>✓ Done</AppText>
                      ) : (
                        <AppText style={{ color: colors.black, fontWeight: 'bold', fontSize: 13 }}>Verify</AppText>
                      )}
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {reqCompleted === reqTotal && (
              <Button
                containerStyle={{ marginTop: 16 }}
                onPress={() => setStep('submitted')}
              >
                <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: colors.white }}>
                  Submit Reset Application
                </AppText>
              </Button>
            )}
          </View>
        )}

        {/* STEP 4: SUBMITTED SUCCESS */}
        {step === 'submitted' && (
          <View style={[styles.stepContainer, { alignItems: 'center', marginTop: 24 }]}>
            <View style={styles.facialSuccessRing}>
              <FastImage source={succescelebrate} style={styles.illustrationSuccess} resizeMode="contain" />
            </View>

            <AppText type={SIXTEEN} weight={SEMI_BOLD} style={[styles.title, { color: textColor, textAlign: 'center', marginTop: 16 }]}>
              Request Submitted
            </AppText>
            <AppText type={TWELVE} weight={MEDIUM} style={[styles.subtitle, { color: subTextColor, textAlign: 'center', lineHeight: 18 }]}>
              Your security reset application has been successfully submitted. We are processing your request, please wait.
            </AppText>

            <Button
              containerStyle={{ width: '100%', marginTop: 24 }}
              onPress={() => setStep('success')}
            >
              <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: colors.white }}>
                OK
              </AppText>
            </Button>
          </View>
        )}

        {/* STEP 5: FINAL RESET COMPLETED */}
        {step === 'success' && (
          <View style={[styles.stepContainer, { alignItems: 'center', marginTop: 24 }]}>
            <View style={styles.facialSuccessRing}>
              <FastImage source={succescelebrate} style={styles.illustrationSuccess} resizeMode="contain" />
            </View>

            <AppText type={SIXTEEN} weight={SEMI_BOLD} style={[styles.title, { color: textColor, textAlign: 'center', marginTop: 16 }]}>
              Security Methods Reset Successfully
            </AppText>
            <AppText type={TWELVE} weight={MEDIUM} style={[styles.subtitle, { color: subTextColor, textAlign: 'center', lineHeight: 18 }]}>
              Your unavailable security methods have been successfully reset and removed from your account. You can now login with your standard password.
            </AppText>

            <Button
              containerStyle={{ width: '100%', marginTop: 24 }}
              onPress={() => navigation.pop(2)}
            >
              <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: colors.white }}>
                Back to Security Settings
              </AppText>
            </Button>
          </View>
        )}
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  stepContainer: {
    flex: 1,
    marginTop: 12,
  },
  title: {
    marginBottom: 6,
  },
  subtitle: {
    lineHeight: 18,
    marginBottom: 16,
  },
  listContainer: {
    marginBottom: 20,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  badgeImg: {
    width: 20,
    height: 20,
  },
  itemDetails: {
    flex: 1,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: colors.white,
    fontSize: 9,
    fontWeight: 'bold',
  },
  warningIllustrationContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  illustrationSmall: {
    width: 100,
    height: 100,
  },
  ackCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: '#E5E5EA',
    borderRadius: 2.5,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.cyanTheme,
    borderRadius: 2.5,
  },
  reqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  reqLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  badgeImgSmall: {
    width: 22,
    height: 22,
    marginRight: 10,
  },
  reqStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  reqCheckGreen: {
    color: '#34C759',
    fontWeight: 'bold',
    fontSize: 12,
  },
  facialSuccessRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationSuccess: {
    width: 72,
    height: 72,
  },
});
