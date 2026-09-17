import { AppOperation } from './../../index';
import { CUSTOMER_TYPE } from '../../types';
import {
  AddToFavoriteProps,
  AlertsProps,
  CancelOrderProps,
  ChangePasswordProps,
  CurrencyPreferenceProps,
  DeleteAccountProps,
  DownloadTradeReportProps,
  GenerateAddressProps,
  GetFeeDetailProps,
  OpenOrdersProps,
  PastOrdersProps,
  PlaceOrderProps,
  RatingProps,
  WithdrawCurrencyProps,
  WithdrawInrProps,
} from '../../../helper/types';
import { getMobilePasskeyUserAgent } from '../../../helper/passkeyDeviceInfo';
import { Platform } from 'react-native';

export default (appOperation: AppOperation) => ({
  qbs_historyy: () =>
    appOperation.get('qbs/history', undefined, undefined, CUSTOMER_TYPE),
  user_eligibility: () =>
    appOperation.get('user/launchpad/user_eligibility', undefined, undefined, CUSTOMER_TYPE),
  get_user_commits: () =>
    appOperation.get('admin/launchpad/get_user_commits', undefined, undefined, CUSTOMER_TYPE),
  all_project: (data: any) =>
    appOperation.post('user/launchpad/get_all_project', data, CUSTOMER_TYPE),
  get_past_all_projects: (data: any) =>
    appOperation.post('user/launchpad/get_all_project', data, CUSTOMER_TYPE),
  check_commit_existense: (data: any) =>
    appOperation.get(`user/launchpad/check_commit_existence/${data}`, undefined, undefined, CUSTOMER_TYPE),
  get_single_project: (data: any) =>
    appOperation.get(`admin/launchpad/get_single_project/${data}`, undefined, undefined, CUSTOMER_TYPE),
  /** Same as web /account-verification: GET verify-registration-token (uses stored token in header) */
  verify_token: () =>
    appOperation.get('user/verify-registration-token', undefined, undefined, CUSTOMER_TYPE),
  project_total_commit: (data: any) =>
    appOperation.get(`user/launchpad/user_project_total_commits/${data}`, undefined, undefined, CUSTOMER_TYPE),
  banner_list: () =>
    appOperation.get('admin/banner_list', undefined, undefined, CUSTOMER_TYPE),

  // --- Options Endpoints ---
  optionsWallet: () =>
    appOperation.get('options/wallet', undefined, undefined, CUSTOMER_TYPE),
  optionsPnlAnalysis: (params: any) =>
    appOperation.get('options/pnl/analysis', params, undefined, CUSTOMER_TYPE),
  optionsOpenPositions: () =>
    appOperation.get('options/positions', undefined, undefined, CUSTOMER_TYPE),
  optionsPositionHistory: (params: any) =>
    appOperation.get('options/positions/history', params, undefined, CUSTOMER_TYPE),
  optionsOpenOrders: (params: any) =>
    appOperation.get('options/open-orders', params, undefined, CUSTOMER_TYPE),
  optionsOrderHistory: (params: any) =>
    appOperation.get('options/orders/history', params, undefined, CUSTOMER_TYPE),
  optionsTradeHistory: (params: any) =>
    appOperation.get('options/trades', params, undefined, CUSTOMER_TYPE),
  optionsTransactionHistory: (params: any) =>
    appOperation.get('options/transaction/history', params, undefined, CUSTOMER_TYPE),
  // -------------------------

  // --- Spot PnL Endpoints ---
  spot_me_pnl: (params?: any) =>
    appOperation.get('spot/v1/me/pnl', params, undefined, CUSTOMER_TYPE),
  spotPnlAnalysis: (params?: any) =>
    appOperation.get('spot/v1/me/pnl/analysis', params, undefined, CUSTOMER_TYPE),
  spotPnlAnalysisDetails: (params?: any) =>
    appOperation.get('spot/v1/me/pnl/analysis/details', params, undefined, CUSTOMER_TYPE),
  // --------------------------

  get_profile: () =>
    appOperation.get(`user/profile`, undefined, undefined, CUSTOMER_TYPE),
  get_alert_settings_setting: () =>
    appOperation.get('setting/get-alert-settings', undefined, undefined, CUSTOMER_TYPE),
  update_alert_settings_setting: (data: any) =>
    appOperation.post('setting/update-alert-settings', data, CUSTOMER_TYPE),
  get_nickname_setting: () =>
    appOperation.get('setting/get-nickname', undefined, undefined, CUSTOMER_TYPE),
  edit_nickname_setting: (data: any) =>
    appOperation.post('setting/edit-nickname', data, CUSTOMER_TYPE),
  get_avatar_setting: () =>
    appOperation.get('setting/get-avatar', undefined, undefined, CUSTOMER_TYPE),
  change_avatar_setting: (data: any) =>
    appOperation.post('setting/change-avatar', data, CUSTOMER_TYPE, {
      headers: { "Content-Type": "multipart/form-data" }
    }),
  edit_email: (data: any) =>
    appOperation.put('user/edit-email', data, CUSTOMER_TYPE),
  edit_phone: (data: any) =>
    appOperation.put('user/edit-phone', data, CUSTOMER_TYPE),
  edit_name: (data: any) =>
    appOperation.put('user/edit-name', data, CUSTOMER_TYPE),
  edit_nominee: (data: any) =>
    appOperation.put('user/edit-nominee', data, CUSTOMER_TYPE),
  edit_avatar: (data: FormData) =>
    appOperation.put('user/edit-avatar', data, CUSTOMER_TYPE),
  edit_profile: (data: FormData) =>
    appOperation.put('user/edit_profile', data, CUSTOMER_TYPE),
  change_password: (data: ChangePasswordProps) =>
    appOperation.post('user/change_password', data, CUSTOMER_TYPE),
  change_currency: (data: CurrencyPreferenceProps) =>
    appOperation.put('user/currency-preference', data, CUSTOMER_TYPE),
  security_change_password: (data: any) =>
    appOperation.post('security/change-password', data, CUSTOMER_TYPE),
  security_add_fund_password: (data: any) =>
    appOperation.post('security/add-fund-password', data, CUSTOMER_TYPE),
  user_portfolio: (id: any) =>
    appOperation.get(
      `wallet/estimated-portfolio?walletType=${id}`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  /** Same as web DepositPage primary list: `GET /v1/wallet/deposit-coins` (Bearer). */
  deposit_coins: () =>
    appOperation.get('wallet/deposit-coins', undefined, undefined, CUSTOMER_TYPE),
  /** Same as web WithdrawPage catalog: `GET /v1/wallet/withdrawal-coins` (Bearer). */
  withdrawal_coins: () =>
    appOperation.get('wallet/withdrawal-coins', undefined, undefined, CUSTOMER_TYPE),
  /** Web primary catalog: `GET /api/v1/wallet/withdrawal-coins` (`fetchWithdrawalCoinsV1`). */
  withdrawal_coins_v1: () =>
    appOperation.get('api/v1/wallet/withdrawal-coins', undefined, undefined, CUSTOMER_TYPE),
  deposit_active_coins: () =>
    appOperation.get('user/deposit-active-coins', undefined, undefined, CUSTOMER_TYPE),
  widthraw_active_coins: () =>
    appOperation.get('user/withdraw-active-coins', undefined, undefined, CUSTOMER_TYPE),
  deposit_fiat_coins: () =>
    appOperation.get('user/deposit-active-coins-fiat', undefined, undefined, CUSTOMER_TYPE),
  user_wallet: () =>
    appOperation.get('wallet/user-wallet', undefined, undefined, CUSTOMER_TYPE),
  /** Total estimated portfolio across wallets (no `walletType` query) — same as web `allWalletsPortfolio`. */
  all_wallets_portfolio: () =>
    appOperation.get('wallet/all-wallets-portfolio', undefined, undefined, CUSTOMER_TYPE),
  user_main_wallet: (id: any) =>
    appOperation.get(`wallet/user-wallet?wallet_type=${id}`, undefined, undefined, CUSTOMER_TYPE),
  /** Web: POST /v1/security/withdrawal-otp — body `{ method: 'email' | 'mobile' }` (`sendWithdrawalVerificationOtp`). */
  withdrawal_verification_otp: (data: { method: string }) =>
    appOperation.post('security/withdrawal-otp', data, CUSTOMER_TYPE),
  /** Web fallback: POST /v1/user/send-otp with `type: 'withdrawal'` (`sendWithdrawOtp` in withdrawService). */
  user_send_otp_withdrawal: (data: { email_or_phone: string; resend: boolean }) =>
    appOperation.post(
      'user/send-otp',
      {
        email_or_phone: String(data.email_or_phone || '').trim(),
        type: 'withdrawal',
        resend: !!data.resend,
      },
      CUSTOMER_TYPE,
    ),
  generate_address: (data: GenerateAddressProps) =>
    appOperation.put('wallet/generate-address', data, CUSTOMER_TYPE),
  /** Web parity: POST /v1/wallet/get-and-generate-address (Fireblocks tokenAssetId / assetId flow). */
  get_and_generate_address: (data: { assetId: string; tokenAssetId?: string; short_name: string; generate: boolean }) =>
    appOperation.post('wallet/get-and-generate-address', data, CUSTOMER_TYPE),
  address_book_whitelist_check: (id: string) =>
    appOperation.get(`wallet/address-book-whitelist-check/${id}`, {}, CUSTOMER_TYPE),
  /** Web parity: POST /api/v1/wallet/validate-address — body { address, chain, tokenAssetId? }. Uses `api/` prefix like web `baseWalletV1Api`. */
  validate_withdraw_address: (data: { address: string; chain: string; tokenAssetId?: string }) =>
    appOperation.post('api/v1/wallet/validate-address', data, CUSTOMER_TYPE),
  /** Web `GET /api/v1/wallet/withdrawal-24h-usage?coinName=` */
  withdrawal_24h_usage: (coinName: string) =>
    appOperation.get(
      'api/v1/wallet/withdrawal-24h-usage',
      { coinName: String(coinName || '').trim() },
      undefined,
      CUSTOMER_TYPE,
    ),
  withdraw_currency: (data: any) =>
    appOperation.post('wallet/withdrawal-request', data, CUSTOMER_TYPE),
  /** Web `POST /api/v1/wallet/withdrawal` (`submitWithdrawal` in withdrawService.js). */
  withdraw_currency_v1: (data: any) =>
    appOperation.post('api/v1/wallet/withdrawal-request', data, CUSTOMER_TYPE),
  withdraw_fiat_currency: (data: any) =>
    appOperation.post('wallet/withdrawal_fiat', data, CUSTOMER_TYPE),
  // --- Address Book ---
  get_wallet_address_book: (query?: any) =>
    appOperation.get('api/v1/wallet/address-book', query, undefined, CUSTOMER_TYPE),
  add_wallet_address_book: (data: any) =>
    appOperation.post('api/v1/wallet/address-book', data, CUSTOMER_TYPE),
  delete_wallet_address_book: (id: string) =>
    appOperation.delete(`api/v1/wallet/address-book/${encodeURIComponent(String(id))}`, null, CUSTOMER_TYPE),
  initiate_address_book_whitelist: (data: any) =>
    appOperation.post('api/v1/wallet/address-book/initiate', data, CUSTOMER_TYPE),
  fetch_address_book_verification_options: () =>
    appOperation.get('api/v1/wallet/address-book/verification-options', undefined, undefined, CUSTOMER_TYPE),
  send_address_book_verification_otp: (data: any) =>
    appOperation.post('api/v1/wallet/address-book/send-otp', data, CUSTOMER_TYPE),
  fetch_address_book_passkey_challenge: () =>
    appOperation.post('api/v1/wallet/address-book/passkey-challenge', {}, CUSTOMER_TYPE),
  fetch_withdrawal_passkey_challenge: () =>
    appOperation.get('api/v1/wallet/passkey-withdrawal-challenge', undefined, undefined, CUSTOMER_TYPE),
  confirm_satoshi_address_book: (id: string) =>
    appOperation.post(`api/v1/wallet/address-book/${encodeURIComponent(String(id))}/confirm-satoshi`, {}, CUSTOMER_TYPE),
  verify_signature_address_book: (id: string, signature: string) =>
    appOperation.post(`api/v1/wallet/address-book/${encodeURIComponent(String(id))}/verify-signature`, { signature }, CUSTOMER_TYPE),
  // --------------------
  particular_coin_balance: (data: { fromWallet: any; toWallet: any; currencyId: any; }) =>
    appOperation.get(`wallet/get-perticular-wallet-balance?fromWallet=${data?.fromWallet}&toWallet=${data?.toWallet}&currencyId=${data?.currencyId}`, undefined, undefined, CUSTOMER_TYPE),
  admin_bank_details: () =>
    appOperation.get(
      'admin/admin_bank_details',
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  deposit_verify: (data: any) =>
    appOperation.post('wallet/verify-deposit', data, CUSTOMER_TYPE),
  deposit_inr: (data: FormData) =>
    appOperation.post('wallet/deposit_inr', data, CUSTOMER_TYPE),
  tranfer_coin: (data: any) =>
    appOperation.post('wallet/wallet-transfer', data, CUSTOMER_TYPE),
  get_transfer_balance: (data: any) => {
    let query = `from_wallet=${data.from_wallet}&to_wallet=${data.to_wallet}&currency_id=${data.currency_id}`;
    if (data.pair_id) query += `&pair_id=${data.pair_id}`;
    if (data.asset_type) query += `&asset_type=${data.asset_type}`;
    return appOperation.get(`wallet/transfer-balance?${query}`, undefined, undefined, CUSTOMER_TYPE);
  },
  wallet_transfer_unified: (data: any) =>
    appOperation.post('wallet/transfer', data, CUSTOMER_TYPE),
  margin_wallet_transfer: (data: any) =>
    appOperation.post('margin/wallet-transfer', data, CUSTOMER_TYPE),
  margin_max_transfer: (data: any) =>
    appOperation.get(`margin/max-transfer?pairId=${data.pairId}&assetType=${data.assetType}&direction=${data.direction}&walletType=${data.walletType}`, undefined, undefined, CUSTOMER_TYPE),
  margin_accounts: () =>
    appOperation.get('margin/accounts', undefined, undefined, CUSTOMER_TYPE),
  margin_pairs: () =>
    appOperation.get('margin/pairs', undefined, undefined, CUSTOMER_TYPE),
  marginBorrowHistory: (opts?: { pairId?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const p = new URLSearchParams({ page: String(opts?.page ?? 1), limit: String(opts?.limit ?? 100) });
    if (opts?.pairId) p.append("pairId", opts.pairId);
    if (opts?.from) p.append("from", opts.from);
    if (opts?.to) p.append("to", opts.to);
    return appOperation.get(`margin/history/borrow?${p.toString()}`, undefined, undefined, CUSTOMER_TYPE);
  },
  marginRepayHistory: (opts?: { pairId?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const p = new URLSearchParams({ page: String(opts?.page ?? 1), limit: String(opts?.limit ?? 100) });
    if (opts?.pairId) p.append("pairId", opts.pairId);
    if (opts?.from) p.append("from", opts.from);
    if (opts?.to) p.append("to", opts.to);
    return appOperation.get(`margin/history/repay?${p.toString()}`, undefined, undefined, CUSTOMER_TYPE);
  },
  marginInterestHistory: (opts?: { pairId?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const p = new URLSearchParams({ page: String(opts?.page ?? 1), limit: String(opts?.limit ?? 100) });
    if (opts?.pairId) p.append("pairId", opts.pairId);
    if (opts?.from) p.append("from", opts.from);
    if (opts?.to) p.append("to", opts.to);
    return appOperation.get(`margin/history/interest?${p.toString()}`, undefined, undefined, CUSTOMER_TYPE);
  },
  cross_transfer: (data: any) =>
    appOperation.post('cross/transfer', data, CUSTOMER_TYPE),
  user_commit_project: (data: FormData) =>
    appOperation.post('user/launchpad/commit_project', data, CUSTOMER_TYPE),
  transfer_funds: (data: any) =>
    appOperation.post('wallet/transfer-funds', data, CUSTOMER_TYPE),
  user_update_commit_project: (data: FormData, id: any) =>
    appOperation.put(`user/launchpad/update_commit/${id}`, data, CUSTOMER_TYPE),
  wallet_history: (skip: any, limit: any) =>
    appOperation.get(
      `transaction/wallet-history?skip=${skip}&limit=${limit}`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  interal_wallet_history: (skip: any, limit: any) =>
    appOperation.get(
      `wallet/wallet-transfer-history?skip=${skip}&limit=${limit}`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  trade_history: (data: any) =>
    appOperation.post(
      'transaction/trade-history',
      data, CUSTOMER_TYPE
    ),
  verify_deposit: (data: any) =>
    appOperation.post(
      'transaction/wallet-deposit-history',
      data,
      CUSTOMER_TYPE
    ),
  verify_withdraw: (data: any) =>
    appOperation.post(
      'transaction/wallet-withdrawal-history',
      data,
      CUSTOMER_TYPE
    ),
  withdrawal_address_history: () =>
    appOperation.get('api/v1/wallet/withdrawal-address-history', undefined, undefined, CUSTOMER_TYPE),
  withdraw_inr: (data: WithdrawInrProps) =>
    appOperation.post('wallet/withdraw_inr', data, CUSTOMER_TYPE),
  kyc_verification: (data: any) =>
    appOperation.post('user/submit-kyc', data, CUSTOMER_TYPE),
  create_kyc_session: (data: any) =>
    appOperation.post('api/v1/kyc/session', data, CUSTOMER_TYPE),
  create_kyb_session: (data: any) =>
    appOperation.post('api/v1/kyb/session', data, CUSTOMER_TYPE),
  /** Didit / web parity: `GET /api/v1/kyc/status` (SessionPayload). Legacy: `GET v1/user/kyc-status`. */
  get_kyc_status: () =>
    appOperation.get('api/v1/kyc/status', undefined, undefined, CUSTOMER_TYPE),
  get_kyb_status: () =>
    appOperation.get('api/v1/kyb/status', undefined, undefined, CUSTOMER_TYPE),
  get_kyc_status_legacy: () =>
    appOperation.get('user/kyc-status', undefined, undefined, CUSTOMER_TYPE),
  /** Same as web: GET api/meta/countries - list of { code, name, flag } (no v1 prefix) */
  get_countries: () =>
    appOperation.get('api/meta/countries', undefined, undefined, CUSTOMER_TYPE),
  /** Same as web: GET api/kyc/config/:countryCode - returns id_documents, tax_documents (no v1 prefix) */
  get_kyc_config: (countryCode: string) =>
    appOperation.get(`api/kyc/config/${countryCode}`, undefined, undefined, CUSTOMER_TYPE),
  /** Same as web: POST user/send-otp for KYC verification - body { email_or_phone, type: 1|3, resend: true } */
  send_kyc_otp: (emailOrPhone: string, type: number) =>
    appOperation.post('user/send-otp', { email_or_phone: emailOrPhone.trim(), type, resend: true }, CUSTOMER_TYPE),
  price_alert: (data: AlertsProps) =>
    appOperation.put('notification/price-alert', data, CUSTOMER_TYPE),
  commission_alert: (data: AlertsProps) =>
    appOperation.put('notification/commission-alert', data, CUSTOMER_TYPE),
  trade_setting: (data: AlertsProps) =>
    appOperation.put(
      'exchange/skip-buy-sell-confirmation',
      data,
      CUSTOMER_TYPE,
    ),
  fee_setting: (data: AlertsProps) =>
    appOperation.put('exchange/fee-setting', data, CUSTOMER_TYPE),
  favorite_list: () =>
    appOperation.get(
      'user/favorite-list?type=mobile',
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  meme_list: () =>
    appOperation.get(
      'user/get-meme-pairs',
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  user_bank_detail: () =>
    appOperation.get(
      'user/get-user-bank-details',
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  add_new_bank: (data: FormData) =>
    appOperation.post('user/add-bank-details', data, CUSTOMER_TYPE),
  buy_bot_package: (data: any) =>
    appOperation.post('bot/buy-arbitrage-bot', data, CUSTOMER_TYPE),
  edit_bank: (data: FormData) =>
    appOperation.post('user/update-bank', data, CUSTOMER_TYPE),
  delete_bank: (data: any) =>
    appOperation.post('user/delete-user-bank', data, CUSTOMER_TYPE),
  submit_ticket: (data: FormData) =>
    appOperation.post('support/submit-ticket', data, CUSTOMER_TYPE),
  ticket_messages: (data: any) =>
    appOperation.post('support/user-reply-ticket', data, CUSTOMER_TYPE),
  add_rating: (data: RatingProps) =>
    appOperation.post('user/rating', data, CUSTOMER_TYPE),
  notification_list: (opts?: { page?: number; limit?: number }) => {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts?.limit ?? 50));
    return appOperation.get(
      'notifications/user-notifications',
      { page, limit },
      undefined,
      CUSTOMER_TYPE,
    );
  },
  get_notification_settings_setting: () =>
    appOperation.get('setting/get-notification-settings', undefined, undefined, CUSTOMER_TYPE),
  update_notification_settings_setting: (data: any) =>
    appOperation.post('setting/update-notification-settings', data, CUSTOMER_TYPE),
  mark_as_read: (data: any) =>
    appOperation.post('notifications/mark-as-read', data, CUSTOMER_TYPE),
  /** GET `/v1/notifications/mark-all-as-read` — same as web `AuthService.markasAllRead`. */
  mark_all_notifications_read: () =>
    appOperation.get(
      'notifications/mark-all-as-read',
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  send_kgin_otp: (data: any) =>
    appOperation.post('user/send-kgin-otp', data, CUSTOMER_TYPE),
  update_kgin: (data: any) =>
    appOperation.post('user/verify-kgin-otp', data, CUSTOMER_TYPE),
  package_list: () =>
    appOperation.get(
      `earning/package-list`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  bot_package_list: () =>
    appOperation.get(
      `bot/bot-package-listing`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  user_payout_list: () =>
    appOperation.get(
      `earning/user-payout-list`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  earning_portfolio: () =>
    appOperation.get(
      `earning/earning-portfolio`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  earning_portfolio_summary: () =>
    appOperation.get(
      `earning/earning-portfolio-summary`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  subscribed_packageList: () =>
    appOperation.get(
      `earning/subscribed-package-list`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  get_wallet_balance: (fromWallet: any, currencyId: any) =>
    appOperation.get(
      `wallet/get-wallet-balance/?fromWallet=${fromWallet}&currencyId=${currencyId}`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  get_wallet_type: () =>
    appOperation.get(
      `wallet/available-wallet-types`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  get_bot_active_packages: () =>
    appOperation.get(
      `bot/get-active-package`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  get_bot_trade: () =>
    appOperation.get(
      `bot/bot-trades`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  user_refer_code: () =>
    appOperation.get(
      'user/user_refer_code',
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  payout_history: () =>
    appOperation.get(
      'affiliate/payout-history',
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  get_downline: (sponsorId: any, level: any) =>
    appOperation.get(
      `user/get_downline?sponsorId=${sponsorId}&level=${level}`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  user_refer_count: () =>
    appOperation.get(
      'user/total_refer_count',
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  favorite_array: () =>
    appOperation.get('user/favorite-list', undefined, undefined, CUSTOMER_TYPE),
  add_to_favorite: (data: AddToFavoriteProps) =>
    appOperation.post('user/favorite-coin', data, CUSTOMER_TYPE),

  // ============================================================================
  // Cross Margin APIs
  // ============================================================================
  crossAccount: () =>
    appOperation.get('cross/account', undefined, undefined, CUSTOMER_TYPE),
  crossTransfer: (data: any) =>
    appOperation.post('cross/transfer', data, CUSTOMER_TYPE),
  crossTransferHistory: (opts?: { page?: number; limit?: number; direction?: string; currency_id?: string }) => {
    const p = new URLSearchParams({ page: String(opts?.page ?? 1), limit: String(opts?.limit ?? 20) });
    if (opts?.direction) p.append("direction", opts.direction);
    if (opts?.currency_id) p.append("currency_id", opts.currency_id);
    return appOperation.get(`cross/transfer-history?${p.toString()}`, undefined, undefined, CUSTOMER_TYPE);
  },
  crossBorrow: (data: { currency_id: string; amount: string | number }) =>
    appOperation.post('cross/borrow', { currency_id: data.currency_id, amount: String(data.amount) }, CUSTOMER_TYPE),
  crossRepay: (data: { currency_id: string; amount?: string | number }) => {
    const body: any = { currency_id: data.currency_id };
    if (data.amount != null) body.amount = String(data.amount);
    return appOperation.post('cross/repay', body, CUSTOMER_TYPE);
  },
  crossDebts: () =>
    appOperation.get('cross/debts', undefined, undefined, CUSTOMER_TYPE),
  crossBorrowable: (currency_id: string) =>
    appOperation.get(`cross/borrowable?currency_id=${currency_id}`, undefined, undefined, CUSTOMER_TYPE),
  crossPositions: () =>
    appOperation.get('cross/positions', undefined, undefined, CUSTOMER_TYPE),
  crossRisk: () =>
    appOperation.get('cross/risk', undefined, undefined, CUSTOMER_TYPE),
  crossPnl: (period: string = "all") =>
    appOperation.get(`cross/pnl?period=${period}`, undefined, undefined, CUSTOMER_TYPE),
  crossPlaceOrder: (payload: any) =>
    appOperation.post('cross/order', payload, CUSTOMER_TYPE),
  crossClosePosition: (data: { pair?: string; pair_id?: string; quantity?: string | number }) => {
    const body: any = {};
    if (data.pair) body.pair = data.pair;
    if (data.pair_id) body.pair_id = data.pair_id;
    if (data.quantity != null) body.quantity = String(data.quantity);
    return appOperation.post('cross/position/close', body, CUSTOMER_TYPE);
  },
  crossCancelOrder: (orderId: string) =>
    appOperation.delete(`cross/order/${orderId}`, null, CUSTOMER_TYPE),
  crossOpenOrders: (opts?: { pair?: string; page?: number; limit?: number }) => {
    const p = new URLSearchParams({ page: String(opts?.page ?? 1), limit: String(opts?.limit ?? 100) });
    if (opts?.pair) p.append("pair", opts.pair);
    return appOperation.get(`cross/orders/open?${p.toString()}`, undefined, undefined, CUSTOMER_TYPE);
  },
  crossOrderHistory: (opts?: { pair?: string; status?: string; start_date?: string; end_date?: string; page?: number; limit?: number }) => {
    const p = new URLSearchParams({ page: String(opts?.page ?? 1), limit: String(opts?.limit ?? 20) });
    if (opts?.pair) p.append("pair", opts.pair);
    if (opts?.status) p.append("status", opts.status);
    if (opts?.start_date) p.append("start_date", opts.start_date);
    if (opts?.end_date) p.append("end_date", opts.end_date);
    return appOperation.get(`cross/orders/history?${p.toString()}`, undefined, undefined, CUSTOMER_TYPE);
  },
  crossTrades: (opts?: { pair?: string; side?: string; start_date?: string; end_date?: string; page?: number; limit?: number }) => {
    const p = new URLSearchParams({ page: String(opts?.page ?? 1), limit: String(opts?.limit ?? 20) });
    if (opts?.pair) p.append("pair", opts.pair);
    if (opts?.side && opts.side !== "All") p.append("side", opts.side);
    if (opts?.start_date) p.append("start_date", opts.start_date);
    if (opts?.end_date) p.append("end_date", opts.end_date);
    return appOperation.get(`cross/trades?${p.toString()}`, undefined, undefined, CUSTOMER_TYPE);
  },
  crossBorrowHistory: (opts?: { page?: number; limit?: number; asset?: string; currency_id?: string; start_date?: string; end_date?: string }) => {
    const p = new URLSearchParams({ page: String(opts?.page ?? 1), limit: String(opts?.limit ?? 100) });
    if (opts?.asset) p.append("asset", opts.asset);
    if (opts?.currency_id) p.append("currency_id", opts.currency_id);
    if (opts?.start_date) p.append("start_date", opts.start_date);
    if (opts?.end_date) p.append("end_date", opts.end_date);
    return appOperation.get(`cross/history/borrow?${p.toString()}`, undefined, undefined, CUSTOMER_TYPE);
  },
  crossRepayHistory: (opts?: { page?: number; limit?: number; asset?: string; currency_id?: string; start_date?: string; end_date?: string }) => {
    const p = new URLSearchParams({ page: String(opts?.page ?? 1), limit: String(opts?.limit ?? 100) });
    if (opts?.asset) p.append("asset", opts.asset);
    if (opts?.currency_id) p.append("currency_id", opts.currency_id);
    if (opts?.start_date) p.append("start_date", opts.start_date);
    if (opts?.end_date) p.append("end_date", opts.end_date);
    return appOperation.get(`cross/history/repay?${p.toString()}`, undefined, undefined, CUSTOMER_TYPE);
  },
  crossInterestHistory: (opts?: { page?: number; limit?: number; asset?: string; currency_id?: string; start_date?: string; end_date?: string }) => {
    const p = new URLSearchParams({ page: String(opts?.page ?? 1), limit: String(opts?.limit ?? 100) });
    if (opts?.asset) p.append("asset", opts.asset);
    if (opts?.currency_id) p.append("currency_id", opts.currency_id);
    if (opts?.start_date) p.append("start_date", opts.start_date);
    if (opts?.end_date) p.append("end_date", opts.end_date);
    return appOperation.get(`cross/history/interest?${p.toString()}`, undefined, undefined, CUSTOMER_TYPE);
  },
  crossLedger: (opts?: { page?: number; limit?: number; asset?: string; currency_id?: string; start_date?: string; end_date?: string }) => {
    const p = new URLSearchParams({ page: String(opts?.page ?? 1), limit: String(opts?.limit ?? 100) });
    if (opts?.asset) p.append("asset", opts.asset);
    if (opts?.currency_id) p.append("currency_id", opts.currency_id);
    if (opts?.start_date) p.append("start_date", opts.start_date);
    if (opts?.end_date) p.append("end_date", opts.end_date);
    return appOperation.get(`cross/history/ledger?${p.toString()}`, undefined, undefined, CUSTOMER_TYPE);
  },

  // ============================================================================
  // AirDrop (same as web AirDrop page)
  // ============================================================================
  /** Same as web: GET /v1/user/getOtherSettings */
  get_other_settings: () =>
    appOperation.get('user/getOtherSettings', undefined, undefined, CUSTOMER_TYPE),
  /** Same as web: GET /v1/user/referral-reward-status */
  get_referral_reward_status: () =>
    appOperation.get('user/referral-reward-status', undefined, undefined, CUSTOMER_TYPE),
  /** Same as web: POST /v1/user/complete-referral-social-task body { taskNumber } */
  complete_referral_social_task: (taskNumber: number) =>
    appOperation.post(
      'user/complete-referral-social-task',
      { taskNumber: Number(taskNumber) },
      CUSTOMER_TYPE,
    ),
  past_orders: (data: PastOrdersProps) =>
    appOperation.get('spot/v1/me/orders/history', data, undefined, CUSTOMER_TYPE),
  open_orders: (data: OpenOrdersProps) =>
    appOperation.get('spot/v1/me/orders/open', data, undefined, CUSTOMER_TYPE),
  /** All pairs — paginated spot open orders (web parity: GET spot/v1/me/orders/open?page=&page_size=). */
  spot_me_orders_open: (params: {
    page?: number;
    page_size?: number;
    pair?: string;
    side?: string;
  } = {}) => {
    const q: Record<string, string> = {};
    const page = params.page != null ? Number(params.page) : 1;
    const rawSize = Number(params.page_size);
    const pageSize = Number.isFinite(rawSize) ? Math.min(100, Math.max(1, Math.floor(rawSize))) : 20;
    q.page = String(Math.max(1, page));
    q.page_size = String(pageSize);
    if (params.pair != null && String(params.pair).trim() !== '') {
      q.pair = String(params.pair).toUpperCase().replace(/\//g, '');
    }
    if (params.side != null && String(params.side).trim() !== '') {
      q.side = String(params.side).toUpperCase();
    }
    return appOperation.get('spot/v1/me/orders/open', q, undefined, CUSTOMER_TYPE);
  },
  /** Same as web `AuthService.cancelOrder`: `DELETE /spot/v1/orders/:order_id` */
  cancel_order: (data: CancelOrderProps) =>
    appOperation.delete(
      `spot/v1/orders/${encodeURIComponent(String(data.order_id))}`,
      null,
      CUSTOMER_TYPE,
    ),
  /** Same as web `AuthService.cancelOptionOrder`: `DELETE /v1/options/order/:order_id` */
  close_option_order: (data: CancelOrderProps & { orderId?: string }) => {
    const id = String(data?.order_id ?? data?.orderId ?? '').trim();
    return appOperation.delete(
      `options/order/${encodeURIComponent(id)}`,
      null,
      CUSTOMER_TYPE,
    );
  },
  place_order: (data: PlaceOrderProps) =>
    appOperation.post('spot/v1/orders', data, CUSTOMER_TYPE),
  margin_place_order: (data: any) =>
    appOperation.post('margin/order', data, CUSTOMER_TYPE),
  margin_cancel_order: (orderId: string) =>
    appOperation.delete(`margin/order/${encodeURIComponent(String(orderId))}`, null, CUSTOMER_TYPE),
  margin_open_orders: (params: { pair?: string; page?: number; limit?: number } = {}) => {
    const p = new URLSearchParams({ page: String(params.page ?? 1), limit: String(params.limit ?? 100) });
    if (params.pair) p.append("pair", params.pair);
    return appOperation.get(`margin/orders/open?${p.toString()}`, undefined, undefined, CUSTOMER_TYPE);
  },
  margin_order_history: (params: { pair?: string; status?: string; start_date?: string; end_date?: string; page?: number; limit?: number } = {}) => {
    const p = new URLSearchParams({ page: String(params.page ?? 1), limit: String(params.limit ?? 20) });
    if (params.pair) p.append("pair", params.pair);
    if (params.status) p.append("status", params.status);
    if (params.start_date) p.append("start_date", params.start_date);
    if (params.end_date) p.append("end_date", params.end_date);
    return appOperation.get(`margin/orders/history?${p.toString()}`, undefined, undefined, CUSTOMER_TYPE);
  },
  place_reverse_order: (data: any) =>
    appOperation.post('futures/order', data, CUSTOMER_TYPE),
  close_position: (data: any) =>
    appOperation.post('futures/close-position', data, CUSTOMER_TYPE),
  futuresOpenPositions: (params: { symbol?: string; skip?: number; limit?: number } = {}) => {
    const p = new URLSearchParams({ skip: String(params.skip ?? 0), limit: String(params.limit ?? 20) });
    if (params.symbol) p.append("symbol", params.symbol);
    return appOperation.get(`futures/positions/open?${p.toString()}`, undefined, undefined, CUSTOMER_TYPE);
  },
  futuresPositionHistory: (params: { symbol?: string; status?: string; side?: string; from?: string; to?: string; skip?: number; limit?: number } = {}) => {
    const p = new URLSearchParams({ skip: String(params.skip ?? 0), limit: String(params.limit ?? 20) });
    if (params.symbol) p.append("symbol", params.symbol);
    if (params.status) p.append("status", params.status);
    if (params.side) p.append("side", params.side);
    if (params.from) p.append("from", params.from);
    if (params.to) p.append("to", params.to);
    return appOperation.get(`futures/positions/history?${p.toString()}`, undefined, undefined, CUSTOMER_TYPE);
  },
  futuresPlaceOrder: (payload: any) =>
    appOperation.post('futures/orders', payload, CUSTOMER_TYPE),
  futuresOpenOrders: (params: { symbol?: string; skip?: number; limit?: number } = {}) => {
    const p = new URLSearchParams({ skip: String(params.skip ?? 0), limit: String(params.limit ?? 20) });
    if (params.symbol) p.append("symbol", params.symbol);
    return appOperation.get(`futures/orders/open?${p.toString()}`, undefined, undefined, CUSTOMER_TYPE);
  },
  futuresOrderHistory: (params: { symbol?: string; status?: string; from?: string; to?: string; skip?: number; limit?: number } = {}) => {
    const p = new URLSearchParams({ skip: String(params.skip ?? 0), limit: String(params.limit ?? 20) });
    if (params.symbol) p.append("symbol", params.symbol);
    if (params.status) p.append("status", params.status);
    if (params.from) p.append("from", params.from);
    if (params.to) p.append("to", params.to);
    return appOperation.get(`futures/orders/history?${p.toString()}`, undefined, undefined, CUSTOMER_TYPE);
  },
  futuresExecutions: (params: { symbol?: string; from?: string; to?: string; skip?: number; limit?: number } = {}) => {
    const p = new URLSearchParams({ skip: String(params.skip ?? 0), limit: String(params.limit ?? 20) });
    if (params.symbol) p.append("symbol", params.symbol);
    if (params.from) p.append("from", params.from);
    if (params.to) p.append("to", params.to);
    return appOperation.get(`futures/trades?${p.toString()}`, undefined, undefined, CUSTOMER_TYPE);
  },
  futuresWalletHistory: (params: { asset?: string; symbol?: string; type?: string; from?: string; to?: string; page?: number; limit?: number } = {}) => {
    const p = new URLSearchParams({ page: String(params.page ?? 1), limit: String(params.limit ?? 20) });
    if (params.asset) p.append("asset", params.asset);
    if (params.symbol) p.append("symbol", params.symbol);
    if (params.type) p.append("type", params.type);
    if (params.from) p.append("from", params.from);
    if (params.to) p.append("to", params.to);
    return appOperation.get(`futures/wallet-history?${p.toString()}`, undefined, undefined, CUSTOMER_TYPE);
  },
  getOptionsPairs: (data: any) =>
    appOperation.get('options/optionPairs', undefined, undefined, CUSTOMER_TYPE),
  placeOptionOrder: (data: any, idempotencyKey?: string) =>
    idempotencyKey
      ? appOperation.post('options/order', data, CUSTOMER_TYPE, {
        'Idempotency-Key': String(idempotencyKey),
      })
      : appOperation.post('options/order', data, CUSTOMER_TYPE),
  getExpiryDates: (data: any) =>
    appOperation.get(`options/contractDates?underlying=${data}`, undefined, undefined, CUSTOMER_TYPE),
  cancelFutureOrder: (data: any) => {
    const orderId = typeof data === "object" ? (data.orderId || data.order_id) : data;
    return appOperation.post(`futures/orders/${encodeURIComponent(String(orderId))}/cancel`, {}, CUSTOMER_TYPE);
  },
  transaction_history: (id: string) =>
    appOperation.get(
      `mobile/wallet-history?short_name=${id}`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  coin_details: (data: any) =>
    appOperation.post(
      `exchange/coin-details`,
      data, CUSTOMER_TYPE
    ),
  fee_detail: (data: GetFeeDetailProps) =>
    appOperation.post('exchange/coin-details', data, CUSTOMER_TYPE),
  delete_account: (data: DeleteAccountProps) =>
    appOperation.post('user/delete-account', data, CUSTOMER_TYPE),
  download_trade_report: (data: DownloadTradeReportProps) =>
    appOperation.post('user/download-trade-report', data, CUSTOMER_TYPE),
  two_factor_auth_qr: () =>
    appOperation.get(
      'user/generate-google-qr',
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  /** Same as web: POST security/2fa/setup - returns { success, data: { qr_code, secret: { base32 } } } */
  security2faSetup: () =>
    appOperation.post('security/2fa/setup', {}, CUSTOMER_TYPE),
  /** Same as web: POST security/2fa/confirm - body { code, otpCode?, verifyMethod? } (6-digit TOTP), activates 2FA */
  security2faConfirm: (data: { code: string; otpCode?: string; verifyMethod?: string }) =>
    appOperation.post('security/2fa/confirm', data, CUSTOMER_TYPE),
  /** Same as web: POST security/2fa/disable - body { code?, otpCode?, verifyMethod?, passkeyUserId? } */
  security2faDisable: (authenticatorCode?: string | null, otpCode?: string | null, verifyMethod?: string | null, passkeyUserId?: string | null) => {
    const data: any = {};
    if (authenticatorCode) data.code = authenticatorCode;
    if (otpCode) data.otpCode = otpCode;
    if (verifyMethod) data.verifyMethod = verifyMethod;
    if (passkeyUserId) data.passkeyUserId = passkeyUserId;
    return appOperation.post('security/2fa/disable', data, CUSTOMER_TYPE);
  },
  /** Same as web: POST security/send-otp - body { target, purpose, value? } */
  securitySendOtp: (target: string, purpose: string, value?: string | null) => {
    const params: any = { target, purpose };
    if (value) params.value = value;
    return appOperation.post('security/send-otp', params, CUSTOMER_TYPE);
  },
  /** Same as web: POST security/verify-otp - body { target, otp, purpose, identifier? } */
  securityVerifyOtp: (target: string, otp: string, purpose: string, identifier?: string | null) => {
    const params: any = { target, otp, purpose };
    if (identifier) params.identifier = identifier;
    return appOperation.post('security/verify-otp', params, CUSTOMER_TYPE);
  },
  /** Same as web: POST security/verify-totp - body { code, purpose } for add_passkey etc. */
  securityVerifyTotp: (code: string, purpose: string) =>
    appOperation.post('security/verify-totp', { code: String(code), purpose }, CUSTOMER_TYPE),
  /** Same as web: POST security/verify-all-security-methods - body { type, code?, credential? } */
  verify_all_security_methods: (data: any) =>
    appOperation.post('security/verify-all-security-methods', data, CUSTOMER_TYPE),
  /** Same as web: GET security/get-security-methods-list - returns enabled methods */
  get_security_methods_list: () =>
    appOperation.get('security/get-security-methods-list', undefined, undefined, CUSTOMER_TYPE),
  /** Same as web: GET security/wallet-total-btc */
  get_security_wallet_total_btc: () =>
    appOperation.get('security/wallet-total-btc', undefined, undefined, CUSTOMER_TYPE),
  /** Same as web: POST security/closed-account/send-otp - body { security_methods } */
  securityClosedAccountSendOtp: (security_methods: string) =>
    appOperation.post('security/closed-account/send-otp', { security_methods }, CUSTOMER_TYPE),
  /** Same as web: POST security/closed-account - body { type, code, credential? } */
  securityClosedAccount: (data: { type: string; code: string; credential?: any }) =>
    appOperation.post('security/closed-account', data, CUSTOMER_TYPE),
  /** Same as web: POST security/disable-account/send-otp - body { security_methods } */
  securityDisableAccountSendOtp: (security_methods: string) =>
    appOperation.post('security/disable-account/send-otp', { security_methods }, CUSTOMER_TYPE),
  /** Same as web: POST security/disable-account - body { type, code, credential? } */
  securityDisableAccount: (data: { type: string; code: string; credential?: any }) =>
    appOperation.post('security/disable-account', data, CUSTOMER_TYPE),
  /** Same as web: GET security/get-login-logs */
  securityGetLoginLogs: () =>
    appOperation.get('security/get-login-logs', undefined, undefined, CUSTOMER_TYPE),
  /** Same as web: GET security/get-security-logs */
  securityGetSecurityLogs: () =>
    appOperation.get('security/get-security-logs', undefined, undefined, CUSTOMER_TYPE),
  /** Same as web: GET security/get-logs */
  securityGetLogs: () =>
    appOperation.get('security/get-logs', undefined, undefined, CUSTOMER_TYPE),
  /** Same as web: GET security/get-fund-password-status */
  security_get_fund_password_status: () =>
    appOperation.get('security/get-fund-password-status', undefined, undefined, CUSTOMER_TYPE),
  /** Same as web: GET security/passkeys - returns { success, data: { passkeys: [], count } } */
  passkeyGetList: () =>
    appOperation.get('security/passkeys', undefined, undefined, CUSTOMER_TYPE),
  /** Same as web: POST security/passkey/register/options - returns WebAuthn registration options */
  passkeyGetRegistrationOptions: () =>
    appOperation.post('security/passkey/register/options', {}, CUSTOMER_TYPE),
  /** Same as web: POST security/passkey/register/verify - body { credential, name, deviceInfo? } */
  passkeyVerifyRegistration: (
    credential: object,
    name: string,
    deviceInfo?: { browser: string; os: string },
  ) => {
    const body: Record<string, unknown> = {
      credential,
      name,
      clientType: 'mobile',
      platform: Platform.OS,
    };
    if (deviceInfo) {
      body.deviceInfo = deviceInfo;
      body.browser = deviceInfo.browser;
      body.os = deviceInfo.os;
    }
    const userAgent = getMobilePasskeyUserAgent();

    console.log('[Passkey][API] POST security/passkey/register/verify', {
      name,
      deviceInfo: body.deviceInfo,
      browser: body.browser,
      os: body.os,
      clientType: body.clientType,
      platform: body.platform,
      userAgent,
      credentialKeys: credential && typeof credential === 'object' ? Object.keys(credential as object) : [],
    });

    return appOperation.post(
      'security/passkey/register/verify',
      body,
      CUSTOMER_TYPE,
      { 'User-Agent': userAgent },
    );
  },
  /** Same as web: POST security/passkey/auth/options - for change email/mobile, disable 2FA, etc. */
  passkeyGetAuthOptions: (signId: string) =>
    appOperation.post('security/passkey/auth/options', { signId }, CUSTOMER_TYPE),
  /** Same as web: POST security/passkey/auth/verify - returns { success, data: { userId } } */
  passkeyVerifyAuth: (signId: string, credential: object) =>
    appOperation.post('security/passkey/auth/verify', { signId, credential }, CUSTOMER_TYPE),
  /** Same as web: POST security/passkey/step-up/options — authenticated security flows (delete passkey, etc.) */
  passkeyGetStepUpOptions: () =>
    appOperation.post('security/passkey/step-up/options', {}, CUSTOMER_TYPE),
  /** Same as web: POST security/passkey/step-up/verify */
  passkeyVerifyStepUp: (credential: object) =>
    appOperation.post('security/passkey/step-up/verify', { credential }, CUSTOMER_TYPE),
  /** Same as web: POST security/passkey/delete - body { passkeyId, verifyMethod, code, passkeyUserId } */
  passkeyDelete: (passkeyId: string, verifyMethod: string, code: string | null, passkeyUserId: string | null) => {
    const data: any = { passkeyId, verifyMethod };
    if (code) data.code = code;
    if (passkeyUserId) data.passkeyUserId = passkeyUserId;
    return appOperation.post('security/passkey/delete', data, CUSTOMER_TYPE);
  },

  // --- Device & Session Management ---
  listDevices: () =>
    appOperation.get('security/devices', undefined, undefined, CUSTOMER_TYPE),
  listSessions: () =>
    appOperation.get('security/sessions', undefined, undefined, CUSTOMER_TYPE),
  trustDevice: (deviceId: string) =>
    appOperation.post(`security/devices/${encodeURIComponent(deviceId)}/trust`, { device_id: deviceId }, CUSTOMER_TYPE),
  untrustDevice: (deviceId: string) =>
    appOperation.post(`security/devices/${encodeURIComponent(deviceId)}/untrust`, { device_id: deviceId }, CUSTOMER_TYPE),
  removeDevice: (deviceId: string) =>
    appOperation.post(`security/devices/${encodeURIComponent(deviceId)}/remove`, { device_id: deviceId }, CUSTOMER_TYPE),
  bindDeviceIp: (deviceId: string) =>
    appOperation.post(`security/devices/${encodeURIComponent(deviceId)}/bind-ip`, { device_id: deviceId }, CUSTOMER_TYPE),
  unbindDeviceIp: (deviceId: string) =>
    appOperation.post(`security/devices/${encodeURIComponent(deviceId)}/unbind-ip`, { device_id: deviceId }, CUSTOMER_TYPE),
  blockDevice: (deviceId: string, body: any) =>
    appOperation.post(`security/devices/${encodeURIComponent(deviceId)}/block`, body, CUSTOMER_TYPE),
  unblockDevice: (deviceId: string) =>
    appOperation.post(`security/devices/${encodeURIComponent(deviceId)}/unblock`, { device_id: deviceId }, CUSTOMER_TYPE),
  bindSessionIp: (sessionId: string) =>
    appOperation.post(`security/sessions/${encodeURIComponent(sessionId)}/bind-ip`, {}, CUSTOMER_TYPE),
  unbindSessionIp: (sessionId: string) =>
    appOperation.post(`security/sessions/${encodeURIComponent(sessionId)}/unbind-ip`, {}, CUSTOMER_TYPE),
  revokeSession: (sessionId: string) =>
    appOperation.post(`security/sessions/${encodeURIComponent(sessionId)}/revoke`, {}, CUSTOMER_TYPE),
  revokeOtherSessions: () =>
    appOperation.post('security/sessions/revoke-others', {}, CUSTOMER_TYPE),
  revokeAllSessions: () =>
    appOperation.post('security/sessions/revoke-all', {}, CUSTOMER_TYPE),

  /** Same as web: POST security/mobile/add — base fields + optional identity (emailOtp | tofaCode | passkey…) */
  securityMobileAdd: (data: {
    mobileNumber: string;
    countryCode: string;
    mobileOtp: string;
    emailOtp?: string;
    tofaCode?: string;
    currentMobileOtp?: string;
    passkeyVerified?: boolean;
    passkeyUserId?: string;
    identifier?: string;
    value?: string;
  }) => appOperation.post('security/mobile/add', data, CUSTOMER_TYPE),
  /** Same as web: POST security/email/add - body { email, tofaCode?, mobileOtp?, emailOtp } */
  securityEmailAdd: (data: { email: string; tofaCode?: string; mobileOtp?: string; emailOtp: string }) =>
    appOperation.post('security/email/add', data, CUSTOMER_TYPE),
  /** Same as web: POST security/email/change/initiate - body { newEmail, tofaCode?, currentEmailOtp?, currentMobileOtp?, passkeyUserId? } */
  securityEmailChangeInitiate: (data: { newEmail: string; tofaCode?: string; currentEmailOtp?: string; currentMobileOtp?: string; passkeyUserId?: string }) =>
    appOperation.post('security/email/change/initiate', data, CUSTOMER_TYPE),
  /** Same as web: POST security/email/change/complete - body { newEmailOtp } */
  securityEmailChangeComplete: (data: { newEmailOtp: string }) =>
    appOperation.post('security/email/change/complete', data, CUSTOMER_TYPE),
  /** Same as web: POST security/mobile/change/initiate - body { newMobileNumber, newCountryCode, tofaCode?, currentEmailOtp?, currentMobileOtp?, passkeyUserId? } */
  securityMobileChangeInitiate: (data: { newMobileNumber: string; newCountryCode: string; tofaCode?: string; currentEmailOtp?: string; currentMobileOtp?: string; passkeyUserId?: string }) =>
    appOperation.post('security/mobile/change/initiate', data, CUSTOMER_TYPE),
  /** Same as web: POST security/mobile/change/complete - body { newMobileOtp } */
  securityMobileChangeComplete: (data: { newMobileOtp: string }) =>
    appOperation.post('security/mobile/change/complete', data, CUSTOMER_TYPE),
  getEmergencyContactList: () =>
    appOperation.get('security/get-emergency-contact-list', undefined, undefined, CUSTOMER_TYPE),
  getEmergencyContactCount: () =>
    appOperation.get('security/get-emergency-contact-count', undefined, undefined, CUSTOMER_TYPE),
  sendEmergencyContactOtp: (security_methods: 'email' | 'mobile') =>
    appOperation.post('security/emergency-contact/send-otp', { security_methods }, CUSTOMER_TYPE),
  addEmergencyContact: (data: { fullName: string; emailId: string; mobileNumber: string; type: string; code?: string; credential?: any }) =>
    appOperation.post('security/add-emergency-contact', data, CUSTOMER_TYPE),
  editEmergencyContact: (data: { contactId: string; fullName: string; emailId: string; mobileNumber: string; type: string; code?: string; credential?: any }) =>
    appOperation.post('security/edit-emergency-contact', data, CUSTOMER_TYPE),
  deleteEmergencyContact: (data: { contactId: string; type: string; code?: string; credential?: any }) =>
    appOperation.post('security/delete-emergency-contact', data, CUSTOMER_TYPE),
  saveEmergencyContactMessage: (data: { contactId: string; message: string; type: string; code?: string; credential?: any }) =>
    appOperation.post('security/save-emergency-contact-message', data, CUSTOMER_TYPE),
  enable_two_fa: (data: any) =>
    appOperation.put('user/enable-2fa', data, CUSTOMER_TYPE),
  convert_history: () =>
    appOperation.get('swap/history', undefined, undefined, CUSTOMER_TYPE),
  conversion_rate: (data: any) =>
    appOperation.post('swap/convert-token', data, CUSTOMER_TYPE),
  swap_token: (data: any) =>
    appOperation.post('swap/swap-token', data, CUSTOMER_TYPE),

  // Fiat Convert (Buy/Sell Crypto)
  fiat_convert_assets: () =>
    appOperation.get('fiat/convert/assets', undefined, undefined, CUSTOMER_TYPE),
  fiat_convert_rates: () =>
    appOperation.get('fiat/convert/rates', undefined, undefined, CUSTOMER_TYPE),
  fiat_convert_quotes: (data: any) =>
    appOperation.post('fiat/convert/quotes', data, CUSTOMER_TYPE),
  fiat_convert_execute: (data: { quote_id: string }, headers?: any) =>
    appOperation.post('fiat/convert/trades', data, CUSTOMER_TYPE, headers),
  fiat_convert_trades: (params?: string) =>
    appOperation.get(`fiat/convert/trades${params ? '?' + params : ''}`, undefined, undefined, CUSTOMER_TYPE),
  fiat_limits: () =>
    appOperation.get('fiat/limits', undefined, undefined, CUSTOMER_TYPE),
  fiat_virtual_account_me: () =>
    appOperation.get('fiat/virtual-accounts/me', undefined, undefined, CUSTOMER_TYPE),
  fiat_virtual_account_create: (data: any = {}, headers?: any) =>
    appOperation.post('fiat/virtual-accounts', data, CUSTOMER_TYPE, headers),
  fiat_deposits_list: (params?: string) =>
    appOperation.get(`fiat/deposits${params ? '?' + params : ''}`, undefined, undefined, CUSTOMER_TYPE),
  fiat_deposit_detail: (id: string) =>
    appOperation.get(`fiat/deposits/${id}`, undefined, undefined, CUSTOMER_TYPE),

  // Fiat Whitelist / Beneficiaries
  fiat_whitelist_list: (status?: string) =>
    appOperation.get(`fiat/whitelist${status ? '?status=' + status : ''}`, undefined, undefined, CUSTOMER_TYPE),
  fiat_whitelist_create: (data: any) =>
    appOperation.post('fiat/whitelist', data, CUSTOMER_TYPE),
  fiat_whitelist_verify: (id: string, data: { otp: string }) =>
    appOperation.post(`fiat/whitelist/${encodeURIComponent(String(id))}/verify`, data, CUSTOMER_TYPE),
  fiat_whitelist_resend_otp: (id: string) =>
    appOperation.post(`fiat/whitelist/${encodeURIComponent(String(id))}/resend-otp`, {}, CUSTOMER_TYPE),
  fiat_whitelist_delete: (id: string) =>
    appOperation.delete(`fiat/whitelist/${encodeURIComponent(String(id))}`, null, CUSTOMER_TYPE),

  // Fiat Withdrawals
  fiat_withdrawals_preview: (params: string) =>
    appOperation.get(`fiat/withdrawals/preview?${params}`, undefined, undefined, CUSTOMER_TYPE),
  fiat_withdrawals_submit: (data: any, headers?: any) =>
    appOperation.post('fiat/withdrawals', data, CUSTOMER_TYPE, headers),
  fiat_withdrawals_list: (params?: string) =>
    appOperation.get(`fiat/withdrawals${params ? '?' + params : ''}`, undefined, undefined, CUSTOMER_TYPE),
  fiat_withdrawals_detail: (id: string) =>
    appOperation.get(`fiat/withdrawals/${id}`, undefined, undefined, CUSTOMER_TYPE),
  fiat_withdrawals_cancel: (id: string) =>
    appOperation.post(`fiat/withdrawals/${encodeURIComponent(String(id))}/cancel`, {}, CUSTOMER_TYPE),

  user_wallet: (wallet_type: string = 'spot') =>
    appOperation.get(`wallet/user-wallet?wallet_type=${wallet_type}`, undefined, undefined, CUSTOMER_TYPE),

  coin_list: () =>
    appOperation.get('coin/get-coin', undefined, undefined, CUSTOMER_TYPE),

  qs_BuySell: (data: any) =>
    appOperation.post('qbs/quick_buy_sell', data, CUSTOMER_TYPE),

  qs_Hisory: (skip: number, limit: number) =>
    appOperation.get(
      `qbs/history?skip=${skip}&limit=${limit}`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),

  // Referral
  // - `referral_user_list` is the legacy list (often masked)
  // - `my-referral-tree` matches web "Referral History" (includes user object)
  get_referral_list: () =>
    appOperation.get(
      `user/referral_user_list`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  get_my_referral_tree: () =>
    appOperation.get(
      `user/my-referral-tree`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  get_my_referral_earnings: () =>
    appOperation.get(
      `user/my-referral-earnings`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  get_referral_children: (parentId: string) =>
    appOperation.get(
      `user/referral-children?parentId=${encodeURIComponent(String(parentId ?? ""))}`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),

  // Airdrop / Referral release history (Airdrop History page)
  get_referral_release_history: (page: number, limit: number) =>
    appOperation.get(
      `user/referral-release-history?page=${Number(page) || 1}&limit=${Number(limit) || 20}`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  get_referral_vesting_status: () =>
    appOperation.get(
      `user/referral-vesting-status`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  Staking_Home: (page: number = 1, limit: number = 50) =>
    appOperation.get(
      `staking/packages?page=${page}&limit=${limit}`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  Staking_GetPackagesForCoin: (currency: string) =>
    appOperation.get(
      `staking/getStakingPackagesForSingleCoin?currency=${encodeURIComponent(currency)}`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  Staking_Subscribe: (data: any) =>
    appOperation.post('staking/subscribe', data, CUSTOMER_TYPE),
  Staking_MyPositions: (page: number = 1, limit: number = 100) =>
    appOperation.get(
      `staking/my-positions?page=${page}&limit=${limit}`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  Staking_UserBalance: (currencyId: string, walletType: string = 'earning') =>
    appOperation.get(
      `staking/user-balance?currencyId=${currencyId}&walletType=${walletType}`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  SoftStaking_Packages: (page: number = 1, limit: number = 10) =>
    appOperation.get(
      `softstaking/packages?page=${page}&limit=${limit}`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  SoftStaking_Status: () =>
    appOperation.get(
      `softstaking/status`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  Launchpad_Projects: () =>
    appOperation.get(
      'launchpad/get-launchpads',
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  Launchpad_Project_Detail: (id: string) =>
    appOperation.get(
      `launchpad/${id}`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  Launchpad_Buy_Token: (data: any) =>
    appOperation.post('launchpad/buy-token', data, CUSTOMER_TYPE),
  Launchpad_User_Balance: (currencyId: string, walletType: string = 'earning') =>
    appOperation.get(
      `launchpad/user-balance?currencyId=${currencyId}&walletType=${walletType}`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  place_staking: (data: any) =>
    appOperation.post('staking/place_staking', data, CUSTOMER_TYPE),

  Laked_Staking_History: () =>
    appOperation.get(
      'staking/staking_income',
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),

  Staking_History: (data: any) =>
    appOperation.get(
      'staking/staking_history',
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  get_commit_details: (id: any) =>
    appOperation.get(
      `user/launchpad/user_project_commit_history/${id}`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  admin_trades: (skip: any, limit: any) =>
    appOperation.get(
      `wallet/bonus-history?skip=${skip}&limit=${limit}`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  qbs_history: (skip: any, limit: any) =>
    appOperation.get(
      `qbs/history?skip=${skip}&limit=${limit}`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  all_open_orders: (skip: any, limit: any) =>
    appOperation.get(
      `exchange/all-open-orders?skip=${skip}&limit=${limit}`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  break_staking: (data: any) =>
    appOperation.post('staking/break_staking', data, CUSTOMER_TYPE),
  Staking_Redeem: (positionId: string, redeemAmount: number) =>
    appOperation.post(`staking/redeem`, { positionId, redeemAmount }, CUSTOMER_TYPE),
  Staking_TopUp: (positionId: string, topUpAmount: number, walletType: string = "earning") =>
    appOperation.post(`staking/top-up`, { positionId, topUpAmount, walletType }, CUSTOMER_TYPE),
  Staking_CancelPosition: (positionId: string, cancelReason?: string) =>
    appOperation.post(`staking/position/${positionId}/cancel`, { positionId, ...(cancelReason ? { cancelReason } : {}) }, CUSTOMER_TYPE),
  /** Legacy — prefer `spot_me_trades` (web parity: GET /spot/v1/me/trades). */
  get_trade_history: (skip: any, limit: any, pair?: string) =>
    appOperation.get(
      `spot/v1/trades/my?skip=${skip}&limit=${limit}${pair ? `&pair=${pair}` : ''}`,
      undefined,
      undefined,
      CUSTOMER_TYPE,
    ),
  /** Same as web `AuthService.spotMeTrades`: GET /spot/v1/me/trades?page=&page_size=&pair= */
  spot_me_trades: (params: { page?: number; page_size?: number; pair?: string }) =>
    appOperation.get('spot/v1/me/trades', params, undefined, CUSTOMER_TYPE),
  subscribe_earning_package: (data: any) =>
    appOperation.post('earning/subscribe-earning-package', data, CUSTOMER_TYPE),
  swap_currency_list: () =>
    appOperation.get('qbs/base_currency_list', undefined, undefined, CUSTOMER_TYPE),
  get_conversion_rate: (from: any, to: any) =>
    appOperation.get(`qbs/get_conversion_rate?from=${from}&receive=${to}`, undefined, undefined, CUSTOMER_TYPE),
  get_user_tickets: () =>
    appOperation.get(`support/get-user-tickets`, undefined, undefined, CUSTOMER_TYPE),
  get_ticket_categories: () =>
    appOperation.get(`support/get-categories`, undefined, undefined, CUSTOMER_TYPE),
  /** Same as web: GET security/anti-phishing/status - returns { success, data: { hasAntiPhishingCode, antiPhishingCode, methods } } */
  get_anti_phishing_status: () =>
    appOperation.get('security/anti-phishing/status', undefined, undefined, CUSTOMER_TYPE),
  /** Same as web: POST security/anti-phishing/send-otp - body { target } */
  send_anti_phishing_otp: (target: string) =>
    appOperation.post('security/anti-phishing/send-otp', { target }, CUSTOMER_TYPE),
  /** Same as web: POST security/anti-phishing/add - body { antiPhishingCode, verifyMethod, code?, passkeyUserId? } */
  add_anti_phishing_code: (data: { antiPhishingCode: string; verifyMethod: string; code?: string; passkeyUserId?: string }) =>
    appOperation.post('security/anti-phishing/add', data, CUSTOMER_TYPE),
  /** Same as web: POST security/anti-phishing/remove - body { verifyMethod, code?, passkeyUserId? } */
  remove_anti_phishing_code: (data: { verifyMethod: string; code?: string; passkeyUserId?: string }) =>
    appOperation.post('security/anti-phishing/remove', data, CUSTOMER_TYPE),
  fetch_withdrawal_security_settings: () =>
    appOperation.get('security/withdrawal-settings', undefined, undefined, CUSTOMER_TYPE),
  update_withdrawal_security_settings: (data: any) =>
    appOperation.post('security/withdrawal-settings', data, CUSTOMER_TYPE),
  verify_and_toggle_withdrawal_setting: (data: { method: string; enable: boolean; code?: string; fund_password?: string }) =>
    appOperation.post('security/withdrawal-settings/toggle', data, CUSTOMER_TYPE),
  securityCheckTwoLogin2Step: () =>
    appOperation.get('security/check-two-login-2-step', undefined, undefined, CUSTOMER_TYPE),
  securityUpdateTwoLogin2Step: (data: { security_methods: string; code: string; action: string }) =>
    appOperation.post('security/update-two-login-2-step', data, CUSTOMER_TYPE),
  securitySendOtpForTwoLogin2Step: (security_methods: string) =>
    appOperation.post('security/send-otp-for-two-login-2-step', { security_methods }, CUSTOMER_TYPE),

  // Customer Due Diligence (CDD) endpoints
  cddGetSchema: () =>
    appOperation.get('user/cdd/schema', undefined, undefined, CUSTOMER_TYPE),
  cddGetProfile: () =>
    appOperation.get('user/cdd', undefined, undefined, CUSTOMER_TYPE),
  cddSubmit: (data: any) =>
    appOperation.put('user/cdd', data, CUSTOMER_TYPE),
});