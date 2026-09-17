import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import FastImage from "react-native-fast-image";
import {
  AppText,
  Button,
  SEMI_BOLD,
  FOURTEEN,
  SIXTEEN,
  TWELVE,
  THIRTEEN,
  BOLD,
  MEDIUM,
  TWENTY_TWO,
} from "../../shared";
import { useTheme } from "../../hooks/useTheme";
import { colors, darkTheme, lightTheme } from "../../theme/colors";
import NavigationService from "../../navigation/NavigationService";
import { CREATE_TICKET_SCREEN } from "../../navigation/routes";
import { checkIc, identity_verification, kyb_failled_icon, kyb_successful, pending_kyc } from "../../helper/ImageAssets";
import KybUnlockedIcon1 from "../../../assets/images/kyb_unlocked_icon.svg";
import KybUnlockedIcon2 from "../../../assets/images/kyb_unlocked_icon2.svg";
import KybUnlockedIcon3 from "../../../assets/images/kyb_unlocked_icon3.svg";
import KybUnlockedIcon4 from "../../../assets/images/kyb_unlocked_icon4.svg";
import KybUnlockedIcon5 from "../../../assets/images/kyb_unlocked_icon5.svg";
import KybInfoBusinessIcon from "../../../assets/images/kyb_info_business.svg";
import KybInfoStatusIcon from "../../../assets/images/kyb_info_status.svg";
import KybInfoDateIcon from "../../../assets/images/kyb_info_date.svg";
import KybInfoMethodIcon from "../../../assets/images/kyb_info_method.svg";
import {
  formatKybVerifiedAtUtc,
  getKybCtaConfig,
  KYB_REQUIRED_DOCS,
  KYB_UNLOCKED,
  pickKybApplicationId,
  pickKybBusinessName,
  pickKybFailureReasons,
} from "../../helper/kybDisplayFields";

const KYB_UNLOCK_ICONS = [
  KybUnlockedIcon1,
  KybUnlockedIcon2,
  KybUnlockedIcon3,
  KybUnlockedIcon4,
  KybUnlockedIcon5,
];
const VERIFIED_BY = "Arab Global Crypto Exchange";
const METHOD = "Business Verification (KYB)";

function HelpLink() {
  const { colors: themeColors } = useTheme();
  return (
    <TouchableOpacity
      onPress={() => NavigationService.navigate(CREATE_TICKET_SCREEN)}
      style={{ alignSelf: "center", marginTop: 12 }}
    >
      <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, textDecorationLine: "underline" }}>
        Need Help?
      </AppText>
    </TouchableOpacity>
  );
}

function KybInfoRow({ label, value, valueColor, Icon, badge, last }) {
  const { colors: themeColors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.infoRow,
        {
          borderBottomColor: last ? "transparent" : themeColors.border,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      {Icon ? (
        <View style={[styles.infoIconWrap, { backgroundColor: isDark ? "rgba(209, 170, 103, 0.12)" : "#FDF8E7" }]}>
          <Icon width={18} height={18} color={colors.cyanTheme} stroke={colors.cyanTheme} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginBottom: 4 }}>
          {label}
        </AppText>
        {badge ? (
          <View style={styles.verifiedBadge}>
            <FastImage source={checkIc} style={{ width: 12, height: 12, marginRight: 4 }} tintColor={colors.cyanTheme} />
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: colors.cyanTheme }}>{value}</AppText>
          </View>
        ) : (
          <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: valueColor || themeColors.text }}>
            {value}
          </AppText>
        )}
      </View>
    </View>
  );
}

function KybInfoCard({ rows }) {
  const { colors: themeColors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.infoCard,
        {
          backgroundColor: isDark ? "#1E222D" : "#F9FAFB",
          borderColor: themeColors.border,
        },
      ]}
    >
      {rows.map((row, idx) => (
        <KybInfoRow key={row.label} {...row} last={idx === rows.length - 1} />
      ))}
    </View>
  );
}

function PrimaryBtn({ label, onPress, loading, disabled }) {
  const { isDark } = useTheme();
  return (
    <Button
      children={label}
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      containerStyle={[styles.primaryBtn, isDark && { backgroundColor: colors.white }]}
      titleStyle={[styles.primaryBtnText, isDark && { color: colors.black }]}
    />
  );
}

export function KybDue({
  onVerifyPress,
  loading,
  isResubmit,
  isInProgress,
  isPendingReview,
  diditVendorStatus,
  cta,
}) {
  const { colors: themeColors, isDark } = useTheme();
  const headline = isResubmit
    ? "Resubmission required"
    : isInProgress
      ? "Verification In Progress"
      : isPendingReview
        ? "Verification In Review"
        : null;
  const copy = isResubmit
    ? "We need you to run business verification again. Complete the steps in the flow and submit the required documents."
    : isInProgress
      ? "Your KYB verification session is still open. Resume it to complete the remaining steps."
      : isPendingReview
        ? "Your business verification is being processed and is currently under review. We'll notify you once it's approved or if any additional information is required."
        : "Verify your business information securely and efficiently.";

  return (
    <View style={{ flex: 1, alignItems: "center", paddingTop: 12 }}>
      <FastImage source={identity_verification} resizeMode="contain" style={{ width: 220, height: 150, marginBottom: 8 }} />
      <AppText type={TWENTY_TWO} weight={SEMI_BOLD} style={{ color: themeColors.text, textAlign: "center", marginBottom: 8 }}>
        Business Verification (KYB)
      </AppText>
      {headline ? (
        <View style={[styles.banner, { backgroundColor: isDark ? "#1E222D" : "#F9FAFB", borderColor: themeColors.border }]}>
          <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 4 }}>
            {headline}
          </AppText>
          <AppText type={TWELVE} style={{ color: themeColors.secondaryText, lineHeight: 18 }}>
            {copy}
          </AppText>
          {diditVendorStatus ? (
            <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 6 }}>
              Status: {diditVendorStatus}
            </AppText>
          ) : null}
        </View>
      ) : (
        <AppText type={FOURTEEN} style={{ color: "#6B7280", textAlign: "center", paddingHorizontal: 20, marginBottom: 12 }}>
          {copy}
        </AppText>
      )}

      <View style={{ width: "100%", marginTop: 8 }}>
        {["Global compliance standards", "Secure data encryption", "Faster verification process"].map((item) => (
          <View key={item} style={styles.checkStep}>
            <View style={[styles.bullet, { backgroundColor: isDark ? colors.white : lightTheme.input }]} />
            <AppText type={THIRTEEN} style={{ color: themeColors.text }}>{item}</AppText>
          </View>
        ))}
      </View>

      {cta?.show ? (
        <View style={{ width: "100%", marginTop: 16 }}>
          <PrimaryBtn label={cta.label} onPress={onVerifyPress} loading={loading} />
        </View>
      ) : null}

      <View style={{ width: "100%", marginTop: 22 }}>
        <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 4 }}>
          Required Documents
        </AppText>
        <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginBottom: 12, lineHeight: 18 }}>
          Please prepare the following documents before starting verification.
        </AppText>
        {KYB_REQUIRED_DOCS.map((doc) => (
          <View
            key={doc.title}
            style={[styles.docRow, { borderColor: themeColors.border, backgroundColor: isDark ? "#1E222D" : "#F9FAFB" }]}
          >
            <View style={{ flex: 1 }}>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{doc.title}</AppText>
              <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 2 }}>{doc.sub}</AppText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function KybPending({ payload, diditVendorStatus, onVerifyPress, loading, cta }) {
  const { colors: themeColors, isDark } = useTheme();
  const inProgress = diditVendorStatus === "In Progress";
  const statusLabel = inProgress ? "In Progress" : (diditVendorStatus || "Pending");
  const orangeColor = "#F59E0B";

  return (
    <View style={{ flex: 1, alignItems: "center", paddingTop: 10 }}>
      <View style={[styles.statusBadge, { backgroundColor: "rgba(245, 158, 11, 0.1)" }]}>
        <FastImage source={pending_kyc} style={{ width: 18, height: 18, marginRight: 6 }} tintColor={orangeColor} />
        <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: orangeColor }}>{statusLabel}</AppText>
      </View>
      <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginTop: 14, textAlign: "center" }}>
        KYB Verification <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: orangeColor }}>{statusLabel}</AppText>
      </AppText>
      <AppText type={TWELVE} style={{ color: themeColors.secondaryText, textAlign: "center", marginTop: 8, lineHeight: 18, paddingHorizontal: 8 }}>
        {inProgress
          ? "Your KYB verification session is still open. Continue to complete the remaining steps."
          : "Your business verification is currently under review. We will notify you once it is approved or if any additional information is required."}
      </AppText>
      {diditVendorStatus ? (
        <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 4 }}>
          Status: {diditVendorStatus}
        </AppText>
      ) : null}

      {cta?.show ? (
        <View style={{ width: "100%", marginTop: 18 }}>
          <PrimaryBtn label={cta.label} onPress={onVerifyPress} loading={loading} />
        </View>
      ) : null}

      <KybInfoCard
        rows={[
          { label: "Business Name", value: pickKybBusinessName(payload) },
          { label: "Application ID", value: pickKybApplicationId(payload) },
          { label: "Verification Status", value: statusLabel, valueColor: orangeColor },
          { label: "Verification Date", value: formatKybVerifiedAtUtc(payload) },
          { label: "Verified By", value: VERIFIED_BY },
          { label: "Verification Method", value: METHOD },
        ]}
      />

      <View style={[styles.helpBox, { backgroundColor: isDark ? "#1E222D" : "#F9FAFB", borderColor: themeColors.border }]}>
        <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>Need Help?</AppText>
        <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 4, lineHeight: 18 }}>
          If you have any questions or need assistance, our support team is here to help.
        </AppText>
        <HelpLink />
      </View>
    </View>
  );
}

export function KybFailed({ payload, onVerifyPress, loading, cta }) {
  const { colors: themeColors, isDark } = useTheme();
  const red = themeColors.red || "#EF4444";
  const reasons = pickKybFailureReasons(payload);

  return (
    <View style={{ flex: 1, alignItems: "center", paddingTop: 10 }}>
      <FastImage source={kyb_failled_icon} style={{ width: 200, height: 138, marginRight: 6 }} resizeMode="contain" />
      {/* <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: red }}>Failed</AppText> */}
      <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginTop: 14, textAlign: "center" }}>
        KYB Verification <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: red }}>Failed</AppText>
      </AppText>
      <AppText type={TWELVE} style={{
        color: themeColors.secondaryText, textAlign: "center",
        marginTop: 8, lineHeight: 18, paddingHorizontal: 8
      }}>
        We're unable to verify your business at this time. Please review the reason below and resubmit your application.
      </AppText>

      {cta?.show ? (
        <View style={{ width: "100%", marginTop: 18 }}>
          <PrimaryBtn label={cta.label || "Try Again"} onPress={onVerifyPress} loading={loading} />
        </View>
      ) : null}
      <HelpLink />

      <KybInfoCard
        rows={[
          { label: "Business Name", value: pickKybBusinessName(payload) },
          { label: "Application ID", value: pickKybApplicationId(payload) },
          { label: "Verification Status", value: "Failed", valueColor: red },
          { label: "Verification Date", value: formatKybVerifiedAtUtc(payload) },
          { label: "Verified By", value: VERIFIED_BY },
          { label: "Verification Method", value: METHOD },
        ]}
      />

      <View style={[styles.errorBox, { backgroundColor: isDark ? "#1E222D" : "#FEF2F2", borderColor: themeColors.border, }]}>
        <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: red, marginBottom: 6 }}>
          Reason for Failure
        </AppText>
        <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginBottom: 8, lineHeight: 18 }}>
          We were unable to verify your business due to the following reason(s):
        </AppText>
        {(reasons.length ? reasons : ["Verification was declined. Please resubmit with correct documents."]).map((item) => (
          <AppText key={item} type={TWELVE} style={{ color: themeColors.text, lineHeight: 18, marginBottom: 4 }}>
            • {item}
          </AppText>
        ))}
        <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 8, lineHeight: 18 }}>
          Please review the details and resubmit with the correct information.
        </AppText>
      </View>
    </View>
  );
}

export function KybSuccess({ payload }) {
  const { colors: themeColors, isDark } = useTheme();
  const accent = colors.cyanTheme;

  return (
    <View style={{ flex: 1, alignItems: "center", paddingTop: 10 }}>
      <FastImage source={kyb_successful} style={{ width: 200, height: 138, marginRight: 6 }} resizeMode="contain" />
      <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, textAlign: "center" }}>
        KYB Verification <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: accent }}>Successful!</AppText>
      </AppText>
      <AppText type={TWELVE} style={{ color: themeColors.secondaryText, textAlign: "center", marginTop: 8, marginBottom: 4 }}>
        Your business has been verified successfully.
      </AppText>

      <KybInfoCard
        rows={[
          { label: "Business Name", value: pickKybBusinessName(payload), Icon: KybInfoBusinessIcon },
          { label: "Verification Status", value: "Verified", badge: true, Icon: KybInfoStatusIcon },
          { label: "Verification Date", value: formatKybVerifiedAtUtc(payload), Icon: KybInfoDateIcon },
          { label: "Verification Method", value: METHOD, Icon: KybInfoMethodIcon },
        ]}
      />

      <View style={[styles.alert, { backgroundColor: isDark ? "rgba(209, 170, 103, 0.08)" : "#FDF8E7" }]}>
        <AppText type={TWELVE} style={{ color: isDark ? colors.cyanTheme : "#B8893E", lineHeight: 18 }}>
          You now have full access to all platform features and higher limits.
        </AppText>
      </View>

      <View style={{ width: "100%", marginTop: 8 }}>
        <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 10 }}>
          What's Unlocked Now
        </AppText>
        {KYB_UNLOCKED.map((item, idx) => {
          const Icon = KYB_UNLOCK_ICONS[idx];
          return (
            <View
              key={item.title}
              style={[
                styles.unlockCard,
                {
                  borderColor: themeColors.border,
                  // backgroundColor: isDark ? colors.themeElevationColor : "#FFFFFF",
                  backgroundColor: isDark ? "#1E222D" : "#F9FAFB"
                },
              ]}
            >
              <View style={[styles.unlockIconWrap, { backgroundColor: isDark ? "rgba(209, 170, 103, 0.14)" : "#FDF8E7" }]}>
                {Icon ? <Icon width={21} height={21} color={accent} stroke={accent} /> : null}
              </View>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, textAlign: "center", marginBottom: 6 }}>
                {item.title}
              </AppText>
              <AppText type={TWELVE} style={{ color: themeColors.secondaryText, textAlign: "center", lineHeight: 18 }}>
                {item.sub}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function resolveKybView({
  statusCanonical,
  diditVendorStatus,
  payload,
  loading,
  onStart,
  onRetry,
}) {
  const cta = getKybCtaConfig({ canonicalStatus: statusCanonical, diditStatus: diditVendorStatus });
  const inProgress = diditVendorStatus === "In Progress";
  const isResubmit = statusCanonical === "RESUBMISSION_REQUESTED";
  const isPendingReview = statusCanonical === "PENDING" && !inProgress;

  if (statusCanonical === "APPROVED") {
    return <KybSuccess payload={payload} />;
  }
  if (statusCanonical === "REJECTED") {
    return <KybFailed payload={payload} onVerifyPress={onRetry} loading={loading} cta={cta} />;
  }
  if (statusCanonical === "PENDING") {
    return (
      <KybPending
        payload={payload}
        diditVendorStatus={diditVendorStatus}
        onVerifyPress={onStart}
        loading={loading}
        cta={cta}
      />
    );
  }
  return (
    <KybDue
      onVerifyPress={isResubmit || statusCanonical === "EXPIRED" ? onRetry : onStart}
      loading={loading}
      isResubmit={isResubmit}
      isInProgress={inProgress}
      isPendingReview={isPendingReview}
      diditVendorStatus={diditVendorStatus}
      cta={cta}
    />
  );
}

const styles = StyleSheet.create({
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  infoCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginTop: 18,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    gap: 12,
  },
  infoIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(209, 170, 103, 0.14)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBtn: {
    width: "100%",
    height: 54,
    backgroundColor: "#1E222D",
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  helpBox: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
  },
  errorBox: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
  },
  alert: {
    width: "100%",
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  unlockCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 12,
    alignItems: "center",
  },
  unlockIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  banner: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
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
  docRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
});
