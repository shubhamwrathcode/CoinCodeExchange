import React, { useEffect, useState } from 'react';
import {
  AppSafeAreaView,
  AppText,
  Button,
  SEMI_BOLD,
  SIXTEEN,
  Toolbar,
} from '../../shared';
import {
  appBg,
  loginDarkBg,
  back_ic,
  bitcoinIcon,
  bnbIcon,
  checkIcon,
  HomeBg,
  rupeeIcon,
  tetherIcon,
  checkIc,
} from '../../helper/ImageAssets';
import KeyBoardAware from '../../shared/components/KeyboardAware';
import TouchableOpacityView from '../../shared/components/TouchableOpacityView';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme/colors';
import { useTheme } from '../../hooks/useTheme';
import {
  borderWidth,
  universalPaddingHorizontal,
  universalPaddingHorizontalHigh,
  universalPaddingTop,
} from '../../theme/dimens';
import FastImage from 'react-native-fast-image';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { changeCurrencyPreference } from '../../actions/accountActions';
import { SpinnerSecond } from '../../shared/components/SpinnerSecond';
import { showError } from '../../helper/logger';
import { errorText } from '../../helper/Constants';
import { TouchableOpacity } from 'react-native-gesture-handler';
import NavigationService from '../../navigation/NavigationService';
import { authStyles } from '../auth/authStyles';

const CurrencyPreference = () => {
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const userData = useAppSelector(state => state.auth.userData);
  const { currency_prefrence } = userData ?? '';
  const [currency, setCurrency] = useState(currency_prefrence);
  const data = [
    {
      name: 'USDT',
      title: 'Tether USD (USDT)',
      src: tetherIcon,
      key: 1,
    },

    {
      name: 'BTC',
      title: 'BitCoin (BTC)',
      src: bitcoinIcon,
      key: 2,
    },

    // {
    //   name: 'INR',
    //   title: 'Rupee (INR)',
    //   src: rupeeIcon,
    //   key: 3,
    // },

    {
      name: 'BNB',
      title: 'BNB',
      src: bnbIcon,
      key: 4,
    },
  ];
  useEffect(() => {
    setCurrency(currency_prefrence);
  }, [currency_prefrence]);

  const onSubmit = () => {
    // if (currency_prefrence === currency) {
    //   showError(errorText.currency);
    //   return;
    // }
    const _data = {
      currency: currency,
    };

    dispatch(changeCurrencyPreference(_data));
  };
  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background, flex: 1 }}>
      <KeyBoardAware >
        <View style={{ flexDirection: "row", justifyContent: "space-between", width: "65%", marginTop: 20, marginHorizontal: 10 }}>
          <TouchableOpacity onPress={() => NavigationService.goBack()}>
            <FastImage source={back_ic} resizeMode="contain" style={{ width: 20, height: 20 }} tintColor={themeColors.text} />
          </TouchableOpacity>
          <AppText weight={SEMI_BOLD} type={SIXTEEN}>Currency Preference</AppText>
        </View>
        <View style={[authStyles.card, { margin: 20, backgroundColor: themeColors.card }]}>
          {data?.map(e => {
            return (
              <TouchableOpacityView
                onPress={() => setCurrency(e.name)}
                style={[styles.singleBox, { backgroundColor: themeColors.themeElevationColor }, e.name === currency && { borderWidth: borderWidth, borderColor: themeColors.button }]}
                key={e.key?.toString()}>
                <View style={styles.singleBoxSecond}>
                  <FastImage
                    source={e?.src}
                    resizeMode="contain"
                    style={styles.icon}
                  />
                  <AppText weight={SEMI_BOLD}>{e?.title}</AppText>
                </View>
                {e.name === currency && (
                  <View style={styles.rightIcContainer}>
                    <FastImage
                      source={checkIc}
                      resizeMode="contain"
                      style={styles.rightIc}
                      tintColor={colors.white}
                    />
                  </View>
                )}
              </TouchableOpacityView>
            );
          })}
          <Button
            children="Save Changes"
            onPress={() => onSubmit()}
            containerStyle={styles.button}
          />
        </View>


      </KeyBoardAware>
      <SpinnerSecond />
    </AppSafeAreaView>
  );
};

export default CurrencyPreference;

const styles = StyleSheet.create({
  singleBox: {
    paddingHorizontal: universalPaddingHorizontalHigh,
    marginVertical: universalPaddingHorizontal,
    paddingVertical: universalPaddingHorizontal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // borderWidth: borderWidth,
    // borderColor: colors.inputBorder,
    borderRadius: 10,
    // marginHorizontal: universalPaddingHorizontalHigh,
  },
  container: {
    paddingTop: universalPaddingTop,
    paddingHorizontal: 0,
    marginTop: 20
  },
  icon: {
    height: 22,
    width: 22,
    marginEnd: 10,
  },
  singleBoxSecond: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: { marginVertical: 20, marginHorizontal: universalPaddingHorizontalHigh },
  rightIc: {
    height: 10,
    width: 10,
  },
  rightIcContainer: {
    height: 20,
    width: 20,
    position: 'absolute',
    right: -5,
    top: -8,
    backgroundColor: colors.buttonBg,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center"
  },
});
