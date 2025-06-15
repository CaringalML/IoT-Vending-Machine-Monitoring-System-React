import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNavigation from './BottomNavigation';
import './Layout.css';

const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const location = useLocation();

  // Get current page name from route
  const getCurrentPage = () => {
    const path = location.pathname;
    if (path.includes('/sales')) return 'sales';
    if (path.includes('/products')) return 'products';
    if (path.includes('/inventory')) return 'inventory';
    if (path.includes('/dashboard')) return 'dashboard';
    if (path.includes('/notifications')) return 'notifications';
    return 'default';
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      
      // Auto-close sidebar on desktop
      if (!mobile) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    // Only allow sidebar toggle on desktop, since mobile uses bottom navigation
    if (!isMobile) {
      setIsSidebarOpen(!isSidebarOpen);
    }
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="layout">
      {/* Desktop Sidebar - hidden on mobile */}
      {!isMobile && (
        <Sidebar 
          isOpen={true} 
          onClose={closeSidebar}
        />
      )}
      
      <div 
        className={`main-content ${!isMobile ? 'desktop-sidebar' : 'mobile-bottom-nav'}`}
        data-page={getCurrentPage()}
      >
        <Header 
          onToggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
          isMobile={isMobile}
        />
        <main className="content">
          {children}
        </main>
      </div>
      
      {/* Mobile Bottom Navigation - hidden on desktop */}
      {isMobile && <BottomNavigation />}
    </div>
  );
};

export default Layout;