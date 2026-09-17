import React from 'react';
import {View, StyleSheet, Modal, Animated} from 'react-native';
import FastImage from 'react-native-fast-image';
import {doneIcon} from '../helper/ImageAssets';
import {useAppSelector} from '../store/hooks';
import {AppText, BLACK, EIGHTEEN, SEMI_BOLD, SIXTEEN, TEN, THIRTEEN, TWENTY} from './AppText';
import TouchableOpacityView from './TouchableOpacityView';
import {colors} from '../theme/colors';
import { useTheme } from '../hooks/useTheme';
import {
  buttonHeight,
  smallButtonHeight,
  universalPaddingHorizontalHigh,
} from '../theme/dimens';
import NavigationService from '../navigation/NavigationService';

const TransferModal = ({visible, handleVisiblity, type}) => {
  const { colors: themeColors, isDark } = useTheme();
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
          style={[styles.modalContainer, {transform: [{scale: scaleValue}], backgroundColor: themeColors.background }]}>
          <View style={styles.container}>
            <View style={styles.wrapper}>
              <View style={styles.imageContainer}>
                <FastImage
                  resizeMode="contain"
                  source={doneIcon}
                  style={styles.icon}
                />
              </View>
              <AppText type={SIXTEEN} style={[styles.titletext1, { color: themeColors.text }]} weight={SEMI_BOLD}>
                {type === "transfer" ? 'Transfer Successfully' : type === "swap" ? "Currency Swapped Successfully" : "You have successfully purchased the earning package"}
              </AppText>
              <View style={styles.btnContainer}>
                <TouchableOpacityView
                  onPress={handelPress}
                  style={[styles.actionBtn, {height: type === "earning" && 45}]}>
                  <AppText type={THIRTEEN} weight={SEMI_BOLD} color={colors.white}>
                    {type === "earning" ? 'View Portfolio' : 'OK'}
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
    width: '85%',
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
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    backgroundColor: colors.buttonBg,
    paddingHorizontal: universalPaddingHorizontalHigh+20,
    paddingVertical:10
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
export default TransferModal;
