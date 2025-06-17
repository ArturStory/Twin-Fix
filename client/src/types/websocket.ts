/**
 * Message types for WebSocket communication
 * These should match the types defined in server/ws-server.ts
 */
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
}

/**
 * WebSocket message structure
 */
export interface WebSocketMessage {
  type: MessageType;
  payload: any;
  timestamp?: string;
  sender?: {
    id: number;
    username: string;
    role?: string;
  };
}