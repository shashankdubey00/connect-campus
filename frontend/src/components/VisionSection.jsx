import './VisionSection.css'

const VisionSection = () => {
  return (
    <section className="vision-section">
      <div className="vision-background">
        <div className="vision-image-overlay"></div>
      </div>
      
      <div className="vision-content">
        <div className="vision-text">
          <h2 className="vision-heading">Our Vision</h2>
          <p className="vision-subheading">
            To make college communities easier to find, more connected, and more meaningful for every student.
          </p>
          <p className="vision-paragraph">
            We believe students grow best when they can easily connect with the right people — starting from their own college and extending beyond campus boundaries. Connect Campus is built to encourage genuine connections, collaboration, and community-building in a focused and respectful environment designed for students.
          </p>
        </div>
      </div>

      <div className="vision-floating-elements">
        <div className="vision-floating-circle circle-1"></div>
        <div className="vision-floating-circle circle-2"></div>
        <div className="vision-floating-circle circle-3"></div>
      </div>
    </section>
  )
}

export default VisionSection

