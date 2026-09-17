import { StyleSheet, Text, TextInput, View } from 'react-native'
import React from 'react'

const InputBox = ({placeHolder,}) => {
  return (
     <TextInput style={styles.input} placeholderTextColor={'#ccc'} placeholder={placeHolder} />
  )
}

export default InputBox

const styles = StyleSheet.create({
     input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    marginBottom: 8,
    color:'#222'
  },

})