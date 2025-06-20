import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bell, 
  Check, 
  X, 
  AlertTriangle, 
  Package, 
  DollarSign, 
  Search,
  Trash2,
  CheckCircle,
  Settings
} from 'lucide-react';
import notificationService from '../../services/NotificationService';
import NotificationSettings from './NotificationSettings';
import './NotificationsPage.css';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read, type-specific
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [showSettings, setShowSettings] = useState(false);

  // Mobile Navigation States
  const [activeTab, setActiveTab] = useState('overview'); // overview, settings
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const filterNotifications = useCallback(() => {
    let filtered = [...notifications];

    // Apply filter
    switch (filter) {
      case 'unread':
        filtered = filtered.filter(n => !n.read);
        break;
      case 'read':
        filtered = filtered.filter(n => n.read);
        break;
      case 'low_stock':
        filtered = filtered.filter(n => n.type === 'low_stock');
        break;
      case 'out_of_stock':
        filtered = filtered.filter(n => n.type === 'out_of_stock');
        break;
      case 'sales':
        filtered = filtered.filter(n => n.type === 'sale');
        break;
      case 'system':
        filtered = filtered.filter(n => ['system', 'stock_replenished'].includes(n.type));
        break;
      default:
        // 'all' - no filtering
        break;
    }

    // Apply search
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(searchLower) ||
        n.message.toLowerCase().includes(searchLower) ||
        (n.data?.slot && n.data.slot.toLowerCase().includes(searchLower)) ||
        (n.data?.productName && n.data.productName.toLowerCase().includes(searchLower))
      );
    }

    setFilteredNotifications(filtered);
  }, [notifications, filter, searchTerm]);

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

  useEffect(() => {
    filterNotifications();
  }, [filterNotifications]);

  const handleMarkAsRead = (notificationId) => {
    notificationService.markAsRead(notificationId);
  };

  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead();
    setSelectedNotifications([]);
  };

  const handleRemoveNotification = (notificationId) => {
    notificationService.removeNotification(notificationId);
    setSelectedNotifications(prev => prev.filter(id => id !== notificationId));
  };

  const handleBulkAction = (action) => {
    selectedNotifications.forEach(id => {
      if (action === 'markRead') {
        notificationService.markAsRead(id);
      } else if (action === 'remove') {
        notificationService.removeNotification(id);
      }
    });
    setSelectedNotifications([]);
  };

  const handleSelectNotification = (notificationId) => {
    setSelectedNotifications(prev => {
      if (prev.includes(notificationId)) {
        return prev.filter(id => id !== notificationId);
      } else {
        return [...prev, notificationId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length && filteredNotifications.length > 0) {
      // If all are selected, deselect all
      setSelectedNotifications([]);
    } else {
      // If not all are selected, select all
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    }
  };

  const handleOpenSettings = () => {
    if (isMobile) {
      setActiveTab('settings');
    } else {
      setShowSettings(true);
    }
  };

  const getNotificationIcon = (type) => {
    const iconProps = { size: 20 };
    
    switch (type) {
      case 'low_stock':
        return <Package {...iconProps} className="notification-icon warning" />;
      case 'out_of_stock':
        return <AlertTriangle {...iconProps} className="notification-icon error" />;
      case 'stock_replenished':
        return <CheckCircle {...iconProps} className="notification-icon success" />;
      case 'sale':
        return <DollarSign {...iconProps} className="notification-icon success" />;
      case 'system':
      case 'test':
        return <Settings {...iconProps} className="notification-icon info" />;
      default:
        return <Bell {...iconProps} className="notification-icon info" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#f56565';
      case 'medium': return '#ed8936';
      case 'low': return '#38a169';
      default: return '#667eea';
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - timestamp) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    
    // Show full date for older notifications
    return timestamp.toLocaleDateString('en-NZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFilterCount = (filterType) => {
    switch (filterType) {
      case 'unread':
        return notifications.filter(n => !n.read).length;
      case 'read':
        return notifications.filter(n => n.read).length;
      case 'low_stock':
        return notifications.filter(n => n.type === 'low_stock').length;
      case 'out_of_stock':
        return notifications.filter(n => n.type === 'out_of_stock').length;
      case 'sales':
        return notifications.filter(n => n.type === 'sale').length;
      case 'system':
        return notifications.filter(n => ['system', 'stock_replenished'].includes(n.type)).length;
      default:
        return notifications.length;
    }
  };

  // Navigation tabs
  const navigationTabs = [
    { id: 'overview', label: 'All Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'settings':
        return renderSettingsTab();
      default:
        return renderOverviewTab();
    }
  };

  const renderOverviewTab = () => (
    <>
      {/* Search and Filters */}
      <div className="notifications-controls">
        <div className="search-container">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              className="clear-search"
              onClick={() => setSearchTerm('')}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="filter-tabs">
          {[
            { key: 'all', label: 'All', icon: Bell },
            { key: 'unread', label: 'Unread', icon: Bell },
            { key: 'out_of_stock', label: 'Out of Stock', icon: AlertTriangle },
            { key: 'low_stock', label: 'Low Stock', icon: Package },
            { key: 'sales', label: 'Sales', icon: DollarSign },
            { key: 'system', label: 'System', icon: Settings }
          ].map(tab => (
            <button
              key={tab.key}
              className={`filter-tab ${filter === tab.key ? 'active' : ''}`}
              onClick={() => setFilter(tab.key)}
            >
              <tab.icon size={16} />
              {tab.label} ({getFilterCount(tab.key)})
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions - Updated for mobile selection */}
      {selectedNotifications.length > 0 && (
        <div className="bulk-actions">
          <div className="bulk-info">
            <span>{selectedNotifications.length} selected</span>
          </div>
          <div className="bulk-buttons">
            <button 
              className="btn btn-secondary"
              onClick={() => handleBulkAction('markRead')}
            >
              <Check size={16} />
              {isMobile ? 'Mark Read' : 'Mark Read'}
            </button>
            <button 
              className="btn btn-danger"
              onClick={() => handleBulkAction('remove')}
            >
              <Trash2 size={16} />
              {isMobile ? 'Remove' : 'Remove'}
            </button>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="notifications-container">
        {filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={64} />
            <h3>No notifications found</h3>
            <p>
              {searchTerm 
                ? `No notifications match "${searchTerm}"`
                : `No ${filter} notifications to display`
              }
            </p>
          </div>
        ) : (
          <>
            <div className="notifications-list-header">
              <label className="select-all-checkbox">
                <input
                  type="checkbox"
                  checked={filteredNotifications.length > 0 && selectedNotifications.length === filteredNotifications.length}
                  onChange={handleSelectAll}
                />
                <span className="checkmark"></span>
                Select All
              </label>
              <span className="results-count">
                {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="notifications-list">
              {filteredNotifications.map(notification => (
                <div 
                  key={notification.id}
                  className={`notification-item ${notification.read ? 'read' : 'unread'} ${
                    selectedNotifications.includes(notification.id) ? 'selected' : ''
                  }`}
                >
                  {/* Mobile: Top section with icon and checkbox */}
                  {isMobile ? (
                    <>
                      <div className="notification-top-section">
                        <div className="notification-select">
                          <label className="checkbox">
                            <input
                              type="checkbox"
                              checked={selectedNotifications.includes(notification.id)}
                              onChange={() => handleSelectNotification(notification.id)}
                            />
                            <span className="checkmark"></span>
                          </label>
                        </div>

                        <div className="notification-icon-container">
                          {getNotificationIcon(notification.type)}
                        </div>

                        <div 
                          className="notification-title-section"
                          onClick={() => handleSelectNotification(notification.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <h4 className="notification-title">{notification.title}</h4>
                          <p className="notification-message">{notification.message}</p>
                        </div>
                      </div>

                      {/* Mobile: Meta section */}
                      <div className="notification-meta-mobile">
                        <div className="notification-priority-time">
                          <span 
                            className="priority-badge"
                            style={{ backgroundColor: getPriorityColor(notification.priority) }}
                          >
                            {notification.priority}
                          </span>
                          <span className="notification-time">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                        </div>
                      </div>

                      {/* Mobile: Details badges */}
                      {notification.data && (
                        <div className="notification-details">
                          {notification.data.slot && (
                            <span className="detail-badge">📍 {notification.data.slot}</span>
                          )}
                          {notification.data.quantity !== undefined && (
                            <span className="detail-badge">📦 Qty: {notification.data.quantity}</span>
                          )}
                          {notification.data.price && (
                            <span className="detail-badge">
                              💰 {new Intl.NumberFormat('en-NZ', {
                                style: 'currency',
                                currency: 'NZD'
                              }).format(notification.data.price)}
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    /* Desktop: Original layout */
                    <>
                      <div className="notification-select">
                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={selectedNotifications.includes(notification.id)}
                            onChange={() => handleSelectNotification(notification.id)}
                          />
                          <span className="checkmark"></span>
                        </label>
                      </div>

                      <div className="notification-icon-container">
                        {getNotificationIcon(notification.type)}
                      </div>

                      <div className="notification-content">
                        <div className="notification-header">
                          <h4 className="notification-title">{notification.title}</h4>
                          <div className="notification-meta">
                            <span 
                              className="priority-badge"
                              style={{ backgroundColor: getPriorityColor(notification.priority) }}
                            >
                              {notification.priority}
                            </span>
                            <span className="notification-time">
                              {formatTimestamp(notification.timestamp)}
                            </span>
                          </div>
                        </div>
                        
                        <p className="notification-message">{notification.message}</p>
                        
                        {notification.data && (
                          <div className="notification-details">
                            {notification.data.slot && (
                              <span className="detail-badge">Slot: {notification.data.slot}</span>
                            )}
                            {notification.data.quantity !== undefined && (
                              <span className="detail-badge">Quantity: {notification.data.quantity}</span>
                            )}
                            {notification.data.price && (
                              <span className="detail-badge">
                                Amount: {new Intl.NumberFormat('en-NZ', {
                                  style: 'currency',
                                  currency: 'NZD'
                                }).format(notification.data.price)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="notification-actions">
                        {!notification.read && (
                          <button
                            className="action-btn mark-read"
                            onClick={() => handleMarkAsRead(notification.id)}
                            title="Mark as read"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        <button
                          className="action-btn remove"
                          onClick={() => handleRemoveNotification(notification.id)}
                          title="Remove notification"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );

  const renderSettingsTab = () => (
    <div className="notification-settings-tab-content" style={{ padding: '20px 0' }}>
      <div style={{ 
        background: '#f7fafc', 
        padding: '20px', 
        borderRadius: '12px', 
        marginBottom: '24px',
        borderLeft: '4px solid #667eea'
      }}>
        <h4 style={{ 
          margin: '0 0 8px 0', 
          color: '#2d3748', 
          fontSize: '18px', 
          fontWeight: '600' 
        }}>
          Notification Settings
        </h4>
        <p style={{ 
          margin: '0', 
          color: '#4a5568', 
          fontSize: '14px', 
          lineHeight: '1.5' 
        }}>
          Configure how and when you want to receive notifications from your vending machine.
        </p>
      </div>

      <NotificationSettings
        isOpen={true}
        onClose={() => setActiveTab('overview')}
        embedded={true}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="notifications-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div className="header-left">
          {/* Only show header text on desktop */}
          {!isMobile && (
            <>
              <h1>All Notifications</h1>
              <p>Manage and review all your vending machine notifications</p>
            </>
          )}
          
          {/* Mobile: Show header text only when not on settings tab */}
          {isMobile && activeTab !== 'settings' && (
            <>
              <h1>All Notifications</h1>
              <p>Manage and review all your vending machine notifications</p>
            </>
          )}

          {/* Mobile: Show settings header when on settings tab */}
          {isMobile && activeTab === 'settings' && (
            <>
              <h1>Notification Settings</h1>
              <p>Configure your notification preferences</p>
            </>
          )}
        </div>
        
        {/* Desktop Actions - Show only on desktop */}
        {!isMobile && (
          <div className="header-actions">
            <button 
              className="btn btn-secondary"
              onClick={handleOpenSettings}
            >
              <Settings size={16} />
              Settings
            </button>
            <button 
              className="btn btn-primary"
              onClick={handleMarkAllAsRead}
              disabled={notifications.filter(n => !n.read).length === 0}
            >
              <Check size={16} />
              Mark All Read
            </button>
          </div>
        )}
      </div>

      {/* Mobile Navigation */}
      {isMobile && (
        <div className="mobile-inventory-navigation">
          <div className="mobile-nav-tabs">
            {navigationTabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  className={`mobile-nav-tab ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <IconComponent size={20} />
                  <span className="mobile-nav-label">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="notifications-content">
        {isMobile ? renderTabContent() : renderOverviewTab()}
      </div>

      {/* Desktop Modal - Only show on desktop */}
      {!isMobile && showSettings && (
        <NotificationSettings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

export default NotificationsPage;