const path = require('path')
const mongoose = require('mongoose')
const MONGO_URI = process.env.MONGODB_URI

if (!MONGO_URI) {
    throw new Error('Please define the MONGODB_URI environment variable in .env');
  }
  
  /** 
   * Global is used here to maintain a single Mongoose connection across hot reloads 
   * in development. Otherwise, Mongoose will reattempt connections.
   */
  let cached = global.mongoose;
  
  if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
  }
  
  async function dbConnect() {
    if (cached.conn) {
      return cached.conn;
    }
  
    if (!cached.promise) {
      const opts = {
        bufferCommands: true,
      };
  
      cached.promise = mongoose.connect(MONGO_URI, opts).then((mongoose) => {
        return mongoose;
      });
    }
  
    cached.conn = await cached.promise;
    return cached.conn;
  }
  
  module.exports = dbConnect