/**
 * Detect if the input string is an AISHE code
 * AISHE codes can be:
 * - Format like "C-35143" (letter prefix followed by dash and numbers)
 * - Or purely numeric (e.g., "35143")
 * 
 * @param {string} input - Input string to check
 * @returns {boolean} - True if input appears to be an AISHE code
 */
export function isAisheCode(input) {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const trimmed = input.trim();

  // Pattern 1: Letter(s) followed by dash and numbers (e.g., "C-35143", "ABC-12345")
  const patternWithPrefix = /^[A-Za-z]+-\d+$/;
  
  // Pattern 2: Purely numeric (e.g., "35143", "12345")
  const patternNumeric = /^\d+$/;

  // Pattern 3: Letter(s) followed by numbers without dash (e.g., "C35143", "ABC12345")
  const patternNoDash = /^[A-Za-z]+\d+$/;

  return patternWithPrefix.test(trimmed) || 
         patternNumeric.test(trimmed) || 
         patternNoDash.test(trimmed);
}


