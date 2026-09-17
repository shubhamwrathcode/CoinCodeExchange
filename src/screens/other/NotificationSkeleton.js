/**
 * Skeleton for Notification screen. Shown while notification list is loading.
 */
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions, FlatList } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useTheme } from "../../hooks/useTheme";
import { universalPaddingHorizontal } from "../../theme/dimens";

const { width } = Dimensions.get("window");
const PAD = 10;
const CARD_WIDTH = width - PAD * 4;
const SHIMMER_STRIP_WIDTH = 80;

const ShimmerBox = ({ width: w, height, borderRadius = 6, style }) => {
  const { colors: themeColors, isDark } = useTheme();
  const shimmerX = useRef(new Animated.Value(-SHIMMER_STRIP_WIDTH)).current;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    shimmerX.setValue(-SHIMMER_STRIP_WIDTH);
    const run = () => {
      if (!mounted.current) return;
      shimmerX.setValue(-SHIMMER_STRIP_WIDTH);
      const toVal = Math.max(w, 1) + SHIMMER_STRIP_WIDTH;
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
    ? ["transparent", "rgba(255,255,255,0.1)", "transparent"]
    : ["transparent", "rgba(0,0,0,0.05)", "transparent"];

  return (
    <View
      style={[
        { width: w, height, borderRadius, overflow: "hidden", backgroundColor: boneColor },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          { position: "absolute", top: 0, bottom: 0, width: SHIMMER_STRIP_WIDTH, left: 0 },
          { transform: [{ translateX: shimmerX }] },
        ]}
      >
        <LinearGradient
          colors={shimmerColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, width: SHIMMER_STRIP_WIDTH }}
        />
      </Animated.View>
    </View>
  );
};

const NotificationCardSkeleton = () => {
  const { colors: themeColors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
      <View style={styles.cardHeader}>
        <ShimmerBox width={10} height={10} borderRadius={5} />
        <ShimmerBox width={CARD_WIDTH * 0.6} height={14} borderRadius={4} style={{ marginLeft: 8 }} />
      </View>
      <ShimmerBox width={CARD_WIDTH * 0.9} height={12} borderRadius={4} style={{ marginTop: 8 }} />
      <ShimmerBox width={CARD_WIDTH * 0.5} height={12} borderRadius={4} style={{ marginTop: 6 }} />
      <ShimmerBox width={60} height={10} borderRadius={4} style={{ marginTop: 10 }} />
    </View>
  );
};

const NotificationSkeleton = () => {
  const data = [1, 2, 3, 4, 5];
  return (
    <View style={styles.wrap}>
      <FlatList
        data={data}
        keyExtractor={(item) => String(item)}
        renderItem={() => <NotificationCardSkeleton />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  listContent: { flexGrow: 1, paddingBottom: 24 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: PAD,
    paddingVertical: universalPaddingHorizontal,
    marginHorizontal: PAD,
    marginVertical: universalPaddingHorizontal,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export default NotificationSkeleton;
