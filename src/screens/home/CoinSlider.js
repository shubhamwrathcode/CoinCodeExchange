import React, { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View, ScrollView } from 'react-native';
import { useAppSelector } from '../../store/hooks';
import NavigationService from '../../navigation/NavigationService';
import { WALLET_SCREEN } from '../../navigation/routes';
import FastImage from 'react-native-fast-image';
import { IMAGE_BASE_URL } from '../../helper/Constants';
import MiniSparkline from '../../shared/components/MiniSparkline';
import { AppText, BOLD, ELEVEN, FOURTEEN, NINE, SEMI_BOLD, TEN, TWELVE } from '../../shared';
import { useTheme } from '../../hooks/useTheme';
import { colors, darkTheme } from '../../theme/colors';

const { width } = Dimensions.get('window');

const CAROUSEL_AUTO_MS = 3000;

const CoinSlider = () => {
  const coinPairs = useAppSelector((state) => state.home.coinPairs);
  const hotPairsChart = useAppSelector((state) => state.home.hotPairsChart) ?? {};
  const scrollRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { colors: themeColors, isDark } = useTheme();

  const SIDE_SPACE = 10;
  const GAP = 10;
  const ITEM_WIDTH = (width - (SIDE_SPACE * 2) - (GAP * 2)) / 2.5;

  // Same as Market: preferred coins BTC, ETH, BNB with chart_data
  // Same as Market: preferred coins BTC, ETH, BNB with chart_data
  const featuredCoins = useMemo(() => {
    if (!coinPairs || coinPairs.length === 0) return [];
    const preferred = ['BTC', 'ETH', 'BNB'];
    const out = [];
    for (const sym of preferred) {
      const found = coinPairs.find(
        (p) => p?.base_currency?.toUpperCase() === sym && p?.quote_currency?.toUpperCase() === 'USDT'
      );
      if (found) {
        out.push({
          ...found,
          chart_data: hotPairsChart[sym] ?? [],
        });
      }
    }
    return out;
  }, [coinPairs, hotPairsChart]);

  const loopCoins = useMemo(() => {
    if (featuredCoins.length === 0) return [];
    // Triple the data for seamless infinite looping
    return [...featuredCoins, ...featuredCoins, ...featuredCoins];
  }, [featuredCoins]);

  const slideCount = featuredCoins.length;
  const totalCount = loopCoins.length;

  useEffect(() => {
    if (slideCount <= 1) return undefined;

    // Initial scroll to middle set
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        x: slideCount * (ITEM_WIDTH + GAP),
        animated: false,
      });
      setCurrentIndex(slideCount);
    }, 100);

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        let next = prev + 1;

        // If we reach near the end of the tripled list, jump back to the middle set
        if (next >= slideCount * 2) {
          scrollRef.current?.scrollTo({
            x: (slideCount - 1) * (ITEM_WIDTH + GAP),
            animated: false,
          });
          next = slideCount;
        }

        scrollRef.current?.scrollTo({
          x: next * (ITEM_WIDTH + GAP),
          animated: true,
        });
        return next;
      });
    }, CAROUSEL_AUTO_MS);

    return () => clearInterval(interval);
  }, [slideCount, ITEM_WIDTH]);

  const onScroll = (event) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / (ITEM_WIDTH + GAP));
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const handlePress = useCallback((item) => {
    if (item?.base_currency && item?.quote_currency) {
      NavigationService.navigate(WALLET_SCREEN, { coinDetail: item });
    }
  }, []);

  const formatInr = useCallback((v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return '0';
    const rounded = Math.round(n);
    return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }, []);

  const renderItem = ({ item, index }) => {
    const sym = String(item?.base_currency || '').toUpperCase();
    const coinName = sym === 'BTC' ? 'Bitcoin' : sym === 'ETH' ? 'Ethereum' : sym || '—';
    const change = Number(item?.change_percentage) || 0;
    const isPositive = change >= 0;
    const pctStr = `${Math.abs(change).toFixed(1)}%`;
    const priceStr = `$ ${formatInr(item?.buy_price)}`;

    return (
      <View style={{ marginHorizontal: GAP / 2, }}>
        <View style={[styles.card, { backgroundColor: isDark ? darkTheme.darkThemeInputColor : '#F7F7F7', width: ITEM_WIDTH }]}>
          <View style={styles.topRow}>
            <FastImage
              source={item?.icon_path ? { uri: IMAGE_BASE_URL + item.icon_path } : undefined}
              resizeMode="contain"
              style={styles.coinIcon}
            />
            <View style={styles.sparkWrap}>
              <MiniSparkline
                chartData={item?.chart_data}
                isPositive={isPositive}
                width={50}
                height={20}
                chartId={`home-mini-${index}`}
                fallbackPrice={Number(item?.buy_price) || 100}
              />
            </View>
          </View>

          <View style={styles.midRow}>
            <AppText weight={SEMI_BOLD} type={TWELVE} numberOfLines={1} style={{ color: themeColors.text, flexShrink: 1, fontWeight: "600" }}>
              {coinName}{' '}
              <AppText type={ELEVEN} style={{ color: '#9CA3AF' }}>
                {sym}
              </AppText>
            </AppText>
            <View style={styles.pctRow}>
              <AppText weight={SEMI_BOLD} style={{ fontSize: 8, color: isPositive ? '#10B981' : '#EF4444' }} numberOfLines={1}>
                {isPositive ? '▲  ' : '▼  '}{pctStr}
              </AppText>
            </View>
          </View>

          <AppText weight={SEMI_BOLD} type={TWELVE} numberOfLines={1} style={{ color: isDark ? colors.white : '#111827', marginTop: 2 }}>
            {priceStr}
          </AppText>
        </View>
      </View>
    );
  };

  if (featuredCoins.length === 0) return null;

  return (
    <View style={{ marginBottom: 0 }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: SIDE_SPACE, paddingRight: SIDE_SPACE }}
        decelerationRate="fast"
        snapToInterval={ITEM_WIDTH + GAP}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {loopCoins.map((item, index) => (
          <View key={`${item.id || index}-${index}`}>
            {renderItem({ item, index })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {

  },
  card: {
    height: 79,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    justifyContent: 'flex-start',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinIcon: {
    width: 19,
    height: 19,
  },
  sparkWrap: {
    width: 60,
    height: 25,
    alignItems: 'flex-end',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  midRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  pctRow: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});

export default CoinSlider;

