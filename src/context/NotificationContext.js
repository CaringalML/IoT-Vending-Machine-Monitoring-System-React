// src/context/NotificationContext.js - Updated with new methods
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import firestoreNotificationService from '../services/FirestoreNotificationService';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [permissionRequested, setPermissionRequested] = useState(false);
  
  const { user } = useAuth();

  // Wrap cleanup function in useCallback
  const cleanupNotificationService = useCallback(() => {
    if (window.notificationUnsubscribe) {
      window.notificationUnsubscribe();
      delete window.notificationUnsubscribe;
    }
    
    firestoreNotificationService.cleanup();
    setNotifications([]);
    setUnreadCount(0);
    setLoading(false);
  }, []);

  // Wrap initialization function in useCallback
  const initializeNotificationService = useCallback(async () => {
    try {
      setLoading(true);
      
      // Initialize the service with current user
      await firestoreNotificationService.initialize(user.uid);
      
      // Subscribe to notification updates
      const unsubscribe = firestoreNotificationService.addListener((notifications, unreadCount) => {
        setNotifications(notifications);
        setUnreadCount(unreadCount);
        setLoading(false);
      });

      // Store unsubscribe function
      window.notificationUnsubscribe = unsubscribe;
      
      // Initial load
      setNotifications(firestoreNotificationService.getNotifications());
      setUnreadCount(firestoreNotificationService.getUnreadCount());
      setLoading(false);
      
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      setLoading(false);
    }
  }, [user]);

  // Initialize service when user logs in
  useEffect(() => {
    if (user) {
      initializeNotificationService();
    } else {
      cleanupNotificationService();
    }
  }, [user, initializeNotificationService, cleanupNotificationService]);

  // Request notification permission on first load
  useEffect(() => {
    const requestPermission = async () => {
      if (!permissionRequested && 'Notification' in window) {
        const permission = await firestoreNotificationService.requestNotificationPermission();
        setPermissionRequested(true);
        console.log('Notification permission:', permission ? 'granted' : 'denied');
      }
    };

    requestPermission();
  }, [permissionRequested]);

  // Notification management functions
  const markAsRead = async (notificationId) => {
    await firestoreNotificationService.markAsRead(notificationId);
  };

  const markAllAsRead = async () => {
    await firestoreNotificationService.markAllAsRead();
  };

  const removeNotification = async (notificationId) => {
    await firestoreNotificationService.removeNotification(notificationId);
  };

  const clearAllNotifications = async () => {
    await firestoreNotificationService.clearAllNotifications();
  };

  const sendTestNotification = async () => {
    await firestoreNotificationService.sendTestNotification();
  };

  // Settings management
  const getSettings = () => {
    return firestoreNotificationService.getSettings();
  };

  const updateSettings = (newSettings) => {
    firestoreNotificationService.updateSettings(newSettings);
  };

  const requestNotificationPermission = async () => {
    return await firestoreNotificationService.requestNotificationPermission();
  };

  // NEW: Audio methods - Make sure these are properly bound
  const testSound = async (soundType) => {
    try {
      console.log('Testing sound from context:', soundType);
      await firestoreNotificationService.testSound(soundType);
    } catch (error) {
      console.error('Error testing sound:', error);
    }
  };

  const setVolume = (volume) => {
    try {
      console.log('Setting volume from context:', volume);
      firestoreNotificationService.setVolume(volume);
    } catch (error) {
      console.error('Error setting volume:', error);
    }
  };

  const preloadSounds = async () => {
    try {
      console.log('Preloading sounds from context');
      await firestoreNotificationService.preloadSounds();
    } catch (error) {
      console.error('Error preloading sounds:', error);
    }
  };

  const unlockAudio = () => {
    try {
      console.log('Unlocking audio from context');
      firestoreNotificationService.unlockAudio();
    } catch (error) {
      console.error('Error unlocking audio:', error);
    }
  };

  const value = {
    // State
    notifications,
    unreadCount,
    loading,
    
    // Actions
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    sendTestNotification,
    
    // Settings
    getSettings,
    updateSettings,
    requestNotificationPermission,
    
    // NEW: Audio methods
    testSound,
    setVolume,
    preloadSounds,
    unlockAudio,
    
    // Service info
    isSupported: true,
    permissionStatus: 'Notification' in window ? Notification.permission : 'denied'
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};