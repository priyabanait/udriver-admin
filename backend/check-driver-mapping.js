import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DriverSignup from './models/driverSignup.js';
import Driver from './models/driver.js';

dotenv.config();

// Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI);
console.log('✅ Connected to MongoDB');

// Check DriverSignup with ID from app logs
const driverSignupId = '6962142c36f886fc251536b3';
const driverSignup = await DriverSignup.findById(driverSignupId).lean();

console.log(`\n🔍 DriverSignup lookup by ID ${driverSignupId}:`);
if (driverSignup) {
  console.log(`  ✅ DriverSignup found`);
  console.log(`     Name: ${driverSignup.name || 'N/A'}`);
  console.log(`     Mobile: ${driverSignup.mobile}`);
  console.log(`     Email: ${driverSignup.email || 'N/A'}`);
  
  // Find corresponding Driver by mobile
  const driver = await Driver.findOne({ mobile: driverSignup.mobile }).lean();
  if (driver) {
    console.log(`\n  ✅ Corresponding Driver found: ${driver._id}`);
    console.log(`     Username: ${driver.username || 'N/A'}`);
    console.log(`     Mobile: ${driver.mobile}`);
    console.log(`\n  ⚠️  ID MISMATCH DETECTED:`);
    console.log(`     DriverSignup._id: ${driverSignupId}`);
    console.log(`     Driver._id: ${driver._id}`);
    console.log(`\n  💡 Solution: Backend should convert DriverSignup._id → Driver._id`);
  } else {
    console.log(`  ❌ No Driver found with mobile ${driverSignup.mobile}`);
  }
} else {
  console.log(`  ❌ DriverSignup not found`);
}

// Close connection
await mongoose.connection.close();
console.log('\n✅ Connection closed');
