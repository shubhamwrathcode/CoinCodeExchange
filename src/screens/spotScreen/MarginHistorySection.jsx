import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Animated,
  Modal,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import FastImage from "react-native-fast-image";
import moment from "moment";
import { useSelector } from "react-redux";
import SimpleToast from "react-native-simple-toast";
import NavigationService from "../../navigation/NavigationService";
import { SPOT_ORDER_HISTORY_DETAIL, MARGIN_BORROW_REPAY_SCREEN, LOGIN_SCREEN } from "../../navigation/routes";
import CustomDropdown from "../../shared/components/CustomDropdown";
import { AppText, BOLD, MEDIUM, SEMI_BOLD, FIFTEEN, FOURTEEN, THIRTEEN, TWELVE } from "../../shared";
import HistorySectionLoader from "../../common/HistorySectionLoader/HistorySectionLoader";
import { colors, darkTheme } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";
import {
  NO_NOTIFICATION_ICON,
  NO_NOTIFICATION_ICON_LIGHT,
  right_ic,
  downIcon,
  Refresh,
  INFO,
} from "../../helper/ImageAssets";
import { appOperation } from "../../appOperation";
import { CUSTOMER_TYPE } from "../../appOperation/types";
import IsolatedMarginRiskModal from "./isolatedMargin/IsolatedMarginRiskModal";
import {
  buildMarginRiskRow,
  formatMarginLevel,
  getMarginLevelStatus,
  pairHasDebt,
  parseMarginLevel,
} from "./crossMargin/marginLevelUtils";

const ISOLATED_TABS = [
  { id: "size", label: "Size" },
  { id: "positionHistory", label: "Position History" },
  { id: "positions", label: "Open Orders" },
  { id: "orderHistory", label: "Order History" },
  { id: "tradeHistory", label: "Trade History" },
  { id: "loanManagement", label: "Loan Management" },
  { id: "assetHistory", label: "Asset History" },
];

const CROSS_TABS = [
  { id: "size", label: "Positions" },
  { id: "positions", label: "Open Orders" },
  { id: "orderHistory", label: "Order History" },
  { id: "tradeHistory", label: "Trade History" },
  { id: "loanManagement", label: "Loan Management" },
  { id: "assetHistory", label: "Asset History" },
];

const AH_SUB_TABS = [
  { id: "borrow", label: "Borrow" },
  { id: "repay", label: "Repay" },
  { id: "interest", label: "Interest" },
  { id: "transfer", label: "Transfer" },
];

const parseNum = (val) => {
  if (val && val.$numberDecimal != null) return parseFloat(val.$numberDecimal);
  return parseFloat(val);
};

const dec = (v) => (v != null && typeof v === "object" && v.$numberDecimal != null ? v.$numberDecimal : v);

const isLiquidatedPos = (pos) => {
  const reason = String(pos?.close_reason || "").toUpperCase();
  const status = String(pos?.status || "").toUpperCase();
  return reason === "LIQUIDATION" || reason === "LIQUIDATED" || status === "LIQUIDATED";
};

const posStatusLabel = (pos) => {
  if (isLiquidatedPos(pos)) return "Liquidated";
  const statusMap = { CLOSED: "Close All", LIQUIDATED: "Liquidated", OPEN: "Open Position" };
  return statusMap[pos?.status] || pos?.status || "—";
};

const formatMarginLiqFee = (pos, quoteAsset) => {
  const n = parseNum(pos?.liq_fee);
  if (!isLiquidatedPos(pos) || !Number.isFinite(n) || n === 0) return null;
  const asset = pos?.liq_fee_asset || quoteAsset || "";
  return { value: Number.isFinite(n) ? n.toFixed(4) : "—", asset };
};

const splitPairAssets = (raw, fallbackBase = "", fallbackQuote = "") => {
  const s = String(raw || "");
  if (s.includes("/")) {
    const [base, quote] = s.split("/");
    return { base: base || fallbackBase, quote: quote || fallbackQuote };
  }
  if (s.length > 4) return { base: s.slice(0, -4), quote: s.slice(-4) };
  return { base: fallbackBase, quote: fallbackQuote };
};

const normalizeMarginPositionHistoryItem = (raw) => {
  if (!raw) return raw;
  return {
    ...raw,
    quantity: dec(raw.quantity),
    entry_price: dec(raw.entry_price),
    close_price: dec(raw.close_price),
    notional: dec(raw.notional),
    liquidation_price: dec(raw.liquidation_price),
    realized_pnl: dec(raw.realized_pnl),
    total_fees: dec(raw.total_fees),
    liq_fee: dec(raw.liq_fee),
    total_interest_charged: dec(raw.total_interest_charged),
  };
};

const normalizeApiList = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (res?.success === false) return [];
  const d = res?.data ?? res?.result ?? res;
  if (Array.isArray(d)) return d;
  if (d && typeof d === "object") {
    for (const key of ["items", "orders", "data", "positions", "transactions", "debts", "history", "list", "records"]) {
      if (Array.isArray(d[key])) return d[key];
    }
  }
  return [];
};

const toFixedEight = (val) => {
  const n = parseNum(val);
  if (!Number.isFinite(n)) return "0";
  return n.toFixed(8).replace(/\.?0+$/, "") || "0";
};

const aggregateExecutedLegs = (rawExecutions) => {
  if (!Array.isArray(rawExecutions) || rawExecutions.length === 0) return [];

  const unwrapDecimal = (v) => {
    if (v != null && typeof v === "object" && v.$numberDecimal != null) return v.$numberDecimal;
    return v;
  };

  const priceGroupKey = (p) => {
    const n = Number(p);
    if (!Number.isFinite(n)) return `s:${String(p ?? "")}`;
    return `n:${n.toFixed(14)}`;
  };

  const buckets = new Map();
  const keysInOrder = [];

  rawExecutions.forEach((trade) => {
    const pRaw = unwrapDecimal(trade?.price) || unwrapDecimal(trade?.p);
    const qRaw = unwrapDecimal(trade?.quantity) || unwrapDecimal(trade?.q) || unwrapDecimal(trade?.amount) || unwrapDecimal(trade?.a);
    const fRaw = unwrapDecimal(trade?.fee) || unwrapDecimal(trade?.f);

    const price = pRaw;
    const qty = Number(qRaw) || 0;
    const fee = Number(fRaw) || 0;

    const gk = priceGroupKey(price);
    if (!buckets.has(gk)) {
      keysInOrder.push(gk);
      buckets.set(gk, {
        price: price,
        sumQty: 0,
        sumFee: 0,
      });
    }
    const b = buckets.get(gk);
    b.sumQty += qty;
    b.sumFee += fee;
  });

  return keysInOrder.map((gk) => {
    const b = buckets.get(gk);
    return {
      price: b.price,
      quantity: b.sumQty,
      fee: b.sumFee,
    };
  });
};

const toFixedFour = (val) => {
  const n = parseNum(val);
  if (!Number.isFinite(n)) return "0.0000";
  return n.toFixed(4);
};

const toFixedTwo = (val) => {
  const n = parseNum(val);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
};

const formatWalletName = (name) => {
  if (!name) return "";
  const lower = name.toLowerCase();
  if (lower === "spot") return "Spot";
  if (lower === "main") return "Main";
  if (lower === "funding") return "Funding";
  if (lower === "futures") return "Futures";
  if (lower === "margin") return "Margin";
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

const fmtHistDate = (iso) => {
  if (!iso) return { date: "—", time: "—" };
  const m = moment(iso);
  if (!m.isValid()) return { date: "—", time: "—" };
  return {
    date: m.format("YYYY-MM-DD"),
    time: m.format("HH:mm:ss")
  };
};

const CustomDraggableSlider = ({ value, onValueChange, themeColors, isDark }) => {
  const [trackWidth, setTrackWidth] = useState(0);

  const updateValue = (locationX) => {
    if (trackWidth > 0) {
      let newX = locationX;
      if (newX < 0) newX = 0;
      if (newX > trackWidth) newX = trackWidth;
      const newPct = Math.round((newX / trackWidth) * 100);
      onValueChange(newPct);
    }
  };

  return (
    <View style={{ marginBottom: 16 }}>
      <View
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onResponderGrant={(evt) => updateValue(evt.nativeEvent.locationX)}
        onResponderMove={(evt) => updateValue(evt.nativeEvent.locationX)}
        style={{
          height: 30,
          justifyContent: "center",
          paddingVertical: 10,
        }}
      >
        {/* Background Track */}
        <View style={{ height: 6, backgroundColor: isDark ? "#2A2A2A" : "#E5E7EB", borderRadius: 3, width: "100%" }} />
        {/* Active Track */}
        <View style={{ height: 6, backgroundColor: themeColors.spotTradeBuy || colors.green, borderRadius: 3, width: `${value}%`, position: "absolute", left: 0 }} />
        {/* Thumb */}
        <View
          style={{
            position: "absolute",
            left: `${value}%`,
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: themeColors.spotTradeBuy || colors.green,
            marginLeft: -8, // Center thumb
          }}
          pointerEvents="none"
        />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingHorizontal: 4 }}>
        {[0, 25, 50, 75, 100].map((pct) => (
          <TouchableOpacity key={pct} onPress={() => onValueChange(pct)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <AppText style={{ fontSize: 11, color: value >= pct ? themeColors.text : themeColors.secondaryText }}>
              {pct}%
            </AppText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const MarginHistorySection = ({ currencyData = {}, themeColors: themeColorsProp, isDark: isDarkProp, isFullScreen = false, initialTab = "size", marginMode = "Isolated", marginAccountData = null }) => {
  const { colors: themeColorsHook, isDark: isDarkHook } = useTheme();
  const themeColors = themeColorsProp || themeColorsHook;
  const isDark = typeof isDarkProp === "boolean" ? isDarkProp : isDarkHook;
  const userData = useSelector((state) => state.auth?.userData);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [subTab, setSubTab] = useState("borrow"); // used in Asset History tab
  const [tabData, setTabData] = useState({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const fetchGenRef = useRef(0);
  const tabDataRef = useRef({});
  const fetchTabDetailsRef = useRef(null);

  useEffect(() => {
    tabDataRef.current = tabData;
  }, [tabData]);

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const cancelInFlightRef = useRef(false);
  const rbSheetIsolatedRisk = useRef(null);
  const [isolatedRiskRow, setIsolatedRiskRow] = useState(null);

  // Close Position Modal states
  const [closePositionModal, setClosePositionModal] = useState(false);
  const [selectedPosToClose, setSelectedPosToClose] = useState(null);
  const [closePositionType, setClosePositionType] = useState("MARKET");
  const [closePositionQty, setClosePositionQty] = useState("");
  const [closePositionPrice, setClosePositionPrice] = useState("");
  const [closePositionSliderPct, setClosePositionSliderPct] = useState(0);
  const [closeConfirmVisible, setCloseConfirmVisible] = useState(false);
  const closeInFlightRef = useRef(false);
  const [closingPairs, setClosingPairs] = useState({});
  const closingPairsRef = useRef({});
  const closingTimersRef = useRef({});

  useEffect(() => () => {
    Object.values(closingTimersRef.current).forEach(clearTimeout);
    closingTimersRef.current = {};
    closingPairsRef.current = {};
  }, []);

  const positionCloseKey = (pos) => String(pos?.position_id || pos?.pair || pos?.pair_id || "");

  const markPositionClosing = (key) => {
    if (!key) return;
    closingPairsRef.current[key] = true;
    setClosingPairs((prev) => ({ ...prev, [key]: true }));
    if (closingTimersRef.current[key]) clearTimeout(closingTimersRef.current[key]);
    closingTimersRef.current[key] = setTimeout(() => {
      delete closingPairsRef.current[key];
      setClosingPairs((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
      delete closingTimersRef.current[key];
    }, 10000);
  };

  const screenW = Dimensions.get("window").width;
  const slideWidth = screenW - 16; // Account for container paddingHorizontal: 8
  const pagerX = useRef(new Animated.Value(0)).current;

  const currentTabs = marginMode === "Cross" ? CROSS_TABS : ISOLATED_TABS;

  const activeTabIndex = useMemo(() => {
    return Math.max(0, currentTabs.findIndex(t => t.id === activeTab));
  }, [activeTab, currentTabs]);

  useEffect(() => {
    if (!currentTabs.find(t => t.id === activeTab)) {
      setActiveTab(currentTabs[0].id);
    }
  }, [currentTabs, activeTab]);

  useEffect(() => {
    Animated.timing(pagerX, {
      toValue: -activeTabIndex * slideWidth,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [activeTabIndex, pagerX, slideWidth]);

  const [openOrderTypeFilter, setOpenOrderTypeFilter] = useState("All");
  const [openOrderSideFilter, setOpenOrderSideFilter] = useState("All Sides");

  const [orderHistoryTypeFilter, setOrderHistoryTypeFilter] = useState("All");

  const spotOpenOrders = useSelector((state) => state.home?.spotOpenOrders);
  const orderData = useSelector((state) => state.home?.orderData);

  const baseSymbol = currencyData?.base_currency || "";
  const quoteSymbol = currencyData?.quote_currency || "";
  const pairSymbol = `${baseSymbol}${quoteSymbol}`.toUpperCase();
  const pairId = currencyData?._id || "";

  const borderThemeColor = themeColors.themeBorderColor || themeColors.border || "rgba(0,0,0,0.06)";
  const textThemeColor = themeColors.text || colors.black;
  const secondaryTextThemeColor = themeColors.secondaryText || colors.placeholderColor;

  const fetchTabDetails = useCallback(async (isSilent = false) => {
    if (!userData || !pairSymbol) {
      setLoading(false);
      return;
    }

    const tabAtFetch = activeTab;
    const subAtFetch = subTab;
    const isCross = marginMode === "Cross";
    let requestGen = fetchGenRef.current;

    if (!isSilent) {
      requestGen = ++fetchGenRef.current;
      const hasCache = (tabDataRef.current[tabAtFetch]?.length ?? 0) > 0;
      if (!hasCache) setLoading(true);
    }

    const commitList = (list) => {
      if (requestGen !== fetchGenRef.current) return;
      setTabData((prev) => ({ ...prev, [tabAtFetch]: list }));
    };

    try {
      let res;

      if (tabAtFetch === "size") {
        if (isCross) {
          res = await appOperation.get(`cross/positions`, undefined, undefined, CUSTOMER_TYPE);
          commitList(res?.success ? normalizeApiList(res) : []);
        } else {
          const [posRes, accRes] = await Promise.all([
            appOperation.get(`margin/position/${pairSymbol}`, undefined, undefined, CUSTOMER_TYPE),
            pairId
              ? appOperation.get(`margin/account/${pairId}`, undefined, undefined, CUSTOMER_TYPE).catch(() => null)
              : Promise.resolve(null),
          ]);
          if (posRes?.success && posRes.data) {
            const pos = posRes.data;
            const acc = accRes?.success ? accRes.data : null;
            commitList([{
              ...acc,
              ...pos,
              margin_level: acc?.margin_level ?? pos?.margin_level,
              margin_call_level: acc?.margin_call_level ?? pos?.margin_call_level,
              liquidation_margin_level: acc?.liquidation_margin_level ?? pos?.liquidation_margin_level,
              warning_margin_rate: acc?.warning_margin_rate ?? pos?.warning_margin_rate,
              maintenance_margin_rate: acc?.maintenance_margin_rate ?? pos?.maintenance_margin_rate,
              base_borrowed: pos?.base_borrowed ?? acc?.base_borrowed,
              quote_borrowed: pos?.quote_borrowed ?? acc?.quote_borrowed,
            }]);
          } else {
            commitList([]);
          }
        }
      } else if (tabAtFetch === "positionHistory") {
        if (isCross) {
          res = await appOperation.get(`cross/positions`, undefined, undefined, CUSTOMER_TYPE);
          commitList(res?.success ? normalizeApiList(res).map(p => ({ ...p, status: "OPEN" })) : []);
        } else {
          res = await appOperation.get(`margin/positions/history`, { page: 1, limit: 50 }, undefined, CUSTOMER_TYPE);
          commitList(res?.success ? normalizeApiList(res).map(normalizeMarginPositionHistoryItem) : []);
        }
      } else if (tabAtFetch === "positions") {
        const endpoint = isCross ? `cross/orders/open` : `margin/orders/open`;
        res = await appOperation.get(endpoint, { page: 1, limit: 100, pair: pairSymbol }, undefined, CUSTOMER_TYPE);
        commitList(res?.success ? normalizeApiList(res) : []);
      } else if (tabAtFetch === "orderHistory") {
        if (isCross) {
          res = await appOperation.customer.crossOrderHistory({ pair: pairSymbol, page: 1, limit: 50 });
        } else {
          res = await appOperation.customer.margin_order_history({ pair: pairSymbol, page: 1, limit: 50 });
        }
        commitList(normalizeApiList(res));
      } else if (tabAtFetch === "tradeHistory") {
        const endpoint = isCross ? `cross/trades` : `margin/trades`;
        res = await appOperation.get(endpoint, { page: 1, limit: 50, pair: pairSymbol }, undefined, CUSTOMER_TYPE);
        commitList(res?.success ? normalizeApiList(res) : []);
      } else if (tabAtFetch === "loanManagement") {
        const endpoint = isCross ? `cross/debts` : `margin/loans`;
        res = await appOperation.get(endpoint, undefined, undefined, CUSTOMER_TYPE);
        if (res?.success) {
          if (isCross) {
            commitList(normalizeApiList(res).map(d => ({
              ...d,
              loan_id: d.currency_id || d.loan_id,
              coin: d.asset || d.coin,
              contract: "Cross",
              outstanding: String((parseFloat(d.principal || 0) + parseFloat(d.interest_accrued || 0)).toFixed(8)),
              hourly_rate_pct: d.interest_rate_daily != null ? ((d.interest_rate_daily / 24) * 100).toFixed(6) : null,
              apr_pct: d.interest_rate_daily != null ? (d.interest_rate_daily * 100).toFixed(4) : null,
              currency_id: d.currency_id
            })));
          } else {
            commitList(normalizeApiList(res));
          }
        } else {
          commitList([]);
        }
      } else if (tabAtFetch === "assetHistory") {
        const endpoint = isCross ? `cross/history/${subAtFetch}` : `margin/history/${subAtFetch}`;
        const query = { page: 1, limit: 50 };
        if (!isCross && pairId) query.pairId = pairId;
        res = await appOperation.get(endpoint, query, undefined, CUSTOMER_TYPE);
        commitList(res?.success ? normalizeApiList(res) : []);
      }
    } catch (e) {
      console.warn("[MarginHistory] Fetch details error:", e);
      if (requestGen === fetchGenRef.current) {
        commitList([]);
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, [activeTab, subTab, pairSymbol, pairId, marginMode]);

  fetchTabDetailsRef.current = fetchTabDetails;

  useEffect(() => {
    if (!loading) return undefined;
    const safetyTimer = setTimeout(() => setLoading(false), 32000);
    return () => clearTimeout(safetyTimer);
  }, [loading, activeTab]);

  useEffect(() => {
    if (!userData || !pairSymbol) {
      setLoading(false);
      return;
    }
    const hasCache = (tabDataRef.current[activeTab]?.length ?? 0) > 0;
    fetchTabDetailsRef.current?.(hasCache);
  }, [userData, activeTab, subTab, pairSymbol, pairId, marginMode]);

  const getFilteredDataList = (tabId) => {
    let list = tabData[tabId] || [];

    if (tabId === "positions") {
      list = (spotOpenOrders && spotOpenOrders.length > 0) ? spotOpenOrders : tabData[tabId] || [];
    }

    if (tabId === "orderHistory") {
      if (orderHistoryTypeFilter !== "All") {
        list = list.filter(o => {
          const type = (o.type || o.order_type || "LIMIT").toUpperCase();
          if (orderHistoryTypeFilter === "Limit") return type === "LIMIT";
          if (orderHistoryTypeFilter === "Market") return type === "MARKET";
          if (orderHistoryTypeFilter === "Stop Limit") return type === "STOP_LIMIT";
          if (orderHistoryTypeFilter === "Stop Market") return type === "STOP_MARKET";
          return true;
        });
      }
      return list;
    }

    if (tabId !== "positions") return list;
    if (openOrderTypeFilter === "Limit") {
      list = list.filter(o => {
        const type = (o.type || o.order_type || "LIMIT").toUpperCase();
        return type === "LIMIT" || type === "STOP_LIMIT";
      });
    } else if (openOrderTypeFilter === "Market") {
      list = list.filter(o => {
        const type = (o.type || o.order_type || "LIMIT").toUpperCase();
        return type === "MARKET" || type === "STOP_MARKET";
      });
    }

    if (openOrderSideFilter === "Buy") {
      list = list.filter(o => (o.side || "").toUpperCase() === "BUY");
    } else if (openOrderSideFilter === "Sell") {
      list = list.filter(o => (o.side || "").toUpperCase() === "SELL");
    }
    return list;
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchTabDetailsRef.current?.(true);
    }, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const closeCancelModal = () => {
    if (cancelLoading || cancelInFlightRef.current) return;
    setCancelModalVisible(false);
    setOrderToCancel(null);
  };

  const handleCancelOrder = (orderId) => {
    if (!orderId || cancelLoading || cancelInFlightRef.current) return;
    setOrderToCancel(orderId);
    setCancelModalVisible(true);
  };

  const confirmCancelOrder = async () => {
    if (!orderToCancel || cancelInFlightRef.current) return;
    cancelInFlightRef.current = true;
    setCancelLoading(true);
    try {
      const endpoint = marginMode === "Cross" ? `cross/order/${orderToCancel}` : `margin/order/${orderToCancel}`;
      const res = await appOperation.delete(endpoint, undefined, CUSTOMER_TYPE);
      if (res?.success) {
        setCancelModalVisible(false);
        setOrderToCancel(null);
        fetchTabDetails();
      } else {
        SimpleToast.show(res?.message || "Failed to cancel order");
      }
    } catch (err) {
      SimpleToast.show(err?.message || "Failed to cancel order");
    } finally {
      cancelInFlightRef.current = false;
      setCancelLoading(false);
    }
  };

  const handleClosePosition = (pos) => {
    if (closeInFlightRef.current || actionLoading) return;
    const pair = pos?.pair || pairSymbol;
    const key = positionCloseKey({ ...pos, pair });
    if (!pair) return;
    if (key && closingPairsRef.current[key]) return;
    setSelectedPosToClose({
      ...pos,
      pair,
      quantity: pos?.quantity ?? pos?.net_quantity ?? pos?.size,
      notional: pos?.notional ?? pos?.value_usdt ?? pos?.value,
    });
    setClosePositionType("MARKET");
    setClosePositionQty("");
    setClosePositionPrice("");
    setClosePositionSliderPct(0);
    setCloseConfirmVisible(false);
    setClosePositionModal(true);
  };

  const dismissCloseSheet = () => {
    if (closeInFlightRef.current || actionLoading) return;
    setCloseConfirmVisible(false);
    setClosePositionModal(false);
  };

  const requestCloseConfirm = () => {
    if (!selectedPosToClose?.pair || closeInFlightRef.current || actionLoading) return;
    const closeKey = positionCloseKey(selectedPosToClose);
    if (closeKey && closingPairsRef.current[closeKey]) return;
    if (closePositionType === "LIMIT") {
      if (!closePositionPrice || isNaN(Number(closePositionPrice)) || Number(closePositionPrice) <= 0) {
        SimpleToast.show("Please enter a valid price");
        return;
      }
      if (!closePositionQty || isNaN(Number(closePositionQty)) || Number(closePositionQty) <= 0) {
        SimpleToast.show("Please enter a valid quantity");
        return;
      }
    }
    setCloseConfirmVisible(true);
  };

  const cancelCloseConfirm = () => {
    if (closeInFlightRef.current || actionLoading) return;
    setCloseConfirmVisible(false);
  };

  const submitClosePosition = async () => {
    if (closeInFlightRef.current) return;
    closeInFlightRef.current = true;

    const pos = selectedPosToClose;
    const closeKey = positionCloseKey(pos);
    if (!pos?.pair || (closeKey && closingPairsRef.current[closeKey])) {
      closeInFlightRef.current = false;
      return;
    }

    setActionLoading(true);
    try {
      const payload = marginMode === "Cross"
        ? { type: closePositionType }
        : { type: "MARKET" };
      if (marginMode === "Cross" && closePositionType === "LIMIT") {
        payload.price = closePositionPrice;
        payload.quantity = closePositionQty;
      }

      let res;
      if (marginMode === "Cross") {
        payload.pair = pos.pair;
        res = await appOperation.post(
          `cross/position/close`,
          payload,
          CUSTOMER_TYPE
        );
      } else {
        res = await appOperation.post(
          `margin/position/${encodeURIComponent(pos.pair)}/close`,
          payload,
          CUSTOMER_TYPE
        );
      }
      if (res?.success) {
        markPositionClosing(closeKey);
        setCloseConfirmVisible(false);
        setClosePositionModal(false);
        setSelectedPosToClose(null);
        SimpleToast.show("Position close request submitted");
        fetchTabDetails();
      } else {
        SimpleToast.show(res?.message || "Failed to close position");
      }
    } catch (err) {
      SimpleToast.show(err?.message || "Failed to close position");
    } finally {
      closeInFlightRef.current = false;
      setActionLoading(false);
    }
  };

  const getSideColor = useCallback((side) => {
    const s = String(side || "").toUpperCase().trim();
    if (s === "BUY" || s === "LONG") return themeColors.spotTradeBuy || colors.green;
    if (s === "SELL" || s === "SHORT") return themeColors.spotTradeSell || colors.red;
    return textThemeColor;
  }, [themeColors.spotTradeBuy, themeColors.spotTradeSell, textThemeColor]);

  const fmtDate = (iso) => {
    if (!iso) return "---";
    const m = moment(iso);
    return m.isValid() ? m.format("DD/MM/YYYY HH:mm:ss") : "---";
  };

  const renderNoData = () => (
    <View style={[styles.noDataContainer, { paddingVertical: 35, alignItems: "center", justifyContent: "center" }]}>
      <FastImage
        source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT}
        resizeMode="contain"
        style={{ width: 75, height: 75, marginBottom: 10 }}
      />
      {!userData && (
        <>
          <AppText style={{ color: themeColors.secondaryText, fontSize: 13, marginBottom: 12 }}>
            Please login to view your margin history
          </AppText>
          <TouchableOpacity
            style={{
              backgroundColor: colors.cyanTheme,
              paddingHorizontal: 22,
              paddingVertical: 8,
              borderRadius: 6,
              alignItems: "center",
            }}
            onPress={() => NavigationService.navigate(LOGIN_SCREEN)}
          >
            <AppText weight={SEMI_BOLD} style={{ color: "#fff", fontSize: 13 }}>
              Login / Register
            </AppText>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderItemCard = (item, index, tabId) => {
    if (tabId === "size") {
      const ml = parseMarginLevel(item?.margin_level ?? marginAccountData?.margin_level);
      const hasDebt = pairHasDebt({ ...marginAccountData, ...item }, ml);
      const mlStatus = getMarginLevelStatus(hasDebt ? ml : null, { ...marginAccountData, ...item }, { hasDebt });
      const maintMarginDisplay = hasDebt ? formatMarginLevel(ml) : "Safe";
      const isLong = item?.side === "LONG";
      const itemPairStr = item?.pair || "";
      const cardBaseSymbol = itemPairStr ? itemPairStr.slice(0, -4) : baseSymbol;
      const cardQuoteSymbol = itemPairStr ? itemPairStr.slice(-4) : quoteSymbol;
      const posVal = Math.abs(parseFloat(item?.notional ?? item?.value_usdt ?? item?.value ?? 0));
      const minNotional = parseFloat(currencyData?.min_notional ?? 10);
      const tooSmall = posVal > 0 && posVal < minNotional;
      const noLiability = marginMode === "Cross" && !item?.position_id;
      const closeKey = positionCloseKey(item);
      const isThisClosing = actionLoading && positionCloseKey(selectedPosToClose) === closeKey;
      const alreadyClosing = !!(closeKey && (closingPairs[closeKey] || closingPairsRef.current[closeKey]));
      const closeDisabled = tooSmall || noLiability || actionLoading || alreadyClosing;
      return (
        <View key={item?._id || index} style={[styles.card, { borderBottomColor: borderThemeColor }]}>
          <View style={[styles.cardHeader, { alignItems: "flex-start", marginBottom: 12 }]}>
            <View>
              <AppText style={[styles.pairText, { color: textThemeColor }]} weight={BOLD}>
                {`${cardBaseSymbol}/${cardQuoteSymbol}`}
              </AppText>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                <View style={{
                  borderWidth: 1,
                  borderColor: isLong ? themeColors.spotTradeBuy || colors.green : themeColors.spotTradeSell || colors.red,
                  borderRadius: 3,
                  paddingHorizontal: 5,
                  paddingVertical: 1,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <AppText style={{ color: isLong ? themeColors.spotTradeBuy || colors.green : themeColors.spotTradeSell || colors.red, fontSize: 12 }} weight={BOLD}>
                    {isLong ? "L" : "S"}
                  </AppText>
                </View>
                <AppText style={{ color: secondaryTextThemeColor, fontSize: 12 }}>{marginMode}</AppText>
                {!!item?.leverage && (
                  <AppText style={{ color: secondaryTextThemeColor, fontSize: 12 }}>{item.leverage}x</AppText>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: "#374151",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 4,
                opacity: closeDisabled ? 0.5 : 1,
              }}
              disabled={closeDisabled}
              onPress={() => {
                if (noLiability) {
                  SimpleToast.show("There is no liability on this position");
                  return;
                }
                if (tooSmall) {
                  SimpleToast.show(`Only supports positions with a value >= ${minNotional} USDT. Try transfer to spot.`);
                  return;
                }
                handleClosePosition(item);
              }}
              activeOpacity={closeDisabled ? 0.5 : 0.8}
            >
              <AppText style={{ color: colors.white, fontSize: 12 }} weight={MEDIUM}>
                {isThisClosing || alreadyClosing ? "Closing…" : "Market Close"}
              </AppText>
            </TouchableOpacity>
          </View>

          <View style={styles.grid}>
            <View style={styles.kvRow}>
              <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Holding</AppText>
              <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{toFixedEight(item?.quantity ?? item?.net_quantity ?? item?.size)}</AppText>
            </View>
            <View style={styles.kvRow}>
              <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Value</AppText>
              <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>
                {toFixedFour(item?.notional ?? item?.value_usdt ?? item?.value)} {cardQuoteSymbol || ""}
              </AppText>
            </View>
            <View style={styles.kvRow}>
              <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Entry Price</AppText>
              <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>
                {(!item?.entry_price || parseFloat(item?.entry_price) === 0) ? "—" : toFixedFour(item?.entry_price)}
              </AppText>
            </View>
            <View style={styles.kvRow}>
              <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Index Price</AppText>
              <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{toFixedFour(item?.index_price ?? item?.mark_price)}</AppText>
            </View>
            {marginMode !== "Cross" && (
              <>
                <View style={styles.kvRow}>
                  <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Est. Liq. Price</AppText>
                  <AppText style={[styles.value, { color: colors.cyanTheme }]} weight={SEMI_BOLD}>
                    {(item?.liquidation_price != null || item?.warning_price != null) ? toFixedTwo(item?.liquidation_price ?? item?.warning_price) : "—"}
                  </AppText>
                </View>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    const row = buildMarginRiskRow({
                      ...marginAccountData,
                      ...item,
                      pair_id: item?.pair_id || pairId,
                      pair: item?.pair || `${cardBaseSymbol}${cardQuoteSymbol}`,
                      pairRaw: `${cardBaseSymbol}/${cardQuoteSymbol}`,
                    }, pairId);
                    setIsolatedRiskRow(row);
                    rbSheetIsolatedRisk.current?.open();
                  }}
                  style={styles.kvRow}
                >
                  <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Maint. Margin</AppText>
                  <View style={{ flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                    <AppText style={{ fontSize: 13, color: mlStatus.color, textAlign: "right" }} weight={SEMI_BOLD}>
                      {maintMarginDisplay}
                    </AppText>
                    <FastImage
                      source={INFO}
                      style={{ height: 12, width: 12 }}
                      resizeMode="contain"
                      tintColor={secondaryTextThemeColor}
                    />
                  </View>
                </TouchableOpacity>
              </>
            )}
            <View style={styles.kvRow}>
              <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Unrealized PnL</AppText>
              <AppText style={[styles.value, { color: getSideColor(parseFloat(item?.unrealized_pnl || 0) >= 0 ? "LONG" : "SHORT") }]} weight={SEMI_BOLD}>
                {`${parseFloat(item?.unrealized_pnl || 0) >= 0 ? "+" : ""}${parseFloat(item?.unrealized_pnl || 0).toFixed(4)} (${parseFloat(item?.unrealized_pnl_pct || 0) >= 0 ? "+" : ""}${parseFloat(item?.unrealized_pnl_pct || 0).toFixed(2)}%)`}
              </AppText>
            </View>
            <View style={styles.kvRow}>
              <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Realized PnL</AppText>
              <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>
                {parseFloat(item?.realized_pnl || 0).toFixed(4)}
              </AppText>
            </View>
          </View>
        </View>
      );
    }

    if (tabId === "positionHistory") {
      const isLong = item?.side === "LONG";
      const statusText = posStatusLabel(item);
      const { base: histBase, quote: histQuote } = splitPairAssets(item?.pair, baseSymbol, quoteSymbol);
      const entryDt = fmtHistDate(item?.opened_at || item?.created_at);
      const closeDt = fmtHistDate(item?.closed_at || item?.updated_at || item?.end_time);
      const rpnl = parseNum(item?.realized_pnl);
      const rpnlN = Number.isFinite(rpnl) ? rpnl : 0;
      const feesN = parseNum(item?.total_fees);
      const qtyN = parseNum(item?.quantity);
      const notionalN = parseNum(item?.notional);
      const liqFee = formatMarginLiqFee(item, histQuote);

      return (
        <View key={item?._id || item?.position_id || index} style={[styles.histCard, { borderBottomColor: borderThemeColor }]}>
          {/* Row 1: Spot/Leverage | Side */}
          <View style={styles.histRow}>
            <View style={styles.histCellLeft}>
              <AppText style={[styles.histLabel, { color: secondaryTextThemeColor }]} weight={MEDIUM}>Spot/Leverage</AppText>
              <View style={styles.pairRow}>
                <AppText style={[styles.histPairText, { color: textThemeColor }]} weight={BOLD}>
                  {histBase && histQuote ? `${histBase}/${histQuote}` : "—"}
                </AppText>
                <View style={[styles.tagPill, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#EAEAEA" }]}>
                  <AppText style={[styles.tagText, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Isolated</AppText>
                </View>
              </View>
              <View style={[styles.statusTagPill, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#EAEAEA" }]}>
                <AppText style={[styles.statusTagText, { color: textThemeColor }]} weight={SEMI_BOLD}>
                  {statusText}
                </AppText>
              </View>
            </View>

            <View style={styles.histCellRight}>
              <AppText style={[styles.histLabel, { color: secondaryTextThemeColor }]} weight={MEDIUM}>Side</AppText>
              <AppText style={{ color: getSideColor(item?.side === "LONG" ? "LONG" : "SHORT"), fontSize: 16 }} weight={BOLD}>
                {item?.side === "LONG" || item?.side === "BUY" ? "L" : "S"}
              </AppText>
            </View>
          </View>

          {/* Row 2: Entry Time | Close-All Time */}
          <View style={styles.histRow}>
            <View style={styles.histCellLeft}>
              <AppText style={[styles.histLabel, { color: secondaryTextThemeColor }]} weight={MEDIUM}>Entry Time</AppText>
              <AppText style={[styles.histValPrimary, { color: textThemeColor }]} weight={SEMI_BOLD}>{entryDt.date}</AppText>
              <AppText style={[styles.histValSecondary, { color: secondaryTextThemeColor }]} weight={MEDIUM}>{entryDt.time}</AppText>
            </View>

            <View style={styles.histCellRight}>
              <AppText style={[styles.histLabel, { color: secondaryTextThemeColor }]} weight={MEDIUM}>Close-All Time</AppText>
              <AppText style={[styles.histValPrimary, { color: textThemeColor }]} weight={SEMI_BOLD}>{closeDt.date}</AppText>
              <AppText style={[styles.histValSecondary, { color: secondaryTextThemeColor }]} weight={MEDIUM}>{closeDt.time}</AppText>
            </View>
          </View>

          {/* Row 3: Entry Price | Exit Price */}
          <View style={styles.histRow}>
            <View style={styles.histCellLeft}>
              <AppText style={[styles.histLabel, { color: secondaryTextThemeColor }]} weight={MEDIUM}>Entry Price</AppText>
              <AppText style={[styles.histValPrimary, { color: textThemeColor }]} weight={SEMI_BOLD}>
                {toFixedFour(item?.entry_price)} <AppText style={{ color: secondaryTextThemeColor, fontSize: 12 }}>{histQuote}</AppText>
              </AppText>
            </View>

            <View style={styles.histCellRight}>
              <AppText style={[styles.histLabel, { color: secondaryTextThemeColor }]} weight={MEDIUM}>Exit Price</AppText>
              <AppText style={[styles.histValPrimary, { color: textThemeColor }]} weight={SEMI_BOLD}>
                {item?.close_price ? toFixedFour(item.close_price) : "—"} <AppText style={{ color: secondaryTextThemeColor, fontSize: 12 }}>{histQuote}</AppText>
              </AppText>
            </View>
          </View>

          {/* Row 4: Peak Position | Notional */}
          <View style={styles.histRow}>
            <View style={styles.histCellLeft}>
              <AppText style={[styles.histLabel, { color: secondaryTextThemeColor }]} weight={MEDIUM}>Peak Position</AppText>
              <AppText style={[styles.histValPrimary, { color: textThemeColor }]} weight={SEMI_BOLD}>
                {Number.isFinite(qtyN) && qtyN > 0 ? toFixedFour(qtyN) : "—"} <AppText style={{ color: secondaryTextThemeColor, fontSize: 12 }}>{histBase}</AppText>
              </AppText>
            </View>

            <View style={styles.histCellRight}>
              <AppText style={[styles.histLabel, { color: secondaryTextThemeColor }]} weight={MEDIUM}>Notional</AppText>
              <AppText style={[styles.histValPrimary, { color: textThemeColor }]} weight={SEMI_BOLD}>
                {Number.isFinite(notionalN) && notionalN > 0 ? toFixedFour(notionalN) : "—"} <AppText style={{ color: secondaryTextThemeColor, fontSize: 12 }}>{histQuote}</AppText>
              </AppText>
            </View>
          </View>

          {/* Row 5: Realized PnL | Fees */}
          <View style={styles.histRow}>
            <View style={styles.histCellLeft}>
              <AppText style={[styles.histLabel, { color: secondaryTextThemeColor }]} weight={MEDIUM}>Realized PnL</AppText>
              <AppText style={{ color: getSideColor(rpnlN >= 0 ? "LONG" : "SHORT"), fontSize: 14 }} weight={SEMI_BOLD}>
                {rpnlN >= 0 ? "+" : ""}{rpnlN.toFixed(4)} <AppText style={{ color: secondaryTextThemeColor, fontSize: 12 }}>{histQuote}</AppText>
              </AppText>
            </View>

            <View style={styles.histCellRight}>
              <AppText style={[styles.histLabel, { color: secondaryTextThemeColor }]} weight={MEDIUM}>Fees</AppText>
              <AppText style={[styles.histValPrimary, { color: textThemeColor }]} weight={SEMI_BOLD}>
                {Number.isFinite(feesN) && feesN !== 0 ? toFixedFour(feesN) : "—"} <AppText style={{ color: secondaryTextThemeColor, fontSize: 12 }}>{histQuote}</AppText>
              </AppText>
            </View>
          </View>

          {/* Row 6: Liq. Fee */}
          <View style={styles.histRow}>
            <View style={styles.histCellLeft}>
              <AppText style={[styles.histLabel, { color: secondaryTextThemeColor }]} weight={MEDIUM}>Liq. Fee</AppText>
              <AppText style={[styles.histValPrimary, { color: textThemeColor }]} weight={SEMI_BOLD}>
                {liqFee ? `${liqFee.value}${liqFee.asset ? ` ${liqFee.asset}` : ""}` : "—"}
              </AppText>
            </View>
          </View>
        </View>
      );
    }

    if (tabId === "positions") {
      // Open Orders
      const orderId = item?._id?.$oid || item?._id || item?.order_id || item?.id;
      const m = moment(item?.created_at || item?.timestamp);
      const dateStr = m.isValid() ? m.format("DD/MM/YYYY") : "—";
      const timeStr = m.isValid() ? m.format("HH:mm:ss") : "—";
      const typeStr = (item?.type || item?.order_type || "LIMIT").toUpperCase();
      const sideStr = (item?.side || "").toUpperCase();
      const priceStr = typeStr === "MARKET" ? "Market" : toFixedEight(item?.price);
      const qtyStr = toFixedEight(item?.quantity || item?.amount);

      return (
        <TouchableOpacity
          key={orderId || index}
          style={[styles.card, { borderBottomColor: borderThemeColor }]}
          activeOpacity={0.8}
          onPress={() => NavigationService.navigate(SPOT_ORDER_HISTORY_DETAIL, { item })}
        >
          <View style={[styles.cardHeader, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <AppText style={[styles.pairText, { color: textThemeColor }]} weight={BOLD}>
                {`${baseSymbol}/${quoteSymbol}`}
              </AppText>
              <FastImage source={right_ic} tintColor={secondaryTextThemeColor} style={{ width: 14, height: 14 }} resizeMode="contain" />
            </View>
          </View>
          <AppText style={{ color: getSideColor(item?.side), marginBottom: 12, marginTop: -4 }} weight={SEMI_BOLD} type={TWELVE}>
            {sideStr} · {typeStr}
          </AppText>
          <View style={styles.grid}>
            <View style={styles.kvRow}>
              <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Date</AppText>
              <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{dateStr}</AppText>
            </View>
            <View style={styles.kvRow}>
              <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Time</AppText>
              <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{timeStr}</AppText>
            </View>
            <View style={styles.kvRow}>
              <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Side</AppText>
              <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{sideStr}</AppText>
            </View>
            <View style={styles.kvRow}>
              <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Type</AppText>
              <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{typeStr}</AppText>
            </View>
            <View style={styles.kvRow}>
              <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>TIF</AppText>
              <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{item?.time_in_force || "GTC"}</AppText>
            </View>
            <View style={styles.kvRow}>
              <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Price</AppText>
              <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{priceStr}</AppText>
            </View>
            <View style={styles.kvRow}>
              <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Quantity</AppText>
              <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{qtyStr}</AppText>
            </View>
          </View>
          <View style={[styles.actionRow, { justifyContent: "flex-end", marginTop: 16 }]}>
            <TouchableOpacity
              style={{
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: themeColors.red,
                borderRadius: 4,
                opacity: cancelLoading && orderToCancel === orderId ? 0.6 : 1,
              }}
              onPress={() => handleCancelOrder(orderId)}
              disabled={cancelLoading}
              activeOpacity={0.8}
            >
              <AppText style={{ color: themeColors.red, fontSize: 14 }} weight={MEDIUM}>Cancel order</AppText>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    }

    if (tabId === "orderHistory") {
      return (
        <OrderHistoryCard
          key={item?._id || item?.order_id || index}
          item={item}
          index={index}
          baseSymbol={baseSymbol}
          quoteSymbol={quoteSymbol}
          borderThemeColor={borderThemeColor}
          textThemeColor={textThemeColor}
          secondaryTextThemeColor={secondaryTextThemeColor}
          isDark={isDark}
          themeColors={themeColors}
          getSideColor={getSideColor}
        />
      );
    }

    if (tabId === "tradeHistory") {
      const fillPxStr = toFixedEight(item?.price);
      const qtyStr = toFixedEight(item?.quantity ?? item?.amount);
      const totalStr = toFixedEight(item?.quote_quantity ?? (parseFloat(item?.quantity || item?.amount || 0) * parseFloat(item?.price || 0)));

      const isMaker = item?.maker ?? item?.isMaker ?? item?.is_maker;
      const roleStr = isMaker != null ? (isMaker ? "Maker" : "Taker") : (item?.role || "—");

      const feeStr = `${toFixedEight(item?.fee)} ${item?.fee_asset || item?.fee_currency || quoteSymbol}`;

      const tDate = item?.executed_at || item?.executedAt || item?.created_at || item?.createdAt || item?.time || item?.timestamp;
      const timeMoment = tDate ? moment(tDate) : null;
      const timeStr = timeMoment?.isValid() ? timeMoment.format("YYYY-MM-DD HH:mm:ss") : "---";

      return (
        <View key={item?._id || index} style={[styles.card, { borderBottomColor: borderThemeColor }]}>
          <View style={styles.cardHeader}>
            <AppText style={[styles.pairText, { color: textThemeColor }]} weight={BOLD}>
              {`${baseSymbol}/${quoteSymbol}`}
            </AppText>
          </View>
          <AppText style={{ color: getSideColor(item?.side), marginBottom: 6 }} weight={SEMI_BOLD} type={TWELVE}>
            {item?.side} · {roleStr}
          </AppText>
          <View style={styles.grid}>
            <View style={styles.kvRow}>
              <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Side</AppText>
              <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{item?.side || "—"}</AppText>
            </View>
            <View style={styles.kvRow}>
              <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Fill Price</AppText>
              <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{fillPxStr} {quoteSymbol}</AppText>
            </View>
            <View style={styles.kvRow}>
              <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Amount</AppText>
              <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{qtyStr} {baseSymbol}</AppText>
            </View>
            <View style={styles.kvRow}>
              <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Total</AppText>
              <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{totalStr} {quoteSymbol}</AppText>
            </View>
            <View style={styles.kvRow}>
              <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Time</AppText>
              <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{timeStr}</AppText>
            </View>
            <View style={styles.kvRow}>
              <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Role</AppText>
              <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{roleStr}</AppText>
            </View>
            <View style={styles.kvRow}>
              <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Fee</AppText>
              <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{feeStr}</AppText>
            </View>
          </View>
        </View>
      );
    }

    if (tabId === "loanManagement") {
      return (
        <View
          key={item?.loan_id || item?._id || index}
          style={{
            backgroundColor: isDark ? colors.bottomsheetDark || "#1E1E1E" : colors.white,
            borderRadius: 8,
            paddingVertical: 12,
            paddingHorizontal: 14,
            marginBottom: 8,
            borderBottomColor: borderThemeColor,
            borderBottomWidth: 1,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <AppText style={{ color: textThemeColor, fontSize: 16 }} weight={BOLD}>
                {item?.coin || item?.asset || "—"}
              </AppText>
              {item?.contract && (
                <AppText style={{ color: secondaryTextThemeColor, fontSize: 14 }}>
                  {item.contract.endsWith("USDT") || item.contract.endsWith("USDC") ? `${item.contract.slice(0, -4)}/${item.contract.slice(-4)}` : item.contract}
                </AppText>
              )}
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: "#374151",
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 4,
              }}
              onPress={() => {
                NavigationService.navigate(MARGIN_BORROW_REPAY_SCREEN, {
                  pair: `${baseSymbol}/${quoteSymbol}`,
                  coin: item?.coin || item?.asset,
                  activeTab: "Repay",
                  loan: item,
                  marginMode
                });
              }}
              activeOpacity={0.8}
            >
              <AppText style={{ color: colors.white, fontSize: 12 }} weight={MEDIUM}>
                Repay
              </AppText>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <AppText style={{ color: secondaryTextThemeColor, fontSize: 13 }}>Hourly Rate / APR</AppText>
            <AppText style={{ color: textThemeColor, fontSize: 13 }} weight={MEDIUM}>
              {(() => {
                const COIN_RATES = {
                  BNB: { hourly: "0.00034929", annual: "3.05977500" },
                  USDT: { hourly: "0.00038596", annual: "3.38099500" },
                  BTC: { hourly: "0.00004663", annual: "0.40843500" },
                  ETH: { hourly: "0.00008219", annual: "0.71998440" },
                  "0G": { hourly: "0.00050000", annual: "4.38000000" },
                  "1INCH": { hourly: "0.00037917", annual: "3.32150000" },
                  "2Z": { hourly: "0.00062500", annual: "5.47500000" },
                };
                const cAsset = item?.coin || item?.asset;
                const rateFromMap = COIN_RATES[cAsset];
                let hRate = item?.hourly_rate_pct != null ? `${item.hourly_rate_pct}%` : (item?.hourly_rate != null ? `${(parseFloat(item.hourly_rate) * 100).toFixed(6)}%` : null);
                let aRate = item?.apr_pct != null ? `${item.apr_pct}%` : null;

                if (!hRate) {
                  hRate = rateFromMap ? `${rateFromMap.hourly}%` : (marginMode === "Cross" ? "0.002000%" : "—");
                }
                if (!aRate) {
                  aRate = rateFromMap ? `${rateFromMap.annual}%` : (marginMode === "Cross" ? "17.520000%" : "—");
                }

                return `${hRate} / ${aRate}`;
              })()}
            </AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText style={{ color: secondaryTextThemeColor, fontSize: 13 }}>Outstanding Loan</AppText>
            <AppText style={{ color: textThemeColor, fontSize: 13 }} weight={MEDIUM}>
              {item?.outstanding != null
                ? `${parseFloat(item.outstanding).toFixed(8)} ${item?.coin || item?.asset || ""}`
                : "—"}
            </AppText>
          </View>
        </View>
      );
    }

    if (tabId === "assetHistory") {
      const rawPair = item?.pair || pairSymbol;
      const displayPair = rawPair ? (rawPair.endsWith("USDT") ? rawPair.slice(0, -4) + "/USDT" : rawPair.endsWith("USDC") ? rawPair.slice(0, -4) + "/USDC" : rawPair) : "—";
      const displayAsset = item?.asset || item?.coin || "—";
      return (
        <View key={item?.id || index} style={[styles.card, { borderBottomColor: borderThemeColor }]}>
          <View style={styles.cardHeader}>
            <AppText style={[styles.pairText, { color: textThemeColor }]} weight={BOLD}>
              {displayPair}
            </AppText>
            <AppText style={[styles.timeText, { color: secondaryTextThemeColor }]} weight={MEDIUM}>
              {fmtDate(item?.time || item?.created_at || item?.timestamp || item?.createdAt || item?.executed_at)}
            </AppText>
          </View>
          <View style={styles.grid}>
            <View style={styles.kvRow}>
              <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Coin</AppText>
              <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{displayAsset !== "—" ? displayAsset : displayPair}</AppText>
            </View>
            {subTab === "transfer" && (
              <>
                <View style={styles.kvRow}>
                  <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Type</AppText>
                  <AppText style={[styles.value, { color: getSideColor((item?.transferType || item?.type || "").toLowerCase().includes("in") ? "LONG" : "SHORT") }]} weight={SEMI_BOLD}>
                    {item?.transferType || item?.type || "—"}
                  </AppText>
                </View>
                <View style={styles.kvRow}>
                  <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>From</AppText>
                  <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{formatWalletName(item?.from)}</AppText>
                </View>
                <View style={styles.kvRow}>
                  <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>To</AppText>
                  <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{formatWalletName(item?.to)}</AppText>
                </View>
              </>
            )}
            {subTab === "interest" && (
              <>
                <View style={styles.kvRow}>
                  <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Amount</AppText>
                  <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{toFixedEight(item?.amount || item?.amount_charged)}</AppText>
                </View>
                <View style={styles.kvRow}>
                  <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Loan Amt</AppText>
                  <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{toFixedEight(item?.loanAmount || item?.loan_amount)}</AppText>
                </View>
                <View style={styles.kvRow}>
                  <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>APR</AppText>
                  <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{item?.apr != null ? (String(item.apr).includes("%") ? item.apr : (parseFloat(item.apr) * 100).toFixed(4) + "%") : "—"}</AppText>
                </View>
              </>
            )}
            {subTab !== "interest" && (
              <View style={styles.kvRow}>
                <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Amount</AppText>
                <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{toFixedEight(item?.amount)}</AppText>
              </View>
            )}
            <View style={styles.kvRow}>
              <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Status</AppText>
              <AppText style={[styles.value, { color: getSideColor("LONG") }]} weight={SEMI_BOLD}>
                {item?.status || "Completed"}
              </AppText>
            </View>
          </View>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Primary Tab Bar */}
      <View style={[styles.tabsContainer, {}]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 10 }}>
          {currentTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabButton}
                activeOpacity={0.8}
                onPress={() => {
                  if (tab.id === activeTab) return;
                  setActiveTab(tab.id);
                }}
              >
                <AppText
                  style={{ color: isActive ? textThemeColor : secondaryTextThemeColor, fontSize: 14 }}
                  weight={SEMI_BOLD}
                >
                  {tab.label}
                </AppText>
                <View
                  style={[
                    styles.activeIndicator,
                    { backgroundColor: isActive ? (colors.cyanTheme || "#0AA8C5") : "transparent" },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Sub tabs for Asset History */}
      {activeTab === "assetHistory" && (
        <View style={styles.subTabsContainer}>
          {AH_SUB_TABS.map((st) => {
            const isSubActive = subTab === st.id;
            return (
              <TouchableOpacity
                key={st.id}
                style={[
                  styles.subTabButton,
                  {
                    backgroundColor: isSubActive ? (isDark ? "rgba(255,255,255,0.08)" : (themeColors.input || "#EAEAEA")) : "transparent",
                  },
                ]}
                activeOpacity={0.85}
                onPress={() => {
                  if (st.id === subTab) return;
                  setTabData((prev) => ({ ...prev, assetHistory: [] }));
                  setLoading(true);
                  setSubTab(st.id);
                }}
              >
                <AppText
                  style={[
                    styles.subTabText,
                    { color: isSubActive ? textThemeColor : secondaryTextThemeColor },
                  ]}
                  weight={MEDIUM}
                >
                  {st.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {activeTab === "positions" && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 12, paddingHorizontal: 8 }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {["All", "Limit", "Market"].map(label => (
              <TouchableOpacity
                key={label}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 4,
                  backgroundColor: openOrderTypeFilter === label ? (isDark ? (themeColors.input || "#333") : (themeColors.input || "#EAEAEA")) : "transparent",
                }}
                onPress={() => setOpenOrderTypeFilter(label)}
              >
                <AppText style={{ color: openOrderTypeFilter === label ? textThemeColor : secondaryTextThemeColor, fontSize: 13 }} weight={MEDIUM}>{label}</AppText>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 2, alignSelf: "flex-start" }}>
            <View style={{ width: 102 }}>
              <CustomDropdown
                compact
                data={["All Sides", "Buy", "Sell"]}
                selected={openOrderSideFilter}
                onSelect={(label) => setOpenOrderSideFilter(label)}
              />
            </View>
            <TouchableOpacity
              onPress={() => {
                setOpenOrderTypeFilter("All");
                setOpenOrderSideFilter("All Sides");
                fetchTabDetails();
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingVertical: 4,
                paddingLeft: 4,
                marginLeft: 2,
              }}
            >
              <FastImage source={Refresh} style={{ width: 12, height: 12 }} tintColor={isDark ? colors.white : colors.black} resizeMode="contain" />
              <AppText weight={MEDIUM} style={{ fontSize: 12, color: secondaryTextThemeColor }}>Reset</AppText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {activeTab === "orderHistory" && (
        <View style={{ marginVertical: 12, paddingHorizontal: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 10 }}>
            {["All", "Limit", "Market", "Stop Limit", "Stop Market"].map(label => (
              <TouchableOpacity
                key={label}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 4,
                  backgroundColor: orderHistoryTypeFilter === label ? (isDark ? (themeColors.input || "#333") : (themeColors.input || "#EAEAEA")) : "transparent",
                }}
                onPress={() => setOrderHistoryTypeFilter(label)}
              >
                <AppText style={{ color: orderHistoryTypeFilter === label ? textThemeColor : secondaryTextThemeColor, fontSize: 13 }} weight={MEDIUM}>{label}</AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content panel */}
      <View style={[{ overflow: 'hidden', minHeight: 150 }, isFullScreen && { flex: 1 }]}>
        {!userData ? (
          renderNoData()
        ) : loading ? (
          <HistorySectionLoader color={textThemeColor} />
        ) : (
          <View style={[{ width: "100%" }, isFullScreen && { flex: 1 }]}>
            {currentTabs.map((tab, idx) => {
              if (tab.id !== activeTab) return null;
              const listData = getFilteredDataList(tab.id);
              const dataToRender = isFullScreen ? listData : listData.slice(0, 5);
              return (
                <View key={tab.id} style={[{ width: slideWidth }, isFullScreen && { flex: 1 }]}>
                  {dataToRender.length === 0 ? (
                    renderNoData()
                  ) : (
                    <>
                      <FlatList
                        style={{ flexGrow: 0 }}
                        data={dataToRender}
                        renderItem={({ item, index }) => renderItemCard(item, index, tab.id)}
                        keyExtractor={(item, index) => item?._id || item?.id || item?.order_id || index.toString()}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 24 }}
                        initialNumToRender={isFullScreen ? 10 : 5}
                        windowSize={5}
                        maxToRenderPerBatch={isFullScreen ? 10 : 5}
                        removeClippedSubviews={true}
                      />
                      {!isFullScreen && listData.length > 5 && (
                        <TouchableOpacity
                          style={styles.viewAllButton}
                          onPress={() => NavigationService.navigate("MARGIN_HISTORY_SCREEN", { activeTab: tab.id, currencyData })}
                        >
                          <AppText style={[styles.viewAllText, { color: colors.buttonBg }]}>View More</AppText>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {(actionLoading && !closePositionModal) && (
          <View style={[StyleSheet.absoluteFill, {
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10,
            backgroundColor: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.6)',
          }]}>
            <ActivityIndicator size="large" color={isDark ? colors.white : colors.black} />
          </View>
        )}

        <Modal
          visible={cancelModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeCancelModal}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.6)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={closeCancelModal}
              style={StyleSheet.absoluteFillObject}
              disabled={cancelLoading}
            />
            <View
              style={{
                backgroundColor: isDark ? themeColors.sheetDarkColor || themeColors.background : themeColors.themeElevationColor || colors.white,
                borderRadius: 20,
                padding: 25,
                width: "85%",
                alignSelf: "center",
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.25,
                shadowRadius: 20,
                elevation: 10,
                borderWidth: 1,
                borderColor: themeColors.themeBorderColor || (isDark ? "#333" : "#e5e7eb"),
              }}
            >
              <AppText
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: textThemeColor,
                  textAlign: "center",
                  marginBottom: 15,
                }}
              >
                Cancel Order
              </AppText>
              <AppText
                style={{
                  fontSize: 15,
                  color: secondaryTextThemeColor,
                  textAlign: "center",
                  marginBottom: 25,
                  lineHeight: 22,
                }}
              >
                Are you sure you want to cancel this order?
              </AppText>
              <View style={{ flexDirection: "row", width: "100%", gap: 10 }}>
                <TouchableOpacity
                  onPress={closeCancelModal}
                  disabled={cancelLoading}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    backgroundColor: themeColors.themeElevationColor || (isDark ? "#2C2C2E" : "#F3F4F6"),
                    borderWidth: 1,
                    borderColor: themeColors.themeBorderColor || (isDark ? "#444" : "#e5e7eb"),
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: cancelLoading ? 0.6 : 1,
                  }}
                >
                  <AppText style={{ fontSize: 14, fontWeight: "600", color: textThemeColor }}>
                    No
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmCancelOrder}
                  disabled={cancelLoading}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    backgroundColor: themeColors.red || colors.red,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: cancelLoading ? 0.85 : 1,
                  }}
                >
                  {cancelLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <AppText style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
                      Yes
                    </AppText>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <IsolatedMarginRiskModal
          ref={rbSheetIsolatedRisk}
          row={isolatedRiskRow}
        />

        {/* Close Position Modal */}
        <Modal
          visible={closePositionModal}
          transparent={true}
          animationType="slide"
          onRequestClose={dismissCloseSheet}
          statusBarTranslucent={true}
        >
          <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
            {marginMode !== "Cross" ? (() => {
              const isLong = selectedPosToClose?.side === "LONG";
              const pairStr = selectedPosToClose?.pair || "";
              const baseAsset = pairStr ? pairStr.slice(0, -4) : baseSymbol;
              const quoteAsset = pairStr ? pairStr.slice(-4) : quoteSymbol;
              const pairLabel = baseAsset && quoteAsset ? `${baseAsset}/${quoteAsset}` : "—";
              const qtyN = parseFloat(selectedPosToClose?.quantity);
              const holdStr = Number.isFinite(qtyN) && qtyN > 0
                ? qtyN.toFixed(8).replace(/\.?0+$/, "")
                : "—";
              const notionalN = parseFloat(selectedPosToClose?.notional);
              const notionalStr = Number.isFinite(notionalN) && notionalN > 0
                ? notionalN.toFixed(4)
                : "—";
              return (
                <View style={{
                  backgroundColor: isDark ? themeColors.background || "#1E1E1E" : colors.white,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  padding: 16,
                  paddingBottom: 32,
                }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <AppText style={{ color: textThemeColor, fontSize: 18 }} weight={BOLD}>Close Position</AppText>
                    <TouchableOpacity
                      onPress={dismissCloseSheet}
                      disabled={actionLoading || closeConfirmVisible}
                      style={{ padding: 4, opacity: (actionLoading || closeConfirmVisible) ? 0.5 : 1 }}
                    >
                      <AppText style={{ color: secondaryTextThemeColor, fontSize: 20 }}>✕</AppText>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                    <AppText style={{ color: textThemeColor, fontSize: 13 }} weight={SEMI_BOLD}>{pairLabel}</AppText>
                    <AppText style={{ color: secondaryTextThemeColor }}>·</AppText>
                    <AppText style={{ color: secondaryTextThemeColor, fontSize: 13 }}>Isolated</AppText>
                    <AppText style={{ color: secondaryTextThemeColor }}>·</AppText>
                    <AppText style={{ color: isLong ? themeColors.spotTradeBuy || colors.green : themeColors.spotTradeSell || colors.red, fontSize: 13 }} weight={BOLD}>
                      {isLong ? "Long" : "Short"}
                    </AppText>
                  </View>

                  <View style={{
                    borderWidth: 1,
                    borderColor: isDark ? "#8B7355" : "#C9A66B",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 16,
                  }}>
                    <AppText style={{ color: textThemeColor, fontSize: 14, marginBottom: 6 }} weight={SEMI_BOLD}>Settle the position</AppText>
                    <AppText style={{ color: secondaryTextThemeColor, fontSize: 12, lineHeight: 18 }}>
                      Your full holding will be closed as a market order. Remaining assets stay in your Isolated Margin account for this pair.
                    </AppText>
                  </View>

                  <View style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
                      <AppText style={{ color: secondaryTextThemeColor, fontSize: 13 }}>Holding</AppText>
                      <AppText style={{ color: textThemeColor, fontSize: 13 }} weight={MEDIUM}>{holdStr} {baseAsset}</AppText>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
                      <AppText style={{ color: secondaryTextThemeColor, fontSize: 13 }}>Notional</AppText>
                      <AppText style={{ color: textThemeColor, fontSize: 13 }} weight={MEDIUM}>{notionalStr} {quoteAsset}</AppText>
                    </View>
                  </View>

                  <AppText style={{ color: secondaryTextThemeColor, fontSize: 12, lineHeight: 18, marginBottom: 8 }}>
                    Using Close Position for large sizes may result in losses due to market slippage. Only trading fees are charged.
                  </AppText>
                  <AppText style={{ color: secondaryTextThemeColor, fontSize: 12, lineHeight: 18, marginBottom: 20 }}>
                    Amounts received may differ due to the nature of market orders. Larger orders may experience higher slippage. Submit another request if your position is not fully settled.
                  </AppText>

                  <TouchableOpacity
                    style={{
                      backgroundColor: isDark ? colors.white : "#111827",
                      paddingVertical: 14,
                      borderRadius: 10,
                      alignItems: "center",
                      opacity: (actionLoading || closeConfirmVisible) ? 0.7 : 1,
                    }}
                    disabled={actionLoading || closeConfirmVisible}
                    onPress={requestCloseConfirm}
                  >
                    {actionLoading ? (
                      <ActivityIndicator size="small" color={isDark ? colors.black : colors.white} />
                    ) : (
                      <AppText style={{ color: isDark ? colors.black : colors.white, fontSize: 15 }} weight={BOLD}>Confirm</AppText>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })() : (
              <View style={{
                backgroundColor: isDark ? themeColors.background || "#1E1E1E" : colors.white,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                padding: 16,
                paddingBottom: 32,
              }}>
                {/* Header */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <AppText style={{ color: textThemeColor, fontSize: 18 }} weight={BOLD}>
                    Close by {closePositionType === "MARKET" ? "Market" : "Limit"}
                  </AppText>
                  <TouchableOpacity
                    onPress={dismissCloseSheet}
                    disabled={actionLoading}
                    style={{ padding: 4, opacity: actionLoading ? 0.5 : 1 }}
                  >
                    <AppText style={{ color: secondaryTextThemeColor, fontSize: 20 }}>✕</AppText>
                  </TouchableOpacity>
                </View>

                {/* Pair + Side Subtitle */}
                {(() => {
                  const isLong = selectedPosToClose?.side === "LONG";
                  return (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 }}>
                      <AppText style={{ color: textThemeColor, fontSize: 13 }} weight={SEMI_BOLD}>
                        {selectedPosToClose?.pair ? `${selectedPosToClose.pair.slice(0, -4)}/${selectedPosToClose.pair.slice(-4)}` : "—"}
                      </AppText>
                      <AppText style={{ color: secondaryTextThemeColor }}>·</AppText>
                      <AppText style={{ color: secondaryTextThemeColor, fontSize: 13 }}>Isolated</AppText>
                      <AppText style={{ color: secondaryTextThemeColor }}>·</AppText>
                      <AppText style={{ color: isLong ? themeColors.spotTradeBuy || colors.green : themeColors.spotTradeSell || colors.red, fontSize: 13 }} weight={BOLD}>
                        {isLong ? "L" : "S"}
                      </AppText>
                    </View>
                  );
                })()}

                {/* Type Toggle */}
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                  {["MARKET", "LIMIT"].map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => {
                        setClosePositionType(t);
                        if (t === "LIMIT") {
                          const maxQty = parseFloat(selectedPosToClose?.quantity || 0);
                          setClosePositionQty(maxQty > 0 ? maxQty.toFixed(8).replace(/\.?0+$/, "") : "");
                          setClosePositionSliderPct(100);
                        } else {
                          setClosePositionQty("");
                          setClosePositionSliderPct(0);
                        }
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 8,
                        alignItems: "center",
                        backgroundColor: closePositionType === t ? (isDark ? colors.white : "#111827") : (isDark ? darkTheme.darkThemeInputColor : "#f3f4f6"),
                        borderWidth: closePositionType === t ? 0 : 1,
                        borderColor: isDark ? "#444" : "#e5e7eb",
                      }}
                    >
                      <AppText style={{ color: closePositionType === t ? (isDark ? colors.black : colors.white) : textThemeColor, fontSize: 13 }} weight={MEDIUM}>
                        {t === "MARKET" ? "Market" : "Limit"}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Limit Price Input */}
                {closePositionType === "LIMIT" && (
                  <View style={{ marginBottom: 12, position: "relative" }}>
                    <TextInput
                      style={{
                        backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#f9fafb",
                        borderWidth: 1,
                        borderColor: isDark ? "#444" : "#e5e7eb",
                        borderRadius: 10,
                        padding: 12,
                        color: textThemeColor,
                        fontSize: 14,
                      }}
                      placeholder="Price"
                      placeholderTextColor={secondaryTextThemeColor}
                      keyboardType="numeric"
                      value={closePositionPrice}
                      onChangeText={setClosePositionPrice}
                    />
                    <View style={{ position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center" }}>
                      <AppText style={{ color: secondaryTextThemeColor, fontSize: 12 }}>
                        {selectedPosToClose?.pair ? selectedPosToClose.pair.slice(-4) : ""}
                      </AppText>
                    </View>
                  </View>
                )}

                {/* Size Input */}
                <View style={{ marginBottom: closePositionType === "LIMIT" ? 4 : 16, position: "relative" }}>
                  <AppText style={{ color: secondaryTextThemeColor, fontSize: 12, marginBottom: 4 }}>Size</AppText>
                  <View style={{ position: "relative" }}>
                    <TextInput
                      style={{
                        backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#f9fafb",
                        borderWidth: 1,
                        borderColor: isDark ? "#444" : "#e5e7eb",
                        borderRadius: 10,
                        padding: 12,
                        color: textThemeColor,
                        fontSize: 14,
                      }}
                      placeholder="0"
                      placeholderTextColor={secondaryTextThemeColor}
                      keyboardType="numeric"
                      editable={closePositionType === "LIMIT"}
                      value={closePositionType === "MARKET" ? (selectedPosToClose?.quantity || "") : closePositionQty}
                      onChangeText={(val) => {
                        setClosePositionQty(val);
                        const maxQty = parseFloat(selectedPosToClose?.quantity || 0);
                        const v = parseFloat(val || 0);
                        if (maxQty > 0) {
                          setClosePositionSliderPct(Math.min(100, Math.round((v / maxQty) * 100)));
                        }
                      }}
                    />
                    <View style={{ position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center" }}>
                      <AppText style={{ color: secondaryTextThemeColor, fontSize: 12 }}>
                        {selectedPosToClose?.pair ? selectedPosToClose.pair.slice(0, -4) : ""}
                      </AppText>
                    </View>
                  </View>
                </View>

                {/* Slider (Limit only) */}
                {closePositionType === "LIMIT" && (
                  <View style={{ marginBottom: 16, marginTop: 12 }}>
                    <CustomDraggableSlider
                      value={closePositionSliderPct}
                      onValueChange={(pct) => {
                        const maxQty = parseFloat(selectedPosToClose?.quantity || 0);
                        const qty = maxQty > 0 ? (maxQty * pct / 100) : 0;
                        setClosePositionQty(qty.toFixed(8).replace(/\.?0+$/, "") || "0");
                        setClosePositionSliderPct(pct);
                      }}
                      themeColors={themeColors}
                      isDark={isDark}
                    />
                  </View>
                )}

                {/* Info Rows */}
                <View style={{ borderTopWidth: 1, borderTopColor: isDark ? "#444" : "#f3f4f6", paddingTop: 12, marginBottom: 16 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                    <AppText style={{ color: secondaryTextThemeColor, fontSize: 12 }}>Holding</AppText>
                    <AppText style={{ color: textThemeColor, fontSize: 12 }} weight={MEDIUM}>
                      {selectedPosToClose?.quantity ? (Math.floor(parseFloat(selectedPosToClose.quantity) * 100000000) / 100000000).toFixed(8).replace(/\.?0+$/, "") : "—"} {selectedPosToClose?.pair ? selectedPosToClose.pair.slice(0, -4) : ""}
                    </AppText>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                    <AppText style={{ color: secondaryTextThemeColor, fontSize: 12 }}>Notional</AppText>
                    <AppText style={{ color: textThemeColor, fontSize: 12 }} weight={MEDIUM}>
                      {selectedPosToClose?.notional ? (Math.floor(parseFloat(selectedPosToClose.notional) * 10000) / 10000).toFixed(4) : "—"} {selectedPosToClose?.pair ? selectedPosToClose.pair.slice(-4) : ""}
                    </AppText>
                  </View>
                </View>

                {/* Warning */}
                {closePositionType === "MARKET" && (
                  <AppText style={{ color: "#d97706", fontSize: 12, marginBottom: 16 }}>
                    The system will cancel position orders and execute the position assets as a market order.
                  </AppText>
                )}

                {/* Footer */}
                <TouchableOpacity
                  style={{
                    backgroundColor: isDark ? colors.white : "#111827",
                    paddingVertical: 14,
                    borderRadius: 10,
                    alignItems: "center",
                    opacity: (actionLoading || closeConfirmVisible) ? 0.7 : 1,
                  }}
                  disabled={actionLoading || closeConfirmVisible}
                  onPress={requestCloseConfirm}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color={isDark ? colors.black : colors.white} />
                  ) : (
                    <AppText style={{ color: isDark ? colors.black : colors.white, fontSize: 15 }} weight={BOLD}>Confirm</AppText>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Modal>

        <Modal
          visible={closeConfirmVisible}
          transparent
          animationType="fade"
          onRequestClose={cancelCloseConfirm}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.6)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={cancelCloseConfirm}
              style={StyleSheet.absoluteFillObject}
              disabled={actionLoading}
            />
            <View
              style={{
                backgroundColor: isDark ? themeColors.sheetDarkColor || themeColors.background : themeColors.themeElevationColor || colors.white,
                borderRadius: 20,
                padding: 25,
                width: "85%",
                alignSelf: "center",
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.25,
                shadowRadius: 20,
                elevation: 10,
                borderWidth: 1,
                borderColor: themeColors.themeBorderColor || (isDark ? "#333" : "#e5e7eb"),
              }}
            >
              <AppText
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: textThemeColor,
                  textAlign: "center",
                  marginBottom: 15,
                }}
              >
                Close Position
              </AppText>
              <AppText
                style={{
                  fontSize: 15,
                  color: secondaryTextThemeColor,
                  textAlign: "center",
                  marginBottom: 25,
                  lineHeight: 22,
                }}
              >
                {marginMode === "Isolated"
                  ? "Are you sure you want to close this position?"
                  : `Are you sure you want to close this ${closePositionType === "MARKET" ? "market" : "limit"} position?`}
              </AppText>
              <View style={{ flexDirection: "row", width: "100%", gap: 10 }}>
                <TouchableOpacity
                  onPress={cancelCloseConfirm}
                  disabled={actionLoading}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    backgroundColor: themeColors.themeElevationColor || (isDark ? "#2C2C2E" : "#F3F4F6"),
                    borderWidth: 1,
                    borderColor: themeColors.themeBorderColor || (isDark ? "#444" : "#e5e7eb"),
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  <AppText style={{ fontSize: 14, fontWeight: "600", color: textThemeColor }}>
                    No
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={actionLoading}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    backgroundColor: themeColors.red || colors.red,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: actionLoading ? 0.85 : 1,
                  }}
                  onPress={submitClosePosition}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <AppText style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
                      Yes
                    </AppText>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
};

export default React.memo(MarginHistorySection);

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    flex: 1,
    paddingHorizontal: 8,
  },
  tabsContainer: {
    flexDirection: "row",
    paddingBottom: 4,
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  activeIndicator: {
    height: 2,
    marginTop: 4,
    minWidth: 24,
    borderRadius: 1,
  },
  subTabsContainer: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 8,
    paddingHorizontal: 8,
  },
  subTabButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  subTabText: {
    fontSize: 12,
  },
  card: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  pairText: {
    fontSize: 15,
  },
  timeText: {
    fontSize: 12,
  },
  grid: {
    gap: 5,
  },
  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 13,
    flex: 1,
  },
  value: {
    fontSize: 13,
    textAlign: "right",
    flex: 2,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
  },
  noDataContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  noDataText: {
    marginTop: 10,
    fontSize: 14,
  },
  loaderContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  histCard: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  histRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  viewAllButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    backgroundColor: 'transparent',
    borderRadius: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  histCellLeft: {
    flex: 1,
    alignItems: "flex-start",
  },
  histCellRight: {
    flex: 1,
    alignItems: "flex-end",
    textAlign: "right",
  },
  histLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  histValPrimary: {
    fontSize: 14,
  },
  histValSecondary: {
    fontSize: 12,
    marginTop: 2,
  },
  histPairText: {
    fontSize: 16,
  },
  pairRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  tagPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 11,
  },
  statusTagPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  statusTagText: {
    fontSize: 12,
  },
});

const OrderHistoryCard = React.memo(({ item, index, baseSymbol, quoteSymbol, borderThemeColor, textThemeColor, secondaryTextThemeColor, isDark, themeColors, getSideColor }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const orderId = item?._id || item?.order_id || index;
  const m = moment(item?.created_at || item?.timestamp);
  const dateStr = m.isValid() ? m.format("YYYY-MM-DD") : "—";
  const timeStr = m.isValid() ? m.format("HH:mm:ss") : "—";
  const typeStr = (item?.type || item?.order_type || "LIMIT").toUpperCase();
  const sideStr = (item?.side || "").toUpperCase();
  const isMarket = typeStr === "MARKET" || typeStr === "STOP_MARKET";
  const priceStr = isMarket ? "Smart Market" : `${toFixedEight(item?.price)} ${quoteSymbol}`;
  const fillPxStr = item?.avg_execution_price ? `${toFixedEight(item?.avg_execution_price)} ${quoteSymbol}` : "—";

  const filledNum = parseNum(item?.filled_quantity ?? item?.filled) || 0;
  const qtyNum = parseNum(item?.quantity) || 0;
  const fillPctRaw = qtyNum > 0 ? ((filledNum / qtyNum) * 100).toFixed(2) : "0.00";
  const fillPctStr = `${fillPctRaw}%`;

  const tifLabel = item?.time_in_force || item?.tif;
  const finalTif = tifLabel ? String(tifLabel).toUpperCase() : "—";

  const rawExecutions = (Array.isArray(item?.executed_prices) && item.executed_prices.length > 0)
    ? item.executed_prices
    : (Array.isArray(item?.executions) ? item.executions : []);

  return (
    <TouchableOpacity
      key={orderId || index}
      style={[styles.card, { borderBottomColor: borderThemeColor }]}
      activeOpacity={0.8}
      onPress={() => NavigationService.navigate(SPOT_ORDER_HISTORY_DETAIL, { item, isMargin: true })}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <TouchableOpacity style={{ flexDirection: "row", alignItems: "center" }}>
          <AppText style={{ color: textThemeColor, fontSize: 16 }} weight={BOLD}>
            {`${baseSymbol}/${quoteSymbol}`}
          </AppText>
          <FastImage source={right_ic} tintColor={textThemeColor} style={{ width: 12, height: 12, marginLeft: 6, marginTop: 2 }} resizeMode="contain" />
        </TouchableOpacity>
      </View>
      <AppText style={{ color: getSideColor(item?.side), marginBottom: 12, marginTop: -4 }} weight={SEMI_BOLD} type={TWELVE}>
        {sideStr} · {finalTif}
      </AppText>
      <View style={styles.grid}>
        <View style={styles.kvRow}>
          <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Creation Time</AppText>
          <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{dateStr} {timeStr}</AppText>
        </View>
        <View style={styles.kvRow}>
          <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Fill Price</AppText>
          <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{fillPxStr}</AppText>
        </View>
        <View style={styles.kvRow}>
          <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Price</AppText>
          <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{priceStr}</AppText>
        </View>
        <View style={styles.kvRow}>
          <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Filled/Amount</AppText>
          <AppText style={[styles.value, { color: textThemeColor }]} weight={SEMI_BOLD}>{toFixedEight(item?.filled_quantity ?? item?.filled)}/{toFixedEight(item?.quantity)} · {fillPctStr}</AppText>
        </View>
        <View style={styles.kvRow}>
          <AppText style={[styles.label, { color: secondaryTextThemeColor }]} weight={SEMI_BOLD}>Status</AppText>
          <AppText style={[styles.value, { color: getSideColor("LONG") }]} weight={SEMI_BOLD}>{item?.status || "—"}</AppText>
        </View>
      </View>

      {rawExecutions.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={{
              alignSelf: "flex-end",
              paddingVertical: 4,
              paddingHorizontal: 5,
              borderWidth: 1,
              borderColor: isDark ? 'transparent' : "#EAEAEA",
              borderRadius: 5,
            }}
            onPress={() => setIsExpanded(prev => !prev)}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <FastImage
                source={downIcon}
                tintColor={colors.lightGrey}
                style={[
                  { width: 10, height: 10, marginRight: 4 },
                  { transform: [{ rotate: isExpanded ? "180deg" : "0deg" }] },
                ]}
                resizeMode="contain"
              />
              <AppText style={{ color: textThemeColor, fontSize: 12 }} weight={SEMI_BOLD}>
                Executed trades
              </AppText>
            </View>
          </TouchableOpacity>

          {isExpanded && (
            <View style={{ marginTop: 8, backgroundColor: isDark ? "rgba(128, 128, 128, 0.08)" : "rgba(128, 128, 128, 0.08)", paddingVertical: 8, paddingHorizontal: 8, borderRadius: 8 }}>
              {rawExecutions.map((leg, i) => (
                <View key={i} style={[{ backgroundColor: "transparent" }, i < rawExecutions.length - 1 ? { borderBottomWidth: 1, borderBottomColor: borderThemeColor, marginBottom: 8, paddingBottom: 8 } : null]}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                    <AppText style={{ color: secondaryTextThemeColor, fontSize: 13 }} weight={MEDIUM}>
                      Trade #{i + 1}:
                    </AppText>
                  </View>

                  <View style={{ gap: 4, marginTop: 4 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 1 }}>
                      <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Price:</AppText>
                      <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: textThemeColor, textAlign: "right", flex: 2 }} numberOfLines={3}>{toFixedEight(leg?.price || leg?.p)} {quoteSymbol}</AppText>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 1 }}>
                      <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Executed:</AppText>
                      <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: textThemeColor, textAlign: "right", flex: 2 }} numberOfLines={3}>{toFixedEight(leg?.quantity || leg?.q || leg?.amount || leg?.a)} {baseSymbol}</AppText>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 1 }}>
                      <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Fee:</AppText>
                      <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: textThemeColor, textAlign: "right", flex: 2 }} numberOfLines={3}>{toFixedEight(leg?.fee || leg?.f)} {quoteSymbol}</AppText>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 1 }}>
                      <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: isDark ? "#8E8E93" : "#666666", flex: 1 }}>Total:</AppText>
                      <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: textThemeColor, textAlign: "right", flex: 2 }} numberOfLines={3}>{toFixedEight(parseNum(leg?.price || leg?.p || 0) * parseNum(leg?.quantity || leg?.q || leg?.amount || leg?.a || 0))}</AppText>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
});
