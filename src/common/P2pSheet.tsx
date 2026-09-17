import React, {useEffect, useState} from 'react';
import {View} from 'react-native';
import {Screen} from '../theme/dimens';
import {AppText, SEMI_BOLD, TWELVE} from './AppText';
import FastImage from 'react-native-fast-image';
import {
  bitcoinIcon,
  downIcon,
  filterIcon,
  notifyIcon,
} from '../helper/ImageAssets';
import TouchableOpacityView from './TouchableOpacityView';

const P2pSheet = ({
  onCurrencyPress = () => {},
  onAmountPress = () => {},
  onPaymentPress = () => {},
  onFilterPress = () => {},

}) => {
  return (
    <View
      style={{
        width: Screen.Width,
        padding: 5,
        marginTop: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
      }}>
      <View style={{flexDirection: 'row', width: '80%'}}>
        <TouchableOpacityView
          style={{flexDirection: 'row', alignItems: 'center'}}
          onPress={onCurrencyPress}>
          <FastImage
            source={bitcoinIcon}
            style={{height: 15, width: 15}}
            resizeMode="contain"
          />
          <AppText
            type={TWELVE}
            weight={SEMI_BOLD}
            style={{marginHorizontal: 5}}>
            USDT
          </AppText>
          <FastImage
            source={downIcon}
            tintColor={'white'}
            style={{height: 10, width: 10}}
            resizeMode="contain"
          />
        </TouchableOpacityView>

        <TouchableOpacityView
          onPress={onAmountPress}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginHorizontal: 10,
          }}>
          <AppText
            type={TWELVE}
            weight={SEMI_BOLD}
            style={{marginHorizontal: 5}}>
            Amount
          </AppText>
          <FastImage
            source={downIcon}
            tintColor={'white'}
            style={{height: 10, width: 10}}
            resizeMode="contain"
          />
        </TouchableOpacityView>

        <TouchableOpacityView
          onPress={onPaymentPress}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginHorizontal: 10,
          }}>
          <AppText
            type={TWELVE}
            weight={SEMI_BOLD}
            style={{marginHorizontal: 5}}>
            Payment
          </AppText>
          <FastImage
            source={downIcon}
            tintColor={'white'}
            style={{height: 10, width: 10, marginLeft: 5}}
            resizeMode="contain"
          />
        </TouchableOpacityView>
      </View>
      <TouchableOpacityView onPress={onFilterPress}>
      <FastImage
        source={filterIcon}
        style={{height: 20, width: 20}}
        resizeMode="contain"
      />
        
        </TouchableOpacityView>

    </View>
  );
};

export {P2pSheet};
