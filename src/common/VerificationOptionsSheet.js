/**
 * Reusable verification options sheet - ONLY verification options (Email OTP, Mobile OTP, Google Authenticator).
 */
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import FastImage from 'react-native-fast-image';
import { AppText, BOLD, SIXTEEN, FOURTEEN } from '../shared';
import { back_ic, EMAIL, PHONE, KEY_ICON, FINGERPRINT, checkIc } from '../helper/ImageAssets';
import { useTheme } from "../hooks/useTheme";
import { colors } from '../theme/colors';

const getMethodIcon = (value) => {
  switch (value) {
    case 'email': return EMAIL;
    case 'mobile': return PHONE;
    case 'totp': return KEY_ICON;
    case 'passkey': return FINGERPRINT;
    default: return EMAIL;
  }
};

export const VerificationOptionsSheet = ({
  sheetRef,
  options = [],
  onSelect,
  selectedValue,
}) => {
  const { colors: themeColors, isDark } = useTheme();

  return (
    <RBSheet
      ref={sheetRef}
      closeOnDragDown={false}
      closeOnPressMask={true}
      customStyles={{
        container: {
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          backgroundColor: themeColors.background,
          paddingBottom: 24,
          height: 'auto',
        },
        wrapper: { backgroundColor: 'rgba(0,0,0,0.5)' },
        draggableIcon: { backgroundColor: 'transparent' },
      }}
    >
      <View style={styles.sheetHeader}>
        <TouchableOpacity
          onPress={() => sheetRef.current?.close()}
          style={styles.sheetBackBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <FastImage source={back_ic} style={styles.sheetBackIcon} resizeMode="contain" />
        </TouchableOpacity>
        <AppText weight={BOLD} type={SIXTEEN} style={{ color: themeColors.text, marginLeft: 14 }}>
          Verification Options
        </AppText>
      </View>
      <View style={[styles.sheetHeaderDivider, { backgroundColor: themeColors.border }]} />
      <View style={styles.sheetOptions}>
        {options.map((m, index) => (
          <View key={m.value}>
            <TouchableOpacity
              onPress={() => {
                onSelect?.(m.value);
                sheetRef.current?.close();
              }}
              style={styles.sheetOptionRow}
              activeOpacity={0.7}
            >
              <View style={styles.sheetOptionLeft}>
                <View style={[styles.iconWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" }]}>
                  <FastImage
                    source={getMethodIcon(m.value)}
                    style={styles.sheetOptionIcon}
                    resizeMode="contain"
                    tintColor={themeColors.button}
                  />
                </View>
                <View style={styles.sheetOptionTextWrap}>
                  <AppText type={FOURTEEN} weight={BOLD} style={{ color: themeColors.text }}>{m.label}</AppText>
                </View>
                {selectedValue === m.value && (
                  <FastImage
                    source={checkIc}
                    style={styles.checkIcon}
                    tintColor={isDark ? colors.white : colors.cyanTheme}
                    resizeMode="contain"
                  />
                )}
              </View>
            </TouchableOpacity>
            {index < options.length - 1 && <View style={[styles.sheetOptionDivider, { backgroundColor: themeColors.border }]} />}
          </View>
        ))}
      </View>
    </RBSheet>
  );
};

const styles = StyleSheet.create({
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  sheetBackBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBackIcon: { width: 20, height: 20 },
  sheetHeaderDivider: { height: 1, marginHorizontal: 20 },
  sheetOptions: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  sheetOptionRow: { paddingVertical: 14 },
  sheetOptionLeft: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionIcon: { width: 18, height: 18 },
  sheetOptionTextWrap: { marginLeft: 16, flex: 1 },
  sheetOptionDivider: { height: 1 },
  checkIcon: {
    width: 16,
    height: 16,
    marginLeft: 'auto',
  },

});
