import { createContext, useContext, ReactNode, useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { MessageType } from '../types/websocket';

// Define the shape of our WebSocket context
interface WebSocketContextType {
  isConnected: boolean;
  subscribe: (eventType: string, callback: (data: any) => void) => () => void;
  addListener: (eventType: string, callback: (data: any) => void) => void;
  removeListener: (eventType: string, callback: (data: any) => void) => void;
  send: (eventType: string, data: any) => void;
}

// Define WebSocket message structure
interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp?: string;
  sender?: {
    id: number;
    username: string;
    role?: string;
  };
}

// Create the context with a default value
const WebSocketContext = createContext<WebSocketContextType | null>(null);

// Type for the event callbacks
type EventCallback = (data: any) => void;

// Props for the provider component
interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventListeners = useRef<Map<string, Set<EventCallback>>>(new Map());
  
  // Create and manage the WebSocket connection
  useEffect(() => {
    // Establish WebSocket connection
    const connectWebSocket = () => {
      try {
        // Check if we're not in an initial render or component unmount state
        if (typeof window === 'undefined') return;
        
        // Use the correct WebSocket URL based on the current protocol (http vs https)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        console.log(`Connecting to WebSocket at ${wsUrl}`);
        
        // Check for existing socket and close it if it exists
        if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
          console.log('Closing existing connection before reconnecting');
          socket.close();
        }
        
        const newSocket = new WebSocket(wsUrl);
        
        newSocket.onopen = () => {
          console.log('WebSocket connection established 🔌');
          setIsConnected(true);
          setReconnectAttempt(0);
          
          // Authenticate the connection with user info if available
          if (user) {
            const authMessage: WebSocketMessage = {
              type: MessageType.USER_LOGGED_IN,
              payload: {
                userId: user.id,
                username: user.username,
                role: user.role
              }
            };
            newSocket.send(JSON.stringify(authMessage));
          }
        };
        
        newSocket.onmessage = (event) => {
          try {
            // Handle different event.data formats
            let jsonData;
            if (typeof event.data === 'string') {
              jsonData = event.data;
            } else if (event.data instanceof Blob) {
              // For browsers that deliver WebSocket messages as Blobs
              const reader = new FileReader();
              reader.onload = function() {
                try {
                  const message = JSON.parse(reader.result as string) as WebSocketMessage;
                  processWebSocketMessage(message);
                } catch (error) {
                  console.error('Error parsing WebSocket Blob message:', error);
                }
              };
              reader.readAsText(event.data);
              return; // Early return, as we'll process async in the reader.onload
            } else {
              console.warn('Received WebSocket message in unknown format:', typeof event.data);
              return;
            }
            
            const message = JSON.parse(jsonData) as WebSocketMessage;
            processWebSocketMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error, event.data);
          }
        };
        
        // Helper function to process WebSocket messages
        const processWebSocketMessage = (message: WebSocketMessage) => {
          console.log(`Received WebSocket message: ${message.type}`, message);
          
          // Notify listeners for this event type
          const listeners = eventListeners.current.get(message.type);
          if (listeners) {
            listeners.forEach(callback => {
              try {
                callback(message.payload);
              } catch (error) {
                console.error(`Error in WebSocket listener callback for ${message.type}:`, error);
              }
            });
          }
          
          // Also notify generic message listeners
          const genericListeners = eventListeners.current.get('message');
          if (genericListeners) {
            genericListeners.forEach(callback => {
              try {
                callback(message);
              } catch (error) {
                console.error('Error in generic WebSocket listener callback:', error);
              }
            });
          }
        };
        
        newSocket.onclose = (event) => {
          console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
          setIsConnected(false);
          setSocket(null);
          
          // Attempt to reconnect with exponential backoff
          const maxReconnectDelay = 30000; // 30 seconds
          const baseDelay = 1000; // 1 second
          const delay = Math.min(baseDelay * Math.pow(1.5, reconnectAttempt), maxReconnectDelay);
          
          console.log(`Attempting to reconnect in ${delay}ms (attempt #${reconnectAttempt + 1})`);
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempt(prev => prev + 1);
            connectWebSocket();
          }, delay);
        };
        
        newSocket.onerror = (error) => {
          console.error('WebSocket error:', error);
          // The onclose handler will be called after this, triggering reconnect
        };
        
        setSocket(newSocket);
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        // Try to reconnect after a delay
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempt(prev => prev + 1);
          connectWebSocket();
        }, 5000);
      }
    };
    
    connectWebSocket();
    
    // Clean up on unmount
    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      eventListeners.current.clear();
    };
  }, [reconnectAttempt, user]);
  
  // Subscribe to events (returns unsubscribe function)
  const subscribe = useCallback((eventType: string, callback: EventCallback) => {
    console.log(`Subscribing to WebSocket event: ${eventType}`);
    
    if (!eventListeners.current.has(eventType)) {
      eventListeners.current.set(eventType, new Set());
    }
    
    const listeners = eventListeners.current.get(eventType)!;
    listeners.add(callback);
    
    // Return an unsubscribe function
    return () => {
      console.log(`Unsubscribing from WebSocket event: ${eventType}`);
      const currentListeners = eventListeners.current.get(eventType);
      if (currentListeners) {
        currentListeners.delete(callback);
        
        // Clean up empty listener sets
        if (currentListeners.size === 0) {
          eventListeners.current.delete(eventType);
        }
      }
    };
  }, []);
  
  // Add a listener (alternative to subscribe)
  const addListener = useCallback((eventType: string, callback: EventCallback) => {
    console.log(`Adding WebSocket listener for: ${eventType}`);
    
    if (!eventListeners.current.has(eventType)) {
      eventListeners.current.set(eventType, new Set());
    }
    
    const listeners = eventListeners.current.get(eventType)!;
    listeners.add(callback);
  }, []);
  
  // Remove a specific listener
  const removeListener = useCallback((eventType: string, callback: EventCallback) => {
    console.log(`Removing WebSocket listener for: ${eventType}`);
    
    const listeners = eventListeners.current.get(eventType);
    if (listeners) {
      listeners.delete(callback);
      
      // Clean up empty listener sets
      if (listeners.size === 0) {
        eventListeners.current.delete(eventType);
      }
    }
  }, []);
  
  // Send a message through the WebSocket
  const send = useCallback((eventType: string, data: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log(`Sending WebSocket message: ${eventType}`, data);
      
      const message: WebSocketMessage = {
        type: eventType,
        payload: data,
        timestamp: new Date().toISOString()
      };
      
      try {
        socket.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        toast({
          title: 'Communication Error',
          description: 'Unable to send real-time update. Please check your connection.',
          variant: 'destructive',
        });
      }
    } else {
      console.warn(`WebSocket not connected, can't send ${eventType} message`);
    }
  }, [socket, toast]);

  // Create the context value with our WebSocket functions
  const value: WebSocketContextType = {
    isConnected,
    subscribe,
    addListener,
    removeListener,
    send,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Hook to use the WebSocket context
export function useAppWebSocket() {
  const context = useContext(WebSocketContext);
  
  if (!context) {
    throw new Error('useAppWebSocket must be used within a WebSocketProvider');
  }
  
  return context;
}