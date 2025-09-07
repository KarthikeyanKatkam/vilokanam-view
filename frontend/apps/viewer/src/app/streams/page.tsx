'use client';

import { useState, useEffect } from 'react';
import { Header, StreamCard, CategoryCard, Button } from 'ui';
import { getLiveStreams } from 'sdk';

// Mock data for categories
const mockCategories = [
  { id: '1', name: 'Gaming', streamCount: 120 },
  { id: '2', name: 'Music', streamCount: 45 },
  { id: '3', name: 'Programming', streamCount: 78 },
  { id: '4', name: 'Art', streamCount: 32 },
  { id: '5', name: 'Cooking', streamCount: 56 },
  { id: '6', name: 'Fitness', streamCount: 28 },
  { id: '7', name: 'Education', streamCount: 67 },
  { id: '8', name: 'Entertainment', streamCount: 89 },
  { id: '9', name: 'Sports', streamCount: 23 },
  { id: '10', name: 'News', streamCount: 12 },
  { id: '11', name: 'Travel', streamCount: 19 },
  { id: '12', name: 'Science', streamCount: 34 },
];

export default function StreamsPage() {
  const [streams, setStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');

  // Fetch live streams
  useEffect(() => {
    const fetchStreams = async () => {
      try {
        setLoading(true);
        const liveStreams = await getLiveStreams();
        setStreams(liveStreams);
      } catch (error) {
        console.error('Error fetching streams:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStreams();
  }, []);

  const filteredStreams = streams.filter(stream => {
    const matchesFilter = filter === 'all' || stream.category.toLowerCase() === filter.toLowerCase();
    const matchesSearch = stream.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          stream.creator.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Discover Amazing Streams</h1>
          <p className="text-xl">Explore live streams from creators around the world</p>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-grow">
              <input
                type="text"
                placeholder="Search streams or creators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button variant="primary">Search</Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button 
              variant={filter === 'all' ? 'primary' : 'outline'}
              onClick={() => setFilter('all')}
            >
              All Categories
            </Button>
            {mockCategories.slice(0, 6).map(category => (
              <Button
                key={category.id}
                variant={filter === category.name.toLowerCase() ? 'primary' : 'outline'}
                onClick={() => setFilter(category.name.toLowerCase())}
              >
                {category.name}
              </Button>
            ))}
            <Button variant="outline">More...</Button>
          </div>
        </div>

        {/* Categories Section */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Popular Categories</h2>
            <a href="/categories" className="text-blue-600 hover:underline">View All Categories →</a>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {mockCategories.map(category => (
              <CategoryCard
                key={category.id}
                name={category.name}
                streamCount={category.streamCount}
              />
            ))}
          </div>
        </section>

        {/* Streams Section */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              {filter === 'all' ? 'Live Streams' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Streams`}
            </h2>
            <p className="text-gray-600">{filteredStreams.length} streams</p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">Loading streams...</p>
            </div>
          ) : filteredStreams.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No streams found matching your criteria.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  setSearchQuery('');
                  setFilter('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredStreams.map(stream => (
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
      </div>
    </div>
  );
}