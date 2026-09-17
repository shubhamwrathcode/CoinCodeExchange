import React, { useMemo } from "react";
import { FlatList, TextInput, TouchableOpacity, View } from "react-native";
import FastImage from "react-native-fast-image";
import { AppText, DISCLAIMTEXT, EIGHTEEN, FIFTEEN, FOURTEEN, SEMI_BOLD, SIXTEEN, TWELVE, TWENTY_SIX } from "../../../shared";
import { colors, darkTheme } from "../../../theme/colors";
import { bitcoin_ic, checkIc, moreOption, searchIcon, NO_NOTIFICATION_ICON } from "../../../helper/ImageAssets";
import WalletTabQuickActions from "../WalletTabQuickActions";
import NavigationService from "../../../navigation/NavigationService";
import { SPOT_PNL_ANALYSIS_SCREEN } from "../../../navigation/routes";

function parseSpotPnlValue(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = typeof raw === "number" ? raw : parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

function formatSpotPnl(n, { asset = "USDT", decimals = 2 } = {}) {
  if (n == null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(decimals)} ${asset}`;
}

const SpotWalletTab = ({
  theme,
  themeColors,
  showBalance,
  setShowBalance,
  walletBalanceSpot,
  portfolioPreferredAmount,
  portfolioPreferredCurrency,
  portfolioUsdtEstimate,
  formatEstimateHeader,
  safeRound,
  safeNum,
  totalWalletQty,
  approxUsdLine,
  buildCoinIconUri,
  failedIconMap,
  setFailedIconMap,
  userSpotWallet,
  spotPnlData,
  onDeposit,
  onBuyCrypto,
  onTransfer,
  onWithdraw,
  onOpenCoinSheet,
  eyeCloseIcon,
  eyeOpenIcon,
}) => {
  const [spotHideZeroBalance, setSpotHideZeroBalance] = React.useState(false);
  const [spotSearch, setSpotSearch] = React.useState("");

  const pnlAsset = spotPnlData?.valuation_asset || "USDT";
  const rawPnl = spotPnlData?.realized_pnl_usdt ?? spotPnlData?.realized_pnl ?? spotPnlData?.today_pnl_usd ?? spotPnlData?.today_pnl;
  const realizedPnl = parseSpotPnlValue(rawPnl);

  const spotRows = useMemo(() => {
    const rows = Array.isArray(userSpotWallet) ? [...userSpotWallet] : [];
    rows.sort((a, b) => {
      const ta = safeNum(a?.balance) + safeNum(a?.locked_balance) + safeNum(a?.bonus);
      const tb = safeNum(b?.balance) + safeNum(b?.locked_balance) + safeNum(b?.bonus);
      if (ta > 0 && tb === 0) return -1;
      if (ta === 0 && tb > 0) return 1;
      return tb - ta;
    });
    const s = spotSearch.trim().toLowerCase();
    let out = rows;
    if (s) {
      out = out.filter(
        (it) =>
          String(it?.short_name || "").toLowerCase().includes(s) ||
          String(it?.currency || "").toLowerCase().includes(s)
      );
    }
    if (spotHideZeroBalance) {
      out = out.filter((it) => totalWalletQty(it) > 0);
    }
    return out;
  }, [userSpotWallet, safeNum, spotSearch, spotHideZeroBalance, totalWalletQty]);

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18 }}>
      <AppText weight={SEMI_BOLD} type={EIGHTEEN}>
        Spot Wallet Balance
      </AppText>

      <View
        style={{
          marginTop: 12,
          paddingVertical: 0,
          borderRadius: 14,
          backgroundColor: theme === 'Dark' ? themeColors.background : colors.white,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <AppText type={SIXTEEN} color={theme === 'Dark' ? colors.white : DISCLAIMTEXT} weight={SEMI_BOLD}>Total Assets</AppText>
          <TouchableOpacity onPress={() => setShowBalance((v) => !v)}>
            <FastImage
              source={showBalance ? eyeCloseIcon : eyeOpenIcon}
              resizeMode="contain"
              style={{ width: 16, height: 16 }}
              tintColor={theme !== "Dark" ? colors.disclaimText : colors.white}
            />
          </TouchableOpacity>
        </View>
        <View style={{ marginTop: 5 }}>
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
            <AppText type={TWENTY_SIX} weight={SEMI_BOLD}>
              {showBalance ? formatEstimateHeader(portfolioPreferredAmount(walletBalanceSpot), 5) : "****"}{" "}
            </AppText>
            <AppText type={FIFTEEN} color={theme === 'Dark' ? colors.white : DISCLAIMTEXT} style={{ top: 5 }}>{portfolioPreferredCurrency(walletBalanceSpot)}</AppText>
          </View>
          <View style={{ marginTop: 6 }}>
            <AppText type={FOURTEEN} color={theme === 'Dark' ? colors.white : DISCLAIMTEXT}>
              ≈ {showBalance ? formatEstimateHeader(portfolioUsdtEstimate(walletBalanceSpot), 5) : "****"}{" "}
              {walletBalanceSpot?.Currency || "USD"}
            </AppText>
          </View>
          <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: theme === 'Dark' ? colors.white : themeColors.text }}>
              24h PnL
            </AppText>
            <TouchableOpacity onPress={() => NavigationService.navigate(SPOT_PNL_ANALYSIS_SCREEN)}>
              <AppText
                type={FOURTEEN}
                weight={SEMI_BOLD}
                style={{
                  color: "#D1AA67",
                  textDecorationLine: "underline",
                }}
              >
                Analysis
              </AppText>
            </TouchableOpacity>
          </View>
          <View style={{ marginTop: 4 }}>
            <AppText
              type={SIXTEEN}
              weight={SEMI_BOLD}
              style={{
                color:
                  !showBalance || realizedPnl == null || realizedPnl === 0
                    ? (theme === 'Dark' ? colors.white : colors.disclaimText)
                    : realizedPnl > 0
                      ? "#01bc8d"
                      : "#e45561",
              }}
            >
              {showBalance ? formatSpotPnl(realizedPnl, { asset: pnlAsset }) : "****"}
            </AppText>
          </View>
        </View>
      </View>

      <WalletTabQuickActions
        theme={theme}
        themeColors={themeColors}
        items={[
          { key: "deposit", label: "Deposit", variant: "deposit", onPress: onDeposit },
          { key: "buyCrypto", label: "Buy Now", variant: "buyCrypto", onPress: onBuyCrypto },
          { key: "transfer", label: "Transfer", variant: "transfer", onPress: onTransfer },
          { key: "withdraw", label: "Withdraw", variant: "withdraw", onPress: onWithdraw },
        ]}
      />

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14 }}>
        <View style={[styles.searchBox, { backgroundColor: theme === 'Dark' ? darkTheme.darkThemeInputColor: '#F7F7F7' }]}>
          <FastImage source={searchIcon} style={{ width: 14, height: 14 }} resizeMode="contain" tintColor={themeColors.secondaryText} />
          <TextInput
            value={spotSearch}
            onChangeText={setSpotSearch}
            placeholder="Search"
            placeholderTextColor={themeColors.secondaryText}
            cursorColor={theme === 'Dark' ? colors.white : colors.black}
            style={{ flex: 1, height: 40, fontSize: 13, color: themeColors.text }}
            returnKeyType="search"
          />
        </View>

        <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 8 }} onPress={() => setSpotHideZeroBalance((v) => !v)}>
          <View style={styles.checkbox}>
            {spotHideZeroBalance ? (
              <FastImage source={checkIc} style={{ width: 8, height: 8 }} resizeMode="contain" tintColor={theme === 'Dark' ? colors.white : colors.buttonBg} />
            ) : null}
          </View>
          <AppText type={TWELVE} color={theme === 'Dark' ? colors.white : DISCLAIMTEXT}>Hide 0 balances</AppText>
        </TouchableOpacity>
      </View>

      <View style={[styles.hintBar, { backgroundColor: themeColors.themeElevationColor, borderColor: 'transparent' }]}>
        <AppText color={DISCLAIMTEXT} style={{ marginRight: 8 }}>ⓘ</AppText>
        <AppText type={TWELVE} color={DISCLAIMTEXT} style={{ flex: 1 }}>
          To trade tokens, click Transfer to move the assets from your Funding Account to your Trading Account.
        </AppText>
      </View>

      <FlatList
        data={spotRows}
        keyExtractor={(item, idx) => String(item?.currency_id || idx)}
        style={{ marginTop: 10 }}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        renderItem={({ item, index }) => {
          const total = totalWalletQty(item);
          const isLast = index === spotRows.length - 1;
          return (
            <View style={[styles.row, { borderBottomColor: themeColors.border }, isLast && { borderBottomWidth: 0 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                <View style={{ borderRadius: 16, overflow: "hidden" }}>
                  <FastImage
                    source={
                      failedIconMap?.[String(item?.currency_id)]
                        ? bitcoin_ic
                        : (buildCoinIconUri(item?.icon_path)
                          ? { uri: buildCoinIconUri(item?.icon_path) }
                          : bitcoin_ic)
                    }
                    style={{ width: 28, height: 28 }}
                    resizeMode="cover"
                    onError={() => {
                      const id = String(item?.currency_id ?? "");
                      if (!id) return;
                      setFailedIconMap((prev) => (prev?.[id] ? prev : { ...(prev || {}), [id]: true }));
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText type={FOURTEEN} weight={SEMI_BOLD}>{item?.short_name}</AppText>
                  <AppText type={TWELVE} color={DISCLAIMTEXT}>{item?.currency}</AppText>
                </View>
              </View>

              <View style={{ alignItems: "flex-end" }}>
                <AppText type={FOURTEEN} weight={SEMI_BOLD}>{safeRound(total, 8)}</AppText>
                <AppText type={TWELVE} color={DISCLAIMTEXT}>{approxUsdLine(item)}</AppText>
              </View>

              <TouchableOpacity style={{ paddingLeft: 10, paddingVertical: 6 }} onPress={() => onOpenCoinSheet(item)}>
                <FastImage source={moreOption} style={{ width: 18, height: 18, transform: [{ rotate: "90deg" }] }} resizeMode="contain"
                  tintColor={theme === 'Dark' ? colors.white : colors.black} />
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={() => (
          <View style={{ alignItems: "center", marginTop: 40, gap: 10 }}>
            <FastImage source={NO_NOTIFICATION_ICON} style={{ width: 80, height: 80 }} resizeMode="contain" />
            <AppText type={TWELVE} weight={SEMI_BOLD} color={DISCLAIMTEXT}>No Data Found</AppText>
          </View>
        )}
        ListFooterComponent={() => <View style={{ height: 120 }} />}
      />
    </View>
  );
};

const styles = {
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 0,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 42,
  },
  checkbox: {
    width: 15,
    height: 15,
    borderWidth: 1,
    borderColor: colors.grey,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  hintBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
};

export default SpotWalletTab;

