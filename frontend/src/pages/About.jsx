import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import WhySection from '../components/WhySection'
import ConnectBeyondSection from '../components/ConnectBeyondSection'
import Footer from '../components/Footer'
import './About.css'

const About = () => {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="about-page">
      <Navbar isScrolled={isScrolled} />
      <WhySection />
      <ConnectBeyondSection />
      <Footer />
    </div>
  )
}

export default About

