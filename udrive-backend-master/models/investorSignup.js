import mongoose from 'mongoose';

const InvestorSignupSchema = new mongoose.Schema({
  investorName: { type: String, required: true },
  email: { type: String, required: false },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  status: { type: String, default: 'pending', enum: ['pending', 'active', 'inactive'] },
  kycStatus: { type: String, default: 'pending', enum: ['pending', 'verified', 'rejected'] },
  signupDate: { type: Date, default: Date.now },
  registrationCompleted: { type: Boolean, default: false },
  // Store full registration details
  address: String,
  city: String,
  state: String,
  pincode: String,
  dateOfBirth: String,
  aadharNumber: String,
  panNumber: String,
  bankName: String,
  accountNumber: String,
  ifscCode: String,
  accountHolderName: String,
  accountBranchName: String,
  profilePhoto: String,
  aadharDocument: String,
  aadharDocumentBack: String,
  panDocument: String,
  bankDocument: String
}, { timestamps: true });

export default mongoose.models.InvestorSignup || mongoose.model('InvestorSignup', InvestorSignupSchema);
