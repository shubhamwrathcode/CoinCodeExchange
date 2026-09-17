import FastImage from "react-native-fast-image";
import TouchableOpacityView from "../../shared/components/TouchableOpacityView";
import {
  back_ic,
  bell_ic,
  NO_NOTIFICATION_ICON,
  NO_NOTIFICATION_ICON_LIGHT,
} from "../../helper/ImageAssets";
import {
  AppText,
  BLACK,
  EIGHTEEN,
  NORMAL,
  SEMI_BOLD,
  SIXTEEN,
  YELLOW,
} from "../../shared";
import React, { useState, useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "../../theme/colors";
import NavigationService from "../../navigation/NavigationService";
import {
  MARKET_SCREEN,
  NOTIFICATION_SCREEN,
} from "../../navigation/routes";
import { FlatList } from "react-native-gesture-handler";
import { useAppSelector } from "../../store/hooks";
import moment from "moment";
import { commonStyles } from "../../theme/commonStyles";
import { useTheme } from "../../hooks/useTheme";

const ListEmptyComponent = ({ theme }) => {
  return (
    <View style={commonStyles.center}>
      <FastImage
        source={theme === "Dark" ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT}
        resizeMode="contain"
        style={{ width: 80, height: 80, marginTop: 20 }}
      />
    </View>
  );
};

const HomeCoinList = ({ filterData, activeTabList, hideViewMore = false }) => {
  const theme = useAppSelector(state => state.auth.theme);
  const notificationList = useAppSelector(
    (state) => state.home.notificationList
  );
  const notificationRows = Array.isArray(notificationList) ? notificationList : [];
  const { colors: themeColors, isDark } = useTheme();


  const renderItem = useCallback(({ item }) => {
    return (
      <TouchableOpacityView
        style={{
          flexDirection: "row",
          gap: 10,
          alignItems: "center",
          marginBottom: 15,
          marginHorizontal: 10
        }}
        onPress={() => NavigationService.navigate(NOTIFICATION_SCREEN)}
        activeOpacity={0.7}
      >
        <View
          style={{
            backgroundColor: item?.isSeen ? colors.grey : colors.green,
            width: 15,
            height: 15,
            borderRadius: 50,
            bottom: 5
          }}
        ></View>
        <View>
          <AppText weight={NORMAL} type={SIXTEEN} style={{ color: theme !== "Dark" ? "#000000BF" : colors.buttonBg }}>
            {" "}
            {moment(item?.createdAt).format("lll")}{" "}
          </AppText>
          <AppText color={BLACK} weight={SEMI_BOLD} type={SIXTEEN} style={{ marginLeft: 3 }}>
            {item?.title}
          </AppText>
        </View>
      </TouchableOpacityView>
    );
  }, [theme]);

  const keyExtractor = useCallback(
    (item) => String(item?._id ?? item?.id ?? ""),
    []
  );
  const handleNavigate = () => {
    let tab =
      activeTabList === 0
        ? "Favourite"
        : activeTabList === 1
          ? "Spots"
          : activeTabList === 2 || activeTabList === 3
            ? "Discover"
            : "";
    NavigationService.navigate(MARKET_SCREEN, { tab });
  };
  return (
    <>
      {!hideViewMore && (
        <TouchableOpacityView
          style={{
            flexDirection: "row",
            alignSelf: "center",
            gap: 0,
            alignItems: "center",
            marginTop: activeTabList !== 0 ? 12 : 0,
            marginBottom: 25
          }}
          onPress={handleNavigate}
        >
          <AppText color={YELLOW} type={SIXTEEN}>
            {`View More`}{" "}
          </AppText>
          <FastImage
            source={back_ic}
            resizeMode="contain"
            style={{
              width: 10,
              height: 10,
              transform: [{ rotateX: "360deg" }, { rotateZ: "180deg" }],
            }}
            tintColor={theme !== "Dark" ? colors.buttonBg : colors.buttonDarkBg}
          />
        </TouchableOpacityView>
      )}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginVertical: 15,
          paddingHorizontal: 5
        }}
      >
        <View style={{ flexDirection: "row", gap: 7, alignItems: "center", paddingHorizontal: 5 }}>
          <FastImage
            source={bell_ic}
            resizeMode="contain"
            style={{ width: 18, height: 18 }}
            tintColor={theme === "Dark" ? colors.white : colors.black}
          />
          <AppText color={BLACK} weight={SEMI_BOLD} type={EIGHTEEN}>
            News
          </AppText>
        </View>

        <View
          style={{
            flexDirection: "row",
            gap: 0,
            alignItems: "center",
            marginBottom: 7,
            right: 8
          }}
        >
          <AppText
            color={colors.white}
            type={SIXTEEN}
            onPress={() => NavigationService.navigate(NOTIFICATION_SCREEN)}
          >
            {`More`}{" "}
          </AppText>
          <FastImage
            source={back_ic}
            resizeMode="contain"
            style={{
              width: 10,
              height: 10,
              top: 1,
              transform: [{ rotateX: "360deg" }, { rotateZ: "180deg" }],
            }}
            tintColor={isDark ? colors.white : colors.black}
          />
        </View>
      </View>
      <View style={{ bottom: 5 }}>
        <FlatList
          data={notificationRows}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListEmptyComponent={() => <ListEmptyComponent theme={theme} />}
          contentContainerStyle={commonStyles.flexGrow}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={8}
          windowSize={10}
          getItemLayout={(data, index) => ({
            length: 60,
            offset: 60 * index,
            index,
          })}
        />
        <View style={{ height: 30 }}></View>
      </View>
    </>
  );
};

export default HomeCoinList;

export const styles = StyleSheet.create({
  rawContainer: {
    justifyContent: "space-between",
    width: "100%",
    marginTop: 10,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    width: "47%",
    height: 40,
    borderRadius: 5,
    justifyContent: "space-between",
    // backgroundColor: isDark ? '#2A2A2E' : '#EFEFEF',
  },
});
