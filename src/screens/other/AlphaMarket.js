import React, { useState, useMemo, useRef } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, TextInput } from "react-native";
import FastImage from "react-native-fast-image";
import { AppText, MEDIUM, TWELVE, FOURTEEN, TEN, SEMI_BOLD, BOLD, FIFTEEN, THIRTEEN } from "../../shared";
import { useTheme } from "../../hooks/useTheme";
import MarketList from "./MarketList";
import { back_ic, favCheck, closeIcon, checkIc } from "../../helper/ImageAssets";
import { colors } from "../../theme/colors";
import RBSheet from "react-native-raw-bottom-sheet";
import NavigationService from "../../navigation/NavigationService";
import { TRADE_SCREEN, WALLET_SCREEN } from "../../navigation/routes";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const ALPHA_CHAINS = [
  { id: "all", label: "All", icon: null },
  { id: "gatelayer", label: "GateLayer", icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png" },
  { id: "sol", label: "Solana", icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png" },
  { id: "bsc", label: "BSC", icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png" },
  { id: "eth", label: "Ethereum", icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png" },
  { id: "base", label: "Base", icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png" },
  { id: "arb", label: "Arbitrum One", icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png" },
  { id: "sui", label: "Sui", icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/sui/info/logo.png" },
  { id: "avax", label: "AVAX C-Chain", icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchex/info/logo.png" },
  { id: "world", label: "World", icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png" },
];

const ALPHA_POOLS = {
  dex: [
    { id: "all_dex", label: "ALL DEXs (191)", icon: null },
    { id: "gateswap", label: "GateSwap V2", sub: "24h Volume: 25.4K", icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png" },
    { id: "meteora", label: "Meteora DAMM V2", sub: "24h Volume: 9.26B", icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png" },
    { id: "pumpswap", label: "PumpSwap", sub: "24h Volume: 5.15B", icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png" },
    { id: "pancake", label: "PancakeSwap V2", sub: "24h Volume: 9.96B", icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png" },
  ],
  launch: [
    { id: "all_launch", label: "All Launch Platforms", icon: null },
    { id: "launchpad", label: "Launchpad", sub: "24h Volume: 1.02B", icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png" },
    { id: "fairlaunch", label: "Fair Launch", sub: "24h Volume: 420.1M", icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png" },
  ],
};

const AlphaMarket = ({ coinPairs, search, hideStar = true, favoriteArray, onToggleFavorite }) => {
  const { colors: themeColors, isDark } = useTheme();

  const chainSheetRef = useRef();
  const poolSheetRef = useRef();

  const [selectedChain, setSelectedChain] = useState(ALPHA_CHAINS[0]);
  const [selectedPool, setSelectedPool] = useState(ALPHA_POOLS.dex[0]);

  const [poolTab, setPoolTab] = useState("dex"); // "dex" or "launch"
  const [poolSearch, setPoolSearch] = useState("");
  const [draftPoolId, setDraftPoolId] = useState(selectedPool.id);

  const filterAlphaData = useMemo(() => {
    let data = Array.isArray(coinPairs) ? coinPairs : [];
    if (search) {
      const s = search.toLowerCase();
      data = data.filter(
        (item) =>
          item?.base_currency?.toLowerCase()?.includes(s) ||
          item?.quote_currency?.toLowerCase()?.includes(s)
      );
    }
    return data;
  }, [coinPairs, search]);

  const filteredPools = useMemo(() => {
    const items = ALPHA_POOLS[poolTab] || [];
    const q = poolSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => (it.label + " " + (it.sub || "")).toLowerCase().includes(q));
  }, [poolTab, poolSearch]);

  const handleSelectChain = (chain) => {
    setSelectedChain(chain);
    chainSheetRef.current.close();
  };

  const handleApplyPool = () => {
    const all = [...ALPHA_POOLS.dex, ...ALPHA_POOLS.launch];
    const found = all.find((p) => p.id === draftPoolId);
    if (found) setSelectedPool(found);
    poolSheetRef.current.close();
  };

  const handleResetPool = () => {
    setDraftPoolId(poolTab === "dex" ? "all_dex" : "all_launch");
    setPoolSearch("");
  };

  const handleNavigate = (item) => {
    NavigationService.navigate(TRADE_SCREEN, { coinDetail: item });
  };

  return (
    <View style={styles.container}>
      {/* Dropdowns Row */}
      <View style={styles.dropdownRow}>
        <TouchableOpacity
          style={[styles.dropdownBtn, { backgroundColor: isDark ? "#262626" : "#F3F4F6", flex: 1.5 }]}
          onPress={() => chainSheetRef.current.open()}
        >
          <View style={styles.dropdownLeft}>
            <AppText numberOfLines={1} weight={MEDIUM} type={FOURTEEN} style={{ color: themeColors.text, marginRight: 5 }}>
              {selectedChain.label}
            </AppText>
            <View style={styles.chainIcons}>
              {ALPHA_CHAINS.slice(2, 6).map((item, index) => (
                <FastImage key={index} source={{ uri: item.icon }} style={styles.miniIcon} />
              ))}
            </View>
          </View>
          <FastImage
            source={back_ic}
            style={styles.arrowIcon}
            resizeMode="contain"
            tintColor={themeColors.text}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dropdownBtn, { backgroundColor: isDark ? "#262626" : "#F3F4F6", flex: 1.3 }]}
          onPress={() => {
            setDraftPoolId(selectedPool.id);
            poolSheetRef.current.open();
          }}
        >
          <AppText numberOfLines={1} weight={MEDIUM} type={THIRTEEN} style={{ color: themeColors.text, flex: 1 }}>
            {selectedPool.id === "all_dex" ? "Select Pool (All)" : selectedPool.label}
          </AppText>
          <FastImage
            source={back_ic}
            style={styles.arrowIcon}
            resizeMode="contain"
            tintColor={themeColors.text}
          />
        </TouchableOpacity>
      </View>

      <MarketList filterData={filterAlphaData} hideStar={hideStar} favoriteArray={favoriteArray} onToggleFavorite={onToggleFavorite} onPress={handleNavigate} />

      {/* Chain Selection Sheet */}
      <RBSheet
        ref={chainSheetRef}
        closeOnDragDown={true}
        closeOnPressMask={true}
        height={500}
        customStyles={{
          container: {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
          },
          draggableIcon: { backgroundColor: "#A0A0A0" },
        }}
      >
        <View style={styles.sheetContent}>
          <AppText weight={SEMI_BOLD} type={FOURTEEN} style={[styles.sheetTitle, { color: themeColors.text }]}>
            Select Chain
          </AppText>
          <ScrollView>
            {ALPHA_CHAINS.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.chainItem, index === ALPHA_CHAINS.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => handleSelectChain(item)}
              >
                <View style={styles.chainItemLeft}>
                  {item.icon ? (
                    <FastImage source={{ uri: item.icon }} style={styles.sheetIcon} />
                  ) : (
                    <View style={[styles.sheetIcon, { backgroundColor: isDark ? "#333" : "#E5E7EB", alignItems: "center", justifyContent: "center" }]}>
                      <AppText type={TEN} color={themeColors.secondaryText}>All</AppText>
                    </View>
                  )}
                  <AppText weight={MEDIUM} type={FOURTEEN} style={{ color: themeColors.text, marginLeft: 12 }}>
                    {item.label}
                  </AppText>
                </View>
                {selectedChain.id === item.id && (
                  <FastImage source={checkIc} style={styles.selectedCheck} resizeMode="contain" tintColor={colors.buttonBg} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </RBSheet>

      {/* Pool Selection Sheet */}
      <RBSheet
        ref={poolSheetRef}
        closeOnDragDown={true}
        closeOnPressMask={true}
        height={600}
        customStyles={{
          container: {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
          },
          draggableIcon: { backgroundColor: "#A0A0A0" },
        }}
      >
        <View style={styles.sheetContent}>
          <AppText weight={SEMI_BOLD} type={FIFTEEN} style={[styles.sheetTitle, { color: themeColors.text }]}>
            Select Pool
          </AppText>

          {/* Search Box */}
          <View style={[styles.searchBox, { backgroundColor: isDark ? "#262626" : "#F3F4F6" }]}>
            <TextInput
              placeholder="Search"
              placeholderTextColor={isDark ? "#888" : "#9CA3AF"}
              value={poolSearch}
              onChangeText={setPoolSearch}
              style={[styles.searchInput, { color: themeColors.text }]}
            />
          </View>

          {/* Tabs */}
          <View style={styles.poolTabs}>
            <TouchableOpacity
              onPress={() => setPoolTab("dex")}
              style={[styles.poolTab, poolTab === "dex" && { borderBottomColor: colors.buttonBg, borderBottomWidth: 2 }]}
            >
              <AppText weight={MEDIUM} style={{ color: poolTab === "dex" ? colors.buttonBg : themeColors.secondaryText }}>DEXs</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPoolTab("launch")}
              style={[styles.poolTab, poolTab === "launch" && { borderBottomColor: colors.buttonBg, borderBottomWidth: 2 }]}
            >
              <AppText weight={MEDIUM} style={{ color: poolTab === "launch" ? colors.buttonBg : themeColors.secondaryText }}>Launch Platforms</AppText>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }}>
            {filteredPools.map((it, idx) => (
              <TouchableOpacity
                key={it.id}
                style={[styles.poolItem, idx === filteredPools.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => setDraftPoolId(it.id)}
              >
                <View style={styles.chainItemLeft}>
                  {it.icon ? (
                    <FastImage source={{ uri: it.icon }} style={styles.sheetIcon} />
                  ) : (
                    <View style={[styles.sheetIcon, { backgroundColor: isDark ? "#333" : "#E5E7EB", alignItems: "center", justifyContent: "center" }]}>
                      <AppText type={TEN} color={themeColors.secondaryText}>All</AppText>
                    </View>
                  )}
                  <View style={{ marginLeft: 12 }}>
                    <AppText weight={MEDIUM} type={FOURTEEN} style={{ color: themeColors.text }}>{it.label}</AppText>
                    {it.sub && <AppText type={TEN} color={themeColors.secondaryText}>{it.sub}</AppText>}
                  </View>
                </View>
                {draftPoolId === it.id && (
                  <FastImage source={checkIc} style={styles.selectedCheck} resizeMode="contain" tintColor={colors.buttonBg} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Actions */}
          <View style={styles.sheetActions}>
            <TouchableOpacity onPress={handleResetPool} style={styles.resetBtn}>
              <AppText weight={MEDIUM} style={{ color: themeColors.text }}>Reset</AppText>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleApplyPool} style={[styles.applyBtn, { backgroundColor: colors.buttonBg }]}>
              <AppText weight={MEDIUM} style={{ color: "#FFF" }}>Apply</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </RBSheet>
    </View>
  );
};

export default AlphaMarket;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
  },
  dropdownRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 15,
  },
  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
  },
  dropdownLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  chainIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  miniIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  arrowIcon: {
    width: 11,
    height: 11,
    transform: [{ rotate: "270deg" }],
    marginLeft: 5,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  sheetTitle: {
    textAlign: "center",
    marginBottom: 20,
  },
  chainItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  poolItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  chainItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  sheetIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  selectedCheck: {
    width: 16,
    height: 16,
  },
  searchBox: {
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    justifyContent: "center",
    marginBottom: 15,
  },
  searchInput: {
    fontSize: 14,
    padding: 0,
  },
  poolTabs: {
    flexDirection: "row",
    marginBottom: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  poolTab: {
    paddingVertical: 10,
    marginRight: 20,
  },
  sheetActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    gap: 12,
  },
  resetBtn: {
    flex: 1,
    height: 45,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  applyBtn: {
    flex: 1,
    height: 45,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
