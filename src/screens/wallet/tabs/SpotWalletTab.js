import React, { useMemo } from "react";
import { FlatList, TextInput, TouchableOpacity, View } from "react-native";
import FastImage from "react-native-fast-image";
import { AppText, DISCLAIMTEXT, EIGHTEEN, SEMI_BOLD, TWELVE } from "../../../shared";
import { colors, darkTheme } from "../../../theme/colors";
import { checkIc, searchIcon, NO_NOTIFICATION_ICON, spotWalletImg } from "../../../helper/ImageAssets";
import CoinIcon from "../../../common/CoinIcon";
import WalletTabQuickActions from "../WalletTabQuickActions";
import TotalAssetsCard from "../TotalAssetsCard";
import WalletAssetCard from "../WalletAssetCard";
import NavigationService from "../../../navigation/NavigationService";
import { SPOT_PNL_ANALYSIS_SCREEN, MARGIN_TRANSFER_SCREEN } from "../../../navigation/routes";

function parseSpotPnlValue(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = typeof raw === "number" ? raw : parseFloat(raw);
  return Number.isFinite(n) ? n : null;
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
  userSpotWallet,
  spotPnlData,
  onDeposit,
  onTransfer,
  onWithdraw,
  onTrade,
  onOpenCoinSheet,
}) => {
  const [spotHideZeroBalance, setSpotHideZeroBalance] = React.useState(false);
  const [spotSearch, setSpotSearch] = React.useState("");
  const isDark = theme === "Dark";

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

  const mask = (v) => (showBalance ? v : "****");

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18 }}>
      <AppText weight={SEMI_BOLD} type={EIGHTEEN}>
        Spot Wallet Balance
      </AppText>

      <TotalAssetsCard
        style={{ marginTop: 12 }}
        amount={formatEstimateHeader(portfolioPreferredAmount(walletBalanceSpot), 5)}
        currency={portfolioPreferredCurrency(walletBalanceSpot)}
        usdAmount={formatEstimateHeader(portfolioUsdtEstimate(walletBalanceSpot), 5)}
        pnlAmount={realizedPnl == null ? "0.00" : `${realizedPnl >= 0 ? "" : "-"}${Math.abs(realizedPnl).toFixed(2)}`}
        pnlPercentage="0.00%"
        imageSource={spotWalletImg}
        showBalance={showBalance}
        onToggleBalance={() => setShowBalance((value) => !value)}
        belowPnl={
          <TouchableOpacity onPress={() => NavigationService.navigate(SPOT_PNL_ANALYSIS_SCREEN)}>
            <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: colors.cyanTheme, textDecorationLine: "underline" }}>
              Analysis
            </AppText>
          </TouchableOpacity>
        }
      />

      <WalletTabQuickActions
        theme={theme}
        themeColors={themeColors}
        items={[
          { key: "deposit", label: "Deposit", variant: "deposit", onPress: onDeposit },
          { key: "transfer", label: "Transfer", variant: "transfer", onPress: onTransfer },
          { key: "withdraw", label: "Withdraw", variant: "withdraw", onPress: onWithdraw },
        ]}
      />

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14 }}>
        <View style={[styles.searchBox, { backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#F7F7F7" }]}>
          <FastImage source={searchIcon} style={{ width: 14, height: 14 }} resizeMode="contain" tintColor={themeColors.secondaryText} />
          <TextInput
            value={spotSearch}
            onChangeText={setSpotSearch}
            placeholder="Search"
            placeholderTextColor={themeColors.secondaryText}
            cursorColor={isDark ? colors.white : colors.black}
            style={{ flex: 1, height: 40, fontSize: 13, color: themeColors.text }}
            returnKeyType="search"
          />
        </View>

        <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 8 }} onPress={() => setSpotHideZeroBalance((v) => !v)}>
          <View style={styles.checkbox}>
            {spotHideZeroBalance ? (
              <FastImage source={checkIc} style={{ width: 8, height: 8 }} resizeMode="contain" tintColor={isDark ? colors.white : colors.buttonBg} />
            ) : null}
          </View>
          <AppText type={TWELVE} color={isDark ? colors.white : DISCLAIMTEXT}>Hide 0 balances</AppText>
        </TouchableOpacity>
      </View>

      <View style={[styles.hintBar, { backgroundColor: themeColors.themeElevationColor, borderColor: "transparent" }]}>
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
        renderItem={({ item }) => {
          const total = totalWalletQty(item);
          return (
            <WalletAssetCard
              theme={theme}
              themeColors={themeColors}
              icon={
                <View style={{ borderRadius: 18, overflow: "hidden" }}>
                  <CoinIcon coin={item} style={{ width: 36, height: 36, borderRadius: 18 }} resizeMode="cover" />
                </View>
              }
              symbol={item?.short_name}
              name={item?.currency}
              amount={mask(safeRound(total, 8))}
              fiatAmount={mask(approxUsdLine(item))}
              details={[
                { key: "available", label: "Available", value: mask(safeRound(safeNum(item?.balance), 8)) },
                { key: "orders", label: "In Orders", value: mask(safeRound(safeNum(item?.locked_balance), 8)) },
              ]}
              actions={[
                { key: "trade", label: "Trade", primary: true, onPress: () => onTrade?.(item) },
                {
                  key: "transfer",
                  label: "Transfer",
                  primary: false,
                  onPress: () =>
                    NavigationService.navigate(MARGIN_TRANSFER_SCREEN, {
                      fromWalletType: "spot",
                      toWalletType: "main",
                      coin: item?.short_name || item?.currency,
                    }),
                },
              ]}
            />
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
};

export default SpotWalletTab;
