import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  PanResponder,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
  RefreshControl,
} from "react-native";
import { AppText, FOURTEEN, RED, SEMI_BOLD, TEN, TWELVE, TWENTY } from "../../shared";
import FastImage from "react-native-fast-image";
import { NO_NOTIFICATION_ICON, searchIcon } from "../../helper/ImageAssets";
import { buildCoinImageUri } from "../../helper/coinIconUrl";
import { bitcoinIcon } from "../../helper/ImageAssets";
import { colors } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";
import { universalPaddingHorizontalHigh } from "../../theme/dimens";
import {
  getActiveWithdrawChainKeys,
  isWithdrawCoinDisabled,
  networkKeysFromChain,
} from "../../helper/walletChainHelpers";
import { showError } from "../../helper/logger";
import ShimmerBone from "../../shared/components/ShimmerBone";

const COIN_LIST_ROW_GAP = 12;
const COIN_LIST_ROW_INNER = 64;
const COIN_LIST_ROW_STRIDE = COIN_LIST_ROW_INNER + COIN_LIST_ROW_GAP;
const LETTER_KEYS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const triggerRailHaptic = () => {
  if (Platform.OS === "android") {
    try {
      Vibration.vibrate(1);
    } catch {
      /* ignore */
    }
  }
};

const sortCoinsByShortName = (arr) =>
  [...(arr || [])].sort((a, b) =>
    String(a?.short_name || "").localeCompare(String(b?.short_name || ""), undefined, {
      sensitivity: "base",
      numeric: true,
    })
  );

const buildLetterFirstIndexMap = (sorted) => {
  const map = {};
  (sorted || []).forEach((item, index) => {
    const sn = String(item?.short_name || "");
    const ch = sn.charAt(0);
    if (!/[A-Za-z]/.test(ch)) return;
    const L = ch.toUpperCase();
    if (map[L] === undefined) map[L] = index;
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
  const sn = String(sorted[index]?.short_name || "");
  const ch = sn.charAt(0);
  if (!/[A-Za-z]/.test(ch)) return null;
  return ch.toUpperCase();
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

const WithdrawCoinPickerSkeleton = () => (
  <View style={styles.selectCoinPhase}>
    <View
      style={[styles.selectCoinSearchWrap, { borderWidth: 0 }]}
    >
      <ShimmerBone width="100%" height={48} borderRadius={10} />
    </View>
    <View style={styles.selectCoinListRow}>
      <View style={[styles.sectionListFlex, { paddingTop: 4 }]}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: COIN_LIST_ROW_GAP,
              minHeight: COIN_LIST_ROW_INNER,
            }}
          >
            <ShimmerBone width={40} height={40} borderRadius={20} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <ShimmerBone
                width={88}
                height={16}
                borderRadius={4}
                style={{ marginBottom: 8 }}
              />
              <ShimmerBone width="55%" height={12} borderRadius={4} />
            </View>
          </View>
        ))}
      </View>
    </View>
  </View>
);

/** DepositCoin-style list (search + A–Z) embedded in WithdrawWallet select step */
const WithdrawCoinPickerPanel = ({ coins, onSelect, loading, refreshing, onRefresh }) => {
  const { colors: themeColors, isDark } = useTheme();
  const [searchPair, setSearchPair] = useState("");
  const [railScrollLetter, setRailScrollLetter] = useState(null);
  const [bubbleLetter, setBubbleLetter] = useState(null);

  const coinFlatListRef = useRef(null);
  const letterFirstIndexMapRef = useRef({});
  const sortedSelectCoinsRef = useRef([]);
  const railLayoutHeightRef = useRef(1);
  const railDragActiveRef = useRef(false);
  const lastRailHapticLetterRef = useRef(null);
  const bubbleHideTimeoutRef = useRef(null);
  const scrollToLetterRef = useRef(() => { });
  const onViewableItemsChangedRef = useRef(null);

  useEffect(() => {
    return () => {
      if (bubbleHideTimeoutRef.current) {
        clearTimeout(bubbleHideTimeoutRef.current);
      }
    };
  }, []);

  const filtered = useMemo(() => {
    const list = coins || [];
    const q = String(searchPair || "").trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c?.short_name?.toLowerCase().includes(q) ||
        c?.name?.toLowerCase().includes(q)
    );
  }, [coins, searchPair]);

  const sortedCoins = useMemo(() => sortCoinsByShortName(filtered), [filtered]);
  const letterFirstIndexMap = useMemo(
    () => buildLetterFirstIndexMap(sortedCoins),
    [sortedCoins]
  );

  useEffect(() => {
    sortedSelectCoinsRef.current = sortedCoins;
  }, [sortedCoins]);

  useEffect(() => {
    letterFirstIndexMapRef.current = letterFirstIndexMap;
  }, [letterFirstIndexMap]);

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
        viewOffset: 0,
      });
    } catch {
      coinFlatListRef.current?.scrollToOffset({
        offset: idx * COIN_LIST_ROW_STRIDE,
        animated,
      });
    }
  };

  const viewabilityConfig = useMemo(
    () => ({
      itemVisiblePercentThreshold: 18,
      minimumViewTime: 48,
    }),
    []
  );

  onViewableItemsChangedRef.current = ({ viewableItems }) => {
    if (railDragActiveRef.current) return;
    const top = viewableItems.find(
      (v) => v?.isViewable && typeof v?.index === "number"
    );
    if (top?.index == null) return;
    const letter = indexToRailLetter(sortedSelectCoinsRef.current, top.index);
    setRailScrollLetter(letter);
  };

  const onViewableItemsChanged = useCallback((info) => {
    onViewableItemsChangedRef.current?.(info);
  }, []);

  const highlightedRailLetter = bubbleLetter ?? railScrollLetter;

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
          if (bubbleHideTimeoutRef.current) {
            clearTimeout(bubbleHideTimeoutRef.current);
            bubbleHideTimeoutRef.current = null;
          }
          railDragActiveRef.current = true;
          const letter = yToRailLetter(
            evt.nativeEvent.locationY,
            railLayoutHeightRef.current
          );
          setBubbleLetter(letter);
          setRailScrollLetter(letter);
          lastRailHapticLetterRef.current = letter;
          scrollToLetterRef.current(letter, false);
          triggerRailHaptic();
        },
        onPanResponderMove: (evt) => {
          const letter = yToRailLetter(
            evt.nativeEvent.locationY,
            railLayoutHeightRef.current
          );
          setBubbleLetter(letter);
          setRailScrollLetter(letter);
          if (lastRailHapticLetterRef.current !== letter) {
            lastRailHapticLetterRef.current = letter;
            scrollToLetterRef.current(letter, false);
            triggerRailHaptic();
          }
        },
        onPanResponderRelease: () => {
          railDragActiveRef.current = false;
          lastRailHapticLetterRef.current = null;
          bubbleHideTimeoutRef.current = setTimeout(
            () => setBubbleLetter(null),
            160
          );
        },
        onPanResponderTerminate: () => {
          railDragActiveRef.current = false;
          lastRailHapticLetterRef.current = null;
          setBubbleLetter(null);
        },
      }),
    []
  );

  const getCoinItemLayout = useCallback(
    (_, index) => ({
      length: COIN_LIST_ROW_STRIDE,
      offset: COIN_LIST_ROW_STRIDE * index,
      index,
    }),
    []
  );

  const onPressRow = (row) => {
    if (isWithdrawCoinDisabled(row)) {
      if (networkKeysFromChain(row?.chain).length === 0) {
        showError("No withdrawal network available for this coin");
      } else {
        showError("No active withdrawal network for this coin");
      }
      return;
    }
    onSelect(row);
  };

  const renderRow = ({ item }) => {
    const iconUri = buildCoinImageUri(item);
    const disabled = isWithdrawCoinDisabled(item);
    const suspended =
      item?.withdrawal_status === "SUSPENDED" ||
      (typeof item?.withdrawal_status === "object" &&
        item?.withdrawal_status != null &&
        !Array.isArray(item.withdrawal_status) &&
        networkKeysFromChain(item.chain).length > 0 &&
        getActiveWithdrawChainKeys(item).length === 0);

    return (
      <TouchableOpacity
        style={[
          styles.coinItem,
          styles.coinFlatListRow,
          disabled && styles.coinItemDisabled,
        ]}
        onPress={() => onPressRow(item)}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <FastImage
          source={iconUri ? { uri: iconUri } : bitcoinIcon}
          style={styles.coinIcon}
          resizeMode="cover"
        />
        <View style={styles.coinInfo}>
          <AppText
            weight={SEMI_BOLD}
            type={FOURTEEN}
            style={{
              color: themeColors.text,
            }}
          >
            {item?.short_name}
          </AppText>
          <AppText type={TWELVE} color={isDark ? "#B1B1B1" : "#666"}>
            {item?.name}
          </AppText>
        </View>
        {suspended && (
          <AppText type={TEN} color={RED} weight={SEMI_BOLD}>
            Suspended
          </AppText>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <WithdrawCoinPickerSkeleton />;
  }

  return (
    <View style={styles.selectCoinPhase}>
      <View
        style={[styles.selectCoinSearchWrap, { backgroundColor: themeColors.background, borderColor: isDark ? themeColors.border : "#EEE" }]}
      >
        <FastImage
          source={searchIcon}
          style={styles.selectCoinSearchIcon}
          resizeMode="contain"
          tintColor={colors.textGray}
        />
        <TextInput
          style={[
            styles.selectCoinSearchInput,
            {
              backgroundColor: themeColors.background,
              color: themeColors.text,
            },
          ]}
          placeholder="Search Coins"
          placeholderTextColor={themeColors.secondaryText}
          value={searchPair}
          onChangeText={setSearchPair}
        />
      </View>

      <View style={styles.selectCoinListRow}>
        <FlatList
          refreshControl={onRefresh ? <RefreshControl refreshing={refreshing || false} onRefresh={onRefresh} tintColor={themeColors.text} /> : undefined}
          ref={coinFlatListRef}
          data={sortedCoins}
          keyExtractor={(row, index) =>
            row?._id ? String(row._id) : String(index)
          }
          renderItem={renderRow}
          showsVerticalScrollIndicator={false}
          style={styles.sectionListFlex}
          contentContainerStyle={[
            styles.sectionListContent,
            styles.sectionListContentWithIndex,
          ]}
          keyboardShouldPersistTaps="handled"
          getItemLayout={getCoinItemLayout}
          initialNumToRender={24}
          maxToRenderPerBatch={20}
          windowSize={9}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={Platform.OS === "android"}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          extraData={isDark}
          onScrollToIndexFailed={({ index }) => {
            const list = sortedSelectCoinsRef.current;
            if (!list.length) return;
            const safe = Math.max(0, Math.min(index, list.length - 1));
            setTimeout(() => {
              try {
                coinFlatListRef.current?.scrollToOffset({
                  offset: safe * COIN_LIST_ROW_STRIDE,
                  animated: false,
                });
              } catch {
                /* ignore */
              }
            }, 64);
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
             <FastImage source={NO_NOTIFICATION_ICON} style={{width:80,height:80,marginTop:40}} resizeMode="contain"/>
            </View>
          }
        />
        {sortedCoins.length > 0 && (
          <>
            {bubbleLetter != null && (
              <View
                style={[styles.alphabetBubbleWrap, styles.alphabetBubbleZ]}
                pointerEvents="none"
              >
                <View
                  style={[
                    styles.alphabetBubble,
                    isDark
                      ? styles.alphabetBubbleDark
                      : styles.alphabetBubbleLight,
                  ]}
                >
                  <AppText
                    weight={SEMI_BOLD}
                    type={TWENTY}
                    style={styles.alphabetBubbleText}
                  >
                    {bubbleLetter}
                  </AppText>
                </View>
              </View>
            )}
            <View
              style={[styles.alphabetIndexRail, styles.alphabetIndexRailZ]}
              onLayout={(e) => {
                railLayoutHeightRef.current = e.nativeEvent.layout.height;
              }}
              collapsable={false}
            >
              <View
                style={styles.alphabetIndexLettersColumn}
                pointerEvents="none"
              >
                {LETTER_KEYS.map((label) => {
                  const isHighlighted = highlightedRailLetter === label;
                  const mutedColor = isDark
                    ? colors.descText || colors.textGray
                    : colors.textGray;
                  const selectedColor = isDark ? colors.white : colors.black;
                  return (
                    <View key={label} style={styles.alphabetIndexLetterCell}>
                      <AppText
                        type={TEN}
                        style={{
                          ...styles.alphabetIndexLetter,
                          color: isHighlighted ? selectedColor : mutedColor,
                        }}
                      >
                        {label}
                      </AppText>
                    </View>
                  );
                })}
              </View>
              <View
                style={StyleSheet.absoluteFill}
                {...alphabetPanResponder.panHandlers}
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
};

export default WithdrawCoinPickerPanel;

const styles = StyleSheet.create({
  selectCoinPhase: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: universalPaddingHorizontalHigh,
  },
  selectCoinListRow: {
    flex: 1,
    flexDirection: "row",
    position: "relative",
    minHeight: 0,
  },
  sectionListFlex: {
    flex: 1,
  },
  coinFlatListRow: {
    minHeight: COIN_LIST_ROW_INNER,
    marginBottom: COIN_LIST_ROW_GAP,
  },
  selectCoinSearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  selectCoinSearchIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  selectCoinSearchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
  },
  sectionListContent: {
    paddingTop: 6,
    paddingBottom: 32,
  },
  sectionListContentWithIndex: {
    paddingRight: 30,
  },
  coinItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 10,
  },
  coinIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  coinInfo: {
    flex: 1,
  },
  coinItemDisabled: {
    opacity: 0.45,
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  alphabetBubbleWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  alphabetBubbleZ: { zIndex: 5 },
  alphabetIndexRailZ: { zIndex: 10 },
  alphabetBubble: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  alphabetBubbleLight: {
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  alphabetBubbleDark: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  alphabetBubbleText: {
    color: "#FFFFFF",
  },
  alphabetIndexRail: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 28,
    maxHeight: "100%",
  },
  alphabetIndexLettersColumn: {
    flex: 1,
    flexDirection: "column",
    paddingVertical: 8,
  },
  alphabetIndexLetterCell: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 2,
  },
  alphabetIndexLetter: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "700",
  },
});
