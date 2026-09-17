import React, { useCallback, useMemo } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View, Dimensions } from "react-native";
import { AppText, BOLD, ELEVEN, FOURTEEN, MEDIUM, NORMAL, SEMI_BOLD, TEN, THIRTEEN, TWELVE } from "../../shared";
import FastImage from "react-native-fast-image";
import {
  NO_NOTIFICATION_ICON,
  NO_NOTIFICATION_ICON_LIGHT,
  starFillIcon,
  starIcon,
  back_ic,
  favUnCheck,
} from "../../helper/ImageAssets";
import { useAppSelector } from "../../store/hooks";
import { toFixedFive, toFixedThree } from "../../helper/utility";
import { colors } from "../../theme/colors";
import { IMAGE_BASE_URL } from "../../helper/Constants";
import { useTheme } from "../../hooks/useTheme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ROW_HEIGHT_DEFAULT = 40;
const ROW_HEIGHT_HOME_TAB = 60;

const PairLabel = React.memo(({ ticker, quote, textColor }) => (
  <AppText
    numberOfLines={1}
    adjustsFontSizeToFit
    minimumFontScale={0.72}
    style={styles.pairLabelWrap}
  >
    <AppText weight={SEMI_BOLD} style={[styles.pairLabelBase, { color: textColor }]}>
      {ticker}
    </AppText>
    <AppText weight={SEMI_BOLD} style={styles.pairLabelQuote}>{` / ${quote}`}</AppText>
  </AppText>
));
PairLabel.displayName = "PairLabel";

const MarketRow = React.memo(({ item, favoriteArray, onPress, onToggleFavorite, pairTypography, hideStar, isCryptos }) => {
  const { colors: themeColors, isDark } = useTheme();
  const isHomeTab = pairTypography === "homeTab";
  const isFavorite = favoriteArray?.includes(item?._id);
  const isNegative = (item?.change_percentage ?? 0) < 0;

  const handlePress = useCallback(() => onPress(item), [item, onPress]);

  const changeStr =
    item?.change_percentage != null
      ? (item.change_percentage >= 0 ? "+" : "") + toFixedThree(item.change_percentage) + "%"
      : "0%";
  const priceStr = item?.buy_price != null ? toFixedFive(item.buy_price) : "0";
  const subPrice = item?.sell_price ?? item?.usd_price ?? item?.usdt_price ?? 0;
  const subPriceStr = subPrice != null ? `$${String(subPrice)}` : "—";
  const ticker = String(item?.base_currency || item?.base_currency_short_name || "").toUpperCase() || "—";
  const quote =
    String(item?.quote_currency || item?.quote_currency_short_name || item?.pay_currency || "")
      .trim()
      .toUpperCase() || "USDT";
  const pairLabel = ticker && ticker !== "—" ? `${ticker}/${quote}` : "—";
  const fullName = item?.base_currency_fullname || item?.base_currency_name || item?.base_currency || ticker;
  const iconUri = item?.icon_path ? item.icon_path : null;

  if (isHomeTab) {
    const last = item?.buy_price ?? item?.last_price ?? item?.price ?? 0;
    const sub = item?.sell_price ?? item?.usd_price ?? item?.usdt_price ?? 0;
    const chg = Number(item?.change_percentage ?? item?.changePercentage ?? item?.change) || 0;
    const isUp = chg >= 0;
    const chgText = `${Math.abs(chg).toFixed(2)}%`;
    const iconBg = isDark ? themeColors.card : "#F3F4F6";

    return (
      <TouchableOpacity
        style={[styles.row, styles.rowHomeTab]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.nameCol}>
          <View style={styles.nameRowHomeTab}>
            {!hideStar && (
              <TouchableOpacity onPress={() => onToggleFavorite(item?._id)} activeOpacity={0.7} style={styles.starBtnHomeTab}>
                <FastImage
                  source={isFavorite ? starFillIcon : favUnCheck}
                  resizeMode="contain"
                  style={styles.starIcon}
                  tintColor={isFavorite ? colors.startintcolor : colors.stardisablecolor}
                />
              </TouchableOpacity>
            )}
            <View style={[styles.iconCircleHomeTab, {}]}>
              {iconUri ? (
                <FastImage source={{ uri: iconUri }} resizeMode="contain" style={styles.coinIconHomeTab} />
              ) : (
                <View style={[styles.coinIconHomeTab, styles.coinIconPlaceholder, { backgroundColor: themeColors.card }]} />
              )}
            </View>
            <View style={styles.nameBlock}>
              <PairLabel ticker={ticker} quote={quote} textColor={themeColors.text} />
              <AppText numberOfLines={1} weight={NORMAL} type={ELEVEN} ellipsizeMode="tail" style={[styles.coinListSub, { color: '#9CA3AF' }]}>
                {fullName}
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.priceCol}>
          <AppText
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            weight={SEMI_BOLD}
            style={[styles.lastPrice, { color: themeColors.text }]}
          >
            {String(last)}
          </AppText>
          <AppText numberOfLines={1} weight={MEDIUM} style={[styles.inrPrice, { color: '#9CA3AF' }]}>
            ${String(sub)}
          </AppText>
        </View>

        <View style={styles.chgCol}>
          <View
            style={[
              styles.changePillHomeTab,
              { backgroundColor: isUp ? "#2DBE7E" : "#EF4444" },
            ]}
          >
            <Text numberOfLines={1} style={styles.changeTextHomeTab}>
              {isUp ? "▲ " : "▼ "}
              {chgText}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: themeColors.border }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.nameCol}>
        <View style={styles.nameRow}>
          {!hideStar && (
            <TouchableOpacity onPress={() => onToggleFavorite(item?._id)} activeOpacity={0.7} style={styles.starBtn}>
              <FastImage
                source={isFavorite ? starFillIcon : favUnCheck}
                resizeMode="contain"
                style={styles.starIcon}
                tintColor={isFavorite ? colors.startintcolor : colors.stardisablecolor}
              />
            </TouchableOpacity>
          )}
          {iconUri ? (
            <FastImage source={{ uri: iconUri }} resizeMode="cover" style={styles.coinIcon} />
          ) : (
            <View style={[styles.coinIcon, styles.coinIconPlaceholder, { backgroundColor: themeColors.card }]} />
          )}
          <View style={styles.nameBlock}>
            <PairLabel ticker={ticker} quote={quote} textColor={themeColors.text} />
            <AppText numberOfLines={1} weight={NORMAL} type={ELEVEN} ellipsizeMode="tail" style={[styles.coinListSub, { color: '#9CA3AF' }]}>
              {fullName}
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.priceCol}>
        <AppText
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          weight={SEMI_BOLD}
          style={[styles.lastPrice, { color: themeColors.text }]}
        >
          {priceStr}
        </AppText>
        <AppText numberOfLines={1} weight={MEDIUM} style={[styles.inrPrice, { color: themeColors.secondaryText }]}>
          {subPriceStr}
        </AppText>
      </View>

      <View style={styles.chgCol}>
        <View style={[styles.chgPill, isNegative ? styles.chgPillRed : styles.chgPillGreen]}>
          <Text numberOfLines={1} style={styles.chgPillText}>
            {changeStr}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.item?._id === nextProps.item?._id &&
    prevProps.item?.buy_price === nextProps.item?.buy_price &&
    prevProps.item?.last_price === nextProps.item?.last_price &&
    prevProps.item?.sell_price === nextProps.item?.sell_price &&
    prevProps.item?.change_percentage === nextProps.item?.change_percentage &&
    prevProps.favoriteArray?.includes(prevProps.item?._id) === nextProps.favoriteArray?.includes(nextProps.item?._id) &&
    prevProps.pairTypography === nextProps.pairTypography &&
    prevProps.hideStar === nextProps.hideStar
  );
});

MarketRow.displayName = "MarketRow";

const MarketList = React.memo(({ filterData, style, onPress, scrollEnabled = true, pairTypography, hideStar = false, isCryptos = false, favoriteArray: propsFavoriteArray, onToggleFavorite }) => {
  const { colors: themeColors, isDark } = useTheme();
  const rowHeight = pairTypography === "homeTab" ? ROW_HEIGHT_HOME_TAB : ROW_HEIGHT_DEFAULT;
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

  const handlePress = useCallback(
    (item) => {
      if (onPress) onPress(item);
    },
    [onPress]
  );

  const renderItem = useCallback(
    ({ item }) => (
      <MarketRow
        item={item}
        favoriteArray={favoriteArray}
        onPress={handlePress}
        onToggleFavorite={handleAddFav}
        pairTypography={pairTypography}
        hideStar={hideStar}
        isCryptos={isCryptos}
      />
    ),
    [favoriteArray, handlePress, handleAddFav, pairTypography, hideStar, isCryptos]
  );

  const keyExtractor = useCallback((item, index) => item?._id || index.toString(), []);

  const ListHeaderComponent = useMemo(() => {
    if (pairTypography === "homeTab") {
      return (
        <View style={[styles.tableHeader, styles.tableHeaderHomeTab, { borderBottomColor: "transparent" }]}>
          <AppText
            weight={MEDIUM}
            numberOfLines={1}
            style={[styles.tableHeaderText, styles.tableHeaderTextNoMargin, { flex: 1.2, color: '#9CA3AF' }]}
          >
            Symbol
          </AppText>
          <AppText
            weight={MEDIUM}
            numberOfLines={1}
            style={[
              styles.tableHeaderText,
              styles.tableHeaderTextNoMargin,
              { flex: 1, textAlign: "right", color: '#9CA3AF' },
            ]}
          >
            Last Price
          </AppText>
          <View style={styles.headerChgWrap}>
            <View style={styles.headerChgInner}>
              <AppText
                weight={MEDIUM}
                numberOfLines={1}
                style={[styles.tableHeaderText, styles.tableHeaderTextNoMargin, { color: '#9CA3AF' }]}
              >
                24H Change
              </AppText>
              <View style={{ flexDirection: "column", alignItems: "center", marginLeft: 4 }}>
                <FastImage
                  source={back_ic}
                  style={{ width: 7, height: 7, transform: [{ rotate: "90deg" }], marginBottom: -3 }}
                  resizeMode="contain"
                  tintColor="#9CA3AF"
                />
                <FastImage
                  source={back_ic}
                  style={{ width: 7, height: 7, transform: [{ rotate: "270deg" }], marginTop: 3 }}
                  resizeMode="contain"
                  tintColor="#9CA3AF"
                />
              </View>
            </View>
          </View>
        </View>
      );
    }
    return (
      <View style={[styles.tableHeader, { borderBottomColor: 'transparent' }]}>
        <View style={styles.headerCellName}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <AppText
              weight={MEDIUM}
              numberOfLines={1}
              style={[styles.tableHeaderText, styles.tableHeaderTextNoMargin, { color: themeColors.secondaryText }]}
            >
              Name
            </AppText>
            <View style={{ flexDirection: "column", alignItems: "center", marginLeft: 2 }}>
              <FastImage source={back_ic} style={{ width: 6, height: 6, transform: [{ rotate: "90deg" }], marginBottom: -2 }} resizeMode="contain" tintColor="#9CA3AF" />
              <FastImage source={back_ic} style={{ width: 6, height: 6, transform: [{ rotate: "270deg" }], marginTop: 2 }} resizeMode="contain" tintColor="#9CA3AF" />
            </View>
          </View>
          <AppText style={{ color: themeColors.secondaryText, marginHorizontal: 2 }}>/</AppText>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <AppText
              numberOfLines={1}
              style={[styles.tableHeaderText, styles.tableHeaderTextNoMargin, { color: themeColors.secondaryText }]}
            >
              Vol
            </AppText>
            <View style={{ flexDirection: "column", alignItems: "center", marginLeft: 2 }}>
              <FastImage source={back_ic} style={{ width: 6, height: 6, transform: [{ rotate: "90deg" }], marginBottom: -2 }} resizeMode="contain" tintColor="#9CA3AF" />
              <FastImage source={back_ic} style={{ width: 6, height: 6, transform: [{ rotate: "270deg" }], marginTop: 2 }} resizeMode="contain" tintColor="#9CA3AF" />
            </View>
          </View>
        </View>

        <View style={styles.headerCellPrice}>
          <AppText
            numberOfLines={1}
            style={[styles.tableHeaderText, styles.tableHeaderTextNoMargin, { color: themeColors.secondaryText }]}
          >
            Last Price
          </AppText>
          <View style={{ flexDirection: "column", alignItems: "center", marginLeft: 3 }}>
            <FastImage source={back_ic} style={{ width: 6, height: 6, transform: [{ rotate: "90deg" }], marginBottom: -2 }} resizeMode="contain" tintColor="#9CA3AF" />
            <FastImage source={back_ic} style={{ width: 6, height: 6, transform: [{ rotate: "270deg" }], marginTop: 2 }} resizeMode="contain" tintColor="#9CA3AF" />
          </View>
        </View>

        <View style={styles.headerCellChg}>
          <AppText
            numberOfLines={1}
            style={[styles.tableHeaderText, styles.tableHeaderTextNoMargin, { color: themeColors.secondaryText, }]}
          >
            24h Change
          </AppText>
          <View style={{ flexDirection: "column", alignItems: "center", marginLeft: 3 }}>
            <FastImage source={back_ic} style={{ width: 6, height: 6, transform: [{ rotate: "90deg" }], marginBottom: -2 }} resizeMode="contain" tintColor="#9CA3AF" />
            <FastImage source={back_ic} style={{ width: 6, height: 6, transform: [{ rotate: "270deg" }], marginTop: 2 }} resizeMode="contain" tintColor="#9CA3AF" />
          </View>
        </View>
      </View>
    );
  }, [themeColors.border, themeColors.secondaryText, pairTypography]);

  const ListEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyWrap}>
        <FastImage
          source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT}
          resizeMode="contain"
          style={styles.emptyIcon}
        />
        <AppText type={FOURTEEN} style={[styles.emptyText, { color: themeColors.secondaryText }]}>
          No coins found
        </AppText>
        <AppText type={TWELVE} style={[styles.emptySubtext, { color: themeColors.secondaryText }]}>
          Try changing filters or search
        </AppText>
      </View>
    ),
    [themeColors.secondaryText]
  );

  const data = Array.isArray(filterData) ? filterData : [];

  return (
    <View style={[styles.modal, style]}>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={data.length > 0 ? ListHeaderComponent : null}
        ListEmptyComponent={ListEmptyComponent}
        scrollEnabled={scrollEnabled}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        initialNumToRender={8}
        windowSize={10}
        contentContainerStyle={{ paddingBottom: pairTypography === "homeTab" ? 0 : 100 }}
        getItemLayout={(_unused, index) => ({
          length: rowHeight,
          offset: rowHeight * index,
          index,
        })}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
});

MarketList.displayName = "MarketList";

export default MarketList;

const styles = StyleSheet.create({
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 2,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableHeaderHomeTab: {
    paddingHorizontal: 0,
    paddingTop: 2,
    paddingBottom: 2,
  },
  tableHeaderText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginRight: 5,
  },
  tableHeaderTextNoMargin: {
    marginRight: 0,
  },
  headerChgWrap: {
    flex: 0.8,
    alignItems: "flex-end",
    minWidth: 0,
  },
  headerChgInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerCellName: {
    flex: 1.2,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    minWidth: 0,
  },
  headerCellPrice: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 3,
    minWidth: 0,
  },
  headerCellChg: {
    flex: 0.8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 3,
    minWidth: 0,
    left: 4
  },
  sortIcon: {
    width: 10,
    height: 10,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    minHeight: ROW_HEIGHT_DEFAULT,
    marginTop: 5
  },
  rowHomeTab: {
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  nameCol: {
    flex: 1.2,
    minWidth: 0,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  nameRowHomeTab: {
    flexDirection: "row",
    alignItems: "center",
  },
  starBtnHomeTab: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  iconCircleHomeTab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  coinIconHomeTab: {
    width: 32,
    height: 32,
    borderRadius: 22,
  },
  coinListPair: {
    fontSize: 14,
  },
  pairLabelWrap: {
    minWidth: 0,
    flexShrink: 1,
  },
  pairLabelBase: {
    fontSize: 14,
  },
  pairLabelQuote: {
    color: "#9CA3AF",
    fontSize: 12,
  },
  coinListSub: {
    marginTop: 0,
    fontSize: 13,
  },
  coinListPriceMain: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
  },
  coinListPriceSub: {
    marginTop: 0,
    textAlign: "right",
    fontSize: 12,
  },
  changePillHomeTab: {
    minWidth: 56,
    paddingHorizontal: 5,
    height: 24,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  changeTextHomeTab: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  chgCol: {
    flex: 0.8,
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 0,
  },
  starBtn: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  starIcon: {
    width: 16,
    height: 16,
  },
  coinIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
  },
  coinIconPlaceholder: {
    backgroundColor: colors.themeElevationColor,
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
    marginLeft: 4,
  },
  symbolText: {
    fontSize: 13,
    fontWeight: "700",
  },
  fullName: {
    marginTop: 1,
    fontSize: 11,
  },
  priceCol: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  lastPrice: {
    textAlign: "right",
    fontSize: 14,
    fontWeight: "700",
  },
  inrPrice: {
    marginTop: 1,
    textAlign: "right",
    fontSize: 11,
  },
  chgPill: {
    minWidth: 50,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chgPillRed: {
    backgroundColor: colors.red,
  },
  chgPillGreen: {
    backgroundColor: colors.green,
  },
  chgPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.white,
  },
  modal: {
    width: "100%",
    flex: 1,
    paddingTop: 2,
    paddingBottom: 4,
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
    marginBottom: 4,
  },
  emptySubtext: {
    textAlign: "center",
    opacity: 0.8,
  },
});
