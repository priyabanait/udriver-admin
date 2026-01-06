# udriver-backend (development)

This is a minimal Express backend scaffold that serves the frontend's mock data and provides simple auth.

Quick start (Windows CMD):

```cmd
cd "e:\\admin Udrive\\backend"
npm install
npm run dev
```

Endpoints (examples):
- GET /api/drivers
- GET /api/drivers/:id
- GET /api/drivers/earnings/summary
- POST /api/auth/login  { email, password }
- GET /api/vehicles
- GET /api/investors
- GET /api/driver-plans
- GET /api/investment-plans
- GET /api/transactions
- GET /api/tickets
- GET /api/employees
- GET /api/dashboard
- GET /api/static/driver-enrollments
- GET /api/static/vehicle-rent-slabs
- GET /api/payments/drivers
- GET /api/payments/drivers/:id
- POST /api/payments/drivers/create
- PUT /api/payments/drivers/:id
- DELETE /api/payments/drivers/:id
- POST /api/notifications/send-driver-by-mobile  { mobile, title, message, save (optional boolean) }  -> Sends a Firebase notification-only push to the given driver by mobile.
- POST /api/notifications/send-investor-by-mobile  { mobile, title, message, save (optional boolean) }  -> Sends a Firebase notification-only push to the given investor by mobile.
- POST /api/deviceTokens/register-driver-by-mobile  { mobile, token, platform } -> Register/assign FCM device token to a driver by mobile.
- POST /api/deviceTokens/register-investor-by-mobile  { mobile, token, platform } -> Register/assign FCM device token to an investor by mobile.

Auth: POST /api/auth/login returns { user, token }. Use `Authorization: Bearer <token>` to call protected endpoints (POST/PUT/DELETE)

Notes:
- The backend does NOT pre-populate domain mock data on startup. The database will remain empty until records are created by users via the API (for example, when forms are submitted in the frontend).
- The server will still create the necessary collections automatically when documents are inserted.
- For production, secure the JWT secret and use hashed passwords; do not keep plaintext passwords in the DB.

Import & Excel mapping (new):
- There is a script `backend/scripts/import-drivers.mjs` and an API endpoint `POST /api/drivers/import` that accept Excel/CSV files.
- The importer tries flexible header matching (multiple aliases) and will map common columns automatically: name, email, mobile/phone, aadhar, pan, license number, license expiry date, date of birth, license class, plan/plan type, experience, vehicle preference, address, city, state, pincode, bank, account number, ifsc, employee id.
- Dates from Excel (native date cells or common string formats) are normalized to YYYY-MM-DD.
- Missing/empty values are left undefined so they won't override existing DB values (safe merge behavior).
- New route: `GET /api/drivers/form/search/:phone` — flexible search by mobile or phone (supports last-10 digits match) to help the frontend auto-fill forms when a phone number is entered.

If you want additional column aliases or custom mapping rules, edit `scripts/import-drivers.mjs` and `routes/drivers.js` (import handler).
