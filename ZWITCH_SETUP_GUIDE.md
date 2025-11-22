# ZWITCH Payment Gateway Integration - Setup Guide

## Overview
This integration enables real-time bank payouts to drivers via ZWITCH's payment infrastructure. Payments are processed instantly via IMPS/NEFT/RTGS.

## Features Implemented
✅ Real-time IMPS bank transfers
✅ Bank account verification
✅ Payment status tracking
✅ Webhook support for async updates
✅ Secure payment processing UI
✅ Transaction history integration

## Prerequisites
1. **ZWITCH Account**: Sign up at [https://zwitch.io/](https://zwitch.io/)
2. **API Credentials**: Obtain your API Key and Secret from ZWITCH dashboard
3. **KYC Verification**: Complete business KYC for live transactions

## Setup Instructions

### 1. Backend Configuration

#### Install Dependencies
```bash
cd backend
npm install axios
```

#### Environment Variables
Create or update `backend/.env` file:
```env
# ZWITCH Payment Gateway
ZWITCH_API_URL=https://api.zwitch.io/v1
ZWITCH_API_KEY=your_zwitch_api_key_here
ZWITCH_API_SECRET=your_zwitch_api_secret_here
```

**Important**: 
- For **testing/sandbox**: Use ZWITCH sandbox credentials
- For **production**: Use ZWITCH live credentials

#### Verify Backend Routes
Ensure `backend/routes/payments.js` is registered in `backend/routes/api.js`:
```javascript
import paymentsRouter from './payments.js';
router.use('/payments', paymentsRouter);
```

### 2. Frontend Configuration

No additional configuration needed. The frontend automatically uses:
```javascript
const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
```

### 3. Database Setup

The integration uses existing `Transaction` model. Ensure your MongoDB connection is configured in `backend/.env`:
```env
MONGODB_URI=mongodb://localhost:27017/udriver
```

## API Endpoints

### Process Payout
**POST** `/api/payments/zwitch/payout`
```json
{
  "driverId": 123,
  "amount": 5000,
  "accountNumber": "1234567890",
  "ifsc": "SBIN0001234",
  "accountHolderName": "John Doe",
  "purpose": "Driver Payment",
  "paymentId": "optional_existing_transaction_id"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Payment initiated successfully",
  "data": {
    "referenceId": "UDRIVER_1234567890_123",
    "zwitchTransactionId": "zwitch_txn_abc123",
    "status": "SUCCESS",
    "amount": 5000
  }
}
```

### Check Payment Status
**GET** `/api/payments/zwitch/status/:referenceId`

### Verify Bank Account
**POST** `/api/payments/zwitch/verify-account`
```json
{
  "accountNumber": "1234567890",
  "ifsc": "SBIN0001234"
}
```

### Webhook (for ZWITCH callbacks)
**POST** `/api/payments/zwitch/webhook`

## How to Use

### Processing a Payment

1. Navigate to **Driver Payments** page
2. Find a payment with status **Pending** or **Failed**
3. Click the **green Send icon** in the Actions column
4. A modal will appear with:
   - Payment amount and type
   - Bank details form (Account Number, IFSC, Account Holder Name)
5. Fill in the bank details (or verify pre-filled details)
6. Click **Process Payment**
7. The system will:
   - Validate bank details
   - Call ZWITCH API for instant transfer
   - Update payment status in real-time
   - Show success/failure notification

### Payment Flow

```
[Pending Payment] 
    ↓
[Click Process Payment Icon]
    ↓
[Enter Bank Details]
    ↓
[Submit to ZWITCH API]
    ↓
[IMPS Transfer Initiated]
    ↓
[Status Updated: Processing → Completed/Failed]
```

## ZWITCH Payment Modes

The integration supports:
- **IMPS** (Immediate Payment Service) - Instant, 24x7
- **NEFT** (National Electronic Funds Transfer) - Batched transfers
- **RTGS** (Real Time Gross Settlement) - For high-value transfers

Default mode is **IMPS** for instant payments.

## Security Features

1. **Server-side validation**: All payment requests validated on backend
2. **Authentication required**: JWT token required for all payment APIs
3. **Amount limits**: Min ₹1, Max ₹100,000 per transaction
4. **Bank details validation**: IFSC and account number pattern validation
5. **API credentials**: Stored in environment variables, never exposed to frontend

## Testing

### Using ZWITCH Sandbox

1. Sign up for ZWITCH sandbox account
2. Use sandbox credentials in `.env`
3. Use test bank account numbers provided by ZWITCH
4. Test payment flows without actual money transfer

### Test Credentials (Example)
```env
ZWITCH_API_URL=https://sandbox.zwitch.io/v1
ZWITCH_API_KEY=test_key_abc123
ZWITCH_API_SECRET=test_secret_xyz789
```

### Test Bank Account
```
Account Number: 9876543210
IFSC: SBIN0001234
Account Holder: Test Driver
```

## Error Handling

The integration handles common errors:
- ❌ Invalid bank details
- ❌ Insufficient balance (ZWITCH account)
- ❌ Network failures
- ❌ Invalid API credentials
- ❌ Amount limit violations

Errors are:
1. Logged in backend console
2. Shown to user via alert
3. Payment status updated to "failed" with reason

## Webhook Setup (Optional but Recommended)

Configure webhook URL in ZWITCH dashboard:
```
https://your-domain.com/api/payments/zwitch/webhook
```

Webhook events:
- `payout.success` - Payment completed successfully
- `payout.failed` - Payment failed
- `payout.pending` - Payment in progress

## Production Checklist

Before going live:
- [ ] Replace sandbox credentials with live ZWITCH credentials
- [ ] Complete business KYC with ZWITCH
- [ ] Fund your ZWITCH wallet
- [ ] Test with small amounts first
- [ ] Set up webhook endpoint with HTTPS
- [ ] Enable webhook signature verification
- [ ] Set up monitoring and alerts
- [ ] Configure payment limits as per business needs

## Troubleshooting

### Issue: "Payment gateway not configured"
**Solution**: Add ZWITCH_API_KEY and ZWITCH_API_SECRET to backend/.env

### Issue: "Failed to process payment"
**Solution**: 
1. Check ZWITCH API credentials
2. Verify ZWITCH wallet balance
3. Check backend logs for detailed error
4. Verify bank details format

### Issue: Payment stuck in "Processing"
**Solution**: 
1. Check payment status via API: `/api/payments/zwitch/status/:referenceId`
2. Contact ZWITCH support with reference ID
3. Webhook should auto-update status when complete

## Support

- **ZWITCH Documentation**: https://docs.zwitch.io/
- **ZWITCH Support**: support@zwitch.io
- **API Status**: https://status.zwitch.io/

## Files Modified/Created

### Backend
- ✅ `backend/routes/payments.js` - Payment gateway routes
- ✅ `backend/routes/api.js` - Route registration
- ✅ `backend/package.json` - Added axios dependency
- ✅ `backend/.env.example` - Environment variables template

### Frontend
- ✅ `src/utils/zwitchPayment.js` - ZWITCH API client
- ✅ `src/pages/drivers/DriverPayments.jsx` - UI with process payment button

## Next Steps

1. **Get ZWITCH Credentials**: Sign up at zwitch.io
2. **Configure Environment**: Add credentials to backend/.env
3. **Test in Sandbox**: Use test credentials first
4. **Go Live**: Switch to production credentials after testing

## Notes

- Payments are processed in **Indian Rupees (₹)**
- Amount is sent to ZWITCH in **paise** (multiply by 100)
- Default payment mode: **IMPS** (instant)
- Transaction reference format: `UDRIVER_{timestamp}_{driverId}`
