import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  BarChart3, 
  Coffee
} from 'lucide-react'; // Removed unused ShoppingCart and Settings

const Sidebar = () => {
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

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          {/* You can replace ShoppingCart with your logo or keep it */}
          <span>🛒</span> 
        </div>
        <h2>Vending Admin</h2>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item-active' : ''}`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="machine-status">
          <div className="status-indicator online"></div>
          <span>Machine Online</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
