import React, { forwardRef, useRef, useState } from "react";
import { View, TouchableOpacity, ScrollView, StyleSheet, Modal, ActivityIndicator } from "react-native";
import FastImage from "react-native-fast-image";
import RBSheet from "react-native-raw-bottom-sheet";
import { AppText, BOLD, DISCLAIMTEXT, FOURTEEN, SEMI_BOLD, SIXTEEN, TWELVE, TWENTY_TWO } from "../../../shared";
import { colors } from "../../../theme/colors";
import NavigationService from "../../../navigation/NavigationService";
import { bitcoin_ic, close_ic } from "../../../helper/ImageAssets";
import { MARGIN_TRANSFER_SCREEN, TRADE_SCREEN, MARGIN_BORROW_REPAY_SCREEN } from "../../../navigation/routes";
import Toast from "react-native-simple-toast";
import { appOperation } from "../../../appOperation";
import { CUSTOMER_TYPE } from "../../../appOperation/types";

function fmt(val, decimals = 8) {
  const n = parseFloat(val);
  if (!val || isNaN(n) || n === 0) return "0";
  return parseFloat(n.toFixed(decimals)).toString();
}

function fmtPrice(val) {
  const n = parseFloat(val);
  if (!val || isNaN(n) || n === 0) return "0";
  return parseFloat(n.toFixed(2)).toString();
}

const CrossMarginDetailSheet = forwardRef(({ theme, themeColors, rowPopup, assets, debtByAsset, buildCoinIconUri, onSuccess }, ref) => {
  const isFund = rowPopup?.type === "fund";
  const d = rowPopup?.data;
  const borrowRepaySheetRef = useRef(null);
  const [borrowRepayMode, setBorrowRepayMode] = useState("borrow"); // "borrow" | "repay"
  const closeInFlightRef = useRef(false);
  const closedPairsRef = useRef({});
  const [closeConfirmVisible, setCloseConfirmVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const isDark = theme === "Dark";
  const mPairKey = d?.pair || `${d?.asset}USDT`;
  const alreadyClosed = !!(mPairKey && closedPairsRef.current[mPairKey]);

  const requestCloseConfirm = () => {
    if (!d?.position_id || closeInFlightRef.current || closing || alreadyClosed) return;
    setCloseConfirmVisible(true);
  };

  const cancelCloseConfirm = () => {
    if (closeInFlightRef.current || closing) return;
    setCloseConfirmVisible(false);
  };

  const submitClosePosition = async () => {
    if (closeInFlightRef.current) return;
    closeInFlightRef.current = true;
    if (!d?.position_id || alreadyClosed || (mPairKey && closedPairsRef.current[mPairKey])) {
      closeInFlightRef.current = false;
      return;
    }
    setClosing(true);
    let succeeded = false;
    try {
      const res = await appOperation.post("cross/position/close", { pair: mPairKey }, CUSTOMER_TYPE);
      if (res?.success) {
        succeeded = true;
        closedPairsRef.current[mPairKey] = true;
        setCloseConfirmVisible(false);
        Toast.showWithGravity(res.message || "Position closed.", Toast.SHORT, Toast.BOTTOM);
        ref.current?.close();
        if (onSuccess) onSuccess();
      } else {
        Toast.showWithGravity(res?.message || "Failed to close position.", Toast.SHORT, Toast.BOTTOM);
      }
    } catch (error) {
      Toast.showWithGravity(error?.message || "Failed to close position.", Toast.SHORT, Toast.BOTTOM);
    } finally {
      if (!succeeded) {
        closeInFlightRef.current = false;
        setClosing(false);
      }
    }
  };

  const assetName = d?.asset;
  const latestAssetRow = assets?.find((a) => a.asset === assetName);
  const debtRow = debtByAsset?.[assetName] || d?.debt || null;
  const borrowedAmount = latestAssetRow ? latestAssetRow.borrowed : (d?.borrowed || 0);
  const hasBorrow = parseFloat(borrowedAmount) > 0;
  const freeBalance = latestAssetRow ? latestAssetRow.balance : (d?.balance || d?.assetRow?.balance || "0");
  const isLong = d?.side === "LONG";
  const sideColor = isLong ? colors.green : colors.red;
  const totalBal = isFund ? (parseFloat(latestAssetRow?.balance || d?.balance || 0) + parseFloat(latestAssetRow?.locked || d?.locked || 0)).toString() : null;
  const netBadgeColor = parseFloat(d?.net || 0) < 0 ? colors.red : parseFloat(d?.net || 0) > 0 ? colors.green : themeColors.text;
  const pnl = parseFloat(d?.unrealized_pnl || 0);
  const roe = parseFloat(d?.roe_pct || 0);
  const pnlColor = pnl >= 0 ? colors.green : colors.red;
  const sideColorText = isLong ? "GREEN" : "RED";

  return (
    <>
      <RBSheet
        ref={ref}
        keyboardAvoidingViewEnabled={false}
        customModalProps={{ statusBarTranslucent: true }}
        height={580}
        openDuration={250}
        customStyles={{
          container: {
            backgroundColor: themeColors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          },
          wrapper: {
            backgroundColor: "#0006",
          },
        }}
      >
        {d ? (
          <View style={{ flex: 1, paddingBottom: 10, backgroundColor: themeColors.background }}>
            <View style={[styles.header, { borderBottomWidth: 1, borderBottomColor: themeColors.border }]}>
              <View style={styles.titleRow}>
                <View>
                  <AppText type={SIXTEEN} weight={BOLD} style={{ color: themeColors.text }}>{d.asset}</AppText>
                  {!isFund && (
                    <View style={[styles.sideBadge, { borderColor: sideColor, alignSelf: "flex-start" }]}>
                      <AppText type={TWELVE} color={sideColorText} weight={SEMI_BOLD}>{isLong ? "LONG" : "SHORT"}</AppText>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity onPress={() => ref.current?.close()} style={styles.closeBtn}>
                <FastImage source={close_ic} style={styles.closeIcon} tintColor={themeColors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <View style={styles.hero}>
                {isFund ? (
                  <>
                    <AppText type={TWENTY_TWO} weight={BOLD} style={{ color: netBadgeColor }}>{fmt(d.net)} {d.asset}</AppText>
                    <AppText type={FOURTEEN} color={DISCLAIMTEXT}>Net Asset</AppText>
                  </>
                ) : (
                  <>
                    <AppText type={TWENTY_TWO} weight={BOLD} style={{ color: sideColor }}>{fmt(d.net_quantity)} {d.asset}</AppText>
                    <AppText type={FOURTEEN} color={DISCLAIMTEXT}>≈ {fmtPrice(Math.abs(parseFloat(d.value_usdt || 0)))} USDT</AppText>
                    {d.unrealized_pnl != null && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: pnlColor }}>
                          {pnl >= 0 ? "+" : ""}{fmt(pnl, 4)} USDT
                        </AppText>
                        <AppText type={FOURTEEN} style={{ color: pnlColor }}>
                          ({roe >= 0 ? "+" : ""}{fmtPrice(roe)}%)
                        </AppText>
                      </View>
                    )}
                  </>
                )}
              </View>

              <View style={styles.content}>
                {isFund ? (
                  <>
                    <DetailRow label="Total Balance" val={fmt(totalBal)} asset={d.asset} themeColors={themeColors} />
                    <DetailRow label="Available" val={fmt(d.balance)} asset={d.asset} themeColors={themeColors} />
                    <DetailRow label="Locked" val={parseFloat(d.locked) > 0 ? fmt(d.locked) : "—"} asset={d.asset} themeColors={themeColors} />
                    <DetailRow label="Borrowed" val={hasBorrow ? fmt(d.borrowed) : "—"} asset={d.asset} valColor={hasBorrow ? colors.red : undefined} themeColors={themeColors} />
                    <DetailRow label="Accrued Interest" val={debtRow?.interest_accrued && parseFloat(debtRow.interest_accrued) > 0 ? fmt(debtRow.interest_accrued) : "—"} asset={d.asset} valColor={debtRow?.interest_accrued && parseFloat(debtRow.interest_accrued) > 0 ? colors.red : undefined} themeColors={themeColors} />
                    <DetailRow label="Net" val={fmt(d.net)} asset={d.asset} valColor={netBadgeColor} themeColors={themeColors} />
                  </>
                ) : (
                  <>
                    <DetailRow label="Size" val={fmt(d.net_quantity)} asset={d.asset} valColor={sideColor} themeColors={themeColors} />
                    <DetailRow label="Position Value" val={fmt(Math.abs(parseFloat(d.value_usdt || 0)), 4)} asset="USDT" themeColors={themeColors} />
                    <DetailRow label="Entry Price" val={(d.entry_price == null || parseFloat(d.entry_price) === 0) ? "—" : fmtPrice(d.entry_price)} asset="USDT" themeColors={themeColors} />
                    <DetailRow label="Mark Price" val={d.mark_price != null ? fmtPrice(d.mark_price) : "—"} asset="USDT" themeColors={themeColors} />
                    <DetailRow label="Unrealized PnL" val={`${pnl >= 0 ? "+" : ""}${fmt(pnl, 4)}`} asset="USDT" valColor={pnlColor} themeColors={themeColors} />
                    <DetailRow label="ROE" val={`${roe >= 0 ? "+" : ""}${fmtPrice(roe)}`} asset="%" valColor={pnlColor} themeColors={themeColors} />
                    <DetailRow label="Realized PnL" val={fmt(d.realized_pnl, 4)} asset="USDT" themeColors={themeColors} />
                    {d.liquidation_price != null && (
                      <DetailRow label="Liquidation Price" val={fmtPrice(d.liquidation_price)} asset="USDT" valColor="#f59e0b" themeColors={themeColors} />
                    )}
                    <DetailRow label="Free Balance" val={fmt(freeBalance)} asset={d.asset} themeColors={themeColors} />
                  </>
                )}
              </View>
            </ScrollView>

            <View style={styles.actions}>
              {!isFund && (
                <ActionBtn
                  label={closing || alreadyClosed ? "Closing…" : "Close Position"}
                  theme={theme}
                  themeColors={themeColors}
                  color={colors.red}
                  disabled={!d.position_id || closing || alreadyClosed || closeConfirmVisible}
                  onPress={requestCloseConfirm}
                />
              )}
              <ActionBtn
                label="Transfer"
                theme={theme}
                themeColors={themeColors}
                onPress={() => {
                  ref.current?.close();
                  NavigationService.navigate(MARGIN_TRANSFER_SCREEN, { fromWalletType: "spot", toWalletType: "cross_margin", coin: d?.asset });
                }}
              />
              <ActionBtn
                label="Borrow / Repay"
                theme={theme}
                themeColors={themeColors}
                onPress={() => {
                  ref.current?.close();
                  NavigationService.navigate(MARGIN_BORROW_REPAY_SCREEN, {
                    marginMode: "Cross",
                    coin: d?.asset,
                    activeTab: hasBorrow || debtRow ? "Repay" : "Borrow"
                  });
                }}
              />
            </View>
          </View>
        ) : <View />}
      </RBSheet>

      <Modal
        visible={closeConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelCloseConfirm}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={cancelCloseConfirm}
            style={StyleSheet.absoluteFillObject}
            disabled={closing}
          />
          <View
            style={{
              backgroundColor: isDark ? themeColors.sheetDarkColor || themeColors.background : themeColors.themeElevationColor || colors.white,
              borderRadius: 20,
              padding: 25,
              width: "85%",
              alignSelf: "center",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 10,
              borderWidth: 1,
              borderColor: themeColors.themeBorderColor || (isDark ? "#333" : "#e5e7eb"),
            }}
          >
            <AppText
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: themeColors.text,
                textAlign: "center",
                marginBottom: 15,
              }}
            >
              Close Position
            </AppText>
            <AppText
              style={{
                fontSize: 15,
                color: themeColors.secondaryText,
                textAlign: "center",
                marginBottom: 25,
                lineHeight: 22,
              }}
            >
              Are you sure you want to close this market position?
            </AppText>
            <View style={{ flexDirection: "row", width: "100%", gap: 10 }}>
              <TouchableOpacity
                onPress={cancelCloseConfirm}
                disabled={closing}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor: themeColors.themeElevationColor || (isDark ? "#2C2C2E" : "#F3F4F6"),
                  borderWidth: 1,
                  borderColor: themeColors.themeBorderColor || (isDark ? "#444" : "#e5e7eb"),
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: closing ? 0.6 : 1,
                }}
              >
                <AppText style={{ fontSize: 14, fontWeight: "600", color: themeColors.text }}>
                  No
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitClosePosition}
                disabled={closing}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor: themeColors.red || colors.red,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: closing ? 0.85 : 1,
                }}
              >
                {closing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <AppText style={{ fontSize: 14, fontWeight: "600", color: "#FFFFFF" }}>
                    Yes
                  </AppText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
});

const DetailRow = ({ label, val, asset, valColor, themeColors }) => (
  <View style={styles.row}>
    <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText }}>{label}</AppText>
    <View style={{ alignItems: "flex-end" }}>
      <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: valColor || themeColors.text }}>
        {val === "—" ? "—" : asset === "%" ? `${val}%` : `${val} ${asset}`}
      </AppText>
    </View>
  </View>
);

const ActionBtn = ({ label, onPress, disabled, color, theme, themeColors }) => (
  <TouchableOpacity
    style={[
      styles.actionBtn,
      {
        opacity: disabled ? 0.5 : 1,
        backgroundColor: theme === "Dark" ? themeColors.themeElevationColor : colors.iconBgColor,
      },
    ]}
    onPress={onPress}
    disabled={disabled}
  >
    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: color || themeColors.text }}>
      {label}
    </AppText>
  </TouchableOpacity>
);

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
  sideBadge: { borderWidth: 1, borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1, marginTop: 2 },
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
  },
});

export default CrossMarginDetailSheet;
