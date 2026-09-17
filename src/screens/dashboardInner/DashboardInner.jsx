import { StyleSheet, Text, View, TouchableOpacity, TextInput, Image } from 'react-native';
import React, { useEffect, useState } from 'react'
import { AppSafeAreaView, AppText, TEN, TWELVE } from '../../shared'
import KeyBoardAware from '../../shared/components/KeyboardAware'
import AntDesign from 'react-native-vector-icons/AntDesign'
import { Coin, INR_CURRENCY, rupeeIcon, trxIcon } from '../../helper/ImageAssets';
import BonusHistory from './BonusHistory';
import TransactionHistory from './TransactionHistory';
import { useAppSelector } from '../../store/hooks';
import { useDispatch } from 'react-redux';
import { getBotTrades } from '../../actions/walletActions';
import { colors } from '../../theme/colors';
import moment from 'moment';
const DashboardInner = () => {
  const dispatch = useDispatch();
  const theme = useAppSelector(state => state.auth.theme);
  const botActiveList = useAppSelector(state => state.wallet.botActiveList);
  const botTradeData = useAppSelector(state => state.wallet.botTradeData);
  const totalProfit = useAppSelector(state => state.wallet.totalProfit);
  const [active, setActive] = useState(1);

  useEffect(() => {
    dispatch(getBotTrades());
  }, []);

  console.log(botTradeData, totalProfit,"botActiveList");
  return (
    <AppSafeAreaView source={theme !== "Dark" && appBg} style={{backgroundColor : theme === "Dark" && "#000000"}}>
      <KeyBoardAware>
        <View style={styles.mainView}>
          <View style={styles.tabView}>
            <TouchableOpacity onPress={() => setActive(1)}>
              <AppText
                type={TWELVE}
                style={active == 1 ? {
                  borderBottomColor: '#F3BB2B',
                  borderBottomWidth: 1,
                  paddingBottom: 5, fontWeight: '700', color: '#F3BB2B'
                } : {

                  fontWeight: '700',
                  color: theme !== "Dark" ? "#222" : "#fff"
                }}
              >
                Dashboard
              </AppText>
            </TouchableOpacity>
            {/* <TouchableOpacity onPress={() => setActive(2)}>
              <AppText type={TWELVE} style={active == 2 ? {
                borderBottomColor: '#F3BB2B',
                borderBottomWidth: 1,
                paddingBottom: 5, fontWeight: '700', color: '#F3BB2B'
              } : { paddingBottom: 5, fontWeight: '700', }}>
                Bouns History
              </AppText>
            </TouchableOpacity> */}
            <TouchableOpacity onPress={() => setActive(3)}>

              <AppText type={TWELVE} style={active == 3 ? {
                borderBottomColor: '#F3BB2B',
                borderBottomWidth: 1,
                paddingBottom: 5, fontWeight: '700', color: '#F3BB2B'
              } : { paddingBottom: 5, fontWeight: '700', color: theme !== "Dark" ? "#222" : "#fff" }}>
                Transaction History
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity >

              <AntDesign name="search1" color={'#222'} size={20} />
            </TouchableOpacity>
          </View>
          {
            active == 1 ?
              <View style={[styles.dashContainer, {backgroundColor: theme !== "Dark" && '#F5F5F5'}]}>

                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ width: "70%" }}>
                    {/* <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={{ color: '#F3BB2B' }}>Deposit Balance</Text>
                      <Text> :50.0000 </Text>
                      <Image
                        source={Coin}
                        style={styles.icon}
                      />
                    </View> */}
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                  
                      <AppText style={{ color: '#F3BB2B' }}>Totel Profit</AppText>
                      <AppText> : {totalProfit} INR </AppText>
                      <Image
                        source={rupeeIcon}
                        style={styles.icon}
                        tintColor={colors.black}
                      />
                    </View>
                  </View>
                  {/* <TouchableOpacity style={styles.fundBtn}>
                    <Text style={styles.fundBtnText}>Add Funds</Text>
                  </TouchableOpacity> */}

                </View>
                {/* <View style={styles.dollarBox}>
                  <Text style={styles.dollarText}>≈ 406.7800</Text>
                </View> */}

                {/* Bot Package Info */}
                <View style={styles.packageContainer}>
                  <View style={styles.packageHeader}>
                    <View>
                      <AppText style={styles.packageTitle}>Active Bot Package</AppText>
                      <AppText style={{ color: theme !== "Dark" ? "#222" : colors.disclaimDarText, fontSize: 11 }}>Your current subscription details</AppText>
                    </View>
                    {/* <View style={styles.sponsorBox}>
                      <Text style={styles.sponsorLabel}>Enter Sponsor Code</Text>
                      <Text style={styles.sponsorCode}>BOT123456</Text>
                    </View> */}
                  </View>

                  <AppText style={styles.activeStatus}>
                    Your Package <AppText style={styles.highlight}>“{botActiveList?.packageDetails?.name || "---"}”</AppText> is Active
                  </AppText>

                  <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                      <AppText style={styles.infoLabel}>Package Name:</AppText>
                      <AppText style={styles.infoValue}>{botActiveList?.packageDetails?.name}</AppText>
                    </View>
                    <View style={styles.infoRow}>
                      <AppText style={styles.infoLabel}>Activation Date:</AppText>
                      <AppText style={styles.infoValue}>{moment(botActiveList?.purchaseDate).format("YYYY-MM-DD")}</AppText>
                    </View>
                    <View style={styles.infoRow}>
                      <AppText style={styles.infoLabel}>Expiry Date:</AppText>
                      <AppText style={styles.infoValue}>{moment(botActiveList?.expiryDate).format("YYYY-MM-DD")}</AppText>
                    </View>
                    <View style={styles.infoRow}>
                      <AppText style={styles.infoLabel}>Purchased From:</AppText>
                      <AppText style={styles.infoValue}>INR {Object.keys(botActiveList)?.length > 0 ? (botActiveList?.deducted_from_wallet.charAt(0).toUpperCase() + botActiveList?.deducted_from_wallet.slice(1)) : "--"} Wallet</AppText>
                    </View>
                    <View style={styles.infoRow}>
                      <AppText style={styles.infoLabel}>Plan Validity:</AppText>
                      <AppText style={styles.infoValue}>{botActiveList?.packageDetails?.validityDays || "---"} days</AppText>
                    </View>
                    <View style={styles.infoRow}>
                      <AppText style={styles.infoLabel}>Plan Status:</AppText>
                      <AppText style={styles.infoValue}>{botActiveList?.packageDetails?.status || "---"}</AppText>
                    </View>
                  </View>
                </View>
              </View>
              :
              active == 2 ?
                <BonusHistory />
                :
                <TransactionHistory botTrades={botTradeData} theme={theme}/>
          }
        </View>
      </KeyBoardAware>
    </AppSafeAreaView>
  )
}

export default DashboardInner

const styles = StyleSheet.create({
  mainView: {
    // borderWidth: 1,
    // borderColor: "#D4D4D4",
    margin: 10,
    borderRadius: 18,
    padding: 10,
    paddingHorizontal: 14,
  },
  tabView: {
    // borderWidth: 1,
    // borderColor: '#F3BB2B',
    flexDirection: "row",
    gap: 10,
    // justifyContent: 'space-between',
    padding: 5,
    borderRadius: 4,
    alignItems: "center",
    // paddingHorizontal:10
  },
  dashContainer: {
    flex: 1,
    paddingVertical: 16,
    // 
  },
  balanceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // backgroundColor: '#e6f0ff',
    borderRadius: 10,
    padding: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceText: {
    fontSize: 13,
    flex: 1,
    color: '#000',
  },
  labelOrange: {
    color: '#F3BB2B',
    fontWeight: '600',
  },
  icon: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },
  fundBtn: {
    backgroundColor: '#F3BB2B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  fundBtnText: {
    color: '#222',
    fontSize: 12,
    fontWeight: '600',
  },
  dollarBox: {
    // backgroundColor: '#f0f0f0',
    // padding: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  dollarText: {
    fontSize: 13,
    color: '#8B8888',
    fontWeight: '500',
  },
  packageContainer: {
    marginTop: 16,
    // backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderRadius: 12,
    padding: 14,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageTitle: {
    fontSize: 15,
    fontWeight: '600',
    // color: '#000',
  },
  sponsorBox: {
    alignItems: 'flex-end',
  },
  sponsorLabel: {
    fontSize: 12,
    color: '#444',
  },
  sponsorCode: {
    backgroundColor: '#D9D9D9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  activeStatus: {
    marginTop: 10,
    fontSize: 13,
    color: '#F3BB2B',
  },
  highlight: {
    color: '#F3BB2B',
    fontWeight: '600',
  },
  infoCard: {
    marginTop: 14,
    // backgroundColor: '#fff',
    borderRadius: 10,
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    // color: '#000',
  },
})