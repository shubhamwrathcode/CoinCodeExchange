import { Platform } from 'react-native';
import { Passkey } from 'react-native-passkey';
import { PASSKEY_RP_ID } from './Constants';

/** iOS sheet animation is slower; overlay must be gone before ASAuthorizationController. Android keeps 150ms. */
export const PASSKEY_NATIVE_PROMPT_DELAY_MS = Platform.OS === 'ios' ? 300 : 150;

export const waitForPasskeyNativePrompt = () =>
  new Promise<void>((resolve) => setTimeout(resolve, PASSKEY_NATIVE_PROMPT_DELAY_MS));

export const isPasskeyAssociatedDomainError = (err: any): boolean => {
  const msg = String(err?.message ?? err?.error ?? '');
  return /incoming request cannot be validated|associated domain|not associated with domain|relying party/i.test(msg);
};

export const isPasskeyNoCredentialsError = (err: any): boolean => {
  const msg = String(err?.message ?? err?.error ?? '');
  return /No Credentials were returned|NoCredentials|no viable credential|no.*credential/i.test(msg);
};

export const IOS_NO_PASSKEY_MESSAGE =
  'No passkey found on this iPhone. Sign in with your password, then add a passkey from Security. Android passkeys cannot be used on iPhone.';

/**
 * iOS: Face ID / Touch ID via platform authenticator.
 * Android: unchanged Passkey.create (Credential Manager).
 */
export const getNativePasskeyRegistration = async (request: any) => {
  if (Platform.OS !== 'ios') {
    return await Passkey.create(request);
  }
  return await Passkey.createPlatformKey(request);
};

/**
 * iOS: Face ID / Touch ID via platform authenticator.
 * Android: unchanged Passkey.get (Credential Manager).
 */
export const getNativePasskeyAssertion = async (request: any) => {
  if (Platform.OS !== 'ios') {
    return await Passkey.get(request);
  }

  try {
    return await Passkey.getPlatformKey(request);
  } catch (e: any) {
    const msg = String(e?.message ?? e?.error ?? '');
    if (e?.name === 'NotAllowedError' || /cancelled|cancel|NotAllowed/i.test(msg)) {
      throw e;
    }
    // Server may send Android/web credential IDs that iOS Keychain cannot match.
    if (/NoCredentials|no.*credential|no viable credential/i.test(msg) && request?.allowCredentials?.length) {
      const discoverableReq = {
        challenge: request.challenge,
        rpId: request.rpId,
        timeout: request.timeout,
        userVerification: request.userVerification,
      };
      return await Passkey.getPlatformKey(discoverableReq);
    }
    return await Passkey.get(request);
  }
};

export const maybeBase64ToBase64Url = (s: string) => {
  const raw = String(s || '').trim();
  if (!raw) return raw;
  if (raw.includes('+') || raw.includes('/')) {
    return raw.replace(/\+/g, '-').replace(/\//g, '_');
  }
  return raw;
};

export const decodeBase64UrlToUtf8 = (input: string): string => {
  const b64 = String(input || '').replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (b64.length % 4)) % 4;
  const padded = b64 + '='.repeat(padLen);
  return decodeURIComponent(
    atob(padded)
      .split('')
      .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
      .join(''),
  );
};

/** Shape credential like @simplewebauthn/browser startAuthentication output for backend verify. */
export const normalizePasskeyAssertionCredential = (credential: any) => {
  if (!credential || typeof credential !== 'object') return credential;
  const response = credential.response || {};
  return {
    id: credential.id,
    rawId: credential.rawId ?? credential.id,
    type: credential.type || 'public-key',
    response: {
      clientDataJSON: response.clientDataJSON,
      authenticatorData: response.authenticatorData,
      signature: response.signature,
      userHandle: response.userHandle ?? null,
    },
    clientExtensionResults: credential.clientExtensionResults ?? {},
  };
};

export const extractSignedChallengeFromCredential = (credential: any): string => {
  try {
    const cdj = credential?.response?.clientDataJSON;
    if (!cdj) return '';
    const parsed = JSON.parse(decodeBase64UrlToUtf8(cdj));
    return String(parsed?.challenge || '').trim();
  } catch {
    return '';
  }
};

export const extractOriginFromCredential = (credential: any): string => {
  try {
    const cdj = credential?.response?.clientDataJSON;
    if (!cdj) return '';
    const parsed = JSON.parse(decodeBase64UrlToUtf8(cdj));
    return String(parsed?.origin || '').trim();
  } catch {
    return '';
  }
};

export const logPasskeyAssertionDebug = (label: string, credential: any, serverChallenge?: string) => {
  const signedChallenge = extractSignedChallengeFromCredential(credential);
  const origin = extractOriginFromCredential(credential);
  console.warn(`[Passkey][${label}] assertion debug`, {
    credentialId: credential?.id,
    hasSignature: !!credential?.response?.signature,
    hasAuthenticatorData: !!credential?.response?.authenticatorData,
    hasClientDataJSON: !!credential?.response?.clientDataJSON,
    origin: origin || '(unknown)',
    signedChallengePreview: signedChallenge ? `${signedChallenge.slice(0, 6)}…${signedChallenge.slice(-6)}` : null,
    serverChallengePreview: serverChallenge ? `${serverChallenge.slice(0, 6)}…${serverChallenge.slice(-6)}` : null,
    challengeMatchesServer: !!(signedChallenge && serverChallenge && signedChallenge === serverChallenge),
  });
};

const prepareAllowCredentials = (allowCredentials: any[]) => {
  if (!allowCredentials?.length) return undefined;
  const creds: any[] = [];
  allowCredentials.forEach((c: any) => {
    if (typeof c.id === 'string') {
      const b64url = maybeBase64ToBase64Url(c.id);
      creds.push({
        type: c.type || 'public-key',
        id: b64url,
        transports: c.transports || ['internal', 'hybrid'],
      });
      if (Platform.OS === 'android') {
        let stdB64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
        while (stdB64.length % 4) {
          stdB64 += '=';
        }
        creds.push({
          type: c.type || 'public-key',
          id: stdB64,
          transports: c.transports || ['internal', 'hybrid'],
        });
      }
    } else {
      creds.push({
        type: c.type || 'public-key',
        id: c.id,
        transports: c.transports || ['internal', 'hybrid'],
      });
    }
  });
  return creds;
};

export const buildPasskeyAssertionRequest = (opts: any) => {
  const rawChallenge = typeof opts.challenge === 'string' ? opts.challenge : '';
  const challengeForNative = maybeBase64ToBase64Url(rawChallenge);
  const rpIdFromServer = String(opts.rpId || opts.rp?.id || '').trim();
  const rpId =
    rpIdFromServer ||
    (PASSKEY_RP_ID && PASSKEY_RP_ID.trim() ? PASSKEY_RP_ID.trim() : '') ||
    '';
  const request: any = {
    challenge: challengeForNative || rawChallenge || opts.challenge,
    rpId: rpId || 'localhost',
    timeout: opts.timeout,
    userVerification: opts.userVerification || 'required',
  };
  if (opts.allowCredentials?.length) {
    request.allowCredentials = prepareAllowCredentials(opts.allowCredentials);
  }
  return { request, rpIdFromServer, rawChallenge };
};

export const isPasskeyOriginMismatchError = (err: any): boolean => {
  const msg = `${err?.error ?? ''} ${err?.message ?? ''}`.toLowerCase();
  return msg.includes('unexpected authentication response origin') || msg.includes('origin');
};
