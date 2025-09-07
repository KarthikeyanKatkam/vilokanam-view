# Social Features Implementation Plan

## Overview

This document outlines the plan for implementing social features for the Vilokanam-view platform, including following creators, commenting on content, and reacting to videos and live streams. These features will enhance user engagement and build a community around the platform's content.

## Current State Analysis

The platform currently has:
- Basic viewer and creator dashboards
- No social interaction features
- No following system
- No commenting system
- No reaction/emote system
- No notification system

## Social Features Requirements

### Core Features
1. Following/unfollowing creators
2. Commenting on videos and live streams
3. Reactions and emotes
4. Real-time notifications
5. Activity feeds
6. User mentions and tagging

### Technical Requirements
1. Real-time communication for live features
2. Scalable database design
3. Efficient notification delivery
4. Moderation capabilities
5. Performance optimization

## System Architecture

### Component Overview

#### 1. Social Service
- Following system implementation
- Comment management
- Reaction handling
- Activity feed generation

#### 2. Notification Service
- Real-time notification delivery
- Notification preferences
- Push notification support
- Email notifications

#### 3. Real-time Communication
- WebSocket connections
- Presence detection
- Message broadcasting
- Scalable pub/sub system

#### 4. Moderation Service
- Content filtering
- Report handling
- Automated moderation
- Manual review workflows

### Data Flow

1. **Social Interactions**
   - User follows creator
   - User comments on content
   - User reacts to content
   - System generates activity

2. **Notification Processing**
   - Activity triggers notification
   - Notification queued for delivery
   - User receives notification
   - User interacts with notification

3. **Real-time Updates**
   - Live stream comments
   - Real-time reaction counts
   - Follower count updates
   - Presence status updates

## Following System Implementation

### Following Service

#### Core Implementation
```javascript
// services/following-service.js
import redis from 'redis';

class FollowingService {
  constructor(db) {
    this.db = db;
    this.redisClient = redis.createClient();
  }

  // Follow a user
  async followUser(followerId, followingId) {
    try {
      // Prevent self-following
      if (followerId === followingId) {
        throw new Error('Cannot follow yourself');
      }

      // Check if already following
      const existingFollow = await this.db.follows.findByFollowerAndFollowing(
        followerId, 
        followingId
      );
      
      if (existingFollow) {
        throw new Error('Already following this user');
      }

      // Create follow relationship
      const follow = await this.db.follows.create({
        id: uuidv4(),
        follower_id: followerId,
        following_id: followingId,
        created_at: new Date()
      });

      // Update follower/following counts in cache
      await Promise.all([
        this.redisClient.incr(`user:${followingId}:followers_count`),
        this.redisClient.incr(`user:${followerId}:following_count`)
      ]);

      // Clear cached profile data
      await Promise.all([
        this.redisClient.del(`profile:${followingId}`),
        this.redisClient.del(`profile:${followerId}`)
      ]);

      // Notify followed user
      await this.notificationService.sendNotification({
        userId: followingId,
        type: 'new_follower',
        actorId: followerId,
        message: `${follower.username} started following you`
      });

      // Add to activity feed
      await this.activityService.createActivity({
        userId: followingId,
        type: 'follow',
        actorId: followerId,
        targetId: followingId,
        target: 'user'
      });

      return follow;
    } catch (error) {
      console.error('Follow user failed:', error);
      throw new Error('Failed to follow user');
    }
  }

  // Unfollow a user
  async unfollowUser(followerId, followingId) {
    try {
      // Find follow relationship
      const follow = await this.db.follows.findByFollowerAndFollowing(
        followerId, 
        followingId
      );
      
      if (!follow) {
        throw new Error('Not following this user');
      }

      // Delete follow relationship
      await this.db.follows.delete(follow.id);

      // Update follower/following counts in cache
      await Promise.all([
        this.redisClient.decr(`user:${followingId}:followers_count`),
        this.redisClient.decr(`user:${followerId}:following_count`)
      ]);

      // Clear cached profile data
      await Promise.all([
        this.redisClient.del(`profile:${followingId}`),
        this.redisClient.del(`profile:${followerId}`)
      ]);

      return { success: true, message: 'Unfollowed successfully' };
    } catch (error) {
      console.error('Unfollow user failed:', error);
      throw new Error('Failed to unfollow user');
    }
  }

  // Get followers for a user
  async getFollowers(userId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      const followers = await this.db.follows.getFollowers(
        userId, 
        limit, 
        offset
      );

      const total = await this.db.follows.countFollowers(userId);

      return {
        followers: followers,
        total: total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Get followers failed:', error);
      throw new Error('Failed to retrieve followers');
    }
  }

  // Get following for a user
  async getFollowing(userId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      const following = await this.db.follows.getFollowing(
        userId, 
        limit, 
        offset
      );

      const total = await this.db.follows.countFollowing(userId);

      return {
        following: following,
        total: total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Get following failed:', error);
      throw new Error('Failed to retrieve following');
    }
  }

  // Check if user is following another user
  async isFollowing(followerId, followingId) {
    try {
      // Try cache first
      const cached = await this.redisClient.get(
        `following:${followerId}:${followingId}`
      );
      
      if (cached !== null) {
        return cached === 'true';
      }

      // Check database
      const follow = await this.db.follows.findByFollowerAndFollowing(
        followerId, 
        followingId
      );

      const isFollowing = !!follow;

      // Cache result for 1 hour
      await this.redisClient.setex(
        `following:${followerId}:${followingId}`,
        3600,
        isFollowing.toString()
      );

      return isFollowing;
    } catch (error) {
      console.error('Is following check failed:', error);
      return false;
    }
  }

  // Get follower count for a user
  async getFollowerCount(userId) {
    try {
      // Try cache first
      const cached = await this.redisClient.get(`user:${userId}:followers_count`);
      if (cached !== null) {
        return parseInt(cached, 10);
      }

      // Get from database
      const count = await this.db.follows.countFollowers(userId);

      // Cache for 10 minutes
      await this.redisClient.setex(
        `user:${userId}:followers_count`,
        600,
        count.toString()
      );

      return count;
    } catch (error) {
      console.error('Get follower count failed:', error);
      return 0;
    }
  }

  // Get following count for a user
  async getFollowingCount(userId) {
    try {
      // Try cache first
      const cached = await this.redisClient.get(`user:${userId}:following_count`);
      if (cached !== null) {
        return parseInt(cached, 10);
      }

      // Get from database
      const count = await this.db.follows.countFollowing(userId);

      // Cache for 10 minutes
      await this.redisClient.setex(
        `user:${userId}:following_count`,
        600,
        count.toString()
      );

      return count;
    } catch (error) {
      console.error('Get following count failed:', error);
      return 0;
    }
  }

  // Get mutual followers between two users
  async getMutualFollowers(userId1, userId2, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      const mutualFollowers = await this.db.follows.getMutualFollowers(
        userId1, 
        userId2, 
        limit, 
        offset
      );

      const total = await this.db.follows.countMutualFollowers(userId1, userId2);

      return {
        mutualFollowers: mutualFollowers,
        total: total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Get mutual followers failed:', error);
      throw new Error('Failed to retrieve mutual followers');
    }
  }
}

export default FollowingService;
```

## Comment System Implementation

### Comment Service

#### Core Implementation
```javascript
// services/comment-service.js
import { v4 as uuidv4 } from 'uuid';
import redis from 'redis';

class CommentService {
  constructor(db, websocketService, notificationService) {
    this.db = db;
    this.websocketService = websocketService;
    this.notificationService = notificationService;
    this.redisClient = redis.createClient();
  }

  // Create a comment
  async createComment(commentData) {
    try {
      const {
        contentId,
        contentType, // 'video' or 'stream'
        authorId,
        parentId, // for nested comments
        content
      } = commentData;

      // Validate content
      if (!content || content.trim().length === 0) {
        throw new Error('Comment content is required');
      }

      if (content.length > 1000) {
        throw new Error('Comment content is too long (max 1000 characters)');
      }

      // Check for spam/multiple rapid comments
      const recentComments = await this.redisClient.get(
        `user:${authorId}:recent_comments`
      );
      
      if (recentComments && parseInt(recentComments) >= 5) {
        throw new Error('Please wait before posting another comment');
      }

      // Create comment
      const comment = await this.db.comments.create({
        id: uuidv4(),
        content_id: contentId,
        content_type: contentType,
        author_id: authorId,
        parent_id: parentId,
        content: content.trim(),
        created_at: new Date(),
        updated_at: new Date()
      });

      // Increment recent comments counter
      await this.redisClient.incr(`user:${authorId}:recent_comments`);
      await this.redisClient.expire(`user:${authorId}:recent_comments`, 60); // 1 minute

      // Update content comment count
      if (contentType === 'video') {
        await this.db.videos.incrementCommentCount(contentId);
      } else if (contentType === 'stream') {
        await this.db.streams.incrementCommentCount(contentId);
      }

      // Clear cached comment counts
      await this.redisClient.del(`content:${contentId}:comments_count`);

      // Notify content creator (unless they're the commenter)
      const contentCreator = await this.getContentCreator(contentId, contentType);
      if (contentCreator && contentCreator.id !== authorId) {
        await this.notificationService.sendNotification({
          userId: contentCreator.id,
          type: 'new_comment',
          actorId: authorId,
          targetId: contentId,
          targetType: contentType,
          message: `${comment.author.username} commented on your ${contentType}`
        });
      }

      // Notify parent comment author (for replies)
      if (parentId) {
        const parentComment = await this.db.comments.findById(parentId);
        if (parentComment && parentComment.author_id !== authorId) {
          await this.notificationService.sendNotification({
            userId: parentComment.author_id,
            type: 'comment_reply',
            actorId: authorId,
            targetId: parentId,
            targetType: 'comment',
            message: `${comment.author.username} replied to your comment`
          });
        }
      }

      // Broadcast comment in real-time (for live streams)
      if (contentType === 'stream') {
        await this.websocketService.broadcastToStream(
          contentId,
          'new_comment',
          comment
        );
      }

      // Add to activity feed
      await this.activityService.createActivity({
        userId: contentCreator.id,
        type: 'comment',
        actorId: authorId,
        targetId: contentId,
        target: contentType,
        content: content.substring(0, 100) + (content.length > 100 ? '...' : '')
      });

      return comment;
    } catch (error) {
      console.error('Create comment failed:', error);
      throw new Error(error.message || 'Failed to create comment');
    }
  }

  // Get comments for content
  async getComments(contentId, contentType, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'desc',
        parentId = null // for nested comments
      } = options;

      const offset = (page - 1) * limit;

      const comments = await this.db.comments.findByContent(
        contentId,
        contentType,
        {
          limit,
          offset,
          sortBy,
          sortOrder,
          parentId
        }
      );

      const total = await this.db.comments.countByContent(
        contentId,
        contentType,
        { parentId }
      );

      // Get like counts for comments
      const commentIds = comments.map(comment => comment.id);
      const likeCounts = await this.getCommentLikeCounts(commentIds);

      // Attach like counts to comments
      const commentsWithLikes = comments.map(comment => ({
        ...comment,
        like_count: likeCounts[comment.id] || 0
      }));

      return {
        comments: commentsWithLikes,
        total: total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Get comments failed:', error);
      throw new Error('Failed to retrieve comments');
    }
  }

  // Update a comment
  async updateComment(commentId, authorId, content) {
    try {
      // Validate content
      if (!content || content.trim().length === 0) {
        throw new Error('Comment content is required');
      }

      if (content.length > 1000) {
        throw new Error('Comment content is too long (max 1000 characters)');
      }

      // Check if comment exists and belongs to user
      const comment = await this.db.comments.findById(commentId);
      if (!comment) {
        throw new Error('Comment not found');
      }

      if (comment.author_id !== authorId) {
        throw new Error('Not authorized to edit this comment');
      }

      // Update comment
      const updatedComment = await this.db.comments.update(commentId, {
        content: content.trim(),
        updated_at: new Date()
      });

      return updatedComment;
    } catch (error) {
      console.error('Update comment failed:', error);
      throw new Error(error.message || 'Failed to update comment');
    }
  }

  // Delete a comment
  async deleteComment(commentId, authorId) {
    try {
      // Check if comment exists and belongs to user
      const comment = await this.db.comments.findById(commentId);
      if (!comment) {
        throw new Error('Comment not found');
      }

      // Check permissions (author or content creator)
      const contentCreator = await this.getContentCreator(
        comment.content_id,
        comment.content_type
      );

      if (comment.author_id !== authorId && contentCreator.id !== authorId) {
        throw new Error('Not authorized to delete this comment');
      }

      // Delete comment and all replies
      await this.db.comments.deleteWithReplies(commentId);

      // Decrement content comment count
      if (comment.content_type === 'video') {
        await this.db.videos.decrementCommentCount(comment.content_id);
      } else if (comment.content_type === 'stream') {
        await this.db.streams.decrementCommentCount(comment.content_id);
      }

      // Clear cached comment counts
      await this.redisClient.del(`content:${comment.content_id}:comments_count`);

      return { success: true, message: 'Comment deleted successfully' };
    } catch (error) {
      console.error('Delete comment failed:', error);
      throw new Error(error.message || 'Failed to delete comment');
    }
  }

  // Like a comment
  async likeComment(commentId, userId) {
    try {
      // Check if already liked
      const existingLike = await this.db.comment_likes.findByCommentAndUser(
        commentId,
        userId
      );

      if (existingLike) {
        throw new Error('Already liked this comment');
      }

      // Create like
      const like = await this.db.comment_likes.create({
        id: uuidv4(),
        comment_id: commentId,
        user_id: userId,
        created_at: new Date()
      });

      // Update like count in cache
      await this.redisClient.incr(`comment:${commentId}:likes_count`);

      // Clear cached like counts
      await this.redisClient.del(`user:${userId}:liked_comments`);

      // Notify comment author (unless they're the liker)
      const comment = await this.db.comments.findById(commentId);
      if (comment && comment.author_id !== userId) {
        await this.notificationService.sendNotification({
          userId: comment.author_id,
          type: 'comment_like',
          actorId: userId,
          targetId: commentId,
          targetType: 'comment',
          message: `${like.user.username} liked your comment`
        });
      }

      return like;
    } catch (error) {
      console.error('Like comment failed:', error);
      throw new Error(error.message || 'Failed to like comment');
    }
  }

  // Unlike a comment
  async unlikeComment(commentId, userId) {
    try {
      // Check if liked
      const like = await this.db.comment_likes.findByCommentAndUser(
        commentId,
        userId
      );

      if (!like) {
        throw new Error('Not liked this comment');
      }

      // Delete like
      await this.db.comment_likes.delete(like.id);

      // Update like count in cache
      await this.redisClient.decr(`comment:${commentId}:likes_count`);

      // Clear cached like counts
      await this.redisClient.del(`user:${userId}:liked_comments`);

      return { success: true, message: 'Comment unliked successfully' };
    } catch (error) {
      console.error('Unlike comment failed:', error);
      throw new Error(error.message || 'Failed to unlike comment');
    }
  }

  // Get comment like count
  async getCommentLikeCount(commentId) {
    try {
      // Try cache first
      const cached = await this.redisClient.get(`comment:${commentId}:likes_count`);
      if (cached !== null) {
        return parseInt(cached, 10);
      }

      // Get from database
      const count = await this.db.comment_likes.countByComment(commentId);

      // Cache for 5 minutes
      await this.redisClient.setex(
        `comment:${commentId}:likes_count`,
        300,
        count.toString()
      );

      return count;
    } catch (error) {
      console.error('Get comment like count failed:', error);
      return 0;
    }
  }

  // Get like counts for multiple comments
  async getCommentLikeCounts(commentIds) {
    try {
      const likeCounts = {};

      // Try to get from cache first
      const cachedResults = await Promise.all(
        commentIds.map(id => this.redisClient.get(`comment:${id}:likes_count`))
      );

      const uncachedIds = [];
      cachedResults.forEach((cached, index) => {
        const id = commentIds[index];
        if (cached !== null) {
          likeCounts[id] = parseInt(cached, 10);
        } else {
          uncachedIds.push(id);
        }
      });

      // Get uncached counts from database
      if (uncachedIds.length > 0) {
        const dbCounts = await this.db.comment_likes.countByComments(uncachedIds);
        
        // Add to results and cache
        for (const [id, count] of Object.entries(dbCounts)) {
          likeCounts[id] = count;
          await this.redisClient.setex(
            `comment:${id}:likes_count`,
            300,
            count.toString()
          );
        }
      }

      return likeCounts;
    } catch (error) {
      console.error('Get comment like counts failed:', error);
      return {};
    }
  }

  // Get user's liked comments
  async getUserLikedComments(userId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      const likedComments = await this.db.comment_likes.findByUser(
        userId,
        limit,
        offset
      );

      const total = await this.db.comment_likes.countByUser(userId);

      return {
        likedComments: likedComments,
        total: total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Get user liked comments failed:', error);
      throw new Error('Failed to retrieve liked comments');
    }
  }

  // Helper function to get content creator
  async getContentCreator(contentId, contentType) {
    try {
      if (contentType === 'video') {
        const video = await this.db.videos.findById(contentId);
        return video ? video.creator : null;
      } else if (contentType === 'stream') {
        const stream = await this.db.streams.findById(contentId);
        return stream ? stream.creator : null;
      }
      return null;
    } catch (error) {
      console.error('Get content creator failed:', error);
      return null;
    }
  }

  // Moderate a comment (admin/moderator function)
  async moderateComment(commentId, action, reason = '') {
    try {
      const comment = await this.db.comments.findById(commentId);
      if (!comment) {
        throw new Error('Comment not found');
      }

      switch (action) {
        case 'hide':
          await this.db.comments.update(commentId, {
            is_hidden: true,
            moderated_at: new Date(),
            moderation_reason: reason
          });
          break;
          
        case 'delete':
          await this.db.comments.deleteWithReplies(commentId);
          break;
          
        case 'warn':
          // Send warning to user
          await this.notificationService.sendNotification({
            userId: comment.author_id,
            type: 'comment_warning',
            message: `Your comment was flagged for review: ${reason}`
          });
          break;
          
        default:
          throw new Error('Invalid moderation action');
      }

      return { success: true, message: `Comment ${action}d successfully` };
    } catch (error) {
      console.error('Moderate comment failed:', error);
      throw new Error(error.message || 'Failed to moderate comment');
    }
  }
}

export default CommentService;
```

## Reaction System Implementation

### Reaction Service

#### Core Implementation
```javascript
// services/reaction-service.js
import { v4 as uuidv4 } from 'uuid';
import redis from 'redis';

class ReactionService {
  constructor(db, websocketService, notificationService) {
    this.db = db;
    this.websocketService = websocketService;
    this.notificationService = notificationService;
    this.redisClient = redis.createClient();
    
    // Default reactions
    this.defaultReactions = [
      { id: 'like', name: 'Like', emoji: '👍' },
      { id: 'love', name: 'Love', emoji: '❤️' },
      { id: 'laugh', name: 'Laugh', emoji: '😂' },
      { id: 'wow', name: 'Wow', emoji: '😮' },
      { id: 'sad', name: 'Sad', emoji: '😢' },
      { id: 'angry', name: 'Angry', emoji: '😠' }
    ];
  }

  // Get available reactions
  async getAvailableReactions() {
    try {
      // Return default reactions for now
      // In the future, this could be customizable per community
      return this.defaultReactions;
    } catch (error) {
      console.error('Get available reactions failed:', error);
      return this.defaultReactions;
    }
  }

  // Add reaction to content
  async addReaction(reactionData) {
    try {
      const {
        contentId,
        contentType, // 'video', 'stream', 'comment'
        userId,
        reactionId
      } = reactionData;

      // Validate reaction
      const availableReactions = await this.getAvailableReactions();
      const reaction = availableReactions.find(r => r.id === reactionId);
      
      if (!reaction) {
        throw new Error('Invalid reaction');
      }

      // Check if user already reacted with this reaction
      const existingReaction = await this.db.reactions.findByUserAndContent(
        userId,
        contentId,
        contentType,
        reactionId
      );

      if (existingReaction) {
        throw new Error('Already reacted with this reaction');
      }

      // Create reaction
      const reactionRecord = await this.db.reactions.create({
        id: uuidv4(),
        content_id: contentId,
        content_type: contentType,
        user_id: userId,
        reaction_id: reactionId,
        created_at: new Date()
      });

      // Update reaction count in cache
      const cacheKey = `content:${contentId}:reactions:${reactionId}`;
      await this.redisClient.incr(cacheKey);
      await this.redisClient.expire(cacheKey, 3600); // 1 hour

      // Clear aggregated reaction counts
      await this.redisClient.del(`content:${contentId}:reactions`);

      // Notify content creator (unless they're the reactor)
      const contentCreator = await this.getContentCreator(contentId, contentType);
      if (contentCreator && contentCreator.id !== userId) {
        await this.notificationService.sendNotification({
          userId: contentCreator.id,
          type: 'content_reaction',
          actorId: userId,
          targetId: contentId,
          targetType: contentType,
          message: `${reactionRecord.user.username} reacted to your ${contentType} with ${reaction.emoji}`
        });
      }

      // Broadcast reaction in real-time (for live streams)
      if (contentType === 'stream') {
        await this.websocketService.broadcastToStream(
          contentId,
          'new_reaction',
          {
            userId,
            reactionId,
            reaction: reaction.emoji
          }
        );
      }

      return reactionRecord;
    } catch (error) {
      console.error('Add reaction failed:', error);
      throw new Error(error.message || 'Failed to add reaction');
    }
  }

  // Remove reaction from content
  async removeReaction(reactionData) {
    try {
      const {
        contentId,
        contentType,
        userId,
        reactionId
      } = reactionData;

      // Find reaction
      const reaction = await this.db.reactions.findByUserAndContent(
        userId,
        contentId,
        contentType,
        reactionId
      );

      if (!reaction) {
        throw new Error('Reaction not found');
      }

      // Delete reaction
      await this.db.reactions.delete(reaction.id);

      // Update reaction count in cache
      const cacheKey = `content:${contentId}:reactions:${reactionId}`;
      await this.redisClient.decr(cacheKey);

      // Clear aggregated reaction counts
      await this.redisClient.del(`content:${contentId}:reactions`);

      return { success: true, message: 'Reaction removed successfully' };
    } catch (error) {
      console.error('Remove reaction failed:', error);
      throw new Error(error.message || 'Failed to remove reaction');
    }
  }

  // Get reactions for content
  async getContentReactions(contentId, contentType) {
    try {
      // Try cache first
      const cached = await this.redisClient.get(`content:${contentId}:reactions`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get from database
      const reactions = await this.db.reactions.findByContent(
        contentId,
        contentType
      );

      // Aggregate by reaction type
      const reactionCounts = {};
      reactions.forEach(reaction => {
        reactionCounts[reaction.reaction_id] = 
          (reactionCounts[reaction.reaction_id] || 0) + 1;
      });

      // Add reaction details
      const availableReactions = await this.getAvailableReactions();
      const result = availableReactions.map(reaction => ({
        ...reaction,
        count: reactionCounts[reaction.id] || 0,
        userReacted: false // This would be set per user
      }));

      // Cache for 5 minutes
      await this.redisClient.setex(
        `content:${contentId}:reactions`,
        300,
        JSON.stringify(result)
      );

      return result;
    } catch (error) {
      console.error('Get content reactions failed:', error);
      return [];
    }
  }

  // Get user's reaction to specific content
  async getUserReaction(contentId, contentType, userId) {
    try {
      const reaction = await this.db.reactions.findByUserAndContent(
        userId,
        contentId,
        contentType
      );

      return reaction ? reaction.reaction_id : null;
    } catch (error) {
      console.error('Get user reaction failed:', error);
      return null;
    }
  }

  // Get all reactions by user
  async getUserReactions(userId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      const reactions = await this.db.reactions.findByUser(
        userId,
        limit,
        offset
      );

      const total = await this.db.reactions.countByUser(userId);

      return {
        reactions: reactions,
        total: total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Get user reactions failed:', error);
      throw new Error('Failed to retrieve user reactions');
    }
  }

  // Get reaction statistics for content
  async getContentReactionStats(contentId, contentType) {
    try {
      // Try cache first
      const cached = await this.redisClient.get(`content:${contentId}:reaction_stats`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get from database
      const stats = await this.db.reactions.getStatsByContent(
        contentId,
        contentType
      );

      // Cache for 10 minutes
      await this.redisClient.setex(
        `content:${contentId}:reaction_stats`,
        600,
        JSON.stringify(stats)
      );

      return stats;
    } catch (error) {
      console.error('Get content reaction stats failed:', error);
      return {};
    }
  }

  // Helper function to get content creator
  async getContentCreator(contentId, contentType) {
    try {
      if (contentType === 'video') {
        const video = await this.db.videos.findById(contentId);
        return video ? video.creator : null;
      } else if (contentType === 'stream') {
        const stream = await this.db.streams.findById(contentId);
        return stream ? stream.creator : null;
      } else if (contentType === 'comment') {
        const comment = await this.db.comments.findById(contentId);
        return comment ? comment.author : null;
      }
      return null;
    } catch (error) {
      console.error('Get content creator failed:', error);
      return null;
    }
  }

  // Bulk update reactions (for migrations or bulk operations)
  async bulkUpdateReactions(updates) {
    try {
      const results = await Promise.all(
        updates.map(update => this.addReaction(update))
      );
      return results;
    } catch (error) {
      console.error('Bulk update reactions failed:', error);
      throw new Error('Failed to bulk update reactions');
    }
  }
}

export default ReactionService;
```

## Notification System Implementation

### Notification Service

#### Core Implementation
```javascript
// services/notification-service.js
import { v4 as uuidv4 } from 'uuid';
import redis from 'redis';
import WebSocket from 'ws';

class NotificationService {
  constructor(db, websocketService) {
    this.db = db;
    this.websocketService = websocketService;
    this.redisClient = redis.createClient();
    
    // Notification types and their settings
    this.notificationTypes = {
      new_follower: { 
        title: 'New Follower', 
        defaultEnabled: true,
        priority: 'medium'
      },
      new_comment: { 
        title: 'New Comment', 
        defaultEnabled: true,
        priority: 'medium'
      },
      comment_reply: { 
        title: 'Comment Reply', 
        defaultEnabled: true,
        priority: 'high'
      },
      comment_like: { 
        title: 'Comment Liked', 
        defaultEnabled: true,
        priority: 'low'
      },
      content_reaction: { 
        title: 'Content Reaction', 
        defaultEnabled: true,
        priority: 'low'
      },
      stream_started: { 
        title: 'Stream Started', 
        defaultEnabled: true,
        priority: 'high'
      },
      payment_received: { 
        title: 'Payment Received', 
        defaultEnabled: true,
        priority: 'high'
      },
      system_announcement: { 
        title: 'Announcement', 
        defaultEnabled: true,
        priority: 'high'
      }
    };
  }

  // Send notification to user
  async sendNotification(notificationData) {
    try {
      const {
        userId,
        type,
        actorId,
        targetId,
        targetType,
        message,
        priority = 'medium'
      } = notificationData;

      // Check if user has notifications enabled for this type
      const isEnabled = await this.isNotificationEnabled(userId, type);
      if (!isEnabled) {
        return { success: true, message: 'Notification type disabled for user' };
      }

      // Create notification in database
      const notification = await this.db.notifications.create({
        id: uuidv4(),
        user_id: userId,
        type: type,
        actor_id: actorId,
        target_id: targetId,
        target_type: targetType,
        message: message,
        priority: priority,
        is_read: false,
        created_at: new Date()
      });

      // Send real-time notification via WebSocket
      await this.websocketService.sendToUser(userId, {
        type: 'notification',
        data: notification
      });

      // Queue for email notification if needed
      const emailEnabled = await this.isEmailNotificationEnabled(userId, type);
      if (emailEnabled) {
        await this.queueEmailNotification(notification);
      }

      // Store in recent notifications cache
      await this.redisClient.lpush(
        `user:${userId}:recent_notifications`,
        JSON.stringify(notification)
      );
      await this.redisClient.ltrim(`user:${userId}:recent_notifications`, 0, 49); // Keep last 50

      return notification;
    } catch (error) {
      console.error('Send notification failed:', error);
      throw new Error('Failed to send notification');
    }
  }

  // Get user notifications
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        unreadOnly = false,
        types = []
      } = options;

      const offset = (page - 1) * limit;

      const notifications = await this.db.notifications.findByUser(
        userId,
        {
          limit,
          offset,
          unreadOnly,
          types
        }
      );

      const total = await this.db.notifications.countByUser(
        userId,
        { unreadOnly, types }
      );

      return {
        notifications: notifications,
        total: total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Get user notifications failed:', error);
      throw new Error('Failed to retrieve notifications');
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId, userId) {
    try {
      const notification = await this.db.notifications.findById(notificationId);
      
      if (!notification) {
        throw new Error('Notification not found');
      }

      if (notification.user_id !== userId) {
        throw new Error('Not authorized to mark this notification as read');
      }

      if (notification.is_read) {
        return notification;
      }

      const updatedNotification = await this.db.notifications.update(
        notificationId,
        { is_read: true, read_at: new Date() }
      );

      return updatedNotification;
    } catch (error) {
      console.error('Mark notification as read failed:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  // Mark all notifications as read
  async markAllNotificationsAsRead(userId) {
    try {
      const result = await this.db.notifications.markAllAsRead(userId);
      
      // Clear notification count cache
      await this.redisClient.del(`user:${userId}:unread_notifications_count`);
      
      return result;
    } catch (error) {
      console.error('Mark all notifications as read failed:', error);
      throw new Error('Failed to mark all notifications as read');
    }
  }

  // Get unread notifications count
  async getUnreadNotificationsCount(userId) {
    try {
      // Try cache first
      const cached = await this.redisClient.get(`user:${userId}:unread_notifications_count`);
      if (cached !== null) {
        return parseInt(cached, 10);
      }

      // Get from database
      const count = await this.db.notifications.countUnreadByUser(userId);

      // Cache for 1 minute
      await this.redisClient.setex(
        `user:${userId}:unread_notifications_count`,
        60,
        count.toString()
      );

      return count;
    } catch (error) {
      console.error('Get unread notifications count failed:', error);
      return 0;
    }
  }

  // Delete notification
  async deleteNotification(notificationId, userId) {
    try {
      const notification = await this.db.notifications.findById(notificationId);
      
      if (!notification) {
        throw new Error('Notification not found');
      }

      if (notification.user_id !== userId) {
        throw new Error('Not authorized to delete this notification');
      }

      await this.db.notifications.delete(notificationId);

      // Clear notification count cache
      await this.redisClient.del(`user:${userId}:unread_notifications_count`);

      return { success: true, message: 'Notification deleted successfully' };
    } catch (error) {
      console.error('Delete notification failed:', error);
      throw new Error('Failed to delete notification');
    }
  }

  // Get notification preferences
  async getNotificationPreferences(userId) {
    try {
      // Try cache first
      const cached = await this.redisClient.get(`user:${userId}:notification_preferences`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get from database
      let preferences = await this.db.notification_preferences.findByUser(userId);
      
      // If no preferences exist, create default ones
      if (!preferences) {
        preferences = {
          user_id: userId,
          preferences: {}
        };
        
        // Set default preferences for all notification types
        Object.keys(this.notificationTypes).forEach(type => {
          preferences.preferences[type] = {
            enabled: this.notificationTypes[type].defaultEnabled,
            email: this.notificationTypes[type].defaultEnabled,
            push: true
          };
        });
        
        // Save to database
        await this.db.notification_preferences.create(preferences);
      }

      // Cache for 10 minutes
      await this.redisClient.setex(
        `user:${userId}:notification_preferences`,
        600,
        JSON.stringify(preferences)
      );

      return preferences;
    } catch (error) {
      console.error('Get notification preferences failed:', error);
      throw new Error('Failed to retrieve notification preferences');
    }
  }

  // Update notification preferences
  async updateNotificationPreferences(userId, preferences) {
    try {
      // Validate preferences
      const validTypes = Object.keys(this.notificationTypes);
      const validPreferences = {};
      
      Object.keys(preferences).forEach(type => {
        if (validTypes.includes(type)) {
          validPreferences[type] = {
            enabled: !!preferences[type].enabled,
            email: !!preferences[type].email,
            push: !!preferences[type].push
          };
        }
      });

      // Update in database
      const updatedPreferences = await this.db.notification_preferences.upsert({
        user_id: userId,
        preferences: validPreferences
      });

      // Clear cache
      await this.redisClient.del(`user:${userId}:notification_preferences`);

      return updatedPreferences;
    } catch (error) {
      console.error('Update notification preferences failed:', error);
      throw new Error('Failed to update notification preferences');
    }
  }

  // Check if notification is enabled for user
  async isNotificationEnabled(userId, type) {
    try {
      const preferences = await this.getNotificationPreferences(userId);
      return preferences.preferences[type]?.enabled !== false;
    } catch (error) {
      console.error('Check notification enabled failed:', error);
      // Default to enabled if there's an error
      return true;
    }
  }

  // Check if email notification is enabled for user
  async isEmailNotificationEnabled(userId, type) {
    try {
      const preferences = await this.getNotificationPreferences(userId);
      return preferences.preferences[type]?.email === true;
    } catch (error) {
      console.error('Check email notification enabled failed:', error);
      // Default to disabled if there's an error
      return false;
    }
  }

  // Queue email notification
  async queueEmailNotification(notification) {
    try {
      // Add to email queue for processing
      await this.redisClient.lpush(
        'email_notification_queue',
        JSON.stringify(notification)
      );
      
      return { success: true };
    } catch (error) {
      console.error('Queue email notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Get recent notifications from cache
  async getRecentNotifications(userId, limit = 10) {
    try {
      const notifications = await this.redisClient.lrange(
        `user:${userId}:recent_notifications`,
        0,
        limit - 1
      );
      
      return notifications.map(notification => JSON.parse(notification));
    } catch (error) {
      console.error('Get recent notifications failed:', error);
      return [];
    }
  }

  // Clear all notifications for user
  async clearAllNotifications(userId) {
    try {
      const result = await this.db.notifications.deleteByUser(userId);
      
      // Clear caches
      await this.redisClient.del(`user:${userId}:unread_notifications_count`);
      await this.redisClient.del(`user:${userId}:recent_notifications`);
      
      return result;
    } catch (error) {
      console.error('Clear all notifications failed:', error);
      throw new Error('Failed to clear notifications');
    }
  }

  // Send system announcement to all users
  async sendSystemAnnouncement(message, priority = 'high') {
    try {
      // Create announcement in database
      const announcement = await this.db.notifications.create({
        id: uuidv4(),
        type: 'system_announcement',
        message: message,
        priority: priority,
        is_system: true,
        created_at: new Date()
      });

      // Broadcast to all connected users
      await this.websocketService.broadcast({
        type: 'system_announcement',
        data: announcement
      });

      return announcement;
    } catch (error) {
      console.error('Send system announcement failed:', error);
      throw new Error('Failed to send system announcement');
    }
  }
}

export default NotificationService;
```

## API Routes Implementation

### Social API Routes

#### Implementation
```javascript
// routes/social.js
import express from 'express';
import FollowingService from '../services/following-service';
import CommentService from '../services/comment-service';
import ReactionService from '../services/reaction-service';
import NotificationService from '../services/notification-service';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Following routes
router.post('/follow/:userId', authenticateToken, async (req, res) => {
  try {
    const result = await followingService.followUser(
      req.user.userId,
      req.params.userId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/follow/:userId', authenticateToken, async (req, res) => {
  try {
    const result = await followingService.unfollowUser(
      req.user.userId,
      req.params.userId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/followers/:userId', async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };
    
    const result = await followingService.getFollowers(
      req.params.userId,
      options
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/following/:userId', async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };
    
    const result = await followingService.getFollowing(
      req.params.userId,
      options
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/following/check/:userId', authenticateToken, async (req, res) => {
  try {
    const isFollowing = await followingService.isFollowing(
      req.user.userId,
      req.params.userId
    );
    res.json({ isFollowing });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Comment routes
router.post('/comments', authenticateToken, async (req, res) => {
  try {
    const commentData = {
      ...req.body,
      authorId: req.user.userId
    };
    
    const result = await commentService.createComment(commentData);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/comments/:contentId', async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      sortBy: req.query.sortBy || 'created_at',
      sortOrder: req.query.sortOrder || 'desc',
      parentId: req.query.parentId || null
    };
    
    const result = await commentService.getComments(
      req.params.contentId,
      req.query.contentType,
      options
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const result = await commentService.updateComment(
      req.params.commentId,
      req.user.userId,
      req.body.content
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const result = await commentService.deleteComment(
      req.params.commentId,
      req.user.userId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/comments/:commentId/like', authenticateToken, async (req, res) => {
  try {
    const result = await commentService.likeComment(
      req.params.commentId,
      req.user.userId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/comments/:commentId/like', authenticateToken, async (req, res) => {
  try {
    const result = await commentService.unlikeComment(
      req.params.commentId,
      req.user.userId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Reaction routes
router.get('/reactions', async (req, res) => {
  try {
    const result = await reactionService.getAvailableReactions();
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/reactions', authenticateToken, async (req, res) => {
  try {
    const reactionData = {
      ...req.body,
      userId: req.user.userId
    };
    
    const result = await reactionService.addReaction(reactionData);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/reactions', authenticateToken, async (req, res) => {
  try {
    const reactionData = {
      ...req.body,
      userId: req.user.userId
    };
    
    const result = await reactionService.removeReaction(reactionData);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/reactions/:contentId', async (req, res) => {
  try {
    const result = await reactionService.getContentReactions(
      req.params.contentId,
      req.query.contentType
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/reactions/:contentId/user', authenticateToken, async (req, res) => {
  try {
    const result = await reactionService.getUserReaction(
      req.params.contentId,
      req.query.contentType,
      req.user.userId
    );
    res.json({ reaction: result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Notification routes
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      unreadOnly: req.query.unreadOnly === 'true',
      types: req.query.types ? req.query.types.split(',') : []
    };
    
    const result = await notificationService.getUserNotifications(
      req.user.userId,
      options
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/notifications/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const result = await notificationService.markNotificationAsRead(
      req.params.notificationId,
      req.user.userId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const result = await notificationService.markAllNotificationsAsRead(
      req.user.userId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    const count = await notificationService.getUnreadNotificationsCount(
      req.user.userId
    );
    res.json({ count });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/notifications/:notificationId', authenticateToken, async (req, res) => {
  try {
    const result = await notificationService.deleteNotification(
      req.params.notificationId,
      req.user.userId
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/notifications/preferences', authenticateToken, async (req, res) => {
  try {
    const preferences = await notificationService.getNotificationPreferences(
      req.user.userId
    );
    res.json(preferences);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/notifications/preferences', authenticateToken, async (req, res) => {
  try {
    const preferences = await notificationService.updateNotificationPreferences(
      req.user.userId,
      req.body
    );
    res.json(preferences);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
```

## Frontend Social Features Implementation

### Following Components

#### Follow Button
```jsx
// components/social/FollowButton.tsx
import { useState, useEffect } from 'react';
import { useAuth } from 'hooks/useAuth';

export default function FollowButton({ userId, username }) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && userId) {
      checkFollowingStatus();
    }
  }, [user, userId]);

  const checkFollowingStatus = async () => {
    try {
      const response = await fetch(`/api/social/following/check/${userId}`);
      const data = await response.json();
      setIsFollowing(data.isFollowing);
    } catch (error) {
      console.error('Check following status failed:', error);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      // Redirect to login or show login modal
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`/api/social/follow/${userId}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setIsFollowing(true);
      } else {
        const error = await response.json();
        console.error('Follow failed:', error.error);
      }
    } catch (error) {
      console.error('Follow failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/social/follow/${userId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setIsFollowing(false);
      } else {
        const error = await response.json();
        console.error('Unfollow failed:', error.error);
      }
    } catch (error) {
      console.error('Unfollow failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.id === userId) {
    return null;
  }

  return (
    <button
      onClick={isFollowing ? handleUnfollow : handleFollow}
      disabled={loading}
      className={`px-4 py-2 rounded-full font-medium transition-colors ${
        isFollowing
          ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {loading ? (
        'Loading...'
      ) : isFollowing ? (
        'Following'
      ) : (
        `Follow ${username}`
      )}
    </button>
  );
}
```

### Comment Components

#### Comment Section
```jsx
// components/social/CommentSection.tsx
import { useState, useEffect } from 'react';
import { useAuth } from 'hooks/useAuth';
import Comment from './Comment';
import CommentForm from './CommentForm';

export default function CommentSection({ contentId, contentType }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchComments();
  }, [contentId, page]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/social/comments/${contentId}?contentType=${contentType}&page=${page}&limit=10`
      );
      const data = await response.json();
      
      setComments(data.comments);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Fetch comments failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewComment = (newComment) => {
    setComments(prev => [newComment, ...prev]);
  };

  const handleDeleteComment = (commentId) => {
    setComments(prev => prev.filter(comment => comment.id !== commentId));
  };

  return (
    <div className="comment-section">
      <h3 className="text-lg font-semibold mb-4">Comments</h3>
      
      {user && (
        <CommentForm
          contentId={contentId}
          contentType={contentType}
          onCommentAdded={handleNewComment}
        />
      )}
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => (
            <Comment
              key={comment.id}
              comment={comment}
              onDelete={handleDeleteComment}
            />
          ))}
          
          {totalPages > 1 && (
            <div className="flex justify-center space-x-2 mt-6">
              <button
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              
              <span className="px-3 py-1">
                Page {page} of {totalPages}
              </span>
              
              <button
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

#### Comment Component
```jsx
// components/social/Comment.tsx
import { useState } from 'react';
import { useAuth } from 'hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

export default function Comment({ comment, onDelete }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(comment.user_liked);
  const [likeCount, setLikeCount] = useState(comment.like_count);

  const handleLike = async () => {
    try {
      const response = liked
        ? await fetch(`/api/social/comments/${comment.id}/like`, { method: 'DELETE' })
        : await fetch(`/api/social/comments/${comment.id}/like`, { method: 'POST' });
      
      if (response.ok) {
        setLiked(!liked);
        setLikeCount(prev => liked ? prev - 1 : prev + 1);
      }
    } catch (error) {
      console.error('Like comment failed:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      const response = await fetch(`/api/social/comments/${comment.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        onDelete(comment.id);
      }
    } catch (error) {
      console.error('Delete comment failed:', error);
    }
  };

  return (
    <div className="comment bg-gray-50 rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-2">
          <img
            src={comment.author.profile_image_url || '/default-avatar.png'}
            alt={comment.author.username}
            className="w-8 h-8 rounded-full"
          />
          <div>
            <div className="font-medium">{comment.author.username}</div>
            <div className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </div>
          </div>
        </div>
        
        {user && (user.id === comment.author_id) && (
          <button
            onClick={handleDelete}
            className="text-gray-400 hover:text-red-500"
          >
            Delete
          </button>
        )}
      </div>
      
      <div className="mt-2 text-gray-800">
        {comment.content}
      </div>
      
      <div className="mt-2 flex items-center space-x-4">
        <button
          onClick={handleLike}
          className={`flex items-center space-x-1 ${
            liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
          }`}
        >
          <span>👍</span>
          <span>{likeCount}</span>
        </button>
      </div>
    </div>
  );
}
```

#### Comment Form
```jsx
// components/social/CommentForm.tsx
import { useState } from 'react';
import { useAuth } from 'hooks/useAuth';

export default function CommentForm({ contentId, contentType, onCommentAdded }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim()) return;
    
    setSubmitting(true);
    
    try {
      const response = await fetch('/api/social/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          contentType,
          content: content.trim()
        })
      });
      
      if (response.ok) {
        const newComment = await response.json();
        onCommentAdded(newComment);
        setContent('');
      } else {
        const error = await response.json();
        console.error('Comment submission failed:', error.error);
      }
    } catch (error) {
      console.error('Comment submission failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="comment-form mb-6">
      <div className="flex space-x-2">
        <img
          src={user?.profile_image_url || '/default-avatar.png'}
          alt={user?.username}
          className="w-8 h-8 rounded-full"
        />
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a comment..."
            className="w-full p-3 border border-gray-300 rounded-lg resize-none"
            rows={3}
            maxLength={1000}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-gray-500">
              {content.length}/1000
            </span>
            <button
              type="submit"
              disabled={!content.trim() || submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
```

### Reaction Components

#### Reaction Bar
```jsx
// components/social/ReactionBar.tsx
import { useState, useEffect } from 'react';
import { useAuth } from 'hooks/useAuth';

export default function ReactionBar({ contentId, contentType }) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState([]);
  const [userReaction, setUserReaction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReactions();
  }, [contentId, user]);

  const fetchReactions = async () => {
    try {
      setLoading(true);
      
      // Fetch available reactions
      const reactionsResponse = await fetch('/api/social/reactions');
      const availableReactions = await reactionsResponse.json();
      
      // Fetch content reactions
      const contentResponse = await fetch(
        `/api/social/reactions/${contentId}?contentType=${contentType}`
      );
      const contentReactions = await contentResponse.json();
      
      // Fetch user's reaction
      let userReactionData = null;
      if (user) {
        const userResponse = await fetch(
          `/api/social/reactions/${contentId}/user?contentType=${contentType}`
        );
        const userData = await userResponse.json();
        userReactionData = userData.reaction;
      }
      
      setReactions(contentReactions);
      setUserReaction(userReactionData);
    } catch (error) {
      console.error('Fetch reactions failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (reactionId) => {
    if (!user) {
      // Redirect to login or show login modal
      return;
    }

    try {
      // If user already reacted with this reaction, remove it
      if (userReaction === reactionId) {
        await fetch('/api/social/reactions', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentId,
            contentType,
            reactionId
          })
        });
        setUserReaction(null);
      } else {
        // Add new reaction
        await fetch('/api/social/reactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentId,
            contentType,
            reactionId
          })
        });
        setUserReaction(reactionId);
      }
      
      // Refresh reactions
      fetchReactions();
    } catch (error) {
      console.error('Reaction failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex space-x-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="w-10 h-8 bg-gray-200 animate-pulse rounded"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {reactions.map(reaction => (
        <button
          key={reaction.id}
          onClick={() => handleReaction(reaction.id)}
          className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm ${
            userReaction === reaction.id
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <span>{reaction.emoji}</span>
          <span>{reaction.count > 0 && reaction.count}</span>
        </button>
      ))}
    </div>
  );
}
```

### Notification Components

#### Notification Bell
```jsx
// components/social/NotificationBell.tsx
import { useState, useEffect } from 'react';
import { useAuth } from 'hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationBell() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      fetchRecentNotifications();
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/social/notifications/unread-count');
      const data = await response.json();
      setUnreadCount(data.count);
    } catch (error) {
      console.error('Fetch unread count failed:', error);
    }
  };

  const fetchRecentNotifications = async () => {
    try {
      const response = await fetch('/api/social/notifications?limit=5');
      const data = await response.json();
      setNotifications(data.notifications);
    } catch (error) {
      console.error('Fetch notifications failed:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/social/notifications/read-all', { method: 'PUT' });
      setUnreadCount(0);
      setShowDropdown(false);
    } catch (error) {
      console.error('Mark all as read failed:', error);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 border-b hover:bg-gray-50 ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex justify-between">
                    <p className="text-sm">{notification.message}</p>
                    {!notification.is_read && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))
            )}
          </div>
          
          <div className="p-2 text-center">
            <button className="text-sm text-blue-600 hover:text-blue-800">
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

## Implementation Roadmap

### Phase 1: Core Social Infrastructure (Weeks 1-2)

#### Week 1: Following System
- Implement following service
- Create database schema
- Build API endpoints
- Test following/unfollowing functionality

#### Week 2: Comment System
- Implement comment service
- Add comment CRUD operations
- Create comment like functionality
- Build API endpoints

### Phase 2: Advanced Social Features (Weeks 3-4)

#### Week 3: Reaction System
- Implement reaction service
- Create reaction UI components
- Add real-time reaction updates
- Test reaction functionality

#### Week 4: Notification System
- Implement notification service
- Create notification preferences
- Add real-time notification delivery
- Build notification UI components

### Phase 3: Frontend Integration (Weeks 5-6)

#### Week 5: Social UI Components
- Create following components
- Implement comment components
- Build reaction components
- Add notification components

#### Week 6: Integration Testing
- Test social features together
- Optimize performance
- Fix UI/UX issues
- Conduct user testing

### Phase 4: Optimization and Monitoring (Weeks 7-8)

#### Week 7: Performance Optimization
- Optimize database queries
- Implement caching strategies
- Add background processing
- Improve real-time performance

#### Week 8: Monitoring and Analytics
- Add logging and monitoring
- Implement analytics tracking
- Create admin dashboards
- Conduct security audit

## Performance Optimization

### Database Optimization
- Index optimization for social queries
- Query result caching
- Connection pooling
- Read replicas for high-traffic queries

### Real-time Performance
- Efficient WebSocket connections
- Message broadcasting optimization
- Presence detection optimization
- Scalable pub/sub system

### Caching Strategy
- Redis caching for frequently accessed data
- Cache invalidation strategies
- TTL optimization
- Memory usage monitoring

## Monitoring and Analytics

### Social Metrics
- Following/unfollowing rates
- Comment engagement rates
- Reaction usage statistics
- Notification open rates

### Performance Metrics
- API response times
- Database query performance
- Real-time message latency
- System resource usage

## Testing Strategy

### Unit Testing
- Social service functions
- Database operations
- API endpoint handlers
- Business logic validation

### Integration Testing
- End-to-end social workflows
- Real-time feature testing
- Notification delivery testing
- Performance testing

### User Testing
- Usability testing
- Feature adoption tracking
- User feedback collection
- A/B testing framework

## Success Metrics

### Technical Metrics
- Social feature response time (<500ms)
- Real-time message delivery (<100ms)
- Database query performance (<100ms)
- System uptime (>99.9%)

### User Experience Metrics
- Social feature adoption rate (>50%)
- Comment engagement rate (>20%)
- Reaction usage rate (>30%)
- Notification open rate (>40%)

### Business Metrics
- User retention through social features
- Content engagement increase
- Community growth metrics
- Platform virality coefficient

This plan provides a comprehensive roadmap for implementing social features for the Vilokanam-view platform, enabling users to connect, engage, and build communities around content through following, commenting, reacting, and real-time notifications.