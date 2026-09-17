import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Modal,
  Animated,
  Easing,
  Pressable,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import React, { useCallback, useEffect, useMemo, useState, useRef, memo, forwardRef, useImperativeHandle } from "react";
import { useAppSelector } from "../../store/hooks";
import { useDispatch } from "react-redux";
import FastImage from "react-native-fast-image";
import { closeIcon, downIcon, searchIcon, starFillIcon, starIcon } from "../../helper/ImageAssets";
import { colors } from "../../theme/colors";
import { IMAGE_BASE_URL } from "../../helper/Constants";
import { toFixedFive, toFixedThree } from "../../helper/utility";
import { addToFavorites } from "../../actions/homeActions";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = Math.min(SCREEN_HEIGHT * 0.82, 640);
const OPEN_MS = 230;
const CLOSE_MS = 210;
const GESTURE_LOCK_MS = 320;

function compactVolume(value) {
  const n = Number(value);
  if (value == null || Number.isNaN(n)) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return `${n.toFixed(2)}`;
}

function pairSortKey(item) {
  return `${item?.base_currency || ""}/${item?.quote_currency || ""}`.toLowerCase();
}

function getChangePct(item) {
  const v = item?.change_percentage ?? item?.change;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

/** Sort caret: same `downIcon` as rest of app; rotate 180° for ascending (chevron-up). */
function SortCaret({ columnKey, sortKey, sortDir, inactiveColor, activeColor }) {
  const active = sortKey === columnKey;
  const tint = active ? activeColor : inactiveColor;
  const pointingUp = active && sortDir > 0;
  return (
    <View
      style={[
        styles.sortCaretWrap,
        { transform: [{ rotate: pointingUp ? "180deg" : "0deg" }] },
      ]}
    >
      <FastImage
        source={downIcon}
        resizeMode="contain"
        style={[styles.sortCaretImg, { tintColor: tint, opacity: active ? 1 : 0.55 }]}
      />
    </View>
  );
}

const rowAreEqual = (prev, next) => {
  return (
    prev.isFavorite === next.isFavorite &&
    prev.item?.buy_price === next.item?.buy_price &&
    prev.item?.change_percentage === next.item?.change_percentage &&
    prev.item?.change === next.item?.change &&
    prev.item?.volume === next.item?.volume &&
    prev.item?._id === next.item?._id
  );
};

const CoinRow = memo(({ item, isFavorite, onToggleFavorite, onChangePair, searchBarBg, rowBorderColor, textColor, subTextColor }) => {
  const chg = getChangePct(item);
  const chgNeg = chg < 0;
  const iconUri = item?.icon_path ? IMAGE_BASE_URL + item.icon_path : null;
  const fullName = item?.base_currency_fullname || item?.base_currency || "—";
  const volStr = compactVolume(item?.volume);
  const subtitle = `${fullName} | ${volStr}`;
  const priceStr = item?.buy_price != null ? toFixedFive(item.buy_price) : "—";
  const changeStr = `${chg >= 0 ? "+" : ""}${toFixedThree(chg)}%`;

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: rowBorderColor }]}
      onPress={() => onChangePair(item)}
      activeOpacity={0.65}
    >
      <View style={styles.rowLeft}>
        <TouchableOpacity
          onPress={(e) => {
            e?.stopPropagation?.();
            onToggleFavorite(item?._id);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.starWrap}
        >
          <FastImage
            source={isFavorite ? starFillIcon : starIcon}
            resizeMode="contain"
            style={styles.starIcon}
            tintColor={isFavorite ? colors.starColor : subTextColor}
          />
        </TouchableOpacity>
        {iconUri ? (
          <FastImage source={{ uri: iconUri }} resizeMode="cover" style={styles.coinIcon} />
        ) : (
          <View style={[styles.coinIcon, styles.coinIconPh, { backgroundColor: searchBarBg }]} />
        )}
        <View style={styles.pairBlock}>
          <Text style={[styles.pairLine, { color: textColor }]} numberOfLines={1}>
            {item?.base_currency}
            <Text style={{ fontWeight: "400", color: subTextColor }}>/{item?.quote_currency}</Text>
          </Text>
          <Text style={[styles.subLine, { color: subTextColor }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.priceLine, { color: textColor }]} numberOfLines={1}>
          {priceStr}
        </Text>
        <Text style={[styles.changeLine, { color: chgNeg ? colors.red : colors.green }]} numberOfLines={1}>
          {changeStr}
        </Text>
      </View>
    </TouchableOpacity>
  );
}, rowAreEqual);

const TradingDataModal = memo(forwardRef(({ visible, onClose, setCurrency, isDark, theme }, ref) => {
  const dispatch = useDispatch();
  const coinData = useAppSelector((state) => state.home.coinPairs);
  const favoriteArray = useAppSelector((state) => state.home.favoriteArray);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState("pair");
  const [sortDir, setSortDir] = useState(1);
  const [mounted, setMounted] = useState(false);

  const pendingCurrencyRef = useRef(null);
  const setCurrencyRef = useRef(setCurrency);
  const onCloseRef = useRef(onClose);
  const visiblePropRef = useRef(visible);
  setCurrencyRef.current = setCurrency;
  onCloseRef.current = onClose;
  visiblePropRef.current = visible;

  const sheetAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(false);
  const isOpenRef = useRef(false);
  const isClosingRef = useRef(false);
  const pendingOpenRef = useRef(false);
  const ignoreBackdropUntilRef = useRef(0);
  const ignoreOpenUntilRef = useRef(0);
  const openFallbackRef = useRef(null);
  const runOpenRef = useRef(() => { });
  const runCloseRef = useRef(() => { });

  const darkMode = typeof isDark === "boolean" ? isDark : theme === "Dark";
  const backdropMax = darkMode ? 0.55 : 0.35;

  const applyPendingAndNotify = useCallback(() => {
    const pending = pendingCurrencyRef.current;
    pendingCurrencyRef.current = null;
    requestAnimationFrame(() => {
      if (pending) setCurrencyRef.current?.(pending);
      onCloseRef.current?.();
    });
  }, []);

  const playOpenAnim = useCallback(() => {
    if (!pendingOpenRef.current) return;
    pendingOpenRef.current = false;
    if (openFallbackRef.current) {
      clearTimeout(openFallbackRef.current);
      openFallbackRef.current = null;
    }
    isClosingRef.current = false;
    Animated.timing(sheetAnim, {
      toValue: 1,
      duration: OPEN_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) isOpenRef.current = true;
    });
  }, [sheetAnim]);

  const runOpen = useCallback(() => {
    const now = Date.now();
    if (now < ignoreOpenUntilRef.current) {
      if (visiblePropRef.current === true) onCloseRef.current?.();
      return;
    }
    if (isClosingRef.current) return;
    if (mountedRef.current || isOpenRef.current || pendingOpenRef.current) return;

    ignoreBackdropUntilRef.current = now + GESTURE_LOCK_MS;
    pendingOpenRef.current = true;
    isOpenRef.current = false;
    sheetAnim.stopAnimation();
    backdropAnim.stopAnimation();
    sheetAnim.setValue(0);
    backdropAnim.setValue(backdropMax);
    setSearchQuery("");
    mountedRef.current = true;
    setMounted(true);
    openFallbackRef.current = setTimeout(playOpenAnim, 48);
  }, [backdropAnim, backdropMax, playOpenAnim, sheetAnim]);

  const runClose = useCallback(() => {
    if (!mountedRef.current || isClosingRef.current) return;

    ignoreOpenUntilRef.current = Date.now() + GESTURE_LOCK_MS;
    pendingOpenRef.current = false;
    isOpenRef.current = false;
    isClosingRef.current = true;
    if (openFallbackRef.current) {
      clearTimeout(openFallbackRef.current);
      openFallbackRef.current = null;
    }
    sheetAnim.stopAnimation();
    backdropAnim.stopAnimation();

    Animated.parallel([
      Animated.timing(sheetAnim, {
        toValue: 0,
        duration: CLOSE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: CLOSE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      isClosingRef.current = false;
      if (!finished) return;
      mountedRef.current = false;
      setMounted(false);
      applyPendingAndNotify();
    });
  }, [applyPendingAndNotify, backdropAnim, sheetAnim]);

  runOpenRef.current = runOpen;
  runCloseRef.current = runClose;

  useImperativeHandle(
    ref,
    () => ({
      open: () => runOpenRef.current(),
      close: () => runCloseRef.current(),
    }),
    []
  );

  useEffect(() => {
    if (typeof visible !== "boolean") return;
    if (visible) runOpenRef.current();
    else runCloseRef.current();
  }, [visible]);

  useEffect(() => {
    return () => {
      if (openFallbackRef.current) clearTimeout(openFallbackRef.current);
    };
  }, []);

  const requestClose = useCallback(() => {
    runCloseRef.current();
  }, []);

  const requestCloseFromBackdrop = useCallback(() => {
    if (Date.now() < ignoreBackdropUntilRef.current) return;
    runCloseRef.current();
  }, []);

  const handleModalShow = useCallback(() => {
    playOpenAnim();
  }, [playOpenAnim]);

  const modalBg = darkMode ? "#0F141C" : "#FFFFFF";
  const textColor = darkMode ? "#FFFFFF" : "#000000";
  const subTextColor = darkMode ? "rgba(255,255,255,0.55)" : "#9D9D9D";
  const borderColor = darkMode ? "rgba(255,255,255,0.12)" : "#E8E8E8";
  const rowBorderColor = darkMode ? "rgba(255,255,255,0.08)" : "#EEEEEE";
  const searchBarBg = darkMode ? "rgba(255,255,255,0.06)" : "#F5F5F5";
  const closeCircleBg = darkMode ? "rgba(255,255,255,0.12)" : "#E8E8E8";
  const iconTint = darkMode ? colors.white : colors.black;
  const searchTint = darkMode ? "rgba(255,255,255,0.65)" : "#595757";

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_HEIGHT, 0],
  });
  const backdropOpacity = backdropAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, backdropMax],
  });

  const cycleSort = useCallback(
    (key) => {
      if (sortKey === key) setSortDir((d) => -d);
      else {
        setSortKey(key);
        setSortDir(key === "change" || key === "volume" || key === "price" ? -1 : 1);
      }
    },
    [sortKey]
  );

  const filteredSorted = useMemo(() => {
    if (!coinData || !Array.isArray(coinData)) return [];
    const q = searchQuery.trim().toLowerCase();
    let list = q
      ? coinData.filter((item) => {
        const pair = pairSortKey(item);
        const base = (item?.base_currency || "").toLowerCase();
        const quote = (item?.quote_currency || "").toLowerCase();
        const full = (item?.base_currency_fullname || "").toLowerCase();
        return pair.includes(q) || base.includes(q) || quote.includes(q) || full.includes(q);
      })
      : [...coinData];

    const dir = sortDir;
    const cmp = (a, b) => {
      let va;
      let vb;
      switch (sortKey) {
        case "volume":
          va = Number(a?.volume) || 0;
          vb = Number(b?.volume) || 0;
          return va === vb ? pairSortKey(a).localeCompare(pairSortKey(b)) : va < vb ? -1 : 1;
        case "price":
          va = Number(a?.buy_price) || 0;
          vb = Number(b?.buy_price) || 0;
          return va === vb ? pairSortKey(a).localeCompare(pairSortKey(b)) : va < vb ? -1 : 1;
        case "change":
          va = getChangePct(a);
          vb = getChangePct(b);
          return va === vb ? pairSortKey(a).localeCompare(pairSortKey(b)) : va < vb ? -1 : 1;
        case "pair":
        default:
          return pairSortKey(a).localeCompare(pairSortKey(b));
      }
    };
    list.sort((a, b) => dir * cmp(a, b));
    return list;
  }, [coinData, searchQuery, sortKey, sortDir]);

  const handleChangePair = useCallback(
    (item) => {
      pendingCurrencyRef.current = item;
      requestClose();
    },
    [requestClose]
  );



  const handleToggleFavorite = useCallback(
    (id) => {
      if (id) dispatch(addToFavorites({ pair_id: id }));
    },
    [dispatch]
  );

  const sortActiveTint = darkMode ? "#FFFFFF" : "#222222";

  const renderHeader = useCallback(
    () => (
      <View style={[styles.tableHeaderWrap, { borderBottomColor: rowBorderColor }]}>
        <View style={styles.tableHeaderLeft}>
          <View
            style={styles.headerSortRow}

          >
            {/* Trading Pair */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.headerLabel, { color: subTextColor }]}>
                Trading Pair
              </Text>

              <View style={{ marginLeft: 4 }}>
                <Text style={{ fontSize: 8, color: subTextColor }}>▲</Text>
                <Text style={{ fontSize: 8, color: subTextColor, marginTop: -3 }}>▼</Text>
              </View>
            </View>

            {/* Slash */}
            <Text style={{ marginHorizontal: 6, color: subTextColor }}>/</Text>

            {/* Total */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.headerLabel, { color: subTextColor }]}>
                Total
              </Text>

              <View style={{ marginLeft: 4 }}>
                <Text style={{ fontSize: 8, color: subTextColor }}>▲</Text>
                <Text style={{ fontSize: 8, color: subTextColor, marginTop: -3 }}>▼</Text>
              </View>
            </View>
          </View>

        </View>
        <View style={styles.tableHeaderRight}>
          <View
            style={styles.headerSortRowEnd}

          >
            {/* Price */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.headerLabel, { color: subTextColor }]}>
                Price
              </Text>

              <View style={{ marginLeft: 4 }}>
                <Text style={{ fontSize: 8, color: subTextColor }}>▲</Text>
                <Text style={{ fontSize: 8, color: subTextColor, marginTop: -3 }}>▼</Text>
              </View>
            </View>

            {/* Slash */}
            <Text style={{ marginHorizontal: 6, color: subTextColor }}>/</Text>

            {/* Chg% */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.headerLabel, { color: subTextColor }]}>
                Chg%
              </Text>

              <View style={{ marginLeft: 4 }}>
                <Text style={{ fontSize: 8, color: subTextColor }}>▲</Text>
                <Text style={{ fontSize: 8, color: subTextColor, marginTop: -3 }}>▼</Text>
              </View>
            </View>
          </View>

        </View>
      </View>
    ),
    [cycleSort, rowBorderColor, sortActiveTint, sortDir, sortKey, subTextColor]
  );

  const renderItem = useCallback(
    ({ item }) => {
      const isFavorite = favoriteArray?.includes(item?._id);
      return (
        <CoinRow
          item={item}
          isFavorite={isFavorite}
          onToggleFavorite={handleToggleFavorite}
          onChangePair={handleChangePair}
          searchBarBg={searchBarBg}
          rowBorderColor={rowBorderColor}
          textColor={textColor}
          subTextColor={subTextColor}
        />
      );
    },
    [
      favoriteArray,
      handleChangePair,
      handleToggleFavorite,
      rowBorderColor,
      searchBarBg,
      subTextColor,
      textColor,
    ]
  );

  const keyExtractor = useCallback((item, index) => item?._id || String(index), []);

  const listEmpty = useMemo(() => {
    // If no coin data has arrived from Redux yet, it's loading.
    if (!coinData || (coinData.length === 0 && !searchQuery)) {
      return (
        <View style={styles.emptyWrap}>
          <ActivityIndicator size="small" color={textColor} />
          <Text style={[styles.emptyText, { color: subTextColor, marginTop: 12 }]}>Loading pairs...</Text>
        </View>
      );
    }
    // If data exists but search query doesn't match anything
    return (
      <View style={styles.emptyWrap}>
        <Text style={[styles.emptyText, { color: subTextColor }]}>No pairs found</Text>
      </View>
    );
  }, [coinData, searchQuery, subTextColor, textColor]);

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={requestClose}
      onShow={handleModalShow}
    >
      <View style={styles.modalRoot} pointerEvents="box-none">
        <Pressable style={StyleSheet.absoluteFill} onPress={requestCloseFromBackdrop}>
          <Animated.View
            pointerEvents="none"
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          />
        </Pressable>
        <Animated.View
          style={[
            styles.sheet,
            {
              height: SHEET_HEIGHT,
              backgroundColor: modalBg,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
          collapsable={false}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: textColor }]}>Select Coin</Text>
            <TouchableOpacity
              onPress={requestClose}
              style={[styles.closeCircle, { backgroundColor: closeCircleBg }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.75}
            >
              <FastImage source={closeIcon} resizeMode="contain" style={styles.closeIcon} tintColor={iconTint} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchRow, { backgroundColor: searchBarBg, borderColor }]}>
            <FastImage source={searchIcon} resizeMode="contain" style={styles.searchGlyph} tintColor={searchTint} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search token"
              placeholderTextColor={subTextColor}
              style={[styles.searchInput, { color: textColor }]}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
          </View>

          {renderHeader()}

          <View style={styles.listFlex}>
            <FlashList
              data={filteredSorted}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={listEmpty}
              estimatedItemSize={65}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}), (prev, next) => (
  prev.visible === next.visible &&
  prev.isDark === next.isDark &&
  prev.theme === next.theme
));

export default TradingDataModal;

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 10,
    overflow: "hidden",
  },
  listFlex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  closeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: {
    width: 15,
    height: 15,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: 10,
    paddingRight: 5,
    paddingVertical: 4,
    marginBottom: 10,
  },
  searchGlyph: {
    width: 14,
    height: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
    paddingHorizontal: 2,
    minHeight: 34,
  },
  pasteBtn: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    marginLeft: 4,
  },
  pasteText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sortCaretWrap: {
    marginLeft: 3,
    width: 12,
    height: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  sortCaretImg: {
    width: 8,
    height: 8,
  },
  tableHeaderWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 8,
    marginBottom: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableHeaderLeft: {
    flex: 1,
    gap: 4,
  },
  tableHeaderRight: {
    flex: 1,
    alignItems: "flex-end",
    gap: 4,
  },
  headerSortRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  headerSortRowEnd: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    paddingRight: 8,
  },
  starWrap: {
    marginRight: 5,
  },
  starIcon: {
    width: 14,
    height: 14,
  },
  coinIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  coinIconPh: {},
  pairBlock: {
    flex: 1,
    minWidth: 0,
  },
  pairLine: {
    fontSize: 14,
    fontWeight: "700",
  },
  subLine: {
    fontSize: 11,
    marginTop: 2,
  },
  rowRight: {
    alignItems: "flex-end",
    maxWidth: "38%",
  },
  priceLine: {
    fontSize: 13,
    fontWeight: "700",
  },
  changeLine: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  emptyWrap: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
  },
});
