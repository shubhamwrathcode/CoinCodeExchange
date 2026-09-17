import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, TextInput, ScrollView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../../../hooks/useTheme';
import NavigationService from '../../../navigation/NavigationService';
import * as routes from '../../../navigation/routes';
import FastImage from 'react-native-fast-image';
import CountryPicker from 'react-native-country-picker-modal';
import {
  AppSafeAreaView,
  AppText,
  BOLD,
  FOURTEEN,
  SIXTEEN,
  SEMI_BOLD,
  TWELVE,
  MEDIUM,
  EIGHTEEN,
  THIRTEEN,
} from '../../../shared';
import { back_ic, downIcon } from '../../../helper/ImageAssets';
import { colors } from '../../../theme/colors';
import { countriesList } from '../../../helper/CountriesList';
import { showError } from '../../../helper/logger';
import { getEmailDomainSuggestions } from '../../../helper/emailDomainSuggest';

const DIAL_CODE_TO_CCA2 = {
  '91': 'IN',
  '1': 'US',
  '44': 'GB',
  '971': 'AE',
  '966': 'SA',
  '65': 'SG',
  '61': 'AU',
  '81': 'JP',
  '49': 'DE',
  '33': 'FR',
  '86': 'CN',
  '7': 'RU',
  '973': 'BH',
  '965': 'KW',
  '968': 'OM',
  '974': 'QA',
  '20': 'EG',
  '92': 'PK',
  '880': 'BD',
  '90': 'TR',
  '39': 'IT',
  '34': 'ES',
  '82': 'KR',
  '60': 'MY',
  '62': 'ID',
  '63': 'PH',
  '84': 'VN',
  '66': 'TH',
  '31': 'NL',
  '41': 'CH',
  '46': 'SE',
  '1242': 'BS',
  '1246': 'BB',
  '1264': 'AI',
  '1268': 'AG',
  '1284': 'VG',
  '1340': 'VI',
  '1345': 'KY',
  '1441': 'BM',
  '1473': 'GD',
  '1649': 'TC',
  '1664': 'MS',
  '1758': 'LC',
  '1767': 'DM',
  '1784': 'VC',
  '1809': 'DO',
  '1829': 'DO',
  '1849': 'DO',
  '1868': 'TT',
  '1869': 'KN',
  '1876': 'JM',
};

function splitInternationalMobile(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return { countryCode: '+91', phoneDigits: '' };
  const digitsOnly = s.replace(/\D/g, '');
  const sorted = [...countriesList].sort(
    (a, b) => String(b.value).replace(/\D/g, '').length - String(a.value).replace(/\D/g, '').length
  );
  for (const c of sorted) {
    const dialDigits = String(c.value).replace(/\D/g, '');
    if (dialDigits && digitsOnly.startsWith(dialDigits)) {
      return {
        countryCode: c.value,
        phoneDigits: digitsOnly.slice(dialDigits.length),
      };
    }
  }
  return { countryCode: '+91', phoneDigits: digitsOnly };
}

const AddEmergencyContact = () => {
  const { colors: themeColors, isDark } = useTheme();
  const route = useRoute();

  // Form states
  const [editingContactId, setEditingContactId] = useState(null);
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState(['91']);
  const [country, setCountry] = useState('IN');
  const [selectedCountry, setSelectedCountry] = useState({
    cca2: 'IN',
    callingCode: ['91'],
    name: 'India',
  });
  const [pickerVisible, setPickerVisible] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [emailSuggestListVisible, setEmailSuggestListVisible] = useState(false);
  const emailSuggestBlurTimer = React.useRef(null);

  const clearEmailSuggestBlurTimer = () => {
    if (emailSuggestBlurTimer.current) {
      clearTimeout(emailSuggestBlurTimer.current);
      emailSuggestBlurTimer.current = null;
    }
  };

  const emailDomainSuggestions = React.useMemo(
    () => getEmailDomainSuggestions(email),
    [email]
  );

  useEffect(() => {
    return () => clearEmailSuggestBlurTimer();
  }, []);

  const applyEmailDomain = (domain) => {
    clearEmailSuggestBlurTimer();
    const s = String(email || "");
    const at = s.indexOf("@");
    if (at < 0) return;
    setEmail(`${s.slice(0, at)}@${domain}`);
    setEmailSuggestListVisible(false);
  };

  // Prefill details on mount or param change (new edit or confirm return)
  useEffect(() => {
    if (route.params?.contact) {
      const contact = route.params.contact;
      setEditingContactId(contact._id);
      setName(contact.fullName || '');
      setEmail(contact.emailId || '');
      const { countryCode: cc, phoneDigits: pd } = splitInternationalMobile(contact.mobileNumber);
      setPhone(pd);
      if (cc) {
        const cleanedCode = cc.replace('+', '');
        setCountryCode([cleanedCode]);
        const mappedCca2 = DIAL_CODE_TO_CCA2[cleanedCode] || 'IN';
        setCountry(mappedCca2);
      }
    } else if (route.params?.prefillData) {
      const data = route.params.prefillData;
      setEditingContactId(data._id || null);
      setName(data.name || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
      if (data.countryCode) {
        const cleanedCode = data.countryCode.replace('+', '');
        setCountryCode([cleanedCode]);
        const mappedCca2 = DIAL_CODE_TO_CCA2[cleanedCode] || 'IN';
        setCountry(mappedCca2);
      }
    }
  }, [route.params?.contact, route.params?.prefillData]);

  const handleSave = () => {
    if (!name.trim()) {
      showError('Please enter emergency contact name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      showError('Please enter a valid email address');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 8) {
      showError('Please enter a valid phone number');
      return;
    }

    // Go to confirm information screen, pass data along
    NavigationService.navigate(routes.CONFIRM_EMERGENCY_CONTACT_SCREEN, {
      contactData: {
        _id: editingContactId,
        relation: 'Emergency Contact',
        name: name.trim(),
        countryCode: `+${countryCode[0]}`,
        phone: phone.trim(),
        email: email.trim(),
      },
    });
  };

  // Convert cca2 to flag emoji
  const getFlagEmoji = (cca2) => {
    if (!cca2) return '🇮🇳';
    const codePoints = cca2
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  return (
    <AppSafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* Header matching mockup */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => NavigationService.goBack()}>
          <FastImage
            source={back_ic}
            tintColor={isDark ? colors.white : colors.black}
            style={{ width: 18, height: 18 }}
            resizeMode='contain'
          />
        </TouchableOpacity>

        <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={[styles.headerTitle, { color: themeColors.text, marginLeft: -10 }]}>
          {editingContactId ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
        </AppText>

        <View></View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Emergency Contact Name */}
        <View style={styles.inputGroup}>
          <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.label, { color: themeColors.text }]}>
            Emergency Contact Name
          </AppText>
          <View style={[styles.inputContainer, { backgroundColor: themeColors.input }]}>
            <TextInput
              style={[styles.input, { color: themeColors.text }]}
              placeholder="Please Enter"
              placeholderTextColor="#8A8A93"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              cursorColor={colors.cyanTheme}
            />
          </View>
          <AppText type={TWELVE} style={[styles.helpText, { color: themeColors.secondaryText }]}>
            Enter the full name of your trusted emergency contact. This name will be used for communication and verification purposes.
          </AppText>
        </View>

        {/* Contact Information */}
        <View style={[styles.inputGroup, { zIndex: 10, position: 'relative' }]}>
          <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.label, { color: themeColors.text }]}>
            Contact Information
          </AppText>
          <View style={[styles.emailSuggestWrap]}>
            <View style={[styles.inputContainer, { backgroundColor: themeColors.input }]}>
              <TextInput
                style={[styles.input, { color: themeColors.text }]}
                placeholder="Enter Email Address"
                placeholderTextColor="#8A8A93"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                cursorColor={colors.cyanTheme}
                onFocus={() => {
                  clearEmailSuggestBlurTimer();
                  setEmailSuggestListVisible(true);
                }}
                onBlur={() => {
                  clearEmailSuggestBlurTimer();
                  emailSuggestBlurTimer.current = setTimeout(() => {
                    setEmailSuggestListVisible(false);
                    emailSuggestBlurTimer.current = null;
                  }, 200);
                }}
              />
            </View>
            {emailSuggestListVisible && emailDomainSuggestions.length > 0 ? (
              <View style={[
                styles.emailSuggestList,
                {
                  backgroundColor: themeColors.background,

                  borderColor: themeColors.border,
                }
              ]}>
                <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={styles.emailSuggestScroll}>
                  {emailDomainSuggestions.map((domain) => (
                    <TouchableOpacity key={domain} style={styles.emailSuggestRow} onPress={() => applyEmailDomain(domain)}>
                      <AppText type={FOURTEEN} style={{ color: themeColors.text }}>@{domain}</AppText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>
        </View>

        {/* Phone Number */}
        <View style={styles.inputGroup}>
          <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.label, { color: themeColors.text }]}>
            Phone Number
          </AppText>
          <View style={[styles.phoneInputRow, { backgroundColor: themeColors.input }]}>
            {/* Country Selector */}
            <TouchableOpacity
              style={styles.countryPickerBtn}
              activeOpacity={0.8}
              onPress={() => setPickerVisible(true)}
            >
              <AppText type={FOURTEEN} style={styles.flagEmoji}>
                {getFlagEmoji(country)}
              </AppText>
              <AppText type={FOURTEEN} style={{ color: themeColors.text }}>
                +{countryCode[0]}
              </AppText>
              <FastImage source={downIcon} style={styles.downArrow} tintColor={isDark ? '#8A8A93' : '#8E8E93'} resizeMode="contain" />
            </TouchableOpacity>

            {/* Vertical Divider */}
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

            {/* Phone TextInput */}
            <TextInput
              style={[styles.phoneInput, { color: themeColors.text }]}
              placeholder="Enter your phone number"
              placeholderTextColor="#8A8A93"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              cursorColor={colors.cyanTheme}
            />
          </View>

          {/* Golden Highlighted Helper Text */}
          <View style={styles.helpTextContainer}>
            <AppText type={TWELVE} style={{ color: themeColors.secondaryText, lineHeight: 18 }}>
              Your emergency contact may be notified if unusual account inactivity is detected. For a smoother verification process, it is recommended that your emergency contact is also an <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: '#D4AF37' }}>Coincode</AppText> user.
            </AppText>
          </View>

          <CountryPicker
            onSelect={(countryItem) => {
              setCountry(countryItem.cca2);
              setCountryCode([countryItem.callingCode[0]]);
              setSelectedCountry({
                cca2: countryItem.cca2,
                callingCode: [countryItem.callingCode[0]],
                name: typeof countryItem.name === 'string' ? countryItem.name : countryItem.name?.common || '',
              });
              setPickerVisible(false);
            }}
            withFilter
            withCallingCode={true}
            withEmoji
            countryCode={country}
            visible={pickerVisible}
            onClose={() => setPickerVisible(false)}
            containerButtonStyle={{ display: 'none' }}
            theme={{
              backgroundColor: isDark ? themeColors.background : colors.white,
              onBackgroundTextColor: themeColors.text,
              fontSize: 14,
              itemHeight: 50,
            }}
          />
        </View>

      </ScrollView>

      {/* Save Button at the bottom */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: isDark ? '#FFFFFF' : '#2A2A2E' }]}
          activeOpacity={0.8}
          onPress={handleSave}
        >
          <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: isDark ? '#000000' : '#FFFFFF' }}>
            Continue
          </AppText>
        </TouchableOpacity>
      </View>
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: Platform.OS === 'ios' ? 44 : 56,
    justifyContent: 'space-between'
  },
  headerBtn: {
    padding: 4,
    marginLeft: -8,
  },
  headerTitle: {
    // position: 'absolute',
    // left: 0,
    // right: 0,
    // textAlign: 'center',
    // zIndex: -1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 10,
    fontSize: 14,
  },
  inputContainer: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    paddingVertical: 0,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  countryPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  flagEmoji: {
    fontSize: 20,
    marginRight: 6,
  },
  downArrow: {
    width: 10,
    height: 10,
    marginLeft: 6,
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 10,
  },
  phoneInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    paddingVertical: 0,
  },
  helpText: {
    marginTop: 8,
    lineHeight: 18,
  },
  helpTextContainer: {
    marginTop: 8,
  },
  submitBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomContainer: {
    paddingHorizontal: 15,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingTop: 16,
  },
  emailSuggestWrap: {
    zIndex: 10,
    position: 'relative',
    marginBottom: 0,
  },
  emailSuggestList: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    maxHeight: 180,
    zIndex: 999,
    elevation: 5,
    overflow: "hidden",
  },
  emailSuggestScroll: {
    maxHeight: 180,
  },
  emailSuggestRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
});

export default AddEmergencyContact;
