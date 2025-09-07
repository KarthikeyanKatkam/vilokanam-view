'use client';

import { useState, useEffect } from 'react';
import { Header, StreamCard, Button } from 'ui';
import { getLiveStreams } from 'sdk';

export default function Home() {
  const [streams, setStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch featured streams
  useEffect(() => {
    const fetchStreams = async () => {
      try {
        setLoading(true);
        const liveStreams = await getLiveStreams();
        setStreams(liveStreams.slice(0, 4)); // Get first 4 streams as featured
      } catch (error) {
        console.error('Error fetching streams:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStreams();
  }, []);

  return (
    <div className="min-h-screen bg-[#0e0e10]">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#8b5cf6] to-[#0ea5e9] text-white py-20 mb-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6">The Future of Live Streaming</h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Pay only for the time you watch with our revolutionary pay-per-second model. 
            Support creators directly with transparent, real-time payments.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" variant="outline">
              Start Watching
            </Button>
            <Button size="lg" variant="ghost">
              Become a Creator
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        {/* Featured Streams */}
        <section className="mb-16">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-white">Featured Live Streams</h2>
            <a href="/streams" className="text-[#c4b5fd] hover:text-white transition-colors">View All Streams →</a>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <p className="text-[#adadb8]">Loading featured streams...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {streams.map(stream => (
                <a key={stream.id} href={`/streams/${stream.id}`}>
                  <StreamCard
                    title={stream.title}
                    creator={stream.creator}
                    viewerCount={stream.viewerCount}
                    category={stream.category}
                    isLive={stream.isLive}
                  />
                </a>
              ))}
            </div>
          )}
        </section>

        {/* How It Works */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12 text-white">How Vilokanam Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-[#1f1f23] rounded-lg shadow-lg">
              <div className="bg-[#8b5cf6] bg-opacity-20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-[#c4b5fd]">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Find a Stream</h3>
              <p className="text-[#adadb8]">Browse our categories or search for your favorite creators and content.</p>
            </div>
            <div className="text-center p-6 bg-[#1f1f23] rounded-lg shadow-lg">
              <div className="bg-[#8b5cf6] bg-opacity-20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-[#c4b5fd]">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Start Watching</h3>
              <p className="text-[#adadb8]">Connect your wallet and begin watching. You only pay per second.</p>
            </div>
            <div className="text-center p-6 bg-[#1f1f23] rounded-lg shadow-lg">
              <div className="bg-[#8b5cf6] bg-opacity-20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-[#c4b5fd]">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Support Creators</h3>
              <p className="text-[#adadb8]">Your payment goes directly to the creator in real-time.</p>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12 text-white">Why Choose Vilokanam?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 bg-[#1f1f23] rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-4 text-white">For Viewers</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-[#10b981] mr-2">✓</span>
                  <span className="text-[#adadb8]">Pay only for time watched - no subscriptions</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#10b981] mr-2">✓</span>
                  <span className="text-[#adadb8]">Transparent pricing displayed upfront</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#10b981] mr-2">✓</span>
                  <span className="text-[#adadb8]">Directly support your favorite creators</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#10b981] mr-2">✓</span>
                  <span className="text-[#adadb8]">Ad-free viewing experience</span>
                </li>
              </ul>
            </div>
            <div className="p-6 bg-[#1f1f23] rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-4 text-white">For Creators</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-[#10b981] mr-2">✓</span>
                  <span className="text-[#adadb8]">Earn money for every second of content</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#10b981] mr-2">✓</span>
                  <span className="text-[#adadb8]">Direct payments with no intermediaries</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#10b981] mr-2">✓</span>
                  <span className="text-[#adadb8]">Global reach without geographic restrictions</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#10b981] mr-2">✓</span>
                  <span className="text-[#adadb8]">Real-time analytics and earnings tracking</span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}