import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import {
  ImageBackground,
  
  StatusBar,
  StyleSheet,
  View} from 'react-native';
import TouchableOpacityView from './TouchableOpacityView';
import FastImage from 'react-native-fast-image';
import {
  ADD_CARD,
  ARROW_REVERSE,
  BACK_ICON,
  LOCKED,
  back_ic,
  history,
  logo,
  logoTwo,
  p2pBg,
  starFillIcon,
  starIcon,
} from '../helper/ImageAssets';
import {Screen, universalPaddingHorizontalHigh} from '../theme/dimens';
import NavigationService from '../navigation/NavigationService';
import {AppText, BLACK, BOLD, FIFTEEN, SEMI_BOLD, SIXTEEN} from './AppText';
import {
  CONVERT_HISTORY_SCREEN,
  HOME_SCREEN,
  LAKED_STAKING,
  NAVIGATION_BOTTOM_TAB_STACK,
} from '../navigation/routes';
import {useAppDispatch, useAppSelector} from '../store/hooks';
import {setP2P} from '../slices/homeSlice';
import {colors} from '../theme/colors';

interface P2pHeaderProps {
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
  children?:any;
  currencyText?: string;
}

const P2pHeader = ({
  isLogo = true,
  isSecond,
  title,
  isThird,
  isFavorite,
  onAdd,
  isFourth,
  isFifth,
  currencyText,
  onFifthPress,
  children,
  isLock = false,
}: P2pHeaderProps) => {
  const p2p = useAppSelector(state => state.home.p2p);
  const dispatch = useAppDispatch();
  return (
    <SafeAreaView style={{flex: 1}}>
      <StatusBar backgroundColor={colors.newThemeColor} barStyle="light-content" />
      <ImageBackground resizeMode="cover" source={p2pBg} style={{flex: 1}}>
        <View
          style={[
            styles.container,
            {justifyContent: isLogo || isSecond ? 'center' : 'flex-start'},
          ]}>
          <TouchableOpacityView
            style={
              isLogo || isSecond ? styles.backContainer : styles.backContainer2
            }
            onPress={() => {
              if (p2p) {
                  dispatch(setP2P(''))
              }else{
                NavigationService.goBack('')
              }
            }}>
            <FastImage
              source={BACK_ICON}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacityView>
          {isLogo && !isSecond && (
            <FastImage
              source={logoTwo}
              style={styles.mainLogo}
              resizeMode="contain"
            />
          )}
          {isSecond && (
            <AppText
              type={SIXTEEN}
              weight={BOLD}
              color={BLACK}
              style={styles.title}>
              {title}
            </AppText>
          )}

          {isThird && (
            <TouchableOpacityView onPress={onAdd} style={styles.starContainer}>
              <AppText
                type={FIFTEEN}
                weight={SEMI_BOLD}
                color={BLACK}
                style={{top: 2}}>
                {currencyText}
              </AppText>

              <FastImage
                source={ARROW_REVERSE}
                resizeMode="contain"
                style={styles.star}
              />
            </TouchableOpacityView>
          )}
        </View>

        <FastImage
          source={ADD_CARD}
          style={{
            width: Screen.Width,
            height: 120,
            marginTop: 20,
            alignSelf: 'center',
          }}
          resizeMode="center"
        />
        <View style={{marginTop:20}}></View>

        <View
          style={{
            flex: 1,
            backgroundColor:colors.p2pbgColor,
            borderTopLeftRadius: 15,
            borderTopRightRadius: 15,
          }}>
   {children}
          </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

export {P2pHeader};
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    // paddingTop: 20,
  },
  backContainer: {
    position: 'absolute',
    top: 2,
    padding: universalPaddingHorizontalHigh,
    left: 0,
  },
  backContainer2: {
    padding: universalPaddingHorizontalHigh,
  },
  backIcon: {
    height: 16,
    width: 16,
  },

  title: {
    marginTop: 18,
  },
  star: {
    height: 20,
    width: 20,
  },
  starContainer: {
    justifyContent: 'space-between',
    position: 'absolute',
    paddingHorizontal: 10,
    // flex: 1,
    width: 80,
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.black,
    // padding: 0,
    right: 15,
    top: 15,
    alignItems: 'center',
  },
});
