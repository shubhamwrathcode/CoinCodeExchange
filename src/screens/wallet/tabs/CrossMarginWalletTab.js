import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { View, TouchableOpacity, FlatList, TextInput, StyleSheet, ActivityIndicator, Dimensions } from "react-native";
import FastImage from "react-native-fast-image";
import Svg, { Path, Circle, Text as SvgText } from "react-native-svg";
import { AppText, BOLD, DISCLAIMTEXT, EIGHTEEN, FOURTEEN, SEMI_BOLD, SIXTEEN, TWELVE } from "../../../shared";
import { colors, darkTheme } from "../../../theme/colors";
import { appOperation } from "../../../appOperation";
import { CUSTOMER_TYPE } from "../../../appOperation/types";
import { searchIcon, checkIc, NO_NOTIFICATION_ICON, moreOption, bitcoin_ic, marginWalletImg } from "../../../helper/ImageAssets";
import TotalAssetsCard from "../TotalAssetsCard";
import NavigationService from "../../../navigation/NavigationService";
import { MARGIN_BORROW_REPAY_SCREEN, MARGIN_TRANSFER_SCREEN } from "../../../navigation/routes";
import CrossMarginDetailSheet from "../sheets/CrossMarginDetailSheet";
import { useFocusEffect } from "@react-navigation/native";
import WalletShimmerCell from "../WalletShimmerCell";

import Toast from "react-native-simple-toast";

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

function MarginLevelGauge({ level, mmr = 1.1, warningRate = 1.15, isDark = false }) {
  const isNum = Number.isFinite(level) && level !== null;
  const MIN = 1.0, MAX = 3.0;
  const pct = isNum ? Math.min(1, Math.max(0, (level - MIN) / (MAX - MIN))) : 0;

  const cx = 56, cy = 56, r = 44, strokeW = 8;
  const startAngle = 210, sweep = 120;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const arcPt = (deg) => ({
    x: cx + r * Math.cos(toRad(deg)),
    y: cy + r * Math.sin(toRad(deg)),
  });
  const describeArc = (startDeg, endDeg) => {
    const s = arcPt(startDeg), e = arcPt(endDeg);
    const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const endAngle = startAngle + sweep * pct;
  const color = !isNum ? "#6b7280"
    : level < mmr ? "#e45561"
      : level < warningRate ? "#f59e0b"
        : "#01bc8d";

  return (
    <View style={{ alignItems: "center", justifyContent: "center", width: 112, height: 80 }}>
      <Svg width={112} height={80} viewBox="0 0 112 80">
        <Path d={describeArc(startAngle, startAngle + sweep)} fill="none" stroke={isDark ? "#3A3A3C" : "#e5e7eb"} strokeWidth={strokeW} strokeLinecap="round" />
        {isNum && pct > 0 && (
          <Path d={describeArc(startAngle, endAngle)} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
        )}
        {isNum && (
          <Circle cx={arcPt(endAngle).x} cy={arcPt(endAngle).y} r={strokeW / 2 + 1} fill={color} />
        )}
        <SvgText x={cx} y={cy + 10} textAnchor="middle" fontSize={18} fontWeight="700" fill={color}>
          {isNum ? fmtPrice(level) : "—"}
        </SvgText>
      </Svg>
    </View>
  );
}

function CrossMarginSkeleton({ theme }) {
  const isDark = theme === "Dark";
  const screenWidth = Dimensions.get("window").width;
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <WalletShimmerCell width={180} height={22} borderRadius={4} />
      </View>
      <View style={[styles.summaryCard, { padding: 20, backgroundColor: isDark ? darkTheme.darkThemeInputColor : colors.white }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <WalletShimmerCell width={100} height={16} borderRadius={4} style={{ marginBottom: 8 }} />
            <WalletShimmerCell width={140} height={32} borderRadius={8} style={{ marginBottom: 6 }} />
            <WalletShimmerCell width={80} height={14} borderRadius={4} />
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <WalletShimmerCell width={60} height={20} borderRadius={10} style={{ marginBottom: 8 }} />
            <WalletShimmerCell width={80} height={20} borderRadius={10} />
          </View>
        </View>
        <View style={[styles.equityGrid, { marginTop: 20 }]}>
          <View style={{ flex: 1, gap: 6 }}>
            <WalletShimmerCell width={80} height={14} borderRadius={4} />
            <WalletShimmerCell width={100} height={20} borderRadius={4} />
            <WalletShimmerCell width={120} height={12} borderRadius={4} />
          </View>
          <View style={{ flex: 1, alignItems: "flex-end", gap: 6 }}>
            <WalletShimmerCell width={120} height={14} borderRadius={4} />
            <WalletShimmerCell width={100} height={20} borderRadius={4} />
            <WalletShimmerCell width={100} height={12} borderRadius={4} />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: isDark ? "#2C2C2E" : "#E5E7EB" }}>
          <WalletShimmerCell width={(screenWidth - 100) / 3} height={36} borderRadius={18} />
          <WalletShimmerCell width={(screenWidth - 100) / 3} height={36} borderRadius={18} />
          <WalletShimmerCell width={(screenWidth - 100) / 3} height={36} borderRadius={18} />
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 20, marginTop: 20 }}>
        <WalletShimmerCell width={60} height={20} borderRadius={4} />
        <WalletShimmerCell width={80} height={20} borderRadius={4} />
      </View>

      <View style={[styles.filtersRow, { marginTop: 20 }]}>
        <WalletShimmerCell width={screenWidth - 40} height={42} borderRadius={12} />
      </View>

      <View style={{ marginTop: 20, gap: 16 }}>
        {[1, 2, 3, 4].map(i => (
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
    </View>
  );
}

const CrossMarginWalletTab = ({ theme, themeColors, buildCoinIconUri }) => {
  const isDark = theme === "Dark";
  const mutedColor = themeColors.secondaryText;
  const sectionLabelColor = isDark ? colors.white : DISCLAIMTEXT;

  const [account, setAccount] = useState(null);
  const [debts, setDebts] = useState([]);
  const [positions, setPositions] = useState([]);
  const [risk, setRisk] = useState(null);
  const [pnlData, setPnlData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("funds"); // funds | positions
  const [search, setSearch] = useState("");
  const [hideSmall, setHideSmall] = useState(false);
  const [debtOnly, setDebtOnly] = useState(false);

  const [pnlPeriod, setPnlPeriod] = useState("24h");

  const [selectedRowPopup, setSelectedRowPopup] = useState(null); // { type: "fund"|"position", data: row }
  const detailSheetRef = useRef(null);

  const fetchPnl = useCallback(async (period) => {
    try {
      const pnlRes = await appOperation.get(`cross/pnl?period=${period}`, undefined, undefined, CUSTOMER_TYPE).catch(() => null);
      if (pnlRes?.success) setPnlData(pnlRes.data);
    } catch (e) { }
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [accRes, debtsRes, posRes, riskRes] = await Promise.all([
        appOperation.get("cross/account", undefined, undefined, CUSTOMER_TYPE).catch(() => null),
        appOperation.get("cross/debts", undefined, undefined, CUSTOMER_TYPE).catch(() => null),
        appOperation.get("cross/positions", undefined, undefined, CUSTOMER_TYPE).catch(() => null),
        appOperation.get("cross/risk", undefined, undefined, CUSTOMER_TYPE).catch(() => null),
      ]);

      if (accRes?.success) setAccount(accRes.data);
      if (debtsRes?.success) setDebts(debtsRes.data?.debts ?? []);
      if (posRes?.success) setPositions(posRes.data?.positions ?? []);
      if (riskRes?.success) setRisk(riskRes.data);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchAll();
      const timer = setTimeout(() => {
        if (active) fetchAll();
      }, 1500);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }, [fetchAll])
  );

  useEffect(() => {
    fetchPnl(pnlPeriod);
  }, [pnlPeriod, fetchPnl]);

  const debtByAsset = useMemo(() => {
    const map = {};
    debts.forEach(d => { map[d.asset] = d; });
    return map;
  }, [debts]);

  const assets = account?.assets ?? [];
  const riskStatus = risk?.status ?? account?.status ?? null;
  const totalBalanceUsdt = risk?.total_asset_value ?? risk?.total_balance_usdt ?? null;
  const marginLevel = risk?.margin_level != null ? parseFloat(risk.margin_level) : null;
  const accountEquityUsd = risk?.net_equity ?? risk?.account_equity_usd ?? null;
  const totalDebtUsd = risk?.total_liability ?? risk?.total_debt_usd ?? null;
  const remainingBorrow = risk?.remaining_borrow_value != null ? parseFloat(risk.remaining_borrow_value) : null;
  const fallbackDebt = debts.reduce((s, d) => s + parseFloat(d.principal || 0) + parseFloat(d.interest_accrued || 0), 0);
  const displayTotalDebt = totalDebtUsd != null ? totalDebtUsd : fallbackDebt;

  const marginCallLevel = risk?.margin_call_level != null ? parseFloat(risk.margin_call_level) : (account?.warning_margin_rate ? 1 + parseFloat(account.warning_margin_rate) : 1.15);
  const liquidationLevel = risk?.liquidation_level != null ? parseFloat(risk.liquidation_level) : (account?.maintenance_margin_rate ? 1 + parseFloat(account.maintenance_margin_rate) : 1.10);

  const pnlNetRealized = pnlData?.net_realized_pnl != null ? parseFloat(pnlData.net_realized_pnl) : null;
  const pnlUnrealized = pnlData?.unrealized_pnl != null ? parseFloat(pnlData.unrealized_pnl) : null;
  const pnlRealized = pnlData?.realized_pnl != null ? parseFloat(pnlData.realized_pnl) : null;
  const pnlInterest = pnlData?.interest_paid != null ? parseFloat(pnlData.interest_paid) : null;
  const pnlClosedCount = pnlData?.closed_positions ?? null;

  const filteredFunds = useMemo(() => {
    let rows = assets;
    if (debtOnly) {
      rows = rows.filter((r) => parseFloat(r.borrowed) > 0);
    }
    if (hideSmall) {
      rows = rows.filter((r) => parseFloat(r.balance) > 0 || parseFloat(r.borrowed) > 0);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => (r.asset || "").toLowerCase().includes(q));
    }
    return rows;
  }, [assets, search, hideSmall, debtOnly]);

  const filteredPositions = useMemo(() => {
    let rows = positions;
    if (hideSmall) {
      rows = rows.filter((r) => Math.abs(parseFloat(r.net_quantity || 0)) > 0.00001);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => (r.asset || "").toLowerCase().includes(q));
    }
    return rows;
  }, [positions, search, hideSmall]);

  if (loading && !account) {
    return <CrossMarginSkeleton theme={theme} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <AppText weight={SEMI_BOLD} type={EIGHTEEN} color={themeColors.text}>Cross Margin Account</AppText>
      </View>

      <TotalAssetsCard
        style={{ marginTop: 12 }}
        title="Total Balance"
        amount={totalBalanceUsdt != null ? fmt(totalBalanceUsdt, 2) : "0.00"}
        currency="USDT"
        usdAmount={totalBalanceUsdt != null ? fmtPrice(totalBalanceUsdt) : "0.00"}
        pnlAmount={pnlNetRealized != null ? `${pnlNetRealized >= 0 ? "" : "-"}${Math.abs(pnlNetRealized).toFixed(2)}` : "0.00"}
        pnlPercentage="0.00%"
        imageSource={marginWalletImg}
        topRightBadge={
          <View style={{ alignItems: "flex-end" }}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: colors.cyanTheme, marginBottom: 5 }}>
              Cross {risk?.max_leverage ?? account?.max_leverage ?? "—"}x
            </AppText>
            {riskStatus ? (
              <View style={[styles.statusBadge, { backgroundColor: riskStatus === "NORMAL" ? colors.green : riskStatus === "MARGIN_CALL" ? "#f59e0b" : colors.red }]}>
                <AppText type={TWELVE} style={{ color: colors.white }} weight={SEMI_BOLD}>{riskStatus}</AppText>
              </View>
            ) : null}
          </View>
        }
      />

      <View style={[styles.summaryCard, { backgroundColor: theme === 'Dark' ? themeColors.background : colors.white }]}>
        <View style={styles.equityGrid}>
          <View style={{ flex: 1 }}>
            <AppText type={TWELVE} color={sectionLabelColor}>Margin Level</AppText>
            <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: marginLevel != null && marginLevel < 1.1 ? colors.red : marginLevel != null && marginLevel < 1.3 ? "#f59e0b" : themeColors.text }}>
              {marginLevel != null ? fmt(marginLevel, 4) : "—"}
            </AppText>
            <AppText type={TWELVE} color={sectionLabelColor} style={{ marginTop: 2 }}>
              Call at {fmtPrice(marginCallLevel)} · Liq. at {fmtPrice(liquidationLevel)}
            </AppText>
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <AppText type={TWELVE} color={sectionLabelColor}>Account Equity (USDT)</AppText>
            <AppText type={SIXTEEN} weight={SEMI_BOLD} color={themeColors.text}>{accountEquityUsd != null ? fmt(accountEquityUsd, 4) : "—"}</AppText>
            {accountEquityUsd != null && (
              <AppText type={TWELVE} color={sectionLabelColor} style={{ marginTop: 2 }}>
                ≈ ${fmtPrice(accountEquityUsd)}
              </AppText>
            )}
          </View>
        </View>
        <View style={[styles.equityGrid, { marginTop: 10 }]}>
          <View style={{ flex: 1 }}>
            <AppText type={TWELVE} color={sectionLabelColor}>Total Debt (USDT)</AppText>
            <AppText type={SIXTEEN} weight={SEMI_BOLD} color={themeColors.text}>{displayTotalDebt > 0 ? fmt(displayTotalDebt, 4) : "—"}</AppText>
            {displayTotalDebt > 0 && (
              <AppText type={TWELVE} color={sectionLabelColor} style={{ marginTop: 2 }}>
                ≈ ${fmtPrice(displayTotalDebt)}
              </AppText>
            )}
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <AppText type={TWELVE} color={sectionLabelColor}>Remaining Borrowable (USDT)</AppText>
            <AppText type={SIXTEEN} weight={SEMI_BOLD} color={themeColors.text}>{remainingBorrow != null ? fmt(remainingBorrow, 4) : "—"}</AppText>
            {remainingBorrow != null && (
              <AppText type={TWELVE} color={sectionLabelColor} style={{ marginTop: 2 }}>
                ≈ ${fmtPrice(remainingBorrow)}
              </AppText>
            )}
          </View>
        </View>

        {/* Gauge Row */}
        <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: themeColors.border, paddingTop: 14 }}>
          <AppText type={FOURTEEN} weight={BOLD} color={themeColors.text} style={{ marginBottom: 10 }}>Margin Level</AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <MarginLevelGauge
              level={marginLevel}
              mmr={liquidationLevel}
              warningRate={marginCallLevel}
              isDark={isDark}
            />
            <View>
              <AppText type={SIXTEEN} weight={BOLD} style={{ color: marginLevel != null && marginLevel < 1.1 ? colors.red : marginLevel != null && marginLevel < 1.3 ? "#f59e0b" : themeColors.text }}>
                {marginLevel != null ? fmt(marginLevel, 4) : "—"}
              </AppText>
              <AppText type={TWELVE} color={sectionLabelColor} style={{ marginTop: 2 }}>
                Call at {fmtPrice(marginCallLevel)} · Liq. at {fmtPrice(liquidationLevel)}
              </AppText>
            </View>
          </View>
        </View>

        {/* PnL Row */}
        <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: themeColors.border, paddingTop: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <AppText type={FOURTEEN} weight={BOLD} color={themeColors.text}>PnL</AppText>
            <View style={{ flexDirection: "row", gap: 4 }}>
              {["24h", "7d", "30d", "all"].map((p) => {
                const isActive = pnlPeriod === p;
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setPnlPeriod(p)}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 4,
                      backgroundColor: isActive
                        ? (isDark ? colors.white : colors.black)
                        : (isDark ? themeColors.themeElevationColor : colors.iconBgColor),
                    }}
                  >
                    <AppText
                      type={TWELVE}
                      weight={SEMI_BOLD}
                      style={{ color: isActive ? (isDark ? colors.black : colors.white) : themeColors.text }}
                    >
                      {p === "all" ? "All" : p}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {pnlData ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 12 }}>
              {[
                { label: "Net Realized PnL", value: pnlNetRealized },
                { label: "Unrealized PnL", value: pnlUnrealized },
                { label: "Realized PnL", value: pnlRealized },
                { label: "Interest Paid", value: pnlInterest, invert: true },
              ].map(({ label, value, invert }) => {
                const n = value ?? 0;
                const isPos = invert ? n <= 0 : n >= 0;
                const color = n === 0 ? mutedColor : isPos ? colors.green : colors.red;
                return (
                  <View key={label} style={{ width: "50%" }}>
                    <AppText type={TWELVE} color={mutedColor}>{label}</AppText>
                    <AppText type={FOURTEEN} weight={BOLD} style={{ color, marginTop: 2 }}>
                      {n >= 0 ? "+" : ""}{fmt(n, 4)} USDT
                    </AppText>
                  </View>
                );
              })}
              {pnlClosedCount != null && (
                <View style={{ width: "100%", marginTop: 4 }}>
                  <AppText type={TWELVE} color={mutedColor}>
                    {pnlClosedCount} position{pnlClosedCount !== 1 ? "s" : ""} closed in this period
                  </AppText>
                </View>
              )}
            </View>
          ) : (
            <AppText type={TWELVE} color={mutedColor}>Loading PnL…</AppText>
          )}
        </View>

        {/* Action Buttons Row */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: themeColors.border }}>
          <TouchableOpacity
            style={{ flex: 1.5, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: theme === 'Dark' ? themeColors.themeElevationColor : colors.iconBgColor }}
            onPress={() => {
              const firstDebt = assets.find((a) => parseFloat(a.borrowed) > 0);
              const firstAsset = assets.find((a) => parseFloat(a.balance) > 0);
              const targetAsset = firstDebt || firstAsset;
              if (targetAsset) {
                NavigationService.navigate(MARGIN_BORROW_REPAY_SCREEN, {
                  marginMode: "Cross",
                  coin: targetAsset.asset,
                  activeTab: firstDebt ? "Repay" : "Borrow",
                });
              } else {
                Toast.showWithGravity("No assets available.", Toast.SHORT, Toast.BOTTOM);
              }
            }}
          >
            <AppText type={FOURTEEN} weight={SEMI_BOLD} color={themeColors.text}>Borrow / Repay</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: theme === 'Dark' ? themeColors.themeElevationColor : colors.iconBgColor }}
            onPress={() => NavigationService.navigate(MARGIN_TRANSFER_SCREEN, { fromWalletType: "spot", toWalletType: "cross_margin" })}
          >
            <AppText type={FOURTEEN} weight={SEMI_BOLD} color={themeColors.text}>Transfer</AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <View style={{ flexDirection: "row", gap: 18, alignItems: "flex-end" }}>
          <TouchableOpacity onPress={() => { setActiveTab("funds"); setSearch(""); setHideSmall(false); setDebtOnly(false); }} style={{ alignItems: "center" }}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} color={activeTab === "funds" ? themeColors.text : mutedColor}>Funds</AppText>
            <View style={[styles.tabUnderline, {
              backgroundColor: activeTab === "funds" ? isDark ? colors.white : colors.black : "transparent",
            }]} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setActiveTab("positions"); setSearch(""); setHideSmall(false); setDebtOnly(false); }} style={{ alignItems: "center" }}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} color={activeTab === "positions" ? themeColors.text : mutedColor}>Positions</AppText>
            <View style={[styles.tabUnderline, { backgroundColor: activeTab === "positions" ? isDark ? colors.white : colors.black : "transparent" }]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersRow}>
        <View style={[styles.searchBox, { backgroundColor: theme === 'Dark' ? darkTheme.darkThemeInputColor : '#F7F7F7' }]}>
          <FastImage source={searchIcon} style={styles.searchIcon} resizeMode="contain" tintColor={themeColors.secondaryText} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={activeTab === "funds" ? "Search asset" : "Search coin"}
            placeholderTextColor={themeColors.secondaryText}
            cursorColor={theme === 'Dark' ? colors.white : colors.black}
            style={[styles.searchInput, { color: themeColors.text }]}
            returnKeyType="search"
          />
        </View>
      </View>

      <View style={styles.checkboxesRow}>
        <TouchableOpacity style={styles.checkboxWrapper} onPress={() => setHideSmall((v) => !v)}>
          <View style={styles.checkbox}>
            {hideSmall ? <FastImage source={checkIc} style={styles.checkIcon} tintColor={theme === 'Dark' ? colors.white : colors.buttonBg} /> : null}
          </View>
          <AppText type={TWELVE} color={sectionLabelColor}>{activeTab === "funds" ? "Hide small balances" : "Hide low positions"}</AppText>
        </TouchableOpacity>

        {activeTab === "funds" && (
          <TouchableOpacity style={styles.checkboxWrapper} onPress={() => setDebtOnly((v) => !v)}>
            <View style={styles.checkbox}>
              {debtOnly ? <FastImage source={checkIc} style={styles.checkIcon} tintColor={theme === 'Dark' ? colors.white : colors.buttonBg} /> : null}
            </View>
            <AppText type={TWELVE} color={sectionLabelColor}>Only show debts</AppText>
          </TouchableOpacity>
        )}
      </View>

      {/* Lists */}
      {activeTab === "funds" ? (
        <FlatList
          data={filteredFunds}
          keyExtractor={(item) => item.asset}
          style={{ marginTop: 10 }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          renderItem={({ item, index }) => {
            const hasBorrow = parseFloat(item.borrowed) > 0;
            const debt = debtByAsset[item.asset] || null;
            const totalBal = (parseFloat(item.balance || 0) + parseFloat(item.locked || 0)).toString();
            const isLast = index === filteredFunds.length - 1;
            return (
              <View style={[styles.row, { borderBottomColor: themeColors.border }, isLast && { borderBottomWidth: 0 }]}>
                <View style={styles.rowLeft}>
                  <View>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} color={themeColors.text}>{item.asset}</AppText>
                    {debt?.interest_accrued && parseFloat(debt.interest_accrued) > 0 && (
                      <AppText type={TWELVE} color={colors.red} style={{ marginTop: 2 }}>+{fmt(debt.interest_accrued)} interest</AppText>
                    )}
                  </View>
                </View>

                <View style={styles.rowRight}>
                  <View style={{ alignItems: "flex-end", marginRight: 10 }}>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} color={themeColors.text}>{fmt(totalBal)}</AppText>
                    <AppText type={TWELVE} color={hasBorrow ? colors.red : mutedColor}>
                      {hasBorrow ? `Borrow: ${fmt(item.borrowed)}` : `Avail: ${fmt(item.balance)}`}
                    </AppText>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedRowPopup({ type: "fund", data: { ...item, debt } });
                      detailSheetRef.current?.open();
                    }}
                    style={styles.moreBtn}
                  >
                    <FastImage source={moreOption} style={styles.moreIcon} resizeMode="contain" tintColor={theme === 'Dark' ? colors.white : colors.black} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <FastImage source={NO_NOTIFICATION_ICON} style={styles.emptyIcon} resizeMode="contain" />
              <AppText type={TWELVE} weight={SEMI_BOLD} color={mutedColor}>No Funds Found</AppText>
            </View>
          )}
          ListFooterComponent={() => <View style={{ height: 120 }} />}
        />
      ) : (
        <FlatList
          data={filteredPositions}
          keyExtractor={(item) => item.position_id || item.asset}
          style={{ marginTop: 10 }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          renderItem={({ item, index }) => {
            const isLong = item.side === "LONG";
            const sideColor = isLong ? colors.green : colors.red;
            const valNum = parseFloat(item.value_usdt || 0);
            const pnl = parseFloat(item.unrealized_pnl || 0);
            const roe = parseFloat(item.roe_pct || 0);
            const pnlColorText = pnl >= 0 ? "GREEN" : "RED";
            const sideColorText = isLong ? "GREEN" : "RED";
            const assetRow = assets.find((a) => a.asset === item.asset);
            const debt = debtByAsset[item.asset] || null;
            const isLast = index === filteredPositions.length - 1;

            return (
              <View style={[styles.row, { borderBottomColor: themeColors.border }, isLast && { borderBottomWidth: 0 }]}>
                <View style={styles.rowLeft}>
                  <View style={{ gap: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <AppText type={FOURTEEN} weight={SEMI_BOLD} color={themeColors.text}>{item.asset}</AppText>
                      <View style={[styles.sideBadge, { borderColor: sideColor }]}>
                        <AppText type={TWELVE} color={sideColorText} weight={SEMI_BOLD}>{isLong ? "L" : "S"}</AppText>
                      </View>
                    </View>
                    <AppText type={TWELVE} color={mutedColor}>Mark: {fmt(item.mark_price, 2)}</AppText>
                    <AppText type={TWELVE} color={pnlColorText}>
                      {pnl >= 0 ? "+" : ""}{fmt(pnl, 4)} ({roe >= 0 ? "+" : ""}{fmtPrice(roe)}%)
                    </AppText>
                  </View>
                </View>

                <View style={styles.rowRight}>
                  <View style={{ alignItems: "center", marginRight: 15 }}>
                    <AppText type={FOURTEEN} color={sideColorText}>
                      {fmt(item.value_usdt, 2)}
                    </AppText>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedRowPopup({ type: "position", data: { ...item, assetRow, debt } });
                      detailSheetRef.current?.open();
                    }}
                    style={styles.moreBtn}
                  >
                    <FastImage source={moreOption} style={styles.moreIcon} resizeMode="contain" tintColor={theme === "Dark" ? colors.white : colors.black} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <FastImage source={NO_NOTIFICATION_ICON} style={styles.emptyIcon} resizeMode="contain" />
              <AppText type={TWELVE} weight={SEMI_BOLD} color={mutedColor}>No Positions Found</AppText>
            </View>
          )}
          ListFooterComponent={() => <View style={{ height: 120 }} />}
        />
      )}

      <CrossMarginDetailSheet
        ref={detailSheetRef}
        theme={theme}
        themeColors={themeColors}
        rowPopup={selectedRowPopup}
        assets={assets}
        debtByAsset={debtByAsset}
        buildCoinIconUri={buildCoinIconUri}
        onSuccess={fetchAll}
      />


    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18, flex: 1 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  transferBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, alignItems: "center" },
  summaryCard: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  summaryValueRow: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  equityGrid: { flexDirection: "row", marginTop: 15 },
  tabsRow: { marginTop: 18 },
  tabUnderline: { marginTop: 6, height: 3, width: 22, borderRadius: 2 },
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
  sideBadge: { borderWidth: 1, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  emptyContainer: { alignItems: "center", marginTop: 40, gap: 10 },
  emptyIcon: { width: 80, height: 80 },
});

export default CrossMarginWalletTab;
