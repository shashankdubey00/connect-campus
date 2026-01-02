import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyAuth } from '../services/authService';
import './Auth.css';

const AuthSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // Check for college context in sessionStorage (from Google OAuth)
        const collegeContextStr = sessionStorage.getItem('collegeContext');
        const returnPath = sessionStorage.getItem('returnPath') || '/';

        // Clear sessionStorage
        sessionStorage.removeItem('collegeContext');
        sessionStorage.removeItem('returnPath');

        // Wait a bit for cookie to be set
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Verify that authentication actually worked (cookie was set)
        console.log('[AuthSuccess] Verifying authentication...');
        const authResult = await verifyAuth();
        
        if (authResult.success) {
          console.log('[AuthSuccess] ✅ Authentication verified, redirecting...');
          // Use window.location to force full page reload so Navbar/Hero can detect auth cookie
          window.location.href = '/';
        } else {
          console.error('[AuthSuccess] ❌ Authentication failed - cookie may be blocked');
          setError('Authentication failed. This is likely due to third-party cookie blocking in incognito/private mode or Brave browser. Please try: 1) Use a normal browser window (not incognito), 2) Enable third-party cookies in your browser settings, or 3) Use email/password login instead.');
          setChecking(false);
        }
      } catch (error) {
        console.error('[AuthSuccess] Error verifying auth:', error);
        setError('Authentication verification failed. Please try logging in again.');
        setChecking(false);
      }
    };

    checkAuthAndRedirect();
  }, [navigate]);

  // Check for error in URL params
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError('Google authentication failed. Please try again.');
      setChecking(false);
    }
  }, [searchParams]);

  return (
    <div className="auth-container">
      <div className="auth-card">
        {error ? (
          <>
            <h2 className="auth-title" style={{ color: '#ff4444' }}>Authentication Error</h2>
            <p className="auth-subtitle">{error}</p>
            <button
              className="auth-button"
              onClick={() => navigate('/login')}
              style={{ marginTop: '1rem' }}
            >
              Back to Login
            </button>
          </>
        ) : checking ? (
          <>
            <h2 className="auth-title">Authentication Successful!</h2>
            <p className="auth-subtitle">Verifying and redirecting you...</p>
          </>
        ) : (
          <>
            <h2 className="auth-title">Authentication Successful!</h2>
            <p className="auth-subtitle">Redirecting you...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthSuccess;





