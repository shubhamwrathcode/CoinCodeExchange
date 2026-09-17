import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { closeIcon } from '../helper/ImageAssets';
import { colors } from '../theme/colors';
import { AppText, BLACK, DISCLAIMTEXT } from './AppText';

const MoreInfoModal = ({ visible, onClose, item, network, theme }) => {
    console.log(item, "item");
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={[styles.modalContainer ,{}]}>
                <View style={{flexDirection: "row", justifyContent: "space-between"}}>
                <AppText style={styles.title} color={BLACK}>More Info</AppText>
                <TouchableOpacity onPress={onClose}>
                    <FastImage source={closeIcon} resizeMode='contain' style={{width: 15, height: 15}} tintColor={theme !== "Dark" ? colors.black : colors.white}/>
                </TouchableOpacity>
                </View>
              

              <ScrollView style={styles.scroll}>
                <AppText style={styles.label}>Minimum deposit</AppText>
                <AppText style={styles.value} color={DISCLAIMTEXT}>{item?.min_deposit} {item?.short_name}</AppText>

                <AppText style={styles.label}>Maximum deposit</AppText>
                <AppText style={styles.value} color={DISCLAIMTEXT}>{item?.max_deposit} {item?.short_name}</AppText>

                <AppText style={styles.label}>Wallet</AppText>
                <AppText style={styles.value} color={DISCLAIMTEXT}>Main Wallet</AppText>

                <AppText style={styles.label}>Credited (Trading enabled)</AppText>
                <AppText style={styles.value} color={DISCLAIMTEXT}>After 2 network confirmations</AppText>

                <Text style={styles.warning}>⚠️ Do not send NFTs to this address</Text>
                <Text style={styles.warning}>⚠️ Do not transact with Sanctioned Entities</Text>
                <Text style={styles.warning}>
                  ⚠️ This is {network} deposit address type. Transferring to an unsupported network could result in loss of deposit.
                </Text>
              </ScrollView>

              {/* <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity> */}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default MoreInfoModal;


const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: 20,
    },
    modalContainer: {
      backgroundColor: 'white',
      borderRadius: 10,
      padding: 20,
      maxHeight: '80%',
    },
    modalContainer: {
      backgroundColor: "#18191D",
      borderRadius: 10,
      padding: 20,
      maxHeight: '80%',
      borderWidth: 1,
      borderColor: "#595959",
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 15,
    },
    scroll: {
      marginBottom: 20,
    },
    label: {
      fontWeight: '600',
      fontSize: 14,
      marginTop: 10,
    },
    value: {
      fontSize: 14,
      marginBottom: 5,
      // color: '#555',
    },
    warning: {
      color: '#d9534f',
      fontSize: 13,
      marginTop: 10,
    },
    closeButton: {
      backgroundColor: '#007bff',
      padding: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    closeText: {
      color: '#fff',
      fontWeight: 'bold',
    },
  });
  