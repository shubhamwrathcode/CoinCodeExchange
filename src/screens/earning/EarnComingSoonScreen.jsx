import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import FastImage from "react-native-fast-image";
import { AppSafeAreaView } from "../../common/AppSafeAreaView";
import { AppText, BOLD, MEDIUM, SEMI_BOLD, SIXTEEN, TWELVE, FOURTEEN, EIGHTEEN } from "../../shared";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";
import { earningIcon, stakingNew, launchpad, referAndEarn, vip } from "../../helper/ImageAssets";

const PREVIEW_FEATURES = [
  {
    id: "1",
    title: "Flexible & Fixed Staking",
    desc: "Stake your favorite assets with competitive APYs and flexible withdrawal options.",
    icon: stakingNew,
    tag: "High Yield",
  },
  {
    id: "2",
    title: "Launchpool",
    desc: "Farm newly listed tokens by staking USDT, BTC, and exchange tokens.",
    icon: launchpad,
    tag: "Exclusive",
  },
  {
    id: "3",
    title: "VIP Yield Club",
    desc: "Institutional-grade structured yield products with premium return tiers.",
    icon: vip,
    tag: "VIP Access",
  },
  {
    id: "4",
    title: "Refer & Earn",
    desc: "Invite your friends and earn real-time commission on trading & earn fees.",
    icon: referAndEarn,
    tag: "Rewards",
  },
];

const EarnComingSoonScreen = () => {
  const { colors: themeColors, isDark } = useTheme();

  return (
    <AppSafeAreaView backgroundColor={themeColors.background} style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "#EEEEEE" }]}>
        <AppText weight={BOLD} type={EIGHTEEN} style={{ color: themeColors.text }}>
          Earn
        </AppText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: isDark ? "#121418" : "#F4F8FA",
              borderColor: isDark ? "rgba(10, 168, 197, 0.25)" : "rgba(10, 168, 197, 0.2)",
            },
          ]}
        >
          <View style={styles.iconCircle}>
            <FastImage
              source={earningIcon}
              style={styles.heroIcon}
              resizeMode="contain"
              tintColor={colors.cyanTheme || "#0AA8C5"}
            />
          </View>
          <View style={styles.badge}>
            <AppText weight={BOLD} type={TWELVE} style={{ color: colors.cyanTheme || "#0AA8C5" }}>
              COMING SOON
            </AppText>
          </View>
          <AppText weight={BOLD} style={[styles.heroTitle, { color: themeColors.text }]}>
            Earn While You Hold
          </AppText>
          <AppText style={[styles.heroSubtitle, { color: themeColors.secondaryText }]}>
            We're building a seamless way for you to grow your crypto assets. High yields, flexible terms, and guaranteed returns are coming right here.
          </AppText>
        </View>

        {/* Feature Highlights */}
        <AppText weight={SEMI_BOLD} type={SIXTEEN} style={[styles.sectionTitle, { color: themeColors.text }]}>
          Upcoming Features
        </AppText>

        <View style={styles.featuresList}>
          {PREVIEW_FEATURES.map((item) => (
            <View
              key={item.id}
              style={[
                styles.featureCard,
                {
                  backgroundColor: isDark ? "#16181D" : "#FFFFFF",
                  borderColor: isDark ? "rgba(255, 255, 255, 0.06)" : "#EAEAEA",
                },
              ]}
            >
              <View style={styles.featureHeader}>
                <View style={[styles.featureIconWrap, { backgroundColor: isDark ? "rgba(10, 168, 197, 0.12)" : "#E6F7FA" }]}>
                  <FastImage
                    source={item.icon}
                    style={styles.featureIcon}
                    resizeMode="contain"
                    tintColor={colors.cyanTheme || "#0AA8C5"}
                  />
                </View>
                <View style={styles.tagPill}>
                  <AppText weight={MEDIUM} type={TWELVE} style={{ color: colors.cyanTheme || "#0AA8C5", fontSize: 11 }}>
                    {item.tag}
                  </AppText>
                </View>
              </View>
              <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: themeColors.text, marginTop: 10 }}>
                {item.title}
              </AppText>
              <AppText style={{ color: themeColors.secondaryText, fontSize: 12, marginTop: 4, lineHeight: 17 }}>
                {item.desc}
              </AppText>
            </View>
          ))}
        </View>
      </ScrollView>
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(10, 168, 197, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroIcon: {
    width: 36,
    height: 36,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(10, 168, 197, 0.15)",
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 20,
    marginBottom: 6,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  sectionTitle: {
    marginBottom: 12,
    marginLeft: 4,
  },
  featuresList: {
    gap: 12,
  },
  featureCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  featureHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  featureIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  featureIcon: {
    width: 20,
    height: 20,
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(10, 168, 197, 0.1)",
  },
});

export default EarnComingSoonScreen;
