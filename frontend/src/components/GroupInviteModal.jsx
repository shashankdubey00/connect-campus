import { useState, useEffect } from 'react';
import { createGroupInvite } from '../services/groupService';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';
import './GroupInviteModal.css';

const GroupInviteModal = ({ group, onClose }) => {
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { showToast, hideToast, toast } = useToast();

  useEffect(() => {
    // Generate invite link when modal opens
    if (group) {
      generateInviteLink();
    }
    
    // Cleanup: reset loading state if component unmounts
    return () => {
      setLoading(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group]);

  const generateInviteLink = async (retryCount = 0) => {
    if (!group) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Add timeout to prevent infinite loading (30 seconds max)
    const timeoutId = setTimeout(() => {
      if (retryCount === 0) {
        showToast('Request is taking longer than expected. Please try again.', 'warning');
        setLoading(false);
      }
    }, 30000);

    try {
      const response = await createGroupInvite(group.id);
      
      clearTimeout(timeoutId);

      if (response.success && response.invite) {
        setInviteLink(response.invite.inviteUrl);
        showToast('Invite link generated successfully!', 'success', 2000);
        setLoading(false);
      } else {
        const errorMessage = response.message || 'Failed to generate invite link';
        
        // Retry up to 2 times
        if (retryCount < 2) {
          showToast(`Retrying... (${retryCount + 1}/2)`, 'info', 1500);
          setTimeout(() => {
            generateInviteLink(retryCount + 1);
          }, 2000);
        } else {
          showToast(errorMessage, 'error');
          setLoading(false);
        }
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Error generating invite link:', error);
      
      // Retry up to 2 times on network errors
      if (retryCount < 2 && (error.message?.includes('fetch') || error.message?.includes('network') || error.message?.includes('Failed to fetch'))) {
        showToast(`Connection issue. Retrying... (${retryCount + 1}/2)`, 'warning', 1500);
        setTimeout(() => {
          generateInviteLink(retryCount + 1);
        }, 2000);
      } else {
        const errorMsg = error.message || 'Failed to generate invite link. Please check your connection and try again.';
        showToast(errorMsg, 'error');
        setLoading(false);
      }
    }
  };

  const copyToClipboard = () => {
    if (!inviteLink) {
      showToast('Invite link is not ready yet', 'warning');
      return;
    }

    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      showToast('Link copied to clipboard!', 'success', 2000);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      showToast('Failed to copy link. Please try again.', 'error');
    });
  };

  const shareInvite = async () => {
    if (!inviteLink) {
      showToast('Invite link is not ready yet', 'warning');
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${group.name} on Connect Campus`,
          text: `Join my group "${group.name}" on Connect Campus!`,
          url: inviteLink,
        });
        showToast('Invite shared successfully!', 'success', 2000);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
          showToast('Failed to share. You can copy the link instead.', 'warning');
        }
      }
    } else {
      // Fallback: copy to clipboard
      copyToClipboard();
    }
  };

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
      <div className="group-invite-modal-overlay" onClick={onClose}>
        <div className="group-invite-modal" onClick={(e) => e.stopPropagation()}>
          <div className="group-invite-modal-header">
            <h2>Invite to Group</h2>
            <button className="group-invite-modal-close" onClick={onClose}>×</button>
          </div>

          <div className="group-invite-modal-content">
            <div className="group-invite-info">
              <p className="group-invite-text">
                Invite your friend to join <strong>{group?.name}</strong>
              </p>
              {group?.description && (
                <p className="group-invite-description">{group.description}</p>
              )}
            </div>

            <div className="group-invite-link-section">
              <label>Invite Link</label>
              {loading ? (
                <div className="group-invite-loading">
                  <div className="loading-spinner-small"></div>
                  <span>Generating invite link...</span>
                </div>
              ) : (
                <>
                  <div className="group-invite-link-container">
                    <input
                      type="text"
                      value={inviteLink}
                      readOnly
                      className="group-invite-link-input"
                      onClick={(e) => e.target.select()}
                    />
                    <button
                      className={`group-invite-copy-btn ${copied ? 'copied' : ''}`}
                      onClick={copyToClipboard}
                      title="Copy link"
                    >
                      {copied ? '✓' : '📋'}
                    </button>
                  </div>
                  {navigator.share && (
                    <button
                      className="group-invite-share-btn"
                      onClick={shareInvite}
                    >
                      📤 Share via...
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GroupInviteModal;

