import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../hooks/useTheme';
import RBSheet from 'react-native-raw-bottom-sheet';
import { appOperation } from '../../../../appOperation';
import { useAppSelector, useAppDispatch } from '../../../../store/hooks';
import {
  AppSafeAreaView,
  AppText,
  EIGHTEEN,
  SEMI_BOLD,
  FOURTEEN,
  MEDIUM,
  SIXTEEN,
  BOLD,
  THIRTEEN,
  TWELVE,
  NORMAL,
} from '../../../../shared';
import FastImage from 'react-native-fast-image';
import { back_ic, closeAccountBanner, disableAccount, profileNewIcon } from '../../../../helper/ImageAssets';
import { colors } from '../../../../theme/colors';
import * as routes from '../../../../navigation/routes';
import { logoutAction } from '../../../../actions/authActions';
import { showError, showSuccess } from '../../../../helper/logger';

const REASONS = [
  'I no longer wish to use this account',
  'Merge multiple accounts into one',
  'Others',
];

const formatEstimatedTotalBtc = (value) => {
  const n = Number(value);
  if (isNaN(n) || !isFinite(n)) return '0';
  return parseFloat(n.toFixed(8)).toString();
};

const pickPreferredVerificationMethod = (methods) => {
  if (!methods) return null;
  const appPriority = ['totp', 'email', 'mobile'];
  return appPriority.find((k) => methods[k]) || null;
};

const CloseAccountReasonScreen = () => {
  const navigation = useNavigation();
  const { colors: themeColors, isDark } = useTheme();

  const [step, setStep] = useState(1);
  const [selectedReason, setSelectedReason] = useState(REASONS[0]);
  const [agreed, setAgreed] = useState(false);
  const sheetRef = useRef(null);
  const dispatch = useAppDispatch();

  const [estimatedTotalBtc, setEstimatedTotalBtc] = useState('0');
  const [walletTotalLoading, setWalletTotalLoading] = useState(true);

  const [resolvedMethods, setResolvedMethods] = useState(null);
  const [methodsLoading, setMethodsLoading] = useState(true);

  React.useEffect(() => {
    const fetchOnMount = async () => {
      try {
        setWalletTotalLoading(true);
        setMethodsLoading(true);

        // Fetch portfolio balance
        appOperation.customer.get_security_wallet_total_btc()
          .then(res => {
            if (res?.success) {
              const raw = res?.data?.estimated_total_btc ?? res?.data?.data?.estimated_total_btc ?? res?.estimated_total_btc ?? '0';
              setEstimatedTotalBtc(raw);
            }
          })
          .catch(e => console.log('Error fetching portfolio:', e))
          .finally(() => setWalletTotalLoading(false));

        // Fetch enabled security verification methods
        const resMethods = await appOperation.customer.get_security_methods_list();
        if (resMethods?.success) {
          const raw =
            resMethods?.data?.security_methods ||
            resMethods?.data?.data?.security_methods ||
            resMethods?.security_methods ||
            resMethods?.data?.securityMethods ||
            {};
          setResolvedMethods({
            email: !!raw.email,
            mobile: !!(raw.mobile ?? raw.phone ?? raw.sms),
            totp: !!raw.totp,
            passkey: !!raw.passkey,
          });
        }
      } catch (err) {
        console.log('Error in mount fetch:', err);
      } finally {
        setMethodsLoading(false);
      }
    };
    fetchOnMount();
  }, []);

  const userData = useAppSelector((state) => state.auth?.userData);
  const userName = userData?.userName || 'CoincodeUser';
  const uid = userData?.id || 'UID:52444419';

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      if (agreed) {
        sheetRef.current?.open();
      }
    }
  };

  const processAccountClosure = () => {
    sheetRef.current?.close();

    if (methodsLoading) {
      showError("Loading security methods. Please wait...");
      return;
    }

    if (!resolvedMethods) {
      showError("Could not retrieve security settings.");
      return;
    }

    const priority = ['passkey', 'totp', 'email', 'mobile'];
    const activeList = priority.filter(k => resolvedMethods[k]);
    if (activeList.length === 0) {
      showError("Please enable a verification method first.");
      return;
    }

    navigation.navigate(routes.PASSKEY_SECURITY_VERIFICATION_SCREEN, {
      purpose: 'delete_account',
      verifyMethods: activeList,
    });
  };

  const renderStep1 = () => (
    <View style={styles.content}>
      <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={[styles.title, { color: themeColors.text, marginBottom: 24 }]}>
        Personal Data Retention
      </AppText>
      <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: isDark ? '#8A8A93' : '#8E8E93', lineHeight: 22 }}>
        We inform you that the personal data you provided while using our services will be retained as long as necessary to fulfill the purposes outlined in our Privacy Policy, and to comply with legal obligations such as tax, accounting, Anti-Money Laundering regulations, or to resolve disputes and legal claims.
      </AppText>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.content}>
      <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={[styles.title, { color: themeColors.text, marginBottom: 40 }]}>
        Why do you want to close your account?
      </AppText>

      <View style={styles.optionsContainer}>
        {REASONS.map((reason, index) => {
          const isSelected = selectedReason === reason;
          return (
            <TouchableOpacity
              key={index}
              style={styles.optionRow}
              onPress={() => setSelectedReason(reason)}
              activeOpacity={0.7}
            >
              <AppText type={FOURTEEN} weight={MEDIUM} style={[styles.optionText, { color: themeColors.text }]}>
                {reason}
              </AppText>

              <View style={[
                styles.radioOuter,
                { borderColor: isSelected ? (isDark ? colors.white : colors.black) : (isDark ? '#2C2C2E' : '#E5E5EA') }
              ]}>
                {isSelected && (
                  <View style={[styles.radioInner, { backgroundColor: isDark ? colors.white : '#2A2A2E' }]} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.scrollContent}>
      <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={[styles.titleCentered, { color: themeColors.text }]}>
        Coincode Account Deregistration{'\n'}Terms and Conditions
      </AppText>

      <AppText type={TWELVE} weight={MEDIUM} style={[styles.termsText, { color: isDark ? '#8A8A93' : '#8E8E93' }]}>
        ACCOUNT OPENED WITH Coincode, YOU MUST CAREFULLY READ THE TERMS AND CONDITIONS IN ITS ENTIRELY CONTEMPLATED HEREOF.{'\n\n'}
        This Coincode Account Deregistration Terms and Conditions ("Terms") applies to all users who wishes to, requests or applies to deregister or cancel its account ("Coincode Account") opened or registered with or on the Sites of Coincode ("Coincode", "we", "our", "us", "ours"). By submitting an application or request for or proceeding with the deregistration and cancellation of your Coincode Account, you will be deemed to have fully read, understood and expressly agreed and consented to the Terms.{'\n\n'}
        The Terms shall be supplemental to and constitute part of the Coincode User Agreement (available at https://www.Coincode.com/zh/user-agreement) ("User Agreement") and should be read in conjunction with such User Agreement. Therefore, unless otherwise stated in this Agreement, the capitalized terms used in this Agreement shall have the same meaning given to them under the User Agreement. Where a term is defined both in the Terms and the User Agreement, for the purposes of these Terms only, the definition in these Terms shall prevail.{'\n\n'}
      </AppText>

      <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 10 }}>
        1 DEREGISTRATION OF YOUR Coincode ACCOUNT
      </AppText>
      <AppText type={TWELVE} weight={MEDIUM} style={[styles.termsText, { color: isDark ? '#8A8A93' : '#8E8E93' }]}>
        (a) You may request or apply to cancel and deregister your Coincode Account ("Account Deregistration") by submitting a request and following instructions on relevant pages in the "Security Centre" of your account.{'\n\n'}
        (b) You must input your password of your Coincode Account and provide all other information or take other verification procedures such as Face ID required by us for security verification purposes before proceeding to the next step of deregistration.{'\n\n'}
        (c) Before completing the deregistration process, you must ensure that all assets, open orders, and pending transactions in your account have been fully cleared.
      </AppText>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.scrollContent}>
      <View style={styles.illustrationContainer}>
        <FastImage source={closeAccountBanner} style={styles.illustration} resizeMode="contain" />
      </View>

      <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={[styles.titleCentered, { color: themeColors.text }]}>
        Close Your Account
      </AppText>

      <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginTop: 10, marginBottom: 12 }}>
        You have the following assets:
      </AppText>

      <View style={[styles.assetsCard, { backgroundColor: isDark ? '#1C1C1E' : '#F5F5F7' }]}>
        <View style={styles.assetRow}>
          <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: themeColors.text }}>NFT</AppText>
          <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>0</AppText>
        </View>
        <View style={[styles.assetDivider, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]} />
        <View style={styles.assetRow}>
          <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: themeColors.text }}>Crypto Assets</AppText>
          <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
            {walletTotalLoading ? '...' : `${formatEstimatedTotalBtc(estimatedTotalBtc)}`} BTC
          </AppText>
        </View>
      </View>

      <View style={[styles.warningBox, { backgroundColor: colors.iconBgColor }]}>
        <AppText type={TWELVE} weight={SEMI_BOLD} style={[styles.warningText, { color: themeColors.text, marginBottom: 16 }]}>
          Once your account is closed, the following information will be deleted and cannot be recovered, including but not limited to:
        </AppText>

        {[
          'You will not be able to recover this account.',
          'You will no longer be able to log in to this account or its subaccounts.',
          'The trading functions of this account and its subaccounts will be disabled.',
          'Your Coincode Card will be closed and can no longer be used.',
          'The authorized devices for this account will be removed automatically.',
          'All pending withdrawals, deposits, and transactions associated with this account will be permanently canceled.',
          'Rewards, bonuses, and promotional benefits linked to this account will expire immediately after account closure.'
        ].map((item, idx) => (
          <View key={idx} style={styles.bulletRow}>
            <View style={[styles.bulletCircle, { backgroundColor: themeColors.text }]} />
            <AppText type={TWELVE} weight={MEDIUM} style={[styles.warningText, { color: themeColors.text, flex: 1 }]}>
              {item}
            </AppText>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.checkboxRow} onPress={() => setAgreed(!agreed)} activeOpacity={0.8}>
        <View style={[styles.checkbox, { borderColor: isDark ? '#2C2C2E' : '#E5E5EA', backgroundColor: agreed ? (isDark ? colors.white : '#2A2A2E') : 'transparent' }]}>
          {agreed && <AppText type={TWELVE} style={{ color: isDark ? colors.black : colors.white, textAlign: 'center', }}>✓</AppText>}
        </View>
        <AppText type={TWELVE} weight={MEDIUM} style={[styles.checkboxText, { color: isDark ? '#8A8A93' : '#8E8E93' }]}>
          I agree to relinquish all remaining assets in this account and confirm that I fully waive and release any claims. I will not hold Coincode responsible for any account closure or loss of balance.
        </AppText>
      </TouchableOpacity>
    </View>
  );

  return (
    <AppSafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#121214' : colors.white }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <FastImage
            source={back_ic}
            style={{ width: 35, height: 35 }}
            resizeMode='contain'
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: Platform.OS === 'ios' ? 34 : 24 }} showsVerticalScrollIndicator={false}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}

        {/* Spacer to push button to the bottom if content doesn't fill the screen */}
        <View style={{ flex: 1 }} />

        {/* Bottom Button */}
        <View style={styles.bottomContainerRelative}>
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              { backgroundColor: isDark ? '#2E2E32' : '#2A2A2E' },
              (step === 4 && !agreed) && { opacity: 0.5 }
            ]}
            activeOpacity={0.8}
            onPress={handleNext}
            disabled={step === 4 && !agreed}
          >
            <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: '#FFFFFF' }}>
              {step === 1 ? 'Disable Account' : step === 2 ? 'Confirm' : 'Accept and Continue'}
            </AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <RBSheet
        ref={sheetRef}
        height={580}
        openDuration={250}
        customStyles={{
          container: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            backgroundColor: isDark ? '#121214' : colors.white,
          }
        }}
      >
        <View style={styles.sheetContent}>
          <View style={styles.sheetHandle} />

          <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={[styles.sheetTitle, { color: themeColors.text }]}>
            Are you sure you want to close this account?
          </AppText>
          <AppText type={THIRTEEN} weight={NORMAL} style={[styles.sheetDesc, { color: themeColors.text }]}>
            Once your account closure is confirmed, it cannot be reversed. Please ensure you understand and accept all associated risks.
          </AppText>

          <AppText type={THIRTEEN} weight={NORMAL} style={[styles.sheetSub, { color: isDark ? '#8A8A93' : '#8E8E93' }]}>
            Account to be closed
          </AppText>

          <View style={[styles.userCard, { backgroundColor: isDark ? '#1C1C1E' : '#F5F5F7' }]}>
            <FastImage source={profileNewIcon} style={styles.userIcon} resizeMode="contain" />
            <View style={styles.userInfo}>
              <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{userName}</AppText>
              <AppText type={TWELVE} weight={MEDIUM} style={{ color: isDark ? '#8A8A93' : '#8E8E93', marginTop: 4 }}>{uid}</AppText>
            </View>
          </View>

          <View style={styles.sheetBulletRow}>
            <View style={[styles.sheetBulletCircle, { backgroundColor: isDark ? '#8A8A93' : '#8E8E93' }]} />
            <AppText type={THIRTEEN} weight={NORMAL} style={[styles.sheetBulletText, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}>
              All pending withdrawals, deposits, and transactions associated with this account will be permanently canceled.
            </AppText>
          </View>
          <View style={styles.sheetBulletRow}>
            <View style={[styles.sheetBulletCircle, { backgroundColor: isDark ? '#8A8A93' : '#8E8E93' }]} />
            <AppText type={THIRTEEN} weight={NORMAL} style={[styles.sheetBulletText, { color: isDark ? '#FFFFFF' : '#1A1A1A' }]}>
              Rewards, bonuses, and promotional benefits linked to this account will expire immediately after account closure.
            </AppText>
          </View>

          <View style={styles.sheetBtns}>
            <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: isDark ? '#2C2C2E' : '#F5F5F7' }]} onPress={() => sheetRef.current?.close()}>
              <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>Cancel</AppText>
            </TouchableOpacity>
            <View style={{ width: 16 }} />
            <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: isDark ? '#2E2E32' : '#2A2A2E' }]} onPress={processAccountClosure}>
              <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: colors.white }}>Close</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </RBSheet>

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
    paddingHorizontal: 13,
    height: Platform.OS === 'ios' ? 44 : 56,
  },
  headerBtn: {
    padding: 6,
    marginLeft: -4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  scrollContent: {
    paddingHorizontal: 15,
  },
  title: {
    fontSize: 22,
    lineHeight: 30,
  },
  titleCentered: {
    fontSize: 22,
    lineHeight: 30,
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  optionsContainer: {
    marginTop: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
  },
  optionText: {
    flex: 1,
    paddingRight: 16,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  termsText: {
    lineHeight: 18
  },
  illustrationContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  illustration: {
    width: 120,
    height: 120,
  },
  warningBox: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  warningText: {
    lineHeight: 18,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bulletCircle: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    marginRight: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderRadius: 4,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxText: {
    flex: 1,
    lineHeight: 18,
  },
  bottomContainerRelative: {
    paddingHorizontal: 15,
    marginTop: 20,
  },
  confirmBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  sheetTitle: {
    fontSize: 20,
    lineHeight: 28,
    marginBottom: 16,
  },
  sheetDesc: {
    lineHeight: 20,
    marginBottom: 24,
  },
  sheetSub: {
    marginBottom: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  userIcon: {
    width: 30,
    height: 30,
    borderRadius: 20,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  sheetBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sheetBulletCircle: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    marginRight: 8,
  },
  sheetBulletText: {
    flex: 1,
    lineHeight: 20,
  },
  sheetBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  sheetBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  assetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  assetDivider: {
    height: 1,
    marginVertical: 12,
  },
});

export default CloseAccountReasonScreen;
