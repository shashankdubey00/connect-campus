# Migration Scripts

## migrateNormalizedSearchText.js

This script adds a `normalizedSearchText` field to all college documents in the database.

### What it does:
- Removes numeric prefixes (e.g., "100002-")
- Expands common Indian college abbreviations (PT., SRI, J.D.M.V.P., etc.)
- Removes punctuation
- Lowercases and normalizes spaces
- Creates an index on `normalizedSearchText` for efficient searching

### How to run:

```bash
# From the backend directory
npm run migrate:normalize-search

# Or directly with node
node scripts/migrateNormalizedSearchText.js
```

### Requirements:
- MongoDB connection string in `.env` file as `MONGODB_URI`
- The script will process colleges in batches of 1000 for efficiency
- Uses `bulkWrite` for optimal performance

### Notes:
- This is a one-time migration script
- It does NOT modify existing data fields
- Only adds the new `normalizedSearchText` field
- Safe to run multiple times (idempotent)



