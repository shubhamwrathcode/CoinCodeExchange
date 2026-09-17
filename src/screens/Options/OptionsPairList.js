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
import { toFixedFive } from "../../helper/utility";
import { useTheme } from "../../hooks/useTheme";
import { searchIcon, closeIcon } from "../../helper/ImageAssets";

const TABS = ["USDT", "USDC"];

const OptionsAssetRow = memo(({
  item,
  isSelected,
  onSelect,
  rowBorderColor,
  searchBarBg,
  textColor,
  subTextColor,
}) => {
  const price = item?.price;
  const priceStr = price != null && Number(price) > 0 ? toFixedFive(price) : "—";
  const base = item?.base_currency || item?.symbol || "—";
  const quote = item?.quote_currency || "";
  const subtitle = quote ? `${base} Options` : "Options";

  return (
    <TouchableOpacity
      activeOpacity={0.65}
      onPress={() => onSelect(item)}
      style={[
        styles.row,
        { borderBottomColor: rowBorderColor },
        isSelected && styles.rowSelected,
      ]}
    >
      <View style={styles.rowLeft}>
        {item?.iconPath ? (
          <FastImage source={{ uri: item.iconPath }} resizeMode="cover" style={styles.coinIcon} />
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
        <Text style={[styles.changeLine, { color: subTextColor }]} numberOfLines={1}>
          {priceStr !== "—" ? `$${priceStr}` : "—"}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const OptionsPairList = ({
  pairs = [],
  selectedPair,
  onSelectPair,
  searchTerm = "",
  onSearchChange,
  onClose,
}) => {
  const { theme, isDark, colors: themeColors } = useTheme();
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

  const handleSelect = (pair) => {
    if (typeof onSelectPair === "function") onSelectPair(pair);
  };

  const filteredData = useMemo(() => {
    return pairs.filter((p) => (p?.quote_currency || "").toUpperCase() === activeTab);
  }, [pairs, activeTab]);

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
              {isActive ? (
                <View style={[styles.tabIndicator, { backgroundColor: themeColors.yellow || "#F3BB2B" }]} />
              ) : null}
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
          <Text style={[styles.headerLabel, { color: subTextColor, marginLeft: 6 }]}>Index</Text>
        </View>
      </View>

      <View style={styles.listFlex}>
        <FlatList
          data={filteredData}
          style={styles.listFlex}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item) => item?.symbol ?? `${item?.base_currency}-${item?.quote_currency}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: subTextColor }]}>No assets found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <OptionsAssetRow
              item={item}
              isSelected={selectedPair?.symbol === item?.symbol}
              onSelect={handleSelect}
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
  rowSelected: {
    opacity: 0.92,
  },
  rowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    paddingRight: 8,
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

export default OptionsPairList;
