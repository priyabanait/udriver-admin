import axios from 'axios';

const apiUrl = 'https://api.zwitch.io';
const apiKey = 'a55ad409-80be-4d64-b3bf-4df213e74c18';
const apiSecret = '6fc5c6796cb7d8389e2bd75821986e1b14f33c042dcba5498c80a2622fffd2c9';

const payload = {
  amount: 100,
  contact_number: "9999999999",
  email_id: "test@example.com",
  currency: 'INR',
  mtx: `TEST${Date.now()}`
};

const bearerToken = `${apiKey}:${apiSecret}`;

console.log('Testing Zwitch API...');
console.log('Payload:', JSON.stringify(payload, null, 2));

axios.post(
  `${apiUrl}/v1/pg/payment_token`,
  payload,
  {
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }
)
.then(response => {
  console.log('\n✅ SUCCESS - Full Response:');
  console.log(JSON.stringify(response.data, null, 2));
  console.log('\n📋 Available fields:');
  console.log(Object.keys(response.data));
})
.catch(error => {
  console.log('\n❌ ERROR:');
  console.log('Status:', error.response?.status);
  console.log('Data:', JSON.stringify(error.response?.data, null, 2));
});
