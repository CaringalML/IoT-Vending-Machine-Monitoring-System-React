import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './components/Layout/Layout';
import Login from './components/Login/Login';
import PasswordReset from './components/PasswordReset/PasswordReset';
import Dashboard from './components/Dashboard/Dashboard';
import Inventory from './components/Inventory/Inventory';
import Products from './components/Products/Products';
import Sales from './components/Sales/Sales';
import NotificationsPage from './components/Notifications/NotificationsPage';
import LoadingSpinner from './components/Common/LoadingSpinner';
import './App.css';

// The full-screen initial loading screen, now using the Firebase-inspired spinner.
const InitialLoader = () => (
  <div className="initial-loader" style={{
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  }}>
    {/* Using the new spinner with a custom color */}
    <LoadingSpinner size="large" color="#FFCA28" /> 
    <div style={{ color: 'white', fontSize: '18px', fontWeight: 500, marginTop: '24px', textAlign: 'center' }}>
      Vending Machine Admin
    </div>
    <div style={{ color: 'white', fontSize: '14px', opacity: 0.8, marginTop: '8px', textAlign: 'center', padding: '0 20px' }}>
      Loading your professional IoT management platform...
    </div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

function AppContent() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          console.log('Notification permission:', permission);
        });
      }
      console.log('Notification service initialized for authenticated user');
    }
  }, [isAuthenticated]);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><PasswordReset /></PublicRoute>} />
          <Route path="/__/auth/action" element={<PasswordReset />} />
          <Route path="/auth/action" element={<PasswordReset />} />
          <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute><Layout><Inventory /></Layout></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute><Layout><Products /></Layout></ProtectedRoute>} />
          <Route path="/sales" element={<ProtectedRoute><Layout><Sales /></Layout></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Layout><NotificationsPage /></Layout></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

function AppInitializer() {
    const { loading } = useAuth();
    return loading ? <InitialLoader /> : <AppContent />;
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppInitializer />
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
