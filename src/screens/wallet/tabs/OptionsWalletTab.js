import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  Dimensions,
} from "react-native";
import FastImage from "react-native-fast-image";
import RBSheet from "react-native-raw-bottom-sheet";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import {
  AppText,
  DISCLAIMTEXT,
  EIGHTEEN,
  FIFTEEN,
  FOURTEEN,
  SEMI_BOLD,
  SIXTEEN,
  TWELVE,
  TWENTY_SIX,
} from "../../../shared";
import { colors, darkTheme } from "../../../theme/colors";
import { appOperation } from "../../../appOperation";
import { IMAGE_BASE_URL } from "../../../helper/Constants";
import {
  searchIcon,
  checkIc,
  NO_NOTIFICATION_ICON,
  moreOption,
  eye_close_icon,
  eye_open_icon,
} from "../../../helper/ImageAssets";
import NavigationService from "../../../navigation/NavigationService";
import { FUTURES_SCREEN, MARGIN_TRANSFER_SCREEN, OPTIONS_PNL_ANALYSIS_SCREEN } from "../../../navigation/routes";
import useOptionsWebSocket from "../../Futures/OptionsTrade/hooks/useOptionsWebSocket";
import WalletShimmerCell from "../WalletShimmerCell";
import {
  decNum,
  normalizeOptionsPnlAnalysisData,
  resolveOptionsAccountUnrealizedPnl,
} from "../../Futures/OptionsTrade/helpers/optionsDataHelpers";

function parseBal(v) {
  return decNum(v);
}

function fmt(val, decimals = 4) {
  const n = parseBal(val);
  if (n === 0) return decimals >= 8 ? "0.00000000" : "0.0000";
  return parseFloat(n.toFixed(decimals)).toString();
}

function fmtUsd(val) {
  return `$${parseBal(val).toFixed(2)}`;
}

function pnlColor(val) {
  const n = parseBal(val);
  if (n > 0) return colors.green;
  if (n < 0) return colors.red;
  return colors.green;
}

function OptionsSkeleton({ theme }) {
  const screenWidth = Dimensions.get("window").width;
  return (
    <View style={styles.container}>
      <WalletShimmerCell width={180} height={22} borderRadius={4} />
      <View style={{ marginTop: 12, gap: 10 }}>
        <WalletShimmerCell width={120} height={16} borderRadius={4} />
        <WalletShimmerCell width={160} height={32} borderRadius={8} />
        <WalletShimmerCell width={100} height={14} borderRadius={4} />
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
        <WalletShimmerCell width={(screenWidth - 60) / 3} height={36} borderRadius={18} />
        <WalletShimmerCell width={(screenWidth - 60) / 3} height={36} borderRadius={18} />
        <WalletShimmerCell width={(screenWidth - 60) / 3} height={36} borderRadius={18} />
      </View>
    </View>
  );
}

const OptionsDetailSheetContent = ({ rowPopup, themeColors, theme, onTrade, onTransfer }) => {
  if (!rowPopup) return null;
  const isDark = theme === "Dark";

  if (rowPopup.type === "position") {
    const item = rowPopup.data;
    const upnl = parseBal(item.unrealized_pnl);

    return (
      <View style={{ paddingHorizontal: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#E5E7EB", alignItems: "center", justifyContent: "center" }}>
            <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{item.symbol?.charAt(0) || "O"}</AppText>
          </View>
          <View>
            <AppText type={EIGHTEEN} weight={SEMI_BOLD}>{item.symbol}</AppText>
            <AppText type={FOURTEEN} color={DISCLAIMTEXT}>{item.side || "—"} · {item.option_type || item.underlying || ""}</AppText>
          </View>
        </View>

        <View style={{ marginTop: 24 }}>
          <AppText type={TWENTY_SIX} weight={SEMI_BOLD}>{fmt(item.quantity, 4)}</AppText>
          <AppText type={FOURTEEN} style={{ color: pnlColor(upnl), marginTop: 4 }}>
            {upnl >= 0 ? "+" : ""}{fmt(upnl, 2)} USDT PnL
          </AppText>
        </View>

        <View style={{ marginTop: 20, gap: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} color={DISCLAIMTEXT}>Avg Price</AppText>
            <AppText type={FOURTEEN} weight={SEMI_BOLD}>{fmt(item.avg_price, 2)}</AppText>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <AppText type={FOURTEEN} color={DISCLAIMTEXT}>Mark Price</AppText>
            <AppText type={FOURTEEN} weight={SEMI_BOLD}>{fmt(item.mark_price, 2)}</AppText>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginTop: 30 }}>
          <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: isDark ? themeColors.themeElevationColor : colors.iconBgColor }]} onPress={onTrade}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>Trade</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const wallet = rowPopup.data;
  const availableBal = wallet?.available_balance ?? wallet?.available;
  const lockedBal = wallet?.locked_balance ?? wallet?.in_order;
  const walletTotal =
    parseBal(wallet?.total_balance) ||
    parseBal(wallet?.margin_balance) ||
    parseBal(availableBal) + parseBal(lockedBal);

  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#E5E7EB", alignItems: "center", justifyContent: "center" }}>
          <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{wallet?.asset?.charAt(0) || "U"}</AppText>
        </View>
        <View>
          <AppText type={EIGHTEEN} weight={SEMI_BOLD}>{wallet?.asset || "USDT"}</AppText>
          <AppText type={FOURTEEN} color={DISCLAIMTEXT}>Options Margin</AppText>
        </View>
      </View>

      <View style={{ marginTop: 24 }}>
        <AppText type={TWENTY_SIX} weight={SEMI_BOLD}>{fmt(walletTotal, 8)}</AppText>
        <AppText type={FOURTEEN} color={DISCLAIMTEXT} style={{ marginTop: 4 }}>Margin Balance</AppText>
      </View>

      <View style={{ marginTop: 20, gap: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <AppText type={FOURTEEN} color={DISCLAIMTEXT}>Available</AppText>
          <AppText type={FOURTEEN} weight={SEMI_BOLD}>{fmt(availableBal, 8)}</AppText>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <AppText type={FOURTEEN} color={DISCLAIMTEXT}>In Order</AppText>
          <AppText type={FOURTEEN} weight={SEMI_BOLD}>{fmt(lockedBal, 8)}</AppText>
        </View>
      </View>

      <View style={{ flexDirection: "row", marginTop: 30 }}>
        <TouchableOpacity
          style={[styles.sheetBtn, { backgroundColor: isDark ? themeColors.themeElevationColor : colors.iconBgColor }]}
          onPress={onTransfer}
        >
          <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>Transfer</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const OptionsWalletTab = ({ theme, themeColors }) => {
  const isDark = theme === "Dark";
  const [activeTab, setActiveTab] = useState("assets");
  const [showBalance, setShowBalance] = useState(true);
  const [walletData, setWalletData] = useState(null);
  const [positions, setPositions] = useState([]);
  const [dailyPnlCard, setDailyPnlCard] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [loadingPositions, setLoadingPositions] = useState(true);
  const [loadingDailyPnl, setLoadingDailyPnl] = useState(true);
  const [search, setSearch] = useState("");
  const [hideSmall, setHideSmall] = useState(false);
  const [selectedRowPopup, setSelectedRowPopup] = useState(null);
  const detailSheetRef = useRef(null);

  const isFocused = useIsFocused();
  const {
    accountUpdate,
    userPositions,
    isUserPositionsLoading,
  } = useOptionsWebSocket("", null, isFocused);

  const fetchWallet = useCallback(async () => {
    setLoadingWallet(true);
    try {
      const res = await appOperation.customer.optionsWallet();
      if (res?.success) setWalletData(res.data ?? null);
      else setWalletData(null);
    } catch {
      setWalletData(null);
    } finally {
      setLoadingWallet(false);
    }
  }, []);

  const fetchPositions = useCallback(async () => {
    setLoadingPositions(true);
    try {
      const res = await appOperation.customer.optionsOpenPositions();
      if (res?.success) {
        setPositions(Array.isArray(res.data) ? res.data : res.data?.positions ?? []);
      } else {
        setPositions([]);
      }
    } catch {
      setPositions([]);
    } finally {
      setLoadingPositions(false);
    }
  }, []);

  const fetchDailyPnl = useCallback(async () => {
    setLoadingDailyPnl(true);
    try {
      const res = await appOperation.customer.optionsPnlAnalysis({ period: "7d" });
      if (res?.success) {
        const normalized = normalizeOptionsPnlAnalysisData(res.data);
        setDailyPnlCard(normalized?.summary_cards?.daily ?? null);
      } else {
        setDailyPnlCard(null);
      }
    } catch {
      setDailyPnlCard(null);
    } finally {
      setLoadingDailyPnl(false);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchWallet(), fetchPositions(), fetchDailyPnl()]);
  }, [fetchWallet, fetchPositions, fetchDailyPnl]);

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

  const restAvailable = parseBal(walletData?.available_balance);
  const restInOrder = parseBal(walletData?.locked_balance);
  const restTotal = parseBal(walletData?.total_balance) || restAvailable + restInOrder;

  const hasLiveAccount = Boolean(accountUpdate);
  const available = parseBal(accountUpdate?.available_balance ?? restAvailable);
  const inOrder = parseBal(accountUpdate?.in_order ?? restInOrder);
  const totalEquity = parseBal(accountUpdate?.total_equity ?? restTotal);
  const marginBalance = parseBal(accountUpdate?.margin_balance ?? totalEquity);
  const walletTotal = available + inOrder;

  const wsPositionsReady = !isUserPositionsLoading;
  const restPositionsReady = !loadingPositions;
  const livePositions = wsPositionsReady && userPositions?.length ? userPositions : positions;
  const positionsReady = wsPositionsReady || restPositionsReady;

  const unrealizedPnl = wsPositionsReady
    ? resolveOptionsAccountUnrealizedPnl(accountUpdate, userPositions, true)
    : restPositionsReady
      ? resolveOptionsAccountUnrealizedPnl(accountUpdate, positions, true)
      : parseBal(accountUpdate?.unrealized_pnl ?? (totalEquity - walletTotal));

  const loading = !hasLiveAccount && loadingWallet && !walletData;
  const dailyPnl = parseBal(dailyPnlCard?.pnl_usdt);
  const dailyPnlPct = parseBal(dailyPnlCard?.pnl_pct);
  const dailyPnlLoading = loadingDailyPnl && dailyPnlCard == null;

  const mask = useCallback(
    (value) => (showBalance ? value : "****"),
    [showBalance]
  );

  const buildCoinIconUri = useCallback((iconPath) => {
    const raw = iconPath === undefined || iconPath === null ? "" : String(iconPath).trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    const base = String(IMAGE_BASE_URL || "").replace(/\/+$/, "");
    const path = raw.startsWith("/") ? raw : `/${raw}`;
    return `${base}${path}`;
  }, []);

  const assetIcon = buildCoinIconUri(walletData?.icon_path);

  const openTransfer = useCallback(() => {
    NavigationService.navigate(MARGIN_TRANSFER_SCREEN, {
      fromWalletType: "spot",
      toWalletType: "options",
      coin: "USDT",
    });
  }, []);

  const openTrade = useCallback(() => {
    NavigationService.navigate(FUTURES_SCREEN, { screen: "Options" });
  }, []);

  const openTransactionHistory = useCallback(() => {
    NavigationService.navigate("OptionHistory");
  }, []);

  const openPnlAnalysis = useCallback(() => {
    NavigationService.navigate(OPTIONS_PNL_ANALYSIS_SCREEN);
  }, []);

  const filteredPositions = useMemo(() => {
    let rows = livePositions || [];
    if (hideSmall) {
      rows = rows.filter((r) => parseBal(r.quantity) > 0);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => (r.symbol || "").toLowerCase().includes(q));
    }
    return rows;
  }, [livePositions, search, hideSmall]);

  const assetRow = useMemo(() => {
    if (!walletData && !hasLiveAccount) return null;
    return {
      asset: walletData?.asset || "USDT",
      icon_path: walletData?.icon_path,
      margin_balance: walletTotal,
      available,
      in_order: inOrder,
    };
  }, [walletData, hasLiveAccount, walletTotal, available, inOrder]);

  if (loading && !walletData && positions.length === 0) {
    return <OptionsSkeleton theme={theme} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <AppText weight={SEMI_BOLD} type={EIGHTEEN}>Options Wallet</AppText>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: isDark ? themeColors.background : colors.white }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <AppText type={SIXTEEN} color={isDark ? colors.white : DISCLAIMTEXT} weight={SEMI_BOLD}>Total Equity</AppText>
          <TouchableOpacity onPress={() => setShowBalance((v) => !v)}>
            <FastImage
              source={showBalance ? eye_close_icon : eye_open_icon}
              resizeMode="contain"
              style={{ width: 16, height: 16 }}
              tintColor={isDark ? colors.white : colors.disclaimText}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryValueRow}>
          <AppText type={TWENTY_SIX} weight={SEMI_BOLD}>
            {loading ? "—" : mask(fmt(totalEquity, 4))}
          </AppText>
          <AppText type={FIFTEEN} color={isDark ? colors.white : DISCLAIMTEXT} style={{ top: 5 }}> USDT</AppText>
        </View>
        <AppText type={FOURTEEN} color={isDark ? colors.white : DISCLAIMTEXT}>
          ≈ {loading ? "—" : mask(fmtUsd(totalEquity))}
        </AppText>

        <View style={{ marginTop: 10 }}>
          <AppText type={TWELVE} color={isDark ? colors.white : DISCLAIMTEXT}>Daily PNL</AppText>
          <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: pnlColor(dailyPnl) }}>
            {loading || dailyPnlLoading
              ? "—"
              : mask(`${dailyPnl >= 0 ? "+" : "-"}${fmtUsd(Math.abs(dailyPnl))} (${dailyPnlPct >= 0 ? "+" : ""}${dailyPnlPct.toFixed(2)}%)`)}
          </AppText>
        </View>

        <View style={[styles.equityGrid, { marginTop: 15 }]}>
          <View style={{ flex: 1 }}>
            <AppText type={TWELVE} color={isDark ? colors.white : DISCLAIMTEXT}>Margin Balance (USDT)</AppText>
            <AppText type={SIXTEEN} weight={SEMI_BOLD}>{loading ? "—" : mask(fmt(marginBalance, 4))}</AppText>
            <AppText type={TWELVE} color={isDark ? colors.white : DISCLAIMTEXT}>≈ {loading ? "—" : mask(fmtUsd(marginBalance))}</AppText>
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <AppText type={TWELVE} color={isDark ? colors.white : DISCLAIMTEXT}>Unrealized PNL (USDT)</AppText>
            <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: pnlColor(unrealizedPnl) }}>
              {loading ? "—" : mask(fmt(unrealizedPnl, 4))}
            </AppText>
            <AppText type={TWELVE} color={isDark ? colors.white : DISCLAIMTEXT}>≈ {loading ? "—" : mask(fmtUsd(unrealizedPnl))}</AppText>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: themeColors.border }}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: isDark ? themeColors.themeElevationColor : colors.iconBgColor }]}
            onPress={openTransfer}
          >
            <AppText type={TWELVE} weight={SEMI_BOLD} color={themeColors.text}>Transfer</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: isDark ? themeColors.themeElevationColor : colors.iconBgColor }]}
            onPress={openPnlAnalysis}
          >
            <AppText type={TWELVE} weight={SEMI_BOLD} color={themeColors.text}>PNL Analysis</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: isDark ? themeColors.themeElevationColor : colors.iconBgColor }]}
            onPress={openTransactionHistory}
          >
            <AppText type={TWELVE} weight={SEMI_BOLD} color={themeColors.text}>History</AppText>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabsRow}>
        <View style={{ flexDirection: "row", gap: 18, alignItems: "flex-end" }}>
          <TouchableOpacity onPress={() => { setActiveTab("assets"); setSearch(""); setHideSmall(false); }} style={{ alignItems: "center" }}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} color={activeTab === "assets" ? (isDark ? colors.white : colors.black) : DISCLAIMTEXT}>Assets</AppText>
            <View style={[styles.tabUnderline, { backgroundColor: activeTab === "assets" ? isDark ? colors.white : colors.buttonBg : "transparent" }]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setActiveTab("positions"); setSearch(""); setHideSmall(false); }} style={{ alignItems: "center" }}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} color={activeTab === "positions" ? (isDark ? colors.white : colors.black) : DISCLAIMTEXT}>Positions</AppText>
            <View style={[styles.tabUnderline, { backgroundColor: activeTab === "positions" ? isDark ? colors.white : colors.buttonBg : "transparent" }]} />
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === "positions" && (
        <>
          <View style={styles.filtersRow}>
            <View style={[styles.searchBox, { backgroundColor: isDark ? '#2A2A2E' : '#F7F7F7' }]}>
              <FastImage source={searchIcon} style={styles.searchIcon} resizeMode="contain" tintColor={themeColors.secondaryText} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search contract"
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
              <AppText type={TWELVE} color={isDark ? colors.white : DISCLAIMTEXT}>Hide small positions</AppText>
            </TouchableOpacity>
          </View>
        </>
      )}

      {activeTab === "assets" ? (
        assetRow ? (
          <View style={[styles.row, { borderBottomColor: themeColors.border, marginTop: 10 }]}>
            <View style={styles.rowLeft}>
              {assetIcon ? (
                <FastImage source={{ uri: assetIcon }} style={{ width: 28, height: 28, borderRadius: 14 }} resizeMode="contain" />
              ) : (
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isDark ? "#2C2C2E" : "#E5E7EB" }} />
              )}
              <View>
                <AppText type={FOURTEEN} weight={SEMI_BOLD}>{assetRow.asset}</AppText>
                <AppText type={TWELVE} color={DISCLAIMTEXT}>Margin: {mask(fmt(assetRow.margin_balance, 4))}</AppText>
              </View>
            </View>
            <View style={styles.rowRight}>
              <View style={{ alignItems: "flex-end", marginRight: 10 }}>
                <AppText type={FOURTEEN} weight={SEMI_BOLD}>{mask(fmt(assetRow.available, 4))}</AppText>
                <AppText type={TWELVE} color={DISCLAIMTEXT}>In Order: {mask(fmt(assetRow.in_order, 4))}</AppText>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setSelectedRowPopup({ type: "asset", data: walletData || assetRow });
                  detailSheetRef.current?.open();
                }}
                style={styles.moreBtn}
              >
                <FastImage source={moreOption} style={styles.moreIcon} resizeMode="contain" tintColor={isDark ? colors.white : colors.black} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <FastImage source={NO_NOTIFICATION_ICON} style={styles.emptyIcon} resizeMode="contain" />
            <AppText type={TWELVE} weight={SEMI_BOLD} color={DISCLAIMTEXT}>No Assets Found</AppText>
          </View>
        )
      ) : (
        <FlatList
          data={filteredPositions}
          keyExtractor={(item) => item._id ?? item.symbol}
          style={{ marginTop: 10 }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          renderItem={({ item, index }) => {
            const upnl = parseBal(item.unrealized_pnl);
            const isLast = index === filteredPositions.length - 1;

            return (
              <View style={[styles.row, { borderBottomColor: themeColors.border }, isLast && { borderBottomWidth: 0 }]}>
                <View style={styles.rowLeft}>
                  <View>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD}>{item.symbol}</AppText>
                    <AppText type={TWELVE} color={DISCLAIMTEXT}>{item.side || "—"} · {item.option_type || item.underlying || ""}</AppText>
                  </View>
                </View>
                <View style={styles.rowRight}>
                  <View style={{ alignItems: "flex-end", marginRight: 10 }}>
                    <AppText type={FOURTEEN} weight={SEMI_BOLD}>{fmt(item.quantity, 4)}</AppText>
                    <AppText type={TWELVE} style={{ color: pnlColor(upnl) }}>
                      {upnl >= 0 ? "+" : ""}{fmt(upnl, 2)} USDT
                    </AppText>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedRowPopup({ type: "position", data: item });
                      detailSheetRef.current?.open();
                    }}
                    style={styles.moreBtn}
                  >
                    <FastImage source={moreOption} style={styles.moreIcon} resizeMode="contain" tintColor={isDark ? colors.white : colors.black} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              {loadingPositions && !positionsReady ? (
                <AppText type={TWELVE} color={DISCLAIMTEXT}>Loading…</AppText>
              ) : (
                <>
                  <FastImage source={NO_NOTIFICATION_ICON} style={styles.emptyIcon} resizeMode="contain" />
                  <AppText type={TWELVE} weight={SEMI_BOLD} color={DISCLAIMTEXT}>No Positions Found</AppText>
                </>
              )}
            </View>
          )}
          ListFooterComponent={() => <View style={{ height: 120 }} />}
        />
      )}

      <RBSheet
        ref={detailSheetRef}
        keyboardAvoidingViewEnabled={false}
        customModalProps={{ statusBarTranslucent: true }}
        closeOnDragDown
        closeOnPressMask
        height={400}
        animationType="fade"
        customStyles={{
          container: {
            backgroundColor: themeColors.background,
            height: 400,
            borderTopRightRadius: 24,
            borderTopLeftRadius: 24,
          },
          wrapper: { backgroundColor: "#0006" },
          draggableIcon: { backgroundColor: isDark ? "#444" : "#CCC", width: 40 },
        }}
      >
        <OptionsDetailSheetContent
          rowPopup={selectedRowPopup}
          themeColors={themeColors}
          theme={theme}
          onTrade={() => {
            detailSheetRef.current?.close();
            openTrade();
          }}
          onTransfer={() => {
            detailSheetRef.current?.close();
            openTransfer();
          }}
        />
      </RBSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18, flex: 1 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryCard: { marginTop: 12, borderRadius: 14, backgroundColor: colors.white },
  summaryValueRow: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  equityGrid: { flexDirection: "row" },
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
  emptyContainer: { alignItems: "center", marginTop: 40, gap: 10 },
  emptyIcon: { width: 80, height: 80 },
  sheetBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtn: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default OptionsWalletTab;
