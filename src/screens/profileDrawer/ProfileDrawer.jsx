import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
  Platform,
  Modal,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import FastImage from "react-native-fast-image";
import Toast from "react-native-simple-toast";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DepositChoiceSheet from "../wallet/sheets/DepositChoiceSheet";
import WithdrawChoiceSheet from "../wallet/sheets/WithdrawChoiceSheet";

const showComingSoonToast = () =>
  Toast.showWithGravity("Coming soon", Toast.LONG, Toast.BOTTOM);

// import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons'; // or use react-native-vector-icons
// import MaterialIcons from 'react-native-vector-icon/MaterialIcons'
const screenWidth = Dimensions.get("window").width;
import Feather from "react-native-vector-icons/Feather";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import LottieView from "lottie-react-native";
import {
  alarm,
  back_ic,
  helpicon,
  kycixon,
  lock,
  logoutIcon,
  newDepositIcon,
  newWidthrawIcon,
  orderIcon,
  rewardHubIcon,
  inviteIcon,
  buyCrypto,
  convertIcon,
  settings,
  spottradingIcon,
  swapHistory,
  tradehistory,
  transactionhis,
  walletIcon,
  walletTransferIcon,
  copyIcon,
  INFERNAL_TRANSFER,
  memeXProfile,
  memeXProfileDark,
  stakingDrawer,
  stakingDrawerDark,
  walletDrawerDark,
  settingsDark,
  alarmDark,
  kycixonLight,
  lockLight,
  helpiconLight,
  currencyPreferLight,
  orderIconLight,
  walletTransferIconLight,
  tradehistoryLight,
  swapHistoryLight,
  bonusHistoryLight,
  INFERNAL_TRANSFER_Light,
  airdropDark,
  airdropLight,
  headPhoneIcon,
  setting_icon,
  referralProfile,
  bots_ic,
  newsicon,
  p2pIcon,
  spottradingIconNew,
  right_ic,
  editnew,
  softStaking,
  themeIcon,
  spotIconDarkTheme,
  stakingImgBlack,
  launchpad,
  vip,
} from "../../helper/ImageAssets";
import { AppText, BLACK, BOLD, DISCLAIMTEXT, ELEVEN, FOURTEEN, SEMI_BOLD, SIXTEEN, THIRTEEN, TWELVE, YELLOW } from "../../shared";
import NavigationService from "../../navigation/NavigationService";
import { languages } from "../../helper/languages";
import { checkValue, copyText } from "../../helper/utility";
import {
  STAKING_DASHBOARD_SCREEN,
  SOFT_STAKING_SCREEN,
  REFER_AND_EARN_SCREEN,
  DEPOSIT_COIN_SCREEN,
  EARING_SCREEN,
  ACCOUNT_SCREEN,
  KYC_STATUS_SCREEN,
  MARKET_SCREEN,
  OPEN_ORDER_SCREEN,
  NOTIFICATION_SCREEN,
  PAYMENT_OPTIONS_SCREEN,
  SETTING_SCREEN_New,
  AIRDROP_HISTORY_SCREEN,
  WALLET_WITHDRAW_SCREEN,
  SELECT_COIN_SCREEN,
  REFERRAL_LIST,
  NAVIGATION_BOTTOM_TAB_STACK,
  TRADE_SCREEN,
  LAUNCHPAD_SCREEN,
  VIP_SERVICES_SCREEN,
} from "../../navigation/routes";
import { useAppSelector } from "../../store/hooks";
import { getUserProfile } from "../../actions/accountActions";
import { useFocusEffect } from "@react-navigation/native";
import { appOperation } from "../../appOperation";
import { BASE_URL } from "../../helper/Constants";
import { colors, darkTheme } from "../../theme/colors";
import { fontFamilySemiBold } from "../../theme/typography";
import { useTheme } from "../../hooks/useTheme";
import { useDispatch } from "react-redux";
import { setTheme } from "../../slices/authSlice";


const Width = Dimensions.get("window").width;

const getGeneralFeaturesData = (theme) => [
  {
    id: "1",
    title: checkValue(languages?.memex),
    icon: theme !== "Dark" ? memeXProfile : memeXProfileDark,
    onPress: () =>
      NavigationService.navigate(MARKET_SCREEN, { from: "home", tab: "MemeX" }),
  },

  {
    id: "4",
    title: "Staking",
    icon: theme !== "Dark" ? stakingDrawer : stakingDrawerDark,
    onPress: () => NavigationService.navigate(STAKING_DASHBOARD_SCREEN),
  },
  {
    id: "5",
    title: "Wallet",
    icon: theme !== "Dark" ? walletDrawerDark : walletIcon,
    onPress: () => NavigationService.navigate(EARING_SCREEN),
  },
  {
    id: "6",
    title: "Settings",
    icon: theme !== "Dark" ? settings : settingsDark,
    onPress: () => {
      NavigationService.navigate(SETTING_SCREEN_New);
    },
  },
];

const getSupportToolsData = (theme) => [
  {
    id: "1",
    title: "Notification",
    icon: theme == "Dark" ? alarmDark : alarm,
    onPress: () => NavigationService.navigate(NOTIFICATION_SCREEN),
  },

  {
    id: "2",
    title: "Verification",
    icon: theme !== "Dark" ? kycixonLight : kycixon,
    onPress: () =>
      NavigationService.navigate(KYC_STATUS_SCREEN, { from: "home" }),
  },

  {
    id: "4",
    title: "Security",
    icon: theme !== "Dark" ? lockLight : lock,
    onPress: () =>
      NavigationService.navigate(ACCOUNT_SCREEN, { from: "home" }),
  },

  {
    id: "6",
    title: "Help Center",
    icon: theme !== "Dark" ? helpiconLight : helpicon,
    onPress: () => NavigationService.navigate("Support"),
  },

];
const getHistoryData = (theme) => [
  {
    id: "1",
    title: "Open Orders",
    icon: theme == "Dark" ? orderIcon : orderIconLight,
    onPress: () => NavigationService.navigate(OPEN_ORDER_SCREEN),
  },

  {
    id: "2",
    title: "Transaction History",
    icon: theme !== "Dark" ? walletTransferIconLight : walletTransferIcon,
    onPress: () => NavigationService.navigate("Wallet_History"),
  },
  {
    id: "3",
    title: "Spot Order",
    icon: theme == "Dark" ? tradehistoryLight : tradehistory,
    onPress: () => {
      NavigationService.navigate("Trade_History");
    },
  },
  {
    id: "4",
    title: "Swap History",
    icon: theme !== "Dark" ? swapHistoryLight : swapHistory,
    onPress: () => NavigationService.navigate("Swap_History"),
  },
  {
    id: "4",
    title: "Interal Transfer",
    icon: theme !== "Dark" ? INFERNAL_TRANSFER_Light : INFERNAL_TRANSFER,
    onPress: () => NavigationService.navigate("Interanl_Trade_History"),
  },
  {
    id: "5",
    title: "Bonus History",
    icon: theme !== "Dark" ? bonusHistoryLight : transactionhis,
    onPress: () => NavigationService.navigate("Admin_Trade"),
  },
  {
    id: "6",
    title: "Airdrop History",
    icon: theme !== "Dark" ? airdropDark : airdropLight,
    onPress: () => NavigationService.navigate(AIRDROP_HISTORY_SCREEN),
  },
];

const GRID_COLUMNS = 4;
const gridSpacing = 10;
const gridItemWidth = (Width - 32 - gridSpacing * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

const getShortcutMenuItems = (theme) => [
  // {
  //   id: "sh1",
  //   title: "Rewards Hub",
  //   icon: rewardHubIcon,
  //   onPress: showComingSoonToast,
  // },
  {
    id: "sh2",
    title: "Invite Friends",
    icon: inviteIcon,
    onPress: () => NavigationService.navigate(REFER_AND_EARN_SCREEN),
  },
  // {
  //   id: "sh3",
  //   title: "Bots",
  //   icon: bots_ic,
  //   onPress: showComingSoonToast,
  // },
  // {
  //   id: "sh4",
  //   title: "Copy Trading",
  //   icon: spottradingIcon,
  //   onPress: showComingSoonToast,
  // },
  // {
  //   id: "sh5",
  //   title: "Edit",
  //   icon: editnew,
  //   onPress: showComingSoonToast,
  // },
  {
    id: "sh6",
    title: "News",
    icon: newsicon,
    onPress: () => NavigationService.navigate(NOTIFICATION_SCREEN),
  },
  {
    id: "sh7",
    title: "Launchpad",
    icon: launchpad,
    onPress: () => NavigationService.navigate(LAUNCHPAD_SCREEN),
  },
  {
    id: "sh8",
    title: "VIP Services",
    icon: vip,
    onPress: () => NavigationService.navigate(VIP_SERVICES_SCREEN),
  },

];

const getPopularMenuItems = (theme, callbacks = {}) => [
  {
    id: "p1",
    title: "Deposit",
    icon: newDepositIcon,
    onPress: callbacks.onOpenDeposit || (() => NavigationService.navigate(DEPOSIT_COIN_SCREEN)),
  },
  // {
  //   id: "p2",
  //   title: "P2P",
  //   icon: p2pIcon,
  //   onPress: showComingSoonToast,
  // },
  {
    id: "p3",
    title: "Withdrawal",
    icon: newWidthrawIcon,
    onPress: callbacks.onOpenWithdraw || (() => NavigationService.navigate(SELECT_COIN_SCREEN)),
  },
  // {
  //   id: "p4",
  //   title: "Convert",
  //   icon: convertIcon,
  //   onPress: showComingSoonToast,
  // },
  {
    id: "p5",
    title: "Spot",
    icon: theme == "Dark" ? spotIconDarkTheme : spottradingIconNew,
    ignoreTint: true,
    iconSize: theme == "Dark" ? 42 : undefined,
    onPress: () =>
      NavigationService.navigate(NAVIGATION_BOTTOM_TAB_STACK, { screen: TRADE_SCREEN }),
  },
  // {
  //   id: "p6",
  //   title: "Buy Crypto",
  //   icon: buyCrypto,
  //   onPress: showComingSoonToast,
  // },
  {
    id: "p6_staking",
    title: "Staking",
    icon: stakingImgBlack,
    onPress: () => NavigationService.navigate(STAKING_DASHBOARD_SCREEN),
  },
  {
    id: "p7",
    title: "Soft Staking",
    icon: softStaking,
    onPress: () => NavigationService.navigate(SOFT_STAKING_SCREEN),
  },
];

const getSecurityVerificationItems = (theme) => [
  {
    id: "sv2",
    title: "Identification",
    icon: kycixon,
    onPress: () => NavigationService.navigate(KYC_STATUS_SCREEN),
  },
  {
    id: "sv1",
    title: "Security",
    icon: theme !== "Dark" ? lockLight : lock,
    // onPress: showComingSoonToast,
    onPress: () => NavigationService.navigate(ACCOUNT_SCREEN),
  },
];

/**
 * Same 0–4 meaning as KycStatus.js. Only accept plain integers (no parseInt("3abc") === 3).
 */
function normalizeKycTierFromProfile(raw) {
  if (raw === null || raw === undefined || raw === "" || raw === false) return 0;
  if (raw === true) return 1;
  const s = typeof raw === "string" ? raw.trim() : raw;
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  const t = Math.trunc(n);
  if (t !== n) return 0;
  if (t < 0 || t > 4) return 0;
  return t;
}

/**
 * KYC pill: 0/1/4 → orange pending, 2 → green verified, 3 → red failed.
 * If profile has kyc_status hint "pending/review" but tier is still 3, treat as in-review (orange).
 */
function getKycTierBadge(userData, isDark) {
  const raw = userData?.kycVerified ?? userData?.kyc_verified;
  let tier = normalizeKycTierFromProfile(raw);
  const hint = String(userData?.kyc_status ?? userData?.kycStatus ?? "").toLowerCase();
  if (
    tier === 3 &&
    hint &&
    /pending|review|process|submit|progress|under/.test(hint) &&
    !/reject|fail|declin|denied/.test(hint)
  ) {
    tier = 1;
  }

  if (tier === 2) {
    return {
      label: "Verified",
      borderColor: "#22C55E",
      fg: isDark ? "#86EFAC" : "#166534",
      bg: isDark ? "rgba(34, 197, 94, 0.14)" : "#DCFCE7",
    };
  }
  if (tier === 3) {
    return {
      label: "Failed",
      borderColor: "#EF4444",
      fg: isDark ? "#FCA5A5" : "#B91C1C",
      bg: isDark ? "rgba(239, 68, 68, 0.14)" : "#FEE2E2",
    };
  }
  if (tier === 0) {
    return {
      label: "Unverified",
      borderColor: colors.cyanTheme,
      fg: isDark ? "#FDBA74" : "#C2410C",
      bg: isDark ? "rgba(249, 115, 22, 0.16)" : "#FFEDD5",
    };
  }
  return {
    label: "Pending",
    borderColor: "#F97316",
    fg: isDark ? "#FDBA74" : "#C2410C",
    bg: isDark ? "rgba(249, 115, 22, 0.16)" : "#FFEDD5",
  };
}

function maskProfileEmail(email) {
  if (!email || typeof email !== "string") return "";
  const at = email.indexOf("@");
  if (at < 1) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const head = local.slice(0, Math.min(3, local.length));
  const dom = domain.slice(0, Math.min(5, domain.length));
  return `${head}*@${dom}**`;
}

const KYC_AVATAR_GRADIENT = ["#a684ff", "#ad46ff", "#4f39f6"];
const KYC_AVATAR_GRADIENT_LOCATIONS = [0, 0.5, 1];

function getInitials(userData, serverNick) {
  const name = serverNick || userData?.display_name || userData?.user_login || userData?.user_nicename || userData?.first_name || userData?.firstName || "User";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const PROFILE_GRID_ICON_WRAP = 42;
const PROFILE_GRID_ICON_INNER = 25;

const ProfileGridItem = ({ title, iconSource, onPress, themeColors, isDark, itemWidth, ignoreTint, iconSize }) => (
  <TouchableOpacity
    style={{ width: itemWidth, alignItems: "center", marginBottom: 8 }}
    onPress={onPress}
    activeOpacity={0.78}
  >
    <View
      style={{
        width: PROFILE_GRID_ICON_WRAP,
        height: PROFILE_GRID_ICON_WRAP,
        borderRadius: 20,
        backgroundColor: isDark ? "#2A2A2E" : colors.iconBgColor,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <FastImage
        source={iconSource}
        style={{ width: iconSize || PROFILE_GRID_ICON_INNER, height: iconSize || PROFILE_GRID_ICON_INNER }}
        resizeMode="contain"
        {...(ignoreTint ? {} : { tintColor: isDark ? "#FFFFFF" : "#000000" })}
      />
    </View>
    <AppText
      numberOfLines={title.includes(" ") ? 2 : 1}
      adjustsFontSizeToFit={true}
      minimumFontScale={0.65}
      type={THIRTEEN}
      style={{
        marginTop: 8,
        textAlign: "center",
        color: themeColors.text,
        lineHeight: 16,
        paddingHorizontal: 1,
      }}
    >
      {title}
    </AppText>
  </TouchableOpacity>
);

const STAGGER_DELAY = 45;
const ENTRANCE_DURATION = 380;

const AnimatedIconBox = ({ theme, children, themeColors }) => {
  return (
    <View
      style={{
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme !== "Dark" ? themeColors.themeElevationColor : themeColors.themeSelection,
        borderRadius: 5,
      }}
    >
      {children}
    </View>
  );
};


const ProfileDrawer = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { colors: themeColors, theme, isDark } = useTheme();
  const drawerColors = themeColors;
  const effectiveTheme = theme ?? (isDark ? "Dark" : "Light");
  const userData = useAppSelector((state) => state.auth.userData);

  const Data = getGeneralFeaturesData(effectiveTheme);
  const Data2 = getSupportToolsData(effectiveTheme);
  const Data3 = getHistoryData(effectiveTheme);
  const [refresh, setRefresh] = useState(true);
  const emailTextOpacity = useRef(new Animated.Value(0)).current;
  const emailTextTranslateY = useRef(new Animated.Value(10)).current;

  const [showAllServicesModal, setShowAllServicesModal] = useState(false);
  const depositChoiceSheetRef = useRef(null);
  const withdrawChoiceSheetRef = useRef(null);

  const handleOpenDepositChoice = useCallback(() => {
    depositChoiceSheetRef.current?.open?.();
  }, []);

  const handleOpenWithdrawChoice = useCallback(() => {
    withdrawChoiceSheetRef.current?.open?.();
  }, []);

  const shortcutItems = useMemo(() => getShortcutMenuItems(effectiveTheme), [effectiveTheme]);
  const popularItems = useMemo(
    () =>
      getPopularMenuItems(effectiveTheme, {
        onOpenDeposit: handleOpenDepositChoice,
        onOpenWithdraw: handleOpenWithdrawChoice,
      }),
    [effectiveTheme, handleOpenDepositChoice, handleOpenWithdrawChoice]
  );
  const securityVerificationItems = useMemo(
    () => getSecurityVerificationItems(effectiveTheme),
    [effectiveTheme]
  );
  const kycBadge = useMemo(
    () => getKycTierBadge(userData, isDark),
    [userData?.kycVerified, userData?.kyc_verified, userData?.kyc_status, userData?.kycStatus, isDark]
  );
  const vipLevel = userData?.vipLevel ?? userData?.vip ?? 0;

  const getResolvedName = () => {
    if (serverNickname) return serverNickname;
    if (userData?.firstName && userData?.lastName) return `${userData.firstName} ${userData.lastName}`;
    if (userData?.first_name && userData?.last_name) return `${userData.first_name} ${userData.last_name}`;
    return userData?.firstName || userData?.first_name || userData?.display_name || userData?.userName || userData?.user_login || userData?.user_nicename || "User";
  };
  const displayName = getResolvedName();

  const displayAccountLine = userData?.emailId
    ? maskProfileEmail(userData.emailId)
    : displayName;


  useEffect(() => {
    dispatch(getUserProfile());
  }, [refresh]);

  const [serverNickname, setServerNickname] = useState(null);
  const [serverAvatar, setServerAvatar] = useState(null);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(emailTextOpacity, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(emailTextTranslateY, {
          toValue: 0,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 180);
    return () => clearTimeout(timer);
  }, []);



  const paperBg = isDark ? colors.newThemeColor : "#FFFFFF";
  const allServicesList = [
    ...Data.map((item, i) => ({ ...item, rowKey: `g-${item.id}-${i}` })),
    ...Data2.map((item, i) => ({ ...item, rowKey: `s-${item.id}-${i}` })),
    ...Data3.map((item, i) => ({ ...item, rowKey: `h-${item.id}-${i}` })),
  ];

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background, paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: Platform.OS === "ios" ? 12 : 20,
          paddingBottom: 100,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <TouchableOpacity onPress={() => NavigationService.goBack()} hitSlop={12}>
            <FastImage source={back_ic} resizeMode="contain" style={{ width: 20, height: 20 }} tintColor={themeColors.text} />
          </TouchableOpacity>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TouchableOpacity
              onPress={() => {
                const newTheme = isDark ? 'Light' : 'Dark';
                dispatch(setTheme(newTheme));
                AsyncStorage.setItem('theme', newTheme);
              }}
              hitSlop={8}
            >
              <FastImage source={themeIcon} resizeMode="contain" style={{ width: 25, height: 25 }} tintColor={themeColors.text} />
            </TouchableOpacity>
            {/* <TouchableOpacity onPress={() => NavigationService.navigate(SETTING_SCREEN_New)} hitSlop={8}>
              <FastImage source={setting_icon} resizeMode="contain" style={{ width: 22, height: 22 }} tintColor={themeColors.text} />
            </TouchableOpacity> */}
            <TouchableOpacity onPress={() => NavigationService.navigate("Support")} hitSlop={8}>
              <FastImage source={headPhoneIcon} resizeMode="contain" style={{ width: 22, height: 22 }} tintColor={themeColors.text} />
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => NavigationService.navigate(ACCOUNT_SCREEN)}
          activeOpacity={0.9}
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,0.18)" : "#E8E8E8",
            overflow: "hidden",
            backgroundColor: isDark ? "#23242a" : "#FFFFFF",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 5,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: colors.disclaimDarText,
                bottom: 10
              }}
            >
              {finalAvatarUri ? (
                <FastImage
                  source={{ uri: finalAvatarUri }}
                  style={{ width: 56, height: 56, borderRadius: 28 }}
                />
              ) : (
                <LinearGradient
                  colors={KYC_AVATAR_GRADIENT}
                  locations={KYC_AVATAR_GRADIENT_LOCATIONS}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 56,
                    height: 56,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AppText weight={BOLD} style={{ color: "#FFFFFF", fontSize: 18 }}>
                    {getInitials(userData, serverNickname)}
                  </AppText>
                </LinearGradient>
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Animated.View style={{ opacity: emailTextOpacity, transform: [{ translateY: emailTextTranslateY }] }}>
                <AppText style={{ color: themeColors.text, fontSize: 18, }} weight={SEMI_BOLD} numberOfLines={1}>
                  {displayAccountLine}
                </AppText>
              </Animated.View>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 6 }}>
                <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>
                  UID: {userData?.uuid || "—"}
                </AppText>
                {userData?.uuid ? (
                  <TouchableOpacity onPress={() => copyText(userData.uuid)} hitSlop={8}>
                    <FastImage source={copyIcon} style={{ width: 12, height: 12 }} tintColor={themeColors.secondaryText} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                <View style={[styles.profileBadge, { backgroundColor: isDark ? "#2F3138" : "#F3F4F6" }]}>
                  <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.secondaryText }}>
                    VIP {vipLevel}
                  </AppText>
                </View>
                <View
                  style={[
                    styles.profileBadge,
                    {
                      backgroundColor: kycBadge.bg,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: fontFamilySemiBold,
                      color: kycBadge.fg,
                    }}
                  >
                    {kycBadge.label}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              disabled
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ flexShrink: 0, justifyContent: "center", paddingLeft: 8 }}
            >
              <FastImage source={right_ic} style={{ width: 18, height: 18, right: 15 }} tintColor={themeColors.text} resizeMode="contain" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.referralCard,
            {
              backgroundColor: isDark ? "#2A2A2E" : "#F4F4F6",
              borderColor: isDark ? themeColors.border : "#E8E8E8",
            },
          ]}
        >
          <View style={{ flex: 1, paddingRight: 8 }}>
            <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
              Referral Program
            </AppText>
            <AppText type={FOURTEEN} color={themeColors.secondaryText} style={{ marginTop: 6, lineHeight: 18 }}>
              {`Refer friends to earn a 35% \n commission`}
            </AppText>
          </View>
          <View style={styles.referralArtWrap}>
            <FastImage source={referralProfile} style={{ width: 58, height: 58 }} resizeMode="contain" />
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 22 }}>
          <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
            Security & verification
          </AppText>
        </View>
        <View style={[styles.profileIconGrid, { marginTop: 14 }]}>
          {securityVerificationItems.map((item) => (
            <ProfileGridItem
              key={item.id}
              title={item.title}
              iconSource={item.icon}
              ignoreTint={item.ignoreTint}
              iconSize={item.iconSize}
              onPress={item.onPress}
              themeColors={drawerColors}
              isDark={isDark}
              itemWidth={gridItemWidth}
            />
          ))}
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 26 }}>
          <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
            Shortcut
          </AppText>

        </View>

        <View style={[styles.profileIconGrid, { marginTop: 14 }]}>
          {shortcutItems.map((item) => (
            <ProfileGridItem
              key={item.id}
              title={item.title}
              iconSource={item.icon}
              ignoreTint={item.ignoreTint}
              iconSize={item.iconSize}
              onPress={item.onPress}
              themeColors={drawerColors}
              isDark={isDark}
              itemWidth={gridItemWidth}
            />
          ))}
        </View>

        <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginTop: 22 }}>
          Popular
        </AppText>
        <View style={[styles.profileIconGrid, { marginTop: 14 }]}>
          {popularItems.map((item) => (
            <ProfileGridItem
              key={item.id}
              title={item.title}
              iconSource={item.icon}
              ignoreTint={item.ignoreTint}
              iconSize={item.iconSize}
              onPress={item.onPress}
              themeColors={drawerColors}
              isDark={isDark}
              itemWidth={gridItemWidth}
            />
          ))}
        </View>
      </ScrollView>
      <Modal visible={showAllServicesModal} transparent animationType="fade" onRequestClose={() => setShowAllServicesModal(false)}>
        <View style={styles.allServicesModalRoot}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowAllServicesModal(false)} />
          <View
            style={[
              styles.allServicesCard,
              { backgroundColor: themeColors.background, borderColor: themeColors.border, zIndex: 2, alignSelf: "center", width: "100%", maxWidth: 400 },
            ]}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
                All Services
              </AppText>
              <TouchableOpacity onPress={() => setShowAllServicesModal(false)} hitSlop={10}>
                <MaterialIcons name="close" size={20} color={themeColors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: Dimensions.get("window").height * 0.55 }} showsVerticalScrollIndicator={false}>
              {allServicesList.map((item) => (
                <TouchableOpacity
                  key={item.rowKey}
                  style={[styles.allServicesRow, { borderBottomColor: isDark ? "#333" : "#EEE" }]}
                  onPress={() => {
                    setShowAllServicesModal(false);
                    item.onPress?.();
                  }}
                >
                  <FastImage source={item.icon} style={{ width: 18, height: 18 }} resizeMode="contain" />
                  <AppText type={THIRTEEN} style={{ marginLeft: 12, color: themeColors.text, flex: 1 }}>
                    {item.title}
                  </AppText>
                  <MaterialIcons name="chevron-right" size={18} color={themeColors.secondaryText} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.allServicesRow, { borderBottomWidth: 0 }]}
                onPress={() => {
                  setShowAllServicesModal(false);
                  openLogoutModal();
                }}
              >
                <FastImage source={logoutIcon} style={{ width: 18, height: 18 }} resizeMode="contain" tintColor="#C62828" />
                <AppText type={THIRTEEN} weight={SEMI_BOLD} style={{ marginLeft: 12, color: "#C62828", flex: 1 }}>
                  Logout
                </AppText>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Deposit & Withdraw Choice Sheets */}
      <DepositChoiceSheet sheetRef={depositChoiceSheetRef} isDark={isDark} />
      <WithdrawChoiceSheet sheetRef={withdrawChoiceSheetRef} isDark={isDark} />

    </View>
  );
};

export default ProfileDrawer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    width: screenWidth,
  },
  logoutModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.62)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  logoutModalCard: {

    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    width: "100%",
    maxWidth: 360,
  },
  logoutLottieWrap: {
    width: 120,
    height: 120,
    borderRadius: 24,
    alignSelf: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutLottie: {
    width: 140,
    height: 140,
  },
  logoutTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  logoutDesc: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
    textAlign: "center",
  },
  logoutActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  logoutBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutBtnSecondary: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
  },
  logoutBtnSecondaryText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "600",
  },
  logoutBtnPrimary: {
    backgroundColor: colors.buttonBg,
  },
  logoutBtnPrimaryText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  secondcontainer: {
    // width: Width*0.92,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-start",
    paddingVertical: 10,
    marginHorizontal: 15,
  },

  icon: {
    height: 18,
    width: 18,
    // marginBottom: 10,
  },
  singleItem: {
    width: "20%",
    gap: 8,
    alignItems: "center",
    marginTop: 20,
    height: 60,
  },
  profileBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  referralCard: {
    marginTop: 20,
    padding: 10,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  referralArtWrap: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  profileIconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: gridSpacing,
  },
  homeCheckOuter: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  allServicesBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
  },
  allServicesBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  allServicesModalRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  allServicesCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    maxHeight: "80%",
  },
  allServicesRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
