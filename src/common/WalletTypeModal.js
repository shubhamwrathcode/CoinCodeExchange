import React, { useEffect } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { useTheme } from '../hooks/useTheme';
import { AppText, BOLD, SEMI_BOLD } from './AppText';
import FastImage from 'react-native-fast-image';
import { closeIcon, checkIcon, checkIc } from '../helper/ImageAssets';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const AnimatedView = Animated.createAnimatedComponent(View);

const formatWalletName = (name) => {
  if (!name) return "";
  const lower = name.toLowerCase();
  if (lower === "spot") return "Spot Wallet";
  if (lower === "main") return "Main Wallet";
  if (lower === "funding") return "Funding Wallet";
  if (lower === "futures") return "Futures Wallet";
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() + " Wallet";
};

const WalletTypeModal = ({ visible, data, onSelect, onClose, selectedItem }) => {
  const { colors: themeColors, isDark } = useTheme();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 160 });
      translateY.value = withSpring(0, {
        damping: 18,
        stiffness: 180,
      });
    } else {
      opacity.value = withTiming(0, { duration: 120 });
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 180 });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => {
    const translate = interpolate(
      translateY.value,
      [0, SCREEN_HEIGHT],
      [0, SCREEN_HEIGHT],
      Extrapolate.CLAMP
    );
    return {
      transform: [{ translateY: translate }],
    };
  });

  const handleClose = () => {
    opacity.value = withTiming(0, { duration: 120 });
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 180 });
    setTimeout(() => {
      onClose();
    }, 180);
  };

  const handleSelectItem = (item) => {
    onSelect(item);
    handleClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <AnimatedView style={[styles.overlay, backdropStyle]}>
          <TouchableWithoutFeedback onPress={() => { }}>
            <AnimatedView
              style={[
                styles.modalContent,
                modalStyle,
                { backgroundColor: themeColors.background },
              ]}
            >
              <View style={styles.header}>
                <AppText
                  style={[
                    styles.title,
                    { color: themeColors.text },
                  ]}
                  weight={BOLD}
                >
                  Select Wallet Type
                </AppText>
                <TouchableOpacity
                  onPress={handleClose}
                  style={[
                    styles.closeButton,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(0,0,0,0.05)',
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <FastImage
                    source={closeIcon}
                    resizeMode="contain"
                    style={{ width: 15, height: 15 }}
                    tintColor={themeColors.text}
                  />
                </TouchableOpacity>
              </View>

              <FlatList
                data={data || []}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => {
                  const isSelected = selectedItem?.toLowerCase() === item?.toLowerCase();
                  return (
                    <TouchableOpacity
                      style={[
                        styles.item,
                        {
                          borderBottomColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#EEEEEE",
                        },
                      ]}
                      onPress={() => handleSelectItem(item)}
                      activeOpacity={0.7}
                    >
                      <AppText
                        style={[
                          styles.itemText,
                          { color: isSelected ? themeColors.button : (isDark ? colors.white : colors.black) },
                        ]}
                        weight={isSelected ? BOLD : SEMI_BOLD}
                      >
                        {formatWalletName(item)}
                      </AppText>
                      {isSelected && (
                        <FastImage
                          source={checkIc}
                          style={{ width: 16, height: 16 }}
                          resizeMode="contain"
                        />
                      )}
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            </AnimatedView>
          </TouchableWithoutFeedback>
        </AnimatedView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
    maxHeight: SCREEN_HEIGHT * 0.65,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    paddingHorizontal: 5
  },
  itemText: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  }
});

export default WalletTypeModal;
