import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useIsFocused, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../../hooks/useTheme';
import AnimatedBottomSheet from '../../../common/AnimatedBottomSheet/AnimatedBottomSheet';

import OptionsHeader from './OptionsHeader';
import OptionsChainTable from './OptionsChainTable';
import OptionsSettingsSheet from './OptionsSettingsSheet';
import OptionsEasyMode from './OptionsEasyMode';
import OptionsStrategies from './OptionsStrategies';
import OptionsMoreSheet from './OptionsMoreSheet';
import OptionsPairList from '../../Options/OptionsPairList';
import useOptionsWebSocket from './hooks/useOptionsWebSocket';

const OptionsTrade = ({ route }) => {
  const { colors: themeColors, theme, isDark } = useTheme();
  const isFocused = useIsFocused();

  const initialAsset = route?.params?.symbol
    ? String(route.params.symbol).replace(/USDT|USDC/i, "").toUpperCase()
    : 'BTC';

  const [selectedAsset, setSelectedAsset] = useState(initialAsset);
  const [searchTerm, setSearchTerm] = useState('');

  const { underlyings, expiries, chains, currentPrice, isMarketLoading, isContractsLoading } = useOptionsWebSocket(selectedAsset, null, isFocused);

  const [activeTab, setActiveTab] = useState(0);
  const [selectedOptionType, setSelectedOptionType] = useState('All');
  const [selectedExpiry, setSelectedExpiry] = useState(null);
  const prevAssetRef = useRef(selectedAsset);
  const [isSettingsVisible, setSettingsVisible] = useState(false);
  const [isMoreSheetVisible, setMoreSheetVisible] = useState(false);

  const pairSheetRef = useRef(null);

  // Re-apply route asset when navigating from Market → Options (screen may already be mounted).
  useFocusEffect(
    useCallback(() => {
      if (!route?.params?.symbol) return undefined;
      const base = String(route.params.symbol).replace(/USDT|USDC/i, "").toUpperCase();
      if (base) setSelectedAsset(base);
      return undefined;
    }, [route?.params?.symbol]),
  );

  // Default to first underlying if current selectedAsset is not in the list, unless a route param was provided
  useEffect(() => {
    if (route?.params?.symbol) {
      const base = String(route.params.symbol).replace(/USDT|USDC/i, "").toUpperCase();
      setSelectedAsset(base);
    } else if (underlyings?.length > 0 && !underlyings.find(u => u.symbol === selectedAsset)) {
      setSelectedAsset(underlyings[0].symbol);
    }
  }, [underlyings, selectedAsset, route?.params?.symbol]);

  // Default to first expiry date (not "All"); reset on asset change or invalid selection
  useEffect(() => {
    if (!expiries?.length) return;
    const firstDate = expiries.find((d) => d !== 'ALL');
    if (!firstDate) return;

    const assetChanged = prevAssetRef.current !== selectedAsset;
    prevAssetRef.current = selectedAsset;

    setSelectedExpiry((current) => {
      if (assetChanged || current == null) return firstDate;
      if (current !== 'ALL' && !expiries.includes(current)) return firstDate;
      return current;
    });
  }, [expiries, selectedAsset]);

  const filteredPairs = useMemo(() => {
    if (!underlyings || !Array.isArray(underlyings)) return [];
    if (!searchTerm) return underlyings;
    const s = searchTerm.toLowerCase();
    return underlyings.filter(pair =>
      pair?.symbol?.toLowerCase()?.includes(s) ||
      pair?.underlying?.toLowerCase()?.includes(s)
    );
  }, [underlyings, searchTerm]);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <OptionsHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedOptionType={selectedOptionType}
        setSelectedOptionType={setSelectedOptionType}
        selectedAsset={selectedAsset}
        onOpenSettings={() => setSettingsVisible(true)}
        onOpenMoreSheet={() => setMoreSheetVisible(true)}
        onOpenPairList={() => pairSheetRef.current?.open()}
      />
      <View style={[styles.divider, { backgroundColor: themeColors.themeBorderColor || '#EAEAEA' }]} />

      {activeTab === 0 && (
        <OptionsChainTable
          expiries={expiries}
          selectedExpiry={selectedExpiry}
          setSelectedExpiry={setSelectedExpiry}
          chains={chains}
          currentPrice={currentPrice}
          selectedAsset={selectedAsset}
          isMarketLoading={isMarketLoading}
          isContractsLoading={isContractsLoading}
          onOpenPairList={() => pairSheetRef.current?.open()}
        />
      )}
      {activeTab === 1 && (
        <OptionsEasyMode
          expiries={expiries}
          selectedExpiry={selectedExpiry}
          setSelectedExpiry={setSelectedExpiry}
        />
      )}
      {activeTab === 2 && (
        <OptionsStrategies />
      )}
      <OptionsSettingsSheet
        visible={isSettingsVisible}
        onClose={() => setSettingsVisible(false)}
      />
      <OptionsMoreSheet
        visible={isMoreSheetVisible}
        onClose={() => setMoreSheetVisible(false)}
      />
      <AnimatedBottomSheet ref={pairSheetRef} isDark={isDark} theme={theme}>
        <OptionsPairList
          pairs={filteredPairs}
          selectedPair={underlyings?.find(u => u.symbol === selectedAsset)}
          onSelectPair={(pair) => {
            setSelectedAsset(pair.symbol);
            pairSheetRef.current?.close();
          }}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onClose={() => pairSheetRef.current?.close()}
        />
      </AnimatedBottomSheet>
    </View>
  );
};

export default OptionsTrade;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
