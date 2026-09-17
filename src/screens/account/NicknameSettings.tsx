import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppSafeAreaView, AppText, SEMI_BOLD, MEDIUM, FOURTEEN, SIXTEEN } from '../../shared';
import { colors } from '../../theme/colors';
import { useTheme } from '../../hooks/useTheme';
import FastImage from 'react-native-fast-image';
import { back_ic } from '../../helper/ImageAssets';
import NavigationService from '../../navigation/NavigationService';
import Toast from 'react-native-simple-toast';
import { appOperation } from '../../appOperation';

const NicknameSettings = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { colors: themeColors, isDark } = useTheme();
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialNickname, setInitialNickname] = useState('');

  useEffect(() => {
    if (route.params?.currentNickname) {
      setNickname(route.params.currentNickname);
      setInitialNickname(route.params.currentNickname);
    }

    let cancelled = false;
    const fetchNickname = async () => {
      try {
        const res: any = await appOperation.customer.get_nickname_setting();
        if (cancelled) return;
        if (res?.success === true) {
          const fetchedNickname = res.data?.nickname || res.data?.data?.nickname || '';
          setNickname(fetchedNickname);
          setInitialNickname(fetchedNickname);
        }
      } catch (err) {
        // Fallback to route param
      }
    };
    fetchNickname();
    return () => {
      cancelled = true;
    };
  }, [route.params?.currentNickname]);

  const handleSave = async () => {
    const trimmed = nickname.trim();
    if (trimmed.length < 2) {
      Toast.showWithGravity("Nickname must be at least 2 characters.", Toast.SHORT, Toast.BOTTOM);
      return;
    }
    if (trimmed.length > 24) {
      Toast.showWithGravity("Nickname cannot exceed 24 characters.", Toast.SHORT, Toast.BOTTOM);
      return;
    }
    if (trimmed === initialNickname) {
      // No changes made
      NavigationService.goBack();
      return;
    }

    setLoading(true);
    try {
      const res: any = await appOperation.customer.edit_nickname_setting({ nickname: trimmed });
      if (res?.success === true) {
        Toast.showWithGravity(res.message || "Nickname updated successfully.", Toast.SHORT, Toast.BOTTOM);
        NavigationService.goBack();
      } else {
        Toast.showWithGravity(res?.message || "Could not update nickname.", Toast.LONG, Toast.BOTTOM);
      }
    } catch (err: any) {
      const apiMsg = err?.message || err?.data?.message || err?.error || err?.response?.data?.message;
      const errorMessage = apiMsg ? String(apiMsg) : "Failed to update nickname. Please try again.";
      Toast.showWithGravity(errorMessage, Toast.LONG, Toast.BOTTOM);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background }}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => NavigationService.goBack()}>
          <FastImage source={back_ic} style={styles.backIcon} tintColor={isDark ? colors.white : colors.black} resizeMode="contain" />
        </TouchableOpacity>
        <AppText weight={SEMI_BOLD} type={SIXTEEN} style={[styles.headerTitle, { color: themeColors.text }]}>
          Nickname Settings
        </AppText>
        <TouchableOpacity
          style={[styles.okButton, isDark && { backgroundColor: colors.themeElevationColor }]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <AppText weight={SEMI_BOLD} style={[styles.okButtonText, { color: isDark ? themeColors.text : colors.white }]}>Ok</AppText>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Input */}
        <View style={[styles.inputContainer, { backgroundColor: isDark ? '#2A2A2E' : '#F7F7F7' }]}>
          <TextInput
            style={[styles.input, { color: themeColors.text }]}
            value={nickname}
            onChangeText={setNickname}
            placeholder="Enter nickname"
            placeholderTextColor={themeColors.secondaryText}
            maxLength={24}
          />
        </View>

        {/* Rules */}
        <View style={styles.rulesContainer}>
          <AppText weight={SEMI_BOLD} type={FOURTEEN} style={[styles.rulesHeader, { color: themeColors.secondaryText }]}>
            Nickname Rules
          </AppText>

          <View style={styles.ruleItem}>
            <AppText style={[styles.ruleNumber, { color: themeColors.secondaryText }]}>1. </AppText>
            <AppText style={[styles.ruleText, { color: themeColors.secondaryText }]}>
              The nickname can only be modified once within 24 hours and will be displayed on the personal homepage, moments, etc.
            </AppText>
          </View>

          <View style={styles.ruleItem}>
            <AppText style={[styles.ruleNumber, { color: themeColors.secondaryText }]}>2. </AppText>
            <AppText style={[styles.ruleText, { color: themeColors.secondaryText }]}>
              Don't use your real world name or contact to protect privacy.
            </AppText>
          </View>

          <View style={styles.ruleItem}>
            <AppText style={[styles.ruleNumber, { color: themeColors.secondaryText }]}>3. </AppText>
            <AppText style={[styles.ruleText, { color: themeColors.secondaryText }]}>
              Nickname should comply with applicable laws and regulations and respect others. If violating rules above, AGCE may modify it or even mute or block the account.
            </AppText>
          </View>

          <View style={styles.ruleItem}>
            <AppText style={[styles.ruleNumber, { color: themeColors.secondaryText }]}>4. </AppText>
            <AppText style={[styles.ruleText, { color: themeColors.secondaryText }]}>
              Nickname should be within 24 characters long, allowing for letters, numbers or Chinese characters. Special characters are not allowed.
            </AppText>
          </View>
        </View>
      </ScrollView>
    </AppSafeAreaView>
  );
};

export default NicknameSettings;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 15,
  },
  backButton: {
    padding: 5,
  },
  backIcon: {
    width: 16,
    height: 16,
  },
  headerTitle: {

    fontSize: 18,
  },
  okButton: {
    backgroundColor: '#333333',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  okButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  inputContainer: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 4,
    marginBottom: 30,
    borderColor: colors.themeElevationColor,
    borderWidth: 1
  },
  input: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',

  },
  rulesContainer: {
    paddingHorizontal: 4,
  },
  rulesHeader: {
    marginBottom: 15,
  },
  ruleItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  ruleNumber: {
    fontSize: 13,
    lineHeight: 20,
  },
  ruleText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
});
