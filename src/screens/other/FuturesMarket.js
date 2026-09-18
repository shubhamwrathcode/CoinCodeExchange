import React, { useMemo, useState, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView, Text, FlatList } from "react-native";
import { AppText, ELEVEN, FOURTEEN, MEDIUM, SEMI_BOLD, TWELVE } from "../../shared";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { colors } from "../../theme/colors";
import NavigationService from "../../navigation/NavigationService";
import { FUTURES_SCREEN } from "../../navigation/routes";
import { toFixedFive, toFixedThree } from "../../helper/utility";
import FastImage from "react-native-fast-image";
import { Star } from "lucide-react-native";
import { Coin, tetherIcon, bitcoinIcon, bnbIcon, NO_NOTIFICATION_ICON, NO_NOTIFICATION_ICON_LIGHT, back_ic } from "../../helper/ImageAssets";
import { IMAGE_BASE_URL } from "../../helper/Constants";
import { buildCoinImageUri } from "../../helper/coinIconUrl";
import { useTheme } from "../../hooks/useTheme";
import { addToFavorites } from "../../actions/homeActions";

const getCoinBadgeBg = (sym = "") => {
  const upper = sym.toUpperCase();
  if (upper.includes("BTC")) return "#F7931A";
  if (upper.includes("ETH")) return "#627EEA";
  if (upper.includes("BNB")) return "#F3BA2F";
  if (upper.includes("SOL")) return "#14F195";
  if (upper.includes("MEGA")) return "#E84142";
  if (upper.includes("ZAMA")) return "#FFD700";
  if (upper.includes("USDT") || upper.includes("USD")) return "#26A17B";
  if (upper.includes("XRP")) return "#23292F";
  if (upper.includes("DOGE")) return "#C2A633";
  if (upper.includes("ADA")) return "#0033AD";
  return "#00E5FF";
};

const FuturesMarket = ({ search, hideStar = false }) => {
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const futuresPairData = useAppSelector((state) => state.home.futuresPairs || []) || [];
  const favoriteArray = useAppSelector((state) => state.home.favoriteArray || []);
  const [quoteCurrency, setQuoteCurrency] = useState("USDT");
  const [filterType, setFilterType] = useState("All");

  const handleToggleFavorite = useCallback(
    (id) => {
      if (!id) return;
      dispatch(addToFavorites({ pair_id: id }));
    },
    [dispatch]
  );

  const filterFuturesData = useMemo(() => {
    let data = Array.isArray(futuresPairData) ? [...futuresPairData] : [];
    if (search) {
      const s = search.toLowerCase();
      data = data.filter((item) => {
        const base = (item?.short_name || item?.base_asset || item?.symbol || "").toLowerCase();
        const name = (item?.name || item?.pair_name || "").toLowerCase();
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

  const handleNavigate = useCallback((item) => {
    if (item) {
      NavigationService.navigate(FUTURES_SCREEN, {
        screen: "Futures",
        params: { coin: item, pair: item, coinDetail: item },
      });
    }
  }, []);

  return (
    <View style={styles.container}>
      {filterFuturesData?.length > 0 ? (
        <FuturesList
          data={filterFuturesData}
          onPress={handleNavigate}
          favoriteArray={favoriteArray}
          onToggleFavorite={handleToggleFavorite}
          hideStar={hideStar}
        />
      ) : (
        <View style={styles.empty}>
          <FastImage
            source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT}
            resizeMode="contain"
            style={{ width: 100, height: 100 }}
          />
          <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>
            No futures data at the moment.
          </AppText>
        </View>
      )}
    </View>
  );
};

const FuturesRow = React.memo(
  ({ item, isFavorite, onPress, onToggleFavorite, hideStar }) => {
    const { colors: themeColors, isDark } = useTheme();

    const baseAsset =
      item?.short_name ||
      item?.base_asset ||
      (item?.symbol
        ? item.symbol.split("USDT")[0].split("_")[0].split("/")[0].replace("-PERP", "")
        : "BTC");
    const marginAsset = item?.margin_asset || item?.quote_asset || item?.quote_currency || "USDT";
    const fullName = item?.name || item?.pair_name || item?.base_currency_fullname || baseAsset;
    const price = Number(item?.last_price ?? item?.price ?? item?.mark_price ?? item?.buy_price ?? item?.close ?? item?.c ?? 0);
    const priceStr = price > 1 ? price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 3 }) : price.toFixed(4);
    const changePercent = Number(item?.change_percentage ?? item?.price_change_percent_24h ?? item?.price_change_24h ?? item?.change ?? item?.P ?? 0);
    const isPositive = changePercent >= 0;
    const chgText = `${isPositive ? "+" : ""}${changePercent.toFixed(2)}%`;

    const iconUri = buildCoinImageUri(item) || (item?.icon_path ? `${String(IMAGE_BASE_URL || "").replace(/\/+$/, "")}/${String(item.icon_path).replace(/^\/+/, "")}` : null);

    return (
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: isDark ? "rgba(255,255,255,0.04)" : themeColors.border }]}
        onPress={() => onPress(item)}
        activeOpacity={0.7}
      >
        {/* Left Col: Coin Logo + Name / Vol */}
        <View style={styles.nameCol}>
          <View style={styles.nameRow}>
            {iconUri ? (
              <FastImage source={{ uri: iconUri }} resizeMode="contain" style={styles.coinIcon} />
            ) : (
              <View style={[styles.coinIcon, { backgroundColor: getCoinBadgeBg(baseAsset), justifyContent: "center", alignItems: "center" }]}>
                <AppText style={{ color: "#FFF", fontSize: 13, fontWeight: "700" }}>{baseAsset.substring(0, 1)}</AppText>
              </View>
            )}
            <View style={styles.nameBlock}>
              <View style={styles.symbolRow}>
                <AppText numberOfLines={1} weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.text }}>
                  {baseAsset}
                  {marginAsset ? (
                    <Text style={{ color: "#9CA3AF", fontSize: 11, fontWeight: "500" }}>
                      /{marginAsset}
                    </Text>
                  ) : null}
                </AppText>
                <View style={[styles.perpBadge, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F0F0F0" }]}>
                  <AppText type={ELEVEN} style={{ color: themeColors.secondaryText, fontSize: 10 }}>
                    Perp
                  </AppText>
                </View>
              </View>
              <AppText numberOfLines={1} weight={MEDIUM} type={ELEVEN} style={{ color: "#9CA3AF", marginTop: 2 }}>
                {fullName}
              </AppText>
            </View>
          </View>
        </View>

        {/* Middle Col: Price */}
        <View style={styles.priceCol}>
          <AppText numberOfLines={1} weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.text, textAlign: "right" }}>
            {priceStr}
          </AppText>
          <AppText numberOfLines={1} weight={MEDIUM} type={ELEVEN} style={{ color: "#9CA3AF", marginTop: 2, textAlign: "right" }}>
            ${priceStr}
          </AppText>
        </View>

        {/* Right Col: 24h Change Pill + Star */}
        <View style={styles.chgAndStarCol}>
          <View
            style={[
              styles.changePill,
              { backgroundColor: isPositive ? "rgba(0, 200, 83, 0.15)" : "rgba(255, 59, 48, 0.15)" },
            ]}
          >
            <Text numberOfLines={1} style={[styles.changeText, { color: isPositive ? "#00C853" : "#FF3B30" }]}>
              {chgText}
            </Text>
          </View>

          {!hideStar && onToggleFavorite && (
            <TouchableOpacity
              onPress={() => onToggleFavorite(item?._id)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.starBtnRight}
            >
              <Star
                color={isFavorite ? "#FFD700" : colors.stardisablecolor}
                fill={isFavorite ? "#FFD700" : "transparent"}
                size={18}
                strokeWidth={1.8}
              />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.item?._id === nextProps.item?._id &&
      prevProps.item?.price === nextProps.item?.price &&
      prevProps.item?.last_price === nextProps.item?.last_price &&
      prevProps.item?.change_percentage === nextProps.item?.change_percentage &&
      prevProps.isFavorite === nextProps.isFavorite &&
      prevProps.hideStar === nextProps.hideStar
    );
  }
);

FuturesRow.displayName = "FuturesRow";

export const FuturesList = ({ data, onPress, favoriteArray = [], onToggleFavorite, hideStar = false }) => {
  const favoriteSet = useMemo(() => new Set(favoriteArray), [favoriteArray]);

  const renderItem = useCallback(
    ({ item }) => {
      return (
        <FuturesRow
          item={item}
          isFavorite={favoriteSet.has(item?._id)}
          onPress={onPress}
          onToggleFavorite={onToggleFavorite}
          hideStar={hideStar}
        />
      );
    },
    [favoriteSet, onPress, onToggleFavorite, hideStar]
  );

  const keyExtractor = useCallback((item, index) => item?._id || item?.symbol || String(index), []);

  const getItemLayout = useCallback(
    (_, index) => ({
      length: 56,
      offset: 56 * index,
      index,
    }),
    []
  );

  const renderHeader = useCallback(() => {
    return (
      <View style={styles.tableHeader}>
        <View style={styles.headerCellName}>
          <AppText weight={MEDIUM} type={TWELVE} style={{ color: "#9CA3AF" }}>
            Name / Vol ⌵
          </AppText>
        </View>

        <View style={styles.headerCellPrice}>
          <AppText weight={MEDIUM} type={TWELVE} style={{ color: "#9CA3AF", textAlign: "right" }}>
            Last Price
          </AppText>
          <View style={styles.sortArrowCol}>
            <FastImage source={back_ic} style={styles.arrowUp} resizeMode="contain" tintColor="#9CA3AF" />
            <FastImage source={back_ic} style={styles.arrowDown} resizeMode="contain" tintColor="#9CA3AF" />
          </View>
        </View>

        <View style={styles.headerCellChg}>
          <AppText weight={MEDIUM} type={TWELVE} style={{ color: "#9CA3AF", textAlign: "right" }}>
            24h Change
          </AppText>
          <View style={[styles.sortArrowCol, { marginRight: hideStar ? 0 : 28 }]}>
            <FastImage source={back_ic} style={styles.arrowUp} resizeMode="contain" tintColor="#9CA3AF" />
            <FastImage source={back_ic} style={styles.arrowDown} resizeMode="contain" tintColor="#9CA3AF" />
          </View>
        </View>
      </View>
    );
  }, [hideStar]);

  return (
    <View style={styles.list}>
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        getItemLayout={getItemLayout}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "transparent",
  },
  headerCellName: {
    flex: 1.35,
    flexDirection: "row",
    alignItems: "center",
  },
  headerCellPrice: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 11,
  },
  headerCellChg: {
    flex: 1.15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  sortArrowCol: {
    flexDirection: "column",
    alignItems: "center",
    marginLeft: 3,
  },
  arrowUp: {
    width: 6,
    height: 6,
    transform: [{ rotate: "90deg" }],
    marginBottom: -2,
  },
  arrowDown: {
    width: 6,
    height: 6,
    transform: [{ rotate: "270deg" }],
    marginTop: 2,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nameCol: {
    flex: 1.35,
    minWidth: 0,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  coinIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    marginRight: 10,
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
  },
  symbolRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  perpBadge: {
    marginLeft: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  priceCol: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: 11,
  },
  chgAndStarCol: {
    flex: 1.15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    minWidth: 0,
  },
  changePill: {
    minWidth: 64,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  changeText: {
    fontWeight: "600",
    fontSize: 12,
  },
  starBtnRight: {
    padding: 4,
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
});

export default FuturesMarket;
