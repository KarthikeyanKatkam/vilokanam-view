'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, CardContent } from '..';
import { useTickStream } from 'sdk';

interface WebRTCViewerProps {
  streamId: string;
  onJoinStream?: () => void;
  onLeaveStream?: () => void;
}

const WebRTCViewer: React.FC<WebRTCViewerProps> = ({ 
  streamId, 
  onJoinStream, 
  onLeaveStream 
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const { tickCount, isConnected: isBlockchainConnected } = useTickStream(streamId);

  // Join stream
  const joinStream = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would connect to the WebRTC stream
      // For now, we'll simulate a successful connection
      setTimeout(() => {
        setIsConnected(true);
        setIsLoading(false);
        
        if (onJoinStream) onJoinStream();
      }, 1000);
    } catch (err) {
      setError('Failed to connect to stream: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setIsLoading(false);
      console.error('Error joining stream:', err);
    }
  };

  // Leave stream
  const leaveStream = () => {
    setIsConnected(false);
    setError(null);
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    if (onLeaveStream) onLeaveStream();
  };

  // Simulate receiving a stream (in a real implementation, this would come from WebRTC)
  useEffect(() => {
    if (isConnected && videoRef.current) {
      // This is just for demonstration - in a real app, the stream would come from WebRTC
      // videoRef.current.srcObject = stream;
    }
  }, [isConnected]);

  return (
    <Card>
      <CardContent>
        <div className="space-y-4">
          {/* Stream Player */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline
              controls
              className="w-full h-96 object-cover"
            />
            
            {!isConnected && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
                <div className="text-center">
                  <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 mx-auto mb-4" />
                  <p className="text-white mb-4">Stream preview will appear here</p>
                  <Button 
                    onClick={joinStream}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Connecting...' : 'Watch Stream'}
                  </Button>
                </div>
              </div>
            )}
            
            {isConnected && (
              <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                LIVE
              </div>
            )}
          </div>
          
          {/* Stream Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-blue-600">Status</p>
              <p className="font-medium">
                {isConnected ? (
                  <span className="text-green-600">Connected</span>
                ) : (
                  <span className="text-gray-600">Disconnected</span>
                )}
              </p>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-blue-600">Blockchain</p>
              <p className="font-medium">
                {isBlockchainConnected ? (
                  <span className="text-green-600">Connected</span>
                ) : (
                  <span className="text-red-600">Disconnected</span>
                )}
              </p>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-blue-600">Ticks</p>
              <p className="font-medium">{tickCount}</p>
            </div>
          </div>
          
          {/* Controls */}
          {isConnected && (
            <div className="flex justify-center">
              <Button 
                onClick={leaveStream}
                variant="danger"
              >
                Leave Stream
              </Button>
            </div>
          )}
          
          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-md">
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WebRTCViewer;