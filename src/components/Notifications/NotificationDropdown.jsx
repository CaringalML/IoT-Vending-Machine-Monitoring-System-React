import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  X, 
  Settings, 
  CheckCircle, 
  AlertTriangle, 
  Package, 
  DollarSign,
  Clock,
  Trash2,
  ArrowRight
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import './NotificationDropdown.css';

const NotificationDropdown = ({ isOpen, onClose, onOpenSettings }) => {
  const navigate = useNavigate();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    removeNotification,
    clearAllNotifications 
  } = useNotifications();

  if (!isOpen) return null;

  const recentNotifications = notifications.slice(0, 5);

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'out_of_stock':
      case 'low_stock':
      case 'stock_replenished':
        navigate('/inventory');
        break;
      case 'sale':
        navigate('/sales');
        break;
      default:
        navigate('/notifications');
        break;
    }
    
    onClose();
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const handleViewAll = () => {
    navigate('/notifications');
    onClose();
  };

  const handleRemoveNotification = async (e, notificationId) => {
    e.stopPropagation();
    await removeNotification(notificationId);
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      await clearAllNotifications();
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'out_of_stock':
        return <AlertTriangle size={16} className="text-red-500" />;
      case 'low_stock':
        return <Package size={16} className="text-yellow-500" />;
      case 'sale':
        return <DollarSign size={16} className="text-green-500" />;
      case 'stock_replenished':
        return <CheckCircle size={16} className="text-blue-500" />;
      default:
        return <Bell size={16} className="text-gray-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      case 'low':
        return 'border-l-green-500';
      default:
        return 'border-l-gray-300';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    try {
      // Handle Firestore timestamp
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);
      
      if (diffInSeconds < 60) {
        return 'Just now';
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes}m ago`;
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours}h ago`;
      } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days}d ago`;
      }
    } catch (error) {
      return 'Just now';
    }
  };

  return (
    <div className="notification-dropdown">
      {/* Header */}
      <div className="notification-dropdown-header">
        <div className="flex items-center gap-2">
          <Bell size={18} />
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              title="Mark all as read"
            >
              Mark all read
            </button>
          )}
          
          <button
            onClick={onOpenSettings}
            className="p-1 hover:bg-gray-100 rounded"
            title="Notification settings"
          >
            <Settings size={16} />
          </button>
          
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="notification-dropdown-content">
        {recentNotifications.length === 0 ? (
          <div className="notification-empty">
            <Bell size={24} className="text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 text-sm text-center">No notifications yet</p>
            <p className="text-gray-400 text-xs text-center mt-1">
              You'll see updates about your vending machine here
            </p>
          </div>
        ) : (
          <div className="notification-list">
            {recentNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item ${!notification.read ? 'notification-unread' : ''} ${getPriorityColor(notification.priority)}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-icon">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="notification-content">
                  <div className="notification-title">
                    {notification.title}
                  </div>
                  <div className="notification-message">
                    {notification.message}
                  </div>
                  <div className="notification-time">
                    <Clock size={12} />
                    {formatTime(notification.timestamp)}
                    {notification.slot && (
                      <span className="notification-slot">
                        {notification.slot}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => handleRemoveNotification(e, notification.id)}
                  className="notification-remove"
                  title="Remove notification"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer - UPDATED WITH PROPER BUTTONS */}
      <div className="notification-dropdown-footer">
        <div className="footer-left">
          {notifications.length > 0 && (
            <button
              onClick={handleViewAll}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              View all notifications
              <ArrowRight size={14} />
            </button>
          )}
        </div>
        
        <div className="footer-right">
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationDropdown;