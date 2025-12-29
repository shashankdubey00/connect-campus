import { Link } from 'react-router-dom'
import './Footer.css'

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-background-pattern"></div>
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section footer-brand">
            <div className="footer-logo-wrapper">
              <h3 className="footer-logo">Connect Campus</h3>
              <div className="footer-logo-accent"></div>
            </div>
            <p className="footer-description">
              Building meaningful college communities, one connection at a time. Connect with students, share knowledge, and grow together.
            </p>
          </div>

          <div className="footer-section">
            <h4 className="footer-heading">Quick Links</h4>
            <ul className="footer-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About</Link></li>
              <li><a href="#blog">Blog</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-heading">Connect</h4>
            <ul className="footer-links">
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/signup">Get Started</Link></li>
              <li><Link to="/chat">Go to Chat</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-heading">Resources</h4>
            <ul className="footer-links">
              <li>
                <a href="https://dashboard.aishe.gov.in/hedirectory/#/hedirectory/universityDetails/C/ALL" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="external-link">
                  Find Your College
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 13V19A2 2 0 0 1 16 21H5A2 2 0 0 1 3 19V8A2 2 0 0 1 5 6H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15 3H21V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-divider"></div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            © {new Date().getFullYear()} <span className="copyright-brand">Connect Campus</span>. All rights reserved.
          </p>
          <div className="footer-legal">
            <a href="#privacy">Privacy Policy</a>
            <span className="footer-separator">•</span>
            <a href="#terms">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

