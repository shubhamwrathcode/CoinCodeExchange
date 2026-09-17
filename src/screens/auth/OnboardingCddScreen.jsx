import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, TextInput, ScrollView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const KeyboardScrollView = Platform.OS === 'android' ? ScrollView : KeyboardAwareScrollView;
import { AppSafeAreaView, AppText, Button, EIGHTEEN, FIFTEEN, FOURTEEN, MEDIUM, SEMI_BOLD, THIRTEEN, TWELVE } from '../../shared';
import { useTheme } from '../../hooks/useTheme';
import { colors } from '../../theme/colors';
import NavigationService from '../../navigation/NavigationService';
import { appOperation } from '../../appOperation';
import { showError, showSuccess } from '../../helper/logger';
import { KYC_VERIFICATION_SCREEN, NAVIGATION_BOTTOM_TAB_STACK } from '../../navigation/routes';
import { clearPostSignupCdd, codesEqual, optionCodeKey } from '../../utils/cddOnboarding';
import { useAppDispatch } from '../../store/hooks';
import { logoutAction } from '../../actions/authActions';
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const AnimatedBorderOption = ({ option, selected, activeColor, inactiveColor, onPress, themeColors, isDark }) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, { duration: 1000, easing: Easing.inOut(Easing.ease) });
  }, [selected]);

  const FIXED_TOTAL_LENGTH = 1000;

  const animatedProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: FIXED_TOTAL_LENGTH - (progress.value * FIXED_TOTAL_LENGTH),
    };
  });

  const radioColor = selected ? activeColor : inactiveColor;
  const radius = 12;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onLayout={(e) => {
        setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
      }}
    >
      <View style={[
        styles.optionButton,
        {
          backgroundColor: 'transparent',
          borderColor: inactiveColor, // Base static border
        }
      ]}>
        <View style={[styles.radioOuter, { borderColor: radioColor }]}>
          {selected && <View style={[styles.radioInner, { backgroundColor: activeColor }]} />}
        </View>
        <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: themeColors.text, flex: 1, marginLeft: 12 }}>
          {option.label}
        </AppText>
      </View>

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={size.width || 0} height={size.height || 0}>
          <Defs>
            <LinearGradient id={`grad-${option.code}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={activeColor} stopOpacity="1" />
              <Stop offset="100%" stopColor={activeColor} stopOpacity="0.5" />
            </LinearGradient>
          </Defs>
          <AnimatedRect
            x={1.5}
            y={1.5}
            width={Math.max(0, size.width - 3)}
            height={Math.max(0, size.height - 3)}
            rx={radius - 1}
            stroke={`url(#grad-${option.code})`}
            strokeWidth={1.5}
            fill="none"
            strokeDasharray={`${FIXED_TOTAL_LENGTH} ${FIXED_TOTAL_LENGTH}`}
            animatedProps={animatedProps}
          />
        </Svg>
      </View>
    </TouchableOpacity>
  );
};

const FALLBACK_QUESTIONS = [
  {
    id: "employment",
    step: 1,
    title: "Employment",
    type: "single_select",
    required: true,
    options: [
      { code: "private_job", label: "Private Job" },
      { code: "government_job", label: "Government Job" },
      { code: "business", label: "Business" },
      { code: "self_employed", label: "Self-employed / Freelancer" },
      { code: "retired", label: "Retired" },
      { code: "student", label: "Student" },
      { code: "other", label: "Other" },
    ],
    other_input: {
      field: "employment_other",
      placeholder: "Other (please specify)",
      required_when: "other",
    },
  },
  {
    id: "annual_income",
    step: 2,
    title: "Annual Income",
    type: "single_select",
    required: true,
    options: [
      { code: "lt_10k", label: "< USD 10K" },
      { code: "10k_50k", label: "USD 10K–50K" },
      { code: "50k_100k", label: "USD 50K–100K" },
      { code: "100k_1m", label: "USD 100K–1M" },
      { code: "1m_plus", label: "USD 1M+" },
    ],
  },
  {
    id: "account_purpose",
    step: 3,
    title: "Purpose of Account",
    type: "single_select",
    required: true,
    options: [
      { code: "investment", label: "Investment" },
      { code: "trading", label: "Trading" },
      { code: "long_term_holding", label: "Long-Term Holding" },
      { code: "business", label: "Business" },
      { code: "other", label: "Other" },
    ],
    other_input: {
      field: "account_purpose_other",
      placeholder: "Other — Please specify",
      required_when: "other",
    },
  },
  {
    id: "crypto_experience",
    step: 4,
    title: "Crypto Trading Experience",
    type: "single_select",
    required: true,
    options: [
      { code: "none", label: "No experience" },
      { code: "lt_1y", label: "< 1 year" },
      { code: "1_3y", label: "1–3 years" },
      { code: "3_5y", label: "3–5 years" },
      { code: "gt_5y", label: "More than 5 years" },
    ],
  },
  {
    id: "is_pep",
    step: 5,
    title: "Are you a Politically Exposed Person (PEP)?",
    type: "boolean",
    required: true,
    options: [
      { code: true, label: "Yes" },
      { code: false, label: "No" },
    ],
  },
  {
    id: "expected_monthly_volume",
    step: 6,
    title: "Expected Monthly Trading Volume",
    type: "single_select",
    required: true,
    options: [
      { code: "lt_10k", label: "< USD 10K" },
      { code: "10k_50k", label: "USD 10K–50K" },
      { code: "50k_100k", label: "USD 50K–100K" },
      { code: "100k_1m", label: "USD 100K–1M" },
      { code: "1m_plus", label: "USD 1M+" },
    ],
  },
  {
    id: "source_of_funds",
    step: 7,
    title: "What is your primary source of funds for transactions on Coincode?",
    type: "single_select",
    required: true,
    options: [
      { code: "salary", label: "Salary / Employment Income" },
      { code: "business_income", label: "Business Income" },
      { code: "personal_savings", label: "Personal Savings" },
      { code: "investment_income", label: "Investment Income" },
      { code: "sale_of_property", label: "Sale of Property / Business" },
      { code: "inheritance", label: "Inheritance" },
      { code: "crypto_assets", label: "Cryptocurrency / Virtual Assets" },
      { code: "other", label: "Other" },
    ],
    other_input: {
      field: "source_of_funds_other",
      placeholder: "Other — Please specify",
      required_when: "other",
    },
  },
];

function emptyAnswers() {
  return {
    employment: null,
    employment_other: "",
    annual_income: null,
    account_purpose: null,
    account_purpose_other: "",
    crypto_experience: null,
    is_pep: null,
    expected_monthly_volume: null,
    source_of_funds: null,
    source_of_funds_other: "",
  };
}

function stepIsValid(question, answers) {
  if (!question) return false;
  const value = answers[question.id];
  if (question.type === "boolean") {
    if (typeof value !== "boolean") return false;
  } else if (value == null || value === "") {
    return false;
  }
  const other = question.other_input;
  if (other && codesEqual(value, other.required_when)) {
    const text = String(answers[other.field] || "").trim();
    if (!text) return false;
  }
  return true;
}

const OnboardingCddScreen = () => {
  const dispatch = useAppDispatch();
  const { colors: themeColors, isDark } = useTheme();

  const [questions, setQuestions] = useState(FALLBACK_QUESTIONS);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState(emptyAnswers());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const question = questions[stepIndex] || questions[0];
  const total = questions.length || 7;
  const progressPct = ((stepIndex + 1) / total) * 100;
  const isLast = stepIndex >= total - 1;
  const canNext = stepIsValid(question, answers);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [schemaRes, profileRes] = await Promise.all([
        appOperation.customer.cddGetSchema(),
        appOperation.customer.cddGetProfile(),
      ]);
      const schemaQs = schemaRes?.data?.questions;
      if (schemaRes?.success && Array.isArray(schemaQs) && schemaQs.length) {
        setQuestions(schemaQs);
      }
      if (profileRes?.success && profileRes?.data?.completed) {
        await clearPostSignupCdd();
        NavigationService.resetToMainApp(NAVIGATION_BOTTOM_TAB_STACK);
        return;
      }
      if (profileRes?.success && profileRes?.data?.answers) {
        setAnswers((prev) => ({ ...prev, ...profileRes.data.answers }));
        const qs = schemaQs?.length ? schemaQs : FALLBACK_QUESTIONS;
        const mergedAnswers = { ...emptyAnswers(), ...profileRes.data.answers };
        const firstMissing = qs.findIndex((q) => !stepIsValid(q, mergedAnswers));
        if (firstMissing >= 0) setStepIndex(firstMissing);
      }
    } catch (e) {
      setError(e?.message || "Could not load questions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectOption = (code) => {
    setError("");
    const key = optionCodeKey(code);
    setAnswers((prev) => {
      const next = { ...prev, [question.id]: key };
      if (question.other_input && !codesEqual(key, question.other_input.required_when)) {
        next[question.other_input.field] = "";
      }
      return next;
    });
  };

  const setOtherText = (field, value) => {
    setError("");
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  };

  const handleNext = async () => {
    if (!canNext || submitting) return;
    if (!isLast) {
      setStepIndex((i) => i + 1);
      return;
    }
    setSubmitting(true);
    try {
      const payload = { submit: true };
      questions.forEach((q) => {
        payload[q.id] = answers[q.id];
        if (q.other_input && answers[q.id] === q.other_input.required_when) {
          const otherVal = String(answers[q.other_input.field] || "").trim();
          payload[q.other_input.field] = otherVal;
        }
      });
      console.log(payload, '====payload');

      const result = await appOperation.customer.cddSubmit(payload);

      if (!result?.success || !result?.data?.completed) {
        showError(result?.message || "Please complete all questions.");
        return;
      }

      await clearPostSignupCdd();
      showSuccess("Customer Due Diligence completed");

      // Update local profile directly to avoid re-fetching issues if possible
      // Or just navigate to Main App, the user profile is refetched there anyway
      NavigationService.resetToMainApp(NAVIGATION_BOTTOM_TAB_STACK);

    } catch (e) {
      showError(e?.message || "Could not save answers.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    await clearPostSignupCdd();
    dispatch(logoutAction()); // Ensure the user is fully logged out 
  };

  const other = question?.other_input;
  const showOther = other && codesEqual(answers[question.id], other.required_when);
  const options = useMemo(() => question?.options || [], [question]);

  const renderOption = (opt) => {
    const selected = codesEqual(answers[question.id], opt.code);
    const activeColor = isDark ? colors.cyanTheme : themeColors.button;
    const radioColor = selected ? activeColor : (isDark ? '#48484A' : '#D1D5DB');

    return (
      <AnimatedBorderOption
        key={String(opt.code)}
        option={opt}
        selected={selected}
        activeColor={activeColor}
        inactiveColor={isDark ? '#2C2C2E' : '#E5E5EA'}
        onPress={() => selectOption(opt.code)}
        themeColors={themeColors}
        isDark={isDark}
      />
    );
  };

  return (
    <AppSafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.header}>
        <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
          Customer Due Diligence
        </AppText>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.button} />
          <AppText type={FOURTEEN} style={{ color: themeColors.text, marginTop: 16 }}>Loading questions...</AppText>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <KeyboardScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            enableOnAndroid={false}
            extraScrollHeight={20}
            keyboardShouldPersistTaps="handled"
          >
            {/* Progress Bar */}
            <View style={[styles.progressContainer, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
              <View style={[styles.progressBar, { width: `${progressPct}%`, backgroundColor: themeColors.button }]} />
            </View>

            <View style={styles.questionHeader}>
              <View style={[styles.stepBadge, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
                  {question?.step || stepIndex + 1}
                </AppText>
              </View>
              <AppText type={EIGHTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, flex: 1, marginLeft: 12 }}>
                {question?.title || "Customer Due Diligence"}
              </AppText>
            </View>

            {question?.id === "is_pep" && (
              <AppText type={THIRTEEN} style={{ color: isDark ? '#8A8A93' : '#8E8E93', marginBottom: 20 }}>
                A Politically Exposed Person holds a prominent public role, or is a close family member or associate of one.
              </AppText>
            )}

            <View style={styles.optionsContainer}>
              {options.map(renderOption)}
            </View>

            {showOther && (
              <View style={{ marginTop: 20 }}>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: 'transparent',
                      borderColor: isDark ? '#2C2C2E' : '#E5E5EA',
                      color: themeColors.text
                    }
                  ]}
                  placeholder={other.placeholder || "Other (please specify)"}
                  placeholderTextColor={isDark ? '#8A8A93' : '#8E8E93'}
                  value={String(answers[other.field] ?? "")}
                  onChangeText={(text) => setOtherText(other.field, text)}
                  maxLength={120}
                  autoFocus
                />
              </View>
            )}

            {/* {error ? (
              <AppText type={FOURTEEN} style={{ color: themeColors.sellButton, marginTop: 16 }}>
                {error}
              </AppText>
            ) : null} */}

          </KeyboardScrollView>

          <View style={[styles.footer, { borderTopColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
            <View style={styles.actionRow}>
              {stepIndex > 0 && (
                <>
                  <TouchableOpacity
                    style={[
                      styles.btnOutline,
                      { borderColor: isDark ? colors.white : colors.black, opacity: submitting ? 0.4 : 1 }
                    ]}
                    onPress={handleBack}
                    disabled={submitting}
                  >
                    <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: isDark ? colors.white : colors.black }}>
                      Back
                    </AppText>
                  </TouchableOpacity>
                  <View style={{ width: 12 }} />
                </>
              )}

              <TouchableOpacity
                style={[
                  styles.btnSolid,
                  { backgroundColor: themeColors.button, opacity: (!canNext || submitting) ? 0.4 : 1 }
                ]}
                onPress={handleNext}
                disabled={!canNext || submitting}
              >
                {submitting && isLast ? (
                  <ActivityIndicator size="small" color="#1E2329" style={{ marginRight: 8 }} />
                ) : null}
                <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: '#1E2329' }}>
                  {isLast ? (submitting ? "Submitting..." : "Submit") : "Next"}
                </AppText>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancel}
              disabled={submitting}
            >
              <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: isDark ? '#8A8A93' : '#8E8E93', textDecorationLine: 'underline' }}>
                Cancel and log out
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  progressContainer: {
    height: 4,
    borderRadius: 2,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    fontFamily: 'Inter-Regular', // Assuming standard font
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  actionRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  btnOutline: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnSolid: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  }
});

export default OnboardingCddScreen;
