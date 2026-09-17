import React, { useMemo, useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import Svg, { Circle, Line, Rect, Polyline, Text as SvgText } from "react-native-svg";
import { AppText, DISCLAIMTEXT, FOURTEEN, SEMI_BOLD, TWELVE } from "../../shared";

const BASE_CHART_W = 520;
const CHART_H = 252;
const AXIS_FONT_SIZE = 15;
const MIN_X_LABEL_GAP = 54;

const CHART_COLORS = {
  grid: "#EAECEF",
  axis: "#707A8A",
  zero: "#B7BDC6",
  barPos: "#2EBD85",
  barNeg: "#F6465D",
  barCum: "#F0B90B",
  line: "#F0B90B",
  legendBar: "#D1AA67",
};

function num(v) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function fmtAxis(n, suffix = "") {
  if (!Number.isFinite(n)) return `0${suffix}`;
  const abs = Math.abs(n);
  const s = abs >= 100 ? abs.toFixed(0) : abs.toFixed(abs >= 10 ? 1 : 2);
  return `${n < 0 ? "-" : ""}${s}${suffix}`;
}

function fmtDateLabel(dateStr) {
  if (!dateStr) return "";
  const parts = String(dateStr).split("-");
  if (parts.length >= 3) return `${parts[1]}-${parts[2]}`;
  return dateStr;
}

/** Same label cadence as web OptionsPnlCharts. */
function shouldShowXLabel(index, total) {
  if (total <= 10) return true;
  const step = Math.ceil(total / 8);
  return index % step === 0 || index === total - 1;
}

function getXLabelStep(total) {
  if (total <= 10) return 1;
  return Math.ceil(total / 8);
}

function getXLabelYPositions(bars) {
  const positions = new Map();
  let lastCx = null;
  let useAltRow = false;

  bars.forEach((b, i) => {
    if (!shouldShowXLabel(i, bars.length)) return;
    let y = CHART_H - 10;
    if (lastCx != null && b.cx - lastCx < MIN_X_LABEL_GAP * 0.9) {
      y = useAltRow ? CHART_H - 10 : CHART_H - 26;
      useAltRow = !useAltRow;
    } else {
      useAltRow = false;
    }
    positions.set(i, y);
    lastCx = b.cx;
  });

  return positions;
}

/** Widen chart when tail labels (e.g. 07-05 + 07-07) would crowd on mobile. */
function resolveChartWidth(pointCount, padL, padR) {
  if (pointCount <= 1) return BASE_CHART_W;
  const labelStep = getXLabelStep(pointCount);
  const slotForStep = MIN_X_LABEL_GAP / labelStep;
  const prevLabelIdx = Math.floor((pointCount - 1) / labelStep) * labelStep;
  const tailGap = (pointCount - 1) - prevLabelIdx;
  const slotForTail = tailGap > 0 && tailGap < labelStep ? MIN_X_LABEL_GAP / tailGap : 0;
  const slotW = Math.max(14, slotForStep, slotForTail);
  return Math.max(BASE_CHART_W, padL + padR + pointCount * slotW);
}

function ChartWrap({ chartW, children }) {
  const [containerW, setContainerW] = useState(0);
  const svgW =
    containerW > 0
      ? chartW > BASE_CHART_W
        ? Math.round(containerW * (chartW / BASE_CHART_W))
        : containerW
      : 0;
  const svgH = svgW > 0 ? svgW * (CHART_H / chartW) : 0;
  const scrollable = svgW > containerW + 1;

  const svg = svgW > 0 ? (
    <Svg width={svgW} height={svgH} viewBox={`0 0 ${chartW} ${CHART_H}`}>
      {children}
    </Svg>
  ) : null;

  return (
    <View
      style={styles.chartWrap}
      onLayout={(e) => {
        const next = Math.floor(e.nativeEvent.layout.width);
        if (next > 0 && next !== containerW) setContainerW(next);
      }}
    >
      {scrollable ? (
        <ScrollView
          horizontal
          nestedScrollEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chartScroll}
        >
          {svg}
        </ScrollView>
      ) : (
        svg
      )}
    </View>
  );
}

function chartPalette(isDark, themeColors) {
  return {
    grid: themeColors?.border || CHART_COLORS.grid,
    axis: isDark ? "#FFFFFF" : CHART_COLORS.axis,
    zero: isDark ? (themeColors?.border || "#3b4659") : CHART_COLORS.zero,
  };
}

export function OptionsDailyPnlChart({ data = [], title = "Daily Account PNL", themeColors, isDark = false }) {
  const palette = chartPalette(isDark, themeColors);
  const gridColor = palette.grid;
  const pad = { t: 18, r: 14, b: 38, l: 48 };

  const series = useMemo(
    () => (Array.isArray(data) ? data.map((d) => ({ date: d.date, value: num(d.value) })) : []),
    [data]
  );

  const chartW = useMemo(() => resolveChartWidth(series.length, pad.l, pad.r), [series.length, pad.l, pad.r]);
  const innerW = chartW - pad.l - pad.r;
  const innerH = CHART_H - pad.t - pad.b;

  const { minY, maxY, bars, yTicks, zeroY } = useMemo(() => {
    if (!series.length) {
      return { minY: -1, maxY: 1, bars: [], yTicks: [-1, -0.5, 0, 0.5, 1], zeroY: pad.t + innerH / 2 };
    }
    const vals = series.map((s) => s.value);
    let min = Math.min(0, ...vals);
    let max = Math.max(0, ...vals);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const span = max - min || 1;
    const zero = pad.t + ((max - 0) / span) * innerH;
    const step = series.length > 1 ? innerW / series.length : innerW;
    const barW = Math.max(4, Math.min(24, step * 0.55));
    const mapped = series.map((s, i) => {
      const x = pad.l + i * step + (step - barW) / 2;
      const yVal = pad.t + ((max - s.value) / span) * innerH;
      const y0 = zero;
      const top = Math.min(yVal, y0);
      const height = Math.max(2, Math.abs(yVal - y0));
      return { ...s, x, y: top, w: barW, h: height, cx: x + barW / 2 };
    });
    const ticks = [max, max / 2, 0, min / 2, min].filter((v, i, arr) => arr.indexOf(v) === i);
    return { minY: min, maxY: max, bars: mapped, yTicks: ticks, zeroY: zero };
  }, [series, innerH, innerW, pad.l, pad.t]);

  const xLabelY = useMemo(() => getXLabelYPositions(bars), [bars]);

  const titleColor = isDark ? "#FFFFFF" : (themeColors?.text || "#000000");
  const secondaryTextColor = isDark ? "#FFFFFF" : (themeColors?.secondaryText || "#888888");

  if (!series.length) {
    return (
      <View style={{ marginTop: 12 }}>
        <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: titleColor }}>{title}</AppText>
        <AppText type={TWELVE} style={{ marginTop: 20, textAlign: "center", color: secondaryTextColor }}>No chart data</AppText>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 12 }}>
      <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: titleColor }}>{title}</AppText>
      <ChartWrap chartW={chartW}>
        {yTicks.map((tick) => {
          const y = pad.t + ((maxY - tick) / (maxY - minY || 1)) * innerH;
          return (
            <React.Fragment key={`y-${tick}`}>
              <Line x1={pad.l} y1={y} x2={chartW - pad.r} y2={y} stroke={gridColor} strokeWidth={1} />
              <SvgText x={pad.l - 8} y={y + 5} fontSize={AXIS_FONT_SIZE} fill={palette.axis} textAnchor="end">
                {fmtAxis(tick)}
              </SvgText>
            </React.Fragment>
          );
        })}
        <Line x1={pad.l} y1={zeroY} x2={chartW - pad.r} y2={zeroY} stroke={palette.zero} strokeWidth={1} />
        {bars.map((b) => (
          <Rect
            key={b.date}
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            fill={b.value >= 0 ? CHART_COLORS.barPos : CHART_COLORS.barNeg}
          />
        ))}
        {bars.map((b, i) =>
          shouldShowXLabel(i, bars.length) ? (
            <SvgText
              key={`${b.date}-x`}
              x={b.cx}
              y={xLabelY.get(i) ?? CHART_H - 10}
              fontSize={AXIS_FONT_SIZE}
              fill={palette.axis}
              textAnchor="middle"
            >
              {fmtDateLabel(b.date)}
            </SvgText>
          ) : null
        )}
      </ChartWrap>
    </View>
  );
}

export function OptionsCumulativePnlChart({ usdtData = [], pctData = [], title = "Cumulative PNL %", themeColors, isDark = false }) {
  const palette = chartPalette(isDark, themeColors);
  const gridColor = palette.grid;
  const pad = { t: 18, r: 52, b: 38, l: 48 };

  const usdt = useMemo(
    () => (Array.isArray(usdtData) ? usdtData.map((d) => ({ date: d.date, value: num(d.value) })) : []),
    [usdtData]
  );
  const pct = useMemo(
    () => (Array.isArray(pctData) ? pctData.map((d) => ({ date: d.date, value: num(d.value) })) : []),
    [pctData]
  );
  const dates = usdt.length ? usdt.map((d) => d.date) : pct.map((d) => d.date);

  const chartW = useMemo(() => resolveChartWidth(dates.length, pad.l, pad.r), [dates.length, pad.l, pad.r]);
  const innerW = chartW - pad.l - pad.r;
  const innerH = CHART_H - pad.t - pad.b;

  const chart = useMemo(() => {
    if (!dates.length) {
      return { bars: [], line: "", pctLinePts: [], yTicks: [0], pctTicks: [0], minY: 0, maxY: 1, minP: 0, maxP: 1 };
    }
    const uVals = dates.map((_, i) => usdt[i]?.value ?? 0);
    const pVals = dates.map((_, i) => pct[i]?.value ?? 0);
    let min = Math.min(0, ...uVals);
    let max = Math.max(0, ...uVals);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    let minP = Math.min(0, ...pVals);
    let maxP = Math.max(0, ...pVals);
    if (minP === maxP) {
      minP -= 1;
      maxP += 1;
    }
    const span = max - min || 1;
    const spanP = maxP - minP || 1;
    const step = dates.length > 1 ? innerW / dates.length : innerW;
    const barW = Math.max(4, Math.min(24, step * 0.55));
    const bars = dates.map((date, i) => {
      const value = uVals[i];
      const x = pad.l + i * step + (step - barW) / 2;
      const yVal = pad.t + ((max - value) / span) * innerH;
      const y0 = pad.t + ((max - 0) / span) * innerH;
      const top = Math.min(yVal, y0);
      const height = Math.max(2, Math.abs(yVal - y0));
      return { date, value, pct: pVals[i], x, y: top, w: barW, h: height, cx: x + barW / 2 };
    });
    const linePts = bars
      .map((_, i) => {
        const p = pVals[i];
        const y = pad.t + ((maxP - p) / spanP) * innerH;
        const x = pad.l + i * step + step / 2;
        return `${x},${y}`;
      })
      .join(" ");
    const pctLinePts = bars.map((b, i) => {
      const p = pVals[i];
      const y = pad.t + ((maxP - p) / spanP) * innerH;
      const x = pad.l + i * step + step / 2;
      return { x, y, date: b.date };
    });
    return {
      bars,
      line: linePts,
      pctLinePts,
      yTicks: [max, max / 2, 0, min / 2, min],
      pctTicks: [maxP, maxP / 2, 0, minP / 2, minP],
      minY: min,
      maxY: max,
      minP,
      maxP,
    };
  }, [dates, usdt, pct, innerH, innerW, pad.l, pad.t]);

  const xLabelY = useMemo(() => getXLabelYPositions(chart.bars), [chart.bars]);

  const titleColor = isDark ? "#FFFFFF" : (themeColors?.text || "#000000");
  const secondaryTextColor = isDark ? "#FFFFFF" : (themeColors?.secondaryText || "#888888");

  if (!dates.length) {
    return (
      <View style={{ marginTop: 12 }}>
        <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: titleColor }}>{title}</AppText>
        <AppText type={TWELVE} style={{ marginTop: 20, textAlign: "center", color: secondaryTextColor }}>No chart data</AppText>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 12 }}>
      <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: titleColor }}>{title}</AppText>
      <ChartWrap chartW={chartW}>
        {chart.yTicks.map((tick) => {
          const y = pad.t + ((chart.maxY - tick) / (chart.maxY - chart.minY || 1)) * innerH;
          return (
            <React.Fragment key={`y-${tick}`}>
              <Line x1={pad.l} y1={y} x2={chartW - pad.r} y2={y} stroke={gridColor} strokeWidth={1} />
              <SvgText x={pad.l - 8} y={y + 5} fontSize={AXIS_FONT_SIZE} fill={palette.axis} textAnchor="end">
                {fmtAxis(tick)}
              </SvgText>
            </React.Fragment>
          );
        })}
        {chart.pctTicks.map((tick) => {
          const y = pad.t + ((chart.maxP - tick) / (chart.maxP - chart.minP || 1)) * innerH;
          return (
            <SvgText key={`p-${tick}`} x={chartW - 8} y={y + 5} fontSize={AXIS_FONT_SIZE} fill={palette.axis} textAnchor="end">
              {fmtAxis(tick, "%")}
            </SvgText>
          );
        })}
        {chart.bars.map((b) => (
          <Rect
            key={b.date}
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            fill={CHART_COLORS.barCum}
            opacity={0.85}
          />
        ))}
        {chart.line ? (
          <Polyline points={chart.line} fill="none" stroke={CHART_COLORS.line} strokeWidth={2} />
        ) : null}
        {chart.pctLinePts.map((pt) => (
          <Circle
            key={pt.date}
            cx={pt.x}
            cy={pt.y}
            r={3.5}
            fill={CHART_COLORS.line}
            stroke={isDark ? (themeColors?.background || "#171a20") : "#FFFFFF"}
            strokeWidth={1}
          />
        ))}
        {chart.bars.map((b, i) =>
          shouldShowXLabel(i, chart.bars.length) ? (
            <SvgText
              key={`${b.date}-x`}
              x={b.cx}
              y={xLabelY.get(i) ?? CHART_H - 10}
              fontSize={AXIS_FONT_SIZE}
              fill={palette.axis}
              textAnchor="middle"
            >
              {fmtDateLabel(b.date)}
            </SvgText>
          ) : null
        )}
      </ChartWrap>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBar, { backgroundColor: CHART_COLORS.legendBar }]} />
          <AppText type={FOURTEEN} style={{ color: secondaryTextColor }}>Cumulative PNL</AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendLineWrap}>
            <View style={[styles.legendLine, { borderTopColor: CHART_COLORS.legendBar }]} />
          </View>
          <AppText type={FOURTEEN} style={{ color: secondaryTextColor }}>Cumulative PNL %</AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrap: {
    width: "100%",
    marginTop: 8,
  },
  chartScroll: {
    flexGrow: 1,
    paddingRight: 4,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    marginTop: 8,
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendBar: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendLineWrap: {
    width: 16,
    height: 12,
    justifyContent: "center",
  },
  legendLine: {
    width: 16,
    borderTopWidth: 2,
  },
});
