import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Dimensions, Animated } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { colors } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";

const { width } = Dimensions.get("window");
const SIDE_SPACE = 12;
const ITEM_WIDTH = width / 2 - SIDE_SPACE - 6;
const SHIMMER_STRIP_WIDTH_DEFAULT = 80;

const ShimmerBox = ({ width: w, height, borderRadius = 10, style }) => {
  const { colors: themeColors, isDark } = useTheme();
  const stripW = SHIMMER_STRIP_WIDTH_DEFAULT;
  const shimmerX = useRef(new Animated.Value(-stripW)).current;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    shimmerX.setValue(-stripW);
    const run = () => {
      if (!mounted.current) return;
      shimmerX.setValue(-stripW);
      const toVal = Math.max(w, 1) + stripW;
      Animated.timing(shimmerX, {
        toValue: toVal,
        duration: 1100,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (mounted.current && finished) run();
      });
    };
    const t = setTimeout(run, 50);
    return () => {
      mounted.current = false;
      clearTimeout(t);
      shimmerX.stopAnimation();
    };
  }, [shimmerX, w]);

  const boneColor = themeColors.themeElevationColor;
  const shimmerColors = isDark 
    ? ["transparent", "rgba(255,255,255,0.16)", "transparent"]
    : ["transparent", "rgba(0,0,0,0.05)", "transparent"];

  return (
    <View style={[{ width: w, height, borderRadius, overflow: "hidden", backgroundColor: boneColor }, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          { position: "absolute", top: 0, bottom: 0, width: stripW, left: 0 },
          { transform: [{ translateX: shimmerX }] },
        ]}
      >
        <LinearGradient
          colors={shimmerColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, width: stripW }}
        />
      </Animated.View>
    </View>
  );
};

const CoinSliderSkeleton = () => {
  const { colors: themeColors } = useTheme();
  const cards = [0, 1, 2];
  return (
    <View style={{ paddingHorizontal: SIDE_SPACE }}>
      <View style={styles.row}>
        {cards.map((i) => (
          <View key={i} style={styles.cardWrapper}>
            <View style={[styles.card, { backgroundColor: themeColors.themeElevationColor }]}>
              <ShimmerBox width={40} height={40} borderRadius={20} style={styles.icon} />
              <View style={styles.textBlock}>
                <ShimmerBox width={ITEM_WIDTH * 0.6} height={12} borderRadius={6} style={styles.line} />
                <ShimmerBox width={ITEM_WIDTH * 0.4} height={10} borderRadius={5} style={[styles.line, { marginTop: 6 }]} />
                <ShimmerBox width={ITEM_WIDTH * 0.3} height={10} borderRadius={5} style={[styles.line, { marginTop: 6 }]} />
              </View>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.dotContainer}>
        {[0, 1, 2].map((i) => (
          <ShimmerBox key={i} width={8} height={8} borderRadius={4} style={styles.dot} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  cardWrapper: {
    width: ITEM_WIDTH,
    marginHorizontal: 5,
  },
  card: {
    backgroundColor: colors.themeElevationColor,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 10,
  },
  textBlock: {
    flex: 1,
  },
  line: {
    marginRight: 10,
  },
  dotContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  dot: {
    marginHorizontal: 3,
  },
});

export default CoinSliderSkeleton;

