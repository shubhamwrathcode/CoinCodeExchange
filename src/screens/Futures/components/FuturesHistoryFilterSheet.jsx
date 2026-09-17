import React, { useState } from 'react';
import { View, TouchableOpacity, Modal, StyleSheet, TextInput, Platform, ScrollView } from 'react-native';
import { AppText, MEDIUM, SEMI_BOLD, TWELVE, THIRTEEN, FOURTEEN, SIXTEEN } from '../../../common';
import { Button } from '../../../common/Button';
import FastImage from 'react-native-fast-image';
import { close_ic, calendarIcon } from '../../../helper/ImageAssets';
import moment from 'moment';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { fontFamilyBold, fontFamilyMedium, fontFamilySemiBold } from '../../../theme/typography';
import CustomDropdown from '../../../shared/components/CustomDropdown';
import { colors } from '../../../theme/colors';



const FUTURES_WALLET_TX_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "TRANSFER_IN", label: "Transfer In" },
  { value: "TRANSFER_OUT", label: "Transfer Out" },
  { value: "TRADE", label: "Trade" },
  { value: "FEE", label: "Fee" },
  { value: "TRADING_FEE", label: "Trading Fee" },
  { value: "PNL", label: "PnL" },
  { value: "REALIZED_PNL", label: "Realized PnL" },
  { value: "FUNDING", label: "Funding Payment" },
];

const PRESETS = ["1D", "7D", "30D", "90D"];

const FuturesHistoryFilterSheet = ({
  visible,
  onClose,
  themeColors,
  isDark,
  applyFilters,
  initialFilters,
  selectedCoin,
  futuresPositions
}) => {
  const [type, setType] = useState(initialFilters?.type || "");
  const [asset, setAsset] = useState(initialFilters?.asset || "");
  const [contract, setContract] = useState(initialFilters?.contract || "");
  const [fromDate, setFromDate] = useState(initialFilters?.from || "");
  const [toDate, setToDate] = useState(initialFilters?.to || "");
  const [preset, setPreset] = useState("");
  const [isFromPickerVisible, setFromPickerVisible] = useState(false);
  const [isToPickerVisible, setToPickerVisible] = useState(false);

  const assetsList = ['All Assets'];
  const contractsList = ['All Contracts'];

  if (selectedCoin && typeof selectedCoin === 'string') {
    const defaultAsset = selectedCoin.replace(/[^A-Z]/g, '').endsWith('USDT') ? 'USDT' : '';
    if (defaultAsset && !assetsList.includes(defaultAsset)) assetsList.push(defaultAsset);
    if (!contractsList.includes(selectedCoin)) contractsList.push(selectedCoin);
  } else if (selectedCoin && typeof selectedCoin === 'object' && selectedCoin.symbol) {
    const sym = selectedCoin.symbol;
    const defaultAsset = sym.replace(/[^A-Z]/g, '').endsWith('USDT') ? 'USDT' : '';
    if (defaultAsset && !assetsList.includes(defaultAsset)) assetsList.push(defaultAsset);
    if (!contractsList.includes(sym)) contractsList.push(sym);
  }

  if (futuresPositions && futuresPositions.length > 0) {
    futuresPositions.forEach(p => {
      if (p.symbol && !contractsList.includes(p.symbol)) contractsList.push(p.symbol);
      const asset = p.marginAsset || (p.symbol && p.symbol.endsWith('USDT') ? 'USDT' : null);
      if (asset && !assetsList.includes(asset)) assetsList.push(asset);
    });
  }

  const handleApplyPreset = (p) => {
    setPreset(p);
    const now = moment();
    const days = p === "1D" ? 1 : p === "7D" ? 7 : p === "30D" ? 30 : 90;
    const start = moment().subtract(days, 'days');

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

  const inputBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
  const borderColor = themeColors.themeBorderColor || "#e0e0e0";

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
        <View style={[styles.sheet, { backgroundColor: themeColors.background }]}>

          <View style={styles.header}>
            <AppText type={SIXTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>Filters</AppText>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <FastImage source={close_ic} style={{ width: 14, height: 14 }} tintColor={themeColors.text} resizeMode="contain" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
          >
            {/* Type Dropdown Simulation */}
            <View style={{ marginBottom: 8, zIndex: 3000 }}>
              <CustomDropdown
                data={FUTURES_WALLET_TX_TYPE_OPTIONS.map(o => o.label)}
                selected={FUTURES_WALLET_TX_TYPE_OPTIONS.find(o => o.value === type)?.label || "All Types"}
                onSelect={(label) => {
                  const option = FUTURES_WALLET_TX_TYPE_OPTIONS.find(o => o.label === label);
                  if (option) setType(option.value);
                }}
                triggerStyle={{ backgroundColor: inputBg, borderWidth: 0, height: 44 }}
              />
            </View>

            {/* Assets Input */}
            <View style={{ marginBottom: 8, zIndex: 2000 }}>
              <CustomDropdown
                data={assetsList}
                selected={asset || "All Assets"}
                onSelect={(val) => {
                  setAsset(val === "All Assets" ? "" : val);
                  setPreset("");
                }}
                triggerStyle={{ backgroundColor: inputBg, borderWidth: 0, height: 44 }}
              />
            </View>

            {/* Contracts Input */}
            <View style={{ marginBottom: 8, zIndex: 1000 }}>
              <CustomDropdown
                data={contractsList}
                selected={contract || "All Contracts"}
                onSelect={(val) => {
                  setContract(val === "All Contracts" ? "" : val);
                  setPreset("");
                }}
                triggerStyle={{ backgroundColor: inputBg, borderWidth: 0, height: 44 }}
              />
            </View>

            {/* Date Presets */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {PRESETS.map((p) => {
                const isActive = preset === p;
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => handleApplyPreset(p)}
                    style={[
                      styles.presetBtn,
                      {
                        backgroundColor: isActive ? (isDark ? "rgba(255,255,255,0.15)" : "#e0e0e0") : inputBg,
                        width: '48%'
                      }
                    ]}
                  >
                    <AppText type={THIRTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>{p}</AppText>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Dates */}
            <View style={{ marginTop: 12, gap: 8 }}>
              <TouchableOpacity onPress={() => setFromPickerVisible(true)} style={[styles.inputBox, { backgroundColor: inputBg }]}>
                <AppText style={[styles.input, { color: fromDate ? themeColors.text : themeColors.secondaryText, lineHeight: 44, fontFamily: fontFamilyMedium }]}>
                  {fromDate || "dd/mm/yyyy"}
                </AppText>
                <FastImage source={calendarIcon} style={{ width: 14, height: 14 }} tintColor={themeColors.secondaryText} resizeMode="contain" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setToPickerVisible(true)} style={[styles.inputBox, { backgroundColor: inputBg }]}>
                <AppText style={[styles.input, { color: toDate ? themeColors.text : themeColors.secondaryText, lineHeight: 44, fontFamily: fontFamilyMedium }]}>
                  {toDate || "dd/mm/yyyy"}
                </AppText>
                <FastImage source={calendarIcon} style={{ width: 14, height: 14 }} tintColor={themeColors.secondaryText} resizeMode="contain" />
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
              <TouchableOpacity onPress={handleReset} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilyMedium }}>Reset</AppText>
              </TouchableOpacity>

              <Button
                onPress={handleApply}
                containerStyle={{
                  width: '100%',
                  backgroundColor: themeColors.text,
                }}
                titleStyle={{ color: isDark ? colors.black : colors.white }}
              >
                Apply
              </Button>
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
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    height: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: 13,
    fontFamily: MEDIUM,
    padding: 0,
  },
  presetBtn: {
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
