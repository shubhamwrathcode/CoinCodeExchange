import React, { useMemo, useEffect } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, Linking, Clipboard } from "react-native";
import { useRoute } from "@react-navigation/native";
import { AppSafeAreaView, AppText, Toolbar, SEMI_BOLD, TWELVE, TEN, FOURTEEN, BOLD, MEDIUM, THIRTEEN, ELEVEN, Button, EIGHTEEN } from "../../shared";
import { colors } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";
import FastImage from "react-native-fast-image";
import { back_ic, copyIcon, externalLinkIcon, CREATE_TICKET_ICON } from "../../helper/ImageAssets";
import moment from "moment";
import NavigationService from "../../navigation/NavigationService";
import { WITHDRAW_SCREEN, CREATE_TICKET_SCREEN, WALLET_WITHDRAW_SCREEN, WITHDRAW_FORM_SCREEN } from "../../navigation/routes";
import { formatWithdrawAmountDisplay, CHAIN_FULL_NAMES, WITHDRAW_NETWORK_LABELS } from "../../helper/walletChainHelpers";
import { showSuccess } from "../../helper/logger";
import { useDispatch } from "react-redux";
import { useAppSelector } from "../../store/hooks";
import { buildCoinImageUri } from "../../helper/coinIconUrl";
import { getWithdrawActiveCoins } from "../../actions/walletActions";


export default function WithdrawalDetailPage() {
  const route = useRoute();
  const { colors: themeColors, isDark } = useTheme();
  const { item, isAddress } = route.params || {};

  const dispatch = useDispatch();
  const withdrawActiveCoins = useAppSelector((state) => state.wallet.withdrawActiveCoins);
  const withdrawCoinsList = useMemo(() => (Array.isArray(withdrawActiveCoins) ? withdrawActiveCoins : []), [withdrawActiveCoins]);

  useEffect(() => {
    if (withdrawCoinsList.length === 0) {
      dispatch(getWithdrawActiveCoins());
    }
  }, []);

  const status = isAddress ? item.statusLabel || item.status : (item.status === 1 ? "Completed" : "Pending");

  const withdrawStatusTone = (label) => {
    const t = String(label || "").toLowerCase();
    if (!t || t === "—") return "neutral";
    if (/(completed|confirmed|success|succeed|done)/i.test(t)) return "success";
    if (/(pending|processing|confirming|in progress|queued|await|submitted)/i.test(t)) return "pending";
    if (/(rejected|reject|failed|fail|cancel|canceled|error|expired)/i.test(t)) return "danger";
    return "info";
  };

  const tone = withdrawStatusTone(status);
  const statusColor = tone === 'success' ? '#16A34A' : tone === 'danger' ? '#DC2626' : tone === 'pending' ? '#B45309' : themeColors.text;
  const stepAccent = tone === 'success' ? '#16A34A' : tone === 'danger' ? '#DC2626' : tone === 'pending' ? '#B45309' : '#64748B';

  const dateStr = moment(item.created_at || item.createdAt || item.updatedAt).format("M/D/YYYY, h:mm:ss A");

  const currencySymbol = item?.short_name || item?.currency || item?.coin || "—";
  const amount = isAddress
    ? (item.amount ?? item.total_amount ?? item.net_amount ?? item.totalAmount ?? item.netAmount ?? item.quantity ?? item.net_total ?? 0)
    : (item.amount ?? item.total_amount ?? item.totalAmount ?? item.quantity ?? 0);

  const fee = item?.fee ?? item?.tx_fee ?? item?.network_fee ?? 0;

  const coinObj = useMemo(() => {
    const sym = String(currencySymbol).toUpperCase();
    return withdrawCoinsList.find(c =>
      String(c.short_name || c.coin || c.currency || "").toUpperCase() === sym
    );
  }, [currencySymbol, withdrawCoinsList]);

  const coinIconUrl = buildCoinImageUri(coinObj);

  const navigateToWithdrawAgain = () => {
    if (!coinObj) return;

    const params = {
      data: coinObj,
    };

    if (isAddress) {
      params.withdrawTo = "address";
      params.address = recipient;
      params.network = item.network || item.chain;
    } else {
      params.withdrawTo = "agce_user";
      const rec = String(recipient || "").trim();
      if (rec.includes("@")) {
        params.agceRecipientTab = "email";
        params.agceRecipientEmail = rec;
      } else if (/^\+?\d+$/.test(rec)) {
        params.agceRecipientTab = "phone";
        params.agceRecipientPhone = rec;
      } else {
        params.agceRecipientTab = "agce";
        params.agceRecipientId = rec;
      }
    }

    NavigationService.navigate(WITHDRAW_FORM_SCREEN, params);
  };


  const resolveNetworkLabel = (itm) => {
    if (!itm) return "—";
    const apiLabel = itm.chain_full_name || itm.networkLabel || itm.network_name;
    if (apiLabel && apiLabel !== "—") return apiLabel;

    const code = String(itm.network || itm.chain || "").toUpperCase();
    if (!code) return "—";

    const coinSym = String(itm.currency || itm.short_name || itm.coin || "").toUpperCase();
    const coinObj = withdrawCoinsList.find(c =>
      String(c.short_name || c.coin || "").toUpperCase() === coinSym
    );
    if (coinObj?.chain_full_names?.[code]) {
      return coinObj.chain_full_names[code];
    }
    return CHAIN_FULL_NAMES[code] || WITHDRAW_NETWORK_LABELS[code] || code;
  };

  const networkLabel = isAddress ? resolveNetworkLabel(item) : "Internal Transfer";
  const recipient = isAddress
    ? (item.addressFull || item.address || item.to_address || item.destAddress || "—")
    : (item.to_user_id || item.recipient || item.toUser || item.to_username || "—");
  const txId = item.txFull || item.txDisplay || item.txid || item.txId || item.transaction_id || item.tx_id || item.tx_hash || item.transaction_hash || item.hash || item.tx || (isAddress ? "" : (item._id || item.id || ""));


  function resolveAddressExplorerUrl(network, val) {
    const n = (network || "").toLowerCase();
    if (n.includes("bsc") || n.includes("bep")) return `https://bscscan.com/address/${val}`;
    if (n.includes("trc") || n.includes("tron")) return `https://tronscan.org/#/address/${val}`;
    return `https://etherscan.io/address/${val}`;
  }

  function resolveTxExplorerUrl(network, val) {
    const n = (network || "").toLowerCase();
    if (n.includes("bsc") || n.includes("bep")) return `https://bscscan.com/tx/${val}`;
    if (n.includes("trc") || n.includes("tron")) return `https://tronscan.org/#/transaction/${val}`;
    return `https://etherscan.io/tx/${val}`;
  }

  const addrHref = isAddress ? resolveAddressExplorerUrl(item.network || item.chain, recipient) : null;
  const txHref = isAddress && txId ? resolveTxExplorerUrl(item.network || item.chain, txId) : null;

  const truncateMid = (s) => {
    if (!s || s === "—") return "—";
    if (s.length <= 20) return s;
    return `${s.slice(0, 10)}...${s.slice(-8)}`;
  };

  const Row = ({ label, value, right }) => (
    <View style={[styles.row, { borderBottomColor: isDark ? themeColors.border : '#EEE' }]}>
      <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: isDark ? "#8E8E93" : "#666666" }}>{label}</AppText>
      <View style={styles.rowRight}>
        {typeof value === 'string' ? (
          <AppText type={FOURTEEN} weight={MEDIUM} numberOfLines={1} ellipsizeMode="middle" style={{ color: themeColors.text, flexShrink: 1 }}>{value}</AppText>
        ) : (
          value
        )}
        {right ? <View style={styles.rowActions}>{right}</View> : null}
      </View>

    </View>
  );

  return (
    <AppSafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
      <View style={[styles.header, { borderBottomColor: isDark ? themeColors.border : '#EEE' }]}>
        <TouchableOpacity onPress={() => NavigationService.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <FastImage source={back_ic} style={{ width: 35, height: 35 }} resizeMode="contain" />
        </TouchableOpacity>
        <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>Withdrawal Details</AppText>
        <View style={{ width: 18, height: 18 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.stepper}>
          {/* Step 1 */}
          <View style={styles.stepRow}>
            <View style={styles.stepTrack}>
              <View style={[styles.stepDot, { backgroundColor: stepAccent }]} />
              <View style={[styles.stepLine, { backgroundColor: tone === 'success' ? stepAccent : '#C7F9E9' }]} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: themeColors.text }}>Withdrawal request submitted</AppText>
              <AppText type={TWELVE} weight={MEDIUM} style={{ color: themeColors.secondaryText, marginTop: 4 }}>{dateStr}</AppText>
            </View>
          </View>

          {/* Step 2 */}
          <View style={styles.stepRow}>
            <View style={styles.stepTrack}>
              <View style={[styles.stepDot, { backgroundColor: tone === 'success' ? stepAccent : '#D1D5DB' }]} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: tone === 'success' ? themeColors.text : themeColors.secondaryText }}>Transfer completed</AppText>
              {tone === 'success' && <AppText type={TWELVE} weight={MEDIUM} style={{ color: themeColors.secondaryText, marginTop: 4 }}>{dateStr}</AppText>}
            </View>
          </View>
        </View>

        <AppText type={TWELVE} weight={MEDIUM} style={[styles.note, { color: themeColors.secondaryText }]}>
          {tone === 'success'
            ? "Your withdrawal has completed. You should see funds at the destination address."
            : "Your withdrawal request is being processed. You will receive an email once it is completed."}
        </AppText>

        <TouchableOpacity onPress={() => NavigationService.navigate(CREATE_TICKET_SCREEN)} style={styles.linkRow}>
          <AppText type={ELEVEN} weight={SEMI_BOLD} style={{ color: colors.cyanTheme }}>Report Scam</AppText>
        </TouchableOpacity>

        <View style={[styles.card, { borderColor: isDark ? themeColors.border : '#EEE' }]}>
          <Row label="Status" value={<AppText type={FOURTEEN} weight={BOLD} style={{ color: statusColor }}>{status}</AppText>} />
          <Row label="Date" value={dateStr} />
          <Row label="Source" value="Main Wallet" />
          <Row label="Coin" value={
            <View style={styles.coinRow}>
              <View style={styles.coinIcon}>
                {coinIconUrl ? (
                  <FastImage source={{ uri: coinIconUrl }} style={styles.coinImg} resizeMode="contain" />
                ) : (
                  <AppText type={TEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{String(currencySymbol).slice(0, 2).toUpperCase()}</AppText>
                )}
              </View>
              <AppText type={FOURTEEN} weight={BOLD} style={{ color: themeColors.text }}>{currencySymbol}</AppText>
            </View>
          } />

          <Row label="Withdraw amount" value={`${formatWithdrawAmountDisplay(amount)}`} />
          <Row label="Network fee" value={`${formatWithdrawAmountDisplay(fee)}`} />

          <Row
            label={isAddress ? "Address" : "Recipient"}
            value={truncateMid(recipient)}
            right={
              <>
                <TouchableOpacity onPress={() => { Clipboard.setString(recipient); showSuccess("Copied to clipboard"); }} style={styles.iconBtn}>
                  <FastImage source={copyIcon} style={styles.icon} resizeMode="contain" tintColor={themeColors.secondaryText} />
                </TouchableOpacity>
                {addrHref && (
                  <TouchableOpacity onPress={() => Linking.openURL(addrHref)} style={styles.iconBtn}>
                    <FastImage source={externalLinkIcon} style={styles.icon} resizeMode="contain" tintColor={themeColors.secondaryText} />
                  </TouchableOpacity>
                )}
              </>
            }
          />

          <Row label="Network" value={networkLabel} />

          <Row
            label="TxID"
            value={truncateMid(txId)}
            right={
              txId && txId !== "—" ? (
                <>
                  <TouchableOpacity onPress={() => { Clipboard.setString(txId); showSuccess("Copied to clipboard"); }} style={styles.iconBtn}>
                    <FastImage source={copyIcon} style={styles.icon} resizeMode="contain" tintColor={themeColors.secondaryText} />
                  </TouchableOpacity>
                  {txHref && (
                    <TouchableOpacity onPress={() => Linking.openURL(txHref)} style={styles.iconBtn}>
                      <FastImage source={externalLinkIcon} style={styles.icon} resizeMode="contain" tintColor={themeColors.secondaryText} />
                    </TouchableOpacity>
                  )}
                </>
              ) : null
            }
          />
        </View>

        <TouchableOpacity onPress={() => NavigationService.navigate(CREATE_TICKET_SCREEN)} style={styles.chatRow}>
          <AppText type={TWELVE} style={{ color: colors.cyanTheme }}>Need help? Chat with us</AppText>
        </TouchableOpacity>

        {tone === 'success' && (
          <Button onPress={navigateToWithdrawAgain} containerStyle={styles.withdrawAgainBtn}>
            <AppText type={FOURTEEN} weight={BOLD} style={{ color: colors.white }}>Withdraw Again</AppText>
          </Button>
        )}
      </ScrollView>
    </AppSafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  content: { padding: 16, paddingBottom: 40 },
  stepper: { marginTop: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepTrack: { width: 18, alignItems: 'center' },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D1D5DB' },
  stepLine: { width: 2, height: 40, backgroundColor: '#E5E7EB' },
  note: { lineHeight: 18, marginTop: 10 },
  linkRow: { paddingVertical: 8 },
  card: { marginTop: 20, borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  rowRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, maxWidth: '66%' },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
  },
  icon: { width: 14, height: 14 },
  coinRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  coinIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinImg: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  chatRow: { marginTop: 20, alignItems: 'center' },

  withdrawAgainBtn: {
    marginTop: 20,
    borderRadius: 999,
    height: 50,
    backgroundColor: '#1E222D',
  },
});
