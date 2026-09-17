import { io, Socket } from 'socket.io-client';
import { BASE_URL } from '../../helper/Constants';

type EventCallback = (...args: any[]) => void;
type EventMap = {
  [event: string]: EventCallback[];
};

/**
 * Future Socket Service
 * Manages futures-specific socket connection
 */
class FutureSocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private eventListeners: EventMap = {};
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private connectionCallbacks: Array<() => void> = [];
  private disconnectionCallbacks: Array<() => void> = [];

  /**
   * Initialize futures socket connection
   */
  connect(url?: string, token?: string): Socket {
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
   * Disconnect socket
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
      this.eventListeners = {};
    }
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
export const futureSocketService = new FutureSocketService();
export default futureSocketService;
