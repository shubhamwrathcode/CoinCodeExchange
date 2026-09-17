import React, { useEffect, useState, useRef } from 'react';
import { BackHandler, Linking, Modal, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import NavigationService from '../../navigation/NavigationService';
import { NAVIGATION_AUTH_STACK } from '../../navigation/routes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL, SELECTED_LANGUAGE, USER_TOKEN_KEY } from '../../helper/Constants';
import { commonStyles } from '../../theme/commonStyles';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { AppSafeAreaView } from '../../shared';
import { getUserProfile } from '../../actions/accountActions';
import { translate } from 'google-translate-api-x';
import { languages } from '../../helper/languages';
import { setLanguages, setSelectedLanguage } from '../../slices/accountSlice';
import { getVersion } from 'react-native-device-info';
import { getAppVersion } from '../../actions/authActions';
import { splashTwo, updatedSplashDark } from '../../helper/ImageAssets';

const AuthLoading = () => {
  const dispatch = useAppDispatch();
  const theme = useAppSelector(state => state.auth.theme);
  const [CheckCurrent] = useState(getVersion());
  const appVersion = useAppSelector((state) => state.auth.appVersion);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [versionCheckDone, setVersionCheckDone] = useState(false);
  const proceededRef = useRef(false);

  // --- CORRECTED LOGIC ---

  // 1) Fetch server version (silent — no full-screen loader on splash).
  useEffect(() => {
    dispatch(getAppVersion({ silent: true })).finally(() => {
      setVersionCheckDone(true);
    });
  }, [dispatch]);

  // 2) After fetch settles: force-update if server `version` !== installed build; else continue boot.
  useEffect(() => {
    if (!versionCheckDone || proceededRef.current) return;

    const serverVersion =
      appVersion && typeof appVersion === 'object' && appVersion.version != null
        ? String(appVersion.version).trim()
        : null;
    const current = String(CheckCurrent || '').trim();


    if (serverVersion && current !== serverVersion) {
      setShowUpdateModal(true);
      return;
    }

    proceededRef.current = true;
    checkUserLogin();
    checkLanguage();
  }, [versionCheckDone, appVersion, CheckCurrent]);


  const success = () => {
    setTimeout(() => {
      dispatch(getUserProfile(false, true, false, true));
    }, 3000);
  };

  const onnFail = () => {
    setTimeout(() => {
      NavigationService.reset(NAVIGATION_AUTH_STACK);
    }, 2000);
  };

  const checkUserLogin = async () => {
    try {
      const customerToken = await AsyncStorage.getItem(USER_TOKEN_KEY);
      customerToken ? success() : onnFail();
    } catch (e) {
      console.log(e);
    }
  };

  const checkLanguage = async () => {
    try {
      const language = await AsyncStorage.getItem(SELECTED_LANGUAGE);
      if (language) {
        const res = await translate(languages, {
          from: "en",
          to: language,
        });
        dispatch(setLanguages(res));
        dispatch(setSelectedLanguage(language));
      }
    } catch (e) {
      console.log(e);
    }
  };

  const downloadApk = () => {
    if (appVersion?.apk) {
      const apkDownloadUrl = BASE_URL + appVersion.apk;
      Linking.openURL(apkDownloadUrl).catch((error) => {
        console.error("Error opening download link:", error);
      });
    }
  };

  const exitApp = () => {
    BackHandler.exitApp();
  };

  return (
    <AppSafeAreaView
      source={theme === 'Dark' ? updatedSplashDark : splashTwo}
      darkStatusBarOnLightSplash={theme !== 'Dark'}
    >
      <View style={commonStyles.center}>
        {/* Your logo or loader can go here */}
      </View>

      <Modal transparent={true} visible={showUpdateModal} animationType="fade" statusBarTranslucent>
        <View style={styles.fullScreen}>
          <View style={styles.modalBox}>
            <Text style={styles.title}>Update Required 🚀</Text>
            <Text style={styles.message}>
              A new version of the app is available.{"\n\n"}
              This update includes important security fixes, stability
              improvements, and exciting new features.{"\n\n"}
              You must update to continue using the app.
            </Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.updateBtn} onPress={downloadApk}>
                <Text style={styles.updateText}>Update Now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exitBtn} onPress={exitApp}>
                <Text style={styles.exitText}>Exit App</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AppSafeAreaView>
  );
};

export default AuthLoading;

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBox: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    color: "#000",
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    color: "#333",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  updateBtn: {
    flex: 1,
    backgroundColor: "#2e86de",
    padding: 14,
    borderRadius: 8,
    marginRight: 10,
  },
  updateText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  exitBtn: {
    flex: 1,
    backgroundColor: "#e74c3c",
    padding: 14,
    borderRadius: 8,
  },
  exitText: { color: "#fff", textAlign: "center", fontWeight: "600" },
});
