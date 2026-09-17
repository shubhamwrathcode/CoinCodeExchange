import { io, Socket } from 'socket.io-client';
import { BASE_URL } from '../../helper/Constants';

type EventCallback = (...args: any[]) => void;
type EventMap = {
  [event: string]: EventCallback[];
};

/**
 * Centralized Socket Service
 * Manages single socket instance to prevent multiple connections and re-renders
 */
class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private eventListeners: EventMap = {};
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private connectionCallbacks: Array<() => void> = [];
  private disconnectionCallbacks: Array<() => void> = [];

  /**
   * Initialize socket connection.
   * Pass authToken (e.g. from AsyncStorage) so backend sends user-specific open_orders & executed_order (like web).
   */
  connect(url?: string, authToken?: string | null): Socket {
    if (this.socket) {
      return this.socket;
    }

    // Use provided URL or default BASE_URL, remove trailing slash
    const socketUrl = (url || BASE_URL).replace(/\/$/, '');

    this.socket = io(socketUrl, {
      transports: ['websocket'],
      reconnection: false, // Manual reconnection
      timeout: 5000,
      upgrade: false,
      rejectUnauthorized: false,
      auth: authToken ? { token: authToken } : undefined,
    });

    this.setupEventHandlers();

    // Re-attach any listeners that were registered before (e.g. after reconnectWithToken)
    Object.keys(this.eventListeners).forEach((event) => {
      this.eventListeners[event].forEach((cb) => {
        this.socket?.on(event, cb);
      });
    });

    return this.socket;
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Execute all connection callbacks
      this.connectionCallbacks.forEach(callback => callback());
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;

      // Execute all disconnection callbacks
      this.disconnectionCallbacks.forEach(callback => callback());

      // Attempt reconnection if not manually disconnected
      if (reason !== 'io client disconnect') {
        this.attemptReconnect();
      }
    });

    this.socket.on('connect_error', () => {
      this.isConnected = false;
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = Math.min(2000 * this.reconnectAttempts, 10000);
    this.reconnectAttempts += 1;

    this.reconnectTimeout = setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    }, delay);
  }

  /**
   * Disconnect socket. Keeps eventListeners so reconnect can re-attach them.
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.reconnectAttempts = 0;
    }
  }

  /**
   * Reconnect with new auth token (e.g. after login) so backend sends open_orders & executed_order.
   * Re-attaches existing event listeners to the new socket.
   */
  reconnectWithToken(authToken: string | null): Socket {
    this.disconnect();
    return this.connect(undefined, authToken ?? undefined);
  }

  /**
   * Emit event to server
   */
  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  /**
   * Subscribe to socket event
   */
  on(event: string, callback: EventCallback): void {
    if (!this.socket) {
      return;
    }

    // Store callback for cleanup
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);

    this.socket.on(event, callback);
  }

  /**
   * Unsubscribe from socket event
   */
  off(event: string, callback?: EventCallback): void {
    if (!this.socket) return;

    if (callback) {
      this.socket.off(event, callback);
      if (this.eventListeners[event]) {
        this.eventListeners[event] = this.eventListeners[event].filter(
          cb => cb !== callback
        );
      }
    } else {
      // Remove all listeners for this event
      this.socket.off(event);
      delete this.eventListeners[event];
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(event?: string): void {
    if (!this.socket) return;

    if (event) {
      this.socket.removeAllListeners(event);
      delete this.eventListeners[event];
    } else {
      this.socket.removeAllListeners();
      this.eventListeners = {};
    }
  }

  /**
   * Get socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if socket is connected
   */
  getIsConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Add connection callback
   */
  onConnect(callback: () => void): void {
    this.connectionCallbacks.push(callback);

    // If already connected, call immediately
    if (this.isConnected) {
      callback();
    }
  }

  /**
   * Remove connection callback
   */
  offConnect(callback: () => void): void {
    this.connectionCallbacks = this.connectionCallbacks.filter(
      cb => cb !== callback
    );
  }

  /**
   * Add disconnection callback
   */
  onDisconnect(callback: () => void): void {
    this.disconnectionCallbacks.push(callback);
  }

  /**
   * Remove disconnection callback
   */
  offDisconnect(callback: () => void): void {
    this.disconnectionCallbacks = this.disconnectionCallbacks.filter(
      cb => cb !== callback
    );
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
