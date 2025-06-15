import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  BarChart3, 
  Coffee
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
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
    }
  ];

  // Close sidebar on escape key (desktop only)
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen && window.innerWidth > 768) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Only render sidebar content (no mobile overlay since sidebar is desktop-only now)
  return (
    <div className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span role="img" aria-label="Shopping cart">🛒</span>
        </div>
        <h2>Vending Admin</h2>
      </div>

      <nav className="sidebar-nav" role="navigation" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item-active' : ''}`
            }
            aria-label={item.label}
          >
            <item.icon size={20} aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="machine-status">
          <div className="status-indicator online" aria-hidden="true"></div>
          <span>Machine Online</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;