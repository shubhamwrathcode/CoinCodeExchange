/**
 * User-facing copy for futures order validation and API errors.
 * Keep messages in sentence case; preserve symbols (BTC, USDT, etc.).
 */

/** Map raw API / server messages to clear trading copy. */
export function formatFuturesApiError(message) {
    const raw = String(message ?? "").trim();
    if (!raw) return "Unable to complete your request. Please try again.";

    const lower = raw.toLowerCase();

    if (
        lower.includes("not usdt") ||
        lower.includes("enter quantity in") ||
        (lower.includes("too large") && lower.includes("quantity"))
    ) {
        return "Order size exceeds the maximum allowed. Reduce your amount or lower leverage.";
    }
    if (lower.includes("order size is too large") || lower.includes("order size too large")) {
        return "Order size exceeds the maximum allowed at your current leverage.";
    }
    if (lower.includes("insufficient margin") || lower.includes("insufficient balance")) {
        return "Insufficient margin. Add funds or reduce your order size.";
    }
    if (lower.includes("insufficient funds")) {
        return "Insufficient available balance for this order.";
    }
    if (lower.includes("minimum quantity") || lower.includes("min_order_qty")) {
        return "Order size is below the contract minimum.";
    }
    if (lower.includes("maximum quantity") || lower.includes("max_order_qty")) {
        return "Order size exceeds the contract maximum.";
    }
    if (lower.includes("step size") || lower.includes("step_size")) {
        return "Order size does not match the required increment.";
    }
    if (lower.includes("min_notional") || lower.includes("minimum order value")) {
        return "Order value is below the minimum notional requirement.";
    }

    return raw;
}

export function futuresErrSelectPair() {
    return "Select a contract before placing an order.";
}

export function futuresErrOrderType() {
    return "Only Limit, Market, and Conditional orders are supported.";
}

export function futuresErrInvalidSize() {
    return "Please enter a valid order size.";
}

export function futuresErrPriceForValue() {
    return "Enter a price so your order value can be converted to quantity.";
}

export function futuresErrValueTooSmall(minQty, base) {
    const b = base || "BTC";
    return `Order value is too small. Minimum size is ${minQty} ${b}.`;
}

export function futuresErrLeverageRange() {
    return "Leverage must be between 1× and 125×.";
}

export function futuresErrLeverageMax(symbol, maxLev) {
    return `Maximum leverage for ${symbol} is ${maxLev}×.`;
}

export function futuresErrReduceOnlyConflict() {
    return "Reduce-only and close-position cannot be used together.";
}

export function futuresErrIocFokReduceOnly() {
    return "IOC and FOK are not available with reduce-only orders.";
}

export function futuresErrPostOnlyLimit() {
    return "Post-only is only available for limit orders.";
}

export function futuresErrStepSize(step, base) {
    const b = base || "BTC";
    return `Order size must be in increments of ${step} ${b}.`;
}

export function futuresErrMinSize(minQty, base) {
    const b = base || "BTC";
    return `Order size is too small. Minimum is ${minQty} ${b}.`;
}

export function futuresErrMaxSize(maxQty, base) {
    const b = base || "BTC";
    return `Order size exceeds the maximum of ${maxQty} ${b}.`;
}

export function futuresErrInvalidLimitPrice() {
    return "Please enter a valid limit price.";
}

export function futuresErrPriceTick(tick, quote) {
    const q = quote || "USDT";
    return `Price must be in increments of ${tick} ${q}.`;
}

export function futuresErrMinNotional(min, quote) {
    const q = quote || "USDT";
    return `Minimum order value is ${min} ${q}.`;
}

export function futuresErrInvalidTrigger() {
    return "Please enter a valid trigger price.";
}

export function futuresErrTriggerTick(tick, quote) {
    const q = quote || "USDT";
    return `Trigger price must be in increments of ${tick} ${q}.`;
}

export function futuresErrOrderPriceTick(tick, quote) {
    const q = quote || "USDT";
    return `Order price must be in increments of ${tick} ${q}.`;
}

export function futuresErrTpBuy() {
    return "Take-profit must be above the mark price for buy orders.";
}

export function futuresErrTpSell() {
    return "Take-profit must be below the mark price for sell orders.";
}

export function futuresErrSlBuy() {
    return "Stop-loss must be below the mark price for buy orders.";
}

export function futuresErrSlSell() {
    return "Stop-loss must be above the mark price for sell orders.";
}

export function futuresErrInvalidPosition() {
    return "Unable to close this position. Please refresh and try again.";
}

export function futuresErrInvalidPositionSize() {
    return "Position size is invalid. Please refresh and try again.";
}

export function futuresErrCloseQtyRange(maxQty, base) {
    const b = base || "BTC";
    return `Close quantity must be between 0 and ${maxQty} ${b}.`;
}

export function futuresErrGeneric() {
    return "Something went wrong. Please try again.";
}

export function futuresErrInsufficientMargin() {
    return "Insufficient margin. Add funds or reduce your order size.";
}
