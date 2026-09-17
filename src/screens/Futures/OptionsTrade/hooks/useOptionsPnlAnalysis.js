import { useCallback, useEffect, useMemo, useState } from "react";
import { appOperation } from "../../../../appOperation";
import {
  normalizeOptionsPnlAnalysisData,
  normalizeOptionsPnlDateRange,
  OPTIONS_PNL_DETAILS_LIMIT_DEFAULT,
  OPTIONS_PNL_PERIOD_DEFAULT,
  optionsPnlPeriodRange,
  paginateOptionsPnlSeries,
} from "../helpers/optionsPnlQuery";

export default function useOptionsPnlAnalysis({ enabled = true } = {}) {
  const initialRange = optionsPnlPeriodRange(OPTIONS_PNL_PERIOD_DEFAULT);
  const [period, setPeriod] = useState(OPTIONS_PNL_PERIOD_DEFAULT);
  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);
  const [analysis, setAnalysis] = useState(null);
  const [detailsPage, setDetailsPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const applyPeriod = useCallback((nextPeriod) => {
    const range = optionsPnlPeriodRange(nextPeriod);
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

  const fetchAnalysis = useCallback(async () => {
    if (!enabled) return;
    const { from, to } = normalizeOptionsPnlDateRange(dateFrom, dateTo);
    setLoading(true);
    setError(null);
    try {
      const res = await appOperation.customer.optionsPnlAnalysis({
        from,
        to,
        period: from && to ? null : period,
      });
      if (!res?.success) {
        setAnalysis(null);
        setError(res?.message || res?.error?.message || "Failed to load PnL analysis.");
        return;
      }
      const normalized = normalizeOptionsPnlAnalysisData(res.data);
      setAnalysis(normalized);
      if (normalized?.from) setDateFrom(normalized.from);
      if (normalized?.to) setDateTo(normalized.to);
    } catch {
      setAnalysis(null);
      setError("Failed to load PnL analysis.");
    } finally {
      setLoading(false);
    }
  }, [enabled, dateFrom, dateTo, period]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const detailsSlice = useMemo(
    () => paginateOptionsPnlSeries(analysis?.series, detailsPage, OPTIONS_PNL_DETAILS_LIMIT_DEFAULT),
    [analysis?.series, detailsPage]
  );

  return {
    period,
    dateFrom,
    dateTo,
    analysis,
    detailsRows: detailsSlice.rows,
    detailsPagination: detailsSlice.pagination,
    detailsPage,
    loading,
    error,
    applyPeriod,
    setCustomRange,
    setDetailsPage,
    refetch: fetchAnalysis,
  };
}
