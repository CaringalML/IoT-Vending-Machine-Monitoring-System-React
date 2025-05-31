import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import './PasswordReset.css';

const PasswordReset = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get parameters from URL
  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');
  const continueUrl = searchParams.get('continueUrl');

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Debug: Log URL parameters
  useEffect(() => {
    console.log('PasswordReset - URL Parameters:', {
      oobCode,
      mode,
      continueUrl,
      fullURL: window.location.href,
      searchParams: searchParams.toString()
    });
  }, [oobCode, mode, continueUrl, searchParams]);

  // Verify reset code on mount
  useEffect(() => {
    const verifyCode = async () => {
      // Check if we have the required parameters
      if (!oobCode) {
        console.log('No oobCode found in URL');
        setError('Missing reset code. Please use the link from your email.');
        setVerifying(false);
        return;
      }

      // For password reset, mode should be 'resetPassword' or might be missing
      if (mode && mode !== 'resetPassword') {
        console.log('Invalid mode:', mode);
        setError('Invalid reset link. Please request a new password reset.');
        setVerifying(false);
        return;
      }

      try {
        console.log('Verifying code:', oobCode);
        const email = await verifyPasswordResetCode(auth, oobCode);
        console.log('Code verified for email:', email);
        setEmail(email);
        setError('');
      } catch (err) {
        console.error('Verification error:', err);
        let message = 'Error verifying reset link.';
        
        switch (err?.code) {
          case 'auth/expired-action-code':
            message = 'This reset link has expired. Please request a new one.';
            break;
          case 'auth/invalid-action-code':
            message = 'Invalid reset link. Please request a new one.';
            break;
          case 'auth/user-disabled':
            message = 'This account has been disabled.';
            break;
          case 'auth/user-not-found':
            message = 'No account found for this reset link.';
            break;
          case 'auth/weak-password':
            message = 'Password is too weak.';
            break;
          default:
            message = err.message || 'Failed to verify reset link.';
        }
        setError(message);
      } finally {
        setVerifying(false);
      }
    };

    verifyCode();
  }, [oobCode, mode]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(''); // Clear error on input
  }, [error]);

  const validatePassword = (pwd) => {
    if (pwd.length < 6) return 'Password must be at least 6 characters.';
    if (!/[a-z]/.test(pwd)) return 'Must include a lowercase letter.';
    if (!/[A-Z]/.test(pwd)) return 'Must include an uppercase letter.';
    if (!/\d/.test(pwd)) return 'Must include a number.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validatePassword(formData.newPassword);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log('Confirming password reset with code:', oobCode);
      await confirmPasswordReset(auth, oobCode, formData.newPassword);
      console.log('Password reset successful');
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login?message=password-reset-success');
      }, 3000);
    } catch (err) {
      console.error('Reset error:', err);
      let message = 'Failed to reset password. Please try again.';
      
      switch (err?.code) {
        case 'auth/expired-action-code':
          message = 'Reset link has expired. Please request a new one.';
          break;
        case 'auth/invalid-action-code':
          message = 'Invalid reset link. Please request a new one.';
          break;
        case 'auth/weak-password':
          message = 'Password is too weak. Please choose a stronger password.';
          break;
        default:
          message = err.message || 'Failed to reset password. Please try again.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 6) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[@$!%*?&]/.test(pwd)) score++;
    return score;
  };

  const strengthLabel = (score) => {
    const labels = [
      { label: 'Very Weak', color: '#f56565' },
      { label: 'Weak', color: '#ed8936' },
      { label: 'Fair', color: '#ecc94b' },
      { label: 'Good', color: '#48bb78' },
      { label: 'Strong', color: '#38a169' }
    ];
    return labels[Math.max(0, Math.min(score - 1, 4))] || labels[0];
  };

  // Loading state
  if (verifying) {
    return (
      <div className="password-reset-container">
        <div className="password-reset-card">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <h1>Verifying Reset Link...</h1>
            <p>Please wait while we verify your password reset link.</p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="password-reset-container">
        <div className="password-reset-card">
          <div className="success-state">
            <CheckCircle size={48} className="success-icon" />
            <h1>Password Reset Successful!</h1>
            <p>Your password has been successfully reset.</p>
            <p>Redirecting to login page...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state (when we can't proceed)
  if (error && (!oobCode || !email)) {
    return (
      <div className="password-reset-container">
        <div className="password-reset-card">
          <div className="error-state">
            <AlertCircle size={48} className="error-icon" />
            <h1>Reset Link Error</h1>
            <p>{error}</p>
            <button 
              className="btn btn-primary" 
              onClick={() => navigate('/login')}
              style={{ marginTop: '20px' }}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pwdStrength = passwordStrength(formData.newPassword);
  const { label, color } = strengthLabel(pwdStrength);

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
                onChange={handleChange}
                className="form-input password-input"
                placeholder="Enter new password"
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
                      width: `${(pwdStrength / 5) * 100}%`, 
                      backgroundColor: color 
                    }}
                  ></div>
                </div>
                <span className="strength-label" style={{ color }}>
                  {label}
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
                onChange={handleChange}
                className="form-input password-input"
                placeholder="Confirm new password"
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
            {formData.confirmPassword && (
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
              <li className={/[a-z]/.test(formData.newPassword) ? 'valid' : ''}>
                Lowercase letter
              </li>
              <li className={/[A-Z]/.test(formData.newPassword) ? 'valid' : ''}>
                Uppercase letter
              </li>
              <li className={/\d/.test(formData.newPassword) ? 'valid' : ''}>
                Number
              </li>
              <li className={/.{6,}/.test(formData.newPassword) ? 'valid' : ''}>
                At least 6 characters
              </li>
            </ul>
          </div>

          <button 
            type="submit" 
            className="password-reset-button"
            disabled={loading || !formData.newPassword || !formData.confirmPassword}
          >
            {loading ? (
              <>
                <div className="loading-spinner"></div>
                Resetting Password...
              </>
            ) : (
              <>
                <Lock size={18} />
                Reset Password
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