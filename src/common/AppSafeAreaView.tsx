/* eslint-disable react-native/no-inline-styles */
import React, { ReactNode } from 'react';
import {
  ImageBackground,
  Platform,
  ScrollView,
  StatusBar,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SystemBars } from 'react-native-edge-to-edge';
import { commonStyles } from '../theme/commonStyles';
import { colors } from '../theme/colors';

import { useTheme } from '../hooks/useTheme';

/** Status bar strip when using a light splash image (dark bar + light icons). */
const SPLASH_STATUS_BAR_BG = '#0A0A0A';
const SPLASH_BODY_BG = '#FFFFFF';

interface AppSafeAreaViewProps {
  children: ReactNode;
  style?: ViewStyle;
  source?: any;
  backgroundColor?: any;
  isfrom?: any;
  /** Light splash: dark status bar area; rest of screen stays light (image + body). */
  darkStatusBarOnLightSplash?: boolean;
  forceBarStyle?: 'dark-content' | 'light-content';
}

const AppSafeAreaView = ({
  children,
  style,
  source,
  backgroundColor,
  isfrom,
  darkStatusBarOnLightSplash,
  forceBarStyle,
}: AppSafeAreaViewProps) => {
  const { colors: themeColors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const splashLight = Boolean(darkStatusBarOnLightSplash && source);
  const shellBg = splashLight ? SPLASH_BODY_BG : themeColors.background;
  const barStyle = forceBarStyle ? forceBarStyle : (isDark ? 'light-content' : 'dark-content');
  const androidStatusBg = colors.white;
  const iosTopInset = insets.top > 0 ? insets.top : 59;

  const splashTopOverlay =
    splashLight && Platform.OS === 'ios' ? (
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: iosTopInset,
          backgroundColor: SPLASH_STATUS_BAR_BG,
          zIndex: 2,
        }}
      />
    ) : null;

  return Platform.OS === 'ios' ? (
    <SafeAreaView
      edges={['right', 'left']}
      style={[
        {
          flex: 1,
          backgroundColor: shellBg,
        },
        style,
      ]}>
      <SystemBars style={source ? 'light' : (barStyle === 'light-content' ? 'light' : 'dark')} />
      {!source ? (
        <View style={{ height: iosTopInset, width: '100%', backgroundColor: shellBg }} />
      ) : null}
      {source ? (
        <ImageBackground
          source={source}
          style={commonStyles.screenSize}
          resizeMode="cover">
          {splashTopOverlay}
          {children}
        </ImageBackground>
      ) : (
        children
      )}
    </SafeAreaView>
  ) : (
    <View style={[{ flex: 1, backgroundColor: shellBg }, style]}>
      <SystemBars style={source ? 'light' : (barStyle === 'light-content' ? 'light' : 'dark')} hidden={false} />
      {!source && (
        <View style={{ height: insets.top || StatusBar.currentHeight || 40, backgroundColor: isDark ? themeColors.background : colors.white, width: '100%' }} />
      )}
      {source ? (
        <ImageBackground
          source={source}
          style={commonStyles.screenSize}
          resizeMode="cover">
          {children}
        </ImageBackground>
      ) : (
        children
      )}
    </View>
  );
};
export { AppSafeAreaView };
