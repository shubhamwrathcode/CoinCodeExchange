import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useAppSelector } from '../../../../store/hooks';
import { appOperation } from '../../../../appOperation';
import optionsSocketService from '../../../../services/socket/OptionsSocketService';
import { underlyingsFromMarketOverview, underlyingKeyFromAsset, buildChainsFromContracts } from '../helpers/optionsDataHelpers';
import { bumpOptionsWsEvent, bumpOptionsWsStat, logOptionsWs } from '../helpers/optionsWsDebug';

export const OPTIONS_CHANNELS = {
    MARKET_OVERVIEW: "options:market_overview",
    CONTRACTS: "options:contracts",
    ACCOUNT: "options:account",
    CONTRACT_DETAIL: "options:contract_detail",
    USER_ORDERS: "options:user_orders",
    USER_POSITIONS: "options:user_positions",
};

function normalizeUserOrdersPayload(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.orders)) return data.orders;
    return [];
}

function normalizeUserPositionsPayload(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.positions)) return data.positions;
    return [];
}

function normalizeAccountPayload(data) {
    if (!data || typeof data !== "object") return null;
    return data;
}

function matchesContractDetailSymbol(updateSymbol, activeSymbol) {
    if (!activeSymbol) return false;
    if (!updateSymbol) return true;
    return String(updateSymbol).toUpperCase() === String(activeSymbol).toUpperCase();
}

export default function useOptionsWebSocket(selectedAsset = "", selectedSymbol = null, enabled = true) {
    const userData = useAppSelector((state) => state.auth.userData);
    const isAuthenticated = Boolean(userData);
    const authToken = isAuthenticated ? (appOperation.customerToken || undefined) : undefined;
    const enabledRef = useRef(enabled);
    enabledRef.current = enabled;
    const socketRef = useRef(null);
    const subscribedRef = useRef({
        account: false,
        userOrders: false,
        userPositions: false,
        contractDetail: null,
    });
    const contractDetailSymbolRef = useRef(null);

    const [isConnected, setIsConnected] = useState(false);
    const [marketOverview, setMarketOverview] = useState(null);
    const [contractsPayload, setContractsPayload] = useState(null);
    const [accountUpdate, setAccountUpdate] = useState(null);
    const [userOrders, setUserOrders] = useState([]);
    const [userPositions, setUserPositions] = useState([]);
    const [userOrdersReady, setUserOrdersReady] = useState(false);
    const [userPositionsReady, setUserPositionsReady] = useState(false);
    const [orderbookUpdate, setOrderbookUpdate] = useState(null);
    const [recentTrades, setRecentTrades] = useState([]);
    const [contractDetailReady, setContractDetailReady] = useState(false);

    const contractsBatchTimerRef = useRef(null);
    const pendingContractsPayloadRef = useRef(null);

    const underlying = underlyingKeyFromAsset(selectedAsset);
    const underlyingRef = useRef(underlying);
    underlyingRef.current = underlying;

    useEffect(() => {
        if (!enabled) return undefined;

        bumpOptionsWsStat("hookMount");
        logOptionsWs("hook mount", { underlying: underlyingRef.current, isAuthenticated, hasToken: Boolean(authToken) });

        const socket = optionsSocketService.acquire(undefined, authToken);
        socketRef.current = socket;
        if (socket && !optionsSocketService.getIsConnected() && !socket.connected) {
            try {
                socket.connect();
            } catch (_) {
                // ignore reconnect errors; acquire may create a fresh socket on next focus
            }
        }

        const resubscribeAll = () => {
            if (!enabledRef.current) return;
            bumpOptionsWsStat("resubscribeAll");
            optionsSocketService.emit("subscribe", { channel: OPTIONS_CHANNELS.MARKET_OVERVIEW });
            if (underlyingRef.current) {
                optionsSocketService.emit("subscribe", {
                    channel: OPTIONS_CHANNELS.CONTRACTS,
                    underlying: underlyingRef.current,
                    expiry: "ALL",
                });
            }
            if (isAuthenticated) {
                subscribedRef.current.account = true;
                optionsSocketService.emit("subscribe", { channel: OPTIONS_CHANNELS.ACCOUNT });
                subscribedRef.current.userOrders = true;
                setUserOrdersReady(false);
                optionsSocketService.emit("subscribe", { channel: OPTIONS_CHANNELS.USER_ORDERS });
                subscribedRef.current.userPositions = true;
                setUserPositionsReady(false);
                optionsSocketService.emit("subscribe", { channel: OPTIONS_CHANNELS.USER_POSITIONS });
            }
        };

        const onConnect = () => {
            bumpOptionsWsStat("socketConnect");
            logOptionsWs("socket connect (hook listener)");
            setIsConnected(true);
            resubscribeAll();
        };

        const onDisconnect = () => {
            bumpOptionsWsStat("socketDisconnect");
            logOptionsWs("socket disconnect (hook listener)");
            setIsConnected(false);
            if (!enabledRef.current) return;
            setContractsPayload(null);
            setUserOrdersReady(false);
            setUserPositionsReady(false);
        };

        const onMarketOverview = (data) => {
            if (!enabledRef.current) return;
            if (data && typeof data === "object") {
                bumpOptionsWsEvent("market_overview");
                setMarketOverview(data);
            }
        };

        const onContractsUpdate = (data) => {
            if (!enabledRef.current) return;
            if (data && typeof data === "object") {
                bumpOptionsWsEvent("contracts_update");
                pendingContractsPayloadRef.current = data;
                if (!contractsBatchTimerRef.current) {
                    contractsBatchTimerRef.current = setTimeout(() => {
                        contractsBatchTimerRef.current = null;
                        if (pendingContractsPayloadRef.current && enabledRef.current) {
                            setContractsPayload(pendingContractsPayloadRef.current);
                        }
                    }, 60);
                }
            }
        };

        const onAccountUpdate = (data) => {
            if (!enabledRef.current) return;
            const normalized = normalizeAccountPayload(data);
            if (normalized) {
                bumpOptionsWsEvent("account_update");
                setAccountUpdate(normalized);
            }
        };

        const onUserOrdersUpdate = (orders) => {
            if (!enabledRef.current) return;
            bumpOptionsWsEvent("user_orders_update");
            setUserOrders(normalizeUserOrdersPayload(orders));
            setUserOrdersReady(true);
        };

        const onUserPositionsUpdate = (positions) => {
            if (!enabledRef.current) return;
            bumpOptionsWsEvent("user_positions_update");
            setUserPositions(normalizeUserPositionsPayload(positions));
            setUserPositionsReady(true);
        };

        const onOrderbookUpdate = (data) => {
            if (!enabledRef.current) return;
            if (!data || typeof data !== "object") return;
            const active = contractDetailSymbolRef.current;
            if (!matchesContractDetailSymbol(data.symbol, active)) return;
            bumpOptionsWsEvent("orderbook_update");
            setOrderbookUpdate(data);
            setContractDetailReady(true);
        };

        const onRecentTradesUpdate = (data) => {
            if (!enabledRef.current) return;
            if (!contractDetailSymbolRef.current) return;
            bumpOptionsWsEvent("recent_trades_update");
            setRecentTrades(Array.isArray(data) ? data : []);
            if (Array.isArray(data) && data.length > 0) {
                setContractDetailReady(true);
            }
        };

        optionsSocketService.onConnect(onConnect);
        optionsSocketService.onDisconnect(onDisconnect);
        optionsSocketService.on("market_overview", onMarketOverview);
        optionsSocketService.on("contracts_update", onContractsUpdate);
        optionsSocketService.on("account_update", onAccountUpdate);
        optionsSocketService.on("user_orders_update", onUserOrdersUpdate);
        optionsSocketService.on("user_positions_update", onUserPositionsUpdate);
        optionsSocketService.on("orderbook_update", onOrderbookUpdate);
        optionsSocketService.on("recent_trades_update", onRecentTradesUpdate);

        if (optionsSocketService.getIsConnected()) {
            onConnect();
        }

        return () => {
            bumpOptionsWsStat("hookUnmount");
            logOptionsWs("hook unmount", { consumerCount: optionsSocketService.getConsumerCount?.() });

            // 1. Unsubscribe
            optionsSocketService.emit("unsubscribe", { channel: OPTIONS_CHANNELS.MARKET_OVERVIEW });
            if (underlyingRef.current) {
                optionsSocketService.emit("unsubscribe", { channel: OPTIONS_CHANNELS.CONTRACTS, underlying: underlyingRef.current, expiry: "ALL" });
            }
            if (subscribedRef.current.account) {
                optionsSocketService.emit("unsubscribe", { channel: OPTIONS_CHANNELS.ACCOUNT });
            }
            if (subscribedRef.current.userOrders) {
                optionsSocketService.emit("unsubscribe", { channel: OPTIONS_CHANNELS.USER_ORDERS });
            }
            if (subscribedRef.current.userPositions) {
                optionsSocketService.emit("unsubscribe", { channel: OPTIONS_CHANNELS.USER_POSITIONS });
            }
            subscribedRef.current = {
                account: false,
                userOrders: false,
                userPositions: false,
                contractDetail: null,
            };

            // 2. Remove listeners
            optionsSocketService.offConnect(onConnect);
            optionsSocketService.offDisconnect(onDisconnect);
            optionsSocketService.off("market_overview", onMarketOverview);
            optionsSocketService.off("contracts_update", onContractsUpdate);
            optionsSocketService.off("account_update", onAccountUpdate);
            optionsSocketService.off("user_orders_update", onUserOrdersUpdate);
            optionsSocketService.off("user_positions_update", onUserPositionsUpdate);
            optionsSocketService.off("orderbook_update", onOrderbookUpdate);
            optionsSocketService.off("recent_trades_update", onRecentTradesUpdate);

            // 3. Clear batch timer
            if (contractsBatchTimerRef.current) {
                clearTimeout(contractsBatchTimerRef.current);
                contractsBatchTimerRef.current = null;
            }

            // 4. Release consumer
            optionsSocketService.release();
        };
    }, [authToken, isAuthenticated, enabled]);

    // Handle underlying change while connected
    const prevUnderlyingRef = useRef(underlying);
    useEffect(() => {
        if (!enabled || !underlying) return;

        if (prevUnderlyingRef.current && prevUnderlyingRef.current !== underlying) {
            optionsSocketService.emit("unsubscribe", {
                channel: OPTIONS_CHANNELS.CONTRACTS,
                underlying: prevUnderlyingRef.current,
                expiry: "ALL",
            });
        }
        prevUnderlyingRef.current = underlying;

        if (optionsSocketService.getIsConnected()) {
            optionsSocketService.emit("subscribe", {
                channel: OPTIONS_CHANNELS.CONTRACTS,
                underlying,
                expiry: "ALL",
            });
        }
    }, [enabled, underlying, isConnected]);

    // Handle contract detail subscription
    useEffect(() => {
        if (!enabled || !selectedSymbol) return undefined;

        contractDetailSymbolRef.current = selectedSymbol;
        subscribedRef.current.contractDetail = selectedSymbol;
        setContractDetailReady(false);

        optionsSocketService.emit("subscribe", {
            channel: OPTIONS_CHANNELS.CONTRACT_DETAIL,
            symbol: selectedSymbol,
        });

        return () => {
            if (subscribedRef.current.contractDetail === selectedSymbol) {
                optionsSocketService.emit("unsubscribe", {
                    channel: OPTIONS_CHANNELS.CONTRACT_DETAIL,
                    symbol: selectedSymbol,
                });
                subscribedRef.current.contractDetail = null;
                contractDetailSymbolRef.current = null;
            }
        };
    }, [enabled, selectedSymbol]);

    const refreshLiveTradeChannels = useCallback(() => {
        const socket = socketRef.current;
        if (!socket?.connected) return;

        const symbol = subscribedRef.current.contractDetail;
        if (symbol) {
            socket.emit("subscribe", {
                channel: OPTIONS_CHANNELS.CONTRACT_DETAIL,
                symbol,
            });
        }

        if (isAuthenticated && subscribedRef.current.userOrders) {
            socket.emit("subscribe", { channel: OPTIONS_CHANNELS.USER_ORDERS });
        }
        if (isAuthenticated && subscribedRef.current.userPositions) {
            socket.emit("subscribe", { channel: OPTIONS_CHANNELS.USER_POSITIONS });
        }
        if (isAuthenticated && subscribedRef.current.account) {
            socket.emit("subscribe", { channel: OPTIONS_CHANNELS.ACCOUNT });
        }
    }, [isAuthenticated]);

    const underlyings = useMemo(() => underlyingsFromMarketOverview(marketOverview), [marketOverview]);
    const expiryDatesList = useMemo(() => marketOverview?.expiry_dates?.[underlying] || [], [marketOverview?.expiry_dates, underlying]);
    const spotPrice = useMemo(() => marketOverview?.index_prices?.[underlying] || 0, [marketOverview?.index_prices, underlying]);
    const allChains = useMemo(() => buildChainsFromContracts(contractsPayload?.contracts || [], spotPrice), [contractsPayload?.contracts, spotPrice]);
    const expiries = useMemo(() => ['ALL', ...expiryDatesList], [expiryDatesList]);

    const normalizeOrderbookLevels = (levels) => {
        if (!Array.isArray(levels)) return [];
        return levels.map((row) => {
            if (Array.isArray(row)) {
                return { price: Number(row[0]) || 0, qty: Number(row[1]) || 0 };
            }
            return {
                price: Number(row.price ?? row[0]) || 0,
                qty: Number(row.quantity ?? row.qty ?? row[1]) || 0,
            };
        });
    };

    const orderbook = useMemo(() => {
        if (orderbookUpdate && matchesContractDetailSymbol(orderbookUpdate.symbol, selectedSymbol)) {
            return {
                symbol: orderbookUpdate.symbol,
                bids: normalizeOrderbookLevels(orderbookUpdate.bids),
                asks: normalizeOrderbookLevels(orderbookUpdate.asks),
                timestamp: orderbookUpdate.timestamp,
            };
        }
        return null;
    }, [orderbookUpdate, selectedSymbol]);

    return {
        isConnected,
        marketOverview,
        underlyings,
        expiries,
        chains: allChains,
        currentPrice: spotPrice,
        accountUpdate,
        userOrders,
        userPositions,
        orderbook,
        recentTrades: selectedSymbol ? recentTrades : [],
        isMarketLoading: marketOverview === null,
        isContractsLoading: contractsPayload === null,
        isOrderbookLoading: selectedSymbol ? !contractDetailReady : false,
        isAccountLoading: isAuthenticated && accountUpdate === null,
        isUserOrdersLoading: isAuthenticated && isConnected && !userOrdersReady,
        isUserPositionsLoading: isAuthenticated && isConnected && !userPositionsReady,
        refreshLiveTradeChannels,
    };
}
