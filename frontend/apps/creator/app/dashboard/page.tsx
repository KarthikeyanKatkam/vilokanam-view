'use client';

import { useState } from 'react';
import { 
  CreatorHeader, 
  StatCard, 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  ChatMessage,
  WebRTCBroadcaster
} from 'ui';

// Mock data
const mockStats = {
  viewers: 1240,
  earnings: 245.67,
  totalStreams: 24,
  avgWatchTime: 12.5,
};

const mockRecentStreams = [
  { id: '1', title: 'Learning Rust Programming', viewers: 320, duration: '45m', earnings: 45.20 },
  { id: '2', title: 'Web Development Tips', viewers: 180, duration: '32m', earnings: 28.50 },
  { id: '3', title: 'Q&A Session', viewers: 95, duration: '28m', earnings: 15.75 },
];

const mockChatMessages = [
  { id: '1', user: 'Viewer123', message: 'Great tutorial!', time: '12:45', isOwn: false },
  { id: '2', user: 'CodeMaster', message: 'Thanks for watching!', time: '12:46', isOwn: true },
  { id: '3', user: 'DevFan', message: 'Can you explain that pattern again?', time: '12:47', isOwn: false },
  { id: '4', user: 'CodeMaster', message: 'Sure! Let me go back and explain...', time: '12:48', isOwn: true },
];

export default function CreatorDashboard() {
  const [streamTitle, setStreamTitle] = useState('Learning Rust Programming');
  const [isStreaming, setIsStreaming] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [chatMessages, setChatMessages] = useState(mockChatMessages);

  const handleSendMessage = () => {
    if (newMessage.trim() !== '') {
      const message = {
        id: (chatMessages.length + 1).toString(),
        user: 'CodeMaster',
        message: newMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOwn: true,
      };
      setChatMessages([...chatMessages, message]);
      setNewMessage('');
    }
  };

  const handleStreamStart = () => {
    setIsStreaming(true);
  };

  const handleStreamStop = () => {
    setIsStreaming(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <CreatorHeader />
      
      <div className="container mx-auto px-4 py-8">
        {/* Dashboard Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Creator Dashboard</h1>
          <Button variant={isStreaming ? "danger" : "primary"} onClick={() => setIsStreaming(!isStreaming)}>
            {isStreaming ? 'End Stream' : 'Go Live'}
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Current Viewers" 
            value={mockStats.viewers.toString()} 
            change="+12%" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>}
          />
          <StatCard 
            title="Earnings (DOT)" 
            value={mockStats.earnings.toFixed(2)} 
            change="+8.5%" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>}
          />
          <StatCard 
            title="Total Streams" 
            value={mockStats.totalStreams.toString()} 
            change="+3" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>}
          />
          <StatCard 
            title="Avg. Watch Time" 
            value={`${mockStats.avgWatchTime}m`} 
            change="+2.1m" 
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stream Controls */}
          <div className="lg:col-span-2">
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Stream Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stream Title</label>
                    <input
                      type="text"
                      value={streamTitle}
                      onChange={(e) => setStreamTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option>Programming</option>
                        <option>Gaming</option>
                        <option>Music</option>
                        <option>Art</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stream Key</label>
                      <div className="flex">
                        <input
                          type="password"
                          value="rtmp-key-12345"
                          readOnly
                          className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <Button variant="outline" className="rounded-l-none">Copy</Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <Button variant="primary">Settings</Button>
                    <Button variant="outline">Preview</Button>
                    <Button variant="outline">Moderation</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* WebRTC Broadcaster */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Live Broadcast</CardTitle>
              </CardHeader>
              <CardContent>
                <WebRTCBroadcaster 
                  streamKey="rtmp-key-12345"
                  onStreamStart={handleStreamStart}
                  onStreamStop={handleStreamStop}
                />
              </CardContent>
            </Card>

            {/* Recent Streams */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Streams</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Viewers</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earnings</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {mockRecentStreams.map((stream) => (
                        <tr key={stream.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{stream.title}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{stream.viewers}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {stream.duration}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {stream.earnings.toFixed(2)} DOT
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Chat */}
          <div>
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>Live Chat</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col">
                <div className="flex-grow overflow-y-auto mb-4 pr-2">
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
                <div className="flex">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your message..."
                    className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button 
                    onClick={handleSendMessage}
                    className="rounded-l-none"
                  >
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}