import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import FastImage from 'react-native-fast-image';
import { back_ic } from '../../helper/ImageAssets';
import NavigationService from '../../navigation/NavigationService';
import { colors } from '../../theme/colors';
import { AppText, SIXTEEN, SEMI_BOLD } from '../AppText';

const KycHeader = ({ title, onBackPress }) => {
  const handleBack = onBackPress || (() => NavigationService.goBack());

  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBack}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <FastImage
          source={back_ic}
          style={styles.backIcon}
          tintColor={colors.black}
          resizeMode="contain"
        />
      </TouchableOpacity>

      <View style={styles.titleContainer}>
        <AppText type={SIXTEEN} weight={SEMI_BOLD} style={styles.titleText}>
          {title}
        </AppText>
      </View>

      <View style={styles.placeholder} />
    </View>
  );
};

export default KycHeader;

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 0 : 10,
    height: 56,
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  titleText: {
    color: colors.black,
  },
  placeholder: {
    width: 40,
  },
});
