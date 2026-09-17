import React, { forwardRef, useState, useEffect } from "react";
import { View, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { appOperation } from "../../../appOperation";
import { CUSTOMER_TYPE } from "../../../appOperation/types";
import FastImage from "react-native-fast-image";
import RBSheet from "react-native-raw-bottom-sheet";
import { AppText, BOLD, FOURTEEN, SEMI_BOLD, SIXTEEN, TWELVE, TWENTY_SIX } from "../../../shared";
import { colors } from "../../../theme/colors";
import NavigationService from "../../../navigation/NavigationService";
import { MARGIN_BORROW_REPAY_SCREEN, MARGIN_TRANSFER_SCREEN, TRADE_SCREEN } from "../../../navigation/routes";
import { close_ic, INFO } from "../../../helper/ImageAssets";
import {
  formatMarginLevel,
  getMarginLevelStatus,
  pairHasDebt,
  parseMarginLevel,
  resolveMarginThresholds,
} from "../../spotScreen/crossMargin/marginLevelUtils";

const DetailRow = ({ label, valBase, valQuote, base, quote, themeColors }) => (
  <View style={styles.row}>
    <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText }}>{label}</AppText>
    <View style={{ alignItems: "flex-end" }}>
      <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{valBase} {base}</AppText>
      <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText }}>{valQuote} {quote}</AppText>
    </View>
  </View>
);

const ActionBtn = ({ label, onPress, theme, themeColors }) => (
  <TouchableOpacity
    style={[
      styles.actionBtn,
      { backgroundColor: theme === "Dark" ? themeColors.themeElevationColor : colors.iconBgColor },
    ]}
    onPress={onPress}
  >
    <AppText
      type={TWELVE}
      weight={SEMI_BOLD}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.85}
      style={{ color: themeColors.text, textAlign: "center" }}
    >
      {label}
    </AppText>
  </TouchableOpacity>
);

const MarginPairDetailSheet = forwardRef(({ theme, themeColors, selectedPair, buildCoinIconUri, onOpenMarginRisk }, ref) => {
  const [liveData, setLiveData] = useState(null);
  const isDark = theme === "Dark";

  useEffect(() => {
    if (selectedPair?.pair_id) {
      appOperation.get(`margin/account/${selectedPair.pair_id}`, undefined, undefined, CUSTOMER_TYPE)
        .then((res) => { if (res?.success) setLiveData(res.data); })
        .catch(() => { });
    }
  }, [selectedPair]);

  const fmt = (val) => {
    const n = parseFloat(val);
    if (!val || isNaN(n) || n === 0) return "0";
    return parseFloat(n.toFixed(8)).toString();
  };

  const borrowableBase = fmt(liveData?.borrowable?.base ?? selectedPair?.borrowableBase ?? "0");
  const borrowableQuote = fmt(liveData?.borrowable?.quote ?? selectedPair?.borrowableQuote ?? "0");

  const mergedAccount = { ...(selectedPair || {}), ...(liveData || {}) };
  const detailMl = parseMarginLevel(liveData?.margin_level ?? selectedPair?.margin_level);
  const detailHasDebt = pairHasDebt({
    ...mergedAccount,
    base_borrowed: liveData?.base_borrowed ?? selectedPair?.borrowedBase,
    quote_borrowed: liveData?.quote_borrowed ?? selectedPair?.borrowedQuote,
  }, detailMl);
  const detailStatus = getMarginLevelStatus(
    detailHasDebt ? detailMl : null,
    resolveMarginThresholds(mergedAccount),
    { hasDebt: detailHasDebt },
  );

  return (
    <RBSheet
      ref={ref}
      keyboardAvoidingViewEnabled={false}
      customModalProps={{ statusBarTranslucent: true }}
      height={550}
      openDuration={250}
      customStyles={{
        container: {
          backgroundColor: themeColors.background,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        },
        wrapper: { backgroundColor: "#0006" },
        draggableIcon: { backgroundColor: isDark ? "#444" : "#CCC", width: 40 },
      }}
    >
      {selectedPair && (
        <View style={{ flex: 1, paddingBottom: 10, backgroundColor: themeColors.background }}>
          <View style={[styles.header, { borderBottomWidth: 1, borderBottomColor: themeColors.border }]}>
            <View style={styles.titleRow}>
              <FastImage
                source={{ uri: buildCoinIconUri(selectedPair.icon_path) }}
                style={styles.icon}
                resizeMode="cover"
              />
              <View>
                <AppText type={SIXTEEN} weight={BOLD} style={{ color: themeColors.text }}>{selectedPair.pair}</AppText>
                <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText }}>{selectedPair.base} / {selectedPair.quote}</AppText>
              </View>
            </View>
            <TouchableOpacity onPress={() => ref.current?.close()} style={styles.closeBtn}>
              <FastImage source={close_ic} style={styles.closeIcon} tintColor={themeColors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <AppText type={TWENTY_SIX} weight={BOLD} style={{ color: themeColors.text }}>{selectedPair.netBase} {selectedPair.base}</AppText>
              <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText }}>{selectedPair.netQuote} {selectedPair.quote}</AppText>
            </View>

            <View style={styles.content}>
              <DetailRow label="Available" valBase={selectedPair.availableBase} valQuote={selectedPair.availableQuote} base={selectedPair.base} quote={selectedPair.quote} themeColors={themeColors} />
              <DetailRow label="Borrowable" valBase={borrowableBase} valQuote={borrowableQuote} base={selectedPair.base} quote={selectedPair.quote} themeColors={themeColors} />
              <DetailRow label="Loan Cap" valBase={selectedPair.loanCapBase} valQuote={selectedPair.loanCapQuote} base={selectedPair.base} quote={selectedPair.quote} themeColors={themeColors} />
              <DetailRow label="Borrowed" valBase={selectedPair.borrowedBase} valQuote={selectedPair.borrowedQuote} base={selectedPair.base} quote={selectedPair.quote} themeColors={themeColors} />
              <DetailRow label="Frozen" valBase={selectedPair.frozenBase} valQuote={selectedPair.frozenQuote} base={selectedPair.base} quote={selectedPair.quote} themeColors={themeColors} />

              <View style={styles.row}>
                <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText }}>Est. Liq. Price</AppText>
                <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{selectedPair.liqPrice || "—"}</AppText>
              </View>

              {selectedPair?.status !== "NOT_OPENED" ? (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => onOpenMarginRisk?.({
                    ...selectedPair,
                    ...liveData,
                    pair_id: selectedPair?.pair_id,
                    pairRaw: selectedPair?.pairRaw || selectedPair?.pair,
                    pair: selectedPair?.pair,
                    margin_level: liveData?.margin_level ?? selectedPair?.margin_level,
                    base_borrowed: liveData?.base_borrowed ?? selectedPair?.borrowedBase,
                    quote_borrowed: liveData?.quote_borrowed ?? selectedPair?.borrowedQuote,
                  })}
                  style={styles.row}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText }}>Margin Level</AppText>
                    <FastImage source={INFO} style={{ width: 12, height: 12 }} resizeMode="contain" tintColor={themeColors.secondaryText} />
                  </View>
                  <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: detailStatus.color }}>
                    {detailHasDebt ? formatMarginLevel(detailMl) : "Safe"}
                  </AppText>
                </TouchableOpacity>
              ) : null}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <ActionBtn
              label="Borrow / Repay"
              theme={theme}
              themeColors={themeColors}
              onPress={() => {
                ref.current?.close();
                NavigationService.navigate(MARGIN_BORROW_REPAY_SCREEN, {
                  activeTab: "Borrow",
                  pairId: selectedPair.pair_id,
                  pair: selectedPair.name,
                  coin: selectedPair.base,
                });
              }}
            />
            <ActionBtn
              label="Transfer"
              theme={theme}
              themeColors={themeColors}
              onPress={() => {
                ref.current?.close();
                NavigationService.navigate(MARGIN_TRANSFER_SCREEN, {
                  fromWalletType: "spot",
                  toWalletType: "margin",
                  coin: selectedPair?.base,
                });
              }}
            />
            <ActionBtn
              label="Trade"
              theme={theme}
              themeColors={themeColors}
              onPress={() => {
                ref.current?.close();
                NavigationService.navigate(TRADE_SCREEN, { trade_pair: selectedPair.pairRaw });
              }}
            />
          </View>
        </View>
      )}
    </RBSheet>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingBottom: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  closeBtn: {
    padding: 5,
  },
  closeIcon: {
    width: 14,
    height: 14,
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 5,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginTop: "auto",
    marginBottom: 10,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
});

export default MarginPairDetailSheet;
