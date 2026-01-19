import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Driver from './models/driver.js';

dotenv.config();

// Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI);
console.log('✅ Connected to MongoDB');

// Check Driver with ID from app logs
const driverId = '6962142c36f886fc251536b3';
const driver = await Driver.findById(driverId).lean();

console.log(`\n🔍 Driver lookup by ID ${driverId}:`);
if (driver) {
  console.log(`  ✅ Driver found`);
  console.log(`     Name: ${driver.name || 'N/A'}`);
  console.log(`     Mobile: ${driver.mobile}`);
  console.log(`     Email: ${driver.email || 'N/A'}`);
  console.log(`     Username: ${driver.username || 'N/A'}`);
} else {
  console.log(`  ❌ Driver not found`);
}

// Close connection
await mongoose.connection.close();
console.log('\n✅ Connection closed');
