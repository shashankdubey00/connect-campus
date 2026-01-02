import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { login, getGoogleAuthUrl } from '../services/authService';
import './Auth.css';

// Detect Brave browser
const isBraveBrowser = () => {
  return (navigator.brave && navigator.brave.isBrave) || 
         (window.navigator.brave && window.navigator.brave.isBrave) ||
         false;
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBraveWarning, setShowBraveWarning] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Get college context from location state or URL params
  const collegeContext = location.state?.college || null;
  const returnPath = location.state?.returnPath || '/';
  const successMessage = location.state?.message || null;
  const inviteToken = location.state?.inviteToken || null;
  const groupInviteToken = location.state?.groupInviteToken || null;

  useEffect(() => {
    // Check if Brave browser
    if (isBraveBrowser()) {
      setShowBraveWarning(true);
    }

    // Check for error in URL params
    const urlParams = new URLSearchParams(location.search);
    const errorParam = urlParams.get('error');
    if (errorParam === 'google_auth_failed') {
      const braveMessage = isBraveBrowser()
        ? 'Google OAuth requires third-party cookies, which Brave browser blocks by default. Click the Brave icon (🦁) in your address bar → Settings → Shields → Turn OFF "Block cross-site cookies" for this site, OR use email/password login instead.'
        : 'Google authentication failed. If you\'re using incognito/private mode, third-party cookies may be blocked. Please try a normal browser window or use email/password login.';
      setError(braveMessage);
    }

    // Check if already logged in
    const checkAuth = async () => {
      try {
        const { verifyAuth } = await import('../services/authService');
        const data = await verifyAuth();
        if (data.success) {
          // Already logged in, redirect
          handleRedirect();
        }
      } catch (error) {
        // Not logged in, continue
      }
    };
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRedirect = () => {
    // If there's a group invite token, redirect back to group invite page
    if (groupInviteToken) {
      navigate(`/group-invite/${groupInviteToken}`);
      return;
    }
    
    // If there's an invite token, redirect back to invite page
    if (inviteToken) {
      navigate(`/invite/${inviteToken}`);
      return;
    }
    
    // Always redirect to landing page after login (profile will show, login/signup buttons hidden)
    if (collegeContext) {
      // Redirect back to college modal on home page
      navigate('/', { 
        state: { 
          openCollegeModal: true, 
          college: collegeContext 
        }
      });
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('[Login] Attempting login...');
      const data = await login(email, password);
      console.log('[Login] Login response:', data);
      
      if (data.success) {
        console.log('[Login] ✅ Login successful, waiting for cookie to be set...');
        // Wait a bit longer to ensure cookie is set before redirect
        // This is especially important for cross-domain cookies
        setTimeout(() => {
          console.log('[Login] Redirecting to landing page...');
          window.location.href = '/';
        }, 500);
      } else {
        setError(data.message || 'Login failed. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('[Login] Login error:', error);
      setError(error.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Store college context in sessionStorage before redirecting
    if (collegeContext) {
      sessionStorage.setItem('collegeContext', JSON.stringify(collegeContext));
      sessionStorage.setItem('returnPath', returnPath);
    }
    window.location.href = getGoogleAuthUrl();
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Login</h2>
        <p className="auth-subtitle">Welcome back! Please login to continue.</p>

        {error && <div className="auth-error">{error}</div>}
        {successMessage && <div className="auth-success">{successMessage}</div>}

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
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        {showBraveWarning && (
          <div style={{ 
            padding: '0.75rem', 
            marginBottom: '1rem', 
            backgroundColor: 'rgba(255, 193, 7, 0.1)', 
            border: '1px solid rgba(255, 193, 7, 0.3)', 
            borderRadius: '8px',
            fontSize: '0.875rem',
            color: '#ffc107'
          }}>
            <strong>⚠️ Brave Browser Notice:</strong> Google OAuth requires third-party cookies. Click the Brave icon (🦁) in your address bar → Shields → Turn OFF "Block cross-site cookies" for this site, or use email/password login below.
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="auth-button google-button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        <p className="auth-footer">
          Don't have an account? <Link to="/signup" state={{ college: collegeContext, returnPath }}>Sign up</Link>
        </p>

        <p className="auth-footer" style={{ marginTop: '0.5rem' }}>
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;


