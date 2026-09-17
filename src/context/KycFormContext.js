import React, { createContext, useContext, useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Platform } from "react-native";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { getCountries, getKycConfig, kycVerification } from "../actions/accountActions";
import { setLoading } from "../slices/authSlice";
import { showError, showSuccess } from "../helper/logger";
import { countryList as fallbackCountryList } from "../helper/dummydata";
import { appOperation } from "../appOperation";

const KycFormContext = createContext(null);

export const useKycForm = () => {
  const ctx = useContext(KycFormContext);
  if (!ctx) throw new Error("useKycForm must be used within KycFormProvider");
  return ctx;
};

const normalizeDocNumber = (value) => {
  if (!value || typeof value !== "string") return "";
  return value.trim().toUpperCase().replace(/\s/g, "");
};

export const getDocTypeName = (code) => {
  const names = { AADHAAR: "Aadhaar Card", PAN: "PAN Card", TAX_ID: "TAX ID", PASSPORT: "Passport", NATIONAL_ID: "National ID Card", DRIVING_LICENSE: "Driving License", RESIDENCE_PERMIT: "Residence Permit", SSN: "SSN", TIN: "TIN", NIN: "NIN", TFN: "TFN", NRIC: "NRIC", EMIRATES_ID: "Emirates ID", VOTER_ID: "Voter ID" };
  return names[code] || code || "ID Document";
};

/** Build file entry for React Native FormData - backend receives actual image (same as web File). */
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

export function KycFormProvider({ children }) {
  const dispatch = useAppDispatch();
  const userData = useAppSelector((s) => s.auth.userData);
  const theme = useAppSelector((s) => s.auth.theme);
  const kycVerified = useAppSelector((s) => s.auth.userData?.kycVerified);
  const [countries, setCountries] = useState([]);
  const [kycConfig, setKycConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [modalCountry, setModalCountry] = useState("");
  const [modalIdType, setModalIdType] = useState("");
  const [modalTaxType, setModalTaxType] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [infoDob, setInfoDob] = useState("");
  const [showDobPicker, setShowDobPicker] = useState(false);
  const dobPickerClosedAt = useRef(0);
  const [gender, setGender] = useState("male");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [infoState, setInfoState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [aadhar, setAadhar] = useState("");
  const [docFront, setDocFront] = useState(null);
  const [docBack, setDocBack] = useState(null);
  const [panCard, setPanCard] = useState("");
  const [panCardImage, setPanCardImage] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [documentNumberError, setDocumentNumberError] = useState("");
  const [taxDocumentError, setTaxDocumentError] = useState("");
  const [emailOtp, setemailOtp] = useState("");
  const [selectedAuthMethod, setSelectedAuthMethod] = useState(1);
  const [modalOtpTimer, setModalOtpTimer] = useState(0);
  const [availableVerifyMethods, setAvailableVerifyMethods] = useState([]);
  const [needsResubmission, setNeedsResubmission] = useState(false);
  const [documentsToResubmit, setDocumentsToResubmit] = useState([]);
  const [submittedIdDocType, setSubmittedIdDocType] = useState(null);
  const [submittedTaxDocType, setSubmittedTaxDocType] = useState(null);
  const [existingCountryCode, setExistingCountryCode] = useState("");
  const [existingIdDocNumber, setExistingIdDocNumber] = useState("");
  const [existingTaxDocNumber, setExistingTaxDocNumber] = useState("");
  const [resubmitIdNumber, setResubmitIdNumber] = useState("");
  const [resubmitTaxNumber, setResubmitTaxNumber] = useState("");

  const countriesList = useMemo(() => (countries?.length ? countries : fallbackCountryList), [countries]);
  const pickerCountries = useMemo(() => countriesList.map((c) => ({ value: c.code || c.value, label: c.name || c.label, flag: c.flag })), [countriesList]);
  const selectedCountry = useMemo(() => countriesList.find((c) => (c.code || c.value) === modalCountry) || countriesList.find((c) => c.value === modalCountry), [countriesList, modalCountry]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const list = await dispatch(getCountries());
      if (mounted && Array.isArray(list)) setCountries(list);
    })();
    return () => { mounted = false; };
  }, [dispatch]);

  useEffect(() => {
    if (!userData) return;
    setFirstName(userData.firstName || "");
    setLastName(userData.lastName || "");
    const methods = [];
    if (userData.emailId) methods.push({ type: 1, label: "Email OTP" });
    if (userData["2fa"]) methods.push({ type: 2, label: "Google Authenticator" });
    if (userData.mobileNumber) methods.push({ type: 3, label: "Mobile OTP" });
    setAvailableVerifyMethods(methods);
    if (methods.length && selectedAuthMethod !== 2) setSelectedAuthMethod(methods[0].type);
  }, [userData?.emailId, userData?.firstName, userData?.lastName, userData?.mobileNumber, userData?.["2fa"]]);

  // Resubmit: ensure name is filled from userData when context name is empty (e.g. Step 2/3 already mounted before setInitialFromResubmit)
  useEffect(() => {
    if (!needsResubmission || !userData) return;
    const fn = (firstName || "").trim();
    const ln = (lastName || "").trim();
    if (!fn && (userData.firstName || "").trim()) setFirstName((userData.firstName || "").trim());
    if (!ln && (userData.lastName || "").trim()) setLastName((userData.lastName || "").trim());
  }, [needsResubmission, userData?.firstName, userData?.lastName]);

  useEffect(() => {
    if (!modalCountry) {
      setKycConfig(null);
      setModalIdType("");
      setModalTaxType("");
      return;
    }
    let mounted = true;
    setLoadingConfig(true);
    dispatch(getKycConfig(modalCountry))
      .then((data) => {
        if (!mounted) return;
        setKycConfig(data || null);
        setModalIdType("");
        setModalTaxType("");
        setAadhar("");
        setPanCard("");
        setDocumentNumberError("");
        setTaxDocumentError("");
      })
      .catch(() => mounted && setKycConfig(null))
      .finally(() => mounted && setLoadingConfig(false));
    return () => { mounted = false; };
  }, [modalCountry, dispatch]);

  useEffect(() => {
    if (modalOtpTimer > 0) {
      const t = setTimeout(() => setModalOtpTimer((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [modalOtpTimer]);

  const validateDocNumber = (value, config) => {
    if (!config) return { valid: false, message: "Document config not found" };
    const normalized = normalizeDocNumber(value);
    if (!normalized) return { valid: false, message: "Document number is required" };
    if (normalized.length < config.min) return { valid: false, message: `Minimum ${config.min} characters required` };
    if (normalized.length > config.max) return { valid: false, message: `Maximum ${config.max} characters allowed` };
    try {
      const regex = new RegExp(config.regex);
      if (!regex.test(normalized)) return { valid: false, message: "Invalid format" };
    } catch (e) {
      return { valid: false, message: "Validation error" };
    }
    return { valid: true, normalized };
  };

  const getIdDocConfig = () => {
    if (!kycConfig || !modalIdType) return null;
    return (kycConfig.id_documents || []).find((d) => d.code === modalIdType);
  };

  const getTaxDocConfig = () => {
    if (!kycConfig || !modalTaxType) return null;
    return (kycConfig.tax_documents || []).find((d) => d.code === modalTaxType);
  };

  const handleDocumentNumberChange = (value) => {
    const normalized = (value || "").toUpperCase().replace(/\s/g, "");
    setAadhar(normalized);
    if (kycConfig && modalIdType) {
      const docConfig = (kycConfig.id_documents || []).find((d) => d.code === modalIdType);
      if (docConfig && normalized.length >= docConfig.min) {
        const validation = validateDocNumber(normalized, docConfig);
        setDocumentNumberError(validation.valid ? "" : validation.message);
      } else {
        setDocumentNumberError("");
      }
    } else {
      setDocumentNumberError("");
    }
  };

  const handlePanCardChange = (value) => {
    const normalized = (value || "").toUpperCase().replace(/\s/g, "");
    setPanCard(normalized);
    if (kycConfig && modalTaxType) {
      const taxConfig = (kycConfig.tax_documents || []).find((d) => d.code === modalTaxType);
      if (taxConfig && normalized.length >= taxConfig.min) {
        const validation = validateDocNumber(normalized, taxConfig);
        setTaxDocumentError(validation.valid ? "" : validation.message);
      } else {
        setTaxDocumentError("");
      }
    } else {
      setTaxDocumentError("");
    }
  };

  const needsIdDocResubmit = () => documentsToResubmit.some((d) => d.type === "id_document");
  const needsTaxDocResubmit = () => documentsToResubmit.some((d) => d.type === "tax_document");
  const needsSelfieResubmit = () => documentsToResubmit.some((d) => d.type === "selfie");
  const getRejectReason = (docType) => {
    const doc = documentsToResubmit.find((d) => d.type === docType);
    return doc?.reason || "";
  };

  const resetForm = useCallback(() => {
    setModalCountry("");
    setModalIdType("");
    setModalTaxType("");
    setFirstName(userData?.firstName || "");
    setLastName(userData?.lastName || "");
    setInfoDob("");
    setGender("male");
    setAddress("");
    setCity("");
    setInfoState("");
    setZipCode("");
    setAadhar("");
    setDocFront(null);
    setDocBack(null);
    setPanCard("");
    setPanCardImage(null);
    setSelfieImage(null);
    setDocumentNumberError("");
    setTaxDocumentError("");
    setemailOtp("");
    setModalOtpTimer(0);
    setKycConfig(null);
  }, [userData]);

  // Pre-fill from resubmit params (same sources as web: kyc_status API + userDetails for name)
  const setInitialFromResubmit = useCallback((params) => {
    if (!params) return;
    const kyc = params.existingKycData || {};
    const str = (v) => (v != null && String(v).trim() !== "" ? String(v).trim() : "");
    // Country, doc types, document numbers (same as web fetchKycStatus)
    if (params.existingCountryCode) setModalCountry(params.existingCountryCode);
    if (params.submittedIdDocType) setModalIdType(params.submittedIdDocType);
    if (params.submittedTaxDocType) setModalTaxType(params.submittedTaxDocType);
    if (params.resubmitIdNumber != null && params.resubmitIdNumber !== "") setAadhar(params.resubmitIdNumber);
    if (params.resubmitTaxNumber != null && params.resubmitTaxNumber !== "") setPanCard(params.resubmitTaxNumber);
    // Name: kyc_data first (snake_case or camelCase), else userData
    const first = str(kyc.first_name) || str(kyc.firstName) || (userData?.firstName || "");
    const last = str(kyc.last_name) || str(kyc.lastName) || (userData?.lastName || "");
    setFirstName(first);
    setLastName(last);
    // Personal & address from kyc_data when backend returns them (user/kyc-status)
    const dobStr = str(kyc.date_of_birth) || str(kyc.dateOfBirth);
    if (dobStr) {
      let formattedDob = dobStr;
      if (dobStr.includes("-")) {
        formattedDob = dobStr.split("-").reverse().join("/");
      }
      setInfoDob(formattedDob);
    }
    const g = (kyc.gender || "").toLowerCase();
    if (g === "female" || g === "male" || g === "other") setGender(g);
    const addr = str(kyc.address_line1) || str(kyc.address) || str(kyc.addressLine1);
    if (addr) setAddress(addr);
    const cityVal = str(kyc.city);
    if (cityVal) setCity(cityVal);
    const stateVal = str(kyc.state);
    if (stateVal) setInfoState(stateVal);
    const zip = str(kyc.postal_code) || str(kyc.postalCode) || str(kyc.zip_code);
    if (zip) setZipCode(zip);
  }, [userData]);

  const validateStep0 = useCallback(() => {
    if (!modalCountry) { showError("Please select a country"); return false; }
    if (!modalIdType) { showError("Please select an ID type"); return false; }
    return true;
  }, [modalCountry, modalIdType]);

  const validateStep1 = useCallback(() => {
    const fn = (firstName || "").trim(); const ln = (lastName || "").trim();
    if (fn.length < 2) { showError("Please enter a valid first name (at least 2 characters)"); return false; }
    if (!ln) { showError("Please enter a valid last name"); return false; }
    if (!infoDob) { showError("Please enter your date of birth"); return false; }
    let dobDate;
    if (infoDob.includes("/")) {
      const [d, m, y] = infoDob.split("/");
      dobDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    } else {
      dobDate = new Date(infoDob);
    }
    const age = Math.floor((Date.now() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 18) { showError("You must be at least 18 years old"); return false; }
    if (!address || address.trim().length < 10) { showError("Please enter a valid address (at least 10 characters)"); return false; }
    if (!city || city.trim().length < 2) { showError("Please enter a valid city"); return false; }
    if (!infoState || infoState.trim().length < 2) { showError("Please enter a valid state"); return false; }
    if (!zipCode || zipCode.trim().length < 3) { showError("Please enter a valid zip/postal code"); return false; }
    return true;
  }, [firstName, lastName, infoDob, address, city, infoState, zipCode]);

  const validateStep2 = useCallback(() => {
    if (needsResubmission && !needsIdDocResubmit()) return true;
    const docConfig = getIdDocConfig();
    if (!aadhar || aadhar.trim().length < 4) { showError("Please enter a valid document number"); return false; }
    if (docConfig) {
      const v = validateDocNumber(aadhar, docConfig);
      if (!v.valid) { showError(v.message || "Invalid document number"); setDocumentNumberError(v.message); return false; }
    }
    if (!docFront) { showError("Please upload front image of your ID card"); return false; }
    if (docConfig?.requires_back_image && !docBack) { showError("Please upload back image of your ID card"); return false; }
    return true;
  }, [needsResubmission, needsIdDocResubmit, getIdDocConfig, aadhar, docFront, docBack]);

  const validateStep3 = useCallback(() => {
    if (needsResubmission && !needsTaxDocResubmit() && !needsSelfieResubmit()) return true;
    if (!needsResubmission || needsTaxDocResubmit()) {
      if (!modalTaxType) { showError("Please select a tax document type"); return false; }
      const taxConfig = getTaxDocConfig();
      if (!panCard) { showError("Please enter Tax Identification Number"); return false; }
      if (taxConfig) {
        const v = validateDocNumber(panCard, taxConfig);
        if (!v.valid) { showError(v.message || "Invalid Tax ID"); setTaxDocumentError(v.message); return false; }
      }
      if (!panCardImage) { showError("Please upload Tax document"); return false; }
    }
    if (!needsResubmission || needsSelfieResubmit()) {
      if (!selfieImage) { showError("Please upload/capture selfie"); return false; }
    }
    return true;
  }, [needsResubmission, needsTaxDocResubmit, needsSelfieResubmit, modalTaxType, getTaxDocConfig, panCard, panCardImage, selfieImage]);

  /** Same as web handleModalKycSubmit: exact same FormData keys, order and resubmission logic. */
  const buildKycFormData = () => {
    const formData = new FormData();
    const countryName = selectedCountry?.name || selectedCountry?.label || modalCountry;
    const isPartialRejection = kycVerified === 4 || kycVerified === "4";
    // Personal info (same as web)
    formData.append("first_name", (firstName || userData?.firstName || "").trim());
    formData.append("last_name", (lastName || userData?.lastName || "").trim());
    formData.append("gender", gender);
    let finalDob = infoDob;
    if (infoDob && infoDob.includes("/")) {
      const [d, m, y] = infoDob.split("/");
      finalDob = `${y}-${m}-${d}`;
    }
    formData.append("date_of_birth", finalDob);
    formData.append("nationality", countryName);

    // Address (same as web)
    formData.append("address_line1", address.trim());
    formData.append("city", city.trim());
    formData.append("state", infoState.trim());
    formData.append("postal_code", zipCode.trim().toUpperCase());
    formData.append("country_code", modalCountry);
    formData.append("country_name", countryName);

    // ID Document – when resubmitting, only append images if ID doc needs resubmit
    formData.append("id_document_type", modalIdType);
    formData.append("id_document_number", normalizeDocNumber(aadhar));
    const appendIdImages = !isPartialRejection || !needsResubmission || needsIdDocResubmit();
    if (appendIdImages) {
      const idFrontFile = toFormDataFile(docFront, "id_front.jpg");
      if (idFrontFile) formData.append("id_front_image", idFrontFile);
      const idBackFile = toFormDataFile(docBack, "id_back.jpg");
      if (idBackFile) formData.append("id_back_image", idBackFile);
    }

    // Tax Document – when resubmitting, only append if tax doc needs resubmit
    formData.append("tax_document_type", modalTaxType);
    formData.append("tax_document_number", normalizeDocNumber(panCard));
    const appendTaxImage = !isPartialRejection || !needsResubmission || needsTaxDocResubmit();
    if (appendTaxImage) {
      const taxDocFile = toFormDataFile(panCardImage, "tax_doc.jpg");
      if (taxDocFile) formData.append("tax_document_image", taxDocFile);
    }

    // Selfie – when resubmitting, only append if selfie needs resubmit
    const appendSelfie = !isPartialRejection || !needsResubmission || needsSelfieResubmit();
    if (appendSelfie) {
      const selfieFile = toFormDataFile(selfieImage, "selfie.jpg");
      if (selfieFile) formData.append("selfie_image", selfieFile);
    }
    formData.append("selfie_capture_method", "camera");
    formData.append("selfie_device_info", "React Native");

    // Verification (same as web)
    formData.append("verification_code", emailOtp);
    formData.append("verification_method", selectedAuthMethod === 1 ? "email_otp" : selectedAuthMethod === 2 ? "2fa" : selectedAuthMethod === 3 ? "sms_otp" : "passkey");

    // Resubmission - only for PARTIAL rejection (kycVerified === 4), same as web. For full reject (3) or first time (0) no is_resubmission.
    const validDocsToResubmit = (documentsToResubmit || []).filter((d) => d && d.type);
    if (isPartialRejection && needsResubmission && validDocsToResubmit.length > 0) {
      formData.append("is_resubmission", "true");
      validDocsToResubmit.forEach((doc) => {
        if (doc.type === "id_document") formData.append("resubmitting_id_document", "true");
        else if (doc.type === "tax_document") formData.append("resubmitting_tax_document", "true");
        else if (doc.type === "selfie") formData.append("resubmitting_selfie", "true");
      });
    }

    return formData;
  };

  const handleKycSubmit = async (onSuccess) => {
    const fn = (firstName || userData?.firstName || "").trim();
    const ln = (lastName || userData?.lastName || "").trim();
    const validDocsToResubmit = (documentsToResubmit || []).filter((d) => d && d.type);
    const isResubmitFlow = needsResubmission && validDocsToResubmit.length > 0;

    if (!fn || !ln) { showError("First name and last name are required."); return; }
    if (!modalCountry || !modalIdType) { showError("Please select country and ID type."); return; }
    if (isResubmitFlow) {
      if (needsIdDocResubmit() && (!aadhar || !docFront)) { showError("Please provide ID document number and front image."); return; }
      if (needsTaxDocResubmit() && (!modalTaxType || !panCard || !panCardImage)) { showError("Please provide tax document."); return; }
      if (needsSelfieResubmit() && !selfieImage) { showError("Please upload/capture selfie."); return; }
    } else {
      if (!aadhar || !docFront) { showError("Please provide ID document number and front image."); return; }
      if (!modalTaxType || !panCard || !panCardImage || !selfieImage) { showError("Please provide tax document and selfie."); return; }
    }
    if (selectedAuthMethod !== 2 && !emailOtp) { showError("Please enter verification code or Get OTP."); return; }
    if (selectedAuthMethod === 2 && !emailOtp) { showError("Please enter Google Authenticator code."); return; }
    const formData = buildKycFormData();
    // Console: text fields + "has file?" flags only (FormData actually sends real image blobs for id_front_image, id_back_image, tax_document_image, selfie_image)
    const isPartialRejectionLog = kycVerified === 4 || kycVerified === "4";
    const validDocsLog = (documentsToResubmit || []).filter((d) => d && d.type);
    const bodyLog = {
      first_name: (firstName || userData?.firstName || "").trim(),
      last_name: (lastName || userData?.lastName || "").trim(),
      gender,
      date_of_birth: infoDob,
      nationality: selectedCountry?.name || selectedCountry?.label || modalCountry,
      country_code: modalCountry,
      id_document_type: modalIdType,
      id_document_number: normalizeDocNumber(aadhar),
      tax_document_type: modalTaxType,
      tax_document_number: normalizeDocNumber(panCard),
      verification_method: selectedAuthMethod === 1 ? "email_otp" : selectedAuthMethod === 2 ? "2fa" : "sms_otp",
      verification_code_length: (emailOtp || "").length,
      has_id_front_image: !!docFront,
      has_id_back_image: !!docBack,
      has_tax_document_image: !!panCardImage,
      has_selfie_image: !!selfieImage,
      kycVerified,
      is_resubmission: isPartialRejectionLog && needsResubmission && validDocsLog.length > 0,
    };
    console.log("[KYC Submit] Body (text + has_file flags; FormData sends real image files):", JSON.stringify(bodyLog, null, 2));
    try {
      const result = await dispatch(kycVerification(formData));
      console.log("[KYC Submit] Result after dispatch:", result ? { success: result.success, message: result.message } : result);
      if (result?.success) {
        resetForm();
        onSuccess?.();
      }
    } catch (e) {
      console.log("[KYC Submit] Error:", e?.message || e);
    }
  };

  const handleGetOtp = async () => {
    let target; let sendType;
    if (selectedAuthMethod === 1) { target = userData?.emailId; sendType = 1; }
    else if (selectedAuthMethod === 3) { target = userData?.country_code && userData?.mobileNumber ? `${userData.country_code} ${userData.mobileNumber}` : userData?.mobileNumber; sendType = 3; }
    else return;
    if (!target) { showError("Email or mobile not available"); return; }
    try {
      dispatch(setLoading(true));
      const result = await appOperation.customer.send_kyc_otp(target, sendType);
      if (result?.success) { showSuccess("OTP sent successfully"); setModalOtpTimer(60); }
      else showError(result?.message || "Failed to Send OTP");
    } catch (e) { showError(e?.message || "Failed to Send OTP"); }
    finally { dispatch(setLoading(false)); }
  };

  const value = {
    theme,
    userData,
    countriesList,
    pickerCountries,
    selectedCountry,
    kycConfig,
    loadingConfig,
    modalCountry, setModalCountry,
    modalIdType, setModalIdType,
    modalTaxType, setModalTaxType,
    firstName, setFirstName,
    lastName, setLastName,
    infoDob, setInfoDob,
    showDobPicker, setShowDobPicker,
    dobPickerClosedAt,
    gender, setGender,
    address, setAddress,
    city, setCity,
    infoState, setInfoState,
    zipCode, setZipCode,
    aadhar, setAadhar,
    docFront, setDocFront,
    docBack, setDocBack,
    panCard, setPanCard,
    panCardImage, setPanCardImage,
    selfieImage, setSelfieImage,
    documentNumberError, setDocumentNumberError,
    taxDocumentError, setTaxDocumentError,
    emailOtp, setemailOtp,
    selectedAuthMethod, setSelectedAuthMethod,
    modalOtpTimer,
    availableVerifyMethods,
    needsResubmission, setNeedsResubmission,
    documentsToResubmit, setDocumentsToResubmit,
    submittedIdDocType, setSubmittedIdDocType,
    submittedTaxDocType, setSubmittedTaxDocType,
    existingCountryCode, setExistingCountryCode,
    existingIdDocNumber, setExistingIdDocNumber,
    existingTaxDocNumber, setExistingTaxDocNumber,
    resubmitIdNumber, setResubmitIdNumber,
    resubmitTaxNumber, setResubmitTaxNumber,
    getIdDocConfig,
    getTaxDocConfig,
    validateDocNumber,
    handleDocumentNumberChange,
    handlePanCardChange,
    needsIdDocResubmit,
    needsTaxDocResubmit,
    needsSelfieResubmit,
    getRejectReason,
    resetForm,
    setInitialFromResubmit,
    validateStep0,
    validateStep1,
    validateStep2,
    validateStep3,
    buildKycFormData,
    handleKycSubmit,
    handleGetOtp,
    normalizeDocNumber,
  };

  return (
    <KycFormContext.Provider value={value}>
      {children}
    </KycFormContext.Provider>
  );
}
