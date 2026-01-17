# Driver Authentication APIs

## Base URL
```
http://localhost:4000/api/drivers
```

---

## 1. SIGNUP (Username/Password)

### Endpoint
```
POST /api/drivers/signup
```

### Request Body
```json
{
  "username": "john_driver",
  "mobile": "9876543210",
  "password": "password123"
}
```

### Required Fields
- `username` (string) - Unique driver username
- `mobile` (string) - Unique mobile number
- `password` (string) - Password for login

### Response (Success - 200)
```json
{
  "message": "Signup successful.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "driver": {
    "id": "507f1f77bcf86cd799439011",
    "username": "john_driver",
    "mobile": "9876543210",
    "registrationCompleted": false
  }
}
```

### Response (Error - 400)
```json
{
  "message": "Username already exists."
}
```
or
```json
{
  "message": "Mobile number already registered."
}
```

---

## 2. LOGIN (Username/Password)

### Endpoint
```
POST /api/drivers/login
```

### Request Body
```json
{
  "username": "john_driver",
  "password": "password123"
}
```

### Required Fields
- `username` (string) - Driver username
- `password` (string) - Driver password

### Response (Success - 200)
```json
{
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "driver": {
    "id": "507f1f77bcf86cd799439011",
    "username": "john_driver",
    "mobile": "9876543210"
  }
}
```

### Response (Error - 401)
```json
{
  "message": "Invalid credentials."
}
```

---

## 3. SIGNUP (OTP)

### Endpoint
```
POST /api/drivers/signup-otp
```

### Request Body
```json
{
  "mobile": "9876543210",
  "otp": "123456",
  "username": "john_driver"
}
```

### Required Fields
- `mobile` (string) - Unique mobile number
- `otp` (string) - One-time password (stored as password)
- `username` (string, optional) - Driver username

### Response (Success - 200)
```json
{
  "message": "Signup successful.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "driver": {
    "id": "507f1f77bcf86cd799439011",
    "username": "john_driver",
    "mobile": "9876543210",
    "registrationCompleted": false
  }
}
```

---

## 4. LOGIN (OTP)

### Endpoint
```
POST /api/drivers/login-otp
```

### Request Body (Option 1 - Using Mobile)
```json
{
  "mobile": "9876543210",
  "otp": "123456"
}
```

### Request Body (Option 2 - Using Username)
```json
{
  "username": "john_driver",
  "otp": "123456"
}
```

### Required Fields
- `mobile` (string) OR `username` (string) - Mobile number or username registered during signup
- `otp` (string) - OTP (must match password from signup)

**Note:** Provide either `mobile` or `username`, not both.

### Response (Success - 200)
```json
{
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "driver": {
    "id": "507f1f77bcf86cd799439011",
    "username": "john_driver",
    "mobile": "9876543210",
    "registrationCompleted": false
  }
}
```

### Response (Error - 401)
```json
{
  "message": "Invalid mobile number or OTP."
}
```
or
```json
{
  "message": "Invalid username or OTP."
}
```
or
```json
{
  "message": "Invalid OTP."
}
```

---

## 5. FORGOT PASSWORD

### Endpoint
```
POST /api/drivers/forgot-password
```

### Request Body
```json
{
  "mobile": "9876543210",
  "newPassword": "newpassword123"
}
```

### Required Fields
- `mobile` (string) - Driver's mobile number
- `newPassword` (string) - New password to set

### Response (Success - 200)
```json
{
  "message": "Password updated successfully.",
  "driver": {
    "id": "507f1f77bcf86cd799439011",
    "mobile": "9876543210"
  }
}
```

### Response (Error - 404)
```json
{
  "message": "Driver not found."
}
```

---

## Authentication

### Using Token
Include the JWT token in the Authorization header for protected routes:

```
Authorization: Bearer <token>
```

### Token Expiration
- Tokens expire in 30 days
- After expiration, user needs to login again

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "Username, mobile and password required."
}
```

### 401 Unauthorized
```json
{
  "message": "Invalid credentials."
}
```

### 404 Not Found
```json
{
  "message": "Driver not found."
}
```

### 500 Server Error
```json
{
  "message": "Server error during signup."
}
```

---

## Example cURL Requests

### Signup
```bash
curl -X POST http://localhost:4000/api/drivers/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"john_driver","mobile":"9876543210","password":"password123"}'
```

### Login
```bash
curl -X POST http://localhost:4000/api/drivers/login \
  -H "Content-Type: application/json" \
  -d '{"username":"john_driver","password":"password123"}'
```

### Login with OTP (Mobile)
```bash
curl -X POST http://localhost:4000/api/drivers/login-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9876543210","otp":"123456"}'
```

### Login with OTP (Username)
```bash
curl -X POST http://localhost:4000/api/drivers/login-otp \
  -H "Content-Type: application/json" \
  -d '{"username":"john_driver","otp":"123456"}'
```

### Forgot Password
```bash
curl -X POST http://localhost:4000/api/drivers/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9876543210","newPassword":"newpassword123"}'
```

---

## Collections

### Driver Collection
All driver data (signup and full profile) is stored in the Driver collection. Fields are stored as plain text.

---

## Notes
- Passwords are stored as plain text (consider hashing in production)
- Mobile numbers must be unique per registration method
- OTP is used as password during signup-otp
- Upon signup, `registrationCompleted` is false - becomes true after full profile completion
- Admin is notified of every new driver signup
