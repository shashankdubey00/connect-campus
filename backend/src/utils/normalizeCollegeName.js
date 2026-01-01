/**
 * Normalize college name for search
 * - Remove numeric prefixes (e.g., "100002-")
 * - Expand common Indian college abbreviations
 * - Remove punctuation
 * - Lowercase and normalize spaces
 * 
 * @param {string} name - College name to normalize
 * @returns {string} - Normalized college name
 */
export function normalizeCollegeName(name) {
  if (!name || typeof name !== 'string') {
    return '';
  }

  let normalized = name.trim();

  // Remove numeric prefixes (e.g., "100002-", "12345-", etc.)
  // Pattern: digits followed by dash/hyphen at the start
  normalized = normalized.replace(/^\d+-?\s*/, '');

  // Expand common Indian college abbreviations
  const abbreviations = {
    'PT.': 'Pandit',
    'PT ': 'Pandit ',
    'SRI': 'Sri',
    'J.D.M.V.P.': 'JD MVP',
    'J.D.M.V.P': 'JD MVP',
    'JDMVP': 'JD MVP', // Special case
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

  // Lowercase
  normalized = normalized.toLowerCase();

  // Normalize spaces (multiple spaces to single space, trim)
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

