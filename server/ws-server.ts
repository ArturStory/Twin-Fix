import { Server as HttpServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import { Issue, User } from '@shared/schema';

// Create a central event emitter for broadcasting events
export const eventEmitter = new EventEmitter();

// Increase the maximum number of listeners to avoid warnings
eventEmitter.setMaxListeners(100);

// Define message types
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
  // New messaging types
  MESSAGE_RECEIVED = 'message_received',
  CONVERSATION_UPDATED = 'conversation_updated'
}

// Interface for WebSocket messages
interface WebSocketMessage {
  type: MessageType;
  payload: any;
  timestamp: string;
  sender?: {
    id: number;
    username: string;
    role?: string;
  };
}

// Connection tracking for users
interface ClientConnection {
  ws: WebSocket;
  userId?: number;
  username?: string;
  role?: string;
  connectionTime: Date;
  lastActivity: Date;
}

// Store client connections
const clients = new Map<WebSocket, ClientConnection>();

// Setup WebSocket server
export function setupWebSocketServer(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws',
  });

  console.log('WebSocket server initialized');
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection established');
    
    // Store new connection
    clients.set(ws, {
      ws,
      connectionTime: new Date(),
      lastActivity: new Date(),
    });
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: MessageType.MESSAGE,
      payload: {
        message: 'Connected to Twin Fix real-time updates'
      },
      timestamp: new Date().toISOString()
    }));
    
    // Handle messages from client
    ws.on('message', (message: any) => {
      try {
        // Make sure we can handle Buffer or string input
        const messageStr = message instanceof Buffer ? message.toString() : message.toString();
        const data = JSON.parse(messageStr);
        const client = clients.get(ws);
        
        if (client) {
          client.lastActivity = new Date();
        }
        
        handleClientMessage(ws, data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        
        try {
          ws.send(JSON.stringify({
            type: MessageType.MESSAGE,
            payload: {
              error: 'Invalid message format'
            },
            timestamp: new Date().toISOString()
          }));
        } catch (sendError) {
          console.error('Failed to send error response:', sendError);
        }
      }
    });
    
    // Handle client disconnect
    ws.on('close', () => {
      const client = clients.get(ws);
      if (client && client.userId) {
        // Broadcast user disconnect if they were authenticated
        broadcastToAll({
          type: MessageType.USER_LOGGED_OUT,
          payload: {
            userId: client.userId,
            username: client.username
          },
          timestamp: new Date().toISOString()
        });
      }
      
      // Remove from clients map
      clients.delete(ws);
      console.log('WebSocket connection closed');
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });
  
  // Set up listeners for various events
  setupEventListeners();
  
  // Setup periodic ping to keep connections alive
  setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
        
        const client = clients.get(ws);
        if (client) {
          // Check for inactive clients (1 hour timeout)
          const now = new Date();
          const inactiveTime = now.getTime() - client.lastActivity.getTime();
          
          if (inactiveTime > 60 * 60 * 1000) {
            console.log(`Closing inactive connection for ${client.username || 'unknown user'}`);
            ws.terminate();
            clients.delete(ws);
          }
        }
      }
    });
  }, 30000); // Every 30 seconds
  
  return wss;
}

// Handle messages from clients
function handleClientMessage(ws: WebSocket, message: WebSocketMessage) {
  const { type, payload } = message;
  const client = clients.get(ws);
  
  console.log(`Received message of type: ${type}`);
  
  switch (type) {
    case MessageType.USER_LOGGED_IN:
      // Authenticate the connection
      if (payload.userId && payload.username) {
        if (client) {
          client.userId = payload.userId;
          client.username = payload.username;
          client.role = payload.role;
          client.lastActivity = new Date();
        }
        
        // Broadcast user login to other users
        broadcastToOthers(ws, {
          type: MessageType.USER_LOGGED_IN,
          payload: {
            userId: payload.userId,
            username: payload.username,
            role: payload.role
          },
          timestamp: new Date().toISOString()
        });
        
        console.log(`User authenticated: ${payload.username} (${payload.userId})`);
      }
      break;
      
    // Forward these events to all other clients
    case MessageType.ISSUE_CREATED:
    case MessageType.ISSUE_UPDATED:
    case MessageType.ISSUE_DELETED:
    case MessageType.COMMENT_ADDED:
    case MessageType.STATUS_CHANGED:
    case MessageType.REPAIR_SCHEDULED:
    case MessageType.LOCATION_ADDED:
    case MessageType.MACHINE_ADDED:
      // Add sender information
      if (client && client.userId) {
        message.sender = {
          id: client.userId,
          username: client.username || 'unknown',
          role: client.role
        };
      }
      
      // Log the activity
      console.log(`Broadcasting ${type} event from ${message.sender?.username || 'unknown user'}`);
      
      // For important notifications, broadcast to ALL clients including the sender
      // This ensures that all users receive all notifications immediately
      if ([
        MessageType.ISSUE_CREATED,
        MessageType.ISSUE_UPDATED,
        MessageType.STATUS_CHANGED,
        MessageType.COMMENT_ADDED,
        MessageType.REPAIR_SCHEDULED,
        MessageType.LOCATION_ADDED,
        MessageType.MACHINE_ADDED
      ].includes(type)) {
        console.log(`🔔 Sending ${type} notification to ALL connected users, including sender`);
        broadcastToAll(message);
      } else {
        // For other events, just broadcast to other clients
        broadcastToOthers(ws, message);
      }
      
      // Also emit the event for any server-side listeners
      eventEmitter.emit(type, message.payload);
      break;
      
    default:
      console.log(`Unknown message type: ${type}`);
      break;
  }
}

// Set up event listeners for server-side events
function setupEventListeners() {
  // Issue created
  eventEmitter.on(MessageType.ISSUE_CREATED, (issue: Issue) => {
    console.log(`Server emitted issue_created event for issue ID: ${issue.id}`);
    // Additional server-side logic can be added here
  });
  
  // Issue updated
  eventEmitter.on(MessageType.ISSUE_UPDATED, (issue: Issue) => {
    console.log(`Server emitted issue_updated event for issue ID: ${issue.id}`);
    // Additional server-side logic can be added here
  });
  
  // Status changed
  eventEmitter.on(MessageType.STATUS_CHANGED, (data: { issueId: number, oldStatus: string, newStatus: string }) => {
    console.log(`Server emitted status_changed event for issue ID: ${data.issueId}`);
    // Additional server-side logic can be added here
  });
}

// Broadcast message to all connected clients except the sender
export function broadcastToOthers(senderWs: WebSocket, message: any) {
  clients.forEach((client, ws) => {
    if (ws !== senderWs && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

// Broadcast message to all connected clients including the sender
export function broadcastToAll(message: any) {
  clients.forEach((client, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

// Broadcast message to specific users by ID
export function broadcastToUsers(userIds: number[], message: any) {
  clients.forEach((client, ws) => {
    if (client.userId && userIds.includes(client.userId) && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

// Broadcast message to users with specific roles
export function broadcastToRoles(roles: string[], message: any) {
  clients.forEach((client, ws) => {
    if (client.role && roles.includes(client.role) && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

// Get currently connected clients info (for debugging/monitoring)
export function getConnectedClientsInfo() {
  const clientsInfo = [];
  
  clients.forEach((client) => {
    clientsInfo.push({
      userId: client.userId || 'unauthenticated',
      username: client.username || 'unknown',
      role: client.role || 'unknown',
      connectionTime: client.connectionTime,
      lastActivity: client.lastActivity,
    });
  });
  
  return clientsInfo;
}