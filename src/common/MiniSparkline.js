import React, { useMemo, memo } from "react";
import { View } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";

const getFallbackData = (isPositive, basePrice = 100) => {
  const count = 20;
  const arr = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const trend = isPositive ? 1 + t * 0.015 : 1 - t * 0.02;
    const dip = Math.sin(t * Math.PI) * 0.015;
    arr.push(basePrice * (trend + dip));
  }
  return arr;
};

const MiniSparkline = memo(
  ({
    chartData,
    isPositive,
    width = 80,
    height = 40,
    chartId = "spark",
    fallbackPrice,
  }) => {
    const dataToUse = useMemo(() => {
      if (chartData?.length) return chartData;
      return getFallbackData(isPositive, fallbackPrice ?? 100);
    }, [chartData, isPositive, fallbackPrice]);

    const pathD = useMemo(() => {
      if (!dataToUse?.length) return "";

      const padding = 5;
      const verticalPadding = 8;
      const drawWidth = width - padding * 2;
      const drawHeight = height - verticalPadding * 2;

      const min = Math.min(...dataToUse);
      const max = Math.max(...dataToUse);
      const range = max - min || 1;

      const points = dataToUse.map((price, index) => {
        const x = padding + (index / (dataToUse.length - 1)) * drawWidth;
        const y =
          height -
          verticalPadding -
          ((price - min) / range) * drawHeight;
        return { x, y };
      });

      return points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
        .join(" ");
    }, [dataToUse, width, height]);

    if (!pathD) return null;

    const strokeColor = isPositive ? "#00FF95" : "#FF6B6B";

    return (
      <View style={{ width, height, overflow: "hidden", borderRadius: 12 }}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Path
            d={pathD}
            stroke={strokeColor}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    );
  }
);

export default MiniSparkline;
