import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend root directory (two levels up from src/config/)
dotenv.config({ path: join(__dirname, '../../.env') });

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'CLIENT_URL'];

// Map MONGODB_URI to MONGO_URI for backward compatibility
if (process.env.MONGODB_URI && !process.env.MONGO_URI) {
  process.env.MONGO_URI = process.env.MONGODB_URI;
}

// Check required variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Validate JWT_SECRET strength
if (
  process.env.NODE_ENV === 'production' &&
  process.env.JWT_SECRET.length < 32
) {
  console.error('❌ JWT_SECRET must be at least 32 characters in production');
  process.exit(1);
}

// Validate MongoDB URI format
if (process.env.MONGODB_URI && !process.env.MONGODB_URI.startsWith('mongodb://') && !process.env.MONGODB_URI.startsWith('mongodb+srv://')) {
  console.error('❌ Invalid MONGODB_URI format. Must start with mongodb:// or mongodb+srv://');
  process.exit(1);
}

// Validate CLIENT_URL format
if (process.env.CLIENT_URL && !process.env.CLIENT_URL.startsWith('http://') && !process.env.CLIENT_URL.startsWith('https://')) {
  console.error('❌ Invalid CLIENT_URL format. Must start with http:// or https://');
  process.exit(1);
}

// Production-specific validations
if (process.env.NODE_ENV === 'production') {
  if (!process.env.PORT) {
    console.warn('⚠️ PORT not set, using default 5000');
  }
  
  // Warn if using default JWT_SECRET (should never happen in production)
  if (process.env.JWT_SECRET === 'your-secret-key' || process.env.JWT_SECRET === 'secret') {
    console.error('❌ CRITICAL: Using default JWT_SECRET in production is insecure!');
    process.exit(1);
  }
}

console.log('✅ Environment variables validated');


