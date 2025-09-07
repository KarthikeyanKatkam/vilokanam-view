'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, CardContent } from '..';
import { useTickStream, signalingClient } from 'sdk';

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
  const [isSignalingConnected, setIsSignalingConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const { tickCount, isConnected: isBlockchainConnected } = useTickStream(streamId);

  // Connect to signaling server
  const connectSignaling = async () => {
    try {
      await signalingClient.connect();
      setIsSignalingConnected(true);
      
      // Set up message handlers
      signalingClient.onMessage(handleSignalingMessage);
      signalingClient.onClose(() => {
        setIsSignalingConnected(false);
        setIsConnected(false);
      });
      
      // Join the stream as viewer
      signalingClient.joinStream(streamId, 'viewer');
    } catch (err) {
      setError('Failed to connect to signaling server: ' + (err instanceof Error ? err.message : 'Unknown error'));
      console.error('Error connecting to signaling server:', err);
    }
  };

  // Handle messages from signaling server
  const handleSignalingMessage = (data: any) => {
    switch (data.type) {
      case 'stream_joined':
        setIsConnected(true);
        setIsLoading(false);
        if (onJoinStream) onJoinStream();
        break;
        
      case 'offer':
        handleOffer(data.offer);
        break;
        
      case 'ice_candidate':
        handleIceCandidate(data.candidate);
        break;
    }
  };

  // Handle offer from broadcaster
  const handleOffer = async (offer: any) => {
    try {
      if (!peerConnection.current) {
        peerConnection.current = createPeerConnection();
      }
      
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Create answer
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      
      // Send answer to broadcaster through signaling server
      signalingClient.sendAnswer(offer.broadcasterId, streamId, answer);
    } catch (err) {
      console.error('Error handling offer:', err);
    }
  };

  // Handle ICE candidate from broadcaster
  const handleIceCandidate = async (candidate: any) => {
    try {
      if (peerConnection.current && candidate) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.error('Error handling ICE candidate:', err);
    }
  };

  // Create peer connection
  const createPeerConnection = (): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302'
        }
      ]
    });
    
    // Handle incoming stream
    pc.ontrack = (event) => {
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
      }
    };
    
    // Handle ICE candidate
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        signalingClient.sendIceCandidate('', event.candidate);
      }
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setIsConnected(false);
      }
    };
    
    return pc;
  };

  // Join stream
  const joinStream = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await connectSignaling();
    } catch (err) {
      setError('Failed to connect to stream: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setIsLoading(false);
      console.error('Error joining stream:', err);
    }
  };

  // Leave stream
  const leaveStream = () => {
    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    
    // Disconnect from signaling server
    signalingClient.disconnect();
    
    setIsConnected(false);
    setIsSignalingConnected(false);
    setError(null);
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    if (onLeaveStream) onLeaveStream();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveStream();
    };
  }, []);

  return (
    <Card>
      <CardContent>
        <div className="space-y-4">
          {/* Connection Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#1f1f23] p-3 rounded-lg border border-[#262626]">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[#adadb8]">Signaling Server</span>
                <span className={`text-sm ${isSignalingConnected ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                  {isSignalingConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
            
            <div className="bg-[#1f1f23] p-3 rounded-lg border border-[#262626]">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[#adadb8]">Stream Connection</span>
                <span className={`text-sm ${isConnected ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Stream Player */}
          <div className="relative bg-[#000000] rounded-lg overflow-hidden border border-[#262626]">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline
              controls
              className="w-full h-96 object-cover"
            />
            
            {!isConnected && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#000000] bg-opacity-75">
                <div className="text-center">
                  <div className="bg-gradient-to-br from-[#8b5cf6] to-[#0ea5e9] border-2 border-dashed rounded-xl w-16 h-16 mx-auto mb-4" />
                  <p className="text-[#adadb8] mb-4">Stream preview will appear here</p>
                  <Button 
                    onClick={joinStream}
                    disabled={isLoading || isSignalingConnected}
                  >
                    {isLoading ? 'Connecting...' : 'Watch Stream'}
                  </Button>
                </div>
              </div>
            )}
            
            {isConnected && (
              <div className="absolute top-2 left-2 bg-[#ef4444] text-white text-xs font-bold px-2 py-1 rounded-full flex items-center">
                <span className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></span>
                LIVE
              </div>
            )}
          </div>
          
          {/* Stream Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#1f1f23] p-3 rounded-lg border border-[#262626]">
              <p className="text-xs text-[#adadb8]">Status</p>
              <p className="font-medium">
                {isConnected ? (
                  <span className="text-[#10b981]">Connected</span>
                ) : (
                  <span className="text-[#71717a]">Disconnected</span>
                )}
              </p>
            </div>
            
            <div className="bg-[#1f1f23] p-3 rounded-lg border border-[#262626]">
              <p className="text-xs text-[#adadb8]">Blockchain</p>
              <p className="font-medium">
                {isBlockchainConnected ? (
                  <span className="text-[#10b981]">Connected</span>
                ) : (
                  <span className="text-[#ef4444]">Disconnected</span>
                )}
              </p>
            </div>
            
            <div className="bg-[#1f1f23] p-3 rounded-lg border border-[#262626]">
              <p className="text-xs text-[#adadb8]">Ticks</p>
              <p className="font-medium text-white">{tickCount}</p>
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
            <div className="p-3 bg-[#ef4444] bg-opacity-20 text-[#ef4444] rounded-md border border-[#ef4444]">
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WebRTCViewer;