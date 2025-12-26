import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { verifyAuth } from '../services/authService';
import PasswordStrength from '../components/PasswordStrength';
import './Auth.css';

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if coming from forgot password flow or logged-in user
  const email = location.state?.email || '';
  const resetToken = location.state?.resetToken || '';
  const isFromForgotPassword = !!email && !!resetToken;

  useEffect(() => {
    if (!isFromForgotPassword) {
      // Check if user is authenticated
      const checkAuth = async () => {
        try {
          const data = await verifyAuth();
          if (!data.success || !data.user) {
            navigate('/login');
          }
        } catch (error) {
          navigate('/login');
        }
      };
      checkAuth();
    }
  }, [isFromForgotPassword, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      if (isFromForgotPassword) {
        // From forgot password flow
        const { resetPassword } = await import('../services/authService');
        const data = await resetPassword(email, resetToken, newPassword);
        if (data.success) {
          navigate('/login', {
            state: {
              message: 'Password reset successfully! Please login with your new password.',
            },
          });
        }
      } else {
        // From logged-in user (change password)
        // TODO: Implement change password API for logged-in users
        setError('Change password for logged-in users coming soon');
        // const { changePassword } = await import('../services/authService');
        // const data = await changePassword(currentPassword, newPassword);
        // if (data.success) {
        //   navigate('/', { state: { message: 'Password changed successfully!' } });
        // }
      }
    } catch (error) {
      setError(error.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">
          {isFromForgotPassword ? 'Reset Password' : 'Change Password'}
        </h2>
        <p className="auth-subtitle">
          {isFromForgotPassword 
            ? 'Enter your new password below.' 
            : 'Enter your current password and new password.'}
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isFromForgotPassword && (
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="Enter current password"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="Enter new password"
            />
            <PasswordStrength password={newPassword} />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm new password"
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading 
              ? (isFromForgotPassword ? 'Resetting Password...' : 'Changing Password...') 
              : (isFromForgotPassword ? 'Reset Password' : 'Change Password')}
          </button>
        </form>

        <p className="auth-footer">
          {isFromForgotPassword ? (
            <>
              Remember your password? <Link to="/login">Login</Link>
            </>
          ) : (
            <Link to="/">Back to Home</Link>
          )}
        </p>
      </div>
    </div>
  );
};

export default ChangePassword;
