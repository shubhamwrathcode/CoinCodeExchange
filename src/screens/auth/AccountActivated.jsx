import React, { useState } from "react";
import {
  AppSafeAreaView,
  AppText,
  BOLD,
  Button,
  EIGHTEEN,
  FOURTEEN,
  SEMI_BOLD,
  THIRTEEN,
  TWELVE,
  TWENTY,
} from "../../shared";
import { ScrollView, StyleSheet, View } from "react-native";
import { checkarrow, register_sucessfull_img, secure_icon } from "../../helper/ImageAssets";
import FastImage from "react-native-fast-image";
import NavigationService from "../../navigation/NavigationService";
import { LOGIN_SCREEN, NAVIGATION_AUTH_STACK } from "../../navigation/routes";
import { useTheme } from "../../hooks/useTheme";
import { useRoute } from "@react-navigation/native";
import { useAppDispatch } from "../../store/hooks";
import { enterMainAppAfterSignup } from "../../actions/accountActions";

const AccountActivated = () => {
  const dispatch = useAppDispatch();
  const { colors: themeColors } = useTheme();
  const route = useRoute();
  const isBlocked = route?.params?.mode === "blocked";
  const [verifyBusy, setVerifyBusy] = useState(false);

  const handleVerifyNow = async () => {
    setVerifyBusy(true);
    try {
      await Promise.resolve(dispatch(enterMainAppAfterSignup()));
    } finally {
      setVerifyBusy(false);
    }
  };

  return (
    <AppSafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.content}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.tigerWrapper}>
            <FastImage
              source={register_sucessfull_img}
              resizeMode="contain"
              style={styles.tigerImage}
            />
          </View>
          {isBlocked ? (
            <AppText type={EIGHTEEN} weight={BOLD} color="#9E4E5F" style={styles.welcomeTitle}>
              Account Temporarily Blocked
            </AppText>
          ) : null}
          {isBlocked ? (
            <>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.bodyText, { color: "#8A8464" }]}>
                Your account has been blocked due to suspicious activity.
              </AppText>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.bodyText, { color: "#9E4E5F" }]}>
                For security reasons, we have temporarily restricted access.
              </AppText>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.bodyText, { color: "#C2A04A" }]}>
                If you believe this was done by mistake, please contact us at{" "}
                <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: "#2C6CB4" }}>
                  support@wrathcode.com
                </AppText>
                .
              </AppText>
            </>
          ) : (
            <>
              <AppText weight={BOLD} style={[styles.welcomeTitle, { color: themeColors.text }]}>
                Welcome to AGCE Verify your identity to claim{" "}
                <AppText type={TWENTY} weight={BOLD} style={{ color: '#d1aa67' }}>
                  exciting bonus
                </AppText>
                .
              </AppText>

              <View style={[styles.privTable, { borderColor: themeColors.border }]}>
                <View style={[styles.privHeadRow, { borderBottomColor: themeColors.border }]}>
                  <View style={styles.privColFeature}>
                    <AppText type={THIRTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
                      Privileges
                    </AppText>
                  </View>
                  <View style={styles.privColNv}>
                    <AppText type={THIRTEEN} weight={SEMI_BOLD} style={[styles.privCellTextCenter, { color: themeColors.text }]}>
                      Not Verified
                    </AppText>
                  </View>
                  <View style={styles.privColV}>
                    <AppText type={THIRTEEN} weight={SEMI_BOLD} style={[styles.privCellTextCenter, { color: themeColors.text }]}>
                      Verified
                    </AppText>
                  </View>
                </View>
                <View style={[styles.privRow, { borderBottomColor: themeColors.border }]}>
                  <View style={styles.privColFeature}>
                    <AppText type={THIRTEEN} style={{ color: themeColors.text }}>
                      Withdrawal
                    </AppText>
                  </View>
                  <View style={styles.privColNv}>
                    <AppText type={THIRTEEN} style={[styles.privCellTextCenter, { color: themeColors.secondaryText }]}>
                      ----
                    </AppText>
                  </View>
                  <View style={styles.privColV}>
                    <AppText type={THIRTEEN} weight={SEMI_BOLD} style={[styles.privCellTextCenter, { color: themeColors.text }]}>
                      3M USDT
                    </AppText>
                  </View>
                </View>
                <View style={[styles.privRow, { borderBottomColor: themeColors.border }]}>
                  <View style={styles.privColFeature}>
                    <AppText type={THIRTEEN} style={{ color: themeColors.text }}>
                      Deposit
                    </AppText>
                  </View>
                  <View style={styles.privColNv}>
                    <AppText type={THIRTEEN} style={[styles.privCellTextCenter, { color: themeColors.secondaryText }]}>
                      ----
                    </AppText>
                  </View>
                  <View style={styles.privColV}>
                    <FastImage source={checkarrow} style={styles.checkIcon} resizeMode="contain" />
                  </View>
                </View>
                <View style={[styles.privRow, { borderBottomColor: themeColors.border }]}>
                  <View style={styles.privColFeature}>
                    <AppText type={THIRTEEN} style={{ color: themeColors.text }}>
                      Trading
                    </AppText>
                  </View>
                  <View style={styles.privColNv}>
                    <AppText type={THIRTEEN} style={[styles.privCellTextCenter, { color: themeColors.secondaryText }]}>
                      ----
                    </AppText>
                  </View>
                  <View style={styles.privColV}>
                    <FastImage source={checkarrow} style={styles.checkIcon} resizeMode="contain" />
                  </View>
                </View>
                <View style={[styles.privRow, styles.privRowLast]}>
                  <View style={styles.privColFeature}>
                    <AppText type={THIRTEEN} style={{ color: themeColors.text }}>
                      P2P
                    </AppText>
                  </View>
                  <View style={styles.privColNv}>
                    <AppText type={THIRTEEN} style={[styles.privCellTextCenter, { color: themeColors.secondaryText }]}>
                      ----
                    </AppText>
                  </View>
                  <View style={styles.privColV}>
                    <FastImage source={checkarrow} style={styles.checkIcon} resizeMode="contain" />
                  </View>
                </View>
              </View>
              {isBlocked ? (
                <Button
                  children="Back to Login"
                  onPress={() =>
                    NavigationService.navigate(NAVIGATION_AUTH_STACK, {
                      screen: LOGIN_SCREEN,
                    })
                  }
                  containerStyle={[styles.loginButton, { backgroundColor: themeColors.button }]}
                  titleStyle={{ color: themeColors.buttonText }}
                />
              ) : (
                <Button
                  children="Verify Now"
                  onPress={handleVerifyNow}
                  loading={verifyBusy}
                  disabled={verifyBusy}
                  containerStyle={[styles.loginButton, { backgroundColor: themeColors.button }]}
                  titleStyle={{ color: themeColors.buttonText }}
                />
              )}
              <View style={styles.secureFooter}>
                <FastImage source={secure_icon} style={styles.secureIcon} resizeMode="contain" />
                <AppText type={THIRTEEN} style={[styles.secureText, { color: themeColors.secondaryText }]}>
                  Your information is securely encrypted on AGCE.
                </AppText>
              </View>
            </>
          )}
        </ScrollView>

      </View>
    </AppSafeAreaView>
  );
};

export default AccountActivated;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 25,
    paddingBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tigerWrapper: {
    width: 350,
    height: 270,
    marginBottom: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  tigerImage: {
    width: 350,
    height: 270,
  },
  welcomeTitle: {
    textAlign: "center",
    marginBottom: 12,
    fontSize: 20,
  },
  bodyText: {
    textAlign: "center",
    marginBottom: 5,
    opacity: 0.95,
  },
  privTable: {
    width: "100%",
    maxWidth: 400,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    overflow: "hidden",
  },
  privHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  privRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  privRowLast: {
    borderBottomWidth: 0,
  },
  privColFeature: {
    flex: 1.65,
    minWidth: 0,
    paddingRight: 8,
    justifyContent: "center",
  },
  /** Same width for column 2 & 3 so ---- and icons line up under headers */
  privColNv: {
    width: 104,
    alignItems: "center",
    justifyContent: "center",
  },
  privColV: {
    width: 104,
    alignItems: "center",
    justifyContent: "center",
  },
  privCellTextCenter: {
    textAlign: "center",
    width: "100%",
  },
  checkIcon: {
    width: 15,
    height: 15,
  },
  secureFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    marginVertical: 8,
    maxWidth: 400,
  },
  secureIcon: {
    width: 22,
    height: 22,
    marginRight: 10,
    // bottom:5
  },
  secureText: {
    flex: 1,
    lineHeight: 20,
  },
  loginButton: {
    width: "95%",
    marginTop: 8,
    marginHorizontal: 25,
    marginBottom: 24,
    alignSelf: "center",
  },
});
