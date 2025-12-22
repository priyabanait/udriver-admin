import express from 'express';
import DriverWalletMessage from '../models/driverWalletMessage.js';

const router = express.Router();

// POST: Send message to admin
router.post('/', async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ error: 'Phone and message are required.' });
    }
    const msg = new DriverWalletMessage({ phone, message });
    await msg.save();
    // Create and emit dashboard notification
    try {
      const { createAndEmitNotification } = await import('../lib/notify.js');
      await createAndEmitNotification({
        type: 'driver_wallet_message',
        title: `Driver message from ${phone}`,
        message,
        data: { id: msg._id, phone }
      });
    } catch (err) {
      console.warn('Notify failed:', err.message);
    }
    res.status(201).json(msg);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message', message: error.message });
  }
});

// GET: Get all messages (for admin)
router.get('/', async (req, res) => {
  try {
    const messages = await DriverWalletMessage.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages', message: error.message });
  }
});

export default router;
