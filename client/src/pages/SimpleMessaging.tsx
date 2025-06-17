import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Users, Plus, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Only the actual users from your database
const REAL_USERS = [
  { id: 1, username: "demo", email: "", role: "reporter" },
  { id: 3, username: "artur", email: "artur_story@yahoo.com", role: "admin" },
  { id: 5, username: "testuser", email: "test@example.com", role: "admin" },
  { id: 9, username: "Arek", email: "a.jakubowski@twinstar.pl", role: "owner" },
  { id: 11, username: "Jan", email: "kowalski@gmail.com", role: "repairman" },
  { id: 12, username: "Mikolaj", email: "mikolaj@twinstar.pl", role: "owner" }
];

export default function SimpleMessaging() {
  const { toast } = useToast();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [showUserSelect, setShowUserSelect] = useState(false);
  const [messageText, setMessageText] = useState('');

  // Get conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await fetch('/api/messaging/conversations');
      if (!response.ok) throw new Error('Failed to fetch conversations');
      return response.json();
    }
  });

  // Get messages
  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return [];
      const response = await fetch(`/api/messaging/conversations/${selectedConversationId}/messages`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!selectedConversationId
  });

  // Create conversation
  const createConversationMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch('/api/messaging/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: userId })
      });
      if (!response.ok) throw new Error('Failed to create conversation');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setSelectedConversationId(data.id);
      setShowUserSelect(false);
      toast({
        title: "Success",
        description: "Conversation started successfully"
      });
    }
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: number; content: string }) => {
      const response = await fetch(`/api/messaging/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      // Force refresh the messages immediately
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversationId] });
      queryClient.refetchQueries({ queryKey: ['messages', selectedConversationId] });
      setMessageText('');
    }
  });

  const selectedConversation = conversations.find((c: any) => c.id === selectedConversationId);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversationId || !messageText.trim()) return;
    
    sendMessageMutation.mutate({
      conversationId: selectedConversationId,
      content: messageText.trim()
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Messages</h1>
        </div>
        <Button onClick={() => setShowUserSelect(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Conversation
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Conversations</h2>
          </div>
          <ScrollArea className="h-[500px]">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <p>No conversations yet</p>
              </div>
            ) : (
              conversations.map((conversation: any) => (
                <div
                  key={conversation.id}
                  className={`p-3 border-b cursor-pointer hover:bg-muted/50 ${
                    selectedConversationId === conversation.id ? 'bg-muted border-l-4 border-l-primary' : ''
                  }`}
                  onClick={() => {
                    console.log('Selecting conversation:', conversation.id);
                    setSelectedConversationId(conversation.id);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {conversation.otherUser?.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {conversation.otherUser?.username || 'Unknown User'}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {conversation.otherUser?.role || 'user'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {conversation.lastMessage?.content || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </Card>

        {/* Messages Area */}
        <Card className="lg:col-span-2">
          {selectedConversationId && selectedConversation ? (
            <div className="flex flex-col h-[500px]">
              {/* Header */}
              <div className="p-4 border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {selectedConversation?.otherUser?.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">
                      {selectedConversation?.otherUser?.username || 'Unknown User'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation?.otherUser?.role || 'user'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message: any) => (
                      <div
                        key={message.id}
                        className={`flex ${message.senderId === 3 ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-3 py-2 ${
                            message.senderId === 3
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(message.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Message Input - ALWAYS VISIBLE when conversation selected */}
              <div className="p-4 border-t bg-background">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                    autoFocus
                  />
                  <Button 
                    type="submit" 
                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[500px]">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                <p className="text-muted-foreground mb-6">Choose a conversation to start messaging</p>
                <Button onClick={() => setShowUserSelect(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Start conversation
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* User selection dialog */}
      <Dialog open={showUserSelect} onOpenChange={setShowUserSelect}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Conversation</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {REAL_USERS.filter(user => user.id !== 3).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                  onClick={() => createConversationMutation.mutate(user.id)}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {user.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.username}</span>
                      <Badge variant="secondary" className="text-xs">
                        {user.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}