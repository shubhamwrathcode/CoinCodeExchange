/** Spot PnL Analysis — query builders + response normalizers (GET spot/v1/me/pnl/analysis). */

import moment from "moment";

export const SPOT_PNL_PERIODS = ["7d", "30d", "90d"];
export const SPOT_PNL_PERIOD_DEFAULT = "30d";
export const SPOT_PNL_DETAILS_LIMIT_DEFAULT = 30;
export const SPOT_PNL_DETAILS_LIMIT_MAX = 90;

export function toUtcDateInput(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d);
  const y = x.getUTCFullYear();
  const m = String(x.getUTCMonth() + 1).padStart(2, "0");
  const day = String(x.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function spotPnlPeriodRange(period = SPOT_PNL_PERIOD_DEFAULT) {
  const to = new Date();
  const from = new Date(to);
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  from.setUTCDate(from.getUTCDate() - (days - 1));
  return {
    from: toUtcDateInput(from),
    to: toUtcDateInput(to),
    period,
  };
}

export function normalizeSpotPnlDateRange(from, to) {
  if (!from || !to || from <= to) return { from, to };
  return { from: to, to: from };
}

export function parseSpotPnlValue(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "object" && raw !== null && "$numberDecimal" in raw) {
    const n = parseFloat(raw.$numberDecimal);
    return Number.isFinite(n) ? n : null;
  }
  const n = typeof raw === "number" ? raw : parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

export function normalizeSpotPnlSummary(data) {
  if (!data || typeof data !== "object") return null;
  return {
    realizedPnl: parseSpotPnlValue(data.realized_pnl_usdt),
    unrealizedPnl: parseSpotPnlValue(data.unrealized_pnl_usdt),
    totalPnl: parseSpotPnlValue(data.total_pnl_usdt),
    assets: Array.isArray(data.assets) ? data.assets : [],
  };
}

export function formatSpotPnlUpdatedAt(iso) {
  if (iso == null || iso === "") return "";
  let m;
  if (typeof iso === "number") {
    const ms = iso < 1e12 ? iso * 1000 : iso;
    m = moment.utc(ms);
  } else {
    const raw = String(iso).trim();
    if (!raw) return "";
    const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw);
    if (hasTz) {
      m = moment.utc(raw);
    } else {
      const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
      m = moment.utc(`${normalized}Z`);
    }
  }
  if (!m.isValid()) return "";
  return m.format("DD/MM/YYYY, HH:mm:ss");
}

function normalizeSpotPnlCard(card) {
  if (!card || typeof card !== "object") {
    return { pnl_usdt: "0", pnl_pct: "0" };
  }
  return {
    pnl_usdt: card.pnl_usdt ?? card.pnl ?? "0",
    pnl_pct: card.pnl_pct ?? card.pnl_percent ?? "0",
  };
}

function normalizeChartSeries(list) {
  return Array.isArray(list)
    ? list.map((d) => ({
      date: d.date,
      value: d.value ?? d.amount ?? d.pnl ?? "0",
    }))
    : [];
}

export function normalizeAssetAllocation(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => ({
    asset: item.asset ?? item.symbol ?? item.currency ?? "—",
    quantity: item.quantity ?? null,
    value_usdt: parseSpotPnlValue(item.value_usdt ?? item.usdt_value ?? item.value) ?? 0,
    pct: parseSpotPnlValue(item.allocation_pct ?? item.pct ?? item.percent) ?? 0,
  }));
}

export function normalizeSpotPnlAnalysisData(data) {
  if (!data || typeof data !== "object") return null;
  const cards = data.summary_cards || {};
  const balance = data.estimated_balance || {};
  const today = normalizeSpotPnlCard(cards.today ?? cards.daily);
  const assetAllocation = normalizeAssetAllocation(data.asset_allocation);

  return {
    updated_at: data.updated_at ?? null,
    from: data.from ?? null,
    to: data.to ?? null,
    valuation_asset: data.valuation_asset ?? "USDT",
    estimated_balance: {
      btc: balance.btc ?? null,
      usdt: balance.usdt ?? null,
      btc_usdt_price: balance.btc_usdt_price ?? null,
    },
    summary_cards: {
      today,
      daily: today,
      "7d": normalizeSpotPnlCard(cards["7d"]),
      "30d": normalizeSpotPnlCard(cards["30d"]),
    },
    range_summary: {
      total_profit: data.range_summary?.total_profit ?? "0",
      total_loss: data.range_summary?.total_loss ?? "0",
      net_pnl: data.range_summary?.net_pnl ?? "0",
      win_rate_pct: data.range_summary?.win_rate_pct ?? "0",
      winning_days: data.range_summary?.winning_days ?? 0,
      losing_days: data.range_summary?.losing_days ?? 0,
      breakeven_days: data.range_summary?.breakeven_days ?? 0,
    },
    asset_allocation: assetAllocation,
    series: Array.isArray(data.series) ? data.series : [],
    chart: {
      daily_pnl: normalizeChartSeries(data.chart?.daily_pnl),
      daily_account_pnl: normalizeChartSeries(data.chart?.daily_pnl ?? data.chart?.daily_account_pnl),
      cumulative_pnl_usdt: normalizeChartSeries(data.chart?.cumulative_pnl_usdt),
      cumulative_pnl_pct: normalizeChartSeries(data.chart?.cumulative_pnl_pct),
      asset_net_worth: normalizeChartSeries(data.chart?.asset_net_worth),
    },
    meta: data.meta ?? null,
  };
}

export function normalizeSpotPnlDetailsData(data, pagination) {
  const rows = Array.isArray(data?.rows)
    ? data.rows
    : Array.isArray(data?.series)
      ? data.series
      : [];
  return {
    updated_at: data?.updated_at ?? null,
    from: data?.from ?? null,
    to: data?.to ?? null,
    rows,
    pagination: {
      page: pagination?.page ?? 1,
      limit: pagination?.limit ?? SPOT_PNL_DETAILS_LIMIT_DEFAULT,
      total: pagination?.total ?? rows.length,
      total_pages: pagination?.pages ?? pagination?.total_pages ?? 1,
    },
  };
}

export function buildSpotPnlFallbackAnalysis({ pnl24h, pnl7d, pnl30d, portfolio } = {}) {
  const equity = parseSpotPnlValue(
    portfolio?.estimated_usdt ?? portfolio?.estimatedUsdt ?? portfolio?.dollarPrice ?? portfolio?.dollar_price
  ) ?? 0;

  const toCard = (data) => {
    const summary = normalizeSpotPnlSummary(data);
    const pnl = summary?.totalPnl ?? summary?.realizedPnl ?? 0;
    const pct = equity > 0 ? (pnl / equity) * 100 : 0;
    return {
      pnl_usdt: String(pnl ?? 0),
      pnl_pct: pct.toFixed(2),
    };
  };

  const today = toCard(pnl24h);

  return normalizeSpotPnlAnalysisData({
    updated_at: new Date().toISOString(),
    estimated_balance: { usdt: String(equity) },
    summary_cards: {
      today,
      daily: today,
      "7d": toCard(pnl7d),
      "30d": toCard(pnl30d),
    },
    range_summary: {
      total_profit: "0",
      total_loss: toCard(pnl7d).pnl_usdt,
      net_pnl: toCard(pnl7d).pnl_usdt,
      win_rate_pct: "0",
      winning_days: 0,
      losing_days: 0,
      breakeven_days: 0,
    },
    asset_allocation: normalizeAssetAllocation(
      pnl30d?.assets ?? pnl7d?.assets ?? pnl24h?.assets ?? []
    ),
    series: [],
    chart: {
      daily_pnl: [],
      cumulative_pnl_usdt: [],
      cumulative_pnl_pct: [],
      asset_net_worth: [],
    },
  });
}

export function paginateSpotPnlSeries(series, page = 1, limit = SPOT_PNL_DETAILS_LIMIT_DEFAULT) {
  const rows = [...(Array.isArray(series) ? series : [])].reverse();
  const total = rows.length;
  const limitNum = Math.min(
    SPOT_PNL_DETAILS_LIMIT_MAX,
    Math.max(1, parseInt(limit, 10) || SPOT_PNL_DETAILS_LIMIT_DEFAULT)
  );
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const totalPages = Math.max(1, Math.ceil(total / limitNum));
  const safePage = Math.min(pageNum, totalPages);
  const skip = (safePage - 1) * limitNum;
  return {
    rows: rows.slice(skip, skip + limitNum),
    pagination: {
      page: safePage,
      limit: limitNum,
      total,
      total_pages: totalPages,
    },
  };
}
