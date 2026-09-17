import { Platform } from 'react-native';
import {AppOperation} from '../..';
import {
  ForgotPasswordProps,
  LoginProps,
  RegistrationProps,
  SendOtpRegistrationProps,
} from '../../../helper/types';
import {GUEST_TYPE} from '../../types';

export default (appOperation: AppOperation) => ({
  /** Resend OTP on account verification (same as web registrationOtp) */
  send_otp: (data: SendOtpRegistrationProps) =>
    appOperation.post('user/registration-otp', data, GUEST_TYPE),
  register_email: (data: RegistrationProps) =>
    appOperation.post('user/register-email', data, GUEST_TYPE),
  register_google: (data: RegistrationProps) =>
    appOperation.post('user/third-party-signup', data, GUEST_TYPE),
  register_phone: (data: RegistrationProps) =>
    appOperation.post('user/register-phone', data, GUEST_TYPE),
  check_signup_email: (email: string, referralCode?: string) => {
    const params: Record<string, any> = { email: String(email || '').trim() };
    const ref = String(referralCode || '').trim();
    if (ref) params.referral_code = ref;
    return appOperation.post('user/check-signup-email', params, GUEST_TYPE);
  },
  checkIdentifier: (data: { identifier: string; kind: string; purpose?: string; countryCode?: string; referralCode?: string }) => {
    const purposeNorm = String(data.purpose || 'signup').trim().toLowerCase() === 'login' ? 'login' : 'signup';
    // Spec: There is no username kind. Username on the email tab is sent as kind: "email".
    const kindNorm = String(data.kind || '').trim().toLowerCase() === 'phone' ? 'phone' : 'email';
    const params: Record<string, any> = { purpose: purposeNorm, kind: kindNorm };

    if (kindNorm === 'phone') {
      params.phone = String(data.identifier || '').replace(/\D/g, '').replace(/^0+/, '');
      params.country_code = String(data.countryCode || '+91').trim();
    } else {
      params.email = String(data.identifier || '').trim();
    }

    const ref = String(data.referralCode || '').trim();
    if (purposeNorm === 'signup' && ref) params.referralCode = ref;
    
    console.log("====== ACTUAL API PAYLOAD SENT TO SERVER ======");
    console.log(JSON.stringify(params, null, 2));
    
    return appOperation.post('user/check-signup-email', params, GUEST_TYPE);
  },
  login: (data: LoginProps) =>
    appOperation.post('user/login', data, GUEST_TYPE),
  /** Lost Login 2-Step — POST /v1/user/login-methods/recovery/start (tempToken, no Bearer) */
  loginMethodRecoveryStart: (data: { tempToken: string; challenge_id?: string; lost_method: string }) => {
    const params: Record<string, string> = {
      tempToken: String(data.tempToken || ""),
      lost_method: String(data.lost_method || "").toLowerCase(),
    };
    if (data.challenge_id) params.challenge_id = String(data.challenge_id);
    return appOperation.post("user/login-methods/recovery/start", params, GUEST_TYPE);
  },
  loginMethodRecoveryVerify: (data: { tempToken: string; challenge_id?: string; method: string; code: string }) => {
    const params: Record<string, string> = {
      tempToken: String(data.tempToken || ""),
      method: String(data.method || "").toLowerCase(),
      code: String(data.code ?? ""),
      otp: String(data.code ?? ""),
    };
    if (data.challenge_id) params.challenge_id = String(data.challenge_id);
    return appOperation.post("user/login-methods/recovery/verify", params, GUEST_TYPE);
  },
  google_login: (data: LoginProps) =>
    appOperation.post('user/third-party-login', data, GUEST_TYPE),
  forgot: (data: ForgotPasswordProps) =>
    appOperation.post('user/forgot_password', data, GUEST_TYPE),
  /** Same as web /account-verification flow: verify OTP after register */
  verify_otp: (data: any) =>
    appOperation.post('user/verify-registration-otp', data, GUEST_TYPE),
  forgot_otp: (data: SendOtpRegistrationProps) =>
    appOperation.post('user/send-otp', data, GUEST_TYPE),
  verify_fac_otp: (data: SendOtpRegistrationProps) =>
    appOperation.post('user/verify-otp', data, GUEST_TYPE),
  
  app_version: () =>
    appOperation.get('user/getApk', undefined, undefined, GUEST_TYPE),
  /** Web getOtp for login: Send OTP to email or mobile (type 'login') */
  send_login_otp: (signId: string, sendTo?: 'email' | 'mobile') => {
    const params: Record<string, unknown> = {
      email_or_phone: signId,
      type: 'login',
      resend: true,
    };
    if (sendTo) params.sendTo = sendTo;
    return appOperation.post('user/send-otp', params, GUEST_TYPE);
  },
  /** Passkey login: get assertion options (same as web passkeyGetAuthOptions) */
  passkeyGetAuthOptions: (signId: string) =>
    appOperation.post('security/passkey/auth/options', { signId }, GUEST_TYPE),
  /** Passkey login: verify assertion (same as web passkeyVerifyAuth) */
  passkeyVerifyAuth: (
    signId: string,
    credential: object,
    meta?: { clientType?: string; platform?: string; userAgent?: string },
  ) => {
    const body: Record<string, unknown> = {
      signId,
      credential,
      clientType: meta?.clientType || 'mobile',
      platform: meta?.platform || Platform.OS,
    };
    const headers: Record<string, string> = {};
    if (meta?.userAgent) headers['User-Agent'] = meta.userAgent;
    console.warn('[Passkey][HTTP][REQUEST] security/passkey/auth/verify', {
      signId,
      clientType: body.clientType,
      platform: body.platform,
      credentialKeys: credential && typeof credential === 'object' ? Object.keys(credential as object) : [],
    });
    try {
      console.warn('[Passkey][HTTP][REQUEST][body]', JSON.stringify(body, null, 2));
    } catch {
      // ignore stringify errors
    }
    return appOperation.post('security/passkey/auth/verify', body, GUEST_TYPE, headers);
  },
  /** Passkey login: complete and get token (same as web completePasskeyLogin) */
  completePasskeyLogin: (signId: string, verificationData: object) =>
    appOperation.post('security/passkey/login/complete', { signId, ...verificationData }, GUEST_TYPE),
  /** Discoverable passkey login (no email required – same as web “Continue with Passkey”) */
  passkeyDiscoverableAuthOptions: () =>
    appOperation.post('security/passkey/discoverable/options', {}, GUEST_TYPE),
  passkeyDiscoverableVerify: (credential: object, challenge: string) =>
    appOperation.post('security/passkey/discoverable/verify', { credential, challenge }, GUEST_TYPE),
});
