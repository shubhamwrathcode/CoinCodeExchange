import { Dimensions } from 'react-native';

export const Screen = {
  Width: Dimensions.get('screen').width,
  Height: Dimensions.get('screen').height,
};

export const universalPaddingHorizontal = 10;
export const universalPaddingHorizontalHigh = 20;
export const universalPaddingVertical = 10;
export const buttonHeight = 50;
export const smallButtonHeight = 25;
export const midButtonHeight = 40;
export const inputHeight = 53;
export const sheetOpenDuration = 200;
export const sheetCloseDuration = 200;
export const sheetHeightFull = Screen.Height * 0.5;
export const borderWidth = 1;
export const universalPaddingTop = 30;

export const initialLayout = { width: Dimensions.get('screen').width };
