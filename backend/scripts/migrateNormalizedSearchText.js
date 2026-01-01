import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import College from '../models/College.js';
import { normalizeCollegeName } from '../src/utils/normalizeCollegeName.js';

// Load environment variables
dotenv.config();

/**
 * Migration script to add normalizedSearchText to all colleges
 */
async function migrateNormalizedSearchText() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/connect-campus';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get total count
    const totalCount = await College.countDocuments();
    console.log(`📊 Total colleges to process: ${totalCount}`);

    // Process in batches for efficiency
    const batchSize = 1000;
    let processed = 0;
    let updated = 0;

    // Process all colleges in batches
    for (let skip = 0; skip < totalCount; skip += batchSize) {
      const colleges = await College.find({})
        .select('_id name')
        .skip(skip)
        .limit(batchSize)
        .lean();

      if (colleges.length === 0) break;

      // Prepare bulk write operations
      const bulkOps = colleges.map(college => {
        const normalized = normalizeCollegeName(college.name);
        return {
          updateOne: {
            filter: { _id: college._id },
            update: {
              $set: {
                normalizedSearchText: normalized
              }
            }
          }
        };
      });

      // Execute bulk write
      const result = await College.bulkWrite(bulkOps, { ordered: false });
      updated += result.modifiedCount;
      processed += colleges.length;

      console.log(`✅ Processed ${processed}/${totalCount} colleges (${updated} updated)`);
    }

    console.log('\n🎉 Migration completed!');
    console.log(`📈 Summary:`);
    console.log(`   - Total colleges: ${totalCount}`);
    console.log(`   - Processed: ${processed}`);
    console.log(`   - Updated: ${updated}`);

    // Create index on normalizedSearchText for efficient searching
    console.log('\n📑 Creating index on normalizedSearchText...');
    await College.collection.createIndex({ normalizedSearchText: 1 });
    console.log('✅ Index created');

  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run migration if executed directly (not imported)
// In ES modules, we can check if this is the main module
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('migrateNormalizedSearchText')) {
  migrateNormalizedSearchText()
    .then(() => {
      console.log('✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateNormalizedSearchText };

