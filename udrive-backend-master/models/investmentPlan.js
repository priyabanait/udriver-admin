import mongoose from 'mongoose';

const InvestmentPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  minAmount: { type: Number, required: true },
  maxAmount: { type: Number, required: true },
  duration: { type: Number, required: true }, // in months
  expectedROI: { type: Number, required: true },
  riskLevel: { type: String, required: true, enum: ['low', 'medium', 'high'] },
  features: [String],
  active: { type: Boolean, default: true },
  // Additional fields for compatibility
  returnRate: Number,
  description: String,
  status: String,
  investorsCount: Number,
  totalInvested: Number
}, { timestamps: true });

export default mongoose.models.InvestmentPlan || mongoose.model('InvestmentPlan', InvestmentPlanSchema);
