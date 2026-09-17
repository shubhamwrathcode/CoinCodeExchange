import {createSlice} from '@reduxjs/toolkit';
import {languages} from '../helper/languages';
export const initialState = {
  kycData: {},
  userBankData: [],
  languages: languages,
  selectedLanguage: 'en',
};

export const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    setKycData: (state, {payload}) => {
      let oldData = state.kycData;
      oldData[payload.key] = payload.value;
      // state.kycData = {...oldData, payload};
    },
    setUserBankData: (state, {payload}) => {
      state.userBankData = payload;
    },
    setLanguages: (state, {payload}) => {
      state.languages = payload;
    },
    setSelectedLanguage: (state, {payload}) => {
      state.selectedLanguage = payload;
    },
  },
});
export const {setKycData, setUserBankData, setLanguages, setSelectedLanguage} =
  accountSlice.actions;
export const accountReducer = accountSlice.reducer;
