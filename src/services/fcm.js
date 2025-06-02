// src/services/fcm.js
// Firebase Cloud Messaging service for token management and notifications

import { getToken, onMessage, deleteToken } from 'firebase/messaging';
import { messaging } from './firebase';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

class FCMService {
  constructor() {
    this.vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY;
    this.currentToken = null;
    this.isSupported = false;
    this.userId = null;
    this.messageHandlers = [];
    
    this.init();
  }

  async init() {
    try {
      // Check if messaging is supported and available
      if (!messaging) {
        console.warn('Firebase Messaging not supported in this browser');
        return false;
      }

      this.isSupported = true;
      console.log('FCM Service initialized successfully');
      
      // Set up foreground message handler
      this.setupForegroundMessageHandler();
      
      return true;
    } catch (error) {
      console.error('Error initializing FCM service:', error);
      return false;
    }
  }

  // Check if FCM is supported
  isMessagingSupported() {
    return this.isSupported && !!messaging;
  }

  // Request notification permission and get token
  async requestPermissionAndGetToken(userId) {
    try {
      if (!this.isMessagingSupported()) {
        throw new Error('Firebase Messaging not supported');
      }

      console.log('Requesting notification permission...');
      
      // Request permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      console.log('Notification permission granted');
      
      // Register service worker
      await this.registerServiceWorker();
      
      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: this.vapidKey
      });

      if (token) {
        console.log('FCM token obtained:', token);
        this.currentToken = token;
        this.userId = userId;
        
        // Save token to Firestore
        await this.saveTokenToDatabase(userId, token);
        
        return token;
      } else {
        throw new Error('No registration token available');
      }
      
    } catch (error) {
      console.error('Error getting FCM token:', error);
      throw error;
    }
  }

  // Register service worker
  async registerServiceWorker() {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('Service Worker registered:', registration);
        
        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;
        console.log('Service Worker is ready');
        
        return registration;
      } else {
        console.warn('Service Worker not supported');
        return null;
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  // Save token to Firestore
  async saveTokenToDatabase(userId, token) {
    try {
      const tokenData = {
        token,
        userId,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          timestamp: serverTimestamp()
        },
        createdAt: serverTimestamp(),
        lastUsed: serverTimestamp(),
        isActive: true
      };

      // Save to fcm_tokens collection
      await setDoc(doc(db, 'fcm_tokens', token), tokenData);
      
      // Also save to user's document for easy lookup
      await setDoc(doc(db, 'users', userId), {
        fcmToken: token,
        notificationsEnabled: true,
        lastTokenUpdate: serverTimestamp()
      }, { merge: true });

      console.log('Token saved to database successfully');
    } catch (error) {
      console.error('Error saving token to database:', error);
      throw error;
    }
  }

  // Delete token from database
  async deleteTokenFromDatabase(token = null) {
    try {
      const tokenToDelete = token || this.currentToken;
      
      if (tokenToDelete) {
        // Delete from fcm_tokens collection
        await deleteDoc(doc(db, 'fcm_tokens', tokenToDelete));
        
        // Update user document
        if (this.userId) {
          await setDoc(doc(db, 'users', this.userId), {
            fcmToken: null,
            notificationsEnabled: false,
            lastTokenUpdate: serverTimestamp()
          }, { merge: true });
        }
        
        console.log('Token deleted from database');
      }
    } catch (error) {
      console.error('Error deleting token from database:', error);
    }
  }

  // Revoke FCM token
  async revokeToken() {
    try {
      if (this.currentToken && messaging) {
        await deleteToken(messaging);
        await this.deleteTokenFromDatabase();
        this.currentToken = null;
        console.log('FCM token revoked successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error revoking FCM token:', error);
      return false;
    }
  }

  // Get current token
  getCurrentToken() {
    return this.currentToken;
  }

  // Setup foreground message handler
  setupForegroundMessageHandler() {
    if (!messaging) return;

    onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      
      // Show notification when app is in foreground
      this.showForegroundNotification(payload);
      
      // Notify all registered handlers
      this.messageHandlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error('Error in message handler:', error);
        }
      });
    });
  }

  // Show notification when app is in foreground
  showForegroundNotification(payload) {
    const { notification, data } = payload;
    
    if (notification) {
      const notificationTitle = notification.title || 'Vending Machine Alert';
      const notificationOptions = {
        body: notification.body,
        icon: notification.icon || '/icons/notification-icon-192.png',
        badge: '/icons/notification-icon-192.png',
        tag: data?.tag || 'vending-notification',
        requireInteraction: data?.requireInteraction === 'true',
        data: data
      };

      // Show browser notification
      if (Notification.permission === 'granted') {
        const browserNotification = new Notification(notificationTitle, notificationOptions);
        
        browserNotification.onclick = () => {
          window.focus();
          if (data?.click_action) {
            window.location.href = data.click_action;
          }
          browserNotification.close();
        };

        // Auto close after 5 seconds unless requiring interaction
        if (!notificationOptions.requireInteraction) {
          setTimeout(() => browserNotification.close(), 5000);
        }
      }
    }
  }

  // Add message handler
  addMessageHandler(handler) {
    this.messageHandlers.push(handler);
  }

  // Remove message handler
  removeMessageHandler(handler) {
    const index = this.messageHandlers.indexOf(handler);
    if (index > -1) {
      this.messageHandlers.splice(index, 1);
    }
  }

  // Get notification permission status
  getPermissionStatus() {
    return Notification.permission;
  }

  // Check if notifications are enabled
  areNotificationsEnabled() {
    return this.getPermissionStatus() === 'granted' && !!this.currentToken;
  }

  // Test notification (for debugging)
  async testNotification() {
    if (this.areNotificationsEnabled()) {
      const testPayload = {
        notification: {
          title: '🧪 Test Notification',
          body: 'FCM is working correctly!',
          icon: '/icons/notification-icon-192.png'
        },
        data: {
          type: 'test',
          timestamp: new Date().toISOString()
        }
      };
      
      this.showForegroundNotification(testPayload);
      return true;
    }
    return false;
  }

  // Get service statistics
  getServiceStats() {
    return {
      isSupported: this.isSupported,
      hasToken: !!this.currentToken,
      permission: this.getPermissionStatus(),
      handlersCount: this.messageHandlers.length,
      vapidKeyConfigured: !!this.vapidKey
    };
  }
}

// Create singleton instance
const fcmService = new FCMService();

export default fcmService;

// Export individual methods for convenience
export const {
  requestPermissionAndGetToken,
  revokeToken,
  getCurrentToken,
  addMessageHandler,
  removeMessageHandler,
  getPermissionStatus,
  areNotificationsEnabled,
  testNotification,
  getServiceStats
} = fcmService;