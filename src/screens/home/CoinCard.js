import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import FastImage from 'react-native-fast-image';
import { AppText, BLACK, BOLD, FIFTEEN, FOURTEEN, GREEN, MEDIUM, RED, SEMI_BOLD, TEN, TWELVE } from '../../shared';
import { bitcoin_ic,  rectangleIcon } from '../../helper/ImageAssets';
import { colors } from '../../theme/colors';
import TouchableOpacityView from '../../shared/components/TouchableOpacityView';
import { commonStyles } from '../../theme/commonStyles';
import NavigationService from '../../navigation/NavigationService';
import { SPOT_MARKET_SCREEN, WALLET_SCREEN } from '../../navigation/routes';
import { BASE_URL } from '../../helper/Constants';
import { useAppSelector } from '../../store/hooks';

const WIDTH = Dimensions.get('window').width;

const CoinCard = ({ data }) => {
  const theme = useAppSelector(state => state.auth.theme);
  // console.log(data, "data");
  // const isBTC = currency === 'BTC';

  return (
    <TouchableOpacityView style={[theme !== "Dark" ? styles.container :styles.containerDark]} activeOpacity={0.7} onPress={()=> NavigationService.navigate(WALLET_SCREEN, { coinDetail: data })}>
     <View style={styles.containerSecond}>
        <View style={{borderRadius: 15, overflow: "hidden"}}>
        <FastImage
          resizeMode="contain"
          style={styles.coinLogo}
          source={{ uri: BASE_URL + data?.icon_path}}
        />
        
        </View>
        
        <FastImage
          resizeMode="contain"
          style={styles.graph}
          source={rectangleIcon}
          // tintColor={colors.buttonDarkBg}
        />
      </View>
      
      <View style={styles.containerThird}>
        <View style={commonStyles.flexRow}>
        <AppText type={FIFTEEN} color={BLACK} style={{marginVertical: 6}}>
            {/* {languageValidation(item.base_currency)}{' '} */}
            {data?.base_currency_fullname} <AppText type={TEN} style={{color: "#FFFFFFB2"}}>{data?.quote_currency}</AppText>
          </AppText>
          <AppText type={TEN} weight={MEDIUM} color={BLACK}>
            {/* {languageValidation(item.base_currency)}{' '} */}
            {data?.buy_price}
          </AppText>
          <AppText type={FOURTEEN} weight={SEMI_BOLD} color={data?.change_percentage < 0 ? RED : GREEN} style={{marginVertical: 6}}>
            {/* {languageValidation(item.base_currency)}{' '} */}
            {data?.change_percentage}%
          </AppText>
        </View>
        {/* <View style={commonStyles.rowCenter}>
          <FastImage
            resizeMode="contain"
            style={styles.arrow}
            source={getArrowIcon()}
          />
          <AppText
            style={[
              styles.pChange,
              item.change < 0 && {
                color: colors.red,
              },
            ]}>
            {toFixedThree(item?.change)}
          </AppText>
        </View> */}
      </View>
      <View style={{width: "100%", borderRadius: 45, alignItems: "center", height: 25,
         backgroundColor: colors.newThemeColor, alignSelf: "center", justifyContent: "center"}}>
        <AppText weight={SEMI_BOLD}>Trade</AppText>
      </View>
    </TouchableOpacityView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.themeElevationColor,
    padding: 12,
    borderRadius: 16,
    width: WIDTH * 0.42,
    // marginHorizontal: 5,
    borderColor: '#302F2F',
    borderWidth: 0.5,
    height: 160,
    justifyContent: 'space-between',
    overflow: "hidden"
  },
  containerDark: {
    backgroundColor: colors.themeElevationColor,
    padding: 12,
    borderRadius: 16,
    width: WIDTH * 0.42,
    // marginHorizontal: 5,
    borderColor: '#302F2F',
    borderWidth: 0.5,
    height: 160,
    justifyContent: 'space-between',
    overflow: "hidden"
  },
   coinLogo: {
    height: 30,
    width: 30,
  },
  graph: {
    position: "absolute",
    right: -31,
    top: -12,
    height: 100,
    width: 100,
    borderRadius: 20,
    // zIndex: 999,
  },
  // coinName: {},
  coinType: {
    marginLeft: 2,
  },
  pChange: {
    color: colors.green,
    fontSize: 8,
    marginLeft: 5,
  },
  containerSecond: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  containerThird: {flexDirection: 'row', justifyContent: 'space-between'},
  arrow: {
    height: 6,
    width: 6,
  },
});

export default CoinCard;
