# Content Moderation Tools Implementation Plan

## Overview

This document outlines the plan for implementing comprehensive content moderation tools for the Vilokanam-view platform. These tools will help maintain a safe and respectful community environment while enabling creators to manage their content and interactions effectively.

## Current State Analysis

The platform currently has:
- No content moderation system
- No reporting mechanisms
- No automated content filtering
- No moderation dashboard
- No community guidelines enforcement

## Moderation Requirements

### Core Features
1. Content reporting system
2. Automated content filtering
3. Moderation dashboard
4. Community guidelines enforcement
5. User suspension/ban system
6. Appeal process

### Technical Requirements
1. Scalable moderation infrastructure
2. Real-time content analysis
3. Machine learning integration
4. Admin/moderator access controls
5. Audit trails and logging
6. API for third-party integrations

## System Architecture

### Component Overview

#### 1. Moderation Service
- Content analysis and filtering
- Reporting system management
- Moderation workflow handling
- User action enforcement

#### 2. Content Analysis Engine
- Text content analysis
- Image/video content analysis
- Machine learning models
- Rule-based filtering

#### 3. Moderation Dashboard
- Report management interface
- Content review tools
- User action controls
- Analytics and metrics

#### 4. Moderation API
- Reporting endpoints
- Content analysis endpoints
- Moderation action endpoints
- Integration endpoints

### Data Flow

1. **Content Submission**
   - User uploads content
   - Automated analysis triggered
   - Content flagged if violating policies
   - Manual review queue populated

2. **User Reporting**
   - User reports content
   - Report logged in system
   - Moderators notified
   - Content reviewed

3. **Moderation Actions**
   - Moderator reviews content
   - Actions taken (approve, reject, remove)
   - User notified of actions
   - Audit trail updated

4. **Policy Enforcement**
   - Automated policy checks
   - User behavior monitoring
   - Escalation procedures
   - Account restrictions

## Moderation Service Implementation

### Core Moderation Service

#### Implementation
```javascript
// services/moderation-service.js
import redis from 'redis';
import { v4 as uuidv4 } from 'uuid';

class ModerationService {
  constructor(db, contentAnalysisEngine, notificationService) {
    this.db = db;
    this.contentAnalysisEngine = contentAnalysisEngine;
    this.notificationService = notificationService;
    this.redisClient = redis.createClient();
  }

  // Analyze content for policy violations
  async analyzeContent(contentData) {
    try {
      const {
        contentId,
        contentType, // 'video', 'stream', 'comment'
        textContent,
        mediaUrls,
        userId,
        metadata
      } = contentData;

      // Perform text analysis
      const textAnalysis = textContent 
        ? await this.contentAnalysisEngine.analyzeText(textContent)
        : { flagged: false, categories: [] };

      // Perform media analysis
      const mediaAnalysis = mediaUrls && mediaUrls.length > 0
        ? await this.contentAnalysisEngine.analyzeMedia(mediaUrls)
        : { flagged: false, categories: [] };

      // Combine results
      const isFlagged = textAnalysis.flagged || mediaAnalysis.flagged;
      const categories = [...new Set([
        ...textAnalysis.categories,
        ...mediaAnalysis.categories
      ])];

      // Create analysis record
      const analysis = await this.db.moderation_analysis.create({
        id: uuidv4(),
        content_id: contentId,
        content_type: contentType,
        user_id: userId,
        text_analysis: textAnalysis,
        media_analysis: mediaAnalysis,
        is_flagged: isFlagged,
        categories: categories,
        metadata: metadata,
        created_at: new Date()
      });

      // If flagged, add to moderation queue
      if (isFlagged) {
        await this.createModerationTask({
          contentId,
          contentType,
          userId,
          categories,
          priority: this.calculatePriority(categories),
          analysisId: analysis.id
        });
      }

      return analysis;
    } catch (error) {
      console.error('Content analysis failed:', error);
      throw new Error('Failed to analyze content');
    }
  }

  // Create moderation task
  async createModerationTask(taskData) {
    try {
      const {
        contentId,
        contentType,
        userId,
        categories,
        priority,
        analysisId
      } = taskData;

      const task = await this.db.moderation_tasks.create({
        id: uuidv4(),
        content_id: contentId,
        content_type: contentType,
        user_id: userId,
        categories: categories,
        priority: priority,
        status: 'pending',
        analysis_id: analysisId,
        created_at: new Date()
      });

      // Notify moderators
      await this.notificationService.sendToModerators({
        type: 'new_moderation_task',
        taskId: task.id,
        contentId,
        contentType,
        categories,
        priority
      });

      return task;
    } catch (error) {
      console.error('Create moderation task failed:', error);
      throw new Error('Failed to create moderation task');
    }
  }

  // Calculate task priority
  calculatePriority(categories) {
    // Define priority levels for different violation types
    const priorityMap = {
      'spam': 1,
      'harassment': 3,
      'violence': 4,
      'hate_speech': 4,
      'nudity': 2,
      'copyright': 3,
      'misinformation': 2
    };

    // Calculate highest priority from categories
    let maxPriority = 1;
    categories.forEach(category => {
      if (priorityMap[category] && priorityMap[category] > maxPriority) {
        maxPriority = priorityMap[category];
      }
    });

    return maxPriority;
  }

  // Process user report
  async processUserReport(reportData) {
    try {
      const {
        reporterId,
        targetType, // 'video', 'stream', 'comment', 'user'
        targetId,
        reason,
        description
      } = reportData;

      // Validate report
      if (!reporterId || !targetType || !targetId || !reason) {
        throw new Error('Missing required report fields');
      }

      // Check for duplicate reports
      const existingReport = await this.db.reports.findByReporterAndTarget(
        reporterId,
        targetType,
        targetId
      );

      if (existingReport) {
        throw new Error('Already reported this content');
      }

      // Create report
      const report = await this.db.reports.create({
        id: uuidv4(),
        reporter_id: reporterId,
        target_type: targetType,
        target_id: targetId,
        reason: reason,
        description: description,
        status: 'pending',
        created_at: new Date()
      });

      // Add to moderation queue
      await this.createModerationTask({
        contentId: targetId,
        contentType: targetType,
        userId: reporterId,
        categories: [reason],
        priority: this.calculatePriority([reason]),
        reportId: report.id
      });

      // Notify moderators
      await this.notificationService.sendToModerators({
        type: 'user_report',
        reportId: report.id,
        targetType,
        targetId,
        reason
      });

      return report;
    } catch (error) {
      console.error('Process user report failed:', error);
      throw new Error('Failed to process user report');
    }
  }

  // Review moderation task
  async reviewModerationTask(taskId, moderatorId, reviewData) {
    try {
      const {
        action, // 'approve', 'remove', 'warn', 'ban'
        notes,
        categories
      } = reviewData;

      // Get task
      const task = await this.db.moderation_tasks.findById(taskId);
      if (!task) {
        throw new Error('Moderation task not found');
      }

      // Update task
      const updatedTask = await this.db.moderation_tasks.update(taskId, {
        status: 'completed',
        action: action,
        notes: notes,
        reviewed_by: moderatorId,
        reviewed_at: new Date()
      });

      // Take action based on review
      switch (action) {
        case 'approve':
          await this.approveContent(task.content_id, task.content_type);
          break;
        case 'remove':
          await this.removeContent(task.content_id, task.content_type);
          break;
        case 'warn':
          await this.warnUser(task.user_id, notes, categories);
          break;
        case 'ban':
          await this.banUser(task.user_id, notes, categories);
          break;
      }

      // Notify affected users
      await this.notifyUsersOfAction(task, action, notes);

      // Update user moderation score
      await this.updateUserModerationScore(task.user_id, action);

      return updatedTask;
    } catch (error) {
      console.error('Review moderation task failed:', error);
      throw new Error('Failed to review moderation task');
    }
  }

  // Approve content
  async approveContent(contentId, contentType) {
    try {
      // Update content status
      switch (contentType) {
        case 'video':
          await this.db.videos.update(contentId, { status: 'approved' });
          break;
        case 'comment':
          await this.db.comments.update(contentId, { is_hidden: false });
          break;
      }

      // Remove any pending restrictions
      await this.db.content_restrictions.removeByContent(contentId, contentType);

      return { success: true, message: 'Content approved' };
    } catch (error) {
      console.error('Approve content failed:', error);
      throw new Error('Failed to approve content');
    }
  }

  // Remove content
  async removeContent(contentId, contentType) {
    try {
      // Hide or delete content based on type
      switch (contentType) {
        case 'video':
          await this.db.videos.update(contentId, { status: 'removed' });
          break;
        case 'comment':
          await this.db.comments.update(contentId, { is_hidden: true });
          break;
        case 'stream':
          await this.db.streams.update(contentId, { status: 'ended' });
          break;
      }

      // Add to content restrictions
      await this.db.content_restrictions.create({
        id: uuidv4(),
        content_id: contentId,
        content_type: contentType,
        restriction_type: 'removal',
        created_at: new Date()
      });

      return { success: true, message: 'Content removed' };
    } catch (error) {
      console.error('Remove content failed:', error);
      throw new Error('Failed to remove content');
    }
  }

  // Warn user
  async warnUser(userId, notes, categories) {
    try {
      // Create warning record
      const warning = await this.db.user_warnings.create({
        id: uuidv4(),
        user_id: userId,
        notes: notes,
        categories: categories,
        created_at: new Date()
      });

      // Send warning notification
      await this.notificationService.sendNotification({
        userId: userId,
        type: 'moderation_warning',
        message: `Your content has been flagged for review. Please review our community guidelines.`,
        details: notes
      });

      return warning;
    } catch (error) {
      console.error('Warn user failed:', error);
      throw new Error('Failed to warn user');
    }
  }

  // Ban user
  async banUser(userId, notes, categories) {
    try {
      // Create ban record
      const ban = await this.db.user_bans.create({
        id: uuidv4(),
        user_id: userId,
        notes: notes,
        categories: categories,
        created_at: new Date(),
        expires_at: null // Permanent ban
      });

      // Update user status
      await this.db.users.update(userId, { status: 'banned' });

      // Send ban notification
      await this.notificationService.sendNotification({
        userId: userId,
        type: 'account_banned',
        message: `Your account has been banned for violating community guidelines.`,
        details: notes
      });

      return ban;
    } catch (error) {
      console.error('Ban user failed:', error);
      throw new Error('Failed to ban user');
    }
  }

  // Notify users of moderation action
  async notifyUsersOfAction(task, action, notes) {
    try {
      // Notify content creator
      await this.notificationService.sendNotification({
        userId: task.user_id,
        type: 'content_moderated',
        message: `Your ${task.content_type} has been ${action} by moderators.`,
        details: notes
      });

      // Notify reporter if this was from a user report
      if (task.report_id) {
        const report = await this.db.reports.findById(task.report_id);
        if (report) {
          await this.notificationService.sendNotification({
            userId: report.reporter_id,
            type: 'report_resolved',
            message: `Your report has been reviewed. Action taken: ${action}`,
            details: notes
          });
        }
      }
    } catch (error) {
      console.error('Notify users of action failed:', error);
    }
  }

  // Update user moderation score
  async updateUserModerationScore(userId, action) {
    try {
      // Define score changes for different actions
      const scoreChanges = {
        'approve': -1,
        'remove': 3,
        'warn': 2,
        'ban': 5
      };

      const scoreChange = scoreChanges[action] || 0;
      if (scoreChange === 0) return;

      // Update user moderation score
      await this.db.users.incrementModerationScore(userId, scoreChange);

      // Check for automatic restrictions based on score
      const user = await this.db.users.findById(userId);
      if (user.moderation_score >= 10) {
        // Auto-ban for high moderation score
        await this.banUser(userId, 'Automatic ban due to repeated violations', ['repeated_violations']);
      } else if (user.moderation_score >= 5) {
        // Temporarily restrict posting
        await this.db.user_restrictions.create({
          id: uuidv4(),
          user_id: userId,
          restriction_type: 'posting_restricted',
          duration: 86400, // 24 hours
          created_at: new Date()
        });
      }
    } catch (error) {
      console.error('Update user moderation score failed:', error);
    }
  }

  // Get moderation dashboard data
  async getModerationDashboard(options = {}) {
    try {
      const {
        status = 'pending',
        priority = null,
        category = null,
        limit = 50,
        offset = 0
      } = options;

      const tasks = await this.db.moderation_tasks.findWithFilters({
        status,
        priority,
        category,
        limit,
        offset
      });

      const total = await this.db.moderation_tasks.countWithFilters({
        status,
        priority,
        category
      });

      // Get statistics
      const stats = await this.getModerationStats();

      return {
        tasks,
        total,
        stats,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Get moderation dashboard failed:', error);
      throw new Error('Failed to retrieve moderation dashboard');
    }
  }

  // Get moderation statistics
  async getModerationStats() {
    try {
      const [
        pendingTasks,
        completedTasks,
        totalReports,
        activeBans,
        recentWarnings
      ] = await Promise.all([
        this.db.moderation_tasks.countByStatus('pending'),
        this.db.moderation_tasks.countByStatus('completed'),
        this.db.reports.count(),
        this.db.user_bans.countActive(),
        this.db.user_warnings.countRecent(7) // Last 7 days
      ]);

      return {
        pendingTasks,
        completedTasks,
        totalReports,
        activeBans,
        recentWarnings,
        completionRate: completedTasks > 0 
          ? Math.round((completedTasks / (pendingTasks + completedTasks)) * 100)
          : 0
      };
    } catch (error) {
      console.error('Get moderation stats failed:', error);
      return {
        pendingTasks: 0,
        completedTasks: 0,
        totalReports: 0,
        activeBans: 0,
        recentWarnings: 0,
        completionRate: 0
      };
    }
  }

  // Process automated moderation
  async processAutomatedModeration() {
    try {
      // Get pending moderation tasks
      const tasks = await this.db.moderation_tasks.findPending({
        limit: 100,
        priority: 4 // High priority only
      });

      // Process each task
      for (const task of tasks) {
        // Apply automated rules
        const shouldAutoModerate = await this.shouldAutoModerate(task);
        
        if (shouldAutoModerate) {
          // Apply automatic moderation action
          await this.applyAutomaticAction(task);
        }
      }

      return { processed: tasks.length };
    } catch (error) {
      console.error('Process automated moderation failed:', error);
      return { processed: 0, error: error.message };
    }
  }

  // Determine if content should be auto-moderated
  async shouldAutoModerate(task) {
    try {
      // Check if this is a repeat violation
      const userViolationCount = await this.db.moderation_tasks.countByUserAndCategory(
        task.user_id,
        task.categories
      );

      // Auto-moderate high-confidence violations from repeat offenders
      if (userViolationCount >= 3) {
        const analysis = await this.db.moderation_analysis.findById(task.analysis_id);
        if (analysis && analysis.confidence_score >= 0.9) {
          return true;
        }
      }

      // Auto-moderate certain categories (e.g., spam)
      if (task.categories.includes('spam')) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Should auto-moderate check failed:', error);
      return false;
    }
  }

  // Apply automatic moderation action
  async applyAutomaticAction(task) {
    try {
      // For spam or high-confidence violations, automatically remove
      await this.reviewModerationTask(task.id, 'system', {
        action: 'remove',
        notes: 'Automatic moderation due to high confidence violation',
        categories: task.categories
      });

      return { success: true };
    } catch (error) {
      console.error('Apply automatic action failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Handle user appeal
  async processUserAppeal(appealData) {
    try {
      const {
        userId,
        contentId,
        contentType,
        reason,
        description
      } = appealData;

      // Create appeal record
      const appeal = await this.db.moderation_appeals.create({
        id: uuidv4(),
        user_id: userId,
        content_id: contentId,
        content_type: contentType,
        reason: reason,
        description: description,
        status: 'pending',
        created_at: new Date()
      });

      // Add to moderation queue for review
      await this.createModerationTask({
        contentId,
        contentType,
        userId,
        categories: ['appeal'],
        priority: 2,
        appealId: appeal.id
      });

      return appeal;
    } catch (error) {
      console.error('Process user appeal failed:', error);
      throw new Error('Failed to process user appeal');
    }
  }
}

export default ModerationService;
```

## Content Analysis Engine Implementation

### Core Content Analysis Engine

#### Implementation
```javascript
// services/content-analysis-engine.js
import natural from 'natural';
import sentiment from 'sentiment';
import axios from 'axios';

class ContentAnalysisEngine {
  constructor() {
    this.sentimentAnalyzer = new sentiment();
    this.tokenizer = new natural.WordTokenizer();
  }

  // Analyze text content
  async analyzeText(text) {
    try {
      // Check for spam patterns
      const spamScore = this.calculateSpamScore(text);
      
      // Check for harassment/bullying
      const harassmentScore = this.calculateHarassmentScore(text);
      
      // Check for hate speech
      const hateSpeechScore = this.calculateHateSpeechScore(text);
      
      // Check for misinformation
      const misinformationScore = this.calculateMisinformationScore(text);
      
      // Sentiment analysis
      const sentimentResult = this.sentimentAnalyzer.analyze(text);
      
      // Combine scores
      const scores = {
        spam: spamScore,
        harassment: harassmentScore,
        hate_speech: hateSpeechScore,
        misinformation: misinformationScore,
        sentiment: sentimentResult
      };

      // Determine if content should be flagged
      const flagged = Object.values(scores).some(score => 
        typeof score === 'number' ? score > 0.7 : score.score > 0.7
      );

      // Get categories
      const categories = [];
      if (spamScore > 0.7) categories.push('spam');
      if (harassmentScore > 0.7) categories.push('harassment');
      if (hateSpeechScore > 0.7) categories.push('hate_speech');
      if (misinformationScore > 0.7) categories.push('misinformation');

      return {
        flagged,
        categories,
        scores,
        confidence_score: this.calculateConfidenceScore(scores)
      };
    } catch (error) {
      console.error('Text analysis failed:', error);
      return {
        flagged: false,
        categories: [],
        scores: {},
        confidence_score: 0
      };
    }
  }

  // Analyze media content
  async analyzeMedia(mediaUrls) {
    try {
      // For now, we'll implement basic checks
      // In production, this would integrate with ML services
      
      const results = await Promise.all(
        mediaUrls.map(url => this.analyzeSingleMedia(url))
      );

      // Combine results
      const flagged = results.some(result => result.flagged);
      const categories = [...new Set(results.flatMap(result => result.categories))];
      
      return {
        flagged,
        categories,
        results
      };
    } catch (error) {
      console.error('Media analysis failed:', error);
      return {
        flagged: false,
        categories: [],
        results: []
      };
    }
  }

  // Analyze single media item
  async analyzeSingleMedia(url) {
    try {
      // Check file type
      const fileType = this.getFileType(url);
      
      // For images, check for nudity/explicit content
      if (fileType.startsWith('image/')) {
        return await this.analyzeImage(url);
      }
      
      // For videos, check for explicit content
      if (fileType.startsWith('video/')) {
        return await this.analyzeVideo(url);
      }
      
      return {
        flagged: false,
        categories: [],
        file_type: fileType
      };
    } catch (error) {
      console.error('Single media analysis failed:', error);
      return {
        flagged: false,
        categories: [],
        error: error.message
      };
    }
  }

  // Analyze image content
  async analyzeImage(url) {
    try {
      // In production, this would integrate with computer vision services
      // For now, we'll implement basic checks
      
      // Check file size
      const response = await axios.head(url);
      const contentLength = parseInt(response.headers['content-length'] || '0');
      
      // Check for large files that might be suspicious
      const isLargeFile = contentLength > 100 * 1024 * 1024; // 100MB
      
      // Check filename for suspicious patterns
      const suspiciousPatterns = [
        /explicit/i,
        /nude/i,
        /adult/i,
        /xxx/i
      ];
      
      const isSuspicious = suspiciousPatterns.some(pattern => 
        pattern.test(url)
      );
      
      return {
        flagged: isLargeFile || isSuspicious,
        categories: isSuspicious ? ['nudity'] : [],
        file_size: contentLength,
        suspicious: isSuspicious
      };
    } catch (error) {
      console.error('Image analysis failed:', error);
      return {
        flagged: false,
        categories: [],
        error: error.message
      };
    }
  }

  // Analyze video content
  async analyzeVideo(url) {
    try {
      // In production, this would integrate with video analysis services
      // For now, we'll implement basic checks
      
      // Check file size
      const response = await axios.head(url);
      const contentLength = parseInt(response.headers['content-length'] || '0');
      
      // Check for large files
      const isLargeFile = contentLength > 1024 * 1024 * 1024; // 1GB
      
      return {
        flagged: isLargeFile,
        categories: isLargeFile ? ['large_file'] : [],
        file_size: contentLength,
        large_file: isLargeFile
      };
    } catch (error) {
      console.error('Video analysis failed:', error);
      return {
        flagged: false,
        categories: [],
        error: error.message
      };
    }
  }

  // Calculate spam score
  calculateSpamScore(text) {
    // Check for common spam patterns
    const spamPatterns = [
      /\b(buy now|click here|free money|make money|no risk|guarantee)\b/i,
      /!!!+|###+|\$\$\$+/,
      /\b(urgent|limited time|act now|don't miss)\b/i,
      /(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.com\b/
    ];
    
    let spamScore = 0;
    spamPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        spamScore += 0.25;
      }
    });
    
    // Check for excessive caps
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.5) {
      spamScore += 0.3;
    }
    
    // Check for excessive exclamation marks
    const exclamationRatio = (text.match(/!/g) || []).length / text.length;
    if (exclamationRatio > 0.1) {
      spamScore += 0.2;
    }
    
    return Math.min(spamScore, 1);
  }

  // Calculate harassment score
  calculateHarassmentScore(text) {
    // Check for harassment patterns
    const harassmentPatterns = [
      /\b(you suck|stupid|idiot|worthless|kill yourself)\b/i,
      /personal attacks/i,
      /threatening language/i
    ];
    
    let harassmentScore = 0;
    harassmentPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        harassmentScore += 0.33;
      }
    });
    
    // Negative sentiment check
    const sentiment = this.sentimentAnalyzer.analyze(text);
    if (sentiment.score < -5) {
      harassmentScore += 0.2;
    }
    
    return Math.min(harassmentScore, 1);
  }

  // Calculate hate speech score
  calculateHateSpeechScore(text) {
    // Check for hate speech patterns
    const hateSpeechPatterns = [
      /racial slurs/i, // In production, use actual slur lists
      /\b(hate.*group|discriminate|bigot)\b/i,
      /derogatory terms/i
    ];
    
    let hateSpeechScore = 0;
    hateSpeechPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        hateSpeechScore += 0.33;
      }
    });
    
    return Math.min(hateSpeechScore, 1);
  }

  // Calculate misinformation score
  calculateMisinformationScore(text) {
    // Check for misinformation patterns
    const misinformationPatterns = [
      /fake news/i,
      /conspiracy theory/i,
      /unverified claim/i
    ];
    
    let misinformationScore = 0;
    misinformationPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        misinformationScore += 0.33;
      }
    });
    
    return Math.min(misinformationScore, 1);
  }

  // Calculate confidence score
  calculateConfidenceScore(scores) {
    // Simple average of all scores
    const scoreValues = Object.values(scores).map(score => 
      typeof score === 'number' ? score : score.score || 0
    );
    
    const average = scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length;
    return average;
  }

  // Get file type from URL
  getFileType(url) {
    const extension = url.split('.').pop().toLowerCase();
    
    const typeMap = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo'
    };
    
    return typeMap[extension] || 'application/octet-stream';
  }
}

export default ContentAnalysisEngine;
```

## Moderation API Implementation

### API Routes

#### Implementation
```javascript
// routes/moderation.js
import express from 'express';
import ModerationService from '../services/moderation-service';
import ContentAnalysisEngine from '../services/content-analysis-engine';
import { authenticateToken, requireModerator } from '../middleware/auth';

const router = express.Router();
const contentAnalysisEngine = new ContentAnalysisEngine();
const moderationService = new ModerationService(contentAnalysisEngine);

// Report content
router.post('/reports', authenticateToken, async (req, res) => {
  try {
    const reportData = {
      ...req.body,
      reporterId: req.user.userId
    };

    const report = await moderationService.processUserReport(reportData);
    res.json(report);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user reports
router.get('/reports', authenticateToken, async (req, res) {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };

    const reports = await moderationService.getUserReports(
      req.user.userId,
      options
    );

    res.json(reports);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get moderation dashboard
router.get('/dashboard', authenticateToken, requireModerator, async (req, res) => {
  try {
    const options = {
      status: req.query.status || 'pending',
      priority: req.query.priority ? parseInt(req.query.priority) : null,
      category: req.query.category || null,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const dashboard = await moderationService.getModerationDashboard(options);
    res.json(dashboard);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get moderation task
router.get('/tasks/:taskId', authenticateToken, requireModerator, async (req, res) => {
  try {
    const task = await moderationService.getModerationTask(req.params.taskId);
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Review moderation task
router.post('/tasks/:taskId/review', authenticateToken, requireModerator, async (req, res) => {
  try {
    const reviewData = {
      ...req.body,
      moderatorId: req.user.userId
    };

    const result = await moderationService.reviewModerationTask(
      req.params.taskId,
      reviewData
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Analyze content
router.post('/analyze', authenticateToken, async (req, res) {
  try {
    const analysis = await moderationService.analyzeContent(req.body);
    res.json(analysis);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get moderation statistics
router.get('/stats', authenticateToken, requireModerator, async (req, res) {
  try {
    const stats = await moderationService.getModerationStats();
    res.json(stats);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Submit appeal
router.post('/appeals', authenticateToken, async (req, res) => {
  try {
    const appealData = {
      ...req.body,
      userId: req.user.userId
    };

    const appeal = await moderationService.processUserAppeal(appealData);
    res.json(appeal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user moderation status
router.get('/status', authenticateToken, async (req, res) {
  try {
    const status = await moderationService.getUserModerationStatus(req.user.userId);
    res.json(status);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
```

## Frontend Moderation Implementation

### Moderation Dashboard

#### Implementation
```jsx
// components/moderation/Dashboard.tsx
import { useState, useEffect } from 'react';
import { useAuth } from 'hooks/useAuth';

export default function ModerationDashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'pending',
    priority: '',
    category: ''
  });

  useEffect(() => {
    if (user?.is_moderator) {
      fetchDashboard();
    }
  }, [user, filters]);

  const fetchDashboard = async () => {
    setLoading(true);
    
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.category) params.append('category', filters.category);
      
      const response = await fetch(`/api/moderation/dashboard?${params.toString()}`);
      const data = await response.json();
      setDashboard(data);
    } catch (error) {
      console.error('Fetch dashboard failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user?.is_moderator) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Moderation Dashboard</h2>
        <p className="text-gray-600">You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="moderation-dashboard">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Moderation Dashboard</h1>
        <div className="flex space-x-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded"
          >
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="all">All</option>
          </select>
          
          <select
            value={filters.priority}
            onChange={(e) => setFilters({...filters, priority: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded"
          >
            <option value="">All Priorities</option>
            <option value="1">Low Priority</option>
            <option value="2">Medium Priority</option>
            <option value="3">High Priority</option>
            <option value="4">Critical Priority</option>
          </select>
          
          <select
            value={filters.category}
            onChange={(e) => setFilters({...filters, category: e.target.value})}
            className="px-3 py-2 border border-gray-300 rounded"
          >
            <option value="">All Categories</option>
            <option value="spam">Spam</option>
            <option value="harassment">Harassment</option>
            <option value="hate_speech">Hate Speech</option>
            <option value="nudity">Nudity</option>
            <option value="violence">Violence</option>
            <option value="copyright">Copyright</option>
          </select>
        </div>
      </div>

      {dashboard?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold">Pending</h3>
            <p className="text-2xl font-bold text-blue-600">{dashboard.stats.pendingTasks}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold">Completed</h3>
            <p className="text-2xl font-bold text-green-600">{dashboard.stats.completedTasks}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold">Reports</h3>
            <p className="text-2xl font-bold text-yellow-600">{dashboard.stats.totalReports}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold">Bans</h3>
            <p className="text-2xl font-bold text-red-600">{dashboard.stats.activeBans}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold">Warnings</h3>
            <p className="text-2xl font-bold text-orange-600">{dashboard.stats.recentWarnings}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold">Completion</h3>
            <p className="text-2xl font-bold text-purple-600">{dashboard.stats.completionRate}%</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Content
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categories
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dashboard?.tasks?.map((task) => (
                <tr key={task.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {task.content_type} #{task.content_id.substring(0, 8)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{task.content_type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {task.categories.map((category, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${
                      task.priority >= 4 ? 'text-red-600 font-bold' :
                      task.priority >= 3 ? 'text-orange-600' :
                      task.priority >= 2 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {task.priority >= 4 ? 'Critical' :
                       task.priority >= 3 ? 'High' :
                       task.priority >= 2 ? 'Medium' : 'Low'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(task.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        // Open task review modal
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {dashboard?.total === 0 && (
            <div className="text-center py-12 text-gray-500">
              No moderation tasks found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### Content Reporting Component

#### Implementation
```jsx
// components/moderation/ReportContent.tsx
import { useState } from 'react';
import { useAuth } from 'hooks/useAuth';

export default function ReportContent({ targetType, targetId, onClose }) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason) return;
    
    setSubmitting(true);
    
    try {
      const response = await fetch('/api/moderation/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId,
          reason,
          description
        })
      });
      
      if (response.ok) {
        setSubmitted(true);
        setTimeout(onClose, 2000);
      } else {
        const error = await response.json();
        console.error('Report submission failed:', error.error);
      }
    } catch (error) {
      console.error('Report submission failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const reasons = [
    { id: 'spam', label: 'Spam or misleading' },
    { id: 'harassment', label: 'Harassment or bullying' },
    { id: 'hate_speech', label: 'Hate speech' },
    { id: 'violence', label: 'Violence or dangerous content' },
    { id: 'nudity', label: 'Nudity or sexual content' },
    { id: 'copyright', label: 'Copyright infringement' },
    { id: 'other', label: 'Other' }
  ];

  if (!user) {
    return (
      <div className="p-6 text-center">
        <p>Please log in to report content</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="p-6 text-center">
        <div className="text-green-600 mb-2">✓</div>
        <p>Report submitted successfully</p>
        <p className="text-sm text-gray-500">Thank you for helping keep our community safe</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4">Report Content</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for reporting
          </label>
          <div className="space-y-2">
            {reasons.map((r) => (
              <label key={r.id} className="flex items-center">
                <input
                  type="radio"
                  name="reason"
                  value={r.id}
                  checked={reason === r.id}
                  onChange={(e) => setReason(e.target.value)}
                  className="mr-2"
                />
                {r.label}
              </label>
            ))}
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional details (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Please provide any additional context..."
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!reason || submitting}
            className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

### Moderation Task Review Component

#### Implementation
```jsx
// components/moderation/TaskReview.tsx
import { useState } from 'react';

export default function TaskReview({ task, onClose, onReview }) {
  const [action, setAction] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!action) return;
    
    setSubmitting(true);
    
    try {
      const response = await fetch(`/api/moderation/tasks/${task.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          notes
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        onReview(result);
        onClose();
      } else {
        const error = await response.json();
        console.error('Review submission failed:', error.error);
      }
    } catch (error) {
      console.error('Review submission failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const actions = [
    { id: 'approve', label: 'Approve Content', color: 'green' },
    { id: 'remove', label: 'Remove Content', color: 'red' },
    { id: 'warn', label: 'Warn User', color: 'yellow' },
    { id: 'ban', label: 'Ban User', color: 'red' }
  ];

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4">Review Moderation Task</h2>
      
      <div className="mb-4 p-4 bg-gray-50 rounded">
        <h3 className="font-medium mb-2">Content Details</h3>
        <p className="text-sm"><strong>Type:</strong> {task.content_type}</p>
        <p className="text-sm"><strong>ID:</strong> {task.content_id}</p>
        <p className="text-sm"><strong>Categories:</strong> {task.categories.join(', ')}</p>
        <p className="text-sm"><strong>Priority:</strong> {task.priority}</p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Action
          </label>
          <div className="space-y-2">
            {actions.map((a) => (
              <label key={a.id} className="flex items-center">
                <input
                  type="radio"
                  name="action"
                  value={a.id}
                  checked={action === a.id}
                  onChange={(e) => setAction(e.target.value)}
                  className="mr-2"
                />
                <span className={
                  a.color === 'red' ? 'text-red-600' :
                  a.color === 'green' ? 'text-green-600' :
                  a.color === 'yellow' ? 'text-yellow-600' : ''
                }>
                  {a.label}
                </span>
              </label>
            ))}
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Add any additional notes for this action..."
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!action || submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {submitting ? 'Processing...' : 'Submit Review'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

## Implementation Roadmap

### Phase 1: Core Moderation Infrastructure (Weeks 1-2)

#### Week 1: Moderation Service
- Implement core moderation service
- Create database schema for moderation
- Build content analysis engine
- Implement reporting system

#### Week 2: Content Analysis
- Implement text content analysis
- Add media content analysis
- Create automated filtering rules
- Implement moderation scoring system

### Phase 2: Moderation Dashboard (Weeks 3-4)

#### Week 3: Dashboard Backend
- Create moderation API endpoints
- Implement dashboard data aggregation
- Add moderation task management
- Create statistics and metrics

#### Week 4: Dashboard Frontend
- Build moderation dashboard UI
- Implement task review interface
- Add filtering and search capabilities
- Create reporting tools

### Phase 3: Advanced Features (Weeks 5-6)

#### Week 5: User Management
- Implement user warnings and bans
- Add appeal process
- Create user moderation history
- Implement automatic restrictions

#### Week 6: Integration and Testing
- Integrate with existing platform
- Test moderation workflows
- Optimize performance
- Conduct security review

### Phase 4: Optimization and Monitoring (Weeks 7-8)

#### Week 7: Performance Optimization
- Optimize content analysis
- Implement caching strategies
- Add background processing
- Improve dashboard performance

#### Week 8: Monitoring and Analytics
- Implement moderation analytics
- Add logging and monitoring
- Create alerting system
- Conduct user testing

## Performance Optimization

### Content Analysis
- Batch processing for high-volume content
- Asynchronous analysis with job queues
- Caching of analysis results
- Machine learning model optimization

### Database Optimization
- Index optimization for moderation queries
- Query result caching
- Connection pooling
- Read replicas for high-traffic queries

### Caching Strategy
- Redis caching for frequently accessed data
- Cache invalidation strategies
- TTL optimization
- Memory usage monitoring

## Monitoring and Analytics

### System Metrics
- Moderation task processing time
- Content analysis accuracy
- User report resolution time
- System resource usage

### Business Metrics
- Report submission rates
- Moderation action effectiveness
- User satisfaction with moderation
- Community health metrics

## Testing Strategy

### Unit Testing
- Moderation service functions
- Content analysis algorithms
- Database operations
- API endpoint handlers

### Integration Testing
- End-to-end moderation workflows
- Content analysis accuracy
- User reporting process
- Moderation dashboard functionality

### User Testing
- Moderator usability testing
- Report submission workflows
- Dashboard interface feedback
- Performance testing

## Success Metrics

### Technical Metrics
- Moderation task processing time (<30 seconds)
- Content analysis accuracy (>90%)
- Dashboard load time (<2 seconds)
- System uptime (>99.9%)

### User Experience Metrics
- Report submission completion rate (>95%)
- Moderator satisfaction scores (>4.5/5)
- Content resolution time (<24 hours)
- False positive rate (<5%)

### Business Metrics
- Community safety improvements
- User retention through moderation
- Creator satisfaction with platform safety
- Reduction in policy violations

This plan provides a comprehensive roadmap for implementing content moderation tools for the Vilokanam-view platform, enabling effective community management while maintaining a safe and respectful environment for all users.