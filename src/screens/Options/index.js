import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Dimensions,
  FlatList,
} from "react-native";
import FastImage from "react-native-fast-image";
import {
  AppSafeAreaView,
  AppText,
  EIGHTEEN,
  FOURTEEN,
  FIFTEEN,
  THIRTEEN,
  TWELVE,
  BOLD,
  SEMI_BOLD,
  SECOND,
  WHITE,
  TEN,
} from "../../shared";
import TouchableOpacityView from "../../shared/components/TouchableOpacityView";
import { colors } from "../../theme/colors";
import { DOWN_ARROW, download, menu } from "../../helper/ImageAssets";
import NavigationService from "../../navigation/NavigationService";
import {
  BUY_OPTIONS_SCREEN,
  FUTURES_SCREEN,
  OPTIONS_HISTORY_SCREEN,
} from "../../navigation/routes";
import { FutureSocketContext } from "../Futures/FutureSocket";
import { appOperation } from "../../appOperation";
import { useAppSelector } from "../../store/hooks";
import { OptionsContext, OptionsContextProvider } from "./OptionsContext";
import RBSheet from "react-native-raw-bottom-sheet";
import { universalPaddingHorizontal } from "../../theme/dimens";
import OptionsPairList from "./OptionsPairList";
import { SpinnerSecond } from "../../shared/components/SpinnerSecond";
import { ActivityIndicator } from "react-native";

const { width } = Dimensions.get("window");
const ROW_HEIGHT = 40;
const BORDER_COLOR = "#202020"; // consistent border color

const OPTION_TABS = ["All", "Call", "Put", "T-Shaped"];

const OptionsScreen = ({ hideTopTabs = false }) => {
  const [mainTab, setMainTab] = useState("Options"); // "Futures" or "Options"
  const [selectedTab, setSelectedTab] = useState("Call");

  // const userId = sessionStorage.getItem('userId');
  // const { contractSymbol } = useParams();
  const contractSymbol = "";

  const userData = useAppSelector((state) => state.auth.userData);
  const isLoading = useAppSelector((state) => state.auth.isLoading);
  const theme = useAppSelector((state) => state.auth.theme);
  const { _id } = userData ?? "";
  const userId = _id;

  const { socket } = useContext(FutureSocketContext);
  const socketRef = useRef(null);
  const currentSymbolRef = useRef(null);
  const rbSheetOptionsPairList = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");

  // console.log(socketRef.current,"socketRef.current current");

  // const orderBookColor = { buy: "#1c2a2b", sell: "#301e27" };
  const [optionsPairs, setOptionsPairs] = useState([]);
  const [availableExpiryDates, setavailableExpiryDates] = useState([]);

  const [selectedContract, setSelectedContract] = useState({});
  const {
    orderBook,
    setOrderBook,
    selectedPair,
    setSelectedPair,
    balance,
    setBalance,
    fees,
    setFees,
    openOrder,
    setOpenOrder,
    openPositions,
    setOpenPositions,
    orderHistory,
    setOrderHistory,
    exerciseHistory,
    setExerciseHistory,
    contractList,
    setContractList,
  } = useContext(OptionsContext);

  // Map contractList into table rows (one strike → Call & Put legs)
  const tableRows = useMemo(() => {
    const source = Array.isArray(contractList) ? contractList : [];
    return source.map((c, idx) => {
      const strike =
        c?.strikePrice ?? c?.call?.strikePrice ?? c?.put?.strikePrice ?? "--";
      const call = c?.call || {};
      const put = c?.put || {};

      const toDisplay = (v) =>
        v === null || v === undefined ? "--" : String(v);

      return {
        id: String(strike ?? idx),
        strike: String(strike),
        legs: [
          {
            type: "C",
            mark: toDisplay(call.lastMarkPrice),
            lastBid: toDisplay(call.lastBid),

            lastAsk: toDisplay(call.lastAsk),
            bidSize: toDisplay(call.volume ?? call.maxQty),
            open: toDisplay(call.openPrice),
            high: toDisplay(call.highPrice),

            raw: call,
          },
          {
            type: "P",
            mark: toDisplay(put.lastMarkPrice),
            lastBid: toDisplay(put.lastBid),

            lastAsk: toDisplay(put.lastAsk),
            bidSize: toDisplay(put.volume ?? put.maxQty),
            open: toDisplay(put.openPrice),
            high: toDisplay(put.highPrice),

            raw: put,
          },
        ],
      };
    });
  }, [contractList]);
  const [isMobileViewActive, setIsMobileViewActive] = useState(false);
  const [positionInput, setPositionInput] = useState({});

  const [price, setPrice] = useState(0);
  const [quantity, setQuantity] = useState("");
  const [Side, setSide] = useState("BUY");

  const [timeLeft, setTimeLeft] = useState("");

  // console.log("selectedPair", selectedPair);

  const hanldeGetPairs = useCallback(async () => {
    try {
      const result = await appOperation.customer.getOptionsPairs({});
      if (result?.success) {
        setOptionsPairs(result?.data);
        const getFirstData = `${result?.data[0]?.base_currency}${result?.data[0]?.quote_currency}`;
        setSelectedPair((curValue) => ({ ...curValue, ...result?.data[0] }));
        await getExpiryDates(getFirstData);
      }
    } catch (error) {
      // keep silent in production; use logger if needed
    } finally {
    }
  }, []);

  const updatePositionInput = (id, field, value) => {
    setPositionInput((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleClosePosition = async (pos) => {
    try {
      LoaderHelper.loaderStatus(true);

      const closeSide = "SELL";

      const priceInput = positionInput[pos._id]?.price;
      const sizeInput = positionInput[pos._id]?.size;

      const price = Number(priceInput ?? pos.entryPrice);
      const quantity = Number(sizeInput ?? pos.quantity);

      if (!price || isNaN(price) || price <= 0)
        return alertErrorMessage("Please enter a valid price greater than 0.");

      if (!quantity || isNaN(quantity) || quantity <= 0)
        return alertErrorMessage("Please enter a valid size greater than 0.");

      if (quantity > Number(pos.quantity))
        return alertErrorMessage(
          "Close size cannot be greater than your open position size"
        );

      const matchedContract = contractList?.find(
        (item) =>
          item?.call?.symbol === pos.symbol || item?.put?.symbol === pos.symbol
      );

      if (!matchedContract)
        return alertErrorMessage("Unable to match contract details.");

      const contract =
        matchedContract?.call?.symbol === pos.symbol
          ? matchedContract.call
          : matchedContract.put;

      const { tickSize } = contract;

      if (tickSize && Number(tickSize) > 0) {
        const step = Number(tickSize);
        const remainder = (price / step) % 1;

        if (remainder !== 0) {
          const nearestValid = Math.round(price / step) * step;
          return alertErrorMessage(
            `Invalid price step. Must be in multiples of ${step}. Try ${nearestValid.toFixed(
              4
            )}.`
          );
        }
      }

      const result = await AuthService.placeOptionOrder(
        pos.symbol,
        closeSide,
        price,
        quantity
      );

      if (result?.success) {
        alertSuccessMessage(
          result?.message || "Position close order placed successfully!"
        );
      } else {
        alertErrorMessage(result?.message || "Failed to close position.");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Unexpected error occurred while closing the position.";

      alertErrorMessage(msg);
    } finally {
      LoaderHelper.loaderStatus(false);
    }
  };

  const getExpiryDates = async (underlying) => {
    try {
      const result = await appOperation.customer.getExpiryDates(underlying);
      if (result?.success) {
        setavailableExpiryDates(result?.expiries);
        setSelectedPair((curValue) => ({
          ...curValue,
          selectedExpiry: result?.expiries[0]?.expiryDate,
          selectedExpiryTimestamp: Number(
            result?.expiries[0]?.expiryTimestamp || 0
          ),
        }));
      }
    } catch (error) {
    } finally {
    }
  };

  const handleSelectPair = async (item) => {
    if (item?.base_currency === selectedPair?.base_currency) return;
    setSelectedPair(item);
    const underlying = `${item?.base_currency}${item?.quote_currency}`;
    await getExpiryDates(underlying);
    setContractList([]);
    setSelectedContract({});
  };

  const handlePairListSelect = async (pair) => {
    await handleSelectPair(pair);
    rbSheetOptionsPairList.current?.close();
    setSearchTerm("");
  };

  // Filter pairs based on search term
  const filteredPairs = useMemo(() => {
    if (!searchTerm) return optionsPairs;
    const term = searchTerm.toLowerCase();
    return optionsPairs.filter(
      (pair) =>
        pair?.base_currency?.toLowerCase().includes(term) ||
        pair?.quote_currency?.toLowerCase().includes(term) ||
        `${pair?.base_currency}${pair?.quote_currency}`
          .toLowerCase()
          .includes(term)
    );
  }, [optionsPairs, searchTerm]);

  const handleSelectExpiry = useCallback(
    async (expiry) => {
      if (!expiry || !expiry?.expiryDate) return;
      if (expiry?.expiryDate === selectedPair?.selectedExpiry) return;
      setSelectedPair((curValue) => ({
        ...curValue,
        selectedExpiry: expiry?.expiryDate,
        selectedExpiryTimestamp: Number(expiry?.expiryTimestamp || 0),
      }));
      setContractList([]);
      setSelectedContract({});
    },
    [selectedPair?.selectedExpiry]
  );

  const renderDateChip = useCallback(
    (item, index) => {
      // Convert ISO date to yyyy-mm-dd format
      const formattedDate = item?.expiryDate
        ? new Date(item.expiryDate).toISOString().split("T")[0]
        : "----";
      const isActive = selectedPair?.selectedExpiry === item?.expiryDate;

      return (
        <TouchableOpacityView
          key={`${item?.expiryDate || index}-${index}`}
          onPress={() => handleSelectExpiry(item)}
          activeOpacity={0.8}
          style={[styles.dateChip, isActive && styles.dateChipActive]}
        >
          <AppText
            type={TWELVE}
            weight={isActive ? SEMI_BOLD : undefined}
            style={[styles.dateChipText, isActive && styles.dateChipTextActive]}
          >
            {formattedDate}
          </AppText>
        </TouchableOpacityView>
      );
    },
    [selectedPair?.selectedExpiry, handleSelectExpiry]
  );

  function calcOrderFee(optionPrice = 0, indexPrice = 0, quantity = 1) {
    try {
      if (
        typeof optionPrice !== "number" ||
        typeof indexPrice !== "number" ||
        typeof quantity !== "number" ||
        optionPrice <= 0 ||
        indexPrice <= 0 ||
        quantity <= 0 ||
        !fees
      ) {
        return 0;
      }

      const feeBasedOnIndex =
        (fees?.transactionFee / 100) * indexPrice * fees?.CONTRACT_UNIT;
      const feeCap = fees?.FEE_CAP_RATE * optionPrice;

      const perContractFee = Math.min(feeBasedOnIndex, feeCap);

      const totalFee = perContractFee * quantity;

      return Number(totalFee.toFixed(5));
    } catch (error) {
      return 0;
    }
  }

  const finalCost = useMemo(() => {
    const p = Number(price);
    const q = Number(quantity);
    const index = Number(selectedPair?.buy_price);
    if (!p || !q || !index) return 0;

    const fee = calcOrderFee(p, index, q);
    return fee + p * q;
  }, [price, quantity, selectedPair?.buy_price, fees]);

  const handleSelecteContract = async (contract) => {
    console.log(socketRef.current,"socketRef.current outside");
    console.log(contract?.symbol,"contract?.symbol outside");
    console.log(selectedContract?.symbol,"selectedContract?.symbol outside");
    // if (contract?.symbol === selectedContract?.symbol) return;
    setSelectedContract(contract);
    setPrice(contract?.lastPrice);



    if (!contract?.symbol) return;
    if (!contract?.symbol || !socketRef.current) return;
    console.log(socketRef.current,"socketRef.current inside");
    console.log(contract?.symbol,"contract?.symbol inside");
    console.log(selectedContract?.symbol,"selectedContract?.symbol inside");

    NavigationService.navigate(BUY_OPTIONS_SCREEN, {
      item: contract,
      selectedPair: selectedPair,
    });

    if (currentSymbolRef.current) {
      setOrderBook({ bids: [], asks: [] });
      socketRef.current.send(
        JSON.stringify({
          method: "UNSUBSCRIBE",
          params: [`${currentSymbolRef.current}@depth50@1000ms`],
          id: 1,
        })
      );
    }

    socketRef.current.send(
      JSON.stringify({
        method: "SUBSCRIBE",
        params: [`${contract.symbol}@depth50@1000ms`],
        id: 2,
      })
    );

    currentSymbolRef.current = contract.symbol;
  };

  useEffect(() => {
    const ws = new WebSocket("wss://nbstream.binance.com/eoptions/ws");

    socketRef.current = ws;

    ws.onopen = () => console.log("✅ Connected to Binance Options stream");
    ws.onclose = () => console.log("❌ Disconnected from Binance stream");
    ws.onerror = (err) => console.error("⚠️ Binance WebSocket Error:", err);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        // console.log(msg, "socket msg");

        if (msg?.b || msg?.a) {
          const bids = (msg?.b || []).map(([price, size]) => ({
            price: parseFloat(price),
            size: parseFloat(size),
          }));

          const asks = (msg?.a || []).map(([price, size]) => ({
            price: parseFloat(price),
            size: parseFloat(size),
          }));

          setOrderBook({
            bids: bids?.slice(0, 6)?.reverse(), // top 20 levels
            asks: asks?.slice(0, 6),
          });
        }
      } catch (err) {
        console.error("Parse error:", err);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (socketRef.current && currentSymbolRef.current) {
        socketRef.current.send(
          JSON.stringify({
            method: "UNSUBSCRIBE",
            params: [`${currentSymbolRef.current}@depth50@1000ms`],
            id: 3,
          })
        );
      }
    };
  }, []);

  // useEffect(() => {
  //   return () => {
  //     if (socketRef.current) socketRef.current.close();
  //   };
  // }, []);

  // formatNumber unchanged
  const formatNumber = (data, decimal = 1) => {
    const num = typeof data === "string" ? Number(data) : data;
    if (typeof num === "number" && !isNaN(num)) {
      return parseFloat(num.toFixed(decimal));
    }
    return "0.00";
  };

  const formattedDate = selectedPair?.selectedExpiry
    ? new Date(selectedPair?.selectedExpiry).toISOString().split("T")[0]
    : "---";

  async function handleContractExpired(underlying) {
    Swal.fire({
      title: "Contract Expired!",
      text: "Contract has expired. Please refresh expiry dates to continue.",
      icon: "warning",
      showCancelButton: false,
      confirmButtonColor: "#3085d6",
      confirmButtonText: "Refresh Now",
      allowOutsideClick: false,
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "Refreshing...",
          text: "Fetching updated expiry dates...",
          didOpen: async () => {
            Swal.showLoading();
            await getExpiryDates(underlying);
            Swal.close();
            Swal.fire({
              title: "Updated!",
              text: "Expiry dates refreshed successfully.",
              icon: "success",
              timer: 1500,
              showConfirmButton: false,
            });
          },
        });
      }
    });
  }

  useEffect(() => {
    if (!selectedPair?.selectedExpiryTimestamp) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = selectedPair.selectedExpiryTimestamp - now;

      if (diff <= 0) {
        setTimeLeft("Expired");
        clearInterval(interval);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (diff < 24 * 60 * 60 * 1000) {
        setTimeLeft(
          `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
        );
      } else {
        setTimeLeft(
          `${days} day${days !== 1 ? "s" : ""} ${hours} hour${
            hours !== 1 ? "s" : ""
          }`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedPair?.selectedExpiryTimestamp]);

  // -------------------------
  // THROTTLED socket updates to avoid UI thrash
  // -------------------------
  const lastUpdateRef = useRef(0);
  const pendingDataRef = useRef(null);

  useEffect(() => {
    if (
      !socket ||
      !selectedPair?.base_currency ||
      !selectedPair?.selectedExpiry
    )
      return;

    const payload = {
      underlying: `${selectedPair.base_currency}${selectedPair.quote_currency}`,
      expiry: selectedPair.selectedExpiry,
      userId: userId,
    };

    socket.emit("subscribe", payload);

    const onOptionsUpdate = (data) => {
      // Batch incoming updates, apply at most every 200ms
      pendingDataRef.current = data;
      const now = Date.now();
      if (now - lastUpdateRef.current > 200) {
        lastUpdateRef.current = now;
        const d = pendingDataRef.current;
        pendingDataRef.current = null;

        if (d?.data) setContractList(d.data);
        if (d?.pairs) setOptionsPairs(d.pairs);
        if (typeof d?.balance !== "undefined") setBalance(d.balance);
        if (d?.fees) setFees(d.fees);
        if (d?.openOrder) setOpenOrder(d.openOrder);
        if (d?.openPositions) setOpenPositions(d.openPositions);
        if (d?.orderhistory) setOrderHistory(d.orderhistory);
        if (d?.exerciseHistory) setExerciseHistory(d.exerciseHistory);
      }
    };

    let showRefreshModal = true;
    const onContractEvent = (data) => {
      if (data?.event === "EXPIRED") {
        if (showRefreshModal) {
          const underlying = `${selectedPair.base_currency}${selectedPair.quote_currency}`;
          handleContractExpired(underlying);
          showRefreshModal = false;
        }
      }
    };

    socket.on("options:update", onOptionsUpdate);
    socket.on("options:contract:event", onContractEvent);

    return () => {
      socket.emit("unsubscribe");
      socket.off("options:update", onOptionsUpdate);
      socket.off("options:contract:event", onContractEvent);
    };
  }, [
    socket,
    selectedPair?.base_currency,
    selectedPair?.selectedExpiry,
    userId,
  ]);

  useEffect(() => {
    if (optionsPairs?.length > 0) {
      const filteredData = optionsPairs?.filter(
        (item) => item?.base_currency === selectedPair?.base_currency
      )[0];
      if (filteredData)
        setSelectedPair((currVal) => ({ ...currVal, ...filteredData }));
    }
  }, [optionsPairs, selectedPair?.base_currency]);

  useEffect(() => {
    if (
      contractList?.length > 0 &&
      Object.keys(selectedContract)?.length === 0
    ) {
      let contract = {};
      if (contractSymbol) {
        const filteredData = contractList?.filter(
          (item) =>
            item?.call?.symbol === contractSymbol ||
            item?.put?.symbol === contractSymbol
        )[0];

        if (filteredData) {
          contract =
            filteredData.call?.symbol === contractSymbol
              ? filteredData.call
              : filteredData.put;
        } else {
          contract = contractList[0]?.call || {};
        }
      } else {
        contract = contractList[0]?.call || {};
      }

      setSelectedContract(contract);
      setPrice(contract?.lastPrice);

      if (!contract?.symbol || !socketRef.current) return;
      if (socketRef?.current?.readyState !== 1) return;

      if (currentSymbolRef.current) {
        setOrderBook({ bids: [], asks: [] });
        socketRef.current.send(
          JSON.stringify({
            method: "UNSUBSCRIBE",
            params: [`${currentSymbolRef.current}@depth50@1000ms`],
            id: 1,
          })
        );
      }

      socketRef.current.send(
        JSON.stringify({
          method: "SUBSCRIBE",
          params: [`${contract.symbol}@depth50@1000ms`],
          id: 2,
        })
      );

      currentSymbolRef.current = contract.symbol;
    }
  }, [contractList, socketRef]);

  useEffect(() => {
    hanldeGetPairs();
  }, [hanldeGetPairs]);

  // -------------------------
  // Virtualized table renderers
  // -------------------------
  const leftListRef = useRef(null);
  const rightListRef = useRef(null);
  const isSyncingRef = useRef(false);

  // NOTE: left list is passive (non-scrollable). only right list handles user scroll.
  const onRightScroll = useCallback((e) => {
    if (!leftListRef.current || isSyncingRef.current) return;
    isSyncingRef.current = true;
    leftListRef.current.scrollToOffset({
      offset: e.nativeEvent.contentOffset.y,
      animated: false,
    });
    // small unlock to avoid loop
    setTimeout(() => (isSyncingRef.current = false), 10);
  }, []);

  const StrikeCell = React.memo(({ item }) => {
    return (
      <View
        style={[
          styles.strikeRowContainer,
          { height: ROW_HEIGHT * (item.legs.length || 1) },
        ]}
      >
        <AppText type={FOURTEEN} style={styles.strikeText}>
          {item.strike}
        </AppText>
      </View>
    );
  });

  // console.log(balance,"balance");

  const LegRow = React.memo(
    ({ leg, parentIndex, legIndex, item, selectedPair }) => {
      const isCall = leg.type === "C";
      const typeColor = isCall ? colors.green : colors.red;
      // console.log(leg,"leg");
      // console.log(item,"item");
      return (
        <TouchableOpacityView
          // activeOpacity={0.8}
          onPress={() => handleSelecteContract(leg.raw)}
          style={[
            styles.row,
            parentIndex % 2 !== 0 ? styles.rowDark : styles.rowLight,
            { borderBottomWidth: 1, borderBottomColor: BORDER_COLOR },
          ]}
        >
          <View style={styles.typeCell}>
            <AppText
              type={THIRTEEN}
              style={[styles.typeText, { color: typeColor }]}
            >
              {leg.type === "C" ? "Call" : "Put"}
            </AppText>
          </View>
          <View style={styles.valueCell}>
            <AppText type={TWELVE} style={styles.mainValueText}>
              {leg.mark}
            </AppText>
          </View>
          <View style={styles.valueCell}>
            <AppText
              type={TWELVE}
              style={[styles.mainValueText, { color: colors.green }]}
            >
              {leg.lastBid}
            </AppText>
          </View>

          <View style={styles.valueCell}>
            <AppText
              type={TWELVE}
              style={[styles.mainValueText, { color: colors.red }]}
            >
              {leg.lastAsk}
            </AppText>
          </View>
          <View style={styles.valueCell}>
            <AppText type={TWELVE} style={styles.mainValueText}>
              {leg.bidSize}
            </AppText>
          </View>
          <View style={styles.valueCell}>
            <AppText type={TWELVE} style={styles.mainValueText}>
              {leg.open}
            </AppText>
          </View>
          <View style={styles.valueCell}>
            <AppText type={TWELVE} style={styles.mainValueText}>
              {leg.high}
            </AppText>
          </View>
        </TouchableOpacityView>
      );
    },
    (prev, next) => {
      return (
        prev.leg.open === next.leg.open &&
        prev.leg.high === next.leg.high &&
        prev.leg.bidSize === next.leg.bidSize &&
        prev.leg.lastBid === next.leg.lastBid &&
        prev.leg.mark === next.leg.mark &&
        prev.leg.lastAsk === next.leg.lastAsk &&
        prev.parentIndex === next.parentIndex &&
        prev.legIndex === next.legIndex &&
        prev.selectedPair === next.selectedPair
      );
    }
  );

  const onPressLeg = useCallback((item, leg) => {
    NavigationService.navigate(BUY_OPTIONS_SCREEN, { item, leg });
  }, []);

  // flattened data for right list: each leg is one row
  const rightData = useMemo(() => {
    const arr = [];
    for (let i = 0; i < tableRows.length; i++) {
      const item = tableRows[i];
      // expect 2 legs per strike — keep ordering (call then put)
      arr.push({
        key: `${item.id}-leg-0`,
        leg: item.legs[0],
        parentIndex: i,
        legIndex: 0,
        item,
      });
      arr.push({
        key: `${item.id}-leg-1`,
        leg: item.legs[1],
        parentIndex: i,
        legIndex: 1,
        item,
      });
    }
    return arr;
  }, [tableRows]);

  const getItemLayoutRight = useCallback((_, index) => {
    return { length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index };
  }, []);

  // left list grouped height: each strike block = legs.length * ROW_HEIGHT
  // optimized for 2 legs per strike (common for options; safe fallback if different)
  const getItemLayoutLeft = useCallback((_, index) => {
    return { length: ROW_HEIGHT * 2, offset: index * ROW_HEIGHT * 2, index };
  }, []);

  const renderLeftItem = useCallback(
    ({ item }) => <StrikeCell item={item} />,
    []
  );
  const renderRightItem = useCallback(
    ({ item }) => (
      <LegRow
        leg={item.leg}
        parentIndex={item.parentIndex}
        legIndex={item.legIndex}
        item={item.item}
        selectedPair={selectedPair}
        onPress={onPressLeg}
      />
    ),
    [onPressLeg, selectedPair]
  );

  const leftKeyExtractor = useCallback((it) => `strike-${it.id}`, []);
  const rightKeyExtractor = useCallback((it) => it.key, []);

  return (
    <AppSafeAreaView style={styles.safeArea} backgroundColor={colors.black}>
      <View style={styles.container}>
        {/* Main Tabs: Futures and Options - Only show if not hidden */}
        {!hideTopTabs && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              marginTop: 10,
              marginBottom: 10,
              paddingHorizontal: 20,
              gap: 20,
            }}
          >
            <TouchableOpacityView
              onPress={() => setMainTab("Futures")}
              activeOpacity={0.8}
              style={{
                flex: 1,
                paddingVertical: 12,
                alignItems: "center",
                borderBottomWidth: mainTab === "Futures" ? 2 : 0,
                borderBottomColor:
                  mainTab === "Futures"
                    ? theme !== "Dark"
                      ? "#F3BB2B"
                      : colors.buttonDarkBg
                    : "transparent",
              }}
            >
              <AppText
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color:
                    mainTab === "Futures"
                      ? theme !== "Dark"
                        ? "#F3BB2B"
                        : colors.buttonDarkBg
                      : theme !== "Dark"
                      ? "#222"
                      : "#9D9D9D",
                }}
              >
                Futures
              </AppText>
            </TouchableOpacityView>
            <TouchableOpacityView
              onPress={() => setMainTab("Options")}
              activeOpacity={0.8}
              style={{
                flex: 1,
                paddingVertical: 12,
                alignItems: "center",
                borderBottomWidth: mainTab === "Options" ? 2 : 0,
                borderBottomColor:
                  mainTab === "Options"
                    ? theme !== "Dark"
                      ? "#F3BB2B"
                      : colors.buttonDarkBg
                    : "transparent",
              }}
            >
              <AppText
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color:
                    mainTab === "Options"
                      ? theme !== "Dark"
                        ? "#F3BB2B"
                        : colors.buttonDarkBg
                      : theme !== "Dark"
                      ? "#222"
                      : "#9D9D9D",
                }}
              >
                Options
              </AppText>
            </TouchableOpacityView>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacityView
              onPress={() => rbSheetOptionsPairList.current?.open()}
              activeOpacity={0.8}
            >
              <View style={styles.pairRow}>
                <AppText
                  type={EIGHTEEN}
                  weight={SEMI_BOLD}
                  style={styles.pairText}
                >
                  {selectedPair?.base_currency}/{selectedPair?.quote_currency}
                </AppText>
                <FastImage
                  source={DOWN_ARROW}
                  style={styles.downArrow}
                  resizeMode="contain"
                />
              </View>
            </TouchableOpacityView>
            <AppText type={EIGHTEEN} weight={BOLD} style={styles.priceText}>
              {formatNumber(selectedPair?.buy_price)}
            </AppText>
            {/* <AppText type={TWELVE} color={SECOND} style={styles.subHeaderText}>
              BVOL:34.34
            </AppText> */}
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacityView
              style={styles.iconButton}
              activeOpacity={0.8}
              onPress={() => NavigationService.navigate(OPTIONS_HISTORY_SCREEN)}
            >
              <FastImage
                source={download}
                style={styles.headerIcon}
                resizeMode="contain"
                tintColor={colors.white}
              />
            </TouchableOpacityView>
          </View>
        </View>

        {/* Tabs */}
        {/* <View style={styles.tabRow}>{OPTION_TABS.map(renderTab)}</View> */}

        {/* Expiry dates */}
        <View style={styles.dateWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateRow}
          >
            {availableExpiryDates?.length > 0
              ? availableExpiryDates.map((item, index) =>
                  renderDateChip(item, index)
                )
              : renderDateChip({ expiryDate: null }, 0)}
          </ScrollView>
        </View>

        {/* Index + Time to expiry */}
        <View style={styles.infoRow}>
          <AppText type={TWELVE} color={SECOND} style={styles.infoText}>
            Index Price:{" "}
            <AppText type={TWELVE} weight={SEMI_BOLD} style={styles.infoValue}>
              {formatNumber(selectedPair?.buy_price)}
            </AppText>
          </AppText>
          <AppText type={TWELVE} color={SECOND} style={styles.infoTextRight}>
            Time to Expiry:{" "}
            <AppText type={TWELVE} weight={SEMI_BOLD} style={styles.infoValue}>
              {timeLeft || "0:43:52"}
            </AppText>
          </AppText>
        </View>

        {/* Table with fixed Strike column and horizontal scroll for the rest */}
        {contractList?.length === 0 &&
        selectedPair?.base_currency &&
        selectedPair?.selectedExpiry ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.buttonBg} />
            <AppText type={FOURTEEN} color={SECOND} style={styles.loadingText}>
              Loading contracts...
            </AppText>
          </View>
        ) : contractList?.length > 0 ? (
          <View style={styles.tableContainer}>
            {/* Fixed Strike column */}
            <View style={styles.strikeTable}>
              <View style={[styles.strikeHeader, styles.rowLight]}>
                <AppText
                  type={THIRTEEN}
                  color={SECOND}
                  style={styles.headerLabel}
                >
                  Strike
                </AppText>
              </View>

              <FlatList
                ref={leftListRef}
                data={tableRows}
                keyExtractor={leftKeyExtractor}
                renderItem={renderLeftItem}
                getItemLayout={getItemLayoutLeft}
                showsVerticalScrollIndicator={false}
                // left list is passive; user scroll only on right list
                scrollEnabled={false}
                initialNumToRender={20}
                maxToRenderPerBatch={20}
                windowSize={21}
              />
            </View>

            {/* Scrollable right side (horizontal) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tableScroll}
            >
              <View style={styles.tableWrapper}>
                {/* Right-side header */}
                <View style={styles.tableHeader}>
                  <View style={styles.headerRightRow}>
                    <View style={styles.typeCell}>
                      <AppText
                        type={THIRTEEN}
                        color={SECOND}
                        style={styles.headerLabel}
                      >
                        Type
                      </AppText>
                    </View>
                    <View style={styles.valueCell}>
                      <AppText
                        type={THIRTEEN}
                        color={SECOND}
                        style={[
                          styles.headerLabel,
                          { textAlign: "right", width: "100%" },
                        ]}
                      >
                        Mark
                      </AppText>
                    </View>
                    <View style={styles.valueCell}>
                      <AppText
                        type={THIRTEEN}
                        color={SECOND}
                        style={[
                          styles.headerLabel,
                          { textAlign: "right", width: "100%" },
                        ]}
                      >
                        Last Bid
                      </AppText>
                    </View>
                    <View style={styles.valueCell}>
                      <AppText
                        type={THIRTEEN}
                        color={SECOND}
                        style={[
                          styles.headerLabel,
                          { textAlign: "right", width: "100%" },
                        ]}
                      >
                        Last Ask
                      </AppText>
                    </View>
                    <View style={styles.valueCell}>
                      <AppText
                        type={THIRTEEN}
                        color={SECOND}
                        style={[
                          styles.headerLabel,
                          { textAlign: "right", width: "100%" },
                        ]}
                      >
                        Bid Size
                      </AppText>
                    </View>
                    <View style={styles.valueCell}>
                      <AppText
                        type={THIRTEEN}
                        color={SECOND}
                        style={[
                          styles.headerLabel,
                          { textAlign: "right", width: "100%" },
                        ]}
                      >
                        Open
                      </AppText>
                    </View>
                    <View style={styles.valueCell}>
                      <AppText
                        type={THIRTEEN}
                        color={SECOND}
                        style={[
                          styles.headerLabel,
                          { textAlign: "right", width: "100%" },
                        ]}
                      >
                        High
                      </AppText>
                    </View>
                  </View>
                </View>

                {/* Right-side rows (virtualized) */}
                <FlatList
                  ref={rightListRef}
                  data={rightData}
                  keyExtractor={rightKeyExtractor}
                  renderItem={renderRightItem}
                  getItemLayout={getItemLayoutRight}
                  showsVerticalScrollIndicator={false}
                  onScroll={onRightScroll}
                  scrollEventThrottle={16}
                  initialNumToRender={40}
                  maxToRenderPerBatch={40}
                  windowSize={21}
                  removeClippedSubviews={true}
                  style={styles.tableBody}
                  contentContainerStyle={{ width: 50 + 90 * 6 }}
                />
              </View>
            </ScrollView>
          </View>
        ) : null}
      </View>

      {/* Options Pair List Bottom Sheet */}
      <RBSheet
        ref={rbSheetOptionsPairList}
        closeOnDragDown={true}
        closeOnPressMask={true}
        height={450}
        animationType="none"
        customStyles={{
          container: {
            backgroundColor: "#1D1D1D",
            height: 450,
            borderRadius: 20,
            paddingHorizontal: universalPaddingHorizontal,
          },
          wrapper: {
            backgroundColor: "#0006",
          },
          draggableIcon: {
            backgroundColor: "transparent",
          },
        }}
      >
        <OptionsPairList
          pairs={filteredPairs}
          selectedPair={selectedPair}
          onSelectPair={handlePairListSelect}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          theme={theme}
        />
      </RBSheet>
    </AppSafeAreaView>
  );
};

export default OptionsScreen;

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#000000",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "column",
  },
  pairRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  pairText: {
    color: colors.white,
  },
  downArrow: {
    width: 14,
    height: 14,
    marginLeft: 6,
  },
  priceText: {
    color: "#3CC989",
    marginTop: 2,
  },
  subHeaderText: {
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    backgroundColor: "#1A1A1A",
  },
  headerIcon: {
    width: 22,
    height: 22,
  },
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  tabItem: {
    marginRight: 24,
    alignItems: "center",
  },
  tabText: {
    color: colors.secondaryText,
  },
  tabTextActive: {
    color: colors.white,
  },
  tabIndicator: {
    marginTop: 6,
    height: 3,
    width: 22,
    borderRadius: 2,
    backgroundColor: colors.buttonBg,
  },
  dateWrapper: {
    height: 32,
    justifyContent: "center",
    marginBottom: 10,
  },
  dateRow: {
    paddingVertical: 0,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  dateChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dividerColor,
    marginRight: 10,
    backgroundColor: "#111111",
  },
  dateChipActive: {
    borderColor: colors.buttonBg,
    backgroundColor: "#2A220C",
  },
  dateChipText: {
    color: colors.secondaryText,
  },
  dateChipTextActive: {
    color: colors.white,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  infoText: {
    flex: 1,
  },
  infoTextRight: {
    flex: 1,
    textAlign: "right",
  },
  infoValue: {
    color: colors.white,
  },
  tableContainer: {
    flexDirection: "row",
    marginTop: 4,
  },
  strikeTable: {
    width: width * 0.22,
  },
  strikeHeader: {
    height: ROW_HEIGHT,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.dividerColor,
  },
  strikeRowContainer: {
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  rowLastLeft: {
    borderBottomLeftRadius: 4,
  },
  tableScroll: {
    flexGrow: 0,
  },
  tableWrapper: {
    // Calculate width: Type (50) + 6 value cells (90 each) = 590px
    width: 50 + 90 * 6,
  },
  tableBody: {
    paddingBottom: 40,
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    height: ROW_HEIGHT,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.dividerColor,
    marginBottom: 0,
  },
  headerLabel: {
    textTransform: "none",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: ROW_HEIGHT,
    paddingHorizontal: 0,
  },
  rowLight: {
    backgroundColor: "#111111",
  },
  rowDark: {
    backgroundColor: "#151515",
  },
  rowLastRight: {
    borderBottomRightRadius: 4,
  },
  headerRightRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 0,
  },
  groupRight: {
    flex: 1,
  },
  typeCell: {
    width: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  valueCell: {
    width: 90,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: 8,
  },
  strikeText: {
    color: colors.white,
  },
  typeText: {
    color: colors.white,
  },
  mainValueText: {
    color: colors.white,
    textAlign: "right",
    width: "100%",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    minHeight: 300,
  },
  loadingText: {
    marginTop: 16,
  },
});
