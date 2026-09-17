import React, {useRef, useState} from 'react';
import {
  AppSafeAreaView,
  AppText,
  Button,
  EIGHT,
  Input,
  PictureModal,
  RED,
  SECOND,
  TEN,
  Toolbar,
} from '../../shared';
import KeyBoardAware from '../../shared/components/KeyboardAware';
import {StyleSheet, View} from 'react-native';
import {colors} from '../../theme/colors';
import {
  borderWidth,
  universalPaddingHorizontal,
  universalPaddingTop,
} from '../../theme/dimens';
import {useAppDispatch, useAppSelector} from '../../store/hooks';
import {errorText, placeHolderText} from '../../helper/Constants';
import TouchableOpacityView from '../../shared/components/TouchableOpacityView';
import FastImage from 'react-native-fast-image';
import {doneIcon, uploadIcon} from '../../helper/ImageAssets';
import {commonStyles} from '../../theme/commonStyles';
import ImageCropPicker from 'react-native-image-crop-picker';
import {SpinnerSecond} from '../../shared/components/SpinnerSecond';
import {showError} from '../../helper/logger';
import {depositInr} from '../../actions/walletActions';

const DepositInr = () => {
  const dispatch = useAppDispatch();
  const adminAccount = useAppSelector(state => state.wallet.adminBankDetails);
  const {account_number, bank_name, branch, holder_name, ifsc} =
    adminAccount ?? '';

  const [amount, setAmount] = useState('');
  const [transaction, setTransaction] = useState('');
  const transactionInput = useRef(null);
  const [photo, setPhoto] = useState();
  const [isUploaded, setIsUploaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const data = [
    {
      id: '1',
      title: 'Bank Name:',
      value: bank_name,
    },
    {
      id: '2',
      title: 'Bank Account Number:',
      value: account_number,
    },
    {
      id: '3',
      title: 'Account Holder Name:',
      value: holder_name,
    },
    {
      id: '4',
      title: 'Branch Name:',
      value: branch,
    },
    {
      id: '5',
      title: 'IFSC Code:',
      value: ifsc,
    },
  ];

  const onPressCamera = () => {
    ImageCropPicker.openCamera({
      multiple: false,
      mediaType: 'photo',
      cropping: true,
    })
      .then(image => {
        setIsUploaded(true);
        let mime = image?.mime?.split('/');
        let tempphoto = {
          uri: image.path,
          name: 'deposit_proof' + image.modificationDate + '.' + mime[1],
          type: image.mime,
        };
        setPhoto(tempphoto);
      })

      .catch(error => {
        console.log(error);
      });
  };
  const onPressGallery = () => {
    ImageCropPicker.openPicker({
      multiple: false,
      mediaType: 'photo',
      cropping: true,
    })
      .then(image => {
        setIsUploaded(true);

        let mime = image?.mime?.split('/');

        let tempphoto = {
          uri: image.path,
          name: 'deposit_proof' + image.modificationDate + '.' + mime[1],
          type: image.mime,
        };
        setPhoto(tempphoto);
      })
      .catch(error => {
        console.log(error);
      });
  };
  const onSubmit = () => {
    if (!amount) {
      showError(errorText.amount);
      return;
    }
    if (!transaction) {
      showError(errorText.transaction);
      return;
    }
    if (!photo) {
      showError(errorText.proof);
      return;
    }

    let formData = new FormData();
    formData.append('amount', amount);
    formData.append('deposit_slip', photo);
    formData.append('transaction_number', transaction);
    // console.log('+++++++', JSON.stringify(formData));

    dispatch(depositInr(formData));
  };

  return (
    <AppSafeAreaView>
      <Toolbar isSecond title={'Deposit Funds'} />
      <KeyBoardAware>
        <View style={styles.container}>
          {data.map(e => {
            return (
              <View style={styles.itemContainer} key={e.id}>
                <AppText type={TEN} color={SECOND}>
                  {e.title}
                </AppText>
                <AppText>{e.value}</AppText>
              </View>
            );
          })}
          <Input
            placeholder={placeHolderText.amountInr}
            value={amount}
            onChangeText={text => setAmount(text)}
            keyboardType="numeric"
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => transactionInput?.current?.focus()}
            containerStyle={styles.input}
          />
          <Input
            placeholder={placeHolderText.transaction}
            value={transaction}
            onChangeText={text => setTransaction(text)}
            keyboardType="numeric"
            autoCapitalize="none"
            returnKeyType="done"
            assignRef={input => {
              transactionInput.current = input;
            }}
            containerStyle={styles.input}
          />
          <TouchableOpacityView
            onPress={() => setIsVisible(true)}
            style={styles.fileContainer}>
            <FastImage
              source={isUploaded ? doneIcon : uploadIcon}
              style={styles.uploadIcon}
              resizeMode="contain"
            />
            <AppText color={SECOND}>
              {isUploaded ? 'File Uploaded' : 'Choose a File'}
            </AppText>
          </TouchableOpacityView>
        </View>
        <Button
          children="Deposit"
          onPress={() => onSubmit()}
          containerStyle={styles.button}
        />
        <AppText color={RED} type={EIGHT} style={commonStyles.centerText}>
          *Once Deposit It will Take Minimum Two Hours for Confirm
        </AppText>
      </KeyBoardAware>
      <PictureModal
        isVisible={isVisible}
        onBackButtonPress={() => setIsVisible(false)}
        onPressGallery={() => {
          onPressGallery();
        }}
        onPressCamera={() => {
          onPressCamera();
        }}
      />
      <SpinnerSecond />
    </AppSafeAreaView>
  );
};
export default DepositInr;
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white_fifteen,
    marginTop: universalPaddingTop,
    padding: universalPaddingHorizontal,
    borderWidth: borderWidth,
    borderColor: colors.inputBorder,
    borderRadius: 10,
  },
  itemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  fileContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 150,
    borderWidth: borderWidth,
    borderColor: colors.buttonBg,
    borderStyle: 'dashed',
    borderRadius: 10,
    marginTop: 20,
  },
  input: {
    marginTop: 10,
  },
  uploadIcon: {
    height: 50,
    width: 50,
  },
  button: {marginTop: 20, marginBottom: 10},
});
