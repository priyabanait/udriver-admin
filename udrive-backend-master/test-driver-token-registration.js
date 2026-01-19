/**
 * Test script to verify driver device token registration endpoint
 * Usage: node test-driver-token-registration.js
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const API_URL = `${BASE_URL}/api/device-tokens/register-driver-by-mobile`;

// Test data - replace with actual driver mobile from your database
const testData = {
  mobile: '9999999999', // Replace with a valid mobile number from your Driver collection
  token: 'test_fcm_token_' + Date.now(),
  platform: 'android'
};

async function testDriverTokenRegistration() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 Testing Driver Device Token Registration');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📡 Endpoint:', API_URL);
  console.log('📦 Test Data:', JSON.stringify(testData, null, 2));
  console.log('');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    console.log('📥 Response Status:', response.status, response.statusText);
    console.log('📋 Response Headers:', Object.fromEntries(response.headers));
    
    const responseText = await response.text();
    console.log('📄 Response Body:', responseText);
    console.log('');

    let jsonResponse;
    try {
      jsonResponse = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse JSON response');
      return;
    }

    if (response.status === 200 || response.status === 201) {
      console.log('✅ SUCCESS: Driver device token registered successfully');
      console.log('📝 Token Details:', jsonResponse.token);
    } else if (response.status === 404) {
      console.log('⚠️  DRIVER NOT FOUND: No driver with mobile', testData.mobile);
      console.log('💡 Please update the "mobile" field in this test script with a valid driver mobile number');
      console.log('💡 You can find driver mobile numbers by querying your MongoDB drivers collection');
    } else if (response.status === 400) {
      console.log('❌ BAD REQUEST:', jsonResponse.error);
    } else {
      console.log('❌ FAILED:', jsonResponse);
    }
    
    console.log('═══════════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.log('');
    console.log('💡 Make sure:');
    console.log('   1. Backend server is running on', BASE_URL);
    console.log('   2. MongoDB is connected');
    console.log('   3. You have a driver with mobile:', testData.mobile);
    console.log('═══════════════════════════════════════════════════════════');
  }
}

// Run the test
testDriverTokenRegistration();
