import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { verifyAuth, logout } from '../services/authService'
import './Navbar.css'

const Navbar = ({ isScrolled }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const profileMenuRef = useRef(null)

  useEffect(() => {
    // Check authentication status
    // Add delay to ensure cookie is available after page reload
    const checkAuth = async () => {
      try {
        // Delay to ensure cookie is available after window.location redirect
        // Increased delay for production cookie propagation
        await new Promise(resolve => setTimeout(resolve, 300))
        const data = await verifyAuth()
        if (data.success) {
          setUser(data.user)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Navbar auth check error:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    checkAuth()

    // Close profile menu when clicking outside
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogoClick = () => {
    navigate('/')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleLogout = async () => {
    try {
      await logout()
      setUser(null)
      setIsProfileMenuOpen(false)
      navigate('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Get user avatar/initials
  const getUserAvatar = () => {
    if (user?.profile?.profilePicture) {
      // If it's a relative path, prepend the backend URL
      if (user.profile.profilePicture.startsWith('/uploads/')) {
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
        return `${backendUrl}${user.profile.profilePicture}`
      }
      // If it's already a full URL, use it as is
      if (user.profile.profilePicture.startsWith('http://') || user.profile.profilePicture.startsWith('https://')) {
        return user.profile.profilePicture
      }
      // Otherwise, treat as relative path
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      return `${backendUrl}${user.profile.profilePicture}`
    }
    const name = user?.profile?.displayName || user?.email || 'U'
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=40&background=00a8ff&color=fff&bold=true`
  }

  // Check if user is Google user without password set
  // Show "Set Password" if: has googleId AND no password
  // Show "Change Password" if: has password (regardless of login method)
  const isGoogleUserWithoutPassword = user?.googleId && !user?.hasPassword
  
  // Debug logging
  useEffect(() => {
    if (user) {
      console.log('Navbar User Data:', {
        googleId: user.googleId,
        hasPassword: user.hasPassword,
        isGoogleUserWithoutPassword: isGoogleUserWithoutPassword,
        fullUser: user
      })
    }
  }, [user, isGoogleUserWithoutPassword])

  return (
    <nav className={`navbar ${isScrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        <div className="navbar-logo" onClick={handleLogoClick}>
          <div className="logo-text">
            <span className="logo-line">Connect</span>
            <span className="logo-line">Campus</span>
          </div>
        </div>

        <div className="navbar-links">
          <Link to="/about" className="nav-link">About</Link>
          <a href="#blog" className="nav-link">Blog</a>
        </div>

        {!loading && (
          <div className="navbar-right">
            {user ? (
              // Logged in - show integrated chat button with profile
              <div className="user-actions-container">
                <button 
                  className="chat-icon-btn animated-chat-btn"
                  onClick={() => navigate('/chat')}
                  title="Go to Chat"
                >
                  <svg className="chat-icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <div className="profile-menu-container" ref={profileMenuRef}>
                  <div 
                    className="profile-avatar"
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    onMouseEnter={() => setIsProfileMenuOpen(true)}
                  >
                    <img 
                      src={getUserAvatar()} 
                      alt="Profile"
                      onError={(e) => {
                        // Fallback to ui-avatars if image fails to load
                        const name = user?.profile?.displayName || user?.email || 'U'
                        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=40&background=00a8ff&color=fff&bold=true`
                      }}
                    />
                  </div>
                  {isProfileMenuOpen && (
                    <div className="profile-dropdown" onMouseLeave={() => setIsProfileMenuOpen(false)}>
                      <div className="profile-dropdown-header">
                        <div className="profile-dropdown-avatar">
                          <img 
                            src={getUserAvatar()} 
                            alt="Profile"
                            onError={(e) => {
                              // Fallback to ui-avatars if image fails to load
                              const name = user?.profile?.displayName || user?.email || 'U'
                              const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=40&background=00a8ff&color=fff&bold=true`
                            }}
                          />
                        </div>
                        <div className="profile-dropdown-info">
                          <div className="profile-dropdown-name">
                            {user.profile?.displayName || user.email}
                          </div>
                          <div className="profile-dropdown-email">{user.email}</div>
                        </div>
                      </div>
                      <div className="profile-dropdown-divider"></div>
                      <div className="profile-dropdown-menu">
                        {/* Show Set Password for Google users without password */}
                        {(user?.googleId && (user?.hasPassword === false || user?.hasPassword === undefined || !user?.hasPassword)) && (
                          <Link 
                            to="/set-password" 
                            className="profile-dropdown-item"
                            onClick={() => setIsProfileMenuOpen(false)}
                          >
                            🔒 Set Password
                          </Link>
                        )}
                        {/* Show Change Password if user has password */}
                        {user?.hasPassword === true && (
                          <Link 
                            to="/change-password" 
                            className="profile-dropdown-item"
                            onClick={() => setIsProfileMenuOpen(false)}
                          >
                            🔒 Change Password
                          </Link>
                        )}
                        <button 
                          className="profile-dropdown-item logout-item"
                          onClick={handleLogout}
                        >
                          🚪 Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Not logged in - show auth buttons
              <div className="navbar-buttons">
                <button className="nav-btn login-btn" onClick={() => navigate('/login')}>Login</button>
                <button className="nav-btn get-started-btn" onClick={() => navigate('/signup')}>Get Started</button>
              </div>
            )}
          </div>
        )}

        <button 
          className="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="mobile-menu">
          <Link to="/about" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>About</Link>
          <a href="#blog" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>Blog</a>
          {user ? (
            <>
              <div className="mobile-profile-section">
                <div className="mobile-profile-avatar">
                  <img 
                    src={getUserAvatar()} 
                    alt="Profile"
                    onError={(e) => {
                      // Fallback to ui-avatars if image fails to load
                      const name = user?.profile?.displayName || user?.email || 'U'
                      const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=40&background=00a8ff&color=fff&bold=true`
                    }}
                  />
                </div>
                <div className="mobile-profile-info">
                  <div className="mobile-profile-name">{user.profile?.displayName || user.email}</div>
                  <div className="mobile-profile-email">{user.email}</div>
                </div>
              </div>
              <button 
                className="mobile-nav-btn chat-btn-mobile animated-chat-btn"
                onClick={() => { setIsMobileMenuOpen(false); navigate('/chat'); }}
              >
                <svg className="chat-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Go to Chat</span>
              </button>
              {user?.googleId && !user?.hasPassword && (
                <Link to="/set-password" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>Set Password</Link>
              )}
              {user?.hasPassword && (
                <Link to="/change-password" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>Change Password</Link>
              )}
              <button className="mobile-nav-btn logout-btn" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}>Logout</button>
            </>
          ) : (
            <>
              <button className="mobile-nav-btn login-btn" onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }}>Login</button>
              <button className="mobile-nav-btn get-started-btn" onClick={() => { setIsMobileMenuOpen(false); navigate('/signup'); }}>Get Started</button>
            </>
          )}
        </div>
      )}
    </nav>
  )
}

export default Navbar
