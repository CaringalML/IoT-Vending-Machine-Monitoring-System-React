import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './components/Login/Login';
import PasswordReset from './components/PasswordReset/PasswordReset';
import Dashboard from './components/Dashboard/Dashboard';
import Inventory from './components/Inventory/Inventory';
import Products from './components/Products/Products';
import Sales from './components/Sales/Sales';
import LoadingSpinner from './components/Common/LoadingSpinner';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <LoadingSpinner text="Loading..." />
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <LoadingSpinner text="Loading..." />
      </div>
    );
  }
  
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

function AppContent() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Standard auth routes */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          
          {/* Custom password reset route */}
          <Route 
            path="/reset-password" 
            element={
              <PublicRoute>
                <PasswordReset />
              </PublicRoute>
            } 
          />
          
          {/* Firebase Auth Action Handler - This is the key route! */}
          <Route 
            path="/__/auth/action" 
            element={<PasswordReset />}
          />
          
          {/* Alternative Firebase auth paths (backup) */}
          <Route 
            path="/auth/action" 
            element={<PasswordReset />}
          />
          
          {/* Protected routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/inventory" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Inventory />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/products" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Products />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/sales" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Sales />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          {/* Default redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;