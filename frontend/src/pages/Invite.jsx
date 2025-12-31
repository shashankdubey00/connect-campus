import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInviteDetails, joinViaInvite } from '../services/inviteService';
import { verifyAuth } from '../services/authService';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import CollegeProfileCard from '../components/CollegeProfileCard';
import './Invite.css';

const Invite = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [inviteData, setInviteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [joining, setJoining] = useState(false);
  const { showToast, hideToast, toast } = useToast();

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

  useEffect(() => {
    // Load invite details
    const loadInvite = async () => {
      if (!token) {
        setError('Invalid invite link');
        setLoading(false);
        return;
      }

      try {
        const response = await getInviteDetails(token);
        if (response.success && response.invite) {
          if (!response.invite.isValid) {
            setError('This invite link has expired or is no longer valid');
          } else {
            setInviteData(response.invite);
          }
        } else {
          setError(response.message || 'Invite not found');
        }
      } catch (error) {
        console.error('Error loading invite:', error);
        setError('Failed to load invite');
      } finally {
        setLoading(false);
      }
    };

    loadInvite();
  }, [token]);

  const handleJoinCampus = async () => {
    if (checkingAuth) return;

    if (!isAuthenticated) {
      // Redirect to login with invite context
      navigate('/login', {
        state: {
          inviteToken: token,
          returnPath: `/invite/${token}`,
        },
      });
      return;
    }

    // User is authenticated - join via invite
    setJoining(true);
    try {
      const response = await joinViaInvite(token);
      if (response.success) {
        showToast('Successfully joined the college!', 'success');
        // Redirect to college profile after a short delay
        setTimeout(() => {
          navigate('/chat', {
            state: {
              college: inviteData.college,
              openCollegeChat: true,
              justJoined: true,
            },
          });
        }, 1000);
      } else {
        if (response.message?.includes('already following')) {
          showToast('You are already a member of this college', 'info');
          // User already follows, just redirect to college
          setTimeout(() => {
            navigate('/chat', {
              state: {
                college: inviteData.college,
                openCollegeChat: true,
              },
            });
          }, 1000);
        } else {
          showToast(response.message || 'Failed to join college', 'error');
          setJoining(false);
        }
      }
    } catch (error) {
      console.error('Error joining via invite:', error);
      showToast('Failed to join college. Please try again.', 'error');
      setJoining(false);
    }
  };

  if (loading || checkingAuth) {
    return (
      <div className="invite-page">
        <div className="invite-loading">
          <div className="spinner"></div>
          <p>Loading invite...</p>
        </div>
      </div>
    );
  }

  if (error || !inviteData) {
    return (
      <div className="invite-page">
        <div className="invite-error">
          <h2>Invalid Invite</h2>
          <p>{error || 'This invite link is not valid'}</p>
          <button onClick={() => navigate('/')} className="home-button">
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (!inviteData.college) {
    return (
      <div className="invite-page">
        <div className="invite-error">
          <h2>College Not Found</h2>
          <p>The college for this invite could not be found.</p>
          <button onClick={() => navigate('/')} className="home-button">
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}
      <div className="invite-page">
        <div className="invite-container">
          <CollegeProfileCard 
            college={inviteData.college}
            onJoinCampus={handleJoinCampus}
            disabled={joining}
          />
          {inviteData.customMessage && (
            <div className="invite-message">
              <p>{inviteData.customMessage}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Invite;

