import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AppSafeAreaView,
  AppText,
  SEMI_BOLD,
  THIRTEEN,
  Toolbar,
  TWELVE,
} from "../../shared";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { commonStyles } from "../../theme/commonStyles";
import { universalPaddingHorizontalHigh } from "../../theme/dimens";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import moment from "moment";
import { checkValue } from "../../helper/utility";
import {
  externalLinkIcon,
  NO_NOTIFICATION_ICON,
  NO_NOTIFICATION_ICON_LIGHT,
} from "../../helper/ImageAssets";
import {
  getNotificationList,
  parseNotificationsListResponse,
} from "../../actions/homeActions";
import { appOperation } from "../../appOperation";
import FastImage from "react-native-fast-image";
import { useTheme } from "../../hooks/useTheme";
import NotificationSkeleton from "./NotificationSkeleton";
import { showError, showSuccess } from "../../helper/logger";
import { BASE_URL } from "../../helper/Constants";
import { colors, lightTheme } from "../../theme/colors";

const PAGE_SIZE = 10;

function formatNotifDate(iso) {
  if (!iso) return "—";
  const m = moment(iso);
  if (!m.isValid()) return String(iso);
  return m.format("DD MMM YYYY, HH:mm");
}

function resolveNoticeLink(raw) {
  const href = typeof raw === "string" ? raw.trim() : "";
  if (!href) return "";
  if (/^https?:\/\//i.test(href)) return href;
  const origin = String(BASE_URL || "").replace(/\/$/, "");
  if (href.startsWith("/")) return `${origin}${href}`;
  return href;
}

const ListEmptyComponent = ({ hasSearch }) => {
  const { colors: themeColors, isDark } = useTheme();
  return (
    <View style={[commonStyles.center, { paddingVertical: 32 }]}>
      <FastImage
        source={isDark ? NO_NOTIFICATION_ICON : NO_NOTIFICATION_ICON_LIGHT}
        resizeMode="contain"
        style={{ width: 80, height: 80 }}
      />
      {/* <AppText type={TWELVE} color={themeColors.secondaryText} style={{ marginTop: 12 }}>
        {hasSearch ? "No matches on this page." : "No notifications yet."}
      </AppText> */}
    </View>
  );
};

const Notification = () => {
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const languages = useAppSelector((state) => state.account.languages);

  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [markingOneId, setMarkingOneId] = useState(null);
  const [detail, setDetail] = useState(null);

  const loadPage = useCallback(async (p) => {
    setLoading(true);
    try {
      const res = await appOperation.customer.notification_list({
        page: p,
        limit: PAGE_SIZE,
      });
      const parsed = parseNotificationsListResponse(res);
      if (!parsed.ok) {
        showError(parsed.message || "Could not load notifications.");
        setItems([]);
        setPagination(null);
        setCounts(null);
        return;
      }
      setItems(parsed.list);
      setPagination(parsed.pagination ?? null);
      setCounts(parsed.counts ?? null);
    } catch {
      showError("Could not load notifications.");
      setItems([]);
      setPagination(null);
      setCounts(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setHasLoadedOnce(true);
    }
  }, []);

  useEffect(() => {
    loadPage(page);
  }, [page, loadPage]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPage(page);
  }, [page, loadPage]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((n) => {
      const t = `${n?.title ?? ""} ${n?.message ?? ""}`.toLowerCase();
      return t.includes(q);
    });
  }, [items, searchQuery]);

  const totalPages =
    pagination && Number.isFinite(Number(pagination.pages))
      ? Math.max(1, Number(pagination.pages))
      : 1;
  const totalCount =
    pagination && Number.isFinite(Number(pagination.total))
      ? Number(pagination.total)
      : null;

  const detailLink = useMemo(
    () => resolveNoticeLink(typeof detail?.link === "string" ? detail.link : ""),
    [detail]
  );

  const markOneRead = useCallback(
    async (notification) => {
      const id = notification?._id;
      if (!id || notification?.isSeen) return;
      setMarkingOneId(String(id));
      try {
        const res = await appOperation.customer.mark_as_read({
          notificationId: String(id),
        });
        const ok = res?.success === true || res?.success === 1;
        if (ok) {
          const d = res?.data;
          setItems((prev) =>
            prev.map((r) => {
              if (String(r?._id) !== String(id)) return r;
              if (d && typeof d === "object" && d._id) return { ...r, ...d, isSeen: true };
              return { ...r, isSeen: true };
            })
          );
          dispatch(
            getNotificationList({ page: 1, limit: 50, skipGlobalLoader: true })
          );
        } else {
          showError(res?.message || "Could not mark as read.");
        }
      } finally {
        setMarkingOneId(null);
      }
    },
    [dispatch]
  );

  const openDetail = useCallback(
    async (n) => {
      if (!n) return;
      await markOneRead(n);
      setDetail({ ...n, isSeen: true });
    },
    [markOneRead]
  );

  const closeDetail = useCallback(() => setDetail(null), []);

  const handleMarkAllRead = useCallback(async () => {
    setMarkingAll(true);
    try {
      const res = await appOperation.customer.mark_all_notifications_read();
      const ok = res?.success === true || res?.success === 1;
      if (ok) {
        showSuccess(res?.message || "All marked as read.");
        dispatch(
          getNotificationList({ page: 1, limit: 50, skipGlobalLoader: true })
        );
        if (page !== 1) setPage(1);
        else await loadPage(1);
      } else {
        showError(res?.message || "Could not mark all as read.");
      }
    } catch {
      showError("Could not mark all as read.");
    } finally {
      setMarkingAll(false);
    }
  }, [dispatch, loadPage, page]);

  const renderItem = useCallback(
    ({ item: n }) => {
      const unseen = !n?.isSeen;
      const nid = String(n?._id ?? "");
      const busyOne = markingOneId && markingOneId === nid;
      const messageText = n?.message != null ? String(n.message) : "";
      return (
        <Pressable
          onPress={() => openDetail(n)}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
              opacity: pressed ? 0.92 : 1,
              borderLeftWidth: unseen ? 3 : 1,
              borderLeftColor: unseen ? themeColors.text : themeColors.border,
              paddingLeft: unseen ? universalPaddingHorizontalHigh : 12,
            },
          ]}
        >
          <AppText weight={SEMI_BOLD} type={THIRTEEN} color={themeColors.text} numberOfLines={2}>
            {n?.title != null ? String(n.title) : "—"}
          </AppText>
          <AppText
            type={TWELVE}
            color={themeColors.secondaryText}
            numberOfLines={3}
            style={{ marginTop: 6, lineHeight: 18 }}
          >
            {messageText}
          </AppText>
          <View style={styles.rowMeta}>
            <AppText type={TWELVE} color={themeColors.secondaryText}>
              {formatNotifDate(n?.createdAt)}
            </AppText>
            <View style={styles.rowActions}>
              <AppText type={TWELVE} color={themeColors.secondaryText}>
                {unseen ? "Unread" : "Read"}
              </AppText>
              {unseen ? (
                <TouchableOpacity
                  disabled={busyOne}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    markOneRead(n);
                  }}
                  hitSlop={8}
                >
                  <AppText type={TWELVE} color={themeColors.button}>
                    {busyOne ? "…" : "Mark read"}
                  </AppText>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={(e) => {
                  e?.stopPropagation?.();
                  openDetail(n);
                }}
                hitSlop={8}
              >
                <AppText type={TWELVE} weight={SEMI_BOLD} color={themeColors.button}>
                  View
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      );
    },
    [markingOneId, openDetail, markOneRead, themeColors]
  );

  const keyExtractor = useCallback(
    (item, index) => String(item?._id ?? item?.id ?? `row-${index}`),
    []
  );

  const listFooter = useMemo(() => {
    if (!pagination || totalPages <= 1) return null;
    return (
      <View style={styles.pager}>
        <AppText type={TWELVE} color={themeColors.secondaryText}>
          Page {pagination.page ?? page} of {totalPages}
          {totalCount != null ? ` (${totalCount} items)` : ""}
        </AppText>
        <View style={styles.pagerBtns}>
          <TouchableOpacity
            style={[
              styles.pagerBtn,
              { borderColor: themeColors.border },
              page <= 1 && styles.pagerBtnDisabled,
            ]}
            disabled={loading || page <= 1}
            onPress={() => setPage((p) => Math.max(1, p - 1))}
          >
            <AppText type={TWELVE} color={themeColors.text}>
              Previous
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.pagerBtn,
              { borderColor: themeColors.border },
              page >= totalPages && styles.pagerBtnDisabled,
            ]}
            disabled={loading || page >= totalPages}
            onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <AppText type={TWELVE} color={themeColors.text}>
              Next
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [loading, page, pagination, themeColors.secondaryText, themeColors.text, totalCount, totalPages]);

  const showSkeleton = !hasLoadedOnce && loading;

  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background }}>
      <Toolbar
        isSecond
        title={checkValue(languages?.notification_one)}
        style={{ width: "62%" }}
      />

      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <AppText weight={SEMI_BOLD} type={THIRTEEN} color={themeColors.text}>
            Notifications
          </AppText>
          <AppText type={TWELVE} color={themeColors.secondaryText} style={{ marginTop: 4 }}>
            View and manage alerts for your account.
          </AppText>
          {counts && typeof counts === "object" ? (
            <AppText type={TWELVE} color={themeColors.secondaryText} style={{ marginTop: 6 }}>
              On this page: {counts.seen ?? 0} read · {counts.unseen ?? 0} unread
              {totalCount != null ? ` · ${totalCount} total` : ""}
            </AppText>
          ) : null}
        </View>
        <TouchableOpacity
          style={[
            styles.markAllBtn,
            { backgroundColor: isDark ? colors.themeElevationColor : lightTheme.input },
            markingAll && styles.markAllBtnDisabled,
          ]}
          disabled={markingAll}
          onPress={handleMarkAllRead}
        >
          <AppText type={TWELVE} weight={SEMI_BOLD} color={themeColors.buttonText}>
            Mark all read
          </AppText>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchRow, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        <TextInput
          placeholder="Search"
          placeholderTextColor={themeColors.secondaryText}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { color: themeColors.text }]}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {showSkeleton ? (
        <NotificationSkeleton />
      ) : (
        <>
          {loading && !refreshing ? (
            <View style={styles.inlineLoader}>
              <ActivityIndicator color={themeColors.button} />
            </View>
          ) : null}
          <FlatList
            data={filteredItems}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListEmptyComponent={
              <ListEmptyComponent hasSearch={Boolean(searchQuery.trim())} />
            }
            ListFooterComponent={listFooter}
            contentContainerStyle={[
              commonStyles.flexGrow,
              { paddingHorizontal: 10, paddingBottom: 24 },
            ]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.button} />
            }
          />
        </>
      )}

      <Modal
        visible={detail != null}
        transparent
        animationType="fade"
        onRequestClose={closeDetail}
      >
        <Pressable style={styles.modalOverlay} onPress={closeDetail}>
          <Pressable style={[styles.modalCard, { backgroundColor: themeColors.card }]} onPress={() => { }}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <AppText weight={SEMI_BOLD} type={THIRTEEN} color={themeColors.text}>
                  {detail?.title != null ? String(detail.title) : "Notification"}
                </AppText>
                <AppText type={TWELVE} color={themeColors.secondaryText} style={{ marginTop: 4 }}>
                  {formatNotifDate(detail?.createdAt)}
                  {" · "}
                  {detail?.isSeen ? "Read" : "Unread"}
                </AppText>
              </View>
              <TouchableOpacity onPress={closeDetail} hitSlop={12}>
                <AppText type={THIRTEEN} color={themeColors.secondaryText}>
                  ✕
                </AppText>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <AppText type={TWELVE} color={themeColors.text} style={{ lineHeight: 20 }}>
                {detail?.message != null ? String(detail.message) : "—"}
              </AppText>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { borderColor: themeColors.border }]}
                onPress={closeDetail}
              >
                <AppText type={TWELVE} weight={SEMI_BOLD} color={themeColors.text}>
                  Close
                </AppText>
              </TouchableOpacity>
              {detailLink ? (
                <TouchableOpacity
                  style={[
                    styles.modalCloseBtn,
                    { backgroundColor: themeColors.button, borderColor: themeColors.button },
                  ]}
                  onPress={() => {
                    Linking.openURL(detailLink).catch(() =>
                      showError("Could not open link.")
                    );
                    closeDetail();
                  }}
                >
                  <AppText type={TWELVE} weight={SEMI_BOLD} color={themeColors.buttonText}>
                    Open link
                  </AppText>
                  <FastImage
                    source={externalLinkIcon}
                    resizeMode="contain"
                    style={{ width: 12, height: 12, marginLeft: 6 }}
                    tintColor={themeColors.buttonText}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </AppSafeAreaView>
  );
};

export default Notification;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  markAllBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  markAllBtnDisabled: {
    opacity: 0.55,
  },
  searchRow: {
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
  searchInput: {
    paddingVertical: 10,
    fontSize: 14,
  },
  inlineLoader: {
    paddingVertical: 8,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    flexWrap: "wrap",
    gap: 8,
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pager: {
    marginTop: 20,
    paddingHorizontal: 4,
    gap: 12,
  },
  pagerBtns: {
    flexDirection: "row",
    gap: 10,
  },
  pagerBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  pagerBtnDisabled: {
    opacity: 0.45,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.48)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    borderRadius: 16,
    maxHeight: "85%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    paddingBottom: 8,
  },
  modalBody: {
    maxHeight: 360,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    padding: 16,
    paddingTop: 8,
    flexWrap: "wrap",
  },
  modalCloseBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
});
