import Notification from '../models/notification.js';
import { getIO } from './socket.js';

export async function createAndEmitNotification({ type, title, message, data = {} }) {
  try {
    const note = await Notification.create({ type, title, message, data });
    try {
      const io = getIO();
      io.emit('dashboard:notification', note);
    } catch (e) {
      // Socket not initialized yet; ignore emit
      console.warn('Socket emit skipped:', e.message);
    }
    return note;
  } catch (err) {
    console.error('Failed to create notification:', err);
    throw err;
  }
}

export async function listNotifications({ page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const total = await Notification.countDocuments();
  const items = await Notification.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
  return { items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function markAsRead(id) {
  return Notification.findByIdAndUpdate(id, { read: true }, { new: true }).lean();
}
