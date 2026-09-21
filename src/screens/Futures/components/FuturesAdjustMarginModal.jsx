import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { AppText, BOLD, FOURTEEN, MEDIUM, SEMI_BOLD, TEN, THIRTEEN, TWELVE } from '../../../common';
import { colors, darkTheme } from '../../../theme/colors';
import {
  decNum,
  getDecimalPlaces,
  getTickSize,
  sanitizeIncrementInput,
} from '../../../helper/futuresUtils';

const FuturesAdjustMarginModal = ({
  visible,
  onClose,
  onConfirm,
  isDark = true,
  themeColors = {},
  loading = false,
  pos,
  selectedCoin,
  availableBalance = 0,
}) => {
  const [activeTab, setActiveTab] = useState('Add'); // 'Add' | 'Remove'
  const [amount, setAmount] = useState('');

  const isLong = String(pos?.side ?? '').toUpperCase() === 'LONG' || String(pos?.side ?? '').toUpperCase() === 'BUY';
  const sideLabel = isLong ? 'Long' : 'Short';
  const sideColor = isLong ? (colors.green || '#0B9C3C') : (colors.red || '#E03934');
  const sideBg = isLong ? 'rgba(11, 156, 60, 0.15)' : 'rgba(224, 57, 52, 0.15)';

  const currentMargin = Number(pos?.isolated_margin_allocated ?? pos?.initial_margin ?? pos?.margin) || 0;
  const entryPrice = Number(pos?.average_entry_price ?? pos?.entry_price) || 0;
  const markPrice = Number(pos?.mark_price ?? pos?.computedMark) || entryPrice;
  const qty = Number(pos?.quantity ?? pos?.filled_quantity) || 0;
  const leverage = Number(pos?.leverage) || 1;

  // Maintenance margin calculation
  const maintMarginRatio = Number(pos?.maintenance_margin_rate ?? selectedCoin?.maintenance_margin_rate) || 0.005;
  const notionalValue = qty * markPrice;
  const maintMarginReq = notionalValue * maintMarginRatio;

  // Max calculations
  const maxAddable = Math.max(0, availableBalance);
  const maxRemovable = Math.max(0, currentMargin - maintMarginReq);
  const maxAllowed = activeTab === 'Add' ? maxAddable : maxRemovable;

  useEffect(() => {
    if (visible) {
      setActiveTab('Add');
      setAmount('');
    }
  }, [visible]);

  const handleMaxPress = () => {
    if (maxAllowed > 0) {
      setAmount(maxAllowed.toFixed(8).replace(/\.?0+$/, ''));
    }
  };

  const handleConfirm = () => {
    const num = parseFloat(amount);
    if (!num || num <= 0 || num > maxAllowed) return;

    onConfirm({
      position_id: pos?._id || pos?.id || pos?.position_id,
      symbol: pos?.symbol,
      margin: num,
      amount: num,
      type: activeTab === 'Add' ? 'ADD' : 'REMOVE',
      side: pos?.side,
    });
  };

  const numAmount = parseFloat(amount) || 0;
  const projectedMargin = activeTab === 'Add' ? currentMargin + numAmount : currentMargin - numAmount;

  let projectedLiqPrice = 0;
  if (qty > 0 && leverage > 0) {
    if (isLong) {
      projectedLiqPrice = Math.max(0, entryPrice - projectedMargin / qty + (entryPrice * maintMarginRatio));
    } else {
      projectedLiqPrice = Math.max(0, entryPrice + projectedMargin / qty - (entryPrice * maintMarginRatio));
    }
  }

  let projectedMarginRatio = 0;
  if (projectedMargin > 0 && maintMarginReq > 0) {
    projectedMarginRatio = (maintMarginReq / projectedMargin) * 100;
  }

  const displayPair = pos?.symbol
    ? pos.symbol.includes('-PERP')
      ? pos.symbol.replace('-PERP', '').replace('USDT', '/USDT')
      : pos.symbol
    : 'BNB/USDT';

  const isValidAmount = numAmount > 0 && numAmount <= maxAllowed;
  const primaryThemeColor = colors.cyanTheme || '#0AA8C5';

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          justifyContent: 'flex-end',
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e?.stopPropagation?.()}
          style={{
            maxHeight: '85%',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.12)',
            backgroundColor: 'transparent',
            overflow: 'hidden',
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

          <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24 }}>
            {/* Drag Handle */}
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
            </View>

            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <View style={{ flex: 1 }}>
                <AppText weight={BOLD} style={{ fontSize: 20, color: themeColors.text || '#FFFFFF' }}>
                  Adjust Margin
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
                onPress={onClose}
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
              {/* Tab Selector */}
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
                    backgroundColor: activeTab === 'Add' ? (isDark ? 'rgba(10, 168, 197, 0.22)' : primaryThemeColor) : 'transparent',
                    borderWidth: (activeTab === 'Add' && isDark) ? 1 : 0,
                    borderColor: 'rgba(10, 168, 197, 0.55)',
                  }}
                  activeOpacity={0.8}
                  onPress={() => {
                    setActiveTab('Add');
                    setAmount('');
                  }}
                >
                  <AppText
                    style={{
                      color: activeTab === 'Add' ? (isDark ? '#0AA8C5' : '#FFFFFF') : (isDark ? '#8E95A3' : '#6B7280'),
                      fontSize: 13,
                    }}
                    weight={activeTab === 'Add' ? BOLD : MEDIUM}
                  >
                    Add Margin
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 11,
                    backgroundColor: activeTab === 'Remove' ? (isDark ? 'rgba(10, 168, 197, 0.22)' : primaryThemeColor) : 'transparent',
                    borderWidth: (activeTab === 'Remove' && isDark) ? 1 : 0,
                    borderColor: 'rgba(10, 168, 197, 0.55)',
                  }}
                  activeOpacity={0.8}
                  onPress={() => {
                    setActiveTab('Remove');
                    setAmount('');
                  }}
                >
                  <AppText
                    style={{
                      color: activeTab === 'Remove' ? (isDark ? '#0AA8C5' : '#FFFFFF') : (isDark ? '#8E95A3' : '#6B7280'),
                      fontSize: 13,
                    }}
                    weight={activeTab === 'Remove' ? BOLD : MEDIUM}
                  >
                    Remove Margin
                  </AppText>
                </TouchableOpacity>
              </View>

              {/* Amount Input */}
              <AppText style={{ color: isDark ? '#8E95A3' : '#6B7280', fontSize: 12, marginBottom: 6 }} weight={MEDIUM}>
                Amount (USDT)
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
                  marginBottom: 4,
                }}
              >
                <TextInput
                  style={{ color: themeColors.text || '#FFFFFF', fontSize: 15, padding: 0, flex: 1, fontWeight: '600' }}
                  placeholder="Enter amount"
                  placeholderTextColor={isDark ? '#606773' : '#9CA3AF'}
                  keyboardType="decimal-pad"
                  value={amount}
                  editable={!loading}
                  onChangeText={(val) => setAmount(sanitizeIncrementInput(val, 0.0001))}
                />
                <AppText style={{ color: isDark ? '#8E95A3' : '#6B7280', fontSize: 13, marginRight: 10 }}>
                  USDT
                </AppText>
                <TouchableOpacity onPress={handleMaxPress} disabled={loading} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <AppText style={{ color: primaryThemeColor, fontSize: 13 }} weight={BOLD}>
                    Max
                  </AppText>
                </TouchableOpacity>
              </View>
              <AppText style={{ color: isDark ? '#8E95A3' : '#6B7280', fontSize: 11, marginBottom: 16 }}>
                {activeTab === 'Add'
                  ? `Max Available ${maxAddable.toFixed(8)} USDT`
                  : `Max Removable ${maxRemovable.toFixed(8)} USDT`}
              </AppText>

              {/* Stats Card */}
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
                  <AppText style={{ color: isDark ? '#8E95A3' : '#6B7280', fontSize: 13 }}>
                    Currently Assigned Margin
                  </AppText>
                  <AppText style={{ color: themeColors.text || '#FFFFFF', fontSize: 13 }} weight={SEMI_BOLD}>
                    {currentMargin.toFixed(5)} USDT
                  </AppText>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText style={{ color: isDark ? '#8E95A3' : '#6B7280', fontSize: 13 }}>
                    {activeTab === 'Add' ? 'Max addable' : 'Max removable'}
                  </AppText>
                  <AppText style={{ color: themeColors.text || '#FFFFFF', fontSize: 13 }} weight={SEMI_BOLD}>
                    {maxAllowed.toFixed(8)} USDT
                  </AppText>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText style={{ color: isDark ? '#8E95A3' : '#6B7280', fontSize: 13 }}>
                    Margin Ratio
                  </AppText>
                  <AppText style={{ color: themeColors.text || '#FFFFFF', fontSize: 13 }} weight={SEMI_BOLD}>
                    {projectedMarginRatio > 0 ? `${projectedMarginRatio.toFixed(4)}%` : '—'}
                  </AppText>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText style={{ color: isDark ? '#8E95A3' : '#6B7280', fontSize: 13 }}>
                    {activeTab === 'Add' ? 'Est. Liq. Price after increase' : 'Est. Liq. Price after decrease'}
                  </AppText>
                  <AppText style={{ color: themeColors.text || '#FFFFFF', fontSize: 13 }} weight={SEMI_BOLD}>
                    {projectedLiqPrice > 0 ? `${projectedLiqPrice.toFixed(3)} USDT` : '—'}
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
                  {activeTab === 'Add'
                    ? 'Adds USDT from your futures wallet into this Isolated position.'
                    : 'Removes USDT from this Isolated position back into your futures wallet.'}
                </AppText>
              </View>

              {/* Confirm Button */}
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={!isValidAmount || loading}
                activeOpacity={0.85}
                style={{
                  backgroundColor: isValidAmount ? primaryThemeColor : (isDark ? 'rgba(10, 168, 197, 0.35)' : 'rgba(10, 168, 197, 0.4)'),
                  borderRadius: 28,
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <AppText weight={BOLD} style={{ color: '#FFFFFF', fontSize: 15 }}>
                    Confirm
                  </AppText>
                )}
              </TouchableOpacity>
            </KeyboardAwareScrollView>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default FuturesAdjustMarginModal;
