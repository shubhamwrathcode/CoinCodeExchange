import { IMAGE_BASE_URL } from './Constants';

/**
 * Absolute URI for coin artwork (web parity: `DepositPage` `buildCoinIconUrl`).
 * Supports coin object or direct string path/URL.
 * Field list matches TradingDataModal coin rows.
 */
export function buildCoinImageUri(coin: any): string | null {
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
      coin.base_currency_icon ||
      coin.currency_icon ||
      coin.icon ||
      coin.image ||
      coin.logo ||
      coin.iconUrl;
  }
  if (
    raw == null ||
    String(raw).trim() === '' ||
    String(raw).trim() === 'null' ||
    String(raw).trim() === 'undefined'
  ) {
    return null;
  }
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

/** Normalize ticker for lookups across wallet / margin / futures / options shapes. */
export function resolveCoinTicker(coin?: any): string {
  if (!coin) return '';
  if (typeof coin === 'string') return coin.trim().toUpperCase();
  const raw =
    coin.short_name ||
    coin.base_currency ||
    coin.base ||
    coin.asset ||
    coin.currency ||
    coin.symbol ||
    coin.margin_asset ||
    '';
  // "BTC/USDT" or "BTC_USDT" → BTC
  const s = String(raw).trim().toUpperCase();
  if (!s) return '';
  const cut = s.split(/[/_-]/)[0];
  return cut || s;
}

/**
 * Resolve icon URI the same way TradingDataModal does — prefer market pair metadata.
 */
export function resolveCoinIconUri(
  coin: any,
  coinPairs?: any[] | null,
  directUri?: string | null
): string | null {
  const fromDirect = directUri ? buildCoinImageUri(directUri) : null;
  const fromCoin = coin ? buildCoinImageUri(coin) : null;
  const ticker = resolveCoinTicker(coin);

  let fromPairs: string | null = null;
  if (ticker && Array.isArray(coinPairs) && coinPairs.length) {
    const upper = ticker.toUpperCase();
    const found =
      coinPairs.find((p) => String(p?.base_currency || '').toUpperCase() === upper) ||
      coinPairs.find((p) => {
        const pair = String(p?.symbol || p?.pair || p?.name || '').toUpperCase();
        return (
          pair === upper ||
          pair.startsWith(`${upper}/`) ||
          pair.startsWith(`${upper}_`) ||
          pair.startsWith(`${upper}-`)
        );
      });
    if (found) fromPairs = buildCoinImageUri(found);
  }

  // Prefer market pair icon (TradingDataModal source), then explicit URI, then wallet row path
  return fromPairs || fromDirect || fromCoin;
}
