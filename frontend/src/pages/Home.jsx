import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import VisionSection from '../components/VisionSection';
import Footer from '../components/Footer';

function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="app">
      <Navbar isScrolled={isScrolled} />
      <Hero collegeFromState={location.state?.college} openModalFromState={location.state?.openCollegeModal} />
      <VisionSection />
      <Footer />
    </div>
  );
}

export default Home;









