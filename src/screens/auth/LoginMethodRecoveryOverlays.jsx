import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Keyboard,
  Platform,
  ScrollView,
} from "react-native";
import FastImage from "react-native-fast-image";
import RBSheet from "react-native-raw-bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText, Button, BOLD, SEMI_BOLD, MEDIUM, SIXTEEN, FOURTEEN, THIRTEEN, TWELVE } from "../../shared";
import { OtpInput6Digit } from "../../shared";
import TouchableOpacityView from "../../shared/components/TouchableOpacityView";
import { colors } from "../../theme/colors";
import { checkIc, closeIcon, EMAIL, KEY_ICON, PHONE, security_risk_vector_light, security_vector2, security_vector_light2 } from "../../helper/ImageAssets";
import {
  recoveryKeyToMethodType,
  recoveryLostMethodTitle,
  RECOVERY_METHOD_META,
} from "../../helper/loginRecoveryHelpers";

const methodIcon = (key) => {
  if (key === "email") return EMAIL;
  if (key === "phone") return PHONE;
  return KEY_ICON;
};

function methodSub(key, availableMethods) {
  const type = recoveryKeyToMethodType(key);
  const existing = (availableMethods || []).find((m) => Number(m?.type) === type);
  if (existing?.maskedValue) return existing.maskedValue;
  return RECOVERY_METHOD_META[key]?.fallbackSub || "";
}

/**
 * @param {{
 *   step?: null | "select" | "warn" | "requirements" | "verify",
 *   recoverableMethods?: string[],
 *   selectedLost?: string,
 *   availableMethods?: any[],
 *   remainingKeys?: string[],
 *   verifiedKeys?: string[],
 *   verifyKey?: string,
 *   otpValue?: string,
 *   otpError?: boolean,
 *   resendTimer?: number,
 *   verifyBusy?: boolean,
 *   startBusy?: boolean,
 *   resetAck?: boolean,
 *   restrictionHours?: number,
 *   isDark?: boolean,
 *   themeColors?: any,
 *   onSelectLost?: (key: string) => void,
 *   onResetAck?: (ack: boolean) => void,
 *   onClose?: () => void,
 *   onSelectConfirm?: () => void,
 *   onWarnCancel?: () => void,
 *   onWarnConfirm?: () => void,
 *   onPickRemaining?: (key: string) => void,
 *   onRequirementsBack?: () => void,
 *   onVerifySubmit?: (code: string) => void,
 *   onGetCode?: () => void,
 *   onPaste?: () => void,
 *   onOtpChange?: (value: string) => void,
 *   onBackToMethods?: () => void,
 * }} props
 */
export default function LoginMethodRecoveryOverlays({
  step,
  recoverableMethods = [],
  selectedLost = "",
  availableMethods = [],
  remainingKeys = [],
  verifiedKeys = [],
  verifyKey = "",
  otpValue = "",
  otpError = false,
  resendTimer = 0,
  verifyBusy = false,
  startBusy = false,
  resetAck = false,
  restrictionHours = 24,
  isDark,
  themeColors,
  onSelectLost,
  onResetAck,
  onClose,
  onSelectConfirm,
  onWarnCancel,
  onWarnConfirm,
  onPickRemaining,
  onRequirementsBack,
  onVerifySubmit,
  onGetCode,
  onPaste,
  onOtpChange,
  onBackToMethods,
}) {
  const sheetRef = useRef(null);
  const wasOpenRef = useRef(false);
  const lockedHeightRef = useRef(null);
  const insets = useSafeAreaInsets();
  const { height: winHeight } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const busy = startBusy || verifyBusy;
  const bottomPad = Math.max(insets.bottom, 16);
  const methodRows = recoverableMethods.length || 1;
  const reqRows = [...new Set([...(verifiedKeys || []), ...(remainingKeys || [])])].length || 1;
  const maxSheetH = Math.round(winHeight * 0.82);
  const sessionHeight = Math.min(
    Math.max(
      155 + bottomPad + methodRows * 70,
      385 + bottomPad,
      155 + bottomPad + reqRows * 70,
      370 + bottomPad,
      270 + bottomPad,
    ),
    maxSheetH,
  );

  if (step && lockedHeightRef.current == null) {
    lockedHeightRef.current = sessionHeight;
  }
  if (!step) {
    lockedHeightRef.current = null;
  }
  const sheetHeight = lockedHeightRef.current || sessionHeight;

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardHeight(e.endCoordinates?.height || 0)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (step !== "verify") setKeyboardHeight(0);
  }, [step]);

  useLayoutEffect(() => {
    if (step) {
      if (!wasOpenRef.current) {
        wasOpenRef.current = true;
        sheetRef.current?.open?.();
      }
      return undefined;
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      sheetRef.current?.close?.();
    }
    return undefined;
  }, [step]);

  const lostTitle = recoveryLostMethodTitle(selectedLost);
  const isTotpVerify = verifyKey === "totp";
  const isPhoneVerify = verifyKey === "phone";
  const otpDigits = String(otpValue || "").replace(/\D/g, "").slice(0, 6);
  const otpComplete = otpDigits.length >= 6;
  const getCodeLabel = resendTimer > 0 ? `${resendTimer}s` : "Get Code";
  const requirementKeys = [...new Set([...(verifiedKeys || []), ...(remainingKeys || [])])];
  const reqDone = (verifiedKeys || []).length;
  const reqTotal = requirementKeys.length || remainingKeys.length;
  const verifyMasked = methodSub(verifyKey, availableMethods);

  const verifyHeading = isTotpVerify
    ? "Authenticator App Verification"
    : isPhoneVerify
      ? "Phone Verification"
      : "Email Verification";
  const verifySubtitle = isTotpVerify
    ? "Enter the 6-digit code generated by your authenticator app to remove this method."
    : `Enter the 6-digit verification code sent to ${verifyMasked || "your remaining method"} to remove ${lostTitle}.`;

  const cardBg = isDark ? themeColors.sheetDarkColor || themeColors.card || "#1E1E1E" : colors.white;
  const border = themeColors.border || (isDark ? "#333" : "#e5e7eb");
  const kbLift = step === "verify" && keyboardHeight > 0 ? keyboardHeight : 0;

  return (
    <RBSheet
      customModalProps={{ statusBarTranslucent: true, navigationBarTranslucent: true }}
      ref={sheetRef}
      height={sheetHeight}
      openDuration={220}
      closeDuration={180}
      closeOnDragDown={false}
      closeOnPressMask={false}
      keyboardAvoidingViewEnabled={false}
      onClose={() => {
        setKeyboardHeight(0);
        if (step && !busy) onClose?.();
      }}
      customStyles={{
        container: {
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          backgroundColor: cardBg,
          marginBottom: kbLift,
        },
        wrapper: { backgroundColor: "rgba(0,0,0,0.5)" },
        draggableIcon: { backgroundColor: "transparent" },
      }}
    >
      <View style={[styles.sheetInner, { paddingBottom: bottomPad }]}>
        <View style={[styles.handle, { backgroundColor: isDark ? "rgba(255,255,255,0.22)" : "#D1D5DB" }]} />
        {step !== "requirements" ? (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={10} disabled={busy}>
            <FastImage source={closeIcon} style={{ width: 12, height: 12 }} tintColor={themeColors.text} resizeMode="contain" />
          </TouchableOpacity>
        ) : null}

        {step === "select" ? (
          <>
            <AppText weight={BOLD} type={SIXTEEN} style={{ color: themeColors.text, marginBottom: 6 }}>
              Select Unavailable Methods
            </AppText>
            <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, marginBottom: 12, lineHeight: 18 }}>
              Choose the security method you can no longer access. You will verify with your remaining method next.
            </AppText>
            {recoverableMethods.map((key) => {
              const copy = RECOVERY_METHOD_META[key] || RECOVERY_METHOD_META.totp;
              const selected = selectedLost === key;
              return (
                <TouchableOpacityView
                  key={key}
                  onPress={() => onSelectLost?.(key)}
                  style={[
                    styles.row,
                    {
                      borderColor: selected ? colors.cyanTheme : border,
                      backgroundColor: selected ? (isDark ? "rgba(243, 147, 44, 0.12)" : "#FFF7ED") : "transparent",
                    },
                  ]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6" }]}>
                    <FastImage source={methodIcon(key)} style={{ width: 22, height: 22 }} tintColor={colors.cyanTheme} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.text }}>{copy.title}</AppText>
                    <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 2 }}>{methodSub(key, availableMethods)}</AppText>
                  </View>
                  <View style={[styles.radio, { borderColor: selected ? colors.cyanTheme : border, backgroundColor: selected ? colors.cyanTheme : "transparent" }]}>
                    {selected ? <FastImage source={checkIc} style={{ width: 12, height: 12 }} tintColor="#fff" resizeMode="contain" /> : null}
                  </View>
                </TouchableOpacityView>
              );
            })}
            <Button
              children="Continue"
              disabled={!selectedLost || startBusy}
              onPress={onSelectConfirm}
              containerStyle={{ marginTop: 8, width: "100%" }}
            />
          </>
        ) : null}

        {step === "warn" ? (
          <>
            <FastImage source={isDark ? security_vector_light2 : security_vector2} style={styles.hero} resizeMode="contain" />
            <AppText weight={BOLD} type={SIXTEEN} style={{ color: themeColors.text, textAlign: "center", marginBottom: 6 }}>
              Reset {lostTitle}?
            </AppText>
            <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, textAlign: "center", lineHeight: 18, marginBottom: 12 }}>
              This turns off {lostTitle} for login. You must prove your remaining method first.
            </AppText>
            <TouchableOpacityView onPress={() => onResetAck?.(!resetAck)} style={styles.ackRow}>
              <View style={[styles.checkBox, { borderColor: resetAck ? colors.cyanTheme : border, backgroundColor: resetAck ? colors.cyanTheme : "transparent" }]}>
                {resetAck ? <FastImage source={checkIc} style={{ width: 12, height: 12 }} tintColor="#fff" resizeMode="contain" /> : null}
              </View>
              <AppText type={TWELVE} style={{ color: themeColors.secondaryText, flex: 1, lineHeight: 18 }}>
                For your protection, withdrawals, P2P selling, and payments may be paused for {restrictionHours} hours after you make this change.
              </AppText>
            </TouchableOpacityView>
            <View style={styles.actions}>
              <TouchableOpacityView onPress={onWarnCancel} style={[styles.ghostBtn, { borderColor: border }]} disabled={busy}>
                <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.text }}>Cancel</AppText>
              </TouchableOpacityView>
              <View style={{ flex: 1 }}>
                <Button
                  children={startBusy ? "Starting…" : "Confirm"}
                  disabled={!resetAck || startBusy}
                  loading={startBusy}
                  onPress={onWarnConfirm}
                  containerStyle={{ width: "100%", marginTop: 0 }}
                />
              </View>
            </View>
          </>
        ) : null}

        {step === "requirements" ? (
          <>
            <View style={styles.reqTop}>
              <TouchableOpacity onPress={onRequirementsBack} hitSlop={10}>
                <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>←</AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} hitSlop={10}>
                <FastImage source={closeIcon} style={{ width: 12, height: 12 }} tintColor={themeColors.text} resizeMode="contain" />
              </TouchableOpacity>
            </View>
            <AppText weight={BOLD} type={SIXTEEN} style={{ color: themeColors.text, marginBottom: 6 }}>
              Verify remaining methods
            </AppText>
            <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, marginBottom: 6, lineHeight: 18 }}>
              Complete the following verification to remove {lostTitle}. Then you will return to login.
            </AppText>
            <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: colors.cyanTheme, marginBottom: 10 }}>
              {reqDone} / {reqTotal || 1}
            </AppText>
            {requirementKeys.map((key) => {
              const copy = RECOVERY_METHOD_META[key] || RECOVERY_METHOD_META.totp;
              const done = (verifiedKeys || []).includes(key);
              return (
                <TouchableOpacityView
                  key={key}
                  disabled={done}
                  onPress={() => { if (!done) onPickRemaining?.(key); }}
                  style={[styles.row, { borderColor: done ? "#00C087" : border, opacity: done ? 0.7 : 1 }]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6" }]}>
                    <FastImage source={methodIcon(key)} style={{ width: 22, height: 22 }} tintColor={colors.cyanTheme} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.text }}>{copy.title}</AppText>
                    <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 2 }}>{methodSub(key, availableMethods)}</AppText>
                  </View>
                  {done ? (
                    <FastImage source={checkIc} style={{ width: 16, height: 16 }} tintColor="#00C087" resizeMode="contain" />
                  ) : (
                    <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText }}>→</AppText>
                  )}
                </TouchableOpacityView>
              );
            })}
          </>
        ) : null}

        {step === "verify" ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="none"
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            <AppText weight={BOLD} type={SIXTEEN} style={{ color: themeColors.text, marginBottom: 6 }}>
              {verifyHeading}
            </AppText>
            <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, marginBottom: 12, lineHeight: 18 }}>
              {verifySubtitle}
            </AppText>
            <OtpInput6Digit
              value={otpDigits}
              onChangeText={(v) => onOtpChange?.(String(v || "").replace(/\D/g, "").slice(0, 6))}
              isDark={isDark}
              hasError={otpError}
            />
            <View style={styles.otpLinks}>
              {isTotpVerify ? (
                <View />
              ) : (
                <TouchableOpacityView onPress={resendTimer > 0 ? undefined : onGetCode} disabled={resendTimer > 0}>
                  <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: resendTimer > 0 ? themeColors.secondaryText : themeColors.text }}>
                    {getCodeLabel}
                  </AppText>
                </TouchableOpacityView>
              )}
              <TouchableOpacityView onPress={onPaste}>
                <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: themeColors.text }}>Paste</AppText>
              </TouchableOpacityView>
            </View>
            <Button
              children={verifyBusy ? "Verifying…" : "Confirm"}
              disabled={verifyBusy || !otpComplete}
              loading={verifyBusy}
              onPress={() => onVerifySubmit?.(otpDigits)}
              containerStyle={{ marginTop: 12, width: "100%" }}
            />
            <TouchableOpacityView
              onPress={onBackToMethods}
              disabled={busy}
              style={styles.remainingLink}
            >
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: colors.cyanTheme, textDecorationLine: "underline" }}>
                Back to methods
              </AppText>
            </TouchableOpacityView>
          </ScrollView>
        ) : null}
      </View>
    </RBSheet>
  );
}

const styles = StyleSheet.create({
  sheetInner: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  closeBtn: {
    alignSelf: "flex-end",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    width: 64,
    height: 64,
    alignSelf: "center",
    marginBottom: 6,
  },
  ackRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 14,
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ghostBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  reqTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  otpLinks: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  remainingLink: {
    marginTop: 16,
    alignSelf: "center",
  },
});
