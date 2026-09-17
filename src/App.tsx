import React, { Component, ErrorInfo, ReactNode, useEffect } from "react";
import { Linking, Platform, StatusBar, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SystemBars } from 'react-native-edge-to-edge';
import SplashScreen from "react-native-splash-screen";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { onAppStart } from "./helper/utility";
import store from "./store/store";
import { Provider } from "react-redux";
import Navigator from "./navigation/Navigator";
import { SocketProvider } from "./SocketProvider";
import { ChartProvider } from "./ChartProvider";
import FutureSocketContextProvider from "./screens/Futures/FutureSocket";
import { useTheme } from "./hooks/useTheme";
import { getUserProfile } from "./actions/accountActions";
import NavigationService from "./navigation/NavigationService";
import { KYC_STATUS_SCREEN } from "./navigation/routes";
import { CHART_WEB_BASE_URL } from "./helper/Constants";
import { configureGoogleSignIn } from "./helper/googleSignIn";

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App render error", error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: "#111", padding: 24, justifyContent: "center" }}>
          <Text style={{ color: "#ff6b6b", fontSize: 16, fontWeight: "700" }}>
            Something went wrong
          </Text>
          <Text selectable style={{ color: "#fff", marginTop: 12 }}>
            {String(this.state.error?.stack || this.state.error)}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

/** `returnUrl` from `createKycSession` is `agce://kyc_return`. Also accept web success path if OS delivers it via universal links. */
function isKycFlowReturnUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("agce://")) {
    const path = lower.replace(/^[^:]+:\/\/?/i, "").split("?")[0];
    return (
      path === "kyc_return" ||
      path.startsWith("kyc_return/") ||
      path.includes("kyc_return") ||
      path.includes("kyc-return")
    );
  }
  try {
    const u = new URL(trimmed);
    const host = u.hostname.toLowerCase();
    const path = u.pathname.toLowerCase();
    const chartHost = CHART_WEB_BASE_URL.replace(/^https?:\/\//i, "").replace(/\/$/, "").toLowerCase();
    if (host === chartHost || host.endsWith(".wrathcode.com")) {
      if (path.includes("kyc/submitted") || path.includes("kyc_return") || path.includes("kyc-return")) {
        return true;
      }
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** Didit / third-party KYC completes with redirect to `returnUrl` from createKycSession (`agce://kyc_return`). */
async function handleAgceKycReturnUrl(url: string | null | undefined) {
  if (!isKycFlowReturnUrl(url)) return;
  try {
    await store.dispatch(getUserProfile(false, false, true) as any);
  } catch {
    /* ignore */
  }
  const go = () => {
    try {
      NavigationService.navigate(KYC_STATUS_SCREEN, { fromDidit: true });
    } catch {
      /* navigator not ready */
    }
  };
  go();
  setTimeout(go, 600);
}



const MainApp = () => {
  const { colors: themeColors, isDark } = useTheme();

  useEffect(() => {
    configureGoogleSignIn();
    onAppStart(store);
    try {
      SplashScreen?.hide?.();
    } catch {
      /* splash module may be missing on New Architecture */
    }
  }, []);

  useEffect(() => {
    const sub = Linking.addEventListener("url", ({ url }) => {
      if (__DEV__) console.log("[KYC] deep link url:", url);
      void handleAgceKycReturnUrl(url);
    });
    void Linking.getInitialURL().then((url) => {
      void handleAgceKycReturnUrl(url);
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider
      style={{ flex: 1 }}
      initialMetrics={Platform.OS === "ios" ? initialWindowMetrics : undefined}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent={true} />
      {Platform.OS === 'android' && <SystemBars style={isDark ? "light" : "dark"} />}
      <SocketProvider>
        <FutureSocketContextProvider>
          <ChartProvider>
            <Navigator />
          </ChartProvider>
        </FutureSocketContextProvider>
      </SocketProvider>
    </SafeAreaProvider>
  );
};

function App(): JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppErrorBoundary>
        <Provider store={store}>
          <MainApp />
        </Provider>
      </AppErrorBoundary>
    </GestureHandlerRootView>
  );
}

export default App;
