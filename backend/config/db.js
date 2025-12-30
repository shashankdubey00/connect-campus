import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 5000, // Reduced from 10000
      socketTimeoutMS: 30000, // Reduced from 45000
      connectTimeoutMS: 5000, // Reduced from 10000
      maxPoolSize: 50, // Increased from 10 for better concurrency
      minPoolSize: 5, // Increased from 2
      maxIdleTimeMS: 60000, // Increased from 30000 to keep connections longer
      retryWrites: true, // Retry write operations on network errors
      w: 1, // Changed from 'majority' to 1 for faster writes (single replica confirmation)
    };
    
    // Disable Mongoose buffering (set globally, not in connection options)
    mongoose.set('bufferCommands', false);

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events for production monitoring
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    // In production, you might want to retry instead of exiting
    if (process.env.NODE_ENV === 'production') {
      console.error('Retrying connection in 5 seconds...');
      setTimeout(() => connectDB(), 5000);
    } else {
      process.exit(1);
    }
  }
};

export default connectDB;






