import React, { createContext, useEffect, useMemo, useRef } from 'react';
import { useAppSelector } from '../../store/hooks';
import { futureSocketService } from '../../services/socket/FutureSocketService';

export const FutureSocketContext = createContext();

const FutureSocketContextProvider = ({ children }) => {
  const isInitializedRef = useRef(false);
  const token = useAppSelector((state) => state.auth.token);

  useEffect(() => {
    if (token) {
      // If token exists, ensure we are connected with it
      // console.log("🔌 FutureSocket: Connecting with token...");
      futureSocketService.disconnect(); // Disconnect existing (possibly unauth) connection
      futureSocketService.connect(undefined, token);
    } else {
      // If no token, maybe connect anonymously or just initial connect
      // console.log("🔌 FutureSocket: Connecting without token...");
      futureSocketService.connect(undefined, undefined);
    }

    // isInitializedRef.current = true; // No longer needed as we rely on token dependency
  }, [token]);

  // Memoize context value (this might still return the same socket object reference if the service reuses it, 
  // but disconnect/connect creates a new socket instance in the service usually?
  // Let's check FutureSocketService.ts. It assigns this.socket = io(...). So it is a new instance.
  // We need to make sure context value updates.

  const socket = futureSocketService.getSocket();

  const contextValue = useMemo(() => ({
    socket: futureSocketService.getSocket(),
  }), [token, socket]); // Depend on socket if possible, or just token triggering re-render

  return (
    <FutureSocketContext.Provider value={contextValue}>
      {children}
    </FutureSocketContext.Provider>
  );
};

export default FutureSocketContextProvider;
