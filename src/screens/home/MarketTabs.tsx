import React, {useEffect, useState} from 'react';
import {FlatList, StyleSheet} from 'react-native';
import {useAppSelector} from '../../store/hooks';
import TouchableOpacityView from '../../shared/components/TouchableOpacityView';
import {AppText, BLACK, SEMI_BOLD, THIRD} from '../../shared';
import {colors} from '../../theme/colors';
import {universalPaddingHorizontal} from '../../theme/dimens';

interface MarketTabsProps {
  activeTab: string;
  activeTabList: any;
  changeActiveTab: any;
}

const MarketTabs = ({
  activeTab,
  changeActiveTab,
  activeTabList,
}: MarketTabsProps) => {
  const coinData = useAppSelector(state => state.home.coinData);
  const favorites = useAppSelector(state => state.home.favorites);

  const [data, setData] = useState([]);

  useEffect(() => {
    const array1 = ['ALL'];
    handleData()?.forEach(item => {
      if (array1?.includes(item?.quote_currency)) {
      } else {
        array1?.push(item?.quote_currency);
      }
    });

    setData(array1);
  }, [activeTabList, coinData]);

  const handleData = () => {
    if (activeTabList === 0) {
      return coinData;
    }
    if (activeTabList === 1) {
      return coinData?.filter(coin => favorites?.pairs?.some((dataCoin:any) => coin._id === dataCoin));
    }
  };

  const renderItem = ({item}) => {
    return (
      <TouchableOpacityView
        onPress={() => changeActiveTab(item)}
        style={[
          styles.container,
          {
            backgroundColor:
              item === activeTab ? colors.buttonBg : colors.secondBg,
          },
        ]}>
        <AppText weight={SEMI_BOLD} color={item === activeTab ? BLACK : THIRD}>
          {item}
        </AppText>
      </TouchableOpacityView>
    );
  };
  return (
    <FlatList
      data={data}
      horizontal
      renderItem={renderItem}
      keyExtractor={item => item}
      scrollEnabled={false}
    />
  );
};
const styles = StyleSheet.create({
  container: {
    height: 25,
    marginRight: 10,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: universalPaddingHorizontal,
  },
  tabName: {},
});
export default MarketTabs;
