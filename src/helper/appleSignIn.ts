import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { APPLE_IOS_CLIENT_ID } from './Constants';

export type AppleSignInPayload = {
  Token: string;
  type: 'apple';
  authorizationCode: string | null;
  appleUserId: string;
  email: string | null;
  fullName: {
    givenName: string | null;
    familyName: string | null;
    middleName: string | null;
    nickname: string | null;
  } | null;
  nonce: string | null;
  realUserStatus: number;
};

export type AppleThirdPartyBody = {
  Token: string;
  type: 'apple';
  referral_code: string;
  code: string;
  /** Helps backend pick JWT audience: Bundle ID on iOS, Services ID on web. */
  client_id: string;
  platform: 'ios';
};

const safeJson = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

function getAppleNativeModule(): any | null {
  try {
    return (
      NativeModules.RNAppleAuthModule ??
      TurboModuleRegistry.get('RNAppleAuthModule') ??
      null
    );
  } catch {
    return NativeModules.RNAppleAuthModule ?? null;
  }
}

export function isAppleAuthAvailable(): boolean {
  if (Platform.OS !== 'ios') return false;
  return !!(appleAuth.isSupported || getAppleNativeModule());
}

export function isAppleSignInCancelled(error: unknown): boolean {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: string }).code)
      : '';
  return code === '1001' || code === String(appleAuth.Error?.CANCELED ?? '');
}

/**
 * Native Sign in with Apple. Does not call the backend.
 * identityToken is what will later go as `Token` with `type: 'apple'`.
 */
export async function performAppleSignIn(): Promise<AppleSignInPayload> {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign-In is only available on iOS');
  }

  const native = getAppleNativeModule();
  console.log('[Apple Sign-In] native module present:', !!native, 'isSupported:', appleAuth.isSupported);

  if (!native && !appleAuth.isSupported) {
    throw new Error(
      'Apple Sign-In native module missing. Reload is not enough — rebuild iOS: npx react-native run-ios'
    );
  }

  const response = appleAuth.isSupported
    ? await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      })
    : await native.performRequest({
        nonceEnabled: true,
        requestedOperation: 1,
        requestedScopes: [0, 1],
      });

  console.log('==================== [Apple Sign-In RAW] ====================');
  console.log(safeJson(response));

  if (!response?.identityToken) {
    throw new Error('Apple Sign-In failed: no identity token');
  }

  const payload: AppleSignInPayload = {
    Token: response.identityToken,
    type: 'apple',
    authorizationCode: response.authorizationCode ?? null,
    appleUserId: response.user,
    email: response.email ?? null,
    fullName: response.fullName
      ? {
          givenName: response.fullName.givenName ?? null,
          familyName: response.fullName.familyName ?? null,
          middleName: response.fullName.middleName ?? null,
          nickname: response.fullName.nickname ?? null,
        }
      : null,
    nonce: response.nonce ?? null,
    realUserStatus: response.realUserStatus,
  };

  console.log('==================== [Apple Sign-In PAYLOAD FOR API] ====================');
  console.log(safeJson(payload));
  console.log('[Apple Sign-In] identityToken length:', payload.Token.length);

  return payload;
}

/** Body for `user/third-party-signup` / `user/third-party-login` (web curl parity + iOS aud hint). */
export function buildAppleThirdPartyBody(
  apple: AppleSignInPayload,
  extras: { referral_code?: string } = {},
): AppleThirdPartyBody {
  const body: AppleThirdPartyBody = {
    Token: apple.Token,
    type: 'apple',
    referral_code: String(extras.referral_code ?? ''),
    code: apple.authorizationCode ?? '',
    client_id: APPLE_IOS_CLIENT_ID,
    platform: 'ios',
  };
  console.log('[Apple Sign-In] API body (what backend receives):', {
    type: body.type,
    client_id: body.client_id,
    platform: body.platform,
    codeLength: body.code.length,
    tokenLength: body.Token.length,
    referral_code: body.referral_code,
  });
  return body;
}
