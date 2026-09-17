import {accountReducer} from './../slices/accountSlice';
import {combineReducers} from '@reduxjs/toolkit';
import {authReducer} from '../slices/authSlice';
import {homeReducer} from '../slices/homeSlice';
import {walletReducer} from '../slices/walletSlice';


const rootReducer = combineReducers({
  auth: authReducer,
  home: homeReducer,
  account: accountReducer,
  wallet: walletReducer,
});

export default rootReducer;
