import React, { useState } from 'react';
import { logoutUser } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { Bell, User, LogOut, Settings } from 'lucide-react';

const Header = () => {
  const { user } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="page-title">Dashboard</h1>
        </div>

        <div className="header-right">
          <button className="notification-btn">
            <Bell size={20} />
            <span className="notification-badge">3</span>
          </button>

          <div className="user-menu-container">
            <button 
              className="user-menu-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="user-avatar">
                <User size={18} />
              </div>
              <span className="user-name">
                {user?.email?.split('@')[0] || 'Admin'}
              </span>
            </button>

            {showUserMenu && (
              <div className="user-menu">
                <div className="user-menu-header">
                  <div className="user-info">
                    <p className="user-email">{user?.email}</p>
                    <p className="user-role">Administrator</p>
                  </div>
                </div>
                <div className="user-menu-divider"></div>
                <button className="user-menu-item">
                  <Settings size={16} />
                  Settings
                </button>
                <button 
                  className="user-menu-item logout"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;