import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';

// react-native-screens 3.37 is not fully compatible with RN 0.79 Fabric.
// Native screen containers were rendering as an empty white view on iOS.
enableScreens(false);

import {AppRegistry, LogBox, Text, TextInput, View} from 'react-native';
import registerCallableModule from 'react-native/Libraries/Core/registerCallableModule';
import {name as appName} from './app.json';

// Fabric/bridgeless does not register Paper's RCTEventEmitter. Some native
// modules still call receiveEvent/receiveTouches; register a no-op so they
// don't crash the JS runtime.
registerCallableModule('RCTEventEmitter', {
  receiveEvent() {},
  receiveTouches() {},
});

let App;
try {
  App = require('./src/App').default;
} catch (error) {
  console.error('Failed to load App', error);
  App = function AppLoadError() {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#111',
          padding: 24,
          justifyContent: 'center',
        }}>
        <Text style={{color: '#ff6b6b', fontSize: 16, fontWeight: '700'}}>
          App failed to load
        </Text>
        <Text selectable style={{color: '#fff', marginTop: 12}}>
          {String(error?.stack || error)}
        </Text>
      </View>
    );
  };
}

// Global support for font scaling
if (Text.defaultProps) {
  Text.defaultProps.allowFontScaling = true;
} else {
  Text.defaultProps = {
    allowFontScaling: true,
  };
}

if (TextInput.defaultProps) {
  TextInput.defaultProps.allowFontScaling = true;
} else {
  TextInput.defaultProps = {
    allowFontScaling: true,
  };
}

AppRegistry.registerComponent(appName, () => App);
if (!__DEV__) {
  LogBox.ignoreAllLogs();
}
