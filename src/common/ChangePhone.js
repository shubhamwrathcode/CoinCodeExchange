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
import { editPhone } from "../actions/accountActions";
import FastImage from "react-native-fast-image";
import { closeIcon } from "../helper/ImageAssets";
import { CountrySelector } from "./CountrySelector";
import { authStyles } from "../screens/auth/authStyles";

const ChangePhone = ({
  userData,
  phone,
  setPhone,
  otp,
  setOtp,
  onClosePhone,
  country,
  setCountry,
  setCountryCode,
  countryCode,
}) => {
  const dispatch = useDispatch();
  const languages = useAppSelector((state) => state.account.languages);
  const [otpText, setOtpText] = useState(checkValue(languages?.register_nine));

  const onGetOtp = (addr) => {
    if (!addr) {
      // showError("Please Enter New Mobile Number");
      return;
    }
    let data = {
      email_or_phone: `+${countryCode[0]} ${addr}`,
      resend: true,
      type: "registration",
    };
    dispatch(forgotOtp(data));
    setOtpText(checkValue(languages?.register_ten));
  };

  const handleChangePhone = () => {
    let data = {
      mobileNumber: `+${countryCode[0]} ${phone}`,
      motp: otp,
    };
    dispatch(editPhone(data, onClosePhone));
  };

  const isSignupPhone = userData?.registeredBy === "phone";

  return (
    <View style={styles.sheetContainer}>
      <KeyBoardAware 
        style={styles.keyboardAware} 
        containerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: colors.white }}>Change Phone</AppText>
          <TouchableOpacity onPress={onClosePhone} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <FastImage source={closeIcon} style={styles.closeBtn} tintColor={colors.white} resizeMode="contain" />
          </TouchableOpacity>
        </View>

        {userData?.mobileNumber && (
          <Input
            title="Registered Mobile Number"
            placeholder={userData?.mobileNumber}
            keyboardType="numeric"
            mainContainer={styles.inputMain}
            containerStyle={styles.inputReadOnly}
            editable={false}
          />
        )}

        {!isSignupPhone ? (
          <>
            <AppText weight={SEMI_BOLD} style={styles.inputTitle}>New Mobile Number</AppText>
            <View style={styles.mobileRow}>
              <CountrySelector
                onSelectCountry={setCountryCode}
                onCountry={setCountry}
                country={country}
                style={styles.countryPicker}
              />
              <Input
                placeholder="Enter Mobile Number"
                keyboardType="numeric"
                containerStyle={styles.inputContainerCompact}
                mainContainer={styles.mobileInputFlex}
                value={phone}
                onChangeText={setPhone}
                otpText={otpText}
                isOtp
                onSendOtp={() => onGetOtp(phone)}
              />
            </View>

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
              *Signup method cannot be changed. Contact support for any modification in phone number.
            </AppText>
          </View>
        )}

        {!isSignupPhone && (
          <TouchableOpacity 
            style={styles.submitBtn} 
            onPress={handleChangePhone}
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
  inputTitle: {
    color: colors.white,
    marginBottom: 8,
  },
  mobileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  countryPicker: {
    marginTop: 0,
    height: 48,
    marginRight: 10,
  },
  mobileInputFlex: {
    flex: 1,
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
  inputContainerCompact: {
    backgroundColor: '#2b3139',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    height: 48,
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

export default ChangePhone;
