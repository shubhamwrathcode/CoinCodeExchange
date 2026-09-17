import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Linking } from "react-native";
import { AppSafeAreaView, AppText, Toolbar, BOLD, MEDIUM, SEMI_BOLD, TWELVE, TEN, FOURTEEN, FIFTEEN } from "../../shared";
import { colors, lightTheme } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";
import FastImage from "react-native-fast-image";
import { NO_NOTIFICATION_ICON, NO_NOTIFICATION_ICON_LIGHT, copyIcon, externalLinkIcon } from "../../helper/ImageAssets";
import { copyText } from "../../helper/utility";
import moment from "moment";
import NewWalletHistorySkeleton from "./NewWalletHistorySkeleton";
import { appOperation } from "../../appOperation";
import NavigationService from "../../navigation/NavigationService";
import { DEPOSIT_HISTORY_DETAIL_SCREEN } from "../../navigation/routes";

const NewWalletHistory = ({
  investments = [],
  totalSelfInvestment = 0,
  totalDownlineInvestment = 0,
  totalAllInvestment = 0,
}) => {
  const { colors: themeColors, isDark } = useTheme();
  const [rows, setRows] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  const rowsRef = useRef([]);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);
  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const extractDepositHistoryList = useCallback((res) => {
    if (!res || res?.success === false) return [];
    const d = res?.data;
    if (Array.isArray(d)) return d;
    if (d && Array.isArray(d.deposits)) return d.deposits;
    if (d && Array.isArray(d.data)) return d.data;
    if (d && Array.isArray(d.rows)) return d.rows;
    if (d && Array.isArray(d.transactions)) return d.transactions;
    if (d && Array.isArray(d.list)) return d.list;
    return [];
  }, []);

  const truncateMid = useCallback((s, headLen = 10, tailLen = 6) => {
    if (s == null || s === "" || s === "—") return "—";
    const str = String(s);
    if (str.length <= headLen + tailLen + 1) return str;
    return `${str.slice(0, headLen)}…${str.slice(-tailLen)}`;
  }, []);

  const pickExplorerHref = useCallback((raw) => {
    if (raw == null) return null;
    const s = typeof raw === "string" ? raw.trim() : String(raw).trim();
    return s || null;
  }, []);

  const resolveExplorerUrl = useCallback(
    (explorer, kind, value) => {
      const ex = explorer && typeof explorer === "object" ? explorer : {};
      const tpl =
        kind === "address"
          ? pickExplorerHref(ex.address) || pickExplorerHref(ex.address_url) || pickExplorerHref(ex.account)
          : pickExplorerHref(ex.tx) ||
          pickExplorerHref(ex.transaction) ||
          pickExplorerHref(ex.tx_hash_url) ||
          pickExplorerHref(ex.txUrl);
      if (!tpl || !value || value === "—") return null;
      if (/\{address\}/i.test(tpl) && kind === "address") return tpl.replace(/\{address\}/gi, encodeURIComponent(value));
      if ((/\{txid\}/i.test(tpl) || /\{txhash\}/i.test(tpl)) && kind === "tx") {
        return tpl.replace(/\{txid\}/gi, encodeURIComponent(value)).replace(/\{txhash\}/gi, encodeURIComponent(value));
      }
      return tpl;
    },
    [pickExplorerHref]
  );

  const historyStatusLabel = useCallback((raw) => {
    const t = raw == null ? "" : String(raw).trim();
    if (!t) return "—";
    if (/success|completed|credited|confirm/i.test(t)) return "COMPLETED";
    if (/pending|processing|in progress|confirming|queued|wait/i.test(t)) return "PENDING";
    if (/fail|failed|reject|rejected|cancel|error/i.test(t)) return "FAILED";
    return t.toUpperCase();
  }, []);

  const mapRow = useCallback(
    (r, i) => {
      const tx = r?.transaction_hash || r?.txid || r?.txId || r?.tx_id || r?.hash;
      const addr = r?.address || r?.to_address || r?.destAddress || r?.destinationAddress;
      const chainFullName =
        r?.chain_full_name ||
        r?.chainFullName ||
        r?.chain_full ||
        r?.chainName ||
        r?.network_full_name ||
        (r?.metadata && (r.metadata.chain_full_name || r.metadata.chainFullName || r.metadata.network_full_name)) ||
        null;
      const short =
        r?.short_name ||
        r?.shortName ||
        r?.currency_short_name ||
        r?.currency ||
        r?.coin ||
        r?.token ||
        (r?.currency_id && (r.currency_id.short_name || r.currency_id.symbol)) ||
        "—";
      const amount =
        r?.net_amount ??
        r?.netAmount ??
        r?.amount ??
        r?.deposit_amount ??
        r?.depositAmount ??
        (r?.metadata && (r.metadata.net_amount ?? r.metadata.amount)) ??
        "—";
      const status = r?.status || r?.transaction_status || r?.action || "—";
      const explorer = r?.explorer || r?.explorerLink || r?.explorer_link || (r?.metadata && r.metadata.explorer) || {};
      return {
        id: r?._id || r?.id || tx || `row-${i}`,
        createdAt: r?.createdAt || r?.created_at || r?.time || r?.date,
        chain: r?.chain || r?.network || (r?.metadata && r.metadata.chain) || "—",
        chain_full_name: chainFullName != null && String(chainFullName).trim() ? String(chainFullName) : "—",
        short_name: short != null && String(short).trim() ? String(short).toUpperCase() : "—",
        amount: amount != null && amount !== "" ? String(amount) : "—",
        status,
        statusLabel: historyStatusLabel(status),
        address: addr != null && addr !== "" ? String(addr) : "—",
        addressShort: addr != null && addr !== "" ? truncateMid(addr) : "—",
        txid: tx != null && tx !== "" ? String(tx) : "—",
        txidShort: tx != null && tx !== "" ? truncateMid(tx) : "—",
        depositWallet: r?.wallet || r?.walletType || r?.wallet_type || r?.depositWallet || "Main Wallet",
        explorer,
      };
    },
    [historyStatusLabel, truncateMid]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingInitial(true);
      setRows([]);
      rowsRef.current = [];
      setHasMore(true);
      hasMoreRef.current = true;
      try {
        const res = await appOperation.customer.verify_deposit({ skip: 0, limit });
        if (cancelled) return;
        const raw = extractDepositHistoryList(res);
        const batch = (raw || []).map((r, i) => mapRow(r, i));
        setRows(batch);
        rowsRef.current = batch;
        setHasMore(batch.length >= limit);
        hasMoreRef.current = batch.length >= limit;
      } catch {
        if (!cancelled) {
          setRows([]);
          rowsRef.current = [];
          setHasMore(false);
          hasMoreRef.current = false;
        }
      } finally {
        if (!cancelled) setLoadingInitial(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [extractDepositHistoryList, limit, mapRow]);

  const loadMore = useCallback(async () => {
    if (!hasMoreRef.current || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const skip = rowsRef.current.length;
    try {
      const res = await appOperation.customer.verify_deposit({ skip, limit });
      const raw = extractDepositHistoryList(res);
      const batch = (raw || []).map((r, i) => mapRow(r, skip + i));
      if (!batch.length) {
        setHasMore(false);
        hasMoreRef.current = false;
        return;
      }
      setRows((prev) => {
        const next = [...prev, ...batch];
        rowsRef.current = next;
        return next;
      });
      setHasMore(batch.length >= limit);
      hasMoreRef.current = batch.length >= limit;
    } catch {
      setHasMore(false);
      hasMoreRef.current = false;
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [extractDepositHistoryList, limit, mapRow]);

  const handleScroll = useCallback(
    (event) => {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const paddingToBottom = 220;
      const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
      if (isCloseToBottom) void loadMore();
    },
    [loadMore]
  );

  const openUrl = useCallback(async (url) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      /* ignore */
    }
  }, []);

  const renderCard = useCallback(
    (row, idx) => {
      const dateStr = moment(row?.createdAt).isValid() ? moment(row.createdAt).format("DD/MM/YYYY, HH:mm:ss") : "—";
      const networkText = row?.chain_full_name && row.chain_full_name !== "—" ? row.chain_full_name : row?.chain || "—";

      const tone =
        row?.statusLabel === "COMPLETED"
          ? "success"
          : row?.statusLabel === "PENDING"
            ? "pending"
            : "failed";

      const pillBg =
        tone === "success"
          ? "#E9F9F1"
          : tone === "pending"
            ? "#FFF9E6"
            : "#FEECEC";

      const pillText =
        tone === "success"
          ? "#05C46B"
          : tone === "pending"
            ? "#FFC312"
            : "#FF3F34";

      const addressUrl = resolveExplorerUrl(row?.explorer, "address", row?.address);
      const txUrl = resolveExplorerUrl(row?.explorer, "tx", row?.txid);

      const Row = ({ label, value, right }) => (
        <View style={styles.depHistRow}>
          <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.depHistLabel, { color: isDark ? "#8E8E93" : "#666666" }]}>
            {label}
          </AppText>
          <View style={styles.depHistValueWrap}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.depHistValue, { color: themeColors.text }]} numberOfLines={3}>
              {value}
            </AppText>
          </View>
          {right ? <View style={styles.depHistRight}>{right}</View> : null}
        </View>
      );

      return (
        <TouchableOpacity
          key={row?.id || idx}
          activeOpacity={0.92}
          onPress={() => NavigationService.navigate(DEPOSIT_HISTORY_DETAIL_SCREEN, { row })}
          style={[
            styles.depHistCard,
            {
              backgroundColor: "transparent",
              borderColor: lightTheme.input,
            }
          ]}
        >
          <View style={styles.depHistTop}>
            <AppText type={FIFTEEN} weight={BOLD} style={{ color: themeColors.text }}>
              {dateStr}
            </AppText>
            <View style={[styles.depHistPill, { backgroundColor: pillBg }]}>
              <AppText type={TWELVE} weight={BOLD} style={{ color: pillText }}>
                {row?.statusLabel || "—"}
              </AppText>
            </View>
          </View>

          <View style={styles.depHistRows}>
            <Row label="Network" value={networkText} />
            <Row label="Amount" value={`${row?.amount ?? "—"} ${row?.short_name ?? ""}`.trim()} />
            <Row label="Deposit Wallet" value={row?.depositWallet || "Main Wallet"} />
            <Row
              label="Address"
              value={row?.addressShort || "—"}
              right={
                <View style={styles.depHistIconRow}>
                  <TouchableOpacity
                    onPress={() => (row?.address && row.address !== "—" ? copyText(row.address) : undefined)}
                    disabled={!row?.address || row.address === "—"}
                    style={styles.depHistIconBtn}
                  >
                    <FastImage source={copyIcon} style={styles.depHistIcon} resizeMode="contain" tintColor={themeColors.secondaryText} />
                  </TouchableOpacity>
                  {addressUrl ? (
                    <TouchableOpacity onPress={() => openUrl(addressUrl)} style={styles.depHistIconBtn}>
                      <FastImage
                        source={externalLinkIcon}
                        style={styles.depHistIcon}
                        resizeMode="contain"
                        tintColor={themeColors.secondaryText}
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>
              }
            />
            <Row
              label="TxID"
              value={row?.txidShort || "—"}
              right={
                <View style={styles.depHistIconRow}>
                  <TouchableOpacity
                    onPress={() => (row?.txid && row.txid !== "—" ? copyText(row.txid) : undefined)}
                    disabled={!row?.txid || row.txid === "—"}
                    style={styles.depHistIconBtn}
                  >
                    <FastImage source={copyIcon} style={styles.depHistIcon} resizeMode="contain" tintColor={themeColors.secondaryText} />
                  </TouchableOpacity>
                  {txUrl ? (
                    <TouchableOpacity onPress={() => openUrl(txUrl)} style={styles.depHistIconBtn}>
                      <FastImage
                        source={externalLinkIcon}
                        style={styles.depHistIcon}
                        resizeMode="contain"
                        tintColor={themeColors.secondaryText}
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>
              }
            />
          </View>
        </TouchableOpacity>
      );
    },
    [isDark, openUrl, resolveExplorerUrl, themeColors, TWELVE]
  );

  return (
    <AppSafeAreaView
      style={[
        styles.container,
        { backgroundColor: themeColors.background },
      ]}
    >
      <Toolbar
        isSecond
        title={"Deposit History"}
        style={{ width: "65%", backgroundColor: "transparent" }}
      />

      {loadingInitial ? (
        <NewWalletHistorySkeleton />
      ) : rows?.length > 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={400}
        >
          {rows.map((row, idx) => renderCard(row, idx))}
          {loadingMore && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.buttonBg || "#007AFF"} />
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.noDataRow}>
          <FastImage
            source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT}
            resizeMode="contain"
            style={{ width: 80, height: 80 }}
          />
        </View>
      )}
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  depHistCard: {
    borderBottomWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  depHistTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  depHistPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  depHistRows: {
    gap: 10,
  },
  depHistRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  depHistLabel: {
    flex: 1,
  },
  depHistValueWrap: {
    flex: 2,
    alignItems: "flex-end",
  },
  depHistValue: {
    textAlign: "right",
  },
  depHistRight: {
    marginLeft: 10,
  },
  depHistIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  depHistIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
  },
  depHistIcon: {
    width: 14,
    height: 14,
  },
  noDataRow: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
    paddingTop: 50,
  },
  noDataText: {
    color: "#888",
    fontStyle: "italic",
    marginTop: 10,
    fontSize: 14,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default NewWalletHistory;
