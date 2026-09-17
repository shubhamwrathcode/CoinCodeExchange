import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Alert, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../hooks/useTheme';
import NavigationService from '../../../navigation/NavigationService';
import * as routes from '../../../navigation/routes';
import FastImage from 'react-native-fast-image';
import {
  AppSafeAreaView,
  AppText,
  BOLD,
  FOURTEEN,
  SIXTEEN,
  SEMI_BOLD,
  TWELVE,
  EIGHTEEN,
  TWENTY_TWO,
  THIRTEEN,
  MEDIUM,
} from '../../../shared';
import { back_ic, emergency_vector_light, emergencyContact as emergencyImg, profileNewIcon } from '../../../helper/ImageAssets';
import { colors } from '../../../theme/colors';
import { appOperation } from '../../../appOperation';
import { showError, showSuccess } from '../../../helper/logger';

const EmergencyContactMain = () => {
  const { colors: themeColors, isDark } = useTheme();
  const route = useRoute();
  const navigation = useNavigation();

  const [contacts, setContacts] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [messageDrafts, setMessageDrafts] = useState({});
  const [saveMsgBusyId, setSaveMsgBusyId] = useState(null);
  const [deleteBusyId, setDeleteBusyId] = useState(null);

  const fetchContacts = useCallback(async (silent = false) => {
    if (!silent) setListLoading(true);
    try {
      const result = await appOperation.customer.getEmergencyContactList();
      if (result?.success) {
        const list = Array.isArray(result.data) ? result.data : [];
        setContacts(list);

        const drafts = {};
        list.forEach((c) => {
          drafts[String(c._id)] = c.message != null ? String(c.message) : '';
        });
        setMessageDrafts(drafts);
      } else {
        showError(result?.message || 'Could not load emergency contacts.');
      }
    } catch (err) {
      showError(err?.message || 'Could not load emergency contacts.');
    } finally {
      setListLoading(false);
    }
  }, []);

  // Fetch contacts on mount
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Handle returned params from SecurityVerification
  useEffect(() => {
    const handleParamsTrigger = async () => {
      if (route.params?.executeDelete) {
        const { contactId, emailOtp, smsOtp, tofaCode, passkeyCredential } = route.params;
        // Clean params immediately
        navigation.setParams({ executeDelete: undefined });

        setDeleteBusyId(contactId);
        try {
          const type = emailOtp ? 'email' : (smsOtp ? 'phone' : (tofaCode ? 'totp' : 'passkey'));
          const code = emailOtp || smsOtp || tofaCode || '';
          const credential = passkeyCredential;

          const res = await appOperation.customer.deleteEmergencyContact({
            contactId,
            type,
            code,
            credential,
          });

          if (res?.success) {
            showSuccess(res.message || 'Emergency contact removed.');
            fetchContacts();
          } else {
            showError(res?.message || 'Failed to remove contact.');
          }
        } catch (err) {
          showError(err?.message || 'Failed to remove contact.');
        } finally {
          setDeleteBusyId(null);
        }
      }

      if (route.params?.executeSaveMessage) {
        const { contactId, message, emailOtp, smsOtp, tofaCode, passkeyCredential } = route.params;
        // Clean params immediately
        navigation.setParams({ executeSaveMessage: undefined });

        setSaveMsgBusyId(contactId);
        try {
          const type = emailOtp ? 'email' : (smsOtp ? 'phone' : (tofaCode ? 'totp' : 'passkey'));
          const code = emailOtp || smsOtp || tofaCode || '';
          const credential = passkeyCredential;

          const res = await appOperation.customer.saveEmergencyContactMessage({
            contactId,
            message,
            type,
            code,
            credential,
          });

          if (res?.success) {
            showSuccess(res.message || 'Message saved.');
            fetchContacts();
          } else {
            showError(res?.message || 'Failed to save message.');
          }
        } catch (err) {
          showError(err?.message || 'Failed to save message.');
        } finally {
          setSaveMsgBusyId(null);
        }
      }

      if (route.params?.reload) {
        navigation.setParams({ reload: undefined });
        fetchContacts();
      }
    };

    handleParamsTrigger();
  }, [route.params, fetchContacts, navigation]);

  const handleEdit = (contact) => {
    NavigationService.navigate(routes.ADD_EMERGENCY_CONTACT_SCREEN, {
      contact,
    });
  };

  const handleDelete = (contact) => {
    const id = contact._id;
    Alert.alert(
      'Remove Emergency Contact',
      `Are you sure you want to remove ${contact.fullName || 'this emergency contact'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            NavigationService.navigate(routes.PASSKEY_SECURITY_VERIFICATION_SCREEN, {
              targetScreen: routes.EMERGENCY_CONTACT_SCREEN,
              skipDirectVerification: true,
              returnRawCredential: true,
              purpose: 'security_verification',
              targetParams: {
                executeDelete: true,
                contactId: id,
              },
            });
          },
        },
      ]
    );
  };

  const handleSaveMessage = (contactId) => {
    const message = messageDrafts[contactId] || '';
    NavigationService.navigate(routes.PASSKEY_SECURITY_VERIFICATION_SCREEN, {
      targetScreen: routes.EMERGENCY_CONTACT_SCREEN,
      skipDirectVerification: true,
      returnRawCredential: true,
      purpose: 'security_verification',
      targetParams: {
        executeSaveMessage: true,
        contactId,
        message,
      },
    });
  };

  const updateMessageDraft = (id, value) => {
    setMessageDrafts((prev) => ({ ...prev, [String(id)]: value }));
  };

  const handleAddOrChange = () => {
    if (contacts.length >= 5) {
      showError('You can add up to 5 emergency contacts only.');
      return;
    }
    NavigationService.navigate(routes.ADD_EMERGENCY_CONTACT_SCREEN);
  };

  return (
    <AppSafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* Header matching mockup */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => NavigationService.goBack()}>
          <FastImage
            source={back_ic}
            tintColor={isDark ? colors.white : colors.black}
            style={{ width: 20, height: 20 }}
            resizeMode='contain'
          />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {listLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={isDark ? '#FFFFFF' : '#000000'} />
          </View>
        ) : contacts.length === 0 ? (
          <ScrollView contentContainerStyle={styles.setupContainer}>
            <View style={styles.illustrationContainer}>
              <FastImage
                source={isDark ? emergency_vector_light : emergencyImg}
                style={styles.illustration}
                resizeMode='contain'
              />
            </View>

            <AppText
              type={TWENTY_TWO}
              weight={SEMI_BOLD}
              style={[styles.mainTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}
            >
              Emergency Contact
            </AppText>

            <AppText
              type={TWELVE}
              weight={MEDIUM}
              style={[styles.mainSubtitle, { color: themeColors.secondaryText }]}
            >
              Coincode, the security of your digital assets remains our highest priority. The Emergency Contact feature is designed to help protect your account by allowing us to send email and SMS notifications to you and your trusted contacts if your account becomes inactive for an extended period. Your selected emergency contacts may also request account access support or initiate an inheritance claim process when necessary.
            </AppText>
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            <AppText
              type={TWENTY_TWO}
              weight={SEMI_BOLD}
              style={[styles.listTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}
            >
              Emergency Contacts
            </AppText>
            <AppText
              type={TWELVE}
              weight={MEDIUM}
              style={[styles.listSubtitle, { color: themeColors.secondaryText, marginBottom: 16 }]}
            >
              Configure up to 5 emergency contacts. You can save optional messages for each contact.
            </AppText>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {contacts.map((contact) => (
                <View
                  key={contact._id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: themeColors.input,
                      borderColor: themeColors.border,
                      marginBottom: 16,
                    },
                  ]}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.userInfoContainer}>
                      <FastImage
                        source={profileNewIcon}
                        style={styles.userIcon}
                        tintColor={isDark ? '#FFFFFF' : '#000000'}
                        resizeMode="contain"
                      />
                      <View style={{ flex: 1 }}>
                        <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: themeColors.text }}>
                          {contact.fullName}
                        </AppText>
                        <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 2 }}>
                          {contact.emailId}
                        </AppText>
                        <AppText type={TWELVE} style={{ color: themeColors.secondaryText, marginTop: 2 }}>
                          {contact.mobileNumber}
                        </AppText>
                      </View>
                    </View>

                    <View style={styles.actionButtonsContainer}>
                      <TouchableOpacity
                        onPress={() => handleEdit(contact)}
                        style={[
                          styles.editBtn,
                          { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }
                        ]}
                      >
                        <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: themeColors.text }}>
                          Edit
                        </AppText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(contact)}
                        style={[
                          styles.removeBtn,
                          {
                            backgroundColor: isDark ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 59, 48, 0.08)',
                            marginLeft: 8,
                          }
                        ]}
                        disabled={deleteBusyId === contact._id}
                      >
                        <AppText type={FOURTEEN} weight={MEDIUM} style={{ color: '#FF3B30' }}>
                          {deleteBusyId === contact._id ? 'Removing...' : 'Remove'}
                        </AppText>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={[styles.dividerLine, { backgroundColor: themeColors.border, marginVertical: 12 }]} />

                  <AppText type={TWELVE} weight={MEDIUM} style={{ color: themeColors.secondaryText, marginBottom: 6 }}>
                    Message (optional)
                  </AppText>
                  <TextInput
                    style={[
                      styles.messageInput,
                      {
                        backgroundColor: themeColors.input,
                        color: themeColors.text,
                        borderColor: isDark ? 'transparent' : '#E5E5EA',
                        borderWidth: isDark ? 0 : 1,
                      },
                    ]}
                    multiline
                    numberOfLines={3}
                    value={messageDrafts[contact._id] ?? ''}
                    onChangeText={(val) => updateMessageDraft(contact._id, val)}
                    placeholder="Notes or instructions for this contact"
                    placeholderTextColor="#8A8A93"
                  />
                  <View style={{ alignItems: 'flex-end', marginTop: 8 }}>
                    <TouchableOpacity
                      style={[
                        styles.saveMsgBtn,
                        {
                          backgroundColor: isDark ? '#FFFFFF' : '#2A2A2E',
                          opacity: saveMsgBusyId === contact._id ? 0.6 : 1,
                        },
                      ]}
                      disabled={saveMsgBusyId === contact._id}
                      onPress={() => handleSaveMessage(contact._id)}
                    >
                      <AppText type={TWELVE} weight={SEMI_BOLD} style={{ color: isDark ? '#000000' : '#FFFFFF' }}>
                        {saveMsgBusyId === contact._id ? 'Saving...' : 'Save message'}
                      </AppText>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Footer Buttons */}
      {(!listLoading && contacts.length < 5) && (
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: isDark ? '#FFFFFF' : '#2A2A2E' }]}
            activeOpacity={0.8}
            onPress={handleAddOrChange}
          >
            <AppText type={SIXTEEN} weight={SEMI_BOLD} style={{ color: isDark ? '#000000' : '#FFFFFF' }}>
              Add Emergency Contact
            </AppText>
          </TouchableOpacity>
        </View>
      )}
    </AppSafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: Platform.OS === 'ios' ? 44 : 56,
  },
  headerBtn: {
    padding: 4,
    marginLeft: -8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupContainer: {
    flexGrow: 1,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  illustration: {
    width: 150,
    height: 150,
  },
  mainTitle: {
    textAlign: 'left',
    fontSize: 24,
    marginBottom: 10,
  },
  mainSubtitle: {
    textAlign: 'left',
    lineHeight: 20,
  },
  listTitle: {
    textAlign: 'left',
    fontSize: 24,
    marginBottom: 4,
  },
  listSubtitle: {
    textAlign: 'left',
    lineHeight: 18,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 15,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    paddingRight: 10,
  },
  userIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
    marginTop: 2,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerLine: {
    height: 1,
  },
  messageInput: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  saveMsgBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomContainer: {
    paddingHorizontal: 15,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingTop: 16,
  },
  actionBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default EmergencyContactMain;

