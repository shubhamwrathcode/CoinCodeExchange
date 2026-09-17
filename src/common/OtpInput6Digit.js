import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { colors, darkTheme } from '../theme/colors';
import { useTheme } from '../hooks/useTheme';

const CODE_LENGTH = 6;

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    marginTop: 8,
    position: 'relative',
  },
  boxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  box: {
    width: 42,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxHighlight: {
    borderColor: colors.cyan,
  },
  hiddenInput: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.001,
    fontSize: 1,
    padding: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
});

const OtpInput6Digit = forwardRef(function OtpInput6Digit(
  { value = '', onChangeText, label, labelStyle, containerStyle, hasError = false },
  ref
) {
  const { colors: themeColors, isDark } = useTheme();
  const inputRef = useRef(null);
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  const normalized = String(value).replace(/\D/g, '').slice(0, CODE_LENGTH);
  const textColor = isDark ? colors.white : themeColors.text;

  const handleChange = (t) => {
    const next = t.replace(/\D/g, '').slice(0, CODE_LENGTH);
    onChangeText?.(next);
  };

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <AppText style={[styles.label, labelStyle, { color: textColor }]}>{label}</AppText>
      ) : null}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => inputRef.current?.focus()}
        style={{ width: '100%', marginTop: 5 }}
      >
        <View style={styles.boxRow}>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const isCurrent = normalized.length === i;
            return (
              <View
                key={i}
                style={[
                  styles.box,
                  {
                    backgroundColor: isDark ? colors.lightBlackLatest : '#EDEDEE',
                    borderColor: hasError
                      ? colors.red
                      : isCurrent
                        ? colors.cyan
                        : isDark
                          ? "#151619"
                          : themeColors.border,
                    borderWidth: hasError || isCurrent ? 1.5 : 1,
                  },
                ]}
              >
                <AppText style={{ fontSize: 14, fontWeight: '600', color: textColor }}>
                  {normalized[i] || ''}
                </AppText>
              </View>
            );
          })}
        </View>
        <TextInput
          ref={inputRef}
          value={normalized}
          onChangeText={handleChange}
          maxLength={CODE_LENGTH}
          importantForAutofill="no"
          autoComplete="off"
          keyboardType="number-pad"
          style={styles.hiddenInput}
          caretHidden
          contextMenuHidden
          selectionColor={themeColors.text + '40'}
          cursorColor={colors.black}
        />
      </TouchableOpacity>
    </View>
  );
});

export default OtpInput6Digit;
export { CODE_LENGTH as OTP_CODE_LENGTH };
