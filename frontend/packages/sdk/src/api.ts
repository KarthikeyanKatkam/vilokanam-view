// frontend/packages/sdk/src/api.ts

/**
 * API Service
 * 
 * This service handles communication with the backend API
 * for the Vilokanam-view platform.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Get a list of all live streams
 */
export const getLiveStreams = async (): Promise<any[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/streams`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching streams:', error);
    throw error;
  }
};

/**
 * Get information about a specific stream
 */
export const getStreamInfo = async (streamId: string): Promise<any | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/streams/${streamId}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching stream info:', error);
    throw error;
  }
};

export default {
  getLiveStreams,
  getStreamInfo
};