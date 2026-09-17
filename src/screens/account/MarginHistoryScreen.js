import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { AppSafeAreaView, Toolbar } from '../../shared';
import MarginHistorySection from '../spotScreen/MarginHistorySection';
import { colors } from '../../theme/colors';

const MarginHistoryScreen = ({ route }) => {
  const { isDark, colors: themeColors } = useTheme();
  const { activeTab, currencyData } = route?.params || {};

  return (
    <AppSafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Toolbar isSecond title={"Margin History"} style={{ width: "62%", backgroundColor: "transparent" }} />
      <View style={{ flex: 1 }}>
        <MarginHistorySection
          isFullScreen={true}
          currencyData={currencyData}
          themeColors={themeColors}
          isDark={isDark}
          initialTab={activeTab}
        />
      </View>
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default MarginHistoryScreen;
