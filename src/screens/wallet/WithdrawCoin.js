import {
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AppSafeAreaView,
  AppText,
  DISCLAIMTEXT,
  FOURTEEN,
  SEMI_BOLD,
  TWENTY,
} from "../../shared";
import KeyBoardAware from "../../shared/components/KeyboardAware";
import FastImage from "react-native-fast-image";
import { back_ic, searchIcon } from "../../helper/ImageAssets";
import { useCallback, useState } from "react";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import NavigationService from "../../navigation/NavigationService";
import {
  WALLET_WITHDRAW_SCREEN,
  WITHDRAW_INR_SCREEN,
} from "../../navigation/routes";
import { useAppSelector } from "../../store/hooks";
import { useDispatch } from "react-redux";
import { getDepositFiatCoins, getWithdrawActiveCoins } from "../../actions/walletActions";
import { BASE_URL } from "../../helper/Constants";
import { colors } from "../../theme/colors";
import {
  isWithdrawCoinDisabled,
  networkKeysFromChain,
} from "../../helper/walletChainHelpers";
import { showError } from "../../helper/logger";
import ShimmerBone from "../../shared/components/ShimmerBone";

const WithdrawCoin = () => {
  const dispatch = useDispatch();
  const route = useRoute();
  const theme = useAppSelector((state) => state.auth.theme);
  const withdrawActiveCoins = useAppSelector((state) => state.wallet.withdrawActiveCoins);
  const depositFiatCoins = useAppSelector((state) => state.wallet.depositFiatCoins);
  const isFrom = route?.params?.data;
  const [activeTab, setActiveTab] = useState(isFrom || "Crypto");
  const [searchResult, setSearchResult] = useState("");
  const [filterData, setFilterData] = useState(null);
  const [listScreenLoading, setListScreenLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setListScreenLoading(true);
      (async () => {
        await Promise.all([
          dispatch(getWithdrawActiveCoins()),
          dispatch(getDepositFiatCoins()),
        ]);
        if (!cancelled) {
          setListScreenLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [dispatch])
  );

  const handleInputChange = (value) => {
    setSearchResult(value);
    if (activeTab === "Crypto") {
      const filteredItems = (withdrawActiveCoins || []).filter(
        (coin) =>
          coin?.short_name?.toLowerCase().includes(value.toLowerCase()) ||
          coin?.name?.toLowerCase().includes(value.toLowerCase())
      );
      setFilterData(filteredItems);
    } else {
      const filteredItems = (depositFiatCoins || []).filter(
        (coin) =>
          coin?.short_name?.toLowerCase().includes(value.toLowerCase()) ||
          coin?.name?.toLowerCase().includes(value.toLowerCase())
      );
      setFilterData(filteredItems);
    }
  };

  const handleReset = () => {
    setSearchResult("");
    setFilterData(null);
  };

  const listData =
    activeTab === "Fiat"
      ? filterData != null
        ? filterData
        : depositFiatCoins || []
      : filterData != null
        ? filterData
        : withdrawActiveCoins || [];

  return (
    <AppSafeAreaView style={{ backgroundColor: colors.newThemeColor }}>
      <KeyBoardAware>
        <View
          style={[
            styles.headerView,
            { backgroundColor: theme !== "Dark" ? "#FAF9F6" : undefined },
          ]}
        >
          <TouchableOpacity onPress={() => NavigationService.goBack()}>
            <FastImage
              source={back_ic}
              resizeMode="contain"
              style={{ width: 20, height: 20 }}
              tintColor={theme === "Dark" ? colors.white : colors.black}
            />
          </TouchableOpacity>
          <View
            style={[
              styles.searchView,
              {
                borderColor:
                  theme === "Dark" ? "#FFFFFF33" : "#00000033",
              },
            ]}
          >
            <FastImage
              source={searchIcon}
              tintColor={"#787878"}
              resizeMode="contain"
              style={{ width: 15, height: 15, marginHorizontal: 8 }}
            />
            <TextInput
              placeholder="Search"
              placeholderTextColor={"#787878"}
              maxLength={30}
              value={searchResult}
              onChangeText={handleInputChange}
              style={{
                flex: 1,
                color: theme !== "Dark" ? "#000000" : "#FFFFFF",
              }}
            />
          </View>
          <AppText
            style={{
              color: theme !== "Dark" ? "#F3BB2B" : colors.buttonDarkBg,
            }}
            weight={SEMI_BOLD}
            type={FOURTEEN}
            onPress={handleReset}
          >
            Cancel
          </AppText>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[
              styles.tabPill,
              activeTab === "Crypto" && styles.tabPillActive,
            ]}
            onPress={() => {
              setActiveTab("Crypto");
              handleReset();
            }}
          >
            <AppText
              weight={SEMI_BOLD}
              type={FOURTEEN}
              style={{
                color:
                  activeTab === "Crypto"
                    ? theme !== "Dark"
                      ? "#F3BB2B"
                      : colors.buttonDarkBg
                    : theme === "Dark"
                      ? colors.white
                      : colors.black,
              }}
            >
              Crypto
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabPill,
              activeTab === "Fiat" && styles.tabPillActive,
            ]}
            onPress={() => {
              setActiveTab("Fiat");
              handleReset();
            }}
          >
            <AppText
              weight={SEMI_BOLD}
              type={FOURTEEN}
              style={{
                color:
                  activeTab === "Fiat"
                    ? theme !== "Dark"
                      ? "#F3BB2B"
                      : colors.buttonDarkBg
                    : theme === "Dark"
                      ? colors.white
                      : colors.black,
              }}
            >
              Fiat
            </AppText>
          </TouchableOpacity>
        </View>

        <View style={{ margin: 20, flex: 1 }}>
          <AppText style={{ marginVertical: 16 }} type={TWENTY} weight={SEMI_BOLD}>
            Currency List
          </AppText>
          {listScreenLoading ? (
            <View style={{ paddingTop: 8 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 15,
                    gap: 10,
                  }}
                >
                  <ShimmerBone width={30} height={30} borderRadius={15} />
                  <View style={{ flex: 1 }}>
                    <ShimmerBone
                      width={72}
                      height={14}
                      borderRadius={4}
                      style={{ marginBottom: 8 }}
                    />
                    <ShimmerBone width="50%" height={11} borderRadius={4} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
          <FlatList
            data={listData}
            keyExtractor={(item, index) =>
              item?._id ? String(item._id) : String(index)
            }
            renderItem={({ item }) => {
              const withdrawDisabled =
                activeTab === "Crypto" && isWithdrawCoinDisabled(item);
              return (
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    alignItems: "center",
                    marginTop: 15,
                    opacity: withdrawDisabled ? 0.45 : 1,
                  }}
                  activeOpacity={withdrawDisabled ? 1 : 0.7}
                  onPress={() => {
                    if (withdrawDisabled) {
                      if (networkKeysFromChain(item?.chain).length === 0) {
                        showError("No withdrawal network available for this coin");
                      } else {
                        showError("No active withdrawal network for this coin");
                      }
                      return;
                    }
                    NavigationService.navigate(
                      activeTab === "Fiat"
                        ? WITHDRAW_INR_SCREEN
                        : WALLET_WITHDRAW_SCREEN,
                      { data: item }
                    );
                  }}
                >
                  <View style={{ borderRadius: 50, overflow: "hidden" }}>
                    <FastImage
                      source={{ uri: BASE_URL + item?.icon_path }}
                      style={{ width: 30, height: 30 }}
                      resizeMode="cover"
                    />
                  </View>
                  <AppText weight={SEMI_BOLD}>{item?.short_name}</AppText>
                  <AppText color={DISCLAIMTEXT}>{item?.name}</AppText>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={() => (
              <AppText
                weight={SEMI_BOLD}
                type={FOURTEEN}
                style={{ marginTop: 20 }}
              >
                No currency available
              </AppText>
            )}
          />
          )}
        </View>
      </KeyBoardAware>
    </AppSafeAreaView>
  );
};

export default WithdrawCoin;

const styles = StyleSheet.create({
  headerView: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  searchView: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    width: "70%",
    borderRadius: 50,
    height: 38,
    paddingHorizontal: 8,
  },
  tabRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  tabPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#00000033",
  },
  tabPillActive: {
    backgroundColor: "rgba(243, 187, 43, 0.12)",
  },
});
