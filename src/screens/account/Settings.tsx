import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState } from 'react';
import {
  AppSafeAreaView,
  AppText,
  Button,
  CommonModal,
  SEMI_BOLD,
} from '../../shared';
import { StyleSheet, View, Switch } from 'react-native';
import { colors } from '../../theme/colors';
import {
  borderWidth,
  universalPaddingHorizontal,
  universalPaddingHorizontalHigh,
  universalPaddingTop,
} from '../../theme/dimens';
import TouchableOpacityView from '../../shared/components/TouchableOpacityView';
import FastImage from 'react-native-fast-image';
import {
  currency_pref_ic,
  languageIcon,
  lock_ic,
  right_ic,
  moonIcon,
} from '../../helper/ImageAssets';
import NavigationService from '../../navigation/NavigationService';
import {
  CHANGE_PASSWORD_SCREEN,
  CURRENCY_PREFERENCE_SCREEN,
  ANTI_PHISHING_CODE_SCREEN,
} from '../../navigation/routes';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { deleteAccount } from '../../actions/accountActions';
import { checkValue } from '../../helper/utility';
import { useTheme } from '../../hooks/useTheme';
import { setTheme } from '../../slices/authSlice';
import { Toolbar } from '../../common/Toolbar';

export const SingleBox = ({ item, themeColors }: any) => {
  return (
    <TouchableOpacityView onPress={item.onPress} 
      style={[
        styles.singleBox, 
        { 
          backgroundColor: themeColors.input, 
          borderColor: themeColors.border 
        }
      ]}>
      <View style={styles.singleBoxSecond}>
        <FastImage
          source={item?.icon}
          resizeMode="contain"
          style={styles.icon}
          tintColor={themeColors.text}
        />
        <AppText weight={SEMI_BOLD} style={{ color: themeColors.text }}>{item?.title}</AppText>
      </View>
      {item.isToggle ? (
        <Switch
          value={item.value}
          onValueChange={item.onToggle}
          trackColor={{ false: '#767577', true: colors.buttonBg }}
          thumbColor={item.value ? '#34C759' : '#f4f3f4'}
        />
      ) : (
        <FastImage
          source={right_ic}
          resizeMode="contain"
          style={styles.rightIc}
          tintColor={themeColors.text}
        />
      )}
    </TouchableOpacityView>
  );
};

const Settings = () => {
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark, theme } = useTheme();
  const [isDelete, setIsDelete] = useState(false);
  const languages = useAppSelector(state => {
    return state.account.languages;
  });

  const toggleTheme = () => {
    const newTheme = theme === 'Dark' ? 'Light' : 'Dark';
    dispatch(setTheme(newTheme));
    AsyncStorage.setItem('theme', newTheme);
  };

  const DATA = [
    {
      id: '1',
      title: checkValue(languages?.setting_one) || 'Change Password',
      icon: lock_ic,
      onPress: () => NavigationService.navigate(CHANGE_PASSWORD_SCREEN),
    },
    {
      id: '2',
      title: checkValue(languages?.setting_two) || 'Currency Preference',
      icon: currency_pref_ic,
      onPress: () => NavigationService.navigate(CURRENCY_PREFERENCE_SCREEN),
    },
    {
      id: '3',
      title: 'Anti-Phishing Code',
      icon: lock_ic,
      onPress: () => NavigationService.navigate(ANTI_PHISHING_CODE_SCREEN),
    },
    {
      id: '4',
      title: 'Dark Theme',
      icon: moonIcon,
      isToggle: true,
      value: isDark,
      onToggle: toggleTheme,
      onPress: toggleTheme,
    },
  ];

  const onDelete = () => {
    setIsDelete(true);
  };
  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background }}>
      <Toolbar isSecond title={checkValue(languages?.setting_three) || 'Settings'} />
      <View style={styles.container}>
        {DATA?.map(e => {
          return <SingleBox key={e.id} item={e} themeColors={themeColors} />;
        })}
      </View>

      <CommonModal
        isVisible={isDelete}
        onBackButtonPress={() => setIsDelete(false)}
        title={`${checkValue(languages?.setting_five)}\n${checkValue(
          languages?.setting_six,
        )}`}
        subtitle={checkValue(languages?.setting_seven)}
        onPressNo={() => setIsDelete(false)}
        onPressYes={() => {
          dispatch(deleteAccount());
          setIsDelete(false);
        }}
      />
    </AppSafeAreaView>
  );
};

export default Settings;

const styles = StyleSheet.create({
  singleBox: {
    paddingHorizontal: universalPaddingHorizontalHigh,
    marginVertical: 5,
    paddingVertical: universalPaddingHorizontal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: borderWidth,
    borderRadius: 10,
  },
  container: {
    paddingTop: universalPaddingTop,
    paddingHorizontal: 10
  },
  icon: {
    height: 22,
    width: 22,
    marginEnd: 10,
  },
  rightIc: {
    height: 15,
    width: 15,
  },
  singleBoxSecond: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    backgroundColor: colors.red,
    margin: universalPaddingHorizontalHigh,
  },
  buttonTitle: {
    color: colors.white,
    fontSize: 12,
  },
});
