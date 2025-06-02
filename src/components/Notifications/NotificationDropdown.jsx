import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, X, AlertTriangle, Package, DollarSign } from 'lucide-react';
import notificationService from '../../services/NotificationService';
import './Notifications.css';

const NotificationDropdown = ({ isOpen, onClose, onOpenSettings }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    // Subscribe to real-time notification updates
    const unsubscribe = notificationService.addListener((newNotifications) => {
      setNotifications(newNotifications);
      setLoading(false);
    });

    // Initial load
    setNotifications(notificationService.getNotifications());
    setLoading(false);

    return unsubscribe;
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // Get real notifications from service
      const realNotifications = notificationService.getNotifications();
      setNotifications(realNotifications);
      setLoading(false);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setLoading(false);
    }
  };

  const markAsRead = (notificationId) => {
    notificationService.markAsRead(notificationId);
  };

  const markAllAsRead = () => {
    notificationService.markAllAsRead();
  };

  const removeNotification = (notificationId) => {
    notificationService.removeNotification(notificationId);
  };

  const getNotificationIcon = (type, IconComponent) => {
    const iconProps = { size: 18 };
    
    switch (type) {
      case 'low_stock':
        return <Package {...iconProps} className="notification-icon warning" />;
      case 'out_of_stock':
        return <AlertTriangle {...iconProps} className="notification-icon error" />;
      case 'stock_replenished':
        return <Check {...iconProps} className="notification-icon success" />;
      case 'sale':
        return <DollarSign {...iconProps} className="notification-icon success" />;
      case 'system':
      case 'test':
        return <Check {...iconProps} className="notification-icon info" />;
      case 'error':
        return <AlertTriangle {...iconProps} className="notification-icon error" />;
      default:
        return IconComponent ? <IconComponent {...iconProps} className="notification-icon info" /> : <Bell {...iconProps} className="notification-icon info" />;
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - timestamp) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isOpen) return null;

  return (
    <div className="notification-dropdown">
      <div className="notification-header">
        <div className="notification-title">
          <Bell size={18} />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="notification-count">{unreadCount}</span>
          )}
        </div>
        <div className="notification-actions">
          {unreadCount > 0 && (
            <button 
              className="mark-all-read-btn"
              onClick={markAllAsRead}
              title="Mark all as read"
            >
              <Check size={16} />
            </button>
          )}
          <button 
            className="notification-settings-btn"
            onClick={onOpenSettings}
            title="Notification settings"
          >
            ⚙️
          </button>
          <button 
            className="notification-close-btn"
            onClick={onClose}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="notification-content">
        {loading ? (
          <div className="notification-loading">
            <div className="loading-spinner"></div>
            <span>Loading notifications...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notification-empty">
            <Bell size={48} />
            <p>No notifications</p>
            <span>You're all caught up!</span>
          </div>
        ) : (
          <div className="notification-list">
            {notifications.map(notification => (
              <div 
                key={notification.id}
                className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                <div className="notification-icon-wrapper">
                  {getNotificationIcon(notification.type, notification.icon)}
                </div>
                <div className="notification-details">
                  <div className="notification-item-title">
                    {notification.title}
                  </div>
                  <div className="notification-message">
                    {notification.message}
                  </div>
                  <div className="notification-time">
                    {formatTimeAgo(notification.timestamp)}
                  </div>
                </div>
                <div className="notification-item-actions">
                  {!notification.read && (
                    <div className="unread-indicator" title="Unread"></div>
                  )}
                  <button 
                    className="remove-notification-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notification.id);
                    }}
                    title="Remove notification"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="notification-footer">
          <button 
            className="view-all-btn"
            onClick={() => {
              onClose();
              navigate('/notifications');
            }}
          >
            View All Notifications
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;