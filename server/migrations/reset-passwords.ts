import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

/**
 * This is a special one-time migration script that resets all user passwords 
 * to match their usernames for development purposes.
 * 
 * SECURITY WARNING: This should NEVER be used in production!
 * This is purely for development testing.
 */
export async function resetPasswords() {
  console.log("⚠️ STARTING PASSWORD RESET MIGRATION ⚠️");
  console.log("This will update all user passwords to match their usernames");
  console.log("This is for development testing only!");
  
  try {
    // Get all users
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users to update`);
    
    for (const user of allUsers) {
      // Hash their username as their new password
      const hashedPassword = await bcrypt.hash(user.username, 10);
      
      // Update the user record
      await db.update(users)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id));
        
      console.log(`Reset password for user ${user.username} (ID: ${user.id})`);
    }
    
    console.log("✅ PASSWORD RESET COMPLETED");
    console.log("All users can now log in with their username as password");
    
  } catch (error) {
    console.error("❌ Error resetting passwords:", error);
    throw error;
  }
}

// Execute the migration
resetPasswords()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });