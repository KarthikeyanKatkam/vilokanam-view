# Viewer Interface Implementation Plan

## Overview

This document outlines the plan for implementing a comprehensive viewer interface for the Vilokanam-view platform. The interface will provide users with an engaging experience for discovering, watching, and interacting with both live streams and on-demand videos, while seamlessly integrating the pay-per-second payment model.

## Current State Analysis

The platform currently has:
- Basic viewer interface with stream information display
- Missing video playback functionality
- No video discovery features
- Limited social interaction capabilities
- No integrated payment system

## Viewer Interface Requirements

### Core Features
1. Video discovery and browsing
2. High-quality video playback
3. Live streaming support
4. Social interaction (comments, reactions, following)
5. Pay-per-second payment integration
6. Personalized recommendations
7. User profile management

### User Personas
1. **Casual Viewers**: Browse and watch occasional content
2. **Regular Viewers**: Follow creators and watch frequently
3. **Power Viewers**: Engage heavily with community features

## Interface Architecture

### Frontend Structure
```
/pages
  /viewer
    /index.tsx          // Homepage/discovery
    /video/[id].tsx     // Video playback
    /stream/[id].tsx    // Live stream viewing
    /search.tsx         // Search results
    /category/[id].tsx  // Category browsing
    /profile.tsx        // User profile
/components
  /viewer
    /VideoPlayer        // Video playback component
    /StreamPlayer       // Live stream component
    /VideoGrid          // Video listing component
    /CommentSection     // Comments and reactions
    /PaymentOverlay     // Payment integration
    /Recommendations    // Suggested content
```

### Backend Integration
- RESTful API for content delivery
- WebSocket connections for live streams
- Blockchain integration for payments
- Recommendation engine
- Search and discovery services

## Feature Implementation

### 1. Homepage and Discovery

#### Hero Section
- Featured content carousel
- Trending videos
- Live streams promotion

#### Content Categories
- Category browsing
- Personalized recommendations
- Recently uploaded content
- Following feed

#### Implementation
```tsx
// pages/viewer/index.tsx
import { useState, useEffect } from 'react';
import { 
  VideoGrid, 
  CategoryFilter, 
  HeroCarousel 
} from 'ui';
import { getFeaturedContent, getRecommendations } from 'sdk';

export default function ViewerHomepage() {
  const [featured, setFeatured] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    loadHomepageContent();
  }, []);

  const loadHomepageContent = async () => {
    try {
      const [featuredData, recommendationsData, categoriesData] = await Promise.all([
        getFeaturedContent(),
        getRecommendations(),
        getCategories()
      ]);
      
      setFeatured(featuredData);
      setRecommendations(recommendationsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load homepage content:', error);
    }
  };

  return (
    <div className="viewer-homepage">
      <HeroCarousel videos={featured} />
      
      <div className="content-section">
        <h2>Trending Now</h2>
        <VideoGrid videos={featured} />
      </div>
      
      <div className="content-section">
        <div className="section-header">
          <h2>Recommended for You</h2>
          <CategoryFilter 
            categories={categories} 
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </div>
        <VideoGrid videos={recommendations} />
      </div>
      
      <div className="content-section">
        <h2>Live Streams</h2>
        <VideoGrid videos={liveStreams} type="live" />
      </div>
    </div>
  );
}
```

### 2. Video Playback Interface

#### Core Player Features
- Adaptive bitrate streaming
- Quality selection
- Playback controls (play, pause, volume, fullscreen)
- Progress tracking
- Captions support
- Playback speed control

#### Pay-Per-Second Integration
- Real-time payment display
- Spending limit controls
- Pause/resume payment tracking
- Transaction history

#### Implementation
```tsx
// components/viewer/VideoPlayer/VideoPlayer.tsx
import { useState, useRef, useEffect } from 'react';
import Hls from 'hls.js';
import { usePayment } from 'sdk';

export default function VideoPlayer({ video, onTimeUpdate }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [qualityLevels, setQualityLevels] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState(-1);
  
  const {
    paymentStatus,
    currentCost,
    spendingLimit,
    pausePayment,
    resumePayment
  } = usePayment(video.id);

  // Initialize HLS player
  useEffect(() => {
    if (Hls.isSupported() && video.hlsUrl) {
      const hls = new Hls();
      hls.loadSource(video.hlsUrl);
      hls.attachMedia(videoRef.current);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setQualityLevels(hls.levels);
      });
      
      hlsRef.current = hls;
    } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      videoRef.current.src = video.hlsUrl;
    }
    
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [video.hlsUrl]);

  // Handle play/pause
  const togglePlay = () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
      resumePayment();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      pausePayment();
      setIsPlaying(false);
    }
  };

  // Handle time updates
  const handleTimeUpdate = () => {
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    onTimeUpdate?.(time);
  };

  // Handle progress bar click
  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * duration;
  };

  // Format time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="video-player">
      <div className="player-container">
        <video
          ref={videoRef}
          className="video-element"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => setDuration(videoRef.current.duration)}
          onClick={togglePlay}
        />
        
        <div className="player-overlay">
          {/* Payment overlay when limit reached */}
          {paymentStatus === 'limit_reached' && (
            <div className="payment-overlay">
              <div className="overlay-content">
                <h3>Spending Limit Reached</h3>
                <p>You've reached your spending limit for this session.</p>
                <button onClick={() => window.location.reload()}>
                  Refresh to Continue
                </button>
              </div>
            </div>
          )}
          
          {/* Play/Pause button */}
          <button 
            className="play-pause-button"
            onClick={togglePlay}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
        </div>
      </div>
      
      <div className="player-controls">
        <div className="progress-container" onClick={handleSeek}>
          <div 
            className="progress-bar" 
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>
        
        <div className="control-row">
          <div className="left-controls">
            <button onClick={togglePlay}>
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <span className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          
          <div className="center-controls">
            <div className="payment-info">
              <span className="cost">{currentCost.toFixed(4)} DOT</span>
              <span className="limit">Limit: {spendingLimit.toFixed(2)} DOT</span>
            </div>
          </div>
          
          <div className="right-controls">
            <select 
              value={selectedQuality}
              onChange={(e) => {
                const level = parseInt(e.target.value);
                setSelectedQuality(level);
                if (hlsRef.current) {
                  hlsRef.current.currentLevel = level;
                }
              }}
            >
              <option value={-1}>Auto</option>
              {qualityLevels.map((level, index) => (
                <option key={index} value={index}>
                  {level.height}p
                </option>
              ))}
            </select>
            <button>Fullscreen</button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 3. Live Stream Interface

#### Real-time Features
- Low-latency WebRTC streaming
- Viewer count display
- Chat integration
- Reactions and emotes
- Stream quality controls

#### Payment Integration
- Real-time tick counting
- Per-second payment processing
- Spending notifications
- Creator earnings display

#### Implementation
```tsx
// components/viewer/StreamPlayer/StreamPlayer.tsx
import { useState, useEffect, useRef } from 'react';
import { useStream, usePayment } from 'sdk';
import { ChatBox, ReactionPanel } from 'ui';

export default function StreamPlayer({ streamId }) {
  const videoRef = useRef(null);
  const [streamData, setStreamData] = useState(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const { 
    connectToStream, 
    disconnectFromStream,
    getStreamInfo 
  } = useStream(streamId);
  
  const {
    paymentStatus,
    currentCost,
    spendingLimit,
    pausePayment,
    resumePayment
  } = usePayment(streamId, 'stream');

  // Initialize stream connection
  useEffect(() => {
    const initStream = async () => {
      try {
        const info = await getStreamInfo();
        setStreamData(info);
        setViewerCount(info.viewerCount);
        
        // Connect to WebRTC stream
        await connectToStream(videoRef.current);
        setIsPlaying(true);
        resumePayment();
      } catch (error) {
        console.error('Failed to initialize stream:', error);
      }
    };
    
    initStream();
    
    // Cleanup on unmount
    return () => {
      disconnectFromStream();
      pausePayment();
    };
  }, [streamId]);

  // Update viewer count periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const info = await getStreamInfo();
        setViewerCount(info.viewerCount);
      } catch (error) {
        console.error('Failed to update viewer count:', error);
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="stream-player">
      <div className="player-section">
        <div className="video-container">
          <video
            ref={videoRef}
            className="stream-video"
            autoPlay
            muted
            playsInline
          />
          
          <div className="stream-overlay">
            <div className="viewer-count">
              {viewerCount} viewers
            </div>
            
            <div className="payment-display">
              <div className="cost">Total: {currentCost.toFixed(4)} DOT</div>
              <div className="limit">Limit: {spendingLimit.toFixed(2)} DOT</div>
            </div>
          </div>
        </div>
        
        <div className="stream-info">
          <h1>{streamData?.title}</h1>
          <div className="creator-info">
            <img 
              src={streamData?.creator.avatar} 
              alt={streamData?.creator.username} 
            />
            <div>
              <h2>{streamData?.creator.username}</h2>
              <p>{streamData?.category}</p>
            </div>
            <button className="follow-button">Follow</button>
          </div>
        </div>
      </div>
      
      <div className="interaction-section">
        <ChatBox streamId={streamId} />
        <ReactionPanel streamId={streamId} />
      </div>
    </div>
  );
}
```

### 4. Search and Discovery

#### Search Features
- Keyword search
- Filter by category, duration, date
- Sort by relevance, date, popularity
- Autocomplete suggestions

#### Category Browsing
- Hierarchical category navigation
- Featured categories
- Trending in category

#### Implementation
```tsx
// pages/viewer/search.tsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { VideoGrid, SearchFilters } from 'ui';
import { searchVideos } from 'sdk';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || 'all';
  
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: category,
    sortBy: 'relevance',
    duration: 'any',
    date: 'any'
  });

  useEffect(() => {
    performSearch();
  }, [query, filters]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const searchResults = await searchVideos(query, filters);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-page">
      <div className="search-header">
        <h1>Search Results for "{query}"</h1>
        <SearchFilters 
          filters={filters} 
          onChange={setFilters} 
        />
      </div>
      
      {loading ? (
        <div className="loading">Searching...</div>
      ) : (
        <div className="search-results">
          <VideoGrid videos={results} />
        </div>
      )}
    </div>
  );
}
```

### 5. Social Interaction Features

#### Comment System
- Nested comments
- Reply functionality
- Like/dislike comments
- Comment moderation

#### Reactions and Emotes
- Real-time reactions
- Custom emote support
- Reaction statistics

#### Following System
- Follow/unfollow creators
- Following feed
- Notification preferences

#### Implementation
```tsx
// components/viewer/CommentSection/CommentSection.tsx
import { useState, useEffect } from 'react';
import { getComments, postComment, likeComment } from 'sdk';

export default function CommentSection({ contentId, contentType }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComments();
  }, [contentId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const data = await getComments(contentId, contentType);
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      await postComment(contentId, contentType, newComment);
      setNewComment('');
      // Reload comments to show new one
      loadComments();
    } catch (error) {
      console.error('Failed to post comment:', error);
    }
  };

  const handleLikeComment = async (commentId) => {
    try {
      await likeComment(commentId);
      // Update like count in UI
      setComments(prev => prev.map(comment => 
        comment.id === commentId 
          ? {...comment, likeCount: comment.likeCount + 1}
          : comment
      ));
    } catch (error) {
      console.error('Failed to like comment:', error);
    }
  };

  return (
    <div className="comment-section">
      <h3>Comments ({comments.length})</h3>
      
      <div className="comment-form">
        <textarea 
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
        />
        <button 
          onClick={handlePostComment}
          disabled={!newComment.trim()}
        >
          Post Comment
        </button>
      </div>
      
      {loading ? (
        <div className="loading">Loading comments...</div>
      ) : (
        <div className="comments-list">
          {comments.map(comment => (
            <div key={comment.id} className="comment">
              <div className="comment-header">
                <img 
                  src={comment.author.avatar} 
                  alt={comment.author.username} 
                />
                <div>
                  <h4>{comment.author.username}</h4>
                  <span className="time">{comment.createdAt}</span>
                </div>
              </div>
              <div className="comment-content">
                {comment.content}
              </div>
              <div className="comment-actions">
                <button onClick={() => handleLikeComment(comment.id)}>
                  Like ({comment.likeCount})
                </button>
                <button>Reply</button>
              </div>
              
              {/* Nested comments */}
              {comment.replies && comment.replies.map(reply => (
                <div key={reply.id} className="reply">
                  <div className="comment-header">
                    <img 
                      src={reply.author.avatar} 
                      alt={reply.author.username} 
                    />
                    <div>
                      <h4>{reply.author.username}</h4>
                      <span className="time">{reply.createdAt}</span>
                    </div>
                  </div>
                  <div className="comment-content">
                    {reply.content}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 6. User Profile Management

#### Profile Features
- Profile information display
- Content history
- Following/followers list
- Preferences management

#### Settings
- Notification preferences
- Spending limits
- Privacy controls
- Account security

#### Implementation
```tsx
// pages/viewer/profile.tsx
import { useState, useEffect } from 'react';
import { getUserProfile, updateProfile } from 'sdk';
import { VideoGrid } from 'ui';

export default function UserProfile() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getUserProfile();
      setProfile(data);
      setEditedProfile(data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile(editedProfile);
      setProfile(editedProfile);
      setEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  return (
    <div className="user-profile">
      <div className="profile-header">
        <img 
          src={profile?.avatar} 
          alt={profile?.username} 
          className="profile-avatar"
        />
        
        {editing ? (
          <div className="profile-edit">
            <input 
              type="text" 
              value={editedProfile.username}
              onChange={(e) => setEditedProfile({...editedProfile, username: e.target.value})}
            />
            <textarea 
              value={editedProfile.bio}
              onChange={(e) => setEditedProfile({...editedProfile, bio: e.target.value})}
            />
            <button onClick={handleSaveProfile}>Save</button>
            <button onClick={() => setEditing(false)}>Cancel</button>
          </div>
        ) : (
          <div className="profile-info">
            <h1>{profile?.username}</h1>
            <p>{profile?.bio}</p>
            <button onClick={() => setEditing(true)}>Edit Profile</button>
          </div>
        )}
      </div>
      
      <div className="profile-tabs">
        <button className="active">History</button>
        <button>Following</button>
        <button>Settings</button>
      </div>
      
      <div className="profile-content">
        <h2>Watch History</h2>
        <VideoGrid videos={profile?.watchHistory || []} />
      </div>
    </div>
  );
}
```

## Implementation Roadmap

### Phase 1: Core Playback Interface (Weeks 1-2)

#### Week 1: Video Player Component
- Implement basic video player with HLS support
- Add playback controls
- Create responsive design
- Integrate with video storage system

#### Week 2: Live Stream Player
- Implement WebRTC streaming component
- Add real-time viewer count
- Create stream information display
- Integrate with streaming infrastructure

### Phase 2: Discovery and Search (Weeks 3-4)

#### Week 3: Homepage and Categories
- Create homepage layout
- Implement category browsing
- Add featured content carousel
- Integrate recommendation system

#### Week 4: Search Functionality
- Implement search interface
- Add filtering and sorting
- Create autocomplete suggestions
- Optimize search performance

### Phase 3: Social Features (Weeks 5-6)

#### Week 5: Comment System
- Implement comment display
- Add posting functionality
- Create nested comments
- Integrate with database

#### Week 6: Reactions and Following
- Implement reaction system
- Add following functionality
- Create notification system
- Integrate with user profiles

### Phase 4: Advanced Features (Weeks 7-8)

#### Week 7: Profile Management
- Create user profile interface
- Implement settings management
- Add content history
- Integrate with authentication

#### Week 8: Payment Integration and Testing
- Complete pay-per-second integration
- Add spending limit controls
- Implement transaction history
- Conduct end-to-end testing

## UI/UX Design Considerations

### Responsive Design
- Mobile-first approach
- Tablet optimization
- Desktop enhancements
- Touch-friendly controls

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- Color contrast optimization

### Performance
- Lazy loading for heavy components
- Code splitting
- Image optimization
- Caching strategies

## Security Considerations

### Content Security
- Input validation for comments
- Moderation tools
- Reporting system
- Content filtering

### Payment Security
- Secure payment processing
- Spending limit enforcement
- Transaction logging
- Fraud detection

### Privacy
- GDPR/CCPA compliance
- Data export functionality
- User consent management
- Privacy settings controls

## Testing Strategy

### Unit Testing
- Individual component testing
- Player functionality tests
- Payment integration tests
- API integration functions

### Integration Testing
- Video playback workflow
- Streaming connection process
- Comment and reaction systems
- Search and discovery

### End-to-End Testing
- Complete user journeys
- Cross-browser compatibility
- Mobile responsiveness
- Performance testing

## Success Metrics

### User Experience Metrics
- Video start time (<3 seconds)
- Playback quality (99.9% uptime)
- User engagement rates
- Error rates (<1%)

### Business Metrics
- Viewer retention rate
- Content consumption time
- Payment processing success
- Platform growth metrics

This plan provides a comprehensive roadmap for implementing a feature-rich viewer interface that will provide users with an engaging experience for discovering, watching, and interacting with content on the Vilokanam-view platform, while seamlessly integrating the innovative pay-per-second payment model.