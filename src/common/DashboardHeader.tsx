import React from 'react';
import {StyleSheet, View} from 'react-native';
import NavigationService from '../navigation/NavigationService';
import {
  heightPercentageToDP,
  widthPercentageToDP,
} from '../theme/ResponsiveSize';
import TouchableOpacityView from './TouchableOpacityView';
import FastImage from 'react-native-fast-image';
import {AppText, BOLD, SIXTEEN} from './AppText';
import {
  universalPaddingHorizontal,
  universalPaddingHorizontalHigh,
} from '../theme/dimens';
import {CONVERT_HISTORY_SCREEN} from '../navigation/routes';
import {back_ic, history} from '../helper/ImageAssets';

const DashboardHeader = ({title, isSecond, name}) => {
  const handlepres = () => {
    if (name === 'convertHistory') {
      NavigationService.navigate(CONVERT_HISTORY_SCREEN);
    }
  };
  return (
    <>
      <View
        style={{
          width: '100%',
          height: 55,
          flexDirection: 'row',
          paddingHorizontal: universalPaddingHorizontal,
          justifyContent: isSecond ? 'space-between' : 'flex-start',
        }}>
        <TouchableOpacityView
          activeOpacity={0.5}
          style={styles.container}
          onPress={() => NavigationService.goBack()}>
          <FastImage
            resizeMode="contain"
            source={back_ic}
            style={styles.leftArrow}
          />
        </TouchableOpacityView>

        {isSecond && (
          <TouchableOpacityView
            activeOpacity={0.5}
            style={styles.container2}
            onPress={handlepres}>
            <FastImage
              resizeMode="contain"
              source={history}
              style={styles.leftArrow2}
            />
          </TouchableOpacityView>
        )}
      </View>
      <TouchableOpacityView style={styles.textContainer} activeOpacity={0.7}>
        <AppText weight={BOLD} type={SIXTEEN} style={styles.text}>
          {title}
        </AppText>
      </TouchableOpacityView>
    </>
  );
};
const styles = StyleSheet.create({
  container: {width: '15%', height: 50, justifyContent: 'center'},
  container2: {
    width: '15%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  leftArrow: {
    height: 16,
    width: 16,
    resizeMode: 'contain',
  },
  leftArrow2: {
    height: 16,
    width: 16,
    resizeMode: 'contain',
  },
  textContainer: {
    height: 50,
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    // color: 'white',
    // fontSize: responsiveFontSize(17),
    textAlign: 'center',
  },
});
export default DashboardHeader;
