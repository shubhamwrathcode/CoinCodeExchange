import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Modal,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import FastImage from "react-native-fast-image";
import Toast from "react-native-simple-toast";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ChevronRight } from "lucide-react-native";
import DepositChoiceSheet from "../wallet/sheets/DepositChoiceSheet";
import WithdrawChoiceSheet from "../wallet/sheets/WithdrawChoiceSheet";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import {
  alarm,
  alarmDark,
  airdropDark,
  airdropLight,
  helpicon,
  helpiconLight,
  INFERNAL_TRANSFER,
  INFERNAL_TRANSFER_Light,
  kycixon,
  kycixonLight,
  lock,
  lockLight,
  logoutIcon,
  memeXProfile,
  memeXProfileDark,
  orderIcon,
  orderIconLight,
  settings,
  settingsDark,
  stakingDrawer,
  stakingDrawerDark,
  swapHistory,
  swapHistoryLight,
  tradehistory,
  tradehistoryLight,
  transactionhis,
  bonusHistoryLight,
  walletIcon,
  walletDrawerDark,
  walletTransferIcon,
  walletTransferIconLight,
  TradeIcon,
  profileDepositIcon,
  profileWithdrawalIcon,
  profileInviteFriendsIcon,
  profileCopyTradeIcon,
  profileNewsIcon,
  profileReferProgramIcon,
  profileUserAvtar,
  profileSettingImg,
  profileHeadphoneImg,
  profileBackButtonImg,
  profileMoreIcon,
  profileConvertIcon,
  profileP2pIcon,
  themeIcon,
  newsIcon1,
} from "../../helper/ImageAssets";
import { AppText, BOLD, SEMI_BOLD, SIXTEEN, THIRTEEN } from "../../shared";
import NavigationService from "../../navigation/NavigationService";
import { languages } from "../../helper/languages";
import { checkValue, copyText } from "../../helper/utility";
import {
  STAKING_DASHBOARD_SCREEN,
  REFER_AND_EARN_SCREEN,
  EARING_SCREEN,
  ACCOUNT_SCREEN,
  KYC_STATUS_SCREEN,
  MARKET_SCREEN,
  OPEN_ORDER_SCREEN,
  NOTIFICATION_SCREEN,
  SETTING_SCREEN_New,
  AIRDROP_HISTORY_SCREEN,
  BUY_CRYPTO_SCREEN,
  NAVIGATION_BOTTOM_TAB_STACK,
  TRADE_SCREEN,
  WALLET_SCREEN,
  MORE_SERVICES_SCREEN,
} from "../../navigation/routes";
import { useAppSelector } from "../../store/hooks";
import { getUserProfile } from "../../actions/accountActions";
import { useFocusEffect } from "@react-navigation/native";
import { appOperation } from "../../appOperation";
import { BASE_URL } from "../../helper/Constants";
import { colors } from "../../theme/colors";
import { fontFamilySemiBold } from "../../theme/typography";
import { useTheme } from "../../hooks/useTheme";
import { useDispatch } from "react-redux";
import { setTheme } from "../../slices/authSlice";
import ToggleSwitch from "../../common/ToggleSwitch";

const showComingSoonToast = () =>
  Toast.showWithGravity("Coming soon", Toast.LONG, Toast.BOTTOM);

const screenWidth = Dimensions.get("window").width;

const CYAN = colors.cyanTheme || "#0AA8C5";

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
    onPress: () => NavigationService.navigate(SETTING_SCREEN_New),
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
    onPress: () => NavigationService.navigate(ACCOUNT_SCREEN, { from: "home" }),
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
    onPress: () => NavigationService.navigate("Trade_History"),
  },
  {
    id: "4",
    title: "Swap History",
    icon: theme !== "Dark" ? swapHistoryLight : swapHistory,
    onPress: () => NavigationService.navigate("Swap_History"),
  },
  {
    id: "4b",
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
      fg: isDark ? "#86EFAC" : "#166534",
      bg: isDark ? "rgba(34, 197, 94, 0.14)" : "#DCFCE7",
    };
  }
  if (tier === 3) {
    return {
      label: "Failed",
      fg: "#F44336",
      bg: "rgba(244, 67, 54, 0.15)",
    };
  }
  if (tier === 0) {
    return {
      label: "Unverified",
      fg: isDark ? "#FDBA74" : "#C2410C",
      bg: isDark ? "rgba(249, 115, 22, 0.16)" : "#FFEDD5",
    };
  }
  return {
    label: "Pending",
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
  const name =
    serverNick ||
    userData?.display_name ||
    userData?.user_login ||
    userData?.user_nicename ||
    userData?.first_name ||
    userData?.firstName ||
    "User";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const ProfileDrawer = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { colors: themeColors, theme, isDark } = useTheme();
  const effectiveTheme = theme ?? (isDark ? "Dark" : "Light");
  const userData = useAppSelector((state) => state.auth.userData);

  const Data = getGeneralFeaturesData(effectiveTheme);
  const Data2 = getSupportToolsData(effectiveTheme);
  const Data3 = getHistoryData(effectiveTheme);

  const [productChangelog, setProductChangelog] = useState(true);
  const [showAllServicesModal, setShowAllServicesModal] = useState(false);
  const depositChoiceSheetRef = useRef(null);
  const withdrawChoiceSheetRef = useRef(null);

  const handleOpenDepositChoice = useCallback(() => {
    depositChoiceSheetRef.current?.open?.();
  }, []);

  const handleOpenWithdrawChoice = useCallback(() => {
    withdrawChoiceSheetRef.current?.open?.();
  }, []);

  const kycBadge = useMemo(
    () => getKycTierBadge(userData, isDark),
    [userData?.kycVerified, userData?.kyc_verified, userData?.kyc_status, userData?.kycStatus, isDark]
  );
  const vipLevel = userData?.vipLevel ?? userData?.vip ?? 0;

  const [serverNickname, setServerNickname] = useState(null);
  const [serverAvatar, setServerAvatar] = useState(null);

  const getResolvedName = () => {
    if (serverNickname) return serverNickname;
    if (userData?.firstName && userData?.lastName) return `${userData.firstName} ${userData.lastName}`;
    if (userData?.first_name && userData?.last_name) return `${userData.first_name} ${userData.last_name}`;
    return (
      userData?.firstName ||
      userData?.first_name ||
      userData?.display_name ||
      userData?.userName ||
      userData?.user_login ||
      userData?.user_nicename ||
      "User"
    );
  };
  const displayName = getResolvedName();
  const displayAccountLine = userData?.emailId
    ? maskProfileEmail(userData.emailId)
    : displayName;

  useEffect(() => {
    dispatch(getUserProfile());
  }, []);

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
      return () => {
        active = false;
      };
    }, [])
  );

  const getFullAvatarUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    if (url.startsWith("uploads/")) {
      const baseUrl = BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;
      return `${baseUrl}${url}`;
    }
    return url;
  };

  const finalAvatarUri = getFullAvatarUrl(serverAvatar || userData?.profilepicture);

  const allServicesList = [
    ...Data.map((item, i) => ({ ...item, rowKey: `g-${item.id}-${i}` })),
    ...Data2.map((item, i) => ({ ...item, rowKey: `s-${item.id}-${i}` })),
    ...Data3.map((item, i) => ({ ...item, rowKey: `h-${item.id}-${i}` })),
  ];

  const actionButtons = useMemo(
    () => [
      { img: profileDepositIcon, label: "Deposit", onPress: handleOpenDepositChoice },
      // { img: profileP2pIcon, label: "P2P", onPress: showComingSoonToast },
      { img: profileWithdrawalIcon, label: "Withdrawal", onPress: handleOpenWithdrawChoice },
      {
        img: profileConvertIcon,
        label: "Convert",
        onPress: () => NavigationService.navigate(BUY_CRYPTO_SCREEN),
      },
      {
        img: profileInviteFriendsIcon,
        label: "Referral",
        onPress: () => NavigationService.navigate(REFER_AND_EARN_SCREEN),
      },
      // { img: profileCopyTradeIcon, label: "Copy Trading", onPress: showComingSoonToast },
      {
        img: TradeIcon,
        iconSize: 22,
        tintColor: isDark ? "#FFFFFF" : "#000000",
        label: "Trade",
        onPress: () =>
          NavigationService.navigate(NAVIGATION_BOTTOM_TAB_STACK, { screen: TRADE_SCREEN }),
      },
      {
        img: walletIcon,
        iconSize: 22,
        label: "Wallet",
        onPress: () =>
          NavigationService.navigate(NAVIGATION_BOTTOM_TAB_STACK, { screen: WALLET_SCREEN }),
      },
      {
        img: newsIcon1,
        label: "News",
        onPress: () => NavigationService.navigate(NOTIFICATION_SCREEN),
      },
      {
        img: profileMoreIcon,
        label: "More",
        onPress: () => NavigationService.navigate(MORE_SERVICES_SCREEN),
      },
    ],
    [handleOpenDepositChoice, handleOpenWithdrawChoice, isDark]
  );

  const listCardBg = isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)";
  const listCardBorder = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
  const muted = isDark ? colors.darkShadeColorText || "#8E8E93" : themeColors.secondaryText;
  const textColor = themeColors.text;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background, paddingTop: insets.top }]}>
      {/* Header — CoinCode MyProfile */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => NavigationService.goBack()} hitSlop={12}>
          <FastImage
            source={profileBackButtonImg}
            style={{ width: 35, height: 35 }}
            resizeMode="contain"
            tintColor={isDark ? undefined : textColor}
          />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => {
              const newTheme = isDark ? "Light" : "Dark";
              dispatch(setTheme(newTheme));
              AsyncStorage.setItem("theme", newTheme);
            }}
            hitSlop={8}
          >
            <FastImage
              source={themeIcon}
              style={{ width: 25, height: 25 }}
              resizeMode="contain"
              tintColor={textColor}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => NavigationService.navigate(SETTING_SCREEN_New)}
            hitSlop={8}
          >
            <FastImage
              source={profileSettingImg}
              style={{ width: 35, height: 35 }}
              resizeMode="contain"
              tintColor={isDark ? undefined : textColor}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => NavigationService.navigate("Support")}
            hitSlop={8}
          >
            <FastImage
              source={profileHeadphoneImg}
              style={{ width: 35, height: 35 }}
              resizeMode="contain"
              tintColor={isDark ? undefined : textColor}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info */}
        <TouchableOpacity
          style={styles.userInfoContainer}
          activeOpacity={0.85}
          onPress={() => NavigationService.navigate(ACCOUNT_SCREEN)}
        >
          <View style={[styles.avatarContainer, { borderColor: CYAN }]}>
            {finalAvatarUri ? (
              <FastImage
                source={{ uri: finalAvatarUri }}
                style={styles.avatarImg}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={KYC_AVATAR_GRADIENT}
                locations={KYC_AVATAR_GRADIENT_LOCATIONS}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarFallback}
              >
                <AppText weight={BOLD} style={{ color: "#FFFFFF", fontSize: 18 }}>
                  {getInitials(userData, serverNickname)}
                </AppText>
              </LinearGradient>
            )}
          </View>

          <View style={styles.userDetails}>
            <View style={styles.emailRow}>
              <AppText
                weight={SEMI_BOLD}
                style={{ color: textColor, fontSize: 16, marginRight: 6, flexShrink: 1 }}
                numberOfLines={1}
              >
                {displayAccountLine}
              </AppText>
              <View style={styles.checkCircle}>
                <Check color="#000000" size={12} strokeWidth={3} />
              </View>
            </View>

            <View style={styles.uidRow}>
              <AppText style={{ color: muted, fontSize: 13 }}>
                UID: {userData?.uuid || "—"}
              </AppText>
              {userData?.uuid ? (
                <TouchableOpacity onPress={() => copyText(userData.uuid)} hitSlop={8} style={{ marginLeft: 6 }}>
                  <MaterialIcons name="content-copy" size={14} color={muted} />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.badgesRow}>
              <View style={[styles.badge, { backgroundColor: "rgba(0, 255, 255, 0.1)" }]}>
                <Text style={{ color: CYAN, fontSize: 10, fontFamily: fontFamilySemiBold }}>
                  VIP {vipLevel}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: kycBadge.bg }]}>
                <Text style={{ color: kycBadge.fg, fontSize: 10, fontFamily: fontFamilySemiBold }}>
                  {kycBadge.label}
                </Text>
              </View>
            </View>
          </View>

          <ChevronRight color={textColor} size={20} />
        </TouchableOpacity>

        {/* Referral Program Banner */}
        <TouchableOpacity
          style={[
            styles.referralBanner,
            {
              backgroundColor: isDark ? "rgba(0, 255, 255, 0.05)" : "rgba(10, 168, 197, 0.06)",
              borderColor: isDark ? "rgba(0, 255, 255, 0.3)" : "rgba(10, 168, 197, 0.35)",
            },
          ]}
          activeOpacity={0.85}
          onPress={() => NavigationService.navigate(REFER_AND_EARN_SCREEN)}
        >
          <View style={styles.referralContent}>
            <AppText weight={SEMI_BOLD} style={{ color: CYAN, fontSize: 16, marginBottom: 4 }}>
              Referral Program
            </AppText>
            <AppText style={{ color: muted, fontSize: 13, lineHeight: 18 }}>
              {"Refer friends to earn a 35%\ncommission"}
            </AppText>
          </View>
          <View style={styles.referralImagePlaceholder}>
            <FastImage
              source={profileReferProgramIcon}
              style={styles.referralArt}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>

        {/* Action Grid */}
        <View
          style={[
            styles.gridContainer,
            { backgroundColor: listCardBg, borderColor: listCardBorder },
          ]}
        >
          {actionButtons.map((action, index) => {
            const IconCmp = action.Icon;
            const size = action.iconSize || 22;
            return (
              <TouchableOpacity key={index} style={styles.gridItem} onPress={action.onPress} activeOpacity={0.75}>
                <View
                  style={[
                    styles.gridIconContainer,
                    { backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)" },
                  ]}
                >
                  {IconCmp ? (
                    <IconCmp size={size} color={action.iconColor || CYAN} strokeWidth={2} />
                  ) : (
                    <FastImage
                      source={action.img}
                      style={{ width: size, height: size }}
                      resizeMode="contain"
                      {...(action.tintColor ? { tintColor: action.tintColor } : {})}
                    />
                  )}
                </View>
                <AppText
                  style={{
                    color: textColor,
                    textAlign: "center",
                    fontSize: 12,
                  }}
                  numberOfLines={2}
                >
                  {action.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List Items */}
        <View style={styles.listSection}>
          <TouchableOpacity
            style={[styles.listItem, { backgroundColor: listCardBg, borderColor: listCardBorder }]}
            onPress={showComingSoonToast}
            activeOpacity={0.75}
          >
            <AppText weight={SEMI_BOLD} style={{ color: textColor, fontSize: 14 }}>
              Suggestions
            </AppText>
            <ChevronRight color={muted} size={20} />
          </TouchableOpacity>

          <View style={[styles.listItem, { backgroundColor: listCardBg, borderColor: listCardBorder }]}>
            <AppText weight={SEMI_BOLD} style={{ color: textColor, fontSize: 14 }}>
              Product Changelog
            </AppText>
            <ToggleSwitch
              value={productChangelog}
              onValueChange={setProductChangelog}
              isDark={isDark}
              activeColor={CYAN}
            />
          </View>

          <TouchableOpacity
            style={[styles.listItem, { backgroundColor: listCardBg, borderColor: listCardBorder }]}
            onPress={() => NavigationService.navigate("Support")}
            activeOpacity={0.75}
          >
            <AppText weight={SEMI_BOLD} style={{ color: textColor, fontSize: 14 }}>
              Customer Support
            </AppText>
            <ChevronRight color={muted} size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.listItem, { backgroundColor: listCardBg, borderColor: listCardBorder }]}
            onPress={() => NavigationService.navigate("Support")}
            activeOpacity={0.75}
          >
            <AppText weight={SEMI_BOLD} style={{ color: textColor, fontSize: 14 }}>
              Help Center
            </AppText>
            <ChevronRight color={muted} size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.listItem, { backgroundColor: listCardBg, borderColor: listCardBorder }]}
            onPress={showComingSoonToast}
            activeOpacity={0.75}
          >
            <AppText weight={SEMI_BOLD} style={{ color: textColor, fontSize: 14 }}>
              About
            </AppText>
            <ChevronRight color={muted} size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.listItem, { backgroundColor: listCardBg, borderColor: listCardBorder }]}
            onPress={showComingSoonToast}
            activeOpacity={0.75}
          >
            <AppText weight={SEMI_BOLD} style={{ color: textColor, fontSize: 14 }}>
              Select Server
            </AppText>
            <AppText weight={SEMI_BOLD} style={{ color: CYAN, fontSize: 14 }}>
              Auto Select
            </AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showAllServicesModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAllServicesModal(false)}
      >
        <View style={styles.allServicesModalRoot}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowAllServicesModal(false)}
          />
          <View
            style={[
              styles.allServicesCard,
              {
                backgroundColor: themeColors.background,
                borderColor: themeColors.border,
                zIndex: 2,
                alignSelf: "center",
                width: "100%",
                maxWidth: 400,
              },
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
                  NavigationService.navigate(ACCOUNT_SCREEN);
                }}
              >
                <FastImage source={logoutIcon} style={{ width: 18, height: 18 }} resizeMode="contain" tintColor="#C62828" />
                <AppText type={THIRTEEN} weight={SEMI_BOLD} style={{ marginLeft: 12, color: "#C62828", flex: 1 }}>
                  Account / Logout
                </AppText>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <DepositChoiceSheet sheetRef={depositChoiceSheetRef} isDark={isDark} />
      <WithdrawChoiceSheet sheetRef={withdrawChoiceSheetRef} isDark={isDark} />
    </View>
  );
};

export default ProfileDrawer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: screenWidth,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 10 : 12,
    paddingBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    marginLeft: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  userInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 24,
    marginTop: 4,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  avatarImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  userDetails: {
    flex: 1,
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  checkCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: CYAN,
    alignItems: "center",
    justifyContent: "center",
  },
  uidRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  referralBanner: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
    alignItems: "center",
    height: 85,
    position: "relative",
    overflow: "visible",
  },
  referralContent: {
    flex: 1,
    paddingRight: 10,
  },
  referralImagePlaceholder: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  referralArt: {
    width: 180,
    height: 160,
    position: "absolute",
    right: -10,
    bottom: -25,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: 10,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1.5,
  },
  gridItem: {
    width: "25%",
    alignItems: "center",
    marginBottom: 20,
  },
  gridIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  listSection: {
    paddingHorizontal: 16,
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
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
