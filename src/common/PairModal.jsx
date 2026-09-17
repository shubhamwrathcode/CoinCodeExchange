import React, {useState,useEffect} from 'react';
import {FlatList, Modal, StyleSheet, View, TouchableOpacity} from 'react-native';
import {SceneMap, TabView, TabBar} from 'react-native-tab-view';
import {OpenOrders} from '../home/CoinTransactionHistory';
import {useAppSelector} from '../store/hooks';
import {Screen, smallButtonHeight, universalPaddingHorizontalHigh} from '../theme/dimens';
import {AppText, SIXTEEN, YELLOW, SECOND, TEN, SEMI_BOLD} from './AppText';
import {colors} from '../theme/colors';
// import { RenderTabBar } from "../wallet/Wallet";
import {ListEmptyComponent, renderItem} from '../screens/home/MarketCoinList';
import TouchableOpacityView from './TouchableOpacityView';
import { NAVIGATION_BOTTOM_TAB_STACK, NAVIGATION_TRADE_STACK, TRADE_SCREEN } from '../navigation/routes';
import FastImage from 'react-native-fast-image';
import { toFixedEight, toFixedThree, twoFixedTwo } from '../helper/utility';
import { downIcon, upIcon } from '../helper/ImageAssets';
import { BASE_URL } from '../helper/Constants';
import { useNavigation } from '@react-navigation/native';

const PairModal = ({
    showPair, setShowPair
}) => {
//   const [showModal, setShowModal] = useState(showPair);
  const navigation = useNavigation();

  const coinData = useAppSelector(state => state.home.coinPairs);
  const currency = useAppSelector(state => state.home.currency);
  useEffect(() => {
    setShowPair(showPair);
  }, [showPair]);

  const handleChangePair = (item) => {
    navigation.navigate(NAVIGATION_BOTTOM_TAB_STACK, {
        screen: NAVIGATION_TRADE_STACK,
        params: {
          screen:TRADE_SCREEN,
          params: {
             coinDetail: item,
             path: "Spot"
          },
        },
      });
      setShowPair(false);
  }
 
  return (
    <Modal transparent visible={showPair}>
      <TouchableOpacity style={styles.modalBackGround} onPress={() => setShowPair(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.mainContainer}>
            {coinData?.length !== 0 ? (
   <>
      <FlatList
      data={coinData}
      renderItem={({item, index})=>{
        let url = `${BASE_URL}${item?.icon_path}`;
        return(
       
    <TouchableOpacityView
      style={styles.container}
      onPress={() => handleChangePair(item)}>
      <View style={styles.containerSecond}>
        <FastImage
          source={{ uri: url }}
          resizeMode="contain"
          style={styles.icon}
        />
        <View>
          <AppText>{item?.base_currency}</AppText>
          <AppText type={TEN} color={SECOND}>
            {item?.quote_currency}
          </AppText>
        </View>
      </View>
      <View style={styles.containerThird}>
        <AppText weight={SEMI_BOLD}>
          {currency} {toFixedEight(item?.buy_price)}
        </AppText>
        <AppText numberOfLines={1} color={SECOND}>
          {twoFixedTwo(item?.volume)}
        </AppText>
      </View>
      <View style={styles.containerThird}>
        <View
          style={[
            styles.bedge,
            item?.change < 0 && {
              backgroundColor: colors.red,
            },
          ]}>
          <FastImage
            resizeMode="contain"
            source={item?.change >= 0 ? upIcon : downIcon}
            tintColor={colors.white}
            style={styles.arrow}
          />
          <AppText>{toFixedThree(item?.change)}</AppText>
        </View>
      </View>
    </TouchableOpacityView>
        )
      }}
      />
      </>
  ) : (
    <ListEmptyComponent />
  )}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};
export default PairModal;
const styles = StyleSheet.create({
  modalBackGround: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#36363F',
    paddingHorizontal: 15,
    paddingVertical: 25,
    borderRadius: 20,
    elevation: 20,
    zIndex: 999
  },
  mainContainer: {
    // justifyContent: 'center',
    // alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  bedge: {
    height: 25,
    borderRadius: 5,
    backgroundColor: colors.green,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
  arrow: {
    height: 8,
    width: 8,
    marginEnd: 5,
    marginBottom: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
  },
  icon: {
    height: 30,
    width: 30,
    marginEnd: 10,
  },
  containerSecond: { flex: 1, flexDirection: 'row' },
  containerThird: { flex: 1, alignItems: 'flex-end' },
});
