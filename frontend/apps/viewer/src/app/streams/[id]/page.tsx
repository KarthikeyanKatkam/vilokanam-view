'use client';

import { useState } from 'react';
import { Header, WebRTCViewer, ChatMessage, Button } from 'ui';

// Mock chat messages
const mockChatMessages = [
  { id: '1', user: 'Viewer123', message: 'Great stream!', time: '12:45', isOwn: false },
  { id: '2', creator: 'CodeMaster', message: 'Thanks for watching!', time: '12:46', isOwn: true },
  { id: '3', user: 'DevFan', message: 'Can you explain that pattern again?', time: '12:47', isOwn: false },
  { id: '4', creator: 'CodeMaster', message: 'Sure! Let me go back and explain...', time: '12:48', isOwn: true },
];

export default function StreamViewPage({ params }: { params: { id: string } }) {
  const [chatMessages] = useState(mockChatMessages);
  const [newMessage, setNewMessage] = useState('');
  const streamId = params.id;

  const handleSendMessage = () => {
    if (newMessage.trim() !== '') {
      // In a real app, this would send the message to the chat system
      setNewMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Stream Area */}
          <div className="lg:col-span-3">
            <WebRTCViewer streamId={streamId} />
          </div>
          
          {/* Chat Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Live Chat</h2>
              </div>
              
              <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    user={msg.user || msg.creator}
                    message={msg.message}
                    time={msg.time}
                    isOwn={msg.isOwn}
                  />
                ))}
              </div>
              
              <div className="p-4 border-t">
                <div className="flex">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your message..."
                    className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <Button 
                    onClick={handleSendMessage}
                    className="rounded-l-none px-4 py-2 text-sm"
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}