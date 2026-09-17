import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Platform, ToastAndroid, Alert } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FastImage from 'react-native-fast-image';

import { useTheme } from '../../hooks/useTheme';
import { BOLD, fontFamilySemiBold, MEDIUM, SEMI_BOLD } from '../../theme/typography';
import { back_ic } from '../../helper/ImageAssets';
import FuturesTrade from './FuturesTrade';
import OptionsTrade from './OptionsTrade/OptionsTrade';
import { AppText } from '../../common';

const Tab = createMaterialTopTabNavigator();
const { width } = Dimensions.get('window');

const CustomTabBar = ({ state, descriptors, navigation, position, themeColors, isDark }) => {
  const iconTint = isDark ? themeColors.text : "#222";

  return (
    <View style={[styles.tabBarContainer, { backgroundColor: themeColors.background }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <FastImage
          source={back_ic}
          style={styles.backIcon}
          tintColor={iconTint}
          resizeMode="contain"
        />
      </TouchableOpacity>

      <View style={styles.tabsWrapper}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
                ? options.title
                : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={index}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              style={[
                styles.tabItem,
                index !== state.routes.length - 1 && { marginRight: 5 }
              ]}
            >
              <AppText
                style={{
                  color: isFocused ? themeColors.text : themeColors.secondaryText,
                  fontSize: 16,
                  fontFamily: fontFamilySemiBold
                }}
              >
                {label}
              </AppText>
              <View style={[styles.activeIndicator, { backgroundColor: isFocused ? themeColors.text : "transparent" }]} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const FuturesNavigator = () => {
  const { colors: themeColors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background, paddingTop: insets.top }}>
      <Tab.Navigator
        tabBar={props => <CustomTabBar {...props} themeColors={themeColors} isDark={isDark} />}
        screenOptions={{
          swipeEnabled: false,
          lazy: false,
          animationEnabled: false,
          sceneContainerStyle: { backgroundColor: themeColors.background },
        }}
      >
        <Tab.Screen name="Futures" component={FuturesTrade} />
        <Tab.Screen name="Options" component={OptionsTrade} />
      </Tab.Navigator>
    </View>
  );
};

export default FuturesNavigator;

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // paddingHorizontal: 5,
    paddingTop: 10,
    paddingBottom: 5,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  tabsWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    paddingLeft: 5,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  activeIndicator: {
    height: 3,
    width: 18,
    borderRadius: 2,
  },
});
