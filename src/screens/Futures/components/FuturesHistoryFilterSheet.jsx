import React, { useState } from 'react';
import { View, TouchableOpacity, Modal, StyleSheet, TextInput, Platform, ScrollView } from 'react-native';
import FastImage from 'react-native-fast-image';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { X } from 'lucide-react-native';
import { AppText, FOURTEEN, SIXTEEN, THIRTEEN, BOLD } from '../../../common';
import { Button } from '../../../shared';
import { colors } from '../../../theme/colors';
import { fontFamilyMedium, fontFamilySemiBold, MEDIUM, SEMI_BOLD } from '../../../theme/typography';
import { close_ic, calendarIcon } from '../../../helper/ImageAssets';
import CustomDropdown from '../../../shared/components/CustomDropdown';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import moment from "moment";

const PRESETS = ["1 Day", "1 Week", "1 Month", "3 Months"];

const FUTURES_WALLET_TX_TYPE_OPTIONS = [
  { label: "All Types", value: "" },
  { label: "Transfer In", value: "TRANSFER_IN" },
  { label: "Transfer Out", value: "TRANSFER_OUT" },
  { label: "Realized PnL", value: "REALIZED_PNL" },
  { label: "Commission / Fee", value: "FEE" },
  { label: "Funding Fee", value: "FUNDING_FEE" },
  { label: "Liquidation", value: "LIQUIDATION" },
];

const FuturesHistoryFilterSheet = ({
  visible,
  onClose,
  applyFilters,
  themeColors = {},
  isDark = true,
  contractsList = ["All Contracts", "BTCUSDT-PERP", "ETHUSDT-PERP", "SOLUSDT-PERP"],
  assetsList = ["All Assets", "USDT", "BTC", "ETH"]
}) => {
  const [type, setType] = useState("");
  const [asset, setAsset] = useState("");
  const [contract, setContract] = useState("");
  const [preset, setPreset] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [isFromPickerVisible, setFromPickerVisible] = useState(false);
  const [isToPickerVisible, setToPickerVisible] = useState(false);

  const primaryThemeColor = colors.cyanTheme || '#0AA8C5';

  const handleApplyPreset = (p) => {
    setPreset(p);
    const now = moment();
    let start = moment();

    if (p === "1 Day") start = now.clone().subtract(1, "days");
    else if (p === "1 Week") start = now.clone().subtract(1, "weeks");
    else if (p === "1 Month") start = now.clone().subtract(1, "months");
    else if (p === "3 Months") start = now.clone().subtract(3, "months");

    setFromDate(start.format("YYYY-MM-DD"));
    setToDate(now.format("YYYY-MM-DD"));
  };

  const handleReset = () => {
    setType("");
    setAsset("");
    setContract("");
    setPreset("");
    setFromDate("");
    setToDate("");
    applyFilters({ type: "", asset: "", contract: "", from: "", to: "" });
    onClose();
  };

  const handleApply = () => {
    applyFilters({ type, asset, contract, from: fromDate, to: toDate });
    onClose();
  };

  const inputBg = isDark ? "rgba(255, 255, 255, 0.05)" : "#F3F4F6";
  const inputBorder = isDark ? "rgba(255, 255, 255, 0.10)" : "rgba(0, 0, 0, 0.08)";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, {
          backgroundColor: "transparent",
          borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: "hidden",
        }]}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={20}
            reducedTransparencyFallbackColor="#111214"
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "rgba(10, 12, 16, 0.72)" : "rgba(255, 255, 255, 0.88)" }]} />
          {isDark && (
            <>
              <LinearGradient
                colors={[
                  "rgba(10, 168, 197, 0.12)",
                  "rgba(16, 185, 129, 0.05)",
                  "rgba(10, 168, 197, 0.02)",
                  "rgba(10, 168, 197, 0.08)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <LinearGradient
                colors={["transparent", "rgba(10, 168, 197, 0.04)", "transparent"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
            </>
          )}

          {/* Drag handle */}
          <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 8 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255, 255, 255, 0.2)" }} />
          </View>

          <View style={styles.header}>
            <AppText weight={BOLD} style={{ fontSize: 20, color: themeColors.text || '#FFFFFF' }}>Filters</AppText>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <X color={isDark ? '#9CA3AF' : themeColors.text} size={20} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 100 }}
          >
            {/* Type Dropdown Simulation */}
            <View style={{ marginBottom: 12, zIndex: 3000 }}>
              <CustomDropdown
                data={FUTURES_WALLET_TX_TYPE_OPTIONS.map(o => o.label)}
                selected={FUTURES_WALLET_TX_TYPE_OPTIONS.find(o => o.value === type)?.label || "All Types"}
                onSelect={(label) => {
                  const option = FUTURES_WALLET_TX_TYPE_OPTIONS.find(o => o.label === label);
                  if (option) setType(option.value);
                }}
                triggerStyle={{ backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder, height: 48, borderRadius: 14 }}
              />
            </View>

            {/* Assets Input */}
            <View style={{ marginBottom: 12, zIndex: 2000 }}>
              <CustomDropdown
                data={assetsList}
                selected={asset || "All Assets"}
                onSelect={(val) => {
                  setAsset(val === "All Assets" ? "" : val);
                  setPreset("");
                }}
                triggerStyle={{ backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder, height: 48, borderRadius: 14 }}
              />
            </View>

            {/* Contracts Input */}
            <View style={{ marginBottom: 12, zIndex: 1000 }}>
              <CustomDropdown
                data={contractsList}
                selected={contract || "All Contracts"}
                onSelect={(val) => {
                  setContract(val === "All Contracts" ? "" : val);
                  setPreset("");
                }}
                triggerStyle={{ backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder, height: 48, borderRadius: 14 }}
              />
            </View>

            {/* Date Presets */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {PRESETS.map((p) => {
                const isActive = preset === p;
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => handleApplyPreset(p)}
                    activeOpacity={0.8}
                    style={[
                      styles.presetBtn,
                      {
                        backgroundColor: isActive
                          ? (isDark ? "rgba(10, 168, 197, 0.22)" : primaryThemeColor)
                          : inputBg,
                        borderWidth: 1,
                        borderColor: isActive
                          ? (isDark ? "rgba(10, 168, 197, 0.55)" : primaryThemeColor)
                          : inputBorder,
                        width: '48%',
                        borderRadius: 12,
                        height: 42,
                      }
                    ]}
                  >
                    <AppText
                      style={{
                        color: isActive
                          ? (isDark ? '#0AA8C5' : '#FFFFFF')
                          : (isDark ? '#8E95A3' : '#6B7280'),
                        fontSize: 13,
                      }}
                      weight={isActive ? BOLD : MEDIUM}
                    >
                      {p}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Dates */}
            <View style={{ marginTop: 12, gap: 10 }}>
              <TouchableOpacity onPress={() => setFromPickerVisible(true)} style={[styles.inputBox, { backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder, borderRadius: 14, height: 48 }]}>
                <AppText style={[styles.input, { color: fromDate ? (themeColors.text || '#FFFFFF') : (isDark ? '#8E95A3' : '#6B7280'), lineHeight: 48, fontFamily: fontFamilyMedium }]}>
                  {fromDate || "dd/mm/yyyy"}
                </AppText>
                <FastImage source={calendarIcon} style={{ width: 16, height: 16 }} tintColor={isDark ? '#8E95A3' : '#6B7280'} resizeMode="contain" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setToPickerVisible(true)} style={[styles.inputBox, { backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder, borderRadius: 14, height: 48 }]}>
                <AppText style={[styles.input, { color: toDate ? (themeColors.text || '#FFFFFF') : (isDark ? '#8E95A3' : '#6B7280'), lineHeight: 48, fontFamily: fontFamilyMedium }]}>
                  {toDate || "dd/mm/yyyy"}
                </AppText>
                <FastImage source={calendarIcon} style={{ width: 16, height: 16 }} tintColor={isDark ? '#8E95A3' : '#6B7280'} resizeMode="contain" />
              </TouchableOpacity>
            </View>

            <DateTimePickerModal
              isVisible={isFromPickerVisible}
              mode="date"
              display='spinner'
              onConfirm={(date) => {
                setFromDate(moment(date).format("YYYY-MM-DD"));
                setPreset("");
                setFromPickerVisible(false);
              }}
              onCancel={() => setFromPickerVisible(false)}
              date={fromDate ? new Date(fromDate) : new Date()}
            />

            <DateTimePickerModal
              isVisible={isToPickerVisible}
              display='spinner'
              mode="date"
              onConfirm={(date) => {
                setToDate(moment(date).format("YYYY-MM-DD"));
                setPreset("");
                setToPickerVisible(false);
              }}
              onCancel={() => setToPickerVisible(false)}
              date={toDate ? new Date(toDate) : new Date()}
            />

            {/* Footer Actions */}
            <View style={{ marginTop: 24, paddingBottom: Platform.OS === 'ios' ? 32 : 24, alignItems: "center" }}>
              <TouchableOpacity onPress={handleReset} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <AppText type={FOURTEEN} style={{ color: isDark ? '#8E95A3' : '#6B7280', fontFamily: fontFamilyMedium }}>Reset</AppText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleApply}
                activeOpacity={0.85}
                style={{
                  width: '100%',
                  backgroundColor: primaryThemeColor,
                  borderRadius: 28,
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText weight={BOLD} style={{ color: '#FFFFFF', fontSize: 15 }}>
                  Apply
                </AppText>
              </TouchableOpacity>
            </View>
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
};

export default FuturesHistoryFilterSheet;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.75)'
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: MEDIUM,
    padding: 0,
  },
  presetBtn: {
    alignItems: 'center',
    justifyContent: 'center'
  }
});
