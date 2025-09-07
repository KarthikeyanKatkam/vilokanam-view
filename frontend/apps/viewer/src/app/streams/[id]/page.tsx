'use client';

import { useState, useEffect } from 'react';
import { Header, WebRTCViewer, ChatMessage, Button } from 'ui';
import { getStreamInfo } from 'sdk';

// Mock chat messages
const mockChatMessages = [
  { id: '1', user: 'Viewer123', message: 'Great stream!', time: '12:45', isOwn: false },
  { id: '2', user: 'CodeMaster', message: 'Thanks for watching!', time: '12:46', isOwn: true },
  { id: '3', user: 'DevFan', message: 'Can you explain that pattern again?', time: '12:47', isOwn: false },
  { id: '4', user: 'CodeMaster', message: 'Sure! Let me go back and explain...', time: '12:48', isOwn: true },
];

export default function StreamViewPage({ params }: { params: { id: string } }) {
  const [chatMessages] = useState(mockChatMessages);
  const [newMessage, setNewMessage] = useState('');
  const [streamInfo, setStreamInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const streamId = params.id;

  // Fetch stream info
  useEffect(() => {
    const fetchStreamInfo = async () => {
      try {
        setLoading(true);
        const info = await getStreamInfo(streamId);
        setStreamInfo(info);
      } catch (error) {
        console.error('Error fetching stream info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStreamInfo();
  }, [streamId]);

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
        {/* Stream Header */}
        {loading ? (
          <div className="mb-6">
            <p className="text-gray-600">Loading stream information...</p>
          </div>
        ) : streamInfo ? (
          <div className="mb-6">
            <h1 className="text-3xl font-bold">{streamInfo.title}</h1>
            <div className="flex items-center mt-2">
              <span className="font-medium">{streamInfo.creator}</span>
              <span className="mx-2">•</span>
              <span className="text-gray-600">{streamInfo.viewerCount} viewers</span>
              <span className="mx-2">•</span>
              <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                LIVE
              </span>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Stream Not Found</h1>
            <p className="text-gray-600">The stream you're looking for doesn't exist or is no longer available.</p>
          </div>
        )}
        
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
                    user={msg.user}
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