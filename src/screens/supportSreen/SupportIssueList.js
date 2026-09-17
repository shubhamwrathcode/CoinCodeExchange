import {
  StyleSheet,
  View,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Platform,
  RefreshControl,
} from "react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AppSafeAreaView, AppText, EIGHTEEN, FOURTEEN, SEMI_BOLD, SIXTEEN, THIRTEEN, TWELVE } from "../../shared";
import { useAppSelector } from "../../store/hooks";
import { colors } from "../../theme/colors";
import {
  back_ic,
  NO_NOTIFICATION_ICON,
  NO_NOTIFICATION_ICON_LIGHT,
} from "../../helper/ImageAssets";
import NavigationService from "../../navigation/NavigationService";
import { CREATE_TICKET_SCREEN } from "../../navigation/routes";
import FastImage from "react-native-fast-image";
import { useDispatch } from "react-redux";
import { getUserTickets } from "../../actions/accountActions";
import SupportSkeleton from "./SupportSkeleton";
import moment from "moment";
import { useTheme } from "../../hooks/useTheme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const H_PADDING = Math.max(14, SCREEN_WIDTH * 0.04);

const FILTER_TABS = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "pending", label: "Pending" },
  { id: "closed", label: "Closed" },
];

function tabIdForStatus(status) {
  const x = String(status || "")
    .trim()
    .toLowerCase();
  if (x.includes("pending") || x.includes("progress")) return "pending";
  if (x.includes("closed") || x.includes("resolved")) return "closed";
  if (x.includes("open")) return "open";
  return "open";
}

const TicketCard = ({ item, onSupportChat, isDark }) => {
  const { colors: themeColors } = useTheme();

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "open":
        return colors.buyButtonColor;
      case "closed":
        return colors.sellButtonColor;
      case "resolved":
        return colors.green;
      default:
        return themeColors.button;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onSupportChat(item)}
      style={[
        styles.ticketCard,
        {
          backgroundColor: isDark ? colors.newThemeColor : themeColors.card,
          borderColor: themeColors.border,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: themeColors.text }}>
            {item.subject}
          </AppText>
          <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 4 }}>
            Ticket ID: #{item.ticketId}
          </AppText>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: getStatusColor(item.status) + "15",
              borderColor: getStatusColor(item.status) + "30",
            },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <AppText weight={SEMI_BOLD} type={THIRTEEN} style={{ color: getStatusColor(item.status) }}>
            {item.status}
          </AppText>
        </View>
      </View>

      <View style={[styles.cardDivider, { backgroundColor: themeColors.border }]} />

      <View style={styles.cardBody}>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>
              Category
            </AppText>
            <AppText
              weight={SEMI_BOLD}
              type={THIRTEEN}
              style={{ color: themeColors.text, marginTop: 2, textTransform: "capitalize" }}
            >
              {item.category?.replace(/_/g, " ") || "General"}
            </AppText>
          </View>
          <View style={[styles.infoItem, { alignItems: "flex-end" }]}>
            <AppText type={TWELVE} style={{ color: themeColors.secondaryText, textAlign: "right" }}>
              Priority
            </AppText>
            <View style={[styles.priorityBadge, { backgroundColor: themeColors.button + "20" }]}>
              <AppText weight={SEMI_BOLD} type={TWELVE} style={{ color: themeColors.button, textTransform: "capitalize" }}>
                {item.priority || "Medium"}
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>
              Created on
            </AppText>
            <AppText type={THIRTEEN} style={{ color: themeColors.text, marginTop: 2 }}>
              {moment(item.createdAt).format("DD MMM, YYYY")} at {moment(item.createdAt).format("hh:mm A")}
            </AppText>
          </View>
          <TouchableOpacity onPress={() => onSupportChat(item)}>
            <AppText weight={SEMI_BOLD} type={THIRTEEN} style={{ color: themeColors.button }}>
              View details {">"}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function SupportIssueList() {
  const dispatch = useDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const userTickets = useAppSelector((state) => state.home.userTickets) || [];
  const [activeFilter, setActiveFilter] = useState("all");
  const [contentLoading, setContentLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(getUserTickets());
  }, [dispatch]);

  useEffect(() => {
    if (Array.isArray(userTickets)) {
      setContentLoading(false);
    }
  }, [userTickets]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await dispatch(getUserTickets({ silent: true }));
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  const filteredTickets = useMemo(() => {
    const list = Array.isArray(userTickets) ? userTickets : [];
    if (activeFilter === "all") return list;
    return list.filter((t) => tabIdForStatus(t?.status) === activeFilter);
  }, [userTickets, activeFilter]);

  const handleSupportChat = useCallback((chat) => {
    NavigationService.navigate("Ticket_Screen", { data: chat });
  }, []);

  const renderEmpty = useCallback(() => {
    const hasAny = Array.isArray(userTickets) && userTickets.length > 0;
    const emptyCopy = hasAny ? "No tickets in this filter." : "You have not created any support tickets yet.";
    return (
      <View style={styles.noDataRow}>
        <FastImage
          source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT}
          resizeMode="contain"
          style={{ width: 120, height: 120, opacity: isDark ? 0.6 : 1 }}
        />
        <AppText type={FOURTEEN} style={{ color: colors.secondaryText, marginTop: 16, textAlign: "center", paddingHorizontal: 24 }}>
          {emptyCopy}
        </AppText>
      </View>
    );
  }, [isDark, userTickets]);

  const listHeader = (
    <View style={styles.listHeader}>
      <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, lineHeight: 16, marginBottom: 14 }}>
        Track and open your support requests. Tap a ticket to view the conversation.
      </AppText>
      <View style={styles.filterRow}>
        {FILTER_TABS.map((tab) => {
          const selected = activeFilter === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveFilter(tab.id)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selected ? themeColors.button : isDark ? colors.newThemeColor : themeColors.card,
                  borderColor: themeColors.border,
                },
              ]}
              activeOpacity={0.85}
            >
              <AppText
                weight={SEMI_BOLD}
                type={THIRTEEN}
                numberOfLines={1}
                style={{
                  color: selected ? themeColors.buttonText : themeColors.text,
                  textAlign: "center",
                }}
              >
                {tab.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background, flex: 1 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => NavigationService.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <FastImage source={back_ic} resizeMode="contain" style={{ width: 18, height: 18 }} tintColor={themeColors.text} />
        </TouchableOpacity>
        <AppText weight={SEMI_BOLD} type={EIGHTEEN} style={{ color: themeColors.text }}>
          My Tickets
        </AppText>
        <TouchableOpacity style={{ borderWidth: 1, borderColor: colors.grey, borderRadius: 5, paddingHorizontal: 10, paddingVertical: 8 }} onPress={() => NavigationService.navigate(CREATE_TICKET_SCREEN)} hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}>
          <AppText weight={SEMI_BOLD} type={TWELVE} style={{ color: isDark ? colors.white : colors.black }}>
            Create
          </AppText>
        </TouchableOpacity>
      </View>

      <View style={[styles.container, { paddingHorizontal: H_PADDING }]}>
        {contentLoading ? (
          <SupportSkeleton />
        ) : (
          <FlatList
            data={filteredTickets}
            ListHeaderComponent={listHeader}
            renderItem={({ item }) => <TicketCard item={item} onSupportChat={handleSupportChat} isDark={isDark} />}
            keyExtractor={(item) => (item?._id != null ? String(item._id) : String(item?.ticketId))}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.button} />}
          />
        )}
      </View>
    </AppSafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: H_PADDING,
    paddingTop: 12,
    paddingBottom: 8,
  },
  container: {
    flex: 1,
    paddingTop: 4,
  },
  listHeader: {
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ticketCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    // ...Platform.select({
    //   ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
    //   android: { elevation: 1.5 },
    // }),
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    borderWidth: 0.5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardDivider: {
    height: 1,
    width: "100%",
    marginBottom: 12,
  },
  cardBody: {
    gap: 16,
  },
  infoGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoItem: {
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  noDataRow: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48,
    flex: 1,
  },
});
