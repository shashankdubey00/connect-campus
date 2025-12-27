import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { forgotPassword } from '../services/authService';
import './Auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const data = await forgotPassword(email);
      if (data.success) {
        setSuccess(true);
        // Redirect to verify OTP page after 2 seconds
        setTimeout(() => {
          navigate('/verify-otp', { state: { email } });
        }, 2000);
      }
    } catch (error) {
      setError(error.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Forgot Password</h2>
        <p className="auth-subtitle">
          Enter your email address and we'll send you an OTP to reset your password.
        </p>

        {error && <div className="auth-error">{error}</div>}
        {success && (
          <div className="auth-success">
            OTP has been sent to your email. Redirecting...
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              disabled={success}
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading || success}>
            {loading ? 'Sending OTP...' : success ? 'OTP Sent!' : 'Send OTP'}
          </button>
        </form>

        <p className="auth-footer">
          Remember your password? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;


