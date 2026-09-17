import React, { useState, useEffect } from "react";
import { Platform, BackHandler } from "react-native";
import {
  AppSafeAreaView,
  AppText,
  Button,
  EIGHTEEN,
  FOURTEEN,
  Input,
  RED,
  SEMI_BOLD,
  THIRTEEN,
  TWELVE,
} from "../../shared";
import KeyBoardAware from "../../shared/components/KeyboardAware";
import { StyleSheet, View, ScrollView, TouchableOpacity } from "react-native";
import FastImage from "react-native-fast-image";
import { colors } from "../../theme/colors";
import { useKycForm, getDocTypeName } from "../../context/KycFormContext";
import NavigationService from "../../navigation/NavigationService";
import { KYC_STATUS_SCREEN } from "../../navigation/routes";
import KycStepHeader from "./KycStepHeader";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { getKycStatus, kycVerification } from "../../actions/accountActions";
import { showError } from "../../helper/logger";
import ImageCropPicker from "react-native-image-crop-picker";
import { PictureModal } from "../../shared/components/PictureModal";
import { appBg, checkIc, DEMO_USER, CAMERA_IMG, kyc_reject_vector, SHARE_NEW_ICON, uploadIcon, PHOTO_ID_VECTOR } from "../../helper/ImageAssets";
import { OtpInput6Digit } from "../../shared";
import TouchableOpacityView from "../../shared/components/TouchableOpacityView";
import { SpinnerSecond } from "../../shared/components/SpinnerSecond";

const accentColor = colors.buttonBg || "#F3BB2B";

const toFormDataFile = (photo, defaultName, defaultType = "image/jpeg") => {
  if (!photo || !photo.uri) return null;
  let uri = typeof photo.uri === "string" ? photo.uri : String(photo.uri);
  if (Platform.OS === "ios" && !uri.startsWith("file://") && !uri.startsWith("content://")) {
    uri = "file://" + uri;
  }
  const fromUri = uri.split("/").pop()?.split("?")[0]?.trim();
  const name = (photo.name && String(photo.name).trim()) || (fromUri && fromUri.length > 0 ? fromUri : defaultName);
  const type = (photo.type && String(photo.type).split(";")[0].trim()) || defaultType;
  return { uri, name, type };
};

const normalizeDocNumber = (v) => (!v || typeof v !== "string" ? "" : v.trim().toUpperCase().replace(/\s/g, ""));

const KycResubmitScreen = ({ route }) => {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.auth.theme);
  const userData = useAppSelector((s) => s.auth.userData);
  const {
    handleGetOtp,
    emailOtp,
    setemailOtp,
    selectedAuthMethod,
    availableVerifyMethods,
    modalOtpTimer,
    pickerCountries,
  } = useKycForm();

  const params = route?.params || {};
  const [loading, setLoading] = useState(!params.documentsToResubmit?.length);
  const [documentsToResubmit, setDocumentsToResubmit] = useState(params.documentsToResubmit || []);
  const [existingCountryCode, setExistingCountryCode] = useState(params.existingCountryCode || "");
  const [submittedIdDocType, setSubmittedIdDocType] = useState(params.submittedIdDocType || null);
  const [submittedTaxDocType, setSubmittedTaxDocType] = useState(params.submittedTaxDocType || null);
  const [resubmitIdNumber, setResubmitIdNumber] = useState(params.resubmitIdNumber ?? "");
  const [resubmitTaxNumber, setResubmitTaxNumber] = useState(params.resubmitTaxNumber ?? "");

  const [resubmitStep, setResubmitStep] = useState(0);
  const [docFront, setDocFront] = useState(null);
  const [docBack, setDocBack] = useState(null);
  const [panCardImage, setPanCardImage] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [pictureModalVisible, setPictureModalVisible] = useState(false);
  const [pictureType, setPictureType] = useState("doc_front");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const needsIdDocResubmit = () => documentsToResubmit.some((d) => d.type === "id_document");
  const needsTaxDocResubmit = () => documentsToResubmit.some((d) => d.type === "tax_document");
  const needsSelfieResubmit = () => documentsToResubmit.some((d) => d.type === "selfie");
  const getRejectReason = (docType) => {
    const doc = documentsToResubmit.find((d) => d.type === docType);
    return doc?.reason || "";
  };

  useEffect(() => {
    if (params.documentsToResubmit?.length) return;
    let mounted = true;
    (async () => {
      const data = await dispatch(getKycStatus());
      if (!mounted) return;
      setLoading(false);
      if (!data) return;
      setDocumentsToResubmit(data.documents_needing_resubmission || []);
      setExistingCountryCode(data.kyc_data?.country_code ?? "");
      setSubmittedIdDocType(data.kyc_data?.id_document_type ?? null);
      setSubmittedTaxDocType(data.kyc_data?.tax_document_type ?? null);
      setResubmitIdNumber(data.kyc_data?.id_document_number ?? "");
      setResubmitTaxNumber(data.kyc_data?.tax_document_number ?? "");
    })();
    return () => { mounted = false; };
  }, [dispatch, params.documentsToResubmit?.length]);

  // Auto-advance when on a step that doesn't need this doc (same as web resubmit modal)
  useEffect(() => {
    if (resubmitStep === 1 && !needsIdDocResubmit()) {
      if (needsTaxDocResubmit()) setResubmitStep(2);
      else if (needsSelfieResubmit()) setResubmitStep(3);
      else setResubmitStep(4);
    } else if (resubmitStep === 2 && !needsTaxDocResubmit()) {
      if (needsSelfieResubmit()) setResubmitStep(3);
      else setResubmitStep(4);
    } else if (resubmitStep === 3 && !needsSelfieResubmit()) {
      setResubmitStep(4);
    }
  }, [resubmitStep, documentsToResubmit]);

  const cardBg = colors.themeElevationColor;
  const textClr = theme === "Dark" ? colors.white : colors.black;
  const borderClr = theme === "Dark" ? "#3A3A3E" : "#E0E0E0";
  const mutedClr = theme === "Dark" ? "#888" : "#666";
  const innerCardBg = colors.overlayColor || (theme === "Dark" ? "#2a2a2e" : "#eee");
  const countryLabel = pickerCountries?.find((c) => c.value === existingCountryCode)?.label || existingCountryCode;
  const isDark = theme === "Dark";

  const getVerificationTitle = () => {
    if (selectedAuthMethod === 1) return "Email OTP Verification";
    if (selectedAuthMethod === 2) return "Google Authenticator Verification";
    return "Mobile OTP Verification";
  };
  const getVerificationDescription = () => {
    if (selectedAuthMethod === 1) return `Enter the 6-digit code sent to ${userData?.emailId || "your email"}.`;
    if (selectedAuthMethod === 2) return "Enter the 6-digit code from your Google Authenticator app.";
    return `Enter the 6-digit code sent to ${userData?.mobileNumber || "your phone"}.`;
  };
  const getVerificationInputLabel = () => {
    if (selectedAuthMethod === 1) return "Email Verification Code";
    if (selectedAuthMethod === 2) return "Authenticator Code";
    return "Phone Verification Code";
  };

  const handleImagePick = (type) => {
    setPictureType(type);
    setPictureModalVisible(true);
  };

  const applyPickedImage = (image) => {
    if (!image || image.size > 5000000 || !["image/png", "image/jpeg", "image/jpg"].includes(image?.mime)) {
      showError("Only JPEG, PNG & JPG upto 5MB");
      setPictureModalVisible(false);
      return;
    }
    const mime = image.mime?.split("/");
    const name = `${pictureType}_${image.modificationDate}.${mime?.[1] || "jpg"}`;
    const photo = { uri: image.path, name, type: image.mime };
    if (pictureType === "doc_front") setDocFront(photo);
    else if (pictureType === "doc_back") setDocBack(photo);
    else if (pictureType === "pan") setPanCardImage(photo);
    else setSelfieImage(photo);
    setPictureModalVisible(false);
  };

  const onPressCamera = () => {
    ImageCropPicker.openCamera({ multiple: false, mediaType: "photo", cropping: true, compressImageQuality: 0.8 })
      .then(applyPickedImage)
      .catch(() => setPictureModalVisible(false));
  };

  const onPressGallery = () => {
    ImageCropPicker.openPicker({ multiple: false, mediaType: "photo", cropping: true, compressImageQuality: 0.8 })
      .then(applyPickedImage)
      .catch(() => setPictureModalVisible(false));
  };

  // Same as KycStepFour: open camera directly for selfie so image is set reliably
  const handleStartSelfieCamera = () => {
    ImageCropPicker.openCamera({ multiple: false, mediaType: "photo", cropping: true, compressImageQuality: 0.8 })
      .then((image) => {
        if (image?.size < 5000000 && ["image/png", "image/jpeg", "image/jpg"].includes(image?.mime)) {
          const mime = image?.mime?.split("/");
          const photo = { uri: image.path, name: `selfie_${image.modificationDate}.${mime?.[1] || "jpg"}`, type: image.mime };
          setSelfieImage(photo);
        } else {
          showError("Only JPEG, PNG & JPG formats and file size upto 5MB are supported");
        }
      })
      .catch(() => {});
  };

  const goNext = () => {
    if (resubmitStep === 0) {
      if (needsIdDocResubmit()) setResubmitStep(1);
      else if (needsTaxDocResubmit()) setResubmitStep(2);
      else if (needsSelfieResubmit()) setResubmitStep(3);
      else setResubmitStep(4);
    } else if (resubmitStep === 1) {
      if (!docFront) { showError("Please upload front image of your ID"); return; }
      if (needsTaxDocResubmit()) setResubmitStep(2);
      else if (needsSelfieResubmit()) setResubmitStep(3);
      else setResubmitStep(4);
    } else if (resubmitStep === 2) {
      if (!panCardImage) { showError("Please upload Tax document"); return; }
      if (needsSelfieResubmit()) setResubmitStep(3);
      else setResubmitStep(4);
    } else if (resubmitStep === 3) {
      if (!selfieImage) { showError("Please capture selfie"); return; }
      setResubmitStep(4);
    }
  };

  const goBack = () => {
    if (resubmitStep === 1) setResubmitStep(0);
    else if (resubmitStep === 2) setResubmitStep(needsIdDocResubmit() ? 1 : 0);
    else if (resubmitStep === 3) setResubmitStep(needsTaxDocResubmit() ? 2 : needsIdDocResubmit() ? 1 : 0);
    else if (resubmitStep === 4) {
      setemailOtp("");
      setResubmitStep(needsSelfieResubmit() ? 3 : needsTaxDocResubmit() ? 2 : needsIdDocResubmit() ? 1 : 0);
    }
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (resubmitStep > 0) {
        goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [resubmitStep]);

  const buildResubmitFormData = () => {
    const formData = new FormData();
    formData.append("is_resubmission", "true");
    formData.append("verification_code", emailOtp);
    formData.append("verification_method", selectedAuthMethod === 1 ? "email_otp" : selectedAuthMethod === 2 ? "2fa" : selectedAuthMethod === 3 ? "sms_otp" : "passkey");
    if (existingCountryCode) formData.append("country_code", existingCountryCode);

    if (needsIdDocResubmit()) {
      formData.append("resubmitting_id_document", "true");
      if (resubmitIdNumber) {
        formData.append("id_document_number", resubmitIdNumber.trim());
        formData.append("id_document_type", submittedIdDocType);
      }
      const idFront = toFormDataFile(docFront, "id_front.jpg");
      if (idFront) formData.append("id_front_image", idFront);
      const idBack = toFormDataFile(docBack, "id_back.jpg");
      if (idBack) formData.append("id_back_image", idBack);
    }
    if (needsTaxDocResubmit()) {
      formData.append("resubmitting_tax_document", "true");
      if (resubmitTaxNumber) {
        formData.append("tax_document_number", normalizeDocNumber(resubmitTaxNumber));
        formData.append("tax_document_type", submittedTaxDocType);
      }
      const taxFile = toFormDataFile(panCardImage, "tax_doc.jpg");
      if (taxFile) formData.append("tax_document_image", taxFile);
    }
    if (needsSelfieResubmit()) {
      formData.append("resubmitting_selfie", "true");
      const selfieFile = toFormDataFile(selfieImage, "selfie.jpg");
      if (selfieFile) formData.append("selfie_image", selfieFile);
      formData.append("selfie_capture_method", "camera");
      formData.append("selfie_device_info", "React Native");
    }
    return formData;
  };

  const handleSubmit = async () => {
    if (selectedAuthMethod !== 2 && (!emailOtp || emailOtp.length < 6)) {
      showError("Please enter 6-digit verification code");
      return;
    }
    if (selectedAuthMethod === 2 && !emailOtp) {
      showError("Please enter Google Authenticator code");
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = buildResubmitFormData();
      const result = await dispatch(kycVerification(formData));
      if (result?.success) NavigationService.navigate(KYC_STATUS_SCREEN);
    } catch (e) {
      // kycVerification already shows error
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppSafeAreaView style={{ flex: 1, backgroundColor: colors.newThemeColor, justifyContent: "center", alignItems: "center" }}>
        <AppText type={FOURTEEN} style={{ color: textClr }}>Loading...</AppText>
      </AppSafeAreaView>
    );
  }

  const stepTitle =
    resubmitStep === 0 ? "Resubmit Documents" :
    resubmitStep === 1 && needsIdDocResubmit() ? `Upload ${getDocTypeName(submittedIdDocType)}` :
    resubmitStep === 2 && needsTaxDocResubmit() ? `Upload ${getDocTypeName(submittedTaxDocType)}` :
    resubmitStep === 3 && needsSelfieResubmit() ? "Capture Selfie" :
    resubmitStep === 4 ? "Security Verification" : "Resubmit Documents";

  return (
    <AppSafeAreaView source={theme !== "Dark" && appBg} style={[styles.container, { backgroundColor: colors.newThemeColor }]}>
      <KeyBoardAware style={{ flex: 1 }}>
        <KycStepHeader
          title={stepTitle}
          theme={theme}
          onBackPress={() => (resubmitStep > 0 ? goBack() : NavigationService.goBack())}
        />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Step 0: List of rejected docs */}
          {resubmitStep === 0 && (
            <View style={styles.stepBlock}>
              <AppText type={FOURTEEN} style={{ color: textClr,  }}>
                The following documents were rejected and need to be uploaded again:
              </AppText>
               <View style={styles.rejectIllustrationWrap}>
                <FastImage source={kyc_reject_vector} resizeMode="contain" style={styles.rejectIllustration} />
              </View>
              <View style={[styles.alertDanger, { backgroundColor: theme === "Dark" ? "rgba(220,53,69,0.2)" : "#f8d7da" }]}>
                {needsIdDocResubmit() && (
                  <AppText type={THIRTEEN} style={styles.rejectItem}>⚠️ {getDocTypeName(submittedIdDocType)}: {getRejectReason("id_document")}</AppText>
                )}
                {needsTaxDocResubmit() && (
                  <AppText type={THIRTEEN} style={styles.rejectItem}>⚠️ {getDocTypeName(submittedTaxDocType)}: {getRejectReason("tax_document")}</AppText>
                )}
                {needsSelfieResubmit() && (
                  <AppText type={THIRTEEN} style={styles.rejectItem}>⚠️ Selfie: {getRejectReason("selfie")}</AppText>
                )}
              </View>
             
            </View>
          )}

          {/* Step 1: ID doc resubmit — design like KycStepThree / Upload Passport */}
          {resubmitStep === 1 && needsIdDocResubmit() && (
            <View style={styles.stepBlock}>
              <View style={[styles.resubmitRejectBanner, { backgroundColor: theme === "Dark" ? "rgba(220,53,69,0.2)" : "#f8d7da" }]}>
                <AppText type={FOURTEEN} style={{ color: colors.red }}>Rejection: {getRejectReason("id_document")}</AppText>
              </View>
              <AppText type={TWELVE} style={{ color: mutedClr, marginBottom: 16 }}>Country: {countryLabel} · {getDocTypeName(submittedIdDocType)}</AppText>
              <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
                <AppText type={TWELVE} weight={SEMI_BOLD} style={[styles.sectionTitle, { color: mutedClr }]}>Document details</AppText>
                <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.fieldLabel, { color: textClr }]}>{getDocTypeName(submittedIdDocType)} Number <AppText color={RED}>*</AppText></AppText>
                <Input
                  placeholder={(getDocTypeName(submittedIdDocType) || "ID") + " Number"}
                  value={resubmitIdNumber}
                  onChangeText={setResubmitIdNumber}
                  containerStyle={[styles.idDocInput, { backgroundColor: innerCardBg, borderColor: borderClr }]}
                  inputStyle={{ color: textClr }}
                  placeholderTextColor={theme === "Dark" ? "#888" : "#999"}
                />
                <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.fieldLabel, { color: textClr, marginTop: 16 }]}>Upload photos</AppText>
                <View style={styles.uploadRow}>
                  <TouchableOpacityView onPress={() => handleImagePick("doc_front")} style={[styles.idUploadBox, docFront ? styles.uploadBoxFilled : styles.uploadBoxEmpty, { backgroundColor: docFront ? innerCardBg : "transparent", borderColor: docFront ? accentColor : borderClr }]}>
                    {docFront ? (
                      <>
                        <FastImage source={{ uri: docFront.uri }} style={styles.uploadedImg} resizeMode="cover" />
                        <View style={[styles.uploadBadge, styles.idUploadBadge, { backgroundColor: accentColor }]}>
                          <FastImage source={checkIc} resizeMode="contain" style={styles.uploadBadgeIcon} tintColor={colors.white} />
                        </View>
                      </>
                    ) : (
                      <>
                        <FastImage source={PHOTO_ID_VECTOR} resizeMode="cover" style={styles.uploadPlaceholderBg} />
                        <View style={styles.uploadContent}>
                          <FastImage source={uploadIcon} tintColor={accentColor} resizeMode="contain" style={styles.uploadIcon} />
                          <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textClr }}>Front</AppText>
                          <AppText type={TWELVE} style={{ color: mutedClr, marginTop: 2 }}>Tap to upload</AppText>
                        </View>
                      </>
                    )}
                  </TouchableOpacityView>
                  <TouchableOpacityView onPress={() => handleImagePick("doc_back")} style={[styles.idUploadBox, docBack ? styles.uploadBoxFilled : styles.uploadBoxEmpty, { backgroundColor: docBack ? innerCardBg : "transparent", borderColor: docBack ? accentColor : borderClr }]}>
                    {docBack ? (
                      <>
                        <FastImage source={{ uri: docBack.uri }} style={styles.uploadedImg} resizeMode="cover" />
                        <View style={[styles.uploadBadge, styles.idUploadBadge, { backgroundColor: accentColor }]}>
                          <FastImage source={checkIc} resizeMode="contain" style={styles.uploadBadgeIcon} tintColor={colors.white} />
                        </View>
                      </>
                    ) : (
                      <>
                        <FastImage source={PHOTO_ID_VECTOR} resizeMode="cover" style={styles.uploadPlaceholderBg} />
                        <View style={styles.uploadContent}>
                          <FastImage source={uploadIcon} tintColor={accentColor} resizeMode="contain" style={styles.uploadIcon} />
                          <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textClr }}>Back</AppText>
                          <AppText type={TWELVE} style={{ color: mutedClr, marginTop: 2 }}>Tap to upload</AppText>
                        </View>
                      </>
                    )}
                  </TouchableOpacityView>
                </View>
              </View>
            </View>
          )}

          {/* Step 2: Tax doc resubmit — design like KycStepFour / Upload TAX ID */}
          {resubmitStep === 2 && needsTaxDocResubmit() && (
            <View style={styles.stepBlock}>
              <View style={[styles.resubmitRejectBanner, { backgroundColor: theme === "Dark" ? "rgba(220,53,69,0.2)" : "#f8d7da" }]}>
                <AppText type={FOURTEEN} style={{ color: colors.red }}>Rejection: {getRejectReason("tax_document")}</AppText>
              </View>
              <AppText type={TWELVE} style={{ color: mutedClr, marginBottom: 16 }}>{getDocTypeName(submittedTaxDocType)}</AppText>
              <View style={[styles.sectionCard, { backgroundColor: cardBg }]}>
                <AppText type={TWELVE} weight={SEMI_BOLD} style={[styles.sectionTitle, { color: mutedClr }]}>Document details</AppText>
                <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.fieldLabel, { color: textClr }]}>{getDocTypeName(submittedTaxDocType)} Number <AppText color={RED}>*</AppText></AppText>
                <Input
                  placeholder={"Enter " + (getDocTypeName(submittedTaxDocType) || "Tax ID") + " Number"}
                  value={resubmitTaxNumber}
                  onChangeText={setResubmitTaxNumber}
                  containerStyle={[styles.idDocInput, { backgroundColor: innerCardBg, borderColor: borderClr }]}
                  inputStyle={{ color: textClr }}
                  placeholderTextColor={theme === "Dark" ? "#888" : "#999"}
                />
                <AppText type={FOURTEEN} weight={SEMI_BOLD} style={[styles.fieldLabel, { color: textClr, marginTop: 16 }]}>Upload document <AppText color={RED}>*</AppText></AppText>
                <AppText type={TWELVE} style={[styles.helperText, { color: mutedClr }]}>JPEG, PNG or JPG up to 5MB</AppText>
                {panCardImage ? (
                  <View style={[styles.selfieBox, styles.selfieBoxFilled, { backgroundColor: innerCardBg, borderColor: accentColor, borderWidth: 1, marginTop: 4 }]}>
                    <View style={styles.selfieCaptured}>
                      <View style={styles.selfiePreviewWrap}>
                        <FastImage source={{ uri: panCardImage.uri }} style={styles.selfiePreviewImg} resizeMode="cover" />
                        <View style={[styles.uploadBadge, styles.selfieBadge, { backgroundColor: accentColor }]}>
                          <FastImage source={checkIc} resizeMode="contain" style={styles.uploadBadgeIcon} tintColor={colors.white} />
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => handleImagePick("pan")} style={styles.changeBtn} activeOpacity={0.8}>
                        <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: accentColor }}>Change file</AppText>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacityView onPress={() => handleImagePick("pan")} style={[styles.uploadTaxBox, { borderColor: borderClr }]}>
                    <FastImage source={uploadIcon} tintColor={accentColor} resizeMode="contain" style={styles.uploadTaxIcon} />
                    <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textClr, marginTop: 8 }}>Upload Tax Document</AppText>
                    <AppText type={TWELVE} style={{ color: mutedClr, marginTop: 4 }}>Tap to upload</AppText>
                  </TouchableOpacityView>
                )}
              </View>
            </View>
          )}

          {/* Step 3: Selfie resubmit — same UI as KycStepFour (KYC verification) */}
          {resubmitStep === 3 && needsSelfieResubmit() && (
            <View style={styles.stepBlock}>
              <AppText type={TWELVE} style={{ color: colors.red, marginBottom: 8 }}>Rejection: {getRejectReason("selfie")}</AppText>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: textClr, marginBottom: 6 }}>Selfie capture <AppText color={RED}>*</AppText></AppText>
              {/* <AppText type={TWELVE} style={{ color: theme === "Dark" ? "#888" : "#666", marginBottom: 12 }}>Camera required — allow access to capture live selfie</AppText> */}
              <View style={[styles.selfieBox, selfieImage ? styles.selfieBoxFilled : styles.selfieBoxEmpty, { backgroundColor: selfieImage ? innerCardBg : "transparent", borderColor: selfieImage ? accentColor : borderClr }]}>
                {selfieImage ? (
                  <View style={styles.selfieCaptured}>
                    <View style={styles.selfiePreviewWrap}>
                      <FastImage source={{ uri: selfieImage.uri }} style={styles.selfiePreviewImg} resizeMode="cover" />
                      <View style={[styles.uploadBadge, styles.selfieBadge, { backgroundColor: accentColor }]}>
                        <FastImage source={checkIc} resizeMode="contain" style={styles.uploadBadgeIcon} tintColor={colors.white} />
                      </View>
                    </View>
                    <TouchableOpacity onPress={handleStartSelfieCamera} style={styles.changeBtn}>
                      <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: accentColor }}>Retake with camera</AppText>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.selfiePlaceholder}>
                    <View style={[styles.selfieCircle, { borderColor: borderClr }]}>
                      <FastImage source={DEMO_USER} resizeMode="contain" style={styles.selfieCircleImg} />
                    </View>
                    <TouchableOpacity onPress={handleStartSelfieCamera} style={[styles.cameraBtn, { backgroundColor: accentColor }]}>
                      <FastImage source={CAMERA_IMG} style={styles.cameraBtnIcon} resizeMode="contain" tintColor={colors.white} />
                      <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: colors.white }}>Start camera</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleImagePick("selfie")} style={{ marginTop: 12 }}>
                      <AppText type={TWELVE} style={{ color: theme === "Dark" ? "#888" : "#666" }}>Or choose from gallery</AppText>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Step 4: Security Verification — same layout as KycVerificationScreen / email verification */}
          {resubmitStep === 4 && (
            <View style={styles.verifyStepBlock}>
              <AppText weight={SEMI_BOLD} type={EIGHTEEN} style={[styles.verifyTitle, { color: textClr }]}>{getVerificationTitle()}</AppText>
              <AppText type={THIRTEEN} style={[styles.verifyDescription, { color: mutedClr }]}>{getVerificationDescription()}</AppText>
              <OtpInput6Digit
                label={getVerificationInputLabel()}
                value={emailOtp}
                onChangeText={setemailOtp}
                isDark={isDark}
              />
              {selectedAuthMethod !== 2 && (
                <View style={styles.resendRow}>
                  {modalOtpTimer > 0 ? (
                    <View style={styles.resendRight}>
                      <AppText type={THIRTEEN} style={{ color: mutedClr }}>Resend ({modalOtpTimer}s)</AppText>
                    </View>
                  ) : (
                    <TouchableOpacityView onPress={handleGetOtp} style={styles.resendRight}>
                      <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: accentColor }}>Get OTP</AppText>
                    </TouchableOpacityView>
                  )}
                </View>
              )}
              {(availableVerifyMethods || []).length > 1 && (
                <TouchableOpacityView style={styles.switchMethodRow}>
                  <AppText type={FOURTEEN} style={{ color: accentColor }}>Switch to Another Verification Method </AppText>
                  <FastImage source={SHARE_NEW_ICON} style={styles.switchMethodIcon} tintColor={accentColor} resizeMode="contain" />
                </TouchableOpacityView>
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerRow}>
            {resubmitStep < 4 ? (
              <Button children="Next" onPress={goNext} containerStyle={styles.footerBtnPrimary} />
            ) : (
              <Button children={isSubmitting ? "Submitting..." : "Verify & Submit"} onPress={handleSubmit} disabled={isSubmitting} containerStyle={styles.footerBtnPrimary} />
            )}
          </View>
        </View>
      </KeyBoardAware>

      <PictureModal
        isVisible={pictureModalVisible}
        onBackButtonPress={() => setPictureModalVisible(false)}
        onPressCamera={onPressCamera}
        onPressGallery={onPressGallery}
        isFront={false}
      />
      <SpinnerSecond />
    </AppSafeAreaView>
  );
};

export default KycResubmitScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  stepBlock: { marginBottom: 24 },
  alertDanger: { padding: 12, borderRadius: 8 },
  rejectItem: { marginBottom: 6, color: "#F1F3F4", opacity: 0.5 },
  rejectIllustrationWrap: { alignItems: "center", justifyContent: "center", marginTop: 24, marginBottom: 8 },
  rejectIllustration: { width: 200, height: 150 },
  resubmitRejectBanner: { padding: 12, borderRadius: 12, marginBottom: 12 },
  sectionCard: {
    borderRadius: 16,
    padding: 18,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  sectionTitle: { marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.8 },
  fieldLabel: { marginBottom: 6, letterSpacing: 0.2 },
  helperText: { marginBottom: 4, lineHeight: 18 },
  idDocInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 48, marginBottom: 4 },
  uploadTaxBox: {
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: "dashed",
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  uploadTaxIcon: { width: 36, height: 36 },
  uploadRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  idUploadBox: {
    flex: 1,
    height: 140,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  uploadBoxEmpty: { borderWidth: 2, borderStyle: "dashed" },
  uploadBoxFilled: { borderWidth: 2, borderStyle: "solid" },
  uploadPlaceholderBg: { position: "absolute", left: 0, top: 0, width: "100%", height: "100%", opacity: 0.2 },
  uploadContent: { alignItems: "center", justifyContent: "center", zIndex: 1 },
  uploadIcon: { width: 32, height: 32, marginBottom: 8 },
  uploadedImg: { width: "100%", height: "100%" },
  idUploadBadge: { bottom: 8, right: 8 },
  uploadBox: { flex: 1, height: 100, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  uploadBoxLarge: { marginTop: 12, minHeight: 120, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  inputContainer: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, marginBottom: 12 },
  verifyStepBlock: { marginBottom: 24 },
  verifyTitle: { marginBottom: 8 },
  verifyDescription: { marginBottom: 24 },
  resendRow: { marginTop: 12, marginBottom: 4 },
  resendRight: { alignItems: "flex-end", width: "100%" },
  switchMethodRow: { flexDirection: "row", alignItems: "center", marginTop: 16, marginBottom: 8 },
  switchMethodIcon: { width: 15, height: 15, marginLeft: 4 },
  footer: { paddingHorizontal: 20, paddingBottom: 24, width: "100%", alignSelf: "stretch" },
  footerRow: { flexDirection: "row", alignItems: "center", width: "100%" },
  footerBtnPrimary: { flex: 1, alignSelf: "stretch", minHeight: 48 },
  // Same as KycStepFour selfie UI
  selfieBox: { borderRadius: 14, paddingVertical: 20, paddingHorizontal: 16, alignItems: "center", marginTop: 4 },
  selfieBoxEmpty: { borderWidth: 1, borderStyle: "dashed" },
  selfieBoxFilled: { borderStyle: "solid" },
  selfiePlaceholder: { alignItems: "center" },
  selfieCircle: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderStyle: "dashed", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 14 },
  selfieCircleImg: { width: 50, height: 50 },
  cameraBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, gap: 10 },
  cameraBtnIcon: { width: 20, height: 20 },
  selfieCaptured: { alignItems: "center" },
  selfiePreviewWrap: { position: "relative", marginBottom: 12 },
  selfiePreviewImg: { width: 100, height: 100, borderRadius: 50 },
  uploadBadge: { position: "absolute", width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  uploadBadgeIcon: { width: 14, height: 14 },
  selfieBadge: { bottom: 0, right: 0 },
  changeBtn: { marginTop: 12 },
});
