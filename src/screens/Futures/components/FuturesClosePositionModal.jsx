import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  StyleSheet,
  Platform,
  Modal,
  ScrollView,
} from 'react-native';
import { KeyboardAwareScrollView } from '@codler/react-native-keyboard-aware-scroll-view';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { X, Info } from 'lucide-react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import { AppText, BOLD, FOURTEEN, MEDIUM, SEMI_BOLD, TEN, THIRTEEN, TWELVE } from '../../../common';
import { colors, darkTheme } from '../../../theme/colors';
import {
  decNum,
  getDecimalPlaces,
  getStepSize,
  getTickSize,
  snapAndCapCloseQty,
  sanitizeIncrementInput,
} from '../../../helper/futuresUtils';

const PCT_OPTIONS = [25, 50, 75, 100];

const FuturesClosePositionModal = ({
  visible,
  onClose,
  onConfirm,
  isDark = true,
  themeColors = {},
  loading = false,
  pos,
  selectedCoin,
}) => {
  const [orderType, setOrderType] = useState('MARKET');
  const [pct, setPct] = useState(100);
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const sheetRef = useRef(null);

  const isLong = String(pos?.side ?? '').toUpperCase() === 'LONG' || String(pos?.side ?? '').toUpperCase() === 'BUY';
  const sideLabel = isLong ? 'Long' : 'Short';
  const sideColor = isLong ? (colors.green || '#0B9C3C') : (colors.red || '#E03934');
  const sideBg = isLong ? 'rgba(11, 156, 60, 0.15)' : 'rgba(224, 57, 52, 0.15)';

  const holding = useMemo(() => {
    const raw = pos?.quantity ?? pos?.filled_quantity ?? pos?.amount ?? 0;
    return Math.abs(decNum(raw));
  }, [pos]);

  const stepSize = useMemo(() => getStepSize(selectedCoin), [selectedCoin]);
  const tickSize = useMemo(() => getTickSize(selectedCoin), [selectedCoin]);
  const holdingDp = useMemo(() => getDecimalPlaces(stepSize), [stepSize]);
  const holdingDisplay = holding.toFixed(holdingDp);

  const baseAsset = useMemo(() => {
    const s = pos?.symbol || selectedCoin?.symbol || '';
    if (s.includes('USDT')) return s.split('USDT')[0].replace(/[^A-Za-z0-9]/g, '');
    return selectedCoin?.base_asset || 'BTC';
  }, [pos, selectedCoin]);

  const quoteAsset = useMemo(() => {
    return selectedCoin?.margin_asset || 'USDT';
  }, [selectedCoin]);

  const markPrice = useMemo(() => {
    const p = pos?.mark_price ?? pos?.computedMark ?? selectedCoin?.mark_price;
    return decNum(p);
  }, [pos, selectedCoin]);

  const applyPct = (p) => {
    setPct(p);
    if (holding <= 0) {
      setQty('');
      return;
    }
    const target = (holding * p) / 100;
    const snapped = snapAndCapCloseQty(target, stepSize, holding);
    setQty(snapped);
  };

  useEffect(() => {
    if (visible && holding > 0) {
      setOrderType('MARKET');
      setPrice(markPrice > 0 ? markPrice.toFixed(getDecimalPlaces(tickSize)) : '');
      applyPct(100);
      sheetRef.current?.open();
    } else if (!visible) {
      sheetRef.current?.close();
    }
  }, [visible, holding, markPrice, stepSize, tickSize]);

  const handleSheetClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const estValue = useMemo(() => {
    const q = decNum(qty);
    const p = orderType === 'LIMIT' ? decNum(price) : markPrice;
    if (q <= 0 || p <= 0) return null;
    return q * p;
  }, [qty, price, orderType, markPrice]);

  const canSubmit = useMemo(() => {
    const q = decNum(qty);
    if (q <= 0 || q > holding) return false;
    if (orderType === 'LIMIT') {
      const p = decNum(price);
      if (p <= 0) return false;
    }
    return true;
  }, [qty, price, orderType, holding]);

  const requestConfirm = () => {
    if (!canSubmit) return;
    setConfirmVisible(true);
  };

  const cancelConfirm = () => {
    if (!loading) setConfirmVisible(false);
  };

  const submitConfirm = () => {
    setConfirmVisible(false);
    const q = decNum(qty);
    const p = orderType === 'LIMIT' ? decNum(price) : undefined;
    onConfirm({
      position_id: pos?._id || pos?.id || pos?.position_id,
      symbol: pos?.symbol,
      order_type: orderType,
      quantity: q,
      price: p,
      side: isLong ? 'SELL' : 'BUY',
    });
  };

  const displayPair = pos?.symbol
    ? pos.symbol.includes('-PERP')
      ? pos.symbol.replace('-PERP', '').replace('USDT', '/USDT')
      : pos.symbol
    : 'BNB/USDT';

  const primaryThemeColor = colors.cyanTheme || '#0AA8C5';

  return (
    <>
      <RBSheet
        ref={sheetRef}
        keyboardAvoidingViewEnabled={Platform.OS === 'ios'}
        customModalProps={{ statusBarTranslucent: true }}
        closeOnDragDown={!loading}
        closeOnPressMask={!loading}
        onClose={handleSheetClose}
        height={580}
        animationType="fade"
        openDuration={250}
        closeDuration={200}
        customStyles={{
          wrapper: { backgroundColor: 'rgba(0, 0, 0, 0.75)' },
          draggableIcon: {
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            width: 40,
            marginTop: 10,
          },
          container: {
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.12)',
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 24,
            backgroundColor: 'transparent',
            overflow: 'hidden',
          },
        }}
      >
        {/* Glassmorphic Background matching Spot.jsx */}
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={20}
          reducedTransparencyFallbackColor="#111214"
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(10, 12, 16, 0.72)' : 'rgba(255, 255, 255, 0.88)' }]} />
        {isDark && (
          <>
            <LinearGradient
              colors={[
                'rgba(10, 168, 197, 0.12)',
                'rgba(16, 185, 129, 0.05)',
                'rgba(10, 168, 197, 0.02)',
                'rgba(10, 168, 197, 0.08)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <LinearGradient
              colors={['transparent', 'rgba(10, 168, 197, 0.04)', 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          </>
        )}

        <View style={{ flex: 1 }}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: 16,
              marginTop: 4,
            }}
          >
            <View style={{ flex: 1 }}>
              <AppText weight={BOLD} style={{ fontSize: 20, color: themeColors.text || '#FFFFFF' }}>
                Close Position
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
                <AppText
                  weight={MEDIUM}
                  style={{
                    fontSize: 13,
                    color: isDark ? '#8E95A3' : '#6B7280',
                  }}
                >
                  {displayPair} · Isolated
                </AppText>
                <View style={{ backgroundColor: sideBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <AppText weight={BOLD} style={{ color: sideColor, fontSize: 11 }}>
                    {sideLabel}
                  </AppText>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => sheetRef.current?.close()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{
                padding: 4,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X color={isDark ? '#9CA3AF' : themeColors.text} size={20} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView
            enableOnAndroid={true}
            showsVerticalScrollIndicator={false}
            extraScrollHeight={Platform.OS === 'ios' ? 40 : 80}
            keyboardShouldPersistTaps="handled"
          >
            {/* Market / Limit Tab Switcher */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F3F4F6',
                borderRadius: 14,
                padding: 3,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 11,
                  backgroundColor: orderType === 'MARKET' ? (isDark ? 'rgba(10, 168, 197, 0.22)' : primaryThemeColor) : 'transparent',
                  borderWidth: (orderType === 'MARKET' && isDark) ? 1 : 0,
                  borderColor: 'rgba(10, 168, 197, 0.55)',
                }}
                activeOpacity={0.8}
                onPress={() => setOrderType('MARKET')}
              >
                <AppText
                  style={{
                    color: orderType === 'MARKET' ? (isDark ? '#0AA8C5' : '#FFFFFF') : (isDark ? '#8E95A3' : '#6B7280'),
                    fontSize: 14,
                  }}
                  weight={orderType === 'MARKET' ? BOLD : MEDIUM}
                >
                  Market
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 11,
                  backgroundColor: orderType === 'LIMIT' ? (isDark ? 'rgba(10, 168, 197, 0.22)' : primaryThemeColor) : 'transparent',
                  borderWidth: (orderType === 'LIMIT' && isDark) ? 1 : 0,
                  borderColor: 'rgba(10, 168, 197, 0.55)',
                }}
                activeOpacity={0.8}
                onPress={() => setOrderType('LIMIT')}
              >
                <AppText
                  style={{
                    color: orderType === 'LIMIT' ? (isDark ? '#0AA8C5' : '#FFFFFF') : (isDark ? '#8E95A3' : '#6B7280'),
                    fontSize: 14,
                  }}
                  weight={orderType === 'LIMIT' ? BOLD : MEDIUM}
                >
                  Limit
                </AppText>
              </TouchableOpacity>
            </View>

            {/* Limit Price Input */}
            {orderType === 'LIMIT' && (
              <View style={{ marginBottom: 14 }}>
                <AppText style={{ color: isDark ? '#8E95A3' : '#6B7280', fontSize: 12, marginBottom: 6 }} weight={MEDIUM}>
                  Order Price ({quoteAsset})
                </AppText>
                <View
                  style={{
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6',
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    height: 48,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.08)',
                  }}
                >
                  <TextInput
                    style={{ color: themeColors.text || '#FFFFFF', fontSize: 15, padding: 0, flex: 1, fontWeight: '600' }}
                    placeholder="Enter limit price"
                    placeholderTextColor={isDark ? '#606773' : '#9CA3AF'}
                    keyboardType="decimal-pad"
                    value={price}
                    editable={!loading}
                    onChangeText={(val) => setPrice(sanitizeIncrementInput(val, tickSize))}
                  />
                  <AppText style={{ color: isDark ? '#8E95A3' : '#6B7280', fontSize: 13 }}>{quoteAsset}</AppText>
                </View>
              </View>
            )}

            {/* Amount to close Label */}
            <AppText style={{ color: isDark ? '#8E95A3' : '#6B7280', fontSize: 12, marginBottom: 8 }} weight={MEDIUM}>
              Amount to close
            </AppText>

            {/* Percentage Pills */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {PCT_OPTIONS.map((p) => {
                const selected = pct === p;
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => applyPct(p)}
                    disabled={loading}
                    activeOpacity={0.8}
                    style={{
                      flex: 1,
                      paddingVertical: 9,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selected
                        ? (isDark ? 'rgba(10, 168, 197, 0.22)' : primaryThemeColor)
                        : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6'),
                      borderWidth: 1,
                      borderColor: selected
                        ? (isDark ? 'rgba(10, 168, 197, 0.55)' : primaryThemeColor)
                        : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
                    }}
                  >
                    <AppText
                      style={{
                        color: selected
                          ? (isDark ? '#0AA8C5' : '#FFFFFF')
                          : (isDark ? '#8E95A3' : '#6B7280'),
                        fontSize: 13,
                      }}
                      weight={selected ? BOLD : MEDIUM}
                    >
                      {p}%
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quantity Input */}
            <View
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F3F4F6',
                borderRadius: 14,
                paddingHorizontal: 14,
                height: 48,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.08)',
                marginBottom: 16,
              }}
            >
              <TextInput
                style={{ color: themeColors.text || '#FFFFFF', fontSize: 15, padding: 0, flex: 1, fontWeight: '600' }}
                placeholder="Enter amount to close"
                placeholderTextColor={isDark ? '#606773' : '#9CA3AF'}
                keyboardType="decimal-pad"
                value={qty}
                editable={!loading}
                onChangeText={(val) => {
                  setPct(null);
                  setQty(sanitizeIncrementInput(val, stepSize));
                }}
                onBlur={() => setQty(snapAndCapCloseQty(qty, stepSize, holding))}
              />
              <AppText style={{ color: isDark ? '#8E95A3' : '#6B7280', fontSize: 13, marginRight: 10 }}>{baseAsset}</AppText>
              <TouchableOpacity onPress={() => applyPct(100)} disabled={loading} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <AppText style={{ color: primaryThemeColor, fontSize: 13 }} weight={BOLD}>Max</AppText>
              </TouchableOpacity>
            </View>

            {/* Grouped Stats Card */}
            <View
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB',
                borderRadius: 16,
                padding: 14,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
                gap: 10,
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText style={{ color: isDark ? '#8E95A3' : '#6B7280', fontSize: 13 }}>Holding</AppText>
                <AppText style={{ color: themeColors.text || '#FFFFFF', fontSize: 13 }} weight={SEMI_BOLD}>
                  {holdingDisplay} {baseAsset}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText style={{ color: isDark ? '#8E95A3' : '#6B7280', fontSize: 13 }}>Est. Value</AppText>
                <AppText style={{ color: themeColors.text || '#FFFFFF', fontSize: 13 }} weight={SEMI_BOLD}>
                  {estValue != null
                    ? `${estValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${quoteAsset}`
                    : '—'}
                </AppText>
              </View>
            </View>

            {/* Info Banner */}
            <View
              style={{
                backgroundColor: isDark ? 'rgba(10, 168, 197, 0.08)' : 'rgba(10, 168, 197, 0.06)',
                padding: 12,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(10, 168, 197, 0.20)' : 'rgba(10, 168, 197, 0.15)',
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: primaryThemeColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText style={{ color: '#FFFFFF', fontSize: 12 }} weight={BOLD}>
                  i
                </AppText>
              </View>
              <AppText style={{ color: isDark ? '#90D5E3' : '#0B6C7E', fontSize: 12, flex: 1, lineHeight: 17 }}>
                {orderType === 'MARKET'
                  ? 'Fills immediately at the best available market price.'
                  : 'Order rests on the order book until filled at your limit price.'}
              </AppText>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={{
                backgroundColor: canSubmit ? primaryThemeColor : (isDark ? 'rgba(10, 168, 197, 0.35)' : 'rgba(10, 168, 197, 0.4)'),
                height: 48,
                borderRadius: 28,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              disabled={!canSubmit || loading}
              activeOpacity={0.85}
              onPress={requestConfirm}
            >
              <AppText style={{ color: '#FFFFFF', fontSize: 15 }} weight={BOLD}>
                Close {sideLabel}
              </AppText>
            </TouchableOpacity>
          </KeyboardAwareScrollView>
        </View>
      </RBSheet>

      {/* Centered Confirm Dialog */}
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
                backgroundColor: 'transparent',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                borderWidth: 1,
                borderRadius: 24,
                overflow: 'hidden',
              },
            ]}
          >
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="light"
              blurAmount={20}
              reducedTransparencyFallbackColor="#111214"
            />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(10, 12, 16, 0.78)' : 'rgba(255, 255, 255, 0.90)' }]} />
            {isDark && (
              <>
                <LinearGradient
                  colors={[
                    'rgba(10, 168, 197, 0.12)',
                    'rgba(16, 185, 129, 0.05)',
                    'rgba(10, 168, 197, 0.02)',
                    'rgba(10, 168, 197, 0.08)',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(10, 168, 197, 0.04)', 'transparent']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
              </>
            )}
            <AppText style={{ fontSize: 20, fontWeight: '700', color: themeColors.text || '#FFFFFF', textAlign: 'center', marginBottom: 12 }}>
              Close Position
            </AppText>
            <AppText
              style={{
                fontSize: 14,
                color: isDark ? '#8E95A3' : '#6B7280',
                textAlign: 'center',
                marginBottom: 24,
                lineHeight: 20,
              }}
            >
              {`Are you sure you want to close this ${orderType === 'MARKET' ? 'market' : 'limit'} position?`}
            </AppText>
            <View style={{ flexDirection: 'row', width: '100%', gap: 12 }}>
              <TouchableOpacity
                onPress={cancelConfirm}
                disabled={loading}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.05)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.05)',
                }}
              >
                <AppText style={{ fontSize: 14, fontWeight: '600', color: themeColors.text || '#FFFFFF' }}>No, Keep</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitConfirm}
                disabled={loading}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: primaryThemeColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 44,
                }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <AppText style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Yes, Close</AppText>
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmCard: {
    borderRadius: 24,
    padding: 24,
    width: '85%',
    alignSelf: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});

export default FuturesClosePositionModal;
