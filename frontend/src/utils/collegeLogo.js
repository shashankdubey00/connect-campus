/**
 * Generate smart initials from college name
 * Examples:
 * - "Sagar Institute of Research & Technology" → "SIRT"
 * - "AARAV DIKSHA SHIKSHAN SANSTHAN" → "ADS"
 * - "Indian Institute of Technology Delhi" → "IITD"
 * - "National Institute of Technology" → "NIT"
 */
export const generateCollegeInitials = (collegeName) => {
  if (!collegeName) return 'C';

  // Remove common words that shouldn't be in initials
  const stopWords = new Set([
    'of', 'and', 'the', 'for', 'a', 'an', 'in', 'on', 'at', 'to', 'from',
    'by', 'with', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'could', 'may', 'might', 'must', 'can', 'shall'
  ]);

  // Split by spaces and filter out stop words
  const words = collegeName
    .toUpperCase()
    .replace(/[&]/g, ' ') // Replace & with space
    .split(/\s+/)
    .filter(word => word.length > 0 && !stopWords.has(word.toLowerCase()));

  if (words.length === 0) {
    // If all words were stop words, just use first letter
    return collegeName.charAt(0).toUpperCase();
  }

  // Strategy 1: If we have 4+ words, try to form smart acronym
  if (words.length >= 4) {
    // Take first letter of first 4-5 significant words
    const initials = words.slice(0, 4).map(w => w[0]).join('');
    if (initials.length >= 3 && initials.length <= 4) {
      return initials;
    }
  }

  // Strategy 2: Look for common patterns
  const nameUpper = collegeName.toUpperCase();
  
  // Check for IIT pattern
  if (nameUpper.includes('INDIAN INSTITUTE OF TECHNOLOGY')) {
    const match = nameUpper.match(/IIT[ -]?([A-Z]+)/);
    if (match && match[1]) {
      return `IIT${match[1].substring(0, 1)}`;
    }
    // Extract city name
    const cityMatch = nameUpper.match(/IIT[^A-Z]*([A-Z]{3,})/);
    if (cityMatch && cityMatch[1]) {
      return `IIT${cityMatch[1].substring(0, 1)}`;
    }
    return 'IIT';
  }

  // Check for NIT pattern
  if (nameUpper.includes('NATIONAL INSTITUTE OF TECHNOLOGY')) {
    const match = nameUpper.match(/NIT[ -]?([A-Z]+)/);
    if (match && match[1]) {
      return `NIT${match[1].substring(0, 1)}`;
    }
    return 'NIT';
  }

  // Strategy 3: Take first letters of first 2-3 words
  if (words.length >= 2) {
    const initials = words.slice(0, Math.min(3, words.length)).map(w => w[0]).join('');
    return initials.substring(0, 4); // Max 4 characters
  }

  // Strategy 4: Single word - take first 2-4 letters if meaningful
  if (words.length === 1) {
    const word = words[0];
    if (word.length >= 4) {
      return word.substring(0, 4);
    }
    return word.substring(0, 2);
  }

  // Fallback: First letter
  return collegeName.charAt(0).toUpperCase();
};

/**
 * Generate a gradient color based on college name (consistent hashing)
 */
export const generateLogoGradient = (collegeName) => {
  if (!collegeName) {
    return {
      start: '#667eea',
      end: '#764ba2'
    };
  }

  // Hash the name to get consistent colors
  let hash = 0;
  for (let i = 0; i < collegeName.length; i++) {
    hash = collegeName.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate color palette (modern gradients)
  const gradients = [
    { start: '#667eea', end: '#764ba2' }, // Purple
    { start: '#f093fb', end: '#f5576c' }, // Pink-Red
    { start: '#4facfe', end: '#00f2fe' }, // Blue-Cyan
    { start: '#43e97b', end: '#38f9d7' }, // Green-Cyan
    { start: '#fa709a', end: '#fee140' }, // Pink-Yellow
    { start: '#30cfd0', end: '#330867' }, // Cyan-Purple
    { start: '#a8edea', end: '#fed6e3' }, // Mint-Pink
    { start: '#ff9a9e', end: '#fecfef' }, // Coral-Pink
    { start: '#ffecd2', end: '#fcb69f' }, // Peach
    { start: '#ff8177', end: '#ff867a' }, // Coral
    { start: '#ff8a80', end: '#ea4c89' }, // Red-Pink
    { start: '#667eea', end: '#764ba2' }, // Purple
  ];

  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};

/**
 * Generate college logo URL (Layer 1: Auto-generated smart logo)
 * This is the default fallback for all colleges
 */
export const generateCollegeLogoUrl = (collegeName, size = 100) => {
  if (!collegeName) {
    return `https://ui-avatars.com/api/?name=C&size=${size}&background=667eea&color=fff&bold=true&font-size=0.5`;
  }

  const initials = generateCollegeInitials(collegeName);
  const gradient = generateLogoGradient(collegeName);
  
  // Use ui-avatars with gradient-like background (using the start color)
  // For a true gradient, we'd need a custom service, but ui-avatars gives us close
  // Format: name, size, background (hex without #), color, bold, font-size
  const bgColor = gradient.start.replace('#', '');
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=${size}&background=${bgColor}&color=fff&bold=true&font-size=0.45&length=${initials.length}`;
};

/**
 * Get college logo URL with fallback logic
 * Layer 1: Auto-generated smart logo (default)
 * Layer 2: Wikipedia logo (if available and for famous colleges)
 */
export const getCollegeLogoUrl = (college, size = 100) => {
  // Layer 2: Use Wikipedia logo if available (for famous colleges)
  if (college?.logo && !college.logo.includes('ui-avatars.com')) {
    // If there's a custom logo (Wikipedia or other source), use it
    return college.logo;
  }

  // Layer 1: Auto-generated smart logo (default fallback)
  return generateCollegeLogoUrl(college?.name || 'College', size);
};

/**
 * Check if a college is likely a famous one (should get Wikipedia logo)
 */
export const isFamousCollege = (collegeName) => {
  if (!collegeName) return false;
  
  const nameUpper = collegeName.toUpperCase();
  
  // Check for IITs
  if (nameUpper.includes('INDIAN INSTITUTE OF TECHNOLOGY') || nameUpper.match(/^IIT[ -]/)) {
    return true;
  }
  
  // Check for NITs
  if (nameUpper.includes('NATIONAL INSTITUTE OF TECHNOLOGY') || nameUpper.match(/^NIT[ -]/)) {
    return true;
  }
  
  // Check for Central Universities
  if (nameUpper.includes('CENTRAL UNIVERSITY')) {
    return true;
  }
  
  // Check for popular private universities (add more as needed)
  const popularUniversities = [
    'BITS', 'VIT', 'SRM', 'MANIPAL', 'AMITY', 'LPU', 'CHRIST', 'SYMBIOSIS',
    'JAYPEE', 'SHIV NADAR', 'ASHOKA', 'KREA', 'FLAME', 'OP JINDAL'
  ];
  
  return popularUniversities.some(uni => nameUpper.includes(uni));
};

