import { useState, useEffect, useRef, useCallback, Fragment } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { verifyAuth, logout } from '../services/authService'
import { connectSocket, disconnectSocket, getSocket, onJoinedRoom, onReceiveMessage, onSocketError, sendMessage, removeAllListeners, joinCollegeRoom } from '../services/socketService'
import { fetchMessages, fetchUserCollegesWithMessages } from '../services/messageService'
import { getCollegeChatInfo } from '../services/chatService'
import { uploadCollegeId, getVerificationStatus, uploadProfilePicture, updateProfile, joinCollege, leaveCollege } from '../services/profileService'
import './Chat.css'


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
  const [verificationStatus, setVerificationStatus] = useState(null) // User verification status
  const [searchQuery, setSearchQuery] = useState('') // For filtering chats
  const [collegeSearchQuery, setCollegeSearchQuery] = useState('') // For college search
  const [collegeSuggestions, setCollegeSuggestions] = useState([]) // College search suggestions
  const [showCollegeSuggestions, setShowCollegeSuggestions] = useState(false)
  const [loadingCollegeSearch, setLoadingCollegeSearch] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false) // For mobile search bar visibility
  const [isSearchActive, setIsSearchActive] = useState(false) // For search mode in middle panel
  const [searchBarAtTop, setSearchBarAtTop] = useState(false) // Track if search bar moved to top
  const [selectedCollegeInSearch, setSelectedCollegeInSearch] = useState(null) // Selected college in search view
  const [selectedState, setSelectedState] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [states, setStates] = useState([])
  const [districts, setDistricts] = useState([])
  const [recentCollegeSearches, setRecentCollegeSearches] = useState([])
  const collegeSearchRef = useRef(null)
  const collegeSuggestionsRef = useRef(null)
  const [chats, setChats] = useState([]) // Dynamic chat list
  const [unreadCounts, setUnreadCounts] = useState({}) // Track unread counts per chat
  const [isLoading, setIsLoading] = useState(true) // Loading state
  const navigationHistory = useRef([]) // Track navigation history for back button

  // Load user data and connect Socket.IO
  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log('🔄 Loading user data...')
        setIsLoading(true)
        const data = await verifyAuth()
        console.log('✅ User data loaded:', data.success ? 'Success' : 'Failed')
        if (data.success) {
          setUser(data.user)
          
          // Connect Socket.IO after user is loaded (token will be read from cookies)
          try {
            const socketInstance = connectSocket();
            
            if (socketInstance) {
              // Wait for connection to be established
              socketInstance.once('connect', () => {
                console.log('✅ Socket.IO connected on initial load')
                
                // Set up Socket.IO listeners
                onJoinedRoom((data) => {
                  console.log('✅ Joined college room:', data);
                });
                
                onSocketError((error) => {
                  console.error('Socket error:', error);
                });
              })
              
              // Set up listeners even if not connected yet
              onJoinedRoom((data) => {
                console.log('✅ Joined college room:', data);
              });
              
              onSocketError((error) => {
                console.error('Socket error:', error);
              });
            } else {
              console.log('Socket.IO connection will be retried when needed')
            }
          } catch (socketError) {
            console.log('Socket.IO connection will be retried later:', socketError.message)
          }

          // Load user's college chat
          if (data.user?.profile?.college) {
            loadUserCollegeChat(data.user.profile.college);
          }

          // Load all colleges with messages (for chats section)
          if (activeSection === 'chats') {
            // Will be loaded via handleSectionChange or directly here
            setTimeout(() => {
              // Load after a short delay to ensure state is ready
            }, 100)
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

  // Load recent college searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentCollegeSearches')
    if (saved) {
      try {
        const recent = JSON.parse(saved)
        setRecentCollegeSearches(recent.slice(0, 5)) // Top 5
      } catch (error) {
        console.error('Error loading recent searches:', error)
      }
    }
  }, [])

  // Fetch states on component mount
  useEffect(() => {
    fetchStates()
  }, [])

  // Fetch districts when state changes
  useEffect(() => {
    if (selectedState) {
      fetchDistricts(selectedState)
      setSelectedDistrict('')
    } else {
      setDistricts([])
      setSelectedDistrict('')
    }
  }, [selectedState])

  // Search colleges when query or filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (collegeSearchQuery.trim().length >= 2) {
        searchColleges(collegeSearchQuery.trim())
      } else {
        setCollegeSuggestions([])
        setShowCollegeSuggestions(false)
      }
    }, 300) // Debounce search

    return () => clearTimeout(timeoutId)
  }, [collegeSearchQuery, selectedState, selectedDistrict])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        collegeSearchRef.current &&
        !collegeSearchRef.current.contains(event.target) &&
        collegeSuggestionsRef.current &&
        !collegeSuggestionsRef.current.contains(event.target)
      ) {
        setShowCollegeSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Use ref to track if navigation state has been handled for current location
  const navigationStateHandled = useRef(null)

  // Handle college from navigation state (after user is loaded)
  useEffect(() => {
    // Only handle navigation state once when user is loaded
    if (!user || isLoading) {
      return
    }

    // Check if we have navigation state to handle
    const hasNavigationState = location.state?.college && location.state?.openCollegeChat
    
    if (!hasNavigationState) {
      // Reset when there's no navigation state
      navigationStateHandled.current = null
      return
    }

    // Create a unique key for this navigation state using location.key (changes on navigation)
    const locationKey = location.key || location.pathname
    const collegeId = location.state.college?.aisheCode || location.state.college?.name || 'unknown'
    const navigationKey = `${collegeId}-${locationKey}`
    
    // Only handle if we haven't handled this specific navigation state yet
    if (navigationStateHandled.current === navigationKey) {
      return
    }

    // Mark as handled immediately to prevent re-running
    navigationStateHandled.current = navigationKey

    // Don't open chat if we're currently viewing a profile (search or right panel)
    const isViewingProfile = (activeSection === 'search' && selectedCollegeInSearch) || 
                             (view === 'college-profile' && selectedCollege)
    
    if (!isViewingProfile) {
      const college = location.state.college
      console.log('Opening college chat from navigation:', college)
      handleOpenCollegeChat(college)
    }
    
    // Clear the state to prevent reopening on re-render
    window.history.replaceState({}, document.title)
  }, [user, isLoading, location.key, location.pathname]) // Include location.key to detect navigation changes

  // Fetch states
  const fetchStates = async () => {
    try {
      const response = await fetch('/api/colleges/states')
      const data = await response.json()
      if (data.success) {
        setStates(data.states)
      }
    } catch (error) {
      console.error('Error fetching states:', error)
    }
  }

  // Fetch districts
  const fetchDistricts = async (state) => {
    try {
      const response = await fetch(`/api/colleges/districts?state=${encodeURIComponent(state)}`)
      const data = await response.json()
      if (data.success) {
        setDistricts(data.districts)
      }
    } catch (error) {
      console.error('Error fetching districts:', error)
    }
  }

  // Search colleges
  const searchColleges = async (query) => {
    try {
      setLoadingCollegeSearch(true)
      const params = new URLSearchParams({ query, limit: '10' })
      
      if (selectedState) {
        params.append('state', selectedState)
      }
      
      if (selectedDistrict) {
        params.append('district', selectedDistrict)
      }

      const response = await fetch(`/api/colleges/search?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setCollegeSuggestions(data.colleges)
        setShowCollegeSuggestions(data.colleges.length > 0)
      }
    } catch (error) {
      console.error('Error searching colleges:', error)
      setCollegeSuggestions([])
    } finally {
      setLoadingCollegeSearch(false)
    }
  }

  // Handle college suggestion click
  const handleCollegeSuggestionClick = (college) => {
    // If in search view, show profile in search panel (don't save state for this)
    if (activeSection === 'search') {
      setCollegeSearchQuery(college.name)
      setShowCollegeSuggestions(false)
      setSelectedCollegeInSearch(college)
      setSearchBarAtTop(true)
      
      // Save to recent searches
      const recent = [college, ...recentCollegeSearches.filter(c => c.aisheCode !== college.aisheCode)].slice(0, 5)
      setRecentCollegeSearches(recent)
      localStorage.setItem('recentCollegeSearches', JSON.stringify(recent))
    } else {
      // Otherwise, open college profile in main chat section (save state)
      saveNavigationState()
      handleViewCollegeProfile(college)
    }
  }

  // Handle college search submit
  const handleCollegeSearch = (e) => {
    e.preventDefault()
    if (collegeSearchQuery.trim()) {
      if (collegeSuggestions.length === 1) {
        handleCollegeSuggestionClick(collegeSuggestions[0])
      } else if (collegeSuggestions.length > 0) {
        handleCollegeSuggestionClick(collegeSuggestions[0])
      } else {
        setShowCollegeSuggestions(false)
      }
    }
  }

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

  // Load all colleges with messages
  const loadAllCollegesWithMessages = useCallback(async () => {
    try {
      const response = await fetchUserCollegesWithMessages()
      if (response.success && response.colleges) {
        // Convert colleges to chat format
        const newChats = response.colleges.map(college => {
          const collegeId = college.aisheCode || college.name
          const collegeName = college.name || 'College Chat'
          const collegeLogo = college.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(collegeName)}&size=50&background=00a8ff&color=fff`
          
          return {
            id: `college-${collegeId}`,
            type: 'college',
            collegeId: collegeId,
            name: collegeName,
            lastMessage: college.lastMessage?.text || 'No messages yet',
            timestamp: college.lastMessage?.timestamp ? formatChatTimestamp(college.lastMessage.timestamp) : '',
            unreadCount: unreadCounts[collegeId] || 0,
            onlineCount: 0,
            avatar: collegeLogo,
            college: {
              id: college.id,
              aisheCode: college.aisheCode,
              name: college.name,
              state: college.state,
              district: college.district,
              logo: college.logo
            },
            lastMessageTime: college.lastMessage?.timestamp || null
          }
        })

        // Merge with existing chats, updating existing ones and adding new ones
        setChats(prev => {
          const existingMap = new Map(prev.map(c => [c.id, c]))
          
          // Update existing chats or add new ones
          newChats.forEach(newChat => {
            const existing = existingMap.get(newChat.id)
            if (existing) {
              // Update existing chat with latest message info, but preserve unread count
              existingMap.set(newChat.id, {
                ...existing,
                lastMessage: newChat.lastMessage,
                timestamp: newChat.timestamp,
                lastMessageTime: newChat.lastMessageTime,
                avatar: newChat.avatar,
                college: newChat.college
              })
            } else {
              // Add new chat
              existingMap.set(newChat.id, newChat)
            }
          })
          
          // Convert back to array and sort by last message time
          const combined = Array.from(existingMap.values()).sort((a, b) => {
            const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0
            const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0
            return timeB - timeA // Most recent first
          })
          
          return combined
        })
      }
    } catch (error) {
      console.error('Error loading colleges with messages:', error)
    }
  }, [unreadCounts])

  // Load all colleges with messages when component mounts and user is loaded
  useEffect(() => {
    if (user && activeSection === 'chats' && !isLoading) {
      loadAllCollegesWithMessages()
    }
  }, [user, activeSection, isLoading, loadAllCollegesWithMessages])

  // Save current navigation state to history
  const saveNavigationState = () => {
    const currentState = {
      activeSection,
      view,
      selectedChat: selectedChat ? { id: selectedChat.id, collegeId: selectedChat.collegeId } : null,
      selectedCollege: selectedCollege ? { id: selectedCollege.id, aisheCode: selectedCollege.aisheCode, name: selectedCollege.name } : null,
      selectedCollegeInSearch: selectedCollegeInSearch ? { id: selectedCollegeInSearch.id, aisheCode: selectedCollegeInSearch.aisheCode, name: selectedCollegeInSearch.name } : null,
      isSearchActive,
      searchBarAtTop,
      showChatList
    }
    navigationHistory.current.push(currentState)
    // Keep only last 10 states to prevent memory issues
    if (navigationHistory.current.length > 10) {
      navigationHistory.current.shift()
    }
  }

  // Navigate back to previous page
  const navigateBack = () => {
    if (navigationHistory.current.length > 0) {
      const previousState = navigationHistory.current.pop()
      
      // Restore previous state
      setActiveSection(previousState.activeSection)
      setView(previousState.view)
      
      // Restore selectedChat if it exists in current chats
      if (previousState.selectedChat) {
        const restoredChat = chats.find(c => c.id === previousState.selectedChat.id)
        setSelectedChat(restoredChat || null)
      } else {
        setSelectedChat(null)
      }
      
      // Restore selectedCollege - try to find it from chats or keep the saved reference
      if (previousState.selectedCollege) {
        // Try to find college from chats first
        const chatWithCollege = chats.find(c => 
          c.college && (
            c.college.aisheCode === previousState.selectedCollege.aisheCode ||
            c.college.name === previousState.selectedCollege.name
          )
        )
        if (chatWithCollege && chatWithCollege.college) {
          setSelectedCollege(chatWithCollege.college)
        } else {
          // Use the saved college data
          setSelectedCollege(previousState.selectedCollege)
        }
      } else {
        setSelectedCollege(null)
      }
      
      setSelectedCollegeInSearch(previousState.selectedCollegeInSearch || null)
      setIsSearchActive(previousState.isSearchActive || false)
      setSearchBarAtTop(previousState.searchBarAtTop || false)
      setShowChatList(previousState.showChatList !== undefined ? previousState.showChatList : true)
      
      // If going back to chats, load messages
      if (previousState.activeSection === 'chats') {
        loadAllCollegesWithMessages()
      }
    } else {
      // If no history, go to home
      navigateToHome()
    }
  }

  // Helper function to navigate to home page
  const navigateToHome = () => {
    setActiveSection('chats')
    setView('list')
    setSelectedChat(null)
    setSelectedCollege(null)
    setSelectedCollegeInSearch(null)
    setIsSearchActive(false)
    setSearchBarAtTop(false)
    setCollegeSearchQuery('')
    setShowCollegeSuggestions(false)
    if (isMobileView) {
      setShowChatList(true)
    }
    loadAllCollegesWithMessages()
  }

  // Handle section change
  const handleSectionChange = (section) => {
    setActiveSection(section)
    setView('list')
    setSelectedChat(null)
    setSelectedCollege(null)
    
    // Show chat list on mobile when switching to chats section
    if (section === 'chats' && isMobileView) {
      setShowChatList(true)
    }
    
    // Load all colleges with messages when switching to chats section
    if (section === 'chats') {
      loadAllCollegesWithMessages()
    }
    
    if (section !== 'search') {
      setIsSearchActive(false)
      setSearchBarAtTop(false)
      setCollegeSearchQuery('')
      setShowCollegeSuggestions(false)
      setSelectedCollegeInSearch(null)
    }
  }

  // Handle chat selection
  const handleChatSelect = (chat) => {
    saveNavigationState() // Save current state before navigating
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
    saveNavigationState() // Save current state before navigating
    setSelectedCollege(college)
    setView('college-profile')
    if (isMobileView) {
      setShowChatList(false)
    }
  }

  // Handle join live chat
  const handleJoinLiveChat = (college) => {
    saveNavigationState() // Save current state before navigating
    const collegeId = college.aisheCode || college.name || college.id
    // Find chat in the actual chats state
    const chat = chats.find(c => 
      c.type === 'college' && 
      (c.collegeId === collegeId || c.name === college.name)
    )
    
    if (chat) {
      setSelectedChat(chat)
      setSelectedCollege(college)
      setView('live-chat')
      if (isMobileView) {
        setShowChatList(false)
      }
    } else {
      // If chat doesn't exist, create it and open it
      handleOpenCollegeChat(college)
    }
  }

  // Handle leaving a college
  const handleLeaveCampus = async (college) => {
    try {
      const response = await leaveCollege(college)
      if (response.success) {
        // Don't remove the college chat from the list - keep it accessible
        // User can still view and participate in the chat even after unfollowing
        // Clear selected chat if it's the one being left (optional)
        // if (selectedChat?.collegeId === (college.aisheCode || college.name)) {
        //   setSelectedChat(null)
        //   setView('list')
        // }
      }
      return response
    } catch (error) {
      console.error('Error leaving college:', error)
      throw error
    }
  }

  // Handle profile click
  const handleProfileClick = () => {
    saveNavigationState() // Save current state before navigating
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

  // Helper function to truncate message preview
  const truncateMessage = (text, maxLength = 50) => {
    if (!text) return 'No messages yet'
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
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

  // Update chat list when message is sent or received
  const updateChatListOnMessage = useCallback((collegeId, messageText, messageTimestamp, isOwnMessage = false) => {
    setChats(prev => {
      const chatIndex = prev.findIndex(c => c.collegeId === collegeId)
      
      if (chatIndex === -1) {
        // Chat doesn't exist, try to find college data
        const existingChat = prev.find(c => c.college?.aisheCode === collegeId || c.college?.name === collegeId)
        if (existingChat) {
          // Use existing chat data
          const updatedChats = [...prev]
          const chat = { ...existingChat }
          chat.lastMessage = truncateMessage(messageText)
          chat.timestamp = formatChatTimestamp(messageTimestamp)
          chat.lastMessageTime = messageTimestamp
          chat.unreadCount = isOwnMessage || selectedChat?.collegeId === collegeId ? 0 : (chat.unreadCount || 0)
          
          // Move to top
          updatedChats.splice(prev.findIndex(c => c.id === existingChat.id), 1)
          updatedChats.unshift(chat)
          return updatedChats
        }
        // If still not found, return unchanged (chat will be created when opened)
        return prev
      }
      
      // Update existing chat
      const updatedChats = [...prev]
      const chat = { ...updatedChats[chatIndex] }
      
      // Update last message and timestamp
      chat.lastMessage = truncateMessage(messageText)
      chat.timestamp = formatChatTimestamp(messageTimestamp)
      chat.lastMessageTime = messageTimestamp
      
      // Only increment unread count if:
      // 1. Message is not from current user
      // 2. Chat is not currently open
      if (!isOwnMessage && selectedChat?.collegeId !== collegeId) {
        chat.unreadCount = (chat.unreadCount || 0) + 1
        setUnreadCounts(prev => ({
          ...prev,
          [collegeId]: (prev[collegeId] || 0) + 1
        }))
      } else {
        // Reset unread if chat is open or message is from user
        chat.unreadCount = 0
        setUnreadCounts(prev => ({
          ...prev,
          [collegeId]: 0
        }))
      }
      
      // Move chat to top (most recent first)
      updatedChats.splice(chatIndex, 1)
      updatedChats.unshift(chat)
      
      return updatedChats
    })
  }, [selectedChat])

  // Handle new message - update chat list
  const handleNewMessage = useCallback((message) => {
    const collegeId = message.collegeId
    const isOwnMessage = String(message.senderId) === String(user?.id || user?._id || '')
    
    // Update chat list
    updateChatListOnMessage(collegeId, message.text, message.timestamp, isOwnMessage)
  }, [user, updateChatListOnMessage])

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

  // Filter and sort chats based on search and last message time
  const filteredChats = chats
    .filter(chat => chat.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      // Sort by last message time (most recent first)
      // If both have lastMessageTime, use that
      // Otherwise fall back to timestamp or 0
      const timeA = a.lastMessageTime 
        ? new Date(a.lastMessageTime).getTime() 
        : (a.timestamp ? new Date(a.timestamp).getTime() : 0)
      const timeB = b.lastMessageTime 
        ? new Date(b.lastMessageTime).getTime() 
        : (b.timestamp ? new Date(b.timestamp).getTime() : 0)
      
      // Most recent first
      if (timeB !== timeA) {
        return timeB - timeA
      }
      
      // If times are equal, prioritize chats with unread messages
      return (b.unreadCount || 0) - (a.unreadCount || 0)
    })

  // Render middle panel content based on active section
  const renderMiddlePanel = () => {
    if (activeSection === 'search') {
      return (
        <div className="search-view-container">
          {/* Search page header with back button and title - only show when search bar is not at top */}
          {!searchBarAtTop && (
            <div className="view-header">
              <button className="back-btn" onClick={navigateBack}>←</button>
              <h2>Search Colleges</h2>
            </div>
          )}
          {!searchBarAtTop && (
            <div className="search-center-container">
              <div className="search-center-form">
                <form 
                  className="search-center-form-wrapper"
                  onSubmit={handleCollegeSearch}
                >
                  <input
                    type="text"
                    className="search-center-input"
                    placeholder="explore colleges..."
                    value={collegeSearchQuery}
                    onChange={(e) => {
                      setCollegeSearchQuery(e.target.value)
                      if (e.target.value.trim().length > 0) {
                        setSearchBarAtTop(true)
                      }
                    }}
                    onFocus={() => {
                      if (collegeSearchQuery.trim().length > 0) {
                        setSearchBarAtTop(true)
                      }
                      if (recentCollegeSearches.length > 0 || collegeSuggestions.length > 0) {
                        setShowCollegeSuggestions(true)
                      }
                    }}
                    ref={collegeSearchRef}
                    autoFocus
                  />
                  <button type="submit" className="search-center-button">
                    <span>🔍</span>
                  </button>
                </form>
              </div>
            </div>
          )}
          
          {searchBarAtTop && (
            <>
              <div className="search-top-bar">
                <form 
                  className="search-top-form"
                  onSubmit={handleCollegeSearch}
                >
                  <button 
                    type="button" 
                    className="search-back-btn"
                    onClick={() => {
                      if (selectedCollegeInSearch) {
                        // If viewing a college profile, go back to search suggestions
                        setSelectedCollegeInSearch(null)
                        setShowCollegeSuggestions(true)
                      } else if (collegeSearchQuery.trim().length > 0) {
                        // If there's a search query, clear it and stay in search mode
                        setCollegeSearchQuery('')
                        setShowCollegeSuggestions(false)
                      } else {
                        // If no query, navigate back to previous page
                        navigateBack()
                      }
                    }}
                  >
                    ←
                  </button>
                  <input
                    type="text"
                    className="search-top-input"
                    placeholder="explore colleges..."
                    value={collegeSearchQuery}
                    onChange={(e) => {
                      setCollegeSearchQuery(e.target.value)
                    }}
                    onFocus={() => {
                      if (recentCollegeSearches.length > 0 || collegeSuggestions.length > 0) {
                        setShowCollegeSuggestions(true)
                      }
                    }}
                    ref={collegeSearchRef}
                    autoFocus
                  />
                  {collegeSearchQuery && (
                    <button 
                      type="button" 
                      className="search-clear-btn"
                      onClick={() => {
                        setCollegeSearchQuery('')
                        setShowCollegeSuggestions(false)
                        collegeSearchRef.current?.focus()
                      }}
                    >
                      ✕
                    </button>
                  )}
                </form>
              </div>
              
              <div className="search-results-container">
                {selectedCollegeInSearch ? (
                  // Show college profile in search panel
                  <div className="search-college-profile">
                    <CollegeProfileView 
                      college={selectedCollegeInSearch} 
                      user={user}
                      onBack={navigateBack}
                      showBackButton={true}
                      onJoinChat={() => {
                        // Open chat in the right panel (same chat section)
                        handleJoinLiveChat(selectedCollegeInSearch)
                        // Clear search selection to show chat
                        setSelectedCollegeInSearch(null)
                        // Keep search section active, chat will show in right panel
                        if (isMobileView) {
                          setShowChatList(false)
                        }
                      }}
                      onJoinCampus={async (college) => {
                        try {
                          // Clear navigation state immediately to prevent auto-opening chat
                          window.history.replaceState({}, document.title)
                          
                          // Add student as member of college
                          const response = await joinCollege(college)
                          if (response.success) {
                            // Reload user to get updated college membership info
                            const userResponse = await verifyAuth()
                            if (userResponse.success) {
                              setUser(userResponse.user)
                            }
                            // Update selected college in search with incremented member count
                            // Keep the same college object to maintain the profile view
                            const updatedCollege = {
                              ...college,
                              totalMembers: (college.totalMembers || 0) + 1
                            }
                            // Ensure we stay on the search section and keep the profile view
                            // Explicitly prevent any navigation to chat
                            setActiveSection('search')
                            setSelectedCollegeInSearch(updatedCollege)
                            // Make sure we don't open the chat
                            if (view === 'live-chat') {
                              setView('list')
                            }
                            // Don't change selectedChat - keep it as is
                            
                            // Add college to chats list in home section if not already there
                            const collegeId = college.aisheCode || college.name
                            const collegeName = college.name || 'College Chat'
                            const collegeLogo = college.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(collegeName)}&size=50&background=00a8ff&color=fff`
                            
                            setChats(prev => {
                              const exists = prev.find(c => 
                                c.type === 'college' && 
                                (c.collegeId === collegeId || c.name === collegeName)
                              )
                              if (!exists) {
                                return [{
                                  id: `college-${collegeId}`,
                                  type: 'college',
                                  collegeId: collegeId,
                                  name: collegeName,
                                  avatar: collegeLogo,
                                  lastMessage: 'No messages yet',
                                  timestamp: '',
                                  lastMessageTime: new Date(),
                                  unreadCount: 0,
                                  college: updatedCollege
                                }, ...prev]
                              }
                              return prev
                            })
                          }
                          return response
                        } catch (error) {
                          console.error('Error joining college:', error)
                          return { success: false, message: error.message }
                        }
                      }}
                      onLeaveCampus={async (college) => {
                        try {
                          // Clear navigation state immediately to prevent auto-opening chat
                          window.history.replaceState({}, document.title)
                          
                          const response = await leaveCollege(college)
                          if (response.success) {
                            // Reload user to get updated college membership info
                            const userResponse = await verifyAuth()
                            if (userResponse.success) {
                              setUser(userResponse.user)
                            }
                            // Update selected college in search with decremented member count
                            // Keep the same college object to maintain the profile view
                            const updatedCollege = {
                              ...college,
                              totalMembers: Math.max((college.totalMembers || 1) - 1, 0)
                            }
                            // Ensure we stay on the search section and keep the profile view
                            // Explicitly prevent any navigation to chat
                            setActiveSection('search')
                            setSelectedCollegeInSearch(updatedCollege)
                            // Make sure we don't open the chat
                            if (view === 'live-chat') {
                              setView('list')
                            }
                            // Don't change selectedChat - keep it as is
                            
                            // Don't remove college from chats list - keep it so user can still access the chat
                            // Only remove if user explicitly wants to leave the chat
                          }
                          return response
                        } catch (error) {
                          console.error('Error leaving college:', error)
                          return { success: false, message: error.message }
                        }
                      }}
                    />
                  </div>
                ) : loadingCollegeSearch ? (
                  <div className="search-loading">
                    <div className="spinner"></div>
                    <p>Searching colleges...</p>
                  </div>
                ) : showCollegeSuggestions && (collegeSuggestions.length > 0 || recentCollegeSearches.length > 0) ? (
                  <div className="search-results-list">
                    {collegeSuggestions.length > 0 ? (
                      <>
                        <div className="search-results-header">Search Results</div>
                        {collegeSuggestions.map((college) => (
                          <div
                            key={college.aisheCode || college.id}
                            className="search-result-item"
                            onClick={() => {
                              handleCollegeSuggestionClick(college)
                            }}
                          >
                            <div className="search-result-avatar">
                              <img src={college.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(college.name)}&size=50&background=00a8ff&color=fff`} alt={college.name} />
                              <span className="verified-badge-small">
                                <img src="/blutick.jpg" alt="Verified" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                              </span>
                            </div>
                            <div className="search-result-info">
                              <div className="search-result-name">{college.name}</div>
                              <div className="search-result-location">{college.district}, {college.state}</div>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        <div className="search-results-header">Recent Searches</div>
                        {recentCollegeSearches.slice(0, 5).map((college) => (
                          <div
                            key={college.aisheCode || college.id}
                            className="search-result-item"
                            onClick={() => {
                              handleCollegeSuggestionClick(college)
                            }}
                          >
                            <div className="search-result-avatar">
                              <img src={college.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(college.name)}&size=50&background=00a8ff&color=fff`} alt={college.name} />
                              <span className="verified-badge-small">
                                <img src="/blutick.jpg" alt="Verified" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                              </span>
                            </div>
                            <div className="search-result-info">
                              <div className="search-result-name">{college.name}</div>
                              <div className="search-result-location">{college.district}, {college.state}</div>
                            </div>
                            <span className="history-badge">Recent</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                ) : collegeSearchQuery.trim().length >= 2 ? (
                  <div className="search-empty">
                    <div className="search-empty-icon">🔍</div>
                    <p className="search-empty-message">No colleges found</p>
                    <p className="search-empty-hint">Try a different search term</p>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      )
    }
    
    if (activeSection === 'chats') {
      return (
        <>
          <div className="panel-header panel-header-with-search">
            <h2>all chats</h2>
            <div className="panel-header-search">
              <input
                type="text"
                className="panel-search-input"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="panel-search-icon">🔍</span>
            </div>
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
                    {chat.type === 'college' && (
                      <span className="verified-badge">
                        <img src="/blutick.jpg" alt="Verified" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                      </span>
                    )}
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
                      <span className="panel-item-message">{truncateMessage(chat.lastMessage) || 'No messages yet'}</span>
                      {chat.unreadCount > 0 && (
                        <span className="panel-item-unread">{chat.unreadCount > 99 ? '99+' : chat.unreadCount}</span>
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
                  <span className="verified-badge">
                    <img src="/blutick.jpg" alt="Verified" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                  </span>
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
      return <CollegeProfileView 
        college={selectedCollege} 
        user={user}
        onBack={navigateBack}
        onJoinChat={() => handleJoinLiveChat(selectedCollege)} 
        onJoinCampus={async (college) => {
          try {
            // Clear navigation state immediately to prevent auto-opening chat
            window.history.replaceState({}, document.title)
            
            // Add student as member of college
            const response = await joinCollege(college)
            if (response.success) {
              // Reload user to get updated college membership info
              const userResponse = await verifyAuth()
              if (userResponse.success) {
                setUser(userResponse.user)
              }
              // Update selectedCollege with incremented member count
              // Keep the same college object to maintain the profile view
              const updatedCollege = {
                ...college,
                totalMembers: (college.totalMembers || 0) + 1
              }
              // Ensure we stay on the college profile view
              // Explicitly prevent any navigation to chat
              setView('college-profile')
              setSelectedCollege(updatedCollege)
              // Make sure we don't open the chat - clear selectedChat if it was set
              if (selectedChat?.collegeId === (college.aisheCode || college.name)) {
                // Keep selectedChat as is, but ensure view stays on profile
              }
              
              // Add college to chats list in home section if not already there
              const collegeId = college.aisheCode || college.name
              const collegeName = college.name || 'College Chat'
              const collegeLogo = college.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(collegeName)}&size=50&background=00a8ff&color=fff`
              
              setChats(prev => {
                const exists = prev.find(c => 
                  c.type === 'college' && 
                  (c.collegeId === collegeId || c.name === collegeName)
                )
                if (!exists) {
                  return [{
                    id: `college-${collegeId}`,
                    type: 'college',
                    collegeId: collegeId,
                    name: collegeName,
                    avatar: collegeLogo,
                    lastMessage: 'No messages yet',
                    timestamp: '',
                    lastMessageTime: new Date(),
                    unreadCount: 0,
                    college: updatedCollege
                  }, ...prev]
                }
                return prev
              })
            }
            return response
          } catch (error) {
            console.error('Error joining college:', error)
            return { success: false, message: error.message }
          }
        }}
        onLeaveCampus={async (college) => {
          try {
            // Clear navigation state immediately to prevent auto-opening chat
            window.history.replaceState({}, document.title)
            
            const response = await leaveCollege(college)
            if (response.success) {
              // Reload user to get updated college membership info
              const userResponse = await verifyAuth()
              if (userResponse.success) {
                setUser(userResponse.user)
              }
              // Update selectedCollege with decremented member count
              // Keep the same college object to maintain the profile view
              const updatedCollege = {
                ...college,
                totalMembers: Math.max((college.totalMembers || 1) - 1, 0)
              }
              // Ensure we stay on the college profile view
              // Explicitly prevent any navigation to chat
              setView('college-profile')
              setSelectedCollege(updatedCollege)
              // Make sure we don't open the chat
              
              // Don't remove college from chats list - keep it so user can still access the chat
              // Only remove if user explicitly wants to leave the chat
              
              // Clear selected chat if it's the one being left (but keep profile view)
              if (selectedChat?.collegeId === collegeId) {
                setSelectedChat(null)
                // Don't change view - stay on profile
              }
            }
            return response
          } catch (error) {
            console.error('Error leaving college:', error)
            return { success: false, message: error.message }
          }
        }}
        onBack={navigateBack} 
      />
    }
    if (view === 'live-chat' && selectedChat) {
      const college = selectedChat.type === 'college' 
        ? selectedChat.college
        : null
      return <LiveChatView chat={selectedChat} college={college} user={user} verificationStatus={verificationStatus} onBack={() => { setView('list'); if (isMobileView) setShowChatList(true) }} onViewProfile={() => college && handleViewCollegeProfile(college)} onMessageSent={updateChatListOnMessage} />
    }
    if (view === 'student-profile') {
      // Ensure handleLeaveCampus is defined
      const leaveCollegeHandler = handleLeaveCampus || (async (college) => {
        console.warn('handleLeaveCampus not available, using fallback')
        try {
          const response = await leaveCollege(college)
          if (response.success) {
            // Don't remove college chat - keep it accessible
            // setChats(prev => prev.filter(c => c.collegeId !== (college.aisheCode || college.name)))
            // if (selectedChat?.collegeId === (college.aisheCode || college.name)) {
            //   setSelectedChat(null)
            //   setView('list')
            // }
          }
          return response
        } catch (error) {
          console.error('Error leaving college:', error)
          return { success: false, message: error.message }
        }
      })
      
      return <StudentProfileView 
        user={user} 
        verificationStatus={verificationStatus} 
        onBack={navigateBack} 
        onVerificationUpdate={loadVerificationStatus}
        onProfileUpdate={async () => {
          try {
            const authData = await verifyAuth()
            if (authData.success) {
              setUser(authData.user)
            }
          } catch (error) {
            console.error('Error updating profile:', error)
          }
        }}
        onLeaveCollege={leaveCollegeHandler}
      />
    }
    if (view === 'settings') {
      return <SettingsView theme={theme} onToggleTheme={toggleTheme} notificationsEnabled={notificationsEnabled} onToggleNotifications={setNotificationsEnabled} onLogout={handleLogout} onBack={navigateBack} />
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
      {/* Top Header with Logo and Search */}
      <div className="chat-top-header">
        <div className="header-logo">
          <h1 className="app-title">connect campus</h1>
        </div>
        {/* Search bar on the right side - same as landing page */}
        {!isMobileView && (
          <div className="header-search-wrapper">
            <form 
              className="header-search-form"
              onSubmit={handleCollegeSearch}
            >
              <input
                type="text"
                className="header-search-input"
                placeholder="search you college...."
                value={collegeSearchQuery}
                onChange={(e) => {
                  setCollegeSearchQuery(e.target.value)
                }}
                onFocus={() => {
                  if (recentCollegeSearches.length > 0 || collegeSuggestions.length > 0) {
                    setShowCollegeSuggestions(true)
                  }
                }}
                ref={collegeSearchRef}
                autoComplete="off"
              />
              <button type="submit" className="header-search-button">
                {loadingCollegeSearch ? (
                  <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="32">
                      <animate attributeName="stroke-dasharray" dur="2s" values="0 32;16 16;0 32;0 32" repeatCount="indefinite"/>
                      <animate attributeName="stroke-dashoffset" dur="2s" values="0;-16;-32;-32" repeatCount="indefinite"/>
                    </circle>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </form>
            {showCollegeSuggestions && (collegeSuggestions.length > 0 || recentCollegeSearches.length > 0) && (
              <div className="header-suggestions-dropdown" ref={collegeSuggestionsRef}>
                {collegeSuggestions.length > 0 ? (
                  collegeSuggestions.map((college) => (
                    <div
                      key={college.aisheCode || college.id}
                      className="suggestion-item"
                      onClick={() => handleCollegeSuggestionClick(college)}
                    >
                      <div className="suggestion-avatar">
                        <img src={college.logo} alt={college.name} />
                        <span className="verified-badge-small">
                          <img src="/blutick.jpg" alt="Verified" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                        </span>
                      </div>
                      <div className="suggestion-info">
                        <div className="suggestion-name">{college.name}</div>
                        <div className="suggestion-location">{college.district}, {college.state}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  recentCollegeSearches.slice(0, 5).map((college) => (
                    <div
                      key={college.aisheCode || college.id}
                      className="suggestion-item"
                      onClick={() => handleCollegeSuggestionClick(college)}
                    >
                      <div className="suggestion-avatar">
                        <img src={college.logo} alt={college.name} />
                        <span className="verified-badge-small">
                          <img src="/blutick.jpg" alt="Verified" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                        </span>
                      </div>
                      <div className="suggestion-info">
                        <div className="suggestion-name">{college.name}</div>
                        <div className="suggestion-location">{college.district}, {college.state}</div>
                      </div>
                      <span className="history-badge">Recent</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
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
        
        {/* Chat List / Content */}
        <div className="sidebar-content">
          {/* Content will be rendered in middle panel */}
        </div>
        
        {/* Bottom Menu - COMMUNITY and SETTING */}
        <div className="sidebar-bottom-menu">
          <button
            className={`sidebar-bottom-item ${activeSection === 'community' ? 'active' : ''}`}
            onClick={() => handleSectionChange('community')}
            title="Community"
          >
            <span className="bottom-item-label">COMMUNITY</span>
          </button>
          <button
            className={`sidebar-bottom-item ${activeSection === 'settings' ? 'active' : ''}`}
            onClick={() => { 
              saveNavigationState() // Save current state before navigating
              setActiveSection('settings')
              setView('settings')
              if (isMobileView) setShowChatList(false)
            }}
            title="Settings"
          >
            <span className="bottom-item-label">SETTING</span>
          </button>
        </div>
      </div>

      {/* Middle Panel - Dynamic List */}
      <div className={`middle-panel ${!showChatList && isMobileView ? 'hidden' : ''}`}>
        {renderMiddlePanel()}
      </div>

      {/* Right Panel - Main Content */}
      <div className={`right-panel ${(showChatList && isMobileView && view === 'list') || (isMobileView && activeSection === 'search' && !selectedChat) ? 'hidden' : ''}`}>
        {renderRightPanel()}
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobileView && (
        <div className="mobile-bottom-nav">
          <button
            className={`mobile-nav-item ${activeSection === 'chats' && view === 'list' ? 'active' : ''}`}
            onClick={() => { 
              handleSectionChange('chats')
            }}
            title="Home"
          >
            <span className="mobile-nav-icon">🏠</span>
            <span className="mobile-nav-label">Home</span>
          </button>
          <button
            className={`mobile-nav-item ${isSearchActive ? 'active' : ''}`}
            onClick={() => {
              saveNavigationState() // Save current state before navigating
              setIsSearchActive(true)
              setShowChatList(true)
              setView('list')
              setActiveSection('search')
              setCollegeSearchQuery('')
              setSearchBarAtTop(false)
              setSelectedCollegeInSearch(null)
            }}
            title="Search"
          >
            <span className="mobile-nav-icon">🔍</span>
            <span className="mobile-nav-label">Search</span>
          </button>
          <button
            className={`mobile-nav-item ${activeSection === 'community' ? 'active' : ''}`}
            onClick={() => handleSectionChange('community')}
            title="Explore"
          >
            <span className="mobile-nav-icon">🌐</span>
            <span className="mobile-nav-label">Explore</span>
          </button>
          <button
            className={`mobile-nav-item ${view === 'student-profile' ? 'active' : ''}`}
            onClick={handleProfileClick}
            title="Profile"
          >
            <span className="mobile-nav-icon">👤</span>
            <span className="mobile-nav-label">Profile</span>
          </button>
          <button
            className={`mobile-nav-item ${activeSection === 'settings' ? 'active' : ''}`}
            onClick={() => { setActiveSection('settings'); setView('settings'); setShowChatList(false) }}
            title="Settings"
          >
            <span className="mobile-nav-icon">⚙️</span>
            <span className="mobile-nav-label">Settings</span>
          </button>
        </div>
      )}
    </div>
  )
}

// College Profile View Component
const CollegeProfileView = ({ college, user, onJoinChat, onJoinCampus, onLeaveCampus, onBack, showBackButton = true }) => {
  const [showMembers, setShowMembers] = useState(false)
  const [members, setMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [collegeData, setCollegeData] = useState(college) // Local state for college data
  const [isJoining, setIsJoining] = useState(false)

  // Check if user is a member of this college (for UI display only - Join College vs Unfollow button)
  // Note: Chat access is always available regardless of membership status
  const isMember = user?.profile?.college && (
    user.profile.college.aisheCode === college.aisheCode || 
    user.profile.college.name === college.name
  )

  // Helper function to get user avatar
  const getUserAvatar = () => {
    if (user?.profile?.profilePicture) {
      if (user.profile.profilePicture.startsWith('/uploads/')) {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
        return `${backendUrl}${user.profile.profilePicture}`
      }
      return user.profile.profilePicture
    }
    const name = user?.profile?.displayName || user?.email || 'User'
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=50&background=00a8ff&color=fff`
  }

  // Helper function to get user display name
  const getUserDisplayName = () => {
    return user?.profile?.displayName || user?.email?.split('@')[0] || 'User'
  }

  // Handle join campus with member addition
  const handleJoinCampus = async (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (isJoining || isMember) return // Prevent multiple clicks
    
    setIsJoining(true)
    const result = await onJoinCampus(college)
    if (result?.success) {
      // Add current user to members list
      const userMember = {
        id: user?.id || user?._id || `user-${Date.now()}`,
        name: getUserDisplayName(),
        avatar: getUserAvatar()
      }
      
      // Update members list (only if not already present)
      setMembers(prev => {
        const exists = prev.find(m => 
          m.id === userMember.id || 
          (m.name === userMember.name && m.avatar === userMember.avatar)
        )
        if (!exists) {
          const newMembers = [userMember, ...prev]
          // Update totalMembers to match actual members count
          setCollegeData(prevData => ({
            ...prevData,
            totalMembers: newMembers.length
          }))
          return newMembers
        }
        return prev
      })
    }
    setIsJoining(false)
  }

  // Handle leave campus with member removal
  const handleLeaveCampus = async (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (isJoining || !isMember) return // Prevent multiple clicks
    
    setIsJoining(true)
    if (onLeaveCampus) {
      const result = await onLeaveCampus(college)
      if (result?.success) {
        // Remove current user from members list
        const userId = user?.id || user?._id
        const userName = getUserDisplayName()
        
        setMembers(prev => {
          const newMembers = prev.filter(m => 
            m.id !== userId && m.name !== userName
          )
          // Update totalMembers to match actual members count
          setCollegeData(prevData => ({
            ...prevData,
            totalMembers: newMembers.length
          }))
          return newMembers
        })
      }
    }
    setIsJoining(false)
  }

  // Fetch members when toggle is clicked
  const handleToggleMembers = async () => {
    if (!showMembers && !members.length) {
      setLoadingMembers(true)
      try {
        // Try to fetch members from API
        const collegeId = encodeURIComponent(collegeData.aisheCode || collegeData.name)
        const response = await fetch(`/api/colleges/${collegeId}/members`, {
          credentials: 'include'
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.members) {
            // Add current user to members if they're a member and not already in the list
            let membersList = data.members
            if (isMember && user) {
              const userMember = {
                id: user?.id || user?._id || `user-${Date.now()}`,
                name: getUserDisplayName(),
                avatar: getUserAvatar()
              }
              const userExists = membersList.some(m => 
                m.id === userMember.id || 
                (m.name === userMember.name && m.avatar === userMember.avatar)
              )
              if (!userExists) {
                membersList = [userMember, ...membersList]
              }
            }
            setMembers(membersList)
            // Update totalMembers to match actual members count
            setCollegeData(prev => ({
              ...prev,
              totalMembers: membersList.length
            }))
          } else {
            // No members returned from API, only show current user if they're a member
            let membersList = []
            if (isMember && user) {
              membersList.push({
                id: user?.id || user?._id || `user-${Date.now()}`,
                name: getUserDisplayName(),
                avatar: getUserAvatar()
              })
            }
            setMembers(membersList)
            // Update totalMembers to match actual members count
            setCollegeData(prev => ({
              ...prev,
              totalMembers: membersList.length
            }))
          }
        } else {
          // API doesn't exist yet, only show current user if they're a member
          let membersList = []
          if (isMember && user) {
            membersList.push({
              id: user?.id || user?._id || `user-${Date.now()}`,
              name: getUserDisplayName(),
              avatar: getUserAvatar()
            })
          }
          setMembers(membersList)
          // Update totalMembers to match actual members count
          setCollegeData(prev => ({
            ...prev,
            totalMembers: membersList.length
          }))
        }
      } catch (error) {
        console.error('Error fetching members:', error)
        // Fallback on error - only show current user if they're a member
        let membersList = []
        if (isMember && user) {
          membersList.push({
            id: user?.id || user?._id || `user-${Date.now()}`,
            name: getUserDisplayName(),
            avatar: getUserAvatar()
          })
        }
        setMembers(membersList)
        // Update totalMembers to match actual members count
        setCollegeData(prev => ({
          ...prev,
          totalMembers: membersList.length
        }))
      } finally {
        setLoadingMembers(false)
      }
    }
    setShowMembers(!showMembers)
  }

  // Update college data when prop changes
  useEffect(() => {
    setCollegeData(college)
  }, [college])

  // Initialize members list with current user if they're a member and list is empty
  useEffect(() => {
    if (isMember && user && members.length === 0 && !showMembers) {
      const userMember = {
        id: user?.id || user?._id || `user-${Date.now()}`,
        name: getUserDisplayName(),
        avatar: getUserAvatar()
      }
      setMembers([userMember])
      // Update totalMembers count to match actual members count
      setCollegeData(prev => ({
        ...prev,
        totalMembers: 1
      }))
    }
  }, [isMember, user, college])

  // Generate about text
  const aboutText = `${collegeData.name} is a prestigious educational institution located in ${collegeData.district}, ${collegeData.state}. We are committed to providing quality education and fostering a vibrant community of students and educators. Join us to connect with fellow students, share knowledge, and be part of an enriching academic experience.`

  return (
    <div className="college-profile-view">
      <div className="college-profile-content-new">
        {/* Logo in the middle */}
        <div className="college-logo-center">
          <img src={college.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(college.name)}&size=150&background=00a8ff&color=fff`} alt={college.name} />
          <div className="verified-badge-center" title="Verified College">
            <img src="/blutick.jpg" alt="Verified" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
          </div>
        </div>

        {/* Full name and location */}
        <div className="college-name-section">
          <h1 className="college-name-full">{collegeData.name}</h1>
          <p className="college-location-full">{collegeData.district}, {collegeData.state}</p>
        </div>

        {/* Action Buttons */}
        <div className="college-action-buttons">
          <button 
            type="button"
            className={isMember ? "btn-join-campus btn-remove-campus" : "btn-join-campus"} 
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (isMember) {
                handleLeaveCampus(e)
              } else {
                handleJoinCampus(e)
              }
            }}
            disabled={isJoining}
          >
            {isMember ? 'Unfollow' : 'Join College'}
          </button>
          <button 
            type="button"
            className="btn-join-chat" 
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onJoinChat()
            }}
          >
            Join Chat
          </button>
        </div>

        {/* About Section */}
        <div className="college-about-section">
          <h3 className="section-title">About</h3>
          <p className="about-text">{aboutText}</p>
        </div>

        {/* Total Members Toggle */}
        <div className="college-members-section">
          <button 
            className="members-toggle"
            onClick={handleToggleMembers}
          >
            <span className="toggle-label">Total Members</span>
            <span className="toggle-count">{collegeData.totalMembers || 0}</span>
            <span className="toggle-arrow">{showMembers ? '▼' : '▶'}</span>
          </button>

          {/* Members List (shown when toggle is active) */}
          {showMembers && (
            <div className="members-list-container">
              {loadingMembers ? (
                <div className="members-loading">Loading members...</div>
              ) : members.length > 0 ? (
                <div className="members-list-whatsapp">
                  {members.map((member, index) => (
                    <div key={member.id || index} className="member-item-whatsapp">
                      <div className="member-avatar-whatsapp">
                        <img 
                          src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || 'User')}&size=50&background=00a8ff&color=fff`} 
                          alt={member.name || 'Member'} 
                        />
                      </div>
                      <div className="member-name-whatsapp">{member.name || 'Member'}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="members-empty">No members found</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Live Chat View Component
const LiveChatView = ({ chat, college, onBack, onViewProfile, user, verificationStatus, onMessageSent }) => {
  const [messageInput, setMessageInput] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const messagesEndRef = useRef(null)
  const longPressTimer = useRef(null)
  const socket = getSocket()

  // Update mobile detection on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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

  // Set up Socket.IO connection and listeners for real-time messages
  useEffect(() => {
    if (!collegeId || chat.type !== 'college') return

    // Ensure socket is connected and join room
    const setupSocket = async () => {
      let socketInstance = getSocket()
      if (!socketInstance || !socketInstance.connected) {
        try {
          socketInstance = connectSocket()
          if (socketInstance) {
            // Wait for connection
            socketInstance.once('connect', () => {
              // Join the college room
              joinCollegeRoom(collegeId)
              console.log(`✅ Joined college room: ${collegeId}`)
            })
          }
        } catch (error) {
          console.error('Failed to connect socket:', error)
        }
      } else {
        // Already connected, join the room
        joinCollegeRoom(collegeId)
        console.log(`✅ Joined college room: ${collegeId}`)
      }
    }

    setupSocket()

    const handleReceiveMessage = (message) => {
      // Only add message if it's for this college
      if (message.collegeId === collegeId) {
        // Check if this message matches an optimistic message (replace it)
        setMessages(prev => {
          // Check for duplicate messages first
          const existingIndex = prev.findIndex(m => m.id === message.id)
          if (existingIndex !== -1) {
            return prev // Message already exists, don't add duplicate
          }

          const optimisticIndex = prev.findIndex(m => 
            m.isOptimistic && 
            m.text === message.text && 
            String(m.senderId) === String(message.senderId) &&
            Math.abs(new Date(m.timestamp) - new Date(message.timestamp)) < 5000 // Within 5 seconds
          )
          
          if (optimisticIndex !== -1) {
            // Replace optimistic message with real one
            const newMessages = [...prev]
            newMessages[optimisticIndex] = {
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
            return newMessages
          } else {
            // New message from someone else, add it
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
            // Insert message in correct chronological order
            const newMessages = [...prev, formattedMessage].sort((a, b) => 
              new Date(a.timestamp) - new Date(b.timestamp)
            )
            return newMessages
          }
        })
      }
    }

    // Set up message listener
    onReceiveMessage(handleReceiveMessage)

    return () => {
      // Cleanup: remove listener when component unmounts or collegeId changes
      const socketInstance = getSocket()
      if (socketInstance) {
        socketInstance.off('receiveMessage', handleReceiveMessage)
      }
    }
  }, [collegeId, chat.type, user?.id])

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    const messageText = messageInput.trim()
    if (!messageText || !collegeId) return

    // Create optimistic message
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      text: messageText,
      sender: user?.profile?.displayName || user?.email?.split('@')[0] || 'You',
      senderId: user?.id || user?._id || '',
      time: new Date().toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }),
      date: formatDate(new Date()),
      isOwn: true,
      timestamp: new Date(),
      isOptimistic: true
    }

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage])
    setMessageInput('')

    // Try to connect socket if not connected
    let socketInstance = getSocket()
    if (!socketInstance || !socketInstance.connected) {
      try {
        socketInstance = connectSocket()
        if (socketInstance) {
          // Wait for connection to be established
          await new Promise((resolve, reject) => {
            if (socketInstance.connected) {
              resolve()
            } else {
              const timeout = setTimeout(() => {
                reject(new Error('Socket connection timeout'))
              }, 5000)
              
              socketInstance.once('connect', () => {
                clearTimeout(timeout)
                resolve()
              })
              
              socketInstance.once('connect_error', (error) => {
                clearTimeout(timeout)
                reject(error)
              })
            }
          })
          
          // Join room after connection
          joinCollegeRoom(collegeId)
          await new Promise(resolve => setTimeout(resolve, 300)) // Wait a bit for join
        } else {
          throw new Error('Failed to create socket instance')
        }
      } catch (error) {
        console.error('Failed to connect socket:', error)
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id))
        return
      }
    }

    // Send message via socket
    try {
      socketInstance = getSocket()
      if (socketInstance && socketInstance.connected) {
        sendMessage(messageText, collegeId)
        console.log('✅ Message sent via socket')
        
        // Update chat list immediately (optimistic update)
        if (onMessageSent && collegeId) {
          onMessageSent(collegeId, messageText, new Date(), true)
        }
      } else {
        console.error('Socket not connected, cannot send message')
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id))
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id))
    }
  }

  let lastDate = null

  // Determine if it's a direct message or college chat
  const isDirectMessage = chat.type === 'direct'
  const fullCollegeName = college?.name || chat.name || 'College Chat'
  // Truncate college name to show only first few words
  const truncateName = (name, maxWords = 3) => {
    const words = name.split(' ')
    if (words.length <= maxWords) return name
    return words.slice(0, maxWords).join(' ') + '...'
  }
  const displayName = isDirectMessage ? chat.name : truncateName(fullCollegeName, 3)
  const displayAvatar = chat.avatar || (college?.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullCollegeName)}&size=50&background=00a8ff&color=fff`)
  const displayStatus = isDirectMessage 
    ? (chat.isOnline ? 'Online' : 'Offline')
    : `${chat.onlineCount || 0} online`
  // Check if college is verified
  const isCollegeVerified = college?.isVerified || false

  // Handle long press on message (mobile and desktop)
  const handleMessageTouchStart = (e, message) => {
    longPressTimer.current = setTimeout(() => {
      setSelectedMessage(message)
      setShowActionMenu(true)
      // Add haptic feedback if available (mobile)
      if (navigator.vibrate && isMobile) {
        navigator.vibrate(50)
      }
    }, 1000) // 1 second
  }

  const handleMessageTouchEnd = (e) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handleMessageTouchMove = (e) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // Handle copy message
  const handleCopyMessage = () => {
    if (selectedMessage) {
      navigator.clipboard.writeText(selectedMessage.text).then(() => {
        setShowActionMenu(false)
        setSelectedMessage(null)
        // Show brief feedback
        if (navigator.vibrate) {
          navigator.vibrate([50, 30, 50])
        }
      }).catch(err => {
        console.error('Failed to copy:', err)
      })
    }
  }

  // Handle delete message
  const handleDeleteMessage = () => {
    if (selectedMessage) {
      setMessages(prev => prev.filter(m => m.id !== selectedMessage.id))
      setShowActionMenu(false)
      setSelectedMessage(null)
      // TODO: Send delete request to backend
    }
  }

  // Handle clear all chat
  const handleClearAllChat = () => {
    if (window.confirm('Are you sure you want to clear all messages?')) {
      setMessages([])
      setShowActionMenu(false)
      setSelectedMessage(null)
      // TODO: Send clear all request to backend
    }
  }

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showActionMenu && !e.target.closest('.chat-header-actions-menu') && !e.target.closest('.message-content')) {
        setShowActionMenu(false)
        setSelectedMessage(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showActionMenu])

  return (
    <div className="live-chat-view">
      <div className={`chat-header-bar ${showActionMenu ? 'action-menu-active' : ''}`}>
        {showActionMenu ? (
          <div className="chat-header-actions-menu">
            <button 
              className="action-menu-btn" 
              onClick={handleCopyMessage}
              title="Copy"
            >
              <span className="action-icon">📋</span>
              <span className="action-label">Copy</span>
            </button>
            <button 
              className="action-menu-btn" 
              onClick={handleDeleteMessage}
              title="Delete"
            >
              <span className="action-icon">🗑️</span>
              <span className="action-label">Delete</span>
            </button>
            <button 
              className="action-menu-btn" 
              onClick={handleClearAllChat}
              title="Clear All"
            >
              <span className="action-icon">🗑️</span>
              <span className="action-label">Clear All</span>
            </button>
            <button 
              className="action-menu-btn action-menu-close" 
              onClick={() => {
                setShowActionMenu(false)
                setSelectedMessage(null)
              }}
              title="Close"
            >
              <span className="action-icon">✕</span>
            </button>
          </div>
        ) : (
          <>
            {/* WhatsApp-like back button */}
            <button 
              className="chat-header-back-btn"
              onClick={onBack}
              title="Back"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div 
              className="chat-header-avatar" 
              onClick={!isDirectMessage && college ? () => onViewProfile && onViewProfile() : undefined}
              style={!isDirectMessage && college ? { cursor: 'pointer' } : {}}
            >
              <img src={displayAvatar} alt={displayName} />
            </div>
            <div 
              className="chat-header-info"
              onClick={!isDirectMessage && college ? () => onViewProfile && onViewProfile() : undefined}
              style={!isDirectMessage && college ? { cursor: 'pointer', flex: 1 } : { flex: 1 }}
            >
              <div className="chat-header-name-row">
                <h3>{displayName}</h3>
                {!isDirectMessage && (
                  <div className="verified-badge-blue-inline" title="Verified College">
                    <img src="/blutick.jpg" alt="Verified" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                  </div>
                )}
                {!isDirectMessage && verificationStatus?.status === 'verified' && (
                  <div className="verified-badge-blue-inline" title="Verified Student">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="12" fill="#1DA1F2"/>
                      <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
              <span className="chat-status">{displayStatus}</span>
            </div>
          </>
        )}
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
                <Fragment key={message.id}>
                  {showDate && (
                    <div className="date-separator" key={`date-${message.id}`}>
                      <span>{message.date}</span>
                    </div>
                  )}
                  <div className={`message ${message.isOwn ? 'own-message' : 'other-message'} ${selectedMessage?.id === message.id ? 'selected-message' : ''}`}>
                    {!message.isOwn && (
                      <div className="message-sender">{message.sender}</div>
                    )}
                    <div 
                      className="message-content"
                      onTouchStart={(e) => handleMessageTouchStart(e, message)}
                      onTouchEnd={handleMessageTouchEnd}
                      onTouchMove={handleMessageTouchMove}
                      onMouseDown={(e) => {
                        if (!isMobile) {
                          handleMessageTouchStart(e, message)
                        }
                      }}
                      onMouseUp={handleMessageTouchEnd}
                      onMouseLeave={handleMessageTouchEnd}
                      onContextMenu={(e) => {
                        if (isMobile) {
                          e.preventDefault()
                          handleMessageTouchStart(e, message)
                        }
                      }}
                    >
                      <p>{message.text}</p>
                      <span className="message-time">{message.time}</span>
                    </div>
                  </div>
                </Fragment>
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
          placeholder="Type a message"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
        />
        <button type="submit" className="send-btn">Send</button>
      </form>
    </div>
  )
}

// Student Profile View Component
const StudentProfileView = ({ user, verificationStatus, onBack, onVerificationUpdate, onProfileUpdate, onLeaveCollege }) => {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [pictureError, setPictureError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    displayName: '',
    firstName: '',
    lastName: '',
    bio: '',
    year: '',
    course: ''
  })
  const fileInputRef = useRef(null)
  const profilePictureInputRef = useRef(null)

  // Initialize edit form when component mounts or user changes
  useEffect(() => {
    try {
      if (user?.profile) {
        setEditForm({
          displayName: user.profile.displayName || '',
          firstName: user.profile.firstName || '',
          lastName: user.profile.lastName || '',
          bio: user.profile.bio || '',
          year: user.profile.year || '',
          course: user.profile.course || ''
        })
      } else if (user) {
        // User exists but no profile yet, initialize with empty values
        setEditForm({
          displayName: user.email?.split('@')[0] || '',
          firstName: '',
          lastName: '',
          bio: '',
          year: '',
          course: ''
        })
      }
    } catch (error) {
      console.error('Error initializing edit form:', error)
    }
  }, [user])

  const getUserAvatar = () => {
    try {
      if (user?.profile?.profilePicture) {
        // If it's a relative path, prepend the backend URL
        if (user.profile.profilePicture.startsWith('/uploads/')) {
          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
          return `${backendUrl}${user.profile.profilePicture}`
        }
        return user.profile.profilePicture
      }
      const name = user?.profile?.displayName || user?.email || 'User'
      const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=100&background=00a8ff&color=fff`
    } catch (error) {
      console.error('Error in getUserAvatar:', error)
      return `https://ui-avatars.com/api/?name=User&size=100&background=00a8ff&color=fff`
    }
  }

  const handleProfilePictureSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setPictureError('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setPictureError('File size must be less than 5MB')
      return
    }

    try {
      setUploadingPicture(true)
      setPictureError(null)

      const response = await uploadProfilePicture(file)
      
      if (response.success) {
        if (onProfileUpdate) {
          await onProfileUpdate()
        }
        if (profilePictureInputRef.current) {
          profilePictureInputRef.current.value = ''
        }
      } else {
        setPictureError(response.message || 'Failed to upload profile picture')
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error)
      setPictureError('Failed to upload profile picture. Please try again.')
    } finally {
      setUploadingPicture(false)
    }
  }

  const handleEditProfile = async () => {
    if (!editForm.displayName || !editForm.displayName.trim()) {
      setUploadError('Display name is required')
      return
    }

    try {
      setUploading(true)
      setUploadError(null)

      const response = await updateProfile({
        displayName: editForm.displayName.trim(),
        firstName: editForm.firstName.trim() || undefined,
        lastName: editForm.lastName.trim() || undefined,
        bio: editForm.bio.trim() || undefined,
        year: editForm.year || undefined,
        course: editForm.course.trim() || undefined,
      })
      
      if (response.success) {
        setIsEditing(false)
        if (onProfileUpdate) {
          await onProfileUpdate()
        }
      } else {
        setUploadError(response.message || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setUploadError('Failed to update profile. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveCollege = async () => {
    if (!user?.profile?.college) return
    
    if (window.confirm('Are you sure you want to remove your college identity? This will remove you from the college chat.')) {
      try {
        setUploading(true)
        await onLeaveCollege(user.profile.college)
        if (onProfileUpdate) {
          await onProfileUpdate()
        }
      } catch (error) {
        console.error('Error removing college:', error)
        setUploadError('Failed to remove college identity')
      } finally {
        setUploading(false)
      }
    }
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

  // Safety check: if user is not loaded yet, show loading state
  if (!user) {
    console.warn('⚠️ StudentProfileView: user is not loaded')
    return (
      <div className="student-profile-view">
        <div className="view-header">
          <button className="back-btn" onClick={onBack}>←</button>
          <h2>My Profile</h2>
        </div>
        <div className="student-profile-content" style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  // Safe variable assignments with defaults
  const isVerified = verificationStatus?.status === 'verified' || false
  const isPending = verificationStatus?.status === 'pending' || false
  const isNotSubmitted = !verificationStatus || verificationStatus.status === 'not_submitted' || false
  const collegeName = user?.profile?.college?.name || ''

  return (
    <div className="student-profile-view">
      <div className="view-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <h2>My Profile</h2>
      </div>
      <div className="student-profile-content">
        {/* Profile Photo Section */}
        <div className="profile-photo-section">
          <div className="profile-photo-large">
            <img src={getUserAvatar()} alt="Profile" />
            {isVerified && (
              <div className="verified-badge-blue" title="Verified Student">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="12" fill="#1DA1F2"/>
                  <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
            <div className="profile-photo-overlay">
              <input
                ref={profilePictureInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePictureSelect}
                style={{ display: 'none' }}
                id="profile-picture-upload"
              />
              <button 
                className="photo-upload-btn"
                onClick={() => profilePictureInputRef.current?.click()}
                disabled={uploadingPicture}
                title="Change Profile Photo"
              >
                {uploadingPicture ? '⏳' : '📷'}
              </button>
            </div>
          </div>
          {pictureError && (
            <p className="upload-error-small">{pictureError}</p>
          )}
        </div>

        {/* Profile Name and Info */}
        <div className="profile-header-info">
          <div className="profile-name-row">
            <h1 className="profile-name">
              {user?.profile?.displayName || user?.email?.split('@')[0] || 'User'}
            </h1>
            {isVerified && (
              <div className="verified-badge-blue-inline" title="Verified Student">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="12" fill="#1DA1F2"/>
                  <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </div>
          <p className="profile-email">{user?.email}</p>
          {user?.profile?.college?.name && (
            <div className="profile-college-row">
              <p className="profile-college">📚 {user.profile.college.name}</p>
              <button 
                className="remove-college-btn"
                onClick={handleRemoveCollege}
                title="Remove College Identity"
                disabled={uploading}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Bio Section */}
        <div className="profile-bio-section">
          {isEditing ? (
            <div className="bio-edit-form">
              <textarea
                className="bio-input"
                placeholder="Tell us about yourself..."
                value={editForm.bio}
                onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                maxLength={500}
                rows={4}
              />
              <div className="bio-char-count">{editForm.bio.length}/500</div>
            </div>
          ) : (
            <div className="profile-bio">
              {isVerified && collegeName ? (
                <p className="verified-bio-text">
                  ✓ Verified student of <strong>{collegeName}</strong>
                </p>
              ) : user?.profile?.bio ? (
                <p>{user.profile.bio}</p>
              ) : (
                <p className="bio-placeholder">No bio yet. Click Edit to add one.</p>
              )}
            </div>
          )}
        </div>

        {/* Profile Details */}
        {isEditing ? (
          <div className="profile-edit-form">
            <div className="form-group">
              <label>Display Name <span className="required">*</span></label>
              <input
                type="text"
                className="form-input"
                value={editForm.displayName}
                onChange={(e) => setEditForm({...editForm, displayName: e.target.value})}
                placeholder="Your display name"
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({...editForm, firstName: e.target.value})}
                  placeholder="First name"
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({...editForm, lastName: e.target.value})}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Year</label>
                <select
                  className="form-input"
                  value={editForm.year}
                  onChange={(e) => setEditForm({...editForm, year: e.target.value})}
                >
                  <option value="">Select Year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Graduate">Graduate</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Course</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.course}
                  onChange={(e) => setEditForm({...editForm, course: e.target.value})}
                  placeholder="e.g., Computer Science"
                />
              </div>
            </div>
            {uploadError && (
              <p className="upload-error">{uploadError}</p>
            )}
            <div className="form-actions">
              <button 
                className="btn-secondary"
                onClick={() => {
                  setIsEditing(false)
                  setUploadError(null)
                  if (user?.profile) {
                    setEditForm({
                      displayName: user.profile.displayName || '',
                      firstName: user.profile.firstName || '',
                      lastName: user.profile.lastName || '',
                      bio: user.profile.bio || '',
                      year: user.profile.year || '',
                      course: user.profile.course || ''
                    })
                  }
                }}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleEditProfile}
                disabled={uploading || !editForm.displayName.trim()}
              >
                {uploading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="profile-details">
            {(user?.profile?.firstName || user?.profile?.lastName) && (
              <div className="detail-item">
                <span className="detail-label">Name:</span>
                <span className="detail-value">
                  {[user.profile.firstName, user.profile.lastName].filter(Boolean).join(' ') || 'Not set'}
                </span>
              </div>
            )}
            {user?.profile?.year && (
              <div className="detail-item">
                <span className="detail-label">Year:</span>
                <span className="detail-value">{user.profile.year}</span>
              </div>
            )}
            {user?.profile?.course && (
              <div className="detail-item">
                <span className="detail-label">Course:</span>
                <span className="detail-value">{user.profile.course}</span>
              </div>
            )}
          </div>
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
        
        {/* Actions */}
        <div className="profile-actions">
          {!isEditing && (
            <button 
              className="btn-primary"
              onClick={() => setIsEditing(true)}
            >
              ✏️ Edit Profile
            </button>
          )}
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
                className="btn-secondary" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : '📄 Upload College ID'}
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
              <p>⏳ Your college ID is under review. You'll be notified once verification is complete.</p>
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
