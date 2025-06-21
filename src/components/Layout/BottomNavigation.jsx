import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  BarChart3, 
  Coffee,
  Bell
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext'; // CHANGED THIS LINE
import './BottomNavigation.css';

const BottomNavigation = () => {
  const location = useLocation();
  const { unreadCount } = useNotifications(); // CHANGED THIS LINE

  const navItems = [
    {
      path: '/dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard'
    },
    {
      path: '/inventory',
      icon: Package,
      label: 'Inventory'
    },
    {
      path: '/products',
      icon: Coffee,
      label: 'Products'
    },
    {
      path: '/sales',
      icon: BarChart3,
      label: 'Sales'
    },
    {
      path: '/notifications',
      icon: Bell,
      label: 'Notifications',
      badge: unreadCount > 0 ? unreadCount : null // SIMPLIFIED THIS LINE
    }
  ];

  return (
    <nav className="bottom-navigation" role="navigation" aria-label="Main navigation">
      <div className="bottom-nav-container">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`bottom-nav-item ${isActive ? 'bottom-nav-item-active' : ''}`}
              aria-label={`${item.label}${item.badge ? ` (${item.badge} unread)` : ''}`}
            >
              <div className="bottom-nav-icon">
                <item.icon 
                  size={22} 
                  strokeWidth={isActive ? 2.5 : 1.8}
                  aria-hidden="true" 
                />
                {item.badge && (
                  <span className="bottom-nav-badge" aria-hidden="true">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="bottom-nav-label">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;