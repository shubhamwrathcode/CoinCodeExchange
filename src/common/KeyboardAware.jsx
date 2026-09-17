import React from 'react';
import {Platform} from 'react-native';
import {KeyboardAwareScrollView} from '@codler/react-native-keyboard-aware-scroll-view';
import {authStyles} from '../screens/auth/authStyles';

const KeyBoardAware = props => {
  return (
    <KeyboardAwareScrollView
      {...props}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid
      enableAutomaticScroll
      keyboardOpeningTime={0}
      extraScrollHeight={Platform.OS === 'ios' ? 24 : 36}
      contentContainerStyle={[
        {flexGrow: 1, paddingBottom: Platform.OS === 'ios' ? 24 : 36},
        props.containerStyle,
      ]}
      style={[authStyles.mainContainer, props.style]}
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}>
      {props?.children}
    </KeyboardAwareScrollView>
  );
};

export default KeyBoardAware;
