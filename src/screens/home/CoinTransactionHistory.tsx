/* eslint-disable react/no-unstable-nested-components */
import React, { useState } from 'react';
import {
  AppSafeAreaView,
  AppText,
  Button,
  FOURTEEN,
  SECOND,
  SEMI_BOLD,
  SIXTEEN,
  TEN,
  Toolbar,
} from '../../shared';
import KeyBoardAware from '../../shared/components/KeyboardAware';
import { SpinnerSecond } from '../../shared/components/SpinnerSecond';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useRoute } from '@react-navigation/native';
import { SceneMap, TabView } from 'react-native-tab-view';
import { RenderTabBar } from '../wallet/Wallet';
import {
  Screen,
  borderWidth,
  universalPaddingHorizontal,
  universalPaddingHorizontalHigh,
} from '../../theme/dimens';
import { ScrollView, StyleSheet, View } from 'react-native';
import { colors } from '../../theme/colors';
import Accordion from 'react-native-collapsible/Accordion';
import moment from 'moment';
import FastImage from 'react-native-fast-image';
import { downIcon, upIcon } from '../../helper/ImageAssets';
import { cancelOrder } from '../../actions/homeActions';
import { checkValue, toFixedThree } from '../../helper/utility';
import { languages } from '../../helper/languages';


export const OpenOrders = ({ coinDetail }) => {
  // console.log(coinDetail, "coinDetail, openOrders");
  const dispatch = useAppDispatch();
  const openOrders = useAppSelector(state => state.home.openOrders);
  const { base_currency, quote_currency } = coinDetail ?? '';

  const [activeSections, setActiveSections] = useState<number[]>([]);
  const _updateSections = (_activeSections: number[]) => {
    setActiveSections(_activeSections);
  };

  const onDelete = (id: string) => {
    let data = {
      order_id: id,
    };
    dispatch(cancelOrder(data));
  };

  const _renderHeader = (section, index, isActive) => {
    const { createdAt } = section ?? '';

    return (
      <View
        style={[
          styles.singleContainer,
          isActive && styles.singleContainerHeader,
        ]}>
        <AppText type={SIXTEEN} weight={SEMI_BOLD}>
          {`${base_currency}/${quote_currency}`}
          <AppText> - {moment(createdAt).format('DD/MM/YYYY')}</AppText>
        </AppText>
        <FastImage
          source={isActive ? upIcon : downIcon}
          resizeMode="contain"
          style={styles.arrow}
          tintColor={colors.white}
        />
      </View>
    );
  };

  const _renderContent = (section, index, isActive) => {
    const {
      quantity,
      price,
      side,
      order_type,
      maker_fee,
      transaction_fee,
      taker_fee,
      tds,
      _id,
    } = section ?? '';
    const fee = Number(maker_fee) + Number(transaction_fee) + Number(taker_fee);

    const Data = [
      {
        id: '1',
        title: 'Price',
        value: toFixedThree(price),
      },
      {
        id: '2',
        title: 'Quantity',
        value: toFixedThree(quantity),
      },
      {
        id: '3',
        title: 'Fee',
        value: toFixedThree(fee),
      },
      {
        id: '4',
        title: 'TDS',
        value: toFixedThree(tds),
      },
      {
        id: '5',
        title: 'Side',
        value: side,
      },
      {
        id: '6',
        title: 'Order Type',
        value: order_type,
      },
    ];
    return (
      <View style={styles.singleContainerBody}>
        <View style={styles.singleContainerBodySecond}>
          {Data?.map(e => {
            return (
              <View key={e.id} style={styles.singleItem}>
                <AppText type={TEN} color={SECOND}>
                  {e.title}
                </AppText>
                <AppText>{e.value}</AppText>
              </View>
            );
          })}
        </View>
        <Button
          children="Delete"
          onPress={() => onDelete(_id)}
          containerStyle={styles.button}
          isSecond
        />
      </View>
    );
  };

  return (
    <ScrollView>
      {openOrders?.length !== 0 ? (
        <Accordion
          sections={openOrders}
          activeSections={activeSections}
          renderHeader={_renderHeader}
          renderContent={_renderContent}
          onChange={_updateSections}
          underlayColor={colors.transparent}
          expandMultiple
        />
      ) : (
        <ListEmptyComponent />
      )}
    </ScrollView>
  );
};

const ListEmptyComponent = () => {
  return (
    <View style={{justifyContent: "center", alignItems: "center", marginTop: 40}}>
      <AppText type={FOURTEEN}>Nothing to show.</AppText>
    </View>
  );
};

const PastOrders = ({ coinDetail }) => {
  const { base_currency, quote_currency } = coinDetail ?? '';

  const [activeSections, setActiveSections] = useState<number[]>([]);
  const _updateSections = (_activeSections: number[]) => {
    setActiveSections(_activeSections);
  };
  const pastOrders = useAppSelector(state => state.home.pastOrders);

  const _renderHeader = (section, index, isActive) => {
    const { createdAt } = section ?? '';

    return (
      <View
        style={[
          styles.singleContainer,
          isActive && styles.singleContainerHeader,
        ]}>
        <AppText type={SIXTEEN} weight={SEMI_BOLD}>
          {`${base_currency}/${quote_currency}`}
          <AppText> - {moment(createdAt).format('DD/MM/YYYY')}</AppText>
        </AppText>
        <FastImage
          source={isActive ? upIcon : downIcon}
          resizeMode="contain"
          style={styles.arrow}
          tintColor={colors.white}
        />
      </View>
    );
  };
  const _renderContent = (section, index, isActive) => {
    const { quantity, price, side, order_type, fee, tds } = section ?? '';

    const Data = [
      {
        id: '1',
        title: 'Price',
        value: toFixedThree(price),
      },
      {
        id: '2',
        title: 'Quantity',
        value: toFixedThree(quantity),
      },
      {
        id: '3',
        title: 'Fee',
        value: toFixedThree(fee),
      },
      {
        id: '4',
        title: 'TDS',
        value: toFixedThree(tds),
      },
      {
        id: '5',
        title: 'Side',
        value: side,
      },
      {
        id: '6',
        title: 'Order Type',
        value: order_type,
      },
    ];
    return (
      <View style={styles.singleContainerBody}>
        <View style={styles.singleContainerBodySecond}>
          {Data.map(e => {
            return (
              <View key={e.id} style={styles.singleItem}>
                <AppText type={TEN} color={SECOND}>
                  {e.title}
                </AppText>
                <AppText>{e.value}</AppText>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <KeyBoardAware>
      <Accordion
        sections={pastOrders}
        activeSections={activeSections}
        renderHeader={_renderHeader}
        renderContent={_renderContent}
        onChange={_updateSections}
        underlayColor={colors.transparent}
      />
    </KeyBoardAware>
  );
};

const CoinTransactionHistory = ({header}:any) => {
  const route = useRoute();
  const coinDetail = route?.params?.coinDetail;
  const { base_currency, quote_currency } = coinDetail ?? '';
  const openOrders = useAppSelector(state => state.home.openOrders);

  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([
    { key: 'first', title: 'Open Orders' },
    { key: 'second', title: 'Past Orders' },
  ]);

  const renderScene = SceneMap({
    first: () => <OpenOrders coinDetail={coinDetail} openOrders={openOrders} />,
    second: () => <PastOrders coinDetail={coinDetail} />,
  });

  return (
    <AppSafeAreaView>
      {header ? <></> :
      <Toolbar
        isSecond
        title={checkValue(languages?.history)}
      />}
      <KeyBoardAware>
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          onIndexChange={setIndex}
          initialLayout={{ width: Screen.Width }}
          renderTabBar={props => (
            <RenderTabBar
              {...props}
            />
          )}
        />
      </KeyBoardAware>
      <SpinnerSecond />
    </AppSafeAreaView>
  );
};

export default CoinTransactionHistory;
const styles = StyleSheet.create({
  singleContainer: {
    backgroundColor: colors.white_fifteen,
    padding: universalPaddingHorizontal,
    borderWidth: borderWidth,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    justifyContent: 'space-between',
  },
  singleContainerHeader: {
    borderBottomEndRadius: 0,
    borderBottomStartRadius: 0,
  },
  arrow: {
    height: 12,
    width: 12,
  },
  singleContainerBody: {
    backgroundColor: colors.white_fifteen,
    borderWidth: borderWidth,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    borderTopEndRadius: 0,
    borderTopStartRadius: 0,
    borderTopWidth: 0,
    paddingHorizontal: universalPaddingHorizontal,
    // flexDirection: 'row',
  },
  singleItem: {
    marginVertical: 5,
    width: '50%',
  },
  button: {
    marginVertical: universalPaddingHorizontal,
    // backgroundColor: colors.red,
  },
  singleContainerBodySecond: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  marginOrder: {
    marginRight: 50
  }
});
