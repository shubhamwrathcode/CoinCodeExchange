import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import { SvgXml } from 'react-native-svg';
import { BASE_URL, IMAGE_BASE_URL } from '../../helper/Constants';
import { activities_icon } from '../../helper/ImageAssets';

/**
 * Same field priority and host mapping as AGCE `buildCoinImageUri`: `icon_path` first,
 * `public/` + `static/` keys on the S3 media host, other relative paths on the API host.
 */
export const buildDepositCoinIconUri = (coin: any): string | null => {
    if (!coin) return null;
    const raw =
        typeof coin === 'string'
            ? coin
            : coin.icon_path || coin.iconPath || coin.icon_url || coin.iconUri || coin.icon || coin.image || coin.iconUrl;
    if (raw == null) return null;
    const p = String(raw).trim();
    if (!p || p === 'null' || p === 'undefined') return null;
    if (p.startsWith('http://') || p.startsWith('https://')) return p;
    if (p.startsWith('//')) return `https:${p}`;
    if (p.startsWith('data:')) return p;
    const rel = p.replace(/^\/+/, '').replace(/\\/g, '/');
    if (!rel) return null;
    if (rel.startsWith('public/') || rel.startsWith('static/')) {
        const s3Base = String(IMAGE_BASE_URL || '').replace(/\/+$/, '');
        const key = rel.startsWith('static/') ? `public/${rel}` : rel;
        return `${s3Base}/${key}`;
    }
    const base = String(BASE_URL || '').replace(/\/+$/, '');
    return `${base}/${rel}`;
};

const svgXmlCache = new Map<string, string | null>();
const rasterUrlCache = new Set<string>();
const failedUrlCache = new Set<string>();

const RASTER_REGEX = /\.(png|jpe?g|webp|gif|bmp)($|\?)/i;
const SVG_REGEX = /\.svg($|\?)/i;
const SVG_ROOT_REGEX = /^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i;

/** `.svg` and extensionless URLs (Fireblocks CDN ids) are probed; known raster extensions go straight to FastImage. */
const shouldProbeAsSvg = (uri: string): boolean => {
    if (!uri) return false;
    if (SVG_REGEX.test(uri)) return true;
    if (RASTER_REGEX.test(uri)) return false;
    return true;
};

const checkAndFetchSvg = async (uri: string): Promise<string | null> => {
    if (svgXmlCache.has(uri)) return svgXmlCache.get(uri) || null;
    if (rasterUrlCache.has(uri) || failedUrlCache.has(uri)) return null;
    try {
        const res = await fetch(uri);
        if (!res.ok) {
            svgXmlCache.set(uri, null);
            return null;
        }
        const contentType = (res.headers.get('content-type') || '').toLowerCase();

        // Binary raster bodies can contain a stray `<svg`, so trust the header first.
        if (/image\/(png|jpe?g|webp|gif|bmp|avif)/.test(contentType)) {
            rasterUrlCache.add(uri);
            svgXmlCache.set(uri, null);
            return null;
        }

        const text = await res.text();
        const looksSvg =
            contentType.includes('svg') ||
            ((contentType.includes('xml') || !contentType.startsWith('image/')) && SVG_ROOT_REGEX.test(text));

        if (looksSvg) {
            const clean = text
                .replace(/^\uFEFF/, '')
                .replace(/<\?xml[^>]*\?>/gi, '')
                .replace(/<!DOCTYPE[^>]*>/gi, '')
                .trim();
            svgXmlCache.set(uri, clean);
            return clean;
        }

        rasterUrlCache.add(uri);
        svgXmlCache.set(uri, null);
        return null;
    } catch {
        svgXmlCache.set(uri, null);
        return null;
    }
};

const DepositCoinIcon = React.memo(({ uri, size = 32 }: { uri: string | null; size?: number }) => {
    const probeSvg = Boolean(uri && shouldProbeAsSvg(uri));
    const isDirectRaster = Boolean(uri && !probeSvg);

    const [svgXml, setSvgXml] = useState<string | null>(() => {
        if (!uri || isDirectRaster) return null;
        return svgXmlCache.get(uri) || null;
    });
    const [hasError, setHasError] = useState(false);
    const [probeDone, setProbeDone] = useState<boolean>(() => {
        if (!uri || isDirectRaster) return true;
        return svgXmlCache.has(uri) || rasterUrlCache.has(uri);
    });

    useEffect(() => {
        let active = true;

        if (!uri) {
            setSvgXml(null);
            setHasError(false);
            setProbeDone(true);
            return;
        }

        // SVG CDNs without an extension fail in FastImage first; allow a fresh probe.
        if (probeSvg) {
            failedUrlCache.delete(uri);
            if (svgXmlCache.get(uri) === null && !rasterUrlCache.has(uri)) {
                svgXmlCache.delete(uri);
            }
            setHasError(false);
        }

        if (failedUrlCache.has(uri)) {
            setHasError(true);
            setProbeDone(true);
            return;
        }

        if (isDirectRaster) {
            setSvgXml(null);
            setHasError(false);
            setProbeDone(true);
            return;
        }

        if (svgXmlCache.has(uri)) {
            setSvgXml(svgXmlCache.get(uri) || null);
            setProbeDone(true);
            return;
        }

        if (rasterUrlCache.has(uri)) {
            setSvgXml(null);
            setProbeDone(true);
            return;
        }

        setProbeDone(false);
        // A stalled probe must not pin the placeholder; FastImage takes over and SVG swaps in if it arrives later.
        const probeTimeout = setTimeout(() => {
            if (active) setProbeDone(true);
        }, 4000);
        checkAndFetchSvg(uri).then((clean) => {
            clearTimeout(probeTimeout);
            if (!active) return;
            setSvgXml(clean);
            setProbeDone(true);
        });

        return () => {
            active = false;
            clearTimeout(probeTimeout);
        };
    }, [uri, isDirectRaster, probeSvg]);

    const dim = { width: size, height: size, borderRadius: size / 2 };

    if (!uri || hasError || (probeSvg && !probeDone)) {
        return <FastImage source={activities_icon} style={dim} resizeMode="cover" />;
    }

    if (svgXml) {
        return (
            <View style={[dim, styles.coinSvgWrap]}>
                <SvgXml
                    xml={svgXml}
                    width="100%"
                    height="100%"
                    onError={() => {
                        failedUrlCache.add(uri);
                        setHasError(true);
                    }}
                />
            </View>
        );
    }

    return (
        <FastImage
            source={{ uri }}
            style={dim}
            resizeMode="cover"
            onError={() => {
                failedUrlCache.add(uri);
                setHasError(true);
            }}
        />
    );
});

const styles = StyleSheet.create({
    coinSvgWrap: {
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
    },
});

export default DepositCoinIcon;
