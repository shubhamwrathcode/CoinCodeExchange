import React, { useState, useEffect, memo } from 'react';
import { View, StyleSheet, StyleProp, ImageStyle, ViewStyle } from 'react-native';
import FastImage, { ImageStyle as FastImageStyle, ResizeMode, Source } from 'react-native-fast-image';
import { SvgXml } from 'react-native-svg';
import { buildCoinImageUri } from '../helper/coinIconUrl';
import { activities_icon } from '../helper/ImageAssets';

// In-memory cache for clean SVG XML strings
const svgXmlCache = new Map<string, string | null>();
// Set of URLs known to be raster images or failed
const rasterUrlCache = new Set<string>();
const failedUrlCache = new Set<string>();

const RASTER_REGEX = /\.(png|jpe?g|webp|gif|bmp)($|\?)/i;
const SVG_REGEX = /\.svg($|\?)/i;

async function checkAndFetchSvg(uri: string): Promise<string | null> {
  if (svgXmlCache.has(uri)) {
    return svgXmlCache.get(uri) || null;
  }
  if (rasterUrlCache.has(uri) || failedUrlCache.has(uri)) {
    return null;
  }
  try {
    const res = await fetch(uri);
    if (!res.ok) {
      svgXmlCache.set(uri, null);
      return null;
    }
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    if (
      contentType.includes('svg') ||
      text.includes('<svg') ||
      text.includes('<SVG')
    ) {
      const clean = text
        .replace(/^\uFEFF/, '') // remove UTF-8 BOM
        .replace(/<\?xml[^>]*\?>/gi, '') // remove XML declaration
        .replace(/<!DOCTYPE[^>]*>/gi, '') // remove DOCTYPE
        .trim();
      svgXmlCache.set(uri, clean);
      return clean;
    } else {
      rasterUrlCache.add(uri);
      svgXmlCache.set(uri, null);
      return null;
    }
  } catch {
    svgXmlCache.set(uri, null);
    return null;
  }
}

interface CoinIconProps {
  coin?: any;
  uri?: string | null;
  style?: StyleProp<ImageStyle | FastImageStyle>;
  resizeMode?: ResizeMode;
  fallback?: Source | number;
  placeholderBg?: string;
}

export const CoinIcon: React.FC<CoinIconProps> = memo(({
  coin,
  uri: directUri,
  style,
  resizeMode = 'contain',
  fallback,
  placeholderBg,
}) => {
  const resolvedUri = directUri || (coin ? buildCoinImageUri(coin) : null);

  // If clearly a raster format (e.g. .png, .jpg), don't treat as SVG
  const isDirectRaster = Boolean(resolvedUri && RASTER_REGEX.test(resolvedUri));
  const isDirectSvg = Boolean(resolvedUri && SVG_REGEX.test(resolvedUri));

  const [svgXml, setSvgXml] = useState<string | null>(() => {
    if (!resolvedUri || isDirectRaster) return null;
    return svgXmlCache.get(resolvedUri) || null;
  });
  const [hasError, setHasError] = useState<boolean>(() => {
    return resolvedUri ? failedUrlCache.has(resolvedUri) : false;
  });

  useEffect(() => {
    let active = true;

    if (!resolvedUri) {
      setSvgXml(null);
      return;
    }

    if (failedUrlCache.has(resolvedUri)) {
      setHasError(true);
      return;
    }

    if (isDirectRaster) {
      setSvgXml(null);
      return;
    }

    if (svgXmlCache.has(resolvedUri)) {
      const cached = svgXmlCache.get(resolvedUri) || null;
      setSvgXml(cached);
      return;
    }

    checkAndFetchSvg(resolvedUri).then((clean) => {
      if (active) {
        if (clean) {
          setSvgXml(clean);
        } else {
          setSvgXml(null);
        }
      }
    });

    return () => {
      active = false;
    };
  }, [resolvedUri, isDirectRaster]);

  const flatStyle = StyleSheet.flatten(style) || {};
  const width = (flatStyle.width as number) || 24;
  const height = (flatStyle.height as number) || 24;
  const borderRadius = (flatStyle.borderRadius as number) || 0;

  const effectiveFallback = fallback || activities_icon;

  if (!resolvedUri || hasError) {
    if (placeholderBg && !fallback) {
      return (
        <View
          style={[
            style as ViewStyle,
            { width, height, borderRadius, backgroundColor: placeholderBg },
          ]}
        />
      );
    }
    return (
      <FastImage
        source={effectiveFallback}
        style={style as StyleProp<FastImageStyle>}
        resizeMode={resizeMode}
      />
    );
  }

  // Render SVG if XML is available
  if (svgXml) {
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
          xml={svgXml}
          width="100%"
          height="100%"
          onError={() => {
            if (resolvedUri) failedUrlCache.add(resolvedUri);
            setHasError(true);
          }}
        />
      </View>
    );
  }

  // Render FastImage for PNG / JPG / WebP
  return (
    <FastImage
      source={{ uri: resolvedUri }}
      style={style as StyleProp<FastImageStyle>}
      resizeMode={resizeMode}
      onError={() => {
        if (resolvedUri) failedUrlCache.add(resolvedUri);
        setHasError(true);
      }}
    />
  );
});

export default CoinIcon;
