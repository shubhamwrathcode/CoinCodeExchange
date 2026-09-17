import React, { useMemo, useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import FastImage from "react-native-fast-image";
import { Search, User } from "lucide-react-native";
import {
  bellIcon,
  giftIcon,
  gridIcon,
} from "../helper/ImageAssets";
import NavigationService from "../navigation/NavigationService";
import { NOTIFICATION_SCREEN, SEARCH_SCREEN } from "../navigation/routes";
import { useAppSelector } from "../store/hooks";
import { BASE_URL } from "../helper/Constants";
import { useTheme } from "../hooks/useTheme";
import { colors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { AppText, FOURTEEN, MEDIUM } from "../shared";
import { appOperation } from "../appOperation";
import { useFocusEffect } from "@react-navigation/native";

const HeaderTop = () => {
  const { colors: themeColors, isDark } = useTheme();
  const userData = useAppSelector((state) => state.auth.userData);

  const [serverAvatar, setServerAvatar] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      const fetchAvatar = async () => {
        try {
          const resAvatar = await appOperation.customer.get_avatar_setting();
          if (active && resAvatar?.success) {
            const fetchedAvatar =
              resAvatar.data?.avatar || resAvatar.data?.data?.avatar;
            if (fetchedAvatar) setServerAvatar(fetchedAvatar);
          }
        } catch (err) {
          // ignore
        }
      };
      fetchAvatar();
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

  const finalAvatarUri = getFullAvatarUrl(
    serverAvatar || userData?.profilepicture
  );

  const boxBg = isDark ? colors.lightBlackLatest : "#F3F4F6";
  const boxBorder = isDark ? "#1C1E22" : "#E5E7EB";
  const mutedColor = colors.darkShadeColorText || "#9CA3AF";

  return (
    <View style={styles.header}>
      {/* Avatar (Left) */}
      <TouchableOpacity
        style={[
          styles.avatar,
          {
            borderColor: boxBorder,
            backgroundColor: boxBg,
          },
        ]}
        onPress={() => NavigationService.navigate("ProfileDrawer")}
        activeOpacity={0.8}
      >
        {finalAvatarUri ? (
          <FastImage
            source={{ uri: finalAvatarUri }}
            resizeMode="cover"
            style={styles.avatarImage}
          />
        ) : (
          <User color={mutedColor} size={20} />
        )}
      </TouchableOpacity>

      {/* Search Bar (Center) */}
      <TouchableOpacity
        style={[
          styles.searchContainer,
          {
            borderColor: boxBorder,
            backgroundColor: boxBg,
          },
        ]}
        onPress={() => NavigationService.navigate(SEARCH_SCREEN)}
        activeOpacity={0.8}
      >
        <Search color={mutedColor} size={18} />
        <AppText
          type={FOURTEEN}
          weight={MEDIUM}
          style={[styles.searchPlaceholder, { color: mutedColor }]}
        >
          SOL/USDT
        </AppText>
      </TouchableOpacity>

      {/* Action Icons (Right) */}
      <View style={styles.rightIcons}>
        <TouchableOpacity
          style={styles.iconButton}
          // onPress={() => NavigationService.navigate("ProfileDrawer")}
          activeOpacity={0.7}
        >
          <FastImage
            source={gridIcon}
            style={styles.actionIcon}
            resizeMode={FastImage.resizeMode.contain}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          // onPress={() => NavigationService.navigate("BuyPackage")}
          activeOpacity={0.7}
        >
          <FastImage
            source={giftIcon}
            style={styles.actionIcon}
            resizeMode={FastImage.resizeMode.contain}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => NavigationService.navigate(NOTIFICATION_SCREEN)}
          activeOpacity={0.7}
        >
          <FastImage
            source={bellIcon}
            style={styles.actionIcon}
            resizeMode={FastImage.resizeMode.contain}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default HeaderTop;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: "transparent",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    overflow: "hidden",
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 40,
    borderRadius: 20,
    marginLeft: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  searchPlaceholder: {
    marginLeft: 8,
    fontFamily: fonts.medium,
  },
  rightIcons: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
    gap: 8,
  },
  iconButton: {
    padding: 2,
  },
  actionIcon: {
    width: 22,
    height: 22,
  },
});
