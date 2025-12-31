import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGroupInviteDetails, joinGroupViaInvite } from '../services/groupService';
import { verifyAuth } from '../services/authService';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import './GroupInvite.css';

const GroupInvite = () => {
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
        const response = await getGroupInviteDetails(token);
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

  const handleJoinGroup = async () => {
    if (checkingAuth) return;

    if (!isAuthenticated) {
      // Redirect to login with invite context
      navigate('/login', {
        state: {
          groupInviteToken: token,
          returnPath: `/group-invite/${token}`,
        },
      });
      return;
    }

    // User is authenticated - join via invite
    setJoining(true);
    try {
      const response = await joinGroupViaInvite(token);
      if (response.success) {
        showToast('Successfully joined the group!', 'success');
        // Redirect to chat after a short delay
        setTimeout(() => {
          navigate('/chat', {
            state: {
              groupId: inviteData.group.id,
              openGroupChat: true,
              justJoined: true,
            },
          });
        }, 1000);
      } else {
        if (response.message?.includes('already a member')) {
          showToast('You are already a member of this group', 'info');
          // User already a member, just redirect to chat
          setTimeout(() => {
            navigate('/chat', {
              state: {
                groupId: inviteData.group.id,
                openGroupChat: true,
              },
            });
          }, 1000);
        } else {
          showToast(response.message || 'Failed to join group', 'error');
          setJoining(false);
        }
      }
    } catch (error) {
      console.error('Error joining via invite:', error);
      showToast('Failed to join group. Please try again.', 'error');
      setJoining(false);
    }
  };

  if (loading || checkingAuth) {
    return (
      <div className="group-invite-page">
        <div className="group-invite-loading">
          <div className="spinner"></div>
          <p>Loading invite...</p>
        </div>
      </div>
    );
  }

  if (error || !inviteData) {
    return (
      <div className="group-invite-page">
        <div className="group-invite-error">
          <h2>Invalid Invite</h2>
          <p>{error || 'This invite link is not valid'}</p>
          <button onClick={() => navigate('/')} className="home-button">
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (!inviteData.group) {
    return (
      <div className="group-invite-page">
        <div className="group-invite-error">
          <h2>Group Not Found</h2>
          <p>The group for this invite could not be found.</p>
          <button onClick={() => navigate('/')} className="home-button">
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const group = inviteData.group;
  const groupAvatar = group.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&size=100&background=00a8ff&color=fff`;

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
      <div className="group-invite-page">
        <div className="group-invite-container">
          <div className="group-invite-card">
            <div className="group-invite-avatar">
              <img src={groupAvatar} alt={group.name} />
            </div>
            <h2 className="group-invite-name">{group.name}</h2>
            {group.description && (
              <p className="group-invite-description">{group.description}</p>
            )}
            <div className="group-invite-info">
              <span className="group-invite-members">
                👥 {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
              </span>
            </div>
            {inviteData.customMessage && (
              <div className="group-invite-message">
                <p>{inviteData.customMessage}</p>
              </div>
            )}
            <button
              className="group-invite-join-btn"
              onClick={handleJoinGroup}
              disabled={joining}
            >
              {joining ? 'Joining...' : 'Join Group'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default GroupInvite;

