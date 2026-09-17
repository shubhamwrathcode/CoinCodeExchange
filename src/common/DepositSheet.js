import React, { } from "react";

import {
  View,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import FastImage from "react-native-fast-image";
import {
  AppText,
  BLACK,
  BOLD,
  FOURTEEN,
  GREEN,
  NORMAL,
  SECOND,
  SEMI_BOLD,
  SEVENTEEN,
  SIXTEEN,
  TEN,
  TWELVE,
  TWENTY,
} from "./AppText";
import { colors } from "../theme/colors";
import {
  Screen,
  borderWidth,
  universalPaddingHorizontal,
  universalPaddingHorizontalHigh,
} from "../theme/dimens";
import {
  back_ic,
  newDepositDarkIcon,
  newDepositIcon,
  right_ic,
} from "../helper/ImageAssets";
import NavigationService from "../navigation/NavigationService";
import { DEPOSIT_WALLET_SCREEN } from "../navigation/routes";

const DepositSheet = ({ theme }) => {
  return (
    <View style={{ paddingHorizontal: 20, flex: 1 }}>
      <AppText
        color={theme !== "Dark" ? BLACK : "#FFF"}
        weight={BOLD}
        type={TWENTY}
        style={{ alignSelf: "center" }}
      >
        Deposit
      </AppText>
      <View>
        <View style={{ marginTop: 40 }}>
          <AppText type={FOURTEEN} color={theme !== "Dark" ? BLACK : "#FFF"}>I have crypto assets</AppText>
          <TouchableOpacity
            style={{
              marginTop: 15,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
            onPress={() => NavigationService.navigate(DEPOSIT_WALLET_SCREEN, { data: "Crypto" })}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <FastImage
                source={theme !== "Dark" ? newDepositIcon : newDepositDarkIcon}
                resizeMode="contain"
                style={{ width: 30, height: 30 }}
              />
              <View style={{ marginLeft: 10 }}>
                <AppText type={SIXTEEN} weight={SEMI_BOLD} color={theme !== "Dark" ? BLACK : "#FFF"}>
                  Deposit Crypto
                </AppText>
                <AppText style={{ color: theme !== "Dark" ? "#454444" : colors.offWhite }}>Deposit Crypto assets via the blockchain</AppText>
              </View>
            </View>
            <FastImage
              source={back_ic}
              resizeMode="contain"
              style={{
                width: 15,
                height: 15,
                transform: [{ rotateX: "180deg" }, { rotateZ: "3.2rad" }],
              }}
              tintColor={theme !== "Dark" ? colors.black : colors.white}
            />
          </TouchableOpacity>
        </View>
        {/* <View style={{ marginTop: 40 }}>
              <AppText type={FOURTEEN}>I don’t have crypto assets</AppText>
              <TouchableOpacity
                style={{
                  marginTop: 15,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
                onPress={() => NavigationService.navigate(DEPOSIT_WALLET_SCREEN, {data: "Fiat"})}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <FastImage
                    source={theme !== "Dark" ? fiatDespositIcon : fiatDespositDarkIcon}
                    resizeMode="contain"
                    style={{ width: 30, height: 30 }}
                  />
                  <View style={{ marginLeft: 10 }}>
                    <AppText type={SIXTEEN} weight={SEMI_BOLD}>
                    Fiat Deposit
                    </AppText>
                    <AppText style={{color:  theme !== "Dark" ?"#454444" :colors.offWhite }}>Depost your funds via bank Transfer </AppText>
                  </View>
                </View>
                <FastImage
                  source={back_ic}
                  resizeMode="contain"
                  style={{
                    width: 15,
                    height: 15,
                    transform: [{ rotateX: "180deg" }, { rotateZ: "3.2rad" }],
                  }}
                  tintColor={theme !== "Dark" ? colors.black : colors.white}
                />
              </TouchableOpacity>
            </View> */}
      </View>
    </View>
  );
};

export default DepositSheet;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.black,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: borderWidth,
    borderColor: colors.inputBorder,
    paddingHorizontal: 0,
  },
  confirmOrder: {
    height: 52,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.inputBackground,
  },
  headerText: { alignSelf: "center", color: "#fff", marginTop: 4 },
  closeView: {
    position: "absolute",
    right: 15,
    padding: 10,
  },
  closeIcon: { width: 12, height: 12, padding: 7 },
  coinListView: {},
  row1: { marginTop: 20, marginHorizontal: 26 },
  fromTo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  row2: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  currencyBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 5,
    marginStart: universalPaddingHorizontal,
    flex: 1,
  },
  currencyBox2: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 5,
    width: "45%",
    justifyContent: "flex-end",
    marginEnd: universalPaddingHorizontal,
    flex: 1,
  },
  coinImg: { width: 31, height: 31 },
  rightBox: { marginLeft: 10, marginTop: 4 },
  rightBox2: { marginRight: 10, marginTop: 4, alignItems: "flex-end" },
  row3: {
    flexDirection: "column",
    marginHorizontal: universalPaddingHorizontal,
    marginTop: 10,
    borderRadius: 5,
    paddingHorizontal: universalPaddingHorizontal,
    paddingVertical: 15,
    alignItems: "center",
    // backgroundColor: colors.inputBackground,
    borderWidth: 2,
    borderColor: colors.inputBorder,
  },
  feeLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  rowThreeHeading: { color: "#ffffff50" },
  typeLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  rateLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  arrow: { width: 24, height: 24 },

  row4: {
    flexDirection: "row",
    marginHorizontal: 26,
    marginTop: 40,
    alignItems: "center",
    justifyContent: "space-between",
  },
  btns: { width: "48%" },
  container2: {
    flexDirection: "row",
    marginHorizontal: universalPaddingHorizontal,
    borderBottomColor: colors.inputBorder,
    borderBottomWidth: borderWidth,
    paddingVertical: universalPaddingHorizontal,
    alignItems: "center",
    justifyContent: "space-between",
  },
  coinLogo: {
    height: 30,
    width: 30,
  },
  rightIc: {
    height: 15,
    width: 15,
  },
  noButton: {
    width: "30%",
    backgroundColor: "#1C1B1B",
    borderColor: colors.buttonBg,
    borderWidth: borderWidth,
    marginEnd: 10,
  },
  yesButton: {
    width: "30%",
    backgroundColor: colors.buttonBg,
    marginStart: 10,
  },
  buttonContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
    marginBottom: 10,
    right: 20,
  },
  buttonTitle: {
    color: colors.white,
    fontSize: 14,
  },
});
