# ZWITCH Payment Collection Integration

This implementation allows collecting payments from drivers using ZWITCH Payment Gateway.

## Overview

- **Purpose**: Collect payments FROM drivers (not sending payouts TO drivers)
- **API Type**: ZWITCH Payment Gateway API (PG API Keys)
- **Integration Method**: Layer.js checkout for web payments

## Setup Instructions

### 1. Backend Configuration

Update your `backend/.env` file with ZWITCH PG API credentials:

```env
# ZWITCH Payment Gateway - PG API Keys (for collecting payments)
ZWITCH_API_URL=https://api.zwitch.io
ZWITCH_API_KEY=be4f4100-db39-11f0-aaa7-9963035a2f0d
ZWITCH_API_SECRET=a9893ee64e263b40ab41b8d2df88fc9b010b2a76

# Frontend URL for payment callbacks
FRONTEND_URL=http://localhost:5173
```

**Important**: 
- These are PG (Payment Gateway) API keys, NOT regular transfer API keys
- Sandbox mode endpoint: `https://api.zwitch.io/v1/pg/sandbox/payment_token`
- Production endpoint: `https://api.zwitch.io/v1/pg/payment_token`

### 2. Frontend Configuration

Create `.env` file in root directory (or update existing):

```env
# API Base URL
VITE_API_BASE=http://localhost:4000

# ZWITCH PG Access Key (public key, safe for frontend)
VITE_ZWITCH_ACCESS_KEY=be4f4100-db39-11f0-aaa7-9963035a2f0d
```

## How It Works

### Payment Flow

1. **Admin/Manager initiates payment collection**
   - Clicks "Collect Online" button for a driver with pending payments
   - System creates payment token via backend API

2. **Backend creates payment token**
   - Endpoint: `POST /api/payments/zwitch/create-token`
   - Calls ZWITCH: `POST /v1/pg/sandbox/payment_token`
   - Returns payment token to frontend

3. **Layer.js checkout opens**
   - Frontend loads Layer.js library from `https://checkout.zwitch.io/v1/layer.js`
   - Opens payment modal with UPI, cards, etc.
   - Driver completes payment

4. **Payment callback**
   - ZWITCH calls: `POST /api/payments/zwitch/callback`
   - Updates transaction status (captured/failed/cancelled)
   - Records payment in driver plan selection

5. **Success handling**
   - Updates payment record
   - Adds to driver payments array
   - Refreshes payment list

## API Endpoints

### Create Payment Token
```http
POST /api/payments/zwitch/create-token
Authorization: Bearer <token>
Content-Type: application/json

{
  "driverMobile": "9876543210",
  "amount": 5000,
  "driverName": "John Driver",
  "driverEmail": "driver@example.com",
  "description": "Payment for rent - KA01AB1234",
  "planSelectionId": "64abc123...",
  "paymentType": "rent"
}
```

Response:
```json
{
  "success": true,
  "message": "Payment token created successfully",
  "data": {
    "paymentToken": "pt_sandbox_abc123...",
    "merchantOrderId": "ORDER1234567890abc",
    "amount": 5000,
    "transactionId": "64xyz...",
    "driverName": "John Driver",
    "driverPhone": "9876543210"
  }
}
```

### Payment Callback (from ZWITCH)
```http
POST /api/payments/zwitch/callback
Content-Type: application/json

{
  "merchant_order_id": "ORDER1234567890abc",
  "payment_token": "pt_sandbox_abc123...",
  "status": "captured",  // or "failed", "cancelled"
  "payment_id": "pay_abc123...",
  "amount": 5000,
  "udf1": "64abc123...",  // driverId
  "udf2": "64xyz...",     // planSelectionId
  "udf3": "rent"          // paymentType
}
```

### Check Payment Status
```http
GET /api/payments/zwitch/status/:merchantOrderId
Authorization: Bearer <token>
```

## Frontend Usage

### Import Component
```jsx
import ZwitchPaymentModal from '../../components/payments/ZwitchPaymentModal';
```

### Use in Component
```jsx
const [showPaymentModal, setShowPaymentModal] = useState(false);
const [selectedPayment, setSelectedPayment] = useState(null);

const handleCollectPayment = (selection) => {
  const paymentData = {
    ...selection,
    totalPayable: selection.paymentDetails?.totalPayable || 0
  };
  setSelectedPayment(paymentData);
  setShowPaymentModal(true);
};

const handlePaymentSuccess = async (response) => {
  console.log('Payment completed', response);
  toast.success('Payment recorded successfully');
  fetchSelections(); // Refresh data
};

// In JSX:
<ZwitchPaymentModal
  isOpen={showPaymentModal}
  onClose={() => setShowPaymentModal(false)}
  selection={selectedPayment}
  onSuccess={handlePaymentSuccess}
/>
```

## Testing in Sandbox Mode

### Test Credentials
- **Access Key**: `be4f4100-db39-11f0-aaa7-9963035a2f0d`
- **Secret Key**: `a9893ee64e263b40ab41b8d2df88fc9b010b2a76`
- **API URL**: `https://api.zwitch.io`
- **Sandbox Endpoint**: `/v1/pg/sandbox/payment_token`

### Test Payments
In sandbox mode, you can test with:
- Test UPI IDs (ZWITCH provides test credentials)
- Test card numbers
- Test net banking

Payment will succeed in sandbox but won't charge real money.

## Production Deployment

1. **Switch to production endpoint**:
   - Change token endpoint from `/v1/pg/sandbox/payment_token` to `/v1/pg/payment_token`
   - Update in `backend/routes/payments.js` line ~145

2. **Get production API keys**:
   - Sign up/login to ZWITCH dashboard
   - Complete KYC verification
   - Get production PG API keys
   - Update `.env` files

3. **Configure webhook URL**:
   - Set webhook URL in ZWITCH dashboard
   - Should point to: `https://yourdomain.com/api/payments/zwitch/callback`
   - Enable webhook signature verification

4. **SSL Certificate**:
   - Ensure your domain has valid SSL certificate
   - ZWITCH requires HTTPS for production

## Troubleshooting

### Error: "Payment gateway not loaded"
- Check if Layer.js script loaded successfully
- Check browser console for script errors
- Verify `https://checkout.zwitch.io/v1/layer.js` is accessible

### Error: "Authentication failed"
- Verify API keys are correct in `.env`
- Check authorization format: `Bearer <Access_Key>:<Secret_Key>`
- Ensure using PG API keys (not transfer API keys)

### Error: "Transaction not found"
- Check if transaction was created in database
- Verify merchant_order_id matches
- Check callback endpoint received data

### Payment modal doesn't open
- Check browser console for errors
- Verify VITE_ZWITCH_ACCESS_KEY is set
- Check if payment token was created successfully

## Security Notes

1. **API Keys**:
   - NEVER commit `.env` files to git
   - Store secret keys only in backend
   - Frontend only needs public access key

2. **Payment Token**:
   - One-time use only
   - Expires after payment or timeout
   - Cannot be reused

3. **Callback Verification**:
   - Verify webhook signature in production
   - Check transaction status from database
   - Don't trust callback data blindly

4. **Amount Validation**:
   - Validate amounts on backend
   - Check min/max limits
   - Prevent negative amounts

## Support

For ZWITCH API support:
- Documentation: https://developers.zwitch.io/
- Support Email: support@zwitch.io
- Dashboard: https://dashboard.zwitch.io/

## Notes

- **Payment Collection vs Payouts**: This implementation is for COLLECTING payments (receiving money from drivers). For sending payouts TO drivers, you need Transfer API with virtual accounts.
- **Sandbox Mode**: All current API calls use sandbox mode. Update endpoint for production.
- **Layer.js**: Automatically handles payment UI, security, and PCI compliance.
