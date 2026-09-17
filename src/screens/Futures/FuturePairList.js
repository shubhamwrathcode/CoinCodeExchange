import React, { useMemo, useState, memo } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import FastImage from "react-native-fast-image";
import { colors } from "../../theme/colors";
import { toFixedFive, toFixedThree } from "../../helper/utility";
import { useTheme } from "../../hooks/useTheme";
import { IMAGE_BASE_URL } from "../../helper/Constants";
import { searchIcon, closeIcon, starIcon, starFillIcon } from "../../helper/ImageAssets";
import { useAppSelector } from "../../store/hooks";
import { useDispatch } from "react-redux";
import { addToFavorites } from "../../actions/homeActions";

const TABS = ["Favourites", "USDT", "BTC", "BNB", "ETH"];

const FuturePairRow = memo(({
  item,
  isFavorite,
  onSelect,
  onToggleFavorite,
  rowBorderColor,
  searchBarBg,
  textColor,
  subTextColor,
}) => {
  const changeVal = parseFloat(item?.change_percentage || 0);
  const isPositive = changeVal >= 0;
  const changeColor = isPositive ? colors.green : colors.red;
  const sign = isPositive ? "+" : "";
  const price = item?.last_price ?? item?.buy_price;
  const priceStr = price != null ? toFixedFive(price) : "—";
  const changeStr = `${sign}${toFixedThree(changeVal)}%`;
  const iconUri = item?.icon_path ? `${IMAGE_BASE_URL}${item.icon_path}` : null;
  const base = item?.base_asset || item?.short_name || "—";
  const quote = item?.margin_asset || item?.quote_asset || "";
  const subtitle = `$${priceStr}${item?.price_change_24h ? ` · ${item.price_change_24h}` : ""}`;

  return (
    <TouchableOpacity
      activeOpacity={0.65}
      onPress={() => onSelect(item)}
      style={[styles.row, { borderBottomColor: rowBorderColor }]}
    >
      <View style={styles.rowLeft}>
        <TouchableOpacity
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.starWrap}
          onPress={(e) => {
            e?.stopPropagation?.();
            onToggleFavorite(item);
          }}
        >
          <FastImage
            source={isFavorite ? starFillIcon : starIcon}
            resizeMode="contain"
            style={styles.starIcon}
            tintColor={isFavorite ? colors.starColor : subTextColor}
          />
        </TouchableOpacity>
        {iconUri ? (
          <FastImage source={{ uri: iconUri }} resizeMode="cover" style={styles.coinIcon} />
        ) : (
          <View style={[styles.coinIcon, { backgroundColor: searchBarBg }]} />
        )}
        <View style={styles.pairBlock}>
          <Text style={[styles.pairLine, { color: textColor }]} numberOfLines={1}>
            {base}
            {quote ? (
              <Text style={{ fontWeight: "400", color: subTextColor }}>/{quote}</Text>
            ) : null}
          </Text>
          <Text style={[styles.subLine, { color: subTextColor }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.priceLine, { color: textColor }]} numberOfLines={1}>
          {priceStr}
        </Text>
        <Text style={[styles.changeLine, { color: changeColor }]} numberOfLines={1}>
          {changeStr}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const FuturePairList = ({
  pairs = [],
  onSelectPair,
  searchTerm = "",
  onSearchChange,
  onClose,
}) => {
  const { theme, isDark, colors: themeColors } = useTheme();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("USDT");

  const darkMode = typeof isDark === "boolean" ? isDark : theme === "Dark";
  const modalBg = darkMode ? "#0F141C" : "#FFFFFF";
  const textColor = darkMode ? "#FFFFFF" : "#000000";
  const subTextColor = darkMode ? "rgba(255,255,255,0.55)" : "#9D9D9D";
  const borderColor = darkMode ? "rgba(255,255,255,0.12)" : "#E8E8E8";
  const rowBorderColor = darkMode ? "rgba(255,255,255,0.08)" : "#EEEEEE";
  const searchBarBg = darkMode ? "rgba(255,255,255,0.06)" : "#F5F5F5";
  const closeCircleBg = darkMode ? "rgba(255,255,255,0.12)" : "#E8E8E8";
  const iconTint = darkMode ? colors.white : colors.black;
  const searchTint = darkMode ? "rgba(255,255,255,0.65)" : "#595757";

  const favoriteArray = useAppSelector((state) => state.home.favoriteArray);

  const handleSelect = (pair) => {
    if (typeof onSelectPair === "function") onSelectPair(pair);
  };

  const toggleFavorite = (item) => {
    if (!item?._id) return;
    dispatch(addToFavorites({ pair_id: item._id }));
  };

  const filteredData = useMemo(() => {
    return pairs.filter((pair) => {
      let tabMatch = false;
      if (activeTab === "Favourites") {
        tabMatch = favoriteArray?.includes(pair?._id);
      } else {
        const tab = activeTab.toLowerCase();
        tabMatch =
          (pair?.margin_asset || "").toLowerCase() === tab ||
          (pair?.quote_asset || "").toLowerCase() === tab ||
          (pair?.base_asset || "").toLowerCase() === tab ||
          (pair?.short_name || "").toLowerCase() === tab;
      }

      if (!searchTerm?.trim()) return tabMatch;

      const term = searchTerm.toLowerCase().trim();
      const symbol = (pair?.symbol || "").toLowerCase();
      const base = (pair?.base_asset || pair?.short_name || "").toLowerCase();
      const quote = (pair?.quote_asset || pair?.margin_asset || "").toLowerCase();
      return tabMatch && (symbol.includes(term) || base.includes(term) || quote.includes(term));
    });
  }, [pairs, activeTab, searchTerm, favoriteArray]);

  return (
    <View style={[styles.container, { backgroundColor: modalBg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>Select Coin</Text>
        <TouchableOpacity
          onPress={() => onClose?.()}
          style={[styles.closeCircle, { backgroundColor: closeCircleBg }]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.75}
        >
          <FastImage source={closeIcon} resizeMode="contain" style={styles.closeIcon} tintColor={iconTint} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchRow, { backgroundColor: searchBarBg, borderColor }]}>
        <FastImage source={searchIcon} resizeMode="contain" style={styles.searchGlyph} tintColor={searchTint} />
        <TextInput
          value={searchTerm}
          onChangeText={onSearchChange}
          placeholder="Search token"
          placeholderTextColor={subTextColor}
          style={[styles.searchInput, { color: textColor }]}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.tabsContainer}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.tabBtn} activeOpacity={0.7}>
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? textColor : subTextColor, fontWeight: isActive ? "700" : "500" },
                ]}
              >
                {tab}
              </Text>
              {isActive ? <View style={[styles.tabIndicator, { backgroundColor: themeColors.yellow || "#F3BB2B" }]} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.tableHeaderWrap, { borderBottomColor: rowBorderColor }]}>
        <View style={styles.tableHeaderLeft}>
          <Text style={[styles.headerLabel, { color: subTextColor }]}>Pair</Text>
        </View>
        <View style={styles.tableHeaderRight}>
          <Text style={[styles.headerLabel, { color: subTextColor }]}>Price</Text>
          <Text style={[styles.headerLabel, { color: subTextColor, marginLeft: 6 }]}>/</Text>
          <Text style={[styles.headerLabel, { color: subTextColor, marginLeft: 6 }]}>Chg%</Text>
        </View>
      </View>

      <View style={styles.listFlex}>
        <FlatList
          data={filteredData}
          style={styles.listFlex}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => item?._id ?? `${item?.base_asset}-${item?.margin_asset}`}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: subTextColor }]}>No pairs found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <FuturePairRow
            item={item}
            isFavorite={favoriteArray?.includes(item?._id)}
            onSelect={handleSelect}
            onToggleFavorite={toggleFavorite}
            rowBorderColor={rowBorderColor}
            searchBarBg={searchBarBg}
            textColor={textColor}
            subTextColor={subTextColor}
          />
        )}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  closeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: {
    width: 15,
    height: 15,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: 10,
    paddingRight: 5,
    paddingVertical: 4,
    marginBottom: 10,
  },
  searchGlyph: {
    width: 14,
    height: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
    paddingHorizontal: 2,
    minHeight: 34,
  },
  tabsContainer: {
    flexDirection: "row",
    marginBottom: 10,
    gap: 14,
  },
  tabBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 6,
  },
  tabLabel: {
    fontSize: 13,
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    width: 18,
    height: 3,
    borderRadius: 2,
  },
  tableHeaderWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 8,
    marginBottom: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableHeaderLeft: {
    flex: 1,
  },
  tableHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flex: 1,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  listFlex: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    paddingRight: 8,
  },
  starWrap: {
    marginRight: 5,
  },
  starIcon: {
    width: 14,
    height: 14,
  },
  coinIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  pairBlock: {
    flex: 1,
    minWidth: 0,
  },
  pairLine: {
    fontSize: 14,
    fontWeight: "700",
  },
  subLine: {
    fontSize: 11,
    marginTop: 2,
  },
  rowRight: {
    alignItems: "flex-end",
    maxWidth: "38%",
  },
  priceLine: {
    fontSize: 13,
    fontWeight: "700",
  },
  changeLine: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  emptyWrap: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
  },
});

export default FuturePairList;
