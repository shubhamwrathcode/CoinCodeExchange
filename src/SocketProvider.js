import React, {
  createContext,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useState,
} from "react";
import { AppState } from "react-native";
import { useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  setCoinData,
  setFuturesPairs,
  setHotPairsChart,
  setRandom,
  setSocket,
  setSocketLoading,
  setFuturesData
} from "./slices/homeSlice";
import { setLoading } from "./slices/authSlice";
import { socketService } from "./services/socket/SocketService";
import { normalizeOrderbookOrders } from "./helper/futuresUtils";
import { USER_TOKEN_KEY } from "./helper/Constants";

export const SocketContext = createContext(null);

// Web-style flow: market:subscribe → market:update, exchange:subscribe → exchange:update (no polling)
// Market subscription uses per-screen "interest" keys so blur/unsubscribe optimisations on one
// screen (Market, Spot, Futures…) do not cancel another screen's subscription (e.g. Home).

export const SocketProvider = ({ children }) => {
  const dispatch = useDispatch();
  const futuresDataRef = useRef(null);
  const [futuresPrice, setFuturesPrice] = useState(null);
  const [exchangeData, setExchangeData] = useState(null);
  const pendingSubscriptions = useRef({
    market: false,
    exchange: null,
    futures: null,
  });
  const currentExchangeSubscription = useRef(null);
  const isMarketSubscribed = useRef(false);
  const currentFuturesSubscription = useRef(null);
  const resubscribePendingRef = useRef(() => {});
  const marketInterestRef = useRef(new Set());

  const subscribeToMarket = useCallback((sourceOrForce = "default", forceArg = false) => {
    let source = "default";
    let force = false;
    if (sourceOrForce === true) {
      force = true;
    } else if (typeof sourceOrForce === "string") {
      source = sourceOrForce;
      force = Boolean(forceArg);
    }

    const hadInterest = marketInterestRef.current.size > 0;
    marketInterestRef.current.add(source);
    pendingSubscriptions.current.market = true;

    if (force) {
      isMarketSubscribed.current = false;
    }

    const shouldEmit =
      force ||
      !isMarketSubscribed.current ||
      (!hadInterest && marketInterestRef.current.size > 0);

    if (shouldEmit && socketService.getSocket()?.connected) {
      isMarketSubscribed.current = true;
      socketService.emit("market:subscribe");
    }
  }, []);

  const unsubscribeFromMarket = useCallback((sourceOrForce = "default") => {
    const source = sourceOrForce === true ? "default" : String(sourceOrForce || "default");
    marketInterestRef.current.delete(source);
    if (marketInterestRef.current.size > 0) {
      return;
    }
    pendingSubscriptions.current.market = false;
    if (!isMarketSubscribed.current) return;
    isMarketSubscribed.current = false;
    if (socketService.getSocket()?.connected) {
      socketService.emit("market:unsubscribe");
    }
  }, []);

  const subscribeToExchange = useCallback((baseCurrencyId, quoteCurrencyId, extraParams = {}) => {
    if (!baseCurrencyId || !quoteCurrencyId) {
      return;
    }
    const tradeType = extraParams.tradeType || "spot";
    const subKey = `${baseCurrencyId}-${quoteCurrencyId}-${tradeType}`;
    if (currentExchangeSubscription.current === subKey) {
      return;
    }
    currentExchangeSubscription.current = subKey;
    const payload = {
      base_currency_id: baseCurrencyId,
      quote_currency_id: quoteCurrencyId,
      limit: 20,
      ...extraParams,
    };
    pendingSubscriptions.current.exchange = payload;
    if (socketService.getSocket()?.connected) {
      socketService.emit("exchange:subscribe", payload);
    }
  }, []);

  const unsubscribeFromExchange = useCallback((baseCurrencyId, quoteCurrencyId) => {
    currentExchangeSubscription.current = null;
    pendingSubscriptions.current.exchange = null;
    if (socketService.getSocket()?.connected && baseCurrencyId != null && quoteCurrencyId != null) {
      socketService.emit("exchange:unsubscribe", {
        base_currency_id: baseCurrencyId,
        quote_currency_id: quoteCurrencyId,
      });
    }
  }, []);

  const subscribeToFutures = useCallback((payload = {}) => {
    let subKey = "all";
    if (typeof payload === "string") {
      subKey = payload;
    } else if (payload && payload.symbol) {
      subKey = payload.symbol;
    } else if (payload && payload.base_currency_id) {
      subKey = payload.base_currency_id;
    } else if (Object.keys(payload).length > 0) {
      subKey = JSON.stringify(payload);
    }

    if (currentFuturesSubscription.current === subKey) return;
    currentFuturesSubscription.current = subKey;
    pendingSubscriptions.current.futures = payload;

    if (socketService.getSocket()?.connected) {
      socketService.emit('futures:subscribe', payload);
    }
  }, []);

  const unsubscribeFromFutures = useCallback((payload = {}) => {
    currentFuturesSubscription.current = null;
    pendingSubscriptions.current.futures = null;
    if (socketService.getSocket()?.connected) {
      socketService.emit('futures:unsubscribe', payload);
    }
  }, []);

  const resubscribePending = useCallback(() => {
    const socket = socketService.getSocket();
    if (!socket?.connected) return;

    if (pendingSubscriptions.current.market) {
      isMarketSubscribed.current = true;
      socketService.emit("market:subscribe");
    }
    if (pendingSubscriptions.current.exchange) {
      const exchangePayload = pendingSubscriptions.current.exchange;
      currentExchangeSubscription.current = null;
      subscribeToExchange(
        exchangePayload.base_currency_id,
        exchangePayload.quote_currency_id,
        exchangePayload
      );
    }
    if (pendingSubscriptions.current.futures != null) {
      currentFuturesSubscription.current = null;
      subscribeToFutures(pendingSubscriptions.current.futures);
    }
  }, [subscribeToExchange, subscribeToFutures]);

  resubscribePendingRef.current = resubscribePending;

  const [socketHandlersReady, setSocketHandlersReady] = useState(false);

  const setFuturesHistoryTab = useCallback((tab, skip = 0, limit = 50) => {
    if (socketService.getSocket()?.connected) {
      console.log("Futures set history tab");

      socketService.emit('futures:set_history_tab', {
        tab,
        skip: Math.max(0, skip),
        limit: Math.min(100, Math.max(1, limit))
      });
    }
  }, []);

  const handlersRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let marketThrottleTimer = null;
    let exchangeThrottleTimer = null;
    let futuresThrottleTimer = null;

    const setup = async () => {
      const token = await AsyncStorage.getItem(USER_TOKEN_KEY).catch(() => null);
      if (cancelled) return;
      // Connect with auth token so backend sends open_orders & executed_order (match web)
      const socket = socketService.connect(undefined, token || undefined);

      const handleConnect = () => {
        if (cancelled) return;
        dispatch(setSocket(socketService.getSocket()));
        dispatch(setRandom(Math.random()));
        dispatch(setLoading(false));
        resubscribePendingRef.current();
      };

      const handleDisconnect = () => {
        isMarketSubscribed.current = false;
        currentExchangeSubscription.current = null;
        currentFuturesSubscription.current = null;
      };

      let lastMarketFlush = 0;
      let pendingMarketData = null;
      const MARKET_THROTTLE_MS = 1000;

      const flushMarketData = () => {
        if (!pendingMarketData) return;
        const data = pendingMarketData;
        pendingMarketData = null;
        lastMarketFlush = Date.now();

        const hot = data?.hot ?? (data?.hot_pairs_chart ? Object.values(data.hot_pairs_chart) : []);
        const payload = {
          pairs: data?.pairs ?? [],
          hot: Array.isArray(hot) ? hot : [],
          new_listed: data?.new_listed ?? [],
        };
        dispatch(setCoinData(payload));
        if (data?.hot_pairs_chart && typeof data.hot_pairs_chart === "object") {
          dispatch(setHotPairsChart(data.hot_pairs_chart));
        }
        const futuresList = data?.futures_pairs ?? data?.futuresPairs ?? null;
        if (futuresList != null && Array.isArray(futuresList)) {
          dispatch(setFuturesPairs(futuresList));
        }
        dispatch(setSocketLoading(false));
        dispatch(setLoading(false));
      };

      const handleMarketUpdate = (data) => {
        if (!pendingSubscriptions.current.market) return;
        isMarketSubscribed.current = true;
        pendingMarketData = data;
        const now = Date.now();
        const elapsed = now - lastMarketFlush;

        if (elapsed >= MARKET_THROTTLE_MS || lastMarketFlush === 0) {
          flushMarketData();
          if (marketThrottleTimer) {
            clearTimeout(marketThrottleTimer);
            marketThrottleTimer = null;
          }
        } else if (!marketThrottleTimer) {
          marketThrottleTimer = setTimeout(() => {
            marketThrottleTimer = null;
            flushMarketData();
          }, MARKET_THROTTLE_MS - elapsed);
        }
      };

      // Throttle exchange updates to avoid Redux/render storms (Spot screen is heavy).
      let lastExchangeFlush = 0;
      let pendingExchangeData = null;
      // Production: keep UI responsive (history tabs + lists)
      const EXCHANGE_THROTTLE_MS = 800;

      const flushExchangeData = () => {
        if (!pendingExchangeData) return;
        const data = pendingExchangeData;
        pendingExchangeData = null;
        lastExchangeFlush = Date.now();
        dispatch(setCoinData(data));
        dispatch(setSocketLoading(false));
        dispatch(setLoading(false));
      };

      const handleExchangeUpdate = (data) => {
        if (currentExchangeSubscription.current == null) return;
        if (!data) return;
        pendingExchangeData = data;
        const now = Date.now();
        const elapsed = now - lastExchangeFlush;

        if (elapsed >= EXCHANGE_THROTTLE_MS || lastExchangeFlush === 0) {
          flushExchangeData();
          if (exchangeThrottleTimer) {
            clearTimeout(exchangeThrottleTimer);
            exchangeThrottleTimer = null;
          }
        } else if (!exchangeThrottleTimer) {
          exchangeThrottleTimer = setTimeout(() => {
            exchangeThrottleTimer = null;
            flushExchangeData();
          }, EXCHANGE_THROTTLE_MS - elapsed);
        }
      };

      let pendingFuturesData = null;
      const FUTURES_THROTTLE_MS = 300;

      const flushFuturesData = () => {
        if (!pendingFuturesData) return;
        futuresDataRef.current = pendingFuturesData;
          dispatch(setFuturesData(pendingFuturesData));
        pendingFuturesData = null;
      };

      const handleFuturesUpdate = (data) => {
        if (!data || currentFuturesSubscription.current == null) return;
        // console.log("FUTURES UPDATE:", Object.keys(data), "sell_order length:", data?.sell_order?.length);
        pendingFuturesData = data;

        if (!futuresThrottleTimer) {
          futuresThrottleTimer = setTimeout(() => {
            futuresThrottleTimer = null;
            flushFuturesData();
          }, FUTURES_THROTTLE_MS);
        }
      };

      handlersRef.current = {
        handleConnect,
        handleDisconnect,
        handleMarketUpdate,
        handleExchangeUpdate,
        handleFuturesUpdate,
      };
      socketService.onConnect(handleConnect);
      socketService.onDisconnect(handleDisconnect);
      socketService.on("market:update", handleMarketUpdate);
      socketService.on("exchange:update", handleExchangeUpdate);
      socketService.on("message", handleExchangeUpdate);
      socketService.on("futures:update", handleFuturesUpdate);
      socketService.on("futures:price", (data) => {
        if (data) setFuturesPrice(data);
      });

      if (socketService.getIsConnected()) {
        handleConnect();
      } else if (socket && !socket.connected) {
        socket.connect();
      }

      if (!cancelled) {
        setSocketHandlersReady(true);
      }
    };

    setup();

    return () => {
      cancelled = true;
      setSocketHandlersReady(false);
      if (marketThrottleTimer) {
        clearTimeout(marketThrottleTimer);
        marketThrottleTimer = null;
      }
      if (exchangeThrottleTimer) {
        clearTimeout(exchangeThrottleTimer);
        exchangeThrottleTimer = null;
      }
      if (futuresThrottleTimer) {
        clearTimeout(futuresThrottleTimer);
        futuresThrottleTimer = null;
      }
      const h = handlersRef.current;
      if (h) {
        socketService.offConnect(h.handleConnect);
        socketService.offDisconnect(h.handleDisconnect);
        socketService.off("market:update", h.handleMarketUpdate);
        socketService.off("exchange:update", h.handleExchangeUpdate);
        socketService.off("futures:update", h.handleFuturesUpdate);
        handlersRef.current = null;
      }
    };
  }, [dispatch]);

  // Reconnect when app returns to foreground (do not create new socket or duplicate listeners)
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const cameToForeground =
        nextAppState === "active" &&
        (appStateRef.current === "background" || appStateRef.current === "inactive");
      appStateRef.current = nextAppState;
      if (!cameToForeground) return;
      const socket = socketService.getSocket();
      if (socket && !socket.connected) {
        socket.connect();
        return;
      }
      // Socket may look connected after long background but market subscription is stale.
      isMarketSubscribed.current = false;
      resubscribePending();
    });
    return () => subscription.remove();
  }, [resubscribePending]);

  const contextValue = useMemo(
    () => ({
      socket: socketService.getSocket(),
      exchangeData,
      futuresData: futuresDataRef.current,
      futuresPrice,
      socketHandlersReady,
      subscribeToMarket,
      unsubscribeFromMarket,
      subscribeToExchange,
      unsubscribeFromExchange,
      subscribeToFutures,
      unsubscribeFromFutures,
      setFuturesHistoryTab,
    }),
    [exchangeData, futuresDataRef.current, futuresPrice, socketHandlersReady, subscribeToMarket, unsubscribeFromMarket, subscribeToExchange, unsubscribeFromExchange, subscribeToFutures, unsubscribeFromFutures, setFuturesHistoryTab]
  );

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};
