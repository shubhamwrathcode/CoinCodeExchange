import React, { useMemo, useCallback, useState, useRef, useEffect } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View, Dimensions, ActivityIndicator } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import FastImage from "react-native-fast-image";
import { useDispatch } from "react-redux";

import { AppText, BOLD, Button, FOURTEEN, MEDIUM, SEMI_BOLD, TWELVE } from "../../shared";
import { coinActive, coinInActive, favCheck } from "../../helper/ImageAssets";
import { addToFavorites } from "../../actions/homeActions";
import { useAppSelector } from "../../store/hooks";
import MarketList from "./MarketList";
import { ADD_FAVOURITE_SCREEN, LOGIN_SCREEN, WALLET_SCREEN, MARKET_SCREEN } from "../../navigation/routes";
import { NO_NOTIFICATION_ICON, NO_NOTIFICATION_ICON_LIGHT } from "../../helper/ImageAssets";
import NavigationService from "../../navigation/NavigationService";
import { colors } from "../../theme/colors";
import { toFixedFive, toFixedThree } from "../../helper/utility";
import { useTheme } from "../../hooks/useTheme";
import { IMAGE_BASE_URL } from "../../helper/Constants";

const Favourites = ({ style, from, coinPairs: propsCoinPairs, search: propsSearch = "", isLoggedIn = true, isSelectionModeForce = false, subCategory = "All", onPress }) => {
  const dispatch = useDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const theme = isDark ? "Dark" : "Light";
  const userData = useAppSelector((state) => state.auth.userData);
  const favoriteArray = useAppSelector((state) => state.home.favoriteArray);
  const [btnLoading, setBtnLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const [favouriteCoins, setFavouriteCoins] = useState(from === "home" ? [] : (favoriteArray || []));
  const [stabilizedList, setStabilizedList] = useState([]);
  const hasAutoSelectedHome = useRef(false);
  const isFocused = useIsFocused();

  const search = propsSearch || "";
  const coinPairs = propsCoinPairs || useAppSelector((state) => state.home.coinPairs);

  const pairVolumeNumber = useCallback((p) => {
    const toNum = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    return (
      toNum(p?.volume_24h) ||
      toNum(p?.volume) ||
      toNum(p?.quote_volume) ||
      0
    );
  }, []);

  const filterPairData = useMemo(() => {
    let data = [...(coinPairs || [])];
    if (subCategory && subCategory !== "All") {
      data = data.filter((item) => String(item?.sub_category ?? "").trim() === String(subCategory).trim());
    }
    if (search) {
      const s = search.toLowerCase();
      data = data.filter(
        (item) =>
          item?.base_currency?.toLowerCase()?.includes(s) ||
          item?.quote_currency?.toLowerCase()?.includes(s)
      );
    }
    return data;
  }, [coinPairs, search, subCategory]);

  const favFilteredData = useMemo(() => {
    if (!isLoggedIn || !favoriteArray?.length) return [];
    return filterPairData.filter((item) => favoriteArray.includes(item?._id));
  }, [isLoggedIn, favoriteArray, filterPairData]);

  const globalCoinPairs = useAppSelector((state) => state.home.coinPairs);
  const trendingPairs = useMemo(() => {
    return [...(globalCoinPairs || [])]
      .sort((a, b) => pairVolumeNumber(b) - pairVolumeNumber(a))
      .slice(0, 6);
  }, [globalCoinPairs, pairVolumeNumber]);

  const isTrendingFallback = useMemo(() => {
    return !isSelectionModeForce && (!favoriteArray || favoriteArray?.length === 0);
  }, [isSelectionModeForce, favoriteArray]);

  const isSelectionMode = isSelectionModeForce || !favoriteArray || favoriteArray?.length === 0;

  const displayData = useMemo(() => {
    // If it's the fallback (no favorites yet), show exactly 6 trending coins
    if (isTrendingFallback) {
      return trendingPairs.slice(0, 6);
    }

    // On home screen, always limit to 6 (favorites padded by trending)
    if (from === "home") {
      if (favFilteredData.length >= 6) {
        return favFilteredData.slice(0, 6);
      } else {
        const favIds = new Set(favFilteredData.map(p => p?._id));
        const padding = trendingPairs.filter(p => !favIds.has(p?._id));
        return [...favFilteredData, ...padding].slice(0, 6);
      }
    }

    // On Market screen/Manage Favourites, show full data
    return isSelectionMode ? filterPairData : favFilteredData;
  }, [from, isSelectionMode, isTrendingFallback, trendingPairs, filterPairData, favFilteredData]);

  const renderData = from === "home" ? displayData : (isSelectionMode ? displayData : stabilizedList);

  React.useEffect(() => {
    if (!hasAutoSelectedHome.current && displayData.length > 0 && from === "home") {
      setFavouriteCoins(displayData.map(p => p._id));
      hasAutoSelectedHome.current = true;
    }
  }, [displayData, from]);

  React.useEffect(() => {
    if (favoriteArray && from !== "home") {
      setFavouriteCoins(favoriteArray);
    }
  }, [favoriteArray, from]);

  React.useEffect(() => {
    if (isFocused) {
      setStabilizedList(displayData);
    }
  }, [isFocused, displayData]);

  React.useEffect(() => {
    setStabilizedList((prev) => {
      const newItems = displayData.filter((item) => !prev.find((p) => p._id === item._id));
      if (newItems.length === 0) return prev;
      return [...prev, ...newItems];
    });
  }, [displayData]);

  const handleUnselectCoin = (coinId) => {
    setFavouriteCoins((prev) => {
      if (prev.includes(coinId)) {
        return prev.filter((id) => id !== coinId);
      } else {
        return [...prev, coinId];
      }
    });
  };

  const handleNavigate = (item) => {
    if (onPress) {
      onPress(item);
    } else {
      NavigationService.navigate(WALLET_SCREEN, { coinDetail: item });
    }
  };

  const renderFavoriteRow = useCallback(({ item, index }) => {
    const isCard = from === "home";
    const isSelected = favouriteCoins.includes(item._id);
    const sym = String(item?.base_currency || '').toUpperCase();
    const quote = String(item?.quote_currency || '').toUpperCase();
    const change = Number(item?.change_percentage) || 0;
    const isPositive = change >= 0;
    const pctStr = `${isPositive ? '+' : ''}${change.toFixed(2)}%`;
    const iconUri = item?.icon_path ? IMAGE_BASE_URL + item.icon_path : null;
    const priceStr = `$${Number(item?.last_price || item?.buy_price || 0).toFixed(2)}`;

    return (
      <TouchableOpacity
        style={[
          isCard ? styles.card : styles.listRow,
          {
            backgroundColor: theme === "Dark" ? "#1E2329" : (isCard ? "#F7F7F7" : "transparent"),
            marginRight: isCard ? (index % 2 === 0 ? 2 : 0) : 0,
            marginLeft: isCard ? (index % 2 === 0 ? 0 : 2) : 0,
            width: isCard ? '100%' : '100%',
          }
        ]}
        onPress={() => handleUnselectCoin(item._id)}
        activeOpacity={0.8}
      >
        <View style={isCard ? styles.cardTop : styles.rowContent}>
          <View style={styles.cardInfo}>
            {iconUri ? (
              <FastImage source={{ uri: iconUri }} style={styles.cardIcon} resizeMode="contain" />
            ) : (
              <View style={[styles.cardIcon, { backgroundColor: '#ddd', borderRadius: 10 }]} />
            )}
            <View>
              <AppText weight={MEDIUM} style={[styles.cardSym, { color: themeColors.text }]}>
                {sym}<AppText style={{ color: '#9CA3AF', fontSize: 12 }}>/{quote}</AppText>
              </AppText>
              {!isCard && (
                <AppText numberOfLines={1} style={{ color: '#9CA3AF', fontSize: 11, maxWidth: 100 }}>
                  {item?.base_currency_fullname || item?.base_currency_name || sym}
                </AppText>
              )}
            </View>
          </View>

          {!isCard && (
            <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 15 }}>
              <AppText weight={SEMI_BOLD} style={{ color: themeColors.text, fontSize: 13 }}>{priceStr}</AppText>
              <AppText style={{ color: '#9CA3AF', fontSize: 10 }}>${toFixedThree(item?.usd_price || 0)}</AppText>
            </View>
          )}

          {!isCard && (
            <View style={[styles.listChgPill, { backgroundColor: isPositive ? "#2DBE7E" : "#EF4444" }]}>
              <Text style={styles.listChgText}>{pctStr}</Text>
            </View>
          )}

          {isCard && (
            <View>
              {processingId === item._id ? (
                <ActivityIndicator size="small" color={isDark ? "#fff" : "#000"} />
              ) : isSelected ? (
                <FastImage source={favCheck} style={styles.cardCheck} resizeMode="contain" />
              ) : (
                <View style={[styles.cardCheckEmpty, { borderColor: isDark ? '#555' : '#D1D5DB' }]} />
              )}
            </View>
          )}
        </View>
        {isCard && (
          <AppText
            weight={MEDIUM}
            style={[
              styles.cardPct,
              { color: isPositive ? colors.green : colors.red }
            ]}
          >
            {pctStr}
          </AppText>
        )}
      </TouchableOpacity>
    );
  }, [favouriteCoins, theme, themeColors, handleUnselectCoin, isDark, processingId]);

  if (!isLoggedIn && from !== "home") {
    return (
      <View style={[style, styles.emptyWrap]}>
        <AppText type={FOURTEEN} style={{ color: colors.disabledText, textAlign: "center", lineHeight: 22 }}>
          No results found. Please{" "}
          <AppText
            type={FOURTEEN}
            weight="bold"
            style={{ color: colors.buttonBg }}
            onPress={() => NavigationService.navigate(LOGIN_SCREEN)}
          >
            Sign in
          </AppText>
          {" "}to manage and view your favorite coins from Spot.
        </AppText>
      </View>
    );
  }

  if (!userData && from !== "home") {
    return (
      <View style={styles.emptyContainer}>
        <FastImage
          source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT}
          style={styles.emptyIcon}
          resizeMode="contain"
        />
        <AppText style={[styles.emptyText, { color: themeColors.secondaryText }]}>
          Log in to view and manage your favorites.
        </AppText>
        <Button
          children="Log In / Sign Up"
          containerStyle={styles.emptyBtn}
          onPress={() => NavigationService.navigate(LOGIN_SCREEN)}
        />
      </View>
    );
  }

  if (isSelectionMode && !isSelectionModeForce && from !== "home") {
    return (
      <View style={styles.emptyContainer}>
        <FastImage
          source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT}
          style={styles.emptyIcon}
          resizeMode="contain"
        />
        <AppText style={[styles.emptyText, { color: themeColors.secondaryText }]}>
          You haven't added any favorites yet.
        </AppText>
        <Button
          children="Add Favourites"
          containerStyle={styles.emptyBtn}
          onPress={() => NavigationService.navigate(ADD_FAVOURITE_SCREEN)}
        />
      </View>
    );
  }

  return (
    <View style={style}>
      <View style={{ paddingHorizontal: from === "home" ? 0 : 5, marginTop: from === "home" ? 15 : 15, }}>
        {from === "home" ? (
          <View>
            <View style={[styles.columnWrapper, { flexWrap: 'wrap', flexDirection: 'row' }]}>
              {(displayData || []).filter((item) => item?._id).slice(0, 6).map((item, index) => (
                <View key={item._id} style={{ width: '49%', marginBottom: 6 }}>
                  {renderFavoriteRow({ item, index })}
                </View>
              ))}
            </View>
            {from === "home" && (favouriteCoins || []).length > 0 && (
              <View style={{ marginTop: 20, marginBottom: 5 }}>
                <Button
                  loading={btnLoading}
                  children="Add to Favourite"
                  containerStyle={styles.mainBtn}
                  onPress={async () => {
                    const toAdd = (favouriteCoins || []).filter(id => !favoriteArray.includes(id));
                    if (toAdd.length === 0) return;

                    setBtnLoading(true);
                    // Use Promise.all to wait for all additions
                    const promises = toAdd.map((id, idx) => {
                      const isLast = idx === toAdd.length - 1;
                      return dispatch(addToFavorites({ pair_id: id }, !isLast ? true : false));
                    });
                    await Promise.all(promises);
                    setBtnLoading(false);
                  }}
                />
              </View>
            )}
          </View>
        ) : (
          <FlatList
            data={(renderData || []).filter((item) => item?._id)}
            keyExtractor={(item) => item._id}
            renderItem={renderFavoriteRow}
            numColumns={1}
            scrollEnabled={true}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListFooterComponent={null}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyWrap: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    minHeight: 200,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  emptyBtn: {
    width: 150,
    height: 40,
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#333",
  },
  rowContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  card: {
    borderRadius: 12,
    padding: 12,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  cardSym: {
    fontSize: 14,
  },
  cardCheck: {
    width: 17,
    height: 17
  },
  cardCheckEmpty: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
  },
  cardPct: {
    fontSize: 12,
    marginTop: 4,
  },
  mainBtn: {
    width: "100%",
    height: 45,
  },
  listChgPill: {
    minWidth: 75,
    paddingHorizontal: 8,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  listChgText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});

export default Favourites;
