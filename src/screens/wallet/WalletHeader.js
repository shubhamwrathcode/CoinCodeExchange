import { View, ScrollView, TouchableOpacity as RNTouchableOpacity } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { AppText, BOLD, FIFTEEN } from "../../shared";
import { colors } from "../../theme/colors";
import { useState, useRef } from "react";
import { back_ic } from "../../helper/ImageAssets";
import FastImage from "react-native-fast-image";
import { useTheme } from "../../hooks/useTheme";

const WalletHeader = ({ routes = [], activeTab, setActiveTab }) => {
  const { colors: themeColors, theme, isDark } = useTheme();
  const scrollRef = useRef(null);
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  const maxOffset = Math.max(contentWidth - layoutWidth, 0);
  const threshold = 5;
  const canScrollLeft = scrollX > threshold;
  const canScrollRight =
    maxOffset > threshold && scrollX < maxOffset - threshold;

  const handleScroll = (e) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    setScrollX(offsetX);
  };

  const handleLayout = (e) => {
    const width = e.nativeEvent.layout.width;
    setLayoutWidth(width);
  };

  const handleContentSizeChange = (w) => {
    setContentWidth(w);
  };

  const scrollToEdge = (direction) => {
    if (!scrollRef.current) return;
    const x = direction === "right" ? maxOffset : 0;
    scrollRef.current.scrollTo({ x, animated: true });
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        backgroundColor: themeColors.background
      }}
    >
      {canScrollLeft && (
        <RNTouchableOpacity
          activeOpacity={0.7}
          style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => scrollToEdge("left")}
        >
          <FastImage
            source={back_ic}
            resizeMode="contain"
            style={{
              width: 15,
              height: 15,
              bottom: 3
            }}
            tintColor={theme !== "Dark" ? colors.black : colors.white}
          />
        </RNTouchableOpacity>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 4,
          alignItems: "center",
        }}
        style={{ flex: 1 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onLayout={handleLayout}
        onContentSizeChange={(w) => handleContentSizeChange(w)}
      >
        {(routes || []).map((r) => {
          const isActive = activeTab === r.key;
          return (
            <TouchableOpacity
              key={r.key}
              onPress={() => setActiveTab(r.key)}
              style={{ marginHorizontal: 14, alignItems: "center" }}
            >
              <AppText
                weight={BOLD}
                type={FIFTEEN}
                style={{ color: isActive ? isDark ? colors.white : colors.buttonBg : themeColors.secondaryText }}
              >
                {r.title}
              </AppText>
              <View
                style={{
                  marginTop: 6,
                  height: 3,
                  width: 22,
                  borderRadius: 2,
                  backgroundColor: isActive ? isDark ? colors.white : colors.buttonBg : "transparent",
                }}
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Right scroll icon (show when can scroll right) */}
      {canScrollRight && (
        <RNTouchableOpacity
          activeOpacity={0.7}
          style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => scrollToEdge("right")}
        >
          <FastImage
            source={back_ic}
            resizeMode="contain"
            style={{
              width: 15,
              height: 15,
              bottom: 3,
              transform: [{ rotateX: "180deg" }, { rotateZ: "3.2rad" }],
            }}
            tintColor={theme !== "Dark" ? colors.black : colors.white}
          />
        </RNTouchableOpacity>
      )}
    </View>
  );
};

export default WalletHeader;
