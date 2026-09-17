import React, { useState, useEffect } from "react";
import FastImage from "react-native-fast-image";
import {
  AppSafeAreaView,
  AppText,
  BOLD,
  Button,
  CustomMaterialMenu,
  FIFTEEN,
  FOURTEEN,
  GREEN,
  Header,
  SECOND,
  SEMI_BOLD,
  SIXTEEN,
  TEN,
  THIRTY,
  THIRTY_FOUR,
  Toolbar,
  TWELVE,
  TWENTY,
  TWENTY_SIX,
  YELLOW,
} from "../../shared";
import { HOME_BG, HomeBg, bitcoin_ic } from "../../helper/ImageAssets";
import KeyBoardAware from "../../shared/components/KeyboardAware";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { FlatList, Image, ScrollView, StyleSheet, View } from "react-native";
import {
  checkValue,
  dateFormatter,
  depositWithdrawColor,
  toFixedThree,
  twoFixedTwo,
  twoFixedZero,
} from "../../helper/utility";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import {
  Screen,
  universalPaddingHorizontal,
  universalPaddingHorizontalHigh,
} from "../../theme/dimens";
import { colors } from "../../theme/colors";
import { commonStyles } from "../../theme/commonStyles";
import TouchableOpacityView from "../../shared/components/TouchableOpacityView";
import NavigationService from "../../navigation/NavigationService";
import {
  TRADE_HISTORY_DETAILS_SCREEN,
  WALLET_HISTORY_DETAILS_SCREEN,
  WALLET_DETAIL_SCREEN,
  WALLET_HISTORY_SCREEN,
} from "../../navigation/routes";
import {
  getUserWallet,
  verifyDeposit,
  verifyWithdraw,
  getTradeHistory,
} from "../../actions/walletActions";
import { ListEmptyComponent } from "../home/MarketCoinList";
import {
  setSelectedTradeHistory,
  setSelectedWalletHistory,
} from "../../slices/walletSlice";
import { TradeHistoryProps, WalletHistoryProps } from "../../helper/types";
import { getHistoricData } from "../../actions/homeActions";
import { useDispatch } from "react-redux";
import { useIsFocused, useRoute } from "@react-navigation/native";
import { BASE_URL } from "../../helper/Constants";



const Wallet = () => {
  const route = useRoute();
  const dispatch = useAppDispatch();
  const walletBalance = useAppSelector((state) => state.wallet.walletBalance);
  const currency = useAppSelector((state) => state.home.currency);
  const userWallet = useAppSelector((state) => state.wallet.userWallet);
  const languages = useAppSelector((state) => {
    return state.account.languages;
  });
  const [index, setIndex] = React.useState(0);
  const isFocus = useIsFocused();
  const [routes] = React.useState([
    { key: "first", title: checkValue(languages?.wallet_one) },
    { key: "second", title: "Deposit History" },
    { key: "third", title: "Withdraw History" },
    { key: "fourth", title: checkValue(languages?.wallet_three) },
  ]);

  useEffect(() => {
    if (isFocus) {
      setIndex(0);
      dispatch(getUserWallet());
    }
  }, [isFocus]);

  useEffect(() => {
    dispatch(getUserWallet());
    // setIndex(0);
  }, [isFocus]);

  console.log(userWallet, "userWallet");
  return (
    <AppSafeAreaView source={HomeBg}>
      {/* <KeyBoardAware style={commonStyles.paddingR}> */}
      <Toolbar />
      <View style={styles.container}>
        <View style={styles.balanceContainer}>
          <AppText type={FOURTEEN}>
            {checkValue(languages?.wallet_four)}
          </AppText>
          <AppText type={TWENTY_SIX} weight={SEMI_BOLD}>
            {`${walletBalance?.Currency || ""} ${
              twoFixedTwo(walletBalance?.[walletBalance?.Currency]) || 0
            }`}
          </AppText>
          <AppText type={FIFTEEN} color={SECOND} weight={SEMI_BOLD}>
            {`$${twoFixedTwo(walletBalance?.dollarPrice) || 0}`}
          </AppText>
        </View>
        <View>
          <ScrollView
            style={styles.fundContainer}
            contentContainerStyle={{ justifyContent: "space-between" }}
            horizontal
          >
            {userWallet?.map((item, index) => {
              return (
                <View style={[styles.fundSingleBox]} key={item._id}>
                  <TouchableOpacityView
                    onPress={() => {
                      // let _currency = coinData.find(e => {
                      //   return e.base_currency_id === item?.currency_id;
                      // });
                      // let historicData = {
                      //   base_currency: _currency?.base_currency,
                      //   quote_currency: _currency?.quote_currency,
                      // };
                      NavigationService.navigate(WALLET_DETAIL_SCREEN, {
                        item: item,
                      });
                    }}
                    style={styles.fundSingleBoxSecond}
                  >
                    <AppText numberOfLines={1} color={SECOND}>
                      {item?.currency}
                    </AppText>
                    <AppText weight={SEMI_BOLD}>
                      {twoFixedTwo(Number(item?.balance))}
                    </AppText>
                    <AppText color={SECOND} type={TEN}>
                      {item?.short_name}
                    </AppText>
                  </TouchableOpacityView>
                  <FastImage
                    source={{ uri: `${BASE_URL}${item?.icon_path}` }}
                    resizeMode="contain"
                    style={{
                      height: 30,
                      width: 30,
                    }}
                  />
                </View>
              );
            })}
          </ScrollView>
        </View>
        <View style={{ marginTop: 20 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <AppText weight={SEMI_BOLD} type={SIXTEEN}>
              Recent Transactoins
            </AppText>
            <AppText
              weight={SEMI_BOLD}
              color={YELLOW}
              type={TWELVE}
              onPress={() => NavigationService.navigate(WALLET_HISTORY_SCREEN)}
            >
              See More
            </AppText>
          </View>
          <View style={{ marginTop: 20 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
                borderBottomColor: colors.textGray,
                borderBottomWidth: 0.5,
                paddingBottom: 10,
              }}
            >
              <View style={{ flex: 1, flexDirection: "row" }}>
                <FastImage
                  source={bitcoin_ic}
                  resizeMode="contain"
                  style={{
                    height: 30,
                    width: 30,
                    marginEnd: 10,
                  }}
                />
                <View>
                  <AppText>{"BTC"}</AppText>
                  <AppText type={TEN} color={SECOND}>
                    {"11 Nov, 2022  04:23"}
                  </AppText>
                </View>
              </View>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <AppText weight={SEMI_BOLD} color={GREEN}>
                  Deposit
                </AppText>
                <AppText numberOfLines={1} color={SECOND}>
                  ${545}
                </AppText>
              </View>
            </View>
          </View>
        </View>
      </View>
      {/* </KeyBoardAware> */}
      {/* <SpinnerSecond /> */}
    </AppSafeAreaView>
  );
};

export default Wallet;
const styles = StyleSheet.create({
  balanceContainer: {
    marginVertical: 20,
  },
  tabbar: {
    backgroundColor: "transparent",
    shadowOpacity: 0,
    elevation: 0,
    borderBottomWidth: 0,
  },
  fundSingleBox: {
    backgroundColor: colors.white_fifteen,
    padding: universalPaddingHorizontal,
    width: "12%",
    marginVertical: 5,
    flexDirection: "row",
    height: 100,
    marginHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.descText,
  },
  leftBox: {
    borderTopLeftRadius: 15,
    borderBottomLeftRadius: 15,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  rightBox: {
    borderTopRightRadius: 15,
    borderBottomRightRadius: 15,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  fundContainer: {
    // flexDirection: 'row',
    // flexWrap: 'wrap',
    // justifyContent: 'space-between',
    // width: '50%',
    marginTop: universalPaddingHorizontalHigh,
  },
  container: {
    paddingHorizontal: universalPaddingHorizontalHigh,
    flex: 1,
    marginBottom: 5,
  },
  menuIcon: {
    height: 15,
    width: 15,
  },
  fundSingleBoxSecond: {
    flex: 1,
    // flexDirection: 'row',
    // alignItems: 'center',
    // justifyContent: 'space-between',
  },
  menuIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 20,
    width: 20,
  },
  walletHistorySingle: {
    backgroundColor: colors.white_fifteen,
    padding: universalPaddingHorizontal,
    marginVertical: 5,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  walletHistorySingleSecond: {
    alignItems: "flex-end",
  },
  walletHistoryContainer: {
    marginTop: universalPaddingHorizontalHigh,
  },
});
