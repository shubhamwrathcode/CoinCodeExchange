import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  AppSafeAreaView,
  AppText,
  Button,
  BOLD,
  FOURTEEN,
  THIRTEEN,
  SEMI_BOLD,
  EIGHTEEN,
  TEN,
} from '../../shared';
import FastImage from 'react-native-fast-image';
import { back_ic, FINGERPRINT } from '../../helper/ImageAssets';
import { getPasskeyList } from '../../actions/accountActions';
import { ADD_PASSKEY_SCREEN } from '../../navigation/routes';
import { useTheme } from "../../hooks/useTheme";
import { formatPasskeyDeviceLabel, getLocalPasskeyDeviceInfoMap, mergePasskeyListWithLocalDeviceInfo, resolvePasskeyDeviceInfo } from '../../helper/passkeyDeviceInfo';

const ViewPasskeysScreen = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const [passkeys, setPasskeys] = useState([]);
  const [localDeviceMap, setLocalDeviceMap] = useState({});
  const isLoading = useAppSelector((state) => state.auth.isLoading);

  const loadPasskeys = useCallback(async () => {
    const [res, localMap] = await Promise.all([
      dispatch(getPasskeyList()),
      getLocalPasskeyDeviceInfoMap(),
    ]);
    setLocalDeviceMap(localMap);
    if (res?.data?.passkeys) {
      const merged = await mergePasskeyListWithLocalDeviceInfo(res.data.passkeys);
      setPasskeys(merged);
    }
  }, [dispatch]);

  useEffect(() => {
    loadPasskeys();
  }, [loadPasskeys]);

  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background }}>
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <FastImage source={back_ic} style={styles.backIcon} tintColor={themeColors.text} resizeMode="contain" />
        </TouchableOpacity>
        <AppText weight={BOLD} type={EIGHTEEN} style={[styles.headerTitle, { color: themeColors.text }]}>Registered Passkeys</AppText>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AppText type={FOURTEEN} weight={BOLD} style={{ color: themeColors.text }}>Manage Passkeys</AppText>
        <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, marginTop: 4, marginBottom: 24 }}>Manage your passkeys for passwordless login</AppText>
        
        {passkeys.length > 0 ? (
          <View style={styles.passkeyList}>
            {passkeys.map((passkey) => (
              <View key={passkey._id} style={[styles.passkeyItem, { borderColor: themeColors.border, backgroundColor: themeColors.card }]}>
                <View style={[styles.iconWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}>
                   <FastImage source={FINGERPRINT} style={{ width: 22, height: 22 }} tintColor={themeColors.button} resizeMode="contain" />
                </View>
                <View style={styles.passkeyItemContent}>
                  <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.text }}>{passkey.name || 'Passkey'}</AppText>
                  <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, marginTop: 2 }}>
                    {formatPasskeyDeviceLabel(resolvePasskeyDeviceInfo(passkey, localDeviceMap))}
                  </AppText>
                  {(passkey.createdAt || passkey.lastUsedAt) && (
                    <AppText type={TEN} style={{ color: themeColors.secondaryText, marginTop: 6 }}>
                      {passkey.createdAt && `Added ${new Date(passkey.createdAt).toLocaleDateString()}`}
                      {passkey.lastUsedAt && ` • Last used ${new Date(passkey.lastUsedAt).toLocaleDateString()}`}
                    </AppText>
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.passkeyEmpty, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <FastImage source={FINGERPRINT} style={{ width: 44, height: 44, opacity: 0.3, marginBottom: 12 }} tintColor={themeColors.text} resizeMode="contain" />
            <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, textAlign: 'center' }}>No passkeys registered yet</AppText>
          </View>
        )}
        
        <Button
          children="Add New Passkey"
          onPress={() => navigation.navigate(ADD_PASSKEY_SCREEN)}
          containerStyle={styles.btn}
          disabled={isLoading}
        />
      </ScrollView>
    </AppSafeAreaView>
  );
};

export default ViewPasskeysScreen;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    paddingHorizontal: 16
  },
  backBtn: { padding: 4 },
  backIcon: { width: 22, height: 22 },
  headerTitle: { fontSize: 18, marginLeft: 12 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  passkeyList: { marginBottom: 10 },
  passkeyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 1.5 },
    }),
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passkeyItemContent: { marginLeft: 16, flex: 1 },
  passkeyEmpty: { 
    paddingVertical: 40, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 20
  },
  btn: { marginTop: 20 },
});
