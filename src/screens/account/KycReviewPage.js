import React from "react";
import {
  AppSafeAreaView,
  AppText,
  FOURTEEN,
  SEMI_BOLD,
  SIXTEEN,
  THIRTEEN,
  TWELVE,
} from "../../shared";
import KeyBoardAware from "../../shared/components/KeyboardAware";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { colors } from "../../theme/colors";
import { useAppSelector } from "../../store/hooks";
import FastImage from "react-native-fast-image";
import {
  appBg,
  back_ic,
  closeIcon,
  DEMO_USER,
  doneIcon,
} from "../../helper/ImageAssets";
import NavigationService from "../../navigation/NavigationService";
import { KYC_STEP_FIVE_SCREEN } from "../../navigation/routes";
import { authStyles } from "../auth/authStyles";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const KycReviewPage = () => {
  const theme = useAppSelector((state) => state.auth.theme);
  const kycData = useAppSelector((state) => state.account.kycData);
  const userData = useAppSelector((state) => state.auth.userData);

  // Get user information
  const fullName = kycData?.first_name
    ? `${kycData.first_name}${kycData.middle_name ? ` ${kycData.middle_name}` : ""}${kycData.last_name ? ` ${kycData.last_name}` : ""}`.trim()
    : userData?.firstName && userData?.lastName
    ? `${userData.firstName} ${userData.lastName}`
    : "N/A";

  const email = kycData?.emailId || userData?.emailId || "N/A";
  const mobileNumber = kycData?.mobileNumber || userData?.mobileNumber || "N/A";
  const documentNumber = kycData?.document_number || "N/A";
  const taxId = kycData?.pancard_number || "N/A";

  const onBack = () => {
    NavigationService.goBack();
  };

  const onSubmitKYC = () => {
    // NavigationService.navigate(KYC_STEP_FIVE_SCREEN);
  };

  return (
    <AppSafeAreaView
      source={theme !== "Dark" && appBg}
      style={{
        backgroundColor: theme === "Dark" ? "#0A0A0A" : "#FFFFFF",
      }}
    >
      <KeyBoardAware>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
         
             <View style={styles.headerContainer}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                width: "60%",
              }}
            >
              <TouchableOpacity onPress={onBack}>
                <FastImage
                  source={back_ic}
                  resizeMode="contain"
                  style={{ width: 20, height: 20 }}
                  tintColor={theme !== "Dark" ? colors.black : colors.white}
                />
              </TouchableOpacity>
              <AppText weight={SEMI_BOLD} type={SIXTEEN}>
                KYC Verification
              </AppText>
            </View>
         
            </View>

          {/* User Profile and Personal Details Card */}

          <AppText
              weight={SEMI_BOLD}
              type={THIRTEEN}
              style={[
                styles.headerTitle,
                { color: theme === "Dark" ? colors.white : colors.black },
              ]}
            >
               {' '}Review Your Information
            </AppText>
          <View
            style={[
              theme !== "Dark" ? authStyles.card : styles.cardDark,
              { margin: 20, marginTop: 10 },
            ]}
          >
            <View style={styles.profileSection}>
              {/* Left Side - Avatar */}
              <View style={styles.avatarContainer}>
                <FastImage
                  source={
                    kycData?.selfie_image
                      ? { uri: kycData.selfie_image.uri }
                      : userData?.profilepicture
                      ? { uri: `${userData.profilepicture}` }
                      : DEMO_USER
                  }
                  resizeMode="cover"
                  style={styles.avatarImage}
                />
                <AppText
                  weight={SEMI_BOLD}
                  type={SIXTEEN}
                  style={[
                    styles.userName,
                    { color: theme === "Dark" ? colors.white : colors.black },
                  ]}
                >
                  {fullName.toLowerCase()}
                </AppText>
              </View>

              {/* Right Side - Personal Data */}
              <View style={styles.dataSection}>
                <View style={styles.dataRow}>
                  <AppText
                    type={TWELVE}
                    style={[
                      styles.dataLabel,
                      {
                        color:
                          theme === "Dark" ? "#888888" : "#666666",
                      },
                    ]}
                  >
                    Full Name
                  </AppText>
                  <AppText
                    type={TWELVE}
                    weight={SEMI_BOLD}
                    style={[
                      styles.dataValue,
                      { color: theme === "Dark" ? colors.white : colors.black },
                    ]}
                  >
                    {fullName}
                  </AppText>
                </View>

                <View style={styles.dataRow}>
                  <AppText
                    type={TWELVE}
                    style={[
                      styles.dataLabel,
                      {
                        color:
                          theme === "Dark" ? "#888888" : "#666666",
                      },
                    ]}
                  >
                    Email
                  </AppText>
                  <AppText
                    type={TWELVE}
                    weight={SEMI_BOLD}
                    style={[
                      styles.dataValue,
                      { color: theme === "Dark" ? colors.white : colors.black },
                    ]}
                  >
                    {email}
                  </AppText>
                </View>

                <View style={styles.dataRow}>
                  <AppText
                    type={TWELVE}
                    style={[
                      styles.dataLabel,
                      {
                        color:
                          theme === "Dark" ? "#888888" : "#666666",
                      },
                    ]}
                  >
                    Mobile Number
                  </AppText>
                  <AppText
                    type={TWELVE}
                    weight={SEMI_BOLD}
                    style={[
                      styles.dataValue,
                      { color: theme === "Dark" ? colors.white : colors.black },
                    ]}
                  >
                    {mobileNumber}
                  </AppText>
                </View>

                <View style={styles.dataRow}>
                  <AppText
                    type={TWELVE}
                    style={[
                      styles.dataLabel,
                      {
                        color:
                          theme === "Dark" ? "#888888" : "#666666",
                      },
                    ]}
                  >
                    Document No.
                  </AppText>
                  <AppText
                    type={TWELVE}
                    weight={SEMI_BOLD}
                    style={[
                      styles.dataValue,
                      { color: theme === "Dark" ? colors.white : colors.black },
                    ]}
                  >
                    {documentNumber}
                  </AppText>
                </View>

                <View style={styles.dataRow}>
                  <AppText
                    type={TWELVE}
                    style={[
                      styles.dataLabel,
                      {
                        color:
                          theme === "Dark" ? "#888888" : "#666666",
                      },
                    ]}
                  >
                    Tax ID
                  </AppText>
                  <AppText
                    type={TWELVE}
                    weight={SEMI_BOLD}
                    style={[
                      styles.dataValue,
                      { color: theme === "Dark" ? colors.white : colors.black },
                    ]}
                  >
                    {taxId}
                  </AppText>
                </View>
              </View>
            </View>
          </View>

          {/* ID Card Number Section */}
          <View
            style={[
              theme !== "Dark" ? authStyles.card : styles.cardDark,
              { marginHorizontal: 20, marginBottom: 20 },
            ]}
          >
            <View style={styles.idCardRow}>
              <AppText
                type={FOURTEEN}
                style={[
                  styles.idCardLabel,
                  {
                    color: theme === "Dark" ? "#888888" : "#666666",
                  },
                ]}
              >
                ID Card Number:
              </AppText>
              <AppText
                type={FOURTEEN}
                weight={SEMI_BOLD}
                style={[
                  styles.idCardValue,
                  { color: theme === "Dark" ? colors.white : colors.black },
                ]}
              >
                {documentNumber}
              </AppText>
            </View>
          </View>

          {/* Document Images Section */}
          <View style={styles.documentsContainer}>
            {/* Document Front */}
            <View
              style={[
                theme !== "Dark" ? authStyles.card : styles.cardDark,
                styles.documentCard,
              ]}
            >
              <AppText
                type={FOURTEEN}
                weight={SEMI_BOLD}
                style={[
                  styles.documentTitle,
                  { color: theme === "Dark" ? colors.white : colors.black },
                ]}
              >
                Document (Front)
              </AppText>
              <View style={styles.documentImageContainer}>
                {kycData?.document_front_image ? (
                  <FastImage
                    source={{ uri: kycData.document_front_image.uri }}
                    resizeMode="cover"
                    style={styles.documentImage}
                  />
                ) : (
                  <View style={styles.placeholderContainer}>
                    <FastImage
                      source={doneIcon}
                      resizeMode="contain"
                      style={styles.placeholderIcon}
                      tintColor="#4CAF50"
                    />
                  </View>
                )}
              </View>
            </View>

            {/* Document Back */}
            <View
              style={[
                theme !== "Dark" ? authStyles.card : styles.cardDark,
                styles.documentCard,
              ]}
            >
              <AppText
                type={FOURTEEN}
                weight={SEMI_BOLD}
                style={[
                  styles.documentTitle,
                  { color: theme === "Dark" ? colors.white : colors.black },
                ]}
              >
                Document (Back)
              </AppText>
              <View style={styles.documentImageContainer}>
                {kycData?.document_back_image ? (
                  <FastImage
                    source={{ uri: kycData.document_back_image.uri }}
                    resizeMode="cover"
                    style={styles.documentImage}
                  />
                ) : (
                  <View style={styles.placeholderContainer}>
                    <FastImage
                      source={doneIcon}
                      resizeMode="contain"
                      style={styles.placeholderIcon}
                      tintColor="#4CAF50"
                    />
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Income Tax Document and Selfie with ID */}
          <View style={styles.documentsContainer}>
            {/* Income Tax Document */}
            <View
              style={[
                theme !== "Dark" ? authStyles.card : styles.cardDark,
                styles.documentCard,
              ]}
            >
              <AppText
                type={FOURTEEN}
                weight={SEMI_BOLD}
                style={[
                  styles.documentTitle,
                  { color: theme === "Dark" ? colors.white : colors.black },
                ]}
              >
                Income Tax Document
              </AppText>
              <View style={styles.documentImageContainer}>
                {kycData?.pancard_image ? (
                  <FastImage
                    source={{ uri: kycData.pancard_image.uri }}
                    resizeMode="cover"
                    style={styles.documentImage}
                  />
                ) : (
                  <View style={styles.placeholderContainer}>
                    <FastImage
                      source={doneIcon}
                      resizeMode="contain"
                      style={styles.placeholderIcon}
                      tintColor="#4CAF50"
                    />
                  </View>
                )}
              </View>
            </View>

            {/* Selfie with ID */}
            <View
              style={[
                theme !== "Dark" ? authStyles.card : styles.cardDark,
                styles.documentCard,
              ]}
            >
              <AppText
                type={FOURTEEN}
                weight={SEMI_BOLD}
                style={[
                  styles.documentTitle,
                  { color: theme === "Dark" ? colors.white : colors.black },
                ]}
              >
                Selfie with ID
              </AppText>
              <View style={styles.documentImageContainer}>
                {kycData?.selfie_image ? (
                  <FastImage
                    source={{ uri: kycData.selfie_image.uri }}
                    resizeMode="cover"
                    style={styles.documentImage}
                  />
                ) : (
                  <View style={styles.placeholderContainer}>
                    <FastImage
                      source={doneIcon}
                      resizeMode="contain"
                      style={styles.placeholderIcon}
                      tintColor="#4CAF50"
                    />
                  </View>
                )}
              </View>
            </View>
          </View>

     
      
        </ScrollView>
        
      </KeyBoardAware>
      <View style={styles.buttonContainer}>
           

           <TouchableOpacity
             onPress={onSubmitKYC}
             style={styles.submitButton}
           >
             <AppText
               type={FOURTEEN}
               weight={SEMI_BOLD}
               style={styles.submitButtonText}
             >
               Submit KYC
             </AppText>
           </TouchableOpacity>
         </View>
    </AppSafeAreaView>
  );
};

export default KycReviewPage;

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 30,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginHorizontal:20,
    marginTop:20,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: {
    width: 20,
    height: 20,
  },
  cardDark: {
    padding: 16,
    borderRadius: 15,
    backgroundColor: "#18191D",
    borderWidth: 1,
    borderColor: "#3A3A3E",
  },
  profileSection: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    
  },
  avatarContainer: {
    alignItems: "center",
    justifyContent: "flex-start",
    minWidth: 120,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#4CAF50",
    marginBottom: 12,
  },
  userName: {
    fontSize: 16,
    textAlign: "center",
    fontWeight: "700",
  },
  dataSection: {
    flex: 1,
    gap: 14,
    paddingTop: 4,
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dataLabel: {
    fontSize: 12,
  },
  dataValue: {
    fontSize: 12,
    textAlign: "right",
    flex: 1,
    marginLeft: 10,
  },
  idCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  idCardLabel: {
    fontSize: 14,
  },
  idCardValue: {
    fontSize: 14,
  },
  documentsContainer: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  documentCard: {
    flex: 1,
    padding: 12,
    minHeight: 180,
  },
  documentTitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  documentImageContainer: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  documentImage: {
    width: "100%",
    height: "100%",
  },
  placeholderContainer: {
    width: "100%",
    height: "100%",
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  placeholderIcon: {
    width: 50,
    height: 50,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
 
  submitButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.buttonBg || "#FFC107",
  },
  submitButtonText: {
    color: colors.black || "#000000",
    fontSize: 14,
  },
});
