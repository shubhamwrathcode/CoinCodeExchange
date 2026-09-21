import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Dimensions, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { AppSafeAreaView, AppText, BLACK, BOLD, Button, DISCLAIMTEXT, FOURTEEN, MEDIUM, SEMI_BOLD, SIXTEEN, TEN, TWELVE, TWENTY, WHITE } from "../../shared";
import KeyBoardAware from "../../shared/components/KeyboardAware";
import FastImage from "react-native-fast-image";
import { back_ic, BACK_ICON, activities_icon, moreOption, printIcon, sideIcon } from "../../helper/ImageAssets";
import NavigationService from "../../navigation/NavigationService";
import { colors } from "../../theme/colors";
import { fontFamilyMedium } from "../../theme/typography";
import { useTheme } from "../../hooks/useTheme";
import { useAppSelector } from "../../store/hooks";
import { useDispatch } from "react-redux";
import { getParticularCoinBalance, getUserMainWallet, getWalletType, handleTranferCoin } from "../../actions/walletActions";
import WalletTypeModal from "../../shared/components/WalletTypeModal";
import CoinListModal from "../../shared/components/CoinListModal";
import { IMAGE_BASE_URL } from "../../helper/Constants";
import TransferModal from "../../shared/components/TransferModal";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import TransferSkeleton from "./TransferSkeleton";
import CoinIcon from "../../common/CoinIcon";

const formatWalletName = (name) => {
  if (!name) return "";
  const lower = name.toLowerCase();
  if (lower === "spot") return "Spot Wallet";
  if (lower === "main") return "Main Wallet";
  if (lower === "funding") return "Funding Wallet";
  if (lower === "futures") return "Futures Wallet";
  if (lower === "options") return "Options Wallet";
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() + " Wallet";
};

const normalizeWalletTypes = (rawList) => {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .map(item => {
      if (item == null) return null;
      if (typeof item === "string") return item.trim().toLowerCase();
      if (typeof item === "object") {
        return (item.wallet_type ?? item.walletType ?? item.type ?? item.key ?? item.slug ?? item.id ?? item.name ?? "").toString().trim().toLowerCase();
      }
      return String(item).trim().toLowerCase();
    })
    .filter(Boolean);
};

const Transfer = () => {
  const dispatch = useDispatch();
  const route = useRoute();
  const { colors: themeColors, isDark } = useTheme();
  const theme = isDark ? "Dark" : "Light";
  const rawWalletTypes = useAppSelector(state => state.wallet.walletTypes);
  const WalletTypes = useMemo(() => normalizeWalletTypes(rawWalletTypes), [rawWalletTypes]);
  const userWallet = useAppSelector(state => state.wallet.userMainWallet);
  const [coin, setCoin] = useState(userWallet[0]);
  const particularCoinBalance = useAppSelector(state => state.wallet.particularCoinBalance);
  const [fromWallet, setFromWallet] = useState(undefined);
  const [toWallet, setToWallet] = useState(undefined);
  const [modalVisible, setModalVisible] = useState(false);
  const [coinModal, setCoinModal] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const isFirstMount = useRef(true);

  const [type, setType] = useState('');
  const [amount, setAmount] = useState('');

  const loading = useAppSelector(state => state.auth.isLoading);

  const buildCoinIconUri = useCallback((iconPath) => {
    const raw = iconPath === undefined || iconPath === null ? "" : String(iconPath).trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    const base = String(IMAGE_BASE_URL || "").replace(/\/+$/, "");
    const path = raw.startsWith("/") ? raw : `/${raw}`;
    return `${base}${path}`;
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isFirstMount.current) {
        // Only show skeleton on the very first load
        setIsInitialLoad(true);
        isFirstMount.current = false;
      }
      dispatch(getWalletType());
      if (fromWallet) dispatch(getUserMainWallet(fromWallet?.toLowerCase()));
      return () => { };
    }, [dispatch, fromWallet])
  );

  useEffect(() => {
    if (!Array.isArray(WalletTypes) || WalletTypes.length === 0) return;
    // Web parity defaults: From=spot, To=main (if available)
    const norm = (v) => String(v || "").toLowerCase();
    const hasSpot = WalletTypes.some((t) => norm(t) === "spot");
    const hasMain = WalletTypes.some((t) => norm(t) === "main");
    const nextFrom = hasSpot ? "spot" : WalletTypes[0];
    const nextTo =
      hasMain && norm(nextFrom) !== "main"
        ? "main"
        : WalletTypes.find((t) => norm(t) !== norm(nextFrom)) || WalletTypes[0];
    setFromWallet((prev) => (prev ? prev : nextFrom));
    setToWallet((prev) => (prev ? prev : nextTo));
  }, [WalletTypes]);

  useEffect(() => {
    const c = route?.params?.coin;
    if (!c) return;
    setCoin(c);
  }, [route?.params?.coin]);

  useEffect(() => {
    let data = {
      fromWallet: fromWallet,
      toWallet: toWallet,
      currencyId: coin?.currency_id
    }
    if (Object.keys(coin)?.length > 0 && fromWallet && fromWallet !== "" && toWallet && toWallet !== "") {
      dispatch(getParticularCoinBalance(data));
    }

  }, [coin, fromWallet, toWallet, visible]);

  const handleSelect = (item) => {
    type === "from" ? setFromWallet(item) : setToWallet(item);
    // Sheet closes via onClose after its own animation
  };

  const handleSelectCoin = (item) => {
    setCoin(item);
    setCoinModal(false);
  };

  const handleTransfer = () => {
    let data = {
      fromWallet: fromWallet,
      toWallet: toWallet,
      amount: amount,
      currencyId: coin?.currency_id
    }
    dispatch(handleTranferCoin(data, setVisible, setAmount));
  }

  const openModal = (type) => {
    setType(type);
    setModalVisible(true);
  };

  useEffect(() => {
    if (particularCoinBalance != null) {
      setIsInitialLoad(false);
    }
  }, [particularCoinBalance]);

  const handlePopup = (theme) => {
    setVisible(false);
  };

  return (
    <AppSafeAreaView style={{ backgroundColor: colors.white }} isfrom>
      {/* Static header - no skeleton */}
      <View style={[styles.headerSection, { paddingHorizontal: 20, }]}>
        <View style={styles.headerView}>
          <TouchableOpacity onPress={() => NavigationService.goBack()}>
            <FastImage
              source={back_ic}
              resizeMode="contain"
              tintColor={themeColors.text}
              style={{ width: 20, height: 20 }}
            />
          </TouchableOpacity>
          <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 10 }} onPress={() => NavigationService.navigate('Interanl_Trade_History')}>
            <FastImage
              tintColor={themeColors.text}
              source={printIcon}
              resizeMode="contain"
              style={{ width: 24, height: 20 }}
            />
          </TouchableOpacity>
        </View>
        <AppText color={themeColors.text} weight={SEMI_BOLD} type={TWENTY} style={{ marginBottom: 6, marginTop: 4 }}>Transfer</AppText>
      </View>

      <KeyBoardAware style={{ flex: 1, }}>
        {isInitialLoad ? (
          <TransferSkeleton contentOnly />
        ) : (
          <>
            <View style={[styles.fromToCard, {
              backgroundColor: colors.iconBgColor,
              borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#EEE",
              borderWidth: 1,
              marginTop: 4
            }]}>
              <View style={styles.fromToCardInner}>
                <FastImage source={sideIcon} resizeMode="contain" style={styles.sideRailIcon} />
                <View style={styles.fromToRows}>
                  <TouchableOpacity style={styles.walletPickerRow} onPress={() => openModal("from")} activeOpacity={0.7}>
                    <AppText color={themeColors.text} weight={SEMI_BOLD} type={FOURTEEN} style={styles.walletPickerLabel}>
                      From
                    </AppText>
                    <View style={styles.walletPickerValueCol}>
                      <AppText
                        color={themeColors.text}
                        weight={SEMI_BOLD}
                        type={FOURTEEN}
                        numberOfLines={1}
                        style={styles.walletPickerValueText}
                      >
                        {formatWalletName(fromWallet)}
                      </AppText>
                    </View>
                    <FastImage
                      source={back_ic}
                      resizeMode="contain"
                      style={styles.walletPickerChevron}
                      tintColor={themeColors.text}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.walletPickerRow} onPress={() => openModal("to")} activeOpacity={0.7}>
                    <AppText color={themeColors.text} weight={SEMI_BOLD} type={FOURTEEN} style={styles.walletPickerLabel}>
                      To
                    </AppText>
                    <View style={styles.walletPickerValueCol}>
                      <AppText
                        color={themeColors.text}
                        weight={SEMI_BOLD}
                        type={FOURTEEN}
                        numberOfLines={1}
                        style={styles.walletPickerValueText}
                      >
                        {formatWalletName(toWallet)}
                      </AppText>
                    </View>
                    <FastImage
                      source={back_ic}
                      resizeMode="contain"
                      style={styles.walletPickerChevron}
                      tintColor={themeColors.text}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <TouchableOpacity style={{
              flexDirection: "row", justifyContent: "space-between", marginHorizontal: 20, borderBottomColor: isDark ? themeColors.border : "#EEE",
              borderBottomWidth: 1, paddingBottom: 15, alignItems: "center", marginTop: 15
            }} onPress={() => setCoinModal(true)}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ borderRadius: 50, overflow: "hidden" }}>
                  <CoinIcon
                    coin={coin}
                    style={{ width: 28, height: 28 }}
                    resizeMode="contain"
                    fallback={activities_icon}
                  />
                </View>

                <AppText color={themeColors.text} weight={SEMI_BOLD} type={SIXTEEN}>{coin?.short_name}</AppText>
              </View>

              <FastImage
                source={back_ic}
                resizeMode="contain"
                style={{
                  width: 15,
                  height: 15,
                  transform: [{ rotateX: "180deg" }, { rotateZ: "3.2rad" }],
                }}
                tintColor={themeColors.text}
              />

            </TouchableOpacity>
            <View style={{ marginHorizontal: 20 }}>
              <AppText color={themeColors.text} weight={SEMI_BOLD} type={SIXTEEN} style={{ marginVertical: 10 }}>Transfer Amount</AppText>
            </View>
            <View style={[styles.inputContainer, {
              backgroundColor: colors.iconBgColor,
            }]}>
              <TextInput placeholder="Enter the amount" placeholderTextColor={themeColors.secondaryText}
                style={{ marginLeft: 20, width: '55%', color: themeColors.text, fontFamily: fontFamilyMedium }} value={amount} onChangeText={(value) => setAmount(value)} keyboardType="numeric" />
              <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20 }}>
                <AppText style={{ color: themeColors.secondaryText }} weight={SEMI_BOLD} type={FOURTEEN}>{coin?.short_name}</AppText>
                <View style={{ width: 1, height: 16, backgroundColor: isDark ? "rgba(255, 255, 255, 0.15)" : "#E4E7EC", marginHorizontal: 12 }} />
                <AppText style={{ color: colors.orangeTheme }} weight={SEMI_BOLD} type={FOURTEEN} onPress={() => setAmount(String(particularCoinBalance?.fromWallet?.balance) || 0)}>MAX</AppText>
              </View>

            </View>
            {Number(amount) > Number(particularCoinBalance?.fromWallet?.balance || 0) ? (
              <AppText style={{ marginLeft: 20, marginTop: 6, color: colors.red }} type={TWELVE} weight={MEDIUM}>
                Insufficient funds
              </AppText>
            ) : null}
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginHorizontal: 20, marginVertical: 10 }}>
              <AppText color={DISCLAIMTEXT} weight={MEDIUM}> Available Balance</AppText>
              <AppText color={DISCLAIMTEXT} weight={MEDIUM} > {particularCoinBalance?.fromWallet?.balance} {coin?.short_name}</AppText>
            </View>

          </>
        )}
      </KeyBoardAware>

      <Button
        children="Confirm"
        containerStyle={{ margin: 20 }}
        disabled={
          !fromWallet ||
          !toWallet ||
          !amount ||
          !coin ||
          Number(amount) > Number(particularCoinBalance?.fromWallet?.balance || 0)
        }
        onPress={handleTransfer}
        loading={loading}
      />
      <WalletTypeModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        data={WalletTypes?.filter(item => item?.toLowerCase() !== (type === "from" ? toWallet?.toLowerCase() : fromWallet?.toLowerCase()))}
        onSelect={handleSelect}
        selectedItem={type === "from" ? fromWallet : toWallet}
      />
      <CoinListModal
        visible={coinModal}
        onClose={() => setCoinModal(false)}
        data={userWallet}
        onSelect={handleSelectCoin}
        selectedCoinId={coin?.currency_id}
      />
      <TransferModal visible={visible} handleVisiblity={handlePopup} type={'transfer'} />
    </AppSafeAreaView>
  );
};

export default Transfer;

const styles = StyleSheet.create({
  headerSection: {
    paddingBottom: 4,
  },
  headerView: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 0,
    paddingTop: 10
  },
  fromToCard: {
    marginHorizontal: 20,
    width: "90%",
    alignSelf: "center",
    backgroundColor: "transparent",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    zIndex: 1,
  },
  fromToCardInner: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 5,
  },
  sideRailIcon: {
    width: 50,
    height: 80,
    flexShrink: 0,
  },
  fromToRows: {
    flex: 1,
    height: 80,
    justifyContent: "space-between",
  },
  walletPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    minWidth: 0,
  },
  walletPickerLabel: {
    width: 48,

  },
  walletPickerValueCol: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-end",
    justifyContent: "center",
    marginRight: 8,
    right: 5


  },
  walletPickerValueText: {
    width: "100%",
    textAlign: "right",
  },
  walletPickerChevron: {
    width: 13,
    height: 13,
    transform: [{ rotateX: "180deg" }, { rotateZ: "3.2rad" }],
    right: 5

  },
  inputContainer: {
    backgroundColor: "transparent",
    flexDirection: "row",
    marginHorizontal: 20,
    borderRadius: 10,
    height: 50,
    justifyContent: "space-between",
    alignItems: "center"
  },
  disView: {
    backgroundColor: "transparent",
    flexDirection: "row",
    marginHorizontal: 20,
    borderRadius: 10,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14
  }
});
