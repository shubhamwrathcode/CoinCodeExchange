import React, { useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import { AppText, ELEVEN, MEDIUM, NORMAL, SECOND, TWELVE, WHITE } from '.';

interface AppTextProps {
  firstText?: any;
  secondText?: any;
  Firststyle?: ViewStyle; 
  secondStyle?: ViewStyle; 

}

const SpaceBetweenView = ({ firstText, secondText, Firststyle,secondStyle }: AppTextProps) => {
  return (
    <View
      style={{
        width: '95%',
        padding: 5,
        justifyContent: 'space-between',
        flexDirection: 'row',
        alignSelf: 'center',
        borderRadius: 5,
        paddingHorizontal: 10,
        alignItems: 'center',
        
      }}>
      <AppText type={TWELVE} weight={MEDIUM} color={SECOND} style={Firststyle}>
        {firstText}
      </AppText>
      <AppText type={ELEVEN} weight={NORMAL} color={WHITE} style={secondStyle}>
        {secondText}
      </AppText>
    </View>
  );
};

export default SpaceBetweenView;
