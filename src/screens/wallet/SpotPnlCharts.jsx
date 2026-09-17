import React, { useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import Svg, { Circle, Line, Rect, Polyline, Path, G, Text as SvgText } from "react-native-svg";
import { AppText, FOURTEEN, SEMI_BOLD, TWELVE } from "../../shared";

const BASE_CHART_W = 520;
const CHART_H = 252;
const AXIS_FONT_SIZE = 15;
const MIN_X_LABEL_GAP = 54;

const CHART_COLORS = {
  grid: "#2b313a",
  axis: "#707A8A",
  zero: "#3b4659",
  barPos: "#2EBD85",
  barNeg: "#F6465D",
  barCum: "#F0B90B",
  line: "#F0B90B",
  legendBar: "#D1AA67",
};

const DONUT_COLORS = [
  "#F0B90B",
  "#F8D33A",
  "#D1AA67",
  "#E5B80B",
  "#F3BA2F",
  "#2EBD85",
  "#3861FB",
  "#8884d8",
];

function num(v) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function fmtDailyAxis(n) {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${n < 0 ? "-" : ""}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1000) return `${n < 0 ? "-" : ""}${(abs / 1000).toFixed(1)}k`;
  const s = abs >= 100 ? abs.toFixed(0) : abs >= 10 ? abs.toFixed(1) : abs.toFixed(2);
  return `${n < 0 ? "-" : ""}${s}`;
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
    if (lastCx !== null && b.cx - lastCx < MIN_X_LABEL_GAP) {
      useAltRow = !useAltRow;
      y = useAltRow ? CHART_H - 2 : CHART_H - 14;
    } else {
      useAltRow = false;
    }
    lastCx = b.cx;
    positions.set(i, y);
  });

  return positions;
}

function resolveChartWidth(dataLength, padL, padR) {
  const step = getXLabelStep(dataLength);
  const visibleCount = Math.ceil(dataLength / step) + 1;
  const minNeeded = padL + padR + visibleCount * MIN_X_LABEL_GAP;
  return Math.max(BASE_CHART_W, minNeeded);
}

function ChartWrap({ chartW, children }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator
      nestedScrollEnabled
      style={styles.chartScroll}
      contentContainerStyle={{ minWidth: "100%" }}
    >
      <Svg width={chartW} height={CHART_H}>
        {children}
      </Svg>
    </ScrollView>
  );
}

function chartPalette(isDark, themeColors) {
  return {
    grid: isDark ? "#2b313a" : (themeColors?.border || "#EAECEF"),
    axis: isDark ? "#FFFFFF" : CHART_COLORS.axis,
    zero: isDark ? "#3b4659" : CHART_COLORS.zero,
  };
}

/** 1. Daily PNL Bar Chart */
export function SpotDailyPnlChart({ data = [], title = "Daily PNL", themeColors, isDark = false }) {
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
      <View style={{ marginTop: 16 }}>
        <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: titleColor }}>{title}</AppText>
        <AppText type={TWELVE} style={{ marginTop: 20, textAlign: "center", color: secondaryTextColor }}>No chart data</AppText>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 16 }}>
      <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: titleColor }}>{title}</AppText>
      <ChartWrap chartW={chartW}>
        {yTicks.map((tick) => {
          const y = pad.t + ((maxY - tick) / (maxY - minY || 1)) * innerH;
          return (
            <React.Fragment key={`y-${tick}`}>
              <Line x1={pad.l} y1={y} x2={chartW - pad.r} y2={y} stroke={gridColor} strokeWidth={1} />
              <SvgText x={pad.l - 8} y={y + 5} fontSize={AXIS_FONT_SIZE} fill={palette.axis} textAnchor="end">
                {fmtDailyAxis(tick)}
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

/** 2. Cumulative PNL % Dual-Axis Chart */
export function SpotCumulativePnlChart({
  usdtData = [],
  pctData = [],
  title = "Cumulative PNL %",
  themeColors,
  isDark = false,
}) {
  const palette = chartPalette(isDark, themeColors);
  const gridColor = palette.grid;
  const pad = { t: 18, r: 48, b: 38, l: 48 };

  const dates = useMemo(() => {
    const d1 = Array.isArray(usdtData) ? usdtData.map((d) => d.date) : [];
    const d2 = Array.isArray(pctData) ? pctData.map((d) => d.date) : [];
    return Array.from(new Set([...d1, ...d2])).filter(Boolean);
  }, [usdtData, pctData]);

  const usdt = useMemo(() => {
    const map = new Map((usdtData || []).map((d) => [d.date, num(d.value)]));
    return dates.map((d) => map.get(d) ?? 0);
  }, [dates, usdtData]);

  const pct = useMemo(() => {
    const map = new Map((pctData || []).map((d) => [d.date, num(d.value)]));
    return dates.map((d) => map.get(d) ?? 0);
  }, [dates, pctData]);

  const chartW = useMemo(() => resolveChartWidth(dates.length, pad.l, pad.r), [dates.length, pad.l, pad.r]);
  const innerW = chartW - pad.l - pad.r;
  const innerH = CHART_H - pad.t - pad.b;

  const chart = useMemo(() => {
    if (!dates.length) {
      return {
        bars: [],
        line: "",
        pctLinePts: [],
        minY: -1,
        maxY: 1,
        minP: -1,
        maxP: 1,
        yTicks: [-1, 0, 1],
        pctTicks: [-1, 0, 1],
      };
    }
    let minY = Math.min(0, ...usdt);
    let maxY = Math.max(0, ...usdt);
    if (minY === maxY) {
      minY -= 1;
      maxY += 1;
    }
    const spanY = maxY - minY || 1;

    let minP = Math.min(0, ...pct);
    let maxP = Math.max(0, ...pct);
    if (minP === maxP) {
      minP -= 1;
      maxP += 1;
    }
    const spanP = maxP - minP || 1;

    const step = dates.length > 1 ? innerW / dates.length : innerW;
    const barW = Math.max(4, Math.min(22, step * 0.5));
    const zeroY = pad.t + ((maxY - 0) / spanY) * innerH;

    const bars = dates.map((date, i) => {
      const x = pad.l + i * step + (step - barW) / 2;
      const yVal = pad.t + ((maxY - usdt[i]) / spanY) * innerH;
      const top = Math.min(yVal, zeroY);
      const h = Math.max(2, Math.abs(yVal - zeroY));
      return { date, x, y: top, w: barW, h, cx: x + barW / 2 };
    });

    const pts = dates.map((date, i) => {
      const cx = pad.l + i * step + step / 2;
      const cy = pad.t + ((maxP - pct[i]) / spanP) * innerH;
      return { date, x: cx, y: cy };
    });

    const line = pts.map((p) => `${p.x},${p.y}`).join(" ");
    const yTicks = [maxY, maxY / 2, 0, minY / 2, minY].filter((v, i, arr) => arr.indexOf(v) === i);
    const pctTicks = [maxP, maxP / 2, 0, minP / 2, minP].filter((v, i, arr) => arr.indexOf(v) === i);

    return {
      bars,
      line,
      pctLinePts: pts,
      minY,
      maxY,
      minP,
      maxP,
      yTicks,
      pctTicks,
    };
  }, [dates, usdt, pct, innerH, innerW, pad.l, pad.t]);

  const xLabelY = useMemo(() => getXLabelYPositions(chart.bars), [chart.bars]);
  const titleColor = isDark ? "#FFFFFF" : (themeColors?.text || "#000000");
  const secondaryTextColor = isDark ? "#FFFFFF" : (themeColors?.secondaryText || "#888888");

  if (!dates.length) {
    return (
      <View style={{ marginTop: 16 }}>
        <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: titleColor }}>{title}</AppText>
        <AppText type={TWELVE} style={{ marginTop: 20, textAlign: "center", color: secondaryTextColor }}>No chart data</AppText>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 16 }}>
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
            fill="#FFFFFF"
            stroke={CHART_COLORS.line}
            strokeWidth={1.5}
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

/** 3. Asset Allocation Donut Chart */
export function SpotAssetAllocationChart({ data = [], title = "Asset Allocation", themeColors, isDark = false }) {
  const titleColor = isDark ? "#FFFFFF" : (themeColors?.text || "#000000");
  const secondaryTextColor = isDark ? "#FFFFFF" : (themeColors?.secondaryText || "#888888");

  const slices = useMemo(() => {
    const items = (Array.isArray(data) ? data : [])
      .map((d) => ({
        asset: d.asset || "—",
        value: num(d.value_usdt ?? d.pct),
        pct: num(d.pct),
      }))
      .filter((d) => d.value > 0 || d.pct > 0);
    const total = items.reduce((s, d) => s + (d.pct > 0 ? d.pct : d.value), 0);
    if (!total) return [];
    return items.map((item, i) => ({
      ...item,
      share: item.pct > 0 ? item.pct : (item.value / total) * 100,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    }));
  }, [data]);

  const arcs = useMemo(() => {
    if (!slices.length) return [];
    let angle = -90;
    const cx = 90;
    const cy = 90;
    const r = 68;
    const ir = 44;
    return slices.map((slice) => {
      if (slices.length === 1 || slice.share >= 99.99) {
        const d = `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} M ${cx} ${cy - ir} A ${ir} ${ir} 0 1 0 ${cx} ${cy + ir} A ${ir} ${ir} 0 1 0 ${cx} ${cy - ir} Z`;
        return { ...slice, d };
      }
      const sweep = Math.min(359.9, (slice.share / 100) * 360);
      const start = angle;
      const end = angle + sweep;
      angle = end;
      const toRad = (deg) => (deg * Math.PI) / 180;
      const x1 = cx + r * Math.cos(toRad(start));
      const y1 = cy + r * Math.sin(toRad(start));
      const x2 = cx + r * Math.cos(toRad(end));
      const y2 = cy + r * Math.sin(toRad(end));
      const xi1 = cx + ir * Math.cos(toRad(end));
      const yi1 = cy + ir * Math.sin(toRad(end));
      const xi2 = cx + ir * Math.cos(toRad(start));
      const yi2 = cy + ir * Math.sin(toRad(start));
      const large = sweep > 180 ? 1 : 0;
      const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi1} ${yi1} A ${ir} ${ir} 0 ${large} 0 ${xi2} ${yi2} Z`;
      return { ...slice, d };
    });
  }, [slices]);

  if (!slices.length) {
    return (
      <View style={{ marginTop: 16 }}>
        <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: titleColor }}>{title}</AppText>
        <AppText type={TWELVE} style={{ marginTop: 20, textAlign: "center", color: secondaryTextColor }}>
          No asset allocation data available
        </AppText>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 16 }}>
      <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: titleColor }}>{title}</AppText>
      <View style={styles.donutContainer}>
        <View style={styles.donutSvgWrap}>
          <Svg width={180} height={180} viewBox="0 0 180 180">
            <G>
              {arcs.map((arc, i) => (
                <Path key={`${arc.asset}-${i}`} d={arc.d} fill={arc.color} />
              ))}
            </G>
          </Svg>
        </View>

        <View style={styles.donutLegend}>
          {slices.map((slice, i) => (
            <View key={`${slice.asset}-${i}`} style={styles.donutLegendItem}>
              <View style={[styles.donutColorDot, { backgroundColor: slice.color }]} />
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: titleColor, flex: 1, marginLeft: 8 }}>
                {slice.asset}
              </AppText>
              <AppText type={FOURTEEN} style={{ color: secondaryTextColor }}>
                {slice.share.toFixed(2)}%
              </AppText>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartScroll: {
    marginTop: 8,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    marginTop: 10,
    paddingBottom: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendBar: {
    width: 14,
    height: 10,
    borderRadius: 2,
  },
  legendLineWrap: {
    width: 18,
    height: 10,
    justifyContent: "center",
  },
  legendLine: {
    width: "100%",
    borderTopWidth: 2,
  },
  donutContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginTop: 12,
    flexWrap: "wrap",
    gap: 16,
  },
  donutSvgWrap: {
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  donutLegend: {
    flex: 1,
    minWidth: 150,
    justifyContent: "center",
    gap: 10,
  },
  donutLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  donutColorDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
