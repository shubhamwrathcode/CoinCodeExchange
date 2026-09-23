import React from "react";
import { StyleSheet, View, Platform } from "react-native";
import Modal from "react-native-modal";
import { colors } from "../theme/colors";
import TouchableOpacityView from "./TouchableOpacityView";
import { AppText } from "./AppText";
import {
  checkValue,
  getCameraPermission,
  getGalleryPermissions,
} from "../helper/utility";
import { showError } from "../helper/logger";
import { errorText } from "../helper/Constants";
import { useAppSelector } from "../store/hooks";
import { useTheme } from "../hooks/useTheme";
import {
  BlurSheetBackground,
  blurSheetTheme,
} from "../screens/wallet/sheets/BlurSheetChrome";

const PictureModal = ({
  isVisible,
  onBackButtonPress,
  onPressCamera,
  onPressGallery,
  isFront = false,
}) => {
  const { isDark } = useTheme();
  const sheetTheme = blurSheetTheme(isDark);

  const languages = useAppSelector((state) => state.account.languages);

  return (
    <Modal
      isVisible={isVisible}
      backdropOpacity={isDark ? 0.55 : 0.35}
      style={styles.modal}
      onBackdropPress={onBackButtonPress}
      onBackButtonPress={onBackButtonPress}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      useNativeDriver
      hideModalContentWhileAnimating
    >
      <View
        style={[
          styles.container,
          {
            borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
          },
        ]}
        collapsable={false}
      >
        <BlurSheetBackground isDark={isDark} />

        <View style={styles.content}>
          <View style={[styles.dragHandle, { backgroundColor: sheetTheme.dragHandleColor }]} />

          <TouchableOpacityView
            onPress={() => {
              onBackButtonPress();
              setTimeout(() => {
                getCameraPermission().then((res) => {
                  if (res) {
                    onPressCamera();
                  } else {
                    showError(errorText.cameraPermission);
                  }
                });
              }, 500);
            }}
            style={[
              styles.singleContainer,
              {
                borderColor: sheetTheme.borderColor,
                backgroundColor: sheetTheme.cardBg,
              },
            ]}
          >
            <AppText style={{ color: sheetTheme.textColor }}>
              {checkValue(languages?.camera) || "Take a Photo"}
            </AppText>
          </TouchableOpacityView>

          {!isFront && (
            <TouchableOpacityView
              onPress={() => {
                onBackButtonPress();
                setTimeout(() => {
                  getGalleryPermissions().then((res) => {
                    if (res) {
                      onPressGallery();
                    } else {
                      showError(errorText.galleryPermission);
                    }
                  });
                }, 500);
              }}
              style={[
                styles.singleContainer,
                {
                  borderColor: sheetTheme.borderColor,
                  backgroundColor: sheetTheme.cardBg,
                },
              ]}
            >
              <AppText style={{ color: sheetTheme.textColor }}>
                {checkValue(languages?.gallery) || "Choose from Gallery"}
              </AppText>
            </TouchableOpacityView>
          )}

          <TouchableOpacityView onPress={onBackButtonPress} style={styles.cancelBtn}>
            <AppText style={{ color: colors.red }}>Cancel</AppText>
          </TouchableOpacityView>
        </View>
      </View>
    </Modal>
  );
};

export { PictureModal };

const styles = StyleSheet.create({
  modal: {
    justifyContent: "flex-end",
    margin: 0,
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: "100%",
    overflow: "hidden",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    backgroundColor: "transparent",
  },
  content: {
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  singleContainer: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  cancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
});
