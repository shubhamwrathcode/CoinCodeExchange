import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  Modal,
  RefreshControl,
} from "react-native";
import FastImage from "react-native-fast-image";
import LinearGradient from "react-native-linear-gradient";
import Toast from "react-native-simple-toast";
import { useDispatch } from "react-redux";
import {
  AppSafeAreaView,
  AppText,
  BOLD,
  FOURTEEN,
  SEMI_BOLD,
  SIXTEEN,
  TWELVE,
  TWENTY,
  FIFTEEN,
  EIGHTEEN,
} from "../../shared";
import { colors } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";
import { useAppSelector } from "../../store/hooks";
import NavigationService from "../../navigation/NavigationService";
import * as routes from "../../navigation/routes";
import { back_ic, copyIcon, editIcon, right_arrow, right_ic } from "../../helper/ImageAssets";
import { logoutAction } from "../../actions/authActions";
import { getFundPasswordStatusAction, disable2fa, getAntiPhishingStatus, getUserProfile } from "../../actions/accountActions";
import KycStepHeader from "./KycStepHeader";
import { copyText } from "../../helper/utility";
import { useFocusEffect, useRoute, useNavigation } from "@react-navigation/native";
import { appOperation } from "../../appOperation";
import EditAvatarModal from "../account/EditAvatarModal";
import { BASE_URL } from "../../helper/Constants";

const KYC_AVATAR_GRADIENT = ["#a684ff", "#ad46ff", "#4f39f6"];
const KYC_AVATAR_GRADIENT_LOCATIONS = [0, 0.5, 1];

const showComingSoonToast = () =>
  Toast.showWithGravity("Coming soon", Toast.LONG, Toast.BOTTOM);

const AccountDetails = () => {
  const dispatch = useDispatch();
  const route = useRoute();
  const navigation = useNavigation();
  const { colors: themeColors, isDark } = useTheme();
  const userData = useAppSelector((state) => state.auth.userData);
  const [fundPasswordStatus, setFundPasswordStatus] = useState(null);
  const [hasEmergencyContact, setHasEmergencyContact] = useState(false);
  const [hasAntiPhishingCode, setHasAntiPhishingCode] = useState(false);
  const hasFundPassword = fundPasswordStatus ?? !!(userData?.fundPassword || userData?.payPin || userData?.isFundPasswordSet);
  const userHasPhone = !!(userData?.mobileNumber || userData?.mobile_number) &&
    (userData?.mobileNumber || userData?.mobile_number) !== "null" &&
    (userData?.mobileNumber || userData?.mobile_number) !== "undefined";

  const hasGA = Number(userData?.['2fa'] || 0) === 2 || userData?.twoFaEnabled === true;
  const hasPasskey = !!userData?.passkey_enabled; // Adjust based on actual field if needed

  const getActiveMethodsCount = () => {
    let count = 0;
    if (userData?.emailId || userData?.email) count += 1;
    if (userHasPhone) count += 1;
    if (hasGA) count += 1;
    if (hasPasskey) count += 1;
    return count;
  };

  const canMakeSensitiveChanges = () => getActiveMethodsCount() >= 2;
  const [activeTab, setActiveTab] = useState("Profile");
  const [securityMethods, setSecurityMethods] = useState({
    passkey: false,
    totp: false,
    email: false,
    mobile: false,
  });

  const fetchMethods = React.useCallback(async () => {
    try {
      const res = await appOperation.customer.get_security_methods_list();
      if (res?.success) {
        const raw =
          res?.data?.security_methods ||
          res?.data?.data?.security_methods ||
          res?.security_methods ||
          res?.data?.securityMethods ||
          {};
        setSecurityMethods({
          passkey: !!raw.passkey,
          totp: !!raw.totp,
          email: !!raw.email,
          mobile: !!(raw.mobile ?? raw.phone ?? raw.sms),
        });
      }
      const fundRes = await dispatch(getFundPasswordStatusAction());
      setFundPasswordStatus(!!fundRes);

      try {
        const countRes = await appOperation.customer.getEmergencyContactCount();
        const count = countRes?.data?.count || countRes?.count || countRes?.data || 0;
        if (typeof count === 'number' && count > 0) {
          setHasEmergencyContact(true);
        } else {
          const listRes = await appOperation.customer.getEmergencyContactList();
          const list = listRes?.data?.contacts || listRes?.contacts || listRes?.data || [];
          setHasEmergencyContact(list.length > 0);
        }
      } catch (e) {
        // silent fallback
      }
      try {
        const antiPhishingData = await dispatch(getAntiPhishingStatus());
        setHasAntiPhishingCode(!!antiPhishingData?.hasAntiPhishingCode);
      } catch (e) {
        // silent fallback
      }
    } catch (err) {
      console.log("Error fetching security methods:", err);
    }
  }, [dispatch]);

  useFocusEffect(
    React.useCallback(() => {
      fetchMethods();
    }, [fetchMethods])
  );

  React.useEffect(() => {
    if (route.params?.pendingDisable) {
      const { pendingDisable, emailOtp, smsOtp, tofaCode } = route.params;

      // Clear the params so they don't run again
      navigation.setParams({
        pendingDisable: null,
        emailOtp: null,
        smsOtp: null,
        tofaCode: null,
      });

      const handleDisableAction = async () => {
        try {
          let success = false;
          if (tofaCode) {
            success = await dispatch(disable2fa(tofaCode));
          } else if (emailOtp) {
            success = await dispatch(disable2fa(null, emailOtp, 'email'));
          } else if (smsOtp) {
            success = await dispatch(disable2fa(null, smsOtp, 'mobile'));
          }

          if (success) {
            Toast.showWithGravity("Authenticator App disabled successfully.", Toast.SHORT, Toast.BOTTOM);
            fetchMethods();
          }
        } catch (e) {
          Toast.showWithGravity("Disable failed. Please try again.", Toast.SHORT, Toast.BOTTOM);
        }
      };

      handleDisableAction();
    }
  }, [route.params, fetchMethods, dispatch]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const logoutAnim = React.useRef(new Animated.Value(0)).current;

  const openLogoutModal = () => {
    setShowLogoutModal(true);
    Animated.timing(logoutAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.back(1)),
      useNativeDriver: true,
    }).start();
  };

  const closeLogoutModal = () => {
    Animated.timing(logoutAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowLogoutModal(false));
  };

  const confirmLogout = () => {
    closeLogoutModal();
    dispatch(logoutAction());
  };


  const [serverNickname, setServerNickname] = useState(null);
  const [serverAvatar, setServerAvatar] = useState(null);
  const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchMethods(),
        dispatch(getUserProfile()),
        (async () => {
          try {
            const res = await appOperation.customer.get_nickname_setting();
            if (res?.success) {
              const fetched = res.data?.nickname || res.data?.data?.nickname;
              if (fetched) setServerNickname(fetched);
            }
          } catch { }
        })(),
        (async () => {
          try {
            const resAvatar = await appOperation.customer.get_avatar_setting();
            if (resAvatar?.success) {
              const fetchedAvatar = resAvatar.data?.avatar || resAvatar.data?.data?.avatar;
              if (fetchedAvatar) setServerAvatar(fetchedAvatar);
            }
          } catch { }
        })()
      ]);
    } catch (e) {
      console.warn("Refresh failed:", e);
    } finally {
      setRefreshing(false);
    }
  }, [fetchMethods, dispatch]);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      const fetchNickAndAvatar = async () => {
        try {
          const res = await appOperation.customer.get_nickname_setting();
          if (active && res?.success) {
            const fetched = res.data?.nickname || res.data?.data?.nickname;
            if (fetched) setServerNickname(fetched);
          }
          const resAvatar = await appOperation.customer.get_avatar_setting();
          if (active && resAvatar?.success) {
            const fetchedAvatar = resAvatar.data?.avatar || resAvatar.data?.data?.avatar;
            if (fetchedAvatar) setServerAvatar(fetchedAvatar);
          }
        } catch (err) {
          // ignore
        }
      };
      fetchNickAndAvatar();
      return () => { active = false; };
    }, [])
  );

  const getResolvedName = () => {
    if (serverNickname) return serverNickname;
    if (userData?.firstName && userData?.lastName) return `${userData.firstName} ${userData.lastName}`;
    if (userData?.first_name && userData?.last_name) return `${userData.first_name} ${userData.last_name}`;
    return userData?.firstName || userData?.first_name || userData?.display_name || userData?.userName || userData?.user_login || userData?.user_nicename || "User";
  };

  const displayName = getResolvedName();

  function getInitials(userData, serverNick) {
    const name = serverNick || userData?.display_name || userData?.user_login || userData?.user_nicename || userData?.first_name || userData?.firstName || "User";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  const initials = getInitials(userData, serverNickname);

  const maskProfileEmail = (email) => {
    if (!email || typeof email !== "string") return "";
    const at = email.indexOf("@");
    if (at < 1) return email;
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);
    const head = local.slice(0, Math.min(3, local.length));
    const dom = domain.slice(0, Math.min(5, domain.length));
    return `${head}*@${dom}**`;
  };

  const maskProfilePhone = (phone) => {
    if (!phone || phone === "null" || phone === "undefined") return "";
    const cleaned = String(phone).replace(/\s+/g, '');
    const isIndia = cleaned.startsWith("+91") || cleaned.startsWith("91");
    const prefix = isIndia ? "+91" : "";
    const digitsOnly = cleaned.replace(/^\+91|^91/, '');
    if (digitsOnly.length < 2) return "";
    return `${prefix}*****${digitsOnly.slice(-1)}`;
  };

  const maskedEmail = maskProfileEmail(userData?.emailId || userData?.email);
  const maskedPhone = maskProfilePhone(userData?.phoneNo || userData?.mobile);


  const MenuItem = ({ label, value, badge, badgeBgColor, badgeTextColor, showArrow = true, onPress, isLogout }) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress || showComingSoonToast}
      activeOpacity={0.7}
    >
      <View style={{ flex: 1 }}>
        <AppText
          type={FIFTEEN}
          style={{ color: isLogout ? colors.red : themeColors.text }}
        >
          {label}
        </AppText>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {badge && (
          <View style={[styles.badge, { backgroundColor: badgeBgColor ? badgeBgColor : (isDark ? "#2A2A2E" : "#F3F4F6") }]}>
            <AppText type={TWELVE} style={{ color: badgeTextColor ? badgeTextColor : themeColors.secondaryText }}>{badge}</AppText>
          </View>
        )}
        {value && (
          <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText, marginRight: 8 }}>
            {value}
          </AppText>
        )}
        {showArrow && (
          <FastImage
            source={right_ic}
            style={{ width: 13, height: 13 }}
            tintColor={"#C1C1C1"}
            resizeMode="contain"
          />
        )}
      </View>
    </TouchableOpacity>
  );

  const getFullAvatarUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('uploads/')) {
      const baseUrl = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;
      return `${baseUrl}${url}`;
    }
    return url;
  };

  const finalAvatarUri = getFullAvatarUrl(serverAvatar || userData?.profilepicture);

  const kycBadge = React.useMemo(() => {
    const raw = userData?.kycVerified ?? userData?.kyc_verified;
    let tier = 0;
    if (raw === true) tier = 1;
    else if (typeof raw === "number" || typeof raw === "string") {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0 && n <= 4) tier = Math.trunc(n);
    }
    const hint = String(userData?.kyc_status ?? userData?.kycStatus ?? "").toLowerCase();
    if (tier === 3 && hint && /pending|review|process|submit|progress|under/.test(hint) && !/reject|fail|declin|denied/.test(hint)) {
      tier = 1;
    }
    if (tier === 2) {
      return { label: "Verified", bg: isDark ? "rgba(34, 197, 94, 0.15)" : "#DCFCE7", fg: isDark ? "#4ADE80" : "#16A34A" };
    }
    if (tier === 3) {
      return { label: "Failed", bg: isDark ? "rgba(239, 68, 68, 0.15)" : "#FEE2E2", fg: isDark ? "#F87171" : "#DC2626" };
    }
    if (tier === 1) {
      return { label: "In Review", bg: isDark ? "rgba(249, 115, 22, 0.15)" : "#FFEDD5", fg: isDark ? "#FB923C" : "#EA580C" };
    }
    return { label: "Unverified", bg: isDark ? "rgba(249, 115, 22, 0.15)" : "#FFEDD5", fg: isDark ? "#FB923C" : "#EA580C" };
  }, [userData?.kycVerified, userData?.kyc_verified, userData?.kyc_status, userData?.kycStatus, isDark]);
  // console.log(kycBadge, '===kycbadge')
  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background, flex: 1 }}>
      <KycStepHeader title="" onBackPress={() => NavigationService.goBack()} onSwitchProfilePress={() => {
        NavigationService.navigate(routes.SWITCH_ACCOUNT_SCREEN, {
          userData,
          serverAvatar,
          serverNickname,
          maskedEmail,
          maskedPhone,
          displayName,
          initials
        })
      }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <LinearGradient
          colors={isDark ? ["#23242a", "#1a1b21"] : ["#FFFFFF", "#FFFFFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.userSection, {
            marginHorizontal: 16,
            borderRadius: 16,
            marginTop: 10,
            borderWidth: 1,
            borderColor: isDark ? "#2A2A2E" : "#E8E8E8",
          }]}
        >
          <View style={styles.userSectionInner}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarClip}>
                {finalAvatarUri ? (
                  <FastImage
                    source={{ uri: finalAvatarUri }}
                    style={styles.avatar}
                    resizeMode={FastImage.resizeMode.cover}
                  />
                ) : (
                  <LinearGradient
                    colors={KYC_AVATAR_GRADIENT}
                    locations={KYC_AVATAR_GRADIENT_LOCATIONS}
                    style={styles.avatar}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <AppText weight={BOLD} style={{ color: "#FFFFFF", fontSize: 20 }}>
                      {initials}
                    </AppText>
                  </LinearGradient>
                )}
              </View>
              <TouchableOpacity style={[styles.editBadge, { backgroundColor: isDark ? "#2A2A2E" : "#FFFFFF", borderColor: isDark ? themeColors.border : "#E5E7EB" }]} onPress={() => setIsAvatarModalVisible(true)}>
                <FastImage source={editIcon} style={{ width: 12, height: 12 }} tintColor={themeColors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.userMeta}>
              <AppText type={TWENTY} weight={SEMI_BOLD} numberOfLines={1} style={{ color: themeColors.text }}>
                {userData?.emailId ? maskProfileEmail(userData.emailId) : displayName}
              </AppText>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 6, flexShrink: 1 }}>
                <AppText type={TWELVE} numberOfLines={1} style={{ color: themeColors.secondaryText, flexShrink: 1 }}>
                  UID: {userData?.uuid || "—"}
                </AppText>
                {userData?.uuid ? (
                  <TouchableOpacity onPress={() => copyText(userData.uuid)} hitSlop={8}>
                    <FastImage source={copyIcon} style={{ width: 12, height: 12 }} tintColor={themeColors.secondaryText} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Tabs */}
        <View style={[styles.tabBar, { borderBottomColor: isDark ? themeColors.border : "#F3F4F6" }]}>
          {["Profile", "Security"].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                activeTab === tab && { borderBottomWidth: 2, borderBottomColor: themeColors.button }
              ]}
            >
              <AppText
                weight={SEMI_BOLD}
                type={SIXTEEN}
                style={{ color: activeTab === tab ? themeColors.text : themeColors.secondaryText }}
              >
                {tab}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Menu Items */}
        <View style={{ marginTop: 20 }}>
          {activeTab === "Profile" ? (
            <>
              <MenuItem
                label="Identity Verification"
                badge={kycBadge.label}
                badgeBgColor={kycBadge.bg}
                badgeTextColor={kycBadge.fg}
                onPress={() => NavigationService.navigate(routes.KYC_STATUS_SCREEN)}
              />

              <MenuItem label="Kyb"
                onPress={() => NavigationService.navigate(routes.KYC_STATUS_SCREEN, { from: 'kyb' })}
              />

              <MenuItem
                label="VIP Privilege"
                badge={`VIP ${userData?.vipLevel || 0}`}
                onPress={() => NavigationService.navigate(routes.VIP_SERVICES_SCREEN)}
              />
              {/* <MenuItem
                label="Personal Page"
                onPress={() => NavigationService.navigate(routes.PERSONAL_PAGE_SCREEN, {
                  userData,
                  serverAvatar,
                  serverNickname,
                  maskedEmail,
                  maskedPhone,
                  displayName
                })}
              /> */}
              <MenuItem
                label="Nickname"
                value={displayName}
                onPress={() => NavigationService.navigate(routes.NICKNAME_SETTINGS_SCREEN, { currentNickname: displayName })}
              />
              <MenuItem label="Referral"
                onPress={() => NavigationService.navigate(routes.REFER_AND_EARN_SCREEN)}
              />
              {/* <MenuItem label="Affiliate" badge="Exclusive Commissions" badgeBgColor="rgba(209, 170, 103, 0.15)" badgeTextColor="#D1AA67" /> */}
              <MenuItem
                label="Notification Setting"
                onPress={() => NavigationService.navigate(routes.NOTIFICATION_SETTINGS_SCREEN)}
              />
              <MenuItem
                label="Direct Message Management"
                onPress={() => NavigationService.navigate(routes.DIRECT_MESSAGE_MANAGEMENT_SCREEN)}
              />
              {/* <MenuItem
                label="Switch Account"
                onPress={() => NavigationService.navigate(routes.SWITCH_ACCOUNT_SCREEN, {
                  userData,
                  serverAvatar,
                  serverNickname,
                  maskedEmail,
                  maskedPhone,
                  displayName,
                  initials
                })}
              /> */}
              <MenuItem
                label="Log Out"
                isLogout
                onPress={openLogoutModal}
              />
            </>
          ) : (
            <>
              {/* Two-Factor Authentication (2FA) */}
              <View style={styles.sectionHeader}>
                <AppText weight={SEMI_BOLD} type={EIGHTEEN} style={{ color: themeColors.text }}>
                  Two-Factor Authentication (2FA)
                </AppText>
              </View>
              <MenuItem label="Passkey" value={securityMethods.passkey ? "Manage" : "Not enabled"} onPress={() => NavigationService.navigate(routes.PASSKEY_SCREEN)} />
              <MenuItem
                label="Authenticator App"
                value={securityMethods.totp ? "Disable" : "Not enabled"}
                onPress={() => {
                  if (securityMethods.totp && !canMakeSensitiveChanges()) {
                    Toast.showWithGravity("To enhance your account security, please activate at least one additional verification method.", Toast.LONG, Toast.BOTTOM);
                    return;
                  }
                  if (securityMethods.totp) {
                    const hasGA = Number(userData?.['2fa'] || 0) === 2 || userData?.twoFaEnabled === true || securityMethods.totp;
                    const hasEmail = !!(userData?.emailId || userData?.email);
                    const hasMobile = !!(userData?.mobileNumber || userData?.mobile_number);
                    const methods = [];
                    if (securityMethods.passkey) methods.push('passkey');
                    if (hasEmail) methods.push('email');
                    if (hasMobile) methods.push('mobile');
                    if (hasGA) methods.push('totp');
                    if (methods.length === 0) methods.push('email');

                    NavigationService.navigate(routes.PASSKEY_SECURITY_VERIFICATION_SCREEN, {
                      targetScreen: routes.ACCOUNT_SCREEN,
                      purpose: '2fa_disable',
                      verifyMethods: methods,
                      skipDirectVerification: true,
                      targetParams: {
                        pendingDisable: true
                      }
                    });
                  } else {
                    const hasGA = Number(userData?.['2fa'] || 0) === 2 || userData?.twoFaEnabled === true;
                    const hasEmail = !!(userData?.emailId || userData?.email);
                    const hasMobile = !!(userData?.mobileNumber || userData?.mobile_number);
                    const methods = [];
                    if (securityMethods.passkey) methods.push('passkey');
                    if (hasEmail) methods.push('email');
                    if (hasMobile) methods.push('mobile');
                    if (hasGA) methods.push('totp');
                    if (methods.length === 0) methods.push('email');

                    NavigationService.navigate(routes.PASSKEY_SECURITY_VERIFICATION_SCREEN, {
                      targetScreen: routes.PASSKEY_SETUP_AUTHENTICATOR_SCREEN,
                      purpose: '2fa_setup',
                      verifyMethods: methods,
                      skipDirectVerification: false,
                    });
                  }
                }}
              />
              <MenuItem
                label="Email Verification"
                value={userData?.emailId ? maskProfileEmail(userData.emailId) : "Not enabled"}
                onPress={() => {
                  if (userData?.emailId && !canMakeSensitiveChanges()) {
                    Toast.showWithGravity("To enhance your account security, please activate at least one additional verification method.", Toast.LONG, Toast.BOTTOM);
                    return;
                  }
                  NavigationService.navigate(routes.ADD_EMAIL_SCREEN);
                }}
              />
              <MenuItem
                label="Phone Number"
                value={userHasPhone ? maskProfilePhone(userData.mobileNumber || userData.mobile_number) : "Not enabled"}
                onPress={() => {
                  if (userHasPhone && !canMakeSensitiveChanges()) {
                    Toast.showWithGravity("To enhance your account security, please activate at least one additional verification method.", Toast.LONG, Toast.BOTTOM);
                    return;
                  }
                  if (userHasPhone) {
                    NavigationService.navigate(routes.PHONE_SETTINGS_SCREEN);
                  } else {
                    const methods = ['email'];
                    // We only ask for email upfront. If GA is enabled, it will be asked at the end of the form.
                    NavigationService.navigate(routes.PASSKEY_SECURITY_VERIFICATION_SCREEN, {
                      targetScreen: routes.ADD_PHONE_NUMBER_SCREEN,
                      purpose: 'add_mobile',
                      verifyMethods: methods,
                      skipDirectVerification: true,
                    });
                  }
                }}
              />

              {/* Advanced Security Section */}
              <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                <AppText weight={SEMI_BOLD} type={EIGHTEEN} style={{ color: themeColors.text }}>
                  Advanced Security
                </AppText>
              </View>
              <MenuItem
                label="Login 2-Step Verification"
                value="Configured"
                onPress={() => NavigationService.navigate(routes.LOGIN_TWO_STEP_VERIFICATION_SCREEN)}
              />
              <MenuItem
                label="Anti-Phishing Code"
                value={hasAntiPhishingCode ? "Change" : "Not enabled"}
                onPress={() => NavigationService.navigate(routes.ANTI_PHISHING_CODE_SCREEN)}
              />
              <MenuItem
                label="Withdrawal Settings"
                value="Configured"
                onPress={() => NavigationService.navigate(routes.WITHDRAWAL_SETTINGS_SCREEN)}
              />
              <MenuItem
                label="Emergency Contact"
                value={hasEmergencyContact ? "Manage" : "Not enabled"}
                onPress={() => NavigationService.navigate(routes.EMERGENCY_CONTACT_SCREEN)}
              />
              {/* <MenuItem
                label="Account Connections"
                value="Manage"
                onPress={() => NavigationService.navigate(routes.ACCOUNT_CONNECTIONS_SCREEN)}
              /> */}

              {/* Password Management */}
              <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                <AppText weight={SEMI_BOLD} type={EIGHTEEN} style={{ color: themeColors.text }}>
                  Password Management
                </AppText>
              </View>
              <MenuItem
                label="Password"
                value="Change"
                onPress={() => NavigationService.navigate(routes.CHANGE_LOGIN_PASSWORD_SCREEN)}
              />
              <MenuItem
                label="Fund Password"
                value={hasFundPassword ? "Change" : "Not enabled"}
                onPress={() => NavigationService.navigate(routes.FUND_PASSWORD_MAIN_SCREEN)}
              />

              {/* Security Logs */}
              <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                <AppText weight={SEMI_BOLD} type={EIGHTEEN} style={{ color: themeColors.text }}>
                  Devices & activity
                </AppText>
              </View>
              <MenuItem
                label="Authorized Devices"
                value="Configured"
                onPress={() => NavigationService.navigate(routes.AUTHORIZED_DEVICES_SCREEN)}
              />
              <MenuItem
                label="Security Logs"
                onPress={() => NavigationService.navigate(routes.SECURITY_LOGS_SCREEN)}
              />

              {/* Security Logs (Account Management) */}
              {/* <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                <AppText weight={SEMI_BOLD} type={EIGHTEEN} style={{ color: themeColors.text }}>
                  Account Management
                </AppText>
              </View>
              <MenuItem
                label="Disable Account"
                value="Not configured"
                onPress={() => NavigationService.navigate(routes.DISABLE_ACCOUNT_SCREEN)}
              />
              <MenuItem
                label="Close Account"
                onPress={() => NavigationService.navigate(routes.CLOSE_ACCOUNT_REASON_SCREEN)}
              /> */}

              {/* Other Settings */}
              <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                <AppText weight={SEMI_BOLD} type={EIGHTEEN} style={{ color: themeColors.text }}>
                  Other Settings
                </AppText>
              </View>
              <MenuItem
                label="Third Party Account Access Management"
                onPress={() => NavigationService.navigate(routes.THIRD_PARTY_ACCOUNT_ACCESS_SCREEN)}
              />
            </>
          )}
        </View>
      </ScrollView>


      <Modal
        visible={showLogoutModal}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={() => closeLogoutModal()}
      >
        <Animated.View
          style={[
            styles.logoutModalBackdrop,
            {
              opacity: logoutAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={StyleSheet.absoluteFill}
            onPress={() => closeLogoutModal()}
          />

          <Animated.View
            style={[
              styles.logoutModalCard,
              {
                backgroundColor: isDark ? "#1E1E22" : "#FFFFFF",
                borderColor: themeColors.border,
                transform: [
                  {
                    translateY: logoutAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                  {
                    scale: logoutAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.95, 1],
                    }),
                  },
                ],
              },
            ]}
          >


            <AppText style={[styles.logoutTitle, { color: themeColors.text }]}>Logout</AppText>
            <AppText style={[styles.logoutDesc, { color: themeColors.secondaryText }]}>
              Are you sure you want to log out of your account?
            </AppText>

            <View style={styles.logoutActionsRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.logoutBtn,
                  styles.logoutBtnSecondary,
                  {
                    borderColor: 'transparent',
                    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : colors.inputBackground,
                  },
                ]}
                onPress={() => closeLogoutModal()}
              >
                <AppText style={[styles.logoutBtnSecondaryText, { color: themeColors.text }]}>Cancel</AppText>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.logoutBtn, styles.logoutBtnPrimary]}
                onPress={confirmLogout}
              >
                <AppText style={[styles.logoutBtnPrimaryText, { color: "#fff" }]}>Logout</AppText>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      <EditAvatarModal
        isVisible={isAvatarModalVisible}
        onClose={() => setIsAvatarModalVisible(false)}
        currentAvatarUrl={serverAvatar || userData?.profilepicture}
        onAvatarCommitted={(path) => {
          if (path) setServerAvatar(path);
        }}
      />
    </AppSafeAreaView>
  );
};

export default AccountDetails;

const styles = StyleSheet.create({
  userSection: {
    marginTop: 10,
    overflow: "hidden",
  },
  userSectionInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    width: 65,
    height: 65,
    marginRight: 14,
    flexShrink: 0,
    alignSelf: "center",
    overflow: "visible",
  },
  avatarClip: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    overflow: "hidden",
  },
  avatar: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  editBadge: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    zIndex: 2,
  },
  userMeta: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",

    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  modalRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 6,
    alignItems: "center",
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 30,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tab: {
    paddingBottom: 10,
    marginRight: 30,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  logoutModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.62)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  logoutModalCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    width: "100%",
    maxWidth: 340,
    overflow: "hidden",
  },
  logoutLottieWrap: {
    width: 100,
    height: 100,
    borderRadius: 20,
    alignSelf: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutLottie: {
    width: 120,
    height: 120,
  },
  logoutTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  logoutDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  logoutActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  logoutBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutBtnSecondary: {
    borderWidth: 1,
  },
  logoutBtnSecondaryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  logoutBtnPrimary: {
    backgroundColor: colors.buttonBg,
  },
  logoutBtnPrimaryText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
