import React from 'react';
import {StyleSheet, View} from 'react-native';
import {colors} from '../../theme/colors';

import { useTheme } from '../../hooks/useTheme';

interface CustomDotsProps {
  index: number;
  activeIndex: number;
  activeColor?: string;
  inactiveColor?: string;
}

const CustomDots = ({index, activeIndex, activeColor, inactiveColor}: CustomDotsProps) => {
  const { colors: themeColors, isDark } = useTheme();
  
  const _activeColor = activeColor || themeColors.button;
  const _inactiveColor = inactiveColor || (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)');

  return (
    <View style={[
      styles.dot, 
      { backgroundColor: _inactiveColor },
      index === activeIndex && [styles.activeDot, { backgroundColor: _activeColor }]
    ]} />
  );
};

const styles = StyleSheet.create({
  dot: {
    height: 6,
    width: 6,
    borderRadius: 50,
    marginRight: 4,
    marginTop:10
  },
  activeDot: {
    width: 15,
  },
});
export default CustomDots;
