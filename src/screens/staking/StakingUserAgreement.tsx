import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import FastImage from 'react-native-fast-image';
import { AppSafeAreaView, AppText } from '../../shared';
import { back_ic } from '../../helper/ImageAssets';
import { fontFamilyMedium, fontFamilySemiBold } from '../../theme/typography';
import NavigationService from '../../navigation/NavigationService';
import { useTheme } from '../../hooks/useTheme';

const StakingUserAgreement = () => {
  const { colors: themeColors, isDark } = useTheme();

  return (
    <AppSafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }} forceBarStyle={isDark ? "light-content" : "dark-content"}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => NavigationService.goBack()}>
          <FastImage source={back_ic} style={styles.icon} resizeMode="contain" tintColor={themeColors.text} />
        </TouchableOpacity>
        <AppText style={[styles.headerTitle, { color: themeColors.text }]}>Staking User Agreement</AppText>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.contentBlock}>
          <AppText style={[styles.paragraph, { color: isDark ? themeColors.secondaryText : '#666' }]}>
            <AppText style={[styles.boldText, { color: themeColors.text }]}>Effective Date:</AppText> 08 April 2026{"\n"}
            <AppText style={[styles.boldText, { color: themeColors.text }]}>Platform:</AppText> Arab Global Crypto Exchange (Coincode){"\n"}
            <AppText style={[styles.boldText, { color: themeColors.text }]}>Operator:</AppText> Lunexor s.r.o., Kurzova 2222/16, 155 00 Prague 5, Czech Republic
          </AppText>
          <AppText style={[styles.paragraph, { color: isDark ? themeColors.secondaryText : '#666' }]}>
            This Staking User Agreement ("Agreement") governs your participation in staking programs offered through the Coincode platform. By checking the acceptance box and subscribing to any staking product, you confirm that you have read, understood, and agreed to this Agreement, together with the Coincode Terms of Use, Risk Disclosure, and General Disclaimer.
          </AppText>
        </View>

        <AppText style={[styles.sectionHeading, { color: themeColors.text }]}>1. Definitions</AppText>
        <View style={styles.list}>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• <AppText style={[styles.boldText, { color: themeColors.text }]}>Staking Program</AppText> — A reward program launched by Coincode for specific digital assets, under which eligible users may allocate supported assets from their Coincode account to earn rewards.</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• <AppText style={[styles.boldText, { color: themeColors.text }]}>Locked Staking</AppText> — A program with a fixed subscription and redemption period. Early redemption may be restricted or subject to penalties.</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• <AppText style={[styles.boldText, { color: themeColors.text }]}>Flexible Staking</AppText> — A program that generally allows subscription and redemption with fewer lock restrictions, subject to product rules and available liquidity.</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• <AppText style={[styles.boldText, { color: themeColors.text }]}>Tokenized Staking</AppText> — A program where staked assets or rewards may be represented through tokenized instruments, as described in the relevant product page.</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• <AppText style={[styles.boldText, { color: themeColors.text }]}>APR / Reward Rate</AppText> — The annualized or stated reward percentage displayed for a product. Displayed rates are indicative and may change.</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• <AppText style={[styles.boldText, { color: themeColors.text }]}>Digital Assets</AppText> — Cryptocurrencies, tokens, and other virtual assets supported by Coincode for staking.</AppText>
        </View>

        <AppText style={[styles.sectionHeading, { color: themeColors.text }]}>2. Eligibility</AppText>
        <AppText style={[styles.paragraph, { color: isDark ? themeColors.secondaryText : '#666' }]}>To use Coincode Staking services, you must:</AppText>
        <View style={styles.list}>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Be at least 18 years of age (or the legal age in your jurisdiction)</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Complete Coincode account registration and identity verification (KYC), where required</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Reside in or access the platform from a jurisdiction where staking services are permitted</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Not be subject to sanctions, restricted-person lists, or platform suspension</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Have sufficient balance in the supported wallet type (e.g. Spot or Earning wallet) for the selected product</AppText>
        </View>
        <AppText style={[styles.paragraph, { color: isDark ? themeColors.secondaryText : '#666' }]}>Coincode may refuse, suspend, or terminate staking access for any user who does not meet eligibility requirements.</AppText>

        <AppText style={[styles.sectionHeading, { color: themeColors.text }]}>3. How Staking Works</AppText>
        <AppText style={[styles.paragraph, { color: isDark ? themeColors.secondaryText : '#666' }]}>When you subscribe to a Staking Program:</AppText>
        <View style={styles.list}>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• The subscribed amount is allocated from your selected wallet and locked or reserved according to the product terms</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Rewards are calculated based on the product's stated rules, duration, tier, and available balance</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Reward distribution schedules (daily, at maturity, or otherwise) are shown on the product page and may vary by program</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Unless otherwise stated, staking subscriptions are generally free of platform subscription fees; network or third-party fees may still apply</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• You may continue to use other Coincode services during the staking period, subject to wallet balance and product restrictions</AppText>
        </View>

        <AppText style={[styles.sectionHeading, { color: themeColors.text }]}>4. Product Terms and Displayed Information</AppText>
        <AppText style={[styles.paragraph, { color: isDark ? themeColors.secondaryText : '#666' }]}>Each staking product page shows key parameters including, where applicable:</AppText>
        <View style={styles.list}>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Supported asset and minimum / maximum subscription amount</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Staking type (Locked, Flexible, or Tokenized)</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Duration, lock period, or redemption window</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Indicative APR or reward range</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Early withdrawal penalty, if any</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Reward distribution method and schedule</AppText>
        </View>
        <AppText style={[styles.paragraph, { color: isDark ? themeColors.secondaryText : '#666' }]}>You are responsible for reviewing the product-specific details before confirming any subscription. By clicking "Confirm" or equivalent, you accept the terms shown for that specific product at the time of subscription.</AppText>

        <AppText style={[styles.sectionHeading, { color: themeColors.text }]}>5. Rewards — No Guarantee</AppText>
        <AppText style={[styles.paragraph, { color: isDark ? themeColors.secondaryText : '#666' }]}>Coincode does not guarantee any proceeds, fixed returns, or capital protection under any Staking Program. You acknowledge that:</AppText>
        <View style={styles.list}>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Displayed APR or reward rates are estimates and may be adjusted before or during the program</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Actual rewards depend on platform rules, subscribed amount, duration, market conditions, and product availability</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Rewards may be paid in the same asset, a different supported asset, or platform-defined reward tokens, as stated on the product page</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Past reward performance does not guarantee future results</AppText>
        </View>

        <AppText style={[styles.sectionHeading, { color: themeColors.text }]}>6. Lock Periods, Redemption, and Early Withdrawal</AppText>
        <View style={styles.list}>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• <AppText style={[styles.boldText, { color: themeColors.text }]}>Locked products:</AppText> Assets remain locked until the stated maturity date unless early redemption is permitted</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• <AppText style={[styles.boldText, { color: themeColors.text }]}>Early withdrawal:</AppText> Where allowed, early redemption may reduce or forfeit rewards and may incur a penalty percentage as displayed at subscription</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• <AppText style={[styles.boldText, { color: themeColors.text }]}>Flexible products:</AppText> Redemption is subject to processing time, liquidity, and product rules shown on the platform</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Coincode may delay redemption processing during maintenance, security reviews, regulatory requirements, or force majeure events</AppText>
        </View>

        <AppText style={[styles.sectionHeading, { color: themeColors.text }]}>7. Risks</AppText>
        <AppText style={[styles.paragraph, { color: isDark ? themeColors.secondaryText : '#666' }]}>Staking digital assets involves significant risk. By participating, you accept that:</AppText>
        <View style={styles.list}>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Digital asset prices are highly volatile and you may lose part or all of your staked value</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Smart contract, protocol, network, or validator failures may affect rewards or redemption</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Regulatory changes may restrict, suspend, or terminate staking services in your jurisdiction</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Platform downtime, cyber incidents, or third-party service failures may delay rewards or redemption</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Tax obligations arising from staking rewards are your sole responsibility</AppText>
        </View>
        <AppText style={[styles.paragraph, { color: isDark ? themeColors.secondaryText : '#666' }]}>Please read the Coincode Risk Disclosure for further information.</AppText>

        <AppText style={[styles.sectionHeading, { color: themeColors.text }]}>8. User Obligations</AppText>
        <AppText style={[styles.paragraph, { color: isDark ? themeColors.secondaryText : '#666' }]}>You agree to:</AppText>
        <View style={styles.list}>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Ensure that all digital assets used for staking are from lawful and compliant sources</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Provide accurate account and verification information</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Not use staking services for money laundering, fraud, market manipulation, or other illegal activity</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Monitor your subscriptions, rewards, and redemption status through your Coincode account</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Comply with applicable laws, tax rules, and reporting obligations in your jurisdiction</AppText>
        </View>
        <AppText style={[styles.paragraph, { color: isDark ? themeColors.secondaryText : '#666' }]}>If Coincode determines that your assets or activity violate applicable law or platform rules, Coincode may freeze accounts, cancel subscriptions, withhold rewards, or deduct assets in accordance with the Terms of Use and relevant program rules.</AppText>

        <AppText style={[styles.sectionHeading, { color: themeColors.text }]}>9. Coincode Rights</AppText>
        <AppText style={[styles.paragraph, { color: isDark ? themeColors.secondaryText : '#666' }]}>Coincode and Lunexor s.r.o. reserve the right to:</AppText>
        <View style={styles.list}>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Launch, modify, suspend, or terminate any Staking Program at any time</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Adjust reward rates, caps, tiers, eligibility, or product parameters with notice where reasonably practicable</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Delist supported assets from staking due to regulatory, security, or operational reasons</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Require additional verification before allowing subscription, reward withdrawal, or redemption</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Offset amounts owed by you against staked assets or account balances where permitted by law</AppText>
        </View>

        <AppText style={[styles.sectionHeading, { color: themeColors.text }]}>10. Service Fees and Taxes</AppText>
        <View style={styles.list}>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Unless stated on the product page, Coincode Staking Programs are generally offered without a separate subscription fee</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• Early withdrawal penalties, network fees, or third-party charges may apply as disclosed at subscription</AppText>
          <AppText style={[styles.listItem, { color: isDark ? themeColors.secondaryText : '#666' }]}>• All taxes, duties, and reporting obligations related to staking rewards are your responsibility</AppText>
        </View>

        <AppText style={[styles.sectionHeading, { color: themeColors.text }]}>11. Limitation of Liability</AppText>
        <AppText style={[styles.paragraph, { color: isDark ? themeColors.secondaryText : '#666' }]}>To the maximum extent permitted by applicable law, Coincode and Lunexor s.r.o. shall not be liable for indirect, incidental, special, or consequential losses arising from your use of staking services, including loss of profits, rewards, or digital asset value.</AppText>
        <AppText style={[styles.paragraph, { color: isDark ? themeColors.secondaryText : '#666' }]}>Where liability cannot be excluded, it shall be limited to the total fees paid by you to Coincode for staking-related services during the twelve (12) months preceding the event giving rise to the claim, except where a higher limit is required by mandatory law.</AppText>

        <AppText style={[styles.sectionHeading, { color: themeColors.text }]}>12. Amendments</AppText>
        <AppText style={[styles.paragraph, { color: isDark ? themeColors.secondaryText : '#666' }]}>Coincode may update this Agreement from time to time. Updated versions will be published on the platform. Continued use of staking services after publication constitutes acceptance of the revised Agreement, except where applicable law requires explicit consent.</AppText>

        <AppText style={[styles.sectionHeading, { color: themeColors.text }]}>13. Governing Law and Disputes</AppText>
        <AppText style={[styles.paragraph, { color: isDark ? themeColors.secondaryText : '#666' }]}>This Agreement is governed by the laws of the Czech Republic. Disputes shall be subject to the exclusive jurisdiction of the courts of Prague, unless mandatory consumer protection rules in your jurisdiction provide otherwise.</AppText>

        <AppText style={[styles.sectionHeading, { color: themeColors.text }]}>14. Contact</AppText>
        <AppText style={[styles.paragraph, { color: isDark ? themeColors.secondaryText : '#666' }]}>For questions about this Agreement or Coincode Staking services, contact us through the Contact page or via the support channels listed on the platform.</AppText>
      </ScrollView>
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 56,
  },
  iconBtn: {
    padding: 8,
    width: 36,
  },
  icon: {
    width: 20,
    height: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fontFamilySemiBold,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  contentBlock: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 18,
    fontFamily: fontFamilySemiBold,
    marginTop: 20,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 14,
    fontFamily: fontFamilyMedium,
    lineHeight: 22,
    marginBottom: 12,
  },
  list: {
    marginBottom: 16,
    paddingLeft: 8,
  },
  listItem: {
    fontSize: 14,
    fontFamily: fontFamilyMedium,
    lineHeight: 22,
    marginBottom: 8,
  },
  boldText: {
    fontFamily: fontFamilySemiBold,
  },
});

export default StakingUserAgreement;
