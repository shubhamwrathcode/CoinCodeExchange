import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import FastImage from "react-native-fast-image";
import Clipboard from "@react-native-clipboard/clipboard";
import Toast from "react-native-simple-toast";
import Svg, { Path, Rect } from "react-native-svg";
import { useTheme } from "../../hooks/useTheme";
import { useAppSelector } from "../../store/hooks";
import { colors } from "../../theme/colors";
import { appOperation } from "../../appOperation";
import NavigationService from "../../navigation/NavigationService";
import {
  KYC_STATUS_SCREEN,
  SELECT_COIN_SCREEN,
  DEPOSIT_COIN_SCREEN,
  DEPOSIT_FIAT_HISTORY_SCREEN,
  WITHDRAW_FIAT_SCREEN,
} from "../../navigation/routes";
import {
  back_ic,
  checkIc,
  historyIcon,
  INFO,
  upIcon,
  downIcon,
  closeIcon,
} from "../../helper/ImageAssets";
import RBSheet from "react-native-raw-bottom-sheet";
import AnimatedBottomSheet from "../../common/AnimatedBottomSheet/AnimatedBottomSheet";
import {
  AppSafeAreaView,
  AppText,
  BOLD,
  SEMI_BOLD,
  MEDIUM,
  TWENTY,
  TWENTY_FOUR,
  EIGHTEEN,
  SIXTEEN,
  FIFTEEN,
  FOURTEEN,
  THIRTEEN,
  TWELVE,
  ELEVEN,
  TEN,
} from "../../shared";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const FIAT_FAQ_DATA = [
  {
    title: "How do I deposit Fiat (AED) on Coincode?",
    content:
      "Create your dedicated Zand Bank virtual IBAN on Coincode. Then log in to your UAE banking app (ENBD, ADCB, FAB, Mashreq, etc.) and transfer AED directly to that virtual IBAN.",
  },
  {
    title: "Deposit fiat — step by step",
    content:
      "• Complete KYC — Make sure your account is identity-verified.\n• Get Virtual IBAN — Create your dedicated UAE virtual account.\n• Copy details — Copy the IBAN, Account Name, and Bank Name (Zand Bank).\n• Transfer from bank — Send funds via your UAE bank app.\n• Instant credit — Funds are credited to your Spot AED wallet as soon as the bank settles.",
  },
  {
    title: "Important deposit rules & guidelines",
    content:
      "• Same-name transfer — You must transfer from a bank account in your own name matching your Coincode KYC.\n• Third-party deposits — Transfers from third-party or corporate accounts will be rejected and refunded.\n• Currency — Only AED is accepted on this virtual IBAN.",
  },
  {
    title: "My fiat deposit hasn't arrived — what should I do?",
    content:
      "• Verify IBAN — Check that you transferred to your exact Coincode virtual IBAN.\n• Bank confirmation — Ensure the transaction was marked successful in your banking app.\n• Processing time — UAE IPP/instant transfers arrive within minutes; standard transfers may take a few hours during banking business days.",
  },
];

// Web SVG Icon Components with exact web paths & styling
const SecurityShieldIcon = ({ size = 20, color = "#D1AA67" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 12L11 14L15 10M20.618 5.984C17.4561 6.15192 14.3567 5.05861 12 2.944C9.64327 5.05861 6.5439 6.15192 3.382 5.984C3.12754 6.96911 2.99918 7.98255 3 9C3 14.591 6.824 19.29 12 20.622C17.176 19.29 21 14.592 21 9C21 7.958 20.867 6.948 20.618 5.984Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const InstantBoltIcon = ({ size = 20, color = "#D1AA67" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M13 10V3L4 14H11V21L20 10H13V10" fill={color} />
  </Svg>
);

const GlobalGlobeIcon = ({ size = 20, color = "#D1AA67" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 12C21 16.9672 16.9672 21 12 21M21 12C21 7.03276 16.9672 3 12 3M21 12H3M12 21C7.03276 21 3 16.9672 3 12M12 21C13.657 21 15 16.97 15 12C15 7.03 13.657 3 12 3M12 21C10.343 21 9 16.97 9 12C9 7.03 10.343 3 12 3M3 12C3 7.03276 7.03276 3 12 3"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const BankPillarsIcon = ({ size = 24, color = "#D1AA67" }) => (
  <Svg width={size} height={size} viewBox="0 0 29 29" fill="none">
    <Path
      d="M8.55078 14.5527V17.5527M12.5508 14.5527V17.5527M16.5508 14.5527V17.5527M3.55078 21.5527H21.5508M3.55078 10.5527H21.5508M3.55078 7.55273L12.5508 3.55273L21.5508 7.55273M4.55078 10.5527H20.5508V21.5527H4.55078V10.5527Z"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TransferBuildingIcon = ({ size = 20, color = "#D1AA67" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 21V5C19 3.89617 18.1038 3 17 3H7C5.89617 3 5 3.89617 5 5V21M19 21H21M19 21H14M5 21H3M5 21H10M9 7H10M9 11H10M14 7H15M14 11H15M10 21V16C10 15.4481 10.4481 15 11 15H13C13.5519 15 14 15.4481 14 16V21M10 21H14"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const UaeFlagIcon = ({ width = 24, height = 16 }) => (
  <Svg width={width} height={height} viewBox="0 0 24 16" fill="none" style={{ borderRadius: 2, overflow: "hidden" }}>
    <Rect width="24" height="5.33" fill="#00732F" />
    <Rect y="5.33" width="24" height="5.33" fill="#FFFFFF" />
    <Rect y="10.66" width="24" height="5.34" fill="#000000" />
    <Rect width="6" height="16" fill="#FF0000" />
  </Svg>
);

const CopyIcon = ({ size = 15, color = "#D1AA67" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9 3h11v13h-3V6H9V3zM4 8v13h11V8.02L4 8z"
      fill={color}
    />
  </Svg>
);

const CopiedCheckIcon = ({ size = 15, color = "#10B981" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 6L9 17L4 12"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const HOW_STEPS = [
  {
    n: "1",
    title: "Complete KYC",
    body: "Verify your identity so we can open a virtual IBAN in your name.",
    IconComponent: SecurityShieldIcon,
  },
  {
    n: "2",
    title: "Create your IBAN",
    body: "One tap creates your Zand virtual account. Copy the IBAN from this page.",
    IconComponent: BankPillarsIcon,
  },
  {
    n: "3",
    title: "Transfer AED",
    body: "Send any AED amount from your UAE bank. Use the account name as beneficiary.",
    IconComponent: TransferBuildingIcon,
  },
  {
    n: "4",
    title: "Spot AED credits",
    body: "After the bank processes the transfer, funds land in your spot AED wallet.",
    IconComponent: InstantBoltIcon,
  },
];

function formatCreatedDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function vaStatusChip(status) {
  const raw = String(status || "ACTIVE").toUpperCase();
  if (raw === "ACTIVE") return { text: "Active", pending: false };
  const text = raw.charAt(0) + raw.slice(1).toLowerCase();
  return { text: text || "Pending", pending: true };
}

function vaPayInIban(account) {
  const full = String(account?.iban || "").replace(/\s+/g, "").trim();
  if (full) return { text: full, copy: full, complete: true };
  const last4 = String(account?.iban_last4 || "").trim();
  if (last4) return { text: `•••• ${last4}`, copy: "", complete: false };
  return { text: "—", copy: "", complete: false };
}

function isKycVerifiedCheck(userData) {
  return (
    Number(userData?.kycVerified) === 2 ||
    userData?.is_kyc_verify === 1 ||
    String(userData?.kyc_status || "").toUpperCase() === "APPROVED" ||
    String(userData?.kycStatus || "").toUpperCase() === "APPROVED"
  );
}

const DepositFiatScreen = () => {
  const { colors: themeColors, isDark } = useTheme();
  const userData = useAppSelector((state) => state.auth?.userData || state.user?.userData || {});

  const [vaLoading, setVaLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [creating, setCreating] = useState(false);
  const [widgetError, setWidgetError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [copiedField, setCopiedField] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [kycReason, setKycReason] = useState("required");
  const [faqActiveIndex, setFaqActiveIndex] = useState(null);

  // Bottom Sheet Refs
  const kycModalRef = useRef(null);
  const fiatFaqSheetRef = useRef(null);

  const isKycVerified = useMemo(() => isKycVerifiedCheck(userData), [userData]);

  const openKycModal = useCallback((reason = "required") => {
    setKycReason(reason === "incomplete" ? "incomplete" : "required");
    kycModalRef.current?.open?.();
  }, []);

  // Fetch Virtual Account (web logic parity)
  const fetchVirtualAccount = useCallback(async () => {
    setVaLoading(true);
    setWidgetError("");
    setLoadFailed(false);
    try {
      const res = await appOperation.customer.fiat_virtual_account_me().catch((err) => err);
      if (res?.success && res?.data) {
        setAccount(res.data);
      } else if (res?.code === "VA_NOT_FOUND" || res?.notFound || res?.message?.toLowerCase().includes("not found")) {
        setAccount(null);
      } else {
        setAccount(null);
        setLoadFailed(true);
        setWidgetError(res?.message || res?.error?.message || "Could not check fiat account status.");
      }
    } catch {
      setAccount(null);
      setLoadFailed(true);
      setWidgetError("Could not check fiat account status.");
    } finally {
      setVaLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVirtualAccount();
  }, [fetchVirtualAccount]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVirtualAccount();
    setRefreshing(false);
  };

  // Copy to clipboard with instant feedback
  const handleCopy = (text, fieldName, label) => {
    if (!text) return;
    Clipboard.setString(String(text));
    setCopiedField(fieldName);
    Toast.showWithGravity(`${label} copied`, Toast.SHORT, Toast.BOTTOM);
    setTimeout(() => {
      setCopiedField((cur) => (cur === fieldName ? "" : cur));
    }, 2000);
  };

  // Create Virtual Account Handler (exact web logic)
  const handleCreateAccount = useCallback(async () => {
    if (creating) return;

    if (!isKycVerified) {
      openKycModal("required");
      return;
    }

    setCreating(true);
    setWidgetError("");
    try {
      const key = `va_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const res = await appOperation.customer
        .fiat_virtual_account_create({}, { "Idempotency-Key": key })
        .catch((err) => err);

      if (res?.success && res?.data) {
        setAccount(res.data);
        setLoadFailed(false);
        Toast.showWithGravity("Bank account created.", Toast.LONG, Toast.BOTTOM);
        return;
      }

      const code = res?.code || res?.error?.code;
      if (code === "KYC_REQUIRED") {
        openKycModal("required");
        return;
      }
      if (code === "KYC_PROFILE_INCOMPLETE") {
        openKycModal("incomplete");
        return;
      }
      const msg = res?.message || res?.error?.message || "Could not create virtual account. Please try again.";
      setWidgetError(msg);
      Toast.showWithGravity(msg, Toast.LONG, Toast.BOTTOM);
    } catch {
      setWidgetError("Could not create virtual account. Please try again.");
    } finally {
      setCreating(false);
    }
  }, [creating, isKycVerified, openKycModal]);

  // Color tokens
  const bgColor = themeColors.background;
  const cardBg = isDark ? "rgba(255,255,255,0.05)" : "#FFFFFF";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB";
  const textColor = isDark ? "#FFFFFF" : "#111827";
  const subTextColor = isDark ? "rgba(255,255,255,0.55)" : "#6B7280";
  const badgeBg = isDark ? "rgba(255,255,255,0.08)" : "#EDF2F7";

  const payIn = vaPayInIban(account);
  const statusChip = vaStatusChip(account?.status);
  const accountNo = String(account?.account_id || "").trim();

  const activeBadgeBg = statusChip.pending
    ? (isDark ? "rgba(209, 170, 103, 0.15)" : "#FEF3C7")
    : (isDark ? "rgba(34, 197, 94, 0.18)" : "#DCFCE7");

  const activeBadgeText = statusChip.pending
    ? (isDark ? "#D1AA67" : "#D97706")
    : (isDark ? "#22C55E" : "#15803D");

  const activeBadgeBorder = statusChip.pending
    ? (isDark ? "rgba(209, 170, 103, 0.3)" : "rgba(217, 119, 6, 0.3)")
    : (isDark ? "rgba(34, 197, 94, 0.3)" : "rgba(22, 163, 74, 0.3)");

  // Create card button label & action logic
  let primaryBtnLabel = "Create bank account";
  if (vaLoading) primaryBtnLabel = "Checking account…";
  else if (creating) primaryBtnLabel = "Creating bank account…";
  else if (loadFailed) primaryBtnLabel = "Try again";

  const handlePrimaryBtnPress = loadFailed ? fetchVirtualAccount : handleCreateAccount;

  return (
    <AppSafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
      {/* Top Header with History Icon */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity
          onPress={() => NavigationService.goBack()}
          style={styles.headerBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <FastImage
            source={back_ic}
            style={styles.backIcon}
            resizeMode={FastImage.resizeMode.contain}
          />
        </TouchableOpacity>

        <AppText type={EIGHTEEN} weight={BOLD} color={textColor}>
          Deposit Fiat
        </AppText>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity
            onPress={() => {
              setFaqActiveIndex(null);
              fiatFaqSheetRef.current?.open?.();
            }}
            style={styles.headerBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <FastImage
              source={INFO}
              style={styles.headerInfoIcon}
              resizeMode={FastImage.resizeMode.contain}
              tintColor={textColor}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => NavigationService.navigate(DEPOSIT_FIAT_HISTORY_SCREEN)}
            style={styles.headerBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <FastImage
              source={historyIcon}
              style={styles.historyHeaderIcon}
              resizeMode={FastImage.resizeMode.contain}
              tintColor={textColor}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyanTheme} />}
      >
        {/* Hero Banner Section (Compact Sleek Layout) */}
        <View style={[styles.heroCard, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.gatewayPill}>
            <AppText type={TEN} weight={BOLD} style={styles.gatewayPillText} color={colors.cyanTheme}>
              FIAT GATEWAY
            </AppText>
          </View>

          <AppText type={EIGHTEEN} weight={BOLD} style={styles.heroHeading} color={textColor}>
            Deposit Fiat.{" "}
            <AppText type={EIGHTEEN} weight={BOLD} color={colors.cyanTheme}>Buy Crypto Seamlessly.</AppText>
          </AppText>

          <AppText type={TWELVE} style={styles.heroSub} color={subTextColor}>
            Add funds to your Coincode account via UAE bank transfer and start trading.
          </AppText>

          {/* 3 Features with exact Web SVG Icons */}
          <View style={styles.featureList}>
            <View style={styles.featureRow}>
              <View style={styles.featureIconBadge}>
                <SecurityShieldIcon size={15} color="#D1AA67" />
              </View>
              <View style={styles.featureTextWrap}>
                <AppText type={THIRTEEN} weight={BOLD} style={styles.featureTitle} color={textColor}>
                  Bank-Level Security
                </AppText>
                <AppText type={ELEVEN} style={styles.featureDesc} color={subTextColor}>
                  Your funds are protected with advanced security systems.
                </AppText>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureIconBadge}>
                <InstantBoltIcon size={15} color="#D1AA67" />
              </View>
              <View style={styles.featureTextWrap}>
                <AppText type={THIRTEEN} weight={BOLD} style={styles.featureTitle} color={textColor}>
                  Instant Processing
                </AppText>
                <AppText type={ELEVEN} style={styles.featureDesc} color={subTextColor}>
                  Fast deposits so you can start trading right away.
                </AppText>
              </View>
            </View>

            <View style={styles.featureRow}>
              <View style={styles.featureIconBadge}>
                <GlobalGlobeIcon size={15} color="#D1AA67" />
              </View>
              <View style={styles.featureTextWrap}>
                <AppText type={THIRTEEN} weight={BOLD} style={styles.featureTitle} color={textColor}>
                  UAE AED Rail
                </AppText>
                <AppText type={ELEVEN} style={styles.featureDesc} color={subTextColor}>
                  Deposit AED via your dedicated Zand virtual IBAN.
                </AppText>
              </View>
            </View>
          </View>
        </View>

        {/* Dynamic Widget: Virtual Account VS Create Bank Account */}
        {vaLoading ? (
          <View style={[styles.loadingBox, { backgroundColor: cardBg, borderColor }]}>
            <ActivityIndicator size="small" color={colors.cyanTheme} />
            <AppText type={THIRTEEN} style={styles.loadingText} color={subTextColor}>
              Checking virtual account…
            </AppText>
          </View>
        ) : account ? (
          /* Case A: Virtual Account Info Card */
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.vaHeader}>
              <View>
                <AppText type={TWELVE} weight={MEDIUM} style={styles.vaKicker} color={subTextColor}>
                  Virtual Account
                </AppText>
                <View style={styles.vaBadgeRow}>
                  <View
                    style={[
                      styles.activePill,
                      {
                        backgroundColor: activeBadgeBg,
                        borderColor: activeBadgeBorder,
                      },
                    ]}
                  >
                    <AppText type={TWELVE} weight={BOLD} color={activeBadgeText}>
                      {statusChip.text}
                    </AppText>
                  </View>
                  <AppText type={FOURTEEN} weight={SEMI_BOLD} color={subTextColor}>
                    {account.currency || "AED"}
                  </AppText>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => NavigationService.navigate(WITHDRAW_FIAT_SCREEN)}
                style={styles.withdrawLink}
                activeOpacity={0.7}
              >
                <AppText type={TWELVE} weight={SEMI_BOLD} color={colors.cyanTheme}>
                  Fiat Withdrawal ›
                </AppText>
              </TouchableOpacity>
            </View>

            {/* Account Name */}
            <View style={[styles.kvRow, { alignItems: "flex-start" }]}>
              <AppText type={THIRTEEN} weight={MEDIUM} color={subTextColor} style={styles.kvLabel}>
                Account name
              </AppText>
              <AppText type={FOURTEEN} weight={BOLD} color={textColor} style={styles.kvValueText}>
                {account.account_name || "—"}
              </AppText>
            </View>

            {/* Bank */}
            <View style={styles.kvRow}>
              <AppText type={THIRTEEN} weight={MEDIUM} color={subTextColor} style={styles.kvLabel}>
                Bank
              </AppText>
              <AppText type={FOURTEEN} weight={BOLD} color={textColor} style={styles.kvValueText}>
                {account.bank_name || "Zand Bank"}
              </AppText>
            </View>

            {/* Account Number */}
            <View style={styles.kvRow}>
              <AppText type={THIRTEEN} weight={MEDIUM} color={subTextColor} style={styles.kvLabel}>
                Account no
              </AppText>
              <View style={styles.copyableValueRow}>
                <AppText type={FOURTEEN} weight={BOLD} color={textColor} style={styles.copyableText}>
                  {accountNo || "—"}
                </AppText>
                {accountNo ? (
                  <TouchableOpacity
                    onPress={() => handleCopy(accountNo, "account_no", "Account no")}
                    style={[
                      styles.copyIconButton,
                      { backgroundColor: copiedField === "account_no" ? "rgba(16,185,129,0.15)" : badgeBg },
                    ]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    {copiedField === "account_no" ? (
                      <CopiedCheckIcon size={14} color="#10B981" />
                    ) : (
                      <CopyIcon size={14} color={isDark ? "#D1AA67" : "#B45309"} />
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* IBAN */}
            <View style={styles.kvRow}>
              <AppText type={THIRTEEN} weight={MEDIUM} color={subTextColor} style={styles.kvLabel}>
                IBAN
              </AppText>
              <View style={styles.copyableValueRow}>
                <AppText
                  type={FOURTEEN}
                  weight={BOLD}
                  color={textColor}
                  style={styles.copyableText}
                  numberOfLines={1}
                >
                  {payIn.text}
                </AppText>
                {payIn.copy ? (
                  <TouchableOpacity
                    onPress={() => handleCopy(payIn.copy, "iban", "IBAN")}
                    style={[
                      styles.copyIconButton,
                      { backgroundColor: copiedField === "iban" ? "rgba(16,185,129,0.15)" : badgeBg },
                    ]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    {copiedField === "iban" ? (
                      <CopiedCheckIcon size={14} color="#10B981" />
                    ) : (
                      <CopyIcon size={14} color={isDark ? "#D1AA67" : "#B45309"} />
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {!payIn.complete && payIn.text !== "—" ? (
              <AppText type={ELEVEN} color="#F59E0B" style={{ marginVertical: 6 }}>
                Full IBAN is not available. Use last4 above and contact support if your bank needs the complete number.
              </AppText>
            ) : null}

            {/* Created At */}
            <View style={styles.kvRow}>
              <AppText type={THIRTEEN} weight={MEDIUM} color={subTextColor} style={styles.kvLabel}>
                Created
              </AppText>
              <AppText type={FOURTEEN} weight={BOLD} color={textColor} style={styles.kvValueText}>
                {formatCreatedDate(account.created_at)}
              </AppText>
            </View>

            {/* How to deposit instruction notice */}
            <View style={[styles.instructionBox, { backgroundColor: isDark ? "rgba(212,175,55,0.08)" : "#FFF9E6", borderColor: isDark ? "rgba(212,175,55,0.25)" : "#FDE68A" }]}>
              <AppText type={TWELVE} style={styles.instructionText} color={isDark ? "#F3E8B6" : "#92400E"}>
                <AppText type={TWELVE} weight={BOLD} color={isDark ? "#F3E8B6" : "#92400E"}>How to deposit: </AppText>
                Transfer any AED amount from your UAE bank to this IBAN. Use the account name above as the beneficiary name. Funds credit to spot AED after the bank processes the transfer.
              </AppText>
            </View>
          </View>
        ) : (
          /* Case B: Create Bank Account Card */
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <View style={styles.cardHeaderRow}>
              <AppText type={EIGHTEEN} weight={BOLD} style={styles.cardTitle} color={textColor}>
                Deposit Fiat
              </AppText>
              <TouchableOpacity
                onPress={() => NavigationService.navigate(WITHDRAW_FIAT_SCREEN)}
                style={styles.withdrawLink}
                activeOpacity={0.7}
              >
                <AppText type={TWELVE} weight={SEMI_BOLD} color={colors.cyanTheme}>
                  Fiat Withdrawal ›
                </AppText>
              </TouchableOpacity>
            </View>

            {widgetError ? (
              <View style={styles.errorBanner}>
                <AppText type={THIRTEEN} color="#EF4444">{widgetError}</AppText>
              </View>
            ) : null}

            {/* Currency Input Box */}
            <AppText type={THIRTEEN} weight={SEMI_BOLD} style={styles.fieldLabel} color={subTextColor}>
              Currency
            </AppText>
            <View style={[styles.currencySelectorBox, { backgroundColor: badgeBg, borderColor }]}>
              <View style={styles.currencyFlag}>
                <UaeFlagIcon width={24} height={16} />
              </View>
              <AppText type={SIXTEEN} weight={BOLD} style={styles.currencyCode} color={textColor}>
                AED
              </AppText>
              <View style={styles.currencyPill}>
                <AppText type={ELEVEN} weight={SEMI_BOLD} color="#8A94A6">
                  UAE Dirham
                </AppText>
              </View>
            </View>

            {/* Payment Method Card */}
            <AppText type={THIRTEEN} weight={SEMI_BOLD} style={[styles.fieldLabel, { marginTop: 16 }]} color={subTextColor}>
              Payment Method
            </AppText>
            <View style={[styles.methodCard, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB", borderColor }]}>
              <View style={styles.methodHeader}>
                <View style={styles.methodTitleRow}>
                  <AppText type={FIFTEEN} weight={BOLD} color={textColor}>
                    Bank Transfer (UAE)
                  </AppText>
                  <View style={styles.recommendedBadge}>
                    <AppText type={TEN} weight={BOLD} color={colors.cyanTheme}>
                      Recommended
                    </AppText>
                  </View>
                </View>
                <FastImage source={checkIc} style={styles.checkIcon} resizeMode="contain" tintColor="#10B981" />
              </View>

              <AppText type={TWELVE} weight={SEMI_BOLD} style={styles.methodSub} color={colors.cyanTheme}>
                Virtual IBAN • Zand Bank
              </AppText>
              <AppText type={TWELVE} style={styles.methodDesc} color={subTextColor}>
                Create one virtual IBAN linked to your verified identity, then transfer AED from your UAE bank. You cannot create a second account.
              </AppText>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              onPress={handlePrimaryBtnPress}
              disabled={creating || vaLoading}
              activeOpacity={0.85}
              style={[styles.primaryBtn, { backgroundColor: colors.cyanTheme }]}
            >
              {creating ? (
                <ActivityIndicator color={"#000000"} size="small" />
              ) : (
                <AppText type={FIFTEEN} weight={BOLD} color="#000000">
                  {primaryBtnLabel}
                </AppText>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* KYC Required Modal (Exact web parity) */}
      <AnimatedBottomSheet
        ref={kycModalRef}
        sheetHeight={340}
        isDark={isDark}
      >
        <View style={styles.kycModalInner}>
          <View style={styles.kycModalIconBadge}>
            <SecurityShieldIcon size={32} color="#D1AA67" />
          </View>
          <AppText type={EIGHTEEN} weight={BOLD} style={styles.kycModalTitle} color={textColor}>
            {kycReason === "incomplete" ? "KYC details incomplete" : "Identity verification required"}
          </AppText>
          <AppText type={THIRTEEN} style={styles.kycModalDesc} color={subTextColor}>
            {kycReason === "incomplete"
              ? "Your verified profile is missing details the bank needs (name, date of birth, document number, nationality, or expiry). Open KYC to update your documents — creating another virtual account will not fix this."
              : "Complete KYC before creating a virtual IBAN. After verification you can deposit AED via bank transfer."}
          </AppText>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              kycModalRef.current?.close?.();
              NavigationService.navigate(KYC_STATUS_SCREEN);
            }}
            style={[styles.primaryBtn, { backgroundColor: colors.cyanTheme, width: "100%", marginTop: 24 }]}
          >
            <AppText type={FIFTEEN} weight={BOLD} color="#000000">
              {kycReason === "incomplete" ? "Update KYC" : "Verify now"}
            </AppText>
          </TouchableOpacity>
        </View>
      </AnimatedBottomSheet>

      {/* Fiat Deposit Help / FAQ Bottom Sheet (Exact UI parity with DepositCoin.tsx) */}
      {/* @ts-ignore */}
      <RBSheet
        customModalProps={{ statusBarTranslucent: true }}
        ref={fiatFaqSheetRef}
        height={Math.round(Dimensions.get("window").height * 0.72) - 200}
        closeOnDragDown
        closeOnPressMask
        customStyles={{
          container: {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: themeColors.background,
          },
          wrapper: { backgroundColor: "rgba(0,0,0,0.6)" },
          draggableIcon: { backgroundColor: colors.textGray },
        }}
      >
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 }}>
          <View style={styles.modalHeader}>
            <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: themeColors.text }}>
              Deposit Fiat Help
            </AppText>
            <TouchableOpacity
              onPress={() => fiatFaqSheetRef.current?.close()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <AppText type={TWENTY} style={{ color: themeColors.text }}>
                ×
              </AppText>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {FIAT_FAQ_DATA.map((item, index) => (
              <View
                key={String(index)}
                style={[
                  styles.faqItemInner,
                  index === FIAT_FAQ_DATA.length - 1 && styles.faqItemInnerLast,
                  { borderColor: colors.inputBorder },
                ]}
              >
                <TouchableOpacity
                  style={styles.faqQuestionRow}
                  onPress={() =>
                    setFaqActiveIndex(faqActiveIndex === index ? null : index)
                  }
                  activeOpacity={0.7}
                >
                  <AppText
                    type={THIRTEEN}
                    weight={SEMI_BOLD}
                    style={[styles.faqQuestion, { color: themeColors.secondaryText }]}
                  >
                    {item.title}
                  </AppText>
                  <FastImage
                    source={faqActiveIndex === index ? upIcon : downIcon}
                    resizeMode="contain"
                    style={styles.faqArrow}
                    tintColor={themeColors.secondaryText}
                  />
                </TouchableOpacity>
                {faqActiveIndex === index && (
                  <View style={styles.faqAnswer}>
                    {item.content.split("\n").map((line, lineIndex) => (
                      <AppText
                        key={lineIndex}
                        type={TWELVE}
                        style={{ color: themeColors.secondaryText, lineHeight: 18 }}
                      >
                        {line}
                      </AppText>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Bottom Note & Deposit Crypto Link */}
          <View style={{ borderTopWidth: 1, borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0", paddingTop: 14, marginTop: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-start", flexWrap: "wrap" }}>
              <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>
                Looking to deposit crypto assets instead?{" "}
              </AppText>
              <TouchableOpacity
                onPress={() => {
                  fiatFaqSheetRef.current?.close();
                  NavigationService.navigate(DEPOSIT_COIN_SCREEN);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <AppText type={TWELVE} weight={BOLD} color={colors.cyanTheme}>
                  Deposit Crypto ›
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </RBSheet>
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    padding: 6,
  },
  headerInfoIcon: {
    width: 18,
    height: 18,
  },
  backIcon: {
    width: 35,
    height: 35,
  },
  historyHeaderIcon: {
    width: 22,
    height: 22,
  },
  scrollContent: {
    padding: 16,
  },
  heroCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  gatewayPill: {
    backgroundColor: "rgba(212,175,55,0.15)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  gatewayPillText: {
    letterSpacing: 0.5,
  },
  heroHeading: {
    lineHeight: 24,
    marginBottom: 6,
  },
  heroSub: {
    lineHeight: 16,
    marginBottom: 14,
  },
  featureList: {
    gap: 10,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(209, 170, 103, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(209, 170, 103, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    marginBottom: 1,
  },
  featureDesc: {
    lineHeight: 15,
  },
  loadingBox: {
    padding: 30,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 10,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  cardTitle: {
    marginBottom: 0,
  },
  withdrawLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  vaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  vaKicker: {
    marginBottom: 4,
  },
  vaBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activePill: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  kvLabel: {
    width: 100,
  },
  kvValueText: {
    flex: 1,
    textAlign: "right",
    lineHeight: 20,
  },
  copyableValueRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  copyableText: {
    flexShrink: 1,
    textAlign: "right",
  },
  copyIconButton: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  instructionBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
  },
  instructionText: {
    lineHeight: 18,
  },
  errorBanner: {
    backgroundColor: "rgba(239,68,68,0.12)",
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  fieldLabel: {
    marginBottom: 8,
  },
  currencySelectorBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  currencyFlag: {
    marginRight: 10,
  },
  currencyCode: {
    marginRight: 10,
  },
  currencyPill: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  methodCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 18,
  },
  methodHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  methodTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recommendedBadge: {
    backgroundColor: "rgba(212,175,55,0.15)",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  checkIcon: {
    width: 18,
    height: 18,
  },
  methodSub: {
    marginBottom: 6,
  },
  methodDesc: {
    lineHeight: 16,
  },
  primaryBtn: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionWrap: {
    marginTop: 10,
    marginBottom: 16,
  },
  sectionHeading: {
    marginBottom: 12,
  },
  stepsScroll: {
    gap: 12,
    paddingRight: 16,
    paddingVertical: 4,
  },
  stepCard: {
    width: 210,
    minHeight: 185,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  stepCircleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(209, 170, 103, 0.4)",
    backgroundColor: "rgba(209, 170, 103, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  stepTitle: {
    textAlign: "center",
    marginBottom: 8,
  },
  stepDesc: {
    textAlign: "center",
    lineHeight: 18,
  },
  kycModalInner: {
    flex: 1,
    padding: 24,
    alignItems: "center",
  },
  kycModalIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(209, 170, 103, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(209, 170, 103, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  kycModalTitle: {
    marginBottom: 8,
    textAlign: "center",
  },
  kycModalDesc: {
    lineHeight: 18,
    textAlign: "center",
  },
  faqSectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalList: {
    flex: 1,
  },
  faqItemInner: {
    paddingVertical: 12,
    borderBottomWidth: 0.7,
    borderBottomColor: colors.iconBgColor,
  },
  faqItemInnerLast: {
    borderBottomWidth: 0,
  },
  faqQuestionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQuestion: {
    flex: 1,
  },
  faqArrow: {
    width: 10,
    height: 10,
    marginLeft: 8,
  },
  faqAnswer: {
    marginTop: 10,
    paddingTop: 10,
  },
});

export default DepositFiatScreen;
