// Helper functions for the messaging system 

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  photo: string | null;
}

export interface Message {
  id: number;
  content: string;
  senderId: number;
  recipientId: number;
  read: boolean;
  createdAt: string;
  senderName: string;
  senderPhoto: string | null;
}

export interface Conversation {
  id: number;
  otherUser: {
    id: number;
    username: string;
    email: string;
    role: string;
    photo: string | null;
  };
  lastMessageAt: string;
  unreadCount: number;
  lastMessage?: {
    content: string;
    createdAt: string;
  };
}

// Real database users only (IDs: 1, 3, 5, 9, 11, 12)
export const userMap: Record<number, User> = {
  1: { id: 1, username: "demo", email: "demo@example.com", role: "admin", photo: null },
  3: { id: 3, username: "artur", email: "artur@example.com", role: "admin", photo: null },
  5: { id: 5, username: "testuser", email: "testuser@example.com", role: "user", photo: null },
  9: { id: 9, username: "Arek", email: "arek@example.com", role: "owner", photo: null },
  11: { id: 11, username: "Jan", email: "jan@example.com", role: "manager", photo: null },
  12: { id: 12, username: "Mikolaj", email: "mikolaj@example.com", role: "manager", photo: null }
};

// Get real username by ID
export const getUsernameById = (userId: number): string => {
  return userMap[userId]?.username || `User ${userId}`;
};

// Get real user by ID
export const getUserById = (userId: number): User | null => {
  return userMap[userId] || null;
};

// Get stored conversations from localStorage
export const getStoredConversations = (): Conversation[] => {
  try {
    const storedData = localStorage.getItem('twinfix_conversations');
    const data = storedData ? JSON.parse(storedData) : [];
    
    if (Array.isArray(data) && data.length > 0) {
      return data.map(conv => {
        // Always make sure otherUser has proper data from our map
        if (conv.otherUser && userMap[conv.otherUser.id]) {
          return {
            ...conv,
            otherUser: {
              ...conv.otherUser,
              ...userMap[conv.otherUser.id]
            }
          };
        }
        return conv;
      });
    }
    
    return [];
  } catch (error) {
    console.error('Error loading conversations from localStorage', error);
    return [];
  }
};

// Save conversations to localStorage
export const saveConversations = (conversations: Conversation[]): void => {
  try {
    localStorage.setItem('twinfix_conversations', JSON.stringify(conversations));
  } catch (error) {
    console.error('Error saving conversations to localStorage', error);
  }
};

// Create a new conversation via API
export const createConversation = async (currentUserId: number, otherUserId: number): Promise<Conversation | null> => {
  try {
    const response = await fetch('/api/messaging/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipientId: otherUserId
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating conversation:', error);
    return null;
  }
};

// Get stored messages for a conversation
export const getStoredMessages = (conversationId: number): Message[] => {
  try {
    const key = `twinfix_conversation_${conversationId}_messages`;
    const storedData = localStorage.getItem(key);
    if (storedData) {
      return JSON.parse(storedData);
    }
  } catch (error) {
    console.error(`Error loading messages for conversation ${conversationId}`, error);
  }
  return [];
};

// Save messages for a conversation
export const saveMessages = (conversationId: number, messages: Message[]): void => {
  try {
    const key = `twinfix_conversation_${conversationId}_messages`;
    localStorage.setItem(key, JSON.stringify(messages));
  } catch (error) {
    console.error(`Error saving messages for conversation ${conversationId}`, error);
  }
};

// Add a new message to a conversation
export const addMessageToConversation = (
  conversationId: number, 
  content: string, 
  senderId: number, 
  recipientId: number
): Message => {
  // Create new message
  const newMessage: Message = {
    id: Math.floor(Math.random() * 1000000) + 1, // Use small integer ID instead of timestamp
    content,
    senderId,
    recipientId,
    read: false,
    createdAt: new Date().toISOString(),
    senderName: senderId === recipientId ? 'You' : getUsernameById(senderId),
    senderPhoto: null
  };
  
  // Get existing messages
  const messages = getStoredMessages(conversationId);
  
  // Add new message
  messages.push(newMessage);
  
  // Save updated messages
  saveMessages(conversationId, messages);
  
  return newMessage;
};

// Generate sample messages for a new conversation
export const generateSampleMessages = (
  conversationId: number,
  currentUserId: number,
  otherUserId: number
): Message[] => {
  const messages: Message[] = [];
  const now = new Date();
  
  // Sample message templates for realistic conversation starters
  const messageTemplates = [
    `Hi ${getUsernameById(currentUserId)}, can we discuss the equipment issue?`,
    `I need help with the machine maintenance schedule.`,
    `When can you come by to check the refrigeration unit?`,
    `Have you received the parts we ordered last week?`,
    `The coffee machine needs urgent attention, please advise.`
  ];
  
  // Create 5 sample messages alternating between users
  for (let i = 0; i < 5; i++) {
    const timeOffset = 5 - i;
    const messageDate = new Date(now.getTime() - timeOffset * 1000 * 60 * 10);
    const isCurrentUserMessage = i % 2 === 0;
    
    messages.push({
      id: conversationId * 100 + i,
      content: messageTemplates[i],
      senderId: isCurrentUserMessage ? otherUserId : currentUserId,
      recipientId: isCurrentUserMessage ? currentUserId : otherUserId,
      read: true,
      createdAt: messageDate.toISOString(),
      senderName: isCurrentUserMessage ? getUsernameById(otherUserId) : 'You',
      senderPhoto: null
    });
  }
  
  // Save the sample messages
  saveMessages(conversationId, messages);
  
  return messages;
};