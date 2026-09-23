import React, { useCallback, useState, useMemo, useRef, useEffect } from "react";
import {
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Platform,
  Vibration,
  PanResponder,
  Dimensions,
} from "react-native";
import RBSheet from "react-native-raw-bottom-sheet";
import {
  AppSafeAreaView,
  AppText,
  FOURTEEN,
  SEMI_BOLD,
  TWELVE,
  TWENTY,
  TEN,
  BOLD,
  THIRTEEN,
  ELEVEN,
  FIFTEEN,
  EIGHTEEN,
  SIXTEEN,
} from "../../../shared";
import FastImage from "react-native-fast-image";
import {
  back_ic,
  searchIcon,
  INFO,
  printIcon,
  upIcon,
  downIcon,
} from "../../../helper/ImageAssets";
import { WITHDRAW_HISTORY_SCREEN, WITHDRAW_FIAT_SCREEN } from "../../../navigation/routes";
import { buildCoinImageUri } from "../../../helper/coinIconUrl";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import NavigationService from "../../../navigation/NavigationService";
import { useAppSelector } from "../../../store/hooks";
import { useDispatch } from "react-redux";
import { getDepositFiatCoins, getWithdrawActiveCoins, getUserMainWallet } from "../../../actions/walletActions";
import { colors, darkTheme, lightTheme } from "../../../theme/colors";
import { useTheme } from "../../../hooks/useTheme";
import {
  isWithdrawCoinDisabled,
  networkKeysFromChain,
} from "../../../helper/walletChainHelpers";
import { showError } from "../../../helper/logger";

const TRENDING_COIN_SYMBOLS = [
  "BTC", "ETH", "BNB", "USDT", "USDC", "XRP", "SOL", "DOGE", "MATIC", "DOT", "LTC", "TRX", "SHIB", "ADA", "BUSD",
];

const COIN_LIST_ROW_GAP = 12;
const COIN_LIST_ROW_INNER = 64;
const COIN_LIST_ROW_STRIDE = COIN_LIST_ROW_INNER + COIN_LIST_ROW_GAP;
const LETTER_KEYS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const triggerRailHaptic = () => {
  if (Platform.OS === "android") {
    try {
      Vibration.vibrate(1);
    } catch { /* ignore */ }
  }
};

const buildLetterFirstIndexMap = (sorted) => {
  const map = {};
  const trendSet = new Set(TRENDING_COIN_SYMBOLS);

  (sorted || []).forEach((item, index) => {
    const sn = String(item?.short_name || "").toUpperCase();
    const ch = sn.charAt(0);
    if (!/[A-Z]/.test(ch)) return;
    if (map[ch] === undefined) map[ch] = index;
  });

  (sorted || []).forEach((item, index) => {
    const sn = String(item?.short_name || "").toUpperCase();
    const sym = sn;
    const ch = sn.charAt(0);
    if (!/[A-Z]/.test(ch)) return;
    if (!trendSet.has(sym)) {
      const currentIdx = map[ch];
      const currentSym = String(sorted[currentIdx]?.short_name || "").toUpperCase();
      if (trendSet.has(currentSym)) {
        map[ch] = index;
      }
    }
  });
  return map;
};

const resolveScrollIndexForLetter = (letter, map) => {
  if (map[letter] !== undefined) return map[letter];
  const start = LETTER_KEYS.indexOf(letter);
  if (start < 0) return null;
  for (let i = start; i < LETTER_KEYS.length; i++) {
    const k = LETTER_KEYS[i];
    if (map[k] !== undefined) return map[k];
  }
  for (let i = start - 1; i >= 0; i--) {
    const k = LETTER_KEYS[i];
    if (map[k] !== undefined) return map[k];
  }
  return null;
};

const indexToRailLetter = (sorted, index) => {
  if (index < 0 || index >= sorted.length) return null;
  const sn = String(sorted[index]?.short_name || "").toUpperCase();
  const ch = sn.charAt(0);
  if (!/[A-Z]/.test(ch)) return null;
  return ch;
};

const yToRailLetter = (locationY, railHeight) => {
  const h = Math.max(1, railHeight);
  const y = Math.max(0, Math.min(locationY, h));
  const ratio = y / h;
  const idx = Math.min(
    LETTER_KEYS.length - 1,
    Math.floor(ratio * LETTER_KEYS.length)
  );
  return LETTER_KEYS[idx];
};

const SelectCoin = () => {
  const dispatch = useDispatch();
  const route = useRoute();
  const theme = useAppSelector((state) => state.auth.theme);
  const isDark = theme === "Dark";
  const { colors: themeColors } = useTheme();
  const withdrawActiveCoins = useAppSelector((state) => state.wallet.withdrawActiveCoins);
  const depositFiatCoins = useAppSelector((state) => state.wallet.depositFiatCoins);
  const userMainWallet = useAppSelector((state) => state.wallet.userMainWallet || []);
  const isFrom = route?.params?.data;

  const [activeTab, setActiveTab] = useState(isFrom || "Crypto");
  const withdrawFaqSheetRef = useRef(null);
  const [faqActiveIndex, setFaqActiveIndex] = useState(null);

  const faqData = [
    {
      title: "How to Withdraw Crypto?",
      content: "To withdraw crypto, go to the withdrawal section, select your cryptocurrency, enter the recipient wallet address, choose the correct network, and specify the amount. Review the details carefully before confirming the withdrawal. Processing time may vary based on network congestion and withdrawal policies."
    },
    {
      title: "How to Withdraw Crypto Step-by-step Guide",
      content: "• Go to the Withdrawal Section – Navigate to the withdrawal page.\n• Select Your Crypto – Choose the cryptocurrency you want to withdraw.\n• Enter the Wallet Address – Make sure the address is correct and belongs to the selected blockchain network.\n• Choose the Network – Select the correct blockchain network (e.g., BEP20, ERC20, TRC20, Polygon).\n• Enter the Amount – Specify the amount you want to withdraw, ensuring it meets the minimum withdrawal limit.\n• Confirm & Submit – Review all details carefully and confirm the withdrawal.\n• Wait for Processing – Withdrawals are processed based on network congestion and request approval."
    },
    {
      title: "Withdrawal hasn't arrived?",
      content: "• Check Transaction Status – Use a blockchain explorer to track the transaction.\n• Verify the Wallet Address – Ensure the recipient address is correct.\n• Confirm Network Selection – The chosen network should match the recipient's wallet.\n• Check for Pending Processing – Some withdrawals require manual approval."
    }
  ];
  const [searchResult, setSearchResult] = useState("");
  const [listScreenLoading, setListScreenLoading] = useState(true);
  const [railScrollLetter, setRailScrollLetter] = useState(null);
  const [bubbleLetter, setBubbleLetter] = useState(null);

  const coinFlatListRef = useRef(null);
  const railLayoutHeightRef = useRef(1);
  const railDragActiveRef = useRef(false);
  const lastRailHapticLetterRef = useRef(null);
  const bubbleHideTimeoutRef = useRef(null);
  const sortedSelectCoinsRef = useRef([]);
  const letterFirstIndexMapRef = useRef({});
  const scrollToLetterRef = useRef(() => { });
  const onViewableItemsChangedRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setListScreenLoading(true);
      (async () => {
        await Promise.all([
          dispatch(getWithdrawActiveCoins()),
          dispatch(getDepositFiatCoins()),
          dispatch(getUserMainWallet()),
        ]);
        if (!cancelled) setListScreenLoading(false);
      })();
      return () => { cancelled = true; };
    }, [dispatch])
  );

  const getWithdrawMinHint = (coin) => {
    const chains = coin?.chain || [];
    if (!chains.length) return "—";
    const firstChain = chains[0];
    const minMap = coin?.min_withdrawal || coin?.min_withdraw || coin?.min_deposit || {};
    const min = minMap[firstChain];
    if (min == null || min === "" || min === "—") return "—";
    return `${min} ${coin?.short_name || ""}`.trim();
  };

  const sortedCoins = useMemo(() => {
    const list = activeTab === "Fiat" ? (depositFiatCoins || []) : (withdrawActiveCoins || []);
    const q = searchResult.trim().toLowerCase();

    if (q) {
      const filtered = list.filter(
        (c) =>
          String(c?.short_name || "").toLowerCase().includes(q) ||
          String(c?.name || "").toLowerCase().includes(q)
      );
      return filtered.sort((a, b) => {
        const sA = String(a?.short_name || "").toUpperCase();
        const sB = String(b?.short_name || "").toUpperCase();
        const qU = q.toUpperCase();
        if (sA === qU && sB !== qU) return -1;
        if (sB === qU && sA !== qU) return 1;
        const aS = sA.startsWith(qU);
        const bS = sB.startsWith(qU);
        if (aS && !bS) return -1;
        if (!aS && bS) return 1;
        const nA = String(a?.name || "").toUpperCase();
        const nB = String(b?.name || "").toUpperCase();
        const aNS = nA.startsWith(qU);
        const bNS = nB.startsWith(qU);
        if (aNS && !bNS) return -1;
        if (!aNS && bNS) return 1;
        return sA.localeCompare(sB);
      });
    }

    const trending = [];
    const rest = [];
    const trendSet = new Set(TRENDING_COIN_SYMBOLS);
    const bySym = new Map();
    list.forEach(c => {
      const sym = String(c?.short_name || "").toUpperCase();
      if (sym) bySym.set(sym, c);
    });
    TRENDING_COIN_SYMBOLS.forEach(sym => {
      if (bySym.has(sym)) trending.push(bySym.get(sym));
    });
    const trendingIdSet = new Set(trending.map(c => c._id || c.short_name));
    list.forEach(c => {
      if (!trendingIdSet.has(c._id || c.short_name)) rest.push(c);
    });
    rest.sort((a, b) => String(a?.short_name || "").toUpperCase().localeCompare(String(b?.short_name || "").toUpperCase()));
    return [...trending, ...rest];
  }, [activeTab, depositFiatCoins, withdrawActiveCoins, searchResult]);

  useEffect(() => {
    sortedSelectCoinsRef.current = sortedCoins;
    letterFirstIndexMapRef.current = buildLetterFirstIndexMap(sortedCoins);
  }, [sortedCoins]);

  scrollToLetterRef.current = (letter, animated) => {
    const map = letterFirstIndexMapRef.current;
    const list = sortedSelectCoinsRef.current;
    const idx = resolveScrollIndexForLetter(letter, map);
    if (idx == null || idx < 0 || !list.length) return;
    try {
      coinFlatListRef.current?.scrollToIndex({
        index: idx,
        animated,
        viewPosition: 0,
      });
    } catch {
      coinFlatListRef.current?.scrollToOffset({
        offset: idx * COIN_LIST_ROW_STRIDE,
        animated,
      });
    }
  };

  onViewableItemsChangedRef.current = ({ viewableItems }) => {
    if (railDragActiveRef.current) return;
    const top = viewableItems.find((v) => v?.isViewable && typeof v?.index === "number");
    if (top?.index == null) return;
    const letter = indexToRailLetter(sortedSelectCoinsRef.current, top.index);
    setRailScrollLetter(letter);
  };

  const onViewableItemsChanged = useCallback((info) => {
    onViewableItemsChangedRef.current?.(info);
  }, []);

  const alphabetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: (evt) => {
          if (bubbleHideTimeoutRef.current) clearTimeout(bubbleHideTimeoutRef.current);
          railDragActiveRef.current = true;
          const letter = yToRailLetter(evt.nativeEvent.locationY, railLayoutHeightRef.current);
          setBubbleLetter(letter);
          setRailScrollLetter(letter);
          lastRailHapticLetterRef.current = letter;
          scrollToLetterRef.current(letter, true);
          triggerRailHaptic();
        },
        onPanResponderMove: (evt) => {
          const letter = yToRailLetter(evt.nativeEvent.locationY, railLayoutHeightRef.current);
          if (lastRailHapticLetterRef.current !== letter) {
            setBubbleLetter(letter);
            setRailScrollLetter(letter);
            lastRailHapticLetterRef.current = letter;
            scrollToLetterRef.current(letter, false);
            triggerRailHaptic();
          }
        },
        onPanResponderRelease: () => {
          railDragActiveRef.current = false;
          lastRailHapticLetterRef.current = null;
          bubbleHideTimeoutRef.current = setTimeout(() => setBubbleLetter(null), 160);
        },
        onPanResponderTerminate: () => {
          railDragActiveRef.current = false;
          setBubbleLetter(null);
        },
      }),
    []
  );

  const highlightedRailLetter = bubbleLetter ?? railScrollLetter;

  const coinQuickPickDisplay = useMemo(() => {
    if (!sortedCoins.length) return [];
    const q = searchResult.trim();
    return q ? sortedCoins.slice(0, 5) : sortedCoins.slice(0, 6);
  }, [searchResult, sortedCoins]);

  const renderCoinItem = ({ item }) => {
    const withdrawDisabled = activeTab === "Crypto" && isWithdrawCoinDisabled(item);
    const iconUri = buildCoinImageUri(item);
    return (
      <TouchableOpacity
        style={[styles.coinRow, { opacity: withdrawDisabled ? 0.45 : 1 }]}
        activeOpacity={withdrawDisabled ? 1 : 0.7}
        onPress={() => {
          if (withdrawDisabled) {
            if (networkKeysFromChain(item?.chain).length === 0) showError("No withdrawal network available for this coin");
            else showError("No active withdrawal network for this coin");
            return;
          }
          NavigationService.navigate("WITHDRAW_FORM_SCREEN", { data: item });
        }}
      >
        <FastImage source={iconUri ? { uri: iconUri } : null} style={styles.coinIcon} resizeMode="cover" />
        <View style={styles.coinInfo}>
          <AppText weight={SEMI_BOLD} type={FIFTEEN} style={{ color: isDark ? colors.white : colors.black }}>{item?.short_name}</AppText>
          <AppText type={THIRTEEN} style={{ color: colors.textGray, marginTop: 1 }}>{item?.name}</AppText>
        </View>
        <View style={styles.balanceInfo}>
          <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: isDark ? colors.white : colors.black }}>{getWithdrawMinHint(item)}</AppText>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <AppSafeAreaView style={{ backgroundColor: isDark ? colors.background : colors.white }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => NavigationService.goBack()} style={styles.backBtn}>
          <FastImage source={back_ic} style={styles.backIcon} resizeMode="contain" />
        </TouchableOpacity>
        <AppText weight={SEMI_BOLD} type={EIGHTEEN} style={{ color: isDark ? colors.white : colors.black }}>Select Coin</AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity
            onPress={() => {
              setFaqActiveIndex(null);
              withdrawFaqSheetRef.current?.open();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <FastImage source={INFO} resizeMode="contain" style={{ width: 18, height: 18 }} tintColor={isDark ? colors.white : colors.black} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => NavigationService.navigate(WITHDRAW_HISTORY_SCREEN)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <FastImage source={printIcon} resizeMode="contain" style={{ width: 20, height: 17 }} tintColor={isDark ? colors.white : colors.black} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: isDark ? darkTheme.darkThemeInputColor : lightTheme.input }]}>
          <FastImage source={searchIcon} style={styles.searchIconStyle} tintColor={isDark ? colors.secondaryText : colors.textGray} resizeMode="contain" />
          <TextInput
            placeholder="Search for Coin"
            placeholderTextColor={isDark ? colors.secondaryText : colors.textGray}
            value={searchResult}
            onChangeText={setSearchResult}
            style={[styles.searchInput, { color: isDark ? colors.white : colors.black }]}
          />
        </View>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPickScroll}>
          {coinQuickPickDisplay.map((item) => (
            <TouchableOpacity
              key={item?._id || item?.short_name}
              style={[styles.quickPickChip, { backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#F5F5F7" }]}
              onPress={() => {
                const withdrawDisabled = isWithdrawCoinDisabled(item);
                if (withdrawDisabled) {
                  if (networkKeysFromChain(item?.chain).length === 0) showError("No withdrawal network available for this coin");
                  else showError("No active withdrawal network for this coin");
                  return;
                }
                NavigationService.navigate("WITHDRAW_FORM_SCREEN", { data: item });
              }}
            >
              <FastImage source={buildCoinImageUri(item) ? { uri: buildCoinImageUri(item) } : null} style={styles.quickPickIcon} />
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: isDark ? colors.white : colors.black }}>{item?.short_name}</AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.listSection}>
        <View style={styles.listRow}>
          <FlatList
            ref={coinFlatListRef}
            data={sortedCoins}
            keyExtractor={(item, index) => item?._id ? String(item._id) : String(index)}
            renderItem={renderCoinItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            getItemLayout={(_, index) => ({ length: COIN_LIST_ROW_STRIDE, offset: COIN_LIST_ROW_STRIDE * index, index })}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={10}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 18, minimumViewTime: 48 }}
            onScrollToIndexFailed={({ index }) => {
              const safe = Math.max(0, Math.min(index, sortedCoins.length - 1));
              setTimeout(() => {
                try {
                  coinFlatListRef.current?.scrollToOffset({ offset: safe * COIN_LIST_ROW_STRIDE, animated: false });
                } catch { }
              }, 64);
            }}
            ListEmptyComponent={() => !listScreenLoading && <AppText style={styles.emptyText}>No coin found</AppText>}
          />

          {sortedCoins.length > 0 && !searchResult && (
            <View style={styles.alphabetIndexRail}>
              <View
                style={styles.alphabetIndexLettersColumn}
                onLayout={(e) => { railLayoutHeightRef.current = e.nativeEvent.layout.height; }}
                {...alphabetPanResponder.panHandlers}
              >
                {LETTER_KEYS.map((label) => (
                  <View key={label} style={styles.alphabetIndexLetterCell}>
                    <AppText type={TEN} style={{ color: highlightedRailLetter === label ? (isDark ? colors.white : colors.black) : colors.textGray, fontWeight: "700" }}>{label}</AppText>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>

      {bubbleLetter != null && (
        <View style={styles.alphabetBubbleWrap} pointerEvents="none">
          <View style={[styles.alphabetBubble, { backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.4)" }]}>
            <AppText weight={SEMI_BOLD} type={TWENTY} style={{ color: "#FFF" }}>{bubbleLetter}</AppText>
          </View>
        </View>
      )}

      <RBSheet customModalProps={{ statusBarTranslucent: true }}
        ref={withdrawFaqSheetRef}
        height={Math.round(Dimensions.get("window").height * 0.55)}
        closeOnDragDown
        closeOnPressMask
        keyboardAvoidingViewEnabled={false}
        customStyles={{
          container: {
            backgroundColor: themeColors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          },
          wrapper: { backgroundColor: "rgba(0,0,0,0.6)" },
          draggableIcon: { backgroundColor: colors.textGray },
        }}
      >
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 }}>
          <View style={styles.modalHeader}>
            <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: themeColors.text }}>
              Withdraw help
            </AppText>
            <TouchableOpacity onPress={() => withdrawFaqSheetRef.current?.close()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <AppText type={TWENTY} style={{ color: themeColors.text }}>
                ×
              </AppText>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.modalList}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {faqData.map((item, index) => (
              <View
                key={String(index)}
                style={[
                  styles.faqItemInner,
                  index === faqData.length - 1 && styles.faqItemInnerLast,
                  { borderColor: isDark ? themeColors.border : colors.inputBorder },
                ]}
              >
                <TouchableOpacity
                  style={styles.faqQuestionRow}
                  onPress={() => setFaqActiveIndex(faqActiveIndex === index ? null : index)}
                  activeOpacity={0.7}
                >
                  <AppText type={THIRTEEN} weight={SEMI_BOLD} style={[styles.faqQuestion, { color: themeColors.secondaryText }]}>
                    {item.title}
                  </AppText>
                  <FastImage
                    source={faqActiveIndex === index ? upIcon : downIcon}
                    resizeMode="contain"
                    style={styles.faqArrow}
                    tintColor={themeColors.secondaryText}
                  />
                </TouchableOpacity>
                {faqActiveIndex === index && (
                  <View style={styles.faqAnswer}>
                    {item.content.split("\n").map((line, lineIndex) => (
                      <AppText key={lineIndex} type={TWELVE} style={{ color: themeColors.secondaryText, lineHeight: 18 }}>
                        {line}
                      </AppText>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Bottom Note & Withdraw Fiat Link */}
          <View style={{ borderTopWidth: 1, borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0", paddingTop: 14, marginTop: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-start", flexWrap: "wrap" }}>
              <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>
                Looking to withdraw local currency (AED) instead?{" "}
              </AppText>
              <TouchableOpacity
                onPress={() => {
                  withdrawFaqSheetRef.current?.close();
                  NavigationService.navigate(WITHDRAW_FIAT_SCREEN);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <AppText type={TWELVE} weight={BOLD} color={colors.cyanTheme}>
                  Withdraw Fiat ›
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </RBSheet>
    </AppSafeAreaView>
  );
};

export default SelectCoin;

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, height: 56, justifyContent: "space-between" },
  backBtn: { padding: 8, marginLeft: -8 },
  backIcon: { width: 35, height: 35 },
  searchSection: { paddingHorizontal: 16, marginTop: 8 },
  searchBar: { flexDirection: "row", alignItems: "center", height: 48, borderRadius: 8, paddingHorizontal: 12 },
  searchIconStyle: { width: 18, height: 18, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  quickPickScroll: { paddingHorizontal: 16, marginTop: 16, gap: 8, paddingBottom: 16 },
  quickPickChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, height: 36 },
  quickPickIcon: { width: 20, height: 20, marginRight: 6, borderRadius: 10 },
  listSection: { marginTop: 0, paddingHorizontal: 16, flex: 1 },
  listRow: { flexDirection: "row", flex: 1, position: "relative" },
  listContent: { paddingBottom: 40, paddingRight: 40 },
  coinRow: { flexDirection: "row", alignItems: "center", height: COIN_LIST_ROW_INNER, marginBottom: COIN_LIST_ROW_GAP, paddingRight: 8 },
  coinIcon: { width: 38, height: 38, borderRadius: 19 },
  coinInfo: { marginLeft: 12, flex: 1 },
  balanceInfo: { alignItems: "flex-end", paddingRight: 4 },
  emptyText: { textAlign: "center", marginTop: 40, color: colors.textGray },
  alphabetIndexRail: { position: "absolute", right: -12, top: 0, bottom: 0, width: 40, zIndex: 10, justifyContent: "flex-start" },
  alphabetIndexLettersColumn: { width: "100%", paddingVertical: 2 },
  alphabetIndexLetterCell: { height: 14, marginBottom: 5, justifyContent: "center", alignItems: "center" },
  alphabetBubbleWrap: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", zIndex: 100 },
  alphabetBubble: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalList: {
    flex: 1,
  },
  faqItemInner: {
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(128,128,128,0.15)",
  },
  faqItemInnerLast: { borderBottomWidth: 0 },
  faqQuestionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQuestion: { flex: 1 },
  faqArrow: { width: 10, height: 10, marginLeft: 8 },
  faqAnswer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.2)",
  },
});
