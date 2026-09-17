/** Google Cloud OAuth web client (type 3). Used by native Google Sign-In. */
export const GOOGLE_WEB_CLIENT_ID =
  '79105712683-trmuln9ls862v3amdlpn4uu2tam5n07d.apps.googleusercontent.com';
/** iOS OAuth client from GoogleService-Info.plist CLIENT_ID. */
export const GOOGLE_IOS_CLIENT_ID =
  '79105712683-ar8pvcfqv1nprrdpbi0o6gefjn637fd0.apps.googleusercontent.com';

/** iOS native Sign in with Apple — JWT `aud` is always the App Bundle ID. */
export const APPLE_IOS_CLIENT_ID = 'com.coincode.exchange';
/** Web Sign in with Apple Services ID (not used as iOS token audience). */
export const APPLE_WEB_CLIENT_ID = 'com.coincode.exchange.app';

export const USER_TOKEN_KEY = 'USER_TOKEN_KEY';
export const USER_REFRESH_TOKEN_KEY = 'USER_REFRESH_TOKEN_KEY';
export const FCM_TOKEN_KEY = 'FCM_TOKEN_KEY';
export const APP_THEME = 'APP_THEME';
export const SELECTED_LANGUAGE = 'SELECTED_LANGUAGE';
/**
 * Primary API host — same role as web `appUrl` in `apiConfig.js`
 * (`https://agcebackend.wrathcode.com`). Used by AppOperation for `v1/...` calls.
 */

export const BASE_URL = 'https://backend.arabglobal.ae/';
// export const BASE_URL = 'https://jw1ptnmg-9503.inc1.devtunnels.ms/';




// export const BASE_URL = 'https://agcebackend.wrathcode.com/';
// export const BASE_URL = 'https://backend.arabglobal.io/';


/**
 * Spot chart WebView (ejected web), e.g. `.../chart/light/BTC_USDT`.
 * Not the API host — keep separate from `BASE_URL`.
 */
export const CHART_WEB_BASE_URL = 'https://arabglobal.ae/'; // or 'https://arabglobal.ae/' if .io doesn't work
/**
 * Static / uploaded assets (coin icons, profile images, banners) — same as web
 * Build URLs as `${IMAGE_BASE_URL}${icon_path}` (path from API, e.g. `icons/...`).
 */

// export const IMAGE_BASE_URL = 'http://192.168.29.246:9503/';

// export const IMAGE_BASE_URL = 'https://backend.arabglobal.io/';
export const IMAGE_BASE_URL = 'https://agcx-data-storage-s3-uae.s3.me-central-1.amazonaws.com/';

// export const BASE_URL = 'http://3.110.173.10:3008/';

// For passkey testing with backend on localhost:5001 use one of:
// 'http://localhost:5001/' (same machine) | 'http://10.0.2.2:5001/' (Android emulator) | 'http://<your-ip>:5001/' (device)

/** Passkey RP ID. Must match the domain that serves /.well-known/assetlinks.json (required on Android). */
// export const PASSKEY_RP_ID = 'agce.wrathcode.com';
export const PASSKEY_RP_ID = 'arabglobal.ae';


export const placeHolderText = {
  userName: 'Phone Number',
  email: 'Enter Email',
  password: 'Enter Your Password',
  newPassword: 'Enter New Password',
  confirmNewPassword: 'Re-enter New Password',
  otp: 'Enter Verification Code',
  signUpPassword: 'Enter Password',
  signUPConfirmPassword: 'Re-enter Password',
  referCode: 'Invitation Code (Optional)',
  firstName: 'Enter First Name ',
  lastName: 'Enter Last Name ',
  code: 'Enter Code',
  search: 'Search for markets',
  wallet: 'Wallet Address',
  amount: 'Amount',
  amountInr: 'Enter Amount',
  transaction: 'Enter Transaction Number',
  kycType: 'Select KYC Type',
  country: 'Select Country',
  middleName: 'Enter Middle Name',
  common: 'XYZ',
  dob: 'DD-MM-YYYY',
  docType: 'Select Type',
  dateRange: 'Please Select a Date Range',
  message: 'Message (Optional)',
  accountType: 'Select Account Type',
  bank: 'Enter Bank Name',
  holder: 'Enter Name',
  number: 'Enter Account Number',
  ifsc: 'Enter IFSC Code/SWIFT Code',
  branch: 'Enter Branch Name',
  kgin: 'Enter Number',
  empty: '',
  _userName: 'Email or Phone Number',
};
export const errorText = {
  userName: 'Please Provide Valid Phone Number',
  password: 'Please Provide Valid Password',
  otp: 'Please Provide Valid Verification Code',
  passwordMismatch: 'Password Not Match',
  passwordRegex:
    'New password Must have at least 8 characters and one Uppercase one lowercase and a special character and number',
  oldPasswordRegex:
    'Password Must have at least 8 characters and one Uppercase one lowercase and a special character and number',
  firstName: 'Please Enter Valid First Name',
  lastName: 'Please Enter Valid Last Name',
  cameraPermission: 'permission to use camera is not granted',
  galleryPermission: 'permission to use gallery is not granted',
  currency: 'Already Selected',
  wallet: 'Please Provide Valid Wallet Address',
  amount: 'Amount is not correct',
  transaction: 'Please Provide Valid Transaction Number',
  proof: 'Please Provide Valid Proof of Deposit',
  country: 'Please Provide Valid Country Name',
  kycType: 'Please Provide Valid Kyc Type',
  dob: 'Please Provide Valid Date of Birth',
  address: 'Please Provide Valid Address',
  state: 'Please Provide Valid State Name',
  city: 'Please Provide Valid City Name',
  pin: 'Please Provide Valid Pin Code',
  pan: 'Please Provide Valid PAN Number',
  confirmPan: 'Please Provide Valid Confirm PAN Number',
  panImage: 'Please Provide Valid PAN Image',
  docType: 'Please Select Valid Doucument Type',
  aadhar: 'Please Provide Valid Aadhar Number',
  license: 'Please Provide Valid Driving License',
  docNumber: 'Please Provide Valid Document Number',
  docFront: "Please Upload Valid Image of Document's Front Side",
  docBack: "Please Upload Valid Image of Document's Back Side",
  selfie: 'Please Upload Valid Selfie',
  tradeReport: 'Please select a duration first',
  accountType: ' Please Provide Valid Fiat Type',
  bank: ' Please Provide Valid Bank Name',
  holder: ' Please Provide Valid Account Holder Name',
  number: ' Please Provide Valid Account Number',
  ifsc: ' Please Provide Valid IFSC Code',
  branch: ' Please Provide Valid Branch Name',
  passbook: 'Please Provide Valid Image of Bank Proof',
  kgin: 'Please Provide Valid KGIN Number',
  temp: 'Deposit not available for this currency',
  email: 'Please Provide Valid Email',
  _userName: 'Please Provide Valid Email or Phone Number',
  terms: 'Please agree to out terms of use',
};

export const titleText = {
  firstName: 'First Name*',
  lastName: 'Last Name*',
  phone: 'Phone Number',
  code: 'Email Verification Code',
  password: 'Current Password',
  newPassword: 'New Password',
  confirmPassword: 'Confirm New Password',
  wallet: 'Address',
  amount: 'Amount',
  country: 'Country',
  kycType: 'Type of KYC',
  middleName: 'Middle Name',
  address: 'Address*',
  state: 'State*',
  city: 'City*',
  pin: 'Pin Code*',
  dob: 'Date of Birth*',
  gender: 'Gender*',
  pan: 'PAN Number*',
  confirmPan: 'Re-Enter PAN Number',
  docType: 'Select Document Type*',
  accountType: 'Account Type',
  bank: 'Bank Name',
  holder: 'Account Holder Name',
  number: 'Account Number',
  ifsc: 'IFSC Code/SWIFT Code',
  branch: 'Branch Name',
  kgin: 'K Global Identification Number',
  price: 'Price',
  total: 'Total',
};
