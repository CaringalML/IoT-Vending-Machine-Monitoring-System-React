// src/components/Notifications/NotificationsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bell, 
  Check, 
  X, 
  AlertTriangle, 
  Package, 
  Search,
  Trash2,
  CheckCircle,
  Settings
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import NotificationSettings from './NotificationSettings';
import './NotificationsPage.css';

const NotificationsPage = () => {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    removeNotification, 
    clearAllNotifications 
  } = useNotifications();

  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const formatNotificationMessage = (notification) => {
    if (notification.type === 'sale' && notification.productName) {
      return (
        <>
          <span style={{ textDecoration: 'underline' }}>{notification.productName}</span>
          <span> sold for {formatCurrency(notification.price || 0)}</span>
        </>
      );
    }
    return notification.message;
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const notificationTime = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    const now = new Date();
    const diffInMs = now - notificationTime;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return notificationTime.toLocaleDateString();
  };

  const filterNotifications = useCallback(() => {
    let filtered = [...notifications];
    if (filter !== 'all') {
      const types = {
        low_stock: ['low_stock'],
        out_of_stock: ['out_of_stock'],
        sales: ['sale'],
        system: ['system', 'stock_replenished']
      };
      filtered = filter === 'unread' ? filtered.filter(n => !n.read) :
                 filter === 'read' ? filtered.filter(n => n.read) :
                 filtered.filter(n => types[filter]?.includes(n.type));
    }
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(searchLower) ||
        n.message.toLowerCase().includes(searchLower)
      );
    }
    setFilteredNotifications(filtered);
  }, [notifications, filter, searchTerm]);

  useEffect(() => {
    filterNotifications();
  }, [filterNotifications]);

  const getNotificationIcon = (type) => {
    const iconMap = {
      sale: <Bell size={20} />, // Changed from DollarSign to Bell for consistency, as price is shown below
      out_of_stock: <AlertTriangle size={20} />,
      low_stock: <Package size={20} />,
      stock_replenished: <CheckCircle size={20} />,
      system: <Settings size={20} />
    };
    return iconMap[type] || <Bell size={20} />;
  };

  const handleBulkAction = async (action) => {
    const promises = selectedNotifications.map(id => 
      action === 'markRead' ? markAsRead(id) : removeNotification(id)
    );
    await Promise.all(promises);
    setSelectedNotifications([]);
  };

  const handleSelectNotification = (id) => {
    setSelectedNotifications(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    }
  };

  const handleNotificationClick = async (notificationId, event) => {
    if (event.target.closest('.notification-actions')) return;
    handleSelectNotification(notificationId);
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      await markAsRead(notificationId);
    }
  };

  const getPriorityColor = (priority) => ({
    high: '#f56565', medium: '#ed8936', low: '#38a169'
  }[priority] || '#667eea');

  const getFilterCount = (filterType) => {
    if (filterType === 'all') return notifications.length;
    if (filterType === 'unread') return unreadCount;
    return notifications.filter(n => n.type === filterType).length;
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(amount);

  const navigationTabs = [
    { id: 'overview', label: 'All Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const renderTabContent = () => {
    if (activeTab === 'settings') {
      return (
        <div className="notification-settings-tab-content">
          <NotificationSettings embedded={true} />
        </div>
      );
    }
    return renderOverviewTab();
  };
  
  const renderOverviewTab = () => (
    <>
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
          {searchTerm && <button className="clear-search" onClick={() => setSearchTerm('')}><X size={16} /></button>}
        </div>
        <div className="filter-tabs">
          {[
            { key: 'all', label: 'All', icon: Bell },
            { key: 'unread', label: 'Unread', icon: Bell },
            { key: 'out_of_stock', label: 'Out of Stock', icon: AlertTriangle },
            { key: 'low_stock', label: 'Low Stock', icon: Package },
            { key: 'sales', label: 'Sales', icon: Bell },
            { key: 'system', label: 'System', icon: Settings }
          ].map(tab => (
            <button key={tab.key} className={`filter-tab ${filter === tab.key ? 'active' : ''}`} onClick={() => setFilter(tab.key)}>
              <tab.icon size={16} />
              {tab.label} ({getFilterCount(tab.key)})
            </button>
          ))}
        </div>
      </div>

      {selectedNotifications.length > 0 && (
        <div className="bulk-actions">
          <div className="bulk-info"><span>{selectedNotifications.length} selected</span></div>
          <div className="bulk-buttons">
            <button className="btn btn-secondary" onClick={() => handleBulkAction('markRead')}><Check size={16} /> Mark Read</button>
            <button className="btn btn-danger" onClick={() => handleBulkAction('remove')}><Trash2 size={16} /> Remove</button>
          </div>
        </div>
      )}

      <div className="notifications-container">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={64} />
            <h3>No notifications found</h3>
            <p>{searchTerm ? `No notifications match "${searchTerm}"` : `No ${filter} notifications to display`}</p>
          </div>
        ) : (
          <>
            <div className="notifications-list-header">
              <label className="select-all-checkbox">
                <input type="checkbox" checked={filteredNotifications.length > 0 && selectedNotifications.length === filteredNotifications.length} onChange={handleSelectAll} />
                <span className="checkmark"></span>
                Select All
              </label>
              <span className="results-count">{filteredNotifications.length} result{filteredNotifications.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="notifications-list">
              {filteredNotifications.map(notification => (
                <div key={notification.id} className={`notification-item ${notification.read ? 'read' : 'unread'} ${selectedNotifications.includes(notification.id) ? 'selected' : ''}`} onClick={(e) => handleNotificationClick(notification.id, e)} style={{ cursor: 'pointer' }}>
                  <div className="notification-select" onClick={(e) => e.stopPropagation()}>
                    <label className="checkbox"><input type="checkbox" checked={selectedNotifications.includes(notification.id)} onChange={() => handleSelectNotification(notification.id)} /><span className="checkmark"></span></label>
                  </div>
                  <div className="notification-icon-container">{getNotificationIcon(notification.type)}</div>
                  <div className="mobile-notification-body">
                    <div className="notification-row-mobile">
                      <h4 className="notification-title">{notification.title}</h4>
                      <span className="priority-badge" style={{ backgroundColor: getPriorityColor(notification.priority || 'medium') }}>{notification.priority || 'medium'}</span>
                    </div>
                    <div className="notification-row-mobile">
                      <div className="notification-message">{formatNotificationMessage(notification)}</div>
                      <span className="notification-time">{formatTimeAgo(notification.timestamp)}</span>
                    </div>
                    {(notification.slot || notification.price || notification.quantity !== undefined) && (
                      <div className="notification-details">
                        {notification.price && <div className="detail-badge">💵<span>{formatCurrency(notification.price)}</span></div>}
                        {notification.slot && <div className="detail-badge">📍<span>Slot: {notification.slot}</span></div>}
                        {notification.quantity !== undefined && <div className="detail-badge"><span>Qty: {notification.quantity}</span></div>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div className="header-left">
          <h1>Notifications</h1>
          <p>Stay updated with your vending machine activity</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => setShowSettings(true)}><Settings size={16} /> Settings</button>
          <button className="btn btn-primary" onClick={markAllAsRead} disabled={unreadCount === 0}><Check size={16} /> Mark All Read</button>
          {notifications.length > 0 && <button className="btn btn-danger" onClick={() => { if (window.confirm('Are you sure?')) clearAllNotifications(); }}><Trash2 size={16} /> Clear All</button>}
        </div>
      </div>

      {isMobile && (
        <div className="mobile-inventory-navigation">
          <div className="mobile-nav-tabs">
            {navigationTabs.map((tab) => (
              <button key={tab.id} className={`mobile-nav-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                <tab.icon size={20} /><span className="mobile-nav-label">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="notifications-content">{renderTabContent()}</div>

      {showSettings && !isMobile && <NotificationSettings isOpen={showSettings} onClose={() => setShowSettings(false)} embedded={false} />}
    </div>
  );
};

export default NotificationsPage;