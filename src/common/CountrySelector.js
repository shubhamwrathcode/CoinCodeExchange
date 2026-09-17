import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import RNPickerSelect from 'react-native-picker-select';
import { fontFamily } from '../theme/typography';
import {
  borderWidth,
  inputHeight,
  universalPaddingVertical,
} from '../theme/dimens';
import { downArrowIcon, downIcon } from '../helper/ImageAssets';
import CountryPicker from 'react-native-country-picker-modal';

import { colors } from '../theme/colors';
import { useTheme } from '../hooks/useTheme';

const CountrySelector = ({ visible, onSelectCountry, onCountry, country, style, countryCode }) => {
  const { colors: themeColors, isDark } = useTheme();

  return (
    <View style={[
      styles.dropdownWrapper, 
      { 
        backgroundColor: themeColors.input, 
        borderColor: themeColors.border 
      }, 
      style
    ]}>
      <CountryPicker
        onSelect={(country) => {
          // console.log(country, "country");
          onCountry(country.cca2)
          onSelectCountry(country.callingCode);
        }}
        withFilter
        containerButtonStyle={styles.inputPhoneF}
        withCallingCode
        countryCode={country}
        visible={visible}
        theme={isDark ? {
          backgroundColor: themeColors.background,
          onBackgroundTextColor: themeColors.text,
          fontSize: 14,
          filterPlaceholderTextColor: themeColors.textGrey,
          activeOpacity: 0.5,
          itemHeight: 50,
          flagSize: 20,
        } : undefined}
      />
      <FastImage
        source={downIcon}
        resizeMode="contain"
        style={styles.downArrowStyle}
        tintColor={themeColors.text}
      />
    </View>
  );
};

export { CountrySelector };
const styles = StyleSheet.create({
  dropdownWrapper: {
    borderRadius: 10,
    height: inputHeight,
    paddingHorizontal: Platform.OS === 'ios' ? universalPaddingVertical : 5,
    alignItems: 'center',
    borderWidth: borderWidth,
    flexDirection: 'row',
    bottom: 5,
  },

  downArrowStyle: {
    height: 10,
    width: 10,
  },
  inputPhoneF: {},
});
