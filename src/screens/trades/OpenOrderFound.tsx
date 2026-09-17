import React, {useEffect} from 'react';
import {FlatList, ScrollView, StyleSheet, View} from 'react-native';
import {SceneMap, TabView, TabBar} from 'react-native-tab-view';
import {OpenOrders} from '../home/CoinTransactionHistory';
import {useAppSelector} from '../../store/hooks';
import {Screen} from '../../theme/dimens';
import {AppText, SIXTEEN, YELLOW, SECOND, TEN, SEMI_BOLD} from '../../shared';
import {colors} from '../../theme/colors';
// import { RenderTabBar } from "../wallet/Wallet";
import {ListEmptyComponent, renderItem} from '../home/MarketCoinList';
import TouchableOpacityView from '../../shared/components/TouchableOpacityView';
import { NAVIGATION_BOTTOM_TAB_STACK, NAVIGATION_TRADE_STACK, TRADE_SCREEN } from '../../navigation/routes';
import FastImage from 'react-native-fast-image';
import { toFixedEight, toFixedThree, twoFixedTwo } from '../../helper/utility';
import { downIcon, upIcon } from '../../helper/ImageAssets';
import { BASE_URL } from '../../helper/Constants';
import { useNavigation } from '@react-navigation/native';

const FirstRoute = ({route}) => (
    <>
<OpenOrders coinDetail={route} openOrders={route?.openOrders} />
    </>
)

const SecondRoute = () => (
    <Funds />
)

const renderScene = SceneMap({
  first: FirstRoute,
  second: SecondRoute,
});

const RenderTabBar = (props: any) => {
  return (
    <TabBar
      {...props}
      // jumpTo={props.route}
      renderLabel={({route, focused}) => (
        <AppText type={SIXTEEN} color={focused ? YELLOW : SECOND}>
          {route.title}
        </AppText>
      )}
      indicatorStyle={{backgroundColor: colors.yellow}}
      scrollEnabled={!props.scrollEnabled ? props.scrollEnabled : true}
      tabStyle={[{width: 'auto'}, props.tabStyle]}
      pressColor={colors.transparent}
      style={[styles.tabbar, props.style]}
    />
  );
};
const Funds = () => {
  const navigation = useNavigation();

  const coinData = useAppSelector(state => state.home.coinData);
  const currency = useAppSelector(state => state.home.currency);
  return coinData?.length !== 0 ? (
   <>
      <FlatList
      data={coinData}
      renderItem={({item, index})=>{
        let url = `${BASE_URL}${item?.icon_path}`;
        return(
       
    <TouchableOpacityView
      style={styles.container}
      onPress={() =>
       navigation.navigate(NAVIGATION_BOTTOM_TAB_STACK, {
          screen: NAVIGATION_TRADE_STACK,
          params: {
            screen:TRADE_SCREEN,
            params: {
               coinDetail: item,
               path: "Spot"
            },
          },
        })
      }>
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
  );
};
const OpenOrderFound = ({setGetIndex}: any) => {
  const openOrders = useAppSelector(state => state.home.openOrders);
  const coinData = useAppSelector(state => state.home.coinData);
  const coinDetail = coinData[0] ?? '';
  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([
    {
      key: 'first',
      title: 'Open Orders',
      route: coinDetail,
      openOrders: openOrders,
    },
    {key: 'second', title: 'Funds'},
  ]);
  useEffect(() => {
    setGetIndex(index);
  }, [index]);
  // const renderScene = SceneMap({
  //     first: () => <OpenOrders coinDetail={coinDetail} openOrders={openOrders} />,
  //     second: () => <Funds />,
  // });

  return (
    <TabView
      navigationState={{index, routes}}
      renderScene={renderScene}
      onIndexChange={setIndex}
      initialLayout={{width: Screen.Width}}
      renderTabBar={props => <RenderTabBar {...props} />}
      style={{marginBottom: 90}}
    />
  );
};
export default OpenOrderFound;
const styles = StyleSheet.create({
  tabbar: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    borderBottomWidth: 0,
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
