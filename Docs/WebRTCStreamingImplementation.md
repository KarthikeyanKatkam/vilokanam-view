# WebRTC Streaming Implementation Plan

This document outlines the technical implementation plan for adding WebRTC-based live streaming capabilities to the Vilokanam-view platform. This is a critical component missing from the current implementation that prevents actual video streaming.

## Current State Analysis

The project currently has:
- Simple-peer library installed but not implemented
- Basic creator dashboard with stream controls (UI only)
- Blockchain integration for pay-per-second tracking
- No actual video streaming infrastructure

## Architecture Overview

```
[Broadcaster] --> [Signaling Server] --> [Viewer]
     |                                      |
     |                                      |
     v                                      v
[Media Server] <---> [Media Server] <---> [Media Server]
```

## 1. Signaling Server Implementation

### Technology Stack
- Node.js with Express.js
- WebSocket for real-time communication
- Redis for session storage and scaling

### Key Features
1. **Session Management**
   - Stream creation and lifecycle management
   - Stream key validation
   - Peer connection coordination

2. **Message Types**
   - Offer/Answer exchange for WebRTC
   - ICE candidate sharing
   - Stream state updates
   - Chat messages

### Implementation Steps

#### Step 1: Basic WebSocket Server
```javascript
// signaling-server/index.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const redis = require('redis');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const redisClient = redis.createClient();

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    
    switch(data.type) {
      case 'join_stream':
        handleJoinStream(ws, data);
        break;
      case 'offer':
        handleOffer(ws, data);
        break;
      case 'answer':
        handleAnswer(ws, data);
        break;
      case 'ice_candidate':
        handleIceCandidate(ws, data);
        break;
    }
  });
});

server.listen(8080, () => {
  console.log('Signaling server running on port 8080');
});
```

#### Step 2: Stream Management
```javascript
// signaling-server/streamManager.js
class StreamManager {
  constructor() {
    this.streams = new Map(); // streamId -> stream info
    this.connections = new Map(); // connectionId -> connection info
  }
  
  createStream(streamId, creatorId, streamKey) {
    const stream = {
      id: streamId,
      creatorId,
      streamKey,
      createdAt: new Date(),
      isActive: false,
      viewers: new Set()
    };
    
    this.streams.set(streamId, stream);
    return stream;
  }
  
  validateStreamKey(streamId, streamKey) {
    const stream = this.streams.get(streamId);
    return stream && stream.streamKey === streamKey;
  }
  
  addViewer(streamId, viewerId, ws) {
    const stream = this.streams.get(streamId);
    if (!stream) return false;
    
    stream.viewers.add(viewerId);
    this.connections.set(viewerId, { ws, streamId });
    return true;
  }
}

module.exports = StreamManager;
```

## 2. Frontend Implementation

### Broadcaster Component (Creator App)

#### Step 1: Media Access Component
```typescript
// frontend/apps/creator/components/Broadcaster/MediaAccess.tsx
import React, { useState, useRef } from 'react';

interface MediaAccessProps {
  onStreamReady: (stream: MediaStream) => void;
}

const MediaAccess: React.FC<MediaAccessProps> = ({ onStreamReady }) => {
  const [devices, setDevices] = useState<{cameras: MediaDeviceInfo[], microphones: MediaDeviceInfo[]}>({ 
    cameras: [], 
    microphones: [] 
  });
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const getDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      const microphones = devices.filter(device => device.kind === 'audioinput');
      
      setDevices({ cameras, microphones });
      
      if (cameras.length > 0) setSelectedCamera(cameras[0].deviceId);
      if (microphones.length > 0) setSelectedMicrophone(microphones[0].deviceId);
    } catch (error) {
      console.error('Error getting devices:', error);
    }
  };

  const startStream = async () => {
    try {
      const constraints = {
        video: selectedCamera ? { deviceId: selectedCamera } : true,
        audio: selectedMicrophone ? { deviceId: selectedMicrophone } : true
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      onStreamReady(stream);
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  React.useEffect(() => {
    getDevices();
  }, []);

  return (
    <div className="media-access">
      <div className="device-selection">
        <select 
          value={selectedCamera} 
          onChange={(e) => setSelectedCamera(e.target.value)}
        >
          {devices.cameras.map(camera => (
            <option key={camera.deviceId} value={camera.deviceId}>
              {camera.label || `Camera ${camera.deviceId.substring(0, 5)}`}
            </option>
          ))}
        </select>
        
        <select 
          value={selectedMicrophone} 
          onChange={(e) => setSelectedMicrophone(e.target.value)}
        >
          {devices.microphones.map(mic => (
            <option key={mic.deviceId} value={mic.deviceId}>
              {mic.label || `Microphone ${mic.deviceId.substring(0, 5)}`}
            </option>
          ))}
        </select>
      </div>
      
      <video 
        ref={videoRef} 
        autoPlay 
        muted 
        playsInline
        className="preview-video"
      />
      
      <button onClick={startStream}>Start Streaming</button>
    </div>
  );
};

export default MediaAccess;
```

#### Step 2: WebRTC Broadcaster
```typescript
// frontend/apps/creator/components/Broadcaster/WebRTCBroadcaster.tsx
import React, { useState, useEffect, useRef } from 'react';
import SimplePeer from 'simple-peer';

interface WebRTCBroadcasterProps {
  localStream: MediaStream;
  streamId: string;
  streamKey: string;
}

const WebRTCBroadcaster: React.FC<WebRTCBroadcasterProps> = ({ 
  localStream, 
  streamId, 
  streamKey 
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<SimplePeer.Instance | null>(null);

  const connectToSignalingServer = () => {
    const ws = new WebSocket(`ws://localhost:8080`);
    wsRef.current = ws;
    
    ws.onopen = () => {
      // Join the stream
      ws.send(JSON.stringify({
        type: 'join_stream',
        streamId,
        streamKey,
        role: 'broadcaster'
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch(data.type) {
        case 'viewer_joined':
          createPeerConnection(data.viewerId, data.offer);
          setViewers(prev => prev + 1);
          break;
          
        case 'ice_candidate':
          peerRef.current?.signal({ candidate: data.candidate });
          break;
      }
    };
    
    ws.onerror = (error) => {
      setError('Connection error with signaling server');
      console.error('WebSocket error:', error);
    };
  };

  const createPeerConnection = (viewerId: string, offer: any) => {
    const peer = new SimplePeer({
      initiator: false, // Broadcaster answers offers
      trickle: false,
      stream: localStream
    });
    
    peerRef.current = peer;
    
    peer.on('signal', (data) => {
      // Send answer back to viewer through signaling server
      wsRef.current?.send(JSON.stringify({
        type: 'answer',
        viewerId,
        streamId,
        answer: data
      }));
    });
    
    peer.on('error', (err) => {
      setError('Peer connection error');
      console.error('Peer error:', err);
    });
    
    // Handle the offer from viewer
    peer.signal(offer);
  };

  const startStreaming = () => {
    connectToSignalingServer();
    setIsStreaming(true);
  };

  const stopStreaming = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    setIsStreaming(false);
  };

  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, []);

  return (
    <div className="webrtc-broadcaster">
      <div className="stream-controls">
        {!isStreaming ? (
          <button onClick={startStreaming}>Go Live</button>
        ) : (
          <button onClick={stopStreaming} className="stop-button">End Stream</button>
        )}
        
        <div className="stream-status">
          <span>Status: {isStreaming ? 'Live' : 'Offline'}</span>
          <span>Viewers: {viewers}</span>
        </div>
      </div>
      
      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}
    </div>
  );
};

export default WebRTCBroadcaster;
```

### Viewer Component

#### Step 1: Stream Viewer
```typescript
// frontend/apps/viewer/components/StreamViewer/WebRTCViewer.tsx
import React, { useState, useEffect, useRef } from 'react';
import SimplePeer from 'simple-peer';
import { useTickStream } from 'sdk';

interface WebRTCViewerProps {
  streamId: string;
}

const WebRTCViewer: React.FC<WebRTCViewerProps> = ({ streamId }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const { tickCount } = useTickStream(streamId);

  const connectToStream = () => {
    const ws = new WebSocket(`ws://localhost:8080`);
    wsRef.current = ws;
    
    ws.onopen = () => {
      // Join the stream as viewer
      ws.send(JSON.stringify({
        type: 'join_stream',
        streamId,
        role: 'viewer'
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch(data.type) {
        case 'stream_joined':
          createPeerConnection();
          setIsConnected(true);
          break;
          
        case 'answer':
          peerRef.current?.signal(data.answer);
          break;
          
        case 'ice_candidate':
          peerRef.current?.signal({ candidate: data.candidate });
          break;
          
        case 'stream_ended':
          stopViewing();
          break;
      }
    };
    
    ws.onerror = (error) => {
      setError('Connection error with signaling server');
      console.error('WebSocket error:', error);
    };
  };

  const createPeerConnection = () => {
    const peer = new SimplePeer({
      initiator: true, // Viewer initiates connection
      trickle: false
    });
    
    peerRef.current = peer;
    
    peer.on('signal', (data) => {
      // Send offer to broadcaster through signaling server
      wsRef.current?.send(JSON.stringify({
        type: 'offer',
        streamId,
        offer: data
      }));
    });
    
    peer.on('stream', (stream) => {
      // Received remote stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    });
    
    peer.on('error', (err) => {
      setError('Peer connection error');
      console.error('Peer error:', err);
    });
    
    peer.on('close', () => {
      setIsConnected(false);
    });
  };

  const startViewing = () => {
    connectToStream();
  };

  const stopViewing = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    setIsConnected(false);
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => {
      stopViewing();
    };
  }, []);

  return (
    <div className="webrtc-viewer">
      <div className="video-container">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline
          controls
          className="stream-video"
        />
        
        {!isConnected && (
          <div className="connection-status">
            <button onClick={startViewing}>Connect to Stream</button>
          </div>
        )}
      </div>
      
      <div className="stream-info">
        <div className="tick-counter">
          Ticks: {tickCount}
        </div>
        <div className="connection-status">
          Status: {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
      
      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}
    </div>
  );
};

export default WebRTCViewer;
```

## 3. Media Server Integration

For production deployment, we'll need a scalable media server. We'll use Mediasoup as an example.

### Mediasoup Integration
```javascript
// media-server/index.js
const mediasoup = require('mediasoup');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let worker;
let router;
let transport;

async function initializeMediaServer() {
  // Create a worker
  worker = await mediasoup.createWorker({
    logLevel: 'warn',
    logTags: [
      'info',
      'ice',
      'dtls',
      'rtp',
      'srtp',
      'rtcp',
    ],
    rtcMinPort: 20000,
    rtcMaxPort: 21000,
  });

  // Create a router
  router = await worker.createRouter({ mediaCodecs });

  console.log('Media server initialized');
}

const mediaCodecs = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: {
      'x-google-start-bitrate': 1000
    }
  }
];

// API endpoints for stream management
app.post('/create-transport', async (req, res) => {
  try {
    const { direction } = req.body;
    
    transport = await router.createWebRtcTransport({
      listenIps: [
        {
          ip: '0.0.0.0',
          announcedIp: '127.0.0.1' // Replace with your server's public IP
        }
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });
    
    res.json({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    });
  } catch (error) {
    console.error('Error creating transport:', error);
    res.status(500).json({ error: 'Failed to create transport' });
  }
});

app.listen(3000, () => {
  console.log('Media server API running on port 3000');
  initializeMediaServer();
});
```

## 4. Database Schema Updates

We need to add tables for managing streams and viewers:

```sql
-- Add stream key to streams table
ALTER TABLE streams ADD COLUMN stream_key VARCHAR(255) UNIQUE;

-- Add stream server information
ALTER TABLE streams ADD COLUMN media_server_url VARCHAR(255);
ALTER TABLE streams ADD COLUMN transport_id VARCHAR(255);

-- Add viewer connection tracking
CREATE TABLE viewer_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connection_id VARCHAR(255),
  connected_at TIMESTAMP DEFAULT NOW(),
  disconnected_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_viewer_connections_stream ON viewer_connections(stream_id);
CREATE INDEX idx_viewer_connections_viewer ON viewer_connections(viewer_id);
```

## 5. API Endpoints

### Stream Management API
```typescript
// backend/api/streams.ts
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Create a new stream
router.post('/streams', async (req, res) => {
  try {
    const { creatorId, title, category } = req.body;
    
    // Generate unique stream key
    const streamKey = uuidv4();
    
    // Create stream in database
    const stream = await db.streams.create({
      creatorId,
      title,
      category,
      streamKey,
      status: 'offline'
    });
    
    res.json({ 
      id: stream.id,
      streamKey: stream.streamKey,
      title: stream.title
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create stream' });
  }
});

// Get stream by ID
router.get('/streams/:id', async (req, res) => {
  try {
    const stream = await db.streams.getById(req.params.id);
    
    if (!stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    
    res.json(stream);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stream' });
  }
});

// Start stream
router.post('/streams/:id/start', async (req, res) => {
  try {
    const { streamKey } = req.body;
    const stream = await db.streams.getById(req.params.id);
    
    if (!stream || stream.streamKey !== streamKey) {
      return res.status(401).json({ error: 'Invalid stream key' });
    }
    
    // Update stream status
    await db.streams.update(stream.id, {
      status: 'live',
      startTime: new Date()
    });
    
    res.json({ status: 'live' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start stream' });
  }
});

export default router;
```

## 6. Integration with Blockchain

We need to enhance the existing tick-stream pallet to work with actual streaming:

### Enhanced Tick Recording
```typescript
// frontend/packages/sdk/src/streaming.ts
import { recordTick } from './index';

class StreamingTicker {
  private streamId: string;
  private viewerId: string;
  private account: any;
  private tickInterval: NodeJS.Timeout | null = null;
  private isConnected = false;

  constructor(streamId: string, viewerId: string, account: any) {
    this.streamId = streamId;
    this.viewerId = viewerId;
    this.account = account;
  }

  startTicking() {
    if (this.tickInterval) return;
    
    // Record initial tick when joining stream
    this.recordTick();
    
    // Record ticks every second
    this.tickInterval = setInterval(() => {
      if (this.isConnected) {
        this.recordTick();
      }
    }, 1000);
  }

  stopTicking() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.isConnected = false;
  }

  private async recordTick() {
    try {
      await recordTick(this.streamId, this.viewerId, 1, this.account);
    } catch (error) {
      console.error('Failed to record tick:', error);
      // Stop ticking if there's an error (e.g., insufficient funds)
      this.stopTicking();
    }
  }

  setConnected(connected: boolean) {
    this.isConnected = connected;
  }
}

export default StreamingTicker;
```

## Implementation Timeline

### Week 1
1. Set up signaling server infrastructure
2. Implement basic WebSocket communication
3. Create stream management system

### Week 2
4. Implement broadcaster frontend components
5. Implement viewer frontend components
6. Integrate SimplePeer for WebRTC

### Week 3
7. Add media server integration (Mediasoup)
8. Implement stream lifecycle management
9. Add database schema updates

### Week 4
10. Implement API endpoints
11. Integrate with blockchain tick recording
12. Add error handling and connection recovery

This implementation plan provides a comprehensive approach to adding actual streaming capabilities to the Vilokanam-view platform, transforming it from a blockchain-based payment system into a fully functional live streaming platform.