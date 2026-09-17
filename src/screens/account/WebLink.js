import FastImage from "react-native-fast-image";
import WebView from "react-native-webview";
import { back_ic, closeIcon } from "../../helper/ImageAssets";
import { Touchable, TouchableOpacity, View } from "react-native";
import NavigationService from "../../navigation/NavigationService";
import { colors } from "../../theme/colors";
import { useRef } from "react";
import { Screen } from "../../theme/dimens";
import { AppText, BLACK, FOURTEEN, SEMI_BOLD } from "../../shared";
import { useRoute } from "@react-navigation/native";
import { useAppSelector } from "../../store/hooks";

const WebLink = () => {
  const route = useRoute();
  const theme = useAppSelector((state) => state.auth.theme);
  const url = route?.params?.data;
  const title = route?.params?.title;
  const webview = useRef();
  console.log(route?.params, "title", title);
  return (
    <View style={{flex: 1}}>
        <View style={{backgroundColor: theme !== "Dark" ? colors.white : colors.white_fifteen, paddingHorizontal: 12, paddingVertical: 10,flexDirection: "row", justifyContent: "space-between", alignItems: "center"}}>
        <TouchableOpacity onPress={() => NavigationService.goBack()}>
        <FastImage
          source={back_ic}
          style={{ width: 13, height: 13 }}
          resizeMode="contain"
          tintColor={theme !== "Dark" ? colors.black : colors.white}
        />
      </TouchableOpacity>
      <AppText weight={SEMI_BOLD} type={FOURTEEN} color={BLACK}>{title}</AppText>
      <TouchableOpacity onPress={() => NavigationService.goBack()}>
        <FastImage
          source={closeIcon}
          style={{ width: 13, height: 13 }}
          resizeMode="contain"
          tintColor={theme !== "Dark" ? colors.black : colors.white}
        />
      </TouchableOpacity>
        </View>
    
      <WebView
        ref={webview}
        style={{ width: Screen.Width, height: 400 }}
        source={{
          uri: url,
        }}
        startInLoadingState={true}
        scalesPageToFit={true}
        automaticallyAdjustContentInsets={true}
        scrollEnabled={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        bounces={false}
        sharedCookiesEnabled={true}
        javaScriptEnabledAndroid={true}
      />
    </View>
  );
};

export default WebLink;
