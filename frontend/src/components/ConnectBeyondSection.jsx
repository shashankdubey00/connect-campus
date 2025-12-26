import './ConnectBeyondSection.css'

const ConnectBeyondSection = () => {
  return (
    <section className="connect-beyond-section">
      <div className="connect-beyond-container">
        <div className="connect-beyond-header">
          <h2 className="connect-beyond-heading">🤝 Connect Beyond Your Own Campus</h2>
          <p className="connect-beyond-subheading">
            Expand your network in other colleges also
          </p>
        </div>

        <div className="connect-beyond-content">
          <div className="connect-beyond-image-card">
            <div className="connect-beyond-image-slider">
              <div className="connect-beyond-image-slide">
                <img src="https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=600&q=80" alt="Indian students" />
              </div>
              <div className="connect-beyond-image-slide">
                <img src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&q=80" alt="Indian students studying" />
              </div>
              <div className="connect-beyond-image-slide">
                <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80" alt="Indian students collaborating" />
              </div>
              <div className="connect-beyond-image-slide">
                <img src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&q=80" alt="Indian students group" />
              </div>
            </div>
          </div>

          <div className="connect-beyond-text">
            <p className="connect-beyond-paragraph">
              Connect Campus allows you to discover and interact with students from other colleges, opening doors to new ideas, collaborations, and perspectives. Whether you're looking to discuss academics, work on projects, or simply connect with peers from different institutions, the platform helps you build meaningful relationships beyond your own campus.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ConnectBeyondSection

