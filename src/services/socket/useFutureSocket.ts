import { useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { futureSocketService } from './FutureSocketService';

/**
 * Custom hook for futures socket connection
 * Prevents re-renders by using refs and singleton service
 */
export const useFutureSocket = () => {
  const isInitializedRef = useRef(false);

  // Initialize futures socket connection once
  useEffect(() => {
    if (!isInitializedRef.current) {
      futureSocketService.connect();
      isInitializedRef.current = true;
    }
  }, []);

  /**
   * Emit message
   */
  const emit = useCallback((event: string, data?: any) => {
    futureSocketService.emit(event, data);
  }, []);

  /**
   * Subscribe to event
   */
  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    futureSocketService.on(event, callback);
  }, []);

  /**
   * Unsubscribe from event
   */
  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    futureSocketService.off(event, callback);
  }, []);

  return {
    socket: futureSocketService.getSocket(),
    isConnected: futureSocketService.getIsConnected(),
    emit,
    on,
    off,
  };
};

export default useFutureSocket;
