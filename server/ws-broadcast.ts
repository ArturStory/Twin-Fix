// WebSocket broadcasting utility
// This file serves as a central place for broadcasting updates via WebSocket

/**
 * Combined message type for WebSocket broadcasts
 */
interface WebSocketMessage {
  type: string;
  data: any;
}

/**
 * Broadcast an update via the global WebSocket broadcaster
 * @param messageType The type of update (e.g., 'issue_notification', 'issue_data_update')
 * @param messageData The data to send with the update
 */
export function broadcastUpdate(messageType: string, messageData: any): void {
  if ((global as any).broadcastUpdate) {
    const message: WebSocketMessage = {
      type: messageType,
      data: messageData
    };
    (global as any).broadcastUpdate(message);
  } else {
    console.warn('WebSocket broadcaster not available');
  }
}