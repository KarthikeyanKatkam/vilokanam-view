# User Authentication and Profile Management Plan

## Overview

This document outlines the plan for implementing a comprehensive user authentication and profile management system for the Vilokanam-view platform. The system will leverage Polkadot wallet integration for secure, decentralized authentication while providing rich profile management features for both creators and viewers.

## Current State Analysis

The platform currently has:
- Basic frontend applications (viewer and creator dashboards)
- Blockchain SDK with wallet connection capabilities
- Missing comprehensive user authentication system
- No profile management features
- No user role differentiation (creator vs viewer)

## Authentication Requirements

### Core Features
1. Wallet-based authentication using Polkadot.js Extension
2. Session management with secure tokens
3. User role management (viewer, creator, admin)
4. Profile creation and management
5. Account verification and security

### Technical Requirements
1. Secure wallet integration
2. Session persistence across devices
3. Role-based access control
4. Profile data storage and retrieval
5. GDPR/CCPA compliance

## System Architecture

### Component Overview

#### 1. Authentication Layer
- Wallet connection service
- Session management service
- Token generation and validation
- Role-based access control

#### 2. User Management
- Profile creation and updating
- Avatar and banner management
- Preference settings
- Notification controls

#### 3. Security Services
- Account verification
- Two-factor authentication (2FA)
- Session monitoring
- Security logging

### Data Flow

1. **User Authentication**
   - User connects Polkadot wallet
   - Signature verification
   - Session token generation
   - User data retrieval/creation

2. **Profile Management**
   - Profile data updates
   - Avatar/banner uploads
   - Preference settings
   - Notification configuration

3. **Session Management**
   - Token validation
   - Session refresh
   - Role verification
   - Access control enforcement

## Wallet Integration Implementation

### Wallet Connection Service

#### Core Implementation
```javascript
// services/wallet-service.js
import { web3Enable, web3FromAddress, web3Accounts } from '@polkadot/extension-dapp';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

class WalletService {
  constructor(api) {
    this.api = api;
    this.extensionEnabled = false;
  }

  // Enable wallet extension
  async enableExtension() {
    try {
      await cryptoWaitReady();
      const extensions = await web3Enable('Vilokanam-view');
      this.extensionEnabled = extensions.length > 0;
      return this.extensionEnabled;
    } catch (error) {
      console.error('Failed to enable wallet extension:', error);
      throw new Error('Wallet extension not available');
    }
  }

  // Get connected accounts
  async getAccounts() {
    if (!this.extensionEnabled) {
      await this.enableExtension();
    }
    
    try {
      const accounts = await web3Accounts();
      return accounts.map(account => ({
        address: account.address,
        meta: account.meta
      }));
    } catch (error) {
      console.error('Failed to get accounts:', error);
      throw new Error('Failed to retrieve accounts');
    }
  }

  // Sign authentication challenge
  async signChallenge(address, challenge) {
    try {
      const injector = await web3FromAddress(address);
      const signature = await injector.signer.signRaw({
        address: address,
        data: u8aToHex(new TextEncoder().encode(challenge)),
        type: 'bytes'
      });
      
      return signature.signature;
    } catch (error) {
      console.error('Failed to sign challenge:', error);
      throw new Error('Failed to authenticate with wallet');
    }
  }

  // Verify signature
  async verifySignature(address, challenge, signature) {
    try {
      const isValid = this.api.registry.createType('Bool', 
        this.api.call.signature.verify(address, challenge, signature)
      );
      return isValid.valueOf();
    } catch (error) {
      console.error('Failed to verify signature:', error);
      return false;
    }
  }
}

export default WalletService;
```

### Authentication Service

#### Core Implementation
```javascript
// services/auth-service.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import WalletService from './wallet-service';

class AuthService {
  constructor(db, redis, api) {
    this.db = db;
    this.redis = redis;
    this.walletService = new WalletService(api);
    this.jwtSecret = process.env.JWT_SECRET || 'vilokanam-secret-key';
    this.jwtExpiry = process.env.JWT_EXPIRY || '24h';
  }

  // Authenticate user with wallet
  async authenticateWithWallet(address) {
    try {
      // Generate challenge
      const challenge = `Vilokanam-view Authentication - ${new Date().toISOString()}`;
      
      // Store challenge temporarily
      await this.redis.setex(`auth:challenge:${address}`, 300, challenge);
      
      return {
        success: true,
        challenge: challenge,
        message: 'Please sign the challenge with your wallet'
      };
    } catch (error) {
      console.error('Authentication challenge generation failed:', error);
      throw new Error('Authentication service unavailable');
    }
  }

  // Verify wallet signature and create session
  async verifyWalletSignature(address, signature) {
    try {
      // Retrieve challenge
      const challenge = await this.redis.get(`auth:challenge:${address}`);
      if (!challenge) {
        throw new Error('Authentication challenge expired');
      }
      
      // Verify signature
      const isValid = await this.walletService.verifySignature(address, challenge, signature);
      if (!isValid) {
        throw new Error('Invalid signature');
      }
      
      // Get or create user
      let user = await this.db.users.findByAddress(address);
      if (!user) {
        user = await this.createUser({
          account_id: address,
          username: `user_${address.substring(0, 8)}`,
          is_creator: false
        });
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          address: user.account_id,
          role: user.is_creator ? 'creator' : 'viewer'
        },
        this.jwtSecret,
        { expiresIn: this.jwtExpiry }
      );
      
      // Store session
      const sessionId = uuidv4();
      await this.redis.setex(
        `session:${sessionId}`, 
        86400, // 24 hours
        JSON.stringify({
          userId: user.id,
          address: user.account_id,
          role: user.is_creator ? 'creator' : 'viewer',
          createdAt: new Date().toISOString()
        })
      );
      
      // Clean up challenge
      await this.redis.del(`auth:challenge:${address}`);
      
      return {
        success: true,
        token: token,
        sessionId: sessionId,
        user: {
          id: user.id,
          address: user.account_id,
          username: user.username,
          is_creator: user.is_creator,
          profile_image_url: user.profile_image_url,
          bio: user.bio
        }
      };
    } catch (error) {
      console.error('Wallet signature verification failed:', error);
      throw new Error('Authentication failed');
    }
  }

  // Create new user
  async createUser(userData) {
    try {
      // Check if user already exists
      const existingUser = await this.db.users.findByAddress(userData.account_id);
      if (existingUser) {
        return existingUser;
      }
      
      // Create user record
      const user = await this.db.users.create({
        id: uuidv4(),
        account_id: userData.account_id,
        username: userData.username,
        email: userData.email || null,
        profile_image_url: userData.profile_image_url || null,
        bio: userData.bio || null,
        is_creator: userData.is_creator || false,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      // Create earnings record for creators
      if (userData.is_creator) {
        await this.db.creator_earnings.create({
          id: uuidv4(),
          creator_id: user.id,
          total_earnings: 0,
          pending_payout: 0,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
      
      return user;
    } catch (error) {
      console.error('User creation failed:', error);
      throw new Error('Failed to create user account');
    }
  }

  // Validate session token
  async validateSession(token) {
    try {
      // Verify JWT
      const decoded = jwt.verify(token, this.jwtSecret);
      
      // Check if session exists in Redis
      const sessionData = await this.redis.get(`session:${decoded.sessionId}`);
      if (!sessionData) {
        throw new Error('Session expired');
      }
      
      const session = JSON.parse(sessionData);
      
      return {
        valid: true,
        user: {
          id: session.userId,
          address: session.address,
          role: session.role
        }
      };
    } catch (error) {
      console.error('Session validation failed:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  // Refresh session
  async refreshSession(oldToken) {
    try {
      const decoded = jwt.verify(oldToken, this.jwtSecret);
      
      // Get session data
      const sessionData = await this.redis.get(`session:${decoded.sessionId}`);
      if (!sessionData) {
        throw new Error('Session not found');
      }
      
      const session = JSON.parse(sessionData);
      
      // Generate new token
      const newToken = jwt.sign(
        { 
          userId: session.userId, 
          address: session.address,
          role: session.role,
          sessionId: decoded.sessionId
        },
        this.jwtSecret,
        { expiresIn: this.jwtExpiry }
      );
      
      // Extend session expiry
      await this.redis.expire(`session:${decoded.sessionId}`, 86400);
      
      return {
        success: true,
        token: newToken
      };
    } catch (error) {
      console.error('Session refresh failed:', error);
      throw new Error('Failed to refresh session');
    }
  }

  // Logout user
  async logout(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      
      // Remove session from Redis
      await this.redis.del(`session:${decoded.sessionId}`);
      
      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      console.error('Logout failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default AuthService;
```

## Profile Management Implementation

### User Profile Service

#### Core Implementation
```javascript
// services/profile-service.js
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import s3 from '../utils/s3-client';

class ProfileService {
  constructor(db, redis) {
    this.db = db;
    this.redis = redis;
  }

  // Get user profile
  async getProfile(userId) {
    try {
      // Try cache first
      const cachedProfile = await this.redis.get(`profile:${userId}`);
      if (cachedProfile) {
        return JSON.parse(cachedProfile);
      }
      
      // Get from database
      const user = await this.db.users.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Get creator earnings if applicable
      let earnings = null;
      if (user.is_creator) {
        earnings = await this.db.creator_earnings.findByCreatorId(userId);
      }
      
      // Get follow statistics
      const followingCount = await this.db.follows.countFollowing(userId);
      const followerCount = await this.db.follows.countFollowers(userId);
      
      const profile = {
        id: user.id,
        address: user.account_id,
        username: user.username,
        email: user.email,
        profile_image_url: user.profile_image_url,
        banner_image_url: user.banner_image_url,
        bio: user.bio,
        is_creator: user.is_creator,
        following_count: followingCount,
        follower_count: followerCount,
        created_at: user.created_at,
        earnings: earnings
      };
      
      // Cache profile for 1 hour
      await this.redis.setex(`profile:${userId}`, 3600, JSON.stringify(profile));
      
      return profile;
    } catch (error) {
      console.error('Profile retrieval failed:', error);
      throw new Error('Failed to retrieve profile');
    }
  }

  // Update user profile
  async updateProfile(userId, profileData) {
    try {
      // Validate username uniqueness
      if (profileData.username) {
        const existingUser = await this.db.users.findByUsername(profileData.username);
        if (existingUser && existingUser.id !== userId) {
          throw new Error('Username already taken');
        }
      }
      
      // Update user record
      const updatedUser = await this.db.users.update(userId, {
        username: profileData.username,
        email: profileData.email,
        bio: profileData.bio,
        updated_at: new Date()
      });
      
      // Clear cached profile
      await this.redis.del(`profile:${userId}`);
      
      return {
        id: updatedUser.id,
        address: updatedUser.account_id,
        username: updatedUser.username,
        email: updatedUser.email,
        profile_image_url: updatedUser.profile_image_url,
        bio: updatedUser.bio,
        is_creator: updatedUser.is_creator
      };
    } catch (error) {
      console.error('Profile update failed:', error);
      throw new Error('Failed to update profile');
    }
  }

  // Upload profile image
  async uploadProfileImage(userId, file) {
    try {
      // Process image
      const processedImage = await sharp(file.buffer)
        .resize(400, 400)
        .jpeg({ quality: 80 })
        .toBuffer();
      
      // Generate filename
      const filename = `profiles/${userId}/${uuidv4()}.jpg`;
      
      // Upload to S3
      const uploadResult = await s3.upload({
        Bucket: process.env.S3_BUCKET,
        Key: filename,
        Body: processedImage,
        ContentType: 'image/jpeg'
      }).promise();
      
      // Update user record
      const updatedUser = await this.db.users.update(userId, {
        profile_image_url: uploadResult.Location,
        updated_at: new Date()
      });
      
      // Clear cached profile
      await this.redis.del(`profile:${userId}`);
      
      return {
        profile_image_url: uploadResult.Location
      };
    } catch (error) {
      console.error('Profile image upload failed:', error);
      throw new Error('Failed to upload profile image');
    }
  }

  // Upload banner image
  async uploadBannerImage(userId, file) {
    try {
      // Process image
      const processedImage = await sharp(file.buffer)
        .resize(1200, 400)
        .jpeg({ quality: 80 })
        .toBuffer();
      
      // Generate filename
      const filename = `banners/${userId}/${uuidv4()}.jpg`;
      
      // Upload to S3
      const uploadResult = await s3.upload({
        Bucket: process.env.S3_BUCKET,
        Key: filename,
        Body: processedImage,
        ContentType: 'image/jpeg'
      }).promise();
      
      // Update user record
      const updatedUser = await this.db.users.update(userId, {
        banner_image_url: uploadResult.Location,
        updated_at: new Date()
      });
      
      // Clear cached profile
      await this.redis.del(`profile:${userId}`);
      
      return {
        banner_image_url: uploadResult.Location
      };
    } catch (error) {
      console.error('Banner image upload failed:', error);
      throw new Error('Failed to upload banner image');
    }
  }

  // Convert viewer to creator
  async convertToCreator(userId) {
    try {
      // Update user role
      const updatedUser = await this.db.users.update(userId, {
        is_creator: true,
        updated_at: new Date()
      });
      
      // Create earnings record
      await this.db.creator_earnings.create({
        id: uuidv4(),
        creator_id: userId,
        total_earnings: 0,
        pending_payout: 0,
        created_at: new Date(),
        updated_at: new Date()
      });
      
      // Clear cached profile
      await this.redis.del(`profile:${userId}`);
      
      return {
        id: updatedUser.id,
        is_creator: true
      };
    } catch (error) {
      console.error('Creator conversion failed:', error);
      throw new Error('Failed to convert to creator');
    }
  }

  // Get user preferences
  async getPreferences(userId) {
    try {
      const preferences = await this.db.user_preferences.findByUserId(userId);
      return preferences || {
        notifications: {
          email: true,
          push: true,
          in_app: true
        },
        privacy: {
          profile_visibility: 'public',
          show_activity: true
        },
        content: {
          autoplay_videos: true,
          show_suggestions: true
        }
      };
    } catch (error) {
      console.error('Preferences retrieval failed:', error);
      return {
        notifications: {
          email: true,
          push: true,
          in_app: true
        },
        privacy: {
          profile_visibility: 'public',
          show_activity: true
        },
        content: {
          autoplay_videos: true,
          show_suggestions: true
        }
      };
    }
  }

  // Update user preferences
  async updatePreferences(userId, preferences) {
    try {
      const existingPrefs = await this.db.user_preferences.findByUserId(userId);
      
      if (existingPrefs) {
        await this.db.user_preferences.update(userId, preferences);
      } else {
        await this.db.user_preferences.create({
          id: uuidv4(),
          user_id: userId,
          ...preferences
        });
      }
      
      // Cache preferences
      await this.redis.setex(
        `preferences:${userId}`, 
        3600, 
        JSON.stringify(preferences)
      );
      
      return preferences;
    } catch (error) {
      console.error('Preferences update failed:', error);
      throw new Error('Failed to update preferences');
    }
  }
}

export default ProfileService;
```

## Frontend Authentication Integration

### Authentication Hook

#### Implementation
```javascript
// hooks/useAuth.js
import { useState, useEffect, useContext, createContext } from 'react';
import { useRouter } from 'next/navigation';
import { web3Accounts, web3FromAddress } from '@polkadot/extension-dapp';

// Create context
const AuthContext = createContext();

// Auth provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [walletConnected, setWalletConnected] = useState(false);
  const router = useRouter();

  // Check for existing session
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      if (token) {
        const response = await fetch('/api/auth/validate', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        if (data.valid) {
          setUser(data.user);
        } else {
          localStorage.removeItem('auth-token');
        }
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    try {
      setLoading(true);
      
      // Get accounts
      const accounts = await web3Accounts();
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }
      
      const address = accounts[0].address;
      
      // Request authentication challenge
      const challengeResponse = await fetch('/api/auth/wallet/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });
      
      const { challenge } = await challengeResponse.json();
      
      // Sign challenge
      const injector = await web3FromAddress(address);
      const signature = await injector.signer.signRaw({
        address: address,
        data: challenge,
        type: 'bytes'
      });
      
      // Verify signature and create session
      const verifyResponse = await fetch('/api/auth/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          signature: signature.signature
        })
      });
      
      const data = await verifyResponse.json();
      
      if (data.success) {
        localStorage.setItem('auth-token', data.token);
        setUser(data.user);
        setWalletConnected(true);
        return { success: true, user: data.user };
      } else {
        throw new Error(data.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
      
      localStorage.removeItem('auth-token');
      setUser(null);
      setWalletConnected(false);
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Update profile
  const updateProfile = async (profileData) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });
      
      const data = await response.json();
      
      if (data.id) {
        setUser(prev => ({ ...prev, ...data }));
        return { success: true, user: data };
      } else {
        throw new Error(data.error || 'Profile update failed');
      }
    } catch (error) {
      console.error('Profile update failed:', error);
      return { success: false, error: error.message };
    }
  };

  // Convert to creator
  const convertToCreator = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch('/api/profile/convert-creator', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.id) {
        setUser(prev => ({ ...prev, is_creator: true }));
        return { success: true };
      } else {
        throw new Error(data.error || 'Conversion failed');
      }
    } catch (error) {
      console.error('Creator conversion failed:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    loading,
    walletConnected,
    connectWallet,
    logout,
    updateProfile,
    convertToCreator
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Auth hook
export function useAuth() {
  return useContext(AuthContext);
}
```

### Login Component

#### Implementation
```jsx
// components/auth/LoginForm.tsx
import { useState } from 'react';
import { useAuth } from 'hooks/useAuth';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from 'ui';

export default function LoginForm() {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const { connectWallet } = useAuth();

  const handleConnectWallet = async () => {
    setConnecting(true);
    setError('');
    
    try {
      const result = await connectWallet();
      if (!result.success) {
        setError(result.error || 'Failed to connect wallet');
      }
    } catch (err) {
      setError('Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="login-form">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Welcome to Vilokanam-view</CardTitle>
          <CardDescription>
            Connect your Polkadot wallet to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              onClick={handleConnectWallet}
              disabled={connecting}
              className="w-full"
            >
              {connecting ? (
                <>
                  <span className="animate-spin mr-2">●</span>
                  Connecting...
                </>
              ) : (
                'Connect Polkadot Wallet'
              )}
            </Button>
            
            <div className="text-center text-sm text-gray-500">
              <p>By connecting, you agree to our Terms of Service</p>
              <p>and Privacy Policy</p>
            </div>
            
            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>Don't have a Polkadot wallet?</p>
        <p>
          <a 
            href="https://polkadot.js.org/extension/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Install Polkadot.js Extension
          </a>
        </p>
      </div>
    </div>
  );
}
```

### Profile Management Component

#### Implementation
```jsx
// components/profile/ProfileManager.tsx
import { useState } from 'react';
import { useAuth } from 'hooks/useAuth';
import { Button, Input, Textarea } from 'ui';

export default function ProfileManager() {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.bio || ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await updateProfile(formData);
      if (result.success) {
        setSuccess('Profile updated successfully');
      } else {
        setError(result.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-manager">
      <h2>Profile Settings</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            Username
          </label>
          <Input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <Input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
          />
        </div>
        
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
            Bio
          </label>
          <Textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            rows={4}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          
          {user && !user.is_creator && (
            <Button 
              type="button" 
              variant="secondary"
              onClick={() => {
                if (confirm('Are you sure you want to become a creator?')) {
                  convertToCreator();
                }
              }}
            >
              Become a Creator
            </Button>
          )}
        </div>
        
        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {success && (
          <div className="p-3 bg-green-100 text-green-700 rounded-md">
            {success}
          </div>
        )}
      </form>
    </div>
  );
}
```

## API Endpoints

### Authentication Routes

#### Implementation
```javascript
// routes/auth.js
import express from 'express';
import AuthService from '../services/auth-service';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const authService = new AuthService();

// Wallet authentication challenge
router.post('/wallet/challenge', async (req, res) => {
  try {
    const { address } = req.body;
    const result = await authService.authenticateWithWallet(address);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Wallet signature verification
router.post('/wallet/verify', async (req, res) => {
  try {
    const { address, signature } = req.body;
    const result = await authService.verifyWalletSignature(address, signature);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Validate session
router.get('/validate', authenticateToken, async (req, res) => {
  try {
    const result = await authService.validateSession(req.token);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Refresh session
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const result = await authService.refreshSession(req.token);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const result = await authService.logout(req.token);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
```

### Profile Routes

#### Implementation
```javascript
// routes/profile.js
import express from 'express';
import ProfileService from '../services/profile-service';
import { authenticateToken } from '../middleware/auth';
import multer from 'multer';

const router = express.Router();
const profileService = new ProfileService();
const upload = multer({ storage: multer.memoryStorage() });

// Get user profile
router.get('/', authenticateToken, async (req, res) => {
  try {
    const profile = await profileService.getProfile(req.user.userId);
    res.json(profile);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update user profile
router.put('/', authenticateToken, async (req, res) => {
  try {
    const profile = await profileService.updateProfile(req.user.userId, req.body);
    res.json(profile);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Upload profile image
router.post('/profile-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const result = await profileService.uploadProfileImage(req.user.userId, req.file);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Upload banner image
router.post('/banner-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const result = await profileService.uploadBannerImage(req.user.userId, req.file);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Convert to creator
router.post('/convert-creator', authenticateToken, async (req, res) => {
  try {
    const result = await profileService.convertToCreator(req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const preferences = await profileService.getPreferences(req.user.userId);
    res.json(preferences);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update user preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const preferences = await profileService.updatePreferences(req.user.userId, req.body);
    res.json(preferences);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
```

## Implementation Roadmap

### Phase 1: Authentication System (Weeks 1-2)

#### Week 1: Wallet Integration
- Implement wallet service
- Create authentication service
- Develop wallet connection flow
- Implement signature verification

#### Week 2: Session Management
- Implement JWT token generation
- Create session storage with Redis
- Add session validation and refresh
- Implement logout functionality

### Phase 2: Profile Management (Weeks 3-4)

#### Week 3: Profile CRUD Operations
- Implement profile service
- Create profile retrieval and update
- Add image upload functionality
- Implement caching strategies

#### Week 4: User Roles and Preferences
- Implement creator conversion
- Add preference management
- Create role-based access control
- Implement notification settings

### Phase 3: Frontend Integration (Weeks 5-6)

#### Week 5: Authentication UI
- Create login/connect wallet components
- Implement authentication context
- Add session persistence
- Create protected route components

#### Week 6: Profile Management UI
- Create profile editing interface
- Implement image upload components
- Add preference management UI
- Integrate with dashboard layouts

### Phase 4: Testing and Security (Weeks 7-8)

#### Week 7: Security Testing
- Conduct security audit
- Implement rate limiting
- Add input validation
- Test authentication flows

#### Week 8: Performance Optimization
- Optimize database queries
- Implement caching strategies
- Add monitoring and logging
- Conduct load testing

## Security Considerations

### Authentication Security
- Secure challenge-response mechanism
- Signature verification
- Session token encryption
- Protection against replay attacks

### Data Security
- Encryption of sensitive data
- Secure storage of user information
- GDPR/CCPA compliance
- Regular security audits

### Access Control
- Role-based permissions
- Resource access validation
- Session timeout handling
- Account lockout mechanisms

## Performance Optimization

### Caching Strategy
- Redis caching for profile data
- Session token caching
- Preference caching
- Cache invalidation strategies

### Database Optimization
- Index optimization
- Query optimization
- Connection pooling
- Read replicas for high-traffic queries

## Monitoring and Observability

### Metrics Collection
- Authentication success rates
- Session duration tracking
- Profile update frequency
- Error rate monitoring

### Alerting System
- Failed authentication attempts
- Suspicious activity detection
- System performance degradation
- Security breach notifications

## Testing Strategy

### Unit Testing
- Authentication service functions
- Profile service operations
- Wallet integration functions
- Session management logic

### Integration Testing
- End-to-end authentication flow
- Profile management workflows
- Wallet signature verification
- Session persistence and refresh

### Security Testing
- Penetration testing
- Vulnerability scanning
- Authentication bypass testing
- Session hijacking prevention

## Success Metrics

### Technical Metrics
- Authentication success rate (>99.5%)
- Session duration (average 24+ hours)
- Profile update response time (<500ms)
- System uptime (>99.9%)

### User Experience Metrics
- Login completion rate (>95%)
- Profile update completion rate (>90%)
- User satisfaction scores (>4.5/5)
- Support ticket volume reduction

### Business Metrics
- User retention rate
- Creator conversion rate
- Daily active users
- User engagement metrics

This plan provides a comprehensive roadmap for implementing a secure, user-friendly authentication and profile management system for the Vilokanam-view platform, enabling seamless wallet-based authentication while providing rich profile management features for both creators and viewers.