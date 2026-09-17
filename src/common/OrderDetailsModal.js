import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { formatToLakh, toFixedEight } from '../helper/utility';
import FastImage from 'react-native-fast-image';
import { BACK_ICON } from '../helper/ImageAssets';
import { SpinnerSecond } from './SpinnerSecond';

const OrderDetailsModal = ({ visible, onClose, onBuy, subscribeData, onBack }) => {
  // console.log(subscribeData, "subscribeData");

  const handleBuyPackage = () => {
    let data = {
      planId: subscribeData?.package?._id,
      investAmount: subscribeData?.amount,
      walletType: subscribeData?.walletType
    };
    onBuy(data);
  }
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.container}>
              {/* Header */}
              <View style={styles.header}>
                {/* <TouchableOpacity onPress={onClose}>
                  <FastImage source={BACK_ICON} resizeMode="contain" style={{width: 15, height: 15}}/>
                </TouchableOpacity> */}
                <Text style={styles.title}>Order Details</Text>
                <TouchableOpacity onPress={onClose}>
                  <Text style={styles.close}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* Content */}
              <View style={styles.row}>
                <Text style={styles.label}>Duration:</Text>
                <Text style={styles.value}>{subscribeData?.package?.duration_days} Days</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Subscription Amount:</Text>
                <Text style={styles.value}>{formatToLakh(subscribeData?.amount)}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Start Date:</Text>
                <Text style={styles.value}>{subscribeData?.subscriptionDate}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>End Date:</Text>
                <Text style={styles.value}>{subscribeData?.redemptionDate}</Text>
              </View>

              <Text style={[styles.label, { marginTop: 16 }]}>Bonus Rate</Text>

              <View style={styles.row}>
                <Text style={styles.label}>Monthly ROI ⓘ:</Text>
                <Text style={styles.value}>{subscribeData?.package?.return_percentage_monthly} %</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Yearly ROI ⓘ:</Text>
                <Text style={styles.value}>{subscribeData?.package?.return_percentage_yearly} %</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Estimated Bonus:</Text>
                <View style={styles.bonusBox}>
                  <Text style={styles.bonusText}>{formatToLakh(toFixedEight((subscribeData?.package?.return_percentage_yearly * +subscribeData?.amount) / 100) || 0)} {subscribeData?.package?.currency}</Text>
                </View>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Receive Amount:</Text>
                <Text style={styles.value}>{formatToLakh(+subscribeData?.amount + (subscribeData?.package?.return_percentage_yearly * +subscribeData?.amount) / 100 || 0)} {subscribeData?.package?.currency}</Text>
              </View>

              {/* Buy Button */}
              <TouchableOpacity style={styles.button} onPress={handleBuyPackage}>
                <Text style={styles.buttonText}>Buy Package</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
      <SpinnerSecond />
    </Modal>
  );
};

export default OrderDetailsModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 16,
  },
  container: {
    backgroundColor: '#FAF9F6',
    borderRadius: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backArrow: {
    fontSize: 22,
    color: '#000',
  },
  close: {
    fontSize: 20,
    color: '#000',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f4c430',
    flex: 1,
    textAlign: 'center',
    // marginLeft: , // balance close and back icon
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  label: {
    color: '#000',
    fontSize: 14,
  },
  value: {
    color: '#000',
    fontWeight: '600',
  },
  bonusBox: {
    backgroundColor: '#2e5939',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bonusText: {
    color: '#b6f3c1',
    fontWeight: 'bold',
    fontSize: 13,
  },
  button: {
    backgroundColor: '#f4c430',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 24,
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#222',
  },
});

