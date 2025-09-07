# Video Search and Discovery Implementation Plan

## Overview

This document outlines the plan for implementing comprehensive video search and discovery features for the Vilokanam-view platform. These features will enable users to easily find content through keyword search, category browsing, personalized recommendations, and trending content displays.

## Current State Analysis

The platform currently has:
- Basic frontend applications with minimal discovery features
- No search functionality
- No recommendation system
- No category browsing
- No trending content displays

## Search and Discovery Requirements

### Core Features
1. Full-text search across video metadata
2. Faceted search with filters
3. Category-based browsing
4. Personalized recommendations
5. Trending content discovery
6. Content similarity recommendations

### Technical Requirements
1. High-performance search engine integration
2. Real-time indexing of new content
3. Scalable recommendation algorithms
4. Caching for improved performance
5. Analytics for search optimization

## System Architecture

### Component Overview

#### 1. Search Service
- Elasticsearch integration for full-text search
- Index management and updates
- Search query processing
- Faceted search implementation

#### 2. Recommendation Engine
- Collaborative filtering algorithms
- Content-based recommendation
- Trending content calculation
- Personalization engine

#### 3. Discovery API
- Search endpoint
- Recommendation endpoints
- Category browsing endpoints
- Trending content endpoints

#### 4. Indexing Service
- Real-time content indexing
- Metadata extraction
- Index optimization
- Batch processing for large datasets

### Data Flow

1. **Content Indexing**
   - New video/stream creation
   - Metadata extraction
   - Elasticsearch indexing
   - Real-time updates

2. **Search Processing**
   - User search query
   - Query parsing and processing
   - Elasticsearch search
   - Result filtering and ranking

3. **Recommendation Generation**
   - User behavior analysis
   - Content similarity calculation
   - Trending algorithm processing
   - Personalized recommendation generation

## Search Service Implementation

### Elasticsearch Integration

#### Index Schema
```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "title": { "type": "text", "analyzer": "standard" },
      "description": { "type": "text", "analyzer": "standard" },
      "creator_id": { "type": "keyword" },
      "creator_name": { "type": "text" },
      "category_id": { "type": "keyword" },
      "category_name": { "type": "keyword" },
      "tags": { "type": "keyword" },
      "duration": { "type": "integer" },
      "view_count": { "type": "integer" },
      "like_count": { "type": "integer" },
      "comment_count": { "type": "integer" },
      "published_at": { "type": "date" },
      "created_at": { "type": "date" },
      "status": { "type": "keyword" },
      "content_type": { "type": "keyword" },
      "thumbnail_url": { "type": "keyword" },
      "suggestions": {
        "type": "completion",
        "analyzer": "simple",
        "preserve_separators": false
      }
    }
  }
}
```

#### Search Service Implementation
```javascript
// services/search-service.js
import { Client } from '@elastic/elasticsearch';
import redis from 'redis';

class SearchService {
  constructor() {
    this.esClient = new Client({ node: process.env.ELASTICSEARCH_URL });
    this.redisClient = redis.createClient();
  }

  // Index video content
  async indexVideo(video) {
    try {
      const doc = {
        id: video.id,
        title: video.title,
        description: video.description,
        creator_id: video.creator_id,
        creator_name: video.creator?.username,
        category_id: video.category_id,
        category_name: video.category?.name,
        tags: video.tags || [],
        duration: video.duration,
        view_count: video.view_count || 0,
        like_count: video.like_count || 0,
        comment_count: video.comment_count || 0,
        published_at: video.published_at,
        created_at: video.created_at,
        status: video.status,
        content_type: video.content_type || 'video',
        thumbnail_url: video.thumbnail_url,
        suggestions: [
          video.title,
          video.creator?.username,
          ...(video.tags || [])
        ]
      };

      await this.esClient.index({
        index: 'videos',
        id: video.id,
        document: doc
      });

      // Clear search cache
      await this.redisClient.del('search:popular_queries');
    } catch (error) {
      console.error('Video indexing failed:', error);
      throw new Error('Failed to index video');
    }
  }

  // Remove video from index
  async removeVideo(videoId) {
    try {
      await this.esClient.delete({
        index: 'videos',
        id: videoId
      });
    } catch (error) {
      console.error('Video removal failed:', error);
    }
  }

  // Search videos
  async searchVideos(query, filters = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'relevance',
        sortOrder = 'desc'
      } = options;

      const from = (page - 1) * limit;

      // Build search query
      const esQuery = {
        bool: {
          must: query ? [
            {
              multi_match: {
                query: query,
                fields: ['title^2', 'description', 'creator_name', 'tags'],
                fuzziness: 'AUTO'
              }
            }
          ] : [],
          filter: []
        }
      };

      // Apply filters
      if (filters.category) {
        esQuery.bool.filter.push({
          term: { category_id: filters.category }
        });
      }

      if (filters.contentType) {
        esQuery.bool.filter.push({
          term: { content_type: filters.contentType }
        });
      }

      if (filters.duration) {
        const durationFilters = {
          'short': { range: { duration: { lt: 300 } } },      // < 5 minutes
          'medium': { range: { duration: { gte: 300, lt: 1200 } } }, // 5-20 minutes
          'long': { range: { duration: { gte: 1200 } } }     // > 20 minutes
        };
        if (durationFilters[filters.duration]) {
          esQuery.bool.filter.push(durationFilters[filters.duration]);
        }
      }

      if (filters.date) {
        const dateFilters = {
          'today': { range: { published_at: { gte: 'now/d' } } },
          'week': { range: { published_at: { gte: 'now/w' } } },
          'month': { range: { published_at: { gte: 'now/M' } } },
          'year': { range: { published_at: { gte: 'now/y' } } }
        };
        if (dateFilters[filters.date]) {
          esQuery.bool.filter.push(dateFilters[filters.date]);
        }
      }

      // Build sort criteria
      const sort = [];
      switch (sortBy) {
        case 'date':
          sort.push({ published_at: sortOrder });
          break;
        case 'views':
          sort.push({ view_count: sortOrder });
          break;
        case 'likes':
          sort.push({ like_count: sortOrder });
          break;
        default:
          sort.push({ _score: sortOrder });
      }

      // Execute search
      const result = await this.esClient.search({
        index: 'videos',
        body: {
          query: esQuery,
          from: from,
          size: limit,
          sort: sort,
          highlight: {
            fields: {
              title: {},
              description: {}
            }
          }
        }
      });

      // Process results
      const videos = result.hits.hits.map(hit => ({
        ...hit._source,
        id: hit._id,
        score: hit._score,
        highlights: hit.highlight
      }));

      return {
        videos: videos,
        total: result.hits.total.value,
        page: page,
        limit: limit
      };
    } catch (error) {
      console.error('Video search failed:', error);
      throw new Error('Search service unavailable');
    }
  }

  // Get search suggestions
  async getSuggestions(query) {
    try {
      // Try cache first
      const cached = await this.redisClient.get(`search:suggestions:${query}`);
      if (cached) {
        return JSON.parse(cached);
      }

      const result = await this.esClient.search({
        index: 'videos',
        body: {
          suggest: {
            suggestions: {
              prefix: query,
              completion: {
                field: 'suggestions',
                fuzzy: {
                  fuzziness: 'AUTO'
                },
                size: 10
              }
            }
          }
        }
      });

      const suggestions = result.suggest?.suggestions?.[0]?.options?.map(
        option => option.text
      ) || [];

      // Cache for 1 hour
      await this.redisClient.setex(
        `search:suggestions:${query}`,
        3600,
        JSON.stringify(suggestions)
      );

      return suggestions;
    } catch (error) {
      console.error('Search suggestions failed:', error);
      return [];
    }
  }

  // Get popular search queries
  async getPopularQueries() {
    try {
      // Try cache first
      const cached = await this.redisClient.get('search:popular_queries');
      if (cached) {
        return JSON.parse(cached);
      }

      // Get from analytics or use default popular queries
      const popularQueries = [
        'gaming', 'music', 'tutorial', 'live', 'tech', 'cooking', 'travel'
      ];

      // Cache for 24 hours
      await this.redisClient.setex(
        'search:popular_queries',
        86400,
        JSON.stringify(popularQueries)
      );

      return popularQueries;
    } catch (error) {
      console.error('Popular queries retrieval failed:', error);
      return [];
    }
  }

  // Get search facets
  async getSearchFacets(query, filters = {}) {
    try {
      const esQuery = {
        bool: {
          must: query ? [
            {
              multi_match: {
                query: query,
                fields: ['title', 'description', 'creator_name', 'tags']
              }
            }
          ] : [],
          filter: []
        }
      };

      // Apply existing filters
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          esQuery.bool.filter.push({
            term: { [key]: filters[key] }
          });
        }
      });

      const result = await this.esClient.search({
        index: 'videos',
        body: {
          query: esQuery,
          aggs: {
            categories: {
              terms: { field: 'category_name' }
            },
            content_types: {
              terms: { field: 'content_type' }
            },
            durations: {
              range: {
                field: 'duration',
                ranges: [
                  { key: 'short', to: 300 },
                  { key: 'medium', from: 300, to: 1200 },
                  { key: 'long', from: 1200 }
                ]
              }
            }
          },
          size: 0
        }
      });

      return {
        categories: result.aggregations.categories.buckets,
        content_types: result.aggregations.content_types.buckets,
        durations: result.aggregations.durations.buckets
      };
    } catch (error) {
      console.error('Search facets retrieval failed:', error);
      return {
        categories: [],
        content_types: [],
        durations: []
      };
    }
  }
}

export default SearchService;
```

## Recommendation Engine Implementation

### Recommendation Service

#### Core Implementation
```javascript
// services/recommendation-service.js
import redis from 'redis';

class RecommendationService {
  constructor(db) {
    this.db = db;
    this.redisClient = redis.createClient();
  }

  // Get personalized recommendations for user
  async getPersonalizedRecommendations(userId, limit = 20) {
    try {
      // Try cache first
      const cached = await this.redisClient.get(`recommendations:user:${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get user's viewing history
      const viewingHistory = await this.db.video_views.getUserHistory(userId, 50);
      
      // Get user's followed creators
      const followedCreators = await this.db.follows.getFollowing(userId);
      
      // Get user's liked videos
      const likedVideos = await this.db.video_likes.getUserLikes(userId);
      
      // Combine all user interests
      const userInterests = this.extractUserInterests(
        viewingHistory, 
        followedCreators, 
        likedVideos
      );
      
      // Get content-based recommendations
      const contentBased = await this.getContentBasedRecommendations(
        userInterests, 
        userId,
        limit
      );
      
      // Get collaborative filtering recommendations
      const collaborative = await this.getCollaborativeRecommendations(
        userId, 
        limit
      );
      
      // Combine and rank recommendations
      const recommendations = this.combineAndRankRecommendations(
        contentBased, 
        collaborative,
        viewingHistory
      ).slice(0, limit);
      
      // Cache for 1 hour
      await this.redisClient.setex(
        `recommendations:user:${userId}`,
        3600,
        JSON.stringify(recommendations)
      );
      
      return recommendations;
    } catch (error) {
      console.error('Personalized recommendations failed:', error);
      return [];
    }
  }

  // Extract user interests from behavior data
  extractUserInterests(viewingHistory, followedCreators, likedVideos) {
    const interests = {
      categories: {},
      creators: {},
      tags: {}
    };

    // Extract from viewing history
    viewingHistory.forEach(view => {
      if (view.video.category) {
        interests.categories[view.video.category] = 
          (interests.categories[view.video.category] || 0) + 1;
      }
      
      interests.creators[view.video.creator_id] = 
        (interests.creators[view.video.creator_id] || 0) + 1;
      
      if (view.video.tags) {
        view.video.tags.forEach(tag => {
          interests.tags[tag] = (interests.tags[tag] || 0) + 1;
        });
      }
    });

    // Extract from followed creators
    followedCreators.forEach(creator => {
      interests.creators[creator.id] = 
        (interests.creators[creator.id] || 0) + 2; // Weight more heavily
    });

    // Extract from liked videos
    likedVideos.forEach(like => {
      if (like.video.category) {
        interests.categories[like.video.category] = 
          (interests.categories[like.video.category] || 0) + 2;
      }
      
      interests.creators[like.video.creator_id] = 
        (interests.creators[like.video.creator_id] || 0) + 2;
      
      if (like.video.tags) {
        like.video.tags.forEach(tag => {
          interests.tags[tag] = (interests.tags[tag] || 0) + 2;
        });
      }
    });

    return interests;
  }

  // Get content-based recommendations
  async getContentBasedRecommendations(interests, userId, limit) {
    try {
      // Find videos matching user interests
      const recommendedVideos = await this.db.videos.findByInterests(
        interests, 
        userId,
        limit * 2
      );
      
      // Score videos based on interest match
      return recommendedVideos.map(video => {
        let score = 0;
        
        // Category match scoring
        if (video.category && interests.categories[video.category]) {
          score += interests.categories[video.category] * 2;
        }
        
        // Creator match scoring
        if (interests.creators[video.creator_id]) {
          score += interests.creators[video.creator_id] * 3;
        }
        
        // Tag match scoring
        if (video.tags) {
          video.tags.forEach(tag => {
            if (interests.tags[tag]) {
              score += interests.tags[tag];
            }
          });
        }
        
        // Recency bonus
        const daysOld = (Date.now() - new Date(video.published_at).getTime()) / (1000 * 60 * 60 * 24);
        const recencyBonus = Math.max(0, 10 - daysOld / 10);
        score += recencyBonus;
        
        return {
          ...video,
          recommendation_score: score
        };
      }).sort((a, b) => b.recommendation_score - a.recommendation_score);
    } catch (error) {
      console.error('Content-based recommendations failed:', error);
      return [];
    }
  }

  // Get collaborative filtering recommendations
  async getCollaborativeRecommendations(userId, limit) {
    try {
      // Find users with similar viewing patterns
      const similarUsers = await this.db.users.findSimilarUsers(userId, 20);
      
      // Get videos watched by similar users but not by current user
      const recommendedVideos = await this.db.videos.findBySimilarUsers(
        userId,
        similarUsers,
        limit
      );
      
      // Score based on popularity among similar users
      return recommendedVideos.map(video => {
        const similarUserViews = similarUsers.filter(user => 
          user.viewed_videos.includes(video.id)
        ).length;
        
        return {
          ...video,
          recommendation_score: similarUserViews
        };
      }).sort((a, b) => b.recommendation_score - a.recommendation_score);
    } catch (error) {
      console.error('Collaborative recommendations failed:', error);
      return [];
    }
  }

  // Combine and rank recommendations
  combineAndRankRecommendations(contentBased, collaborative, viewingHistory) {
    // Create map of viewed video IDs
    const viewedVideoIds = new Set(
      viewingHistory.map(view => view.video_id)
    );
    
    // Combine recommendations
    const allRecommendations = new Map();
    
    // Add content-based recommendations
    contentBased.forEach(video => {
      if (!viewedVideoIds.has(video.id)) {
        allRecommendations.set(video.id, {
          ...video,
          content_score: video.recommendation_score,
          collaborative_score: 0
        });
      }
    });
    
    // Add collaborative recommendations
    collaborative.forEach(video => {
      if (!viewedVideoIds.has(video.id)) {
        if (allRecommendations.has(video.id)) {
          // Update existing recommendation
          const existing = allRecommendations.get(video.id);
          allRecommendations.set(video.id, {
            ...existing,
            collaborative_score: video.recommendation_score
          });
        } else {
          // Add new recommendation
          allRecommendations.set(video.id, {
            ...video,
            content_score: 0,
            collaborative_score: video.recommendation_score
          });
        }
      }
    });
    
    // Calculate final scores (weighted average)
    const combined = Array.from(allRecommendations.values()).map(video => {
      const finalScore = (video.content_score * 0.6) + (video.collaborative_score * 0.4);
      return {
        ...video,
        final_score: finalScore
      };
    });
    
    // Sort by final score
    return combined.sort((a, b) => b.final_score - a.final_score);
  }

  // Get trending content
  async getTrendingContent(limit = 20) {
    try {
      // Try cache first
      const cached = await this.redisClient.get('recommendations:trending');
      if (cached) {
        return JSON.parse(cached);
      }

      // Calculate trending score based on recent activity
      const trendingVideos = await this.db.videos.getTrending(limit);
      
      // Score videos based on recent views, likes, and engagement
      const scoredVideos = trendingVideos.map(video => {
        const ageInHours = (Date.now() - new Date(video.published_at).getTime()) / (1000 * 60 * 60);
        const recencyFactor = Math.max(0.1, 1 - (ageInHours / 168)); // 168 hours = 1 week
        
        const engagementScore = (
          (video.view_count || 0) * 0.5 +
          (video.like_count || 0) * 2 +
          (video.comment_count || 0) * 3
        );
        
        const trendingScore = engagementScore * recencyFactor;
        
        return {
          ...video,
          trending_score: trendingScore
        };
      }).sort((a, b) => b.trending_score - a.trending_score);
      
      // Cache for 30 minutes
      await this.redisClient.setex(
        'recommendations:trending',
        1800,
        JSON.stringify(scoredVideos)
      );
      
      return scoredVideos;
    } catch (error) {
      console.error('Trending content retrieval failed:', error);
      return [];
    }
  }

  // Get category-based recommendations
  async getCategoryRecommendations(categoryId, limit = 20) {
    try {
      const videos = await this.db.videos.findByCategory(categoryId, limit);
      
      // Score by popularity and recency
      return videos.map(video => {
        const ageInDays = (Date.now() - new Date(video.published_at).getTime()) / (1000 * 60 * 60 * 24);
        const recencyBonus = Math.max(0, 7 - ageInDays);
        
        const popularityScore = (
          (video.view_count || 0) +
          (video.like_count || 0) * 2 +
          (video.comment_count || 0) * 3
        );
        
        return {
          ...video,
          recommendation_score: popularityScore + recencyBonus
        };
      }).sort((a, b) => b.recommendation_score - a.recommendation_score);
    } catch (error) {
      console.error('Category recommendations failed:', error);
      return [];
    }
  }

  // Update recommendation cache when user activity changes
  async updateUserRecommendations(userId) {
    try {
      // Invalidate user recommendations cache
      await this.redisClient.del(`recommendations:user:${userId}`);
      
      // Rebuild cache in background
      setImmediate(async () => {
        await this.getPersonalizedRecommendations(userId);
      });
    } catch (error) {
      console.error('User recommendations update failed:', error);
    }
  }
}

export default RecommendationService;
```

## Discovery API Implementation

### API Routes

#### Search and Discovery Routes
```javascript
// routes/discovery.js
import express from 'express';
import SearchService from '../services/search-service';
import RecommendationService from '../services/recommendation-service';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const searchService = new SearchService();
const recommendationService = new RecommendationService();

// Search videos
router.get('/search', async (req, res) => {
  try {
    const {
      q: query,
      category,
      contentType,
      duration,
      date,
      page,
      limit,
      sortBy,
      sortOrder
    } = req.query;

    const filters = {
      category: category || undefined,
      contentType: contentType || undefined,
      duration: duration || undefined,
      date: date || undefined
    };

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      sortBy: sortBy || 'relevance',
      sortOrder: sortOrder || 'desc'
    };

    const result = await searchService.searchVideos(query, filters, options);
    
    res.json(result);
  } catch (error) {
    console.error('Search failed:', error);
    res.status(500).json({ error: 'Search service unavailable' });
  }
});

// Get search suggestions
router.get('/search/suggestions', async (req, res) => {
  try {
    const { q: query } = req.query;
    const suggestions = await searchService.getSuggestions(query);
    res.json({ suggestions });
  } catch (error) {
    console.error('Suggestions failed:', error);
    res.status(500).json({ error: 'Suggestions service unavailable' });
  }
});

// Get popular search queries
router.get('/search/popular', async (req, res) => {
  try {
    const queries = await searchService.getPopularQueries();
    res.json({ queries });
  } catch (error) {
    console.error('Popular queries failed:', error);
    res.status(500).json({ error: 'Popular queries service unavailable' });
  }
});

// Get search facets
router.get('/search/facets', async (req, res) => {
  try {
    const {
      q: query,
      category,
      contentType,
      duration,
      date
    } = req.query;

    const filters = {
      category: category || undefined,
      contentType: contentType || undefined,
      duration: duration || undefined,
      date: date || undefined
    };

    const facets = await searchService.getSearchFacets(query, filters);
    res.json(facets);
  } catch (error) {
    console.error('Search facets failed:', error);
    res.status(500).json({ error: 'Search facets service unavailable' });
  }
});

// Get personalized recommendations
router.get('/recommendations/personalized', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const recommendations = await recommendationService.getPersonalizedRecommendations(
      req.user.userId, 
      limit
    );
    res.json({ recommendations });
  } catch (error) {
    console.error('Personalized recommendations failed:', error);
    res.status(500).json({ error: 'Recommendations service unavailable' });
  }
});

// Get trending content
router.get('/recommendations/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const trending = await recommendationService.getTrendingContent(limit);
    res.json({ trending });
  } catch (error) {
    console.error('Trending content failed:', error);
    res.status(500).json({ error: 'Trending content service unavailable' });
  }
});

// Get category recommendations
router.get('/recommendations/category/:categoryId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const recommendations = await recommendationService.getCategoryRecommendations(
      req.params.categoryId, 
      limit
    );
    res.json({ recommendations });
  } catch (error) {
    console.error('Category recommendations failed:', error);
    res.status(500).json({ error: 'Category recommendations service unavailable' });
  }
});

// Get featured content
router.get('/featured', async (req, res) => {
  try {
    // Get mix of trending, popular, and fresh content
    const [trending, popular, fresh] = await Promise.all([
      recommendationService.getTrendingContent(10),
      searchService.searchVideos('', { sortBy: 'views' }, { limit: 10 }),
      searchService.searchVideos('', { sortBy: 'date' }, { limit: 10 })
    ]);

    res.json({
      trending: trending.slice(0, 5),
      popular: popular.videos.slice(0, 5),
      fresh: fresh.videos.slice(0, 5)
    });
  } catch (error) {
    console.error('Featured content failed:', error);
    res.status(500).json({ error: 'Featured content service unavailable' });
  }
});

export default router;
```

## Frontend Search and Discovery Implementation

### Search Component

#### Implementation
```jsx
// components/discovery/SearchBar.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Button } from 'ui';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const router = useRouter();

  // Fetch search suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length > 2) {
        try {
          const response = await fetch(`/api/discovery/search/suggestions?q=${encodeURIComponent(query)}`);
          const data = await response.json();
          setSuggestions(data.suggestions);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Suggestions fetch failed:', error);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    router.push(`/search?q=${encodeURIComponent(suggestion)}`);
    setShowSuggestions(false);
  };

  return (
    <div className="search-bar relative">
      <form onSubmit={handleSearch} className="relative">
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search videos, creators, or topics..."
          className="w-full pl-10 pr-20"
          onFocus={() => query.length > 2 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
        <Button type="submit" className="absolute right-2 top-1/2 transform -translate-y-1/2">
          Search
        </Button>
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Search Results Page

#### Implementation
```jsx
// pages/search.tsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { VideoGrid, SearchFilters, Pagination } from 'ui';
import { SearchBar } from 'components/discovery';

export default function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const contentType = searchParams.get('contentType') || '';
  const duration = searchParams.get('duration') || '';
  const date = searchParams.get('date') || '';
  const sortBy = searchParams.get('sortBy') || 'relevance';
  const page = parseInt(searchParams.get('page') || '1');

  const [results, setResults] = useState({
    videos: [],
    total: 0,
    page: 1,
    limit: 20
  });
  
  const [facets, setFacets] = useState({
    categories: [],
    content_types: [],
    durations: []
  });
  
  const [loading, setLoading] = useState(true);

  // Fetch search results
  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      
      try {
        // Build query parameters
        const params = new URLSearchParams();
        if (query) params.append('q', query);
        if (category) params.append('category', category);
        if (contentType) params.append('contentType', contentType);
        if (duration) params.append('duration', duration);
        if (date) params.append('date', date);
        if (sortBy) params.append('sortBy', sortBy);
        if (page) params.append('page', page.toString());
        
        // Fetch search results
        const resultsResponse = await fetch(`/api/discovery/search?${params.toString()}`);
        const resultsData = await resultsResponse.json();
        setResults(resultsData);
        
        // Fetch search facets
        const facetsResponse = await fetch(`/api/discovery/search/facets?${params.toString()}`);
        const facetsData = await facetsResponse.json();
        setFacets(facetsData);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    };

    if (query || category || contentType || duration || date) {
      fetchResults();
    }
  }, [query, category, contentType, duration, date, sortBy, page]);

  const handleFilterChange = (filterType, value) => {
    const newParams = new URLSearchParams(searchParams);
    
    if (value) {
      newParams.set(filterType, value);
    } else {
      newParams.delete(filterType);
    }
    
    // Reset to first page when filters change
    newParams.set('page', '1');
    
    window.location.search = newParams.toString();
  };

  return (
    <div className="search-results-page">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <SearchBar />
        </div>
        
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters sidebar */}
          <div className="lg:w-1/4">
            <SearchFilters
              facets={facets}
              currentFilters={{
                category,
                contentType,
                duration,
                date,
                sortBy
              }}
              onFilterChange={handleFilterChange}
            />
          </div>
          
          {/* Results */}
          <div className="lg:w-3/4">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">
                {query ? `Search Results for "${query}"` : 'All Videos'}
              </h1>
              <p className="text-gray-600">
                {results.total > 0 ? `${results.total} results found` : 'No results found'}
              </p>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <>
                <VideoGrid videos={results.videos} />
                
                {results.total > results.limit && (
                  <div className="mt-8 flex justify-center">
                    <Pagination
                      currentPage={results.page}
                      totalPages={Math.ceil(results.total / results.limit)}
                      onPageChange={(newPage) => {
                        const newParams = new URLSearchParams(searchParams);
                        newParams.set('page', newPage.toString());
                        window.location.search = newParams.toString();
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Recommendation Components

#### Personalized Recommendations
```jsx
// components/discovery/PersonalizedRecommendations.tsx
import { useState, useEffect } from 'react';
import { useAuth } from 'hooks/useAuth';
import { VideoGrid } from 'ui';

export default function PersonalizedRecommendations() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRecommendations();
    }
  }, [user]);

  const fetchRecommendations = async () => {
    try {
      const response = await fetch('/api/discovery/recommendations/personalized?limit=12');
      const data = await response.json();
      setRecommendations(data.recommendations);
    } catch (error) {
      console.error('Recommendations fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || loading) return null;

  return (
    <div className="personalized-recommendations">
      <h2 className="text-xl font-bold mb-4">Recommended for You</h2>
      {recommendations.length > 0 ? (
        <VideoGrid videos={recommendations} />
      ) : (
        <p className="text-gray-500">We'll show recommendations based on your viewing history.</p>
      )}
    </div>
  );
}
```

#### Trending Content
```jsx
// components/discovery/TrendingContent.tsx
import { useState, useEffect } from 'react';
import { VideoGrid } from 'ui';

export default function TrendingContent() {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrending();
  }, []);

  const fetchTrending = async () => {
    try {
      const response = await fetch('/api/discovery/recommendations/trending?limit=12');
      const data = await response.json();
      setTrending(data.trending);
    } catch (error) {
      console.error('Trending fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="trending-content">
      <h2 className="text-xl font-bold mb-4">Trending Now</h2>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-48"></div>
          ))}
        </div>
      ) : (
        <VideoGrid videos={trending} />
      )}
    </div>
  );
}
```

### Homepage Discovery

#### Implementation
```jsx
// pages/index.tsx
import { useState, useEffect } from 'react';
import { 
  PersonalizedRecommendations, 
  TrendingContent, 
  FeaturedContent,
  CategoryBrowser
} from 'components/discovery';
import { SearchBar } from 'components/discovery';
import { useAuth } from 'hooks/useAuth';

export default function Homepage() {
  const { user } = useAuth();
  const [featured, setFeatured] = useState({
    trending: [],
    popular: [],
    fresh: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedContent();
  }, []);

  const fetchFeaturedContent = async () => {
    try {
      const response = await fetch('/api/discovery/featured');
      const data = await response.json();
      setFeatured(data);
    } catch (error) {
      console.error('Featured content fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="homepage">
      {/* Hero section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Discover Amazing Content
          </h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Watch live streams and on-demand videos with pay-per-second billing
          </p>
          <div className="max-w-2xl mx-auto">
            <SearchBar />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Personalized recommendations for logged-in users */}
        {user && <PersonalizedRecommendations />}
        
        {/* Trending content */}
        <TrendingContent />
        
        {/* Featured content */}
        <div className="featured-content mb-12">
          <h2 className="text-2xl font-bold mb-6">Featured Content</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">Most Popular</h3>
              <VideoGrid videos={featured.popular} />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-4">Fresh & New</h3>
              <VideoGrid videos={featured.fresh} />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-4">Trending</h3>
              <VideoGrid videos={featured.trending} />
            </div>
          </div>
        </div>
        
        {/* Category browser */}
        <CategoryBrowser />
      </div>
    </div>
  );
}
```

## Implementation Roadmap

### Phase 1: Search Infrastructure (Weeks 1-2)

#### Week 1: Elasticsearch Setup
- Set up Elasticsearch cluster
- Create video index schema
- Implement basic indexing service
- Test indexing performance

#### Week 2: Search Service
- Implement search service with Elasticsearch
- Add faceted search capabilities
- Create search suggestions feature
- Implement search result caching

### Phase 2: Recommendation Engine (Weeks 3-4)

#### Week 3: Recommendation Algorithms
- Implement content-based recommendations
- Create collaborative filtering system
- Develop trending content algorithm
- Add personalization engine

#### Week 4: Recommendation API
- Create recommendation endpoints
- Implement caching strategies
- Add background processing
- Test recommendation accuracy

### Phase 3: Frontend Integration (Weeks 5-6)

#### Week 5: Search Interface
- Create search bar component
- Implement search results page
- Add filtering capabilities
- Create search suggestions UI

#### Week 6: Discovery Features
- Implement personalized recommendations
- Create trending content displays
- Add category browsing
- Integrate with homepage

### Phase 4: Optimization and Testing (Weeks 7-8)

#### Week 7: Performance Optimization
- Optimize search queries
- Implement result caching
- Add pagination
- Improve recommendation algorithms

#### Week 8: Testing and Analytics
- Conduct user testing
- Implement search analytics
- Monitor recommendation performance
- Optimize based on user feedback

## Performance Optimization

### Search Optimization
- Elasticsearch query optimization
- Result caching with Redis
- Index optimization
- Query result pagination

### Recommendation Optimization
- Algorithm performance tuning
- Caching strategies
- Background processing
- Real-time updates

### Infrastructure Scaling
- Elasticsearch cluster scaling
- Load balancing
- Database query optimization
- CDN for static assets

## Monitoring and Analytics

### Search Analytics
- Query performance tracking
- Popular search terms
- Click-through rates
- Conversion tracking

### Recommendation Analytics
- Recommendation engagement
- Algorithm accuracy
- User satisfaction metrics
- A/B testing framework

## Testing Strategy

### Unit Testing
- Search service functions
- Recommendation algorithms
- Indexing service operations
- API endpoint handlers

### Integration Testing
- End-to-end search workflow
- Recommendation generation
- Search result accuracy
- Performance testing

### User Testing
- Search usability testing
- Recommendation relevance
- Discovery feature feedback
- Performance user testing

## Success Metrics

### Technical Metrics
- Search response time (<500ms)
- Recommendation generation time (<1s)
- Indexing latency (<30s)
- System uptime (>99.9%)

### User Experience Metrics
- Search completion rate (>90%)
- Recommendation click-through rate (>15%)
- User engagement with discovered content
- Time spent on discovery features

### Business Metrics
- Content discovery rate
- User retention through discovery
- Creator exposure through recommendations
- Platform engagement metrics

This plan provides a comprehensive roadmap for implementing robust video search and discovery features for the Vilokanam-view platform, enabling users to easily find and discover content through powerful search capabilities and intelligent recommendations.