/**
 * ChartPreloaderContext
 *
 * Renders two hidden WebViews (opacity:0, height:0, pointerEvents=none) as
 * soon as the user is logged-in (inside BottomNavigation).  By the time the
 * user taps the Spot or Futures tab the chart HTML is already parsed and the
 * first symbol is already drawn – no loading flash.
 *
 * How it works
 * ────────────
 *  1. The Provider renders both WebViews with position:"absolute", height:0,
 *     opacity:0 so they are invisible but still processed by the JS engine /
 *     GPU layer.  `javaScriptEnabled`, `domStorageEnabled`, `cacheEnabled` etc.
 *     are set identically to the real chart WebViews.
 *
 *  2. It exposes two React refs (spotChartRef, futuresChartRef) so the Spot
 *     and Futures screens can call `ref.current.postMessage(...)` on the
 *     ALREADY-LOADED WebView instead of waiting for a new one to boot.
 *
 *  3. When the Spot or Futures screen mounts it calls `claimSpotChart()` /
 *     `claimFuturesChart()`.  The Provider then "teleports" the hidden WebView
 *     into the screen by switching the owner.  The screen renders its own
 *     WebView slot via `<SpotChartSlot />` / `<FuturesChartSlot />`.
 *
 *  4. If the screen unmounts / navigates away the slot reverts to hidden mode
 *     so the WebView keeps running in the background (JS stays alive, pair
 *     symbol changes still work via postMessage).
 *
 * IMPORTANT: this does NOT change any socket / API / navigation logic.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Dimensions, View } from 'react-native';
import WebView from 'react-native-webview';
import { useAppSelector } from '../store/hooks';
import { colors } from '../theme/colors';
import { CHART_WEB_BASE_URL } from '../helper/Constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Default pair symbol used ONLY for the initial preload warm-up request.
// The real screens override this with their own pair via postMessage (same as
// they do today).
const SPOT_DEFAULT_PAIR = 'BTC_USDT';
const FUTURES_DEFAULT_PAIR = 'BTC_USDT';

const SPOT_BASE_DARK = `${CHART_WEB_BASE_URL}chart/dark/`;
const SPOT_BASE_LIGHT = `${CHART_WEB_BASE_URL}chart/light/`;
const FUTURES_BASE = 'https://zillion.wrathcode.com/futures-chart/dark/';

// ─── Context ──────────────────────────────────────────────────────────────────
export const ChartPreloaderContext = createContext({
  spotChartRef: { current: null },
  futuresChartRef: { current: null },
  isSpotPreloaded: false,
  isFuturesPreloaded: false,
  notifySpotLoaded: () => {},
  notifyFuturesLoaded: () => {},
});

export const useChartPreloader = () => useContext(ChartPreloaderContext);

// ─── Common WebView props (mirror exactly what ChartWebView uses) ─────────────
const WEBVIEW_COMMON_PROPS = {
  androidLayerType: 'hardware',
  cacheEnabled: true,
  cacheMode: 'LOAD_CACHE_ELSE_NETWORK',
  mixedContentMode: 'compatibility',
  allowsInlineMediaPlayback: true,
  mediaPlaybackRequiresUserAction: false,
  javaScriptEnabled: true,
  domStorageEnabled: true,
  scrollEnabled: false,
  bounces: false,
  sharedCookiesEnabled: true,
  javaScriptEnabledAndroid: true,
  scalesPageToFit: false,
  automaticallyAdjustContentInsets: false,
  setSupportMultipleWindows: false,
  overScrollMode: 'never',
  opaque: false,
  // Keep JS running even when the view is hidden
  javaScriptCanOpenWindowsAutomatically: false,
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const ChartPreloaderProvider = ({ children }) => {
  const theme = useAppSelector((state) => state.auth.theme);
  const isDark = theme === 'Dark';

  const spotChartRef = useRef(null);
  const futuresChartRef = useRef(null);

  const [isSpotPreloaded, setSpotPreloaded] = useState(false);
  const [isFuturesPreloaded, setFuturesPreloaded] = useState(false);

  // Build URLs – Spot is theme-aware, Futures always dark
  const spotUrl = `${isDark ? SPOT_BASE_DARK : SPOT_BASE_LIGHT}${SPOT_DEFAULT_PAIR}`;
  const futuresUrl = `${FUTURES_BASE}${FUTURES_DEFAULT_PAIR}`;

  const notifySpotLoaded = useCallback(() => setSpotPreloaded(true), []);
  const notifyFuturesLoaded = useCallback(() => setFuturesPreloaded(true), []);

  // Hidden container style – invisible but still rendered & GPU-composited
  const hiddenStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: 0,          // zero height = invisible, WebView still loads
    opacity: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
    zIndex: -9999,
  };

  const webviewStyle = {
    width: SCREEN_WIDTH,
    height: 300,        // must have positive height so the WebView paints
    backgroundColor: 'transparent',
  };

  return (
    <ChartPreloaderContext.Provider
      value={{
        spotChartRef,
        futuresChartRef,
        isSpotPreloaded,
        isFuturesPreloaded,
        notifySpotLoaded,
        notifyFuturesLoaded,
      }}
    >
      {children}

      {/* ── Hidden Spot chart WebView ─────────────────────────────────── */}
      <View style={hiddenStyle} pointerEvents="none">
        <WebView
          ref={spotChartRef}
          source={{ uri: spotUrl }}
          style={webviewStyle}
          containerStyle={{ backgroundColor: 'transparent' }}
          {...WEBVIEW_COMMON_PROPS}
          onLoadEnd={notifySpotLoaded}
        />
      </View>

      {/* ── Hidden Futures chart WebView ──────────────────────────────── */}
      <View style={hiddenStyle} pointerEvents="none">
        <WebView
          ref={futuresChartRef}
          source={{ uri: futuresUrl }}
          style={webviewStyle}
          containerStyle={{ backgroundColor: 'transparent' }}
          {...WEBVIEW_COMMON_PROPS}
          onLoadEnd={notifyFuturesLoaded}
        />
      </View>
    </ChartPreloaderContext.Provider>
  );
};
