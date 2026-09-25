import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, ScrollView, Dimensions, Share } from 'react-native';
import RBSheet from 'react-native-raw-bottom-sheet';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Svg, { Path } from 'react-native-svg';
import FastImage from 'react-native-fast-image';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, MEDIUM, SEMI_BOLD } from '../../shared';
import { useTheme } from '../../hooks/useTheme';
import { back_ic, INFO, calendarIcon, pasteImg, closeIcon, downIcon, referalBanner } from '../../helper/ImageAssets';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-simple-toast';
import { colors } from '../../theme/colors';
import NavigationService from '../../navigation/NavigationService';
import { fontFamilySemiBold, fontFamilyMedium, fontFamilyBold } from '../../theme/typography';
import { appOperation } from '../../appOperation';
import { CHART_WEB_BASE_URL } from '../../helper/Constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CYAN = colors.cyanTheme || colors.cyan || '#0AA8C5';

const REFERRAL_FAQ_ITEMS = [
  {
    question: "What is the Coincode Referral Program?",
    answer: "The Coincode Referral Program is an incentive system that rewards you for bringing new users to the platform. By sharing your personal invite link or referral code, you can earn a percentage of the trading fees paid by your invitees on their trades."
  },
  {
    question: "How does the Coincode Referral System work?",
    answer: "When a new user registers using your referral link or enters your code during sign-up, their account is permanently linked to yours. Every time they trade on Coincode, a share of the commission fee paid by them is automatically credited to your referral earnings."
  },
  {
    question: "How can I invite friends to Coincode?",
    answer: "Simply copy your unique referral link or code from the dashboard above and share it with your friends. You can post it on social media, share it in chats, or send it directly. Ensure they use it during signup to successfully link their account."
  },
  {
    question: "When will I receive referral rewards?",
    answer: "Referral commissions are calculated in real-time or daily once the referred user's trades are executed and settled. You can track your pending and total earnings dynamically in the statistics and history sections."
  },
  {
    question: "How are referral commissions calculated?",
    answer: "Commissions are calculated as a percentage of the trading fees paid by your invitees. You start with a base rate of 15% of their fees. As your network's trading volume grows, you can unlock higher tiers rising to 25% and 35% commission rates."
  }
];

const pickReferralCode = (payload: any) => {
  if (payload == null) return "";
  if (typeof payload === "string" || typeof payload === "number") return String(payload).trim();
  if (typeof payload !== "object") return "";

  const fromData =
    payload?.data?.refer_code ||
    payload?.data?.user_code ||
    payload?.data?.referral_code ||
    payload?.data?.referCode ||
    payload?.data?.code;
  if (fromData) return String(fromData).trim();

  const nested = payload.data ?? payload.result ?? payload;
  if (typeof nested === "string" || typeof nested === "number") return String(nested).trim();
  if (typeof nested !== "object" || nested == null) return "";
  return String(
    nested.refer_code ||
    nested.user_code ||
    nested.referral_code ||
    nested.referCode ||
    nested.code ||
    nested.refferal_code ||
    nested.user_refer_code ||
    ""
  ).trim();
};

const pickReferCount = (payload: any) => {
  if (payload == null) return 0;
  if (typeof payload === "number") return payload;
  if (typeof payload === "string" && payload.trim() !== "" && !Number.isNaN(Number(payload))) {
    return Number(payload);
  }
  if (typeof payload !== "object") return 0;
  const nested = payload.data ?? payload.result ?? payload;
  if (typeof nested === "number") return nested;
  if (typeof nested === "string" && nested.trim() !== "" && !Number.isNaN(Number(nested))) {
    return Number(nested);
  }
  if (typeof nested !== "object" || nested == null) return 0;
  const n =
    nested.total_refer_count ??
    nested.totalReferCount ??
    nested.total_count ??
    nested.count ??
    nested.total ??
    nested.friends ??
    nested.invites ??
    0;
  return Number(n) || 0;
};

const pickReferList = (payload: any) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const nested = payload.data ?? payload.result ?? payload.list ?? payload.users ?? payload;
  if (Array.isArray(nested)) return nested;
  if (nested && typeof nested === "object") {
    if (Array.isArray(nested.list)) return nested.list;
    if (Array.isArray(nested.users)) return nested.users;
    if (Array.isArray(nested.referrals)) return nested.referrals;
  }
  return [];
};

const resolveKycBadge = (item: any) => {
  const raw =
    item?.kycStatus ??
    item?.kyc_status ??
    item?.kycVerified ??
    item?.kyc_verified ??
    item?.status;
  const s = String(raw ?? "").toLowerCase();
  if (raw === true || raw === 2 || raw === "2" || s === "verified" || s === "approved") {
    return { label: "Verified", color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' };
  }
  if (raw === 1 || raw === "1" || s === "pending") {
    return { label: "Pending", color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' };
  }
  if (raw === 3 || raw === "3" || s === "rejected") {
    return { label: "Rejected", color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' };
  }
  return { label: "Not Verified", color: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)' };
};

const maskSignId = (value: any) => {
  const s = String(value || "").trim();
  if (!s) return "-----";
  if (s.length <= 6) return s;
  return `${s.slice(0, 3)}***${s.slice(-4)}`;
};

const formatJoinDate = (value: any) => {
  if (!value) return "-----";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const ReferAndEarn = () => {
  const { colors: themeColors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [referralCode, setReferralCode] = useState("");
  const [referCount, setReferCount] = useState(0);
  const [referList, setReferList] = useState([]);
  const [referralLoading, setReferralLoading] = useState(false);
  const faqSheetRef = useRef<any>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState("Last 30 Days");
  const [timeframeDropdownOpen, setTimeframeDropdownOpen] = useState(false);
  const timeframes = ["Last 10 Days", "Last 20 Days", "Last 30 Days", "Last 40 Days"];

  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [startDate, setStartDate] = useState(new Date(2024, 4, 1)); // May 1, 2024
  const [endDate, setEndDate] = useState(new Date(2024, 4, 31)); // May 31, 2024
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [datePickerType, setDatePickerType] = useState<'start' | 'end'>('start');

  const formatInputDate = (d: Date) => {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const formatDisplayDate = (d: Date) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`;
  };

  const loadReferralData = useCallback(async () => {
    setReferralLoading(true);
    try {
      const [codeRes, countRes, listRes] = await Promise.all([
        appOperation.customer.user_refer_code() as any,
        appOperation.customer.user_refer_count() as any,
        appOperation.customer.get_referral_list() as any,
      ]);

      if (codeRes?.success) {
        const code = pickReferralCode(codeRes);
        if (code) setReferralCode(code);
      }

      if (countRes?.success) {
        setReferCount(pickReferCount(countRes));
      }

      if (listRes?.success) {
        const list = pickReferList(listRes);
        setReferList(list as any);
        if (!countRes?.success) {
          setReferCount(list.length);
        }
      }
    } catch (e) {
      // keep UI defaults on network failure
    } finally {
      setReferralLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReferralData();
  }, [loadReferralData]);

  const friendsInvited = referCount || referList.length || 0;
  const baseWebUrl = CHART_WEB_BASE_URL.replace(/\/$/, "");
  const referralLink = referralCode ? `${baseWebUrl}/signup?referral_code=${referralCode}` : '';

  // Match TradingDataModal sheet theme
  const sheetTextColor = isDark ? '#FFFFFF' : '#000000';
  const sheetSubTextColor = isDark ? 'rgba(255,255,255,0.55)' : '#9D9D9D';
  const sheetRowBorderColor = isDark ? 'rgba(255,255,255,0.08)' : '#EEEEEE';
  const sheetCloseCircleBg = isDark ? 'rgba(255,255,255,0.12)' : '#E8E8E8';
  const sheetIconTint = isDark ? colors.white : colors.black;
  const sheetHandleColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)';

  const onShare = async () => {
    try {
      if (!referralLink) {
        Toast.showWithGravity('Referral link not available', Toast.SHORT, Toast.BOTTOM);
        return;
      }
      await Share.share({
        message: `Join Coincode using my referral link!\n${referralLink}`,
      });
    } catch (error: any) {
      Toast.showWithGravity(error.message, Toast.SHORT, Toast.BOTTOM);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Absolute header — icons already have their own border */}
      <View style={[styles.headerAbsolute, { top: Math.max(insets.top, 10) }]}>
        <TouchableOpacity
          onPress={() => NavigationService.goBack()}
          activeOpacity={0.75}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FastImage source={back_ic} style={styles.backIcon} resizeMode="contain" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => faqSheetRef.current?.open()}
          activeOpacity={0.75}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FastImage source={INFO} style={styles.infoIcon} tintColor={colors.white} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Banner Section — matches CoinCode ReferralScreen */}
        <View style={styles.bannerContainer}>
          <FastImage source={referalBanner} style={styles.bannerImage} resizeMode="cover" />
          <View style={[styles.bannerTextContainer, { top: Math.max(insets.top, 10) + 52 }]}>
            <AppText style={[styles.bannerEyebrow, { color: isDark ? '#A0A0A0' : 'rgba(255,255,255,0.7)' }]}>
              Refer Friends
            </AppText>
            <AppText style={styles.bannerTitle}>
              Earn Up to <AppText style={[styles.bannerTitle, { color: CYAN }]}>20%</AppText>
            </AppText>
            <AppText style={styles.bannerTitle}>in Bonuses</AppText>
            <TouchableOpacity style={styles.inviteBtn} onPress={onShare} activeOpacity={0.85}>
              <AppText style={styles.inviteBtnText}>Invite Friends</AppText>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {/* Stats Section */}
          <View style={[styles.statsContainer, { backgroundColor: isDark ? colors.newThemeColor : '#F9F9F9' }]}>
            <AppText style={[styles.sectionHeader, { color: isDark ? '#A0A0A0' : '#666' }]}>Your Referral Code</AppText>
            <AppText style={[styles.referralCodeText, { color: themeColors.text }]}>
              {referralCode || (referralLoading ? "…" : "—")}
            </AppText>

            <View style={styles.gridContainer}>

              <View style={[styles.gridItem, { width: '100%', paddingVertical: 16, backgroundColor: isDark ? colors.newThemeColor : colors.white, borderColor: isDark ? colors.themeElevationColor : '#EEE' }]}>
                <AppText style={[styles.gridLabel, { color: isDark ? '#A0A0A0' : '#666' }]}>Friends You've Invited</AppText>
                <AppText style={[styles.gridValue, { color: themeColors.text }]}>{friendsInvited}</AppText>
              </View>

            </View>

            <View style={styles.shareLinkSection}>
              <AppText style={[styles.shareLabel, { color: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)' }]}>Share Your Link</AppText>
              <View style={[styles.shareInputWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                <AppText style={[styles.shareInput, { color: themeColors.text }]} numberOfLines={1}>
                  {referralLink || "Sign in to get your referral link"}
                </AppText>
                <TouchableOpacity
                  style={styles.shareCopyBtn}
                  disabled={!referralLink}
                  onPress={() => {
                    Clipboard.setString(referralLink);
                    Toast.showWithGravity('Copied to clipboard', Toast.SHORT, Toast.BOTTOM);
                  }}>
                  <FastImage source={pasteImg}
                    resizeMode='contain'
                    tintColor={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)'}
                    style={{ width: 20, height: 20 }} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>




        {/* Referral History Section */}
        <View style={styles.historyContainer}>
          <AppText style={[styles.historyTitle, { color: themeColors.text }]}>Referral History</AppText>
          {(!referList || referList.length === 0) ? (
            <View style={[styles.emptyHistoryBox, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
              <AppText style={[styles.emptyHistoryText, { color: isDark ? '#A0A0A0' : '#666' }]}>
                {referralLoading ? "Loading referrals…" : "No referral history found"}
              </AppText>
            </View>
          ) : (
            <View style={styles.historyList}>
              {referList.map((item: any, index: number) => {
                const kyc = resolveKycBadge(item);
                const name =
                  item?.full_name_masked ||
                  item?.name ||
                  item?.fullName ||
                  item?.full_name ||
                  item?.email ||
                  "-----";
                const signId =
                  item?.masked_id ||
                  maskSignId(item?.userId || item?.user_id || item?.signId || item?.sign_id);
                const joinDate = formatJoinDate(item?.signup_date || item?.createdAt);

                return (
                  <View key={index} style={[styles.historyCard, { backgroundColor: isDark ? colors.newThemeColor : '#F9F9F9', borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#EEE', borderWidth: 1 }]}>
                    <View style={[styles.historyRowData, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : '#EEE' }]}>
                      <AppText style={styles.historyRowLabel}>S.No</AppText>
                      <AppText style={[styles.historyRowValue, { color: themeColors.text }]}>{index + 1}</AppText>
                    </View>
                    <View style={[styles.historyRowData, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : '#EEE' }]}>
                      <AppText style={styles.historyRowLabel}>Name</AppText>
                      <AppText style={[styles.historyRowValue, { color: themeColors.text }]}>{name}</AppText>
                    </View>
                    <View style={[styles.historyRowData, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : '#EEE' }]}>
                      <AppText style={styles.historyRowLabel}>Sign ID</AppText>
                      <AppText style={[styles.historyRowValue, { color: themeColors.text }]}>{signId}</AppText>
                    </View>
                    <View style={[styles.historyRowData, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : '#EEE' }]}>
                      <AppText style={styles.historyRowLabel}>KYC Status</AppText>
                      <View style={[styles.kycBadge, { backgroundColor: kyc.bg }]}>
                        <AppText style={[styles.kycText, { color: kyc.color }]}>{kyc.label}</AppText>
                      </View>
                    </View>
                    <View style={[styles.historyRowData, { borderBottomWidth: 0 }]}>
                      <AppText style={styles.historyRowLabel}>Join Date</AppText>
                      <AppText style={[styles.historyRowValue, { color: themeColors.text }]}>{joinDate}</AppText>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* How to Invite Section */}
        <View style={[styles.howToInviteContainer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <AppText style={[styles.howToInviteTitle, { color: themeColors.text }]}>
            How to <AppText weight={MEDIUM} style={{ color: CYAN, fontSize: 24 }}>Invite?</AppText>
          </AppText>
          <AppText style={[styles.howToInviteSub, { color: isDark ? '#A0A0A0' : '#666' }]}>
            Get started with referrals and grow your rewards.
          </AppText>

          <View style={styles.stepsContainer}>
            {[
              { step: '01', text: 'Send\nInvitation by\nLink' },
              { step: '02', text: 'Friends\nRegister and\nTrade' },
              { step: '03', text: 'Get\nCorresponding\nRewards' },
            ].map((item) => (
              <View
                key={item.step}
                style={[
                  styles.stepWrapper,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9F9F9',
                    borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#EEE',
                  },
                ]}
              >
                <LinearGradient
                  colors={['#0AA8C5', '#067A8F']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.stepNumberBadge}
                >
                  <AppText style={styles.stepNumberText}>{item.step}</AppText>
                </LinearGradient>
                <AppText style={[styles.stepDesc, { color: isDark ? '#A0A0A0' : '#666' }]}>
                  {item.text}
                </AppText>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* FAQ Bottom Sheet — theme matches TradingDataModal */}
      <RBSheet
        ref={faqSheetRef}
        height={500}
        openDuration={250}
        {...({ customModalProps: { statusBarTranslucent: true, navigationBarTranslucent: true } } as any)}
        customStyles={{
          container: {
            backgroundColor: 'transparent',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
            paddingHorizontal: 14,
            paddingTop: 8,
            paddingBottom: 10,
          },
        }}
      >
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={20}
          reducedTransparencyFallbackColor="#111214"
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? 'rgba(10, 12, 16, 0.68)' : 'rgba(255, 255, 255, 0.85)' },
          ]}
        />
        {isDark && (
          <>
            <LinearGradient
              colors={[
                'rgba(16, 185, 129, 0.10)',
                'rgba(6, 182, 212, 0.04)',
                'rgba(16, 185, 129, 0.02)',
                'rgba(16, 185, 129, 0.07)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <LinearGradient
              colors={['transparent', 'rgba(16, 185, 129, 0.04)', 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          </>
        )}

        <View style={{ alignItems: 'center', marginBottom: 8, marginTop: 2 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: sheetHandleColor }} />
        </View>

        <View style={styles.sheetHeader}>
          <AppText style={[styles.sheetTitle, { color: sheetTextColor }]}>FAQ</AppText>
          <TouchableOpacity
            onPress={() => faqSheetRef.current?.close()}
            style={[styles.sheetCloseCircle, { backgroundColor: sheetCloseCircleBg }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.75}
          >
            <FastImage
              source={closeIcon}
              resizeMode="contain"
              style={styles.sheetCloseIcon}
              tintColor={sheetIconTint}
            />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          {REFERRAL_FAQ_ITEMS.map((faq, index) => (
            <View key={index} style={[styles.faqItem, { borderBottomColor: sheetRowBorderColor }]}>
              <TouchableOpacity
                style={styles.faqQuestionBtn}
                onPress={() => setActiveFaq(activeFaq === index ? null : index)}
              >
                <AppText style={[styles.faqQuestion, { color: sheetTextColor }]}>{faq.question}</AppText>
                <FastImage
                  source={downIcon}
                  style={{
                    width: 12,
                    height: 12,
                    transform: [{ rotate: activeFaq === index ? '180deg' : '0deg' }],
                  }}
                  tintColor={sheetSubTextColor}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              {activeFaq === index && (
                <AppText style={[styles.faqAnswer, { color: sheetSubTextColor }]}>{faq.answer}</AppText>
              )}
            </View>
          ))}
        </ScrollView>
      </RBSheet>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        display="spinner"
        isDarkModeEnabled={isDark}
        {...(Platform.OS === 'ios' && {
          themeVariant: isDark ? "dark" : "light",
          textColor: themeColors.text
        })}
        onConfirm={(date) => {
          if (datePickerType === 'start') {
            setStartDate(date);
          } else {
            setEndDate(date);
          }
          setDatePickerVisibility(false);
        }}
        onCancel={() => setDatePickerVisibility(false)}
        date={datePickerType === 'start' ? startDate : endDate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backIcon: {
    width: 35,
    height: 35,
  },
  infoIcon: {
    width: 25,
    height: 25,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  bannerContainer: {
    width: '100%',
    height: SCREEN_WIDTH * 0.75,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  bannerTextContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  bannerEyebrow: {
    fontSize: 12,
    fontFamily: fontFamilyMedium,
    marginBottom: 8,
  },
  bannerTitle: {
    fontSize: 28,
    color: colors.white,
    fontFamily: fontFamilyBold,
  },
  content: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  statsContainer: {
    marginTop: 16,
    borderRadius: 24,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionHeader: {
    fontSize: 14,
    fontFamily: fontFamilyMedium,
    textAlign: 'center',
    marginBottom: 5,
  },
  referralCodeText: {
    fontSize: 22,
    fontFamily: fontFamilyBold,
    textAlign: 'center',
    marginBottom: 14,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48.5%',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 5,
  },
  gridLabel: {
    fontSize: 11,
    fontFamily: fontFamilyMedium,
    textAlign: 'center',
    marginBottom: 5,
  },
  gridValue: {
    fontSize: 22,
    fontFamily: fontFamilyBold,
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
  },
  linkText: {
    fontSize: 13,
    fontFamily: fontFamilyMedium,
    flex: 1,
    marginRight: 10,
  },
  shareLinkSection: {
    width: '100%',
    flexDirection: 'column',
    gap: 10,
    marginTop: 15,
  },
  shareLabel: {
    fontSize: 12,
    fontFamily: fontFamilyMedium,
  },
  shareInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 8,
  },
  shareInput: {
    fontSize: 14,
    fontFamily: fontFamilyMedium,
    flex: 1,
    marginRight: 10,
  },
  shareCopyBtn: {
    width: 36,
    height: 33,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyIcon: {
    fontSize: 16,
    color: '#888',
  },
  overviewContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  overviewTitle: {
    fontSize: 22,
    fontFamily: fontFamilyBold,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: 13,
    fontFamily: fontFamilyMedium,
    marginRight: 6,
  },
  dropdownIcon: {
    fontSize: 16,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    width: 180,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 999,
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dropdownMenuText: {
    fontSize: 15,
    fontFamily: fontFamilyMedium,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: CYAN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    color: '#000',
    fontSize: 13,
    fontFamily: fontFamilyBold,
    marginTop: Platform.OS === 'ios' ? 2 : 0,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  overviewCard: {
    width: '48.5%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 8,
    marginBottom: 5,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  iconEmoji: {
    fontSize: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 11,
    fontFamily: fontFamilyMedium,
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 16,
    fontFamily: fontFamilyBold,
    marginBottom: 2,
  },
  cardSubValue: {
    fontSize: 10,
    fontFamily: fontFamilyMedium,
  },
  commissionContainer: {
    marginTop: 30,
    paddingHorizontal: 16,
  },
  commissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 10,
  },
  commissionTitle: {
    fontSize: 20,
    fontFamily: fontFamilyBold,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  dateText: {
    fontSize: 11,
    fontFamily: fontFamilyMedium,
    marginLeft: 6,
  },
  datePopover: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    width: 260,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 999,
  },
  dateLabel: {
    fontSize: 14,
    fontFamily: fontFamilyMedium,
    marginBottom: 8,
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateInputValue: {
    fontSize: 15,
    fontFamily: fontFamilyMedium,
  },
  calendarIconSm: {
    fontSize: 16,
  },
  applyBtn: {
    backgroundColor: CYAN,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  applyBtnText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fontFamilyBold,
  },
  baseCommissionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  baseCommLabel: {
    fontSize: 12,
    fontFamily: fontFamilyMedium,
    marginBottom: 16,
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 160,
    height: 80,
    overflow: 'hidden',
    position: 'relative',
  },
  gaugeBackground: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 12,
    position: 'absolute',
    top: 0,
  },
  gaugeProgress: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 12,
    borderColor: '#02C076',
    position: 'absolute',
    top: 0,
    borderBottomColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{ rotate: '-45deg' }],
  },
  gaugeText: {
    fontSize: 22,
    fontFamily: fontFamilyBold,
    position: 'absolute',
    bottom: 0,
  },
  targetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  targetTitle: {
    fontSize: 11,
    fontFamily: fontFamilySemiBold,
    marginBottom: 4,
  },
  targetSub: {
    fontSize: 10,
    fontFamily: fontFamilyMedium,
  },
  targetValue: {
    fontSize: 16,
    fontFamily: fontFamilyBold,
    marginLeft: 12,
  },
  miniStatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  miniIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  miniIcon: {
    fontSize: 16,
  },
  miniStatContent: {
    flex: 1,
  },
  miniStatLabel: {
    fontSize: 11,
    fontFamily: fontFamilyMedium,
    marginBottom: 2,
  },
  miniStatValue: {
    fontSize: 14,
    fontFamily: fontFamilyBold,
  },
  sparklineContainer: {
    width: 80,
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  sheetTitle: {
    fontSize: 20,
    fontFamily: fontFamilyBold,
  },
  sheetCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCloseIcon: {
    width: 12,
    height: 12,
  },
  faqItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  faqQuestionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 14,
    fontFamily: fontFamilyMedium,
    flex: 1,
    marginRight: 16,
  },
  faqAnswer: {
    fontSize: 13,
    fontFamily: fontFamilyMedium,
    marginTop: 12,
    lineHeight: 20,
  },
  howToInviteContainer: {
    marginTop: 32,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  howToInviteTitle: {
    fontSize: 24,
    fontFamily: fontFamilyBold,
    marginBottom: 8,
    textAlign: 'center',
  },
  howToInviteSub: {
    fontSize: 14,
    fontFamily: fontFamilyMedium,
    textAlign: 'center',
    marginBottom: 28,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  stepWrapper: {
    width: (SCREEN_WIDTH - 52) / 3,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingTop: 14,
    paddingBottom: 16,
    alignItems: 'center',
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stepNumberText: {
    color: colors.white,
    fontFamily: fontFamilyBold,
    fontSize: 11,
  },
  stepDesc: {
    fontSize: 10,
    fontFamily: fontFamilyMedium,
    textAlign: 'center',
    lineHeight: 14,
  },
  inviteBtn: {
    backgroundColor: CYAN,
    alignSelf: 'flex-start',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  inviteBtnText: {
    color: colors.white,
    fontSize: 13,
    fontFamily: fontFamilySemiBold,
  },
  historyContainer: {
    paddingHorizontal: 16,
    marginTop: 30,
    marginBottom: 10,
  },
  historyTitle: {
    fontSize: 22,
    fontFamily: fontFamilyBold,
    marginBottom: 16,
  },
  emptyHistoryBox: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyHistoryText: {
    fontSize: 14,
    fontFamily: fontFamilyMedium,
  },
  historyList: {
    gap: 12,
  },
  historyCard: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  historyRowData: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  historyRowLabel: {
    fontSize: 14,
    fontFamily: fontFamilyMedium,
    color: '#84888C',
  },
  historyRowValue: {
    fontSize: 14,
    fontFamily: fontFamilyMedium,
  },
  kycBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  kycText: {
    fontSize: 12,
    fontFamily: fontFamilySemiBold,
  }
});

export default ReferAndEarn;
