import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
  Modal,
  StyleSheet,
} from 'react-native';
import { KeyboardAwareScrollView } from '@codler/react-native-keyboard-aware-scroll-view';
import RBSheet from 'react-native-raw-bottom-sheet';
import { AppText, BOLD, MEDIUM, SEMI_BOLD } from '../../../common';
import { colors, darkTheme } from '../../../theme/colors';
import {
  decNum,
  getStepSize,
  getTickSize,
  sanitizeIncrementInput,
  snapAndCapCloseQty,
  snapToIncrementInput,
} from '../../../helper/futuresUtils';

const PCT_OPTIONS = [25, 50, 75, 100];

const FuturesClosePositionModal = ({
  visible,
  onClose,
  onConfirm,
  isDark,
  themeColors,
  loading,
  pos,
  selectedCoin,
}) => {
  const [orderType, setOrderType] = useState('MARKET');
  const [pct, setPct] = useState(100);
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const sheetRef = useRef(null);
  const yesLockRef = useRef(false);
  const inputBg = isDark ? darkTheme.darkThemeInputColor : '#F4F4F4';

  const tickSize = getTickSize(selectedCoin);
  const stepSize = getStepSize(selectedCoin);
  const holding = decNum(pos?.computedQty ?? pos?.quantity);
  const markPrice = decNum(pos?.computedMark ?? pos?.mark_price);
  const isLong = String(pos?.side ?? '').toUpperCase() === 'LONG';
  const sideLabel = isLong ? 'Long' : String(pos?.side ?? '').toUpperCase() === 'SHORT' ? 'Short' : '—';
  const baseAsset = pos?.base_currency || (pos?.symbol ? String(pos.symbol).replace(/USDT.*/i, '') : '');
  const quoteAsset = pos?.quote_currency || (pos?.symbol && String(pos.symbol).toUpperCase().includes('USDT') ? 'USDT' : 'USD');
  const marginMode = String(pos?.margin_mode ?? pos?.margin_type ?? '').toUpperCase() === 'CROSS' ? 'Cross' : 'Isolated';

  useEffect(() => {
    if (!visible || !pos) {
      setConfirmVisible(false);
      yesLockRef.current = false;
      return;
    }
    setOrderType('MARKET');
    setPct(100);
    setConfirmVisible(false);
    yesLockRef.current = false;
    const posQty = decNum(pos.computedQty ?? pos.quantity);
    setQty(posQty > 0 ? snapAndCapCloseQty(String(posQty), stepSize, posQty) : '');
    const mark = decNum(pos.computedMark ?? pos.mark_price);
    const avg = decNum(pos.computedEntry ?? pos.average_entry_price ?? pos.entry_price);
    const priceSource = mark > 0 ? mark : avg;
    setPrice(priceSource > 0 ? snapToIncrementInput(String(priceSource), tickSize) : '');
  }, [visible, pos, stepSize, tickSize]);

  useEffect(() => {
    if (visible) {
      setTimeout(() => sheetRef.current?.open(), 100);
    } else {
      setConfirmVisible(false);
      yesLockRef.current = false;
      sheetRef.current?.close();
    }
  }, [visible]);

  const prevLoadingRef = useRef(false);
  useEffect(() => {
    if (prevLoadingRef.current && !loading && visible && confirmVisible) {
      yesLockRef.current = false;
    }
    prevLoadingRef.current = !!loading;
  }, [loading, visible, confirmVisible]);

  const applyPct = useCallback((p) => {
    setPct(p);
    if (!Number.isFinite(holding) || holding <= 0) {
      setQty('');
      return;
    }
    const raw = holding * (p / 100);
    setQty(snapAndCapCloseQty(String(raw), stepSize, holding) || '');
  }, [holding, stepSize]);

  const qtyNum = decNum(qty);
  const priceNum = orderType === 'LIMIT' ? decNum(price) : (markPrice > 0 ? markPrice : decNum(price));
  const estValue =
    Number.isFinite(qtyNum) && qtyNum > 0 && Number.isFinite(priceNum) && priceNum > 0
      ? qtyNum * priceNum
      : null;

  const canSubmit =
    !loading &&
    !confirmVisible &&
    Number.isFinite(qtyNum) &&
    qtyNum > 0 &&
    (orderType === 'MARKET' || (Number.isFinite(decNum(price)) && decNum(price) > 0));

  const requestConfirm = () => {
    if (!canSubmit || loading) return;
    setConfirmVisible(true);
  };

  const cancelConfirm = () => {
    if (loading) return;
    yesLockRef.current = false;
    setConfirmVisible(false);
  };

  const submitConfirm = () => {
    if (loading || yesLockRef.current) return;
    yesLockRef.current = true;
    const stepN = Number(stepSize) || 0;
    const isFullClose =
      pct === 100 ||
      (Number.isFinite(holding) && Number.isFinite(qtyNum) && qtyNum >= holding - Math.max(stepN, 1e-8));
    onConfirm?.({
      orderType,
      quantity: snapAndCapCloseQty(qty, stepSize, holding) || String(holding || ''),
      price: orderType === 'LIMIT' ? snapToIncrementInput(price, tickSize) : undefined,
      closePosition: isFullClose,
    });
  };

  const handleSheetClose = () => {
    if (loading) return;
    setConfirmVisible(false);
    onClose?.();
  };

  const holdingDisplay = Number.isFinite(holding) && holding > 0
    ? snapAndCapCloseQty(String(holding), stepSize, holding)
    : '—';

  const tabStyle = (active) => ({
    flex: 1,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: active ? (isDark ? colors.white : colors.black) : inputBg,
  });

  return (
    <>
      <RBSheet
        ref={sheetRef}
        keyboardAvoidingViewEnabled={Platform.OS === 'ios'}
        {...({ customModalProps: { statusBarTranslucent: true } })}
        closeOnDragDown={!loading}
        closeOnPressMask={!loading}
        onClose={handleSheetClose}
        height={600}
        customStyles={{
          wrapper: { backgroundColor: 'rgba(0,0,0,0.5)' },
          draggableIcon: {
            backgroundColor: isDark ? '#444' : '#E5E7EB',
            width: 40,
          },
          container: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingHorizontal: 16,
            paddingBottom: 24,
            backgroundColor: isDark ? themeColors.background || '#1E1E1E' : colors.white,
          },
        }}
      >
        <View style={{ flex: 1 }}>
        <KeyboardAwareScrollView
          style={{ flex: 1, marginTop: 8 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          extraScrollHeight={Platform.OS === 'ios' ? 24 : 60}
        >
          <View style={{ marginBottom: 16 }}>
              <AppText style={{ color: themeColors.text, fontSize: 18 }} weight={BOLD}>
                Close Position
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                <AppText style={{ color: themeColors.text, fontSize: 13 }} weight={SEMI_BOLD}>
                  {pos?.symbol || `${baseAsset}${quoteAsset}`}
                </AppText>
                <AppText style={{ color: themeColors.secondaryText, fontSize: 12 }}>{marginMode}</AppText>
                <View
                  style={{
                    backgroundColor: isLong ? 'rgba(38, 166, 154, 0.15)' : 'rgba(239, 83, 80, 0.15)',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}
                >
                  <AppText style={{ color: isLong ? colors.green : colors.red, fontSize: 11 }} weight={SEMI_BOLD}>
                    {sideLabel}
                  </AppText>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              <TouchableOpacity
                style={tabStyle(orderType === 'MARKET')}
                onPress={() => setOrderType('MARKET')}
                disabled={loading}
              >
                <AppText
                  style={{ color: orderType === 'MARKET' ? (isDark ? colors.black : colors.white) : themeColors.text, fontSize: 14 }}
                  weight={SEMI_BOLD}
                >
                  Market
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={tabStyle(orderType === 'LIMIT')}
                onPress={() => setOrderType('LIMIT')}
                disabled={loading}
              >
                <AppText
                  style={{ color: orderType === 'LIMIT' ? (isDark ? colors.black : colors.white) : themeColors.text, fontSize: 14 }}
                  weight={SEMI_BOLD}
                >
                  Limit
                </AppText>
              </TouchableOpacity>
            </View>

            {orderType === 'LIMIT' ? (
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <AppText style={{ color: themeColors.secondaryText, fontSize: 13 }}>Limit price</AppText>
                  {markPrice > 0 ? (
                    <AppText style={{ color: themeColors.secondaryText, fontSize: 12 }}>
                      Mark: {markPrice.toLocaleString('en-US', { maximumFractionDigits: 8 })}
                    </AppText>
                  ) : null}
                </View>
                <View
                  style={{
                    backgroundColor: inputBg,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    height: 44,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <TextInput
                    style={{ color: themeColors.text, fontSize: 14, padding: 0, flex: 1 }}
                    placeholder="Enter limit price"
                    placeholderTextColor={themeColors.secondaryText}
                    keyboardType="decimal-pad"
                    value={price}
                    editable={!loading}
                    onChangeText={(val) => setPrice(sanitizeIncrementInput(val, tickSize))}
                    onBlur={() => setPrice(snapToIncrementInput(price, tickSize))}
                  />
                  <AppText style={{ color: themeColors.secondaryText, fontSize: 14 }}>{quoteAsset}</AppText>
                </View>
              </View>
            ) : null}

            <AppText style={{ color: themeColors.secondaryText, fontSize: 13, marginBottom: 8 }}>Amount to close</AppText>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              {PCT_OPTIONS.map((p) => {
                const active = pct === p;
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => applyPct(p)}
                    disabled={loading}
                    style={{
                      flex: 1,
                      height: 36,
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: active ? (isDark ? colors.white : colors.black) : inputBg,
                    }}
                  >
                    <AppText
                      style={{ color: active ? (isDark ? colors.black : colors.white) : themeColors.text, fontSize: 12 }}
                      weight={SEMI_BOLD}
                    >
                      {p}%
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View
              style={{
                backgroundColor: inputBg,
                borderRadius: 8,
                paddingHorizontal: 12,
                height: 44,
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 14,
              }}
            >
              <TextInput
                style={{ color: themeColors.text, fontSize: 14, padding: 0, flex: 1 }}
                placeholder="Enter amount to close"
                placeholderTextColor={themeColors.secondaryText}
                keyboardType="decimal-pad"
                value={qty}
                editable={!loading}
                onChangeText={(val) => {
                  setPct(null);
                  setQty(sanitizeIncrementInput(val, stepSize));
                }}
                onBlur={() => setQty(snapAndCapCloseQty(qty, stepSize, holding))}
              />
              <AppText style={{ color: themeColors.secondaryText, fontSize: 14, marginRight: 8 }}>{baseAsset}</AppText>
              <TouchableOpacity onPress={() => applyPct(100)} disabled={loading} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <AppText style={{ color: themeColors.text, fontSize: 13 }} weight={SEMI_BOLD}>Max</AppText>
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText style={{ color: themeColors.secondaryText, fontSize: 13 }}>Holding</AppText>
                <AppText style={{ color: themeColors.text, fontSize: 13 }} weight={MEDIUM}>
                  {holdingDisplay} {baseAsset}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText style={{ color: themeColors.secondaryText, fontSize: 13 }}>Est. value</AppText>
                <AppText style={{ color: themeColors.text, fontSize: 13 }} weight={MEDIUM}>
                  {estValue != null
                    ? `${estValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${quoteAsset}`
                    : '—'}
                </AppText>
              </View>
            </View>

            <AppText style={{ color: '#d97706', fontSize: 12, marginBottom: 8, lineHeight: 18 }}>
              {orderType === 'MARKET'
                ? 'Fills at the current market price.'
                : 'Order rests on the book until filled at your price.'}
            </AppText>
        </KeyboardAwareScrollView>

        <TouchableOpacity
          style={{
            backgroundColor: isDark ? colors.white : '#000000',
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: 'center',
            opacity: canSubmit ? 1 : 0.5,
            marginTop: 8,
          }}
          disabled={!canSubmit}
          onPress={requestConfirm}
        >
          <AppText style={{ color: isDark ? colors.black : colors.white, fontSize: 15 }} weight={BOLD}>
            Close {sideLabel.toLowerCase()}
          </AppText>
        </TouchableOpacity>
        </View>
      </RBSheet>

      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelConfirm}
      >
        <View style={styles.confirmWrap}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={cancelConfirm}
            style={StyleSheet.absoluteFillObject}
            disabled={loading}
          />
          <View
            style={[
              styles.confirmCard,
              {
                backgroundColor: isDark ? themeColors.sheetDarkColor || themeColors.background : themeColors.themeElevationColor || colors.white,
                borderColor: themeColors.themeBorderColor || (isDark ? '#333' : '#e5e7eb'),
              },
            ]}
          >
            <AppText style={{ fontSize: 20, fontWeight: '700', color: themeColors.text, textAlign: 'center', marginBottom: 15 }}>
              Close Position
            </AppText>
            <AppText
              style={{
                fontSize: 15,
                color: themeColors.secondaryText,
                textAlign: 'center',
                marginBottom: 25,
                lineHeight: 22,
              }}
            >
              {`Are you sure you want to close this ${orderType === 'MARKET' ? 'market' : 'limit'} position?`}
            </AppText>
            <View style={{ flexDirection: 'row', width: '100%', gap: 10 }}>
              <TouchableOpacity
                onPress={cancelConfirm}
                disabled={loading}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: themeColors.themeElevationColor || (isDark ? '#2C2C2E' : '#F3F4F6'),
                  borderWidth: 1,
                  borderColor: themeColors.themeBorderColor || (isDark ? '#444' : '#e5e7eb'),
                  alignItems: 'center',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                <AppText style={{ fontSize: 14, fontWeight: '600', color: themeColors.text }}>No</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitConfirm}
                disabled={loading}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: themeColors.red || colors.red,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 44,
                  opacity: loading ? 0.85 : 1,
                }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <AppText style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>Yes</AppText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  confirmWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmCard: {
    borderRadius: 20,
    padding: 25,
    width: '85%',
    alignSelf: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
  },
});

export default FuturesClosePositionModal;
