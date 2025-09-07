'use client';

import { CategoryCard } from 'ui';

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

export default function CategoriesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12 mb-8">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Browse Categories</h1>
          <p className="text-xl">Explore streams by your favorite categories</p>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {mockCategories.map(category => (
            <CategoryCard
              key={category.id}
              name={category.name}
              streamCount={category.streamCount}
            />
          ))}
        </div>
      </div>
    </div>
  );
}