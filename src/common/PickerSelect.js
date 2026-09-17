import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  FlatList,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { AppText, SEMI_BOLD, THIRTEEN, WHITE } from './AppText';
import { fontFamilySemiBold } from '../theme/typography';
import FastImage from 'react-native-fast-image';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const OPTION_HEIGHT = 52;
const MODAL_HEADER_HEIGHT = 76;

const PickerSelect = ({ data = [], onSelect, selected, placeholder, style, label, theme, flag, compact }) => {
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Find the selected item from data array to get its flag
  const selectedItem = data.find(item => item?.value === selected);

  // Sheet height = content only (header + list), capped by max
  const listHeight = Math.min(data.length * OPTION_HEIGHT, SCREEN_HEIGHT * 0.5);
  const bottomPadding = Platform.OS === 'ios' ? 34 : 20;
  const sheetHeight = MODAL_HEADER_HEIGHT + listHeight + bottomPadding;

  useEffect(() => {
    if (visible) {
      // Animate modal sliding up and backdrop fading in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate modal sliding down and backdrop fading out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSelect = (item) => {
    onSelect(item);
    setVisible(false);
  };

  const handleClose = () => {
    setVisible(false);
  };

  return (
    <View >
      {label && <AppText style={styles.title} weight={SEMI_BOLD} type={THIRTEEN}>{label}</AppText>}
      <TouchableOpacity
        style={[styles.dropdown, style, { backgroundColor: theme === "Dark" ? colors.themeElevationColor : undefined }]}
        onPress={() => setVisible(true)}
      >
        {flag && selectedItem?.flag && (
          <View style={styles.selectedFlagContainer}>
            <AppText style={styles.selectedFlag}>{selectedItem.flag}</AppText>
          </View>
        )}
        <AppText style={styles.selectedText} numberOfLines={1}>{selectedItem?.label || selectedItem?.value || selected || placeholder}</AppText>
      </TouchableOpacity>

      <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleClose}
        >
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: backdropOpacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.modalContent,
              {
                height: sheetHeight,
                transform: [{ translateY: slideAnim }],
                backgroundColor: theme === "Dark" ? colors.themeElevationColor : "#FFFFFF",
              },
            ]}
          >
            <TouchableWithoutFeedback
              onPress={() => {}}
            >
              <View style={styles.modalInner}>
              {/* Handle bar */}
              {/* <View style={styles.handleContainer}>
                <View style={[styles.handleBar, { backgroundColor: theme === "Dark" ? "#3A3A3E" : "#E0E0E0" }]} />
              </View> */}

              {/* Header */}
              <View style={styles.modalHeader}>
                <AppText 
                  style={[styles.modalTitle, { color: theme === "Dark" ? "#FFFFFF" : "#000000" }]} 
                  weight={SEMI_BOLD} 
                  type={THIRTEEN}
                >
                  Select Country
                </AppText>
              </View>

              {/* Options List */}
              <FlatList
                data={data}
                style={{ height: listHeight }}
                keyExtractor={(item, index) => (item?.value ?? item?.id ?? index).toString()}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    onPress={() => handleSelect(item?.value)}
                    style={[
                      styles.option,
                      index === data.length - 1 && styles.lastOption,
                      selected === item?.value && styles.selectedOption,
                      { 
                        backgroundColor: selected === item?.value 
                          ? (theme === "Dark" ? "rgba(255,255,255,0.08)" : "#F5F5F5") 
                          : 'transparent' 
                      }
                    ]}
                  >
                    {item?.flag && (
                      <View style={styles.flagContainer}>
                        <AppText style={styles.flag}>{item?.flag}</AppText>
                      </View>
                    )}
                    <AppText 
                      style={[
                        styles.optionText,
                        { color: theme === "Dark" ? "#FFFFFF" : "#000000" }
                      ]}
                      numberOfLines={1}
                    >
                      {item?.label || item?.value}
                    </AppText>
                    {selected === item?.value && (
                      <View style={styles.checkmark}>
                        <AppText style={styles.checkmarkText}>✓</AppText>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
              </View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default PickerSelect;

const styles = StyleSheet.create({
    dropdown: {
      borderWidth: 1,
      borderColor: '#ccc',
      padding: 12,
      height: 52,
      borderRadius: 8,
      flexDirection: "row",
      alignItems: "center",
      // backgroundColor: colors.inputBackground,
    },
    selectedFlagContainer: {
      marginRight: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectedFlag: {
      fontSize: 18,
      bottom:3
    },
    selectedText: {
      flex: 1,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: -4,
      },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 16,
      ...Platform.select({
        ios: {
          paddingBottom: 34, // Safe area for iOS
        },
        android: {
          paddingBottom: 20,
        },
      }),
    },
    modalInner: {
      flex: 1,
    },
    handleContainer: {
      alignItems: 'center',
      paddingTop: 12,
      paddingBottom: 8,
    },
    handleBar: {
      width: 40,
      height: 4,
      borderRadius: 2,
    },
    modalHeader: {
      paddingHorizontal: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0, 0, 0, 0.1)',
      marginTop:20
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    listContent: {
      paddingBottom: 10,
    },
    option: {
      paddingVertical: 16,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 0.5,
      borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    },
    lastOption: {
      borderBottomWidth: 0,
    },
    selectedOption: {
      borderLeftWidth: 3,
      borderLeftColor: '#007AFF',
    },
    flagContainer: {
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    flag: {
      fontSize: 22,
    },
    optionText: {
      flex: 1,
      fontSize: 14,
    },
    checkmark: {
      width: 20,
      height: 20,
      borderRadius: 12,
      backgroundColor: colors.buttonBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },
    checkmarkText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: 'bold',
    },
    title: {
      marginTop: 15,
      // fontWeight: fontFamilySemiBold
    },
  });
  
