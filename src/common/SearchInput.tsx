import React, { useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import {
  borderWidth,
  inputHeight,
  smallButtonHeight,
  universalPaddingHorizontal,
  universalPaddingHorizontalHigh,
} from '../theme/dimens';
import { fontFamily, fontFamilyMedium } from '../theme/typography';
import { colors, lightTheme } from '../theme/colors';
import { eye_close_icon, eye_open_icon, searchIcon } from '../helper/ImageAssets';
import TouchableOpacityView from './TouchableOpacityView';
import FastImage from 'react-native-fast-image';
import { Button } from './Button';
import { AppText, BOLD, FIFTEEN, MEDIUM, NORMAL, YELLOW } from './AppText';
import NavigationService from '../navigation/NavigationService';
import { HOME_SCREEN } from '../navigation/routes';
import { useTheme } from '../hooks/useTheme';

interface InputProps extends TextInputProps {
  value?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  isSecure?: boolean;
  onPressVisible?: () => void;
  isOtp?: boolean;
  onSendOtp?: () => void;
  otpText?: string;
  title?: string;
  mainContainer?: ViewStyle;
  cancelBtn?: boolean;
  searchContainStyle?: ViewStyle;
  sheetDownButton?: boolean;
  sheetDownPress?: () => void;
  theme?: string;
  assignRef?: any;
}

const SearchInput = ({
  value,
  placeholder,
  onChangeText,
  onEndEditing,
  keyboardType,
  assignRef,
  onSubmitEditing,
  multiline,
  containerStyle,
  inputStyle,
  onPressVisible,
  secureTextEntry,
  isSecure,
  isOtp,
  onSendOtp,
  otpText,
  title,
  mainContainer,
  onFocus,
  cancelBtn,
  searchContainStyle,
  sheetDownButton,
  sheetDownPress,
  theme,
  ...props
}: InputProps) => {
  const [focus, setFocus] = useState(true);
  const { colors: themeColors, isDark } = useTheme();

  return (
    <View style={[styles.mainViewStyle, containerStyle,{backgroundColor:isDark? colors.newThemeColor: colors.white}]}>
      <View style={[styles.container, {
        marginLeft: 10,
        marginTop: 20,
        backgroundColor:isDark? colors.themeElevationColor: colors.white,
        borderColor: themeColors.border,
        ...searchContainStyle,
      }]}>
        <FastImage
          source={searchIcon}
          resizeMode="contain"
          style={styles.searchIcon}
          tintColor={themeColors.secondaryText}
        />
        <TextInput
          {...props}
          placeholder={placeholder}
          placeholderTextColor={themeColors.secondaryText}
          autoCorrect={false}
          importantForAutofill="no"
          autoComplete="off"
          selectionColor={themeColors.text + '40'}
          cursorColor={themeColors.text}
          style={[styles.inputF, inputStyle, { color: themeColors.text, fontFamily: fontFamilyMedium, fontSize: 13 }]}
          value={value}
          onChangeText={onChangeText}
          onEndEditing={onEndEditing}
          onSubmitEditing={onSubmitEditing}
          keyboardType={keyboardType}
          ref={component => {
            assignRef && assignRef(component);
          }}
          // autoFocus={focus}
          multiline={multiline}
          secureTextEntry={secureTextEntry}
        />
      </View>
      {cancelBtn && (
        <TouchableOpacityView
          style={styles.cancelButton}
          onPress={() => {
            setFocus(false);
            NavigationService.goBack();
          }}>
          <AppText type={FIFTEEN} color={isDark? colors.white:colors.black} weight={MEDIUM}>
            Cancel
          </AppText>
        </TouchableOpacityView>
      )}

      {sheetDownButton && (
        <TouchableOpacityView
          style={styles.cancelButton}
          onPress={sheetDownPress}>
          <AppText type={FIFTEEN} color={YELLOW} weight={MEDIUM}>
            Cancel
          </AppText>
        </TouchableOpacityView>
      )}
    </View>
  );
};

export { SearchInput };
const styles = StyleSheet.create({
  inputF: {
    fontFamily: fontFamily,
    fontSize: 14,
    height: 40,
    flex: 1,
  },
  container: {
    height: 40,
    borderWidth: 0,
    borderRadius: 5,
    backgroundColor: colors.iconBgColor,
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    paddingHorizontal: universalPaddingHorizontal,
    alignSelf: 'flex-start',
  },
  searchIcon: {
    height: 16,
    width: 16,
  },
  cancelButton: {
    position: 'absolute',
    bottom: 10,
    right: 15,
  },
  mainViewStyle: {
    width: '100%',
    padding: 5,
    flexDirection: 'row',
    alignItems: 'center',
    
  },
});
