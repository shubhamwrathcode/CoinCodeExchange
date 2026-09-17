import {createSlice} from '@reduxjs/toolkit';
import isEqual from 'lodash/isEqual';
import {WalletSliceProps} from '../helper/types';
export const initialState: WalletSliceProps = {
  walletBalance: 0,
  walletBalanceMain: 0,
  walletBalanceSpot: 0,
  walletBalanceSwap: 0,
  walletBalanceEarning: 0,
  walletBalanceArbitrage: 0,
  walletBalanceFutures: 0,
  walletBalanceOptions: 0,
  depositActiveCoins: undefined,
  withdrawActiveCoins: undefined,
  depositFiatCoins: undefined,
  packageList: [],
  userWallet: [],
  userMainWallet: [],
  userSpotWallet: [],
  userSwapWallet: [],
  userEarningWallet: [],
  userArbitrageWallet: [],
  userOptionsWallet: [],
  userFuturesWallet: [], 
  walletAddress: '',
  adminBankDetails: undefined,
  walletHistory: [],
  tradeHistory: [],
  selectedWalletHistory: undefined,
  selectedTradeHistory: undefined,
  transactionHistory: [],
  depositHistory: [],
  withdrawHistory: [],
  coinDetails: [],
  walletTypes: [],
  particularCoinBalance: undefined,
  userPayoutList: [],
  earnWalletBal: undefined,
  subscribedActivePackages: [],
  subscribedCompletePackages: [],
  subscribedCancelPackages: [],
  botPackageList: [],
  botActiveList: [],
  botTradeData: [],
  totalProfit: undefined,
  earningPortfolio: [],
  earningPortfolioSummary: {},
  adminTradeList: [],
  swapHistoryList: [],
  interalWalletHistory: [],
  swapCurrencyList: [],
  swapConversionRate: undefined,
};

export const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setWalletBalance: (state, {payload}) => {
      state.walletBalance = payload;
    },
    setWalletBalanceMain: (state, {payload}) => {
      state.walletBalanceMain = payload;
    },
    setWalletBalanceSpot: (state, {payload}) => {
      state.walletBalanceSpot = payload;
    },
    setWalletBalanceSwap: (state, {payload}) => {
      state.walletBalanceSwap = payload;
    },
    setWalletBalanceEarning: (state, {payload}) => {
      state.walletBalanceEarning = payload;
    },
    setWalletBalanceArbitrage: (state, {payload}) => {
      state.walletBalanceArbitrage = payload;
    },
    setUserWallet: (state, {payload}) => {
      state.userWallet = payload;
    },  
    setWalletBalanceFutures: (state, {payload}) => {
      state.walletBalanceFutures = payload;
    },
    setWalletBalanceOptions: (state, {payload}) => {
      state.walletBalanceOptions = payload;
    },
    setUserMainWallet: (state, {payload}) => {
      state.userMainWallet = payload;
    },
    setUserSpotWallet: (state, {payload}) => {
      state.userSpotWallet = payload;
    },
    setUserSwapWallet: (state, {payload}) => {
      state.userSwapWallet = payload;
    },
    setUserEarningWallet: (state, {payload}) => {
      state.userEarningWallet = payload;
    },
    setUserArbitrageWallet: (state, {payload}) => {
      state.userArbitrageWallet = payload;
    },
    setUserOptionsWallet: (state, {payload}) => {
      state.userOptionsWallet = payload;
    },
    setUserFuturesWallet: (state, {payload}) => {
      state.userFuturesWallet = payload;
    },
    setDepositActiveCoins: (state, {payload}) => {
      state.depositActiveCoins = payload;
    },
    setWithdrawActiveCoins: (state, {payload}) => {
      state.withdrawActiveCoins = payload;
    },
    setDepositFiatCoins: (state, {payload}) => {
      state.depositFiatCoins = payload;
    },
    setWalletAddress: (state, {payload}) => {
      state.walletAddress = payload;
    },
    setPackageList: (state, {payload}) => {
      state.packageList = payload;
    },
    setUserPayoutList: (state, {payload}) => {
      state.userPayoutList = payload;
    },
    setAdminBankDetails: (state, {payload}) => {
      state.adminBankDetails = payload;
    },
    setWalletHistory: (state, {payload}) => {
      state.walletHistory = payload ?? [];
    },
    clearWalletHistory: (state) => {
      state.walletHistory = null;
    },
    setTradeHistory: (state, {payload}) => {
      const next = payload ?? [];
      if (!isEqual(state.tradeHistory, next)) {
        state.tradeHistory = next;
      }
    },
    clearTradeHistory: (state) => {
      state.tradeHistory = null;
    },
    setSelectedWalletHistory: (state, {payload}) => {
      state.selectedWalletHistory = payload;
    },
    setSelectedTradeHistory: (state, {payload}) => {
      state.selectedTradeHistory = payload;
    },
    setTransactionHistory: (state, {payload}) => {
      state.transactionHistory = payload;
    },
    setDepositHistory: (state, {payload}) => {
      state.depositHistory = payload;
    },
    setWithdrawHistory: (state, {payload}) => {
      state.withdrawHistory = payload;
    },
    setCoinDetails: (state, {payload}) => {
      state.coinDetails = payload;
    },
    setWalletTypes: (state, {payload}) => {
      state.walletTypes = payload;
    },
    setParticularCoinBalance: (state, {payload}) => {
      state.particularCoinBalance = payload;
    },
    setEarnWalletBal: (state, {payload}) => {
      state.earnWalletBal = payload;
    },
    setSubscribedActivePackages: (state, {payload}) => {
      state.subscribedActivePackages = payload;
    },
    setSubscribedCompletePackages: (state, {payload}) => {
      state.subscribedCompletePackages = payload;
    },
    setSubscribedCancelPackages: (state, {payload}) => {
      state.subscribedCancelPackages = payload;
    },
    setBotPackageList: (state, {payload}) => {
      state.botPackageList = payload;
    },
    setBotActiveList: (state, {payload}) => {
      state.botActiveList = payload;
    },
    setBotTradeData: (state, {payload}) => {
      state.botTradeData = payload;
    },
    setTotalProfit: (state, {payload}) => {
      state.totalProfit = payload;
    },
    setEarningPortfolio: (state, {payload}) => {
      state.earningPortfolio = payload;
    },
    setEarningPortfolioSummary: (state, {payload}) => {
      state.earningPortfolioSummary = payload || {};
    },
    setAdminTradeList: (state, {payload}) => {
      state.adminTradeList = payload ?? [];
    },
    clearAdminTradeList: (state) => {
      state.adminTradeList = null;
    },
    setSwapHistoryList: (state, {payload}) => {
      state.swapHistoryList = payload ?? [];
    },
    clearSwapHistoryList: (state) => {
      state.swapHistoryList = null;
    },
    setInteralWalletHistory: (state, {payload}) => {
      state.interalWalletHistory = payload ?? [];
    },
    clearInteralWalletHistory: (state) => {
      state.interalWalletHistory = null;
    },
    setSwapCurrencyList: (state, {payload}) => {
      state.swapCurrencyList = payload;
    },
    setSwapConversionRate: (state, {payload}) => {
      state.swapConversionRate = payload;
    },
    
  },
});
export const {
  setWalletBalance,
  setWalletBalanceMain,
  setWalletBalanceSpot,
  setWalletBalanceSwap,
  setWalletBalanceEarning,
  setWalletBalanceArbitrage,
  setWalletBalanceFutures,
  setWalletBalanceOptions,
  setUserWallet,
  setWalletAddress,
  setAdminBankDetails,
  setWalletHistory,
  clearWalletHistory,
  setTradeHistory,
  clearTradeHistory,
  setSelectedWalletHistory,
  setSelectedTradeHistory,
  setTransactionHistory,
  setDepositHistory,
  setWithdrawHistory,
  setCoinDetails,
  setDepositFiatCoins,
  setDepositActiveCoins,
  setWithdrawActiveCoins,
  setUserMainWallet,
  setUserSpotWallet,
  setUserSwapWallet,
  setUserEarningWallet,
  setUserArbitrageWallet,
  setUserOptionsWallet,
  setUserFuturesWallet,
  setPackageList,
  setWalletTypes,
  setUserPayoutList,
  setParticularCoinBalance,
  setEarnWalletBal,
  setSubscribedActivePackages,
  setSubscribedCompletePackages,
  setSubscribedCancelPackages,
  setBotPackageList,
  setBotActiveList,
  setBotTradeData,
  setEarningPortfolio,
  setEarningPortfolioSummary,
  setTotalProfit,
  setAdminTradeList,
  clearAdminTradeList,
  setSwapHistoryList,
  clearSwapHistoryList,
  setInteralWalletHistory,
  clearInteralWalletHistory,
  setSwapCurrencyList,
  setSwapConversionRate
} = walletSlice.actions;
export const walletReducer = walletSlice.reducer;
