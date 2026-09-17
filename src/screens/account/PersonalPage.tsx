import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import FastImage from 'react-native-fast-image';
import { useTheme } from '../../hooks/useTheme';
import { colors } from '../../theme/colors';
import { AppSafeAreaView, AppText, SEMI_BOLD, MEDIUM, FOURTEEN, FIFTEEN, TWELVE, SIXTEEN, BOLD } from '../../shared';
import HeaderTop from '../../common/HeaderTop';
import NavigationService from '../../navigation/NavigationService';
import * as routes from '../../navigation/routes';
import { right_ic, defaultPic, CAMERA_IMG } from '../../helper/ImageAssets';
import EditAvatarModal from './EditAvatarModal';
import Toast from 'react-native-simple-toast';
import { BASE_URL, IMAGE_BASE_URL } from '../../helper/Constants';
import KycHeader from '../../common/kycHeader/KycHeader';
import LinearGradient from 'react-native-linear-gradient';

const PersonalPage = ({ route }: any) => {
  const { colors: themeColors, isDark } = useTheme();

  // Params passed from AccountDetails
  const { userData, serverAvatar, serverNickname, maskedEmail, maskedPhone, displayName } = route?.params || {};

  const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false);
  const [localServerAvatar, setLocalServerAvatar] = useState(serverAvatar);


  // Helper to determine the final avatar URL
  const getFullAvatarUrl = (avatarUrl: string) => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl;
    return `${BASE_URL}${avatarUrl.startsWith('/') ? '' : '/'}${avatarUrl}`;
  };

  const finalAvatarUri = getFullAvatarUrl(localServerAvatar || userData?.profilepicture);

  function getInitials(uData: any, serverNick: any) {
    const name = serverNick || uData?.display_name || uData?.user_login || uData?.user_nicename || uData?.first_name || uData?.firstName || "User";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  const initials = getInitials(userData, serverNickname);
  const KYC_AVATAR_GRADIENT = ["#a684ff", "#ad46ff", "#4f39f6"];
  const KYC_AVATAR_GRADIENT_LOCATIONS = [0, 0.5, 1];

  const showComingSoonToast = () => {
    Toast.showWithGravity("Coming soon", Toast.SHORT, Toast.BOTTOM);
  };

  const MenuItem = ({ label, value, showArrow = true, onPress, hasTopBorder = false, isLightLabel = false }: any) => (
    <TouchableOpacity
      style={[
        styles.menuItem,
        {
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#2C2C2E' : '#F2F2F7'
        },
        hasTopBorder && { borderTopWidth: 1, borderTopColor: isDark ? '#2C2C2E' : '#F2F2F7' }
      ]}
      onPress={onPress || showComingSoonToast}
      activeOpacity={0.7}
      disabled={!onPress && !showArrow}
    >
      <AppText
        type={FIFTEEN}
        style={{ color: isLightLabel ? themeColors.secondaryText : themeColors.text }}
      >
        {label}
      </AppText>

      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {value ? (
          <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText, marginRight: showArrow ? 8 : 0 }}>
            {value}
          </AppText>
        ) : null}
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

  return (
    <AppSafeAreaView>

      <KycHeader title={''} onBackPress={() => { NavigationService.goBack() }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={() => setIsAvatarModalVisible(true)}
            activeOpacity={0.9}
            style={styles.avatarWrapper}>
            {finalAvatarUri ? (
              <FastImage
                source={{ uri: finalAvatarUri }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={KYC_AVATAR_GRADIENT}
                locations={KYC_AVATAR_GRADIENT_LOCATIONS}
                style={[styles.avatar, { justifyContent: 'center', alignItems: 'center' }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <AppText weight={BOLD} style={{ color: "#FFFFFF", fontSize: 20 }}>
                  {initials}
                </AppText>
              </LinearGradient>
            )}
            <View style={[styles.cameraIconContainer, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', borderColor: themeColors.background }]}>
              <FastImage source={CAMERA_IMG} style={{ width: 12, height: 12 }} resizeMode="contain" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Profile Info Items */}
        <View style={{ marginTop: 10 }}>
          <MenuItem
            label="Username"
            value={maskedEmail || maskedPhone || "User"}
            showArrow={false}
          />
          <MenuItem
            label="Nickname"
            value={displayName}
            onPress={() => NavigationService.navigate(routes.NICKNAME_SETTINGS_SCREEN, { currentNickname: displayName })}
          />
          <MenuItem
            label="Badge"
          />
        </View>

        {/* Profile Tag Section */}
        <View style={{ marginTop: 20 }}>
          <View style={{ paddingHorizontal: 20, marginBottom: 5 }}>
            <AppText type={SIXTEEN} weight={MEDIUM} style={{ color: themeColors.text }}>
              Profile Tag
            </AppText>
          </View>

          <MenuItem
            label="Moments"
            isLightLabel={true}
          />

          <View style={[styles.pillsContainer, { borderBottomColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
            <View style={[styles.pill, { backgroundColor: isDark ? '#2A2A2E' : '#F3F4F6' }]}>
              <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>Age 0 Year</AppText>
            </View>
            <View style={[styles.pill, { backgroundColor: isDark ? '#2A2A2E' : '#F3F4F6', marginLeft: 10 }]}>
              <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>Peak Tier VIP-{userData?.vipLevel || 0}</AppText>
            </View>
          </View>
        </View>

        {/* Bio Section */}
        <View style={{ marginTop: 20 }}>
          <MenuItem
            label="Bio"
            value="No bio yet"
            hasTopBorder={true}
          />
        </View>

      </ScrollView>

      {/* Avatar Edit Modal */}
      <EditAvatarModal
        isVisible={isAvatarModalVisible}
        onClose={() => setIsAvatarModalVisible(false)}
        currentAvatarUrl={finalAvatarUri}
        onAvatarCommitted={(path) => {
          if (path) setLocalServerAvatar(path);
        }}
      />
    </AppSafeAreaView>
  );
};

export default PersonalPage;

const styles = StyleSheet.create({
  avatarSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  avatarWrapper: {
    position: 'relative',
    width: 90,
    height: 90,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
    backgroundColor: '#9B51E0',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0.8
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  pillsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  }
});
