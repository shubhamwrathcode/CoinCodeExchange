import { appOperation } from '../appOperation';
import { extractDepositCoinsList, normalizeDepositCoinsResponse } from '../helper/depositCoinsNormalize';
import {
  extractWithdrawCoinsList,
  mapDepositCoinsToWithdrawCatalog,
  normalizeWithdrawCoinsResponse,
} from '../helper/withdrawCoinsNormalize';
import { logger, showError, showSuccess } from '../helper/logger';
import {
  GenerateAddressProps,
  WithdrawCurrencyProps,
  WithdrawInrProps,
} from '../helper/types';
import { transformCurrencyDataWithDistribution } from '../helper/utility';
import NavigationService from '../navigation/NavigationService';
import { Dashboard_Inner, DEPOSIT_SCREEN, WITHDRAW_SCREEN } from '../navigation/routes';
import { setLoading } from '../slices/authSlice';
import { setOpenOrders, clearOpenOrders, setCoinData } from '../slices/homeSlice';
import {
  setAdminBankDetails,
  setTradeHistory,
  clearTradeHistory,
  setTransactionHistory,
  setUserWallet,
  setWalletAddress,
  setWalletBalance,
  setWalletHistory,
  clearWalletHistory,
  setDepositHistory,
  setWithdrawHistory,
  setCoinDetails,
  setWalletBalanceMain,
  setWalletBalanceSpot,
  setWalletBalanceSwap,
  setWalletBalanceEarning,
  setDepositActiveCoins,
  setDepositFiatCoins,
  setWithdrawActiveCoins,
  setUserMainWallet,
  setPackageList,
  setWalletTypes,
  setParticularCoinBalance,
  setUserPayoutList,
  setEarnWalletBal,
  setSubscribedPackageList,
  setSubscribedActivePackages,
  setSubscribedCompletePackages,
  setSubscribedCancelPackages,
  setBotPackageList,
  setBotActiveList,
  setBotTradeData,
  setTotalProfit,
  setWalletBalanceArbitrage,
  setUserSpotWallet,
  setUserEarningWallet,
  setUserArbitrageWallet,
  setUserSwapWallet,
  setEarningPortfolio,
  setEarningPortfolioSummary,
  setAdminTradeList,
  clearAdminTradeList,
  setSwapHistoryList,
  clearSwapHistoryList,
  setInteralWalletHistory,
  clearInteralWalletHistory,
  setSwapCurrencyList,
  setSwapConversionRate,
  setUserFuturesWallet,
  setUserOptionsWallet,
  setWalletBalanceFutures,
  setWalletBalanceOptions
} from '../slices/walletSlice';
import { AppDispatch } from '../store/store';
import { getWithdrawalPasskeyCredential } from './accountActions';

const useGlobalLoader = (opts?: { useGlobalLoader?: boolean }) => opts?.useGlobalLoader !== false;

/** Overview / total equity — avoids `estimated-portfolio?walletType=` empty → 400 Invalid wallet type. */
export const getAllWalletsPortfolio =
  (options?: { useGlobalLoader?: boolean }) => async (dispatch: AppDispatch) => {
    if (useGlobalLoader(options)) dispatch(setLoading(true));
    try {
      const response: any = await appOperation.customer.all_wallets_portfolio();
      if (response.success) {
        dispatch(setWalletBalance(response?.data));
      }
    } catch (e) {
      logger(e);
    } finally {
      if (useGlobalLoader(options)) dispatch(setLoading(false));
    }
  };

export const getUserPortfolio = (id: any, options?: { useGlobalLoader?: boolean }) => async (dispatch: AppDispatch) => {
  const walletType = String(id ?? "").trim();
  if (!walletType) {
    if (__DEV__) {
      console.warn(
        "[Wallet] getUserPortfolio skipped: empty walletType (use getAllWalletsPortfolio for overview total)",
      );
    }
    return;
  }
  if (useGlobalLoader(options)) dispatch(setLoading(true));
  try {
    const response: any = await appOperation.customer.user_portfolio(walletType);
    if (response.success) {
      dispatch(setWalletBalance(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {
    if (useGlobalLoader(options)) dispatch(setLoading(false));
  }
};

export const getUserPortfolioMain = (id: any, options?: { useGlobalLoader?: boolean }) => async (dispatch: AppDispatch) => {
  try {
    if (useGlobalLoader(options)) dispatch(setLoading(true));
    const response: any = await appOperation.customer.user_portfolio(id);
    if (response.success) {
      dispatch(setWalletBalanceMain(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {
    if (useGlobalLoader(options)) dispatch(setLoading(false));
  }
};

export const getUserPortfolioSpot = (id: any, options?: { useGlobalLoader?: boolean }) => async (dispatch: AppDispatch) => {
  try {
    if (useGlobalLoader(options)) dispatch(setLoading(true));
    const response: any = await appOperation.customer.user_portfolio(id);
    if (response.success) {
      dispatch(setWalletBalanceSpot(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {
    if (useGlobalLoader(options)) dispatch(setLoading(false));
  }
};

export const getUserPortfolioSwap = (id: any, options?: { useGlobalLoader?: boolean }) => async (dispatch: AppDispatch) => {
  try {
    if (useGlobalLoader(options)) dispatch(setLoading(true));
    const response: any = await appOperation.customer.user_portfolio(id);
    if (response.success) {
      dispatch(setWalletBalanceSwap(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {
    if (useGlobalLoader(options)) dispatch(setLoading(false));
  }
};

export const getUserPortfolioEarning = (id: any, options?: { useGlobalLoader?: boolean }) => async (dispatch: AppDispatch) => {
  try {
    if (useGlobalLoader(options)) dispatch(setLoading(true));
    const response: any = await appOperation.customer.user_portfolio(id);
    if (response.success) {
      dispatch(setWalletBalanceEarning(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {
    if (useGlobalLoader(options)) dispatch(setLoading(false));
  }
};

export const getUserPortfolioArbitrage = (id: any, options?: { useGlobalLoader?: boolean }) => async (dispatch: AppDispatch) => {
  try {
    if (useGlobalLoader(options)) dispatch(setLoading(true));
    const response: any = await appOperation.customer.user_portfolio(id);
    if (response.success) {
      dispatch(setWalletBalanceArbitrage(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {
    if (useGlobalLoader(options)) dispatch(setLoading(false));
  }
};

export const getUserPortfolioFutures = (id: any, options?: { useGlobalLoader?: boolean }) => async (dispatch: AppDispatch) => {
  try {
    if (useGlobalLoader(options)) dispatch(setLoading(true));
    const response: any = await appOperation.customer.user_portfolio(id);
    if (response.success) {
      dispatch(setWalletBalanceFutures(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {
    if (useGlobalLoader(options)) dispatch(setLoading(false));
  }
};

export const getUserPortfolioOptions = (id: any, options?: { useGlobalLoader?: boolean }) => async (dispatch: AppDispatch) => {
  try {
    if (useGlobalLoader(options)) dispatch(setLoading(true));
    const response: any = await appOperation.customer.user_portfolio(id);
    if (response.success) {
      dispatch(setWalletBalanceOptions(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {
    if (useGlobalLoader(options)) dispatch(setLoading(false));
  }
};

export const getDepositActiveCoins = (id: any) => async (dispatch: AppDispatch) => {
  try {
    let list: any[] = [];
    try {
      const res: any = await appOperation.customer.deposit_coins();
      list = normalizeDepositCoinsResponse(extractDepositCoinsList(res));
    } catch {
      list = [];
    }

    if (!list.length) {
      const response: any = await appOperation.customer.deposit_active_coins();
      if (response?.success) {
        list = normalizeDepositCoinsResponse(extractDepositCoinsList(response));
      }
    }

    dispatch(setDepositActiveCoins(list.length ? list : []));
  } catch (e) {
    logger(e);
  } finally {

    dispatch(setLoading(false));
  }
};

export const getWithdrawActiveCoins = (_id?: any) => async (dispatch: AppDispatch) => {
  try {
    let list: any[] = [];
    try {
      const res: any = await appOperation.customer.withdrawal_coins_v1();
      list = normalizeWithdrawCoinsResponse(extractWithdrawCoinsList(res));
    } catch {
      try {
        const res: any = await appOperation.customer.withdrawal_coins();
        list = normalizeWithdrawCoinsResponse(extractWithdrawCoinsList(res));
      } catch {
        list = [];
      }
    }

    /** DepositCoin primary route — often same backend catalog as web when `withdrawal-coins` is empty. */
    if (!list.length) {
      try {
        const resDep: any = await appOperation.customer.deposit_coins();
        const raw = extractDepositCoinsList(resDep);
        const depNorm = normalizeDepositCoinsResponse(raw);
        list = mapDepositCoinsToWithdrawCatalog(depNorm);
      } catch {
        /* ignore */
      }
    }

    if (!list.length) {
      try {
        const response: any = await appOperation.customer.widthraw_active_coins();
        const ok =
          response?.success === true ||
          response?.success === 1 ||
          response?.success == null;
        if (ok) {
          list = normalizeWithdrawCoinsResponse(extractWithdrawCoinsList(response));
        }
      } catch {
        /* ignore */
      }
    }

    dispatch(setWithdrawActiveCoins(list.length ? list : []));
  } catch (e) {
    logger(e);
  } finally {
    dispatch(setLoading(false));
  }
};

export const getDepositFiatCoins = (id: any) => async (dispatch: AppDispatch) => {
  try {
    const response: any = await appOperation.customer.deposit_fiat_coins();
    // console.log(response, "getUserPortfolioEarning");
    if (response.success) {
      dispatch(setDepositFiatCoins(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {

    dispatch(setLoading(false));
  }
};

export const getAdminTrades = (skip: any, limit: any) => async (dispatch: AppDispatch) => {
  try {
    dispatch(clearAdminTradeList());
    dispatch(setLoading(true));
    const response: any = await appOperation.customer.admin_trades(skip, limit);
    if (response.success) {
      dispatch(setAdminTradeList(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {

    dispatch(setLoading(false));
  }
};

export const getqbsHistory = (skip: any, limit: any) => async (dispatch: AppDispatch) => {
  try {
    if (skip === 0) dispatch(clearSwapHistoryList());
    dispatch(setLoading(true));
    const response: any = await appOperation.customer.qbs_history(skip, limit);
    // console.log(response, "getqbsHistory");
    if (response.success) {
      dispatch(setSwapHistoryList(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {

    dispatch(setLoading(false));
  }
};

/** Normalize fills list — matches web `spotMeActivityItemsFromResponse`. */
function spotTradeHistoryItemsFromResponse(res: any): any[] {
  if (!res || typeof res !== 'object') return [];
  const d = res.data;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(res.items)) return res.items;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.records)) return d.records;
  return [];
}

/**
 * User trade fills — uses web parity endpoint `GET /spot/v1/me/trades` (page/page_size/pair).
 * Spot passes `pair`; History screen omits `pair` for all markets.
 */
export const getTradeHistory =
  (
    skip: any,
    limit: any,
    pair?: string,
    options?: { useGlobalLoader?: boolean; clearBeforeFetch?: boolean },
  ) => async (dispatch: AppDispatch) => {
    const useLoader = options?.useGlobalLoader !== false;
    const shouldClear =
      Number(skip) === 0 && options?.clearBeforeFetch !== false;
    try {
      if (shouldClear) dispatch(clearTradeHistory());
      if (useLoader) dispatch(setLoading(true));
      const lim = Math.min(100, Math.max(1, Number(limit) || 20));
      const pg = Math.floor(Number(skip) / lim) + 1 || 1;
      const params: { page: number; page_size: number; pair?: string } = {
        page: pg,
        page_size: lim,
      };
      const p = pair != null ? String(pair).trim() : '';
      if (p !== '') {
        params.pair = p.toUpperCase().replace(/\//g, '');
      }
      const response: any = await appOperation.customer.spot_me_trades(params);
      if (response.success) {
        const items = spotTradeHistoryItemsFromResponse(response);
        dispatch(setTradeHistory(items));
      }
    } catch (e) {
      logger(e);
    } finally {
      if (useLoader) dispatch(setLoading(false));
    }
  };

export const getInteralWalletHistory = (skip: any, limit: any) => async (dispatch: AppDispatch) => {
  try {
    if (skip === 0) dispatch(clearInteralWalletHistory());
    dispatch(setLoading(true));
    const response: any = await appOperation.customer.interal_wallet_history(skip, limit);
    // console.log(response, "getInteralWalletHistory");
    if (response.success) {
      dispatch(setInteralWalletHistory(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {

    dispatch(setLoading(false));
  }
};





export const getUserWallet = (id: string | undefined) => async (dispatch: AppDispatch) => {
  try {
    // dispatch(setLoading(true));
    /** `wallet/user-wallet?wallet_type=` with empty type returns 400 — use unscoped list. */
    const walletType = String(id ?? '').trim();
    const response: any =
      walletType === ''
        ? await appOperation.customer.user_wallet()
        : await appOperation.customer.user_main_wallet(id);
    if (response.success) {
      const wallets = response?.data || [];

      // Parse balance to number and sort
      const walletsWithBalance = wallets
        .filter((wallet: { balance: string; }) => parseFloat(wallet.balance) > 0)
        .sort((a: { balance: string; }, b: { balance: string; }) => parseFloat(b.balance) - parseFloat(a.balance));

      let topWalletsList: any[] = [];

      if (walletsWithBalance.length >= 2) {
        topWalletsList = walletsWithBalance;
      } else {
        // Add existing non-zero wallets
        topWalletsList = [...walletsWithBalance];

        // Fill remaining with top wallets regardless of balance
        const remaining = 2 - topWalletsList.length;
        const walletsSorted = wallets
          .sort((a: { balance: string; }, b: { balance: string; }) => parseFloat(b.balance) - parseFloat(a.balance))
          .filter((w: { currency_id: any; }) => !topWalletsList.find(tw => tw.currency_id === w.currency_id));

        topWalletsList = topWalletsList.concat(walletsSorted.slice(0, remaining));
      }

      // setfundData(wallets);
      // if (currencyData?.length === 0) {
      //   setCurrencyData(wallets);
      //   setSelectedCurrency(wallets[0] || {})
      // }
      dispatch(setUserWallet(response?.data));
      // dispatch(setUserWallet(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {
    // dispatch(setLoading(false));
  }
};

export const getUserDifferentWallet = (id: any) => async (dispatch: AppDispatch) => {
  try {
    // dispatch(setLoading(true));
    const response: any = await appOperation.customer.user_main_wallet(id);
    if (response.success) {
      if (id === "main") {
        dispatch(setUserMainWallet(response?.data));
      } else if (id === "spot") {
        dispatch(setUserSpotWallet(response?.data));
      } else if (id === "swap") {
        dispatch(setUserSwapWallet(response?.data));
      } else if (id === "earning") {
        dispatch(setUserEarningWallet(response?.data));
      } else if (id === "arbitrage") {
        dispatch(setUserArbitrageWallet(response?.data));
      }
    }
  } catch (e) {
    logger(e);
  } finally {
    // dispatch(setLoading(false));
  }
};



export const getSwapCurrencyList = () => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response: any = await appOperation.customer.swap_currency_list();
    if (response.success) {
      dispatch(setSwapCurrencyList(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {
    dispatch(setLoading(false));
  }
};

export const getConversionRate = (form: any, to: any) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response: any = await appOperation.customer.get_conversion_rate(form, to);
    if (response.success) {
      dispatch(setSwapConversionRate(response?.data));
    }
  } catch (e) {
    logger(e);
    if (e?.code === 500) {
      dispatch(setSwapConversionRate({}));
    }
  } finally {
    dispatch(setLoading(false));
  }
};

export const getUserMainWallet = (id: any) => async (dispatch: AppDispatch) => {
  try {
    // dispatch(setLoading(true));
    const response: any = await appOperation.customer.user_main_wallet(id);
    if (response.success) {
      dispatch(setUserMainWallet(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {
    // dispatch(setLoading(false));
  }
};

export const getUserSpotWallet = (id: any) => async (dispatch: AppDispatch) => {
  try {
    // dispatch(setLoading(true));
    const response: any = await appOperation.customer.user_main_wallet(id);
    if (response.success) {
      dispatch(setUserSpotWallet(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {
    // dispatch(setLoading(false));
  }
};

export const getUserSwapWallet = (id: any) => async (dispatch: AppDispatch) => {
  try {
    // dispatch(setLoading(true));
    const response: any = await appOperation.customer.user_main_wallet(id);
    if (response.success) {
      dispatch(setUserSwapWallet(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {
    // dispatch(setLoading(false));
  }
};

export const getUserEarningWallet = (id: any) => async (dispatch: AppDispatch) => {
  try {
    // dispatch(setLoading(true));
    const response: any = await appOperation.customer.user_main_wallet(id);
    if (response.success) {
      dispatch(setUserEarningWallet(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {
    // dispatch(setLoading(false));
  }
};

export const getUserArbitrageWallet = (id: any) => async (dispatch: AppDispatch) => {
  try {
    // dispatch(setLoading(true));
    const response: any = await appOperation.customer.user_main_wallet(id);
    // console.log(response, "getUserArbitrageWallet");
    if (response.success) {
      dispatch(setUserArbitrageWallet(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {
    // dispatch(setLoading(false));
  }
};

export const getUserFuturesWallet = (id: any) => async (dispatch: AppDispatch) => {

  try {
    // dispatch(setLoading(true));
    const response: any = await appOperation.customer.user_main_wallet(id);
    // console.log(response, "getUserFuturesWallet");
    if (response.success) {
      dispatch(setUserFuturesWallet(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {
    // dispatch(setLoading(false));
  }
};

export const getUserOptionsWallet = (id: any) => async (dispatch: AppDispatch) => {
  try {
    // dispatch(setLoading(true));
    const response: any = await appOperation.customer.user_main_wallet(id);
    if (response.success) {
      dispatch(setUserOptionsWallet(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {
    // dispatch(setLoading(false));
  }
};
export const generateAddress =
  (data: GenerateAddressProps) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      dispatch(setWalletAddress(''));
      const response: any = await appOperation.customer.generate_address(data);

      if (response.success) {
        dispatch(setWalletAddress(response?.data));
      } else {
        showError(response?.message);
      }
    } catch (e) {
      logger(e);
    } finally {
      dispatch(setLoading(false));
    }
  };

export const getParticularCoinBalance = (data: { fromWallet: any; toWallet: any; currencyId: any; }) => async (dispatch: AppDispatch) => {
  try {
    // dispatch(setLoading(true));
    const response: any = await appOperation.customer.particular_coin_balance(data);
    if (response.success) {
      dispatch(setParticularCoinBalance(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {
    // dispatch(setLoading(false));
  }
};



export const withdrawCoin =
  (data: WithdrawCurrencyProps & Record<string, unknown>) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      let response: any;
      try {
        response = await appOperation.customer.withdraw_currency_v1(data);
      } catch (err: any) {
        // If v1 returns a specific error (like Passkey required), handle it.
        const msg = String(err?.message || "").toLowerCase();
        if (msg.includes('passkey credential is required') || msg.includes('passkey-withdrawal-challenge') || msg.includes('passkey_credential')) {
          const credential = await dispatch(getWithdrawalPasskeyCredential(false));
          if (!credential) {
            dispatch(setLoading(false));
            return Promise.reject(new Error("PASSKEY_CANCELLED"));
          }
          try {
            response = await appOperation.customer.withdraw_currency_v1({ ...data, passkey_credential: credential });
          } catch (retryErr: any) {
            showError(retryErr?.message || "Withdrawal failed");
            dispatch(setLoading(false));
            return Promise.reject(retryErr);
          }
        } else if (err?.code !== 404 && err?.code !== 405) {
          showError(err?.message || "Withdrawal failed");
          dispatch(setLoading(false));
          return Promise.reject(err);
        } else {
          try {
            response = await appOperation.customer.withdraw_currency(data);
          } catch (err2: any) {
            showError(err2?.message || "Withdrawal failed");
            dispatch(setLoading(false));
            return Promise.reject(err2);
          }
        }
      }

      if (response.success) {
        showSuccess(String(response?.message ?? 'Withdrawal submitted'));
        NavigationService.goBack();
        return Promise.resolve(response);
      } else {
        showError(response?.message);
        return Promise.reject(new Error(response?.message || "Withdrawal failed"));
      }
    } catch (e: any) {
      if (e.message !== "PASSKEY_CANCELLED") {
        logger(e);
        showError((e as any)?.message);
      }
      return Promise.reject(e);
    } finally {
      dispatch(setLoading(false));
    }
  };

export const withdrawFiatCoin =
  (data: WithdrawCurrencyProps) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response: any = await appOperation.customer.withdraw_fiat_currency(data);
      if (response.success) {
        showError(response?.message);
        NavigationService.goBack();
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

export const getAdminBankDetails = () => async (dispatch: AppDispatch) => {
  try {
    const response: any = await appOperation.customer.admin_bank_details();

    if (response.success) {
      dispatch(setAdminBankDetails(response?.data[0]));
    }
  } catch (e) {
    logger(e);
  }
};

export const depositInr = (data: FormData) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response: any = await appOperation.customer.deposit_inr(data);

    if (response.success) {
      showError(response?.message);
      NavigationService.goBack();
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
export const handleTranferCoin = (data: any, setVisible = (p0: boolean) => { }, setAmount = (p0: string) => { }) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response: any = await appOperation.customer.tranfer_coin(data);

    if (response.success) {
      showError(response?.message);
      setVisible(true);
      setAmount('');
      dispatch(getUserDifferentWallet(data?.fromWallet));
      dispatch(getUserDifferentWallet(data?.toWallet));
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


export const swapCurrency =
  (data: any, setVisible = (p0: boolean) => { }, setAmount = (p0: string) => { }) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response = await appOperation.customer.qs_BuySell(data);
      if (response?.success) {
        showError(response?.message);
        dispatch(getSwapCurrencyList());
        setVisible(true);
        setAmount('');
        // dispatch(getTransactionHistory());
      } else {
        // dispatch(setConversion(''));
        showError(response?.message);
      }
    } catch (e) {
      showError(e?.message);
    } finally {
      dispatch(setLoading(false));
    }
  };

export const getWalletHistory = (skip: any, limit: any) => async (dispatch: AppDispatch) => {
  try {
    if (skip === 0) dispatch(clearWalletHistory());
    dispatch(setLoading(true));
    const response: any = await appOperation.customer.wallet_history(skip, limit);
    // console.log(response, 'getWalletHistory');
    if (response.success) {
      dispatch(setWalletHistory(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {
    dispatch(setLoading(false));
  }
};

/** Normalize list from GET spot/v1/me/orders/open (and legacy shapes). */
function spotMeOpenOrdersItemsFromResponse(response: any): any[] {
  const d = response?.data;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(d)) return d;
  return [];
}

export const getOpenOrders = (skip: any, limit: any, tradeType?: string, pair?: string) => async (dispatch: AppDispatch) => {
  try {
    if (skip === 0) dispatch(clearOpenOrders());
    dispatch(setLoading(true));
    const lim = Number(limit) > 0 ? Number(limit) : 10;
    const sk = Number(skip) >= 0 ? Number(skip) : 0;
    const page = Math.floor(sk / lim) + 1;
    let response: any;
    
    if (tradeType === "cross") {
      response = await appOperation.customer.crossOpenOrders({
        page,
        limit: lim,
        pair
      });
    } else if (tradeType === "margin") {
      response = await appOperation.customer.margin_open_orders({
        page,
        limit: lim,
        pair
      });
    } else {
      response = await appOperation.customer.spot_me_orders_open({
        page,
        page_size: lim,
      });
    }
    
    const items = spotMeOpenOrdersItemsFromResponse(response);
    if (response.success) {
      dispatch(setOpenOrders(items));
      dispatch(setCoinData({ open_orders: items }));
    } else {
      dispatch(setOpenOrders([]));
      dispatch(setCoinData({ open_orders: [] }));
    }
  } catch (e) {
    logger(e);
    dispatch(setOpenOrders([]));
    dispatch(setCoinData({ open_orders: [] }));
  } finally {
    dispatch(setLoading(false));
  }
};

// export const getTradeHistory = (data:any) => async (dispatch: AppDispatch) => {
//   try {
//     // dispatch(setLoading(true));
//     const response: any = await appOperation.customer.trade_history(data);

//     if (response.success) {
//       dispatch(setTradeHistory(response?.data));
//     }
//   } catch (e) {
//     logger(e);
//   } finally {
//     // dispatch(setLoading(false));
//   }
// };

export const verifyDeposit = (data: any) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response: any = await appOperation.customer.deposit_verify(data);
    if (response?.success) {
      if (response?.message === "New Transactions Fetched") {
        showError("New deposit fetched");
        // depositHistory("showModal")
        if (data?.status === "checkPayment") {
          // setCheckDepositStatus(false)
          appOperation.customer.transfer_funds(response?.data)
        }
      } else {
        if (data?.status === "checkPayment") {
          showError("New deposit not found. Please check after some time.");
        }
      }
    }

  } catch (e) {
    logger(e);
  } finally {
    dispatch(setLoading(false));
  }
};

export const verifyWithdraw = (data: any) => async (dispatch: AppDispatch) => {
  try {
    // dispatch(setLoading(true));
    const response: any = await appOperation.customer.verify_withdraw(data);
    // console.log(response, '===verifyWithdraw');
    if (response?.success) {
      dispatch(setWithdrawHistory(response?.data));
    }
  } catch (e) {
    logger(e);
    showError(e?.message);
  } finally {
    // dispatch(setLoading(false));
  }
};

export const subscribeEarningPackage = (data: any, setVisible = (p0: boolean) => { }) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response: any = await appOperation.customer.subscribe_earning_package(data);
    // console.log(response, '===verifyWithdraw');
    if (response?.success) {
      showError(response?.message);
      setVisible(true);
      dispatch(getEarningPortfolio());
      dispatch(getSubscribedPackageList());
      // dispatch(setWithdrawHistory(response?.data));
    }
  } catch (e) {
    logger(e);
    showError(e?.message);
  } finally {
    dispatch(setLoading(false));
  }
};

export const butBotPackage = (data: any) => async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response: any = await appOperation.customer.buy_bot_package(data);
    // console.log(response, '===verifyWithdraw');
    if (response?.success) {
      showError(response?.message);
      NavigationService.navigate(Dashboard_Inner);
    }
  } catch (e) {
    logger(e);
    showError(e?.message);
  } finally {
    dispatch(setLoading(false));
  }
};

export const withdrawInr =
  (data: WithdrawInrProps) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response: any = await appOperation.customer.withdraw_inr(data);
      // console.log('res', response);
      showError(response?.message);
      if (response?.success) {
        NavigationService.goBack();
      }
    } catch (e) {
      logger(e);
      showError(e?.message);
    } finally {
      dispatch(setLoading(false));
    }
  };

export const getTransactionHistory =
  (id: string) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response: any = await appOperation.customer.transaction_history(id);

      if (response.success) {
        dispatch(setTransactionHistory(response?.data));
      }
    } catch (e) {
      logger(e);
    } finally {
      dispatch(setLoading(false));
    }
  };

export const getBotActivePackages =
  () => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response: any = await appOperation.customer.get_bot_active_packages();

      if (response.success) {
        dispatch(setBotActiveList(response?.data[0]));
        if (response?.data?.length > 0) {
          NavigationService.navigate(Dashboard_Inner)
        }

      }
    } catch (e) {
      logger(e);
    } finally {
      dispatch(setLoading(false));
    }
  };

export const getBotTrades =
  () => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response: any = await appOperation.customer.get_bot_trade();

      if (response.success) {
        dispatch(setBotTradeData(response?.data));
        const total = response?.data.reduce((sum: any, trade: any) => {
          const profit = parseFloat(trade.profit) || 0;
          return sum + profit;
        }, 0);
        dispatch(setTotalProfit(total?.toFixed(2) || 0));
      }
    } catch (e) {
      logger(e);
    } finally {
      dispatch(setLoading(false));
    }
  };



export const getCoinDetails =
  (data: any, type: any, balance: any) => async (dispatch: AppDispatch) => {
    try {
      dispatch(setLoading(true));
      const response: any = await appOperation.customer.coin_details(data);
      if (response.success) {
        dispatch(setCoinDetails(response?.data));
        if (type == "deposit") {
          if (response?.data?.deposit_status === 'ACTIVE') {
            NavigationService.navigate(DEPOSIT_SCREEN, { walletDetail: response?.data });
          } else {
            showError('Deposit is Disable for Now');
          }
        } else if (type == "withdraw") {
          if (response?.data?.withdrawal_status === 'ACTIVE') {

            NavigationService.navigate(WITHDRAW_SCREEN, { walletDetail: response?.data, balance: balance });
          } else {
            showError('Withdrawal is Disable for Now');
          }
        }

      }
    } catch (e) {
      logger(e);
    } finally {
      dispatch(setLoading(false));
    }
  };


export const getPackageList = () => async (dispatch: AppDispatch) => {
  dispatch(setLoading(true));
  try {
    const response: any = await appOperation.customer.package_list();
    if (response.success) {
      if (!response?.data || response?.data?.length === 0) {
        dispatch(setPackageList([]));
        return;
      } else {
        const transformed = transformCurrencyDataWithDistribution(response?.data);
        dispatch(setPackageList(transformed));
      }

      // console.log(filteredPackageList, "filteredPackageList");
    }
  } catch (e) {
    logger(e);
  } finally {
    dispatch(setLoading(false));
  }
};

export const getBotPackageList = () => async (dispatch: AppDispatch) => {
  dispatch(setLoading(true));
  try {
    const response: any = await appOperation.customer.bot_package_list();
    if (response.success) {
      dispatch(setBotPackageList(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {
    dispatch(setLoading(false));
  }
};

export const getUserPayList = () => async (dispatch: AppDispatch) => {
  dispatch(setLoading(true));
  try {
    const response: any = await appOperation.customer.user_payout_list();
    if (response.success) {
      dispatch(setUserPayoutList(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {
    dispatch(setLoading(false));
  }
};

export const getEarningPortfolio = () => async (dispatch: AppDispatch) => {
  dispatch(setLoading(true));
  try {
    const response: any = await appOperation.customer.earning_portfolio();
    if (response.success) {
      dispatch(setEarningPortfolio(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {
    dispatch(setLoading(false));
  }
};

export const getEarningPortfolioSummary = () => async (dispatch: AppDispatch) => {
  try {
    const response: any = await appOperation.customer.earning_portfolio_summary();
    if (response?.success) {
      dispatch(setEarningPortfolioSummary(response?.data));
    }
  } catch (e) {
    logger(e);
  }
};

export const getSubscribedPackageList = () => async (dispatch: AppDispatch) => {
  dispatch(setLoading(true));
  try {
    const response: any = await appOperation.customer.subscribed_packageList();
    if (response.success) {
      let completedPackage = response?.data?.filter((item: { status: string; }) => item?.status === "COMPLETED")
      let activePackage = response?.data?.filter((item: { status: string; }) => item?.status === "ACTIVE")
      let cancelledPackage = response?.data?.filter((item: { status: string; }) => item?.status === "CANCELLED")
      dispatch(setSubscribedActivePackages(activePackage));
      dispatch(setSubscribedCompletePackages(completedPackage));
      dispatch(setSubscribedCancelPackages(cancelledPackage));
    }
  } catch (e) {
    logger(e);
  } finally {
    dispatch(setLoading(false));
  }
};


export const getWalletBalance = (fromWallet: any, currencyId: any) => async (dispatch: AppDispatch) => {
  dispatch(setLoading(true));
  try {
    const response: any = await appOperation.customer.get_wallet_balance(fromWallet, currencyId);
    if (response.success) {
      dispatch(setEarnWalletBal(response?.data?.balance));
      dispatch(setLoading(false));
    }
  } catch (e) {
    logger(e);
  } finally {
    dispatch(setLoading(false));
  }
};

export const getWalletType = () => async (dispatch: AppDispatch) => {
  dispatch(setLoading(true));
  try {
    const response: any = await appOperation.customer.get_wallet_type();
    if (response.success) {
      dispatch(setWalletTypes(response?.data));
    }
  } catch (e) {
    logger(e);
  } finally {
    dispatch(setLoading(false));
  }
};
