import React from "react";
import {
  View,
  TextInput,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
} from "react-native";
import { searchIcon } from "../../helper/ImageAssets";
import { TouchableOpacity } from "react-native-gesture-handler";
import { AppText, FOURTEEN, MEDIUM, SEMI_BOLD, SIXTEEN, THIRTEEN, TWELVE } from "../../shared";
import FastImage from "react-native-fast-image";
import { colors, darkTheme, lightTheme } from "../../theme/colors";
import NavigationService from "../../navigation/NavigationService";
import { SEARCH_SCREEN } from "../../navigation/routes";
import { useTheme } from "../../hooks/useTheme";
import { fontFamilyMedium, fontFamilySemiBold } from "../../theme/typography";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const H_PAD = Math.max(14, SCREEN_WIDTH * 0.04);

const TABS = [
  { key: "Favorites", label: "Favorites" },
  { key: "Spot", label: "Spot" },
  { key: "Cryptos", label: "Cryptos" },
  { key: "USD_M_FUTURES", label: "USDⓈ-M Futures" },
  { key: "OPTIONS", label: "Options" },
];

const formatSubCategoryLabel = (key) => {
  if (!key || key === "All") return "All";
  return String(key)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const MarketHeader = ({
  activeTab,
  setActiveTab,
  search,
  onSearchChange,
  showSearch,
  showSubTabs = false,
  subTabItems,
  subCategories = [],
  activeSubCategory = "All",
  onSubCategoryChange,
}) => {
  const { colors: themeColors, isDark } = useTheme();

  const textColor = themeColors.text;
  const placeholderColor = '#9e9fa3';
  const tabInactiveColor = themeColors.secondaryText;

  const scrollRef = React.useRef(null);
  const tabLayoutsRef = React.useRef({});
  const underlineLeft = React.useRef(new Animated.Value(0)).current;
  const underlineWidth = React.useRef(new Animated.Value(0)).current;

  const animateUnderlineTo = React.useCallback(
    (key, animated = true) => {
      const layout = tabLayoutsRef.current?.[key];
      if (!layout) return;

      const tabX = layout.x ?? 0;
      const tabW = Math.max(0, layout.width ?? 0);
      // shorter underline, centered under selected tab
      const lineW = Math.max(10, tabW * 0.55);
      const toLeft = tabX + Math.max(0, (tabW - lineW) / 2);
      const toW = lineW;

      if (animated) {
        Animated.parallel([
          Animated.timing(underlineLeft, { toValue: toLeft, duration: 180, useNativeDriver: false }),
          Animated.timing(underlineWidth, { toValue: toW, duration: 180, useNativeDriver: false }),
        ]).start();
      } else {
        underlineLeft.setValue(toLeft);
        underlineWidth.setValue(toW);
      }

      scrollRef.current?.scrollTo?.({ x: Math.max(0, tabX - H_PAD), animated: true });
    },
    [underlineLeft, underlineWidth]
  );

  React.useEffect(() => {
    animateUnderlineTo(activeTab, true);
  }, [activeTab, animateUnderlineTo]);

  // First mount: once layouts come in, snap underline to active tab.
  React.useEffect(() => {
    const id = requestAnimationFrame(() => animateUnderlineTo(activeTab, false));
    return () => cancelAnimationFrame(id);
  }, [activeTab, animateUnderlineTo]);

  return (
    <View style={[styles.wrapper, { backgroundColor: themeColors.background }]}>
      {/* Search bar - full width, reference style */}
      {showSearch && (
        <View style={[styles.searchBar, { backgroundColor: isDark ? darkTheme.darkThemeInputColor : '#F4F4F4', borderColor: 'transparent', borderWidth: 0.8 }]}>
          <FastImage
            source={searchIcon}
            resizeMode="contain"
            style={styles.searchIcon}
            tintColor={placeholderColor}
          />
          <TextInput
            style={[styles.searchInput, { color: textColor, fontSize: 14, fontFamily: fontFamilySemiBold }]}
            placeholder="Search Coins"
            placeholderTextColor={placeholderColor}
            value={search}
            onChangeText={onSearchChange}
            returnKeyType="search"
          />
        </View>
      )
      }

      {
        !showSearch && (
          <TouchableOpacity
            onPress={() => NavigationService.navigate(SEARCH_SCREEN)}
            style={[styles.searchBar, { backgroundColor: themeColors.card, }]}
          >
            <FastImage source={searchIcon} resizeMode="contain" style={styles.searchIcon} tintColor={placeholderColor} />
            <AppText weight={SEMI_BOLD} type={FOURTEEN} style={[styles.searchPlaceholder, { color: placeholderColor }]}>Search Coins</AppText>
          </TouchableOpacity>
        )
      }

      {/* Primary tabs - yellow underline for selected */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        ref={scrollRef}
        contentContainerStyle={styles.tabsScroll}
        style={[styles.tabsRow, {
          borderBottomColor: 'transparent',
        }]}
      >
        <View style={styles.tabsInner}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.underline,
              {
                backgroundColor: themeColors.button,
                left: underlineLeft,
                width: underlineWidth,
              },
            ]}
          />

          {TABS.map(({ key, label }) => {
            const isActive = activeTab === key;
            return (
              <View
                key={key}
                onLayout={(e) => {
                  tabLayoutsRef.current[key] = e.nativeEvent.layout;
                  if (key === activeTab) animateUnderlineTo(key, false);
                }}
                style={{ right: 5 }}
              >
                <TouchableOpacity onPress={() => setActiveTab(key)} style={[styles.tab,
                isActive && styles.tabActive]} activeOpacity={0.8}>
                  <AppText
                    type={SIXTEEN}
                    weight={SEMI_BOLD}
                    style={[
                      styles.tabLabel,
                      { color: isActive ? textColor : tabInactiveColor },
                      isActive && styles.tabLabelActive,
                    ]}
                  >
                    {label}
                  </AppText>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {
        showSubTabs && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subTabsScroll}
            style={styles.subTabsRow}
          >
            {(Array.isArray(subTabItems) && subTabItems.length > 0
              ? subTabItems
              : ["All", ...(Array.isArray(subCategories) ? subCategories : [])].map((k) => ({
                key: k,
                label: formatSubCategoryLabel(k),
              }))).map((it) => {
                const isActive = activeSubCategory === it.key;
                return (
                  <TouchableOpacity
                    key={it.key}
                    activeOpacity={0.85}
                    onPress={() => onSubCategoryChange?.(it.key)}
                    style={[
                      styles.subTabChip,
                      {
                        // backgroundColor: isActive ? isDark ? colors.cyanTheme : '#F4F4F4' : "transparent",
                        borderColor: "transparent",
                      },
                    ]}
                  >
                    <AppText weight={MEDIUM} type={TWELVE} style={[styles.subTabText, { color: isActive ? colors.cyanTheme : '#84888C' }]}>
                      {it.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
          </ScrollView>
        )
      }
    </View >
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: H_PAD,
    paddingTop: 12,
    paddingBottom: 0,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    height: 42,
    paddingHorizontal: 10,
    marginBottom: 5,
  },
  searchIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
    fontFamily: fontFamilySemiBold,
  },
  searchPlaceholder: {
    fontSize: 14,
  },
  tabsRow: {
    maxHeight: 44,
    borderBottomWidth: 0.7,

  },
  tabsScroll: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 14,
  },
  tabsInner: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tabActive: {},
  tabLabel: {
  },
  tabLabelActive: {
    fontWeight: "700",
  },
  underline: {
    position: "absolute",
    bottom: 0,
    height: 2,
    borderRadius: 1,
    zIndex: 10,
  },
  subTabsRow: {
    marginTop: 8,
    maxHeight: 34,
  },
  subTabsScroll: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
  },
  subTabChip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  subTabText: {
  },
});

export default MarketHeader;
