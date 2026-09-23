import React, { useMemo, useState } from "react";
import { FlatList, TextInput, TouchableOpacity, View } from "react-native";
import FastImage from "react-native-fast-image";
import { AppText, DISCLAIMTEXT, EIGHTEEN, FOURTEEN, SEMI_BOLD, TWELVE } from "../../../shared";
import { colors, darkTheme } from "../../../theme/colors";
import { checkIc, searchIcon, NO_NOTIFICATION_ICON, overviewWalletImg } from "../../../helper/ImageAssets";
import CoinIcon from "../../../common/CoinIcon";
import WalletTabQuickActions from "../WalletTabQuickActions";
import TotalAssetsCard from "../TotalAssetsCard";
import WalletAssetCard from "../WalletAssetCard";

const GenericWalletTab = ({
  title,
  theme,
  themeColors,
  showBalance,
  setShowBalance,
  walletBalance,
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
  userWalletRows,
  actions,
  hintText,
  hideZeroDefault = false,
  imageSource = overviewWalletImg,
  onOpenCoinSheet,
  getCardActions,
}) => {
  const [hideZero, setHideZero] = useState(Boolean(hideZeroDefault));
  const [search, setSearch] = useState("");
  const isDark = theme === "Dark";

  const rows = useMemo(() => {
    const list = Array.isArray(userWalletRows) ? [...userWalletRows] : [];
    list.sort((a, b) => {
      const ta = safeNum(a?.balance) + safeNum(a?.locked_balance) + safeNum(a?.bonus);
      const tb = safeNum(b?.balance) + safeNum(b?.locked_balance) + safeNum(b?.bonus);
      if (ta > 0 && tb === 0) return -1;
      if (ta === 0 && tb > 0) return 1;
      return tb - ta;
    });

    const s = search.trim().toLowerCase();
    let out = list;
    if (s) {
      out = out.filter(
        (it) =>
          String(it?.short_name || "").toLowerCase().includes(s) ||
          String(it?.currency || "").toLowerCase().includes(s)
      );
    }
    if (hideZero) out = out.filter((it) => totalWalletQty(it) > 0);
    return out;
  }, [userWalletRows, safeNum, search, hideZero, totalWalletQty]);

  const mask = (v) => (showBalance ? v : "****");

  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 18 }}>
      <AppText weight={SEMI_BOLD} type={EIGHTEEN} style={{ marginBottom: 12 }}>
        {title}
      </AppText>

      <TotalAssetsCard
        amount={formatEstimateHeader(portfolioPreferredAmount(walletBalance), 5)}
        currency={portfolioPreferredCurrency(walletBalance)}
        usdAmount={formatEstimateHeader(portfolioUsdtEstimate(walletBalance), 5)}
        imageSource={imageSource}
        showBalance={showBalance}
        onToggleBalance={() => setShowBalance((value) => !value)}
      />

      {actions?.length ? <WalletTabQuickActions theme={theme} themeColors={themeColors} items={actions} /> : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14 }}>
        <View style={[styles.searchBox, { backgroundColor: isDark ? darkTheme.darkThemeInputColor : "#F7F7F7" }]}>
          <FastImage source={searchIcon} style={{ width: 14, height: 14 }} resizeMode="contain" tintColor={themeColors.secondaryText} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search"
            placeholderTextColor={themeColors.secondaryText}
            cursorColor={isDark ? colors.white : colors.black}
            style={{ flex: 1, height: 40, fontSize: 13, color: themeColors.text }}
            returnKeyType="search"
          />
        </View>

        <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 8 }} onPress={() => setHideZero((v) => !v)}>
          <View style={styles.checkbox}>
            {hideZero ? (
              <FastImage source={checkIc} style={{ width: 8, height: 8 }} resizeMode="contain" tintColor={isDark ? colors.white : colors.buttonBg} />
            ) : null}
          </View>
          <AppText type={TWELVE} color={isDark ? colors.white : DISCLAIMTEXT}>Hide 0 balances</AppText>
        </TouchableOpacity>
      </View>

      {hintText ? (
        <View style={[styles.hintBar, { backgroundColor: themeColors.themeElevationColor, borderColor: themeColors.border }]}>
          <AppText color={DISCLAIMTEXT} style={{ marginRight: 8 }}>ⓘ</AppText>
          <AppText type={TWELVE} color={DISCLAIMTEXT} style={{ flex: 1 }}>
            {hintText}
          </AppText>
        </View>
      ) : null}

      <FlatList
        data={rows}
        keyExtractor={(item, idx) => String(item?.currency_id || idx)}
        style={{ marginTop: 10 }}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        renderItem={({ item }) => {
          const total = totalWalletQty(item);
          const available = safeRound(safeNum(item?.balance), 8);
          const inOrders = safeRound(safeNum(item?.locked_balance), 8);
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
                { key: "available", label: "Available", value: mask(available) },
                { key: "orders", label: "In Orders", value: mask(inOrders) },
              ]}
              actions={getCardActions?.(item) || []}
              onPress={getCardActions ? undefined : () => onOpenCoinSheet?.(item)}
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

export default GenericWalletTab;
