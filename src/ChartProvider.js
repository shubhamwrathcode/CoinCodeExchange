// ChartProvider.js
import React, { createContext, useRef } from "react";
import { WebView } from "react-native-webview";
import { View } from "react-native";
import { CHART_WEB_BASE_URL } from "./helper/Constants";

export const ChartContext = createContext();

export function ChartProvider({ children }) {
  const webview = useRef(null);

  return (
    <ChartContext.Provider value={{ webview }}>
      <View
        style={{
          width: 1,
          height: 1,
          opacity: 0,
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: -1,
        }}
      >
        <WebView
          ref={webview}
          source={{ uri: `${CHART_WEB_BASE_URL}chart/dark/BTC_USDT` }}
          javaScriptEnabled
          domStorageEnabled
          onLoadEnd={() => { }}
        />
      </View>

      {children}
    </ChartContext.Provider>
  );
}
