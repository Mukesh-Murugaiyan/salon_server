const mongoose = require('mongoose');
const env = require('./env');

let isConnected = false;
let memoryServerInstance = null;

const connectDB = async (customUri) => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  let uri = customUri || env.MONGODB_URI;

  // Seamless fallback/developer mode: support in-memory MongoDB if configured or requested
  if (process.env.USE_MEMORY_DB === 'true' || uri === 'memory') {
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServerInstance = await MongoMemoryServer.create();
      uri = memoryServerInstance.getUri();
      console.log(`[Database] Initialized in-memory MongoDB instance: ${uri}`);
    } catch (err) {
      console.warn('[Database] Could not initialize in-memory MongoDB:', err.message);
    }
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    if (env.NODE_ENV !== 'test') {
      console.log(`[Database] MongoDB connected: ${conn.connection.host}`);
    }

    return conn;
  } catch (error) {
    console.error(`[Database] Error connecting to MongoDB: ${error.message}`);
    if (env.NODE_ENV !== 'test') {
      console.error('[Database] Tip: To run without local MongoDB installed, run with USE_MEMORY_DB=true');
      process.exit(1);
    }
    throw error;
  }
};

const disconnectDB = async () => {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    if (memoryServerInstance) {
      await memoryServerInstance.stop();
      memoryServerInstance = null;
    }
    if (env.NODE_ENV !== 'test') {
      console.log('[Database] MongoDB disconnected cleanly');
    }
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};
