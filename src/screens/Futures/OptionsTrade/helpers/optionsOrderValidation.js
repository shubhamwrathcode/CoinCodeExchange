import { computeOptionsPositionAvailable, decNum, decStr } from "./optionsDataHelpers";

export const OPTIONS_ORDER_SIDES = ["BUY", "SELL"];
export const OPTIONS_ORDER_TYPES = ["LIMIT", "MARKET"];
export const OPTIONS_TIME_IN_FORCE = ["GTC", "IOC", "FOK", "POST_ONLY"];

const TRADEABLE_STATUSES = new Set(["ACTIVE", "EXPIRING"]);
export const INSUFFICIENT_FUNDS_MSG = "Insufficient funds";

function isReduceOnlyFlag(value) {
  return value === true || String(value || "").toLowerCase() === "true";
}

/**
 * Reduce-only: requires open position on symbol, opposite close side,
 * and total close qty (pending + new) must not exceed position size.
 * @returns {string|null} Error message
 */
export function getReduceOnlyValidationError({
  symbol,
  side,
  quantity,
  stepSize,
  position,
  openOrders,
}) {
  const sym = String(symbol || "").trim().toUpperCase();
  const sideUp = String(side || "").toUpperCase();
  const posQty = decNum(position?.quantity);
  const posSide = String(position?.side || "").toUpperCase();
  const posSymbol = String(position?.symbol || "").toUpperCase();

  if (!position || posQty <= 0 || posSymbol !== sym) {
    return "No open position for this contract.";
  }

  const closeSide = posSide === "LONG" ? "SELL" : posSide === "SHORT" ? "BUY" : null;
  if (!closeSide || sideUp !== closeSide) {
    return "Reduce-only must use the opposite side to your position.";
  }

  const normQty = floorToIncrement(quantity, stepSize);
  if (normQty <= 0) return null;

  const available = computeOptionsPositionAvailable(position, openOrders);
  if (normQty > available + 1e-8) {
    if (available <= 0) {
      return "Open orders have reserved the full position size.";
    }
    return `Reduce-only size exceeds available position (${formatOrderDecimal(available, stepSize)}).`;
  }

  return null;
}

function decimalPlaces(step) {
  const s = decStr(step);
  if (!s.includes(".")) return 0;
  const trimmed = s.replace(/0+$/, "").replace(/\.$/, "");
  const dot = trimmed.indexOf(".");
  return dot >= 0 ? trimmed.length - dot - 1 : 0;
}

export function getContractTickSize(contract) {
  const raw = decStr(contract?.tick_size);
  return raw && decNum(raw) > 0 ? raw : "0.01";
}

export function getContractStepSize(contract) {
  const raw = decStr(contract?.step_size);
  return raw && decNum(raw) > 0 ? raw : "0.01";
}

/** Prefer explicit prop, then contract field, then fallback. */
export function resolveIncrementSize(propValue, contract, contractField, fallback = "0.01") {
  const direct = decStr(propValue);
  if (direct && decNum(direct) > 0) return direct;
  const fromContract = decStr(contract?.[contractField]);
  if (fromContract && decNum(fromContract) > 0) return fromContract;
  return fallback;
}

export function hasConfiguredIncrement(propValue, contract, contractField) {
  const direct = decStr(propValue);
  if (direct && decNum(direct) > 0) return true;
  const fromContract = decStr(contract?.[contractField]);
  return Boolean(fromContract && decNum(fromContract) > 0);
}

export function getContractMaxBuyPrice(contract) {
  const raw = decStr(contract?.max_buy_price);
  const n = decNum(raw);
  return raw && n > 0 ? raw : null;
}

export function getContractMinSellPrice(contract) {
  const raw = decStr(contract?.min_sell_price);
  const n = decNum(raw);
  return raw && n > 0 ? raw : null;
}

/** Fee rates from contract row, falling back to market_overview.fee_rates. */
export function resolveContractFeeRates(contract, overviewFeeRates) {
  const overview = overviewFeeRates && typeof overviewFeeRates === "object" ? overviewFeeRates : {};
  if (!contract) return Object.keys(overview).length ? overview : null;

  const merged = {
    fee_basis: contract.fee_basis ?? overview.fee_basis ?? "INDEX",
    maker_fee_rate: contract.maker_fee_rate ?? overview.maker_fee_rate,
    taker_fee_rate: contract.taker_fee_rate ?? overview.taker_fee_rate,
    transaction_fee_rate:
      contract.transaction_fee_rate
      ?? contract.taker_fee_rate
      ?? overview.transaction_fee_rate
      ?? overview.taker_fee_rate,
    exercise_fee_rate: contract.exercise_fee_rate ?? overview.exercise_fee_rate,
    liquidation_fee_rate: contract.liquidation_fee_rate ?? overview.liquidation_fee_rate,
  };

  return merged;
}

/**
 * max_buy_price / min_sell_price with mark × 1.8 / × 0.2 fallback (doc Order price limits).
 */
export function resolvePriceBandLimits(contract, tickSizeOverride) {
  if (!contract) return { maxBuy: null, minSell: null };

  const tick = resolveIncrementSize(tickSizeOverride, contract, "tick_size");
  const mark = decNum(contract.mark_price);

  let maxBuy = getContractMaxBuyPrice(contract);
  let minSell = getContractMinSellPrice(contract);

  if (!maxBuy && mark > 0) {
    const floored = floorToIncrement(mark * 1.8, tick);
    maxBuy = floored > 0 ? formatOrderDecimal(floored, tick) : null;
  }
  if (!minSell && mark > 0) {
    const floored = floorToIncrement(mark * 0.2, tick);
    minSell = floored > 0 ? formatOrderDecimal(floored, tick) : null;
  }

  return { maxBuy, minSell };
}

/** Display limit price in error messages (preserve backend precision). */
export function formatPriceBandLimit(value, tickSize) {
  const raw = decStr(value);
  if (raw) return raw;
  return formatOrderDecimal(value, tickSize);
}

/**
 * Binance-style price band check for limit orders.
 * @returns {string|null} Error message or null if in range / no band configured.
 */
export function getOptionsPriceBandError(price, side, contract, tickSize) {
  const p = decNum(price);
  if (p <= 0 || !contract) return null;

  const sideUp = String(side || "").toUpperCase();
  const tick = resolveIncrementSize(tickSize, contract, "tick_size");
  const { maxBuy, minSell } = resolvePriceBandLimits(contract, tick);

  if (sideUp === "BUY") {
    if (maxBuy != null && p > decNum(maxBuy) + 1e-8) {
      return `Order buy price cannot be higher than ${formatPriceBandLimit(maxBuy, tick)}`;
    }
  }

  if (sideUp === "SELL") {
    if (minSell != null && p < decNum(minSell) - 1e-8) {
      return `Order sell price cannot be lower than ${formatPriceBandLimit(minSell, tick)}`;
    }
  }

  return null;
}

/** True when value is a positive multiple of increment (e.g. tick_size / step_size). */
export function isAlignedToIncrement(value, increment) {
  const v = decNum(value);
  const inc = decNum(increment);
  if (!Number.isFinite(v) || v <= 0) return false;
  if (!Number.isFinite(inc) || inc <= 0) return true;
  const ratio = v / inc;
  return Math.abs(ratio - Math.round(ratio)) < 1e-8;
}

/** Floor value to contract step/tick (matches backend floorToIncrement). */
export function floorToIncrement(value, increment) {
  const v = decNum(value);
  const inc = decNum(increment);
  if (!Number.isFinite(v) || v <= 0) return 0;
  if (!Number.isFinite(inc) || inc <= 0) return v;
  const floored = Math.floor(v / inc + 1e-12) * inc;
  const dp = decimalPlaces(increment);
  return dp > 0 ? parseFloat(floored.toFixed(dp)) : floored;
}

export function formatOrderDecimal(value, increment) {
  const n = decNum(value);
  if (!Number.isFinite(n)) return "";
  const dp = Math.max(decimalPlaces(increment), 0);
  if (dp === 0) {
    return String(Math.trunc(n));
  }
  const fixed = n.toFixed(dp);
  return fixed.replace(/(\.[0-9]*?)0+$/, "$1").replace(/\.$/, "") || "0";
}

/** Max fractional digits allowed while typing (e.g. tick 5 → 0, step 0.01 → 2). */
export function getIncrementDecimalPlaces(increment) {
  return Math.max(decimalPlaces(increment), 0);
}

/** True while typing — rejects extra decimal digits instead of trimming after entry. */
export function isValidIncrementInput(raw, increment) {
  const s = String(raw ?? "").replace(/[^\d.]/g, "");
  const maxDp = getIncrementDecimalPlaces(increment);
  if (maxDp === 0) {
    return /^\d*$/.test(s);
  }
  if ((s.match(/\./g) || []).length > 1) return false;
  return new RegExp(`^\\d*\\.?\\d{0,${maxDp}}$`).test(s);
}

/** Restrict live input to valid characters and decimal precision for tick/step. */
export function sanitizeIncrementInput(raw, increment) {
  let s = String(raw ?? "").replace(/[^\d.]/g, "");
  const maxDp = getIncrementDecimalPlaces(increment);

  const dotIdx = s.indexOf(".");
  if (dotIdx >= 0) {
    const intPart = s.slice(0, dotIdx);
    const fracPart = s.slice(dotIdx + 1).replace(/\./g, "");
    if (maxDp === 0) return intPart;
    s = `${intPart}.${fracPart.slice(0, maxDp)}`;
  }

  return s;
}

/** Floor to tick/step and format for display (e.g. 992 + tick 5 → "990"). */
export function snapToIncrementInput(raw, increment) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  const floored = floorToIncrement(trimmed, increment);
  if (floored <= 0) return "";
  return formatOrderDecimal(floored, increment);
}

/** USDT locked for order reserve (MARKET uses 1.001 buffer per API doc). */
export function computeOrderReserveUsdt(price, quantity, orderType = "LIMIT") {
  const p = decNum(price);
  const q = decNum(quantity);
  if (p <= 0 || q <= 0) return 0;
  const base = p * q;
  return String(orderType || "").toUpperCase() === "MARKET" ? base * 1.001 : base;
}

/** Pending buy/sell remaining qty on one symbol (open orders). */
export function pendingQuantitiesForSymbol(openOrders, symbol) {
  let pendingBuyQty = 0;
  let pendingSellQty = 0;
  const sym = String(symbol || "").toUpperCase();
  for (const o of openOrders || []) {
    if (String(o.symbol || "").toUpperCase() !== sym) continue;
    const rem = decNum(o.remaining_quantity);
    if (String(o.side || "").toUpperCase() === "BUY") pendingBuyQty += rem;
    else if (String(o.side || "").toUpperCase() === "SELL") pendingSellQty += rem;
  }
  return { pendingBuyQty, pendingSellQty };
}

/**
 * Effective signed exposure → scenario label.
 * @see OPTIONS_ORDER_COST_GUIDE.md Step 7
 */
export function resolveOrderScenario({ side, position, pendingBuyQty = 0, pendingSellQty = 0 }) {
  let signed = 0;
  if (position?.side === "LONG") signed = decNum(position.quantity);
  if (position?.side === "SHORT") signed = -decNum(position.quantity);
  signed += decNum(pendingBuyQty) - decNum(pendingSellQty);

  const sideUp = String(side || "").toUpperCase();
  if (sideUp === "BUY") {
    if (signed < 0) return "CLOSE_SHORT";
    if (signed > 0) return "ADD_LONG";
    return "OPEN_LONG";
  }
  if (sideUp === "SELL") {
    if (signed > 0) return "CLOSE_LONG";
    if (signed < 0) return "ADD_SHORT";
    return "OPEN_SHORT";
  }
  return null;
}

/** Transaction fee from index notional (not premium). */
export function computeOptionsTransactionFee({ indexPrice, quantity, contractSize = 1, takerFeeRate }) {
  const n = decNum(indexPrice) * decNum(quantity) * (decNum(contractSize) || 1);
  return n * (decNum(takerFeeRate) / 100);
}

/** Writer margin per contract (OPEN_SHORT / ADD_SHORT). */
export function computeWriterMarginPerContract({
  indexPrice,
  markPrice,
  strike,
  optionType,
  contractSize = 1,
}) {
  const idx = decNum(indexPrice);
  const mark = decNum(markPrice);
  const k = decNum(strike);
  const cs = decNum(contractSize) || 1;
  const typeUp = String(optionType || "").toUpperCase();
  const otm = typeUp === "CALL" ? Math.max(0, k - idx) : Math.max(0, idx - k);
  const floor = 0.1 * idx * cs;
  const riskAdj = Math.max(0.15 * idx - otm, 0.05 * idx);
  return Math.max(floor, mark + riskAdj);
}

/**
 * Client-side order cost preview (server `cost_estimate` wins on submit).
 * @see OPTIONS_ORDER_COST_GUIDE.md
 */
export function estimateOptionsOrderCost({
  side,
  price,
  quantity,
  orderType = "LIMIT",
  indexPrice,
  markPrice,
  strike,
  optionType,
  contractSize = 1,
  takerFeeRate,
  feeRates,
  position = null,
  pendingBuyQty = 0,
  pendingSellQty = 0,
  openOrders,
  symbol,
}) {
  const qty = decNum(quantity);
  const p = decNum(price);
  if (qty <= 0 || p <= 0) return null;

  const rates = feeRates || {};
  const txRate = decNum(
    takerFeeRate ?? rates.taker_fee_rate ?? rates.transaction_fee_rate ?? 0
  );
  const cs = decNum(contractSize) || 1;

  let buyPending = pendingBuyQty;
  let sellPending = pendingSellQty;
  if (openOrders && symbol) {
    const pending = pendingQuantitiesForSymbol(openOrders, symbol);
    buyPending = pending.pendingBuyQty;
    sellPending = pending.pendingSellQty;
  }

  const scenario = resolveOrderScenario({
    side,
    position,
    pendingBuyQty: buyPending,
    pendingSellQty: sellPending,
  });

  const typeUp = String(orderType || "LIMIT").toUpperCase();
  const marketBuffer = typeUp === "MARKET" ? 1.001 : 1;
  const premium = p * qty * marketBuffer;
  const idx = decNum(indexPrice);
  const indexNotional = idx > 0 ? idx * qty * cs : 0;
  const estimatedTransactionFee = computeOptionsTransactionFee({
    indexPrice: idx,
    quantity: qty,
    contractSize: cs,
    takerFeeRate: txRate,
  });

  const markForMargin = decNum(markPrice) > 0 ? decNum(markPrice) : p;

  switch (scenario) {
    case "OPEN_LONG":
    case "ADD_LONG":
    case "CLOSE_SHORT":
      return {
        scenario,
        premium,
        writer_margin: 0,
        index_notional: indexNotional,
        estimated_transaction_fee: estimatedTransactionFee,
        total_estimated_cost: premium + estimatedTransactionFee,
        transaction_fee_rate: txRate,
        exercise_fee_rate: decNum(rates.exercise_fee_rate),
        liquidation_fee_rate: decNum(rates.liquidation_fee_rate),
        fee_basis: rates.fee_basis || "INDEX",
      };

    case "OPEN_SHORT":
    case "ADD_SHORT": {
      const perContract = computeWriterMarginPerContract({
        indexPrice: idx,
        markPrice: markForMargin,
        strike,
        optionType,
        contractSize: cs,
      });
      const writerMargin = perContract * qty;
      return {
        scenario,
        premium,
        writer_margin: writerMargin,
        index_notional: indexNotional,
        estimated_transaction_fee: estimatedTransactionFee,
        total_estimated_cost: writerMargin + estimatedTransactionFee,
        transaction_fee_rate: txRate,
        exercise_fee_rate: decNum(rates.exercise_fee_rate),
        liquidation_fee_rate: decNum(rates.liquidation_fee_rate),
        fee_basis: rates.fee_basis || "INDEX",
      };
    }

    case "CLOSE_LONG":
      return {
        scenario,
        premium: 0,
        writer_margin: 0,
        index_notional: indexNotional,
        estimated_transaction_fee: estimatedTransactionFee,
        total_estimated_cost: 0,
        transaction_fee_rate: txRate,
        exercise_fee_rate: decNum(rates.exercise_fee_rate),
        liquidation_fee_rate: decNum(rates.liquidation_fee_rate),
        fee_basis: rates.fee_basis || "INDEX",
      };

    default:
      return null;
  }
}

/** Max quantity affordable from available balance (or position size when closing long). */
export function maxAffordableOptionsQuantity({
  availableBalance,
  price,
  stepSize,
  side,
  orderType = "LIMIT",
  indexPrice,
  markPrice,
  strike,
  optionType,
  contractSize = 1,
  takerFeeRate,
  feeRates,
  position = null,
  openOrders,
  symbol,
}) {
  const avbl = decNum(availableBalance);
  const step = decStr(stepSize);
  const stepNum = decNum(step);
  const p = decNum(price);
  if (stepNum <= 0 || p <= 0) return 0;

  const costForStep = estimateOptionsOrderCost({
    side,
    price: p,
    quantity: stepNum,
    orderType,
    indexPrice,
    markPrice,
    strike,
    optionType,
    contractSize,
    takerFeeRate,
    feeRates,
    position,
    openOrders,
    symbol,
  });

  if (costForStep?.scenario === "CLOSE_LONG") {
    const longQty = position?.side === "LONG" ? decNum(position.quantity) : 0;
    return floorToIncrement(longQty, step);
  }

  if (!costForStep || costForStep.total_estimated_cost <= 0) return 0;
  if (avbl <= 0) return 0;

  const maxSteps = Math.floor(avbl / costForStep.total_estimated_cost + 1e-12);
  if (maxSteps <= 0) return 0;
  return floorToIncrement(maxSteps * stepNum, step);
}
/** Display fee rate from market_overview (e.g. 0.024 → "0.0240%"). */
export function formatFeeRateDisplay(rate, fractionDigits = 4) {
  const n = decNum(rate);
  if (!Number.isFinite(n)) return "--";
  return `${n.toFixed(fractionDigits)}%`;
}

/**
 * Client-side validation before POST /v1/options/order.
 * @returns {{ ok: true, payload, normalized } | { ok: false, message, errors }}
 */
export function validateOptionsPlaceOrder({
  symbol,
  side,
  orderType = "LIMIT",
  price,
  quantity,
  timeInForce = "GTC",
  reduceOnly = false,
  availableBalance = 0,
  contract,
  tickSize: tickSizeOverride,
  stepSize: stepSizeOverride,
  indexPrice,
  feeRates,
  position = null,
  openOrders,
}) {
  const errors = [];

  const sym = String(symbol || "").trim().toUpperCase();
  if (!sym) errors.push("Select an option contract.");

  if (!contract) {
    errors.push("Contract details not loaded. Reselect the contract or wait for market data.");
  }

  const sideUp = String(side || "").toUpperCase();
  if (!OPTIONS_ORDER_SIDES.includes(sideUp)) {
    errors.push("Invalid order side.");
  }

  const typeUp = String(orderType || "LIMIT").toUpperCase();
  if (!OPTIONS_ORDER_TYPES.includes(typeUp)) {
    errors.push("Invalid order type.");
  }

  const tif = String(timeInForce || "GTC").toUpperCase();
  if (!OPTIONS_TIME_IN_FORCE.includes(tif)) {
    errors.push("Invalid time in force.");
  }

  if (contract?.status) {
    const st = String(contract.status).toUpperCase();
    if (!TRADEABLE_STATUSES.has(st)) {
      errors.push(`Contract is not tradeable (${contract.status}).`);
    }
  }

  const tick = resolveIncrementSize(tickSizeOverride, contract, "tick_size");
  const step = resolveIncrementSize(stepSizeOverride, contract, "step_size");

  const qtyRaw = decNum(quantity);
  if (qtyRaw <= 0) {
    errors.push(`Amount must be at least ${decStr(step)} contract step.`);
  } else if (!isAlignedToIncrement(quantity, step)) {
    errors.push(`Amount must be in increments of ${decStr(step)}.`);
  }

  const normQty = floorToIncrement(quantity, step);
  if (normQty <= 0 && qtyRaw > 0) {
    errors.push(`Amount must be at least ${decStr(step)} contract step.`);
  }

  let normPrice = null;
  if (typeUp === "LIMIT") {
    if (price == null || String(price).trim() === "") {
      errors.push("Price is required for limit orders.");
    } else {
      const priceRaw = decNum(price);
      if (priceRaw <= 0) {
        errors.push(`Price must be at least ${decStr(tick)} tick size.`);
      } else if (!isAlignedToIncrement(price, tick)) {
        errors.push(`Price must be in increments of ${decStr(tick)}.`);
      } else {
        normPrice = floorToIncrement(price, tick);
        if (normPrice <= 0) {
          errors.push(`Price must be at least ${decStr(tick)} tick size.`);
        } else {
          const bandErr = getOptionsPriceBandError(normPrice, sideUp, contract, tick);
          if (bandErr) errors.push(bandErr);
        }
      }
    }
  }

  const reservePrice = typeUp === "LIMIT" ? normPrice : decNum(price);
  if (typeUp === "MARKET" && reservePrice <= 0) {
    errors.push("No reference price available for market order.");
  }

  let reserve = 0;
  if (normPrice > 0 && normQty > 0) {
    const costEst = estimateOptionsOrderCost({
      side: sideUp,
      price: reservePrice,
      quantity: normQty,
      orderType: typeUp,
      indexPrice,
      markPrice: contract?.mark_price ?? reservePrice,
      strike: contract?.strike,
      optionType: contract?.option_type,
      contractSize: contract?.contract_size ?? "1",
      feeRates,
      position,
      openOrders,
      symbol: sym,
    });
    if (costEst) {
      reserve = costEst.total_estimated_cost;
    } else {
      reserve = computeOrderReserveUsdt(reservePrice, normQty, typeUp);
    }
  }

  const avbl = decNum(availableBalance);
  const insufficientFunds = reserve > avbl + 1e-8;
  if (insufficientFunds) {
    errors.push(INSUFFICIENT_FUNDS_MSG);
  }

  if (isReduceOnlyFlag(reduceOnly)) {
    const reduceErr = getReduceOnlyValidationError({
      symbol: sym,
      side: sideUp,
      quantity: normQty,
      stepSize: step,
      position,
      openOrders,
    });
    if (reduceErr) errors.push(reduceErr);
  }

  if (errors.length > 0) {
    return { ok: false, errors, message: errors[0], insufficientFunds };
  }

  const payload = {
    symbol: sym,
    side: sideUp,
    order_type: typeUp,
    quantity: formatOrderDecimal(normQty, step),
    time_in_force: tif,
  };

  if (typeUp === "LIMIT") {
    payload.price = formatOrderDecimal(normPrice, tick);
  }

  if (isReduceOnlyFlag(reduceOnly)) {
    payload.reduce_only = true;
  }

  return {
    ok: true,
    payload,
    normalized: {
      price: normPrice,
      quantity: normQty,
      reserveUsdt: reserve,
    },
  };
}

/** LONG → SELL close; SHORT → BUY close. */
export function resolveCloseOrderSide(positionSide) {
  return String(positionSide || "").toUpperCase() === "LONG" ? "SELL" : "BUY";
}

/** One-time defaults for close row: mark (snapped to tick) + available size (snapped to step). */
export function buildDefaultClosePositionInputs(position, contractRaw, openOrders) {
  const tickSize = resolveIncrementSize(null, contractRaw, "tick_size");
  const stepSize = resolveIncrementSize(null, contractRaw, "step_size");
  const mark = decNum(position?.mark_price);
  const avg = decNum(position?.avg_price);
  const priceSource = mark > 0 ? mark : avg;
  const price =
    priceSource > 0 ? snapToIncrementInput(String(priceSource), tickSize) : "";
  const avail = computeOptionsPositionAvailable(position, openOrders);
  const qty = avail > 0 ? snapToIncrementInput(String(avail), stepSize) : "";
  return { price, qty, tickSize, stepSize };
}

/** Validate limit close order (tick/step, bands, available size, balance). */
export function validateOptionsClosePosition({
  position,
  price,
  quantity,
  contractRaw,
  openOrders,
  availableBalance = 0,
  indexPrice,
  feeRates,
}) {
  if (!position?.symbol) {
    return { ok: false, message: "Invalid position.", errors: ["Invalid position."] };
  }

  const tickSize = resolveIncrementSize(null, contractRaw, "tick_size");
  const stepSize = resolveIncrementSize(null, contractRaw, "step_size");
  const side = resolveCloseOrderSide(position.side);

  const validation = validateOptionsPlaceOrder({
    symbol: position.symbol,
    side,
    orderType: "LIMIT",
    price,
    quantity,
    timeInForce: "GTC",
    reduceOnly: true,
    availableBalance,
    contract: contractRaw,
    tickSize,
    stepSize,
    indexPrice,
    feeRates,
    position,
    openOrders,
  });

  if (!validation.ok) return validation;

  return validation;
}

export function parseOptionsApiError(res) {
  if (!res) return "Request failed.";
  if (typeof res === "string") {
    return /insufficient balance/i.test(res) ? INSUFFICIENT_FUNDS_MSG : res;
  }
  const raw =
    res?.error?.message
    || res?.message
    || (Array.isArray(res?.error?.details) ? res.error.details.map((d) => d.message).join(", ") : null)
    || "Request failed.";
  return /insufficient balance/i.test(raw) ? INSUFFICIENT_FUNDS_MSG : raw;
}

export function newOptionsIdempotencyKey() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `opt-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
