import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, StyleSheet, TouchableOpacity, Platform, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { AppText, BOLD, FOURTEEN, SIXTEEN, TWENTY, SEMI_BOLD, TWELVE, EIGHT, EIGHTEEN, TWENTY_FOUR, TWENTY_TWO, MEDIUM, FIFTEEN } from '../../../shared';
import { useTheme } from '../../../hooks/useTheme';
import NavigationService from '../../../navigation/NavigationService';
import * as routes from '../../../navigation/routes';
import FastImage from 'react-native-fast-image';
import { back_ic, easyVerificaton, enablepasskey, headPhoneIcon, highsecurity, INFO, multidevice, googleAuthenticator, PHONE, right_ic, securityrisk, FINGERPRINT, menuIcon, REMOVE, binIcon, passkey_login, security_risk_vector, security_risk_vector_light } from '../../../helper/ImageAssets';
import { colors } from '../../../theme/colors';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { Passkey } from 'react-native-passkey';
import { getPasskeyList, getPasskeyRegistrationOptions, verifyPasskeyRegistration, verifySecurityPasskey, deletePasskey, getUserProfile, deleteAccount } from '../../../actions/accountActions';
import { showError, showSuccess } from '../../../helper/logger';
import { setLoading } from '../../../slices/authSlice';
import { PASSKEY_RP_ID } from '../../../helper/Constants';
import {
  getNativePasskeyRegistration,
  isPasskeyAssociatedDomainError,
  waitForPasskeyNativePrompt,
} from '../../../helper/passkeyAssertion';
import { useFocusEffect } from '@react-navigation/native';
import {
  extractPasskeyIdFromVerifyResult,
  findNewestPasskeyId,
  formatPasskeyDeviceLabel,
  getLocalPasskeyDeviceInfoMap,
  getMobilePasskeyDeviceInfo,
  isVerifyPasskeyRegistrationSuccess,
  mergePasskeyListWithLocalDeviceInfo,
  repairUncachedWeakPasskeys,
  resolvePasskeyDeviceInfo,
  saveLocalPasskeyDeviceInfo,
} from '../../../helper/passkeyDeviceInfo';

const EnablePasskey = ({ route, navigation }) => {
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();

  const userData = useAppSelector((state) => state.auth.userData);

  const [passkeys, setPasskeys] = useState([]);
  const [loadingPasskeys, setLoadingPasskeys] = useState(true);
  const [isRiskModalVisible, setRiskModalVisible] = useState(false);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedPasskey, setSelectedPasskey] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [localDeviceMap, setLocalDeviceMap] = useState({});

  const refreshLocalDeviceMap = useCallback(async () => {
    const map = await getLocalPasskeyDeviceInfoMap();
    setLocalDeviceMap(map);
    console.log('[Passkey][LocalCache] loaded map:', map);
    return map;
  }, []);

  // Check support on mount
  const [passkeySupported, setPasskeySupported] = useState(true);

  useEffect(() => {
    try {
      const supported = Passkey.isSupported();
      setPasskeySupported(!!supported);
    } catch {
      setPasskeySupported(false);
    }
  }, []);

  const fetchPasskeys = useCallback(async () => {
    try {
      setLoadingPasskeys(true);
      const res = await dispatch(getPasskeyList());
      console.log('[Passkey][List] API response:', JSON.stringify(res, null, 2));
      if (res?.success) {
        const list = res.data?.passkeys || [];
        await repairUncachedWeakPasskeys(list);
        const merged = await mergePasskeyListWithLocalDeviceInfo(list);
        console.log('[Passkey][List] deviceInfo per passkey (after local merge):', merged.map((pk) => ({
          id: pk._id || pk.id,
          name: pk.name,
          deviceInfo: pk.deviceInfo,
          createdAt: pk.createdAt,
        })));
        setPasskeys(merged);
        await refreshLocalDeviceMap();
      }
    } catch (err) {
      console.log('[Passkey][List] fetch error:', err);
    } finally {
      setLoadingPasskeys(false);
    }
  }, [dispatch, refreshLocalDeviceMap]);

  useFocusEffect(
    useCallback(() => {
      dispatch(getUserProfile(false, false, true));
      refreshLocalDeviceMap();
      fetchPasskeys();
    }, [dispatch, fetchPasskeys, refreshLocalDeviceMap])
  );

  const routeParams = route?.params;

  useEffect(() => {
    if (routeParams?.deletePasskeyId) {
      const { deletePasskeyId, emailOtp, smsOtp, tofaCode } = routeParams;

      let verifyMethod = null;
      let code = null;

      if (tofaCode) {
        verifyMethod = 'totp';
        code = tofaCode;
      } else if (emailOtp) {
        verifyMethod = 'email';
        code = emailOtp;
      } else if (smsOtp) {
        verifyMethod = 'mobile';
        code = smsOtp;
      }

      if (verifyMethod && code) {
        const executeDelete = async () => {
          try {
            setIsDeleting(true);
            console.log(`[DEBUG][EnablePasskey] Callback delete triggering for ID: ${deletePasskeyId} with method: ${verifyMethod}`);
            const success = await dispatch(deletePasskey(deletePasskeyId, verifyMethod, code, null));
            console.log('[DEBUG][EnablePasskey] Callback delete result:', success);

            // Clear navigation parameters in all cases to prevent repeated delete triggers
            navigation.setParams({
              deletePasskeyId: undefined,
              emailOtp: undefined,
              smsOtp: undefined,
              tofaCode: undefined,
            });

            if (success) {
              setSelectedPasskey(null);
              fetchPasskeys();
            }
          } catch (error) {
            console.warn('[Passkey] Deletion callback error:', error);
          } finally {
            setIsDeleting(false);
          }
        };
        executeDelete();
      }
    }
  }, [routeParams, dispatch, fetchPasskeys, navigation]);

  const emailId = userData?.emailId || "";
  const mobileNumber = userData?.mobileNumber || "";
  const hasGoogleAuth = Number(userData?.["2fa"] || 0) === 2;
  const hasPasskeys = passkeys.length > 0;

  // “Email” factor: if API tracks emailVerifiedAt, need verified; otherwise having email is enough (match backend).
  const isEmailSatisfied = useMemo(() => {
    if (!emailId || emailId === "null" || emailId === "undefined") return false;
    if (!Object.prototype.hasOwnProperty.call(userData || {}, "emailVerifiedAt")) {
      return true;
    }
    return !!userData?.emailVerifiedAt;
  }, [userData, emailId]);

  const hasMobile = !!mobileNumber && mobileNumber !== "null" && mobileNumber !== "undefined";

  // Gate check: Any 2 active security factors (Email, Phone, Google Authenticator, or existing passkeys)
  const activeSecurityCount = useMemo(() => {
    return [isEmailSatisfied, hasMobile, hasGoogleAuth, hasPasskeys].filter(Boolean).length;
  }, [isEmailSatisfied, hasMobile, hasGoogleAuth, hasPasskeys]);

  // List only methods the user can still add to satisfy the gate requirements
  const missingMethods = useMemo(() => {
    const list = [];
    if (!isEmailSatisfied) {
      list.push({
        id: 'email',
        label: 'Email Address',
        icon: googleAuthenticator,
        route: routes.ADD_EMAIL_SCREEN,
      });
    }
    if (!hasGoogleAuth) {
      list.push({
        id: 'totp',
        label: 'Google Authenticator',
        icon: googleAuthenticator,
        route: routes.DOWNLOAD_AUTHENTICATOR_SCREEN,
      });
    }
    if (!hasMobile) {
      list.push({
        id: 'phone',
        label: 'Phone Number',
        icon: PHONE,
        route: routes.PASSKEY_ADD_PHONE_SCREEN,
      });
    }
    return list;
  }, [isEmailSatisfied, hasGoogleAuth, hasMobile]);

  // Add/Register Passkey Flow
  const handleAddPasskey = async () => {
    if (!passkeySupported) {
      showError('Passkeys are not supported on this device');
      return;
    }

    if (activeSecurityCount >= 2) {
      try {
        setIsCreating(true);
        const optionsResult = await dispatch(getPasskeyRegistrationOptions());
        if (!optionsResult) return;

        const request = {
          challenge: optionsResult.challenge,
          rp:
            Platform.OS === 'ios'
              ? {
                  name: optionsResult.rp?.name || 'Arab Global Exchange',
                  id: optionsResult.rp?.id || PASSKEY_RP_ID,
                }
              : optionsResult.rp,
          user: optionsResult.user,
          pubKeyCredParams: optionsResult.pubKeyCredParams || [
            { alg: -7, type: 'public-key' }, // ES256 (Most compatible)
            { alg: -257, type: 'public-key' }, // RS64
          ],
          // Force use of platform authenticator (device biometrics)
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            residentKey: 'required',
            userVerification: 'required',
            ...(optionsResult.authenticatorSelection || {}),
          },
          timeout: 60000,
          attestation: 'none',

        };

        console.warn('[Passkey] Native create request:', JSON.stringify(request, null, 2));
        if (Platform.OS === 'ios') {
          dispatch(setLoading(false));
          await waitForPasskeyNativePrompt();
        }
        const passkeyResponse = await getNativePasskeyRegistration(request);
        console.warn('[Passkey] Native Passkey.create Response:', JSON.stringify(passkeyResponse, null, 2));
        if (passkeyResponse) {
          const emailId = userData?.emailId || userData?.email_id || '';
          const projectName = 'Arab Global Exchange';
          const defaultName = emailId ? `${projectName} - ${emailId.split('@')[0]}` : `${projectName} Passkey`;
          const deviceInfo = getMobilePasskeyDeviceInfo();
          console.log('[Passkey][EnablePasskey] register verify starting', { defaultName, deviceInfo });

          const verifyResult = await dispatch(verifyPasskeyRegistration(passkeyResponse, defaultName));
          console.log('[Passkey][EnablePasskey] verify result:', verifyResult);

          if (isVerifyPasskeyRegistrationSuccess(verifyResult)) {
            let passkeyId = extractPasskeyIdFromVerifyResult(verifyResult);

            if (!passkeyId) {
              const listRes = await dispatch(getPasskeyList());
              const list = listRes?.data?.passkeys || [];
              passkeyId = findNewestPasskeyId(list);
              console.log('[Passkey][EnablePasskey] passkeyId resolved from newest list item:', passkeyId);
            }

            if (passkeyId) {
              await saveLocalPasskeyDeviceInfo(String(passkeyId), deviceInfo);
              setLocalDeviceMap((prev) => ({
                ...prev,
                [String(passkeyId)]: deviceInfo,
              }));
              setPasskeys((prev) =>
                prev.map((pk) => {
                  const id = String(pk._id || pk.id || '');
                  return id === String(passkeyId) ? { ...pk, deviceInfo } : pk;
                }),
              );
              console.log('[Passkey][EnablePasskey] local deviceInfo saved + UI patched', passkeyId, deviceInfo);
            } else {
              console.log('[Passkey][EnablePasskey] could not resolve passkeyId — list refresh only');
            }

            await dispatch(getUserProfile());
            await fetchPasskeys();
          }
        }
      } catch (error) {
        console.warn('[Passkey] Registration error:', error);
        const msg = String(error?.message ?? error?.error ?? '');
        if (error?.name === 'NotAllowedError' || /cancelled|cancel/i.test(msg)) {
          showError('Registration was cancelled');
        } else if (error?.name === 'InvalidStateError') {
          showError('This passkey is already registered on this device.');
        } else if (Platform.OS === 'ios' && isPasskeyAssociatedDomainError(error)) {
          showError(
            'Passkey is not available on this iPhone yet. Host apple-app-site-association on arabglobal.ae, then try again.',
          );
        } else {
          showError(error?.message || 'Failed to create passkey');
        }
      } finally {
        setIsCreating(false);
      }
      return;
    }

    // If fewer than 2 active factors, trigger risk warning bottom sheet
    setRiskModalVisible(true);
  };

  // Delete Passkey Flow
  const handleDeleteClick = (passkey) => {
    setSelectedPasskey(passkey);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    console.log('[DEBUG][EnablePasskey] handleConfirmDelete called');
    if (!selectedPasskey) {
      console.log('[DEBUG][EnablePasskey] No selectedPasskey found, exiting delete flow');
      return;
    }
    console.log('[DEBUG][EnablePasskey] Target passkey to delete:', JSON.stringify(selectedPasskey));
    try {
      setIsDeleting(true);
      const signId = userData?.emailId || userData?.email_id || userData?.mobileNumber || userData?.mobile_number;
      console.log('[DEBUG][EnablePasskey] Verification signId identifier:', signId);
      if (!signId) {
        console.log('[DEBUG][EnablePasskey] No verification identifier found in userData, exiting');
        showError('No verification identifier found');
        return;
      }

      // 1. Verify identity with passkey (WebAuthn) or biometric fallback
      console.log('[DEBUG][EnablePasskey] Dispatching verifySecurityPasskey...');
      const result = await dispatch(verifySecurityPasskey(signId, true));
      console.log('[DEBUG][EnablePasskey] verifySecurityPasskey result:', result);

      // On Android, if Credential Manager fails but biometric succeeds,
      // verifySecurityPasskey returns 'BIOMETRIC_VERIFIED'.
      const skipPasskeyVerify = result === 'BIOMETRIC_VERIFIED' || result === 'SKIP_VERIFICATION';

      if (skipPasskeyVerify) {
        const availableFallbackMethods = [];
        if (hasGoogleAuth) availableFallbackMethods.push('totp');
        if (isEmailSatisfied) availableFallbackMethods.push('email');
        if (hasMobile) availableFallbackMethods.push('mobile');

        if (availableFallbackMethods.length > 0) {
          setDeleteModalVisible(false);
          NavigationService.navigate(routes.PASSKEY_SECURITY_VERIFICATION_SCREEN, {
            purpose: 'delete_passkey',
            verifyMethods: availableFallbackMethods,
            targetScreen: route?.name || routes.PASSKEY_SCREEN,
            targetParams: { deletePasskeyId: selectedPasskey._id },
            skipDirectVerification: true,
          });
        } else {
          showError('No active security method available for fallback verification.');
        }
        return;
      }

      const userId = result;
      console.log('[DEBUG][EnablePasskey] userId:', userId);

      if (!userId) {
        console.log('[DEBUG][EnablePasskey] Verification failed or cancelled by user, aborting deletion');
        return;
      }

      // 2. Perform delete passkey API request
      console.log('[DEBUG][EnablePasskey] Calling deletePasskey API for ID:', selectedPasskey._id);
      const success = await dispatch(deletePasskey(selectedPasskey._id, 'passkey', null, userId));
      console.log('[DEBUG][EnablePasskey] deletePasskey API response success status:', success);
      if (success) {
        setDeleteModalVisible(false);
        setSelectedPasskey(null);
        fetchPasskeys();
        console.log('[DEBUG][EnablePasskey] Passkey successfully deleted, UI refreshed');
      }
    } catch (error) {
      console.log('[DEBUG][EnablePasskey] Error caught in handleConfirmDelete:', error);
      console.warn('[Passkey] Delete failed:', error);
      showError(error?.message || 'Something went wrong');
    } finally {
      setIsDeleting(false);
      console.log('[DEBUG][EnablePasskey] handleConfirmDelete flow finished');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : '#F0F0F0' }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => NavigationService.goBack()}>
          <FastImage source={back_ic} tintColor={isDark ? colors.white : colors.black} style={{ width: 18, height: 18 }} resizeMode='contain' />
        </TouchableOpacity>

        <AppText type={EIGHTEEN} weight={BOLD} style={[styles.headerTitle, { color: themeColors.text }]}>
          Passkey
        </AppText>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => NavigationService.navigate(routes.CREATE_TICKET_SCREEN)}>
            <FastImage source={headPhoneIcon} tintColor={isDark ? colors.white : colors.black} style={{ width: 18, height: 18 }} resizeMode='contain' />
          </TouchableOpacity>
          {/* <TouchableOpacity style={styles.iconBtn}>
            <FastImage source={INFO} tintColor={isDark ? colors.white : colors.black} style={{ width: 18, height: 18 }} resizeMode='contain' />
          </TouchableOpacity> */}
        </View>
      </View>

      {loadingPasskeys ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={isDark ? colors.white : colors.black} />
        </View>
      ) : hasPasskeys ? (
        /* Registered Passkeys List Layout */
        <View style={styles.flexContainer}>
          <ScrollView contentContainerStyle={styles.listScrollContent}>
            <View style={styles.listHeaderWrap}>
              <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
                Registered Passkeys
              </AppText>
              <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 4 }}>
                Manage your added passkeys or delete them securely.
              </AppText>
            </View>

            <View style={styles.passkeyList}>
              {passkeys.map((pk) => (
                <View key={pk._id} style={[styles.passkeyCard, { backgroundColor: isDark ? colors.newThemeColor : '#F9F9FB', borderColor: isDark ? '#2A2A2E' : '#EBEBF0' }]}>
                  <View style={styles.passkeyCardMain}>
                    <View style={[styles.passkeyIconWrap, { backgroundColor: isDark ? '#2A2A2E' : '#ECECF0' }]}>
                      <FastImage source={FINGERPRINT} tintColor={isDark ? colors.white : colors.black} style={{ width: 30, height: 30 }} resizeMode='contain' />
                    </View>
                    <View style={styles.passkeyCardBody}>
                      <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
                        {pk.name || 'Passkey'}
                      </AppText>
                      <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 4 }}>
                        {formatPasskeyDeviceLabel(resolvePasskeyDeviceInfo(pk, localDeviceMap))}
                      </AppText>
                      <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 2 }}>
                        Added: {pk.createdAt ? new Date(pk.createdAt).toLocaleDateString() : '—'}
                      </AppText>
                      {pk.lastUsedAt && (
                        <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 2 }}>
                          Last used: {new Date(pk.lastUsedAt).toLocaleDateString()}
                        </AppText>
                      )}
                    </View>

                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteClick(pk)}>
                      <FastImage source={binIcon} tintColor={colors.red} style={{ width: 20, height: 20 }} resizeMode='contain' />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Add Another Passkey Bottom CTA */}
          <View style={styles.bottomContainer}>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: isDark ? themeColors.button : '#2A2A2E' }]}
              activeOpacity={0.8}
              onPress={handleAddPasskey}
            >
              <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: isDark ? themeColors.text : '#FFFFFF' }}>
                Add Another Passkey
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Empty / Intro Passkey Benefits Layout */
        <View style={styles.flexContainer}>
          <ScrollView contentContainerStyle={styles.introScrollContent}>
            <FastImage source={enablepasskey} style={{ width: 200, height: 200, alignSelf: 'center', marginTop: 20 }} resizeMode='contain' />

            <AppText type={TWENTY_TWO} weight={SEMI_BOLD} style={[styles.mainTitle, { color: themeColors.text }]}>
              Enable Passkey
            </AppText>

            {/* Feature List */}
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <View style={[styles.iconWrap, { backgroundColor: isDark ? '#2A2A2E' : '#F5F5F5' }]}>
                  <FastImage source={highsecurity} tintColor={isDark ? colors.white : colors.black} style={{ width: 24, height: 24 }} resizeMode='contain' />
                </View>
                <View style={styles.featureTextWrap}>
                  <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>High Security</AppText>
                  <AppText type={TWELVE} weight={MEDIUM} style={{ color: themeColors.secondaryText, marginTop: 4 }}>
                    Protect accounts from traditional password theft risks
                  </AppText>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={[styles.iconWrap, { backgroundColor: isDark ? '#2A2A2E' : '#F5F5F5' }]}>
                  <FastImage source={easyVerificaton} tintColor={isDark ? colors.white : colors.black} style={{ width: 24, height: 24 }} resizeMode='contain' />
                </View>
                <View style={styles.featureTextWrap}>
                  <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>Easy Verification</AppText>
                  <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 4 }}>
                    Verify in one tap, free from remembering complex passwords
                  </AppText>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={[styles.iconWrap, { backgroundColor: isDark ? '#2A2A2E' : '#F5F5F5' }]}>
                  <FastImage source={multidevice} tintColor={isDark ? colors.white : colors.black} style={{ width: 24, height: 24 }} resizeMode='contain' />
                </View>
                <View style={styles.featureTextWrap}>
                  <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>Multi-Device</AppText>
                  <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 4 }}>
                    Use passkey across devices seamlessly
                  </AppText>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Button */}
          <View style={styles.bottomContainer}>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: isDark ? '#FFFFFF' : '#2A2A2E' }]}
              activeOpacity={0.8}
              onPress={handleAddPasskey}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color={isDark ? '#000000' : '#FFFFFF'} size="small" />
              ) : (
                <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: isDark ? '#000000' : '#FFFFFF' }}>
                  Add a Passkey
                </AppText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Security Risk Modal */}
      <Modal
        visible={isRiskModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRiskModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setRiskModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.bottomSheet, { backgroundColor: isDark ? '#1E1E22' : '#FFFFFF' }]}>
            <View style={styles.handleBar} />

            <FastImage source={securityrisk} style={styles.modalIllustration} resizeMode="contain" />

            <AppText type={TWENTY} weight={BOLD} style={[styles.modalTitle, { color: themeColors.text }]}>
              Security Risk Warning
            </AppText>

            <AppText type={TWELVE} style={[styles.modalSubtitle, { color: themeColors.secondaryText }]}>
              To enhance your account security, please activate at least one additional verification method.
            </AppText>

            <View style={styles.modalOptions}>
              {missingMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[styles.optionCard, { borderColor: isDark ? '#333' : '#F0F0F0' }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setRiskModalVisible(false);
                    NavigationService.navigate(routes.PASSKEY_SECURITY_VERIFICATION_SCREEN, {
                      verifyMethods: ['email'],
                      purpose: method.id === 'phone' ? 'add_mobile' : 'totp_setup',
                      targetScreen: method.route,
                      skipDirectVerification: true,
                      targetParams: { fromScreen: routes.PASSKEY_SCREEN },
                    });
                  }}
                >
                  <FastImage source={method.icon} style={styles.optionIcon} tintColor={isDark? colors.white:undefined} resizeMode="contain" />
                  <AppText type={SIXTEEN} weight={MEDIUM} style={[styles.optionText, { color: themeColors.text }]}>{method.label}</AppText>
                  <FastImage source={right_ic} style={styles.rightArrow} tintColor="#C1C1C1" resizeMode="contain" />
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Delete Passkey Confirmation Modal */}
      <Modal
        visible={isDeleteModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDeleteModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.bottomSheet, { backgroundColor: isDark ? '#1E1E22' : '#FFFFFF' }]}>
            <View style={styles.handleBar} />

            <FastImage source={isDark? security_risk_vector_light: security_risk_vector} style={styles.modalIllustration} resizeMode="contain" />

            <AppText type={TWENTY} weight={BOLD} style={[styles.modalTitle, { color: themeColors.text }]}>
              Remove Passkey?
            </AppText>
            <AppText type={FOURTEEN} style={[styles.modalSubtitle, { color: themeColors.secondaryText, marginBottom: 24 }]}>
              You're about to delete "{selectedPasskey?.name || 'this passkey'}". For your safety, please authenticate with your passkey to confirm.
            </AppText>

            <View style={[styles.deleteActionWrap, { flexDirection: 'column' }]}>
              <TouchableOpacity
                style={[styles.deleteActionBtn, styles.confirmBtn, { width: '100%' }]}
                onPress={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: '#FFFFFF' }}>
                    Authenticate & Remove
                  </AppText>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.deleteActionBtn, { width: '100%', backgroundColor: 'transparent', height: 40 }]}
                onPress={() => setDeleteModalVisible(false)}
                disabled={isDeleting}
              >
                <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: '#767680' }}>
                  Cancel
                </AppText>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
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
    paddingHorizontal: 15,
    height: Platform.OS === 'ios' ? 44 : 56,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: 4,
    marginLeft: -8,
  },
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: -1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: 8,
  },
  flexContainer: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introScrollContent: {
    paddingHorizontal: 15,
    paddingBottom: 40,
  },
  listScrollContent: {
    paddingHorizontal: 15,
    paddingBottom: 40,
  },
  listHeaderWrap: {
    marginTop: 20,
    marginBottom: 20,
  },
  passkeyList: {
    gap: 16,
  },
  passkeyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,

  },
  passkeyCardMain: {
    flexDirection: 'row',
  },
  passkeyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  passkeyCardBody: {
    flex: 1,
  },
  deleteBtn: {
    padding: 8,
  },
  mainTitle: {
    textAlign: 'center',
    marginVertical: 24,
  },
  featuresList: {
    gap: 20,
  },
  featureItem: {
    flexDirection: 'row',
  },
  iconWrap: {
    width: 45,
    height: 45,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureTextWrap: {
    flex: 1,
  },
  bottomContainer: {
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingTop: 16,
  },
  addBtn: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSheet: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    alignItems: 'center',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginTop: 12,
    marginBottom: 24,
  },
  modalIllustration: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  modalTitle: {
    marginBottom: 12,
    textAlign: 'center',
  },
  modalSubtitle: {
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  modalOptions: {
    width: '100%',
    gap: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  optionIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  rightArrow: {
    width: 14,
    height: 14,
  },
  deleteDialog: {
    width: '85%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  deleteTitle: {
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteMessage: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  deleteActionWrap: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  deleteActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  confirmBtn: {
    backgroundColor: colors.red,
  },
});

export default EnablePasskey;
