import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import FastImage from "react-native-fast-image";
import Toast from "react-native-simple-toast";
import Svg, { Path, Rect } from "react-native-svg";
import { useTheme } from "../../hooks/useTheme";
import { useAppSelector } from "../../store/hooks";
import { appOperation } from "../../appOperation";
import NavigationService from "../../navigation/NavigationService";
import {
  WITHDRAW_FIAT_HISTORY_SCREEN,
  DEPOSIT_FIAT_SCREEN,
  SECURITY_SCREEN,
  WALLET_WITHDRAW_SCREEN,
} from "../../navigation/routes";
import {
  back_ic,
  closeIcon,
  historyIcon,
  INFO,
  upIcon,
  downIcon,
} from "../../helper/ImageAssets";
import RBSheet from "react-native-raw-bottom-sheet";
import AnimatedBottomSheet from "../../common/AnimatedBottomSheet/AnimatedBottomSheet";
import {
  AppSafeAreaView,
  AppText,
  BOLD,
  SEMI_BOLD,
  MEDIUM,
  TWENTY_FOUR,
  EIGHTEEN,
  SIXTEEN,
  FIFTEEN,
  FOURTEEN,
  THIRTEEN,
  TWELVE,
  ELEVEN,
  TEN,
  TWENTY,
} from "../../shared";
import { colors } from "../../theme/colors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const FIAT_WITHDRAW_FAQ_DATA = [
  {
    title: "How do I withdraw Fiat (AED) to my bank?",
    content:
      "To withdraw AED, first add and verify your personal UAE bank account (IBAN). Once verified, enter the withdrawal amount, review the fee breakdown, complete security verification (OTP/2FA), and submit your request.",
  },
  {
    title: "Withdraw fiat — step by step",
    content:
      "• Add Bank Account — Enter your UAE IBAN and bank details.\n• Verify Bank Account — Confirm the email verification code sent to you.\n• Enter Amount — Specify the AED amount you wish to withdraw.\n• Security Verification — Complete 2FA / OTP verification.\n• Bank Processing — Funds are sent directly to your UAE bank account.",
  },
  {
    title: "Important withdrawal rules & limits",
    content:
      "• Same-name account — You can only withdraw to a bank account in your own KYC-verified name.\n• Whitelist cooldown — Newly added bank accounts may have a brief security cooldown.\n• Daily limits — Withdrawals must comply with your tier's daily and single transaction limits.",
  },
  {
    title: "My fiat withdrawal hasn't arrived — what should I do?",
    content:
      "• Check Status — Go to Withdrawal History to check if the transaction is Under review, Sent to bank, or Completed.\n• Bank settlement — UAE local transfers are usually processed within hours on business days; weekends or holidays may take longer.\n• Contact Support — If status is Completed but funds haven't reflected after 1 business day, contact support with your bank reference.",
  },
];

// Web SVG Vector Icons
const SecurityShieldIcon = ({ size = 20, color = colors.cyanTheme }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 12L11 14L15 10M20.618 5.984C17.4561 6.15192 14.3567 5.05861 12 2.944C9.64327 5.05861 6.5439 6.15192 3.382 5.984C3.12754 6.96911 2.99918 7.98255 3 9C3 14.591 6.824 19.29 12 20.622C17.176 19.29 21 14.592 21 9C21 7.958 20.867 6.948 20.618 5.984Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const InstantBoltIcon = ({ size = 20, color = colors.cyanTheme }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M13 10V3L4 14H11V21L20 10H13V10" fill={color} />
  </Svg>
);

const BankPillarsIcon = ({ size = 24, color = colors.cyanTheme }) => (
  <Svg width={size} height={size} viewBox="0 0 29 29" fill="none">
    <Path
      d="M8.55078 14.5527V17.5527M12.5508 14.5527V17.5527M16.5508 14.5527V17.5527M3.55078 21.5527H21.5508M3.55078 10.5527H21.5508M3.55078 7.55273L12.5508 3.55273L21.5508 7.55273M4.55078 10.5527H20.5508V21.5527H4.55078V10.5527Z"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const RatesGraphIcon = ({ size = 20, color = colors.cyanTheme }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 3V21H21M7 16L12 11L16 15L21 9"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const UaeFlagIcon = ({ width = 24, height = 16 }) => (
  <Svg width={width} height={height} viewBox="0 0 24 16" fill="none" style={{ borderRadius: 2, overflow: "hidden" }}>
    <Rect width="24" height="5.33" fill="#00732F" />
    <Rect y="5.33" width="24" height="5.33" fill="#FFFFFF" />
    <Rect y="10.66" width="24" height="5.34" fill="#000000" />
    <Rect width="6" height="16" fill="#FF0000" />
  </Svg>
);

const RadioCheckedIcon = ({ size = 18, color = colors.cyanTheme }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
      stroke={color}
      strokeWidth="2"
    />
    <Path
      d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z"
      fill={color}
    />
  </Svg>
);

const RadioUncheckedIcon = ({ size = 18, color = "#6B7280" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
      stroke={color}
      strokeWidth="2"
    />
  </Svg>
);

const HOW_STEPS = [
  {
    n: "1",
    title: "Add bank account",
    body: "Save the UAE IBAN where you want to receive AED. Only the masked account is shown after save.",
    IconComponent: BankPillarsIcon,
  },
  {
    n: "2",
    title: "Verify email",
    body: "Confirm the IBAN with the email OTP. Zand whitelist is created after a successful verify.",
    IconComponent: SecurityShieldIcon,
  },
  {
    n: "3",
    title: "Enter amount",
    body: "Withdraw from spot AED. Daily and per-transaction limits are shown before you confirm.",
    IconComponent: RatesGraphIcon,
  },
  {
    n: "4",
    title: "AED sent to bank",
    body: "Payouts go through Zand Bank domestic rails to your verified IBAN.",
    IconComponent: InstantBoltIcon,
  },
];

const RESEND_COOLDOWN_SEC = 60;
const VERIFY_CODE_LEN = 6;
const EMPTY_LIMITS = {
  dailyRemaining: null,
  dailyLimit: null,
  dailyUsed: null,
  monthlyRemaining: null,
  monthlyLimit: null,
  monthlyUsed: null,
  minPerTx: null,
  maxPerTx: null,
};

function sanitizeAedAmount(raw) {
  const cleaned = String(raw || "").replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  const intPart = cleaned.slice(0, firstDot) || "0";
  const frac = cleaned.slice(firstDot + 1).replace(/\./g, "").slice(0, 2);
  return frac.length ? `${intPart}.${frac}` : `${intPart}.`;
}

function normalizePersonName(raw) {
  return String(raw || "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function kycLegalName(vaAccount, userDetails) {
  const fromVa = String(vaAccount?.account_name || "").trim();
  if (fromVa) return fromVa;
  const first = String(userDetails?.firstName || userDetails?.first_name || "").trim();
  const last = String(userDetails?.lastName || userDetails?.last_name || "").trim();
  return `${first} ${last}`.trim();
}

function namesMatch(kycName, typed) {
  const a = normalizePersonName(kycName);
  const b = normalizePersonName(typed);
  return a.length >= 2 && a === b;
}

function formatAedAmount(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return String(val || "0.00");
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseLimitSide(bucket, root, prefix) {
  const src = bucket && typeof bucket === "object" ? bucket : {};
  const daily = src.daily || {};
  const monthly = src.monthly || {};
  return {
    dailyLimit: daily.limit ?? root.withdraw_daily_limit ?? null,
    dailyRemaining: daily.remaining ?? root.withdraw_daily_remaining ?? null,
    dailyUsed: daily.used ?? root.withdraw_daily_used ?? null,
    monthlyLimit: monthly.limit ?? root.withdraw_monthly_limit ?? null,
    monthlyRemaining: monthly.remaining ?? root.withdraw_monthly_remaining ?? null,
    monthlyUsed: monthly.used ?? root.withdraw_monthly_used ?? null,
    minPerTx: src.min_per_tx ?? src.min_amount ?? src.min ?? 10,
    maxPerTx: src.max_per_tx ?? src.max_amount ?? src.max ?? null,
  };
}

function beneficiaryIbanLabel(ben) {
  if (!ben) return "••••";
  if (ben.iban_masked) return ben.iban_masked;
  if (ben.iban_last4) return `•••• ${ben.iban_last4}`;
  return "••••";
}

export const FIAT_ERROR_COPY = {
  KYC_REQUIRED: "Complete identity verification before using fiat.",
  KYC_PROFILE_INCOMPLETE: "Your KYC profile is missing details required for a bank account.",
  USER_NOT_FOUND: "Account not found. Please sign in again.",
  VA_NOT_FOUND: "No virtual account yet.",
  VA_REQUIRED: "Create a virtual account before depositing.",
  FIAT_SERVICE_HELD: "Fiat is temporarily paused. New converts and withdrawals are unavailable.",
  ZAND_UNAVAILABLE: "Bank service is unavailable. Please try again later.",
  QUOTE_EXPIRED: "This quote expired. Request a new price.",
  QUOTE_UNAVAILABLE: "Live price is unavailable. Try again in a moment.",
  PRICE_MOVED: "The price moved. Request a new quote.",
  INVENTORY_LOW: "This buy cannot be filled right now. Your AED is unchanged.",
  FEE_WALLET_NOT_CONFIGURED: "Convert fees are not configured. Try again later.",
  INSUFFICIENT_BALANCE: "Not enough balance. Add funds or reduce the amount.",
  TREASURY_LOW: "Withdrawals are paused while liquidity is low.",
  CONVERT_ASSET_DISABLED: "This pair is not available.",
  AMOUNT_BELOW_MIN: "Amount is below the minimum.",
  AMOUNT_ABOVE_MAX: "Amount is above the maximum.",
  LIMIT_EXCEEDED: "This would exceed your limit.",
  BENEFICIARY_NOT_VERIFIED: "Verify the bank account before withdrawing.",
  BENEFICIARY_NOT_FOUND: "That bank account is no longer available.",
  BENEFICIARY_IN_USE: "This bank account cannot be removed while a withdrawal is in progress.",
  WHITELIST_NOT_VERIFIED: "Verify the bank account before withdrawing.",
  WHITELIST_NOT_FOUND: "That bank account is no longer available.",
  WHITELIST_IN_USE: "This bank account cannot be removed while a withdrawal is in progress.",
  INVALID_IBAN: "Enter a valid UAE IBAN.",
  DUPLICATE_BENEFICIARY: "This bank account is already saved.",
  DUPLICATE_WHITELIST: "This bank account is already saved.",
  OTP_INVALID: "That code is incorrect or has expired.",
  OTP_LOCKED: "Too many attempts. Remove the account and add it again.",
  OTP_CHANNEL_UNAVAILABLE: "A verified email is required to confirm a bank account.",
  PAYOUT_SOURCE_UNAVAILABLE: "Payouts are unavailable right now. Try again later.",
  RATE_LIMITED: "Please wait before requesting another code.",
  NO_VERIFICATION_METHOD: "Add a security method before withdrawing.",
  EMAIL_OTP_INVALID: "That email code is incorrect.",
  MOBILE_OTP_INVALID: "That SMS code is incorrect.",
  GOOGLE_AUTH_INVALID: "That authenticator code is incorrect.",
  FUND_PASSWORD_INVALID: "That fund password is incorrect.",
  OTP_EXPIRED: "That code expired. Request a new one.",
  OTP_NOT_FOUND: "Request a new verification code, then try again.",
  WITHDRAWAL_NOT_FOUND: "Withdrawal not found.",
  INVALID_STATE: "This withdrawal can no longer be cancelled.",
  INTENT_NOT_FOUND: "Deposit instructions not found.",
  DEPOSIT_NOT_FOUND: "Deposit not found.",
  QUOTE_NOT_FOUND: "Quote not found.",
  QUOTE_ALREADY_EXECUTED: "This quote was already converted.",
  VALIDATION_ERROR: "Please check the form and try again.",
};

function getFiatErrorMessage(res, fallback = "Request failed") {
  if (!res) return fallback;
  const code = res?.code || res?.error?.code || (typeof res?.error === "string" ? res.error : "") || "";
  if (code && FIAT_ERROR_COPY[code]) {
    return FIAT_ERROR_COPY[code];
  }
  const msg = res?.message || res?.error?.message || (typeof res?.error === "string" ? res.error : "") || res?.data?.message || "";
  if (msg) {
    if (FIAT_ERROR_COPY[msg]) return FIAT_ERROR_COPY[msg];
    return msg;
  }
  return fallback;
}

function getEnabledVerifyMethods(settings) {
  const methods = settings?.methods;
  if (!methods) return ["email"];
  const enabled = [];
  if (methods.email?.enabled) enabled.push("email");
  if (methods.mobile?.enabled) enabled.push("mobile");
  if (methods.google_authenticator?.enabled) enabled.push("google_authenticator");
  if (methods.fund_password?.enabled) enabled.push("fund_password");
  return enabled.length ? enabled : ["email"];
}

const WithdrawFiatScreen = () => {
  const { colors: themeColors, isDark } = useTheme();
  const userData = useAppSelector((state) => state.auth?.userData || state.user?.userData || {});

  // Page level states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [step, setStep] = useState("main"); // 'main' | 'add' | 'otp' | 'withdraw'
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Balances & Limits & Profile
  const [balance, setBalance] = useState("0");
  const [withdrawLimits, setWithdrawLimits] = useState(EMPTY_LIMITS);
  const [vaAccount, setVaAccount] = useState(null);

  // Withdraw amount & preview
  const [amount, setAmount] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState("");

  // Add Beneficiary State
  const [iban, setIban] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");

  // Beneficiary OTP Verification State
  const [otp, setOtp] = useState("");
  const [resendSec, setResendSec] = useState(0);
  const [otpSentTo, setOtpSentTo] = useState("email");

  // Remove Modal State
  const [removeTarget, setRemoveTarget] = useState(null);

  // Security Verification (Final Withdrawal) State
  const [securitySettings, setSecuritySettings] = useState(null);
  const [emailVerifyCode, setEmailVerifyCode] = useState("");
  const [mobileVerifyCode, setMobileVerifyCode] = useState("");
  const [authAppCode, setAuthAppCode] = useState("");
  const [fundPassword, setFundPassword] = useState("");
  const [fundVisible, setFundVisible] = useState(false);
  const [otpSending, setOtpSending] = useState({ email: false, mobile: false });
  const [otpResend, setOtpResend] = useState({ email: 0, mobile: 0 });
  const [verifyFieldErrors, setVerifyFieldErrors] = useState({
    email: "",
    mobile: "",
    google_authenticator: "",
    fund_password: "",
  });

  // Bottom Sheet Refs
  const securityVerifySheetRef = useRef(null);
  const removeBankSheetRef = useRef(null);
  const noMethodsSheetRef = useRef(null);
  const fiatWithdrawFaqSheetRef = useRef(null);
  const [faqActiveIndex, setFaqActiveIndex] = useState(null);

  const previewSeq = useRef(0);
  const idempotencyKeyRef = useRef("");

  // Derived Objects
  const activeBeneficiary = useMemo(
    () => beneficiaries.find((b) => String(b.id || b._id) === String(selectedId)) || null,
    [beneficiaries, selectedId]
  );

  const verifiedReady = useMemo(
    () => beneficiaries.filter((b) => b.status === "VERIFIED"),
    [beneficiaries]
  );

  const kycName = useMemo(() => kycLegalName(vaAccount, userData), [vaAccount, userData]);

  const enabledMethods = useMemo(() => getEnabledVerifyMethods(securitySettings), [securitySettings]);

  // Load All Page Data
  const loadData = useCallback(async () => {
    setError("");
    try {
      const [benRes, balRes, limitsRes, vaRes] = await Promise.all([
        appOperation.customer.fiat_whitelist_list().catch(() => null),
        appOperation.customer.user_wallet("spot").catch(() => null),
        appOperation.customer.fiat_limits().catch(() => null),
        appOperation.customer.fiat_virtual_account_me().catch(() => null),
      ]);

      // Beneficiaries
      if (benRes?.success && benRes?.data) {
        const list = Array.isArray(benRes.data) ? benRes.data : benRes.data.items || [];
        const activeList = list.filter((b) => b && b.status !== "DISABLED");
        setBeneficiaries(activeList);
        setSelectedId((prev) => {
          if (activeList.some((b) => String(b.id || b._id) === String(prev))) return prev;
          const verified = activeList.find((b) => b.status === "VERIFIED");
          return String(verified?.id || verified?._id || activeList[0]?.id || activeList[0]?._id || "");
        });
      } else {
        setBeneficiaries([]);
      }

      // Spot AED Balance
      if (balRes?.success && Array.isArray(balRes?.data)) {
        const aedRow = balRes.data.find(
          (r) =>
            String(r?.short_name || "").toUpperCase() === "AED" ||
            String(r?.currency || "").toUpperCase() === "AED"
        );
        setBalance(aedRow ? String(aedRow.balance ?? "0") : "0");
      }

      // Limits
      if (limitsRes?.success && limitsRes?.data) {
        const root = limitsRes.data;
        const parsed = parseLimitSide(root.withdraw || root.withdrawal || {}, root, "withdraw");
        setWithdrawLimits(parsed);
      }

      // Virtual Account
      if (vaRes?.success && vaRes?.data) {
        setVaAccount(vaRes.data);
      }
    } catch {
      setError("Could not load bank accounts or balance.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch 2FA settings
  useEffect(() => {
    (async () => {
      try {
        const res = await appOperation.customer.fetch_withdrawal_security_settings().catch(() => null);
        if (res?.success) {
          setSecuritySettings(res.data?.settings || res.data || null);
        }
      } catch {
        /* fallback to email */
      }
    })();
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  // Resend Countdown for Add Beneficiary OTP
  useEffect(() => {
    if (resendSec <= 0) return;
    const t = setInterval(() => setResendSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendSec]);

  // Resend Countdown for Withdrawal 2FA OTP
  const otpResendActive = otpResend.email > 0 || otpResend.mobile > 0;
  useEffect(() => {
    if (!otpResendActive) return;
    const id = setInterval(() => {
      setOtpResend((prev) => ({
        email: prev.email > 0 ? prev.email - 1 : 0,
        mobile: prev.mobile > 0 ? prev.mobile - 1 : 0,
      }));
    }, 1000);
    return () => clearInterval(id);
  }, [otpResendActive]);

  // Max withdrawable calculation
  const maxWithdrawable = useMemo(() => {
    const vals = [
      parseFloat(balance) || 0,
      withdrawLimits.dailyRemaining != null ? parseFloat(withdrawLimits.dailyRemaining) : null,
      withdrawLimits.monthlyRemaining != null ? parseFloat(withdrawLimits.monthlyRemaining) : null,
      withdrawLimits.maxPerTx != null ? parseFloat(withdrawLimits.maxPerTx) : null,
    ].filter((n) => n != null && n > 0);
    if (!vals.length) return "";
    const minVal = Math.min(...vals);
    return minVal > 0 ? minVal.toFixed(2) : "";
  }, [balance, withdrawLimits]);

  // Amount Block Reason
  const amountReady = !!amount && parseFloat(amount) > 0;
  const amountBlockReason = useMemo(() => {
    if (!amountReady) return "";
    const amt = parseFloat(amount);
    const avail = parseFloat(balance) || 0;
    if (amt > avail) return "insufficient";
    if (withdrawLimits.minPerTx != null && amt < parseFloat(withdrawLimits.minPerTx)) {
      return "min";
    }
    if (maxWithdrawable && amt > parseFloat(maxWithdrawable)) {
      return "limit";
    }
    return "";
  }, [amountReady, amount, balance, withdrawLimits.minPerTx, maxWithdrawable]);

  const insufficientBalance = amountBlockReason === "insufficient";
  const belowMin = amountBlockReason === "min";
  const overLimit = amountBlockReason === "limit";
  const amountBlocked = !!amountBlockReason;

  // Real-time Preview Quote
  useEffect(() => {
    if (step !== "withdraw" || !amountReady || !activeBeneficiary || amountBlocked) {
      setPreview(null);
      setPreviewing(false);
      setPreviewError("");
      return;
    }

    const seq = ++previewSeq.current;
    setPreviewing(true);
    setPreviewError("");

    const timer = setTimeout(async () => {
      try {
        const query = `amount=${encodeURIComponent(amount)}&whitelist_id=${encodeURIComponent(activeBeneficiary.id || activeBeneficiary._id)}`;
        const res = await appOperation.customer.fiat_withdrawals_preview(query).catch((e) => e);
        if (seq !== previewSeq.current) return;
        setPreviewing(false);
        if (res?.success && res?.data) {
          setPreview(res.data);
        } else {
          setPreview(null);
          setPreviewError(res?.message || res?.error?.message || "Could not load withdrawal quote.");
        }
      } catch {
        if (seq === previewSeq.current) {
          setPreview(null);
          setPreviewError("Could not load withdrawal quote.");
          setPreviewing(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      previewSeq.current += 1;
    };
  }, [step, amountReady, amount, activeBeneficiary, amountBlocked]);

  const validateWithdrawAmount = () => {
    if (!amountReady) return "Enter an amount to withdraw.";
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return "Enter an amount to withdraw.";
    const avail = parseFloat(balance) || 0;
    if (amt > avail) return "Insufficient available balance.";
    if (withdrawLimits.minPerTx != null && amt < parseFloat(withdrawLimits.minPerTx)) {
      return `Minimum withdrawal is ${formatAedAmount(withdrawLimits.minPerTx)} AED.`;
    }
    if (withdrawLimits.maxPerTx != null && amt > parseFloat(withdrawLimits.maxPerTx)) {
      return `Maximum per transaction is ${formatAedAmount(withdrawLimits.maxPerTx)} AED.`;
    }
    if (withdrawLimits.dailyRemaining != null && amt > parseFloat(withdrawLimits.dailyRemaining)) {
      return `Daily limit remaining is ${formatAedAmount(withdrawLimits.dailyRemaining)} AED.`;
    }
    if (withdrawLimits.monthlyRemaining != null && amt > parseFloat(withdrawLimits.monthlyRemaining)) {
      return `Monthly limit remaining is ${formatAedAmount(withdrawLimits.monthlyRemaining)} AED.`;
    }
    if (maxWithdrawable && amt > parseFloat(maxWithdrawable)) {
      return `Maximum you can withdraw now is ${formatAedAmount(maxWithdrawable)} AED.`;
    }
    if (previewError) return previewError;
    if (!preview) return previewing ? "Loading quote…" : "Enter an amount to see the fee quote.";
    return "";
  };

  const resetVerifyFields = () => {
    setEmailVerifyCode("");
    setMobileVerifyCode("");
    setAuthAppCode("");
    setFundPassword("");
    setFundVisible(false);
    setVerifyFieldErrors({ email: "", mobile: "", google_authenticator: "", fund_password: "" });
  };

  const verificationReady = useMemo(() => {
    if (!enabledMethods.length) return false;
    if (enabledMethods.includes("email") && !emailVerifyCode.trim()) return false;
    if (enabledMethods.includes("mobile") && !mobileVerifyCode.trim()) return false;
    if (enabledMethods.includes("google_authenticator") && !authAppCode.trim()) return false;
    if (enabledMethods.includes("fund_password") && !fundPassword.trim()) return false;
    return true;
  }, [enabledMethods, emailVerifyCode, mobileVerifyCode, authAppCode, fundPassword]);

  // Handlers for Add Bank Account
  const startAddAccount = () => {
    setStep("add");
    setAccountName(kycName);
    setIban("");
    setBankName("");
    setError("");
    setInfo("");
  };

  const handleAddAccount = async () => {
    if (accountName.trim().length < 2) {
      const msg = "Enter the account holder name as shown on the bank account.";
      setError(msg);
      Toast.showWithGravity(msg, Toast.SHORT, Toast.BOTTOM);
      return;
    }
    if (!normalizePersonName(kycName)) {
      const msg = "Complete KYC and create your deposit IBAN before adding a withdrawal account.";
      setError(msg);
      Toast.showWithGravity(msg, Toast.SHORT, Toast.BOTTOM);
      return;
    }
    if (!namesMatch(kycName, accountName)) {
      const msg = `Account holder name must match your KYC name: ${kycName}`;
      setError(msg);
      Toast.showWithGravity(msg, Toast.SHORT, Toast.BOTTOM);
      return;
    }
    const cleanIban = iban.replace(/\s+/g, "").toUpperCase();
    if (!cleanIban) {
      const msg = "Enter your bank account IBAN.";
      setError(msg);
      Toast.showWithGravity(msg, Toast.SHORT, Toast.BOTTOM);
      return;
    }
    if (!bankName.trim()) {
      const msg = "Enter the bank name.";
      setError(msg);
      Toast.showWithGravity(msg, Toast.SHORT, Toast.BOTTOM);
      return;
    }

    setSubmitting(true);
    setError("");
    setInfo("");
    try {
      const res = await appOperation.customer.fiat_whitelist_create({
        iban: cleanIban,
        account_name: accountName.trim(),
        bank_name: bankName.trim(),
      }).catch((e) => e);

      if (res?.success && res?.data) {
        const created = res.data;
        const targetId = created.id || created._id;
        setBeneficiaries((prev) => {
          const filtered = prev.filter((b) => String(b.id || b._id) !== String(targetId));
          return [created, ...filtered];
        });
        setSelectedId(targetId);
        setIban("");
        setAccountName("");
        setBankName("");
        setOtp("");
        setOtpSentTo(created.otp_sent_to || res.otpSentTo || "email");
        setResendSec(RESEND_COOLDOWN_SEC);
        setStep("otp");
        setInfo("Verification code sent to your registered email.");
        Toast.showWithGravity("Verification code sent to your registered email.", Toast.LONG, Toast.BOTTOM);
      } else {
        const errMsg = getFiatErrorMessage(res, "Could not save bank account.");
        setError(errMsg);
        Toast.showWithGravity(errMsg, Toast.LONG, Toast.BOTTOM);
      }
    } catch {
      const errMsg = "Could not save bank account. Please try again.";
      setError(errMsg);
      Toast.showWithGravity(errMsg, Toast.LONG, Toast.BOTTOM);
    } finally {
      setSubmitting(false);
    }
  };

  // Handlers for OTP verification on new Bank Account
  const handleVerifyOtp = async () => {
    if (!selectedId || otp.trim().length !== 6) {
      const msg = "Please enter the 6-digit verification code.";
      setError(msg);
      Toast.showWithGravity(msg, Toast.SHORT, Toast.BOTTOM);
      return;
    }
    setSubmitting(true);
    setError("");
    setInfo("");
    try {
      const res = await appOperation.customer
        .fiat_whitelist_verify(selectedId, { otp: otp.trim() })
        .catch((e) => e);

      if (res?.success) {
        const updated = res.data || { ...activeBeneficiary, status: "VERIFIED" };
        setBeneficiaries((prev) =>
          prev.map((b) => (String(b.id || b._id) === String(selectedId) ? updated : b))
        );
        setOtp("");
        setStep("main");
        setInfo("Bank account verified. You can withdraw AED to this IBAN.");
        Toast.showWithGravity("Bank account verified successfully!", Toast.LONG, Toast.BOTTOM);
      } else {
        const errMsg = getFiatErrorMessage(res, "Invalid verification code.");
        setError(errMsg);
        Toast.showWithGravity(errMsg, Toast.LONG, Toast.BOTTOM);
      }
    } catch {
      const errMsg = "Invalid verification code. Please try again.";
      setError(errMsg);
      Toast.showWithGravity(errMsg, Toast.LONG, Toast.BOTTOM);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (!selectedId || resendSec > 0) return;
    setError("");
    try {
      const res = await appOperation.customer.fiat_whitelist_resend_otp(selectedId).catch((e) => e);
      if (res?.success) {
        setOtpSentTo(res.data?.otp_sent_to || "email");
        setResendSec(RESEND_COOLDOWN_SEC);
        setInfo("A new verification code was sent to your email.");
        Toast.showWithGravity("New verification code sent", Toast.SHORT, Toast.BOTTOM);
      } else {
        const errMsg = getFiatErrorMessage(res, "Could not resend code.");
        setError(errMsg);
        Toast.showWithGravity(errMsg, Toast.SHORT, Toast.BOTTOM);
      }
    } catch {
      const errMsg = "Could not resend code. Please try again.";
      setError(errMsg);
      Toast.showWithGravity(errMsg, Toast.SHORT, Toast.BOTTOM);
    }
  };

  // Remove Account Handlers
  const handleRemoveAccount = (id) => {
    if (!id) return;
    const ben = beneficiaries.find((b) => String(b.id || b._id) === String(id));
    if (!ben) return;
    setError("");
    setInfo("");
    setRemoveTarget(ben);
    removeBankSheetRef.current?.open?.();
  };

  const confirmRemoveAccount = async () => {
    const id = removeTarget?.id || removeTarget?._id;
    if (!id) return;
    setSubmitting(true);
    setError("");
    setInfo("");
    try {
      const res = await appOperation.customer.fiat_whitelist_delete(id).catch((e) => e);
      if (res?.success) {
        removeBankSheetRef.current?.close?.();
        setBeneficiaries((prev) => prev.filter((b) => String(b.id || b._id) !== String(id)));
        if (String(selectedId) === String(id)) {
          setSelectedId("");
          setStep("main");
        }
        setRemoveTarget(null);
        setInfo("Bank account removed.");
        Toast.showWithGravity("Bank account removed.", Toast.SHORT, Toast.BOTTOM);
      } else {
        removeBankSheetRef.current?.close?.();
        const errMsg = getFiatErrorMessage(res, "Could not remove bank account.");
        setError(errMsg);
        Toast.showWithGravity(errMsg, Toast.LONG, Toast.BOTTOM);
      }
    } catch {
      removeBankSheetRef.current?.close?.();
      const errMsg = "Could not remove bank account. Please try again.";
      setError(errMsg);
      Toast.showWithGravity(errMsg, Toast.LONG, Toast.BOTTOM);
    } finally {
      setSubmitting(false);
    }
  };

  // Withdraw Flow Start & Confirm
  const startWithdrawFlow = () => {
    const ben = beneficiaries.find(
      (b) => String(b.id || b._id) === String(selectedId) && b.status === "VERIFIED"
    );
    if (!ben) {
      const msg = "Select a verified bank account to withdraw.";
      setError(msg);
      Toast.showWithGravity(msg, Toast.SHORT, Toast.BOTTOM);
      return;
    }
    const amountError = validateWithdrawAmount();
    if (step === "withdraw" && amountError) {
      setError(amountError);
      Toast.showWithGravity(amountError, Toast.SHORT, Toast.BOTTOM);
      return;
    }
    setSelectedId(ben.id || ben._id);
    setError("");
    setInfo("");

    if (step !== "withdraw") {
      setStep("withdraw");
      return;
    }

    if (!preview || previewing) {
      const msg = previewError || "Wait for the fee quote before withdrawing.";
      setError(msg);
      Toast.showWithGravity(msg, Toast.SHORT, Toast.BOTTOM);
      return;
    }

    if (!enabledMethods.length) {
      noMethodsSheetRef.current?.open?.();
      return;
    }

    resetVerifyFields();
    idempotencyKeyRef.current = `wd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    securityVerifySheetRef.current?.open?.();
  };

  // Send 2FA verification OTP during withdrawal
  const handleSendVerifyOtp = async (method) => {
    if (method !== "email" && method !== "mobile") return;
    setOtpSending((p) => ({ ...p, [method]: true }));
    try {
      const res = await appOperation.customer.withdrawal_verification_otp({ method }).catch((e) => e);
      if (res?.success) {
        setOtpResend((p) => ({ ...p, [method]: RESEND_COOLDOWN_SEC }));
        Toast.showWithGravity(res?.message || "Verification code sent.", Toast.SHORT, Toast.BOTTOM);
      } else {
        const errMsg = getFiatErrorMessage(res, "Could not send code.");
        Toast.showWithGravity(errMsg, Toast.SHORT, Toast.BOTTOM);
      }
    } catch {
      Toast.showWithGravity(method === "email" ? "Could not send email code." : "Could not send SMS code.", Toast.SHORT, Toast.BOTTOM);
    } finally {
      setOtpSending((p) => ({ ...p, [method]: false }));
    }
  };

  // Final submit withdrawal API
  const handleConfirmWithdrawal = async () => {
    if (!activeBeneficiary) return;
    const amountError = validateWithdrawAmount();
    if (amountError) {
      setError(amountError);
      Toast.showWithGravity(amountError, Toast.SHORT, Toast.BOTTOM);
      return;
    }
    if (!enabledMethods.length) {
      securityVerifySheetRef.current?.close?.();
      noMethodsSheetRef.current?.open?.();
      return;
    }

    const nextErrors = { email: "", mobile: "", google_authenticator: "", fund_password: "" };
    if (enabledMethods.includes("email") && !emailVerifyCode.trim()) nextErrors.email = "Enter the email OTP.";
    if (enabledMethods.includes("mobile") && !mobileVerifyCode.trim()) nextErrors.mobile = "Enter the mobile OTP.";
    if (enabledMethods.includes("google_authenticator") && !authAppCode.trim()) {
      nextErrors.google_authenticator = "Enter the authenticator app code.";
    }
    if (enabledMethods.includes("fund_password") && !fundPassword.trim()) {
      nextErrors.fund_password = "Enter your fund password.";
    }
    if (Object.values(nextErrors).some(Boolean)) {
      setVerifyFieldErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setError("");
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = `wd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    const payload = {
      whitelist_id: activeBeneficiary.id || activeBeneficiary._id,
      amount: String(amount).trim(),
      currency: "AED",
    };
    if (enabledMethods.includes("email")) payload.email_code = emailVerifyCode.trim();
    if (enabledMethods.includes("mobile")) payload.mobile_code = mobileVerifyCode.trim();
    if (enabledMethods.includes("google_authenticator")) payload.google_authenticator_code = authAppCode.trim();
    if (enabledMethods.includes("fund_password")) payload.fund_password = fundPassword.trim();

    try {
      const res = await appOperation.customer
        .fiat_withdrawals_submit(payload, { "Idempotency-Key": idempotencyKeyRef.current })
        .catch((e) => e);

      if (res?.success) {
        const label = res.data?.status_label || res.message || "Withdrawal requested.";
        const reason = res.data?.status_reason || "";
        securityVerifySheetRef.current?.close?.();
        resetVerifyFields();
        idempotencyKeyRef.current = "";
        setAmount("");
        setPreview(null);
        setStep("main");
        setInfo(reason ? `${label} ${reason}` : label);
        Toast.showWithGravity(label, Toast.LONG, Toast.BOTTOM);
        await loadData();
      } else {
        const code = res?.code || res?.error?.code || "";
        const msg = getFiatErrorMessage(res, "Could not submit withdrawal.");
        const errMap = { email: "", mobile: "", google_authenticator: "", fund_password: "" };
        if (code === "EMAIL_OTP_INVALID" || code === "OTP_EXPIRED" || code === "OTP_NOT_FOUND") errMap.email = msg;
        else if (code === "MOBILE_OTP_INVALID") errMap.mobile = msg;
        else if (code === "GOOGLE_AUTH_INVALID") errMap.google_authenticator = msg;
        else if (code === "FUND_PASSWORD_INVALID" || code === "FUND_PASSWORD_REQUIRED") errMap.fund_password = msg;

        if (Object.values(errMap).some(Boolean)) {
          setVerifyFieldErrors(errMap);
        }
        setError(msg);
        Toast.showWithGravity(msg, Toast.LONG, Toast.BOTTOM);
      }
    } catch {
      const errMsg = "Could not submit withdrawal. Please try again.";
      setError(errMsg);
      Toast.showWithGravity(errMsg, Toast.LONG, Toast.BOTTOM);
    } finally {
      setSubmitting(false);
    }
  };

  // Color tokens
  const bgColor = themeColors.background;
  const cardBg = isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB";
  const textColor = isDark ? "#FFFFFF" : "#111827";
  const subTextColor = isDark ? "rgba(255,255,255,0.55)" : "#6B7280";
  const badgeBg = isDark ? "rgba(255,255,255,0.08)" : "#EDF2F7";

  // Widget Body Renderer based on step
  const renderWidgetBody = () => {
    if (loading) {
      return (
        <View style={styles.loadingWidgetBox}>
          <ActivityIndicator color={colors.cyanTheme} size="small" />
          <AppText type={THIRTEEN} style={{ marginTop: 8 }} color={subTextColor}>
            Loading bank accounts…
          </AppText>
        </View>
      );
    }

    // Step 1: Add Bank Account
    if (step === "add") {
      return (
        <View style={styles.widgetStepContainer}>
          <AppText type={FOURTEEN} weight={BOLD} style={styles.stepHeaderLabel} color={textColor}>
            Step 1 — Add bank account
          </AppText>
          <AppText type={TWELVE} style={styles.stepHelpText} color={subTextColor}>
            Enter the UAE bank account where you want to receive AED withdrawals. After save, only the masked IBAN is shown.
          </AppText>

          {/* Account Holder Name */}
          <AppText type={THIRTEEN} weight={SEMI_BOLD} style={styles.fieldLabel} color={subTextColor}>
            Account holder name
          </AppText>
          <View style={[styles.inputBox, { backgroundColor: badgeBg, borderColor }]}>
            <TextInput
              style={[styles.textInput, { color: textColor }]}
              value={accountName}
              onChangeText={setAccountName}
              placeholder="Must match your KYC name"
              placeholderTextColor={subTextColor}
              editable={!submitting}
            />
          </View>
          <AppText type={ELEVEN} style={styles.fieldHint} color={colors.cyanTheme}>
            {kycName
              ? `Must match your KYC name: ${kycName}`
              : "Complete KYC and create your deposit IBAN first. The name must match KYC."}
          </AppText>

          {/* Account Number (IBAN) */}
          <AppText type={THIRTEEN} weight={SEMI_BOLD} style={[styles.fieldLabel, { marginTop: 12 }]} color={subTextColor}>
            Account number (IBAN)
          </AppText>
          <View style={[styles.inputBox, { backgroundColor: badgeBg, borderColor }]}>
            <TextInput
              style={[styles.textInput, { color: textColor }]}
              value={iban}
              onChangeText={(t) => setIban(t.toUpperCase())}
              placeholder="AE070331234567890123456"
              placeholderTextColor={subTextColor}
              autoCapitalize="characters"
              editable={!submitting}
            />
          </View>

          {/* Bank Name */}
          <AppText type={THIRTEEN} weight={SEMI_BOLD} style={[styles.fieldLabel, { marginTop: 12 }]} color={subTextColor}>
            Bank name
          </AppText>
          <View style={[styles.inputBox, { backgroundColor: badgeBg, borderColor }]}>
            <TextInput
              style={[styles.textInput, { color: textColor }]}
              value={bankName}
              onChangeText={setBankName}
              placeholder="e.g. Emirates NBD"
              placeholderTextColor={subTextColor}
              editable={!submitting}
            />
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            onPress={handleAddAccount}
            disabled={submitting}
            activeOpacity={0.85}
            style={[
              styles.primaryBtn,
              {
                backgroundColor: colors.cyanTheme,
                opacity: submitting ? 0.7 : 1,
                marginTop: 20,
              },
            ]}
          >
            {submitting ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <ActivityIndicator color="#000000" size="small" />
                <AppText type={FIFTEEN} weight={BOLD} color="#000000">
                  Saving…
                </AppText>
              </View>
            ) : (
              <AppText type={FIFTEEN} weight={BOLD} color="#000000">
                Send verification code
              </AppText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setStep("main");
              setError("");
            }}
            disabled={submitting}
            style={[styles.secondaryOutlineBtn, { borderColor }]}
            activeOpacity={0.7}
          >
            <AppText type={FOURTEEN} weight={SEMI_BOLD} color={textColor}>
              Cancel
            </AppText>
          </TouchableOpacity>
        </View>
      );
    }

    // Step 2: Verify Beneficiary OTP
    if (step === "otp" && activeBeneficiary) {
      return (
        <View style={styles.widgetStepContainer}>
          <AppText type={FOURTEEN} weight={BOLD} style={styles.stepHeaderLabel} color={textColor}>
            Step 2 — Verify email
          </AppText>
          <AppText type={TWELVE} style={styles.stepHelpText} color={subTextColor}>
            Enter the 6-digit code sent to your registered {otpSentTo === "email" ? "email" : "contact"}. This confirms the IBAN and adds it to the Zand whitelist.
          </AppText>

          {/* Bank Summary Card */}
          <View style={[styles.selectedBankCard, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB", borderColor }]}>
            <View style={styles.selectedBankCardTop}>
              <View style={styles.selectedBankTitleWrap}>
                <BankPillarsIcon size={18} color={colors.cyanTheme} />
                <AppText type={FOURTEEN} weight={BOLD} color={textColor} numberOfLines={1} style={styles.selectedAccountName}>
                  {activeBeneficiary.account_name_masked || "Bank account"}
                </AppText>
              </View>
            </View>
            <AppText type={TWELVE} color={subTextColor} numberOfLines={1} style={styles.selectedBankMeta}>
              {beneficiaryIbanLabel(activeBeneficiary)}
              {activeBeneficiary.bank_name ? ` · ${activeBeneficiary.bank_name}` : ""}
            </AppText>
          </View>

          {/* OTP Input with inline resend */}
          <AppText type={THIRTEEN} weight={SEMI_BOLD} style={[styles.fieldLabel, { marginTop: 14 }]} color={subTextColor}>
            Verification code
          </AppText>
          <View style={[styles.otpInputRowWrap, { backgroundColor: badgeBg, borderColor }]}>
            <TextInput
              style={[styles.otpInput, { color: textColor }]}
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={subTextColor}
              keyboardType="number-pad"
              maxLength={6}
              editable={!submitting}
            />
            <TouchableOpacity
              onPress={handleResendOtp}
              disabled={resendSec > 0 || submitting}
              style={styles.resendInlineBtn}
              activeOpacity={0.7}
            >
              <AppText type={TWELVE} weight={BOLD} color={resendSec > 0 ? subTextColor : colors.cyanTheme}>
                {resendSec > 0 ? `Resend in ${resendSec}s` : "Resend code"}
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <TouchableOpacity
            onPress={handleVerifyOtp}
            disabled={submitting || otp.length !== 6}
            activeOpacity={0.85}
            style={[
              styles.primaryBtn,
              {
                backgroundColor: otp.length === 6 ? colors.cyanTheme : isDark ? "rgba(209,170,103,0.3)" : "#F3E8B6",
                marginTop: 20,
              },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#000000" size="small" />
            ) : (
              <AppText type={FIFTEEN} weight={BOLD} color="#000000">
                Verify email
              </AppText>
            )}
          </TouchableOpacity>

          <View style={styles.otpActionButtonsRow}>
            <TouchableOpacity
              onPress={() => setStep("main")}
              style={[styles.secondaryOutlineBtn, { borderColor, flex: 1, marginTop: 0 }]}
              activeOpacity={0.7}
            >
              <AppText type={FOURTEEN} weight={SEMI_BOLD} color={textColor}>
                Back
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleRemoveAccount(activeBeneficiary.id || activeBeneficiary._id)}
              style={[styles.secondaryOutlineBtn, { borderColor: "rgba(239,68,68,0.4)", flex: 1, marginTop: 0 }]}
              activeOpacity={0.7}
            >
              <AppText type={FOURTEEN} weight={SEMI_BOLD} color="#EF4444">
                Remove account
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Step 3: Withdraw AED Form
    if (step === "withdraw" && activeBeneficiary) {
      return (
        <View style={styles.widgetStepContainer}>
          <AppText type={FOURTEEN} weight={BOLD} style={styles.stepHeaderLabel} color={textColor}>
            Withdraw AED
          </AppText>

          {/* Destination Card with Verified Badge */}
          <View style={[styles.selectedBankCard, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB", borderColor }]}>
            <View style={styles.selectedBankCardTop}>
              <View style={styles.selectedBankTitleWrap}>
                <BankPillarsIcon size={18} color={colors.cyanTheme} />
                <AppText type={FOURTEEN} weight={BOLD} color={textColor} numberOfLines={1} style={styles.selectedAccountName}>
                  {activeBeneficiary.account_name_masked || "Bank account"}
                </AppText>
              </View>
              <View style={[styles.statusPill, { backgroundColor: isDark ? "rgba(34,197,94,0.12)" : "#DCFCE7" }]}>
                <AppText type={ELEVEN} weight={BOLD} color={isDark ? "#4ADE80" : "#15803D"}>
                  Verified
                </AppText>
              </View>
            </View>
            <AppText type={TWELVE} color={subTextColor} numberOfLines={1} style={styles.selectedBankMeta}>
              {beneficiaryIbanLabel(activeBeneficiary)}
              {activeBeneficiary.bank_name ? ` · ${activeBeneficiary.bank_name}` : ""}
            </AppText>
          </View>

          {/* Balance Strip */}
          <AppText
            type={TWELVE}
            style={[styles.availableBalanceNotice, { color: insufficientBalance ? "#EF4444" : subTextColor }]}
          >
            Available: {formatAedAmount(balance)} AED
            {insufficientBalance ? " · Not enough for this withdrawal" : ""}
          </AppText>

          {/* Amount Input */}
          <AppText type={THIRTEEN} weight={SEMI_BOLD} style={styles.fieldLabel} color={subTextColor}>
            Enter amount
          </AppText>
          <View style={[styles.amountInputWrap, { backgroundColor: badgeBg, borderColor }]}>
            <View style={styles.currencyPrefix}>
              <UaeFlagIcon width={22} height={15} />
              <AppText type={FOURTEEN} weight={BOLD} color={textColor} style={{ marginLeft: 6 }}>
                AED
              </AppText>
            </View>
            <TextInput
              style={[styles.amountInput, { color: textColor }]}
              value={amount}
              onChangeText={(t) => setAmount(sanitizeAedAmount(t))}
              placeholder="0.00"
              placeholderTextColor={subTextColor}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              onPress={() => setAmount(maxWithdrawable || "")}
              disabled={!maxWithdrawable}
              style={[styles.maxBtn, { backgroundColor: isDark ? "rgba(209,170,103,0.18)" : "#FFF9E6" }]}
              activeOpacity={0.7}
            >
              <AppText type={ELEVEN} weight={BOLD} color={colors.cyanTheme}>
                MAX
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Limit Hints */}
          <View style={{ marginTop: 6 }}>
            {withdrawLimits.minPerTx != null ? (
              <AppText type={ELEVEN} color={belowMin ? "#EF4444" : subTextColor}>
                Minimum: {formatAedAmount(withdrawLimits.minPerTx)} AED
              </AppText>
            ) : null}
            {overLimit && maxWithdrawable ? (
              <AppText type={ELEVEN} color="#EF4444" style={{ marginTop: 2 }}>
                Max now: {formatAedAmount(maxWithdrawable)} AED (balance / limits)
              </AppText>
            ) : null}
          </View>

          {/* Preview Fee Breakdown */}
          {preview && !amountBlocked ? (
            <View style={[styles.previewBreakdown, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB", borderColor }]}>
              <View style={styles.previewRow}>
                <AppText type={THIRTEEN} color={subTextColor}>You send</AppText>
                <AppText type={FOURTEEN} weight={BOLD} color={textColor}>
                  {formatAedAmount(preview.amount || amount)} AED
                </AppText>
              </View>
              <View style={styles.previewRow}>
                <AppText type={THIRTEEN} color={subTextColor}>Fee</AppText>
                <AppText type={FOURTEEN} weight={BOLD} color={colors.cyanTheme}>
                  {formatAedAmount(preview.fee_aed || preview.fee || 0)} AED
                </AppText>
              </View>
              <View style={[styles.previewRow, styles.previewTotalRow, { borderTopColor: borderColor }]}>
                <AppText type={FOURTEEN} weight={BOLD} color={textColor}>Bank receives</AppText>
                <AppText type={SIXTEEN} weight={BOLD} color="#10B981">
                  {formatAedAmount(preview.net_aed || preview.net || amount)} AED
                </AppText>
              </View>
            </View>
          ) : previewing && amountReady && !amountBlocked ? (
            <View style={styles.loadingQuoteWrap}>
              <ActivityIndicator size="small" color={colors.cyanTheme} />
              <AppText type={TWELVE} style={{ marginLeft: 8 }} color={subTextColor}>
                Loading fee quote…
              </AppText>
            </View>
          ) : previewError ? (
            <View style={styles.previewErrorWrap}>
              <AppText type={TWELVE} color="#EF4444">{previewError}</AppText>
            </View>
          ) : null}

          {/* Submit Action Button */}
          <TouchableOpacity
            onPress={startWithdrawFlow}
            disabled={submitting || previewing || amountBlocked || !preview || !amountReady}
            activeOpacity={0.85}
            style={[
              styles.primaryBtn,
              {
                backgroundColor:
                  amountBlocked || !preview || !amountReady
                    ? isDark ? "rgba(209,170,103,0.3)" : "#F3E8B6"
                    : colors.cyanTheme,
                marginTop: 20,
              },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#000000" size="small" />
            ) : (
              <AppText type={FIFTEEN} weight={BOLD} color="#000000">
                {insufficientBalance
                  ? "Insufficient balance"
                  : belowMin
                    ? "Below minimum"
                    : overLimit
                      ? "Over limit"
                      : "Withdraw"}
              </AppText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setStep("main")}
            style={styles.changeBankLinkBtn}
            activeOpacity={0.7}
          >
            <AppText type={THIRTEEN} weight={SEMI_BOLD} color={colors.cyanTheme}>
              Change bank account
            </AppText>
          </TouchableOpacity>
        </View>
      );
    }

    // Default: 'main' Step (Bank Accounts List)
    return (
      <View style={styles.widgetStepContainer}>
        <AppText type={FOURTEEN} weight={BOLD} style={styles.stepHeaderLabel} color={textColor}>
          Bank accounts
        </AppText>

        {beneficiaries.length === 0 ? (
          <View style={styles.emptyBeneficiariesWrap}>
            <AppText type={TWELVE} style={styles.emptyBeneficiariesText} color={subTextColor}>
              Add a UAE bank account to withdraw AED from your spot wallet.
            </AppText>
            <TouchableOpacity
              onPress={startAddAccount}
              activeOpacity={0.85}
              style={[styles.primaryBtn, { backgroundColor: colors.cyanTheme, marginTop: 14 }]}
            >
              <AppText type={FIFTEEN} weight={BOLD} color="#000000">
                Add bank account
              </AppText>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {beneficiaries.map((ben) => {
              const benId = ben.id || ben._id;
              const isSelected = String(selectedId) === String(benId);
              const needsContinue = ben.status === "PENDING_OTP";
              const isVerified = ben.status === "VERIFIED";

              return (
                <TouchableOpacity
                  key={benId}
                  activeOpacity={0.85}
                  onPress={() => setSelectedId(benId)}
                  style={[
                    styles.bankRadioCard,
                    {
                      backgroundColor: isSelected
                        ? isDark ? "rgba(209,170,103,0.08)" : "#FFFDF5"
                        : isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB",
                      borderColor: isSelected ? colors.cyanTheme : borderColor,
                    },
                  ]}
                >
                  <View style={styles.bankRadioRow}>
                    <View style={styles.radioIconWrap}>
                      {isSelected ? (
                        <RadioCheckedIcon size={18} color={colors.cyanTheme} />
                      ) : (
                        <RadioUncheckedIcon size={18} color={subTextColor} />
                      )}
                    </View>

                    <View style={styles.bankCardBody}>
                      <View style={styles.bankCardHeaderRow}>
                        <AppText
                          type={FOURTEEN}
                          weight={BOLD}
                          color={textColor}
                          style={styles.bankAccountNameText}
                          numberOfLines={1}
                        >
                          {ben.account_name_masked || "Bank account"}
                        </AppText>
                        <View
                          style={[
                            styles.statusPill,
                            {
                              backgroundColor: isVerified
                                ? isDark ? "rgba(34,197,94,0.12)" : "#DCFCE7"
                                : isDark ? "rgba(96,165,250,0.12)" : "#DBEAFE",
                            },
                          ]}
                        >
                          <AppText
                            type={ELEVEN}
                            weight={BOLD}
                            color={isVerified ? (isDark ? "#4ADE80" : "#15803D") : (isDark ? "#60A5FA" : "#2563EB")}
                          >
                            {isVerified ? "Verified" : "Verify email"}
                          </AppText>
                        </View>
                      </View>

                      <AppText type={TWELVE} color={subTextColor} style={styles.bankMetaText} numberOfLines={1}>
                        {beneficiaryIbanLabel(ben)}
                        {ben.bank_name ? ` · ${ben.bank_name}` : ""}
                      </AppText>

                      <View style={styles.bankActionButtonsWrap}>
                        {needsContinue ? (
                          <TouchableOpacity
                            onPress={() => {
                              setSelectedId(benId);
                              setStep("otp");
                              setOtp("");
                            }}
                            style={[styles.smallActionBtn, { borderColor: colors.cyanTheme }]}
                            activeOpacity={0.7}
                          >
                            <AppText type={ELEVEN} weight={BOLD} color={colors.cyanTheme}>
                              Verify email
                            </AppText>
                          </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity
                          onPress={() => handleRemoveAccount(benId)}
                          style={[styles.smallActionBtn, { borderColor: "rgba(239,68,68,0.4)" }]}
                          activeOpacity={0.7}
                        >
                          <AppText type={ELEVEN} weight={SEMI_BOLD} color="#EF4444">
                            Remove
                          </AppText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Actions: Withdraw Button + Add Bank Account */}
            <TouchableOpacity
              onPress={startWithdrawFlow}
              disabled={!verifiedReady.some((b) => String(b.id || b._id) === String(selectedId))}
              activeOpacity={0.85}
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: verifiedReady.some((b) => String(b.id || b._id) === String(selectedId))
                    ? colors.cyanTheme
                    : isDark ? "rgba(209,170,103,0.3)" : "#F3E8B6",
                  marginTop: 18,
                },
              ]}
            >
              <AppText type={FIFTEEN} weight={BOLD} color="#000000">
                Withdraw
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={startAddAccount}
              style={[styles.secondaryOutlineBtn, { borderColor }]}
              activeOpacity={0.7}
            >
              <AppText type={FOURTEEN} weight={SEMI_BOLD} color={textColor}>
                + Add bank account
              </AppText>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  return (
    <AppSafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity
          onPress={() => NavigationService.goBack()}
          style={styles.headerBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <FastImage
            source={back_ic}
            style={styles.backIcon}
            resizeMode={FastImage.resizeMode.contain}
          />
        </TouchableOpacity>

        <AppText type={EIGHTEEN} weight={BOLD} color={textColor}>
          Withdraw Fiat
        </AppText>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity
            onPress={() => {
              setFaqActiveIndex(null);
              fiatWithdrawFaqSheetRef.current?.open?.();
            }}
            style={styles.headerBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <FastImage
              source={INFO}
              style={styles.headerInfoIcon}
              resizeMode={FastImage.resizeMode.contain}
              tintColor={textColor}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => NavigationService.navigate(WITHDRAW_FIAT_HISTORY_SCREEN)}
            style={styles.headerBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <FastImage
              source={historyIcon}
              style={styles.historyHeaderIcon}
              resizeMode={FastImage.resizeMode.contain}
              tintColor={textColor}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyanTheme} />}
      >
        {/* Hero Banner Section */}
        <View style={[styles.heroCard, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.gatewayPill}>
            <AppText type={TEN} weight={BOLD} style={styles.gatewayPillText} color={colors.cyanTheme}>
              FIAT GATEWAY
            </AppText>
          </View>

          <AppText type={EIGHTEEN} weight={BOLD} style={styles.heroHeading} color={textColor}>
            AED Withdrawals{"\n"}to Your Bank
          </AppText>

          <AppText type={TWELVE} style={styles.heroSub} color={subTextColor}>
            Withdraw AED from your spot wallet to a verified UAE bank account securely.
          </AppText>

          {/* 3 Features */}
          <View style={styles.featureList}>
            <View style={styles.featureRow}>
              <View style={styles.featureIconBadge}>
                <SecurityShieldIcon size={15} color={colors.cyanTheme} />
              </View>
              <View style={styles.featureTextWrap}>
                <AppText type={THIRTEEN} weight={BOLD} style={styles.featureTitle} color={textColor}>
                  Secure & Reliable
                </AppText>
                <AppText type={ELEVEN} style={styles.featureDesc} color={subTextColor}>
                  Email OTP confirms your IBAN, then it is whitelisted for AED payouts.
                </AppText>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureIconBadge}>
                <InstantBoltIcon size={15} color={colors.cyanTheme} />
              </View>
              <View style={styles.featureTextWrap}>
                <AppText type={THIRTEEN} weight={BOLD} style={styles.featureTitle} color={textColor}>
                  Verified Accounts Only
                </AppText>
                <AppText type={ELEVEN} style={styles.featureDesc} color={subTextColor}>
                  Whitelist your IBAN once, then withdraw when you need.
                </AppText>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureIconBadge}>
                <BankPillarsIcon size={15} color={colors.cyanTheme} />
              </View>
              <View style={styles.featureTextWrap}>
                <AppText type={THIRTEEN} weight={BOLD} style={styles.featureTitle} color={textColor}>
                  UAE AED Rail
                </AppText>
                <AppText type={ELEVEN} style={styles.featureDesc} color={subTextColor}>
                  Domestic AED payouts via Zand Bank.
                </AppText>
              </View>
            </View>
          </View>
        </View>

        {/* Withdrawal Widget Container Card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.cardHeaderRow}>
            <AppText type={EIGHTEEN} weight={BOLD} color={textColor}>
              Withdraw Fiat
            </AppText>
            <TouchableOpacity
              onPress={() => NavigationService.navigate(DEPOSIT_FIAT_SCREEN)}
              style={styles.depositLink}
              activeOpacity={0.7}
            >
              <AppText type={TWELVE} weight={SEMI_BOLD} color={colors.cyanTheme}>
                Fiat Deposit ›
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Alerts */}
          {error ? (
            <View style={styles.errorAlertBox}>
              <AppText type={TWELVE} color="#EF4444">{error}</AppText>
            </View>
          ) : null}
          {info ? (
            <View style={styles.infoAlertBox}>
              <AppText type={TWELVE} color={colors.cyanTheme}>{info}</AppText>
            </View>
          ) : null}

          {renderWidgetBody()}
        </View>

        {/* "How to withdraw Fiat?" Section */}
        {/* <View style={styles.sectionWrap}>
          <AppText type={EIGHTEEN} weight={BOLD} style={styles.sectionHeading} color={textColor}>
            How to withdraw <AppText type={EIGHTEEN} weight={BOLD} color={colors.cyanTheme}>Fiat</AppText>?
          </AppText>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stepsScroll}
          >
            {HOW_STEPS.map((s) => {
              const StepIcon = s.IconComponent;
              return (
                <View
                  key={s.n}
                  style={[
                    styles.stepCard,
                    {
                      backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "#FFFFFF",
                      borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#E5E7EB",
                    },
                  ]}
                >
                  <View style={styles.stepCircleIcon}>
                    <StepIcon size={18} color={colors.cyanTheme} />
                  </View>
                  <AppText type={FIFTEEN} weight={BOLD} style={styles.stepTitle} color={textColor}>
                    {s.n}. {s.title}
                  </AppText>
                  <AppText type={TWELVE} style={styles.stepDesc} color={subTextColor}>
                    {s.body}
                  </AppText>
                </View>
              );
            })}
          </ScrollView>
        </View> */}

        {/* <View style={{ height: 40 }} /> */}
      </ScrollView>

      {/* Security Verification & 2FA Modal */}
      <AnimatedBottomSheet
        ref={securityVerifySheetRef}
        sheetHeight={Math.min(SCREEN_HEIGHT * 0.78, 560)}
        isDark={isDark}
      >
        <View style={styles.sheetInner}>
          <View style={styles.sheetHeader}>
            <AppText type={EIGHTEEN} weight={BOLD} color={textColor}>
              Security verification
            </AppText>
            <TouchableOpacity
              onPress={() => securityVerifySheetRef.current?.close?.()}
              style={[styles.closeCircle, { backgroundColor: badgeBg }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <FastImage source={closeIcon} style={styles.closeIconSmall} resizeMode="contain" tintColor={subTextColor} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <AppText type={TWELVE} style={{ marginBottom: 16 }} color={subTextColor}>
              Complete all enabled methods. For email or SMS, tap Send code, then enter the OTP.
            </AppText>

            {/* Email OTP Field */}
            {enabledMethods.includes("email") ? (
              <View style={{ marginBottom: 14 }}>
                <AppText type={THIRTEEN} weight={SEMI_BOLD} style={styles.modalFieldLabel} color={subTextColor}>
                  Email verification code
                </AppText>
                <View style={[styles.otpInputRowWrap, { backgroundColor: badgeBg, borderColor }]}>
                  <TextInput
                    style={[styles.otpInput, { color: textColor }]}
                    placeholder="Enter email code"
                    placeholderTextColor={subTextColor}
                    keyboardType="number-pad"
                    value={emailVerifyCode}
                    onChangeText={(v) => {
                      setEmailVerifyCode(v.replace(/\D/g, "").slice(0, VERIFY_CODE_LEN));
                      setVerifyFieldErrors((p) => ({ ...p, email: "" }));
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => handleSendVerifyOtp("email")}
                    disabled={otpSending.email || otpResend.email > 0}
                    style={styles.resendInlineBtn}
                    activeOpacity={0.7}
                  >
                    <AppText type={TWELVE} weight={BOLD} color={otpResend.email > 0 ? subTextColor : colors.cyanTheme}>
                      {otpSending.email
                        ? "Sending…"
                        : otpResend.email > 0
                          ? `Resend in ${otpResend.email}s`
                          : "Send code"}
                    </AppText>
                  </TouchableOpacity>
                </View>
                {verifyFieldErrors.email ? (
                  <AppText type={ELEVEN} color="#EF4444" style={{ marginTop: 4 }}>
                    {verifyFieldErrors.email}
                  </AppText>
                ) : null}
              </View>
            ) : null}

            {/* Mobile SMS OTP Field */}
            {enabledMethods.includes("mobile") ? (
              <View style={{ marginBottom: 14 }}>
                <AppText type={THIRTEEN} weight={SEMI_BOLD} style={styles.modalFieldLabel} color={subTextColor}>
                  Mobile verification code
                </AppText>
                <View style={[styles.otpInputRowWrap, { backgroundColor: badgeBg, borderColor }]}>
                  <TextInput
                    style={[styles.otpInput, { color: textColor }]}
                    placeholder="Enter mobile code"
                    placeholderTextColor={subTextColor}
                    keyboardType="number-pad"
                    value={mobileVerifyCode}
                    onChangeText={(v) => {
                      setMobileVerifyCode(v.replace(/\D/g, "").slice(0, VERIFY_CODE_LEN));
                      setVerifyFieldErrors((p) => ({ ...p, mobile: "" }));
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => handleSendVerifyOtp("mobile")}
                    disabled={otpSending.mobile || otpResend.mobile > 0}
                    style={styles.resendInlineBtn}
                    activeOpacity={0.7}
                  >
                    <AppText type={TWELVE} weight={BOLD} color={otpResend.mobile > 0 ? subTextColor : colors.cyanTheme}>
                      {otpSending.mobile
                        ? "Sending…"
                        : otpResend.mobile > 0
                          ? `Resend in ${otpResend.mobile}s`
                          : "Send code"}
                    </AppText>
                  </TouchableOpacity>
                </View>
                {verifyFieldErrors.mobile ? (
                  <AppText type={ELEVEN} color="#EF4444" style={{ marginTop: 4 }}>
                    {verifyFieldErrors.mobile}
                  </AppText>
                ) : null}
              </View>
            ) : null}

            {/* Authenticator App */}
            {enabledMethods.includes("google_authenticator") ? (
              <View style={{ marginBottom: 14 }}>
                <AppText type={THIRTEEN} weight={SEMI_BOLD} style={styles.modalFieldLabel} color={subTextColor}>
                  Authenticator app
                </AppText>
                <View style={[styles.inputBox, { backgroundColor: badgeBg, borderColor }]}>
                  <TextInput
                    style={[styles.textInput, { color: textColor }]}
                    placeholder="Enter authenticator app code"
                    placeholderTextColor={subTextColor}
                    keyboardType="number-pad"
                    value={authAppCode}
                    onChangeText={(v) => {
                      setAuthAppCode(v.replace(/\D/g, "").slice(0, VERIFY_CODE_LEN));
                      setVerifyFieldErrors((p) => ({ ...p, google_authenticator: "" }));
                    }}
                  />
                </View>
                {verifyFieldErrors.google_authenticator ? (
                  <AppText type={ELEVEN} color="#EF4444" style={{ marginTop: 4 }}>
                    {verifyFieldErrors.google_authenticator}
                  </AppText>
                ) : null}
              </View>
            ) : null}

            {/* Fund Password */}
            {enabledMethods.includes("fund_password") ? (
              <View style={{ marginBottom: 14 }}>
                <AppText type={THIRTEEN} weight={SEMI_BOLD} style={styles.modalFieldLabel} color={subTextColor}>
                  Fund password
                </AppText>
                <View style={[styles.otpInputRowWrap, { backgroundColor: badgeBg, borderColor }]}>
                  <TextInput
                    style={[styles.otpInput, { color: textColor }]}
                    placeholder="Enter fund password"
                    placeholderTextColor={subTextColor}
                    secureTextEntry={!fundVisible}
                    value={fundPassword}
                    onChangeText={(v) => {
                      setFundPassword(v);
                      setVerifyFieldErrors((p) => ({ ...p, fund_password: "" }));
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => setFundVisible((v) => !v)}
                    style={styles.resendInlineBtn}
                    activeOpacity={0.7}
                  >
                    <AppText type={TWELVE} weight={BOLD} color={colors.cyanTheme}>
                      {fundVisible ? "Hide" : "Show"}
                    </AppText>
                  </TouchableOpacity>
                </View>
                {verifyFieldErrors.fund_password ? (
                  <AppText type={ELEVEN} color="#EF4444" style={{ marginTop: 4 }}>
                    {verifyFieldErrors.fund_password}
                  </AppText>
                ) : null}
              </View>
            ) : null}

            {/* Confirm Withdrawal CTA */}
            <TouchableOpacity
              onPress={handleConfirmWithdrawal}
              disabled={submitting || !verificationReady}
              activeOpacity={0.85}
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: verificationReady ? colors.cyanTheme : isDark ? "rgba(209,170,103,0.3)" : "#F3E8B6",
                  marginTop: 18,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <AppText type={FIFTEEN} weight={BOLD} color="#000000">
                  Confirm withdrawal
                </AppText>
              )}
            </TouchableOpacity>

            <View style={styles.protectedFooterRow}>
              <SecurityShieldIcon size={14} color={subTextColor} />
              <AppText type={ELEVEN} style={{ marginLeft: 6 }} color={subTextColor}>
                Protected by Advanced Encryption
              </AppText>
            </View>
          </ScrollView>
        </View>
      </AnimatedBottomSheet>

      {/* No Methods Modal */}
      <AnimatedBottomSheet
        ref={noMethodsSheetRef}
        sheetHeight={280}
        isDark={isDark}
      >
        <View style={styles.sheetInner}>
          <AppText type={EIGHTEEN} weight={BOLD} style={{ marginBottom: 8 }} color={textColor}>
            Enable a verification method
          </AppText>
          <AppText type={THIRTEEN} style={{ marginBottom: 20, lineHeight: 18 }} color={subTextColor}>
            To withdraw AED, enable at least one security method: email, mobile, authenticator, or fund password.
          </AppText>

          <TouchableOpacity
            onPress={() => {
              noMethodsSheetRef.current?.close?.();
              NavigationService.navigate(SECURITY_SCREEN);
            }}
            activeOpacity={0.85}
            style={[styles.primaryBtn, { backgroundColor: colors.cyanTheme, width: "100%" }]}
          >
            <AppText type={FIFTEEN} weight={BOLD} color="#000000">
              Go to security settings
            </AppText>
          </TouchableOpacity>
        </View>
      </AnimatedBottomSheet>

      {/* Remove Account Confirmation Sheet */}
      <AnimatedBottomSheet
        ref={removeBankSheetRef}
        sheetHeight={260}
        isDark={isDark}
      >
        <View style={styles.sheetInner}>
          <AppText type={EIGHTEEN} weight={BOLD} style={{ marginBottom: 8 }} color={textColor}>
            Remove bank account?
          </AppText>
          <AppText type={THIRTEEN} style={{ marginBottom: 20 }} color={subTextColor}>
            Remove {beneficiaryIbanLabel(removeTarget)}? You can add the same IBAN again later.
          </AppText>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              onPress={() => removeBankSheetRef.current?.close?.()}
              style={[styles.modalSecondaryBtn, { borderColor }]}
              activeOpacity={0.7}
            >
              <AppText type={FOURTEEN} weight={SEMI_BOLD} color={textColor}>Cancel</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={confirmRemoveAccount}
              disabled={submitting}
              style={[styles.modalDangerBtn, { backgroundColor: "#EF4444" }]}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <AppText type={FOURTEEN} weight={BOLD} color="#FFFFFF">Remove</AppText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedBottomSheet>

      {/* Fiat Withdraw Help / FAQ Bottom Sheet */}
      {/* @ts-ignore */}
      <RBSheet
        customModalProps={{ statusBarTranslucent: true }}
        ref={fiatWithdrawFaqSheetRef}
        height={Math.round(Dimensions.get("window").height * 0.72) - 50}
        closeOnDragDown
        closeOnPressMask
        customStyles={{
          container: {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: themeColors.background,
          },
          wrapper: { backgroundColor: "rgba(0,0,0,0.6)" },
          draggableIcon: { backgroundColor: colors.textGray },
        }}
      >
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 }}>
          <View style={styles.modalHeader}>
            <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: themeColors.text }}>
              Withdraw Fiat Help
            </AppText>
            <TouchableOpacity
              onPress={() => fiatWithdrawFaqSheetRef.current?.close()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <AppText type={TWENTY} style={{ color: themeColors.text }}>
                ×
              </AppText>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {FIAT_WITHDRAW_FAQ_DATA.map((item, index) => (
              <View
                key={String(index)}
                style={[
                  styles.faqItemInner,
                  index === FIAT_WITHDRAW_FAQ_DATA.length - 1 && styles.faqItemInnerLast,
                  { borderColor: colors.inputBorder },
                ]}
              >
                <TouchableOpacity
                  style={styles.faqQuestionRow}
                  onPress={() =>
                    setFaqActiveIndex(faqActiveIndex === index ? null : index)
                  }
                  activeOpacity={0.7}
                >
                  <AppText
                    type={THIRTEEN}
                    weight={SEMI_BOLD}
                    style={[styles.faqQuestion, { color: themeColors.secondaryText }]}
                  >
                    {item.title}
                  </AppText>
                  <FastImage
                    source={faqActiveIndex === index ? upIcon : downIcon}
                    resizeMode="contain"
                    style={styles.faqArrow}
                    tintColor={themeColors.secondaryText}
                  />
                </TouchableOpacity>
                {faqActiveIndex === index && (
                  <View style={styles.faqAnswer}>
                    {item.content.split("\n").map((line, lineIndex) => (
                      <AppText
                        key={lineIndex}
                        type={TWELVE}
                        style={{ color: themeColors.secondaryText, lineHeight: 18 }}
                      >
                        {line}
                      </AppText>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Bottom Note & Withdraw Crypto Link */}
          <View style={{ borderTopWidth: 1, borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0", paddingTop: 14, marginTop: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-start", flexWrap: "wrap" }}>
              <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>
                Looking to withdraw crypto assets instead?{" "}
              </AppText>
              <TouchableOpacity
                onPress={() => {
                  fiatWithdrawFaqSheetRef.current?.close();
                  NavigationService.navigate(WALLET_WITHDRAW_SCREEN);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <AppText type={TWELVE} weight={BOLD} color={colors.cyanTheme}>
                  Withdraw Crypto ›
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </RBSheet>
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    padding: 6,
  },
  headerInfoIcon: {
    width: 18,
    height: 18,
  },
  backIcon: {
    width: 35,
    height: 35,
  },
  historyHeaderIcon: {
    width: 22,
    height: 22,
  },
  scrollContent: {
    padding: 16,
  },
  heroCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  gatewayPill: {
    backgroundColor: "rgba(209, 170, 103, 0.15)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  gatewayPillText: {
    letterSpacing: 0.5,
  },
  heroHeading: {
    lineHeight: 24,
    marginBottom: 6,
  },
  heroSub: {
    lineHeight: 16,
    marginBottom: 14,
  },
  featureList: {
    gap: 10,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(209, 170, 103, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(209, 170, 103, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    marginBottom: 1,
  },
  featureDesc: {
    lineHeight: 15,
  },
  card: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  depositLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  errorAlertBox: {
    backgroundColor: "rgba(239,68,68,0.12)",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  infoAlertBox: {
    backgroundColor: "rgba(209, 170, 103, 0.12)",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  loadingWidgetBox: {
    paddingVertical: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  widgetStepContainer: {
    marginTop: 4,
  },
  stepHeaderLabel: {
    marginBottom: 6,
  },
  stepHelpText: {
    lineHeight: 16,
    marginBottom: 14,
  },
  fieldLabel: {
    marginBottom: 6,
  },
  fieldHint: {
    marginTop: 4,
  },
  inputBox: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
    justifyContent: "center",
  },
  textInput: {
    fontSize: 14,
    fontWeight: "500",
  },
  otpInputRowWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
  },
  otpInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  resendInlineBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  otpActionButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  selectedBankCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  selectedBankCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedBankTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
    minWidth: 0,
  },
  selectedAccountName: {
    flex: 1,
    marginLeft: 8,
  },
  selectedBankMeta: {
    marginTop: 6,
    marginLeft: 26,
  },
  statusPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  availableBalanceNotice: {
    marginBottom: 12,
    marginTop: 2,
  },
  amountInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 52,
  },
  currencyPrefix: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "rgba(255,255,255,0.12)",
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
    paddingHorizontal: 12,
  },
  maxBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  previewBreakdown: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewTotalRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  loadingQuoteWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    padding: 8,
  },
  previewErrorWrap: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "rgba(239,68,68,0.1)",
  },
  changeBankLinkBtn: {
    alignSelf: "center",
    marginTop: 14,
    padding: 6,
  },
  emptyBeneficiariesWrap: {
    paddingVertical: 14,
  },
  emptyBeneficiariesText: {
    lineHeight: 18,
  },
  bankRadioCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  bankRadioRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  radioIconWrap: {
    marginTop: 2,
    marginRight: 10,
  },
  bankCardBody: {
    flex: 1,
    minWidth: 0,
  },
  bankCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bankAccountNameText: {
    flex: 1,
    marginRight: 8,
  },
  bankMetaText: {
    marginTop: 4,
  },
  bankActionButtonsWrap: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
  },
  smallActionBtn: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  primaryBtn: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryOutlineBtn: {
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginTop: 10,
  },
  sectionWrap: {
    marginTop: 10,
    marginBottom: 16,
  },
  sectionHeading: {
    marginBottom: 12,
  },
  stepsScroll: {
    gap: 12,
    paddingRight: 16,
    paddingVertical: 4,
  },
  stepCard: {
    width: 210,
    minHeight: 185,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  stepCircleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(209, 170, 103, 0.4)",
    backgroundColor: "rgba(209, 170, 103, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  stepTitle: {
    textAlign: "center",
    marginBottom: 8,
  },
  stepDesc: {
    textAlign: "center",
    lineHeight: 18,
  },
  sheetInner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  closeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIconSmall: {
    width: 14,
    height: 14,
  },
  modalFieldLabel: {
    marginBottom: 6,
  },
  protectedFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  modalSecondaryBtn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalDangerBtn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalList: {
    flex: 1,
  },
  faqItemInner: {
    paddingVertical: 12,
    borderBottomWidth: 0.7,
    borderBottomColor: colors.iconBgColor,
  },
  faqItemInnerLast: {
    borderBottomWidth: 0,
  },
  faqQuestionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQuestion: {
    flex: 1,
  },
  faqArrow: {
    width: 10,
    height: 10,
    marginLeft: 8,
  },
  faqAnswer: {
    marginTop: 10,
    paddingTop: 10,
  },
});

export default WithdrawFiatScreen;
