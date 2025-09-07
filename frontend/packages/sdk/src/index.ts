import { ApiPromise, WsProvider } from '@polkadot/api';
import { useEffect, useState } from 'react';

// Define types
type Hash = string;

// Initialize the API connection
let api: ApiPromise | null = null;

const initializeApi = async () => {
  if (!api) {
    const provider = new WsProvider('ws://127.0.0.1:9944');
    api = await ApiPromise.create({ provider });
    await api.isReady;
  }
  return api;
};

// Custom hook to get tick count for a stream
export const useTickStream = (streamId: string) => {
  const [tickCount, setTickCount] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let isMounted = true;

    const connect = async () => {
      try {
        const api = await initializeApi();
        setIsConnected(true);
        setError(null);

        // Subscribe to tick count changes
        const unsub = await api.query.tickStream.tickCount(streamId, (result: any) => {
          if (isMounted) {
            const count = result.toNumber();
            setTickCount(count);
          }
        });
        
        // Store the unsubscribe function
        unsubscribe = unsub as unknown as () => void;
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setIsConnected(false);
        }
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [streamId]);

  return { tickCount, isConnected, error };
};

// Function to join a stream
export const joinStream = async (streamId: string, account: any): Promise<string> => {
  try {
    const api = await initializeApi();
    const tx = api.tx.tickStream.joinStream(streamId);
    const hash: string = (await tx.signAndSend(account)) as unknown as string;
    return hash;
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Unknown error');
  }
};

// Function to record a tick
export const recordTick = async (streamId: string, viewer: string, ticks: number, account: any): Promise<string> => {
  try {
    const api = await initializeApi();
    const tx = api.tx.tickStream.recordTick(streamId, viewer, ticks);
    const hash: string = (await tx.signAndSend(account)) as unknown as string;
    return hash;
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Unknown error');
  }
};

// Re-export streaming functions
export * from './streaming';

// Re-export API functions
export * from './api';

// Re-export signaling client
export * from './signaling';