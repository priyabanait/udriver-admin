# Environment Variables Setup (.env file)

## Create .env file

Create a `.env` file in the `backend` directory with the following:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/udriver

# Server Configuration
PORT=4000

# ZWITCH Payment Gateway Configuration
# Get these from: https://developers.zwitch.io/ (Sandbox or Live)
ZWITCH_API_URL=https://api.zwitch.io/v1
ZWITCH_API_KEY=fcf9c150-d80d-11f0-8b47-9ba568f784bb
ZWITCH_API_SECRET=623d2a7c8427d434829abd0c1c41987e09d71bf2

# JWT Secret (for authentication)
JWT_SECRET=your_jwt_secret_here
```

## Priority Order

The system uses credentials in this order:

1. **Environment Variables (.env file)** - Highest priority
2. **Database Config** - Fallback if .env not set
3. **Default values** - Last resort

## How It Works

- If you set `ZWITCH_API_KEY` and `ZWITCH_API_SECRET` in `.env`, they will be used automatically
- No need to configure via API - just restart the server
- Changes in `.env` require server restart
- Database config can still be updated via API for real-time changes

## Steps

1. **Create `.env` file** in `backend` folder
2. **Add your ZWITCH credentials** (see above)
3. **Restart your server:**
   ```bash
   cd backend
   npm start
   ```
4. **Test the API** - It should work automatically!

## Verify It's Working

Check server console when starting - you should see:
```
✅ Using ZWITCH credentials from .env file
```

If you see:
```
✅ Using ZWITCH credentials from database
```
Then .env variables are not set, and it's using database config.

## Sandbox vs Live

For **Sandbox** (testing):
```env
ZWITCH_API_URL=https://api.zwitch.io/v1
ZWITCH_API_KEY=your_sandbox_key
ZWITCH_API_SECRET=your_sandbox_secret
```

For **Live** (production):
```env
ZWITCH_API_URL=https://api.zwitch.io/v1
ZWITCH_API_KEY=your_live_key
ZWITCH_API_SECRET=your_live_secret
```

## Security Note

⚠️ **Never commit `.env` file to git!**

The `.env` file should be in `.gitignore` to keep credentials secure.

