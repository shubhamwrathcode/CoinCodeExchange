import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { AppText, ELEVEN, SEMI_BOLD, TWELVE } from "../../shared";
import { colors } from "../../theme/colors";
import NavigationService from "../../navigation/NavigationService";
import { FUTURES_SCREEN, NAVIGATION_AUTH_STACK, LOGIN_SCREEN } from "../../navigation/routes";
import { showError } from "../../helper/logger";
import FastImage from "react-native-fast-image";
import { NO_NOTIFICATION_ICON, NO_NOTIFICATION_ICON_LIGHT, downIcon, starIcon, starFillIcon } from "../../helper/ImageAssets";
import { useTheme } from "../../hooks/useTheme";
import { useIsFocused } from "@react-navigation/native";
import RBSheet from "react-native-raw-bottom-sheet";
import optionsSocketService from "../../services/socket/OptionsSocketService";
import { useDispatch } from "react-redux";
import { useAppSelector } from "../../store/hooks";
import { IMAGE_BASE_URL } from "../../helper/Constants";
import { addToFavorites } from "../../actions/homeActions";
import { underlyingsFromMarketOverview } from "../Futures/OptionsTrade/helpers/optionsDataHelpers";

const OPTIONS_CHANNELS = {
  MARKET_OVERVIEW: "options:market_overview",
  CONTRACTS: "options:contracts",
};

// Global in-memory cache for instant 0ms retrieval on revisit / tab switch
let globalCachedUnderlyings = [
  { symbol: "BTC", underlying: "BTCUSDT" },
  { symbol: "ETH", underlying: "ETHUSDT" },
  { symbol: "SOL", underlying: "SOLUSDT" },
  { symbol: "BNB", underlying: "BNBUSDT" },
];
let globalCachedContracts = new Map();

// Lightweight Shimmer Skeleton Cell
const SkeletonItem = ({ isDark, themeColors }) => {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.8, duration: 600, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const bg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  return (
    <View style={[styles.row, { borderBottomColor: themeColors.border }]}>
      <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 10 }}>
        <Animated.View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: bg, opacity: anim }} />
        <View style={{ gap: 6 }}>
          <Animated.View style={{ width: 90, height: 12, borderRadius: 4, backgroundColor: bg, opacity: anim }} />
          <Animated.View style={{ width: 50, height: 10, borderRadius: 4, backgroundColor: bg, opacity: anim }} />
        </View>
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        <Animated.View style={{ width: 60, height: 12, borderRadius: 4, backgroundColor: bg, opacity: anim }} />
        <Animated.View style={{ width: 45, height: 10, borderRadius: 4, backgroundColor: bg, opacity: anim }} />
      </View>
    </View>
  );
};

const OptionContractItem = React.memo(({ item, themeColors, isDark, onPress, iconUri, isFavorite, onToggleFavorite }) => {
  const rawPrice = item?.buy_price ?? item?.mark_price ?? item?.last_price;
  const parsedPrice = rawPrice != null && !isNaN(Number(rawPrice)) ? Number(rawPrice) : null;
  const tickSizeNum = Number(item?.tick_size);
  const decimals = (!tickSizeNum || tickSizeNum <= 0 || Number.isNaN(tickSizeNum)) ? 2 : (tickSizeNum < 1 ? Math.max(0, Math.ceil(-Math.log10(tickSizeNum))) : 0);
  const priceText = parsedPrice != null ? parsedPrice.toFixed(decimals) : "—";

  const typeStr = String(item?.option_type || item?.type || "").toUpperCase();
  const isCall = typeStr === "C" || typeStr === "CALL";
  const strike = item?.strike || 0;

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: themeColors.border }]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.nameCol}>
        <View style={styles.nameRow}>
          <TouchableOpacity onPress={() => onToggleFavorite(item?._id)} activeOpacity={0.7} style={{ padding: 4, marginRight: 4 }}>
            <FastImage
              source={isFavorite ? starFillIcon : starIcon}
              style={{ width: 14, height: 14 }}
              tintColor={isFavorite ? colors.startintcolor : themeColors.secondaryText}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <FastImage
            source={iconUri ? { uri: iconUri } : (isDark ? NO_NOTIFICATION_ICON_LIGHT : NO_NOTIFICATION_ICON)}
            style={{ width: 24, height: 24, marginRight: 10, borderRadius: 12 }}
            resizeMode="contain"
          />
          <View style={styles.nameBlock}>
            <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 2 }} numberOfLines={1}>
              {item?.symbol}
            </AppText>
            <AppText type={ELEVEN} style={{ color: themeColors.secondaryText }} numberOfLines={1}>
              {isCall ? "Call" : "Put"} · {strike}
            </AppText>
          </View>
        </View>
      </View>
      <View style={styles.priceCol}>
        <AppText type={TWELVE} weight={SEMI_BOLD} style={[styles.priceText, { color: themeColors.text, marginBottom: 2 }]}>
          {priceText}
        </AppText>
        {parsedPrice != null && (
          <AppText type={ELEVEN} style={[styles.priceText, { color: themeColors.secondaryText }]}>
            ${priceText}
          </AppText>
        )}
      </View>
    </TouchableOpacity>
  );
});

const OptionsMarket = ({ search, isActive = true }) => {
  const { colors: themeColors, isDark } = useTheme();
  const isFocused = useIsFocused();
  const isScreenActive = isActive && isFocused;
  const rbSheetRef = useRef(null);

  const [selectedAsset, setSelectedAsset] = useState("");
  const [underlyings, setUnderlyings] = useState(() => globalCachedUnderlyings);
  const [contracts, setContracts] = useState(() => Array.from(globalCachedContracts.values()));
  const [isLoading, setIsLoading] = useState(() => globalCachedContracts.size === 0);

  const coinPairs = useAppSelector((state) => state.home.coinPairs) || [];
  const favoriteArray = useAppSelector((state) => state.home?.favoriteArray) || [];
  const userData = useAppSelector((state) => state.auth?.userData);
  const dispatch = useDispatch();

  // Fast O(1) hashmap for coin icons
  const coinIconMap = useMemo(() => {
    const map = {};
    if (Array.isArray(coinPairs)) {
      const baseHost = String(IMAGE_BASE_URL || "").replace(/\/+$/, "");
      coinPairs.forEach((p) => {
        const sym = String(p?.base_currency || p?.currency?.short_name || p?.short_name || "").replace(/[\/|-]/g, "").toUpperCase();
        const iconPath = p?.currency?.icon || p?.icon || p?.icon_path;
        if (iconPath && sym) {
          const uri = iconPath.startsWith("http") ? iconPath : `${baseHost}/${iconPath.replace(/^\/+/, "")}`;
          map[sym] = uri;
        }
      });
    }
    return map;
  }, [coinPairs]);

  const getCoinIcon = useCallback((underlyingOrSymbol) => {
    if (!underlyingOrSymbol) return null;
    const raw = String(underlyingOrSymbol).replace(/USDT|USDC/i, "").toUpperCase();
    const base = raw.split(/[-_]/)[0];
    return coinIconMap[base] || coinIconMap[raw] || null;
  }, [coinIconMap]);

  const batchTimerRef = useRef(null);
  const selectedAssetRef = useRef(selectedAsset);
  selectedAssetRef.current = selectedAsset;
  const initialRenderRef = useRef(globalCachedContracts.size === 0);

  // Progressive streaming handler: Updates cache and pushes to state without delay
  const handleContractsData = useCallback((data) => {
    if (!data || typeof data !== "object") return;
    let list = [];
    if (Array.isArray(data)) {
      list = data;
    } else if (Array.isArray(data?.contracts)) {
      list = data.contracts;
    } else if (Array.isArray(data?.data?.contracts)) {
      list = data.data.contracts;
    } else if (Array.isArray(data?.data)) {
      list = data.data;
    }

    if (list.length > 0) {
      list.forEach((contract) => {
        if (contract && contract.symbol) {
          globalCachedContracts.set(contract.symbol, contract);
        }
      });

      const currentFilter = selectedAssetRef.current ? String(selectedAssetRef.current).toUpperCase() : "";
      const allList = Array.from(globalCachedContracts.values());
      const filtered = currentFilter
        ? allList.filter((c) => {
          const sym = String(c?.symbol || "").toUpperCase();
          const und = String(c?.underlying || "").toUpperCase();
          return sym.startsWith(currentFilter) || und.startsWith(currentFilter);
        })
        : allList;

      // Flush first batch immediately so UI appears in <200ms
      if (initialRenderRef.current) {
        initialRenderRef.current = false;
        setContracts(filtered);
        setIsLoading(false);
      } else if (!batchTimerRef.current) {
        // Subsequent streaming updates batched smoothly at 60ms
        batchTimerRef.current = setTimeout(() => {
          batchTimerRef.current = null;
          const curF = selectedAssetRef.current ? String(selectedAssetRef.current).toUpperCase() : "";
          const curList = Array.from(globalCachedContracts.values());
          setContracts(
            curF
              ? curList.filter((c) => {
                const sym = String(c?.symbol || "").toUpperCase();
                const und = String(c?.underlying || "").toUpperCase();
                return sym.startsWith(curF) || und.startsWith(curF);
              })
              : curList
          );
          setIsLoading(false);
        }, 60);
      }
    }
  }, []);

  // Socket Connection & Subscription Lifecycle
  useEffect(() => {
    if (!isScreenActive) {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
        batchTimerRef.current = null;
      }
      return undefined;
    }

    const socket = optionsSocketService.acquire();

    const onConnect = () => {
      // 1. Subscribe to market overview
      optionsSocketService.emit("subscribe", { channel: OPTIONS_CHANNELS.MARKET_OVERVIEW });

      // 2. Pre-subscribe immediately to active/default underlyings in parallel (NO WAITING)
      const asset = selectedAssetRef.current;
      if (asset) {
        const uKey = asset.endsWith("USDT") || asset.endsWith("USDC") ? asset : `${asset}USDT`;
        optionsSocketService.emit("subscribe", {
          channel: OPTIONS_CHANNELS.CONTRACTS,
          underlying: uKey,
          expiry: "ALL",
        });
      } else {
        // Subscribe to initial/cached underlyings immediately
        globalCachedUnderlyings.forEach((u) => {
          if (u?.underlying) {
            optionsSocketService.emit("subscribe", {
              channel: OPTIONS_CHANNELS.CONTRACTS,
              underlying: u.underlying,
              expiry: "ALL",
            });
          }
        });
      }
    };

    const onMarketOverview = (overviewData) => {
      if (!overviewData || typeof overviewData !== "object") return;
      const uList = underlyingsFromMarketOverview(overviewData);
      if (Array.isArray(uList) && uList.length > 0) {
        globalCachedUnderlyings = uList;
        setUnderlyings(uList);

        // If "All" is active, subscribe to any additional newly discovered underlyings
        if (!selectedAssetRef.current) {
          uList.forEach((u) => {
            if (u?.underlying) {
              optionsSocketService.emit("subscribe", {
                channel: OPTIONS_CHANNELS.CONTRACTS,
                underlying: u.underlying,
                expiry: "ALL",
              });
            }
          });
        }
      }
    };

    optionsSocketService.on("connect", onConnect);
    optionsSocketService.on("market_overview", onMarketOverview);
    optionsSocketService.on("contracts_update", handleContractsData);

    if (socket.connected) {
      onConnect();
    }

    const fallbackTimer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => {
      clearTimeout(fallbackTimer);
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
        batchTimerRef.current = null;
      }
      optionsSocketService.off("connect", onConnect);
      optionsSocketService.off("market_overview", onMarketOverview);
      optionsSocketService.off("contracts_update", handleContractsData);

      // Unsubscribe all active channels
      optionsSocketService.emit("unsubscribe", { channel: OPTIONS_CHANNELS.MARKET_OVERVIEW });
      const asset = selectedAssetRef.current;
      if (asset) {
        const uKey = asset.endsWith("USDT") || asset.endsWith("USDC") ? asset : `${asset}USDT`;
        optionsSocketService.emit("unsubscribe", {
          channel: OPTIONS_CHANNELS.CONTRACTS,
          underlying: uKey,
          expiry: "ALL",
        });
      } else {
        globalCachedUnderlyings.forEach((u) => {
          if (u?.underlying) {
            optionsSocketService.emit("unsubscribe", {
              channel: OPTIONS_CHANNELS.CONTRACTS,
              underlying: u.underlying,
              expiry: "ALL",
            });
          }
        });
      }
      optionsSocketService.release();
    };
  }, [isScreenActive, handleContractsData]);

  // Instant filter switching (0ms latency, zero screen wipeout)
  const handleSelectAsset = useCallback((assetKey) => {
    setSelectedAsset(assetKey);
    selectedAssetRef.current = assetKey;
    rbSheetRef.current?.close();

    // Instant filter from memory map
    const curF = assetKey ? String(assetKey).toUpperCase() : "";
    const allList = Array.from(globalCachedContracts.values());
    const filtered = curF
      ? allList.filter((c) => {
        const sym = String(c?.symbol || "").toUpperCase();
        const und = String(c?.underlying || "").toUpperCase();
        return sym.startsWith(curF) || und.startsWith(curF);
      })
      : allList;

    setContracts(filtered);

    // Subscribe to new asset stream in background
    if (isScreenActive) {
      if (assetKey) {
        const uKey = assetKey.endsWith("USDT") || assetKey.endsWith("USDC") ? assetKey : `${assetKey}USDT`;
        optionsSocketService.emit("subscribe", {
          channel: OPTIONS_CHANNELS.CONTRACTS,
          underlying: uKey,
          expiry: "ALL",
        });
      }
    }
  }, [isScreenActive]);

  const assetOptions = useMemo(() => {
    const opts = [{ key: "", label: "All", iconUri: null }];
    if (underlyings && underlyings.length > 0) {
      underlyings.forEach((u) => {
        if (u && u.symbol) {
          opts.push({ key: u.symbol, label: u.symbol, iconUri: getCoinIcon(u.symbol) });
        }
      });
    }
    return opts;
  }, [underlyings, getCoinIcon]);

  const filterOptionsData = useMemo(() => {
    if (!search) return contracts;
    const s = search.toLowerCase();
    return contracts.filter((item) =>
      item?.symbol?.toLowerCase()?.includes(s) || item?.underlying?.toLowerCase()?.includes(s)
    );
  }, [contracts, search]);

  const handleNavigate = useCallback((item) => {
    if (item?.symbol) {
      let baseAsset = item?.symbol?.split('-')[0];
      if (baseAsset?.includes('_')) {
        baseAsset = baseAsset.split('_')[0];
      }

      NavigationService.navigate(FUTURES_SCREEN, {
        screen: "Options",
        params: { symbol: baseAsset, pair: item }
      });
    }
  }, []);

  const handleToggleFavorite = useCallback((id) => {
    if (!userData) {
      showError("Please login first to add favorites");
      NavigationService.navigate(NAVIGATION_AUTH_STACK, { screen: LOGIN_SCREEN });
      return;
    }
    if (id) {
      dispatch(addToFavorites({ pair_id: id }));
    }
  }, [dispatch, userData]);

  const renderItem = useCallback(({ item }) => (
    <OptionContractItem
      item={item}
      themeColors={themeColors}
      isDark={isDark}
      onPress={handleNavigate}
      iconUri={getCoinIcon(item?.underlying || item?.symbol)}
      isFavorite={favoriteArray?.includes(item?._id)}
      onToggleFavorite={handleToggleFavorite}
    />
  ), [themeColors, isDark, handleNavigate, getCoinIcon, favoriteArray, handleToggleFavorite]);

  const selectedLabel = assetOptions.find(o => o.key === selectedAsset)?.label || "All";

  return (
    <View style={styles.container}>
      {/* Dropdown for Underlying Asset */}
      <View style={styles.dropdownContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.dropdownButton, { backgroundColor: isDark ? colors.themeElevationColor : '#F5F5F5' }]}
          onPress={() => rbSheetRef.current?.open()}
        >
          <AppText weight={SEMI_BOLD} style={{ color: themeColors.text }}>{selectedLabel}</AppText>
          <FastImage source={downIcon} style={styles.downArrow} tintColor={themeColors.secondaryText} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      {isLoading && filterOptionsData.length === 0 ? (
        <View style={styles.list}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((k) => (
            <SkeletonItem key={k} isDark={isDark} themeColors={themeColors} />
          ))}
        </View>
      ) : filterOptionsData?.length > 0 ? (
        <FlashList
          data={filterOptionsData}
          keyExtractor={(item, index) => item?.symbol || item?._id || String(index)}
          renderItem={renderItem}
          estimatedItemSize={58}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.empty}>
          <FastImage source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT} resizeMode="contain" style={{ width: 100, height: 100 }} />
        </View>
      )}

      {/* Asset Selection Modal */}
      <RBSheet
        ref={rbSheetRef}
        customModalProps={{ statusBarTranslucent: true }}
        closeOnDragDown={true}
        closeOnPressMask={true}
        customStyles={{
          wrapper: { backgroundColor: "rgba(0,0,0,0.5)" },
          draggableIcon: { backgroundColor: themeColors.secondaryText },
          container: { backgroundColor: themeColors.background, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
        }}
        height={300}
      >
        <View style={styles.sheetContainer}>
          <AppText weight={SEMI_BOLD} style={[styles.sheetTitle, { color: themeColors.text }]}>Select Asset</AppText>
          <FlashList
            data={assetOptions}
            keyExtractor={(item) => item.key || "ALL"}
            estimatedItemSize={48}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.sheetItem}
                onPress={() => handleSelectAsset(item.key)}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {item.iconUri ? (
                    <FastImage source={{ uri: item.iconUri }} style={{ width: 20, height: 20, marginRight: 10, borderRadius: 10 }} resizeMode="contain" />
                  ) : item.key !== "" ? (
                    <FastImage source={isDark ? NO_NOTIFICATION_ICON_LIGHT : NO_NOTIFICATION_ICON} style={{ width: 20, height: 20, marginRight: 10, borderRadius: 10 }} resizeMode="contain" />
                  ) : null}
                  <AppText style={{ color: selectedAsset === item.key ? themeColors.text : themeColors.secondaryText, fontWeight: selectedAsset === item.key ? "bold" : "normal" }}>
                    {item.label}
                  </AppText>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </RBSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, marginTop: 4, paddingBottom: 12 },
  dropdownContainer: {
    paddingHorizontal: 0,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  downArrow: {
    width: 10,
    height: 10,
  },
  list: { paddingBottom: 24, paddingHorizontal: 4, paddingTop: 2 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 40,
  },
  nameCol: { flex: 1.5, minWidth: 0, justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  nameBlock: { flex: 1, minWidth: 0 },
  symbolRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  volText: { marginTop: 1 },
  priceCol: { flex: 0.7, minWidth: 60, alignItems: "flex-end", justifyContent: "center" },
  priceText: { textAlign: "right" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 40 },
  sheetContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetTitle: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  sheetItem: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#444",
  }
});

export default OptionsMarket;
