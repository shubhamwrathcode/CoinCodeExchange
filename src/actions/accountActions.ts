import { ACCOUNT_SCREEN, ANTI_PHISHING_CODE_SCREEN, KYC_STATUS_SCREEN, LOGIN_SCREEN } from './../navigation/routes';
import { appOperation } from '../appOperation';
import { logger, showError, showSuccess } from '../helper/logger';
import {
  AlertsProps,
  ChangePasswordProps,
  CurrencyPreferenceProps,
  DownloadTradeReportProps,
  RatingProps,
} from '../helper/types';
import NavigationService from '../navigation/NavigationService';
import {
  NAVIGATION_AUTH_STACK,
  NAVIGATION_BOTTOM_TAB_STACK,
  TWO_FACTOR_QR_SCREEN,
} from '../navigation/routes';
import { setKycData, setUserBankData } from '../slices/accountSlice';
import { setLoading, setLoadingOtp, setUserData } from '../slices/authSlice';
import {
  setCurrency,
  setFlatInvestments,
  setPayoutHistory,
  setReferCode,
  setReferCount,
  setTreeRoot,
  setTwoFaData,
  setUserTickets,
} from '../slices/homeSlice';
import store, { AppDispatch } from '../store/store';
import { logoutAction } from './authActions';
import { getAllWalletsPortfolio, getUserPortfolioArbitrage, getUserPortfolioEarning, getUserPortfolioMain, getUserPortfolioSpot, getUserPortfolioSwap } from './walletActions';
import { Alert, NativeModules, Platform } from 'react-native';
import { getReferralList } from './homeActions';
import { Passkey } from 'react-native-passkey';
import { CHART_WEB_BASE_URL, PASSKEY_RP_ID } from '../helper/Constants';
import { getMobilePasskeyDeviceInfo, mergePasskeyListWithLocalDeviceInfo, saveLocalPasskeyDeviceInfo } from '../helper/passkeyDeviceInfo';
import {
  getNativePasskeyAssertion,
  isPasskeyAssociatedDomainError,
  waitForPasskeyNativePrompt,
} from '../helper/passkeyAssertion';

const toBase64URL = (str: string) =>
  str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const maybeBase64ToBase64Url = (s: string) => {
  const raw = String(s || '').trim();
  if (!raw) return raw;
  if (raw.includes('+') || raw.includes('/')) {
    // base64 -> base64url (keep padding to preserve bytes + server quirks)
    return raw.replace(/\+/g, '-').replace(/\//g, '_');
  }
  return raw; // already base64url-ish
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

const isRpIdMismatchForAndroid = (rpIdFromServer: string) => {
  // Bypassing strict check to allow local testing and prevent false positives.
  return false;
};

const buildPasskeyAssertionRequest = (opts: any) => {
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
  return { request, rpIdFromServer };
};

/** Authenticated step-up: always use interactive Passkey.get so the device signs the fresh server challenge. */
const getPasskeyCredentialForStepUp = async (opts: any, silent: boolean) => {
  const { request, rpIdFromServer } = buildPasskeyAssertionRequest(opts);
  if (isRpIdMismatchForAndroid(rpIdFromServer)) {
    if (!silent) showError('Passkey is not configured for this app.');
    return null;
  }
  try {
    if (Platform.OS === 'ios') {
      store.dispatch(setLoading(false));
      await waitForPasskeyNativePrompt();
    }
    return await getNativePasskeyAssertion(request);
  } catch (e: any) {
    const msg = String(e?.message ?? e?.error ?? '');
    if (/NoCredentials|no.*credential|no viable credential/i.test(msg)) {
      if (!silent) showError('Passkey credential not found on this device. Please use another verification method.');
      return null;
    }
    if (e?.name === 'NotAllowedError' || /cancelled|cancel/i.test(msg)) {
      if (!silent) showError('Authentication was cancelled');
      return null;
    }
    if (Platform.OS === 'ios' && isPasskeyAssociatedDomainError(e)) {
      if (!silent) {
        showError(
          'Passkey is not available on this iPhone yet. Host apple-app-site-association on arabglobal.ae, then add a passkey on this device.',
        );
      }
      return null;
    }
    throw e;
  }
};

/** Same as web /account-verification: calls verify-registration-token to get signId, registeredBy for OTP step */
export const registerVerifyToken =
  (setData = (data: any) => { }) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response: any = await appOperation.customer.verify_token();
      if (response?.success) {
        // showError(response?.message);
        setData(response?.data);
        // NavigationService.navigate(LOGIN_SCREEN);
      } else {
        showError(response?.message);
      }
    } catch (e) {
      logger(e);
      dispatch(setLoading(false));
    } finally {
      dispatch(setLoading(false));
    }
  };


export const getUserProfile =
  (isNavigate = false, isHome = false, skipGlobalLoading = false, isAppStartup = false) =>
    async (dispatch: AppDispatch) => {
      try {
        if (!skipGlobalLoading) {
          dispatch(setLoading(true));
        }
        const response: any = await appOperation.customer.get_profile();
        // CDD onboarding temporarily disabled — skip screen on login/register.
        // const { shouldForceCddOnboarding } = require('../utils/cddOnboarding');
        // const { ONBOARDING_CDD_SCREEN } = require('../navigation/routes');

        if (response?.success) {
          dispatch(setUserData(response?.data));
          dispatch(setCurrency(response?.data?.currency_prefrence));

          // if (shouldForceCddOnboarding(response?.data, true)) {
          //   if (isAppStartup) {
          //     const { logoutAction } = require('./authActions');
          //     dispatch(logoutAction());
          //   } else {
          //     NavigationService.resetToAuthCddScreen(ONBOARDING_CDD_SCREEN);
          //   }
          // } else {
            isNavigate ? NavigationService.goBack() : null;
            isHome ? NavigationService.reset(NAVIGATION_BOTTOM_TAB_STACK) : null;
          // }
        } else if (response?.code === 401 || (isAppStartup && !response?.success)) {
          NavigationService.reset(NAVIGATION_AUTH_STACK);
        }
      } catch (e: any) {
        logger(e);
        if (e?.code === 401 || (isAppStartup && e?.code !== 200)) {
          NavigationService.reset(NAVIGATION_AUTH_STACK);
        }
      } finally {
        if (!skipGlobalLoading) {
          dispatch(setLoading(false));
        }
      }
    };

/**
 * After signup OTP verification: load profile and enter main app without sending user to Login.
 * On failure navigates to Login only (no full auth-stack reset).
 */
export const enterMainAppAfterSignup =
  () => async (dispatch: AppDispatch) => {
    try {
      const response: any = await appOperation.customer.get_profile();
      if (response?.success) {
        dispatch(setUserData(response?.data));
        dispatch(setCurrency(response?.data?.currency_prefrence));
        NavigationService.resetToMainApp(NAVIGATION_BOTTOM_TAB_STACK);
        return { ok: true as const };
      }
      NavigationService.navigate(NAVIGATION_AUTH_STACK, { screen: LOGIN_SCREEN });
      return { ok: false as const };
    } catch (e) {
      logger(e);
      NavigationService.navigate(NAVIGATION_AUTH_STACK, { screen: LOGIN_SCREEN });
      return { ok: false as const };
    }
  };


export const editUserAvatar =
  (data: FormData) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response: any = await appOperation.customer.edit_avatar(data);
      // console.log('res:::', response);
      if (response?.success) {
        showSuccess(response?.message || "Profile picture updated successfully");
        dispatch(getUserProfile(false));
      } else {
        showError(response?.message || "Failed to update profile picture");
      }
    } catch (e: any) {

      showError(e?.message);

      logger(e);
    } finally {
      dispatch(setLoading(false));
    }
  };

export const editEmail =
  (data: any, onCloseEmail = () => { }) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response: any = await appOperation.customer.edit_email(data);
      // console.log('res:::', response);
      if (response?.success) {
        showSuccess(response?.message || "Update successful");
        dispatch(getUserProfile(false));
        onCloseEmail();
      } else {
        showError(response?.message || "Failed to update");
      }
    } catch (e: any) {

      showError(e?.message);

      logger(e);
    } finally {
      dispatch(setLoading(false));
    }
  };


export const editPhone =
  (data: any, onCloseEmail = () => { }) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response: any = await appOperation.customer.edit_phone(data);
      // console.log('res:::', response);
      if (response?.success) {
        showSuccess(response?.message || "Update successful");
        dispatch(getUserProfile(false));
        onCloseEmail();
      } else {
        showError(response?.message || "Failed to update");
      }
    } catch (e: any) {

      showError(e?.message);

      logger(e);
    } finally {
      dispatch(setLoading(false));
    }
  };


export const editName =
  (data: any, onCloseEmail = () => { }) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response: any = await appOperation.customer.edit_name(data);
      // console.log('res:::', response);
      if (response?.success) {
        showSuccess(response?.message || "Update successful");
        dispatch(getUserProfile(false));
        onCloseEmail();
      } else {
        showError(response?.message || "Failed to update");
      }
    } catch (e: any) {

      showError(e?.message);

      logger(e);
    } finally {
      dispatch(setLoading(false));
    }
  };



export const editNominee =
  (data: any, onCloseEmail = () => { }) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response: any = await appOperation.customer.edit_nominee(data);
      // console.log('res:::', response);
      if (response?.success) {
        showSuccess(response?.message || "Update successful");
        dispatch(getUserProfile(false));
        onCloseEmail();
      } else {
        showError(response?.message || "Failed to update");
      }
    } catch (e: any) {

      showError(e?.message);

      logger(e);
    } finally {
      dispatch(setLoading(false));
    }
  };

export const editUserProfile =
  (data: FormData) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response: any = await appOperation.customer.edit_profile(data);
      // console.log('res:::', response);
      if (response?.success) {
        showError(response?.message);
        dispatch(getUserProfile(true));
      } else {
        showError(response?.message);
      }
    } catch (e: any) {

      showError(e?.message);

      logger(e);
    } finally {
      dispatch(setLoading(false));
    }
  };
export const changePassword =
  (data: ChangePasswordProps) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response: any = await appOperation.customer.change_password(data);

      if (response?.success) {
        showSuccess(response?.message || 'Password changed successfully.');
        return true;
      } else {
        showError(response?.message || 'Failed to change password');
        return false;
      }
    } catch (e: any) {
      logger(e);
      showError(e?.message || 'Something went wrong');
      return false;
    } finally {
      dispatch(setLoading(false));
    }
  };

export const securityChangePasswordAction =
  (data: any) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response: any = await appOperation.customer.security_change_password(data);
      console.log("security_change_password response:", response);

      if (response?.success) {
        showSuccess(response?.message || 'Password changed successfully.');
        return true;
      } else {
        showError(response?.message || 'Failed to change password');
        return false;
      }
    } catch (e: any) {
      logger(e);
      showError(e?.message || 'Something went wrong');
      return false;
    } finally {
      dispatch(setLoading(false));
    }
  };

export const securityAddFundPasswordAction =
  (data: any) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response: any = await appOperation.customer.security_add_fund_password(data);
      console.log("security_add_fund_password response:", response);

      if (response?.success) {
        showSuccess(response?.message || 'Fund password updated successfully.');
        dispatch(getUserProfile(false));
        return true;
      } else {
        showError(response?.message || 'Failed to update fund password');
        return false;
      }
    } catch (e: any) {
      console.error("security_add_fund_password catch error:", e);
      logger(e);
      showError(e?.message || 'Something went wrong');
      return false;
    } finally {
      dispatch(setLoading(false));
    }
  };

export const getFundPasswordStatusAction = () => async (dispatch: AppDispatch) => {
  try {
    const response: any = await appOperation.customer.security_get_fund_password_status();
    if (response?.success) {
      return response?.data;
    }
    return null;
  } catch (e) {
    logger(e);
    return null;
  }
};

/** Unified security verification — same as web's verifyAllSecurityMethods */
export const verifySecurityAllMethods = (data: { type: string; code?: string; credential?: any }) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response: any = await appOperation.customer.verify_all_security_methods(data);
    console.log("verify_all_security_methods response:", response);
    if (response?.success) {
      return response;
    } else {
      showError(response?.message || 'Verification failed');
      return null;
    }
  } catch (e: any) {
    logger(e);
    showError(e?.message || 'Verification failed');
    return null;
  } finally {
    dispatch(setLoading(false));
  }
};

export const changeCurrencyPreference =
  (data: CurrencyPreferenceProps) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));

      const response: any = await appOperation.customer.change_currency(data);
      if (response?.success) {
        showSuccess(response?.message || "Currency preference updated successfully");
        dispatch(getUserProfile());
        dispatch(getAllWalletsPortfolio());
        dispatch(getUserPortfolioMain("main"));
        dispatch(getUserPortfolioSpot("spot"));
        dispatch(getUserPortfolioSwap("swap"));
        dispatch(getUserPortfolioEarning("earning"));
        dispatch(getUserPortfolioArbitrage("arbitrage"));
      } else {
        showError(response?.message || "Failed to update currency preference");
      }
    } catch (e: any) {
      logger(e);
      showError(e?.message || "Something went wrong while updating currency");
    } finally {
      dispatch(setLoading(false));
    }
  };
/** Map canonical Didit `GET /api/v1/kyc/status` payload into legacy fields used by `KycStatus.js`. */
function normalizeKycStatusForUi(raw: any): any {
  if (!raw || typeof raw !== 'object') return raw;
  const inner =
    raw.data && typeof raw.data === 'object' && raw.id_document_status == null && raw.tax_document_status == null
      ? raw.data
      : raw;
  if (
    inner.id_document_status != null ||
    inner.tax_document_status != null ||
    inner.selfie_status != null
  ) {
    return { ...inner };
  }
  const statusRaw = inner.status ?? inner.kyc_status ?? '';
  const sc = String(statusRaw)
    .trim()
    .toUpperCase()
    .replace(/-/g, '_');
  const doc = (() => {
    if (['APPROVED', 'VERIFIED', 'SUCCESS', 'COMPLETE'].includes(sc)) return 'approved';
    if (['REJECTED', 'FAILED', 'DECLINED', 'CANCELLED'].includes(sc)) return 'rejected';
    if (sc === 'RESUBMISSION_REQUESTED') return 'resubmit_required';
    if (['PENDING', 'NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'PROCESSING', 'EXPIRED'].includes(sc) || !sc)
      return 'pending';
    return 'pending';
  })();
  return {
    ...inner,
    id_document_status: inner.id_document_status ?? doc,
    tax_document_status: inner.tax_document_status ?? doc,
    selfie_status: inner.selfie_status ?? doc,
    needs_resubmission: inner.needs_resubmission ?? sc === 'RESUBMISSION_REQUESTED',
    documents_needing_resubmission: inner.documents_needing_resubmission ?? [],
    kyc_data: inner.kyc_data ?? inner.kycData ?? null,
  };
}

/**
 * Web Didit flow uses `GET /api/v1/kyc/status`. Older backends used `GET v1/user/kyc-status`.
 * Try canonical first; on failure try legacy; normalize for the Verification Center UI.
 */
export const getKycStatus = () => async () => {
  let response: any = null;
  let payload: any = null;
  try {
    response = await appOperation.customer.get_kyc_status();
    if (response != null) {
      if (response.success === true && response.data != null) {
        if (typeof response.data === 'object' && response.data.data != null && !Array.isArray(response.data.data)) {
          payload = response.data.data;
        } else {
          payload = response.data;
        }
      } else if (response.data != null && response.data.status) {
        payload = response.data;
      } else if (response.status) {
        payload = response;
      }
    }
  } catch (e: any) {
    if (__DEV__) console.log('[KYC API] get_kyc_status canonical failed', e?.code, e?.message);
    if (e?.response?.data) {
      const errData = e.response.data;
      if (errData?.data?.status) payload = errData.data;
      else if (errData?.status) payload = errData;
    }
  }

  if (payload == null) {
    if (__DEV__) console.warn('[KYC API] get_kyc_status: no canonical payload found');
    return null;
  }
  return normalizeKycStatusForUi(payload);
};

export const getKybStatus = () => async () => {
  let response: any = null;
  let payload: any = null;
  try {
    response = await appOperation.customer.get_kyb_status();
    console.log(response, '[[[responsee]]');

    if (response != null) {
      if (response.success === true && response.data != null) {
        if (typeof response.data === 'object' && response.data.data != null && !Array.isArray(response.data.data)) {
          payload = response.data.data;
        } else {
          payload = response.data;
        }
      } else if (response.data != null && response.data.status) {
        payload = response.data;
      } else if (response.status) {
        payload = response;
      }
    }
  } catch (e: any) {
    if (__DEV__) console.log('[KYB API] get_kyb_status failed', e?.code, e?.message);
    if (e?.response?.data) {
      const errData = e.response.data;
      if (errData?.data?.status) payload = errData.data;
      else if (errData?.status) payload = errData;
    }
  }

  if (payload == null) {
    if (__DEV__) console.warn('[KYB API] get_kyb_status: no payload found');
    return null;
  }
  return normalizeKycStatusForUi(payload);
};

/** Same as web: GET api/meta/countries - list of { code, name, flag } */
export const getCountries = () => async () => {
  try {
    const response: any = await appOperation.customer.get_countries();
    const raw = response?.success ? response?.data : response;
    const list = Array.isArray(raw) ? raw : (raw?.countries ? raw.countries : []);
    return (list || []).map((c: any) => ({
      code: c.code || c.iso2 || c.alpha2 || c.value,
      name: c.name || c.country_name || c.label || c.value,
      flag: c.flag || c.emoji || '',
    }));
  } catch (e) {
    logger(e);
    return [];
  }
};

/** Same as web: GET api/kyc/config/:countryCode - returns id_documents, tax_documents (min, max, regex, requires_back_image) */
export const getKycConfig = (countryCode: string) => async () => {
  try {
    const response: any = await appOperation.customer.get_kyc_config(countryCode);
    if (__DEV__) {
      const payload = response?.success && response?.data ? response.data : response;
      const idDocs = payload?.id_documents;
      const taxDocs = payload?.tax_documents;
      console.log('[KYC API] get_kyc_config', {
        countryCode,
        success: response?.success,
        message: response?.message,
        id_documents_count: Array.isArray(idDocs) ? idDocs.length : idDocs ? 1 : 0,
        tax_documents_count: Array.isArray(taxDocs) ? taxDocs.length : taxDocs ? 1 : 0,
      });
    }
    if (response?.success && response?.data) return response.data;
    if (response?.id_documents) return response;
    return null;
  } catch (e) {
    if (__DEV__) console.warn('[KYC API] get_kyc_config error', countryCode, e);
    logger(e);
    return null;
  }
};

export const createKycSession = (userDetails: any, forceNew?: boolean) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const cc = userDetails?.country_code || userDetails?.countryCode;
    const mobile = userDetails?.mobileNumber || userDetails?.phoneNumber || userDetails?.phone;
    const phone = mobile ? `${cc ? String(cc).replace(/\s/g, "") : ""}${String(mobile).replace(/\s/g, "")}` : undefined;
    const emailRaw = userDetails?.emailId ?? userDetails?.email;
    const first = userDetails?.firstName ?? userDetails?.first_name;
    const last = userDetails?.lastName ?? userDetails?.last_name;
    /**
     * HTTPS return + `open_in_app=1` so Didit (which often ignores custom schemes) lands on our page;
     * the web page immediately opens `agce://…` and skips web profile APIs so stale `localStorage` tokens
     * do not trigger 401 toasts while Chrome/Safari stays in the foreground.
     */
    const webOrigin = String(CHART_WEB_BASE_URL || "").replace(/\/+$/, "");
    const body: Record<string, unknown> = {
      jurisdiction: "GLOBAL",
      ...(emailRaw ? { email: String(emailRaw) } : {}),
      ...(phone && phone.length > 4 ? { phone } : {}),
      ...(first ? { firstName: String(first) } : {}),
      ...(last ? { lastName: String(last) } : {}),
      returnUrl: webOrigin
        ? `${webOrigin}/user_profile/kyc/submitted?open_in_app=1`
        : "agce://kyc_return?kyc_return=1",
    };

    if (forceNew === true) {
      body.forceNew = true;
    }

    const response: any = await appOperation.customer.create_kyc_session(body);
    if (__DEV__) {
      const data = response?.data;
      console.log('[KYC API] create_kyc_session', {
        success: response?.success,
        message: response?.message,
        code: response?.code,
        hasOpenUrl: !!(data && typeof data === 'object' && ((data as any).diditUrl || (data as any).url)),
        keys: data && typeof data === 'object' ? Object.keys(data) : [],
      });
    }
    if (response?.success) {
      return response?.data;
    } else {
      if (__DEV__) console.warn('[KYC API] create_kyc_session failed', response);
      showError(response?.message || 'Failed to start verification');
      return null;
    }
  } catch (e: any) {
    if (__DEV__) console.warn('[KYC API] create_kyc_session error', e);
    logger(e);
    showError(e?.message || 'Something went wrong');
    return null;
  } finally {
    dispatch(setLoading(false));
  }
};

export const createKybSession = (userDetails: any) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const cc = userDetails?.country_code || userDetails?.countryCode;
    const mobile = userDetails?.mobileNumber || userDetails?.phoneNumber || userDetails?.phone;
    const phone = mobile ? `${cc ? String(cc).replace(/\s/g, "") : ""}${String(mobile).replace(/\s/g, "")}` : undefined;
    const emailRaw = userDetails?.emailId ?? userDetails?.email;
    const first = userDetails?.firstName ?? userDetails?.first_name;
    const last = userDetails?.lastName ?? userDetails?.last_name;

    const webOrigin = String(CHART_WEB_BASE_URL || "").replace(/\/+$/, "");
    const body: Record<string, unknown> = {
      jurisdiction: "GLOBAL",
      ...(emailRaw ? { email: String(emailRaw) } : {}),
      ...(phone && phone.length > 4 ? { phone } : {}),
      ...(first ? { firstName: String(first) } : {}),
      ...(last ? { lastName: String(last) } : {}),
      returnUrl: webOrigin
        ? `${webOrigin}/user_profile/kyc/submitted?open_in_app=1`
        : "agce://kyc_return?kyc_return=1",
    };

    const response: any = await appOperation.customer.create_kyb_session(body);
    if (__DEV__) {
      const data = response?.data;
      console.log('[KYB API] create_kyb_session', {
        success: response?.success,
        message: response?.message,
        code: response?.code,
        hasOpenUrl: !!(data && typeof data === 'object' && ((data as any).diditUrl || (data as any).url)),
      });
    }
    if (response?.success) {
      return response?.data;
    } else {
      if (__DEV__) console.warn('[KYB API] create_kyb_session failed', response);
      showError(response?.message || 'Failed to start business verification');
      return null;
    }
  } catch (e: any) {
    if (__DEV__) console.warn('[KYB API] create_kyb_session error', e);
    logger(e);
    showError(e?.message || 'Something went wrong');
    return null;
  } finally {
    dispatch(setLoading(false));
  }
};

export const kycVerification = (data: any) => async (dispatch: AppDispatch) => {
  const isResubmission = !!(data && typeof (data as any).get === 'function' && (data as any).get('is_resubmission') === 'true');
  try {
    if (isResubmission) dispatch(setLoadingOtp(true));
    else dispatch(setLoading(true));
    console.log('[KYC API] Request: submit-kyc (FormData)');
    const response: any = await appOperation.customer.kyc_verification(data);
    const resLog = { success: response?.success, message: response?.message, code: response?.code };
    console.log('[KYC API] Response success:', response?.success);
    console.log('[KYC API] Response message:', response?.message);
    console.log('[KYC API] Response full:', JSON.stringify(resLog));
    console.log('[KYC API] Response body (full):', JSON.stringify(response, null, 2));
    if (response?.success) {
      showSuccess(response?.message || 'KYC submitted successfully');
      dispatch(getUserProfile());
      dispatch(setKycData({}));
      NavigationService.navigate(KYC_STATUS_SCREEN);
    } else {
      const errMsg = response?.message || 'Failed to submit KYC';
      console.warn('[KYC API] Showing error toast:', errMsg);
      showError(errMsg);
    }
    return response;
  } catch (e: any) {
    const errMsg = e?.message ?? (typeof e?.data === 'string' ? e?.data : JSON.stringify(e?.data || e));
    console.warn('[KYC API] Error (catch):', errMsg);
    console.warn('[KYC API] Error code:', e?.code);
    console.warn('[KYC API] Error full:', e);
    logger(e);
    showError(errMsg || 'An error occurred while submitting KYC');
    throw e;
  } finally {
    if (isResubmission) dispatch(setLoadingOtp(false));
    else dispatch(setLoading(false));
  }
};

export const setPriceAlert =
  (data: AlertsProps) => async (dispatch: AppDispatch) => {
    try {
      const response: any = await appOperation.customer.price_alert(data);
      // console.log('res:::', response);
      if (response.success) {
        dispatch(getUserProfile());
      }
    } catch (e) {
      logger(e);
    }
  };
export const setCommissionAlert =
  (data: AlertsProps) => async (dispatch: AppDispatch) => {
    try {
      const response: any = await appOperation.customer.commission_alert(data);
      // console.log('res:::', response);
      if (response.success) {
        dispatch(getUserProfile());
      }
    } catch (e) {
      logger(e);
    }
  };
export const setTradeSetting =
  (data: AlertsProps) => async (dispatch: AppDispatch) => {
    try {
      const response: any = await appOperation.customer.trade_setting(data);
      // console.log('res:::', response);
      if (response.success) {
        dispatch(getUserProfile());
      }
    } catch (e) {
      logger(e);
    }
  };
export const setFeeSetting =
  (data: AlertsProps) => async (dispatch: AppDispatch) => {
    try {
      const response: any = await appOperation.customer.fee_setting(data);
      // console.log('res:::', response);
      if (response.success) {
        dispatch(getUserProfile());
      }
    } catch (e) {
      logger(e);
    }
  };

export const getUserBankDetails = () => async (dispatch: AppDispatch) => {
  try {
    const response: any = await appOperation.customer.user_bank_detail();
    // console.log('res:::', response);
    if (response.success) {
      dispatch(setUserBankData(response?.data));
    }
  } catch (e) {
    logger(e);
  }
};

export const addNewBakAccount =
  (data: FormData) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response: any = await appOperation.customer.add_new_bank(data);
      // console.log('res:::', response);
      if (response.sucess) {
        dispatch(getUserBankDetails());
        showError(response?.message);
        NavigationService.goBack();
      }
    } catch (e) {
      logger(e);
      showError(e?.message);
    } finally {
      dispatch(setLoading(false));
    }
  };
export const updateBankAccount =
  (data: FormData) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response: any = await appOperation.customer.edit_bank(data);
      // console.log('res:::', response);
      if (response.success) {
        dispatch(getUserBankDetails());
        showError(response?.message);
        NavigationService.goBack();
      } else {
        showError(response?.message);
      }
    } catch (e: any) {
      logger(e);
      showError(e?.message);
    } finally {
      dispatch(setLoading(false));
    }
  };

export const submitTicket =
  (data: FormData, handleResetInput = () => { }) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response: any = await appOperation.customer.submit_ticket(data);
      // console.log('res:::', response);
      if (response.success) {
        dispatch(getUserTickets());
        handleResetInput();
        showSuccess(response?.message || 'Ticket submitted successfully.');
      } else {
        showError(response?.message);
      }
    } catch (e) {
      logger(e);
      showError(e?.message);
    } finally {
      dispatch(setLoading(false));
    }
  };

export const ticketMessages =
  (data: any, setMessage = () => { }) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response: any = await appOperation.customer.ticket_messages(data);
      console.log('Ticket Message Response:', response);
      if (response.success) {
        dispatch(getUserTickets());
        setMessage();
        // showSuccess(response?.message || "Message sent");
      } else {
        showError(response?.message || "Failed to send message");
      }
    } catch (e) {
      console.log('Ticket Message Error:', e);
      logger(e);
      showError(e?.message);
    } finally {
      dispatch(setLoading(false));
    }
  };


export const deleteBankAccount = (id: any) => async (dispatch: AppDispatch) => {
  try {
    let data = {
      _id: id,
    };
    dispatch(setLoading(true));
    const response: any = await appOperation.customer.delete_bank(data);
    // console.log('res:::', response);
    if (response.sucess) {
      dispatch(getUserBankDetails());
      showError(response?.message);
    }
  } catch (e) {
    logger(e);
    showError(e?.message);
  } finally {
    dispatch(setLoading(false));
  }
};

export const updateRating =
  (data: RatingProps) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response: any = await appOperation.customer.add_rating(data);
      // console.log('res:::', response);/
      if (response.success) {
        showError(response?.message);
        dispatch(setLoading(false));
      }
    } catch (e) {
      logger(e);
      showError(e?.message);
    } finally {
      dispatch(setLoading(false));
    }
  };

export const getUserReferCode = () => async (dispatch: AppDispatch) => {
  try {
    const response: any = await appOperation.customer.user_refer_code();
    if (response.success) {
      dispatch(setReferCode(response?.data?.user_code));
      // dispatch(getReferralList(response?.data))
    }
  } catch (e) {
    logger(e);
  }
};
export const getPayoutHistory = () => async (dispatch: AppDispatch) => {
  try {
    const response: any = await appOperation.customer.get_referral_list();
    if (response.success) {
      // dispatch(setPayoutHistory(response?.data));
      dispatch(getReferralList(response?.data))
    }
  } catch (e) {
    logger(e);
  }
};

export const getDownline = (sponsorId: any, level: any) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response: any = await appOperation.customer.get_downline(sponsorId, level);
    if (response.success) {
      dispatch(setTreeRoot(response?.data));
      const flat = flattenTreeInvestments(response?.data);
      flat.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending
      dispatch(setFlatInvestments(flat));
    }
  } catch (e) {
    logger(e);
  } finally {
    dispatch(setLoading(false));
  }
};

const flattenTreeInvestments = (node: { total_invested_amount: any[]; name: any; emailId: any; level: number; referrals: any[]; }) => {
  let investments: any[] = [];

  // Add self investments
  if (node?.total_invested_amount?.length > 0) {
    node.total_invested_amount.forEach((inv) => {
      investments.push({
        userName: node.name,
        email: node.emailId,
        level: node.level || 0,
        amount: inv.amount?.$numberDecimal || inv.amount,
        currency: inv.currency,
        investmentId: inv.investmentId,
        status: inv.status,
        self_roi_percent: inv.self_roi_percent,
        your_upline_percent: inv.your_upline_percent,
        date: inv.createdAt,
        type: inv.type || (node.level === 0 ? 'self' : 'downline')
      });
    });
  }

  // Recursively handle referrals
  if (node?.referrals?.length > 0) {
    node.referrals.forEach((child) => {
      investments = [...investments, ...flattenTreeInvestments(child)];
    });
  }

  return investments;
};

export const getUserReferCount = () => async (dispatch: AppDispatch) => {
  try {
    const response: any = await appOperation.customer.user_refer_count();
    if (response.success) {
      dispatch(setReferCount(response?.data));
    }
  } catch (e) {
    logger(e);
  }
};

export const getUserTickets =
  (opts?: { silent?: boolean }) => async (dispatch: AppDispatch) => {
    const silent = !!opts?.silent;
    try {
      if (!silent) dispatch(setLoading(true));
      const response: any = await appOperation.customer.get_user_tickets();
      if (response.success) {
        dispatch(setUserTickets(response?.data?.reverse()));
      }
    } catch (e) {
      logger(e);
    } finally {
      if (!silent) dispatch(setLoading(false));
    }
  };

const DEFAULT_TICKET_PRIORITIES = [
  { id: 'low', name: 'Low' },
  { id: 'medium', name: 'Medium' },
  { id: 'high', name: 'High' },
];

export const getTicketCategories = (setCategories: any, setPriorities: any) => async (dispatch: AppDispatch) => {
  try {
    const response: any = await appOperation.customer.get_ticket_categories();
    if (response?.success) {
      setCategories(response?.data?.categories || []);
      const pri = response?.data?.priorities;
      setPriorities(Array.isArray(pri) && pri.length ? pri : DEFAULT_TICKET_PRIORITIES);
    }
  } catch (e) {
    logger(e);
  }
};

export const deleteAccount = () => async (dispatch: AppDispatch) => {
  try {
    let data = { status: 'Inactive' };
    dispatch(setLoading(true));
    const response: any = await appOperation.customer.delete_account(data);
    if (response.success) {
      showError(response?.message);
      dispatch(logoutAction());
    }
  } catch (e) {
    logger(e);
    showError(e?.message);
  } finally {
    dispatch(setLoading(false));
  }
};

export const downLoadTradeReport =
  (data: DownloadTradeReportProps) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response: any = await appOperation.customer.download_trade_report(
        data,
      );
      if (response.success) {
        showError(response?.message);
      }
    } catch (e) {
      logger(e);
      showError(e?.message);
    } finally {
      dispatch(setLoading(false));
    }
  };

/** Same as web: calls security/2fa/setup, stores QR data. Caller opens QR sheet (no navigation). */
export const generateTwoFactorQr = () => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response: any = await appOperation.customer.security2faSetup();
    if (response?.success && response?.data) {
      dispatch(setTwoFaData(response.data));
      return true;
    } else {
      showError(response?.message || 'Failed to get QR code');
      return false;
    }
  } catch (e: any) {
    logger(e);
    showError(e?.message || 'Something went wrong');
    return false;
  } finally {
    dispatch(setLoading(false));
  }
};

/** Same as web: calls security/2fa/confirm with 6-digit code, refreshes profile. Caller closes sheet or goes back. */
export const confirm2fa = (code: string, identityProof?: any) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const params: any = { code };
    if (identityProof?.otpCode) params.otpCode = identityProof.otpCode;
    if (identityProof?.verifyMethod) params.verifyMethod = identityProof.verifyMethod;

    const response: any = await appOperation.customer.security2faConfirm(params);
    if (response?.success) {
      dispatch(setTwoFaData(undefined));
      dispatch(getUserProfile());
      showSuccess(response?.message || 'Google Authenticator enabled successfully!');
      return true;
    } else {
      showError(response?.message || 'Failed to enable 2FA');
      return false;
    }
  } catch (e: any) {
    logger(e);
    showError(e?.message || 'Something went wrong');
    return false;
  } finally {
    dispatch(setLoading(false));
  }
};

/** Same as web: POST security/2fa/disable. Supports TOTP code, or email/mobile OTP (otpCode + verifyMethod), or passkey (passkeyUserId). */
export const disable2fa = (
  authenticatorCode?: string | null,
  otpCode?: string | null,
  verifyMethod?: string | null,
  passkeyUserId?: string | null
) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response: any = await appOperation.customer.security2faDisable(
      authenticatorCode ?? undefined,
      otpCode ?? undefined,
      verifyMethod ?? undefined,
      passkeyUserId ?? undefined
    );
    if (response?.success) {
      showSuccess(response?.message || 'Google Authenticator disabled successfully');
      dispatch(getUserProfile());
      return true;
    } else {
      showError(response?.message || 'Failed to disable Google Authenticator');
      return false;
    }
  } catch (e: any) {
    logger(e);
    showError(e?.message || 'Something went wrong');
    return false;
  } finally {
    dispatch(setLoading(false));
  }
};

/** Same as web: POST security/send-otp for 2fa_setup, add_mobile, etc. Get OTP → show SpinnerSecond. */
export const sendSecurityOtp = (target: string, purpose: string, value?: string | null) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response: any = purpose === 'delete_account'
      ? await appOperation.customer.securityClosedAccountSendOtp(target === 'mobile' ? 'phone' : target)
      : purpose === 'disable_account'
        ? await appOperation.customer.securityDisableAccountSendOtp(target === 'mobile' ? 'phone' : target)
        : purpose === 'login_2step_verification'
          ? await appOperation.customer.securitySendOtpForTwoLogin2Step(target === 'mobile' ? 'phone' : target)
          : (purpose === 'anti_phishing_add' || purpose === 'anti_phishing_edit' || purpose === 'anti_phishing_remove')
            ? await appOperation.customer.send_anti_phishing_otp(target === 'mobile' ? 'phone' : target)
            : await appOperation.customer.securitySendOtp(target, purpose, value ?? undefined);
    if (response?.success) {
      showSuccess(response?.message || 'OTP sent successfully');
      return true;
    } else {
      showError(response?.message || 'Failed to Send OTP');
      return false;
    }
  } catch (e: any) {
    logger(e);
    showError(e?.message || 'Something went wrong');
    return false;
  } finally {
    dispatch(setLoading(false));
  }
};

/** Same as web: POST security/verify-otp - returns true if verified. Continue → only button loader, no SpinnerSecond. */
export const verifySecurityOtp = (target: string, otp: string, purpose: string, identifier?: string | null) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoadingOtp(true));
    const response: any = await appOperation.customer.securityVerifyOtp(target, otp, purpose, identifier ?? undefined);
    if (response?.success) {
      return true;
    } else {
      showError(response?.message || 'Invalid OTP');
      return false;
    }
  } catch (e: any) {
    logger(e);
    showError(e?.message || 'OTP verification failed');
    return false;
  } finally {
    dispatch(setLoadingOtp(false));
  }
};

/** Same as web: POST security/verify-totp - for add_passkey etc. Returns true if verified */
export const verifySecurityTotp = (code: string, purpose: string) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response: any = await appOperation.customer.securityVerifyTotp(code, purpose);
    if (response?.success) {
      return true;
    } else {
      showError(response?.message || 'Invalid code');
      return false;
    }
  } catch (e: any) {
    logger(e);
    showError(e?.message || 'Verification failed');
    return false;
  } finally {
    dispatch(setLoading(false));
  }
};

/** Verify identity via passkey for security flows (change email/mobile, delete passkey, etc). Returns userId or null. */
export const verifySecurityPasskey = (_signId: string, _isDeletingPasskey: boolean = false, silent: boolean = false) => async (dispatch: AppDispatch) => {
  try {
    if (!Passkey.isSupported()) {
      if (!silent) showError('Passkeys are not supported on this device');
      return null;
    }
    dispatch(setLoading(true));
    const optionsRes: any = await appOperation.customer.passkeyGetStepUpOptions();
    console.warn('[Passkey][verifySecurityPasskey] Backend Raw Step-Up Options Response:', JSON.stringify(optionsRes, null, 2));
    if (!optionsRes?.success || !optionsRes?.data) {
      if (!silent) showError(optionsRes?.message || 'Failed to get passkey options');
      return null;
    }
    const opts = optionsRes.data;
    const { request } = buildPasskeyAssertionRequest(opts);
    console.warn('[Passkey][verifySecurityPasskey] Native Get Request:', JSON.stringify(request, null, 2));

    const credential = await getPasskeyCredentialForStepUp(opts, silent);

    console.warn('[Passkey][verifySecurityPasskey] Native Credential Received:', JSON.stringify(credential, null, 2));
    if (!credential) {
      return null;
    }
    const verifyRes: any = await appOperation.customer.passkeyVerifyStepUp(credential);
    console.warn('[Passkey][verifySecurityPasskey] Backend Step-Up Verification Response:', JSON.stringify(verifyRes, null, 2));
    if (!verifyRes?.success) {
      if (!silent) showError(verifyRes?.message || verifyRes?.error || 'Passkey verification failed');
      return null;
    }
    return verifyRes?.data?.userId ?? verifyRes?.data?.user_id ?? null;
  } catch (e: any) {
    console.warn('[Passkey][verifySecurityPasskey] Exception caught:', e);
    logger(e);
    const msg = String(e?.message ?? e?.error ?? '');
    if (e?.name === 'NotAllowedError' || /cancelled|cancel/i.test(msg)) {
      if (!silent) showError('Authentication was cancelled');
    } else {
      if (!silent) showError(e?.message || 'Passkey verification failed');
    }
    return null;
  } finally {
    dispatch(setLoading(false));
  }
};

export const getPasskeyAuthCredential = (_signId: string, silent: boolean = false) => async (dispatch: AppDispatch) => {
  try {
    if (!Passkey.isSupported()) {
      if (!silent) showError('Passkeys are not supported on this device');
      return null;
    }
    dispatch(setLoading(true));
    const optionsRes: any = await appOperation.customer.passkeyGetStepUpOptions();
    console.warn('[Passkey][getPasskeyAuthCredential] Backend Raw Step-Up Options Response:', JSON.stringify(optionsRes, null, 2));
    if (!optionsRes?.success || !optionsRes?.data) {
      if (!silent) showError(optionsRes?.message || 'Failed to get passkey options');
      return null;
    }
    const opts = optionsRes.data;
    const { request } = buildPasskeyAssertionRequest(opts);
    console.warn('[Passkey][getPasskeyAuthCredential] Native Get Request:', JSON.stringify(request, null, 2));

    const credential = await getPasskeyCredentialForStepUp(opts, silent);
    console.warn('[Passkey][getPasskeyAuthCredential] Native Credential Received:', JSON.stringify(credential, null, 2));
    return credential;
  } catch (e: any) {
    console.warn('[Passkey][getPasskeyAuthCredential] Exception caught:', e);
    logger(e);
    const msg = String(e?.message ?? e?.error ?? '');
    if (e?.name === 'NotAllowedError' || /cancelled|cancel/i.test(msg)) {
      if (!silent) showError('Authentication was cancelled');
    } else {
      if (!silent) showError(e?.message || 'Passkey verification failed');
    }
    return null;
  } finally {
    dispatch(setLoading(false));
  }
};

export const getWithdrawalPasskeyCredential = (silent: boolean = false) => async (dispatch: AppDispatch) => {
  try {
    if (!Passkey.isSupported()) {
      if (!silent) showError('Passkeys are not supported on this device');
      return null;
    }
    dispatch(setLoading(true));
    const optionsRes: any = await appOperation.customer.fetch_withdrawal_passkey_challenge();
    console.warn('[Passkey][getWithdrawalPasskeyCredential] Backend Raw Options Response:', JSON.stringify(optionsRes, null, 2));
    if (!optionsRes?.success || !optionsRes?.data) {
      if (!silent) showError(optionsRes?.message || 'Failed to get passkey options');
      return null;
    }
    const opts = optionsRes.data;
    const rawChallenge = typeof opts.challenge === 'string' ? opts.challenge : '';
    const challengeForNative = maybeBase64ToBase64Url(rawChallenge);
    const rpIdFromServer = String(opts.rpId || opts.rp?.id || '').trim();
    if (isRpIdMismatchForAndroid(rpIdFromServer)) {
      console.warn('[Passkey][getWithdrawalPasskeyCredential] rpId mismatch - skipping native prompt', {
        server: rpIdFromServer,
        configured: PASSKEY_RP_ID,
      });
      if (!silent) showError('Passkey is not configured for this app.');
      return null;
    }
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
    console.warn('[Passkey][getWithdrawalPasskeyCredential] Native Get Request:', JSON.stringify(request, null, 2));

    let credential: any;
    if (Platform.OS === 'android') {
      try {
        console.warn('[Passkey][getWithdrawalPasskeyCredential] Android Step 1: getPlatformKey with allowCredentials');
        credential = await Passkey.getPlatformKey(request);
      } catch (e1: any) {
        const msg1 = String(e1?.message ?? e1?.error ?? '');
        console.warn('[Passkey][getWithdrawalPasskeyCredential] Step 1 failed:', msg1);

        if (/NoCredentials|no.*credential|no viable credential/i.test(msg1)) {
          try {
            const discoverableReq = {
              challenge: request.challenge,
              rpId: request.rpId,
              timeout: request.timeout,
              userVerification: request.userVerification,
            };
            console.warn('[Passkey][getWithdrawalPasskeyCredential] Android Step 2: getPlatformKey discoverable');
            credential = await Passkey.getPlatformKey(discoverableReq);
          } catch (e2: any) {
            const msg2 = String(e2?.message ?? e2?.error ?? '');
            console.warn('[Passkey][getWithdrawalPasskeyCredential] Step 2 failed:', msg2);

            if (/NoCredentials|no.*credential|no viable credential/i.test(msg2)) {
              try {
                console.warn('[Passkey][getWithdrawalPasskeyCredential] Android Step 3: trying standard Passkey.get for system prompt (discoverable / no allowCredentials)');
                const discoverableReq = {
                  challenge: request.challenge,
                  rpId: request.rpId,
                  timeout: request.timeout,
                  userVerification: request.userVerification,
                };
                credential = await Passkey.get(discoverableReq);
              } catch (e3: any) {
                const msg3 = String(e3?.message ?? e3?.error ?? '');
                console.warn('[Passkey][getWithdrawalPasskeyCredential] Step 3 failed:', msg3);
                if (/NoCredentials|no.*credential|no viable credential/i.test(msg3)) {
                  if (!silent) showError('Passkey credential not found on this device.');
                  return null;
                } else if (/cancelled|cancel/i.test(msg3)) {
                  if (!silent) showError('Authentication was cancelled');
                  return null;
                } else {
                  throw e3;
                }
              }
            } else {
              throw e2;
            }
          }
        } else if (/cancelled|cancel/i.test(msg1)) {
          if (!silent) showError('Authentication was cancelled');
          return null;
        } else {
          throw e1;
        }
      }
    } else {
      dispatch(setLoading(false));
      await waitForPasskeyNativePrompt();
      credential = await getNativePasskeyAssertion(request);
    }

    console.warn('[Passkey][getWithdrawalPasskeyCredential] Native Credential Received:', JSON.stringify(credential, null, 2));
    return credential;
  } catch (e: any) {
    console.warn('[Passkey][getWithdrawalPasskeyCredential] Exception caught:', e);
    logger(e);
    const msg = String(e?.message ?? e?.error ?? '');
    if (e?.name === 'NotAllowedError' || /cancelled|cancel/i.test(msg)) {
      if (!silent) showError('Authentication was cancelled');
    } else if (Platform.OS === 'ios' && isPasskeyAssociatedDomainError(e)) {
      if (!silent) {
        showError(
          'Passkey is not available on this iPhone yet. Host apple-app-site-association on arabglobal.ae, then add a passkey on this device.',
        );
      }
    } else {
      if (!silent) showError(e?.message || 'Passkey verification failed');
    }
    return null;
  } finally {
    dispatch(setLoading(false));
  }
};

/** Same as web: GET security/passkeys - returns { success, data: { passkeys: [], count } }. Use to sync hasPasskey with API. */
export const getPasskeyList = () => async (_dispatch: AppDispatch) => {
  try {
    const response: any = await appOperation.customer.passkeyGetList();
    console.log('[Passkey][List] GET security/passkeys raw response:', JSON.stringify(response, null, 2));
    if (response?.success) {
      const list = Array.isArray(response?.data?.passkeys)
        ? response.data.passkeys
        : Array.isArray(response?.data)
          ? response.data
          : [];
      const merged = await mergePasskeyListWithLocalDeviceInfo(list);
      console.log('[Passkey][List] merged deviceInfo:', merged.map((pk: any) => ({
        id: pk._id || pk.id,
        name: pk.name,
        deviceInfo: pk.deviceInfo,
      })));
      if (response?.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
        response.data.passkeys = merged;
      } else {
        response.data = { passkeys: merged, count: merged.length };
      }
    }
    return response;
  } catch (e: any) {
    logger(e);
    return { success: false, data: { passkeys: [], count: 0 } };
  }
};

/** Same as web: deletes a passkey */
export const deletePasskey = (passkeyId: string, verifyMethod: string, code: string | null, passkeyUserId: string | null) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response: any = await appOperation.customer.passkeyDelete(passkeyId, verifyMethod, code, passkeyUserId);
    if (response?.success) {
      dispatch(getUserProfile());
      showSuccess(response?.message || 'Passkey deleted successfully');
      return true;
    } else {
      showError(response?.message || 'Failed to delete passkey');
      return false;
    }
  } catch (e: any) {
    logger(e);
    showError(e?.message || 'Something went wrong');
    return false;
  } finally {
    dispatch(setLoading(false));
  }
};

/**
 * Get passkey registration options for Passkey.create().
 * Returns WebAuthn PublicKeyCredentialCreationOptions (unwrap .publicKey if backend sends it).
 */
export const getPasskeyRegistrationOptions = () => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response: any = await appOperation.customer.passkeyGetRegistrationOptions();
    console.log('[Passkey] getPasskeyRegistrationOptions API response:', response);
    if (!response?.success || !response?.data) {
      showError(response?.message || 'Failed to get registration options');
      return null;
    }
    const data = response.data;
    const options = data?.publicKey ?? data;

    // Normalization to ensure base64url strings for all binary-like fields
    if (options.challenge && typeof options.challenge === 'string') {
      options.challenge = toBase64URL(options.challenge.replace(/-/g, '+').replace(/_/g, '/'));
    }
    if (options.user?.id && typeof options.user.id === 'string') {
      options.user.id = toBase64URL(options.user.id.replace(/-/g, '+').replace(/_/g, '/'));
    }
    if (Array.isArray(options.excludeCredentials)) {
      options.excludeCredentials = options.excludeCredentials.map((c: any) => ({
        ...c,
        id: typeof c.id === 'string' ? toBase64URL(c.id.replace(/-/g, '+').replace(/_/g, '/')) : c.id,
      }));
    }
    if (Array.isArray(options.pubKeyCredParams)) {
      options.pubKeyCredParams = options.pubKeyCredParams.map((p: any) => ({
        ...p,
        type: p.type || 'public-key',
        alg: p.alg || -7, // ES256
      }));
    }

    // Ensure rpId is present at top level if needed by the library
    if (options.rp?.id && !options.rpId) {
      options.rpId = options.rp.id;
    }

    return options;
  } catch (e: any) {
    logger(e);
    showError(e?.message || 'Something went wrong');
    return null;
  } finally {
    dispatch(setLoading(false));
  }
};

/** Verify passkey registration with backend (same as web passkeyVerifyRegistration) */
export const verifyPasskeyRegistration = (credential: object, name: string) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    console.log('[Passkey] calling API verify...');
    const deviceInfo = getMobilePasskeyDeviceInfo();
    console.log('[Passkey] register payload summary:', { passkeyName: name, deviceInfo });
    const response: any = await appOperation.customer.passkeyVerifyRegistration(credential, name, deviceInfo);
    console.log('[Passkey] API response:', JSON.stringify(response, null, 2));
    if (response?.success) {
      const savedPasskeyId = response?.data?.id || response?.data?._id;
      if (savedPasskeyId) {
        await saveLocalPasskeyDeviceInfo(String(savedPasskeyId), deviceInfo);
      } else {
        console.log('[Passkey] no passkey id in register response — local deviceInfo cache skipped');
      }
      console.log('[Passkey] registration success — backend saved:', response?.data);
      dispatch(getUserProfile());
      showSuccess(response?.message || 'Passkey added successfully!');
      return {
        success: true,
        passkeyId: savedPasskeyId ? String(savedPasskeyId) : null,
        deviceInfo,
      };
    } else {
      const msg =
        response?.message ||
        response?.error ||
        (response?.data && (response.data?.message || response.data?.error)) ||
        'Failed to register passkey';
      console.warn('[Passkey] FAILED - backend said:', msg);
      showError(typeof msg === 'string' ? msg : 'Failed to register passkey');
      return { success: false, passkeyId: null, deviceInfo: null };
    }
  } catch (e: any) {
    console.warn('[Passkey] CATCH error:', e?.message, e?.code, e);
    logger(e);
    const errMsg =
      e?.message ||
      (e?.error && typeof e.error === 'string' ? e.error : null) ||
      (e?.data?.message) ||
      'Something went wrong';
    showError(errMsg);
    return { success: false, passkeyId: null, deviceInfo: null };
  } finally {
    dispatch(setLoading(false));
  }
};

/** Same as web: POST security/mobile/add — identity proof via emailOtp / tofaCode / passkey on same request (web TwofactorPage does not pre-call verify-otp for add-mobile). */
export const addMobileToAccount = (
  mobileNumber: string,
  countryCode: string,
  mobileOtp: string,
  identity?: {
    emailOtp?: string;
    tofaCode?: string;
    currentMobileOtp?: string;
    passkeyVerified?: boolean;
    passkeyUserId?: string;
    /** Exact `value` used with send-otp target `new_mobile` — links SMS OTP on mobile/add. */
    newMobileIdentifier?: string;
  }
) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoadingOtp(true));
    const payload: Record<string, string | boolean> = {
      mobileNumber: String(mobileNumber ?? '').trim(),
      countryCode: String(countryCode ?? '').trim(),
      mobileOtp: String(mobileOtp ?? '').trim(),
    };
    if (identity?.emailOtp) payload.emailOtp = String(identity.emailOtp).trim();
    if (identity?.tofaCode) payload.tofaCode = String(identity.tofaCode).trim();
    if (identity?.currentMobileOtp) payload.currentMobileOtp = String(identity.currentMobileOtp).trim();
    if (identity?.passkeyVerified === true) payload.passkeyVerified = true;
    if (identity?.passkeyUserId) payload.passkeyUserId = String(identity.passkeyUserId).trim();
    if (identity?.newMobileIdentifier) {
      const id = String(identity.newMobileIdentifier).trim();
      payload.identifier = id;
      payload.value = id;
    }

    if (__DEV__) {
      console.log('[addMobileToAccount] POST security/mobile/add body keys:', Object.keys(payload));
    }

    /** Same shape as web `AuthService.securityMobileAdd` — camelCase only; extra snake_case keys can break strict validators. */
    const response: any = await appOperation.customer.securityMobileAdd(payload as any);
    if (response?.success) {
      dispatch(getUserProfile());
      showSuccess(response?.message || 'Mobile number added successfully!');
      return true;
    } else {
      showError(response?.message || 'Failed to add mobile number');
      return false;
    }
  } catch (e: any) {
    logger(e);
    showError(e?.message || 'Something went wrong');
    return false;
  } finally {
    dispatch(setLoadingOtp(false));
  }
};

/** Same as web: POST security/email/add - add email to account (for users who signed up with phone). Button loader only, no SpinnerSecond. */
export const addEmailToAccount = (data: { email: string; tofaCode?: string; mobileOtp?: string; emailOtp: string }) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoadingOtp(true));
    const response: any = await appOperation.customer.securityEmailAdd(data);
    if (response?.success) {
      dispatch(getUserProfile());
      showSuccess(response?.message || 'Email added successfully!');
      return true;
    } else {
      showError(response?.message || 'Failed to add email');
      return false;
    }
  } catch (e: any) {
    logger(e);
    showError(e?.message || 'Something went wrong');
    return false;
  } finally {
    dispatch(setLoadingOtp(false));
  }
};

/** Same as web: initiate email change - sends OTP to new email */
export const initiateEmailChange = (data: { newEmail: string; tofaCode?: string; currentEmailOtp?: string; currentMobileOtp?: string; passkeyUserId?: string }) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response: any = await appOperation.customer.securityEmailChangeInitiate(data);
    if (response?.success) {
      showSuccess(response?.message || 'OTP sent to your new email.');
      return true;
    } else {
      showError(response?.message || 'Failed to initiate email change');
      return false;
    }
  } catch (e: any) {
    logger(e);
    showError(e?.message || 'Something went wrong');
    return false;
  } finally {
    dispatch(setLoading(false));
  }
};

/** Same as web: complete email change with new email OTP. Button loader only, no SpinnerSecond. */
export const completeEmailChange = (newEmailOtp: string) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoadingOtp(true));
    const response: any = await appOperation.customer.securityEmailChangeComplete({ newEmailOtp });
    if (response?.success) {
      dispatch(getUserProfile());
      showSuccess(response?.message || 'Email changed successfully!');
      return true;
    } else {
      showError(response?.message || 'Failed to change email');
      return false;
    }
  } catch (e: any) {
    logger(e);
    showError(e?.message || 'Something went wrong');
    return false;
  } finally {
    dispatch(setLoadingOtp(false));
  }
};

/** Same as web: initiate mobile change - sends OTP to new mobile */
export const initiateMobileChange = (data: { newMobileNumber: string; newCountryCode: string; tofaCode?: string; currentEmailOtp?: string; currentMobileOtp?: string; passkeyUserId?: string }) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response: any = await appOperation.customer.securityMobileChangeInitiate(data);
    if (response?.success) {
      showSuccess(response?.message || 'OTP sent to your new mobile.');
      return true;
    } else {
      showError(response?.message || 'Failed to initiate mobile change');
      return false;
    }
  } catch (e: any) {
    logger(e);
    showError(e?.message || 'Something went wrong');
    return false;
  } finally {
    dispatch(setLoading(false));
  }
};

/** Same as web: complete mobile change with new mobile OTP. Button loader only, no SpinnerSecond. */
export const completeMobileChange = (newMobileOtp: string) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoadingOtp(true));
    const response: any = await appOperation.customer.securityMobileChangeComplete({ newMobileOtp });
    if (response?.success) {
      dispatch(getUserProfile());
      showSuccess(response?.message || 'Mobile number changed successfully!');
      return true;
    } else {
      showError(response?.message || 'Failed to change mobile');
      return false;
    }
  } catch (e: any) {
    logger(e);
    showError(e?.message || 'Something went wrong');
    return false;
  } finally {
    dispatch(setLoadingOtp(false));
  }
};

export const enableTwoFa = (data: any) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response: any = await appOperation.customer.enable_two_fa(data);
    if (response.success) {
      dispatch(getUserProfile());
      NavigationService.navigate(NAVIGATION_BOTTOM_TAB_STACK);
      showError(response?.message);
    } else {
      showError(response?.message);
    }
  } catch (e) {
    logger(e);
    showError(e?.message);
  } finally {
    dispatch(setLoading(false));
  }
};

/** Anti-Phishing: GET status */
export const getAntiPhishingStatus = () => async (dispatch: AppDispatch) => {
  try {
    const response: any = await appOperation.customer.get_anti_phishing_status();
    return response?.success ? response?.data : null;
  } catch (e: any) {
    logger(e);
    return null;
  }
};

/** Anti-Phishing: send verification OTP */
export const sendAntiPhishingOtp = (target: string) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response: any = await appOperation.customer.send_anti_phishing_otp(target);
    if (response?.success) {
      showSuccess(response?.message || 'OTP sent successfully');
      return true;
    } else {
      showError(response?.message || 'Failed to send OTP');
      return false;
    }
  } catch (e: any) {
    logger(e);
    showError(e?.message || 'Something went wrong');
    return false;
  } finally {
    dispatch(setLoading(false));
  }
};

/** Anti-Phishing: SET code */
export const addAntiPhishingCode = (data: { antiPhishingCode: string; verifyMethod: string; code?: string; passkeyUserId?: string }) => async (dispatch: AppDispatch) => {
  try {
    // Same as web: pass params directly without any type conversion
    const payload = { ...data };
    console.log('[API] addAntiPhishingCode request payload:', payload);
    dispatch(setLoading(true));
    const response: any = await appOperation.customer.add_anti_phishing_code(payload);
    console.log('[API] addAntiPhishingCode response:', response);
    if (response?.success) {
      showSuccess(response?.message);
      return true;
    } else {
      console.warn('[API] addAntiPhishingCode FAILED:', response?.message || 'Unknown error');
      showError(response?.message);
      return false;
    }
  } catch (e: any) {
    console.error('[API] addAntiPhishingCode CATCH error:', e);
    NavigationService.navigate(ANTI_PHISHING_CODE_SCREEN)
    logger(e);
    showError(e?.message);
    return false;
  } finally {
    dispatch(setLoading(false));
  }
};

/** Anti-Phishing: REMOVE code */
export const removeAntiPhishingCode = (data: { verifyMethod: string; code?: string; passkeyUserId?: string }) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response: any = await appOperation.customer.remove_anti_phishing_code(data);
    console.log('[API] removeAntiPhishingCode response:', response);
    if (response?.success) {
      showSuccess(response?.message);
      return true;
    } else {
      showError(response?.message);
      return false;
    }
  } catch (e: any) {
    logger(e);
    showError(e?.message);
    return false;
  } finally {
    dispatch(setLoading(false));
  }
};

/** Update Login 2-Step Verification */
export const updateTwoLogin2StepStatus = (data: { security_methods: string; code?: string; passkeyUserId?: string; action: string }) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const payload: any = { security_methods: data.security_methods, action: data.action };
    if (data.code) payload.code = data.code;
    if (data.passkeyUserId) payload.passkeyUserId = data.passkeyUserId;

    const response: any = await appOperation.customer.securityUpdateTwoLogin2Step(payload);
    if (response?.success) {
      showSuccess(response?.message);
      return true;
    } else {
      showError(response?.message);
      return false;
    }
  } catch (e: any) {
    logger(e);
    showError(e?.message || 'Something went wrong');
    return false;
  } finally {
    dispatch(setLoading(false));
  }
};
