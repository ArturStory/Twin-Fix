import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon to use WebSockets
neonConfig.webSocketConstructor = ws;

// Add some retry and connection pool configuration
const CONNECTION_RETRIES = 5;
const RETRY_DELAY_MS = 1000;

// Validate that we have a database URL
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a pool with better connection handling and timeout settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,           // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 5000, // Maximum time to wait for connection
});

// Add error handling for the pool
pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

// Initialize drizzle with the connection pool
export const db = drizzle({ client: pool, schema });

// Function to test the database connection with retries
export async function testDatabaseConnection() {
  let retries = CONNECTION_RETRIES;
  
  while (retries > 0) {
    try {
      const client = await pool.connect();
      console.log('Successfully connected to the database');
      client.release();
      return true;
    } catch (error) {
      console.error(`Database connection attempt failed (${CONNECTION_RETRIES - retries + 1}/${CONNECTION_RETRIES}):`, error);
      retries--;
      
      if (retries === 0) {
        console.error('All database connection attempts failed');
        return false;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  
  return false;
}
