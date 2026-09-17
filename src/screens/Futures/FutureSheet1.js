import { TouchableOpacity, View } from "react-native";
import {
  AppText,
  BOLD,
  Button,
  EIGHT,
  EIGHTEEN,
  FOURTEEN,
  SEMI_BOLD,
  TEN,
  TWELVE,
} from "../../shared";
import { back_ic, closeIcon, downIcon } from "../../helper/ImageAssets";
import FastImage from "react-native-fast-image";
import { useTheme } from "../../hooks/useTheme";

const FutureSheet1 = ({ onClose }) => {
  const { isDark, colors: themeColors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <AppText type={EIGHTEEN} weight={BOLD} style={{ color: themeColors.text }}>
            BTCUSDT
          </AppText>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              backgroundColor: isDark ? "#D9D9D933" : "#F0F0F0",
              borderRadius: 5,
              paddingHorizontal: 5,
              justifyContent: "center",
            }}
          >
            <AppText type={EIGHT} style={{ color: themeColors.secondaryText }}>Prep</AppText>
          </View>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={{
            borderWidth: 1,
            borderColor: isDark ? "#FFFFFF30" : "#EEE",
            borderRadius: 15,
            padding: 5,
          }}
        >
          <FastImage
            source={closeIcon}
            style={{ width: 12, height: 12 }}
            tintColor={isDark ? "#FFFFFF80" : "#777"}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
      <AppText style={{ color: "#00BD83", paddingLeft: 20 }}>
        Buy / Long
      </AppText>
      <View style={{ marginTop: 10, paddingHorizontal: 20 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginVertical: 6,
          }}
        >
          <AppText style={{ color: themeColors.secondaryText }} type={FOURTEEN}>
            Price
          </AppText>
          <AppText
            style={{ color: themeColors.text }}
            type={FOURTEEN}
            weight={SEMI_BOLD}
          >
            2.0123 USDT
          </AppText>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <AppText style={{ color: themeColors.secondaryText }} type={FOURTEEN}>
            Amount
          </AppText>
          <AppText
            style={{ color: themeColors.text }}
            type={FOURTEEN}
            weight={SEMI_BOLD}
          >
            3.00 XRP
          </AppText>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginVertical: 6,
          }}
        >
          <AppText style={{ color: themeColors.secondaryText }} type={FOURTEEN}>
            Mark Price
          </AppText>
          <AppText
            style={{ color: themeColors.text }}
            type={FOURTEEN}
            weight={SEMI_BOLD}
          >
            2.0156 USDT
          </AppText>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <AppText style={{ color: themeColors.secondaryText }} type={FOURTEEN}>
            Est.Liq.Price
          </AppText>
          <AppText
            style={{ color: themeColors.text }}
            type={FOURTEEN}
            weight={SEMI_BOLD}
          >
            --
          </AppText>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginVertical: 6,
          }}
        >
          <AppText style={{ color: themeColors.secondaryText }} type={FOURTEEN}>
            Price Gap
          </AppText>
          <AppText
            style={{ color: themeColors.text }}
            type={FOURTEEN}
            weight={SEMI_BOLD}
          >
            --
          </AppText>
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderTopWidth: 0.5,
          borderBottomWidth: 0.5,
          borderColor: isDark ? "#302F2F" : "#EEE",
          paddingVertical: 10,
          paddingHorizontal: 20,
        }}
      >
        <AppText type={FOURTEEN} style={{ color: themeColors.text }}>TP?SL</AppText>
        <FastImage
          source={back_ic}
          style={{ width: 12, height: 12, transform: [{ rotate: "270deg" }] }}
          tintColor={themeColors.secondaryText}
          resizeMode="contain"
        />
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 20,
          marginTop: 10,
        }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderWidth: 1,
            borderColor: isDark ? "#302F2F" : "#EEE",
            borderRadius: 5,
          }}
        ></View>
        <AppText type={TEN} style={{ width: "95%", color: themeColors.secondaryText }}>
          Don’t display double confirmation for Limit Order again. You can also
          adjust it in Preferences.
        </AppText>
      </View>
      <Button children="Confirm" containerStyle={{ marginHorizontal: 20, marginTop: 20 }} onPress={onClose} />
    </View>
  );
};

export default FutureSheet1;
