import React from 'react';
import { View } from 'react-native';
import { AppText } from '../../common';
import { useTheme } from '../../hooks/useTheme';

const TradFiTrade = () => {
  const { colors: themeColors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background, alignItems: 'center', justifyContent: 'center' }}>
      <AppText style={{ color: themeColors.text }}>TradFi Coming Soon</AppText>
    </View>
  );
};

export default TradFiTrade;
