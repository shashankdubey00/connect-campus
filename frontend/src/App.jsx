import { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import VisionSection from './components/VisionSection'
import Footer from './components/Footer'
import './App.css'

function App() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="app">
      <Navbar isScrolled={isScrolled} />
      <Hero />
      <VisionSection />
      <Footer />
    </div>
  )
}

export default App

