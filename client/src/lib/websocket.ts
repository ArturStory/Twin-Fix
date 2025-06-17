/**
 * WebSocket client utility for real-time updates
 * Handles connection, reconnection, and event broadcasting
 */

// Event types from the server
export enum MessageType {
  ISSUE_CREATED = 'issue_created',
  ISSUE_UPDATED = 'issue_updated',
  ISSUE_DELETED = 'issue_deleted',
  COMMENT_ADDED = 'comment_added',
  STATUS_CHANGED = 'status_changed',
  REPAIR_SCHEDULED = 'repair_scheduled',
  LOCATION_ADDED = 'location_added',
  MACHINE_ADDED = 'machine_added',
  USER_LOGGED_IN = 'user_logged_in',
  USER_LOGGED_OUT = 'user_logged_out',
  MESSAGE = 'message',
  DATA_REFRESH = 'data_refresh',
  MESSAGE_RECEIVED = 'message_received',
  CONVERSATION_UPDATED = 'conversation_updated'
}

class WebSocketClient {
  private socket: WebSocket | null = null;
  private reconnectAttempt = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second delay
  private reconnectTimer: number | null = null;
  private subscriptions: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    // Bind methods to preserve 'this' context
    this.connect = this.connect.bind(this);
    this.reconnect = this.reconnect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.onOpen = this.onOpen.bind(this);
    this.onClose = this.onClose.bind(this);
    this.onError = this.onError.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    this.send = this.send.bind(this);
  }

  // Connect to WebSocket server
  public connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      console.log('WebSocket connection already established');
      return;
    }

    // Close existing connection if any
    if (this.socket) {
      console.log('Closing existing connection before reconnecting');
      this.socket.close();
    }

    try {
      // Determine correct WebSocket protocol based on page protocol
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;
      
      console.log(`Connecting to WebSocket at ${wsUrl}`);
      
      // Add additional error handling for WebSocket creation
      try {
        this.socket = new WebSocket(wsUrl);
        
        // Set a timeout to detect stalled connection attempts
        const connectionTimeout = setTimeout(() => {
          if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket connection attempt timed out');
            this.socket.close();
            // This will trigger onClose which handles reconnection
          }
        }, 5000); // 5 second timeout
        
        // Clear timeout when connection opens
        this.socket.addEventListener('open', () => {
          clearTimeout(connectionTimeout);
        });
      } catch (err) {
        console.error('Failed to create WebSocket:', err);
        // Use offline mode
        this.broadcastEvent('ws_disconnected', { 
          code: 0,
          reason: 'Failed to create WebSocket connection',
          wasClean: false
        });
        throw err;
      }
      
      // Set up event listeners
      this.socket.addEventListener('open', this.onOpen);
      this.socket.addEventListener('message', this.onMessage);
      this.socket.addEventListener('close', this.onClose);
      this.socket.addEventListener('error', this.onError);
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.reconnect();
    }
  }

  // Handle successful connection
  private onOpen(event: Event): void {
    console.log('WebSocket connection established 🔌');
    // Reset reconnect attempts on successful connection
    this.reconnectAttempt = 0;
    this.reconnectDelay = 1000;
    
    // Notify that WebSocket is connected
    this.broadcastEvent('ws_connected', { connected: true });
    
    // Setup notification listeners
    console.log('Setting up WebSocket notification listeners');
    
    // Subscribe to events of interest
    const eventsToSubscribe = [
      MessageType.ISSUE_CREATED,
      MessageType.ISSUE_UPDATED,
      MessageType.STATUS_CHANGED,
      MessageType.COMMENT_ADDED,
      MessageType.REPAIR_SCHEDULED,
      MessageType.LOCATION_ADDED,
      MessageType.MACHINE_ADDED,
      MessageType.MESSAGE_RECEIVED
    ];
    
    eventsToSubscribe.forEach(eventType => {
      console.log(`Subscribing to WebSocket event: ${eventType}`);
    });
    
    // Send a ping to verify the connection is fully established and working
    // This helps ensure real-time messaging will work
    setTimeout(() => {
      this.send('ping', { status: 'checking_connection' });
    }, 1000);
  }

  // Handle incoming messages
  private onMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      // Log the message for debugging
      console.log(`Received WebSocket message: ${data.type}`, data);
      
      // Dispatch the message as a window event
      this.broadcastEvent('ws_message', event);
      
      // Also dispatch type-specific events
      if (data.type) {
        this.broadcastEvent(`ws_${data.type}`, data);
      }
      
      // Notify registered subscribers
      if (data.type && this.subscriptions.has(data.type)) {
        const handlers = this.subscriptions.get(data.type);
        handlers?.forEach(handler => {
          try {
            handler(data);
          } catch (error) {
            console.error(`Error in handler for ${data.type}:`, error);
          }
        });
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }

  // Handle connection close
  private onClose(event: CloseEvent): void {
    console.log(`WebSocket connection closed: ${event.code} ${event.reason || ''}`);
    this.socket = null;
    
    // Notify that WebSocket is disconnected
    this.broadcastEvent('ws_disconnected', { 
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });
    
    // Attempt to reconnect unless this was a clean close
    if (!event.wasClean) {
      this.reconnect();
    }
  }

  // Handle connection errors
  private onError(event: Event): void {
    console.error('WebSocket error:', event);
    // Error event is followed by close event, so reconnect will be handled there
  }

  // Attempt to reconnect with exponential backoff
  private reconnect(): void {
    if (this.reconnectAttempt >= this.maxReconnectAttempts) {
      console.error(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached`);
      
      // Reset attempt counter after a longer delay to allow for eventual reconnection
      // This helps with redeployment scenarios where server might be down temporarily
      window.setTimeout(() => {
        console.log('Resetting reconnection attempts counter');
        this.reconnectAttempt = 0;
        this.reconnect();
      }, 60000); // Wait 1 minute before starting fresh
      
      return;
    }
    
    // Clear any existing reconnect timers
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectAttempt++;
    
    // Exponential backoff with jitter
    const delay = Math.min(
      this.reconnectDelay * Math.pow(1.5, this.reconnectAttempt - 1),
      30000 // Cap at 30 seconds
    ) * (0.9 + Math.random() * 0.2); // Add ±10% jitter
    
    console.log(`Attempting to reconnect in ${Math.round(delay)}ms (attempt #${this.reconnectAttempt})`);
    
    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Disconnect WebSocket
  public disconnect(): void {
    if (this.socket) {
      this.socket.close(1000, 'Disconnected by user');
      this.socket = null;
    }
    
    // Clear any reconnect timers
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // Clear all subscriptions
    this.subscriptions.clear();
    
    console.log('WebSocket disconnected by user');
  }

  // Send message to server
  public send(type: string, payload: any): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('Cannot send message, WebSocket is not connected');
      return false;
    }
    
    try {
      const message = JSON.stringify({
        type,
        payload,
        timestamp: new Date().toISOString()
      });
      
      this.socket.send(message);
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  // Subscribe to specific message types
  public subscribe(type: string, handler: (data: any) => void): () => void {
    if (!this.subscriptions.has(type)) {
      this.subscriptions.set(type, new Set());
    }
    
    const handlers = this.subscriptions.get(type)!;
    handlers.add(handler);
    
    // Return an unsubscribe function
    return () => {
      if (this.subscriptions.has(type)) {
        const handlers = this.subscriptions.get(type)!;
        handlers.delete(handler);
        
        if (handlers.size === 0) {
          this.subscriptions.delete(type);
        }
      }
    };
  }

  // Unsubscribe from specific message types
  public unsubscribe(type: string, handler?: (data: any) => void): void {
    if (!this.subscriptions.has(type)) {
      return;
    }
    
    if (handler) {
      // Remove specific handler
      const handlers = this.subscriptions.get(type)!;
      handlers.delete(handler);
      
      if (handlers.size === 0) {
        this.subscriptions.delete(type);
      }
    } else {
      // Remove all handlers for this type
      this.subscriptions.delete(type);
      console.log(`Unsubscribing from WebSocket event: ${type}`);
    }
  }

  // Broadcast custom event to window
  private broadcastEvent(eventName: string, detail: any): void {
    const event = new CustomEvent(eventName, { detail });
    window.dispatchEvent(event);
  }
}

// Create singleton instance
const webSocketClient = new WebSocketClient();

// Export singleton instance
export default webSocketClient;