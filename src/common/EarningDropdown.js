import React, { useRef } from 'react';
import {
  View,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import FastImage from 'react-native-fast-image';
import { colors } from '../theme/colors';
import { AppText, BLACK } from './AppText';
import { closeIcon } from '../helper/ImageAssets';

const formatWalletLabel = (item) => {
  if (item == null) return '';
  const raw = typeof item === 'string' ? item : (item?.value ?? item?.label ?? item?.id ?? '');
  if (!raw || typeof raw !== 'string') return '';
  const lower = raw.toLowerCase();
  if (lower === 'p2p') return 'P2P';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
};

const EarningDropdown = ({ data = [], onSelect, selected, theme }) => {
  const sheetRef = useRef(null);
  const darkMode = theme === "Dark";

  const sheetBg = darkMode ? colors.sheetColor : "#FFFFFF";
  const textColor = darkMode ? colors.white : "#111";
  const subBorder = darkMode ? colors.dividerColor : "rgba(0,0,0,0.10)";
  const dropdownBg = darkMode ? colors.themeElevationColor : "#FFFFFF";
  const dropdownBorder = darkMode ? colors.inputBorder : "rgba(0,0,0,0.12)";
  const maskBg = darkMode ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.35)";

  const handleSelect = (item) => {
    onSelect(item);
    sheetRef.current?.close();
  };

  const openSheet = () => {
    sheetRef.current?.open();
  };

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.dropdown,
          { backgroundColor: dropdownBg, borderColor: dropdownBorder },
        ]}
        onPress={openSheet}
        activeOpacity={0.8}
      >
        <AppText color={textColor}>
          {selected ? formatWalletLabel(selected) : 'Select Payment Wallet'}
        </AppText>
      </TouchableOpacity>

      <RBSheet
        ref={sheetRef}
        height={320}
        closeOnDragDown
        closeOnPressMask
        customStyles={{
          container: {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: sheetBg,
            paddingBottom: 24,
          },
          wrapper: { backgroundColor: maskBg },
          draggableIcon: { backgroundColor: subBorder },
        }}
      >
        <View style={styles.sheetHeader}>
          <AppText style={[styles.sheetTitle, { color: textColor }]}>
            Select Payment Wallet
          </AppText>
          <TouchableOpacity
            onPress={() => sheetRef.current?.close()}
            style={styles.closeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <FastImage
              source={closeIcon}
              style={styles.closeIcon}
              tintColor={textColor}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
        <View style={[styles.sheetDivider, { backgroundColor: subBorder }]} />
        <FlatList
          data={data}
          keyExtractor={(item, index) => index.toString()}
          style={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleSelect(item)}
              style={[styles.option, { borderBottomColor: subBorder }]}
              activeOpacity={0.7}
            >
              <AppText color={textColor}>{formatWalletLabel(item)}</AppText>
            </TouchableOpacity>
          )}
        />
      </RBSheet>
    </View>
  );
};

export default EarningDropdown;

const styles = StyleSheet.create({
  dropdown: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    padding: 12,
    height: 45,
    borderRadius: 8,
    backgroundColor: colors.themeElevationColor,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    padding: 8,
  },
  closeIcon: {
    width: 20,
    height: 20,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: colors.dividerColor,
    marginHorizontal: 20,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.dividerColor,
  },
});
