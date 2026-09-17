import * as socketIoClient from 'socket.io-client';

export interface HomeSliceProps {
  bannerList: BannerListProps[];
  hotCoins: CoinDataProps[];
  newListedCoins: CoinDataProps[];
  coinPairs: CoinDataProps[];
  hotPairsChart?: Record<string, number[]>;
  currency: string;
  coinBalance: Object;
  coinData: CoinDataProps[];
  spotSelectedPair?: CoinDataProps | null;
  futuresSelectedPair?: any | null;
  favorites: CoinDataProps[];
  notificationList: NotificationProps[];
  referCode?: number;
  referCount: number;
  spotOpenOrders: [];
  socketLoading: boolean;
  crossAccount?: any;
  crossBorrowable?: any;
  favoriteArray: string[];
  favoriteArrayLoaded: boolean;
  openOrders: any[] | null;
  pastOrders: any[];
  fiveDaySymbolData: HistoricDataProps[];
  oneMonthSymbolData: HistoricDataProps[];
  ThreeMonthSymbolData: HistoricDataProps[];
  oneYearSymbolData: HistoricDataProps[];
  fiveYearSymbolData: HistoricDataProps[];
  socket?: socketIoClient.Socket<any>;
  feeDetails?: any;
  buyOrders?: OrdersProps[];
  sellOrders?: OrdersProps[];
  orderData?: any;
  futureOrders: FutureOrdersState;
  futurePositions: any[];
  random?: any;
  twoFaQrData?: any;
  conversionHistory?: any[];
  conversion?: any;
  coinList?: any;
  futuresPairs?: any[];
  qbsHistory?: [];
  stakingHome?: any;
  lakedHistory?:any;
  stakingHistory?:[];
  p2p?:any;
  userEligibility: any;
  allProjectsList: any;
  checkCommitExistense: any;
  userCommitProject: any;
  pastAllProjects: any;
  userCommits: any;
  singleProject: any;
  userProjectTotalCommit: any;
  userProjectUpdateCommit: any;
  commitDetails: any;
  activityLogs: any;
  referralList: any;
  memeList: any;
  payoutHistory: any;
  treeRoot: any;
  flatInvestments: any;
  userTickets: [],
  ticketChats: [],
}

export interface FutureOrdersState {
  openOrders: any[];
  ordersHistory: any[];
  closePositions: any[];
  tradeHistory: any[];
}

export interface WalletSliceProps {
  walletBalance: number | string;
  walletBalanceMain: number | string;
  walletBalanceSpot: number | string;
  walletBalanceSwap: number | string;
  walletBalanceEarning: number | string;
  walletBalanceFutures: number | string;
  walletBalanceOptions: number | string;
  depositActiveCoins: any;
  withdrawActiveCoins: any;
  depositFiatCoins: any;
  packageList: [],
  userWallet: any[];
  userMainWallet: any;
  userSpotWallet: any;
  userSwapWallet: any;
  userEarningWallet: any;
  userArbitrageWallet: any;
  userOptionsWallet: any; 
  userFuturesWallet: any; 
  walletAddress: string;
  adminBankDetails?: AdminBankDetailsProps;
  walletHistory: WalletHistoryProps[] | null;
  tradeHistory: TradeHistoryProps[] | null;
  selectedWalletHistory?: WalletHistoryProps;
  selectedTradeHistory?: TradeHistoryProps;
  transactionHistory: WalletHistoryProps[];
  depositHistory: any,
  withdrawHistory: any
  coinDetails: any,
  walletTypes: any,
  particularCoinBalance: any,
  userPayoutList: any;
  earnWalletBal: any;
  subscribedActivePackages: any;
  subscribedCompletePackages: any;
  subscribedCancelPackages: any;
  botPackageList: any;
  botActiveList: any;
  botTradeData: any;
  totalProfit: any;
  walletBalanceArbitrage: any
  earningPortfolio: any;
  earningPortfolioSummary: any;
  adminTradeList: any[] | null;
  swapHistoryList: any[] | null;
  interalWalletHistory: any[] | null;
  swapCurrencyList: [],
  swapConversionRate: any;
}

export interface SendOtpRegistrationProps {
  email_or_phone: string;
  resend: boolean;
  type?: string | boolean;
}

export interface RegistrationProps {
  cid: number;
  email_or_phone: string;
  password: string;
  confirm_password: string;
  verification_code: string;
  referal: string;
}

export interface LoginProps {
  email_or_phone: string;
  password: string;
}
export interface ForgotPasswordProps {
  email_or_phone: string;
  new_password: string;
  verification_code: string;
}

export interface ChangePasswordProps {
  confirm_password: string;
  current_password?: string;
  email_or_phone: string;
  new_password: string;
  verification_code: string;
  verify_method?: number;
}

export interface CurrencyPreferenceProps {
  currency: string;
}

export interface CoinDataProps {
  __v: number;
  _id: string;
  available: string;
  base_currency: string;
  base_currency_id: string;
  buy_price: number;
  change: number;
  createdAt: string;
  high: number;
  icon_path: string;
  low: number;
  open: number;
  quote_currency: string;
  quote_currency_id: string;
  sell_price: number;
  status: string;
  type: string;
  updatedAt: string;
  volume: number;
}
export interface CoinCardProps {
  item: CoinDataProps;
  index: number;
  currency?:any;
}

export interface BannerListProps {
  __v: number;
  _id: string;
  bannerPath?: string;
  bannerType?: string;
  createdAt: string;
  sequrence?: string;
  status: string;
  updatedAt: string;
  banner_path?: string;
  banner_sequence?: string;
  banner_type?: string;
}
export interface qbsHistoryProps {
  __v: number;
  _id: string;
  from:string;
  // bannerPath?: string;
  // bannerType?: string;
  // createdAt: string;
  // sequrence?: string;
  // status: string;
  // updatedAt: string;
  // banner_path?: string;
  // banner_sequence?: string;
  // banner_type?: string;
}

export interface WalletProps {
  _id: string;
  balance: number;
  chain: string[];
  currency: string;
  currency_id: string;
  icon_path: string;
  locked_balance: number;
  short_name: string;
  user_id: string;
}
export interface AdminBankDetailsProps {
  _id: string;
  account_number: number;
  __v: number;
  bank_name: string;
  branch: string;
  createdAt: string;
  holder_name: string;
  ifsc: string;
  updatedAt: string;
  id: string;
}
export interface WalletHistoryProps {
  _id: string;
  user_id: string;
  currency: string;
  currency_id: string;
  chain: string;
  short_name: string;
  deposit_slip: string;
  transaction_number: number;
  description: string;
  amount: number;
  transaction_type: string;
  fee: number;
  status: string;
  from_address: string;
  to_address: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}
export interface TradeHistoryProps {
  _id: string;
  user_id: string;
  order_id: string;
  currency: string;
  currency_id: string;
  quantity: number;
  price: number;
  amount: number;
  side: string;
  transaction_type: string;
  order_type: string;
  fee_type: string;
  fee: number;
  tds: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface GenerateAddressProps {
  currency_id: string;
  chain: string;
}

export interface WithdrawCurrencyProps {
  otp: string;
  address: string;
  amount: string;
  email_or_phone: string;
  chain: string;
}

export interface WithdrawInrProps {
  amount: string;
}

export interface AlertsProps {
  type: boolean;
}

export interface RatingProps {
  rating: number;
  message?: string;
}

export interface NotificationProps {
  __v: number;
  _id: string;
  createdAt: string;
  message: string;
  subject: string;
  updatedAt: string;
}

export interface AddToFavoriteProps {
  pair_id: string;
}

export interface OpenOrdersProps {
  base_currency: string;
  quote_currency: string;
}

export interface PastOrdersProps {
  base_currency_id: string;
  quote_currency_id: string;
}

export interface CancelOrderProps {
  order_id: string;
}

/** Body for `POST spot/v1/orders` — same shape as web `buildSpotOrderPayload`. */
export interface PlaceOrderProps {
  /** e.g. BTCUSDT (uppercase base + quote). Omit if `pair_id` is sent. */
  pair?: string;
  pair_id?: string;
  /** LIMIT | MARKET | STOP_LIMIT | STOP_MARKET */
  type: string;
  side: string;
  quantity: string;
  /** Required for LIMIT / STOP_LIMIT only */
  price?: string | number;
  /** STOP_LIMIT / STOP_MARKET */
  stop_price?: string | number;
  /** FOK | IOC when not GTC (LIMIT / STOP_LIMIT) */
  time_in_force?: string;
  max_slippage_percent?: number;
  /** UI-only; not required by spot API */
  total?: string | number;
}

export interface HistoricDataProps {
  _id: string;
  base_currency_id: string;
  quote_currency_id: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  time: number;
}

export interface GetFeeDetailProps {
  currency_id: string;
}

export interface DeleteAccountProps {
  status: string;
}

export interface DownloadTradeReportProps {
  range: string;
}
export interface OrdersProps {
  _id: string;
  user_id: string;
  order_type: string;
  base_currency_id: string;
  quote_currency_id: string;
  ask_currency: string;
  side: string;
  price: number;
  quantity: number;
  filled: number;
  remaining: number;
  maker_fee: number;
  taker_fee: number;
  status: string;
  transaction_fee: number;
  tds: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}
