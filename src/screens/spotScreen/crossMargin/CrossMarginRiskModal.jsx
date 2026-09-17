import React, { forwardRef, useCallback, useMemo, useState } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import FastImage from "react-native-fast-image";
import RBSheet from "react-native-raw-bottom-sheet";
import { AppText, BOLD, MEDIUM, SEMI_BOLD } from "../../../shared";
import { closeIcon, add, minus } from "../../../helper/ImageAssets";
import { useTheme } from "../../../hooks/useTheme";
import { appOperation } from "../../../appOperation";
import { CUSTOMER_TYPE } from "../../../appOperation/types";
import { universalPaddingHorizontal } from "../../../theme/dimens";
import {
  computeInitialMarginLevel,
  formatMarginLevel,
  formatThresholdLevel,
  getMarginLevelStatus,
  parseMarginLevel,
} from "./marginLevelUtils";

const { height: WindowHeight } = Dimensions.get("window");

/** Normalize GET /v1/cross/risk payload into shared threshold + display fields. */
export function parseCrossRisk(risk = {}) {
  const marginCallLevel = parseMarginLevel(risk.margin_call_level);
  const liquidationMarginLevel = parseMarginLevel(
    risk.liquidation_level ?? risk.liquidation_margin_level
  );
  const borrowLevel = parseMarginLevel(risk.borrow_level ?? risk.borrow_margin_level ?? risk.margin_call_level);
  const transferOutLevel = parseMarginLevel(risk.transfer_out_level ?? risk.transfer_out_margin_level);
  const ml = parseMarginLevel(risk.margin_level);
  const totalLiability = parseFloat(risk.total_liability);
  const hasDebt = Number.isFinite(totalLiability)
    ? totalLiability > 0
    : (ml != null && ml > 0 && ml < 999);
  const maxLeverage = parseMarginLevel(risk.max_leverage);

  return {
    ...risk,
    margin_level: ml,
    marginCallLevel,
    liquidationMarginLevel,
    borrowLevel,
    transferOutLevel,
    hasDebt,
    maxLeverage,
    thresholds: { marginCallLevel, liquidationMarginLevel },
  };
}

function RiskMeter({ ml, liqLevel, callLevel, hasDebt, palette }) {
  if (liqLevel == null || callLevel == null) return null;

  const min = Math.max(0.5, liqLevel - 0.08);
  const max = Math.max(callLevel + 0.12, liqLevel + 0.25);
  const range = max - min || 1;
  const liqPct = Math.min(100, Math.max(0, ((liqLevel - min) / range) * 100));
  const callPct = Math.min(100, Math.max(liqPct, ((callLevel - min) / range) * 100));
  const markerPct = hasDebt && ml != null
    ? Math.min(100, Math.max(0, ((ml - min) / range) * 100))
    : null;

  return (
    <View style={styles.meter}>
      <View style={{ position: "relative" }}>
        <View style={[styles.meterTrack, { backgroundColor: palette.border }]}>
          <View style={[styles.meterZone, { width: `${liqPct}%`, backgroundColor: "#ef4444" }]} />
          <View style={[styles.meterZone, { width: `${callPct - liqPct}%`, backgroundColor: "#f59e0b" }]} />
          <View style={[styles.meterZone, { flex: 1, backgroundColor: "#22c55e" }]} />
        </View>
        {markerPct != null ? (
          <View
            pointerEvents="none"
            style={[
              styles.meterMarker,
              { left: `${markerPct}%`, backgroundColor: palette.text },
            ]}
          />
        ) : null}
      </View>
      <View style={styles.meterLabels}>
        <AppText style={[styles.meterLabel, { left: `${liqPct}%`, color: palette.muted }]}>
          {formatThresholdLevel(liqLevel)}
        </AppText>
        <AppText style={[styles.meterLabel, { left: `${callPct}%`, color: palette.muted }]}>
          {formatThresholdLevel(callLevel)}
        </AppText>
      </View>
    </View>
  );
}

function RiskTierRow({ tone, title, subtitle, active, palette }) {
  const dotColor = tone === "normal" ? "#22c55e" : tone === "warning" ? "#f59e0b" : "#ef4444";
  return (
    <View style={[styles.tier, active && { backgroundColor: palette.activeBg }]}>
      <View style={[styles.tierDot, { backgroundColor: dotColor }]} />
      <View style={{ flex: 1 }}>
        <AppText weight={SEMI_BOLD} style={{ fontSize: 13, color: palette.text, marginBottom: 2 }}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText style={{ fontSize: 12, lineHeight: 17, color: palette.muted }}>{subtitle}</AppText>
        ) : null}
      </View>
    </View>
  );
}

function CollapsibleSection({ title, open, onToggle, children, palette }) {
  return (
    <View style={[styles.section, { borderBottomColor: palette.border }]}>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onToggle}
        style={styles.sectionHeader}
      >
        <AppText weight={SEMI_BOLD} style={{ fontSize: 14, color: palette.text, flex: 1 }}>
          {title}
        </AppText>
        <FastImage
          source={open ? minus : add}
          style={{ width: 14, height: 14 }}
          tintColor={palette.muted}
          resizeMode="contain"
        />
      </TouchableOpacity>
      {open ? <View style={{ paddingBottom: 14 }}>{children}</View> : null}
    </View>
  );
}

function StatusRule({ allowed, label, value, palette }) {
  return (
    <View style={styles.rule}>
      <View style={[styles.ruleDot, allowed && { backgroundColor: "#22c55e" }, !allowed && { backgroundColor: palette.muted }]} />
      <AppText weight={MEDIUM} style={{ flex: 1, fontSize: 13, color: palette.text }}>{label}</AppText>
      <AppText style={{ fontSize: 12, color: palette.muted }}>{value}</AppText>
    </View>
  );
}

const PILL_STYLES = {
  safe: { bg: "rgba(22, 163, 74, 0.15)", text: "#4ade80", lightBg: "#ecfdf5", lightText: "#15803d" },
  normal: { bg: "rgba(22, 163, 74, 0.15)", text: "#4ade80", lightBg: "#ecfdf5", lightText: "#15803d" },
  margin_call: { bg: "rgba(245, 158, 11, 0.18)", text: "#fbbf24", lightBg: "#fff7ed", lightText: "#c2410c" },
  liquidated: { bg: "rgba(220, 38, 38, 0.18)", text: "#f87171", lightBg: "#fef2f2", lightText: "#b91c1c" },
  unavailable: { bg: "rgba(156, 163, 175, 0.15)", text: "#848e9c", lightBg: "rgba(156, 163, 175, 0.15)", lightText: "#707a8a" },
};

const CrossMarginRiskModal = forwardRef(({ risk: riskProp }, ref) => {
  const { colors: themeColors, isDark } = useTheme();
  const [liveRisk, setLiveRisk] = useState(null);
  const [borrowOpen, setBorrowOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const palette = useMemo(() => ({
    text: isDark ? "#eaecef" : "#1e2329",
    muted: isDark ? "#848e9c" : "#707a8a",
    border: isDark ? "rgba(255, 255, 255, 0.08)" : "#eef0f2",
    activeBg: isDark ? "rgba(255, 255, 255, 0.04)" : "#f9fafb",
  }), [isDark]);

  const fetchLive = useCallback(() => {
    appOperation.get("cross/risk", undefined, undefined, CUSTOMER_TYPE)
      .then((res) => { if (res?.success) setLiveRisk(res.data); })
      .catch(() => {});
  }, []);

  const parsed = useMemo(
    () => parseCrossRisk({ ...(riskProp || {}), ...(liveRisk || {}) }),
    [riskProp, liveRisk]
  );

  const {
    marginCallLevel,
    liquidationMarginLevel,
    borrowLevel,
    transferOutLevel,
    hasDebt,
    maxLeverage,
    thresholds,
  } = parsed;

  const ml = hasDebt ? parsed.margin_level : null;
  const status = getMarginLevelStatus(ml, thresholds, { hasDebt });
  const initialMl = computeInitialMarginLevel(maxLeverage);
  const callFmt = formatThresholdLevel(marginCallLevel);
  const liqFmt = formatThresholdLevel(liquidationMarginLevel);
  const borrowFmt = formatThresholdLevel(borrowLevel ?? marginCallLevel);
  const transferFmt = formatThresholdLevel(transferOutLevel);
  const thresholdsReady = marginCallLevel != null && liquidationMarginLevel != null;
  const leverageLabel = maxLeverage ? `${maxLeverage}x` : null;
  const pill = PILL_STYLES[status.key] || PILL_STYLES.unavailable;

  return (
    <RBSheet
      ref={ref}
      closeOnDragDown={false}
      closeOnPressMask
      dragFromTopOnly
      keyboardAvoidingViewEnabled={false}
      height={Math.min(640, Math.round(WindowHeight * 0.88))}
      animationType="fade"
      openDuration={250}
      closeDuration={200}
      onOpen={() => {
        setLiveRisk(null);
        setBorrowOpen(false);
        setTransferOpen(false);
        fetchLive();
      }}
      customModalProps={{ statusBarTranslucent: true }}
      customStyles={{
        container: {
          backgroundColor: isDark ? themeColors.sheetDarkColor : themeColors.themeElevationColor,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingHorizontal: universalPaddingHorizontal,
          paddingTop: 12,
          paddingBottom: 8,
        },
        wrapper: {
          backgroundColor: "#0006",
        },
        draggableIcon: {
          height: 0,
          width: 0,
          margin: 0,
        },
      }}
    >
      <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <AppText weight={BOLD} style={{ fontSize: 18, color: palette.text, marginBottom: 4 }}>
            Margin risk
          </AppText>
          <AppText style={{ fontSize: 13, lineHeight: 18, color: palette.muted }}>
            {`Cross margin account${leverageLabel ? ` · max leverage ${leverageLabel}` : ""}`}
          </AppText>
        </View>
        <TouchableOpacity onPress={() => ref?.current?.close()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <FastImage source={closeIcon} style={{ width: 14, height: 14 }} tintColor={palette.muted} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        bounces={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View style={{ marginBottom: 18 }}>
          <View style={styles.heroTop}>
            {hasDebt && ml != null ? (
              <>
                <AppText weight={BOLD} style={{ fontSize: 32, color: palette.text, letterSpacing: -0.4 }}>
                  {formatMarginLevel(ml)}
                </AppText>
                <View style={[styles.pill, { backgroundColor: isDark ? pill.bg : pill.lightBg }]}>
                  <AppText weight={SEMI_BOLD} style={{ fontSize: 12, color: isDark ? pill.text : pill.lightText }}>
                    {thresholdsReady ? status.label : "Loading…"}
                  </AppText>
                </View>
              </>
            ) : (
              <>
                <AppText weight={BOLD} style={{ fontSize: 32, color: isDark ? "#4ade80" : "#15803d", letterSpacing: -0.4 }}>
                  Safe
                </AppText>
                <View style={[styles.pill, { backgroundColor: isDark ? PILL_STYLES.safe.bg : PILL_STYLES.safe.lightBg }]}>
                  <AppText weight={SEMI_BOLD} style={{ fontSize: 12, color: isDark ? PILL_STYLES.safe.text : PILL_STYLES.safe.lightText }}>
                    No debt
                  </AppText>
                </View>
              </>
            )}
          </View>
          <AppText style={{ fontSize: 12, lineHeight: 17, color: palette.muted }}>
            Margin level = total asset value ÷ total liability (incl. unpaid interest), at mark price. Cross margin shares risk across all assets in the account.
          </AppText>
        </View>

        {thresholdsReady ? (
          <>
            <RiskMeter
              ml={ml}
              liqLevel={liquidationMarginLevel}
              callLevel={marginCallLevel}
              hasDebt={hasDebt}
              palette={palette}
            />
            <View style={{ gap: 4, marginBottom: 16 }}>
              <RiskTierRow
                tone="normal"
                title={`Normal · above ${callFmt}`}
                subtitle="Account is healthy. Borrowing and transfers out follow the borrow / transfer-out rules below."
                active={status.key === "normal"}
                palette={palette}
              />
              <RiskTierRow
                tone="warning"
                title={`Margin call · ${liqFmt} to ${callFmt}`}
                subtitle="Add collateral or repay debt. New borrowing and transfers out are blocked; trading still works across the shared account."
                active={status.key === "margin_call"}
                palette={palette}
              />
              <RiskTierRow
                tone="danger"
                title={`Liquidated · ${liqFmt} or below`}
                subtitle="Open orders are cancelled and positions can be liquidated at market to restore the account. A liquidation fee may apply."
                active={status.key === "liquidated"}
                palette={palette}
              />
            </View>
          </>
        ) : (
          <AppText style={{ fontSize: 12, color: palette.muted, marginBottom: 16 }}>
            Loading risk thresholds…
          </AppText>
        )}

        {initialMl != null && leverageLabel ? (
          <AppText style={[styles.footnote, { color: palette.muted, borderTopColor: palette.border }]}>
            {`At full ${leverageLabel} with no extra collateral, the starting margin level is about ${formatMarginLevel(initialMl)}.`}
          </AppText>
        ) : null}

        <View style={{ borderTopWidth: 1, borderTopColor: palette.border }}>
          <CollapsibleSection
            title="Borrow margin level"
            open={borrowOpen}
            onToggle={() => setBorrowOpen((v) => !v)}
            palette={palette}
          >
            <AppText style={{ fontSize: 12, lineHeight: 17, color: palette.muted, marginBottom: 10 }}>
              New borrowing is allowed only while margin level stays above the borrow level.
            </AppText>
            {borrowFmt !== "—" ? (
              <View style={{ gap: 8 }}>
                <StatusRule allowed label="Borrowable" value={`ML > ${borrowFmt}`} palette={palette} />
                <StatusRule label="Not borrowable" value={`ML ≤ ${borrowFmt}`} palette={palette} />
              </View>
            ) : null}
          </CollapsibleSection>

          <CollapsibleSection
            title="Transfer out"
            open={transferOpen}
            onToggle={() => setTransferOpen((v) => !v)}
            palette={palette}
          >
            <AppText style={{ fontSize: 12, lineHeight: 17, color: palette.muted, marginBottom: 10 }}>
              Transfer-out requires margin level above the transfer-out level before and after the transfer.
            </AppText>
            {transferFmt !== "—" ? (
              <View style={{ gap: 8 }}>
                <StatusRule allowed label="Permitted" value={`ML > ${transferFmt}`} palette={palette} />
                <StatusRule label="Not permitted" value={`ML ≤ ${transferFmt}`} palette={palette} />
              </View>
            ) : null}
          </CollapsibleSection>
        </View>
      </ScrollView>
      </View>
    </RBSheet>
  );
});

CrossMarginRiskModal.displayName = "CrossMarginRiskModal";

export default CrossMarginRiskModal;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 12,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  meter: {
    marginBottom: 20,
  },
  meterTrack: {
    position: "relative",
    flexDirection: "row",
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  meterZone: {
    height: "100%",
  },
  meterMarker: {
    position: "absolute",
    top: -3,
    width: 2,
    height: 14,
    marginLeft: -1,
    borderRadius: 1,
  },
  meterLabels: {
    position: "relative",
    height: 18,
    marginTop: 6,
  },
  meterLabel: {
    position: "absolute",
    transform: [{ translateX: -12 }],
    fontSize: 11,
  },
  tier: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 16,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  section: {
    borderBottomWidth: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    gap: 12,
  },
  rule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ruleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
