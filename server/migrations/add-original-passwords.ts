import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

/**
 * This migration script adds original password access back to user accounts
 * by storing known original passwords for existing users.
 * 
 * SECURITY WARNING: This is for development purposes and should NOT be used in production!
 */
export async function restoreOriginalPasswords() {
  console.log("⚠️ STARTING ORIGINAL PASSWORD RESTORATION ⚠️");
  
  try {
    // Get the user with username 'artur'
    const arturUser = await db.select().from(users).where(eq(users.username, 'artur'));
    
    if (arturUser.length > 0) {
      // Create a hash of the original password 'warsaw123'
      const originalPassword = 'warsaw123'; // The original password
      const hashedPassword = await bcrypt.hash(originalPassword, 10);
      
      // Update the user's password
      await db.update(users)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(users.id, arturUser[0].id));
        
      console.log(`✅ Restored original password for user ${arturUser[0].username} (ID: ${arturUser[0].id})`);
    } else {
      console.log("User 'artur' not found");
    }
    
    // Add similar blocks for other users whose original passwords are known
    
    console.log("✅ PASSWORD RESTORATION COMPLETED");
    console.log("Users can now log in with their original passwords");
    
  } catch (error) {
    console.error("❌ Error restoring original passwords:", error);
    throw error;
  }
}

// Execute the migration
restoreOriginalPasswords()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });