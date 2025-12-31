import { useState, useEffect, useRef, useCallback, Fragment } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { verifyAuth, logout } from '../services/authService'
import { connectSocket, disconnectSocket, getSocket, onJoinedRoom, onReceiveMessage, onSocketError, sendMessage, removeAllListeners, joinCollegeRoom, emitTyping, emitTypingDirect, onUserTyping, onUserTypingDirect, onUserOnline, onUserOffline, onMessageRead, sendDirectMessageSocket, markDirectMessageDelivered, markDirectMessageRead, onNewDirectMessage, onDirectMessageSent, onMessageUpdate } from '../services/socketService'
import { fetchMessages, fetchUserCollegesWithMessages, clearCollegeMessages, deleteMessage, deleteMessageForAll, deleteAllCollegeMessages } from '../services/messageService'
import { getCollegeChatInfo } from '../services/chatService'
import { uploadCollegeId, getVerificationStatus, uploadProfilePicture, updateProfile, joinCollege, leaveCollege, followCollege, unfollowCollege, checkFollowStatus, getCollegeFollowersCount, getCollegeFollowers, getUserProfile, getUserColleges, blockUser, unblockUser, checkBlockStatus, getCollegeActiveStudentsCount } from '../services/profileService'
import { sendDirectMessage, getDirectMessages, clearDirectMessages, getDirectMessageConversations, deleteDirectMessage, deleteDirectMessageForAll, deleteAllDirectMessages } from '../services/directMessageService'
import EmojiPicker from 'emoji-picker-react'
import './Chat.css'


const Chat = () => {
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [activeSection, setActiveSection] = useState('chats') // chats, community, settings
  const [selectedChat, setSelectedChat] = useState(null)
  const [selectedCollege, setSelectedCollege] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null) // For viewing other students' profiles
  const [view, setView] = useState('list') // list, college-profile, live-chat, student-profile, settings, direct-chat
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
  const [chatSelectionMode, setChatSelectionMode] = useState(false) // Selection mode for chats
  const [selectedChatIds, setSelectedChatIds] = useState(new Set()) // Set of selected chat IDs
  const [selectedChatsFollowStatus, setSelectedChatsFollowStatus] = useState({ allFollowing: false, allNotFollowing: false, mixed: false }) // Follow status for selected chats
  const [selectedChatsBlockStatus, setSelectedChatsBlockStatus] = useState({ allBlocked: false, allUnblocked: false, mixed: false }) // Block status for selected chats
  const [unreadCounts, setUnreadCounts] = useState({}) // Track unread counts per chat
  const [isLoading, setIsLoading] = useState(true) // Loading state
  const navigationHistory = useRef([]) // Track navigation history for back button
  const [middlePanelWidth, setMiddlePanelWidth] = useState(() => {
    // Load from localStorage or use default
    const saved = localStorage.getItem('middlePanelWidth')
    return saved ? parseInt(saved, 10) : 400
  })
  const [isResizing, setIsResizing] = useState(false)
  const resizeStartX = useRef(0)
  const resizeStartWidth = useRef(400)

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
              // Wait for connection to be established
              socketInstance.once('connect', () => {
                // Set up Socket.IO listeners
                onJoinedRoom(() => {});
                // Error handler will be set up in the college chat useEffect
              })
              
              // Set up listeners even if not connected yet (minimal, specific handlers will be set in useEffects)
              onJoinedRoom(() => {});
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
    // Hide suggestions when a college is selected
    setShowCollegeSuggestions(false)
    
    // If in search view, show profile in search panel (don't save state for this)
    if (activeSection === 'search') {
      setCollegeSearchQuery(college.name)
      setSelectedCollegeInSearch(college)
      setSearchBarAtTop(true)
      
      // Save to recent searches
      const recent = [college, ...recentCollegeSearches.filter(c => c.aisheCode !== college.aisheCode)].slice(0, 5)
      setRecentCollegeSearches(recent)
      localStorage.setItem('recentCollegeSearches', JSON.stringify(recent))
    } else {
      // Otherwise, open college profile in main chat section (save state)
      // Clear search query to hide suggestions in desktop view
      setCollegeSearchQuery('')
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
        // Chat exists, open college profile first (user can then join chat from profile)
        setSelectedCollege(collegeData)
        setSelectedChat(existingChat)
        setView('college-profile')
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
      
      // Open the college profile first (user can then join chat from profile)
      setSelectedCollege(collegeData)
      setSelectedChat(newChat)
      setView('college-profile')
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

  // Load all colleges with messages and direct message conversations
  const loadAllCollegesWithMessages = useCallback(async () => {
    try {
      // Fetch both college chats and direct message conversations in parallel
      const [collegesResponse, directMessagesResponse] = await Promise.all([
        fetchUserCollegesWithMessages().catch(err => {
          console.error('Error loading colleges:', err)
          return { success: false, colleges: [] }
        }),
        getDirectMessageConversations().catch(err => {
          console.error('Error loading direct messages:', err)
          return { success: false, conversations: [] }
        })
      ])

      const allChats = []

      // Add college chats
      if (collegesResponse.success && collegesResponse.colleges) {
        const collegeChats = collegesResponse.colleges.map(college => {
          const collegeId = college.aisheCode || college.name
          const collegeName = college.name || 'College Chat'
          const collegeLogo = college.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(collegeName)}&size=50&background=00a8ff&color=fff`
          
          return {
            id: `college-${collegeId}`,
            type: 'college',
            collegeId: collegeId,
            name: collegeName,
            lastMessage: college.lastMessage?.text || 'No messages yet',
            lastMessageIsOwn: college.lastMessage?.lastMessageIsOwn === true,
            lastMessageDeliveredTo: college.lastMessage?.lastMessageDeliveredTo || [],
            lastMessageReadBy: college.lastMessage?.lastMessageReadBy || [],
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
        allChats.push(...collegeChats)
      }

      // Add direct message conversations
      if (directMessagesResponse.success && directMessagesResponse.conversations) {
        const directChats = directMessagesResponse.conversations.map(conversation => {
          const userId = conversation.userId
          const userName = conversation.name || 'User'
          const userAvatar = conversation.profilePicture 
            ? (conversation.profilePicture.startsWith('/uploads/') 
                ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${conversation.profilePicture}`
                : conversation.profilePicture)
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&size=50&background=00a8ff&color=fff`
          
          return {
            id: `direct-${userId}`,
            type: 'direct',
            userId: userId,
            name: userName,
            lastMessage: conversation.lastMessage || 'No messages yet',
            lastMessageIsOwn: conversation.lastMessageIsOwn || false,
            lastMessageDeliveredTo: conversation.lastMessageDeliveredTo || [],
            lastMessageReadBy: conversation.lastMessageReadBy || [],
            timestamp: conversation.lastMessageTime ? formatChatTimestamp(conversation.lastMessageTime) : '',
            unreadCount: 0, // TODO: Implement unread count for direct messages
            onlineCount: 0,
            avatar: userAvatar,
            lastMessageTime: conversation.lastMessageTime || null
          }
        })
        allChats.push(...directChats)
      }

      // Merge with existing chats, updating existing ones and adding new ones
      setChats(prev => {
        const existingMap = new Map(prev.map(c => [c.id, c]))
        
        // Update existing chats or add new ones
        allChats.forEach(newChat => {
          const existing = existingMap.get(newChat.id)
          if (existing) {
            // Update existing chat with latest message info, but preserve unread count
            // Always use new chat's status fields if they exist (backend is source of truth)
            existingMap.set(newChat.id, {
              ...existing,
              lastMessage: newChat.lastMessage,
              lastMessageIsOwn: newChat.lastMessageIsOwn !== undefined ? newChat.lastMessageIsOwn : existing.lastMessageIsOwn,
              lastMessageDeliveredTo: newChat.lastMessageDeliveredTo !== undefined ? newChat.lastMessageDeliveredTo : (existing.lastMessageDeliveredTo || []),
              lastMessageReadBy: newChat.lastMessageReadBy !== undefined ? newChat.lastMessageReadBy : (existing.lastMessageReadBy || []),
              timestamp: newChat.timestamp,
              lastMessageTime: newChat.lastMessageTime,
              avatar: newChat.avatar,
              ...(newChat.college && { college: newChat.college }),
              ...(newChat.userId && { userId: newChat.userId })
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
    } catch (error) {
      console.error('Error loading chats:', error)
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
    
    // Clear search query when switching to chats section
    if (section === 'chats') {
      setSearchQuery('')
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
  // Toggle chat selection in selection mode
  const handleToggleChatSelection = (chatId) => {
    setSelectedChatIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(chatId)) {
        newSet.delete(chatId)
      } else {
        newSet.add(chatId)
      }
      // Exit selection mode if no chats selected
      if (newSet.size === 0) {
        setChatSelectionMode(false)
      }
      return newSet
    })
  }
  
  // Exit chat selection mode
  const handleExitChatSelectionMode = () => {
    setChatSelectionMode(false)
    setSelectedChatIds(new Set())
  }
  
  // Enter chat selection mode
  const handleEnterChatSelectionMode = () => {
    setChatSelectionMode(true)
  }

  // Update follow status for selected chats
  const updateFollowStatusForSelected = useCallback(async (selectedIds) => {
    const selectedChats = chats.filter(chat => selectedIds.has(chat.id) && chat.type === 'college')
    if (selectedChats.length === 0) {
      setSelectedChatsFollowStatus({ allFollowing: false, allNotFollowing: false, mixed: false })
      return
    }
    
    try {
      const followStatuses = await Promise.all(
        selectedChats.map(async (chat) => {
          const college = chat.college || { aisheCode: chat.collegeId, name: chat.name }
          const status = await checkFollowStatus(college)
          return status.success ? status.isFollowing : false
        })
      )
      
      const allFollowing = followStatuses.every(status => status === true)
      const allNotFollowing = followStatuses.every(status => status === false)
      const mixed = !allFollowing && !allNotFollowing
      
      setSelectedChatsFollowStatus({ allFollowing, allNotFollowing, mixed })
    } catch (error) {
      console.error('Error checking follow status:', error)
    }
  }, [chats])

  // Update block status for selected chats
  const updateBlockStatusForSelected = useCallback(async (selectedIds) => {
    const selectedChats = chats.filter(chat => selectedIds.has(chat.id) && chat.type === 'direct')
    if (selectedChats.length === 0) {
      setSelectedChatsBlockStatus({ allBlocked: false, allUnblocked: false, mixed: false })
      return
    }
    
    try {
      const blockStatuses = await Promise.all(
        selectedChats.map(async (chat) => {
          const userId = chat.userId
          if (!userId) return false
          const status = await checkBlockStatus(userId)
          return status.success ? (status.blockedByMe || false) : false
        })
      )
      
      const allBlocked = blockStatuses.every(status => status === true)
      const allUnblocked = blockStatuses.every(status => status === false)
      const mixed = !allBlocked && !allUnblocked
      
      setSelectedChatsBlockStatus({ allBlocked, allUnblocked, mixed })
    } catch (error) {
      console.error('Error checking block status:', error)
    }
  }, [chats])

  // Update follow and block status when selection mode is entered or chats change
  useEffect(() => {
    if (chatSelectionMode && selectedChatIds.size > 0) {
      updateFollowStatusForSelected(selectedChatIds)
      updateBlockStatusForSelected(selectedChatIds)
    } else {
      setSelectedChatsFollowStatus({ allFollowing: false, allNotFollowing: false, mixed: false })
      setSelectedChatsBlockStatus({ allBlocked: false, allUnblocked: false, mixed: false })
    }
  }, [chatSelectionMode, selectedChatIds, updateFollowStatusForSelected, updateBlockStatusForSelected])

  // Handle follow/unfollow selected college chats
  const handleFollowUnfollowSelected = async () => {
    const selectedChats = chats.filter(chat => selectedChatIds.has(chat.id) && chat.type === 'college')
    if (selectedChats.length === 0) return

    try {
      for (const chat of selectedChats) {
        const college = chat.college || { aisheCode: chat.collegeId, name: chat.name }
        const followStatus = await checkFollowStatus(college)
        
        if (followStatus.success) {
          if (followStatus.isFollowing) {
            // Unfollow
            await unfollowCollege(college)
          } else {
            // Follow
            await followCollege(college)
          }
        }
      }
      
      // Reload chats to reflect changes
      loadAllCollegesWithMessages()
      handleExitChatSelectionMode()
    } catch (error) {
      console.error('Error following/unfollowing colleges:', error)
      alert('Error updating follow status. Please try again.')
    }
  }


  // Handle delete selected chats (both college and direct)
  const handleDeleteSelectedChats = async () => {
    const selectedChats = chats.filter(chat => selectedChatIds.has(chat.id))
    if (selectedChats.length === 0) return

    const collegeChats = selectedChats.filter(chat => chat.type === 'college')
    const directChats = selectedChats.filter(chat => chat.type === 'direct')

    let confirmMessage = ''
    if (collegeChats.length > 0 && directChats.length > 0) {
      confirmMessage = `Are you sure you want to delete all messages in ${selectedChats.length} selected chats? This will remove them from your list.`
    } else if (collegeChats.length > 0) {
      confirmMessage = collegeChats.length === 1
        ? `Are you sure you want to delete all messages in "${collegeChats[0].name}"? This will remove the chat from your list.`
        : `Are you sure you want to delete all messages in ${collegeChats.length} selected college chats? This will remove them from your list.`
    } else if (directChats.length > 0) {
      confirmMessage = directChats.length === 1
        ? `Are you sure you want to delete all messages with "${directChats[0].name}"? This will remove the chat from your list.`
        : `Are you sure you want to delete all messages in ${directChats.length} selected chats? This will remove them from your list.`
    }

    if (!window.confirm(confirmMessage)) return

    try {
      // Delete college chats
      for (const chat of collegeChats) {
        const collegeId = chat.collegeId || chat.college?.aisheCode || chat.college?.name
        if (collegeId) {
          console.log('Deleting college messages for:', collegeId)
          const response = await deleteAllCollegeMessages(collegeId)
          console.log('Delete college response:', response)
          if (!response.success) {
            throw new Error(response.message || 'Failed to delete college messages')
          }
        } else {
          console.warn('No collegeId found for chat:', chat)
        }
      }
      
      // Delete direct chats
      for (const chat of directChats) {
        const userId = chat.userId
        if (userId) {
          console.log('Deleting direct messages with user:', userId)
          const response = await deleteAllDirectMessages(userId)
          console.log('Delete direct response:', response)
          if (!response.success) {
            throw new Error(response.message || 'Failed to delete direct messages')
          }
        } else {
          console.warn('No userId found for chat:', chat)
        }
      }
      
      // Reload chats to ensure list is updated
      await loadAllCollegesWithMessages()
      
      // Remove selected chats from the chat list
      setChats(prev => prev.filter(chat => !selectedChatIds.has(chat.id)))
      
      // If currently viewing one of the deleted chats, go back to list
      if (selectedChat && selectedChatIds.has(selectedChat.id)) {
        setView('list')
        setSelectedChat(null)
        setSelectedCollege(null)
        setSelectedStudent(null)
      }
      
      handleExitChatSelectionMode()
    } catch (error) {
      console.error('Error deleting chats:', error)
      alert(`Error deleting chats: ${error.message || 'Please try again.'}`)
    }
  }

  // Handle block/unblock selected student chats
  const handleBlockUnblockSelected = async () => {
    const selectedChats = chats.filter(chat => selectedChatIds.has(chat.id) && chat.type === 'direct')
    if (selectedChats.length === 0) return

    try {
      for (const chat of selectedChats) {
        const userId = chat.userId
        if (userId) {
          // Check current block status
          const blockStatus = await checkBlockStatus(userId)
          if (blockStatus.success) {
            if (blockStatus.blockedByMe) {
              // Unblock
              await unblockUser(userId)
            } else {
              // Block
              await blockUser(userId)
            }
          }
        }
      }
      
      // Reload chats to reflect changes
      loadAllCollegesWithMessages()
      handleExitChatSelectionMode()
    } catch (error) {
      console.error('Error blocking/unblocking users:', error)
      alert('Error updating block status. Please try again.')
    }
  }

  const handleChatSelect = (chat) => {
    // If in selection mode, toggle selection instead of opening chat
    if (chatSelectionMode) {
      handleToggleChatSelection(chat.id)
      return
    }
    
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
      // For direct messages, open direct chat view
      if (chat.userId) {
        setSelectedStudent({ id: chat.userId })
        setView('direct-chat')
      } else {
        console.error('Direct chat selected but userId is missing:', chat)
      }
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

  // Handle viewing another student's profile
  const handleViewStudentProfile = async (userId) => {
    try {
      // Ensure userId is a string and handle ObjectId format
      let userIdString = ''
      if (userId) {
        // If it's an ObjectId object, convert to string
        if (typeof userId === 'object' && userId.toString) {
          userIdString = userId.toString()
        } else {
          userIdString = String(userId).trim()
        }
      }
      
      if (!userIdString || userIdString === 'undefined' || userIdString === 'null') {
        console.error('No valid userId provided:', userId)
        alert('Invalid user ID. Please try again.')
        return
      }
      
      console.log('Opening student profile for userId:', userIdString, 'Type:', typeof userId)
      
      try {
        const response = await getUserProfile(userIdString)
        console.log('getUserProfile response:', response)
        
        if (response && response.success && response.user) {
          saveNavigationState() // Save current state before navigating
          setSelectedStudent(response.user)
          setView('student-profile')
          if (isMobileView) {
            setShowChatList(false)
          }
          console.log('✅ Successfully navigated to student profile')
        } else {
          const errorMsg = response?.message || 'Failed to load student profile'
          console.error('❌ Failed to fetch user profile:', response)
          alert(`${errorMsg}. Please try again.`)
        }
      } catch (apiError) {
        console.error('❌ API Error details:', {
          message: apiError.message,
          response: apiError.response,
          status: apiError.response?.status,
          statusText: apiError.response?.statusText,
          data: apiError.response?.data
        })
        
        // Try to extract a meaningful error message
        let errorMsg = 'Unknown error occurred'
        if (apiError.response?.data?.message) {
          errorMsg = apiError.response.data.message
        } else if (apiError.message) {
          errorMsg = apiError.message
        }
        
        alert(`Error loading student profile: ${errorMsg}. Please check the console for details.`)
      }
    } catch (error) {
      console.error('❌ Unexpected error in handleViewStudentProfile:', error)
      const errorMsg = error?.message || 'Unknown error'
      alert(`Error loading student profile: ${errorMsg}. Please try again.`)
    }
  }

  // Handle join live chat
  const handleJoinLiveChat = (college) => {
    saveNavigationState() // Save current state before navigating
    const collegeId = college.aisheCode || college.name || college.id
    const collegeName = college.name || 'College Chat'
    const collegeLogo = college.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(collegeName)}&size=50&background=00a8ff&color=fff`
    
    // Find chat in the actual chats state
    const chat = chats.find(c => 
      c.type === 'college' && 
      (c.collegeId === collegeId || c.name === college.name)
    )
    
    if (chat) {
      // Chat exists, open it directly
      setSelectedChat(chat)
      setSelectedCollege(college)
      setView('live-chat')
      if (isMobileView) {
        setShowChatList(false)
      }
    } else {
      // If chat doesn't exist, create it and open live-chat view directly
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
        college: college,
        lastMessageTime: null
      }
      
      // Add chat to list
      setChats(prev => {
        const existing = prev.find(c => c.id === newChat.id)
        if (existing) return prev
        return [newChat, ...prev]
      })
      
      // Load message history in background
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
      
      // Open live-chat view directly
      setSelectedChat(newChat)
      setSelectedCollege(college)
      setView('live-chat')
      if (isMobileView) {
        setShowChatList(false)
      }
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

  // Handle profile click - open own profile
  const handleProfileClick = () => {
    saveNavigationState() // Save current state before navigating
    setSelectedStudent(null) // Clear any selected student to show own profile
    setView('student-profile')
    if (isMobileView) {
      setShowChatList(false)
    }
  }

  // Resize handlers for middle panel
  const handleResizeMove = useCallback((e) => {
    const currentX = e.clientX || e.touches?.[0]?.clientX
    const diff = currentX - resizeStartX.current
    const newWidth = Math.max(300, Math.min(800, resizeStartWidth.current + diff)) // Min 300px, Max 800px
    setMiddlePanelWidth(newWidth)
    localStorage.setItem('middlePanelWidth', newWidth.toString())
  }, [])

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false)
    document.removeEventListener('mousemove', handleResizeMove)
    document.removeEventListener('mouseup', handleResizeEnd)
    document.removeEventListener('touchmove', handleResizeMove)
    document.removeEventListener('touchend', handleResizeEnd)
  }, [handleResizeMove])

  const handleResizeStart = useCallback((e) => {
    if (isMobileView) return // Don't allow resizing on mobile
    setIsResizing(true)
    resizeStartX.current = e.clientX || e.touches?.[0]?.clientX
    resizeStartWidth.current = middlePanelWidth
    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)
    document.addEventListener('touchmove', handleResizeMove)
    document.addEventListener('touchend', handleResizeEnd)
    e.preventDefault()
  }, [isMobileView, middlePanelWidth, handleResizeMove, handleResizeEnd])

  // Cleanup resize listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
      document.removeEventListener('touchmove', handleResizeMove)
      document.removeEventListener('touchend', handleResizeEnd)
    }
  }, [handleResizeMove, handleResizeEnd])

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

  // Update chat list when direct message is sent or received
  const updateChatListOnDirectMessage = useCallback((userId, userName, userAvatar, messageText, messageTimestamp, isOwnMessage = false, deliveredTo = [], readBy = []) => {
    setChats(prev => {
      const chatId = `direct-${userId}`
      const chatIndex = prev.findIndex(c => c.id === chatId)
      
      // Format message preview with status
      const messagePreview = isOwnMessage 
        ? truncateMessage(messageText)
        : truncateMessage(messageText)
      
      if (chatIndex === -1) {
        // Chat doesn't exist, create new one
        const newChat = {
          id: chatId,
          type: 'direct',
          userId: userId,
          name: userName,
          avatar: userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&size=50&background=00a8ff&color=fff`,
          lastMessage: messagePreview,
          lastMessageIsOwn: isOwnMessage,
          lastMessageDeliveredTo: deliveredTo || [],
          lastMessageReadBy: readBy || [],
          timestamp: formatChatTimestamp(messageTimestamp),
          lastMessageTime: messageTimestamp,
          unreadCount: 0
        }
        
        // Add to top of list
        return [newChat, ...prev].sort((a, b) => {
          const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0
          const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0
          return timeB - timeA
        })
      }
      
      // Update existing chat
      const updatedChats = [...prev]
      const chat = { ...updatedChats[chatIndex] }
      
      // Update last message and timestamp
      // If messageText is "No messages yet" or messageTimestamp is null, it means chat was cleared
      if (messageText !== 'No messages yet' && messageTimestamp) {
        chat.lastMessage = messagePreview
        chat.lastMessageIsOwn = isOwnMessage
        chat.lastMessageDeliveredTo = deliveredTo || []
        chat.lastMessageReadBy = readBy || []
      chat.timestamp = formatChatTimestamp(messageTimestamp)
      chat.lastMessageTime = messageTimestamp
      } else {
        // When clearing chat, update the message text and set timestamp to now
        chat.lastMessage = 'No messages yet'
        chat.lastMessageIsOwn = false
        chat.lastMessageDeliveredTo = []
        chat.lastMessageReadBy = []
        // Update timestamp to current time so it appears at the top when cleared
        const clearTime = messageTimestamp || new Date()
        chat.timestamp = formatChatTimestamp(clearTime)
        chat.lastMessageTime = clearTime
      }
      
      // Only increment unread count if message is not from current user and chat is not open
      if (!isOwnMessage && selectedChat?.id !== chatId) {
        chat.unreadCount = (chat.unreadCount || 0) + 1
      } else {
        chat.unreadCount = 0
      }
      
      // Move chat to top (most recent first)
      updatedChats.splice(chatIndex, 1)
      updatedChats.unshift(chat)
      
      // Sort by last message time
      return updatedChats.sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0
        return timeB - timeA
      })
    })
  }, [selectedChat])

  // Update chat list when message is sent or received
  const updateChatListOnMessage = useCallback((collegeId, messageText, messageTimestamp, isOwnMessage = false, deliveredTo = [], readBy = []) => {
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
          chat.lastMessageIsOwn = isOwnMessage
          chat.lastMessageDeliveredTo = deliveredTo || []
          chat.lastMessageReadBy = readBy || []
          chat.timestamp = formatChatTimestamp(messageTimestamp)
          chat.lastMessageTime = messageTimestamp
          chat.unreadCount = isOwnMessage || selectedChat?.collegeId === collegeId ? 0 : (chat.unreadCount || 0)
          
          // Move to top
          updatedChats.splice(prev.findIndex(c => c.id === existingChat.id), 1)
          updatedChats.unshift(chat)
          return updatedChats
        }
        
        // If chat doesn't exist and message is sent, create new chat entry
        // This happens when user sends first message without following
        if (isOwnMessage && selectedCollege) {
          const collegeName = selectedCollege.name || 'College Chat'
          const collegeLogo = selectedCollege.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(collegeName)}&size=50&background=00a8ff&color=fff`
          
          const newChat = {
            id: `college-${collegeId}`,
            type: 'college',
            collegeId: collegeId,
            name: collegeName,
            avatar: collegeLogo,
            lastMessage: truncateMessage(messageText),
            lastMessageIsOwn: isOwnMessage,
            lastMessageDeliveredTo: deliveredTo || [],
            lastMessageReadBy: readBy || [],
            timestamp: formatChatTimestamp(messageTimestamp),
            lastMessageTime: messageTimestamp,
            unreadCount: 0,
            college: selectedCollege
          }
          
          // Add to top of list
          return [newChat, ...prev]
        }
        
        // If still not found, return unchanged
        return prev
      }
      
      // Update existing chat
      const updatedChats = [...prev]
      const chat = { ...updatedChats[chatIndex] }
      
      // Update last message and timestamp
      // If messageText is "No messages yet" or messageTimestamp is null, it means chat was cleared
      if (messageText !== 'No messages yet' && messageTimestamp) {
      chat.lastMessage = truncateMessage(messageText)
        chat.lastMessageIsOwn = isOwnMessage
        chat.lastMessageDeliveredTo = deliveredTo || []
        chat.lastMessageReadBy = readBy || []
      chat.timestamp = formatChatTimestamp(messageTimestamp)
      chat.lastMessageTime = messageTimestamp
      } else {
        // When clearing chat, update the message text and set timestamp to now
        chat.lastMessage = 'No messages yet'
        chat.lastMessageIsOwn = false
        chat.lastMessageDeliveredTo = []
        chat.lastMessageReadBy = []
        // Update timestamp to current time so it appears at the top when cleared
        const clearTime = messageTimestamp || new Date()
        chat.timestamp = formatChatTimestamp(clearTime)
        chat.lastMessageTime = clearTime
      }
      
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
      
      // Sort by last message time to ensure correct order
      return updatedChats.sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0
        return timeB - timeA // Most recent first
      })
    })
  }, [selectedChat])

  // Handle new message - update chat list
  const handleNewMessage = useCallback((message) => {
    const collegeId = message.collegeId
    const isOwnMessage = String(message.senderId) === String(user?.id || user?._id || '')
    
    // Update chat list with delivery and read status
    updateChatListOnMessage(
      collegeId, 
      message.text, 
      message.timestamp, 
      isOwnMessage,
      message.deliveredTo || [],
      message.readBy || []
    )
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
                      onViewStudentProfile={handleViewStudentProfile}
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
                      onFollowCollege={async (college) => {
                        try {
                          // Clear navigation state immediately to prevent auto-opening chat
                          window.history.replaceState({}, document.title)
                          
                          // Follow the college
                          const response = await followCollege(college)
                          if (response.success) {
                            // Get updated followers count
                            const followersResponse = await getCollegeFollowersCount(college)
                            const followersCount = followersResponse.count || 0
                            
                            // Update selected college in search with followers count
                            const updatedCollege = {
                              ...college,
                              totalMembers: followersCount
                            }
                            setActiveSection('search')
                            setSelectedCollegeInSearch(updatedCollege)
                            
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
                            
                            // Reload all chats
                            loadAllCollegesWithMessages()
                          }
                          return response
                        } catch (error) {
                          console.error('Error following college:', error)
                          return { success: false, message: error.message }
                        }
                      }}
                      onUnfollowCollege={async (college) => {
                          try {
                            // Clear navigation state immediately to prevent auto-opening chat
                            window.history.replaceState({}, document.title)
                            
                            const response = await unfollowCollege(college)
                            if (response.success) {
                              // Get updated followers count
                              const followersResponse = await getCollegeFollowersCount(college)
                              const followersCount = followersResponse.count || 0
                              
                              // Update selected college in search with followers count
                              const updatedCollege = {
                                ...college,
                                totalMembers: followersCount
                              }
                              setActiveSection('search')
                              setSelectedCollegeInSearch(updatedCollege)
                              
                              // Don't remove college from chats list - keep it so user can still access the chat
                              // College will remain in chats if they've sent messages
                              
                              // Reload all chats
                              loadAllCollegesWithMessages()
                            }
                            return response
                          } catch (error) {
                            console.error('Error unfollowing college:', error)
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
            {!chatSelectionMode ? (
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
            ) : (
              (() => {
                const selectedChats = chats.filter(chat => selectedChatIds.has(chat.id))
                const selectedCollegeChats = selectedChats.filter(chat => chat.type === 'college')
                const selectedDirectChats = selectedChats.filter(chat => chat.type === 'direct')
                const hasCollegeChats = selectedCollegeChats.length > 0
                const hasDirectChats = selectedDirectChats.length > 0
                const isHybrid = hasCollegeChats && hasDirectChats
                const isOnlyCollege = hasCollegeChats && !hasDirectChats
                const isOnlyDirect = hasDirectChats && !hasCollegeChats
                
                return (
              <div className="chat-selection-mode-header">
                <span>{selectedChatIds.size} selected</span>
                    <div className="chat-selection-actions">
                      {/* Show buttons based on selection type */}
                      {isOnlyCollege && (
                        <>
                          <button 
                            className="chat-selection-action-btn"
                            onClick={handleFollowUnfollowSelected}
                            title="Follow/Unfollow"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                              <circle cx="8.5" cy="7" r="4"></circle>
                              <line x1="20" y1="8" x2="20" y2="14"></line>
                              <line x1="23" y1="11" x2="17" y2="11"></line>
                            </svg>
                            <span>
                              {selectedChatsFollowStatus.allFollowing 
                                ? 'Unfollow' 
                                : selectedChatsFollowStatus.allNotFollowing 
                                  ? 'Follow' 
                                  : 'Follow/Unfollow'}
                            </span>
                          </button>
                          <button 
                            className="chat-selection-action-btn chat-selection-delete-btn"
                            onClick={handleDeleteSelectedChats}
                            title="Delete"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            <span>Delete</span>
                          </button>
                        </>
                      )}
                      {isOnlyDirect && (
                        <>
                          <button 
                            className="chat-selection-action-btn chat-selection-delete-btn"
                            onClick={handleDeleteSelectedChats}
                            title="Delete"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            <span>Delete</span>
                          </button>
                          <button 
                            className="chat-selection-action-btn"
                            onClick={handleBlockUnblockSelected}
                            title="Block/Unblock"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 6L6 18M6 6l12 12"></path>
                            </svg>
                            <span>
                              {selectedChatsBlockStatus.allBlocked 
                                ? 'Unblock' 
                                : selectedChatsBlockStatus.allUnblocked 
                                  ? 'Block' 
                                  : 'Block/Unblock'}
                            </span>
                          </button>
                        </>
                      )}
                      {isHybrid && (
                        <button 
                          className="chat-selection-action-btn chat-selection-delete-btn"
                          onClick={handleDeleteSelectedChats}
                          title="Delete"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                <button 
                  className="chat-selection-cancel-btn"
                  onClick={handleExitChatSelectionMode}
                  title="Cancel"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
                )
              })()
            )}
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
                  className={`panel-item ${selectedChat?.id === chat.id ? 'active' : ''} ${chatSelectionMode && selectedChatIds.has(chat.id) ? 'chat-selected' : ''} ${chatSelectionMode ? 'chat-selection-mode' : ''}`}
                  onClick={() => handleChatSelect(chat)}
                  onContextMenu={(e) => {
                    if (!chatSelectionMode) {
                      e.preventDefault()
                      handleEnterChatSelectionMode()
                      handleToggleChatSelection(chat.id)
                    }
                  }}
                  onTouchStart={(e) => {
                    if (!chatSelectionMode) {
                      const touch = e.touches[0]
                      const startTime = Date.now()
                      const startX = touch.clientX
                      const startY = touch.clientY
                      
                      const handleTouchEnd = (endEvent) => {
                        const endTime = Date.now()
                        const endTouch = endEvent.changedTouches[0]
                        const endX = endTouch.clientX
                        const endY = endTouch.clientY
                        
                        const timeDiff = endTime - startTime
                        const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2))
                        
                        // Long press: > 500ms and minimal movement
                        if (timeDiff > 500 && distance < 10) {
                          if (!chatSelectionMode) {
                            handleEnterChatSelectionMode()
                            handleToggleChatSelection(chat.id)
                          }
                        }
                        
                        document.removeEventListener('touchend', handleTouchEnd)
                      }
                      
                      document.addEventListener('touchend', handleTouchEnd, { once: true })
                    }
                  }}
                >
                  {chatSelectionMode && (
                    <div className="chat-selection-checkbox">
                      <input 
                        type="checkbox" 
                        checked={selectedChatIds.has(chat.id)}
                        onChange={() => handleToggleChatSelection(chat.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
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
                      <span className="panel-item-message">
                        {chat.lastMessageIsOwn && (() => {
                          const readBy = chat.lastMessageReadBy || []
                          const deliveredTo = chat.lastMessageDeliveredTo || []
                          const currentUserId = String(user?.id || user?._id || '')
                          
                          // For college messages, always show single tick (matching chat view)
                          if (chat.type === 'college') {
                            return (
                              <>
                                <span style={{ color: '#8696A0', marginRight: '4px' }}>✓</span>
                                <span>You: </span>
                              </>
                            )
                          }
                          
                          // For direct messages, check if other user read/delivered
                          const otherUserId = chat.userId
                          const isRead = readBy.some(r => String(r.userId) === String(otherUserId))
                          const isDelivered = deliveredTo.some(d => String(d.userId) === String(otherUserId))
                          
                          let statusIcon = ''
                          if (isRead) {
                            // Blue double checkmark (read)
                            statusIcon = '✓✓'
                          } else if (isDelivered) {
                            // Gray double checkmark (delivered)
                            statusIcon = '✓✓'
                          } else {
                            // Gray single checkmark (sent)
                            statusIcon = '✓'
                          }
                          
                          return (
                            <>
                              <span style={{ color: isRead ? '#4FC3F7' : '#8696A0', marginRight: '4px' }}>{statusIcon}</span>
                              <span>You: </span>
                            </>
                          )
                        })()}
                        {truncateMessage(chat.lastMessage) || 'No messages yet'}
                      </span>
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
    // If settings is active, still show chats in middle panel (settings shows in right panel)
    if (view === 'settings' && activeSection !== 'chats') {
      // Force show chats when settings is open
      return (
        <>
          <div className="panel-header panel-header-with-search">
            <h2>all chats</h2>
            {!chatSelectionMode ? (
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
            ) : (
              (() => {
                const selectedChats = chats.filter(chat => selectedChatIds.has(chat.id))
                const selectedCollegeChats = selectedChats.filter(chat => chat.type === 'college')
                const selectedDirectChats = selectedChats.filter(chat => chat.type === 'direct')
                const hasCollegeChats = selectedCollegeChats.length > 0
                const hasDirectChats = selectedDirectChats.length > 0
                const isHybrid = hasCollegeChats && hasDirectChats
                const isOnlyCollege = hasCollegeChats && !hasDirectChats
                const isOnlyDirect = hasDirectChats && !hasCollegeChats
                
                return (
              <div className="chat-selection-mode-header">
                <span>{selectedChatIds.size} selected</span>
                    <div className="chat-selection-actions">
                      {/* Show buttons based on selection type */}
                      {isOnlyCollege && (
                        <>
                          <button 
                            className="chat-selection-action-btn"
                            onClick={handleFollowUnfollowSelected}
                            title="Follow/Unfollow"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                              <circle cx="8.5" cy="7" r="4"></circle>
                              <line x1="20" y1="8" x2="20" y2="14"></line>
                              <line x1="23" y1="11" x2="17" y2="11"></line>
                            </svg>
                            <span>
                              {selectedChatsFollowStatus.allFollowing 
                                ? 'Unfollow' 
                                : selectedChatsFollowStatus.allNotFollowing 
                                  ? 'Follow' 
                                  : 'Follow/Unfollow'}
                            </span>
                          </button>
                          <button 
                            className="chat-selection-action-btn chat-selection-delete-btn"
                            onClick={handleDeleteSelectedChats}
                            title="Delete"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            <span>Delete</span>
                          </button>
                        </>
                      )}
                      {isOnlyDirect && (
                        <>
                          <button 
                            className="chat-selection-action-btn chat-selection-delete-btn"
                            onClick={handleDeleteSelectedChats}
                            title="Delete"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            <span>Delete</span>
                          </button>
                          <button 
                            className="chat-selection-action-btn"
                            onClick={handleBlockUnblockSelected}
                            title="Block/Unblock"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 6L6 18M6 6l12 12"></path>
                            </svg>
                            <span>
                              {selectedChatsBlockStatus.allBlocked 
                                ? 'Unblock' 
                                : selectedChatsBlockStatus.allUnblocked 
                                  ? 'Block' 
                                  : 'Block/Unblock'}
                            </span>
                          </button>
                        </>
                      )}
                      {isHybrid && (
                        <button 
                          className="chat-selection-action-btn chat-selection-delete-btn"
                          onClick={handleDeleteSelectedChats}
                          title="Delete"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                <button 
                  className="chat-selection-cancel-btn"
                  onClick={handleExitChatSelectionMode}
                  title="Cancel"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
                )
              })()
            )}
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
                  className={`panel-item ${selectedChat?.id === chat.id ? 'active' : ''} ${chatSelectionMode && selectedChatIds.has(chat.id) ? 'chat-selected' : ''} ${chatSelectionMode ? 'chat-selection-mode' : ''}`}
                  onClick={() => handleChatSelect(chat)}
                  onContextMenu={(e) => {
                    if (!chatSelectionMode) {
                      e.preventDefault()
                      handleEnterChatSelectionMode()
                      handleToggleChatSelection(chat.id)
                    }
                  }}
                  onTouchStart={(e) => {
                    if (!chatSelectionMode) {
                      const touch = e.touches[0]
                      const startTime = Date.now()
                      const startX = touch.clientX
                      const startY = touch.clientY
                      
                      const handleTouchEnd = (endEvent) => {
                        const endTime = Date.now()
                        const endTouch = endEvent.changedTouches[0]
                        const endX = endTouch.clientX
                        const endY = endTouch.clientY
                        
                        const timeDiff = endTime - startTime
                        const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2))
                        
                        // Long press: > 500ms and minimal movement
                        if (timeDiff > 500 && distance < 10) {
                          if (!chatSelectionMode) {
                            handleEnterChatSelectionMode()
                            handleToggleChatSelection(chat.id)
                          }
                        }
                        
                        document.removeEventListener('touchend', handleTouchEnd)
                      }
                      
                      document.addEventListener('touchend', handleTouchEnd, { once: true })
                    }
                  }}
                >
                  {chatSelectionMode && (
                    <div className="chat-selection-checkbox">
                      <input 
                        type="checkbox" 
                        checked={selectedChatIds.has(chat.id)}
                        onChange={() => handleToggleChatSelection(chat.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
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
                      <span className="panel-item-message">
                        {chat.lastMessageIsOwn && (() => {
                          const readBy = chat.lastMessageReadBy || []
                          const deliveredTo = chat.lastMessageDeliveredTo || []
                          const currentUserId = String(user?.id || user?._id || '')
                          
                          // For college messages, always show single tick (matching chat view)
                          if (chat.type === 'college') {
                            return (
                              <>
                                <span style={{ color: '#8696A0', marginRight: '4px' }}>✓</span>
                                <span>You: </span>
                              </>
                            )
                          }
                          
                          // For direct messages, check if other user read/delivered
                          const otherUserId = chat.userId
                          const isRead = readBy.some(r => String(r.userId) === String(otherUserId))
                          const isDelivered = deliveredTo.some(d => String(d.userId) === String(otherUserId))
                          
                          let statusIcon = ''
                          if (isRead) {
                            // Blue double checkmark (read)
                            statusIcon = '✓✓'
                          } else if (isDelivered) {
                            // Gray double checkmark (delivered)
                            statusIcon = '✓✓'
                          } else {
                            // Gray single checkmark (sent)
                            statusIcon = '✓'
                          }
                          
                          return (
                            <>
                              <span style={{ color: isRead ? '#4FC3F7' : '#8696A0', marginRight: '4px' }}>{statusIcon}</span>
                              <span>You: </span>
                            </>
                          )
                        })()}
                        {truncateMessage(chat.lastMessage) || 'No messages yet'}
                      </span>
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
        onViewStudentProfile={handleViewStudentProfile}
        onJoinChat={() => handleJoinLiveChat(selectedCollege)} 
        onFollowCollege={async (college) => {
          try {
            // Clear navigation state immediately to prevent auto-opening chat
            window.history.replaceState({}, document.title)
            
            // Follow the college
            const response = await followCollege(college)
            if (response.success) {
              // Get updated followers count
              const followersResponse = await getCollegeFollowersCount(college)
              const followersCount = followersResponse.count || 0
              
              // Update selectedCollege with followers count
              const updatedCollege = {
                ...college,
                totalMembers: followersCount
              }
              setView('college-profile')
              setSelectedCollege(updatedCollege)
              
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
              
              // Reload all chats to ensure followed colleges appear
              loadAllCollegesWithMessages()
            }
            return response
          } catch (error) {
            console.error('Error following college:', error)
            return { success: false, message: error.message }
          }
        }}
        onUnfollowCollege={async (college) => {
          try {
            // Clear navigation state immediately to prevent auto-opening chat
            window.history.replaceState({}, document.title)
            
            const response = await unfollowCollege(college)
            if (response.success) {
              // Get updated followers count
              const followersResponse = await getCollegeFollowersCount(college)
              const followersCount = followersResponse.count || 0
              
              // Update selectedCollege with followers count
              const updatedCollege = {
                ...college,
                totalMembers: followersCount
              }
              setView('college-profile')
              setSelectedCollege(updatedCollege)
              
              // Don't remove college from chats list - keep it so user can still access the chat
              // College will remain in chats if they've sent messages
              
              // Reload all chats
              loadAllCollegesWithMessages()
            }
            return response
          } catch (error) {
            console.error('Error unfollowing college:', error)
            return { success: false, message: error.message }
          }
        }}
      />
    }
    if (view === 'live-chat' && selectedChat) {
      const college = selectedChat.type === 'college' 
        ? selectedChat.college
        : null
      
      // Ensure we have required data
      if (!selectedChat && !college) {
        console.error('LiveChatView: Missing chat or college data', { selectedChat, college })
        return (
          <div className="live-chat-view">
            <div className="chat-header-bar">
              <button className="chat-header-back-btn" onClick={() => { setView('list'); if (isMobileView) setShowChatList(true) }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <p>Error loading chat. Please go back and try again.</p>
            </div>
          </div>
        )
      }
      
      return <LiveChatView chat={selectedChat} college={college} user={user} verificationStatus={verificationStatus} onBack={() => { setView('list'); if (isMobileView) setShowChatList(true) }} onViewProfile={() => college && handleViewCollegeProfile(college)} onViewStudentProfile={handleViewStudentProfile} onMessageSent={updateChatListOnMessage} />
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
      
      // Determine if viewing own profile by comparing user IDs
      const viewingUser = selectedStudent || user
      let isViewingOwnProfile = true // Default to own profile
      
      if (selectedStudent && user) {
        // Compare IDs to determine if viewing own profile
        // Convert both to strings for comparison (user.id might be ObjectId, selectedStudent.id is string)
        const getUserId = (u) => {
          if (!u) return ''
          // Try id first (could be ObjectId or string)
          if (u.id) {
            return String(u.id.toString ? u.id.toString() : u.id).trim()
          }
          // Try _id
          if (u._id) {
            return String(u._id.toString ? u._id.toString() : u._id).trim()
          }
          // Try userId
          if (u.userId) {
            return String(u.userId.toString ? u.userId.toString() : u.userId).trim()
          }
          return ''
        }
        
        const selectedId = getUserId(selectedStudent)
        const currentId = getUserId(user)
        
        isViewingOwnProfile = selectedId !== '' && currentId !== '' && selectedId === currentId
        
        console.log('🔍 Profile comparison:', { 
          selectedId, 
          currentId, 
          isViewingOwnProfile,
          selectedStudentIdType: typeof selectedStudent.id,
          userIdType: typeof user.id
        })
      } else if (!selectedStudent) {
        // No selectedStudent means viewing own profile
        isViewingOwnProfile = true
        console.log('✅ No selectedStudent - viewing own profile')
      } else {
        // selectedStudent exists but no current user - treat as other's profile
        isViewingOwnProfile = false
        console.log('✅ selectedStudent exists but no current user - viewing other profile')
      }
      
      console.log('📋 Rendering StudentProfileView:', { 
        hasSelectedStudent: !!selectedStudent, 
        isViewingOwnProfile,
        viewingUserId: viewingUser?.id?.toString ? viewingUser.id.toString() : viewingUser?.id,
        currentUserId: user?.id?.toString ? user.id.toString() : user?.id
      })
      
      return <StudentProfileView 
        user={viewingUser} 
        verificationStatus={isViewingOwnProfile ? verificationStatus : null} 
        isOwnProfile={isViewingOwnProfile}
        currentUser={user}
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
        onMessage={(otherUserId) => {
          // Navigate to private chat
          setView('direct-chat')
          setSelectedStudent({ id: otherUserId })
        }}
        onViewDirectChat={(otherUserId) => {
          setView('direct-chat')
          setSelectedStudent({ id: otherUserId })
        }}
        onViewCollegeProfile={handleViewCollegeProfile}
      />
    }
    if (view === 'direct-chat' && selectedStudent?.id) {
      return <DirectChatView 
        otherUserId={selectedStudent.id} 
        user={user} 
        onBack={() => {
          setView('list')
          if (isMobileView) setShowChatList(true)
        }}
        onViewProfile={(userId) => handleViewStudentProfile(userId)}
        onMessageSent={updateChatListOnDirectMessage}
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
      <div className="loading-screen">
        <div className="loading-container">
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
          </div>
          <div className="loading-text">
            <h2 className="loading-title">connect campus</h2>
            <p className="loading-subtitle">Loading your chat experience...</p>
          </div>
          <div className="loading-dots">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`chat-container theme-${theme}`}>
      {/* Top Header with Logo and Search */}
      <div className="chat-top-header">
        <div className="header-left-section">
          <button 
            className="navbar-back-to-home-btn"
            onClick={() => navigate('/')}
            title="Back to Home"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="header-logo">
            <h1 className="app-title">connect campus</h1>
          </div>
        </div>
        {/* Search bar on the right side - same as landing page */}
        {!isMobileView && (
          <div className="header-search-wrapper">
            <button 
              className="header-search-back-btn"
              onClick={() => navigate('/')}
              title="Back to Home"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
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
        
        {/* Bottom Menu - Professional Icons */}
        <div className="sidebar-bottom-menu">
          <button
            className={`sidebar-bottom-item ${activeSection === 'community' ? 'active' : ''}`}
            onClick={() => handleSectionChange('community')}
            title="Community"
          >
            <svg className="sidebar-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            className={`sidebar-bottom-item ${activeSection === 'chats' ? 'active' : ''}`}
            onClick={() => {
              handleSectionChange('chats')
            }}
            title="Home / Chats"
          >
            <svg className="sidebar-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            className={`sidebar-bottom-item ${view === 'settings' ? 'active' : ''}`}
            onClick={() => { 
              saveNavigationState()
              setActiveSection('chats') // Ensure chats section is active
              setView('settings') // Settings shows in right panel
              if (isMobileView) setShowChatList(false)
            }}
            title="Settings"
          >
            <svg className="sidebar-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9857C9.5799 19.7134 9.31074 19.5014 9 19.37C8.69838 19.2338 8.36295 19.1931 8.03797 19.2527C7.71299 19.3123 7.41308 19.4692 7.18 19.71L7.12 19.77C6.93425 19.956 6.71368 20.1035 6.47088 20.2041C6.22808 20.3048 5.96783 20.3566 5.705 20.3566C5.44217 20.3566 5.18192 20.3048 4.93912 20.2041C4.69632 20.1035 4.47575 19.956 4.29 19.77C4.10405 19.5843 3.95653 19.3637 3.85588 19.1209C3.75523 18.8781 3.70343 18.6178 3.70343 18.355C3.70343 18.0922 3.75523 17.8319 3.85588 17.5891C3.95653 17.3463 4.10405 17.1257 4.29 16.94L4.35 16.88C4.58054 16.6495 4.73519 16.3502 4.794 16.0258C4.85282 15.7014 4.81252 15.3668 4.678 15.065C4.54924 14.7692 4.33876 14.517 4.07047 14.3393C3.80218 14.1616 3.48779 14.0663 3.165 14.065H3C2.46957 14.065 1.96086 13.8543 1.58579 13.4792C1.21071 13.1041 1 12.5954 1 12.065C1 11.5346 1.21071 11.0259 1.58579 10.6508C1.96086 10.2757 2.46957 10.065 3 10.065H3.09C3.42099 10.0573 3.74198 9.95012 4.01428 9.75751C4.28658 9.5649 4.49858 9.29574 4.63 8.985C4.76619 8.68338 4.80693 8.34795 4.74732 8.02297C4.68772 7.69799 4.53081 7.39808 4.29 7.165L4.23 7.105C4.04405 6.91925 3.89653 6.69868 3.79588 6.45588C3.69523 6.21308 3.64343 5.95283 3.64343 5.69C3.64343 5.42717 3.69523 5.16692 3.79588 4.92412C3.89653 4.68132 4.04405 4.46075 4.23 4.275C4.41575 4.08905 4.63632 3.94153 4.87912 3.84088C5.12192 3.74023 5.38217 3.68843 5.645 3.68843C5.90783 3.68843 6.16808 3.74023 6.41088 3.84088C6.65368 3.94153 6.87425 4.08905 7.06 4.275L7.12 4.335C7.35054 4.56554 7.64982 4.72019 7.97422 4.779C8.29862 4.83782 8.63319 4.79752 8.935 4.663H9C9.53043 4.663 10.0391 4.45229 10.4142 4.07722C10.7893 3.70214 11 3.19343 11 2.663C11 2.13257 10.7893 1.62386 10.4142 1.24878C10.0391 0.873715 9.53043 0.663 9 0.663H8.91C8.57901 0.655343 8.25802 0.54812 7.98572 0.355509C7.71342 0.162898 7.50142 -0.106258 7.37 -0.417C7.23381 -0.718619 7.19307 -1.05405 7.25268 -1.37903C7.31228 -1.70401 7.46919 -2.00392 7.71 -2.237L7.77 -2.297C7.95575 -2.48295 8.10327 -2.70352 8.20392 -2.94632C8.30457 -3.18912 8.35637 -3.44937 8.35637 -3.7122C8.35637 -3.97503 8.30457 -4.23528 8.20392 -4.47808C8.10327 -4.72088 7.95575 -4.94145 7.77 -5.1272C7.58425 -5.31315 7.36368 -5.46067 7.12088 -5.56132C6.87808 -5.66197 6.61783 -5.71377 6.355 -5.71377C6.09217 -5.71377 5.83192 -5.66197 5.58912 -5.56132C5.34632 -5.46067 5.12575 -5.31315 4.94 -5.1272L4.88 -5.0672C4.64946 -4.83666 4.35018 -4.68201 4.02578 -4.6232C3.70138 -4.56438 3.36681 -4.60468 3.065 -4.7382H3C2.46957 -4.7382 1.96086 -4.52749 1.58579 -4.15241C1.21071 -3.77734 1 -3.26863 1 -2.7382C1 -2.20777 1.21071 -1.69906 1.58579 -1.32398C1.96086 -0.948915 2.46957 -0.7382 3 -0.7382H3.09C3.42099 -0.745857 3.74198 -0.85308 4.01428 -1.04569C4.28658 -1.2383 4.49858 -1.50746 4.63 -1.8182C4.76619 -2.11982 4.80693 -2.45525 4.74732 -2.78023C4.68772 -3.10521 4.53081 -3.40512 4.29 -3.6382L4.23 -3.6982C4.04405 -3.88395 3.89653 -4.10452 3.79588 -4.34732C3.69523 -4.59012 3.64343 -4.85037 3.64343 -5.1132C3.64343 -5.37603 3.69523 -5.63628 3.79588 -5.87908C3.89653 -6.12188 4.04405 -6.34245 4.23 -6.5282C4.41575 -6.71415 4.63632 -6.86167 4.87912 -6.96232C5.12192 -7.06297 5.38217 -7.11477 5.645 -7.11477C5.90783 -7.11477 6.16808 -7.06297 6.41088 -6.96232C6.65368 -6.86167 6.87425 -6.71415 7.06 -6.5282L7.12 -6.4682C7.35054 -6.23766 7.64982 -6.08301 7.97422 -6.0242C8.29862 -5.96538 8.63319 -6.00568 8.935 -6.1392H9C9.53043 -6.1392 10.0391 -5.92849 10.4142 -5.55341C10.7893 -5.17834 11 -4.66963 11 -4.1392C11 -3.60877 10.7893 -3.10006 10.4142 -2.72498C10.0391 -2.34992 9.53043 -2.1392 9 -2.1392Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            className="sidebar-bottom-item"
            onClick={() => {
              toggleTheme()
            }}
            title="Toggle Theme"
          >
            <svg className="sidebar-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3C12 3 6 7.582 6 13C6 16.3137 8.68629 19 12 19C15.3137 19 18 16.3137 18 13C18 7.582 12 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 3V1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 23V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 12H1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M23 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            className="sidebar-bottom-item logout-btn-sidebar"
            onClick={handleLogout}
            title="Logout"
          >
            <svg className="sidebar-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Middle Panel - Dynamic List */}
      <div 
        className={`middle-panel ${!showChatList && isMobileView ? 'hidden' : ''} ${isResizing ? 'resizing' : ''}`}
        style={{ width: isMobileView ? '100%' : `${middlePanelWidth}px` }}
      >
        {renderMiddlePanel()}
      </div>

      {/* Resizable Divider - Only on desktop */}
      {!isMobileView && (
        <div 
          className={`panel-resizer ${isResizing ? 'resizing' : ''}`}
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
          style={{ 
            left: `${80 + middlePanelWidth}px`,
            cursor: isResizing ? 'col-resize' : 'col-resize' 
          }}
        />
      )}

      {/* Right Panel - Main Content */}
      <div 
        className={`right-panel ${(showChatList && isMobileView && view === 'list') || (isMobileView && activeSection === 'search' && !selectedChat) ? 'hidden' : ''} ${isResizing ? 'resizing' : ''}`}
        style={{ left: isMobileView ? '0' : `${80 + middlePanelWidth}px` }}
      >
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
            <svg className="mobile-nav-icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
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
            <svg className="mobile-nav-icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="mobile-nav-label">Search</span>
          </button>
          <button
            className={`mobile-nav-item ${activeSection === 'community' ? 'active' : ''}`}
            onClick={() => handleSectionChange('community')}
            title="Community"
          >
            <svg className="mobile-nav-icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="mobile-nav-label">Community</span>
          </button>
          <button
            className={`mobile-nav-item ${view === 'student-profile' ? 'active' : ''}`}
            onClick={handleProfileClick}
            title="Profile"
          >
            <svg className="mobile-nav-icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="mobile-nav-label">Profile</span>
          </button>
          <button
            className={`mobile-nav-item ${view === 'settings' || activeSection === 'settings' ? 'active' : ''}`}
            onClick={() => { 
              setActiveSection('chats') // Keep chats visible
              setView('settings')
              setShowChatList(false)
            }}
            title="Settings"
          >
            <svg className="mobile-nav-icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9857C9.5799 19.7134 9.31074 19.5014 9 19.37C8.69838 19.2338 8.36295 19.1931 8.03797 19.2527C7.71299 19.3123 7.41308 19.4692 7.18 19.71L7.12 19.77C6.93425 19.956 6.71368 20.1035 6.47088 20.2041C6.22808 20.3048 5.96783 20.3566 5.705 20.3566C5.44217 20.3566 5.18192 20.3048 4.93912 20.2041C4.69632 20.1035 4.47575 19.956 4.29 19.77C4.10405 19.5843 3.95653 19.3637 3.85588 19.1209C3.75523 18.8781 3.70343 18.6178 3.70343 18.355C3.70343 18.0922 3.75523 17.8319 3.85588 17.5891C3.95653 17.3463 4.10405 17.1257 4.29 16.94L4.35 16.88C4.58054 16.6495 4.73519 16.3502 4.794 16.0258C4.85282 15.7014 4.81252 15.3668 4.678 15.065C4.54924 14.7692 4.33876 14.517 4.07047 14.3393C3.80218 14.1616 3.48779 14.0663 3.165 14.065H3C2.46957 14.065 1.96086 13.8543 1.58579 13.4792C1.21071 13.1041 1 12.5954 1 12.065C1 11.5346 1.21071 11.0259 1.58579 10.6508C1.96086 10.2757 2.46957 10.065 3 10.065H3.09C3.42099 10.0573 3.74198 9.95012 4.01428 9.75751C4.28658 9.5649 4.49858 9.29574 4.63 8.985C4.76619 8.68338 4.80693 8.34795 4.74732 8.02297C4.68772 7.69799 4.53081 7.39808 4.29 7.165L4.23 7.105C4.04405 6.91925 3.89653 6.69868 3.79588 6.45588C3.69523 6.21308 3.64343 5.95283 3.64343 5.69C3.64343 5.42717 3.69523 5.16692 3.79588 4.92412C3.89653 4.68132 4.04405 4.46075 4.23 4.275C4.41575 4.08905 4.63632 3.94153 4.87912 3.84088C5.12192 3.74023 5.38217 3.68843 5.645 3.68843C5.90783 3.68843 6.16808 3.74023 6.41088 3.84088C6.65368 3.94153 6.87425 4.08905 7.06 4.275L7.12 4.335C7.35054 4.56554 7.64982 4.72019 7.97422 4.779C8.29862 4.83782 8.63319 4.79752 8.935 4.663H9C9.53043 4.663 10.0391 4.45229 10.4142 4.07722C10.7893 3.70214 11 3.19343 11 2.663C11 2.13257 10.7893 1.62386 10.4142 1.24878C10.0391 0.873715 9.53043 0.663 9 0.663H8.91C8.57901 0.655343 8.25802 0.54812 7.98572 0.355509C7.71342 0.162898 7.50142 -0.106258 7.37 -0.417C7.23381 -0.718619 7.19307 -1.05405 7.25268 -1.37903C7.31228 -1.70401 7.46919 -2.00392 7.71 -2.237L7.77 -2.297C7.95575 -2.48295 8.10327 -2.70352 8.20392 -2.94632C8.30457 -3.18912 8.35637 -3.44937 8.35637 -3.7122C8.35637 -3.97503 8.30457 -4.23528 8.20392 -4.47808C8.10327 -4.72088 7.95575 -4.94145 7.77 -5.1272C7.58425 -5.31315 7.36368 -5.46067 7.12088 -5.56132C6.87808 -5.66197 6.61783 -5.71377 6.355 -5.71377C6.09217 -5.71377 5.83192 -5.66197 5.58912 -5.56132C5.34632 -5.46067 5.12575 -5.31315 4.94 -5.1272L4.88 -5.0672C4.64946 -4.83666 4.35018 -4.68201 4.02578 -4.6232C3.70138 -4.56438 3.36681 -4.60468 3.065 -4.7382H3C2.46957 -4.7382 1.96086 -4.52749 1.58579 -4.15241C1.21071 -3.77734 1 -3.26863 1 -2.7382C1 -2.20777 1.21071 -1.69906 1.58579 -1.32398C1.96086 -0.948915 2.46957 -0.7382 3 -0.7382H3.09C3.42099 -0.745857 3.74198 -0.85308 4.01428 -1.04569C4.28658 -1.2383 4.49858 -1.50746 4.63 -1.8182C4.76619 -2.11982 4.80693 -2.45525 4.74732 -2.78023C4.68772 -3.10521 4.53081 -3.40512 4.29 -3.6382L4.23 -3.6982C4.04405 -3.88395 3.89653 -4.10452 3.79588 -4.34732C3.69523 -4.59012 3.64343 -4.85037 3.64343 -5.1132C3.64343 -5.37603 3.69523 -5.63628 3.79588 -5.87908C3.89653 -6.12188 4.04405 -6.34245 4.23 -6.5282C4.41575 -6.71415 4.63632 -6.86167 4.87912 -6.96232C5.12192 -7.06297 5.38217 -7.11477 5.645 -7.11477C5.90783 -7.11477 6.16808 -7.06297 6.41088 -6.96232C6.65368 -6.86167 6.87425 -6.71415 7.06 -6.5282L7.12 -6.4682C7.35054 -6.23766 7.64982 -6.08301 7.97422 -6.0242C8.29862 -5.96538 8.63319 -6.00568 8.935 -6.1392H9C9.53043 -6.1392 10.0391 -5.92849 10.4142 -5.55341C10.7893 -5.17834 11 -4.66963 11 -4.1392C11 -3.60877 10.7893 -3.10006 10.4142 -2.72498C10.0391 -2.34992 9.53043 -2.1392 9 -2.1392Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="mobile-nav-label">Settings</span>
          </button>
        </div>
      )}
    </div>
  )
}

// College Profile View Component
const CollegeProfileView = ({ college, user, onJoinChat, onFollowCollege, onUnfollowCollege, onBack, showBackButton = true, onViewStudentProfile }) => {
  const [showMembers, setShowMembers] = useState(false)
  const [members, setMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [collegeData, setCollegeData] = useState(college) // Local state for college data
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoadingFollow, setIsLoadingFollow] = useState(false)
  const [isJoining, setIsJoining] = useState(false)

  // Check follow status on mount and when college changes
  useEffect(() => {
    const checkFollow = async () => {
      if (user && college) {
        try {
          const response = await checkFollowStatus(college)
          if (response.success) {
            setIsFollowing(response.isFollowing)
          }
        } catch (error) {
          console.error('Error checking follow status:', error)
        }
      }
    }
    checkFollow()
  }, [user, college])

  // Load followers count on mount
  useEffect(() => {
    const loadFollowersCount = async () => {
      if (college) {
        try {
          const response = await getCollegeFollowersCount(college)
          if (response.success) {
            setCollegeData(prev => ({
              ...prev,
              totalMembers: response.count || 0
            }))
          }
        } catch (error) {
          console.error('Error loading followers count:', error)
        }
      }
    }
    loadFollowersCount()
  }, [college])

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

  // Handle follow college
  const handleFollowCollege = async (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    if (!college || (!college.aisheCode && !college.name)) {
      alert('Error: Invalid college data')
      return
    }
    
    if (isLoadingFollow || isFollowing) {
      return // Prevent multiple clicks
    }
    
    setIsLoadingFollow(true)
    
    try {
      // Follow the college
      const result = await followCollege(college)
      
      if (result?.success) {
        setIsFollowing(true)
        
        // Add current user to members list immediately
        const userMember = {
          id: user?.id || user?._id || `user-${Date.now()}`,
          name: getUserDisplayName(),
          avatar: getUserAvatar()
        }
        
        setMembers(prev => {
          const exists = prev.find(m => 
            m.id === userMember.id || 
            (m.name === userMember.name && m.avatar === userMember.avatar)
          )
          if (!exists) {
            const newMembers = [userMember, ...prev]
            setCollegeData(prevData => ({
              ...prevData,
              totalMembers: newMembers.length
            }))
            return newMembers
          }
          return prev
        })
        
        // Reload followers count and members from API
        try {
          const [followersResponse, followersListResponse] = await Promise.all([
            getCollegeFollowersCount(college),
            getCollegeFollowers(college)
          ])
          
          if (followersResponse.success) {
            setCollegeData(prev => ({
              ...prev,
              totalMembers: followersResponse.count || 0
            }))
          }
          
          if (followersListResponse.success && followersListResponse.members) {
            setMembers(followersListResponse.members)
            setCollegeData(prev => ({
              ...prev,
              totalMembers: followersListResponse.count || followersListResponse.members.length
            }))
          }
        } catch (error) {
          console.error('Error loading followers:', error)
        }
        
        // Call parent handler to add to chats
        if (onFollowCollege) {
          await onFollowCollege(college)
        }
      } else {
        alert(result?.message || 'Failed to follow college')
      }
    } catch (error) {
      console.error('Error following college:', error)
      alert('Error following college: ' + (error.message || 'Unknown error'))
    } finally {
      setIsLoadingFollow(false)
    }
  }

  // Handle unfollow college
  const handleUnfollowCollege = async (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (isLoadingFollow || !isFollowing) return // Prevent multiple clicks
    
    setIsLoadingFollow(true)
    if (onUnfollowCollege) {
      const result = await onUnfollowCollege(college)
      if (result?.success) {
        setIsFollowing(false)
        // Reload followers count
        try {
          const followersResponse = await getCollegeFollowersCount(college)
          if (followersResponse.success) {
            setCollegeData(prev => ({
              ...prev,
              totalMembers: followersResponse.count || 0
            }))
          }
        } catch (error) {
          console.error('Error loading followers count:', error)
        }
      }
    }
    setIsLoadingFollow(false)
  }

  // Fetch members when toggle is clicked
  const handleToggleMembers = async () => {
    if (!showMembers) {
      setLoadingMembers(true)
      try {
        // Fetch followers from API
        const response = await getCollegeFollowers(collegeData)
        if (response.success && response.members) {
          setMembers(response.members)
          setCollegeData(prev => ({
            ...prev,
            totalMembers: response.count || response.members.length
          }))
        } else {
          // If no members, set empty array
          setMembers([])
          setCollegeData(prev => ({
            ...prev,
            totalMembers: 0
          }))
        }
      } catch (error) {
        console.error('Error fetching members:', error)
        setMembers([])
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

  // Load members when following status changes
  useEffect(() => {
    const loadMembers = async () => {
      if (isFollowing && college) {
        try {
          const response = await getCollegeFollowers(college)
          if (response.success && response.members) {
            setMembers(response.members)
            setCollegeData(prev => ({
              ...prev,
              totalMembers: response.count || response.members.length
            }))
          }
        } catch (error) {
          console.error('Error loading members:', error)
        }
      } else if (!isFollowing) {
        // Clear members if not following
        setMembers([])
      }
    }
    loadMembers()
  }, [isFollowing, college])

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
            className={isFollowing ? "btn-join-campus btn-remove-campus" : "btn-join-campus"} 
            onClick={async (e) => {
              e.preventDefault()
              e.stopPropagation()
              
              if (isLoadingFollow) {
                return
              }
              
              try {
                if (isFollowing) {
                  await handleUnfollowCollege(e)
                } else {
                  await handleFollowCollege(e)
                }
              } catch (error) {
                console.error('Error in button onClick:', error)
                alert('Error: ' + (error.message || 'Unknown error'))
              }
            }}
            disabled={isLoadingFollow}
            style={{ 
              pointerEvents: isLoadingFollow ? 'none' : 'auto', 
              position: 'relative', 
              zIndex: 100,
              cursor: isLoadingFollow ? 'not-allowed' : 'pointer',
              minWidth: '100px',
              opacity: isLoadingFollow ? 0.6 : 1
            }}
          >
            {isLoadingFollow ? 'Loading...' : (isFollowing ? 'Unfollow' : 'Follow')}
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
                    <div 
                      key={member.id || index} 
                      className="member-item-whatsapp"
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        if (onViewStudentProfile && member.id) {
                          console.log('🖱️ Clicked on member, userId:', member.id)
                          const userIdStr = String(member.id).trim()
                          if (userIdStr && userIdStr !== 'undefined' && userIdStr !== 'null') {
                            onViewStudentProfile(userIdStr)
                          } else {
                            console.error('Invalid member userId:', member.id)
                            alert('Invalid user ID. Please try again.')
                          }
                        }
                      }}
                      style={{ cursor: onViewStudentProfile ? 'pointer' : 'default' }}
                    >
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
const LiveChatView = ({ chat, college, onBack, onViewProfile, onViewStudentProfile, user, verificationStatus, onMessageSent }) => {
  const [messageInput, setMessageInput] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 0, y: 0 })
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [senderProfiles, setSenderProfiles] = useState({}) // Cache for sender profiles: { userId: { displayName, profilePicture, ... } }
  const [blockedUsers, setBlockedUsers] = useState(new Set()) // Set of blocked user IDs
  const [blockMessage, setBlockMessage] = useState(null) // Professional block message to show
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [clearError, setClearError] = useState(null) // Error message for clear chat
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteForAll, setDeleteForAll] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showQuickEmojis, setShowQuickEmojis] = useState(false)
  const [quickEmojiPosition, setQuickEmojiPosition] = useState({ x: 0, y: 0 })
  const [replyingTo, setReplyingTo] = useState(null)
  const [swipeStartX, setSwipeStartX] = useState(null)
  const [swipeStartY, setSwipeStartY] = useState(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [typingUsers, setTypingUsers] = useState(new Map()) // Map of userId -> { name, timestamp }
  const [onlineUsers, setOnlineUsers] = useState(new Set()) // Set of online user IDs
  const [isTyping, setIsTyping] = useState(false) // Track if current user is typing
  const [collegeActiveCount, setCollegeActiveCount] = useState(null) // Track active students count for college
  const [lastReadMessageId, setLastReadMessageId] = useState(null) // Track last read message
  const [hoveredMessage, setHoveredMessage] = useState(null) // Track hovered message for desktop
  const [showMessageHeader, setShowMessageHeader] = useState(false) // Show action header when message selected
  const [selectionMode, setSelectionMode] = useState(false) // Selection mode for messages/chats
  const [selectedItems, setSelectedItems] = useState(new Set()) // Set of selected message/chat IDs
  const messagesEndRef = useRef(null)
  const longPressTimer = useRef(null)
  const actionMenuRef = useRef(null)
  const emojiPickerRef = useRef(null)
  const quickEmojiRef = useRef(null)
  const blockMessageTimeoutRef = useRef(null) // Store timeout ID for cleanup
  const typingTimeoutRef = useRef(null) // Store typing timeout
  const doubleClickTimer = useRef(null) // For double-click detection
  const lastClickTime = useRef(0) // Track last click time for double-click
  const lastClickedMessage = useRef(null) // Track last clicked message
  const messageInputRef = useRef(null) // Ref for textarea auto-resize
  const socket = getSocket()
  
  // Top 5 emojis for quick reactions
  const quickEmojis = ['👍', '❤️', '😂', '😮', '😥']
  
  // Cleanup function for block message timeout
  const clearBlockMessageTimeout = () => {
    if (blockMessageTimeoutRef.current) {
      clearTimeout(blockMessageTimeoutRef.current)
      blockMessageTimeoutRef.current = null
    }
  }
  
  // Set block message with auto-clear (production-safe)
  const setBlockMessageWithTimeout = (message) => {
    clearBlockMessageTimeout() // Clear any existing timeout
    setBlockMessage(message)
    blockMessageTimeoutRef.current = setTimeout(() => {
      setBlockMessage(null)
      blockMessageTimeoutRef.current = null
    }, 5000)
  }
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearBlockMessageTimeout()
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      // Stop typing when component unmounts
      // Note: collegeId and isTyping are captured in closure
      }
  }, [isTyping]) // Add isTyping to dependencies

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

  // Safety check: if no collegeId, show error message
  if (!collegeId && chat?.type === 'college') {
    return (
      <div className="live-chat-view">
        <div className="chat-header-bar">
          <button className="chat-header-back-btn" onClick={onBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>Error: College information not found. Please go back and try again.</p>
        </div>
      </div>
    )
  }

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

  // Fetch sender profiles
  const fetchSenderProfiles = async (senderIds) => {
    const uniqueSenderIds = [...new Set(senderIds)]
    const profilesToFetch = uniqueSenderIds.filter(id => 
      id && !senderProfiles[id] && String(id) !== String(user?.id || user?._id || '')
    )

    if (profilesToFetch.length === 0) return

    try {
      const profilePromises = profilesToFetch.map(async (senderId) => {
        try {
          const response = await getUserProfile(senderId)
          if (response.success && response.user) {
            return {
              userId: senderId,
              profile: response.user.profile,
              displayName: response.user.profile?.displayName || response.user.profile?.firstName || 'User',
              profilePicture: response.user.profile?.profilePicture || null
            }
          }
        } catch (error) {
          console.error(`Error fetching profile for ${senderId}:`, error)
          return null
        }
      })

      const profiles = await Promise.all(profilePromises)
      const newProfiles = {}
      profiles.forEach(profile => {
        if (profile) {
          newProfiles[profile.userId] = {
            displayName: profile.displayName,
            profilePicture: profile.profilePicture,
            profile: profile.profile
          }
        }
      })

      if (Object.keys(newProfiles).length > 0) {
        setSenderProfiles(prev => ({ ...prev, ...newProfiles }))
      }
    } catch (error) {
      console.error('Error fetching sender profiles:', error)
    }
  }

  // Note: Blocked users are now loaded when messages are fetched, not in a separate effect

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
          const formattedMessages = response.messages.map(msg => {
            const formattedMsg = {
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
            timestamp: new Date(msg.timestamp),
              replyTo: msg.replyTo || null,
              replyToData: null, // Will be populated below
            readBy: msg.readBy ? msg.readBy.map(r => ({ userId: String(r.userId || r.userId), readAt: r.readAt })) : [],
            deliveredTo: msg.deliveredTo ? msg.deliveredTo.map(d => ({ userId: String(d.userId || d.userId), deliveredAt: d.deliveredAt })) : []
            }
            
            // If this message has a replyTo, find the replied-to message in the same response
            if (msg.replyTo) {
              const repliedMsg = response.messages.find(m => m.id === msg.replyTo)
              if (repliedMsg) {
                formattedMsg.replyToData = {
                  id: repliedMsg.id,
                  text: repliedMsg.text,
                  sender: repliedMsg.senderName,
                  senderId: repliedMsg.senderId,
                  isOwn: String(repliedMsg.senderId) === String(user?.id || user?._id || '')
                }
              }
            }
            
            return formattedMsg
          })
          
          // Filter out messages from blocked users
          const currentUserId = String(user?.id || user?._id || '')
          const filteredMessages = formattedMessages.filter(msg => {
            // Always show own messages
            if (String(msg.senderId) === currentUserId) return true
            // Check if sender is blocked (will be checked async)
            return true // Will filter after loading blocked users
          })
          
          // Sort messages by timestamp to ensure correct order
          const sortedMessages = filteredMessages.sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
          );
          
          setMessages(sortedMessages)
          
          console.log(`📥 Loaded ${sortedMessages.length} messages for college: ${collegeId}`);
          
          // Fetch profiles for all unique senders
          const senderIds = formattedMessages.map(msg => msg.senderId).filter(Boolean)
          await fetchSenderProfiles(senderIds)
          
          // Scroll to bottom after messages are loaded and DOM is updated
          setTimeout(() => {
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: 'auto' })
            }
          }, 100)
        }
      } catch (error) {
        console.error('Error loading messages:', error)
      } finally {
        setLoading(false)
        // Ensure scroll happens after loading completes
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'auto' })
          }
        }, 150)
      }
    }

    loadMessages()
  }, [collegeId, chat.type, user?.id])

  // Fetch active students count for college chat (last 24 hours)
  useEffect(() => {
    if (!collegeId || chat.type !== 'college') {
      setCollegeActiveCount(null)
      return
    }

    const fetchActiveCount = async () => {
      try {
        const response = await getCollegeActiveStudentsCount(collegeId)
        if (response.success) {
          setCollegeActiveCount(response.activeCount)
        }
      } catch (error) {
        console.error('Error fetching active students count:', error)
        setCollegeActiveCount(0)
      }
    }

    fetchActiveCount()
    // Refresh every 5 minutes
    const interval = setInterval(fetchActiveCount, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [collegeId, chat.type])

  // Set up Socket.IO connection and listeners for real-time messages
  useEffect(() => {
    if (!collegeId || chat.type !== 'college') return

      // Track recent successful message sends to suppress false error warnings
      const recentSuccessfulSends = new Set();
      const MAX_TRACK_TIME = 5000; // Track for 5 seconds

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

    // Set up error handler - don't remove optimistic messages on socket errors
    // The message might still be saved on the server
    const handleSocketError = (error) => {
        const errorMessage = error?.message || '';
        
        // If we have recent successful sends, suppress the error warning
        // This handles the case where an error is emitted but message was actually saved
        if (recentSuccessfulSends.size > 0 && 
            (errorMessage.includes('Failed to send message') || errorMessage.includes('Failed to save message'))) {
          // Silently ignore - message was successfully sent
          return;
        }
        
        // Don't log generic "Failed to send message" errors as errors if messages are working
        // This prevents false positive error logs when messages are actually being sent successfully
        if (errorMessage.includes('Failed to send message') || errorMessage.includes('Failed to save message')) {
          // Log as warning instead of error since message might still be saved
          console.warn('⚠️ Socket error (message may still be saved):', errorMessage);
        } else {
          console.error('Socket error in college chat:', error);
        }
      // Don't remove optimistic messages - they might still be saved
      // The message will be loaded from backend on refresh
    }

    const handleReceiveMessage = (message) => {
      // Only add message if it's for this college
      if (message.collegeId === collegeId) {
        // Check if sender is blocked
        const senderIdStr = String(message.senderId)
        const currentUserId = String(user?.id || user?._id || '')
        
        // Don't show messages from blocked users (unless it's own message)
        if (senderIdStr !== currentUserId && blockedUsers.has(senderIdStr)) {
          return // Skip blocked user's messages
        }
        
        const isOwn = String(message.senderId) === String(user?.id || user?._id || '')
        
        // If this is our own message, track it as a successful send to suppress false errors
        if (isOwn && message.id) {
          recentSuccessfulSends.add(message.id);
          // Clean up after tracking period
          setTimeout(() => {
            recentSuccessfulSends.delete(message.id);
          }, MAX_TRACK_TIME);
        }
        
        // SIMPLIFIED: Check if this message matches an optimistic message (replace it)
        setMessages(prev => {
          
          // Check for duplicate first
          const existingIndex = prev.findIndex(m => m.id === message.id)
          if (existingIndex !== -1) {
            // If it's an optimistic message with this ID, replace it
            if (prev[existingIndex].isOptimistic) {
              const optimisticMsg = prev[existingIndex]
              const newMessages = [...prev]
              newMessages[existingIndex] = {
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
                isOwn: isOwn,
                timestamp: new Date(message.timestamp),
                replyTo: message.replyTo || optimisticMsg.replyTo || null,
                replyToData: optimisticMsg.replyToData || null,
                readBy: message.readBy ? message.readBy.map(r => ({ userId: String(r.userId || r.userId), readAt: r.readAt })) : [],
                deliveredTo: message.deliveredTo ? message.deliveredTo.map(d => ({ userId: String(d.userId || d.userId), deliveredAt: d.deliveredAt })) : []
              }
              if (isOwn && onMessageSent && message.collegeId) {
                onMessageSent(message.collegeId, message.text, message.timestamp, true, message.deliveredTo || [], message.readBy || [])
              }
              return newMessages
            }
            return prev // Already exists, skip
          }
          
          // SIMPLE MATCHING: Find optimistic message by text + sender + recent time
          // This works for both normal and reply messages
          const optimisticIndex = prev.findIndex(m => {
            if (!m.isOptimistic) return false
            // Trim both texts for comparison to handle whitespace differences
            if (m.text.trim() !== message.text.trim()) return false
            if (String(m.senderId) !== String(message.senderId)) return false
            // Time check - be VERY lenient (60 seconds)
            const timeDiff = Math.abs(new Date(m.timestamp) - new Date(message.timestamp))
            return timeDiff < 60000
          })
          
          console.log('🔍 Matching check:', {
            messageText: message.text,
            messageId: message.id,
            isOwn,
            optimisticIndex,
            totalOptimistic: prev.filter(m => m.isOptimistic).length,
            optimisticMessages: prev.filter(m => m.isOptimistic).map(m => ({
              id: m.id,
              text: m.text,
              senderId: m.senderId,
              timestamp: m.timestamp
            }))
          })
          
          if (optimisticIndex !== -1) {
            // Replace optimistic with real message
            const optimisticMsg = prev[optimisticIndex]
            const newMessages = [...prev]
            
            // Preserve replyToData from optimistic message
            let replyToData = optimisticMsg.replyToData || null
            if (message.replyTo && !replyToData) {
              const repliedMsg = prev.find(m => m.id === message.replyTo)
              if (repliedMsg) {
                replyToData = {
                  id: repliedMsg.id,
                  text: repliedMsg.text,
                  sender: repliedMsg.sender,
                  senderId: repliedMsg.senderId,
                  isOwn: repliedMsg.isOwn
                }
              }
            }
            
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
              isOwn: isOwn,
              timestamp: new Date(message.timestamp),
              replyTo: message.replyTo || optimisticMsg.replyTo || null,
              replyToData: replyToData,
              readBy: message.readBy ? message.readBy.map(r => ({ userId: String(r.userId || r.userId), readAt: r.readAt })) : [],
              deliveredTo: message.deliveredTo ? message.deliveredTo.map(d => ({ userId: String(d.userId || d.userId), deliveredAt: d.deliveredAt })) : []
            }
            
            if (isOwn && onMessageSent && message.collegeId) {
              onMessageSent(message.collegeId, message.text, message.timestamp, true, message.deliveredTo || [], message.readBy || [])
            }
            
            console.log('✅ Replaced optimistic message with real message:', message.id)
            return newMessages
          }
          
          // New message from someone else (or our own that didn't match)
          // For our own messages, make sure we remove any optimistic messages to prevent duplicates
          // If it's our own message, remove any optimistic messages with the same text to avoid duplicates
          const filteredPrev = isOwn 
            ? prev.filter(m => {
                // Remove optimistic messages that match this message
                if (m.isOptimistic && m.text.trim() === message.text.trim() && String(m.senderId) === String(message.senderId)) {
                  console.log('🗑️ Removing unmatched optimistic message:', m.id, 'for real message:', message.id)
                  return false
                }
                return true
              })
            : prev
          
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
            isOwn: isOwn,
              timestamp: new Date(message.timestamp),
            replyTo: message.replyTo || null,
            replyToData: null,
              readBy: message.readBy ? message.readBy.map(r => ({ userId: r.userId?.toString() || r.userId, readAt: r.readAt })) : [],
              deliveredTo: message.deliveredTo ? message.deliveredTo.map(d => ({ userId: d.userId?.toString() || d.userId, deliveredAt: d.deliveredAt })) : []
            }
          
          // Populate replyToData if needed
          if (formattedMessage.replyTo) {
            const repliedMsg = filteredPrev.find(m => m.id === formattedMessage.replyTo)
            if (repliedMsg) {
              formattedMessage.replyToData = {
                id: repliedMsg.id,
                text: repliedMsg.text,
                sender: repliedMsg.sender,
                senderId: repliedMsg.senderId,
                isOwn: repliedMsg.isOwn
              }
            }
          }
          
            const newMessages = [...filteredPrev, formattedMessage].sort((a, b) => 
              new Date(a.timestamp) - new Date(b.timestamp)
            )
            
            if (message.senderId && String(message.senderId) !== String(user?.id || user?._id || '')) {
              fetchSenderProfiles([message.senderId])
            }
            
            return newMessages
        })
      }
    }

    // Set up message listener
    onReceiveMessage(handleReceiveMessage)
    
    // Set up error handler - don't remove optimistic messages on socket errors
    // The message might still be saved on the server
    onSocketError(handleSocketError)
    
    // Get socket instance for all listeners
    const socketInstance = getSocket()
    
    // Listen for message sent confirmation - just log it, don't update IDs
    // We'll match by text/sender/time when receiveMessage arrives
    const handleMessageSent = (data) => {
      console.log('✅ Message sent confirmation received:', data.messageId)
      // Mark this as a successful send to suppress false error warnings
      if (data.messageId) {
        recentSuccessfulSends.add(data.messageId);
        // Clean up after tracking period
        setTimeout(() => {
          recentSuccessfulSends.delete(data.messageId);
        }, MAX_TRACK_TIME);
      }
      // Don't update optimistic messages here - let receiveMessage handle it
      // This avoids race conditions and timing issues
    }
    
    if (socketInstance) {
      socketInstance.on('messageSent', handleMessageSent)
    }

    // Set up typing indicator listeners
    const handleUserTyping = (data) => {
      if (data.collegeId === collegeId && data.userId !== String(user?.id || user?._id || '')) {
        if (data.isTyping) {
          setTypingUsers(prev => {
            const newMap = new Map(prev)
            newMap.set(data.userId, {
              name: data.userName || 'Someone',
              timestamp: Date.now()
            })
            return newMap
          })
        } else {
          setTypingUsers(prev => {
            const newMap = new Map(prev)
            newMap.delete(data.userId)
            return newMap
          })
        }
      }
    }
    onUserTyping(handleUserTyping)

    // Set up online/offline listeners
    const handleUserOnline = (data) => {
      if (data.userId) {
        setOnlineUsers(prev => new Set(prev).add(data.userId))
      }
    }
    const handleUserOffline = (data) => {
      if (data.userId) {
        setOnlineUsers(prev => {
          const newSet = new Set(prev)
          newSet.delete(data.userId)
          return newSet
        })
        // Also remove from typing users
        setTypingUsers(prev => {
          const newMap = new Map(prev)
          newMap.delete(data.userId)
          return newMap
        })
      }
    }
    onUserOnline(handleUserOnline)
    onUserOffline(handleUserOffline)

    // Set up read receipt listener
    const handleMessageRead = (data) => {
      if (data.messageId) {
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.messageId) {
            const readBy = msg.readBy || []
            if (!readBy.some(r => String(r.userId) === String(data.userId))) {
              return {
                ...msg,
                readBy: [...readBy, { userId: data.userId, readAt: data.readAt || new Date() }]
              }
            }
          }
          return msg
        }))
      }
    }
    onMessageRead(handleMessageRead)

    // Set up blocked message listener
    if (socketInstance) {
      const handleBlockedMessage = (data) => {
        setBlockMessageWithTimeout({
          text: data.message || 'You cannot send messages because you have blocked users in this chat',
          type: 'blocked'
        })
      }
      
      socketInstance.on('messageBlocked', handleBlockedMessage)
      
      return () => {
        // Cleanup: remove listeners when component unmounts or collegeId changes
        if (socketInstance) {
          socketInstance.off('receiveMessage', handleReceiveMessage)
          socketInstance.off('messageBlocked', handleBlockedMessage)
          socketInstance.off('userTyping', handleUserTyping)
          socketInstance.off('userOnline', handleUserOnline)
          socketInstance.off('userOffline', handleUserOffline)
          socketInstance.off('messageRead', handleMessageRead)
          socketInstance.off('messageSent', handleMessageSent)
        }
      }
    }
  }, [collegeId, chat.type, user?.id, blockedUsers])

  // Auto-scroll to latest message when messages change or loading completes
  useEffect(() => {
    if (!loading && messages.length > 0) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' })
        }
      }, 50)
    }
  }, [messages, loading])

  const handleClearChat = async () => {
    if (!collegeId) return
    
    try {
      setClearing(true)
      setClearError(null)
      const response = await clearCollegeMessages(collegeId)
      if (response.success) {
        setMessages([])
        setShowClearConfirm(false)
        
        // Update chat list immediately to show "No messages yet"
        if (onMessageSent) {
          // Pass null timestamp to indicate cleared state - this will update timestamp to current time
          onMessageSent(
            collegeId,
            'No messages yet',
            null, // null timestamp indicates cleared state
            false,
            [],
            []
          )
        }
      } else {
        setClearError(response.message || 'Failed to clear chat. Please try again.')
      }
    } catch (error) {
      console.error('Error clearing chat:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Error clearing chat. Please try again.'
      setClearError(errorMessage)
    } finally {
      setClearing(false)
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (messageInputRef.current) {
      messageInputRef.current.style.height = 'auto'
      const scrollHeight = messageInputRef.current.scrollHeight
      const maxHeight = 120 // Maximum height in pixels (about 5 lines)
      messageInputRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`
    }
  }, [messageInput])

  // Handle typing indicator
  const handleInputChange = (e) => {
    const value = e.target.value
    setMessageInput(value)
    
    if (!collegeId) return
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
    
    // If user is typing and not already marked as typing
    if (value.trim().length > 0) {
      if (!isTyping) {
      setIsTyping(true)
      emitTyping(collegeId, true)
    }
    
    // Set timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
        emitTyping(collegeId, false)
        typingTimeoutRef.current = null
      }, 2000)
    } else {
      // Input is empty, stop typing immediately
      if (isTyping) {
        setIsTyping(false)
        emitTyping(collegeId, false)
      }
    }
  }

  // Handle Enter key (send) vs Shift+Enter (new line)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    // Trim only leading/trailing whitespace, preserve newlines in the middle
    let messageText = messageInput.trimStart().trimEnd()
    if (!messageText || !collegeId) return
    
    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false)
      emitTyping(collegeId, false)
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }

    // Check if user has blocked anyone (prevent sending)
    if (blockedUsers.size > 0) {
      setBlockMessageWithTimeout({
        text: 'You cannot send messages because you have blocked users in this chat',
        type: 'blocked'
      })
      return
    }

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
      replyTo: replyingTo ? replyingTo.id : null,
      replyToData: replyingTo ? replyingTo : null, // Store full reply data for rendering
      isOptimistic: true
    }

    // Store replyToId before clearing replyingTo
    const replyToId = replyingTo ? replyingTo.id : null

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage])
    setMessageInput('')
    
    // Clear reply after storing replyToId and adding to messages
    if (replyingTo) {
      setReplyingTo(null)
    }

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
        // Remove optimistic message only on connection failure
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id))
        return
      }
    }

    // Send message via socket
    try {
      socketInstance = getSocket()
      if (socketInstance && socketInstance.connected) {
        // Use stored replyToId (already captured above)
        
        // Use async/await for better error handling
        try {
          await sendMessage(messageText, collegeId, replyToId)
          console.log('✅ Message sent via socket', replyToId ? `(replying to: ${replyToId})` : '')
          
          // Clear reply after sending
          if (replyingTo) {
            setReplyingTo(null)
          }
        
        // Update chat list immediately (optimistic update)
          // Message is just sent, so no delivery/read status yet
        if (onMessageSent && collegeId) {
            onMessageSent(collegeId, messageText, new Date(), true, [], [])
          }
          
          // Don't remove optimistic message - it will be replaced when receiveMessage is received
          // If there's a socket error, the message might still be saved on the server
        } catch (sendError) {
          console.error('❌ Error sending message via socket:', sendError)
          // Only remove optimistic message if it's a connection error, not a server error
          // Server errors might mean the message was still saved
          if (sendError.message?.includes('not connected') || sendError.message?.includes('timeout')) {
            setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id))
          } else {
            // Keep optimistic message - it might still be saved on server
            console.log('⚠️ Keeping optimistic message - might be saved on server')
          }
        }
      } else {
        console.error('Socket not connected, cannot send message')
        // Remove optimistic message on connection error
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id))
        throw new Error('Socket not connected')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Only remove if it's a connection error
      if (error.message?.includes('not connected') || error.message?.includes('timeout')) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id))
      }
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
  // Get typing users list (limit to 5 most recent)
  const typingUsersList = Array.from(typingUsers.entries())
    .sort((a, b) => b[1].timestamp - a[1].timestamp)
    .slice(0, 5)
    .map(([userId, data]) => data.name)

  // Format typing indicator text
  const typingText = typingUsersList.length > 0
    ? typingUsersList.length === 1
      ? `${typingUsersList[0]} is typing...`
      : `${typingUsersList[0]} and ${typingUsersList.length - 1} other${typingUsersList.length - 1 > 1 ? 's' : ''} are typing...`
    : null

  // Format last seen time for display
  const formatLastSeen = (lastSeenDate) => {
    if (!lastSeenDate) return ''
    
    const now = new Date()
    const lastSeen = new Date(lastSeenDate)
    const diffMs = now - lastSeen
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Last seen just now'
    if (diffMins < 60) return `Last seen ${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `Last seen ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays === 1) return 'Last seen yesterday'
    if (diffDays < 7) return `Last seen ${diffDays} days ago`
    
    // For older dates, show actual date
    return `Last seen ${lastSeen.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: lastSeen.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })}`
  }

  // Calculate display status for college chat (shows active students count)
  // Note: LiveChatView is only for college chats, not direct messages
  const displayStatus = typingText || (collegeActiveCount !== null 
    ? `${collegeActiveCount} student${collegeActiveCount !== 1 ? 's' : ''} active today`
    : 'Loading...')
  // Check if college is verified
  const isCollegeVerified = college?.isVerified || false

  // Handle long press on message (mobile and desktop)
  // Handle message hover (desktop)
  const handleMessageHover = (message) => {
    if (!isMobile) {
      setHoveredMessage(message)
    }
  }

  // Handle message unhover (desktop)
  const handleMessageUnhover = () => {
    if (!isMobile) {
      setHoveredMessage(null)
    }
  }

  // Handle message click (desktop - for double-click detection)
  const handleMessageClick = (e, message) => {
    if (isMobile) return
    
    // Prevent default browser behavior (including context menu)
    e.preventDefault()
    e.stopPropagation()
    
    // If in selection mode, toggle selection
    if (selectionMode) {
      handleToggleSelection(message.id)
      return
    }
    
    const currentTime = Date.now()
    const timeDiff = currentTime - lastClickTime.current
    
    // Check if this is a double-click (within 300ms and same message)
    if (timeDiff < 300 && lastClickedMessage.current?.id === message.id) {
      // Double-click detected - show action header
      setSelectedMessage(message)
      setShowMessageHeader(true)
      setShowActionMenu(false)
      lastClickTime.current = 0
      lastClickedMessage.current = null
    } else {
      // Single click - store for potential double-click
      lastClickTime.current = currentTime
      lastClickedMessage.current = message
      
      // Clear timer if exists
      if (doubleClickTimer.current) {
        clearTimeout(doubleClickTimer.current)
      }
      
      // If no double-click within 300ms, clear selection
      doubleClickTimer.current = setTimeout(() => {
        lastClickTime.current = 0
        lastClickedMessage.current = null
      }, 300)
    }
  }

  // Handle right-click on message (prevent default context menu)
  const handleMessageContextMenu = (e, message) => {
    e.preventDefault()
    e.stopPropagation()
    // On desktop, show action header on right-click as well
    if (!isMobile) {
      setSelectedMessage(message)
      setShowMessageHeader(true)
      setShowActionMenu(false)
    }
  }

  const handleMessageTouchStart = (e, message) => {
    const touch = e.touches ? e.touches[0] : null
    const clientX = touch ? touch.clientX : e.clientX
    const clientY = touch ? touch.clientY : e.clientY
    
    // Store swipe start position
    setSwipeStartX(clientX)
    setSwipeStartY(clientY)
    setSwipeOffset(0)
    
    // Start long-press timer (1 second for mobile)
    longPressTimer.current = setTimeout(() => {
      setSelectedMessage(message)
      
      // Calculate position for menu (near the message)
      const rect = e.currentTarget.getBoundingClientRect()
      const messagesArea = e.currentTarget.closest('.chat-messages-area')
      if (messagesArea) {
        const messagesAreaRect = messagesArea.getBoundingClientRect()
        
        if (isMobile) {
          // On mobile, show action menu with all options (1 second)
          const x = rect.left - messagesAreaRect.left + (rect.width / 2)
          const y = rect.top - messagesAreaRect.top - 60
          setQuickEmojiPosition({ x, y })
          setShowQuickEmojis(true)
        }
      }
      
      // Add haptic feedback if available (mobile)
      if (navigator.vibrate && isMobile) {
        navigator.vibrate(50)
      }
    }, 1000) // 1 second for mobile long-press
  }

  const handleMessageTouchEnd = (e) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    
    // Check if swipe was significant enough for reply (mobile only)
    // In WhatsApp, you swipe LEFT to reply (negative deltaX)
    if (swipeStartX !== null && Math.abs(swipeOffset) > 50 && isMobile && swipeOffset < 0) {
      // Swipe left detected - reply to message
      const messageElement = e.currentTarget.closest('.message')
      if (messageElement) {
        const messageId = messageElement.dataset.messageId
        const message = messages.find(m => m.id === messageId)
        if (message) {
          setReplyingTo(message)
        setShowQuickEmojis(false)
        setShowActionMenu(false)
          setSelectedMessage(null)
          // Add haptic feedback
          if (navigator.vibrate) {
            navigator.vibrate(50)
          }
          // Scroll to input area to show reply preview
          setTimeout(() => {
            const inputArea = document.querySelector('.chat-input-area')
            if (inputArea) {
              inputArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            }
          }, 100)
        }
      }
    }
    
    // Reset swipe
    setSwipeStartX(null)
    setSwipeStartY(null)
    setSwipeOffset(0)
  }

  const handleMessageTouchMove = (e) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    
    // Track swipe for reply gesture
    if (swipeStartX !== null && isMobile) {
      const touch = e.touches ? e.touches[0] : null
      const clientX = touch ? touch.clientX : e.clientX
      const deltaX = clientX - swipeStartX
      
      // In WhatsApp, you swipe LEFT to reply (negative deltaX)
      // Allow left swipe (negative deltaX) for reply
      if (deltaX < 0) {
        setSwipeOffset(Math.max(deltaX, -100)) // Cap at -100px (swipe left)
      } else {
        // Reset if swiping right
        setSwipeOffset(0)
      }
    }
  }
  
  // Handle quick emoji reaction (mobile)
  const handleQuickEmojiClick = (emoji) => {
    if (selectedMessage) {
      // For now, add emoji to message input
      setMessageInput(prev => prev + emoji + ' ')
      setShowQuickEmojis(false)
      setSelectedMessage(null)
      setShowMessageHeader(false)
    }
  }
  
  // Handle reply button click
  const handleReplyClick = () => {
    if (selectedMessage) {
      setReplyingTo(selectedMessage)
      setShowActionMenu(false)
      setShowQuickEmojis(false)
      setShowMessageHeader(false)
      setSelectedMessage(null)
      // Scroll to input area to show reply preview
      setTimeout(() => {
        const inputArea = document.querySelector('.chat-input-area')
        if (inputArea) {
          inputArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }, 100)
    }
  }
  
  // Handle select button
  // Handle select button - enter selection mode
  const handleSelectClick = () => {
    if (selectedMessage) {
      // Enter selection mode and add this message to selected items
      setSelectionMode(true)
      setSelectedItems(new Set([selectedMessage.id]))
      setShowMessageHeader(false) // Close the action header, selection mode will show copy/delete buttons
      setSelectedMessage(null)
    }
  }
  
  // Toggle item selection in selection mode
  const handleToggleSelection = (itemId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      // Exit selection mode if no items selected
      if (newSet.size === 0) {
        setSelectionMode(false)
      }
      return newSet
    })
  }
  
  // Exit selection mode
  const handleExitSelectionMode = () => {
    setSelectionMode(false)
    setSelectedItems(new Set())
  }
  
  // Copy selected items
  const handleCopySelected = () => {
    const selectedMessages = messages.filter(msg => selectedItems.has(msg.id))
    if (selectedMessages.length === 0) return
    
    const textToCopy = selectedMessages.map(msg => msg.text).join('\n')
    navigator.clipboard.writeText(textToCopy).then(() => {
      // Show feedback
      alert(`Copied ${selectedMessages.length} message(s)`)
      handleExitSelectionMode()
    }).catch(err => {
      console.error('Failed to copy:', err)
      alert('Failed to copy messages')
    })
  }
  
  // Delete selected items for me (permanently delete from database)
  const handleDeleteSelectedForMe = async () => {
    if (selectedItems.size === 0) return
    
    const selectedMessages = messages.filter(msg => selectedItems.has(msg.id))
    const currentUserId = String(user?.id || user?._id || '')
    const collegeId = chat?.collegeId || college?.aisheCode || college?.name
    
    try {
      // Permanently delete all selected messages
      const deletePromises = selectedMessages.map(msg => deleteMessage(msg.id))
      await Promise.all(deletePromises)
      
      // Remove messages from local state
      const updatedMessages = messages.filter(m => !selectedItems.has(m.id))
      setMessages(updatedMessages)
      handleExitSelectionMode()
      
      // Update chat list with the most recent remaining message
      if (updatedMessages.length > 0 && collegeId && onMessageSent) {
        const lastMessage = updatedMessages[updatedMessages.length - 1]
        const isOwn = String(lastMessage.senderId) === currentUserId
        onMessageSent(
          collegeId,
          lastMessage.text,
          lastMessage.timestamp,
          isOwn,
          lastMessage.deliveredTo || [],
          lastMessage.readBy || []
        )
      } else if (updatedMessages.length === 0 && collegeId && onMessageSent) {
        // No messages left, update chat list to show "No messages yet"
        onMessageSent(
          collegeId,
          'No messages yet',
          null,
          false,
          [],
          []
        )
      }
    } catch (error) {
      console.error('Error deleting messages:', error)
      // Still remove from local state (optimistic update)
      const updatedMessages = messages.filter(m => !selectedItems.has(m.id))
      setMessages(updatedMessages)
      handleExitSelectionMode()
      
      // Update chat list
      if (updatedMessages.length > 0 && collegeId && onMessageSent) {
        const lastMessage = updatedMessages[updatedMessages.length - 1]
        const isOwn = String(lastMessage.senderId) === currentUserId
        onMessageSent(
          collegeId,
          lastMessage.text,
          lastMessage.timestamp,
          isOwn,
          lastMessage.deliveredTo || [],
          lastMessage.readBy || []
        )
      } else if (updatedMessages.length === 0 && collegeId && onMessageSent) {
        onMessageSent(
          collegeId,
          'No messages yet',
          null,
          false,
          [],
          []
        )
      }
    }
  }
  
  // Delete selected items for all (only own messages - permanently delete from database)
  const handleDeleteSelectedForAll = async () => {
    if (selectedItems.size === 0) return
    
    const selectedMessages = messages.filter(msg => selectedItems.has(msg.id))
    const ownMessages = selectedMessages.filter(msg => msg.isOwn)
    const currentUserId = String(user?.id || user?._id || '')
    const collegeId = chat?.collegeId || college?.aisheCode || college?.name
    
    if (ownMessages.length === 0) return // Should not happen, but safety check
    
    try {
      // Permanently delete own messages for all
      const deletePromises = ownMessages.map(msg => deleteMessageForAll(msg.id))
      await Promise.all(deletePromises)
      
      // Remove messages from local state
      const updatedMessages = messages.filter(m => !selectedItems.has(m.id))
      setMessages(updatedMessages)
    handleExitSelectionMode()
      
      // Update chat list with the most recent remaining message
      if (updatedMessages.length > 0 && collegeId && onMessageSent) {
        const lastMessage = updatedMessages[updatedMessages.length - 1]
        const isOwn = String(lastMessage.senderId) === currentUserId
        onMessageSent(
          collegeId,
          lastMessage.text,
          lastMessage.timestamp,
          isOwn,
          lastMessage.deliveredTo || [],
          lastMessage.readBy || []
        )
      } else if (updatedMessages.length === 0 && collegeId && onMessageSent) {
        // No messages left, update chat list to show "No messages yet"
        onMessageSent(
          collegeId,
          'No messages yet',
          null,
          false,
          [],
          []
        )
      }
    } catch (error) {
      console.error('Error deleting messages for all:', error)
      // Still remove from local state (optimistic update)
      const updatedMessages = messages.filter(m => !selectedItems.has(m.id))
      setMessages(updatedMessages)
      handleExitSelectionMode()
      
      // Update chat list
      if (updatedMessages.length > 0 && collegeId && onMessageSent) {
        const lastMessage = updatedMessages[updatedMessages.length - 1]
        const isOwn = String(lastMessage.senderId) === currentUserId
        onMessageSent(
          collegeId,
          lastMessage.text,
          lastMessage.timestamp,
          isOwn,
          lastMessage.deliveredTo || [],
          lastMessage.readBy || []
        )
      } else if (updatedMessages.length === 0 && collegeId && onMessageSent) {
        onMessageSent(
          collegeId,
          'No messages yet',
          null,
          false,
          [],
          []
        )
      }
    }
  }
  
  // Cancel reply
  const handleCancelReply = () => {
    setReplyingTo(null)
  }

  // Handle copy message
  const handleCopyMessage = () => {
    if (selectedMessage) {
      navigator.clipboard.writeText(selectedMessage.text).then(() => {
        setShowActionMenu(false)
        setShowQuickEmojis(false)
        setShowMessageHeader(false)
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

  // Handle delete for me
  const handleDeleteForMe = () => {
    if (selectedMessage) {
      setShowDeleteConfirm(true)
      setDeleteForAll(false)
      setShowActionMenu(false)
      setShowQuickEmojis(false)
      setShowMessageHeader(false)
    }
  }

  // Handle delete for all
  const handleDeleteForAll = () => {
    if (selectedMessage) {
      setShowDeleteConfirm(true)
      setDeleteForAll(true)
      setShowActionMenu(false)
      setShowQuickEmojis(false)
      setShowMessageHeader(false)
    }
  }

  // Confirm and execute delete
  const handleConfirmDelete = async () => {
    if (!selectedMessage) return

    try {
      setDeleting(true)
      const response = deleteForAll 
        ? await deleteMessageForAll(selectedMessage.id)
        : await deleteMessage(selectedMessage.id)
      
      if (response.success) {
        // Remove message from local state
        const updatedMessages = messages.filter(m => m.id !== selectedMessage.id)
        setMessages(updatedMessages)
        setShowDeleteConfirm(false)
        setShowMessageHeader(false)
        setSelectedMessage(null)
        setDeleteForAll(false)
        
        // Update chat list - find the previous message to update last message
        const currentUserId = String(user?.id || user?._id || '')
        const collegeId = chat?.collegeId || college?.aisheCode || college?.name
        
        if (updatedMessages.length > 0 && collegeId && onMessageSent) {
          // Get the most recent remaining message
          const lastMessage = updatedMessages[updatedMessages.length - 1]
          const isOwn = String(lastMessage.senderId) === currentUserId
          
          // Update chat list with the previous message
          onMessageSent(
            collegeId,
            lastMessage.text,
            lastMessage.timestamp,
            isOwn,
            lastMessage.deliveredTo || [],
            lastMessage.readBy || []
          )
        } else if (updatedMessages.length === 0 && collegeId && onMessageSent) {
          // No messages left, update chat list to show "No messages yet"
          onMessageSent(
            collegeId,
            'No messages yet',
            null,
            false,
            [],
            []
          )
        }
      } else {
        alert(response.message || 'Failed to delete message')
      }
    } catch (error) {
      console.error('Error deleting message:', error)
      alert('Error deleting message. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showActionMenu && actionMenuRef.current && !actionMenuRef.current.contains(e.target) && !e.target.closest('.message-content')) {
        setShowActionMenu(false)
        setSelectedMessage(null)
      }
      // Close message header when clicking outside
      if (showMessageHeader && !e.target.closest('.message-action-header') && !e.target.closest('.message-content')) {
        setShowMessageHeader(false)
        setSelectedMessage(null)
      }
      // Close mobile action menu when clicking outside
      if (showQuickEmojis && quickEmojiRef.current && !quickEmojiRef.current.contains(e.target) && !e.target.closest('.message-content')) {
        setShowQuickEmojis(false)
        setSelectedMessage(null)
      }
      // Close emoji picker when clicking outside
      if (showEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(e.target) && !e.target.closest('.emoji-picker-btn')) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [showActionMenu, showEmojiPicker, showMessageHeader, showQuickEmojis])

  // Handle emoji selection
  const onEmojiClick = (emojiData) => {
    setMessageInput(prev => prev + emojiData.emoji)
    // Keep picker open to allow multiple emoji selections
  }

  // Check if message is from current user
  const currentUserId = sessionStorage.getItem('userId')
  const isOwnMessage = selectedMessage && selectedMessage.senderId === currentUserId

  // Prevent click propagation on action header
  const handleActionHeaderClick = (e) => {
    e.stopPropagation()
  }

  return (
    <div className="live-chat-view">
      {/* Selection Mode Bar - Always visible when in selection mode */}
      {selectionMode && (() => {
        // Calculate selection type
        const selectedMessages = messages.filter(msg => selectedItems.has(msg.id))
        const ownMessages = selectedMessages.filter(msg => msg.isOwn)
        const otherMessages = selectedMessages.filter(msg => !msg.isOwn)
        const hasOwnMessages = ownMessages.length > 0
        const hasOtherMessages = otherMessages.length > 0
        const isOnlyOwn = hasOwnMessages && !hasOtherMessages
        const isOnlyOthers = !hasOwnMessages && hasOtherMessages
        const isHybrid = hasOwnMessages && hasOtherMessages
        
        return (
        <div className="selection-mode-bar">
          <div className="selection-mode-info">
            <span>{selectedItems.size} selected</span>
          </div>
          <div className="selection-mode-actions">
            <button 
              className="selection-mode-btn"
              onClick={handleCopySelected}
              title="Copy"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copy</span>
            </button>
              
              {/* Delete buttons based on selection type */}
              {isOnlyOwn && (
                <>
            <button 
              className="selection-mode-btn"
                    onClick={handleDeleteSelectedForMe}
                    title="Delete for me"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
                    <span>Delete for me</span>
            </button>
                  <button 
                    className="selection-mode-btn"
                    onClick={handleDeleteSelectedForAll}
                    title="Delete for all"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    <span>Delete for all</span>
                  </button>
                </>
              )}
              
              {(isOnlyOthers || isHybrid) && (
                <button 
                  className="selection-mode-btn"
                  onClick={handleDeleteSelectedForMe}
                  title="Delete for me"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  <span>Delete for me</span>
                </button>
              )}
              
            <button 
              className="selection-mode-btn"
              onClick={handleExitSelectionMode}
              title="Cancel"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              <span>Cancel</span>
            </button>
          </div>
        </div>
        )
      })()}
      {/* Message Action Header (WhatsApp-style) */}
      {showMessageHeader && selectedMessage && !selectionMode && (
        <div className="message-action-header" onClick={handleActionHeaderClick} onMouseDown={(e) => e.stopPropagation()}>
          <button 
            className="action-header-btn"
            onClick={handleReplyClick}
            title="Reply"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 10 4 15 9 20"></polyline>
              <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
            </svg>
          </button>
          <button 
            className="action-header-btn"
            onClick={handleCopyMessage}
            title="Copy"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
              <button 
                className="action-header-btn"
                onClick={handleDeleteForMe}
            title="Delete"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
          {isOwnMessage && (
              <button 
                className="action-header-btn"
                onClick={handleDeleteForAll}
                title="Delete for all"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
          )}
          <button 
            className="action-header-btn"
            onClick={(e) => {
              e.stopPropagation()
              handleSelectClick()
            }}
            title="Select"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 11 12 14 22 4"></polyline>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
          </button>
          <button 
            className="action-header-btn action-header-close"
            onClick={() => {
              setShowMessageHeader(false)
              setSelectedMessage(null)
            }}
            title="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}
      <div className="chat-header-bar">
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
              <span className={`chat-status ${typingText ? 'typing' : ''}`}>
                {typingText ? (
                  <>
                    <span className="typing-dots">
                      <span>.</span><span>.</span><span>.</span>
                    </span>
                    {typingText}
                  </>
                ) : (
                  <>
                    {!isDirectMessage && onlineUsers.size > 0 && (
                      <span className="online-indicator"></span>
                    )}
                    {displayStatus}
                  </>
                )}
              </span>
            </div>
            {/* Clear Chat Button */}
            <button 
              className="clear-chat-btn"
              onClick={() => setShowClearConfirm(true)}
              title="Clear Chat"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </>
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
                  <div 
                    className={`message ${message.isOwn ? 'own-message' : 'other-message'} ${selectedMessage?.id === message.id ? 'selected-message' : ''} ${hoveredMessage?.id === message.id ? 'hovered-message' : ''} ${selectionMode && selectedItems.has(message.id) ? 'selection-selected' : ''} ${selectionMode ? 'selection-mode' : ''}`}
                    data-message-id={message.id}
                    style={{ position: 'relative' }}
                    onMouseEnter={() => !selectionMode && handleMessageHover(message)}
                    onMouseLeave={() => !selectionMode && handleMessageUnhover()}
                    onClick={(e) => handleMessageClick(e, message)}
                    onContextMenu={(e) => !selectionMode && handleMessageContextMenu(e, message)}
                  >
                    {selectionMode && (
                      <div className="message-selection-checkbox">
                        <input 
                          type="checkbox" 
                          checked={selectedItems.has(message.id)}
                          onChange={() => handleToggleSelection(message.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}
                    {!message.isOwn && (
                      <div className="message-sender-info">
                        <div 
                          className="message-sender-avatar"
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            if (onViewStudentProfile && message.senderId) {
                              console.log('🖱️ Clicked on avatar, senderId:', message.senderId, 'Type:', typeof message.senderId)
                              const senderIdStr = String(message.senderId).trim()
                              if (senderIdStr && senderIdStr !== 'undefined' && senderIdStr !== 'null') {
                                onViewStudentProfile(senderIdStr)
                              } else {
                                console.error('Invalid senderId:', message.senderId)
                                alert('Invalid user ID. Please try again.')
                              }
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <img 
                            src={senderProfiles[message.senderId]?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderProfiles[message.senderId]?.displayName || message.sender || 'User')}&size=40&background=00a8ff&color=fff`}
                            alt={senderProfiles[message.senderId]?.displayName || message.sender || 'User'}
                          />
                        </div>
                        <div 
                          className="message-sender"
                          onClick={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            if (onViewStudentProfile && message.senderId) {
                              console.log('🖱️ Clicked on username, senderId:', message.senderId, 'Type:', typeof message.senderId)
                              const senderIdStr = String(message.senderId).trim()
                              if (senderIdStr && senderIdStr !== 'undefined' && senderIdStr !== 'null') {
                                onViewStudentProfile(senderIdStr)
                              } else {
                                console.error('Invalid senderId:', message.senderId)
                                alert('Invalid user ID. Please try again.')
                              }
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {senderProfiles[message.senderId]?.displayName || message.sender}
                        </div>
                      </div>
                    )}
                    {/* Reply indicator when swiping left (mobile) */}
                    {isMobile && swipeOffset < -20 && (
                      <div 
                        className="message-swipe-reply-indicator"
                        style={{ 
                          opacity: Math.min(Math.abs(swipeOffset) / 100, 1),
                          transform: `translateX(${swipeOffset + 60}px)`
                        }}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 10 4 15 9 20"></polyline>
                          <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
                        </svg>
                      </div>
                    )}
                    <div 
                      className={`message-content ${swipeOffset < 0 ? 'swiping' : ''}`}
                      style={swipeOffset < 0 ? { transform: `translateX(${swipeOffset}px)` } : {}}
                      onTouchStart={(e) => handleMessageTouchStart(e, message)}
                      onTouchEnd={handleMessageTouchEnd}
                      onTouchMove={handleMessageTouchMove}
                      onContextMenu={(e) => {
                        if (isMobile) {
                          e.preventDefault()
                        }
                      }}
                    >
                      {/* Reply Information */}
                      {message.replyTo && (() => {
                        // First try to use stored reply data (from optimistic message)
                        let repliedMessage = message.replyToData
                        
                        // If not available, try to find it in messages array
                        if (!repliedMessage) {
                          repliedMessage = messages.find(m => m.id === message.replyTo)
                        }
                        
                        if (repliedMessage) {
                          return (
                            <div className="message-reply-info">
                              <div className="message-reply-line"></div>
                              <div className="message-reply-content">
                                <span className="message-reply-name">
                                  {repliedMessage.isOwn ? 'You' : (senderProfiles[repliedMessage.senderId]?.displayName || repliedMessage.sender || 'User')}
                                </span>
                                <span className="message-reply-text">{repliedMessage.text}</span>
                              </div>
                            </div>
                          )
                        }
                        return null
                      })()}
                      <p>{message.text}</p>
                      <div className="message-footer">
                        <span className="message-time">{message.time}</span>
                        {message.isOwn && (
                          <span className={`message-status ${(() => {
                            const readBy = message.readBy || []
                            const deliveredTo = message.deliveredTo || []
                            const currentUserId = String(user?.id || user?._id || '')
                            
                            // For group chats, check if read by at least one other user
                            // For direct chats, check if read by the other user
                            const isRead = readBy.some(r => String(r.userId) !== currentUserId)
                            const isDelivered = deliveredTo.some(d => String(d.userId) !== currentUserId)
                            
                            return isRead ? 'read' : isDelivered ? 'delivered' : 'sent'
                          })()}`}>
                            {(() => {
                              const readBy = message.readBy || []
                              const deliveredTo = message.deliveredTo || []
                              const currentUserId = String(user?.id || user?._id || '')
                              
              // Check if message is read by at least one other user
              const isRead = readBy.some(r => String(r.userId || r.userId) !== currentUserId)
              const isDelivered = deliveredTo.some(d => String(d.userId || d.userId) !== currentUserId)
                              
                              if (isRead) {
                                // Blue double checkmark (read)
                                return (
                                  <svg width="16" height="16" viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" fill="#4FC3F7"/>
                                  </svg>
                                )
                              } else if (isDelivered) {
                                // Gray double checkmark (delivered)
                                return (
                                  <svg width="16" height="16" viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" fill="#8696A0"/>
                                  </svg>
                                )
                              } else {
                                // Single checkmark (sent)
                                return (
                                  <svg width="16" height="16" viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51z" fill="#8696A0"/>
                                  </svg>
                                )
                              }
                            })()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Fragment>
              )
            })
          })()
        )}
        <div ref={messagesEndRef}></div>
      </div>

      {/* Mobile Action Menu (Long-press) */}
      {showQuickEmojis && selectedMessage && isMobile && (
        <div 
          ref={quickEmojiRef}
          className="mobile-action-menu"
          style={{
            left: `${quickEmojiPosition.x}px`,
            top: `${quickEmojiPosition.y}px`,
          }}
        >
            <button
            className="mobile-action-item"
            onClick={handleReplyClick}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 10 4 15 9 20"></polyline>
              <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
            </svg>
            <span>Reply</span>
            </button>
          <button
            className="mobile-action-item"
            onClick={handleCopyMessage}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copy</span>
          </button>
              <button 
                className="mobile-action-item"
                onClick={handleDeleteForMe}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            <span>Delete</span>
              </button>
          {isOwnMessage && (
              <button 
                className="mobile-action-item"
                onClick={handleDeleteForAll}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>Delete for all</span>
              </button>
          )}
          <button 
            className="mobile-action-item"
            onClick={(e) => {
              e.stopPropagation()
              handleSelectClick()
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 11 12 14 22 4"></polyline>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
            <span>Select</span>
          </button>
          <button
            className="mobile-action-item mobile-action-close"
            onClick={() => {
              setShowQuickEmojis(false)
              setSelectedMessage(null)
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            <span>Close</span>
          </button>
        </div>
      )}

      {/* WhatsApp-style Action Menu Popup (Desktop) */}
      {showActionMenu && selectedMessage && !isMobile && (
        <div 
          ref={actionMenuRef}
          className="message-action-menu"
          style={{
            left: `${actionMenuPosition.x}px`,
            top: `${actionMenuPosition.y}px`,
          }}
        >
          <button 
            className="action-menu-item" 
            onClick={() => {
              setShowEmojiPicker(true)
              setShowActionMenu(false)
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
              <line x1="9" y1="9" x2="9.01" y2="9"></line>
              <line x1="15" y1="9" x2="15.01" y2="9"></line>
            </svg>
            <span>Emoji</span>
          </button>
          <button 
            className="action-menu-item" 
            onClick={handleReplyClick}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 10 4 15 9 20"></polyline>
              <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
            </svg>
            <span>Reply</span>
          </button>
          <button 
            className="action-menu-item" 
            onClick={handleCopyMessage}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copy</span>
          </button>
            <button 
              className="action-menu-item" 
              onClick={handleDeleteForMe}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            <span>Delete</span>
          </button>
          {isOwnMessage && (
            <button 
              className="action-menu-item" 
              onClick={handleDeleteForAll}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>Delete for all</span>
            </button>
          )}
          <button 
            className="action-menu-item" 
            onClick={(e) => {
              e.stopPropagation()
              handleSelectClick()
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 11 12 14 22 4"></polyline>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
            <span>Select</span>
          </button>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedMessage && (
        <div className="modal-overlay" onClick={() => {
          setShowDeleteConfirm(false)
          setDeleteForAll(false)
        }}>
          <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Message</h3>
              <button className="modal-close-btn" onClick={() => {
                setShowDeleteConfirm(false)
                setDeleteForAll(false)
              }}>×</button>
            </div>
            <div className="modal-content">
              <p className="modal-description">
                {deleteForAll 
                  ? 'Are you sure you want to delete this message for everyone? This action cannot be undone.'
                  : 'Are you sure you want to delete this message? This action cannot be undone.'}
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="modal-cancel-btn"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteForAll(false)
                }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button 
                className="modal-confirm-btn"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Clear Chat Confirmation Modal */}
      {showClearConfirm && (
        <div className="modal-overlay" onClick={() => {
          setShowClearConfirm(false)
          setClearError(null)
        }}>
          <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Clear Chat</h3>
              <button className="modal-close-btn" onClick={() => {
                setShowClearConfirm(false)
                setClearError(null)
              }}>×</button>
            </div>
            <div className="modal-content">
              <p className="modal-description">Are you sure you want to delete all your messages in {displayName}? This action cannot be undone.</p>
              {clearError && (
                <div className="upload-error" style={{ marginTop: '12px', padding: '8px', backgroundColor: 'rgba(255, 0, 0, 0.1)', borderRadius: '4px', color: '#ff4444', fontSize: '14px' }}>
                  {clearError}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="modal-cancel-btn"
                onClick={() => {
                  setShowClearConfirm(false)
                  setClearError(null)
                }}
                disabled={clearing}
              >
                Cancel
              </button>
              <button 
                className="modal-confirm-btn"
                onClick={handleClearChat}
                disabled={clearing}
              >
                {clearing ? 'Clearing...' : 'Clear Chat'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {blockMessage && (
        <div className={`block-message ${blockMessage.type === 'blocked' ? 'block-message-blocked' : 'block-message-error'}`}>
          <span className="block-message-icon">⚠️</span>
          <span className="block-message-text">{blockMessage.text}</span>
        </div>
      )}
      
      {/* Reply Preview */}
      {replyingTo && (
        <div className="reply-preview">
          <div className="reply-preview-content">
            <div className="reply-preview-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 10 4 15 9 20"></polyline>
                <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
              </svg>
              <span className="reply-preview-name">
                {replyingTo.isOwn ? 'You' : (senderProfiles[replyingTo.senderId]?.displayName || replyingTo.sender || 'User')}
              </span>
            </div>
            <div className="reply-preview-text">{replyingTo.text}</div>
          </div>
          <button className="reply-preview-close" onClick={handleCancelReply}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}
      
      <form className="chat-input-area" onSubmit={handleSendMessage}>
        <button
          type="button"
          className="emoji-picker-btn"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          disabled={blockedUsers.size > 0}
          title="Add emoji"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
            <line x1="9" y1="9" x2="9.01" y2="9"></line>
            <line x1="15" y1="9" x2="15.01" y2="9"></line>
          </svg>
        </button>
        <textarea
          ref={messageInputRef}
          className="chat-input"
          placeholder="Type a message"
          value={messageInput}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={blockedUsers.size > 0}
          rows={1}
        />
        <button type="submit" className="send-btn" disabled={blockedUsers.size > 0}>Send</button>
        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="emoji-picker-container">
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              autoFocusSearch={false}
              skinTonesDisabled={true}
              previewConfig={{ showPreview: false }}
              width="100%"
              height="350px"
            />
          </div>
        )}
      </form>
    </div>
  )
}

// Direct Chat View Component
const DirectChatView = ({ otherUserId, user, onBack, onViewProfile, onMessageSent }) => {
  const [messageInput, setMessageInput] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [otherUser, setOtherUser] = useState(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockMessage, setBlockMessage] = useState(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isTyping, setIsTyping] = useState(false) // Track if current user is typing
  const [otherUserTyping, setOtherUserTyping] = useState(false) // Track if other user is typing
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false) // Track if other user is online
  const [otherUserLastSeen, setOtherUserLastSeen] = useState(null) // Track other user's last seen time
  const [collegeActiveCount, setCollegeActiveCount] = useState(null) // Track active students count for college
  const [lastReadMessageId, setLastReadMessageId] = useState(null) // Track last read message
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [showActionMenu, setShowActionMenu] = useState(false)
  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 0, y: 0 })
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteForAll, setDeleteForAll] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const [swipeStartX, setSwipeStartX] = useState(null)
  const [swipeStartY, setSwipeStartY] = useState(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [hoveredMessage, setHoveredMessage] = useState(null)
  const [showMessageHeader, setShowMessageHeader] = useState(false)
  const [showQuickEmojis, setShowQuickEmojis] = useState(false)
  const [quickEmojiPosition, setQuickEmojiPosition] = useState({ x: 0, y: 0 })
  const [selectionMode, setSelectionMode] = useState(false) // Selection mode for messages
  const [selectedItems, setSelectedItems] = useState(new Set()) // Set of selected message IDs
  const messagesEndRef = useRef(null)
  const emojiPickerRef = useRef(null)
  const blockMessageTimeoutRef = useRef(null) // Store timeout ID for cleanup
  const typingTimeoutRef = useRef(null) // Store typing timeout
  const longPressTimer = useRef(null)
  const actionMenuRef = useRef(null)
  const quickEmojiRef = useRef(null)
  const doubleClickTimer = useRef(null)
  const lastClickTime = useRef(0)
  const lastClickedMessage = useRef(null)
  const messageInputRef = useRef(null) // Ref for textarea auto-resize
  
  // Cleanup function for block message timeout
  const clearBlockMessageTimeout = () => {
    if (blockMessageTimeoutRef.current) {
      clearTimeout(blockMessageTimeoutRef.current)
      blockMessageTimeoutRef.current = null
    }
  }
  
  // Set block message with auto-clear (production-safe)
  const setBlockMessageWithTimeout = (message) => {
    clearBlockMessageTimeout() // Clear any existing timeout
    setBlockMessage(message)
    blockMessageTimeoutRef.current = setTimeout(() => {
      setBlockMessage(null)
      blockMessageTimeoutRef.current = null
    }, 5000)
  }
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearBlockMessageTimeout()
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }
      if (doubleClickTimer.current) {
        clearTimeout(doubleClickTimer.current)
      }
      // Stop typing when component unmounts
      if (isTyping && otherUserId) {
        emitTypingDirect(otherUserId, false)
      }
    }
  }, [])

  // Update mobile detection on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Function to refresh block status
  const refreshBlockStatus = useCallback(async () => {
    try {
      const blockResponse = await checkBlockStatus(otherUserId)
      if (blockResponse.success) {
        // Check if either user has blocked the other
        const isBlocked = blockResponse.blockedByMe || blockResponse.blockedByThem || false
        setIsBlocked(isBlocked)
        
        // Clear block message if messaging is allowed
        if (blockResponse.canMessage) {
          clearBlockMessageTimeout()
          setBlockMessage(null)
        } else {
          // Set appropriate block message
          if (blockResponse.blockedByMe) {
            setBlockMessageWithTimeout({
              text: 'You cannot send messages to this user because you have blocked them',
              type: 'blocked'
            })
          } else if (blockResponse.blockedByThem) {
            setBlockMessageWithTimeout({
              text: 'You cannot send messages to this user',
              type: 'blocked'
            })
          }
        }
      }
    } catch (error) {
      console.error('Error checking block status:', error)
    }
  }, [otherUserId])
  
  // Listen for block status changes from profile view
  useEffect(() => {
    const handleBlockStatusChange = async () => {
      console.log('🔄 Block status changed event received, refreshing...')
      await refreshBlockStatus()
    }
    
    window.addEventListener('blockStatusChanged', handleBlockStatusChange)
    
    return () => {
      window.removeEventListener('blockStatusChanged', handleBlockStatusChange)
    }
  }, [refreshBlockStatus])
  
  // Also refresh block status when otherUserId changes
  useEffect(() => {
    if (otherUserId) {
      refreshBlockStatus()
    }
  }, [otherUserId, refreshBlockStatus])

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(e.target) && !e.target.closest('.emoji-picker-btn')) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [showEmojiPicker])

  // Handle emoji selection
  const onEmojiClick = (emojiData) => {
    setMessageInput(prev => prev + emojiData.emoji)
    // Keep picker open to allow multiple emoji selections
  }

  // Fetch other user's last seen time for direct messages
  useEffect(() => {
    if (!otherUserId) {
      setOtherUserLastSeen(null)
      return
    }

    const fetchLastSeen = async () => {
      try {
        const response = await getUserProfile(otherUserId)
        if (response.success && response.user?.profile?.lastSeen) {
          setOtherUserLastSeen(new Date(response.user.profile.lastSeen))
        }
      } catch (error) {
        console.error('Error fetching last seen:', error)
      }
    }

    fetchLastSeen()
    // Refresh every 30 seconds
    const interval = setInterval(fetchLastSeen, 30000)
    return () => clearInterval(interval)
  }, [otherUserId])

  // Fetch other user profile and check block status
  useEffect(() => {
    const loadOtherUser = async () => {
      try {
        const response = await getUserProfile(otherUserId)
        if (response.success && response.user) {
          setOtherUser(response.user)
        }
        
        // Check block status
        await refreshBlockStatus()
      } catch (error) {
        console.error('Error loading other user:', error)
      }
    }
    loadOtherUser()
  }, [otherUserId, refreshBlockStatus])

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

  // Fetch messages
  useEffect(() => {
    const loadMessages = async () => {
      if (!otherUserId) {
        console.error('DirectChatView: otherUserId is missing')
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        const response = await getDirectMessages(otherUserId)
        if (response.success) {
          const currentUserId = String(user?.id || user?._id || '')
          const formattedMessages = response.messages.map(msg => {
            const isOwn = String(msg.senderId) === String(currentUserId)
            // If this is a received message (not our own), mark it as delivered and read
            if (!isOwn) {
              // Mark as delivered first (if not already)
              const alreadyDelivered = msg.deliveredTo?.some(d => String(d.userId) === currentUserId)
              if (!alreadyDelivered) {
                const socketInstance = getSocket()
                if (socketInstance?.connected) {
                  markDirectMessageDelivered(msg.id)
                  // Wait for delivered to be processed before marking as read
                  setTimeout(() => {
                    // Mark as read when opening chat (if not already read)
                    const alreadyRead = msg.readBy?.some(r => String(r.userId) === currentUserId)
                    if (!alreadyRead) {
                      markDirectMessageRead(msg.id)
                    }
                  }, 1000) // 1 second delay to ensure delivered status is processed first
                }
              } else {
                // Already delivered, just mark as read
                const alreadyRead = msg.readBy?.some(r => String(r.userId) === currentUserId)
                if (!alreadyRead) {
                  const socketInstance = getSocket()
                  if (socketInstance?.connected) {
                    setTimeout(() => {
                      markDirectMessageRead(msg.id)
                    }, 500)
                  }
                }
              }
            }
            const formattedMsg = {
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
              isOwn: isOwn,
            timestamp: new Date(msg.timestamp),
            replyTo: msg.replyTo || null,
            replyToData: null, // Will be populated below
            readBy: msg.readBy || [],
            deliveredTo: msg.deliveredTo || []
            }
            
            return formattedMsg
          })
          
          // Populate replyToData for messages that have replyTo
          const messagesWithReplies = formattedMessages.map(msg => {
            if (msg.replyTo && !msg.replyToData) {
              const repliedMsg = formattedMessages.find(m => m.id === msg.replyTo)
              if (repliedMsg) {
                msg.replyToData = {
                  id: repliedMsg.id,
                  text: repliedMsg.text,
                  sender: repliedMsg.sender,
                  senderId: repliedMsg.senderId,
                  isOwn: repliedMsg.isOwn
                }
              }
            }
            return msg
          })
          
          setMessages(messagesWithReplies)
          
          // Update chat list with last message status if it's our message
          if (formattedMessages.length > 0) {
            const lastMessage = formattedMessages[formattedMessages.length - 1]
            if (lastMessage.isOwn && onMessageSent && otherUser) {
              const userName = otherUser.profile?.displayName || otherUser.email?.split('@')[0] || 'User'
              const userAvatar = otherUser.profile?.profilePicture 
                ? (otherUser.profile.profilePicture.startsWith('/uploads/') 
                    ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${otherUser.profile.profilePicture}`
                    : otherUser.profile.profilePicture)
                : null
              onMessageSent(otherUserId, userName, userAvatar, lastMessage.text, lastMessage.timestamp, true, lastMessage.deliveredTo || [], lastMessage.readBy || [])
            }
          }
          
          // Scroll to bottom after messages are loaded and DOM is updated
          setTimeout(() => {
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: 'auto' })
            }
          }, 100)
        } else {
          console.error('Failed to load messages:', response.message)
          setMessages([])
        }
      } catch (error) {
        console.error('Error loading messages:', error)
        setMessages([])
      } finally {
        setLoading(false)
        // Ensure scroll happens after loading completes
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'auto' })
          }
        }, 150)
      }
    }
    loadMessages()
  }, [otherUserId, user?.id, user?._id])

  // Set up Socket.IO listeners for direct messages
  useEffect(() => {
    if (!otherUserId) return

    const socketInstance = getSocket()
    if (!socketInstance) return

    // Listen for typing indicators
    const handleUserTypingDirect = (data) => {
      if (data.userId === otherUserId) {
        setOtherUserTyping(data.isTyping || false)
      }
    }
    onUserTypingDirect(handleUserTypingDirect)

    // Listen for online/offline status
    const handleUserOnline = (data) => {
      if (data.userId === otherUserId) {
        setIsOtherUserOnline(true)
      }
    }
    const handleUserOffline = (data) => {
      if (data.userId === otherUserId) {
        setIsOtherUserOnline(false)
        setOtherUserTyping(false)
      }
    }
    onUserOnline(handleUserOnline)
    onUserOffline(handleUserOffline)

    // Listen for read receipts
    const handleMessageRead = (data) => {
      if (data.messageId) {
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.messageId) {
            const readBy = msg.readBy || []
            if (!readBy.some(r => String(r.userId) === String(data.userId))) {
              return {
                ...msg,
                readBy: [...readBy, { userId: data.userId, readAt: data.readAt || new Date() }]
              }
            }
          }
          return msg
        }))
      }
    }
    onMessageRead(handleMessageRead)

    // Listen for new direct messages (when we receive a message)
    const handleNewDirectMessage = (message) => {
      console.log('📬 New direct message received:', message)
      const isOwnMessage = String(message.senderId) === String(user?.id || user?._id || '')
      
      if (String(message.receiverId) === String(user?.id || user?._id || '')) {
        // This is a message for us
        setMessages(prev => {
          // Check for duplicates
          if (prev.some(m => m.id === message.id)) {
            // If message exists, update it (might be our own message coming back)
            return prev.map(m => {
              if (m.id === message.id) {
                // Update existing message, preserve replyToData if it exists
                let replyToData = m.replyToData
                if (message.replyTo && !replyToData) {
                  const repliedMsg = prev.find(msg => msg.id === message.replyTo)
                  if (repliedMsg) {
                    replyToData = {
                      id: repliedMsg.id,
                      text: repliedMsg.text,
                      sender: repliedMsg.sender,
                      senderId: repliedMsg.senderId,
                      isOwn: repliedMsg.isOwn
                    }
                  }
                }
                return {
                  ...m,
                  replyTo: message.replyTo || m.replyTo || null,
                  replyToData: replyToData,
                  readBy: message.readBy || m.readBy || [],
                  deliveredTo: message.deliveredTo || m.deliveredTo || []
                }
              }
              return m
            })
          }
          
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
            isOwn: isOwnMessage,
          timestamp: new Date(message.timestamp),
          replyTo: message.replyTo || null,
            replyToData: null, // Will be populated below if replyTo exists
          readBy: message.readBy || [],
          deliveredTo: message.deliveredTo || []
        }
        
          // Populate replyToData if this message is a reply
          if (formattedMessage.replyTo) {
            const repliedMsg = prev.find(m => m.id === formattedMessage.replyTo)
            if (repliedMsg) {
              formattedMessage.replyToData = {
                id: repliedMsg.id,
                text: repliedMsg.text,
                sender: repliedMsg.sender,
                senderId: repliedMsg.senderId,
                isOwn: repliedMsg.isOwn
              }
            }
          }
          
          return [...prev, formattedMessage].sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
          )
        })
        
        // Automatically mark as delivered when we receive it
        console.log('✅ Auto-marking received message as delivered:', message.id)
        markDirectMessageDelivered(message.id)
        
        // Update chat list
        if (onMessageSent) {
          const senderName = message.senderName || 'User'
          onMessageSent(message.senderId, senderName, null, message.text, message.timestamp, false, message.deliveredTo || [], message.readBy || [])
        }
      }
    }
    onNewDirectMessage(handleNewDirectMessage)

    // Listen for message sent confirmation
    const handleDirectMessageSent = (message) => {
      console.log('✅ Message sent confirmation received:', message)
      // Replace optimistic message with real one
      // Match by text AND replyTo to ensure we match the correct message
      setMessages(prev => {
        // First try to find by ID (if message was already updated)
        const existingIndex = prev.findIndex(m => m.id === message.id)
        if (existingIndex !== -1) {
          // Message already exists, just update it
          const newMessages = [...prev]
          newMessages[existingIndex] = {
            ...newMessages[existingIndex],
            replyTo: message.replyTo || newMessages[existingIndex].replyTo || null,
            // Preserve replyToData if it exists, otherwise try to find it
            replyToData: newMessages[existingIndex].replyToData || (message.replyTo ? prev.find(m => m.id === message.replyTo) : null) || null,
            deliveredTo: message.deliveredTo || [],
            readBy: message.readBy || []
          }
          return newMessages
        }
        
        // Find optimistic message by text and replyTo
        const optimisticIndex = prev.findIndex(msg => 
          msg.isOptimistic && 
          msg.text === message.text &&
          (msg.replyTo === message.replyTo || (!msg.replyTo && !message.replyTo))
        )
        
        if (optimisticIndex !== -1) {
          const optimisticMsg = prev[optimisticIndex]
          const newMessages = [...prev]
          
          // Preserve replyToData from optimistic message
          let replyToData = optimisticMsg.replyToData || null
          if (message.replyTo && !replyToData) {
            const repliedMsg = prev.find(m => m.id === message.replyTo)
            if (repliedMsg) {
              replyToData = {
                id: repliedMsg.id,
                text: repliedMsg.text,
                sender: repliedMsg.sender,
                senderId: repliedMsg.senderId,
                isOwn: repliedMsg.isOwn
              }
            }
          }
          
          newMessages[optimisticIndex] = {
            ...optimisticMsg,
              id: message.id,
              isOptimistic: false,
            replyTo: message.replyTo || optimisticMsg.replyTo || null,
            replyToData: replyToData,
              deliveredTo: message.deliveredTo || [],
              readBy: message.readBy || []
            }
          
          console.log('✅ Replaced optimistic direct message with real message:', message.id, 'replyTo:', message.replyTo)
          
          // Update chat list when message is confirmed
          if (onMessageSent && otherUser) {
            const userName = otherUser.profile?.displayName || otherUser.email?.split('@')[0] || 'User'
            const userAvatar = otherUser.profile?.profilePicture 
              ? (otherUser.profile.profilePicture.startsWith('/uploads/') 
                  ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${otherUser.profile.profilePicture}`
                  : otherUser.profile.profilePicture)
              : null
            onMessageSent(otherUserId, userName, userAvatar, message.text, message.timestamp, true, message.deliveredTo || [], message.readBy || [])
          }
          
          return newMessages
        }
        
        // If no optimistic message found, check if this message already exists
        const duplicateIndex = prev.findIndex(m => m.id === message.id)
        if (duplicateIndex === -1) {
          // Message doesn't exist, add it (this shouldn't happen but handle it)
          const newMessage = {
            id: message.id,
            text: message.text,
            sender: user?.profile?.displayName || user?.email?.split('@')[0] || 'You',
            senderId: user?.id || user?._id || '',
            time: new Date(message.timestamp).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            }),
            date: formatDate(new Date(message.timestamp)),
            isOwn: true,
            timestamp: new Date(message.timestamp),
            replyTo: message.replyTo || null,
            replyToData: message.replyTo ? prev.find(m => m.id === message.replyTo) : null,
            deliveredTo: message.deliveredTo || [],
            readBy: message.readBy || []
          }
          
          // Update chat list
          if (onMessageSent && otherUser) {
            const userName = otherUser.profile?.displayName || otherUser.email?.split('@')[0] || 'User'
            const userAvatar = otherUser.profile?.profilePicture 
              ? (otherUser.profile.profilePicture.startsWith('/uploads/') 
                  ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${otherUser.profile.profilePicture}`
                  : otherUser.profile.profilePicture)
              : null
            onMessageSent(otherUserId, userName, userAvatar, message.text, message.timestamp, true, message.deliveredTo || [], message.readBy || [])
          }
          
          return [...prev, newMessage].sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
          )
        }
        
        return prev
      })
    }
    onDirectMessageSent(handleDirectMessageSent)

    // Listen for message status updates (delivered/read)
    const handleMessageUpdate = (data) => {
      console.log('📬 Message status update received:', data)
      if (data.messageId) {
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.messageId && msg.isOwn) {
            if (data.status === 'delivered') {
              const deliveredTo = msg.deliveredTo || []
              const alreadyDelivered = deliveredTo.some(d => String(d.userId) === String(otherUserId))
              if (!alreadyDelivered) {
                console.log('✅ Updating message to delivered:', msg.id)
                const updatedMsg = {
                  ...msg,
                  deliveredTo: [...deliveredTo, { userId: otherUserId, deliveredAt: new Date() }]
                }
                
                // Update chat list with latest status
                if (onMessageSent && otherUser) {
                  const userName = otherUser.profile?.displayName || otherUser.email?.split('@')[0] || 'User'
                  const userAvatar = otherUser.profile?.profilePicture 
                    ? (otherUser.profile.profilePicture.startsWith('/uploads/') 
                        ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${otherUser.profile.profilePicture}`
                        : otherUser.profile.profilePicture)
                    : null
                  onMessageSent(otherUserId, userName, userAvatar, msg.text, msg.timestamp, true, updatedMsg.deliveredTo, updatedMsg.readBy || [])
                }
                
                return updatedMsg
              }
            } else if (data.status === 'read') {
              const readBy = msg.readBy || []
              const alreadyRead = readBy.some(r => String(r.userId) === String(otherUserId))
              if (!alreadyRead) {
                console.log('✅ Updating message to read:', msg.id)
                const updatedMsg = {
                  ...msg,
                  readBy: [...readBy, { userId: otherUserId, readAt: new Date() }]
                }
                
                // Update chat list with latest status
                if (onMessageSent && otherUser) {
                  const userName = otherUser.profile?.displayName || otherUser.email?.split('@')[0] || 'User'
                  const userAvatar = otherUser.profile?.profilePicture 
                    ? (otherUser.profile.profilePicture.startsWith('/uploads/') 
                        ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${otherUser.profile.profilePicture}`
                        : otherUser.profile.profilePicture)
                    : null
                  onMessageSent(otherUserId, userName, userAvatar, msg.text, msg.timestamp, true, updatedMsg.deliveredTo || [], updatedMsg.readBy)
                }
                
                return updatedMsg
              }
            }
          }
          return msg
        }))
      }
    }
    onMessageUpdate(handleMessageUpdate)

    return () => {
      if (socketInstance) {
        socketInstance.off('userTypingDirect', handleUserTypingDirect)
        socketInstance.off('userOnline', handleUserOnline)
        socketInstance.off('userOffline', handleUserOffline)
        socketInstance.off('messageRead', handleMessageRead)
        socketInstance.off('newDirectMessage', handleNewDirectMessage)
        socketInstance.off('directMessageSent', handleDirectMessageSent)
        socketInstance.off('message:update', handleMessageUpdate)
      }
    }
  }, [otherUserId, user?.id, user?._id])

  // Auto-resize textarea
  useEffect(() => {
    if (messageInputRef.current) {
      messageInputRef.current.style.height = 'auto'
      const scrollHeight = messageInputRef.current.scrollHeight
      const maxHeight = 120 // Maximum height in pixels (about 5 lines)
      messageInputRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`
    }
  }, [messageInput])

  // Handle typing indicator
  const handleInputChange = (e) => {
    const value = e.target.value
    setMessageInput(value)
    
    if (!otherUserId) return
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
    
    // If user is typing and not already marked as typing
    if (value.trim().length > 0) {
      if (!isTyping) {
      setIsTyping(true)
      emitTypingDirect(otherUserId, true)
    }
    
    // Set timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
        emitTypingDirect(otherUserId, false)
        typingTimeoutRef.current = null
      }, 2000)
    } else {
      // Input is empty, stop typing immediately
      if (isTyping) {
        setIsTyping(false)
        emitTypingDirect(otherUserId, false)
      }
    }
  }

  // Handle Enter key (send) vs Shift+Enter (new line)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  // Mark messages as read when they're visible
  useEffect(() => {
    if (!otherUserId || messages.length === 0) return
    
    // Find the last message that's not from current user
    const lastOtherMessage = [...messages].reverse().find(msg => !msg.isOwn)
    if (lastOtherMessage && lastOtherMessage.id !== lastReadMessageId) {
      // For direct messages, we need to mark as read via API
      // The backend will handle this via socket
      setLastReadMessageId(lastOtherMessage.id)
    }
  }, [messages, otherUserId, lastReadMessageId])

  const handleSendMessage = async (e) => {
    console.log('🔵 ===== handleSendMessage CALLED =====')
    e.preventDefault()
    // Trim only leading/trailing whitespace, preserve newlines in the middle
    const messageText = messageInput.trimStart().trimEnd()
    console.log('📝 Message text:', messageText, 'Other user ID:', otherUserId)
    
    console.log('🔵 handleSendMessage called', { messageText, otherUserId, isBlocked })
    
    if (!messageText || !otherUserId) {
      console.warn('⚠️ Cannot send message - missing text or otherUserId')
      return
    }

    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false)
      emitTypingDirect(otherUserId, false)
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }

    // Refresh block status before sending to ensure it's up to date
    await refreshBlockStatus()
    
    // Check if user is blocked (re-check after refresh)
    if (isBlocked) {
      console.warn('⚠️ Cannot send message - user is blocked')
      // Block message should already be set by refreshBlockStatus
      return
    }

    console.log('📝 Creating optimistic message...')
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
      replyTo: replyingTo ? replyingTo.id : null,
      replyToData: replyingTo ? replyingTo : null, // Store full reply data for rendering
      isOptimistic: true
    }

    setMessages(prev => [...prev, optimisticMessage])
    setMessageInput('')

    try {
      console.log('📤 Sending direct message via Socket.IO to:', otherUserId, 'Text:', messageText)
      // Include reply information if replying
      const replyToId = replyingTo ? replyingTo.id : null
      const sent = sendDirectMessageSocket(otherUserId, messageText, replyToId)
      if (sent) {
        console.log('✅ Message sent via Socket.IO. Waiting for confirmation...', replyToId ? `(replying to: ${replyToId})` : '')
        
        // Clear reply after sending
        if (replyingTo) {
          setReplyingTo(null)
        }
        
        // Update chat list immediately (optimistic update)
        // Status will be updated when we receive directMessageSent event
        if (onMessageSent && otherUser) {
          const userName = otherUser.profile?.displayName || otherUser.email?.split('@')[0] || 'User'
          const userAvatar = otherUser.profile?.profilePicture 
            ? (otherUser.profile.profilePicture.startsWith('/uploads/') 
                ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${otherUser.profile.profilePicture}`
                : otherUser.profile.profilePicture)
            : null
          onMessageSent(otherUserId, userName, userAvatar, messageText, new Date(), true, [], [])
        }
      } else {
        console.error('❌ Failed to send message - socket not connected')
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
          setBlockMessageWithTimeout({
          text: 'Failed to send message. Please check your connection.',
            type: 'error'
          })
      }
    } catch (error) {
      console.error('❌ ERROR sending message:', error)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
      
      // Refresh block status in case it changed
      await refreshBlockStatus()
      
      // Show professional error message
      const errorMessage = error.message || 'Error sending message. Please try again.'
      if (errorMessage.includes('blocked') || errorMessage.includes('cannot send')) {
        setBlockMessageWithTimeout({
          text: errorMessage,
          type: 'blocked'
        })
      } else {
        setBlockMessageWithTimeout({
          text: errorMessage,
          type: 'error'
        })
      }
    }
  }

  const handleClearChat = async () => {
    try {
      setClearing(true)
      const response = await clearDirectMessages(otherUserId)
      if (response.success) {
        setMessages([])
        setShowClearConfirm(false)
        
        // Update chat list immediately to show "No messages yet"
        if (onMessageSent && otherUser) {
          const userName = otherUser.profile?.displayName || otherUser.email?.split('@')[0] || 'User'
          const userAvatar = otherUser.profile?.profilePicture 
            ? (otherUser.profile.profilePicture.startsWith('/uploads/') 
                ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${otherUser.profile.profilePicture}`
                : otherUser.profile.profilePicture)
            : null
          // Pass null timestamp to indicate cleared state - this will update timestamp to current time
          onMessageSent(
            otherUserId,
            userName,
            userAvatar,
            'No messages yet',
            null, // null timestamp indicates cleared state
            false,
            [],
            []
          )
        }
      } else {
        alert('Failed to clear chat. Please try again.')
      }
    } catch (error) {
      console.error('Error clearing chat:', error)
      alert('Error clearing chat. Please try again.')
    } finally {
      setClearing(false)
    }
  }

  // Handle message hover (desktop)
  const handleMessageHover = (message) => {
    if (!isMobile) {
      setHoveredMessage(message)
    }
  }

  // Handle message unhover (desktop)
  const handleMessageUnhover = () => {
    if (!isMobile) {
      setHoveredMessage(null)
    }
  }

  // Handle message click (desktop - for double-click detection)
  const handleMessageClick = (e, message) => {
    if (isMobile) return
    
    // Prevent default browser behavior (including context menu)
    e.preventDefault()
    e.stopPropagation()
    
    // If in selection mode, toggle selection
    if (selectionMode) {
      handleToggleSelection(message.id)
      return
    }
    
    const currentTime = Date.now()
    const timeDiff = currentTime - lastClickTime.current
    
    // Check if this is a double-click (within 300ms and same message)
    if (timeDiff < 300 && lastClickedMessage.current?.id === message.id) {
      // Double-click detected - show action header
      setSelectedMessage(message)
      setShowMessageHeader(true)
      setShowActionMenu(false)
      lastClickTime.current = 0
      lastClickedMessage.current = null
    } else {
      // Single click - store for potential double-click
      lastClickTime.current = currentTime
      lastClickedMessage.current = message
      
      // Clear timer if exists
      if (doubleClickTimer.current) {
        clearTimeout(doubleClickTimer.current)
      }
      
      // If no double-click within 300ms, clear selection
      doubleClickTimer.current = setTimeout(() => {
        lastClickTime.current = 0
        lastClickedMessage.current = null
      }, 300)
    }
  }

  // Handle right-click on message (prevent default context menu)
  const handleMessageContextMenu = (e, message) => {
    e.preventDefault()
    e.stopPropagation()
    // On desktop, show action header on right-click as well
    if (!isMobile) {
      setSelectedMessage(message)
      setShowMessageHeader(true)
      setShowActionMenu(false)
    }
  }

  const handleMessageTouchStart = (e, message) => {
    const touch = e.touches ? e.touches[0] : null
    const clientX = touch ? touch.clientX : e.clientX
    const clientY = touch ? touch.clientY : e.clientY
    
    // Store swipe start position
    setSwipeStartX(clientX)
    setSwipeStartY(clientY)
    setSwipeOffset(0)
    
    // Start long-press timer (1 second for mobile)
    longPressTimer.current = setTimeout(() => {
      setSelectedMessage(message)
      
      // Calculate position for menu (near the message)
      const rect = e.currentTarget.getBoundingClientRect()
      const messagesArea = e.currentTarget.closest('.chat-messages-area')
      if (messagesArea) {
        const messagesAreaRect = messagesArea.getBoundingClientRect()
        
        if (isMobile) {
          // On mobile, show action menu with all options (1 second)
          const x = rect.left - messagesAreaRect.left + (rect.width / 2)
          const y = rect.top - messagesAreaRect.top - 60
          setQuickEmojiPosition({ x, y })
          setShowQuickEmojis(true)
        }
      }
      
      // Add haptic feedback if available (mobile)
      if (navigator.vibrate && isMobile) {
        navigator.vibrate(50)
      }
    }, 1000) // 1 second for mobile long-press
  }

  const handleMessageTouchEnd = (e) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    
    // Check if swipe was significant enough for reply (mobile only)
    // In WhatsApp, you swipe LEFT to reply (negative deltaX)
    if (swipeStartX !== null && Math.abs(swipeOffset) > 50 && isMobile && swipeOffset < 0) {
      // Swipe left detected - reply to message
      const messageElement = e.currentTarget.closest('.message')
      if (messageElement) {
        const messageId = messageElement.dataset.messageId
        const message = messages.find(m => m.id === messageId)
        if (message) {
          setReplyingTo(message)
          setShowQuickEmojis(false)
          setShowActionMenu(false)
          setSelectedMessage(null)
          // Add haptic feedback
          if (navigator.vibrate) {
            navigator.vibrate(50)
          }
          // Scroll to input area to show reply preview
          setTimeout(() => {
            const inputArea = document.querySelector('.chat-input-area')
            if (inputArea) {
              inputArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            }
          }, 100)
        }
      }
    }
    
    // Reset swipe
    setSwipeStartX(null)
    setSwipeStartY(null)
    setSwipeOffset(0)
  }

  const handleMessageTouchMove = (e) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    
    // Track swipe for reply gesture
    if (swipeStartX !== null && isMobile) {
      const touch = e.touches ? e.touches[0] : null
      const clientX = touch ? touch.clientX : e.clientX
      const deltaX = clientX - swipeStartX
      
      // In WhatsApp, you swipe LEFT to reply (negative deltaX)
      // Allow left swipe (negative deltaX) for reply
      if (deltaX < 0) {
        setSwipeOffset(Math.max(deltaX, -100)) // Cap at -100px (swipe left)
      } else {
        // Reset if swiping right
        setSwipeOffset(0)
      }
    }
  }

  // Handle reply button click
  const handleReplyClick = () => {
    if (selectedMessage) {
      setReplyingTo(selectedMessage)
      setShowActionMenu(false)
      setShowQuickEmojis(false)
      setShowMessageHeader(false)
      setSelectedMessage(null)
      // Scroll to input area to show reply preview
      setTimeout(() => {
        const inputArea = document.querySelector('.chat-input-area')
        if (inputArea) {
          inputArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }, 100)
    }
  }

  // Handle select button
  // Handle select button - enter selection mode
  const handleSelectClick = () => {
    if (selectedMessage) {
      // Enter selection mode and add this message to selected items
      setSelectionMode(true)
      setSelectedItems(new Set([selectedMessage.id]))
      setShowMessageHeader(false) // Close the action header, selection mode will show copy/delete buttons
      setSelectedMessage(null)
    }
  }
  
  // Toggle item selection in selection mode
  const handleToggleSelection = (itemId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      // Exit selection mode if no items selected
      if (newSet.size === 0) {
        setSelectionMode(false)
      }
      return newSet
    })
  }
  
  // Exit selection mode
  const handleExitSelectionMode = () => {
    setSelectionMode(false)
    setSelectedItems(new Set())
  }
  
  // Copy selected items
  const handleCopySelected = () => {
    const selectedMessages = messages.filter(msg => selectedItems.has(msg.id))
    if (selectedMessages.length === 0) return
    
    const textToCopy = selectedMessages.map(msg => msg.text).join('\n')
    navigator.clipboard.writeText(textToCopy).then(() => {
      // Show feedback
      alert(`Copied ${selectedMessages.length} message(s)`)
      handleExitSelectionMode()
    }).catch(err => {
      console.error('Failed to copy:', err)
      alert('Failed to copy messages')
    })
  }
  
  // Delete selected items for me (mark as deleted for this user only)
  const handleDeleteSelectedForMe = async () => {
    if (selectedItems.size === 0) return
    
    const selectedMessages = messages.filter(msg => selectedItems.has(msg.id))
    const currentUserId = String(user?.id || user?._id || '')
    
    try {
      // Mark messages as deleted for this user only (not permanently delete)
      const deletePromises = selectedMessages.map(msg => deleteDirectMessage(msg.id))
      await Promise.all(deletePromises)
      
      // Remove messages from local state
      const updatedMessages = messages.filter(m => !selectedItems.has(m.id))
      setMessages(updatedMessages)
      handleExitSelectionMode()
      
      // Update chat list with the most recent remaining message
      if (updatedMessages.length > 0 && onMessageSent) {
        const lastMessage = updatedMessages[updatedMessages.length - 1]
        const isOwn = String(lastMessage.senderId) === currentUserId
        const userName = otherUser?.profile?.displayName || otherUser?.email?.split('@')[0] || 'User'
        const userAvatar = otherUser?.profile?.profilePicture 
          ? (otherUser.profile.profilePicture.startsWith('/uploads/') 
              ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${otherUser.profile.profilePicture}`
              : otherUser.profile.profilePicture)
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&size=50&background=00a8ff&color=fff`
        
        onMessageSent(
          otherUserId,
          userName,
          userAvatar,
          lastMessage.text,
          lastMessage.timestamp,
          isOwn,
          lastMessage.deliveredTo || [],
          lastMessage.readBy || []
        )
      } else if (updatedMessages.length === 0 && onMessageSent) {
        // No messages left, update chat list to show "No messages yet"
        const userName = otherUser?.profile?.displayName || otherUser?.email?.split('@')[0] || 'User'
        const userAvatar = otherUser?.profile?.profilePicture 
          ? (otherUser.profile.profilePicture.startsWith('/uploads/') 
              ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${otherUser.profile.profilePicture}`
              : otherUser.profile.profilePicture)
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&size=50&background=00a8ff&color=fff`
        
        onMessageSent(
          otherUserId,
          userName,
          userAvatar,
          'No messages yet',
          null,
          false,
          [],
          []
        )
      }
    } catch (error) {
      console.error('Error deleting messages:', error)
      // Still remove from local state (optimistic update)
      const updatedMessages = messages.filter(m => !selectedItems.has(m.id))
      setMessages(updatedMessages)
      handleExitSelectionMode()
      
      // Update chat list
      if (updatedMessages.length > 0 && onMessageSent) {
        const lastMessage = updatedMessages[updatedMessages.length - 1]
        const isOwn = String(lastMessage.senderId) === currentUserId
        const userName = otherUser?.profile?.displayName || otherUser?.email?.split('@')[0] || 'User'
        const userAvatar = otherUser?.profile?.profilePicture 
          ? (otherUser.profile.profilePicture.startsWith('/uploads/') 
              ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${otherUser.profile.profilePicture}`
              : otherUser.profile.profilePicture)
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&size=50&background=00a8ff&color=fff`
        
        onMessageSent(
          otherUserId,
          userName,
          userAvatar,
          lastMessage.text,
          lastMessage.timestamp,
          isOwn,
          lastMessage.deliveredTo || [],
          lastMessage.readBy || []
        )
      } else if (updatedMessages.length === 0 && onMessageSent) {
        const userName = otherUser?.profile?.displayName || otherUser?.email?.split('@')[0] || 'User'
        const userAvatar = otherUser?.profile?.profilePicture 
          ? (otherUser.profile.profilePicture.startsWith('/uploads/') 
              ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${otherUser.profile.profilePicture}`
              : otherUser.profile.profilePicture)
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&size=50&background=00a8ff&color=fff`
        
        onMessageSent(
          otherUserId,
          userName,
          userAvatar,
          'No messages yet',
          null,
          false,
          [],
          []
        )
      }
    }
  }

  // Delete selected items for all (permanently delete from database - only own messages)
  const handleDeleteSelectedForAll = async () => {
    if (selectedItems.size === 0) return
    
    const selectedMessages = messages.filter(msg => selectedItems.has(msg.id))
    const ownMessages = selectedMessages.filter(msg => msg.isOwn)
    const currentUserId = String(user?.id || user?._id || '')
    
    if (ownMessages.length === 0) return // Should not happen, but safety check
    
    try {
      // Permanently delete own messages for everyone
      const deletePromises = ownMessages.map(msg => deleteDirectMessageForAll(msg.id))
      await Promise.all(deletePromises)
      
      // Remove messages from local state
      const updatedMessages = messages.filter(m => !selectedItems.has(m.id))
      setMessages(updatedMessages)
    handleExitSelectionMode()
      
      // Update chat list with the most recent remaining message
      if (updatedMessages.length > 0 && onMessageSent) {
        const lastMessage = updatedMessages[updatedMessages.length - 1]
        const isOwn = String(lastMessage.senderId) === currentUserId
        const userName = otherUser?.profile?.displayName || otherUser?.email?.split('@')[0] || 'User'
        const userAvatar = otherUser?.profile?.profilePicture 
          ? (otherUser.profile.profilePicture.startsWith('/uploads/') 
              ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${otherUser.profile.profilePicture}`
              : otherUser.profile.profilePicture)
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&size=50&background=00a8ff&color=fff`
        
        onMessageSent(
          otherUserId,
          userName,
          userAvatar,
          lastMessage.text,
          lastMessage.timestamp,
          isOwn,
          lastMessage.deliveredTo || [],
          lastMessage.readBy || []
        )
      } else if (updatedMessages.length === 0 && onMessageSent) {
        // No messages left, update chat list to show "No messages yet"
        const userName = otherUser?.profile?.displayName || otherUser?.email?.split('@')[0] || 'User'
        const userAvatar = otherUser?.profile?.profilePicture 
          ? (otherUser.profile.profilePicture.startsWith('/uploads/') 
              ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${otherUser.profile.profilePicture}`
              : otherUser.profile.profilePicture)
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&size=50&background=00a8ff&color=fff`
        
        onMessageSent(
          otherUserId,
          userName,
          userAvatar,
          'No messages yet',
          null,
          false,
          [],
          []
        )
      }
    } catch (error) {
      console.error('Error deleting messages for all:', error)
      // Still remove from local state (optimistic update)
      const updatedMessages = messages.filter(m => !selectedItems.has(m.id))
      setMessages(updatedMessages)
      handleExitSelectionMode()
      
      // Update chat list
      if (updatedMessages.length > 0 && onMessageSent) {
        const lastMessage = updatedMessages[updatedMessages.length - 1]
        const isOwn = String(lastMessage.senderId) === currentUserId
        const userName = otherUser?.profile?.displayName || otherUser?.email?.split('@')[0] || 'User'
        const userAvatar = otherUser?.profile?.profilePicture 
          ? (otherUser.profile.profilePicture.startsWith('/uploads/') 
              ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${otherUser.profile.profilePicture}`
              : otherUser.profile.profilePicture)
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&size=50&background=00a8ff&color=fff`
        
        onMessageSent(
          otherUserId,
          userName,
          userAvatar,
          lastMessage.text,
          lastMessage.timestamp,
          isOwn,
          lastMessage.deliveredTo || [],
          lastMessage.readBy || []
        )
      } else if (updatedMessages.length === 0 && onMessageSent) {
        const userName = otherUser?.profile?.displayName || otherUser?.email?.split('@')[0] || 'User'
        const userAvatar = otherUser?.profile?.profilePicture 
          ? (otherUser.profile.profilePicture.startsWith('/uploads/') 
              ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${otherUser.profile.profilePicture}`
              : otherUser.profile.profilePicture)
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&size=50&background=00a8ff&color=fff`
        
        onMessageSent(
          otherUserId,
          userName,
          userAvatar,
          'No messages yet',
          null,
          false,
          [],
          []
        )
      }
    }
  }

  // Cancel reply
  const handleCancelReply = () => {
    setReplyingTo(null)
  }

  // Handle copy message
  const handleCopyMessage = () => {
    if (selectedMessage) {
      navigator.clipboard.writeText(selectedMessage.text).then(() => {
        setShowActionMenu(false)
        setShowQuickEmojis(false)
        setShowMessageHeader(false)
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

  // Handle delete for me
  const handleDeleteForMe = () => {
    if (selectedMessage) {
      setShowDeleteConfirm(true)
      setDeleteForAll(false)
      setShowActionMenu(false)
      setShowQuickEmojis(false)
      setShowMessageHeader(false)
    }
  }

  // Handle delete for all
  const handleDeleteForAll = () => {
    if (selectedMessage) {
      setShowDeleteConfirm(true)
      setDeleteForAll(true)
      setShowActionMenu(false)
      setShowQuickEmojis(false)
      setShowMessageHeader(false)
    }
  }

  // Confirm and execute delete
  const handleConfirmDelete = async () => {
    if (!selectedMessage) return

    try {
      setDeleting(true);
      // Use the appropriate endpoint based on deleteForAll flag
      const response = deleteForAll 
        ? await deleteDirectMessageForAll(selectedMessage.id)
        : await deleteDirectMessage(selectedMessage.id);
      
      if (response.success) {
        // Remove message from local state
        const updatedMessages = messages.filter(m => m.id !== selectedMessage.id);
        setMessages(updatedMessages);
        setShowDeleteConfirm(false);
        setShowMessageHeader(false);
        setSelectedMessage(null);
        setDeleteForAll(false);
        
        // Update chat list - find the previous message to update last message
        const currentUserId = String(user?.id || user?._id || '');
        
        if (updatedMessages.length > 0) {
          // Get the most recent remaining message
          const lastMessage = updatedMessages[updatedMessages.length - 1];
          const isOwn = String(lastMessage.senderId) === currentUserId;
          
          // Update chat list with the previous message
          if (onMessageSent) {
            const userName = otherUser?.profile?.displayName || otherUser?.email?.split('@')[0] || 'User';
            const userAvatar = otherUser?.profile?.profilePicture 
              ? (otherUser.profile.profilePicture.startsWith('/uploads/') 
                  ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${otherUser.profile.profilePicture}`
                  : otherUser.profile.profilePicture)
              : `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&size=50&background=00a8ff&color=fff`;
            
            onMessageSent(
              otherUserId,
              userName,
              userAvatar,
              lastMessage.text,
              lastMessage.timestamp,
              isOwn,
              lastMessage.deliveredTo || [],
              lastMessage.readBy || []
            );
          }
        } else {
          // No messages left, update chat list to show "No messages yet"
          if (onMessageSent) {
            const userName = otherUser?.profile?.displayName || otherUser?.email?.split('@')[0] || 'User';
            const userAvatar = otherUser?.profile?.profilePicture 
              ? (otherUser.profile.profilePicture.startsWith('/uploads/') 
                  ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${otherUser.profile.profilePicture}`
                  : otherUser.profile.profilePicture)
              : `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&size=50&background=00a8ff&color=fff`;
            
            onMessageSent(
              otherUserId,
              userName,
              userAvatar,
              'No messages yet',
              null,
              false,
              [],
              []
            );
          }
        }
      } else {
        alert(response.message || 'Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting direct message:', error);
      alert('Error deleting message. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  // Check if message is from current user
  const currentUserId = String(user?.id || user?._id || '')
  const isOwnMessage = selectedMessage && String(selectedMessage.senderId) === currentUserId

  // Prevent click propagation on action header
  const handleActionHeaderClick = (e) => {
    e.stopPropagation()
  }

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showActionMenu && actionMenuRef.current && !actionMenuRef.current.contains(e.target) && !e.target.closest('.message-content') && !e.target.closest('.message-action-header')) {
        setShowActionMenu(false)
        setSelectedMessage(null)
      }
      // Close message header when clicking outside (but not on the header itself, messages, or message bubbles)
      if (showMessageHeader && !e.target.closest('.message-action-header') && !e.target.closest('.message-content') && !e.target.closest('.message') && !e.target.closest('.action-header-btn')) {
        setShowMessageHeader(false)
        setSelectedMessage(null)
      }
      // Close mobile action menu when clicking outside
      if (showQuickEmojis && quickEmojiRef.current && !quickEmojiRef.current.contains(e.target) && !e.target.closest('.message-content')) {
        setShowQuickEmojis(false)
        setSelectedMessage(null)
      }
      // Close emoji picker when clicking outside
      if (showEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(e.target) && !e.target.closest('.emoji-picker-btn')) {
        setShowEmojiPicker(false)
      }
    }
    // Add a small delay to prevent immediate closing on double-click
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true)
      document.addEventListener('touchstart', handleClickOutside, true)
    }, 200)
    
    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleClickOutside, true)
      document.removeEventListener('touchstart', handleClickOutside, true)
    }
  }, [showActionMenu, showEmojiPicker, showMessageHeader, showQuickEmojis])

  // Auto-scroll to latest message when messages change or loading completes
  useEffect(() => {
    if (!loading && messages.length > 0) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' })
        }
      }, 50)
    }
  }, [messages, loading])

  // Early return if otherUserId is missing
  if (!otherUserId) {
    console.error('DirectChatView: otherUserId is required but missing')
    return (
      <div className="live-chat-view">
        <div className="chat-header-bar">
          <button className="chat-header-back-btn" onClick={onBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div className="chat-messages-area">
          <div className="no-messages">Error: User ID is missing. Please go back and try again.</div>
        </div>
      </div>
    )
  }

  const displayName = otherUser?.profile?.displayName || otherUser?.email?.split('@')[0] || 'User'
  const displayAvatar = otherUser?.profile?.profilePicture 
    ? (otherUser.profile.profilePicture.startsWith('/uploads/') 
        ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${otherUser.profile.profilePicture}`
        : otherUser.profile.profilePicture)
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&size=50&background=00a8ff&color=fff`

  // Format last seen time for display
  const formatLastSeen = (lastSeenDate) => {
    if (!lastSeenDate) return ''
    
    const now = new Date()
    const lastSeen = new Date(lastSeenDate)
    const diffMs = now - lastSeen
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Last seen just now'
    if (diffMins < 60) return `Last seen ${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `Last seen ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays === 1) return 'Last seen yesterday'
    if (diffDays < 7) return `Last seen ${diffDays} days ago`
    
    // For older dates, show actual date
    return `Last seen ${lastSeen.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: lastSeen.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })}`
  }

  return (
    <div className="live-chat-view">
      {/* Selection Mode Bar - Always visible when in selection mode */}
      {selectionMode && (() => {
        // Calculate selection type
        const selectedMessages = messages.filter(msg => selectedItems.has(msg.id))
        const ownMessages = selectedMessages.filter(msg => msg.isOwn)
        const otherMessages = selectedMessages.filter(msg => !msg.isOwn)
        const hasOwnMessages = ownMessages.length > 0
        const hasOtherMessages = otherMessages.length > 0
        const isOnlyOwn = hasOwnMessages && !hasOtherMessages
        const isOnlyOthers = !hasOwnMessages && hasOtherMessages
        const isHybrid = hasOwnMessages && hasOtherMessages
        
        return (
        <div className="selection-mode-bar">
          <div className="selection-mode-info">
            <span>{selectedItems.size} selected</span>
          </div>
          <div className="selection-mode-actions">
            <button 
              className="selection-mode-btn"
              onClick={handleCopySelected}
              title="Copy"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copy</span>
            </button>
              
            {/* Delete buttons based on selection type */}
            {isOnlyOwn && (
              <>
                <button 
                  className="selection-mode-btn"
                  onClick={handleDeleteSelectedForMe}
                  title="Delete for me"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  <span>Delete for me</span>
                </button>
                <button 
                  className="selection-mode-btn"
                  onClick={handleDeleteSelectedForAll}
                  title="Delete for all"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  <span>Delete for all</span>
                </button>
              </>
            )}
            
            {(isOnlyOthers || isHybrid) && (
              <button 
                className="selection-mode-btn"
                onClick={handleDeleteSelected}
                title="Delete for me"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>Delete for me</span>
              </button>
            )}
            
            <button 
              className="selection-mode-btn"
              onClick={handleExitSelectionMode}
              title="Cancel"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              <span>Cancel</span>
            </button>
          </div>
        </div>
        )
      })()}
      {/* Message Action Header (WhatsApp-style) */}
      {showMessageHeader && selectedMessage && !selectionMode && (
        <div className="message-action-header" onClick={handleActionHeaderClick} onMouseDown={(e) => e.stopPropagation()}>
          <button 
            className="action-header-btn"
            onClick={handleReplyClick}
            title="Reply"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 10 4 15 9 20"></polyline>
              <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
            </svg>
          </button>
          <button 
            className="action-header-btn"
            onClick={handleCopyMessage}
            title="Copy"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          {isOwnMessage && (
            <button 
              className="action-header-btn"
              onClick={handleDeleteForMe}
              title="Delete for me"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          )}
          <button 
            className="action-header-btn"
            onClick={(e) => {
              e.stopPropagation()
              handleSelectClick()
            }}
            title="Select"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 11 12 14 22 4"></polyline>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
          </button>
          <button 
            className="action-header-btn action-header-close"
            onClick={() => {
              setShowMessageHeader(false)
              setSelectedMessage(null)
            }}
            title="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}
      <div className="chat-header-bar">
        <button className="chat-header-back-btn" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div 
          className="chat-header-avatar" 
          onClick={() => onViewProfile && onViewProfile(otherUserId)}
          style={{ cursor: 'pointer' }}
        >
          <img src={displayAvatar} alt={displayName} />
        </div>
        <div className="chat-header-info" style={{ flex: 1 }}>
          <div className="chat-header-name-row">
            <h3>{displayName}</h3>
          </div>
          <span className={`chat-status ${otherUserTyping ? 'typing' : ''}`}>
            {otherUserTyping ? (
              <>
                <span className="typing-dots">
                  <span>.</span><span>.</span><span>.</span>
                </span>
                typing...
              </>
            ) : (
              isOtherUserOnline 
                ? 'Online' 
                : (otherUserLastSeen ? formatLastSeen(otherUserLastSeen) : '')
            )}
          </span>
        </div>
        <button 
          className="clear-chat-btn"
          onClick={() => setShowClearConfirm(true)}
          title="Clear Chat"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
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
                  <div 
                    className={`message ${message.isOwn ? 'own-message' : 'other-message'} ${selectedMessage?.id === message.id ? 'selected-message' : ''} ${hoveredMessage?.id === message.id ? 'hovered-message' : ''} ${selectionMode && selectedItems.has(message.id) ? 'selection-selected' : ''} ${selectionMode ? 'selection-mode' : ''}`}
                    data-message-id={message.id}
                    style={{ position: 'relative' }}
                    onMouseEnter={() => !selectionMode && handleMessageHover(message)}
                    onMouseLeave={() => !selectionMode && handleMessageUnhover()}
                    onClick={(e) => handleMessageClick(e, message)}
                    onContextMenu={(e) => {
                      if (!selectionMode) {
                        e.preventDefault()
                        e.stopPropagation()
                      }
                    }}
                  >
                    {selectionMode && (
                      <div className="message-selection-checkbox">
                        <input 
                          type="checkbox" 
                          checked={selectedItems.has(message.id)}
                          onChange={() => handleToggleSelection(message.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}
                    {/* Reply indicator when swiping left (mobile) */}
                    {isMobile && swipeOffset < -20 && (
                      <div 
                        className="message-swipe-reply-indicator"
                        style={{ 
                          opacity: Math.min(Math.abs(swipeOffset) / 100, 1),
                          transform: `translateX(${swipeOffset + 60}px)`
                        }}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 10 4 15 9 20"></polyline>
                          <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
                        </svg>
                      </div>
                    )}
                    <div 
                      className={`message-content ${swipeOffset < 0 ? 'swiping' : ''}`}
                      style={swipeOffset < 0 ? { transform: `translateX(${swipeOffset}px)` } : {}}
                      onTouchStart={(e) => handleMessageTouchStart(e, message)}
                      onTouchEnd={handleMessageTouchEnd}
                      onTouchMove={handleMessageTouchMove}
                      onContextMenu={(e) => {
                        if (!selectionMode) {
                          e.preventDefault()
                          e.stopPropagation()
                        }
                      }}
                    >
                      {/* Reply Information */}
                      {message.replyTo && (() => {
                        // First try to use stored reply data (from optimistic message)
                        let repliedMessage = message.replyToData
                        
                        // If not available, try to find it in messages array
                        if (!repliedMessage) {
                          repliedMessage = messages.find(m => m.id === message.replyTo)
                        }
                        
                        if (repliedMessage) {
                          return (
                            <div className="message-reply-info">
                              <div className="message-reply-line"></div>
                              <div className="message-reply-content">
                                <span className="message-reply-name">
                                  {repliedMessage.isOwn ? 'You' : displayName}
                                </span>
                                <span className="message-reply-text">{repliedMessage.text}</span>
                              </div>
                            </div>
                          )
                        }
                        return null
                      })()}
                      <p>{message.text}</p>
                      <div className="message-footer">
                        <span className="message-time">{message.time}</span>
                        {message.isOwn && (
                          <span className={`message-status ${(() => {
                            const readBy = message.readBy || []
                            const deliveredTo = message.deliveredTo || []
                            const isRead = readBy.some(r => String(r.userId) === String(otherUserId))
                            const isDelivered = deliveredTo.some(d => String(d.userId) === String(otherUserId))
                            return isRead ? 'read' : isDelivered ? 'delivered' : 'sent'
                          })()}`}>
                            {(() => {
                              const readBy = message.readBy || []
                              const deliveredTo = message.deliveredTo || []
                              const isRead = readBy.some(r => String(r.userId) === String(otherUserId))
                              const isDelivered = deliveredTo.some(d => String(d.userId) === String(otherUserId))
                              
                              if (isRead) {
                                // Blue double checkmark (read)
                                return (
                                  <svg width="16" height="16" viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" fill="#4FC3F7"/>
                                  </svg>
                                )
                              } else if (isDelivered) {
                                // Gray double checkmark (delivered)
                                return (
                                  <svg width="16" height="16" viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" fill="#8696A0"/>
                                  </svg>
                                )
                              } else {
                                // Gray single checkmark (sent)
                                return (
                                  <svg width="16" height="16" viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51z" fill="#8696A0"/>
                                  </svg>
                                )
                              }
                            })()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Fragment>
              )
            })
          })()
        )}
        <div ref={messagesEndRef}></div>
      </div>

      {/* Mobile Action Menu (Long-press) */}
      {showQuickEmojis && selectedMessage && isMobile && (
        <div 
          ref={quickEmojiRef}
          className="mobile-action-menu"
          style={{
            left: `${quickEmojiPosition.x}px`,
            top: `${quickEmojiPosition.y}px`,
          }}
        >
          <button 
            className="mobile-action-item"
            onClick={handleReplyClick}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 10 4 15 9 20"></polyline>
              <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
            </svg>
            <span>Reply</span>
          </button>
          <button 
            className="mobile-action-item"
            onClick={handleCopyMessage}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copy</span>
          </button>
          {isOwnMessage && (
            <button 
              className="mobile-action-item"
              onClick={handleDeleteForMe}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>Delete for me</span>
            </button>
          )}
          <button 
            className="mobile-action-item"
            onClick={handleSelectClick}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 11 12 14 22 4"></polyline>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
            <span>Select</span>
          </button>
          <button
            className="mobile-action-item mobile-action-close"
            onClick={() => {
              setShowQuickEmojis(false)
              setSelectedMessage(null)
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            <span>Close</span>
          </button>
        </div>
      )}

      {/* WhatsApp-style Action Menu Popup (Desktop) */}
      {showActionMenu && selectedMessage && !isMobile && (
        <div 
          ref={actionMenuRef}
          className="message-action-menu"
          style={{
            left: `${actionMenuPosition.x}px`,
            top: `${actionMenuPosition.y}px`,
          }}
        >
          <button 
            className="action-menu-item" 
            onClick={() => {
              setShowEmojiPicker(true)
              setShowActionMenu(false)
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
              <line x1="9" y1="9" x2="9.01" y2="9"></line>
              <line x1="15" y1="9" x2="15.01" y2="9"></line>
            </svg>
            <span>Emoji</span>
          </button>
          <button 
            className="action-menu-item" 
            onClick={handleReplyClick}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 10 4 15 9 20"></polyline>
              <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
            </svg>
            <span>Reply</span>
          </button>
          <button 
            className="action-menu-item" 
            onClick={handleCopyMessage}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copy</span>
          </button>
          {isOwnMessage && (
            <button 
              className="action-menu-item" 
              onClick={handleDeleteForMe}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>Delete</span>
            </button>
          )}
          <button 
            className="action-menu-item" 
            onClick={(e) => {
              e.stopPropagation()
              handleSelectClick()
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 11 12 14 22 4"></polyline>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
            <span>Select</span>
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedMessage && (
        <div className="modal-overlay" onClick={() => {
          setShowDeleteConfirm(false)
          setDeleteForAll(false)
        }}>
          <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Message</h3>
              <button className="modal-close-btn" onClick={() => {
                setShowDeleteConfirm(false)
                setDeleteForAll(false)
              }}>×</button>
            </div>
            <div className="modal-content">
              <p className="modal-description">
                Are you sure you want to delete this message? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="modal-cancel-btn"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteForAll(false)
                }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button 
                className="modal-confirm-btn"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reply Preview */}
      {replyingTo && (
        <div className="reply-preview">
          <div className="reply-preview-content">
            <div className="reply-preview-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 10 4 15 9 20"></polyline>
                <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
              </svg>
              <span className="reply-preview-name">
                {replyingTo.isOwn ? 'You' : displayName}
              </span>
            </div>
            <div className="reply-preview-text">{replyingTo.text}</div>
          </div>
          <button className="reply-preview-close" onClick={handleCancelReply}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}

      {blockMessage && (
        <div className={`block-message ${blockMessage.type === 'blocked' ? 'block-message-blocked' : 'block-message-error'}`}>
          <span className="block-message-icon">⚠️</span>
          <span className="block-message-text">{blockMessage.text}</span>
        </div>
      )}
      <form className="chat-input-area" onSubmit={handleSendMessage}>
        <button
          type="button"
          className="emoji-picker-btn"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          disabled={isBlocked}
          title="Add emoji"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
            <line x1="9" y1="9" x2="9.01" y2="9"></line>
            <line x1="15" y1="9" x2="15.01" y2="9"></line>
          </svg>
        </button>
        <textarea
          ref={messageInputRef}
          className="chat-input"
          placeholder="Type a message"
          value={messageInput}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={isBlocked}
          rows={1}
        />
        <button type="submit" className="send-btn" disabled={isBlocked}>Send</button>
        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="emoji-picker-container">
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              autoFocusSearch={false}
              skinTonesDisabled={true}
              previewConfig={{ showPreview: false }}
              width="100%"
              height="350px"
            />
          </div>
        )}
      </form>

      {/* Clear Chat Confirmation Modal */}
      {showClearConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Clear Chat</h3>
              <button className="modal-close-btn" onClick={() => setShowClearConfirm(false)}>×</button>
            </div>
            <div className="modal-content">
              <p className="modal-description">Are you sure you want to delete all chat messages with {displayName}? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button 
                className="modal-cancel-btn"
                onClick={() => setShowClearConfirm(false)}
                disabled={clearing}
              >
                Cancel
              </button>
              <button 
                className="modal-confirm-btn"
                onClick={handleClearChat}
                disabled={clearing}
              >
                {clearing ? 'Clearing...' : 'Clear Chat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Student Profile View Component - Redesigned
const StudentProfileView = ({ user, verificationStatus, isOwnProfile = true, currentUser, onBack, onVerificationUpdate, onProfileUpdate, onLeaveCollege, onMessage, onViewDirectChat, onViewCollegeProfile }) => {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [pictureError, setPictureError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockLoading, setBlockLoading] = useState(false)
  const [commonColleges, setCommonColleges] = useState([])
  const [loadingCommonColleges, setLoadingCommonColleges] = useState(false)
  const [editForm, setEditForm] = useState({
    displayName: '',
    bio: ''
  })
  const fileInputRef = useRef(null)
  const profilePictureInputRef = useRef(null)

  // Initialize edit form when component mounts or user changes
  useEffect(() => {
    try {
      if (user?.profile) {
        setEditForm({
          displayName: user.profile.displayName || '',
          bio: user.profile.bio || ''
        })
      } else if (user) {
        setEditForm({
          displayName: user.email?.split('@')[0] || '',
          bio: ''
        })
      }
    } catch (error) {
      console.error('Error initializing edit form:', error)
    }
  }, [user])

  // Check block status if viewing someone else's profile
  useEffect(() => {
    const checkBlock = async () => {
      const userId = user?.id || user?._id
      const currentUserId = currentUser?.id || currentUser?._id
      if (!isOwnProfile && userId && currentUserId) {
        try {
          const response = await checkBlockStatus(userId)
          if (response.success) {
            setIsBlocked(response.blockedByMe || false)
          }
        } catch (error) {
          console.error('Error checking block status:', error)
        }
      }
    }
    checkBlock()
  }, [isOwnProfile, user?.id, user?._id, currentUser?.id, currentUser?._id])

  // Load common colleges when viewing someone else's profile
  useEffect(() => {
    const loadCommonColleges = async () => {
      if (isOwnProfile || !user?.id || !currentUser?.id) {
        setCommonColleges([])
        return
      }

      try {
        setLoadingCommonColleges(true)
        const viewedUserId = String(user?.id || user?._id)
        const currentUserId = String(currentUser?.id || currentUser?._id)

        // Fetch both users' colleges in parallel
        const [viewedUserCollegesResponse, currentUserCollegesResponse] = await Promise.all([
          getUserColleges(viewedUserId).catch(err => {
            console.error('Error fetching viewed user colleges:', err)
            return { success: false, colleges: [] }
          }),
          getUserColleges(currentUserId).catch(err => {
            console.error('Error fetching current user colleges:', err)
            return { success: false, colleges: [] }
          })
        ])

        console.log('📊 API Responses:', {
          viewedUserResponse: {
            success: viewedUserCollegesResponse.success,
            collegesCount: viewedUserCollegesResponse.colleges?.length || 0
          },
          currentUserResponse: {
            success: currentUserCollegesResponse.success,
            collegesCount: currentUserCollegesResponse.colleges?.length || 0
          }
        })

        if (viewedUserCollegesResponse.success && currentUserCollegesResponse.success) {
          const viewedColleges = viewedUserCollegesResponse.colleges || []
          const currentColleges = currentUserCollegesResponse.colleges || []

          console.log('🔍 Common Groups Debug:', {
            viewedUserId: viewedUserId,
            currentUserId: currentUserId,
            viewedColleges: viewedColleges.length,
            currentColleges: currentColleges.length,
            viewedCollegesList: viewedColleges.map(c => ({ 
              id: c.id, 
              name: c.name, 
              aisheCode: c.aisheCode, 
              identifier: c.identifier 
            })),
            currentCollegesList: currentColleges.map(c => ({ 
              id: c.id, 
              name: c.name, 
              aisheCode: c.aisheCode, 
              identifier: c.identifier 
            }))
          })

          // Find common colleges by comparing both aisheCode and name
          const common = viewedColleges.filter(viewedCollege => {
            const isCommon = currentColleges.some(currentCollege => {
              // Match by ID if both have it (most reliable)
              if (viewedCollege.id && currentCollege.id) {
                const match = String(viewedCollege.id).trim() === String(currentCollege.id).trim()
                if (match) return true
              }
              
              // Use identifier if available (normalized aisheCode or name)
              if (viewedCollege.identifier && currentCollege.identifier) {
                const match = String(viewedCollege.identifier).trim().toLowerCase() === String(currentCollege.identifier).trim().toLowerCase()
                if (match) return true
              }
              
              // Match by aisheCode if both have it (case-insensitive)
              if (viewedCollege.aisheCode && currentCollege.aisheCode) {
                const match = String(viewedCollege.aisheCode).trim().toLowerCase() === String(currentCollege.aisheCode).trim().toLowerCase()
                if (match) return true
              }
              
              // Match by name if both have it (case-insensitive)
              if (viewedCollege.name && currentCollege.name) {
                const match = String(viewedCollege.name).trim().toLowerCase() === String(currentCollege.name).trim().toLowerCase()
                if (match) return true
              }
              
              return false
            })
            
            if (isCommon) {
              console.log(`✅ Found common college: ${viewedCollege.name} (${viewedCollege.aisheCode || 'no code'})`)
            }
            
            return isCommon
          })

          console.log('✅ Common Groups Found:', common.length, common.map(c => c.name))
          setCommonColleges(common)
        }
      } catch (error) {
        console.error('Error loading common colleges:', error)
        setCommonColleges([])
      } finally {
        setLoadingCommonColleges(false)
      }
    }

    loadCommonColleges()
  }, [isOwnProfile, user?.id, user?._id, currentUser?.id, currentUser?._id])

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
      setUploadError('Username is required')
      return
    }

    try {
      setUploading(true)
      setUploadError(null)

      const response = await updateProfile({
        displayName: editForm.displayName.trim(),
        bio: editForm.bio.trim() || undefined,
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

  const handleBlockUser = async () => {
    const userId = user?.id || user?._id
    if (!userId) return
    
    try {
      setBlockLoading(true)
      const response = await blockUser(userId)
      if (response.success) {
        setIsBlocked(true)
      }
    } catch (error) {
      console.error('Error blocking user:', error)
    } finally {
      setBlockLoading(false)
    }
  }

  const handleUnblockUser = async () => {
    const userId = user?.id || user?._id
    if (!userId) return
    
    try {
      setBlockLoading(true)
      const response = await unblockUser(userId)
      if (response.success) {
        setIsBlocked(false)
        // Dispatch event to notify DirectChatView to refresh block status
        window.dispatchEvent(new CustomEvent('blockStatusChanged'))
      }
    } catch (error) {
      console.error('Error unblocking user:', error)
    } finally {
      setBlockLoading(false)
    }
  }

  const handleMessageClick = () => {
    if (isBlocked) {
      alert('You have blocked this user. Unblock them to send messages.')
      return
    }
    const userId = user?.id || user?._id
    if (userId && onMessage) {
      onMessage(userId)
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
        setUploadError(null)
        if (onVerificationUpdate) {
          onVerificationUpdate()
        }
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        // Don't close modal automatically - let user click Close button
      } else {
        setUploadError(response.message || 'Failed to upload college ID')
        setUploadSuccess(false)
      }
    } catch (error) {
      console.error('Error uploading college ID:', error)
      setUploadError('Failed to upload college ID. Please try again.')
    } finally {
      setUploading(false)
    }
  }


  // Safety check: if user is not loaded yet, show loading state
  if (!user) {
    console.warn('⚠️ StudentProfileView: user is not loaded')
    return (
      <div className="student-profile-view-new">
        <div className="view-header">
          <button className="back-btn" onClick={onBack}>←</button>
          <h2>My Profile</h2>
        </div>
        <div className="student-profile-content-new" style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  // Debug: Log profile view state
  console.log('StudentProfileView render:', {
    isOwnProfile,
    hasUser: !!user,
    userId: user?.id || user?._id,
    currentUserId: currentUser?.id || currentUser?._id,
    shouldShowButtons: !isOwnProfile && !!user
  })

  // Safe variable assignments with defaults
  const isVerified = isOwnProfile 
    ? (verificationStatus?.status === 'verified' || false)
    : (user?.profile?.verification?.status === 'verified' || false)
  const isPending = isOwnProfile 
    ? (verificationStatus?.status === 'pending' || false)
    : (user?.profile?.verification?.status === 'pending' || false)
  const isNotSubmitted = isOwnProfile
    ? (!verificationStatus || verificationStatus.status === 'not_submitted' || false)
    : (!user?.profile?.verification || user?.profile?.verification?.status === 'not_submitted' || false)
  const collegeName = user?.profile?.college?.name || ''

  return (
    <div className="student-profile-view-new">
      <div className="view-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <h2>{isOwnProfile ? 'My Profile' : 'Profile'}</h2>
      </div>
      <div className="student-profile-content-new">
        {/* Profile Photo and Get Verified Button */}
        <div className="profile-photo-section-new">
          <div className="profile-photo-container">
            <div className="profile-photo-large-new">
              <img src={getUserAvatar()} alt="Profile" />
              {isOwnProfile && (
                <div className="profile-photo-overlay-new">
                  <input
                    ref={profilePictureInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureSelect}
                    style={{ display: 'none' }}
                    id="profile-picture-upload"
                  />
                  <button 
                    className="photo-upload-btn-new"
                    onClick={() => profilePictureInputRef.current?.click()}
                    disabled={uploadingPicture}
                    title="Change Profile Photo"
                  >
                    {uploadingPicture ? '⏳' : '📷'}
                  </button>
                </div>
              )}
            </div>
            {isOwnProfile && !isVerified && (
              <button 
                className="get-verified-btn"
                onClick={() => setShowVerificationModal(true)}
              >
                get verified
              </button>
            )}
          </div>
          {pictureError && (
            <p className="upload-error-small">{pictureError}</p>
          )}
        </div>

        {/* Username */}
        <div className="profile-username-section">
          {isEditing ? (
            <input
              type="text"
              className="username-input"
              value={editForm.displayName}
              onChange={(e) => setEditForm({...editForm, displayName: e.target.value})}
              placeholder="Username"
            />
          ) : (
            <h1 className="profile-username">
              {user?.profile?.displayName || user?.email?.split('@')[0] || 'User'}
            </h1>
          )}
        </div>

        {/* Email - Only shown to own profile */}
        {isOwnProfile && (
          <div className="profile-email-section">
            <p className="profile-email-new">{user?.email}</p>
          </div>
        )}

        {/* Bio Section - Only show if own profile OR if other user has a bio */}
        {(isOwnProfile || user?.profile?.bio) && (
          <div className="profile-bio-section-new">
            <label className="bio-label">bio</label>
            {isEditing ? (
              <div className="bio-edit-form-new">
                <textarea
                  className="bio-input-new"
                  placeholder="Tell us about yourself..."
                  value={editForm.bio}
                  onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                  maxLength={500}
                  rows={4}
                />
                <div className="bio-char-count-new">{editForm.bio.length}/500</div>
                <button 
                  className="save-bio-btn"
                  onClick={handleEditProfile}
                  disabled={uploading || !editForm.displayName.trim()}
                >
                  {uploading ? 'Saving...' : 'save'}
                </button>
              </div>
            ) : (
              <div className="profile-bio-new">
                {user?.profile?.bio ? (
                  <p>{user.profile.bio}</p>
                ) : (
                  // Only show "No bio yet." for own profile
                  isOwnProfile && (
                    <p className="bio-placeholder-new">No bio yet.</p>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons - Only shown when viewing someone else's profile */}
        {(() => {
          const shouldShow = !isOwnProfile && user
          if (shouldShow) {
            console.log('✅ Rendering action buttons - isOwnProfile:', isOwnProfile, 'hasUser:', !!user)
          } else {
            console.log('❌ NOT rendering action buttons - isOwnProfile:', isOwnProfile, 'hasUser:', !!user)
          }
          return shouldShow ? (
            <div className="profile-action-buttons-new" style={{ display: 'flex', visibility: 'visible' }}>
              <button 
                className="block-btn"
                onClick={isBlocked ? handleUnblockUser : handleBlockUser}
                disabled={blockLoading}
              >
                {blockLoading ? '...' : (isBlocked ? 'Unblock' : 'block')}
              </button>
              <button 
                className="message-btn"
                onClick={handleMessageClick}
                disabled={isBlocked}
              >
                message
              </button>
            </div>
          ) : null
        })()}

        {/* Common Groups - Only shown when viewing someone else's profile */}
        {!isOwnProfile && (
          <div className="common-groups-section">
            <h3 className="common-groups-title">Common Groups</h3>
            {loadingCommonColleges ? (
              <div className="common-groups-loading">Loading...</div>
            ) : commonColleges.length > 0 ? (
              <div className="common-groups-list">
                {commonColleges.map((college, index) => (
                  <div 
                    key={college.aisheCode || college.name || index}
                    className="common-group-item"
                    onClick={() => {
                      // Navigate to college profile
                      if (onViewCollegeProfile) {
                        onViewCollegeProfile(college)
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <img 
                      src={college.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(college.name || 'College')}&size=40&background=00a8ff&color=fff`}
                      alt={college.name}
                      className="common-group-logo"
                    />
                    <div className="common-group-info">
                      <div className="common-group-name">{college.name}</div>
                      {college.district && (
                        <div className="common-group-location">{college.district}, {college.state}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="common-groups-empty">No common groups</div>
            )}
          </div>
        )}

        {/* Edit Profile Link - Only shown to own profile */}
        {isOwnProfile && !isEditing && (
          <div className="edit-profile-link-section">
            <button 
              className="edit-profile-link"
              onClick={() => setIsEditing(true)}
            >
              edit profile
            </button>
          </div>
        )}

        {/* Edit Form Actions */}
        {isEditing && (
          <div className="edit-form-actions-new">
            <button 
              className="cancel-edit-btn"
              onClick={() => {
                setIsEditing(false)
                setUploadError(null)
                if (user?.profile) {
                  setEditForm({
                    displayName: user.profile.displayName || '',
                    bio: user.profile.bio || ''
                  })
                }
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {uploadError && (
          <p className="upload-error-new">{uploadError}</p>
        )}
      </div>

      {/* Get Verified Modal */}
      {showVerificationModal && (
        <div className="modal-overlay" onClick={() => setShowVerificationModal(false)}>
          <div className="verification-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Get Verified</h3>
              <button className="modal-close-btn" onClick={() => setShowVerificationModal(false)}>×</button>
            </div>
            <div className="modal-content">
              <p className="modal-description">Upload your college ID card to get verified.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="college-id-upload-modal"
              />
              <button 
                className="upload-id-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload ID Card'}
              </button>
              {uploadError && (
                <p className="upload-error-modal">{uploadError}</p>
              )}
              {uploadSuccess && (
                <p className="upload-success-modal">College ID uploaded! Verification is pending review.</p>
              )}
              {isPending && (
                <p className="verification-status-modal">Status: Verification Pending</p>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="modal-submit-btn"
                onClick={() => {
                  if (uploadSuccess || isPending) {
                    setShowVerificationModal(false)
                    setUploadSuccess(false)
                    setUploadError(null)
                  } else if (!uploading) {
                    // If no file selected, just close
                    setShowVerificationModal(false)
                  }
                }}
              >
                {uploadSuccess || isPending ? 'Close' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
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
