import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';
import { connectDB, seedDB } from './db.js';
import http from 'http';
import { initSocket } from './lib/socket.js';
import { getFirebaseStatus, isFirebaseInitialized } from './lib/firebaseAdmin.js';

const app = express();
const PORT = process.env.PORT || 4000;

// ✅ Allow frontend devices (update origin if needed)
app.use(cors({
  origin: "*", // or "http://192.168.1.57:3000" for your frontend
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  // Ensure Authorization header is allowed for JWT auth
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.send({ status: 'udriver backend', version: '0.1.0' });
});

async function start() {
  try {
    await connectDB();
    await seedDB();

    // Optional: seed default roles when env flag is set
    if (process.env.SEED_DEFAULT_ROLES === 'true') {
      try {
        console.log('SEED_DEFAULT_ROLES=true — seeding default roles');
        // run the seed script
        await import('./scripts/seedRoles.mjs');
      } catch (err) {
        console.warn('Failed to seed roles:', err.message || err);
      }
    }

    // Check Firebase initialization status
    const fbStatus = getFirebaseStatus();
    if (fbStatus.initialized) {
      console.log('✅ Firebase Admin initialized successfully');
      console.log(`   Messaging available: ${fbStatus.messagingAvailable}`);
      console.log(`   sendMulticast available: ${fbStatus.sendMulticastAvailable}`);
    } else {
      console.warn('⚠️ Firebase Admin not initialized - push notifications will be disabled');
      console.warn('   Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS to enable');
    }

    // Create HTTP server and attach socket.io
    const server = http.createServer(app);
    initSocket(server);

    // Add Firebase status endpoint
    app.get('/api/firebase/status', (req, res) => {
      const status = getFirebaseStatus();
      res.json(status);
    });

    // ✅ Important: listen on all interfaces
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ udriver backend listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
