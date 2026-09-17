import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Share } from 'react-native';
import { USER_TOKEN_KEY, USER_REFRESH_TOKEN_KEY } from './Constants';
import { appOperation } from '../appOperation';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import Clipboard from '@react-native-community/clipboard';
import { showError } from './logger';
import moment from 'moment';
import { AMBER, GREEN, RED, WHITE } from '../shared';
import { colors } from '../theme/colors';
import { MiddlewareArray, ThunkMiddleware } from '@reduxjs/toolkit';
import { ToolkitStore } from '@reduxjs/toolkit/dist/configureStore';
import { EmptyObject, AnyAction, CombinedState } from 'redux';
import { HomeSliceProps, WalletSliceProps } from './types';

export const shareToAny = (message: string) => {
  const shareOptions = {
    message: message,
  };

  Share.share(shareOptions);
};

export const validateEmail = (email: string) => {
  const expression = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  if (!expression.test(String(email).toLowerCase())) return false;

  // Additional check to prevent common typo domains, e.g., gmail.co instead of gmail.com
  const typoDomains = ['gmail.co', 'yahoo.co', 'hotmail.co', 'outlook.co'];
  const domain = email.split('@')[1]?.toLowerCase();
  if (typoDomains.includes(domain)) {
    return false;
  }

  return true;
};

export const validatePassword = (value: string) => {
  const expression =
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/i;

  return expression.test(value);
};

/** Web-aligned: 8+ chars, at least one upper, one lower, one number, one special [#?!@$%^&*-] */
export const validatePasswordStrict = (value: string) =>
  /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/.test(value);

export const isEmptyObject = (obj: Object) => {
  return Object.keys(obj).length === 0;
};

export const checkValidPanCardNumber = (panNumber: string) => {
  let regex = /([A-Z]){5}([0-9]){4}([A-Z]){1}$/;
  return regex.test(panNumber?.toUpperCase());
};

export const checkValidAdharCardNumber = (adharNumber: string) => {
  let regex = new RegExp(/^[2-9]{1}[0-9]{3}\s{1}[0-9]{4}\s{1}[0-9]{4}$/);
  return regex.test(adharNumber);
};

export const checkValidDrivingLicenseNumber = (
  drivingLicenseNumber: string,
) => {
  let regex = new RegExp(/^(([A-Z]{2}[0-9]{2})( )|([A-Z]{2}[0-9]{2}))((19|20)[0-9][0-9])[0-9]{7}$/);
  return regex.test(drivingLicenseNumber);
};


export const setAadharNumber = (text: string) => {
  // Format the Aadhaar number with spaces every 4 digits
  const formattedText = text
    .replace(/[^\d]/g, '') // Remove any non-digit characters
    .replace(/(.{4})/g, '$1 ') // Insert a space every 4 digits
    .trim(); // Remove trailing spaces

  return formattedText;
};
export const twoFixedZero = (value: string | number) => {
  let val = Number(value);
  return val?.toFixed(0);
};
export const twoFixedTwo = (value: string | number) => {
  let val = Number(value);
  if (isNaN(val)) {
    return 0;
  }
  return parseFloat(val?.toFixed(2));
};

export const toFixedThree = (value: string | number) => {
  let val = Number(value);
  return parseFloat(val?.toFixed(3));
};

export const checkToFixedThree = (value: string | number) => {
  let val = Number(value);
  if (isNaN(val)) {
    return 0;
  } else {
    return val?.toFixed(3);
  }

};

export const toFixedFive = (value: string | number) => {
  let val = Number(value);
  return parseFloat(val?.toFixed(5));
};

export const toFixedSix = (value: string | number) => {
  let val = Number(value);
  return parseFloat(val?.toFixed(6));
};

export const toFixedFour = (value: string | number) => {
  let val = Number(value);
  if (isNaN(val)) {
    return 0;
  } else {
    return parseFloat(val?.toFixed(4));
  }
};

export const toFixedEight = (value: string | number) => {
  let val = Number(value);
  if (isNaN(val) || !Number.isFinite(val)) {
    return "0.00";
  }
  return val < 1 ? val.toFixed(8) : val.toFixed(3);
};

export const SPOT_PAIR_QUOTES = [
  "USDT", "USDC", "FDUSD", "BUSD", "TUSD", "USDD", "DAI", "BTC", "ETH", "BNB", "SOL", "TRX", "TRY", "EUR", "GBP",
];

export function spotOpenOrderMarketLabel(item: any, selectedBase?: string, selectedQuote?: string) {
  if (!item) return "---/---";
  // Check common field names for pair/symbol
  const rawPair = item.pair ?? item.symbol ?? item.market ?? item.pair_name ?? "";
  const compact = rawPair != null ? String(rawPair).trim().toUpperCase() : "";

  if (compact && compact !== "---") {
    if (compact.includes("/")) {
      return compact;
    }
    for (const q of SPOT_PAIR_QUOTES) {
      if (compact.endsWith(q) && compact.length > q.length) {
        return `${compact.slice(0, -q.length)}/${q}`;
      }
    }
    return compact;
  }
  const ask =
    item?.ask_currency ||
    item?.base_currency ||
    item?.base_currency_short_name ||
    item?.base_asset ||
    selectedBase ||
    "---";
  const pay =
    item?.pay_currency ||
    item?.quote_currency ||
    item?.quote_currency_short_name ||
    item?.quote_asset ||
    selectedQuote ||
    "---";
  const sideUp = String(item?.side ?? "").toUpperCase();
  return sideUp === "SELL" ? `${pay}/${ask}` : `${ask}/${pay}`;
}

export function tradeHistoryBaseAsset(item: any, selectedBase?: string, selectedQuote?: string) {
  return spotOpenOrderMarketLabel(item, selectedBase, selectedQuote).split("/")[0] || "";
}
export const imagePathCorrection = (value: string) => {
  let temp = value?.replace('\\', '/');
  let temp2 = temp?.replace('\\', '/');
  return temp2;
};

import { setTheme } from '../slices/authSlice';

export const onAppStart = async (store: ToolkitStore<EmptyObject & { auth: { isLoading: boolean; userData: undefined; }; home: HomeSliceProps; account: { kycData: {}; userBankData: never[]; languages: { login_one: string; login_two: string; login_three: string; login_four: string; login_five: string; login_six: string; login_seven: string; welcome_one: string; welcome_two: string; welcome_three: string; welcome_four: string; welcome_five: string; welcome_six: string; welcome_seven: string; welcome_eight: string; forgot_one: string; forgot_two: string; forgot_three: string; forgot_four: string; register_one: string; register_two: string; register_three: string; register_four: string; register_five: string; register_six: string; register_seven: string; register_eight: string; register_nine: string; register_ten: string; otp_one: string; otp_two: string; otp_three: string; otp_four: string; otp_five: string; reset_one: string; reset_two: string; reset_three: string; memex: string; withdraw: string; earning: string; buy_crypto: string; arbitatry: string; swap: string; reward: string; more: string; spot: string; favorite: string; gainer: string; loser: string; symbol: string; last_price: string; change: string; top_search: string; wallet_one: string; wallet_two: string; wallet_three: string; wallet_four: string; history: string; account_one: string; account_two: string; account_three: string; account_four: string; account_five: string; account_six: string; account_seven: string; account_eight: string; account_nine: string; account_ten: string; account_eleven: string; account_twelve: string; account_thirteen: string; account_fourteen: string; profile_one: string; edit_one: string; camera: string; gallery: string; notification_one: string; nothing: string; notification_setting_one: string; notification_setting_two: string; notification_setting_three: string; setting_one: string; setting_two: string; setting_three: string; setting_four: string; setting_five: string; setting_six: string; setting_seven: string; setting_eight: string; mobile: string; email: string; kyc_one: string; kyc_two: string; kyc_three: string; kyc_four: string; kyc_five: string; kyc_six: string; kyc_seven: string; kyc_nine: string; kyc_ten: string; kyc_eleven: string; kyc_twelve: string; kyc_thirteen: string; kyc_fourteen: string; kyc_fifteen: string; kyc_sixteen: string; kyc_seventeen: string; kyc_eighteen: string; kyc_nineteen: string; kyc_twenty: string; bank_one: string; bank_two: string; bank_three: string; bank_four: string; invite_one: string; invite_two: string; invite_three: string; invite_four: string; invite_five: string; invite_six: string; invite_seven: string; place_userName: string; place_login_userName: string; place_email: string; place_password: string; place_newPassword: string; place_confirmNewPassword: string; place_otp: string; place_signUpPassword: string; place_signUPConfirmPassword: string; place_referCode: string; place_firstName: string; place_lastName: string; place_code: string; place_search: string; place_wallet: string; place_amount: string; place_amountInr: string; place_transaction: string; place_kycType: string; place_country: string; place_middleName: string; place_common: string; place_dob: string; place_docType: string; place_dateRange: string; place_message: string; place_accountType: string; place_bank: string; place_holder: string; place_number: string; place_ifsc: string; place_branch: string; place_kgin: string; place_empty: string; place__userName: string; error_userName: string; error_Email: string; error_Phone: string; error_userName_value: string; error_password: string; error_M_otp: string; error_E_otp: string; error_passwordMismatch: string; error_passwordRegex: string; error_oldPasswordRegex: string; error_firstName: string; error_lastName: string; error_cameraPermission: string; error_galleryPermission: string; error_currency: string; error_wallet: string; error_amount: string; error_transaction: string; error_proof: string; error_country: string; error_kycType: string; error_dob: string; error_address: string; error_state: string; error_city: string; error_pin: string; error_pan: string; error_confirmPan: string; error_panImage: string; error_docType: string; error_aadhar: string; error_license: string; error_docNumber: string; error_docFront: string; error_docBack: string; error_selfie: string; error_tradeReport: string; error_accountType: string; error_bank: string; error_holder: string; error_number: string; error_ifsc: string; error_branch: string; error_passbook: string; error_kgin: string; error_temp: string; error_email: string; error__userName: string; error_terms: string; title_firstName: string; title_lastName: string; title_phone: string; title_code: string; title_password: string; title_newPassword: string; title_confirmPassword: string; title_wallet: string; title_amount: string; title_country: string; title_kycType: string; title_middleName: string; title_address: string; title_state: string; title_city: string; title_pin: string; title_dob: string; title_gender: string; title_pan: string; title_confirmPan: string; title_docType: string; title_accountType: string; title_bank: string; title_holder: string; title_number: string; title_ifsc: string; title_branch: string; title_kgin: string; title_price: string; title_total: string; }; selectedLanguage: string; }; wallet: WalletSliceProps; }, AnyAction, MiddlewareArray<[ThunkMiddleware<CombinedState<{ auth: { isLoading: boolean; userData: undefined; }; home: HomeSliceProps; account: { kycData: {}; userBankData: never[]; languages: { login_one: string; login_two: string; login_three: string; login_four: string; login_five: string; login_six: string; login_seven: string; welcome_one: string; welcome_two: string; welcome_three: string; welcome_four: string; welcome_five: string; welcome_six: string; welcome_seven: string; welcome_eight: string; forgot_one: string; forgot_two: string; forgot_three: string; forgot_four: string; register_one: string; register_two: string; register_three: string; register_four: string; register_five: string; register_six: string; register_seven: string; register_eight: string; register_nine: string; register_ten: string; otp_one: string; otp_two: string; otp_three: string; otp_four: string; otp_five: string; reset_one: string; reset_two: string; reset_three: string; memex: string; withdraw: string; earning: string; buy_crypto: string; arbitatry: string; swap: string; reward: string; more: string; spot: string; favorite: string; gainer: string; loser: string; symbol: string; last_price: string; change: string; top_search: string; wallet_one: string; wallet_two: string; wallet_three: string; wallet_four: string; history: string; account_one: string; account_two: string; account_three: string; account_four: string; account_five: string; account_six: string; account_seven: string; account_eight: string; account_nine: string; account_ten: string; account_eleven: string; account_twelve: string; account_thirteen: string; account_fourteen: string; profile_one: string; edit_one: string; camera: string; gallery: string; notification_one: string; nothing: string; notification_setting_one: string; notification_setting_two: string; notification_setting_three: string; setting_one: string; setting_two: string; setting_three: string; setting_four: string; setting_five: string; setting_six: string; setting_seven: string; setting_eight: string; mobile: string; email: string; kyc_one: string; kyc_two: string; kyc_three: string; kyc_four: string; kyc_five: string; kyc_six: string; kyc_seven: string; kyc_nine: string; kyc_ten: string; kyc_eleven: string; kyc_twelve: string; kyc_thirteen: string; kyc_fourteen: string; kyc_fifteen: string; kyc_sixteen: string; kyc_seventeen: string; kyc_eighteen: string; kyc_nineteen: string; kyc_twenty: string; bank_one: string; bank_two: string; bank_three: string; bank_four: string; invite_one: string; invite_two: string; invite_three: string; invite_four: string; invite_five: string; invite_six: string; invite_seven: string; place_userName: string; place_login_userName: string; place_email: string; place_password: string; place_newPassword: string; place_confirmNewPassword: string; place_otp: string; place_signUpPassword: string; place_signUPConfirmPassword: string; place_referCode: string; place_firstName: string; place_lastName: string; place_code: string; place_search: string; place_wallet: string; place_amount: string; place_amountInr: string; place_transaction: string; place_kycType: string; place_country: string; place_middleName: string; place_common: string; place_dob: string; place_docType: string; place_dateRange: string; place_message: string; place_accountType: string; place_bank: string; place_holder: string; place_number: string; place_ifsc: string; place_branch: string; place_kgin: string; place_empty: string; place__userName: string; error_userName: string; error_Email: string; error_Phone: string; error_userName_value: string; error_password: string; error_M_otp: string; error_E_otp: string; error_passwordMismatch: string; error_passwordRegex: string; error_oldPasswordRegex: string; error_firstName: string; error_lastName: string; error_cameraPermission: string; error_galleryPermission: string; error_currency: string; error_wallet: string; error_amount: string; error_transaction: string; error_proof: string; error_country: string; error_kycType: string; error_dob: string; error_address: string; error_state: string; error_city: string; error_pin: string; error_pan: string; error_confirmPan: string; error_panImage: string; error_docType: string; error_aadhar: string; error_license: string; error_docNumber: string; error_docFront: string; error_docBack: string; error_selfie: string; error_tradeReport: string; error_accountType: string; error_bank: string; error_holder: string; error_number: string; error_ifsc: string; error_branch: string; error_passbook: string; error_kgin: string; error_temp: string; error_email: string; error__userName: string; error_terms: string; title_firstName: string; title_lastName: string; title_phone: string; title_code: string; title_password: string; title_newPassword: string; title_confirmPassword: string; title_wallet: string; title_amount: string; title_country: string; title_kycType: string; title_middleName: string; title_address: string; title_state: string; title_city: string; title_pin: string; title_dob: string; title_gender: string; title_pan: string; title_confirmPan: string; title_docType: string; title_accountType: string; title_bank: string; title_holder: string; title_number: string; title_ifsc: string; title_branch: string; title_kgin: string; title_price: string; title_total: string; }; selectedLanguage: string; }; wallet: WalletSliceProps; }>, AnyAction>]>>) => {
  try {
    const customerToken = await AsyncStorage.getItem(USER_TOKEN_KEY);
    const refreshToken = await AsyncStorage.getItem(USER_REFRESH_TOKEN_KEY);
    const theme = await AsyncStorage.getItem('theme');

    appOperation.setCustomerToken(customerToken as any);
    if (appOperation.setCustomerRefreshToken) {
      appOperation.setCustomerRefreshToken(refreshToken as any);
    }
    if (theme) {
      store.dispatch(setTheme(theme as string));
    }
  } catch (e) {
    console.error("On app start error:", e);
  }
};

export async function getCameraPermission() {
  let permission;

  if (Platform.OS === "android") {
    permission = PERMISSIONS.ANDROID.CAMERA;
  } else {
    permission = PERMISSIONS.IOS.CAMERA;
  }

  const result = await request(permission);

  return result === RESULTS.GRANTED;
}

export async function getGalleryPermissions() {
  if (Platform.OS === 'android') {
    // Android 13+ photo picker does not need gallery access.
    if (Platform.Version >= 33) {
      return true;
    }
    const result = await request(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
    return result === RESULTS.GRANTED;
  }

  const result = await request(PERMISSIONS.IOS.PHOTO_LIBRARY);
  return result === RESULTS.GRANTED;
}
export const copyText = (val: string) => {
  Clipboard.setString(val);
  showError('Copied');
};

export const dateFormatter = (date: string) => {
  let temp = moment(date).format('DD MMM, YYYY hh:mm a');
  return temp;
};

export const depositWithdrawColor = (type: string) => {
  if (type === 'DEPOSIT' || type === 'DEBIT') return GREEN;
  if (type === 'WITHDRAWAL' || type === 'CREDIT') return RED;
  else return WHITE;
};
export const statusColor = (status: string) => {
  if (status === 'SUCCESS') return colors.green;
  if (status === 'CANCEL') return colors.red;
  else return colors.amber;
};

export const numberColor = (value: number) => {
  if (value === 0) {
    return AMBER;
  }
  if (value < 0) {
    return RED;
  }
  if (value > 0) {
    return GREEN;
  }
};

export const getLastFour = (value: string) => {
  let temp = value.slice(-4);
  return temp;
};

export const bankStatus = (key: any) => {
  let temp = {
    status: 'PENDING',
    backgroundColor: colors.amber_fifty,
    textColor: AMBER,
    title: 'Bank account verification is pending',
    subtitle: 'Please wait for account verification',
  };
  if (key === 'Active') {
    temp = {
      status: 'VERIFIED',
      backgroundColor: colors.green_fifty,
      textColor: GREEN,
      title: 'Bank account verfified',
      subtitle: 'You can now make deposits and withdrawal.',
    };
  } else if (key === 'Rejected') {
    temp = {
      status: 'REJECTED',
      backgroundColor: colors.red_fifty,
      textColor: RED,
      title: 'Bank account verification is rejected',
      subtitle: 'Contact us for more information',
    };
  }
  return temp;
};

export const calculatePrice = (balance: any, price: any) => {
  let temp = Number(balance) * Number(price);
  return toFixedThree(temp);
};

export const calculateDifference = (high: any, low: any) => {
  let temp = Number(high) - Number(low);
  return toFixedThree(temp);
};

export function getDaysAgoData(data: any[], daysAgo: number) {
  // console.log('data::::::', data?.length);

  let filterData = data
    ?.sort((a: { time: string | number; }, b: { time: string | number; }) => calculateTime(b.time).localeCompare(calculateTime(a.time)))
    ?.slice(0, data.length >= daysAgo ? daysAgo : data.length);
  // console.log('filterData::::::', filterData?.length);

  let new_arr = filterData?.reverse();
  // console.log('new_arr::::::', new_arr?.length);

  let priceData = new_arr?.map((item: { close: any; }) => {
    return Number(item?.close);
  });
  return priceData ?? [];
}

export const calculateTime = (time: string | number) => {
  let temp = Number(time) * 1000;
  return moment(temp).format('YYYY-MM-DD');
};

export const checkValue = (value: string | object) => {
  if (typeof value === 'string') {
    return value;
  } else {
    const text = String(value);
    return text;
  }
};

export const checkValidAmount = (value: any) => {
  const expression = /^\d+(\.\d{1,4})?$/;

  return expression.test(value);
};


// export function formatToLakh(number: number) {
//   if (number || typeof (number) === "number") {
//       if (number >= 10000000) {
//           return `${(number / 10000000).toFixed(2)} Crore`;
//       } else if (number >= 100000) {
//           return `${(number / 100000).toFixed(2)} Lakh`;
//       } else if (number >= 1000) {
//           return `${(number / 1000).toFixed(2)} Thousand`;
//       }
//       return number.toString();
//   } else {
//       return 0.00
//   }
// }

export const formatDate = (date: any) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const multiply = (numOne: any, numTwo: any) => {
  let temp = Number(numOne) * Number(numTwo);
  return toFixedEight(temp);
};

export const percentCalculation = (balance: any, percentage: any) => {
  return (parseFloat(balance) * parseFloat(percentage)) / 100;
};

export function formatToLakh(number: any) {
  if (number || typeof (number) === "number") {
    if (number >= 10000000) {
      if (number.toString().endsWith("999999")) {
        if (number === 25999999) {
          number = 25000000;
        } else {
          number = Math.round(number / 10000000) * 10000000;
        }

        return `${(number / 10000000)} Crore`;
      } else if (number.toString().endsWith("999999")) {
        return `${25999999 / 10000000} Crore`;
      } else {
        return `${(number / 10000000)} Crore`;
      }
    } else if (number >= 100000) {
      return `${(Math.floor(number / 100000)).toFixed(0)} Lakhs`;
    } else if (number >= 1000) {
      return `${(number / 1000)} Thousand`;
    }
    return number.toString();
  } else {
    return 0.00
  }
}


export function shortenAddress(address: any, length = 15) {
  if (!address || address.length < 10) return address; // Ensure it's a valid address
  return `${address.slice(0, length + 2)}...${address.slice(-length)}`;
}

export function transformCurrencyDataWithDistribution(data: any[]) {
  const flatData = data.flat();

  const grouped = flatData.reduce((acc, item) => {
    const { currency, currency_fullname, duration_days, return_percentage, icon_path, _id, currency_id, min_amount } = item;

    if (!acc[currency]) {
      acc[currency] = {
        currency,
        currency_fullname,
        max_duration_days: duration_days,
        max_return_percentage: return_percentage,
        icon_path,
        distribution: [{ duration_days, return_percentage }],
        _id: _id,
        currency_id: currency_id,
        min_amount: min_amount,
      };
    } else {
      acc[currency].max_duration_days = Math.max(acc[currency].max_duration_days, duration_days);
      acc[currency].max_return_percentage = Math.max(acc[currency].max_return_percentage, return_percentage);
      acc[currency].distribution.push({ duration_days, return_percentage });
    }

    return acc;
  }, {});

  return Object.values(grouped);
}
