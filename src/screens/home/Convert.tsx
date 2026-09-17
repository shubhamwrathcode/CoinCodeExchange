import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import FastImage from 'react-native-fast-image';
import { TextInput } from 'react-native-gesture-handler';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  AppSafeAreaView,
  AppText,
  BOLD,
  Button,
  FIFTEEN,
  FOURTEEN,
  NORMAL,
  SECOND,
  SIXTEEN,
  Toolbar,
  WHITE,
} from '../../shared';
import { conversion } from '../../actions/homeActions';
import { BASE_URL } from '../../helper/Constants';
import {
  RECYCLE,
  bitcoinIcon,
  convertTo,
  downIcon,
  equals,
} from '../../helper/ImageAssets';
import { colors } from '../../theme/colors';
import {
  universalPaddingHorizontal,
  universalPaddingHorizontalHigh,
  universalPaddingTop,
} from '../../theme/dimens';
import KeyBoardAware from '../../shared/components/KeyboardAware';
import { commonStyles } from '../../theme/commonStyles';
import { fontFamily } from '../../theme/typography';
import RbSheet from '../../shared/components/RbSheet';
import { SpinnerSecond } from '../../shared/components/SpinnerSecond';
import { toFixedFive, toFixedThree } from '../../helper/utility';

const Convert = () => {
  const dispatch = useAppDispatch();
  const coinData = useAppSelector(state => state.home.coinList);
  const refRBSheet = useRef(null);
  const [firstCoin, setFirstCoin] = useState();
  const [secondCoin, setSecondCoin] = useState();
  const [firstValue, setFirstValue] = useState('1');
  const [firstPrice, setFirstPrice] = useState('');
  const [selectCoin, setSelectCoin] = useState<number>();
  const [hideCoin, setHideCoin] = useState('');
  const [from, setfrom] = useState('');

  const Conversion = useAppSelector(state => state.home.conversion);

  useEffect(() => {
    if (coinData?.length !== 0) {
      setFirstCoin(coinData[0]);
      setSecondCoin(coinData[1]);
    }
  }, [coinData]);

  useEffect(() => {
    if (firstCoin && secondCoin) {
      let data = {
        base_currency: firstCoin?.short_name,
        quote_currency: secondCoin?.short_name,
        side: 'SELL',
        amount: 1,
      };
      dispatch(conversion(data));
    }
  }, [firstValue, firstCoin, secondCoin]);

  useEffect(() => {
    if (Conversion) {
      let temp = Number(Conversion) * Number(firstValue);
      setFirstPrice(toFixedFive(temp)?.toString());
    } else setFirstPrice('');
  }, [Conversion, firstValue]);

  const onchange = coinsNum => {
    setFirstValue(coinsNum);
  };

  const handleFrom = type => {
    if (type === 1) {
      setHideCoin(secondCoin?.short_name);
    } else {
      setHideCoin(firstCoin?.short_name);
    }
    refRBSheet?.current?.open();
    setfrom('dropdown');
    setSelectCoin(type);
  };

  const handleTo = () => {
    console.log('Hellooo')
    refRBSheet?.current?.open();
    setfrom('orderConfirm');
  };
  return (
    <AppSafeAreaView>
      <Toolbar title="Convert" isSecond isFourth />
      <KeyBoardAware>
        <View style={styles.container_one}>
          <View style={commonStyles.rowSpace}>
            <AppText color={SECOND}>From</AppText>
            <AppText>
              Balance: <AppText color={SECOND}>00000</AppText>
            </AppText>
          </View>

          <View style={styles.first}>
            <View style={styles.topLeft}>
              <FastImage
                source={{ uri: `${BASE_URL}${firstCoin?.icon_path}` }}
                // source={bitcoinIcon}
                style={styles.coinIcon}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.selectCoinTouch}
                onPress={() => {
                  handleFrom(1);
                }}>
                <View style={styles.third}>
                  <View style={styles.fourth}>
                    <AppText type={SIXTEEN} weight={BOLD}>
                      {firstCoin?.short_name}
                    </AppText>

                    <FastImage
                      source={downIcon}
                      resizeMode="contain"
                      style={styles.upArrow}
                      tintColor={colors.white}
                    />
                  </View>

                  <AppText color={SECOND} type={FOURTEEN}>
                    {firstCoin?.name}
                  </AppText>
                </View>
              </TouchableOpacity>
            </View>
            <View style={[styles.topRight, { backgroundColor: "#27282C" }]}>
              <TextInput
                keyboardType="numeric"
                value={firstValue}
                onChangeText={coinsNum => {
                  onchange(coinsNum);
                }}
                style={styles.coinInput}
              />
              <View>
                <AppText
                  type={FIFTEEN}
                  weight={NORMAL}
                  color={SECOND}
                  style={styles.secondName}>
                  {firstCoin?.short_name}
                </AppText>
              </View>
            </View>
          </View>
          <AppText style={{ alignSelf: "flex-end", marginRight: 15, bottom: 15 }} color={SECOND} type={FOURTEEN}>
            $10
          </AppText>

        </View>
        <View style={[styles.convertToIconContainer]}>
          <FastImage source={convertTo} tintColor={colors.black} style={styles.convertToIcon} />
        </View>
        <View style={styles.container_two}>
          <View style={commonStyles.rowSpace}>
            <AppText color={SECOND}>To</AppText>
            <AppText>
              Balance: <AppText color={SECOND}>00000</AppText>
            </AppText>
          </View>

          <View style={styles.first}>
            <View style={styles.topLeft}>
              <FastImage
                source={{ uri: `${BASE_URL}${secondCoin?.icon_path}` }}
                // source={bitcoinIcon}
                style={styles.coinIcon}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.selectCoinTouch}
                onPress={() => {
                  handleFrom(2);
                }}>
                <View style={styles.third}>
                  <View style={styles.fourth}>
                    <AppText type={SIXTEEN} weight={BOLD}>
                      {secondCoin?.short_name}
                    </AppText>
                    <FastImage
                      source={downIcon}
                      resizeMode="contain"
                      style={styles.upArrow}
                      tintColor={colors.white}
                    />
                  </View>

                  <AppText color={SECOND} type={FOURTEEN}>
                    {secondCoin?.name}
                  </AppText>
                </View>
              </TouchableOpacity>
            </View>
            <View style={[styles.topRight, { backgroundColor: '#23262F' }]}>
              <TextInput
                keyboardType="numeric"
                value={firstPrice}
                onChangeText={coinsNum => {
                  onchange(coinsNum);
                }}
                style={styles.coinInput}
              // editable={false}
              />
              <View>
                <AppText
                  type={FIFTEEN}
                  weight={NORMAL}
                  color={SECOND}
                  style={styles.secondName}>
                  {secondCoin?.short_name}
                </AppText>
              </View>
            </View>
          </View>
        </View>
        {/* <AppText>ssjkxaskhn</AppText> */}
        {!Conversion ? (
          <View style={[commonStyles.rowCenter]}>
            <AppText color={SECOND} type={FOURTEEN}>{`1 ${firstCoin?.short_name}`}</AppText>
            <FastImage
              style={styles.equals}
              source={equals}
              resizeMode="contain"
            />
            <AppText color={SECOND} type={FOURTEEN}>{`${toFixedFive(Conversion)}${secondCoin?.short_name
              }`}</AppText>

            <FastImage
              tintColor={SECOND}
              style={{
                height: 15,
                width: 15,
                marginHorizontal: 5,
              }}
              source={RECYCLE}
              resizeMode="contain"
            />
          </View>
        ) : (
          <></>
        )}
      </KeyBoardAware>
      <Button
        children="Continue"
        onPress={() => handleTo()}
        containerStyle={styles.button}
      // disabled={!Conversion}
      />

      <RbSheet
        rbref={refRBSheet}
        name={from}
        setCoin={selectCoin === 1 ? setFirstCoin : setSecondCoin}
        hideCoin={hideCoin}
        data={{
          img1: { uri: `${BASE_URL}${firstCoin?.icon_path}` },
          img2: { uri: `${BASE_URL}${secondCoin?.icon_path}` },
          coin1: firstCoin?.short_name,
          coin2: secondCoin?.short_name,
          coinQuantity: firstValue,
          coinValue: Conversion / firstValue,
          firstPrice: firstPrice,
        }}
      />
      <SpinnerSecond />
    </AppSafeAreaView>
  );
};

export default Convert;
const styles = StyleSheet.create({
  container_one: {
    backgroundColor: colors.white_fifteen,
    paddingHorizontal: universalPaddingHorizontal,
    paddingVertical: universalPaddingHorizontalHigh,
    marginTop: universalPaddingTop,
    borderRadius: 10,
  },
  first: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinIcon: {
    height: 40,
    width: 40,
  },
  selectCoinTouch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upArrow: {
    height: 10,
    width: 10,
    marginLeft: 10,
  },

  topRight: {
    width: 160,
    height: 35,
    borderWidth: 1,
    borderRadius: 20,
    borderColor: colors.inputBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    backgroundColor: colors.inputBackground,
  },
  coinInput: {
    height: 50,
    fontSize: 14,
    color: colors.white,
    width: '70%',
    fontFamily: fontFamily,
  },
  secondName: {},
  convertToIcon: {
    height: 18,
    width: 18,
    alignSelf: 'center',
  },
  convertToIconContainer: {
    backgroundColor: colors.buttonBg,
    borderWidth: 2,
    borderColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    width: 40,
    position: 'absolute',
    borderRadius: 80,
    top: 150,
    alignSelf: 'center',
    zIndex: 1000,
  },
  container_two: {
    backgroundColor: colors.white_fifteen,
    paddingHorizontal: universalPaddingHorizontal,
    paddingVertical: universalPaddingHorizontalHigh,
    marginVertical: 10,
    borderRadius: 10,
  },

  third: {
    marginStart: 10,
  },
  fourth: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    // margin: universalPaddingHorizontalHigh,
    marginHorizontal: 20,
    marginBottom: 40
  },
  equals: {
    height: 12,
    width: 12,
    marginHorizontal: 5,
  },
});
