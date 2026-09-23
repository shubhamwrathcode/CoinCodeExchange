import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../hooks/useTheme';
import {
  AppSafeAreaView,
  AppText,
  EIGHTEEN,
  SEMI_BOLD,
  FOURTEEN,
  MEDIUM,
  SIXTEEN,
  THIRTEEN,
} from '../../../shared';
import FastImage from 'react-native-fast-image';
import { back_ic, Polygon, disableAccount } from '../../../helper/ImageAssets';
import { colors } from '../../../theme/colors';
import { Button } from '../../../common/Button';
import { appOperation } from '../../../appOperation';
import { showError } from '../../../helper/logger';
import * as routes from '../../../navigation/routes';

const DisableAccountScreen = () => {
  const navigation = useNavigation();
  const { colors: themeColors, isDark } = useTheme();

  const [methodsLoading, setMethodsLoading] = useState(true);
  const [resolvedMethods, setResolvedMethods] = useState(null);

  useEffect(() => {
    const fetchMethods = async () => {
      try {
        setMethodsLoading(true);
        const resMethods = await appOperation.customer.get_security_methods_list();
        if (resMethods?.success) {
          const raw =
            resMethods?.data?.security_methods ||
            resMethods?.data?.data?.security_methods ||
            resMethods?.security_methods ||
            resMethods?.data?.securityMethods ||
            {};
          setResolvedMethods({
            email: !!raw.email,
            mobile: !!(raw.mobile ?? raw.phone ?? raw.sms),
            totp: !!raw.totp,
            passkey: !!raw.passkey,
          });
        }
      } catch (err) {
        console.log('Error fetching security methods:', err);
      } finally {
        setMethodsLoading(false);
      }
    };
    fetchMethods();
  }, []);

  const handleDisableAccount = () => {
    if (methodsLoading) {
      showError("Loading security methods. Please wait...");
      return;
    }

    if (!resolvedMethods) {
      showError("Could not retrieve security settings.");
      return;
    }

    const priority = ['passkey', 'totp', 'email', 'mobile'];
    const activeList = priority.filter(k => resolvedMethods[k]);
    if (activeList.length === 0) {
      showError("Please enable a verification method first.");
      return;
    }

    navigation.navigate(routes.PASSKEY_SECURITY_VERIFICATION_SCREEN, {
      purpose: 'disable_account',
      verifyMethods: activeList,
    });
  };

  const cardBg = isDark ? '#1C1C1E' : '#F2F2F7';
  const borderCol = isDark ? '#2C2C2E' : '#E5E5EA';
  const textColor = themeColors.text;
  const subTextColor = isDark ? '#8A8A93' : '#8E8E93';

  return (
    <AppSafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#121214' : colors.white }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <FastImage
            source={back_ic}
            style={{ width: 35, height: 35 }}
            resizeMode='contain'
          />
        </TouchableOpacity>

        <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={[styles.headerTitle, { color: textColor }]}>
          Disable Account
        </AppText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <FastImage
            source={disableAccount}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>

        {/* Text */}
        <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.description, { color: textColor }]}>
          Please be aware of the following impacts on your account once it is disabled:
        </AppText>

        <View style={styles.bulletList}>
          <View style={[styles.bulletItemCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <FastImage
              source={Polygon}
              style={{ width: 10, height: 10, marginTop: 4, marginRight: 10 }}
              resizeMode="contain"
            />
            <AppText type={THIRTEEN} weight={MEDIUM} style={[styles.bulletText, { color: textColor }]}>
              Any pending withdrawal requests will be canceled.
            </AppText>
          </View>

          <View style={[styles.bulletItemCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <FastImage
              source={Polygon}
              style={{ width: 10, height: 10, marginTop: 4, marginRight: 10 }}
              resizeMode="contain"
            />
            <AppText type={THIRTEEN} weight={MEDIUM} style={[styles.bulletText, { color: textColor }]}>
              All trading features on your account will be disabled.
            </AppText>
          </View>

          <View style={[styles.bulletItemCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <FastImage
              source={Polygon}
              style={{ width: 10, height: 10, marginTop: 4, marginRight: 10 }}
              resizeMode="contain"
            />
            <AppText type={THIRTEEN} weight={MEDIUM} style={[styles.bulletText, { color: textColor }]}>
              All API keys linked to your account will be removed.
            </AppText>
          </View>

          <View style={[styles.bulletItemCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <FastImage
              source={Polygon}
              style={{ width: 10, height: 10, marginTop: 4, marginRight: 10 }}
              resizeMode="contain"
            />
            <AppText type={THIRTEEN} weight={MEDIUM} style={[styles.bulletText, { color: textColor }]}>
              Your identity verification details will be retained and not deleted.
            </AppText>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        {methodsLoading ? (
          <ActivityIndicator size="small" color={colors.cyanTheme} style={{ marginVertical: 12 }} />
        ) : (
          <Button
            containerStyle={styles.disableBtn}
            onPress={handleDisableAccount}
          >
            <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: colors.white }}>
              Disable Account
            </AppText>
          </Button>
        )}
      </View>
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: Platform.OS === 'ios' ? 44 : 56,
  },
  headerBtn: {
    padding: 6,
    marginLeft: -4,
  },
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: -1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  illustration: {
    width: 140,
    height: 140,
  },
  description: {
    lineHeight: 20,
    marginBottom: 16,
  },
  bulletList: {
    marginTop: 4,
  },
  bulletItemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  bulletText: {
    flex: 1,
    lineHeight: 18,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 24,
    left: 0,
    right: 0,
    paddingHorizontal: 15,
  },
  disableBtn: {
    width: '100%',
  },
});

export default DisableAccountScreen;
