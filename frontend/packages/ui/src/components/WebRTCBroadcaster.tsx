'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '..';
import { signalingClient } from 'sdk';

interface WebRTCBroadcasterProps {
  streamKey: string;
  streamId: string;
  onStreamStart?: () => void;
  onStreamStop?: () => void;
}

const WebRTCBroadcaster: React.FC<WebRTCBroadcasterProps> = ({ 
  streamKey, 
  streamId,
  onStreamStart, 
  onStreamStop 
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [devices, setDevices] = useState<{cameras: MediaDeviceInfo[], microphones: MediaDeviceInfo[]}>({ 
    cameras: [], 
    microphones: [] 
  });
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [viewers, setViewers] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());

  // Get available media devices
  const getDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      const microphones = devices.filter(device => device.kind === 'audioinput');
      
      setDevices({ cameras, microphones });
      
      if (cameras.length > 0) setSelectedCamera(cameras[0].deviceId);
      if (microphones.length > 0) setSelectedMicrophone(microphones[0].deviceId);
    } catch (err) {
      setError('Failed to access media devices: ' + (err instanceof Error ? err.message : 'Unknown error'));
      console.error('Error getting devices:', err);
    }
  };

  // Connect to signaling server
  const connectSignaling = async () => {
    try {
      await signalingClient.connect();
      setIsConnected(true);
      
      // Set up message handlers
      signalingClient.onMessage(handleSignalingMessage);
      signalingClient.onClose(() => {
        setIsConnected(false);
      });
      
      // Join the stream as broadcaster
      signalingClient.joinStream(streamId, 'broadcaster');
    } catch (err) {
      setError('Failed to connect to signaling server: ' + (err instanceof Error ? err.message : 'Unknown error'));
      console.error('Error connecting to signaling server:', err);
    }
  };

  // Handle messages from signaling server
  const handleSignalingMessage = (data: any) => {
    switch (data.type) {
      case 'viewer_joined':
        handleViewerJoined(data.viewerId);
        break;
        
      case 'answer':
        handleAnswer(data.viewerId, data.answer);
        break;
        
      case 'ice_candidate':
        handleIceCandidate(data.senderId, data.candidate);
        break;
    }
  };

  // Handle viewer joining
  const handleViewerJoined = async (viewerId: string) => {
    try {
      // Create peer connection for this viewer
      const pc = createPeerConnection(viewerId);
      
      // Add local stream to peer connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }
      
      // Store peer connection
      peerConnections.current.set(viewerId, pc);
      
      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Send offer to viewer through signaling server
      signalingClient.sendOffer(viewerId, streamId, offer);
      
      // Update viewer count
      setViewers(prev => prev + 1);
    } catch (err) {
      console.error('Error handling viewer join:', err);
    }
  };

  // Handle answer from viewer
  const handleAnswer = async (viewerId: string, answer: any) => {
    try {
      const pc = peerConnections.current.get(viewerId);
      if (pc && answer) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (err) {
      console.error('Error handling answer:', err);
    }
  };

  // Handle ICE candidate from viewer
  const handleIceCandidate = async (viewerId: string, candidate: any) => {
    try {
      const pc = peerConnections.current.get(viewerId);
      if (pc && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.error('Error handling ICE candidate:', err);
    }
  };

  // Create peer connection for a viewer
  const createPeerConnection = (viewerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302'
        }
      ]
    });
    
    // Handle ICE candidate
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        signalingClient.sendIceCandidate(viewerId, event.candidate);
      }
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        pc.close();
        peerConnections.current.delete(viewerId);
        setViewers(prev => Math.max(0, prev - 1));
      }
    };
    
    return pc;
  };

  // Start streaming
  const startStreaming = async () => {
    try {
      if (!selectedCamera && !selectedMicrophone) {
        throw new Error('No media devices selected');
      }
      
      // Connect to signaling server
      await connectSignaling();
      
      const constraints = {
        video: selectedCamera ? { deviceId: selectedCamera } : true,
        audio: selectedMicrophone ? { deviceId: selectedMicrophone } : true
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setIsStreaming(true);
      setViewers(0);
      setError(null);
      
      if (onStreamStart) onStreamStart();
    } catch (err) {
      setError('Failed to start streaming: ' + (err instanceof Error ? err.message : 'Unknown error'));
      console.error('Error starting stream:', err);
    }
  };

  // Stop streaming
  const stopStreaming = () => {
    // Close all peer connections
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // Disconnect from signaling server
    signalingClient.disconnect();
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsStreaming(false);
    setIsConnected(false);
    setViewers(0);
    setError(null);
    
    if (onStreamStop) onStreamStop();
  };

  // Initialize devices on component mount
  useEffect(() => {
    getDevices();
    
    // Cleanup on unmount
    return () => {
      stopStreaming();
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-white">Stream Broadcast</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Connection Status */}
          <div className="bg-[#1f1f23] p-3 rounded-lg border border-[#262626]">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-[#adadb8]">Signaling Server</span>
              <span className={`text-sm ${isConnected ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          
          {/* Device Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#adadb8] mb-1">
                Camera
              </label>
              <select 
                value={selectedCamera} 
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="w-full px-3 py-2 border border-[#262626] bg-[#1f1f23] rounded-md focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] text-white"
                disabled={isStreaming}
              >
                {devices.cameras.map(camera => (
                  <option key={camera.deviceId} value={camera.deviceId} className="bg-[#1f1f23]">
                    {camera.label || `Camera ${camera.deviceId.substring(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#adadb8] mb-1">
                Microphone
              </label>
              <select 
                value={selectedMicrophone} 
                onChange={(e) => setSelectedMicrophone(e.target.value)}
                className="w-full px-3 py-2 border border-[#262626] bg-[#1f1f23] rounded-md focus:outline-none focus:ring-2 focus:ring-[#8b5cf6] text-white"
                disabled={isStreaming}
              >
                {devices.microphones.map(mic => (
                  <option key={mic.deviceId} value={mic.deviceId} className="bg-[#1f1f23]">
                    {mic.label || `Microphone ${mic.deviceId.substring(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Stream Preview */}
          <div>
            <label className="block text-sm font-medium text-[#adadb8] mb-1">
              Preview
            </label>
            <div className="relative bg-[#000000] rounded-lg overflow-hidden border border-[#262626]">
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline
                className="w-full h-64 object-cover"
              />
              {!isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#000000] bg-opacity-75">
                  <p className="text-[#adadb8]">Camera preview will appear here</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Stream Info */}
          {isStreaming && (
            <div className="bg-[#8b5cf6] bg-opacity-20 p-4 rounded-lg border border-[#8b5cf6]">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-[#c4b5fd] flex items-center">
                    <span className="w-2 h-2 bg-[#ef4444] rounded-full mr-2 animate-pulse"></span>
                    Live
                  </p>
                  <p className="text-xs text-[#c4b5fd] opacity-80">Stream Key: {streamKey.substring(0, 8)}...</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-[#c4b5fd]">{viewers} viewers</p>
                  <p className="text-xs text-[#c4b5fd] opacity-80">Online now</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Controls */}
          <div className="flex flex-wrap gap-3">
            {!isStreaming ? (
              <Button 
                onClick={startStreaming}
                disabled={!selectedCamera && !selectedMicrophone}
              >
                Start Streaming
              </Button>
            ) : (
              <Button 
                onClick={stopStreaming}
                variant="danger"
              >
                End Stream
              </Button>
            )}
            
            <Button variant="outline" disabled={isStreaming || !isConnected}>
              Settings
            </Button>
          </div>
          
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

export default WebRTCBroadcaster;