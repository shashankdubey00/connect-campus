import './Footer.css'

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3 className="footer-logo">Connect Campus</h3>
            <p className="footer-description">
              Building meaningful college communities, one connection at a time.
            </p>
          </div>

          <div className="footer-section">
            <h4 className="footer-heading">Quick Links</h4>
            <ul className="footer-links">
              <li><a href="#home">Home</a></li>
              <li><a href="#about">About</a></li>
              <li><a href="#blog">Blog</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-heading">Connect</h4>
            <ul className="footer-links">
              <li><a href="#login">Login</a></li>
              <li><a href="#get-started">Get Started</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4 className="footer-heading">Resources</h4>
            <ul className="footer-links">
              <li><a href="https://dashboard.aishe.gov.in/hedirectory/#/hedirectory/universityDetails/C/ALL" target="_blank" rel="noopener noreferrer">Find Your College</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            © {new Date().getFullYear()} Connect Campus. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer

