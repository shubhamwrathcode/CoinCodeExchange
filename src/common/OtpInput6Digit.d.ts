import type React from 'react';
import type { StyleProp, ViewStyle, TextStyle } from 'react-native';

export interface OtpInput6DigitProps {
  label?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  isDark?: boolean;
  labelStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  hasError?: boolean;
}

declare const OtpInput6Digit: React.ForwardRefExoticComponent<
  OtpInput6DigitProps & React.RefAttributes<{ focus: () => void }>
>;

export default OtpInput6Digit;
