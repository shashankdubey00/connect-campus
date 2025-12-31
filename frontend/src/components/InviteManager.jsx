import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { createInvite, getMyInvites, deactivateInvite } from '../services/inviteService';
import './InviteManager.css';

const InviteManager = ({ collegeId, collegeName, onClose }) => {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [expiresIn, setExpiresIn] = useState(''); // days
  const [maxUses, setMaxUses] = useState('');

  useEffect(() => {
    loadInvites();
  }, [collegeId]);

  const loadInvites = async () => {
    setLoading(true);
    try {
      const response = await getMyInvites(collegeId);
      if (response.success) {
        setInvites(response.invites || []);
      }
    } catch (error) {
      console.error('Error loading invites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    setCreating(true);
    try {
      const expiresAt = expiresIn
        ? new Date(Date.now() + parseInt(expiresIn) * 24 * 60 * 60 * 1000)
        : null;

      const response = await createInvite(collegeId, {
        expiresAt,
        maxUses: maxUses ? parseInt(maxUses) : null,
        customMessage: customMessage || null,
      });

      if (response.success) {
        await loadInvites();
        setShowCreateForm(false);
        setCustomMessage('');
        setExpiresIn('');
        setMaxUses('');
        setSelectedInvite(response.invite);
      } else {
        alert(response.message || 'Failed to create invite');
      }
    } catch (error) {
      console.error('Error creating invite:', error);
      alert('Failed to create invite');
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (inviteId) => {
    if (!confirm('Are you sure you want to deactivate this invite?')) return;

    try {
      const response = await deactivateInvite(inviteId);
      if (response.success) {
        await loadInvites();
        if (selectedInvite?.id === inviteId) {
          setSelectedInvite(null);
        }
      } else {
        alert(response.message || 'Failed to deactivate invite');
      }
    } catch (error) {
      console.error('Error deactivating invite:', error);
      alert('Failed to deactivate invite');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const shareInvite = async (invite) => {
    const shareData = {
      title: `Join ${collegeName} on Connect Campus`,
      text: `Join ${collegeName} on Connect Campus! Use invite code: ${invite.inviteCode} or visit: ${invite.inviteUrl}`,
      url: invite.inviteUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      // Fallback: copy to clipboard
      copyToClipboard(invite.inviteUrl);
    }
  };

  if (selectedInvite) {
    return (
      <div className="invite-manager">
        <div className="invite-manager-header">
          <button className="back-button" onClick={() => setSelectedInvite(null)}>
            ← Back
          </button>
          <h2>Invite Details</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="invite-details">
          <div className="invite-qr-section">
            <QRCodeSVG value={selectedInvite.inviteUrl} size={200} />
            <p className="invite-code-display">{selectedInvite.inviteCode}</p>
          </div>

          <div className="invite-info">
            <div className="invite-field">
              <label>Invite Code:</label>
              <div className="invite-value">
                <code>{selectedInvite.inviteCode}</code>
                <button onClick={() => copyToClipboard(selectedInvite.inviteCode)}>
                  Copy
                </button>
              </div>
            </div>

            <div className="invite-field">
              <label>Invite Link:</label>
              <div className="invite-value">
                <input
                  type="text"
                  value={selectedInvite.inviteUrl}
                  readOnly
                  className="invite-url-input"
                />
                <button onClick={() => copyToClipboard(selectedInvite.inviteUrl)}>
                  Copy
                </button>
              </div>
            </div>

            <div className="invite-stats">
              <div className="stat-item">
                <span className="stat-label">Uses:</span>
                <span className="stat-value">
                  {selectedInvite.useCount} / {selectedInvite.maxUses || '∞'}
                </span>
              </div>
              {selectedInvite.expiresAt && (
                <div className="stat-item">
                  <span className="stat-label">Expires:</span>
                  <span className="stat-value">
                    {new Date(selectedInvite.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className="stat-item">
                <span className="stat-label">Status:</span>
                <span className={`stat-value ${selectedInvite.isValid ? 'valid' : 'invalid'}`}>
                  {selectedInvite.isValid ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="invite-actions">
              <button
                className="share-button"
                onClick={() => shareInvite(selectedInvite)}
              >
                📤 Share
              </button>
              {selectedInvite.isActive && (
                <button
                  className="deactivate-button"
                  onClick={() => handleDeactivate(selectedInvite.id)}
                >
                  Deactivate
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="invite-manager">
      <div className="invite-manager-header">
        <h2>Invite People to {collegeName}</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      {!showCreateForm ? (
        <>
          <div className="invite-manager-actions">
            <button
              className="create-invite-button"
              onClick={() => setShowCreateForm(true)}
            >
              + Create New Invite
            </button>
          </div>

          {loading ? (
            <div className="loading">Loading invites...</div>
          ) : invites.length === 0 ? (
            <div className="no-invites">
              <p>No invites created yet.</p>
              <p>Create your first invite to start sharing!</p>
            </div>
          ) : (
            <div className="invites-list">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className={`invite-item ${!invite.isValid ? 'inactive' : ''}`}
                  onClick={() => setSelectedInvite(invite)}
                >
                  <div className="invite-item-header">
                    <code className="invite-item-code">{invite.inviteCode}</code>
                    <span className={`invite-status ${invite.isValid ? 'active' : 'inactive'}`}>
                      {invite.isValid ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="invite-item-stats">
                    <span>{invite.useCount} uses</span>
                    {invite.maxUses && <span>Max: {invite.maxUses}</span>}
                    {invite.expiresAt && (
                      <span>Expires: {new Date(invite.expiresAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="create-invite-form">
          <h3>Create New Invite</h3>
          <div className="form-group">
            <label>Custom Message (optional):</label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add a personal message to your invite..."
              maxLength={500}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Expires In (days, optional):</label>
            <input
              type="number"
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
              placeholder="Leave empty for no expiration"
              min="1"
            />
          </div>
          <div className="form-group">
            <label>Max Uses (optional):</label>
            <input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Leave empty for unlimited"
              min="1"
            />
          </div>
          <div className="form-actions">
            <button
              className="create-button"
              onClick={handleCreateInvite}
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Invite'}
            </button>
            <button
              className="cancel-button"
              onClick={() => {
                setShowCreateForm(false);
                setCustomMessage('');
                setExpiresIn('');
                setMaxUses('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InviteManager;

