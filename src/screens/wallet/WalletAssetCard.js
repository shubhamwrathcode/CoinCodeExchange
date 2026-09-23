import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { AppText, FOURTEEN, SEMI_BOLD, TWELVE } from "../../shared";
import { colors, darkTheme } from "../../theme/colors";

/**
 * CoinCode-style asset card used across WalletNew tabs.
 * Keep actions/data dynamic via props — layout stays consistent.
 */
const WalletAssetCard = ({
  theme,
  themeColors,
  icon,
  symbol,
  name,
  amount,
  fiatAmount,
  details = [],
  actions = [],
  headerRight,
  onPress,
  style,
}) => {
  const isDark = theme === "Dark";
  const cardBg = isDark ? darkTheme.darkThemeInputColor || "#08090B" : "#F5F5F5";
  const borderColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const textColor = themeColors?.text || (isDark ? colors.white : colors.black);
  const muted = themeColors?.secondaryText || (isDark ? "#8E8E93" : "#9D9D9D");
  const secondaryBtnBg = isDark ? "#1A1B1E" : "#E8E8E8";

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.card,
        { backgroundColor: cardBg, borderColor },
        style,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.assetInfo}>
          {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
          <View style={{ flexShrink: 1 }}>
            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor }}>
              {symbol}
            </AppText>
            {name ? (
              <AppText type={TWELVE} style={{ color: muted, marginTop: 1 }}>
                {name}
              </AppText>
            ) : null}
          </View>
        </View>
        <View style={styles.values}>
          {headerRight || (
            <>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textColor, textAlign: "right" }}>
                {amount}
              </AppText>
              {fiatAmount != null && fiatAmount !== "" ? (
                <AppText type={TWELVE} style={{ color: muted, marginTop: 1, textAlign: "right" }}>
                  {fiatAmount}
                </AppText>
              ) : null}
            </>
          )}
        </View>
      </View>

      {details?.length ? (
        <View style={styles.detailsRow}>
          {details.map((d, idx) => (
            <View
              key={d.key || d.label || idx}
              style={{ alignItems: idx === details.length - 1 ? "flex-end" : "flex-start", flex: 1 }}
            >
              <AppText type={TWELVE} style={{ color: muted, marginBottom: 1, fontSize: 11 }}>
                {d.label}
              </AppText>
              <AppText
                type={TWELVE}
                weight={SEMI_BOLD}
                style={{ color: d.color || textColor, fontSize: 13 }}
              >
                {d.value}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}

      {actions?.length ? (
        <View style={styles.actionsRow}>
          {actions.map((action, idx) => {
            const isPrimary = action.primary ?? idx === 0;
            return (
              <TouchableOpacity
                key={action.key || action.label || idx}
                activeOpacity={0.8}
                onPress={action.onPress}
                disabled={action.disabled}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: isPrimary
                      ? isDark
                        ? "rgba(10, 168, 197, 0.08)"
                        : "rgba(10, 168, 197, 0.08)"
                      : secondaryBtnBg,
                    borderColor: isPrimary
                      ? "rgba(10, 168, 197, 0.22)"
                      : isDark
                        ? "rgba(255,255,255,0.06)"
                        : "transparent",
                    opacity: action.disabled ? 0.5 : 1,
                  },
                ]}
              >
                <AppText
                  type={TWELVE}
                  weight={SEMI_BOLD}
                  style={{
                    color: isPrimary ? colors.cyanTheme : textColor,
                    fontSize: 13,
                  }}
                >
                  {action.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  assetInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  iconWrap: {
    marginRight: 10,
  },
  values: {
    alignItems: "flex-end",
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});

export default WalletAssetCard;
