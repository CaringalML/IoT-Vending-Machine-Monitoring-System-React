// src/context/NotificationContext.js
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  
  const { user } = useAuth();

  // --- NEW: Use a ref to track the initial load ---
  // This ref helps us know if it's the very first time the listener is firing.
  const isInitialLoad = useRef(true);

  const cleanupNotificationService = useCallback(() => {
    if (window.notificationUnsubscribe) {
      window.notificationUnsubscribe();
      delete window.notificationUnsubscribe;
    }
    
    firestoreNotificationService.cleanup();
    setNotifications([]);
    setUnreadCount(0);
    setLoading(true); // Reset loading state on cleanup
  }, []);

  // --- UPDATED: More robust initialization logic ---
  const initializeNotificationService = useCallback(async () => {
    // Prevent execution if there's no user
    if (!user) return;

    try {
      // Initialize the service. This sets up the Firestore listeners.
      await firestoreNotificationService.initialize(user.uid);
      
      // This listener is now responsible for setting the loading state to false.
      const unsubscribe = firestoreNotificationService.addListener((newNotifications, newUnreadCount) => {
        setNotifications(newNotifications);
        setUnreadCount(newUnreadCount);
        
        // This is the key fix: Use the ref to check if this is the first data payload.
        // If it is, we turn off the loading spinner and update the ref so this block
        // doesn't run again until the next full initialization.
        if (isInitialLoad.current) {
            setLoading(false);
            isInitialLoad.current = false; // Mark initial load as complete
        }
      });

      // Store the unsubscribe function to be called on cleanup.
      window.notificationUnsubscribe = unsubscribe;
      
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      setLoading(false); // Ensure loading is turned off if an error occurs
      isInitialLoad.current = false;
    }
  }, [user]); // This callback now ONLY depends on the user, which is correct.

  // This effect hook handles the lifecycle of the notification service
  useEffect(() => {
    if (user) {
      // Reset flags and set loading state before initializing
      setLoading(true);
      isInitialLoad.current = true;
      initializeNotificationService();
    } else {
      cleanupNotificationService();
    }
    
    // The cleanup function for this effect will run when the user logs out
    return () => {
      if (window.notificationUnsubscribe) {
        window.notificationUnsubscribe();
      }
    };
  }, [user, initializeNotificationService, cleanupNotificationService]);

  // Expose the unlockAudio function from the service through the context
  const unlockAudio = useCallback(() => {
    firestoreNotificationService.unlockAudio();
  }, []);

  const value = {
    // State
    notifications,
    unreadCount,
    loading,
    
    // Actions
    markAsRead: firestoreNotificationService.markAsRead.bind(firestoreNotificationService),
    markAllAsRead: firestoreNotificationService.markAllAsRead.bind(firestoreNotificationService),
    removeNotification: firestoreNotificationService.removeNotification.bind(firestoreNotificationService),
    clearAllNotifications: firestoreNotificationService.clearAllNotifications.bind(firestoreNotificationService),
    sendTestNotification: firestoreNotificationService.sendTestNotification.bind(firestoreNotificationService),
    
    // Settings & Permissions
    getSettings: firestoreNotificationService.loadSettings.bind(firestoreNotificationService),
    updateSettings: firestoreNotificationService.updateSettings.bind(firestoreNotificationService),
    requestNotificationPermission: firestoreNotificationService.requestNotificationPermission.bind(firestoreNotificationService),
    unlockAudio, // Expose the new function
    
    // Service info
    isSupported: 'Notification' in window,
    permissionStatus: 'Notification' in window ? Notification.permission : 'denied'
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
