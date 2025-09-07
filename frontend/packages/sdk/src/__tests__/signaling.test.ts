// frontend/packages/sdk/src/__tests__/signaling.test.ts

/**
 * Signaling Client Tests
 * 
 * This file contains tests for the signaling client functionality
 * in the Vilokanam-view platform.
 */

// Mock the WebSocket
const mockWebSocket = {
  onopen: null,
  onmessage: null,
  onclose: null,
  onerror: null,
  send: jest.fn(),
  close: jest.fn(),
  readyState: WebSocket.OPEN
};

jest.mock('../signaling', () => {
  const originalModule = jest.requireActual('../signaling');
  
  // Mock the WebSocket constructor
  global.WebSocket = jest.fn(() => mockWebSocket) as any;
  
  return {
    ...originalModule
  };
});

import { signalingClient } from '../signaling';

describe('Signaling Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to the signaling server', async () => {
      const connectPromise = signalingClient.connect();
      
      // Simulate WebSocket opening
      mockWebSocket.onopen && mockWebSocket.onopen({} as any);
      
      await expect(connectPromise).resolves.toBeUndefined();
    });
    
    it('should reject if connection fails', async () => {
      const connectPromise = signalingClient.connect();
      
      // Simulate WebSocket error
      mockWebSocket.onerror && mockWebSocket.onerror(new Error('Connection failed'));
      
      await expect(connectPromise).rejects.toThrow('Connection failed');
    });
  });
  
  describe('send', () => {
    it('should send messages when connected', () => {
      // Mock the WebSocket as open
      (mockWebSocket as any).readyState = WebSocket.OPEN;
      
      signalingClient.send({ type: 'test', data: 'test' });
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'test',
        data: 'test'
      }));
    });
    
    it('should not send messages when not connected', () => {
      // Mock the WebSocket as closed
      (mockWebSocket as any).readyState = WebSocket.CLOSED;
      
      signalingClient.send({ type: 'test', data: 'test' });
      
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });
  });
  
  describe('message handling', () => {
    it('should handle connection messages', () => {
      const messageCallback = jest.fn();
      signalingClient.onMessage(messageCallback);
      
      // Simulate receiving a connection message
      mockWebSocket.onmessage && mockWebSocket.onmessage({
        data: JSON.stringify({
          type: 'connected',
          connectionId: 'test-connection-id'
        })
      } as any);
      
      expect(messageCallback).toHaveBeenCalledWith({
        type: 'connected',
        connectionId: 'test-connection-id'
      });
    });
  });
});