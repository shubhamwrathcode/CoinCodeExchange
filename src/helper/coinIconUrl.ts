import { IMAGE_BASE_URL } from './Constants';

/**
 * Absolute URI for coin artwork (web parity: `DepositPage` `buildCoinIconUrl`).
 */
export function buildCoinImageUri(
    coin: { icon_url?: string; icon_path?: string; icon?: string } | null | undefined
): string | null {
    if (!coin) return null;
    const raw = coin.icon_url || coin.icon_path || coin.icon;
    if (raw == null || String(raw).trim() === '') return null;
    const p = String(raw).trim();
    if (p.startsWith('http://') || p.startsWith('https://')) return p;
    if (p.startsWith('//')) return `https:${p}`;
    if (p.startsWith('data:')) return p;
    const base = String(IMAGE_BASE_URL || '').replace(/\/+$/, '');
    const rel = p.replace(/^\/+/, '');
    if (!rel) return null;
    return `${base}/${rel}`;
}
