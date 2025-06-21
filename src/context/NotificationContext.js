// src/context/NotificationContext.js
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
  
  const { user } = useAuth();

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

    setLoading(true); // Always start in a loading state

    try {
      // Initialize the service. This sets up the Firestore listeners.
      await firestoreNotificationService.initialize(user.uid);
      
      // The listener is now solely responsible for updating state.
      // It will set the loading state to false only after the first data payload arrives.
      const unsubscribe = firestoreNotificationService.addListener((newNotifications, newUnreadCount) => {
        setNotifications(newNotifications);
        setUnreadCount(newUnreadCount);
        
        // This is the key fix: The loading spinner will now persist until
        // the first batch of data has been successfully received from the listener.
        // We check the 'loading' state to ensure this only runs once per initialization.
        if (loading) {
            setLoading(false);
        }
      });

      // Store the unsubscribe function to be called on cleanup.
      window.notificationUnsubscribe = unsubscribe;
      
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      setLoading(false); // Ensure loading is turned off if an error occurs
    }
    // We intentionally DO NOT set loading to false here on success.
    // We wait for the listener to give us the first data set.
  }, [user, loading]); // `loading` is included as a dependency to ensure the closure has the latest value.

  // This effect hook handles the lifecycle of the notification service
  useEffect(() => {
    if (user) {
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
