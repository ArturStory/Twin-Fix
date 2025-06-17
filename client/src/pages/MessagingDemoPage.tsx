import React from 'react';
import { MessageDemo } from '@/components/messaging/MessageDemo';

export default function MessagingDemoPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Real-Time Messaging Demo</h1>
      <p className="text-muted-foreground mb-8">
        This page demonstrates how the in-app messaging system works with real-time updates via WebSockets. 
        Open this page in multiple browsers or tabs to test the real-time functionality.
      </p>
      
      <div className="grid md:grid-cols-2 gap-6">
        <MessageDemo />
        <div className="space-y-4">
          <h2 className="text-xl font-bold">How It Works</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Messages are sent through the API</li>
            <li>WebSockets broadcast notifications instantly</li>
            <li>Unread counts update in real-time</li>
            <li>Conversations refresh automatically</li>
            <li>Messages are delivered immediately to recipients</li>
            <li>Read receipts are sent through WebSockets</li>
          </ul>
          
          <div className="bg-muted p-4 rounded-lg mt-6">
            <h3 className="font-semibold mb-2">Instructions:</h3>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Enter a recipient ID (any number for demo purposes)</li>
              <li>Type a message and send it</li>
              <li>Open another browser tab to simulate a different user</li>
              <li>Send messages between tabs to see real-time updates</li>
              <li>Observe how unread counts and notifications work</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}