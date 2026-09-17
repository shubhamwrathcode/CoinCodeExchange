import React, {useEffect, useRef, useState} from 'react';
import {
  AppSafeAreaView,
  Button,
  Input,
  PictureModal,
  Toolbar,
} from '../../shared';
import KeyBoardAware from '../../shared/components/KeyboardAware';
import {Alert, Keyboard, StyleSheet, View} from 'react-native';
import {colors} from '../../theme/colors';
import {borderWidth, universalPaddingHorizontal} from '../../theme/dimens';
import {BASE_URL} from '../../helper/Constants';
import TouchableOpacityView from '../../shared/components/TouchableOpacityView';
import FastImage from 'react-native-fast-image';
import {camera_ic, HomeBg, profile_placeholder_ic} from '../../helper/ImageAssets';
import {useAppDispatch, useAppSelector} from '../../store/hooks';
import ImagePicker from 'react-native-image-crop-picker';
import {showError} from '../../helper/logger';
import {editUserProfile} from '../../actions/accountActions';
import {SpinnerSecond} from '../../shared/components/SpinnerSecond';
import {checkValue} from '../../helper/utility';
import {sendOtp, verifyOtp} from '../../actions/authActions';

const EditProfile = () => {
  const dispatch = useAppDispatch();
  const [profileImage, setProfileImage] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [photo, setPhoto] = useState();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const lastNameInput = useRef(null);
  const phoneInput = useRef(null);
  const emailInput = useRef(null);
  const otpInput = useRef(null);
  const phoneOtpInput = useRef(null);
  const userData = useAppSelector(state => state.auth.userData);
  const languages = useAppSelector(state => {
    return state.account.languages;
  });
  const [otpText, setOtpText] = useState(checkValue(languages?.register_nine));
  const {
    firstName: _firstName,
    lastName: _lastName,
    mobileNumber,
    profilepicture,
    emailId,
  } = userData ?? '';

  console.log(userData, "userData");

  useEffect(() => {
    if (_firstName) {
      setFirstName(_firstName);
    }
    if (_lastName) {
      setLastName(_lastName);
    }
    if (mobileNumber) {
      setPhone(mobileNumber);
    }
    if (emailId) {
      setEmail(emailId);
    }
  }, []);

  const onPressCamera = () => {
    ImagePicker.openCamera({
      multiple: false,
      mediaType: 'photo',
      cropping: true,
      compressImageQuality: 1
    })
      .then(image => {
        if(image?.size < 5000000 && (image?.mime === "image/png" || image?.mime === "image/jpeg" || image?.mime === "image/jpg")) {
          setProfileImage(image.path);
        let mime = image?.mime?.split('/');
        let tempphoto = {
          uri: image?.path,
          name: image?.path || 'profile_image',
          type: image?.mime,
        };
        setPhoto(tempphoto);
        } else {
          setPhoto('');
          showError("Only JPEG, PNG & JPG formats and file size upto 5MB are supported");
          return;
        }
      })
      .catch(error => {
        console.log(error);
      });
  };
  const onPressGallery = () => {
    ImagePicker.openPicker({
      multiple: false,
      mediaType: 'photo',
      cropping: true,
      compressImageQuality: 0
    })
      .then(image => {
        // setProfileImage(image.path);
        // let mime = image?.mime?.split('/');
        // let tempphoto = {
        //   uri: image?.path,
        //   name: image?.path || 'profile_image',
        //   type: image?.mime,
        // };
        // setPhoto(tempphoto);
        if(image?.size < 5000000 && (image?.mime === "image/png" || image?.mime === "image/jpeg" || image?.mime === "image/jpg")) {
         setProfileImage(image.path);
        let mime = image?.mime?.split('/');
        let tempphoto = {
          uri: image?.path,
          name: image?.path || 'profile_image',
          type: image?.mime,
        };
        setPhoto(tempphoto);
        } else {
          showError("Only JPEG, PNG & JPG formats and file size upto 5MB are supported");
          return;
        }
        
      })
      .catch(error => {
        console.log(error);
      });
  };

  const onSubmit = () => {
    if (!firstName) {
      showError(checkValue(languages?.error_firstName));
      return;
    }
    if (!lastName) {
      showError(checkValue(languages?.error_lastName));
      return;
    }
    let data = new FormData();
    data.append('firstName', firstName);
    data.append('lastName', lastName);
    data.append('mobileNumber', phone || '');
    if (!emailId) {
      data.append('emailId', email || '');
    }
    if (!emailId) {
      data.append('eotp', otp);
    }
    if (!mobileNumber) {
      data.append('motp', phoneOtp);
    }
    if (photo) {
      data?.append('profilepicture', photo);
    }
    dispatch(editUserProfile(data));
  };

  const onGetOtpEmail = () => {
    let data = {
      email_or_phone: email,
      resend: true,
      type: 'registration',
    };
    dispatch(sendOtp(data));
    setOtpText(checkValue(languages?.register_ten));
    Keyboard.dismiss();
  };

  const onGetOtpPhone = () => {
    if(!phone) {
      showError(checkValue(languages?.error_Phone));
      return
    }
    let data = {
      email_or_phone: phone,
      resend: true,
      type: 'registration',
    };
    dispatch(sendOtp(data));
    setOtpText(checkValue(languages?.register_ten));
    Keyboard.dismiss();
  };

  return (
    <AppSafeAreaView source={HomeBg}>
      <Toolbar isLogo />
      <KeyBoardAware>
        <View style={styles.container}>
          <Input
            title={checkValue(languages?.title_firstName)}
            placeholder={checkValue(languages?.place_firstName)}
            value={firstName}
            onChangeText={text => setFirstName(text)}
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => lastNameInput?.current?.focus()}
            mainContainer={styles.firstNameInput}
          />
          <Input
            title={checkValue(languages?.title_lastName)}
            placeholder={checkValue(languages?.place_lastName)}
            value={lastName}
            onChangeText={text => setLastName(text)}
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => emailInput?.current?.focus()}
            assignRef={input => {
              lastNameInput.current = input;
            }}
          />
          <Input
            editable={emailId ? false : true}
            placeholder={'Enter Email'}
            value={email}
            onChangeText={text => setEmail(text)}
            title={'Email'}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => otpInput?.current?.focus()}
            assignRef={input => {
              emailInput.current = input;
            }}
            isOtp={emailId ? false : true}
            onSendOtp={() => onGetOtpEmail()}
            otpText={otpText}
          />
          {!emailId && (
            <Input
              placeholder={'Enter OTP'}
              value={otp}
              title="Email OTP"
              onChangeText={text => setOtp(text)}
              keyboardType="numeric"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => phoneInput?.current?.focus()}
              assignRef={input => {
                otpInput.current = input;
              }}
              onSubmitEditing={() => phoneOtpInput?.current?.focus()}
            />
          )}
          <Input
            title={checkValue(languages?.title_phone)}
            placeholder={checkValue(languages?.place_userName)}
            value={phone}
            onChangeText={text => setPhone(text)}
            autoCapitalize="none"
            returnKeyType="done"
            keyboardType="numeric"
            isOtp={mobileNumber ? false : true}
            editable={mobileNumber ? false : true}
            assignRef={input => {
              phoneInput.current = input;
            }}
            otpText={otpText}
            onSendOtp={() => onGetOtpPhone()}
          />
          {!mobileNumber && (
            <Input
              placeholder={'Enter OTP'}
              value={phoneOtp}
              title="Mobile OTP"
              onChangeText={text => setPhoneOtp(text)}
              keyboardType="numeric"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => phoneInput?.current?.focus()}
              assignRef={input => {
                otpInput.current = input;
              }}
            />
          )}
          <View
            style={styles.imageContainer}>
            <TouchableOpacityView style={styles.imageContainer2} onPress={() => setIsVisible(true)}>
              <FastImage
                source={
                  profileImage
                    ? {uri: profileImage}
                    : profilepicture
                    ? {uri: `${BASE_URL}${profilepicture}`}
                    : profile_placeholder_ic
                }
                style={styles.profileImage}
                resizeMode="contain"
              />
              <View style={styles.cameraIconContainer}>
                <FastImage
                  source={camera_ic}
                  resizeMode="contain"
                  style={styles.cameraIcon}
                />
              </View>
            </TouchableOpacityView>
          </View>
        </View>
        <Button
          children={checkValue(languages?.otp_five)}
          onPress={() => onSubmit()}
          containerStyle={styles.button}
        />
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

export default EditProfile;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white_fifteen,
    marginTop: 120,
    padding: universalPaddingHorizontal,
    borderWidth: borderWidth,
    borderColor: colors.inputBorder,
    borderRadius: 10,
  },
  button: {marginTop: 50},
  imageContainer: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    left: 0,
    top: -50,
    alignSelf: 'center'
  },
  imageContainer2: {
    height: 100,
    width: 100,
    borderRadius: 200,
    borderColor: colors.buttonBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  firstNameInput: {
    marginTop: 50,
  },
  profileImage: {
    height: 94,
    width: 94,
    borderRadius: 150,
  },
  cameraIcon: {
    height: 29,
    width: 29,
  },
  cameraIconContainer: {
    position: 'absolute',
    height: 32,
    width: 32,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    bottom: 0,
    right: 0,
  },
});
