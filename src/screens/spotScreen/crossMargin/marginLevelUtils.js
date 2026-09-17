export function parseMarginLevel(ml) {
  if (ml == null || ml === "") return null;
  const n = parseFloat(ml);
  return Number.isFinite(n) ? n : null;
}

export function formatMarginLevel(ml) {
  if (ml == null || !Number.isFinite(ml)) return "—";
  if (ml >= 999) return "∞";
  return ml.toFixed(2);
}

export function formatThresholdLevel(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  return parseFloat(n.toFixed(4)).toString();
}

export function parseMarginThresholds(source = {}) {
  const risk = source.risk && typeof source.risk === "object" ? source.risk : {};
  const marginCallLevel = parseMarginLevel(
    source.margin_call_level
    ?? source.marginCallLevel
    ?? risk.margin_call_level
    ?? source.margin_call_margin_level
  );
  const liquidationMarginLevel = parseMarginLevel(
    source.liquidation_margin_level
    ?? source.liquidationMarginLevel
    ?? risk.liquidation_margin_level
    ?? source.liquidation_level
  );
  return { marginCallLevel, liquidationMarginLevel };
}

export function computeInitialMarginLevel(leverage) {
  const L = parseFloat(leverage);
  if (!Number.isFinite(L) || L <= 1) return null;
  return L / (L - 1);
}

export function parseEffectiveMultiple(source = {}) {
  return parseMarginLevel(
    source.effective_multiple
    ?? source.effective_leverage
    ?? source.leverage
    ?? source.default_leverage
    ?? source.max_leverage
  );
}

/** Isolated risk row from margin account / position payload (web `buildMarginRiskRow`). */
export function buildMarginRiskRow(source = {}, pairIdFallback = "") {
  const thresholds = resolveMarginThresholds(source);
  const pairRaw = source.pair ?? source.pairRaw ?? "";
  return {
    ...source,
    pair_id: source.pair_id || pairIdFallback || "",
    pair: pairRaw || source.pair,
    pairRaw: pairRaw || source.pair,
    margin_call_level: source.margin_call_level ?? thresholds.marginCallLevel,
    liquidation_margin_level: source.liquidation_margin_level ?? thresholds.liquidationMarginLevel,
    hasDebt: pairHasDebt(source),
  };
}

export function resolveMarginThresholds(source = {}) {
  const parsed = parseMarginThresholds(source);
  let { marginCallLevel, liquidationMarginLevel } = parsed;

  if (marginCallLevel == null) {
    const warnRate = parseFloat(source.warning_margin_rate ?? source.margin_call_rate);
    if (Number.isFinite(warnRate)) marginCallLevel = 1 + warnRate;
  }
  if (liquidationMarginLevel == null) {
    const maintRate = parseFloat(source.maintenance_margin_rate ?? source.liquidation_margin_rate);
    if (Number.isFinite(maintRate)) liquidationMarginLevel = 1 + maintRate;
  }

  return { marginCallLevel, liquidationMarginLevel };
}

export function getMarginLevelStatus(ml, thresholds = {}, { hasDebt = true } = {}) {
  const { marginCallLevel, liquidationMarginLevel } = resolveMarginThresholds(thresholds);

  if (!hasDebt) {
    return {
      key: "safe",
      label: "Safe",
      color: "#16a34a",
    };
  }

  if (marginCallLevel == null || liquidationMarginLevel == null) {
    return {
      key: "unavailable",
      label: "Unavailable",
      color: "#9ca3af",
    };
  }

  if (ml == null || !Number.isFinite(ml)) {
    return {
      key: "unavailable",
      label: "Unavailable",
      color: "#9ca3af",
    };
  }

  if (ml > marginCallLevel) {
    return {
      key: "normal",
      label: "Normal",
      color: "#16a34a",
    };
  }

  if (ml > liquidationMarginLevel) {
    return {
      key: "margin_call",
      label: "Margin call",
      color: "#f59e0b",
    };
  }

  return {
    key: "liquidated",
    label: "Liquidated",
    color: "#dc2626",
  };
}

export function pairHasDebt(source = {}, ml = null) {
  const baseBorrowed = parseFloat(source.base_borrowed ?? source.borrowedBase ?? 0);
  const quoteBorrowed = parseFloat(source.quote_borrowed ?? source.borrowedQuote ?? 0);
  if (baseBorrowed > 0 || quoteBorrowed > 0) return true;
  const balances = source.balances;
  if (balances) {
    const bb = parseFloat(balances.base_borrowed ?? 0);
    const qb = parseFloat(balances.quote_borrowed ?? 0);
    if (bb > 0 || qb > 0) return true;
  }
  const level = ml != null ? ml : parseMarginLevel(source.margin_level ?? source.marginLevel);
  return level != null && Number.isFinite(level) && level > 0 && level < 999;
}
