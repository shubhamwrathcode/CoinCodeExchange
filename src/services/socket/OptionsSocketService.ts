import { io, Socket } from 'socket.io-client';
import { BASE_URL } from '../../helper/Constants';

type EventCallback = (...args: any[]) => void;
type EventMap = {
  [event: string]: EventCallback[];
};

/**
 * Options Socket Service
 * Manages options-specific socket connection
 */
class OptionsSocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private consumerCount: number = 0;
  private authKey: string | null = null;
  private eventListeners: EventMap = {};
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private connectionCallbacks: Array<() => void> = [];
  private disconnectionCallbacks: Array<() => void> = [];

  /**
   * Acquire shared socket (ref-counted). Call release() on cleanup.
   */
  acquire(url?: string, token?: string): Socket {
    const nextAuthKey = token ? String(token) : '';
    this.consumerCount += 1;

    if (__DEV__) {
      console.log('[OptionsWS] acquire', {
        consumerCount: this.consumerCount,
        authChanged: Boolean(this.socket && this.authKey !== nextAuthKey),
        hasSocket: Boolean(this.socket),
      });
    }

    if (this.socket && this.authKey !== nextAuthKey) {
      if (this.authKey && !nextAuthKey) {
        if (__DEV__) {
          console.log('[OptionsWS] acquire: keeping existing authenticated connection for unauthenticated request');
        }
        // Do not update this.authKey, just reuse the socket
      } else {
        this.forceDisconnect();
        this.authKey = nextAuthKey;
      }
    } else if (!this.socket) {
      this.authKey = nextAuthKey;
    }
    
    return this.connect(url, this.authKey || token);
  }

  /**
   * Release a consumer. Disconnects only when the last consumer is released.
   * @returns true when the socket was fully torn down
   */
  release(): boolean {
    this.consumerCount = Math.max(0, this.consumerCount - 1);
    if (__DEV__) {
      console.log('[OptionsWS] release', { consumerCount: this.consumerCount });
    }
    if (this.consumerCount === 0) {
      this.disconnect();
      return true;
    }
    return false;
  }

  getConsumerCount(): number {
    return this.consumerCount;
  }

  /**
   * Initialize options socket connection
   */
  connect(url?: string, token?: string): Socket {
    if (this.socket) {
      if (__DEV__) {
        console.log('[OptionsWS] connect skipped (socket already exists)', { connected: this.socket.connected });
      }
      return this.socket;
    }

    // Use provided URL or default BASE_URL, remove trailing slash and append /options
    const baseUrl = (url || BASE_URL).replace(/\/$/, '');
    const socketUrl = `${baseUrl}/options`;

    if (__DEV__) {
      console.log('[OptionsWS] connect new socket', { socketUrl, hasToken: Boolean(token) });
    }

    this.socket = io(socketUrl, {
      transports: ['websocket'],
      reconnection: false, // Manual reconnection
      timeout: 5000,
      upgrade: false,
      rejectUnauthorized: false,
      auth: token ? { token } : undefined,
    });

    this.setupEventHandlers();

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
      if (__DEV__) {
        console.log('[OptionsWS] native socket connected', { consumerCount: this.consumerCount });
      }

      // Execute all connection callbacks
      this.connectionCallbacks.forEach(callback => callback());
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      if (__DEV__) {
        console.log('[OptionsWS] native socket disconnected', { reason, consumerCount: this.consumerCount });
      }

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
   * Disconnect socket (internal / last-consumer teardown)
   */
  private forceDisconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      try {
        this.socket.disconnect();
        (this.socket as any).close?.();
      } catch (e) {
        // ignore
      }
      this.socket = null;
    }

    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.consumerCount = 0;
    this.eventListeners = {};
    this.connectionCallbacks = [];
    this.disconnectionCallbacks = [];
    this.authKey = null;
  }

  disconnect(): void {
    this.forceDisconnect();
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
export const optionsSocketService = new OptionsSocketService();
export default optionsSocketService;
