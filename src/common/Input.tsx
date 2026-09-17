import React, { useState } from "react";
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
  StyleProp,
  TouchableOpacity,
} from "react-native";
import {
  borderWidth,
  inputHeight,
  smallButtonHeight,
  universalPaddingHorizontal,
} from "../theme/dimens";
import { fontFamily, fontFamilyMedium } from "../theme/typography";
import { colors, darkTheme } from "../theme/colors";
import { eye_close_icon, eye_open_icon } from "../helper/ImageAssets";
import TouchableOpacityView from "./TouchableOpacityView";
import FastImage from "react-native-fast-image";
import { Button } from "./Button";
import { AppText, BLACK, FOURTEEN, SECOND, SEMI_BOLD, THIRTEEN, TWELVE, WHITE } from "./AppText";
import { useAppSelector } from "../store/hooks";

interface InputProps extends TextInputProps {
  value?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  hasError?: boolean;
  isSecure?: boolean;
  onPressVisible?: () => void;
  isOtp?: boolean;
  onSendOtp?: () => void;
  otpText?: string;
  title?: string;
  mainContainer?: StyleProp<ViewStyle>;
  currency?: string;
  onfocus?: any;
  assignRef?: any;
  max?: any;
  onMax?: () => void;
  isOtpDisabled?: boolean;
}

import { useTheme } from "../hooks/useTheme";

const Input = ({
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
  hasError = false,
  onPressVisible,
  secureTextEntry,
  isSecure,
  isOtp,
  onSendOtp,
  otpText,
  title,
  mainContainer,
  currency,
  onfocus,
  onBlur,
  max,
  onMax,
  isOtpDisabled,
  ...props
}: InputProps) => {
  const { colors: themeColors, isDark } = useTheme();
  const resolvedInputBg = themeColors.input;
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.inputWrapper, mainContainer]}>
      {title && <AppText type={THIRTEEN} style={[styles.title, { color: themeColors.text }]} weight={SEMI_BOLD}>{title}</AppText>}
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? colors.lightBlackLatest : '#EDEDEE',
            borderColor: hasError
              ? colors.red
              : isFocused
                ? (isDark ? colors.cyan : themeColors.button)
                : (isDark ? "#151619" : "#E5E7EB"),
            borderWidth: 1,
            ...(title ? { marginTop: 0 } : {}),
          },
          containerStyle && typeof containerStyle === "object" ? containerStyle : undefined,
        ]}
      >
        <TextInput
          {...props}
          placeholder={placeholder}
          placeholderTextColor={isDark ? (colors.darkShadeColorText || "#6A7282") : "#84888C"}
          autoCorrect={false}
          importantForAutofill="no"
          autoComplete="off"
          selectionColor={themeColors.text + "40"}
          cursorColor={themeColors.text}
          style={[styles.inputF, { color: isDark ? colors.white : themeColors.text }, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          onEndEditing={onEndEditing}
          onSubmitEditing={onSubmitEditing}
          keyboardType={keyboardType}
          ref={(component) => {
            assignRef && assignRef(component);
          }}
          multiline={multiline}
          secureTextEntry={secureTextEntry}
          onFocus={(e) => {
            setIsFocused(true);
            onfocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
        />
        {isSecure && (
          <TouchableOpacityView
            style={styles.eyeIconContainer}
            onPress={onPressVisible}
          >
            <FastImage
              source={secureTextEntry ? eye_close_icon : eye_open_icon}
              style={styles.eyeIcon}
              resizeMode="contain"
              tintColor={isDark ? colors.disabledText : colors.placeholderColor}
            />
          </TouchableOpacityView>
        )}
        {currency && !isOtp ? (
          <AppText type={TWELVE} style={{ color: themeColors.text, marginRight: max ? 0 : 0 }}>
            {currency}
          </AppText>
        ) : null}
        {max && currency && !isOtp ? (
          <AppText style={{ color: themeColors.secondaryText, marginHorizontal: 8 }}>|</AppText>
        ) : null}
        {max && onMax ? (
          <TouchableOpacity
            onPress={onMax}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            style={{ justifyContent: "center", paddingVertical: 4 }}
          >
            <AppText style={{ color: themeColors.button, fontSize: 12 }} weight={SEMI_BOLD}>
              MAX
            </AppText>
          </TouchableOpacity>
        ) : null}
        {isOtp && (
          <Button
            children={otpText}
            titleStyle={[styles.titleStyle, { color: themeColors.buttonText }]}
            containerStyle={[styles.containerStyle, { backgroundColor: colors.cyan }]}
            onPress={onSendOtp}
            disabled={isOtpDisabled}
          />
        )}
      </View>
    </View>
  );
};

export { Input };
const styles = StyleSheet.create({
  inputWrapper: {
    marginBottom: 8,
  },
  inputF: {
    fontFamily: fontFamilyMedium,
    fontSize: 14,
    // color: colors.black,
    height: inputHeight,
    flex: 1,
  },

  container: {
    marginTop: 2,
    height: inputHeight,
    borderWidth: 1,
    borderColor: "#151619",
    borderRadius: 8,
    paddingHorizontal: universalPaddingHorizontal,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#08090B",
  },
  eyeIcon: {
    height: 20,
    width: 20,
  },
  eyeIconContainer: {
    height: inputHeight,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  otpContainer: {
    height: smallButtonHeight,
  },
  titleStyle: {
    fontSize: 12,
    fontFamily: fontFamilyMedium,
    fontWeight: "500",
  },
  containerStyle: {
    height: smallButtonHeight + 4,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  title: {
    marginBottom: 6,
  },
});
