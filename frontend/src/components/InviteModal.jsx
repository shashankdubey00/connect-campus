import { useState, useEffect } from 'react';
import { createInvite } from '../services/inviteService';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';
import './InviteModal.css';

const InviteModal = ({ college, onClose }) => {
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { showToast, hideToast, toast } = useToast();

  useEffect(() => {
    // Generate invite link when modal opens
    if (college) {
      generateInviteLink();
    }
    
    // Cleanup: reset loading state if component unmounts
    return () => {
      setLoading(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [college]);

  const generateInviteLink = async (retryCount = 0) => {
    if (!college) {
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
      const collegeId = college.aisheCode || college.name;
      const response = await createInvite(collegeId);
      
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

    const shareData = {
      title: `Join ${college?.name || 'this college'} on Connect Campus`,
      text: `Join ${college?.name || 'this college'} on Connect Campus!`,
      url: inviteLink,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showToast('Invite shared successfully!', 'success');
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
          copyToClipboard(); // Fallback to copy
        }
      }
    } else {
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
      <div className="invite-modal-overlay" onClick={onClose}>
        <div className="invite-modal" onClick={(e) => e.stopPropagation()}>
          <div className="invite-modal-header">
            <h2>Invite your friend</h2>
            <button className="invite-modal-close" onClick={onClose}>×</button>
          </div>

          <div className="invite-modal-content">
            <p className="invite-modal-text">
              Invite your friend to join this college group
            </p>

            {loading ? (
              <div className="invite-loading">
                <div className="spinner"></div>
                <p>Generating invite link...</p>
              </div>
            ) : (
              <div className="invite-link-container">
                <div className="invite-link-input-wrapper">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="invite-link-input"
                    placeholder="Generating invite link..."
                  />
                  <button
                    className={`invite-copy-btn ${copied ? 'copied' : ''}`}
                    onClick={copyToClipboard}
                    title="Copy link"
                    disabled={!inviteLink}
                  >
                    {copied ? '✓ Copied!' : '📋 Copy'}
                  </button>
                </div>

                <div className="invite-actions">
                  <button 
                    className="invite-share-btn" 
                    onClick={shareInvite}
                    disabled={!inviteLink || loading}
                  >
                    📤 Share
                  </button>
                  {!inviteLink && !loading && (
                    <button 
                      className="invite-retry-btn" 
                      onClick={() => {
                        setLoading(true);
                        generateInviteLink(0);
                      }}
                    >
                      🔄 Retry
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default InviteModal;

