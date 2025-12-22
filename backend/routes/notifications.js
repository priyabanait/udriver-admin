import express from 'express';
import { listNotifications, markAsRead } from '../lib/notify.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await listNotifications({ page, limit });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notifications', error: err.message });
  }
});

router.post('/:id/read', async (req, res) => {
  try {
    const updated = await markAsRead(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark notification as read', error: err.message });
  }
});

export default router;
