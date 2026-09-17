import React, {useRef, useState} from 'react';
import {
  AppSafeAreaView,
  AppText,
  Button,
  FOURTEEN,
  Input,
  SEMI_BOLD,
  TWENTY,
  TWENTY_SIX,
  Toolbar,
  YELLOW,
} from '../../shared';
import KeyBoardAware from '../../shared/components/KeyboardAware';
import {View} from 'react-native';
import {authStyles} from './authStyles';
import {errorText, placeHolderText} from '../../helper/Constants';
import {showError} from '../../helper/logger';
import {useRoute} from '@react-navigation/native';
import {forgotPassword} from '../../actions/authActions';
import {useAppDispatch, useAppSelector} from '../../store/hooks';
import {checkValue, validatePassword} from '../../helper/utility';
import {SpinnerSecond} from '../../shared/components/SpinnerSecond';
import {MAINHOME_BG} from '../../helper/ImageAssets';

const ResetPassword = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const route = useRoute();
  const data = route?.params?.data ?? '';
  const languages = useAppSelector(state => {
    return state.account.languages;
  });

  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  const confirmPasswordInputRef = useRef(null);
  const onSubmit = () => {
    if (!validatePassword(password)) {
      showError(checkValue(languages?.error_passwordRegex));
      return;
    }
    if (password !== confirmPassword) {
      showError(checkValue(languages?.error_passwordMismatch));
      return;
    }
    let _data = {
      email_or_phone: data?.email_or_phone,
      new_password: password,
      verification_code: data?.otp,
    };
    dispatch(forgotPassword(_data));
  };
  return (
    <AppSafeAreaView source={MAINHOME_BG}>
      <Toolbar />
      <KeyBoardAware>
        <View style={authStyles.forgotContainer}>
          <AppText type={TWENTY} style={{alignSelf: "center"}}>
            {checkValue(languages?.reset_one)}
            <AppText type={TWENTY_SIX} weight={SEMI_BOLD} color={YELLOW}>
              {checkValue(languages?.reset_two)}
            </AppText>
          </AppText>
          <AppText type={FOURTEEN} style={{alignSelf: "center"}}>
            {checkValue(languages?.reset_three)}
          </AppText>
          <Input
            placeholder={checkValue(languages?.place_newPassword)}
            value={password}
            onChangeText={text => setPassword(text)}
            autoCapitalize="none"
            secureTextEntry={!isPasswordVisible}
            returnKeyType="next"
            isSecure
            onSubmitEditing={() => confirmPasswordInputRef?.current?.focus()}
            onPressVisible={() => setIsPasswordVisible(!isPasswordVisible)}
            containerStyle={authStyles.forgotContainer}
          />
          <Input
            placeholder={checkValue(languages?.place_confirmNewPassword)}
            value={confirmPassword}
            onChangeText={text => setConfirmPassword(text)}
            autoCapitalize="none"
            secureTextEntry={!isConfirmPasswordVisible}
            assignRef={input => {
              confirmPasswordInputRef.current = input;
            }}
            returnKeyType="done"
            isSecure
            onSubmitEditing={() => onSubmit()}
            onPressVisible={() =>
              setIsConfirmPasswordVisible(!isConfirmPasswordVisible)
            }
          />

          <Button
            children={'Confirm'}
            onPress={() => onSubmit()}
            containerStyle={authStyles.marginTop}
          />
        </View>
      </KeyBoardAware>
      <SpinnerSecond />
    </AppSafeAreaView>
  );
};

export default ResetPassword;
