const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store connections
const connections = new Map();

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('New client connected');
  
  // Assign a unique ID to this connection
  const connectionId = generateConnectionId();
  connections.set(connectionId, ws);
  
  // Send connection ID to client
  ws.send(JSON.stringify({ type: 'connected', connectionId }));
  
  // Handle messages from client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'join_stream':
          handleJoinStream(ws, data, connectionId);
          break;
          
        case 'offer':
          handleOffer(ws, data, connectionId);
          break;
          
        case 'answer':
          handleAnswer(ws, data, connectionId);
          break;
          
        case 'ice_candidate':
          handleIceCandidate(ws, data, connectionId);
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  // Handle client disconnect
  ws.on('close', () => {
    console.log('Client disconnected');
    connections.delete(connectionId);
    
    // Notify other clients that this user has left
    broadcast(JSON.stringify({
      type: 'user_left',
      connectionId
    }), ws);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    connections.delete(connectionId);
  });
});

// Handle joining a stream
function handleJoinStream(ws, data, connectionId) {
  console.log(`User ${connectionId} joining stream ${data.streamId}`);
  
  // Store stream info for this connection
  const connectionInfo = connections.get(connectionId);
  if (connectionInfo) {
    connectionInfo.streamId = data.streamId;
    connectionInfo.role = data.role; // 'broadcaster' or 'viewer'
  }
  
  // Notify the client they've joined successfully
  ws.send(JSON.stringify({
    type: 'stream_joined',
    streamId: data.streamId
  }));
  
  // If this is a viewer joining, notify the broadcaster
  if (data.role === 'viewer') {
    // Find the broadcaster for this stream
    for (const [id, conn] of connections) {
      if (id !== connectionId && conn.streamId === data.streamId && conn.role === 'broadcaster') {
        conn.send(JSON.stringify({
          type: 'viewer_joined',
          viewerId: connectionId,
          streamId: data.streamId
        }));
        break;
      }
    }
  }
}

// Handle WebRTC offer
function handleOffer(ws, data, connectionId) {
  console.log(`Received offer from ${connectionId} for stream ${data.streamId}`);
  
  // Forward offer to the target viewer
  const targetConnection = connections.get(data.viewerId);
  if (targetConnection) {
    targetConnection.send(JSON.stringify({
      type: 'offer',
      broadcasterId: connectionId,
      streamId: data.streamId,
      offer: data.offer
    }));
  }
}

// Handle WebRTC answer
function handleAnswer(ws, data, connectionId) {
  console.log(`Received answer from ${connectionId} for stream ${data.streamId}`);
  
  // Forward answer to the broadcaster
  const targetConnection = connections.get(data.broadcasterId);
  if (targetConnection) {
    targetConnection.send(JSON.stringify({
      type: 'answer',
      viewerId: connectionId,
      streamId: data.streamId,
      answer: data.answer
    }));
  }
}

// Handle ICE candidates
function handleIceCandidate(ws, data, connectionId) {
  // Forward ICE candidate to the target connection
  const targetConnection = connections.get(data.targetId);
  if (targetConnection) {
    targetConnection.send(JSON.stringify({
      type: 'ice_candidate',
      senderId: connectionId,
      candidate: data.candidate
    }));
  }
}

// Broadcast message to all clients except sender
function broadcast(message, sender) {
  for (const [id, conn] of connections) {
    if (conn !== sender && conn.readyState === WebSocket.OPEN) {
      conn.send(message);
    }
  }
}

// Generate a unique connection ID
function generateConnectionId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Serve static files
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', connections: connections.size });
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});