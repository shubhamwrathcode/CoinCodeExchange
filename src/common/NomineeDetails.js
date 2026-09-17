import React, { useState } from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import {
  AppText,
  SEMI_BOLD,
  SIXTEEN,
  FOURTEEN,
} from "./AppText";
import { Input } from "./Input";
import { colors } from "../theme/colors";
import KeyBoardAware from "./KeyboardAware";
import { useDispatch } from "react-redux";
import { editNominee } from "../actions/accountActions";
import FastImage from "react-native-fast-image";
import { closeIcon } from "../helper/ImageAssets";
import CustomDropdown from "./CustomDropdown";

const NomineeDetails = ({
  onCloseNominee,
  nomineeName,
  setNomineeName,
  nomineeRel,
  setNomineeRel,
}) => {
  const dispatch = useDispatch();

  const handleChangeNominee = () => {
    let data = {
      nomineeName: nomineeName,
      nomineeRelation: nomineeRel,
    };
    dispatch(editNominee(data, onCloseNominee));
  };

  return (
    <View style={styles.sheetContainer}>
      <KeyBoardAware 
        style={styles.keyboardAware} 
        containerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <AppText weight={SEMI_BOLD} type={SIXTEEN} style={{ color: colors.white }}>Edit Nominee Details</AppText>
          <TouchableOpacity onPress={onCloseNominee} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <FastImage source={closeIcon} style={styles.closeBtn} tintColor={colors.white} resizeMode="contain" />
          </TouchableOpacity>
        </View>

        <View style={styles.formContent}>
          <Input
            title="Nominee Name"
            placeholder="Enter Nominee Name"
            mainContainer={styles.inputMain}
            containerStyle={styles.inputContainer}
            value={nomineeName}
            onChangeText={setNomineeName}
          />

          <AppText weight={SEMI_BOLD} style={styles.label}>Relation</AppText>
          <CustomDropdown
            selected={nomineeRel}
            data={["Father", "Mother", "Spouse", "Son", 'Daughter', 'Brother', 'Sister', 'Friend', 'Other']}
            onSelect={setNomineeRel}
          />
        </View>

        <TouchableOpacity 
          style={styles.submitBtn} 
          onPress={handleChangeNominee}
          activeOpacity={0.8}
        >
          <AppText weight={SEMI_BOLD} type={FOURTEEN} style={{ color: colors.black }}>Submit</AppText>
        </TouchableOpacity>
      </KeyBoardAware>
    </View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    flex: 1,
    backgroundColor: colors.newThemeColor,
  },
  keyboardAware: {
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  closeBtn: {
    width: 22,
    height: 22,
  },
  formContent: {
    marginBottom: 10,
  },
  inputMain: {
    marginBottom: 20,
  },
  inputContainer: {
    backgroundColor: '#2b3139',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  label: {
    color: colors.white,
    marginBottom: 8,
  },
  submitBtn: {
    marginTop: 30,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default NomineeDetails;
