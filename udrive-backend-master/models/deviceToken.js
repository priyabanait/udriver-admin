import mongoose from 'mongoose';

const DeviceTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  platform: { type: String }, // e.g., 'android', 'ios', 'web'
  userType: { type: String }, // 'driver', 'investor', 'admin', etc.
  userId: { type: String },
  lastSeen: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.DeviceToken || mongoose.model('DeviceToken', DeviceTokenSchema);
