const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-event-management';
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(uri);
    console.log(`[db] MongoDB connected -> ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (err) {
    console.error('[db] MongoDB connection error:', err.message);
    console.error('[db] Ensure MongoDB is running and MONGO_URI is correct in .env');
    process.exit(1);
  }
}

module.exports = connectDB;
