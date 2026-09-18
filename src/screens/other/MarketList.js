import React, { useCallback, useMemo } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View, Dimensions } from "react-native";
import { AppText, BOLD, ELEVEN, FOURTEEN, MEDIUM, NORMAL, SEMI_BOLD, TEN, THIRTEEN, TWELVE } from "../../shared";
import FastImage from "react-native-fast-image";
import { Star } from "lucide-react-native";
import {
  NO_NOTIFICATION_ICON,
  NO_NOTIFICATION_ICON_LIGHT,
  back_ic,
} from "../../helper/ImageAssets";
import { useAppSelector } from "../../store/hooks";
import { toFixedFive, toFixedThree } from "../../helper/utility";
import { colors } from "../../theme/colors";
import { useTheme } from "../../hooks/useTheme";

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

const MarketRow = React.memo(
  ({ item, favoriteArray, onPress, onToggleFavorite, hideStar, isCryptos }) => {
    const { colors: themeColors, isDark } = useTheme();
    const isFavorite = favoriteArray?.includes(item?._id);

    const handlePress = useCallback(() => onPress(item), [item, onPress]);

    const ticker = String(item?.base_currency || item?.base_currency_short_name || "").toUpperCase() || "—";
    const quote = String(item?.quote_currency || item?.quote_currency_short_name || item?.pay_currency || "").trim().toUpperCase() || "USDT";
    const fullName = item?.base_currency_fullname || item?.base_currency_name || item?.name || ticker;
    const iconUri = item?.icon_path ? item.icon_path : null;

    const vol = Number(item?.volume_24h ?? item?.volume ?? item?.quote_volume ?? item?.total_volume ?? 0);
    const formattedVol =
      vol >= 1e9
        ? `$${(vol / 1e9).toFixed(2)}B`
        : vol >= 1e6
        ? `$${(vol / 1e6).toFixed(2)}M`
        : vol > 0
        ? `$${toFixedThree(vol)}`
        : `${ticker} • $0.00`;

    const rawPrice = Number(item?.last_price ?? item?.buy_price ?? item?.price ?? 0);
    const priceStr =
      rawPrice > 1
        ? rawPrice.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 3,
          })
        : rawPrice.toFixed(4);

    const subPrice = Number(item?.sell_price ?? item?.usd_price ?? item?.usdt_price ?? 0);
    const subPriceStr = subPrice > 0 ? (subPrice > 1 ? `$${subPrice.toFixed(2)}` : `$${subPrice.toFixed(6)}`) : `$${priceStr}`;

    const chg = Number(item?.change_percentage ?? item?.changePercentage ?? item?.change) || 0;
    const isUp = chg >= 0;
    const chgText = `${isUp ? "+" : ""}${chg.toFixed(2)}%`;

    return (
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: isDark ? "rgba(255, 255, 255, 0.04)" : themeColors.border }]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {/* Left Col: Coin Logo + Name / Vol */}
        <View style={styles.nameCol}>
          <View style={styles.nameRow}>
            {iconUri ? (
              <FastImage source={{ uri: iconUri }} resizeMode="contain" style={styles.coinIcon} />
            ) : (
              <View style={[styles.coinIcon, { backgroundColor: getCoinBadgeBg(ticker), justifyContent: "center", alignItems: "center" }]}>
                <AppText style={{ color: "#FFF", fontSize: 13, fontWeight: "700" }}>{ticker.substring(0, 1)}</AppText>
              </View>
            )}
            <View style={styles.nameBlock}>
              <AppText numberOfLines={1} weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.text }}>
                {fullName}
              </AppText>
              <AppText numberOfLines={1} weight={MEDIUM} type={ELEVEN} style={{ color: "#9CA3AF", marginTop: 2 }}>
                {ticker} • {formattedVol}
              </AppText>
            </View>
          </View>
        </View>

        {/* Middle Col: Last Price & USD Subprice */}
        <View style={styles.priceCol}>
          <AppText
            numberOfLines={1}
            weight={SEMI_BOLD}
            type={FOURTEEN}
            style={{ color: themeColors.text, textAlign: "right" }}
          >
            {priceStr}
          </AppText>
          <AppText numberOfLines={1} weight={MEDIUM} type={ELEVEN} style={{ color: "#9CA3AF", marginTop: 2, textAlign: "right" }}>
            {subPriceStr}
          </AppText>
        </View>

        {/* Right Col: 24h Change Pill + Star */}
        <View style={styles.chgAndStarCol}>
          <View
            style={[
              styles.changePill,
              { backgroundColor: isUp ? "rgba(0, 200, 83, 0.15)" : "rgba(255, 59, 48, 0.15)" },
            ]}
          >
            <Text numberOfLines={1} style={[styles.changeText, { color: isUp ? "#00C853" : "#FF3B30" }]}>
              {chgText}
            </Text>
          </View>

          {!hideStar && (
            <TouchableOpacity
              onPress={() => onToggleFavorite && onToggleFavorite(item?._id)}
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
      prevProps.item?.buy_price === nextProps.item?.buy_price &&
      prevProps.item?.last_price === nextProps.item?.last_price &&
      prevProps.item?.sell_price === nextProps.item?.sell_price &&
      prevProps.item?.change_percentage === nextProps.item?.change_percentage &&
      prevProps.favoriteArray?.includes(prevProps.item?._id) === nextProps.favoriteArray?.includes(nextProps.item?._id) &&
      prevProps.hideStar === nextProps.hideStar
    );
  }
);

MarketRow.displayName = "MarketRow";

const MarketList = React.memo(
  ({
    filterData,
    style,
    onPress,
    scrollEnabled = true,
    hideStar = false,
    isCryptos = false,
    favoriteArray: propsFavoriteArray,
    onToggleFavorite,
  }) => {
    const { colors: themeColors, isDark } = useTheme();
    const favoriteArrayFromRedux = useAppSelector((state) => state.home.favoriteArray);
    const favoriteArray = propsFavoriteArray || favoriteArrayFromRedux;

    const handleAddFav = useCallback(
      (id) => {
        if (onToggleFavorite) {
          onToggleFavorite(id);
        }
      },
      [onToggleFavorite]
    );

    const renderItem = useCallback(
      ({ item }) => {
        return (
          <MarketRow
            item={item}
            favoriteArray={favoriteArray}
            onPress={onPress}
            onToggleFavorite={handleAddFav}
            hideStar={hideStar}
            isCryptos={isCryptos}
          />
        );
      },
      [favoriteArray, onPress, handleAddFav, hideStar, isCryptos]
    );

    const renderHeader = () => {
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
    };

    if (!filterData || filterData.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <FastImage
            source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT}
            style={styles.emptyIcon}
            resizeMode="contain"
          />
          <AppText weight={MEDIUM} type={FOURTEEN} style={[styles.emptyText, { color: themeColors.secondaryText }]}>
            No Markets Found
          </AppText>
        </View>
      );
    }

    return (
      <View style={[styles.container, style]}>
        <FlatList
          data={filterData}
          keyExtractor={(item) => item?._id || item?.symbol || String(Math.random())}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          scrollEnabled={scrollEnabled}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      </View>
    );
  }
);

MarketList.displayName = "MarketList";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
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
  priceCol: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: 6,
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
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    marginBottom: 16,
    opacity: 0.7,
  },
  emptyText: {
    textAlign: "center",
  },
});

export default MarketList;
