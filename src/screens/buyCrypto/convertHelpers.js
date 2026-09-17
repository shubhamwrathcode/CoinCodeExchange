export const FALLBACK_CATALOG = {
  fiat: [{ code: "AED", kind: "FIAT", name: "UAE Dirham", min_decimals: 2, qty_decimals: 2 }],
  crypto: [
    { code: "USDT", kind: "CRYPTO", name: "Tether", min_decimals: 2, qty_decimals: 6 },
    { code: "BTC", kind: "CRYPTO", name: "Bitcoin", min_decimals: 2, qty_decimals: 6 },
    { code: "ETH", kind: "CRYPTO", name: "Ethereum", min_decimals: 2, qty_decimals: 6 },
    { code: "SOL", kind: "CRYPTO", name: "Solana", min_decimals: 2, qty_decimals: 4 },
    { code: "XRP", kind: "CRYPTO", name: "XRP", min_decimals: 2, qty_decimals: 4 },
    { code: "USDC", kind: "CRYPTO", name: "USD Coin", min_decimals: 2, qty_decimals: 6 },
    { code: "DOGE", kind: "CRYPTO", name: "Dogecoin", min_decimals: 2, qty_decimals: 2 },
  ],
  pairs: [
    { base_asset: "USDT", quote_asset: "AED" },
    { base_asset: "BTC", quote_asset: "AED" },
    { base_asset: "ETH", quote_asset: "AED" },
    { base_asset: "SOL", quote_asset: "AED" },
    { base_asset: "XRP", quote_asset: "AED" },
    { base_asset: "USDC", quote_asset: "AED" },
    { base_asset: "DOGE", quote_asset: "AED" },
  ],
};

export const ASSET_NAMES = {
  AED: "UAE Dirham",
  USDT: "Tether",
  USDC: "USD Coin",
  BTC: "Bitcoin",
  ETH: "Ethereum",
  XRP: "XRP",
  SOL: "Solana",
  DOGE: "Dogecoin",
  BNB: "BNB",
};

export function assetName(code) {
  const k = String(code || "").toUpperCase();
  return ASSET_NAMES[k] || k;
}

export function normalizeAsset(row, kind) {
  const code = String(row?.code || "").toUpperCase();
  if (!code) return null;
  return {
    code,
    kind: String(row?.kind || kind || "").toUpperCase(),
    name: row?.name || assetName(code),
    min_decimals: Number(row?.min_decimals) || 2,
    qty_decimals: Number(row?.qty_decimals) || (kind === "FIAT" ? 2 : 6),
    icon: row?.icon || null,
  };
}

export function normalizeCatalog(data) {
  const src = data && typeof data === "object" ? data : {};
  const fiat = (Array.isArray(src.fiat) ? src.fiat : []).map((r) => normalizeAsset(r, "FIAT")).filter(Boolean);
  const crypto = (Array.isArray(src.crypto) ? src.crypto : []).map((r) => normalizeAsset(r, "CRYPTO")).filter(Boolean);
  const pairs = (Array.isArray(src.pairs) ? src.pairs : [])
    .map((p) => ({
      base_asset: String(p?.base_asset || "").toUpperCase(),
      quote_asset: String(p?.quote_asset || "").toUpperCase(),
      base_name: p?.base_name || "",
      quote_name: p?.quote_name || "",
      pair_name: p?.pair_name || "",
    }))
    .filter((p) => p.base_asset && p.quote_asset);
  if (!fiat.length || !crypto.length || !pairs.length) return FALLBACK_CATALOG;
  return { fiat, crypto, pairs };
}

export function cryptosForFiat(catalog, quoteAsset) {
  const quote = String(quoteAsset || "AED").toUpperCase();
  const allowed = new Set(
    (catalog?.pairs || []).filter((p) => p.quote_asset === quote).map((p) => p.base_asset)
  );
  const list = (catalog?.crypto || []).filter((c) => allowed.has(c.code));
  return list.length > 0 ? list : FALLBACK_CATALOG.crypto;
}

export function fiatsForCrypto(catalog, baseAsset) {
  const base = String(baseAsset || "USDT").toUpperCase();
  const allowed = new Set(
    (catalog?.pairs || []).filter((p) => p.base_asset === base).map((p) => p.quote_asset)
  );
  const list = (catalog?.fiat || []).filter((f) => allowed.has(f.code));
  return list.length > 0 ? list : FALLBACK_CATALOG.fiat;
}

export function isPositiveMoneyString(raw) {
  if (raw == null || raw === "") return false;
  const s = String(raw).replace(/,/g, "").trim();
  const n = parseFloat(s);
  return !isNaN(n) && isFinite(n) && n > 0;
}

export function moneyGreaterThan(a, b) {
  const numA = parseFloat(String(a || "0").replace(/,/g, ""));
  const numB = parseFloat(String(b || "0").replace(/,/g, ""));
  return numA > numB;
}

export function sanitizeAmountInput(value) {
  let s = String(value || "").replace(/[^0-9.]/g, "");
  const parts = s.split(".");
  if (parts.length > 2) {
    s = parts[0] + "." + parts.slice(1).join("");
  }
  return s;
}

export function formatQuoteAmount(value, decimals = 2) {
  if (value == null || value === "") return "0.00";
  const n = parseFloat(String(value).replace(/,/g, ""));
  if (isNaN(n) || !isFinite(n)) return "0.00";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: Math.min(decimals, 2),
    maximumFractionDigits: decimals,
  });
}

export function formatAedAmount(value) {
  const n = parseFloat(String(value ?? "0").replace(/,/g, ""));
  if (isNaN(n) || !isFinite(n)) return "0.00";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function quoteMidLine(quote, fiatCode, cryptoCode) {
  if (!quote) return "";
  const side = String(quote.side || "").toUpperCase();
  const spend = String(quote.you_spend ?? "");
  const gross = String((quote.gross_receive || quote.you_receive) ?? "");
  if (!spend || !gross) return "";
  if (side === "SELL") {
    return `${spend} ${cryptoCode || "USDT"} = ${gross} ${fiatCode || "AED"}`;
  }
  return `${spend} ${fiatCode || "AED"} = ${gross} ${cryptoCode || "USDT"}`;
}

export function quoteFeeLabel(quote, formatAed) {
  if (!quote) return "0.00 AED";
  const fee = typeof formatAed === "function" ? formatAed(quote.fee_aed) : String(quote.fee_aed ?? "0.00");
  return `${fee} AED`;
}

export function findPairMid(rates, baseAsset, quoteAsset) {
  const base = String(baseAsset || "").toUpperCase();
  const quote = String(quoteAsset || "").toUpperCase();
  const pairs = Array.isArray(rates?.pairs) ? rates.pairs : [];
  const row = pairs.find(
    (p) =>
      String(p?.base_asset || "").toUpperCase() === base &&
      String(p?.quote_asset || "").toUpperCase() === quote
  );
  if (!row || row.mid == null || row.mid === "") {
    // Default mock mid rate if backend rate endpoint is cold
    if (base === "USDT" && quote === "AED") return { mid: "3.6725", source: "fixed" };
    if (base === "BTC" && quote === "AED") return { mid: "245000.00", source: "fixed" };
    if (base === "ETH" && quote === "AED") return { mid: "12500.00", source: "fixed" };
    if (base === "SOL" && quote === "AED") return { mid: "520.00", source: "fixed" };
    return { mid: "3.6725", source: "fixed" };
  }
  const mid = parseFloat(row.mid);
  if (isNaN(mid) || mid <= 0) return { mid: "3.6725", source: "fallback" };
  return {
    mid: String(row.mid),
    source: row.source || null,
    updated_at: row.updated_at || null,
    stale: !!row.stale,
  };
}

export function computeConvertPreview({
  side,
  amount,
  rates,
  baseAsset,
  quoteAsset,
  qtyDecimals = 6,
  inputField = "spend",
}) {
  if (!isPositiveMoneyString(amount)) {
    return null;
  }
  const pairInfo = findPairMid(rates, baseAsset, quoteAsset);
  const mid = pairInfo?.mid ? parseFloat(pairInfo.mid) : 3.6725;
  const numAmt = parseFloat(amount);
  if (isNaN(numAmt) || numAmt <= 0 || isNaN(mid) || mid <= 0) {
    return null;
  }

  const isBuy = String(side || "").toUpperCase() === "BUY";
  let youSpend = "0";
  let youReceive = "0";

  if (isBuy) {
    // User buys Crypto with Fiat (AED)
    if (inputField === "spend") {
      // Amount is in AED
      const spendAed = numAmt;
      const receiveCrypto = spendAed / mid;
      youSpend = spendAed.toFixed(2);
      youReceive = receiveCrypto.toFixed(qtyDecimals);
    } else {
      // Amount is in Crypto
      const receiveCrypto = numAmt;
      const spendAed = receiveCrypto * mid;
      youSpend = spendAed.toFixed(2);
      youReceive = receiveCrypto.toFixed(qtyDecimals);
    }
  } else {
    // User sells Crypto for Fiat (AED)
    if (inputField === "spend") {
      // Amount is in Crypto
      const spendCrypto = numAmt;
      const receiveAed = spendCrypto * mid;
      youSpend = spendCrypto.toFixed(qtyDecimals);
      youReceive = receiveAed.toFixed(2);
    } else {
      // Amount is in AED
      const receiveAed = numAmt;
      const spendCrypto = receiveAed / mid;
      youSpend = spendCrypto.toFixed(qtyDecimals);
      youReceive = receiveAed.toFixed(2);
    }
  }

  return {
    side: isBuy ? "BUY" : "SELL",
    base_asset: baseAsset,
    quote_asset: quoteAsset,
    cmc_rate: String(mid),
    user_rate: String(mid),
    you_spend: youSpend,
    you_receive: youReceive,
    fee_aed: "0.00",
    fee_label: "Zero fees",
  };
}

export function formatLiveRateLine(rates, baseAsset, quoteAsset) {
  const pairInfo = findPairMid(rates, baseAsset, quoteAsset);
  const mid = pairInfo?.mid ? pairInfo.mid : "3.6725";
  return `1 ${baseAsset || "USDT"} ≈ ${mid} ${quoteAsset || "AED"}`;
}

export function newIdempotencyKey(prefix = "cv") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
