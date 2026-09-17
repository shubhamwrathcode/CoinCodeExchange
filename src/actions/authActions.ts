import AsyncStorage from '@react-native-async-storage/async-storage';
import { appOperation } from '../appOperation';
import { logger, showError, showSuccess } from '../helper/logger';
import {
  ForgotPasswordProps,
  LoginProps,
  RegistrationProps,
  SendOtpRegistrationProps,
} from '../helper/types';
import { setAppVersion, setLoading, setLoadingOtp, setUserData, setPending2FA, updatePending2FA, clearPending2FA } from '../slices/authSlice';
import { AppDispatch } from '../store/store';
import { USER_TOKEN_KEY, USER_REFRESH_TOKEN_KEY } from '../helper/Constants';
import NavigationService from '../navigation/NavigationService';
import {
  ACCOUNT_ACTIVATED_SCREEN,
  AUTH_VERIFICATION_SCREEN,
  ENTER_OTP_SCREEN,
  LOGIN_SCREEN,
  NAVIGATION_AUTH_STACK,
  NAVIGATION_BOTTOM_TAB_STACK,
  OTP_VERIFY_SCREEN,
  REGISTER_SCREEN,
  VERIFY_ACCOUNT_SCREEN,
} from '../navigation/routes';
import { getUserProfile } from './accountActions';
import { Passkey } from 'react-native-passkey';
import { PASSKEY_RP_ID } from '../helper/Constants';
import {
  buildPasskeyAssertionRequest,
  extractOriginFromCredential,
  getNativePasskeyAssertion,
  IOS_NO_PASSKEY_MESSAGE,
  isPasskeyAssociatedDomainError,
  isPasskeyNoCredentialsError,
  isPasskeyOriginMismatchError,
  logPasskeyAssertionDebug,
  normalizePasskeyAssertionCredential,
  waitForPasskeyNativePrompt,
} from '../helper/passkeyAssertion';
import { getMobilePasskeyUserAgent } from '../helper/passkeyDeviceInfo';
import { socketService } from '../services/socket/SocketService';
import { Platform } from 'react-native';
import {
  isLoginChallengeExpired,
  normalizeRecoverableMethodKeys,
} from '../helper/loginRecoveryHelpers';

/** Persist signup/login JWT so customer APIs + socket work after register / verify-otp. */
async function persistSignupSessionToken(tokenObj: any) {
  let t = '';
  let r = '';
  if (typeof tokenObj === 'string') {
    t = tokenObj.trim();
  } else if (tokenObj && typeof tokenObj === 'object') {
    t = (tokenObj.token || tokenObj.access_token || '').trim();
    r = (tokenObj.refreshToken || tokenObj.refresh_token || '').trim();
  }

  if (!t) return;
  appOperation.setCustomerToken(t);
  await AsyncStorage.setItem(USER_TOKEN_KEY, t);
  if (r) {
    appOperation.setCustomerRefreshToken?.(r);
    await AsyncStorage.setItem(USER_REFRESH_TOKEN_KEY, r);
  }
  socketService.reconnectWithToken(t);
}

function extractTokenFromAuthResponse(res: any): any {
  if (!res || typeof res !== 'object') return null;
  let token = '';
  let refreshToken = '';

  if (typeof res.token === 'string' && res.token.trim()) token = res.token.trim();
  if (typeof res.refresh_token === 'string' && res.refresh_token.trim()) refreshToken = res.refresh_token.trim();

  const d = res.data;
  if (typeof d === 'string' && d.trim().length > 10 && !token) token = d.trim();
  if (d && typeof d === 'object') {
    if (!token && typeof d.token === 'string' && d.token.trim()) token = d.token.trim();
    if (!token && typeof d.access_token === 'string' && d.access_token.trim()) token = d.access_token.trim();
    if (!refreshToken && typeof d.refresh_token === 'string' && d.refresh_token.trim()) refreshToken = d.refresh_token.trim();
  }

  return { token, refreshToken };
}

export const sendOtp =
  (
    data: SendOtpRegistrationProps,
    setDisbaleBtn = (p0: boolean) => { },
    setTimer = (p0: number) => { },
    setAttemptLeft = (_: string | number) => { }
  ) =>
    async (dispatch: AppDispatch) => {
      try {
        dispatch(setLoading(true));
        const response: any = await appOperation.guest.send_otp(data);
        if (response.success) {
          showError(response.message);
          setDisbaleBtn(true);
          setTimer(60);
          setAttemptLeft(response?.attemptsLeft ?? "");
        }
        return response;
      } catch (e: any) {
        logger(e);
        showError(e?.message);
        return { success: false, message: e?.message };
      } finally {
        dispatch(setLoading(false));
      }
    };

export const forgotOtp =
  (data: any, isNavigate = false) =>
    async (dispatch: AppDispatch) => {
      try {
        dispatch(setLoading(true));
        const response: any = await appOperation.guest.forgot_otp(data);
        if (response.success) {
          showError(response.message);
          // isNavigate
          //   ? NavigationService.navigate(OTP_VERIFY_SCREEN, {data})
          //   : null;
        }
      } catch (e: any) {
        logger(e);
        showError(e?.message);
      } finally {
        dispatch(setLoading(false));
      }
    };

export const getAppVersion =
  (opts?: { silent?: boolean }) =>
    async (dispatch: AppDispatch) => {
      try {
        if (!opts?.silent) {
          dispatch(setLoading(true));
        }
        const response: any = await appOperation.guest.app_version();
        if (response.success) {
          // showError(response.message);
          console.log(response, '====response=====app version')

          dispatch(setAppVersion(response.data));
        }
      } catch (e: any) {
        logger(e);
        if (!opts?.silent) {
          showError(e?.message);
        }
      } finally {
        if (!opts?.silent) {
          dispatch(setLoading(false));
        }
      }
    };

export const register =
  (data: RegistrationProps, setData = () => { }, setVerifyToken = (data: any) => { }, handleClearCaptcha = () => { }) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response: any = await appOperation.guest.register_email(data);
      if (__DEV__) {
        console.log('[register_email] API response:', JSON.stringify(response, null, 2));
      }
      if (!response.success) {
        showError(response.message);
        // handleClearCaptcha();
      } else {
        const tok = extractTokenFromAuthResponse(response);
        if (__DEV__) {
          console.log('[register_email] extracted token (preview):', tok?.token ? `${tok.token.slice(0, 12)}…` : '(none)');
        }
        await persistSignupSessionToken(tok ?? response?.token);
        NavigationService.navigate(NAVIGATION_AUTH_STACK, {
          screen: VERIFY_ACCOUNT_SCREEN,
        });
      }
    } catch (e: any) {
      console.log('[register_email] API error:', e?.message ?? e, e?.response ?? '');
      logger(e);
      showError(e?.message);
      // handleClearCaptcha();
    } finally {
      dispatch(setLoading(false));
      // handleClearCaptcha();
    }
  };

export const registerWithPhone =
  (data: RegistrationProps, setData = () => { }, setVerifyToken = (data: any) => { }, handleClearCaptcha = () => { }) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response: any = await appOperation.guest.register_phone(data);
      if (__DEV__) {
        console.log('[register_phone] API response:', JSON.stringify(response, null, 2));
      }
      if (!response.success) {
        showError(response.message);
        handleClearCaptcha();
      } else {
        showSuccess(response?.message);
        const tok = extractTokenFromAuthResponse(response);
        if (__DEV__) {
          console.log('[register_phone] extracted token (preview):', tok?.token ? `${tok.token.slice(0, 12)}…` : '(none)');
        }
        await persistSignupSessionToken(tok ?? response?.token);
        handleClearCaptcha();
        NavigationService.navigate(NAVIGATION_AUTH_STACK, {
          screen: VERIFY_ACCOUNT_SCREEN,
        });
      }
    } catch (e: any) {
      console.log('[register_phone] API error:', e?.message ?? e, e?.response ?? '');
      logger(e);
      showError(e?.message);
      handleClearCaptcha();
    } finally {
      dispatch(setLoading(false));
      handleClearCaptcha();
    }
  };

export const googleRegister =
  (data: RegistrationProps, setData = () => { }, setVerifyToken = (_: boolean) => { }, handleClearCaptcha = () => { }) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response: any = await appOperation.guest.register_google(data);
      console.log(response, '====response-=========');

      if (!response.success) {
        showError(response.message);
        handleClearCaptcha();
      } else {
        showSuccess(response?.message);
        appOperation.setCustomerToken(response?.token);
        await AsyncStorage.setItem(USER_TOKEN_KEY, response?.token);
        socketService.reconnectWithToken(response?.token ?? null);
        handleClearCaptcha();
        await dispatch(getUserProfile(false, true));
      }
    } catch (e: any) {
      console.log('[third-party-signup] API error:', e?.message ?? e, e?.response ?? '');
      logger(e);
      showError(e?.message);
      handleClearCaptcha();
    } finally {
      dispatch(setLoading(false));
    }
  };

/** Parity with web `LoginPage` classifyLoginFailureMessage — which field to outline on failure. */
export type LoginFailureKind =
  | 'activation'
  | 'user_not_found'
  | 'wrong_password'
  | 'auth_failed';

/**
 * Same rules as web `LoginPage`: generic “invalid email or password” → password field
 * (API cannot distinguish wrong email vs wrong password). Only explicit “not registered”
 * style copy highlights the identifier.
 */
export function classifyLoginFailureMessage(message: unknown): LoginFailureKind {
  const m = String(message || '').toLowerCase();
  if (!m) return 'auth_failed';
  if (m.includes('not been activated') || m.includes('not activated') || m.includes('verify your account')) {
    return 'activation';
  }
  if (
    m.includes('user not found') ||
    m.includes('no user found') ||
    m.includes('does not exist') ||
    m.includes('not registered') ||
    m.includes('no account with') ||
    m.includes('email is not registered') ||
    m.includes('username is not found') ||
    m.includes('username not found') ||
    m.includes('email not registered') ||
    m.includes('email address not found') ||
    m.includes('account not found') ||
    m.includes('no such user') ||
    m.includes('unknown email') ||
    m.includes('user does not exist') ||
    m.includes('email does not exist') ||
    m.includes('unregistered')
  ) {
    return 'user_not_found';
  }
  if (m.includes('invalid email or password') || m.includes('invalid credentials') || m.includes('wrong password')) {
    return 'wrong_password';
  }
  if (m.includes('password') && (m.includes('wrong') || m.includes('incorrect') || m.includes('invalid') || m.includes('mismatch'))) {
    return 'wrong_password';
  }
  return 'auth_failed';
}

const isSuspendedMessage = (msg: string): boolean => {
  const m = String(msg || '').toLowerCase();
  return m.includes('suspended') || m.includes('suspicious') || m.includes('support') || m.includes('assistance');
};

function loginFailureHighlights(kind: LoginFailureKind): {
  highlightPasswordField: boolean;
  highlightIdentifierField: boolean;
} {
  switch (kind) {
    case 'activation':
    case 'user_not_found':
      return { highlightPasswordField: false, highlightIdentifierField: true };
    case 'wrong_password':
    case 'auth_failed':
    default:
      return { highlightPasswordField: true, highlightIdentifierField: false };
  }
}

function extractSignIdFromToken(token: string | undefined | null): string | null {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const payload = JSON.parse(jsonPayload);
    return payload?.data?.signId ?? null;
  } catch (e) {
    return null;
  }
}

function loginFailMessage(response: any): string {
  return String(response?.message ?? response?.data?.message ?? '').trim() || 'Login failed';
}

/**
 * Post-login 2FA screen: do not use passkey (type 4) on the client. Prefer email / SMS when the
 * identifier matches, then any other non-passkey method the backend lists.
 */
/** Coerce API method type to 1|2|3|4 so aliases and string names like 'email', 'totp', 'mobile', 'passkey' are normalized. */
export function normalizeAuthMethodType(raw: any): number {
  const n = Number(raw);
  if (n === 1 || n === 2 || n === 3 || n === 4) return n;
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (s === 'email' || s === 'mail') return 1;
  if (s === 'google' || s === 'authenticator' || s === 'app' || s === 'ga' || s === 'totp') return 2;
  if (s === 'mobile' || s === 'phone' || s === 'sms') return 3;
  if (s === 'passkey' || s === 'webauthn') return 4;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function remainingMethodTypes(remaining: any): number[] {
  if (!Array.isArray(remaining)) return [];
  return remaining
    .map((m) => {
      if (m == null) return null;
      if (typeof m === 'number' || typeof m === 'string') return normalizeAuthMethodType(m);
      return normalizeAuthMethodType(m.type ?? m.verificationType ?? m.methodType);
    })
    .filter((t): t is number => t === 1 || t === 2 || t === 3 || t === 4);
}

/**
 * Normalize available methods from response data and inject Passkey (type 4)
 * if it's enabled on the account and supported by the device.
 */
const getNormalizedAvailableMethods = (d: any) => {
  let methods = d?.availableMethods ?? [];

  // Normalize method types to numbers
  methods = methods.map((m: any) => {
    const type = normalizeAuthMethodType(m?.type ?? m?.verificationType ?? m?.methodType ?? m);
    return {
      ...m,
      type,
    };
  });

  if (d?.hasPasskey && Passkey.isSupported()) {
    const passkeyMethod = {
      type: 4,
      name: 'Passkey',
      label: 'Passkey',
      description: 'Use Face ID, Touch ID, or biometrics',
      maskedValue: 'Biometric authentication'
    };
    // Put at the beginning, avoiding duplicates
    methods = [passkeyMethod, ...methods.filter((m: any) => m.type !== 4)];
  }
  return methods;
};

/**
 * Resolve the default 2FA method following strict priority order:
 * Passkey (4) -> Google Authenticator (2) -> Email OTP (1) -> Phone OTP (3)
 */
function resolveLogin2FADefaultMethod(
  methods: any[],
  backendPreferred: any,
  loginIdentifier: string
): number {
  const has = (t: number) => methods.some((m: any) => m.type === t);

  if (has(4)) return 4;
  if (has(2)) return 2;

  // Use loginIdentifier to determine if they used email or phone
  const isEmail = loginIdentifier && loginIdentifier.includes('@');

  if (isEmail) {
    if (has(1)) return 1;
    if (has(3)) return 3;
  } else {
    // If not email (likely phone), prefer phone (3)
    if (has(3)) return 3;
    if (has(1)) return 1;
  }

  return methods[0]?.type ?? 1;
}

function recoverableMethodsFromLogin(d: any): string[] {
  return normalizeRecoverableMethodKeys(d?.recoverable_methods ?? d?.recoverableMethods);
}

export type LoginThunkResult = {
  success: boolean;
  message?: string;
  highlightPasswordField?: boolean;
  highlightIdentifierField?: boolean;
};

export const login = (data: LoginProps & { token?: string }) => async (
  dispatch: AppDispatch
): Promise<LoginThunkResult> => {
  try {
    dispatch(setLoading(true));
    let deviceId = "";
    let platform = "";
    try {
      const { Platform } = require("react-native");
      const DeviceInfo = require("react-native-device-info");
      deviceId = DeviceInfo.getUniqueIdSync?.() || "";
      platform = Platform.OS;
    } catch {
      // ignore
    }
    console.log("[Login][API] request user/login", {
      email_or_phone: data?.email_or_phone,
      hasPassword: !!data?.password,
      deviceId,
      platform,
    });
    const response: any = await appOperation.guest.login(data);

    console.log("[Login][API] response", {
      success: response?.success,
      code: response?.code,
      message: response?.message,
      data: response?.data,
      full: response,
    });
    if (!response.success) {
      console.log("[Login][API] success=false body", JSON.stringify(response));
      const failMsg = loginFailMessage(response);
      if (response?.code == 403) {
        if (isSuspendedMessage(failMsg)) {
          showError(failMsg);
          return {
            success: false,
            message: failMsg,
            highlightPasswordField: false,
            highlightIdentifierField: false,
          };
        }
        appOperation.setCustomerToken(response?.data);
        NavigationService.navigate(REGISTER_SCREEN, { myToken: true, userData: data });
        return {
          success: false,
          message: failMsg,
          highlightPasswordField: false,
          highlightIdentifierField: false,
        };
      }
      showError(failMsg);
      const hi = loginFailureHighlights(classifyLoginFailureMessage(failMsg));
      return { success: false, message: failMsg, ...hi };
    }

    const d = response?.data;
    const no2Fa = d?.['2fa'] === 0;
    const webShape = d?.requiresVerification === true;

    if (no2Fa && !webShape) {
      await persistSignupSessionToken(d);
      await dispatch(getUserProfile());
      NavigationService.resetToMainApp(NAVIGATION_BOTTOM_TAB_STACK);
    } else if (webShape) {
      dispatch(setUserData(d));
      const methods = getNormalizedAvailableMethods(d);
      const signIdFromToken = extractSignIdFromToken(d?.tempToken ?? d?.token);
      const signId = d?.signId ?? signIdFromToken ?? data?.email_or_phone;
      const defaultMethod = resolveLogin2FADefaultMethod(methods, d?.defaultMethod, signId);
      const mode = String(d?.verification_mode || (methods.length > 1 ? 'ALL_REQUIRED' : ''));
      const comp = remainingMethodTypes(d?.completed_methods);
      const rem = remainingMethodTypes(d?.remaining_methods);
      dispatch(setPending2FA({
        loginSignId: signId,
        availableMethods: methods,
        defaultMethod: defaultMethod,
        verificationMode: mode,
        completedMethods: comp,
        remainingMethods: rem.length > 0 ? rem : (mode === 'ALL_REQUIRED' ? methods.map((m: any) => Number(m.type)) : []),
        challengeId: d?.challenge_id || d?.challengeId,
        tempToken: d?.tempToken,
        verifySubStep: 'methods',
        activeMethod: undefined,
        recoverableMethods: recoverableMethodsFromLogin(d),
        data: d,
      }));
      NavigationService.navigate(AUTH_VERIFICATION_SCREEN);
    } else {
      dispatch(setUserData(d));
      const methods = getNormalizedAvailableMethods(d);
      const signIdFromToken = extractSignIdFromToken(d?.tempToken ?? d?.token);
      const signId = d?.signId ?? signIdFromToken ?? data?.email_or_phone;
      const defaultMethod = resolveLogin2FADefaultMethod(methods, d?.['2fa'], signId);
      const mode = String(d?.verification_mode || (methods.length > 1 ? 'ALL_REQUIRED' : ''));
      const comp = remainingMethodTypes(d?.completed_methods);
      const rem = remainingMethodTypes(d?.remaining_methods);
      dispatch(setPending2FA({
        loginSignId: signId,
        availableMethods: methods,
        defaultMethod: defaultMethod,
        verificationMode: mode,
        completedMethods: comp,
        remainingMethods: rem.length > 0 ? rem : (mode === 'ALL_REQUIRED' ? methods.map((m: any) => Number(m.type)) : []),
        challengeId: d?.challenge_id || d?.challengeId,
        tempToken: d?.tempToken,
        verifySubStep: 'methods',
        activeMethod: undefined,
        recoverableMethods: recoverableMethodsFromLogin(d),
        data: d?.['2fa'] === 2 ? data : d,
      }));
      NavigationService.navigate(AUTH_VERIFICATION_SCREEN);
    }
    return { success: true };
  } catch (e: any) {
    logger(e);
    const errMsg =
      e?.message ||
      e?.data?.message ||
      e?.response?.data?.message ||
      e?.error ||
      'Invalid credentials. Please try again.';
    console.log("[Login][API] CATCH — login error:", {
      errMsg,
      code: e?.code,
      message: e?.message,
      data: e?.data,
    });
    showError(errMsg);
    if (e?.code == 403) {
      if (isSuspendedMessage(errMsg)) {
        return {
          success: false,
          message: errMsg,
          highlightPasswordField: false,
          highlightIdentifierField: false,
        };
      }
      appOperation.setCustomerToken(e?.data);
      NavigationService.navigate(REGISTER_SCREEN, { myToken: true });
      return {
        success: false,
        message: errMsg,
        highlightPasswordField: false,
        highlightIdentifierField: false,
      };
    }
    const hi = loginFailureHighlights(classifyLoginFailureMessage(errMsg));
    return { success: false, message: errMsg, ...hi };
  } finally {
    dispatch(setLoading(false));
  }
};

export const googleLogin = (data: any) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    console.log('[DEBUG] googleLogin payload:', data);
    const response: any = await appOperation.guest.google_login(data);
    console.log('[DEBUG] googleLogin response:', response);

    if (!response.success) {
      showError(response.message);
    } else {
      const d = response?.data;
      await persistSignupSessionToken(d);
      await dispatch(getUserProfile(false, true));
    }
  } catch (e: any) {
    console.log('[DEBUG] googleLogin THREW ERROR:', e);
    // console.log('[DEBUG] googleLogin ERROR RESPONSE:', e?.response?.data || e?.response || e);
    logger(e);
    const errMsg = e?.response?.data?.message ?? e?.message ?? '';
    showError(errMsg || 'Google login failed');
    if (e?.code == 403) {
      if (isSuspendedMessage(errMsg)) {
        return;
      }
      appOperation.setCustomerToken(e?.data);
      NavigationService.navigate(REGISTER_SCREEN, { myToken: true });
      return;
    }
  } finally {
    dispatch(setLoading(false));
  }
};

export const forgotPassword =
  (data: ForgotPasswordProps) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response: any = await appOperation.guest.forgot(data);
      if (!response.success) {
        showError(response.message);
      } else {
        showError(response.message);
        NavigationService.reset(LOGIN_SCREEN);
      }
    } catch (e: any) {
      logger(e);
      showError(e?.message);
    } finally {
      dispatch(setLoading(false));
    }
  };

export const sendLoginOtp =
  (signId: string, sendTo: 'email' | 'mobile', setResendTimer?: (s: number) => void) =>
    async (dispatch: AppDispatch) => {
      try {
        dispatch(setLoading(true));
        const response: any = await appOperation.guest.send_login_otp(signId, sendTo);
        if (response?.success) {
          showSuccess(response?.message ?? 'OTP sent successfully');
          setResendTimer?.(60);
        } else {
          showError(response?.message ?? 'Failed to Send OTP');
        }
      } catch (e: any) {
        logger(e);
        showError(e?.message ?? 'Failed to Send OTP');
      } finally {
        dispatch(setLoading(false));
      }
    };

const expireLoginChallenge = (dispatch: AppDispatch, message?: string) => {
  showError(message || 'Login challenge expired. Please sign in again.');
  dispatch(clearPending2FA());
  NavigationService.navigate(LOGIN_SCREEN);
};

/** Lost 2FA method — POST /v1/user/login-methods/recovery/start */
export const startLoginMethodRecovery = (lostMethod: string) => async (dispatch: AppDispatch, getState: () => any) => {
  const pending2FA = getState()?.auth?.pending2FA;
  if (!pending2FA?.tempToken) {
    expireLoginChallenge(dispatch);
    return { expired: true };
  }
  try {
    const response: any = await appOperation.guest.loginMethodRecoveryStart({
      tempToken: String(pending2FA.tempToken),
      challenge_id: pending2FA.challengeId ? String(pending2FA.challengeId) : undefined,
      lost_method: String(lostMethod || '').toLowerCase(),
    });
    if (isLoginChallengeExpired(response?.code)) {
      expireLoginChallenge(dispatch, response?.message);
      return { expired: true };
    }
    if (!response?.success) {
      showError(response?.message || 'Could not start method recovery');
      return { success: false };
    }
    return response;
  } catch (e: any) {
    showError(e?.message || 'Could not start method recovery');
    return { success: false };
  }
};

/** Prove a remaining recovery method — POST /v1/user/login-methods/recovery/verify */
export const verifyLoginMethodRecovery = (method: string, code: string) => async (dispatch: AppDispatch, getState: () => any) => {
  const pending2FA = getState()?.auth?.pending2FA;
  if (!pending2FA?.tempToken) {
    expireLoginChallenge(dispatch);
    return { expired: true };
  }
  try {
    const response: any = await appOperation.guest.loginMethodRecoveryVerify({
      tempToken: String(pending2FA.tempToken),
      challenge_id: pending2FA.challengeId ? String(pending2FA.challengeId) : undefined,
      method: String(method || '').toLowerCase(),
      code: String(code ?? ''),
    });
    if (isLoginChallengeExpired(response?.code)) {
      expireLoginChallenge(dispatch, response?.message);
      return { expired: true };
    }
    return response;
  } catch (e: any) {
    showError(e?.message || 'Invalid verification code. Please try again.');
    return { success: false };
  }
};

/** Same as web RegistrationVerification handleLogin: verify-registration-otp API, success → Login (account activated) */
export const verifyOtp = (
  data: any,
  setOtp = (p0: string) => { },
  setOtpError = (_: boolean) => { },
  onBlocked = () => { }
) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoadingOtp(true));
    const response: any = await appOperation.guest.verify_otp(data);
    if (__DEV__) {
      console.log('[verify-registration-otp] API response:', JSON.stringify(response, null, 2));
    }

    if (!response.success) {
      showError(response?.message ?? 'Verification failed.');
      setOtpError(true);
      if (String(response?.message || '').toLowerCase().includes('no otp attempt left')) {
        onBlocked();
      }
    } else {
      showSuccess('Login successful');
      setOtpError(false);
      setOtp('');
      const tok = extractTokenFromAuthResponse(response);
      if (__DEV__) {
        console.log('[verify-registration-otp] extracted token (preview):', tok?.token ? `${tok.token.slice(0, 12)}…` : '(unchanged — using token from register)');
      }
      if (tok) {
        await persistSignupSessionToken(tok);
      }
      // CDD onboarding temporarily disabled — go straight to app after signup.
      // const { markPostSignupCdd } = require('../utils/cddOnboarding');
      // const { ONBOARDING_CDD_SCREEN } = require('../navigation/routes');
      // await markPostSignupCdd();
      // NavigationService.resetToAuthCddScreen(ONBOARDING_CDD_SCREEN);
      dispatch(getUserProfile(false, true));
    }
  } catch (e: any) {
    logger(e);
    const errorMessage =
      e?.response?.data?.message ??
      e?.message ??
      (e?.request ? 'Network error. Please check your internet connection.' : null);
    showError(errorMessage ?? 'An error occurred. Please try again later.');
    setOtpError(true);
    if (String(errorMessage || '').toLowerCase().includes('no otp attempt left')) {
      onBlocked();
    }
  } finally {
    dispatch(setLoadingOtp(false));
  }
};


export const verifyUser = (data: { email_or_phone: string; otp: string; type: number }) => async (dispatch: AppDispatch, getState: () => any) => {
  try {
    dispatch(setLoadingOtp(true));
    const state = getState();
    const pending2FA = state?.auth?.pending2FA;

    const payload: any = {
      email_or_phone: data.email_or_phone,
      type: data.type,
      otp: data.type === 2 ? String(data.otp) : parseInt(data.otp, 10),
      resend: false,
    };
    if (pending2FA?.challengeId) payload.challenge_id = pending2FA.challengeId;
    if (pending2FA?.tempToken) payload.tempToken = pending2FA.tempToken;

    console.log('[verify-otp] payload:', payload);

    const response: any = await appOperation.guest.verify_fac_otp(payload as any);
    console.log('[verify-otp] response:', response);

    if (response?.success) {
      if (response?.data?.verification_complete === false) {
        const remaining = remainingMethodTypes(response.data.remaining_methods);
        const comp = remainingMethodTypes(response.data.completed_methods);
        const prevComp = Array.isArray(pending2FA?.completedMethods) ? pending2FA.completedMethods : [];
        const completed = comp.length > 0 ? comp : Array.from(new Set([...prevComp, data.type]));

        showSuccess(
          response?.data?.message ||
          response?.message ||
          (remaining.length
            ? `Method verified. ${remaining.length} method(s) remaining.`
            : 'Method verified. Continue with remaining security methods.')
        );

        dispatch(updatePending2FA({
          completedMethods: completed,
          remainingMethods: remaining,
          challengeId: response.data.challenge_id || pending2FA?.challengeId,
          tempToken: response.data.tempToken || pending2FA?.tempToken,
          verificationMode: response.data.verification_mode || pending2FA?.verificationMode,
          verifySubStep: 'methods',
          activeMethod: undefined,
          data: response.data,
        }));
        return response;
      }

      showSuccess(response?.message ?? 'Login successful');
      await persistSignupSessionToken(response?.data ?? pending2FA?.data);
      dispatch(clearPending2FA());
      // CDD onboarding temporarily disabled — go straight to app after login.
      // const { shouldForceCddOnboarding } = require('../utils/cddOnboarding');
      // const { ONBOARDING_CDD_SCREEN } = require('../navigation/routes');

      try {
        const profileRes: any = await appOperation.customer.get_profile();
        const userData = profileRes?.data;
        if (userData) {
          dispatch(setUserData(userData)); // from your slice
        }
        // if (shouldForceCddOnboarding(userData, true)) {
        //   NavigationService.resetToAuthCddScreen(ONBOARDING_CDD_SCREEN);
        // } else {
          NavigationService.resetToMainApp(NAVIGATION_BOTTOM_TAB_STACK);
        // }
      } catch (e) {
        NavigationService.resetToMainApp(NAVIGATION_BOTTOM_TAB_STACK);
      }
      dispatch(getUserProfile());
    } else {
      showError(response?.message ?? 'Verification failed');
    }
    return response;
  } catch (e: any) {
    logger(e);
    showError(e?.message);
    if (e?.code == 403) {
      appOperation.setCustomerToken(e?.token);
      NavigationService.navigate(REGISTER_SCREEN, { myToken: true });
      return { success: false, code: 403, message: e?.message, token: e?.token };
    }
    return { success: false, message: e?.message };
  } finally {
    dispatch(setLoadingOtp(false));
  }
};

/**
 * Web parity: challenge/ids are bytes. Some backends (incorrectly) compare the *string form*
 * of `challenge` they issued with what comes back. So we must avoid mutating the string
 * (e.g. stripping "=" padding or converting url/base64 variants) unless absolutely necessary.
 *
 * Only convert when it looks like classic base64 (`+` or `/`). Otherwise keep as-is.
 */
const maybeBase64ToBase64Url = (s: string) => {
  const raw = String(s || '').trim();
  if (!raw) return raw;
  // base64 -> base64url and remove padding
  return raw.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const isRpIdMismatchForAndroid = (rpIdFromServer: string) => {
  if (Platform.OS !== 'android') return false;
  const server = String(rpIdFromServer || '').trim();
  const configured = String(PASSKEY_RP_ID || '').trim();
  if (!server || !configured) return false;
  return server !== configured;
};

/** Passkey login using device biometrics (fingerprint/face). Same flow as web: get options → authenticate → verify → complete. */
export const verifyPasskeyLogin = (signId: string, silent = false) => async (dispatch: AppDispatch, getState: () => any) => {
  const logPrefix = `[Passkey][verifyPasskeyLogin][${signId}]`;
  try {
    console.log(`${logPrefix} START silent=${silent}`);
    if (!Passkey.isSupported()) {
      console.warn(`${logPrefix} FAIL - Passkey not supported on device`);
      if (!silent) showError('Passkeys are not supported on this device');
      return false;
    }
    dispatch(setLoading(true));
    console.log(`${logPrefix} Step 1/4 - fetching auth options...`);
    const optionsRes: any = await appOperation.guest.passkeyGetAuthOptions(signId);
    console.log(`${logPrefix} Step 1/4 - optionsRes:`, JSON.stringify(optionsRes));
    if (!optionsRes?.success || !optionsRes?.data) {
      console.warn(`${logPrefix} FAIL at Step 1/4 - could not get auth options`, optionsRes?.message);
      if (!silent) showError(optionsRes?.message || 'Failed to get passkey options');
      return false;
    }
    const opts = optionsRes.data;
    const { request, rpIdFromServer, rawChallenge } = buildPasskeyAssertionRequest(opts);
    console.log('[Passkey] rpIdFromServer:', rpIdFromServer, 'PASSKEY_RP_ID:', PASSKEY_RP_ID);
    if (isRpIdMismatchForAndroid(rpIdFromServer)) {
      console.warn('[Passkey][verifyPasskeyLogin] rpId mismatch - skipping native prompt', {
        server: rpIdFromServer,
        configured: PASSKEY_RP_ID,
      });
      if (!silent) showError('Passkey is not configured for this app. Please sign in with password.');
      return false;
    }
    console.log('[Passkey][verifyPasskeyLogin] options', {
      signId,
      rpId: request.rpId,
      hasAllowCredentials: !!request.allowCredentials?.length,
      challengeLen: typeof request.challenge === 'string' ? request.challenge.length : null,
      challengePreview:
        typeof request.challenge === 'string'
          ? `${request.challenge.slice(0, 6)}…${request.challenge.slice(-6)}`
          : null,
    });
    console.log(`${logPrefix} Step 2/4 - calling native passkey assertion`, {
      rpId: request.rpId,
      userVerification: request.userVerification,
      allowCredentials: request.allowCredentials?.length ?? 0,
      platform: Platform.OS,
    });
    // Hide global loading modal — it blocks the native passkey sheet (especially iOS Face ID).
    dispatch(setLoading(false));
    await waitForPasskeyNativePrompt();

    let credential: any;
    try {
      credential = await getNativePasskeyAssertion(request);
    } catch (e: any) {
      const msg = String(e?.message ?? e?.error ?? '');
      console.error(`${logPrefix} FAIL at Step 2/4 - native assertion threw`, {
        name: e?.name,
        code: e?.code,
        message: e?.message,
        raw: e,
      });
      if (isPasskeyAssociatedDomainError(e) || /incoming request cannot be validated/i.test(msg)) {
        if (!silent) showError(
          Platform.OS === 'ios'
            ? 'Passkey is not available on this iPhone. Associated domain (webcredentials:arabglobal.ae) must be live, then sign in with password or add a passkey on this device.'
            : 'Passkey is not available for this environment. Please sign in with password (or ask backend to use the correct RP ID).'
        );
      } else if (Platform.OS === 'ios' && isPasskeyNoCredentialsError(e)) {
        if (!silent) showError(IOS_NO_PASSKEY_MESSAGE);
      } else {
        if (!silent) showError(e?.message || 'Passkey prompt failed');
      }
      return false;
    }
    if (!credential) {
      console.warn(`${logPrefix} FAIL at Step 2/4 - user cancelled or no credential returned`);
      if (!silent) showError('Authentication was cancelled');
      return false;
    }
    console.log(`${logPrefix} Step 2/4 - credential acquired`, {
      type: (credential as any)?.type,
      id: (credential as any)?.id,
    });
    logPasskeyAssertionDebug('verifyPasskeyLogin', credential, rawChallenge);

    const normalizedCredential = normalizePasskeyAssertionCredential(credential);
    const verifyPayload = {
      signId,
      credential: normalizedCredential,
      clientType: 'mobile',
      platform: Platform.OS,
    };
    console.warn(`${logPrefix} Step 3/4 - auth/verify payload summary`, {
      signId,
      credentialId: normalizedCredential?.id,
      origin: extractOriginFromCredential(normalizedCredential) || '(unknown)',
      hasSignature: !!normalizedCredential?.response?.signature,
      clientType: verifyPayload.clientType,
      platform: verifyPayload.platform,
    });

    dispatch(setLoading(true));
    let verifyRes: any;
    try {
      verifyRes = await appOperation.guest.passkeyVerifyAuth(signId, normalizedCredential, {
        clientType: 'mobile',
        platform: Platform.OS,
        userAgent: getMobilePasskeyUserAgent(),
      });
    } catch (verifyErr: any) {
      console.error(`${logPrefix} Step 3/4 - auth/verify REJECTED`, JSON.stringify(verifyErr));
      if (isPasskeyOriginMismatchError(verifyErr)) {
        console.error(`${logPrefix} ORIGIN MISMATCH - app signing cert may not match backend whitelist`);
      }
      if (!silent) {
        showError(
          verifyErr?.error ||
            verifyErr?.message ||
            'Passkey verification failed. Try password login or re-add passkey on this device.',
        );
      }
      return false;
    }
    console.log(`${logPrefix} Step 3/4 - verifyRes:`, JSON.stringify(verifyRes));
    if (!verifyRes?.success) {
      console.warn(`${logPrefix} FAIL at Step 3/4 - backend verify failed`, verifyRes);
      if (!silent) showError(verifyRes?.message || 'Passkey verification failed');
      return false;
    }
    console.log(`${logPrefix} Step 4/4 - completing login...`);
    const completeRes: any = await appOperation.guest.completePasskeyLogin(signId, verifyRes.data || {});
    const sessionToken = extractTokenFromAuthResponse(completeRes);
    console.log(`${logPrefix} Step 4/4 - completeRes:`, {
      success: completeRes?.success,
      message: completeRes?.message,
      hasToken: !!sessionToken?.token,
      tokenPreview: sessionToken?.token ? `${sessionToken.token.slice(0, 12)}…` : null,
    });
    if (!completeRes?.success || !sessionToken?.token) {
      console.warn(`${logPrefix} FAIL at Step 4/4 - login complete failed`, completeRes);
      if (!silent) showError(completeRes?.message || 'Login failed');
      return false;
    }
    const state = getState();
    const pending2FA = state?.auth?.pending2FA;
    const availableMethods = pending2FA?.availableMethods || [];
    const prevCompleted = pending2FA?.completedMethods || [];
    const currentCompleted = Array.from(new Set([...prevCompleted, 4]));
    const remaining = availableMethods.filter((m: any) => !currentCompleted.includes(Number(m.type)));

    if (pending2FA?.verificationMode === 'ALL_REQUIRED' && remaining.length > 0) {
      console.log(`${logPrefix} SUCCESS - passkey verified, 2FA still required`, {
        remainingMethods: remaining.length,
        completedMethods: currentCompleted,
      });
      showSuccess(completeRes?.message ?? 'Passkey verified');
      dispatch(updatePending2FA({
        completedMethods: currentCompleted,
        verifySubStep: 'methods',
        activeMethod: undefined,
        data: completeRes?.data ?? pending2FA?.data,
      }));
      return true;
    }

    console.log(`${logPrefix} SUCCESS - logging in and navigating to main app`);
    showSuccess(completeRes?.message ?? 'Login successful');
    await persistSignupSessionToken(sessionToken);
    NavigationService.resetToMainApp(NAVIGATION_BOTTOM_TAB_STACK);
    dispatch(clearPending2FA());
    dispatch(getUserProfile());
    return true;
  } catch (e: any) {
    console.error(`${logPrefix} UNEXPECTED ERROR`, {
      name: e?.name,
      code: e?.code,
      message: e?.message,
      stack: e?.stack,
    });
    logger(e);
    const msg = String(e?.message ?? e?.error ?? '');
    if (e?.name === 'NotAllowedError' || /cancelled|cancel/i.test(msg)) {
      console.warn(`${logPrefix} FAIL - user cancelled passkey prompt`);
      if (!silent) showError('Authentication was cancelled. Try again or use another method.');
    } else {
      console.warn(`${logPrefix} FAIL - passkey authentication error`);
      if (!silent) showError(e?.message || 'Passkey authentication failed');
    }
    if (e?.code == 403) {
      appOperation.setCustomerToken(e?.token);
      NavigationService.navigate(REGISTER_SCREEN, { myToken: true });
      return false;
    }
    return false;
  } finally {
    dispatch(setLoading(false));
  }
};

/** Discoverable passkey login (no email required – same as web “Continue with Passkey”). */
export const passkeyDiscoverableLogin = () => async (dispatch: AppDispatch) => {
  try {
    const isSupported = Passkey.isSupported();
    console.log('[Passkey][1] Passkey.isSupported():', isSupported);
    if (!isSupported) {
      showError('Passkeys are not supported on this device');
      return false;
    }
    dispatch(setLoading(true));

    console.log('[Passkey][2] Requesting discoverable auth options from API (security/passkey/discoverable/options)...');
    const optionsRes: any = await appOperation.guest.passkeyDiscoverableAuthOptions();
    console.log('[Passkey][3] API Auth Options Response:', JSON.stringify(optionsRes, null, 2));

    if (!optionsRes?.success || !optionsRes?.data) {
      console.error('[Passkey][ERROR] Auth options API failed or returned success=false:', optionsRes);
      showError(optionsRes?.message || 'Failed to get authentication options');
      return false;
    }
    const opts = optionsRes.data;
    const challengeFromApi = optionsRes.challenge ?? opts.challenge;
    const rawChallenge = typeof challengeFromApi === 'string' ? challengeFromApi : '';
    const challengeForNative = maybeBase64ToBase64Url(rawChallenge);
    const rpIdFromServer = String(opts.rpId || opts.rp?.id || '').trim();

    console.log('[Passkey][4] Parsed Options Config:', {
      rpIdFromServer,
      configuredRPID: PASSKEY_RP_ID,
      rawChallenge,
      challengeForNative,
      timeout: opts.timeout,
      userVerification: opts.userVerification,
      allowCredentialsCount: opts.allowCredentials?.length || 0,
    });

    if (isRpIdMismatchForAndroid(rpIdFromServer)) {
      console.warn('[Passkey][discoverable] rpId mismatch - skipping native prompt', {
        server: rpIdFromServer,
        configured: PASSKEY_RP_ID,
      });
      showError('Passkey is not configured for this app. Please sign in with password.');
      return false;
    }
    const rpId =
      rpIdFromServer ||
      (PASSKEY_RP_ID && PASSKEY_RP_ID.trim() ? PASSKEY_RP_ID.trim() : '') ||
      '';
    const request: any = {
      challenge: challengeForNative || rawChallenge || challengeFromApi,
      rpId: rpId || 'localhost',
      timeout: opts.timeout,
      userVerification: opts.userVerification || 'preferred',
    };
    // Discoverable login must not send allowCredentials. Android already omitted them;
    // iOS fails if those IDs belong to Android/web and not iCloud Keychain.
    console.log('[Passkey][5] Native assertion request:', JSON.stringify(request, null, 2));

    dispatch(setLoading(false));
    await waitForPasskeyNativePrompt();

    const credential = await getNativePasskeyAssertion(request);
    console.log('[Passkey][6] Native assertion credential:', JSON.stringify(credential, null, 2));

    if (!credential) {
      console.warn('[Passkey][ERROR] No credential returned from native passkey prompt (user cancelled or prompt failed)');
      showError('Authentication was cancelled');
      return false;
    }

    console.log('[Passkey][7] Sending Discoverable Verify Request to API (security/passkey/discoverable/verify)...');
    const challengeToSend = challengeFromApi ?? rawChallenge ?? request.challenge;
    const verifyRes: any = await appOperation.guest.passkeyDiscoverableVerify(
      credential,
      challengeToSend
    );
    console.log('[Passkey][8] API Discoverable Verify Response:', JSON.stringify(verifyRes, null, 2));

    if (!verifyRes?.success || !verifyRes?.data?.token) {
      console.error('[Passkey][ERROR] Passkey verify returned success=false or missing token:', verifyRes);
      showError(verifyRes?.message || 'Passkey verification failed');
      return false;
    }
    showSuccess(verifyRes?.message ?? 'Login successful');
    await persistSignupSessionToken(verifyRes.data);
    NavigationService.resetToMainApp(NAVIGATION_BOTTOM_TAB_STACK);
    dispatch(clearPending2FA());
    dispatch(getUserProfile());
    return true;
  } catch (e: any) {
    console.error('==================== [Passkey CATCH ERROR] ====================', {
      message: e?.message,
      name: e?.name,
      code: e?.code,
      response: e?.response?.data || e?.response,
      error: e?.error,
      fullError: e,
    });
    logger(e);
    const msg = String(e?.message ?? e?.error ?? '');
    if (e?.name === 'NotAllowedError' || /cancelled|cancel/i.test(msg)) {
      showError('Authentication was cancelled. Try again or use another method.');
    } else if (isPasskeyAssociatedDomainError(e)) {
      showError(
        Platform.OS === 'ios'
          ? 'Passkey could not be validated on iOS. Host apple-app-site-association on arabglobal.ae and rebuild the app.'
          : (e?.message || 'Passkey authentication failed')
      );
    } else if (Platform.OS === 'ios' && isPasskeyNoCredentialsError(e)) {
      showError(IOS_NO_PASSKEY_MESSAGE);
    } else {
      showError(e?.message || 'Passkey authentication failed');
    }
    if (e?.code == 403) {
      appOperation.setCustomerToken(e?.token);
      NavigationService.navigate(REGISTER_SCREEN, { myToken: true });
      return false;
    }
    return false;
  } finally {
    dispatch(setLoading(false));
  }
};

export const logoutAction = () => async (dispatch: AppDispatch) => {
  appOperation.setCustomerToken('');
  await AsyncStorage.removeItem(USER_TOKEN_KEY);
  await AsyncStorage.removeItem(USER_REFRESH_TOKEN_KEY);
  if (appOperation.setCustomerRefreshToken) appOperation.setCustomerRefreshToken('');
  dispatch(setUserData(null));
  NavigationService.reset(NAVIGATION_AUTH_STACK);
};
