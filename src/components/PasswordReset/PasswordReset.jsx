import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import './PasswordReset.css';

const PasswordReset = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');

  useEffect(() => {
    // Verify the reset code when component mounts
    if (mode === 'resetPassword' && oobCode) {
      verifyResetCode();
    } else {
      setError('Invalid password reset link');
      setVerifying(false);
    }
  }, [oobCode, mode]);

  const verifyResetCode = async () => {
    try {
      const email = await verifyPasswordResetCode(auth, oobCode);
      setEmail(email);
      setVerifying(false);
    } catch (error) {
      console.error('Error verifying reset code:', error);
      switch (error.code) {
        case 'auth/expired-action-code':
          setError('Password reset link has expired. Please request a new one.');
          break;
        case 'auth/invalid-action-code':
          setError('Invalid password reset link. Please request a new one.');
          break;
        case 'auth/user-disabled':
          setError('This account has been disabled.');
          break;
        case 'auth/user-not-found':
          setError('No account found with this email address.');
          break;
        default:
          setError('Invalid or expired password reset link.');
      }
      setVerifying(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error && !success) {
      setError('');
    }
  };

  const validatePassword = (password) => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords
    const passwordError = validatePassword(formData.newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await confirmPasswordReset(auth, oobCode, formData.newPassword);
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login?passwordResetSuccess=true');
      }, 3000);
      
    } catch (error) {
      console.error('Error resetting password:', error);
      switch (error.code) {
        case 'auth/expired-action-code':
          setError('Password reset link has expired. Please request a new one.');
          break;
        case 'auth/invalid-action-code':
          setError('Invalid password reset link. Please request a new one.');
          break;
        case 'auth/weak-password':
          setError('Password is too weak. Please choose a stronger password.');
          break;
        default:
          setError('Failed to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (/(?=.*[a-z])/.test(password)) strength++;
    if (/(?=.*[A-Z])/.test(password)) strength++;
    if (/(?=.*\d)/.test(password)) strength++;
    if (/(?=.*[@$!%*?&])/.test(password)) strength++;
    return strength;
  };

  const getStrengthLabel = (strength) => {
    switch (strength) {
      case 0:
      case 1: return { label: 'Very Weak', color: '#f56565' };
      case 2: return { label: 'Weak', color: '#ed8936' };
      case 3: return { label: 'Fair', color: '#ecc94b' };
      case 4: return { label: 'Good', color: '#48bb78' };
      case 5: return { label: 'Strong', color: '#38a169' };
      default: return { label: 'Very Weak', color: '#f56565' };
    }
  };

  if (verifying) {
    return (
      <div className="password-reset-container">
        <div className="password-reset-card">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Verifying reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="password-reset-container">
        <div className="password-reset-card">
          <div className="success-state">
            <CheckCircle size={48} className="success-icon" />
            <h1>Password Reset Successful!</h1>
            <p>Your password has been updated successfully.</p>
            <p>Redirecting to login page...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !oobCode) {
    return (
      <div className="password-reset-container">
        <div className="password-reset-card">
          <div className="error-state">
            <AlertCircle size={48} className="error-icon" />
            <h1>Invalid Reset Link</h1>
            <p>{error}</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/login')}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const passwordStrength = getPasswordStrength(formData.newPassword);
  const strengthInfo = getStrengthLabel(passwordStrength);

  return (
    <div className="password-reset-container">
      <div className="password-reset-card">
        <div className="password-reset-header">
          <div className="password-reset-logo">
            <Lock size={32} />
          </div>
          <h1>Set New Password</h1>
          <p>Enter a new password for {email}</p>
        </div>

        <form onSubmit={handleSubmit} className="password-reset-form">
          {error && (
            <div className="error-message">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="newPassword" className="form-label">
              New Password
            </label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                className="form-input password-input"
                placeholder="Enter your new password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {formData.newPassword && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div 
                    className="strength-fill"
                    style={{ 
                      width: `${(passwordStrength / 5) * 100}%`,
                      backgroundColor: strengthInfo.color
                    }}
                  ></div>
                </div>
                <span 
                  className="strength-label"
                  style={{ color: strengthInfo.color }}
                >
                  {strengthInfo.label}
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm New Password
            </label>
            <div className="password-input-container">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="form-input password-input"
                placeholder="Confirm your new password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {formData.confirmPassword && formData.newPassword && (
              <div className="password-match">
                {formData.newPassword === formData.confirmPassword ? (
                  <span className="match-success">✓ Passwords match</span>
                ) : (
                  <span className="match-error">✗ Passwords do not match</span>
                )}
              </div>
            )}
          </div>

          <div className="password-requirements">
            <p>Password must contain:</p>
            <ul>
              <li className={/(?=.*[a-z])/.test(formData.newPassword) ? 'valid' : ''}>
                At least one lowercase letter
              </li>
              <li className={/(?=.*[A-Z])/.test(formData.newPassword) ? 'valid' : ''}>
                At least one uppercase letter
              </li>
              <li className={/(?=.*\d)/.test(formData.newPassword) ? 'valid' : ''}>
                At least one number
              </li>
              <li className={formData.newPassword.length >= 6 ? 'valid' : ''}>
                At least 6 characters
              </li>
            </ul>
          </div>

          <button
            type="submit"
            className="password-reset-button"
            disabled={loading || formData.newPassword !== formData.confirmPassword || !formData.newPassword}
          >
            {loading ? (
              <div className="loading-spinner"></div>
            ) : (
              <>
                <Lock size={18} />
                Update Password
              </>
            )}
          </button>

          <button
            type="button"
            className="back-to-login"
            onClick={() => navigate('/login')}
          >
            Back to Login
          </button>
        </form>

        <div className="password-reset-footer">
          <p>© 2025 Vending Machine Admin System</p>
        </div>
      </div>
    </div>
  );
};

export default PasswordReset;