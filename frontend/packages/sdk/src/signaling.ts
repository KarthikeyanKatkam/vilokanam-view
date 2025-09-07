// frontend/packages/sdk/src/signaling.ts

/**
 * Signaling Service
 * 
 * This service handles WebSocket communication with the signaling server
 * for WebRTC connections in the Vilokanam-view platform.
 */

const SIGNALING_SERVER_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || 'ws://localhost:8080';

export class SignalingClient {
  private ws: WebSocket | null = null;
  private connectionId: string | null = null;
  private onMessageCallback: ((data: any) => void) | null = null;
  private onOpenCallback: (() => void) | null = null;
  private onCloseCallback: (() => void) | null = null;
  private onErrorCallback: ((error: any) => void) | null = null;

  /**
   * Connect to the signaling server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(SIGNALING_SERVER_URL);
      
      this.ws.onopen = () => {
        console.log('Connected to signaling server');
        if (this.onOpenCallback) {
          this.onOpenCallback();
        }
        resolve();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'connected' && data.connectionId) {
            this.connectionId = data.connectionId;
            console.log('Assigned connection ID:', this.connectionId);
          }
          
          if (this.onMessageCallback) {
            this.onMessageCallback(data);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };
      
      this.ws.onclose = () => {
        console.log('Disconnected from signaling server');
        if (this.onCloseCallback) {
          this.onCloseCallback();
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('Signaling server error:', error);
        if (this.onErrorCallback) {
          this.onErrorCallback(error);
        }
        reject(error);
      };
    });
  }

  /**
   * Send a message to the signaling server
   */
  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  /**
   * Join a stream
   */
  joinStream(streamId: string, role: 'broadcaster' | 'viewer'): void {
    this.send({
      type: 'join_stream',
      streamId,
      role
    });
  }

  /**
   * Send a WebRTC offer
   */
  sendOffer(viewerId: string, streamId: string, offer: any): void {
    this.send({
      type: 'offer',
      viewerId,
      streamId,
      offer
    });
  }

  /**
   * Send a WebRTC answer
   */
  sendAnswer(broadcasterId: string, streamId: string, answer: any): void {
    this.send({
      type: 'answer',
      broadcasterId,
      streamId,
      answer
    });
  }

  /**
   * Send an ICE candidate
   */
  sendIceCandidate(targetId: string, candidate: any): void {
    this.send({
      type: 'ice_candidate',
      targetId,
      candidate
    });
  }

  /**
   * Disconnect from the signaling server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Set callback for incoming messages
   */
  onMessage(callback: (data: any) => void): void {
    this.onMessageCallback = callback;
  }

  /**
   * Set callback for connection open
   */
  onOpen(callback: () => void): void {
    this.onOpenCallback = callback;
  }

  /**
   * Set callback for connection close
   */
  onClose(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  /**
   * Set callback for connection error
   */
  onError(callback: (error: any) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Get connection ID
   */
  getConnectionId(): string | null {
    return this.connectionId;
  }
}

// Export a singleton instance
export const signalingClient = new SignalingClient();

export default signalingClient;