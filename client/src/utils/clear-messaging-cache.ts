/**
 * Comprehensive cleanup utility to completely clear all messaging cache data
 */

export const clearAllMessagingCache = () => {
  try {
    console.log('🧹 Starting complete messaging cache cleanup...');
    
    // Clear all localStorage keys that might contain conversation data
    const allKeys = Object.keys(localStorage);
    const messagingKeys = allKeys.filter(key => 
      key.includes('conversation') ||
      key.includes('message') ||
      key.includes('chat') ||
      key.includes('twinfix') ||
      key.includes('messaging') ||
      key.includes('1747') || // Remove old timestamp-based IDs
      key.includes('1748') ||
      /\d{13,}/.test(key) // Remove any keys with large numbers (timestamps)
    );
    
    messagingKeys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`✓ Removed localStorage key: ${key}`);
    });
    
    // Also clear any React Query cache if available
    if (typeof window !== 'undefined' && (window as any).queryClient) {
      const queryClient = (window as any).queryClient;
      queryClient.clear();
      console.log('✓ Cleared React Query cache');
    }
    
    // Clear session storage as well
    const sessionKeys = Object.keys(sessionStorage);
    const sessionMessagingKeys = sessionKeys.filter(key => 
      key.includes('conversation') ||
      key.includes('message') ||
      key.includes('chat') ||
      key.includes('twinfix') ||
      key.includes('messaging')
    );
    
    sessionMessagingKeys.forEach(key => {
      sessionStorage.removeItem(key);
      console.log(`✓ Removed sessionStorage key: ${key}`);
    });
    
    console.log(`🎉 Cleanup complete! Removed ${messagingKeys.length + sessionMessagingKeys.length} cache entries.`);
    console.log('💡 Please refresh the page to start with completely clean messaging data.');
    
    return true;
  } catch (error) {
    console.error('❌ Error during messaging cache cleanup:', error);
    return false;
  }
};

// Auto-run cleanup when this module is loaded
if (typeof window !== 'undefined') {
  clearAllMessagingCache();
}