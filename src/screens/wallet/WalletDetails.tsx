import React, { useEffect, useState } from 'react';
import {
  AppSafeAreaView,
  AppText,
  BLACK,
  EIGHTEEN,
  FIFTEEN,
  FOURTEEN,
  SECOND,
  SEMI_BOLD,
  SIXTEEN,
  TEN,
  TWENTY_FOUR,
  Toolbar,
  TWENTY,
} from '../../shared';
import { useRoute } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import KeyBoardAware from '../../shared/components/KeyboardAware';
import { StyleSheet, View } from 'react-native';
import {
  calculateDifference,
  calculatePrice,
  dateFormatter,
  depositWithdrawColor,
  numberColor,
  toFixedThree,
  twoFixedZero,
  twoFixedTwo,
} from '../../helper/utility';
import {
  borderWidth,
  buttonHeight,
  universalPaddingHorizontal,
  universalPaddingHorizontalHigh,
  universalPaddingTop,
} from '../../theme/dimens';
import moment from 'moment';
import TouchableOpacityView from '../../shared/components/TouchableOpacityView';
import FastImage from 'react-native-fast-image';
import { depositIconWallet, HomeBg } from '../../helper/ImageAssets';
import { colors } from '../../theme/colors';
import { Circle } from 'react-native-svg';
import { AreaChart } from 'react-native-svg-charts';
import { HistoricDataProps } from '../../helper/types';
import { SpinnerSecond } from '../../shared/components/SpinnerSecond';
import {
  getTransactionHistory,
  getCoinDetails,
} from '../../actions/walletActions';
import { WalletHistoryRender } from './Wallet';
import { setSelectedWalletHistory } from '../../slices/walletSlice';
import NavigationService from '../../navigation/NavigationService';
import {
  DEPOSIT_INR_SCREEN,
  DEPOSIT_SCREEN,
  WALLET_HISTORY_DETAILS_SCREEN,
  WITHDRAW_INR_SCREEN,
  WITHDRAW_SCREEN,
} from '../../navigation/routes';
import { ListEmptyComponent } from '../home/MarketCoinList';
import { showError } from '../../helper/logger';
import { useTheme } from '../../hooks/useTheme';

// export const Dots = props => {
//   const {x, y, data} = props;
//   return (
//     <>
//       {data?.map((value, index) => (
//         <Circle
//           key={index}
//           cx={x(index)}
//           cy={y(value)}
//           r={4}
//           stroke={colors.red}
//           fill={colors.red}
//         />
//       ))}
//     </>
//   );
// };

// const ChartButton = ({onPress, title, isSelected}) => {
//   return (
//     <TouchableOpacityView
//       onPress={onPress}
//       style={isSelected ? styles.selectedButton : styles.unSelectedButton}>
//       <AppText color={isSelected ? BLACK : WHITE}>{title}</AppText>
//     </TouchableOpacityView>
//   );
// };

const WalletDetails = () => {
  const { colors: themeColors, theme, isDark } = useTheme();
  const route = useRoute();
  const dispatch = useAppDispatch();
  const coinData = useAppSelector(state => state.home.coinData);
  // const transactionHistory = useAppSelector(
  //   state => state.wallet.transactionHistory,
  // );
  // const fiveDaySymbolData = useAppSelector(
  //   state => state.home.fiveDaySymbolData,
  // );
  // const oneMonthSymbolData = useAppSelector(
  //   state => state.home.oneMonthSymbolData,
  // );
  // const ThreeMonthSymbolData = useAppSelector(
  //   state => state.home.ThreeMonthSymbolData,
  // );
  // const oneYearSymbolData = useAppSelector(
  //   state => state.home.oneYearSymbolData,
  // );
  // const fiveYearSymbolData = useAppSelector(
  //   state => state.home.fiveYearSymbolData,
  // );
  const detail = route?.params?.item ?? '';
  const { balance, currency, short_name, currency_id } = detail ?? '';

  const [currencyDetail, setCurrencyDetail] = useState(undefined);
  // const [selectedTime, setSelectedTime] = useState('5D');
  // const [data, setData] = useState<HistoricDataProps[]>([]);
  const { buy_price, change, high, low, createdAt } = currencyDetail ?? '';

  useEffect(() => {
    let _currency = coinData.find(e => {
      return e.base_currency_id === currency_id;
    });
    setCurrencyDetail(_currency);
  }, [coinData]);

  // useEffect(() => {
  //   if (short_name) {
  //     dispatch(getTransactionHistory(short_name));
  //   }
  // }, [short_name]);

  // useEffect(() => {
  //   if (selectedTime === '5D') {
  //     setData(fiveDaySymbolData);
  //     return;
  //   }
  //   if (selectedTime === '1M') {
  //     setData(oneMonthSymbolData);
  //     return;
  //   }
  //   if (selectedTime === '3M') {
  //     setData(ThreeMonthSymbolData);
  //     return;
  //   }
  //   if (selectedTime === '1Y') {
  //     setData(oneYearSymbolData);
  //     return;
  //   }
  //   if (selectedTime === '5Y') {
  //     setData(fiveYearSymbolData);
  //     return;
  //   }
  // }, [selectedTime]);

  const onDeposit = (id: any) => {
    let data = {
      currency_id: id,
    };
    dispatch(getCoinDetails(data, "deposit"));
    // if (coinDetails?.deposit_status === 'ACTIVE') {
    //   short_name === 'INR'
    //     ? NavigationService.navigate(DEPOSIT_INR_SCREEN, {walletDetail: coinDetails})
    //     : NavigationService.navigate(DEPOSIT_SCREEN, {walletDetail: coinDetails});
    // } else {
    //   showError('Deposit is Disable for Now');
    // }
  };
  const onWidthDraw = (id: any) => {
    let data = {
      currency_id: id,
    };
    dispatch(getCoinDetails(data, "withdraw", balance));
    // if (coinDetails?.withdrawal_status === 'ACTIVE') {
    //   short_name === 'INR'
    //     ? NavigationService.navigate(WITHDRAW_INR_SCREEN, {
    //         walletDetail: coinDetails,
    //       })
    //     : NavigationService.navigate(WITHDRAW_SCREEN, {walletDetail: coinDetails});
    // }else {
    //   showError('Withdrawal is Disable for Now');
    // }
  };

  // const lineChartContainer = () => {
  //   return (
  //     <View style={{height: 300, flexDirection: 'row',}}>
  //       <AreaChart
  //         style={{flex: 1,}}
  //         data={data}
  //         animate={true}
  //         contentInset={{top: 10, bottom: 10, left: 10, right: 10}}
  //         svg={{
  //           fill: colors.red_fifty,
  //           stroke: colors.red,
  //         }}
  //         numberOfTicks={5}
  //       />
  //     </View>
  //   );
  // };

  // const renderItem = ({item}: WalletHistoryRender) => {
  //   return (
  //     <TouchableOpacityView
  //       key={item._id}
  //       onPress={() => {
  //         dispatch(setSelectedWalletHistory(item));
  //         NavigationService.navigate(WALLET_HISTORY_DETAILS_SCREEN);
  //       }}
  //       style={styles.walletHistorySingle}>
  //       <View>
  //         <AppText weight={SEMI_BOLD} type={FOURTEEN}>
  //           {item?.short_name}
  //         </AppText>
  //         <AppText color={SECOND} type={TEN}>
  //           {dateFormatter(item?.createdAt)}
  //         </AppText>
  //       </View>
  //       <View style={styles.walletHistorySingleSecond}>
  //         <AppText color={depositWithdrawColor(item.transaction_type)}>
  //           {item.transaction_type}
  //         </AppText>
  //         <AppText>{toFixedThree(item?.amount)}</AppText>
  //       </View>
  //     </TouchableOpacityView>
  //   );
  // };

  // const transactionContainer = () => {
  //   return (
  //     <View>
  //       <AppText type={EIGHTEEN} weight={SEMI_BOLD}>
  //         Transactions
  //       </AppText>
  //       <View style={styles.container}>
  //         {transactionHistory && transactionHistory.length !== 0 ? (
  //           transactionHistory?.map(item => {
  //             return renderItem({item});
  //           })
  //         ) : (
  //           <ListEmptyComponent />
  //         )}
  //       </View>
  //     </View>
  //   );
  // };
  // console.log(coinDetails, 'coinDetails');
  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background }}>
      <Toolbar isLogo />
      <KeyBoardAware>
        <View style={styles.headerContainer}>
          <AppText type={TWENTY_FOUR} weight={SEMI_BOLD}>
            {toFixedThree(balance)} {short_name}
          </AppText>
          {buy_price ? (
            <View style={styles.headerContainerSecond}>
              <AppText type={FOURTEEN} color={SECOND}>
                ${calculatePrice(balance, buy_price)}
                {'  '}
              </AppText>
              <AppText type={FOURTEEN} color={numberColor(change)}>
                ${calculateDifference(high, low)}
              </AppText>
            </View>
          ) : (
            <></>
          )}
        </View>
        <View>
          {createdAt ? (
            <>
              <AppText color={SECOND}>
                {moment(new Date()).format('MMM DD, YYYY hh:mm A')}
              </AppText>
              <View style={styles.headerContainerSecond}>
                <AppText weight={SEMI_BOLD} type={SIXTEEN}>
                  {`1 ${short_name} = $${toFixedThree(buy_price)}    `}
                </AppText>
                <AppText type={FOURTEEN} color={numberColor(change)}>
                  {twoFixedZero(change)}%
                </AppText>
              </View>
            </>
          ) : (
            <></>
          )}

          {/* {currencyDetail && (
            <>
              {lineChartContainer()}
              <View style={styles.buttonContainer2}>
                <ChartButton
                  title={'5D'}
                  isSelected={selectedTime === '5D'}
                  onPress={() => setSelectedTime('5D')}
                />
                <ChartButton
                  title={'1M'}
                  isSelected={selectedTime === '1M'}
                  onPress={() => setSelectedTime('1M')}
                />
                <ChartButton
                  title={'3M'}
                  isSelected={selectedTime === '3M'}
                  onPress={() => setSelectedTime('3M')}
                />
                <ChartButton
                  title={'1Y'}
                  isSelected={selectedTime === '1Y'}
                  onPress={() => setSelectedTime('1Y')}
                />
                <ChartButton
                  title={'5Y'}
                  isSelected={selectedTime === '5Y'}
                  onPress={() => setSelectedTime('5Y')}
                />
              </View>
            </>
          )} */}

          <View style={styles.buttonContainer}>
            <TouchableOpacityView
              onPress={() => onDeposit(detail?.currency_id)}
              style={styles.depositButton}>
              <View style={styles.iconContainer}>
                <FastImage
                  source={depositIconWallet}
                  resizeMode="contain"
                  style={styles.icon}
                />
              </View>
              <AppText style={styles.title} type={FOURTEEN}>
                Deposit
              </AppText>
            </TouchableOpacityView>
            <TouchableOpacityView
              onPress={() => onWidthDraw(detail?.currency_id)}
              style={styles.withdrawButton}>
              <View style={styles.iconContainer}>
                <FastImage
                  source={depositIconWallet}
                  resizeMode="contain"
                  style={styles.icon}
                />
              </View>
              <AppText style={styles.title} type={FOURTEEN}>
                Withdraw
              </AppText>
            </TouchableOpacityView>
          </View>
        </View>
        <View
          style={{
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <View style={{ alignItems: 'center', marginVertical: 5 }}>
            <AppText numberOfLines={1} color={SECOND} type={FIFTEEN}>
              Available Balance
            </AppText>
            <AppText weight={SEMI_BOLD}>
              {twoFixedTwo(Number(detail?.balance))}
            </AppText>
          </View>
          <View style={{ alignItems: 'center', marginVertical: 5 }}>
            <AppText numberOfLines={1} color={SECOND} type={FIFTEEN}>
              Locked Balance
            </AppText>
            <AppText weight={SEMI_BOLD}>
              {twoFixedTwo(Number(detail?.locked_balance))}
            </AppText>
          </View>
          <View style={{ alignItems: 'center', marginVertical: 5 }}>
            <AppText numberOfLines={1} color={SECOND} type={FIFTEEN}>
              Total Balance
            </AppText>
            <AppText weight={SEMI_BOLD}>
              {twoFixedTwo(
                Number(detail?.balance) + Number(detail?.locked_balance),
              )}
            </AppText>
          </View>
        </View>
        {/* {transactionContainer()} */}
      </KeyBoardAware>
      {/* <SpinnerSecond  /> */}
    </AppSafeAreaView>
  );
};

export default WalletDetails;
const styles = StyleSheet.create({
  headerContainer: {
    marginTop: universalPaddingTop,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainerSecond: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginVertical: universalPaddingHorizontalHigh,
  },
  depositButton: {
    backgroundColor: colors.inputBackground,
    borderRadius: 30,
    marginEnd: 10,
    alignItems: 'center',
    height: buttonHeight,
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 5,
  },
  withdrawButton: {
    backgroundColor: colors.inputBackground,
    borderRadius: 30,
    marginStart: 10,
    alignItems: 'center',
    height: buttonHeight,
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 5,
  },
  icon: {
    height: 20,
    width: 20,
  },
  iconContainer: {
    height: 35,
    width: 35,
    backgroundColor: colors.buttonBg,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  selectedButton: {
    backgroundColor: colors.buttonBg,
    height: 25,
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
  },
  unSelectedButton: {
    height: 25,
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    backgroundColor: colors.inputBackground,
  },
  buttonContainer2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  container: {
    marginVertical: 20,
    padding: universalPaddingHorizontal,
    borderWidth: borderWidth,
    borderRadius: 10,
  },
  walletHistorySingle: {
    // backgroundColor: colors.white_fifteen,
    padding: universalPaddingHorizontal,
    marginVertical: 5,
    // borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: borderWidth,
    borderBottomColor: colors.thirdBg,
  },
  walletHistorySingleSecond: {
    alignItems: 'flex-end',
  },
});
