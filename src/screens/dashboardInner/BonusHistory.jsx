import { StyleSheet, View } from 'react-native';
import React from 'react';
import FastImage from 'react-native-fast-image';
import { folder } from '../../helper/ImageAssets';
import { useTheme } from '../../hooks/useTheme';
import { AppText } from '../../shared';

const BonusHistory = () => {
  const { colors: themeColors } = useTheme();

  return (
    <View style={[{ marginVertical: 20, borderRadius: 10 }]}>
      <AppText style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 10, color: themeColors.text }}>
        Bonus History
      </AppText>
      <View
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2,
          backgroundColor: themeColors.background,
          borderRadius: 10,
          paddingHorizontal: 10,
          borderWidth: 1,
          borderColor: themeColors.border,
        }}>
        <View
          style={{
            flexDirection: 'row',
            paddingVertical: 13,
            borderBottomWidth: 1,
            borderColor: themeColors.border,
            justifyContent: 'space-evenly',
          }}>
          <AppText style={{ flex: 1, fontWeight: 'bold', color: themeColors.text, fontSize: 12, marginRight: 20 }}>
            Registration Time(UTC)
          </AppText>
          <AppText style={{ flex: 1, fontWeight: 'bold', color: themeColors.text, fontSize: 12 }}>
            UID
          </AppText>
          <AppText style={{ flex: 1, fontWeight: 'bold', color: themeColors.text, fontSize: 12 }}>
            Advance KYC Tim
          </AppText>
        </View>

        <View style={{ alignItems: 'center', paddingVertical: 70, justifyContent: 'center' }}>
          <FastImage source={folder} style={{ width: 80, height: 80, marginBottom: 10 }} />
          <AppText style={{ color: themeColors.secondaryText }}>No Data</AppText>
        </View>
      </View>
    </View>
  );
};

export default BonusHistory;

const styles = StyleSheet.create({});