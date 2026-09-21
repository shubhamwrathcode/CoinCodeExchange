import moment from 'moment';

/**
 * Utilities for futures trading: tick/step size, validation, and data formatting.
 * Aligned with web UsdMFutures / futuresUtils for consistency.
 */

export function getDecimalPlaces(value) {
  if (!value || value >= 1) return 0;
  const str = String(value);
  if (str.includes("e-")) {
    return parseInt(str.split("e-")[1], 10) || 0;
  }
  const decimalPart = str.split(".")[1];
  return decimalPart ? decimalPart.length : 0;
}

export function getTickSize(pair) {
  const raw = pair?.tickSize ?? pair?.tick_size;
  if (raw != null && Number(raw) > 0) {
    return Number(raw);
  }
  const prec = pair?.price_precision ?? pair?.quote_decimal ?? pair?.price_decimal;
  if (typeof prec === "number" && prec >= 0) {
    return Math.pow(10, -prec);
  }
  return 0.01;
}

export function getStepSize(pair) {
  const raw = pair?.stepSize ?? pair?.step_size;
  if (raw != null && Number(raw) > 0) {
    return Number(raw);
  }
  const prec = pair?.quantity_precision ?? pair?.base_decimal ?? pair?.qty_decimal ?? pair?.quantity_decimal;
  if (typeof prec === "number" && prec >= 0) {
    return Math.pow(10, -prec);
  }
  return 0.00001;
}

export function formatPriceByTick(price, pair) {
  if (price === undefined || price === null || isNaN(price)) return 0;
  const tickSize = getTickSize(pair);
  if (!tickSize || tickSize <= 0) return Number(price);
  const rounded = Math.round(Number(price) / tickSize) * tickSize;
  const precision = getDecimalPlaces(tickSize);
  return parseFloat(rounded.toFixed(precision));
}

export function formatQtyByStep(qty, pair) {
  if (qty === undefined || qty === null || isNaN(qty)) return 0;
  const stepSize = getStepSize(pair);
  if (!stepSize || stepSize <= 0) return Number(qty);
  const rounded = Math.round(Number(qty) / stepSize) * stepSize;
  const precision = getDecimalPlaces(stepSize);
  return parseFloat(rounded.toFixed(precision));
}

export function formatOrderDecimal(value, increment) {
  const n = decNum(value);
  if (!Number.isFinite(n)) return "";
  const dp = Math.max(getDecimalPlaces(Number(increment) || 0), 0);
  if (dp === 0) return String(Math.trunc(n));
  return n.toFixed(dp).replace(/(\.[0-9]*?)0+$/, "$1").replace(/\.$/, "") || "0";
}

export function floorToIncrement(value, increment) {
  const v = decNum(value);
  const inc = decNum(increment);
  if (!Number.isFinite(v) || v <= 0) return 0;
  if (!Number.isFinite(inc) || inc <= 0) return v;
  const floored = Math.floor(v / inc + 1e-12) * inc;
  const dp = getDecimalPlaces(inc);
  return dp > 0 ? parseFloat(floored.toFixed(dp)) : floored;
}

export function snapToIncrementInput(raw, increment) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  const floored = floorToIncrement(trimmed, increment);
  if (floored <= 0) return "";
  return formatOrderDecimal(floored, increment);
}

/** Snap qty to step_size and cap at position size (web close-position). */
export function snapAndCapCloseQty(raw, stepSize, maxQty) {
  const snapped = snapToIncrementInput(raw, stepSize);
  if (!snapped) return "";
  const n = decNum(snapped);
  const max = decNum(maxQty);
  if (Number.isFinite(max) && max > 0 && Number.isFinite(n) && n > max + 1e-12) {
    return snapToIncrementInput(String(max), stepSize);
  }
  return snapped;
}

export function sanitizeIncrementInput(raw, increment) {
  let s = String(raw ?? "").replace(/[^\d.]/g, "");
  const maxDp = Math.max(getDecimalPlaces(Number(increment) || 0), 0);
  const dotIdx = s.indexOf(".");
  if (dotIdx >= 0) {
    const intPart = s.slice(0, dotIdx);
    const fracPart = s.slice(dotIdx + 1).replace(/\./g, "");
    if (maxDp === 0) return intPart;
    s = `${intPart}.${fracPart.slice(0, maxDp)}`;
  }
  return s;
}

function isMultipleOf(value, step) {
  if (!step || step <= 0) return true;
  const ratio = value / step;
  return Math.abs(ratio - Math.round(ratio)) < 1e-8;
}

export function validateFuturesOrderInputs({ price, quantity, pair, orderType }) {
  const tickSize = getTickSize(pair);
  const stepSize = getStepSize(pair);
  const minNotional = pair?.minNotional ?? pair?.min_notional ?? 5;

  const numPrice = parseFloat(price);
  const numQty = parseFloat(quantity);
  const notional = numPrice * numQty;

  if (orderType === "Limit" && (isNaN(numPrice) || numPrice <= 0)) {
    return { valid: false, message: "Please enter a valid limit price." };
  }
  if (isNaN(numQty) || numQty <= 0) {
    return { valid: false, message: "Quantity must be greater than 0." };
  }

  if (orderType === "Limit") {
    if (!isMultipleOf(numPrice, tickSize)) {
      return { valid: false, message: `Price must be a multiple of ${tickSize}` };
    }
  }

  if (!isMultipleOf(numQty, stepSize)) {
    return { valid: false, message: `Quantity must be a multiple of ${stepSize}` };
  }

  if (notional < minNotional) {
    return {
      valid: false,
      message: `Minimum order value is ${minNotional} ${pair?.margin_asset || "USDT"}`,
    };
  }

  return { valid: true };
}

/**
 * Normalize orderbook from backend (same as web).
 */
export function normalizeOrderbookOrders(orders) {
  if (!Array.isArray(orders)) return [];
  return orders.map((o, i) => {
    const price = parseFloat(o.price) || 0;
    const remaining =
      o.remaining != null
        ? parseFloat(o.remaining)
        : (o.size != null ? parseFloat(o.size) : parseFloat(o.quantity) || 0);
    const sum = o.sum != null ? parseFloat(o.sum) : price * remaining;
    return {
      price,
      remaining,
      size: remaining,
      sum,
      quantity: remaining,
    };
  });
}

const DEFAULT_ORDER_BOOK_AGG_OPTIONS = [0.01, 0.1, 1, 10];

export function getOrderBookAggOptionsForPair(tickSize) {
    const tick = Number(tickSize);
    if (!Number.isFinite(tick) || tick <= 0) {
        return DEFAULT_ORDER_BOOK_AGG_OPTIONS.slice();
    }
    const mults = [1, 10, 100, 1000, 10000];
    const out = [];
    for (const m of mults) {
        const v = tick * m;
        if (!Number.isFinite(v) || v <= 0) continue;
        out.push(parseFloat(v.toPrecision(12)));
    }
    const unique = Array.from(new Set(out)).sort((a, b) => a - b);
    return unique.length ? unique : DEFAULT_ORDER_BOOK_AGG_OPTIONS.slice();
}

export function roundPriceToAgg(price, agg) {
    const n = Number(price);
    const a = Number(agg);
    if (!Number.isFinite(n) || !Number.isFinite(a) || a <= 0) return n;
    const dp = getDecimalPlaces(a);
    const rounded = Math.round(n / a) * a;
    return dp > 0 ? parseFloat(rounded.toFixed(dp)) : Math.round(rounded);
}

export function aggregateOrderBookRows(orders, agg) {
    if (!orders?.length) return [];
    const map = new Map();
    for (const o of orders) {
        const bucket = roundPriceToAgg(o.price, agg);
        const qty = Number(o.quantity ?? o.remaining) || 0;
        const prev = map.get(bucket);
        if (prev) {
            prev.quantity  = (Number(prev.quantity)  || 0) + qty;
            prev.remaining = (Number(prev.remaining) || 0) + qty;
        } else {
            map.set(bucket, { ...o, price: bucket, quantity: qty, remaining: qty });
        }
    }
    return Array.from(map.values());
}

export function decUsd(v) {
    if (v == null) return null;
    if (typeof v === "object" && v !== null && "$numberDecimal" in v) {
        const n = Number(v.$numberDecimal);
        return Number.isFinite(n) ? n : null;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

export function getMaxNotionalAtLeverage(tiers, selectedLeverage) {
    if (!Array.isArray(tiers) || tiers.length === 0) return Infinity;
    const lev = Number(selectedLeverage);
    if (!Number.isFinite(lev) || lev < 1) return Infinity;

    let maxNotional = 0;
    let hasFinite = false;
    for (const tier of tiers) {
        if (Number(tier.max_leverage) >= lev) {
            const parsed = decUsd(tier.max_notional_usd);
            const cap = parsed == null ? Infinity : parsed;
            if (Number.isFinite(cap)) hasFinite = true;
            if (cap > maxNotional) maxNotional = cap;
        }
    }
    if (!hasFinite && maxNotional === 0) return Infinity;
    return maxNotional;
}

export function getTierLeverageButtons(leverageTiers, maxLeverage = 125) {
    const maxLev = Number(maxLeverage) || 125;
    if (!Array.isArray(leverageTiers) || leverageTiers.length === 0) {
        return [1, maxLev].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
    }
    const set = new Set();
    for (const tier of leverageTiers) {
        const ml = Number(tier.max_leverage);
        if (Number.isFinite(ml) && ml >= 1) set.add(Math.round(ml));
    }
    const arr = [...set].sort((a, b) => a - b);
    return arr.length ? arr : [1, maxLev];
}

export function resolveTakerFeeRate(contract) {
    if (!contract) return 0;
    const rate = Number(contract.taker_fee_rate);
    if (Number.isFinite(rate) && rate >= 0) return rate;
    const pct = Number(contract.taker_fee);
    if (Number.isFinite(pct) && pct >= 0) return pct / 100;
    return 0;
}

export function computeMaxOpenNotional(effectiveAvailable, leverage, takerFeeRate) {
    const avail = Number(effectiveAvailable);
    const lev = Math.max(1, Number(leverage) || 1);
    const fee = Number(takerFeeRate);
    if (!Number.isFinite(avail) || avail <= 0) return 0;
    const feeVal = Number.isFinite(fee) && fee >= 0 ? fee : 0;
    const denom = 1 / lev + feeVal;
    if (denom <= 0) return 0;
    return avail / denom;
}

export function decNum(val) {
  if (val == null || val === "") return NaN;
  if (typeof val === "object") {
    if (val.$numberDecimal !== undefined) return parseFloat(val.$numberDecimal);
    if (typeof val.valueOf === "function") {
      const inner = val.valueOf();
      if (typeof inner === "number" && Number.isFinite(inner)) return inner;
      if (inner !== val) {
        const nested = decNum(inner);
        if (Number.isFinite(nested)) return nested;
      }
    }
    if (typeof val.toString === "function") {
      const s = val.toString();
      if (s && s !== "[object Object]") {
        const n = parseFloat(s);
        if (Number.isFinite(n)) return n;
      }
    }
    return NaN;
  }
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : NaN;
}

export const FUTURES_DECIMAL_CAP = 8;

export function capDecStr(n, dp = FUTURES_DECIMAL_CAP) {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return null;
  return parseFloat(v.toFixed(dp)).toString();
}

export function fmtFuturesQty(n, fallback = "—") {
  const v = typeof n === "number" ? n : decNum(n);
  if (!Number.isFinite(v)) return fallback;
  return capDecStr(v) ?? fallback;
}

export function fmtFuturesPrice(n, fallback = "—") {
  const v = typeof n === "number" ? n : decNum(n);
  if (!Number.isFinite(v) || v <= 0) return fallback;
  return capDecStr(v) ?? fallback;
}

export function fmtFuturesUsdt(n, { signed = false, fallback = "—" } = {}) {
  const v = typeof n === "number" ? n : decNum(n);
  if (!Number.isFinite(v)) return fallback;
  const body = capDecStr(signed ? Math.abs(v) : v) ?? "0";
  if (!signed) return `${body} USDT`;
  const signedStr = v > 0 ? `+${body}` : v < 0 ? `-${body}` : body;
  return `${signedStr} USDT`;
}

export function fmtFuturesPct(n, { signed = false, fallback = "—", dp = 4 } = {}) {
  const v = typeof n === "number" ? n : decNum(n);
  if (!Number.isFinite(v)) return fallback;
  const absVal = Math.abs(v);
  const formatted = absVal.toFixed(dp);
  if (signed) {
    const signedStr = v > 0 ? `+${formatted}` : v < 0 ? `-${formatted}` : formatted;
    return `${signedStr}%`;
  }
  return `${formatted}%`;
}

let _historyDetail = null;

export function setFuturesHistoryDetail(data) {
  _historyDetail = data;
}

export function getFuturesHistoryDetail() {
  return _historyDetail;
}

export function openFuturesHistoryDetail(navigation, payload) {
  setFuturesHistoryDetail(payload);
  navigation.navigate("FutureHistoryCardDetailPage", {
    title: payload?.title,
    liqFeeDisplay: payload?.liqFeeDisplay,
    closedTimeDisplay: payload?.closedTimeDisplay,
    openedTimeDisplay: payload?.openedTimeDisplay,
  });
}

export function computePosition(pos, liveMarkPrice = null, selectedCoin = null) {
  const qty = decNum(pos.quantity ?? pos.filled_quantity ?? pos.amount);
  const entry = decNum(pos.average_entry_price ?? pos.entry_price);
  
  let mark = decNum(pos.mark_price);
  if (!Number.isFinite(mark) || mark <= 0) {
    if (liveMarkPrice && selectedCoin && pos.symbol === selectedCoin.symbol) {
      const lm = Number(String(liveMarkPrice ?? "").replace(/,/g, ""));
      if (Number.isFinite(lm) && lm > 0) mark = lm;
    }
  }

  const sideSign = String(pos.side ?? "").toUpperCase() === "SHORT" || String(pos.side ?? "").toUpperCase() === "SELL" ? -1 : 1;
  let pnl = decNum(pos.unrealized_pnl ?? pos.pnl);
  
  if (!Number.isFinite(pnl) && Number.isFinite(entry) && Number.isFinite(mark) && Number.isFinite(qty)) {
    pnl = (mark - entry) * qty * sideSign;
  }
  if (!Number.isFinite(pnl)) pnl = 0;

  const margin = decNum(pos.isolated_margin_allocated ?? pos.initial_margin ?? pos.margin);
  
  const apiRoe = decNum(pos.roe_pct ?? pos.roe ?? pos.unrealized_pnl_percentage);
  const roe = Number.isFinite(apiRoe)
    ? apiRoe
    : Number.isFinite(margin) && margin > 0
      ? (pnl / margin) * 100
      : NaN;

  const apiMarginRatio = decNum(pos.margin_ratio ?? pos.marginRatio);
  const mm = decNum(pos.maintenance_margin);
  const marginRatio = Number.isFinite(apiMarginRatio) && apiMarginRatio > 0
    ? apiMarginRatio
    : Number.isFinite(mm) && Number.isFinite(margin) && margin + pnl > 0
      ? (mm / (margin + pnl)) * 100
      : NaN;

  return { qty, entry, mark, pnl, margin, roe, marginRatio };
}

export function formatCloseReason(reason, status) {
  const r = String(reason ?? status ?? "").toUpperCase();
  if (r === "USER") return "Closed manually";
  if (r.includes("LIQUIDAT")) return "Liquidated";
  if (r === "ADL") return "ADL";
  if (r === "CLOSED") return "Closed";
  if (r === "EXPIRED") return "Expired";
  return reason || status || "—";
}

function unwrapTs(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "object") {
    if (raw.$date != null) return unwrapTs(raw.$date);
    if (raw.$numberLong != null) return unwrapTs(raw.$numberLong);
    if (typeof raw.toISOString === "function") {
      const t = raw.getTime?.();
      return Number.isFinite(t) && !Number.isNaN(t) ? raw : null;
    }
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const d = new Date(raw < 1e12 ? raw * 1000 : raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** Format API timestamps (ISO, epoch, Mongo $date). Invalid → "—". */
export function formatFuturesTs(raw) {
  const d = unwrapTs(raw);
  if (!d) return "—";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function pickOpenedTs(pos) {
  return pos?.opened_at ?? pos?.openedAt ?? pos?.created_at ?? pos?.createdAt ?? pos?.open_time ?? null;
}

export function pickClosedTs(pos) {
  return pos?.closed_at ?? pos?.closedAt ?? pos?.updated_at ?? pos?.updatedAt ?? pos?.close_time ?? pos?.created_at ?? pos?.createdAt ?? null;
}

export function isLiquidatedPosition(pos) {
  const reason = String(pos?.close_reason ?? pos?.closeReason ?? "").toUpperCase();
  const status = String(pos?.status ?? "").toUpperCase();
  if (reason.includes("LIQUIDAT") || status.includes("LIQUIDAT")) return true;
  return pos?.liquidated === true || pos?.liquidated === "YES" || pos?.liquidated === 1;
}

/** Liquidation fee for history. Show when fee > 0; else null (UI shows —). */
export function formatLiqFee(pos, fallbackAsset = "USDT") {
  const n = decNum(pos?.liq_fee ?? pos?.liqFee ?? pos?.liquidation_fee ?? pos?.liquidationFee);
  if (!Number.isFinite(n) || n <= 0) return null;
  const asset = pos?.liq_fee_asset || pos?.liqFeeAsset || fallbackAsset || "USDT";
  const value = capDecStr(n) ?? "0";
  return { value, asset, display: `${value} ${asset}`.trim() };
}

export function computeClosedPosition(pos) {
  if (!pos || typeof pos !== "object") {
    return { entry: 0, exit: 0, qty: 0, pnl: 0, fees: 0, funding: 0, reason: "—" };
  }

  const entryVal = decNum(pos.average_entry_price ?? pos.entry_price ?? pos.avg_price ?? pos.order_price ?? pos.price);
  const entry = Number.isFinite(entryVal) ? entryVal : 0;

  const exitVal = decNum(pos.average_exit_price ?? pos.close_price ?? pos.exit_price ?? pos.mark_price ?? pos.last_price);
  const exit = Number.isFinite(exitVal) ? exitVal : 0;

  let qty = decNum(pos.quantity ?? pos.filled_quantity ?? pos.executed_quantity ?? pos.amount ?? pos.size);
  
  if ((!Number.isFinite(qty) || qty <= 0) && entry > 0) {
    const initMargin = decNum(pos.initial_margin ?? pos.isolated_margin_allocated ?? pos.margin);
    const lev = Number(pos.leverage);
    if (Number.isFinite(initMargin) && initMargin > 0 && Number.isFinite(lev) && lev > 0) {
      qty = (initMargin * lev) / entry;
    }
  }
  if (!Number.isFinite(qty) || qty < 0) qty = 0;

  let pnl = decNum(pos.realized_pnl ?? pos.realised_pnl ?? pos.pnl ?? pos.closed_pnl ?? pos.profit ?? pos.unrealized_pnl);

  if (!Number.isFinite(pnl)) {
    if (entry > 0 && exit > 0 && qty > 0) {
      const sideSign = String(pos.side ?? "").toUpperCase() === "SHORT" || String(pos.side ?? "").toUpperCase() === "SELL" ? -1 : 1;
      pnl = (exit - entry) * qty * sideSign;
    } else {
      pnl = 0;
    }
  }

  const feesVal = decNum(pos.total_fees ?? pos.fees ?? pos.accumulated_fees ?? pos.fee ?? pos.total_fees_paid);
  const fees = Number.isFinite(feesVal) ? feesVal : 0;

  const fundingVal = decNum(pos.total_funding ?? pos.funding_fee ?? pos.funding);
  const funding = Number.isFinite(fundingVal) ? fundingVal : 0;

  const reason = formatCloseReason(pos.close_reason ?? pos.closeReason, pos.status);
  return { entry, exit, qty, pnl, fees, funding, reason };
}

export function computeFuturesLeverageStats({
    availableBalance = 0,
    leverage = 1,
    maxLeverage = 125,
    leverageTiers = [],
    takerFeeRate = 0,
}) {
    const bal = Number(availableBalance) || 0;
    const lev = Number(leverage) || 1;
    const maxLev = Number(maxLeverage) || 125;

    const maxNotionalAtLev = getMaxNotionalAtLeverage(leverageTiers, lev);
    const maxNotionalAtMaxLev = getMaxNotionalAtLeverage(leverageTiers, maxLev);

    const allowFromBalance = computeMaxOpenNotional(bal, lev, takerFeeRate);
    const allowToOpen =
        Number.isFinite(maxNotionalAtLev) && maxNotionalAtLev !== Infinity
            ? Math.min(allowFromBalance, maxNotionalAtLev)
            : allowFromBalance;

    const maxBorrowableFromBal = bal * Math.max(0, maxLev - 1);
    const maximumBorrowable =
        Number.isFinite(maxNotionalAtMaxLev) && maxNotionalAtMaxLev !== Infinity
            ? Math.min(maxBorrowableFromBal, maxNotionalAtMaxLev)
            : maxBorrowableFromBal;

    const currentLoanLimit =
        Number.isFinite(maxNotionalAtLev) && maxNotionalAtLev !== Infinity ? maxNotionalAtLev : null;

    return {
        allowToOpen,
        maximumBorrowable,
        maxLeverage: maxLev,
        currentLoanLimit,
        maxNotionalAtLev,
    };
}

export function tradeUserView(ex, userId) {
  const uid = userId ? String(userId) : null;
  const takerSide = String(ex?.side ?? ex?.taker_side ?? ex?.order_side ?? "").toUpperCase();
  const flip = (s) => (s === "BUY" || s === "LONG" ? "SELL" : s === "SELL" || s === "SHORT" ? "BUY" : s);
  const isTaker = uid && ex?.taker_user_id && String(ex.taker_user_id) === String(uid);
  const isMaker = uid && ex?.maker_user_id && String(ex.maker_user_id) === String(uid);
  if (isMaker && !isTaker) {
    return {
      side: flip(takerSide) || "SELL",
      role: "Maker",
      orderId: ex.maker_order_id || ex.order_id || "—",
      fee: ex.maker_fee ?? ex.fee ?? ex.total_fees_paid,
      pnl: ex.maker_realized_pnl ?? ex.realized_pnl ?? ex.pnl,
    };
  }
  return {
    side: takerSide || "BUY",
    role: isTaker ? "Taker" : (ex?.taker_role ? "Taker" : (ex?.role || "Taker")),
    orderId: ex.taker_order_id || ex.maker_order_id || ex.order_id || "—",
    fee: ex.taker_fee ?? ex.fee ?? ex.total_fees_paid,
    pnl: ex.taker_realized_pnl ?? ex.realized_pnl ?? ex.pnl,
  };
}

export function computeTradeHistoryItem(trade, selectedCoin = null, userId = null) {
  if (!trade || typeof trade !== "object") {
    return {
      symbol: "—",
      isBuy: true,
      sideText: "BUY",
      roleText: "Taker",
      price: 0,
      qty: 0,
      total: 0,
      fee: 0,
      realizedPnl: 0,
      feeAsset: "USDT",
      baseCoin: "BNB",
      dateFormatted: "—",
      timeFormatted: "—",
    };
  }

  const raw = trade?.data || trade?.trade || trade?.execution || trade?.order || trade;
  const view = tradeUserView(raw, userId);

  const rawSide = String(view.side || raw.side || raw.type || "").toUpperCase();
  const isBuy = rawSide === "BUY" || rawSide === "LONG" || raw.is_buyer === true || raw.isBuyer === true;
  const sideText = isBuy ? "BUY" : "SELL";
  const roleText = String(view.role || raw.role || "Taker").toUpperCase().includes("MAKER") ? "Maker" : "Taker";

  const searchTargets = [trade, raw, trade?.order, trade?.execution, trade?.trade, trade?.detail, trade?.deal].filter(Boolean);

  const extractNum = (keys, allowZero = false) => {
    for (const target of searchTargets) {
      for (const k of keys) {
        if (target[k] !== undefined && target[k] !== null && target[k] !== "") {
          const n = decNum(target[k]);
          if (Number.isFinite(n) && (allowZero ? n >= 0 : n > 0)) {
            return n;
          }
        }
      }
    }
    return null;
  };

  // Price
  let price = extractNum([
    "execution_price",
    "executionPrice",
    "fill_price",
    "fillPrice",
    "price",
    "avg_price",
    "avgPrice",
    "average_price",
    "averagePrice",
    "deal_price",
    "dealPrice",
    "order_price",
    "orderPrice",
    "trade_price",
    "tradePrice",
    "p",
  ]) || 0;

  // Qty
  let qty = extractNum([
    "execution_quantity",
    "executionQuantity",
    "executed_qty",
    "executedQty",
    "executed_quantity",
    "executedQuantity",
    "filled_quantity",
    "filledQuantity",
    "filled_qty",
    "filledQty",
    "filled",
    "quantity",
    "qty",
    "deal_stock",
    "deal_size",
    "deal_amount",
    "deal_qty",
    "amount",
    "size",
    "contracts",
    "contract_quantity",
    "contract_num",
    "trade_quantity",
    "trade_qty",
    "trade_amount",
    "trade_size",
    "vol",
    "volume",
    "base_qty",
    "base_amount",
    "orig_qty",
    "origQty",
    "cum_qty",
    "cumQty",
    "order_quantity",
    "order_qty",
    "order_amount",
    "exec_qty",
    "exec_amount",
    "position_size",
    "units",
    "lots",
    "lot_size",
  ]) || 0;

  // Total
  let total = extractNum([
    "execution_notional_usd",
    "notional_usd",
    "notional",
    "total",
    "total_value",
    "totalValue",
    "total_price",
    "totalPrice",
    "volume_quote",
    "quote_volume",
    "quoteVolume",
    "quote_qty",
    "quoteQty",
    "quote_amount",
    "quoteAmount",
    "cummulativeQuoteQty",
    "cumQuote",
    "cost",
    "trade_value",
    "tradeValue",
    "deal_money",
    "deal_value",
    "money",
    "turnover",
    "val",
    "value",
    "sum",
    "cash",
    "amount_usd",
  ]) || 0;

  // Fee
  let fee = decNum(view.fee) || extractNum([
    "taker_fee",
    "maker_fee",
    "fee",
    "fee_paid",
    "feePaid",
    "fee_amount",
    "feeAmount",
    "fees",
    "commission",
    "commission_amount",
    "total_fees",
    "totalFees",
    "total_fee",
    "totalFee",
    "trade_fee",
    "tradeFee",
    "deal_fee",
    "dealFee",
    "cost_fee",
    "trading_fee",
    "user_fee",
    "exec_fee",
    "handling_fee",
  ]) || 0;

  // Realized PNL
  let realizedPnl = decNum(view.pnl);
  if (!Number.isFinite(realizedPnl)) {
    realizedPnl = extractNum([
      "taker_realized_pnl",
      "maker_realized_pnl",
      "realized_pnl",
      "realised_pnl",
      "realizedPnl",
      "realisedPnl",
      "pnl",
      "profit",
      "closed_pnl",
      "closedPnl",
      "net_pnl",
      "netPnl",
      "rpnl",
      "realized_profit",
      "realised_profit",
      "realized_pnl_usd",
      "realized_pnl_usdt",
    ], true);
  }

  // Deep Scan across all keys if anything is still 0
  for (const target of searchTargets) {
    for (const [key, val] of Object.entries(target)) {
      const k = key.toLowerCase();
      const n = decNum(val);
      if (Number.isFinite(n) && n > 0) {
        if (qty === 0 && (k.includes("qty") || k.includes("quant") || k.includes("amount") || k.includes("size") || k.includes("vol") || k.includes("stock") || k.includes("fill") || k.includes("exec"))) {
          qty = n;
        }
        if (total === 0 && (k.includes("total") || k.includes("quote") || k.includes("money") || k.includes("turnover") || k.includes("cost") || k.includes("notional"))) {
          total = n;
        }
        if (fee === 0 && (k.includes("fee") || k.includes("commiss"))) {
          fee = n;
        }
        if (realizedPnl === null && (k.includes("pnl") || k.includes("profit"))) {
          realizedPnl = n;
        }
      }
    }
  }

  // Total derivation
  if (total <= 0 && price > 0 && qty > 0) {
    total = price * qty;
  }
  if (qty <= 0 && total > 0 && price > 0) {
    qty = total / price;
  }

  // Fee calculation (0.05% taker / 0.02% maker parity)
  if (fee <= 0 && total > 0) {
    const feeRate = decNum(trade.fee_rate ?? trade.feeRate ?? trade.taker_fee_rate ?? raw.fee_rate ?? raw.taker_fee_rate);
    const rate = Number.isFinite(feeRate) && feeRate > 0 ? feeRate : (roleText === "Maker" ? 0.0002 : 0.0005);
    fee = total * rate;
  }

  // Realized PNL fallback
  if (realizedPnl === null || !Number.isFinite(realizedPnl)) {
    if (!isBuy) {
      const entryPrice = extractNum(["entry_price", "avg_entry_price", "average_entry_price", "open_price", "cost_price"]);
      if (Number.isFinite(entryPrice) && entryPrice > 0 && price > 0 && qty > 0) {
        realizedPnl = (price - entryPrice) * qty;
      } else {
        realizedPnl = 0;
      }
    } else {
      realizedPnl = 0;
    }
  }

  const feeAsset = trade.fee_asset || trade.feeAsset || raw.fee_asset || raw.feeAsset || raw.settlement_asset || "USDT";
  const symbol = trade.symbol || raw.symbol || "—";
  const baseCoin = symbol !== "—"
    ? String(symbol).replace(/USDT.*/i, "").replace(/-PERP/i, "").replace(/\/.*/, "")
    : (selectedCoin?.base_currency || "BNB");

  const createdTime = trade.executed_at || trade.executedAt || trade.created_at || trade.createdAt || trade.time || trade.timestamp || trade.execution_time || raw.executed_at || raw.created_at || raw.createdAt;
  const dateFormatted = createdTime ? moment(createdTime).format("YYYY-MM-DD") : "—";
  const timeFormatted = createdTime ? moment(createdTime).format("HH:mm:ss") : "—";

  return {
    symbol,
    isBuy,
    sideText,
    roleText,
    price,
    qty,
    total,
    fee,
    realizedPnl,
    feeAsset,
    baseCoin,
    dateFormatted,
    timeFormatted,
  };
}

export function formatFuturesOrderType(type) {
  if (!type) return "Limit";
  const up = String(type).toUpperCase().trim();
  if (up === "TAKE_PROFIT_MARKET" || up === "TAKE_PROFIT") return "TP Market";
  if (up === "TAKE_PROFIT_LIMIT") return "TP Limit";
  if (up === "STOP_MARKET" || up === "STOP_LOSS_MARKET" || up === "STOP") return "SL Market";
  if (up === "STOP_LIMIT" || up === "STOP_LOSS_LIMIT") return "SL Limit";
  if (up === "TRAILING_STOP_MARKET" || up === "TRAILING_STOP") return "Trailing Stop";
  if (up === "CONDITIONAL") return "Conditional";
  if (up === "MARKET") return "Market";
  if (up === "LIMIT") return "Limit";
  if (up === "LIQUIDATION") return "Liquidation";
  return up.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

export function getFuturesOrderDisplayPrice(order) {
  if (!order) return "Market";
  const rawType = String(order.order_type ?? order.type ?? "").toUpperCase();
  const priceVal = decNum(order.price ?? order.order_price ?? order.limit_price);
  const triggerVal = decNum(
    order.trigger_price ??
    order.triggerPrice ??
    order.stop_price ??
    order.stopPrice ??
    order.take_profit ??
    order.stop_loss
  );

  if (
    rawType.includes("TAKE_PROFIT") ||
    rawType.includes("STOP") ||
    rawType.includes("CONDITIONAL") ||
    rawType.includes("TRIGGER")
  ) {
    if (Number.isFinite(triggerVal) && triggerVal > 0) {
      if (rawType.includes("LIMIT") && Number.isFinite(priceVal) && priceVal > 0) {
        return fmtFuturesPrice(priceVal);
      }
      return fmtFuturesPrice(triggerVal);
    }
  }

  if (Number.isFinite(priceVal) && priceVal > 0) {
    return fmtFuturesPrice(priceVal);
  }

  if (Number.isFinite(triggerVal) && triggerVal > 0) {
    return fmtFuturesPrice(triggerVal);
  }

  if (rawType === "MARKET") {
    return "Market";
  }

  return priceVal > 0 ? fmtFuturesPrice(priceVal) : "Market";
}

export function getFuturesOrderTriggerText(order) {
  if (!order) return null;
  const rawType = String(order.order_type ?? order.type ?? "").toUpperCase();
  const triggerVal = decNum(
    order.trigger_price ??
    order.triggerPrice ??
    order.stop_price ??
    order.stopPrice
  );
  const limitVal = decNum(order.price ?? order.order_price);

  const tp = decNum(order.take_profit);
  const sl = decNum(order.stop_loss);
  if (Number.isFinite(tp) || Number.isFinite(sl)) {
    const parts = [];
    if (Number.isFinite(tp) && tp > 0) parts.push(`TP ${fmtFuturesPrice(tp)}`);
    if (Number.isFinite(sl) && sl > 0) parts.push(`SL ${fmtFuturesPrice(sl)}`);
    if (parts.length > 0) return parts.join(" · ");
  }

  if ((rawType === "STOP_LIMIT" || rawType === "TAKE_PROFIT_LIMIT") && Number.isFinite(triggerVal) && triggerVal > 0) {
    return `Trigger ${fmtFuturesPrice(triggerVal)}`;
  }
  if (rawType === "CONDITIONAL" && Number.isFinite(triggerVal) && triggerVal > 0) {
    if (Number.isFinite(limitVal) && limitVal > 0) {
      return `Trigger ${fmtFuturesPrice(triggerVal)} · Limit ${fmtFuturesPrice(limitVal)}`;
    }
    return `Trigger ${fmtFuturesPrice(triggerVal)}`;
  }
  if (rawType === "TAKE_PROFIT_MARKET" || rawType === "TAKE_PROFIT") {
    return "TP trigger";
  }
  if (rawType === "STOP_MARKET" || rawType === "STOP") {
    return "SL trigger";
  }
  if (Number.isFinite(triggerVal) && triggerVal > 0) {
    return `Trigger ${fmtFuturesPrice(triggerVal)}`;
  }
  return null;
}



export function getLeverageOptions(maxLeverage) {
  const max = Math.max(1, Number(maxLeverage) || 125);
  let milestones = [];
  if (max <= 10) {
    milestones = [1, 2, 3, 5, 10];
  } else if (max <= 20) {
    milestones = [2, 3, 5, 10, 15, 20];
  } else if (max <= 50) {
    milestones = [5, 10, 15, 20, 25, 50];
  } else if (max <= 75) {
    milestones = [5, 10, 20, 25, 50, 75];
  } else if (max <= 100) {
    milestones = [5, 10, 20, 50, 75, 100];
  } else if (max <= 125) {
    milestones = [5, 10, 20, 50, 75, 100, 125];
  } else {
    milestones = [5, 10, 20, 50, 75, 100, 125, 150];
  }
  const filtered = milestones.filter((m) => m <= max);
  if (!filtered.includes(max)) filtered.push(max);
  filtered.sort((a, b) => a - b);
  return filtered;
}
