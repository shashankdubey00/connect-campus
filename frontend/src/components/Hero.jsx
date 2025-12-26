import { useState, useEffect, useRef } from 'react'
import './Hero.css'

const Hero = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedState, setSelectedState] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [states, setStates] = useState([])
  const [districts, setDistricts] = useState([])
  const [loadingStates, setLoadingStates] = useState(false)
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const searchRef = useRef(null)
  const suggestionsRef = useRef(null)

  // Fetch states on component mount
  useEffect(() => {
    fetchStates()
  }, [])

  // Fetch districts when state changes
  useEffect(() => {
    if (selectedState) {
      fetchDistricts(selectedState)
      setSelectedDistrict('') // Reset district when state changes
    } else {
      setDistricts([])
      setSelectedDistrict('')
    }
  }, [selectedState])

  // Search colleges when query or filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchColleges(searchQuery.trim())
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 300) // Debounce search

    return () => clearTimeout(timeoutId)
  }, [searchQuery, selectedState, selectedDistrict])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchStates = async () => {
    try {
      setLoadingStates(true)
      const response = await fetch('/api/colleges/states')
      const data = await response.json()
      if (data.success) {
        setStates(data.states)
      }
    } catch (error) {
      console.error('Error fetching states:', error)
    } finally {
      setLoadingStates(false)
    }
  }

  const fetchDistricts = async (state) => {
    try {
      setLoadingDistricts(true)
      const response = await fetch(`/api/colleges/districts?state=${encodeURIComponent(state)}`)
      const data = await response.json()
      if (data.success) {
        setDistricts(data.districts)
      }
    } catch (error) {
      console.error('Error fetching districts:', error)
    } finally {
      setLoadingDistricts(false)
    }
  }

  const searchColleges = async (query) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ query, limit: '10' })
      
      if (selectedState) {
        params.append('state', selectedState)
      }
      
      if (selectedDistrict) {
        params.append('district', selectedDistrict)
      }

      const response = await fetch(`/api/colleges/search?${params}`)
      const data = await response.json()
      
      if (data.success) {
        console.log('Search results:', data.colleges.length, 'colleges found')
        console.log('Colleges:', data.colleges)
        setSuggestions(data.colleges)
        setShowSuggestions(data.colleges.length > 0)
      } else {
        console.error('Search failed:', data.message)
      }
    } catch (error) {
      console.error('Error searching colleges:', error)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Handle search submission
      console.log('Searching for:', searchQuery)
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (college) => {
    setSearchQuery(college.name)
    setShowSuggestions(false)
    // You can navigate to college page or handle selection here
    console.log('Selected college:', college)
  }

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value)
    if (e.target.value.trim().length >= 2) {
      setShowSuggestions(true)
    }
  }

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  return (
    <section className="hero">
      <div className="hero-background">
        <div className="hero-image-overlay"></div>
      </div>
      
      <div className="hero-content">
        <div className="hero-text">
          <h1 className="hero-heading">
            Connect with students from your college and beyond
          </h1>
          <p className="hero-subheading">
            Find your college, meet students, collaborate, and build meaningful campus communities — all in one place.
          </p>
        </div>

        <div className="search-container">
          {/* Filters */}
          <div className="search-filters">
            <select
              className="filter-select"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              disabled={loadingStates}
            >
              <option value="">All States</option>
              {states.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={!selectedState || loadingDistricts}
            >
              <option value="">All Districts</option>
              {districts.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </div>

          {/* Search Form */}
          <div className="search-wrapper" ref={searchRef}>
            <form onSubmit={handleSearch} className="search-form">
              <input
                type="text"
                className="search-input"
                placeholder="search you college...."
                value={searchQuery}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                autoComplete="off"
              />
              <button type="submit" className="search-button">
                {loading ? (
                  <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="32">
                      <animate attributeName="stroke-dasharray" dur="2s" values="0 32;16 16;0 32;0 32" repeatCount="indefinite"/>
                      <animate attributeName="stroke-dashoffset" dur="2s" values="0;-16;-32;-32" repeatCount="indefinite"/>
                    </circle>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </form>

            {/* Suggestions Dropdown */}
            {showSuggestions && (
              <div className="suggestions-dropdown" ref={suggestionsRef}>
                {loading ? (
                  <div className="suggestion-item loading">Searching...</div>
                ) : suggestions.length > 0 ? (
                  <>
                    {suggestions.map((college, index) => (
                      <div
                        key={college.aisheCode || index}
                        className="suggestion-item"
                        onClick={() => handleSuggestionClick(college)}
                      >
                        <div className="suggestion-name">{college.name}</div>
                        <div className="suggestion-location">
                          {college.district}, {college.state}
                        </div>
                      </div>
                    ))}
                    {suggestions.length >= 10 && (
                      <div className="suggestion-item info">
                        Showing top 10 results
                      </div>
                    )}
                  </>
                ) : searchQuery.trim().length >= 2 ? (
                  <div className="suggestion-item no-results">
                    No colleges found
                  </div>
                ) : null}
              </div>
            )}
          </div>
          
          <p className="search-hint">
            Not finding college{' '}
            <a 
              href="https://dashboard.aishe.gov.in/hedirectory/#/hedirectory/universityDetails/C/ALL" 
              target="_blank" 
              rel="noopener noreferrer"
              className="search-link"
            >
              search here
            </a>
          </p>
        </div>
      </div>

      <div className="floating-elements">
        <div className="floating-circle circle-1"></div>
        <div className="floating-circle circle-2"></div>
        <div className="floating-circle circle-3"></div>
      </div>
    </section>
  )
}

export default Hero
