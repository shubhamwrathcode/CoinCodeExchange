import { ImageBackground, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import AntDesign from 'react-native-vector-icons/AntDesign'
import FastImage from 'react-native-fast-image'
import { BACK_ICON, closeIcon, Refresh } from '../../helper/ImageAssets'
import Fontisto from 'react-native-vector-icons/Fontisto'
import { TouchableOpacity } from 'react-native-gesture-handler'
import { colors } from '../../theme/colors'
import { AppText } from '../AppText'
import NavigationService from '../../navigation/NavigationService'
const HeaderArbitory = ({title, theme}) => {
  return (
    <View style={{flexDirection:"row",justifyContent: "space-between",alignItems:"center",marginHorizontal:15,marginVertical:10, width: "80%"}}>
      <TouchableOpacity style={{flexDirection:"row"}} onPress={() => NavigationService.goBack()}>
        <FastImage source={BACK_ICON} style={{width: 20, height: 20}} resizeMode="contain" tintColor={theme !== "Dark" ? colors.black: colors.white} />
        {/* <AntDesign name="arrowleft" size={20} color={'#222'}/> */}
        
      </TouchableOpacity>
      <AppText style={{fontSize:17,fontWeight:"600",color:theme !==  "Dark"?"#222": "#fff"
        }}>{title}</AppText>
      {/* <View style={{flexDirection:"row",marginRight:10,alignItems:"center"}}>
        <TouchableOpacity style={{marginHorizontal:20}}>
        <FastImage source={Refresh} style={styles.refresh} tintColor={theme !== "Dark" ? colors.black: colors.white} resizeMode='contain'/>
        </TouchableOpacity>
        <TouchableOpacity>
        <FastImage source={closeIcon} style={{width: 20, height: 20}} resizeMode="contain" tintColor={theme !== "Dark" ? colors.black: colors.white} />
        </TouchableOpacity>

      </View> */}
    </View>
  )
}

export default HeaderArbitory

const styles = StyleSheet.create({
    refresh:{
        height:25,
        width:25,
    }
})