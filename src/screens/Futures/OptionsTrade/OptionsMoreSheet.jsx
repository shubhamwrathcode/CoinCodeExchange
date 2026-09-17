import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { fontFamilyMedium, fontFamilySemiBold, fontFamilyBold } from '../../../theme/typography';
import FastImage from 'react-native-fast-image';
import { closeIcon, setting_icon, fee, telegram, testnet, NO_NOTIFICATION_ICON, NO_NOTIFICATION_ICON_LIGHT, learnVideo } from '../../../helper/ImageAssets';
import { AppText } from '../../../common';
import { colors, lightTheme } from '../../../theme/colors';

const OptionsMoreSheet = ({ visible, onClose }) => {
  const { colors: themeColors, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState(0);
  const tabs = ['Features', 'Learn', 'Options Events'];

  const features = [
    { label: 'Settings', icon: setting_icon },
    { label: 'Testnet', icon: testnet },
    { label: 'Fee', icon: fee },
    { label: 'Telegram', icon: telegram },
  ];

  const learnTags = ['Expiration Date', 'Strike Price', 'Buy/Sell', 'Call/Put'];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.background} />
        </TouchableWithoutFeedback>

        <View style={[styles.sheetContainer, { backgroundColor: themeColors.background }]}>

          {/* Header Row */}
          <View style={styles.headerRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
              {tabs.map((tab, index) => {
                const isActive = activeTab === index;
                return (
                  <TouchableOpacity key={index} style={styles.tabBtn} onPress={() => setActiveTab(index)}>
                    <AppText style={[styles.tabText, {
                      color: isActive ? themeColors.text : themeColors.secondaryText,
                      fontFamily: isActive ? fontFamilyBold : fontFamilySemiBold
                    }]}>
                      {tab}
                    </AppText>
                    {isActive && <View style={[styles.activeUnderline, { backgroundColor: isDark ? '#FFF' : '#000' }]} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

          </View>

          {/* Features Grid */}
          {activeTab === 0 && (
            <View style={styles.featuresContainer}>
              {features.map((feature, i) => (
                <TouchableOpacity key={i} style={styles.featureItem}>
                  <View style={[styles.iconCircle, {
                    backgroundColor: lightTheme.input,
                    borderColor: isDark ? '#333' : '#EAEAEA',
                    borderWidth: 1
                  }]}>
                    <FastImage source={feature.icon} style={styles.featureIcon} tintColor={themeColors.text} resizeMode="contain" />
                  </View>
                  <AppText style={[styles.featureLabel, { color: themeColors.text }]}>{feature.label}</AppText>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Learn Tab */}
          {activeTab === 1 && (
            <View style={styles.learnContainer}>
              <AppText style={[styles.learnTitle, { color: themeColors.text }]}>Understand Options Trading</AppText>
              
              <View style={styles.tagsWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsRow}>
                  {learnTags.map((tag, idx) => (
                    <View key={idx} style={[styles.tagBadge, { backgroundColor: isDark ? '#1C1D21' : '#F0F0F0' }]}>
                      <AppText style={[styles.tagText, { color: themeColors.text }]}>{tag}</AppText>
                    </View>
                  ))}
                </ScrollView>
              </View>

              <TouchableOpacity style={styles.videoContainer}>
                <FastImage source={learnVideo} style={styles.videoImg} resizeMode="contain" />
              </TouchableOpacity>
            </View>
          )}

          {/* Empty State for Options Events */}
          {activeTab === 2 && (
            <View style={styles.emptyContainer}>
              <FastImage
                source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT}
                style={styles.emptyIcon}
                resizeMode="contain"
              />
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
};

export default OptionsMoreSheet;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    height: 420,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tabsScroll: {
    gap: 20,
    paddingRight: 20,
  },
  tabBtn: {
    paddingTop: 10,
    paddingBottom: 15,
    position: 'relative',
  },
  tabText: {
    fontSize: 16,
  },
  activeUnderline: {
    position: 'absolute',
    bottom: -1,
    alignSelf: 'center',
    width: 20,
    height: 3,
    borderRadius: 2,
  },
  closeBtn: {
    padding: 8,
    marginLeft: 10,
  },
  closeIcon: {
    width: 16,
    height: 16,
  },
  featuresContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 30,
  },
  featureItem: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    width: 25,
    height: 25,
  },
  featureLabel: {
    fontSize: 12,
    fontFamily: fontFamilySemiBold,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fontFamilyMedium,
  },
  learnContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  learnTitle: {
    fontSize: 18,
    fontFamily: fontFamilyBold,
    marginBottom: 16,
  },
  tagsWrapper: {
    marginHorizontal: -20,
    marginBottom: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
  },
  tagBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 13,
    fontFamily: fontFamilyMedium,
  },
  videoContainer: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
  },
  videoImg: {
    width: '100%',
    height: '100%',
  }
});
