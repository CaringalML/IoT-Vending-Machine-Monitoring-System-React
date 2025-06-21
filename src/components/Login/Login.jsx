import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loginUser, resetPassword } from '../../services/auth';
import { LogIn, Eye, EyeOff, Mail, ArrowLeft, CheckCircle, WifiOff } from 'lucide-react';
import './Login.css';

const Login = () => {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Clear network error when back online
      if (error && (error.includes('Network') || error.includes('connection') || error.includes('internet'))) {
        setError('');
        setSuccess('Connection restored! You can try again.');
        setTimeout(() => setSuccess(''), 3000);
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setError('No internet connection. Please check your network.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [error]);

  // Check for success message from URL params
  useEffect(() => {
    const message = searchParams.get('message');
    if (message === 'password-reset-sent') {
      setSuccess('Password reset email sent! Please check your inbox.');
      
      // Clear the success message after 5 seconds
      setTimeout(() => {
        setSuccess('');
      }, 5000);
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check online status before attempting login
    if (!navigator.onLine) {
      setError('No internet connection. Please check your network and try again.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await loginUser(formData.email, formData.password);
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!resetEmail) {
      setError('Please enter your email address');
      return;
    }

    // Check online status before attempting password reset
    if (!navigator.onLine) {
      setError('No internet connection. Please check your network and try again.');
      return;
    }

    setResetLoading(true);
    setError('');
    setSuccess('');

    try {
      await resetPassword(resetEmail);
      setSuccess('Password reset email sent! Check your inbox.');
      // Auto switch back to login after 3 seconds
      setTimeout(() => {
        setShowForgotPassword(false);
        setSuccess('');
        setFormData({ ...formData, email: resetEmail }); // Pre-fill email
      }, 3000);
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error.message);
    } finally {
      setResetLoading(false);
    }
  };

  const switchToForgotPassword = () => {
    setShowForgotPassword(true);
    setResetEmail(formData.email); // Pre-fill with current email
    setError('');
    setSuccess('');
  };

  const switchToLogin = () => {
    setShowForgotPassword(false);
    setError('');
    setSuccess('');
  };

  // Network status indicator (only show when offline)
  const NetworkIndicator = () => {
    if (isOnline) return null;
    
    return (
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
        color: '#f56565',
        background: '#fed7d7',
        padding: '4px 8px',
        borderRadius: '6px',
        border: '1px solid #fca5a5'
      }}>
        <WifiOff size={14} />
        Offline
      </div>
    );
  };

  if (showForgotPassword) {
    return (
      <div className="login-container">
        <div className="login-card" style={{ position: 'relative' }}>
          <NetworkIndicator />
          
          <div className="login-header">
            <div className="login-logo">
              <Mail size={32} />
            </div>
            <h1>Reset Password</h1>
            <p>Enter your email to receive a password reset link</p>
          </div>

          <form onSubmit={handleForgotPassword} className="login-form">
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {success && (
              <div className="success-message">
                <CheckCircle size={16} />
                {success}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="resetEmail" className="form-label">
                Email Address
              </label>
              <input
                type="email"
                id="resetEmail"
                value={resetEmail}
                onChange={(e) => {
                  setResetEmail(e.target.value);
                  if (error) setError('');
                }}
                className="form-input"
                placeholder="admin@example.com"
                required
                disabled={!isOnline}
              />
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={resetLoading || !isOnline}
            >
              {resetLoading ? (
                <div className="loading-spinner"></div>
              ) : (
                <>
                  <Mail size={18} />
                  Send Reset Email
                </>
              )}
            </button>

            <button
              type="button"
              className="back-to-login"
              onClick={switchToLogin}
            >
              <ArrowLeft size={16} />
              Back to Login
            </button>
          </form>

          <div className="login-footer">
            <p>© 2025 Vending Machine Admin System</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card" style={{ position: 'relative' }}>
        <NetworkIndicator />
        
        <div className="login-header">
          <div className="login-logo">
            <LogIn size={32} />
          </div>
          <h1>Vending Machine Admin</h1>
          <p>Sign in to your admin dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              <CheckCircle size={16} />
              {success}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="admin@example.com"
              required
              disabled={!isOnline}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input password-input"
                placeholder="Enter your password"
                required
                disabled={!isOnline}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={!isOnline}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="forgot-password-link">
            <button
              type="button"
              className="forgot-password-btn"
              onClick={switchToForgotPassword}
              disabled={!isOnline}
            >
              Forgot your password?
            </button>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading || !isOnline}
          >
            {loading ? (
              <div className="loading-spinner"></div>
            ) : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>

          {!isOnline && (
            <div style={{
              textAlign: 'center',
              marginTop: '16px',
              padding: '12px',
              background: '#fed7d7',
              color: '#742a2a',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              <WifiOff size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              You're currently offline. Please check your internet connection.
            </div>
          )}
        </form>

        <div className="login-footer">
          <p>© 2025 Vending Machine Admin System</p>
        </div>
      </div>
    </div>
  );
};

export default Login;