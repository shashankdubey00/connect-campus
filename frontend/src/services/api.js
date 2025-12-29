const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const api = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Don't set Content-Type for FormData, browser will set it with boundary
  const isFormData = options.body instanceof FormData;
  
  const config = {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
    credentials: 'include', // Important for cookies
  };

  try {
    const response = await fetch(url, config);
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response received:', {
        status: response.status,
        statusText: response.statusText,
        contentType,
        url,
        preview: text.substring(0, 200)
      });
      throw new Error(`Server returned ${response.status} ${response.statusText}. Expected JSON but got ${contentType || 'unknown'}`);
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      // Create an error object that preserves response data
      const apiError = new Error(data.message || `Request failed with status ${response.status}`);
      apiError.response = {
        status: response.status,
        statusText: response.statusText,
        data: data
      };
      throw apiError;
    }
    
    return data;
  } catch (error) {
    // If it's already our custom error, just re-throw it
    if (error.response) {
      throw error;
    }
    
    // Otherwise, log and wrap it
    console.error('API Error:', {
      url,
      method: config.method,
      error: error.message
    });
    
    // Wrap fetch errors
    const wrappedError = new Error(error.message || 'Network error');
    wrappedError.originalError = error;
    throw wrappedError;
  }
};

export default api;



