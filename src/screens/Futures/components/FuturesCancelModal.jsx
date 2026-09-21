import React from 'react';
import { View, TouchableOpacity, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { AppText, FOURTEEN, SIXTEEN, BOLD } from '../../../common';
import { colors } from '../../../theme/colors';
import { fontFamilyMedium, fontFamilySemiBold } from '../../../theme/typography';

const FuturesCancelModal = ({ visible, onClose, onConfirm, isDark = true, themeColors = {}, loading = false }) => {
  const primaryThemeColor = colors.cyanTheme || '#0AA8C5';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{
          width: '85%',
          backgroundColor: 'transparent',
          borderRadius: 24,
          padding: 24,
          alignItems: 'center',
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
        }}>
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
          <AppText type={SIXTEEN} style={{ color: themeColors.text || '#FFFFFF', fontFamily: fontFamilySemiBold, marginBottom: 12 }}>
            Cancel Order
          </AppText>
          <AppText type={FOURTEEN} style={{ color: isDark ? '#8E95A3' : '#6B7280', fontFamily: fontFamilyMedium, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
            Are you sure you want to cancel this order?
          </AppText>
          
          <View style={{ flexDirection: 'row', width: '100%', gap: 12 }}>
            <TouchableOpacity
              onPress={onClose}
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
              <AppText type={FOURTEEN} style={{ color: themeColors.text || '#FFFFFF', fontFamily: fontFamilySemiBold }}>
                No, Keep
              </AppText>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={onConfirm}
              disabled={loading}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: colors.red || '#E03934',
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                minHeight: 44,
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <AppText type={FOURTEEN} style={{ color: '#FFFFFF', fontFamily: fontFamilySemiBold }}>
                  Yes, Cancel
                </AppText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default FuturesCancelModal;
