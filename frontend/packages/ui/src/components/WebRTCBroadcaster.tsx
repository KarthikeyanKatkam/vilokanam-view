'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '..';

interface WebRTCBroadcasterProps {
  streamKey: string;
  onStreamStart?: () => void;
  onStreamStop?: () => void;
}

const WebRTCBroadcaster: React.FC<WebRTCBroadcasterProps> = ({ 
  streamKey, 
  onStreamStart, 
  onStreamStop 
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
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

  // Start streaming
  const startStreaming = async () => {
    try {
      if (!selectedCamera && !selectedMicrophone) {
        throw new Error('No media devices selected');
      }
      
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
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsStreaming(false);
    setViewers(0);
    setError(null);
    
    if (onStreamStop) onStreamStop();
  };

  // Initialize devices on component mount
  useEffect(() => {
    getDevices();
    
    // Cleanup on unmount
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stream Broadcast</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Device Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Camera
              </label>
              <select 
                value={selectedCamera} 
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isStreaming}
              >
                {devices.cameras.map(camera => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || `Camera ${camera.deviceId.substring(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Microphone
              </label>
              <select 
                value={selectedMicrophone} 
                onChange={(e) => setSelectedMicrophone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isStreaming}
              >
                {devices.microphones.map(mic => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `Microphone ${mic.deviceId.substring(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Stream Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preview
            </label>
            <div className="relative bg-gray-900 rounded-lg overflow-hidden">
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline
                className="w-full h-64 object-cover"
              />
              {!isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
                  <p className="text-white">Camera preview will appear here</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Stream Info */}
          {isStreaming && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-blue-800">Live</p>
                  <p className="text-xs text-blue-600">Stream Key: {streamKey.substring(0, 8)}...</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-blue-800">{viewers} viewers</p>
                  <p className="text-xs text-blue-600">Online now</p>
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
            
            <Button variant="outline" disabled={isStreaming}>
              Settings
            </Button>
          </div>
          
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

export default WebRTCBroadcaster;