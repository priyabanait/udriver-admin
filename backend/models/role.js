import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  permissions: { type: [String], default: [] },
  color: { type: String, default: 'gray' },
}, { timestamps: true });

export default mongoose.model('Role', RoleSchema);
