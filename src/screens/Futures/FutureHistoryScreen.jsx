import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { AppSafeAreaView } from '../../shared';
import { AppText, FOURTEEN, SEMI_BOLD } from '../../common';
import { appOperation } from '../../appOperation';
import FuturesHistorySection from './components/FuturesHistorySection';
import { colors } from '../../theme/colors';
import { useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
import { back_ic, BACK_ICON } from '../../helper/ImageAssets';

const FutureHistoryScreen = () => {
  const { colors: themeColors, isDark } = useTheme();
  const route = useRoute();
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const selectedCoin = route.params?.selectedCoin;
  const initialTab = route.params?.initialTab || 'Positions';

  const [activeHistoryTab, setActiveHistoryTab] = useState(initialTab);

  const [futuresPositions, setFuturesPositions] = useState([]);
  const [loadingPositions, setLoadingPositions] = useState(initialTab === 'Positions');

  const [futuresPositionHistory, setFuturesPositionHistory] = useState([]);
  const [loadingPositionHistory, setLoadingPositionHistory] = useState(initialTab === 'Position History');

  const [futuresOpenOrders, setFuturesOpenOrders] = useState([]);
  const [loadingOpenOrders, setLoadingOpenOrders] = useState(initialTab === 'Open Orders');

  const [futuresOrderHistory, setFuturesOrderHistory] = useState([]);
  const [loadingOrderHistory, setLoadingOrderHistory] = useState(initialTab === 'Order History');

  const [futuresTransactionHistory, setFuturesTransactionHistory] = useState([]);
  const [loadingTransactionHistory, setLoadingTransactionHistory] = useState(initialTab === 'Transaction History');

  const historyFetchGenRef = React.useRef({
    positions: 0,
    positionHistory: 0,
    openOrders: 0,
    orderHistory: 0,
    transactionHistory: 0,
  });

  const setHistoryTabLoading = useCallback((tabId) => {
    switch (tabId) {
      case 'Positions':
        setLoadingPositions(true);
        break;
      case 'Position History':
        setLoadingPositionHistory(true);
        break;
      case 'Open Orders':
        setLoadingOpenOrders(true);
        break;
      case 'Order History':
        setLoadingOrderHistory(true);
        break;
      case 'Transaction History':
        setLoadingTransactionHistory(true);
        break;
      default:
        break;
    }
  }, []);

  const handleHistoryTabChange = useCallback((tabId) => {
    if (tabId === activeHistoryTab) return;
    setHistoryTabLoading(tabId);
    setActiveHistoryTab(tabId);
  }, [activeHistoryTab, setHistoryTabLoading]);

  // We can fetch price for mark price calculation if needed, or pass it
  const futuresPrice = route.params?.futuresPrice || null;

  const dynamicHistoryTabs = React.useMemo(() => [
    { id: 'Positions', label: 'Positions', count: futuresPositions?.length || 0 },
    { id: 'Position History', label: 'Position History' },
    { id: 'Open Orders', label: 'Open Orders', count: futuresOpenOrders?.length || 0 },
    { id: 'Order History', label: 'Order History' },
    { id: 'Trade History', label: 'Trade History' },
    { id: 'Transaction History', label: 'Transaction History' },
  ], [futuresPositions, futuresOpenOrders]);

  const fetchFuturesPositions = useCallback(async (opts = {}) => {
    if (!selectedCoin?.symbol) {
      setLoadingPositions(false);
      return;
    }
    const silent = opts?.silent === true;
    const gen = ++historyFetchGenRef.current.positions;
    if (!silent) setLoadingPositions(true);
    try {
      const params = { symbol: selectedCoin.symbol, skip: 0, limit: 100 };
      const result = await appOperation.customer.futuresOpenPositions(params);
      if (gen !== historyFetchGenRef.current.positions) return;
      if (result?.success) {
        setFuturesPositions(result.data?.positions ?? []);
      }
    } catch (e) {
      if (gen !== historyFetchGenRef.current.positions) return;
    } finally {
      if (gen === historyFetchGenRef.current.positions) {
        setLoadingPositions(false);
      }
    }
  }, [selectedCoin?.symbol]);

  const fetchFuturesPositionHistory = useCallback(async () => {
    if (!selectedCoin?.symbol) {
      setLoadingPositionHistory(false);
      return;
    }
    const gen = ++historyFetchGenRef.current.positionHistory;
    setLoadingPositionHistory(true);
    try {
      const params = { symbol: selectedCoin.symbol, skip: 0, limit: 100 };
      const result = await appOperation.customer.futuresPositionHistory(params);
      if (gen !== historyFetchGenRef.current.positionHistory) return;
      if (result?.success) {
        setFuturesPositionHistory(result.data?.positions ?? []);
      }
    } catch (e) {
      if (gen !== historyFetchGenRef.current.positionHistory) return;
    } finally {
      if (gen === historyFetchGenRef.current.positionHistory) {
        setLoadingPositionHistory(false);
      }
    }
  }, [selectedCoin?.symbol]);

  const fetchFuturesOpenOrders = useCallback(async () => {
    if (!selectedCoin?.symbol) {
      setLoadingOpenOrders(false);
      return;
    }
    const gen = ++historyFetchGenRef.current.openOrders;
    setLoadingOpenOrders(true);
    try {
      const params = { symbol: selectedCoin.symbol, skip: 0, limit: 100 };
      const result = await appOperation.customer.futuresOpenOrders(params);
      if (gen !== historyFetchGenRef.current.openOrders) return;
      if (result?.success) {
        setFuturesOpenOrders(result.data?.orders ?? []);
      }
    } catch (e) {
      if (gen !== historyFetchGenRef.current.openOrders) return;
      console.warn("fetchFuturesOpenOrders err:", e);
    } finally {
      if (gen === historyFetchGenRef.current.openOrders) {
        setLoadingOpenOrders(false);
      }
    }
  }, [selectedCoin?.symbol]);

  const fetchFuturesOrderHistory = useCallback(async () => {
    if (!selectedCoin?.symbol) {
      setLoadingOrderHistory(false);
      return;
    }
    const gen = ++historyFetchGenRef.current.orderHistory;
    setLoadingOrderHistory(true);
    try {
      const params = { symbol: selectedCoin.symbol, skip: 0, limit: 50 };
      const result = await appOperation.customer.futuresOrderHistory(params);
      if (gen !== historyFetchGenRef.current.orderHistory) return;
      if (result?.success) {
        setFuturesOrderHistory(result.data?.orders ?? []);
      }
    } catch (e) {
      if (gen !== historyFetchGenRef.current.orderHistory) return;
      console.warn("fetchFuturesOrderHistory err:", e);
    } finally {
      if (gen === historyFetchGenRef.current.orderHistory) {
        setLoadingOrderHistory(false);
      }
    }
  }, [selectedCoin?.symbol]);

  const fetchFuturesTransactionHistory = useCallback(async () => {
    const gen = ++historyFetchGenRef.current.transactionHistory;
    setLoadingTransactionHistory(true);
    try {
      const params = { page: 1, limit: 50 };
      const result = await appOperation.customer.futuresWalletHistory(params);
      if (gen !== historyFetchGenRef.current.transactionHistory) return;
      if (result?.success) {
        setFuturesTransactionHistory(result.data?.transactions ?? []);
      }
    } catch (e) {
      if (gen !== historyFetchGenRef.current.transactionHistory) return;
      console.warn("fetchFuturesTransactionHistory err:", e);
    } finally {
      if (gen === historyFetchGenRef.current.transactionHistory) {
        setLoadingTransactionHistory(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      if (activeHistoryTab === 'Positions') {
        fetchFuturesPositions();
      } else if (activeHistoryTab === 'Position History') {
        fetchFuturesPositionHistory();
      } else if (activeHistoryTab === 'Open Orders') {
        fetchFuturesOpenOrders();
      } else if (activeHistoryTab === 'Order History') {
        fetchFuturesOrderHistory();
      } else if (activeHistoryTab === 'Transaction History') {
        fetchFuturesTransactionHistory();
      }
    }
  }, [isFocused, activeHistoryTab, fetchFuturesPositions, fetchFuturesPositionHistory, fetchFuturesOpenOrders, fetchFuturesOrderHistory, fetchFuturesTransactionHistory]);

  const renderBottomTabs = () => (
    <View style={[{
      flexDirection: "row", marginTop: 6, alignItems: "center", height: 35,
      borderBottomWidth: 1, borderBottomColor: themeColors.themeBorderColor
    }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 16 }}
        style={{ flex: 1 }}
      >
        {dynamicHistoryTabs.map((t) => (
          <TouchableOpacity
            key={t.id}
            activeOpacity={0.8}
            onPress={() => handleHistoryTabChange(t.id)}
            style={{ alignItems: "center", minHeight: 28, justifyContent: "center", paddingHorizontal: 2 }}
          >
            <AppText
              numberOfLines={1}
              weight={SEMI_BOLD}
              style={{
                color: activeHistoryTab === t.id ? themeColors.text : themeColors.secondaryText,
                fontSize: 15,
              }}
            >
              {t.label} {t.count != null ? `(${t.count})` : ""}
            </AppText>
            <View
              style={{
                width: 25,
                height: 4,
                marginTop: 8,
                backgroundColor: activeHistoryTab === t.id ? isDark ? colors.white : colors.black : "transparent",
                borderRadius: 2,
              }}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <AppSafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <FastImage
            source={back_ic}
            style={{ width: 18, height: 18 }}
            tintColor={themeColors.text}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <AppText type={FOURTEEN} weight={SEMI_BOLD} style={styles.headerTitle}>Futures History</AppText>
        <View style={{ width: 36 }} />
      </View>
      {renderBottomTabs()}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}>
        <FuturesHistorySection
          activeHistoryTab={activeHistoryTab}
          futuresPositions={futuresPositions}
          loadingPositions={loadingPositions}
          futuresPositionHistory={futuresPositionHistory}
          loadingPositionHistory={loadingPositionHistory}
          futuresOpenOrders={futuresOpenOrders}
          loadingOpenOrders={loadingOpenOrders}
          futuresOrderHistory={futuresOrderHistory}
          loadingOrderHistory={loadingOrderHistory}
          futuresTransactionHistory={futuresTransactionHistory}
          loadingTransactionHistory={loadingTransactionHistory}
          themeColors={themeColors}
          isDark={isDark}
          futuresPrice={futuresPrice}
          selectedCoin={selectedCoin}
          onRefresh={(opts) => {
            fetchFuturesPositions(opts);
            fetchFuturesOpenOrders();
          }}
          onPositionClosed={(posId) => {
            setFuturesPositions((prev) =>
              prev.filter((p) => String(p._id || p.symbol || '') !== String(posId))
            );
          }}
        />
      </ScrollView>
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
  },
});

export default FutureHistoryScreen;
