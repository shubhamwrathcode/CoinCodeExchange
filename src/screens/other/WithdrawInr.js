import React, { useEffect, useRef, useState } from "react";
import {
  AppSafeAreaView,
  AppText,
  BLACK,
  Button,
  FOURTEEN,
  Input,
  SECOND,
  SEMI_BOLD,
  SIXTEEN,
  TEN,
  Toolbar,
  TWELVE,
} from "../../shared";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useRoute } from "@react-navigation/native";
import { sendOtp } from "../../actions/authActions";
import { Keyboard, StyleSheet, View } from "react-native";
import { showError } from "../../helper/logger";
import { errorText, placeHolderText, titleText } from "../../helper/Constants";
import KeyBoardAware from "../../shared/components/KeyboardAware";
import { colors } from "../../theme/colors";
import {
  borderWidth,
  universalPaddingHorizontal,
  universalPaddingTop,
} from "../../theme/dimens";
import {
  getUserMainWallet,
  getUserWallet,
  withdrawCoin,
  withdrawFiatCoin,
} from "../../actions/walletActions";
import TouchableOpacityView from "../../shared/components/TouchableOpacityView";
import { checkValidAmount, validateEmail } from "../../helper/utility";
import { TouchableOpacity } from "react-native-gesture-handler";
import NavigationService from "../../navigation/NavigationService";
import FastImage from "react-native-fast-image";
import { loginDarkBg, BACK_ICON, moreOption, printIcon } from "../../helper/ImageAssets";
import {
  BANKING_AND_TRADE_SETTINGS_SCREEN,
  PAYMENT_OPTIONS_SCREEN,
} from "../../navigation/routes";

const WithdrawInr = () => {
  const dispatch = useAppDispatch();
  const route = useRoute();
  const walletDetail = route?.params?.data;
  const theme = useAppSelector(state => state.auth.theme);
  const userBankData = useAppSelector((state) => state.account.userBankData);
  const userData = useAppSelector((state) => state.auth.userData);
  const userMainWallet = useAppSelector((state) => {
    return state.wallet.userMainWallet;
  });
  const { emailId } = userData ?? "";
  const [otp, setOtp] = useState("");
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [selectBankDetails, setSelectBankDetails] = useState("");
  const [availableBalance, setAvailableBalance] = useState(null);
  const [otpText, setOtpText] = useState("Get OTP");

  useEffect(() => {
    dispatch(getUserMainWallet("main"));
  }, []);

  useEffect(() => {
    if (userMainWallet?.length > 0) {
      let filteredData = userMainWallet?.filter(
        (item) => item?.currency_id === walletDetail?._id
      );
      if (filteredData.length > 0) {
        setAvailableBalance(filteredData[0]?.balance);
      }
    }
  }, []);

  useEffect(() => {
    const filereiTem =
      userBankData?.filter(
        (item) => item?.fiatType === walletDetail?.short_name
      )[0] || {};
    setSelectBankDetails(filereiTem);
  }, []);
console.log(selectBankDetails, "selectBankDetails");


  const onGetOtp = () => {
    let data = {
      email_or_phone: emailId,
      resend: true,
      type: false,
    };
    dispatch(sendOtp(data));
    setOtpText("Resend OTP");
    Keyboard.dismiss();
  };

  const onSubmit = () => {
    if (!otp) {
      showError(errorText.otp);
      return;
    }
    if (parseInt(amount) > availableBalance) {
      showError("You do not have sufficent balance!");
      return;
    }

    let data = {
      verification_code: +otp,
      amount: amount,
      coinName: walletDetail?.short_name,
    };
    Keyboard.dismiss();
    dispatch(withdrawFiatCoin(data));
  };

  const handleMax = () => {
    console.log(availableBalance || 0);
    setAmount(availableBalance || 0);
  };

  console.log(walletDetail, "walletDetail");
  return (
    <AppSafeAreaView source={theme === 'Dark' && loginDarkBg}>
      <KeyBoardAware>
        <View style={{ paddingHorizontal: 20 }}>
          <View style={styles.headerView}>
            <TouchableOpacity onPress={() => NavigationService.goBack()}>
              <FastImage
                source={BACK_ICON}
                resizeMode="contain"
                style={{ width: 20, height: 20 }}
                tintColor={theme === 'Dark'? colors.white : colors.black}
              />
            </TouchableOpacity>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <FastImage
                source={printIcon}
                resizeMode="contain"
                style={{ width: 24, height: 20 }}
                tintColor={theme === 'Dark'? colors.white : colors.black}
              />
              {/* <FastImage
                source={moreOption}
                resizeMode="contain"
                style={{ width: 20, height: 20 }}
              /> */}
            </View>
          </View>
          {selectBankDetails ? (
            <Button
              children="Add New bank"
              containerStyle={{ marginVertical: 20, width: "40%", alignSelf: "flex-end", height: 35 }}
              onPress={() => NavigationService.navigate(PAYMENT_OPTIONS_SCREEN)}
            />
          ) : (
            <View style={[styles.networkView, {borderColor: theme !== "Dark" ? "#D4D4D4" : "#595959"}]}>
              <AppText type={SIXTEEN} weight={SEMI_BOLD}>
                Account Details:
              </AppText>
              <View style={[styles.networkView, {borderColor: theme !== "Dark" ? "#D4D4D4" : "#595959"}]}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 10,
                  }}
                >
                  <AppText weight={SEMI_BOLD} type={FOURTEEN}>
                    Account Holder Name :{" "}
                  </AppText>
                  <AppText weight={SEMI_BOLD}>
                    {selectBankDetails?.account_holder_name}{" "}
                  </AppText>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 10,
                  }}
                >
                  <AppText weight={SEMI_BOLD} type={FOURTEEN}>
                    Account Number :{" "}
                  </AppText>
                  <AppText weight={SEMI_BOLD}>
                    {selectBankDetails?.account_number}{" "}
                  </AppText>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 10,
                  }}
                >
                  <AppText weight={SEMI_BOLD} type={FOURTEEN}>
                    Bank Name :{" "}
                  </AppText>
                  <AppText weight={SEMI_BOLD}>
                    {selectBankDetails?.bank_name}{" "}
                  </AppText>
                </View>
                {selectBankDetails?.ifsc_code && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 10,
                    }}
                  >
                    <AppText weight={SEMI_BOLD} type={FOURTEEN}>
                      IFSC Code :{" "}
                    </AppText>
                    <AppText weight={SEMI_BOLD}>
                      {selectBankDetails?.ifsc_code}{" "}
                    </AppText>
                  </View>
                )}
                {selectBankDetails?.iban && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 10,
                    }}
                  >
                    <AppText weight={SEMI_BOLD} type={FOURTEEN}>
                    IBAN :{" "}
                    </AppText>
                    <AppText weight={SEMI_BOLD}>
                      {selectBankDetails?.iban}{" "}
                    </AppText>
                  </View>
                )}
                {selectBankDetails?.swift_code && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 10,
                    }}
                  >
                    <AppText weight={SEMI_BOLD} type={FOURTEEN}>
                    SWIFT Code :{" "}
                    </AppText>
                    <AppText weight={SEMI_BOLD}>
                      {selectBankDetails?.swift_code}{" "}
                    </AppText>
                  </View>
                )}
                {selectBankDetails?.aba_routing_number && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 10,
                    }}
                  >
                    <AppText weight={SEMI_BOLD} type={FOURTEEN}>
                    ABA Routing Number :{" "}
                    </AppText>
                    <AppText weight={SEMI_BOLD}>
                      {selectBankDetails?.aba_routing_number}{" "}
                    </AppText>
                  </View>
                )}
              </View>
            </View>
          )}

          <Input
            placeholder="Minimal 0"
            max
            onMax={handleMax}
            keyboardType="numeric"
            value={String(amount)}
            onChangeText={(value) => setAmount(value)}
          />
          {availableBalance < 1 ||
            (amount < 1 && (
              <AppText
                weight={SEMI_BOLD}
                type={TEN}
                style={{ color: "#E86161", marginTop: 5 }}
              >
                Insufficient funds!
              </AppText>
            ))}
          <View style={[styles.networkView, {borderColor: theme !== "Dark" ? "#D4D4D4" : "#595959"}]}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 10,
              }}
            >
              <AppText weight={SEMI_BOLD}>Available Balance :</AppText>
              <AppText weight={SEMI_BOLD}>
                {availableBalance || 0} {walletDetail?.walletDetail?.short_name}
              </AppText>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 10,
              }}
            >
              <AppText weight={SEMI_BOLD}>Withdrawal Fee : </AppText>
              <AppText weight={SEMI_BOLD}>
                {walletDetail?.withdrawal_fee}{" "}
                {walletDetail?.walletDetail?.short_name}
              </AppText>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 10,
              }}
            >
              <AppText weight={SEMI_BOLD}>Maximum Withdrawal : </AppText>
              <AppText weight={SEMI_BOLD}>
                {walletDetail?.max_withdrawal}{" "}
                {walletDetail?.walletDetail?.short_name}
              </AppText>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 10,
              }}
            >
              <AppText weight={SEMI_BOLD}>Minimum Withdrawal : </AppText>
              <AppText weight={SEMI_BOLD}>
                {walletDetail?.min_withdrawal}{" "}
                {walletDetail?.walletDetail?.short_name}
              </AppText>
            </View>
          </View>
          <AppText
            weight={SEMI_BOLD}
            type={SIXTEEN}
            style={{ marginVertical: 15 }}
          >
            OTP
          </AppText>
          <Input
            // title={titleText.code}
            placeholder={placeHolderText.code}
            value={otp}
            onChangeText={(text) => setOtp(text)}
            keyboardType="numeric"
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => addressInput?.current?.focus()}
            isOtp
            onSendOtp={() => onGetOtp()}
            otpText={otpText}
          />
          {/* <View
            style={{
              marginVertical: 20,
              flexDirection: "row",
              gap: 20,
              alignItems: "center",
            }}
          >
            <AppText weight={SEMI_BOLD}>Receive Amount: </AppText>
            <AppText weight={SEMI_BOLD}>
              {amount - walletDetail?.walletDetail?.withdrawal_fee < 0
                ? 0
                : amount - walletDetail?.walletDetail?.withdrawal_fee ||
                  "---"}{" "}
              {walletDetail?.walletDetail?.short_name}
            </AppText>
          </View> */}

          <Button
            children="Withdraw"
            disabled={!amount || !otp || availableBalance < amount}
            onPress={() => onSubmit()}
            containerStyle={{ marginTop: 30 }}
          />
        </View>
        {/* <View style={styles.container}> */}
        {/* <View
            style={{
              flexDirection: 'row',
              marginTop: 10,
              justifyContent: 'space-evenly',
            }}> */}
        {/* {chain?.length > 0 ? (
              chain?.map(item => (
                <TouchableOpacityView
                  style={{
                    backgroundColor: coinChain === item ? colors.buttonBg :colors.textGray,
                    padding: 10,
                    alignItems: 'center',
                    borderRadius: 10
                  }}
                  onPress={() => setCoinChain(item)}
                  >
                  <AppText color={BLACK} type={TWELVE} weight={SEMI_BOLD}>
                    {item}
                  </AppText>
                </TouchableOpacityView>
              ))
            ) : (
              <AppText>No chain Availbale</AppText>
            )} */}
        {/* </View> */}
        {/* <Input
            title={titleText.code}
            placeholder={placeHolderText.code}
            value={otp}
            onChangeText={text => setOtp(text)}
            keyboardType="numeric"
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => addressInput?.current?.focus()}
            isOtp
            onSendOtp={() => onGetOtp()}
            otpText={otpText}
          /> */}
        {/* <Input
            title={titleText.wallet}
            placeholder={placeHolderText.wallet}
            value={address}
            onChangeText={text => setAddress(text)}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
            assignRef={input => {
              addressInput.current = input;
            }}
            onSubmitEditing={() => amountInput?.current?.focus()}
          /> */}
        {/* <Input
            title={titleText.amount}
            placeholder={placeHolderText.amount}
            value={amount}
            onChangeText={text => setAmount(text)}
            keyboardType="numeric"
            returnKeyType="done"
            onSubmitEditing={() => onSubmit()}
            assignRef={input => {
              amountInput.current = input;
            }}
          /> */}

        {/* </View> */}
        {/* <View style={styles.container}>
          <AppText color={SECOND} weight={SEMI_BOLD} type={FOURTEEN}>
            Disclaimer:
          </AppText>
          <AppText style={styles.disclaimerText} color={SECOND}>
            •  Minimum Withdrawal should be of {walletDetail?.min_withdrawal}
          </AppText>
          <AppText style={styles.disclaimerText} color={SECOND}>
            • Maximum Withdrawal should be of : {walletDetail?.max_withdrawal}
          </AppText>
          <AppText style={styles.disclaimerText} color={SECOND}>
            • Withdrawal Fee will be: {walletDetail?.withdrawal_fee}
          </AppText>
        </View> */}
      </KeyBoardAware>
    </AppSafeAreaView>
  );
};
export default WithdrawInr;
const styles = StyleSheet.create({
  headerView: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  searchView: {
    flexDirection: "row",
    // justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#00000033",
    width: "100%",
    borderRadius: 10,
    height: 58,
    marginRight: 10,
  },
  networkView: {
    // borderWidth: 1,
    // borderColor: "#D4D4D4",
    // marginTop: 10,
    padding: 15,
    borderRadius: 10,
  },
  chainView: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  addressView: {
    borderWidth: 1,
    borderColor: "#D4D4D4",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  nameView: {
    borderWidth: 1,
    borderColor: "#D4D4D4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // padding: 20,
    padding: 15,
    borderRadius: 10,
    // gap: 10
  },
  networkView: {
    borderWidth: 1,
    borderColor: "#D4D4D4",
    marginTop: 20,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
});
