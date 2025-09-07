# Creator Analytics and Reporting Implementation Plan

## Overview

This document outlines the plan for implementing comprehensive analytics and reporting features for content creators on the Vilokanam-view platform. These features will provide creators with detailed insights into their content performance, audience engagement, and earnings, enabling data-driven decisions to grow their channels.

## Current State Analysis

The platform currently has:
- Basic creator dashboard with minimal metrics
- No comprehensive analytics system
- Limited reporting capabilities
- No data visualization tools
- No export functionality

## Analytics and Reporting Requirements

### Core Features
1. Content performance analytics
2. Audience engagement metrics
3. Earnings and revenue tracking
4. Real-time dashboard
5. Historical data analysis
6. Data export capabilities

### Technical Requirements
1. High-performance data processing
2. Scalable storage for analytics data
3. Real-time data aggregation
4. Secure data access controls
5. API for third-party integrations

## System Architecture

### Component Overview

#### 1. Analytics Service
- Data collection and processing
- Real-time metrics calculation
- Historical data aggregation
- Performance analytics

#### 2. Reporting Service
- Report generation
- Data visualization
- Export functionality
- Custom report builder

#### 3. Data Storage
- Time-series database for metrics
- Data warehouse for historical analysis
- Cache layer for frequently accessed data
- Backup and retention policies

#### 4. Analytics API
- Real-time metrics endpoints
- Historical data endpoints
- Report generation endpoints
- Export endpoints

### Data Flow

1. **Data Collection**
   - User interactions (views, likes, comments)
   - Payment data (earnings, transactions)
   - Content metadata (uploads, streams)
   - Engagement data (follows, reactions)

2. **Data Processing**
   - Real-time metric calculation
   - Data aggregation and summarization
   - Anomaly detection
   - Data quality validation

3. **Data Storage**
   - Metrics stored in time-series database
   - Historical data in data warehouse
   - Cached data for performance
   - Backup for data retention

4. **Data Presentation**
   - Dashboard visualization
   - Report generation
   - Data export
   - API access for integrations

## Analytics Service Implementation

### Core Analytics Service

#### Implementation
```javascript
// services/analytics-service.js
import redis from 'redis';
import { InfluxDB, Point } from '@influxdata/influxdb-client';
import { v4 as uuidv4 } from 'uuid';

class AnalyticsService {
  constructor(db, influxDB) {
    this.db = db;
    this.influxDB = influxDB;
    this.writeApi = influxDB.getWriteApi(
      process.env.INFLUXDB_ORG, 
      process.env.INFLUXDB_BUCKET, 
      'ns'
    );
    this.queryApi = influxDB.getQueryApi(process.env.INFLUXDB_ORG);
    this.redisClient = redis.createClient();
  }

  // Record content view
  async recordContentView(viewData) {
    try {
      const {
        contentId,
        contentType, // 'video' or 'stream'
        userId,
        duration,
        watchCompletion,
        ipAddress,
        userAgent
      } = viewData;

      // Create point for InfluxDB
      const point = new Point('content_views')
        .tag('content_id', contentId)
        .tag('content_type', contentType)
        .tag('user_id', userId || 'anonymous')
        .floatField('duration', duration || 0)
        .floatField('watch_completion', watchCompletion || 0)
        .stringField('ip_address', ipAddress || '')
        .stringField('user_agent', userAgent || '');

      // Write to InfluxDB
      this.writeApi.writePoint(point);

      // Update database view count
      if (contentType === 'video') {
        await this.db.videos.incrementViewCount(contentId);
      } else if (contentType === 'stream') {
        await this.db.streams.incrementViewCount(contentId);
      }

      // Update user view history
      if (userId) {
        await this.db.video_views.create({
          id: uuidv4(),
          video_id: contentType === 'video' ? contentId : null,
          stream_id: contentType === 'stream' ? contentId : null,
          viewer_id: userId,
          view_duration: duration,
          watch_completion: watchCompletion,
          ip_address: ipAddress,
          user_agent: userAgent,
          created_at: new Date()
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Record content view failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Record engagement event
  async recordEngagement(engagementData) {
    try {
      const {
        contentId,
        contentType,
        userId,
        eventType, // 'like', 'comment', 'share', 'follow'
        timestamp = new Date()
      } = engagementData;

      // Create point for InfluxDB
      const point = new Point('engagement')
        .tag('content_id', contentId)
        .tag('content_type', contentType)
        .tag('user_id', userId || 'anonymous')
        .tag('event_type', eventType)
        .timestamp(timestamp.getTime(), 'ms');

      // Write to InfluxDB
      this.writeApi.writePoint(point);

      // Update engagement counts in database
      switch (eventType) {
        case 'like':
          if (contentType === 'video') {
            await this.db.videos.incrementLikeCount(contentId);
          }
          break;
        case 'comment':
          if (contentType === 'video') {
            await this.db.videos.incrementCommentCount(contentId);
          } else if (contentType === 'stream') {
            await this.db.streams.incrementCommentCount(contentId);
          }
          break;
        case 'follow':
          // This would be handled by the following service
          break;
      }

      return { success: true };
    } catch (error) {
      console.error('Record engagement failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Record payment event
  async recordPayment(paymentData) {
    try {
      const {
        creatorId,
        viewerId,
        amount,
        contentType,
        contentId,
        timestamp = new Date()
      } = paymentData;

      // Create point for InfluxDB
      const point = new Point('payments')
        .tag('creator_id', creatorId)
        .tag('viewer_id', viewerId || 'anonymous')
        .tag('content_type', contentType)
        .tag('content_id', contentId)
        .floatField('amount', amount)
        .timestamp(timestamp.getTime(), 'ms');

      // Write to InfluxDB
      this.writeApi.writePoint(point);

      // Update earnings in database
      await this.db.creator_earnings.incrementEarnings(creatorId, amount);

      return { success: true };
    } catch (error) {
      console.error('Record payment failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Get real-time metrics
  async getRealTimeMetrics(creatorId, options = {}) {
    try {
      const {
        timeRange = '24h', // '1h', '6h', '24h', '7d'
        contentType = null // 'video', 'stream', or null for all
      } = options;

      // Calculate time range
      const endTime = new Date();
      let startTime;
      
      switch (timeRange) {
        case '1h':
          startTime = new Date(endTime.getTime() - 60 * 60 * 1000);
          break;
        case '6h':
          startTime = new Date(endTime.getTime() - 6 * 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
      }

      // Try cache first
      const cacheKey = `analytics:realtime:${creatorId}:${timeRange}:${contentType || 'all'}`;
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Query InfluxDB for views
      let fluxQuery = `
        from(bucket: "${process.env.INFLUXDB_BUCKET}")
          |> range(start: ${startTime.toISOString()}, stop: ${endTime.toISOString()})
          |> filter(fn: (r) => r._measurement == "content_views")
          |> filter(fn: (r) => r.creator_id == "${creatorId}")
      `;
      
      if (contentType) {
        fluxQuery += `|> filter(fn: (r) => r.content_type == "${contentType}")`;
      }

      const viewResults = await this.queryInflux(fluxQuery);

      // Query InfluxDB for engagement
      fluxQuery = `
        from(bucket: "${process.env.INFLUXDB_BUCKET}")
          |> range(start: ${startTime.toISOString()}, stop: ${endTime.toISOString()})
          |> filter(fn: (r) => r._measurement == "engagement")
          |> filter(fn: (r) => r.creator_id == "${creatorId}")
      `;
      
      if (contentType) {
        fluxQuery += `|> filter(fn: (r) => r.content_type == "${contentType}")`;
      }

      const engagementResults = await this.queryInflux(fluxQuery);

      // Query InfluxDB for payments
      fluxQuery = `
        from(bucket: "${process.env.INFLUXDB_BUCKET}")
          |> range(start: ${startTime.toISOString()}, stop: ${endTime.toISOString()})
          |> filter(fn: (r) => r._measurement == "payments")
          |> filter(fn: (r) => r.creator_id == "${creatorId}")
      `;

      const paymentResults = await this.queryInflux(fluxQuery);

      // Process results
      const metrics = {
        totalViews: viewResults.length,
        totalEngagement: engagementResults.length,
        totalEarnings: paymentResults.reduce((sum, payment) => sum + (payment.amount || 0), 0),
        uniqueViewers: new Set(viewResults.map(v => v.user_id)).size,
        averageWatchTime: viewResults.length > 0 
          ? viewResults.reduce((sum, view) => sum + (view.duration || 0), 0) / viewResults.length
          : 0,
        engagementRate: viewResults.length > 0 
          ? (engagementResults.length / viewResults.length) * 100
          : 0
      };

      // Cache for 5 minutes
      await this.redisClient.setex(cacheKey, 300, JSON.stringify(metrics));

      return metrics;
    } catch (error) {
      console.error('Get real-time metrics failed:', error);
      throw new Error('Failed to retrieve real-time metrics');
    }
  }

  // Get historical analytics
  async getHistoricalAnalytics(creatorId, options = {}) {
    try {
      const {
        startDate,
        endDate,
        granularity = 'day', // 'hour', 'day', 'week', 'month'
        metrics = ['views', 'earnings', 'engagement']
      } = options;

      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid date range');
      }

      if (start > end) {
        throw new Error('Start date must be before end date');
      }

      // Try cache first
      const cacheKey = `analytics:historical:${creatorId}:${start.toISOString()}:${end.toISOString()}:${granularity}`;
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Query database for historical data
      const analyticsData = await this.db.analytics.getHistoricalData(
        creatorId,
        start,
        end,
        granularity,
        metrics
      );

      // Cache for 1 hour
      await this.redisClient.setex(cacheKey, 3600, JSON.stringify(analyticsData));

      return analyticsData;
    } catch (error) {
      console.error('Get historical analytics failed:', error);
      throw new Error('Failed to retrieve historical analytics');
    }
  }

  // Get content performance
  async getContentPerformance(creatorId, options = {}) {
    try {
      const {
        contentType = null, // 'video', 'stream', or null for all
        sortBy = 'views', // 'views', 'earnings', 'engagement', 'date'
        sortOrder = 'desc', // 'asc' or 'desc'
        limit = 20,
        offset = 0
      } = options;

      // Try cache first
      const cacheKey = `analytics:content:${creatorId}:${contentType || 'all'}:${sortBy}:${sortOrder}:${limit}:${offset}`;
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Query database for content performance data
      const contentData = await this.db.analytics.getContentPerformance(
        creatorId,
        {
          contentType,
          sortBy,
          sortOrder,
          limit,
          offset
        }
      );

      // Cache for 10 minutes
      await this.redisClient.setex(cacheKey, 600, JSON.stringify(contentData));

      return contentData;
    } catch (error) {
      console.error('Get content performance failed:', error);
      throw new Error('Failed to retrieve content performance data');
    }
  }

  // Get audience demographics
  async getAudienceDemographics(creatorId, options = {}) {
    try {
      const {
        timeRange = '30d' // '7d', '30d', '90d', 'all'
      } = options;

      // Calculate time range
      const endTime = new Date();
      let startTime;
      
      switch (timeRange) {
        case '7d':
          startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startTime = new Date(endTime.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(0); // All time
      }

      // Try cache first
      const cacheKey = `analytics:demographics:${creatorId}:${timeRange}`;
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Query database for audience demographics
      const demographics = await this.db.analytics.getAudienceDemographics(
        creatorId,
        startTime,
        endTime
      );

      // Cache for 1 hour
      await this.redisClient.setex(cacheKey, 3600, JSON.stringify(demographics));

      return demographics;
    } catch (error) {
      console.error('Get audience demographics failed:', error);
      throw new Error('Failed to retrieve audience demographics');
    }
  }

  // Get earnings report
  async getEarningsReport(creatorId, options = {}) {
    try {
      const {
        startDate,
        endDate,
        groupBy = 'day' // 'day', 'week', 'month'
      } = options;

      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid date range');
      }

      // Try cache first
      const cacheKey = `analytics:earnings:${creatorId}:${start.toISOString()}:${end.toISOString()}:${groupBy}`;
      const cached = await this.redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Query database for earnings data
      const earningsData = await this.db.analytics.getEarningsReport(
        creatorId,
        start,
        end,
        groupBy
      );

      // Cache for 1 hour
      await this.redisClient.setex(cacheKey, 3600, JSON.stringify(earningsData));

      return earningsData;
    } catch (error) {
      console.error('Get earnings report failed:', error);
      throw new Error('Failed to retrieve earnings report');
    }
  }

  // Helper function to query InfluxDB
  async queryInflux(fluxQuery) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      this.queryApi.queryRows(fluxQuery, {
        next(row, tableMeta) {
          const object = tableMeta.toObject(row);
          results.push(object);
        },
        error(error) {
          reject(error);
        },
        complete() {
          resolve(results);
        }
      });
    });
  }

  // Flush write buffer
  async flush() {
    try {
      await this.writeApi.close();
      return { success: true };
    } catch (error) {
      console.error('Flush analytics data failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate analytics snapshot for backup
  async generateSnapshot(creatorId) {
    try {
      // Get all analytics data for creator
      const snapshot = {
        creatorId,
        generatedAt: new Date(),
        realtimeMetrics: await this.getRealTimeMetrics(creatorId),
        contentPerformance: await this.getContentPerformance(creatorId),
        audienceDemographics: await this.getAudienceDemographics(creatorId),
        earningsReport: await this.getEarningsReport(creatorId, {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: new Date()
        })
      };

      return snapshot;
    } catch (error) {
      console.error('Generate analytics snapshot failed:', error);
      throw new Error('Failed to generate analytics snapshot');
    }
  }
}

export default AnalyticsService;
```

## Reporting Service Implementation

### Core Reporting Service

#### Implementation
```javascript
// services/reporting-service.js
import { createObjectCsvStringifier } from 'csv-writer';
import PDFDocument from 'pdfkit';
import redis from 'redis';

class ReportingService {
  constructor(analyticsService, db) {
    this.analyticsService = analyticsService;
    this.db = db;
    this.redisClient = redis.createClient();
  }

  // Generate performance report
  async generatePerformanceReport(creatorId, options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        format = 'json' // 'json', 'csv', 'pdf'
      } = options;

      // Get analytics data
      const [
        realtimeMetrics,
        historicalAnalytics,
        contentPerformance,
        audienceDemographics
      ] = await Promise.all([
        this.analyticsService.getRealTimeMetrics(creatorId, {
          timeRange: '30d'
        }),
        this.analyticsService.getHistoricalAnalytics(creatorId, {
          startDate,
          endDate,
          granularity: 'day'
        }),
        this.analyticsService.getContentPerformance(creatorId, {
          limit: 50
        }),
        this.analyticsService.getAudienceDemographics(creatorId, {
          timeRange: '30d'
        })
      ]);

      // Create report data
      const reportData = {
        creatorId,
        reportPeriod: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        generatedAt: new Date().toISOString(),
        summary: {
          totalViews: realtimeMetrics.totalViews,
          totalEarnings: realtimeMetrics.totalEarnings,
          uniqueViewers: realtimeMetrics.uniqueViewers,
          engagementRate: realtimeMetrics.engagementRate,
          averageWatchTime: realtimeMetrics.averageWatchTime
        },
        performanceTrends: historicalAnalytics,
        topPerformingContent: contentPerformance.slice(0, 10),
        audienceInsights: audienceDemographics
      };

      // Format report based on requested format
      switch (format) {
        case 'csv':
          return this.formatAsCSV(reportData);
        case 'pdf':
          return this.formatAsPDF(reportData);
        default:
          return reportData;
      }
    } catch (error) {
      console.error('Generate performance report failed:', error);
      throw new Error('Failed to generate performance report');
    }
  }

  // Generate earnings report
  async generateEarningsReport(creatorId, options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        format = 'json' // 'json', 'csv', 'pdf'
      } = options;

      // Get earnings data
      const earningsData = await this.analyticsService.getEarningsReport(
        creatorId,
        startDate,
        endDate,
        'day'
      );

      // Get creator info
      const creator = await this.db.users.findById(creatorId);

      // Create report data
      const reportData = {
        creatorId,
        creatorName: creator?.username || 'Unknown Creator',
        reportPeriod: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        generatedAt: new Date().toISOString(),
        totalEarnings: earningsData.reduce((sum, day) => sum + (day.earnings || 0), 0),
        dailyEarnings: earningsData,
        earningsByContent: await this.getEarningsByContent(creatorId, startDate, endDate)
      };

      // Format report based on requested format
      switch (format) {
        case 'csv':
          return this.formatAsCSV(reportData);
        case 'pdf':
          return this.formatAsPDF(reportData);
        default:
          return reportData;
      }
    } catch (error) {
      console.error('Generate earnings report failed:', error);
      throw new Error('Failed to generate earnings report');
    }
  }

  // Get earnings by content
  async getEarningsByContent(creatorId, startDate, endDate) {
    try {
      return await this.db.analytics.getEarningsByContent(
        creatorId,
        startDate,
        endDate
      );
    } catch (error) {
      console.error('Get earnings by content failed:', error);
      return [];
    }
  }

  // Format report as CSV
  async formatAsCSV(reportData) {
    try {
      // This is a simplified CSV format
      // In a real implementation, you'd want more detailed CSV structure
      const csvData = [
        ['Report Type', 'Generated At', 'Period Start', 'Period End'],
        [
          'Performance Report',
          reportData.generatedAt,
          reportData.reportPeriod.startDate,
          reportData.reportPeriod.endDate
        ],
        [],
        ['Summary Metrics'],
        ['Metric', 'Value'],
        ['Total Views', reportData.summary?.totalViews || 0],
        ['Total Earnings', reportData.summary?.totalEarnings || 0],
        ['Unique Viewers', reportData.summary?.uniqueViewers || 0],
        ['Engagement Rate', `${reportData.summary?.engagementRate?.toFixed(2) || 0}%`],
        ['Average Watch Time', `${reportData.summary?.averageWatchTime?.toFixed(2) || 0} seconds`]
      ];

      // Convert to CSV string
      let csvString = '';
      csvData.forEach(row => {
        csvString += row.join(',') + '\n';
      });

      return {
        contentType: 'text/csv',
        filename: `performance-report-${new Date().toISOString().slice(0, 10)}.csv`,
        data: csvString
      };
    } catch (error) {
      console.error('Format as CSV failed:', error);
      throw new Error('Failed to format report as CSV');
    }
  }

  // Format report as PDF
  async formatAsPDF(reportData) {
    try {
      const doc = new PDFDocument();
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {});
      
      // Add content to PDF
      doc.fontSize(20).text('Vilokanam-view Creator Report', { align: 'center' });
      doc.moveDown();
      
      doc.fontSize(12).text(`Generated: ${new Date(reportData.generatedAt).toLocaleString()}`);
      doc.text(`Period: ${new Date(reportData.reportPeriod.startDate).toLocaleDateString()} - ${new Date(reportData.reportPeriod.endDate).toLocaleDateString()}`);
      doc.moveDown();
      
      if (reportData.summary) {
        doc.fontSize(16).text('Summary');
        doc.moveDown();
        doc.fontSize(12).text(`Total Views: ${reportData.summary.totalViews}`);
        doc.text(`Total Earnings: ${reportData.summary.totalEarnings.toFixed(4)} DOT`);
        doc.text(`Unique Viewers: ${reportData.summary.uniqueViewers}`);
        doc.text(`Engagement Rate: ${reportData.summary.engagementRate.toFixed(2)}%`);
        doc.text(`Average Watch Time: ${reportData.summary.averageWatchTime.toFixed(2)} seconds`);
      }
      
      doc.end();
      
      // Wait for PDF generation to complete
      const pdfBuffer = await new Promise((resolve, reject) => {
        doc.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
        doc.on('error', reject);
      });
      
      return {
        contentType: 'application/pdf',
        filename: `performance-report-${new Date().toISOString().slice(0, 10)}.pdf`,
        data: pdfBuffer
      };
    } catch (error) {
      console.error('Format as PDF failed:', error);
      throw new Error('Failed to format report as PDF');
    }
  }

  // Get report history
  async getReportHistory(creatorId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      const reports = await this.db.reports.findByCreator(
        creatorId,
        limit,
        offset
      );

      const total = await this.db.reports.countByCreator(creatorId);

      return {
        reports: reports,
        total: total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Get report history failed:', error);
      throw new Error('Failed to retrieve report history');
    }
  }

  // Save report
  async saveReport(creatorId, reportData, format) {
    try {
      const report = await this.db.reports.create({
        id: uuidv4(),
        creator_id: creatorId,
        report_type: reportData.reportType || 'performance',
        format: format,
        generated_at: new Date(),
        data: reportData
      });

      return report;
    } catch (error) {
      console.error('Save report failed:', error);
      throw new Error('Failed to save report');
    }
  }

  // Get saved report
  async getSavedReport(reportId, creatorId) {
    try {
      const report = await this.db.reports.findById(reportId);
      
      if (!report) {
        throw new Error('Report not found');
      }

      if (report.creator_id !== creatorId) {
        throw new Error('Not authorized to access this report');
      }

      return report;
    } catch (error) {
      console.error('Get saved report failed:', error);
      throw new Error('Failed to retrieve saved report');
    }
  }

  // Schedule automated reports
  async scheduleAutomatedReport(creatorId, scheduleData) {
    try {
      const {
        frequency, // 'daily', 'weekly', 'monthly'
        reportType, // 'performance', 'earnings'
        format, // 'json', 'csv', 'pdf'
        email // email to send report to
      } = scheduleData;

      const schedule = await this.db.report_schedules.create({
        id: uuidv4(),
        creator_id: creatorId,
        frequency: frequency,
        report_type: reportType,
        format: format,
        email: email,
        enabled: true,
        created_at: new Date()
      });

      return schedule;
    } catch (error) {
      console.error('Schedule automated report failed:', error);
      throw new Error('Failed to schedule automated report');
    }
  }

  // Get automated report schedules
  async getAutomatedReportSchedules(creatorId) {
    try {
      const schedules = await this.db.report_schedules.findByCreator(creatorId);
      return schedules;
    } catch (error) {
      console.error('Get automated report schedules failed:', error);
      throw new Error('Failed to retrieve report schedules');
    }
  }

  // Update automated report schedule
  async updateAutomatedReportSchedule(scheduleId, creatorId, updateData) {
    try {
      const schedule = await this.db.report_schedules.findById(scheduleId);
      
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      if (schedule.creator_id !== creatorId) {
        throw new Error('Not authorized to update this schedule');
      }

      const updatedSchedule = await this.db.report_schedules.update(
        scheduleId,
        updateData
      );

      return updatedSchedule;
    } catch (error) {
      console.error('Update automated report schedule failed:', error);
      throw new Error('Failed to update report schedule');
    }
  }

  // Delete automated report schedule
  async deleteAutomatedReportSchedule(scheduleId, creatorId) {
    try {
      const schedule = await this.db.report_schedules.findById(scheduleId);
      
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      if (schedule.creator_id !== creatorId) {
        throw new Error('Not authorized to delete this schedule');
      }

      await this.db.report_schedules.delete(scheduleId);

      return { success: true, message: 'Schedule deleted successfully' };
    } catch (error) {
      console.error('Delete automated report schedule failed:', error);
      throw new Error('Failed to delete report schedule');
    }
  }
}

export default ReportingService;
```

## Analytics API Implementation

### API Routes

#### Implementation
```javascript
// routes/analytics.js
import express from 'express';
import AnalyticsService from '../services/analytics-service';
import ReportingService from '../services/reporting-service';
import { authenticateToken } from '../middleware/auth';
import { InfluxDB } from '@influxdata/influxdb-client';

const router = express.Router();
const influxDB = new InfluxDB({ url: process.env.INFLUXDB_URL, token: process.env.INFLUXDB_TOKEN });
const analyticsService = new AnalyticsService(influxDB);
const reportingService = new ReportingService(analyticsService);

// Get real-time metrics
router.get('/realtime', authenticateToken, async (req, res) => {
  try {
    const options = {
      timeRange: req.query.timeRange || '24h',
      contentType: req.query.contentType || null
    };

    const metrics = await analyticsService.getRealTimeMetrics(
      req.user.userId,
      options
    );

    res.json(metrics);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get historical analytics
router.get('/historical', authenticateToken, async (req, res) => {
  try {
    const options = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      granularity: req.query.granularity || 'day',
      metrics: req.query.metrics ? req.query.metrics.split(',') : ['views', 'earnings', 'engagement']
    };

    const analytics = await analyticsService.getHistoricalAnalytics(
      req.user.userId,
      options
    );

    res.json(analytics);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get content performance
router.get('/content', authenticateToken, async (req, res) => {
  try {
    const options = {
      contentType: req.query.contentType || null,
      sortBy: req.query.sortBy || 'views',
      sortOrder: req.query.sortOrder || 'desc',
      limit: parseInt(req.query.limit) || 20,
      offset: parseInt(req.query.offset) || 0
    };

    const performance = await analyticsService.getContentPerformance(
      req.user.userId,
      options
    );

    res.json(performance);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get audience demographics
router.get('/demographics', authenticateToken, async (req, res) => {
  try {
    const options = {
      timeRange: req.query.timeRange || '30d'
    };

    const demographics = await analyticsService.getAudienceDemographics(
      req.user.userId,
      options
    );

    res.json(demographics);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get earnings report
router.get('/earnings', authenticateToken, async (req, res) => {
  try {
    const options = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      groupBy: req.query.groupBy || 'day'
    };

    const earnings = await analyticsService.getEarningsReport(
      req.user.userId,
      options
    );

    res.json(earnings);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Generate performance report
router.get('/reports/performance', authenticateToken, async (req, res) => {
  try {
    const options = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      format: req.query.format || 'json'
    };

    const report = await reportingService.generatePerformanceReport(
      req.user.userId,
      options
    );

    if (options.format === 'json') {
      res.json(report);
    } else {
      res.setHeader('Content-Type', report.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
      res.send(report.data);
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Generate earnings report
router.get('/reports/earnings', authenticateToken, async (req, res) => {
  try {
    const options = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      format: req.query.format || 'json'
    };

    const report = await reportingService.generateEarningsReport(
      req.user.userId,
      options
    );

    if (options.format === 'json') {
      res.json(report);
    } else {
      res.setHeader('Content-Type', report.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
      res.send(report.data);
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get report history
router.get('/reports/history', authenticateToken, async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };

    const history = await reportingService.getReportHistory(
      req.user.userId,
      options
    );

    res.json(history);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get saved report
router.get('/reports/:reportId', authenticateToken, async (req, res) => {
  try {
    const report = await reportingService.getSavedReport(
      req.params.reportId,
      req.user.userId
    );

    res.json(report);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Schedule automated report
router.post('/reports/schedule', authenticateToken, async (req, res) => {
  try {
    const schedule = await reportingService.scheduleAutomatedReport(
      req.user.userId,
      req.body
    );

    res.json(schedule);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get automated report schedules
router.get('/reports/schedules', authenticateToken, async (req, res) => {
  try {
    const schedules = await reportingService.getAutomatedReportSchedules(
      req.user.userId
    );

    res.json(schedules);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update automated report schedule
router.put('/reports/schedules/:scheduleId', authenticateToken, async (req, res) => {
  try {
    const schedule = await reportingService.updateAutomatedReportSchedule(
      req.params.scheduleId,
      req.user.userId,
      req.body
    );

    res.json(schedule);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete automated report schedule
router.delete('/reports/schedules/:scheduleId', authenticateToken, async (req, res) => {
  try {
    const result = await reportingService.deleteAutomatedReportSchedule(
      req.params.scheduleId,
      req.user.userId
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
```

## Frontend Analytics Implementation

### Analytics Dashboard

#### Implementation
```jsx
// components/analytics/Dashboard.tsx
import { useState, useEffect } from 'react';
import { useAuth } from 'hooks/useAuth';
import { 
  LineChart, 
  BarChart, 
  PieChart,
  MetricsCard
} from 'components/analytics';
import { format } from 'date-fns';

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    realtime: null,
    historical: null,
    content: null,
    demographics: null
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    if (user?.is_creator) {
      fetchAllMetrics();
    }
  }, [user, timeRange]);

  const fetchAllMetrics = async () => {
    setLoading(true);
    
    try {
      const [
        realtimeResponse,
        historicalResponse,
        contentResponse,
        demographicsResponse
      ] = await Promise.all([
        fetch(`/api/analytics/realtime?timeRange=${timeRange}`),
        fetch(`/api/analytics/historical?startDate=${getStartDate(timeRange)}&endDate=${new Date().toISOString()}&granularity=day`),
        fetch(`/api/analytics/content?limit=10`),
        fetch(`/api/analytics/demographics?timeRange=${timeRange === '24h' ? '7d' : timeRange}`)
      ]);

      const [
        realtime,
        historical,
        content,
        demographics
      ] = await Promise.all([
        realtimeResponse.json(),
        historicalResponse.json(),
        contentResponse.json(),
        demographicsResponse.json()
      ]);

      setMetrics({
        realtime,
        historical,
        content,
        demographics
      });
    } catch (error) {
      console.error('Fetch metrics failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = (range) => {
    const now = new Date();
    switch (range) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      case '6h':
        return new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    }
  };

  if (!user?.is_creator) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Analytics Dashboard</h2>
        <p className="text-gray-600">You need to be a creator to access analytics.</p>
        <button 
          onClick={() => {/* Convert to creator */}}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Become a Creator
        </button>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <div className="flex space-x-2">
          {['1h', '6h', '24h', '7d'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricsCard
              title="Total Views"
              value={metrics.realtime?.totalViews || 0}
              trend="up"
            />
            <MetricsCard
              title="Total Earnings"
              value={`${(metrics.realtime?.totalEarnings || 0).toFixed(4)} DOT`}
              trend="up"
            />
            <MetricsCard
              title="Unique Viewers"
              value={metrics.realtime?.uniqueViewers || 0}
              trend="up"
            />
            <MetricsCard
              title="Engagement Rate"
              value={`${(metrics.realtime?.engagementRate || 0).toFixed(2)}%`}
              trend="up"
            />
            <MetricsCard
              title="Avg Watch Time"
              value={`${(metrics.realtime?.averageWatchTime || 0).toFixed(2)}s`}
              trend="up"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Views Over Time</h3>
              <LineChart
                data={metrics.historical?.map(point => ({
                  date: format(new Date(point.date), 'MMM dd'),
                  views: point.views
                })) || []}
                dataKey="views"
                color="#3b82f6"
              />
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Top Performing Content</h3>
              <BarChart
                data={metrics.content?.slice(0, 5).map(content => ({
                  title: content.title.length > 20 
                    ? content.title.substring(0, 20) + '...' 
                    : content.title,
                  views: content.view_count
                })) || []}
                dataKey="views"
                color="#10b981"
              />
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Earnings Over Time</h3>
              <LineChart
                data={metrics.historical?.map(point => ({
                  date: format(new Date(point.date), 'MMM dd'),
                  earnings: point.earnings
                })) || []}
                dataKey="earnings"
                color="#f59e0b"
              />
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Audience Demographics</h3>
              <PieChart
                data={metrics.demographics?.countries?.map(country => ({
                  name: country.country,
                  value: country.count
                })) || []}
              />
            </div>
          </div>

          {/* Content Performance */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Content Performance</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Content
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Views
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Earnings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Engagement
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {metrics.content?.slice(0, 10).map((content, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {content.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {content.content_type}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {content.view_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {content.earnings?.toFixed(4)} DOT
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {content.engagement_rate?.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Metrics Card Component

#### Implementation
```jsx
// components/analytics/MetricsCard.tsx
export default function MetricsCard({ title, value, trend, change }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
        </div>
        {trend && (
          <div className={`flex items-center ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
            {trend === 'up' ? '↑' : '↓'}
            {change && <span className="ml-1 text-sm">{change}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Chart Components

#### Line Chart
```jsx
// components/analytics/LineChart.tsx
export default function LineChart({ data, dataKey, color = '#3b82f6' }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d[dataKey]));
  const minValue = Math.min(...data.map(d => d[dataKey]));
  const range = maxValue - minValue || 1;

  return (
    <div className="h-64 relative">
      <svg width="100%" height="100%" viewBox="0 0 400 200">
        {/* Grid lines */}
        <line x1="0" y1="0" x2="400" y2="0" stroke="#e5e7eb" strokeWidth="1" />
        <line x1="0" y1="50" x2="400" y2="50" stroke="#e5e7eb" strokeWidth="1" />
        <line x1="0" y1="100" x2="400" y2="100" stroke="#e5e7eb" strokeWidth="1" />
        <line x1="0" y1="150" x2="400" y2="150" stroke="#e5e7eb" strokeWidth="1" />
        <line x1="0" y1="200" x2="400" y2="200" stroke="#e5e7eb" strokeWidth="1" />

        {/* Data line */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={data.map((d, i) => {
            const x = (i / (data.length - 1)) * 380 + 10;
            const y = 190 - ((d[dataKey] - minValue) / range) * 180;
            return `${x},${y}`;
          }).join(' ')}
        />

        {/* Data points */}
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * 380 + 10;
          const y = 190 - ((d[dataKey] - minValue) / range) * 180;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3"
              fill={color}
            />
          );
        })}
      </svg>
    </div>
  );
}
```

#### Bar Chart
```jsx
// components/analytics/BarChart.tsx
export default function BarChart({ data, dataKey, color = '#10b981' }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d[dataKey]));
  const barWidth = 300 / data.length;

  return (
    <div className="h-64 relative">
      <svg width="100%" height="100%" viewBox="0 0 400 200">
        {/* Grid lines */}
        <line x1="0" y1="0" x2="400" y2="0" stroke="#e5e7eb" strokeWidth="1" />
        <line x1="0" y1="50" x2="400" y2="50" stroke="#e5e7eb" strokeWidth="1" />
        <line x1="0" y1="100" x2="400" y2="100" stroke="#e5e7eb" strokeWidth="1" />
        <line x1="0" y1="150" x2="400" y2="150" stroke="#e5e7eb" strokeWidth="1" />
        <line x1="0" y1="200" x2="400" y2="200" stroke="#e5e7eb" strokeWidth="1" />

        {/* Bars */}
        {data.map((d, i) => {
          const barHeight = (d[dataKey] / maxValue) * 180;
          const x = (i * 380) / data.length + 10;
          const y = 190 - barHeight;
          
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth - 5}
                height={barHeight}
                fill={color}
              />
              <text
                x={x + (barWidth - 5) / 2}
                y={195}
                textAnchor="middle"
                fontSize="10"
                fill="#6b7280"
              >
                {d.title}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
```

#### Pie Chart
```jsx
// components/analytics/PieChart.tsx
export default function PieChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  let startAngle = 0;
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="h-64 relative">
      <svg width="100%" height="100%" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="80" fill="#f3f4f6" />
        
        {data.map((d, i) => {
          const percentage = d.value / total;
          const angle = percentage * 360;
          const endAngle = startAngle + angle;
          
          // Convert angles to radians
          const startAngleRad = (startAngle - 90) * Math.PI / 180;
          const endAngleRad = (endAngle - 90) * Math.PI / 180;
          
          // Calculate coordinates
          const x1 = 100 + 80 * Math.cos(startAngleRad);
          const y1 = 100 + 80 * Math.sin(startAngleRad);
          const x2 = 100 + 80 * Math.cos(endAngleRad);
          const y2 = 100 + 80 * Math.sin(endAngleRad);
          
          // Large arc flag
          const largeArcFlag = angle > 180 ? 1 : 0;
          
          const pathData = [
            `M 100 100`,
            `L ${x1} ${y1}`,
            `A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
          ].join(' ');
          
          startAngle = endAngle;
          
          return (
            <path
              key={i}
              d={pathData}
              fill={colors[i % colors.length]}
            />
          );
        })}
        
        {/* Center circle */}
        <circle cx="100" cy="100" r="30" fill="white" />
        <text
          x="100"
          y="105"
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fill="#374151"
        >
          Total
        </text>
      </svg>
      
      {/* Legend */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center space-x-4">
        {data.map((d, i) => (
          <div key={i} className="flex items-center">
            <div 
              className="w-3 h-3 rounded-full mr-1" 
              style={{ backgroundColor: colors[i % colors.length] }}
            ></div>
            <span className="text-xs text-gray-600">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Reports Page

#### Implementation
```jsx
// pages/analytics/reports.tsx
import { useState, useEffect } from 'react';
import { useAuth } from 'hooks/useAuth';

export default function ReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    if (user?.is_creator) {
      fetchReports();
      fetchSchedules();
    }
  }, [user]);

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/analytics/reports/history');
      const data = await response.json();
      setReports(data.reports);
    } catch (error) {
      console.error('Fetch reports failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    try {
      const response = await fetch('/api/analytics/reports/schedules');
      const data = await response.json();
      setSchedules(data);
    } catch (error) {
      console.error('Fetch schedules failed:', error);
    }
  };

  const generateReport = async (reportType, format) => {
    try {
      const response = await fetch(`/api/analytics/reports/${reportType}?format=${format}`);
      
      if (format === 'json') {
        const data = await response.json();
        console.log('Report generated:', data);
      } else {
        // Handle file download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${reportType}-${new Date().toISOString().slice(0, 10)}.${format}`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Generate report failed:', error);
    }
  };

  const createSchedule = async (scheduleData) => {
    try {
      const response = await fetch('/api/analytics/reports/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleData)
      });
      
      if (response.ok) {
        setShowScheduleModal(false);
        fetchSchedules();
      }
    } catch (error) {
      console.error('Create schedule failed:', error);
    }
  };

  if (!user?.is_creator) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Reports</h2>
        <p className="text-gray-600">You need to be a creator to access reports.</p>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Schedule Report
        </button>
      </div>

      {/* Generate Reports */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-lg font-semibold mb-4">Generate Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">Performance Report</h3>
            <p className="text-sm text-gray-600 mb-4">
              Detailed analysis of your content performance and audience engagement.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => generateReport('performance', 'json')}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm"
              >
                View
              </button>
              <button
                onClick={() => generateReport('performance', 'pdf')}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm"
              >
                PDF
              </button>
              <button
                onClick={() => generateReport('performance', 'csv')}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm"
              >
                CSV
              </button>
            </div>
          </div>
          
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">Earnings Report</h3>
            <p className="text-sm text-gray-600 mb-4">
              Comprehensive breakdown of your earnings and payment history.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => generateReport('earnings', 'json')}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm"
              >
                View
              </button>
              <button
                onClick={() => generateReport('earnings', 'pdf')}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm"
              >
                PDF
              </button>
              <button
                onClick={() => generateReport('earnings', 'csv')}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm"
              >
                CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduled Reports */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-lg font-semibold mb-4">Scheduled Reports</h2>
        {schedules.length === 0 ? (
          <p className="text-gray-500">No scheduled reports yet.</p>
        ) : (
          <div className="space-y-4">
            {schedules.map(schedule => (
              <div key={schedule.id} className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="font-medium">{schedule.report_type} Report</h3>
                  <p className="text-sm text-gray-600">
                    {schedule.frequency} • {schedule.format.toUpperCase()} • {schedule.email}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      // Edit schedule
                    }}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      // Delete schedule
                    }}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report History */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Report History</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : reports.length === 0 ? (
          <p className="text-gray-500">No reports generated yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Generated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Format
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map(report => (
                  <tr key={report.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {report.report_type} Report
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(report.generated_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.format.toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button className="text-blue-600 hover:text-blue-900">
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal
          onClose={() => setShowScheduleModal(false)}
          onCreate={createSchedule}
        />
      )}
    </div>
  );
}

// Schedule Modal Component
function ScheduleModal({ onClose, onCreate }) {
  const [formData, setFormData] = useState({
    frequency: 'weekly',
    reportType: 'performance',
    format: 'pdf',
    email: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Schedule Report</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frequency
            </label>
            <select
              value={formData.frequency}
              onChange={(e) => setFormData({...formData, frequency: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Type
            </label>
            <select
              value={formData.reportType}
              onChange={(e) => setFormData({...formData, reportType: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="performance">Performance Report</option>
              <option value="earnings">Earnings Report</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Format
            </label>
            <select
              value={formData.format}
              onChange={(e) => setFormData({...formData, format: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded"
              required
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
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

## Implementation Roadmap

### Phase 1: Analytics Infrastructure (Weeks 1-2)

#### Week 1: Analytics Service
- Implement core analytics service
- Set up InfluxDB for time-series data
- Create data collection endpoints
- Implement real-time metrics

#### Week 2: Data Storage
- Set up database schema for analytics
- Implement historical data storage
- Create data aggregation functions
- Add caching layer with Redis

### Phase 2: Reporting System (Weeks 3-4)

#### Week 3: Reporting Service
- Implement reporting service
- Create report generation functions
- Add data export capabilities
- Implement report scheduling

#### Week 4: API Endpoints
- Create analytics API endpoints
- Implement report generation endpoints
- Add export endpoints
- Implement schedule management

### Phase 3: Frontend Implementation (Weeks 5-6)

#### Week 5: Dashboard Components
- Create analytics dashboard
- Implement chart components
- Add metrics display
- Create data visualization

#### Week 6: Reports Interface
- Build reports page
- Implement report generation UI
- Add schedule management
- Create export functionality

### Phase 4: Optimization and Testing (Weeks 7-8)

#### Week 7: Performance Optimization
- Optimize database queries
- Implement data caching strategies
- Add background processing
- Improve dashboard performance

#### Week 8: Testing and Monitoring
- Conduct performance testing
- Implement monitoring and alerting
- Conduct user testing
- Optimize based on feedback

## Performance Optimization

### Data Processing
- Batch processing for high-volume data
- Asynchronous data collection
- Efficient data aggregation
- Background job processing

### Database Optimization
- Index optimization for analytics queries
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
- API response times
- Database query performance
- Cache hit rates
- System resource usage

### Business Metrics
- Report generation success rates
- Data export completion rates
- User engagement with analytics
- Creator satisfaction metrics

## Testing Strategy

### Unit Testing
- Analytics service functions
- Reporting service functions
- Data processing functions
- API endpoint handlers

### Integration Testing
- End-to-end analytics workflows
- Report generation and export
- Data collection and storage
- Performance testing

### User Testing
- Dashboard usability testing
- Report generation workflows
- Data visualization feedback
- Feature adoption tracking

## Success Metrics

### Technical Metrics
- Analytics data processing latency (<100ms)
- Dashboard load time (<2 seconds)
- Report generation time (<5 seconds)
- System uptime (>99.9%)

### User Experience Metrics
- Dashboard usage rate (>70%)
- Report generation completion rate (>95%)
- User satisfaction scores (>4.5/5)
- Feature adoption rate (>60%)

### Business Metrics
- Creator retention through analytics
- Content performance improvement
- Earnings optimization
- Platform engagement metrics

This plan provides a comprehensive roadmap for implementing analytics and reporting features for creators on the Vilokanam-view platform, enabling them to track performance, understand their audience, and optimize their content strategy through data-driven insights.