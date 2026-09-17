import React from 'react';
import {Alert, Image, Platform, StyleSheet, View} from 'react-native';
import NavigationService from '../navigation/NavigationService';
import {NOTIFICATION_SCREEN, SEARCH_SCREEN} from '../navigation/routes';
import TouchableOpacityView from './TouchableOpacityView';
import FastImage from 'react-native-fast-image';
import {universalPaddingHorizontalHigh} from '../theme/dimens';
import {
  back_ic,
  bell_ic,
  logo,
  searchIcon,
  search_Img,
} from '../helper/ImageAssets';
import {AppText, THIRTY_FOUR, YELLOW} from './AppText';
import Search from '../screens/trades/Search';

interface HeaderProps {
  title?: string;
  backIcon?: boolean;
  isSearch: boolean;
}

const Header = ({title, isSearch,backIcon = true}: HeaderProps) => {
  return (
    <View style={styles.container}>
      {title && (
        <AppText
          type={THIRTY_FOUR}
          color={YELLOW}
          style={[styles.title]}>
          {title}
        </AppText>
      )}

      {!title && (
        <FastImage resizeMode="contain" source={logo} style={styles.logo} />
      )}
      <View style={{flexDirection: 'row', alignItems: 'center'}}>
        {isSearch &&
        <TouchableOpacityView
        onPress={() => {
          NavigationService.navigate(SEARCH_SCREEN);
        }}>
        <FastImage
          resizeMode="contain"
          source={search_Img}
          style={styles.searchIcon}
        />
      </TouchableOpacityView>}
        

        <TouchableOpacityView
          onPress={() => {
            NavigationService.navigate(NOTIFICATION_SCREEN);
          }}>
          <FastImage
            resizeMode="contain"
            source={bell_ic}
            style={styles.notification}
          />
        </TouchableOpacityView>
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 40 : 42,
    paddingHorizontal: universalPaddingHorizontalHigh,
  },
  logo: {
    height: 50,
    width: 120,
    marginLeft: 100
  },
  notification: {
    height: 30,
    width: 30,
    resizeMode: 'contain',
  },
  title: {
    // marginStart: universalPaddingHorizontalHigh,
    marginTop: 30
  },
  searchIcon: {
    height: 30,
    width: 30,
    resizeMode: 'contain',
    marginRight: 10,
  },
});
export {Header};
