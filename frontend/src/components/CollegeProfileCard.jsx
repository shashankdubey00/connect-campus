import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyAuth } from '../services/authService';
import './CollegeProfileCard.css'

const CollegeProfileCard = ({ college }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        const data = await verifyAuth();
        setIsAuthenticated(data.success);
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  if (!college) return null

  const { name, district, state, aisheCode } = college

  // Placeholder logo - can be replaced with actual logo URL later
  const logoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=120&background=00a8ff&color=fff&bold=true`

  const handleJoinCampus = () => {
    if (checkingAuth) return; // Wait for auth check to complete

    if (!isAuthenticated) {
      // Redirect to login with college context
      navigate('/login', {
        state: {
          college: college,
          returnPath: '/chat',
        },
      });
    } else {
      // User is authenticated - redirect to chat page with college context to open college profile
      navigate('/chat', {
        state: {
          college: college,
          openCollegeChat: true, // This will open college profile first, then user can join chat
        },
      });
    }
  }

  return (
    <div className="college-profile-card">
      <div className="college-card-header">
        <div className="college-logo">
          <img 
            src={logoUrl} 
            alt={`${name} logo`}
            onError={(e) => {
              // Fallback to a default placeholder if image fails to load
              e.target.src = 'https://via.placeholder.com/120/00a8ff/ffffff?text=' + encodeURIComponent(name.charAt(0))
            }}
          />
        </div>
      </div>

      <div className="college-card-body">
        <h3 className="college-name">{name}</h3>
        <div className="college-location">
          <span className="location-icon">📍</span>
          <span className="location-text">{district}, {state}</span>
        </div>
      </div>

      <div className="college-card-footer">
        <button 
          className="join-campus-btn"
          onClick={handleJoinCampus}
        >
          Join Campus
        </button>
      </div>
    </div>
  )
}

export default CollegeProfileCard




