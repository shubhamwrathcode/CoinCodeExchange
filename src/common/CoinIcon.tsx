import React, { useState, useEffect, useMemo, memo } from 'react';
import { View, Text, StyleSheet, StyleProp, ImageStyle, ViewStyle } from 'react-native';
import FastImage, { ImageStyle as FastImageStyle, ResizeMode, Source } from 'react-native-fast-image';
import { SvgXml } from 'react-native-svg';
import {
  resolveCoinIconUri,
  resolveCoinTicker,
} from '../helper/coinIconUrl';
import { activities_icon } from '../helper/ImageAssets';
import { useAppSelector } from '../store/hooks';

/** Cache mirrors TradingDataModal ModalCoinIcon so SVG/raster detection is shared & stable. */
const coinIconCache = new Map<string, { status: 'svg' | 'image' | 'fallback'; xml?: string }>();

const RASTER_REGEX = /\.(png|jpe?g|webp|gif|bmp)($|\?)/i;

const getCoinBadgeBg = (sym = '') => {
  const upper = String(sym).toUpperCase();
  if (upper.includes('BTC')) return '#F7931A';
  if (upper.includes('ETH')) return '#627EEA';
  if (upper.includes('BNB')) return '#F3BA2F';
  if (upper.includes('SOL')) return '#14F195';
  if (upper.includes('USDT') || upper.includes('USD')) return '#26A17B';
  if (upper.includes('AED')) return '#C6A961';
  if (upper.includes('INR')) return '#FF9933';
  if (upper.includes('XRP')) return '#23292F';
  if (upper.includes('DOGE')) return '#C2A633';
  if (upper.includes('ADA')) return '#0033AD';
  if (upper.includes('HBAR')) return '#222222';
  return '#00E5FF';
};

interface CoinIconProps {
  coin?: any;
  uri?: string | null;
  style?: StyleProp<ImageStyle | FastImageStyle>;
  resizeMode?: ResizeMode;
  fallback?: Source | number;
  placeholderBg?: string;
  /** Prefer letter badge over activities_icon when icon missing/fails (default false) */
  useLetterFallback?: boolean;
}

export const CoinIcon: React.FC<CoinIconProps> = memo(({
  coin,
  uri: directUri,
  style,
  resizeMode = 'contain',
  fallback,
  placeholderBg,
  useLetterFallback = false,
}) => {
  const coinPairs = useAppSelector((state: any) => state?.home?.coinPairs) || [];
  const ticker = resolveCoinTicker(coin);

  // Ordered candidates: market pair icon first, then wallet/direct path (dynamic for every coin)
  const candidates = useMemo(() => {
    const primary = resolveCoinIconUri(coin, coinPairs, directUri);
    const list: string[] = [];
    if (primary) list.push(primary);

    // Also keep wallet-only path as secondary if different (in case pair icon 404s)
    if (coin) {
      const walletOnly = resolveCoinIconUri(coin, null, directUri);
      if (walletOnly && !list.includes(walletOnly)) list.push(walletOnly);
    } else if (directUri) {
      const d = resolveCoinIconUri(null, null, directUri);
      if (d && !list.includes(d)) list.push(d);
    }
    return list;
  }, [coin, coinPairs, directUri]);

  const [candidateIndex, setCandidateIndex] = useState(0);
  const resolvedUri = candidates[candidateIndex] || null;

  const [iconState, setIconState] = useState<{
    status: 'loading' | 'svg' | 'image' | 'fallback';
    xml?: string;
  }>(() => {
    if (!resolvedUri) return { status: 'fallback' };
    if (coinIconCache.has(resolvedUri)) {
      const cached = coinIconCache.get(resolvedUri)!;
      return cached.status === 'svg'
        ? { status: 'svg', xml: cached.xml }
        : { status: cached.status };
    }
    if (RASTER_REGEX.test(resolvedUri)) return { status: 'image' };
    return { status: 'loading' };
  });

  // Reset candidate when coin/URI set changes
  useEffect(() => {
    setCandidateIndex(0);
  }, [candidates.join('|')]);

  useEffect(() => {
    let active = true;

    if (!resolvedUri) {
      setIconState({ status: 'fallback' });
      return;
    }

    if (coinIconCache.has(resolvedUri)) {
      const cached = coinIconCache.get(resolvedUri)!;
      if (cached.status === 'fallback') {
        // try next candidate
        if (candidateIndex < candidates.length - 1) {
          setCandidateIndex((i) => i + 1);
          return;
        }
        setIconState({ status: 'fallback' });
        return;
      }
      setIconState(
        cached.status === 'svg'
          ? { status: 'svg', xml: cached.xml }
          : { status: cached.status }
      );
      return;
    }

    if (RASTER_REGEX.test(resolvedUri)) {
      const res = { status: 'image' as const };
      coinIconCache.set(resolvedUri, res);
      setIconState(res);
      return;
    }

    setIconState({ status: 'loading' });

    fetch(resolvedUri)
      .then(async (response) => {
        if (!response.ok) throw new Error('bad status');
        const text = await response.text();
        if (
          text &&
          typeof text === 'string' &&
          (text.includes('<svg') ||
            text.trim().startsWith('<?xml') ||
            text.includes('<path') ||
            text.includes('<SVG'))
        ) {
          const clean = text
            .replace(/^\uFEFF/, '')
            .replace(/<\?xml[^>]*\?>/gi, '')
            .replace(/<!DOCTYPE[^>]*>/gi, '')
            .trim();
          const res = { status: 'svg' as const, xml: clean };
          coinIconCache.set(resolvedUri, res);
          if (active) setIconState(res);
        } else {
          const res = { status: 'image' as const };
          coinIconCache.set(resolvedUri, res);
          if (active) setIconState(res);
        }
      })
      .catch(() => {
        const res = { status: 'image' as const };
        coinIconCache.set(resolvedUri, res);
        if (active) setIconState(res);
      });

    return () => {
      active = false;
    };
  }, [resolvedUri, candidateIndex, candidates.length]);

  const failCurrent = () => {
    if (resolvedUri) coinIconCache.set(resolvedUri, { status: 'fallback' });
    if (candidateIndex < candidates.length - 1) {
      setCandidateIndex((i) => i + 1);
      setIconState({ status: 'loading' });
      return;
    }
    setIconState({ status: 'fallback' });
  };

  const flatStyle = StyleSheet.flatten(style) || {};
  const width = (flatStyle.width as number) || 24;
  const height = (flatStyle.height as number) || 24;
  const borderRadius = (flatStyle.borderRadius as number) || width / 2;

  const renderLetterFallback = () => (
    <View
      style={[
        style as ViewStyle,
        {
          width,
          height,
          borderRadius,
          backgroundColor: placeholderBg || getCoinBadgeBg(ticker),
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
      ]}
    >
      <Text style={{ color: '#FFF', fontSize: Math.max(10, width * 0.36), fontWeight: '700' }}>
        {ticker?.substring(0, 1) || '•'}
      </Text>
    </View>
  );

  if (!resolvedUri || iconState.status === 'fallback') {
    if (useLetterFallback) return renderLetterFallback();
    return (
      <FastImage
        source={fallback || activities_icon}
        style={style as StyleProp<FastImageStyle>}
        resizeMode={resizeMode}
      />
    );
  }

  if (iconState.status === 'loading') {
    return (
      <View
        style={[
          style as ViewStyle,
          {
            width,
            height,
            borderRadius,
            backgroundColor: placeholderBg || 'rgba(128,128,128,0.2)',
          },
        ]}
      />
    );
  }

  if (iconState.status === 'svg' && iconState.xml) {
    return (
      <View
        style={[
          style as ViewStyle,
          {
            width,
            height,
            borderRadius,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <SvgXml
          xml={iconState.xml}
          width="100%"
          height="100%"
          onError={failCurrent}
        />
      </View>
    );
  }

  return (
    <FastImage
      source={{ uri: resolvedUri }}
      style={style as StyleProp<FastImageStyle>}
      resizeMode={resizeMode}
      onError={failCurrent}
    />
  );
});

export default CoinIcon;
