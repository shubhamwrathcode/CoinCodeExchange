import React from "react";
import { View } from "react-native";
import Svg, { Path, Circle, Text as SvgText } from "react-native-svg";

function fmtGaugeNum(v, dp = 2) {
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(dp);
}

/** SVG arc gauge — same visual as Cross Margin Account / web trade page. */
export default function CrossMarginLevelGauge({
  level,
  mmr = 1.1,
  warningRate = 1.15,
  isDark = false,
}) {
  const isNum = Number.isFinite(level);
  const MIN = 1.0;
  const MAX = 3.0;
  const pct = isNum ? Math.min(1, Math.max(0, (level - MIN) / (MAX - MIN))) : 0;

  const cx = 56;
  const cy = 56;
  const r = 44;
  const strokeW = 8;
  const startAngle = 210;
  const sweep = 120;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const arcPt = (deg) => ({
    x: cx + r * Math.cos(toRad(deg)),
    y: cy + r * Math.sin(toRad(deg)),
  });
  const describeArc = (startDeg, endDeg) => {
    const s = arcPt(startDeg);
    const e = arcPt(endDeg);
    const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const endAngle = startAngle + sweep * pct;
  const track = isDark ? "#C8C8CC" : "#e5e7eb";
  const color = !isNum
    ? track
    : level < mmr
      ? "#e45561"
      : level < warningRate
        ? "#f59e0b"
        : "#01bc8d";

  return (
    <View style={{ alignItems: "center", justifyContent: "flex-start", width: 112, height: 64 }}>
      <Svg width={112} height={64} viewBox="0 8 112 64">
        <Path
          d={describeArc(startAngle, startAngle + sweep)}
          fill="none"
          stroke={track}
          strokeWidth={strokeW}
          strokeLinecap="round"
        />
        {isNum && pct > 0 && (
          <Path d={describeArc(startAngle, endAngle)} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
        )}
        {isNum && (
          <Circle cx={arcPt(endAngle).x} cy={arcPt(endAngle).y} r={strokeW / 2 + 1} fill={color} />
        )}
        <SvgText x={cx} y={cy + 10} textAnchor="middle" fontSize={18} fontWeight="700" fill={color}>
          {isNum ? fmtGaugeNum(level) : "—"}
        </SvgText>
      </Svg>
    </View>
  );
}
