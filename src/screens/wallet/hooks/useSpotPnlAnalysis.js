import { useCallback, useEffect, useMemo, useState } from "react";
import { appOperation } from "../../../appOperation";
import {
  buildSpotPnlFallbackAnalysis,
  normalizeSpotPnlAnalysisData,
  normalizeSpotPnlDetailsData,
  normalizeSpotPnlDateRange,
  SPOT_PNL_DETAILS_LIMIT_DEFAULT,
  SPOT_PNL_PERIOD_DEFAULT,
  spotPnlPeriodRange,
  paginateSpotPnlSeries,
} from "../helpers/spotPnlQuery";

export default function useSpotPnlAnalysis({ enabled = true } = {}) {
  const initialRange = spotPnlPeriodRange(SPOT_PNL_PERIOD_DEFAULT);
  const [period, setPeriod] = useState(SPOT_PNL_PERIOD_DEFAULT);
  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);
  const [analysis, setAnalysis] = useState(null);
  const [detailsRows, setDetailsRows] = useState([]);
  const [detailsPagination, setDetailsPagination] = useState({ page: 1, total_pages: 1 });
  const [detailsPage, setDetailsPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const applyPeriod = useCallback((nextPeriod) => {
    const range = spotPnlPeriodRange(nextPeriod);
    setPeriod(nextPeriod);
    setDateFrom(range.from);
    setDateTo(range.to);
    setDetailsPage(1);
  }, []);

  const setCustomRange = useCallback((from, to) => {
    setPeriod(null);
    setDetailsPage(1);
    if (from != null) setDateFrom(from);
    if (to != null) setDateTo(to);
  }, []);

  useEffect(() => {
    if (!dateFrom || !dateTo || dateFrom <= dateTo) return;
    setDateFrom(dateTo);
    setDateTo(dateFrom);
  }, [dateFrom, dateTo]);

  const queryParams = useCallback(() => {
    const { from, to } = normalizeSpotPnlDateRange(dateFrom, dateTo);
    const params = {};
    if (from && to) {
      params.from = from;
      params.to = to;
    } else if (period) {
      params.period = period;
    }
    return params;
  }, [dateFrom, dateTo, period]);

  const fetchAnalysis = useCallback(async () => {
    if (!enabled) return;
    const baseParams = queryParams();
    const params = { ...baseParams, include_allocation: 1 };
    setLoading(true);
    setError(null);
    setUsingFallback(false);

    try {
      const res = await appOperation.customer.spotPnlAnalysis(params);

      if (res?.success && res.data) {
        const normalized = normalizeSpotPnlAnalysisData(res.data);
        setAnalysis(normalized);
        if (normalized?.from) setDateFrom(normalized.from);
        if (normalized?.to) setDateTo(normalized.to);
        return;
      }

      // Fallback
      const portfolioRes = await appOperation.customer.user_portfolio("spot").catch(() => null);
      const portfolioData = portfolioRes?.success ? portfolioRes.data : null;

      const [p24, p7, p30] = await Promise.all([
        appOperation.customer.spot_me_pnl({ period: "24h" }).catch(() => null),
        appOperation.customer.spot_me_pnl({ period: "7d" }).catch(() => null),
        appOperation.customer.spot_me_pnl({ period: "30d" }).catch(() => null),
      ]);

      const fallback = buildSpotPnlFallbackAnalysis({
        pnl24h: p24?.success ? p24.data : null,
        pnl7d: p7?.success ? p7.data : null,
        pnl30d: p30?.success ? p30.data : null,
        portfolio: portfolioData,
      });

      setAnalysis(fallback);
      setUsingFallback(true);
      if (!fallback) {
        setError(res?.message || res?.error?.message || "Failed to load spot PnL analysis.");
      }
    } catch {
      // Catch fallback
      try {
        const portfolioRes = await appOperation.customer.user_portfolio("spot").catch(() => null);
        const portfolioData = portfolioRes?.success ? portfolioRes.data : null;
        const [p24, p7, p30] = await Promise.all([
          appOperation.customer.spot_me_pnl({ period: "24h" }).catch(() => null),
          appOperation.customer.spot_me_pnl({ period: "7d" }).catch(() => null),
          appOperation.customer.spot_me_pnl({ period: "30d" }).catch(() => null),
        ]);
        const fallback = buildSpotPnlFallbackAnalysis({
          pnl24h: p24?.success ? p24.data : null,
          pnl7d: p7?.success ? p7.data : null,
          pnl30d: p30?.success ? p30.data : null,
          portfolio: portfolioData,
        });
        setAnalysis(fallback);
        setUsingFallback(true);
      } catch {
        setAnalysis(null);
        setError("Failed to load spot PnL analysis.");
      }
    } finally {
      setLoading(false);
    }
  }, [enabled, queryParams]);

  const fetchDetails = useCallback(async () => {
    if (!enabled || !analysis) return;

    if (usingFallback) {
      const slice = paginateSpotPnlSeries(
        analysis?.series,
        detailsPage,
        SPOT_PNL_DETAILS_LIMIT_DEFAULT
      );
      setDetailsRows(slice.rows);
      setDetailsPagination(slice.pagination);
      return;
    }

    const baseParams = queryParams();
    const params = {
      ...baseParams,
      page: detailsPage,
      limit: SPOT_PNL_DETAILS_LIMIT_DEFAULT,
    };

    setDetailsLoading(true);
    try {
      const res = await appOperation.customer.spotPnlAnalysisDetails(params);

      if (res?.success && res.data) {
        const normalized = normalizeSpotPnlDetailsData(
          res.data,
          res.pagination ?? res.data?.pagination
        );
        setDetailsRows(normalized.rows);
        setDetailsPagination(normalized.pagination);
        return;
      }

      const slice = paginateSpotPnlSeries(
        analysis?.series,
        detailsPage,
        SPOT_PNL_DETAILS_LIMIT_DEFAULT
      );
      setDetailsRows(slice.rows);
      setDetailsPagination(slice.pagination);
    } catch {
      const slice = paginateSpotPnlSeries(
        analysis?.series,
        detailsPage,
        SPOT_PNL_DETAILS_LIMIT_DEFAULT
      );
      setDetailsRows(slice.rows);
      setDetailsPagination(slice.pagination);
    } finally {
      setDetailsLoading(false);
    }
  }, [enabled, analysis, usingFallback, detailsPage, queryParams]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return {
    period,
    dateFrom,
    dateTo,
    analysis,
    detailsRows,
    detailsPagination,
    detailsPage,
    loading,
    detailsLoading,
    error,
    usingFallback,
    applyPeriod,
    setCustomRange,
    setDetailsPage,
    refetch: fetchAnalysis,
  };
}
