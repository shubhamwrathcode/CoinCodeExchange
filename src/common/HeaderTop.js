import React, { useMemo, useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import FastImage from "react-native-fast-image";
import {
  agceLogoName,
  agceLogoNamelight,

  bell_ic,
  defaultPic,
  headPhoneIcon,
} from "../helper/ImageAssets";
import NavigationService from "../navigation/NavigationService";
import { NOTIFICATION_SCREEN } from "../navigation/routes";
import { useAppSelector } from "../store/hooks";
import { BASE_URL } from "../helper/Constants";
import { useTheme } from "../hooks/useTheme";
import { colors, lightTheme } from "../theme/colors";
import { appOperation } from "../appOperation";
import { useFocusEffect } from "@react-navigation/native";


const HeaderTop = () => {
  const { colors: themeColors, isDark } = useTheme();
  const userData = useAppSelector((state) => state.auth.userData);
  const iconTint = isDark ? '#C1C1C1' : "#000000";
  const titleColor = isDark ? themeColors.text : "#000000";

  const [serverAvatar, setServerAvatar] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      const fetchAvatar = async () => {
        try {
          const resAvatar = await appOperation.customer.get_avatar_setting();
          if (active && resAvatar?.success) {
            const fetchedAvatar = resAvatar.data?.avatar || resAvatar.data?.data?.avatar;
            if (fetchedAvatar) setServerAvatar(fetchedAvatar);
          }
        } catch (err) {
          // ignore
        }
      };
      fetchAvatar();
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
  // console.log(finalAvatarUri, '===uri');

  return (
    <View style={[styles.headerBar,]}>
      <View style={styles.sideSlot}>
        <TouchableOpacity
          onPress={() => NavigationService.navigate("ProfileDrawer")}
          style={[styles.avatarContainer, {
            borderColor: themeColors.border,
            backgroundColor: lightTheme.input
          }]}
        >
          <FastImage
            source={finalAvatarUri ? { uri: finalAvatarUri } : defaultPic}
            resizeMode="cover"
            style={styles.avatar}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.brandCenter}>
        <FastImage
          source={isDark ? agceLogoNamelight : agceLogoName}
          resizeMode="contain"
          style={styles.brandLogo}
        />

      </View>

      <View style={[styles.sideSlot, styles.sideRight]}>
        <TouchableOpacity
          onPress={() => NavigationService.navigate("Support")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <FastImage
            source={headPhoneIcon}
            tintColor={iconTint}
            resizeMode="contain"
            style={styles.actionIcon}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => NavigationService.navigate(NOTIFICATION_SCREEN)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <FastImage
            source={bell_ic}
            tintColor={iconTint}
            resizeMode="contain"
            style={styles.actionIcon}
          />

        </TouchableOpacity>
      </View>
    </View>
  );
};

export default HeaderTop;

const styles = StyleSheet.create({
  headerBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 5,
    marginBottom: 8,
    marginTop: 12,
  },
  sideSlot: {
    width: 96,
    flexDirection: "row",
    alignItems: "center",
  },
  sideRight: {
    justifyContent: "flex-end",
    gap: 18,
  },
  avatarContainer: {
    width: 30,
    height: 30,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",

  },
  avatar: {
    width: 40,
    height: 40,
  },
  brandCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    right: 10
  },
  brandLogo: {
    width: 107,
    height: 26,
  },
  brandTitle: {
    letterSpacing: 0.5,
  },
  actionIcon: {
    width: 20,
    height: 20,
  },
});
