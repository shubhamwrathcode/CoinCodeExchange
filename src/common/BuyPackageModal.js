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
import CustomDropdown from "./CustomDropdown";
import EarningDropdown from "./EarningDropdown";
import { useDispatch } from "react-redux";
import { getWalletBalance } from "../actions/walletActions";
import { useAppSelector } from "../store/hooks";
import { formatToLakh, toFixedEight } from "../helper/utility";
import { Button } from "./Button";
import { AppText } from "./AppText";
import { SpinnerSecond } from "./SpinnerSecond";
import { darkTheme } from "../theme/colors";

const BuyPackageModal = ({ visible, onClose, packages, WalletTypes, onNext, theme }) => {
  const dispatch = useDispatch();
  const earnWalletBal = useAppSelector((state) => state.wallet.earnWalletBal);
  const [selectedWallet, setSelectedWallet] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (selectedWallet && selectedWallet !== "") {
      dispatch(getWalletBalance(selectedWallet, packages?.currency_id));
    }
  }, [selectedWallet]);

  // console.log(earnWalletBal, "earnWalletBal");

  const handleNextStep = () => {
    let data = {
      amount: amount,
      walletType: selectedWallet,
      package: packages
    };
    onNext(data);
  };

  console.log(amount, "amount")


  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          {/* Prevent closing when tapping inside the modal content */}
          <TouchableWithoutFeedback onPress={() => { }}>
            <View style={[styles.container, { backgroundColor: theme !== "Dark" ? "#FAF9F6" : "#18191D" }]}>
              {/* Header */}
              <View style={styles.header}>
                <AppText style={styles.title}>
                  Buy Package »{" "}
                  <Text style={styles.highlight}>
                    {packages?.currency} ({packages?.currency_fullname})
                  </Text>
                </AppText>
                <TouchableOpacity onPress={onClose}>
                  <Text style={styles.close}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView>
                <AppText style={[styles.label, { marginBottom: 8 }]}>
                  Choose Wallet
                </AppText>
                {/* <View style={styles.dropdown}>
                  <Text>{selectedWallet}</Text>
                </View> */}
                <EarningDropdown
                  theme={theme}
                  data={WalletTypes}
                  selected={selectedWallet}
                  onSelect={setSelectedWallet}
                />

                <Text style={[styles.balance, { marginTop: 10 }]}>
                  Balance:{" "}
                  <Text style={styles.highlight}>
                    {earnWalletBal || 0} {packages?.currency}
                  </Text>
                </Text>
                <Text style={styles.balance}>
                  Duration:{" "}
                  <Text style={styles.highlight}>
                    {packages?.duration_days || 0} Days
                  </Text>

                </Text>

                <View style={styles.inputRow}>
                  <TextInput
                    placeholder={amount ? String(amount) : "Enter Subscription Amount"}
                    style={[styles.input, { color: theme !== "Dark" ? darkTheme.darkThemeInputColor : "#fff" }]}
                    keyboardType="numeric"
                    placeholderTextColor="#888"
                    value={amount}
                    onChangeText={setAmount}
                  />
                  <TouchableOpacity
                    onPress={() => setAmount(earnWalletBal)}
                    style={styles.maxBtn}
                  >
                    <Text style={styles.maxText}>Max</Text>
                  </TouchableOpacity>
                </View>
                {earnWalletBal < amount && (
                  <Text style={styles.error}>Insufficient Balance</Text>
                )}

                <Text style={styles.range}>
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
                    Monthly ROI (%):{" "}
                    {packages?.return_percentage_monthly || 0} %
                  </Text>
                  <Text style={styles.bonusItem}>
                    Yearly ROI (%): {packages?.return_percentage_yearly || 0}{" "}
                    %
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
                      +amount +
                      (packages?.return_percentage_yearly * +amount) / 100
                    ) || 0}{" "}
                    {packages?.currency}
                  </Text>
                </View>

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
                  children="Next"
                  containerStyle={{ marginTop: 20 }}
                  // disabled={
                  //   earnWalletBal < packages?.min_amount ||
                  //   amount > earnWalletBal ||
                  //   +amount < packages?.min_amount ||
                  //   +amount > packages?.max_amount
                  // }
                  onPress={() => handleNextStep()}
                />
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
      <SpinnerSecond />
    </Modal>
  );
};

export default BuyPackageModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 16,
  },
  container: {

    borderRadius: 12,
    padding: 16,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
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
    marginTop: 10,
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
    marginVertical: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#CFCFCF33",
    padding: 10,
    borderRadius: 8,

  },
  maxBtn: {
    backgroundColor: "#f4c430",
    padding: 10,
    marginLeft: 10,
    borderRadius: 8,
  },
  maxText: {
    fontWeight: "bold",
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
