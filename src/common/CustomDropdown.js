import React, { useState, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { colors, darkTheme } from '../theme/colors';
import { AppText, ELEVEN, SEMI_BOLD, THIRTEEN, FOURTEEN, FIFTEEN, MEDIUM } from './AppText';
import FastImage from 'react-native-fast-image';
import { DOWN_ARROW, downIcon, tick } from '../helper/ImageAssets';
import { useTheme } from '../hooks/useTheme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const CustomDropdown = ({
  data = [],
  onSelect,
  selected,
  compact = false,
  triggerStyle,
  icon,
  isOpen,
  onToggle,
  innerDropDownStyle = {},
  dropdownStyle = {},
  dropdownWidth,
  flatListStyle = {},
  align = 'left',
}) => {
  const { colors: themeColors, isDark } = useTheme();
  const [visible, setVisible] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef(null);

  const isControlled = isOpen !== undefined;
  const isVisible = isControlled ? isOpen : visible;

  const handleSelect = (item) => {
    onSelect(item);
    if (isControlled) {
      onToggle && onToggle(false);
    } else {
      setVisible(false);
    }
  };

  const openDropdown = () => {
    if (isControlled) {
      onToggle && onToggle(!isOpen);
    } else {
      setVisible((prev) => !prev);
    }
  };

  const isPlaceholder = !selected || selected.toLowerCase().includes("select");
  const alignStyle = align === 'right' ? { right: 0, left: undefined } : { left: 0, right: undefined };

  return (
    <View style={{ zIndex: isVisible ? 999 : 1 }}>
      <TouchableOpacity
        ref={buttonRef}
        style={[
          styles.dropdownTrigger,
          compact && styles.dropdownTriggerCompact,
          compact
            ? {
              backgroundColor: themeColors.input,
              borderColor: themeColors.themeBorderColor,
              borderWidth: 1,
            }
            : {
              backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
              borderColor: themeColors.border,
              borderWidth: 1,
            },
          triggerStyle,
        ]}
        onPress={openDropdown}
        activeOpacity={0.8}
      >
        <AppText
          type={compact ? THIRTEEN : FIFTEEN}
          weight={MEDIUM}
          style={{
            flex: 1,
            color: isPlaceholder ? themeColors.secondaryText : themeColors.text,
            ...(compact ? { fontSize: 13 } : null),
          }}
        >
          {selected || 'Select option'}
        </AppText>
        <FastImage
          source={icon || downIcon}
          style={[
            compact ? styles.arrowCompact : styles.arrow,
            { transform: [{ rotate: isVisible ? '180deg' : '0deg' }] },
          ]}
          tintColor={themeColors.secondaryText}
          resizeMode='contain'
        />
      </TouchableOpacity>

      {isVisible && (
        <View
          style={[
            styles.inlineContent,
            alignStyle,
            {
              backgroundColor: isDark ? colors.newThemeColor : (isDark ? darkTheme.darkThemeInputColor : "#FFFFFF"),
              borderColor: themeColors.border,
            },
            dropdownWidth ? { width: dropdownWidth, minWidth: dropdownWidth } : null,
            dropdownStyle,
          ]}
        >
          <FlatList
            data={data}
            keyExtractor={(item, index) => index.toString()}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            style={flatListStyle}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                onPress={() => handleSelect(item)}
                style={[
                  styles.option,
                  compact && styles.optionCompact,
                  { borderBottomColor: themeColors.border },
                  innerDropDownStyle,
                  index === data.length - 1 && { borderBottomWidth: 0 }
                ]}
              >
                <AppText
                  type={compact ? THIRTEEN : FOURTEEN}
                  style={{ color: themeColors.text }}
                  weight={selected === item ? SEMI_BOLD : MEDIUM}
                >
                  {item}
                </AppText>
                {selected === item && (
                  <FastImage source={tick} style={{ width: 12, height: 12 }} resizeMode="contain" tintColor={themeColors.button} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
};

export default CustomDropdown;

const styles = StyleSheet.create({
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 8,
  },
  dropdownTriggerCompact: {
    minHeight: 28,
    height: 28,
    paddingHorizontal: 8,
    paddingVertical: 0,
    borderRadius: 6,
  },
  arrow: {
    width: 10,
    height: 10,
  },
  arrowCompact: {
    width: 8,
    height: 8,
    marginLeft: 4,
  },
  inlineContent: {
    position: 'absolute',
    top: '100%',
    left: 0,
    minWidth: '100%',
    zIndex: 9999,
    elevation: 6,
    maxHeight: 250,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionCompact: {
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
});
