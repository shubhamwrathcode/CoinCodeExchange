import { StyleSheet, View, TouchableOpacity, Dimensions, Platform, FlatList } from "react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import RBSheet from "react-native-raw-bottom-sheet";
import {
  AppSafeAreaView,
  AppText,
  BOLD,
  Button,
  EIGHTEEN,
  FOURTEEN,
  Input,
  PictureModal,
  SEMI_BOLD,
  SIXTEEN,
  THIRTEEN,
  TWELVE,
} from "../../shared";
import KeyBoardAware from "../../shared/components/KeyboardAware";
import { back_ic, checkIc, doneIcon, DOWN_ARROW, printIcon, uploadIcon } from "../../helper/ImageAssets";
import NavigationService from "../../navigation/NavigationService";
import FastImage from "react-native-fast-image";
import { useDispatch } from "react-redux";
import { submitTicket, getTicketCategories } from "../../actions/accountActions";
import { showError } from "../../helper/logger";
import TouchableOpacityView from "../../shared/components/TouchableOpacityView";
import ImageCropPicker from "react-native-image-crop-picker";
import { useAppSelector } from "../../store/hooks";
import { useTheme } from "../../hooks/useTheme";
import { colors } from "../../theme/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const H_PADDING = Math.max(14, SCREEN_WIDTH * 0.04);

const DEFAULT_PRIORITIES = [
  { id: "low", name: "Low" },
  { id: "medium", name: "Medium" },
  { id: "high", name: "High" },
];

export default function CreateTicket() {
  const dispatch = useDispatch();
  const { colors: themeColors, isDark } = useTheme();
  const isLoading = useAppSelector((state) => state.auth.isLoading);
  const [subject, setSubject] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("medium");
  const [categories, setCategories] = useState([]);
  const [priorities, setPriorities] = useState(DEFAULT_PRIORITIES);
  const [issuePic, setIssuePic] = useState();
  const [isVisible, setIsVisible] = useState(false);
  const categorySheetRef = useRef(null);
  const prioritySheetRef = useRef(null);

  const categorySheetHeight = useMemo(() => {
    const rowH = 52;
    const header = 72;
    const maxH = Math.round(Dimensions.get("window").height * 0.55);
    const rows = Math.max(categories.length, 1);
    return Math.min(maxH, Math.max(240, header + Math.min(rows, 12) * rowH));
  }, [categories.length]);

  const prioritySheetHeight = useMemo(() => {
    const rowH = 52;
    const header = 72;
    const maxH = Math.round(Dimensions.get("window").height * 0.45);
    const rows = Math.max(priorities?.length || 0, 1);
    return Math.min(maxH, Math.max(220, header + Math.min(rows, 8) * rowH));
  }, [priorities?.length]);

  const categoryDisplayName =
    categories.find((c) => String(c?.id) === String(category))?.name || "Select Category";
  const isCategoryPlaceholder = !category;

  const priorityDisplayName =
    priorities.find((p) => String(p?.id) === String(priority))?.name || "Select Priority";
  const isPriorityPlaceholder = !priority;

  useEffect(() => {
    dispatch(getTicketCategories(setCategories, setPriorities));
  }, [dispatch]);

  useEffect(() => {
    if (!priorities?.length) return;
    setPriority((prev) => {
      if (priorities.some((p) => String(p?.id) === String(prev))) return prev;
      const med = priorities.find((p) => String(p?.id).toLowerCase() === "medium");
      return med ? String(med.id) : String(priorities[0].id);
    });
  }, [priorities]);

  const handleResetInput = () => {
    setSubject("");
    setDesc("");
    setCategory("");
    setPriority("medium");
    setIssuePic("");
  };

  const handleSubmit = () => {
    if (!subject.trim()) {
      showError("Please enter subject");
      return;
    }
    if (!category) {
      showError("Please select category");
      return;
    }
    if (!desc.trim()) {
      showError("Please enter description");
      return;
    }

    const formData = new FormData();
    formData.append("subject", subject.trim());
    formData.append("description", desc.trim());
    formData.append("category", category);
    formData.append("priority", priority);
    if (issuePic) {
      formData.append("issue_image", issuePic);
    }
    dispatch(submitTicket(formData, handleResetInput));
  };

  const onPressCamera = () => {
    ImageCropPicker.openCamera({
      multiple: false,
      mediaType: "photo",
      cropping: true,
      compressImageQuality: 1,
    })
      .then((image) => {
        if (
          image?.size < 2000000 &&
          (image?.mime === "image/png" || image?.mime === "image/jpeg" || image?.mime === "image/jpg")
        ) {
          const mime = image?.mime?.split("/");
          const tempphoto = {
            uri: image.path,
            name: "issuePic_image" + image.modificationDate + "." + mime[1],
            type: image.mime,
          };
          setIssuePic(tempphoto);
        } else {
          setIssuePic("");
          showError("Only JPEG, PNG & JPG formats and file size upto 2MB are supported");
        }
      })
      .catch(() => { });
  };

  const onPressGallery = () => {
    ImageCropPicker.openPicker({
      multiple: false,
      mediaType: "photo",
      cropping: true,
      compressImageQuality: 1,
    })
      .then((image) => {
        if (
          image?.size < 2000000 &&
          (image?.mime === "image/png" || image?.mime === "image/jpeg" || image?.mime === "image/jpg")
        ) {
          const mime = image?.mime?.split("/");
          const tempphoto = {
            uri: image.path,
            name: "issuePic_image" + image.modificationDate + "." + mime[1],
            type: image.mime,
          };
          setIssuePic(tempphoto);
        } else {
          setIssuePic("");
          showError("Only JPEG, PNG & JPG formats and file size upto 2MB are supported");
        }
      })
      .catch(() => { });
  };

  return (
    <AppSafeAreaView style={{ backgroundColor: themeColors.background, flex: 1 }}>
      <KeyBoardAware style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => NavigationService.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <FastImage source={back_ic} resizeMode="contain" style={{ width: 18, height: 18 }} tintColor={themeColors.text} />
          </TouchableOpacity>
          <AppText weight={SEMI_BOLD} type={EIGHTEEN} style={{ color: themeColors.text }}>
            Create Tickets
          </AppText>
          <TouchableOpacity
            onPress={() => NavigationService.navigate("Support")}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <FastImage source={printIcon} style={{ width: 20, height: 20 }} resizeMode="contain" tintColor={themeColors.text} />
          </TouchableOpacity>
        </View>

        <View style={[styles.container, { paddingHorizontal: H_PADDING }]}>
          <AppText type={THIRTEEN} style={{ color: themeColors.secondaryText, lineHeight: 16, marginBottom: 14 }}>
            Track and manage all your support requests in one place.
          </AppText>

          <View style={[styles.formCard, {}]}>
            <View style={{ marginBottom: 16 }}>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 8 }}>
                Subject*
              </AppText>
              <Input
                placeholder={"Enter subject"}
                value={subject}
                onChangeText={setSubject}
                autoCapitalize="none"
                returnKeyType="next"
                containerStyle={{
                  backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6",
                  borderWidth: 0
                }}
                inputStyle={{ color: themeColors.text }}
                placeholderTextColor={themeColors.secondaryText}
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 8 }}>
                Category*
              </AppText>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => categorySheetRef.current?.open()}
                style={[
                  styles.categoryTrigger,
                  {
                    backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6",
                    borderColor: "transparent",
                    borderWidth: 0
                  },
                ]}
              >
                <AppText
                  type={FOURTEEN}
                  style={{
                    flex: 1,
                    color: isCategoryPlaceholder ? themeColors.secondaryText : themeColors.text,
                  }}
                >
                  {categoryDisplayName}
                </AppText>
                <FastImage
                  source={DOWN_ARROW}
                  style={{ width: 10, height: 10 }}
                  tintColor={themeColors.secondaryText}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
            <View style={{ marginBottom: 16 }}>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 8 }}>
                Priority*
              </AppText>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => prioritySheetRef.current?.open()}
                style={[
                  styles.categoryTrigger,
                  {
                    backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6",
                    borderColor: "transparent",
                    borderWidth: 0
                  },
                ]}
              >
                <AppText
                  type={FOURTEEN}
                  style={{
                    flex: 1,
                    color: isPriorityPlaceholder ? themeColors.secondaryText : themeColors.text,
                  }}
                >
                  {priorityDisplayName}
                </AppText>
                <FastImage
                  source={DOWN_ARROW}
                  style={{ width: 10, height: 10 }}
                  tintColor={themeColors.secondaryText}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 16 }}>
              <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, marginBottom: 8 }}>
                Description*
              </AppText>
              <Input
                placeholder={"Describe your issue in detail"}
                value={desc}
                onChangeText={setDesc}
                autoCapitalize="none"
                returnKeyType="done"
                multiline
                containerStyle={{
                  backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6",
                  height: 120,
                  alignItems: "flex-start",
                  paddingTop: 8,
                  borderWidth: 0
                }}
                inputStyle={{ color: themeColors.text, textAlignVertical: "top" }}
                placeholderTextColor={themeColors.secondaryText}
              />
            </View>

            <AppText type={FOURTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text, }}>
              Supporting image (Optional)*
            </AppText>
            <TouchableOpacityView
              onPress={() => setIsVisible(true)}
              style={[
                styles.fileContainer,
                { borderColor: themeColors.inputBorder, backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.01)" },
              ]}
            >
              <FastImage source={issuePic ? doneIcon : uploadIcon} tintColor={issuePic ? null : colors.cyanTheme} style={styles.uploadIcon} resizeMode="contain" />
              <AppText style={{ color: themeColors.text, marginTop: 8, fontSize: 13 }}>
                {issuePic ? "Image attached" : "Supporting image (Optional)"}
              </AppText>
            </TouchableOpacityView>

            <Button
              children="Submit ticket"
              containerStyle={{ marginTop: 20, backgroundColor: themeColors.button }}
              disabled={!subject || !category || !desc}
              onPress={handleSubmit}
              loading={isLoading}
            />
          </View>
        </View>
      </KeyBoardAware>
      <PictureModal
        isVisible={isVisible}
        onBackButtonPress={() => setIsVisible(false)}
        onPressGallery={onPressGallery}
        onPressCamera={onPressCamera}
      />

      <RBSheet
        ref={categorySheetRef}
        closeOnDragDown
        closeOnPressMask
        height={categorySheetHeight}
        animationType="slide"
        customStyles={{
          container: {
            backgroundColor: themeColors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: H_PADDING,
            paddingTop: 8,
            paddingBottom: 16,
          },
          wrapper: { backgroundColor: "#0006" },
          draggableIcon: { backgroundColor: themeColors.border, width: 40 },
        }}
      >
        <AppText weight={BOLD} type={EIGHTEEN} style={{ color: themeColors.text, marginBottom: 4 }}>
          Select category
        </AppText>
        <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginBottom: 12 }}>
          Choose the topic that best matches your issue.
        </AppText>
        {categories.length === 0 ? (
          <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText, paddingVertical: 20 }}>
            No categories available. Try again later or reopen this screen.
          </AppText>
        ) : (
          <View style={{ flex: 1 }}>
            <FlatList
              data={categories}
              style={{ flex: 1 }}
              keyExtractor={(item, index) => String(item?.id ?? item?.name ?? index)}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = String(item?.id) === String(category);
                return (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => {
                      setCategory(item?.id ?? "");
                      categorySheetRef.current?.close();
                    }}
                    style={[
                      styles.sheetOption,
                      { borderBottomColor: themeColors.border, backgroundColor: selected ? themeColors.card : "transparent" },
                    ]}
                  >
                    <AppText type={SIXTEEN} weight={selected ? SEMI_BOLD : undefined} style={{ color: themeColors.text, flex: 1 }}>
                      {item?.name != null ? String(item.name) : String(item?.id ?? "—")}
                    </AppText>
                    {selected ? (
                      <FastImage source={checkIc} style={{ width: 14, height: 14 }} resizeMode="contain" tintColor={themeColors.button} />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}
      </RBSheet>

      <RBSheet
        ref={prioritySheetRef}
        closeOnDragDown
        closeOnPressMask
        height={prioritySheetHeight}
        animationType="slide"
        customStyles={{
          container: {
            backgroundColor: themeColors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: H_PADDING,
            paddingTop: 8,
            paddingBottom: 16,
          },
          wrapper: { backgroundColor: "#0006" },
          draggableIcon: { backgroundColor: themeColors.border, width: 40 },
        }}
      >
        <AppText weight={BOLD} type={EIGHTEEN} style={{ color: themeColors.text, marginBottom: 4 }}>
          Select priority
        </AppText>
        <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginBottom: 12 }}>
          Higher priority may be reviewed sooner when queues are busy.
        </AppText>
        {!priorities?.length ? (
          <AppText type={FOURTEEN} style={{ color: themeColors.secondaryText, paddingVertical: 20 }}>
            No priority options available.
          </AppText>
        ) : (
          <View style={{ flex: 1 }}>
            <FlatList
              data={priorities}
              style={{ flex: 1 }}
              keyExtractor={(item, index) => String(item?.id ?? item?.name ?? index)}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = String(item?.id) === String(priority);
                return (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => {
                      setPriority(item?.id ?? "medium");
                      prioritySheetRef.current?.close();
                    }}
                    style={[
                      styles.sheetOption,
                      { borderBottomColor: themeColors.border, backgroundColor: selected ? themeColors.card : "transparent" },
                    ]}
                  >
                    <AppText type={SIXTEEN} weight={selected ? SEMI_BOLD : undefined} style={{ color: themeColors.text, flex: 1 }}>
                      {item?.name != null ? String(item.name) : String(item?.id ?? "—")}
                    </AppText>
                    {selected ? (
                      <FastImage source={checkIc} style={{ width: 14, height: 14 }} resizeMode="contain" tintColor={themeColors.button} />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}
      </RBSheet>
    </AppSafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: H_PADDING,
    paddingTop: 12,
    paddingBottom: 8,
  },
  container: {
    flex: 1,
    paddingTop: 8,
  },
  fileContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    marginTop: 12,
  },
  uploadIcon: {
    height: 36,
    width: 36,
  },
  formCard: {
    borderRadius: 16,
    padding: 10,
  },
  categoryTrigger: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
});
