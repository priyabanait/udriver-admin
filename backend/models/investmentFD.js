import mongoose from 'mongoose';

const investmentFDSchema = new mongoose.Schema({
  investorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InvestorSignup',
    default: null
  },
  investorName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  investmentDate: {
    type: Date,
    required: true
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['Cash', 'Bank Transfer', 'Cheque', 'Online', 'UPI']
  },
  investmentRate: {
    type: Number,
    required: true,
    min: 0
  },
  investmentAmount: {
    type: Number,
    required: true,
    min: 0
  },
  // Selected plan reference (optional)
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InvestmentPlan',
    default: null
  },
  // Denormalized plan name for quick listing
  planName: {
    type: String,
    default: ''
  },
  fdType: {
    type: String,
    enum: ['monthly', 'yearly'],
    required: true,
    default: 'monthly'
  },
  termMonths: {
     type: Number,
     min: 1,
     max: 120 // Increased max to 120 months (10 years)
  },
  termYears: {
    type: Number,
    min: 1,
    max: 10
  },
  status: {
    type: String,
    enum: ['active', 'matured', 'withdrawn'],
    default: 'active'
  },
  // Tax Deduction at Source on profit/interest
  tdsPercent: { type: Number, default: 0 },
  tdsAmount: { type: Number, default: 0 },
  maturityDate: {
    type: Date
  },
  notes: {
    type: String,
    default: ''
  },
  maturityAmount: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending'
  },
  paymentDate: {
    type: Date,
    default: null
  },
  paymentMode: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'Cheque', 'Online', 'UPI'],
    required: false
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
investmentFDSchema.index({ investorId: 1 });
investmentFDSchema.index({ investorName: 1 });
investmentFDSchema.index({ phone: 1 });
investmentFDSchema.index({ investmentDate: -1 });
investmentFDSchema.index({ status: 1 });

const InvestmentFD = mongoose.model('InvestmentFD', investmentFDSchema);

export default InvestmentFD;
