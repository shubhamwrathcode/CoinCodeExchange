import React, {useState, useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import {Screen} from '../theme/dimens';
import {Button, SECOND} from '.';
import {colors} from '../theme/colors';

const BuySellTab = ({onKeyPressChange, onPress}): JSX.Element => {
  const [activeTab, setActiveTab] = useState('Buy');
  // const [keyPress, setKeyPress] = useState('Buy');

  useEffect(() => {
    onKeyPressChange('Buy');
  }, []);
 
  
  const handleTabPress = (tab: string) => {
    console.log(tab, '===tab');
    setActiveTab(tab);
    onKeyPressChange(tab);
  };

  return (
    <View style={styles.btnContainer}>
      <Button
        children="BUY"
        containerStyle={[
          styles.buyBtn,
          {
            backgroundColor:
              activeTab === 'Buy' ? colors.buttonBg : colors.lightBlack,
          },
        ]}
        titleStyle={styles.buttonTitle}
        onPress={() => {
          onPress(), handleTabPress('Buy');
        }}
      />
      <Button
        children="SELL"
        containerStyle={[
          styles.sellBtn,
          {
            marginStart: 10,
            backgroundColor:
              activeTab === 'Sell' ? colors.buttonBg : colors.lightBlack,
          },
        ]}
        titleStyle={styles.buttonTitle}
        onPress={() => {
          onPress(), handleTabPress('Sell');
        }}
      />
    </View>
  );
};

export default BuySellTab;

const styles = StyleSheet.create({
  buyBtn: {
    width: '35%',
    borderRadius: 12,
  },
  btnContainer: {
    width: Screen.Width,
    padding: 15,
    marginVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  sellBtn: {
    width: '35%',
    borderRadius: 12,
    marginStart: 5,
  },
  buttonTitle: {
    color: colors.white,
    fontSize: 14,
  },
});
