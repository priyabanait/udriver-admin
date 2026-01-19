import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DeviceToken from './models/deviceToken.js';
import Driver from './models/driver.js';

dotenv.config();

// Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI);
console.log('✅ Connected to MongoDB');

// Check driver exists
const driver = await Driver.findOne({ mobile: '8547126700' }).lean();
console.log('\n📱 Driver lookup by mobile 8547126700:');
if (driver) {
  console.log(`  ✅ Driver found: ${driver._id}`);
  console.log(`     Username: ${driver.username || 'N/A'}`);
  console.log(`     Mobile: ${driver.mobile}`);
} else {
  console.log('  ❌ Driver not found');
}

// Check all device tokens
const allTokens = await DeviceToken.find({}).lean();
console.log(`\n📱 Total device tokens in database: ${allTokens.length}`);
allTokens.forEach((t, i) => {
  console.log(`\n  Token ${i + 1}:`);
  console.log(`    FCM Token: ${t.token.substring(0, 30)}...`);
  console.log(`    User Type: ${t.userType}`);
  console.log(`    User ID: ${t.userId}`);
  console.log(`    Platform: ${t.platform || 'unknown'}`);
  console.log(`    Last Seen: ${t.lastSeen || 'N/A'}`);
});

// Check tokens specifically for this driver
if (driver) {
  const driverTokens = await DeviceToken.find({ 
    userType: 'driver', 
    userId: String(driver._id)
  }).lean();
  console.log(`\n📱 Device tokens for driver ${driver._id}: ${driverTokens.length}`);
}

// Close connection
await mongoose.connection.close();
console.log('\n✅ Connection closed');
