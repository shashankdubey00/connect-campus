import express from 'express';
import College from '../models/College.js';

const router = express.Router();

// Search colleges with optional filters
router.get('/search', async (req, res) => {
  try {
    const { query, state, district, limit = 10 } = req.query;
    const searchLimit = Math.min(parseInt(limit) || 10, 10); // Ensure max 10

    // Build search criteria
    const searchCriteria = {};

    // Apply state filter if provided
    if (state && state.trim()) {
      searchCriteria.state = state.trim();
    }

    // Apply district filter if provided (only if state is also provided)
    if (district && district.trim() && state && state.trim()) {
      searchCriteria.district = district.trim();
    }

    // Text search on searchText field (uses existing text index)
    // Note: $text must be used with find(), not as part of searchCriteria object
    let searchQuery;
    
    if (query && query.trim()) {
      // Use text search with filters
      searchCriteria.$text = { $search: query.trim() };
      searchQuery = College.find(searchCriteria);
      // Sort by text score for relevance
      searchQuery = searchQuery.sort({ score: { $meta: 'textScore' } });
    } else {
      // No text search, just use filters and sort by name
      searchQuery = College.find(searchCriteria);
      searchQuery = searchQuery.sort({ name: 1 });
    }

    // Limit results
    searchQuery = searchQuery.limit(searchLimit);

    // Execute query
    const colleges = await searchQuery.select('aisheCode name state district').lean();

    console.log(`Search - Query: "${query || 'none'}", State: "${state || 'all'}", District: "${district || 'all'}"`);
    console.log(`Search - Found ${colleges.length} colleges (limit: ${searchLimit})`);
    if (colleges.length > 0) {
      console.log(`Search - Sample colleges:`, colleges.slice(0, 3).map(c => c.name));
    }

    res.json({
      success: true,
      count: colleges.length,
      colleges
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching colleges',
      error: error.message
    });
  }
});

// Get all unique states
router.get('/states', async (req, res) => {
  try {
    const states = await College.distinct('state').sort();
    res.json({
      success: true,
      states
    });
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching states',
      error: error.message
    });
  }
});

// Get districts for a specific state
router.get('/districts', async (req, res) => {
  try {
    const { state } = req.query;

    if (!state || !state.trim()) {
      return res.status(400).json({
        success: false,
        message: 'State parameter is required'
      });
    }

    const districts = await College.distinct('district', { state: state.trim() }).sort();
    
    res.json({
      success: true,
      districts
    });
  } catch (error) {
    console.error('Error fetching districts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching districts',
      error: error.message
    });
  }
});

export default router;

