/**
 * Test authentication functions for development purposes
 */

// Predefined test credentials that always work for development
export const TEST_CREDENTIALS = [
  { username: 'testuser', password: 'testuser123' },
  { username: 'admin', password: 'admin123' },
  { username: 'dev', password: 'dev123' }
];

// Check if credentials match our predefined test users
export function isValidTestCredentials(username: string, password: string): boolean {
  return TEST_CREDENTIALS.some(
    cred => cred.username === username && cred.password === password
  );
}

// Get user information for a test user
export function getTestUserInfo(username: string) {
  if (username === 'admin') {
    return {
      role: 'admin',
      name: 'Administrator',
      email: 'admin@example.com'
    };
  }
  
  if (username === 'testuser') {
    return {
      role: 'manager',
      name: 'Test User',
      email: 'test@example.com'
    };
  }
  
  return {
    role: 'reporter',
    name: 'Developer',
    email: 'dev@example.com'
  };
}