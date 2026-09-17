import React, {useRef, useState} from 'react';
import {
  AppSafeAreaView,
  AppText,
  Button,
  EIGHTEEN,
  FOURTEEN,
  Input,
  SEMI_BOLD,
  TWENTY,
  TWENTY_SIX,
  Toolbar,
  YELLOW,
} from '../../shared';
import {useAppDispatch, useAppSelector} from '../../store/hooks';
import {showError} from '../../helper/logger';
import {errorText, placeHolderText, titleText} from '../../helper/Constants';
import {sendKginOtp, updateKginNumber} from '../../actions/accountActions';
import KeyBoardAware from '../../shared/components/KeyboardAware';
import {Keyboard, StyleSheet, View} from 'react-native';
import {authStyles} from '../auth/authStyles';
import {colors} from '../../theme/colors';
import {
  borderWidth,
  universalPaddingHorizontal,
  universalPaddingHorizontalHigh,
} from '../../theme/dimens';
import {commonStyles} from '../../theme/commonStyles';

const UpdateKgin = () => {
  const dispatch = useAppDispatch();
  const userData = useAppSelector(state => state.auth.userData);
  const {KGIN_NUMBER} = userData ?? '';

  const [kgin, setKgin] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [otpText, setOtpText] = useState('Get OTP');
  const otpInput = useRef(null);

  const onGetOtp = () => {
    if (!kgin) {
      showError(errorText.kgin);
      return;
    }
    let data = {
      mobileNumber: kgin,
    };
    dispatch(sendKginOtp(data));
    setOtpText('Resend OTP');
    Keyboard.dismiss();
  };

  const onSubmit = () => {
    if (!kgin) {
      showError(errorText.kgin);
      return;
    }
    if (!otp) {
      showError(errorText.otp);
      return;
    }

    let data = {
      mobileNumber: kgin,
      otp: otp,
    };
    dispatch(updateKginNumber(data));
    Keyboard.dismiss();
  };
  return (
    <AppSafeAreaView>
      <Toolbar isSecond title={'Update KGIN'} />
      <KeyBoardAware>
        <View style={authStyles.forgotContainer}>
          <AppText type={TWENTY}>
            {KGIN_NUMBER ? 'Your K GLOBAL' : 'ADD K GLOBAL'}
            {'\n'}
            <AppText type={TWENTY_SIX} weight={SEMI_BOLD} color={YELLOW}>
              Identification Number
            </AppText>
          </AppText>
          {!KGIN_NUMBER && (
            <AppText type={FOURTEEN}>
              Fill the form below to Update your KGIN
            </AppText>
          )}
          {KGIN_NUMBER ? (
            <View style={styles.container}>
              <AppText
                type={EIGHTEEN}
                weight={SEMI_BOLD}
                style={commonStyles.centerText}>
                {KGIN_NUMBER}
              </AppText>
            </View>
          ) : (
            <View style={styles.container}>
              <Input
                title={titleText.kgin}
                placeholder={placeHolderText.kgin}
                value={kgin}
                onChangeText={text => setKgin(text)}
                keyboardType="numeric"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => otpInput?.current?.focus()}
              />
              <Input
                title={titleText.code}
                placeholder={placeHolderText.otp}
                value={otp}
                onChangeText={text => setOtp(text)}
                keyboardType="numeric"
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={() => onSubmit()}
                assignRef={input => {
                  otpInput.current = input;
                }}
                isOtp
                onSendOtp={() => onGetOtp()}
                otpText={otpText}
              />
            </View>
          )}
        </View>
      </KeyBoardAware>
      <Button
        children="Submit"
        onPress={() => onSubmit()}
        containerStyle={styles.button}
      />
    </AppSafeAreaView>
  );
};

export default UpdateKgin;
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white_fifteen,
    padding: universalPaddingHorizontal,
    borderWidth: borderWidth,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    marginTop: universalPaddingHorizontal,
  },
  button: {
    margin: universalPaddingHorizontalHigh,
  },
});
