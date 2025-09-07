// frontend/packages/ui/src/components/__tests__/WebRTCBroadcaster.test.tsx

/**
 * WebRTC Broadcaster Component Tests
 * 
 * This file contains tests for the WebRTC broadcaster component
 * in the Vilokanam-view platform.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WebRTCBroadcaster from '../WebRTCBroadcaster';

// Mock the signaling client
jest.mock('sdk', () => ({
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

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    enumerateDevices: jest.fn().mockResolvedValue([
      { deviceId: 'camera1', label: 'Front Camera', kind: 'videoinput' },
      { deviceId: 'mic1', label: 'Internal Microphone', kind: 'audioinput' }
    ]),
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [
        { stop: jest.fn() }
      ]
    })
  }
});

describe('WebRTCBroadcaster', () => {
  const defaultProps = {
    streamKey: 'test-stream-key',
    streamId: 'test-stream-id'
  };

  it('should render the component', () => {
    render(<WebRTCBroadcaster {...defaultProps} />);
    
    expect(screen.getByText('Stream Broadcast')).toBeInTheDocument();
    expect(screen.getByText('Camera')).toBeInTheDocument();
    expect(screen.getByText('Microphone')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('should display device selection options', async () => {
    render(<WebRTCBroadcaster {...defaultProps} />);
    
    // Wait for device enumeration
    await screen.findByText('Front Camera');
    
    expect(screen.getByText('Front Camera')).toBeInTheDocument();
    expect(screen.getByText('Internal Microphone')).toBeInTheDocument();
  });

  it('should have start streaming button', () => {
    render(<WebRTCBroadcaster {...defaultProps} />);
    
    const startButton = screen.getByText('Start Streaming');
    expect(startButton).toBeInTheDocument();
    expect(startButton).toBeEnabled();
  });

  it('should disable start button when no devices selected', () => {
    // Mock empty device list
    (navigator.mediaDevices.enumerateDevices as jest.Mock).mockResolvedValueOnce([]);
    
    render(<WebRTCBroadcaster {...defaultProps} />);
    
    const startButton = screen.getByText('Start Streaming');
    expect(startButton).toBeDisabled();
  });
});