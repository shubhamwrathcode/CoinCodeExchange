import { IMAGE_BASE_URL } from './Constants';

/**
 * Absolute URI for coin artwork (web parity: `DepositPage` `buildCoinIconUrl`).
 * Supports coin object ({ icon_url, icon_path, iconUri, iconPath, icon, image }) or direct string path/URL.
 */
export function buildCoinImageUri(
    coin: any
): string | null {
    if (!coin) return null;
    let raw: any;
    if (typeof coin === 'string') {
        raw = coin;
    } else if (typeof coin === 'object') {
        raw =
            coin.icon_url ||
            coin.icon_path ||
            coin.iconUri ||
            coin.iconPath ||
            coin.icon ||
            coin.image ||
            coin.iconUrl;
    }
    if (
        raw == null ||
        String(raw).trim() === '' ||
        String(raw).trim() === 'null' ||
        String(raw).trim() === 'undefined'
    ) return null;
    const p = String(raw).trim();
    if (p.startsWith('http://') || p.startsWith('https://')) return p;
    if (p.startsWith('//')) return `https:${p}`;
    if (p.startsWith('data:')) return p;
    const base = String(IMAGE_BASE_URL || '').replace(/\/+$/, '');
    const rel = p.replace(/^\/+/, '');
    if (!rel) return null;
    return `${base}/${rel}`;
}

export const buildCoinIconUri = buildCoinImageUri;

