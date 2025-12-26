import { useEffect } from 'react'
import CollegeProfileCard from './CollegeProfileCard'
import './CollegeProfileModal.css'

const CollegeProfileModal = ({ college, isOpen, onClose }) => {
  // Close modal on Escape key and handle scroll position
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
      // On mobile, ensure we're at the top when modal opens
      if (window.innerWidth <= 768) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen || !college) return null

  return (
    <div 
      className="college-modal-overlay"
      onClick={onClose}
    >
      <div 
        className="college-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="college-modal-close"
          onClick={onClose}
          aria-label="Close modal"
        >
          ❌
        </button>
        <CollegeProfileCard college={college} />
      </div>
    </div>
  )
}

export default CollegeProfileModal

