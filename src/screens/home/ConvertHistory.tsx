import {FlatList, StyleSheet, View} from 'react-native';
import React, {useEffect} from 'react';
import FastImage from 'react-native-fast-image';
import moment from 'moment';
import {
  AMBER,
  AppSafeAreaView,
  AppText,
  FOURTEEN,
  GREEN,
  NORMAL,
  RED,
  SECOND,
  TEN,
  Toolbar,
} from '../../shared';
import {useAppDispatch, useAppSelector} from '../../store/hooks';
import {getConversionHistory} from '../../actions/homeActions';
import {Exchange, Frame1} from '../../helper/ImageAssets';
import {colors} from '../../theme/colors';
import {toFixedFive} from '../../helper/utility';
import {
  universalPaddingHorizontalHigh,
  universalPaddingTop,
} from '../../theme/dimens';
import { ListEmptyComponent } from './MarketCoinList';

const ConvertHistory = () => {
  const dispatch = useAppDispatch();
  const convertHistory = useAppSelector(state => state.home.conversionHistory);

  useEffect(() => {
    dispatch(getConversionHistory());
  }, []);
  const renderItem = ({item, index}) => {
    const {
      amount: quantity,
      from: to,
      quantity: amount,
      to: from,
      status,
      createdAt,
    } = item ?? '';
    let color = () => {
      if (status === 'Pending') {
        return AMBER;
      }
      if (status === 'Canceled') {
        return RED;
      }
      if (status === 'Completed') {
        return GREEN;
      }
    };
    return (
      <View style={[styles.container]}>
        <View style={styles.box1}>
          <FastImage source={Frame1} style={styles.exchangeIcon} />
          <View style={styles.boxOneContainer}>
            <View style={styles.boxOneTop}>
              <View>
                <AppText type={FOURTEEN} weight={NORMAL}>
                  Exchange {from}
                </AppText>
              </View>
              <View>
                <FastImage source={Exchange} style={styles.exchangeIcon2} />
              </View>
              <View>
                <AppText type={FOURTEEN} weight={NORMAL}>
                  {to}
                </AppText>
              </View>
            </View>
            <AppText
              type={TEN}
              color={SECOND}
              numberOfLines={1}
              style={styles.boxOneBottom}>
              {from} {toFixedFive(amount)} to {to} {toFixedFive(quantity)}
            </AppText>
          </View>
        </View>
        <View style={styles.box2}>
          <AppText color={color()} style={styles.boxTwoTop}>
            {status}
          </AppText>
          <AppText type={TEN} color={SECOND} style={styles.boxTwoBottom}>
            {moment(createdAt).format('DD MMM, YYYY HH:MM')}
          </AppText>
        </View>
      </View>
    );
  };

  return (
    <AppSafeAreaView>
      <Toolbar isSecond title="Convert History" />
      <FlatList
        data={convertHistory}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        style={styles.list}
        ListEmptyComponent={()=>{
          return(
            <ListEmptyComponent/>
          )
        }}
      />
    </AppSafeAreaView>
  );
};

export default ConvertHistory;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    backgroundColor: colors.inputBackground,
    marginBottom: 10,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  box1: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  exchangeIcon: {
    width: 24,
    height: 24,
  },
  boxOneContainer: {
    flexDirection: 'column',
    marginLeft: 13,
  },
  boxOneTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exchangeIcon2: {
    width: 15,
    height: 15,
    marginHorizontal: 5,
  },
  boxOneBottom: {
    // color: colors.fourthText,
  },
  box2: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-end',
    flex: 0.6,
  },
  boxTwoTop: {
    // color: colors.greenText,
  },
  boxTwoBottom: {
    // color: colors.fourthText,
    marginTop: 3,
  },
  list: {
    flex: 1,
    paddingHorizontal: universalPaddingHorizontalHigh,
    marginTop: universalPaddingTop,
  },
});
