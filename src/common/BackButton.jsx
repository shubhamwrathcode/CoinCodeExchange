import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import FastImage from "react-native-fast-image";
import NavigationService from "../navigation/NavigationService";
import { profileBackButtonImg } from "../helper/ImageAssets";

/**
 * App-wide back control — CoinCode-style rounded back glyph.
 * Use this (or `back_ic` which aliases the same asset) on screen headers.
 */
const BackButton = ({
  onPress,
  size = 35,
  style,
  hitSlop = 12,
  disabled = false,
}) => (
  <TouchableOpacity
    onPress={onPress || (() => NavigationService.goBack())}
    hitSlop={hitSlop}
    disabled={disabled}
    style={[styles.btn, style]}
    activeOpacity={0.75}
  >
    <FastImage
      source={profileBackButtonImg}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  btn: {
    justifyContent: "center",
    alignItems: "flex-start",
  },
});

export default BackButton;
