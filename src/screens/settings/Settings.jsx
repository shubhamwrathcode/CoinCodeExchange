import {
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  Clipboard,
  Dimensions,
} from "react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  back_ic,
  editIcon,
  editImageIcon,
  copyIcon,
  eye_close,
  right_ic,
  kyc_ic,
  lock_ic,
  twitterIcon,
  defaultPic,
  logoutIcon,
  tetherIcon,
  bitcoinIcon,
  bnbIcon,
  trade_ic,
  lock,
  KEY_ICON,
} from "../../helper/ImageAssets";

import ImageCropPicker from "react-native-image-crop-picker";
import {
  AppSafeAreaView,
  AppText,
  SEMI_BOLD,
  SIXTEEN,
  FOURTEEN,
  TEN,
  ELEVEN,
  WHITE,
  PictureModal,
} from "../../shared";
import NavigationService from "../../navigation/NavigationService";
import { colors } from "../../theme/colors";
import FastImage from "react-native-fast-image";
import { useAppSelector } from "../../store/hooks";
import { useDispatch } from "react-redux";
import { changeCurrencyPreference, editUserAvatar, getUserProfile, getAntiPhishingStatus } from "../../actions/accountActions";
import { IMAGE_BASE_URL } from "../../helper/Constants";
import { SpinnerSecond } from "../../shared/components/SpinnerSecond";
import ShimmerBone from "../../shared/components/ShimmerBone";
import RBSheet from "react-native-raw-bottom-sheet";
import ChangeEmail from "../../shared/components/ChangeEmail";
import ChangePhone from "../../shared/components/ChangePhone";
import NameDetails from "../../shared/components/NameDetails";
import { showSuccess } from "../../helper/utility";
import { logout } from "../../actions/authActions";
import { ANTI_PHISHING_CODE_SCREEN, CHANGE_PASSWORD_SCREEN } from "../../navigation/routes";
import { useTheme } from "../../hooks/useTheme";

const SETTINGS_PAD = 16;
const SETTINGS_INNER_W = Dimensions.get("window").width - SETTINGS_PAD * 2;

const SettingsScreenSkeleton = () => {
  const { colors: themeColors } = useTheme();
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.webStyleCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        <ShimmerBone width={120} height={18} borderRadius={6} style={{ marginBottom: 10 }} />
        <ShimmerBone width={SETTINGS_INNER_W - 32} height={12} borderRadius={4} style={{ marginBottom: 16 }} />
        <View style={[styles.profileInnerContent, { borderColor: themeColors.border }]}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <ShimmerBone width={18} height={18} borderRadius={4} />
            <ShimmerBone width={140} height={15} borderRadius={5} style={{ marginLeft: 10 }} />
          </View>
          <ShimmerBone width="92%" height={11} borderRadius={4} style={{ marginTop: 14 }} />
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 16 }}>
            <ShimmerBone width={32} height={32} borderRadius={16} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <ShimmerBone width="55%" height={15} borderRadius={5} style={{ marginBottom: 6 }} />
              <ShimmerBone width="35%" height={11} borderRadius={4} />
            </View>
          </View>
          <ShimmerBone width="100%" height={44} borderRadius={22} style={{ marginTop: 20 }} />
        </View>
      </View>

      <View style={[styles.webStyleCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        <ShimmerBone width={180} height={18} borderRadius={6} style={{ marginBottom: 10 }} />
        <ShimmerBone width="88%" height={12} borderRadius={4} style={{ marginBottom: 16 }} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          {[1, 2, 3].map((k) => (
            <View key={k} style={{ flex: 1, aspectRatio: 1, justifyContent: "center", alignItems: "center" }}>
              <ShimmerBone width={28} height={28} borderRadius={8} style={{ marginBottom: 10 }} />
              <ShimmerBone width="80%" height={10} borderRadius={4} />
            </View>
          ))}
        </View>
        <ShimmerBone width="100%" height={44} borderRadius={22} style={{ marginTop: 20 }} />
      </View>

      <View style={[styles.webStyleCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        <ShimmerBone width={160} height={18} borderRadius={6} style={{ marginBottom: 10 }} />
        <ShimmerBone width="90%" height={12} borderRadius={4} style={{ marginBottom: 18 }} />
        {[1, 2].map((k) => (
          <View
            key={k}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: k === 1 ? 18 : 0,
              paddingBottom: k === 1 ? 15 : 0,
              borderBottomWidth: k === 1 ? 1 : 0,
              borderBottomColor: themeColors.border,
            }}
          >
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
              <ShimmerBone width={18} height={18} borderRadius={4} />
              <View style={{ marginLeft: 15, flex: 1 }}>
                <ShimmerBone width="50%" height={14} borderRadius={5} style={{ marginBottom: 8 }} />
                <ShimmerBone width="92%" height={10} borderRadius={4} style={{ marginBottom: 4 }} />
                <ShimmerBone width="75%" height={10} borderRadius={4} />
              </View>
            </View>
            <ShimmerBone width={72} height={28} borderRadius={14} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const SettingsScreen = () => {
  const dispatch = useDispatch();
  const { colors: themeColors, isDark, theme } = useTheme();
  const changeName = useRef();
  const changeEmail = useRef();
  const changePhone = useRef();
  const userData = useAppSelector((state) => state.auth.userData);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [countryCode, setCountryCode] = useState(["91"]);
  const [country, setCountry] = useState("IN");
  const [isVisible, setIsVisible] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [hideRegisterInfo, setHideRegisterInfo] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState('USDT');
  const [hasAntiPhishingCode, setHasAntiPhishingCode] = useState(false);
  const [settingsScreenLoading, setSettingsScreenLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setSettingsScreenLoading(true);
      (async () => {
        try {
          await dispatch(getUserProfile(false, false, true));
          const data = await dispatch(getAntiPhishingStatus());
          if (!cancelled && data != null) {
            setHasAntiPhishingCode(!!data.hasAntiPhishingCode);
          }
        } finally {
          if (!cancelled) {
            setSettingsScreenLoading(false);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [dispatch])
  );

  useEffect(() => {
    if (userData?.currency_prefrence) {
      setSelectedCurrency(userData.currency_prefrence);
    }
  }, [userData?.currency_prefrence]);

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleSaveCurrency = () => {
    dispatch(changeCurrencyPreference({ currency: selectedCurrency }));
  };

  const handleEditProfile = () => {
    setFirstName(userData?.firstName || "");
    setLastName(userData?.lastName || "");
    changeName?.current?.open();
  };

  const getKycStatus = (status) => {
    switch (status) {
      case 2: return "Verified";
      case 1: return "Pending";
      case 3: return "Rejected";
      default: return "Unverified";
    }
  };

  const onPressCamera = () => {
    ImageCropPicker.openCamera({
      multiple: false,
      mediaType: "photo",
      cropping: true,
      compressImageQuality: 1,
    }).then((image) => {
      uploadProfilePic(image);
    }).catch((error) => console.log(error));
  };

  const onPressGallery = () => {
    ImageCropPicker.openPicker({
      multiple: false,
      mediaType: "photo",
      cropping: true,
      compressImageQuality: 1,
    }).then((image) => {
      uploadProfilePic(image);
    }).catch((error) => console.log(error));
  };

  const uploadProfilePic = (image) => {
    if (image?.size < 5000000 && ["image/png", "image/jpeg", "image/jpg"].includes(image?.mime)) {
      let mime = image?.mime?.split("/");
      let tempphoto = {
        uri: image.path,
        name: `profile_${Date.now()}.${mime[1]}`,
        type: image.mime,
      };
      var formData = new FormData();
      formData.append("profilepicture", tempphoto);
      dispatch(editUserAvatar(formData));
    }
  };

  const SectionHeader = ({ title, desc }) => (
    <View style={styles.sectionHeader}>
      <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: themeColors.text }}>{title}</AppText>
      {desc && <AppText type={ELEVEN} style={{ color: themeColors.secondaryText, marginTop: 4 }}>{desc}</AppText>}
    </View>
  );

  const CurrencyCard = ({ name, icon, code }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        styles.currencyCard,
        { backgroundColor: themeColors.input },
        selectedCurrency === code && { borderColor: themeColors.button, backgroundColor: `${themeColors.button}15` }
      ]}
      onPress={() => setSelectedCurrency(code)}
    >
      <FastImage source={icon} style={styles.currencyIcon} resizeMode="contain" />
      <AppText weight={selectedCurrency === code ? SEMI_BOLD : undefined} type={TEN} style={{ color: themeColors.text, textAlign: 'center' }}>{name}</AppText>
      {selectedCurrency === code && <View style={[styles.selectedTriangle, { borderBottomColor: themeColors.button }]} />}
    </TouchableOpacity>
  );

  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => NavigationService.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <FastImage
            source={back_ic}
            resizeMode="contain"
            style={{ width: 20, height: 20 }}
            tintColor={themeColors.text}
          />
        </TouchableOpacity>
        <AppText weight={SEMI_BOLD} type={SIXTEEN} style={[styles.headerTitle, { color: themeColors.text }]}>Account Info</AppText>
        <View></View>
      </View>

      {settingsScreenLoading ? (
        <SettingsScreenSkeleton />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Profile Section */}
          <View style={[styles.webStyleCard, { backgroundColor: isDark ? colors.newThemeColor : themeColors.card, borderColor: themeColors.border }]}>
            <SectionHeader title="Profile" desc="To protect your account, we recommend that you enable at least one 2FA" />
            <View style={[styles.profileInnerContent, { borderColor: themeColors.border }]}>
              {/* Row 1: Icon + Title */}
              <View style={styles.rowLeft}>
                <FastImage source={KEY_ICON} style={styles.rowIcon} tintColor={themeColors.text} />
                <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.text, marginLeft: 10 }}>Name & Avatar</AppText>
              </View>

              {/* Description */}
              <AppText type={ELEVEN} style={{ color: themeColors.secondaryText, marginTop: 12, lineHeight: 18 }}>
                Update your name and avatar to personalize your profile. Save changes to keep your account up to date.
              </AppText>

              {/* User Details Row */}
              <View style={[styles.rowLeft, { marginTop: 15 }]}>
                <View style={[styles.userIconCircle, { borderColor: themeColors.border, backgroundColor: themeColors.input }]}>
                  <FastImage
                    source={userData?.profilepicture ? { uri: IMAGE_BASE_URL + userData?.profilepicture } : defaultPic}
                    style={styles.avatarMini}
                    resizeMode="cover"
                  />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.text }}>
                    {userData?.firstName ? `${userData.firstName} ${userData.lastName || ""}` : "User Name"}
                  </AppText>
                </View>
              </View>

            </View>
          </View>

          {/* Currency Preference */}
          <View style={[styles.webStyleCard, { backgroundColor: isDark ? colors.newThemeColor : themeColors.card, borderColor: themeColors.border }]}>
            <SectionHeader title="Currency Preference" desc="Select your preferred display currency for all markets" />

            <View style={styles.currencyGrid}>
              <CurrencyCard name="Tether USD (USDT)" icon={tetherIcon} code="USDT" />
              <CurrencyCard name="BTC" icon={bitcoinIcon} code="BTC" />
              <CurrencyCard name="BNB" icon={bnbIcon} code="BNB" />
            </View>
            <TouchableOpacity
              style={[styles.saveCurrencyBtn, { backgroundColor: themeColors.button }]}
              onPress={handleSaveCurrency}
              activeOpacity={0.8}
            >
              <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.buttonText }}>Save Currency Preference</AppText>
            </TouchableOpacity>
          </View>


        </ScrollView>
      )}

      <PictureModal
        isVisible={isVisible}
        onBackButtonPress={() => setIsVisible(false)}
        onPressGallery={onPressGallery}
        onPressCamera={onPressCamera}
      />

      <RBSheet ref={changeEmail} closeOnDragDown draggableIcon={false} customStyles={{ container: { ...rbStyles.container, backgroundColor: themeColors.card } }} height={350} closeOnPressMask={false}>
        <ChangeEmail userData={userData} email={email} setEmail={setEmail} otp={otp} setOtp={setOtp} onCloseEmail={() => changeEmail.current.close()} />
      </RBSheet>

      <RBSheet ref={changePhone} closeOnDragDown draggableIcon={false} customStyles={{ container: { ...rbStyles.container, backgroundColor: themeColors.card } }} height={350} closeOnPressMask={false}>
        <ChangePhone userData={userData} phone={phone} setPhone={setPhone} otp={otp} setOtp={setOtp} onClosePhone={() => changePhone.current.close()} countryCode={countryCode} country={country} setCountryCode={setCountryCode} setCountry={setCountry} />
      </RBSheet>

      <RBSheet ref={changeName} closeOnDragDown draggableIcon={false} customStyles={{ container: { ...rbStyles.container, backgroundColor: themeColors.card } }} height={550} closeOnPressMask={false}>
        <NameDetails
          userData={userData}
          onCloseNominee={() => changeName.current.close()}
          firstName={firstName}
          setFirstName={setFirstName}
          lastName={lastName}
          setLastName={setLastName}
          onPressAvatar={() => setIsVisible(true)}
        />
      </RBSheet>

      <SpinnerSecond />
    </AppSafeAreaView>
  );
};

export default SettingsScreen;

const rbStyles = {
  container: {
    backgroundColor: colors.newThemeColor,
    borderTopRightRadius: 40,
    borderTopLeftRadius: 40,
  },
  wrapper: {
    backgroundColor: "#0006",
  },
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
  },
  headerBtn: {
    padding: 8,
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  logoutIconHead: {
    width: 20,
    height: 20,
  },
  headerTitle: {
    color: colors.white,
    right: 15
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    // marginTop: 15,
    marginBottom: 12,
  },
  webStyleCard: {
    backgroundColor: colors.newThemeColor,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3b4659',
    marginVertical: 10
  },
  webStyleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  rowIcon: {
    width: 18,
    height: 18,
  },
  changeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  changeBtnRemove: {
    borderColor: 'rgba(255, 79, 79, 0.45)',
    backgroundColor: 'rgba(255, 79, 79, 0.08)',
  },
  changeBtnLarge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  profileInnerContent: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#3b4659",
    padding: 10,
  },
  userIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMini: {
    width: '100%',
    height: '100%',
  },
  changeBtnFull: {
    marginTop: 20,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  currencyCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    aspectRatio: 1,
  },
  currencyCardActive: {
    borderColor: colors.buttonBg,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  currencyIcon: {
    width: 28,
    height: 28,
    marginBottom: 10,
  },
  selectedTriangle: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 15,
    borderBottomWidth: 15,
    borderLeftColor: 'transparent',
    borderBottomColor: colors.buttonBg,
  },
  saveCurrencyBtn: {
    backgroundColor: colors.white,
    marginTop: 10,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronStyle: {
    width: 16,
    height: 16,
  },
});
