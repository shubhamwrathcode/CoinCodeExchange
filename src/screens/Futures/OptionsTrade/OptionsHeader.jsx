import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import FastImage from 'react-native-fast-image';
import { useNavigation } from '@react-navigation/native';

import { AppText } from '../../../common';
import { useTheme } from '../../../hooks/useTheme';
import { BOLD, fontFamilyMedium, fontFamilySemiBold, MEDIUM, REGULAR, SEMI_BOLD } from '../../../theme/typography';
import { downIcon, filterNew, history, historyIcon, menuIcon, printIcon } from '../../../helper/ImageAssets'; // using existing icons
import { colors } from '../../../theme/colors';
import { useAppSelector } from '../../../store/hooks';
import { showError } from '../../../helper/logger';
import { LOGIN_SCREEN } from '../../../navigation/routes';

const OptionsHeader = ({ activeTab, setActiveTab, selectedOptionType, setSelectedOptionType, onOpenSettings, onOpenMoreSheet, selectedAsset, onOpenPairList }) => {
  const { colors: themeColors, isDark } = useTheme();
  const navigation = useNavigation();
  const userData = useAppSelector((state) => state.auth.userData);

  const topNavItems = ['Options Chain', 'Easy', 'Options Strategies'];
  const optionTypes = ['All', 'Call', 'Put'];

  return (
    <View style={styles.container}>


      {/* Title & Price */}
      {activeTab !== 2 && (
        <View style={styles.titleRow}>
          <TouchableOpacity style={styles.coinSelector} onPress={onOpenPairList}>
            <AppText style={{ fontSize: 18, color: themeColors.text, fontFamily: fontFamilySemiBold }}>{selectedAsset || '...'} Options</AppText>
            <FastImage source={downIcon} style={styles.downIcon} tintColor={themeColors.text} resizeMode="contain" />
          </TouchableOpacity>
          <View style={styles.badge}>
            <AppText style={{ color: '#fff', fontSize: 10, fontFamily: fontFamilyMedium }}>+50.47%</AppText>
          </View>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={() => {
              if (!userData) {
                showError("Please login first to view options history");
                navigation.navigate(LOGIN_SCREEN);
                return;
              }
              navigation.navigate('OptionHistory');
            }}
          >
            <FastImage source={historyIcon} style={styles.historyIcon} tintColor={themeColors.text} resizeMode="contain" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default OptionsHeader;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  topLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  topLinksScroll: {
    gap: 16,
    alignItems: 'center',
  },
  topLinkItem: {
    paddingVertical: 4,
  },
  moreBtn: {
    // marginLeft: 16,
    marginTop: 5
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  coinSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  downIcon: {
    width: 12,
    height: 12,
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#38B781',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 10,
  },
  historyIcon: {
    width: 24,
    height: 24,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionTypes: {
    flexDirection: 'row',
    gap: 20,
  },
  optionTypeBtn: {
    position: 'relative',
    paddingVertical: 4,
  },
  activeLine: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 2,
  },
  filterIconBtn: {
    gap: 4,
    justifyContent: 'center',
    height: 24,
    width: 24,
  },
  filterLines: {
    borderBottomWidth: 1.5,
    width: 16,
  }
});
