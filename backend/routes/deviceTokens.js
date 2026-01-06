import express from 'express';
import DeviceToken from '../models/deviceToken.js';
import Driver from '../models/driver.js';
import Investor from '../models/investor.js';

const router = express.Router();

// Register or upsert a device token
// body: { token, platform, userType, userId }
router.post('/', async (req, res) => {
  let { token, platform, userType, userId } = req.body || {};
  if (!token) return res.status(400).send({ error: 'token is required' });

  // Normalize userType and userId for consistent storage
  if (userType) userType = String(userType).toLowerCase();
  if (userId) userId = String(userId);

  try {
    // Log previous mapping (if any) to help debug cross-delivery issues
    const prev = await DeviceToken.findOne({ token }).lean();
    if (prev) {
      console.log('[DeviceToken] Upsert: existing token found', { token: token.substring(0, 12) + '...', prevUserType: prev.userType, prevUserId: prev.userId });
    } else {
      console.log('[DeviceToken] Upsert: new token registering', { token: token.substring(0, 12) + '...' });
    }

    const doc = await DeviceToken.findOneAndUpdate(
      { token },
      { token, platform, userType, userId, lastSeen: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Log new mapping for visibility
    console.log('[DeviceToken] Upsert result', { token: token.substring(0, 12) + '...', userType: doc.userType, userId: doc.userId });

    res.send({ success: true, token: doc });
  } catch (err) {
    console.error('device-token upsert failed:', err);
    res.status(500).send({ error: 'failed to register token' });
  }
});

// Register driver token by mobile
// POST /api/deviceTokens/register-driver-by-mobile
// body: { mobile, token, platform }
router.post('/register-driver-by-mobile', async (req, res) => {
  try {
    const { mobile, token, platform } = req.body || {};
    if (!mobile) return res.status(400).json({ error: 'mobile is required' });
    if (!token) return res.status(400).json({ error: 'token is required' });

    const normalized = String(mobile).trim();
    const driver = await Driver.findOne({ mobile: normalized }).lean();
    if (!driver) return res.status(404).json({ error: 'Driver not found for given mobile' });

    // Log previous mapping for visibility
    const prev = await DeviceToken.findOne({ token }).lean();
    if (prev) console.log('[DeviceToken] register-driver-by-mobile: existing token', { token: token.substring(0,12) + '...', prevUserType: prev.userType, prevUserId: prev.userId });

    const doc = await DeviceToken.findOneAndUpdate(
      { token },
      { token, platform, userType: 'driver', userId: String(driver._id), lastSeen: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('[DeviceToken] register-driver-by-mobile: upsert result', { token: token.substring(0,12) + '...', userType: doc.userType, userId: doc.userId });

    // If this token was previously owned by a different user, include that information so the client can react
    let reassignedFrom = null;
    if (prev && (prev.userType !== 'driver' || String(prev.userId) !== String(driver._id))) {
      reassignedFrom = { userType: prev.userType, userId: prev.userId };
      console.warn('[DeviceToken] register-driver-by-mobile: token reassigned', { token: token.substring(0,12) + '...', reassignedFrom });
    }

    res.json({ success: true, token: doc, reassignedFrom });
  } catch (err) {
    console.error('register-driver-by-mobile failed:', err);
    res.status(500).json({ error: 'failed to register driver token' });
  }
});

// Register investor token by mobile
// POST /api/deviceTokens/register-investor-by-mobile
// body: { mobile, token, platform }
router.post('/register-investor-by-mobile', async (req, res) => {
  try {
    const { mobile, token, platform } = req.body || {};
    if (!mobile) return res.status(400).json({ error: 'mobile is required' });
    if (!token) return res.status(400).json({ error: 'token is required' });

    const normalized = String(mobile).trim();
    const investor = await Investor.findOne({ phone: normalized }).lean();
    if (!investor) return res.status(404).json({ error: 'Investor not found for given mobile' });

    // Log previous mapping for visibility
    const prev = await DeviceToken.findOne({ token }).lean();
    if (prev) console.log('[DeviceToken] register-investor-by-mobile: existing token', { token: token.substring(0,12) + '...', prevUserType: prev.userType, prevUserId: prev.userId });

    const doc = await DeviceToken.findOneAndUpdate(
      { token },
      { token, platform, userType: 'investor', userId: String(investor._id), lastSeen: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('[DeviceToken] register-investor-by-mobile: upsert result', { token: token.substring(0,12) + '...', userType: doc.userType, userId: doc.userId });

    // If this token was previously owned by a different user, include that information so the client can react
    let reassignedFrom = null;
    if (prev && (prev.userType !== 'investor' || String(prev.userId) !== String(investor._id))) {
      reassignedFrom = { userType: prev.userType, userId: prev.userId };
      console.warn('[DeviceToken] register-investor-by-mobile: token reassigned', { token: token.substring(0,12) + '...', reassignedFrom });
    }

    res.json({ success: true, token: doc, reassignedFrom });
  } catch (err) {
    console.error('register-investor-by-mobile failed:', err);
    res.status(500).json({ error: 'failed to register investor token' });
  }
});

// Remove a token
router.delete('/:token', async (req, res) => {
  const { token } = req.params;
  try {
    await DeviceToken.deleteOne({ token });
    res.send({ success: true });
  } catch (err) {
    console.error('device-token delete failed:', err);
    res.status(500).send({ error: 'failed to delete token' });
  }
});

// Debug: lookup a token record (helps verify which app/user the token belongs to)
router.get('/token/:tok', async (req, res) => {
  try {
    const { tok } = req.params;
    if (!tok) return res.status(400).json({ message: 'token is required' });
    const doc = await DeviceToken.findOne({ token: tok }).lean();
    if (!doc) return res.status(404).json({ message: 'token not found' });
    res.json({ token: doc });
  } catch (err) {
    console.error('device-token lookup failed:', err);
    res.status(500).json({ error: 'failed to lookup token' });
  }
});

// List tokens for a user (optional)
// query params: userType, userId
router.get('/', async (req, res) => {
  const { userType, userId, limit = 100 } = req.query;
  const q = {};
  if (userType) q.userType = userType;
  if (userId) q.userId = userId;
  try {
    const items = await DeviceToken.find(q).limit(Number(limit)).lean();
    res.send({ items });
  } catch (err) {
    console.error('device-token list failed:', err);
    res.status(500).send({ error: 'failed to list tokens' });
  }
});

export default router;
