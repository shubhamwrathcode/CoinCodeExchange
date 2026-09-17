import React, { useState, useEffect, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import Modal from 'react-native-modal';
import FastImage from 'react-native-fast-image';
import ImagePicker from 'react-native-image-crop-picker';
import Toast from 'react-native-simple-toast';
import { useTheme } from '../../hooks/useTheme';
import { colors } from '../../theme/colors';
import { AppText, SEMI_BOLD, MEDIUM, FOURTEEN, SIXTEEN } from '../../shared';
import { appOperation } from '../../appOperation';
import { gallery_ic } from '../../helper/ImageAssets';

const { width, height } = Dimensions.get('window');

const PRESET_AVATARS = Array.from({ length: 25 }, (_, i) => {
  const n = i + 1;
  const gender = n <= 12 ? 'male' : 'female';
  return {
    id: `av-${n}`,
    gender,
    src: `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(`agce-avatar-${n}`)}&size=256`,
  };
});

const AVATAR_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

interface EditAvatarModalProps {
  isVisible: boolean;
  onClose: () => void;
  currentAvatarUrl?: string | null;
  onSaved?: () => void;
  onAvatarCommitted?: (path: string | null) => void;
}

const EditAvatarModal = ({ isVisible, onClose, currentAvatarUrl, onSaved, onAvatarCommitted }: EditAvatarModalProps) => {
  const { colors: themeColors, isDark } = useTheme();

  const [pickerTab, setPickerTab] = useState<'gallery' | 'upload'>('gallery');
  const [filter, setFilter] = useState<'all' | 'male' | 'female'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [uploadFile, setUploadFile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [nextAllowedAt, setNextAllowedAt] = useState<Date | null>(null);
  const [timerText, setTimerText] = useState<string>('');

  useEffect(() => {
    const loadNextAllowedAt = async () => {
      try {
        // First try to load from local storage
        const stored = await AsyncStorage.getItem('avatar_next_allowed_at');
        if (stored) {
          const date = new Date(stored);
          if (date > new Date()) {
            setNextAllowedAt(date);
          } else {
            await AsyncStorage.removeItem('avatar_next_allowed_at');
          }
        }

        // Then query the server just in case the user cleared app data
        const res: any = await appOperation.customer.get_avatar_setting();
        if (res?.data?.next_allowed_at) {
          const serverDate = new Date(res.data.next_allowed_at);
          if (serverDate > new Date()) {
            setNextAllowedAt(serverDate);
            AsyncStorage.setItem('avatar_next_allowed_at', serverDate.toISOString());
          }
        }
      } catch (e) { }
    };
    if (isVisible) {
      loadNextAllowedAt();
    }
  }, [isVisible]);

  useEffect(() => {
    if (!nextAllowedAt) {
      setTimerText('');
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const diffMs = nextAllowedAt.getTime() - now.getTime();
      if (diffMs <= 0) {
        setNextAllowedAt(null);
        setTimerText('');
        AsyncStorage.removeItem('avatar_next_allowed_at');
        return;
      }

      const totalMins = Math.floor(diffMs / 60000);
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      setTimerText(`Try again in ${h}h ${m}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);

    return () => clearInterval(interval);
  }, [nextAllowedAt]);

  useEffect(() => {
    if (isVisible) {
      const match = PRESET_AVATARS.find((a) => a.src === currentAvatarUrl);
      setSelectedId(match?.id || PRESET_AVATARS[0].id);
      setFilter('all');
      setPickerTab('gallery');
      setUploadFile(null);
    }
  }, [isVisible, currentAvatarUrl]);

  const list = useMemo(() => {
    if (filter === 'male') return PRESET_AVATARS.filter((a) => a.gender === 'male');
    if (filter === 'female') return PRESET_AVATARS.filter((a) => a.gender === 'female');
    return PRESET_AVATARS;
  }, [filter]);

  const selected = PRESET_AVATARS.find((a) => a.id === selectedId) || PRESET_AVATARS[0];
  const presetChanged = selected && selected.src !== currentAvatarUrl;
  const uploadReady = Boolean(uploadFile);
  const canSave = (pickerTab === 'gallery' && presetChanged) || (pickerTab === 'upload' && uploadReady);

  const handlePickImage = async () => {
    try {
      const image = await ImagePicker.openPicker({
        width: 300,
        height: 300,
        cropping: true,
        mediaType: 'photo',
      });

      if (image.size > AVATAR_UPLOAD_MAX_BYTES) {
        Toast.showWithGravity(`Image must be ${AVATAR_UPLOAD_MAX_BYTES / (1024 * 1024)} MB or smaller.`, Toast.LONG, Toast.BOTTOM);
        return;
      }
      setUploadFile(image);
    } catch (e: any) {
      if (e.message !== 'User cancelled image selection') {
        Toast.showWithGravity('Failed to pick image', Toast.SHORT, Toast.BOTTOM);
      }
    }
  };

  const handleSave = async () => {
    if (!canSave) return;

    setLoading(true);
    try {
      const fd = new FormData();

      if (pickerTab === 'upload' && uploadFile) {
        const pathParts = uploadFile.path.split('/');
        const fileName = pathParts[pathParts.length - 1] || 'avatar.jpg';

        fd.append('profilepicture', {
          uri: uploadFile.path,
          type: uploadFile.mime || 'image/jpeg',
          name: fileName,
        } as any);
      } else {
        // Fetch preset avatar blob
        const imgRes = await fetch(selected.src);
        if (!imgRes.ok) throw new Error('Could not load the selected avatar');
        const blob = await imgRes.blob();

        // React Native FormData trick for blobs from fetch
        const fileReader = new FileReader();
        fileReader.readAsDataURL(blob);
        await new Promise((resolve) => {
          fileReader.onloadend = resolve;
        });
        const base64data = fileReader.result as string;

        // It's often easier to just pass the image URI directly if possible, or construct a pseudo-file
        // In React Native, sending base64 or a local file path is easier. 
        // We will just send the URL as a fallback if the API supports it, but since it expects a file:
        // We might need rn-fetch-blob or just pass the data URI.
        // Let's create a temporary file or pass it directly.
        // Actually, the appOperation may handle base64 or file URIs. We will use the selected.src directly if the server allows it? 
        // No, server expects a file. We will use a standard RN approach for remote images:
        fd.append('profilepicture', {
          uri: selected.src,
          type: 'image/png',
          name: 'avatar.png',
        } as any);
      }

      console.log(fd, '====FD');


      const result: any = await appOperation.customer.change_avatar_setting(fd);
      console.log('Avatar upload response:', JSON.stringify(result, null, 2));

      // Handle the 24-hour rate limit explicitly
      if (result?.data?.next_allowed_at || result?.message?.toLowerCase().includes('once a day')) {
        const nextDateStr = result?.data?.next_allowed_at;
        const nextDate = nextDateStr ? new Date(nextDateStr) : new Date(Date.now() + 24 * 60 * 60 * 1000);
        setNextAllowedAt(nextDate);
        AsyncStorage.setItem('avatar_next_allowed_at', nextDate.toISOString());
        Toast.showWithGravity(result?.message || 'Avatar can only be changed once a day.', Toast.LONG, Toast.BOTTOM);
        setLoading(false);
        return;
      }

      if (result?.success === true) {
        Toast.showWithGravity(result?.message || 'Avatar updated.', Toast.SHORT, Toast.BOTTOM);
        let rel = String(result?.data?.avatar || result?.data?.data?.avatar || "").trim();

        let finalDisplay = rel;
        // If the server returns a relative path or no path, we'll use our local image as a fallback so it updates immediately
        if (!finalDisplay || !finalDisplay.startsWith('http')) {
          if (pickerTab === 'upload' && uploadFile) {
            finalDisplay = uploadFile.path;
          } else {
            finalDisplay = selected.src;
          }
        }

        onAvatarCommitted?.(finalDisplay || null);
        onSaved?.();
        onClose();
      } else {
        Toast.showWithGravity(result?.message || 'Could not update avatar.', Toast.LONG, Toast.BOTTOM);
        onClose();
      }
    } catch (e: any) {
      console.log('Avatar upload error:', e);
      Toast.showWithGravity(e?.message || e?.error || 'Could not update avatar.', Toast.LONG, Toast.BOTTOM);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modal}
      backdropOpacity={0.5}
      useNativeDriver
      hideModalContentWhileAnimating
    >
      <View style={[styles.container, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
        {/* Header */}
        <View style={styles.header}>
          <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: themeColors.text, fontSize: 18 }}>
            Edit Avatar
          </AppText>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <AppText weight={MEDIUM} style={{ color: themeColors.secondaryText, fontSize: 24, lineHeight: 26 }}>×</AppText>
          </TouchableOpacity>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <AppText style={styles.infoText}>
            Choose a gallery avatar or upload JPG, PNG, GIF, or WebP (max 5 MB). If you use an NFT avatar and transfer it out, your profile may fall back to a default image.
          </AppText>
        </View>

        {/* Main Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.mainTab, pickerTab === 'gallery' && { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
            onPress={() => setPickerTab('gallery')}
          >
            <AppText weight={SEMI_BOLD} style={{ color: pickerTab === 'gallery' ? themeColors.text : themeColors.secondaryText }}>
              Gallery
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mainTab, pickerTab === 'upload' && { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
            onPress={() => setPickerTab('upload')}
          >
            <AppText weight={SEMI_BOLD} style={{ color: pickerTab === 'upload' ? themeColors.text : themeColors.secondaryText }}>
              Upload
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {pickerTab === 'gallery' ? (
          <View style={{ flex: 1 }}>
            {/* Sub Tabs */}
            <View style={styles.subTabContainer}>
              {['all', 'male', 'female'].map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.subTab, filter === key && { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA' }]}
                  onPress={() => setFilter(key as any)}
                >
                  <AppText style={{ color: filter === key ? themeColors.text : themeColors.secondaryText, textTransform: 'capitalize' }}>
                    {key}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>

            {/* Grid */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.gridContainer}>
              {list.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={[
                    styles.avatarCell,
                    selectedId === a.id && { borderColor: colors.cyanTheme, borderWidth: 2 }
                  ]}
                  onPress={() => setSelectedId(a.id)}
                >
                  <FastImage
                    source={{ uri: a.src }}
                    style={styles.avatarImage}
                    resizeMode={FastImage.resizeMode.contain}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.uploadContainer}>
            <TouchableOpacity style={styles.uploadZone} onPress={handlePickImage}>
              {uploadFile ? (
                <FastImage source={{ uri: uploadFile.path }} style={styles.uploadPreview} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <FastImage source={gallery_ic} style={{ width: 50, height: 50 }} resizeMode='contain' />
                  <AppText weight={SEMI_BOLD} style={{ color: themeColors.text, marginTop: 10 }}>Tap to choose an image</AppText>
                  <AppText style={{ color: themeColors.secondaryText, fontSize: 12, textAlign: 'center' }}>
                    JPG, PNG, GIF, or WebP · max 5 MB
                  </AppText>
                </View>
              )}
            </TouchableOpacity>
            {uploadFile && (
              <TouchableOpacity onPress={() => setUploadFile(null)} style={{ marginTop: 15 }}>
                <AppText style={{ color: colors.red }}>Remove file</AppText>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.footerBtn, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]} onPress={onClose}>
            <AppText weight={SEMI_BOLD} style={{ color: themeColors.text, fontSize: 15 }}>Cancel</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: canSave && !nextAllowedAt ? (isDark ? colors.white : colors.black) : (isDark ? '#3A3A3C' : '#D1D1D6') }]}
            onPress={handleSave}
            disabled={!canSave || loading || !!nextAllowedAt}
          >
            {loading ? (
              <ActivityIndicator color={isDark ? colors.black : colors.white} />
            ) : nextAllowedAt ? (
              <AppText weight={SEMI_BOLD} style={{ color: isDark ? colors.black : colors.white, fontSize: 13, textAlign: 'center' }}>{timerText}</AppText>
            ) : (
              <AppText weight={SEMI_BOLD} style={{ color: isDark ? colors.black : colors.white, fontSize: 15 }}>Save</AppText>
            )}
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
};

export default EditAvatarModal;

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  container: {
    height: height * 0.85,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoBanner: {
    backgroundColor: '#F7EBDD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    color: '#8C6C42',
    fontSize: 13,
    lineHeight: 18,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  mainTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
  },
  subTabContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  subTab: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginRight: 10,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  avatarCell: {
    width: (width - 40 - 30) / 4, // 4 items per row, accounting for padding/margins
    height: (width - 40 - 30) / 4,
    borderRadius: 50,
    marginBottom: 15,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '90%',
    height: '100%',

    marginTop: 10
  },
  uploadContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadZone: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#D1D1D6',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  uploadPreview: {
    width: '100%',
    height: '100%',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    padding: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  footerBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
});
