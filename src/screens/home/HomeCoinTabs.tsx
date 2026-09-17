import React from 'react';
import { View, StyleSheet } from 'react-native';
import TouchableOpacityView from '../../shared/components/TouchableOpacityView';
import { AppText, SEMI_BOLD } from '../../shared';
import { colors } from '../../theme/colors';
import { useAppSelector } from '../../store/hooks';
import { checkValue } from '../../helper/utility';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInRight,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';

interface HomeCoinTabsProps {
  activeTab: number;
  setActiveTab: React.Dispatch<React.SetStateAction<number>>;
  isGuest?: boolean;
}

const AnimatedTab = React.memo(({
  index,
  activeTab,
  setActiveTab,
  children,
  delay = 0
}: {
  index: number;
  activeTab: number;
  setActiveTab: (tab: number) => void;
  children: React.ReactNode;
  delay?: number;
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (activeTab === index) {
      scale.value = withSpring(1.05, { damping: 10 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = withSpring(1, { damping: 10 });
      opacity.value = withTiming(0.7, { duration: 200 });
    }
  }, [activeTab, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      entering={FadeInRight.duration(300).delay(delay)}
      style={[animatedStyle]}
    >
      <TouchableOpacityView
        style={styles.tabContainer}
        onPress={() => setActiveTab(index)}
        activeOpacity={0.8}
      >
        {children}
      </TouchableOpacityView>
    </Animated.View>
  );
});

const HomeCoinTabs = ({
  activeTab,
  setActiveTab,
}: HomeCoinTabsProps) => {
  const { colors: themeColors } = useTheme();
  const languages = useAppSelector(state => state.account.languages);

  const activeTextColor = themeColors.text;
  const inactiveTextColor = themeColors.secondaryText;

  const tabTextStyle = (isActive: boolean) => [
    styles.tabName,
    { color: isActive ? activeTextColor : inactiveTextColor },
  ];

  return (
    <View style={styles.container}>
      <AnimatedTab index={0} activeTab={activeTab} setActiveTab={setActiveTab} delay={0}>
        <View style={styles.tabContent}>
          <AppText
            weight={SEMI_BOLD}
            style={tabTextStyle(activeTab === 0)}
            numberOfLines={1}
          >
            {checkValue(languages?.favorite)}
          </AppText>
        </View>
      </AnimatedTab>

      <AnimatedTab index={1} activeTab={activeTab} setActiveTab={setActiveTab} delay={50}>
        <View style={styles.tabContent}>
          <AppText
            weight={SEMI_BOLD}
            style={tabTextStyle(activeTab === 1)}
            numberOfLines={1}
          >
            {checkValue(languages?.spot)}
          </AppText>
        </View>
      </AnimatedTab>

      <AnimatedTab index={2} activeTab={activeTab} setActiveTab={setActiveTab} delay={100}>
        <View style={styles.tabContent}>
          <AppText
            weight={SEMI_BOLD}
            style={tabTextStyle(activeTab === 2)}
            numberOfLines={1}
          >
            {checkValue(languages?.gainer)}
          </AppText>
        </View>
      </AnimatedTab>

      <AnimatedTab index={3} activeTab={activeTab} setActiveTab={setActiveTab} delay={150}>
        <View style={styles.tabContent}>
          <AppText
            weight={SEMI_BOLD}
            style={tabTextStyle(activeTab === 3)}
            numberOfLines={1}
          >
            {checkValue(languages?.loser) || 'Loser'}
          </AppText>
        </View>
      </AnimatedTab>

      <AnimatedTab index={4} activeTab={activeTab} setActiveTab={setActiveTab} delay={200}>
        <View style={styles.tabContent}>
          <AppText
            weight={SEMI_BOLD}
            style={tabTextStyle(activeTab === 4)}
            numberOfLines={1}
          >
            {checkValue(languages?.futures)}
          </AppText>
        </View>
      </AnimatedTab>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginTop: 10,
    width: '100%',
    justifyContent: 'flex-start',
    gap: 0,
  },
  tabContainer: {
    height: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 12,
    marginRight: 0,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabName: {
    fontSize: 15.5,
    textAlign: 'center',
  },
});

export default HomeCoinTabs;
