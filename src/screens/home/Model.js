import React from 'react';
import {View, StyleSheet, Modal, Animated} from 'react-native';
import FastImage from 'react-native-fast-image';
import {doneIcon} from '../../helper/ImageAssets';
import {useAppSelector} from '../../store/hooks';
import {AppText, BLACK, TEN, THIRTEEN, TWENTY} from '../../shared';
import TouchableOpacityView from '../../shared/components/TouchableOpacityView';
import {colors} from '../../theme/colors';
import {
  smallButtonHeight,
  universalPaddingHorizontalHigh,
} from '../../theme/dimens';

const PopupModal = ({visible, handleVisiblity}) => {
  const [showModal, setShowModal] = React.useState(visible);
  const scaleValue = React.useRef(new Animated.Value(0)).current;
  const feeDetails = useAppSelector(state => state.home.feeDetails);
  const orderData = useAppSelector(state => state.home.orderData);
  const {maker_fee, taker_fee, tds, transaction_fee} = feeDetails ?? '';
  const {quantity, total} = orderData ?? '';
  const totalFee =
    Number(maker_fee ?? 0) +
    Number(taker_fee ?? 0) +
    Number(transaction_fee ?? 0);

  React.useEffect(() => {
    toggleModal();
  }, [visible]);
  const toggleModal = () => {
    if (visible) {
      setShowModal(true);
      Animated.spring(scaleValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      setTimeout(() => setShowModal(false), 200);
      Animated.timing(scaleValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };
  const handelPress = () => {
    handleVisiblity();
  };
  return (
    <Modal transparent visible={showModal}>
      <View style={styles.modalBackGround}>
        <Animated.View
          style={[styles.modalContainer, {transform: [{scale: scaleValue}]}]}>
          <View style={styles.container}>
            <View style={styles.wrapper}>
              <View style={styles.imageContainer}>
                <FastImage
                  resizeMode="contain"
                  source={doneIcon}
                  style={styles.icon}
                />
              </View>
              <AppText type={TWENTY} style={styles.titletext1}>
                {'Order Created Successfully'}
              </AppText>
              <View style={styles.itemsContainer}>
                <AppText style={styles.item}>Quantity</AppText>
                <AppText style={styles.item}>{quantity}</AppText>
              </View>
              <View style={styles.itemsContainer}>
                <AppText style={styles.item}>TDS</AppText>
                <AppText style={styles.item}>{tds}</AppText>
              </View>
              <View style={styles.itemsContainer}>
                <AppText style={styles.item}>FEE</AppText>
                <AppText style={styles.item}>{totalFee}</AppText>
              </View>
              <View style={styles.itemsContainer}>
                <AppText style={styles.item}>Total</AppText>
                <AppText style={styles.item}>{total}</AppText>
              </View>
              <AppText type={TEN} style={styles.titletext2}>
                Fee: Maker: 0.2% l Taker: 0.2% l TDS: 1.0% l Incl. of all
                applicable taxes
              </AppText>
              <View style={styles.btnContainer}>
                <TouchableOpacityView
                  onPress={handelPress}
                  style={[styles.actionBtn]}>
                  <AppText type={THIRTEEN} color={BLACK}>
                    OK
                  </AppText>
                </TouchableOpacityView>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};
const styles = StyleSheet.create({
  modalBackGround: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    // width: '94%',
    backgroundColor: '#36363F',
    paddingHorizontal: 15,
    paddingVertical: 25,
    borderRadius: 20,
    elevation: 20,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    // width: '100%',
  },
  imageContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 35,
  },
  itemsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderColor: colors.thirdBg,
    borderBottomWidth: 0.5,
  },
  item: {
    padding: 2,
  },
  wrapper: {
    // width: '90%',
  },
  btnContainer: {
    margin: 20,
  },
  actionBtn: {
    // width: 50,
    height: smallButtonHeight,
    // marginTop: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    backgroundColor: colors.buttonBg,
    paddingHorizontal: universalPaddingHorizontalHigh,
  },
  titletext1: {
    marginBottom: 25,
    textAlign: 'center',
  },
  titletext2: {
    marginTop: 10,
  },
  btnContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  icon: {
    height: 50,
    width: 60,
  },
});
export default PopupModal;
