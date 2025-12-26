import './WhySection.css'

const WhySection = () => {
  return (
    <section className="why-section">
      <div className="why-container">
        <div className="why-header">
          <h2 className="why-heading">Why Connect Campus 🤔</h2>
          <p className="why-subheading">
            because your college community should be easy to find and making connection with friends across the college
          </p>
        </div>

        <div className="why-content">
          <div className="why-text">
            <p className="why-paragraph">
              Connect Campus is built to help students find and connect with real college communities, starting with their institution.
            </p>
            <p className="why-paragraph">
              By searching your college, you can discover students from the same campus or connect with peers from other colleges to collaborate, share ideas, and grow together. The platform focuses on meaningful interactions, verified institutions, and distraction-free communities—so students spend less time searching and more time connecting with the right people.
            </p>
          </div>

          <div className="why-image-card">
            <div className="image-slider">
              <div className="image-slide">
                <img src="https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=600&q=80" alt="Indian students" />
              </div>
              <div className="image-slide">
                <img src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&q=80" alt="Indian students studying" />
              </div>
              <div className="image-slide">
                <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80" alt="Indian students collaborating" />
              </div>
              <div className="image-slide">
                <img src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&q=80" alt="Indian students group" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default WhySection

