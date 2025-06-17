import { broadcastUpdate } from './ws-broadcast';

/**
 * Broadcasts a user role change event
 * @param userId User ID
 * @param username Username
 * @param oldRole Old role
 * @param newRole New role
 * @param changedBy Username of the user who made the change
 */
export function broadcastUserRoleChange(
  userId: number, 
  username: string, 
  oldRole: string, 
  newRole: string,
  changedBy?: string
) {
  broadcastUpdate('role_changed', {
    data: {
      userId,
      username,
      oldRole,
      newRole,
      changedBy,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Broadcasts a user profile update event
 * @param userId User ID
 * @param username Username
 * @param updatedFields Array of fields that were updated
 */
export function broadcastUserProfileUpdate(
  userId: number,
  username: string,
  updatedFields: string[]
) {
  broadcastUpdate('user_updated', {
    data: {
      userId,
      username,
      updatedFields,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Broadcasts a user deletion event
 * @param userId User ID
 * @param username Username
 * @param deletedBy Username of the user who deleted the account
 */
export function broadcastUserDeletion(
  userId: number,
  username: string,
  deletedBy?: string
) {
  broadcastUpdate('user_deleted', {
    data: {
      userId,
      username,
      deletedBy,
      timestamp: new Date().toISOString()
    }
  });
}