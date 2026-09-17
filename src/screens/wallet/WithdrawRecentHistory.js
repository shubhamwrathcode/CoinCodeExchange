import React from "react";
import { View, TouchableOpacity, StyleSheet, Clipboard, Linking } from "react-native";
import FastImage from "react-native-fast-image";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { AppText, FOURTEEN, SEMI_BOLD, TEN, TWELVE, YELLOW, MEDIUM, BOLD, THIRTEEN, SIXTEEN, ELEVEN } from "../../shared";
import { buildCoinImageUri } from "../../helper/coinIconUrl";
import { useTheme } from "../../hooks/useTheme";
import { colors, lightTheme } from "../../theme/colors";
import moment from "moment";
import { showSuccess } from "../../helper/logger";
import {
  formatWithdrawAmountDisplay,
  CHAIN_FULL_NAMES,
  WITHDRAW_NETWORK_LABELS
} from "../../helper/walletChainHelpers";
import { NO_NOTIFICATION_ICON, pasteImg, share_ic, shareIcon } from "../../helper/ImageAssets";
import NavigationService from "../../navigation/NavigationService";
import { WITHDRAW_DETAIL_SCREEN } from "../../navigation/routes";




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

const WithdrawRecentHistory = ({
  activeTab,
  onTabChange,
  history,
  internalHistory,
  onViewMore,
  onWithdrawAgain,
  withdrawCoinsList = []
}) => {
  const { colors: themeColors, isDark } = useTheme();

  /**
   * Resolve network label following web parity:
   * 1. Check for explicit full name from API (item.chain_full_name)
   * 2. Check for coin-specific full name mapping (coin.chain_full_names[code])
   * 3. Fallback to shared static mapping (CHAIN_FULL_NAMES or WITHDRAW_NETWORK_LABELS)
   */
  const resolveNetworkLabel = (item) => {
    if (!item) return "—";

    // 1. API explicit full name (web mapWithdrawHistoryRow parity)
    const apiLabel = item.chain_full_name || item.networkLabel || item.network_name;
    if (apiLabel && apiLabel !== "—") return apiLabel;

    const code = String(item.network || item.chain || "").toUpperCase();
    if (!code) return "—";

    // 2. Coin-specific full names (web getWithdrawNetworks parity)
    const coinSym = String(item.currency || item.short_name || item.coin || "").toUpperCase();
    const coinObj = withdrawCoinsList.find(c =>
      String(c.short_name || c.coin || "").toUpperCase() === coinSym
    );
    if (coinObj?.chain_full_names?.[code]) {
      return coinObj.chain_full_names[code];
    }

    // 3. Fallback to shared static mappings (WithdrawWallet.js parity)
    return CHAIN_FULL_NAMES[code] || WITHDRAW_NETWORK_LABELS[code] || code;
  };


  const data = activeTab === "address" ? history : internalHistory;

  const renderItem = (item, index, isLast) => {
    const isAddress = activeTab === "address";

    const status = isAddress ? item.statusLabel || item.status : (item.status === 1 ? "Completed" : "Pending");
    const tone = withdrawStatusTone(status);

    const currencySymbol = item?.short_name || item?.currency;
    const amount = isAddress ? (item.amount ?? item.total_amount ?? item.net_amount ?? item.totalAmount ?? item.netAmount ?? item.quantity ?? 0) : (item.amount ?? item.total_amount ?? item.totalAmount ?? 0);
    const date = moment(item.created_at || item.createdAt).format("M/D/YYYY, h:mm:ss A");

    const recipient = isAddress ? item.addressFull || item.address : (item.to_user_id || item.recipient);
    const networkLabel = isAddress ? resolveNetworkLabel(item) : "Internal Transfer";
    const txId = item.txFull || item.txDisplay || item.txid || item.txId || item.transaction_id || item.tx_id || item.tx_hash || item.transaction_hash || item.hash || item.tx;

    return (
      <TouchableOpacity
        key={item.id || index}
        activeOpacity={0.9}
        onPress={() => NavigationService.navigate(WITHDRAW_DETAIL_SCREEN, { item, isAddress })}
        style={[styles.historyItem, !isLast && { borderBottomWidth: 1, borderBottomColor: lightTheme.input, paddingBottom: 20, }]}
      >


        {/* Date and Status Row */}
        <View style={styles.dateStatusRow}>
          <AppText weight={SEMI_BOLD} type={THIRTEEN} style={{ color: themeColors.text }}>{date}</AppText>
          <View style={[styles.statusBadge, { backgroundColor: tone === 'success' ? '#E9F9F1' : tone === 'pending' ? '#FFF9E6' : '#FEECEC' }]}>
            <AppText type={TEN} weight={BOLD} style={{ color: tone === 'success' ? '#05C46B' : tone === 'pending' ? '#FFC312' : '#FF3F34' }}>{status}</AppText>
          </View>
        </View>

        {/* Details Rows */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <AppText type={TWELVE} color={themeColors.secondaryText} style={styles.detailLabel}>Date</AppText>
            <AppText type={TWELVE} style={[styles.detailValue, { color: themeColors.text }]}>{date}</AppText>
          </View>

          <View style={styles.detailRow}>
            <AppText type={TWELVE} color={themeColors.secondaryText} style={styles.detailLabel}>Network</AppText>
            <AppText type={TWELVE} style={[styles.detailValue, { color: themeColors.text }]}>{networkLabel}</AppText>
          </View>

          <View style={styles.detailRow}>
            <AppText type={TWELVE} color={themeColors.secondaryText} style={styles.detailLabel}>Amount</AppText>
            <AppText type={TWELVE} style={[styles.detailValue, { color: themeColors.text }]}>{amount} {currencySymbol}</AppText>
          </View>

          <View style={styles.detailRow}>
            <AppText type={TWELVE} color={themeColors.secondaryText} style={styles.detailLabel}>Source wallet</AppText>
            <AppText type={TWELVE} weight={MEDIUM} style={[styles.detailValue, { color: themeColors.text }]}>Main Wallet</AppText>
          </View>

          <View style={styles.detailRow}>
            <AppText type={TWELVE} color={themeColors.secondaryText} style={styles.detailLabel}>{isAddress ? "Address" : "Recipient"}</AppText>
            <View style={styles.valueWithIcons}>
              <AppText numberOfLines={1} ellipsizeMode="middle" type={TWELVE} style={[styles.mono, { color: themeColors.text, flex: 1, textAlign: 'right' }]}>{recipient}</AppText>
              <View style={styles.iconGroup}>
                <TouchableOpacity onPress={() => {
                  Clipboard.setString(recipient);
                  showSuccess("Copied to clipboard");
                }} style={styles.iconBtn}>
                  <FastImage source={pasteImg} style={{ width: 12, height: 12 }} resizeMode="contain" tintColor={colors.black} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const url = resolveAddressExplorerUrl(item.network || item.chain, recipient);
                    Linking.openURL(url);
                  }}
                  style={styles.iconBtn}
                >
                  <FastImage source={share_ic} style={{ width: 12, height: 12 }} resizeMode="contain" tintColor={colors.black} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={[styles.detailRow, {}]}>
            <AppText type={TWELVE} color={themeColors.secondaryText} style={styles.detailLabel}>TxID</AppText>
            <View style={styles.valueWithIcons}>
              <AppText numberOfLines={1} ellipsizeMode="middle" type={TWELVE} style={[styles.mono, { color: themeColors.text, flex: 1, textAlign: 'right' }]}>{txId || "—"}</AppText>
              {txId ? (
                <View style={styles.iconGroup}>
                  <TouchableOpacity onPress={() => {
                    Clipboard.setString(txId);
                    showSuccess("Copied to clipboard");
                  }} style={styles.iconBtn}>
                    <FastImage source={pasteImg} style={{ width: 12, height: 12 }} resizeMode="contain" tintColor={colors.black} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      const url = resolveAddressExplorerUrl(item.network || item.chain, txId);
                      Linking.openURL(url);
                    }}
                    style={styles.iconBtn}
                  >
                    <FastImage source={share_ic} style={{ width: 12, height: 12 }} resizeMode="contain" tintColor={colors.black} />
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
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>Withdrawal History</AppText>
        <View style={styles.headerRight}>

          <TouchableOpacity onPress={onViewMore}>
            <AppText type={TWELVE} color={themeColors.secondaryText}>More &gt;</AppText>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          onPress={() => onTabChange("address")}
          style={[styles.tabPill, activeTab === "address" && styles.tabPillActive]}
        >
          <AppText weight={activeTab === "address" ? SEMI_BOLD : MEDIUM} type={FOURTEEN} style={{ color: activeTab === "address" ? themeColors.text : themeColors.secondaryText }}>Address</AppText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onTabChange("agce")}
          style={[styles.tabPill, activeTab === "agce" && styles.tabPillActive]}
        >
          <AppText weight={activeTab === "agce" ? SEMI_BOLD : MEDIUM} type={FOURTEEN} style={{ color: activeTab === "agce" ? themeColors.text : themeColors.secondaryText }}>Coincode user</AppText>
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        {data && data.length > 0 ? (
          data.slice(0, 5).map((item, index, arr) => renderItem(item, index, index === arr.length - 1))
        ) : (

          <View style={[styles.empty]}>
            <FastImage source={NO_NOTIFICATION_ICON} style={{ width: 80, height: 80 }} resizeMode="contain" />
          </View>

        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 40,
    paddingHorizontal: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  hideNotices: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  checkbox: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderRadius: 2,
  },
  tabsContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  tabPill: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  tabPillActive: {
    backgroundColor: "#F0F0F0", // Light grey background for active tab pill
  },
  list: {
    gap: 32, // Gap between items as they are not in boxes anymore
  },
  historyItem: {
    paddingBottom: 10,
  },
  dateStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailsContainer: {
    gap: 14,
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
  mono: {
    // fontFamily: "monospace",
  },
  withdrawAgainBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  empty: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderColor: "transparent",
    borderWidth: 1,
  }
});

export default WithdrawRecentHistory;
