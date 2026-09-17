import {createSlice} from '@reduxjs/toolkit';
import _ from 'lodash';
import {CoinDataProps, HomeSliceProps} from '../helper/types';
import {getDaysAgoData} from '../helper/utility';
import isEqual from "lodash/isEqual";

export const initialState: HomeSliceProps = {
  bannerList: [],
  hotCoins: [],
  newListedCoins: [],
  coinPairs: [],
  hotPairsChart: {},
  currency: '',
  coinData: [],
  spotSelectedPair: null,
  futuresSelectedPair: null,
  coinBalance: {},
  spotOpenOrders: [],
  favorites: [],
  notificationList: [],
  referCode: undefined,
  referCount: 0,
  socketLoading: true,
  crossAccount: undefined,
  crossBorrowable: undefined,
  favoriteArray: [],
  favoriteArrayLoaded: false,
  openOrders: [],
  pastOrders: [],
  fiveDaySymbolData: [],
  oneMonthSymbolData: [],
  ThreeMonthSymbolData: [],
  oneYearSymbolData: [],
  fiveYearSymbolData: [],
  socket: undefined,
  futuresData: undefined,
  feeDetails: undefined,
  buyOrders: [],
  sellOrders: [],
  orderData: undefined,
  futureOrders: {
    openOrders: [],
    ordersHistory: [],
    closePositions: [],
    tradeHistory: [],
  },
  futurePositions: [],
  recentTrades: [],
  random: 1,
  twoFaQrData: undefined,
  conversionHistory: [],
  conversion: '',
  coinList: [],
  futuresPairs: [],
  qbsHistory:[],
  lakedHistory:[],
  stakingHistory:[],
  userEligibility: [],
  allProjectsList: [],
  checkCommitExistense: [],
  userCommitProject: [],
  pastAllProjects: [],
  userCommits: [],
  singleProject: [],
  userProjectTotalCommit: [],
  userProjectUpdateCommit: [],
  commitDetails: [],
  activityLogs: [],
  referralList: [],
  memeList: [],
  payoutHistory: [],
  treeRoot: [],
  flatInvestments: [],
  userTickets: [],
  ticketChats: [],
};
export const homeSlice = createSlice({
  name: 'home',
  initialState,
  reducers: {
    setBannerList: (state, {payload}) => {
      state.bannerList = payload;
    },
    setCoinData: (state, {payload}) => {
      const hasMarketData =
        payload?.pairs !== undefined ||
        payload?.hot !== undefined ||
        payload?.new_listed !== undefined;

      if (hasMarketData) {
        const newCoinPairs = payload?.pairs?.filter((e: CoinDataProps) => {
          return e.quote_currency;
        }) || [];

        const newHotCoins = payload?.hot?.filter((e: CoinDataProps) => {
          return e.quote_currency;
        }) || [];

        const newListedCoins = payload?.new_listed?.filter((e: CoinDataProps) => {
          return e.quote_currency;
        }) || [];

        if (!isEqual(state.coinPairs, newCoinPairs)) {
          state.coinPairs = newCoinPairs;
        }
        if (!isEqual(state.hotCoins, newHotCoins)) {
          state.hotCoins = newHotCoins;
        }
        if (!isEqual(state.newListedCoins, newListedCoins)) {
          state.newListedCoins = newListedCoins;
        }

        const allCoins = [].concat(
          newHotCoins,
          newListedCoins,
          newCoinPairs,
        );
        const uniqueCoins = _.uniqWith(allCoins, _.isEqual);
        const filteredCoins = uniqueCoins.filter((e: CoinDataProps) => {
          return e;
        });
        if (!isEqual(state.coinData, filteredCoins)) {
          state.coinData = filteredCoins;
        }
      }

      if (payload?.balance && Object.keys(payload.balance).length > 0) {
        if (!isEqual(state.coinBalance, payload.balance)) {
          state.coinBalance = { ...state.coinBalance, ...payload.balance };
        }
      }
      if (Array.isArray(payload?.open_orders) && payload.open_orders.length > 0) {
        if (!isEqual(state.spotOpenOrders, payload.open_orders)) {
          state.spotOpenOrders = payload.open_orders;
          state.openOrders = payload.open_orders;
        }
      }
      if (Array.isArray(payload?.buy_order)) {
        if (!isEqual(state.buyOrders, payload.buy_order)) {
          state.buyOrders = payload.buy_order;
        }
      }
      if (Array.isArray(payload?.sell_order)) {
        if (!isEqual(state.sellOrders, payload.sell_order)) {
          state.sellOrders = payload.sell_order;
        }
      }
      // Order history (executed_order) - same as web exchangeData.executed_order
      // Order history (executed_order) - UPSERT logic to prevent blinking
      if (Array.isArray(payload?.executed_order) && payload.executed_order.length > 0) {
        const existing = Array.isArray(state.pastOrders) ? [...state.pastOrders] : [];
        const newItems = payload.executed_order;
        
        newItems.forEach(newItem => {
          const newId = String(newItem?._id || newItem?.id || newItem?.order_id || "");
          if (!newId) return;
          const idx = existing.findIndex(ex => String(ex?._id || ex?.id || ex?.order_id || "") === newId);
          if (idx > -1) {
            existing[idx] = { ...existing[idx], ...newItem };
          } else {
            existing.unshift(newItem);
          }
        });
        state.pastOrders = existing;
      }
      // Mobile socket executed_trades - UPSERT logic
      if (!Array.isArray(payload?.executed_order) && Array.isArray(payload?.executed_trades) && payload.executed_trades.length > 0) {
        const existing = Array.isArray(state.pastOrders) ? [...state.pastOrders] : [];
        const newItems = payload.executed_trades;

        newItems.forEach(newItem => {
          const newId = String(newItem?._id || newItem?.id || newItem?.order_id || "");
          if (!newId) return;
          const idx = existing.findIndex(ex => String(ex?._id || ex?.id || ex?.order_id || "") === newId);
          if (idx > -1) {
            existing[idx] = { ...existing[idx], ...newItem };
          } else {
            existing.unshift(newItem);
          }
        });
        state.pastOrders = existing;
      }
      if (Array.isArray(payload?.recent_trades)) {
        if (!isEqual(state.recentTrades, payload.recent_trades)) {
          state.recentTrades = payload.recent_trades;
        }
      }
    },
    setFavorites: (state, {payload}) => {
      state.favorites = payload;
    },
    setMemeList: (state, {payload}) => {
      state.memeList = payload;
    },
    setNotificationList: (state, {payload}) => {
      state.notificationList = payload;
    },
    setReferCode: (state, {payload}) => {
      state.referCode = payload;
    },
    setReferCount: (state, {payload}) => {
      state.referCount = payload;
    },
    setSocketLoading: (state, {payload}) => {
      state.socketLoading = payload;
    },
    setCrossAccount: (state, {payload}) => {
      state.crossAccount = payload;
    },
    setCrossBorrowable: (state, {payload}) => {
      if (!state.crossBorrowable) {
        state.crossBorrowable = {};
      }
      state.crossBorrowable[payload.currency_id] = payload.data;
    },
    setFavoriteArray: (state, {payload}) => {
      state.favoriteArray = payload;
    },
    setFavoriteArrayLoaded: (state, {payload}) => {
      state.favoriteArrayLoaded = payload;
    },
    setOpenOrders: (state, {payload}) => {
      const next = payload ?? [];
      if (!isEqual(state.spotOpenOrders, next)) {
        state.openOrders = next;
        state.spotOpenOrders = next;
      }
    },
    clearOpenOrders: (state) => {
      state.openOrders = [];
      state.spotOpenOrders = [];
    },
    setPastOrders: (state, {payload}) => {
      const next = payload ?? [];
      if (!isEqual(state.pastOrders, next)) {
        state.pastOrders = next;
      }
    },
    onCancelOrder: (state, {payload}) => {
      const targetId = String(payload || "");
      if (Array.isArray(state.openOrders)) {
        state.openOrders = state.openOrders.filter(e => String(e?._id || e?.id || "") !== targetId);
      }
      if (Array.isArray(state.spotOpenOrders)) {
        state.spotOpenOrders = state.spotOpenOrders.filter(e => String(e?._id || e?.id || "") !== targetId);
      }
    },
    setHistoricData: (state, {payload}) => {
      state.openOrders = payload;
      state.fiveDaySymbolData = getDaysAgoData(payload, 5);
      state.oneMonthSymbolData = getDaysAgoData(payload, 30);
      state.ThreeMonthSymbolData = getDaysAgoData(payload, 90);
      state.oneYearSymbolData = getDaysAgoData(payload, 365);
      state.fiveYearSymbolData = getDaysAgoData(payload, 9999);
    },
    setSocket: (state, {payload}) => {
      state.socket = payload;
    },
    setFeeDetails: (state, {payload}) => {
      state.feeDetails = payload;
    },
    setFuturesData: (state, {payload}) => {
      state.futuresData = payload;
    },
    setBuyOrders: (state, {payload}) => {
      state.buyOrders = payload;
    },
    setSellOrders: (state, {payload}) => {
      state.sellOrders = payload;
    },
    setOrderData: (state, {payload}) => {
      state.orderData = payload;
    },
    setFutureOrders: (state, {payload}) => {
      state.futureOrders = payload;
    },
    setFuturePositions: (state, {payload}) => {
      state.futurePositions = payload;
    },
    setRandom: (state, {payload}) => {
      state.random = payload;
    },
    setTwoFaData: (state, {payload}) => {
      state.twoFaQrData = payload;
    },
    setConversionHistory: (state, {payload}) => {
      state.conversionHistory = payload;
    },
    setConversion: (state, {payload}) => {
      state.conversion = payload;
    },
    setCoinList: (state, {payload}) => {
      state.coinList = payload;
    },
    setCurrency: (state, {payload}) => {
      state.currency = payload;
    },
    setQbsHistory: (state, {payload}) => {
      state.qbsHistory = payload;
    },
    setStaking: (state, {payload}) => {
      state.stakingHome = payload;
    },
    setLakedStaking: (state, {payload}) => {
      state.lakedHistory = payload;
    },
    setStakingHistory: (state, {payload}) => {
      state.stakingHistory = payload;
    },
    setP2P: (state, {payload}) => {
      state.p2p = payload;
    },
    setUserEligibility: (state, {payload}) => {
      state.userEligibility = payload;
    },
    setAllProjectList: (state, {payload}) => {
      state.allProjectsList = payload;
    },
    setCheckCommitExistense: (state, {payload}) => {
      state.checkCommitExistense = payload;
    },
    setUserCommitProject: (state, {payload}) => {
      state.userCommitProject = payload;
    },
    setPastAllProjects: (state, {payload}) => {
      state.pastAllProjects = payload;
    },
    setUserCommits: (state, {payload}) => {
      state.userCommits = payload;
    },
    setSingleProject: (state, {payload}) => {
      state.singleProject = payload;
    },
    setUserProjectTotalCommit: (state, {payload}) => {
      state.userProjectTotalCommit = payload;
    },
    setUserProjectUpdateCommit: (state, {payload}) => {
      state.userProjectUpdateCommit = payload;
    },
    setCommitDetails: (state, {payload}) => {
      state.commitDetails = payload;
    },
    setActivityLogs: (state, {payload}) => {
      state.activityLogs = payload;
    },
    setReferralList: (state, {payload}) => {
      state.referralList = payload;
    },
    setPayoutHistory: (state, {payload}) => {
      state.payoutHistory = payload;
    },
    setTreeRoot: (state, {payload}) => {
      state.treeRoot = payload;
    },
    setFlatInvestments: (state, {payload}) => {
      state.flatInvestments = payload;
    },
    setUserTickets: (state, {payload}) => {
      state.userTickets = payload;
    },
    setTicketChats: (state, {payload}) => {
      state.ticketChats = payload;
    },
    setFuturesPairs: (state, {payload}) => {
      state.futuresPairs = Array.isArray(payload) ? payload : [];
    },
    setHotPairsChart: (state, {payload}) => {
      if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        state.hotPairsChart = payload;
      }
    },
    setSpotSelectedPair: (state, {payload}) => {
      state.spotSelectedPair = payload ?? null;
    },
    setFuturesSelectedPair: (state, {payload}) => {
      state.futuresSelectedPair = payload ?? null;
    },
    setRecentTrades: (state, {payload}) => {
      state.recentTrades = payload;
    },
  },
});
export const {
  setBannerList,
  setCoinData,
  setFavorites,
  setNotificationList,
  setReferCode,
  setReferCount,
  setSocketLoading,
  setCrossAccount,
  setCrossBorrowable,
  setFavoriteArray,
  setFavoriteArrayLoaded,
  setOpenOrders,
  clearOpenOrders,
  setPastOrders,
  onCancelOrder,
  setHistoricData,
  setSocket,
  setFeeDetails,
  setBuyOrders,
  setSellOrders,
  setOrderData,
  setFutureOrders,
  setFuturePositions,
  setRandom,
  setTwoFaData,
  setConversionHistory,
  setConversion,
  setCoinList,
  setFuturesPairs,
  setHotPairsChart,
  setSpotSelectedPair,
  setFuturesSelectedPair,
  setCurrency,
  setQbsHistory,
  setStaking,
  setLakedStaking,
  setStakingHistory,
  setP2P,
  setUserEligibility,
  setAllProjectList,
  setCheckCommitExistense,
  setUserCommitProject,
  setPastAllProjects,
  setUserCommits,
  setSingleProject,
  setUserProjectTotalCommit,
  setUserProjectUpdateCommit,
  setCommitDetails,
  setActivityLogs,
  setReferralList,
  setMemeList,
  setPayoutHistory,
  setTreeRoot,
  setFlatInvestments,
  setUserTickets,
  setTicketChats,
  setRecentTrades,
  setFuturesData
} = homeSlice.actions;
export const homeReducer = homeSlice.reducer;
