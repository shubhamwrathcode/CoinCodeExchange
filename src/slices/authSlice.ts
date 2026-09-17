import { createSlice } from '@reduxjs/toolkit';

export type Pending2FA = {
  loginSignId: string;
  availableMethods: any[];
  defaultMethod: number;
  data: any;
  challengeId?: string;
  tempToken?: string;
  verificationMode?: string;
  completedMethods?: number[];
  remainingMethods?: any[];
  verifySubStep?: 'methods' | 'code';
  /** Method the user explicitly tapped on the methods list / switch sheet */
  activeMethod?: number;
  /** Login 2-step methods that can be recovered (totp | email | phone) */
  recoverableMethods?: string[];
} | null;

export const initialState = {
  isLoading: false,
  /** 'otp' = Get OTP / Send OTP (don't show loader on primary buttons), 'primary' | null = show on buttons */
  loadingFor: null as 'primary' | 'otp' | null,
  userData: undefined,
  theme: 'Dark',
  appVersion: '',
  /** When set, Login screen shows 2FA verification modals (web-style) instead of navigating to EnterOtp */
  pending2FA: null as Pending2FA,
  /** Tracks if passkey was attempted and cancelled */
  passkeyCancelled: false,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, { payload }) => {
      state.isLoading = !!payload;
      state.loadingFor = payload ? 'primary' : null;
    },
    setLoadingOtp: (state, { payload }) => {
      state.isLoading = !!payload;
      state.loadingFor = payload ? 'otp' : null;
    },
    setUserData: (state, { payload }) => {
      state.userData = payload;
    },
    setTheme: (state, { payload }) => {
      state.theme = payload;
    },
    setAppVersion: (state, { payload }) => {
      state.appVersion = payload;
    },
    setPending2FA: (state, { payload }: { payload: Pending2FA }) => {
      state.pending2FA = payload;
    },
    updatePending2FA: (state, { payload }: { payload: Partial<NonNullable<Pending2FA>> }) => {
      if (state.pending2FA) {
        state.pending2FA = { ...state.pending2FA, ...payload };
      }
    },
    clearPending2FA: (state) => {
      state.pending2FA = null;
    },
    setPasskeyCancelled: (state, { payload }) => {
      state.passkeyCancelled = !!payload;
    },
  },
});
export const { setLoading, setLoadingOtp, setUserData, setTheme, setAppVersion, setPending2FA, updatePending2FA, clearPending2FA, setPasskeyCancelled } = authSlice.actions;
// export const authSelector = state => state.auth;
export const authReducer = authSlice.reducer;
