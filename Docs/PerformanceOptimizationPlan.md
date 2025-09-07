# Performance and Scalability Optimization Plan

## Overview

This document outlines the plan for optimizing the performance and scalability of the Vilokanam-view platform. These optimizations will ensure the platform can handle growing user demand while maintaining fast response times and high availability.

## Current State Analysis

The platform currently has:
- Basic monolithic architecture
- Limited caching strategies
- No horizontal scaling mechanisms
- Basic database optimization
- No CDN implementation
- Limited load testing

## Optimization Requirements

### Core Performance Goals
1. Reduce API response times to <200ms
2. Achieve 99.9% uptime
3. Support 10,000+ concurrent users
4. Optimize video streaming performance
5. Implement efficient caching strategies

### Scalability Goals
1. Horizontal scaling capabilities
2. Auto-scaling based on demand
3. Database sharding for high-volume data
4. Microservices architecture
5. Containerized deployment

## System Architecture Optimization

### Current Architecture Issues
1. Monolithic application structure
2. Limited database optimization
3. No content delivery network
4. Inefficient caching strategies
5. No load balancing

### Optimized Architecture

#### 1. Microservices Architecture
- User service for authentication and profiles
- Content service for video management
- Streaming service for live streams
- Payment service for transactions
- Analytics service for reporting
- Moderation service for content control

#### 2. Load Balancing and Scaling
- Load balancer for traffic distribution
- Auto-scaling groups for services
- Container orchestration with Kubernetes
- Health checks and failover mechanisms

#### 3. Caching Layer
- Redis for session and temporary data
- Memcached for frequently accessed content
- CDN for static assets and videos
- Database query caching

#### 4. Database Optimization
- Database sharding for user data
- Read replicas for high-read operations
- Connection pooling
- Index optimization

## Performance Optimization Strategies

### 1. API Response Time Optimization

#### Database Query Optimization
```javascript
// services/optimized-video-service.js
import redis from 'redis';
import { createPool } from 'generic-pool';

class OptimizedVideoService {
  constructor(db) {
    this.db = db;
    this.redisClient = redis.createClient();
    this.dbPool = createPool({
      create: () => db.createConnection(),
      destroy: (connection) => connection.close()
    }, {
      max: 20,
      min: 5,
      idleTimeoutMillis: 30000
    });
  }

  // Optimized video retrieval with caching
  async getVideo(videoId, userId = null) {
    try {
      // Try cache first
      const cacheKey = `video:${videoId}:${userId || 'public'}`;
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get connection from pool
      const connection = await this.dbPool.acquire();
      
      try {
        // Optimized query with joins and eager loading
        const video = await connection.query(`
          SELECT 
            v.*,
            u.username as creator_name,
            u.profile_image_url as creator_avatar,
            c.name as category_name,
            COALESCE(vc.view_count, 0) as view_count,
            COALESCE(vl.like_count, 0) as like_count,
            COALESCE(vcmt.comment_count, 0) as comment_count
          FROM videos v
          LEFT JOIN users u ON v.creator_id = u.id
          LEFT JOIN categories c ON v.category_id = c.id
          LEFT JOIN (
            SELECT video_id, COUNT(*) as view_count 
            FROM video_views 
            GROUP BY video_id
          ) vc ON v.id = vc.video_id
          LEFT JOIN (
            SELECT video_id, COUNT(*) as like_count 
            FROM video_likes 
            GROUP BY video_id
          ) vl ON v.id = vl.video_id
          LEFT JOIN (
            SELECT video_id, COUNT(*) as comment_count 
            FROM comments 
            WHERE content_type = 'video'
            GROUP BY video_id
          ) vcmt ON v.id = vcmt.video_id
          WHERE v.id = ? AND v.status = 'published'
        `, [videoId]);

        if (!video || video.length === 0) {
          throw new Error('Video not found');
        }

        const result = video[0];

        // Cache for 10 minutes
        await this.redisClient.setex(cacheKey, 600, JSON.stringify(result));

        return result;
      } finally {
        // Release connection back to pool
        await this.dbPool.release(connection);
      }
    } catch (error) {
      console.error('Get video failed:', error);
      throw new Error('Failed to retrieve video');
    }
  }

  // Batch video retrieval
  async getVideosBatch(videoIds) {
    try {
      // Try cache for each video
      const cacheKeys = videoIds.map(id => `video:${id}:public`);
      const cachedResults = await Promise.all(
        cacheKeys.map(key => this.redisClient.get(key))
      );

      const results = [];
      const uncachedIds = [];

      cachedResults.forEach((cached, index) => {
        if (cached) {
          results.push(JSON.parse(cached));
        } else {
          uncachedIds.push(videoIds[index]);
        }
      });

      // Fetch uncached videos
      if (uncachedIds.length > 0) {
        const connection = await this.dbPool.acquire();
        
        try {
          const uncachedVideos = await connection.query(`
            SELECT 
              v.*,
              u.username as creator_name,
              u.profile_image_url as creator_avatar,
              c.name as category_name,
              COALESCE(vc.view_count, 0) as view_count,
              COALESCE(vl.like_count, 0) as like_count
            FROM videos v
            LEFT JOIN users u ON v.creator_id = u.id
            LEFT JOIN categories c ON v.category_id = c.id
            LEFT JOIN (
              SELECT video_id, COUNT(*) as view_count 
              FROM video_views 
              GROUP BY video_id
            ) vc ON v.id = vc.video_id
            LEFT JOIN (
              SELECT video_id, COUNT(*) as like_count 
              FROM video_likes 
              GROUP BY video_id
            ) vl ON v.id = vl.video_id
            WHERE v.id IN (?) AND v.status = 'published'
            ORDER BY v.created_at DESC
          `, [uncachedIds]);

          // Cache results
          for (const video of uncachedVideos) {
            const cacheKey = `video:${video.id}:public`;
            await this.redisClient.setex(cacheKey, 600, JSON.stringify(video));
          }

          results.push(...uncachedVideos);
        } finally {
          await this.dbPool.release(connection);
        }
      }

      // Return results in original order
      return videoIds.map(id => 
        results.find(video => video.id === id)
      ).filter(Boolean);
    } catch (error) {
      console.error('Get videos batch failed:', error);
      throw new Error('Failed to retrieve videos');
    }
  }

  // Optimized video search
  async searchVideos(query, filters = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'relevance',
        sortOrder = 'desc'
      } = options;

      const offset = (page - 1) * limit;

      // Build search query with Elasticsearch
      const esQuery = this.buildElasticsearchQuery(query, filters);
      
      // Try cache first
      const cacheKey = `search:${JSON.stringify({query, filters, options})}`;
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Search with Elasticsearch
      const result = await this.elasticsearchClient.search({
        index: 'videos',
        body: {
          query: esQuery,
          from: offset,
          size: limit,
          sort: this.buildSortCriteria(sortBy, sortOrder)
        }
      });

      const videos = result.hits.hits.map(hit => ({
        ...hit._source,
        id: hit._id,
        score: hit._score
      }));

      const searchResult = {
        videos: videos,
        total: result.hits.total.value,
        page: page,
        limit: limit,
        totalPages: Math.ceil(result.hits.total.value / limit)
      };

      // Cache for 5 minutes
      await this.redisClient.setex(cacheKey, 300, JSON.stringify(searchResult));

      return searchResult;
    } catch (error) {
      console.error('Search videos failed:', error);
      throw new Error('Search failed');
    }
  }

  // Build Elasticsearch query
  buildElasticsearchQuery(query, filters) {
    const esQuery = {
      bool: {
        must: [],
        filter: []
      }
    };

    // Add text search
    if (query) {
      esQuery.bool.must.push({
        multi_match: {
          query: query,
          fields: ['title^2', 'description', 'creator_name', 'tags'],
          fuzziness: 'AUTO'
        }
      });
    }

    // Add filters
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        esQuery.bool.filter.push({
          term: { [key]: filters[key] }
        });
      }
    });

    // Add status filter
    esQuery.bool.filter.push({
      term: { status: 'published' }
    });

    return esQuery;
  }

  // Build sort criteria
  buildSortCriteria(sortBy, sortOrder) {
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
    
    return sort;
  }
}

export default OptimizedVideoService;
```

### 2. Database Optimization

#### Connection Pooling and Query Optimization
```javascript
// utils/database-optimizer.js
import { createPool } from 'generic-pool';
import mysql from 'mysql2/promise';

class DatabaseOptimizer {
  constructor(config) {
    this.pool = createPool({
      create: async () => {
        const connection = await mysql.createConnection(config);
        // Set connection optimizations
        await connection.execute('SET SESSION query_cache_type = ON');
        await connection.execute('SET SESSION innodb_buffer_pool_size = 134217728'); // 128MB
        return connection;
      },
      destroy: async (connection) => {
        await connection.end();
      }
    }, {
      max: config.maxConnections || 50,
      min: config.minConnections || 10,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      evictionRunIntervalMillis: 5000
    });

    // Initialize optimized indexes
    this.initializeIndexes();
  }

  // Initialize database indexes
  async initializeIndexes() {
    const connection = await this.pool.acquire();
    
    try {
      // Videos table indexes
      await connection.execute(`
        CREATE INDEX IF NOT EXISTS idx_videos_creator_status 
        ON videos(creator_id, status)
      `);
      
      await connection.execute(`
        CREATE INDEX IF NOT EXISTS idx_videos_status_published 
        ON videos(status, published_at DESC)
      `);
      
      await connection.execute(`
        CREATE INDEX IF NOT EXISTS idx_videos_category 
        ON videos(category_id, status)
      `);

      // Video views indexes
      await connection.execute(`
        CREATE INDEX IF NOT EXISTS idx_video_views_video 
        ON video_views(video_id, created_at)
      `);
      
      await connection.execute(`
        CREATE INDEX IF NOT EXISTS idx_video_views_user 
        ON video_views(viewer_id, created_at)
      `);

      // Comments indexes
      await connection.execute(`
        CREATE INDEX IF NOT EXISTS idx_comments_content 
        ON comments(content_id, content_type, created_at)
      `);
      
      await connection.execute(`
        CREATE INDEX IF NOT EXISTS idx_comments_user 
        ON comments(author_id, created_at)
      `);

      // Users indexes
      await connection.execute(`
        CREATE INDEX IF NOT EXISTS idx_users_account 
        ON users(account_id)
      `);
      
      await connection.execute(`
        CREATE INDEX IF NOT EXISTS idx_users_username 
        ON users(username)
      `);

      // Follows indexes
      await connection.execute(`
        CREATE INDEX IF NOT EXISTS idx_follows_follower 
        ON follows(follower_id, created_at)
      `);
      
      await connection.execute(`
        CREATE INDEX IF NOT EXISTS idx_follows_following 
        ON follows(following_id, created_at)
      `);
    } finally {
      await this.pool.release(connection);
    }
  }

  // Get optimized connection
  async getConnection() {
    return await this.pool.acquire();
  }

  // Release connection
  async releaseConnection(connection) {
    await this.pool.release(connection);
  }

  // Execute optimized query
  async executeQuery(sql, params = []) {
    const connection = await this.getConnection();
    
    try {
      // Add query optimization hints
      const optimizedSql = this.addQueryHints(sql);
      const [results] = await connection.execute(optimizedSql, params);
      return results;
    } finally {
      await this.releaseConnection(connection);
    }
  }

  // Add query optimization hints
  addQueryHints(sql) {
    // Add query hints for optimization
    if (sql.toLowerCase().includes('select')) {
      return sql.replace(/SELECT/i, 'SELECT SQL_CALC_FOUND_ROWS');
    }
    return sql;
  }

  // Batch execute queries
  async batchExecute(queries) {
    const connection = await this.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const results = [];
      for (const query of queries) {
        const [result] = await connection.execute(query.sql, query.params);
        results.push(result);
      }
      
      await connection.commit();
      return results;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await this.releaseConnection(connection);
    }
  }

  // Get connection pool statistics
  getPoolStats() {
    return {
      size: this.pool.size,
      available: this.pool.available,
      pending: this.pool.pending,
      borrowed: this.pool.borrowed,
      spareResourceCapacity: this.pool.spareResourceCapacity
    };
  }
}

export default DatabaseOptimizer;
```

### 3. Caching Optimization

#### Multi-layer Caching Strategy
```javascript
// utils/cache-optimizer.js
import redis from 'redis';
import memcached from 'memcached';
import LRU from 'lru-cache';

class CacheOptimizer {
  constructor(config) {
    // Redis for distributed caching
    this.redisClient = redis.createClient({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          return new Error('The server refused the connection');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });

    // Memcached for high-performance caching
    this.memcachedClient = new memcached(
      config.memcached.servers,
      {
        retries: 3,
        retry: 1000,
        timeout: 500,
        failures: 3,
        reconnect: 10000
      }
    );

    // LRU cache for in-memory caching
    this.lruCache = new LRU({
      max: config.lru.max || 500,
      ttl: config.lru.ttl || 1000 * 60 * 5, // 5 minutes
      updateAgeOnGet: true
    });

    // Cache hierarchy
    this.cacheLayers = [
      { name: 'lru', client: this.lruCache, ttl: 60 }, // 1 minute
      { name: 'memcached', client: this.memcachedClient, ttl: 300 }, // 5 minutes
      { name: 'redis', client: this.redisClient, ttl: 3600 } // 1 hour
    ];
  }

  // Get data from cache hierarchy
  async get(key) {
    // Try LRU cache first (fastest)
    if (this.lruCache.has(key)) {
      return this.lruCache.get(key);
    }

    // Try Memcached
    try {
      const memcachedResult = await new Promise((resolve, reject) => {
        this.memcachedClient.get(key, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
      
      if (memcachedResult !== undefined) {
        // Populate higher cache layers
        this.lruCache.set(key, memcachedResult);
        return memcachedResult;
      }
    } catch (error) {
      console.warn('Memcached get failed:', error);
    }

    // Try Redis
    try {
      const redisResult = await this.redisClient.get(key);
      if (redisResult !== null) {
        const parsedResult = JSON.parse(redisResult);
        // Populate higher cache layers
        this.lruCache.set(key, parsedResult);
        return parsedResult;
      }
    } catch (error) {
      console.warn('Redis get failed:', error);
    }

    return null;
  }

  // Set data in cache hierarchy
  async set(key, value, ttl = 3600) {
    // Set in all cache layers
    this.lruCache.set(key, value, { ttl: Math.min(ttl, 60) * 1000 });

    try {
      await new Promise((resolve, reject) => {
        this.memcachedClient.set(
          key, 
          value, 
          Math.min(ttl, 300), 
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    } catch (error) {
      console.warn('Memcached set failed:', error);
    }

    try {
      await this.redisClient.setex(
        key, 
        ttl, 
        JSON.stringify(value)
      );
    } catch (error) {
      console.warn('Redis set failed:', error);
    }
  }

  // Delete data from cache hierarchy
  async delete(key) {
    this.lruCache.delete(key);

    try {
      await new Promise((resolve, reject) => {
        this.memcachedClient.del(key, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (error) {
      console.warn('Memcached delete failed:', error);
    }

    try {
      await this.redisClient.del(key);
    } catch (error) {
      console.warn('Redis delete failed:', error);
    }
  }

  // Batch get operations
  async batchGet(keys) {
    const results = {};
    
    // Try LRU cache first
    const lruResults = keys.map(key => ({
      key,
      value: this.lruCache.get(key)
    })).filter(item => item.value !== undefined);
    
    lruResults.forEach(item => {
      results[item.key] = item.value;
    });

    // Get remaining keys from other layers
    const remainingKeys = keys.filter(key => !(key in results));
    if (remainingKeys.length === 0) {
      return results;
    }

    // Try Memcached for remaining keys
    try {
      const memcachedResults = await new Promise((resolve, reject) => {
        this.memcachedClient.getMulti(remainingKeys, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      Object.keys(memcachedResults).forEach(key => {
        results[key] = memcachedResults[key];
        // Populate LRU cache
        this.lruCache.set(key, memcachedResults[key]);
      });

      remainingKeys = remainingKeys.filter(key => !(key in results));
    } catch (error) {
      console.warn('Memcached batch get failed:', error);
    }

    // Try Redis for remaining keys
    if (remainingKeys.length > 0) {
      try {
        const redisResults = await Promise.all(
          remainingKeys.map(key => this.redisClient.get(key))
        );

        remainingKeys.forEach((key, index) => {
          const result = redisResults[index];
          if (result !== null) {
            const parsedResult = JSON.parse(result);
            results[key] = parsedResult;
            // Populate higher cache layers
            this.lruCache.set(key, parsedResult);
          }
        });
      } catch (error) {
        console.warn('Redis batch get failed:', error);
      }
    }

    return results;
  }

  // Cache warming
  async warmCache(keys, fetchFunction) {
    const missingKeys = [];
    
    // Check which keys are missing from cache
    for (const key of keys) {
      const cached = await this.get(key);
      if (cached === null) {
        missingKeys.push(key);
      }
    }

    // Fetch missing data
    if (missingKeys.length > 0) {
      const fetchedData = await fetchFunction(missingKeys);
      
      // Cache the fetched data
      const cachePromises = Object.keys(fetchedData).map(key => 
        this.set(key, fetchedData[key])
      );
      
      await Promise.all(cachePromises);
    }
  }

  // Get cache statistics
  getStats() {
    return {
      lru: {
        size: this.lruCache.size,
        max: this.lruCache.max
      },
      memcached: 'connected', // Simplified
      redis: 'connected' // Simplified
    };
  }

  // Clear all caches
  async clearAll() {
    this.lruCache.clear();

    try {
      await new Promise((resolve, reject) => {
        this.memcachedClient.flush((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (error) {
      console.warn('Memcached flush failed:', error);
    }

    try {
      await this.redisClient.flushall();
    } catch (error) {
      console.warn('Redis flushall failed:', error);
    }
  }
}

export default CacheOptimizer;
```

## Scalability Optimization

### 1. Microservices Architecture

#### Service Decomposition
```javascript
// services/user-service.js
import express from 'express';
import DatabaseOptimizer from '../utils/database-optimizer';
import CacheOptimizer from '../utils/cache-optimizer';

const app = express();
const db = new DatabaseOptimizer(process.env.DATABASE_URL);
const cache = new CacheOptimizer({
  redis: { host: process.env.REDIS_HOST, port: process.env.REDIS_PORT },
  memcached: { servers: process.env.MEMCACHED_SERVERS },
  lru: { max: 500, ttl: 300 }
});

// Get user profile
app.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Try cache first
    const cached = await cache.get(`user:${userId}`);
    if (cached) {
      return res.json(cached);
    }

    // Fetch from database
    const user = await db.executeQuery(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (!user || user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cache result
    await cache.set(`user:${userId}`, user[0], 3600); // 1 hour

    res.json(user[0]);
  } catch (error) {
    console.error('Get user failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
app.put('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email, bio } = req.body;

    // Update in database
    await db.executeQuery(
      'UPDATE users SET username = ?, email = ?, bio = ?, updated_at = NOW() WHERE id = ?',
      [username, email, bio, userId]
    );

    // Invalidate cache
    await cache.delete(`user:${userId}`);

    // Fetch updated user
    const updatedUser = await db.executeQuery(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    res.json(updatedUser[0]);
  } catch (error) {
    console.error('Update user failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user followers
app.get('/users/:userId/followers', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Try cache first
    const cacheKey = `user:${userId}:followers:${page}:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Fetch followers from database
    const followers = await db.executeQuery(`
      SELECT u.* FROM follows f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = ?
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);

    const total = await db.executeQuery(
      'SELECT COUNT(*) as count FROM follows WHERE following_id = ?',
      [userId]
    );

    const result = {
      followers: followers,
      total: total[0].count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total[0].count / limit)
    };

    // Cache result
    await cache.set(cacheKey, result, 300); // 5 minutes

    res.json(result);
  } catch (error) {
    console.error('Get followers failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default app;
```

### 2. Kubernetes Deployment Configuration

#### Deployment YAML
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vilokanam-user-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
      - name: user-service
        image: vilokanam/user-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        - name: REDIS_HOST
          value: redis-service
        - name: REDIS_PORT
          value: "6379"
        - name: MEMCACHED_SERVERS
          value: "memcached:11211"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: user-service
spec:
  selector:
    app: user-service
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: user-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 3. Load Balancing Configuration

#### NGINX Configuration
```nginx
# nginx/nginx.conf
upstream user_service {
    least_conn;
    server user-service-1:3000 weight=3;
    server user-service-2:3000 weight=3;
    server user-service-3:3000 weight=3;
    server user-service-canary:3000 weight=1;
}

upstream content_service {
    least_conn;
    server content-service-1:3000;
    server content-service-2:3000;
    server content-service-3:3000;
}

upstream streaming_service {
    least_conn;
    server streaming-service-1:3000;
    server streaming-service-2:3000;
}

server {
    listen 80;
    server_name api.vilokanam-view.com;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # User service routes
    location /api/users {
        limit_req zone=api burst=10;
        proxy_pass http://user_service;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Content service routes
    location /api/videos {
        limit_req zone=api burst=15;
        proxy_pass http://content_service;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Streaming service routes
    location /api/streams {
        proxy_pass http://streaming_service;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

## Video Streaming Optimization

### 1. CDN Integration

#### Cloudflare CDN Setup
```javascript
// utils/cdn-optimizer.js
import cloudflare from 'cloudflare';

class CDNOptimizer {
  constructor(config) {
    this.cloudflare = cloudflare({
      email: config.cloudflare.email,
      key: config.cloudflare.apiKey,
      zoneId: config.cloudflare.zoneId
    });
    
    this.videoBaseUrl = config.videoBaseUrl;
  }

  // Optimize video for CDN delivery
  async optimizeVideoForCDN(videoId, videoPath) {
    try {
      // Create Cloudflare Stream
      const stream = await this.cloudflare.stream.create({
        filename: `${videoId}.mp4`,
        thumbnailTimestamp: 5
      });

      // Upload video to Cloudflare Stream
      const uploadUrl = stream.uploadURL;
      // In practice, you would upload the video file to this URL
      
      // Create optimized variants
      await this.createOptimizedVariants(videoId, stream.uid);
      
      // Purge CDN cache
      await this.purgeCDNCache(videoId);
      
      return {
        streamId: stream.uid,
        playbackUrl: `https://watch.cloudflarestream.com/${stream.uid}`,
        thumbnailUrl: `https://videodelivery.net/${stream.uid}/thumbnails/thumbnail.jpg`
      };
    } catch (error) {
      console.error('CDN optimization failed:', error);
      throw new Error('Failed to optimize video for CDN');
    }
  }

  // Create optimized video variants
  async createOptimizedVariants(videoId, streamId) {
    try {
      // Define variants
      const variants = [
        { height: 240, width: 426, bitrate: 400000 },   // 240p
        { height: 360, width: 640, bitrate: 800000 },   // 360p
        { height: 480, width: 854, bitrate: 1200000 },  // 480p
        { height: 720, width: 1280, bitrate: 2500000 }, // 720p
        { height: 1080, width: 1920, bitrate: 4500000 } // 1080p
      ];

      // Create variants (Cloudflare Stream handles this automatically)
      // For other CDNs, you might need to create separate files
      
      return variants;
    } catch (error) {
      console.error('Create optimized variants failed:', error);
      throw new Error('Failed to create optimized variants');
    }
  }

  // Purge CDN cache
  async purgeCDNCache(videoId) {
    try {
      await this.cloudflare.zones.purgeCache(this.cloudflare.zoneId, {
        files: [
          `${this.videoBaseUrl}/${videoId}/*.m3u8`,
          `${this.videoBaseUrl}/${videoId}/*.ts`,
          `${this.videoBaseUrl}/${videoId}/thumbnail.jpg`
        ]
      });
      
      console.log(`CDN cache purged for video ${videoId}`);
    } catch (error) {
      console.error('Purge CDN cache failed:', error);
    }
  }

  // Enable edge caching
  async enableEdgeCaching(videoId) {
    try {
      // Set cache rules for video content
      await this.cloudflare.zones.settings.edit(this.cloudflare.zoneId, 'cache_level', {
        value: 'aggressive'
      });
      
      // Set browser cache TTL
      await this.cloudflare.zones.settings.edit(this.cloudflare.zoneId, 'browser_cache_ttl', {
        value: 14400 // 4 hours
      });
      
      console.log(`Edge caching enabled for video ${videoId}`);
    } catch (error) {
      console.error('Enable edge caching failed:', error);
    }
  }

  // Get CDN performance metrics
  async getCDNPerformance(videoId) {
    try {
      const analytics = await this.cloudflare.zones.analytics.dashboard(
        this.cloudflare.zoneId,
        {
          since: '-7d',
          until: 'now',
          limit: 100
        }
      );
      
      // Filter for video-specific metrics
      const videoMetrics = analytics.totals.filter(metric => 
        metric.dimensions.includes(videoId)
      );
      
      return videoMetrics;
    } catch (error) {
      console.error('Get CDN performance failed:', error);
      return [];
    }
  }
}

export default CDNOptimizer;
```

### 2. Adaptive Bitrate Streaming

#### HLS Implementation
```javascript
// services/streaming-optimizer.js
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';

class StreamingOptimizer {
  constructor(config) {
    this.storagePath = config.storagePath;
    this.cdnBaseUrl = config.cdnBaseUrl;
  }

  // Create HLS playlist for adaptive streaming
  async createHLSPlaylist(videoPath, outputDir) {
    try {
      // Create output directory
      await fs.mkdir(outputDir, { recursive: true });

      // Define bitrates and resolutions
      const variants = [
        {
          name: '240p',
          resolution: '426x240',
          bitrate: '400k',
          audioBitrate: '64k'
        },
        {
          name: '360p',
          resolution: '640x360',
          bitrate: '800k',
          audioBitrate: '96k'
        },
        {
          name: '480p',
          resolution: '854x480',
          bitrate: '1200k',
          audioBitrate: '128k'
        },
        {
          name: '720p',
          resolution: '1280x720',
          bitrate: '2500k',
          audioBitrate: '192k'
        },
        {
          name: '1080p',
          resolution: '1920x1080',
          bitrate: '4500k',
          audioBitrate: '256k'
        }
      ];

      // Generate variant streams
      const promises = variants.map(variant => 
        this.createVariantStream(videoPath, outputDir, variant)
      );
      
      await Promise.all(promises);

      // Create master playlist
      const masterPlaylist = this.createMasterPlaylist(variants);
      const masterPlaylistPath = path.join(outputDir, 'playlist.m3u8');
      
      await fs.writeFile(masterPlaylistPath, masterPlaylist);
      
      return {
        masterPlaylist: `${this.cdnBaseUrl}/${path.basename(outputDir)}/playlist.m3u8`,
        variants: variants.map(v => ({
          name: v.name,
          playlist: `${this.cdnBaseUrl}/${path.basename(outputDir)}/${v.name}/playlist.m3u8`
        }))
      };
    } catch (error) {
      console.error('Create HLS playlist failed:', error);
      throw new Error('Failed to create HLS playlist');
    }
  }

  // Create variant stream
  async createVariantStream(videoPath, outputDir, variant) {
    const variantDir = path.join(outputDir, variant.name);
    await fs.mkdir(variantDir, { recursive: true });

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions([
          '-profile:v', 'baseline',
          '-level', '3.0',
          '-start_number', '0',
          '-hls_time', '10',
          '-hls_list_size', '0',
          '-f', 'hls',
          '-hls_segment_filename', path.join(variantDir, 'segment%03d.ts')
        ])
        .videoCodec('libx264')
        .size(variant.resolution)
        .videoBitrate(variant.bitrate)
        .audioCodec('aac')
        .audioBitrate(variant.audioBitrate)
        .output(path.join(variantDir, 'playlist.m3u8'))
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }

  // Create master playlist
  createMasterPlaylist(variants) {
    let playlist = '#EXTM3U\n';
    playlist += '#EXT-X-VERSION:3\n';
    
    variants.forEach(variant => {
      playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${variant.bitrate.replace('k', '000')},`;
      playlist += `RESOLUTION=${variant.resolution}\n`;
      playlist += `${variant.name}/playlist.m3u8\n`;
    });
    
    return playlist;
  }

  // Optimize video for streaming
  async optimizeVideoForStreaming(inputPath, outputPath) {
    try {
      // Get video information
      const videoInfo = await new Promise((resolve, reject) => {
        ffmpeg(inputPath).ffprobe((err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      // Determine optimal settings based on input
      const width = videoInfo.streams[0].width;
      const height = videoInfo.streams[0].height;
      const duration = videoInfo.format.duration;

      // Optimize based on resolution
      let targetResolution = '1080x1920';
      if (width <= 426 && height <= 240) {
        targetResolution = '426x240';
      } else if (width <= 640 && height <= 360) {
        targetResolution = '640x360';
      } else if (width <= 854 && height <= 480) {
        targetResolution = '854x480';
      } else if (width <= 1280 && height <= 720) {
        targetResolution = '1280x720';
      }

      // Optimize video
      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .videoCodec('libx264')
          .size(targetResolution)
          .videoBitrate('2500k')
          .audioCodec('aac')
          .audioBitrate('192k')
          .outputOptions([
            '-preset', 'fast',
            '-crf', '23',
            '-movflags', '+faststart'
          ])
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      return {
        inputResolution: `${width}x${height}`,
        outputResolution: targetResolution,
        duration: duration
      };
    } catch (error) {
      console.error('Optimize video for streaming failed:', error);
      throw new Error('Failed to optimize video for streaming');
    }
  }

  // Generate video thumbnails
  async generateThumbnails(videoPath, outputDir, count = 10) {
    try {
      // Get video duration
      const videoInfo = await new Promise((resolve, reject) => {
        ffmpeg(videoPath).ffprobe((err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      const duration = videoInfo.format.duration;
      const interval = duration / (count + 1);

      // Create thumbnails
      const thumbnails = [];
      for (let i = 1; i <= count; i++) {
        const timestamp = interval * i;
        const thumbnailPath = path.join(outputDir, `thumbnail_${i}.jpg`);
        
        await new Promise((resolve, reject) => {
          ffmpeg(videoPath)
            .screenshots({
              timestamps: [timestamp],
              filename: `thumbnail_${i}.jpg`,
              folder: outputDir,
              size: '320x180'
            })
            .on('end', () => resolve())
            .on('error', (err) => reject(err));
        });

        thumbnails.push({
          timestamp: timestamp,
          path: `${this.cdnBaseUrl}/${path.basename(outputDir)}/thumbnail_${i}.jpg`
        });
      }

      // Create sprite sheet
      const spritePath = path.join(outputDir, 'thumbnails.jpg');
      await this.createSpriteSheet(thumbnails, spritePath);

      return {
        thumbnails: thumbnails,
        spriteSheet: `${this.cdnBaseUrl}/${path.basename(outputDir)}/thumbnails.jpg`
      };
    } catch (error) {
      console.error('Generate thumbnails failed:', error);
      throw new Error('Failed to generate thumbnails');
    }
  }

  // Create sprite sheet from thumbnails
  async createSpriteSheet(thumbnails, outputPath) {
    // In production, you would use an image processing library
    // to combine thumbnails into a single sprite sheet
    // For now, we'll just create a placeholder
    await fs.writeFile(outputPath, 'Sprite sheet placeholder');
  }
}

export default StreamingOptimizer;
```

## Monitoring and Observability

### 1. Performance Monitoring

#### Prometheus Metrics
```javascript
// utils/performance-monitor.js
import prometheus from 'prom-client';

class PerformanceMonitor {
  constructor() {
    // Create metrics
    this.apiResponseTime = new prometheus.Histogram({
      name: 'api_response_time_seconds',
      help: 'API response time in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10]
    });

    this.databaseQueryTime = new prometheus.Histogram({
      name: 'database_query_time_seconds',
      help: 'Database query time in seconds',
      labelNames: ['query_type', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
    });

    this.cacheHitRate = new prometheus.Gauge({
      name: 'cache_hit_rate',
      help: 'Cache hit rate percentage',
      labelNames: ['cache_type']
    });

    this.activeConnections = new prometheus.Gauge({
      name: 'active_connections',
      help: 'Number of active database connections',
      labelNames: ['service']
    });

    this.concurrentUsers = new prometheus.Gauge({
      name: 'concurrent_users',
      help: 'Number of concurrent users',
      labelNames: ['service']
    });

    // Register metrics
    prometheus.collectDefaultMetrics();
  }

  // Record API response time
  recordApiResponseTime(method, route, status, duration) {
    this.apiResponseTime
      .labels(method, route, status.toString())
      .observe(duration);
  }

  // Record database query time
  recordDatabaseQueryTime(queryType, table, duration) {
    this.databaseQueryTime
      .labels(queryType, table)
      .observe(duration);
  }

  // Update cache hit rate
  updateCacheHitRate(cacheType, hitRate) {
    this.cacheHitRate
      .labels(cacheType)
      .set(hitRate);
  }

  // Update active connections
  updateActiveConnections(service, count) {
    this.activeConnections
      .labels(service)
      .set(count);
  }

  // Update concurrent users
  updateConcurrentUsers(service, count) {
    this.concurrentUsers
      .labels(service)
      .set(count);
  }

  // Get metrics
  async getMetrics() {
    return await prometheus.register.metrics();
  }

  // Get metrics in JSON format
  async getMetricsJSON() {
    return await prometheus.register.getMetricsAsJSON();
  }
}

export default PerformanceMonitor;
```

### 2. Application Performance Monitoring

#### Middleware for Performance Tracking
```javascript
// middleware/performance-tracker.js
import PerformanceMonitor from '../utils/performance-monitor';

const performanceMonitor = new PerformanceMonitor();

export const performanceTracker = (req, res, next) => {
  const startTime = Date.now();
  
  // Track response time
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    performanceMonitor.recordApiResponseTime(
      req.method,
      req.route ? req.route.path : req.path,
      res.statusCode,
      duration
    );
  });

  next();
};

// Database query tracker
export const databaseQueryTracker = (queryType, table) => {
  const startTime = Date.now();
  
  return (error, result) => {
    const duration = (Date.now() - startTime) / 1000;
    performanceMonitor.recordDatabaseQueryTime(queryType, table, duration);
    
    if (error) {
      console.error('Database query failed:', error);
    }
    
    return { error, result };
  };
};

// Cache tracker
export const cacheTracker = (cacheType) => {
  let hits = 0;
  let misses = 0;
  
  const tracker = {
    recordHit: () => {
      hits++;
      this.updateHitRate();
    },
    
    recordMiss: () => {
      misses++;
      this.updateHitRate();
    },
    
    updateHitRate: () => {
      const total = hits + misses;
      if (total > 0) {
        const hitRate = (hits / total) * 100;
        performanceMonitor.updateCacheHitRate(cacheType, hitRate);
      }
    }
  };
  
  return tracker;
};

export default performanceMonitor;
```

## Implementation Roadmap

### Phase 1: Database and Query Optimization (Weeks 1-2)

#### Week 1: Database Optimization
- Implement connection pooling
- Create optimized indexes
- Optimize frequently used queries
- Add query caching

#### Week 2: Query Performance
- Analyze slow queries
- Implement query optimization
- Add database metrics
- Test performance improvements

### Phase 2: Caching and CDN (Weeks 3-4)

#### Week 3: Caching Layer
- Implement multi-layer caching
- Add cache warming strategies
- Optimize cache invalidation
- Test caching performance

#### Week 4: CDN Integration
- Set up CDN for static assets
- Implement video CDN optimization
- Add edge caching
- Monitor CDN performance

### Phase 3: Microservices Architecture (Weeks 5-6)

#### Week 5: Service Decomposition
- Decompose monolithic application
- Create user service
- Create content service
- Create streaming service

#### Week 6: Service Integration
- Implement service communication
- Add load balancing
- Test service interaction
- Monitor service performance

### Phase 4: Scaling and Monitoring (Weeks 7-8)

#### Week 7: Auto-scaling
- Implement Kubernetes deployments
- Add horizontal pod autoscaling
- Configure load balancing
- Test scaling capabilities

#### Week 8: Monitoring and Observability
- Implement performance monitoring
- Add application metrics
- Set up alerting system
- Conduct load testing

## Performance Benchmarks

### Target Metrics
1. **API Response Time**: <200ms for 95% of requests
2. **Database Query Time**: <50ms for 95% of queries
3. **Cache Hit Rate**: >80% for all cache layers
4. **Concurrent Users**: Support 10,000+ concurrent users
5. **Video Streaming**: <3 second startup time
6. **Uptime**: 99.9% availability

### Monitoring Dashboard
- Real-time performance metrics
- Database performance charts
- Cache hit rate monitoring
- User concurrency tracking
- Error rate monitoring
- Resource utilization graphs

## Testing Strategy

### Performance Testing
- Load testing with 1,000-10,000 concurrent users
- Stress testing to identify breaking points
- Soak testing for long-term stability
- Spike testing for sudden traffic increases

### Scalability Testing
- Horizontal scaling tests
- Database sharding validation
- CDN performance validation
- Microservices communication testing

### Monitoring Testing
- Alert threshold validation
- Metric accuracy verification
- Dashboard functionality testing
- Log aggregation validation

## Success Metrics

### Technical Metrics
- API response time reduction (>50%)
- Database query performance improvement (>60%)
- Cache hit rate increase (>80%)
- System uptime (>99.9%)
- Error rate reduction (<0.1%)

### Business Metrics
- User engagement increase
- Content delivery performance
- Creator satisfaction scores
- Platform scalability capacity
- Operational cost optimization

This plan provides a comprehensive roadmap for optimizing the performance and scalability of the Vilokanam-view platform, ensuring it can handle growing user demand while maintaining fast response times and high availability.