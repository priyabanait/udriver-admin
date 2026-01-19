import mongoose from 'mongoose';

const InvestorWalletMessageSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.InvestorWalletMessage || mongoose.model('InvestorWalletMessage', InvestorWalletMessageSchema);
