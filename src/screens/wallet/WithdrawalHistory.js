import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Linking } from "react-native";
import { AppSafeAreaView, AppText, Toolbar, SEMI_BOLD, TWELVE, TEN, FOURTEEN, BOLD, MEDIUM, THIRTEEN, FIFTEEN, SIXTEEN } from "../../shared";
import { colors, lightTheme } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";
import FastImage from "react-native-fast-image";
import { NO_NOTIFICATION_ICON, NO_NOTIFICATION_ICON_LIGHT, pasteImg, share_ic } from "../../helper/ImageAssets";
import moment from "moment";
import NavigationService from "../../navigation/NavigationService";
import { WITHDRAW_DETAIL_SCREEN } from "../../navigation/routes";
import { useDispatch } from "react-redux";
import { useAppSelector } from "../../store/hooks";
import { verifyWithdraw, getInteralWalletHistory, getWithdrawActiveCoins } from "../../actions/walletActions";
import { formatWithdrawAmountDisplay, CHAIN_FULL_NAMES, WITHDRAW_NETWORK_LABELS } from "../../helper/walletChainHelpers";
import { Clipboard } from "react-native";
import { showSuccess } from "../../helper/logger";

const WithdrawalHistory = () => {
  const { colors: themeColors, isDark } = useTheme();
  const dispatch = useDispatch();

  const withdrawHistory = useAppSelector((state) => state.wallet.withdrawHistory);
  const interalWalletHistory = useAppSelector((state) => state.wallet.interalWalletHistory);
  const withdrawActiveCoins = useAppSelector((state) => state.wallet.withdrawActiveCoins);

  const [activeTab, setActiveTab] = useState("address"); // "address" | "agce"
  const [loading, setLoading] = useState(false);

  const withdrawCoinsList = useMemo(() => (Array.isArray(withdrawActiveCoins) ? withdrawActiveCoins : []), [withdrawActiveCoins]);

  useEffect(() => {
    fetchHistory();
    dispatch(getWithdrawActiveCoins());
  }, [activeTab]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      if (activeTab === "address") {
        await dispatch(verifyWithdraw({}));
      } else {
        await dispatch(getInteralWalletHistory(0, 50));
      }
    } finally {
      setLoading(false);
    }
  };

  const resolveNetworkLabel = (item) => {
    if (!item) return "—";
    const apiLabel = item.chain_full_name || item.networkLabel || item.network_name;
    if (apiLabel && apiLabel !== "—") return apiLabel;

    const code = String(item.network || item.chain || "").toUpperCase();
    if (!code) return "—";

    const coinSym = String(item.currency || item.short_name || item.coin || "").toUpperCase();
    const coinObj = withdrawCoinsList.find(c =>
      String(c.short_name || c.coin || "").toUpperCase() === coinSym
    );
    if (coinObj?.chain_full_names?.[code]) {
      return coinObj.chain_full_names[code];
    }
    return CHAIN_FULL_NAMES[code] || WITHDRAW_NETWORK_LABELS[code] || code;
  };

  function withdrawStatusTone(label) {
    const t = String(label || "").toLowerCase();
    if (!t || t === "—") return "neutral";
    if (/(completed|confirmed|success|succeed|done)/i.test(t)) return "success";
    if (/(pending|processing|confirming|in progress|queued|await|submitted)/i.test(t)) return "pending";
    if (/(rejected|reject|failed|fail|cancel|canceled|error|expired)/i.test(t)) return "danger";
    return "info";
  }

  function resolveAddressExplorerUrl(network, address) {
    const n = (network || "").toLowerCase();
    if (n.includes("bsc") || n.includes("bep")) return `https://bscscan.com/address/${address}`;
    if (n.includes("trc") || n.includes("tron")) return `https://tronscan.org/#/address/${address}`;
    return `https://etherscan.io/address/${address}`;
  }

  const data = activeTab === "address" ? (Array.isArray(withdrawHistory) ? withdrawHistory : []) : (Array.isArray(interalWalletHistory) ? interalWalletHistory : []);

  const renderCard = (item, index, isLast) => {
    const isAddress = activeTab === "address";
    const status = isAddress ? item.statusLabel || item.status : (item.status === 1 ? "Completed" : "Pending");
    const tone = withdrawStatusTone(status);

    const currencySymbol = item?.short_name || item?.currency || item?.coin;
    const amount = isAddress
      ? (item.amount ?? item.total_amount ?? item.net_amount ?? item.totalAmount ?? item.netAmount ?? item.quantity ?? item.net_total ?? 0)
      : (item.amount ?? item.total_amount ?? item.totalAmount ?? item.quantity ?? 0);
    const date = moment(item.created_at || item.createdAt || item.updatedAt).format("M/D/YYYY, h:mm:ss A");

    const recipient = isAddress ? item.addressFull || item.address : (item.to_user_id || item.recipient || item.toUser || item.to_username);
    const networkLabel = isAddress ? resolveNetworkLabel(item) : "Internal Transfer";
    const txId = item.txFull || item.txDisplay || item.txid || item.txId || item.transaction_id || item.tx_id || item.tx_hash || item.transaction_hash || item.hash || item.tx || (isAddress ? "" : (item._id || item.id || ""));

    return (
      <TouchableOpacity
        key={item.id || index}
        activeOpacity={0.9}
        onPress={() => NavigationService.navigate(WITHDRAW_DETAIL_SCREEN, { item, isAddress })}
        style={[
          styles.historyItem,
          {
            backgroundColor: 'transparent',
            borderColor: isDark ? themeColors.border : lightTheme.input
          }
        ]}
      >
        <View style={styles.dateStatusRow}>
          <AppText weight={BOLD} type={FIFTEEN} style={{ color: themeColors.text }}>{date}</AppText>
          <View style={[styles.statusBadge, { backgroundColor: tone === 'success' ? (isDark ? 'rgba(5, 196, 107, 0.15)' : '#E9F9F1') : tone === 'pending' ? (isDark ? 'rgba(255, 195, 18, 0.15)' : '#FFF9E6') : (isDark ? 'rgba(255, 63, 52, 0.15)' : '#FEECEC') }]}>
            <AppText type={TWELVE} weight={BOLD} style={{ color: tone === 'success' ? '#05C46B' : tone === 'pending' ? '#FFC312' : '#FF3F34' }}>{status}</AppText>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.detailLabel, { color: isDark ? "#8E8E93" : "#666666" }]}>Network</AppText>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.detailValue, { color: themeColors.text }]}>{networkLabel}</AppText>
          </View>

          <View style={styles.detailRow}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.detailLabel, { color: isDark ? "#8E8E93" : "#666666" }]}>Amount</AppText>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.detailValue, { color: themeColors.text }]}>{formatWithdrawAmountDisplay(amount)} {currencySymbol}</AppText>
          </View>

          <View style={styles.detailRow}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.detailLabel, { color: isDark ? "#8E8E93" : "#666666" }]}>Source wallet</AppText>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.detailValue, { color: themeColors.text }]}>Main Wallet</AppText>
          </View>

          <View style={styles.detailRow}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.detailLabel, { color: isDark ? "#8E8E93" : "#666666" }]}>{isAddress ? "Address" : "Recipient"}</AppText>
            <View style={styles.valueWithIcons}>
              <AppText numberOfLines={1} ellipsizeMode="middle" type={FOURTEEN} weight={MEDIUM} style={[styles.mono, { color: themeColors.text, flex: 1, textAlign: 'right' }]}>{recipient}</AppText>
              <View style={styles.iconGroup}>
                <TouchableOpacity onPress={() => {
                  Clipboard.setString(recipient);
                  showSuccess("Copied to clipboard");
                }} style={[styles.iconBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F0F0F0" }]}>
                  <FastImage source={pasteImg} style={{ width: 12, height: 12 }} resizeMode="contain" tintColor={isDark ? themeColors.secondaryText : colors.black} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.detailRow}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.detailLabel, { color: isDark ? "#8E8E93" : "#666666" }]}>TxID</AppText>
            <View style={styles.valueWithIcons}>
              <AppText numberOfLines={1} ellipsizeMode="middle" type={FOURTEEN} weight={SEMI_BOLD} style={[styles.mono, { color: themeColors.text, flex: 1, textAlign: 'right' }]}>{txId || "—"}</AppText>
              {txId ? (
                <View style={styles.iconGroup}>
                  <TouchableOpacity onPress={() => {
                    Clipboard.setString(txId);
                    showSuccess("Copied to clipboard");
                  }} style={[styles.iconBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F0F0F0" }]}>
                    <FastImage source={pasteImg} style={{ width: 12, height: 12 }} resizeMode="contain" tintColor={isDark ? themeColors.secondaryText : colors.black} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <AppSafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Toolbar isSecond title={"Withdrawal History"} style={{ width: "68%", backgroundColor: "transparent" }} />

      <View style={[styles.tabsContainer, { borderBottomColor: isDark ? themeColors.border : "#E5E7EB" }]}>
        <TouchableOpacity
          onPress={() => setActiveTab("address")}
          style={[styles.tabPill]}
        >
          <AppText
            weight={activeTab === "address" ? BOLD : MEDIUM}
            type={SIXTEEN}
            style={{ color: activeTab === "address" ? themeColors.text : themeColors.secondaryText }}
          >
            Address
          </AppText>
          {activeTab === "address" && <View style={[styles.activeIndicator, { backgroundColor: themeColors.text }]} />}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("agce")}
          style={[styles.tabPill]}
        >
          <AppText
            weight={activeTab === "agce" ? BOLD : MEDIUM}
            type={SIXTEEN}
            style={{ color: activeTab === "agce" ? themeColors.text : themeColors.secondaryText }}
          >
            Coincode user
          </AppText>
          {activeTab === "agce" && <View style={[styles.activeIndicator, { backgroundColor: themeColors.text }]} />}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.buttonBg} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {data.length > 0 ? (
            data.map((item, index) => renderCard(item, index, index === data.length - 1))
          ) : (
            <View style={styles.center}>
              <FastImage source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT} style={{ width: 80, height: 80 }} resizeMode="contain" />
              <AppText type={TWELVE} color={themeColors.secondaryText} style={{ marginTop: 12 }}>No withdrawal history found.</AppText>
            </View>
          )}
        </ScrollView>
      )}
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  tabsContainer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  tabPill: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    width: 30,
    height: 3,
    backgroundColor: colors.black,
    borderRadius: 2,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  historyItem: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  dateStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailsContainer: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  detailLabel: {
    flex: 1,
  },
  detailValue: {
    flex: 2,
    textAlign: "right",
  },
  valueWithIcons: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  iconGroup: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    padding: 6,
    backgroundColor: "#F0F0F0",
    borderRadius: 6,
  },
  mono: {},
});

export default WithdrawalHistory;
