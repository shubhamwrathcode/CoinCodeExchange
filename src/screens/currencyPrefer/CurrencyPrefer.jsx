import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import React, { useState } from 'react';
import KycHeader from '../../shared/components/kycHeader/KycHeader';
import { bitcoinIcon, tetherIcon } from '../../helper/ImageAssets';

const currencies = [
  { id: 1, name: 'Tether USD (USDT)', icon: tetherIcon},
  { id: 2, name: 'Bitcoin (BTC)', icon: bitcoinIcon },
  { id: 3, name: 'BNB', icon:bitcoinIcon },
];

const CurrencyPrefer = () => {
  const [selectedId, setSelectedId] = useState(1);

  return (
    <View style={styles.container}>
      <KycHeader title={'Currency Preference'} />
        <View style={{marginTop:20}}>
      {currencies.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[
            styles.option,
            selectedId === item.id && styles.selectedOption,
          ]}
          onPress={() => setSelectedId(item.id)}
        >
          <View style={styles.optionContent}>
            <Image source={item.icon} style={styles.icon} />
            <Text style={styles.optionText}>{item.name}</Text>
          </View>

          {selectedId === item.id && (
            <Text style={styles.checkIcon}>✓</Text>
          )}
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>
      </View>

    </View>
  );
};

export default CurrencyPrefer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    // padding: 20,
  },
  option: {
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal:20
  },
  selectedOption: {
    backgroundColor: '#FFF7E0',
    borderWidth: 1,
    borderColor: '#D3A93C',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 22,
    height: 22,
    marginRight: 10,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
    color:"#222"
  },
  checkIcon: {
    fontSize: 18,
    color: '#D3A93C',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#F6C340',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginHorizontal:20
  },
  saveButtonText: {
    fontWeight: 'bold',
    color: '#000',
  },
});
