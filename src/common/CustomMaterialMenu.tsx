// React Native Popup Menu – Over Flow Menu
// https://aboutreact.com/react-native-popup-menu/

import React, {useState} from 'react';
//import react in our code.
import {View, Text, Image, TouchableOpacity, StyleSheet} from 'react-native';
//import all the components we are going to use.
import {Menu, MenuItem, MenuDivider} from 'react-native-material-menu';
import TouchableOpacityView from './TouchableOpacityView';
import FastImage from 'react-native-fast-image';
import {menuIcon} from '../helper/ImageAssets';
import {fontFamilyMedium} from '../theme/typography';
import {colors} from '../theme/colors';
import {borderWidth} from '../theme/dimens';
import NavigationService from '../navigation/NavigationService';
import {
  CONVERT_SCREEN,
  DEPOSIT_INR_SCREEN,
  DEPOSIT_SCREEN,
  NAVIGATION_TRADE_STACK,
  WITHDRAW_INR_SCREEN,
  WITHDRAW_SCREEN,
} from '../navigation/routes';
//import menu and menu item

const CustomMaterialMenu = ({isInr, walletDetail}) => {
  const [visible, setVisible] = useState(false);

  const hideMenu = () => setVisible(false);

  const showMenu = () => setVisible(true);
  const onBuy = () => {
    hideMenu();
    NavigationService.navigate(NAVIGATION_TRADE_STACK);
  };
  const onSell = () => {
    hideMenu();
    NavigationService.navigate(NAVIGATION_TRADE_STACK);
  };
  const onConvert = () => {
    hideMenu();
    NavigationService.navigate(CONVERT_SCREEN, {walletDetail});
  };
  const onDeposit = () => {
    hideMenu();
    isInr
      ? NavigationService.navigate(DEPOSIT_INR_SCREEN, {walletDetail})
      : NavigationService.navigate(DEPOSIT_SCREEN, {walletDetail});
  };
  const onWidthDraw = () => {
    hideMenu();
    isInr
      ? NavigationService.navigate(WITHDRAW_INR_SCREEN, {walletDetail})
      : NavigationService.navigate(WITHDRAW_SCREEN, {walletDetail});
  };

  return (
    <View>
      <Menu
        visible={visible}
        style={styles.menu}
        anchor={
          <TouchableOpacityView
            onPress={showMenu}
            style={styles.menuIconContainer}>
            <FastImage
              source={menuIcon}
              resizeMode="contain"
              style={styles.menuIcon}
            />
          </TouchableOpacityView>
        }
        onRequestClose={hideMenu}>
        {/* <MenuItem textStyle={styles.menuItem} onPress={() => onBuy()}>
          Buy
        </MenuItem>
        <MenuDivider color={colors.secondBorder} />
        <MenuItem textStyle={styles.menuItem} onPress={() => onSell()}>
          Sell
        </MenuItem> */}
        <MenuDivider color={colors.secondBorder} />
        {/* <MenuItem textStyle={styles.menuItem} onPress={() => onConvert()}>
          Convert
        </MenuItem> */}
        <MenuDivider color={colors.secondBorder} />
        <MenuItem textStyle={styles.menuItem} onPress={() => onDeposit()}>
          Deposit
        </MenuItem>
        <MenuDivider color={colors.secondBorder} />
        <MenuItem textStyle={styles.menuItem} onPress={() => onWidthDraw()}>
          Withdraw
        </MenuItem>
        <MenuDivider color={colors.secondBorder} />
      </Menu>
    </View>
  );
};

export {CustomMaterialMenu};
const styles = StyleSheet.create({
  menuIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 20,
    width: 20,
  },
  menuIcon: {
    height: 15,
    width: 15,
  },
  menuItem: {
    fontFamily: fontFamilyMedium,
    fontSize: 12,
    color: colors.black,
  },
  menu: {
    borderWidth: borderWidth,
    borderColor: colors.inputBorder,
    // backgroundColor: colors.inputBackground,
  },
});
