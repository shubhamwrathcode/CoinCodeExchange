import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { tick } from '../helper/ImageAssets';
import FastImage from 'react-native-fast-image';
import { colors } from '../theme/colors';
import { useTheme } from '../hooks/useTheme';

const Checkbox = ({
  onPress,
  value,
  disabled,
  type,
  style,
  innerStyle,
  theme,
  containerStyle,
}) => {
  const { colors: themeColors, isDark } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[{
        height: 20, width: 20,
        alignItems: "center", justifyContent: "center"
      }, containerStyle]}>
      <View style={[styles.linearGradientWrapper, style]}>
        {value ? (
          <View style={[styles.selectedUIFilter(type, colors), innerStyle]}>
            <FastImage
              source={tick}
              resizeMode={'contain'}
              tintColor={isDark ? colors.white : colors.black}
              style={[styles.checkboxTick(type, colors)]}
            />
          </View>
        ) : (
          <View style={styles.unchecked(colors)} />
        )}
      </View>
    </TouchableOpacity>
  );
};

export default Checkbox;

const styles = StyleSheet.create({
  selectedUIFilter: () => ({
    height: 15,
    width: 15,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 1,
  }),

  checkboxTick: () => ({
    height: 12,
    width: 12,
  }),
  unchecked: () => ({
    height: 16,
    width: 16,
  }),

  linearGradientWrapper: {
    borderColor: '#D3D3D3',
    borderWidth: 2,
    height: 18,
    width: 18,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
