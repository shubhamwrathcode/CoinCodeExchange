import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import FastImage from 'react-native-fast-image';
import { AppText } from '../../../common';
import { useTheme } from '../../../hooks/useTheme';
import { fontFamilyMedium, fontFamilySemiBold, fontFamilyBold } from '../../../theme/typography';
import { colors } from '../../../theme/colors';
import { bitcoinIcon, downIcon, historyIcon } from '../../../helper/ImageAssets';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../../store/hooks';
import { showError } from '../../../helper/logger';
import { LOGIN_SCREEN } from '../../../navigation/routes';

const OptionsStrategies = () => {
  const { colors: themeColors, isDark } = useTheme();
  const navigation = useNavigation();
  const userData = useAppSelector((state) => state.auth.userData);

  const [activeStrategyTab, setActiveStrategyTab] = useState(0);
  const strategyTabs = ['Dip Sniper', 'Peak Sniper', 'Buy Low', 'Sell High'];

  const [activeFilterTab, setActiveFilterTab] = useState(0);
  const filterTabs = ['Recommended', 'High Guaranteed %', 'High Discount'];

  // Dummy data for cards
  const cardsData = [
    {
      id: 1,
      title: 'Buy BTC Dips at 73,500',
      apr: '74.40%',
      discount: '0.43%',
      guaranteed: '46.33%',
      maturity: '1 Day (2026-05-31)'
    },
    {
      id: 2,
      title: 'Buy BTC Dips at 73,500',
      apr: '57.43%',
      discount: '0.43%',
      guaranteed: '35.76%',
      maturity: '1 Day (2026-05-30)'
    }
  ];

  return (
    <View style={styles.container}>
      {/* Strategy Tabs */}
      <View style={styles.strategyTabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strategyTabsScroll}>
          {strategyTabs.map((tab, index) => {
            const isActive = activeStrategyTab === index;
            return (
              <TouchableOpacity
                key={index}
                style={[styles.strategyTab, isActive && styles.strategyTabActive]}
                onPress={() => setActiveStrategyTab(index)}
              >
                <AppText style={{
                  fontFamily: isActive ? fontFamilySemiBold : fontFamilyMedium,
                  fontSize: 15,
                  color: isActive ? themeColors.text : themeColors.secondaryText
                }}>
                  {tab}
                </AppText>
                {isActive && <View style={[styles.activeUnderline, { backgroundColor: themeColors.text }]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Coin Header Row */}
        <View style={styles.coinHeaderRow}>
          <View style={styles.coinTitleWrap}>
            <FastImage source={bitcoinIcon} style={styles.coinIcon} />
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppText style={{ fontSize: 18, fontFamily: fontFamilyBold, color: themeColors.text, marginRight: 6 }}>BTC/USDT</AppText>
              <FastImage source={downIcon} style={styles.downArrow} tintColor={themeColors.text} resizeMode="contain" />
            </TouchableOpacity>
          </View>
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

        <AppText style={[styles.descriptionText, { color: themeColors.secondaryText }]}>
          Secure discounted BTC purchases with no trading fees at settlement.
        </AppText>

        {/* Filter Tabs */}
        <View style={styles.filterTabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsScroll}>
            {filterTabs.map((tab, index) => {
              const isActive = activeFilterTab === index;
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.strategyTab, isActive && styles.strategyTabActive]}
                  onPress={() => setActiveFilterTab(index)}
                >
                  <AppText style={{
                    fontFamily: isActive ? fontFamilySemiBold : fontFamilyMedium,
                    fontSize: 14,
                    color: isActive ? themeColors.text : themeColors.secondaryText
                  }}>
                    {tab}
                  </AppText>
                  {isActive && <View style={[styles.activeUnderline, { backgroundColor: themeColors.text }]} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Cards List */}
        <View style={styles.cardsContainer}>
          {cardsData.map((card) => (
            <View key={card.id} style={[styles.strategyCard, { backgroundColor: isDark ? '#1C1D21' : '#F9F9FA' }]}>

              <View style={styles.cardHeader}>
                <AppText style={{ fontSize: 16, fontFamily: fontFamilySemiBold, color: themeColors.text }}>{card.title}</AppText>
                <TouchableOpacity style={styles.buyBtn}>
                  <AppText style={{ color: '#FFF', fontSize: 12, fontFamily: fontFamilyMedium }}>Buy now</AppText>
                </TouchableOpacity>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statCol}>
                  <AppText style={styles.statLabel}>Est. APR</AppText>
                  <AppText style={[styles.statValue, { color: themeColors.text }]}>{card.apr}</AppText>
                </View>
                <View style={styles.statColCenter}>
                  <AppText style={styles.statLabel}>Discount</AppText>
                  <AppText style={[styles.statValue, { color: themeColors.text }]}>{card.discount}</AppText>
                </View>
                <View style={styles.statColRight}>
                  <AppText style={styles.statLabel}>Guaranteed to buy</AppText>
                  <AppText style={[styles.statValue, { color: themeColors.text }]}>{card.guaranteed}</AppText>
                </View>
              </View>

              <View style={styles.footerRow}>
                <AppText style={styles.footerLabel}>Maturity</AppText>
                <AppText style={[styles.footerValue, { color: themeColors.text }]}>{card.maturity}</AppText>
              </View>

            </View>
          ))}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

export default OptionsStrategies;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  strategyTabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 10,
  },
  filterTabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 10,
  },
  strategyTabsScroll: {
    paddingHorizontal: 16,
    gap: 15,
  },
  filterTabsScroll: {
    gap: 15,
  },
  strategyTab: {
    paddingVertical: 10,
    position: 'relative',
  },
  activeUnderline: {
    position: 'absolute',
    bottom: -1,
    left: '50%',
    marginLeft: -15,
    width: 30,
    height: 3,
    borderRadius: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  coinHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  coinTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinIcon: {
    width: 28,
    height: 28,
    marginRight: 10,
  },
  downArrow: {
    width: 12,
    height: 12,
  },
  historyIcon: {
    width: 22,
    height: 22,
  },
  descriptionText: {
    fontSize: 13,
    fontFamily: fontFamilyMedium,
    lineHeight: 20,
    marginBottom: 12,
    paddingRight: 20,
  },
  cardsContainer: {
    gap: 12,
  },
  strategyCard: {
    borderRadius: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  buyBtn: {
    backgroundColor: '#2B2B36',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  statColCenter: {
    flex: 1,
    alignItems: 'center',
  },
  statColRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  statLabel: {
    color: '#999',
    fontSize: 12,
    fontFamily: fontFamilyMedium,
    marginBottom: 8,
    textAlign: 'right',
  },
  statValue: {
    fontSize: 16,
    fontFamily: fontFamilySemiBold,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    color: '#999',
    fontSize: 14,
    fontFamily: fontFamilyMedium,
  },
  footerValue: {
    fontSize: 14,
    fontFamily: fontFamilySemiBold,
  }
});
