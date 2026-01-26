import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { parseCollegeParam } from '../utils/urlHelpers';

const CollegeDetailPage = () => {
  const { collegeId } = useParams();
  const navigate = useNavigate();
  const [college, setCollege] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCollege = async () => {
      try {
        setLoading(true);
        setError(null);

        // Decode the identifier (aisheCode, _id, or encoded name)
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
        setCollege(data);
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
  }, [collegeId]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div>Loading college details...</div>
      </div>
    );
  }

  if (error || !college) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ color: 'red', marginBottom: '1rem' }}>
          {error || 'College not found'}
        </div>
        <button onClick={() => navigate('/')} style={{ padding: '0.5rem 1rem' }}>
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: '1rem', padding: '0.5rem 1rem' }}>
        ← Back
      </button>
      
      <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h1 style={{ marginBottom: '1rem', color: '#333' }}>{college.name}</h1>
        
        <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
          <div><strong>AISHE Code:</strong> {college.aisheCode}</div>
          <div><strong>State:</strong> {college.state}</div>
          <div><strong>District:</strong> {college.district}</div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => navigate(`/chat?college=${encodeURIComponent(college.aisheCode)}`)}
            style={{ 
              padding: '0.75rem 1.5rem', 
              background: '#007bff', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Join Chat
          </button>
        </div>
      </div>
    </div>
  );
};

export default CollegeDetailPage;
