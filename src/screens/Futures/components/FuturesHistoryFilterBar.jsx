import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { AppText, MEDIUM, SEMI_BOLD, TWELVE, THIRTEEN } from '../../../common';
import FastImage from 'react-native-fast-image';
import { downIcon, Refresh } from '../../../helper/ImageAssets';
import CustomDropdown from '../../../shared/components/CustomDropdown';

const OPEN_ORDER_KINDS = [
  { id: 'all', label: 'All' },
  { id: 'limit', label: 'Limit' },
  { id: 'market', label: 'Market' },
];

const SIDE_DROPDOWN_LABELS = ['All Sides', 'Buy', 'Sell'];

const FuturesHistoryFilterBar = ({ 
  themeColors, 
  isDark, 
  orderKindFilter, 
  setOrderKindFilter, 
  orderSideFilter, 
  setOrderSideFilter 
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleReset = () => {
    setOrderKindFilter('all');
    setOrderSideFilter('All Sides');
  };

  return (
    <View style={{ marginBottom: 16, paddingHorizontal: 2 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingVertical: 2,
        }}
      >
        {/* Chips for Order Kinds */}
        {OPEN_ORDER_KINDS.map((k) => {
          const active = orderKindFilter === k.id;
          return (
            <TouchableOpacity
              key={k.id}
              activeOpacity={0.85}
              onPress={() => setOrderKindFilter(k.id)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 4,
                backgroundColor: active ? (isDark ? '#2C2C2E' : '#E5E5EA') : (isDark ? '#1C1C1E' : '#F2F2F7'),
              }}
            >
              <AppText
                weight={active ? SEMI_BOLD : MEDIUM}
                style={{
                  fontSize: 13,
                  color: active ? themeColors.text : themeColors.secondaryText,
                }}
              >
                {k.label}
              </AppText>
            </TouchableOpacity>
          );
        })}

        {/* Dropdown for Sides */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setDropdownOpen(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 4,
            backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7',
            gap: 6,
          }}
        >
          <AppText weight={MEDIUM} style={{ fontSize: 13, color: themeColors.secondaryText }}>
            {orderSideFilter}
          </AppText>
          <FastImage 
            source={downIcon} 
            style={{ width: 10, height: 10 }} 
            resizeMode="contain" 
            tintColor={themeColors.secondaryText} 
          />
        </TouchableOpacity>

        {/* Reset Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleReset}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 8,
            paddingVertical: 6,
            gap: 4,
          }}
        >
          <FastImage 
            source={Refresh} 
            style={{ width: 12, height: 12 }} 
            resizeMode="contain" 
            tintColor={themeColors.secondaryText} 
          />
          <AppText weight={MEDIUM} style={{ fontSize: 13, color: themeColors.secondaryText }}>
            Reset
          </AppText>
        </TouchableOpacity>
      </ScrollView>

      <CustomDropdown
        visible={dropdownOpen}
        items={SIDE_DROPDOWN_LABELS}
        onClose={() => setDropdownOpen(false)}
        onSelect={(val) => {
          setOrderSideFilter(val);
          setDropdownOpen(false);
        }}
        themeColors={themeColors}
      />
    </View>
  );
};

export default FuturesHistoryFilterBar;
