import React, {ReactNode, useEffect, useRef, useMemo} from 'react';
import {RootState} from './store/store';
import {useAppDispatch, useAppSelector} from './store/hooks';
import {
  setCoinData,
  setSocketLoading,
  setFuturesPairs,
} from './slices/homeSlice';
import {socketService} from './services/socket/SocketService';

interface EventComponentProps {
  children: ReactNode;
  store: RootState;
}

const SocketComponent = React.memo(({children}: EventComponentProps) => {
  const dispatch = useAppDispatch();
  const coinData = useAppSelector(state => state.home.coinData);
  const isInitializedRef = useRef(false);

  // Memoize coinData length to prevent unnecessary re-renders
  const coinDataLength = useMemo(() => coinData?.length || 0, [coinData?.length]);

  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // ✅ Use centralized socket service instead of creating new connection
    const socket = socketService.connect();

    // ✅ Handle connection - already handled in SocketProvider
    // Just ensure initial market data is requested
    const handleConnect = () => {
      if (coinDataLength === 0) {
        socketService.emit('message', {message: 'market'});
      }
    };

    // ✅ Handle incoming messages with debouncing
    let updateTimeout: NodeJS.Timeout;
    const handleMessage = (res: any) => {
      // Clear previous timeout to debounce rapid updates
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      
      // Update after a short delay to batch rapid updates
      updateTimeout = setTimeout(() => {
        dispatch(setCoinData(res));
        
        // Ensure futures pairs are also extracted from the initial market message
        const futuresList = res?.futures_pairs ?? res?.futuresPairs ?? null;
        if (futuresList != null && Array.isArray(futuresList)) {
          dispatch(setFuturesPairs(futuresList));
        }

        dispatch(setSocketLoading(false));
      }, 50);
    };

    // Register handlers
    socketService.onConnect(handleConnect);
    socketService.on('message', handleMessage);

    // Initial request if data is empty
    if (coinDataLength === 0 && socket?.connected) {
      socketService.emit('message', {message: 'market'});
    }

    return () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      socketService.offConnect(handleConnect);
      socketService.off('message', handleMessage);
    };
  }, []); // Empty deps - only run once

  // ✅ Request market data only when coinData becomes empty (not on every render)
  useEffect(() => {
    if (coinDataLength === 0 && socketService.getIsConnected()) {
      socketService.emit('message', {message: 'market'});
    }
  }, [coinDataLength]);

  return <>{children}</>;
});

SocketComponent.displayName = 'SocketComponent';

export default SocketComponent;
