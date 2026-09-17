import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AppText,
  BOLD,
  Button,
  EIGHTEEN,
  FOURTEEN,
} from "../../shared";
import { closeIcon } from "../../helper/ImageAssets";
import FastImage from "react-native-fast-image";
import { colors } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";
import { fontFamily } from "../../theme/typography";

const FutureSheet3 = ({
  stopLoss,
  takeProfit,
  setStopLoss,
  setTakeProfit,
  onClose,
  onCloseDefault,
}) => {
  const { isDark, colors: themeColors } = useTheme();

  const labelColor = themeColors.secondaryText;
  const borderColor = isDark ? "#3F3F3F" : "#EEE";

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: themeColors.background },
      ]}
    >
      <View style={styles.header}>
        <AppText type={EIGHTEEN} weight={BOLD} style={{ color: themeColors.text }}>
          TP/SL
        </AppText>
        <TouchableOpacity 
          style={[styles.closeButton, { borderColor: isDark ? "#FFFFFF30" : "#EEE" }]} 
          onPress={onCloseDefault}
        >
          <FastImage
            source={closeIcon}
            style={{ width: 12, height: 12 }}
            tintColor={labelColor}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.formSection}>
        <View style={styles.dualInputRow}>
          <View style={styles.inputColumn}>
            <View style={styles.labelRow}>
              <AppText type={FOURTEEN} style={{ color: labelColor }}>
                Take Profit (PnL)
              </AppText>
            </View>
            <View
              style={[
                styles.inputBox,
                {
                  backgroundColor: isDark ? "#FFFFFF1A" : "#F8F8F8",
                  borderColor,
                },
              ]}
            >
              <TextInput
                value={takeProfit ?? ""}
                onChangeText={(text) => setTakeProfit(text)}
                placeholder="PnL"
                placeholderTextColor={isDark ? "#888" : "#999"}
                keyboardType="decimal-pad"
                style={[styles.textInput, { color: themeColors.text }]}
              />
            </View>
          </View>
        </View>

        <View style={styles.priceSection}>
          <View style={styles.dualInputRow}>
            <View style={styles.inputColumn}>
              <View style={styles.labelRow}>
                <AppText type={FOURTEEN} style={{ color: labelColor }}>
                  Stop Loss (PnL)
                </AppText>
              </View>
              <View
                style={[
                  styles.inputBox,
                  { backgroundColor: isDark ? "#FFFFFF1A" : "#F8F8F8", borderColor },
                ]}
              >
                <TextInput
                  value={stopLoss}
                  style={[styles.textInput, { color: themeColors.text }]}
                  placeholder="PnL"
                  placeholderTextColor={isDark ? "#888" : "#999"}
                  keyboardType="decimal-pad"
                  onChangeText={(text) => {
                    if (text === "") {
                      setStopLoss("");
                      return;
                    }
                    const numericValue = parseFloat(text);
                    if (!isNaN(numericValue) || text == "0") {
                      const formattedValue =
                        numericValue > 0
                          ? `-${numericValue}`
                          : `${numericValue}`;
                      setStopLoss(formattedValue);
                    } else {
                      setStopLoss('');
                    }
                  }}
                />
              </View>
            </View>
          </View>
        </View>
      </View>

      <Button
        children="Confirm"
        containerStyle={{ marginHorizontal: 20, marginTop: 20 }}
        onPress={onClose}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  closeButton: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 6,
  },
  formSection: {
    paddingHorizontal: 20,
    paddingTop: 4,
    marginBottom: 20,
  },
  dualInputRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 10,
  },
  inputColumn: {
    flex: 1,
  },
  priceSection: {
    marginTop: 18,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  inputBox: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    justifyContent: "center",
  },
  textInput: {
    fontSize: 14,
    fontFamily,
    height: 40,
    paddingVertical: 0,
  },
});

export default FutureSheet3;
