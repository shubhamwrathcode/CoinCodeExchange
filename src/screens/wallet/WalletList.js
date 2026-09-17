import {
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AppText, BLACK, DISCLAIMTEXT, FOURTEEN, SEMI_BOLD, TEN, TWELVE, YELLOW } from "../../shared";
import { bitcoin_ic, coinActive, externalLinkIcon, searchIcon } from "../../helper/ImageAssets";
import FastImage from "react-native-fast-image";
import { colors } from "../../theme/colors";
import { BASE_URL } from "../../helper/Constants";
import { toFixedFive, toFixedFour, twoFixedTwo } from "../../helper/utility";
import { useEffect, useRef, useState } from "react";

const WalletList = ({ userWallet, theme, onSheetOpen }) => {
  const [hideAssets, setHideAssets] = useState(true);
  const depsoitSheet = useRef(null);

  const walletRows = Array.isArray(userWallet) ? userWallet : [];

  const handleCheckboxChange = (type) => {
    if (type === "balance") {
      setHideAssets(!hideAssets);
    } else {
      setHideAssets(false);
    }
    // handleHideBal();
  };


  const filteredCoinList = hideAssets
    ? walletRows.filter(
      (item) =>
        (item?.balance + item?.bonus + item?.locked_balance || 0) > 0.000001
    )
    : walletRows;
  // setFilteredCoinList(data);

  const [value, setValue] = useState("");

  const displayList = value === "" ? filteredCoinList : filteredCoinList.filter((data) => {
    return data?.short_name?.toLowerCase().includes(value?.toLowerCase());
  });

  return (
    <>
      <View
        style={{
          marginTop: 15,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          style={{ flexDirection: "row", gap: 5, alignItems: "center" }}
          onPress={() => handleCheckboxChange("balance")}
        >
          <FastImage
            source={coinActive}
            style={{ width: 12, height: 12 }}
            resizeMode="contain"
            tintColor={hideAssets ? colors.buttonBg : colors.disabledText}
          />
          <AppText color={BLACK}>Hide 0 balances</AppText>
        </TouchableOpacity>
        <View style={[styles.searchView, { borderColor: theme === "Dark" ? "#FFFFFF33" : "#00000033" }]}>
          <FastImage
            source={searchIcon}
            tintColor={"#787878"}
            resizeMode="contain"
            style={{ width: 12, height: 12, paddingHorizontal: 10 }}
          />
          <TextInput
            value={value}
            onChangeText={(val) => setValue(val)}
            placeholder="Search"
            onSubmitEditing={getData}
            placeholderTextColor={"#787878"}
            style={{ fontSize: 10, alignItems: "center", height: 40, color: theme !== "Dark" ? "#000000" : "#FFFFFF" }}
          />
          {/* <AppText type={TEN} color={DISCLAIMTEXT}>
            Search
          </AppText> */}
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 20,
          alignItems: "center",
        }}
      >
        <AppText style={{ width: "40%" }} weight={SEMI_BOLD}>
          Currency
        </AppText>
        <AppText style={{ width: "30%" }} weight={SEMI_BOLD}>
          Balance
        </AppText>
        <AppText style={{ width: "20%" }} weight={SEMI_BOLD}>
          In-Order
        </AppText>
        <AppText style={{ width: "20%" }} weight={SEMI_BOLD}>
          Bonus
        </AppText>
      </View>
      <FlatList
        data={displayList}
        renderItem={({ item }) => {
          return (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 20,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  width: "40%",
                  // gap: 3,
                }}
              >
                <View style={{ borderRadius: 50, overflow: "hidden" }}>
                  <FastImage
                    source={{ uri: BASE_URL + item?.icon_path }}
                    style={{ width: 30, height: 30 }}
                    resizeMode="cover"
                  />
                </View>
                <AppText
                  color={BLACK}
                  style={{ marginLeft: 5 }}
                  weight={SEMI_BOLD}
                >
                  {item?.short_name}
                </AppText>
              </View>
              <AppText color={theme !== "Dark" ? DISCLAIMTEXT : BLACK} style={{ width: "30%" }}>
                {toFixedFour(item?.balance)}
              </AppText>
              <AppText color={theme !== "Dark" ? DISCLAIMTEXT : BLACK} style={{ width: "20%" }}>
                {twoFixedTwo(item?.locked_balance)}
              </AppText>
              <AppText color={theme !== "Dark" ? DISCLAIMTEXT : BLACK} style={{ width: "20%" }}>
                {twoFixedTwo(item?.bonus)}
              </AppText>
              {/* <AppText color={BLACK} style={{width: "20%"}}>
                {item?.short_name === "USDT"
                  ? toFixedFive(item?.balance)
                  : toFixedFive(item?.balance * item?.price || 0)}
              </AppText> */}
            </View>
          );
        }}
        ListEmptyComponent={() => {
          return (
            <View style={{ alignItems: "center", marginTop: 100, gap: 10 }}>
              <AppText weight={SEMI_BOLD} type={FOURTEEN}>No Balance</AppText>
              <AppText
                type={TWELVE}
                weight={SEMI_BOLD}
                color={YELLOW}
                onPress={onSheetOpen}
              >
                Deposit Now <FastImage source={externalLinkIcon} resizeMode="contain" style={{ width: 10, height: 10 }} tintColor={theme !== "Dark" ? colors.buttonBg : colors.white} />
              </AppText>
            </View>
          )
        }}
        style={{ height: "100%" }}
      />
      {/* <RBSheet
        ref={depsoitSheet}
        closeOnDragDown={true}
        closeOnPressMask={true}
        height={360}
        animationType="none"
        customStyles={{
          container: {
            backgroundColor: colors.white,
            height: 350,
            borderTopRightRadius: 40,
            borderTopLeftRadius: 40,
          },
          wrapper: {
            backgroundColor: "#0006",
          },
          draggableIcon: {
            backgroundColor: "transparent",
          },
        }}
      >
        <DepositSheet />
      </RBSheet> */}
    </>
  );
};

export default WalletList;

const styles = StyleSheet.create({
  searchView: {
    flexDirection: "row",
    // justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    // borderColor: "#00000033",
    width: "30%",
    borderRadius: 50,
    height: 25,
  },
});
