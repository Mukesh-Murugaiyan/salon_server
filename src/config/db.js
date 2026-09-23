const mongoose = require('mongoose');
const env = require('./env');

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = {
    conn: null,
    promise: null,
  };
}

const connectDB = async (customUri) => {
  if (cached.conn) {
    return cached.conn;
  }

  const uri = customUri || env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not configured');
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      })
      .then((mongooseInstance) => {
        console.log(
          `[Database] MongoDB connected: ${mongooseInstance.connection.host}`
        );

        return mongooseInstance;
      })
      .catch((error) => {
        cached.promise = null;

        console.error(
          `[Database] MongoDB connection failed: ${error.message}`
        );

        throw error;
      });
  }

  cached.conn = await cached.promise;

  return cached.conn;
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  cached.conn = null;
  cached.promise = null;
};

module.exports = {
  connectDB,
  disconnectDB,
};