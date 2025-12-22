import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  type: { type: String, required: true },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  read: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
