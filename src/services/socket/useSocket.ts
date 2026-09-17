import { useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { socketService } from './SocketService';
import { useAppDispatch } from '../../store/hooks';
import { setSocket, setCoinData, setSocketLoading, setRandom } from '../../slices/homeSlice';

/**
 * Custom hook for main socket connection
 * Prevents re-renders by using refs and singleton service
 */
export const useSocket = () => {
  const dispatch = useAppDispatch();
  const isInitializedRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize socket connection once
  useEffect(() => {
    if (!isInitializedRef.current) {
      const socket = socketService.connect();
      
      // Handle connection
      const handleConnect = () => {
        dispatch(setSocket(socket));
        dispatch(setRandom(Math.random()));
      };

      // Handle messages
      const handleMessage = (res: any) => {
        dispatch(setCoinData(res));
        dispatch(setSocketLoading(false));
      };

      socketService.onConnect(handleConnect);
      socketService.on('message', handleMessage);

      isInitializedRef.current = true;

      return () => {
        socketService.offConnect(handleConnect);
        socketService.off('message', handleMessage);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [dispatch]);

  /**
   * Emit message with optional interval
   */
  const emit = useCallback((event: string, data?: any) => {
    socketService.emit(event, data);
  }, []);

  /**
   * Start periodic emit
   */
  const startEmit = useCallback((delay: number, event: string = 'message', payload?: any) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      socketService.emit(event, payload || { message: 'market' });
    }, delay);
  }, []);

  /**
   * Stop periodic emit
   */
  const stopEmit = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Subscribe to event
   */
  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    socketService.on(event, callback);
  }, []);

  /**
   * Unsubscribe from event
   */
  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    socketService.off(event, callback);
  }, []);

  return {
    socket: socketService.getSocket(),
    isConnected: socketService.getIsConnected(),
    emit,
    startEmit,
    stopEmit,
    on,
    off,
  };
};

export default useSocket;
