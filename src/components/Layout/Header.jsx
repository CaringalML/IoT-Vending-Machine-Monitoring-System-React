import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { logoutUser } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { Bell, User, LogOut, Settings, Menu, X } from 'lucide-react';
import NotificationDropdown from '../Notifications/NotificationDropdown';
import NotificationSettings from '../Notifications/NotificationSettings';
import notificationService from '../../services/NotificationService';

const Header = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  
  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);

  // Get page title based on current route
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return 'Dashboard';
      case '/inventory':
        return 'Inventory Management';
      case '/products':
        return 'Product Management';
      case '/sales':
        return 'Sales Analytics';
      case '/notifications':
        return 'All Notifications';
      default:
        return 'Dashboard';
    }
  };

  // Get short page title for mobile
  const getShortPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return 'Dashboard';
      case '/inventory':
        return 'Inventory';
      case '/products':
        return 'Products';
      case '/sales':
        return 'Sales';
      case '/notifications':
        return 'Notifications';
      default:
        return 'Dashboard';
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close dropdowns on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowUserMenu(false);
        setShowNotifications(false);
        setShowNotificationSettings(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);
  };

  const handleUserMenuClick = () => {
    setShowUserMenu(!showUserMenu);
    setShowNotifications(false);
  };

  const handleOpenNotificationSettings = () => {
    setShowNotifications(false);
    setShowNotificationSettings(true);
  };

  const handleCloseNotificationSettings = () => {
    setShowNotificationSettings(false);
  };

  // Subscribe to real notification count updates
  useEffect(() => {
    const unsubscribe = notificationService.addListener((notifications, unreadCount) => {
      setNotificationCount(unreadCount);
    });

    // Initial load
    setNotificationCount(notificationService.getUnreadCount());

    return unsubscribe;
  }, []);

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          {/* Mobile menu button */}
          <button 
            className="mobile-menu-btn"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation menu"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <div className="page-title-container">
            <h1 className="page-title desktop-title">{getPageTitle()}</h1>
            <h1 className="page-title mobile-title">{getShortPageTitle()}</h1>
          </div>
        </div>

        <div className="header-right">
          {/* Notification Button */}
          <div className="notification-container" ref={notificationRef}>
            <button 
              className="notification-btn"
              onClick={handleNotificationClick}
              title="Notifications"
              aria-label={`Notifications ${notificationCount > 0 ? `(${notificationCount} unread)` : ''}`}
            >
              <Bell size={20} />
              {notificationCount > 0 && (
                <span className="notification-badge" aria-hidden="true">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            <NotificationDropdown
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
              onOpenSettings={handleOpenNotificationSettings}
            />
          </div>

          {/* User Menu */}
          <div className="user-menu-container" ref={userMenuRef}>
            <button 
              className="user-menu-btn"
              onClick={handleUserMenuClick}
              title="User menu"
              aria-label="User menu"
              aria-expanded={showUserMenu}
            >
              <div className="user-avatar">
                <User size={18} />
              </div>
              <span className="user-name">
                {user?.email?.split('@')[0] || 'Admin'}
              </span>
            </button>

            {showUserMenu && (
              <div className="user-menu" role="menu">
                <div className="user-menu-header">
                  <div className="user-info">
                    <p className="user-email">{user?.email}</p>
                    <p className="user-role">Administrator</p>
                  </div>
                </div>
                <div className="user-menu-divider"></div>
                <button 
                  className="user-menu-item"
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowNotificationSettings(true);
                  }}
                  role="menuitem"
                >
                  <Settings size={16} />
                  Settings
                </button>
                <button 
                  className="user-menu-item logout"
                  onClick={handleLogout}
                  role="menuitem"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notification Settings Modal */}
      <NotificationSettings
        isOpen={showNotificationSettings}
        onClose={handleCloseNotificationSettings}
      />
    </header>
  );
};

export default Header;