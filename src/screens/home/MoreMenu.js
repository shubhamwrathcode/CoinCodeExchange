import { Linking, TouchableOpacity, View, StyleSheet } from "react-native";
import {
  AppSafeAreaView,
  AppText,
  BLACK,
  SEMI_BOLD,
  FOURTEEN,
  THIRTEEN,
  ELEVEN,
} from "../../shared";
import KeyBoardAware from "../../shared/components/KeyboardAware";
import FastImage from "react-native-fast-image";
import {
  alarm,
  arbitary,
  back_ic,
  bell_ic,
  blogIcon,
  cardCoinIcon,
  contact_ic,
  convertIcon,
  currencyPreferIcon,
  depositIcon,
  helpicon,
  kycixon,
  lock,
  memeXProfile,
  memeXProfileDark,
  memexDarkIcon,
  memexIcon,
  myHelpIcon,
  newContactICon,
  newDepositDarkIcon,
  newDepositIcon,
  newHelpIcon,
  newHubIcon,
  newReferalIcon,
  newWalletIcon,
  newWidthrawDarkIcon,
  newWidthrawIcon,
  referralIcon,
  spotDarkIcon,
  spotIcon,
  stakingDrawer,
  stakingDrawerDark,
  stakCalculatorIcon,
  swap,
  transferDarkIcon,
  transferIcon,
  walletDrawerDark,
  walletIcon,
  defaultPic,
  INFERNAL_TRANSFER_Light,
  INFERNAL_TRANSFER,
  spotIconLight,
  newHubIconLight,
  alarmDark,
  lockLight,
  kycixonLight,
  swapLight,
  helpiconLight,
  currencyPreferLight,
  launchpadDark,
  launchpadImage,
  profileDark,
  spotBottomLight,
  spotBottomDark,
  spotActiveIcon,
  spotlightfinalbottomtab,
  spotdarkfinalbottomtab,
  spotMenuIcon,
  launchpadLight,
  profileLight,
  spotTradingMenu,
} from "../../helper/ImageAssets";
import { colors } from "../../theme/colors";
import NavigationService from "../../navigation/NavigationService";
import TouchableOpacityView from "../../shared/components/TouchableOpacityView";
import {
  ACCOUNT_SCREEN,
  ARBITORY_SCREEN,
  CONVERT_SCREEN,
  CURRENCY_PREFERENCE_SCREEN,
  DEPOSIT_COIN_SCREEN,
  EARING_SCREEN,
  INVITE_AND_EARN_SCREEN,
  KYC_STATUS_SCREEN,
  MARKET_SCREEN,
  NOTIFICATION_SCREEN,
  OPTIONS_SCREEN,
  SETTING_SCREEN_New,
  MARGIN_TRANSFER_SCREEN,
  WALLET_SCREEN,
  WALLET_WITHDRAW_SCREEN,
} from "../../navigation/routes";

import { useTheme } from "../../hooks/useTheme";


const MoreMenu = () => {
  const { colors: themeColors, isDark } = useTheme();

  const openWenView = (url, name) => {
    NavigationService.navigate("WebLink", { data: url, title: name });
  };

  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background, flex: 1 }}>
      <KeyBoardAware style={{ paddingHorizontal: 20, paddingTop: "4%" }}>
        <TouchableOpacity onPress={() => NavigationService.goBack()}>
          <FastImage
            source={back_ic}
            resizeMode="contain"
            style={{ width: 20, height: 20 }}
            tintColor={themeColors.text}
          />
        </TouchableOpacity>
        <View style={{ marginTop: 30 }}>
          <AppText color={themeColors.text} weight={SEMI_BOLD} type={ELEVEN}>
            Assets
          </AppText>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 10,
              // gap:25
            }}
          >
            <TouchableOpacity
              style={{ alignItems: "center" }}
              onPress={() => NavigationService.navigate(DEPOSIT_COIN_SCREEN)}
            >
              <View style={[styles.iconBox, { backgroundColor: isDark ? themeColors.input : "#F0F3F6" }]}>
                <FastImage
                  source={isDark ? newDepositDarkIcon : newDepositIcon}
                  resizeMode="contain"
                  style={styles.menuIcon}
                />
              </View>
              <AppText color={themeColors.text} style={{ marginTop: 5 }} type={ELEVEN}>
                Deposit
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ alignItems: "center" }}
              onPress={() => NavigationService.navigate(WALLET_WITHDRAW_SCREEN)}
            >
              <View style={[styles.iconBox, { backgroundColor: isDark ? themeColors.input : "#F0F3F6" }]}>
                <FastImage
                  source={isDark ? newWidthrawDarkIcon : newWidthrawIcon}
                  resizeMode="contain"
                  style={styles.menuIcon}
                />
              </View>
              <AppText color={themeColors.text} style={{ marginTop: 5 }} type={ELEVEN}>
                Withdraw
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ alignItems: "center" }}
              onPress={() => NavigationService.navigate(EARING_SCREEN)}
            >
              <View style={[styles.iconBox, { backgroundColor: isDark ? themeColors.input : "#F0F3F6" }]}>
                <FastImage
                  source={!isDark ? walletDrawerDark : walletIcon}
                  resizeMode="contain"
                  style={[styles.menuIcon, {}]}
                />
              </View>
              <AppText color={themeColors.text} style={{ marginTop: 5 }} type={ELEVEN}>
                Wallet
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ alignItems: "center" }}
              onPress={() => NavigationService.navigate(MARGIN_TRANSFER_SCREEN)}
            >
              <View style={[styles.iconBox, { backgroundColor: isDark ? themeColors.input : "#F0F3F6" }]}>
                <FastImage
                  source={!isDark ? INFERNAL_TRANSFER_Light : INFERNAL_TRANSFER}
                  resizeMode="contain"
                  style={styles.menuIcon}
                // tintColor={isDark ? colors.white : colors.black}
                />
              </View>
              <AppText color={themeColors.text} style={{ marginTop: 5 }} type={ELEVEN}>
                Transfer
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ marginTop: 30 }}>
          <AppText color={themeColors.text} weight={SEMI_BOLD} type={ELEVEN}>
            Trade
          </AppText>
          <View
            style={{
              flexDirection: "row",
              // justifyContent: "space-around",
              marginTop: 10,
              gap: 60,
            }}
          >
            <TouchableOpacity
              style={{ alignItems: "center" }}
              onPress={() =>
                NavigationService.navigate(MARKET_SCREEN, { tab: "memex" })
              }
            >
              <View style={[styles.iconBox, { backgroundColor: isDark ? themeColors.input : "#F0F3F6" }]}>
                <FastImage
                  source={isDark ? memeXProfileDark : memeXProfile}
                  resizeMode="contain"
                  style={styles.menuIcon}
                />
              </View>
              <AppText color={themeColors.text} style={{ marginTop: 5 }} type={ELEVEN}>
                MemeX
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ alignItems: "center" }}
              onPress={() => NavigationService.navigate(WALLET_SCREEN)}
            >
              <View style={[styles.iconBox, { backgroundColor: isDark ? themeColors.input : "#F0F3F6" }]}>
                <FastImage
                  source={isDark ? spotTradingMenu : spotBottomDark}
                  resizeMode="contain"
                  style={styles.menuIcon}
                />
              </View>
              <AppText
                color={themeColors.text}
                style={{ marginTop: 5, textAlign: "center" }}
                type={ELEVEN}
              >
                Spot Trading
              </AppText>
            </TouchableOpacity>
            {/* <TouchableOpacity
              style={{ alignItems: "center" }}
              onPress={() => NavigationService.navigate(OPTIONS_SCREEN)}
            >
              <FastImage
                source={arbitary}
                resizeMode="contain"
                style={{ width: 34, height: 34 }}
                //tintColor={colors.buttonBg}
              />
              <AppText color={BLACK} style={{ marginTop: 5 }} type={ELEVEN}>
                Options
              </AppText>
            </TouchableOpacity> */}
            <TouchableOpacityView
              style={{ alignItems: "center" }}
              onPress={() => NavigationService.navigate(CONVERT_SCREEN)}
            >
              <View style={[styles.iconBox, { backgroundColor: isDark ? themeColors.input : "#F0F3F6" }]}>
                <FastImage
                  source={isDark ? swapLight : swap}
                  // tintColor={isDark ? colors.white : colors.black}
                  resizeMode="contain"
                  style={styles.menuIcon}
                />
              </View>
              <AppText color={themeColors.text} style={{ marginTop: 5 }} type={ELEVEN}>
                Swap
              </AppText>
            </TouchableOpacityView>
          </View>
        </View>
        <View style={{ marginTop: 30 }}>
          <AppText color={themeColors.text} weight={SEMI_BOLD} type={ELEVEN}>
            Earn
          </AppText>
          <View style={{ flexDirection: "row", marginTop: 10, gap: 70 }}>
            <TouchableOpacity
              style={{ alignItems: "center" }}
              onPress={() => NavigationService.navigate(ACCOUNT_SCREEN)}
            >
              <View style={[styles.iconBox, { backgroundColor: isDark ? themeColors.input : "#F0F3F6" }]}>
                <FastImage
                  source={isDark ? stakingDrawerDark : stakingDrawer}
                  resizeMode="contain"
                  style={styles.menuIcon}
                />
              </View>
              <AppText color={themeColors.text} style={{ marginTop: 5 }} type={ELEVEN}>
                Staking
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ alignItems: "center" }}
              onPress={() => NavigationService.navigate(INVITE_AND_EARN_SCREEN)}
            >
              <View style={[styles.iconBox, { backgroundColor: isDark ? themeColors.input : "#F0F3F6" }]}>
                <FastImage
                  source={isDark ? newHubIcon : newHubIconLight}
                  resizeMode="contain"
                  style={styles.menuIcon}
                />
              </View>
              <AppText color={themeColors.text} style={{ marginTop: 5 }} type={ELEVEN}>
                Referral{"\n"}Reward
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ alignItems: "center" }}
              onPress={() => NavigationService.navigate("Launchpad")}
            >
              <View style={[styles.iconBox, { backgroundColor: isDark ? themeColors.input : "#F0F3F6" }]}>
                <FastImage
                  source={!isDark ? launchpadDark : launchpadLight}
                  resizeMode="contain"
                  style={styles.menuIcon}

                />
              </View>
              <AppText color={themeColors.text} style={{ marginTop: 5 }} type={ELEVEN}>
                Launchpad
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ marginTop: 30 }}>
          <AppText color={themeColors.text} weight={SEMI_BOLD} type={ELEVEN}>
            Personalized
          </AppText>
          <View style={{ flexDirection: "row", marginTop: 10, gap: 67 }}>
            <TouchableOpacity
              style={{ alignItems: "center" }}
              onPress={() => NavigationService.navigate(SETTING_SCREEN_New)}
            >
              <View style={[styles.iconBox, { backgroundColor: isDark ? themeColors.input : "#F0F3F6" }]}>
                <FastImage
                  source={!isDark ? profileDark : profileLight}
                  resizeMode="contain"
                  style={[styles.menuIcon, { width: 30, height: 30 }]}
                />
              </View>
              <AppText
                color={themeColors.text}
                style={{ marginTop: 5, textAlign: "center" }}
                type={ELEVEN}
              >
                Profile
              </AppText>
            </TouchableOpacity>
            <View style={{ alignItems: "center" }}>
              <View style={[styles.iconBox, { backgroundColor: isDark ? themeColors.input : "#F0F3F6" }]}>
                <FastImage
                  source={!isDark ? currencyPreferLight : currencyPreferIcon}
                  resizeMode="contain"
                  style={styles.menuIcon}
                // tintColor={isDark ? undefined : themeColors.text}
                />
              </View>
              <AppText
                color={themeColors.text}
                style={{ marginTop: 5, textAlign: "center" }}
                type={ELEVEN}
                onPress={() =>
                  NavigationService.navigate(CURRENCY_PREFERENCE_SCREEN)
                }
              >
                Currency{"\n"} Preference
              </AppText>
            </View>
          </View>
        </View>
        <View style={{ marginTop: 30 }}>
          <AppText color={themeColors.text} weight={SEMI_BOLD} type={ELEVEN}>
            Learn & Support
          </AppText>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 10,
              // gap:25
            }}
          >
            <TouchableOpacity
              style={{ alignItems: "center" }}
              onPress={() => NavigationService.navigate(NOTIFICATION_SCREEN)}
            >
              <View style={[styles.iconBox, { backgroundColor: isDark ? themeColors.input : "#F0F3F6" }]}>
                <FastImage
                  source={isDark ? alarmDark : alarm}
                  resizeMode="contain"
                  style={styles.menuIcon}
                />
              </View>
              <AppText color={themeColors.text} style={{ marginTop: 5 }} type={ELEVEN}>
                Notification
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ alignItems: "center" }}
              onPress={() => NavigationService.navigate(KYC_STATUS_SCREEN)}
            >
              <View style={[styles.iconBox, { backgroundColor: isDark ? themeColors.input : "#F0F3F6" }]}>
                <FastImage
                  source={!isDark ? kycixonLight : kycixon}
                  resizeMode="contain"
                  style={styles.menuIcon}
                />
              </View>
              <AppText color={themeColors.text} style={{ marginTop: 5 }} type={ELEVEN}>
                KYC
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ alignItems: "center" }}
              onPress={() =>
                NavigationService.navigate(ACCOUNT_SCREEN)
              }
            >
              <View style={[styles.iconBox, { backgroundColor: isDark ? themeColors.input : "#F0F3F6" }]}>
                <FastImage
                  source={!isDark ? lockLight : lock}
                  resizeMode="contain"
                  style={styles.menuIcon}
                />
              </View>
              <AppText color={themeColors.text} style={{ marginTop: 5 }} type={ELEVEN}>
                Security
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => NavigationService.navigate("Support")}
              style={{ alignItems: "center" }}
            >
              <View style={[styles.iconBox, { backgroundColor: isDark ? themeColors.input : "#F0F3F6" }]}>
                <FastImage
                  source={!isDark ? helpiconLight : helpicon}
                  resizeMode="contain"
                  style={styles.menuIcon}
                />
              </View>
              <AppText color={themeColors.text} style={{ marginTop: 5 }} type={ELEVEN}>
                Contact Us
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </KeyBoardAware>
    </AppSafeAreaView>
  );
};

export default MoreMenu;

const styles = StyleSheet.create({
  iconBox: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 5,
  },
  menuIcon: {
    width: 24,
    height: 24,
  }
});
