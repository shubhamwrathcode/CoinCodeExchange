import React from 'react';
import { View, FlatList, TouchableOpacity } from 'react-native';
import { useFuturesSocket } from './useFuturesSocket';
import { OrderBookAskRow, OrderBookBidRow, OrderBookSkeleton } from './OrderBookRows'; // we need to move these

// Let's first verify what we need to move out
