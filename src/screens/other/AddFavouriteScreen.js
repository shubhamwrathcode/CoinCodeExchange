import React, { useState, useMemo, useCallback, useEffect } from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { AppSafeAreaView, AppText, BOLD, EIGHTEEN, SIXTEEN } from "../../shared";
import { useTheme } from "../../hooks/useTheme";
import FastImage from "react-native-fast-image";
import { back_ic } from "../../helper/ImageAssets";
import NavigationService from "../../navigation/NavigationService";
import MarketHeader from "./MarketHeader";
import SpotMarket from "./SpotMarket";
import CryptosMarket from "./CryptosMarket";
import FuturesMarket from "./FuturesMarket";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { getFavoriteArray, addToFavorites } from "../../actions/homeActions";

const AddFavouriteScreen = () => {
  const { colors: themeColors, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const coinPairs = useAppSelector((state) => state.home.coinPairs);
  const [activeTab, setActiveTab] = useState("Spot");
  const [spotSubCategory, setSpotSubCategory] = useState("All");
  const [search, setSearch] = useState("");
  const favoriteArray = useAppSelector((state) => state.home.favoriteArray);
  const [favouriteCoins, setFavouriteCoins] = useState(favoriteArray || []);

  useEffect(() => {
    if (favoriteArray) {
      setFavouriteCoins(favoriteArray);
    }
  }, [favoriteArray]);

  const handleToggleFavorite = useCallback(
    (id) => {
      dispatch(addToFavorites({ pair_id: id }));
    },
    [dispatch]
  );

  const spotSubCategories = useMemo(() => {
    const list = Array.isArray(coinPairs) ? coinPairs : [];
    if (!list.length) return [];
    const s = new Set();
    for (const p of list) {
      const sc = p?.sub_category;
      if (sc != null && String(sc).trim() !== "") s.add(String(sc).trim());
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [coinPairs]);

  const showSearch = true;
  const showSubTabs = activeTab === "Spot" || activeTab === "Cryptos";

  const renderContent = () => {
    switch (activeTab) {
      case "Favorites":
        const filteredFavorites = (coinPairs || []).filter((p) =>
          favouriteCoins.includes(p._id)
        );
        return (
          <SpotMarket
            coinPairs={filteredFavorites}
            search={search}
            subCategory={spotSubCategory}
            hideStar={false}
            favoriteArray={favouriteCoins}
            onToggleFavorite={handleToggleFavorite}
          />
        );
      case "Spot":
        return (
          <SpotMarket
            coinPairs={coinPairs}
            search={search}
            subCategory={spotSubCategory}
            hideStar={false}
            favoriteArray={favouriteCoins}
            onToggleFavorite={handleToggleFavorite}
          />
        );
      case "Cryptos":
        return (
          <CryptosMarket
            coinPairs={coinPairs}
            search={search}
            subCategory={spotSubCategory}
            hideStar={false}
            favoriteArray={favouriteCoins}
            onToggleFavorite={handleToggleFavorite}
          />
        );
      case "USD_M_FUTURES":
      case "COIN_M_FUTURES":
        return (
          <FuturesMarket
            type={activeTab === "USD_M_FUTURES" ? "USDT" : "COIN"}
            search={search}
            hideStar={false}
          />
        );
      default:
        return (
          <SpotMarket
            coinPairs={coinPairs}
            search={search}
            subCategory={spotSubCategory}
            hideStar={false}
            favoriteArray={favouriteCoins}
            onToggleFavorite={handleToggleFavorite}
          />
        );
    }
  };

  return (
    <AppSafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => NavigationService.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <FastImage
            source={back_ic}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <AppText weight={BOLD} type={SIXTEEN} style={[styles.headerTitle, { color: themeColors.text }]}>
          Add to Favourite
        </AppText>
        <View style={styles.headerRightPlaceholder} />
      </View>

      {/* Fixed Market Search & Tab Header */}
      <MarketHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        search={search}
        onSearchChange={setSearch}
        showSearch={showSearch}
        showSubTabs={showSubTabs}
        subCategories={spotSubCategories}
        activeSubCategory={spotSubCategory}
        onSubCategoryChange={setSpotSubCategory}
      />

      {/* Main Market List Content */}
      <View style={styles.contentWrap}>
        {renderContent()}
      </View>
    </AppSafeAreaView>
  );
};

export default AddFavouriteScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: {
    padding: 6,
    marginLeft: -6,
  },
  backIcon: {
    width: 35,
    height: 35,
  },
  headerTitle: {
    textAlign: "center",
  },
  headerRightPlaceholder: {
    width: 32,
  },
  contentWrap: {
    flex: 1,
  },
});
