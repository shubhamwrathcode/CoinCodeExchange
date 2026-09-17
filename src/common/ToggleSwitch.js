import React from 'react';
import { TouchableOpacity, Animated, Easing, StyleSheet } from 'react-native';

const ToggleSwitch = ({ value, onValueChange, isDark }) => {
  const animatedValue = React.useRef(new Animated.Value(value ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [value]);

  const thumbPosition = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onValueChange(!value)}
      style={[
        styles.customSwitchTrack,
        {
          backgroundColor: value
            ? (isDark ? '#FFFFFF' : '#2A2A2E')
            : (isDark ? '#2A2A2E' : '#E5E5EA'),
        }
      ]}
    >
      <Animated.View
        style={[
          styles.customSwitchThumb,
          {
            left: thumbPosition,
            backgroundColor: value
              ? (isDark ? '#000000' : '#FFFFFF')
              : (isDark ? '#8A8A93' : '#FFFFFF'),
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
  },
  customSwitchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1.5,
    elevation: 2,
  },
});
