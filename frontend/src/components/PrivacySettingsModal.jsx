import { useState, useEffect } from 'react';
import { getBlockedUsers, unblockUser } from '../services/profileService';
import './PrivacySettingsModal.css';

const PrivacySettingsModal = ({ onClose, user }) => {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const loadBlockedUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getBlockedUsers();
      if (response.success) {
        setBlockedUsers(response.blockedUsers || []);
      } else {
        setError(response.message || 'Failed to load blocked users');
      }
    } catch (err) {
      console.error('Error loading blocked users:', err);
      setError('Failed to load blocked users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (blockedUserId) => {
    if (!window.confirm('Are you sure you want to unblock this user?')) {
      return;
    }

    try {
      setUnblocking(blockedUserId);
      setError(null);
      const response = await unblockUser(blockedUserId);
      if (response.success) {
        // Remove from list
        setBlockedUsers(prev => prev.filter(u => u.id !== blockedUserId));
      } else {
        setError(response.message || 'Failed to unblock user');
      }
    } catch (err) {
      console.error('Error unblocking user:', err);
      setError('Failed to unblock user. Please try again.');
    } finally {
      setUnblocking(null);
    }
  };

  const getAvatarUrl = (avatar) => {
    if (!avatar) return null;
    if (avatar.startsWith('/uploads/')) {
      return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${avatar}`;
    }
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
      return avatar;
    }
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${avatar}`;
  };

  return (
    <div className="privacy-settings-modal-overlay" onClick={onClose}>
      <div className="privacy-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="privacy-settings-modal-header">
          <h2>Privacy Settings</h2>
          <button className="privacy-settings-modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="privacy-settings-modal-content">
          <div className="privacy-settings-section">
            <h3>Blocked Users</h3>
            <p className="privacy-settings-description">
              Users you have blocked will not be able to send you messages or see your profile.
            </p>

            {error && (
              <div className="privacy-settings-error">
                {error}
              </div>
            )}

            {loading ? (
              <div className="privacy-settings-loading">
                <div className="loading-spinner-small"></div>
                <p>Loading blocked users...</p>
              </div>
            ) : blockedUsers.length === 0 ? (
              <div className="privacy-settings-empty">
                <div className="privacy-settings-empty-icon">🔒</div>
                <p className="privacy-settings-empty-message">No blocked users</p>
                <p className="privacy-settings-empty-hint">You haven't blocked any users yet.</p>
              </div>
            ) : (
              <div className="privacy-settings-blocked-list">
                {blockedUsers.map((blockedUser) => (
                  <div key={blockedUser.id} className="privacy-settings-blocked-item">
                    <div className="privacy-settings-blocked-avatar">
                      <img
                        src={getAvatarUrl(blockedUser.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(blockedUser.name)}&size=50&background=00a8ff&color=fff`}
                        alt={blockedUser.name}
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(blockedUser.name)}&size=50&background=00a8ff&color=fff`;
                        }}
                      />
                    </div>
                    <div className="privacy-settings-blocked-info">
                      <div className="privacy-settings-blocked-name">{blockedUser.name}</div>
                      <div className="privacy-settings-blocked-email">{blockedUser.email}</div>
                    </div>
                    <button
                      className="privacy-settings-unblock-btn"
                      onClick={() => handleUnblock(blockedUser.id)}
                      disabled={unblocking === blockedUser.id}
                    >
                      {unblocking === blockedUser.id ? 'Unblocking...' : 'Unblock'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="privacy-settings-modal-footer">
          <button className="privacy-settings-modal-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettingsModal;


