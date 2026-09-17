import React, {useEffect, useState} from 'react';
import {
  AppSafeAreaView,
  AppText,
  EIGHTEEN,
  SECOND,
  TEN,
  Toolbar,
} from '../../shared';
import {useRoute} from '@react-navigation/native';
import {useAppDispatch, useAppSelector} from '../../store/hooks';
import {addToFavorites} from '../../actions/homeActions';
import {StyleSheet, View} from 'react-native';
import KeyBoardAware from '../../shared/components/KeyboardAware';
import {
  universalPaddingHorizontalHigh,
  universalPaddingTop,
} from '../../theme/dimens';
import WebView from 'react-native-webview';
import {toFixedEight, toFixedThree, twoFixedTwo} from '../../helper/utility';
import {commonStyles} from '../../theme/commonStyles';
import { HomeBg } from '../../helper/ImageAssets';

const CoinDetailChart = () => {
  const dispatch = useAppDispatch();
  const route = useRoute();
  const coinDetail = route?.params?.coinDetail;
  const {buy_price, change, high, low, volume} = coinDetail ?? '';

  const {base_currency, quote_currency, _id} = coinDetail ?? '';
  const favoriteArray = useAppSelector(state => state.home.favorites);
  const [isFavorite, setIsFavorite] = useState(false);
  const webview = React.useRef(null);
  console.log(base_currency,quote_currency, "chart");
  let _url = `http://103.175.163.162:5117/chart/${base_currency}_${quote_currency}`;

  //   const iframeStyle = `
  //   <style>
  //     iframe {
  //       width: 100%;
  //       height: 100%;
  //     }
  //   </style>
  // `;

  //   const fullHtml = `
  //   <html>
  //   <head>
  //     ${iframeStyle}
  //   </head>
  //   <body>
  //   <div id="TVChartContainer">
  // </div>
  //   <script src="../../TVChartContainer/index.js" type="text/js"></script>
  //   </body>
  //   </html>
  // `;
  // console.log('url::::::', _url);
  // <iframe src="${_url}" frameborder="0"></iframe>

  // useEffect(() => {
  //   if (favoriteArray?.includes(_id)) {
  //     setIsFavorite(true);
  //   } else {
  //     setIsFavorite(false);
  //   }
  // }, []);

  const onAdd = () => {
    let data = {
      pair_id: _id,
    };
    dispatch(addToFavorites(data));
    setIsFavorite(!isFavorite);
  };
  const header = () => {
    return (
      <View style={styles.headerContainer}>
        <View style={styles.headerContainerSecond}>
          <AppText color={SECOND}>Current Price</AppText>
          <AppText type={EIGHTEEN}>{toFixedEight(buy_price)}</AppText>
          {/* <AppText>= $0.067598</AppText> */}
        </View>
        <View style={styles.headerContainerThird}>
          <View style={commonStyles.flex}>
            <AppText color={SECOND}>24h High</AppText>
            <AppText type={TEN}>
              {toFixedThree(high)}
              {'\n'}
            </AppText>
            <AppText color={SECOND}>24h Low</AppText>
            <AppText type={TEN}>{toFixedThree(low)}</AppText>
          </View>
          <View style={commonStyles.flex}>
            <AppText color={SECOND}>Vol</AppText>
            <AppText type={TEN}>
              {twoFixedTwo(volume)}
              {'\n'}
            </AppText>
            <AppText color={SECOND}>24h Change</AppText>
            <AppText type={TEN}>{twoFixedTwo(change)}</AppText>
          </View>
        </View>
      </View>
    );
  };
  const graph = () => {
    return (
      <View style={{marginVertical: 20}}>
        <WebView
          ref={webview}
          style={styles.webview}
          // source={{
          //   html: fullHtml,
          // }}
          source={{
            uri: _url,
          }}
          startInLoadingState={true}
          scalesPageToFit={true}
          automaticallyAdjustContentInsets={true}
          // scrollEnabled={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          bounces={false}
          sharedCookiesEnabled={true}
          javaScriptEnabledAndroid={true}
        />
      </View>
    );
  };
  return (
    <AppSafeAreaView source={HomeBg}>
      <Toolbar
        isSecond
        isThird
        isFavorite={favoriteArray?.pairs?.includes(_id)}
        onAdd={() => onAdd()}
        title={`${base_currency}/${quote_currency}`}
      />
      <KeyBoardAware style={{paddingHorizontal: 0}}>
        {header()}
        {graph()}
      </KeyBoardAware>
    </AppSafeAreaView>
  );
};

export default CoinDetailChart;
const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: universalPaddingTop,
    paddingHorizontal: universalPaddingHorizontalHigh,
  },
  headerContainerThird: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  headerContainerSecond: {
    flex: 1,
  },
  webview: {
    backgroundColor: 'transparent',
    height: 400,
    opacity: 0.99,
    // marginEnd: 10,
    // width: 'auto',
  },
});
