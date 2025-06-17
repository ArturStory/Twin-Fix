import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { Users, Plus, Send, Loader2, Bell } from 'lucide-react';
import { showNotification, requestNotificationPermission } from '@/lib/notification-helper';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';

// Real user mapping with proper display names
const userList = [
  { id: 1, username: "artur", role: "admin" },
  { id: 2, username: "Arek", role: "owner" },
  { id: 3, username: "Piotr", role: "owner" },
  { id: 4, username: "Marek", role: "manager" },
  { id: 5, username: "Tomek", role: "manager" },
  { id: 6, username: "Anna", role: "repairman" },
  { id: 7, username: "Kasia", role: "reporter" },
  { id: 8, username: "Robert", role: "repairman" },
  { id: 9, username: "Marcin", role: "manager" },
  { id: 10, username: "Ola", role: "reporter" },
  { id: 11, username: "Jan", role: "repairman" },
  { id: 12, username: "Mikolaj", role: "owner" },
  { id: 13, username: "Jakub", role: "owner" },
  { id: 14, username: "demo", role: "reporter" },
  { id: 15, username: "test", role: "manager" },
  { id: 16, username: "testuser", role: "admin" }
];

interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  receiverId: number;
  content: string;
  timestamp: string;
}

interface Conversation {
  id: number;
  userId: number;
  username: string;
  role: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

export default function SimplifiedMessaging() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [currentUserId, setCurrentUserId] = useState<number>(1); // Default to user 1 (artur)
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSelectionDialogOpen, setIsSelectionDialogOpen] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  
  // Initialize the app - load existing conversations or create initial ones
  // Initialize notifications and request permission
  useEffect(() => {
    // Request notification permission when the component mounts
    requestNotificationPermission().then(granted => {
      if (granted) {
        console.log('Notification permission granted');
      } else {
        console.log('Notification permission denied');
      }
    });
  }, []);

  useEffect(() => {
    // Store current user's username in localStorage if not already set
    if (!localStorage.getItem('twinfix_username')) {
      // Set a default username (could be replaced with a real username later)
      const currentUsername = userList.find(u => u.id === currentUserId)?.username || 'artur';
      localStorage.setItem('twinfix_username', currentUsername);
    }
    
    const storedConversations = localStorage.getItem('twinfix_conversations');
    if (storedConversations) {
      try {
        // Load stored conversations, ensuring usernames are correct
        const parsed = JSON.parse(storedConversations);
        const fixedConversations = parsed.map((conv: Conversation) => {
          const user = userList.find(u => u.id === conv.userId);
          return {
            ...conv,
            username: user ? user.username : conv.username,
            role: user ? user.role : conv.role
          };
        });
        setConversations(fixedConversations);
      } catch (e) {
        console.error('Error loading conversations:', e);
        createInitialConversations();
      }
    } else {
      createInitialConversations();
    }
  }, []);
  
  // Fetch or create conversations from the API
  const createInitialConversations = async () => {
    try {
      // Try to fetch conversations from the API first
      console.log('Fetching conversations from API...');
      const response = await fetch('/api/messaging/conversations');
      if (response.ok) {
        const apiConversations = await response.json();
        console.log('API conversations:', apiConversations);
        
        // Map API response to our conversation format
        const formattedConversations = apiConversations.map((conv: any) => {
          // Find user information
          const otherUserId = conv.participant1Id === currentUserId 
            ? conv.participant2Id 
            : conv.participant1Id;
          
          const otherUser = userList.find(u => u.id === otherUserId);
          
          return {
            id: conv.id,
            userId: otherUserId,
            username: otherUser?.username || `User ${otherUserId}`,
            role: otherUser?.role || 'user',
            lastMessage: conv.lastMessage || '',
            lastMessageTime: conv.lastMessageAt || new Date().toISOString(),
            unreadCount: conv.unreadCount || 0
          };
        });
        
        if (formattedConversations && formattedConversations.length > 0) {
          setConversations(formattedConversations);
          return;
        }
      }
      
      // Fallback to creating conversations if API returns empty or fails
      console.log('Creating sample conversations...');
      const sampleUsers = [
        { id: 2, username: "Arek", role: "owner" },
        { id: 6, username: "Anna", role: "repairman" },
        { id: 4, username: "Marek", role: "manager" }
      ];
      
      // Create conversations via API for each sample user
      for (const user of sampleUsers) {
        try {
          await fetch('/api/messaging/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipientId: user.id })
          });
        } catch (err) {
          console.error('Error creating conversation with user', user.id, err);
        }
      }
      
      // Fetch the newly created conversations
      const newResponse = await fetch('/api/messaging/conversations');
      if (newResponse.ok) {
        const apiConversations = await response.json();
        
        // Map API response to our conversation format
        const formattedConversations = apiConversations.map((conv: any) => {
          // Find user information
          const otherUserId = conv.participant1Id === currentUserId 
            ? conv.participant2Id 
            : conv.participant1Id;
          
          const otherUser = userList.find(u => u.id === otherUserId);
          
          return {
            id: conv.id,
            userId: otherUserId,
            username: otherUser?.username || `User ${otherUserId}`,
            role: otherUser?.role || 'user',
            lastMessage: conv.lastMessage || '',
            lastMessageTime: conv.lastMessageAt || new Date().toISOString(),
            unreadCount: conv.unreadCount || 0
          };
        });
        
        setConversations(formattedConversations);
      } else {
        // If API completely fails, use localStorage as fallback
        const sampleConversations: Conversation[] = [
          { id: 1, userId: 2, username: "Arek", role: "owner", unreadCount: 0 },
          { id: 2, userId: 6, username: "Anna", role: "repairman", unreadCount: 0 },
          { id: 3, userId: 4, username: "Marek", role: "manager", unreadCount: 0 }
        ];
        setConversations(sampleConversations);
        localStorage.setItem('twinfix_conversations', JSON.stringify(sampleConversations));
      }
    } catch (error) {
      console.error('Error fetching/creating conversations:', error);
      // Fallback to local storage as last resort
      const sampleConversations: Conversation[] = [
        { id: 1, userId: 2, username: "Arek", role: "owner", unreadCount: 0 },
        { id: 2, userId: 6, username: "Anna", role: "repairman", unreadCount: 0 },
        { id: 3, userId: 4, username: "Marek", role: "manager", unreadCount: 0 }
      ];
      setConversations(sampleConversations);
      localStorage.setItem('twinfix_conversations', JSON.stringify(sampleConversations));
    }
  };
  
  // Create sample messages for a conversation
  const createSampleMessages = (conversationId: number, senderId: number, receiverId: number) => {
    const templates = [
      "Can you check the refrigeration unit in the kitchen?",
      "The ice cream machine needs maintenance again",
      "When can you schedule service for the coffee machine?",
      "We need help with the fryer in section B",
      "The dishwasher is making strange noises, please check"
    ];
    
    const now = new Date();
    const sampleMessages: Message[] = [];
    
    for (let i = 0; i < 5; i++) {
      const isFromSender = i % 2 === 0;
      const messageTime = new Date(now.getTime() - (5-i) * 10 * 60000);
      
      sampleMessages.push({
        id: Date.now() + i,
        conversationId,
        senderId: isFromSender ? senderId : receiverId,
        receiverId: isFromSender ? receiverId : senderId,
        content: templates[i],
        timestamp: messageTime.toISOString()
      });
    }
    
    // Save messages to localStorage
    localStorage.setItem(`twinfix_messages_${conversationId}`, JSON.stringify(sampleMessages));
    
    return sampleMessages;
  };
  
  // Show notification for a new message
  const showMessageNotification = (message: Message, senderName: string) => {
    // Only show notifications for messages we receive, not ones we send
    if (message.senderId === currentUserId) return;
    
    const title = `${senderName} ${t('new_message')}`;
    const options: NotificationOptions = {
      body: message.content,
      icon: '/favicon.ico', // Default icon
      badge: '/favicon.ico',
      // vibrate is not in standard NotificationOptions but works in modern browsers
      // @ts-ignore - vibrate property is valid in web notifications but not in the TypeScript type
      vibrate: [100, 50, 100], // Vibration pattern for mobile
      tag: `twinfix-message-${message.senderId}`, // Tag to group notifications
    };
    
    showNotification(title, options);
  };
  
  // Load messages for a conversation from the API
  const loadMessages = async (conversationId: number) => {
    try {
      console.log(`Loading messages for conversation ${conversationId}`);
      
      // Fetch messages from the API
      const response = await fetch(`/api/messaging/conversations/${conversationId}/messages`);
      
      if (response.ok) {
        const apiMessages = await response.json();
        console.log('API messages:', apiMessages);
        
        // Map API response to our message format
        const formattedMessages = apiMessages.map((msg: any) => ({
          id: msg.id,
          conversationId: conversationId,
          senderId: msg.senderId,
          receiverId: msg.recipientId,
          content: msg.content,
          timestamp: msg.createdAt || new Date().toISOString()
        }));
        
        setMessages(formattedMessages);
        
        // Reset unread count when viewing messages
        setConversations(prevConversations => 
          prevConversations.map(conv => 
            conv.id === conversationId ? {...conv, unreadCount: 0} : conv
          )
        );
        
        return;
      } else {
        console.error('Failed to load messages:', await response.text());
      }
      
      // Fallback to local storage if API fails
      console.log('Falling back to local storage for messages');
      const storedMessages = localStorage.getItem(`twinfix_messages_${conversationId}`);
      if (storedMessages) {
        try {
          setMessages(JSON.parse(storedMessages));
        } catch (e) {
          console.error('Error loading messages from localStorage:', e);
          setMessages([]);
        }
      } else {
        // If no messages exist yet, create sample ones
        console.log('Creating sample messages');
        const newMessages = createSampleMessages(
          conversationId, 
          currentUserId, 
          selectedConversation?.userId || 0
        );
        setMessages(newMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Fallback to localStorage as last resort
      const storedMessages = localStorage.getItem(`twinfix_messages_${conversationId}`);
      if (storedMessages) {
        try {
          setMessages(JSON.parse(storedMessages));
        } catch (e) {
          console.error('Error loading messages from localStorage:', e);
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    }
  };
  
  // Select a conversation
  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    loadMessages(conversation.id);
    
    // Reset unread count when selecting a conversation
    const updatedConversations = conversations.map(conv => {
      if (conv.id === conversation.id) {
        return { ...conv, unreadCount: 0 };
      }
      return conv;
    });
    setConversations(updatedConversations);
    localStorage.setItem('twinfix_conversations', JSON.stringify(updatedConversations));
  };
  
  // Send a new message via API
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    try {
      console.log(`Sending message to conversation ${selectedConversation.id}`);
      
      // First try to send via API
      const response = await fetch('/api/messaging/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          content: newMessage.trim()
        })
      });
      
      if (response.ok) {
        const message = await response.json();
        console.log('Message sent successfully:', message);
        
        // Convert received message to our format
        const formattedMessage = {
          id: message.id,
          conversationId: selectedConversation.id,
          senderId: currentUserId,
          receiverId: selectedConversation.userId,
          content: message.content || newMessage.trim(),
          timestamp: message.createdAt || new Date().toISOString()
        };
        
        // Add to messages state
        const updatedMessages = [...messages, formattedMessage];
        setMessages(updatedMessages);
        
        // Update last message in conversation list
        const updatedConversations = conversations.map(conv => {
          if (conv.id === selectedConversation.id) {
            return {
              ...conv,
              lastMessage: newMessage.trim(),
              lastMessageTime: new Date().toISOString()
            };
          }
          return conv;
        });
        
        setConversations(updatedConversations);
        
        // Show toast success message
        toast({
          title: t('message_sent'),
          description: t('message_sent_to_user', { username: selectedConversation.username }),
        });
      } else {
        console.error('Failed to send message:', await response.text());
        // API failed, fallback to local storage
        fallbackSendMessage();
        
        // Show error toast with hardcoded messages to prevent translation key issues
        toast({
          variant: "destructive",
          title: "Failed to send message",
          description: "Using offline mode. Message saved locally.",
        });
      }
    } catch (error) {
      console.error('Error sending message via API:', error);
      fallbackSendMessage();
      
      // Show error toast with hardcoded messages to prevent raw translation keys from showing
      toast({
        variant: "destructive",
        title: "Failed to send message",
        description: "Using offline mode. Message saved locally.",
      });
    }
    
    // Clear input
    setNewMessage('');
  };
  
  // Fallback to localStorage for offline mode
  const fallbackSendMessage = () => {
    if (!selectedConversation) return;
    
    const newMsg: Message = {
      id: Date.now(),
      conversationId: selectedConversation.id,
      senderId: currentUserId,
      receiverId: selectedConversation.userId,
      content: newMessage.trim(),
      timestamp: new Date().toISOString()
    };
    
    // Add to messages state
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    
    // Save to localStorage
    localStorage.setItem(`twinfix_messages_${selectedConversation.id}`, JSON.stringify(updatedMessages));
    
    // Update last message in conversation list
    const updatedConversations = conversations.map(conv => {
      if (conv.id === selectedConversation.id) {
        return {
          ...conv,
          lastMessage: newMessage.trim(),
          lastMessageTime: new Date().toISOString()
        };
      }
      return conv;
    });
    
    setConversations(updatedConversations);
    localStorage.setItem('twinfix_conversations', JSON.stringify(updatedConversations));
  };
  
  // Start a new conversation via API
  const startNewConversation = async (user: (typeof userList)[0]) => {
    // Check if conversation already exists
    const existing = conversations.find(c => c.userId === user.id);
    if (existing) {
      handleSelectConversation(existing);
      setIsSelectionDialogOpen(false);
      return;
    }
    
    try {
      console.log(`Creating new conversation with user ${user.id} (${user.username})`);
      
      // Create new conversation via API
      const response = await fetch('/api/messaging/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: user.id })
      });
      
      if (response.ok) {
        const newConv = await response.json();
        console.log('New conversation created:', newConv);
        
        // Format the conversation for our UI
        const newConversation: Conversation = {
          id: newConv.id,
          userId: user.id,
          username: user.username,
          role: user.role,
          unreadCount: 0
        };
        
        // Update conversations list
        const updatedConversations = [...conversations, newConversation];
        setConversations(updatedConversations);
        
        // Select the new conversation
        handleSelectConversation(newConversation);
        setIsSelectionDialogOpen(false);
        
        // Show success toast
        toast({
          title: t('conversation_created'),
          description: t('conversation_created_with', { username: user.username }),
        });
      } else {
        console.error('Failed to create conversation:', await response.text());
        
        // Fallback to local creation if API fails
        fallbackCreateConversation(user);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      
      // Fallback to local creation
      fallbackCreateConversation(user);
    }
  };
  
  // Fallback to create conversation locally
  const fallbackCreateConversation = (user: (typeof userList)[0]) => {
    // Create new conversation
    const newConversation: Conversation = {
      id: Date.now(),
      userId: user.id,
      username: user.username,
      role: user.role,
      unreadCount: 0
    };
    
    const updatedConversations = [...conversations, newConversation];
    setConversations(updatedConversations);
    localStorage.setItem('twinfix_conversations', JSON.stringify(updatedConversations));
    
    // Select the new conversation
    handleSelectConversation(newConversation);
    setIsSelectionDialogOpen(false);
    
    // Show warning toast
    toast({
      variant: "destructive", // Using destructive instead of warning as it's a valid variant
      title: t('conversation_created_offline'),
      description: t('conversation_created_with', { username: user.username }),
    });
  };
  
  // Simulate receiving a message from the selected contact
  const simulateReceivedMessage = () => {
    if (!selectedConversation) return;
    
    const newMsg: Message = {
      id: Date.now(),
      conversationId: selectedConversation.id,
      senderId: selectedConversation.userId,
      receiverId: currentUserId,
      content: `${t('test_notification_message')} - ${new Date().toLocaleTimeString()}`,
      timestamp: new Date().toISOString()
    };
    
    // Add to messages list
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    
    // Save to localStorage
    localStorage.setItem(`twinfix_messages_${selectedConversation.id}`, JSON.stringify(updatedMessages));
    
    // Update conversation's last message and unread count
    const updatedConversations = conversations.map(conv => {
      if (conv.id === selectedConversation.id) {
        return {
          ...conv,
          lastMessage: newMsg.content,
          lastMessageTime: new Date().toISOString(),
          unreadCount: conv.unreadCount + 1
        };
      }
      return conv;
    });
    
    setConversations(updatedConversations);
    localStorage.setItem('twinfix_conversations', JSON.stringify(updatedConversations));
    
    // Show notification for this message
    showMessageNotification(newMsg, selectedConversation.username);
  };
  
  // Scroll to bottom of messages when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  return (
    <div className="container mx-auto py-2 sm:py-4 md:py-6 max-w-screen-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-6 md:grid-cols-12 gap-2 sm:gap-3 md:gap-4 h-[75vh] sm:h-[85vh]">
        {/* Left sidebar: Conversations list */}
        <div className={`${selectedConversation ? 'hidden sm:block' : ''} sm:col-span-2 md:col-span-3 lg:col-span-3 border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-gray-900`}>
          <div className="p-3 sm:p-4 flex justify-between items-center border-b bg-gradient-to-r from-primary/5 to-background">
            <div className="flex items-center gap-2">
              <div className="bg-primary/20 p-2 rounded-full">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <h2 className="font-semibold text-base sm:text-lg">{t('messages.conversations')}</h2>
            </div>
            
            <Dialog open={isSelectionDialogOpen} onOpenChange={setIsSelectionDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0 rounded-full"
                  onClick={() => setIsSelectionDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  <span className="sr-only">{t('new_conversation')}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md rounded-xl">
                <DialogHeader>
                  <DialogTitle className="text-xl">{t('new_conversation')}</DialogTitle>
                </DialogHeader>
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('select_a_user_to_start_conversation')}
                  </p>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                      {userList
                        .filter(user => user.id !== currentUserId)
                        .map(user => (
                          <div
                            key={user.id}
                            className="flex items-center p-3 hover:bg-primary/5 rounded-xl cursor-pointer transition-all border border-transparent hover:border-primary/20"
                            onClick={() => startNewConversation(user)}
                          >
                            <Avatar className="h-10 w-10 mr-3 border-2 border-white shadow-sm">
                              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white">
                                {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.username || `User ${user.id}`}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                                {user.role || 'user'}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <ScrollArea className="h-[calc(90vh-3.5rem)] sm:h-[calc(85vh-4rem)]">
            {conversations.length > 0 ? (
              <div className="p-2">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-3 flex items-center gap-3 hover:bg-primary/5 cursor-pointer rounded-xl transition-all border border-transparent ${
                      selectedConversation?.id === conversation.id
                        ? 'bg-primary/10 shadow-sm border-primary/20'
                        : ''
                    }`}
                    onClick={() => handleSelectConversation(conversation)}
                  >
                    <Avatar className="border-2 border-white shadow-sm">
                      <AvatarFallback className={`${
                        selectedConversation?.id === conversation.id 
                          ? 'bg-gradient-to-br from-primary to-primary/80 text-white' 
                          : 'bg-gray-700 text-white'
                      }`}>
                        {conversation.username ? conversation.username.charAt(0).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="font-medium truncate">
                          {conversation.username}
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                          {conversation.unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center h-5 min-w-5 text-xs font-medium rounded-full bg-primary text-primary-foreground">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                      {conversation.lastMessage && (
                        <div className="text-sm text-muted-foreground truncate">
                          {conversation.lastMessage}
                        </div>
                      )}
                      {conversation.lastMessageTime && (
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                          {formatDistanceToNow(new Date(conversation.lastMessageTime), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 p-4 text-center">
                <p className="text-muted-foreground mb-4">{t('no_conversations')}</p>
                <Button
                  onClick={() => setIsSelectionDialogOpen(true)}
                  className="rounded-full px-4"
                >
                  {t('start_new_conversation')}
                </Button>
              </div>
            )}
          </ScrollArea>
        </div>
        
        {/* Right side: Message panel or empty state - takes 2/3 of space on non-mobile */}
        <div className="sm:col-span-4 md:col-span-9 lg:col-span-9 border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-gray-900 h-full flex flex-col">
          {selectedConversation ? (
            <div className="flex flex-col h-full">
              <div className="py-2 px-3 border-b bg-gradient-to-r from-primary/5 to-background">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 mr-1 sm:hidden"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </Button>
                  <Avatar className="h-7 w-7 shadow-sm border-2 border-white">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white">
                      {selectedConversation.username ? 
                        selectedConversation.username.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">
                      {selectedConversation.username || `User ${selectedConversation.userId}`}
                    </h3>
                    <div className="flex items-center">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1"></span>
                      <p className="text-xs text-muted-foreground">
                        {selectedConversation.role || 'user'}
                      </p>
                    </div>
                  </div>
                  <div className="ml-auto">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => simulateReceivedMessage()}
                      className="h-6 text-xs rounded-full px-2 hidden sm:inline-flex"
                    >
                      Test
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-hidden relative bg-slate-50/50 dark:bg-gray-900">
                <ScrollArea className="h-[calc(90vh-6.5rem)] sm:h-[calc(85vh-7rem)] px-3 sm:px-4 py-4">
                  <div className="space-y-3 sm:space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex items-start max-w-[85%] ${message.senderId === currentUserId ? 'flex-row-reverse' : 'flex-row'}`}>
                          <Avatar className={`h-7 w-7 sm:h-8 sm:w-8 ${message.senderId === currentUserId ? 'ml-2' : 'mr-2'} shadow-sm`}>
                            <AvatarFallback className={`${
                              message.senderId === currentUserId 
                                ? 'bg-gradient-to-br from-primary to-primary/80 text-white' 
                                : 'bg-gray-800 text-white'
                            }`}>
                              {message.senderId === currentUserId 
                                ? (localStorage.getItem('twinfix_username')?.charAt(0).toUpperCase() || 'A')
                                : (selectedConversation.username ? 
                                    selectedConversation.username.charAt(0).toUpperCase() : 'U')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div 
                              className={`rounded-2xl px-3 sm:px-4 py-2 shadow-sm ${
                                message.senderId === currentUserId 
                                  ? 'bg-gradient-to-br from-primary to-primary/90 text-white rounded-tr-none' 
                                  : 'bg-white dark:bg-gray-800 text-foreground dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-gray-700'
                              }`}
                            >
                              <p className="text-sm sm:text-base">{message.content}</p>
                            </div>
                            <div className={`text-[10px] sm:text-xs text-muted-foreground mt-1 ${message.senderId === currentUserId ? 'text-right' : 'text-left'}`}>
                              {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </div>
              
              <div className="p-3 sm:p-4 border-t bg-white dark:bg-gray-900">
                <form 
                  className="flex items-center space-x-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                >
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={t('type_message')}
                    className="flex-grow rounded-full border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary shadow-sm dark:bg-gray-800 py-5 px-4"
                  />
                  <Button 
                    type="submit" 
                    size="icon"
                    className="rounded-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 transition-all shadow-sm h-10 w-10"
                    disabled={!newMessage.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="font-medium text-lg">{t('messages.select_conversation')}</h3>
              <p className="text-center max-w-md">{t('messages.select_conversation_description')}</p>
              <Button 
                onClick={() => setIsSelectionDialogOpen(true)}
                className="rounded-full px-4 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80"
              >
                {t('messages.start_new_conversation')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}