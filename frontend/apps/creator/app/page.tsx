'use client';

import { useState } from 'react';
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from 'ui';

export default function CreatorDashboard() {
  const [streamId, setStreamId] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createdStreamId, setCreatedStreamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createStream = () => {
    setIsCreating(true);
    setError(null);
    
    // Generate a random stream ID
    const newStreamId = Math.floor(Math.random() * 1000000).toString();
    setCreatedStreamId(newStreamId);
    setStreamId(newStreamId);
    setIsCreating(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-6">Vilokanam Creator Dashboard</h1>
      
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create New Stream</CardTitle>
          <CardDescription>Set up a new pay-per-second streaming session</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label htmlFor="streamId" className="block text-sm font-medium text-gray-700 mb-1">
                Stream ID
              </label>
              <input
                type="text"
                id="streamId"
                value={streamId}
                onChange={(e) => setStreamId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter stream ID or generate one"
              />
            </div>
            
            <div className="flex space-x-2">
              <Button 
                onClick={createStream} 
                className={`flex-1 ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isCreating ? 'Creating...' : 'Create Stream'}
              </Button>
              
              <Button 
                variant="secondary" 
                onClick={() => setStreamId(Math.floor(Math.random() * 1000000).toString())}
              >
                Generate
              </Button>
            </div>
            
            {createdStreamId && (
              <div className="p-3 bg-green-100 text-green-700 rounded-md">
                <p className="font-medium">Stream Created!</p>
                <p>Stream ID: {createdStreamId}</p>
              </div>
            )}
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
      
      {createdStreamId && (
        <Card className="w-full max-w-md mt-6">
          <CardHeader>
            <CardTitle>Stream Details</CardTitle>
            <CardDescription>Information about your stream</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Stream ID:</span>
                <span className="font-mono">{createdStreamId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="text-green-600">Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Viewers:</span>
                <span>0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Earnings:</span>
                <span>0 DOT</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}