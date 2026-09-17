import { IMAGE_BASE_URL } from "../../../../helper/Constants";

/** Unwrap MongoDB $numberDecimal or plain values to string. */
export function decStr(v) {
    if (v == null) return "";
    if (typeof v === "object" && v.$numberDecimal != null) return String(v.$numberDecimal);
    return String(v).replace(/,/g, '');
}

export function decNum(v) {
    const n = parseFloat(decStr(v));
    return Number.isFinite(n) ? n : 0;
}

/** BTC → BTCUSDT */
export function underlyingKeyFromAsset(asset) {
    const base = String(asset || "").trim().toUpperCase();
    if (!base) return "";
    if (base.endsWith("USDT") || base.endsWith("USDC")) return base;
    return `${base}USDT`;
}

/** BTCUSDT → BTC */
export function assetFromUnderlying(underlying) {
    return String(underlying || "").replace(/USDT$|USDC$/i, "");
}

/** BTCUSDT → BTC/USDT for display */
export function formatUnderlyingPair(underlying) {
    const u = String(underlying || "");
    const m = u.match(/^(.+?)(USDT|USDC)$/i);
    if (m) return `${m[1]}/${m[2].toUpperCase()}`;
    return u || "—";
}

/** Resolve backend icon path from market_overview.underlying_icons */
export function resolveUnderlyingIconUrl(iconPath) {
    if (!iconPath) return ""; // return a placeholder if needed
    const s = String(iconPath).trim();
    if (!s) return "";
    if (s.startsWith("http") || s.startsWith("/images/")) return s;
    return `${IMAGE_BASE_URL.replace(/\/$/, '')}${s.startsWith('/') ? '' : '/'}${s}`;
}

/** Build ticker list from market_overview payload. */
export function underlyingsFromMarketOverview(overview) {
    const list = overview?.underlyings || [];
    const prices = overview?.index_prices || {};
    const icons = overview?.underlying_icons || {};
    return list.map((u) => {
        const symbol = assetFromUnderlying(u);
        const price = decNum(prices[u]);
        return {
            symbol,
            underlying: u,
            price,
            iconPath: resolveUnderlyingIconUrl(icons[u] || null),
            change: 0,
            isPos: true,
            base_currency: symbol,
            quote_currency: u.replace(symbol, ''),
        };
    });
}

/** Parse expiry date from symbol e.g. BTC-260925-100000-C → 2026-09-25 */
export function parseExpiryFromSymbol(symbol) {
    const m = String(symbol || "").match(/^[A-Z0-9]+-(\d{6})-/i);
    if (!m) return null;
    const s = m[1];
    return `20${s.slice(0, 2)}-${s.slice(2, 4)}-${s.slice(4, 6)}`;
}

export function parseStrikeFromSymbol(symbol) {
    const m = String(symbol || "").match(/^[A-Z0-9]+-\d{6}-(\d+)-[CP]$/i);
    return m ? decNum(m[1]) : 0;
}

export function fmtTs(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "—";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function mapContractLeg(c) {
    const bid = decNum(c.bid_price);
    const ask = decNum(c.ask_price);
    const mark = decNum(c.mark_price);
    const iv = decNum(c.iv);
    const ivPct = iv > 0 ? iv * 100 : 0;
    const spread = ask > 0 && bid > 0 ? ask - bid : 0;
    const oi = decNum(c.open_interest);
    const vol = decNum(c.volume_24h);
    const positions = decNum(c.positions);
    const apr = decNum(c.apr);
    const bidSize = decNum(c.bid_qty);
    const askSize = decNum(c.ask_qty);
    
    return {
        symbol: c.symbol,
        last: decNum(c.last_price) > 0 ? decNum(c.last_price) : (mark > 0 ? mark : null),
        vega: decNum(c.vega),
        theta: decNum(c.theta),
        gamma: decNum(c.gamma),
        delta: decNum(c.delta),
        bidSize,
        bidIv: bid > 0 ? bid : null,
        markIv: mark > 0 ? mark : null,
        markIvPct: ivPct,
        iv,
        spread,
        spreadBp: mark > 0 ? (spread / mark) * 10000 : 0,
        askIv: ask > 0 ? ask : null,
        askIvPct: ivPct,
        askSize,
        oi,
        vol,
        positions,
        apr
    };
}

/**
 * Group flat contracts[] into chain rows per expiry for the options table UI.
 * @returns {Array<{ date, fwd, vol, data }>}
 */
export function buildChainsFromContracts(contracts, spotPrice) {
    if (!Array.isArray(contracts) || contracts.length === 0) return [];

    const byExpiry = new Map();
    for (const c of contracts) {
        const expiry = parseExpiryFromSymbol(c.symbol);
        if (!expiry) continue;
        if (!byExpiry.has(expiry)) byExpiry.set(expiry, []);
        byExpiry.get(expiry).push(c);
    }

    const spot = decNum(spotPrice);
    const chains = [];

    for (const [date, list] of [...byExpiry.entries()].sort()) {
        const byStrike = new Map();
        for (const c of list) {
            const strike = decNum(c.strike) || parseStrikeFromSymbol(c.symbol);
            if (!strike) continue;
            if (!byStrike.has(strike)) {
                byStrike.set(strike, { strike, call: null, put: null, callRaw: null, putRaw: null });
            }
            const row = byStrike.get(strike);
            const type = String(c.option_type || "").toUpperCase();
            if (type === "CALL") {
                row.callRaw = c;
                row.call = mapContractLeg(c);
            } else if (type === "PUT") {
                row.putRaw = c;
                row.put = mapContractLeg(c);
            }
        }

        const data = [...byStrike.values()]
            .sort((a, b) => a.strike - b.strike)
            .map(({ strike, call, put, callRaw, putRaw }) => {
                const diffPct = spot > 0 ? ((strike - spot) / spot) * 100 : 0;
                const emptyLeg = {
                    symbol: "",
                    last: null,
                    vega: 0,
                    theta: 0,
                    gamma: 0,
                    delta: 0,
                    bidSize: 0,
                    bidIv: 0,
                    markIv: 0,
                    markIvPct: 0,
                    spread: 0,
                    spreadBp: 0,
                    askIv: 0,
                    askIvPct: 0,
                    askSize: 0,
                    oi: 0,
                    vol: 0,
                    positions: 0,
                    apr: 0
                };
                return {
                    strike,
                    diffPct,
                    call: call || emptyLeg,
                    put: put || emptyLeg,
                    callRaw,
                    putRaw,
                };
            });

        chains.push({
            date,
            dte: "",
            fwd: spot,
            vol: "—",
            data,
        });
    }

    return chains;
}

export function parseStrikeFilterInput(v) {
    const n = parseFloat(String(v ?? "").replace(/,/g, "").trim());
    return Number.isFinite(n) && n > 0 ? n : null;
}

function inferStandardStrikeStep(strikes) {
    if (!strikes.length) return null;
    const sorted = [...strikes].sort((a, b) => a - b);
    let minGap = null;
    for (let i = 1; i < sorted.length; i++) {
        const gap = sorted[i] - sorted[i - 1];
        if (gap > 0 && (minGap == null || gap < minGap)) minGap = gap;
    }
    return minGap;
}

function isOnStandardStrikeGrid(strike, anchor, step) {
    if (!step || step <= 0) return true;
    const offset = strike - anchor;
    const remainder = Math.abs(offset % step);
    return remainder < 0.01 || Math.abs(remainder - step) < 0.01;
}

export function applyChainFilters(chains, { oddSize = true, strikeMin = null, strikeMax = null } = {}) {
    if (!Array.isArray(chains)) return [];

    return chains
        .map((chain) => {
            const strikes = (chain.data || []).map((r) => r.strike);
            const step = inferStandardStrikeStep(strikes);
            const anchor = strikes.length ? Math.min(...strikes) : 0;

            const data = (chain.data || []).filter((row) => {
                const { strike } = row;
                if (strikeMin != null && strike < strikeMin) return false;
                if (strikeMax != null && strike > strikeMax) return false;
                if (!oddSize && step != null && !isOnStandardStrikeGrid(strike, anchor, step)) {
                    return false;
                }
                return true;
            });

            return { ...chain, data };
        })
        .filter((chain) => chain.data.length > 0);
}

export function buildOrderbookDisplayRows(levels) {
    if (!Array.isArray(levels) || levels.length === 0) return [];
    let cum = 0;
    const maxCum = levels.reduce((s, r) => s + Number(r.qty || 0), 0);
    return levels.map((row) => {
        cum += Number(row.qty || 0);
        const depth = maxCum > 0 ? Math.round((cum / maxCum) * 100) : 0;
        return {
            price: Number(row.price || 0),
            qty: Number(row.qty || 0),
            sum: cum,
            depth,
        };
    });
}

export function fmtTradeTimeShort(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "—";
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function computeOptionsPositionAvailable(position, openOrders = []) {
    const qty = decNum(position?.quantity);
    const side = String(position?.side || "").toUpperCase();
    const symbol = position?.symbol;
    if (!symbol || qty <= 0) return 0;

    let locked = 0;
    for (const o of openOrders) {
        if (o.symbol !== symbol) continue;
        const rem = decNum(o.remaining_quantity);
        const oSide = String(o.side || "").toUpperCase();
        if (side === "LONG" && oSide === "SELL") locked += rem;
        if (side === "SHORT" && oSide === "BUY") locked += rem;
    }
    return Math.max(0, qty - locked);
}

/** Sum per-position unrealized PnL from `user_positions_update`. */
export function sumOptionsPositionsUnrealizedPnl(positions) {
    if (!Array.isArray(positions)) return null;
    if (positions.length === 0) return 0;
    let sum = 0;
    for (const p of positions) {
        sum += decNum(p?.unrealized_pnl);
    }
    return sum;
}

/**
 * Account unrealized PnL — prefer Σ positions when positions snapshot is ready
 * so the account panel matches the open-positions table.
 */
export function resolveOptionsAccountUnrealizedPnl(accountUpdate, positions, positionsReady = false) {
    if (positionsReady && Array.isArray(positions)) {
        return sumOptionsPositionsUnrealizedPnl(positions);
    }
    return decNum(accountUpdate?.unrealized_pnl);
}

export {
    normalizeOptionsPnlAnalysisData,
    optionsPnlPeriodRange,
    paginateOptionsPnlSeries,
    OPTIONS_PNL_PERIOD_DEFAULT,
} from "./optionsPnlQuery";
