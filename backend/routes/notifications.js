import express from 'express';
import { listNotifications, markAsRead } from '../lib/notify.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    console.log('GET /api/notifications - Query params:', req.query);
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Cap at 100
    const { driverId, investorId, recipientType, recipientId } = req.query;
    console.log('Calling listNotifications with:', { page, limit, driverId, investorId, recipientType, recipientId });
    const result = await listNotifications({ page, limit, driverId, investorId, recipientType, recipientId });
    // Ensure consistent response format
    if (result && result.items) {
      console.log('Returning', result.items.length, 'notifications');
      res.json(result);
    } else {
      console.log('No result or items, returning empty array');
      res.json({ items: [], pagination: { total: 0, page, limit, totalPages: 0 } });
    }
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Failed to fetch notifications', error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { type, title, message, data, recipientType, recipientId } = req.body || {};
    if (!type || (!title && !message)) {
      return res.status(400).json({ message: 'type and title/message required' });
    }
    const { createAndEmitNotification } = await import('../lib/notify.js');
    const note = await createAndEmitNotification({ type, title, message, data, recipientType, recipientId });
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create notification', error: err.message });
  }
});

router.post('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Notification ID is required' });
    }
    const updated = await markAsRead(id);
    if (!updated) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json(updated);
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ message: 'Failed to mark notification as read', error: err.message });
  }
});

export default router;
