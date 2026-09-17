import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_CDD_SCREEN = 'ONBOARDING_CDD_SCREEN';
export const KYC_AFTER_CDD_SCREEN = 'KYC_VERIFICATION_SCREEN'; // Using App's KYC screen

export function isCddCompleted(user: any) {
  if (!user || typeof user !== 'object') return false;
  if (user.cdd_completed === true) return true;
  return String(user.cdd_status || '').toUpperCase() === 'COMPLETED';
}

/** True when the API has told us CDD is required and not finished. Missing fields = do not lock (legacy profile). */
export function needsCddOnboarding(user: any, profileHydrated: boolean = true) {
  if (!profileHydrated || !user || typeof user !== 'object') return false;
  if (!Object.prototype.hasOwnProperty.call(user, 'cdd_completed') && !Object.prototype.hasOwnProperty.call(user, 'cdd_status')) {
    return false;
  }
  return !isCddCompleted(user);
}

const POST_SIGNUP_CDD_KEY = 'agce.post_signup_cdd';

// Store in memory for immediate synchronous reads, but backed by AsyncStorage
let isPostSignupCddFlag = false;

export async function markPostSignupCdd() {
  isPostSignupCddFlag = true;
  try {
    await AsyncStorage.setItem(POST_SIGNUP_CDD_KEY, '1');
  } catch {
    // ignore
  }
}

export function isPostSignupCdd() {
  return isPostSignupCddFlag;
}

export async function clearPostSignupCdd() {
  isPostSignupCddFlag = false;
  try {
    await AsyncStorage.removeItem(POST_SIGNUP_CDD_KEY);
  } catch {
    // ignore
  }
}

/** After signup (or unfinished CDD), lock the app to onboarding before KYC or dashboard. */
export function shouldForceCddOnboarding(user: any, profileHydrated: boolean = true) {
  if (isCddCompleted(user)) return false;
  if (isPostSignupCdd()) return true;
  return needsCddOnboarding(user, profileHydrated);
}

export function optionCodeKey(code: any) {
  if (code === true || code === 'true') return true;
  if (code === false || code === 'false') return false;
  if (typeof code === 'string') return code.trim().toLowerCase();
  return code;
}

export function codesEqual(a: any, b: any) {
  return optionCodeKey(a) === optionCodeKey(b);
}
