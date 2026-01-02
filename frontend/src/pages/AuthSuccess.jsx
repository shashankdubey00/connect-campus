import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

const AuthSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check for college context in sessionStorage (from Google OAuth)
    const collegeContextStr = sessionStorage.getItem('collegeContext');
    const returnPath = sessionStorage.getItem('returnPath') || '/';

    // Clear sessionStorage
    sessionStorage.removeItem('collegeContext');
    sessionStorage.removeItem('returnPath');

    // Redirect after a short delay to allow cookie to be set
    // Use window.location to force full page reload so Navbar/Hero can detect auth cookie
    const timer = setTimeout(() => {
      window.location.href = '/';
    }, 1000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Authentication Successful!</h2>
        <p className="auth-subtitle">Redirecting you...</p>
      </div>
    </div>
  );
};

export default AuthSuccess;





