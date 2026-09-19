import React from 'react';
import FuturesTrade from './FuturesTrade';

const FuturesNavigator = () => {
  return <FuturesTrade />;
};

export default FuturesNavigator;

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // paddingHorizontal: 5,
    paddingTop: 10,
    paddingBottom: 5,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 20,
    height: 20,
  },
  tabsWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    paddingLeft: 5,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  activeIndicator: {
    height: 3,
    width: 18,
    borderRadius: 2,
  },
});
