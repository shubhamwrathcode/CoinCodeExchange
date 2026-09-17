import React from 'react';
import { StyleSheet, View } from 'react-native';
import TouchableOpacityView from './TouchableOpacityView';
import FastImage from 'react-native-fast-image';
import {
  LOCKED,
  back_ic,
  history,
  starFillIcon,
  starIcon,
} from '../helper/ImageAssets';
import { universalPaddingHorizontalHigh } from '../theme/dimens';
import NavigationService from '../navigation/NavigationService';
import { AppText, EIGHTEEN, SEMI_BOLD, SIXTEEN } from './AppText';
import {
  CONVERT_HISTORY_SCREEN,
  HOME_SCREEN,
  LAKED_STAKING,
  NAVIGATION_BOTTOM_TAB_STACK,
  NAVIGATION_TRADE_STACK, TRADE_SCREEN
} from '../navigation/routes';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setP2P } from '../slices/homeSlice';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';

interface ToolbarProps {
  isLogo?: boolean;
  isSecond?: boolean;
  title?: string;
  isThird?: boolean;
  isFavorite?: boolean;
  onAdd?: () => void;
  isFourth?: boolean;
  isFifth?: boolean;
  onFifthPress?: () => void;
  isLock?: boolean;
  isCommit?: boolean;
  isStake?: boolean;
  isLogin?: boolean;
  style?: any;
}
import { useTheme } from '../hooks/useTheme';

const Toolbar = ({
  isLogo = true,
  isSecond,
  title,
  isThird,
  isStake,
  isFavorite,
  onAdd,
  isFourth,
  isFifth,
  onFifthPress,
  isCommit,
  isLogin,
  style,
  isLock = false,
}: ToolbarProps) => {
  const { colors: themeColors, isDark } = useTheme();
  const p2p = useAppSelector(state => state.home.p2p);
  const theme = useAppSelector(state => state.auth.theme);
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  return (
    <View
      style={[
        styles.container,
        style
        // {justifyContent: isLogo || isSecond ? 'center' : 'flex-start'},
      ]}>
      {!isLogin && <TouchableOpacityView
        style={
          isLogo || isSecond ? styles.backContainer : styles.backContainer2
        }
        onPress={() =>
          NavigationService.goBack()
        }>
        <FastImage
          source={back_ic}
          style={styles.backIcon}
          resizeMode="contain"
          tintColor={themeColors.text}
        />
      </TouchableOpacityView>}

      {/*  */}
      {isSecond && (
        <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={[styles.title, { color: themeColors.text }]}>
          {title}
        </AppText>
      )}

      {isThird && (
        <TouchableOpacityView onPress={onAdd} style={styles.starContainer}>
          <FastImage
            source={isFavorite ? starFillIcon : starIcon}
            resizeMode="contain"
            style={styles.star}
          />
        </TouchableOpacityView>
      )}
      {isFourth && (
        <TouchableOpacityView
          activeOpacity={0.5}
          style={styles.starContainer}
          onPress={() => NavigationService.navigate(CONVERT_HISTORY_SCREEN)}>
          <FastImage
            resizeMode="contain"
            source={history}
            style={styles.star}
          />
        </TouchableOpacityView>
      )}
      {isLock && (
        <TouchableOpacityView
          activeOpacity={0.5}
          style={styles.starContainer}
          onPress={() => NavigationService.navigate(LAKED_STAKING)}>
          <FastImage
            resizeMode="contain"
            source={LOCKED}
            style={{ right: 35, width: 25, height: 25 }}
          />
        </TouchableOpacityView>
      )}
      {isFifth && (
        <TouchableOpacityView
          activeOpacity={0.5}
          style={styles.starContainer}
          onPress={onFifthPress}>
          <FastImage
            resizeMode="contain"
            source={history}
            style={styles.star}
          />
        </TouchableOpacityView>
      )}
    </View>
  );
};

export { Toolbar };
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    // alignItems: 'center',
    // width: "72%",
    justifyContent: "space-between",
    // backgroundColor: "#111111"
    // paddingTop: Platform.OS === 'android' ? 40  : 40,
  },
  backContainer: {
    // position: 'absolute',
    // top: Platform.OS === 'ios' ? 30 : 22,
    padding: universalPaddingHorizontalHigh,
    // left: 0,
  },
  backContainer2: {
    padding: universalPaddingHorizontalHigh,
    flexDirection: "row",

  },
  backIcon: {
    height: 16,
    width: 16,
    // marginTop: 20
  },
  mainLogo: {
    height: 50,
    width: 120,
    marginTop: 4,
  },
  title: {
    marginTop: 18,
  },
  star: {
    height: 25,
    width: 25,
  },
  starContainer: {
    position: 'absolute',
    top: 15,
    padding: universalPaddingHorizontalHigh,
    right: 0,
  },
});
