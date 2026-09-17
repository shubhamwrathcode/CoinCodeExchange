/** Options PnL Analysis — query builders + response normalizers (GET options/pnl/analysis). */

import moment from "moment";

export const OPTIONS_PNL_PERIODS = ["7d", "30d", "90d"];
export const OPTIONS_PNL_PERIOD_DEFAULT = "30d";
export const OPTIONS_PNL_DETAILS_LIMIT_DEFAULT = 30;
export const OPTIONS_PNL_DETAILS_LIMIT_MAX = 90;

export function toUtcDateInput(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d);
  const y = x.getUTCFullYear();
  const m = String(x.getUTCMonth() + 1).padStart(2, "0");
  const day = String(x.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function optionsPnlPeriodRange(period = OPTIONS_PNL_PERIOD_DEFAULT) {
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

export function normalizeOptionsPnlDateRange(from, to) {
  if (!from || !to || from <= to) return { from, to };
  return { from: to, to: from };
}

/** API `updated_at` is UTC+0; format without converting to device local time. */
export function formatOptionsPnlUpdatedAt(iso) {
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

export function normalizeOptionsPnlCard(card) {
  if (!card || typeof card !== "object") {
    return { pnl_usdt: "0", pnl_pct: "0" };
  }
  return {
    pnl_usdt: card.pnl_usdt ?? "0",
    pnl_pct: card.pnl_pct ?? "0",
  };
}

export function normalizeOptionsPnlAnalysisData(data) {
  if (!data || typeof data !== "object") return null;
  const cards = data.summary_cards || {};
  return {
    updated_at: data.updated_at ?? null,
    from: data.from ?? null,
    to: data.to ?? null,
    summary_cards: {
      daily: normalizeOptionsPnlCard(cards.daily),
      "7d": normalizeOptionsPnlCard(cards["7d"]),
      "30d": normalizeOptionsPnlCard(cards["30d"]),
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
    series: Array.isArray(data.series) ? data.series : [],
    chart: {
      daily_account_pnl: Array.isArray(data.chart?.daily_account_pnl)
        ? data.chart.daily_account_pnl
        : [],
      cumulative_pnl_usdt: Array.isArray(data.chart?.cumulative_pnl_usdt)
        ? data.chart.cumulative_pnl_usdt
        : [],
      cumulative_pnl_pct: Array.isArray(data.chart?.cumulative_pnl_pct)
        ? data.chart.cumulative_pnl_pct
        : [],
    },
  };
}

export function paginateOptionsPnlSeries(series, page = 1, limit = OPTIONS_PNL_DETAILS_LIMIT_DEFAULT) {
  const rows = [...(Array.isArray(series) ? series : [])].reverse();
  const total = rows.length;
  const limitNum = Math.min(
    OPTIONS_PNL_DETAILS_LIMIT_MAX,
    Math.max(1, parseInt(limit, 10) || OPTIONS_PNL_DETAILS_LIMIT_DEFAULT)
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
