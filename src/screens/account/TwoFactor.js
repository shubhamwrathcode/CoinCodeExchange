import React, { useState, useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  View,
  ScrollView,
  Platform,
  TouchableOpacity,
  Switch,
  Modal,
} from 'react-native';
import {
  AppSafeAreaView,
  AppText,
  SEMI_BOLD,
  BOLD,
  SIXTEEN,
  FOURTEEN,
  TEN,
  THIRTEEN,
  ELEVEN,
  EIGHTEEN,
  Button,
} from '../../shared';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import FastImage from 'react-native-fast-image';
import {
  account_restrictions,
  back_ic,
  checkIc,
  EMAIL,
  FINGERPRINT,
  fundpass,
  googleAuthenticator,
  lock_ic,
  LOCK_ICON,
  PHONE,
  SECURITY_SHEIELD,
} from '../../helper/ImageAssets';
import {
  ADD_PHONE_NUMBER_SCREEN,
  ADD_EMAIL_SCREEN,
  SETUP_TWO_FACTOR_SCREEN,
  ADD_PASSKEY_SCREEN,
  CHANGE_EMAIL_SCREEN,
  CHANGE_MOBILE_SCREEN,
  VIEW_PASSKEYS_SCREEN,
  DISABLE_2FA_SCREEN,
  ANTI_PHISHING_CODE_SCREEN,
  CHANGE_PASSWORD_SCREEN,
  WITHDRAWAL_SETTINGS_SCREEN
} from '../../navigation/routes';
import {
  getUserProfile,
  getPasskeyList,
  sendSecurityOtp,
  getFundPasswordStatusAction,
} from '../../actions/accountActions';
import { showError } from '../../helper/logger';
import { Passkey } from 'react-native-passkey';
import { useTheme } from "../../hooks/useTheme";
import TouchableOpacityView from '../../common/TouchableOpacityView';
import { colors, lightTheme } from '../../theme/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SHIMMER_STRIP = 180;
const H_PAD = 24;
const CARD_W = SCREEN_WIDTH - H_PAD;

/** Strings aligned with `arab_global_exchange` TwofactorPage 2FA card. */
const TWO_FA_COPY = {
  subtitle:
    'Choose Passkeys, Verification Code, or Trading Password to ensure the safety of your assets',
  passkeys: {
    title: 'Passkeys',
    recommended: 'Recommended',
    desc:
      'Enables secure, passwordless authentication using device-based credentials. Provides faster logins and stronger protection against phishing and unauthorized access.',
  },
  google: {
    title: 'Google Authenticator',
    desc: 'Generates time-based one-time codes for secure login verification. Adds an extra layer of protection beyond passwords to prevent unauthorized access.',
  },
  email: {
    title: 'Email Verification',
    desc: 'Securely verifies user identity via email confirmation, adding an extra layer of protection.',
  },
  phone: {
    title: 'Phone Verification',
    desc: 'Securely verifies user identity using SMS-based OTP. Ensures safe logins and protects sensitive actions with an added layer of security.',
  },
};

const ADVANCED_SEC_COPY = {
  title: 'Advanced Security',
  subtitle: 'Add extra layers of protection to your account operations',
  login2step: {
    title: 'Login 2-Step Verification',
    desc: 'Require 2FA verification when logging into your account',
  },
  antiPhishing: {
    title: 'Anti-Phishing Code',
    desc: 'Protects your account from phishing attempts by adding a unique code to all official emails. Ensures emails are genuinely from us.',
  },
  fundPassword: {
    title: 'Fund Password',
    desc: 'Adds an extra password layer for transactions and withdrawals. Ensures stronger protection for funds against unauthorized actions.',
  },
  withdrawalSettings: {
    title: 'Withdrawal Settings',
    desc: 'Manage addresses and withdrawal preferences. Adds extra security to fund transfers by requiring 2FA for unsaved addresses.',
  }
};

const ACCOUNT_MGMT_COPY = {
  disableAccount: {
    title: 'Disable Account',
    desc: 'Allows users to temporarily deactivate their account for added security. Prevents access and protects data until the account is re-enabled.'
  },
  closeAccount: {
    title: 'Close Account',
    desc: 'Permanently deletes the user account and associated data. Ensures complete removal of access and disables all related services.'
  }
};

const maskTwoFaEmail = (email) => {
  if (!email) return '';
  const [username, domain] = String(email).split('@');
  if (!domain) return email;
  const masked = username.substring(0, 2) + '***' + username.slice(-1);
  return `${masked}@${domain}`;
};

const maskTwoFaPhone = (phone) => {
  if (!phone) return '';
  const str = String(phone).replace(/\s/g, '');
  if (str.length < 7) return str;
  return str.substring(0, 3) + '****' + str.slice(-4);
};

const headerIconSurface = (isDark) => ({
  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
});

const TwoFaSimpleRow = ({
  themeColors,
  isDark,
  iconSource,
  title,
  badge,
  description,
  hasValue,
  statusText,
  isBooleanStatus,
  actionLabel,
  onAction,
  disabled,
  isLast,
}) => (
  <View style={[styles.simpleRow, !isLast && { borderBottomColor: themeColors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
    <View style={styles.simpleRowLeftWrapper}>
      <View style={[styles.methodIconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#EAEDF0' }]}>
        <FastImage source={iconSource} style={styles.methodIconImg} resizeMode="contain" />
      </View>
      <View style={styles.simpleRowLeft}>
        <View style={styles.simpleRowTitleWrap}>
          <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
            {title}
          </AppText>
          {badge}
        </View>
        <AppText type={ELEVEN} style={{ color: themeColors.secondaryText, marginTop: 4, lineHeight: 16 }}>
          {description}
        </AppText>
      </View>
    </View>

    <View style={styles.simpleRowRight}>
      <View style={styles.simpleRowStatusWrap}>
        {isBooleanStatus && (
          <FastImage
            source={checkIc}
            style={{ width: 14, height: 14, marginRight: 4 }}
            tintColor={hasValue ? themeColors.text : themeColors.secondaryText}
            resizeMode="contain"
          />
        )}
        <AppText
          type={THIRTEEN}
          style={{ color: hasValue && isBooleanStatus ? themeColors.text : themeColors.secondaryText }}
        >
          {hasValue ? statusText : 'off'}
        </AppText>
      </View>
      <TouchableOpacityView
        activeOpacity={0.85}
        onPress={onAction}
        disabled={disabled}
        style={[
          styles.simpleActionBtn,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F0F2F5', opacity: disabled ? 0.5 : 1 }
        ]}
      >
        <AppText type={THIRTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
          {actionLabel}
        </AppText>
      </TouchableOpacityView>
    </View>
  </View>
);

const ShimmerCell = ({ width: w, height, borderRadius = 6, style }) => {
  const shimmerX = useRef(new Animated.Value(-SHIMMER_STRIP)).current;
  const mounted = useRef(true);
  const { isDark } = useTheme();

  useEffect(() => {
    mounted.current = true;
    const run = () => {
      if (!mounted.current) return;
      shimmerX.setValue(-SHIMMER_STRIP);
      Animated.timing(shimmerX, {
        toValue: Math.max(w, 1) + SHIMMER_STRIP,
        duration: 1100,
        useNativeDriver: true,
      }).start(({ finished }) => { if (mounted.current && finished) run(); });
    };
    const t = setTimeout(run, 50);
    return () => { mounted.current = false; clearTimeout(t); shimmerX.stopAnimation(); };
  }, [shimmerX, w]);

  return (
    <View style={[{ width: w, height, borderRadius, overflow: 'hidden', backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }, style]}>
      <Animated.View
        style={{ position: 'absolute', top: 0, bottom: 0, width: SHIMMER_STRIP, transform: [{ translateX: shimmerX }], backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.4)' }}
      />
    </View>
  );
};

const SecurityCard = ({ title, subtitle, children, themeColors, isDark, style }) => (
  <View style={[styles.cardContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'transparent', borderColor: themeColors.border }, style]}>
    {(title || subtitle) && (
      <View style={[styles.cardHeader, { borderBottomColor: themeColors.border }]}>
        {title && <AppText type={SIXTEEN} weight={BOLD} style={{ color: themeColors.text, marginBottom: subtitle ? 4 : 0 }}>{title}</AppText>}
        {subtitle && <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText }}>{subtitle}</AppText>}
      </View>
    )}
    <View style={styles.cardBody}>
      {children}
    </View>
  </View>
);

const TwoFaCardsSkeleton = () => {
  const { colors: themeColors, isDark } = useTheme();
  return (
    <View style={styles.cardsStack}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={[styles.simpleRow, { borderBottomColor: themeColors.border }]}>
          <View style={styles.simpleRowLeftWrapper}>
            <ShimmerCell width={44} height={44} borderRadius={12} />
            <View style={{ marginLeft: 12, flex: 1, gap: 8 }}>
              <ShimmerCell width={120} height={16} borderRadius={4} />
              <ShimmerCell width={SCREEN_WIDTH * 0.4} height={12} borderRadius={4} />
            </View>
          </View>
          <View style={styles.simpleRowRight}>
            <ShimmerCell width={40} height={16} borderRadius={4} style={{ marginRight: 16 }} />
            <ShimmerCell width={70} height={36} borderRadius={20} />
          </View>
        </View>
      ))}
    </View>
  );
};

const TwoFactor = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const { colors: themeColors, isDark } = useTheme();
  const userData = useAppSelector((state) => state.auth.userData);
  const current2fa = userData?.['2fa'] ?? 0;
  const profileMobile = userData?.mobileNumber ?? userData?.mobile_number ?? '';
  const profileCountryCode = userData?.country_code ?? userData?.countryCode ?? '';
  const mobileNumber = profileCountryCode && profileMobile ? `${profileCountryCode} ${profileMobile}`.trim() : profileMobile || '';
  const emailId = userData?.emailId ?? userData?.email_id ?? '';
  const hasEmail = !!emailId;
  const hasMobile = !!profileMobile;
  const hasGoogleAuth = current2fa === 2 || !!(userData?.totp || userData?.TOTP || userData?.google_authenticator || userData?.googleAuthenticator || userData?.isTotp || userData?.totp_enabled);

  const [fundPasswordStatus, setFundPasswordStatus] = useState(null);
  const effectiveHasFundPassword =
    fundPasswordStatus ?? (userData?.fundPassword || userData?.payPin || userData?.isFundPasswordSet);

  const [passkeySupported, setPasskeySupported] = useState(false);
  const [passkeys, setPasskeys] = useState([]);
  const hasPasskey = passkeys.length > 0;
  const [contentLoading, setContentLoading] = useState(true);

  const [isRestrictModalOpen, setRestrictModalOpen] = useState(false);
  const [pendingChangeType, setPendingChangeType] = useState('login'); // 'login' or 'fund'
  const isFund = pendingChangeType === 'fund';
  const profileDone = useRef(false);
  const passkeysDone = useRef(false);
  const fundDone = useRef(false);

  const checkPasskeySupport = () => {
    try {
      const supported = Passkey.isSupported();
      setPasskeySupported(!!supported);
    } catch {
      setPasskeySupported(false);
    }
  };

  const fetchPasskeys = async () => {
    try {
      const res = await dispatch(getPasskeyList());
      if (res?.success && res?.data) {
        setPasskeys(res.data.passkeys || []);
      }
    } catch (_) {
    } finally {
      passkeysDone.current = true;
      if (profileDone.current && fundDone.current) setContentLoading(false);
    }
  };

  const fetchFundStatus = async () => {
    try {
      const res = await dispatch(getFundPasswordStatusAction());
      setFundPasswordStatus(!!res);
    } catch (_) {
    } finally {
      fundDone.current = true;
      if (profileDone.current && passkeysDone.current) setContentLoading(false);
    }
  };

  useEffect(() => {
    checkPasskeySupport();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      profileDone.current = false;
      passkeysDone.current = false;
      fundDone.current = false;
      setContentLoading(true);
      dispatch(getUserProfile()).then(() => {
        profileDone.current = true;
        if (passkeysDone.current && fundDone.current) setContentLoading(false);
      });
      fetchPasskeys();
      fetchFundStatus();
    }, [])
  );

  const getActiveMethodsCount = () => {
    let count = 0;
    if (hasEmail) count++;
    if (hasMobile) count++;
    if (hasGoogleAuth) count++;
    if (hasPasskey) count++;
    return count;
  };

  const canMakeSensitiveChanges = () => getActiveMethodsCount() >= 2;

  const handleDisableGoogleAuthStart = () => {
    if (!canMakeSensitiveChanges()) {
      showError('You need at least 2 security methods to disable Google Authenticator');
      return;
    }
    navigation.navigate(DISABLE_2FA_SCREEN);
  };

  const handleAddPasskeyPress = () => {
    if (!passkeySupported) {
      showError('Passkeys are not supported on this device/browser');
      return;
    }
    if (!hasEmail && !hasMobile && !hasGoogleAuth) {
      showError('You need email, mobile or Google Authenticator to add a passkey');
      return;
    }
    navigation.navigate(ADD_PASSKEY_SCREEN);
  };

  const handleAntiPhishingStart = () => {
    navigation.navigate(ANTI_PHISHING_CODE_SCREEN);
  };

  const handleAddMobileStart = () => {
    if (!hasEmail && !hasGoogleAuth && !hasPasskey) {
      showError('You need email, Google Authenticator, or a Passkey to add a mobile number');
      return;
    }
    navigation.navigate(ADD_PHONE_NUMBER_SCREEN);
  };

  const handleChangeMobileStart = () => {
    if (!canMakeSensitiveChanges()) {
      showError('Add another method first to change mobile');
      return;
    }
    navigation.navigate(ADD_PHONE_NUMBER_SCREEN);
  };

  const handleChangeEmailStart = () => {
    if (!canMakeSensitiveChanges()) {
      showError('Add another method first to change email');
      return;
    }
    navigation.navigate(ADD_EMAIL_SCREEN);
  };

  const onPasskeySwitch = (v) => {
    if (v) {
      if (!hasPasskey) handleAddPasskeyPress();
      return;
    }
    if (hasPasskey) navigation.navigate(VIEW_PASSKEYS_SCREEN);
  };

  const onGoogleSwitch = (v) => {
    if (v) {
      if (!hasGoogleAuth) {
        if (!hasEmail && !hasMobile && !hasPasskey) {
          showError('You need an email, mobile number, or Passkey to set up Google Authenticator');
          return;
        }

        // Pick preferred method: Passkey > Email > Mobile
        let preferred = 'email';
        if (hasPasskey) preferred = 'passkey';
        else if (hasEmail) preferred = 'email';
        else if (hasMobile) preferred = 'mobile';

        navigation.navigate(ADD_EMAIL_SCREEN, {
          mode: 'verify_for_ga',
          preferredMethod: preferred
        });
      }
      return;
    }
    if (hasGoogleAuth) handleDisableGoogleAuthStart();
  };

  const handlePasswordChangePress = () => {
    setPendingChangeType('login');
    setRestrictModalOpen(true);
  };

  const handleFundPasswordPress = () => {
    setPendingChangeType('fund');
    setRestrictModalOpen(true);
  };

  const handleRestrictConfirm = () => {
    setRestrictModalOpen(false);
    navigation.navigate(CHANGE_PASSWORD_SCREEN, { type: pendingChangeType });
  };

  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background }}>
      <View style={[styles.securityHeader, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.headerIconBtn,]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <FastImage source={back_ic} style={styles.headerIconImg} tintColor={themeColors.text} resizeMode="contain" />
        </TouchableOpacity>
        <View style={styles.securityHeaderTitleWrap}>
          <AppText type={SIXTEEN} weight={BOLD} style={{ color: themeColors.text }}>
            Security
          </AppText>
        </View>
        <View>
        </View>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroRow}>
          <View style={styles.heroTextBlock}>
            <AppText type={SIXTEEN} weight={BOLD} style={[styles.heroTitle, { color: themeColors.text }]}>
              Security Settings
            </AppText>
            <AppText type={FOURTEEN} style={[styles.heroSubtitle, { color: themeColors.secondaryText }]}>
              Take full control of your account security with advanced verification options like passkeys, email OTP, and mobile authentication for a safer experience.
            </AppText>
          </View>
          <View style={styles.heroImgWrap}>
            <FastImage source={SECURITY_SHEIELD} style={styles.heroImg} resizeMode="contain" />
          </View>
        </View>

        {contentLoading ? (
          <TwoFaCardsSkeleton />
        ) : (
          <View style={styles.cardsStack}>
            <SecurityCard
              title="Two-Factor Authentication (2FA)"
              subtitle={TWO_FA_COPY.subtitle}
              themeColors={themeColors}
              isDark={isDark}
            >
              <TwoFaSimpleRow
                themeColors={themeColors}
                isDark={isDark}
                iconSource={FINGERPRINT}
                title={TWO_FA_COPY.passkeys.title}
                badge={
                  <View style={[styles.recommendedBadge, { backgroundColor: '#FEF6E5' }]}>
                    <AppText type={TEN} weight={SEMI_BOLD} style={{ color: '#E09B36' }}>
                      {TWO_FA_COPY.passkeys.recommended}
                    </AppText>
                  </View>
                }
                description={TWO_FA_COPY.passkeys.desc}
                hasValue={hasPasskey}
                isBooleanStatus={true}
                statusText="on"
                actionLabel={hasPasskey ? "Manage" : "Turn on"}
                onAction={() => onPasskeySwitch(!hasPasskey)}
                disabled={!passkeySupported && !hasPasskey}
              />
              <TwoFaSimpleRow
                themeColors={themeColors}
                isDark={isDark}
                iconSource={googleAuthenticator}
                title={TWO_FA_COPY.google.title}
                description={TWO_FA_COPY.google.desc}
                hasValue={hasGoogleAuth}
                isBooleanStatus={true}
                statusText="on"
                actionLabel={hasGoogleAuth ? "Disable" : "Turn on"}
                onAction={() => onGoogleSwitch(!hasGoogleAuth)}
              />
              <TwoFaSimpleRow
                themeColors={themeColors}
                isDark={isDark}
                iconSource={EMAIL}
                title={TWO_FA_COPY.email.title}
                description={TWO_FA_COPY.email.desc}
                hasValue={hasEmail}
                isBooleanStatus={false}
                statusText={maskTwoFaEmail(emailId)}
                actionLabel={hasEmail ? 'Change' : 'Turn on'}
                onAction={
                  !hasEmail
                    ? () => {
                      if (!hasMobile && !hasGoogleAuth && !hasPasskey) {
                        showError('No verification method available to add email');
                        return;
                      }
                      navigation.navigate(ADD_EMAIL_SCREEN);
                    }
                    : handleChangeEmailStart
                }
              />
              <TwoFaSimpleRow
                themeColors={themeColors}
                isDark={isDark}
                iconSource={PHONE}
                title={TWO_FA_COPY.phone.title}
                description={TWO_FA_COPY.phone.desc}
                hasValue={hasMobile}
                isBooleanStatus={false}
                statusText={maskTwoFaPhone(mobileNumber)}
                actionLabel={hasMobile ? 'Change' : 'Turn on'}
                onAction={!hasMobile ? handleAddMobileStart : handleChangeMobileStart}
                isLast
              />
            </SecurityCard>
          </View>
        )}

        <View style={styles.cardsStack}>
          <SecurityCard
            title="Password Management"
            themeColors={themeColors}
            isDark={isDark}
            style={{ marginTop: 24 }}
          >
            <TwoFaSimpleRow
              themeColors={themeColors}
              isDark={isDark}
              iconSource={lock_ic}
              title="Password"
              description="Protects account access with secure authentication. Helps prevent unauthorized logins."
              hasValue={true}
              isBooleanStatus={true}
              statusText="on"
              actionLabel="Change"
              onAction={handlePasswordChangePress}
            />
            <TwoFaSimpleRow
              themeColors={themeColors}
              isDark={isDark}
              iconSource={fundpass}
              title={ADVANCED_SEC_COPY.fundPassword.title}
              description={ADVANCED_SEC_COPY.fundPassword.desc}
              hasValue={effectiveHasFundPassword}
              isBooleanStatus={true}
              statusText="on"
              actionLabel={effectiveHasFundPassword ? "Change" : "Setup"}
              onAction={handleFundPasswordPress}
              isLast
            />
          </SecurityCard>
        </View>

        <View style={styles.cardsStack}>
          <SecurityCard
            title={ADVANCED_SEC_COPY.title}
            themeColors={themeColors}
            isDark={isDark}
            style={{ marginTop: 24 }}
          >
            <TwoFaSimpleRow
              themeColors={themeColors}
              isDark={isDark}
              iconSource={LOCK_ICON}
              title={ADVANCED_SEC_COPY.login2step.title}
              description={ADVANCED_SEC_COPY.login2step.desc}
              hasValue={false}
              isBooleanStatus={true}
              statusText="on"
              actionLabel="Change"
              onAction={() => { showError("Login 2-Step Verification pending"); }}
            />
            <TwoFaSimpleRow
              themeColors={themeColors}
              isDark={isDark}
              iconSource={SECURITY_SHEIELD}
              title={ADVANCED_SEC_COPY.antiPhishing.title}
              description={ADVANCED_SEC_COPY.antiPhishing.desc}
              hasValue={false}
              isBooleanStatus={true}
              statusText="off"
              actionLabel="Turn on"
              onAction={handleAntiPhishingStart}
            />
            <TwoFaSimpleRow
              themeColors={themeColors}
              isDark={isDark}
              iconSource={LOCK_ICON}
              title={ADVANCED_SEC_COPY.withdrawalSettings.title}
              description={ADVANCED_SEC_COPY.withdrawalSettings.desc}
              hasValue={false}
              isBooleanStatus={true}
              statusText="off"
              actionLabel="Change"
              onAction={() => { navigation.navigate(WITHDRAWAL_SETTINGS_SCREEN); }}
            />
            <TwoFaSimpleRow
              themeColors={themeColors}
              isDark={isDark}
              iconSource={LOCK_ICON}
              title="Emergency Contact"
              description="Adds a trusted contact for account recovery. Helps in case of emergencies."
              hasValue={false}
              isBooleanStatus={true}
              statusText="off"
              actionLabel="Turn on"
              onAction={() => { showError("Emergency contact pending"); }}
            />
            <TwoFaSimpleRow
              themeColors={themeColors}
              isDark={isDark}
              iconSource={LOCK_ICON}
              title="Account Connections"
              description="Manages linked accounts and services. Helps control access and maintain security."
              hasValue={false}
              isBooleanStatus={true}
              statusText="off"
              actionLabel="Turn on"
              onAction={() => { showError("Account connections pending"); }}
              isLast
            />
          </SecurityCard>
        </View>

        <View style={styles.cardsStack}>
          <SecurityCard
            title="Devices & activity"
            themeColors={themeColors}
            isDark={isDark}
            style={{ marginTop: 24 }}
          >
            <TwoFaSimpleRow
              themeColors={themeColors}
              isDark={isDark}
              iconSource={LOCK_ICON}
              title="Authorized Devices"
              description="Manages and recognizes trusted devices for secure account access. Helps prevent unauthorized logins by allowing access only from approved devices."
              hasValue={false}
              isBooleanStatus={true}
              statusText="off"
              actionLabel="Change"
              onAction={() => { showError("Authorized devices pending"); }}
            />
            <TwoFaSimpleRow
              themeColors={themeColors}
              isDark={isDark}
              iconSource={LOCK_ICON}
              title="Security Logs"
              description="Tracks and records account activity, including logins and security actions. Helps monitor suspicious behavior and maintain account safety."
              hasValue={false}
              isBooleanStatus={true}
              statusText="off"
              actionLabel="View"
              onAction={() => { showError("Security logs pending"); }}
              isLast
            />
          </SecurityCard>
        </View>

        <View style={styles.cardsStack}>
          <SecurityCard
            title="Account Management"
            themeColors={themeColors}
            isDark={isDark}
            style={{ marginTop: 24 }}
          >
            <TwoFaSimpleRow
              themeColors={themeColors}
              isDark={isDark}
              iconSource={LOCK_ICON}
              title={ACCOUNT_MGMT_COPY.disableAccount.title}
              description={ACCOUNT_MGMT_COPY.disableAccount.desc}
              hasValue={false}
              isBooleanStatus={true}
              statusText="off"
              actionLabel="Disable"
              onAction={() => { showError("Disable account implementation pending"); }}
            />
            <TwoFaSimpleRow
              themeColors={themeColors}
              isDark={isDark}
              iconSource={LOCK_ICON}
              title={ACCOUNT_MGMT_COPY.closeAccount.title}
              description={ACCOUNT_MGMT_COPY.closeAccount.desc}
              hasValue={false}
              isBooleanStatus={true}
              statusText="off"
              actionLabel="Close"
              onAction={() => { showError("Close account implementation pending"); }}
              isLast
            />
          </SecurityCard>
        </View>

        <View style={styles.cardsStack}>
          <SecurityCard
            title="Other Settings"
            themeColors={themeColors}
            isDark={isDark}
            style={{ marginTop: 24 }}
          >
            <TwoFaSimpleRow
              themeColors={themeColors}
              isDark={isDark}
              iconSource={LOCK_ICON}
              title="Third Party Account Access Management"
              description="Controls and manages access granted to external apps and services. Helps protect account data by allowing users to review and revoke permissions anytime."
              hasValue={false}
              isBooleanStatus={true}
              statusText="G"
              actionLabel="Change"
              onAction={() => { showError("Third party settings pending"); }}
              isLast
            />
          </SecurityCard>
        </View>

      </ScrollView>

      <Modal
        visible={isRestrictModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRestrictModalOpen(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.confirmModal, { backgroundColor: themeColors.card }]}>
            <View style={styles.restrictContent}>
              <FastImage source={account_restrictions} style={styles.restrictImg} resizeMode="contain" />
              <AppText weight={BOLD} type={EIGHTEEN} style={[styles.restrictTitle, { color: themeColors.text }]}>
                {isFund
                  ? (effectiveHasFundPassword ? "Are you sure you want to change the fund password?" : "Are you sure you want to set your fund password?")
                  : "Account Restrictions"
                }
              </AppText>
              <AppText type={FOURTEEN} style={[styles.restrictText, { color: themeColors.secondaryText }]}>
                {isFund ? (
                  <>
                    For the security of your assets, withdrawals will be temporarily locked for <AppText weight={BOLD} style={{ color: themeColors.text }}>24 hours</AppText> after you {effectiveHasFundPassword ? 'change' : 'set'} your fund password.
                  </>
                ) : (
                  <>
                    For the security of your account, withdrawals will be temporarily locked for <AppText weight={BOLD} style={{ color: themeColors.text }}>24 hours</AppText> after a password change.
                  </>
                )}
              </AppText>
            </View>
            <View style={styles.restrictActions}>
              <Button
                children="Cancel"
                onPress={() => setRestrictModalOpen(false)}
                containerStyle={[styles.cancelBtn, { borderColor: themeColors.border }]}
                titleStyle={{ color: themeColors.text }}
              />
              <Button
                children="Confirm"
                onPress={handleRestrictConfirm}
                containerStyle={styles.confirmBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </AppSafeAreaView>
  );
};

export default TwoFactor;

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 48,
    paddingHorizontal: 16,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconImg: { width: 20, height: 20 },
  headerShieldImg: { width: 24, height: 24 },
  securityHeaderTitleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    right: 20
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  heroTextBlock: {
    flex: 1,
    paddingRight: 8,
    minWidth: 0,
  },
  heroTitle: {
    lineHeight: 24,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  heroSubtitle: {
    lineHeight: 22,
  },
  heroImgWrap: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImg: {
    width: 112,
    height: 112,
  },
  cardsStack: {
    marginBottom: 8,
  },
  simpleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  simpleRowLeftWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    paddingRight: 16,
  },
  methodIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  methodIconImg: { width: 22, height: 22 },
  simpleRowLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  simpleRowTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  simpleRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  simpleRowStatusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  simpleActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    justifyContent: 'center',
    marginLeft: 8,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  sectionSubtitle: {
    lineHeight: 20,
  },
  cardContainer: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
  },
  cardBody: {
    paddingHorizontal: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmModal: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  confirmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalCloseBtn: {
    padding: 4,
  },
  confirmBody: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  confirmIcon: {
    width: 64,
    height: 64,
    alignSelf: 'center',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmOkBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Restrict Styles
  restrictContent: { alignItems: 'center', marginBottom: 32 },
  restrictImg: { width: 100, height: 100, marginBottom: 20 },
  restrictTitle: { marginBottom: 12, textAlign: 'center' },
  restrictText: { textAlign: 'center', paddingHorizontal: 10, lineHeight: 22 },
  restrictActions: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, backgroundColor: 'transparent' },
  confirmBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: colors.buttonBg },
});
