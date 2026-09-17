import React from 'react';
import {GestureResponderEvent, StyleSheet, View} from 'react-native';
import ReactNativeModal from 'react-native-modal';
import {colors} from '../theme/colors';
import {borderWidth, universalPaddingHorizontalHigh} from '../theme/dimens';
import {AppText, EIGHTEEN, RED, SEMI_BOLD} from './AppText';
import {Button} from './Button';

interface CommonModalProps {
  isVisible: boolean;
  title: string;
  onBackButtonPress: () => void;
  onPressNo: (event: GestureResponderEvent) => void;
  onPressYes: () => void;
  subtitle?: string;
}

const LogoutModal = ({
  isVisible,
  onBackButtonPress,
  onPressYes,
  onPressNo,
  title,
  subtitle,
}: CommonModalProps) => {
  return (
    <ReactNativeModal
      animationOut={'slideOutDown'}
      isVisible={isVisible}
      backdropOpacity={1}
      onBackdropPress={onBackButtonPress}
      onBackButtonPress={onBackButtonPress}>
      <View style={styles.container}>
        <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={styles.title}>
          {title}
        </AppText>
        <View style={styles.buttonContainer}>
          <Button
            children="Logout"
            onPress={onPressYes}
            containerStyle={styles.noButton}
            titleStyle={styles.buttonTitle}
          />
          <Button
            children="Cancel"
            onPress={onPressNo}
            containerStyle={styles.yesButton}
            titleStyle={styles.buttonTitle2}
          />
        </View>
        <AppText color={RED} style={styles.title}>
          {subtitle}
        </AppText>
      </View>
    </ReactNativeModal>
  );
};

export {LogoutModal};
const styles = StyleSheet.create({
  container: {
    padding: universalPaddingHorizontalHigh,
  },
  icon: {
    height: 50,
    width: 50,
    marginBottom: 10,
  },
  singleContainer: {},
  title: {
    textAlign: 'center',
  },
  buttonTitle: {
    color: colors.white,
    fontSize: 14,
  },
  buttonTitle2: {
    color: colors.buttonBg,
    fontSize: 14,
  },
  noButton: {
    width: '100%',
  },
  yesButton: {
    backgroundColor: colors.black,
    width: '100%',
    marginTop: 20,
    borderWidth: borderWidth,
    borderColor: colors.buttonBg,
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 10,
  },
});
