/** Shared labels / keys for login lost-method recovery (same as web). */

export const RECOVERY_METHOD_TYPE = {
  EMAIL: 1,
  AUTHENTICATOR: 2,
  PHONE: 3,
};

export function normalizeRecoveryMethodKey(raw) {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (s === "totp" || s === "google" || s === "authenticator" || s === "app" || s === "ga") return "totp";
  if (s === "email" || s === "mail") return "email";
  if (s === "phone" || s === "mobile" || s === "sms") return "phone";
  return "";
}

export function normalizeRecoverableMethodKeys(raw) {
  if (!Array.isArray(raw)) return [];
  const keys = raw.map(normalizeRecoveryMethodKey).filter(Boolean);
  return [...new Set(keys)];
}

export function recoveryKeyToMethodType(key) {
  const k = normalizeRecoveryMethodKey(key);
  if (k === "email") return RECOVERY_METHOD_TYPE.EMAIL;
  if (k === "totp") return RECOVERY_METHOD_TYPE.AUTHENTICATOR;
  if (k === "phone") return RECOVERY_METHOD_TYPE.PHONE;
  return 0;
}

export function methodTypeToRecoveryKey(type) {
  const t = Number(type);
  if (t === RECOVERY_METHOD_TYPE.EMAIL) return "email";
  if (t === RECOVERY_METHOD_TYPE.AUTHENTICATOR) return "totp";
  if (t === RECOVERY_METHOD_TYPE.PHONE) return "phone";
  return "";
}

export function recoveryLostMethodTitle(key) {
  const k = normalizeRecoveryMethodKey(key);
  if (k === "totp") return "Google Authenticator";
  if (k === "email") return "Email OTP";
  if (k === "phone") return "Phone Number";
  return "this method";
}

export function recoveryRestrictionHours(raw) {
  const hours = Number(raw?.restrictionHours ?? raw?.restriction_hours ?? raw);
  return Number.isFinite(hours) && hours > 0 ? hours : 24;
}

export function isRecoveryVerifyComplete(result) {
  const data = result?.data && typeof result.data === "object" && !Array.isArray(result.data) ? result.data : {};
  if (data.verification_complete === true || data.verification_complete === "true") return true;
  if (data.token || data.access_token || data.disabled_method) return true;
  const remaining = normalizeRecoverableMethodKeys(data.remaining_methods);
  if (data.verification_complete === false) return remaining.length === 0;
  if (result?.success && Array.isArray(data.remaining_methods) && remaining.length === 0) return true;
  return false;
}

export function recoveryVerifyErrorMessage(result) {
  const code = String(result?.code || "");
  const raw = String(result?.message || "").trim();
  if (code === "METHOD_RECOVERY_INCOMPLETE" || /prove all remaining methods/i.test(raw) || /prove the remaining methods/i.test(raw)) {
    return "Could not finish removing this method. Please try the code again.";
  }
  return raw || "Invalid verification code. Please try again.";
}

export function isLoginChallengeExpired(code) {
  return code === "DEVICE_MISMATCH_CHALLENGE" || code === "CHALLENGE_INVALID" || code === "CHALLENGE_EXPIRED";
}

export const RECOVERY_METHOD_META = {
  totp: {
    title: "Google Authenticator",
    fallbackSub: "Use your authenticator app",
  },
  email: {
    title: "Email OTP",
    fallbackSub: "Receive a 6-digit code by email",
  },
  phone: {
    title: "Phone Number",
    fallbackSub: "Receive a 6-digit code by SMS",
  },
};
