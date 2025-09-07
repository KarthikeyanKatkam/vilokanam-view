'use client';

import { useState, useEffect } from 'react';
// Import from the local packages using workspace protocol
import { useTickStream } from 'sdk';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from 'ui';

export default function Home() {
  const [streamId, setStreamId] = useState<string>('1');
  const { tickCount, isConnected, error } = useTickStream(streamId);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-6">Vilokanam Stream Viewer</h1>
      
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Stream Information</CardTitle>
          <CardDescription>View and monitor your stream</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <label htmlFor="streamId" className="block text-sm font-medium text-gray-700 mb-1">
              Stream ID
            </label>
            <input
              type="text"
              id="streamId"
              value={streamId}
              onChange={(e) => setStreamId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Connection Status:</span>
              <span className={isConnected ? "text-green-600" : "text-red-600"}>
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tick Count:</span>
              <span className="font-mono">{tickCount}</span>
            </div>
          </div>
        </CardContent>
        {error && (
          <CardFooter>
            <div className="p-3 bg-red-100 text-red-700 rounded-md">
              Error: {error}
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}