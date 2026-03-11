import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { parseCollegeParam } from '../utils/urlHelpers';
import './CollegeDetailPage.css';

const CollegeDetailPage = () => {
  const { collegeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [college, setCollege] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCollege = async () => {
      const collegeFromState = location.state?.college;

      if (collegeFromState) {
        setCollege(collegeFromState);
        setError(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const decodedId = parseCollegeParam(collegeId);
        console.log('Fetching college with identifier:', decodedId);

        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_BASE_URL}/api/colleges/detail/${encodeURIComponent(decodedId)}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('College not found');
          }
          throw new Error('Failed to fetch college details');
        }

        const data = await response.json();
        // Backend returns { success, college } for this endpoint.
        // Keep a fallback for older response shapes.
        setCollege(data?.college || data);
      } catch (err) {
        console.error('Error fetching college:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (collegeId) {
      fetchCollege();
    }
  }, [collegeId, location.state]);

  if (loading) {
    return (
      <div className="college-detail-page">
        <div className="college-detail-page__state-card">
          <div className="college-detail-page__spinner" />
          <div className="college-detail-page__state-text">Loading college details...</div>
        </div>
      </div>
    );
  }

  if (error || !college) {
    return (
      <div className="college-detail-page">
        <div className="college-detail-page__state-card">
          <div className="college-detail-page__error-text">{error || 'College not found'}</div>
          <button
            className="college-detail-page__btn college-detail-page__btn--secondary"
            onClick={() => navigate('/')}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="college-detail-page">
      <div className="college-detail-page__container">
        <button
          className="college-detail-page__btn college-detail-page__btn--secondary"
          onClick={() => navigate(-1)}
        >
          Back
        </button>

        <div className="college-detail-page__card">
          <div className="college-detail-page__eyebrow">College Profile</div>
          <h1 className="college-detail-page__title">{college.name}</h1>

          <div className="college-detail-page__meta-grid">
            <div className="college-detail-page__meta-item">
              <span className="college-detail-page__meta-label">AISHE Code</span>
              <span className="college-detail-page__meta-value">{college.aisheCode || 'N/A'}</span>
            </div>
            <div className="college-detail-page__meta-item">
              <span className="college-detail-page__meta-label">State</span>
              <span className="college-detail-page__meta-value">{college.state || 'N/A'}</span>
            </div>
            <div className="college-detail-page__meta-item">
              <span className="college-detail-page__meta-label">District</span>
              <span className="college-detail-page__meta-value">{college.district || 'N/A'}</span>
            </div>
          </div>

          <div className="college-detail-page__actions">
            <button
              className="college-detail-page__btn college-detail-page__btn--primary"
              onClick={() => navigate(`/chat?college=${encodeURIComponent(college.aisheCode)}`)}
            >
              Join Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollegeDetailPage;
