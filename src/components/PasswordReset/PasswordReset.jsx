import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import './PasswordReset.css';

const PasswordReset = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Verify reset code on mount
  useEffect(() => {
    const verifyCode = async () => {
      if (mode === 'resetPassword' && oobCode) {
        try {
          const email = await verifyPasswordResetCode(auth, oobCode);
          setEmail(email);
        } catch (err) {
          console.error('Verification error:', err);
          const message = err?.code === 'auth/expired-action-code'
            ? 'This reset link has expired. Request a new one.'
            : err?.code === 'auth/invalid-action-code'
            ? 'Invalid reset link. Please request a new one.'
            : 'Error verifying reset link.';
          setError(message);
        }
      } else {
        setError('Invalid password reset link.');
      }
      setVerifying(false);
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
    if (validationError) return setError(validationError);
    if (formData.newPassword !== formData.confirmPassword)
      return setError('Passwords do not match.');

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, formData.newPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login?passwordResetSuccess=true'), 3000);
    } catch (err) {
      console.error('Reset error:', err);
      const message = err?.code === 'auth/expired-action-code'
        ? 'Reset link expired. Request a new one.'
        : err?.code === 'auth/invalid-action-code'
        ? 'Invalid reset link. Request a new one.'
        : err?.code === 'auth/weak-password'
        ? 'Password is too weak.'
        : 'Failed to reset password. Try again.';
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
    return [
      { label: 'Very Weak', color: '#f56565' },
      { label: 'Weak', color: '#ed8936' },
      { label: 'Fair', color: '#ecc94b' },
      { label: 'Good', color: '#48bb78' },
      { label: 'Strong', color: '#38a169' }
    ][Math.max(0, Math.min(score - 1, 4))];
  };

  // Conditional UI rendering
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
          <CheckCircle size={48} className="success-icon" />
          <h1>Password Reset Successful!</h1>
          <p>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (error && (!oobCode || !email)) {
    return (
      <div className="password-reset-container">
        <div className="password-reset-card">
          <AlertCircle size={48} className="error-icon" />
          <h1>Error</h1>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/login')}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const pwdStrength = passwordStrength(formData.newPassword);
  const { label, color } = strengthLabel(pwdStrength);

  return (
    <div className="password-reset-container">
      <div className="password-reset-card">
        <Lock size={32} />
        <h1>Set New Password</h1>
        <p>Enter a new password for {email}</p>

        <form onSubmit={handleSubmit} className="password-reset-form">
          {error && <div className="error-message"><AlertCircle size={16} /> {error}</div>}

          <div className="form-group">
            <label>New Password</label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {formData.newPassword && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div style={{ width: `${(pwdStrength / 5) * 100}%`, backgroundColor: color }}></div>
                </div>
                <span style={{ color }}>{label}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Confirm New Password</label>
            <div className="password-input-container">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {formData.confirmPassword && (
              <div>
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
              <li className={/[a-z]/.test(formData.newPassword) ? 'valid' : ''}>Lowercase letter</li>
              <li className={/[A-Z]/.test(formData.newPassword) ? 'valid' : ''}>Uppercase letter</li>
              <li className={/\d/.test(formData.newPassword) ? 'valid' : ''}>Number</li>
              <li className={/.{6,}/.test(formData.newPassword) ? 'valid' : ''}>At least 6 characters</li>
            </ul>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordReset;
