import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Keyboard,
  ScrollView,
  RefreshControl,
  Modal,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from "react-native";
import RBSheet from "react-native-raw-bottom-sheet";
import FastImage from "react-native-fast-image";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import moment from "moment";
import KeyBoardAware from "../../../common/KeyboardAware";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import NavigationService from "../../../navigation/NavigationService";
import AddWithdrawalAddressBasics from "../components/WithdrawAddress/AddWithdrawalAddressBasics";
import AddWithdrawalAddressVerification from "../components/WithdrawAddress/AddWithdrawalAddressVerification";
import WithdrawAddressBookModal from "../components/WithdrawAddress/WithdrawAddressBookModal";
import { canonicalWithdrawalChainForValidateAddress, CHAIN_FULL_NAMES, formatFundAvailableFromRow, formatWithdrawAmountDisplay, getActiveWithdrawChainKeys, networkKeysFromChain, parseNum, totalSpendableFromFundRow, valueForChain, WITHDRAW_NETWORK_LABELS } from "../../../helper/walletChainHelpers";
import { useTheme } from "../../../hooks/useTheme";
import { useAppSelector } from "../../../store/hooks";
import { getInteralWalletHistory, getUserMainWallet, getWithdrawActiveCoins, verifyWithdraw, withdrawCoin } from "../../../actions/walletActions";
import { getWithdrawalPasskeyCredential } from "../../../actions/accountActions";
import { SpinnerSecond } from "../../../shared/components/SpinnerSecond";
import { getEmailDomainSuggestions } from "../../../helper/emailDomainSuggest";
import { buildCoinImageUri } from "../../../helper/coinIconUrl";
import { account_restrictions, account_restrictions_light, ARROW_REVERSE, back_ic, bitcoinIcon, checkIc, down_arrow, downIcon, editIcon, email_vector, EMAIL_VERIFY, GOOGLE_VERIFY, INFO, LOCKED, PASSKEY_VERIFY, PHONE_VERIFY, printIcon, Refresh, REMOVE, right_ic, searchIcon, SECURITY_SHEIELD, upIcon, user_withdarwal } from "../../../helper/ImageAssets";
import { showError, showSuccess } from "../../../helper/logger";
import { getNotificationList } from "../../../actions/homeActions";
import { appOperation } from "../../../appOperation";
import { CUSTOMER_TYPE } from "../../../appOperation/types";
import { AppSafeAreaView, AppText, BOLD, Button, DISCLAIMTEXT, EIGHT, EIGHTEEN, ELEVEN, FIFTEEN, FOURTEEN, Input, MEDIUM, SEMI_BOLD, SIXTEEN, TEN, THIRTEEN, TWELVE, TWENTY, YELLOW } from "../../../common";
import { colors, darkTheme, lightTheme } from "../../../theme/colors";
import { countriesList } from "../../../helper/CountriesList";
import Accordion from "react-native-collapsible/Accordion";
import { NOTIFICATION_SCREEN, WITHDRAW_HISTORY_SCREEN, KYC_STATUS_SCREEN } from "../../../navigation/routes";

const SHEET_HEIGHT = Math.round(Dimensions.get("window").height * 0.9);
const AGCE_COUNTRY_SHEET_HEIGHT = Math.round(Dimensions.get("window").height * 0.48);

/** Web `WithdrawPageSteps12` — country codes for AGCE User → Phone. */
const AGCE_PHONE_COUNTRIES = [
  { flag: "🇮🇳", code: "+91", label: "India" },
  { flag: "🇦🇪", code: "+971", label: "UAE" },
  { flag: "🇸🇦", code: "+966", label: "Saudi Arabia" },
  { flag: "🇺🇸", code: "+1", label: "United States" },
  { flag: "🇬🇧", code: "+44", label: "United Kingdom" },
];

const ADDRESS_BOOK_TOP_EXCHANGES = [
  { value: "BINANCE", label: "Binance" },
  { value: "COINBASE", label: "Coinbase" },
  { value: "KRAKEN", label: "Kraken" },
  { value: "OKX", label: "OKX" },
  { value: "BYBIT", label: "Bybit" },
  { value: "KUCOIN", label: "KuCoin" },
  { value: "BITFINEX", label: "Bitfinex" },
  { value: "CRYPTOCOM", label: "Crypto.com" },
];

const ADDRESS_BOOK_EXCHANGE_OTHER = "__OTHER__";
const ADDRESS_BOOK_DECLARATION_TEXT = "I declare that the information I have provided is true, accurate, and complete and that my transaction complies with Coincode Terms of Use.";

function coinSymbol(coin) {
  return String(
    coin?.short_name || coin?.symbol || coin?.name || coin?.coin || coin?.currency || coin?.token || ""
  ).trim() || "—";
}

function isWithdrawChainActive(coin, code) {
  const statusMap = coin.withdrawal_status || coin.withdraw_status || coin.withdrawStatus || null;
  const w = statusMap && statusMap[code];
  if (w != null && String(w).trim() !== "") {
    return String(w).toUpperCase() === "ACTIVE";
  }
  return true;
}

function getWithdrawNetworks(coin) {
  if (!coin?.chain?.length) return [];
  const minW = coin.min_withdrawal || coin.min_withdraw || {};
  const maxW = coin.max_withdrawal || coin.max_withdraw || {};
  return coin.chain
    .filter((c) => isWithdrawChainActive(coin, c))
    .map((code) => {
      const tokenAssetId = coin.token_asset_ids?.[code] || "";
      return {
        code,
        label: coin.chain_full_names?.[code] || CHAIN_FULL_NAMES[code] || WITHDRAW_NETWORK_LABELS[code] || code,
        min: minW[code] != null ? String(minW[code]) : "—",
        max: maxW[code] != null ? String(maxW[code]) : "—",
        tokenAssetId,
      };
    });
}

function getWithdrawNetworksOrStaticFallback(coin) {
  if (!coin) return [];
  return getWithdrawNetworks(coin);
}


/** Same stable key as web `withdrawalAddressValidationKey` (useWithdrawPageController). */
function withdrawalAddressValidationKey(net, addr, tokenAssetId) {
  const a = String(addr || "").trim();
  const n = net != null && String(net).trim() ? String(net).trim() : "";
  const t = tokenAssetId != null && String(tokenAssetId).trim() ? String(tokenAssetId).trim() : "";
  if (!n || !a) return "";
  return `${n}::${a}::${t}`;
}

/** Web `withdrawPageShared.jsx` — digits + optional single decimal (withdraw amount field). */
function sanitizeWithdrawAmountRaw(raw) {
  let v = String(raw ?? "").replace(/[^\d.]/g, "");
  const firstDot = v.indexOf(".");
  if (firstDot !== -1) {
    v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, "");
  }
  return v;
}

const WithdrawForm = () => {
  const dispatch = useDispatch();
  const route = useRoute();
  const { colors: themeColors, isDark } = useTheme();
  const scrollViewRef = useRef(null);
  const routeCoin = route?.params?.data;
  const userData = useAppSelector((state) => state.auth.userData);
  const userMainWallet = useAppSelector((state) => state.wallet.userMainWallet);
  const withdrawActiveCoins = useAppSelector((state) => state.wallet.withdrawActiveCoins);

  useFocusEffect(
    useCallback(() => {
      dispatch(verifyWithdraw({}));
      dispatch(getInteralWalletHistory(0, 10));

      if (userData && Number(userData.kycVerified) !== 2) {
        setShowKycModal(true);
      }
    }, [dispatch, userData])
  );

  const withdrawCoinsList = useMemo(
    () => (Array.isArray(withdrawActiveCoins) ? withdrawActiveCoins : []),
    [withdrawActiveCoins]
  );




  const { emailId } = userData ?? "";

  const [selectedCurrency, setSelectedCurrency] = useState({});
  const activeCoinObj = useMemo(() => {
    if (!selectedCurrency || Object.keys(selectedCurrency).length === 0) return null;
    const sym = String(selectedCurrency.short_name || selectedCurrency.coin || "").toUpperCase();
    if (!sym) return null;
    return withdrawCoinsList.find((c) => String(c.short_name || c.coin || "").toUpperCase() === sym) || selectedCurrency;
  }, [selectedCurrency, withdrawCoinsList]);

  // Combined Verification Fallback State
  const [withdrawSecuritySettings, setWithdrawSecuritySettings] = useState(null);
  const [emailVerifyCode, setEmailVerifyCode] = useState("");
  const [mobileVerifyCode, setMobileVerifyCode] = useState("");
  const [authAppCode, setAuthAppCode] = useState("");
  const [withdrawFundPassword, setWithdrawFundPassword] = useState("");
  const [withdrawFundPasswordVisible, setWithdrawFundPasswordVisible] = useState(false);
  const [isWithdrawVerifyCombinedOpen, setIsWithdrawVerifyCombinedOpen] = useState(false);
  const [isWithdrawSubmitLoading, setIsWithdrawSubmitLoading] = useState(false);

  const [withdrawOtpSending, setWithdrawOtpSending] = useState({ email: false, mobile: false });
  const [withdrawOtpResendSec, setWithdrawOtpResendSec] = useState({ email: 0, mobile: 0 });

  const sendSingleWithdrawalOtp = async (method) => {
    if (withdrawOtpSending[method] || withdrawOtpResendSec[method] > 0) return;
    setWithdrawOtpSending((p) => ({ ...p, [method]: true }));
    try {
      const res = await appOperation.customer.withdrawal_verification_otp({ method });
      if (res?.success) {
        showSuccess(`Code sent to ${method}`);
        setWithdrawOtpResendSec((p) => ({ ...p, [method]: 60 }));
        let sec = 60;
        const intId = setInterval(() => {
          sec -= 1;
          setWithdrawOtpResendSec((p) => ({ ...p, [method]: sec }));
          if (sec <= 0) clearInterval(intId);
        }, 1000);
      } else {
        showError(res?.message || `Could not send ${method} code`);
      }
    } catch (e) {
      showError(e?.message || `Could not send ${method} code`);
    } finally {
      setWithdrawOtpSending((p) => ({ ...p, [method]: false }));
    }
  };

  useEffect(() => {
    appOperation.customer.fetch_withdrawal_security_settings()
      .then((res) => {
        if (res?.success) setWithdrawSecuritySettings(res.data?.settings || null);
      })
      .catch(() => { });
  }, []);

  const getNonPasskeyEnabledMethods = useCallback(() => {
    const s = withdrawSecuritySettings;
    if (!s) return ["email"];
    if (!s.methods) return [];
    const methods = [];
    if (s.methods.email?.enabled) methods.push("email");
    if (s.methods.mobile?.enabled) methods.push("mobile");
    if (s.methods.google_authenticator?.enabled) methods.push("google_authenticator");
    if (s.methods.fund_password?.enabled) methods.push("fund_password");
    return methods;
  }, [withdrawSecuritySettings]);

  /** Web parity: `WithdrawPageSteps12` — Address vs AGCE User under “Withdraw to”. */
  const [withdrawToTab, setWithdrawToTab] = useState("address");
  /** Web `agceRecipientTab`: email | phone | agce */
  const [agceRecipientTab, setAgceRecipientTab] = useState("email");
  const [agceRecipientEmail, setAgceRecipientEmail] = useState("");
  const [agceRecipientPhoneLocal, setAgceRecipientPhoneLocal] = useState("");
  const [agcePhoneCountry, setAgcePhoneCountry] = useState(() => AGCE_PHONE_COUNTRIES[0]);
  const [agceRecipientId, setAgceRecipientId] = useState("");
  const [confirmSheetHeight, setConfirmSheetHeight] = useState(320);
  const [agceCountrySheetHeight, setAgceCountrySheetHeight] = useState(450);
  const [agceTouched, setAgceTouched] = useState({ email: false, phone: false });

  const [showKycModal, setShowKycModal] = useState(false);
  const [emailSuggestListVisible, setEmailSuggestListVisible] = useState(false);
  const emailSuggestBlurTimer = useRef(null);

  const clearEmailSuggestBlurTimer = () => {
    if (emailSuggestBlurTimer.current) {
      clearTimeout(emailSuggestBlurTimer.current);
      emailSuggestBlurTimer.current = null;
    }
  };

  const emailDomainSuggestions = useMemo(
    () => (withdrawToTab === "agce_user" && agceRecipientTab === "email" ? getEmailDomainSuggestions(agceRecipientEmail) : []),
    [withdrawToTab, agceRecipientTab, agceRecipientEmail]
  );

  const applyEmailDomain = (domain) => {
    clearEmailSuggestBlurTimer();
    const s = String(agceRecipientEmail || "");
    const at = s.indexOf("@");
    if (at < 0) return;
    setAgceRecipientEmail(`${s.slice(0, at)}@${domain}`);
    setEmailSuggestListVisible(false);
  };

  const agceErrors = useMemo(() => {
    const err = { email: "", phone: "" };
    const email = agceRecipientEmail.trim();
    if (agceTouched.email) {
      if (!email) err.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) err.email = "Invalid email format";
    }
    const phone = agceRecipientPhoneLocal.trim();
    if (agceTouched.phone) {
      if (!phone) err.phone = "Phone number is required";
      else if (!/^\d+$/.test(phone)) err.phone = "Invalid phone number";
    }
    return err;
  }, [agceRecipientEmail, agceRecipientPhoneLocal, agceTouched]);

  const isAgceFormValid = useMemo(() => {
    if (agceRecipientTab === "email") {
      const email = agceRecipientEmail.trim();
      return email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    if (agceRecipientTab === "phone") {
      const digits = agceRecipientPhoneLocal.trim().replace(/\D/g, "");
      return digits.length >= 6;
    }
    if (agceRecipientTab === "agce") {
      return agceRecipientId.trim().length > 0;
    }
    return false;
  }, [agceRecipientTab, agceRecipientEmail, agceRecipientPhoneLocal, agceRecipientId]);

  const selectedCurrencyIconSource = useMemo(() => {
    const u = buildCoinImageUri(selectedCurrency);
    return u ? { uri: u } : bitcoinIcon;
  }, [selectedCurrency]);
  const [network, setNetwork] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  /** Web `withdrawAmountTouched` — inline errors only after user interacts with amount field. */
  const [withdrawAmountTouched, setWithdrawAmountTouched] = useState(false);
  /** Web `withdrawAddressTouched` — inline errors only after user interacts with address field. */
  const [withdrawAddressTouched, setWithdrawAddressTouched] = useState(false);
  const [availableBalance, setAvailableBalance] = useState("");
  /** Web parity: `validate-address` API + `withdrawAddressValidatedKey`. */
  const [withdrawAddressValidError, setWithdrawAddressValidError] = useState("");
  const [withdrawAddressValidatedKey, setWithdrawAddressValidatedKey] = useState("");
  /** After an API validate attempt for current input (avoids “invalid” flash during debounce). */
  const [withdrawAddressCheckDone, setWithdrawAddressCheckDone] = useState(false);
  const [isWithdrawAddressValidating, setIsWithdrawAddressValidating] = useState(false);
  const [isWithdrawAddressValidated, setIsWithdrawAddressValidated] = useState(false);
  const withdrawAddressValidationReqIdRef = useRef(0);

  const verifyReminderSheetRef = useRef(null);
  const saveAddressSheetRef = useRef(null);
  const [saveAddrLabel, setSaveAddrLabel] = useState("");
  const [saveAddrAddress, setSaveAddrAddress] = useState("");
  const [saveAddrMemo, setSaveAddrMemo] = useState("");
  const [saveAddrCoin, setSaveAddrCoin] = useState("USDT");
  const [saveAddrBusy, setSaveAddrBusy] = useState(false);
  const [saveAddrStep, setSaveAddrStep] = useState("form"); // "form" | "owner" | "wallet_type" | "exchange" | "verify_method" | "otp" | "satoshi" | "metamask"
  const [saveAddrOwnership, setSaveAddrOwnership] = useState("SELF"); // "SELF" | "OTHER"
  const [saveAddrWalletType, setSaveAddrWalletType] = useState("SELF_HOSTED"); // "SELF_HOSTED" | "EXCHANGE"

  // Validation state for saveAddrAddress
  const [saveAddrAddressTouched, setSaveAddrAddressTouched] = useState(false);
  const [saveAddrAddressValidError, setSaveAddrAddressValidError] = useState("");
  const [saveAddrAddressValidatedKey, setSaveAddrAddressValidatedKey] = useState("");
  const [saveAddrAddressValidating, setSaveAddrAddressValidating] = useState(false);
  const saveAddrValidateReqIdRef = useRef(0);
  const saveAddrValidateDebounceTimerRef = useRef(null);
  const [saveAddrExchange, setSaveAddrExchange] = useState("");
  const [saveAddrExchangeManual, setSaveAddrExchangeManual] = useState("");
  const [saveAddrDeclarationAccepted, setSaveAddrDeclarationAccepted] = useState(false);
  const [saveAddrExchangeSearch, setSaveAddrExchangeSearch] = useState("");
  const [saveAddrExchangeOpen, setSaveAddrExchangeOpen] = useState(false);
  const [saveAddrProofMethod, setSaveAddrProofMethod] = useState("satoshi"); // "satoshi" | "metamask"
  const [saveAddrSatoshiPolling, setSaveAddrSatoshiPolling] = useState(false);
  const [satoshiWhitelistAwaitingProof, setSatoshiWhitelistAwaitingProof] = useState(false);
  const [satoshiDepositLoading, setSatoshiDepositLoading] = useState(false);
  const [satoshiDepositError, setSatoshiDepositError] = useState("");
  const [satoshiResumeMode, setSatoshiResumeMode] = useState(false);
  const [saveAddrVerifyOptions, setSaveAddrVerifyOptions] = useState([]);
  const [selectedSaveAddrVerifyMethod, setSelectedSaveAddrVerifyMethod] = useState("");
  const [saveAddrWhitelistData, setSaveAddrWhitelistData] = useState(null);
  const [saveAddrBenFullName, setSaveAddrBenFullName] = useState("");
  const [saveAddrBenPan, setSaveAddrBenPan] = useState("");
  const [saveAddrBenCountry, setSaveAddrBenCountry] = useState("");
  const [saveAddrBenPin, setSaveAddrBenPin] = useState("");
  const [saveAddrBenAddress, setSaveAddrBenAddress] = useState("");
  const [saveAddrOtp, setSaveAddrOtp] = useState("");
  const [saveAddrVerificationLoading, setSaveAddrVerificationLoading] = useState(false);
  const [saveAddrNetwork, setSaveAddrNetwork] = useState("");
  const [saveAddrCoinOpen, setSaveAddrCoinOpen] = useState(false);
  const [saveAddrNetworkOpen, setSaveAddrNetworkOpen] = useState(false);

  const saveAddrCoinObj = useMemo(() => {
    return withdrawCoinsList.find((c) => {
      const sym = c.coin || c.short_name || c.symbol || "";
      return sym.toUpperCase() === String(saveAddrCoin).toUpperCase();
    });
  }, [withdrawCoinsList, saveAddrCoin]);

  const saveAddrNetworkOptions = useMemo(() => {
    return getWithdrawNetworksOrStaticFallback(saveAddrCoinObj);
  }, [saveAddrCoinObj]);
  const [addressBookEntries, setAddressBookEntries] = useState([]);
  const [addressBookLoading, setAddressBookLoading] = useState(false);
  const withdrawAddrValidateDebounceTimerRef = useRef(null);
  const [saveAddrOtpTimer, setSaveAddrOtpTimer] = useState(0);
  const [saveAddrResendActive, setSaveAddrResendActive] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpText, setOtpText] = useState("Get OTP");
  const [disableBtn, setDisableBtn] = useState(false);
  const [timer, setTimer] = useState(0);

  /** Web: OTP is not on the amount step; it appears after tapping Withdrawal (confirm / verify flow). */
  const [withdrawOtpPhaseActive, setWithdrawOtpPhaseActive] = useState(false);
  const [faqActiveIndex, setFaqActiveIndex] = useState(null);
  const networkSheetRef = useRef(null);

  const saveAddrCountrySheetRef = useRef(null);
  const [isWithdrawConfirmOpen, setIsWithdrawConfirmOpen] = useState(false);
  const [isWithdrawSummaryOpen, setIsWithdrawSummaryOpen] = useState(false);
  const withdrawConfirmSheetRef = useRef(null);
  const withdrawSummarySheetRef = useRef(null);
  const withdrawSecuritySheetRef = useRef(null);
  const [isAddressBookModalVisible, setIsAddressBookModalVisible] = useState(false);
  const [addressBookSubTab, setAddressBookSubTab] = useState("recent");
  const [recentAddresses, setRecentAddresses] = useState([]);
  const [recentAddressesLoading, setRecentAddressesLoading] = useState(false);
  const [withdrawSummaryContinueBusy, setWithdrawSummaryContinueBusy] = useState(false);
  const [isSecurityVerificationOpen, setIsSecurityVerificationOpen] = useState(false);
  const [withdrawConfirmBusy, setWithdrawConfirmBusy] = useState(false);
  const agceCountrySheetRef = useRef(null);
  const faqSheetRef = useRef(null);
  const [announcements, setAnnouncements] = useState([]);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const keyboardDidHideListener = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const [activeAnnouncementSections, setActiveAnnouncementSections] = useState([]);
  const notificationList = useAppSelector((state) => state.home.notificationList);

  const [isWithdrawMetaRefreshing, setIsWithdrawMetaRefreshing] = useState(false);
  /** Web `withdraw24hUsage` from `GET /api/v1/wallet/withdrawal-24h-usage?coinName=`. */
  const [withdraw24hUsage, setWithdraw24hUsage] = useState(null);
  const [withdrawAvailSourceOpen, setWithdrawAvailSourceOpen] = useState(false);
  const withdrawLimitInfoSheetRef = useRef(null);
  const networkFeeInfoSheetRef = useRef(null);

  const [withdrawCoinsLoading, setWithdrawCoinsLoading] = useState(() => {
    if (routeCoin && typeof routeCoin === "object" && Object.keys(routeCoin).length > 0) return false;
    return !(withdrawActiveCoins && withdrawActiveCoins.length > 0);
  });

  const addressDeleteSheetRef = useRef(null);
  const [addressToDelete, setAddressToDelete] = useState(null);
  const [addressDeleteBusy, setAddressDeleteBusy] = useState(false);
  const isFirstLoad = useRef(true);
  const [refreshing, setRefreshing] = useState(false);
  /** After user picks a coin from sheet, do not overwrite with default USDT. */
  const userPickedCoinRef = useRef(false);

  const activeWithdrawChains = useMemo(
    () => getActiveWithdrawChainKeys(activeCoinObj),
    [activeCoinObj]
  );

  const sheetWithdrawChains = useMemo(
    () => getActiveWithdrawChainKeys(activeCoinObj),
    [activeCoinObj]
  );

  const withdrawNetworkDisplay = useMemo(() => {
    if (!network) return "";
    const full = String(
      activeCoinObj?.chain_full_names?.[network] ||
      activeCoinObj?._chain_full_name?.[network] ||
      ""
    ).trim();
    if (full) return full;
    return network;
  }, [activeCoinObj, network]);

  const openWithdrawNetworkSheet = useCallback(() => {
    if (!activeCoinObj || Object.keys(activeCoinObj).length === 0) return;
    const keys = getActiveWithdrawChainKeys(activeCoinObj);
    if (keys.length === 0) {
      const raw = networkKeysFromChain(activeCoinObj?.chain).length;
      const hasChains = Array.isArray(activeCoinObj?.chains) && activeCoinObj.chains.length > 0;
      if (raw === 0 && !hasChains) {
        showError("No withdrawal network available for this coin");
      } else {
        showError("No active withdrawal network for this coin");
      }
      return;
    }
    setTimeout(() => networkSheetRef.current?.open(), 0);
  }, [activeCoinObj]);



  const handleNetworkChosenFromSheet = useCallback((chainKey) => {
    setNetwork(chainKey);
    setWithdrawAmountTouched(false);
    setWithdrawOtpPhaseActive(false);
    setOtp("");
    setWithdrawAddressValidError("");
    setWithdrawAddressValidatedKey("");
    setWithdrawAddressCheckDone(false);
    setIsWithdrawAddressValidated(false);
    networkSheetRef.current?.close();
  }, []);

  const chainWithdrawalFee = useMemo(() => {
    if (!activeCoinObj || !network) return 0;
    const raw = activeCoinObj.withdrawal_fee || activeCoinObj.withdraw_fee || {};
    const val = raw[network] ?? raw[String(network).toLowerCase()] ?? raw[String(network).toUpperCase()] ?? valueForChain(activeCoinObj, "withdrawal_fee", network);
    return parseNum(val, 0);
  }, [activeCoinObj, network]);

  const chainMinWithdrawal = useMemo(() => {
    if (!activeCoinObj || !network) return 0;
    const raw = activeCoinObj.min_withdrawal || activeCoinObj.min_withdraw || {};
    const val = raw[network] ?? raw[String(network).toLowerCase()] ?? raw[String(network).toUpperCase()] ?? valueForChain(activeCoinObj, "min_withdrawal", network);
    return parseNum(val, 0);
  }, [activeCoinObj, network]);

  const chainMinWithdrawalDisplay = useMemo(() => {
    if (withdrawToTab === "agce_user") {
      return "0";
    }

    // If a specific network is selected, try using its min withdrawal value
    if (network && network !== "Select Network") {
      return formatWithdrawAmountDisplay(chainMinWithdrawal);
    }

    return "";
  }, [withdrawToTab, network, chainMinWithdrawal]);

  const mainWalletFundRow = useMemo(() => {
    if (!Array.isArray(userMainWallet) || !activeCoinObj) return null;
    const cid = activeCoinObj._id;
    const sym = String(activeCoinObj.short_name || "").toUpperCase();
    return (
      userMainWallet.find((row) => {
        if (cid && row?.currency_id === cid) return true;
        if (sym && String(row?.short_name || row?.currency || "").toUpperCase() === sym) return true;
        return false;
      }) || null
    );
  }, [userMainWallet, activeCoinObj]);

  /** Web `withdrawStep3Preview` (useWithdrawPageController) — meta row + fee / receive. */
  const withdrawStep3Preview = useMemo(() => {
    const isAgce = withdrawToTab === "agce_user";
    const sym = activeCoinObj?.short_name || "—";

    // Web logic parity: if no currency or network (or internal transfer which has no network), return nulls
    if (!activeCoinObj || (!isAgce && (!network || network === "" || network === "Select Network"))) {
      return {
        networkCode: "—",
        limit24hLine: "— / —",
        limitLeft: "—",
        limitRight: "—",
        feeNum: null,
        receiveNum: null,
        sym
      };
    }

    const netCode = !isAgce ? String(network).toUpperCase() : "Internal";
    const amt = parseFloat(String(withdrawAmount || "").replace(/,/g, ""));
    const feeNum = isAgce ? 0 : (Number.isFinite(chainWithdrawalFee) ? chainWithdrawalFee : null);
    const receiveNum = isAgce
      ? (Number.isFinite(amt) && amt > 0 ? amt : null)
      : (feeNum != null && Number.isFinite(amt) && amt > 0 ? Math.max(0, amt - feeNum) : null);

    const netMax = parseNum(valueForChain(activeCoinObj, "max_withdrawal", network), NaN);
    const remaining = Number(withdraw24hUsage?.remaining);
    const limitU = Number(withdraw24hUsage?.limit);
    const usageLine =
      Number.isFinite(remaining) && Number.isFinite(limitU)
        ? `${formatWithdrawAmountDisplay(remaining)} / ${formatWithdrawAmountDisplay(limitU)}`
        : "— / —";
    const fallbackLine =
      Number.isFinite(netMax)
        ? `${formatWithdrawAmountDisplay(netMax)} / ${formatWithdrawAmountDisplay(netMax)}`
        : "— / —";
    const limit24hLine = usageLine !== "— / —" ? usageLine : fallbackLine;
    const parts = String(limit24hLine || "— / —").split("/");
    const limitLeft = (parts[0] || "—").trim();
    const limitRight = (parts.slice(1).join("/") || "—").trim();
    return { networkCode: netCode, limitLeft, limitRight, feeNum, receiveNum, sym, limit24hLine };
  }, [withdrawToTab, activeCoinObj, network, withdrawAmount, chainWithdrawalFee, withdraw24hUsage]);

  const selectedTokenAssetId = useMemo(() => {
    if (!activeCoinObj || Object.keys(activeCoinObj).length === 0 || !network) return "";
    const fromMap = activeCoinObj?.token_asset_ids?.[network];
    if (fromMap != null && String(fromMap).trim()) return String(fromMap).trim();
    return network;
  }, [activeCoinObj, network]);

  const currentWithdrawAddressValidationKey = useMemo(() => {
    const a = String(withdrawAddress || "").trim();
    const n = String(network || "").trim();
    if (!a || !n) return "";
    return withdrawalAddressValidationKey(n, a, selectedTokenAssetId);
  }, [withdrawAddress, network, selectedTokenAssetId]);

  const isWithdrawAddressValid = useMemo(() => {
    if (!currentWithdrawAddressValidationKey) return true;
    return withdrawAddressValidatedKey === currentWithdrawAddressValidationKey && !withdrawAddressValidError;
  }, [currentWithdrawAddressValidationKey, withdrawAddressValidatedKey, withdrawAddressValidError]);

  /**
   * Amount / OTP / button — only when address+network validated successfully by API.
   * Hide while verifying, on any validation error, or before a completed check (checkDone).
   */
  const showWithdrawContentAfterValidatedAddress = useMemo(() => {
    if (!withdrawAddress.trim() || !network) return false;
    return isWithdrawAddressValidated && !withdrawAddressValidError;
  }, [withdrawAddress, network, isWithdrawAddressValidated, withdrawAddressValidError]);


  useEffect(() => {
    if (!showWithdrawContentAfterValidatedAddress) {
      setWithdrawOtpPhaseActive(false);
      setOtp("");
    }
  }, [showWithdrawContentAfterValidatedAddress]);

  useEffect(() => {
    const raw = String(withdrawAmount ?? "").trim();
    if (!raw) {
      setWithdrawOtpPhaseActive(false);
      setOtp("");
    }
  }, [withdrawAmount]);

  const faqData = [
    {
      title: "How to Withdraw Crypto?",
      content: "To withdraw crypto, go to the withdrawal section, select your cryptocurrency, enter the recipient wallet address, choose the correct network, and specify the amount. Review the details carefully before confirming the withdrawal. Processing time may vary based on network congestion and withdrawal policies."
    },
    {
      title: "How to Withdraw Crypto Step-by-step Guide",
      content: "• Go to the Withdrawal Section – Navigate to the withdrawal page.\n• Select Your Crypto – Choose the cryptocurrency you want to withdraw.\n• Enter the Wallet Address – Make sure the address is correct and belongs to the selected blockchain network.\n• Choose the Network – Select the correct blockchain network (e.g., BEP20, ERC20, TRC20, Polygon).\n• Enter the Amount – Specify the amount you want to withdraw, ensuring it meets the minimum withdrawal limit.\n• Confirm & Submit – Review all details carefully and confirm the withdrawal.\n• Wait for Processing – Withdrawals are processed based on network congestion and request approval."
    },
    {
      title: "Withdrawal hasn't arrived?",
      content: "• Check Transaction Status – Use a blockchain explorer to track the transaction.\n• Verify the Wallet Address – Ensure the recipient address is correct.\n• Confirm Network Selection – The chosen network should match the recipient's wallet.\n• Check for Pending Processing – Some withdrawals require manual approval."
    }
  ];

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (isFirstLoad.current) {
          setWithdrawCoinsLoading(true);
        }
        try {
          await dispatch(getWithdrawActiveCoins());
        } finally {
          if (!cancelled) {
            setWithdrawCoinsLoading(false);
            isFirstLoad.current = false;
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [dispatch])
  );

  useEffect(() => {
    dispatch(getWithdrawActiveCoins());
    try {
      dispatch(getUserMainWallet("main"));
    } catch (e) {
      console.warn("Initial wallet fetch failed:", e);
    }
    // dispatch(getUserMainWallet("spot")); // Removed as it overwrites "main" balance in Redux and causes flickering
    dispatch(getNotificationList());
  }, [dispatch]);

  /** Runs every time route params change to support pre-filling from History / Withdraw Again when screen is already mounted */
  useEffect(() => {
    if (routeCoin && typeof routeCoin === "object" && Object.keys(routeCoin).length > 0) {
      userPickedCoinRef.current = true;
      setSelectedCurrency(routeCoin);

      const routeWithdrawTo = route?.params?.withdrawTo;
      const routeAgceRecipientTab = route?.params?.agceRecipientTab;
      const routeAgceRecipientEmail = route?.params?.agceRecipientEmail;
      const routeAgceRecipientPhone = route?.params?.agceRecipientPhone;
      const routeAgceRecipientId = route?.params?.agceRecipientId;
      const routeNetwork = route?.params?.network;
      const routeAddress = route?.params?.address;

      if (routeWithdrawTo) {
        setWithdrawToTab(routeWithdrawTo);
      } else {
        setWithdrawToTab("address");
      }
      if (routeAgceRecipientTab) {
        setAgceRecipientTab(routeAgceRecipientTab);
      }
      if (routeAgceRecipientEmail) {
        setAgceRecipientEmail(routeAgceRecipientEmail);
      } else {
        setAgceRecipientEmail("");
      }
      if (routeAgceRecipientPhone) {
        setAgceRecipientPhoneLocal(routeAgceRecipientPhone);
      } else {
        setAgceRecipientPhoneLocal("");
      }
      if (routeAgceRecipientId) {
        setAgceRecipientId(routeAgceRecipientId);
      } else {
        setAgceRecipientId("");
      }
      if (routeNetwork) {
        setNetwork(routeNetwork);
      } else {
        setNetwork("Select Network");
      }
      if (routeAddress) {
        setWithdrawAddress(routeAddress);
      } else {
        setWithdrawAddress("");
      }

      // Clear input amount and reset errors for a clean state
      setWithdrawAmount("");
      setWithdrawAmountTouched(false);
      setWithdrawAddressValidError("");
      setWithdrawAddressValidatedKey("");
      setWithdrawAddressCheckDone(false);
      setIsWithdrawAddressValidated(false);
    }
  }, [route?.params, routeCoin]);

  /** Default coin: USDT (web-style), else first asset with an active withdraw network. */
  useEffect(() => {
    if (userPickedCoinRef.current) return;
    if (!withdrawCoinsList.length) return;
    if (selectedCurrency && Object.keys(selectedCurrency).length > 0) return;
    const upper = (s) => String(s || "").toUpperCase();
    const usable = (c) => getActiveWithdrawChainKeys(c).length > 0;
    const usdt = withdrawCoinsList.find((c) => upper(c?.short_name) === "USDT" && usable(c));
    const fallback = withdrawCoinsList.find((c) => usable(c));
    const pick = usdt || fallback;
    if (pick) {
      setSelectedCurrency(pick);
      dispatch(getUserMainWallet("main"));
    }
  }, [withdrawCoinsList, selectedCurrency, dispatch]);

  /** Hydrate selectedCurrency with full details once catalog loads */
  useEffect(() => {
    if (!withdrawCoinsList.length || !selectedCurrency || Object.keys(selectedCurrency).length === 0) return;
    const sym = String(selectedCurrency.short_name || selectedCurrency.coin || "").toUpperCase();
    const hydrated = withdrawCoinsList.find((c) => String(c.short_name || c.coin || "").toUpperCase() === sym);
    if (hydrated && hydrated.min_withdrawal && JSON.stringify(hydrated.min_withdrawal) !== JSON.stringify(selectedCurrency.min_withdrawal)) {
      setSelectedCurrency(hydrated);
    }
  }, [withdrawCoinsList, selectedCurrency]);

  useEffect(() => {
    if (notificationList?.length > 0) {
      let announcement = notificationList?.filter((item) => item?.type === "announcement");
      if (announcement?.length === 1) {
        setAnnouncements([...announcement, ...announcement]);
      } else if (announcement?.length > 1) {
        setAnnouncements(announcement?.reverse());
      } else {
        setAnnouncements(announcement);
      }
    }
  }, [notificationList]);

  // Format announcements for accordion
  const formattedAnnouncements = announcements?.map((item) => ({
    title: item?.title,
    date: moment(item?.updatedAt).format("DD-MM-YYYY  hh:mm A"),
    content: item?.message || item?.description || item?.title,
    fullData: item
  })) || [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        dispatch(getWithdrawActiveCoins()),
        dispatch(getNotificationList()),
        refetchAddressBook(),
        fetchRecentAddresses(),
        reloadWithdrawal24hUsage?.()
      ]);
      // Attempt to fetch wallet, but don't let it crash the whole refresh if it returns 400
      try {
        await dispatch(getUserMainWallet("main"));
      } catch (e) {
        console.warn("Withdraw Wallet Fetch Error:", e);
      }
    } catch (e) {
      console.warn("Withdrawal Refresh Error:", e);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, reloadWithdrawal24hUsage]);

  useEffect(() => {
    setAvailableBalance(String(totalSpendableFromFundRow(mainWalletFundRow)));
  }, [mainWalletFundRow]);

  useEffect(() => {
    const keys = getActiveWithdrawChainKeys(selectedCurrency);
    if (network && (keys.length === 0 || !keys.includes(network))) {
      setNetwork("");
    }
  }, [selectedCurrency, network]);

  useEffect(() => {
    let cancelled = false;
    const fetchAddressBook = async () => {
      try {
        setAddressBookLoading(true);
        const res = await appOperation.customer.get_wallet_address_book();
        if (!cancelled && res?.success && res?.data) {
          const list = Array.isArray(res.data) ? res.data : (res.data.rows || res.data.addresses || []);
          setAddressBookEntries(list);
        }
      } catch (err) {
        // ignore
      } finally {
        if (!cancelled) setAddressBookLoading(false);
      }
    };
    fetchAddressBook();
    return () => { cancelled = true; };
  }, []);

  const refetchAddressBook = async () => {
    try {
      setAddressBookLoading(true);
      const res = await appOperation.customer.get_wallet_address_book();
      if (res?.success && res?.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data.rows || res.data.addresses || []);
        setAddressBookEntries(list);
      }
    } catch (err) {
      // ignore
    } finally {
      setAddressBookLoading(false);
    }
  };

  const handleSelectAddressFromBook = useCallback((item) => {
    if (!item) return;
    setWithdrawAddress(item.address || "");
    const net = item.network || item.chain;
    if (net) {
      setNetwork(net);
    }
    // Also trigger validation
    setTimeout(() => {
      validateWithdrawAddressApiRef.current?.();
    }, 100);
    setIsAddressBookModalVisible(false);
  }, []);

  const handleConfirmDeleteAddress = async () => {
    if (!addressToDelete) return;
    try {
      setAddressDeleteBusy(true);
      const id = addressToDelete._id || addressToDelete.id;
      const res = await appOperation.customer.delete_wallet_address_book(id);
      if (res?.success) {
        showSuccess(res?.message || "Address removed");
        addressDeleteSheetRef.current?.close();
        setAddressToDelete(null);
        void refetchAddressBook();
      } else {
        showError(res?.message || "Could not remove address");
      }
    } catch (err) {
      showError("An error occurred while removing the address");
    } finally {
      setAddressDeleteBusy(false);
    }
  };

  const getDeleteModalTitle = (entry) => {
    if (!entry) return "Remove address?";
    const st = String(entry.status || "").toUpperCase();
    if (st === "APPROVED" || st === "ACTIVE") return "Remove whitelisted address?";
    if (st.startsWith("PENDING")) return "Remove whitelisted address?";
    return "Remove saved address?";
  };

  const getDeleteModalMessage = (entry) => {
    if (!entry) return "";
    const label = entry.name || entry.label || "Address";
    const coin = entry.coin || "";
    const network = entry.network || entry.chain || "";
    const addr = entry.address || "";
    const shortAddr = addr ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : "";

    const parts = [coin, network].filter(Boolean);
    const meta = parts.length ? parts.join(" · ") : "";
    const head = meta ? `${label} — ${meta} — ${shortAddr}` : `${label} (${shortAddr})`;

    const st = String(entry.status || "").toUpperCase();
    if (st === "APPROVED" || st === "ACTIVE") {
      return `You are about to remove ${head}. You will need to verify this address again before you can withdraw to it.`;
    }
    if (st.startsWith("PENDING")) {
      return `You are about to remove ${head}. Any in-progress verification will be cancelled.`;
    }
    return `Remove ${head} from your saved addresses?`;
  };

  const isPendingSatoshiDeposit = (entry) => {
    if (!entry) return false;
    const st = String(entry.status || "").toUpperCase().replace(/-/g, "_").trim();
    if (!st || st === "APPROVED" || st === "REJECTED" || st === "EXPIRED") return false;
    // Not MetaMask pending
    const method = String(entry.whitelist_method || entry.whitelistMethod || "").toUpperCase();
    if (method === "METAMASK") return false;
    // Must have a pending satoshi/proof amount
    const amt = entry.satoshi_amount ?? entry.proof_amount ?? entry.satoshiAmount ?? entry.proofAmount;
    if (amt == null || String(amt).trim() === "") return false;
    return true;
  };

  /** Web parity: addressBookEntryPendingMetaMaskSignature */
  const isPendingMetaMaskSign = (entry) => {
    if (!entry) return false;
    const st = String(entry.status || "").toUpperCase().replace(/-/g, "_").trim();
    if (st !== "PENDING_SIGNATURE") return false;
    const method = String(entry.whitelist_method || entry.whitelistMethod || "").toUpperCase();
    if (method !== "METAMASK") return false;
    const challenge = entry.metamask_challenge ?? entry.metamaskChallenge ?? "";
    const eid = entry._id ?? entry.id;
    return Boolean(eid && String(challenge).trim());
  };

  /** Resume satoshi whitelist flow from an existing address book entry */
  const handleResumeSatoshiFromAddressBook = async (entry) => {
    if (!isPendingSatoshiDeposit(entry)) return;
    const eid = entry._id || entry.id;
    const proofAmount = String(entry.satoshi_amount ?? entry.proof_amount ?? entry.satoshiAmount ?? entry.proofAmount ?? "").trim();
    const proofAsset = String(entry.satoshi_asset ?? entry.proof_asset ?? entry.coin ?? entry.short_name ?? "").trim().toUpperCase();
    const proofChain = String(entry.satoshi_chain ?? entry.proof_chain ?? entry.chain ?? "").trim().toUpperCase();
    const shortName = String(entry.coin ?? entry.short_name ?? proofAsset ?? "").trim().toUpperCase();

    // Resolve tokenAssetId
    const coinObj = withdrawCoinsList.find(c => String(c.short_name || c.coin || "").toUpperCase() === shortName);
    let tokenAssetId = String(entry.token_asset_id ?? entry.tokenAssetId ?? "").trim();
    if (!tokenAssetId && coinObj) {
      if (coinObj.token_asset_ids && proofChain) {
        tokenAssetId = coinObj.token_asset_ids[proofChain] || coinObj.token_asset_ids[proofChain.toLowerCase()] || "";
        if (!tokenAssetId) {
          const fuzzyKey = Object.keys(coinObj.token_asset_ids).find(k =>
            k.toUpperCase().includes(proofChain) || proofChain.includes(k.toUpperCase())
          );
          if (fuzzyKey) tokenAssetId = coinObj.token_asset_ids[fuzzyKey];
        }
      }
      if (!tokenAssetId) {
        const net = coinObj.networks?.find(n =>
          String(n.code).toUpperCase() === proofChain ||
          String(n.short_name || "").toUpperCase() === proofChain
        );
        if (net) tokenAssetId = net.tokenAssetId || net.assetId || net.id || "";
      }
    }
    if (!tokenAssetId) tokenAssetId = proofChain || shortName;

    // Set whitelist data and open satoshi step
    const flowData = {
      id: eid,
      proof_amount: proofAmount,
      proof_asset: proofAsset || shortName,
      proof_chain: proofChain,
      tokenAssetId,
      shortName: shortName || proofAsset,
      expires_at: entry.satoshi_expires_at ?? entry.proof_expires_at ?? entry.expires_at ?? "",
    };
    setSaveAddrWhitelistData(flowData);
    setSaveAddrStep("satoshi");
    setSatoshiDepositLoading(true);
    setSatoshiWhitelistAwaitingProof(false);
    setSatoshiResumeMode(true);
    setSaveAddrLabel(entry.name || entry.label || "");
    setSaveAddrCoin(shortName);
    setSaveAddrAddress(entry.address || "");
    setSaveAddrNetwork(entry.network || entry.chain || "");
    saveAddressSheetRef.current?.open();

    // Fetch deposit address
    setSatoshiDepositError("");
    try {
      const addrRes = await appOperation.customer.get_and_generate_address({
        assetId: tokenAssetId,
        tokenAssetId: tokenAssetId,
        short_name: shortName,
        generate: true
      });
      if (addrRes?.success === false) {
        setSatoshiDepositError(addrRes?.message || "Could not load deposit address.");
      } else if (addrRes?.success) {
        const dr = addrRes.data?.data || addrRes.data || {};
        const raw = dr.deposit_address || dr.address || dr.wallet_address || dr.walletAddress || dr.depositAddress || "";
        const mem = dr.memo || dr.tag || dr.destinationTag || dr.memoTag || "";
        if (raw) {
          setSaveAddrWhitelistData(prev => ({
            ...prev,
            deposit_address: String(raw),
            address: String(raw),
            memo: String(mem)
          }));
        } else {
          setSatoshiDepositError("No deposit address returned.");
        }
      } else {
        setSatoshiDepositError("Could not load deposit address.");
      }
    } catch (e) {
      console.warn("Resume satoshi fetch failed", e);
      setSatoshiDepositError(e?.message || "Could not load deposit address.");
    } finally {
      setSatoshiDepositLoading(false);
    }
  };

  /** Resume MetaMask whitelist signature flow from an existing address book entry */
  const handleResumeMetaMaskFromAddressBook = (entry) => {
    if (!isPendingMetaMaskSign(entry)) return;
    const eid = entry._id || entry.id;
    const challenge = String(entry.metamask_challenge ?? entry.metamaskChallenge ?? "").trim();
    const expiresAt = entry.metamask_expires_at ?? entry.metamaskExpiresAt ?? "";

    if (expiresAt) {
      const t = Date.parse(expiresAt);
      if (Number.isFinite(t) && Date.now() > t) {
        showError("This MetaMask verification window has expired. Remove the address and add it again.");
        return;
      }
    }

    setSaveAddrWhitelistData({
      id: String(eid),
      challenge,
      expires_at: expiresAt,
    });
    setSaveAddrStep("metamask");
    saveAddressSheetRef.current?.open();
  };

  const fetchRecentAddresses = useCallback(async (cancelledVal = { val: false }) => {
    try {
      setRecentAddressesLoading(true);
      const res = await appOperation.customer.withdrawal_address_history();
      if (!cancelledVal.val && res?.success && res?.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data.data || []);
        const mapped = list.map(item => ({
          address: item.address,
          network: item.chain || item.network,
          coin: item.coin,
          last_used: item.last_used_at,
          times_used: item.times_used,
          status: item.status || item.transaction_status || item.state || "",
          last_status: item.last_status || ""
        }));
        setRecentAddresses(mapped);
      }
    } catch (err) {
      // ignore
    } finally {
      if (!cancelledVal.val) setRecentAddressesLoading(false);
    }
  }, []);

  useEffect(() => {
    const cv = { val: false };
    fetchRecentAddresses(cv);
    return () => { cv.val = true; };
  }, [fetchRecentAddresses]);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setDisableBtn(false);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleOpenSaveAddressSheet = (item = null) => {
    resetAddAddressForm(); // Ensure everything is fresh
    if (item && typeof item === "object") {
      setSaveAddrLabel(item.name || item.label || "");
      setSaveAddrCoin(item.coin || "");
      setSaveAddrAddress(item.address || "");
      setSaveAddrNetwork(item.network || item.chain || "");
      if (item.memo) setSaveAddrMemo(item.memo);
    } else {
      const coinSym = selectedCurrency?.short_name || "USDT";
      setSaveAddrCoin(coinSym);
      setSaveAddrAddress("");
      setSaveAddrNetwork(""); // Always start fresh for a new manual entry
    }
    saveAddressSheetRef.current?.open();
  };

  const handleHeaderBack = () => {
    NavigationService.goBack();
  };



  const openAgceCountrySheet = useCallback(() => {
    setTimeout(() => agceCountrySheetRef.current?.open(), 0);
  }, []);

  const handleSelectCurrency = (coin) => {
    if (!coin || typeof coin !== "object") return;
    const keys = getActiveWithdrawChainKeys(coin);
    if (keys.length === 0) {
      const rawLen = networkKeysFromChain(coin?.chain).length;
      const hasChainsArr = Array.isArray(coin?.chains) && coin.chains.length > 0;
      if (rawLen === 0 && !hasChainsArr) {
        showError("No withdrawal network available for this coin");
      } else {
        showError("No active withdrawal network for this coin");
      }
      return;
    }
    userPickedCoinRef.current = true;
    setSelectedCurrency(coin);
    setNetwork("");
    setWithdrawAmount("");
    setWithdrawAmountTouched(false);
    setWithdrawOtpPhaseActive(false);
    setOtp("");
    setWithdrawAddress("");
    setWithdrawAddressTouched(false);
    setWithdrawAddressValidError("");
    setWithdrawAddressValidatedKey("");
    setWithdrawAddressCheckDone(false);
    setIsWithdrawAddressValidating(false);
    setWithdrawToTab("address");
    dispatch(getUserMainWallet("main"));

  };

  const handleWithdrawalAddress = (value) => {
    setWithdrawAddress(value);
    if (!withdrawAddressTouched) setWithdrawAddressTouched(true);
    setWithdrawOtpPhaseActive(false);
    setOtp("");
    setWithdrawAddressValidError("");
    setWithdrawAddressValidatedKey("");
    setWithdrawAddressCheckDone(false);
    setIsWithdrawAddressValidated(false);
  };

  /** Web parity: `withdrawAddressInlineError` (useWithdrawPageController ~1000-1005). */
  const withdrawAddressInlineError = useMemo(() => {
    if (withdrawToTab !== "address") return "";
    if (!withdrawAddressTouched) return "";
    if (withdrawAddress.trim().length > 0) return "";
    return "Please enter Recipient's Address";
  }, [withdrawAddress, withdrawAddressTouched, withdrawToTab]);

  const validateWithdrawAddressApi = useCallback(async () => {
    const addr = String(withdrawAddress || "").trim();
    const net = String(network || "").trim();
    if (!addr || !net) return false;
    const validatedKey = withdrawalAddressValidationKey(net, addr, selectedTokenAssetId);
    if (validatedKey && withdrawAddressValidatedKey === validatedKey) {
      setWithdrawAddressValidError("");
      setWithdrawAddressCheckDone(true);
      return true;
    }
    const reqId = ++withdrawAddressValidationReqIdRef.current;
    setIsWithdrawAddressValidating(true);
    try {
      const chainCanon = canonicalWithdrawalChainForValidateAddress(net) || net.toUpperCase();
      const body = { address: addr, chain: chainCanon };
      if (selectedTokenAssetId) body.tokenAssetId = selectedTokenAssetId;
      let r;
      try {
        r = await appOperation.customer.validate_withdraw_address(body);
      } catch {
        r = await appOperation.post("wallet/validate-address", body, CUSTOMER_TYPE);
      }
      if (reqId !== withdrawAddressValidationReqIdRef.current) return false;

      const root = r && typeof r === "object" ? r : {};
      const inner = root.data != null && typeof root.data === "object" && !Array.isArray(root.data) ? root.data : null;
      const data = inner || root;

      const validTrue =
        root.valid === true ||
        data.valid === true ||
        (typeof data.valid === "string" && String(data.valid).toLowerCase() === "true");
      const validFalse =
        root.valid === false ||
        data.valid === false ||
        (typeof data.valid === "string" && String(data.valid).toLowerCase() === "false");

      if (validFalse) {
        setWithdrawAddressValidatedKey("");
        const msg = String(data?.message || root?.message || "").trim();
        setWithdrawAddressValidError(msg && msg.toLowerCase() !== "ok" ? msg : `Invalid address for ${net}`);
        return false;
      }

      const successFlag = root.success === true || data.success === true;
      const msg = String(data?.message || root?.message || "").trim();
      const isAlreadyWhitelisted = msg.toLowerCase().includes("already whitelisted");

      const ok = (successFlag && validTrue) || validTrue === true || isAlreadyWhitelisted;

      if (ok) {
        setWithdrawAddressValidError("");
        setWithdrawAddressValidatedKey(validatedKey);
        setIsWithdrawAddressValidated(true);
        return true;
      }
      setWithdrawAddressValidatedKey("");
      setIsWithdrawAddressValidated(false);
      setWithdrawAddressValidError(msg && msg.toLowerCase() !== "ok" ? msg : `Invalid address for ${net}`);
      return false;
    } catch (e) {
      if (reqId !== withdrawAddressValidationReqIdRef.current) return false;
      setWithdrawAddressValidatedKey("");
      setIsWithdrawAddressValidated(false);
      const msg = String(e?.message || e?.msg || "").trim();
      setWithdrawAddressValidError(msg || `Invalid address for ${net}`);
      return false;
    } finally {
      if (reqId === withdrawAddressValidationReqIdRef.current) {
        setIsWithdrawAddressValidating(false);
        setWithdrawAddressCheckDone(true);
      }
    }
  }, [withdrawAddress, network, selectedTokenAssetId, withdrawAddressValidatedKey]);

  const validateWithdrawAddressApiRef = useRef(validateWithdrawAddressApi);
  validateWithdrawAddressApiRef.current = validateWithdrawAddressApi;

  const saveAddrAddressInlineError = useMemo(() => {
    return "";
  }, []);

  // --- Save Address Validation ---
  const saveAddrTokenAssetId = useMemo(() => {
    if (!saveAddrNetwork || !saveAddrCoinObj) return "";
    return saveAddrCoinObj.token_asset_ids?.[saveAddrNetwork] || "";
  }, [saveAddrNetwork, saveAddrCoinObj]);

  const validateSaveAddrAddressApi = useCallback(async () => {
    const addr = String(saveAddrAddress || "").trim();
    const net = String(saveAddrNetwork || "").trim();
    if (!addr || !net) return false;

    const validatedKey = withdrawalAddressValidationKey(net, addr, saveAddrTokenAssetId);
    if (validatedKey && saveAddrAddressValidatedKey === validatedKey) {
      setSaveAddrAddressValidError("");
      return true;
    }

    const reqId = ++saveAddrValidateReqIdRef.current;
    setSaveAddrAddressValidating(true);

    try {
      const chainCanon = canonicalWithdrawalChainForValidateAddress(net) || net.toUpperCase();
      const body = { address: addr, chain: chainCanon };
      if (saveAddrTokenAssetId) body.tokenAssetId = saveAddrTokenAssetId;

      let r;
      try {
        r = await appOperation.customer.validate_withdraw_address(body);
      } catch {
        r = await appOperation.post("wallet/validate-address", body, CUSTOMER_TYPE);
      }
      if (reqId !== saveAddrValidateReqIdRef.current) return false;

      const root = r && typeof r === "object" ? r : {};
      const inner = root.data != null && typeof root.data === "object" && !Array.isArray(root.data) ? root.data : null;
      const data = inner || root;

      const validTrue = root.valid === true || data.valid === true || (typeof data.valid === "string" && String(data.valid).toLowerCase() === "true");
      const validFalse = root.valid === false || data.valid === false || (typeof data.valid === "string" && String(data.valid).toLowerCase() === "false");

      if (validFalse) {
        setSaveAddrAddressValidatedKey("");
        const msg = String(data?.message || root?.message || "").trim();
        setSaveAddrAddressValidError(msg && msg.toLowerCase() !== "ok" ? msg : `Invalid address for ${net}`);
        return false;
      }

      const successFlag = root.success === true || data.success === true;
      const msg = String(data?.message || root?.message || "").trim();
      const isAlreadyWhitelisted = msg.toLowerCase().includes("already whitelisted");

      const ok = (successFlag && validTrue) || validTrue === true || isAlreadyWhitelisted;

      if (ok) {
        setSaveAddrAddressValidError("");
        setSaveAddrAddressValidatedKey(validatedKey);
        return true;
      }

      setSaveAddrAddressValidatedKey("");
      setSaveAddrAddressValidError(msg && msg.toLowerCase() !== "ok" ? msg : `Invalid address for ${net}`);
      return false;
    } catch (e) {
      if (reqId !== saveAddrValidateReqIdRef.current) return false;
      setSaveAddrAddressValidatedKey("");
      const msg = String(e?.message || e?.msg || "").trim();
      setSaveAddrAddressValidError(msg || `Invalid address for ${net}`);
      return false;
    } finally {
      if (reqId === saveAddrValidateReqIdRef.current) {
        setSaveAddrAddressValidating(false);
      }
    }
  }, [saveAddrAddress, saveAddrNetwork, saveAddrTokenAssetId, saveAddrAddressValidatedKey]);

  const validateSaveAddrAddressApiRef = useRef(validateSaveAddrAddressApi);
  validateSaveAddrAddressApiRef.current = validateSaveAddrAddressApi;

  useEffect(() => {
    const addr = String(saveAddrAddress || "").trim();
    const net = String(saveAddrNetwork || "").trim();
    if (!addr || !net) {
      if (saveAddrValidateDebounceTimerRef.current) {
        clearTimeout(saveAddrValidateDebounceTimerRef.current);
        saveAddrValidateDebounceTimerRef.current = null;
      }
      setSaveAddrAddressValidError("");
      setSaveAddrAddressValidatedKey("");
      setSaveAddrAddressValidating(false);
      return undefined;
    }

    const validatedKey = withdrawalAddressValidationKey(net, addr, saveAddrTokenAssetId);
    if (validatedKey && saveAddrAddressValidatedKey === validatedKey) {
      setSaveAddrAddressValidating(false);
      return undefined;
    }

    if (saveAddrValidateDebounceTimerRef.current) {
      clearTimeout(saveAddrValidateDebounceTimerRef.current);
      saveAddrValidateDebounceTimerRef.current = null;
    }

    saveAddrValidateDebounceTimerRef.current = setTimeout(() => {
      saveAddrValidateDebounceTimerRef.current = null;
      void validateSaveAddrAddressApiRef.current?.();
    }, 500);

    return () => {
      if (saveAddrValidateDebounceTimerRef.current) {
        clearTimeout(saveAddrValidateDebounceTimerRef.current);
        saveAddrValidateDebounceTimerRef.current = null;
      }
    };
  }, [saveAddrAddress, saveAddrNetwork, saveAddrTokenAssetId, saveAddrAddressValidatedKey]);

  useEffect(() => {
    if (withdrawToTab !== "address") {
      withdrawAddressValidationReqIdRef.current += 1;
      if (withdrawAddrValidateDebounceTimerRef.current) {
        clearTimeout(withdrawAddrValidateDebounceTimerRef.current);
        withdrawAddrValidateDebounceTimerRef.current = null;
      }
      setWithdrawAddressValidError("");
      setWithdrawAddressValidatedKey("");
      setWithdrawAddressCheckDone(false);
      setIsWithdrawAddressValidating(false);
    }
  }, [withdrawToTab]);

  useEffect(() => {
    if (withdrawToTab !== "address") return undefined;
    const addr = String(withdrawAddress || "").trim();
    const net = String(network || "").trim();
    if (!addr || !net) {
      if (withdrawAddrValidateDebounceTimerRef.current) {
        clearTimeout(withdrawAddrValidateDebounceTimerRef.current);
        withdrawAddrValidateDebounceTimerRef.current = null;
      }
      setWithdrawAddressValidError("");
      setWithdrawAddressValidatedKey("");
      setWithdrawAddressCheckDone(false);
      setIsWithdrawAddressValidating(false);
      return undefined;
    }

    const validatedKey = withdrawalAddressValidationKey(net, addr, selectedTokenAssetId);
    if (validatedKey && withdrawAddressValidatedKey === validatedKey) {
      setIsWithdrawAddressValidating(false);
      return undefined;
    }

    if (withdrawAddrValidateDebounceTimerRef.current) {
      clearTimeout(withdrawAddrValidateDebounceTimerRef.current);
      withdrawAddrValidateDebounceTimerRef.current = null;
    }
    withdrawAddrValidateDebounceTimerRef.current = setTimeout(() => {
      withdrawAddrValidateDebounceTimerRef.current = null;
      void validateWithdrawAddressApiRef.current?.();
    }, 500);

    return () => {
      if (withdrawAddrValidateDebounceTimerRef.current) {
        clearTimeout(withdrawAddrValidateDebounceTimerRef.current);
        withdrawAddrValidateDebounceTimerRef.current = null;
      }
    };
  }, [withdrawToTab, withdrawAddress, network, selectedTokenAssetId, withdrawAddressValidatedKey]);

  const reloadWithdrawal24hUsage = useCallback(async () => {
    const coin = String(selectedCurrency?.short_name || "").trim();
    if (!coin) {
      setWithdraw24hUsage(null);
      return;
    }
    try {
      const r = await appOperation.customer.withdrawal_24h_usage(coin);
      const root = r && typeof r === "object" ? r : {};
      const inner = root.data != null && typeof root.data === "object" && !Array.isArray(root.data) ? root.data : null;
      const data = inner || root;
      const ok = root.success === true || (data && (data.remaining != null || data.limit != null));
      if (ok && data && typeof data === "object") {
        setWithdraw24hUsage({
          remaining: data.remaining,
          limit: data.limit,
          used: data.used,
        });
      } else {
        setWithdraw24hUsage(null);
      }
    } catch {
      setWithdraw24hUsage(null);
    }
  }, [selectedCurrency?.short_name]);

  useEffect(() => {
    void reloadWithdrawal24hUsage();
  }, [reloadWithdrawal24hUsage]);

  /** Web `effectiveAvailable` + `handleWithdrawMaxClick` (useWithdrawPageController). */
  const effectiveWithdrawAvailable = useMemo(
    () => parseFloat(formatFundAvailableFromRow(mainWalletFundRow)) || 0,
    [mainWalletFundRow]
  );

  /** Web `withdrawAmountInlineError` (useWithdrawPageController ~1007–1019). */
  const withdrawAmountInlineError = useMemo(() => {
    if (!withdrawAmountTouched) return "";
    const raw = String(withdrawAmount || "").trim();
    const amt = Number.parseFloat(raw.replace(/,/g, ""));
    if (!raw) return "";
    if (!Number.isFinite(amt) || amt <= 0) {
      return `Minimum withdrawal limit is ${formatWithdrawAmountDisplay(chainMinWithdrawal)}.`;
    }
    if (chainMinWithdrawal > 0 && amt < chainMinWithdrawal) {
      return `Minimum withdrawal limit is ${formatWithdrawAmountDisplay(chainMinWithdrawal)}.`;
    }
    if (effectiveWithdrawAvailable > 0 && amt > effectiveWithdrawAvailable) return "Insufficient funds";
    return "";
  }, [
    withdrawAmount,
    withdrawAmountTouched,
    effectiveWithdrawAvailable,
    chainMinWithdrawal,
  ]);

  /** Web `isWithdrawFormValid` amount part (~953–959) + amount must cover fee (app / existing checks). */
  const withdrawAmountOkForSubmit = useMemo(() => {
    const raw = String(withdrawAmount || "").trim();
    const amtNum = Number.parseFloat(raw.replace(/,/g, ""));
    if (!raw || !Number.isFinite(amtNum) || amtNum <= 0) return false;
    if (chainMinWithdrawal > 0 && amtNum < chainMinWithdrawal) return false;
    if (effectiveWithdrawAvailable > 0 && amtNum > effectiveWithdrawAvailable) return false;
    // For internal transfers (AGCE User), fee is 0 and no network is selected.
    if (withdrawToTab === "agce_user") return true;
    const fee = parseNum(valueForChain(selectedCurrency, "withdrawal_fee", network), 0);
    if (fee > 0 && amtNum < fee) return false;
    return true;
  }, [withdrawAmount, chainMinWithdrawal, effectiveWithdrawAvailable, selectedCurrency, network, withdrawToTab]);

  const handleMaxWithdrawal = useCallback(() => {
    if (!selectedCurrency || Object.keys(selectedCurrency).length === 0) return;
    if (effectiveWithdrawAvailable <= 0) return;
    setWithdrawAmount(sanitizeWithdrawAmountRaw(String(effectiveWithdrawAvailable)));
    setWithdrawAmountTouched(true);
  }, [selectedCurrency, effectiveWithdrawAvailable]);

  const onWithdrawMetaRefresh = useCallback(async () => {
    if (isWithdrawMetaRefreshing) return;
    setIsWithdrawMetaRefreshing(true);
    try {
      await Promise.all([
        dispatch(getWithdrawActiveCoins()),
        dispatch(getUserMainWallet("main")),
        reloadWithdrawal24hUsage(),
      ]);
    } finally {
      setIsWithdrawMetaRefreshing(false);
    }
  }, [dispatch, isWithdrawMetaRefreshing, reloadWithdrawal24hUsage]);

  const handleGetOtp = async () => {
    if (!selectedCurrency || Object.keys(selectedCurrency).length === 0) {
      showError("Please select a coin first");
      return;
    }
    // Web parity: network is not required for internal (AGCE User) transfers.
    if (withdrawToTab === "address" && !network) {
      showError("Please select a network first");
      return;
    }
    if (isWithdrawAddressValidating) {
      showError("Please wait while the address is being verified");
      return;
    }
    if (!withdrawAddress || !isWithdrawAddressValid) {
      showError("Please enter a valid wallet address");
      return;
    }
    if (!withdrawAmount || String(withdrawAmount).trim() === "") {
      showError("Please enter withdrawal amount");
      return;
    }
    if (withdrawAmountInlineError) {
      showError(withdrawAmountInlineError);
      return;
    }
    if (!withdrawAmountOkForSubmit) {
      showError(withdrawAmountInlineError || "Please check withdrawal amount");
      return;
    }
    if (!emailId || emailId === "") {
      showError("Please update email in profile section");
      return;
    }

    setDisableBtn(true);
    setTimer(60);
    setOtpText("Resend OTP");
    Keyboard.dismiss();

    /** Web: `sendWithdrawalVerificationOtp` then `sendWithdrawOtp` fallback (`withdrawService.js`). */
    let ok = false;
    let message = "";
    try {
      const r = await appOperation.customer.withdrawal_verification_otp({ method: "email" });
      const root = r && typeof r === "object" ? r : {};
      if (root.success === true || root.success === 1) {
        ok = true;
        message = String(root.message || "").trim();
      }
    } catch {
      /* try fallback */
    }
    if (!ok) {
      try {
        const r2 = await appOperation.customer.user_send_otp_withdrawal({
          email_or_phone: emailId,
          resend: true, // we are already in resend mode if timer is active or triggered
        });
        const root2 = r2 && typeof r2 === "object" ? r2 : {};
        if (root2.success === true || root2.success === 1) {
          ok = true;
          message = String(root2.message || "").trim();
        } else {
          message = String(root2.message || "Could not send verification code").trim();
        }
      } catch (e) {
        message = String(e?.message || "Could not send verification code");
      }
    }

    if (ok) {
      showSuccess(message || "Verification code sent");
    } else {
      showError(message || "Could not send verification code");
      // If it failed immediately, maybe we should give the user another chance?
      // But usually, 60s wait is fine.
    }
  };



  useEffect(() => {
    if (withdrawOtpPhaseActive) {
      handleGetOtp();
    }
  }, [withdrawOtpPhaseActive]);

  const handleSatoshiWhitelistSent = async () => {
    if (!saveAddrWhitelistData?.id || saveAddrSatoshiPolling) return;
    setSaveAddrSatoshiPolling(true);
    try {
      console.warn("[API] Confirming Satoshi with ID:", saveAddrWhitelistData.id);
      const res = await appOperation.customer.confirm_satoshi_address_book(saveAddrWhitelistData.id);
      console.warn("[API] Satoshi Confirmation Response:", JSON.stringify(res, null, 2));
      if (res?.success) {
        if (res.data?.status === "APPROVED") {
          showSuccess(res.message || "Address ownership verified successfully!");
          // Reload address book
          const res2 = await appOperation.customer.get_wallet_address_book();
          if (res2?.success && res2?.data) {
            const list = Array.isArray(res2.data) ? res2.data : (res2.data.rows || res2.data.addresses || []);
            setAddressBookEntries(list);
          }
          saveAddressSheetRef.current?.close();
        } else {
          // If not approved but success is true, it means it's still pending
          setSatoshiWhitelistAwaitingProof(true);
          showSuccess(res.message || "Verification is still pending. Please wait for the payment to be detected.");
        }
      } else {
        showError(res?.message || "Verification not confirmed yet.");
      }
    } catch (e) {
      showError(e?.message || "Verification failed");
    } finally {
      setSaveAddrSatoshiPolling(false);
    }
  };

  const handleResendSaveAddrOtp = async () => {
    if (!saveAddrResendActive || saveAddrBusy) return;

    const method = "email";
    setSaveAddrBusy(true);
    try {
      // Try primary endpoint first (Web parity)
      let res = await appOperation.customer.send_address_book_verification_otp({ method });

      // If primary fails, try fallback endpoint (Security OTP)
      if (!res?.success) {
        res = await appOperation.customer.withdrawal_verification_otp({ method });
      }

      if (res?.success) {
        setSaveAddrOtpTimer(60);
        setSaveAddrResendActive(false);
        showSuccess(res.message || "Verification code resent");
      } else {
        showError(res?.message || "Could not resend code");
      }
    } catch (e) {
      showError("Error resending verification code");
    } finally {
      setSaveAddrBusy(false);
    }
  };

  const handleFinalWithdraw = async () => {
    withdrawConfirmSheetRef.current?.close();

    const isAgce = withdrawToTab === "agce_user";
    const chainForSubmit = isAgce ? "internal" : network;
    const tokenFromMap = isAgce ? null : selectedCurrency?.token_asset_ids?.[network];
    const tokenAssetId = tokenFromMap != null && String(tokenFromMap).trim() ? String(tokenFromMap).trim() : "";

    let data = {
      coinName: String(selectedCurrency?.short_name || selectedCurrency?.coin || "").toUpperCase(),
      amount: withdrawAmount,
      withdrawal_address: isAgce ? agceRecipientEmail || agceRecipientPhoneLocal || agceRecipientId : withdrawAddress,
      chain: chainForSubmit,
      tokenAssetId: tokenAssetId || chainForSubmit, // Web fallback
    };

    if (isAgce) {
      if (agceRecipientTab === "agce") data.address = agceRecipientId;
      else data.email_or_phone = agceRecipientEmail || agceRecipientPhoneLocal;
    }

    const passkeyEnabled = withdrawSecuritySettings?.passkey_enabled === true;
    if (passkeyEnabled) {
      try {
        const credential = await dispatch(getWithdrawalPasskeyCredential(false));
        if (credential) {
          await dispatch(withdrawCoin({ ...data, passkey_credential: credential }));
        } else {
          // If user cancels or no credential found, open combined verify
          setEmailVerifyCode("");
          setMobileVerifyCode("");
          setAuthAppCode("");
          setWithdrawFundPassword("");
          setIsWithdrawVerifyCombinedOpen(true);
        }
      } catch (err) {
        setEmailVerifyCode("");
        setMobileVerifyCode("");
        setAuthAppCode("");
        setWithdrawFundPassword("");
        setIsWithdrawVerifyCombinedOpen(true);
      }
    } else {
      // If passkey is not enabled, directly open the combined verification screen (same as web flow)
      setEmailVerifyCode("");
      setMobileVerifyCode("");
      setAuthAppCode("");
      setWithdrawFundPassword("");
      setIsWithdrawVerifyCombinedOpen(true);
    }
  };

  const submitWithdrawalWithEnabledMethods = async () => {
    setIsWithdrawSubmitLoading(true);
    const isAgce = withdrawToTab === "agce_user";
    const chainForSubmit = isAgce ? "internal" : network;
    const tokenFromMap = isAgce ? null : selectedCurrency?.token_asset_ids?.[network];
    const tokenAssetId = tokenFromMap != null && String(tokenFromMap).trim() ? String(tokenFromMap).trim() : "";

    const idempotency_key = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    let data = {
      coinName: String(selectedCurrency?.short_name || selectedCurrency?.coin || "").toUpperCase(),
      amount: Number.parseFloat(String(withdrawAmount || "").replace(/,/g, "")),
      withdrawal_address: isAgce ? (agceRecipientTab === "agce" ? agceRecipientId : agceRecipientEmail || agceRecipientPhoneLocal) : withdrawAddress,
      address: isAgce ? (agceRecipientTab === "agce" ? agceRecipientId : agceRecipientEmail || agceRecipientPhoneLocal) : withdrawAddress,
      chain: chainForSubmit,
      tokenAssetId: tokenAssetId || chainForSubmit,
      idempotency_key,
    };

    if (isAgce) {
      if (agceRecipientTab !== "agce") data.email_or_phone = agceRecipientEmail || agceRecipientPhoneLocal;
    }

    const methods = getNonPasskeyEnabledMethods();
    if (methods.includes("email")) data.email_code = String(emailVerifyCode || "").trim();
    if (methods.includes("mobile")) data.mobile_code = String(mobileVerifyCode || "").trim();
    if (methods.includes("google_authenticator")) data.google_authenticator_code = String(authAppCode || "").trim();
    if (methods.includes("fund_password")) data.fund_password = String(withdrawFundPassword || "").trim();

    try {
      await dispatch(withdrawCoin(data));
      setIsWithdrawVerifyCombinedOpen(false);
    } catch (err) {
      if (err.message === "PASSKEY_CANCELLED") {
        setIsWithdrawVerifyCombinedOpen(true);
      }
    } finally {
      setIsWithdrawSubmitLoading(false);
    }
  };
  /** Web `WithdrawPageStep3Overlays`: first Withdrawal opens verify; OTP is not required to enable the first tap. */
  const handleWithdrawPrimaryPress = () => {
    if (!withdrawOtpPhaseActive) {
      setWithdrawAmountTouched(true);
      if (!selectedCurrency || Object.keys(selectedCurrency).length === 0) {
        showError("Please select a coin first");
        return;
      }
      if (withdrawToTab === "address") {
        if (!network) {
          showError("Please select a network first");
          return;
        }
        if (isWithdrawAddressValidating) {
          showError("Please wait while the address is being verified");
          return;
        }

        const isWhitelistedLocally = (withdrawAddressValidError && withdrawAddressValidError.toLowerCase().includes("whitelisted"));
        if (!withdrawAddress || (!isWithdrawAddressValid && !isWhitelistedLocally)) {
          showError(withdrawAddressValidError || "Please enter a valid wallet address");
          return;
        }

        // Address book validation check parity
        const normalizedInputAddr = String(withdrawAddress || "").toLowerCase().trim();
        const withdrawalAddressIsApprovedInBook = (addressBookEntries || []).some((e) => {
          const entryAddr = String(e.address || "").toLowerCase().trim();
          const isMatch = entryAddr === normalizedInputAddr;
          const status = String(e.status || "").toLowerCase();
          const isApproved = status === "approved" || status === "active" || status === "verified";
          return isMatch && isApproved;
        });

        if (!withdrawalAddressIsApprovedInBook && !addressBookLoading) {
          verifyReminderSheetRef.current?.open();
          return;
        }
      } else if (withdrawToTab === "agce_user") {
        if (!isAgceFormValid) {
          showError("Please fill in valid recipient details");
          return;
        }
      }

      if (!withdrawAmount || String(withdrawAmount).trim() === "") {
        showError("Please enter withdrawal amount");
        return;
      }

      if (withdrawAmountInlineError) {
        showError(withdrawAmountInlineError);
        return;
      }
      if (!withdrawAmountOkForSubmit) {
        showError(withdrawAmountInlineError || "Please check withdrawal amount");
        return;
      }
      if (!emailId || emailId === "") {
        showError("Please update email in profile section");
        return;
      }

      // Web parity: both flows open the confirmation/verification sheet.
      withdrawConfirmSheetRef.current?.open();
      Keyboard.dismiss();
      return;
    }
    handleWithdraw();
  };

  const handleWithdraw = () => {
    if (withdrawToTab !== "address" && withdrawToTab !== "agce_user") {
      showError("Unknown withdrawal method");
      return;
    }
    if (!selectedCurrency || Object.keys(selectedCurrency).length === 0 || !withdrawAmount || !otp) {
      showError("Please fill all required fields");
      return;
    }
    const fee = withdrawToTab === "agce_user" ? 0 : parseNum(valueForChain(selectedCurrency, "withdrawal_fee", network), 0);
    const rawAmt = String(withdrawAmount || "").trim();
    const amtNum = Number.parseFloat(rawAmt.replace(/,/g, ""));
    if (
      !rawAmt ||
      !Number.isFinite(amtNum) ||
      amtNum <= 0 ||
      (chainMinWithdrawal > 0 && amtNum < chainMinWithdrawal) ||
      (effectiveWithdrawAvailable > 0 && amtNum > effectiveWithdrawAvailable)
    ) {
      setWithdrawAmountTouched(true);
      if (effectiveWithdrawAvailable > 0 && amtNum > effectiveWithdrawAvailable) {
        showError("Insufficient funds");
      } else {
        showError(`Minimum withdrawal limit is ${formatWithdrawAmountDisplay(chainMinWithdrawal)}.`);
      }
      return;
    }
    if (fee > 0 && amtNum < fee) {
      showError("Withdrawal amount must be greater than withdrawal fee");
      return;
    }
    if (parseFloat(availableBalance) < fee) {
      showError("Insufficient funds");
      return;
    }

    const idempotency_key = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const isAgce = withdrawToTab === "agce_user";
    let addr = withdrawAddress.trim();
    if (isAgce) {
      if (agceRecipientTab === "email") addr = agceRecipientEmail.trim();
      else if (agceRecipientTab === "phone") addr = agcePhoneCountry.code + agceRecipientPhoneLocal.trim();
      else if (agceRecipientTab === "agce") addr = agceRecipientId.trim();
    }

    const chainForSubmit = isAgce ? "" : network;

    const tokenFromMap = isAgce ? null : selectedCurrency?.token_asset_ids?.[network];
    const tokenAssetId = tokenFromMap != null && String(tokenFromMap).trim() ? String(tokenFromMap).trim() : "";

    /** Web `submitWithdrawal` body (`withdrawService.js`): string OTP, address mirror, idempotency, optional tokenAssetId. */
    let data = {
      email_code: String(otp ?? "").trim(), // Web uses email_code for the email OTP
      withdrawal_address: addr,
      address: addr,
      amount: amtNum, // Web sends amount as a float
      email_or_phone: emailId, // The verify-identity email
      chain: chainForSubmit,
      coinName: selectedCurrency?.short_name,
      usdt_balance: availableBalance,
      idempotency_key,
      tokenAssetId: tokenAssetId || chainForSubmit, // Web fallback
    };
    Keyboard.dismiss();
    dispatch(withdrawCoin(data));
  };



  const _updateAnnouncementSections = (activeSections) => {
    setActiveAnnouncementSections(activeSections);
  };

  const _renderAnnouncementHeader = (section, index, isActive) => {
    return (
      <View
        style={[
          styles.faqHeader,
          styles.withdrawAnnouncementHeaderInner,
          {
            backgroundColor: isDark ? "#2A2A2E" : "#F5F5F5",
            borderColor: isDark ? themeColors.border : "#EEE",
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <AppText weight={SEMI_BOLD} type={THIRTEEN} style={{ marginBottom: 2, color: themeColors.text }}>
            {section.title}
          </AppText>
          <AppText color={DISCLAIMTEXT} type={TEN}>
            {section.date}
          </AppText>
        </View>
        <AppText weight={SEMI_BOLD} color={themeColors.text} type={FOURTEEN}>
          {isActive ? "−" : "+"}
        </AppText>
      </View>
    );
  };

  const _renderAnnouncementContent = (section) => {
    return (
      <View
        style={[
          styles.faqContent,
          styles.withdrawAnnouncementContentInner,
          {
            backgroundColor: themeColors.background,
            borderColor: isDark ? themeColors.border : "#EEE",
          },
        ]}
      >
        <AppText color={themeColors.secondaryText} type={TEN} style={[styles.faqText, { lineHeight: 18 }]}>
          {section.content}
        </AppText>
      </View>
    );
  };

  const withdrawFormHeaderTitle =
    selectedCurrency?.short_name != null && String(selectedCurrency.short_name || "").length > 0
      ? `Withdraw ${selectedCurrency.short_name}`
      : "Withdraw";



  const withdrawNetworkSheetOnly = (
    <RBSheet customModalProps={{ statusBarTranslucent: true }}
      ref={networkSheetRef}
      height={SHEET_HEIGHT}
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
      <View style={styles.networkSheetInner}>
        <AppText weight={SEMI_BOLD} type={SIXTEEN} style={[styles.networkSheetTitle, { color: themeColors.text }]}>
          Choose Network
        </AppText>
        <ScrollView style={styles.networkSheetScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {sheetWithdrawChains.map((chainKey, idx) => {
            const src = selectedCurrency;
            const minW = valueForChain(src, "min_withdrawal", chainKey);
            const maxW = valueForChain(src, "max_withdrawal", chainKey);
            const feeW = valueForChain(src, "withdrawal_fee", chainKey);
            const fullName = String(
              src?.chain_full_names?.[chainKey] || src?._chain_full_name?.[chainKey] || ""
            ).trim();
            return (
              <TouchableOpacity
                key={`${chainKey}-${idx}`}
                style={{
                  borderBottomColor: isDark ? "#2A2E39" : "#EEE",
                  borderBottomWidth: 1,
                  paddingHorizontal: 15,
                  paddingVertical: 15,
                }}
                onPress={() => handleNetworkChosenFromSheet(chainKey)}
                activeOpacity={0.75}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    <AppText weight={SEMI_BOLD} type={FIFTEEN} style={{ color: themeColors.text }}>
                      {chainKey}
                    </AppText>
                    <AppText type={ELEVEN} color={colors.textGray} style={{ marginTop: 4 }}>
                      {fullName || chainKey}
                    </AppText>
                  </View>

                  <View style={{ alignItems: "flex-end" }}>
                    <AppText weight={MEDIUM} type={THIRTEEN} style={{ color: themeColors.text }}>
                      {minW ?? "0"} - {maxW ?? "0"} {src?.short_name}
                    </AppText>
                    <AppText type={TWELVE} color={colors.textGray} style={{ marginTop: 4 }}>
                      ≈ 2 mins
                    </AppText>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={[styles.networkSheetNotice, { backgroundColor: isDark ? "#2A2418" : "#fff5ea" }]}>
          <FastImage source={INFO} style={styles.networkSheetNoticeIcon} resizeMode="contain" />
          <AppText type={TEN} color={colors.textGray} style={{ flex: 1, lineHeight: 16 }}>
            The withdrawal address must support the network you pick. Wrong network can lead to permanent loss if the destination cannot recover funds.
          </AppText>
        </View>
      </View>
    </RBSheet>
  );



  const withdrawAgceCountrySheetOnly = (
    <RBSheet customModalProps={{ statusBarTranslucent: true }}
      ref={agceCountrySheetRef}
      height={AGCE_COUNTRY_SHEET_HEIGHT}
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
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 16 }}>
        <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: themeColors.text, marginBottom: 14 }}>
          Select country
        </AppText>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
          {AGCE_PHONE_COUNTRIES.map((c, idx) => {
            const selected = agcePhoneCountry.code === c.code;
            return (
              <TouchableOpacity
                key={c.code}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 13,
                  paddingHorizontal: 4,
                  borderBottomWidth: idx < AGCE_PHONE_COUNTRIES.length - 1 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: isDark ? themeColors.border : "#00000018",
                }}
                onPress={() => {
                  setAgcePhoneCountry(c);
                  agceCountrySheetRef.current?.close();
                }}
                activeOpacity={0.75}
              >
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <AppText style={{ fontSize: 18, marginRight: 12, lineHeight: 22 }}>{c.flag}</AppText>
                  <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, width: 50 }}>
                    {c.code}
                  </AppText>
                  <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText, flex: 1, marginLeft: 6 }}>
                    {c.label}
                  </AppText>
                </View>
                {selected ? (
                  <FastImage source={checkIc} style={{ width: 35, height: 35, }}
                    resizeMode="contain" />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </RBSheet>
  );
  const saveAddrBeneficiaryCountrySheetOnly = (
    <RBSheet customModalProps={{ statusBarTranslucent: true }}
      ref={saveAddrCountrySheetRef}
      height={AGCE_COUNTRY_SHEET_HEIGHT}
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
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 16 }}>
        <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: themeColors.text, marginBottom: 14 }}>
          Select country
        </AppText>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
          {countriesList.map((c, idx) => {
            const countryName = c.label.split("(")[0].trim();
            const selected = saveAddrBenCountry === countryName;
            return (
              <TouchableOpacity
                key={idx}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 13,
                  paddingHorizontal: 4,
                  borderBottomWidth: idx < countriesList.length - 1 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: isDark ? themeColors.border : "#00000018",
                }}
                onPress={() => {
                  setSaveAddrBenCountry(countryName);
                  saveAddrCountrySheetRef.current?.close();
                }}
                activeOpacity={0.75}
              >
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <AppText style={{ fontSize: 18, marginRight: 12, lineHeight: 22 }}>{c.flag}</AppText>
                  <AppText type={FOURTEEN} style={{ color: themeColors.text, flex: 1 }}>
                    {countryName}
                  </AppText>
                </View>
                {selected ? (
                  <FastImage source={checkIc} style={{ width: 35, height: 35, }}
                    resizeMode="contain" />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </RBSheet>
  );

  const withdrawLimitInfoSheetOnly = (
    <RBSheet customModalProps={{ statusBarTranslucent: true }}
      ref={withdrawLimitInfoSheetRef}
      height={210}
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
      <Pressable
        style={{ paddingHorizontal: 20, paddingBottom: 28, paddingTop: 4 }}
        onPress={() => withdrawLimitInfoSheetRef.current?.close()}
      >
        <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: themeColors.text, marginBottom: 10 }}>
          24h withdrawal limit
        </AppText>
        <AppText type={TWELVE} style={{ color: themeColors.secondaryText, lineHeight: 18 }}>
          {withdrawStep3Preview.limitLeft} {selectedCurrency?.short_name} 24 Hour withdrawal limit.
        </AppText>
      </Pressable>
    </RBSheet>
  );

  const NETWORK_FEE_INFO_SHEET_HEIGHT = Math.round(Dimensions.get("window").height * 0.35);

  const networkFeeInfoSheetOnly = (
    <RBSheet customModalProps={{ statusBarTranslucent: true }}
      ref={networkFeeInfoSheetRef}
      height={NETWORK_FEE_INFO_SHEET_HEIGHT}
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
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28, paddingTop: 4 }}
      >
        <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: themeColors.text, marginBottom: 10 }}>
          About Network Fee
        </AppText>
        <AppText weight={SEMI_BOLD} type={THIRTEEN} style={{ color: themeColors.text, marginBottom: 8 }}>
          The address you entered is an external wallet address.
        </AppText>
        <AppText type={TWELVE} style={{ color: themeColors.secondaryText, lineHeight: 18 }}>
          Withdrawals to external wallet addresses are securely processed via on-chain transactions. Each transaction
          generates a unique TXID for tracking and transparency, while a network fee is applied based on the selected
          blockchain to ensure smooth processing.
        </AppText>
      </ScrollView>
    </RBSheet>
  );

  useEffect(() => {
    fetchRecentAddresses();
  }, [fetchRecentAddresses]);



  const handleRefreshMeta = useCallback(() => {
    dispatch(getWithdrawActiveCoins());
    dispatch(getUserMainWallet("main"));
    showSuccess("Withdrawal details refreshed");
  }, [dispatch]);

  useEffect(() => {
    if (saveAddrCoin && withdrawCoinsList.length > 0) {
      const coinObj = withdrawCoinsList.find(c => String(c.short_name).toUpperCase() === String(saveAddrCoin).toUpperCase());
      if (coinObj) {
        const nets = getWithdrawNetworksOrStaticFallback(coinObj);
        if (nets.length > 0 && !saveAddrNetwork) {
          setSaveAddrNetwork(nets[0].value);
        }
      }
    }
  }, [saveAddrCoin, withdrawCoinsList, saveAddrNetwork]);

  const resetAddAddressForm = () => {
    setSaveAddrStep("form");
    setSaveAddrLabel("");
    setSaveAddrCoin(selectedCurrency?.short_name || "USDT");
    setSaveAddrAddress("");
    setSaveAddrNetwork("");
    setSaveAddrMemo("");
    setSaveAddrOwnership("SELF");
    setSaveAddrWalletType("SELF_HOSTED");
    setSaveAddrExchange("");
    setSaveAddrExchangeManual("");
    setSaveAddrDeclarationAccepted(false);
    setSaveAddrOtp("");
    setSaveAddrWhitelistData(null);
    setSaveAddrVerifyOptions([]);
    setSelectedSaveAddrVerifyMethod("");
    setSaveAddrOtpTimer(0);
    setSaveAddrResendActive(false);

    // Missing fields previously left out of reset
    setSaveAddrBenFullName("");
    setSaveAddrBenPan("");
    setSaveAddrBenCountry("");
    setSaveAddrBenPin("");
    setSaveAddrBenAddress("");
    setSaveAddrProofMethod("satoshi");
    setSaveAddrExchangeSearch("");
    setSaveAddrExchangeOpen(false);
    setSaveAddrCoinOpen(false);
    setSaveAddrNetworkOpen(false);
    setSaveAddrAddressTouched(false);
    setSaveAddrAddressValidError("");
    setSaveAddrAddressValidatedKey("");
    setSaveAddrAddressValidating(false);
    setSaveAddrBusy(false);
    setSatoshiDepositError("");
    setSatoshiDepositLoading(false);
    setSatoshiWhitelistAwaitingProof(false);
    setSatoshiResumeMode(false);
  };

  // Timer for Address Book OTP
  useEffect(() => {
    let interval = null;
    if (saveAddrOtpTimer > 0) {
      interval = setInterval(() => {
        setSaveAddrOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (saveAddrOtpTimer === 0) {
      setSaveAddrResendActive(true);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [saveAddrOtpTimer]);

  if (withdrawOtpPhaseActive) {
    return renderOtpPhase();
  }

  if (isWithdrawVerifyCombinedOpen) {
    return (
      <AppSafeAreaView bg={themeColors.background} style={{ flex: 1 }}>
        <View style={styles.headerView}>
          <TouchableOpacity onPress={() => setIsWithdrawVerifyCombinedOpen(false)} style={{ padding: 10, paddingHorizontal: 20 }}>
            <FastImage source={back_ic} style={{ width: 35, height: 35 }} resizeMode="contain" />
          </TouchableOpacity>
          <AppText weight={SEMI_BOLD} type={EIGHTEEN} style={{ color: themeColors.text }}>Security verification</AppText>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={{ paddingHorizontal: 24, marginTop: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center", marginBottom: 32, }}>
            <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText, lineHeight: 20, }}>
              Complete all required steps. For email or SMS, tap Send code to receive your OTP.
            </AppText>
          </View>

          {getNonPasskeyEnabledMethods().includes("email") && (
            <View style={{ marginBottom: 20 }}>
              <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: themeColors.text, marginBottom: 8 }}>Email verification code</AppText>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: isDark ? darkTheme.darkThemeInputColor : lightTheme.input, borderRadius: 12, paddingRight: 8 }}>
                <Input
                  maxLength={6}
                  mainContainer={{ flex: 1, marginBottom: 0 }}
                  containerStyle={{ borderWidth: 0, backgroundColor: isDark ? darkTheme.darkThemeInputColor : lightTheme.input, height: 48, paddingHorizontal: 16, borderRadius: 12 }}
                  inputStyle={{ fontSize: 14, color: themeColors.text }}
                  placeholder="Enter email code"
                  keyboardType="numeric"
                  value={emailVerifyCode}
                  onChangeText={setEmailVerifyCode}
                />
                <TouchableOpacity
                  onPress={() => sendSingleWithdrawalOtp("email")}
                  disabled={withdrawOtpSending.email || withdrawOtpResendSec.email > 0}
                  style={{ paddingHorizontal: 12, height: 48, justifyContent: "center", backgroundColor: "transparent" }}
                >
                  <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: (withdrawOtpSending.email || withdrawOtpResendSec.email > 0) ? themeColors.secondaryText : themeColors.text }}>
                    {withdrawOtpSending.email ? "Sending..." : withdrawOtpResendSec.email > 0 ? `Resend in ${withdrawOtpResendSec.email}s` : "Send code"}
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {getNonPasskeyEnabledMethods().includes("mobile") && (
            <View style={{ marginBottom: 20 }}>
              <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: themeColors.text, marginBottom: 8 }}>Mobile verification code</AppText>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: isDark ? darkTheme.darkThemeInputColor : lightTheme.input, borderRadius: 12, paddingRight: 8 }}>
                <Input
                  maxLength={6}
                  mainContainer={{ flex: 1, marginBottom: 0 }}
                  containerStyle={{ borderWidth: 0, backgroundColor: isDark ? darkTheme.darkThemeInputColor : lightTheme.input, height: 48, paddingHorizontal: 16, borderRadius: 12 }}
                  inputStyle={{ fontSize: 14, color: themeColors.text }}
                  placeholder="Enter mobile code"
                  keyboardType="numeric"
                  value={mobileVerifyCode}
                  onChangeText={setMobileVerifyCode}
                />
                <TouchableOpacity
                  onPress={() => sendSingleWithdrawalOtp("mobile")}
                  disabled={withdrawOtpSending.mobile || withdrawOtpResendSec.mobile > 0}
                  style={{ paddingHorizontal: 12, height: 48, justifyContent: "center", backgroundColor: "transparent" }}
                >
                  <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: (withdrawOtpSending.mobile || withdrawOtpResendSec.mobile > 0) ? themeColors.secondaryText : themeColors.text }}>
                    {withdrawOtpSending.mobile ? "Sending..." : withdrawOtpResendSec.mobile > 0 ? `Resend in ${withdrawOtpResendSec.mobile}s` : "Send code"}
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {getNonPasskeyEnabledMethods().includes("google_authenticator") && (
            <View style={{ marginBottom: 20 }}>
              <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: themeColors.text, marginBottom: 8 }}>Authenticator app</AppText>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: isDark ? darkTheme.darkThemeInputColor : lightTheme.input, borderRadius: 12, paddingRight: 8 }}>
                <Input
                  maxLength={6}
                  mainContainer={{ flex: 1, marginBottom: 0 }}
                  containerStyle={{ borderWidth: 0, backgroundColor: isDark ? darkTheme.darkThemeInputColor : lightTheme.input, height: 48, paddingHorizontal: 16, borderRadius: 12 }}
                  inputStyle={{ fontSize: 14, color: themeColors.text }}
                  placeholder="Enter authenticator app code"
                  keyboardType="numeric"
                  value={authAppCode}
                  onChangeText={setAuthAppCode}
                />
                <TouchableOpacity
                  onPress={async () => {
                    const Clipboard = require('react-native').Clipboard;
                    const text = await Clipboard.getString();
                    if (text) setAuthAppCode(text);
                  }}
                  style={{ paddingHorizontal: 12, height: 48, justifyContent: "center", backgroundColor: "transparent" }}
                >
                  <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.text }}>Paste</AppText>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {getNonPasskeyEnabledMethods().includes("fund_password") && (
            <View style={{ marginBottom: 28 }}>
              <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: themeColors.text, marginBottom: 8 }}>Fund password</AppText>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: isDark ? darkTheme.darkThemeInputColor : lightTheme.input, borderRadius: 12, paddingRight: 16 }}>
                <Input
                  maxLength={6}
                  mainContainer={{ flex: 1, marginBottom: 0 }}
                  containerStyle={{ borderWidth: 0, backgroundColor: isDark ? darkTheme.darkThemeInputColor : lightTheme.input, height: 48, paddingHorizontal: 16, borderRadius: 12 }}
                  inputStyle={{ fontSize: 14, color: themeColors.text }}
                  placeholder="Enter fund password"
                  secureTextEntry={!withdrawFundPasswordVisible}
                  value={withdrawFundPassword}
                  onChangeText={setWithdrawFundPassword}
                />
                <TouchableOpacity onPress={() => setWithdrawFundPasswordVisible(!withdrawFundPasswordVisible)}>
                  <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.secondaryText }}>
                    {withdrawFundPasswordVisible ? "Hide" : "Show"}
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={submitWithdrawalWithEnabledMethods}
            disabled={
              !(
                (!getNonPasskeyEnabledMethods().includes("email") || (emailVerifyCode || "").trim().length > 0) &&
                (!getNonPasskeyEnabledMethods().includes("mobile") || (mobileVerifyCode || "").trim().length > 0) &&
                (!getNonPasskeyEnabledMethods().includes("google_authenticator") || (authAppCode || "").trim().length > 0) &&
                (!getNonPasskeyEnabledMethods().includes("fund_password") || (withdrawFundPassword || "").trim().length > 0)
              )
            }
            style={{
              backgroundColor:
                (!getNonPasskeyEnabledMethods().includes("email") || (emailVerifyCode || "").trim().length > 0) &&
                  (!getNonPasskeyEnabledMethods().includes("mobile") || (mobileVerifyCode || "").trim().length > 0) &&
                  (!getNonPasskeyEnabledMethods().includes("google_authenticator") || (authAppCode || "").trim().length > 0) &&
                  (!getNonPasskeyEnabledMethods().includes("fund_password") || (withdrawFundPassword || "").trim().length > 0)
                  ? (isDark ? colors.white : colors.black)
                  : (isDark ? darkTheme.darkThemeInputColor : "#E5E7EB"),
              height: 50,
              borderRadius: 25,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 32,
              marginTop: 8,
            }}
          >
            <AppText
              weight={SEMI_BOLD}
              type={SIXTEEN}
              style={{
                color:
                  (!getNonPasskeyEnabledMethods().includes("email") || (emailVerifyCode || "").trim().length > 0) &&
                    (!getNonPasskeyEnabledMethods().includes("mobile") || (mobileVerifyCode || "").trim().length > 0) &&
                    (!getNonPasskeyEnabledMethods().includes("google_authenticator") || (authAppCode || "").trim().length > 0) &&
                    (!getNonPasskeyEnabledMethods().includes("fund_password") || (withdrawFundPassword || "").trim().length > 0)
                    ? (isDark ? colors.black : colors.white)
                    : (isDark ? "#6B6B70" : "#9CA3AF"),
              }}
            >
              Confirm withdrawal
            </AppText>
          </TouchableOpacity>
        </ScrollView>
        <SpinnerSecond loading={isWithdrawSubmitLoading} />
      </AppSafeAreaView>
    );
  }

  return (
    <AppSafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
      <View style={[styles.headerView, { paddingHorizontal: 16 }]}>
        <TouchableOpacity onPress={handleHeaderBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <FastImage source={back_ic} resizeMode="contain" style={{ width: 35, height: 35 }} />
        </TouchableOpacity>
        <AppText color={themeColors.text} weight={SEMI_BOLD} type={EIGHTEEN}>
          {withdrawFormHeaderTitle}
        </AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity
            onPress={() => {
              setFaqActiveIndex(null);
              faqSheetRef.current?.open();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <FastImage source={INFO} resizeMode="contain" style={{ width: 18, height: 18 }} tintColor={themeColors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => NavigationService.navigate(WITHDRAW_HISTORY_SCREEN)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <FastImage source={printIcon} resizeMode="contain" style={{ width: 20, height: 17 }} tintColor={themeColors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyBoardAware
        ref={scrollViewRef}
        style={{ flex: 1 }}
        containerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.text} />}
      >
        <View style={styles.wdStepBlock}>

          {/* Top Tabs */}
          <View style={{ flexDirection: "row", gap: 30, paddingHorizontal: 4, marginVertical: 20 }}>
            <TouchableOpacity onPress={() => setWithdrawToTab("address")}>
              <AppText
                type={SIXTEEN}
                weight={withdrawToTab === "address" ? SEMI_BOLD : MEDIUM}
                style={{ color: withdrawToTab === "address" ? themeColors.text : themeColors.secondaryText }}
              >
                Address
              </AppText>
              {withdrawToTab === "address" && <View style={{ height: 2, backgroundColor: themeColors.text, width: "100%", marginTop: 6, borderRadius: 1 }} />}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setWithdrawToTab("agce_user")}>
              <AppText
                type={SIXTEEN}
                weight={withdrawToTab === "agce_user" ? SEMI_BOLD : MEDIUM}
                style={{ color: withdrawToTab === "agce_user" ? themeColors.text : themeColors.secondaryText }}
              >
                Coincode User
              </AppText>
              {withdrawToTab === "agce_user" && <View style={{ height: 2, backgroundColor: themeColors.text, width: "100%", marginTop: 6, borderRadius: 1 }} />}
            </TouchableOpacity>
          </View>

          {withdrawToTab === "address" ? (
            <View style={{}}>
              <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.text, marginBottom: 4 }}>Network</AppText>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={openWithdrawNetworkSheet}
                disabled={activeWithdrawChains.length === 0}
                style={{
                  height: 52,
                  borderRadius: 16,
                  paddingHorizontal: 20,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: isDark ? darkTheme.darkThemeInputColor : lightTheme.input,
                  opacity: activeWithdrawChains.length === 0 ? 0.6 : 1
                }}
              >
                <AppText weight={MEDIUM} type={FOURTEEN} style={{ color: network ? themeColors.text : themeColors.secondaryText }}>
                  {network ? String(network).toUpperCase() : "Select Network"}
                </AppText>
                <FastImage source={down_arrow} style={{ width: 10, height: 10 }} resizeMode="contain" tintColor={themeColors.secondaryText} />
              </TouchableOpacity>

              {/* Address Input */}
              <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.text, marginBottom: 4, marginTop: 16 }}>Address</AppText>
              <View
                style={{
                  height: 52,
                  borderRadius: 16,
                  paddingHorizontal: 20,
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: isDark ? darkTheme.darkThemeInputColor : lightTheme.input,
                }}
              >
                <TextInput
                  style={{ flex: 1, color: themeColors.text, fontSize: 14, fontWeight: "400", padding: 0, marginRight: 10 }}
                  placeholder="Enter Address"
                  placeholderTextColor={themeColors.secondaryText}
                  value={withdrawAddress}
                  onChangeText={(value) => handleWithdrawalAddress(value)}
                  onBlur={() => {
                    setWithdrawAddressTouched(true);
                    if (withdrawAddrValidateDebounceTimerRef.current) {
                      clearTimeout(withdrawAddrValidateDebounceTimerRef.current);
                      withdrawAddrValidateDebounceTimerRef.current = null;
                    }
                    void validateWithdrawAddressApiRef.current?.();
                  }}
                />
                <TouchableOpacity onPress={() => {
                  setIsAddressBookModalVisible(true);
                  void fetchRecentAddresses();
                  void refetchAddressBook();
                }}>
                  <FastImage source={user_withdarwal} style={{ width: 20, height: 20 }} resizeMode="contain" tintColor={themeColors.secondaryText} />
                </TouchableOpacity>
              </View>

              {/* Web parity: address validation feedback */}
              {withdrawAddressInlineError ? (
                <AppText type={TWELVE} style={{ color: "#E74C3C", marginTop: 6 }}>
                  {withdrawAddressInlineError}
                </AppText>
              ) : isWithdrawAddressValidating ? (
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 6 }}>
                  <ActivityIndicator size="small" color="#E2B24C" />
                  <AppText type={TWELVE} style={{ color: "#E2B24C" }}>Validating address...</AppText>
                </View>
              ) : withdrawAddressValidError ? (
                <AppText type={TWELVE} style={{ color: "#E74C3C", marginTop: 6 }}>
                  {withdrawAddressValidError}
                </AppText>
              ) : null}
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {/* AGCE User Sub-Tabs */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                {[
                  { key: "email", label: "Email" },
                  { key: "phone", label: "Phone" },
                  { key: "agce", label: "AGCE User" },
                ].map((t) => {
                  const active = agceRecipientTab === t.key;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      onPress={() => setAgceRecipientTab(t.key)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 100,
                        backgroundColor: active ? (isDark ? colors.iconBgColor : "#E5E7EB") : "transparent"
                      }}
                    >
                      <AppText weight={SEMI_BOLD} type={TWELVE} style={{ color: active ? isDark ? colors.black : themeColors.text : themeColors.secondaryText }}>{t.label}</AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>


              {agceRecipientTab === "email" ? (
                <View style={[styles.emailSuggestWrap, {}]}>
                  <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.text, marginBottom: 4 }}>Email</AppText>
                  <Input
                    placeholder="Recipient's email"
                    value={agceRecipientEmail}
                    onChangeText={setAgceRecipientEmail}
                    onfocus={() => {
                      clearEmailSuggestBlurTimer();
                      setEmailSuggestListVisible(true);
                    }}
                    onBlur={() => {
                      setAgceTouched(p => ({ ...p, email: true }));
                      clearEmailSuggestBlurTimer();
                      emailSuggestBlurTimer.current = setTimeout(() => {
                        setEmailSuggestListVisible(false);
                        emailSuggestBlurTimer.current = null;
                      }, 200);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    inputStyle={{ fontSize: 14 }}
                    placeholderTextColor={themeColors.secondaryText}
                    containerStyle={{
                      height: 48,
                      borderWidth: 0,
                      borderRadius: 12,
                      backgroundColor: isDark ? darkTheme.darkThemeInputColor : lightTheme.input,
                      paddingHorizontal: 4, // Input component internally has padding usually
                    }}
                    mainContainer={styles.emailFieldMain}
                  />
                  {emailSuggestListVisible && emailDomainSuggestions.length > 0 ? (
                    <View
                      style={[
                        styles.emailSuggestList,
                        {
                          backgroundColor: isDark ? darkTheme.darkThemeInputColor : lightTheme.input,
                          borderColor: themeColors.border,
                        },
                      ]}
                    >
                      <ScrollView
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled
                        style={styles.emailSuggestScroll}
                      >
                        {emailDomainSuggestions.map((domain) => (
                          <TouchableOpacity
                            key={domain}
                            style={styles.emailSuggestRow}
                            onPress={() => applyEmailDomain(domain)}
                          >
                            <AppText type={FOURTEEN} style={{ color: themeColors.text }}>
                              @{domain}
                            </AppText>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}
                  {agceErrors.email ? <AppText type={TEN} style={{ color: "red", marginTop: 4 }}>{agceErrors.email}</AppText> : null}
                </View>
              ) : null}

              {agceRecipientTab === "phone" ? (
                <View style={[styles.wdAgcePhoneWrap, {}]}>
                  <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.text, marginBottom: 4 }}>Phone Number</AppText>
                  <View style={[styles.wdAgcePhoneRow, {
                    backgroundColor: isDark ? darkTheme.darkThemeInputColor : lightTheme.input,
                    borderRadius: 12,
                    height: 48,
                    paddingHorizontal: 12,
                    alignItems: "center"
                  }]}>
                    <TouchableOpacity
                      onPress={openAgceCountrySheet}
                      style={[styles.wdAgceCountryBtn, { borderColor: isDark ? themeColors.border : "#EEE" }]}
                    >
                      <AppText type={TWELVE}>{agcePhoneCountry.flag}</AppText>
                      <AppText type={TWELVE} weight={SEMI_BOLD} style={{ marginLeft: 6, color: themeColors.text }}>
                        {agcePhoneCountry.code}
                      </AppText>
                      <FastImage source={downIcon} style={{ width: 12, height: 12, marginLeft: 4 }} resizeMode="contain" tintColor={themeColors.secondaryText} />
                    </TouchableOpacity>
                    <TextInput
                      style={[
                        styles.wdAgcePhoneInput,
                        { color: themeColors.text, backgroundColor: "transparent", fontSize: 14, flex: 1, padding: 0 },
                      ]}
                      onBlur={() => setAgceTouched(p => ({ ...p, phone: true }))}
                      placeholder="Recipient's phone number"
                      placeholderTextColor={themeColors.secondaryText}
                      value={agceRecipientPhoneLocal}
                      onChangeText={setAgceRecipientPhoneLocal}
                      keyboardType="phone-pad"
                    />
                  </View>
                  {agceErrors.phone ? <AppText type={TEN} style={{ color: "red", marginTop: 4 }}>{agceErrors.phone}</AppText> : null}
                </View>
              ) : null}

              {agceRecipientTab === "agce" ? (
                <View style={{}}>
                  <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.text, marginBottom: 4 }}>Coincode User ID</AppText>
                  <Input
                    placeholder="Recipient's Coincode username or UID"
                    value={agceRecipientId}
                    onChangeText={setAgceRecipientId}
                    onBlur={() => setAgceTouched(p => ({ ...p, email: false, phone: false }))}
                    autoCapitalize="none"
                    autoCorrect={false}
                    inputStyle={{ fontSize: 14 }}
                    placeholderTextColor={themeColors.secondaryText}
                    containerStyle={{
                      height: 48,
                      borderWidth: 0,
                      borderRadius: 12,
                      backgroundColor: isDark ? darkTheme.darkThemeInputColor : lightTheme.input
                    }}
                  />
                  <AppText type={TEN} style={{ color: themeColors.secondaryText, lineHeight: 16 }}>
                    Payee can find Coincode ID under Top-right Avatar → Dashboard.
                  </AppText>
                </View>
              ) : null}


            </View>
          )}

          {/* Amount and Final Summary Section */}
          {Object.keys(selectedCurrency).length > 0 && (
            <View style={{ marginTop: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.text }}>Withdrawal Amount</AppText>

              </View>

              <View style={{
                height: 48,
                borderRadius: 12,
                paddingHorizontal: 16,
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: isDark ? darkTheme.darkThemeInputColor : lightTheme.input,
              }}>
                <TextInput
                  style={{ flex: 1, color: themeColors.text, fontSize: 14, fontWeight: "400", padding: 0 }}
                  placeholder={chainMinWithdrawalDisplay ? `Minimal ${chainMinWithdrawalDisplay}` : "Enter Amount"}
                  placeholderTextColor={themeColors.secondaryText}
                  value={withdrawAmount}
                  onChangeText={(val) => {
                    setWithdrawAmount(val);
                    setWithdrawAmountTouched(true);
                  }}
                  keyboardType="numeric"
                />
                <AppText weight={MEDIUM} type={FOURTEEN} style={{ color: themeColors.text, marginRight: 12 }}>{selectedCurrency.short_name}</AppText>
                <View style={{ width: 1, height: 18, backgroundColor: isDark ? themeColors.border : "#D1D5DB" }} />
                <TouchableOpacity style={{ marginLeft: 12 }} onPress={handleMaxWithdrawal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <AppText weight={BOLD} type={FOURTEEN} style={{ color: "#E2B24C" }}>MAX</AppText>
                </TouchableOpacity>
              </View>

              {withdrawAmountInlineError ? (
                <AppText type={TWELVE} style={{ color: "#E74C3C", marginTop: 6 }}>
                  {withdrawAmountInlineError}
                </AppText>
              ) : null}

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 5, marginVertical: 10 }}>
                <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>Available Withdraw</AppText>
                <TouchableOpacity onPress={() => {/* transfer logic if any */ }} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <AppText weight={MEDIUM} type={TWELVE} style={{ color: themeColors.text }}>
                    {formatFundAvailableFromRow(mainWalletFundRow)} {selectedCurrency.short_name}
                  </AppText>
                </TouchableOpacity>
              </View>
              <View style={{ padding: 10, borderRadius: 12, bottom: 5 }}>
                <AppText type={TEN} style={{ color: themeColors.secondaryText, lineHeight: 16 }}>
                  * Beware of scams! Coincode will never ask for personal information or private transfers via SMS or email.
                </AppText>
              </View>
            </View>
          )}
        </View>

        {formattedAnnouncements?.length > 0 && (
          <View style={styles.withdrawAnnouncementsBlock}>
            <View style={styles.withdrawAnnouncementsHeader}>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} color={themeColors.text}>
                Announcements
              </AppText>
              <TouchableOpacity onPress={() => NavigationService.navigate(NOTIFICATION_SCREEN)} hitSlop={8}>
                <AppText type={THIRTEEN} color={YELLOW}>More &gt;</AppText>
              </TouchableOpacity>
            </View>
            <Accordion
              sections={formattedAnnouncements}
              activeSections={activeAnnouncementSections}
              renderHeader={_renderAnnouncementHeader}
              renderContent={_renderAnnouncementContent}
              onChange={_updateAnnouncementSections}
              underlayColor={colors.transparent}
              containerStyle={{ gap: 8 }}
            />
          </View>
        )}

        {/* <WithdrawRecentHistory
          activeTab={recentWithdrawTab}
          onTabChange={setRecentWithdrawTab}
          history={withdrawHistory}
          internalHistory={interalWalletHistory}
          onViewMore={() => NavigationService.navigate(routes.WITHDRAW_HISTORY_SCREEN, { activeTab: 1 })}
          onWithdrawAgain={handleWithdrawAgainFromHistory}
          withdrawCoinsList={withdrawCoinsList}
        /> */}

      </KeyBoardAware>

      {/* Fixed Bottom Section */}
      {!isKeyboardVisible && (
        <View style={{
          padding: 16,
          paddingBottom: Platform.OS === 'ios' ? 24 : 16,
          backgroundColor: themeColors.background,
          borderTopWidth: 1,
          borderTopColor: isDark ? "#2A2E39" : "#E5E7EB"
        }}>
          {/* Row 1: Fee */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12, paddingHorizontal: 4 }}>
            <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText }}>Fee</AppText>
            <AppText weight={MEDIUM} type={FOURTEEN} style={{ color: themeColors.text }}>
              {withdrawStep3Preview.feeNum !== null
                ? `${formatWithdrawAmountDisplay(withdrawStep3Preview.feeNum)} ${selectedCurrency?.short_name || "—"}`
                : `— ${selectedCurrency?.short_name || "—"}`}
            </AppText>
          </View>

          {/* Row 2: Receive Amount */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12, paddingHorizontal: 4 }}>
            <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText }}>Receive Amount</AppText>
            <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.text }}>
              {withdrawStep3Preview.receiveNum !== null
                ? `${formatWithdrawAmountDisplay(withdrawStep3Preview.receiveNum)} ${selectedCurrency?.short_name || "—"}`
                : `-- ${selectedCurrency?.short_name || "—"}`}
            </AppText>
          </View>



          <TouchableOpacity
            disabled={
              !withdrawAmount ||
              !!withdrawAmountInlineError ||
              (withdrawToTab === "address" && !showWithdrawContentAfterValidatedAddress) ||
              (withdrawToTab === "agce_user" && !isAgceFormValid)
            }
            onPress={handleWithdrawPrimaryPress}
            activeOpacity={0.8}
            style={{
              height: 54,
              borderRadius: 100,
              backgroundColor: (
                !withdrawAmount ||
                !!withdrawAmountInlineError ||
                (withdrawToTab === "address" && !showWithdrawContentAfterValidatedAddress) ||
                (withdrawToTab === "agce_user" && !isAgceFormValid)
              )
                ? (isDark ? darkTheme.darkThemeInputColor : "#E5E7EB")
                : (isDark ? colors.white : colors.black),
              justifyContent: "center",
              alignItems: "center"
            }}
          >
            <AppText
              weight={SEMI_BOLD}
              type={SIXTEEN}
              style={{
                color: (
                  !withdrawAmount ||
                  !!withdrawAmountInlineError ||
                  (withdrawToTab === "address" && !showWithdrawContentAfterValidatedAddress) ||
                  (withdrawToTab === "agce_user" && !isAgceFormValid)
                )
                  ? (isDark ? "#6B6B70" : "#9CA3AF")
                  : (isDark ? colors.black : colors.white)
              }}
            >
              Withdraw
            </AppText>
          </TouchableOpacity>
        </View>
      )}

      <WithdrawAddressBookModal
        visible={isAddressBookModalVisible}
        onClose={() => setIsAddressBookModalVisible(false)}
        selectedCurrency={selectedCurrency}
        addressBookList={addressBookEntries}
        withdrawalAddressHistory={recentAddresses}
        onSelect={handleSelectAddressFromBook}
        onDelete={(item) => {
          setAddressToDelete(item);
          setTimeout(() => addressDeleteSheetRef.current?.open(), 0);
        }}
        onRefresh={() => {
          void fetchRecentAddresses();
          void refetchAddressBook();
        }}
        onAddAddress={() => {
          handleOpenSaveAddressSheet();
        }}
        refreshing={addressBookLoading || recentAddressesLoading}
        isPendingSatoshiDeposit={isPendingSatoshiDeposit}
        isPendingMetaMaskSign={isPendingMetaMaskSign}
        onResumeSatoshi={(item) => {
          handleResumeSatoshiFromAddressBook(item);
        }}
        onResumeMetaMask={(item) => {
          handleResumeMetaMaskFromAddressBook(item);
        }}
        isDark={isDark}
      />

      {/* Remove Address Confirmation Sheet */}
      <RBSheet customModalProps={{ statusBarTranslucent: true }}
        ref={addressDeleteSheetRef}
        closeOnDragDown
        closeOnPressMask
        height={330}
        customStyles={{
          container: {
            backgroundColor: themeColors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
          },
          draggableIcon: {
            backgroundColor: isDark ? themeColors.border : "#DDD"
          }
        }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View style={{
              width: 80,
              height: 80,
              backgroundColor: isDark ? themeColors.border : "#F3F4F6",
              borderRadius: 40,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 12
            }}>
              <FastImage
                source={email_vector}
                style={{ width: 80, height: 48 }}
                resizeMode="cover"
              />
              <View style={{
                position: "absolute",
                top: 20,
                backgroundColor: "#E2B24C",
                width: 18,
                height: 18,
                borderRadius: 9,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 2,
                borderColor: isDark ? themeColors.border : "#F3F4F6"
              }}>
                <AppText weight={BOLD} style={{ color: "#FFF", fontSize: 10 }}>!</AppText>
              </View>
            </View>

            <AppText weight={BOLD} type={SIXTEEN} style={{ color: themeColors.text, textAlign: "center", marginBottom: 8 }}>
              {getDeleteModalTitle(addressToDelete)}
            </AppText>

            <AppText type={TWELVE} style={{ color: themeColors.secondaryText, textAlign: "center", lineHeight: 18 }}>
              {getDeleteModalMessage(addressToDelete)}
            </AppText>
          </View>

          <View style={{ flexDirection: "row", gap: 12, marginBottom: 10 }}>
            <TouchableOpacity
              onPress={() => addressDeleteSheetRef.current?.close()}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 100,
                backgroundColor: "transparent",
                borderWidth: 1,
                borderColor: isDark ? "#2A2E39" : "#E5E7EB",
                alignItems: "center"
              }}
            >
              <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.text }}>Cancel</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirmDeleteAddress}
              disabled={addressDeleteBusy}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 100,
                backgroundColor: isDark ? "#2A2A2E" : "#F3F4F6",
                alignItems: "center"
              }}
            >
              {addressDeleteBusy ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: "#FFF" }}>Remove</AppText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </RBSheet>
      {withdrawNetworkSheetOnly}

      {withdrawAgceCountrySheetOnly}
      {saveAddrBeneficiaryCountrySheetOnly}
      <RBSheet customModalProps={{ statusBarTranslucent: true }}
        ref={withdrawConfirmSheetRef}
        closeOnDragDown
        closeOnPressMask
        height={withdrawToTab === "agce_user" ? confirmSheetHeight : 280}
        customStyles={{
          container: {
            backgroundColor: themeColors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          },
          draggableIcon: { backgroundColor: isDark ? themeColors.border : "#DDD" },
        }}
      >
        <View
          onLayout={(e) => {
            const { height } = e.nativeEvent.layout;
            if (height > 0) {
              setConfirmSheetHeight(height + 40); // 40 for draggable icon and padding
            }
          }}
          style={{ padding: 24, paddingBottom: 32 }}
        >
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <AppText weight={BOLD} type={SIXTEEN} style={{ color: themeColors.text, marginBottom: 12 }}>
              Confirm Withdrawal
            </AppText>
            <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, textAlign: "center", lineHeight: 20 }}>
              {withdrawToTab === "agce_user"
                ? "You are about to perform an internal transfer. Please ensure the recipient details are correct, as internal transfers are processed instantly."
                : `You have chosen the ${saveAddrNetwork || network || "—"} network. Kindly verify that your withdrawal address is compatible with this network, as unsupported transfers may result in loss of funds.`
              }
            </AppText>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              onPress={() => withdrawConfirmSheetRef.current?.close()}
              style={{
                flex: 1,
                height: 52,
                borderRadius: 12,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: isDark ? themeColors.border : "#E5E7EB"
              }}
            >
              <AppText weight={SEMI_BOLD} style={{ color: themeColors.text }}>Cancel</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={withdrawConfirmBusy}
              onPress={handleFinalWithdraw}
              style={{
                flex: 1,
                height: 52,
                borderRadius: 12,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: themeColors.button
              }}
            >
              <AppText weight={SEMI_BOLD} style={{ color: "#FFF" }}>
                {withdrawConfirmBusy ? "..." : "Confirm"}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </RBSheet>

      <RBSheet customModalProps={{ statusBarTranslucent: true }}
        ref={withdrawSummarySheetRef}
        closeOnDragDown
        closeOnPressMask
        height={580}
        customStyles={{
          container: {
            backgroundColor: themeColors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          },
          draggableIcon: { backgroundColor: isDark ? themeColors.border : "#DDD" },
        }}
      >
        <View style={{ padding: 24 }}>
          <AppText weight={BOLD} type={SIXTEEN} style={{ color: themeColors.text, marginBottom: 24 }}>Withdrawal</AppText>

          <View style={{ marginBottom: 24 }}>
            {[
              {
                label: "Address",
                value: (withdrawAddress || "").trim() || "—"
              },
              {
                label: "Network",
                value: (selectedCurrency?.chain_full_names?.[network] || selectedCurrency?._chain_full_name?.[network] || WITHDRAW_NETWORK_LABELS[String(network || "").toUpperCase()] || network || "—")
              },
              {
                label: "Amount",
                value: `${(withdrawAmount || "").trim() || "—"} ${selectedCurrency?.short_name || "—"}`
              },
              {
                label: "Receive",
                value: withdrawStep3Preview.receiveNum != null
                  ? `${formatWithdrawAmountDisplay(withdrawStep3Preview.receiveNum)} ${String(selectedCurrency?.short_name || "—").toUpperCase()}`
                  : `— ${String(selectedCurrency?.short_name || "—").toUpperCase()}`
              },
              {
                label: "Fee",
                value: withdrawStep3Preview.feeNum != null
                  ? `${formatWithdrawAmountDisplay(withdrawStep3Preview.feeNum)} ${String(selectedCurrency?.short_name || "—").toUpperCase()}`
                  : `— ${String(selectedCurrency?.short_name || "—").toUpperCase()}`
              }
            ].map((item, idx) => (
              <View key={idx} style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 14,
                borderBottomWidth: idx < 4 ? 0.5 : 0,
                borderBottomColor: isDark ? themeColors.border : "#F3F4F6",
                alignItems: "flex-start"
              }}>
                <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText, marginTop: 1 }}>{item.label}</AppText>
                <View style={{ flex: 1, marginLeft: 32 }}>
                  <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: themeColors.text, textAlign: "right" }} numberOfLines={3}>{item.value}</AppText>
                </View>
              </View>
            ))}
          </View>

          <View style={{ marginBottom: 32 }}>
            <View style={{ flexDirection: "row", marginBottom: 8 }}>
              <AppText style={{ color: themeColors.secondaryText, marginRight: 8 }}>•</AppText>
              <AppText type={TEN} style={{ color: themeColors.secondaryText, flex: 1 }}>
                Make Sure The Address Is Accurate And Matches The Selected Network.
              </AppText>
            </View>
            <View style={{ flexDirection: "row" }}>
              <AppText style={{ color: themeColors.secondaryText, marginRight: 8 }}>•</AppText>
              <AppText type={TEN} style={{ color: themeColors.secondaryText, flex: 1 }}>Once Submitted, Transactions Cannot Be Reversed.</AppText>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => {
              withdrawSummarySheetRef.current?.close();
              setTimeout(() => {
                withdrawSecuritySheetRef.current?.open();
              }, 450);
            }}
            style={{
              height: 48,
              borderRadius: 100,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#111827"
            }}
          >
            <AppText weight={SEMI_BOLD} style={{ color: "#FFF" }}>Continue</AppText>
          </TouchableOpacity>
        </View>
      </RBSheet>

      <RBSheet customModalProps={{ statusBarTranslucent: true }}
        ref={withdrawSecuritySheetRef}
        closeOnDragDown
        closeOnPressMask
        height={480}
        customStyles={{
          container: {
            backgroundColor: themeColors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          },
          draggableIcon: { backgroundColor: isDark ? themeColors.border : "#DDD" },
        }}
      >
        <View style={{ padding: 24 }}>
          <AppText weight={BOLD} type={SIXTEEN} style={{ color: themeColors.text, marginBottom: 8 }}>
            {withdrawToTab === "agce_user" && agceRecipientTab === "email" ? "Verify your email" : "Security verification"}
          </AppText>
          <AppText type={TWELVE} style={{ color: themeColors.secondaryText, lineHeight: 18, marginBottom: 20 }}>
            Complete all required steps. For email or SMS, tap Send code to receive your OTP, then enter it below.
          </AppText>

          <View style={{ marginBottom: 32 }}>
            <AppText weight={MEDIUM} type={TWELVE} style={{ color: themeColors.text, marginBottom: 12 }}>Email verification code</AppText>
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: isDark ? darkTheme.darkThemeInputColor : lightTheme.input,
              borderRadius: 12,
              height: 52,
              paddingHorizontal: 16
            }}>
              <TextInput
                placeholder="Enter email code"
                placeholderTextColor={themeColors.secondaryText}
                value={otp}
                onChangeText={setOtp}
                keyboardType="numeric"
                style={{ flex: 1, color: themeColors.text, fontSize: 14 }}
              />
              <TouchableOpacity
                onPress={handleGetOtp}
                disabled={disableBtn}
                style={{ paddingLeft: 12 }}
              >
                <AppText weight={MEDIUM} type={TWELVE} style={{ color: disableBtn ? themeColors.secondaryText : "#C5A161" }}>
                  {disableBtn ? `Resend (${timer}s)` : "Send code"}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            disabled={otp.length !== 6}
            onPress={() => {
              withdrawSecuritySheetRef.current?.close();
              handleWithdraw();
            }}
            style={{
              height: 52,
              borderRadius: 100,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: otp.length === 6 ? colors.black : "#777",
              marginBottom: 24
            }}
          >
            <AppText weight={SEMI_BOLD} style={{ color: "#FFF" }}>Confirm withdrawal</AppText>
          </TouchableOpacity>

          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
            <FastImage
              source={SECURITY_SHEIELD}
              style={{ width: 16, height: 16, marginRight: 8 }}
              resizeMode="contain"
              tintColor={themeColors.secondaryText}
            />
            <AppText type={TEN} style={{ color: themeColors.secondaryText }}>Protected by Advanced Encryption</AppText>
          </View>
        </View>
      </RBSheet>


      {withdrawLimitInfoSheetOnly}
      {networkFeeInfoSheetOnly}

      <RBSheet customModalProps={{ statusBarTranslucent: true }}
        ref={faqSheetRef}
        height={600}
        closeOnDragDown
        closeOnPressMask
        customStyles={{
          container: { backgroundColor: themeColors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
          draggableIcon: { backgroundColor: isDark ? themeColors.border : "#DDD" }
        }}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: themeColors.text }}>
              Withdraw help
            </AppText>
            <TouchableOpacity onPress={() => faqSheetRef.current?.close()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <AppText type={TWENTY} style={{ color: themeColors.text }}>
                ×
              </AppText>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {faqData.map((item, index) => (
              <View
                key={String(index)}
                style={[
                  styles.faqItemInner,
                  index === faqData.length - 1 && styles.faqItemInnerLast,
                  { borderColor: isDark ? themeColors.border : colors.inputBorder },
                ]}
              >
                <TouchableOpacity
                  style={styles.faqQuestionRow}
                  onPress={() => setFaqActiveIndex(faqActiveIndex === index ? null : index)}
                  activeOpacity={0.7}
                >
                  <AppText type={THIRTEEN} weight={SEMI_BOLD} style={[styles.faqQuestion, { color: themeColors.secondaryText }]}>
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
                      <AppText key={lineIndex} type={TWELVE} style={{ color: themeColors.secondaryText, lineHeight: 18 }}>
                        {line}
                      </AppText>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </RBSheet>

      <Modal visible={withdrawAvailSourceOpen} animationType="fade" transparent onRequestClose={() => setWithdrawAvailSourceOpen(false)}>
        <View style={[styles.modalOverlay, { justifyContent: "center", paddingBottom: 24 }]}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: themeColors.background,
                borderColor: isDark ? themeColors.border : "#EEE",
                borderWidth: 1,
                maxWidth: 400,
                alignSelf: "center",
                width: "100%",
                marginHorizontal: 20,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: themeColors.text }}>
                Main Wallet
              </AppText>
              <TouchableOpacity onPress={() => setWithdrawAvailSourceOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <AppText type={TWENTY} style={{ color: themeColors.text }}>×</AppText>
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <AppText weight={SEMI_BOLD} type={THIRTEEN} style={{ color: themeColors.text, marginBottom: 8 }}>
                {formatFundAvailableFromRow(mainWalletFundRow)} {selectedCurrency?.short_name}
              </AppText>
              <AppText type={TWELVE} style={{ color: themeColors.secondaryText, lineHeight: 18 }}>
                • Withdrawals use your Main Wallet balance only.
              </AppText>
              <Button
                children="OK"
                containerStyle={{ marginTop: 16, borderRadius: 10 }}
                onPress={() => setWithdrawAvailSourceOpen(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Verification Reminder Sheet */}
      <RBSheet customModalProps={{ statusBarTranslucent: true }}
        ref={verifyReminderSheetRef}
        height={300}
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
        <View style={{ padding: 24 }}>
          <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 16 }}>Verification Reminder</AppText>
          <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginBottom: 24, lineHeight: 18 }}>
            In line with compliance and travel rule obligations, we need you to register and verify this destination once before we can send funds. Complete the address certification flow a single time; approved addresses are stored in your address book and will not require repeat verification for future withdrawals to the same destination.
          </AppText>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 16, width: "100%" }}>
            <Button
              children="Cancel"
              containerStyle={{
                flex: 1,
                flexBasis: 0,
                backgroundColor: isDark ? themeColors.border : "#EDEDEE",
                borderRadius: 100,
                height: 44
              }}
              titleStyle={{ color: themeColors.text, fontWeight: "600", fontSize: 14 }}
              onPress={() => verifyReminderSheetRef.current?.close()}
            />
            <Button
              children="Verify Now"
              containerStyle={{
                flex: 1,
                flexBasis: 0,
                backgroundColor: isDark ? "#FFFFFF" : "#111827",
                borderRadius: 100,
                height: 44
              }}
              titleStyle={{ color: isDark ? "#000000" : "#FFFFFF", fontWeight: "600", fontSize: 14 }}
              onPress={() => {
                verifyReminderSheetRef.current?.close();
                setTimeout(() => {
                  setSaveAddrCoin(selectedCurrency?.short_name || "");
                  setSaveAddrNetwork(network || "");
                  setSaveAddrAddress(withdrawAddress || "");
                  setSaveAddrCoinOpen(false);
                  setSaveAddrNetworkOpen(false);
                  saveAddressSheetRef.current?.open();
                }, 300);
              }}
            />
          </View>
        </View>
      </RBSheet>

      {/* Add Withdrawal Address Form Sheet */}
      <RBSheet customModalProps={{ statusBarTranslucent: true }}
        ref={saveAddressSheetRef}
        closeOnDragDown={false}
        closeOnPressBack={false}
        closeOnPressMask={false}
        keyboardAvoidingViewEnabled={Platform.OS === "ios"}
        onClose={resetAddAddressForm} // Clear form on close
        height={
          (saveAddrStep === "owner" || saveAddrStep === "wallet_type" || saveAddrStep === "proof_select" || saveAddrStep === "otp")
            ? 400
            : (saveAddrStep === "verify_method")
              ? 460
              : (saveAddrStep === "exchange")
                ? 560
                : Math.round(Dimensions.get("window").height * 0.88)
        }
        customStyles={{
          container: {
            backgroundColor: themeColors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          },
          wrapper: { backgroundColor: "rgba(0,0,0,0.6)" },
          draggableIcon: { display: "none" }
        }}
      >
        <View style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 10,
          paddingBottom: Platform.OS === "ios" ? 24 : 16
        }}>
          <View style={{ flexDirection: "row", marginBottom: 16, paddingTop: 6, justifyContent: "center" }}>
            <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, textAlign: "center" }}>
              {saveAddrStep === "form"
                ? "Add withdrawal address"
                : (saveAddrStep === "verify_method")
                  ? "Verify your identity"
                  : (saveAddrStep === "otp")
                    ? (selectedSaveAddrVerifyMethod === "email" ? "Verify your email" : selectedSaveAddrVerifyMethod === "mobile" ? "Verify your phone" : "Verify your identity")
                    : (saveAddrStep === "satoshi" || saveAddrStep === "metamask")
                      ? "Verify withdrawal address"
                      : "Address confirmation"}
            </AppText>
          </View>

          <KeyboardAwareScrollView
            enableOnAndroid={true}
            enableAutomaticScroll={true}
            extraScrollHeight={Platform.OS === "ios" ? 40 : 120}
            extraHeight={Platform.OS === "ios" ? 40 : 120}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
            style={{ flex: 1 }}
          >
            <AddWithdrawalAddressBasics
              saveAddrCountrySheetRef={saveAddrCountrySheetRef}
              isDark={isDark}
              themeColors={themeColors}
              userData={userData}
              saveAddrStep={saveAddrStep}
              saveAddrLabel={saveAddrLabel}
              setSaveAddrLabel={setSaveAddrLabel}
              saveAddrCoin={saveAddrCoin}
              setSaveAddrCoin={setSaveAddrCoin}
              withdrawCoins={withdrawCoinsList}
              saveAddrCoinOpen={saveAddrCoinOpen}
              setSaveAddrCoinOpen={setSaveAddrCoinOpen}
              saveAddrAddress={saveAddrAddress}
              setSaveAddrAddress={setSaveAddrAddress}
              saveAddrAddressTouched={saveAddrAddressTouched}
              setSaveAddrAddressTouched={setSaveAddrAddressTouched}
              saveAddrAddressValidating={saveAddrAddressValidating}
              saveAddrAddressValidError={saveAddrAddressValidError}
              saveAddrAddressInlineError={saveAddrAddressInlineError}
              validateSaveAddrAddressApiRef={validateSaveAddrAddressApiRef}
              saveAddrNetwork={saveAddrNetwork}
              setSaveAddrNetwork={setSaveAddrNetwork}
              saveAddrNetworkOpen={saveAddrNetworkOpen}
              setSaveAddrNetworkOpen={setSaveAddrNetworkOpen}
              CHAIN_FULL_NAMES={CHAIN_FULL_NAMES}
              saveAddrMemo={saveAddrMemo}
              setSaveAddrMemo={setSaveAddrMemo}
              saveAddrProofMethod={saveAddrProofMethod}
              setSaveAddrProofMethod={setSaveAddrProofMethod}
              saveAddrBenFullName={saveAddrBenFullName}
              setSaveAddrBenFullName={setSaveAddrBenFullName}
              saveAddrBenPan={saveAddrBenPan}
              setSaveAddrBenPan={setSaveAddrBenPan}
              saveAddrBenCountry={saveAddrBenCountry}
              setSaveAddrBenCountry={setSaveAddrBenCountry}
              saveAddrBenPin={saveAddrBenPin}
              setSaveAddrBenPin={setSaveAddrBenPin}
              saveAddrBenAddress={saveAddrBenAddress}
              setSaveAddrBenAddress={setSaveAddrBenAddress}
              saveAddrVerifyOptions={saveAddrVerifyOptions}
              selectedSaveAddrVerifyMethod={selectedSaveAddrVerifyMethod}
              setSelectedSaveAddrVerifyMethod={setSelectedSaveAddrVerifyMethod}
              getWithdrawNetworksOrStaticFallback={getWithdrawNetworksOrStaticFallback}
              saveAddrOwnership={saveAddrOwnership}
              setSaveAddrOwnership={setSaveAddrOwnership}
              saveAddrWalletType={saveAddrWalletType}
              setSaveAddrWalletType={setSaveAddrWalletType}
              saveAddrExchange={saveAddrExchange}
              setSaveAddrExchange={setSaveAddrExchange}
              saveAddrExchangeSearch={saveAddrExchangeSearch}
              setSaveAddrExchangeSearch={setSaveAddrExchangeSearch}
              saveAddrExchangeOpen={saveAddrExchangeOpen}
              setSaveAddrExchangeOpen={setSaveAddrExchangeOpen}
              ADDRESS_BOOK_TOP_EXCHANGES={ADDRESS_BOOK_TOP_EXCHANGES}
              ADDRESS_BOOK_EXCHANGE_OTHER={ADDRESS_BOOK_EXCHANGE_OTHER}
              saveAddrExchangeManual={saveAddrExchangeManual}
              setSaveAddrExchangeManual={setSaveAddrExchangeManual}
              saveAddrDeclarationAccepted={saveAddrDeclarationAccepted}
              setSaveAddrDeclarationAccepted={setSaveAddrDeclarationAccepted}
              ADDRESS_BOOK_DECLARATION_TEXT={ADDRESS_BOOK_DECLARATION_TEXT}
              upIcon={upIcon}
              downIcon={downIcon}
              checkIc={checkIc}
              SECURITY_SHEIELD={SECURITY_SHEIELD}
              EMAIL_VERIFY={EMAIL_VERIFY}
              PHONE_VERIFY={PHONE_VERIFY}
              GOOGLE_VERIFY={GOOGLE_VERIFY}
              PASSKEY_VERIFY={PASSKEY_VERIFY}
            />

            <AddWithdrawalAddressVerification
              isDark={isDark}
              themeColors={themeColors}
              saveAddrStep={saveAddrStep}
              selectedSaveAddrVerifyMethod={selectedSaveAddrVerifyMethod}
              saveAddrOtp={saveAddrOtp}
              setSaveAddrOtp={setSaveAddrOtp}
              saveAddrWhitelistData={saveAddrWhitelistData}
              userData={userData}
              saveAddrOtpTimer={saveAddrOtpTimer}
              saveAddrResendActive={saveAddrResendActive}
              handleResendSaveAddrOtp={handleResendSaveAddrOtp}
              saveAddrSatoshiPolling={saveAddrSatoshiPolling}
              satoshiWhitelistAwaitingProof={satoshiWhitelistAwaitingProof}
              setSatoshiDepositLoading={setSatoshiDepositLoading}
              setSaveAddrStep={setSaveAddrStep}
              satoshiDepositLoading={satoshiDepositLoading}
              satoshiDepositError={satoshiDepositError}
              handleSatoshiWhitelistSent={handleSatoshiWhitelistSent}
              SECURITY_SHEIELD={SECURITY_SHEIELD}
              LOCKED={LOCKED}
              bitcoinIcon={bitcoinIcon}
            />
          </KeyboardAwareScrollView>

          {saveAddrStep === "satoshi" || saveAddrStep === "metamask" ? (
            <View style={{ marginTop: 16, paddingBottom: 10, alignItems: "center" }}>
              <Button
                children={
                  saveAddrBusy
                    ? "..."
                    : saveAddrStep === "metamask"
                      ? "Sign with MetaMask"
                      : saveAddrSatoshiPolling
                        ? "Checking..."
                        : satoshiWhitelistAwaitingProof
                          ? "Check again"
                          : "I've sent the payment"
                }
                disabled={saveAddrBusy}
                containerStyle={{
                  width: "100%",
                  backgroundColor: isDark ? "#FFFFFF" : "#111827",
                  borderRadius: 100,
                  height: 44,
                  opacity: saveAddrBusy ? 0.6 : 1
                }}
                titleStyle={{ color: isDark ? "#000000" : "#FFFFFF", fontWeight: "600" }}
                onPress={() => {
                  if (saveAddrStep === "satoshi") {
                    handleSatoshiWhitelistSent();
                  } else if (saveAddrStep === "metamask") {
                    const dappUrl = "arabglobalexchange.com/wallet/withdraw";
                    const metamaskDeepLink = `https://metamask.app.link/dapp/${dappUrl}`;

                    Linking.canOpenURL(metamaskDeepLink).then(supported => {
                      if (supported) {
                        Linking.openURL(metamaskDeepLink);
                      } else {
                        // Redirect to store if not installed
                        const storeUrl = Platform.OS === 'ios'
                          ? 'https://apps.apple.com/app/metamask/id1438144202'
                          : 'https://play.google.com/store/apps/details?id=io.metamask';
                        Linking.openURL(storeUrl);
                      }
                    }).catch(() => {
                      showError("Could not open MetaMask. Please ensure it is installed.");
                    });
                  }
                }}
              />
              <TouchableOpacity
                onPress={() => {
                  if (satoshiResumeMode) {
                    setSatoshiResumeMode(false);
                    saveAddressSheetRef.current?.close();
                  } else {
                    setSaveAddrStep("otp");
                  }
                }}
                style={{ marginTop: 14, paddingVertical: 6 }}
              >
                <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? "#FFFFFF" : "#000000" }}>
                  Back
                </AppText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 12, marginTop: 20, paddingBottom: 10, width: "100%" }}>
              <Button
                children={saveAddrStep === "form" ? "Cancel" : "Back"}
                containerStyle={{
                  flex: 1,
                  flexBasis: 0,
                  backgroundColor: isDark ? themeColors.border : "#EDEDEE",
                  borderRadius: 100,
                  height: 44
                }}
                titleStyle={{ color: themeColors.text, fontWeight: "600", fontSize: 14 }}
                onPress={() => {
                  if (saveAddrStep === "form") {
                    saveAddressSheetRef.current?.close();
                  } else if (saveAddrStep === "owner") {
                    setSaveAddrStep("form");
                  } else if (saveAddrStep === "other_identity") {
                    setSaveAddrStep("owner");
                  } else if (saveAddrStep === "wallet_type") {
                    if (saveAddrOwnership === "SELF") setSaveAddrStep("owner");
                    else setSaveAddrStep("other_identity");
                  } else if (saveAddrStep === "exchange") {
                    setSaveAddrStep("wallet_type");
                  } else if (saveAddrStep === "proof_select") {
                    setSaveAddrStep("wallet_type");
                  } else if (saveAddrStep === "verify_method") {
                    if (saveAddrWalletType === "EXCHANGE") setSaveAddrStep("exchange");
                    else {
                      if (saveAddrOwnership === "SELF") setSaveAddrStep("proof_select");
                      else setSaveAddrStep("wallet_type");
                    }
                  } else if (saveAddrStep === "otp") {
                    setSaveAddrStep("verify_method");
                  }
                }}
              />
              {(() => {
                const isNextDisabled = saveAddrBusy || (
                  (saveAddrStep === "form" && (
                    saveAddrLabel.trim().length < 4 ||
                    !saveAddrCoin ||
                    !saveAddrNetwork ||
                    !saveAddrAddress.trim() ||
                    saveAddrAddressValidating ||
                    !!saveAddrAddressValidError ||
                    !!saveAddrAddressInlineError ||
                    saveAddrAddressValidatedKey !== withdrawalAddressValidationKey(saveAddrNetwork, saveAddrAddress, saveAddrTokenAssetId)
                  )) ||
                  (saveAddrStep === "owner" && !saveAddrOwnership) ||
                  (saveAddrStep === "wallet_type" && !saveAddrWalletType) ||
                  (saveAddrStep === "proof_select" && !saveAddrProofMethod) ||
                  (saveAddrStep === "other_identity" && (!saveAddrBenFullName || !saveAddrBenPan || !saveAddrBenCountry || !saveAddrBenPin || !saveAddrBenAddress)) ||
                  (saveAddrStep === "exchange" && (!saveAddrExchange || (saveAddrExchange === ADDRESS_BOOK_EXCHANGE_OTHER && !saveAddrExchangeManual.trim()) || !saveAddrDeclarationAccepted)) ||
                  (saveAddrStep === "verify_method" && !selectedSaveAddrVerifyMethod) ||
                  (saveAddrStep === "otp" && saveAddrOtp.length < 6)
                );

                let buttonText = "Next";
                if (saveAddrStep === "verify_method" || saveAddrStep === "proof_select" || saveAddrStep === "other_identity") buttonText = "Continue";
                else if (saveAddrStep === "otp") buttonText = "Verify";

                const nextBtnBg = isDark
                  ? "#FFFFFF"
                  : (isNextDisabled ? "#E5E7EB" : "#111827");

                const nextBtnTextColor = isDark
                  ? "#000000"
                  : (isNextDisabled ? "#9CA3AF" : "#FFFFFF");

                return (
                  <Button
                    children={saveAddrBusy ? "..." : buttonText}
                    disabled={isNextDisabled}
                    containerStyle={{
                      flex: 1,
                      flexBasis: 0,
                      backgroundColor: nextBtnBg,
                      borderRadius: 100,
                      height: 44,
                      opacity: isNextDisabled ? (isDark ? 0.35 : 0.6) : 1
                    }}
                    titleStyle={{ color: nextBtnTextColor, fontWeight: "600", fontSize: 14 }}
                    onPress={async () => {
                      if (saveAddrStep === "form") {
                        setSaveAddrStep("owner");
                        return;
                      }

                      if (saveAddrStep === "owner") {
                        if (saveAddrOwnership === "SELF") setSaveAddrStep("wallet_type");
                        else setSaveAddrStep("other_identity");
                        return;
                      }

                      if (saveAddrStep === "other_identity") {
                        setSaveAddrStep("wallet_type");
                        return;
                      }

                      if (saveAddrStep === "wallet_type") {
                        if (saveAddrWalletType === "EXCHANGE") {
                          setSaveAddrStep("exchange");
                        } else {
                          if (saveAddrOwnership === "SELF") setSaveAddrStep("proof_select");
                          else {
                            // For OTHER, self-hosted goes directly to verify_account in web?
                            // Actually, web goes to VERIFY_ACCOUNT.
                            setSaveAddrBusy(true);
                            try {
                              const res = await appOperation.customer.fetch_address_book_verification_options();
                              if (res?.success) {
                                const rawMethods = res?.data?.available_methods || [];
                                const methods = rawMethods.map(m => String(m).toLowerCase());
                                const rec = String(res?.data?.recommended || "").toLowerCase();

                                setSaveAddrVerifyOptions(methods);
                                setSaveAddrStep("verify_method");
                                if (methods.includes("email")) {
                                  setSelectedSaveAddrVerifyMethod("email");
                                } else if (rec && methods.includes(rec)) {
                                  setSelectedSaveAddrVerifyMethod(rec);
                                } else if (methods.length > 0) {
                                  setSelectedSaveAddrVerifyMethod(methods[0]);
                                }
                                setSaveAddrResendActive(false);
                              } else {
                                showError(res?.message || "Could not load verification options");
                              }
                            } catch (e) {
                              showError("Error loading verification options");
                            } finally {
                              setSaveAddrBusy(false);
                            }
                          }
                        }
                        return;
                      }

                      if (saveAddrStep === "proof_select") {
                        setSaveAddrBusy(true);
                        try {
                          const res = await appOperation.customer.fetch_address_book_verification_options();
                          if (res?.success) {
                            const methods = res.data?.available_methods || [];
                            const rec = res.data?.recommended;
                            setSaveAddrVerifyOptions(methods);
                            setSaveAddrStep("verify_method");
                            if (methods.includes("email")) {
                              setSelectedSaveAddrVerifyMethod("email");
                            } else if (rec && methods.includes(rec)) {
                              setSelectedSaveAddrVerifyMethod(rec);
                            } else if (methods.length > 0) {
                              setSelectedSaveAddrVerifyMethod(methods[0]);
                            }
                          } else {
                            showError(res?.message || "Could not load verification options");
                          }
                        } catch (e) {
                          showError("Error loading verification options");
                        } finally {
                          setSaveAddrBusy(false);
                        }
                        return;
                      }

                      if (saveAddrStep === "exchange") {
                        if (!saveAddrExchange) {
                          showError("Please select an exchange");
                          return;
                        }
                        setSaveAddrBusy(true);
                        try {
                          const res = await appOperation.customer.fetch_address_book_verification_options();
                          if (res?.success) {
                            const methods = res.data?.available_methods || [];
                            const rec = res.data?.recommended;
                            setSaveAddrVerifyOptions(methods);
                            setSaveAddrStep("verify_method");
                            if (methods.includes("email")) {
                              setSelectedSaveAddrVerifyMethod("email");
                            } else if (rec && methods.includes(rec)) {
                              setSelectedSaveAddrVerifyMethod(rec);
                            } else if (methods.length > 0) {
                              setSelectedSaveAddrVerifyMethod(methods[0]);
                            }
                          } else {
                            showError(res?.message || "Could not load verification options");
                          }
                        } catch (e) {
                          showError("Error loading verification options");
                        } finally {
                          setSaveAddrBusy(false);
                        }
                        return;
                      }

                      if (saveAddrStep === "verify_method") {
                        let method = selectedSaveAddrVerifyMethod || (saveAddrVerifyOptions.includes("email") ? "email" : (saveAddrVerifyOptions.includes("mobile") ? "mobile" : saveAddrVerifyOptions[0]));
                        if (!method) method = "email"; // Hard fallback

                        if (method === "email" || method === "mobile") {
                          setSaveAddrBusy(true);
                          setSaveAddrOtpTimer(60);
                          setSaveAddrResendActive(false);
                          try {
                            // Try primary endpoint first (Web parity)
                            let res = await appOperation.customer.send_address_book_verification_otp({ method });

                            // Fallback to security OTP if primary fails
                            if (!res?.success) {
                              res = await appOperation.customer.withdrawal_verification_otp({ method });
                            }

                            if (res?.success) {
                              showSuccess(res.message || "Verification code sent");
                              setSaveAddrOtp(""); // Ensure field is empty for new code
                              setSaveAddrStep("otp");
                            } else {
                              showError(res?.message || "Could not send verification code");
                            }
                          } catch (e) {
                            showError("Error sending verification code");
                          } finally {
                            setSaveAddrBusy(false);
                          }
                        } else {
                          setSaveAddrOtp(""); // Ensure field is empty
                          setSaveAddrStep("otp");
                        }
                        return;
                      }

                      if (saveAddrStep === "otp") {
                        if (!saveAddrOtp.trim()) {
                          showError("Please enter verification code");
                          return;
                        }
                        setSaveAddrBusy(true);
                        try {
                          const method = selectedSaveAddrVerifyMethod || (saveAddrVerifyOptions.includes("email") ? "email" : (saveAddrVerifyOptions.includes("mobile") ? "mobile" : saveAddrVerifyOptions[0])) || "email";
                          const coinObj = withdrawCoinsList.find(c => String(c.short_name).toUpperCase() === String(saveAddrCoin).toUpperCase());

                          let tId = "";
                          if (coinObj?.networks) {
                            // Find the network object that matches the selected chain (saveAddrNetwork)
                            const net = coinObj.networks.find(n =>
                              String(n.code).toUpperCase() === String(saveAddrNetwork).toUpperCase() ||
                              String(n.short_name).toUpperCase() === String(saveAddrNetwork).toUpperCase()
                            );
                            if (net) {
                              tId = net.tokenAssetId || net.assetId || net.id;
                            }
                          }

                          // Fallback to token_asset_ids if networks list doesn't yield an ID
                          if (!tId && coinObj?.token_asset_ids) {
                            const targetNet = String(saveAddrNetwork).toUpperCase();
                            tId = coinObj.token_asset_ids[saveAddrNetwork] || coinObj.token_asset_ids[targetNet];
                            if (!tId) {
                              const fuzzyKey = Object.keys(coinObj.token_asset_ids).find(k =>
                                k.toUpperCase().includes(targetNet) || targetNet.includes(k.toUpperCase())
                              );
                              if (fuzzyKey) tId = coinObj.token_asset_ids[fuzzyKey];
                            }
                          }
                          const resolvedAssetId = tId || saveAddrNetwork;

                          const payload = {
                            label: saveAddrLabel,
                            coin: saveAddrCoin,
                            chain: canonicalWithdrawalChainForValidateAddress(saveAddrNetwork),
                            address: saveAddrAddress,
                            memo: saveAddrMemo,
                            ownership: saveAddrOwnership === "SELF" ? "SELF" : "OTHER",
                            wallet_type: saveAddrWalletType === "SELF_HOSTED" ? "NON_CUSTODIAL" : "CUSTODIAL",
                            exchange_name: saveAddrExchange === ADDRESS_BOOK_EXCHANGE_OTHER ? saveAddrExchangeManual.trim() : saveAddrExchange,
                            ...(saveAddrOwnership === "OTHER" ? {
                              other_person: {
                                full_name: saveAddrBenFullName.trim(),
                                national_id: saveAddrBenPan.trim(),
                                country: saveAddrBenCountry.trim(),
                                pincode: saveAddrBenPin.trim(),
                                full_address: saveAddrBenAddress.trim(),
                              }
                            } : {}),
                            verification_method: method,
                            method: saveAddrProofMethod || "SATOSHI",
                            verification_code: String(saveAddrOtp).trim(),
                            tokenAssetId: resolvedAssetId
                          };
                          console.warn("[API] Initiate Whitelist Payload:", JSON.stringify(payload, null, 2));
                          const res = await appOperation.customer.initiate_address_book_whitelist(payload);
                          console.warn("[API] Whitelist Response:", JSON.stringify(res, null, 2));
                          if (res?.success) {
                            const d = res.data?.data || res.data || {};
                            if (d.status?.toUpperCase() === "APPROVED") {
                              showSuccess("Address added and verified successfully.");
                              saveAddressSheetRef.current?.close();
                              const res2 = await appOperation.customer.get_wallet_address_book();
                              if (res2?.success && res2?.data) {
                                const list = Array.isArray(res2.data) ? res2.data : (res2.data.rows || res2.data.addresses || []);
                                setAddressBookEntries(list);
                              }
                            } else {
                              // Web Parity: Attach resolvedAssetId and shortName manually
                              const flowData = {
                                ...d,
                                tokenAssetId: resolvedAssetId,
                                shortName: saveAddrCoin
                              };
                              setSaveAddrWhitelistData(flowData);

                              const method = String(d.method || "").toUpperCase();
                              if (method === "SATOSHI") {
                                setSaveAddrStep("satoshi");
                                setSatoshiDepositLoading(true);

                                const coinObj = withdrawCoinsList.find(c => (c.coin || c.short_name || "").toUpperCase() === String(saveAddrCoin).toUpperCase());
                                let finalId = resolvedAssetId;

                                if (coinObj && d.proof_chain) {
                                  const targetNet = String(d.proof_chain).toUpperCase();
                                  // Priority 1: Check networks array for exact match or fuzzy match
                                  const net = coinObj.networks?.find(n =>
                                    String(n.code).toUpperCase() === targetNet ||
                                    String(n.short_name).toUpperCase() === targetNet ||
                                    String(n.tokenAssetId || "").toUpperCase().includes(targetNet)
                                  );

                                  if (net?.tokenAssetId || net?.assetId) {
                                    finalId = net.tokenAssetId || net.assetId;
                                  } else if (coinObj.token_asset_ids?.[d.proof_chain]) {
                                    finalId = coinObj.token_asset_ids[d.proof_chain];
                                  } else {
                                    finalId = coinObj.coin || coinObj.short_name || targetNet;
                                  }
                                }

                                (async () => {
                                  try {
                                    console.warn("[DEBUG] Fetching address for:", finalId);
                                    const addrRes = await appOperation.customer.get_and_generate_address({
                                      assetId: finalId,
                                      tokenAssetId: finalId,
                                      short_name: saveAddrCoin,
                                      generate: true
                                    });
                                    console.warn("[API] Satoshi Address Response:", JSON.stringify(addrRes, null, 2));
                                    if (addrRes?.success) {
                                      const dr = addrRes.data?.data || addrRes.data || {};
                                      const raw = dr.deposit_address || dr.address || dr.wallet_address || dr.walletAddress || dr.depositAddress || "";
                                      const mem = dr.memo || dr.tag || dr.destinationTag || dr.memoTag || "";
                                      if (raw) {
                                        setSaveAddrWhitelistData(prev => ({
                                          ...prev,
                                          deposit_address: String(raw),
                                          address: String(raw),
                                          memo: String(mem)
                                        }));
                                      }
                                    }
                                  } catch (e) {
                                    console.warn("Satoshi fetch failed", e);
                                  } finally {
                                    setSatoshiDepositLoading(false);
                                  }
                                })();
                              } else if (method === "METAMASK") {
                                setSaveAddrStep("metamask");
                              } else {
                                showSuccess("Address verification initiated.");
                                saveAddressSheetRef.current?.close();
                              }
                            }
                          } else {
                            showError(res?.message || "Verification failed");
                          }
                        } catch (e) {
                          showError(e?.message || "Error saving address");
                        } finally {
                          setSaveAddrBusy(false);
                        }
                        return;
                      }

                      if (saveAddrStep === "metamask") {
                        const dappUrl = "arabglobalexchange.com/wallet/withdraw";
                        const metamaskDeepLink = `https://metamask.app.link/dapp/${dappUrl}`;

                        Linking.canOpenURL(metamaskDeepLink).then(supported => {
                          if (supported) {
                            Linking.openURL(metamaskDeepLink);
                          } else {
                            // Redirect to store if not installed
                            const storeUrl = Platform.OS === 'ios'
                              ? 'https://apps.apple.com/app/metamask/id1438144202'
                              : 'https://play.google.com/store/apps/details?id=io.metamask';
                            Linking.openURL(storeUrl);
                          }
                        }).catch(() => {
                          showError("Could not open MetaMask. Please ensure it is installed.");
                        });
                      }
                    }}
                  />
                );
              })()}
            </View>
          )}
        </View>
      </RBSheet>

      {/* Removed withdrawVerifyCombinedSheetRef as it is now a full screen view */}

      {/* KYC Mandatory Modal - Redesigned to match reference */}
      <Modal
        visible={showKycModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={{
            backgroundColor: themeColors.background,
            width: "100%",
            borderRadius: 10,
            padding: 10,
            alignItems: "center",
            position: "relative",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 10,
          }}>
            {/* Close Button */}
            <TouchableOpacity
              onPress={() => {
                setShowKycModal(false);
                NavigationService.goBack();
              }}
              style={{ position: "absolute", right: 20, top: 20, zIndex: 10 }}
            >
              <AppText type={TWENTY} style={{ color: themeColors.text }}>✕</AppText>
            </TouchableOpacity>

            {/* Illustration */}
            <FastImage
              source={isDark ? account_restrictions_light : account_restrictions}
              style={{ width: 150, height: 150, marginBottom: 10 }}
              resizeMode="contain"
            />

            <AppText type={FIFTEEN} weight={BOLD} style={{ color: themeColors.text, textAlign: "center", marginBottom: 12 }}>
              Identity verification required
            </AppText>

            <AppText type={FOURTEEN} color={themeColors.secondaryText} style={{ textAlign: "center", lineHeight: 22, marginBottom: 32, paddingHorizontal: 10 }}>
              To withdraw crypto you must complete identity verification (KYC). Use the button below to open Identification in your profile. When your KYC status is verified, you can complete your withdrawal here.
            </AppText>

            <TouchableOpacity
              onPress={() => {
                setShowKycModal(false);
                NavigationService.navigate(KYC_STATUS_SCREEN);
              }}
              style={{
                backgroundColor: isDark ? colors.white : "#F3F4F6",
                height: 56,
                borderRadius: 28,
                justifyContent: "center",
                alignItems: "center",
                width: "90%"
              }}
            >
              <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: isDark ? colors.black : colors.white }}>Verify now</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SpinnerSecond loading={isWithdrawSubmitLoading} />
    </AppSafeAreaView>
  );
};

export default WithdrawForm;

const styles = StyleSheet.create({
  headerView: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  withdrawPageTitle: {
    marginTop: 8,
    marginBottom: 8,
  },
  wdStepBlock: {
    marginBottom: 14,
  },
  wdStepHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,

  },
  wdStepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  wdStepBadgeDone: {},
  wdCoinPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  wdTabsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    gap: 20,
  },
  wdTabWrap: {
    paddingBottom: 8,
    minWidth: 72,
    position: "relative",
  },
  wdTabUnderline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    borderRadius: 1,
  },
  wdNetworkPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  wdChipsRow: {
    paddingTop: 10,
    paddingBottom: 4,
    alignItems: "center",
    paddingRight: 8,
  },
  wdChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
  },
  wdAddressComposite: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 48,
    marginTop: 10,
    overflow: "hidden",
  },
  wdAddressField: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  wdAddressBookHit: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  wdWebScamNotice: {
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  wdAgcePillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  wdAgcePill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    // borderWidth: 1,
  },
  wdAgcePhoneWrap: {
    position: "relative",
  },
  wdAgcePhoneRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    minHeight: 48,
  },
  wdAgceCountryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "#00000022",
  },
  wdAgcePhoneInput: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  },
  agceCountrySheetInner: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  agceCountrySheetScroll: {
    flexGrow: 0,
  },
  agceCountrySheetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  withdrawAssetCard: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  withdrawNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "transparent",
  },
  withdrawCardDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 0,
  },
  withdrawNetworkBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  withdrawSectionTitle: {
    marginTop: 14,
    marginBottom: 6,
  },
  withdrawNoticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 2,
  },
  withdrawNoticeIcon: {
    width: 18,
    height: 18,
    marginTop: 1,
  },
  /** Web `withdraw_amt_meta_row` — available + network / refresh / 24h limits. */
  wdWithdrawMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  withdrawSummaryCard: {
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  withdrawSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  withdrawSummaryRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  withdrawAnnouncementsBlock: {
    marginTop: 18,
    marginBottom: 12,
  },
  withdrawAnnouncementsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  withdrawAnnouncementHeaderInner: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 0,
    borderRadius: 8,
  },
  withdrawAnnouncementContentInner: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalList: {
    maxHeight: 400,
  },
  networkSheetInner: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  networkSheetTitle: {
    marginBottom: 12,
  },
  networkSheetScroll: {
    maxHeight: SHEET_HEIGHT - 168,
  },
  networkCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  networkCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  networkCardLine: {
    marginTop: 4,
  },
  networkSheetNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 20,
  },
  networkSheetNoticeIcon: {
    width: 18,
    height: 18,
    marginRight: 10,
    marginTop: 2,
  },
  searchView: {
    flexDirection: "row",
    // justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEE",
    width: "100%",
    borderRadius: 10,
    height: 58,
    marginRight: 10
  },
  networkView: {
    borderWidth: 1,
    borderColor: "#EEE",
    marginTop: 20,
    padding: 15,
    borderRadius: 10,
  },
  chainView: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    overflow: "hidden"
  },
  addressView: {
    borderWidth: 1,
    borderColor: "#EEE",
    padding: 12,
    borderRadius: 10,
    marginTop: 10
  },
  nameView: {
    // borderColor: "#D4D4D4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // padding: 20,
    padding: 15,
    borderRadius: 10,
    backgroundColor: "transparent",
    // gap: 10
  },
  faqSectionWrap: {
    marginTop: 30,
    marginBottom: 20,
  },
  faqSectionCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    overflow: "hidden",
  },
  faqSectionCardTitle: {
    marginBottom: 8,
  },
  faqListWrap: {},
  faqScrollContent: { paddingBottom: 8 },
  faqItemInner: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(128,128,128,0.15)",
  },
  faqItemInnerLast: { borderBottomWidth: 0 },
  faqQuestionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQuestion: { flex: 1 },
  faqArrow: { width: 10, height: 10, marginLeft: 8 },
  faqAnswer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.2)",
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 8,
    marginBottom: 5,
  },
  faqContent: {
    padding: 15,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginBottom: 10,
  },
  faqText: {
    lineHeight: 20,
  },
  announcementsContainer: {
    maxHeight: 200,
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
  },
  announcementItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  emailFieldMain: {
    flex: 0,
    alignSelf: "stretch",
    width: "100%",
    marginBottom: 0,
  },
  emailSuggestWrap: {
    zIndex: 10,
    flexDirection: "column",
    alignItems: "stretch",
    alignSelf: "stretch",
    width: "100%",
    justifyContent: "flex-start",
  },
  emailSuggestList: {
    marginTop: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    maxHeight: 220,
    overflow: "hidden",
  },
  emailSuggestScroll: {
    maxHeight: 220,
  },
  emailSuggestRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
});
