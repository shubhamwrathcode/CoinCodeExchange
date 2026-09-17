/**
 * Skeleton loader for Wallet (WalletNew) screen.
 * Mirrors layout: tabs, Total Equity, WalletMenu, Portfolio cards, list header + rows.
 */
import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { useTheme } from "../../hooks/useTheme";
import { darkTheme } from "../../theme/colors";
import WalletShimmerCell from "./WalletShimmerCell";

const { width } = Dimensions.get("window");
const HORIZONTAL_PADDING = 20;
const CONTENT_WIDTH = width - HORIZONTAL_PADDING * 2;

const WalletSkeleton = () => {
  const { colors: themeColors, isDark } = useTheme();
  const cardBg = isDark ? darkTheme.darkThemeInputColor : themeColors.themeElevationColor;

  return (
    <View style={styles.wrap}>
      {/* Tabs row */}
      <View style={styles.tabsRow}>
        {[1, 2, 3, 4, 5].map((i) => (
          <WalletShimmerCell key={i} width={56} height={18} borderRadius={6} style={styles.tabPill} />
        ))}
      </View>

      {/* Total Equity section */}
      <View style={styles.equitySection}>
        <View style={styles.equityLabelRow}>
          <WalletShimmerCell width={CONTENT_WIDTH * 0.6} height={14} borderRadius={4} />
          <WalletShimmerCell width={20} height={20} borderRadius={4} />
        </View>
        <WalletShimmerCell width={CONTENT_WIDTH * 0.5} height={18} borderRadius={4} style={{ marginTop: 10 }} />
        <WalletShimmerCell width={CONTENT_WIDTH * 0.35} height={16} borderRadius={4} style={{ marginTop: 8 }} />
      </View>

      {/* WalletMenu - Deposit / Withdraw */}
      <View style={styles.menuRow}>
        {[1, 2].map((i) => (
          <View key={i} style={styles.menuItem}>
            <WalletShimmerCell width={30} height={30} borderRadius={8} />
            <WalletShimmerCell width={50} height={12} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>

      {/* Portfolio section (Overview) */}
      <View style={styles.portfolioSection}>
        <WalletShimmerCell width={80} height={16} borderRadius={4} style={{ marginBottom: 10 }} />
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.portfolioCard, { backgroundColor: cardBg }]}>
            <View>
              <WalletShimmerCell width={100} height={14} borderRadius={4} />
              <View style={styles.portfolioCardBalance}>
                <WalletShimmerCell width={60} height={14} borderRadius={4} />
                <WalletShimmerCell width={36} height={12} borderRadius={4} style={{ marginLeft: 6 }} />
              </View>
            </View>
            <WalletShimmerCell width={20} height={20} borderRadius={4} />
          </View>
        ))}
      </View>

      {/* List section - Hide 0 balances + search, table header, rows */}
      <View style={styles.listSection}>
        <View style={styles.listToolbar}>
          <View style={styles.hideRow}>
            <WalletShimmerCell width={12} height={12} borderRadius={4} />
            <WalletShimmerCell width={90} height={12} borderRadius={4} style={{ marginLeft: 6 }} />
          </View>
          <WalletShimmerCell width={CONTENT_WIDTH * 0.28} height={28} borderRadius={14} />
        </View>
        <View style={styles.tableHeader}>
          <WalletShimmerCell width={60} height={12} borderRadius={4} />
          <WalletShimmerCell width={50} height={12} borderRadius={4} />
          <WalletShimmerCell width={44} height={12} borderRadius={4} />
          <WalletShimmerCell width={36} height={12} borderRadius={4} />
        </View>
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={styles.tableRow}>
            <View style={styles.rowCurrency}>
              <WalletShimmerCell width={30} height={30} borderRadius={15} />
              <WalletShimmerCell width={44} height={12} borderRadius={4} style={{ marginLeft: 8 }} />
            </View>
            <WalletShimmerCell width={48} height={12} borderRadius={4} />
            <WalletShimmerCell width={40} height={12} borderRadius={4} />
            <WalletShimmerCell width={36} height={12} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 24,
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  tabPill: {
    marginRight: 4,
  },
  equitySection: {
    marginVertical: 20,
  },
  equityLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  menuItem: {
    alignItems: "center",
  },
  portfolioSection: {
    marginVertical: 20,
  },
  portfolioCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 10,
    padding: 15,
    marginTop: 10,

  },
  portfolioCardBalance: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  listSection: {
    marginTop: 15,
  },
  listToolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  hideRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  rowCurrency: {
    flexDirection: "row",
    alignItems: "center",
    width: "40%",
  },
});

export default WalletSkeleton;
