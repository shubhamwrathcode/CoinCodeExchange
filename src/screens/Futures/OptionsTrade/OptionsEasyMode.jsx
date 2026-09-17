import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import FastImage from 'react-native-fast-image';
import { AppText } from '../../../common';
import { useTheme } from '../../../hooks/useTheme';
import { fontFamilyMedium, fontFamilySemiBold, fontFamilyBold } from '../../../theme/typography';
import { colors } from '../../../theme/colors';
import OptionsExpiries from './OptionsExpiries';
import { easyGraph, easyGraphArrow, easyGraphDownArrow, easyGraphDown, swapLight, transferIcon, upDown } from '../../../helper/ImageAssets';

const OptionsEasyMode = ({ expiries, selectedExpiry, setSelectedExpiry }) => {
  const { colors: themeColors, isDark } = useTheme();
  const [selectedTrend, setSelectedTrend] = useState(0); // 0 to 3

  const trends = [
    { id: 0, icon: easyGraph, tint: colors.green, size: 24 },
    { id: 1, icon: easyGraphArrow, tint: colors.green, size: 24 },
    { id: 2, icon: easyGraphDown, tint: colors.red, size: 24 },
    { id: 3, icon: easyGraphDownArrow, tint: colors.red, size: 24 }
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

      {/* Expectation Text */}
      <View style={styles.expectationRow}>
        <AppText style={{ fontSize: 18, color: themeColors.text, fontFamily: fontFamilySemiBold }}>
          If you expect BTC to <AppText style={{ fontSize: 18, color: selectedTrend < 2 ? colors.green : colors.red, fontFamily: fontFamilySemiBold }}>{selectedTrend < 2 ? 'rise' : 'fall'}</AppText>
        </AppText>
      </View>

      {/* Trend Buttons Row */}
      <View style={styles.trendsRow}>
        {trends.map((item) => {
          const isActive = selectedTrend === item.id;
          const borderColor = isActive ? item.tint : (isDark ? '#333' : '#EAEAEA');
          const borderWidth = isActive ? 1.5 : 1;

          let backgroundColor = 'transparent';
          if (isActive) {
            backgroundColor = item.id < 2 ? (isDark ? 'rgba(56, 183, 129, 0.15)' : '#ECFDF5') : (isDark ? 'rgba(235, 78, 92, 0.15)' : '#FEF2F2');
          }
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.trendBtn, { borderColor, borderWidth, backgroundColor }]}
              onPress={() => setSelectedTrend(item.id)}
            >
              <FastImage source={item.icon} style={{ width: item.size, height: item.size }} tintColor={item.tint} resizeMode="contain" />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Change Card */}
      <View style={styles.changeRow}>
        <View style={[styles.changeCard, { backgroundColor: isDark ? '#1C1D21' : '#F9F9F9' }]}>
          <AppText style={{ color: themeColors.secondaryText, fontSize: 12, marginBottom: 4 }}>Change (%)</AppText>
          <AppText style={{ color: themeColors.text, fontSize: 16, fontFamily: fontFamilySemiBold }}>+5.02% (76,998)</AppText>
        </View>
        <TouchableOpacity style={[styles.swapBtn, { backgroundColor: isDark ? '#1C1D21' : '#F9F9F9' }]}>
          <FastImage source={upDown} style={{ width: 25, height: 25 }} tintColor={themeColors.text} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      {/* Expiries */}
      <OptionsExpiries
        expiries={expiries}
        selectedExpiry={selectedExpiry}
        setSelectedExpiry={setSelectedExpiry}
      />

      {/* Recommendation Cards */}
      <View style={styles.cardsContainer}>

        {/* BUY CALL CARD */}
        <View style={styles.recCard}>
          <View style={styles.cardHeader}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppText style={{ fontSize: 16, fontFamily: fontFamilyBold, color: themeColors.text }}>Buy Call</AppText>
                <View style={[styles.badge, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}>
                  <AppText style={{ fontSize: 10, color: themeColors.secondaryText, fontFamily: fontFamilyMedium }}>UNLIMITED UPSIDE</AppText>
                </View>
              </View>
              <AppText style={{ color: themeColors.secondaryText, fontSize: 13, marginTop: 4 }}>Buy 74,000C</AppText>
            </View>
            <TouchableOpacity style={styles.tradeBtn}>
              <AppText style={{ color: '#FFF', fontSize: 12, fontFamily: fontFamilySemiBold }}>Trade</AppText>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={{ flex: 1 }}>
              <AppText style={styles.statLabel}>PnL at Expiry</AppText>
              <AppText style={[styles.statValue, { color: themeColors.text }]}>2,317.43%</AppText>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <AppText style={styles.statLabel}>Est. Profit at Expiry</AppText>
              <AppText style={[styles.statValue, { color: colors.green }]}>3,682</AppText>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <AppText style={styles.statLabel}>Max Loss</AppText>
              <AppText style={[styles.statValue, { color: colors.red }]}>158</AppText>
            </View>
          </View>

          {/* Graph Placeholder */}
          <View style={styles.graphPlaceholder}>
            {/* Horizontal zero line */}
            <View style={[styles.graphDashedLine, { borderTopColor: isDark ? '#444' : '#CCC' }]} />
            <View style={styles.graphDashedLineYellow} />
            {/* Upward lines representing payout */}
            <View style={styles.greenLine} />
            <View style={styles.redLine} />
          </View>
        </View>

        {/* SELL PUT CARD */}
        <View style={styles.recCard}>
          <View style={styles.cardHeader}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppText style={{ fontSize: 18, fontFamily: fontFamilyBold, color: themeColors.text }}>Sell Put</AppText>
                <View style={[styles.badge, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}>
                  <AppText style={{ fontSize: 10, color: themeColors.secondaryText, fontFamily: fontFamilyMedium }}>INCOME GENERATION</AppText>
                </View>
              </View>
              <AppText style={{ color: themeColors.secondaryText, fontSize: 13, marginTop: 4 }}>Sell 72,500P</AppText>
            </View>
            <TouchableOpacity style={styles.tradeBtn}>
              <AppText style={{ color: '#FFF', fontSize: 14, fontFamily: fontFamilySemiBold }}>Trade</AppText>
            </TouchableOpacity>
          </View>

          {/* Just to show content, repeating stats. Real data would differ. */}
          <View style={styles.statsRow}>
            <View style={{ flex: 1 }}>
              <AppText style={styles.statLabel}>Probability of Profit</AppText>
              <AppText style={[styles.statValue, { color: themeColors.text }]}>84.5%</AppText>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <AppText style={styles.statLabel}>Max Profit</AppText>
              <AppText style={[styles.statValue, { color: colors.green }]}>425</AppText>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <AppText style={styles.statLabel}>Max Loss</AppText>
              <AppText style={[styles.statValue, { color: colors.red }]}>72,075</AppText>
            </View>
          </View>

          <View style={styles.graphPlaceholder}>
            <View style={[styles.graphDashedLine, { borderTopColor: isDark ? '#444' : '#CCC' }]} />
          </View>
        </View>

      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

export default OptionsEasyMode;

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
  },
  expectationRow: {
    marginBottom: 10,
  },
  trendsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    // paddingHorizontal: 8,
  },
  trendBtn: {
    width: 55,
    height: 55,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 12,
  },
  changeCard: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 12,
    justifyContent: 'center',
  },
  swapBtn: {
    width: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardsContainer: {
    marginTop: 10,
    gap: 12,
  },
  recCard: {
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  tradeBtn: {
    backgroundColor: '#2B2B36', // Dark gray button from figma
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statLabel: {
    color: '#999',
    fontSize: 11,
    fontFamily: fontFamilyMedium,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontFamily: fontFamilySemiBold,
  },
  graphPlaceholder: {
    height: 100,
    position: 'relative',
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  graphDashedLine: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    width: '100%',
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  graphDashedLineYellow: {
    position: 'absolute',
    bottom: 20,
    left: '30%',
    width: '70%',
    borderTopWidth: 1,
    borderTopColor: '#D9A05B',
    borderStyle: 'dashed',
    transform: [{ rotate: '-25deg' }, { translateY: -40 }],
    opacity: 0.5,
  },
  greenLine: {
    position: 'absolute',
    bottom: 20,
    left: '20%',
    width: '80%',
    height: 2,
    backgroundColor: '#38B781',
    transform: [{ rotate: '-15deg' }, { translateY: -25 }],
  },
  redLine: {
    position: 'absolute',
    bottom: 20,
    left: '35%',
    width: '65%',
    height: 2,
    backgroundColor: '#EB4E5C',
    transform: [{ rotate: '-30deg' }, { translateY: -45 }],
  }
});
