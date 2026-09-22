import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Animated, StyleSheet, Easing } from 'react-native';

const ToggleSwitch = ({ value, onValueChange, isDark, activeColor }) => {
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: 200,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, [value]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  const onColor = activeColor || '#0AA8C5';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      onPress={() => onValueChange && onValueChange(!value)}
      style={[
        styles.customSwitchTrack,
        {
          backgroundColor: value
            ? onColor
            : (isDark ? '#2B2F38' : '#D1D5DB'),
        }
      ]}
    >
      <Animated.View
        style={[
          styles.customSwitchThumb,
          {
            transform: [{ translateX }],
            backgroundColor: '#FFFFFF',
          }
        ]}
      />
    </TouchableOpacity>
  );
};

export default ToggleSwitch;

const styles = StyleSheet.create({
  customSwitchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    position: 'relative',
    justifyContent: 'center',
    padding: 2,
  },
  customSwitchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    left: 2,
    top: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
});
