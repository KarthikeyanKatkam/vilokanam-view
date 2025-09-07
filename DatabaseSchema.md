# Database Schema Design for Vilokanam-view Platform

## Overview

This document outlines the database schema design for the Vilokanam-view platform, covering both video storage and live streaming functionality. The schema is designed to support the pay-per-second billing model while providing efficient storage and retrieval of video content and metadata.

## Core Tables

### 1. Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    account_id VARCHAR(255) UNIQUE NOT NULL, -- Polkadot account address
    username VARCHAR(50) UNIQUE,
    email VARCHAR(255) UNIQUE,
    profile_image_url TEXT,
    bio TEXT,
    is_creator BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Videos Table

```sql
CREATE TABLE videos (
    id UUID PRIMARY KEY,
    creator_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'uploading', -- uploading, processing, ready, failed, archived
    duration INTEGER, -- in seconds
    width INTEGER, -- in pixels
    height INTEGER, -- in pixels
    file_size BIGINT, -- in bytes
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    ipfs_hash VARCHAR(255), -- hash of original file on IPFS
    storage_url TEXT, -- URL to primary storage location
    processing_job_id VARCHAR(255), -- ID of processing job
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Video Versions Table

```sql
CREATE TABLE video_versions (
    id UUID PRIMARY KEY,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    resolution VARCHAR(20) NOT NULL, -- e.g., '240p', '360p', '480p', '720p', '1080p', '4k'
    bitrate INTEGER, -- in kbps
    file_size BIGINT, -- in bytes
    storage_url TEXT NOT NULL, -- URL to this version
    ipfs_hash VARCHAR(255), -- hash of this version on IPFS
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_video_versions_video_id ON video_versions(video_id);
```

### 4. Video Metadata Table

```sql
CREATE TABLE video_metadata (
    video_id UUID PRIMARY KEY REFERENCES videos(id) ON DELETE CASCADE,
    format VARCHAR(50), -- e.g., 'mp4', 'webm', 'mov'
    codec VARCHAR(50), -- e.g., 'h264', 'h265', 'vp9'
    audio_codec VARCHAR(50), -- e.g., 'aac', 'opus'
    frame_rate DECIMAL(5,2), -- e.g., 24.00, 30.00
    aspect_ratio VARCHAR(20), -- e.g., '16:9', '4:3'
    tags TEXT[], -- Array of tags
    extra_data JSONB -- Additional metadata in JSON format
);
```

### 5. Categories Table

```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 6. Video Categories Table (Many-to-Many)

```sql
CREATE TABLE video_categories (
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (video_id, category_id)
);
```

## Live Streaming Tables

### 7. Streams Table

```sql
CREATE TABLE streams (
    id UUID PRIMARY KEY,
    creator_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    category_id UUID REFERENCES categories(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, live, ended, archived
    stream_key VARCHAR(255) UNIQUE, -- Secret key for streaming
    viewer_count INTEGER DEFAULT 0,
    total_ticks INTEGER DEFAULT 0, -- Total seconds viewed
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    recording_url TEXT, -- URL to recorded version if available
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 8. Stream Viewers Table

```sql
CREATE TABLE stream_viewers (
    id UUID PRIMARY KEY,
    stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES users(id),
    join_time TIMESTAMP DEFAULT NOW(),
    last_tick_time TIMESTAMP, -- Last time a tick was recorded
    total_ticks INTEGER DEFAULT 0, -- Total seconds viewed for this session
    paid_amount DECIMAL(15, 8) DEFAULT 0, -- Amount paid in platform tokens
    is_active BOOLEAN DEFAULT TRUE, -- Whether viewer is currently watching
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_stream_viewers_stream_id ON stream_viewers(stream_id);
CREATE INDEX idx_stream_viewers_viewer_id ON stream_viewers(viewer_id);
CREATE INDEX idx_stream_viewers_active ON stream_viewers(is_active);
```

### 9. Stream Sessions Table

```sql
CREATE TABLE stream_sessions (
    id UUID PRIMARY KEY,
    stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
    sfu_server_url VARCHAR(255), -- URL of SFU server handling this session
    signaling_server_url VARCHAR(255), -- URL of signaling server
    start_time TIMESTAMP DEFAULT NOW(),
    end_time TIMESTAMP,
    viewer_peak INTEGER DEFAULT 0, -- Peak number of concurrent viewers
    total_ticks INTEGER DEFAULT 0, -- Total ticks for the session
    recording_id UUID, -- Reference to recorded video if available
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Payment and Billing Tables

### 10. Payments Table

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY,
    from_user_id UUID NOT NULL REFERENCES users(id),
    to_user_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(15, 8) NOT NULL, -- Amount in platform tokens
    payment_type VARCHAR(50) NOT NULL, -- 'stream_view', 'tip', 'subscription'
    reference_id UUID, -- Reference to stream_viewer record or other entity
    transaction_hash VARCHAR(255), -- Blockchain transaction hash
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, completed, failed
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_payments_from_user ON payments(from_user_id);
CREATE INDEX idx_payments_to_user ON payments(to_user_id);
CREATE INDEX idx_payments_status ON payments(status);
```

### 11. Creator Earnings Table

```sql
CREATE TABLE creator_earnings (
    id UUID PRIMARY KEY,
    creator_id UUID NOT NULL REFERENCES users(id),
    total_earnings DECIMAL(20, 8) DEFAULT 0, -- Total earnings in platform tokens
    pending_payout DECIMAL(20, 8) DEFAULT 0, -- Amount pending withdrawal
    last_payout_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Unique constraint to ensure one record per creator
CREATE UNIQUE INDEX idx_creator_earnings_creator_id ON creator_earnings(creator_id);
```

## Social Features Tables

### 12. Follows Table

```sql
CREATE TABLE follows (
    id UUID PRIMARY KEY,
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- Indexes for performance
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
```

### 13. Comments Table

```sql
CREATE TABLE comments (
    id UUID PRIMARY KEY,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For threaded comments
    content TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CHECK (
        (video_id IS NOT NULL AND stream_id IS NULL) OR
        (video_id IS NULL AND stream_id IS NOT NULL)
    )
);

-- Indexes for performance
CREATE INDEX idx_comments_video ON comments(video_id) WHERE video_id IS NOT NULL;
CREATE INDEX idx_comments_stream ON comments(stream_id) WHERE stream_id IS NOT NULL;
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_parent ON comments(parent_id) WHERE parent_id IS NOT NULL;
```

### 14. Comment Likes Table

```sql
CREATE TABLE comment_likes (
    id UUID PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user ON comment_likes(user_id);
```

### 15. Video Likes Table

```sql
CREATE TABLE video_likes (
    id UUID PRIMARY KEY,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(video_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_video_likes_video ON video_likes(video_id);
CREATE INDEX idx_video_likes_user ON video_likes(user_id);
```

## Analytics Tables

### 16. Video Views Table

```sql
CREATE TABLE video_views (
    id UUID PRIMARY KEY,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES users(id), -- NULL for anonymous views
    view_duration INTEGER, -- Duration watched in seconds
    watch_completion DECIMAL(5,2), -- Percentage of video watched (0-100)
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_video_views_video ON video_views(video_id);
CREATE INDEX idx_video_views_viewer ON video_views(viewer_id);
```

### 17. Stream Analytics Table

```sql
CREATE TABLE stream_analytics (
    id UUID PRIMARY KEY,
    stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL,
    viewer_count INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_stream_analytics_stream ON stream_analytics(stream_id);
CREATE INDEX idx_stream_analytics_timestamp ON stream_analytics(timestamp);
```

## Moderation Tables

### 18. Reports Table

```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY,
    reporter_id UUID NOT NULL REFERENCES users(id),
    target_type VARCHAR(50) NOT NULL, -- 'video', 'comment', 'user'
    target_id UUID NOT NULL, -- ID of the reported item
    reason VARCHAR(100) NOT NULL, -- Reason for report
    description TEXT, -- Additional details
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, reviewed, action_taken, dismissed
    reviewed_by UUID REFERENCES users(id), -- Moderator who reviewed
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_reports_target ON reports(target_type, target_id);
CREATE INDEX idx_reports_status ON reports(status);
```

## Indexes Summary

```sql
-- Performance indexes for commonly queried fields
CREATE INDEX idx_videos_creator_status ON videos(creator_id, status);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_published ON videos(published_at) WHERE status = 'ready';
CREATE INDEX idx_videos_views ON videos(view_count DESC);
CREATE INDEX idx_streams_creator_status ON streams(creator_id, status);
CREATE INDEX idx_streams_status ON streams(status);
CREATE INDEX idx_streams_active ON streams(start_time, end_time) WHERE status = 'live';
CREATE INDEX idx_users_account ON users(account_id);
CREATE INDEX idx_users_username ON users(username);
```

## Views for Common Queries

### Creator Dashboard View

```sql
CREATE VIEW creator_dashboard AS
SELECT 
    u.id as creator_id,
    u.username,
    COUNT(DISTINCT v.id) as total_videos,
    COUNT(DISTINCT s.id) as total_streams,
    COALESCE(SUM(v.view_count), 0) as total_video_views,
    COALESCE(SUM(s.viewer_count), 0) as total_stream_viewers,
    COALESCE(MAX(s.start_time), MAX(v.published_at)) as last_activity,
    COALESCE(ce.total_earnings, 0) as total_earnings
FROM users u
LEFT JOIN videos v ON u.id = v.creator_id AND v.status = 'ready'
LEFT JOIN streams s ON u.id = s.creator_id
LEFT JOIN creator_earnings ce ON u.id = ce.creator_id
WHERE u.is_creator = TRUE
GROUP BY u.id, u.username, ce.total_earnings;
```

### Video Analytics View

```sql
CREATE VIEW video_analytics AS
SELECT 
    v.id as video_id,
    v.title,
    v.creator_id,
    u.username as creator_username,
    v.duration,
    v.view_count,
    v.like_count,
    v.comment_count,
    COUNT(vv.id) as unique_viewers,
    AVG(vv.view_duration) as avg_view_duration,
    AVG(vv.watch_completion) as avg_watch_completion,
    v.published_at,
    v.created_at
FROM videos v
JOIN users u ON v.creator_id = u.id
LEFT JOIN video_views vv ON v.id = vv.video_id
WHERE v.status = 'ready'
GROUP BY v.id, v.title, v.creator_id, u.username, v.duration, v.view_count, 
         v.like_count, v.comment_count, v.published_at, v.created_at;
```

## Triggers for Automation

### Update Video Timestamp

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_videos_updated_at 
    BEFORE UPDATE ON videos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_streams_updated_at 
    BEFORE UPDATE ON streams 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

### Update View Count

```sql
CREATE OR REPLACE FUNCTION update_video_view_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE videos 
    SET view_count = view_count + 1,
        updated_at = NOW()
    WHERE id = NEW.video_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_video_view_count_trigger
    AFTER INSERT ON video_views
    FOR EACH ROW
    EXECUTE FUNCTION update_video_view_count();
```

This database schema provides a comprehensive foundation for the Vilokanam-view platform, supporting both video-on-demand and live streaming functionality with integrated pay-per-second billing, social features, and analytics capabilities.