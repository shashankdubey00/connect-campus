import { useState } from 'react'
import './Navbar.css'

const Navbar = ({ isScrolled }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
          <a href="#about" className="nav-link">About</a>
          <a href="#blog" className="nav-link">Blog</a>
        </div>

        <div className="navbar-buttons">
          <button className="nav-btn login-btn">Login</button>
          <button className="nav-btn get-started-btn">Get Started</button>
        </div>

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
          <a href="#about" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>About</a>
          <a href="#blog" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>Blog</a>
          <button className="mobile-nav-btn login-btn" onClick={() => setIsMobileMenuOpen(false)}>Login</button>
          <button className="mobile-nav-btn get-started-btn" onClick={() => setIsMobileMenuOpen(false)}>Get Started</button>
        </div>
      )}
    </nav>
  )
}

export default Navbar

