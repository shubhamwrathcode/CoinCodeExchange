import React from 'react';
import { View, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { AppText, FOURTEEN, SIXTEEN } from '../../../common';
import { colors } from '../../../theme/colors';
import { fontFamilyMedium, fontFamilySemiBold } from '../../../theme/typography';

const FuturesCancelModal = ({ visible, onClose, onConfirm, isDark, themeColors, loading }) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{
          width: '85%',
          backgroundColor: themeColors.background,
          borderRadius: 16,
          padding: 24,
          alignItems: 'center',
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
        }}>
          <AppText type={SIXTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold, marginBottom: 12 }}>
            Cancel Order
          </AppText>
          <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText, fontFamily: fontFamilyMedium, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
            Are you sure you want to cancel this order?
          </AppText>
          
          <View style={{ flexDirection: 'row', width: '100%', gap: 12 }}>
            <TouchableOpacity
              onPress={onClose}
              disabled={loading}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 8,
                backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                alignItems: 'center'
              }}
            >
              <AppText type={FOURTEEN} style={{ color: themeColors.text, fontFamily: fontFamilySemiBold }}>
                No, Keep it
              </AppText>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={onConfirm}
              disabled={loading}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 8,
                backgroundColor: colors.red,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center'
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <AppText type={FOURTEEN} style={{ color: colors.white, fontFamily: fontFamilySemiBold }}>
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
