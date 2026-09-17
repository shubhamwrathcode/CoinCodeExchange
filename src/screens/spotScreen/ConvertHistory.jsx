import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Platform,
} from "react-native";
import FastImage from "react-native-fast-image";
import { AppText, SEMI_BOLD, MEDIUM, BOLD } from "../../shared";
import { colors, lightTheme } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";
import {
  back_ic,
  filterIcon,
  bitcoinIcon,
  usdtIcon,
  trxIcon,
  bnbIcon,
  Polygon,
  calendarIcon,
} from "../../helper/ImageAssets";
import NavigationService from "../../navigation/NavigationService";
import SimpleToast from "react-native-simple-toast";

const ConvertHistory = () => {
  const { colors: themeColors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState("Order History");

  // Mock conversion history data matching the screenshot exactly
  const mockHistory = [
    {
      id: 1,
      fromCoin: "TRX",
      fromAmount: "7.75010304",
      fromFullName: "TRON",
      toCoin: "USDT",
      toAmount: "2.46403469",
      toFullName: "Tether USDT",
      fromIcon: trxIcon,
      toIcon: usdtIcon,
      dateTime: "2026-03-31 13:44:32",
      status: "Completed",
    },
    {
      id: 2,
      fromCoin: "BTC",
      fromAmount: "0.00004",
      fromFullName: "Bitcoin",
      toCoin: "USDT",
      toAmount: "2.68594746",
      toFullName: "Tether USDT",
      fromIcon: bitcoinIcon,
      toIcon: usdtIcon,
      dateTime: "2026-03-31 13:44:20",
      status: "Completed",
    },
    {
      id: 3,
      fromCoin: "TRX",
      fromAmount: "7.75010304",
      fromFullName: "TRON",
      toCoin: "USDT",
      toAmount: "2.46403469",
      toFullName: "Tether USDT",
      fromIcon: trxIcon,
      toIcon: usdtIcon,
      dateTime: "2026-03-31 13:44:32",
      status: "Completed",
    },
    {
      id: 4,
      fromCoin: "BTC",
      fromAmount: "0.00004",
      fromFullName: "Bitcoin",
      toCoin: "USDT",
      toAmount: "2.68594746",
      toFullName: "Tether USDT",
      fromIcon: bitcoinIcon,
      toIcon: usdtIcon,
      dateTime: "2026-03-31 13:44:20",
      status: "Completed",
    },
    {
      id: 5,
      fromCoin: "TRX",
      fromAmount: "7.75010304",
      fromFullName: "TRON",
      toCoin: "USDT",
      toAmount: "2.46403469",
      toFullName: "Tether USDT",
      fromIcon: trxIcon,
      toIcon: usdtIcon,
      dateTime: "2026-03-31 13:44:32",
      status: "Completed",
    },
    {
      id: 6,
      fromCoin: "BTC",
      fromAmount: "0.00004",
      fromFullName: "Bitcoin",
      toCoin: "USDT",
      toAmount: "2.68594746",
      toFullName: "Tether USDT",
      fromIcon: bitcoinIcon,
      toIcon: usdtIcon,
      dateTime: "2026-03-31 13:44:20",
      status: "Completed",
    },
  ];

  const renderHistoryItem = ({ item }) => {
    return (
      <View style={[styles.historyCard, { backgroundColor: isDark ? "#1C1C1E" : colors.white, borderColor: isDark ? "#2C2C2E" : "#E5E5EA" }]}>
        <View style={styles.cardHeader}>
          {/* Spend details */}
          <View style={styles.coinDetailBlock}>
            <FastImage source={item.fromIcon} style={styles.coinIcon} resizeMode="contain" />
            <View style={styles.coinTextInfo}>
              <AppText weight={SEMI_BOLD} style={{ fontSize: 13, color: themeColors.text }} numberOfLines={1}>
                {item.fromAmount} {item.fromCoin}
              </AppText>
              <AppText style={{ fontSize: 10, color: themeColors.secondaryText, marginTop: 2 }}>
                {item.fromFullName}
              </AppText>
            </View>
          </View>

          {/* Arrow */}
          <View style={{ paddingHorizontal: 8 }}>
            <AppText style={{ fontSize: 16, color: themeColors.secondaryText }}>→</AppText>
          </View>

          {/* Receive details */}
          <View style={styles.coinDetailBlock}>
            <FastImage source={item.toIcon} style={styles.coinIcon} resizeMode="contain" />
            <View style={styles.coinTextInfo}>
              <AppText weight={SEMI_BOLD} style={{ fontSize: 13, color: themeColors.text }} numberOfLines={1}>
                {item.toAmount} {item.toCoin}
              </AppText>
              <AppText style={{ fontSize: 10, color: themeColors.secondaryText, marginTop: 2 }}>
                {item.toFullName}
              </AppText>
            </View>
          </View>
        </View>

        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <FastImage source={calendarIcon} style={{ width: 12, height: 12 }}
              tintColor={themeColors.secondaryText}
              resizeMode="contain" />
            <AppText style={{ fontSize: 11, color: themeColors.secondaryText }}>
              {item.dateTime}
            </AppText>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: isDark ? "#152E20" : "#E2F5EC" }]}>
            <AppText weight={SEMI_BOLD} style={{ fontSize: 9, color: "#26A17B" }}>
              {item.status}
            </AppText>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#171a20" : colors.white, paddingTop: Platform.OS === "ios" ? 50 : 10 }}>
      {/* Top Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => NavigationService.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FastImage source={back_ic} style={{ width: 20, height: 20 }} resizeMode="contain" tintColor={themeColors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center", marginRight: 36 }}>
          <AppText weight={BOLD} style={{ fontSize: 18, color: themeColors.text }}>
            Trade
          </AppText>
          <AppText style={{ fontSize: 12, color: themeColors.secondaryText, marginTop: 2 }}>
            Convert
          </AppText>
        </View>
      </View>

      {/* Tabs Row */}
      <View style={[styles.tabsRow, {}]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 24, flex: 1 }}>
          <TouchableOpacity
            onPress={() => setActiveTab("Order History")}
            style={styles.tabButton}
          >
            <AppText
              weight={activeTab === "Order History" ? SEMI_BOLD : undefined}
              style={{
                fontSize: 16,
                color: activeTab === "Order History" ? themeColors.text : themeColors.secondaryText,
              }}
            >
              Order History
            </AppText>
            {activeTab === "Order History" && (
              <View style={[styles.activeUnderline, { backgroundColor: themeColors.text }]} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setActiveTab("Open Orders");
              SimpleToast.show("No open orders found");
              setActiveTab("Order History");
            }}
            style={styles.tabButton}
          >
            <AppText
              weight={activeTab === "Open Orders" ? SEMI_BOLD : undefined}
              style={{
                fontSize: 16,
                color: activeTab === "Open Orders" ? themeColors.text : themeColors.secondaryText,
              }}
            >
              Open Orders
            </AppText>
            {activeTab === "Open Orders" && (
              <View style={[styles.activeUnderline, { backgroundColor: themeColors.text }]} />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => SimpleToast.show("Filters coming soon")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <FastImage source={filterIcon} style={{ width: 20, height: 20 }} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      {/* List Container */}
      <FlatList
        data={mockHistory}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderHistoryItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default ConvertHistory;

const styles = StyleSheet.create({
  headerContainer: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  tabsRow: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    // borderBottomWidth: 1,
    marginTop: 10,
  },
  tabButton: {
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 10,
  },
  activeUnderline: {
    height: 3,
    width: 40,
    borderRadius: 1.5,
    position: "absolute",
    bottom: 0,
  },
  historyCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  coinDetailBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  coinIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  coinTextInfo: {
    flex: 1,
    marginLeft: 8,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
