import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { View, TouchableOpacity, FlatList, TextInput, StyleSheet, Dimensions } from "react-native";
import FastImage from "react-native-fast-image";
import { AppText, EIGHTEEN, FIFTEEN, FOURTEEN, SEMI_BOLD, SIXTEEN, TWELVE, TWENTY_SIX } from "../../../shared";
import { colors, darkTheme } from "../../../theme/colors";
import { appOperation } from "../../../appOperation";
import { CUSTOMER_TYPE } from "../../../appOperation/types";
import { searchIcon, checkIc, NO_NOTIFICATION_ICON, moreOption } from "../../../helper/ImageAssets";
import NavigationService from "../../../navigation/NavigationService";
import { MARGIN_TRANSFER_SCREEN, FUTURES_SCREEN } from "../../../navigation/routes";
import { useFocusEffect } from "@react-navigation/native";
import RBSheet from "react-native-raw-bottom-sheet";
import WalletShimmerCell from "../WalletShimmerCell";

function parseBal(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function fmt(val, decimals = 8) {
  const n = parseBal(val);
  if (n === 0) return "0.00";
  return parseFloat(n.toFixed(decimals)).toString();
}

function accountInUse(acc) {
  return parseBal(acc?.locked_balance) + parseBal(acc?.isolated_reserved);
}

function accountTotal(acc) {
  return parseBal(acc?.available_balance) + accountInUse(acc);
}

function FuturesSkeleton({ theme }) {
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
        </View>
        <View style={[styles.equityGrid, { marginTop: 20 }]}>
          <View style={{ flex: 1, gap: 6 }}>
            <WalletShimmerCell width={80} height={14} borderRadius={4} />
            <WalletShimmerCell width={100} height={20} borderRadius={4} />
          </View>
          <View style={{ flex: 1, alignItems: "flex-end", gap: 6 }}>
            <WalletShimmerCell width={120} height={14} borderRadius={4} />
            <WalletShimmerCell width={100} height={20} borderRadius={4} />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: isDark ? "#2C2C2E" : "#E5E7EB" }}>
          <WalletShimmerCell width={(screenWidth - 50) / 2} height={36} borderRadius={18} />
          <WalletShimmerCell width={(screenWidth - 50) / 2} height={36} borderRadius={18} />
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

const SheetDetailRow = ({ label, value, valueColor, themeColors }) => (
  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
    <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText }}>{label}</AppText>
    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: valueColor || themeColors.text }}>{value}</AppText>
  </View>
);

const FuturesDetailSheetContent = ({ rowPopup, themeColors, theme, onTrade, onTransfer }) => {
  if (!rowPopup) return null;
  const isPos = rowPopup.type === "position";
  const isDark = theme === "Dark";

  if (isPos) {
    const item = rowPopup.data;
    const pnl = parseFloat(item.unrealized_pnl || 0);
    const pnlColorText = pnl >= 0 ? colors.green : colors.red;
    const realizedPnl = parseFloat(item.realized_pnl || 0);

    return (
      <View style={{ paddingHorizontal: 20, paddingBottom: 24, backgroundColor: themeColors.background }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#E5E7EB", alignItems: "center", justifyContent: "center" }}>
            <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{item.symbol?.charAt(0) || "F"}</AppText>
          </View>
          <View>
            <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{item.symbol}</AppText>
            <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText }}>{item.side} · {item.leverage}x</AppText>
          </View>
        </View>

        <View style={{ marginTop: 24 }}>
          <AppText type={TWENTY_SIX} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{fmt(item.quantity)}</AppText>
          <AppText type={FOURTEEN} style={{ color: pnlColorText, marginTop: 4 }}>
            {pnl >= 0 ? "+" : ""}{fmt(pnl, 2)} USDT PnL
          </AppText>
        </View>

        <View style={{ marginTop: 20, gap: 16 }}>
          <SheetDetailRow label="Entry Price" value={fmt(item.average_entry_price, 2)} themeColors={themeColors} />
          <SheetDetailRow label="Liq. Price" value={fmt(item.liquidation_price, 2)} themeColors={themeColors} />
          <SheetDetailRow label="Margin" value={`${fmt(item.initial_margin, 2)} USDT`} themeColors={themeColors} />
          <SheetDetailRow
            label="Realized PnL"
            value={`${realizedPnl >= 0 ? "+" : ""}${fmt(item.realized_pnl, 2)} USDT`}
            valueColor={realizedPnl >= 0 ? colors.green : colors.red}
            themeColors={themeColors}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginTop: 30 }}>
          <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: isDark ? themeColors.themeElevationColor : colors.iconBgColor }]} onPress={onTrade}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>Trade</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: isDark ? themeColors.themeElevationColor : colors.iconBgColor }]} onPress={() => onTransfer("USDT")}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>Transfer</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const acc = rowPopup.data;
  const statusColor = acc.account_status === "ACTIVE" ? colors.green : themeColors.text;

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 24, backgroundColor: themeColors.background }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#E5E7EB", alignItems: "center", justifyContent: "center" }}>
          <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{acc.margin_asset?.charAt(0) || "F"}</AppText>
        </View>
        <View>
          <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{acc.margin_asset || "—"}</AppText>
          <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText }}>Futures Margin</AppText>
        </View>
      </View>

      <View style={{ marginTop: 24 }}>
        <AppText type={TWENTY_SIX} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{fmt(accountTotal(acc))}</AppText>
        <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText, marginTop: 4 }}>{acc.margin_asset || "USDT"} Total Balance</AppText>
      </View>

      <View style={{ marginTop: 20, gap: 16 }}>
        <SheetDetailRow label="Available" value={fmt(acc.available_balance)} themeColors={themeColors} />
        <SheetDetailRow label="Isolated Reserved" value={fmt(acc.isolated_reserved)} themeColors={themeColors} />
        <SheetDetailRow label="In Order" value={fmt(acc.locked_balance)} themeColors={themeColors} />
        <SheetDetailRow label="Status" value={acc.account_status || "—"} valueColor={statusColor} themeColors={themeColors} />
      </View>

      <View style={{ flexDirection: "row", gap: 12, marginTop: 30 }}>
        <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: isDark ? themeColors.themeElevationColor : colors.iconBgColor }]} onPress={onTrade}>
          <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>Trade</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: isDark ? themeColors.themeElevationColor : colors.iconBgColor }]} onPress={() => onTransfer(acc.margin_asset || "USDT")}>
          <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>Transfer</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const FuturesWalletTab = ({ theme, themeColors }) => {
  const isDark = theme === "Dark";
  const [accounts, setAccounts] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("assets"); // assets | positions
  const [search, setSearch] = useState("");
  const [hideSmall, setHideSmall] = useState(false);

  const [selectedRowPopup, setSelectedRowPopup] = useState(null); // { type: "asset"|"position", data: row }
  const detailSheetRef = useRef(null);

  const fetchAll = useCallback(async () => {
    try {
      const [accRes, posRes] = await Promise.all([
        appOperation.get("futures/account", undefined, undefined, CUSTOMER_TYPE).catch(() => null),
        appOperation.get("futures/positions/open", undefined, undefined, CUSTOMER_TYPE).catch(() => null),
      ]);

      if (accRes?.success) {
        const accData = Array.isArray(accRes.data) ? accRes.data : (accRes.data?.accounts ?? []);
        console.log("Futures Assets Data:", JSON.stringify(accData, null, 2));
        setAccounts(accData);
      }
      if (posRes?.success) {
        const posData = Array.isArray(posRes.data) ? posRes.data : (posRes.data?.positions ?? []);
        console.log("Futures Positions Data:", JSON.stringify(posData, null, 2));
        setPositions(posData);
      }
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

  const totalAvailable = useMemo(() => accounts.reduce((s, a) => s + parseBal(a.available_balance), 0), [accounts]);
  const totalLocked = useMemo(() => accounts.reduce((s, a) => s + parseBal(a.locked_balance), 0), [accounts]);
  const totalIsolatedReserved = useMemo(() => accounts.reduce((s, a) => s + parseBal(a.isolated_reserved), 0), [accounts]);
  const totalWalletBalance = useMemo(() => accounts.reduce((s, a) => s + accountTotal(a), 0), [accounts]);
  const totalUnrealizedPnl = useMemo(() => positions.reduce((s, p) => s + parseFloat(p.unrealized_pnl ?? 0), 0), [positions]);

  const filteredAssets = useMemo(() => {
    let rows = accounts;
    if (hideSmall) {
      rows = rows.filter((r) => accountTotal(r) > 0);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => (r.margin_asset || "").toLowerCase().includes(q));
    }
    return rows;
  }, [accounts, search, hideSmall]);

  const filteredPositions = useMemo(() => {
    let rows = positions;
    if (hideSmall) {
      rows = rows.filter((r) => parseFloat(r.quantity || 0) > 0);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => (r.symbol || "").toLowerCase().includes(q));
    }
    return rows;
  }, [positions, search, hideSmall]);

  if (loading && accounts.length === 0 && positions.length === 0) {
    return <FuturesSkeleton theme={theme} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <AppText weight={SEMI_BOLD} type={EIGHTEEN} style={{ color: themeColors.text }}>Futures Wallet</AppText>
      </View>

      {/* Summary Card */}
      <View style={[styles.summaryCard, {
        backgroundColor: isDark ? "transparent" : colors.white,
        borderWidth: 0, borderColor: themeColors.border
      }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <AppText type={SIXTEEN} style={{ color: themeColors.secondaryText }} weight={SEMI_BOLD}>Total Assets</AppText>
            <View style={styles.summaryValueRow}>
              <AppText type={TWENTY_SIX} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{fmt(totalWalletBalance, 2)} </AppText>
              <AppText type={FIFTEEN} style={{ color: themeColors.secondaryText, top: 5 }}>USDT</AppText>
            </View>
            <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText }}>≈ ${fmt(totalWalletBalance, 2)} USD</AppText>
          </View>
        </View>

        <View style={{ marginTop: 15 }}>
          <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>Unrealized PNL</AppText>
          <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: totalUnrealizedPnl >= 0 ? colors.green : colors.red }}>
            {totalUnrealizedPnl >= 0 ? "+" : ""}{totalUnrealizedPnl.toFixed(2)} USDT
          </AppText>
        </View>

        <View style={[styles.equityGrid, { marginTop: 15 }]}>
          <View style={{ flex: 1 }}>
            <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>Available Balance</AppText>
            <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{fmt(totalAvailable, 2)} USDT</AppText>
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>In Use</AppText>
            <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{fmt(totalLocked + totalIsolatedReserved, 2)} USDT</AppText>
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: themeColors.border }}>
          <TouchableOpacity
            style={{ flex: 1.5, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: isDark ? themeColors.themeElevationColor : colors.iconBgColor }}
            onPress={() => NavigationService.navigate(FUTURES_SCREEN)}
          >
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>Trade</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: isDark ? themeColors.themeElevationColor : colors.iconBgColor }}
            onPress={() => NavigationService.navigate(MARGIN_TRANSFER_SCREEN, { fromWalletType: "spot", toWalletType: "futures", coin: "USDT" })}
          >
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>Transfer</AppText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <View style={{ flexDirection: "row", gap: 18, alignItems: "flex-end" }}>
          <TouchableOpacity onPress={() => { setActiveTab("assets"); setSearch(""); setHideSmall(false); }} style={{ alignItems: "center" }}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: activeTab === "assets" ? themeColors.text : themeColors.secondaryText }}>Assets</AppText>
            <View style={[styles.tabUnderline, { backgroundColor: activeTab === "assets" ? (isDark ? colors.white : colors.black) : "transparent" }]} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setActiveTab("positions"); setSearch(""); setHideSmall(false); }} style={{ alignItems: "center" }}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: activeTab === "positions" ? themeColors.text : themeColors.secondaryText }}>Positions</AppText>
            <View style={[styles.tabUnderline, { backgroundColor: activeTab === "positions" ? (isDark ? colors.white : colors.black) : "transparent" }]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersRow}>
        <View style={[styles.searchBox, { backgroundColor: isDark ? darkTheme.darkThemeInputColor : '#F7F7F7' }]}>
          <FastImage source={searchIcon} style={styles.searchIcon} resizeMode="contain" tintColor={themeColors.secondaryText} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={activeTab === "assets" ? "Search asset" : "Search contract"}
            placeholderTextColor={themeColors.secondaryText}
            cursorColor={isDark ? colors.white : colors.black}
            style={[styles.searchInput, { color: themeColors.text }]}
            returnKeyType="search"
          />
        </View>
      </View>

      <View style={styles.checkboxesRow}>
        <TouchableOpacity style={styles.checkboxWrapper} onPress={() => setHideSmall((v) => !v)}>
          <View style={styles.checkbox}>
            {hideSmall ? <FastImage source={checkIc} style={styles.checkIcon} tintColor={isDark ? colors.white : colors.buttonBg} /> : null}
          </View>
          <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>{activeTab === "assets" ? "Hide small balances" : "Hide small positions"}</AppText>
        </TouchableOpacity>
      </View>

      {/* Lists */}
      {activeTab === "assets" ? (
        <FlatList
          data={filteredAssets}
          keyExtractor={(item) => item.account_id ?? item.margin_asset}
          style={{ marginTop: 10 }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          renderItem={({ item, index }) => {
            const isLast = index === filteredAssets.length - 1;
            return (
              <View style={[styles.row, { borderBottomColor: themeColors.border }, isLast && { borderBottomWidth: 0 }]}>
                <View style={styles.rowLeft}>
                  <View>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{item.margin_asset || "—"}</AppText>
                    <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 2 }}>Futures Margin</AppText>
                  </View>
                </View>

                <View style={styles.rowRight}>
                  <View style={{ alignItems: "flex-end", marginRight: 10 }}>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{fmt(accountTotal(item))}</AppText>
                    <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>
                      Avail: {fmt(item.available_balance)}
                    </AppText>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedRowPopup({ type: "asset", data: item });
                      detailSheetRef.current?.open();
                    }}
                    style={styles.moreBtn}
                  >
                    <FastImage source={moreOption} style={styles.moreIcon} resizeMode="contain" tintColor={themeColors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <FastImage source={NO_NOTIFICATION_ICON} style={styles.emptyIcon} resizeMode="contain" />
              <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.secondaryText }}>No Assets Found</AppText>
            </View>
          )}
          ListFooterComponent={() => <View style={{ height: 120 }} />}
        />
      ) : (
        <FlatList
          data={filteredPositions}
          keyExtractor={(item) => item._id ?? item.symbol}
          style={{ marginTop: 10 }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          renderItem={({ item, index }) => {
            const isLong = item.side === "LONG";
            const sideColor = isLong ? colors.green : colors.red;
            const pnl = parseFloat(item.unrealized_pnl || 0);
            const pnlColorText = pnl >= 0 ? "GREEN" : "RED";
            const sideColorText = isLong ? "GREEN" : "RED";
            const isLast = index === filteredPositions.length - 1;

            return (
              <View style={[styles.row, { borderBottomColor: themeColors.border }, isLast && { borderBottomWidth: 0 }]}>
                <View style={styles.rowLeft}>
                  <View style={{ gap: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{item.symbol}</AppText>
                      <View style={[styles.sideBadge, { borderColor: sideColor }]}>
                        <AppText type={TWELVE} color={sideColorText} weight={SEMI_BOLD}>{item.leverage}x {item.side}</AppText>
                      </View>
                    </View>
                    <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>Mark: {fmt(item.mark_price, 2)}</AppText>
                  </View>
                </View>

                <View style={styles.rowRight}>
                  <View style={{ alignItems: "flex-end", marginRight: 15 }}>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
                      {fmt(item.quantity)}
                    </AppText>
                    <AppText type={TWELVE} color={pnlColorText}>
                      {pnl >= 0 ? "+" : ""}{fmt(pnl, 2)} USDT
                    </AppText>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedRowPopup({ type: "position", data: item });
                      detailSheetRef.current?.open();
                    }}
                    style={styles.moreBtn}
                  >
                    <FastImage source={moreOption} style={styles.moreIcon} resizeMode="contain" tintColor={themeColors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <FastImage source={NO_NOTIFICATION_ICON} style={styles.emptyIcon} resizeMode="contain" />
              <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.secondaryText }}>No Positions Found</AppText>
            </View>
          )}
          ListFooterComponent={() => <View style={{ height: 120 }} />}
        />
      )}

      <RBSheet
        ref={detailSheetRef}
        keyboardAvoidingViewEnabled={false}
        customModalProps={{ statusBarTranslucent: true }}
        closeOnDragDown={true}
        closeOnPressMask={true}
        height={450}
        animationType="fade"
        customStyles={{
          container: {
            backgroundColor: themeColors.background,
            height: 450,
            borderTopRightRadius: 24,
            borderTopLeftRadius: 24,
          },
          wrapper: { backgroundColor: "#0006" },
          draggableIcon: { backgroundColor: isDark ? "#444" : "#CCC", width: 40 },
        }}
      >
        <FuturesDetailSheetContent
          rowPopup={selectedRowPopup}
          themeColors={themeColors}
          theme={theme}
          onTrade={() => {
            detailSheetRef.current?.close();
            NavigationService.navigate(FUTURES_SCREEN);
          }}
          onTransfer={(coin) => {
            detailSheetRef.current?.close();
            NavigationService.navigate(MARGIN_TRANSFER_SCREEN, { fromWalletType: "spot", toWalletType: "futures", coin });
          }}
        />
      </RBSheet>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18, flex: 1 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryCard: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  summaryValueRow: { flexDirection: "row", alignItems: "center", marginTop: 5 },
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
  rowRight: { flexDirection: "row", alignItems: "center" },
  moreBtn: { paddingVertical: 6, paddingLeft: 6 },
  moreIcon: { width: 18, height: 18, transform: [{ rotate: "90deg" }] },
  sideBadge: { borderWidth: 1, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  emptyContainer: { alignItems: "center", marginTop: 40, gap: 10 },
  emptyIcon: { width: 80, height: 80 },
  sheetBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default FuturesWalletTab;
