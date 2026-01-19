import mongoose from 'mongoose';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import DeviceToken from './models/deviceToken.js';

dotenv.config();

// Initialize Firebase Admin
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!serviceAccountJson) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT_JSON not found in environment');
  process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountJson);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

console.log('✅ Firebase Admin initialized');

// Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI);
console.log('✅ Connected to MongoDB');

// Find device tokens for the driver
const driverId = '693167edac4ea1eb9c6796ed'; // CORRECT Driver._id from database
const tokens = await DeviceToken.find({ 
  userType: 'driver', 
  userId: driverId 
}).lean();

console.log(`📱 Found ${tokens.length} device token(s) for driver ${driverId}`);
tokens.forEach((t, i) => {
  console.log(`  ${i + 1}. Token: ${t.token.substring(0, 20)}... Platform: ${t.platform || 'unknown'}`);
});

if (tokens.length === 0) {
  console.log('❌ No device tokens found! Cannot send notification.');
  await mongoose.connection.close();
  process.exit(1);
}

// Prepare FCM message
const fcmTokens = tokens.map(t => t.token);
const message = {
  notification: {
    title: '🔔 Test Notification',
    body: 'This is a test notification to verify FCM is working!',
  },
  data: {
    type: 'test',
    message: 'Testing notification delivery',
    timestamp: new Date().toISOString(),
  },
  tokens: fcmTokens,
};

console.log('\n📤 Sending test notification...');

try {
  const response = await admin.messaging().sendEachForMulticast(message);
  console.log(`✅ FCM sendEachForMulticast: ${response.successCount} successful, ${response.failureCount} failed`);
  
  if (response.failureCount > 0) {
    console.log('\n❌ Failures:');
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        console.log(`  Token ${idx + 1}: ${resp.error?.message || 'Unknown error'}`);
      }
    });
  }
} catch (error) {
  console.error('❌ Error sending notification:', error);
}

// Close connection
await mongoose.connection.close();
console.log('✅ Connection closed');
