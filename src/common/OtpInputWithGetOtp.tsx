import React from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TextInput as RNTextInput,
} from "react-native";
import { AppText, FOURTEEN, SEMI_BOLD, TWELVE } from "./AppText";
import { colors } from "../theme/colors";
import TouchableOpacityView from "./TouchableOpacityView";
// @ts-ignore - no types for react-native-vector-icons
import Ionicons from "react-native-vector-icons/Ionicons";

export interface OtpInputWithGetOtpProps {
  /** Label above the input (e.g. "Email Verification Code") */
  label?: string;
  /** Current OTP value (max 6 digits) */
  value: string;
  /** Called when value changes; pass digits only, max 6 */
  onChangeText: (text: string) => void;
  /** Called when user taps Get OTP or resend */
  onGetOtp: () => void;
  /** Seconds until resend allowed; 0 = show Get OTP button, >0 = show "Code Sent" / "Resend in Xs" */
  resendTimer: number;
  /** Ref for the TextInput (focus from parent) */
  inputRef?: React.RefObject<RNTextInput | null>;
  /** When true, show only "Code Sent" + info (e.g. Authenticator) */
  hideGetOtp?: boolean;
  /** Optional container style override */
  containerStyle?: object;
  /** Optional label style override */
  labelStyle?: object;
}

/**
 * Single continuous OTP input (screenshot style): one rounded field with
 * left = 6-digit input area, right = "Get OTP" button (before send) or "Code Sent" + info icon (after send).
 */
const OtpInputWithGetOtp: React.FC<OtpInputWithGetOtpProps> = ({
  label,
  value,
  onChangeText,
  onGetOtp,
  resendTimer,
  inputRef,
  hideGetOtp = false,
  containerStyle,
  labelStyle,
}) => {
  const normalized = value.replace(/\D/g, "").slice(0, 6);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? (
        <AppText type={FOURTEEN} color={colors.descText} style={[styles.label, labelStyle] as any}>
          {label}
        </AppText>
      ) : null}
      <View style={styles.container}>
        <TextInput
          ref={inputRef as any}
          value={normalized}
          onChangeText={(t) => onChangeText(t.replace(/\D/g, "").slice(0, 6))}
          placeholder=""
          placeholderTextColor={colors.placeholderColor}
          importantForAutofill="no"
          autoComplete="off"
          maxLength={6}
          keyboardType="number-pad"
          contextMenuHidden
          selectionColor={colors.black + '40'}
          cursorColor={colors.black}
          style={styles.input}
        />
        <View style={styles.rightInContainer} pointerEvents="box-none">
          {hideGetOtp ? (
            <View style={styles.codeSentRow}>
              <AppText type={FOURTEEN} color={colors.placeholderColor}>
                Code Sent
              </AppText>
            </View>
          ) : resendTimer > 0 ? (
            <View style={styles.codeSentRow}>
              <AppText type={TWELVE} style={{color:colors.disabledText}}>
                 Resend ({resendTimer}s) {'  '}
              </AppText>
            </View>
          ) : (
            <TouchableOpacityView onPress={onGetOtp} style={styles.getOtpButton} activeOpacity={0.8}>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} color={colors.white}>
                Get OTP
              </AppText>
            </TouchableOpacityView>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.sheetInput,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingVertical: 4,
    paddingLeft: 16,
    paddingRight: 8,
    minHeight: 52,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.white,
    marginRight: 8,
  },
  rightInContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  codeSentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoIcon: {
    marginLeft: 6,
  },
  getOtpButton: {
    backgroundColor: colors.buttonBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minHeight: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default OtpInputWithGetOtp;
