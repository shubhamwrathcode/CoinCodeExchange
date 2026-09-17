import React, { useRef, useEffect, useMemo, useState, useCallback, useDeferredValue } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedRef,
  scrollTo,
} from 'react-native-reanimated';
import { NO_NOTIFICATION_ICON, NO_NOTIFICATION_ICON_LIGHT, checkIc, downIcon } from '../../../helper/ImageAssets';
import { AppText } from '../../../common';
import { useTheme } from '../../../hooks/useTheme';
import { fontFamilyMedium, SEMI_BOLD } from '../../../theme/typography';
import { colors } from '../../../theme/colors';
import OptionsExpiries from './OptionsExpiries';
import { applyChainFilters, parseStrikeFilterInput } from './helpers/optionsDataHelpers';

const CALLS_HEADERS = [
  { title: 'Last', w: 60, align: 'center' },
  { title: 'Vega', w: 60, align: 'center' },
  { title: 'Theta', w: 70, align: 'center' },
  { title: 'Gamma', w: 70, align: 'center' },
  { title: 'Delta', w: 60, align: 'center' },
  { title: 'Bid/IV', w: 70, align: 'center' },
  { title: 'Mark/IV', w: 70, align: 'center' },
  { title: 'Ask/IV', w: 70, align: 'center' },
];

const PUTS_HEADERS = [
  { title: 'Bid/IV', w: 70, align: 'center' },
  { title: 'Mark/IV', w: 70, align: 'center' },
  { title: 'Ask/IV', w: 70, align: 'center' },
  { title: 'Delta', w: 60, align: 'center' },
  { title: 'Gamma', w: 70, align: 'center' },
  { title: 'Theta', w: 70, align: 'center' },
  { title: 'Vega', w: 60, align: 'center' },
  { title: 'Last', w: 60, align: 'center' },
];

const ROW_HEIGHT = 56;
const HEADER_ROW_HEIGHT = 35;
const LIST_FOOTER_HEIGHT = ROW_HEIGHT + 24;

function withCommas(n, precision) {
  const parts = Number(n).toFixed(precision).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

function formatVal(v, precision = 2) {
  if (v === null || v === undefined) return '--';
  const n = Number(v);
  if (!Number.isFinite(n)) return '--';
  return withCommas(n, precision);
}

function formatPct(v) {
  if (v === null || v === undefined) return '--';
  const n = Number(v);
  if (!Number.isFinite(n)) return '--';
  return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
}

function formatPrice(v, precision = 2) {
  if (v === null || v === undefined) return '--';
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return '--';
  return withCommas(n, precision);
}

function formatIvPct(v) {
  if (v === null || v === undefined) return '--';
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return '--';
  return n.toFixed(2) + '%';
}

const SKELETON_ROWS = 10;
const SKELETON_CELL_W = 42;
const SKELETON_CELL_H = 14;

const ShimmerCell = React.memo(function ShimmerCell({ width = SKELETON_CELL_W, height = SKELETON_CELL_H, borderRadius = 4, boneColor, style }) {
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: boneColor,
        },
        style,
      ]}
    />
  );
});

const OptionsChainSkeleton = React.memo(function OptionsChainSkeleton({ isDark, themeColors, rowCount = SKELETON_ROWS }) {
  const borderColor = themeColors.themeBorderColor || (isDark ? '#2C2D31' : '#F0F0F0');
  const headerBg = isDark ? '#1C1D21' : '#F9F9F9';
  const boneColor = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';

  const renderSideCells = (prefix) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8 }}>
      {Array.from({ length: 4 }).map((_, idx) => (
        <ShimmerCell key={`${prefix}-${idx}`} width={SKELETON_CELL_W} boneColor={boneColor} />
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, paddingTop: 4 }}>
      <View style={[styles.headerColsRow, { height: HEADER_ROW_HEIGHT, backgroundColor: headerBg, borderBottomWidth: 1, borderColor }]}>
        <View style={{ flex: 1, justifyContent: 'center', paddingLeft: 12 }}>
          <ShimmerCell width={50} height={12} boneColor={boneColor} />
        </View>
        <View style={{ width: 80, alignItems: 'center', justifyContent: 'center' }}>
          <ShimmerCell width={68} height={12} boneColor={boneColor} />
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end', paddingRight: 12 }}>
          <ShimmerCell width={45} height={12} boneColor={boneColor} />
        </View>
      </View>

      {Array.from({ length: rowCount }).map((_, i) => (
        <View
          key={`chain-skel-${i}`}
          style={{
            flexDirection: 'row',
            height: ROW_HEIGHT,
            borderBottomWidth: 1,
            borderColor,
            alignItems: 'center',
            backgroundColor: i % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'),
          }}
        >
          <View style={{ flex: 1 }}>{renderSideCells(`call-${i}`)}</View>
          <View style={{ width: 80, alignItems: 'center', justifyContent: 'center', backgroundColor: headerBg }}>
            <ShimmerCell width={54} height={SKELETON_CELL_H} boneColor={boneColor} />
          </View>
          <View style={{ flex: 1 }}>{renderSideCells(`put-${i}`)}</View>
        </View>
      ))}
    </View>
  );
});

const CallDataRow = React.memo(function CallDataRow({
  row,
  currentPrice,
  cols,
  activeCallsWidth,
  themeColors,
  isDark,
  selectedAsset,
  navigation,
}) {
  const strikePriceNum = row.strike;
  const isCallITM = strikePriceNum < currentPrice;
  const callBg = (isCallITM && !isDark) ? 'rgba(2, 192, 118, 0.05)' : 'transparent';

  const cRaw = row.callRaw || {};
  const cLeg = row.call || {};

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => navigation.navigate('OptionsInstrumentTrade', { item: cRaw, currentPrice, selectedAsset, isCall: true })}
      style={[styles.dataCellRow, { height: ROW_HEIGHT, borderBottomWidth: 1, width: activeCallsWidth, borderBottomColor: themeColors.themeBorderColor || '#F0F0F0', backgroundColor: callBg }]}
    >
      {cols.last && (
        <View style={{ width: 60, alignItems: 'center', paddingHorizontal: 6 }}>
          <AppText style={{ color: themeColors.text, fontSize: 12, fontFamily: fontFamilyMedium }}>{formatPrice(cLeg.last, 0)}</AppText>
        </View>
      )}
      {cols.vega && (
        <View style={{ width: 60, alignItems: 'center', paddingHorizontal: 6 }}>
          <AppText style={{ color: themeColors.text, fontSize: 12, fontFamily: fontFamilyMedium }}>{formatVal(cLeg.vega, 4)}</AppText>
        </View>
      )}
      {cols.theta && (
        <View style={{ width: 70, alignItems: 'center', paddingHorizontal: 6 }}>
          <AppText style={{ color: themeColors.text, fontSize: 12, fontFamily: fontFamilyMedium }}>{formatVal(cLeg.theta, 4)}</AppText>
        </View>
      )}
      {cols.gamma && (
        <View style={{ width: 70, alignItems: 'center', paddingHorizontal: 6 }}>
          <AppText style={{ color: themeColors.text, fontSize: 12, fontFamily: fontFamilyMedium }}>{formatVal(cLeg.gamma, 6)}</AppText>
        </View>
      )}
      <View style={{ width: 60, alignItems: 'center', paddingHorizontal: 6 }}>
        <AppText style={{ color: themeColors.text, fontSize: 12, fontFamily: fontFamilyMedium }}>{formatVal(cLeg.delta, 4)}</AppText>
      </View>
      <View style={{ width: 70, height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
        <AppText style={{ color: colors.green, fontSize: 12, fontFamily: fontFamilyMedium }}>{formatPrice(cLeg.bidIv, 0)}</AppText>
      </View>
      <View style={{ width: 70, height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
        <AppText style={{ color: colors.green, fontSize: 12, fontFamily: fontFamilyMedium }}>{formatPrice(cLeg.markIv, 1)}</AppText>
        <AppText style={{ color: themeColors.secondaryText, fontSize: 10, fontFamily: fontFamilyMedium, marginTop: 2 }}>{formatIvPct(cLeg.markIvPct)}</AppText>
      </View>
      <View style={{ width: 70, height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
        <AppText style={{ color: colors.red, fontSize: 12, fontFamily: fontFamilyMedium }}>{formatPrice(cLeg.askIv, 0)}</AppText>
        <AppText style={{ color: themeColors.secondaryText, fontSize: 10, fontFamily: fontFamilyMedium, marginTop: 2 }}>{formatIvPct(cLeg.askIvPct)}</AppText>
      </View>
    </TouchableOpacity>
  );
});

const CenterStrikeRow = React.memo(function CenterStrikeRow({
  row,
  themeColors,
}) {
  return (
    <View style={[styles.dataCellRow, { height: ROW_HEIGHT, borderBottomWidth: 1, justifyContent: 'center', borderBottomColor: themeColors.themeBorderColor || '#F0F0F0' }]}>
      <View>
        <AppText style={{ fontFamily: fontFamilyMedium, color: themeColors.text, fontSize: 12, textAlign: 'center' }}>{withCommas(row.strike, 0)}</AppText>
        <AppText style={{ color: themeColors.secondaryText, fontSize: 9, fontFamily: fontFamilyMedium, textAlign: 'center', marginTop: 2 }}>{formatPct(row.diffPct)}</AppText>
      </View>
    </View>
  );
});

const PutDataRow = React.memo(function PutDataRow({
  row,
  currentPrice,
  cols,
  activePutsWidth,
  themeColors,
  isDark,
  selectedAsset,
  navigation,
}) {
  const strikePriceNum = row.strike;
  const isPutITM = strikePriceNum > currentPrice;
  const putBg = (isPutITM && !isDark) ? 'rgba(2, 192, 118, 0.05)' : 'transparent';

  const pRaw = row.putRaw || {};
  const pLeg = row.put || {};

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => navigation.navigate('OptionsInstrumentTrade', { item: pRaw, currentPrice, selectedAsset, isCall: false })}
      style={[styles.dataCellRow, { height: ROW_HEIGHT, borderBottomWidth: 1, width: activePutsWidth, borderBottomColor: themeColors.themeBorderColor || '#F0F0F0', backgroundColor: putBg }]}
    >
      <View style={{ width: 70, height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
        <AppText style={{ color: colors.green, fontSize: 12, fontFamily: fontFamilyMedium }}>{formatPrice(pLeg.bidIv, 0)}</AppText>
      </View>
      <View style={{ width: 70, height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
        <AppText style={{ color: colors.red, fontSize: 12, fontFamily: fontFamilyMedium }}>{formatPrice(pLeg.markIv, 1)}</AppText>
        <AppText style={{ color: themeColors.secondaryText, fontSize: 10, fontFamily: fontFamilyMedium, marginTop: 2 }}>{formatIvPct(pLeg.markIvPct)}</AppText>
      </View>
      <View style={{ width: 70, height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
        <AppText style={{ color: colors.red, fontSize: 12, fontFamily: fontFamilyMedium }}>{formatPrice(pLeg.askIv, 0)}</AppText>
        <AppText style={{ color: themeColors.secondaryText, fontSize: 10, fontFamily: fontFamilyMedium, marginTop: 2 }}>{formatIvPct(pLeg.askIvPct)}</AppText>
      </View>
      <View style={{ width: 60, alignItems: 'center', paddingHorizontal: 6 }}>
        <AppText style={{ color: themeColors.text, fontSize: 12, fontFamily: fontFamilyMedium }}>{formatVal(pLeg.delta, 4)}</AppText>
      </View>
      {cols.gamma && (
        <View style={{ width: 70, alignItems: 'center', paddingHorizontal: 6 }}>
          <AppText style={{ color: themeColors.text, fontSize: 12, fontFamily: fontFamilyMedium }}>{formatVal(pLeg.gamma, 6)}</AppText>
        </View>
      )}
      {cols.theta && (
        <View style={{ width: 70, alignItems: 'center', paddingHorizontal: 6 }}>
          <AppText style={{ color: themeColors.text, fontSize: 12, fontFamily: fontFamilyMedium }}>{formatVal(pLeg.theta, 4)}</AppText>
        </View>
      )}
      {cols.vega && (
        <View style={{ width: 60, alignItems: 'center', paddingHorizontal: 6 }}>
          <AppText style={{ color: themeColors.text, fontSize: 12, fontFamily: fontFamilyMedium }}>{formatVal(pLeg.vega, 4)}</AppText>
        </View>
      )}
      {cols.last && (
        <View style={{ width: 60, alignItems: 'center', paddingHorizontal: 6 }}>
          <AppText style={{ color: themeColors.text, fontSize: 12, fontFamily: fontFamilyMedium }}>{formatPrice(pLeg.last, 0)}</AppText>
        </View>
      )}
    </TouchableOpacity>
  );
});

const OptionsChainTable = ({ expiries, selectedExpiry, setSelectedExpiry, chains = [], currentPrice = 0, selectedAsset = '', isMarketLoading = false, isContractsLoading = false, onOpenPairList }) => {
  const { colors: themeColors, isDark } = useTheme();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const isChainLoading = isMarketLoading || isContractsLoading;
  const deferredSelectedExpiry = useDeferredValue(selectedExpiry);

  const [cols, setCols] = useState({
    last: true,
    vega: true,
    theta: true,
    gamma: true,
  });
  const [menuCols, setMenuCols] = useState({
    last: true,
    vega: true,
    theta: true,
    gamma: true,
  });
  const [showColMenu, setShowColMenu] = useState(false);

  const [oddSize, setOddSize] = useState(true);
  const [strikeMinStr, setStrikeMinStr] = useState('');
  const [strikeMaxStr, setStrikeMaxStr] = useState('');
  const [debouncedFilters, setDebouncedFilters] = useState({ min: '', max: '' });

  useEffect(() => {
    const timer = setTimeout(() => {
      setCols(menuCols);
    }, 300);
    return () => clearTimeout(timer);
  }, [menuCols]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters({ min: strikeMinStr, max: strikeMaxStr });
    }, 500);
    return () => clearTimeout(timer);
  }, [strikeMinStr, strikeMaxStr]);

  const activeCallsHeaders = useMemo(() => CALLS_HEADERS.filter(h => {
    if (!cols.last && h.title === 'Last') return false;
    if (!cols.vega && h.title === 'Vega') return false;
    if (!cols.theta && h.title === 'Theta') return false;
    if (!cols.gamma && h.title === 'Gamma') return false;
    return true;
  }), [cols]);

  const activePutsHeaders = useMemo(() => PUTS_HEADERS.filter(h => {
    if (!cols.last && h.title === 'Last') return false;
    if (!cols.vega && h.title === 'Vega') return false;
    if (!cols.theta && h.title === 'Theta') return false;
    if (!cols.gamma && h.title === 'Gamma') return false;
    return true;
  }), [cols]);

  const ACTIVE_CALLS_WIDTH = useMemo(
    () => activeCallsHeaders.reduce((sum, h) => sum + h.w, 0),
    [activeCallsHeaders],
  );
  const ACTIVE_PUTS_WIDTH = useMemo(
    () => activePutsHeaders.reduce((sum, h) => sum + h.w, 0),
    [activePutsHeaders],
  );

  const headerLeftScrollRef = useAnimatedRef();
  const headerRightScrollRef = useAnimatedRef();
  const dataLeftScrollRef = useAnimatedRef();
  const dataRightScrollRef = useAnimatedRef();
  const mainVerticalScrollRef = useRef(null);

  const activeSource = useSharedValue(0); // 0: none, 1: headerLeft, 2: headerRight, 3: dataLeft, 4: dataRight
  const putsMaxScrollShared = useSharedValue(0);
  const callsMaxScrollShared = useSharedValue(0);

  const [callsPaneWidth, setCallsPaneWidth] = useState(0);
  const callsPaneWidthRef = useRef(0);

  const callsScrollOffset = useMemo(
    () => (callsPaneWidth > 0 ? Math.max(0, ACTIVE_CALLS_WIDTH - callsPaneWidth) : 0),
    [ACTIVE_CALLS_WIDTH, callsPaneWidth],
  );

  useEffect(() => {
    putsMaxScrollShared.value = Math.max(0, ACTIVE_PUTS_WIDTH - callsPaneWidth);
    callsMaxScrollShared.value = Math.max(0, ACTIVE_CALLS_WIDTH - callsPaneWidth);
  }, [callsPaneWidth, ACTIVE_CALLS_WIDTH, ACTIVE_PUTS_WIDTH, putsMaxScrollShared, callsMaxScrollShared]);

  const alignCallsToStrike = useCallback(() => {
    const paneW = callsPaneWidthRef.current;
    const contentW = ACTIVE_CALLS_WIDTH;
    if (paneW <= 0 || contentW <= 0) return;

    const x = Math.max(0, contentW - paneW);
    activeSource.value = 0;

    headerLeftScrollRef.current?.scrollTo?.({ x, y: 0, animated: false });
    dataLeftScrollRef.current?.scrollTo?.({ x, y: 0, animated: false });
    headerRightScrollRef.current?.scrollTo?.({ x: 0, y: 0, animated: false });
    dataRightScrollRef.current?.scrollTo?.({ x: 0, y: 0, animated: false });
  }, [ACTIVE_CALLS_WIDTH, headerLeftScrollRef, dataLeftScrollRef, headerRightScrollRef, dataRightScrollRef, activeSource]);

  const handleCallsPaneLayout = useCallback((width) => {
    if (width <= 0 || width === callsPaneWidthRef.current) return;
    callsPaneWidthRef.current = width;
    setCallsPaneWidth(width);
  }, []);

  const handleCallsContentSizeChange = useCallback((contentWidth) => {
    const paneW = callsPaneWidthRef.current;
    if (paneW <= 0 || contentWidth <= 0) return;

    alignCallsToStrike();
  }, [alignCallsToStrike]);

  const handleHeaderLeftScroll = useAnimatedScrollHandler({
    onBeginDrag: () => {
      activeSource.value = 1;
    },
    onScroll: (e) => {
      if (activeSource.value !== 1) return;
      const x = e.contentOffset.x;
      const putsMax = putsMaxScrollShared.value;
      const putsX = Math.max(0, putsMax - x);
      scrollTo(dataLeftScrollRef, x, 0, false);
      scrollTo(headerRightScrollRef, putsX, 0, false);
      scrollTo(dataRightScrollRef, putsX, 0, false);
    },
    onMomentumEnd: () => {
      activeSource.value = 0;
    },
    onEndDrag: () => {
      activeSource.value = 0;
    },
  });

  const handleHeaderRightScroll = useAnimatedScrollHandler({
    onBeginDrag: () => {
      activeSource.value = 2;
    },
    onScroll: (e) => {
      if (activeSource.value !== 2) return;
      const putsX = e.contentOffset.x;
      const putsMax = putsMaxScrollShared.value;
      const callsX = Math.max(0, putsMax - putsX);
      scrollTo(dataRightScrollRef, putsX, 0, false);
      scrollTo(headerLeftScrollRef, callsX, 0, false);
      scrollTo(dataLeftScrollRef, callsX, 0, false);
    },
    onMomentumEnd: () => {
      activeSource.value = 0;
    },
    onEndDrag: () => {
      activeSource.value = 0;
    },
  });

  const handleDataLeftScroll = useAnimatedScrollHandler({
    onBeginDrag: () => {
      activeSource.value = 3;
    },
    onScroll: (e) => {
      if (activeSource.value !== 3) return;
      const x = e.contentOffset.x;
      const putsMax = putsMaxScrollShared.value;
      const putsX = Math.max(0, putsMax - x);
      scrollTo(headerLeftScrollRef, x, 0, false);
      scrollTo(headerRightScrollRef, putsX, 0, false);
      scrollTo(dataRightScrollRef, putsX, 0, false);
    },
    onMomentumEnd: () => {
      activeSource.value = 0;
    },
    onEndDrag: () => {
      activeSource.value = 0;
    },
  });

  const handleDataRightScroll = useAnimatedScrollHandler({
    onBeginDrag: () => {
      activeSource.value = 4;
    },
    onScroll: (e) => {
      if (activeSource.value !== 4) return;
      const putsX = e.contentOffset.x;
      const putsMax = putsMaxScrollShared.value;
      const callsX = Math.max(0, putsMax - putsX);
      scrollTo(headerRightScrollRef, putsX, 0, false);
      scrollTo(headerLeftScrollRef, callsX, 0, false);
      scrollTo(dataLeftScrollRef, callsX, 0, false);
    },
    onMomentumEnd: () => {
      activeSource.value = 0;
    },
    onEndDrag: () => {
      activeSource.value = 0;
    },
  });

  const { chainsToRender, elementsToRender } = useMemo(() => {
    const filteredChains = applyChainFilters(chains, {
      oddSize,
      strikeMin: parseStrikeFilterInput(debouncedFilters.min),
      strikeMax: parseStrikeFilterInput(debouncedFilters.max),
    });

    let targetChain = filteredChains?.find(c => c.date === deferredSelectedExpiry);
    let selectedChains = [];
    if (!targetChain && filteredChains?.length > 0) {
      if (deferredSelectedExpiry === 'ALL') {
        selectedChains = filteredChains;
      } else {
        selectedChains = [filteredChains[0]];
      }
    } else if (targetChain) {
      selectedChains = [targetChain];
    }

    const flattenedElements = [];

    selectedChains.forEach((chain, chainIdx) => {
      let activeLineIdx = chain.data.findIndex(s => s.strike > currentPrice);
      if (activeLineIdx === -1 && chain.data.length > 0) {
        if (currentPrice < chain.data[0].strike) {
          activeLineIdx = 0;
        } else {
          activeLineIdx = chain.data.length;
        }
      }

      flattenedElements.push({ type: 'header', chainIdx, date: chain.date });

      chain.data.forEach((row, idx) => {
        const isRowBelowLine = idx === activeLineIdx;
        flattenedElements.push({ type: 'row', chainIdx, row, idx, isRowBelowLine });
      });
    });

    return { chainsToRender: selectedChains, elementsToRender: flattenedElements };
  }, [chains, deferredSelectedExpiry, currentPrice, oddSize, debouncedFilters]);

  useEffect(() => {
    mainVerticalScrollRef.current?.scrollTo?.({ y: 0, animated: false });
  }, [deferredSelectedExpiry]);

  useEffect(() => {
    if (!isFocused || isChainLoading || chainsToRender.length === 0 || callsPaneWidth <= 0) return undefined;

    alignCallsToStrike();
    const timer = setTimeout(alignCallsToStrike, 100);
    const timer2 = setTimeout(alignCallsToStrike, 300);
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [isFocused, isChainLoading, chainsToRender.length, elementsToRender.length, ACTIVE_CALLS_WIDTH, callsPaneWidth, alignCallsToStrike]);

  return (
    <View style={styles.container}>
      <OptionsExpiries
        expiries={expiries}
        selectedExpiry={selectedExpiry}
        setSelectedExpiry={setSelectedExpiry}
        isLoading={isMarketLoading}
      />

      {/* Filter Bar */}
      <ScrollView style={{ flexGrow: 0 }} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' }}>
        <TouchableOpacity onPress={() => setOddSize(!oddSize)} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
          <View style={{
            width: 16, height: 16,
            borderWidth: oddSize ? 0 : 1.5,
            borderColor: themeColors.secondaryText,
            borderRadius: 4,
            marginRight: 8,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: oddSize ? '#0D6EFD' : 'transparent'
          }}>
            {oddSize && <FastImage source={checkIc} style={{ width: 10, height: 10 }} tintColor="#FFF" resizeMode="contain" />}
          </View>
          <AppText style={{ color: themeColors.text, fontSize: 13, fontFamily: fontFamilyMedium }}>Odd Size</AppText>
        </TouchableOpacity>

        <TouchableOpacity onPress={onOpenPairList} style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1,
          borderColor: isDark ? '#333' : '#DDE2E5', borderRadius: 6, paddingHorizontal: 10, height: 32, marginRight: 12
        }}>
          <AppText style={{
            color: themeColors.text, fontSize: 12,
            fontFamily: fontFamilyMedium
          }}>{selectedAsset ? (selectedAsset.endsWith('USDT') ? selectedAsset : `${selectedAsset}USDT`) : 'BTCUSDT'}</AppText>
          <FastImage source={downIcon} style={{ width: 8, height: 8, marginLeft: 6 }} tintColor={themeColors.text} resizeMode="contain" />
        </TouchableOpacity>

        <AppText style={{ color: themeColors.text, fontSize: 13, fontFamily: fontFamilyMedium, marginRight: 8 }}>Strike Price</AppText>
        <TextInput
          style={{ width: 60, height: 32, borderWidth: 1, borderColor: isDark ? '#333' : '#DDE2E5', borderRadius: 6, color: themeColors.text, paddingHorizontal: 8, paddingVertical: 0, fontSize: 12, fontFamily: fontFamilyMedium }}
          placeholder="Min"
          placeholderTextColor={themeColors.secondaryText}
          keyboardType="numeric"
          value={strikeMinStr}
          onChangeText={setStrikeMinStr}
        />
        <AppText style={{ color: themeColors.text, fontSize: 13, marginHorizontal: 6 }}>-</AppText>
        <TextInput
          style={{ width: 60, height: 32, borderWidth: 1, borderColor: isDark ? '#333' : '#DDE2E5', borderRadius: 6, color: themeColors.text, paddingHorizontal: 8, paddingVertical: 0, fontSize: 12, fontFamily: fontFamilyMedium }}
          placeholder="Max"
          placeholderTextColor={themeColors.secondaryText}
          keyboardType="numeric"
          value={strikeMaxStr}
          onChangeText={setStrikeMaxStr}
        />

        <TouchableOpacity
          onPress={() => {
            setStrikeMinStr('');
            setStrikeMaxStr('');
            setOddSize(true);
          }}
          style={{ marginLeft: 12 }}
        >
          <AppText style={{ color: '#6B7785', fontSize: 13, fontFamily: fontFamilyMedium }}>Reset</AppText>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.divider, { backgroundColor: themeColors.themeBorderColor || '#EAEAEA' }]} />

      {/* Scrollable Table Area */}
      {isChainLoading ? (
        <OptionsChainSkeleton isDark={isDark} themeColors={themeColors} />
      ) : chainsToRender.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', }}>
          <FastImage
            source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT}
            style={{ width: 100, height: 100 }}
            resizeMode="contain"
          />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Top Pinned Table Header */}
          <View style={{ flexDirection: 'row', zIndex: 10, elevation: 10 }}>
            {/* Left: Calls Header ScrollView */}
            <View style={{ flex: 1 }}>
              <Animated.ScrollView
                ref={headerLeftScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentOffset={callsPaneWidth > 0 ? { x: callsScrollOffset, y: 0 } : undefined}
                onLayout={(e) => handleCallsPaneLayout(e.nativeEvent.layout.width)}
                onContentSizeChange={(w) => handleCallsContentSizeChange(w)}
                onScroll={handleHeaderLeftScroll}
                scrollEventThrottle={16}
              >
                <View style={[styles.headerColsRow, { height: HEADER_ROW_HEIGHT, width: ACTIVE_CALLS_WIDTH, backgroundColor: isDark ? '#1C1D21' : '#F9F9F9' }]}>
                  {activeCallsHeaders.map((h, i) => (
                    <View key={i} style={{ width: h.w, alignItems: h.align, paddingHorizontal: 6 }}>
                      <View style={styles.dashedTextContainer}>
                        <AppText style={{
                          color: themeColors.secondaryText, fontSize: 11,
                          fontFamily: fontFamilyMedium
                        }}>{h.title}</AppText>
                      </View>
                    </View>
                  ))}
                </View>
              </Animated.ScrollView>
            </View>

            {/* Center: Strike Header */}
            <View style={{ width: 80, backgroundColor: isDark ? '#1C1D21' : '#F9F9F9' }}>
              <View style={[styles.headerColsRow, { height: HEADER_ROW_HEIGHT, justifyContent: 'center' }]}>
                <TouchableOpacity onPress={() => setShowColMenu(!showColMenu)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppText weight={SEMI_BOLD} style={{ color: themeColors.text, fontSize: 11, textAlign: 'center', marginRight: 4 }}>Strike Price</AppText>
                </TouchableOpacity>

                <Modal visible={showColMenu} transparent animationType="fade">
                  <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowColMenu(false)}>
                    <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                      <View style={[styles.colMenuDropdown, { backgroundColor: isDark ? '#2C2D31' : '#FFFFFF' }]}>
                        {[
                          { key: 'last', label: 'Last' },
                          { key: 'vega', label: 'Vega' },
                          { key: 'theta', label: 'Theta' },
                          { key: 'gamma', label: 'Gamma' },
                        ].map(c => (
                          <TouchableOpacity
                            key={c.key}
                            style={styles.colMenuItem}
                            onPress={() => setMenuCols(prev => ({ ...prev, [c.key]: !prev[c.key] }))}
                          >
                            <View style={{
                              width: 16, height: 16,
                              borderWidth: menuCols[c.key] ? 0 : 1.5,
                              borderColor: themeColors.secondaryText,
                              borderRadius: 4,
                              marginRight: 10,
                              justifyContent: 'center',
                              alignItems: 'center',
                              backgroundColor: menuCols[c.key] ? (colors.primary || '#38B781') : 'transparent'
                            }}>
                              {menuCols[c.key] && (
                                <FastImage source={checkIc} style={{ width: 10, height: 10 }} tintColor={colors.white} resizeMode="contain" />
                              )}
                            </View>
                            <AppText style={{ color: themeColors.text, fontSize: 13 }}>{c.label}</AppText>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </TouchableOpacity>
                  </TouchableOpacity>
                </Modal>
              </View>
            </View>

            {/* Right: Puts Header ScrollView */}
            <View style={{ flex: 1 }}>
              <Animated.ScrollView
                ref={headerRightScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                onScroll={handleHeaderRightScroll}
                scrollEventThrottle={16}
              >
                <View style={[styles.headerColsRow, { height: HEADER_ROW_HEIGHT, width: ACTIVE_PUTS_WIDTH, backgroundColor: isDark ? '#1C1D21' : '#F9F9F9' }]}>
                  {activePutsHeaders.map((h, i) => (
                    <View key={i} style={{ width: h.w, alignItems: h.align, paddingHorizontal: 6 }}>
                      <View style={styles.dashedTextContainer}>
                        <AppText style={{
                          color: themeColors.secondaryText, fontSize: 11,
                          fontFamily: fontFamilyMedium
                        }}>{h.title}</AppText>
                      </View>
                    </View>
                  ))}
                </View>
              </Animated.ScrollView>
            </View>
          </View>

          {/* Unified Vertical Scroll Data Area */}
          <ScrollView
            ref={mainVerticalScrollRef}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: LIST_FOOTER_HEIGHT }}
          >
            <View style={{ flexDirection: 'row' }}>
              {/* Left Column: Calls Data ScrollView */}
              <View style={{ flex: 1 }}>
                <Animated.ScrollView
                  ref={dataLeftScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentOffset={callsPaneWidth > 0 ? { x: callsScrollOffset, y: 0 } : undefined}
                  onScroll={handleDataLeftScroll}
                  scrollEventThrottle={16}
                  nestedScrollEnabled={true}
                >
                  <View style={{ width: ACTIVE_CALLS_WIDTH }}>
                    {elementsToRender.map((el, index) => (
                      el.type === 'header' ? (
                        <View
                          key={`call-hdr-${el.date}-${index}`}
                          style={{
                            height: HEADER_ROW_HEIGHT,
                            width: ACTIVE_CALLS_WIDTH,
                            justifyContent: 'center',
                            paddingLeft: 16,
                            backgroundColor: isDark ? '#1C1D21' : '#F9F9F9',
                            borderBottomWidth: 1,
                            borderTopWidth: 1,
                            borderColor: themeColors.themeBorderColor || '#F0F0F0',
                          }}
                        >
                          <AppText style={{ color: themeColors.text, fontSize: 13, fontFamily: fontFamilyMedium }}>Calls</AppText>
                        </View>
                      ) : (
                        <CallDataRow
                          key={`call-${el.chainIdx}-${el.row?.strike ?? index}-${index}`}
                          row={el.row}
                          currentPrice={currentPrice}
                          cols={cols}
                          activeCallsWidth={ACTIVE_CALLS_WIDTH}
                          themeColors={themeColors}
                          isDark={isDark}
                          selectedAsset={selectedAsset}
                          navigation={navigation}
                        />
                      )
                    ))}
                  </View>
                </Animated.ScrollView>
              </View>

              {/* Center Column: Strike Data */}
              <View style={{ width: 80, backgroundColor: isDark ? '#1C1D21' : '#F9F9F9' }}>
                {elementsToRender.map((el, index) => (
                  el.type === 'header' ? (
                    <View key={`strk-hdr-${el.date}-${index}`} style={[styles.headerColsRow, { height: HEADER_ROW_HEIGHT, justifyContent: 'center' }]}>
                      <AppText style={{ color: themeColors.text, fontSize: 12, fontFamily: fontFamilyMedium }}>{el.date}</AppText>
                    </View>
                  ) : (
                    <View key={`strk-${el.chainIdx}-${el.row?.strike ?? index}-${index}`} style={{ position: 'relative' }}>
                      {el.isRowBelowLine && currentPrice > 0 ? (
                        <View pointerEvents="none" style={styles.currentPriceIndicator}>
                          <View style={[styles.currentPriceLine, { backgroundColor: isDark ? '#FFF' : '#222' }]} />
                          <View style={[styles.currentPriceBadge, { backgroundColor: isDark ? '#FFF' : '#000' }]}>
                            <AppText numberOfLines={1} style={{ color: isDark ? '#000' : '#FFF', fontSize: 11, fontFamily: fontFamilyMedium }}>
                              {formatVal(currentPrice, 2)}
                            </AppText>
                          </View>
                        </View>
                      ) : null}
                      <CenterStrikeRow
                        row={el.row}
                        themeColors={themeColors}
                      />
                    </View>
                  )
                ))}
              </View>

              {/* Right Column: Puts Data ScrollView */}
              <View style={{ flex: 1 }}>
                <Animated.ScrollView
                  ref={dataRightScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  onScroll={handleDataRightScroll}
                  scrollEventThrottle={16}
                  nestedScrollEnabled={true}
                >
                  <View style={{ width: ACTIVE_PUTS_WIDTH }}>
                    {elementsToRender.map((el, index) => (
                      el.type === 'header' ? (
                        <View
                          key={`put-hdr-${el.date}-${index}`}
                          style={{
                            height: HEADER_ROW_HEIGHT,
                            width: ACTIVE_PUTS_WIDTH,
                            justifyContent: 'center',
                            paddingLeft: 16,
                            backgroundColor: isDark ? '#1C1D21' : '#F9F9F9',
                            borderBottomWidth: 1,
                            borderTopWidth: 1,
                            borderColor: themeColors.themeBorderColor || '#F0F0F0',
                          }}
                        >
                          <AppText style={{ color: themeColors.text, fontSize: 13, fontFamily: fontFamilyMedium }}>Puts</AppText>
                        </View>
                      ) : (
                        <PutDataRow
                          key={`put-${el.chainIdx}-${el.row?.strike ?? index}-${index}`}
                          row={el.row}
                          currentPrice={currentPrice}
                          cols={cols}
                          activePutsWidth={ACTIVE_PUTS_WIDTH}
                          themeColors={themeColors}
                          isDark={isDark}
                          selectedAsset={selectedAsset}
                          navigation={navigation}
                        />
                      )
                    ))}
                  </View>
                </Animated.ScrollView>
              </View>
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default OptionsChainTable;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  subHeaderColsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  headerColsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  dataCellRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subHeaderStaticRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  dashedTextContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#A0A0A0',
    borderStyle: 'dashed',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  currentPriceIndicator: {
    position: 'absolute',
    left: -2000,
    right: -2000,
    top: -1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 20,
  },
  currentPriceLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    top: 11,
  },
  currentPriceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    zIndex: 21,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 240,
  },
  colMenuDropdown: {
    width: 130,
    borderRadius: 8,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  colMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  }
});
