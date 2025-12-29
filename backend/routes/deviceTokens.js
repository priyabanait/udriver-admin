import express from 'express';
import DeviceToken from '../models/deviceToken.js';

const router = express.Router();

// Register or upsert a device token
// body: { token, platform, userType, userId }
router.post('/', async (req, res) => {
  const { token, platform, userType, userId } = req.body || {};
  if (!token) return res.status(400).send({ error: 'token is required' });
  try {
    const doc = await DeviceToken.findOneAndUpdate(
      { token },
      { token, platform, userType, userId, lastSeen: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.send({ success: true, token: doc });
  } catch (err) {
    console.error('device-token upsert failed:', err);
    res.status(500).send({ error: 'failed to register token' });
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
