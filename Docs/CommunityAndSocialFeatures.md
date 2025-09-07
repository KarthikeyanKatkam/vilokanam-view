# Community & Social Features Implementation Plan

This document outlines the implementation plan for adding community and social features to the Vilokanam-view platform. These features are essential for creating an engaging Twitch-like experience that fosters community around content creators.

## Current State Analysis

The project currently has:
- Basic user interface with creator and viewer apps
- Blockchain-based payment system
- Simple chat component in creator dashboard
- No community features (follows, subscriptions, notifications)
- No social interactions (friendships, messaging)
- No user profiles or activity feeds

## Feature Requirements

### 1. User Profiles
- Comprehensive profile pages with bio, avatar, cover image
- Activity feeds showing user's streaming history
- Statistics tracking (view time, streams watched, etc.)
- Achievement/badge system

### 2. Follow System
- Follow/unfollow functionality
- Follower/following lists
- Notification system for follows
- Follow recommendations

### 3. Chat Enhancements
- Persistent chat history
- Moderation tools (ban, timeout, slow mode)
- Chat badges and emotes
- Chat commands and bots
- Subscriber-only chat modes

### 4. Notifications
- Real-time notifications
- Notification preferences
- Notification history
- Push notification support

### 5. Subscriptions & Loyalty
- Tiered subscription system
- Subscriber benefits (badges, emotes, etc.)
- Loyalty points system
- Reward redemption

## Technical Architecture

### Database Schema Updates

```sql
-- User profiles
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255);
ALTER TABLE users ADD COLUMN cover_image_url VARCHAR(255);
ALTER TABLE users ADD COLUMN followers_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN following_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN total_view_time INTEGER DEFAULT 0; -- in seconds

-- Followers/Following relationships
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, followed_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_followed ON follows(followed_id);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'follow', 'stream_start', 'subscription', etc.
  reference_id UUID, -- ID of the related entity
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE;

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL, -- 'tier1', 'tier2', 'tier3'
  started_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(subscriber_id, creator_id)
);

CREATE INDEX idx_subscriptions_subscriber ON subscriptions(subscriber_id);
CREATE INDEX idx_subscriptions_creator ON subscriptions(creator_id);
CREATE INDEX idx_subscriptions_active ON subscriptions(is_active);

-- User achievements
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL,
  awarded_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_type ON user_achievements(achievement_type);

-- Chat enhancements
ALTER TABLE stream_viewers ADD COLUMN chat_color VARCHAR(7); -- Hex color code
ALTER TABLE stream_viewers ADD COLUMN is_subscriber BOOLEAN DEFAULT FALSE;
ALTER TABLE stream_viewers ADD COLUMN is_moderator BOOLEAN DEFAULT FALSE;

-- Emotes
CREATE TABLE emotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(50) NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  tier_required VARCHAR(20), -- NULL for global emotes
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_emotes_creator ON emotes(creator_id);
CREATE INDEX idx_emotes_active ON emotes(is_active);

-- User emotes (for subscriber emotes)
CREATE TABLE user_emotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emote_id UUID NOT NULL REFERENCES emotes(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, emote_id)
);

CREATE INDEX idx_user_emotes_user ON user_emotes(user_id);
```

## Implementation Plan

### Phase 1: User Profiles (Weeks 1-2)

#### Week 1: Profile Infrastructure
1. **Profile API Endpoints**
```typescript
// backend/api/profiles.ts
import { Router } from 'express';

const router = Router();

// Get user profile
router.get('/profiles/:userId', async (req, res) => {
  try {
    const profile = await db.users.getProfile(req.params.userId);
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/profiles/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { bio, avatarUrl, coverImageUrl } = req.body;
    
    // Verify user owns this profile
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const updatedProfile = await db.users.updateProfile(userId, {
      bio,
      avatarUrl,
      coverImageUrl
    });
    
    res.json(updatedProfile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user activity feed
router.get('/profiles/:userId/activity', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const activity = await db.users.getActivityFeed(req.params.userId, limit, offset);
    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get activity feed' });
  }
});

export default router;
```

2. **Frontend Profile Components**
```typescript
// frontend/packages/ui/src/components/Profile/ProfileHeader.tsx
import React from 'react';

interface ProfileHeaderProps {
  user: {
    id: string;
    username: string;
    bio: string;
    avatarUrl: string;
    coverImageUrl: string;
    followersCount: number;
    followingCount: number;
    isFollowing: boolean;
  };
  onFollow: () => void;
  onUnfollow: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ 
  user, 
  onFollow, 
  onUnfollow 
}) => {
  return (
    <div className="profile-header">
      {user.coverImageUrl && (
        <div 
          className="cover-image"
          style={{ backgroundImage: `url(${user.coverImageUrl})` }}
        />
      )}
      
      <div className="profile-info">
        <div className="avatar-section">
          <img 
            src={user.avatarUrl || '/default-avatar.png'} 
            alt={user.username}
            className="avatar"
          />
          
          <div className="user-info">
            <h1>{user.username}</h1>
            <p className="bio">{user.bio}</p>
            
            <div className="stats">
              <span>{user.followersCount} followers</span>
              <span>{user.followingCount} following</span>
            </div>
          </div>
        </div>
        
        <div className="actions">
          {user.isFollowing ? (
            <button 
              className="unfollow-button"
              onClick={onUnfollow}
            >
              Unfollow
            </button>
          ) : (
            <button 
              className="follow-button"
              onClick={onFollow}
            >
              Follow
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
```

#### Week 2: Activity Feeds & Statistics
1. **Activity Feed Implementation**
```typescript
// backend/services/ActivityFeedService.ts
class ActivityFeedService {
  async getUserActivityFeed(userId: string, limit: number = 20, offset: number = 0) {
    const activities = await db.activities.getForUser(userId, limit, offset);
    
    return activities.map(activity => {
      switch(activity.type) {
        case 'stream_start':
          return {
            id: activity.id,
            type: 'stream',
            user: activity.user,
            stream: activity.stream,
            timestamp: activity.createdAt,
            message: `${activity.user.username} started streaming ${activity.stream.title}`
          };
          
        case 'follow':
          return {
            id: activity.id,
            type: 'follow',
            user: activity.user,
            targetUser: activity.targetUser,
            timestamp: activity.createdAt,
            message: `${activity.user.username} followed ${activity.targetUser.username}`
          };
          
        case 'subscription':
          return {
            id: activity.id,
            type: 'subscription',
            user: activity.user,
            creator: activity.creator,
            tier: activity.tier,
            timestamp: activity.createdAt,
            message: `${activity.user.username} subscribed to ${activity.creator.username}`
          };
          
        default:
          return activity;
      }
    });
  }
  
  async recordActivity(type: string, userId: string, data: any) {
    await db.activities.create({
      type,
      userId,
      data,
      createdAt: new Date()
    });
    
    // Notify followers if it's a significant activity
    if (['stream_start', 'subscription'].includes(type)) {
      await this.notifyFollowers(userId, type, data);
    }
  }
  
  private async notifyFollowers(userId: string, type: string, data: any) {
    const followers = await db.follows.getFollowers(userId);
    
    for (const follower of followers) {
      await db.notifications.create({
        userId: follower.id,
        type: `follower_${type}`,
        referenceId: data.id,
        message: this.generateNotificationMessage(type, userId, data),
        createdAt: new Date()
      });
    }
  }
  
  private generateNotificationMessage(type: string, userId: string, data: any): string {
    // Implementation depends on activity type
    // This would generate human-readable messages
    return '';
  }
}

export default new ActivityFeedService();
```

2. **Frontend Activity Feed Component**
```typescript
// frontend/packages/ui/src/components/Profile/ActivityFeed.tsx
import React from 'react';

interface Activity {
  id: string;
  type: 'stream' | 'follow' | 'subscription';
  timestamp: Date;
  message: string;
  // Type-specific data
  stream?: any;
  user?: any;
  targetUser?: any;
  creator?: any;
  tier?: string;
}

interface ActivityFeedProps {
  activities: Activity[];
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  const renderActivity = (activity: Activity) => {
    switch(activity.type) {
      case 'stream':
        return (
          <div className="activity-item stream-activity">
            <div className="activity-icon">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M15 8v8H5V8h10m1-2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4V7a1 1 0 0 0-1-1z"/>
              </svg>
            </div>
            <div className="activity-content">
              <p>{activity.message}</p>
              {activity.stream && (
                <div className="stream-preview">
                  <img 
                    src={activity.stream.thumbnailUrl} 
                    alt={activity.stream.title}
                  />
                  <div className="stream-info">
                    <h4>{activity.stream.title}</h4>
                    <p>{activity.stream.viewerCount} viewers</p>
                  </div>
                </div>
              )}
            </div>
            <div className="activity-time">
              {formatTime(activity.timestamp)}
            </div>
          </div>
        );
        
      case 'follow':
        return (
          <div className="activity-item follow-activity">
            <div className="activity-icon">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M12 4a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4z"/>
              </svg>
            </div>
            <div className="activity-content">
              <p>{activity.message}</p>
            </div>
            <div className="activity-time">
              {formatTime(activity.timestamp)}
            </div>
          </div>
        );
        
      case 'subscription':
        return (
          <div className="activity-item subscription-activity">
            <div className="activity-icon">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2m-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div className="activity-content">
              <p>{activity.message}</p>
            </div>
            <div className="activity-time">
              {formatTime(activity.timestamp)}
            </div>
          </div>
        );
        
      default:
        return (
          <div className="activity-item">
            <div className="activity-content">
              <p>{activity.message}</p>
            </div>
            <div className="activity-time">
              {formatTime(activity.timestamp)}
            </div>
          </div>
        );
    }
  };
  
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };
  
  return (
    <div className="activity-feed">
      <h2>Activity</h2>
      <div className="activities">
        {activities.map(activity => (
          <div key={activity.id} className="activity">
            {renderActivity(activity)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;
```

### Phase 2: Follow System (Weeks 3-4)

#### Week 3: Core Follow Functionality
1. **Follow API Implementation**
```typescript
// backend/api/follows.ts
import { Router } from 'express';

const router = Router();

// Follow a user
router.post('/follows', authenticate, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const followerId = req.user.id;
    
    // Prevent self-follow
    if (followerId === targetUserId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }
    
    // Check if already following
    const existingFollow = await db.follows.getByUserPair(followerId, targetUserId);
    if (existingFollow) {
      return res.status(400).json({ error: 'Already following this user' });
    }
    
    // Create follow relationship
    const follow = await db.follows.create({
      followerId,
      followedId: targetUserId
    });
    
    // Update follower/following counts
    await db.users.incrementFollowers(targetUserId);
    await db.users.incrementFollowing(followerId);
    
    // Record activity
    await activityService.recordActivity('follow', followerId, { targetUserId });
    
    res.json({ success: true, follow });
  } catch (error) {
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// Unfollow a user
router.delete('/follows/:targetUserId', authenticate, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const followerId = req.user.id;
    
    // Find follow relationship
    const follow = await db.follows.getByUserPair(followerId, targetUserId);
    if (!follow) {
      return res.status(400).json({ error: 'Not following this user' });
    }
    
    // Delete follow relationship
    await db.follows.delete(follow.id);
    
    // Update follower/following counts
    await db.users.decrementFollowers(targetUserId);
    await db.users.decrementFollowing(followerId);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// Get followers
router.get('/follows/:userId/followers', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const followers = await db.follows.getFollowers(req.params.userId, limit, offset);
    res.json(followers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get followers' });
  }
});

// Get following
router.get('/follows/:userId/following', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const following = await db.follows.getFollowing(req.params.userId, limit, offset);
    res.json(following);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get following' });
  }
});

// Check if following
router.get('/follows/check/:targetUserId', authenticate, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const followerId = req.user.id;
    
    const isFollowing = await db.follows.isFollowing(followerId, targetUserId);
    res.json({ isFollowing });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check follow status' });
  }
});

export default router;
```

2. **Frontend Follow Components**
```typescript
// frontend/packages/ui/src/components/Follow/FollowButton.tsx
import React, { useState } from 'react';

interface FollowButtonProps {
  userId: string;
  isFollowing: boolean;
  onFollowChange: (isFollowing: boolean) => void;
  className?: string;
}

const FollowButton: React.FC<FollowButtonProps> = ({ 
  userId, 
  isFollowing, 
  onFollowChange,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleFollow = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/follows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetUserId: userId })
      });
      
      if (response.ok) {
        onFollowChange(true);
      } else {
        const error = await response.json();
        console.error('Follow failed:', error.error);
      }
    } catch (error) {
      console.error('Follow failed:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUnfollow = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/follows/${userId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        onFollowChange(false);
      } else {
        const error = await response.json();
        console.error('Unfollow failed:', error.error);
      }
    } catch (error) {
      console.error('Unfollow failed:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <button
      className={`follow-button ${isFollowing ? 'following' : ''} ${className}`}
      onClick={isFollowing ? handleUnfollow : handleFollow}
      disabled={isLoading}
    >
      {isLoading ? (
        <span className="loading">...</span>
      ) : isFollowing ? (
        'Following'
      ) : (
        'Follow'
      )}
    </button>
  );
};

export default FollowButton;
```

#### Week 4: Follow Recommendations & Notifications
1. **Recommendation Engine**
```typescript
// backend/services/RecommendationService.ts
class RecommendationService {
  async getFollowRecommendations(userId: string, limit: number = 10) {
    // Get user's interests based on followed users and viewed streams
    const userInterests = await this.getUserInterests(userId);
    
    // Find users with similar interests
    const recommendedUsers = await db.users.findSimilarUsers(
      userId, 
      userInterests, 
      limit
    );
    
    // Filter out already followed users
    const followedUsers = await db.follows.getFollowingIds(userId);
    const filteredRecommendations = recommendedUsers.filter(
      user => !followedUsers.includes(user.id) && user.id !== userId
    );
    
    return filteredRecommendations;
  }
  
  private async getUserInterests(userId: string) {
    // Get categories of streams the user has watched
    const watchedCategories = await db.streamViews.getCategoriesByUser(userId);
    
    // Get categories of streams from followed creators
    const followedCreators = await db.follows.getFollowing(userId);
    const creatorCategories = await db.streams.getCategoriesByCreators(
      followedCreators.map(f => f.id)
    );
    
    // Combine and weight interests
    const interests = {
      categories: [...watchedCategories, ...creatorCategories],
      // Could add more interest factors like tags, languages, etc.
    };
    
    return interests;
  }
  
  async getStreamRecommendations(userId: string, limit: number = 20) {
    // Get currently live streams
    const liveStreams = await db.streams.getLiveStreams(limit * 2);
    
    // Score streams based on user interests
    const scoredStreams = liveStreams.map(stream => {
      const score = this.scoreStreamForUser(stream, userId);
      return { stream, score };
    });
    
    // Sort by score and return top recommendations
    return scoredStreams
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.stream);
  }
  
  private scoreStreamForUser(stream: any, userId: string): number {
    let score = 0;
    
    // Higher score for followed creators
    if (stream.creator && stream.creator.isFollowedByUser) {
      score += 50;
    }
    
    // Score based on category match
    // Implementation would check user's interest in this category
    
    // Score based on current viewer count (popular streams)
    score += Math.log(stream.viewerCount + 1) * 5;
    
    // Score based on stream duration (newer streams)
    const duration = (Date.now() - new Date(stream.startTime).getTime()) / 1000;
    if (duration < 300) { // Less than 5 minutes
      score += 20;
    } else if (duration < 900) { // Less than 15 minutes
      score += 10;
    }
    
    return score;
  }
}

export default new RecommendationService();
```

2. **Notification System**
```typescript
// backend/services/NotificationService.ts
class NotificationService {
  async createNotification(userId: string, type: string, data: any) {
    const message = this.generateMessage(type, data);
    
    const notification = await db.notifications.create({
      userId,
      type,
      referenceId: data.referenceId,
      message,
      createdAt: new Date()
    });
    
    // Emit real-time notification if user is online
    this.emitRealTimeNotification(userId, notification);
    
    return notification;
  }
  
  private generateMessage(type: string, data: any): string {
    switch(type) {
      case 'follow':
        return `${data.follower.username} followed you`;
      case 'stream_start':
        return `${data.creator.username} started streaming ${data.stream.title}`;
      case 'subscriber':
        return `${data.subscriber.username} subscribed to you`;
      case 'tip':
        return `${data.sender.username} sent you a tip of ${data.amount} DOT`;
      case 'new_follower_stream':
        return `${data.follower.username} started following you and is now streaming`;
      default:
        return 'You have a new notification';
    }
  }
  
  private emitRealTimeNotification(userId: string, notification: any) {
    // Implementation would use WebSocket or similar to send
    // real-time notifications to connected clients
    socketService.emitToUser(userId, 'notification', notification);
  }
  
  async markAsRead(notificationId: string, userId: string) {
    const notification = await db.notifications.getById(notificationId);
    
    if (!notification || notification.userId !== userId) {
      throw new Error('Notification not found or unauthorized');
    }
    
    await db.notifications.update(notificationId, { isRead: true });
    
    return { success: true };
  }
  
  async getUnreadCount(userId: string) {
    return await db.notifications.getUnreadCount(userId);
  }
  
  async getUserNotifications(userId: string, limit: number = 20, offset: number = 0) {
    return await db.notifications.getByUser(userId, limit, offset);
  }
}

export default new NotificationService();
```

### Phase 3: Enhanced Chat & Emotes (Weeks 5-6)

#### Week 5: Chat Enhancements
1. **Advanced Chat Features**
```typescript
// backend/services/ChatService.ts
class ChatService {
  async sendMessage(streamId: string, userId: string, message: string) {
    // Validate user can chat (not banned, etc.)
    const canChat = await this.canUserChat(streamId, userId);
    if (!canChat) {
      throw new Error('User cannot send messages in this chat');
    }
    
    // Process emotes and mentions
    const processedMessage = this.processMessage(message);
    
    // Create chat message
    const chatMessage = await db.chatMessages.create({
      streamId,
      userId,
      message: processedMessage.text,
      emotes: processedMessage.emotes,
      mentions: processedMessage.mentions,
      createdAt: new Date()
    });
    
    // Emit message to all viewers
    socketService.emitToStream(streamId, 'chat_message', chatMessage);
    
    // Check for commands
    if (message.startsWith('!')) {
      await this.handleCommand(streamId, userId, message);
    }
    
    return chatMessage;
  }
  
  private processMessage(message: string) {
    // Process emotes
    const emotes = this.extractEmotes(message);
    
    // Process mentions
    const mentions = this.extractMentions(message);
    
    // Process links
    const processedText = this.processLinks(message);
    
    return {
      text: processedText,
      emotes,
      mentions
    };
  }
  
  private extractEmotes(message: string) {
    // Implementation would find emote names in message
    // and replace with image tags
    return [];
  }
  
  private extractMentions(message: string) {
    // Find @mentions in message
    const mentionRegex = /@(\w+)/g;
    const matches = message.match(mentionRegex);
    
    if (!matches) return [];
    
    return matches.map(match => match.substring(1)); // Remove @ symbol
  }
  
  private async handleCommand(streamId: string, userId: string, message: string) {
    const [command, ...args] = message.substring(1).split(' ');
    
    switch(command.toLowerCase()) {
      case 'help':
        await this.sendHelpMessage(streamId);
        break;
        
      case 'commands':
        await this.sendCommandsList(streamId);
        break;
        
      // Moderator commands
      case 'ban':
        await this.handleBanCommand(streamId, userId, args);
        break;
        
      case 'timeout':
        await this.handleTimeoutCommand(streamId, userId, args);
        break;
        
      case 'slow':
        await this.handleSlowCommand(streamId, userId, args);
        break;
    }
  }
  
  async moderateMessage(messageId: string, moderatorId: string, action: string) {
    // Check if user has moderation permissions
    const isModerator = await db.streamViewers.isModerator(messageId, moderatorId);
    if (!isModerator) {
      throw new Error('User is not a moderator');
    }
    
    switch(action) {
      case 'delete':
        await db.chatMessages.delete(messageId);
        socketService.emitToStream(
          (await db.chatMessages.getById(messageId)).streamId,
          'chat_message_deleted',
          messageId
        );
        break;
        
      case 'ban':
        // Implementation for banning user
        break;
    }
  }
}

export default new ChatService();
```

#### Week 6: Emote System
1. **Emote Management**
```typescript
// backend/services/EmoteService.ts
class EmoteService {
  async createEmote(creatorId: string, name: string, imageUrl: string, tier?: string) {
    // Validate emote name (no spaces, special chars, etc.)
    if (!this.isValidEmoteName(name)) {
      throw new Error('Invalid emote name');
    }
    
    // Check if emote name already exists for this creator
    const existingEmote = await db.emotes.getByNameAndCreator(name, creatorId);
    if (existingEmote) {
      throw new Error('Emote name already exists');
    }
    
    // Create emote
    const emote = await db.emotes.create({
      creatorId,
      name,
      imageUrl,
      tierRequired: tier,
      createdAt: new Date(),
      isActive: true
    });
    
    return emote;
  }
  
  async getUserAvailableEmotes(userId: string) {
    // Get global emotes
    const globalEmotes = await db.emotes.getGlobal();
    
    // Get user's subscription emotes
    const subscriptionEmotes = await db.emotes.getForSubscribers(userId);
    
    // Get user's own custom emotes
    const userEmotes = await db.emotes.getByCreator(userId);
    
    return [...globalEmotes, ...subscriptionEmotes, ...userEmotes];
  }
  
  async unlockSubscriberEmote(userId: string, emoteId: string) {
    // Verify user has access to this emote (is subscriber to creator)
    const emote = await db.emotes.getById(emoteId);
    if (!emote) {
      throw new Error('Emote not found');
    }
    
    const isSubscriber = await db.subscriptions.isSubscriber(
      userId, 
      emote.creatorId
    );
    
    if (!isSubscriber) {
      throw new Error('User is not subscribed to this creator');
    }
    
    // Check if user already has this emote
    const hasEmote = await db.userEmotes.hasEmote(userId, emoteId);
    if (hasEmote) {
      return { success: true, message: 'Emote already unlocked' };
    }
    
    // Unlock emote for user
    await db.userEmotes.create({
      userId,
      emoteId,
      unlockedAt: new Date()
    });
    
    return { success: true, message: 'Emote unlocked' };
  }
}

export default new EmoteService();
```

### Phase 4: Subscriptions & Loyalty (Weeks 7-8)

#### Week 7: Subscription System
1. **Subscription Management**
```typescript
// backend/services/SubscriptionService.ts
class SubscriptionService {
  async subscribe(subscriberId: string, creatorId: string, tier: string) {
    // Validate tier
    const tierInfo = this.getTierInfo(tier);
    if (!tierInfo) {
      throw new Error('Invalid subscription tier');
    }
    
    // Check if already subscribed
    const existingSubscription = await db.subscriptions.getActive(
      subscriberId, 
      creatorId
    );
    
    if (existingSubscription) {
      // Update existing subscription
      return await this.updateSubscription(
        existingSubscription.id, 
        tier
      );
    }
    
    // Create new subscription
    const subscription = await db.subscriptions.create({
      subscriberId,
      creatorId,
      tier,
      startedAt: new Date(),
      expiresAt: this.calculateExpirationDate(tier),
      isActive: true
    });
    
    // Unlock tier benefits
    await this.unlockTierBenefits(subscriberId, creatorId, tier);
    
    // Record activity
    await activityService.recordActivity('subscription', subscriberId, {
      creatorId,
      tier
    });
    
    // Create blockchain transaction for payment
    await blockchainService.processSubscriptionPayment(
      subscriberId, 
      creatorId, 
      tierInfo.price
    );
    
    return subscription;
  }
  
  private getTierInfo(tier: string) {
    const tiers = {
      tier1: { name: 'Tier 1', price: 5, benefits: ['Subscriber badge'] },
      tier2: { name: 'Tier 2', price: 10, benefits: ['Subscriber badge', 'Custom emotes'] },
      tier3: { name: 'Tier 3', price: 25, benefits: ['Subscriber badge', 'Custom emotes', 'Special chat badge'] }
    };
    
    return tiers[tier];
  }
  
  private async unlockTierBenefits(subscriberId: string, creatorId: string, tier: string) {
    // Unlock subscriber badge
    await db.userBadges.create({
      userId: subscriberId,
      badgeType: 'subscriber',
      referenceId: creatorId,
      metadata: { tier }
    });
    
    // For higher tiers, unlock emotes
    if (tier === 'tier2' || tier === 'tier3') {
      const creatorEmotes = await db.emotes.getByCreatorAndTier(creatorId, tier);
      for (const emote of creatorEmotes) {
        await emoteService.unlockSubscriberEmote(subscriberId, emote.id);
      }
    }
  }
  
  async cancelSubscription(subscriberId: string, creatorId: string) {
    const subscription = await db.subscriptions.getActive(
      subscriberId, 
      creatorId
    );
    
    if (!subscription) {
      throw new Error('No active subscription found');
    }
    
    // Mark as inactive
    await db.subscriptions.update(subscription.id, { isActive: false });
    
    // Remove tier benefits
    await this.removeTierBenefits(subscriberId, creatorId);
    
    return { success: true };
  }
  
  async getCreatorSubscribers(creatorId: string) {
    return await db.subscriptions.getActiveByCreator(creatorId);
  }
  
  async getUserSubscriptions(userId: string) {
    return await db.subscriptions.getActiveBySubscriber(userId);
  }
}

export default new SubscriptionService();
```

#### Week 8: Loyalty & Rewards System
1. **Loyalty Points Implementation**
```typescript
// backend/services/LoyaltyService.ts
class LoyaltyService {
  async awardPoints(userId: string, activityType: string, amount?: number) {
    const points = amount || this.getPointsForActivity(activityType);
    
    // Award points
    await db.userPoints.increment(userId, points);
    
    // Check for level up
    const currentLevel = await db.userLevels.get(userId);
    const newLevel = this.calculateLevel(
      currentLevel.points + points
    );
    
    if (newLevel.level > currentLevel.level) {
      await db.userLevels.update(userId, {
        level: newLevel.level,
        points: currentLevel.points + points
      });
      
      // Award level up rewards
      await this.awardLevelRewards(userId, newLevel.level);
    } else {
      await db.userLevels.updatePoints(userId, currentLevel.points + points);
    }
    
    return {
      pointsAwarded: points,
      newTotal: currentLevel.points + points,
      leveledUp: newLevel.level > currentLevel.level,
      newLevel: newLevel.level
    };
  }
  
  private getPointsForActivity(activityType: string): number {
    const pointValues = {
      'stream_view_minute': 1,
      'chat_message': 2,
      'follow': 10,
      'subscription': 50,
      'tip': 1, // Per DOT
      'raid': 25,
      'host': 20
    };
    
    return pointValues[activityType] || 0;
  }
  
  private calculateLevel(points: number) {
    // Simple level calculation - can be made more complex
    const level = Math.floor(points / 100) + 1;
    return { level, points };
  }
  
  private async awardLevelRewards(userId: string, level: number) {
    const rewards = this.getLevelRewards(level);
    
    for (const reward of rewards) {
      switch(reward.type) {
        case 'badge':
          await db.userBadges.create({
            userId,
            badgeType: reward.badgeType,
            metadata: reward.metadata
          });
          break;
          
        case 'emote':
          if (reward.emoteId) {
            await emoteService.unlockSubscriberEmote(userId, reward.emoteId);
          }
          break;
          
        case 'points_bonus':
          await db.userPoints.increment(userId, reward.amount);
          break;
      }
    }
    
    // Notify user of level up
    await notificationService.createNotification(userId, 'level_up', {
      level,
      rewards
    });
  }
  
  private getLevelRewards(level: number) {
    // Define rewards for each level
    const levelRewards: Record<number, any[]> = {
      5: [{ type: 'badge', badgeType: 'regular_viewer' }],
      10: [{ type: 'badge', badgeType: 'dedicated_fan' }],
      25: [{ type: 'emote', emoteId: 'special_emote_id' }],
      50: [{ type: 'badge', badgeType: 'super_fan' }],
      100: [
        { type: 'badge', badgeType: 'legend' },
        { type: 'points_bonus', amount: 1000 }
      ]
    };
    
    return levelRewards[level] || [];
  }
  
  async getRedeemableRewards(userId: string) {
    const userPoints = await db.userPoints.get(userId);
    const availableRewards = await db.rewards.getAll();
    
    return availableRewards.filter(reward => 
      reward.cost <= userPoints.points && 
      !this.hasUserRedeemed(userId, reward.id)
    );
  }
  
  async redeemReward(userId: string, rewardId: string) {
    const reward = await db.rewards.getById(rewardId);
    const userPoints = await db.userPoints.get(userId);
    
    if (userPoints.points < reward.cost) {
      throw new Error('Insufficient points');
    }
    
    if (await this.hasUserRedeemed(userId, rewardId)) {
      throw new Error('Reward already redeemed');
    }
    
    // Deduct points
    await db.userPoints.decrement(userId, reward.cost);
    
    // Record redemption
    await db.rewardRedemptions.create({
      userId,
      rewardId,
      redeemedAt: new Date()
    });
    
    // Process reward (could be digital items, discounts, etc.)
    await this.processReward(userId, reward);
    
    return { success: true, reward };
  }
  
  private async processReward(userId: string, reward: any) {
    // Implementation depends on reward type
    // Could involve sending emails, creating database entries, etc.
  }
}

export default new LoyaltyService();
```

## Frontend Implementation

### Profile Page Component
```typescript
// frontend/apps/viewer/src/app/profile/[userId]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ProfileHeader, ActivityFeed, FollowButton } from 'ui';
import { useUserProfile } from 'sdk';

interface ProfilePageProps {
  params: { userId: string };
}

const ProfilePage: React.FC<ProfilePageProps> = ({ params }) => {
  const { userId } = params;
  const { profile, isLoading, error } = useUserProfile(userId);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (profile) {
      setIsFollowing(profile.isFollowing);
    }
  }, [profile]);

  const handleFollowChange = (following: boolean) => {
    setIsFollowing(following);
    // Update profile data to reflect new follow status
  };

  if (isLoading) {
    return <div>Loading profile...</div>;
  }

  if (error) {
    return <div>Error loading profile: {error}</div>;
  }

  if (!profile) {
    return <div>Profile not found</div>;
  }

  return (
    <div className="profile-page">
      <ProfileHeader 
        user={{
          ...profile,
          isFollowing
        }}
        onFollow={() => handleFollowChange(true)}
        onUnfollow={() => handleFollowChange(false)}
      />
      
      <div className="profile-content">
        <div className="sidebar">
          <div className="stats-card">
            <h3>Statistics</h3>
            <ul>
              <li>Total View Time: {profile.totalViewTime} minutes</li>
              <li>Streams Watched: {profile.streamsWatched}</li>
              <li>Followers: {profile.followersCount}</li>
              <li>Following: {profile.followingCount}</li>
            </ul>
          </div>
          
          <div className="achievements-card">
            <h3>Achievements</h3>
            <div className="achievements-grid">
              {profile.achievements.map(achievement => (
                <div key={achievement.id} className="achievement">
                  <img src={achievement.iconUrl} alt={achievement.name} />
                  <span>{achievement.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="main-content">
          <ActivityFeed activities={profile.activities} />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
```

### Notifications Component
```typescript
// frontend/packages/ui/src/components/Notifications/NotificationBell.tsx
import React, { useState, useEffect } from 'react';
import { useNotifications } from 'sdk';

const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead } = useNotifications();
  
  const toggleNotifications = () => {
    setIsOpen(!isOpen);
  };
  
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };
  
  return (
    <div className="notification-bell">
      <button 
        className="bell-button"
        onClick={toggleNotifications}
      >
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M12 22a2.01 2.01 0 0 1-2-2h4a2.01 2.01 0 0 1-2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
        </svg>
        {unreadCount > 0 && (
          <span className="unread-count">{unreadCount}</span>
        )}
      </button>
      
      {isOpen && (
        <div className="notifications-dropdown">
          <div className="notifications-header">
            <h3>Notifications</h3>
            <button className="mark-all-read">Mark all as read</button>
          </div>
          
          <div className="notifications-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                No notifications
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                >
                  <div className="notification-content">
                    <p>{notification.message}</p>
                    <span className="notification-time">
                      {formatTime(notification.createdAt)}
                    </span>
                  </div>
                  {!notification.isRead && (
                    <button 
                      className="mark-read"
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

export default NotificationBell;
```

## Integration with Blockchain

### Enhanced Subscription Payments
```typescript
// frontend/packages/sdk/src/subscription.ts
import { ApiPromise } from '@polkadot/api';

class SubscriptionService {
  private api: ApiPromise;
  
  constructor(api: ApiPromise) {
    this.api = api;
  }
  
  async subscribe(creatorId: string, tier: string, account: any) {
    try {
      // Get subscription price from blockchain
      const price = await this.getSubscriptionPrice(tier);
      
      // Create subscription transaction
      const tx = this.api.tx.subscriptions.subscribe(creatorId, tier);
      
      // Sign and send transaction
      const hash = await tx.signAndSend(account);
      
      return { success: true, txHash: hash };
    } catch (error) {
      console.error('Subscription failed:', error);
      throw error;
    }
  }
  
  private async getSubscriptionPrice(tier: string): Promise<number> {
    // Query blockchain for subscription prices
    const price = await this.api.query.subscriptions.tierPrices(tier);
    return price.toNumber();
  }
  
  async getSubscriptionStatus(subscriberId: string, creatorId: string) {
    // Query blockchain for subscription status
    const status = await this.api.query.subscriptions.subscriptionStatus(
      subscriberId, 
      creatorId
    );
    
    return {
      isActive: status.isActive,
      tier: status.tier,
      expiresAt: status.expiresAt
    };
  }
}

export default SubscriptionService;
```

## Implementation Timeline

### Month 1
- Weeks 1-2: User profiles and activity feeds
- Weeks 3-4: Follow system and recommendations

### Month 2
- Weeks 5-6: Enhanced chat and emote system
- Weeks 7-8: Subscription and loyalty systems

This implementation plan provides a comprehensive approach to adding community and social features to the Vilokanam-view platform, making it a fully-featured Twitch-like streaming service with strong community engagement capabilities.