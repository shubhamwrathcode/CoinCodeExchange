import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { AppText, BOLD, SEMI_BOLD, TWELVE, SIXTEEN } from '../../../shared';
import FastImage from 'react-native-fast-image';
import { agceLogoName, antiphising3d } from '../../../helper/ImageAssets';
import { colors } from '../../../theme/colors';

const AgceGoldCard = ({ code = 'X X X X X X', isDark }) => {
  return (
    <View style={[styles.cardContainer, { backgroundColor: isDark ? colors.inputBorder : '#FFFFFF', borderColor: isDark ? '#2D2D30' : '#E5E5EA' }]}>
      {/* Top Gold Border */}
      <View style={styles.topGoldBorder} />

      <View style={styles.cardContent}>
        {/* Left Section */}
        <View style={styles.leftSection}>
          <View style={styles.logoRow}>
            {/* Calligraphic/Serif "A" Logo */}
            <FastImage source={agceLogoName} style={{ width: 100, height: 45 }} resizeMode='contain' />
          </View>

          <AppText type={TWELVE} style={[styles.codeLabel, {
            color: colors.white
          }]}>
            Anti-Phishing Code
          </AppText>

          <AppText weight={BOLD} style={styles.codeValue}>
            {code}
          </AppText>
        </View>

        {/* Right Section: Gold Badge Checkmark */}
        <View style={styles.rightSection}>
          <FastImage resizeMode='contain' source={antiphising3d} style={{ width: 100, height: 100 }} />
        </View>
      </View>
    </View>
  );
};

export default AgceGoldCard;

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    overflow: 'hidden',

  },
  topGoldBorder: {
    height: 4,
    backgroundColor: '#D1AA67',
    width: '100%',
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    alignItems: 'center',
  },
  leftSection: {
    flex: 1,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoLetter: {
    fontSize: 22,
    color: '#D1AA67',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginRight: 6,
    transform: [{ scaleY: 1.1 }],
  },
  logoText: {
    fontSize: 18,
    letterSpacing: 0.5,
  },
  codeLabel: {
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 18,
    color: '#D1AA67',
    letterSpacing: 2,
  },
  rightSection: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeWrapper: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeHexagon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(209, 170, 103, 0.1)',
    borderWidth: 1.5,
    borderColor: '#D1AA67',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '45deg' }],
  },
  checkmark: {
    color: '#D1AA67',
    fontSize: 20,
    fontWeight: 'bold',
    transform: [{ rotate: '-45deg' }],
  },
});
