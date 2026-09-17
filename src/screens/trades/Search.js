import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  AppSafeAreaView,
  AppText,
  FOURTEEN,
  MEDIUM,
  SECOND,
  SEMI_BOLD,
  SIXTEEN,
  SearchInput,
} from '../../shared';
import { useAppSelector } from '../../store/hooks';
import { useTheme } from '../../hooks/useTheme';
import { CoinCardProps, CoinDataProps } from '../../helper/types';
import { BASE_URL, placeHolderText } from '../../helper/Constants';
import { ImageBackground, Platform, StyleSheet, View } from 'react-native';
import KeyBoardAware from '../../shared/components/KeyboardAware';
import { Screen, universalPaddingHorizontalHigh } from '../../theme/dimens';
import TouchableOpacityView from '../../shared/components/TouchableOpacityView';
import NavigationService from '../../navigation/NavigationService';
import { NAVIGATION_BOTTOM_TAB_STACK, NAVIGATION_TRADE_STACK, TRADE_SCREEN, WALLET_SCREEN } from '../../navigation/routes';
import FastImage from 'react-native-fast-image';
import { checkValue, toFixedEight } from '../../helper/utility';
import { HomeBg } from '../../helper/ImageAssets';
import MarketList from '../other/MarketList';
import { SpinnerSecond } from '../../shared/components/SpinnerSecond';
import { colors } from '../../theme/colors';

const Search = () => {
  const { colors: themeColors, isDark } = useTheme();
  const hotCoins = useAppSelector(state => state.home.coinPairs);
  const theme = useAppSelector(state => state.auth.theme);
  const currency = useAppSelector(state => state.home.currency);
  const languages = useAppSelector(state => {
    return state.account.languages;
  });
  const [value, setValue] = useState('');
  const [list, setList] = useState([]);

  useEffect(() => {
    getData();
  }, [value]);

  const getData = () => {
    if (value === '') {
      setList(hotCoins);
    } else {
      let filterData = hotCoins.filter(data => {
        return (
          data?.base_currency?.toLowerCase().indexOf(value?.toLowerCase()) >
          -1 ||
          data?.quote_currency?.toLowerCase().indexOf(value?.toLowerCase()) > -1
        );
      });
      setList(filterData);
    }
  };

  const handleNavigate = (item) => {
    NavigationService.navigate(NAVIGATION_BOTTOM_TAB_STACK, {
      screen: TRADE_SCREEN,
      params: { coinDetail: item, path: "Spot" }
    });
  };


  return (
    <AppSafeAreaView style={{ backgroundColor: isDark? colors.newThemeColor: colors.white }}>
      <SearchInput
        cancelBtn={true}
        value={value}
        theme={isDark ? "Dark" : "Light"}
        onChangeText={setValue}
        placeholder={placeHolderText.search}
        autoCapitalize="none"
        returnKeyType="done"
        onSubmitEditing={() => getData()}
        // onFocus={true}
        containerStyle={{ paddingTop: Platform.OS === 'ios' ? 25 : 0, paddingHorizontal: 5, backgroundColor: colors.white, }}
        inputStyle={{}}
      />
      <KeyBoardAware>
        <AppText weight={SEMI_BOLD} type={SIXTEEN} style={[styles.text, { color: themeColors.text }]}>
          {checkValue(languages?.top_search)}
        </AppText>
        {/* {list?.map((item: CoinDataProps, index: number) => {
          return renderItem({item, index});
        })} */}
        <MarketList filterData={list} onPress={handleNavigate} />
      </KeyBoardAware>
      <SpinnerSecond />
      {/* </ImageBackground> */}
    </AppSafeAreaView>
  );
};

export default Search;
const styles = StyleSheet.create({
  imgBg: {
    width: Screen.Width, height: Screen.Height
  },
  text: {
    marginVertical: universalPaddingHorizontalHigh,
    paddingHorizontal: universalPaddingHorizontalHigh
  },
  coinContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coinLogo: {
    width: 34,
    height: 34,
    resizeMode: 'contain',
    marginEnd: 10,
  },
});
