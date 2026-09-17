import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { fontFamilyMedium, fontFamilySemiBold } from '../../../theme/typography';
import FastImage from 'react-native-fast-image';
import { closeIcon, right_ic, back_ic } from '../../../helper/ImageAssets';
import { AppText } from '../../../common';
import { colors } from '../../../theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const OptionsSettingsSheet = ({ visible, onClose }) => {
  const { colors: themeColors, isDark } = useTheme();
  const [currentView, setCurrentView] = useState('settings');

  // Settings Data
  const settingsOptions = [
    'Last Price', '24h Vol',
    'OI', 'Vega',
    'Theta', 'Gamma',
    'Leverage', 'Bid Size',
    'Ask Size', 'Distance to Strike'
  ];

  // Coins Data
  const coins = [
    'BTC', 'ETH', 'SOL', 'XAUT', 'CL', 'BNB', 'XRP', 'DOGE', 'ADA', 'HYPE', 'SUI', 'LTC', 'TON'
  ];

  const handleClose = () => {
    setCurrentView('settings');
    onClose();
  };

  const renderSettingsView = () => (
    <View style={styles.sheetContent}>
      {/* Header */}
      <View style={styles.header}>
        <AppText style={{ fontFamily: fontFamilySemiBold, fontSize: 18, color: themeColors.text }}>Settings</AppText>

      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{}}>
        {/* Grid of Options */}
        <View style={styles.grid}>
          {settingsOptions.map((opt, i) => (
            <TouchableOpacity key={i} style={[styles.gridItem, { borderColor: colors.black, backgroundColor: isDark ? '#1C1D21' : '#FFF' }]}>
              <AppText style={{ color: themeColors.text, fontSize: 13, fontFamily: fontFamilyMedium, textAlign: 'center' }}>{opt}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* ATM Options Row */}
        <TouchableOpacity
          style={styles.atmRow}
          onPress={() => setCurrentView('atm_options')}
        >
          <AppText style={{ color: themeColors.text, fontSize: 15, fontFamily: fontFamilyMedium }}>ATM Options</AppText>
          <FastImage source={right_ic} style={{ width: 16, height: 16 }} tintColor={themeColors.secondaryText} resizeMode="contain" />
        </TouchableOpacity>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={[styles.footer, { backgroundColor: isDark ? '#1C1D21' : '#FFF', borderTopColor: themeColors.themeBorderColor || '#EAEAEA' }]}>
        <TouchableOpacity style={[styles.footerBtn, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' }]} onPress={handleClose}>
          <AppText style={{ color: themeColors.secondaryText, fontSize: 16, fontFamily: fontFamilySemiBold }}>Reset</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.footerBtn, { backgroundColor: '#222' }]} onPress={handleClose}>
          <AppText style={{ color: '#FFF', fontSize: 16, fontFamily: fontFamilySemiBold }}>Confirm</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAtmOptionsView = () => (
    <View style={styles.sheetContent}>
      {/* Header */}
      <View style={[styles.header, { justifyContent: 'space-between', paddingTop: 20 }]}>
        <TouchableOpacity onPress={() => setCurrentView('settings')} style={{ padding: 4, }}>
          <FastImage source={back_ic} style={{ width: 20, height: 20 }} tintColor={themeColors.text} resizeMode="contain" />
        </TouchableOpacity>
        <AppText style={{ fontFamily: fontFamilySemiBold, fontSize: 18, color: themeColors.text, marginRight: 20 }}>ATM Options</AppText>
        <View></View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} >
        {coins.map((coin, i) => (
          <TouchableOpacity key={i} style={styles.coinRow}>
            <AppText style={{ color: themeColors.text, fontSize: 15, fontFamily: fontFamilyMedium }}>{coin}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppText style={{ color: themeColors.secondaryText, fontSize: 14, marginRight: 4 }}>All</AppText>
              <FastImage source={right_ic} style={{ width: 12, height: 12 }} tintColor={themeColors.secondaryText} resizeMode="contain" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={[
          styles.sheetContainer,
          { backgroundColor: isDark ? '#313142ff' : '#FFF' },
          currentView === 'atm_options' ? { flex: 1, borderTopLeftRadius: 0, borderTopRightRadius: 0 } : { maxHeight: SCREEN_HEIGHT * 0.8 }
        ]}>
          {/* Drag Handle (Only for bottom sheet) */}
          {currentView === 'settings' && (
            <View style={styles.handleContainer}>
              <View style={[styles.handle, { backgroundColor: themeColors.secondaryText || '#CCC' }]} />
            </View>
          )}

          {currentView === 'settings' ? renderSettingsView() : renderAtmOptionsView()}
        </View>
      </View>
    </Modal>
  );
};

export default OptionsSettingsSheet;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.5,
  },
  sheetContent: {
    // flex: 1 removed so it wraps content
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    // paddingBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 10,
    justifyContent: 'space-between',
    paddingBottom: 32, // Safe area for iPhone
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  coinRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  }
});
