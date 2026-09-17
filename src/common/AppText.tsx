import React from "react";
import { Text, StyleSheet, TextStyle, TextProps, StyleProp } from "react-native";
import {
  fontFamily,
  fontFamilyBold,
  fontFamilyMedium,
  fontFamilySemiBold,
} from "../theme/typography";
import { colors } from "../theme/colors";
import { useAppSelector } from "../store/hooks";

export const THIRTEEN = "THIRTEEN";
export const FIFTEEN = "FIFTEEN";
export const SIXTEEN = "SIXTEEN";
export const TWENTY = "TWENTY";
export const TWENTY_FOUR = "TWENTY_FOUR";
export const TWENTY_SIX = "TWENTY_SIX";
export const FOURTEEN = "FOURTEEN";
export const EIGHTEEN = "EIGHTEEN";
export const SEVENTEEN = "SEVENTEEN";
export const NINETEEN = "NINETEEN";
export const TWELVE = "TWELVE";
export const FORTY = "FORTY";
export const TWENTY_TWO = "TWENTY_TWO";
export const THIRTY_FOUR = "THIRTY_FOUR";
export const THIRTY = "THIRTY";
export const ELEVEN = "ELEVEN";
export const TEN = "TEN";
export const EIGHT = "EIGHT";
export const NINE = "NINE";

export const NORMAL = "normal";
export const SEMI_BOLD = "semibold";
export const MEDIUM = "MEDIUM";
export const BOLD = "BOLD";

export const WHITE = "WHITE";
export const BLACK = "BLACK";
export const YELLOW = "YELLOW";
export const SECOND = "SECOND";
export const THIRD = "THIRD";
export const RED = "RED";
export const GREEN = "GREEN";
export const AMBER = "AMBER";
export const DESC = "DESC";
export const DISCLAIMTEXT = "DISCLAIMTEXT";
export const WHITESHADOW = "WHITESHADOW";
export const LIGHTGREY = 'LIGHTGREY'


interface AppTextProps extends TextProps {
  type?: string;
  weight?: string;
  style?: StyleProp<TextStyle>;
  color?: string;
  // theme?: String;
  numberOfLines?: number;
  allowFontScaling?: boolean;
}

const AppText = ({
  type,
  weight,
  style,
  color,
  // theme,
  numberOfLines,
  allowFontScaling = true,
  ...props
}: AppTextProps) => {
  const themeState = useAppSelector(state => state.auth.theme);
  const getTextStyle = (type?: string, weight?: string, color?: string): TextStyle => {
    var style: TextStyle = {
      fontFamily: fontFamily,
    };
    switch (type) {
      case FORTY:
        style["fontSize"] = 40;
        break;
      case THIRTY_FOUR:
        style["fontSize"] = 34;
        break;
      case THIRTY:
        style["fontSize"] = 30;
        break;
      case TWENTY_SIX:
        style["fontSize"] = 26;
        break;
      case TWENTY_FOUR:
        style["fontSize"] = 24;
        break;
      case TWENTY_TWO:
        style["fontSize"] = 22;
        break;
      case TWENTY:
        style["fontSize"] = 20;
        break;
      case NINETEEN:
        style["fontSize"] = 19;
        break;
      case EIGHTEEN:
        style["fontSize"] = 18;
        break;
      case SEVENTEEN:
        style["fontSize"] = 17;
        break;
      case SIXTEEN:
        style["fontSize"] = 16;
        break;
      case FIFTEEN:
        style["fontSize"] = 15;
        break;
      case FOURTEEN:
        style["fontSize"] = 14;
        break;
      case THIRTEEN:
        style["fontSize"] = 13;
        break;
      case ELEVEN:
        style["fontSize"] = 11;
        break;
      case TEN:
        style["fontSize"] = 10;
        break;
      case NINE:
        style["fontSize"] = 9;
        break;
      case EIGHT:
        style["fontSize"] = 8;
        break;
      default:
        style["fontSize"] = 12;
    }

    switch (weight) {
      case NORMAL:
        style["fontFamily"] = fontFamily;
        break;
      case MEDIUM:
        style["fontFamily"] = fontFamilyMedium;
        break;
      case SEMI_BOLD:
        style["fontFamily"] = fontFamilySemiBold;
        break;
      case BOLD:
        style["fontFamily"] = fontFamilyBold;
        break;
      default:
        style["fontFamily"] = fontFamily;
    }

    switch (color) {
      case WHITE:
        style["color"] = themeState === "Dark" ? colors.black : colors.white;
        break;
      case BLACK:
        style["color"] = themeState === "Dark" ? colors.white : colors.black;
        break;
      case YELLOW:
        style["color"] = colors.buttonBg;
        break;
      case SECOND:
        style["color"] = colors.secondaryText;
        break;
      case THIRD:
        style["color"] = colors.thirdText;
        break;
      case RED:
        style["color"] = colors.red;
        break;
      case GREEN:
        style["color"] = colors.green;
        break;
      case AMBER:
        style["color"] = colors.amber;
        break;
      case DESC:
        style["color"] = colors.descText;
        break;
      case WHITESHADOW:
        style["color"] = colors.whiteCCShadow;
        break;
      case LIGHTGREY:
        style["color"] = colors.lightGrey;
        break;
      case DISCLAIMTEXT:
        style["color"] = themeState === "Dark" ? colors.disclaimDarText : colors.disclaimText;
        break;


      default:
        style["color"] = themeState === "Dark" ? colors.white : colors.black;
    }

    return style;
  };
  const styles = {
    text: (type?: string, weight?: string, color?: string) => ({
      ...getTextStyle(type, weight, color),
    }),
  };
  return (
    <Text
      allowFontScaling={allowFontScaling}
      numberOfLines={numberOfLines}
      style={StyleSheet.flatten([styles.text(type, weight, color), style])}
      {...props}
    >
      {props.children ?? ""}
    </Text>
  );
};

export { AppText };
