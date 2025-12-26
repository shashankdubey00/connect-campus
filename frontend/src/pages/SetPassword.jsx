import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { verifyAuth, setPassword } from '../services/authService';
import PasswordStrength from '../components/PasswordStrength';
import './Auth.css';

const SetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated and is a Google user without password
    const checkUser = async () => {
      try {
        const data = await verifyAuth();
        if (!data.success || !data.user) {
          navigate('/login');
          return;
        }
        // Check if user already has a password set
        if (data.user.hasPassword) {
          // User already has password, redirect to change password instead
          navigate('/change-password');
          return;
        }
        // Check if user is a Google user
        if (!data.user.googleId) {
          // Not a Google user, shouldn't be here
          navigate('/');
          return;
        }
      } catch (error) {
        navigate('/login');
      }
    };
    checkUser();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const data = await setPassword(password);
      if (data.success) {
        // Refresh the page to update navbar with new password status
        window.location.href = '/';
      }
    } catch (error) {
      setError(error.message || 'Failed to set password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Set Password</h2>
        <p className="auth-subtitle">
          Set a password for your account to enable email/password login.
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Create a password"
            />
            <PasswordStrength password={password} />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm your password"
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Setting Password...' : 'Set Password'}
          </button>
        </form>

        <p className="auth-footer">
          <Link to="/">Back to Home</Link>
        </p>
      </div>
    </div>
  );
};

export default SetPassword;

