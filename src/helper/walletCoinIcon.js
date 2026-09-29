/**
 * Wallet lists often miss `icon_path` while market `coinData` (TradingDataModal)
 * has working icons. Enrich wallet/margin rows from market.
 */

function pickBestIconFields(c) {
  const path = c?.icon_path || c?.iconPath || "";
  const url = c?.icon_url || c?.iconUrl || "";
  const icon = c?.icon || c?.image || "";

  // Prefer relative / API-hosted paths over extensionless CDN URLs (e.g. Fireblocks)
  // when both exist — those CDNs often fail SVG probe / FastImage on device.
  const isAbsolute = (v) => /^https?:\/\//i.test(String(v || ""));
  let chosen = "";
  if (path && !isAbsolute(path)) chosen = path;
  else if (url && !String(url).includes("fireblocks.io")) chosen = url;
  else if (path) chosen = path;
  else if (url) chosen = url;
  else if (icon) chosen = icon;

  if (!chosen) return null;
  return {
    icon_path: path || chosen,
    icon_url: url || undefined,
    icon: icon || undefined,
    iconPath: c?.iconPath,
    // Force CoinIcon / buildCoinImageUri to use the chosen value first
    _preferredIcon: chosen,
  };
}

export function buildMarketIconIndex(coinData) {
  const map = {};
  if (!Array.isArray(coinData)) return map;

  for (const c of coinData) {
    const payload = pickBestIconFields(c);
    if (!payload) continue;

    const keys = [c?.base_currency, c?.short_name, c?.coin, c?.base_currency_short_name];
    for (const k of keys) {
      const sym = String(k || "")
        .trim()
        .toUpperCase();
      if (!sym || map[sym]) continue;
      map[sym] = payload;
    }
  }
  return map;
}

export function withMarketCoinIcon(item, marketIconBySymbol) {
  if (!item || !marketIconBySymbol) return item;

  const sym = String(
    item.short_name ||
      item.base ||
      item.base_currency ||
      item.base_asset ||
      item.coin ||
      ""
  )
    .trim()
    .toUpperCase();
  if (!sym) return item;

  const market = marketIconBySymbol[sym];
  if (!market) return item;

  const preferred = market._preferredIcon || market.icon_path || market.icon_url || market.icon;

  return {
    ...item,
    icon_path: preferred || item.icon_path,
    icon_url: market.icon_url || item.icon_url,
    icon: market.icon || item.icon,
    iconPath: market.iconPath || item.iconPath,
  };
}

export function enrichWalletRowsWithMarketIcons(rows, coinData) {
  const index = buildMarketIconIndex(coinData);
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => withMarketCoinIcon(row, index));
}
