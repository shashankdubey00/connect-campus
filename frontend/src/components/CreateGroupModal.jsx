import { useState } from 'react';
import { createGroup } from '../services/groupService';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';
import './CreateGroupModal.css';

const CreateGroupModal = ({ onClose, onGroupCreated, user, availableUsers = [] }) => {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast, hideToast, toast } = useToast();

  // Filter available users based on search query
  const filteredUsers = availableUsers.filter(user => {
    const name = user.profile?.displayName || user.email?.split('@')[0] || '';
    const email = user.email || '';
    const query = searchQuery.toLowerCase();
    return name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
  });

  const handleToggleMember = (userId) => {
    setSelectedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!groupName.trim()) {
      showToast('Please enter a group name', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await createGroup({
        name: groupName.trim(),
        description: description.trim(),
        memberIds: Array.from(selectedMembers),
      });

      if (response.success) {
        showToast('Group created successfully! You can invite external users via invite link.', 'success', 4000);
        if (onGroupCreated) {
          onGroupCreated(response.group);
        }
        onClose();
      } else {
        showToast(response.message || 'Failed to create group', 'error');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      showToast('Failed to create group. Please try again.', 'error');
    } finally {
      setLoading(false);
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
      <div className="create-group-modal-overlay" onClick={onClose}>
        <div className="create-group-modal" onClick={(e) => e.stopPropagation()}>
          <div className="create-group-modal-header">
            <h2>Create Private Group</h2>
            <button className="create-group-modal-close" onClick={onClose}>×</button>
          </div>

          <form className="create-group-modal-content" onSubmit={handleSubmit}>
            <div className="create-group-form-section">
              <label htmlFor="group-name">Group Name *</label>
              <input
                id="group-name"
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                maxLength={100}
                required
                disabled={loading}
              />
            </div>

            <div className="create-group-form-section">
              <label htmlFor="group-description">Description (Optional)</label>
              <textarea
                id="group-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this group about?"
                maxLength={500}
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="create-group-form-section">
              <label>Add Members</label>
              <p className="member-selection-hint">
                Select members from your direct chats or college. You can also invite external users after creating the group.
              </p>
              <div className="member-search-container">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={loading}
                  className="member-search-input"
                />
              </div>

              <div className="selected-members-preview">
                {selectedMembers.size > 0 && (
                  <div className="selected-members-count">
                    {selectedMembers.size} member{selectedMembers.size !== 1 ? 's' : ''} selected
                  </div>
                )}
              </div>

              <div className="members-list-container">
                {filteredUsers.length > 0 ? (
                  <div className="members-list">
                    {filteredUsers.map((userItem) => {
                      const userId = userItem._id || userItem.id;
                      const userName = userItem.profile?.displayName || userItem.email?.split('@')[0] || 'User';
                      const userAvatar = userItem.profile?.profilePicture 
                        ? (userItem.profile.profilePicture.startsWith('/uploads/') 
                            ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${userItem.profile.profilePicture}`
                            : userItem.profile.profilePicture)
                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&size=50&background=00a8ff&color=fff`;
                      const isSelected = selectedMembers.has(String(userId));
                      const isCurrentUser = String(userId) === String(user?._id || user?.id);
                      const userSource = userItem.source || 'unknown'; // 'direct_message', 'college', etc.

                      if (isCurrentUser) return null; // Don't show current user

                      return (
                        <div
                          key={userId}
                          className={`member-select-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleToggleMember(String(userId))}
                        >
                          <div className="member-select-avatar">
                            <img src={userAvatar} alt={userName} />
                            {userSource === 'direct_message' && (
                              <span className="member-source-badge" title="Direct chat contact">💬</span>
                            )}
                            {userSource === 'college' && (
                              <span className="member-source-badge" title="College member">🏫</span>
                            )}
                          </div>
                          <div className="member-select-info">
                            <div className="member-select-name">{userName}</div>
                            <div className="member-select-email">
                              {userItem.email && !userItem.email.includes('@example.com') 
                                ? userItem.email 
                                : userSource === 'direct_message' 
                                  ? 'Direct chat contact'
                                  : 'College member'}
                            </div>
                          </div>
                          <div className="member-select-checkbox">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleMember(String(userId))}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="no-members-message">
                    {searchQuery ? (
                      <>
                        <p>No users found matching "{searchQuery}"</p>
                        <p className="no-members-hint">Try a different search or invite external users after creating the group</p>
                      </>
                    ) : (
                      <>
                        <p>No contacts available</p>
                        <p className="no-members-hint">Start chatting with people or join a college to add members</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="create-group-modal-footer">
              <button
                type="button"
                className="create-group-cancel-btn"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="create-group-submit-btn"
                disabled={loading || !groupName.trim()}
              >
                {loading ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default CreateGroupModal;

