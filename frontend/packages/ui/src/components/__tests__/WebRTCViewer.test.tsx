// frontend/packages/ui/src/components/__tests__/WebRTCViewer.test.tsx

/**
 * WebRTC Viewer Component Tests
 * 
 * This file contains tests for the WebRTC viewer component
 * in the Vilokanam-view platform.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import WebRTCViewer from '../WebRTCViewer';

// Mock the signaling client
jest.mock('sdk', () => ({
  signalingClient: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    joinStream: jest.fn(),
    sendAnswer: jest.fn(),
    sendIceCandidate: jest.fn(),
    onMessage: jest.fn(),
    onClose: jest.fn()
  },
  useTickStream: () => ({
    tickCount: 5,
    isConnected: true,
    error: null
  })
}));

describe('WebRTCViewer', () => {
  const defaultProps = {
    streamId: 'test-stream-id'
  };

  it('should render the component', () => {
    render(<WebRTCViewer {...defaultProps} />);
    
    expect(screen.getByText('Stream preview will appear here')).toBeInTheDocument();
    expect(screen.getByText('Watch Stream')).toBeInTheDocument();
  });

  it('should display connection status', () => {
    render(<WebRTCViewer {...defaultProps} />);
    
    expect(screen.getByText('Signaling Server')).toBeInTheDocument();
    expect(screen.getByText('Stream Connection')).toBeInTheDocument();
  });

  it('should display blockchain status', () => {
    render(<WebRTCViewer {...defaultProps} />);
    
    expect(screen.getByText('Blockchain')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('should display tick count', () => {
    render(<WebRTCViewer {...defaultProps} />);
    
    expect(screen.getByText('Ticks')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});