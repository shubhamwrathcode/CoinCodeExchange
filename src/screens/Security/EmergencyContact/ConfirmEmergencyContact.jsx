import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../hooks/useTheme';
import NavigationService from '../../../navigation/NavigationService';
import * as routes from '../../../navigation/routes';
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
  TWENTY_TWO,
  TWENTY,
} from '../../../shared';
import { back_ic, editIcon, binIcon, peopleIcon, profileNewIcon } from '../../../helper/ImageAssets';
import { colors } from '../../../theme/colors';
import { appOperation } from '../../../appOperation';
import { showError, showSuccess } from '../../../helper/logger';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { getPasskeyList, getPasskeyAuthCredential } from '../../../actions/accountActions';

const ConfirmEmergencyContact = () => {
  const { colors: themeColors, isDark } = useTheme();
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const [isSaving, setIsSaving] = useState(false);

  const userData = useAppSelector((state) => state.auth.userData);
  const emailId = userData?.emailId || userData?.email || '';
  const profileMobile = userData?.mobileNumber || userData?.mobile_number || '';

  const [hasPasskey, setHasPasskey] = useState(false);
  const [checkingPasskey, setCheckingPasskey] = useState(true);

  // Retrieve contactData passed from the previous screen
  const contactData = route.params?.contactData || {
    name: 'Hello',
    email: 'agce12@gmail.com',
    phone: '',
    countryCode: '+91',
    _id: null,
  };

  useEffect(() => {
    const checkPasskeys = async () => {
      console.log('[DEBUG][ConfirmEmergencyContact] Checking passkey availability...');
      try {
        const res = await dispatch(getPasskeyList());
        console.log('[DEBUG][ConfirmEmergencyContact] getPasskeyList Response:', JSON.stringify(res, null, 2));
        if (res?.success && res.data?.passkeys?.length > 0) {
          console.log('[DEBUG][ConfirmEmergencyContact] Passkey found on account!');
          setHasPasskey(true);
        } else {
          console.log('[DEBUG][ConfirmEmergencyContact] No passkey found on account.');
          setHasPasskey(false);
        }
      } catch (err) {
        console.log('[DEBUG][ConfirmEmergencyContact] checkPasskeys Error:', err);
        setHasPasskey(false);
      } finally {
        setCheckingPasskey(false);
      }
    };
    checkPasskeys();
  }, [dispatch]);

  useEffect(() => {
    const handleSaveTrigger = async () => {
      if (route.params?.executeAction) {
        const { contactData: returnedContactData, emailOtp, smsOtp, tofaCode, passkeyCredential } = route.params;
        // Clean params immediately
        navigation.setParams({ executeAction: undefined });

        setIsSaving(true);
        try {
          const type = emailOtp ? 'email' : (smsOtp ? 'phone' : (tofaCode ? 'totp' : 'passkey'));
          const code = emailOtp || smsOtp || tofaCode || '';
          const credential = passkeyCredential;

          let res;
          if (returnedContactData._id) {
            // Edit mode
            res = await appOperation.customer.editEmergencyContact({
              contactId: returnedContactData._id,
              fullName: returnedContactData.name,
              emailId: returnedContactData.email,
              mobileNumber: `${returnedContactData.countryCode}${returnedContactData.phone}`,
              type,
              code,
              credential,
            });
          } else {
            // Add mode
            res = await appOperation.customer.addEmergencyContact({
              fullName: returnedContactData.name,
              emailId: returnedContactData.email,
              mobileNumber: `${returnedContactData.countryCode}${returnedContactData.phone}`,
              type,
              code,
              credential,
            });
          }

          if (res?.success) {
            showSuccess(res.message || 'Emergency contact saved successfully.');
            // Navigate back to EmergencyContactMain and trigger reload
            NavigationService.navigate(routes.EMERGENCY_CONTACT_SCREEN, { reload: true });
          } else {
            showError(res?.message || 'Failed to save contact.');
          }
        } catch (err) {
          showError(err?.message || 'Failed to save contact.');
        } finally {
          setIsSaving(false);
        }
      }
    };

    handleSaveTrigger();
  }, [route.params, navigation]);

  const handleSaveContact = async () => {
    console.log('[DEBUG][ConfirmEmergencyContact] handleSaveContact triggered. hasPasskey:', hasPasskey);
    if (isSaving) {
      console.log('[DEBUG][ConfirmEmergencyContact] Already saving, skipping click.');
      return;
    }

    if (hasPasskey) {
      const signId = emailId || profileMobile;
      if (signId) {
        setIsSaving(true);
        try {
          // Trigger the passkey biometric prompt directly (silent = true to suppress initial toast)
          const credential = await dispatch(getPasskeyAuthCredential(signId, true));

          if (credential) {
            let res;
            if (contactData._id) {
              // Edit mode
              res = await appOperation.customer.editEmergencyContact({
                contactId: contactData._id,
                fullName: contactData.name,
                emailId: contactData.email,
                mobileNumber: `${contactData.countryCode}${contactData.phone}`,
                type: 'passkey',
                code: '',
                credential,
              });
            } else {
              // Add mode
              res = await appOperation.customer.addEmergencyContact({
                fullName: contactData.name,
                emailId: contactData.email,
                mobileNumber: `${contactData.countryCode}${contactData.phone}`,
                type: 'passkey',
                code: '',
                credential,
              });
            }


            if (res?.success) {
              showSuccess(res.message || 'Emergency contact saved successfully.');
              NavigationService.navigate(routes.EMERGENCY_CONTACT_SCREEN, { reload: true });
              return;
            } else {
              showError(res?.message || 'Failed to save contact.');
            }
          } else {
            // Biometric prompt returned null (e.g. cancelled, or no credential found on local device).
            // Fall back immediately to the general Security Verification page!
            navigateToSecurityVerification();
          }
        } catch (err) {
          navigateToSecurityVerification();
        } finally {
          setIsSaving(false);
        }
        return;
      }
    }

    navigateToSecurityVerification();
  };

  const navigateToSecurityVerification = () => {
    NavigationService.navigate(routes.PASSKEY_SECURITY_VERIFICATION_SCREEN, {
      targetScreen: routes.CONFIRM_EMERGENCY_CONTACT_SCREEN,
      skipDirectVerification: true,
      returnRawCredential: true,
      purpose: 'security_verification',
      targetParams: {
        executeAction: true,
        contactData,
      },
    });
  };

  const handleEdit = () => {
    // Navigate back to the Add screen, passing back the current data to prefill
    NavigationService.navigate(routes.ADD_EMERGENCY_CONTACT_SCREEN, {
      prefillData: contactData,
    });
  };

  const handleDelete = () => {
    Alert.alert(
      "Discard Changes",
      "Are you sure you want to discard this emergency contact?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            // Navigate back to main screen
            NavigationService.navigate(routes.EMERGENCY_CONTACT_SCREEN);
          }
        }
      ]
    );
  };

  return (
    <AppSafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* Header matching mockup */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => NavigationService.goBack()}>
          <FastImage
            source={back_ic}
            tintColor={isDark ? colors.white : colors.black}
            style={{ width: 20, height: 20 }}
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
          Confirm Information
        </AppText>

        <AppText
          type={THIRTEEN}
          weight={MEDIUM}
          style={[styles.mainSubtitle, { color: themeColors.secondaryText }]}
        >
          Please review the contact details carefully before continuing. We will use this information to reach your emergency contact when the conditions you set are triggered.
        </AppText>

        {/* Contact detail box/card */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.inputBorder : '#FFFFFF', }]}>

          {/* Header row: User Avatar + Name + Action Buttons */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.userInfoContainer}>
              <FastImage
                source={profileNewIcon}
                style={styles.userIcon}
                tintColor={isDark ? colors.white : '#000000'}
                resizeMode="contain"
              />
              <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
                {contactData.name || 'Hello'}
              </AppText>
            </View>

            {/* Edit / Delete Icons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity onPress={handleEdit} style={styles.iconBtn}>
                <FastImage
                  source={editIcon}
                  style={styles.actionIcon}
                  // tintColor={colors.n}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
                <FastImage
                  source={binIcon}
                  style={[styles.actionIcon, { width: 18, height: 18 }]}
                  tintColor={isDark ? colors.white : '#000000'}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Details Row: Contact Email */}
          <View style={[styles.detailRow, { borderBottomColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
            <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: themeColors.secondaryText }}>
              Contact Email
            </AppText>
            <AppText type={THIRTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
              {contactData?.email || 'Not Provided'}
            </AppText>
          </View>

          {/* Details Row: Contact Phone Number */}
          <View style={styles.detailRow}>
            <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: themeColors.secondaryText }}>
              Contact Phone Number
            </AppText>
            <AppText type={THIRTEEN} weight={MEDIUM} style={{ color: themeColors.text }}>
              {contactData.phone ? `${contactData.countryCode} ${contactData.phone}` : 'Not Provided'}
            </AppText>
          </View>

        </View>
      </View>

      {/* Footer Button: Save */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.continueBtn, { backgroundColor: isDark ? '#FFFFFF' : '#2A2A2E', opacity: isSaving ? 0.6 : 1 }]}
          activeOpacity={0.8}
          disabled={isSaving}
          onPress={handleSaveContact}
        >
          {isSaving ? (
            <ActivityIndicator color={isDark ? '#000000' : '#FFFFFF'} />
          ) : (
            <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: isDark ? '#000000' : '#FFFFFF' }}>
              Save
            </AppText>
          )}
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
    paddingHorizontal: 18,
    height: Platform.OS === 'ios' ? 44 : 56,
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
    marginBottom: 10,
  },
  card: {
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: 6,
    marginLeft: 5,
  },
  actionIcon: {
    width: 16,
    height: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingTop: 16,
  },
  continueBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ConfirmEmergencyContact;
