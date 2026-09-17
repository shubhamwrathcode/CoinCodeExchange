import React, { useState } from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import {
  AppText,
  SEMI_BOLD,
  SIXTEEN,
  TEN,
  FOURTEEN,
  DISCLAIMTEXT,
} from "./AppText";
import { Input } from "./Input";
import { colors } from "../theme/colors";
import KeyBoardAware from "./KeyboardAware";
import { useDispatch } from "react-redux";
import { checkValue } from "../helper/utility";
import { useAppSelector } from "../store/hooks";
import { forgotOtp } from "../actions/authActions";
import { editEmail } from "../actions/accountActions";
import FastImage from "react-native-fast-image";
import { closeIcon } from "../helper/ImageAssets";

const ChangeEmail = ({ userData, email, setEmail, otp, setOtp, onCloseEmail }) => {
  const dispatch = useDispatch();
  const languages = useAppSelector((state) => state.account.languages);
  const [otpText, setOtpText] = useState(checkValue(languages?.register_nine));

  const onGetOtp = (addr) => {
    if (!addr) {
      // showError("Please Enter New Email");
      return;
    }
    let data = {
      email_or_phone: addr,
      resend: true,
      type: "registration",
    };
    dispatch(forgotOtp(data));
    setOtpText(checkValue(languages?.register_ten));
  };

  const handleChangeEmail = () => {
    let data = {
      emailId: email,
      eotp: otp,
    };
    dispatch(editEmail(data, onCloseEmail));
  };

  const isSignupEmail = userData?.registeredBy === "email" || userData?.registeredBy === "google";

  return (
    <View style={styles.sheetContainer}>
      <KeyBoardAware 
        style={styles.keyboardAware} 
        containerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: colors.white }}>Change Email</AppText>
          <TouchableOpacity onPress={onCloseEmail} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <FastImage source={closeIcon} style={styles.closeBtn} tintColor={colors.white} resizeMode="contain" />
          </TouchableOpacity>
        </View>

        {userData?.emailId && (
          <Input
            title="Registered Email"
            placeholder={userData?.emailId}
            keyboardType="email-address"
            mainContainer={styles.inputMain}
            containerStyle={styles.inputReadOnly}
            editable={false}
          />
        )}

        {!isSignupEmail ? (
          <>
            <Input
              title="New Email"
              placeholder="Enter New Email"
              keyboardType="email-address"
              mainContainer={styles.inputMain}
              containerStyle={styles.inputContainer}
              value={email}
              onChangeText={setEmail}
              otpText={otpText}
              isOtp
              onSendOtp={() => onGetOtp(email)}
            />
            <Input
              title="OTP"
              placeholder="Enter OTP"
              keyboardType="numeric"
              mainContainer={styles.inputMain}
              containerStyle={styles.inputContainer}
              value={otp}
              onChangeText={setOtp}
            />
          </>
        ) : (
          <View style={styles.disclaimerBox}>
            <AppText color={DISCLAIMTEXT} type={TEN}>
              *Signup method cannot be changed. Contact support for any modification in email.
            </AppText>
          </View>
        )}

        {!isSignupEmail && (
          <TouchableOpacity 
            style={styles.submitBtn} 
            onPress={handleChangeEmail}
            activeOpacity={0.8}
          >
            <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: colors.black }}>Submit</AppText>
          </TouchableOpacity>
        )}
      </KeyBoardAware>
    </View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    flex: 1,
    backgroundColor: colors.newThemeColor,
  },
  keyboardAware: {
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  closeBtn: {
    width: 22,
    height: 22,
  },
  inputMain: {
    marginBottom: 20,
  },
  inputContainer: {
    backgroundColor: '#2b3139',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  inputReadOnly: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    opacity: 0.7,
  },
  disclaimerBox: {
    padding: 15,
    backgroundColor: 'rgba(255, 179, 0, 0.05)',
    borderRadius: 10,
    marginTop: 10,
  },
  submitBtn: {
    marginTop: 20,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ChangeEmail;
