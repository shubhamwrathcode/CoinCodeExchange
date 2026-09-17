import React from 'react';
import { View, ActivityIndicator } from 'react-native';

export const LOADER_MIN_HEIGHT = 300;

const HistorySectionLoader = ({ color }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: LOADER_MIN_HEIGHT, paddingVertical: 40 }}>
    <ActivityIndicator size="large" color={color} />
  </View>
);

export default HistorySectionLoader;
