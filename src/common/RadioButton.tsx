import React from 'react';
import TouchableOpacityView from './TouchableOpacityView';
import {StyleSheet, View} from 'react-native';
import {borderWidth} from '../theme/dimens';
import {colors} from '../theme/colors';

const RadioButton = ({value, onChange,valueStyle}:any) => {
  return (
    <TouchableOpacityView style={styles.container} onPress={onChange}>
      <View
        style={[styles.innerView, value && {backgroundColor: colors.buttonBg,...valueStyle}]}
      />
    </TouchableOpacityView>
  );
};

export {RadioButton};
const styles = StyleSheet.create({
  container: {
    height: 14,
    width: 14,
    borderWidth: borderWidth,
    borderColor: colors.buttonBg,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerView: {
    height: 10,
    width: 10,
    borderRadius: 40,
  },
});
