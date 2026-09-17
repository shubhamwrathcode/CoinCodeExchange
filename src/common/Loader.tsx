import React from 'react';
import {ActivityIndicator} from 'react-native';
import {colors} from '../theme/colors';

const Loader = () => {
  return <ActivityIndicator size="large" color={colors.buttonBg} />;
};

export {Loader};
