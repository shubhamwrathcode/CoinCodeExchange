import React, { useCallback, useEffect, useState, useRef } from "react";
import { Animated, AppState, Dimensions, StyleSheet, TouchableOpacity, View, ScrollView, FlatList, useWindowDimensions, Modal, Linking } from "react-native";
import {
  AppSafeAreaView,
  AppText,
  Button,
  RED,
  SEMI_BOLD,
  FOURTEEN,
  SIXTEEN,
  TWELVE,
  THIRTEEN,
  ELEVEN,
  EIGHTEEN,
  BOLD,
  TEN,
  TWENTY_TWO,
  MEDIUM,
  TWENTY,
  FIFTEEN,
} from "../../shared";
import FastImage from "react-native-fast-image";
import {
  kyc_pending,
  closeIcon,
  checkIc,
  downIcon,
  upIcon,
  kyc_verification_vector,
  withdrawIcon,
  depositIcon,
  p2p_Icon,
  tradeIcon,
  giftIc,
  verification_gift,
  identity_verification,
  newLock,
  failed,
  bonus_image,
  verify_lock,
  pending_kyc,
  kyc_success_vector,
  kyc_complete,
  verified_kyc,
  back_ic,
  succescelebrate,
} from "../../helper/ImageAssets";
import KeyBoardAware from "../../shared/components/KeyboardAware";
import NavigationService from "../../navigation/NavigationService";
import { KYC_STEP_ONE_SCREEN, KYC_RESUBMIT_SCREEN, CREATE_TICKET_SCREEN } from "../../navigation/routes";
import { useFocusEffect } from "@react-navigation/native";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { setLoading } from "../../slices/authSlice";
import { getUserProfile, getKycStatus, getKybStatus, createKycSession, createKybSession } from "../../actions/accountActions";
import { KYB_FAQ, slimKybStatusPayload } from "../../helper/kybDisplayFields";
import { resolveKybView } from "./KybStatusViews";
import KycStepHeader from "./KycStepHeader";
import { useTheme } from "../../hooks/useTheme";
import WebView from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import RBSheet from "react-native-raw-bottom-sheet";
import { colors, lightTheme } from "../../theme/colors";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SHIMMER_STRIP = 180;
const SIDE_PAD = 16;
const CARD_W = SCREEN_WIDTH - SIDE_PAD * 2;

// ─── Shimmer cell ────────────────────────────────────────────────────────────
const ShimmerCell = ({ width: w, height, borderRadius = 6, style }) => {
  const { colors: themeColors, isDark } = useTheme();
  const shimmerX = useRef(new Animated.Value(-SHIMMER_STRIP)).current;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const run = () => {
      if (!mounted.current) return;
      shimmerX.setValue(-SHIMMER_STRIP);
      Animated.timing(shimmerX, {
        toValue: Math.max(w, 1) + SHIMMER_STRIP,
        duration: 1100,
        useNativeDriver: true,
      }).start(({ finished }) => { if (mounted.current && finished) run(); });
    };
    const t = setTimeout(run, 50);
    return () => { mounted.current = false; clearTimeout(t); shimmerX.stopAnimation(); };
  }, [shimmerX, w]);
  return (
    <View style={[{ width: w, height, borderRadius, overflow: "hidden", backgroundColor: themeColors.themeElevationColor }, style]}>
      <Animated.View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, bottom: 0, width: SHIMMER_STRIP, transform: [{ translateX: shimmerX }], backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)" }}
      />
    </View>
  );
};

// ─── KYC Status card skeleton (only the dynamic top card) ────────────────────
const KycStatusSkeleton = () => {
  const { colors: themeColors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", paddingTop: 10 }}>
      {/* Avatar Skeleton */}
      <ShimmerCell width={70} height={70} borderRadius={35} style={{ marginBottom: 16 }} />

      {/* Name & Badge Skeleton */}
      <ShimmerCell width={180} height={18} borderRadius={4} style={{ marginBottom: 10 }} />
      <ShimmerCell width={100} height={26} borderRadius={8} style={{ marginBottom: 25 }} />

      {/* Message Box Skeleton */}
      <ShimmerCell width={CARD_W} height={80} borderRadius={12} style={{ marginBottom: 25 }} />

      {/* Button Skeleton */}
      <ShimmerCell width={CARD_W} height={48} borderRadius={12} style={{ marginBottom: 20 }} />
      <ShimmerCell width={80} height={14} borderRadius={4} style={{ marginBottom: 30 }} />

      {/* Reward Card Skeleton */}
      <ShimmerCell width={CARD_W} height={70} borderRadius={16} style={{ marginBottom: 25 }} />

      {/* Table Skeleton */}
      <View style={{ width: "100%", marginTop: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15 }}>
          <ShimmerCell width={80} height={12} borderRadius={4} />
          <ShimmerCell width={60} height={12} borderRadius={4} />
          <ShimmerCell width={60} height={12} borderRadius={4} />
        </View>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.03)" }}>
            <ShimmerCell width={100} height={14} borderRadius={4} />
            <ShimmerCell width={30} height={14} borderRadius={4} />
            <ShimmerCell width={16} height={16} borderRadius={8} />
          </View>
        ))}
      </View>
    </View>
  );
};

/** Matches `arab_global_exchange` KycPage `displayName` useMemo + `ViewComplete` / `ViewFailed` initials. */
const KYC_AVATAR_GRADIENT = ["#a684ff", "#ad46ff", "#4f39f6"];
const KYC_AVATAR_GRADIENT_LOCATIONS = [0, 0.5, 1];

function kycWebAlignedDisplayName(userData) {
  const name = userData?.display_name || userData?.user_login || userData?.user_nicename;
  if (name) return `AGCE ${name}`;

  const e = userData?.emailId ?? userData?.email;
  if (!e) return "AGCE User";
  const local = String(e).split("@")[0];
  return `AGCE User-${local.slice(0, 8)}`;
}

const LEGACY_STATUS_TO_CANONICAL = {
  draft: "NOT_STARTED",
  submitted: "PENDING",
  under_review: "PENDING",
  approved: "APPROVED",
  rejected: "REJECTED",
  expired: "EXPIRED",
};

const CANONICAL_SET = new Set(["NOT_STARTED", "PENDING", "APPROVED", "REJECTED", "EXPIRED", "RESUBMISSION_REQUESTED"]);

function toCanonicalStatus(raw) {
  if (raw == null || raw === "") return "";
  const s = String(raw).trim();
  const low = s.toLowerCase();
  if (LEGACY_STATUS_TO_CANONICAL[low]) return LEGACY_STATUS_TO_CANONICAL[low];
  const up = s.toUpperCase().replace(/-/g, "_");
  if (CANONICAL_SET.has(up)) return up;
  if (["VERIFIED", "SUCCESS", "COMPLETE"].includes(up)) return "APPROVED";
  if (["IN_PROGRESS", "SUBMITTED", "PROCESSING", "REVIEW", "IN_REVIEW", "AWAITING", "INITIATED", "STARTED", "RESUBMITTED"].includes(up)) return "PENDING";
  if (["DECLINED", "FAILED", "CANCELLED"].includes(up)) return "REJECTED";
  return up;
}

function kycWebAlignedInitials(userData) {
  const name = userData?.display_name || userData?.user_login || userData?.user_nicename || "User";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function KycAvatarInitialsRing({ initials }) {
  return (
    <LinearGradient
      colors={KYC_AVATAR_GRADIENT}
      locations={KYC_AVATAR_GRADIENT_LOCATIONS}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: 64,
        height: 64,
        borderRadius: 36,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AppText type={FIFTEEN} style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "400", letterSpacing: -0.45 }}>
        {initials}
      </AppText>
    </LinearGradient>
  );
}

const KycPending = ({ showResubmitButton, onResubmitPress, diditVendorStatus, onVerifyPress, isKyb }) => {
  const { colors: themeColors, isDark } = useTheme();
  const userData = useAppSelector((state) => state.auth.userData);
  const isLoading = useAppSelector((state) => state.auth.isLoading);

  const displayName = kycWebAlignedDisplayName(userData);
  const initials = kycWebAlignedInitials(userData);
  const orangeColor = "#F59E0B";
  const isInProgress = diditVendorStatus === "In Progress";

  return (
    <View style={{ flex: 1, alignItems: "center", paddingTop: 10 }}>
      {/* Profile Header */}
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <KycAvatarInitialsRing initials={initials} size={70} />
        <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginTop: 16, marginBottom: 8 }}>
          {displayName}
        </AppText>
        <View style={[styles.statusBadge, { backgroundColor: "rgba(245, 158, 11, 0.1)" }]}>
          <FastImage source={pending_kyc} style={{ width: 18, height: 18, marginRight: 6 }} tintColor={orangeColor} />
          <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: orangeColor }}>
            {isInProgress ? "In Progress" : "Pending"}
          </AppText>
        </View>
      </View>

      {/* Info Message Box */}
      <View style={[styles.statusMessageBox, { backgroundColor: isDark ? "#1E222D" : "#F9FAFB", borderLeftColor: orangeColor, borderLeftWidth: 4 }]}>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View style={[styles.statusIconWrap, { backgroundColor: "rgba(245, 158, 11, 0.1)" }]}>
            <FastImage source={pending_kyc} style={{ width: 24, height: 24 }} tintColor={orangeColor} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText type={TWELVE} style={{ color: themeColors.text, lineHeight: 20 }}>
              {isInProgress
                ? "Your verification session is still open. Resume it to complete the remaining steps."
                : `Your ${isKyb ? "Business" : "KYC"} verification is currently under review. Please ensure that the uploaded document is a clear photo of your original ID. Scanned or copied documents are not accepted.`}
            </AppText>
          </View>
        </View>
      </View>

      {/* Actions (if resubmit allowed) */}
      <View style={{ width: "100%", marginVertical: 20 }}>
        {(showResubmitButton || isInProgress) && (
          <Button
            children={isInProgress ? "Continue Verification" : "Update Information"}
            onPress={isInProgress ? onVerifyPress : onResubmitPress}
            loading={isLoading}
            containerStyle={[
              styles.primaryActionBtn,
              isDark && { backgroundColor: colors.white }
            ]}
            titleStyle={[
              styles.primaryActionBtnText,
              isDark && { color: colors.black }
            ]}
          />
        )}
        <TouchableOpacity
          onPress={() => NavigationService.navigate(CREATE_TICKET_SCREEN)}
          style={{ alignSelf: "center", marginTop: 12 }}
        >
          <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, textDecorationLine: "underline" }}>
            Need Help?
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Reward Banner */}
      <View style={[styles.kycRewardCard, { backgroundColor: isDark ? "#1E222D" : "#F9FAFB" }]}>
        <FastImage source={bonus_image} style={{ width: 64, height: 50, marginRight: 16 }} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: themeColors.text }}>
            Complete verification to receive{" "}
            <AppText type={FOURTEEN} style={{ color: colors.cyanTheme }} weight={MEDIUM}>exciting rewards</AppText>
          </AppText>
        </View>
      </View>

      {/* Privileges Table */}
      <View style={{ width: "100%", marginTop: 10 }}>
        <View style={styles.tableHeaderRow}>
          <AppText type={THIRTEEN} weight={MEDIUM} style={{ flex: 1.5, color: "#9CA3AF" }}>Privileges</AppText>
          <AppText type={THIRTEEN} weight={MEDIUM} style={{ flex: 1, color: "#9CA3AF", textAlign: "center" }}>Not Verified</AppText>
          <AppText type={THIRTEEN} weight={MEDIUM} style={{ flex: 1, color: "#9CA3AF", textAlign: "right" }}>Verified</AppText>
        </View>
        {[
          { label: "Withdrawal", value: "--", locked: true },
          { label: "Deposit", value: "--", locked: true },
          { label: "Trading", value: "--", locked: true },
          { label: "P2P", value: "--", locked: true },
        ].map((item, idx) => (
          <View key={idx} style={styles.tableDataRow}>
            <AppText type={FOURTEEN} weight={MEDIUM} style={{ flex: 1.5, color: themeColors.text }}>{item.label}</AppText>
            <AppText type={FOURTEEN} weight={MEDIUM} style={{ flex: 1, color: themeColors.text, textAlign: "center" }}>{item.value}</AppText>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <FastImage source={verify_lock} style={{ width: 16, height: 16 }} tintColor="#9CA3AF" />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const KycRejected = ({ onVerifyPress, isKyb }) => {
  const { colors: themeColors, isDark } = useTheme();
  const userData = useAppSelector((state) => state.auth.userData);
  const isLoading = useAppSelector((state) => state.auth.isLoading);
  const kyc_reject_reason = userData?.kyc_reject_reason;

  const displayName = kycWebAlignedDisplayName(userData);
  const initials = kycWebAlignedInitials(userData);
  const userId = userData?.user_id || "User-ID";

  return (
    <View style={{ flex: 1, alignItems: "center", paddingTop: 10 }}>
      {/* Profile Header */}
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <KycAvatarInitialsRing initials={initials} size={70} />
        <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginTop: 16, marginBottom: 8 }}>
          {displayName}
        </AppText>
        <View style={[styles.statusBadge, { backgroundColor: "rgba(239, 68, 68, 0.1)" }]}>
          <FastImage source={failed} style={{ width: 18, height: 18, marginRight: 6 }} tintColor={themeColors.red} />
          <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.red }}>Failed</AppText>
        </View>
      </View>

      {/* Error Message Box */}
      <View style={[styles.statusMessageBox, { backgroundColor: isDark ? "#1E222D" : "#F9FAFB", borderLeftColor: themeColors.red, borderLeftWidth: 4 }]}>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View style={[styles.statusIconWrap, { backgroundColor: 'transparent' }]}>
            <FastImage source={failed} style={{ width: 24, height: 24 }} tintColor={themeColors.red} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText type={TWELVE} style={{ color: themeColors.text, lineHeight: 20 }}>
              {kyc_reject_reason || `Your ${isKyb ? "business" : "identity"} verification is incomplete. Please submit the required details and complete facial recognition.`}
            </AppText>
          </View>
        </View>
      </View>

      {/* Primary Actions */}
      <View style={{ width: "100%", marginVertical: 20 }}>
        <Button
          children="Try Again"
          onPress={onVerifyPress}
          loading={isLoading}
          containerStyle={[
            styles.primaryActionBtn,
            isDark && { backgroundColor: colors.white }
          ]}
          titleStyle={[
            styles.primaryActionBtnText,
            isDark && { color: colors.black }
          ]}
        />
        <TouchableOpacity
          onPress={() => NavigationService.navigate(CREATE_TICKET_SCREEN)}
          style={{ alignSelf: "center", marginTop: 12 }}
        >
          <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: themeColors.text, textDecorationLine: "underline" }}>
            Need Help?
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Reward Banner */}
      <View style={[styles.kycRewardCard, { backgroundColor: isDark ? "#1E222D" : "#F9FAFB" }]}>
        <FastImage source={bonus_image} style={{ width: 64, height: 50, marginRight: 16 }} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: themeColors.text }}>
            Complete verification to receive{" "}
            <AppText style={{ color: colors.cyanTheme }} type={FOURTEEN} weight={MEDIUM}>Exciting Rewards</AppText>
          </AppText>
        </View>
      </View>

      {/* Privileges Table */}
      <View style={{ width: "100%", marginTop: 10 }}>
        <View style={styles.tableHeaderRow}>
          <AppText type={THIRTEEN} weight={MEDIUM} style={{ flex: 1.5, color: "#9CA3AF" }}>Privileges</AppText>
          <AppText type={THIRTEEN} weight={MEDIUM} style={{ flex: 1, color: "#9CA3AF", textAlign: "center" }}>Not Verified</AppText>
          <AppText type={THIRTEEN} weight={MEDIUM} style={{ flex: 1, color: "#9CA3AF", textAlign: "right" }}>Verified</AppText>
        </View>
        {[
          { label: "Withdrawal", value: "--", locked: true },
          { label: "Deposit", value: "--", locked: true },
          { label: "Trading", value: "--", locked: true },
          { label: "P2P", value: "--", locked: true },
        ].map((item, idx) => (
          <View key={idx} style={styles.tableDataRow}>
            <AppText type={FOURTEEN} weight={MEDIUM} style={{ flex: 1.5, color: themeColors.text }}>{item.label}</AppText>
            <AppText type={FOURTEEN} weight={MEDIUM} style={{ flex: 1, color: themeColors.text, textAlign: "center" }}>{item.value}</AppText>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <FastImage source={verify_lock} style={{ width: 16, height: 16 }} tintColor="#9CA3AF" />
            </View>
          </View>
        ))}
      </View>

    </View>
  );
};

const KycDue = ({ onVerifyPress, isKyb }) => {
  const { colors: themeColors, isDark } = useTheme();
  const isLoading = useAppSelector((state) => state.auth.isLoading);

  return (
    <View style={{ flex: 1, alignItems: "center", paddingTop: 20, justifyContent: 'space-between' }}>
      <View style={{ alignItems: 'center', width: '100%' }}>
        {/* Main Illustration */}
        <FastImage
          source={identity_verification}
          resizeMode="contain"
          style={{ width: 250, height: 180, marginBottom: 10 }}
        />

        {/* Title & Subtitle */}
        <AppText type={TWENTY_TWO} weight={SEMI_BOLD} style={{ color: themeColors.text, textAlign: "center", marginBottom: 10 }}>
          {isKyb ? "Complete Business Verification" : "Complete Identity Verification"}
        </AppText>
        <AppText type={FOURTEEN} style={{ color: "#6B7280", textAlign: "center", paddingHorizontal: 30, marginBottom: 12 }}>
          Unlock deposits, trading, and payments by verifying your account.
        </AppText>

        {/* Reward & Info Box */}
        <View style={[styles.rewardBox, { borderColor: lightTheme.input, borderWidth: 1, padding: 0, overflow: 'hidden' }]}>
          {/* Top Section with Background */}
          <View style={{ backgroundColor: isDark ? "#2A2E39" : lightTheme.input, padding: 12 }}>
            <View style={styles.rewardHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 1, marginRight: 8 }}>
                <FastImage source={newLock} style={{ width: 22, height: 22, marginRight: 10 }} tintColor="#B47D16" />
                <AppText type={FOURTEEN} style={{ color: themeColors.text }}>
                  Verify to claim <AppText type={FOURTEEN} style={{ color: "#D1AA67" }} weight={MEDIUM}>exciting rewards</AppText>
                </AppText>
              </View>
              {/* Mock Timer */}
              {/* <View style={{ flexDirection: "row", gap: 4, flexShrink: 0 }}>
                {["3D", "02", "23", "22"].map((t, i) => (
                  <View key={i} style={styles.timerBlock}>
                    <AppText type={TEN} weight={BOLD} style={{ color: "#FFF" }}>{t}</AppText>
                  </View>
                ))}
              </View> */}
            </View>
          </View>

          {/* Bottom Section (Transparent) */}
          <View style={{ padding: 16 }}>
            <View style={styles.checkStep}>
              <View style={[styles.bullet, {
                backgroundColor: isDark ? colors.white : lightTheme.input
              }]} />
              <AppText type={THIRTEEN} style={{ color: themeColors.text }}>Submit your basic details</AppText>
            </View>
            <View style={styles.checkStep}>
              <View style={[styles.bullet, {
                backgroundColor: isDark ? colors.white : lightTheme.input
              }]} />
              <AppText type={THIRTEEN} style={{ color: themeColors.text }}>Complete document & facial verification</AppText>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={{ width: "100%", paddingHorizontal: 0, paddingBottom: 30 }}>
        <Button
          children={isKyb ? "Verify KYB" : "Verify Now"}
          onPress={onVerifyPress}
          loading={isLoading}
          containerStyle={[
            styles.primaryActionBtn,
            isDark && { backgroundColor: colors.white }
          ]}
          titleStyle={[
            styles.primaryActionBtnText,
            isDark && { color: colors.black }
          ]}
        />
      </View>
    </View>
  );
};

const KycCompleted = ({ isKyb }) => {
  const { colors: themeColors, isDark } = useTheme();
  const userData = useAppSelector((state) => state.auth.userData);

  const displayName = kycWebAlignedDisplayName(userData);
  const initials = kycWebAlignedInitials(userData);
  const greenColor = themeColors.green || "#10B981";

  return (
    <View style={{ flex: 1, alignItems: "center", paddingTop: 10 }}>
      {/* Success Header */}
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <FastImage
          source={succescelebrate}
          style={{ width: 120, height: 120, marginBottom: 10 }}
          resizeMode="contain"
        />
        <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginTop: 10, marginBottom: 8 }}>
          {displayName}
        </AppText>
        <View style={[styles.statusBadge, { backgroundColor: "rgba(16, 185, 129, 0.1)" }]}>
          <FastImage source={kyc_complete} style={{ width: 18, height: 18, marginRight: 6 }} tintColor={greenColor} />
          <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: greenColor }}>Successful</AppText>
        </View>
      </View>

      {/* Info Message Box */}
      <View style={[styles.statusMessageBox, { backgroundColor: isDark ? "#1E222D" : "#F9FAFB", borderLeftColor: greenColor, borderLeftWidth: 4 }]}>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View style={[styles.statusIconWrap, {}]}>
            <FastImage source={kyc_complete} style={{ width: 24, height: 24 }} tintColor={greenColor} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText type={TWELVE} style={{ color: themeColors.text, lineHeight: 20 }}>
              Your {isKyb ? "business" : "identity"} verification is complete. You now have full access to all features, including higher limits and P2P trading.
            </AppText>
          </View>
        </View>
      </View>

      {/* Primary Actions */}
      <View style={{ width: "100%", marginVertical: 20 }}>
        <TouchableOpacity
          onPress={() => NavigationService.navigate(CREATE_TICKET_SCREEN)}
          style={{ alignSelf: "center", marginTop: 12 }}
        >
          <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: themeColors.text, textDecorationLine: "underline" }}>
            Need Help?
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Reward Banner */}
      <View style={[styles.kycRewardCard, { backgroundColor: isDark ? "#1E222D" : "#F9FAFB" }]}>
        <FastImage source={bonus_image} style={{ width: 64, height: 50, marginRight: 16 }} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: themeColors.text }}>
            Verification complete! You've received{" "}
            <AppText type={FOURTEEN} style={{ color: colors.cyanTheme }} weight={MEDIUM}>Exciting Rewards</AppText>
          </AppText>
        </View>
      </View>

      {/* Privileges Table */}
      <View style={{ width: "100%", marginTop: 10 }}>
        <View style={styles.tableHeaderRow}>
          <AppText type={THIRTEEN} weight={MEDIUM} style={{ flex: 1.5, color: "#9CA3AF" }}>Privileges</AppText>
          <AppText type={THIRTEEN} weight={MEDIUM} style={{ flex: 1, color: "#9CA3AF", textAlign: "center" }}>Not Verified</AppText>
          <AppText type={THIRTEEN} weight={MEDIUM} style={{ flex: 1, color: "#9CA3AF", textAlign: "right" }}>Verified</AppText>
        </View>
        {[
          { label: "Withdrawal", value: "--" },
          { label: "Deposit", value: "--" },
          { label: "Trading", value: "--" },
          { label: "P2P", value: "--" },
        ].map((item, idx) => (
          <View key={idx} style={styles.tableDataRow}>
            <AppText type={FOURTEEN} weight={MEDIUM} style={{ flex: 1.5, color: themeColors.text }}>{item.label}</AppText>
            <AppText type={FOURTEEN} weight={MEDIUM} style={{ flex: 1, color: themeColors.text, textAlign: "center" }}>{item.value}</AppText>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <FastImage source={verified_kyc} style={{ width: 16, height: 16 }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

/** Didit return: custom scheme from web `KycSubmittedPage`, or HTTPS success page from `createKycSession` `returnUrl`. */
function shouldCloseDiditKycWebView(url) {
  if (!url || typeof url !== "string") return false;
  const u = url.toLowerCase();
  console.log("[KYC WebView URL Check]:", u);
  if (u.startsWith("agce://")) return true;

  const closePatterns = [
    "/kyc/submitted",
    "/kyc/complete",
    "/kyc/success",
    "/kyc/finished",
    "/kyc/failed",
    "/kyc/return",
    "kyc_return=1",
    "open_in_app=1",
    "/user_profile",
    "/account",
    "/kyc/submitted"
  ];
  const shouldClose = closePatterns.some((p) => u.includes(p));
  if (shouldClose) console.log("[KYC WebView] Match found! Closing modal for URL:", u);
  return shouldClose;
}

const faqData = [
  { q: "How to complete individual KYC?", a: "Upload a valid government-issued ID, complete the liveness check when prompted, and submit your details in the Verification Center. This usually takes 2–5 minutes." },
  { q: "How to complete business KYC?", a: "Provide business registration documents, beneficial owner information, and any extra forms requested. Our team may review submissions as part of compliance checks." },
  { q: "Why is KYC verification required?", a: "To protect your assets and promote a secure, compliant crypto environment, AGCE requires all users to complete KYC (Know Your Customer) verification. This helps prevent fraud, money laundering, and other illicit activities. Once your KYC is verified, you'll gain access to key platform features including crypto deposits and withdrawals, P2P trading, and participation in events like Launchpool." },
  { q: "Why is an advanced verification necessary?", a: "Advanced verification unlocks higher limits. Rewards Hub with exclusive beginner rewards, and gain access to more platform features, including deposits, buy crypto, trade, and more." },
];

const KycStatus = ({ route }) => {
  const { colors: themeColors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const userData = useAppSelector((state) => state.auth.userData);
  const dispatch = useAppDispatch();
  const { width: screenWidth } = useWindowDimensions();
  const isLoading = useAppSelector((state) => state.auth.isLoading);
  const kycVerified = userData?.kycVerified != null ? Number(userData.kycVerified) : 0;

  const isKyb = route?.params?.from === 'kyb';

  const [idDocStatus, setIdDocStatus] = useState(null);
  const [taxDocStatus, setTaxDocStatus] = useState(null);
  const [selfieStatus, setSelfieStatus] = useState(null);
  const [submittedIdDocType, setSubmittedIdDocType] = useState(null);
  const [submittedTaxDocType, setSubmittedTaxDocType] = useState(null);
  const [documentsToResubmit, setDocumentsToResubmit] = useState([]);
  const [existingIdDocNumber, setExistingIdDocNumber] = useState("");
  const [existingTaxDocNumber, setExistingTaxDocNumber] = useState("");
  const [existingCountryCode, setExistingCountryCode] = useState("");
  const [statusCanonical, setStatusCanonical] = useState("");
  const [trackingStatus, setTrackingStatus] = useState("");
  const [kycVerifiedFromApi, setKycVerifiedFromApi] = useState(null);
  const [diditVendorStatus, setDiditVendorStatus] = useState("");
  const [kybPayload, setKybPayload] = useState(null);
  const [faqActiveIndex, setFaqActiveIndex] = useState(null);
  const [contentLoading, setContentLoading] = useState(true);
  const [diditWebviewUrl, setDiditWebviewUrl] = useState(null);
  /** After opening Didit (in-app WebView or external browser), refresh when user returns / flow completes. */
  const diditExternalOpenedRef = useRef(false);
  const diditWebCompleteOnceRef = useRef(false);

  const faqSheetRef = useRef(null);

  const applyKycStatusData = useCallback((data) => {
    if (!data) {
      return;
    }
    setIdDocStatus(data.id_document_status ?? null);
    setTaxDocStatus(data.tax_document_status ?? null);
    setSelfieStatus(data.selfie_status ?? null);
    if (data.kyc_data) {
      setSubmittedIdDocType(data.kyc_data.id_document_type ?? null);
      setSubmittedTaxDocType(data.kyc_data.tax_document_type ?? null);
      setExistingCountryCode(data.kyc_data.country_code ?? "");
      if (data.kyc_data.id_document_number) setExistingIdDocNumber(data.kyc_data.id_document_number);
      if (data.kyc_data.tax_document_number) setExistingTaxDocNumber(data.kyc_data.tax_document_number);
    }
    if (data.needs_resubmission) {
      setDocumentsToResubmit(data.documents_needing_resubmission || []);
    }
    setStatusCanonical(toCanonicalStatus(data.status));
    setTrackingStatus(data.trackingStatus || "");
    setDiditVendorStatus(data.diditVendorStatus || data.didit_vendor_status || data.diditStatus || data.didit_status || "");
    setKybPayload(slimKybStatusPayload(data));

    const apiTier = data.kycVerified ?? data.kyc_verified;
    if (apiTier !== undefined && apiTier !== null && apiTier !== "") {
      const n = Number(apiTier);
      if (Number.isFinite(n) && n >= 0 && n <= 4) {
        setKycVerifiedFromApi(n);
      }
    } else {
      const c = toCanonicalStatus(data.status);
      if (c === "APPROVED") setKycVerifiedFromApi(2);
      else if (c === "REJECTED") setKycVerifiedFromApi(3);
      else if (c === "PENDING" || c === "RESUBMISSION_REQUESTED") setKycVerifiedFromApi(1);
      else if (c === "NOT_STARTED" || c === "EXPIRED") setKycVerifiedFromApi(0);
      else setKycVerifiedFromApi(null);
    }
  }, []);

  const refreshAfterDiditFlow = useCallback(() => {
    diditExternalOpenedRef.current = false;
    dispatch(getUserProfile(false, false, true));
    const statusAction = isKyb ? getKybStatus() : getKycStatus();
    void dispatch(statusAction).then((data) => {
      applyKycStatusData(data);
    });
  }, [dispatch, applyKycStatusData, isKyb]);

  const closeDiditWebview = useCallback(() => {
    diditWebCompleteOnceRef.current = false;
    setDiditWebviewUrl(null);
    diditExternalOpenedRef.current = false;
    refreshAfterDiditFlow();
  }, [refreshAfterDiditFlow]);

  const tryFinishDiditFromUrl = useCallback(
    (url) => {
      if (!url) return;
      const u = url.toLowerCase();
      console.log("[KYC tryFinishDiditFromUrl Check]:", u);

      const shouldClose = shouldCloseDiditKycWebView(u);
      if (!shouldClose || diditWebCompleteOnceRef.current) {
        if (diditWebCompleteOnceRef.current) {
          console.log("[KYC tryFinishDiditFromUrl] Already completed once, skipping.");
        }
        return;
      }

      console.log("[KYC tryFinishDiditFromUrl] SUCCESS: Closing WebView and refreshing status.");
      diditWebCompleteOnceRef.current = true;
      setDiditWebviewUrl(null);
      diditExternalOpenedRef.current = false;
      refreshAfterDiditFlow();
    },
    [refreshAfterDiditFlow]
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active" && diditExternalOpenedRef.current && !diditWebviewUrl) {
        refreshAfterDiditFlow();
      }
    });
    return () => sub.remove();
  }, [diditWebviewUrl, refreshAfterDiditFlow]);

  useFocusEffect(
    useCallback(() => {
      dispatch(setLoading(true));
      return () => {
        dispatch(setLoading(false));
      };
    }, [dispatch])
  );

  useEffect(() => {
    dispatch(getUserProfile());
  }, [dispatch]);

  // Initial Fetch & Polling
  useEffect(() => {
    let mounted = true;

    const fetchStatus = async () => {
      const statusAction = isKyb ? getKybStatus() : getKycStatus();
      const data = await dispatch(statusAction);
      if (!mounted) return;

      setContentLoading(false);
      dispatch(setLoading(false));

      if (!data) return;
      applyKycStatusData(data);
    };

    fetchStatus(); // initial fetch

    // Poll every 3 seconds if not Approved (2) or Rejected (3)
    let intervalId = null;
    const effectiveTier = kycVerifiedFromApi !== null ? kycVerifiedFromApi : kycVerified;

    if (effectiveTier !== 2 && effectiveTier !== 3) {
      intervalId = setInterval(() => {
        dispatch(getUserProfile(false, false, true)); // Skip global loading
        fetchStatus();
      }, 3000);
    }

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [dispatch, kycVerified, kycVerifiedFromApi, applyKycStatusData, isKyb]);

  const getRejectReason = (docType) => {
    const doc = documentsToResubmit.find((d) => d.type === docType);
    return doc?.reason || "";
  };

  const openVerifyModal = async () => {
    let sessionResponse;
    if (isKyb) {
      sessionResponse = await dispatch(createKybSession(userData));
    } else {
      sessionResponse = await dispatch(createKycSession(userData));
    }
    const diditOpenUrl = sessionResponse?.diditUrl || sessionResponse?.url;
    if (diditOpenUrl) {
      diditExternalOpenedRef.current = true;
      diditWebCompleteOnceRef.current = false;
      setDiditWebviewUrl(diditOpenUrl);
    } else {
      // NavigationService.navigate(KYC_STEP_ONE_SCREEN, { resetForm: true });
    }
  };

  const openVerifyAgainModal = async () => {
    let sessionResponse;
    if (isKyb) {
      sessionResponse = await dispatch(createKybSession(userData));
    } else {
      sessionResponse = await dispatch(createKycSession(userData, true));
    }
    const diditOpenUrl = sessionResponse?.diditUrl || sessionResponse?.url;
    if (diditOpenUrl) {
      diditExternalOpenedRef.current = true;
      diditWebCompleteOnceRef.current = false;
      setDiditWebviewUrl(diditOpenUrl);
    }
  };

  const openResubmitModal = async () => {
    let sessionResponse;
    if (isKyb) {
      sessionResponse = await dispatch(createKybSession(userData));
    } else {
      sessionResponse = await dispatch(createKycSession(userData));
    }
    const diditOpenUrl = sessionResponse?.diditUrl || sessionResponse?.url;
    if (diditOpenUrl) {
      diditExternalOpenedRef.current = true;
      diditWebCompleteOnceRef.current = false;
      setDiditWebviewUrl(diditOpenUrl);
    } else {
      NavigationService.navigate(KYC_RESUBMIT_SCREEN, {
        documentsToResubmit: documentsToResubmit || [],
        existingCountryCode: existingCountryCode || "",
        submittedIdDocType: submittedIdDocType || null,
        submittedTaxDocType: submittedTaxDocType || null,
        resubmitIdNumber: existingIdDocNumber || "",
        resubmitTaxNumber: existingTaxDocNumber || "",
      });
    }
  };



  const kycStatusView = () => {
    if (isKyb) {
      const effectiveTier = kycVerifiedFromApi !== null ? kycVerifiedFromApi : kycVerified;
      let st = statusCanonical;
      if (!st) {
        if (effectiveTier === 2) st = "APPROVED";
        else if (effectiveTier === 3) st = "REJECTED";
        else if (effectiveTier === 1) st = "PENDING";
        else if (effectiveTier === 4) st = "RESUBMISSION_REQUESTED";
        else st = "NOT_STARTED";
      }
      return resolveKybView({
        statusCanonical: st,
        diditVendorStatus,
        payload: kybPayload,
        loading: isLoading,
        onStart: openVerifyModal,
        onRetry: openVerifyAgainModal,
      });
    }

    const effectiveTier = kycVerifiedFromApi !== null ? kycVerifiedFromApi : kycVerified;
    // 1. Prioritize Resubmission requested (matches web kycPayloadRequestsResubmission)
    const hasResubmitRequest = statusCanonical === "RESUBMISSION_REQUESTED" ||
      String(trackingStatus).toLowerCase() === "resubmission" ||
      (documentsToResubmit && documentsToResubmit.length > 0) ||
      effectiveTier === 4;

    if (hasResubmitRequest) {
      return (
        <KycPending
          idDocStatus={idDocStatus}
          taxDocStatus={taxDocStatus}
          selfieStatus={selfieStatus}
          submittedIdDocType={submittedIdDocType}
          submittedTaxDocType={submittedTaxDocType}
          showResubmitButton
          onResubmitPress={openResubmitModal}
          diditVendorStatus={diditVendorStatus}
          onVerifyPress={openVerifyModal}
          isKyb={isKyb}
        />
      );
    }

    // 2. Map Tiers and Canonical Status strings (matches web resolveKycView)
    if (effectiveTier === 2 || statusCanonical === "APPROVED") {
      return <KycCompleted isKyb={isKyb} />;
    }

    if (effectiveTier === 3 || statusCanonical === "REJECTED") {
      return <KycRejected onVerifyPress={openVerifyAgainModal} isKyb={isKyb} />;
    }

    if (effectiveTier === 1 || statusCanonical === "PENDING") {
      return (
        <KycPending
          idDocStatus={idDocStatus}
          taxDocStatus={taxDocStatus}
          selfieStatus={selfieStatus}
          submittedIdDocType={submittedIdDocType}
          submittedTaxDocType={submittedTaxDocType}
          diditVendorStatus={diditVendorStatus}
          onVerifyPress={openVerifyModal}
          isKyb={isKyb}
        />
      );
    }

    // 3. Defaults (NOT_STARTED, EXPIRED, tier 0)
    return <KycDue onVerifyPress={openVerifyModal} screenWidth={screenWidth} isKyb={isKyb} />;
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? themeColors.background : "#fff" }}>
      <AppSafeAreaView style={{ flex: 1, backgroundColor: isDark ? themeColors.background : "#fff" }}>
        <KeyBoardAware style={{ flex: 1 }}>
          <ScrollView style={styles.mainScroll} contentContainerStyle={styles.mainScrollContent} showsVerticalScrollIndicator={false} bounces={false}>
            <KycStepHeader
              title={isKyb ? (statusCanonical === "PENDING" || statusCanonical === "APPROVED" || statusCanonical === "REJECTED" ? "KYB Verification" : "KYB Verification Center") : "Verification Center"}
              theme={isDark ? "Dark" : "Light"}
              onInfoPress={() => faqSheetRef.current?.open()}
              onSupportPress={() => { NavigationService.navigate("Support") }}
            />
            <View style={styles.sectionWrapper}>
              {contentLoading ? <KycStatusSkeleton /> : kycStatusView()}
            </View>
          </ScrollView>
        </KeyBoardAware>
      </AppSafeAreaView>

      <RBSheet
        ref={faqSheetRef}
        closeOnDragDown
        closeOnPressMask
        height={350}
        keyboardAvoidingViewEnabled={false}
        customModalProps={{ statusBarTranslucent: true, navigationBarTranslucent: true }}
        customStyles={{
          container: {
            backgroundColor: themeColors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          },
          draggableIcon: { backgroundColor: isDark ? "#374151" : "#E5E7EB", width: 40 },
        }}
      >
        <View style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <AppText type={EIGHTEEN} weight={BOLD} style={{ color: themeColors.text }}>Frequently Asked Questions</AppText>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {(isKyb ? KYB_FAQ : faqData).map((item, index) => (
              <View
                key={index}
                style={[
                  styles.faqItemInner,
                  { borderBottomColor: themeColors.border },
                  index === (isKyb ? KYB_FAQ : faqData).length - 1 && { borderBottomWidth: 0 }
                ]}
              >
                <TouchableOpacity
                  style={styles.faqQuestionRow}
                  onPress={() => setFaqActiveIndex(faqActiveIndex === index ? null : index)}
                  activeOpacity={0.7}
                >
                  <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, flex: 1 }}>{item.q}</AppText>
                  <FastImage
                    source={faqActiveIndex === index ? upIcon : downIcon}
                    resizeMode="contain"
                    style={{ width: 12, height: 12 }}
                    tintColor={themeColors.secondaryText}
                  />
                </TouchableOpacity>
                {faqActiveIndex === index && (
                  <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: themeColors.border }}>
                    <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, lineHeight: 20 }}>{item.a}</AppText>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </RBSheet>

      <Modal visible={!!diditWebviewUrl} animationType="slide" presentationStyle="fullScreen" onRequestClose={closeDiditWebview}>
        <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: isDark ? themeColors.background : "#fff" }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 12,
              paddingVertical: 10,
              // borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: themeColors.border,
            }}
          >
            <TouchableOpacity onPress={closeDiditWebview} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel="Close verification">
              <FastImage source={back_ic} style={{ width: 18, height: 18 }} resizeMode="contain" tintColor={themeColors.text} />
            </TouchableOpacity>
            <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
              {isKyb ? "Business verification" : "Identity verification"}
            </AppText>
            <View style={{ width: 16 }} />
          </View>
          {diditWebviewUrl ? (
            <WebView
              source={{ uri: diditWebviewUrl }}
              style={{ flex: 1, backgroundColor: themeColors.background }}
              javaScriptEnabled
              domStorageEnabled
              sharedCookiesEnabled
              startInLoadingState
              setSupportMultipleWindows={true}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              onShouldStartLoadWithRequest={(req) => {
                const url = req?.url || "";
                if (shouldCloseDiditKycWebView(url)) {
                  tryFinishDiditFromUrl(url);
                  return false;
                }
                return true;
              }}
              onNavigationStateChange={(nav) => {
                tryFinishDiditFromUrl(nav?.url);
              }}
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
};

export default KycStatus;

const styles = StyleSheet.create({
  mainScroll: { flex: 1 },
  mainScrollContent: { paddingBottom: 40, flexGrow: 1 },
  sectionWrapper: { paddingHorizontal: 16, flex: 1, paddingTop: 4 },

  mainStatusCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusMessageBox: {
    width: "100%",
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  statusIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  kycRewardCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 16,
  },
  tableHeaderRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  tableDataRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.03)",
  },
  rewardBox: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
    marginBottom: 30,
  },
  rewardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timerBlock: {
    backgroundColor: "#000",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: "center",
  },
  rewardDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginBottom: 12,
  },
  checkStep: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 10,
    marginRight: 12,
  },
  statusHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  statusIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  infoBox: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  successBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },

  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  primaryActionBtn: {
    width: "100%",
    height: 54,
    backgroundColor: "#1E222D",
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryActionBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  secondaryActionBtn: {
    width: "100%",
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: "rgba(128, 128, 128, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  kycSectionCard: { borderRadius: 16, padding: 16 },
  kycSectionCardTitle: { marginBottom: 12 },
  faqListWrap: { marginTop: 4 },
  faqItemInner: {
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  faqItemInnerLast: { borderBottomWidth: 0 },
  faqQuestionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQuestion: { flex: 1, lineHeight: 20 },
  faqArrow: { width: 10, height: 10, marginLeft: 8 },
  faqAnswer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
