import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const POSITIVE_PATTERNS = [
  [1, 2, 4, 3, 5, 6, 5, 8, 7, 9],
  [2, 3, 4, 4, 6, 5, 7, 8, 8, 9],
  [1, 2, 2, 3, 4, 3, 5, 6, 7, 8],
  [1, 3, 2, 5, 4, 7, 6, 8, 7, 9],
];

const NEGATIVE_PATTERNS = [
  [9, 8, 7, 5, 6, 4, 3, 4, 2, 1],
  [8, 9, 7, 6, 5, 4, 5, 3, 2, 1],
  [7, 6, 7, 5, 4, 5, 3, 2, 3, 1],
  [9, 7, 8, 6, 5, 5, 3, 4, 2, 1],
];

export const MiniChart = ({
  data,
  isPositive = true,
  seed = 0,
  width = 80,
  height = 25,
}) => {
  const color = isPositive ? '#00C853' : '#FF3B30';

  const chartData = React.useMemo(() => {
    if (Array.isArray(data) && data.length >= 2) {
      const valid = data.map(Number).filter(Number.isFinite);
      if (valid.length >= 2) return valid;
    }
    const numSeed =
      typeof seed === 'number'
        ? seed
        : String(seed)
            .split('')
            .reduce((acc, c) => acc + c.charCodeAt(0), 0);

    const patterns = isPositive ? POSITIVE_PATTERNS : NEGATIVE_PATTERNS;
    return patterns[Math.abs(numSeed) % patterns.length];
  }, [data, isPositive, seed]);

  const generatePath = () => {
    if (!chartData || chartData.length === 0) return '';
    const max = Math.max(...chartData);
    const min = Math.min(...chartData);
    const range = max - min || 1;

    const padY = 2;
    const drawH = height - padY * 2;

    const points = chartData.map((value, index) => {
      const x = (index / (chartData.length - 1)) * width;
      const y = height - padY - ((value - min) / range) * drawH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `M ${points.join(' L ')}`;
  };

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Path
          d={generatePath()}
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MiniChart;
