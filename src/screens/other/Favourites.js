import React, { useMemo, useCallback, useState, useRef, useEffect } from "react";
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import FastImage from "react-native-fast-image";
import { Star, Plus, ChevronRight } from "lucide-react-native";
import { useDispatch } from "react-redux";

import { AppText, BOLD, Button, FOURTEEN, MEDIUM, SEMI_BOLD, TWELVE } from "../../shared";
import { addToFavorites } from "../../actions/homeActions";
import { useAppSelector } from "../../store/hooks";
import { ADD_FAVOURITE_SCREEN, LOGIN_SCREEN, TRADE_SCREEN, WALLET_SCREEN } from "../../navigation/routes";
import { NO_NOTIFICATION_ICON, NO_NOTIFICATION_ICON_LIGHT } from "../../helper/ImageAssets";
import NavigationService from "../../navigation/NavigationService";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { toFixedFive, toFixedThree } from "../../helper/utility";
import { useTheme } from "../../hooks/useTheme";
import MiniChart from "../../shared/components/MiniChart";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 45) / 2;

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

const Favourites = ({
  style,
  from,
  coinPairs: propsCoinPairs,
  search: propsSearch = "",
  isLoggedIn = true,
  isSelectionModeForce = false,
  subCategory = "All",
  onPress,
}) => {
  const dispatch = useDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const theme = isDark ? "Dark" : "Light";
  const userData = useAppSelector((state) => state.auth.userData);
  const favoriteArray = useAppSelector((state) => state.home.favoriteArray || []);
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
    if (isTrendingFallback) {
      return trendingPairs.slice(0, 6);
    }

    if (from === "home") {
      if (favFilteredData.length >= 6) {
        return favFilteredData.slice(0, 6);
      } else {
        const favIds = new Set(favFilteredData.map((p) => p?._id));
        const padding = trendingPairs.filter((p) => !favIds.has(p?._id));
        return [...favFilteredData, ...padding].slice(0, 6);
      }
    }

    return isSelectionMode ? filterPairData : favFilteredData;
  }, [from, isSelectionMode, isTrendingFallback, trendingPairs, filterPairData, favFilteredData]);

  const renderData = from === "home" ? displayData : (isSelectionMode ? displayData : stabilizedList);

  useEffect(() => {
    if (!hasAutoSelectedHome.current && displayData.length > 0 && from === "home") {
      setFavouriteCoins(displayData.map((p) => p._id));
      hasAutoSelectedHome.current = true;
    }
  }, [displayData, from]);

  useEffect(() => {
    if (favoriteArray && from !== "home") {
      setFavouriteCoins(favoriteArray);
    }
  }, [favoriteArray, from]);

  useEffect(() => {
    if (isFocused) {
      setStabilizedList(displayData);
    }
  }, [isFocused, displayData]);

  useEffect(() => {
    setStabilizedList((prev) => {
      const newItems = displayData.filter((item) => !prev.find((p) => p._id === item._id));
      if (newItems.length === 0) return prev;
      return [...prev, ...newItems];
    });
  }, [displayData]);

  const handleUnselectCoin = useCallback((coinId) => {
    setFavouriteCoins((prev) => {
      if (prev.includes(coinId)) {
        return prev.filter((id) => id !== coinId);
      } else {
        return [...prev, coinId];
      }
    });
  }, []);

  const handleNavigate = useCallback((item) => {
    if (onPress) {
      onPress(item);
    } else {
      NavigationService.navigate(TRADE_SCREEN, { coinDetail: item });
    }
  }, [onPress]);

  const renderCoinIcon = (item, sym) => {
    const iconUri = item?.icon_path || null;
    const initial = sym.substring(0, 1).toUpperCase();
    const bgColor = getCoinBadgeBg(sym);

    if (iconUri) {
      return (
        <FastImage
          source={{ uri: iconUri }}
          style={styles.coinIconImg}
          resizeMode={FastImage.resizeMode.contain}
        />
      );
    }

    return (
      <View style={[styles.coinIconBadge, { backgroundColor: bgColor }]}>
        <AppText style={styles.coinIconText}>{initial}</AppText>
      </View>
    );
  };

  const renderCard = useCallback(
    ({ item, index }) => {
      const isSelected = favouriteCoins.includes(item._id);
      const sym = String(item?.base_currency || "").toUpperCase();
      const quote = String(item?.quote_currency || "").toUpperCase();
      const pairText = `${sym}/${quote}`;
      const fullName =
        item?.base_currency_fullname ||
        item?.base_currency_name ||
        item?.name ||
        sym;

      const change = Number(item?.change_percentage) || 0;
      const isPositive = change >= 0;
      const pctStr = `${isPositive ? "+" : ""}${change.toFixed(2)}%`;
      const changeColor = isPositive ? "#00C853" : "#FF3B30";

      const rawPrice = Number(item?.last_price || item?.buy_price || item?.price || 0);
      const priceStr =
        rawPrice > 1
          ? rawPrice.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : rawPrice.toFixed(4);

      return (
        <TouchableOpacity
          style={[
            styles.card,
            {
              backgroundColor: isDark ? "#0F1012" : "#FFFFFF",
              borderColor: isDark ? "rgba(255, 255, 255, 0.06)" : themeColors.border,
            },
          ]}
          onPress={() => handleNavigate(item)}
          activeOpacity={0.8}
        >
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.coinInfo}>
              {renderCoinIcon(item, sym)}
              <View style={{ marginLeft: 8, flex: 1 }}>
                <AppText
                  style={[
                    styles.pairText,
                    { color: isDark ? colors.white : themeColors.text },
                  ]}
                  numberOfLines={1}
                >
                  {pairText}
                </AppText>
                <AppText
                  style={[
                    styles.nameText,
                    { color: colors.darkShadeColorText || "#9CA3AF" },
                  ]}
                  numberOfLines={1}
                >
                  {fullName}
                </AppText>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => handleUnselectCoin(item._id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.starTouch}
            >
              <Star
                color="#FFD700"
                fill={isSelected ? "#FFD700" : "transparent"}
                size={16}
              />
            </TouchableOpacity>
          </View>

          {/* MiniChart */}
          <View style={styles.chartContainer}>
            <MiniChart
              data={item?.chart_data || item?.sparkline}
              isPositive={isPositive}
              seed={item?._id || sym}
              width={CARD_WIDTH - 20}
              height={26}
            />
          </View>

          {/* Card Footer */}
          <View style={styles.cardFooter}>
            <View
              style={[
                styles.changeBadge,
                {
                  backgroundColor: isPositive
                    ? "rgba(0, 200, 83, 0.15)"
                    : "rgba(255, 59, 48, 0.15)",
                },
              ]}
            >
              <AppText style={[styles.changeText, { color: changeColor }]}>
                {pctStr}
              </AppText>
            </View>
            <AppText
              style={[
                styles.priceText,
                { color: isDark ? colors.white : themeColors.text },
              ]}
            >
              {priceStr}
            </AppText>
          </View>
        </TouchableOpacity>
      );
    },
    [favouriteCoins, isDark, themeColors, handleNavigate, handleUnselectCoin]
  );

  const handleAddFavouritesAction = async () => {
    const toAdd = (favouriteCoins || []).filter((id) => !favoriteArray.includes(id));
    if (toAdd.length > 0) {
      setBtnLoading(true);
      const promises = toAdd.map((id, idx) => {
        const isLast = idx === toAdd.length - 1;
        return dispatch(addToFavorites({ pair_id: id }, !isLast ? true : false));
      });
      await Promise.all(promises);
      setBtnLoading(false);
    }
    NavigationService.navigate(ADD_FAVOURITE_SCREEN);
  };

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
          </AppText>{" "}
          to manage and view your favorite coins from Spot.
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

  return (
    <View style={[styles.container, style]}>
      {from === "home" ? (
        <View style={styles.contentWrap}>
          <View style={styles.columnWrapper}>
            {(displayData || [])
              .filter((item) => item?._id)
              .slice(0, 6)
              .map((item, index) => (
                <View key={item._id} style={{ width: CARD_WIDTH, marginBottom: 12 }}>
                  {renderCard({ item, index })}
                </View>
              ))}
          </View>

          <View style={styles.addButtonContainer}>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.cyan }]}
              onPress={handleAddFavouritesAction}
              activeOpacity={0.85}
              disabled={btnLoading}
            >
              {btnLoading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <View style={styles.addIconContainer}>
                  <Plus color={colors.black} size={16} strokeWidth={3} />
                </View>
              )}
              <AppText style={styles.addButtonText}>Add Favourites</AppText>
              <View style={{ flex: 1 }} />
              <ChevronRight color={colors.white} size={24} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <FlatList
          data={(renderData || []).filter((item) => item?._id)}
          keyExtractor={(item) => item._id}
          renderItem={renderCard}
          numColumns={2}
          columnWrapperStyle={styles.listColumnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <View style={styles.addButtonContainer}>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.cyan }]}
                onPress={() => NavigationService.navigate(ADD_FAVOURITE_SCREEN)}
                activeOpacity={0.85}
              >
                <View style={styles.addIconContainer}>
                  <Plus color={colors.black} size={16} strokeWidth={3} />
                </View>
                <AppText style={styles.addButtonText}>Add Favourites</AppText>
                <View style={{ flex: 1 }} />
                <ChevronRight color={colors.white} size={24} />
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrap: {
    paddingHorizontal: 15,
    paddingTop: 12,
  },
  listContent: {
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 90,
  },
  columnWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  listColumnWrapper: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  coinInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 4,
  },
  coinIconImg: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  coinIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  coinIconText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: fonts.bold,
  },
  pairText: {
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  nameText: {
    fontSize: 9,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  starTouch: {
    padding: 2,
  },
  chartContainer: {
    marginVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  changeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  changeText: {
    fontSize: 9,
    fontFamily: fonts.medium,
  },
  priceText: {
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  addButtonContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
  },
  addIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: fonts.semiBold,
    marginLeft: 10,
  },
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
});

export default Favourites;
