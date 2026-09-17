/**
 * Premium skeleton loader that mirrors the CoinList layout.
 * Shown while market socket data is loading on the Home screen.
 */
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Platform, Animated, Dimensions } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { colors } from "../../theme/colors";
import { universalPaddingHorizontal } from "../../theme/dimens";
import { useTheme } from "../../hooks/useTheme";

const ROW_HEIGHT = 40;
const HOME_HORIZONTAL_PADDING = 12;
const SHIMMER_STRIP_WIDTH_DEFAULT = 80;

const ShimmerBox = ({ width, height, borderRadius = 6, style }) => {
  const { colors: themeColors, isDark } = useTheme();
  const stripW = SHIMMER_STRIP_WIDTH_DEFAULT;
  const shimmerX = useRef(new Animated.Value(-stripW)).current;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    shimmerX.setValue(-stripW);
    const loop = () => {
      if (!mounted.current) return;
      shimmerX.setValue(-stripW);
      const toVal = Math.max(width || 0, 1) + stripW;
      Animated.timing(shimmerX, {
        toValue: toVal,
        duration: 1100,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (mounted.current && finished) loop();
      });
    };
    const t = setTimeout(loop, 50);
    return () => {
      mounted.current = false;
      clearTimeout(t);
      shimmerX.stopAnimation();
    };
  }, [shimmerX, width]);

  const boneColor = themeColors.themeElevationColor;
  const shimmerColors = isDark 
    ? ["transparent", "rgba(255,255,255,0.16)", "transparent"]
    : ["transparent", "rgba(0,0,0,0.05)", "transparent"];

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          overflow: "hidden",
          backgroundColor: boneColor,
        },
        style,
      ]}
    >
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

const CoinListSkeleton = () => {
  const { colors: themeColors } = useTheme();
  return (
    <View style={[styles.container, { marginBottom: 50 }]}>
      <View style={[styles.elevatedCard, { backgroundColor: themeColors.themeElevationColor }]}>
        {/* Tabs row: 4 pill placeholders */}
        <View style={styles.tabsRow}>
          {[1, 2, 3, 4].map((i) => (
            <ShimmerBox
              key={i}
              width={Dimensions.get("window").width * 0.18}
              height={32}
              borderRadius={6}
              style={styles.tabPill}
            />
          ))}
        </View>

        {/* Table header */}
        <View style={[styles.tableHeader, { borderBottomColor: themeColors.border }]}>
          <ShimmerBox width={60} height={11} borderRadius={4} />
          <ShimmerBox width={70} height={11} borderRadius={4} style={{ marginLeft: 8 }} />
          <ShimmerBox width={56} height={11} borderRadius={4} style={styles.headerChg} />
        </View>

        {/* 5 skeleton rows matching MarketList row layout */}
        <View style={styles.listWrap}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={[styles.skeletonRow, { borderBottomColor: themeColors.border }]}>
              <View style={styles.nameCol}>
                <View style={styles.nameRow}>
                  <ShimmerBox width={18} height={18} borderRadius={4} />
                  <ShimmerBox width={24} height={24} borderRadius={12} style={{ marginLeft: 5 }} />
                  <View style={styles.nameBlock}>
                    <ShimmerBox width={52} height={12} borderRadius={4} />
                    <ShimmerBox width={40} height={10} borderRadius={4} style={{ marginTop: 4 }} />
                  </View>
                </View>
              </View>
              <View style={styles.priceCol}>
                <ShimmerBox width={48} height={12} borderRadius={4} />
                <ShimmerBox width={36} height={10} borderRadius={4} style={{ marginTop: 4 }} />
              </View>
              <ShimmerBox width={64} height={22} borderRadius={5} style={styles.chgPill} />
            </View>
          ))}
        </View>

        {/* View More row */}
        <View style={styles.viewMoreRow}>
          <ShimmerBox width={70} height={13} borderRadius={4} />
        </View>
      </View>

      {/* Notifications section placeholder (matches HomeCoinList area) */}
      <View style={styles.notifSection}>
        <View style={styles.notifHeader}>
          <ShimmerBox width={100} height={13} borderRadius={4} />
          <ShimmerBox width={32} height={13} borderRadius={4} />
        </View>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.notifRow}>
            <ShimmerBox width={10} height={10} borderRadius={5} />
            <ShimmerBox width={Dimensions.get("window").width * 0.5} height={14} borderRadius={4} style={{ marginLeft: 10 }} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: HOME_HORIZONTAL_PADDING,
    paddingVertical: universalPaddingHorizontal,
  },
  elevatedCard: {
    backgroundColor: colors.themeElevationColor,
    borderRadius: 12,
    padding: 10,
    ...Platform.select({
      android: { elevation: 1.5 },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
    }),
  },
  tabsRow: {
    flexDirection: "row",
    marginTop: 10,
    width: "100%",
    justifyContent: "flex-start",
    gap: 8,
  },
  tabPill: {
    marginRight: 4,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginTop: 6,
    marginBottom: 2,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerChg: {
    marginLeft: 26,
  },
  listWrap: {
    marginTop: 2,
    minHeight: 275,
  },
  skeletonRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    minHeight: ROW_HEIGHT,
  },
  nameCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
    marginLeft: 6,
  },
  priceCol: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  chgPill: {
    marginLeft: 26,
  },
  viewMoreRow: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    marginTop: 8,
  },
  notifSection: {
    marginTop: 16,
    paddingVertical: 10,
  },
  notifHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
});

export default CoinListSkeleton;
