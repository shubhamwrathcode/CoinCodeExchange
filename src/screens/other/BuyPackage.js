import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import CustomDropdown from "../../shared/components/CustomDropdown";
import EarningDropdown from "../../shared/components/EarningDropdown";
import { useDispatch } from "react-redux";
import {
  getWalletBalance,
  subscribeEarningPackage,
} from "../../actions/walletActions";
import { useAppSelector } from "../../store/hooks";
import { formatToLakh, toFixedEight } from "../../helper/utility";
import { Button } from "../../shared/components/Button";
import {
  AppText,
  BLACK,
  DISCLAIMTEXT,
  FOURTEEN,
  GREEN,
  SEMI_BOLD,
  TWELVE,
  YELLOW,
} from "../../shared/components/AppText";
import { AppSafeAreaView } from "../../shared";
import BuyPackageSkeleton from "./BuyPackageSkeleton";
import KeyBoardAware from "../../shared/components/KeyboardAware";
import { useRoute } from "@react-navigation/native";
import FastImage from "react-native-fast-image";
import { BACK_ICON } from "../../helper/ImageAssets";
import { colors } from "../../theme/colors";
import { BASE_URL } from "../../helper/Constants";
import NavigationService from "../../navigation/NavigationService";
import TransferModal from "../../shared/components/TransferModal";

const BuyPackage = ({ }) => {
  const route = useRoute();
  const packages = route?.params?.data;
  console.log(packages, "packages");

  const dispatch = useDispatch();
  const WalletTypes = useAppSelector((state) => state.wallet.walletTypes);
  const theme = useAppSelector((state) => state.auth.theme);
  const earnWalletBal = useAppSelector((state) => state.wallet.earnWalletBal);
  const [selectedWallet, setSelectedWallet] = useState(WalletTypes?.[0]);
  const [amount, setAmount] = useState("");
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState(packages?.distribution?.[0]);
  const [contentLoading, setContentLoading] = useState(true);

  useEffect(() => {
    if (WalletTypes?.length > 0 && (selectedWallet === undefined || selectedWallet === null || selectedWallet === "")) {
      setSelectedWallet(WalletTypes[0]);
    }
  }, [WalletTypes]);

  useEffect(() => {
    if (selectedWallet && selectedWallet !== "" && packages?.currency_id) {
      const walletParam = typeof selectedWallet === "object" ? selectedWallet?.value ?? selectedWallet?.id ?? selectedWallet : selectedWallet;
      dispatch(getWalletBalance(walletParam, packages.currency_id));
    }
  }, [selectedWallet, packages?.currency_id]);

  useEffect(() => {
    if (packages && Array.isArray(WalletTypes)) {
      setContentLoading(false);
    }
  }, [packages, WalletTypes]);

  // console.log(earnWalletBal, "earnWalletBal");

  const buyEarningPackage = () => {
    let data = {
      planId: packages?._id,
      investAmount: +amount,
      walletType: selectedWallet,
    };
    dispatch(subscribeEarningPackage(data, setVisible));
  };

  console.log(amount, activeTab, "activeTab");

  function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString().split("T")[0]; // returns YYYY-MM-DD
  };

  const handlePopup = (theme) => {
    setVisible(false);
    NavigationService.navigate('EarningPortfolio');
  };


  return (
    <AppSafeAreaView style={{ backgroundColor: theme !== "Dark" ? "#FFFFFF" : colors.newThemeColor }}>
      <KeyBoardAware style={{ paddingHorizontal: 20 }}>
        {contentLoading ? (
          <BuyPackageSkeleton />
        ) : (
          <View>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => NavigationService.goBack()}>
                <FastImage
                  source={BACK_ICON}
                  style={{ width: 20, height: 20 }}
                  resizeMode="contain"
                  tintColor={theme !== "Dark" ? colors.black : colors.white}
                />
              </TouchableOpacity>
              <AppText style={[styles.title, { color: theme !== "Dark" ? "#111" : "#fff" }]} weight={SEMI_BOLD}>
                {packages?.currency} Subscribe
              </AppText>
            </View>

            <View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 20,
                  marginVertical: 20,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme !== "Dark" ? "rgba(0,0,0,0.04)" : "transparent",
                    borderWidth: theme !== "Dark" ? 1 : 0,
                    borderColor: theme !== "Dark" ? "rgba(0,0,0,0.08)" : "transparent",
                  }}
                >
                  <FastImage
                    source={{ uri: BASE_URL + packages?.icon_path }}
                    resizeMode="contain"
                    style={{ width: 30, height: 30 }}
                  />
                </View>
                <AppText style={[styles.title, { color: theme !== "Dark" ? "#111" : "#fff" }]} weight={SEMI_BOLD}>
                  {packages?.currency}
                </AppText>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  // backgroundColor:
                  //   theme !== "Dark" ? colors.whiteShadow : "transparent",
                }}
              >
                {packages?.distribution?.map((item, index) => (
                  <TouchableOpacity
                    key={item?.duration_days ?? item?._id}
                    onPress={() => setActiveTab(item)}
                    style={{
                      borderWidth: 1,
                      borderColor:
                        activeTab === item ? colors.buttonBg : "transparent",
                      paddingVertical: 5,
                      paddingHorizontal: 10,
                      borderRadius: 4,
                      marginRight: index < (packages?.distribution?.length ?? 1) - 1 ? 8 : 0,
                      backgroundColor: theme !== "Dark" ? "rgba(0,0,0,0.04)" : colors.themeElevationColor,
                    }}
                  >
                    <AppText
                      type={TWELVE}
                      weight={SEMI_BOLD}
                      style={{ color: theme !== "Dark" ? colors.black : colors.white }}
                    >
                      {item?.duration_days} D
                    </AppText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View
                style={{
                  flexDirection: "row",
                  paddingHorizontal: 10,
                  alignItems: "center",
                  gap: 5,
                  marginVertical: 5,
                }}
              >
                <AppText color={DISCLAIMTEXT}>Est.Apy:</AppText>
                <AppText color={GREEN}>{activeTab?.return_percentage}%</AppText>
              </View>
              <AppText
                style={[styles.label, { marginBottom: 8 }]}
                weight={SEMI_BOLD}
              >
                Payment method
              </AppText>

              <EarningDropdown
                theme={theme}
                data={WalletTypes}
                selected={selectedWallet}
                onSelect={setSelectedWallet}
              />

              <AppText
                style={[styles.label, { marginTop: 15 }]}
                weight={SEMI_BOLD}
              >
                Subscription Amount
              </AppText>

              <View style={[styles.inputRow, {
                borderColor: theme !== "Dark" ? colors.secondBorder : colors.secondaryText,
              }]}>
                <TextInput
                  placeholder={"Enter Subscription Amount"}
                  style={[
                    styles.input,
                    { color: theme !== "Dark" ? "#000" : "#fff" },
                  ]}
                  keyboardType="numeric"
                  placeholderTextColor="#888"
                  value={amount}
                  onChangeText={setAmount}
                />
                <TouchableOpacity
                  onPress={() => setAmount(String(earnWalletBal))}
                  style={styles.maxBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.maxText}>Max</Text>
                </TouchableOpacity>
              </View>
              {earnWalletBal < amount && (
                <Text style={styles.error}>Insufficient Balance</Text>
              )}

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <AppText color={DISCLAIMTEXT} type={TWELVE}>
                  Available Balance
                </AppText>
                <AppText color={DISCLAIMTEXT} type={TWELVE}>
                  {" "}
                  <AppText type={FOURTEEN}>{earnWalletBal || 0}</AppText>{" "}
                  {packages?.currency}
                </AppText>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginVertical: 10,
                }}
              >
                <AppText color={DISCLAIMTEXT} type={TWELVE}>
                  Min. Subscription Amount
                </AppText>
                <AppText color={DISCLAIMTEXT} type={TWELVE}>
                  {" "}
                  <AppText type={FOURTEEN}>
                    {packages?.min_amount || 0}
                  </AppText>{" "}
                  {packages?.currency}
                </AppText>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <AppText color={DISCLAIMTEXT} type={TWELVE}>
                  Estimated Bonus
                </AppText>

                <AppText color={DISCLAIMTEXT} type={TWELVE}>
                  {" "}
                  <AppText type={FOURTEEN}>
                    {(parseFloat(amount || 0) * activeTab?.return_percentage) /
                      100}
                  </AppText>{" "}
                  {packages?.currency}
                </AppText>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginVertical: 10,
                }}
              >
                <AppText color={DISCLAIMTEXT} type={TWELVE}>
                  Receivable Amount
                </AppText>
                <AppText color={DISCLAIMTEXT} type={TWELVE}>
                  {" "}
                  <AppText type={FOURTEEN}>
                    {parseFloat(amount || 0) +
                      (parseFloat(amount || 0) * activeTab?.return_percentage) /
                      100}
                  </AppText>{" "}
                  {packages?.currency}
                </AppText>
              </View>

              <AppText
                type={FOURTEEN}
                color={BLACK}
                style={{ marginVertical: 20 }}
              >
                Interest Rule
              </AppText>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <AppText color={DISCLAIMTEXT} type={TWELVE}>
                  Subscription Date
                </AppText>
                <AppText color={DISCLAIMTEXT} type={TWELVE}>
                  {new Date().toISOString().split("T")[0]}
                </AppText>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 10,
                }}
              >
                <AppText color={DISCLAIMTEXT} type={TWELVE}>
                  Maturity Data
                </AppText>
                <AppText color={DISCLAIMTEXT} type={TWELVE}>
                  {addDays(new Date(), activeTab?.duration_days)}
                </AppText>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 10,
                }}
              >
                <AppText color={DISCLAIMTEXT} type={TWELVE}>
                  Interest Distribution Data
                </AppText>
                <AppText color={DISCLAIMTEXT} type={TWELVE}>
                  {addDays(new Date(), activeTab?.duration_days)}
                </AppText>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 10,
                }}
              >
                <AppText color={DISCLAIMTEXT} type={TWELVE}>
                  Interest Distribution Option
                </AppText>
                <AppText
                  color={DISCLAIMTEXT}
                  type={TWELVE}
                  style={{ width: "50%" }}
                >
                  Distribute interest at the end of each period
                </AppText>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 10,
                }}
              >
                <AppText color={DISCLAIMTEXT} type={TWELVE}>
                  Redemption Option
                </AppText>
                <AppText
                  color={DISCLAIMTEXT}
                  type={TWELVE}
                  style={{ width: "50%" }}
                >
                  Early redemption not available
                </AppText>
              </View>

              {/* <Text style={styles.range}>
              Minimum Amount:{" "}
              <Text style={styles.highlight}>
                {formatToLakh(packages?.min_amount)}
              </Text>
            </Text>
            <Text style={[styles.range, { marginTop: 5 }]}>
              Maximum Amount:{" "}
              <Text style={styles.highlight}>
                {formatToLakh(packages?.max_amount)}
              </Text>
            </Text>

            <Text style={styles.info}>ⓘ Don't have enough balance?</Text>

            <View style={styles.bonusContainer}>
              <AppText style={styles.bonusHeader}>Bonus Rate</AppText>
              <Text style={styles.bonusItem}>
                Monthly ROI (%): {packages?.return_percentage_monthly || 0} %
              </Text>
              <Text style={styles.bonusItem}>
                Yearly ROI (%): {packages?.return_percentage_yearly || 0} %
              </Text>
              <Text style={styles.bonusItem}>
                Estimated Bonus:{" "}
                {toFixedEight(
                  (packages?.return_percentage_yearly * +amount) / 100
                ) || 0}{" "}
                {packages?.currency}
              </Text>
              <Text style={styles.bonusItem}>
                Receive Amount:{" "}
                {toFixedEight(
                  +amount + (packages?.return_percentage_yearly * +amount) / 100
                ) || 0}{" "}
                {packages?.currency}
              </Text>
            </View> */}

              {/* <TouchableOpacity
                  style={styles.button}
                  disabled={
                    (earnWalletBal < packages?.min_amount ||
                    amount > earnWalletBal) &&
                    +amount < packages?.min_amount ||
                    +amount > packages?.max_amount
                  }
                >
                  <Text style={styles.buttonText}>Insufficient Balance</Text>
                </TouchableOpacity> */}
              <Button
                children="Subscribe"
                containerStyle={{ marginTop: 50 }}
                disabled={
                  earnWalletBal < packages?.min_amount ||
                  amount > earnWalletBal ||
                  +amount < packages?.min_amount
                }
                onPress={() => buyEarningPackage()}
              />
            </View>
          </View>
        )}
      </KeyBoardAware>
      <TransferModal
        visible={visible}
        handleVisiblity={handlePopup}
        type={"earning"}
      />
    </AppSafeAreaView>
  );
};

export default BuyPackage;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10,
    width: "65%",
  },
  title: {
    fontSize: 16,
    // color: "#000",
  },
  highlight: {
    color: "#f4c430",
    fontWeight: "bold",
  },
  close: {
    fontSize: 20,
    color: "#fff",
  },
  label: {
    // color: "#000",
    fontSize: 14,
    marginVertical: 10,
  },
  dropdown: {
    backgroundColor: "#222",
    padding: 12,
    borderRadius: 8,
    marginTop: 5,
  },
  balance: {
    color: "#ccc",
    marginVertical: 2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,

    borderRadius: 8,
    // backgroundColor: colors.themeElevationColor,
    paddingRight: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "transparent",
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 8,
  },
  maxBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  maxText: {
    fontWeight: "bold",
    color: "#2BB53C",
  },
  error: {
    color: "red",
    marginBottom: 8,
  },
  range: {
    color: "#ccc",
  },
  info: {
    color: "#aaa",
    fontSize: 13,
    marginTop: 10,
    marginBottom: 10,
  },
  bonusContainer: {
    backgroundColor: "#CFCFCF33",
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  bonusHeader: {
    fontWeight: "bold",
    // color: "#000",
    marginBottom: 6,
  },
  bonusItem: {
    color: "#5E6272",
    fontSize: 14,
    marginVertical: 2,
  },
  button: {
    marginTop: 20,
    backgroundColor: "#f4c430",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    fontWeight: "bold",
    color: "#222",
  },
});
