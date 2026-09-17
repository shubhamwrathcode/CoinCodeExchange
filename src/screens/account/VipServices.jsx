import React, { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, ImageBackground, Dimensions } from "react-native";
import FastImage from "react-native-fast-image";
import { AppSafeAreaView, AppText, } from "../../shared";
import { EIGHTEEN, FOURTEEN, TWELVE, TWENTY, } from "../../helper/Constants";
import { BOLD, MEDIUM, SEMI_BOLD } from "../../helper/Constants";
import NavigationService from "../../navigation/NavigationService";
import {
  vip_hero_img, vip_servies_herobg, vipserviceBanner, back_ic,
  feeNegotiation, higherLimits, slaSupport, subAccounts,
  apiLimits, autoTier, earlyAccess,
  vipOverride,
  vip0, vip1, vip2, vip3, vip4,
  vip0Light, vip1Light, vip2Light, vip3Light, vip4Light
} from "../../helper/ImageAssets";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { fontFamilySemiBold } from "../../theme/typography";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";

const { width } = Dimensions.get("window");

const GOLD = "#D1AA67";

const vipTiers = [
  { id: 'VIP0', volume: '< $50,000', makerFee: '0.10%', takerFee: '0.15%', benefits: 'Standard access', iconColor: '#A0A0A0', image: vip0, imageLight: vip0Light },
  { id: 'VIP1', volume: '$50k – $500k', makerFee: '0.08%', takerFee: '0.08% / 0.12%', benefits: 'Priority support', iconColor: '#CD7F32', image: vip1, imageLight: vip1Light },
  { id: 'VIP2', volume: '$500k – $2M', makerFee: '0.06%', takerFee: '0.10%', benefits: 'Higher API limits', iconColor: '#50C878', image: vip2, imageLight: vip2Light },
  { id: 'VIP3', volume: '$2M – $10M', makerFee: '0.04%', takerFee: '0.08%', benefits: 'Dedicated manager', iconColor: '#4169E1', image: vip3, imageLight: vip3Light },
  { id: 'VIP4', volume: '> $10M', makerFee: 'Negotiated', takerFee: 'Negotiated', benefits: 'OTC desk access', iconColor: '#9370DB', image: vip4, imageLight: vip4Light },
];

const vipFeatures = [
  { title: "Auto Tier Upgrade", desc: "Based on rolling 30-day volume — calculated nightly.", image: autoTier },
  { title: "API & WS Limits", desc: "Higher rate limits and more WebSocket connection slots.", image: apiLimits },
  { title: "VIP Override", desc: "For institutional onboarding and custom support.", image: vipOverride },
  { title: "Early Access", desc: "Get early access to new product launches and token listings.", image: earlyAccess },
  { title: "Higher Limits", desc: "Enjoy higher withdrawal limits per 24h period.", image: higherLimits },
  { title: "Fee Negotiation", desc: "Tailored fee structure for VIP 4+ accounts.", image: feeNegotiation },
  { title: "SLA Support", desc: "Access a dedicated support queue with SLA response times.", image: slaSupport },
  { title: "Sub- Accounts", desc: "Operate up to 20 sub-accounts under one master account.", image: subAccounts },
];

const SectionTitle = ({ title, themeColors, styles }) => (
  <View style={styles.sectionTitleContainer}>
    <AppText style={{ color: themeColors.text, marginBottom: 8, fontSize: 20, fontFamily: fontFamilySemiBold }}>
      {title}
    </AppText>
    <View style={styles.titleUnderlineContainer}>
      <View style={styles.titleLine} />
      <FastImage source={vipOverride} style={{ width: 20, height: 20 }} resizeMode="contain" />
      <View style={styles.titleLine} />
    </View>
  </View>
);

const VipServices = () => {
  const [selectedTier, setSelectedTier] = useState(null);
  const { colors: themeColors, isDark } = useTheme();

  const DARK_BG = isDark ? themeColors.background : colors.white;
  const CARD_BG = isDark ? "#111111" : colors.white;
  const BORDER = themeColors.border;
  const TEXT_WHITE = themeColors.text;
  const TEXT_GRAY = themeColors.secondaryText;

  const styles = useMemo(() => getStyles(themeColors, isDark), [themeColors, isDark]);

  const renderTierModal = () => {
    if (!selectedTier) return null;
    return (
      <Modal transparent visible animationType="fade" onRequestClose={() => setSelectedTier(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
                {selectedTier.id} Details
              </AppText>
              <TouchableOpacity onPress={() => setSelectedTier(null)}>
                <AppText type={TWENTY} style={{ color: themeColors.text }}>×</AppText>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <DetailRow label="Tier" themeColors={themeColors} value={selectedTier.id} />
              <DetailRow label="30d Volume (USD)" themeColors={themeColors} value={selectedTier.volume} />
              <DetailRow label="Maker Fee" themeColors={themeColors} value={selectedTier.makerFee} />
              <DetailRow label="Taker Fee" themeColors={themeColors} value={selectedTier.takerFee} />
              <DetailRow label="Benefits" themeColors={themeColors} value={selectedTier.benefits} />
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background, flex: 1 }}>
      <View style={styles.customHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => NavigationService.goBack()}>
          <FastImage source={back_ic} style={styles.backIcon} tintColor={themeColors.text} resizeMode="contain" />
        </TouchableOpacity>
        <AppText weight={SEMI_BOLD} style={{ color: themeColors.text, fontSize: 20 }}>
          VIP Services
        </AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Hero Section */}
        <ImageBackground
          source={vip_servies_herobg}
          style={styles.heroSection}
          imageStyle={styles.heroBgImage}
        >
          <View style={styles.heroOverlay}>
            <FastImage
              source={vip_hero_img}
              style={styles.heroImage}
              resizeMode="contain"
            />
            <AppText style={{
              color: GOLD, marginTop: 16, marginBottom: 4, fontSize: 22,
              fontFamily: fontFamilySemiBold
            }}>
              AGCE VIP Services
            </AppText>
            <AppText style={{ color: themeColors.text, fontSize: 14 }}>
              Enjoy Exclusive Privileges
            </AppText>
          </View>
        </ImageBackground>

        {/* VIP Tier Structure */}
        <View style={styles.section}>
          <SectionTitle title="VIP Tier Structure" themeColors={themeColors} styles={styles} />

          <View style={styles.tierList}>
            {vipTiers.map((tier, index) => (
              <TouchableOpacity
                disabled
                key={tier.id}
                style={styles.tierCard}
              >
                <View style={[styles.tierCardLeft, { justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 8 }]}>
                  <FastImage source={isDark ? tier.image : tier.imageLight} style={{ width: '100%', height: 40 }} resizeMode="contain" />
                </View>

                <View style={styles.tierCardRight}>
                  <View style={styles.feeColumn}>
                    <AppText style={{ color: themeColors.secondaryText, fontSize: 9, marginBottom: 4 }}>Maker Fee</AppText>
                    <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{tier.makerFee}</AppText>
                  </View>

                  <View style={styles.feeColumn}>
                    <AppText style={{ color: themeColors.secondaryText, fontSize: 9, marginBottom: 4 }}>Taker Fee</AppText>
                    <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: themeColors.text }}>{tier.takerFee}</AppText>
                  </View>

                  <View style={styles.benefitBadge}>
                    <AppText style={{ color: themeColors.text, fontSize: 9, flex: 1 }} numberOfLines={2}>
                      {tier.benefits}
                    </AppText>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          <AppText style={{ color: themeColors.secondaryText, fontSize: 9, marginTop: 8 }}>
            * 30D Volume (USD)
          </AppText>
        </View>

        {/* VIP Features */}
        <View style={styles.section}>
          <SectionTitle title="VIP Features" themeColors={themeColors} styles={styles} />

          <View style={styles.featuresContainer}>
            {vipFeatures.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={styles.featureIconContainer}>
                  {feature.image ? (
                    <FastImage source={feature.image} style={{ width: 30, height: 30 }} resizeMode="contain" />
                  ) : (
                    <Icon name={feature.icon} size={28} color={GOLD} />
                  )}
                </View>
                <View style={styles.featureTextContainer}>
                  <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: GOLD, marginBottom: 4 }}>
                    {feature.title}
                  </AppText>
                  <AppText style={{ color: themeColors.secondaryText, fontSize: 9, lineHeight: 12 }}>
                    {feature.desc}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Coming Soon */}
        <View style={styles.section}>
          <SectionTitle title="Coming Soon" themeColors={themeColors} styles={styles} />
          <View style={styles.vipCardContainer}>
            <FastImage
              source={vipserviceBanner}
              style={styles.vipCardImage}
              resizeMode="cover"
            />
          </View>
        </View>
        {/* <View style={{ marginTop: 20 }}></View> */}

      </ScrollView>
      {renderTierModal()}
    </AppSafeAreaView>
  );
};

const DetailRow = ({ label, value, themeColors }) => (
  <View style={styles.detailRow}>
    <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText, flex: 1 }}>{label}</AppText>
    <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: themeColors.text, flex: 1, textAlign: 'right' }}>{value}</AppText>
  </View>
);

const getStyles = (themeColors, isDark) => StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: {
  },
  backIcon: {
    width: 18,
    height: 18,
  },
  headerSpacer: {
    width: 26,
  },
  heroSection: {
    width: width,
    minHeight: 180,
    justifyContent: "center",
    alignItems: "center",
  },
  heroBgImage: {
    // opacity: 0.6,
  },
  heroOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  heroImage: {
    width: 100,
    height: 100,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitleContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  titleUnderlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  titleLine: {
    height: 1,
    width: 50,
    backgroundColor: GOLD,
  },
  tierList: {
    gap: 8,
  },
  tierCard: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    borderColor: isDark ? themeColors.border : '#EAEAEA'
  },
  tierCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    width: '32%',
  },
  tierCardRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  feeColumn: {
    flex: 1,
  },
  benefitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? themeColors.card : '#F9F9F9',
    borderWidth: 1,
    borderColor: isDark ? themeColors.border : '#EAEAEA',
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 6,
    width: '38%',
  },
  featuresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  featureCard: {
    width: "48%",
    flexDirection: "row",
    // alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(209, 170, 103, 0.2)",
    padding: 12,
  },
  featureIconContainer: {
    marginRight: 10,
  },
  featureTextContainer: {
    flex: 1,
  },
  vipCardContainer: {
    alignItems: 'center',
    width: "100%",
  },
  vipCardImage: {
    width: "100%",
    height: 180,
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalBody: {
    gap: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  }
});

export default VipServices;
