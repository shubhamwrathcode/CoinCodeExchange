import React, { useState, useMemo, useEffect } from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TouchableWithoutFeedback,
  TextInput,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  FadeIn,
  FadeInDown,
  Layout,
} from "react-native-reanimated";
import { IMAGE_BASE_URL } from "../helper/Constants";
import { AppText, BLACK, BOLD, DISCLAIMTEXT, FOURTEEN, SEMI_BOLD, TEN, TWELVE } from "./AppText";
import FastImage from "react-native-fast-image";
import { toFixedFive } from "../helper/utility";
import { showError } from "../helper/logger";
import { closeIcon, NO_NOTIFICATION_ICON, NO_NOTIFICATION_ICON_LIGHT, searchIcon, checkIcon } from "../helper/ImageAssets";
import { colors, darkTheme } from "../theme/colors";
import { useTheme } from "../hooks/useTheme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedView = Animated.createAnimatedComponent(View);

const CoinListModal = ({ visible, data, onSelect, onClose, disabledCoinId, selectedCoinId }) => {
  const { colors: themeColors, isDark } = useTheme();
  const [searchText, setSearchText] = useState("");
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  // clear search when modal closes
  useEffect(() => {
    if (!visible) {
      setSearchText("");
    }
  }, [visible]);

  // Animate modal appearance
  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 160 });
      translateY.value = withSpring(0, {
        damping: 18,
        stiffness: 180,
      });
      scale.value = withSpring(1, {
        damping: 14,
        stiffness: 180,
      });
    } else {
      opacity.value = withTiming(0, { duration: 120 });
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 180 });
      scale.value = withTiming(0.9, { duration: 120 });
    }
  }, [visible]);

  // filter list based on search text
  const filteredData = useMemo(() => {
    if (!searchText) return data;
    return data.filter(
      (item) =>
        item?.short_name?.toLowerCase().includes(searchText.toLowerCase()) ||
        item?.currency?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [searchText, data]);

  const backdropStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const modalStyle = useAnimatedStyle(() => {
    const translate = interpolate(
      translateY.value,
      [0, SCREEN_HEIGHT],
      [0, SCREEN_HEIGHT],
      Extrapolate.CLAMP
    );
    return {
      transform: [{ translateY: translate }, { scale: scale.value }],
    };
  });

  const handleClose = () => {
    opacity.value = withTiming(0, { duration: 120 });
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 180 });
    scale.value = withTiming(0.9, { duration: 120 });
    setTimeout(() => {
      onClose();
    }, 180);
  };

  const renderCoinItem = ({ item, index }) => {
    const isDisabled = item?.currency_id === disabledCoinId;
    const isSelected = item?.currency_id === selectedCoinId;
    return (
      <AnimatedTouchableOpacity
        entering={FadeInDown.delay(index * 20).duration(300).springify()}
        layout={Layout.springify()}
        activeOpacity={0.8}
        style={[
          styles.coinItem,
          {
            borderBottomColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#EEEEEE",
            opacity: isDisabled ? 0.4 : 1,
          },
        ]}
        onPress={() => {
          if (isDisabled) {
            showError("Already selected in other field.");
            return;
          }
          onSelect(item);
          handleClose();
        }}
      >
        <View style={styles.coinLeft}>
          <FastImage
            source={{
              uri: /^https?:\/\//i.test(String(item?.icon_path || ""))
                ? String(item?.icon_path || "")
                : `${String(IMAGE_BASE_URL || "").replace(/\/+$/, "")}/${String(item?.icon_path || "").replace(/^\/+/, "")}`,
            }}
            style={styles.coinIcon}
            resizeMode="contain"
          />
          <View style={styles.coinInfo}>
            <AppText
              color={isSelected ? themeColors.button : themeColors.text}
              style={styles.coinShortName}
              weight={BOLD}
            >
              {item?.short_name}
            </AppText>
            <AppText
              color={themeColors.secondaryText}
              style={styles.coinCurrency}
              type={TWELVE}
            >
              {item?.currency}
            </AppText>
          </View>
        </View>

        <View style={styles.coinRight}>
          <AppText
            style={[
              styles.coinBalance,
              { color: isSelected ? themeColors.button : themeColors.text }
            ]}
            weight={isSelected ? BOLD : SEMI_BOLD}
            type={FOURTEEN}
          >
            {toFixedFive(item?.balance)}
          </AppText>
        </View>
      </AnimatedTouchableOpacity>
    );
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
                {
                  backgroundColor: themeColors.background,
                },
              ]}
            >
              <View style={styles.header}>
                <AppText
                  style={[
                    styles.title,
                    { color: themeColors.text }
                  ]}
                  weight={BOLD}
                >
                  Select Currency
                </AppText>
                <TouchableOpacity
                  onPress={handleClose}
                  style={[
                    styles.closeButton,
                    {
                      backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <FastImage source={closeIcon} resizeMode="contain" style={{ width: 15, height: 15 }} tintColor={themeColors.text} />
                </TouchableOpacity>
              </View>

              <Animated.View
                entering={FadeInDown.delay(100).duration(400).springify()}
                style={[
                  styles.searchContainer,
                  {
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#F2F4F7",
                    borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "transparent",
                    borderWidth: 1
                  },
                ]}
              >
                <FastImage source={searchIcon} resizeMode="contain"
                  style={{ width: 18, height: 18, marginRight: 8 }}
                  tintColor={isDark ? "rgba(255,255,255,0.4)" : "#98A2B3"} />
                <TextInput
                  placeholder="Search currency..."
                  placeholderTextColor={isDark ? darkTheme.darkThemeInputColor : "#98A2B3"}
                  value={searchText}
                  onChangeText={setSearchText}
                  style={[
                    styles.searchInput,
                    {
                      color: themeColors.text,
                    },
                  ]}
                />
                {searchText.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchText("")}
                    style={styles.clearButton}
                  >
                    <FastImage source={closeIcon}
                      resizeMode="contain"
                      style={{ width: 14, height: 14 }}
                      tintColor={isDark ? "rgba(255,255,255,0.4)" : "#98A2B3"} />
                  </TouchableOpacity>
                )}
              </Animated.View>

              {/* Coin List */}
              {filteredData.length === 0 ? (
                <Animated.View
                  entering={FadeIn.delay(200).duration(300)}
                  style={styles.noResultContainer}
                >
                  <FastImage source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT} resizeMode="contain" style={{ width: 60, height: 60, marginBottom: 16 }}
                    tintColor={isDark ? "rgba(255,255,255,0.1)" : "#EEE"} />
                  <AppText color={themeColors.secondaryText}>No currency found</AppText>
                </Animated.View>
              ) : (
                <FlatList
                  data={filteredData}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={renderCoinItem}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                />
              )}
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
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 32,
    maxHeight: SCREEN_HEIGHT * 0.8,
    width: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 16,
    marginBottom: 20,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  listContent: {
    paddingVertical: 4,
  },
  coinItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  coinLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  coinIcon: {
    width: 28,
    height: 28,
    marginRight: 12,
    borderRadius: 14,
  },
  coinInfo: {
    flex: 1,
  },
  coinShortName: {
    fontSize: 14,
    marginBottom: 1,
    letterSpacing: -0.3,
  },
  coinCurrency: {
    opacity: 0.8,
  },
  coinRight: {
    alignItems: "flex-end",
  },
  coinBalance: {
    letterSpacing: -0.2,
  },
  selectedCheck: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  noResultText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.7,
  },
});

export default CoinListModal;
