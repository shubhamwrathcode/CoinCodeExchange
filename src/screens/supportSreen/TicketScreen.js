import { useRoute } from "@react-navigation/native";
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Clipboard,
  Keyboard,
} from "react-native";
import FastImage from "react-native-fast-image";
import {
  AppText,
  SEMI_BOLD,
  AppSafeAreaView,
  FOURTEEN,
  SIXTEEN,
  TWELVE,
  Input
} from "../../shared";
import NavigationService from "../../navigation/NavigationService";
import { colors } from "../../theme/colors";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { ticketMessages } from "../../actions/accountActions";
import moment from "moment";
import { back_ic, Send_Img, copyIcon, closeIcon, gallery_ic } from "../../helper/ImageAssets";
import { showSuccess } from "../../helper/logger";
import { useTheme } from "../../hooks/useTheme";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import ImageCropPicker from "react-native-image-crop-picker";

const parseTicketMessage = (text) => {
  if (!text) return [];
  const segments = [];
  const imgRegex = /\[img\](.*?)\[\/img\]/gi;
  let lastIndex = 0;
  let match;
  while ((match = imgRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: text.substring(lastIndex, match.index) });
    }
    segments.push({ type: 'image', url: match[1] });
    lastIndex = imgRegex.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', text: text.substring(lastIndex) });
  }
  return segments;
};

const TicketScreen = () => {
  const route = useRoute();
  const dispatch = useAppDispatch();
  const flatListRef = React.useRef(null);
  const { colors: themeColors, isDark } = useTheme();
  const userTickets = useAppSelector((state) => state.home.userTickets);
  const userData = useAppSelector((state) => state.auth.userData);
  const chatData = route?.params?.data;

  // Get user initial for avatar (same as web logic)
  const getUserInitial = () => {
    if (userData?.first_name) {
      return userData.first_name.charAt(0).toUpperCase();
    }
    if (userData?.name) {
      return userData.name.charAt(0).toUpperCase();
    }
    if (userData?.emailId) {
      return userData.emailId.charAt(0).toUpperCase();
    }
    return "U";
  };

  const userInitial = getUserInitial();

  // Find the latest chat object from Redux to ensure we see new messages
  const chat = userTickets?.find(t => t._id === chatData?._id) || chatData;
  const messages = chat?.ticket || [];

  const [message, setMessage] = useState("");
  const [attachedImage, setAttachedImage] = useState(null);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages]);

  const renderMessage = ({ item }) => {
    const isUser = item.replyBy === 1;
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.supportRow]}>
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}>
            <AppText weight={SEMI_BOLD} type={TEN} style={{ color: themeColors.button }}>{item?.name ? item.name.charAt(0).toUpperCase() : "T"}</AppText>
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.supportBubble,
          {
            backgroundColor: isUser ? themeColors.button : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"),
            borderColor: isUser ? 'transparent' : themeColors.border,
            borderWidth: isUser ? 0 : 0.5
          }
        ]}>
          {parseTicketMessage(item.query).map((segment, index) => {
            if (segment.type === 'image') {
              return (
                <FastImage
                  key={`img-${index}`}
                  source={{ uri: segment.url }}
                  style={{ width: 150, height: 150, borderRadius: 8, marginVertical: 4 }}
                  resizeMode="cover"
                />
              );
            }
            return (
              <AppText key={`text-${index}`} style={{ color: isUser ? themeColors.buttonText : themeColors.text }} type={FOURTEEN}>
                {segment.text}
              </AppText>
            );
          })}
          <AppText
            style={[styles.timestamp, { color: isUser ? themeColors.buttonText + 'CC' : themeColors.secondaryText }]}
            type={TWELVE}
          >
            {moment(item.createdAt).format("hh:mm A")}
          </AppText>
        </View>
        {isUser && (
          <View style={[styles.avatar, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}>
            <AppText weight={SEMI_BOLD} type={TWELVE} style={{ color: themeColors.button }}>{userInitial}</AppText>
          </View>
        )}
      </View>
    );
  };

  const handlePickImage = async () => {
    try {
      const image = await ImageCropPicker.openPicker({
        mediaType: 'photo',
        includeBase64: true,
        compressImageMaxWidth: 1024,
        compressImageMaxHeight: 1024,
        compressImageQuality: 0.7,
      });
      if (image) {
        setAttachedImage({
          uri: image.path,
          base64: image.data,
          mime: image.mime || 'image/jpeg'
        });
      }
    } catch (error) {
      console.log('Image picker error:', error);
    }
  };

  const handleTicketMessages = () => {
    if (!message.trim() && !attachedImage) return;

    let payloadMsg = message.trim();
    if (attachedImage) {
      const imgPart = `[img]data:${attachedImage.mime};base64,${attachedImage.base64}[/img]`;
      payloadMsg = payloadMsg ? `${payloadMsg}\n${imgPart}` : imgPart;
    }

    let data = {
      replyBy: 1,
      query: payloadMsg,
      ticket_id: chat?._id,
    }
    dispatch(ticketMessages(data, () => {
      setMessage("");
      setAttachedImage(null);
    }));
  }

  const copyToClipboard = (text) => {
    Clipboard.setString(text);
    showSuccess("Ticket Id Copied!");
  };

  const [keyboardPadding, setKeyboardPadding] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
        setKeyboardPadding(e.endCoordinates.height);
      });
      const hideSub = Keyboard.addListener('keyboardDidHide', () => {
        setKeyboardPadding(0);
      });
      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }
  }, []);

  return (
    <AppSafeAreaView style={{ backgroundColor: isDark ? themeColors.background : colors.white, flex: 1, paddingBottom: keyboardPadding }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        enabled={Platform.OS === "ios"}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => NavigationService.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <FastImage source={back_ic} style={{ width: 18, height: 18 }} resizeMode="contain" tintColor={themeColors.text} />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity onPress={() => copyToClipboard(chat?.ticketId)} style={styles.copyBtn}>
              <FastImage source={copyIcon} style={{ width: 14, height: 14 }} resizeMode="contain" tintColor={themeColors.secondaryText} />
            </TouchableOpacity>
            <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: themeColors.text }}>#{chat?.ticketId}</AppText>
          </View>
          <View style={{ width: 22 }} />
        </View>

        <View style={styles.content}>
          {/* Ticket Details summary card */}
          <View style={[styles.detailCard, { backgroundColor: isDark ? themeColors.background : colors.white, borderColor: themeColors.border }]}>
            <View style={styles.detailRow}>
              <View style={styles.detailCol}>
                <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>Created On</AppText>
                <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ marginTop: 2, color: themeColors.text }}>
                  {moment(chat?.createdAt).format('DD MMM, YYYY')}
                </AppText>
              </View>
              <View style={[styles.detailCol, { alignItems: 'flex-end' }]}>
                <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>Priority</AppText>
                <View style={[styles.priorityBadge, { backgroundColor: themeColors.button + '20' }]}>
                  <AppText weight={SEMI_BOLD} type={TWELVE} style={{ color: themeColors.button, textTransform: 'capitalize' }}>
                    {chat?.priority || "Medium"}
                  </AppText>
                </View>
              </View>
            </View>

            <View style={[styles.cardDivider, { backgroundColor: themeColors.border }]} />

            <View style={styles.detailRow}>
              <View style={styles.detailCol}>
                <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>Department</AppText>
                <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ marginTop: 2, color: themeColors.text, textTransform: 'capitalize' }}>
                  {chat?.department?.replace(/_/g, ' ')}
                </AppText>
              </View>
              <View style={[styles.detailCol, { alignItems: 'flex-end' }]}>
                <AppText type={TWELVE} style={{ color: themeColors.secondaryText }}>Category</AppText>
                <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ marginTop: 2, color: themeColors.text, textTransform: 'capitalize' }}>
                  {chat?.category?.replace(/_/g, ' ')}
                </AppText>
              </View>
            </View>
          </View>

          {/* Chat List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => item?._id || index.toString()}
            renderItem={renderMessage}
            contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Footer */}
        {chat?.status?.toLowerCase() === "open" ? (
          <View style={[styles.inputWrapper, { backgroundColor: isDark ? themeColors.background : colors.white, borderTopColor: themeColors.border }]}>
            {attachedImage && (
              <View style={styles.attachmentPreviewContainer}>
                <FastImage source={{ uri: attachedImage.uri }} style={styles.attachmentPreview} resizeMode="cover" />
                <TouchableOpacity style={styles.removeAttachmentBtn} onPress={() => setAttachedImage(null)}>
                  <FastImage source={closeIcon} style={{ width: 12, height: 12 }} tintColor={colors.white} resizeMode="contain" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputContainer}>
              <TouchableOpacity onPress={handlePickImage} style={styles.attachBtn}>
                <FastImage source={gallery_ic} style={{ width: 25, height: 25 }} resizeMode="contain" />

              </TouchableOpacity>
              <Input
                placeholder="Type your message..."
                multiline
                mainContainer={{ flex: 1, marginBottom: 0 }}
                value={message}
                onChangeText={setMessage}
                containerStyle={{ borderWidth: 0, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F5F5F7" }}
                inputStyle={{ color: themeColors.text, height: 44, textAlignVertical: 'top', paddingTop: 10 }}
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: themeColors.button, opacity: (message.trim() || attachedImage) ? 1 : 0.6 }]}
                disabled={!message.trim() && !attachedImage}
                onPress={handleTicketMessages}
              >
                <FastImage source={Send_Img} style={{ width: 22, height: 22 }} resizeMode="contain" tintColor={themeColors.buttonText} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.closedFooter, { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }]}>
            <AppText style={{ color: themeColors.secondaryText }} type={ELEVEN}>This ticket is {chat?.status}.</AppText>
          </View>
        )}
      </KeyboardAvoidingView>
    </AppSafeAreaView>
  );
};

export default TicketScreen;

const styles = StyleSheet.create({
  header: {
    width: '100%',
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  copyBtn: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  detailCard: {
    margin: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,

  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailCol: {
    flex: 1,
  },
  cardDivider: {
    height: 1,
    marginVertical: 12,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
    gap: 8,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  supportRow: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    borderBottomRightRadius: 2,
  },
  supportBubble: {
    borderBottomLeftRadius: 2,
  },
  timestamp: {
    marginTop: 4,
    alignSelf: 'flex-end',
    fontSize: 9,
  },
  inputWrapper: {
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'android' ? 12 : 8,
    gap: 10,
  },
  attachBtn: {
    padding: 8,
    marginBottom: 4,
  },
  attachmentPreviewContainer: {
    padding: 12,
    paddingBottom: 0,
    alignSelf: 'flex-start',
    position: 'relative',
  },
  attachmentPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeAttachmentBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 2,
  },
  sendBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  closedFooter: {
    padding: 24,
    alignItems: 'center',
  },
});
