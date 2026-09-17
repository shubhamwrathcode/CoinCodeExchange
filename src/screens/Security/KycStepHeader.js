import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import FastImage from "react-native-fast-image";
import LinearGradient from "react-native-linear-gradient";
import { AppText, FIFTEEN, SEMI_BOLD, SIXTEEN, TWENTY, BOLD, TWELVE } from "../../shared";
import { colors } from "../../theme/colors";
import { back_ic, headPhoneIcon, helpicon, INFO, switchprofile } from "../../helper/ImageAssets";
import { useAppSelector } from "../../store/hooks";
import NavigationService from "../../navigation/NavigationService";
import { IMAGE_BASE_URL } from "../../helper/Constants";
import { useTheme } from "../../hooks/useTheme";

const KYC_AVATAR_GRADIENT = ["#a684ff", "#ad46ff", "#4f39f6"];

const getInitials = (name) => {
  const parts = (name || "User").trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name?.slice(0, 2).toUpperCase() || "U";
};


const BACK_ICON_SIZE = 18;
const INFO_ICON_SIZE = 22;

const KycStepHeader = ({ title, onBackPress, onInfoPress, onSupportPress, onSwitchProfilePress }) => {
  const { isDark } = useTheme();
  const textColor = isDark ? colors.white : colors.black;
  const onPress = onBackPress ?? (() => NavigationService.goBack());
  const userData = useAppSelector((state) => state.auth.userData);
  const displayName = userData?.firstName && userData?.lastName
    ? `${userData.firstName} ${userData.lastName}`
    : userData?.firstName || userData?.display_name || userData?.userName || userData?.user_login || "User";


  return (
    <View style={styles.headerRow}>
      <TouchableOpacity
        onPress={onPress}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={styles.actionBtn}
      >
        <FastImage
          source={back_ic}
          resizeMode="contain"
          style={[styles.backIcon, { width: BACK_ICON_SIZE, height: BACK_ICON_SIZE }]}
          tintColor={textColor}
        />
      </TouchableOpacity>

      <AppText
        type={TWENTY}
        weight={SEMI_BOLD}
        style={[styles.headerTitle, { color: textColor }]}
        numberOfLines={1}
      >
        {title}
      </AppText>

      <View style={styles.rightActions}>


        {onInfoPress && (
          <TouchableOpacity
            onPress={onInfoPress}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 6 }}
            style={styles.actionBtn}
          >
            <FastImage
              source={INFO}
              resizeMode="contain"
              style={{ width: INFO_ICON_SIZE, height: INFO_ICON_SIZE }}
              tintColor={textColor}
            />
          </TouchableOpacity>
        )}

        {onSupportPress && (
          <TouchableOpacity
            onPress={onSupportPress}
            hitSlop={{ top: 12, bottom: 12, left: 6, right: 12 }}
            style={styles.actionBtn}
          >
            <FastImage
              source={headPhoneIcon}
              resizeMode="contain"
              style={{ width: INFO_ICON_SIZE, height: INFO_ICON_SIZE }}
              tintColor={textColor}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default KycStepHeader;

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    height: 60,
  },
  actionBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  backIcon: {},
  headerTitle: {
    position: "absolute",
    left: 0,
    right: 25,
    textAlign: "center",
    zIndex: -1,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    left: 10
  },
});
