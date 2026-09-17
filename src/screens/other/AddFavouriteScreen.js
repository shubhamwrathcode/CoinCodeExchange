import React, { useState, useMemo, useCallback, useEffect } from "react";
import { StyleSheet, View, TouchableOpacity, RefreshControl, ScrollView } from "react-native";
import { AppSafeAreaView, AppText, BOLD, Button, EIGHTEEN, SIXTEEN } from "../../shared";
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
import { colors } from "../../theme/colors";

const AddFavouriteScreen = () => {
  const dispatch = useAppDispatch();
  const coinPairs = useAppSelector((state) => state.home.coinPairs);
  const [activeTab, setActiveTab] = useState("Spot");
  const [spotSubCategory, setSpotSubCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const favoriteArray = useAppSelector((state) => state.home.favoriteArray);
  const [favouriteCoins, setFavouriteCoins] = useState(favoriteArray || []);

  useEffect(() => {
    if (favoriteArray) {
      setFavouriteCoins(favoriteArray);
    }
  }, [favoriteArray]);

  const handleToggleFavorite = useCallback((id) => {
    dispatch(addToFavorites({ pair_id: id }));
  }, [dispatch]);

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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(getFavoriteArray());
    setTimeout(() => setRefreshing(false), 1000);
  }, [dispatch]);

  const showSearch = true;
  const showSubTabs = activeTab === "Spot" || activeTab === "Cryptos";

  const renderContent = () => {
    switch (activeTab) {
      case "Favorites":
        const filteredFavorites = coinPairs.filter(p => favouriteCoins.includes(p._id));
        return <SpotMarket coinPairs={filteredFavorites} search={search} subCategory={spotSubCategory} hideStar={false} favoriteArray={favouriteCoins} onToggleFavorite={handleToggleFavorite} />;
      case "Spot":
        return <SpotMarket coinPairs={coinPairs} search={search} subCategory={spotSubCategory} hideStar={false} favoriteArray={favouriteCoins} onToggleFavorite={handleToggleFavorite} />;
      case "Cryptos":
        return <CryptosMarket coinPairs={coinPairs} search={search} subCategory={spotSubCategory} hideStar={false} favoriteArray={favouriteCoins} onToggleFavorite={handleToggleFavorite} />;
      case "USD_M_FUTURES":
      case "COIN_M_FUTURES":
        return <FuturesMarket type={activeTab === "USD_M_FUTURES" ? "USDT" : "COIN"} search={search} hideStar={false} />;
      default:
        return <SpotMarket coinPairs={coinPairs} search={search} subCategory={spotSubCategory} hideStar={false} favoriteArray={favouriteCoins} onToggleFavorite={handleToggleFavorite} />;
    }
  };

  return (
    <AppSafeAreaView style={{ backgroundColor: colors.white }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => NavigationService.goBack()} style={styles.backBtn}>
          <FastImage
            source={back_ic}
            style={styles.backIcon}
            resizeMode="contain"
            tintColor={colors.black}
          />
        </TouchableOpacity>
        <AppText weight={BOLD} type={EIGHTEEN} style={{ color: colors.black }}>
          Add to Favourite
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={{ bottom: 10 }}>
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
          {renderContent()}
        </View>
      </ScrollView>
    </AppSafeAreaView>
  );
};

export default AddFavouriteScreen;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    // borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    padding: 8,
    left: -8,
  },
  backIcon: {
    width: 20,
    height: 20,
  },
});
