/**
 * Utility to clean up problematic conversation data that causes database overflow
 */

// PostgreSQL integer limit
const MAX_SAFE_INTEGER = 2147483647;

export const cleanupConversationData = () => {
  try {
    // Clear localStorage data with problematic conversation IDs
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('conversation') || key.includes('message') || key.includes('chat'))) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            // Check if the value contains large timestamp-based IDs
            if (value.includes('1747735425063') || 
                value.includes('1747') || 
                /\d{13,}/.test(value)) {
              keysToRemove.push(key);
            }
          } catch (e) {
            // If we can't parse it, it might be corrupted, so remove it
            keysToRemove.push(key);
          }
        }
      }
    }
    
    // Remove problematic keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`Removed problematic localStorage key: ${key}`);
    });
    
    // Clear React Query cache for conversations
    if (typeof window !== 'undefined' && (window as any).queryClient) {
      const queryClient = (window as any).queryClient;
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.removeQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.removeQueries({ queryKey: ['messages'] });
    }
    
    console.log('Conversation cleanup completed successfully');
    return true;
  } catch (error) {
    console.error('Error during conversation cleanup:', error);
    return false;
  }
};

export const isValidConversationId = (id: string | number): boolean => {
  const numId = typeof id === 'string' ? parseInt(id) : id;
  return !isNaN(numId) && numId > 0 && numId <= MAX_SAFE_INTEGER;
};

export const filterValidConversations = (conversations: any[]): any[] => {
  return conversations.filter(conv => 
    conv && isValidConversationId(conv.id)
  );
};