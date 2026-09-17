import React from 'react';
import {StyleSheet, View} from 'react-native';
import Modal from 'react-native-modal';
import {colors} from '../theme/colors';
import {borderWidth} from '../theme/dimens';
import TouchableOpacityView from './TouchableOpacityView';
import FastImage from 'react-native-fast-image';
import {camera_ic_big, gallery_ic} from '../helper/ImageAssets';
import {AppText} from './AppText';
import {
  checkValue,
  getCameraPermission,
  getGalleryPermissions,
} from '../helper/utility';
import {showError} from '../helper/logger';
import {errorText} from '../helper/Constants';
import {useAppSelector} from '../store/hooks';
import { useTheme } from '../hooks/useTheme';

const PictureModal = ({
  isVisible,
  onBackButtonPress,
  onPressCamera,
  onPressGallery,
  isFront = false,
}) => {
  const { colors: themeColors, isDark } = useTheme();
  
  const languages = useAppSelector(state => {
    return state.account.languages;
  });

  return (
    <Modal
      isVisible={isVisible}
      backdropOpacity={isDark ? 0.7 : 0.5}
      style={{justifyContent: "flex-end", margin: 0}}
      onBackdropPress={onBackButtonPress}
      onBackButtonPress={onBackButtonPress}
      animationIn="slideInUp"
      animationOut="slideOutDown"
    >
      <View style={[styles.container, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        <View style={[styles.dragHandle, { backgroundColor: themeColors.border }]} />
        <TouchableOpacityView
          onPress={() => {
            onBackButtonPress();
            setTimeout(() => {
              getCameraPermission().then(res => {
                if (res) {
                  onPressCamera();
                } else {
                  showError(errorText.cameraPermission);
                }
              });
            }, 500);
          }}
          style={[styles.singleContainer, { borderColor: themeColors.border, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)" }]}>
          <AppText style={{ color: themeColors.text }}>{checkValue(languages?.camera) || "Take a Photo"}</AppText>
        </TouchableOpacityView>
        {!isFront && (
          <TouchableOpacityView
            onPress={() => {
              onBackButtonPress();
              setTimeout(() => {
                getGalleryPermissions().then(res => {
                  if (res) {
                    onPressGallery();
                  } else {
                    showError(errorText.galleryPermission);
                  }
                });
              }, 500);
            }}
            style={[styles.singleContainer, { borderColor: themeColors.border, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)" }]}>
            <AppText style={{ color: themeColors.text }}>{checkValue(languages?.gallery) || "Choose from Gallery"}</AppText>
          </TouchableOpacityView>
        )}
        <TouchableOpacityView
          onPress={onBackButtonPress}
          style={[styles.cancelBtn, { marginTop: 10 }]}>
          <AppText style={{ color: colors.red }}>Cancel</AppText>
        </TouchableOpacityView>
      </View>
    </Modal>
  );
};

export {PictureModal};

const styles = StyleSheet.create({
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: "100%",
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
    opacity: 0.5,
  },
  singleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  }
});
