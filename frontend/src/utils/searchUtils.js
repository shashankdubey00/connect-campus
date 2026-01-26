/**
 * Frontend search utilities to match backend normalization
 */

/**
 * Normalize search query to match backend normalizeCollegeName logic
 * This ensures frontend queries match backend normalizedSearchText
 * @param {string} query - User's search query
 * @returns {string} - Normalized query
 */
export const normalizeSearchQuery = (query) => {
  if (!query || typeof query !== 'string') {
    return '';
  }

  let normalized = query.trim();

  // Normalize ampersands to word form so "&" and "and" match the same way
  normalized = normalized.replace(/&/g, ' and ');

  // Remove numeric prefixes (e.g., "100002-", "12345-", etc.)
  normalized = normalized.replace(/^\d+-?\s*/, '');

  // Expand common Indian college abbreviations (same as backend)
  const abbreviations = {
    'PT.': 'Pandit',
    'PT ': 'Pandit ',
    'SRI': 'Sri',
    'J.D.M.V.P.': 'JD MVP',
    'J.D.M.V.P': 'JD MVP',
    'JDMVP': 'JD MVP',
    'DR.': 'Doctor',
    'DR ': 'Doctor ',
    'PROF.': 'Professor',
    'PROF ': 'Professor ',
    'ST.': 'Saint',
    'ST ': 'Saint ',
    'SHRI': 'Shri',
    'SHREE': 'Shree',
    'SMT.': 'Smt',
    'SMT ': 'Smt ',
    'KUM.': 'Kumari',
    'KUM ': 'Kumari ',
    'UNIV.': 'University',
    'UNIV ': 'University ',
    'COLL.': 'College',
    'COLL ': 'College ',
    'INST.': 'Institute',
    'INST ': 'Institute ',
    'ENGG.': 'Engineering',
    'ENGG ': 'Engineering ',
    'TECH.': 'Technology',
    'TECH ': 'Technology ',
  };

  // Replace abbreviations (case-insensitive, word boundaries)
  Object.keys(abbreviations).forEach(abbr => {
    const regex = new RegExp(`\\b${abbr.replace(/\./g, '\\.')}\\b`, 'gi');
    normalized = normalized.replace(regex, abbreviations[abbr]);
  });

  // Remove punctuation (keep spaces)
  normalized = normalized.replace(/[^\w\s]/g, ' ');

  // Normalize common variations of "and" to a single canonical form
  normalized = normalized.replace(/\b(and)\b/gi, ' and ');

  // Lowercase
  normalized = normalized.toLowerCase();

  // Normalize spaces (multiple spaces to single space, trim)
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
};

/**
 * Check if a query looks like an AISHE code
 * @param {string} query - Search query
 * @returns {boolean} - True if it looks like an AISHE code
 */
export const isAisheCode = (query) => {
  if (!query || typeof query !== 'string') {
    return false;
  }

  const trimmed = query.trim();

  // Pattern 1: Letter(s) followed by dash and numbers (e.g., "C-35143")
  const patternWithPrefix = /^[A-Za-z]+-\d+$/;
  
  // Pattern 2: Purely numeric (e.g., "35143")
  const patternNumeric = /^\d+$/;

  // Pattern 3: Letter(s) followed by numbers without dash (e.g., "C35143")
  const patternNoDash = /^[A-Za-z]+\d+$/;

  return patternWithPrefix.test(trimmed) || 
         patternNumeric.test(trimmed) || 
         patternNoDash.test(trimmed);
};
