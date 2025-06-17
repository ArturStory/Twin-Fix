/**
 * Migration script to create default users
 * 
 * This creates a default admin and test user to allow initial login
 * without requiring registration.
 */

import bcrypt from 'bcrypt';
import { db } from '../db';
import { users, UserRole } from '../../shared/schema';

// Create a default admin user if one doesn't exist
export async function createDefaultUsers() {
  try {
    console.log('Starting default users migration...');
    
    // Check if an admin user already exists
    const existingAdmin = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.role, UserRole.ADMIN)
    });
    
    if (!existingAdmin) {
      // Create an admin user
      const adminPassword = await bcrypt.hash('admin123', 10);
      const admin = await db.insert(users).values({
        username: 'admin',
        email: 'admin@example.com',
        password: adminPassword,
        role: UserRole.ADMIN,
        position: 'System Administrator',
        phone: null,
        photo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      console.log('Created admin user with ID:', admin[0].id);
    } else {
      console.log('Admin user already exists with ID:', existingAdmin.id);
    }
    
    // Check if a test user already exists
    const existingTest = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, 'test')
    });
    
    if (!existingTest) {
      // Create a test user
      const testPassword = await bcrypt.hash('test123', 10);
      const test = await db.insert(users).values({
        username: 'test',
        email: 'test@example.com',
        password: testPassword,
        role: UserRole.MANAGER,
        position: 'Test User',
        phone: null,
        photo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      console.log('Created test user with ID:', test[0].id);
    } else {
      console.log('Test user already exists with ID:', existingTest.id);
    }
    
    console.log('Default users migration completed');
  } catch (error) {
    console.error('Error creating default users:', error);
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  createDefaultUsers()
    .then(() => {
      console.log('Default users migration complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Default users migration failed:', error);
      process.exit(1);
    });
}