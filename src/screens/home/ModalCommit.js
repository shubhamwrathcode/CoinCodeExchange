import React, {useEffect} from 'react';
import {Animated, Modal, StyleSheet, View, TouchableOpacity} from 'react-native';
import {doneIcon} from '../../helper/ImageAssets';
import FastImage from 'react-native-fast-image';
import {
  AppText,
  BLACK,
  EIGHTEEN,
  FIFTEEN,
  MEDIUM,
  SEMI_BOLD,
  THIRTEEN,
  WHITE,
} from '../../shared';
// import TouchableOpacityView from '../../shared/components/TouchableOpacityView';
import {
  smallButtonHeight,
  universalPaddingHorizontalHigh,
} from '../../theme/dimens';
import {colors} from '../../theme/colors';
import {Input, Button} from '../../shared';

const ModalCommit = ({
  commitExists,
  onPress,
  commitAmount,
  setCommitAmount,
  setCommitExists,
  type,
}) => {
  const [showModal, setShowModal] = React.useState(commitExists);
  // const scaleValue = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    setShowModal(commitExists);
  }, [commitExists]);
  // React.useEffect(() => {
  //     toggleModal();
  // }, [commitExists]);
  // const toggleModal = () => {
  //     if (commitExists) {
  //         setShowModal(true);
  //         Animated.spring(scaleValue, {
  //             toValue: 1,
  //             duration: 300,
  //             useNativeDriver: true,
  //         }).start();
  //     } else {
  //         setTimeout(() => setShowModal(false), 200);
  //         Animated.timing(scaleValue, {
  //             toValue: 0,
  //             duration: 300,
  //             useNativeDriver: true,
  //         }).start();
  //     }
  // };
  return (
    <Modal transparent visible={showModal}>
      <TouchableOpacity style={styles.modalBackGround} onPress={() => setCommitExists(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.container}>
            <AppText type={EIGHTEEN} weight={SEMI_BOLD}>
              {type === "update" ? "Update Commit" : "Commit"}
            </AppText>
          </View>

          <Input
            // title={'Commit'}
            placeholder={'Enter Amount'}
            value={commitAmount}
            keyboardType='numeric'
            onChangeText={text => setCommitAmount(text)}
            autoCapitalize="none"
            returnKeyType="next"
            // onSubmitEditing={() => lastNameInput?.current?.focus()}
            // mainContainer={styles.firstNameInput}
          />

          {/* <AppText type={EIGHTEEN} weight={SEMI_BOLD}>
                            Success!
                        </AppText>
                        <AppText weight={MEDIUM}>
                            You have successfully Swap NEXB Coin
                        </AppText> */}
          <Button
          disabled={commitAmount <= 0}
            children="OK"
            onPress={() => onPress()}
            containerStyle={styles.button}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
};
export default ModalCommit;
const styles = StyleSheet.create({
  modalBackGround: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#36363F',
    paddingHorizontal: 15,
    paddingVertical: 25,
    borderRadius: 20,
    elevation: 20,
    zIndex: 999
  },
  imageContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  icon: {
    height: 76,
    width: 76,
  },
  container: {
    // justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtn: {
    height: smallButtonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    backgroundColor: colors.buttonBg,
    paddingHorizontal: universalPaddingHorizontalHigh,
  },
  button: {
    width: '90%',
    marginTop: 25,
    alignSelf: 'center',
  },
});
