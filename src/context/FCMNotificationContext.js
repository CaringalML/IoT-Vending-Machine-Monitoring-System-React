// src/context/FCMNotificationContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { subscribeToInventory, subscribeToProducts } from '../services/firestore';
import fcmService from '../services/fcm';
import { useAuth } from './AuthContext';

const FCMNotificationContext = createContext();

export const useFCMNotifications = () => {
  const context = useContext(FCMNotificationContext);
  if (!context) {
    throw new Error('useFCMNotifications must be used within a FCMNotificationProvider');
  }
  return context;
};

export const FCMNotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [fcmToken, setFcmToken] = useState(null);
  const [fcmEnabled, setFcmEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('default');
  
  const { user } = useAuth();

  // Generate unique notification ID
  const generateNotificationId = () => {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Get product name from product ID
  const getProductName = useCallback((productId) => {
    if (!productId) return 'Unknown Product';
    const product = products.find(p => p.id === productId);
    return product?.name || 'Unknown Product';
  }, [products]);

  // Check if item is deleted product
  const isDeletedProduct = useCallback((item) => {
    return !item.productId && item.deletedProductName;
  }, []);

  // Create notification object
  const createNotification = useCallback((type, item, message) => {
    return {
      id: generateNotificationId(),
      type,
      title: type === 'empty' ? 'Empty Slot Alert' : 'Low Stock Alert',
      message,
      slot: item.slot,
      productId: item.productId,
      productName: isDeletedProduct(item) ? item.deletedProductName : getProductName(item.productId),
      quantity: item.quantity,
      maxCapacity: item.maxCapacity || 20,
      timestamp: new Date(),
      read: false,
      severity: type === 'empty' ? 'high' : 'medium',
      fcmSent: false
    };
  }, [getProductName, isDeletedProduct]);

  // Initialize FCM when user is authenticated
  useEffect(() => {
    const initializeFCM = async () => {
      if (user && fcmService.isMessagingSupported()) {
        try {
          // Request permission and get token
          const token = await fcmService.requestPermissionAndGetToken(user.uid);
          if (token) {
            setFcmToken(token);
            setFcmEnabled(true);
            setPermissionStatus('granted');
            console.log('FCM initialized successfully with token:', token);
          }
        } catch (error) {
          console.error('Failed to initialize FCM:', error);
          setFcmEnabled(false);
          setPermissionStatus('denied');
        }
      }
    };

    if (user) {
      initializeFCM();
    }
  }, [user]);

  // Set up FCM foreground message handler
  useEffect(() => {
    if (fcmEnabled) {
      const handleFCMMessage = (payload) => {
        console.log('FCM foreground message received:', payload);
        
        // Create in-app notification from FCM payload
        if (payload.data) {
          const notification = {
            id: generateNotificationId(),
            type: payload.data.type || 'info',
            title: payload.notification?.title || 'Notification',
            message: payload.notification?.body || 'New notification',
            slot: payload.data.slot,
            productId: payload.data.productId,
            productName: payload.data.productName,
            quantity: parseInt(payload.data.quantity) || 0,
            maxCapacity: parseInt(payload.data.maxCapacity) || 20,
            timestamp: new Date(),
            read: false,
            severity: payload.data.severity || 'medium',
            fcmSent: true
          };

          setNotifications(prev => [notification, ...prev.slice(0, 49)]);
          setUnreadCount(prev => prev + 1);
        }
      };

      fcmService.addMessageHandler(handleFCMMessage);

      return () => {
        fcmService.removeMessageHandler(handleFCMMessage);
      };
    }
  }, [fcmEnabled]);

  // Check inventory levels and generate notifications
  const checkInventoryLevels = useCallback(() => {
    if (!inventory.length) return;

    const newNotifications = [];
    const existingSlots = new Set(notifications.map(n => n.slot));

    inventory.forEach(item => {
      // Skip deleted products and items without slots
      if (isDeletedProduct(item) || !item.slot) return;

      const hasProduct = item.productId;
      if (!hasProduct) return;

      const quantity = item.quantity || 0;
      const lowStockThreshold = item.lowStockThreshold || 5;
      const productName = getProductName(item.productId);

      // Check for empty slot
      if (quantity === 0) {
        if (!existingSlots.has(item.slot)) {
          const notification = createNotification(
            'empty',
            item,
            `${productName} in slot ${item.slot} is completely out of stock!`
          );
          newNotifications.push(notification);
        }
      }
      // Check for low stock
      else if (quantity <= lowStockThreshold) {
        if (!existingSlots.has(item.slot)) {
          const notification = createNotification(
            'low_stock',
            item,
            `${productName} in slot ${item.slot} is running low (${quantity} remaining)`
          );
          newNotifications.push(notification);
        }
      }
    });

    // Add new notifications
    if (newNotifications.length > 0) {
      setNotifications(prev => {
        const updated = [...newNotifications, ...prev];
        return updated.slice(0, 50); // Keep only last 50 notifications
      });

      // Update unread count
      setUnreadCount(prev => prev + newNotifications.length);

      // If FCM is not enabled, show browser notifications as fallback
      if (!fcmEnabled && Notification.permission === 'granted') {
        newNotifications.forEach(notification => {
          const browserNotification = new Notification(notification.title, {
            body: notification.message,
            icon: '/icons/notification-icon-192.png',
            tag: notification.slot,
            requireInteraction: notification.type === 'empty'
          });

          browserNotification.onclick = () => {
            window.focus();
            browserNotification.close();
          };

          // Auto close after 5 seconds unless requiring interaction
          if (!browserNotification.requireInteraction) {
            setTimeout(() => browserNotification.close(), 5000);
          }
        });
      }
    }
  }, [inventory, notifications, createNotification, getProductName, isDeletedProduct, fcmEnabled]);

  // Clear notifications for restocked items
  const clearResolvedNotifications = useCallback(() => {
    setNotifications(prev => {
      return prev.filter(notification => {
        const item = inventory.find(inv => inv.slot === notification.slot);
        if (!item) return true; // Keep notification if item not found

        const quantity = item.quantity || 0;
        const lowStockThreshold = item.lowStockThreshold || 5;

        // Remove notification if item is no longer low stock or empty
        if (notification.type === 'empty' && quantity > 0) {
          setUnreadCount(count => Math.max(0, count - (notification.read ? 0 : 1)));
          return false;
        }
        if (notification.type === 'low_stock' && quantity > lowStockThreshold) {
          setUnreadCount(count => Math.max(0, count - (notification.read ? 0 : 1)));
          return false;
        }

        return true;
      });
    });
  }, [inventory]);

  // Subscribe to inventory changes
  useEffect(() => {
    const unsubscribeInventory = subscribeToInventory((inventoryData) => {
      setInventory(inventoryData);
    });

    return unsubscribeInventory;
  }, []);

  // Subscribe to products changes
  useEffect(() => {
    const unsubscribeProducts = subscribeToProducts((productsData) => {
      setProducts(productsData);
    });

    return unsubscribeProducts;
  }, []);

  // Check inventory levels when inventory or products change
  useEffect(() => {
    if (inventory.length > 0 && products.length > 0) {
      const timeout = setTimeout(() => {
        clearResolvedNotifications();
        checkInventoryLevels();
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [inventory, products, checkInventoryLevels, clearResolvedNotifications]);

  // FCM permission management
  const requestFCMPermission = async () => {
    try {
      if (user && fcmService.isMessagingSupported()) {
        const token = await fcmService.requestPermissionAndGetToken(user.uid);
        if (token) {
          setFcmToken(token);
          setFcmEnabled(true);
          setPermissionStatus('granted');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error requesting FCM permission:', error);
      setPermissionStatus('denied');
      return false;
    }
  };

  const revokeFCMPermission = async () => {
    try {
      const success = await fcmService.revokeToken();
      if (success) {
        setFcmToken(null);
        setFcmEnabled(false);
        setPermissionStatus('denied');
      }
      return success;
    } catch (error) {
      console.error('Error revoking FCM permission:', error);
      return false;
    }
  };

  // Mark notification as read
  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(notification => {
        if (notification.id === notificationId && !notification.read) {
          setUnreadCount(count => Math.max(0, count - 1));
          return { ...notification, read: true };
        }
        return notification;
      })
    );
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Remove specific notification
  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.id !== notificationId);
    });
  }, []);

  // Test FCM notification
  const testFCMNotification = async () => {
    if (fcmEnabled) {
      return await fcmService.testNotification();
    }
    return false;
  };

  // Get FCM service stats
  const getFCMStats = () => {
    return fcmService.getServiceStats();
  };

  const value = {
    // Notifications
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    removeNotification,
    
    // FCM specific
    fcmEnabled,
    fcmToken,
    permissionStatus,
    requestFCMPermission,
    revokeFCMPermission,
    testFCMNotification,
    getFCMStats,
    
    // Service info
    isMessagingSupported: fcmService.isMessagingSupported()
  };

  return (
    <FCMNotificationContext.Provider value={value}>
      {children}
    </FCMNotificationContext.Provider>
  );
};