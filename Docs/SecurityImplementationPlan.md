# Security Measures and Data Protection Implementation Plan

## Overview

This document outlines the plan for implementing comprehensive security measures and data protection for the Vilokanam-view platform. These measures will ensure the platform maintains the highest standards of security while protecting user data and complying with relevant regulations.

## Current State Analysis

The platform currently has:
- Basic authentication with Polkadot wallet integration
- Limited data encryption
- No comprehensive security monitoring
- Minimal access controls
- No formal security policies
- Limited compliance measures

## Security Requirements

### Core Security Goals
1. Protect user data and privacy
2. Ensure secure authentication and authorization
3. Implement end-to-end encryption where appropriate
4. Maintain compliance with GDPR, CCPA, and other regulations
5. Establish comprehensive security monitoring
6. Implement secure coding practices

### Technical Security Requirements
1. Secure API endpoints
2. Database security and encryption
3. Network security and DDoS protection
4. Application security (OWASP Top 10)
5. Wallet and blockchain security
6. Data backup and recovery

## Security Architecture

### Security Layers

#### 1. Network Security
- DDoS protection with Cloudflare
- Firewall configuration
- Network segmentation
- SSL/TLS encryption
- Rate limiting

#### 2. Application Security
- Input validation and sanitization
- Authentication and authorization
- Session management
- API security
- Error handling

#### 3. Data Security
- Data encryption at rest and in transit
- Database security
- Backup and recovery
- Data retention policies
- Privacy controls

#### 4. Infrastructure Security
- Container security
- Kubernetes security
- Monitoring and logging
- Vulnerability management
- Incident response

## Authentication and Authorization Security

### Enhanced Authentication System

#### Implementation
```javascript
// services/security/auth-service.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import redis from 'redis';
import { v4 as uuidv4 } from 'uuid';

class EnhancedAuthService {
  constructor(db, redisConfig) {
    this.db = db;
    this.redisClient = redis.createClient(redisConfig);
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiry = process.env.JWT_EXPIRY || '24h';
    this.refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY || '7d';
  }

  // Secure user registration
  async registerUser(userData) {
    try {
      // Validate input
      this.validateUserData(userData);

      // Check if user already exists
      const existingUser = await this.db.users.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('User already exists');
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Create user
      const user = await this.db.users.create({
        id: uuidv4(),
        email: userData.email,
        password_hash: hashedPassword,
        username: userData.username,
        created_at: new Date(),
        updated_at: new Date(),
        status: 'pending_verification'
      });

      // Generate email verification token
      const verificationToken = this.generateSecureToken();
      await this.db.email_verifications.create({
        id: uuidv4(),
        user_id: user.id,
        token: verificationToken,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        created_at: new Date()
      });

      // Send verification email (implementation not shown)
      await this.sendVerificationEmail(user.email, verificationToken);

      return {
        success: true,
        message: 'User registered successfully. Please check your email for verification.',
        userId: user.id
      };
    } catch (error) {
      console.error('User registration failed:', error);
      throw new Error('Registration failed');
    }
  }

  // Secure user login
  async loginUser(credentials) {
    try {
      // Validate input
      if (!credentials.email || !credentials.password) {
        throw new Error('Email and password are required');
      }

      // Find user
      const user = await this.db.users.findByEmail(credentials.email);
      if (!user) {
        // Prevent user enumeration
        await bcrypt.compare(credentials.password, '$2b$12$somesalt');
        throw new Error('Invalid credentials');
      }

      // Check if account is locked
      const lockoutInfo = await this.checkAccountLockout(user.id);
      if (lockoutInfo.isLocked) {
        throw new Error(`Account locked. Try again in ${lockoutInfo.unlockTime} minutes`);
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(
        credentials.password,
        user.password_hash
      );

      if (!isValidPassword) {
        // Record failed attempt
        await this.recordFailedLoginAttempt(user.id);
        throw new Error('Invalid credentials');
      }

      // Check if 2FA is enabled
      const twoFactor = await this.db.two_factor.findByUserId(user.id);
      if (twoFactor && twoFactor.enabled) {
        // Generate 2FA challenge
        const challenge = await this.generateTwoFactorChallenge(user.id);
        return {
          success: true,
          requires2FA: true,
          challengeId: challenge.id,
          message: '2FA required'
        };
      }

      // Generate tokens
      const tokens = await this.generateUserTokens(user);

      // Record successful login
      await this.recordSuccessfulLogin(user.id);

      return {
        success: true,
        tokens,
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        }
      };
    } catch (error) {
      console.error('User login failed:', error);
      throw new Error('Login failed');
    }
  }

  // Verify 2FA token
  async verifyTwoFactor(userId, challengeId, token) {
    try {
      // Get challenge
      const challenge = await this.db.two_factor_challenges.findById(challengeId);
      if (!challenge || challenge.user_id !== userId) {
        throw new Error('Invalid challenge');
      }

      // Check if expired
      if (challenge.expires_at < new Date()) {
        throw new Error('Challenge expired');
      }

      // Verify token
      const twoFactor = await this.db.two_factor.findByUserId(userId);
      const verified = speakeasy.totp.verify({
        secret: twoFactor.secret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (!verified) {
        throw new Error('Invalid 2FA token');
      }

      // Delete challenge
      await this.db.two_factor_challenges.delete(challengeId);

      // Get user
      const user = await this.db.users.findById(userId);

      // Generate tokens
      const tokens = await this.generateUserTokens(user);

      return {
        success: true,
        tokens,
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        }
      };
    } catch (error) {
      console.error('2FA verification failed:', error);
      throw new Error('2FA verification failed');
    }
  }

  // Enable 2FA for user
  async enableTwoFactor(userId) {
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: 'Vilokanam-view',
        issuer: 'Vilokanam-view Platform'
      });

      // Create 2FA record
      await this.db.two_factor.create({
        id: uuidv4(),
        user_id: userId,
        secret: secret.base32,
        enabled: false,
        created_at: new Date()
      });

      // Generate QR code
      const qrCode = await QRCode.toDataURL(secret.otpauth_url);

      return {
        success: true,
        secret: secret.base32,
        qrCode: qrCode
      };
    } catch (error) {
      console.error('Enable 2FA failed:', error);
      throw new Error('Failed to enable 2FA');
    }
  }

  // Verify 2FA setup
  async verifyTwoFactorSetup(userId, token) {
    try {
      // Get 2FA record
      const twoFactor = await this.db.two_factor.findByUserId(userId);
      if (!twoFactor) {
        throw new Error('2FA not initialized');
      }

      // Verify token
      const verified = speakeasy.totp.verify({
        secret: twoFactor.secret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (!verified) {
        throw new Error('Invalid token');
      }

      // Enable 2FA
      await this.db.two_factor.update(userId, { enabled: true });

      return {
        success: true,
        message: '2FA enabled successfully'
      };
    } catch (error) {
      console.error('Verify 2FA setup failed:', error);
      throw new Error('Failed to verify 2FA setup');
    }
  }

  // Generate secure JWT tokens
  async generateUserTokens(user) {
    try {
      // Generate access token
      const accessToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          tokenId: uuidv4()
        },
        this.jwtSecret,
        { expiresIn: this.jwtExpiry }
      );

      // Generate refresh token
      const refreshToken = jwt.sign(
        {
          userId: user.id,
          tokenId: uuidv4()
        },
        this.jwtSecret,
        { expiresIn: this.refreshTokenExpiry }
      );

      // Store refresh token
      await this.db.refresh_tokens.create({
        id: uuidv4(),
        user_id: user.id,
        token: refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        created_at: new Date()
      });

      return {
        accessToken,
        refreshToken
      };
    } catch (error) {
      console.error('Generate tokens failed:', error);
      throw new Error('Failed to generate tokens');
    }
  }

  // Refresh access token
  async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.jwtSecret);
      
      // Check if token exists in database
      const storedToken = await this.db.refresh_tokens.findByToken(refreshToken);
      if (!storedToken || storedToken.expires_at < new Date()) {
        throw new Error('Invalid refresh token');
      }

      // Get user
      const user = await this.db.users.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new tokens
      const tokens = await this.generateUserTokens(user);

      // Delete old refresh token
      await this.db.refresh_tokens.delete(storedToken.id);

      return tokens;
    } catch (error) {
      console.error('Refresh token failed:', error);
      throw new Error('Invalid refresh token');
    }
  }

  // Logout user
  async logoutUser(refreshToken) {
    try {
      // Delete refresh token
      const storedToken = await this.db.refresh_tokens.findByToken(refreshToken);
      if (storedToken) {
        await this.db.refresh_tokens.delete(storedToken.id);
      }

      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      console.error('Logout failed:', error);
      return {
        success: false,
        error: 'Logout failed'
      };
    }
  }

  // Validate user data
  validateUserData(userData) {
    if (!userData.email || !userData.password || !userData.username) {
      throw new Error('Email, password, and username are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      throw new Error('Invalid email format');
    }

    // Validate password strength
    if (userData.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Check for common weak passwords
    const weakPasswords = ['password', '12345678', 'qwertyui'];
    if (weakPasswords.includes(userData.password.toLowerCase())) {
      throw new Error('Password is too weak');
    }
  }

  // Generate secure token
  generateSecureToken(length = 32) {
    return require('crypto').randomBytes(length).toString('hex');
  }

  // Check account lockout status
  async checkAccountLockout(userId) {
    try {
      const failedAttempts = await this.redisClient.get(`failed_login:${userId}`);
      const lockoutTime = await this.redisClient.get(`lockout_time:${userId}`);

      if (lockoutTime && new Date(lockoutTime) > new Date()) {
        const remainingTime = Math.ceil(
          (new Date(lockoutTime) - new Date()) / (1000 * 60)
        );
        return {
          isLocked: true,
          unlockTime: remainingTime
        };
      }

      const attempts = failedAttempts ? parseInt(failedAttempts) : 0;
      if (attempts >= 5) {
        // Lock account for 30 minutes
        const unlockTime = new Date(Date.now() + 30 * 60 * 1000);
        await this.redisClient.setex(
          `lockout_time:${userId}`,
          30 * 60,
          unlockTime.toISOString()
        );
        await this.redisClient.del(`failed_login:${userId}`);

        return {
          isLocked: true,
          unlockTime: 30
        };
      }

      return {
        isLocked: false
      };
    } catch (error) {
      console.error('Check account lockout failed:', error);
      return {
        isLocked: false
      };
    }
  }

  // Record failed login attempt
  async recordFailedLoginAttempt(userId) {
    try {
      const key = `failed_login:${userId}`;
      const attempts = await this.redisClient.incr(key);
      await this.redisClient.expire(key, 60 * 60); // 1 hour expiry
      return attempts;
    } catch (error) {
      console.error('Record failed login attempt failed:', error);
    }
  }

  // Record successful login
  async recordSuccessfulLogin(userId) {
    try {
      // Clear failed attempts
      await this.redisClient.del(`failed_login:${userId}`);
      await this.redisClient.del(`lockout_time:${userId}`);

      // Log successful login
      await this.db.login_logs.create({
        id: uuidv4(),
        user_id: userId,
        ip_address: '', // Would be captured from request
        user_agent: '', // Would be captured from request
        success: true,
        created_at: new Date()
      });
    } catch (error) {
      console.error('Record successful login failed:', error);
    }
  }

  // Generate 2FA challenge
  async generateTwoFactorChallenge(userId) {
    try {
      const challenge = {
        id: uuidv4(),
        user_id: userId,
        expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        created_at: new Date()
      };

      await this.db.two_factor_challenges.create(challenge);

      return challenge;
    } catch (error) {
      console.error('Generate 2FA challenge failed:', error);
      throw new Error('Failed to generate 2FA challenge');
    }
  }

  // Send verification email
  async sendVerificationEmail(email, token) {
    // Implementation would integrate with email service
    console.log(`Sending verification email to ${email} with token ${token}`);
  }
}

export default EnhancedAuthService;
```

## Data Security Implementation

### Data Encryption and Protection

#### Implementation
```javascript
// services/security/data-protection.js
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { createCipheriv, createDecipheriv } from 'crypto';

class DataProtectionService {
  constructor() {
    this.encryptionKey = process.env.DATA_ENCRYPTION_KEY;
    this.ivLength = 16;
  }

  // Encrypt sensitive data
  encryptData(data) {
    try {
      if (!data) return null;

      const iv = crypto.randomBytes(this.ivLength);
      const cipher = createCipheriv(
        'aes-256-gcm',
        Buffer.from(this.encryptionKey, 'hex'),
        iv
      );

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      console.error('Data encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // Decrypt sensitive data
  decryptData(encryptedObject) {
    try {
      if (!encryptedObject) return null;

      const { encryptedData, iv, authTag } = encryptedObject;

      const decipher = createDecipheriv(
        'aes-256-gcm',
        Buffer.from(this.encryptionKey, 'hex'),
        Buffer.from(iv, 'hex')
      );

      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Data decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Hash sensitive data for comparison
  hashData(data) {
    try {
      return crypto
        .createHash('sha256')
        .update(data)
        .digest('hex');
    } catch (error) {
      console.error('Data hashing failed:', error);
      throw new Error('Failed to hash data');
    }
  }

  // Securely store user personal information
  async storeUserPersonalInfo(userId, personalInfo) {
    try {
      // Encrypt sensitive fields
      const encryptedInfo = {
        ...personalInfo,
        phone_number: personalInfo.phone_number 
          ? this.encryptData(personalInfo.phone_number) 
          : null,
        address: personalInfo.address 
          ? this.encryptData(personalInfo.address) 
          : null,
        date_of_birth: personalInfo.date_of_birth 
          ? this.encryptData(personalInfo.date_of_birth) 
          : null
      };

      // Store in database
      await this.db.user_personal_info.upsert({
        user_id: userId,
        ...encryptedInfo,
        updated_at: new Date()
      });

      return {
        success: true,
        message: 'Personal information stored securely'
      };
    } catch (error) {
      console.error('Store user personal info failed:', error);
      throw new Error('Failed to store personal information');
    }
  }

  // Retrieve user personal information
  async getUserPersonalInfo(userId) {
    try {
      // Get encrypted data from database
      const encryptedInfo = await this.db.user_personal_info.findByUserId(userId);
      if (!encryptedInfo) {
        return null;
      }

      // Decrypt sensitive fields
      const personalInfo = {
        ...encryptedInfo,
        phone_number: encryptedInfo.phone_number 
          ? this.decryptData(encryptedInfo.phone_number) 
          : null,
        address: encryptedInfo.address 
          ? this.decryptData(encryptedInfo.address) 
          : null,
        date_of_birth: encryptedInfo.date_of_birth 
          ? this.decryptData(encryptedInfo.date_of_birth) 
          : null
      };

      // Remove internal fields
      delete personalInfo.id;
      delete personalInfo.user_id;
      delete personalInfo.created_at;
      delete personalInfo.updated_at;

      return personalInfo;
    } catch (error) {
      console.error('Get user personal info failed:', error);
      throw new Error('Failed to retrieve personal information');
    }
  }

  // Securely delete user data
  async deleteUserPersonalInfo(userId) {
    try {
      // Overwrite sensitive data with random values before deletion
      await this.db.user_personal_info.update(userId, {
        phone_number: this.encryptData(this.generateRandomString(20)),
        address: this.encryptData(this.generateRandomString(100)),
        date_of_birth: this.encryptData(this.generateRandomString(10)),
        updated_at: new Date()
      });

      // Actually delete the record
      await this.db.user_personal_info.deleteByUserId(userId);

      return {
        success: true,
        message: 'Personal information deleted securely'
      };
    } catch (error) {
      console.error('Delete user personal info failed:', error);
      throw new Error('Failed to delete personal information');
    }
  }

  // Generate random string for secure deletion
  generateRandomString(length) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Mask sensitive data for display
  maskSensitiveData(data, field) {
    if (!data) return data;

    switch (field) {
      case 'email':
        const [name, domain] = data.split('@');
        return `${name.charAt(0)}${'*'.repeat(Math.max(0, name.length - 2))}${name.slice(-1)}@${domain}`;
      
      case 'phone':
        return `${data.substring(0, 3)}-${'*'.repeat(3)}-${data.substring(7)}`;
      
      case 'credit_card':
        return `****-****-****-${data.substring(data.length - 4)}`;
      
      default:
        return data;
    }
  }

  // Validate data integrity
  validateDataIntegrity(originalData, hash) {
    try {
      const calculatedHash = this.hashData(JSON.stringify(originalData));
      return calculatedHash === hash;
    } catch (error) {
      console.error('Data integrity validation failed:', error);
      return false;
    }
  }

  // Create data backup with encryption
  async createEncryptedBackup(data) {
    try {
      // Serialize data
      const serializedData = JSON.stringify(data);
      
      // Encrypt backup
      const encryptedBackup = this.encryptData(serializedData);
      
      // Create backup record
      const backup = await this.db.backups.create({
        id: uuidv4(),
        data: encryptedBackup,
        created_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });

      return backup;
    } catch (error) {
      console.error('Create encrypted backup failed:', error);
      throw new Error('Failed to create encrypted backup');
    }
  }

  // Restore data from encrypted backup
  async restoreFromBackup(backupId) {
    try {
      // Get backup
      const backup = await this.db.backups.findById(backupId);
      if (!backup) {
        throw new Error('Backup not found');
      }

      // Check if expired
      if (backup.expires_at < new Date()) {
        throw new Error('Backup expired');
      }

      // Decrypt data
      const decryptedData = this.decryptData(backup.data);
      const restoredData = JSON.parse(decryptedData);

      return restoredData;
    } catch (error) {
      console.error('Restore from backup failed:', error);
      throw new Error('Failed to restore from backup');
    }
  }
}

export default DataProtectionService;
```

## API Security Implementation

### Secure API Endpoints

#### Implementation
```javascript
// middleware/security/api-security.js
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import csrf from 'csurf';
import { body, validationResult } from 'express-validator';

class APISecurity {
  constructor() {
    this.rateLimiter = this.createRateLimiter();
  }

  // Create rate limiter
  createRateLimiter(options = {}) {
    const {
      windowMs = 15 * 60 * 1000, // 15 minutes
      max = 100, // limit each IP to 100 requests per windowMs
      message = 'Too many requests from this IP, please try again later.'
    } = options;

    return rateLimit({
      windowMs,
      max,
      message,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise IP
        return req.user ? req.user.userId : req.ip;
      },
      skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/ready';
      }
    });
  }

  // Helmet middleware for security headers
  getHelmetMiddleware() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://*.vilokanam-view.com"],
          fontSrc: ["'self'", "https:", "data:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'", "https:"],
          frameSrc: ["'none'"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      referrerPolicy: { policy: 'no-referrer' },
      xssFilter: true,
      noSniff: true,
      ieNoOpen: true,
      hidePoweredBy: true
    });
  }

  // CORS configuration
  getCORSMiddleware() {
    return cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://vilokanam-view.com'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
      exposedHeaders: ['X-CSRF-Token']
    });
  }

  // CSRF protection
  getCSRFMiddleware() {
    return csrf({
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      }
    });
  }

  // Input validation middleware
  validateInput(validations) {
    return [
      ...validations,
      (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array()
          });
        }
        next();
      }
    ];
  }

  // SQL injection prevention
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    // Remove potentially dangerous characters
    return input
      .replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, '')
      .trim();
  }

  // XSS prevention
  sanitizeOutput(output) {
    if (typeof output !== 'string') return output;
    
    // Basic XSS prevention
    return output
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  // API key authentication
  async authenticateAPIKey(req, res, next) {
    try {
      const apiKey = req.headers['x-api-key'] || req.query.api_key;
      
      if (!apiKey) {
        return res.status(401).json({
          success: false,
          error: 'API key required'
        });
      }

      // Validate API key
      const keyRecord = await this.db.api_keys.findByKey(apiKey);
      if (!keyRecord || keyRecord.expires_at < new Date()) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired API key'
        });
      }

      // Check permissions
      if (keyRecord.permissions && !keyRecord.permissions.includes(req.method)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      // Rate limiting for API keys
      const rateLimitKey = `api_key:${apiKey}`;
      const current = await this.redisClient.incr(rateLimitKey);
      
      if (current === 1) {
        await this.redisClient.expire(rateLimitKey, 3600); // 1 hour
      }

      if (current > (keyRecord.rate_limit || 1000)) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded'
        });
      }

      req.apiKey = keyRecord;
      next();
    } catch (error) {
      console.error('API key authentication failed:', error);
      res.status(500).json({
        success: false,
        error: 'Authentication failed'
      });
    }
  }

  // Request logging with security context
  securityLogger(req, res, next) {
    // Log security-relevant information
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.userId,
      apiKeyId: req.apiKey?.id,
      requestId: req.headers['x-request-id'],
      statusCode: res.statusCode
    };

    // Log to security log
    console.log('SECURITY_LOG:', JSON.stringify(logEntry));

    next();
  }

  // Security headers for responses
  addSecurityHeaders(req, res, next) {
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    next();
  }

  // Content security policy
  contentSecurityPolicy(req, res, next) {
    // Dynamic CSP based on request
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://*.vilokanam-view.com",
      "style-src 'self' 'unsafe-inline' https://*.vilokanam-view.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.vilokanam-view.com",
      "font-src 'self' https: data:",
      "object-src 'none'",
      "media-src 'self' https:",
      "frame-src 'none'",
      "child-src 'none'",
      "form-action 'self'",
      "base-uri 'self'"
    ].join('; ');

    res.setHeader('Content-Security-Policy', csp);
    next();
  }
}

export default APISecurity;
```

## Network Security Implementation

### DDoS Protection and Firewall

#### Implementation
```javascript
// services/security/network-security.js
import cloudflare from 'cloudflare';
import iptables from 'iptables';

class NetworkSecurity {
  constructor(config) {
    this.cloudflare = cloudflare({
      email: config.cloudflare.email,
      key: config.cloudflare.apiKey,
      zoneId: config.cloudflare.zoneId
    });
    
    this.rateLimits = config.rateLimits || {
      global: 1000,
      ip: 100,
      userAgent: 50
    };
  }

  // Configure Cloudflare security settings
  async configureCloudflareSecurity() {
    try {
      // Enable WAF
      await this.cloudflare.zones.settings.edit(this.cloudflare.zoneId, 'waf', {
        value: 'on'
      });

      // Enable security level
      await this.cloudflare.zones.settings.edit(this.cloudflare.zoneId, 'security_level', {
        value: 'high'
      });

      // Enable automatic HTTPS rewrites
      await this.cloudflare.zones.settings.edit(this.cloudflare.zoneId, 'automatic_https_rewrites', {
        value: 'on'
      });

      // Enable HTTP/2
      await this.cloudflare.zones.settings.edit(this.cloudflare.zoneId, 'http2', {
        value: 'on'
      });

      // Configure rate limiting rules
      await this.configureRateLimiting();

      console.log('Cloudflare security configured successfully');
    } catch (error) {
      console.error('Cloudflare security configuration failed:', error);
      throw new Error('Failed to configure Cloudflare security');
    }
  }

  // Configure rate limiting
  async configureRateLimiting() {
    try {
      // Create rate limiting rules
      const rules = [
        {
          description: 'API rate limiting',
          urls: ['/api/*'],
          rate_limit: this.rateLimits.global,
          window: 60,
          bypass_ips: []
        },
        {
          description: 'Login rate limiting',
          urls: ['/api/auth/login'],
          rate_limit: 10,
          window: 60,
          bypass_ips: []
        },
        {
          description: 'Registration rate limiting',
          urls: ['/api/auth/register'],
          rate_limit: 5,
          window: 3600,
          bypass_ips: []
        }
      ];

      // Apply rules to Cloudflare
      for (const rule of rules) {
        await this.cloudflare.zones.firewall.rules.create({
          zone_id: this.cloudflare.zoneId,
          description: rule.description,
          filter: {
            expression: `http.request.uri.path matches "${rule.urls.join('|')}"`
          },
          action: 'challenge',
          rate_limit: {
            characteristics: ['ip.src'],
            period: rule.window,
            requests_per_period: rule.rate_limit,
            mitigation_timeout: 60
          }
        });
      }

      console.log('Rate limiting configured successfully');
    } catch (error) {
      console.error('Rate limiting configuration failed:', error);
    }
  }

  // Block malicious IPs
  async blockMaliciousIP(ipAddress, reason = 'malicious activity') {
    try {
      // Add to Cloudflare firewall
      await this.cloudflare.zones.firewall.rules.create({
        zone_id: this.cloudflare.zoneId,
        description: `Blocked: ${reason}`,
        filter: {
          expression: `ip.src == ${ipAddress}`
        },
        action: 'block'
      });

      // Add to local iptables (if running on Linux)
      if (process.platform === 'linux') {
        await iptables.append({
          table: 'filter',
          chain: 'INPUT',
          rule: `-s ${ipAddress} -j DROP`,
          comment: `Blocked: ${reason}`
        });
      }

      // Log the block
      await this.db.security_logs.create({
        id: uuidv4(),
        event_type: 'ip_blocked',
        ip_address: ipAddress,
        reason: reason,
        created_at: new Date()
      });

      console.log(`Blocked IP address: ${ipAddress} (${reason})`);
    } catch (error) {
      console.error('Block malicious IP failed:', error);
      throw new Error('Failed to block IP address');
    }
  }

  // Unblock IP address
  async unblockIP(ipAddress) {
    try {
      // Remove from Cloudflare firewall
      const rules = await this.cloudflare.zones.firewall.rules.list({
        zone_id: this.cloudflare.zoneId
      });

      const rule = rules.result.find(r => 
        r.filter.expression.includes(`ip.src == ${ipAddress}`)
      );

      if (rule) {
        await this.cloudflare.zones.firewall.rules.delete({
          zone_id: this.cloudflare.zoneId,
          id: rule.id
        });
      }

      // Remove from local iptables
      if (process.platform === 'linux') {
        await iptables.delete({
          table: 'filter',
          chain: 'INPUT',
          rule: `-s ${ipAddress} -j DROP`
        });
      }

      console.log(`Unblocked IP address: ${ipAddress}`);
    } catch (error) {
      console.error('Unblock IP failed:', error);
      throw new Error('Failed to unblock IP address');
    }
  }

  // Monitor for suspicious activity
  async monitorSuspiciousActivity() {
    try {
      // Get recent security logs
      const recentLogs = await this.db.security_logs.findRecent({
        hours: 24,
        limit: 1000
      });

      // Group by IP address
      const ipActivity = {};
      recentLogs.forEach(log => {
        if (!ipActivity[log.ip_address]) {
          ipActivity[log.ip_address] = [];
        }
        ipActivity[log.ip_address].push(log);
      });

      // Check for suspicious patterns
      for (const [ip, activities] of Object.entries(ipActivity)) {
        // Check for high frequency of failed logins
        const failedLogins = activities.filter(a => 
          a.event_type === 'failed_login'
        ).length;

        if (failedLogins > 10) {
          await this.blockMaliciousIP(ip, 'excessive failed login attempts');
          continue;
        }

        // Check for multiple blocked requests
        const blockedRequests = activities.filter(a => 
          a.event_type === 'request_blocked'
        ).length;

        if (blockedRequests > 50) {
          await this.blockMaliciousIP(ip, 'excessive blocked requests');
          continue;
        }
      }

      console.log('Suspicious activity monitoring completed');
    } catch (error) {
      console.error('Monitor suspicious activity failed:', error);
    }
  }

  // Configure firewall rules
  async configureFirewall() {
    try {
      // Allow only necessary ports
      const allowedPorts = [22, 80, 443, 9944]; // SSH, HTTP, HTTPS, Polkadot RPC

      // Block all other incoming connections
      if (process.platform === 'linux') {
        // Flush existing rules
        await iptables.flush({
          table: 'filter',
          chain: 'INPUT'
        });

        // Allow loopback
        await iptables.append({
          table: 'filter',
          chain: 'INPUT',
          rule: '-i lo -j ACCEPT'
        });

        // Allow established connections
        await iptables.append({
          table: 'filter',
          chain: 'INPUT',
          rule: '-m state --state ESTABLISHED,RELATED -j ACCEPT'
        });

        // Allow specific ports
        for (const port of allowedPorts) {
          await iptables.append({
            table: 'filter',
            chain: 'INPUT',
            rule: `-p tcp --dport ${port} -j ACCEPT`
          });
        }

        // Allow ICMP (ping)
        await iptables.append({
          table: 'filter',
          chain: 'INPUT',
          rule: '-p icmp -j ACCEPT'
        });

        // Log and drop everything else
        await iptables.append({
          table: 'filter',
          chain: 'INPUT',
          rule: '-j LOG --log-prefix "iptables-dropped: "'
        });

        await iptables.append({
          table: 'filter',
          chain: 'INPUT',
          rule: '-j DROP'
        });

        // Set default policies
        await iptables.policy({
          table: 'filter',
          chain: 'INPUT',
          target: 'DROP'
        });

        await iptables.policy({
          table: 'filter',
          chain: 'FORWARD',
          target: 'DROP'
        });

        await iptables.policy({
          table: 'filter',
          chain: 'OUTPUT',
          target: 'ACCEPT'
        });
      }

      console.log('Firewall configured successfully');
    } catch (error) {
      console.error('Firewall configuration failed:', error);
      throw new Error('Failed to configure firewall');
    }
  }

  // Get security statistics
  async getSecurityStats() {
    try {
      const [
        blockedIps,
        securityLogs,
        activeRules
      ] = await Promise.all([
        this.db.security_logs.countByType('ip_blocked'),
        this.db.security_logs.countRecent(24),
        this.cloudflare.zones.firewall.rules.list({
          zone_id: this.cloudflare.zoneId
        })
      ]);

      return {
        blockedIps,
        securityLogs,
        activeFirewallRules: activeRules.result.length,
        rateLimitingEnabled: true
      };
    } catch (error) {
      console.error('Get security stats failed:', error);
      return {
        blockedIps: 0,
        securityLogs: 0,
        activeFirewallRules: 0,
        rateLimitingEnabled: false
      };
    }
  }

  // Emergency security lockdown
  async emergencyLockdown() {
    try {
      // Block all non-essential traffic
      if (process.platform === 'linux') {
        // Only allow SSH and essential services
        await iptables.flush({
          table: 'filter',
          chain: 'INPUT'
        });

        await iptables.append({
          table: 'filter',
          chain: 'INPUT',
          rule: '-i lo -j ACCEPT'
        });

        await iptables.append({
          table: 'filter',
          chain: 'INPUT',
          rule: '-m state --state ESTABLISHED,RELATED -j ACCEPT'
        });

        await iptables.append({
          table: 'filter',
          chain: 'INPUT',
          rule: '-p tcp --dport 22 -j ACCEPT' // SSH only
        });

        await iptables.append({
          table: 'filter',
          chain: 'INPUT',
          rule: '-j DROP'
        });
      }

      // Enable maximum Cloudflare security
      await this.cloudflare.zones.settings.edit(this.cloudflare.zoneId, 'security_level', {
        value: 'under_attack'
      });

      console.log('Emergency lockdown activated');
    } catch (error) {
      console.error('Emergency lockdown failed:', error);
      throw new Error('Failed to activate emergency lockdown');
    }
  }

  // Restore normal operations
  async restoreNormalOperations() {
    try {
      // Restore normal firewall rules
      await this.configureFirewall();

      // Restore normal Cloudflare security
      await this.cloudflare.zones.settings.edit(this.cloudflare.zoneId, 'security_level', {
        value: 'high'
      });

      console.log('Normal operations restored');
    } catch (error) {
      console.error('Restore normal operations failed:', error);
      throw new Error('Failed to restore normal operations');
    }
  }
}

export default NetworkSecurity;
```

## Compliance and Privacy Implementation

### GDPR/CCPA Compliance

#### Implementation
```javascript
// services/security/compliance.js
import { createObjectCsvStringifier } from 'csv-writer';

class ComplianceService {
  constructor(db) {
    this.db = db;
  }

  // Generate user data report (GDPR Article 15)
  async generateUserDataReport(userId) {
    try {
      // Collect all user data
      const [
        userProfile,
        personalInfo,
        videos,
        streams,
        payments,
        comments,
        follows,
        likes,
        loginLogs
      ] = await Promise.all([
        this.db.users.findById(userId),
        this.db.user_personal_info.findByUserId(userId),
        this.db.videos.findByCreator(userId),
        this.db.streams.findByCreator(userId),
        this.db.payments.findByUser(userId),
        this.db.comments.findByAuthor(userId),
        this.db.follows.findByFollower(userId),
        this.db.video_likes.findByUser(userId),
        this.db.login_logs.findByUser(userId)
      ]);

      const userData = {
        profile: userProfile,
        personalInfo: personalInfo,
        videos: videos,
        streams: streams,
        payments: payments,
        comments: comments,
        follows: follows,
        likes: likes,
        loginLogs: loginLogs
      };

      return userData;
    } catch (error) {
      console.error('Generate user data report failed:', error);
      throw new Error('Failed to generate user data report');
    }
  }

  // Export user data in portable format (GDPR Article 20)
  async exportUserData(userId, format = 'json') {
    try {
      const userData = await this.generateUserDataReport(userId);

      switch (format.toLowerCase()) {
        case 'json':
          return {
            contentType: 'application/json',
            filename: `user-data-${userId}-${new Date().toISOString().slice(0, 10)}.json`,
            data: JSON.stringify(userData, null, 2)
          };

        case 'csv':
          return await this.exportToCSV(userData, userId);

        default:
          throw new Error('Unsupported export format');
      }
    } catch (error) {
      console.error('Export user data failed:', error);
      throw new Error('Failed to export user data');
    }
  }

  // Export to CSV format
  async exportToCSV(userData, userId) {
    try {
      // Convert nested objects to flat CSV format
      const csvData = [];

      // Add profile data
      csvData.push(['Profile Information']);
      Object.entries(userData.profile || {}).forEach(([key, value]) => {
        csvData.push([key, String(value)]);
      });
      csvData.push([]); // Empty line

      // Add personal info
      if (userData.personalInfo) {
        csvData.push(['Personal Information']);
        Object.entries(userData.personalInfo).forEach(([key, value]) => {
          csvData.push([key, String(value)]);
        });
        csvData.push([]);
      }

      // Add videos
      if (userData.videos && userData.videos.length > 0) {
        csvData.push(['Videos']);
        csvData.push(['ID', 'Title', 'Created At', 'Status']);
        userData.videos.forEach(video => {
          csvData.push([
            video.id,
            video.title,
            video.created_at,
            video.status
          ]);
        });
        csvData.push([]);
      }

      // Add payments
      if (userData.payments && userData.payments.length > 0) {
        csvData.push(['Payments']);
        csvData.push(['ID', 'Amount', 'Type', 'Created At']);
        userData.payments.forEach(payment => {
          csvData.push([
            payment.id,
            payment.amount,
            payment.payment_type,
            payment.created_at
          ]);
        });
        csvData.push([]);
      }

      // Convert to CSV string
      let csvString = '';
      csvData.forEach(row => {
        csvString += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
      });

      return {
        contentType: 'text/csv',
        filename: `user-data-${userId}-${new Date().toISOString().slice(0, 10)}.csv`,
        data: csvString
      };
    } catch (error) {
      console.error('Export to CSV failed:', error);
      throw new Error('Failed to export to CSV');
    }
  }

  // Delete user data (Right to be forgotten - GDPR Article 17)
  async deleteUserData(userId) {
    try {
      // Log deletion request
      await this.db.deletion_requests.create({
        id: uuidv4(),
        user_id: userId,
        status: 'pending',
        requested_at: new Date()
      });

      // Anonymize user data instead of complete deletion
      // (to maintain platform integrity and legal requirements)
      const user = await this.db.users.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Anonymize profile
      await this.db.users.update(userId, {
        email: `deleted-${userId}@deleted.vilokanam-view.com`,
        username: `deleted-user-${userId.substring(0, 8)}`,
        profile_image_url: null,
        bio: 'User account deleted',
        status: 'deleted',
        deleted_at: new Date()
      });

      // Delete personal information
      await this.db.user_personal_info.deleteByUserId(userId);

      // Anonymize content
      await this.db.videos.anonymizeCreator(userId);
      await this.db.streams.anonymizeCreator(userId);

      // Delete social interactions
      await Promise.all([
        this.db.comments.deleteByAuthor(userId),
        this.db.video_likes.deleteByUser(userId),
        this.db.follows.deleteByFollower(userId),
        this.db.follows.deleteByFollowing(userId)
      ]);

      // Log completion
      await this.db.deletion_requests.updateByUserId(userId, {
        status: 'completed',
        completed_at: new Date()
      });

      return {
        success: true,
        message: 'User data deleted successfully'
      };
    } catch (error) {
      console.error('Delete user data failed:', error);
      throw new Error('Failed to delete user data');
    }
  }

  // Update user consent preferences
  async updateUserConsent(userId, consentData) {
    try {
      // Validate consent data
      const validConsentTypes = [
        'marketing',
        'analytics',
        'personalization',
        'cookies'
      ];

      Object.keys(consentData).forEach(key => {
        if (!validConsentTypes.includes(key)) {
          throw new Error(`Invalid consent type: ${key}`);
        }
      });

      // Update consent preferences
      await this.db.user_consents.upsert({
        user_id: userId,
        ...consentData,
        updated_at: new Date()
      });

      // Log consent changes
      await this.db.consent_logs.create({
        id: uuidv4(),
        user_id: userId,
        consent_data: consentData,
        ip_address: '', // Would be captured from request
        user_agent: '', // Would be captured from request
        created_at: new Date()
      });

      return {
        success: true,
        message: 'Consent preferences updated'
      };
    } catch (error) {
      console.error('Update user consent failed:', error);
      throw new Error('Failed to update consent preferences');
    }
  }

  // Get user consent status
  async getUserConsent(userId) {
    try {
      const consent = await this.db.user_consents.findByUserId(userId);
      return consent || {
        marketing: false,
        analytics: false,
        personalization: false,
        cookies: false
      };
    } catch (error) {
      console.error('Get user consent failed:', error);
      return {
        marketing: false,
        analytics: false,
        personalization: false,
        cookies: false
      };
    }
  }

  // Process data breach notification (GDPR Article 33)
  async processDataBreach(breachData) {
    try {
      // Log breach
      const breachId = uuidv4();
      await this.db.data_breaches.create({
        id: breachId,
        ...breachData,
        detected_at: new Date()
      });

      // Assess impact
      const affectedUsers = await this.assessBreachImpact(breachData);

      // Notify authorities if required (GDPR > 1000 users)
      if (affectedUsers.count > 1000) {
        await this.notifyAuthorities(breachId, affectedUsers);
      }

      // Notify affected users
      await this.notifyAffectedUsers(breachId, affectedUsers);

      // Implement remediation measures
      await this.implementRemediation(breachData);

      return {
        breachId,
        affectedUsers: affectedUsers.count,
        notifiedAuthorities: affectedUsers.count > 1000
      };
    } catch (error) {
      console.error('Process data breach failed:', error);
      throw new Error('Failed to process data breach');
    }
  }

  // Assess breach impact
  async assessBreachImpact(breachData) {
    try {
      // Determine affected users based on breach type
      let affectedUsers = [];
      
      switch (breachData.type) {
        case 'user_database':
          affectedUsers = await this.db.users.findAll();
          break;
          
        case 'payment_data':
          affectedUsers = await this.db.payments.getAffectedUsers(breachData.timeframe);
          break;
          
        case 'personal_info':
          affectedUsers = await this.db.user_personal_info.getAffectedUsers(breachData.timeframe);
          break;
          
        default:
          affectedUsers = [];
      }

      return {
        count: affectedUsers.length,
        users: affectedUsers.map(user => user.id)
      };
    } catch (error) {
      console.error('Assess breach impact failed:', error);
      return { count: 0, users: [] };
    }
  }

  // Notify authorities
  async notifyAuthorities(breachId, affectedUsers) {
    try {
      // In a real implementation, this would send notifications to:
      // - GDPR supervisory authorities
      // - Relevant data protection agencies
      // - Law enforcement if required
      
      console.log(`Notifying authorities about breach ${breachId}`);
      console.log(`Affected users: ${affectedUsers.count}`);
      
      // Update breach record
      await this.db.data_breaches.update(breachId, {
        authorities_notified: true,
        notification_sent_at: new Date()
      });
    } catch (error) {
      console.error('Notify authorities failed:', error);
    }
  }

  // Notify affected users
  async notifyAffectedUsers(breachId, affectedUsers) {
    try {
      // Send notification to each affected user
      for (const userId of affectedUsers.users) {
        const user = await this.db.users.findById(userId);
        if (user && user.email) {
          // In a real implementation, this would send an email
          console.log(`Notifying user ${userId} about data breach`);
        }
      }

      // Update breach record
      await this.db.data_breaches.update(breachId, {
        users_notified: true,
        notification_sent_at: new Date()
      });
    } catch (error) {
      console.error('Notify affected users failed:', error);
    }
  }

  // Implement remediation measures
  async implementRemediation(breachData) {
    try {
      // Implement security measures based on breach type
      switch (breachData.type) {
        case 'user_database':
          // Force password resets
          await this.forcePasswordResets(breachData.affected_users);
          break;
          
        case 'payment_data':
          // Notify payment processors
          await this.notifyPaymentProcessors(breachData);
          break;
          
        case 'personal_info':
          // Enhance encryption
          await this.enhanceEncryption(breachData);
          break;
      }

      console.log('Remediation measures implemented');
    } catch (error) {
      console.error('Implement remediation failed:', error);
    }
  }

  // Generate compliance report
  async generateComplianceReport(period = '30d') {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 
        (period === '30d' ? 30 : period === '90d' ? 90 : 365));

      const [
        dataDeletions,
        consentUpdates,
        dataBreaches,
        userRequests
      ] = await Promise.all([
        this.db.deletion_requests.countByPeriod(startDate),
        this.db.consent_logs.countByPeriod(startDate),
        this.db.data_breaches.countByPeriod(startDate),
        this.db.user_requests.countByPeriod(startDate)
      ]);

      return {
        period: period,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
        metrics: {
          dataDeletions,
          consentUpdates,
          dataBreaches,
          userRequests
        }
      };
    } catch (error) {
      console.error('Generate compliance report failed:', error);
      throw new Error('Failed to generate compliance report');
    }
  }
}

export default ComplianceService;
```

## Security Monitoring and Incident Response

### Security Operations Center

#### Implementation
```javascript
// services/security/security-monitoring.js
import winston from 'winston';
import { createTransport } from 'nodemailer';

class SecurityMonitoring {
  constructor(config) {
    this.config = config;
    this.logger = this.createLogger();
    this.alertTransport = this.createAlertTransport();
  }

  // Create security logger
  createLogger() {
    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({
          filename: 'security-error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: 'security-combined.log',
          maxsize: 5242880,
          maxFiles: 5
        }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  // Create alert transport
  createAlertTransport() {
    return createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Log security event
  logSecurityEvent(eventType, details, severity = 'info') {
    const logEntry = {
      eventType,
      timestamp: new Date().toISOString(),
      severity,
      details,
      source: details.source || 'unknown'
    };

    this.logger.log(severity, eventType, logEntry);

    // Send alert for high severity events
    if (severity === 'error' || severity === 'critical') {
      this.sendSecurityAlert(logEntry);
    }

    // Store in database for analysis
    this.storeSecurityEvent(logEntry);
  }

  // Send security alert
  async sendSecurityAlert(event) {
    try {
      const alertRecipients = process.env.SECURITY_ALERT_EMAILS?.split(',') || [];
      
      if (alertRecipients.length === 0) {
        return;
      }

      const mailOptions = {
        from: process.env.SECURITY_ALERT_FROM,
        to: alertRecipients,
        subject: `Security Alert: ${event.eventType}`,
        text: `
Security Alert Notification

Event Type: ${event.eventType}
Severity: ${event.severity}
Timestamp: ${event.timestamp}
Source: ${event.source}

Details:
${JSON.stringify(event.details, null, 2)}

Please investigate this security event immediately.
        `,
        html: `
<h2>Security Alert Notification</h2>
<p><strong>Event Type:</strong> ${event.eventType}</p>
<p><strong>Severity:</strong> ${event.severity}</p>
<p><strong>Timestamp:</strong> ${event.timestamp}</p>
<p><strong>Source:</strong> ${event.source}</p>

<h3>Details:</h3>
<pre>${JSON.stringify(event.details, null, 2)}</pre>

<p>Please investigate this security event immediately.</p>
        `
      };

      await this.alertTransport.sendMail(mailOptions);
      this.logger.info('Security alert sent', { recipients: alertRecipients.length });
    } catch (error) {
      this.logger.error('Failed to send security alert', { error: error.message });
    }
  }

  // Store security event in database
  async storeSecurityEvent(event) {
    try {
      await this.db.security_events.create({
        id: uuidv4(),
        event_type: event.eventType,
        severity: event.severity,
        source: event.source,
        details: event.details,
        timestamp: new Date(event.timestamp)
      });
    } catch (error) {
      this.logger.error('Failed to store security event', { error: error.message });
    }
  }

  // Monitor for suspicious login attempts
  async monitorLoginAttempts() {
    try {
      // Get recent failed login attempts
      const failedAttempts = await this.db.login_logs.findFailedAttempts({
        hours: 1,
        threshold: 5
      });

      // Group by IP address
      const ipAttempts = {};
      failedAttempts.forEach(attempt => {
        if (!ipAttempts[attempt.ip_address]) {
          ipAttempts[attempt.ip_address] = [];
        }
        ipAttempts[attempt.ip_address].push(attempt);
      });

      // Check for suspicious patterns
      for (const [ip, attempts] of Object.entries(ipAttempts)) {
        if (attempts.length >= 10) {
          // High volume of failed attempts
          this.logSecurityEvent('brute_force_attempt', {
            ip_address: ip,
            attempt_count: attempts.length,
            users: [...new Set(attempts.map(a => a.user_id))],
            source: 'login_monitoring'
          }, 'critical');

          // Block IP temporarily
          await this.securityService.blockMaliciousIP(ip, 'brute force attack detected');
        } else if (attempts.length >= 5) {
          // Moderate volume of failed attempts
          this.logSecurityEvent('suspicious_login_activity', {
            ip_address: ip,
            attempt_count: attempts.length,
            users: [...new Set(attempts.map(a => a.user_id))],
            source: 'login_monitoring'
          }, 'warning');
        }
      }
    } catch (error) {
      this.logger.error('Login monitoring failed', { error: error.message });
    }
  }

  // Monitor for unusual API usage
  async monitorAPIUsage() {
    try {
      // Get API usage statistics
      const usageStats = await this.db.api_logs.getUsageStats({
        hours: 1
      });

      // Check for unusual patterns
      usageStats.forEach(stat => {
        if (stat.request_count > stat.average_count * 3) {
          // Unusual spike in API usage
          this.logSecurityEvent('unusual_api_usage', {
            endpoint: stat.endpoint,
            method: stat.method,
            current_count: stat.request_count,
            average_count: stat.average_count,
            user_id: stat.user_id,
            source: 'api_monitoring'
          }, 'warning');
        }
      });
    } catch (error) {
      this.logger.error('API monitoring failed', { error: error.message });
    }
  }

  // Monitor for data access patterns
  async monitorDataAccess() {
    try {
      // Get recent data access logs
      const accessLogs = await this.db.data_access_logs.findRecent({
        hours: 1
      });

      // Check for unusual access patterns
      const userAccess = {};
      accessLogs.forEach(log => {
        if (!userAccess[log.user_id]) {
          userAccess[log.user_id] = [];
        }
        userAccess[log.user_id].push(log);
      });

      // Check for excessive data access
      for (const [userId, accesses] of Object.entries(userAccess)) {
        if (accesses.length > 100) {
          // Excessive data access
          this.logSecurityEvent('excessive_data_access', {
            user_id: userId,
            access_count: accesses.length,
            data_types: [...new Set(accesses.map(a => a.data_type))],
            source: 'data_access_monitoring'
          }, 'warning');
        }
      }
    } catch (error) {
      this.logger.error('Data access monitoring failed', { error: error.message });
    }
  }

  // Generate security report
  async generateSecurityReport(period = '24h') {
    try {
      const startTime = new Date();
      if (period === '24h') {
        startTime.setHours(startTime.getHours() - 24);
      } else if (period === '7d') {
        startTime.setDate(startTime.getDate() - 7);
      } else if (period === '30d') {
        startTime.setDate(startTime.getDate() - 30);
      }

      const [
        securityEvents,
        failedLogins,
        blockedIPs,
        dataBreaches
      ] = await Promise.all([
        this.db.security_events.findByPeriod(startTime),
        this.db.login_logs.findFailedAttempts({ 
          startDate: startTime,
          threshold: 1 
        }),
        this.db.security_logs.countByTypeAndPeriod('ip_blocked', startTime),
        this.db.data_breaches.findByPeriod(startTime)
      ]);

      const report = {
        period: period,
        startTime: startTime.toISOString(),
        endTime: new Date().toISOString(),
        summary: {
          totalEvents: securityEvents.length,
          failedLogins: failedLogins.length,
          blockedIPs: blockedIPs,
          dataBreaches: dataBreaches.length
        },
        events: securityEvents,
        topEvents: this.getTopEvents(securityEvents),
        recommendations: this.generateRecommendations(securityEvents)
      };

      return report;
    } catch (error) {
      this.logger.error('Generate security report failed', { error: error.message });
      throw new Error('Failed to generate security report');
    }
  }

  // Get top security events
  getTopEvents(events) {
    const eventCounts = {};
    events.forEach(event => {
      const key = `${event.event_type}:${event.severity}`;
      eventCounts[key] = (eventCounts[key] || 0) + 1;
    });

    return Object.entries(eventCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([key, count]) => {
        const [eventType, severity] = key.split(':');
        return { eventType, severity, count };
      });
  }

  // Generate security recommendations
  generateRecommendations(events) {
    const recommendations = [];

    // Check for common security issues
    const bruteForceEvents = events.filter(e => 
      e.event_type === 'brute_force_attempt'
    );

    if (bruteForceEvents.length > 0) {
      recommendations.push({
        priority: 'high',
        description: 'Implement stronger brute force protection',
        actions: [
          'Reduce login attempt limits',
          'Implement CAPTCHA for suspicious activity',
          'Consider IP-based rate limiting'
        ]
      });
    }

    const dataAccessEvents = events.filter(e => 
      e.event_type === 'excessive_data_access'
    );

    if (dataAccessEvents.length > 0) {
      recommendations.push({
        priority: 'medium',
        description: 'Review data access controls',
        actions: [
          'Implement role-based access control',
          'Add data access logging',
          'Review user permissions'
        ]
      });
    }

    return recommendations;
  }

  // Start security monitoring
  startMonitoring() {
    // Start periodic monitoring tasks
    setInterval(() => {
      this.monitorLoginAttempts();
      this.monitorAPIUsage();
      this.monitorDataAccess();
    }, 60000); // Run every minute

    // Generate daily security reports
    setInterval(() => {
      this.generateSecurityReport('24h');
    }, 24 * 60 * 60 * 1000); // Run daily

    this.logger.info('Security monitoring started');
  }
}

export default SecurityMonitoring;
```

## Implementation Roadmap

### Phase 1: Authentication and Data Security (Weeks 1-2)

#### Week 1: Enhanced Authentication
- Implement secure authentication service
- Add 2FA support
- Implement account lockout mechanisms
- Add secure token management

#### Week 2: Data Protection
- Implement data encryption service
- Add personal information protection
- Implement secure data deletion
- Add data integrity validation

### Phase 2: API and Network Security (Weeks 3-4)

#### Week 3: API Security
- Implement rate limiting
- Add security headers
- Implement input validation
- Add API key authentication

#### Week 4: Network Security
- Configure Cloudflare security
- Implement firewall rules
- Add DDoS protection
- Implement IP blocking mechanisms

### Phase 3: Compliance and Monitoring (Weeks 5-6)

#### Week 5: Compliance Implementation
- Implement GDPR/CCPA compliance
- Add user data export capabilities
- Implement right to be forgotten
- Add consent management

#### Week 6: Security Monitoring
- Implement security logging
- Add security alerting
- Implement monitoring dashboards
- Add incident response procedures

### Phase 4: Testing and Auditing (Weeks 7-8)

#### Week 7: Security Testing
- Conduct penetration testing
- Perform vulnerability scanning
- Test authentication security
- Validate data protection

#### Week 8: Compliance Auditing
- Conduct compliance audit
- Implement audit logging
- Test data export functionality
- Validate security controls

## Security Testing Strategy

### Penetration Testing
- External network penetration testing
- Web application security testing
- API security testing
- Social engineering testing

### Vulnerability Scanning
- Automated vulnerability scanning
- Dependency security scanning
- Container security scanning
- Configuration security scanning

### Security Code Review
- Static code analysis
- Dynamic code analysis
- Security pattern review
- Third-party library review

### Compliance Testing
- GDPR compliance verification
- CCPA compliance verification
- Data protection impact assessment
- Privacy policy compliance

## Monitoring and Alerting

### Security Metrics
- Failed login attempts
- Security event frequency
- Data access patterns
- API usage anomalies
- Compliance metrics

### Alert Thresholds
- Critical: Immediate notification
- High: Notification within 15 minutes
- Medium: Notification within 1 hour
- Low: Daily summary

### Incident Response
- Incident classification
- Response procedures
- Communication protocols
- Post-incident analysis

## Success Metrics

### Technical Security Metrics
- Zero successful unauthorized access attempts
- <0.1% false positive security alerts
- 100% encryption of sensitive data
- <5 minutes average incident response time

### Compliance Metrics
- 100% GDPR/CCPA compliance
- Zero data breach incidents
- 100% audit trail completeness
- <24 hours average data export time

### Business Metrics
- User trust and confidence
- Regulatory compliance status
- Security incident reduction
- Operational cost optimization

This plan provides a comprehensive roadmap for implementing security measures and data protection for the Vilokanam-view platform, ensuring the highest standards of security while maintaining compliance with relevant regulations.