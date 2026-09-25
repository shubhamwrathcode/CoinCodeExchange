import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Text,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FastImage from "react-native-fast-image";
import LinearGradient from "react-native-linear-gradient";
import { Gift, Search } from "lucide-react-native";
import Toast from "react-native-simple-toast";
import { AppText, SEMI_BOLD } from "../../shared";
import NavigationService from "../../navigation/NavigationService";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import DepositChoiceSheet from "../wallet/sheets/DepositChoiceSheet";
import WithdrawChoiceSheet from "../wallet/sheets/WithdrawChoiceSheet";
import { appOperation } from "../../appOperation";
import { CHART_WEB_BASE_URL } from "../../helper/Constants";
import {
  BUY_CRYPTO_SCREEN,
  FUTURES_SCREEN,
  LAUNCHPAD_SCREEN,
  NAVIGATION_BOTTOM_TAB_STACK,
  NOTIFICATION_SCREEN,
  REFER_AND_EARN_SCREEN,
  SOFT_STAKING_SCREEN,
  TRADE_SCREEN,
  VIP_SERVICES_SCREEN,
} from "../../navigation/routes";
import {
  announcementIcon,
  buyCryptoIcon,
  futureIcon,
  helpCenterIcon,
  launchpadIcon,
  moreSvcMarginIcon,
  moreSvcReferIcon,
  moreSvcSpotIcon,
  profileBackButtonImg,
  profileConvertIcon,
  profileDepositIcon,
  profileInviteFriendsIcon,
  profileWithdrawalIcon,
  softStakingIcon,
  vipIcon,
  vipServicesIcon,
} from "../../helper/ImageAssets";

const CYAN = colors.cyanTheme || "#0AA8C5";

const pickReferralCode = (payload) => {
  if (payload == null) return "";
  if (typeof payload === "string" || typeof payload === "number") return String(payload).trim();
  if (typeof payload !== "object") return "";

  const fromData =
    payload?.data?.refer_code ||
    payload?.data?.user_code ||
    payload?.data?.referral_code ||
    payload?.data?.referCode ||
    payload?.data?.code;
  if (fromData) return String(fromData).trim();

  const nested = payload.data ?? payload.result ?? payload;
  if (typeof nested === "string" || typeof nested === "number") return String(nested).trim();
  if (typeof nested !== "object" || nested == null) return "";
  return String(
    nested.refer_code ||
      nested.user_code ||
      nested.referral_code ||
      nested.referCode ||
      nested.code ||
      nested.refferal_code ||
      nested.user_refer_code ||
      ""
  ).trim();
};

const MoreServicesScreen = () => {
  const insets = useSafeAreaInsets();
  const { colors: themeColors, isDark } = useTheme();
  const [activeFilter, setActiveFilter] = useState("Recommended");
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteSharing, setInviteSharing] = useState(false);

  const filters = ["Recommended", "Buy Crypto", "Trade", "Earn"];

  const muted = isDark ? "#8E8E93" : themeColors.secondaryText;
  const textColor = themeColors.text;
  const cardBg = isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.03)";
  const cardBorder = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)";
  const iconBoxBg = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)";
  const searchBg = isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)";

  const goSpotMargin = () =>
    NavigationService.navigate(NAVIGATION_BOTTOM_TAB_STACK, {
      screen: TRADE_SCREEN,
      params: { activeTab: "Margin" },
    });

  const goSpot = () =>
    NavigationService.navigate(NAVIGATION_BOTTOM_TAB_STACK, { screen: TRADE_SCREEN });

  const depositChoiceSheetRef = useRef(null);
  const withdrawChoiceSheetRef = useRef(null);

  const handleOpenDeposit = useCallback(() => {
    depositChoiceSheetRef.current?.open?.();
  }, []);

  const handleOpenWithdraw = useCallback(() => {
    withdrawChoiceSheetRef.current?.open?.();
  }, []);

  const handleInviteFriends = useCallback(async () => {
    if (inviteSharing) return;
    setInviteSharing(true);
    try {
      const codeRes = await appOperation.customer.user_refer_code();
      const code = codeRes?.success ? pickReferralCode(codeRes) : "";
      if (!code) {
        Toast.showWithGravity("Referral link not available", Toast.SHORT, Toast.BOTTOM);
        return;
      }
      const baseWebUrl = CHART_WEB_BASE_URL.replace(/\/$/, "");
      const referralLink = `${baseWebUrl}/signup?referral_code=${code}`;
      await Share.share({
        message: `Join Coincode using my referral link!\n${referralLink}`,
      });
    } catch (error) {
      Toast.showWithGravity(error?.message || "Unable to share referral link", Toast.SHORT, Toast.BOTTOM);
    } finally {
      setInviteSharing(false);
    }
  }, [inviteSharing]);

  const sections = useMemo(
    () => [
      {
        key: "favourites",
        title: "My Favourites",
        // hasEdit: true,
        filter: "Recommended",
        hideTitles: true,
        data: [
          {
            title: "Spot",
            image: moreSvcSpotIcon,
            onPress: goSpot,
          },
          {
            title: "Convert",
            image: profileConvertIcon,
            onPress: () => NavigationService.navigate(BUY_CRYPTO_SCREEN),
          },
          { title: "Margin", image: moreSvcMarginIcon, onPress: goSpotMargin },
        ],
      },
      {
        key: "buy",
        title: "Buy Crypto",
        filter: "Buy Crypto",
        data: [
          {
            title: "Buy Crypto",
            image: buyCryptoIcon,
            onPress: () => NavigationService.navigate(BUY_CRYPTO_SCREEN),
          },
          {
            title: "Deposit",
            image: profileDepositIcon,
            onPress: handleOpenDeposit,
          },
          {
            title: "Withdrawal",
            image: profileWithdrawalIcon,
            onPress: handleOpenWithdraw,
          },
        ],
      },
      {
        key: "trade",
        title: "Trade",
        filter: "Trade",
        data: [
          {
            title: "Spot",
            image: moreSvcSpotIcon,
            onPress: goSpot,
          },
          { title: "Margin", image: moreSvcMarginIcon, onPress: goSpotMargin },
          {
            title: "Convert",
            image: profileConvertIcon,
            onPress: () => NavigationService.navigate(BUY_CRYPTO_SCREEN),
          },
          {
            title: "USD-M",
            image: futureIcon,
            onPress: () => NavigationService.navigate(FUTURES_SCREEN),
          },
          // { title: "Copy Trading", image: profileCopyTradeIcon, onPress: showComingSoon },
          // { title: "OTC Desk", image: otpDeskIcon, onPress: showComingSoon },
          // { title: "Bots", image: botIcon, onPress: showComingSoon },
        ],
      },
      // {
      //   key: "futures",
      //   title: "Futures",
      //   filter: "Futures",
      //   data: [
      //     // { title: "USD-M", image: futureIcon, onPress: () => NavigationService.navigate(FUTURES_SCREEN) },
      //     { title: "Coin-M", image: coinMIcon, onPress: showComingSoon },
      //     { title: "Options", image: optionTradeIcon, onPress: showComingSoon },
      //   ],
      // },
      {
        key: "earn",
        title: "Earn",
        filter: "Earn",
        data: [
          {
            title: "Launchpad",
            image: launchpadIcon,
            onPress: () => NavigationService.navigate(LAUNCHPAD_SCREEN),
          },
          {
            title: "Refer & Earn",
            image: moreSvcReferIcon,
            onPress: () => NavigationService.navigate(REFER_AND_EARN_SCREEN),
          },
          {
            title: "VIP",
            image: vipIcon,
            onPress: () => NavigationService.navigate(VIP_SERVICES_SCREEN),
          },
          // { title: "Simple Earn", image: simpleEarnIcon, onPress: showComingSoon },
          {
            title: "Soft Staking",
            image: softStakingIcon,
            onPress: () => NavigationService.navigate(SOFT_STAKING_SCREEN),
          },
        ],
      },
      {
        key: "more",
        title: "More",
        filter: "Recommended",
        data: [
          {
            title: "Announcements",
            image: announcementIcon,
            onPress: () => NavigationService.navigate(NOTIFICATION_SCREEN),
          },
          {
            title: "Referral",
            image: moreSvcReferIcon,
            onPress: () => NavigationService.navigate(REFER_AND_EARN_SCREEN),
          },
          // { title: "Affiliate Program", image: affilateIcon, onPress: showComingSoon },
          // { title: "Proof of Reserves", image: proofOfReserveIcon, onPress: showComingSoon },
          {
            title: "VIP Services",
            image: vipServicesIcon,
            onPress: () => NavigationService.navigate(VIP_SERVICES_SCREEN),
          },
          {
            title: "Help Center",
            image: helpCenterIcon,
            onPress: () => NavigationService.navigate("Support"),
          },
          // { title: "Blogs", image: moreSvcBlogIcon, onPress: showComingSoon },
          // { title: "Partners", image: partnersIcon, onPress: showComingSoon },
        ],
      },
      // {
      //   key: "square",
      //   title: "Square",
      //   filter: "Recommended",
      //   data: [
      //     { title: "Square", image: squareIcon, onPress: showComingSoon },
      //     { title: "Chat", image: chatIcon, onPress: showComingSoon },
      //     {
      //       title: "News",
      //       image: newsIcon1,
      //       onPress: () => NavigationService.navigate(NOTIFICATION_SCREEN),
      //     },
      //   ],
      // },
    ],
    [handleOpenDeposit, handleOpenWithdraw]
  );

  const q = searchQuery.trim().toLowerCase();

  const visibleSections = sections
    .map((section) => {
      let data = section.data;
      if (q) {
        data = data.filter((item) => item.title.toLowerCase().includes(q));
        if (!data.length) return null;
      }
      return { ...section, data };
    })
    .filter(Boolean);

  const renderServiceItem = (item, hideTitle = false) => (
    <TouchableOpacity
      key={item.title}
      style={styles.serviceItem}
      onPress={item.onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.iconBox, { backgroundColor: iconBoxBg }]}>
        <FastImage source={item.image} style={{ width: 22, height: 22 }} resizeMode="contain" />
      </View>
      {!hideTitle && (
        <AppText
          style={{ color: muted, fontSize: 11, marginTop: 10, textAlign: "center" }}
          numberOfLines={2}
        >
          {item.title}
        </AppText>
      )}
    </TouchableOpacity>
  );

  const renderSection = (section) => (
    <View
      key={section.key}
      style={[styles.sectionWrapper, { backgroundColor: cardBg, borderColor: cardBorder }]}
    >
      <View style={styles.sectionHeader}>
        <AppText weight={SEMI_BOLD} style={{ color: textColor, fontSize: 14 }}>
          {section.title}
        </AppText>
        {/* {section.hasEdit && (
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: CYAN }]}
            onPress={showComingSoon}
            activeOpacity={0.8}
          >
            <Edit3 color="#FFFFFF" size={10} style={{ marginRight: 4 }} />
            <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "700" }}>Edit</Text>
          </TouchableOpacity>
        )} */}
      </View>
      <View style={styles.gridContainer}>
        {section.data.map((item) => renderServiceItem(item, section.hideTitles))}
      </View>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: themeColors.background, paddingTop: insets.top },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => NavigationService.goBack()} hitSlop={12}>
          <FastImage
            source={profileBackButtonImg}
            style={{ width: 35, height: 35 }}
            resizeMode="contain"
            tintColor={isDark ? undefined : textColor}
          />
        </TouchableOpacity>
        <AppText weight={SEMI_BOLD} style={{ color: textColor, fontSize: 16 }}>
          Services
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: searchBg, borderColor: cardBorder }]}>
          <Search color={muted} size={16} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search Coins"
            placeholderTextColor={muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: textColor }]}
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {visibleSections.filter((s) => s.key === "favourites").map(renderSection)}

        {/* <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterPill,
                {
                  backgroundColor: activeFilter === f ? CYAN : iconBoxBg,
                },
              ]}
              onPress={() => setActiveFilter(f)}
              activeOpacity={0.8}
            >
              <AppText
                style={{
                  color: activeFilter === f ? "#FFFFFF" : muted,
                  fontSize: 12,
                }}
              >
                {f}
              </AppText>
            </TouchableOpacity>
          ))}
        </ScrollView> */}

        <View style={styles.bannersRow}>
          <TouchableOpacity
            style={[styles.bannerBox, { backgroundColor: cardBg, borderColor: cardBorder }]}
            onPress={() => NavigationService.navigate(REFER_AND_EARN_SCREEN)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["rgba(0, 255, 255, 0.15)", "rgba(255, 255, 255, 0.0)"]}
              start={{ x: 0, y: 3 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.bannerIconWrapper, { backgroundColor: "rgba(0, 255, 255, 0.1)" }]}>
              <Gift color={CYAN} size={16} />
            </View>
            <View>
              <AppText weight={SEMI_BOLD} style={{ color: textColor, fontSize: 12 }}>
                Rewards Hub
              </AppText>
              <AppText style={{ color: muted, fontSize: 10, marginTop: 2 }}>Earn More</AppText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bannerBox, { backgroundColor: cardBg, borderColor: cardBorder }]}
            onPress={handleInviteFriends}
            activeOpacity={0.85}
            disabled={inviteSharing}
          >
            <LinearGradient
              colors={["rgba(0, 255, 255, 0.15)", "rgba(255, 255, 255, 0.0)"]}
              start={{ x: 0, y: 3 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.bannerIconWrapper, { backgroundColor: "rgba(0, 255, 255, 0.1)" }]}>
              <FastImage
                source={profileInviteFriendsIcon}
                style={{ width: 16, height: 16 }}
                resizeMode="contain"
              />
            </View>
            <View>
              <AppText weight={SEMI_BOLD} style={{ color: textColor, fontSize: 12 }}>
                Invite Friends
              </AppText>
              <AppText style={{ color: muted, fontSize: 10, marginTop: 2 }}>Earn Together</AppText>
            </View>
          </TouchableOpacity>
        </View>

        {visibleSections.filter((s) => s.key !== "favourites").map(renderSection)}
      </ScrollView>

      <DepositChoiceSheet sheetRef={depositChoiceSheetRef} isDark={isDark} />
      <WithdrawChoiceSheet sheetRef={withdrawChoiceSheetRef} isDark={isDark} />
    </View>
  );
};

export default MoreServicesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 14,
    padding: 0,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionWrapper: {
    marginBottom: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    paddingTop: 16,
    paddingBottom: 4,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 4,
  },
  serviceItem: {
    width: "25%",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  filtersScroll: {
    paddingHorizontal: 16,
    marginBottom: 24,
    flexGrow: 0,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  bannersRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    justifyContent: "space-between",
    marginBottom: 24,
  },
  bannerBox: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    overflow: "hidden",
  },
  bannerIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
});
