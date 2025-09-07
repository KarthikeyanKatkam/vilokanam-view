// frontend/packages/sdk/src/__tests__/streaming.test.ts

/**
 * Streaming Service Tests
 * 
 * This file contains tests for the streaming service functionality
 * in the Vilokanam-view platform.
 */

// Mock the signaling client
jest.mock('../signaling', () => ({
  signalingClient: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    joinStream: jest.fn(),
    sendOffer: jest.fn(),
    sendAnswer: jest.fn(),
    sendIceCandidate: jest.fn(),
    onMessage: jest.fn(),
    onClose: jest.fn()
  }
}));

// Mock the API functions
jest.mock('../api', () => ({
  getLiveStreams: jest.fn(),
  getStreamInfo: jest.fn()
}));

import { getLiveStreams, getStreamInfo } from './streaming';

describe('Streaming Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLiveStreams', () => {
    it('should return live streams from API', async () => {
      const mockStreams = [
        {
          id: '1',
          title: 'Test Stream',
          creator: 'Test Creator',
          viewerCount: 100,
          category: 'Gaming',
          isLive: true
        }
      ];
      
      require('../api').getLiveStreams.mockResolvedValue(mockStreams);
      
      const streams = await getLiveStreams();
      
      expect(streams).toEqual(mockStreams);
      expect(require('../api').getLiveStreams).toHaveBeenCalled();
    });
    
    it('should return mock data if API fails', async () => {
      require('../api').getLiveStreams.mockRejectedValue(new Error('API Error'));
      
      const streams = await getLiveStreams();
      
      expect(streams).toBeInstanceOf(Array);
      expect(streams.length).toBeGreaterThan(0);
      expect(require('../api').getLiveStreams).toHaveBeenCalled();
    });
  });
  
  describe('getStreamInfo', () => {
    it('should return stream info from API', async () => {
      const mockStream = {
        id: '1',
        title: 'Test Stream',
        creator: 'Test Creator',
        viewerCount: 100,
        category: 'Gaming',
        isLive: true
      };
      
      require('../api').getStreamInfo.mockResolvedValue(mockStream);
      
      const stream = await getStreamInfo('1');
      
      expect(stream).toEqual(mockStream);
      expect(require('../api').getStreamInfo).toHaveBeenCalledWith('1');
    });
    
    it('should return mock data if API fails', async () => {
      require('../api').getStreamInfo.mockRejectedValue(new Error('API Error'));
      
      const stream = await getStreamInfo('1');
      
      expect(stream).toBeInstanceOf(Object);
      expect(stream).toHaveProperty('id');
      expect(require('../api').getStreamInfo).toHaveBeenCalledWith('1');
    });
    
    it('should return null for non-existent stream', async () => {
      require('../api').getStreamInfo.mockResolvedValue(null);
      
      const stream = await getStreamInfo('999');
      
      expect(stream).toBeNull();
      expect(require('../api').getStreamInfo).toHaveBeenCalledWith('999');
    });
  });
});