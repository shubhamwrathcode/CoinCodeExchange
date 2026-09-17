import React, { useEffect } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import FastImage from "react-native-fast-image";
import moment from "moment";
import { AppText } from "..";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { newsImg } from "../../helper/ImageAssets";
import NavigationService from "../../navigation/NavigationService";
import { NOTIFICATION_SCREEN } from "../../navigation/routes";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { getNotificationList } from "../../actions/homeActions";

export const LatestNews = () => {
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const rawList = useAppSelector((state) => state.home.notificationList);
  const notificationRows = Array.isArray(rawList) ? rawList : [];

  useEffect(() => {
    if (notificationRows.length === 0) {
      dispatch(
        getNotificationList({ page: 1, limit: 10, skipGlobalLoader: true })
      );
    }
  }, [dispatch, notificationRows.length]);

  const displayItems =
    notificationRows.length > 0
      ? notificationRows.slice(0, 4)
      : [
          {
            id: "1",
            date: "05-25 04:05",
            title: "Exclusive Soon Token Savings Promotions Launch",
          },
          {
            id: "2",
            date: "05-25 04:05",
            title: "Complete KYC & Unlock All Crypto Trading Features",
          },
          {
            id: "3",
            date: "05-25 04:05",
            title: "Earn Up To 12.5% APY On Staking Assets",
          },
        ];

  const formatDate = (iso) => {
    if (!iso) return moment().format("MM-DD HH:mm");
    const m = moment(iso);
    if (!m.isValid()) return String(iso);
    return m.format("MM-DD HH:mm");
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <FastImage
            source={newsImg}
            style={{ width: 20, height: 20 }}
            resizeMode={FastImage.resizeMode.contain}
          />
          <AppText
            style={{
              color: isDark ? colors.white : themeColors.text,
              fontSize: 15,
              fontFamily: fonts.semiBold,
              marginLeft: 8,
            }}
          >
            Latest News
          </AppText>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => NavigationService.navigate(NOTIFICATION_SCREEN)}
        >
          <AppText
            style={{
              color: colors.cyan,
              fontSize: 13,
              fontFamily: fonts.medium,
            }}
          >
            View All →
          </AppText>
        </TouchableOpacity>
      </View>

      {/* List */}
      <View style={styles.list}>
        {displayItems.map((news, idx) => {
          const dateStr = news.createdAt || news.created_at || news.date;
          const titleStr =
            news.title || news.message || "New Notification Available";
          return (
            <TouchableOpacity
              key={news._id || news.id || String(idx)}
              style={styles.newsItem}
              activeOpacity={0.7}
              onPress={() => NavigationService.navigate(NOTIFICATION_SCREEN)}
            >
              <AppText
                style={{
                  color: colors.darkShadeColorText || "#9CA3AF",
                  fontSize: 12,
                  fontFamily: fonts.regular,
                }}
              >
                {formatDate(dateStr)}
              </AppText>
              <AppText
                style={{
                  color: isDark ? colors.white : themeColors.text,
                  fontSize: 12,
                  fontFamily: fonts.regular,
                  flex: 1,
                  marginLeft: 12,
                }}
                numberOfLines={1}
              >
                {titleStr}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default LatestNews;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  list: {
    gap: 16,
  },
  newsItem: {
    flexDirection: "row",
    alignItems: "center",
  },
});
