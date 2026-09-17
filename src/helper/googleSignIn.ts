import { Platform } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from './Constants';

let configured = false;

export function configureGoogleSignIn() {
  if (configured) {
    return;
  }
  try {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
    configured = true;
  } catch (e) {
    console.warn('GoogleSignin.configure error', e);
  }
}

export async function prepareGoogleSignIn() {
  configureGoogleSignIn();
  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }
}
