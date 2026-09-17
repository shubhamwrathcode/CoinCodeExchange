import React, { useMemo, useState } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { AppText, ELEVEN, SEMI_BOLD, TWELVE } from "../../shared";
import { useAppSelector } from "../../store/hooks";
import { colors } from "../../theme/colors";
import NavigationService from "../../navigation/NavigationService";
import { FUTURES_SCREEN } from "../../navigation/routes";
import { toFixedFive, toFixedThree } from "../../helper/utility";
import FastImage from "react-native-fast-image";
import { Coin, tetherIcon, bitcoinIcon, bnbIcon, NO_NOTIFICATION_ICON, NO_NOTIFICATION_ICON_LIGHT } from "../../helper/ImageAssets";
import { IMAGE_BASE_URL } from "../../helper/Constants";
import { buildCoinImageUri } from "../../helper/coinIconUrl";
import { useTheme } from "../../hooks/useTheme";

const QUOTE_OPTIONS = [
  { key: "All", label: "All", icon: Coin },
  { key: "USDT", label: "USDT", icon: tetherIcon },
  { key: "BTC", label: "BTC", icon: bitcoinIcon },
  { key: "ETH", label: "ETH", icon: Coin },
  { key: "BNB", label: "BNB", icon: bnbIcon },
];
const TYPE_OPTIONS = [
  { key: "All", label: "All" },
  { key: "Gainers", label: "Gainers" },
  { key: "Losers", label: "Losers" },
  { key: "Trending", label: "Trending" },
];

const FuturesMarket = ({ search }) => {
  const { colors: themeColors, isDark } = useTheme();
  const futuresPairData = useAppSelector((state) => state.home.futuresPairs || []) || [];
  const [quoteCurrency, setQuoteCurrency] = useState("USDT");
  const [filterType, setFilterType] = useState("All");

  const filterFuturesData = useMemo(() => {
    let data = Array.isArray(futuresPairData) ? [...futuresPairData] : [];
    if (search) {
      const s = search.toLowerCase();
      data = data.filter((item) => {
        const base = (item?.short_name || item?.base_asset || item?.symbol || '').toLowerCase();
        const name = (item?.name || item?.pair_name || '').toLowerCase();
        return base.includes(s) || name.includes(s);
      });
    }
    if (quoteCurrency !== "All") {
      data = data.filter((item) => {
        const q = (item?.margin_asset || item?.quote_asset || item?.quote_currency || "USDT").toUpperCase();
        return q === quoteCurrency;
      });
    }
    if (filterType === "Gainers") {
      data = data
        .filter((item) => Number(item?.change_percentage ?? item?.price_change_percent_24h ?? item?.change ?? 0) > 0)
        .sort((a, b) => Number(b?.change_percentage ?? b?.price_change_percent_24h ?? b?.change ?? 0) - Number(a?.change_percentage ?? a?.price_change_percent_24h ?? a?.change ?? 0));
    } else if (filterType === "Losers") {
      data = data
        .filter((item) => Number(item?.change_percentage ?? item?.price_change_percent_24h ?? item?.change ?? 0) < 0)
        .sort((a, b) => Number(a?.change_percentage ?? a?.price_change_percent_24h ?? a?.change ?? 0) - Number(b?.change_percentage ?? b?.price_change_percent_24h ?? b?.change ?? 0));
    } else if (filterType === "Trending") {
      data = data.sort((a, b) => Number(b?.volume ?? b?.volume_24h ?? 0) - Number(a?.volume ?? a?.volume_24h ?? 0));
    }
    return data;
  }, [futuresPairData, search, quoteCurrency, filterType]);

  const handleNavigate = (item) => {
    if (item) {
      NavigationService.navigate(FUTURES_SCREEN, {
        screen: "Futures",
        params: { coin: item, pair: item, coinDetail: item }
      });
    }
  };

  const chipBg = (selected) => (selected ? themeColors.card : "transparent");
  const chipTextColor = (selected) => (selected ? themeColors.text : themeColors.secondaryText);
  const chipBorder = (selected) => (selected ? themeColors.border : "transparent");

  return (
    <View style={styles.container}>
    

      {filterFuturesData?.length > 0 ? (
        <FuturesList data={filterFuturesData} onPress={handleNavigate} />
      ) : (
        <View style={styles.empty}>
          <FastImage source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT} resizeMode="contain" style={{ width: 100, height: 100 }} />
          <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>
            No futures data at the moment.
          </AppText>
        </View>
      )}
    </View>
  );
};

export const FuturesList = ({ data, onPress }) => {
  const { colors: themeColors, isDark } = useTheme();
  return (
    <View style={styles.list}>
      {data.map((item, index) => {
        const baseAsset = item?.short_name || item?.base_asset || (item?.symbol ? item.symbol.split('USDT')[0].split('_')[0].split('/')[0].replace('-PERP', '') : 'BTC');
        const marginAsset = item?.margin_asset || item?.quote_asset || item?.quote_currency || 'USDT';
        const price = Number(item?.last_price ?? item?.price ?? item?.mark_price ?? item?.buy_price ?? item?.close ?? item?.c ?? 0);
        const changePercent = Number(item?.change_percentage ?? item?.price_change_percent_24h ?? item?.price_change_24h ?? item?.change ?? item?.P ?? 0);
        const isPositive = changePercent >= 0;
        const vol = Number(item?.volume ?? item?.volume_24h ?? item?.quote_volume ?? item?.v ?? item?.q ?? 0);

        const iconUri = buildCoinImageUri(item) || (item?.icon_path ? `${String(IMAGE_BASE_URL || '').replace(/\/+$/, '')}/${String(item.icon_path).replace(/^\/+/, '')}` : null);
        const iconSource = iconUri ? { uri: iconUri } : Coin;

        return (
          <TouchableOpacity
            key={item?._id || item?.symbol || index}
            style={[styles.row, { borderBottomColor: isDark ? themeColors.border : '#EDEDEE' }]}
            onPress={() => onPress(item)}
            activeOpacity={0.7}
          >
            <View style={styles.nameCol}>
              <View style={styles.nameRow}>
                <View style={[styles.iconWrap, { backgroundColor: themeColors.card }]}>
                  <FastImage
                    source={iconSource}
                    resizeMode="contain"
                    style={styles.coinIconImg}
                  />
                </View>
                <View style={styles.nameBlock}>
                  <View style={styles.symbolRow}>
                    <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.text }} numberOfLines={1}>
                      {baseAsset}/{marginAsset}
                    </AppText>
                    <View style={[styles.perpBadge, { backgroundColor: isDark ? themeColors.card : '#F0F0F0' }]}>
                      <AppText type={ELEVEN} style={{ color: themeColors.secondaryText }}>Perp</AppText>
                    </View>
                  </View>
                  <AppText type={ELEVEN} style={[styles.volText, { color: themeColors.secondaryText }]} numberOfLines={1}>
                    Vol {toFixedThree(vol)}
                  </AppText>
                </View>
              </View>
            </View>
            <View style={styles.priceCol}>
              <AppText type={TWELVE} weight={SEMI_BOLD} style={[styles.priceText, { color: themeColors.text }]}>
                {toFixedFive(price)}
              </AppText>
              <View style={[styles.chgPill, isPositive ? styles.chgPillGreen : styles.chgPillRed]}>
                <AppText type={ELEVEN} weight={SEMI_BOLD} style={styles.chgPillText}>
                  {isPositive ? "+" : ""}{toFixedThree(changePercent)}%
                </AppText>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, marginTop: 4, paddingBottom: 12 },
  filterRow: { marginBottom: 4, maxHeight: 36 },
  filterScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2,
  },
  filterScrollType: {
    gap: 3,
    paddingHorizontal: 12,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  chipWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  chipIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  list: { paddingBottom: 24, paddingHorizontal: 4, paddingTop: 2 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 40,
  },
  nameCol: { flex: 1, minWidth: 0, justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  nameBlock: { flex: 1, minWidth: 0 },
  symbolRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  volText: { marginTop: 1 },
  priceCol: { flex: 1, minWidth: 0, alignItems: "flex-end", justifyContent: "center" },
  priceText: { textAlign: "right" },
  chgPill: {
    minWidth: 64,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  chgPillRed: { backgroundColor: colors.red },
  chgPillGreen: { backgroundColor: colors.green },
  chgPillText: { color: colors.white },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  coinIconImg: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  perpBadge: {
    marginLeft: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 40 },
});

export default FuturesMarket;
