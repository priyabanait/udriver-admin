# Firebase Push Notification System - Complete Analysis

## 📋 Executive Summary

Your backend notification system is **fully configured and operational** with Firebase push notifications (FCM) supporting both **investor and driver apps** with targeted, user-specific delivery. The system includes multiple safeguards to prevent cross-app notification delivery.

---

## ✅ System Components & Flow

### 1. **Device Token Registration** 
**File:** [backend/routes/deviceTokens.js](backend/routes/deviceTokens.js)

Device tokens are registered via these endpoints:

#### For Drivers:
```javascript
POST /api/deviceTokens/register-driver-by-mobile
Body: { mobile, token, platform }
```
- Looks up driver by mobile number
- Stores device token with `userType: 'driver'` and `userId: driver._id`
- Generic endpoint also available: `POST /api/deviceTokens/`

#### For Investors:
```javascript
POST /api/deviceTokens/register-investor-by-mobile
Body: { mobile, token, platform }
```
- Looks up investor by phone number  
- Stores device token with `userType: 'investor'` and `userId: investor._id`

**Key Features:**
- ✅ Unique token constraint (prevents duplicates)
- ✅ Tracks `lastSeen` for token lifecycle
- ✅ Warns if token is reassigned between users
- ✅ Stores platform info (iOS, Android, web)

---

### 2. **Notification Database Model**
**File:** [backend/models/notification.js](backend/models/notification.js)

```javascript
{
  type: String,           // Notification type (e.g., 'transaction', 'payment')
  title: String,          // Notification title
  message: String,        // Notification body
  data: Mixed,            // Additional payload data
  recipientType: String,  // 'driver' | 'investor' | null (broadcast)
  recipientId: String,    // Specific user ID (normalized to string)
  read: Boolean,          // Read status
  timestamps: true        // createdAt, updatedAt
}
```

**Recipient Targeting:**
- `recipientType + recipientId` = Send to specific user
- `recipientType` only = Broadcast to all users of that type
- Neither = Admin/dashboard only

---

### 3. **Core Notification Engine**
**File:** [backend/lib/notify.js](backend/lib/notify.js)

Main function: `createAndEmitNotification()`

#### Flow for Sending Notifications to Specific Users:

```javascript
// Example: Send to specific driver
await createAndEmitNotification({
  type: 'transaction',
  title: 'Payment Received',
  message: '$500 credited to your account',
  data: { transactionId: 'xyz' },
  recipientType: 'driver',      // ✅ Targets driver app
  recipientId: driverId         // ✅ Targets specific driver
});
```

#### What Happens:

1. **Normalization** (Lines 14-21)
   - Converts `recipientId` to string for consistent querying
   - Converts `recipientType` to lowercase

2. **Database Save** (Lines 48-56)
   - Stores notification in MongoDB

3. **Socket Emission** (Lines 78-160)
   - Emits to admin/dashboard rooms
   - If `recipientType` & `recipientId` provided:
     - Emits to `driver:${driverId}` room
     - Emits to `investor:${investorId}` room
   - Verifies recipient exists before emitting (prevents stale signals)
   - Handles DriverSignup → Driver ID conversion

4. **FCM Push Notification** (Lines 162-280)
   - **Critical**: Only sends if `recipientType` is specified
   - Retrieves device tokens from `DeviceToken` collection:
     ```javascript
     DeviceToken.find({
       userType: 'driver',        // or 'investor'
       userId: actualUserId       // Specific user's ID
     })
     ```
   - Builds FCM payload with title, body, and data
   - Sends to all tokens found for that user
   - **Cleans up invalid tokens automatically**

---

### 4. **Firebase Admin SDK Integration**
**File:** [backend/lib/firebaseAdmin.js](backend/lib/firebaseAdmin.js)

#### Initialization:
Firebase is initialized in priority order:
1. `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable (production)
2. `GOOGLE_APPLICATION_CREDENTIALS` (Google Application Credentials)
3. Local JSON file (local development)

**Status Function:**
```javascript
GET /api/notifications/admin/status
Returns: Firebase initialization status, messaging availability, SDK methods
```

#### Push Sending: `sendPushToTokens(tokens, { title, body, data })`

Methods used (in order of availability):
1. ✅ **`sendEachForMulticast()`** (Firebase Admin SDK v11+) - Recommended
2. ✅ **`sendMulticast()`** (Legacy) - Fallback
3. ✅ **`sendEach()`** (Firebase Admin SDK v9+) - Alternative

**Features:**
- Handles up to 500 tokens per call (FCM limit)
- Detailed error logging for failed tokens
- Returns: `{ successCount, failureCount, responses }`
- **Automatic token cleanup** on invalid token errors

---

## 🔄 Real-World Notification Examples

### Example 1: Transaction Notification to Driver
**File:** [backend/routes/transactions.js](backend/routes/transactions.js#L108-L122)

```javascript
if (tx.driverId) {
  await createAndEmitNotification({
    type: 'transaction',
    title: `Transaction ${tx.id} - ${tx.status}`,
    message: `Amount: ${tx.amount}`,
    data: { id: tx._id, txId: tx.id },
    recipientType: 'driver',      // ✅ Sends to driver app
    recipientId: tx.driverId      // ✅ Targets specific driver
  });
}
```

### Example 2: Vehicle Assignment Notification
**File:** [backend/routes/vehicles.js](backend/routes/vehicles.js#L406-L420)

```javascript
// Notify the assigned driver
await createAndEmitNotification({
  type: 'vehicle_assignment',
  title: 'New Vehicle Assigned',
  message: `Vehicle ${vehicle.registrationNumber} assigned to you`,
  data: { vehicleId: vehicle._id },
  recipientType: 'driver',
  recipientId: driverId
});

// Notify the vehicle owner (investor)
await createAndEmitNotification({
  type: 'vehicle_assignment',
  title: 'Vehicle Assigned',
  message: `Vehicle assigned to driver ${driver.name}`,
  data: { vehicleId: vehicle._id },
  recipientType: 'investor',
  recipientId: investorId
});
```

### Example 3: Payment Notification
**File:** [backend/routes/payments.js](backend/routes/payments.js#L689-L700)

```javascript
// Notify both investor and driver about payment
await createAndEmitNotification({
  type: 'payment',
  title: 'Payment Processed',
  message: `${amount} processed successfully`,
  recipientType: 'investor',
  recipientId: investorId
});

await createAndEmitNotification({
  type: 'payment',
  title: 'Commission Earned',
  message: `${commission} credited to your account`,
  recipientType: 'driver',
  recipientId: driverId
});
```

---

## 📱 API Endpoints for Notifications

### Client Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/notifications/` | Get notifications with pagination |
| `GET` | `/api/notifications/investor/:investorId` | Notifications for specific investor |
| `GET` | `/api/notifications/driver/:driverId` | Notifications for specific driver |
| `POST` | `/api/notifications/investor/:investorId/read-all` | Mark all investor notifications as read |
| `POST` | `/api/notifications/driver/:driverId/read-all` | Mark all driver notifications as read |
| `POST` | `/api/notifications/:id/read` | Mark single notification as read |

### Admin/Backend Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/notifications/` | Create notification manually |
| `POST` | `/api/notifications/admin/send` | Broadcast to all driver/investor users |
| `POST` | `/api/notifications/admin/send-specific` | Send to specific drivers/investors |
| `GET` | `/api/notifications/admin/drivers` | List drivers for selection |
| `GET` | `/api/notifications/admin/investors` | List investors for selection |
| `GET` | `/api/notifications/debug/all` | Debug: List all notifications |

### Device Token Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/deviceTokens/` | Register device token (generic) |
| `POST` | `/api/deviceTokens/register-driver-by-mobile` | Register driver token by mobile |
| `POST` | `/api/deviceTokens/register-investor-by-mobile` | Register investor token by phone |
| `DELETE` | `/api/deviceTokens/:token` | Unregister device token |

---

## 🛡️ Safety Mechanisms

### 1. **Recipient Verification**
Before sending FCM, the system verifies the recipient exists:
- Checks if Driver or Investor exists in database
- Handles DriverSignup → Driver ID conversion
- Prevents notifications to deleted/non-existent users

### 2. **Cross-App Prevention**
```javascript
// Only sends if recipientType is specified
// Prevents accidental broadcast to wrong app
if (normalizedRecipientType && normalizedRecipientId) {
  // Send to specific user only
} else if (normalizedRecipientType) {
  // Broadcast to all users of that type only
} else {
  // No FCM sent (dashboard/admin only)
}
```

### 3. **Invalid Token Cleanup**
After sending, failed tokens are automatically removed:
```javascript
if (result.invalidTokens && result.invalidTokens.length > 0) {
  await DeviceToken.deleteMany({
    token: { $in: result.invalidTokens },
    userType: normalizedRecipientType
  });
}
```

### 4. **Comprehensive Logging**
Every step is logged with context:
- Device token lookup/registration
- Recipient verification
- FCM send attempts and results
- Token failures and cleanups

---

## 🔍 Notification Targeting Rules

### ✅ Correct Usage (Will Send FCM):

```javascript
// Send to specific driver
recipientType: 'driver', recipientId: driverId
// → Sends to all device tokens where userType='driver' AND userId=driverId

// Send to specific investor  
recipientType: 'investor', recipientId: investorId
// → Sends to all device tokens where userType='investor' AND userId=investorId

// Broadcast to all drivers
recipientType: 'driver', recipientId: null
// → Sends to all device tokens where userType='driver'

// Broadcast to all investors
recipientType: 'investor', recipientId: null
// → Sends to all device tokens where userType='investor'
```

### ❌ Will NOT Send FCM:

```javascript
recipientType: null, recipientId: null
// → No FCM sent (only socket emit to admin/dashboard)

recipientType: 'driver_signup', recipientId: signupId
// → Skipped (signup-targeted notifications blocked)
```

---

## 🔧 How to Test Notifications

### 1. Register Device Token
```bash
curl -X POST http://localhost:5000/api/deviceTokens/register-driver-by-mobile \
  -H "Content-Type: application/json" \
  -d '{
    "mobile": "+1234567890",
    "token": "driver_fcm_token_here",
    "platform": "android"
  }'
```

### 2. Send Test Notification
```bash
curl -X POST http://localhost:5000/api/notifications/ \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test",
    "title": "Test Notification",
    "message": "This is a test notification",
    "recipientType": "driver",
    "recipientId": "driver_id_here"
  }'
```

### 3. Check Device Tokens
```bash
# In MongoDB
db.devicetokens.find({ userType: 'driver' })
```

### 4. Check Notification History
```bash
curl http://localhost:5000/api/notifications/driver/driver_id_here
```

---

## 🐛 Debugging Checklist

| Issue | Debug Steps |
|-------|-------------|
| Notifications not received | 1. Check if FCM token registered: `db.devicetokens.find({token: '...'})` <br> 2. Verify Firebase initialized: Check logs for "✅ Firebase admin initialized" <br> 3. Check notification created: `GET /api/notifications/debug/all` <br> 4. Check FCM response in console for errors |
| Wrong app receiving notifications | 1. Check device token `userType` is correct ('driver' or 'investor') <br> 2. Verify `recipientType` in notification matches <br> 3. Check for token reassignment warnings in logs |
| Notification sent to wrong user | 1. Verify `userId` in DeviceToken matches recipient ID <br> 2. Check for DriverSignup → Driver ID conversion issues <br> 3. Review recipient verification logs |
| Tokens not being cleaned up | 1. Check FCM response for `invalidTokens` array <br> 2. Verify MongoDB write permissions <br> 3. Check for cleanup errors in logs |

---

## 📊 Current Implementation Status

### ✅ Fully Implemented:
- [x] Firebase Admin SDK initialization
- [x] Device token registration (driver, investor)
- [x] Targeted notifications to specific users
- [x] Broadcast notifications to app types
- [x] Automatic invalid token cleanup
- [x] Socket.io integration for real-time UI updates
- [x] Recipient verification before sending
- [x] Cross-app prevention
- [x] Comprehensive logging
- [x] Admin dashboard for sending notifications
- [x] Notification read status tracking
- [x] Multiple FCM sending methods (sendEachForMulticast, sendEach, etc.)

### ⚠️ Considerations:
- **Scheduled Notifications**: Currently creates notifications but scheduling is TODO (needs job queue like Bull or Agenda)
- **Token Expiry**: Tracks `lastSeen` but doesn't auto-expire old tokens
- **Rate Limiting**: No rate limiting on notification sending

---

## 🚀 How Notifications Flow in Your System

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. EVENT TRIGGERED                                              │
│ (Payment, Transaction, Vehicle Assignment, etc.)               │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. CALL createAndEmitNotification()                             │
│ notify.js:10-966                                               │
│ Input: type, title, message, recipientType, recipientId        │
└────────────────┬────────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
    ┌───────────┐    ┌──────────────┐
    │ NORMALIZE │    │ SAVE TO DB   │
    │ IDs       │    │ Notification │
    └─────┬─────┘    └──────┬───────┘
        │                   │
        └───────┬───────────┘
                │
        ┌───────┴───────┐
        │               │
        ▼               ▼
    ┌────────────┐  ┌──────────────────┐
    │ SOCKET.IO  │  │ VERIFY RECIPIENT │
    │ Emit to    │  │ Check DB         │
    │ Admin/     │  │ DriverSignup→ID  │
    │ Dashboard  │  └──────┬───────────┘
    └────────────┘         │
                    ┌───────┴────────┐
                    │                │
                    ▼                ▼
              ┌────────────┐   ┌──────────────┐
              │ NOT FOUND  │   │ FOUND        │
              │ Skip FCM   │   │ Find Tokens  │
              └────────────┘   └──────┬───────┘
                                     │
                              ┌──────▼───────┐
                              │ Query        │
                              │ DeviceToken  │
                              │ Collection   │
                              └──────┬───────┘
                                     │
                        ┌────────────┴────────────┐
                        │                         │
                        ▼                         ▼
                  ┌──────────────┐        ┌──────────────┐
                  │ TOKENS FOUND │        │ NO TOKENS    │
                  │ (0 to many)  │        │ Log warning  │
                  └──────┬───────┘        └──────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ BUILD FCM    │
                  │ PAYLOAD      │
                  │ title, body, │
                  │ data, tokens │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────────────┐
                  │ SEND VIA FCM         │
                  │ sendEachForMulticast │
                  │ (or fallback method) │
                  └──────┬───────────────┘
                         │
          ┌──────────────┬┴───────────┬──────────┐
          │              │            │          │
          ▼              ▼            ▼          ▼
    ┌─────────┐   ┌───────────┐ ┌────────┐ ┌──────────┐
    │ SUCCESS │   │ PARTIAL   │ │ FAILED │ │ CLEANUP  │
    │ All sent│   │ Some sent │ │ All    │ │ Invalid  │
    └─────────┘   │ Some fail │ │ failed │ │ tokens   │
                  └───────────┘ └────────┘ └──────────┘
                         │                       │
                         └───────────┬───────────┘
                                     │
                                     ▼
                          ┌────────────────────┐
                          │ DELETE FROM        │
                          │ DeviceToken        │
                          │ (invalid tokens)   │
                          └────────────────────┘
```

---

## 📌 Summary

**Your system WILL send Firebase push notifications to investor and driver apps for specific users** with:
- ✅ Proper targeting (specific user, not broadcast)
- ✅ Cross-app prevention (driver notifications only to driver app)
- ✅ Automatic token management (cleanup invalid tokens)
- ✅ Real-time socket.io integration
- ✅ Database persistence
- ✅ Comprehensive logging for debugging

The implementation is production-ready with multiple safeguards in place.

