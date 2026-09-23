import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, FlatList, TextInput, StyleSheet, ActivityIndicator, Dimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import FastImage from "react-native-fast-image";
import { AppText, DISCLAIMTEXT, EIGHTEEN, FOURTEEN, SEMI_BOLD, TWELVE } from "../../../shared";
import { colors, darkTheme } from "../../../theme/colors";
import { appOperation } from "../../../appOperation";
import { CUSTOMER_TYPE } from "../../../appOperation/types";
import { searchIcon, checkIc, NO_NOTIFICATION_ICON, INFO, marginWalletImg } from "../../../helper/ImageAssets";
import TotalAssetsCard from "../TotalAssetsCard";
import WalletAssetCard from "../WalletAssetCard";
import CoinIcon from "../../../common/CoinIcon";
import MarginPairDetailSheet from "./MarginPairDetailSheet";
import IsolatedMarginRiskModal from "../../spotScreen/isolatedMargin/IsolatedMarginRiskModal";
import NavigationService from "../../../navigation/NavigationService";
import { MARGIN_BORROW_REPAY_SCREEN, MARGIN_TRANSFER_SCREEN, TRADE_SCREEN } from "../../../navigation/routes";
import WalletShimmerCell from "../WalletShimmerCell";
import {
  buildMarginRiskRow,
  formatMarginLevel,
  getMarginLevelStatus,
  pairHasDebt,
  parseMarginLevel,
  resolveMarginThresholds,
} from "../../spotScreen/crossMargin/marginLevelUtils";

function fmt(val, decimals = 8) {
  const n = parseFloat(val);
  if (!val || isNaN(n) || n === 0) return "0.00";
  const str = parseFloat(n.toFixed(decimals)).toString();
  return str === "0" ? "0.00" : str;
}

function fmtPrice(val) {
  const n = parseFloat(val);
  if (!val || isNaN(n) || n === 0) return "0.00";
  const str = parseFloat(n.toFixed(2)).toString();
  return str === "0" ? "0.00" : str;
}

function buildPairRows(balanceRows, accounts) {
  const accountMap = {};
  for (const acc of accounts) accountMap[acc.pair] = acc;

  const pairMap = {};
  for (const row of balanceRows) {
    if (!pairMap[row.pair]) pairMap[row.pair] = { pair: row.pair, base: null, quote: null };
    if (row.asset_type === "base") pairMap[row.pair].base = row;
    else pairMap[row.pair].quote = row;
  }
  for (const acc of accounts) {
    if (!pairMap[acc.pair]) pairMap[acc.pair] = { pair: acc.pair, base: null, quote: null };
  }

  return Object.values(pairMap).map(({ pair, base, quote }) => {
    const acc = accountMap[pair] || {};
    const ml = parseMarginLevel(acc.margin_level);
    const riskSource = {
      ...acc,
      margin_level: acc.margin_level,
      base_borrowed: base?.borrowed ?? acc.base_borrowed,
      quote_borrowed: quote?.borrowed ?? acc.quote_borrowed,
    };
    const hasDebt = pairHasDebt(riskSource, ml);
    const thresholds = resolveMarginThresholds(acc);
    const mlStatus = getMarginLevelStatus(hasDebt ? ml : null, thresholds, { hasDebt });
    const mlDisplay = hasDebt ? formatMarginLevel(ml) : (ml == null ? "—" : "Safe");
    return {
      pair_id: acc.pair_id || "",
      pair: `${base?.coin || acc.base_asset || ""}/${quote?.coin || acc.quote_asset || ""}`,
      pairRaw: pair,
      base: base?.coin || acc.base_asset || "",
      quote: quote?.coin || acc.quote_asset || "",
      icon_path:
        acc.icon_path ||
        base?.icon_path ||
        base?.icon ||
        base?.icon_url ||
        acc.base_currency_icon ||
        acc.base_icon ||
        "",
      short_name: base?.coin || acc.base_asset || "",
      currency: base?.coin || acc.base_asset || "",
      mmr: mlDisplay !== "—" ? mlDisplay : null,
      marginLevel: mlDisplay,
      margin_level: acc.margin_level,
      margin_call_level: acc.margin_call_level,
      liquidation_margin_level: acc.liquidation_margin_level,
      warning_margin_rate: acc.warning_margin_rate,
      maintenance_margin_rate: acc.maintenance_margin_rate,
      leverage: acc.leverage ?? acc.default_leverage,
      effective_multiple: acc.effective_multiple ?? acc.effective_leverage,
      mlStatus,
      hasDebt,
      status: acc.status || "NOT_OPENED",
      availableBase: fmt(base?.available ?? acc.base_balance ?? "0"),
      availableQuote: fmt(quote?.available ?? acc.quote_balance ?? "0"),
      borrowableBase: fmt(base?.borrowable ?? acc.base_borrowable ?? "0"),
      borrowableQuote: fmt(quote?.borrowable ?? acc.quote_borrowable ?? "0"),
      loanCapBase: fmt(base?.loan_cap ?? acc.base_loan_cap ?? "0"),
      loanCapQuote: fmt(quote?.loan_cap ?? acc.quote_loan_cap ?? "0"),
      borrowedBase: fmt(base?.borrowed ?? acc.base_borrowed ?? "0"),
      borrowedQuote: fmt(quote?.borrowed ?? acc.quote_borrowed ?? "0"),
      frozenBase: fmt(base?.frozen ?? acc.base_locked ?? "0"),
      frozenQuote: fmt(quote?.frozen ?? acc.quote_locked ?? "0"),
      netBase: fmt(base
        ? (parseFloat(base.available || 0) + parseFloat(base.frozen || 0) - parseFloat(base.borrowed || 0)).toString()
        : (parseFloat(acc.base_balance || 0) + parseFloat(acc.base_locked || 0) - parseFloat(acc.base_borrowed || 0)).toString()),
      netQuote: fmt(quote
        ? (parseFloat(quote.available || 0) + parseFloat(quote.frozen || 0) - parseFloat(quote.borrowed || 0)).toString()
        : (parseFloat(acc.quote_balance || 0) + parseFloat(acc.quote_locked || 0) - parseFloat(acc.quote_borrowed || 0)).toString()),
      liqPrice: fmtPrice(base?.est_liquidation_price ?? quote?.est_liquidation_price ?? ""),
    };
  });
}

const MarginWalletTab = ({ theme, themeColors, marginSummary: propMarginSummary, buildCoinIconUri }) => {
  const isDark = theme === "Dark";
  const [pairs, setPairs] = useState([]);
  const [localSummary, setLocalSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [liabilitiesOnly, setLiabilitiesOnly] = useState(false);
  const [hideSmall, setHideSmall] = useState(false);
  const [selectedPair, setSelectedPair] = useState(null);
  const sheetRef = useRef(null);
  const isolatedRiskRef = useRef(null);
  const [isolatedRiskRow, setIsolatedRiskRow] = useState(null);

  const openIsolatedRisk = useCallback((item) => {
    if (!item?.pair_id && !item?.pairRaw) return;
    setIsolatedRiskRow(buildMarginRiskRow({
      ...item,
      pair: item.pairRaw || item.pair,
      pairRaw: item.pair,
      pair_id: item.pair_id,
      base_borrowed: item.borrowedBase,
      quote_borrowed: item.borrowedQuote,
    }, item.pair_id));
    isolatedRiskRef.current?.open();
  }, []);

  const summary = localSummary || propMarginSummary;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const fetchAccounts = async () => {
        try {
          const [balRes, accRes, sumRes] = await Promise.all([
            appOperation.get("margin/wallet-balances", undefined, undefined, CUSTOMER_TYPE).catch(() => null),
            appOperation.get("margin/accounts", undefined, undefined, CUSTOMER_TYPE).catch(() => null),
            appOperation.get("margin/portfolio-summary", undefined, undefined, CUSTOMER_TYPE).catch(() => null),
          ]);
          if (balRes?.success || accRes?.success) {
            const accs = accRes?.data || [];
            const bals = balRes?.data || [];
            if (active) setPairs(buildPairRows(bals, accs));
          }
          if (sumRes?.success && sumRes?.data && active) {
            setLocalSummary(sumRes.data);
          }
        } catch (e) { }
        if (active) setIsLoading(false);
      };

      fetchAccounts();
      const timer = setTimeout(() => {
        if (active) fetchAccounts();
      }, 1500);

      return () => {
        active = false;
        clearTimeout(timer);
      };
    }, [])
  );

  const filtered = useMemo(() => {
    let rows = pairs;
    if (liabilitiesOnly) {
      rows = rows.filter((r) => parseFloat(r.borrowedBase) > 0 || parseFloat(r.borrowedQuote) > 0);
    }
    if (hideSmall) {
      // Very basic approximation for < $1
      rows = rows.filter((r) => parseFloat(r.availableBase) >= 0.0001 || parseFloat(r.availableQuote) >= 1);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => (r.pair || "").toLowerCase().includes(q) || (r.base || "").toLowerCase().includes(q));
    }
    return rows;
  }, [pairs, search, hideSmall, liabilitiesOnly]);

  const todayPnlStr = String(summary?.today_pnl_usd ?? "0.00");

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <AppText weight={SEMI_BOLD} type={EIGHTEEN}>Isolated Margin Account</AppText>
      </View>

      <TotalAssetsCard
        style={{ marginTop: 12 }}
        amount={summary?.total_assets_btc ?? "0.00"}
        currency="BTC"
        usdAmount={summary?.total_assets_usd ?? "0.00"}
        pnlAmount={todayPnlStr}
        pnlPercentage="0.00%"
        imageSource={marginWalletImg}
        topRightBadge={
          <TouchableOpacity
            style={[styles.transferBtn, { backgroundColor: theme === "Dark" ? themeColors.themeElevationColor : colors.iconBgColor }]}
            onPress={() => NavigationService.navigate(MARGIN_TRANSFER_SCREEN, { fromWalletType: "spot", toWalletType: "margin" })}
          >
            <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.text }}>Transfer</AppText>
          </TouchableOpacity>
        }
      />

      <View style={[styles.summaryCard, { backgroundColor: theme === 'Dark' ? themeColors.background : colors.white }]}>
        <View style={{ marginTop: 15, flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <AppText type={FOURTEEN} color={theme === 'Dark' ? colors.white : DISCLAIMTEXT}>Account Equity</AppText>
            <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 4 }}>
              <AppText type={EIGHTEEN} weight={SEMI_BOLD}>{summary?.account_equity_usd ?? "0.00"} </AppText>
              <AppText type={TWELVE} color={theme === 'Dark' ? colors.white : DISCLAIMTEXT} style={{ marginBottom: 2 }}>USD</AppText>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <AppText type={FOURTEEN} color={theme === 'Dark' ? colors.white : DISCLAIMTEXT}>Total Liabilities</AppText>
            <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 4 }}>
              <AppText type={EIGHTEEN} weight={SEMI_BOLD}>{summary?.total_liabilities_usd ?? "0.00"} </AppText>
              <AppText type={TWELVE} color={theme === 'Dark' ? colors.white : DISCLAIMTEXT} style={{ marginBottom: 2 }}>USD</AppText>
            </View>
          </View>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersRow}>
        <View style={[styles.searchBox, { backgroundColor: isDark ? darkTheme.darkThemeInputColor : '#F7F7F7' }]}>
          <FastImage source={searchIcon} style={styles.searchIcon} resizeMode="contain" tintColor={themeColors.secondaryText} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search"
            placeholderTextColor={themeColors.secondaryText}
            cursorColor={isDark ? colors.white : colors.black}
            style={[styles.searchInput, { color: themeColors.text }]}
            returnKeyType="search"
          />
        </View>
      </View>

      <View style={styles.checkboxesRow}>
        <TouchableOpacity style={styles.checkboxWrapper} onPress={() => setLiabilitiesOnly((v) => !v)}>
          <View style={styles.checkbox}>
            {liabilitiesOnly ? <FastImage source={checkIc} style={styles.checkIcon} tintColor={isDark ? colors.white : colors.buttonBg} /> : null}
          </View>
          <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>Liabilities only</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.checkboxWrapper} onPress={() => setHideSmall((v) => !v)}>
          <View style={styles.checkbox}>
            {hideSmall ? <FastImage source={checkIc} style={styles.checkIcon} tintColor={isDark ? colors.white : colors.buttonBg} /> : null}
          </View>
          <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>Hide small assets</AppText>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.pair}
        style={{ marginTop: 10 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <WalletAssetCard
            theme={theme}
            themeColors={themeColors}
            icon={
              <CoinIcon
                coin={item}
                style={{ width: 36, height: 36, borderRadius: 18 }}
                resizeMode="contain"
              />
            }
            symbol={item.pair}
            name={
              item.status === "NOT_OPENED"
                ? "Not opened"
                : `ML ${item.marginLevel}`
            }
            amount={item.availableBase}
            fiatAmount={item.availableQuote}
            details={[
              { key: "base", label: `${item.base || "Base"} Avail`, value: item.availableBase },
              { key: "quote", label: `${item.quote || "Quote"} Avail`, value: item.availableQuote },
            ]}
            actions={[
              {
                key: "trade",
                label: "Trade",
                primary: true,
                onPress: () => NavigationService.navigate(TRADE_SCREEN, { trade_pair: item.pairRaw || item.pair }),
              },
              {
                key: "transfer",
                label: "Transfer",
                primary: false,
                onPress: () =>
                  NavigationService.navigate(MARGIN_TRANSFER_SCREEN, {
                    fromWalletType: "spot",
                    toWalletType: "margin",
                    coin: item?.base,
                  }),
              },
            ]}
          />
        )}
        ListEmptyComponent={() => {
          if (isLoading) {
            return (
              <View style={{ marginTop: 10, gap: 16 }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                      <WalletShimmerCell width={28} height={28} borderRadius={14} />
                      <View style={{ gap: 6 }}>
                        <WalletShimmerCell width={60} height={16} borderRadius={4} />
                        <WalletShimmerCell width={40} height={12} borderRadius={4} />
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <WalletShimmerCell width={80} height={16} borderRadius={4} />
                      <WalletShimmerCell width={60} height={12} borderRadius={4} />
                    </View>
                  </View>
                ))}
              </View>
            );
          }
          return (
            <View style={styles.emptyContainer}>
              <FastImage source={NO_NOTIFICATION_ICON} style={styles.emptyIcon} resizeMode="contain" />
              <AppText type={TWELVE} weight={SEMI_BOLD} color={DISCLAIMTEXT}>No Data Found</AppText>
            </View>
          );
        }}
        ListFooterComponent={() => <View style={{ height: 120 }} />}
      />

      <MarginPairDetailSheet
        ref={sheetRef}
        theme={theme}
        themeColors={themeColors}
        selectedPair={selectedPair}
        buildCoinIconUri={buildCoinIconUri}
        onOpenMarginRisk={openIsolatedRisk}
      />
      <IsolatedMarginRiskModal
        ref={isolatedRiskRef}
        row={isolatedRiskRow}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18, flex: 1 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  transferBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  summaryCard: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: colors.white,

  },
  summaryValueRow: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  pnlRow: { flexDirection: "row", marginTop: 10 },
  equityGrid: { flexDirection: "row", marginTop: 15 },
  filtersRow: { marginTop: 14, flexDirection: "row" },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 42,
  },
  searchIcon: { width: 14, height: 14 },
  searchInput: { flex: 1, height: 40, fontSize: 13 },
  checkboxesRow: { flexDirection: "row", gap: 20, marginTop: 10, marginBottom: 10 },
  checkboxWrapper: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: {
    width: 15,
    height: 15,
    borderWidth: 1,
    borderColor: colors.grey,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkIcon: { width: 8, height: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  coinIcon: { width: 28, height: 28, borderRadius: 14 },
  rowRight: { flexDirection: "row", alignItems: "center" },
  moreBtn: { paddingVertical: 6, paddingLeft: 6 },
  moreIcon: { width: 18, height: 18, transform: [{ rotate: "90deg" }] },
  emptyContainer: { alignItems: "center", marginTop: 40, gap: 10 },
  emptyIcon: { width: 80, height: 80 },
});

export default MarginWalletTab;
