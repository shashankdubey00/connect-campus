import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { verifyAuth, logout } from '../services/authService'
import { connectSocket, disconnectSocket, getSocket, onJoinedRoom, onReceiveMessage, onSocketError, sendMessage, removeAllListeners } from '../services/socketService'
import { fetchMessages } from '../services/messageService'
import { getCollegeChatInfo } from '../services/chatService'
import { uploadCollegeId, getVerificationStatus } from '../services/profileService'
import './Chat.css'

// Dummy data
const dummyColleges = [
  {
    id: 1,
    name: 'Indian Institute of Technology Delhi',
    district: 'New Delhi',
    state: 'Delhi',
    logo: 'https://ui-avatars.com/api/?name=IIT+Delhi&size=100&background=00a8ff&color=fff',
    about: 'Premier engineering institute in India, known for excellence in technology and innovation.',
    totalMembers: 1250,
    isVerified: true,
    members: [
      { id: 1, name: 'Raj Kumar', avatar: 'https://ui-avatars.com/api/?name=Raj+Kumar&size=40&background=e74c3c&color=fff' },
      { id: 2, name: 'Priya Sharma', avatar: 'https://ui-avatars.com/api/?name=Priya+Sharma&size=40&background=27ae60&color=fff' },
      { id: 3, name: 'Amit Singh', avatar: 'https://ui-avatars.com/api/?name=Amit+Singh&size=40&background=f39c12&color=fff' },
      { id: 4, name: 'Sneha Patel', avatar: 'https://ui-avatars.com/api/?name=Sneha+Patel&size=40&background=9b59b6&color=fff' },
      { id: 5, name: 'Vikram Mehta', avatar: 'https://ui-avatars.com/api/?name=Vikram+Mehta&size=40&background=3498db&color=fff' }
    ]
  },
  {
    id: 2,
    name: 'Delhi University',
    district: 'New Delhi',
    state: 'Delhi',
    logo: 'https://ui-avatars.com/api/?name=Delhi+University&size=100&background=27ae60&color=fff',
    about: 'One of the largest universities in India with diverse academic programs.',
    totalMembers: 3200,
    isVerified: true,
    members: [
      { id: 1, name: 'Anjali Verma', avatar: 'https://ui-avatars.com/api/?name=Anjali+Verma&size=40&background=e74c3c&color=fff' },
      { id: 2, name: 'Rohit Gupta', avatar: 'https://ui-avatars.com/api/?name=Rohit+Gupta&size=40&background=27ae60&color=fff' }
    ]
  }
]

const dummyChats = [
  {
    id: 1,
    type: 'direct',
    name: 'Vinamra',
    lastMessage: 'Hey! How are you doing?',
    timestamp: '10:30 AM',
    unreadCount: 2,
    isOnline: true,
    avatar: 'https://ui-avatars.com/api/?name=Vinamra&size=50&background=00a8ff&color=fff',
    college: 'Sagar Institute of Research & Technology'
  },
  {
    id: 2,
    type: 'direct',
    name: 'Rahul',
    lastMessage: 'See you in class tomorrow!',
    timestamp: '9:15 AM',
    unreadCount: 0,
    isOnline: false,
    avatar: 'https://ui-avatars.com/api/?name=Rahul&size=50&background=e74c3c&color=fff',
    college: 'Sagar Institute of Research & Technology'
  },
  {
    id: 3,
    type: 'college',
    collegeId: 1,
    name: 'Sagar Institute of Research & Technology',
    lastMessage: 'Welcome to the community!',
    timestamp: 'Yesterday',
    unreadCount: 5,
    onlineCount: 42,
    avatar: 'https://ui-avatars.com/api/?name=Sagar+Institute&size=50&background=27ae60&color=fff'
  }
]

const dummyMessages = {
  1: [
    { id: 1, text: 'Hey! How are you doing?', sender: 'Vinamra', time: '10:30 AM', isOwn: false, date: 'Today' },
    { id: 2, text: 'I\'m doing great! Thanks for asking.', sender: 'You', time: '10:32 AM', isOwn: true, date: 'Today' },
    { id: 3, text: 'Want to study together for the exam?', sender: 'Vinamra', time: '10:35 AM', isOwn: false, date: 'Today' }
  ],
  2: [
    { id: 1, text: 'See you in class tomorrow!', sender: 'Rahul', time: '9:15 AM', isOwn: false, date: 'Today' },
    { id: 2, text: 'Sure! Looking forward to it.', sender: 'You', time: '9:20 AM', isOwn: true, date: 'Today' }
  ],
  3: [
    { id: 1, text: 'Welcome to Sagar Institute community!', sender: 'Admin', time: 'Yesterday 2:00 PM', isOwn: false, date: 'Yesterday' },
    { id: 2, text: 'Thanks for joining!', sender: 'You', time: 'Yesterday 2:05 PM', isOwn: true, date: 'Yesterday' },
    { id: 3, text: 'Feel free to ask any questions!', sender: 'Admin', time: 'Yesterday 2:10 PM', isOwn: false, date: 'Yesterday' }
  ]
}

const Chat = () => {
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [activeSection, setActiveSection] = useState('chats') // chats, community, settings
  const [selectedChat, setSelectedChat] = useState(null)
  const [selectedCollege, setSelectedCollege] = useState(null)
  const [view, setView] = useState('list') // list, college-profile, live-chat, student-profile, settings
  const [user, setUser] = useState(null)
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768)
  const [showChatList, setShowChatList] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    // Load from localStorage, default to true
    const saved = localStorage.getItem('notificationsEnabled')
    return saved !== null ? JSON.parse(saved) : true
  })
  const [totalUnreadCount, setTotalUnreadCount] = useState(0) // Total unread messages across all chats
  const [searchQuery, setSearchQuery] = useState('')
  const [chats, setChats] = useState([]) // Dynamic chat list
  const [unreadCounts, setUnreadCounts] = useState({}) // Track unread counts per chat
  const [isLoading, setIsLoading] = useState(true) // Loading state

  // Load user data and connect Socket.IO
  useEffect(() => {
    const loadUser = async () => {
      try {
        setIsLoading(true)
        const data = await verifyAuth()
        if (data.success) {
          setUser(data.user)
          
          // Connect Socket.IO after user is loaded (token will be read from cookies)
          try {
            const socketInstance = connectSocket();
            
            if (socketInstance) {
              // Set up Socket.IO listeners
              onJoinedRoom((data) => {
                console.log('✅ Joined college room:', data);
              });
              
              onSocketError((error) => {
                console.error('Socket error:', error);
              });

              // Listen for new messages to update chat list
              // This will be set up after handleNewMessage is defined
            }
          } catch (socketError) {
            console.log('Socket.IO connection will be retried later:', socketError.message)
          }

          // Load user's college chat
          if (data.user?.profile?.college) {
            loadUserCollegeChat(data.user.profile.college);
          }

          // Load verification status (optional, don't block on error)
          loadVerificationStatus().catch(err => {
            console.log('Verification status not available:', err.message)
          });
        } else {
          // If not authenticated, redirect to login
          setTimeout(() => {
            navigate('/login', {
              state: {
                returnPath: '/chat',
                college: location.state?.college,
              }
            })
          }, 100)
          return
        }
      } catch (error) {
        console.error('Failed to load user:', error)
        setTimeout(() => {
          navigate('/login', {
            state: {
              returnPath: '/chat',
              college: location.state?.college,
            }
          })
        }, 100)
        return
      } finally {
        setIsLoading(false)
      }
    }
    loadUser()
    
    // Cleanup: disconnect socket on unmount
    return () => {
      removeAllListeners();
      disconnectSocket();
    }
  }, [])

  // This useEffect will be set up after handleNewMessage is defined

  // Handle college from navigation state (after user is loaded)
  useEffect(() => {
    if (user && !isLoading && location.state?.college && location.state?.openCollegeChat) {
      const college = location.state.college
      console.log('Opening college chat from navigation:', college)
      handleOpenCollegeChat(college)
      // Clear the state to prevent reopening on re-render
      window.history.replaceState({}, document.title)
    }
  }, [user, isLoading, location.state])

  // Handle opening college chat from navigation
  const handleOpenCollegeChat = async (college) => {
    // Create a college object with all needed fields
    const collegeData = {
      id: college.aisheCode || college.id || Date.now(),
      name: college.name,
      district: college.district || '',
      state: college.state || '',
      logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(college.name)}&size=100&background=00a8ff&color=fff`,
      about: `Connect with students from ${college.name}`,
      totalMembers: 0, // Will be fetched from backend later
      isVerified: false, // Will be checked from backend later
      members: [],
      ...college
    }
    
    const collegeId = college.aisheCode || college.name
    const collegeName = college.name || 'College Chat'
    const collegeLogo = `https://ui-avatars.com/api/?name=${encodeURIComponent(collegeName)}&size=50&background=00a8ff&color=fff`
    
    // Use functional update to check and create chat atomically
    setChats(prev => {
      // Check if chat already exists
      const existingChat = prev.find(c => 
        c.type === 'college' && 
        (c.collegeId === collegeId || c.name === collegeName)
      )
      
      if (existingChat) {
        // Chat exists, open it
        setSelectedCollege(collegeData)
        setSelectedChat(existingChat)
        setView('live-chat')
        setActiveSection('chats')
        if (isMobileView) {
          setShowChatList(false)
        }
        return prev // Return unchanged
      }
      
      // Chat doesn't exist, create it immediately
      const newChat = {
        id: `college-${collegeId}`,
        type: 'college',
        collegeId: collegeId,
        name: collegeName,
        lastMessage: 'No messages yet',
        timestamp: '',
        unreadCount: 0,
        onlineCount: 0,
        avatar: collegeLogo,
        college: collegeData,
        lastMessageTime: null
      }
      
      // Load message history in background and update
      getCollegeChatInfo(collegeId).then(chatInfo => {
        if (chatInfo.success) {
          setChats(prevChats => prevChats.map(c => 
            c.id === newChat.id
              ? {
                  ...c,
                  lastMessage: chatInfo.lastMessage || 'No messages yet',
                  timestamp: chatInfo.lastMessageTime ? formatChatTimestamp(chatInfo.lastMessageTime) : '',
                  lastMessageTime: chatInfo.lastMessageTime
                }
              : c
          ))
        }
      }).catch(error => {
        console.error('Error loading chat info:', error)
      })
      
      // Open the chat immediately
      setSelectedCollege(collegeData)
      setSelectedChat(newChat)
      setView('live-chat')
      setActiveSection('chats')
      if (isMobileView) {
        setShowChatList(false)
      }
      
      // Return updated chats list with new chat
      return [newChat, ...prev]
    })
  }

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobileView(mobile)
      if (!mobile) {
        setShowChatList(true)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Calculate total unread count
  useEffect(() => {
    const total = chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0)
    setTotalUnreadCount(total)
  }, [chats])

  // Handle section change
  const handleSectionChange = (section) => {
    setActiveSection(section)
    setView('list')
    setSelectedChat(null)
    setSelectedCollege(null)
  }

  // Handle chat selection
  const handleChatSelect = (chat) => {
    setSelectedChat(chat)
    
    // Reset unread count for this chat
    if (chat.collegeId) {
      setUnreadCounts(prev => ({
        ...prev,
        [chat.collegeId]: 0
      }))
      
      // Update chat in list to reset unread count
      setChats(prev => prev.map(c => 
        c.collegeId === chat.collegeId 
          ? { ...c, unreadCount: 0 }
          : c
      ))
    }
    
    if (chat.type === 'college') {
      const college = chat.college || user?.profile?.college
      setSelectedCollege(college)
      setView('live-chat')
    } else if (chat.type === 'direct') {
      // For direct messages, show chat view with the person's name
      setView('live-chat')
    }
    if (isMobileView) {
      setShowChatList(false)
    }
  }

  // Handle college profile view
  const handleViewCollegeProfile = (college) => {
    setSelectedCollege(college)
    setView('college-profile')
    if (isMobileView) {
      setShowChatList(false)
    }
  }

  // Handle join live chat
  const handleJoinLiveChat = (college) => {
    const chat = dummyChats.find(c => c.type === 'college' && c.collegeId === college.id)
    if (chat) {
      setSelectedChat(chat)
      setView('live-chat')
    }
  }

  // Handle profile click
  const handleProfileClick = () => {
    setView('student-profile')
    if (isMobileView) {
      setShowChatList(false)
    }
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Get user avatar
  const getUserAvatar = () => {
    if (user?.profile?.profilePicture) {
      return user.profile.profilePicture
    }
    const name = user?.profile?.displayName || user?.email || 'User'
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=50&background=00a8ff&color=fff`
  }

  // Get user display name
  const getUserDisplayName = () => {
    if (!user) return 'User'
    return user?.profile?.displayName || user?.email?.split('@')[0] || 'User'
  }

  // Load verification status
  const loadVerificationStatus = async () => {
    try {
      const response = await getVerificationStatus()
      if (response.success) {
        setVerificationStatus(response.verification)
      }
    } catch (error) {
      console.error('Error loading verification status:', error)
    }
  }

  // Format timestamp for chat list
  const formatChatTimestamp = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Load user's college chat
  const loadUserCollegeChat = async (college) => {
    if (!college?.aisheCode && !college?.name) return

    const collegeId = college.aisheCode || college.name
    const collegeName = college.name || 'College Chat'
    const collegeLogo = `https://ui-avatars.com/api/?name=${encodeURIComponent(collegeName)}&size=50&background=00a8ff&color=fff`

    try {
      // Fetch last message for preview
      const chatInfo = await getCollegeChatInfo(collegeId)
      
      const chat = {
        id: `college-${collegeId}`,
        type: 'college',
        collegeId: collegeId,
        name: collegeName,
        lastMessage: chatInfo.lastMessage || 'No messages yet',
        timestamp: chatInfo.lastMessageTime ? formatChatTimestamp(chatInfo.lastMessageTime) : '',
        unreadCount: unreadCounts[collegeId] || 0,
        onlineCount: 0, // Will be updated from socket if available
        avatar: collegeLogo,
        college: college,
        lastMessageTime: chatInfo.lastMessageTime
      }

      setChats(prev => {
        // Remove existing chat for this college if exists
        const filtered = prev.filter(c => c.collegeId !== collegeId)
        // Add new chat at the beginning (most recent)
        return [chat, ...filtered].sort((a, b) => {
          // Sort by last message time (most recent first)
          const timeA = a.lastMessageTime || a.timestamp || 0
          const timeB = b.lastMessageTime || b.timestamp || 0
          return new Date(timeB) - new Date(timeA)
        })
      })
    } catch (error) {
      console.error('Error loading college chat:', error)
    }
  }

  // Handle new message - update chat list
  const handleNewMessage = useCallback((message) => {
    const collegeId = message.collegeId
    
    setChats(prev => {
      const chatIndex = prev.findIndex(c => c.collegeId === collegeId)
      
      if (chatIndex === -1) {
        // Chat doesn't exist, create it
        const college = user?.profile?.college
        if (college && (college.aisheCode === collegeId || college.name === collegeId)) {
          const collegeName = college.name || 'College Chat'
          const collegeLogo = `https://ui-avatars.com/api/?name=${encodeURIComponent(collegeName)}&size=50&background=00a8ff&color=fff`
          
          const newChat = {
            id: `college-${collegeId}`,
            type: 'college',
            collegeId: collegeId,
            name: collegeName,
            lastMessage: message.text,
            timestamp: formatChatTimestamp(message.timestamp),
            unreadCount: selectedChat?.collegeId === collegeId ? 0 : 1,
            onlineCount: 0,
            avatar: collegeLogo,
            college: college,
            lastMessageTime: message.timestamp
          }
          
          return [newChat, ...prev].sort((a, b) => {
            const timeA = a.lastMessageTime || a.timestamp || 0
            const timeB = b.lastMessageTime || b.timestamp || 0
            return new Date(timeB) - new Date(timeA)
          })
        }
        return prev
      }
      
      // Update existing chat
      const updatedChats = [...prev]
      const chat = { ...updatedChats[chatIndex] }
      
      // Update last message and timestamp
      chat.lastMessage = message.text
      chat.timestamp = formatChatTimestamp(message.timestamp)
      chat.lastMessageTime = message.timestamp
      
      // Increment unread count if chat is not currently open
      if (selectedChat?.collegeId !== collegeId) {
        chat.unreadCount = (chat.unreadCount || 0) + 1
        setUnreadCounts(prev => ({
          ...prev,
          [collegeId]: (prev[collegeId] || 0) + 1
        }))
      } else {
        // Reset unread if chat is open
        chat.unreadCount = 0
      }
      
      // Move chat to top
      updatedChats.splice(chatIndex, 1)
      updatedChats.unshift(chat)
      
      return updatedChats
    })
  }, [user, selectedChat])

  // Set up Socket.IO message listener after handleNewMessage is defined
  useEffect(() => {
    const socketInstance = getSocket()
    if (socketInstance) {
      onReceiveMessage(handleNewMessage)
    }
    
    return () => {
      // Cleanup handled by removeAllListeners
    }
  }, [handleNewMessage])

  // Filter chats based on search
  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    // Sort by last message time (most recent first)
    const timeA = a.lastMessageTime || a.timestamp || 0
    const timeB = b.lastMessageTime || b.timestamp || 0
    return new Date(timeB) - new Date(timeA)
  })

  // Render middle panel content based on active section
  const renderMiddlePanel = () => {
    if (activeSection === 'chats') {
      return (
        <>
          <div className="panel-header">
            <h2>all chats</h2>
          </div>
          <div className="panel-list">
            {filteredChats.length === 0 ? (
              <div className="empty-chat-list">
                <div className="empty-chat-icon">💬</div>
                <p className="empty-chat-message">No chats yet</p>
                <p className="empty-chat-hint">Your college chat will appear here once you join a college</p>
              </div>
            ) : (
              filteredChats.map(chat => (
                <div
                  key={chat.id}
                  className={`panel-item ${selectedChat?.id === chat.id ? 'active' : ''}`}
                  onClick={() => handleChatSelect(chat)}
                >
                  <div className="panel-item-avatar">
                    <img src={chat.avatar} alt={chat.name} />
                    {chat.isOnline && (
                      <span className="online-dot"></span>
                    )}
                  </div>
                  <div className="panel-item-info">
                    <div className="panel-item-header">
                      <span className="panel-item-name">{chat.name}</span>
                      <span className="panel-item-time">
                        {chat.lastMessageTime 
                          ? formatChatTimestamp(chat.lastMessageTime)
                          : chat.timestamp || ''}
                      </span>
                    </div>
                    <div className="panel-item-preview">
                      <span className="panel-item-message">{chat.lastMessage || 'No messages yet'}</span>
                      {chat.unreadCount > 0 && (
                        <span className="panel-item-unread">{chat.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )
    } else if (activeSection === 'community') {
      return (
        <>
          <div className="panel-header">
            <h2>Colleges</h2>
          </div>
          <div className="panel-list">
            {dummyColleges.map(college => (
              <div
                key={college.id}
                className="panel-item"
                onClick={() => handleViewCollegeProfile(college)}
              >
                <div className="panel-item-avatar">
                  <img src={college.logo} alt={college.name} />
                  {college.isVerified && <span className="verified-badge">✓</span>}
                </div>
                <div className="panel-item-info">
                  <div className="panel-item-header">
                    <span className="panel-item-name">{college.name}</span>
                  </div>
                  <div className="panel-item-preview">
                    <span className="panel-item-location">{college.district}, {college.state}</span>
                    <span className="panel-item-members">{college.totalMembers} members</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )
    }
    return null
  }

  // Render right panel content
  const renderRightPanel = () => {
    if (view === 'college-profile' && selectedCollege) {
      return <CollegeProfileView college={selectedCollege} onJoinChat={() => handleJoinLiveChat(selectedCollege)} onBack={() => { setView('list'); if (isMobileView) setShowChatList(true) }} />
    }
    if (view === 'live-chat' && selectedChat) {
      const college = selectedChat.type === 'college' 
        ? (selectedChat.college || dummyColleges.find(c => c.id === selectedChat.collegeId))
        : null
      return <LiveChatView chat={selectedChat} college={college} user={user} verificationStatus={verificationStatus} onBack={() => { setView('list'); if (isMobileView) setShowChatList(true) }} onViewProfile={() => college && handleViewCollegeProfile(college)} />
    }
    if (view === 'student-profile') {
      return <StudentProfileView user={user} verificationStatus={verificationStatus} onBack={() => { setView('list'); if (isMobileView) setShowChatList(true) }} onVerificationUpdate={loadVerificationStatus} />
    }
    if (view === 'settings') {
      return <SettingsView theme={theme} onToggleTheme={toggleTheme} notificationsEnabled={notificationsEnabled} onToggleNotifications={setNotificationsEnabled} onLogout={handleLogout} onBack={() => { setView('list'); if (isMobileView) setShowChatList(true) }} />
    }
    return (
      <div className="right-panel-placeholder">
        <div className="placeholder-content">
          <div className="placeholder-icon">💬</div>
          <h3>Select a chat or college to get started</h3>
          <p>Choose from the list to view details and start chatting</p>
        </div>
      </div>
    )
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className={`chat-container theme-${theme}`} style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        width: '100vw',
        backgroundColor: '#0b141a',
        color: '#e9edef'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>Loading...</div>
          <div>Please wait while we load your chat</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`chat-container theme-${theme}`}>
      {/* Top Header with Title */}
      <div className="chat-top-header">
        <h1 className="app-title">connect campus</h1>
      </div>

      {/* Left Sidebar - Fixed Navigation */}
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <div className="profile-icon" onClick={handleProfileClick} title="Profile">
            <img src={getUserAvatar()} alt="Profile" />
          </div>
          <div className="profile-name-sidebar">{getUserDisplayName()}</div>
        </div>
        <div className="sidebar-divider"></div>
        <div className="sidebar-menu">
          <button
            className={`sidebar-menu-item ${activeSection === 'chats' ? 'active' : ''}`}
            onClick={() => handleSectionChange('chats')}
            title="Chats"
          >
            <span className="menu-icon">💬</span>
            <span className="menu-label">Chats</span>
          </button>
          <button
            className={`sidebar-menu-item ${activeSection === 'community' ? 'active' : ''}`}
            onClick={() => handleSectionChange('community')}
            title="Community"
          >
            <span className="menu-icon">🏫</span>
            <span className="menu-label">Community</span>
          </button>
          <button
            className={`sidebar-menu-item ${activeSection === 'settings' ? 'active' : ''}`}
            onClick={() => { setActiveSection('settings'); setView('settings'); if (isMobileView) setShowChatList(false) }}
            title="Settings"
          >
            <span className="menu-icon">⚙️</span>
            <span className="menu-label">Settings</span>
          </button>
        </div>
        <div className="sidebar-divider"></div>
        <div className="sidebar-footer">
          <button
            className="sidebar-menu-item"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          >
            <span className="menu-icon">{theme === 'dark' ? '🌗' : '☀️'}</span>
            <span className="menu-label">Theme</span>
          </button>
          <button
            className="sidebar-menu-item notification-toggle"
            onClick={() => {
              const newValue = !notificationsEnabled
              setNotificationsEnabled(newValue)
              localStorage.setItem('notificationsEnabled', JSON.stringify(newValue))
            }}
            title={notificationsEnabled ? 'Disable Notifications' : 'Enable Notifications'}
          >
            <span className="menu-icon">🔔</span>
            <span className="menu-label">Notify</span>
            {totalUnreadCount > 0 && (
              <span className="notification-badge">{totalUnreadCount > 99 ? '99+' : totalUnreadCount}</span>
            )}
          </button>
          <button
            className="sidebar-menu-item"
            onClick={handleLogout}
            title="Logout"
          >
            <span className="menu-icon">🚪</span>
            <span className="menu-label">Logout</span>
          </button>
        </div>
      </div>

      {/* Search Bar - Spans Middle and Right Panels */}
      <div className="chat-search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="explore more colleges......"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Middle Panel - Dynamic List */}
      <div className={`middle-panel ${!showChatList && isMobileView ? 'hidden' : ''}`}>
        {renderMiddlePanel()}
      </div>

      {/* Right Panel - Main Content */}
      <div className={`right-panel ${showChatList && isMobileView && view === 'list' ? 'hidden' : ''}`}>
        {isMobileView && view !== 'list' && (
          <button className="back-button" onClick={() => { setView('list'); setShowChatList(true) }}>
            ←
          </button>
        )}
        {renderRightPanel()}
      </div>
    </div>
  )
}

// College Profile View Component
const CollegeProfileView = ({ college, onJoinChat, onBack }) => {
  return (
    <div className="college-profile-view">
      <div className="view-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <h2>College Profile</h2>
      </div>
      <div className="college-profile-content">
        <div className="college-logo-large">
          <img src={college.logo} alt={college.name} />
          {college.isVerified && <span className="verified-badge-large">✓ Verified</span>}
        </div>
        <h1 className="college-name-large">{college.name}</h1>
        <p className="college-location">{college.district}, {college.state}</p>
        <div className="college-about">
          <h3>About</h3>
          <p>{college.about}</p>
        </div>
        <div className="college-stats">
          <div className="stat-item">
            <span className="stat-value">{college.totalMembers}</span>
            <span className="stat-label">Total Members</span>
          </div>
        </div>
        <div className="college-members">
          <h3>Members</h3>
          <div className="members-list">
            {college.members.map(member => (
              <div key={member.id} className="member-avatar" title={member.name}>
                <img src={member.avatar} alt={member.name} />
              </div>
            ))}
            {college.members.length < college.totalMembers && (
              <div className="member-avatar more">
                <span>+{college.totalMembers - college.members.length}</span>
              </div>
            )}
          </div>
        </div>
        <div className="college-actions">
          {!college.isVerified && (
            <button className="btn-secondary">Get Verified</button>
          )}
          <button className="btn-primary" onClick={onJoinChat}>Join Live Chat</button>
        </div>
      </div>
    </div>
  )
}

// Live Chat View Component
const LiveChatView = ({ chat, college, onBack, onViewProfile, user, verificationStatus }) => {
  const [messageInput, setMessageInput] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef(null)
  const socket = getSocket()

  // Get college ID
  const collegeId = college?.aisheCode || chat?.collegeId || college?.name

  // Format date helper
  const formatDate = (date) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  // Fetch message history on mount
  useEffect(() => {
    const loadMessages = async () => {
      if (!collegeId || chat.type !== 'college') {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await fetchMessages(collegeId)
        if (response.success) {
          // Format messages for display
          const formattedMessages = response.messages.map(msg => ({
            id: msg.id,
            text: msg.text,
            sender: msg.senderName,
            senderId: msg.senderId,
            time: new Date(msg.timestamp).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            }),
            date: formatDate(new Date(msg.timestamp)),
            isOwn: String(msg.senderId) === String(user?.id || user?._id || ''),
            timestamp: new Date(msg.timestamp)
          }))
          setMessages(formattedMessages)
        }
      } catch (error) {
        console.error('Error loading messages:', error)
      } finally {
        setLoading(false)
      }
    }

    loadMessages()
  }, [collegeId, chat.type, user?.id])

  // Set up Socket.IO listeners for real-time messages
  useEffect(() => {
    if (!socket || !collegeId || chat.type !== 'college') return

    const handleReceiveMessage = (message) => {
      // Only add message if it's for this college
      if (message.collegeId === collegeId) {
        const formattedMessage = {
          id: message.id,
          text: message.text,
          sender: message.senderName,
          senderId: message.senderId,
          time: new Date(message.timestamp).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          }),
          date: formatDate(new Date(message.timestamp)),
          isOwn: String(message.senderId) === String(user?.id || user?._id || ''),
          timestamp: new Date(message.timestamp)
        }
        
        setMessages(prev => [...prev, formattedMessage])
      }
    }

    onReceiveMessage(handleReceiveMessage)

    return () => {
      // Cleanup is handled by removeAllListeners in parent
    }
  }, [socket, collegeId, chat.type, user?.id])

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (messageInput.trim() && socket?.connected && collegeId) {
      sendMessage(messageInput.trim(), collegeId)
      setMessageInput('')
    }
  }

  let lastDate = null

  // Determine if it's a direct message or college chat
  const isDirectMessage = chat.type === 'direct'
  const displayName = isDirectMessage ? chat.name : (college?.name || chat.name || 'College Chat')
  const displayAvatar = chat.avatar || (college?.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&size=50&background=00a8ff&color=fff`)
  const displayStatus = isDirectMessage 
    ? (chat.isOnline ? 'Online' : 'Offline')
    : `${chat.onlineCount || 0} online`

  return (
    <div className="live-chat-view">
      <div className="chat-header-bar">
        <button className="back-btn" onClick={onBack}>←</button>
        <div className="chat-header-avatar">
          <img src={displayAvatar} alt={displayName} />
        </div>
        <div className="chat-header-info">
          <div className="chat-header-name-row">
            <h3>{displayName}</h3>
            {verificationStatus?.status === 'verified' && (
              <span className="verified-badge-chat" title="Verified Student">✓</span>
            )}
          </div>
          <span className="chat-status">{displayStatus}</span>
        </div>
        <div className="chat-header-actions">
          {!isDirectMessage && verificationStatus?.status !== 'verified' && (
            <button className="action-btn" title="Get Verified">Verify</button>
          )}
          {!isDirectMessage && college && (
            <button className="action-btn" onClick={onViewProfile} title="College Info">ℹ️</button>
          )}
        </div>
      </div>
      <div className="chat-messages-area">
        {loading ? (
          <div className="loading-messages">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="no-messages">No messages yet. Start the conversation!</div>
        ) : (
          (() => {
            let lastDate = null
            return messages.map((message) => {
              const showDate = message.date !== lastDate
              if (showDate) lastDate = message.date
              return (
                <React.Fragment key={message.id}>
                  {showDate && (
                    <div className="date-separator" key={`date-${message.id}`}>
                      <span>{message.date}</span>
                    </div>
                  )}
                  <div className={`message ${message.isOwn ? 'own-message' : 'other-message'}`}>
                    {!message.isOwn && (
                      <div className="message-sender">{message.sender}</div>
                    )}
                    <div className="message-content">
                      <p>{message.text}</p>
                      <span className="message-time">{message.time}</span>
                    </div>
                  </div>
                </React.Fragment>
              )
            })
          })()
        )}
        <div ref={messagesEndRef}></div>
      </div>
      <form className="chat-input-area" onSubmit={handleSendMessage}>
        <input
          type="text"
          className="chat-input"
          placeholder="type a message here..... (keyboard)"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
        />
        <button type="submit" className="send-btn">Send</button>
      </form>
    </div>
  )
}

// Student Profile View Component
const StudentProfileView = ({ user, verificationStatus, onBack, onVerificationUpdate }) => {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const fileInputRef = useRef(null)

  const getUserAvatar = () => {
    if (user?.profile?.profilePicture) {
      return user.profile.profilePicture
    }
    const name = user?.profile?.displayName || user?.email || 'User'
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=100&background=00a8ff&color=fff`
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be less than 5MB')
      return
    }

    try {
      setUploading(true)
      setUploadError(null)
      setUploadSuccess(false)

      const response = await uploadCollegeId(file)
      
      if (response.success) {
        setUploadSuccess(true)
        if (onVerificationUpdate) {
          onVerificationUpdate()
        }
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        setUploadError(response.message || 'Failed to upload college ID')
      }
    } catch (error) {
      console.error('Error uploading college ID:', error)
      setUploadError('Failed to upload college ID. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const getVerificationStatusText = () => {
    if (!verificationStatus) return 'Not submitted'
    switch (verificationStatus.status) {
      case 'verified':
        return 'Verified'
      case 'pending':
        return 'Pending Review'
      case 'rejected':
        return 'Rejected'
      default:
        return 'Not submitted'
    }
  }

  const isVerified = verificationStatus?.status === 'verified'
  const isPending = verificationStatus?.status === 'pending'
  const isNotSubmitted = !verificationStatus || verificationStatus.status === 'not_submitted'

  return (
    <div className="student-profile-view">
      <div className="view-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <h2>My Profile</h2>
      </div>
      <div className="student-profile-content">
        <div className="profile-photo-large">
          <img src={getUserAvatar()} alt="Profile" />
        </div>
        <div className="profile-name-row">
          <h1 className="profile-name">{user?.profile?.displayName || user?.email || 'User'}</h1>
          {isVerified && (
            <span className="verified-badge-profile" title="Verified Student">✓</span>
          )}
        </div>
        <p className="profile-email">{user?.email}</p>
        {user?.profile?.college?.name && (
          <p className="profile-college">{user.profile.college.name}</p>
        )}
        
        {/* Verification Status */}
        <div className="verification-section">
          <h3>Verification Status</h3>
          <div className={`verification-status ${verificationStatus?.status || 'not_submitted'}`}>
            <span className="verification-status-text">{getVerificationStatusText()}</span>
            {isVerified && <span className="verified-icon">✓</span>}
            {isPending && <span className="pending-icon">⏳</span>}
            {verificationStatus?.status === 'rejected' && (
              <span className="rejected-icon">✗</span>
            )}
          </div>
          {verificationStatus?.rejectionReason && (
            <p className="rejection-reason">Reason: {verificationStatus.rejectionReason}</p>
          )}
        </div>

        {user?.profile?.bio && (
          <div className="profile-bio">
            <h3>Bio</h3>
            <p>{user.profile.bio}</p>
          </div>
        )}
        
        <div className="profile-actions">
          {isNotSubmitted && (
            <div className="upload-section">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="college-id-upload"
              />
              <button 
                className="btn-primary" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload College ID'}
              </button>
              {uploadError && (
                <p className="upload-error">{uploadError}</p>
              )}
              {uploadSuccess && (
                <p className="upload-success">College ID uploaded! Verification is pending review.</p>
              )}
            </div>
          )}
          {isPending && (
            <div className="verification-pending-message">
              <p>Your college ID is under review. You'll be notified once verification is complete.</p>
            </div>
          )}
          {isVerified && (
            <div className="verification-success-message">
              <p>✓ Your account is verified. You can now use all features.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Settings View Component
const SettingsView = ({ theme, onToggleTheme, notificationsEnabled, onToggleNotifications, onLogout, onBack }) => {
  return (
    <div className="settings-view">
      <div className="view-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <h2>Settings</h2>
      </div>
      <div className="settings-content">
        <div className="settings-section">
          <h3>Appearance</h3>
          <div className="settings-item">
            <div className="settings-item-info">
              <span className="settings-item-label">Theme</span>
              <span className="settings-item-desc">Switch between dark and light mode</span>
            </div>
            <button className="toggle-btn" onClick={onToggleTheme}>
              {theme === 'dark' ? '🌗 Dark' : '☀️ Light'}
            </button>
          </div>
        </div>
        <div className="settings-section">
          <h3>Notifications</h3>
          <div className="settings-item">
            <div className="settings-item-info">
              <span className="settings-item-label">Enable Notifications</span>
              <span className="settings-item-desc">Receive alerts for new messages</span>
            </div>
            <button className={`toggle-btn ${notificationsEnabled ? 'active' : ''}`} onClick={() => onToggleNotifications(!notificationsEnabled)}>
              {notificationsEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
        <div className="settings-section">
          <h3>Privacy</h3>
          <div className="settings-item">
            <div className="settings-item-info">
              <span className="settings-item-label">Privacy Settings</span>
              <span className="settings-item-desc">Manage your privacy preferences</span>
            </div>
            <button className="btn-secondary">Manage</button>
          </div>
        </div>
        <div className="settings-section">
          <h3>Account</h3>
          <div className="settings-item">
            <div className="settings-item-info">
              <span className="settings-item-label">Change Password</span>
              <span className="settings-item-desc">Update your account password</span>
            </div>
            <button className="btn-secondary">Change</button>
          </div>
        </div>
        <div className="settings-section">
          <div className="settings-item">
            <button className="btn-danger" onClick={onLogout}>Logout</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Chat
