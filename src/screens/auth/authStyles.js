import { StyleSheet, Platform } from "react-native";
import {
  Screen,
  borderWidth,
  inputHeight,
  universalPaddingHorizontalHigh,
} from "../../theme/dimens";
import { colors } from "../../theme/colors";

export const authStyles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    // paddingHorizontal: universalPaddingHorizontalHigh,
  },
  welcomeLogo: {
    height: 500,
    width: 200,
    alignSelf: "center",
  },
  welcomeSecondContainer: {
    flex: 1,
    marginTop: Screen.Height / 9,
    // justifyContent: "center",
    // alignItems: "center"
  },
  welcomeSecondContainer2: {
    flex: 1,
  },
  tradeSign: {
    height: 250,
    width: 250,
    // height: 20,
    // width: 90,
    // position: 'absolute',
    // left: 200,
    // top: 35,
  },
  welcomeButton: {
    marginVertical: 30,
    marginHorizontal: 45,
  },
  loginButton: {
    marginHorizontal: 45,
  },
  bottomText: {
    textAlign: "center",
    position: "absolute",
    bottom: Platform.OS === "ios" ? 20 : 10,
    right: 0,
    left: 0,
  },
  bottomTextLogin: {
    textAlign: "center",
    marginBottom: "5%",
    // position: 'absolute',
    // bottom: Platform.OS === "ios" ? -50 : 20,
    // right: 0,
    // left: 0,
  },
  forgotText: {
    marginVertical: 12,
    alignSelf: "flex-end",
  },
  forgotContainer: {
    marginHorizontal: universalPaddingHorizontalHigh,
    marginBottom: "5%",
    // backgroundColor: colors.offWhite
  },
  marginTop: {
    marginVertical: Platform.OS === "ios" ? 25 : 40,
    marginHorizontal: Platform.OS === "ios" ? 10 : 0,
  },
  underlineStyleBase: {
    height: inputHeight,
    borderWidth: borderWidth,
    backgroundColor: colors.inputBackground,
    borderRadius: 10,
    marginTop: 50,
    borderColor: colors.inputBorder,
    // paddingHorizontal: 10
  },

  underlineStyleHighLighted: {
    borderColor: colors.buttonBg,
  },
  tabbar: {
    backgroundColor: "transparent",
    shadowOpacity: 0,
    elevation: 0,
    borderBottomWidth: 0,
  },
  tabBarMain: {
    padding: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 20
    // justifyContent: "center",

  },
  tabBarActive: {
    alignItems: "center",
    justifyContent: "center",
    width: "15%",
    // borderBottomWidth: 1,
    paddingBottom: 10,
    // borderBottomColor: colors.buttonBg,
  },
  tabBarInActive: {
    alignItems: "center",
    justifyContent: "center",
    width: "15%",
    paddingBottom: 10,
    // borderBottomWidth: 1,
    // borderBottomColor: colors.grey,
  },
  mobileContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,

  },
  picker: {
    flex: 0.6,
    marginEnd: 10,
  },
  mobileInput: {
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Platform.OS === "ios" ? 20 : 20,
    marginStart: 5,
    gap: 15,
  },
  termsText: {
    textDecorationLine: "underline",
  },
  marginUp: {
    marginTop: 20,
  },
  captchaBox: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    borderWidth: 2,
    borderColor: "'#F3BB2B'",
    borderRadius: 13,
    paddingHorizontal: 12,
    justifyContent: "space-between",
    padding: 10,
  },
  card: {
    // padding: 12,
    marginTop: 20,
    borderRadius: 15,
    // backgroundColor: "#FAF9F6",
  },
  cardDark: {
    marginTop: 20,
    // padding: 12,
    borderRadius: 15,
    // backgroundColor: "#18191D",
  },
});
