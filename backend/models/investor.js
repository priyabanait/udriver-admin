import mongoose from 'mongoose';

const InvestorSchema = new mongoose.Schema({
  // Personal Information
  investorName: { type: String, required: true },
  email: { type: String, required: false },
  phone: { type: String, required: true },
  address: String,
  city: String,
  state: String,
  pincode: String,
  
  // Identity Documents
  aadharNumber: String,
  panNumber: String,
  
  // Bank Details
  bankName: String,
  accountNumber: String,
  ifscCode: String,
  accountHolderName: String,
  accountBranchName: String,
  
  // Document URLs
  profilePhoto: String,
  aadharDocument: String,
  aadharDocumentBack: String,
  panDocument: String,
  bankDocument: String,
  
  // Admin management fields
  kycStatus: { type: String, default: 'pending', enum: ['pending', 'verified', 'rejected'] },
  isManualEntry: { type: Boolean, default: false },
  registrationCompleted: { type: Boolean, default: false }, // Track if registration form was filled
  password: String, // For investor self-service login
  
  // Legacy fields
  documents: [String]
}, { timestamps: true });

export default mongoose.models.Investor || mongoose.model('Investor', InvestorSchema);
